/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const { OverlayStore } = require("overlay-store");

// Shortcuts
const { SPAN, TABLE, TR, TD, BUTTON, INPUT, DIV } = Reps.DOM;

/**
 * @react This template implements a form allowing to see and modify
 * Layer properties. Every modification is immediately propagated to
 * the storage {PixelPerfectStore}. Since the storage object lives
 * inside the chrome scope the access is done through a proxy object
 * {OverlayStore} that sends appropriate JSON messages using message
 * manager.
 */
var OverlayForm = React.createClass({
  getInitialState: function() {
    return {};
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState(nextProps.layer);
  },

  render: function() {
    var layer = this.props.layer;
    return (
      TABLE({className: "form"},
        TR({},
          TD({className: "right"}, Locale.$STR("pixelPerfect.label.opacity") + ":"),
          TD({},
            INPUT({className: "opacity", type: "range", value: layer.opacity,
              onChange: this.onChange.bind(this, "opacity", "string")})
          ),
          TD({},
            INPUT({className: "opacity-value", size: 3, value: layer.opacity,
              maxLength: 3,
              onChange: this.onChange.bind(this, "opacity", "number")})
          )
        ),
        TR({},
          TD({className: "right"}, Locale.$STR("pixelPerfect.label.x") + ":"),
          TD({className: "positionCell", colSpan: 2},
            TABLE({className: "position"},
              TR({},
                TD({},
                  INPUT({size: 5, value: layer.x, type: "number",
                    onChange: this.onChange.bind(this, "x", "number")})
                ),
                TD({className: "right"}, Locale.$STR("pixelPerfect.label.y") + ":"),
                TD({},
                  INPUT({size: 5, value: layer.y, type: "number",
                    onChange: this.onChange.bind(this, "y", "number")})
                )
              )
            )
          )
        ),
        TR({},
          TD({className: "right"}, Locale.$STR("pixelPerfect.label.scale") + ":"),
          TD({colSpan: 2},
            INPUT({size: 3, value: layer.scale,
              onChange: this.onChange.bind(this, "scale", "number")})
          )
        ),
        TR({},
          TD({className: "right"}, Locale.$STR("pixelPerfect.label.visible") + ":"),
          TD({colSpan: 2},
            INPUT({type: "checkbox", checked: layer.visible,
              onChange: this.onChange.bind(this, "visible", "boolean")})
          )
        ),
        TR({},
          TD({className: "right"}, Locale.$STR("pixelPerfect.label.lock") + ":"),
          TD({colSpan: 2},
            INPUT({type: "checkbox", checked: layer.lock,
              onChange: this.onChange.bind(this, "lock", "boolean")})
          )
        ),
        TR({},
          TD({colSpan: 3},
            DIV({className: "url"}, layer.url)
          )
        )
      )
    )
  },

  // Events

  onChange: function(propName, type, event) {
    var value;

    switch (type) {
    case "boolean":
      value = event.target.checked;
      break;
    case "number":
      value = parseInt(event.target.value, 10);
      break;
    case "string":
      value = event.target.value;
      break;
    }

    if (this.state[propName] === value) {
      return;
    }

    // Make sure the UI is updated.
    this.state[propName] = value;
    this.setState(this.state);

    var props = {};
    props[propName] = value;

    // Immediately update modified layer inside the store object.
    // The {OverlayStore} object is used as a proxy to the real storage
    // object that lives in the chrome scope.
    OverlayStore.modify(this.props.layer.id, props);
  },
});

// Exports from this module
exports.OverlayForm = React.createFactory(OverlayForm);
});
