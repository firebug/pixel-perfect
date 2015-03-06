/* See license.txt for terms of usage */

"use strict";

const options = require("@loader/options");

const { Cu, Cc, Ci } = require("chrome");
const { StartButton } = require("../lib/start-button.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTabAndPixelPerfect, exist } = require("./common.js");
const { closeTab } = require("sdk/tabs/utils");
const { defer } = require("sdk/core/promise");
const { once } = require("sdk/event/core");
const { setTimeout } = require("sdk/timers");

Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/Services.jsm");

/**
 * Add layer and check that it's properly created. We are using the default
 * add-on's logo as an image that is used to create a new layer. The logo
 * is copied out of the XPI package to a temporary file since we need file:
 * (protocol) URL to create a new layer.
 */
exports["test Add Layer"] = function(assert, done) {
  openTabAndPixelPerfect().then(config => {
    let popup = config.popup;

    let win = config.contentWindow;
    let doc = win.document;

    // The popup panel content window must be loaded at this time.
    assert.ok(win, "Popup content window must be available");
    assert.equal(doc.readyState, "complete", "Document must be loaded");

    // Copy extension's icon (it's part of the XPI package) into
    // a temporary file (we need file: URL) and use it to create a layer.
    var file = FileUtils.getFile("TmpD", ["pixelperfect-test-image.png"]);
    copyResource(options.metadata.icon, file).then(status => {
      // Add a new layer. Mimic a message sent from the popup panel
      // frame content when the user clicks the 'Add Layer' button.
      // We don't emulate click to avoid the file picker dialog for now.
      let result = postMessage(popup, "add", [file]);

      // Check the layer store. There should be one layer at this moment.
      assert.equal(popup.store.layers.length, 1, "There must be one layer");

      // Wait till the layer is added to the backend.
      once(popup, "layer-added", response => {
        console.log("pixel-perfect: layer-added");

        // Wait till the panel content is refreshed.
        once(popup, "panel-refreshed", () => {
          console.log("pixel-perfect: panel-refreshed");

          let layer = result[0];
          let selector = "img.layerImage[data-id='" + layer.id + "']";

          // Check if the panel content displays the new layer.
          exist(popup.panelFrame, selector).then(result => {
            assert.ok(result.data.args, "The layer must exist in the popup panel");

            // Clean up
            config.popup.hide().then(() => {
              closeTab(config.tab);
              done();
            });
          });
        });
      });
    });
  });
};

function postMessage(popup, type, args) {
  return popup.onMessage({data: {
    type: type,
    args: args
  }});
}

function copyResource(chromeUrl, targetFile) {
  let deferred = defer();
  let channel = NetUtil.newChannel(chromeUrl);
  NetUtil.asyncFetch(channel, function(inputStream, status) {
    var output = FileUtils.openSafeFileOutputStream(targetFile);
    NetUtil.asyncCopy(inputStream, output, status => {
      deferred.resolve(status);
    });
  });

  return deferred.promise;
}

require("sdk/test").run(exports);
