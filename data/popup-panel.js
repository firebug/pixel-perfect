/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const { OverlayList } = require("overlay-list");
const { OverlayForm } = require("overlay-form");
const { OverlayStore } = require("overlay-store");

// Shortcuts
const { TABLE, TR, TD, DIV } = Reps.DOM;

/**
 * TODO docs
 */
var PopupPanel = React.createClass({
  getInitialState: function() {
    return {
      overlays: [],
      selection: null,
    };
  },

  render: function() {
    var selectedOverlay = this.getOverlay(this.state.selection);

    return (
      TABLE({className: "", width: "100%"},
        TR({},
          TD({className: "overlayListCell"},
            DIV({className: "overlayList"},
              OverlayList({
                overlays: this.state.overlays,
                selection: this.state.selection,
                setSelection: this.setSelection
              })
            )
          ),
          TD({className: "overlayFormCell"},
            DIV({className: "overlayForm"},
              OverlayForm({
                overlay: selectedOverlay,
                onAddNewOverlay: this.onAddNewOverlay,
              })
            )
          )
        )
      )
    )
  },

  getOverlay: function(id) {
    var overlays = this.state.overlays;
    for (var i=0; i<overlays.length; i++) {
      if (overlays[i].id == id) {
        return overlays[i];
      }
    }
  },

  setSelection: function(overlay) {
    this.state.selection = overlay.id;
    this.setState(this.state);
  },

  // Commands

  onAddNewOverlay: function(event) {
    OverlayStore.add();
  },
});

// Exports from this module
exports.PopupPanel = React.createFactory(PopupPanel);
});
