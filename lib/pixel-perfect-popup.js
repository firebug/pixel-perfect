/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Content } = require("./sdk/core/content.js");
const { on, once } = require("sdk/dom/events");
const { PixelPerfectStore } = require("./pixel-perfect-store");
const { defer, resolve } = require("sdk/core/promise");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * TODO docs:
 */
const PixelPerfectPopup = Class(
/** @lends PixelPerfectPopup */
{
  // Initialization

  initialize: function(styleEditorOverlay) {
    this.styleEditorOverlay = styleEditorOverlay;

    this.onPanelReady = this.onPanelReady.bind(this);
    this.onMessage = this.onMessage.bind(this);

    // Create data store
    this.store = new PixelPerfectStore();
  },

  destroy: function() {
  },

  // Implementation

  toggle: function() {
    this.show();
  },

  show: function() {
    let panelDoc = this.styleEditorOverlay.getPanelDocument();
    let button = panelDoc.getElementById("pixelPerfectShowPopup");

    this.attach();

    // Create panel with content iframe that implements the entire UI.
    // The iframe uses type='content' and so, it's content has limited
    // (content) privileges. The communication with the content is done
    // through message managers.
    let panel = this.createContent();
    panel.sizeTo(400, 230);
    panel.openPopup(button, "after_start", 0, 0, false, false);

    Trace.sysout("PixelPerfectPopup.show;", this.panel);
  },

  hide: function() {
    this.detach();
  },

  createContent: function() {
    let browser = getMostRecentBrowserWindow();
    let doc = browser.document;

    // xxxHonza: can we use SDK Panel with a title bar?
    // xxxHonza: localization
    this.panel = doc.createElementNS(XUL_NS, "panel");
    this.panel.setAttribute("id", "pixel-perfect-panel");
    this.panel.setAttribute("noautohide", "true");
    this.panel.setAttribute("titlebar", "normal");
    this.panel.setAttribute("label", "Pixel Perfect");
    this.panel.setAttribute("close", "true");
    this.panel.style.border = "0";

    this.panelFrame = doc.createElementNS(XUL_NS, "iframe");
    this.panelFrame.setAttribute("type", "content");
    this.panelFrame.setAttribute("border", "0");
    this.panelFrame.setAttribute("flex", "1");
    this.panelFrame.setAttribute("src", self.data.url("./popup.html"));
    this.panel.appendChild(this.panelFrame);

    let container = doc.getElementById("mainPopupSet");
    container.appendChild(this.panel);

    // Load content script and handle messages sent from it.
    let { messageManager } = this.panelFrame.frameLoader;
    if (messageManager) {
      let url = self.data.url("frame-script.js");
      messageManager.loadFrameScript(url, false);
      messageManager.addMessageListener("message", this.onMessage);
      messageManager.addMessageListener("sdk/event/ready", this.onPanelReady);
    }

    return this.panel;
  },

  onPanelReady: makeInfallible(function() {
    Trace.sysout("PixelPerfectPopup.onPanelReady;", arguments);

    let win = this.panelFrame.contentWindow;
    let ContentTrace = {
      sysout: () => FBTrace.sysout.apply(FBTrace, arguments)
    }

    Content.exportIntoContentScope(win, ContentTrace, "Trace");
  }),

  // Communication Channel (content <-> chrome)

  onMessage: function(msg) {
    Trace.sysout("PixelPerfectPopup.onMessage; (from panel content)", msg);

    let event = msg.data;

    switch (event.type) {
    case "panel-ready":
      // Just send back initial 'refresh' message.
      break;
    case "add":
    case "remove":
    case "modify":
      // Execute specified method.
      this.store[event.type].apply(this.store, event.args);
      break;
    }

    // Make sure the panel content is refreshed.
    this.postMessage("refresh", this.store.getJSON());
  },

  postMessage: function(id, data) {
    let { messageManager } = this.panelFrame.frameLoader;
    messageManager.sendAsyncMessage("pixelperfect/event/message", {
      type: id,
      bubbles: false,
      cancelable: false,
      data: data,
      origin: this.url,
    });
  },

  // Backend

  attach: function() {
    // Register backend actors.
    this.styleEditorOverlay.attachOverlayActor().then(front => {
      Trace.sysout("PixelPerfectPopup.attach; actor front ready", front);

      this.store.forEachOverlay(overlay => {
        let options = cloneOverlay(overlay);
        this.getOverlayImageData(options).then(result => {
          options.url = result.data;
          front.addImage(options).then(response => {
            Trace.sysout("PixelPerfectPopup.addImage; DONE", response);
          });
        });
      })
    });
  },

  detach: function() {
    this.styleEditorOverlay.detachOverlayActor().then(response => {
      Trace.sysout("PixelPerfectPopup.detach;", response);
    })
  },

  getOverlayImageData: makeInfallible(function(options) {
    if (options.url.startsWith("data:")) {
      return resolve(options.url);
    }

    let deferred = defer();
    let win = this.panelFrame.contentWindow;
    let img = new win.Image();

    img.onload = () => {
      try {
        let imageData = imageToImageData(img);
        deferred.resolve(imageData);
      } catch (e) {
        deferred.reject(null);
      }
    }

    // If the URL doesn't point to a resource, reject
    img.onerror = () => {
      deferred.reject(null);
    }

    img.src = options.url;

    return deferred.promise;
  })
});

// Helpers

function cloneOverlay(overlay) {
  let result = {};
  for (let p in overlay) {
    result[p] = overlay[p];
  }
  return result;
}

/**
 * xxxHonza: TODO docs
 */
var imageToImageData = makeInfallible(node => {
  // Get the image resize ratio if a maxDim was provided
  let resizeRatio = 1;
  let imgWidth = node.naturalWidth || node.width;
  let imgHeight = node.naturalHeight || node.height;
  let imgMax = Math.max(imgWidth, imgHeight);

  // Extract the image data
  let imageData;

  // The image may already be a data-uri, in which case, save ourselves the
  // trouble of converting via the canvas.drawImage.toDataURL method
  if (node.src.startsWith("data:")) {
    imageData = node.src;
  } else {
    // Create a canvas to copy the rawNode into and get the imageData from
    let canvas = node.ownerDocument.createElementNS(XHTML_NS, "canvas");
    canvas.width = imgWidth * resizeRatio;
    canvas.height = imgHeight * resizeRatio;
    let ctx = canvas.getContext("2d");

    // Copy the rawNode image or canvas in the new canvas and extract data
    ctx.drawImage(node, 0, 0, canvas.width, canvas.height);
    imageData = canvas.toDataURL("image/png");
  }

  return {
    data: imageData,
    size: {
      naturalWidth: imgWidth,
      naturalHeight: imgHeight,
      resized: resizeRatio !== 1
    }
  }
})

// Exports from this module
exports.PixelPerfectPopup = PixelPerfectPopup;
