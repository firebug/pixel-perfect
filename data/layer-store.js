/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

/**
 * This object represents a proxy to the real Store object
 * in the chrome scope. All API calls are forwarded through
 * a message manager (as asynchronous events).
 */
const LayerStore =
/** @lends LayerStore */
{
  modify: function(id, props) {
    postChromeMessage("modify", [id, props]);
  },

  add: function() {
    postChromeMessage("add");
  },

  remove: function(id) {
    postChromeMessage("remove", [id]);
  },

  move: function(from, to) {
    postChromeMessage("move", [from, to]);
  },
};

// Exports from this module
exports.LayerStore = LayerStore;
});
