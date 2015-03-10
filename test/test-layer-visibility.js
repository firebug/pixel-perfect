/* See license.txt for terms of usage */

"use strict";

const { click, addNewLayer, waitForEvents, removeLayer } = require("./common.js");
const { closeTab } = require("sdk/tabs/utils");

/**
 * xxxHonza TODO docs
 */
exports["test Layer Visibility"] = function(assert, done) {
  addNewLayer().then(config => {
    let popup = config.popup;
    let layer = config.layer;

    // Click on the visibility checkbox.
    click(popup, "input.visibility");

    // Wait till the layer is modified on the backend.
    waitForEvents(popup, ["layer-modified"]).then(result => {
      // Get layer info from the backend.
      popup.front.getLayerInfo(layer.id).then(response => {
        let style = response.content.box.style;
        let index = style.indexOf("display:none");

        assert.ok(index > -1, "Layer's image must be hidden at this moment");

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
