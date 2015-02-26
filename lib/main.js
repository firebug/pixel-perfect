/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Chrome } = require("./sdk/chrome.js");
const { Locale } = require("./sdk/core/locale.js");

// Pixel Perfect modules
const { StyleEditorOverlay } = require("./style-editor-overlay.js");
const { StartButton } = require("./start-button.js");

Locale.registerStringBundle("chrome://pixelperfect/locale/toolbox.properties");
Locale.registerStringBundle("chrome://pixelperfect/locale/popup-panel.properties");

/**
 * Entry point of the extension. Both 'main' and 'onUnload' methods are
 * exported from this module and executed automatically by Add-ons SDK.
 */
function main(options, callbacks) {
  Trace.sysout("main;", options);

  StartButton.initialize(options);
  Chrome.initialize(options);

  Chrome.registerOverlay(StyleEditorOverlay);
}

function onUnload(reason) {
  Trace.sysout("onUnload; " + reason);

  Chrome.unregisterOverlay(StyleEditorOverlay);

  StartButton.shutdown(reason);
  Chrome.shutdown(reason);
}

// Exports from this module
exports.main = main;
exports.onUnload = onUnload;
