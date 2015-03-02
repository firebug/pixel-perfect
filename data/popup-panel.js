/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const { OverlayList } = require("overlay-list");
const { OverlayForm } = require("overlay-form");
const { OverlayStore } = require("overlay-store");

// Shortcuts
const { TABLE, TR, TD, DIV, IMG, SPAN } = Reps.DOM;

/**
 * TODO docs
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
        addOverlay: this.addOverlay
      });
    }

    return (
      TABLE({className: "", width: "100%"},
        TR({},
          TD({className: "overlayListCell"},
            DIV({className: "overlayList"},
              OverlayList({
                layers: this.state.layers,
                selection: this.state.selection,
                selectOverlay: this.selectOverlay,
                addOverlay: this.addOverlay,
                removeOverlay: this.removeOverlay
              })
            )
          ),
          TD({className: "overlayFormCell"},
            DIV({className: "overlayForm"},
              OverlayForm({
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

  selectOverlay: function(layer) {
    this.state.selection = layer.id;
    this.setState(this.state);
  },

  addOverlay: function() {
    OverlayStore.add();
  },

  removeOverlay: function(layer) {
    OverlayStore.remove(layer.id);
  },
});

/**
 * xxxHonza: TODO docs
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
            DIV({className: "overlayImage add img-thumbnail"},
              DIV({onClick: this.props.addOverlay},
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
    // xxxHonza: the URL should come from the package.json file
    var url = "https://github.com/firebug/pixel-perfect/wiki";
    postChromeMessage("open-tab", [url]);
  }
}));

// Exports from this module
exports.PopupPanel = React.createFactory(PopupPanel);
});
