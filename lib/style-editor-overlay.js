/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { PanelOverlay } = require("./sdk/panel-overlay.js");
const { PixelPerfectPopup } = require("./pixel-perfect-popup.js");
const { Locale } = require("./sdk/core/locale.js");
const { PixelPerfectToolboxOverlay } = require("./pixel-perfect-toolbox-overlay.js");
const { on, off } = require("sdk/event/core");
const { Chrome } = require("./sdk/chrome.js");
const { ToolbarButton } = require("./sdk/toolbar-button.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

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

    this.onTogglePopup = this.onTogglePopup.bind(this);
    this.updatePopupButton = this.updatePopupButton.bind(this);
  },

  destroy: function() {
    Trace.sysout("styleEditorOverlay.destroy;", arguments);
  },

  // Events

  onBuild: function(options) {
    PanelOverlay.prototype.onBuild.apply(this, arguments);

    Trace.sysout("styleEditorOverlay.onBuild;", options);
  },

  onReady: function(options) {
    PanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("styleEditorOverlay.onReady;", options);

    // xxxHonza: TODO 1134277 - New API: register new toolbox button
    // Make sure the pixel perfect button is also available in
    // the default DevTools themes.
  },

  // Theme

  onThemeSwitched: function(win, newTheme, oldTheme) {
    if (newTheme == "firebug") {
      this.applyFirebugLayout();
    } else if (oldTheme == "firebug") {
      this.unapplyFirebugLayout();
    }
  },

  applyFirebugLayout: makeInfallible(function() {
    Trace.sysout("StyleEditorOverlay.applyFirebugLayout;");

    if (this.popupButton) {
      return;
    }

    let doc = this.getPanelDocument();
    let toolbar = this.getToolbar();
    if (!toolbar) {
      return;
    }

    this.popupButton = new ToolbarButton({
      id: "pixelPerfectShowPopup",
      toolbar: toolbar,
      label: "pixelPerfect.startButton.title",
      tooltiptext: "pixelPerfect.startButton.tip",
      image: "chrome://pixelperfect/skin/logo_16x16.png",
      command: this.onTogglePopup.bind(this),
      referenceElement: toolbar.firstChild
    });
  }),

  unapplyFirebugLayout: makeInfallible(function() {
    Trace.sysout("StyleEditorOverlay.unapplyFirebugLayout;");

    if (this.popupButton) {
      this.popupButton.remove();
      this.popupButton = null;
    }
  }),

  // Commands

  onTogglePopup: function() {
    Trace.sysout("StyleEditorOverlay.onTogglePopup;", this.context);

    let overlayId = PixelPerfectToolboxOverlay.prototype.overlayId;
    let overlay = this.context.getOverlay(overlayId);
    this.popupPanel = overlay.togglePixelPerfectPopup();

    // xxxHonza: register listeners to update the UI button.
    // Or the toolbox overlay could update it.
  },

  updatePopupButton: function() {
    if (this.popupButton && this.popupPanel) {
      let value = this.popupPanel.isOpen() ? true : false;
      this.popupButton.setAttribute("checked", value);
    }
  },
});

// Exports from this module
exports.StyleEditorOverlay = StyleEditorOverlay;
