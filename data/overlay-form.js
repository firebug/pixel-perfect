/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const Slider = require("bootstrap-slider");

// Shortcuts
const { SPAN, TABLE, TR, TD, BUTTON, INPUT } = Reps.DOM;

/**
 * TODO docs
 */
var OverlayForm = React.createClass({
  getInitialState: function() {
    return {
      overlays: [],
      selection: 0
    };
  },

  componentDidMount: function() {
    //this.setState(this.props);

    var mySlider = new Slider("#opacity", {
      min: 0,
      max: 100,
      orientation: "horizontal",
      value: 50,
      tooltip: "show",
      step: 1,
      handle: "custom"
    });
  },

  render: function() {
    var overlay = this.props.selection;
    var overlays = this.props.overlays;

    // xxxHonza: localization
    return (
      TABLE({className: "form"},
        TR({},
          TD({align: "right"}, "Opacity:"),
          TD({},
            SPAN({id: "opacity", value: overlay.opacity})
          )
        ),
        TR({},
          TD({align: "right"}, "X:"),
          TD({},
            INPUT({id: "xpos", size: 5, value: overlay.x})
          )
        ),
        TR({},
          TD({align: "right"}, "Y:"),
          TD({},
            INPUT({id: "ypos", size: 5, value: overlay.y})
          )
        ),
        TR({},
          TD({align: "right"}, "Scale:"),
          TD({},
            INPUT({id: "scale", size: 3, value: overlay.scale})
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
});

// Exports from this module
exports.OverlayForm = React.createFactory(OverlayForm);
});
