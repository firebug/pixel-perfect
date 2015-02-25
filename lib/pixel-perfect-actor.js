/* See license.txt for terms of usage */

"use strict";

const { Cc, Ci, Cu } = require("chrome");

// Remote Debugging Protocol API
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor, Arg } = protocol;
const Events = require("sdk/event/core");
const DomEvents = require("sdk/dom/events");
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Backend helpers
// xxxHonza: do not hard-code the URL
const baseUrl = "resource://pixelperfect-at-getfirebug-dot-com/";
const { expectState, getTrace } = Cu.import(baseUrl + "lib/sdk/core/actor.js");
const Trace = getTrace();

const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

// Constants
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const STYLESHEET = "chrome://pixelperfect/skin/ua.css";

/**
 * @actor TODO docs
 */
var PixelPerfectActor = ActorClass(
/** @lends PixelPerfectActor */
{
  typeName: "pixelPerfectActor",

  // Initialization

  initialize: function(conn, parent) {
    Trace.sysout("PixelPerfectActor.initialize; parent: " +
      parent.actorID + ", conn: " + conn.prefix, this);

    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    this.state = "detached";
    this.overlays = new Map();

    // Overlays (anonymous canvas content) need to be recreated when
    // page navigation happens.
    this.onNavigate = this.onNavigate.bind(this);

    // Event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseClick = this.onMouseClick.bind(this);
  },

  /**
   * The destroy is only called automatically by the framework (parent actor)
   * if an actor is instantiated by a parent actor.
   */
  destroy: function() {
    Trace.sysout("PixelPerfectActor.destroy; state: " + this.state, arguments);

    if (this.state === "attached") {
      this.detach();
    }

    Actor.prototype.destroy.call(this);
  },

  /**
   * Automatically executed by the framework when the parent connection
   * is closed.
   */
  disconnect: function() {
    Trace.sysout("PixelPerfectActor.disconnect; state: " + this.state, arguments);

    if (this.state === "attached") {
      this.detach();
    }
  },

  /**
   * Attach to this actor. Executed when the front (client) is attaching
   * to this actor.
   */
  attach: method(expectState("detached", function() {
    Trace.sysout("PixelPerfectActor.attach;", arguments);

    this.state = "attached";

    Events.on(this.parent, "navigate", this.onNavigate);

    this.buildAnonumousContent();
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),

  /**
   * Detach from this actor. Executed when the front (client) detaches
   * from this actor.
   */
  detach: method(expectState("attached", function() {
    Trace.sysout("PixelPerfectActor.detach;", arguments);

    this.state = "detached";
    this.destroyOverlays();

    Events.off(this.parent, "navigate", this.onNavigate);
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  // Actor API

  addOverlay: method(function(overlay) {
    Trace.sysout("PixelPerfectActor.addOverlay; " + overlay.id, overlay);

    this.overlays.set(overlay.id, overlay);
    this.buildOverlay(overlay);
  }, {
    request: {
      overlay: Arg(0, "json")
    },
    response: {
      type: "overlay-added"
    }
  }),

  removeOverlay: method(function(id) {
    Trace.sysout("PixelPerfectActor.removeOverlay; " + id);

    let overlay = this.overlays.get(id);
    this.destroyOverlay(overlay);
    this.overlays.delete(id);
  }, {
    request: {
      id: Arg(0, "string")
    },
    response: {
      type: "overlay-removed"
    }
  }),

  modifyOverlay: method(function(id, props) {
    let overlay = this.overlays.get(id);
    for (let p in props) {
      overlay[p] = props[p];
    }
    this.updateOverlay(overlay);
  }, {
    request: {
      id: Arg(0, "string"),
      props: Arg(1, "json")
    },
    response: {
      type: "overlay-modified"
    }
  }),

  // Events

  onNavigate: function({isTopLevel}) {
    if (!isTopLevel) {
      return;
    }

    // Only rebuild the image if the window type changed.
    if (isXUL(this.parent) !== this.isPreviousWindowXUL) {
      this.isPreviousWindowXUL = isXUL(this.parent);
      this.buildAnonumousContent();
    }
  },

  // Anonymous Content Builders (canvas frame)

  buildAnonumousContent: function() {
    let win = this.parent.window;
    let doc = win.document;

    // For now css is injected in content as a ua sheet because
    // <style scoped> doesn't work inside anonymous content (see bug 1086532).
    // See also: CanvasFrameAnonymousContentHelper
    // xxxHonza: the source must be fetched from the client.
    let source = getResource(STYLESHEET);
    installHelperSheet(win, source);

    // Build all registered overlays.
    this.buildOverlays();

    // Register event listeners
    // xxxHonza: Use CanvasFrameAnonymousContentHelper object as soon as
    // it's exposed for extensions.
    // xxxHonza: remove listeners
    DomEvents.on(doc, "mousedown", this.onMouseDown);
    DomEvents.on(doc, "mousemove", this.onMouseMove);
    DomEvents.on(doc, "mouseup", this.onMouseUp);
    DomEvents.on(doc, "click", this.onMouseClick);
  },

  buildOverlays: makeInfallible(function() {
    this.overlays.forEach(overlay => {
      this.buildOverlay(overlay);
    });
  }),

  destroyOverlays: makeInfallible(function() {
    this.overlays.forEach(overlay => {
      this.destroyOverlay(overlay);
    });
    this.overlays = new Map();
  }),

  buildOverlay: makeInfallible(function(overlay) {
    let doc = this.parent.window.document;

    let container = doc.createElement("div");
    let imageNode = doc.createElement("img");
    imageNode.src = overlay.url;
    imageNode.setAttribute("id", overlay.id);
    imageNode.setAttribute("class", "pixelperfect-overlay-image");
    container.appendChild(imageNode);

    overlay.content = doc.insertAnonymousContent(container);

    Trace.sysout("overlay.content", overlay.content);

    this.updateOverlay(overlay);
  }),

  updateOverlay: makeInfallible(function(overlay) {
    let content = overlay.content;
    if (!content) {
      this.buildOverlay(overlay);
      return;
    }

    let styleStr = "";
    styleStr += "position: absolute;";
    styleStr += "cursor: grab;";
    styleStr += "opacity: " + (parseInt(overlay.opacity, 10) / 100) + ";";
    styleStr += "left: " + parseInt(overlay.x, 10) + "px;";
    styleStr += "top: " + parseInt(overlay.y, 10) + "px;";
    styleStr += "display: " + (overlay.visible ? "block" : "none") + ";";
    styleStr += "transform: " + (overlay.scale ? "scale(" + overlay.scale + ")" : "none") + ";";

    content.setAttributeForElement(overlay.id, "style", styleStr);
  }),

  destroyOverlay: function(overlay) {
    if (overlay.content) {
      let doc = this.parent.window.document;
      doc.removeAnonymousContent(overlay.content);
    }
  },

  // Mouse Event Handlers (for drag and drop)

  onMouseDown: function(event) {
    let target = event.originalTarget;
    let overlay = this.overlays.get(target.id);
    if (!overlay) {
      return;
    }

    if (overlay.lock) {
      return;
    }

    this.draggedOverlay = overlay;
    this.offsetX = event.pageX - overlay.x;
    this.offsetY = event.pageY - overlay.y;

    cancelEvent(event);
  },

  onMouseMove: function(event) {
    if (!this.draggedOverlay) {
      return;
    }

    this.draggedOverlay.x = event.pageX - this.offsetX;
    this.draggedOverlay.y = event.pageY - this.offsetY;

    this.updateOverlay(this.draggedOverlay);

    cancelEvent(event);
  },

  onMouseUp: function(event) {
    if (!this.draggedOverlay) {
      return;
    }

    this.updateOverlay(this.draggedOverlay);
    this.draggedOverlay = null;

    cancelEvent(event);
  },

  onMouseClick: function(event) {
    if (this.draggedOverlay) {
      cancelEvent(event);
    }
  },
});

// Helpers

function isXUL(tabActor) {
  return tabActor.window.document.documentElement.namespaceURI === XUL_NS;
}

/**
 * Inject a helper stylesheet in the window.
 */
let installedHelperSheets = new WeakMap;
function installHelperSheet(win, source, type="agent") {
  if (installedHelperSheets.has(win.document)) {
    return;
  }
  let {Style} = require("sdk/stylesheet/style");
  let {attach} = require("sdk/content/mod");
  let style = Style({source, type});
  attach(style, win);
  installedHelperSheets.set(win.document, style);
}

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

function cancelEvent(event) {
  event.stopPropagation();
  event.preventDefault();
}

// Exports from this module
exports.PixelPerfectActor = PixelPerfectActor;
