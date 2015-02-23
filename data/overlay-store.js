/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

/**
 * TODO docs:
 */
const OverlayStore =
/** @lends OverlayStore */
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
};

// Exports from this module
exports.OverlayStore = OverlayStore;
});
