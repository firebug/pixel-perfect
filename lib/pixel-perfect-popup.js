/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Content } = require("./sdk/core/content.js");
const { on, once } = require("sdk/dom/events");

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
  },

  destroy: function() {
    
  },

  // Implementation

  toggle: function() {
    this.show();
  },

  show: function() {
    let browser = getMostRecentBrowserWindow();
    let doc = browser.document;

    // xxxHonza: can we use SDK Panel with a title bar?
    this.panel = doc.createElementNS(XUL_NS, "panel");
    this.panel.setAttribute("id", "pixel-perfect-panel");
    this.panel.setAttribute("noautohide", "true");
    this.panel.setAttribute("titlebar", "normal");
    this.panel.setAttribute("label", "Pixel Perfect");
    this.panel.setAttribute("close", "true");
    this.panel.style.border = "0";

    let frame = doc.createElementNS(XUL_NS, "iframe");
    frame.setAttribute("type", "content");
    frame.setAttribute("border", "0");
    frame.setAttribute("flex", "1");
    frame.setAttribute("src", self.data.url("./popup.html"));
    this.panel.appendChild(frame);

    let container = doc.getElementById("mainPopupSet");
    container.appendChild(this.panel);

    // Load content script and handle 'onSendMessage' sent from it.
    let { messageManager } = frame.frameLoader;
    if (messageManager) {
      let url = self.data.url("frame-script.js");
      messageManager.loadFrameScript(url, false);
      messageManager.addMessageListener("message", this.onMessage.bind(this));
      messageManager.addMessageListener("sdk/event/ready", this.onPanelReady.bind(this));
    }

    this.panelFrame = frame;

    let panelDoc = this.styleEditorOverlay.getPanelDocument();
    let button = panelDoc.getElementById("pixelPerfectShowPopup");

    this.panel.sizeTo(400, 200);
    this.panel.openPopup(button, "after_start", 0, 0, false, false);

    Trace.sysout("PixelPerfectPopup.show;", this.panel);
  },

  // Panel Events

  onPanelReady: function() {
    Trace.sysout("PixelPerfectPopup.onPanelReady;", arguments);

    let win = this.panelFrame.contentWindow;
    let ContentTrace = {
      sysout: () => FBTrace.sysout.apply(FBTrace, arguments)
    }

    Content.exportIntoContentScope(win, ContentTrace, "Trace");
  },

  // Communication Channel

  onMessage: function(msg) {
    Trace.sysout("basePanel.onMessage; (from panel content)", msg);

    let data = msg.data;
    switch (data.type) {
      case "add-overlay":
      break
    }
  },

  postCommand: function(id, data) {
    let { messageManager } = this.panelFrame.frameLoader;

    if (!messageManager) {
      Trace.sysout("basePanel.postCommand; No message manager! " + id,
        data);
      return;
    }

    Trace.sysout("basePanel.postCommand; " + id, data);

    messageManager.sendAsyncMessage("firebug/event/message", {
      type: id,
      bubbles: false,
      cancelable: false,
      data: data,
      origin: this.url,
    });
  },

});

// Exports from this module
exports.PixelPerfectPopup = PixelPerfectPopup;
