/* See license.txt for terms of usage */

"use strict";

(function({content, addMessageListener, sendAsyncMessage, removeMessageListener}) {

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

window.addEventListener("unload", event => {
  removeMessageListener("firebug/event/message", messageListener);
})

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

const observer = {
  observe: (document, topic, data) => {
    // When frame associated with message manager is removed from document `docShell`
    // is set to `null` but observer is still kept alive. At this point accessing
    // `content.document` throws "can't access dead object" exceptions. In order to
    // avoid leaking observer and logged errors observer is going to be removed when
    // `docShell` is set to `null`.
    if (!docShell) {
      observerService.removeObserver(observer, topic);
    }
    else if (document === window.document) {
      if (topic === "content-document-interactive") {
        Cu.exportFunction(postChromeMessage, window, {
          defineAs: "postChromeMessage"
        });

        sendAsyncMessage("sdk/event/ready", {
          type: "ready",
          readyState: document.readyState,
          uri: document.documentURI
        });
      }
    }
  }
};

observerService.addObserver(observer, "content-document-interactive", false);

})(this);
