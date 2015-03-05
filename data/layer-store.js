/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

/**
 * This object represents a proxy to the real Store object in the chrome
 * scope {@link PixelPerfectStorage}. All API calls are forwarded through
 * a message manager (as asynchronous events) to the real store object.
 */
const LayerStore =
/** @lends LayerStore */
{
  /**
   * Modify properties of an existing layer.
   */
  modify: function(id, props) {
    postChromeMessage("modify", [id, props]);
  },

  /**
   * Add a new layer.
   */
  add: function() {
    postChromeMessage("add");
  },

  /**
   * Remove an existing layer.
   */
  remove: function(id) {
    postChromeMessage("remove", [id]);
  },

  /**
   * Change index (order) of an existing layer in the list. Move it
   * from the index 'from' to new index 'to'.
   */
  move: function(from, to) {
    postChromeMessage("move", [from, to]);
  },
};

// Exports from this module
exports.LayerStore = LayerStore;
});
