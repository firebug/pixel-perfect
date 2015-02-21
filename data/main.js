/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { OverlayTable } = require("overlay-table");
const { Overlay } = require("overlay");

// xxxHonza: temporary JSON data. Should be stored within
// the current profile directory.
var data = {
  overlays: [{
    opacity: 50,
    x: 0,
    y: 0,
    scale: 1,
    url: "https://www.google.cz/images/srpr/logo11w.png"
  }, {
    opacity: 50,
    x: 0,
    y: 0,
    scale: 1,
    url: "http://getfirebug.com/img/firebug-large.png"
  }, {
    opacity: 50,
    x: 0,
    y: 0,
    scale: 1,
    url: "http://upload.wikimedia.org/wikipedia/en/7/74/FTP_Voyager_16_Screenshot.png"
  }, {
    opacity: 50,
    x: 0,
    y: 0,
    scale: 1,
    url: "https://www.google.cz/images/srpr/logo11w.png"
  }]
}

var overlayBox = document.querySelector(".overlayBox");
React.render(OverlayTable({data: data}), overlayBox);

var overlayForm = document.querySelector(".overlayForm");
React.render(Overlay({overlay: data.overlays[0]}), overlayForm);

// End of main.js
});
