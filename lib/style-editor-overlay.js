/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { Chrome } = require("./sdk/chrome.js");
const { PanelOverlay } = require("./sdk/panel-overlay.js");
const { PixelPerfectPopup } = require("./pixel-perfect-popup.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * @overlay
 */
const StyleEditorOverlay = Class(
/** @lends StyleEditorOverlay */
{
  extends: PanelOverlay,

  overlayId: "pixelPerfectStyleEditorOverlay",
  panelId: "styleeditor",

  // Initialization

  initialize: function(options) {
    PanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("styleEditorOverlay.initialize;", options);

    this.onTogglePixelPerfectPopup = this.onTogglePixelPerfectPopup.bind(this);
  },

  destroy: function() {
    Trace.sysout("styleEditorOverlay.destroy;", arguments);
  },

  // Events

  onBuild: function(options) {
    PanelOverlay.prototype.onBuild.apply(this, arguments);

    Trace.sysout("styleEditorOverlay.onBuild;", options);

    this.popup = new PixelPerfectPopup(this)
  },

  onReady: function(options) {
    PanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("styleEditorOverlay.onReady;", options);

    // xxxHonza: TODO 1134277 - New API: register new toolbox button
    let doc = this.getPanelDocument();
    let toolbar = this.getToolbar();
    if (!toolbar) {
      return;
    }

    let button = doc.createElementNS(XUL_NS, "toolbarbutton");
    button.setAttribute("id", "pixelPerfectShowPopup");
    button.setAttribute("label", "Pixel Perfect");
    button.addEventListener("command", this.onTogglePixelPerfectPopup, false);
    toolbar.insertBefore(button, toolbar.firstChild);
  },

  // Commands

  onTogglePixelPerfectPopup: function() {
    Trace.sysout("StyleEditorOverlay.onTogglePixelPerfectPopup;");

    this.popup.toggle();
  },
});

// Exports from this module
exports.StyleEditorOverlay = StyleEditorOverlay;
