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
 *
 * xxxHonza: localization
 */
var PopupPanel = React.createClass({
  getInitialState: function() {
    return {
      overlays: this.props.overlays,
      selection: this.props.selection,
    };
  },

  render: function() {
    return (
      TABLE({className: "", width: "100%"},
        TR({},
          TD({className: "overlayFormCell"},
            DIV({className: "overlayForm"},
              OverlayForm({
                selection: this.state.selection,
                onLock: this.onLock,
                onAddNewOverlay: this.onAddNewOverlay,
              })
            )
          ),
          TD({className: "overlayListCell"},
            DIV({className: "overlayList"},
              OverlayList({
                overlays: this.state.overlays,
                selection: this.state.selection,
                setSelection: this.setSelection
              })
            )
          )
        )
      )
    )
  },

  setSelection: function(overlay) {
    this.state.selection = overlay;
    this.setState(this.state);
  },

  // Commands

  onLock: function(event) {
    //postChromeMessage("selection", this.props.packet);
  },

  onAddNewOverlay: function(event) {
    OverlayStore.add();
  },
});

// Exports from this module
exports.PopupPanel = React.createFactory(PopupPanel);
});
