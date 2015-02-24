/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { OverlayActor } = require("./overlay-actor.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Front, FrontClass } = devtools["require"]("devtools/server/protocol");

/**
 * @front TODO: documentation
 */
var OverlayFront = FrontClass(OverlayActor,
/** @lends OverlayFront */
{
  // Initialization

  initialize: function(client, form) {
    Front.prototype.initialize.apply(this, arguments);

    Trace.sysout("OverlayFront.initialize;", this);

    this.actorID = form[OverlayActor.prototype.typeName];
    this.manage(this);
  },

  onAttached: function(response) {
    Trace.sysout("OverlayFront.onAttached; ", response);
  },

  onDetached: function(response) {
    Trace.sysout("OverlayFront.onDetached; ", response);
  },
});

// Helpers

// Exports from this module
exports.OverlayFront = OverlayFront;
