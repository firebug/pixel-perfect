/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");
const options = require("@loader/options");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Content } = require("./sdk/core/content.js");
const { on, off, emit } = require("sdk/event/core");
const DomEvents = require("sdk/dom/events");
const { PixelPerfectStore } = require("./pixel-perfect-store");
const { Locale } = require("./sdk/core/locale.js");
const { openTab } = require("sdk/tabs/utils");
const { defer, resolve } = require("sdk/core/promise");
const { PixelPerfectFront } = require("./pixel-perfect-front.js");
const { Rdp } = require("./sdk/core/rdp.js");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// URL of the {@InspectorActor} module. This module will be
// installed and loaded on the backend.
const actorModuleUrl = options.prefixURI + "lib/pixel-perfect-actor.js";

/**
 * TODO docs:
 */
const PixelPerfectPopup = Class(
/** @lends PixelPerfectPopup */
{
  // Initialization

  initialize: function(toolbox) {
    this.toolbox = toolbox;

    this.onPanelReady = this.onPanelReady.bind(this);
    this.onMessage = this.onMessage.bind(this);

    // Create data store.
    this.store = new PixelPerfectStore();

    this.onAddOverlay = this.onAddOverlay.bind(this);
    this.onRemoveOverlay = this.onRemoveOverlay.bind(this);
    this.onModifyOverlay = this.onModifyOverlay.bind(this);

    // Listen to data store changes.
    on(this.store, "add", this.onAddOverlay);
    on(this.store, "remove", this.onRemoveOverlay);
    on(this.store, "modify", this.onModifyOverlay);

    // Panel event handlers
    this.onPopupHidden = this.onPopupHidden.bind(this);
    this.onPopupShown = this.onPopupShown.bind(this);

    // Actor drag & drop events
    this.onDragStart = this.onDragStart.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
  },

  destroy: function() {
    if (this.registrar) {
      this.registrar.unregister();
    }
  },

  // Visibility

  toggle: function() {
    if (this.isOpen()) {
      this.hide();
    } else {
      this.show();
    }
  },

  isOpen: function() {
    return (this.panel && this.panel.state == "open");
  },

  show: function() {
    let browser = getMostRecentBrowserWindow();
    let doc = browser.document;
    let button = doc.getElementById("pixel-perfect-start-button");

    // Attach backend actors.
    this.attach();

    // Create panel with content iframe that implements the entire UI.
    // The iframe uses type='content' and so, it's content has limited
    // (content) privileges. The communication with the content is done
    // through message managers.
    if (!this.panel) {
      this.createPanel();
    }

    // For debugging purposes. Reload the frame so, changes are
    // applied immediately, no browser restart needed.
    // if (this.panelFrame && this.panelFrame.contentDocument) {
    //   this.panelFrame.contentDocument.location.reload();
    // }

    if (this.position) {
      this.panel.openPopupAtScreen(this.position.x, this.position.y);
    } else {
      this.panel.sizeTo(400, 230);
      this.panel.openPopup(button, "after_start");
    }

    Trace.sysout("PixelPerfectPopup.show;", this.panel);
  },

  hide: function() {
    if (this.panel) {
      this.panel.hidePopup();
    }
  },

  // Popup Panel Content

  createPanel: function() {
    let browser = getMostRecentBrowserWindow();
    let doc = browser.document;

    this.panel = doc.createElementNS(XUL_NS, "panel");
    this.panel.setAttribute("id", "pixel-perfect-panel");
    this.panel.setAttribute("noautohide", "true");
    this.panel.setAttribute("titlebar", "normal");
    this.panel.setAttribute("noautofocus", "true");
    this.panel.setAttribute("label", Locale.$STR("pixelPerfect.title"));
    this.panel.setAttribute("close", "true");
    this.panel.style.border = "0";

    this.panelFrame = doc.createElementNS(XUL_NS, "iframe");
    this.panelFrame.setAttribute("type", "content");
    this.panelFrame.setAttribute("border", "0");
    this.panelFrame.setAttribute("flex", "1");

    // xxxHonza: unregister listeners?
    DomEvents.on(this.panel, "popuphidden", this.onPopupHidden);
    DomEvents.on(this.panel, "popupshown", this.onPopupShown);

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
    Content.exportIntoContentScope(win, Locale, "Locale");
  }),

  // Popup Panel Event Handlers

  onPopupShown: function(event) {
    Trace.sysout("PixelPerfectPopup.onPanelShown;", arguments);

    emit(this, "popupshown");
  },

  onPopupHidden: function(event) {
    Trace.sysout("PixelPerfectPopup.onPanelHidden;", this.panel);

    // Store position of the panel on the screen.
    this.position = {
      x: this.panel.boxObject.screenX,
      y: this.panel.boxObject.screenY
    };

    // Detach from the backend
    this.detach();

    emit(this, "popuphidden");
  },

  // Communication: content <-> chrome

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
    case "open-tab":
      this.openNewTab.apply(this, event.args);
      break;
    }

    let message = {
      version: self.version,
      overlays: this.store.overlays
    };

    // Make sure the panel content is refreshed.
    this.postContentMessage("refresh", JSON.stringify(message));
  },

  openNewTab: function(url) {
    let browser = getMostRecentBrowserWindow();
    openTab(browser, url);
  },

  postContentMessage: function(id, data) {
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
    if (this.front) {
      return resolve(this.front);
    }

    // Inspector actor registration options.
    let config = {
      prefix: PixelPerfectFront.prototype.typeName,
      actorClass: "PixelPerfectActor",
      frontClass: PixelPerfectFront,
      moduleUrl: actorModuleUrl
    };

    let deferred = defer();
    let client = this.toolbox.target.client;

    // Register as tab actor.
    let tab = Rdp.registerTabActor(client, config).
      then(({registrar, front}) => {
        Trace.sysout("PixelPerfectPopup.attach; READY", front);

        this.registrar = registrar;
        this.front = front;

        on(this.front, "dragstart", this.onDragStart);
        on(this.front, "drag", this.onDrag);
        on(this.front, "dragend", this.onDragEnd);

        // Send overlays to the backend. Image URLs are converted into
        // data URIs and sent through the RDP as text data. Note that
        // the backend can be a remote device where local file:// URLs
        // wouldn't work.
        this.store.forEachOverlay(overlay => {
          this.onAddOverlay(overlay);
        })

        deferred.resolve(front);
    });

    return deferred.promise;
  },

  detach: function() {
    if (!this.front) {
      return resolve();
    }

    off(this.front, "dragstart", this.onDragStart);
    off(this.front, "drag", this.onDrag);
    off(this.front, "dragend", this.onDragEnd);

    let deferred = defer();
    this.front.detach().then(response => {
      Trace.sysout("PixelPerfectPopup.detach; DONE", response);
      deferred.resolve(response);
    });

    this.front = null;

    return deferred.promise;
  },

  // Actor drag & drop events

  onDragStart: function(data) {
    let message = { selection: data.id };
    this.postContentMessage("refresh", JSON.stringify(message));
  },

  onDrag: function(data) {
    // Update the store and panel content (do not update the backend).
    this.store.modify(data.id, {x: data.x, y: data.y});
    let message = { overlays: this.store.overlays };
    this.postContentMessage("refresh", JSON.stringify(message));
  },

  onDragEnd: function(data) {
    let message = { overlays: this.store.overlays };
    this.postContentMessage("refresh", JSON.stringify(message));
  },

  // Overlay Store Handlers

  onAddOverlay: function(overlay) {
    this.store.getOverlayImageData(overlay.id).then(result => {
      overlay = this.store.cloneOverlay(overlay);
      overlay.url = result.data;
      this.front.addOverlay(overlay);
    });
  },

  onRemoveOverlay: function(id) {
    this.front.removeOverlay(id);
  },

  onModifyOverlay: function(id, props) {
    if (this.doNotUpdateBackend) {
      return;
    }

    this.front.modifyOverlay(id, props);
  },
});

// Exports from this module
exports.PixelPerfectPopup = PixelPerfectPopup;
