/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

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

    let panelDoc = this.styleEditorOverlay.getPanelDocument();
    let button = panelDoc.getElementById("pixelPerfectShowPopup");

    this.panel.sizeTo(400, 200);
    this.panel.openPopup(button, "after_start", 0, 0, false, false);

    FBTrace.sysout("PixelPerfectPopup.show;", this.panel);
  },
});

// Exports from this module
exports.PixelPerfectPopup = PixelPerfectPopup;
