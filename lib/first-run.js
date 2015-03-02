/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { prefs } = require("sdk/simple-prefs");
const { StartButton } = require("./start-button.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

/**
 * This module implements first run experience. It displays simple
 * notification message about Pixel Perfect. It's displayed only
 * once just after installation.
 */
var FirstRun =
/** @lends FirstRun */
{
  // Initialization

  initialize: function(options) {
    if (!prefs.firstRun) {
      return;
    }

    // Do not show the notification again the next time.
    prefs.firstRun = false;

    var panel = require("sdk/panel").Panel({
      contentURL: "./notification.html",
      contentScriptFile: "./notification-content.js"
    });

    // Communication with the panel is done through a 'port'.
    // Read more about ports on MDN:
    // https://developer.mozilla.org/en-US/Add-ons/SDK/Guides/Content_Scripts/using_port
    // The only message sent from the panel is 'start'. It's fired when the
    // use clicks on 'Start Pixel Perfect'.
    panel.port.on("start", function(url) {
      StartButton.onTogglePixelPerfect();
    });

    let browser = getMostRecentBrowserWindow();
    let doc = browser.document;
    let startButton = doc.getElementById("pixel-perfect-start-button");

    let config = {
      height: 230,
      width: 390
    };

    // Show first-run notification message.
    panel.show(config, startButton);
  },
}

// Exports from this module
exports.FirstRun = FirstRun;
