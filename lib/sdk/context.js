/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../sdk/core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Win } = require("./core/window.js");

// DevTools
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

/**
 * This object represents a toolbox context that shares the same
 * live cycle as the devtools Toolbox. Its purpose is storing additional
 * data like for example existing panel overlays objects.
 */
const Context = Class(
/** @lends Context */
{
  extends: EventTarget,

  // Initialization

  initialize: function(toolbox) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("Context.initialize;", toolbox);

    this.toolbox = toolbox;
    this.overlays = new Map();

    // Listen to theme changes
    this.onThemeSwitched = this.onThemeSwitched.bind(this);
    gDevTools.on("theme-switched", this.onThemeSwitched);
  },

  shutdown: function() {
    Trace.sysout("Context.close;");

    gDevTools.off("theme-switched", this.onThemeSwitched);
  },

  // Toolbox Events

  onReady: function() {
  },

  onDestroy: function() {
    Trace.sysout("Context.destroy;");
  },

  // Theme Events

  onThemeSwitched: function(eventId, win, newTheme, oldTheme) {
    this.overlays.forEach(overlay => {
      let frame = overlay.panelFrame;
      if (frame && frame.contentWindow === win) {
        Win.loaded(win).then(() => {
          overlay.onThemeSwitched(win, newTheme, oldTheme)
        });
      }
    });
  }
});

// Exports from this module
exports.Context = Context;
