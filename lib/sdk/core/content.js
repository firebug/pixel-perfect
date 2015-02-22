/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");

var Content = {};

/**
 * TODO: docs
 */
Content.exportIntoContentScope = function(win, obj, defineAs) {
  var clone = Cu.createObjectIn(win, {
    defineAs: defineAs
  });

  var props = Object.getOwnPropertyNames(obj);
  for (var i=0; i<props.length; i++) {
    var propName = props[i];
    var propValue = obj[propName];
    if (typeof propValue == "function") {
      Cu.exportFunction(propValue, clone, {
        defineAs: propName
      });
    }
  }
}

Content.wrapObject = function(object) {
    if (isPrimitive(object))
        return object;

    return XPCNativeWrapper(object);
};

Content.cloneIntoContentScope = function(global, obj) {
    global = Content.wrapObject(global);
    if (typeof obj === "function")
        return cloneFunction(global, obj);
    if (!obj || typeof obj !== "object")
        return obj;
    var newObj = (Array.isArray(obj) ? new global.Array() : new global.Object());
    newObj = XPCNativeWrapper.unwrap(newObj);
    for (var prop in obj)
    {
        var desc = Object.getOwnPropertyDescriptor(obj, prop);
        if (!desc)
            continue;
        if ("writable" in desc)
            desc.writable = false;
        desc.configurable = false;
        Object.defineProperty(newObj, prop, desc);
    }
    Cu.makeObjectPropsNormal(newObj);
    return newObj;
};

function isPrimitive(obj) {
    return !(obj && (typeof obj === "object" || typeof obj === "function"));
}


// Exports from this module
exports.Content = Content;
