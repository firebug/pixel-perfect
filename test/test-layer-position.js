/* See license.txt for terms of usage */

"use strict";

const { click, addNewLayer, waitForEvents, removeLayer, sendPopupMessage } = require("./common.js");
const { closeTab } = require("sdk/tabs/utils");

/**
 * This test is responsible for verifying layer's position. The user
 * can change the position using input fields available in Pixel
 * Perfect popup panel.
 */
exports["test Layer Position"] = function(assert, done) {
  addNewLayer().then(config => {
    let popup = config.popup;
    let layer = config.layer;

    // xxxHonza: the position change should be done through the form UI.
    let props = { x: 15, y:15 };
    sendPopupMessage(popup, "modify", [layer.id, props]);

    // Wait till the layer is modified on the backend.
    waitForEvents(popup, ["layer-modified"]).then(result => {
      // Get layer info from the backend.
      popup.front.getLayerInfo(layer.id).then(response => {
        let style = response.content.box.style;
        let xi = style.indexOf("left:15px");
        let yi = style.indexOf("top:15px");

        assert.ok(xi > -1 && yi > -1, "Layer's position must be set");

        // Clean up
        removeLayer(popup, layer.id).then(() => {
          config.popup.destroy().then(() => {
            closeTab(config.tab);
            done();
          });
        });
      })
    });
  });
};

require("sdk/test").run(exports);
