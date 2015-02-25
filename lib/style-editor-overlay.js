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

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

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
    let doc = this.getPanelDocument();
    let toolbar = this.getToolbar();
    if (!toolbar) {
      return;
    }

    let button = doc.createElementNS(XUL_NS, "toolbarbutton");
    button.setAttribute("id", "pixelPerfectShowPopup");
    button.setAttribute("label", "Pixel Perfect");
    button.addEventListener("command", this.onTogglePopup, false);
    toolbar.insertBefore(button, toolbar.firstChild);
  },

  // Commands

  onTogglePopup: function() {
    Trace.sysout("StyleEditorOverlay.onTogglePopup;");

    if (!this.popup) {
      this.popup = new PixelPerfectPopup(this)
    }

    this.popup.toggle();
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
