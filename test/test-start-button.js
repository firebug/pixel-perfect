/* See license.txt for terms of usage */

"use strict";

const { StartButton } = require("../lib/start-button.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { loadPixelPerfect } = require("./common.js");

/**
 * Check that the start button is available in Firefox toolbar.
 */
exports["test Start Button"] = function(assert, done) {
  loadPixelPerfect().then(() => {
    let browser = getMostRecentBrowserWindow();
    let element = StartButton.getButton(browser.document);
    assert.ok(element, "The start button must be available");
    done();
  });
};

require("sdk/test").run(exports);
