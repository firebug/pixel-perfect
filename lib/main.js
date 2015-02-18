/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./core/trace.js").get(module.id);

/**
 * Entry point of the extension. Both 'main' and 'onUnload' methods are
 * exported from this module and executed automatically by Add-ons SDK.
 */
function main(options, callbacks) {
  Trace.sysout("main;", options);
}

function onUnload(reason) {
  Trace.sysout("onUnload; " + reason);
}

// Exports from this module
exports.main = main;
exports.onUnload = onUnload;
