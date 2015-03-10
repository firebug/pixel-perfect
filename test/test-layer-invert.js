/* See license.txt for terms of usage */

"use strict";

const { click, addNewLayer, waitForEvents, removeLayer } = require("./common.js");
const { closeTab } = require("sdk/tabs/utils");

/**
 * This test is responsible for verifying layer's inversion.
 * The user can invert a layer using 'Invert' checkbox that
 * is available in Pixel Perfect popup panel.
 */
exports["test Layer Invert"] = function(assert, done) {
  addNewLayer().then(config => {
    let popup = config.popup;
    let layer = config.layer;

    // Click on the 'Invert' checkbox.
    click(popup, "#pixel-perfect-invert");

    // Wait till the layer is modified on the backend.
    waitForEvents(popup, ["layer-modified"]).then(result => {
      // Get layer info from the backend.
      popup.front.getLayerInfo(layer.id).then(response => {
        assert.equal(response.content.box.invert, "true",
          "The layer must be inverted");

        // Clean up
        removeLayer(popup, layer.id).then(() => {
          config.popup.destroy().then(() => {
            closeTab(config.tab);
            done();
          });
        });
      });
    });
  });
};

require("sdk/test").run(exports);
