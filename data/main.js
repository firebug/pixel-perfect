/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { OverlayTable } = require("overlay-table");
const Slider = require("bootstrap-slider");

// xxxHonza: temporary JSON data. Should be stored within
// the current profile directory.
var data = {
  overlays: [{
    url: "https://www.google.cz/images/srpr/logo11w.png"
  }, {
    url: "http://getfirebug.com/img/firebug-large.png"
  }, {
    url: "http://upload.wikimedia.org/wikipedia/en/7/74/FTP_Voyager_16_Screenshot.png"
  }, {
    url: "https://www.google.cz/images/srpr/logo11w.png"
  }]
}

var overlayBox = document.querySelector(".overlayBox");
React.render(OverlayTable({data: data}), overlayBox);

var mySlider = new Slider("#opacity", {
  min: 0,
  max: 100,
  orientation: "horizontal",
  value: 50,
  tooltip: "show",
  step: 1,
  handle: "custom"
});

// Display the page content when it's ready to avoid flashing
// during the page load.
document.addEventListener("load", event => {
  document.body.removeAttribute("collapsed");
}, true);

// End of main.js
});
