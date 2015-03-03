/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "stable"
};

const self = require("sdk/self");
const options = require("@loader/options");

const { Cu, Ci, Cc } = require("chrome");
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
const { Xul } = require("./sdk/core/xul.js");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Platform Services
const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

// Constants
const STYLESHEET = "chrome://pixelperfect/skin/ua.css";
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// URL of the {@InspectorActor} module. This module will be
// installed and loaded on the backend.
const actorModuleUrl = options.prefixURI + "lib/pixel-perfect-actor.js";

// Shortcuts
const { VBOX, HBOX, RESIZER, PANEL, IFRAME, STACK, SPACER } = Xul;

/**
 * This object represents the main Pixel Perfect UI. It's implemented
 * as a popup panel that allows creating new layers and modify their
 * properties. Content of the panel is rendered inside an <iframe>
 * with content that has limited privileges (no chrome access).
 *
 * The content frame itself uses ReactJS to render HTML UI and other
 * standard web technologies such as RequireJS for loading JS modules.
 * The communication between the frame and this object is done using
 * JSON messages sent through associated message manager.
 *
 * Summary of responsibilities:
 * 1. Create a popup panel with inner frame.
 * 2. Listening for messages coming from the frame (user actions)
 * 3. Sending messages the frame (update).
 * 4. Registering back-end actor and attach/detach to/from it.
 * 5. Listening to events coming from the actor (e.g. drag and drop events).
 * 6. Listening to events coming from the storage (to update the UI)
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
    // xxxHonza: the data store instance should be shared across contexts
    this.store = new PixelPerfectStore();

    this.onAddLayer = this.onAddLayer.bind(this);
    this.onRemoveLayer = this.onRemoveLayer.bind(this);
    this.onModifyLayer = this.onModifyLayer.bind(this);

    // Listen to data store changes.
    on(this.store, "add", this.onAddLayer);
    on(this.store, "remove", this.onRemoveLayer);
    on(this.store, "modify", this.onModifyLayer);

    // Panel event handlers
    this.onPopupHidden = this.onPopupHidden.bind(this);
    this.onPopupShown = this.onPopupShown.bind(this);

    // Actor drag & drop events
    this.onDragStart = this.onDragStart.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
  },

  destroy: function() {
    off(this.store, "add", this.onAddLayer);
    off(this.store, "remove", this.onRemoveLayer);
    off(this.store, "modify", this.onModifyLayer);

    this.panel.remove();
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
     if (this.panelFrame && this.panelFrame.contentDocument) {
       this.panelFrame.contentDocument.location.reload();
     }

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

    // Definition of the new panel content layout. Part of the layout
    // is also a 'resizer' element that is located at the bottom right
    // corner. The resizer is used to change size of the popup panel.
    let panel =
      PANEL({"id": "pixel-perfect-panel",
        "noautohide": "true", "titlebar": "normal", "close": "true",
        "noautofocus": "true", "label": Locale.$STR("pixelPerfect.title")},
        STACK({"flex": "1"},
          IFRAME({"type": "content", "border": "0", "flex": "1",
            "src": self.data.url("./popup.html")}),
          VBOX({"flex": "1", "style": "pointer-events: none;"},
            SPACER({"flex": "1"}),
            HBOX({"style": "max-height: 16px;"},
              SPACER({"flex": "1", "style": "background-color: transparent"}),
              RESIZER({"dir": "bottomend", "type": "window",
                "style": "background: url('" +
                "chrome://pixelperfect/skin/resizer.png') no-repeat; " +
                "pointer-events: auto;"})
            )
          )
        )
      );

    // Build the panel and its content.
    let container = doc.getElementById("mainPopupSet");
    this.panel = panel.build(container);
    this.panelFrame = this.panel.querySelector("iframe");

    this.panel.style.border = "0";

    DomEvents.on(this.panel, "popuphidden", this.onPopupHidden);
    DomEvents.on(this.panel, "popupshown", this.onPopupShown);

    // Load content script and handle messages sent from it.
    let { messageManager } = this.panelFrame.frameLoader;
    if (messageManager) {
      let url = self.data.url("popup-frame-script.js");
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
    case "open-homepage":
      this.openNewTab(options.manifest.homepage);
      break;
    }

    let message = {
      version: self.version,
      layers: this.store.layers
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

        this.front = front;

        // xxxHonza: unregister actor on shutdown/disable/uninstall
        // but not on toolbox close.
        this.registrar = registrar;

        // Drag-drop listener (events sent from the backend)
        on(this.front, "dragstart", this.onDragStart);
        on(this.front, "drag", this.onDrag);
        on(this.front, "dragend", this.onDragEnd);

        // Load user agent stylesheet for anonymous content.
        let source = getResource(STYLESHEET);
        this.front.loadSheet(source);

        // Send layers to the backend. Image URLs are converted into
        // data URIs and sent through the RDP as text data. Note that
        // the backend can be a remote device where local file:// URLs
        // wouldn't work.
        this.store.forEachLayer(layer => {
          this.onAddLayer(layer);
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
    let message = { layers: this.store.layers };
    this.postContentMessage("refresh", JSON.stringify(message));
  },

  onDragEnd: function(data) {
    let message = { layers: this.store.layers };
    this.postContentMessage("refresh", JSON.stringify(message));
  },

  // Layer Store Handlers

  onAddLayer: function(layer) {
    this.store.getImageDataURL(layer.id).then(result => {
      layer = this.store.cloneLayer(layer);
      layer.url = result.data;
      this.front.addLayer(layer);
    });
  },

  onRemoveLayer: function(id) {
    this.front.removeLayer(id);
  },

  onModifyLayer: function(id, props) {
    if (this.doNotUpdateBackend) {
      return;
    }

    this.front.modifyLayer(id, props);
  },
});

// Helpers

function getResource(aURL) {
  try {
    let channel = ioService.newChannel(aURL, null, null);
    let input = channel.open();
    return readFromStream(input);
  }
  catch (e) {
  }
}

function readFromStream(stream, charset) {
  let sis = Cc["@mozilla.org/scriptableinputstream;1"].
    createInstance(Ci.nsIScriptableInputStream);
  sis.init(stream);

  let segments = [];
  for (let count = stream.available(); count; count = stream.available()) {
    segments.push(sis.readBytes(count));
  }

  sis.close();

  return segments.join("");
};

// Exports from this module
exports.PixelPerfectPopup = PixelPerfectPopup;
