/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");

// Shortcuts
const { DIV, SPAN, BR, IMG } = Reps.DOM;

/**
 * TODO docs
 */
var Overlay = React.createClass({
  render: function() {
  },

  // Event Handlers

  onClick: function(event) {
    postChromeMessage("selection", this.props.packet);
  }
});

// Exports from this module
exports.Overlay = React.createFactory(Overlay);
});
