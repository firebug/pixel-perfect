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
const { defer, resolve } = require("sdk/core/promise");

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
    this.onToolboxCreated = this.onToolboxCreated.bind(this);
    this.onToolboxReady = this.onToolboxReady.bind(this);
    this.onToolboxDestroy = this.onToolboxDestroy.bind(this);
    this.onToolboxClosed = this.onToolboxClosed.bind(this);

    // Hook developer tools events.
    gDevTools.on("toolbox-created", this.onToolboxCreated);
    gDevTools.on("toolbox-ready", this.onToolboxReady);
    gDevTools.on("toolbox-destroy", this.onToolboxDestroy);
    gDevTools.on("toolbox-destroyed", this.onToolboxClosed);
  },

  shutdown: function() {
    gDevTools.off("toolbox-created", this.onToolboxCreated);
    gDevTools.off("toolbox-ready", this.onToolboxReady);
    gDevTools.off("toolbox-destroy", this.onToolboxDestroy);
    gDevTools.off("toolbox-destroyed", this.onToolboxClosed);
  },

  // DevTools Event Handlers

  onToolboxCreated: function(eventId, toolbox) {
    Trace.sysout("chrome.onToolboxCreated;", toolbox);

    // Make sure to create the toolbox context as soon as possible.
    // 'toolbox-created' has been introduced in Fx 39, so use
    // 'toolbox-ready' for previous versions.
    let context = this.getContext(toolbox);
  },

  onToolboxReady: function(event, toolbox) {
    Trace.sysout("chrome.onToolboxReady; ", toolbox);

    // Make sure to create the toolbox context as soon as possible.
    let context = this.getContext(toolbox);
  },

  onToolboxDestroy: function(eventId, target) {
    Trace.sysout("chrome.onToolboxDestroy;", target);

    let context = this.contexts.get(target);
    if (!context) {
      Trace.sysout("Chrome.onToolboxDestroy; ERROR unknown target!", target);
      return;
    }

    //this.emit("onToolboxDestroy", [context]);

    context.destroy();
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

  registerPanelOverlay: function(overlay) {
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
          context: context
        });

        context.overlays.set(overlayId, instance);

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

  unregisterPanelOverlay: function(overlay) {
    let overlayId = overlay.prototype.overlayId;

    Trace.sysout("chrome.unregisterOverlay; " + overlayId, overlay);

    let entry = this.registeredOverlays.get(overlayId);
    gDevTools.off(overlayId + "-init", entry.creator);

    this.registeredOverlays.delete(overlayId);
  },

  registerToolboxOverlay: function(overlay) {
    let overlayId = overlay.prototype.overlayId;

    Trace.sysout("chrome.registerToolboxOverlay; " + overlayId, overlay);

    let onApplyOverlay = (eventId, toolbox) => {
      Trace.sysout("chrome.onApplyToolboxOverlay; " + overlayId, toolbox);

      let context = this.getContext(toolbox);

      try {
        // Create instance of an overlay
        let instance = new overlay({
          toolbox: toolbox,
          chrome: this,
          context: context,
        });

        context.overlays.set(overlayId, instance);

        // xxxHonza: execute when 'toolbox-ready' is fired.
        instance.onReady({toolbox: toolbox});
      }
      catch (err) {
        TraceError.sysout("chrome.initialize; Overlay for: " + overlay.id +
          " EXCEPTION " + err, err);
      }
    };

    // Use 'on' (not 'once') listener since the create event is sent
    // every time a toolbox is opened (can be also on another browser tab).
    gDevTools.on("toolbox-ready", onApplyOverlay);

    this.registeredOverlays.set(overlayId, {
      ctor: overlay,
      creator: onApplyOverlay
    })
  },

  unregisterToolboxOverlay: function(overlay) {
    let overlayId = overlay.prototype.overlayId;

    Trace.sysout("chrome.unregisterToolboxOverlay; " + overlayId, overlay);

    let entry = this.registeredOverlays.get(overlayId);
    gDevTools.off("toolbox-ready", entry.creator);

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
