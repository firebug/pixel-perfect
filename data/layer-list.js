/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const { LayerStore } = require("layer-store");

// Shortcuts
const { TABLE, TBODY, TR, TD, INPUT, IMG, THEAD, TH, DIV } = Reps.DOM;

/**
 * @react This template is responsible for displaying list of registered
 * layers. The user can append new as well as remove an existing layer
 * from/to the list.
 */
var LayerList = React.createClass({
  getInitialState: function() {
    return {
      layers: this.props.layers,
      selection: this.props.selection
   };
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState({
      layers: nextProps.layers,
      selection: nextProps.selection
    });
  },

  render: function() {
    var rows = [];
    var layers = this.state.layers;

    layers.forEach(layer => {
      rows.push(LayerRow({
        key: layer.id,
        layer: layer,
        selected: layer.id == this.props.selection,
        selectLayer: this.props.selectLayer.bind(this, layer),
        removeLayer: this.props.removeLayer.bind(this, layer),
        dragStart: this.dragStart,
        dragEnd: this.dragEnd,
      }));
    });

    // An extra row for appending new layers.
    rows.push(AddLayerRow({
      addLayer: this.props.addLayer
    }));

    return (
      TABLE({className: "layerTable", onDragOver: this.dragOver},
        THEAD({className: "poolRow"},
          TH({width: "20px"}),
          TH({width: "96px"})
        ),
        TBODY(null, rows)
      )
    );
  },

  // Drag And Drop

  dragStart: function(event) {
    // Drag operation can only start by dragging layer image.
    var target = event.currentTarget;
    if (target.classList.contains("layerImage")) {
      this.dragged = event.currentTarget;
      event.dataTransfer.effectAllowed = "copyMove";

      // Firefox requires calling dataTransfer.setData
      // for the drag to properly work
      event.dataTransfer.setData("text/html", null);
    }
  },

  dragOver: function(event) {
    // Bail out if no drag in progress at this moment.
    if (!this.dragged) {
      return;
    }

    // Drop operation can only happen on an existing layer image.
    var target = event.target;
    if (!target.classList.contains("layerImage")) {
      return;
    }

    event.preventDefault();

    // Ignore the beginning of the drag operation when the mouse is
    // hovering over the clicked layer.
    if (target == this.dragged) {
      return;
    }

    // Check if the mouse is hovering close to the target layer
    // image center. If yes, let's perform the drag-move operation
    // i.g. move the source layer into a new position in the list.
    var y = event.clientY;
    var rect = target.getBoundingClientRect();
    var delta = (rect.height / 3);
    if (!(y > rect.top + delta && y < rect.bottom - delta)) {
      return;
    }

    var originalIndex = this.getLayerIndexById(this.dragged.dataset.id);
    var targetIndex = this.getLayerIndexById(target.dataset.id);

    // Move the dragging layer into a new position in the layers list
    // and ensure UI rendering by setting a new state.
    var layers = this.state.layers;
    var removed = layers.splice(originalIndex, 1)[0];
    layers.splice(targetIndex, 0, removed);

    // Set new state (dragged image is at new index in the array).
    this.setState({layers: layers});

    LayerStore.move(originalIndex, targetIndex);
  },

  dragEnd: function(event) {
    // Nothing special here, the dragged image is already moved
    // into a new location during the drag-over event.
  },

  // Helpers

  getLayerIndexById: function(id) {
    return this.state.layers.findIndex(layer => {
       return (layer.id == id);
    })
  }
});

/**
 * @react This template renders one layer (row) in the list.
 * Every layer is rendered as a small thumbnail displaying
 * the associated image.
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
            IMG({className: "layerImage img-thumbnail", src: imageUrl,
              key: layer.id, "data-id": layer.id,
              onDragStart: this.props.dragStart,
              onDragEnd: this.props.dragEnd}),
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
 * @react This template renders a button for adding a new layer.
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
