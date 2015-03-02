/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci, Cc, CC } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Content } = require("./sdk/core/content");
const { Class } = require("sdk/core/heritage");
const { defer, resolve } = require("sdk/core/promise");
const { emit } = require("sdk/event/core");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// File Services
const { FileUtils } = Cu.import("resource://gre/modules/FileUtils.jsm", {});
const nsIFilePicker = Ci.nsIFilePicker;
const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

// Storage file name
const dataFileName = "data.json";

// Constants
const XHTML_NS = "http://www.w3.org/1999/xhtml";

// Default data with one example layer.
const defaultLayer = {
  id: "default-layer",
  opacity: 80,
  x: 0,
  y: 0,
  scale: 1,
  visible: true,
  lock: false,
  url: "chrome://pixelperfect/skin/grid.png"
};

/**
 * This object represents persistent storage for registered layers. Layers
 * and all properties are converted into JSON and stored into a file within
 * the current browse profile.
 *
 * xxxHonza: what about:
 * https://dxr.mozilla.org/mozilla-central/source/toolkit/devtools/shared/async-storage.js
 */
var PixelPerfectStore = Class(
/** @lends PixelPerfectStore */
{
  // Initialization

  initialize: function() {
    this.layers = [];
    this.version = 1;

    try {
      let json = this.load();
      let data = JSON.parse(json);
      this.layers = data.layers;
    } catch (err) {
    }

    if (!this.layers) {
      this.layers = [];
      this.save();
    }
  },

  destroy: function() {
  },

  // Accessors

  forEachLayer: function(callback) {
    this.layers.forEach(layer => {
      callback(layer);
    });
  },

  add: function() {
    let files = this.getImageFiles();
    if (!files) {
      return;
    }

    // Iterate over all selected files
    while (files.hasMoreElements()) {
      let file = files.getNext()
      this.createLayer(file);
    }
  },

  createLayer: function(imageFile) {
    let id = "layer-" + (new Date()).getTime();
    let layer = {
      id: id,
      opacity: 50,
      x: 0,
      y: 0,
      scale: 1,
      visible: true,
      lock: false,
      url: this.getURLFromLocalFile(imageFile)
    };

    this.layers.push(layer);

    emit(this, "add", layer);

    this.save();
  },

  remove: function(id) {
    for (var i=0; i<this.layers.length; i++) {
      let layer = this.layers[i];
      if (layer.id == id) {
        this.layers.splice(i, 1);
        break;
      }
    }

    this.save();

    emit(this, "remove", id);
  },

  modify: function(id, props) {
    let layer = this.getLayer(id);
    for (let p in props) {
      // xxxHonza: use property types.
      layer[p] = props[p];
    }

    this.save();

    emit(this, "modify", id, props);
  },

  // Persistence

  getStorageFile: function(fileName) {
    return FileUtils.getFile("ProfD", ["pixel-perfect", fileName]);
  },

  load: makeInfallible(function() {
    let file = this.getStorageFile(dataFileName);
    if (!file.exists()) {
      return;
    }

    let inputStream = Cc["@mozilla.org/network/file-input-stream;1"]
      .createInstance(Ci.nsIFileInputStream);
    let cstream = Cc["@mozilla.org/intl/converter-input-stream;1"]
      .createInstance(Ci.nsIConverterInputStream);

    // Initialize input stream (read, create)
    let permFlags = parseInt("0666", 8);
    inputStream.init(file, 0x01 | 0x08, permFlags, 0);
    cstream.init(inputStream, "UTF-8", 0, 0);

    // Load JSON data
    let json = "";
    let data = {};
    while (cstream.readString(-1, data) != 0) {
      json += data.value;
    }

    inputStream.close();

    return json;
  }),

  // xxxHonza: implement async save
  save: makeInfallible(function() {
    let data = {
      version: this.version,
      layers: this.layers
    }

    let json = JSON.stringify(data, 2, 2);
    let file = this.getStorageFile(dataFileName);

    // Initialize output stream.
    var outputStream = Cc["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream);

    // write, create, truncate
    let permFlags = parseInt("0666", 8);
    outputStream.init(file, 0x02 | 0x08 | 0x20, permFlags, 0);

    // Store JSON
    outputStream.write(json, json.length);
    outputStream.close();
  }),

  // Helpers

  getLayer: function(id) {
    for (let i=0; i<this.layers.length; i++) {
      let layer = this.layers[i];
      if (layer.id == id) {
        return layer;
      }
    }
  },

  getImageFiles: function() {
    let browser = getMostRecentBrowserWindow();

    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(browser, null, nsIFilePicker.modeOpen | nsIFilePicker.modeOpenMultiple);
    fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterImages);
    fp.filterIndex = 1;

    let rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
      return fp.files;
    }

    return null;
  },

  getURLFromLocalFile: function(file) {
    let fileHandler = ioService.getProtocolHandler("file")
      .QueryInterface(Ci.nsIFileProtocolHandler);
    let url = fileHandler.getURLSpecFromFile(file);
    return url;
  },

  // xxxHonza: cache the image data, but do not persist.
  getLayerImageData: makeInfallible(function(id) {
    let layer = this.getLayer(id);

    if (layer.url.startsWith("data:")) {
      return resolve(layer.url);
    }

    let deferred = defer();
    let win = getMostRecentBrowserWindow();

    // xxxHonza: remove the Image object?
    let img = new win.Image();

    img.onload = () => {
      try {
        let imageData = imageToImageData(img);
        deferred.resolve(imageData);
      } catch (e) {
        deferred.reject(null);
      }
    }

    // If the URL doesn't point to a resource, reject
    img.onerror = () => {
      deferred.reject(null);
    }

    img.src = layer.url;

    return deferred.promise;
  }),

  cloneLayer: function(layer) {
    let result = {};
    for (let p in layer) {
      result[p] = layer[p];
    }
    return result;
  }
});

/**
 * xxxHonza: TODO docs
 */
var imageToImageData = makeInfallible(node => {
  // Get the image resize ratio if a maxDim was provided
  let resizeRatio = 1;
  let imgWidth = node.naturalWidth || node.width;
  let imgHeight = node.naturalHeight || node.height;
  let imgMax = Math.max(imgWidth, imgHeight);

  // Extract the image data
  let imageData;

  // The image may already be a data-uri, in which case, save ourselves the
  // trouble of converting via the canvas.drawImage.toDataURL method
  if (node.src.startsWith("data:")) {
    imageData = node.src;
  } else {
    // Create a canvas to copy the rawNode into and get the imageData from
    let canvas = node.ownerDocument.createElementNS(XHTML_NS, "canvas");
    canvas.width = imgWidth * resizeRatio;
    canvas.height = imgHeight * resizeRatio;
    let ctx = canvas.getContext("2d");

    // Copy the rawNode image or canvas in the new canvas and extract data
    ctx.drawImage(node, 0, 0, canvas.width, canvas.height);
    imageData = canvas.toDataURL("image/png");
  }

  return {
    data: imageData,
    size: {
      naturalWidth: imgWidth,
      naturalHeight: imgHeight,
      resized: resizeRatio !== 1
    }
  }
})

// Exports from this module
exports.PixelPerfectStore = PixelPerfectStore;
