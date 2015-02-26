/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { PixelPerfectActor } = require("./pixel-perfect-actor.js");
const Events = require("sdk/event/core");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Front, FrontClass } = devtools["require"]("devtools/server/protocol");

/**
 * @front TODO: documentation
 */
var PixelPerfectFront = FrontClass(PixelPerfectActor,
/** @lends PixelPerfectFront */
{
  // Initialization

  initialize: function(client, form) {
    Front.prototype.initialize.apply(this, arguments);

    Trace.sysout("PixelPerfectFront.initialize;", this);

    this.actorID = form[PixelPerfectActor.prototype.typeName];
    this.manage(this);
  },

  onAttached: function(response) {
    Trace.sysout("PixelPerfectFront.onAttached; ", response);
  },

  onDetached: function(response) {
    Trace.sysout("PixelPerfectFront.onDetached; ", response);
  },

  onPacket: function(packet) {
    Front.prototype.onPacket.apply(this, arguments);

    // Forward drag events further to the existing listeners.
    let type = packet.type;
    switch (type) {
    case "dragstart":
    case "drag":
    case "dragend":
      Events.emit(this, type, packet.data);
      break;
    }
  },
});

// Helpers

// Exports from this module
exports.PixelPerfectFront = PixelPerfectFront;
