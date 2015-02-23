/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci, Cc, CC } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Content } = require("./sdk/core/content");

const nsIFilePicker = Ci.nsIFilePicker;

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
}, {
 id: 3,
 opacity: 60,
 x: 30,
 y: 30,
 scale: 3,
 url: "http://upload.wikimedia.org/wikipedia/en/7/74/FTP_Voyager_16_Screenshot.png"
}, {
 id: 4,
 opacity: 70,
 x: 40,
 y: 40,
 scale: 4,
 url: "https://www.google.cz/images/srpr/logo11w.png"
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
    this.overlays = data.overlays;
    this.selection = data.overlays[0];
  },

  destroy: function() {
  },

  // Accessors

  getJSON: function() {
    return JSON.stringify(this.overlays);
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
  },

  remove: function(id) {
    
  },

  modify: function(id, props) {
    let overlay = this.getOverlay(id);
    for (let p in props) {
      overlay[p] = props[p];
    }
  },

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
