/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "stable"
};

const self = require("sdk/self");
const options = require("@loader/options");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Content } = require("firebug.sdk/lib/core/content.js");
const { on, off, emit } = require("sdk/event/core");
const { PixelPerfectStore } = require("./pixel-perfect-store");
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { openTab } = require("sdk/tabs/utils");
const { defer, resolve, all } = require("sdk/core/promise");
const { PixelPerfectFront } = require("./pixel-perfect-front.js");
const { Rdp } = require("firebug.sdk/lib/core/rdp.js");
const { Xul } = require("firebug.sdk/lib/core/xul.js");
const { Win } = require("firebug.sdk/lib/core/window.js");
const { Http } = require("firebug.sdk/lib/core/http.js");

// DevTools
const { devtools, makeInfallible } = require("firebug.sdk/lib/core/devtools.js");

// Platform Services
const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

// Constants
const STYLESHEET = "chrome://pixelperfect/skin/ua.css";
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// URL of the {@PixelPerfectActor} module. This module will be
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

  initialize: function(overlay) {
    this.overlay = overlay;
    this.toolbox = overlay.toolbox;

    this.onPanelReady = this.onPanelReady.bind(this);
    this.onMessage = this.onMessage.bind(this);

    // Create data store.
    // xxxHonza: the data store instance should be shared across contexts
    this.store = new PixelPerfectStore();

    this.onAddLayer = this.onAddLayer.bind(this);
    this.onRemoveLayer = this.onRemoveLayer.bind(this);
    this.onModifyLayer = this.onModifyLayer.bind(this);
    this.onMoveLayer = this.onMoveLayer.bind(this);

    // Listen to data store changes.
    on(this.store, "add", this.onAddLayer);
    on(this.store, "remove", this.onRemoveLayer);
    on(this.store, "modify", this.onModifyLayer);
    on(this.store, "move", this.onMoveLayer);

    // Panel event handlers
    this.onPopupHidden = this.onPopupHidden.bind(this);
    this.onPopupShown = this.onPopupShown.bind(this);

    // Actor drag & drop events
    this.onDragStart = this.onDragStart.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);

    // Register tab event handlers.
    this.onTabSelect = this.onTabSelect.bind(this);
    let tabBrowser = this.toolbox.target.tab.parentNode.tabbrowser;
    let tabContainer = tabBrowser.tabContainer;
    tabContainer.addEventListener("TabSelect", this.onTabSelect, false);
  },

  destroy: function() {
    if (!this.panel) {
      return resolve();
    }

    off(this.store, "add", this.onAddLayer);
    off(this.store, "remove", this.onRemoveLayer);
    off(this.store, "modify", this.onModifyLayer);
    off(this.store, "move", this.onMoveLayer);

    this.store.destroy();
    this.panel.remove();
    this.panel = null;

    let tabBrowser = this.toolbox.target.tab.parentNode.tabbrowser;
    let tabContainer = tabBrowser.tabContainer;
    tabContainer.removeEventListener("TabSelect", this.onTabSelect, false);

    // Detach is asynchronous (involves RDP), so returns a promise.
    return this.detach();
  },

  // Visibility

  toggle: function() {
    if (this.isOpen()) {
      return this.hide();
    } else {
      return this.show();
    }
  },

  isOpen: function() {
    return (this.panel && this.panel.state == "open");
  },

  show: function() {
    let browser = getMostRecentBrowserWindow();
    let doc = browser.document;
    let button = doc.getElementById("pixel-perfect-start-button");

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

    return this.attach();
  },

  hide: function() {
    if (!this.panel) {
      return resolve();
    }

    try {
      this.justHidingPopup = true;
      this.panel.hidePopup();
    } catch(err) {
    } finally {
      this.justHidingPopup = false;
    }

    // Detach from the backend
    return this.detach();
  },

  // Popup Panel Content

  createPanel: function() {
    let browser = getMostRecentBrowserWindow();
    let doc = browser.document;

    // Definition of the new panel content layout. Part of the layout
    // is also a 'resizer' element that is located at the bottom right
    // corner. The resizer is used to change size of the popup panel.
    // Note that using type='window' for RESIZER breaks the resizing
    // on OS X (resizer not available).
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
              RESIZER({"dir": "bottomend", /*"type": "window",*/
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

    this.panel.addEventListener("popuphidden", this.onPopupHidden);
    this.panel.addEventListener("popupshown", this.onPopupShown);

    // Load content script and handle messages sent from it.
    let { messageManager } = this.panelFrame.frameLoader;
    if (messageManager) {
      let url = self.data.url("popup-frame-script.js");
      messageManager.loadFrameScript(url, false);
      messageManager.addMessageListener("message", this.onMessage);
    }

    // Wait till the frame's content is loaded.
    // Doesn't properly export Locale and Trace API in some cases.
    // Perhaps it's too soon? See 'panel-ready' event sent from
    // the content instead.
    // DomEvents.once(this.panelFrame, "DOMContentLoaded",
    //   this.onPanelReady.bind(this));

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

  /**
   * Executed when 'TabSelect' event is fired (when a browser tab
   * is selected). This method ensures that Pixel Perfect popups
   * that are associated with background tabs are hidden.
   * This logic avoids too many popups on the screen.
   */
  onTabSelect: function(event) {
    let selectedTab = event.target;
    let currentTab = this.toolbox.target.tab;

    if (currentTab == selectedTab) {
      this.panel.removeAttribute("style");
      this.panel.style.border = "0";
      this.panel.openPopupAtScreen(this.position.x, this.position.y);
    } else {
      this.storePosition();
      this.panel.setAttribute("style", "display: none;");
    }
  },

  // Popup Panel Event Handlers

  onPopupShown: function(event) {
    Trace.sysout("PixelPerfectPopup.onPanelShown;", arguments);

    emit(this, "popupshown");
  },

  onPopupHidden: function(event) {
    Trace.sysout("PixelPerfectPopup.onPanelHidden;", this.panel);

    if (this.panel) {
      try {
        this.panel.removeListener("popuphidden", this.onPopupHidden);
        this.panel.removeListener("popupshown", this.onPopupShown);
      } catch (err) {
        Cu.reportError(err);
      }
    }

    // Store position of the panel on the screen.
    this.storePosition();

    // Detach from the backend if the popup panel is hidden. The detach
    // is called in the hide() method, so this detach will bail out on
    // this.front being already set to null. But, if the user presses
    // the popup close button, hide is not executed and we need to make
    // sure it's detached from the backend.
    // Tests should always use popup.destroy() and wait for the returned
    // promise being resolved to do proper clean up.

    // xxxHonza: there should be this._destroyer promise (just like
    // in toolbox.js), so this.detach() returns the same promise
    // (if executed more than once) that is being resolved at the
    // right time.

    // 'onPopupHidden' is called when the user clicks the red
    // cross button (top right corner on the popup panel) or
    // when it's toggled by the start button to be hidden.
    // The later sets a flag, so we can identify that case and
    // just detach it from the backend.
    // However it's not enough for the first case since the panel would
    // automatically re-appear when the user select another
    // browser tab and then goes back.
    // See also: https://github.com/firebug/pixel-perfect/issues/69
    if (this.justHidingPopup) {
      this.detach();
    } else {
      this.overlay.destroyPopup();
    }

    // xxxHonza: do we need this?
    emit(this, "popuphidden");
  },

  storePosition: function() {
    if (!this.panel) {
      return;
    }

    this.position = {
      x: this.panel.boxObject.screenX,
      y: this.panel.boxObject.screenY - 21
    };
  },

  // Communication: content <-> chrome

  /**
   * Handle messages coming from the content scope (from panel's iframe).
   */
  onMessage: function(msg) {
    Trace.sysout("PixelPerfectPopup.onMessage; (from panel content)", msg);

    let result;
    let event = msg.data;

    switch (event.type) {
    case "panel-refreshed":
      // The panel has been refreshed, just emit the event further
      // to other listeners.
      emit(this, "panel-refreshed");
      return;

    case "panel-ready":
      this.onPanelReady();
      // Do not return now and send back initial 'refresh' message.
      break;

    case "add":
    case "remove":
    case "modify":
    case "move":
      // Execute specified method.
      result = this.store[event.type].apply(this.store, event.args);
      break;

    case "open-homepage":
      // Open a new tab with the home page.
      // Refresh isn't needed, so bail out.
      Win.openNewTab(options.manifest.homepage);
      return;
    }

    // Refresh panel UI (frame content).
    this.refreshPopupContent();

    return result;
  },

  /**
   * Send message to the content scope (panel's iframe)
   */
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

  refreshPopupContent: function() {
    let message = {
      version: self.version,
      layers: this.store.layers
    };

    // Make sure the panel content is refreshed.
    this.postContentMessage("refresh", JSON.stringify(message));
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
        this.front.on("dragstart", this.onDragStart);
        this.front.on("drag", this.onDrag);
        this.front.on("dragend", this.onDragEnd);

        // Load user agent stylesheet for anonymous content.
        let source = Http.getResource(STYLESHEET);
        this.front.loadSheet(source);

        let promises = [];

        // Send layers to the backend. Image URLs are converted into
        // data URIs and sent through the RDP as text data. Note that
        // the backend can be a remote device where local file:// URLs
        // wouldn't work.
        this.store.forEachLayer(layer => {
          promises.push(this.onAddLayer(layer));
        });

        // Wait till all layers are properly loaded on the backend.
        all(promises).then(() => {
          emit(this, "attached", front);
          deferred.resolve(front);
        });
    });

    return deferred.promise;
  },

  detach: function() {
    if (!this.front) {
      return resolve();
    }

    this.front.off("dragstart", this.onDragStart);
    this.front.off("drag", this.onDrag);
    this.front.off("dragend", this.onDragEnd);

    let deferred = defer();
    this.front.detach().then(response => {
      Trace.sysout("PixelPerfectPopup.detach; DONE", response);

      emit(this, "detached", response);
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
    this.doNotUpdateBackend = true;

    try {
      // Update the store and panel content (do not update the backend).
      this.store.modify(data.id, {x: data.x, y: data.y});
      let message = { layers: this.store.layers };
      this.postContentMessage("refresh", JSON.stringify(message));
    } catch (err) {
      TraceError.sysout("PixelPerfect.onDrag; ERROR " + err, err);
    }

    this.doNotUpdateBackend = false;
  },

  onDragEnd: function(data) {
    let message = { layers: this.store.layers };
    this.postContentMessage("refresh", JSON.stringify(message));
  },

  // Layer Store Handlers

  onAddLayer: function(layer) {
    let deferred = defer();

    this.front.addLayer(layer).then(response => {
      emit(this, "layer-added", response);
      deferred.resolve(layer);
    });

    return deferred.promise;
  },

  onRemoveLayer: function(id) {
    return this.front.removeLayer(id).then(response => {
      emit(this, "layer-removed", response);
    });
  },

  onModifyLayer: function(id, props) {
    if (this.doNotUpdateBackend) {
      return resolve();
    }

    return this.front.modifyLayer(id, props).then(response => {
      emit(this, "layer-modified", response);
    });
  },

  onMoveLayer: function(from, to) {
    return this.front.moveLayer(from, to).then(response => {
      emit(this, "layer-moved", response);
    });
  },
});

// Exports from this module
exports.PixelPerfectPopup = PixelPerfectPopup;
