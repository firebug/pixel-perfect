/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const options = require("@loader/options");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { Locale } = require("./sdk/core/locale.js");
const { ToolboxOverlay } = require("./sdk/toolbox-overlay.js");
const { PixelPerfectPopup } = require("./pixel-perfect-popup.js");
const { Chrome } = require("./sdk/chrome.js");

/**
 * @overlay xxxHonza TODO docs
 */
const PixelPerfectToolboxOverlay = Class(
/** @lends PixelPerfectToolboxOverlay */
{
  extends: ToolboxOverlay,

  overlayId: "pixelPerfectToolboxOverlay",

  // Initialization

  initialize: function(options) {
    ToolboxOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("PixelPerfectToolboxOverlay.initialize;", options);
  },

  destroy: function() {
    ToolboxOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("PixelPerfectToolboxOverlay.destroy;", arguments);

    if (this.pixelPerfectPopup) {
      this.pixelPerfectPopup.destroy();
    }
  },

  // Events

  onReady: function(options) {
    ToolboxOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("PixelPerfectToolboxOverlay.onReady;", options);
  },

  // Commands

  togglePixelPerfectPopup: function() {
    Trace.sysout("PixelPerfectToolboxOverlay.onTogglePopup;");

    if (!this.pixelPerfectPopup) {
      this.pixelPerfectPopup = new PixelPerfectPopup(this.toolbox);
    }

    // Show or hide the popup panel.
    this.pixelPerfectPopup.toggle();

    return this.pixelPerfectPopup;
  },
});

// Exports from this module
exports.PixelPerfectToolboxOverlay = PixelPerfectToolboxOverlay;
