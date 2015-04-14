/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/reps");
const { LayerStore } = require("layer-store");

// Shortcuts
const { SPAN, TABLE, TR, TD, BUTTON, INPUT, DIV, LABEL } = Reps.DOM;

/**
 * @react This template implements a form allowing to see and modify
 * Layer properties. Every modification is immediately propagated to
 * the storage {@link PixelPerfectStore}. Since the storage object lives
 * inside the chrome scope the access is done through a proxy object
 * {@link LayerStore} that sends appropriate JSON messages using message
 * manager.
 */
var LayerForm = React.createClass({
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
          TD({className: "right"},
            LABEL({className: "pixel-perfect-label",
              htmlFor: "pixel-perfect-opacity"},
              Locale.$STR("pixelPerfect.label.opacity") + ":"
            )
          ),
          TD({},
            INPUT({className: "opacity", type: "range", value: layer.opacity,
              id: "pixel-perfect-opacity",
              onChange: this.onChange.bind(this, "opacity", "string")})
          ),
          TD({},
            INPUT({className: "opacity-value", size: 3, value: layer.opacity,
              maxLength: 3,
              onChange: this.onChange.bind(this, "opacity", "number")})
          )
        ),
        TR({},
          TD({className: "right"},
            LABEL({className: "pixel-perfect-label",
              htmlFor: "pixel-perfect-x"},
              Locale.$STR("pixelPerfect.label.x") + ":")
          ),
          TD({className: "positionCell", colSpan: 2},
            TABLE({className: "position"},
              TR({},
                TD({},
                  INPUT({size: 5, value: layer.x, type: "number",
                    id: "pixel-perfect-x",
                    onChange: this.onChange.bind(this, "x", "number")})
                ),
                TD({className: "right"},
                  LABEL({className: "pixel-perfect-label",
                    htmlFor: "pixel-perfect-y"},
                    Locale.$STR("pixelPerfect.label.y") + ":")
                ),
                TD({},
                  INPUT({size: 5, value: layer.y, type: "number",
                    id: "pixel-perfect-y",
                    onChange: this.onChange.bind(this, "y", "number")})
                )
              )
            )
          )
        ),
        TR({},
          TD({className: "right"},
            LABEL({className: "pixel-perfect-label",
              htmlFor: "pixel-perfect-scale"},
              Locale.$STR("pixelPerfect.label.scale") + ":")
          ),
          TD({colSpan: 2},
            INPUT({size: 3, value: layer.scale, type: "number", step: "0.1",
              id: "pixel-perfect-scale",
              onChange: this.onChange.bind(this, "scale", "float")})
          )
        ),
        TR({},
          TD({className: "right"},
            LABEL({className: "pixel-perfect-label",
              htmlFor: "pixel-perfect-lock"},
              Locale.$STR("pixelPerfect.label.lock") + ":")
          ),
          TD({colSpan: 2},
            INPUT({type: "checkbox", checked: layer.lock,
              id: "pixel-perfect-lock",
              onChange: this.onChange.bind(this, "lock", "boolean")})
          )
        ),
        TR({},
          TD({className: "right"},
            LABEL({className: "pixel-perfect-label",
              htmlFor: "pixel-perfect-invert"},
              Locale.$STR("pixelPerfect.label.invert") + ":")
          ),
          TD({colSpan: 2},
            INPUT({type: "checkbox", checked: layer.invert,
              id: "pixel-perfect-invert",
              onChange: this.onChange.bind(this, "invert", "boolean")})
          )
        ),
        TR({},
          TD({colSpan: 3},
            DIV({className: "url"}, layer.url)
          )
        )
      )
    );
  },

  // Events

  /**
   * Handler for changes made through the form's input fields.
   * State of the current layer is updated and changed propagated
   * to the {@link LayerStore}.
   */
  onChange: function(propName, type, event) {
    var value;

    switch (type) {
    case "boolean":
      value = event.target.checked;
      break;
    case "number":
      value = parseInt(event.target.value, 10);
      break;
    case "float":
      var v = event.target.value;
      value = (v != "0.") ? parseFloat(v, 10) : v;
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
    // The {@link LayerStore} object is used as a proxy to the real
    // storage object that lives in the chrome scope.
    LayerStore.modify(this.props.layer.id, props);
  },
});

// Exports from this module
exports.LayerForm = React.createFactory(LayerForm);
});
