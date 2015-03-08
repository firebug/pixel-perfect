/* See license.txt for terms of usage */

"use strict";

const { click, addNewLayer, waitForEvents, removeLayer, sendPopupMessage } = require("./common.js");
const { closeTab } = require("sdk/tabs/utils");

/**
 * xxxHonza TODO docs
 */
exports["test Layer Invert"] = function(assert, done) {
  addNewLayer().then(config => {
    let popup = config.popup;
    let layer = config.layer;

    // xxxHonza: the scale change should be done through the form UI.
    let props = { scale: 2 };
    sendPopupMessage(popup, "modify", [layer.id, props]);

    // Wait till the layer is modified on the backend.
    waitForEvents(popup, ["layer-modified"]).then(result => {
      // Get layer info from the backend.
      popup.front.getLayerInfo(layer.id).then(response => {
        let style = response.content.image.style;
        let index = style.indexOf("transform:scale(2)");

        assert.ok(index > -1, "Layer's image must be scaled");

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
