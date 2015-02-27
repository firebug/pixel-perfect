/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../sdk/core/trace.js").get(module.id);

/**
 * @overlay
 */
const ToolboxOverlay = Class(
/** @lends ToolboxOverlay */
{
  /**
   * Executed by the framework when a panel instance is created.
   */
  initialize: function(options) {
    Trace.sysout("ToolboxOverlay.initialize; " + options.id, options);

    this.toolbox = options.toolbox;
    this.chrome = options.chrome;
    this.context = options.context;
  },

  destroy: function() {
  },

  /**
   * Executed by the framework when toolbox initialization is done
   * and it's fully loaded and ready.
   */
  onReady: function(options) {
    Trace.sysout("ToolboxOverlay.onReady; " + this.id, options);
  },

  // Theme

  onThemeSwitched: function(win, newTheme, oldTheme) {
  },

  // Accessors

  get id() {
    return this.overlayId;
  },
});

// Exports from this module
exports.ToolboxOverlay = ToolboxOverlay;
