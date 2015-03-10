/* See license.txt for terms of usage */

"use strict";

const { StartButton } = require("../lib/start-button.js");
const { loadPixelPerfect } = require("./common.js");
const { getTabWhenReady } = require("firebug.sdk/lib/test/window.js");
const { once } = require("sdk/event/core");
const { closeTab } = require("sdk/tabs/utils");

/**
 * Check that the start button can be used to toggle visibility
 * of the Pixel Perfect popup panel.
 */
exports["test Toggle Popup"] = function(assert, done) {
  // Load Pixel Perfect add-on.
  loadPixelPerfect().then(() => {
    // Open test browser tab.
    getTabWhenReady("about:blank").then(({tab}) => {
      // Toggle Pixel Perfect panel to show it.
      StartButton.onTogglePixelPerfect().then(popup => {
        // Wait till the panel is attached to the backend.
        once(popup, "attached", () => {
          assert.ok(popup.panel.state == "open",
            "Popup panel must be open");

          // Toggle the panel again to hide it.
          StartButton.onTogglePixelPerfect().then(popup => {
            // Wait till the panel is detached from the backend.
            once(popup, "detached", () => {
              assert.ok(popup.panel.state == "closed",
                "Popup panel must be closed");

              // Clean up.
              closeTab(tab);
              done();
            })
          })
        })
      })
    })
  })
};

require("sdk/test").run(exports);
