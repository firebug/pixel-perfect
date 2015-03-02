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
// xxxHonza: remove me, this module doesn't have to be available on the backend.
const baseUrl = "resource://pixelperfectplugin-at-openhouseconcepts-dot-com/";
const { expectState, getTrace } = Cu.import(baseUrl + "lib/sdk/core/actor.js");
const Trace = getTrace();

const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

// Constants
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const STYLESHEET = "chrome://pixelperfect/skin/ua.css";

/**
 * @actor This object represents an actor that is dynamically injected
 * (registered) to the debugged target (back-end). The debugged target
 * can be a running instance of the browser on local machine or remote
 * device such as mobile phone. THe communication with this object is
 * always done through RDP (Remote Debugging Protocol).
 *
 * This object implements the following logic that runs on that back-end:
 * 1. Rendering of registered layers on top of the current page
 * 2. Drag and drop of layers
 *
 * Note that layers are not inserted into the page. They exist inside
 * a 'Canvas Frame' that is overlapping the page to avoid page DOM
 * modification (can be dangerous). The Canvas Frame is supported
 * by the platform and originally used by HTML Inspector highlighter.
 */
var PixelPerfectActor = ActorClass(
/** @lends PixelPerfectActor */
{
  typeName: "pixelPerfectActor",

  /**
   * Events emitted by this actor.
   */
  events: {
    "dragstart": { data: Arg(0, "json") },
    "drag": { data: Arg(0, "json") },
    "dragend": { data: Arg(0, "json") }
  },

  // Initialization

  initialize: function(conn, parent) {
    Trace.sysout("PixelPerfectActor.initialize; parent: " +
      parent.actorID + ", conn: " + conn.prefix, this);

    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    this.state = "detached";
    this.layers = new Map();

    // Layers (displayed in anonymous canvas content) need to be recreated
    // when page navigation happens.
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
    this.destroyLayers();

    Events.off(this.parent, "navigate", this.onNavigate);
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  // Actor API

  addLayer: method(function(layer) {
    Trace.sysout("PixelPerfectActor.addLayer; " + layer.id, layer);

    this.layers.set(layer.id, layer);
    this.buildLayer(layer);
  }, {
    request: {
      layer: Arg(0, "json")
    },
    response: {
      type: "layer-added"
    }
  }),

  removeLayer: method(function(id) {
    Trace.sysout("PixelPerfectActor.removeLayer; " + id);

    let layer = this.layers.get(id);
    this.destroyLayer(layer);
    this.layers.delete(id);
  }, {
    request: {
      id: Arg(0, "string")
    },
    response: {
      type: "layer-removed"
    }
  }),

  modifyLayer: method(function(id, props) {
    let layer = this.layers.get(id);
    for (let p in props) {
      layer[p] = props[p];
    }
    this.updateLayer(layer);
  }, {
    request: {
      id: Arg(0, "string"),
      props: Arg(1, "json")
    },
    response: {
      type: "layer-modified"
    }
  }),

  // Events

  onNavigate: function({isTopLevel}) {
    Trace.sysout("onNavigate " + isTopLevel);
    if (isTopLevel) {
      this.buildAnonumousContent();
    }
  },

  // Anonymous Content Builders (canvas frame)

  buildAnonumousContent: function() {
    let win = this.parent.window;
    let doc = win.document;

    // For now css is injected in content as a user agent sheet because
    // <style scoped> doesn't work inside anonymous content (see bug 1086532).
    // See also: CanvasFrameAnonymousContentHelper
    // xxxHonza: the source must be fetched from the client.
    let source = getResource(STYLESHEET);
    installHelperSheet(win, source);

    // Build all registered layers.
    this.buildLayers();

    // Register event listeners
    // xxxHonza: Use CanvasFrameAnonymousContentHelper object as soon as
    // it's exposed for extensions.
    // xxxHonza: remove listeners
    DomEvents.on(doc, "mousedown", this.onMouseDown);
    DomEvents.on(doc, "mousemove", this.onMouseMove);
    DomEvents.on(doc, "mouseup", this.onMouseUp);
    DomEvents.on(doc, "click", this.onMouseClick);
  },

  buildLayers: makeInfallible(function() {
    this.layers.forEach(layer => {
      this.buildLayer(layer);
    });
  }),

  destroyLayers: makeInfallible(function() {
    this.layers.forEach(layer => {
      this.destroyLayer(layer);
    });
    this.layers = new Map();
  }),

  buildLayer: makeInfallible(function(layer) {
    let doc = this.parent.window.document;

    let container = doc.createElement("div");
    let imageNode = doc.createElement("img");
    imageNode.src = layer.url;
    imageNode.setAttribute("id", layer.id);
    imageNode.setAttribute("class", "pixelperfect-layer-image");
    container.appendChild(imageNode);

    layer.content = doc.insertAnonymousContent(container);

    this.updateLayer(layer);
  }),

  updateLayer: makeInfallible(function(layer) {
    let content = layer.content;
    if (!content) {
      this.buildLayer(layer);
      return;
    }

    let styleStr = "";
    styleStr += "opacity: " + (parseInt(layer.opacity, 10) / 100) + ";";
    styleStr += "left: " + parseInt(layer.x, 10) + "px;";
    styleStr += "top: " + parseInt(layer.y, 10) + "px;";
    styleStr += "display: " + (layer.visible ? "block" : "none") + ";";
    styleStr += "transform: " + (layer.scale ? "scale(" + layer.scale + ")" : "none") + ";";

    if (layer.lock) {
      content.setAttributeForElement(layer.id, "lock", "true");
    } else {
      content.removeAttributeForElement(layer.id, "lock");
    }

    content.setAttributeForElement(layer.id, "style", styleStr);
  }),

  destroyLayer: function(layer) {
    if (layer.content) {
      let doc = this.parent.window.document;
      doc.removeAnonymousContent(layer.content);
    }
  },

  // Mouse Event Handlers (for drag and drop)

  onMouseDown: function(event) {
    let target = event.originalTarget;
    let layer = this.layers.get(target.id);
    if (!layer) {
      return;
    }

    if (layer.lock) {
      return;
    }

    this.draggedLayer = layer;
    this.offsetX = event.pageX - layer.x;
    this.offsetY = event.pageY - layer.y;

    let content = this.draggedLayer.content;
    content.setAttributeForElement(this.draggedLayer.id, "drag", "true");

    Events.emit(this, "dragstart", {
      id: this.draggedLayer.id,
    });

    cancelEvent(event);
  },

  onMouseMove: function(event) {
    if (!this.draggedLayer) {
      return;
    }

    this.draggedLayer.x = event.pageX - this.offsetX;
    this.draggedLayer.y = event.pageY - this.offsetY;

    this.updateLayer(this.draggedLayer);

    Events.emit(this, "drag", {
      id: this.draggedLayer.id,
      x: this.draggedLayer.x,
      y: this.draggedLayer.y
    });

    cancelEvent(event);
  },

  onMouseUp: function(event) {
    if (!this.draggedLayer) {
      return;
    }

    this.updateLayer(this.draggedLayer);

    Events.emit(this, "dragend", {
      id: this.draggedLayer.id,
      x: this.draggedLayer.x,
      y: this.draggedLayer.y
    });

    let content = this.draggedLayer.content;
    content.removeAttributeForElement(this.draggedLayer.id, "drag");

    this.draggedLayer = null;

    cancelEvent(event);
  },

  onMouseClick: function(event) {
    if (this.draggedLayer) {
      cancelEvent(event);
    }
  },
});

// Helpers

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
