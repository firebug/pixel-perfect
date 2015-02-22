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
var OverlayList = React.createClass({
  getInitialState: function() {
    return { selection: null };
  },

  render: function() {
    var rows = [];
    var index = 0;
    var overlays = this.props.overlays;

    overlays.forEach(overlay => {
      rows.push(OverlayRow({
        key: ++index,
        overlay: overlay,
        selected: overlay == this.props.selection,
        onClick: this.onClick.bind(this, overlay, index)
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

  onClick: function(overlay, index, event) {
    this.props.setSelection(overlay, index);
  }
});

/**
 * TODO docs
 */
var OverlayRow = React.createFactory(React.createClass({
  getInitialState: function() {
    return { overlay: this.props.overlay };
  },

  render: function() {
    var overlay = this.props.overlay;
    var imageUrl = overlay.url;
    var selected = this.props.selected ? " selected" : "";

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
}));

// Exports from this module
exports.OverlayList = React.createFactory(OverlayList);
});
