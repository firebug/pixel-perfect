/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");
const options = require("@loader/options");

const { Cu } = require("chrome");
const { main } = require("../lib/main.js");
const { defer, resolve } = require("sdk/core/promise");
const { getTabWhenReady } = require("firebug.sdk/lib/test/window.js");
const { once } = require("sdk/event/core");
const { StartButton } = require("../lib/start-button.js");

Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/Services.jsm");

// A flag indication whether the Pixel Perfect add-on is already loaded.
// (loaded == main function executed)
var loaded = false;

/**
 * Load Pixel Perfect add-on. It's done only once if one of the previous
 * running tests also executed this method.
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

  loadPixelPerfect().then(() => {
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

/**
 * Appends a new layer to the list. The layer is using logo PNG file
 * coming from within the XPI package. The logo is copied out of the
 * package to a temporary file since we need file: URL for the layer.
 */
function addNewLayer() {
  let deferred = defer();

  openTabAndPixelPerfect().then(config => {
    let popup = config.popup;

    // Copy extension's icon (it's part of the XPI package) into
    // a temporary file (we need file: URL) and use it to create a layer.
    let fileName = "pixelperfect-test-image.png";
    let file = FileUtils.getFile("TmpD", [fileName]);
    copyResource(options.metadata.icon, file).then(status => {
      config.file = file;

      // Add a new layer.
      let result = sendPopupMessage(popup, "add", [file]);
      config.layer = result[0];

      // Wait till the layer is displayed in the panel content as well
      // as registered on the backend.
      waitForEvents(popup, ["layer-added", "panel-refreshed"]).then(() => {
        deferred.resolve(config);
      });
    });
  });

  return deferred.promise;
}

/**
 * xxxHonza: TODO docs
 *
 * @param popup
 * @param id
 * @returns
 */
function removeLayer(popup, id) {
  let deferred = defer();

  sendPopupMessage(popup, "remove", [id]);

  waitForEvents(popup, ["panel-refreshed", "layer-removed"]).then(() => {
    deferred.resolve();
  });

  return deferred.promise;
}

/**
 * Mimic a message sent from the popup panel frame content.
 *
 * @param {@link PixelPerfectPopup} popup Reference to the popup object
 * @param {String} type ID of the message being sent.
 * @param {Array} args List of arguments for the message.
 *
 * @returns Result value.
 */
function sendPopupMessage(popup, type, args) {
  return popup.onMessage({data: {
    type: type,
    args: args
  }});
}

/**
 * Wait till all specified events are fired.
 *
 * @param {EventTarget} target The target object that fires events.
 * @param {Array} events List of events to wait for.
 *
 * @returns A promise that is resolved when all specified events are
 * fired.
 */
function waitForEvents(target, events) {
  let deferred = defer();
  let cache = new Set();

  let createListener = (eventId) => {
    return () => {
      cache.delete(eventId);
      if (cache.size == 0) {
        deferred.resolve();
      }
    }
  }

  events.forEach(type => {
    cache.add(type);
    once(target, type, createListener(type));
  });

  return deferred.promise;
}

/**
 * Helper function that copies logo PNG file from the XPI package into
 * a temporary file, so it can be used for a new layer addition.
 *
 * @param chromeUrl Chrome URL of the PNG file inside the XPI package.
 * @param targetFile Target temporary file to copy image data in to.
 */
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

// Panel Content API

function exist(popup, selector) {
  let frame = popup.panelFrame;
  let data = { selector: selector }
  return postContentRequest(frame, "exist", data);
}

function click(popup, selector) {
  let frame = popup.panelFrame;
  let data = { selector: selector }
  return postContentRequest(frame, "click", data);
}

/**
 * Send message to the popup panel content scope (iframe). The communication
 * between the test scope (chrome) and the panel frame scope (content) is
 * done through a message manager in a form: request -> response.
 *
 * xxxHonza: support queuing of requests.
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
exports.addNewLayer = addNewLayer;
exports.sendPopupMessage = sendPopupMessage;
exports.waitForEvents = waitForEvents;
exports.removeLayer = removeLayer;
