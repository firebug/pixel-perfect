/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");

/**
 * TODO docs
 */
var Reps =
/** @lends Reps */
{

  /**
   * TODO: docs
   */
  get DOM() {
    if (this.reactDom) {
      return this.reactDom;
    }

    this.reactDom = {};

    var factory = function(prop) {
      return () => {
        return React.DOM[prop].apply(React.DOM, arguments);
      }
    }

    var props = Object.getOwnPropertyNames(React.DOM);
    for (var i=0; i<props.length; i++) {
      var prop = String.toUpperCase(props[i]);
      this.reactDom[prop] = factory(props[i]);
    }

    return this.reactDom;
  }
};

// Exports from this module
exports.Reps = Reps;
});
