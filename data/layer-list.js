/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const { LayerStore } = require("layer-store");

// Shortcuts
const { TABLE, TBODY, TR, TD, INPUT, IMG, THEAD, TH, DIV } = Reps.DOM;

/**
 * TODO docs
 */
var LayerList = React.createClass({
  render: function() {
    var rows = [];
    var layers = this.props.layers;

    layers.forEach(layer => {
      rows.push(LayerRow({
        key: layer.id,
        layer: layer,
        selected: layer.id == this.props.selection,
        selectLayer: this.props.selectLayer.bind(this, layer),
        removeLayer: this.props.removeLayer.bind(this, layer)
      }));
    });

    // An extra row for appending new layers.
    rows.push(AddLayerRow({
      addLayer: this.props.addLayer
    }));

    return (
      TABLE({className: "layerTable"},
        THEAD({className: "poolRow"},
          TH({width: "20px"}),
          TH({width: "96px"})
        ),
        TBODY(null, rows)
      )
    );
  },
});

/**
 * TODO docs
 */
var LayerRow = React.createFactory(React.createClass({
  getInitialState: function() {
    return {
      layer: {},
      selected: false
    };
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState(nextProps);
  },

  render: function() {
    var layer = this.props.layer;
    var imageUrl = layer.url;
    var selected = this.props.selected ? " selected" : "";

    return (
      TR({className: "layerRow", onClick: this.props.selectLayer},
        TD({className: "layerCell"},
          INPUT({type: "checkbox", checked: layer.visible,
            onChange: this.onVisibleChange})
        ),
        TD({className: "layerCell"},
          DIV({className: "layerImageBox" + selected},
            IMG({className: "layerImage img-thumbnail", src: imageUrl}),
            DIV({className: "closeButton", onClick: this.onRemove})
          )
        )
      )
    )
  },

  onRemove: function(event) {
    // Cancel the event to avoid selection of the to be removed layer.
    event.stopPropagation();
    event.preventDefault();

    // Execute provided callback, it's already bound with
    // a layer object associated with this row.
    this.props.removeLayer();
  },

  onVisibleChange: function(event) {
    var value = event.target.checked;

    this.state.layer["visible"] = value;
    this.setState(this.state);

    var props = { visible: value };
    LayerStore.modify(this.props.layer.id, props);
  },
}));

/**
 * TODO docs
 */
var AddLayerRow = React.createFactory(React.createClass({
  render: function() {
    return (
      TR({className: "layerRow", onClick: this.props.onSelect},
        TD({className: "layerCell"}),
        TD({className: "layerCell"},
          DIV({className: "layerImageBox"},
            DIV({className: "layerImage add img-thumbnail"},
              DIV({onClick: this.props.addLayer},
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
exports.LayerList = React.createFactory(LayerList);
});
