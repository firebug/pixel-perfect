/* See license.txt for terms of usage */

"use strict";

(function({
  content,
  addMessageListener,
  sendAsyncMessage,
  removeMessageListener,
  addEventListener}) {

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

const observerService = Cc["@mozilla.org/observer-service;1"].
  getService(Ci.nsIObserverService);

const document = content.document;
const window = content;

/**
 * Listener for message from the inspector panel (chrome scope).
 * It's further distributed as DOM event, so it can be handled by
 * the page content script.
 */
function messageListener(message) {
  const { type, data, origin, bubbles, cancelable } = message.data;

  const event = new window.MessageEvent(type, {
    bubbles: bubbles,
    cancelable: cancelable,
    data: data,
    origin: origin,
    target: window,
    source: window,
  });

  window.dispatchEvent(event);
};

addMessageListener("pixelperfect/event/message", messageListener);

/**
 * Send a message back to the parent panel (chrome scope).
 */
function postChromeMessage(type, args, objects) {
  let data = {
    type: type,
    args: args,
  };

  sendAsyncMessage("message", data, objects);
}

/**
 * Export 'postChromeMessage' function to the frame content as soon
 * as it's loaded. This function allows sending messages from the
 * frame's content directly to the chrome scope.
 */
addEventListener("DOMContentLoaded", event => {
  let postChromeMessage = (type, args, objects) => {
    sendAsyncMessage("message", { type: type, args: args }, objects);
  }

  Cu.exportFunction(postChromeMessage, window, {
    defineAs: "postChromeMessage"
  });
}, true);

// End of scope
})(this);
