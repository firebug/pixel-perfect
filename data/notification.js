/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");

// Shortcuts
const { TABLE, TR, TD, DIV, IMG, SPAN, BR } = Reps.DOM;

/**
 * @react This template implements UI for the first-run notification panel.
 * The panel displays basic information about the extension and a link
 * that can be used to open Pixel Perfect.
 */
var NotificationContent = React.createFactory(React.createClass({
  render: function() {
    var style = {
      "textAlign": "justify"
    }

    return (
      TABLE({className: "defaultContentTable"},
        TR({},
          TD({width: "10px;", style: style},
            IMG({className: "defaultContentImage",
              src: "chrome://pixelperfect/skin/logo_32x32.png"})
          ),
          TD({className: "defaultContentHeader", style: style},
            SPAN({}, this.props.title)
          )
        ),
        TR({},
          TD({colSpan: 2, style: style},
            DIV({className: "defaultContentDesc"}, this.props.welcome),
            BR(),
            DIV({className: "defaultContentDesc"}, this.props.description)
          )
        ),
        TR({},
          TD({colSpan: 2},
            DIV({className: "layerImage add img-thumbnail"},
              DIV({id: "start"}, this.props.start)
            )
          )
        )
      )
    )
  },
}));

// Get localized strings from body dataset and render
// the panel UI.
var locales = JSON.parse(document.body.dataset.locales);
React.render(NotificationContent(locales), document.body);
});
