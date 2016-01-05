/* See license.txt for terms of usage */

"use strict";

/**
 * This module is loaded on the backend (can be a remote device) where
 * some module or features (such as Tracing console) don't have to
 * be available.
 */

const { Cu } = require("chrome");

// Add-on SDK
const Events = require("sdk/event/core");
const DomEvents = require("sdk/dom/events");
const { setTimeout, clearTimeout } = require("sdk/timers");

// Platform
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const currentBrowserVersion = Services.appinfo.platformVersion;

// DevTools
// See also: https://bugzilla.mozilla.org/show_bug.cgi?id=912121
var devtools;
try {
  devtools = Cu.import("resource://gre/modules/devtools/shared/Loader.jsm", {}).devtools;
} catch (err) {
  devtools = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools;
}

var DevToolsUtils;
try {
  DevToolsUtils = devtools["require"]("devtools/shared/DevToolsUtils");
} catch (err) {
  DevToolsUtils = devtools["require"]("devtools/toolkit/DevToolsUtils");
}

const { DebuggerServer } = devtools["require"]("devtools/server/main");
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor, Arg } = protocol;
const makeInfallible = DevToolsUtils.makeInfallible;

// For debugging purposes. Note that the tracing module isn't available
// on the backend (in case of remote device debugging).
// const baseUrl = "resource://pixelperfectplugin-at-openhouseconcepts-dot-com/";
// const { getTrace } = Cu.import(baseUrl + "node_modules/firebug.sdk/lib/core/actor.js");
// const Trace = getTrace();
const Trace = {sysout: () => {}};

/**
 * Helper actor state watcher.
 */
function expectState(expectedState, method) {
  return function(...args) {
    if (this.state !== expectedState) {
      Trace.sysout("actor.expectState; ERROR wrong state, expected '" +
        expectedState + "', but current state is '" + this.state + "'" +
        ", method: " + method);

      let msg = "Wrong State: Expected '" + expectedState + "', but current " +
        "state is '" + this.state + "'";

      return Promise.reject(new Error(msg));
    }

    try {
      return method.apply(this, args);
    } catch (err) {
      Cu.reportError("actor.js; expectState EXCEPTION " + err, err);
    }
  };
}

/**
 * @actor This object represents an actor that is dynamically injected
 * (registered) to the debuggee target (back-end). The debuggee target
 * can be a running instance of the browser on local machine or remote
 * device such as mobile phone. The communication with this object is
 * always done through RDP (Remote Debugging Protocol). Read more about
 * {@link https://wiki.mozilla.org/Remote_Debugging_Protocol|RDP}.
 *
 * This object implements the following logic that runs on that back-end:
 * 1. Rendering of registered layers on top of the current page
 * 2. Drag and drop of layers (changing location on the page). This user
 * operation fires events back to the chrome scope, so the UI (coordinates)
 * can be properly updated.
 *
 * Layers are not inserted into the page. They exist inside
 * a 'Canvas Frame' that is overlapping the page to avoid page DOM
 * modification (which can be dangerous). The Canvas Frame is supported
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
    this.layers = [];

    // Layers (displayed in anonymous canvas content) need to be recreated
    // when page navigation happens.
    this.onNavigate = this.onNavigate.bind(this);
    this.onWillNavigate = this.onWillNavigate.bind(this);

    // Event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseClick = this.onMouseClick.bind(this);
    this.onScroll = this.onScroll.bind(this);
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
    Events.on(this.parent, "will-navigate", this.onWillNavigate);
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),

  /**
   * Set UI stylesheet for anonymous content (sent from the client).
   */
  loadSheet: method(expectState("attached", function(source) {
    Trace.sysout("PixelPerfectActor.loadSheet;", arguments);

    this.uaSource = source;

    this.buildAnonumousContent();
  }), {
    request: {
      source: Arg(0, "string")
    },
    response: {
      type: "sheet-loaded"
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

    this.layers = [];

    // Remove tab actor listeners
    Events.off(this.parent, "navigate", this.onNavigate);
    Events.off(this.parent, "will-navigate", this.onWillNavigate);

    let win = this.parent.window;
    let doc = win.document;

    // Remove drag-drop listeners
    DomEvents.removeListener(doc, "mousedown", this.onMouseDown);
    DomEvents.removeListener(doc, "mousemove", this.onMouseMove);
    DomEvents.removeListener(doc, "mouseup", this.onMouseUp);
    DomEvents.removeListener(doc, "click", this.onMouseClick);
    DomEvents.removeListener(doc, "scroll", this.onScroll);
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  // Remote Actor API

  addLayer: method(function(layer) {
    Trace.sysout("PixelPerfectActor.addLayer; " + layer.id, layer);

    this.layers.push(layer);
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

    let layer = this.getLayer(id);
    this.destroyLayer(layer);

    for (let i=0; i<this.layers.length; i++) {
      if (this.layers[i].id == id) {
        this.layers.splice(i, 1);
        break;
      }
    }
  }, {
    request: {
      id: Arg(0, "string")
    },
    response: {
      type: "layer-removed"
    }
  }),

  modifyLayer: method(function(id, props) {
    let layer = this.getLayer(id);
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

  /**
   * Change layer order (affects also rendering order)
   */
  moveLayer: method(function(aFrom, aTo) {
    var removed = this.layers.splice(aFrom, 1)[0];
    this.layers.splice(aTo, 0, removed);

    // Rebuild layers
    this.destroyLayers();
    this.buildLayers();
  }, {
    request: {
      aFrom: Arg(0, "number"),
      aTo: Arg(1, "number")
    },
    response: {
      type: "layer-moved"
    }
  }),

  /**
   * Return properties of specified layer (including properties of the
   * associated anonymous content).
   */
  getLayerInfo: method(function(id) {
    let layer = this.getLayer(id);

    // Get all properties of a layer.
    let result = {};
    for (let p in layer) {
      result[p] = layer[p];
    }

    // Get all properties of associate anonymous content
    let boxAnonId = "box" + layer.id;
    let imageAnonId = layer.id;
    let content = layer.content;

    result.content = {
      box: {
        style: content.getAttributeForElement(boxAnonId, "style"),
        lock: content.getAttributeForElement(boxAnonId, "lock"),
        invert: content.getAttributeForElement(boxAnonId, "invert"),
      },
      image: {
        style: content.getAttributeForElement(imageAnonId, "style"),
      }
    }

    return result;
  }, {
    request: {
      id: Arg(0, "string"),
    },
    response: RetVal("json"),
  }),

  // Events

  /**
   * Page navigation handler. Layers need to be built again when
   * navigation happens.
   */
  onNavigate: function({isTopLevel}) {
    Trace.sysout("PixelPerfectActor.onNavigate " + isTopLevel);

    if (isTopLevel) {
      if (versionIsAtLeast(38)) {
        this.buildAnonumousContent();
        return;
      }

      // Reset all anonymous content built for the previous page.
      // Reset asynchronously to avoid browser crash in pre Firefox 38.
      // See also:
      // https://github.com/firebug/pixel-perfect/issues/61
      if (this.buildContentTimeout) {
        clearTimeout(this.buildContentTimeout);
      }

      this.buildContentTimeout = setTimeout(() => {
        this.buildAnonumousContent();
      }, 500);
    }
  },

  onWillNavigate: function({isTopLevel}) {
    Trace.sysout("PixelPerfectActor.onWillNavigate; " + isTopLevel);

    if (isTopLevel) {
      // Remove anonymous content created for this page.
      this.destroyLayers();
    }
  },

  // Anonymous Content Builders (canvas frame)

  buildAnonumousContent: function() {
    let win = this.parent.window;
    if (win.closed) {
      return;
    }

    let doc = win.document;

    // For now css is injected in content as a user agent sheet because
    // <style scoped> doesn't work inside anonymous content (see bug 1086532).
    // See also: CanvasFrameAnonymousContentHelper
    installHelperSheet(win, this.uaSource);

    // Build all registered layers.
    this.buildLayers();

    // Use CanvasFrameAnonymousContentHelper object as soon as
    // it's exposed for extensions.
    DomEvents.on(doc, "mousedown", this.onMouseDown);
    DomEvents.on(doc, "mousemove", this.onMouseMove);
    DomEvents.on(doc, "mouseup", this.onMouseUp);
    DomEvents.on(doc, "click", this.onMouseClick);
    DomEvents.on(doc, "scroll", this.onScroll);
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
  }),

  buildLayer: makeInfallible(function(layer) {
    // Bail out if the layer already has an anonymous content built.
    if (layer.content) {
      return;
    }

    let doc = this.parent.window.document;

    // Anonymous content.
    let content = doc.createElement("div");

    // Box for layer image.
    let imageBox = doc.createElement("div");
    imageBox.setAttribute("id", "box" + layer.id);
    imageBox.setAttribute("class", "pixelperfect-layer-box");
    content.appendChild(imageBox);

    // Layer image
    let imageNode = doc.createElement("img");
    imageNode.src = layer.dataUrl;
    imageNode.setAttribute("id", layer.id);
    imageNode.setAttribute("class", "pixelperfect-layer-image");
    imageBox.appendChild(imageNode);

    // Anonymous content can't be inserted into chrome pages like
    // about:addons, about:config, etc.
    // xxxHonza: The start button should be disabled for these pages
    // and it shouldn't be possible to open PPUI at all. TODO FIXME
    layer.content = doc.insertAnonymousContent(content);

    this.updateLayer(layer);
  }),

  updateLayer: makeInfallible(function(layer) {
    let win = this.parent.window;

    let content = layer.content;
    if (!content) {
      this.buildLayer(layer);
      return;
    }

    // Include window scroll offset into the final position.
    // There is currently no way how to avoid fixed position
    // for anonymous content using CSS.
    // See ua.css stylesheet for more details.
    let x = parseInt(layer.x, 10) - win.pageXOffset;
    let y = parseInt(layer.y, 10) - win.pageYOffset;

    // Update image box styles
    let boxStyle = "";
    boxStyle += "left:" + x + "px;";
    boxStyle += "top:" + y + "px;";
    boxStyle += "display:" + (layer.visible ? "block" : "none") + ";";
    content.setAttributeForElement("box" + layer.id, "style", boxStyle);

    if (layer.lock) {
      content.setAttributeForElement("box" + layer.id, "lock", "true");
    } else {
      content.removeAttributeForElement("box" + layer.id, "lock");
    }

    if (layer.invert) {
      content.setAttributeForElement("box" + layer.id, "invert", "true");
    } else {
      content.removeAttributeForElement("box" + layer.id, "invert");
    }

    // Update image styles
    let imageStyle = "";
    imageStyle += "opacity:" + (parseInt(layer.opacity, 10) / 100) + ";";
    imageStyle += "transform:" + (layer.scale ? "scale(" + layer.scale + ")" : "none") + ";";
    content.setAttributeForElement(layer.id, "style", imageStyle);
  }),

  destroyLayer: function(layer) {
    if (layer.content) {
      let doc = this.parent.window.document;
      doc.removeAnonymousContent(layer.content);
      layer.content = null;
    }
  },

  // Mouse Event Handlers (for drag and drop)

  onMouseDown: function(event) {
    let target = event.originalTarget;
    let layer = this.getLayer(target.id);
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
    content.setAttributeForElement("box" + this.draggedLayer.id, "drag", "true");

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
    content.removeAttributeForElement("box" + this.draggedLayer.id, "drag");

    this.draggedLayer = null;

    cancelEvent(event);
  },

  onMouseClick: function(event) {
    if (this.draggedLayer) {
      cancelEvent(event);
    }

    //xxxHonza: select the clicked layer, so it can be moved by keyboard?
  },

  onScroll: function(event) {
    if (this.scrolling) {
      return;
    }

    this.scrolling = true;

    // Since scroll events can fire at a high rate, the update
    // shouldn't happen too often. Instead, throttle the event
    // and update layers position only using requestAnimationFrame.
    // This is great for avoiding 'delayed' effect when layers jump
    // a bit when the user scrolls. But note, that when the user
    // is using mouse-wheel for scrolling little jumping is still
    // there.
    let win = this.parent.window;
    win.requestAnimationFrame(timestamp => {
      this.scrolling = false;

      // Update position of all layers.
      for (let i=0; i<this.layers.length; i++) {
        this.updateLayer(this.layers[i]);
      }
    });
  },

  // Layer Helpers

  getLayer: function(id) {
    for (let i=0; i<this.layers.length; i++) {
      if (this.layers[i].id == id) {
        return this.layers[i];
      }
    }
  }
});

// Helpers

/**
 * Inject a helper stylesheet in the window.
 */
let installedHelperSheets = new WeakMap;
function installHelperSheet(win, source, type="agent") {
  // Avoid crash in pre Firefox 38. See also:
  // https://github.com/firebug/pixel-perfect/issues/61
  if (!versionIsAtLeast(38)) {
    let {loadSheet, removeSheet} = require("sdk/stylesheet/utils");
    removeSheet(win, "chrome://pixelperfect/skin/ua.css", "agent");
    loadSheet(win, "chrome://pixelperfect/skin/ua.css", "agent");

    // Make anonymous canvas frame have position:absolute. See also:
    // https://github.com/firebug/pixel-perfect/issues/63
    windowContentReflow(win);

    return;
  }

  if (installedHelperSheets.has(win.document)) {
    return;
  }

  let {Style} = require("sdk/stylesheet/style");
  let {attach} = require("sdk/content/mod");
  let style = Style({source, type});
  attach(style, win);

  installedHelperSheets.set(win.document, style);
}

function cancelEvent(event) {
  event.stopPropagation();
  event.preventDefault();
}

function versionIsAtLeast(version) {
  if (typeof version == "number") {
    version = version + ".0a1";
  }

  return Services.vc.compare(currentBrowserVersion, version) >= 0;
}

/**
 * Manually trigger reflow for document because we can't do that for anonymouse element
 * @see https://developer.mozilla.org/en-US/docs/Tools/Web_Console#synchronous-and-asynchronous-reflows
 * this is not necessary in ff38 because of https://hg.mozilla.org/mozilla-central/rev/700835de77fe
 */
function windowContentReflow(win) {
    let contentWin = win.content.window,
        oldDisplay = contentWin.document.documentElement.style.display;

    contentWin.document.documentElement.style.display = 'none';
    contentWin.getComputedStyle(contentWin.document.documentElement).display; // force reflow
    contentWin.document.documentElement.style.display = oldDisplay;
    contentWin.getComputedStyle(contentWin.document.documentElement).display;
}

// Exports from this module
exports.PixelPerfectActor = PixelPerfectActor;
