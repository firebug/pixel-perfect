/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("./reps");

// Shortcuts
const { TABLE, TR, TD, DIV, IMG, SPAN, BR } = Reps.DOM;

/**
 * xxxHonza: TODO docs
 * xxxHonza: localization
 */
var NotificationContent = React.createFactory(React.createClass({
  render: function() {
    var style = {
      "text-align": "justify"
    }

    return (
      TABLE({className: "defaultContentTable"},
        TR({},
          TD({width: "10px;", style: style},
            IMG({className: "defaultContentImage",
              src: "chrome://pixelperfect/skin/logo_32x32.png"})
          ),
          TD({className: "defaultContentHeader", style: style},
            SPAN({}, "Pixel Perfect")
          )
        ),
        TR({},
          TD({colSpan: 2, style: style},
            DIV({className: "defaultContentDesc"},
              "Welcome to Pixel Perfect!"
            ),
            BR(),
            DIV({className: "defaultContentDesc"},
              "Pixel Perfect extension has been originally introduced for Firebug. " +
              "This new version is built on top of native Firefox developer tools " +
              "with improved user experience and features. Among other things, " +
              "remote devices such as mobile phones also supported. Enjoy!"
            )
          )
        ),
        TR({},
          TD({colSpan: 2},
            DIV({className: "overlayImage add img-thumbnail"},
              DIV({id: "start"},
                "Start Pixel Perfect"
              )
            )
          )
        )
      )
    )
  },
}));

// Initial panel content rendering.
React.render(NotificationContent(), document.body);
});
