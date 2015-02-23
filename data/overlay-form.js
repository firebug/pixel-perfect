/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const Slider = require("bootstrap-slider");
const { OverlayStore } = require("overlay-store");

// Shortcuts
const { SPAN, TABLE, TR, TD, BUTTON, INPUT } = Reps.DOM;

/**
 * TODO docs
 */
var OverlayForm = React.createClass({
  getInitialState: function() {
    return {};
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState(nextProps.selection);
  },

  render: function() {
    var overlay = this.state;

    // xxxHonza: localization
    return (
      TABLE({className: "form"},
        TR({},
          TD({align: "right"}, "Opacity:"),
          TD({},
            INPUT({id: "opacity", type: "range", ref: "opacity",
              value: overlay.opacity,
              onChange: this.onChange.bind(this, "opacity")})
          )
        ),
        TR({},
          TD({align: "right"}, "X:"),
          TD({},
            INPUT({id: "x", size: 5, ref: "x",
              value: overlay.x,
              onChange: this.onChange.bind(this, "x")})
          )
        ),
        TR({},
          TD({align: "right"}, "Y:"),
          TD({},
            INPUT({id: "y", size: 5, ref: "y",
              value: overlay.y,
              onChange: this.onChange.bind(this, "y")})
          )
        ),
        TR({},
          TD({align: "right"}, "Scale:"),
          TD({},
            INPUT({id: "scale", size: 3, ref: "scale",
              value: overlay.scale,
              onChange: this.onChange.bind(this, "scale")})
          )
        ),
        TR({},
          TD({className: "buttonBar", colSpan: 2},
            BUTTON({id: "hideBtn", onClick: this.props.onToggle}, "Hide"),
            BUTTON({id: "lockBtn", onClick: this.props.onLock}, "Lock"),
            BUTTON({id: "addNewOverlayBtn", onClick: this.props.onAddNewOverlay},
              "Add New Layer")
          )
        )
      )
    )
  },

  // Events

  onChange: function(propName, event) {
    var value = event.target.value;

    this.state[propName] = value;
    this.setState(this.state);

    var props = {};
    props[propName] = value;
    OverlayStore.modify(this.props.selection.id, props);
  },
});

// Exports from this module
exports.OverlayForm = React.createFactory(OverlayForm);
});
