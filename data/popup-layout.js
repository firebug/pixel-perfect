/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const { OverlayList } = require("overlay-list");
const { OverlayForm } = require("overlay-form");

// Shortcuts
const { TABLE, TR, TD, DIV } = Reps.DOM;

/**
 * TODO docs
 *
 * xxxHonza: localization
 */
var PopupLayout = React.createClass({
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
          TD({vAlign: "top"},
            DIV({className: "overlayForm"},
              OverlayForm({
                overlays: this.props.overlays,
                selection: this.state.selection,
                onToggle: this.onToggle,
                onLock: this.onLock,
                onAddNewOverlay: this.onAddNewOverlay
              })
            )
          ),
          TD({vAlign: "top"},
            DIV({className: "overlayList"},
              OverlayList({
                overlays: this.props.overlays,
                selection: this.state.selection,
                setSelection: this.setSelection
              })
            )
          )
        )
      )
    )
  },

  setSelection: function(overlay, index) {
    this.state.selection = overlay;
    this.setState(this.state);
  },

  // Commands

  onToggle: function(event) {
    //postChromeMessage("selection", this.props.packet);
  },

  onLock: function(event) {
    //postChromeMessage("selection", this.props.packet);
  },

  onAddNewOverlay: function(event) {

    this.state.overlays.push({
      opacity: 50,
      x: 0,
      y: 0,
      scale: 1,
      url: "test"
    });

    this.setState({overlays: this.state.overlays});

    //postChromeMessage("selection", this.props.packet);
  },
});

// Exports from this module
exports.PopupLayout = React.createFactory(PopupLayout);
});
