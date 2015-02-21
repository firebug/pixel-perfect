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
      overlays: [],
      selection: null
    };
  },

  componentDidMount: function() {
    this.setState(this.props);
  },

  render: function() {
    var overlays = this.props.overlays;
    var selection = this.props.overlays[0];

    return (
      TABLE({className: "", width: "100%"},
        TR({},
          TD({vAlign: "top"},
            DIV({className: "overlayForm"},
              OverlayForm({overlay: selection})
            )
          ),
          TD({vAlign: "top"},
            DIV({className: "overlayList"},
              OverlayList({overlays: overlays})
            )
          )
        )
      )
    )
  },
});

// Exports from this module
exports.PopupLayout = React.createFactory(PopupLayout);
});
