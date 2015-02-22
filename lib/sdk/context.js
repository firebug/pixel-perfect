/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../sdk/core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

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
  },

  shutdown: function() {
    Trace.sysout("Context.close;");
  },

  // Toolbox Events

  onReady: function() {
  },

  onDestroy: function() {
    Trace.sysout("Context.destroy;");
  },
});

// Exports from this module
exports.Context = Context;
