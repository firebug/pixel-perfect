/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { PopupLayout } = require("popup-layout");

// Get overlay data from persistent store.
var data = {
  overlays: OverlayStore.getOverlays(),
}
data.selection = data.overlays[0];

React.render(PopupLayout(data), document.body);

// Display the page content when it's ready to avoid flashing
// during the page load.
document.addEventListener("load", event => {
  document.body.removeAttribute("collapsed");
}, true);

// End of main.js
});
