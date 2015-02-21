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
 *
 * xxxHonza: localization
 */
var Overlay = React.createClass({
  getInitialState: function() {
    return { overlay: {} };
  },

  componentDidMount: function() {
    this.setState({overlay: this.props.overlay});

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
    var overlay = this.props.overlay;

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
            BUTTON({id: "hideBtn", onClick: this.onToggle}, "Hide"),
            BUTTON({id: "lockBtn", onClick: this.onLock}, "Lock"),
            BUTTON({id: "addNewOverlayBtn", onClick: this.onAddNewOverlay},
              "Add New Layer")
          )
        )
      )
    )
  },

  // Event Handlers

  onToggle: function(event) {
    //postChromeMessage("selection", this.props.packet);
  },

  onLock: function(event) {
    //postChromeMessage("selection", this.props.packet);
  },

  onAddNewOverlay: function(event) {
    //postChromeMessage("selection", this.props.packet);
  },
});

// Exports from this module
exports.Overlay = React.createFactory(Overlay);
});
