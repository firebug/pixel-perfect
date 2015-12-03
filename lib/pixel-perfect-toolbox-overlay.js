/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "stable"
};

const options = require("@loader/options");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { ToolboxOverlay } = require("firebug.sdk/lib/toolbox-overlay.js");
const { PixelPerfectPopup } = require("./pixel-perfect-popup.js");

/**
 * @overlay This object represents an overlay for the Toolbox. The
 * overlay is created when the Toolbox is opened and destroyed when
 * the Toolbox is closed. There is one instance of the overlay per
 * Toolbox, and so there can be more overlays created per browser
 * session.
 * Since the life time of the overlay follows the life time of the
 * Toolbox it's suitable for holding an instance of the Pixel Perfect
 * popup panel. Note that there is one instance of the popup panel
 * per Toolbox.
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

    this.destroyPopup();
  },

  destroyPopup: function() {
    if (!this.pixelPerfectPopup) {
      return;
    }

    this.pixelPerfectPopup.destroy();
    this.pixelPerfectPopup = null;
  },

  // Events

  onReady: function(options) {
    ToolboxOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("PixelPerfectToolboxOverlay.onReady;", options);
  },

  // Commands

  togglePixelPerfectPopup: function() {
    Trace.sysout("PixelPerfectToolboxOverlay.onTogglePopup;");

    // Create an instance of the popup panel if the user opens it
    // for the first time. The instance of the panel is stored in
    // this (Toolbox) overlay and lives as long as the Toolbox
    // is opened.
    if (!this.pixelPerfectPopup) {
      this.pixelPerfectPopup = new PixelPerfectPopup(this);
    }

    // Show or hide the popup panel.
    this.pixelPerfectPopup.toggle();

    return this.pixelPerfectPopup;
  },
});

// Exports from this module
exports.PixelPerfectToolboxOverlay = PixelPerfectToolboxOverlay;
