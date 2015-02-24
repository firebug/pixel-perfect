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

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

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
    this.styleEditorOverlay.attachActor().then(front => {
      Trace.sysout("PixelPerfectPopup.attach; actor front ready", front);

      // Send overlays to the backend
      this.store.forEachOverlay(overlay => {
        this.store.getOverlayImageData(overlay.id).then(result => {
          overlay = this.store.cloneOverlay(overlay);
          overlay.url = result.data;
          front.addOverlay(overlay).then(response => {
            Trace.sysout("PixelPerfectPopup.addImage; DONE", response);
          });
        });
      })
    });
  },

  detach: function() {
    this.styleEditorOverlay.detachActor().then(response => {
      Trace.sysout("PixelPerfectPopup.detach;", response);
    })
  },
});

// Exports from this module
exports.PixelPerfectPopup = PixelPerfectPopup;
