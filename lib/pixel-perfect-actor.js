/* See license.txt for terms of usage */

"use strict";

const { Cc, Ci, Cu } = require("chrome");

// Remote Debugging Protocol API
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor, Arg } = protocol;
const Events = require("sdk/event/core");
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Backend helpers
// xxxHonza: do not hard-code the URL
const baseUrl = "resource://pixelperfect-at-getfirebug-dot-com/";
const { expectState, getTrace } = Cu.import(baseUrl + "lib/sdk/core/actor.js");
const Trace = getTrace();

// Constants
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

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

    // Event handlers
    this.onNavigate = this.onNavigate.bind(this);
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
    Trace.sysout("monitorActor.attach;", arguments);

    this.state = "attached";

    Events.on(this.parent, "navigate", this.onNavigate);
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
    Trace.sysout("monitorActor.detach;", arguments);

    this.state = "detached";

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
      this.buildOverlays();
    }
  },

  // Anonymous Content Builders (canvas frame)

  buildOverlays: function() {
    this.overlays.forEach(overlay => {
      this.buildOverlay(overlay);
    })
  },

  buildOverlay: makeInfallible(function(overlay) {
    let doc = this.parent.window.document;

    let id = "overlay-id-" + overlay.id;
    let container = doc.createElement("div");
    let imageNode = doc.createElement("img");
    imageNode.src = overlay.url;
    imageNode.setAttribute("id", id);
    container.appendChild(imageNode);

    overlay.content = doc.insertAnonymousContent(container);
    overlay.imageNodeId = id;

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
    styleStr += "display: " + (overlay.visible ? "block" : "none");

    content.setAttributeForElement(overlay.imageNodeId, "style", styleStr);
  }),

  destroyOverlay: function(overlay) {
    if (overlay.content) {
      let doc = this.parent.window.document;
      doc.removeAnonymousContent(overlay.content);
    }
  }
});

// Helpers

function isXUL(tabActor) {
  return tabActor.window.document.documentElement.namespaceURI === XUL_NS;
}

// Exports from this module
exports.PixelPerfectActor = PixelPerfectActor;
