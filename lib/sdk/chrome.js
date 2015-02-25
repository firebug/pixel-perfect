/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../sdk/core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { extend } = require("sdk/core/heritage");
const { Context } = require("./context.js");

const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

/**
 * TODO docs
 */
var Chrome = extend(EventTarget.prototype,
/** @lends Chrome */
{
  // Initialization

  initialize: function() {
    this.contexts = new Map();
    this.registeredOverlays = new Map();

    // Bind DevTools event handlers.
    this.onToolboxCreate = this.onToolboxCreate.bind(this);
    this.onToolboxReady = this.onToolboxReady.bind(this);
    this.onToolboxDestroy = this.onToolboxDestroy.bind(this);
    this.onToolboxClosed = this.onToolboxClosed.bind(this);

    // Hook developer tools events.
    gDevTools.on("toolbox-create", this.onToolboxCreate);
    gDevTools.on("toolbox-ready", this.onToolboxReady);
    gDevTools.on("toolbox-destroy", this.onToolboxDestroy);
    gDevTools.on("toolbox-destroyed", this.onToolboxClosed);
  },

  shutdown: function() {
    gDevTools.off("toolbox-create", this.onToolboxCreate);
    gDevTools.off("toolbox-ready", this.onToolboxReady);
    gDevTools.off("toolbox-destroy", this.onToolboxDestroy);
    gDevTools.off("toolbox-destroyed", this.onToolboxClosed);
  },

  // DevTools Event Handlers

  onToolboxCreate: function(eventId, toolbox) {
    Trace.sysout("chrome.onToolboxCreate;", toolbox);

    // Make sure to create the toolbox context as soon as possible.
    let context = this.getContext(toolbox);

    //this.emit("onToolboxCreate", [context]);
  },

  onToolboxReady: function(event, toolbox) {
    Trace.sysout("chrome.onToolboxReady; ", toolbox);

    let context = this.getContext(toolbox);
    context.onReady();

    //this.emit("onToolboxReady", [context]);
  },

  onToolboxDestroy: function(eventId, target) {
    Trace.sysout("chrome.onToolboxDestroy;", target);

    let context = this.contexts.get(target);
    if (!context) {
      Trace.sysout("Chrome.onToolboxDestroy; ERROR unknown target!", target);
      return;
    }

    //this.emit("onToolboxDestroy", [context]);

    context.onDestroy();
  },

  onToolboxClosed: function(eventId, target) {
    Trace.sysout("chrome.onToolboxClosed;", target);

    let context = this.contexts.get(target);
    if (!context) {
      Trace.sysout("Chrome.onToolboxClosed; ERROR unknown target!", target);
      return;
    }

    context.shutdown();

    this.contexts.delete(target);
  },

  // Overlays

  registerOverlay: function(overlay) {
    let overlayId = overlay.prototype.overlayId;
    let panelId = overlay.prototype.panelId;

    Trace.sysout("chrome.registerOverlay; " + overlayId, overlay);

    // Listen for panel initialization event.
    let onApplyOverlay = (eventId, toolbox, panelFrame) => {
      Trace.sysout("chrome.onApplyOverlay; " + overlayId, panelFrame);

      let context = this.getContext(toolbox);

      try {
        // Create instance of an overlay
        let instance = new overlay({
          panelFrame: panelFrame,
          toolbox: toolbox,
          chrome: this,
        });

        context.overlays.set(instance.id, instance);

        // Register for 'build' event (panel instance created).
        toolbox.once(panelId + "-build", (eventId, panel) => {
          Trace.sysout("chrome.applyOverlay; " + eventId, panel);
          instance.onBuild({toolbox: toolbox, panel: panel});
        });

        // Register for 'ready' event (panel frame loaded).
        toolbox.once(panelId + "-ready", (eventId, panel) => {
          Trace.sysout("chrome.applyOverlay; " + eventId, panel);
          instance.onReady({toolbox: toolbox, panel: panel});
        });
      }
      catch (err) {
        TraceError.sysout("chrome.initialize; Overlay for: " + overlay.id +
          " EXCEPTION " + err, err);
      }
    };

    // Use 'on' (not 'once') listener since the '*-init' event is sent
    // every time the toolbox is closed and opened again. The listener
    // will be removed in destroyOverlay method when the extension is
    // destroyed.
    gDevTools.on(panelId + "-init", onApplyOverlay);

    this.registeredOverlays.set(overlayId, {
      ctor: overlay,
      creator: onApplyOverlay
    })
  },

  unregisterOverlay: function(overlay) {
    let overlayId = overlay.prototype.overlayId;

    Trace.sysout("chrome.unregisterOverlay; " + overlayId, overlay);

    let entry = this.registeredOverlays.get(overlayId);
    gDevTools.off(overlayId + "-init", entry.creator);

    this.registeredOverlays.delete(overlayId);
  },

  // Context

  getContext: function(toolbox) {
    let target = toolbox.target;
    let context = this.contexts.get(target);
    if (!context) {
      context = new Context(toolbox);
      this.contexts.set(target, context);
    }
    return context;
  },
});

// Exports from this module
exports.Chrome = Chrome;
