/* See license.txt for terms of usage */

"use strict";

const { exist, addNewLayer, removeLayer } = require("./common.js");
const { closeTab } = require("sdk/tabs/utils");

/**
 * Add layer and check that it's properly created.
 */
exports["test Add Layer"] = function(assert, done) {
  addNewLayer().then(config => {
    let popup = config.popup;
    let layer = config.layer;

    // Check the layer store. There should be one layer at this moment.
    assert.equal(popup.store.layers.length, 1, "There must be one layer");

    // Check if the panel content displays new layer.
    let selector = "img.layerImage[data-id='" + layer.id + "']";
    exist(popup, selector).then(result => {
      assert.ok(result.data.args, "The layer must exist in the popup panel");

      // Clean up
      removeLayer(popup, layer.id).then(() => {
        config.popup.destroy().then(() => {
          closeTab(config.tab);
          done();
        });
      });
    });
  });
};

require("sdk/test").run(exports);
