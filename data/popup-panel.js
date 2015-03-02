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
      overlays: [],
      selection: null,
    };
  },

  render: function() {
    var overlays = this.state.overlays;
    var selectedOverlay = this.getLayer(this.state.selection);

    // If there are no overlays, display default content with instructions.
    if (!overlays || !overlays.length) {
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
                overlays: this.state.overlays,
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
                overlay: selectedOverlay
              })
            )
          )
        )
      )
    )
  },

  getLayer: function(id) {
    var overlays = this.state.overlays;
    for (var i=0; i<overlays.length; i++) {
      if (overlays[i].id == id) {
        return overlays[i];
      }
    }
  },

  // Commands

  selectOverlay: function(overlay) {
    this.state.selection = overlay.id;
    this.setState(this.state);
  },

  addOverlay: function() {
    OverlayStore.add();
  },

  removeOverlay: function(overlay) {
    OverlayStore.remove(overlay.id);
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
