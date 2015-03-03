/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const { LayerList } = require("layer-list");
const { LayerForm } = require("layer-form");
const { LayerStore } = require("layer-store");

// Shortcuts
const { TABLE, TR, TD, DIV, IMG, SPAN } = Reps.DOM;

/**
 * @react This template implements basic layout for the popup panel.
 * There are two components displayed:
 * 1. Layer list: list of all registered layers.
 * 2. Layer form: a form displaying properties of the selected layer.
 *
 * If there are no layers, the popup panel displays default content
 * with instructions and one button: 'Add Layer'.
 */
var PopupPanel = React.createClass({
  getInitialState: function() {
    return {
      layers: [],
      selection: null,
    };
  },

  render: function() {
    var layers = this.state.layers;
    var selectedLayer = this.getLayer(this.state.selection);

    // If there are no layer, display default content with instructions.
    if (!layers || !layers.length) {
      return DefaultContent({
        version: this.state.version,
        addLayer: this.addLayer
      });
    }

    // Render list of layers and layer form components.
    return (
      TABLE({className: "", width: "100%"},
        TR({},
          TD({className: "layerListCell"},
            DIV({className: "layerList"},
              LayerList({
                layers: this.state.layers,
                selection: this.state.selection,
                selectLayer: this.selectLayer,
                addLayer: this.addLayer,
                removeLayer: this.removeLayer
              })
            )
          ),
          TD({className: "layerFormCell"},
            DIV({className: "layerForm"},
              LayerForm({
                layer: selectedLayer
              })
            )
          )
        )
      )
    )
  },

  getLayer: function(id) {
    var layers = this.state.layers;
    for (var i=0; i<layers.length; i++) {
      if (layers[i].id == id) {
        return layers[i];
      }
    }
  },

  // Commands

  selectLayer: function(layer) {
    this.state.selection = layer.id;
    this.setState(this.state);
  },

  addLayer: function() {
    LayerStore.add();
  },

  removeLayer: function(layer) {
    LayerStore.remove(layer.id);
  },
});

/**
 * @react This template renders default content in case there are
 * no layers registered. It displays basic instructions about how
 * to begin with Pixel Perfect.
 */
var DefaultContent = React.createFactory(React.createClass({
  render: function() {
    return (
      TABLE({className: "defaultContentTable"},
        TR({},
          TD({width: "10px;"},
            IMG({className: "defaultContentImage",
              src: "chrome://pixelperfect/skin/logo_32x32.png"})
          ),
          TD({className: "defaultContentHeader"},
            SPAN({}, Locale.$STR("pixelPerfect.title")),
            SPAN({}, " "),
            SPAN({}, this.props.version)
          )
        ),
        TR({},
          TD({colSpan: 2},
            DIV({className: "defaultContentDesc"},
              Locale.$STR("pixelPerfect.help.desc")
            )
          )
        ),
        TR({},
          TD({colSpan: 2},
            DIV({className: "layerImage add img-thumbnail"},
              DIV({onClick: this.props.addLayer},
                Locale.$STR("pixelPerfect.label.addLayer")
              )
            )
          )
        ),
        TR({},
          TD({colSpan: 2},
            SPAN({className: "defaultContentMore", onClick: this.onHomePage},
              Locale.$STR("pixelPerfect.help.more")
            )
          )
        )
      )
    )
  },

  onHomePage: function() {
    postChromeMessage("open-homepage");
  }
}));

// Exports from this module
exports.PopupPanel = React.createFactory(PopupPanel);
});
