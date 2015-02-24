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

//xxxHonza: temporary JSON data. Should be stored within
//the current profile directory.
var data = {
  overlays: [{
   id: 1,
   opacity: 40,
   x: 10,
   y: 10,
   scale: 1,
   visible: true,
   lock: false,
   url: "https://www.google.cz/images/srpr/logo11w.png"
  }, {
   id: 2,
   opacity: 50,
   x: 20,
   y: 20,
   scale: 2,
   visible: true,
   lock: false,
   url: "http://getfirebug.com/img/firebug-large.png"
  }]
}

var overlayId = 5;

/**
 * TODO docs:
 */
var PixelPerfectStore = Class(
/** @lends PixelPerfectStore */
{
  // Initialization

  initialize: function() {
    let json = this.load();

    try {
      this.overlays = JSON.parse(json);
    } catch (err) {
    }

    if (!this.overlays) {
      this.overlays = data.overlays;
    }
  },

  destroy: function() {
  },

  // Accessors

  getJSON: function() {
    return JSON.stringify(this.overlays, 2, 2);
  },

  forEachOverlay: function(callback) {
    this.overlays.forEach(overlay => {
      callback(overlay);
    });
  },

  add: function() {
    let imageFile = this.getOverlayImage();
    if (!imageFile) {
      return;
    }

    let overlay = {
      id: ++overlayId,
      opacity: 50,
      x: 0,
      y: 0,
      scale: 1,
      visible: true,
      lock: false,
      url: this.getURLFromLocalFile(imageFile)
    };

    this.overlays.push(overlay);

    this.save();

    emit(this, "add", overlay);
  },

  remove: function(id) {
    for (var i=0; i<this.overlays.length; i++) {
      let overlay = this.overlays[i];
      if (overlay.id == id) {
        this.overlays.splice(i, 1);
        break;
      }
    }

    this.save();

    emit(this, "remove", id);
  },

  modify: function(id, props) {
    let overlay = this.getOverlay(id);
    for (let p in props) {
      // xxxHonza: use property types.
      overlay[p] = props[p];
    }

    this.save();

    emit(this, "modify", id, props);
  },

  // Persistence

  getStoreFile: function(fileName) {
    return FileUtils.getFile("ProfD", ["pixel-perfect", fileName]);
  },

  load: makeInfallible(function() {
    let file = this.getStoreFile(dataFileName);
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
    let json = this.getJSON();
    let file = this.getStoreFile(dataFileName);

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

  getOverlay: function(id) {
    for (let i=0; i<this.overlays.length; i++) {
      let overlay = this.overlays[i];
      if (overlay.id == id) {
        return overlay;
      }
    }
  },

  getOverlayImage: function() {
    let browser = getMostRecentBrowserWindow();

    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(browser, null, nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterImages);
    fp.filterIndex = 1;

    let rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
      return fp.file;
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
  getOverlayImageData: makeInfallible(function(id) {
    let overlay = this.getOverlay(id);

    if (overlay.url.startsWith("data:")) {
      return resolve(overlay.url);
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

    img.src = overlay.url;

    return deferred.promise;
  }),

  cloneOverlay: function(overlay) {
    let result = {};
    for (let p in overlay) {
      result[p] = overlay[p];
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
