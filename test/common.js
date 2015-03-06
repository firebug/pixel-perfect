/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");
const { Cu } = require("chrome");
const { main, ToolboxChrome } = require("../lib/main.js");
const { defer, resolve } = require("sdk/core/promise");
const { getTabWhenReady } = require("../lib/sdk/test/window.js");
const { once } = require("sdk/event/core");
const { StartButton } = require("../lib/start-button.js");

var loaded = false;

/**
 * Load Pixel Perfect add-on.
 */
function loadPixelPerfect() {
  // Do not load more than once.
  if (loaded) {
    return resolve();
  }

  main({loadReason: "install"});

  loaded = true;

  return resolve();
};

/**
 * Open Pixel Perfect popup panel and resolve when its ready.
 *
 * @returns A promise that is resolved when the popup panel is
 * ready and fully loaded.
 */
function openTabAndPixelPerfect(url) {
  let deferred = defer();

  loadPixelPerfect("about:blank").then(() => {
    getTabWhenReady(url).then(({tab}) => {
      StartButton.onTogglePixelPerfect().then(popup => {
        // Wait till the panel is attached to the backend
        once(popup, "attached", () => {
          let options = {
            tab: tab,
            popup: popup,
            contentWindow: popup.panelFrame.contentWindow
          };

          // Load helper frame script to the panel's content frame.
          let { messageManager } = popup.panelFrame.frameLoader;
          let url = self.data.url("../test/frame-script.js");
          messageManager.loadFrameScript(url, false);

          deferred.resolve(options);
        })
      })
    })
  });

  return deferred.promise;
}

// Panel Content API

function exist(frame, selector) {
  let data = { selector: selector }
  return postContentRequest(frame, "exist", data);
}

function click(frame, selector) {
  let data = { selector: selector }
  return postContentRequest(frame, "click", data);
}

/**
 * Send message to the popup panel content scope (iframe). The communication
 * between the test scope (chrome) and the panel frame scope (content) is
 * done through a message manager in a form: request -> response.
 */
function postContentRequest(frame, type, data) {
  let deferred = defer();

  let { messageManager } = frame.frameLoader;

  let onResponse = (response) => {
    messageManager.removeMessageListener("test/response", onResponse);
    deferred.resolve(response);
  };

  messageManager.addMessageListener("test/response", onResponse);
  messageManager.sendAsyncMessage("test/request", {
    type: type,
    data: data
  });

  return deferred.promise;
}

// Exports from this module
exports.loadPixelPerfect = loadPixelPerfect;
exports.openTabAndPixelPerfect = openTabAndPixelPerfect;
exports.exist = exist;
exports.click = click;
