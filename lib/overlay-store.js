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
 opacity: 40,
 x: 10,
 y: 10,
 scale: 1,
 url: "https://www.google.cz/images/srpr/logo11w.png"
}, {
 opacity: 50,
 x: 20,
 y: 20,
 scale: 2,
 url: "http://getfirebug.com/img/firebug-large.png"
}, {
 opacity: 60,
 x: 30,
 y: 30,
 scale: 3,
 url: "http://upload.wikimedia.org/wikipedia/en/7/74/FTP_Voyager_16_Screenshot.png"
}, {
 opacity: 70,
 x: 40,
 y: 40,
 scale: 4,
 url: "https://www.google.cz/images/srpr/logo11w.png"
}]
}

/**
 * TODO docs:
 */
const OverlayStore =
/** @lends OverlayStore */
{
  // Initialization

  initialize: function() {
    this.overlays = data.overlays;
    this.selection = data.overlays[0];
  },

  destroy: function() {
  },

  // Accessors

  getOverlays: function(win) {
    // Clone data into the content
    var overlays = new win.Array();
    for (let i=0; i<this.overlays.length; i++) {
      overlays.push(Content.cloneIntoContentScope(win, this.overlays[i]));
    }
    return overlays;
  },

  getSelection: function() {
    return this.selection;
  },

  // Implementation

  add: function(win) {
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

    return Content.cloneIntoContentScope(win, overlay);
  },

  // Overlay URL

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

OverlayStore.initialize();

// Exports from this module
exports.OverlayStore = OverlayStore;
