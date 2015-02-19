/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { OverlayTable } = require("overlay-table");

// xxxHonza: temporary JSON data. Should be stored within
// the current profile directory.
var data = {
  overlays: [{
    url: "https://www.google.cz/images/srpr/logo11w.png"
  }, {
    url: "http://getfirebug.com/img/firebug-large.png"
  }, {
    url: "http://upload.wikimedia.org/wikipedia/en/7/74/FTP_Voyager_16_Screenshot.png"
  }]
}

var content = document.getElementById("content");
React.render(OverlayTable({data: data}), content);
});
