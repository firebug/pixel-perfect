/* See license.txt for terms of usage */

"use strict";

const { main } = require("../index.js");
const { resolve } = require("sdk/core/promise");

/**
 * Load Pixel Perfect add-on.
 */
function loadPixelPerfect() {
  main({loadReason: "install"});
  return resolve();
};

// Exports from this module
exports.loadPixelPerfect = loadPixelPerfect;
