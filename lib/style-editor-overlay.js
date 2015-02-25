/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const options = require("@loader/options");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { Chrome } = require("./sdk/chrome.js");
const { PanelOverlay } = require("./sdk/panel-overlay.js");
const { PixelPerfectPopup } = require("./pixel-perfect-popup.js");
const { defer, resolve } = require("sdk/core/promise");
const { Rdp } = require("./sdk/core/rdp.js");
const { PixelPerfectFront } = require("./pixel-perfect-front.js");
const { Locale } = require("./sdk/core/locale.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// URL of the {@InspectorActor} module. This module will be
// installed and loaded on the backend.
const actorModuleUrl = options.prefixURI + "lib/pixel-perfect-actor.js";

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

    this.popupButton = doc.createElementNS(XUL_NS, "toolbarbutton");
    this.popupButton.setAttribute("id", "pixelPerfectShowPopup");
    this.popupButton.setAttribute("label", Locale.$STR("pixelPerfect.button.title"));
    this.popupButton.setAttribute("tooltiptext", Locale.$STR("pixelPerfect.button.tip"));
    this.popupButton.setAttribute("type", "checkbox");
    this.popupButton.addEventListener("command", this.onTogglePopup, false);
    toolbar.insertBefore(this.popupButton, toolbar.firstChild);
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
    Trace.sysout("StyleEditorOverlay.onTogglePopup;");

    if (!this.popupPanel) {
      this.popupPanel = new PixelPerfectPopup(this)
    }

    // Show or hide the popup panel.
    this.popupPanel.toggle();
  },

  updatePopupButton: function() {
    if (this.popupButton && this.popupPanel) {
      let value = this.popupPanel.isOpen() ? true : false;
      this.popupButton.setAttribute("checked", value);
    }
  },

  // Actors

  attachActor: function() {
    if (this.front) {
      return resolve(this.front);
    }

    // Inspector actor registration options.
    let config = {
      prefix: PixelPerfectFront.prototype.typeName,
      actorClass: "PixelPerfectActor",
      frontClass: PixelPerfectFront,
      moduleUrl: actorModuleUrl
    };

    let deferred = defer();
    let client = this.toolbox.target.client;

    // Register as tab actor.
    let tab = Rdp.registerTabActor(client, config).
      then(({registrar, front}) => {
        this.registrar = registrar;
        this.front = front;
        deferred.resolve(front);
    });

    return deferred.promise;
  },

  detachActor: function() {
    if (!this.front) {
      return resolve();
    }

    let deferred = defer();
    this.front.detach().then(response => {
      deferred.resolve(response);
    });

    this.front = null;

    return deferred.promise;
  }
});

// Exports from this module
exports.StyleEditorOverlay = StyleEditorOverlay;
