/* See license.txt for terms of usage */

"use strict";

const { exist, sendPopupMessage, waitForEvents, addNewLayer } = require("./common.js");
const { closeTab } = require("sdk/tabs/utils");

/**
 * Remove layer and check that it's properly removed.
 */
exports["test Remove Layer"] = function(assert, done) {
  addNewLayer().then(config => {
    let popup = config.popup;
    let layer = config.layer;

    // Remove layers (mimic a message sent from panel content).
    sendPopupMessage(popup, "remove", [layer.id]);

    waitForEvents(popup, ["panel-refreshed", "layer-removed"]).then(() => {
      // The layer should disappear from the panel content
      let selector = "img.layerImage[data-id='" + layer.id + "']";
      exist(popup, selector).then(result => {
        assert.ok(!result.data.args, "The layer must be gone");

        // Clean up
        config.popup.destroy().then(() => {
          closeTab(config.tab);
          done();
        });
      });
    });
  });
};

require("sdk/test").run(exports);
