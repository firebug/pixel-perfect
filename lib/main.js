/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Chrome } = require("./sdk/chrome.js");
const { Locale } = require("./sdk/core/locale.js");

// Pixel Perfect modules
const { StyleEditorOverlay } = require("./style-editor-overlay.js");
const { PixelPerfectToolboxOverlay } = require("./pixel-perfect-toolbox-overlay.js");
const { StartButton } = require("./start-button.js");
const { FirstRun } = require("./first-run.js");

// Localization files. All strings in the UI should be loaded from these
// files, so the entire extension can be localized into other languages.
Locale.registerStringBundle("chrome://pixelperfect/locale/toolbox.properties");
Locale.registerStringBundle("chrome://pixelperfect/locale/popup-panel.properties");
Locale.registerStringBundle("chrome://pixelperfect/locale/notification.properties");

/**
 * Entry point of the extension. Both 'main' and 'onUnload' methods are
 * exported from this module and executed automatically by Add-ons SDK.
 */
function main(options, callbacks) {
  Trace.sysout("main;", options);

  Chrome.initialize(options);

  Chrome.registerPanelOverlay(StyleEditorOverlay);
  Chrome.registerToolboxOverlay(PixelPerfectToolboxOverlay);

  StartButton.initialize(options);
  FirstRun.initialize(options);
}

function onUnload(reason) {
  Trace.sysout("onUnload; " + reason);

  Chrome.unregisterToolboxOverlay(PixelPerfectToolboxOverlay);
  Chrome.unregisterPanelOverlay(StyleEditorOverlay);

  StartButton.shutdown(reason);
  Chrome.shutdown(reason);
}

// Exports from this module
exports.main = main;
exports.onUnload = onUnload;
