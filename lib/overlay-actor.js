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
var OverlayActor = ActorClass(
/** @lends OverlayActor */
{
  typeName: "pixelPerfectOverlay",

  // Initialization

  initialize: function(conn, parent) {
    Trace.sysout("OverlayActor.initialize; parent: " +
      parent.actorID + ", conn: " + conn.prefix, this);

    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    this.state = "detached";
    this.images = new Map();

    // Event handlers
    this.onNavigate = this.onNavigate.bind(this);
  },

  /**
   * The destroy is only called automatically by the framework (parent actor)
   * if an actor is instantiated by a parent actor.
   */
  destroy: function() {
    Trace.sysout("OverlayActor.destroy; state: " + this.state, arguments);

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
    Trace.sysout("OverlayActor.disconnect; state: " + this.state, arguments);

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

  addImage: method(function(options) {
    Trace.sysout("OverlayActor.addImage; " + options.id, options);

    this.images.set(options.id, options);
    this.buildImage(options);
  }, {
    request: {
      options: Arg(0, "json")
    },
    response: {
      type: "image-added"
    }
  }),

  removeImage: method(function() {
    Trace.sysout("OverlayActor.removeImage; connection ", this.conn);

    // xxxHonza: TODO
  }, {
    request: {},
    response: {
      type: "image-removed"
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
      this.buildImages();
    }
  },

  // Anonymous Content Builders (canvas frame)

  buildImages: function() {
    this.images.forEach(options => {
      this.buildImage(options);
    })
  },

  buildImage: makeInfallible(function(options) {
    Trace.sysout("OverlayActor.buildImage; ", this);

    let doc = this.parent.window.document;

    if (options.imageContentNode) {
      doc.removeAnonymousContent(options.imageContentNode);
    }

    let id = "overlay-id-" + options.id;
    let imageNode = doc.createElement("img");
    imageNode.id = id;
    imageNode.className = "overlay-image";
    imageNode.src = options.url;

    let contentNode = doc.insertAnonymousContent(imageNode);

    let styleStr = "left:" + options.x + "px;";
    styleStr += "top:" + options.y + "px;";
    //contentNode.setAttributeForElement(id, "style", styleStr);

    options.imageContentNode = contentNode;
  })
});

// Helpers

function isXUL(tabActor) {
  return tabActor.window.document.documentElement.namespaceURI === XUL_NS;
}

// Exports from this module
exports.OverlayActor = OverlayActor;
