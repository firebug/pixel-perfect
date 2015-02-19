/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");

// Shortcuts
const { TABLE, TBODY, TR, TD, INPUT, IMG, THEAD, TH, DIV } = Reps.DOM;

/**
 * TODO docs
 */
var OverlayTable = React.createClass({
  getInitialState: function() {
    return { selection: null };
  },

  render: function() {
    var rows = [];
    var key = 0;
    var data = this.props.data;

    var overlays = data.overlays;
    overlays.forEach(overlay => {
      rows.push(OverlayRow({
        key: ++key,
        overlay: overlay,
        onClick: this.onClick.bind(this, overlay)
      }));
    });

    return (
      TABLE({className: "overlayTable"},
        THEAD({className: "poolRow"},
          TH({width: "20px"}),
          TH({width: "96px"})
        ),
        TBODY(null, rows)
      )
    );
  },

  // Event Handlers

  onClick: function(overlay, event) {
    if (this.state.selection) {
      this.state.selection.selected = false;
    }

    overlay.selected = true;
    this.state.selection = overlay;

    this.setState(this.state);
  }
});

/**
 * TODO docs
 */
var OverlayRow = React.createClass({
  getInitialState: function() {
    return { overlay: {} };
  },

  render: function() {
    var overlay = this.props.overlay;
    var imageUrl = overlay.url;
    var selected = overlay.selected ? " selected" : "";

    return (
      TR({className: "overlayRow", onClick: this.props.onClick},
        TD({className: "overlayCell"},
          INPUT({className: "overlayEnable", type: "checkbox"})
        ),
        TD({className: "overlayCell"},
          DIV({className: "overlayImageBox" + selected},
            IMG({className: "overlayImage img-thumbnail", src: imageUrl})
          )
        )
      )
    )
  },

  componentDidMount: function() {
    this.setState({overlay: this.props.overlay});
  },
});

// Exports from this module
exports.OverlayTable = React.createFactory(OverlayTable);
});
