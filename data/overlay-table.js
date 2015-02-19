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
  render: function() {
    var rows = [];
    var key = 0;
    var data = this.props.data;

    var overlays = data.overlays;
    overlays.forEach(function(overlay) {
      rows.push(OverlayRow({key: ++key, overlay: overlay}));
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

  onClick: function(event) {
  }
});

/**
 * TODO docs
 */
var OverlayRow = React.createClass({
  render: function() {
    var overlay = this.props.overlay;
    var imageUrl = overlay.url;
    var selected = overlay.selected ? " selected" : "";

    return (
      TR({className: "overlayRow", onClick: this.onClick},
        TD({className: "overlayCell"},
          INPUT({className: "overlayEnable", type: "checkbox"})
        ),
        TD({className: "overlayCell"},
          DIV({className: "overlayImageBox"},
            IMG({className: "overlayImage img-thumbnail" + selected, src: imageUrl})
          )
        )
      )
    )
  },

  // Event Handlers

  onClick: function(event) {
  }
});

// Exports from this module
exports.OverlayTable = React.createFactory(OverlayTable);
});
