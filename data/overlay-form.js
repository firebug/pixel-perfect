/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");
const { OverlayStore } = require("overlay-store");

// Shortcuts
const { SPAN, TABLE, TR, TD, BUTTON, INPUT, DIV } = Reps.DOM;

/**
 * TODO docs
 */
var OverlayForm = React.createClass({
  getInitialState: function() {
    return {};
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState(nextProps.overlay);
  },

  render: function() {
    var overlay = this.props.overlay;
    return (
      TABLE({className: "form"},
        TR({},
          TD({className: "right"}, Locale.$STR("pixelPerfect.label.opacity") + ":"),
          TD({},
            INPUT({className: "opacity", type: "range", value: overlay.opacity,
              onChange: this.onChange.bind(this, "opacity", "string")})
          ),
          TD({},
            INPUT({className: "opacity-value", size: 3, value: overlay.opacity,
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
                  INPUT({size: 5, value: overlay.x,
                    onChange: this.onChange.bind(this, "x", "number")})
                ),
                TD({className: "right"}, Locale.$STR("pixelPerfect.label.y") + ":"),
                TD({},
                  INPUT({size: 5, value: overlay.y,
                    onChange: this.onChange.bind(this, "y", "number")})
                )
              )
            )
          )
        ),
        TR({},
          TD({className: "right"}, Locale.$STR("pixelPerfect.label.scale") + ":"),
          TD({colSpan: 2},
            INPUT({size: 3, value: overlay.scale,
              onChange: this.onChange.bind(this, "scale", "number")})
          )
        ),
        TR({},
          TD({className: "right"}, Locale.$STR("pixelPerfect.label.visible") + ":"),
          TD({colSpan: 2},
            INPUT({type: "checkbox", checked: overlay.visible,
              onChange: this.onChange.bind(this, "visible", "boolean")})
          )
        ),
        TR({},
          TD({className: "right"}, Locale.$STR("pixelPerfect.label.lock") + ":"),
          TD({colSpan: 2},
            INPUT({type: "checkbox", checked: overlay.lock,
              onChange: this.onChange.bind(this, "lock", "boolean")})
          )
        ),
        TR({},
          TD({colSpan: 3},
            DIV({className: "url"}, overlay.url)
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

    this.state[propName] = value;
    this.setState(this.state);

    var props = {};
    props[propName] = value;
    OverlayStore.modify(this.props.overlay.id, props);
  },
});

// Exports from this module
exports.OverlayForm = React.createFactory(OverlayForm);
});
