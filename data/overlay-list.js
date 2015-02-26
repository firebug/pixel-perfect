/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const { OverlayStore } = require("overlay-store");

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
    var overlays = this.props.overlays;

    overlays.forEach(overlay => {
      rows.push(OverlayRow({
        key: overlay.id,
        overlay: overlay,
        selected: overlay.id == this.props.selection,
        onSelect: this.onSelect.bind(this, overlay),
        onRemove: this.onRemove.bind(this, overlay)
      }));
    });

    // An extra row for appending new layers.
    rows.push(AddOverlayRow({
      onAdd: this.onAdd
    }));

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

  // Commands

  onSelect: function(overlay, event) {
    this.props.setSelection(overlay);
  },

  onRemove: function(overlay, event) {
    OverlayStore.remove(overlay.id);
  },

  onAdd: function(event) {
    OverlayStore.add();
  },
});

/**
 * TODO docs
 */
var OverlayRow = React.createFactory(React.createClass({
  getInitialState: function() {
    return {
      overlay: {},
      selected: false
    };
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState(nextProps);
  },

  render: function() {
    var overlay = this.props.overlay;
    var imageUrl = overlay.url;
    var selected = this.props.selected ? " selected" : "";

    return (
      TR({className: "overlayRow", onClick: this.props.onSelect},
        TD({className: "overlayCell"},
          INPUT({type: "checkbox", checked: overlay.visible,
            onChange: this.onVisibleChange})
        ),
        TD({className: "overlayCell"},
          DIV({className: "overlayImageBox" + selected},
            IMG({className: "overlayImage img-thumbnail", src: imageUrl}),
            DIV({className: "closeButton", onClick: this.props.onRemove})
          )
        )
      )
    )
  },

  onVisibleChange: function(event) {
    var value = event.target.checked;

    this.state.overlay["visible"] = value;
    this.setState(this.state);

    var props = { visible: value };
    OverlayStore.modify(this.props.overlay.id, props);
  },
}));

/**
 * TODO docs
 */
var AddOverlayRow = React.createFactory(React.createClass({
  render: function() {
    return (
      TR({className: "overlayRow", onClick: this.props.onSelect},
        TD({className: "overlayCell"}),
        TD({className: "overlayCell"},
          DIV({className: "overlayImageBox"},
            DIV({className: "overlayImage add img-thumbnail"},
              DIV({onClick: this.props.onAdd},
                Locale.$STR("pixelPerfect.label.addLayer")
              )
            )
          )
        )
      )
    )
  },
}));

// Exports from this module
exports.OverlayList = React.createFactory(OverlayList);
});
