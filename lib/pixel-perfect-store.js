/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci, Cc, CC } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Content } = require("./sdk/core/content");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Services
const { FileUtils } = Cu.import("resource://gre/modules/FileUtils.jsm", {});
const nsIFilePicker = Ci.nsIFilePicker;

const dataFileName = "data.json";

//xxxHonza: temporary JSON data. Should be stored within
//the current profile directory.
var data = {
  overlays: [{
   id: 1,
   opacity: 40,
   x: 10,
   y: 10,
   scale: 1,
   url: "https://www.google.cz/images/srpr/logo11w.png"
  }, {
   id: 2,
   opacity: 50,
   x: 20,
   y: 20,
   scale: 2,
   url: "http://getfirebug.com/img/firebug-large.png"
  }]
}

var overlayId = 5;

/**
 * TODO docs:
 */
const PixelPerfectStore =
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

  getData: function() {
    return this.overlays;
  },

  add: function() {
    let imageFile = this.getOverlayImage();
    if (!imageFile) {
      return;
    }

    let overlay = {
      opacity: 57,
      x: 0,
      y: 0,
      scale: 1,
      url: imageFile.path
    };

    this.overlays.push(overlay);

    this.save();
  },

  remove: function(id) {
    this.save();
  },

  modify: function(id, props) {
    let overlay = this.getOverlay(id);
    for (let p in props) {
      overlay[p] = props[p];
    }

    this.save();
  },

  // Persistence

  getFile: function(fileName) {
    return FileUtils.getFile("ProfD", ["pixelperfect", fileName]);
  },

  load: makeInfallible(function() {
    let file = this.getFile(dataFileName);

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
    let file = this.getFile(dataFileName);

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

};

PixelPerfectStore.initialize();

// Exports from this module
exports.PixelPerfectStore = PixelPerfectStore;
