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

var port;

/**
 * Register listener for 'message' sent from the chrome scope.
 * The first message initializes a port that can be used to
 * send RDP packets directly to the back-end.
 */
window.addEventListener("message", event => {
  // Port to debuggee (toolbox.target). The port represents communication
  // channel to the remote debugger server.
  port = event.ports[0];

  Trace.sysout("inspector-content.js; initialization", event);

  // Register callback for incoming RDP packets.
  port.onmessage = onMessage.bind(this);

  // An example showing how to send RPD packet.
  //let str = '{"to": "root", "type": "listTabs"}';
  //let packet = JSON.parse(str);
  //port.postMessage(packet);
}, false);

/**
 * Listener for message from the inspector panel (chrome scope).
 * It's further distributed as DOM event, so it can be handled by
 * the page content script.
 */
function messageListener(message) {
  const { type, data, origin, bubbles, cancelable } = message.data;

  //Trace.sysout("inspector-content.js; message: " + message.name +
  //  ": " + type, message);

  // xxxHonza: should we rather use Wrapper.cloneIntoContentScope
  // instead of JSON.stringify.
  const event = new content.MessageEvent(type, {
    bubbles: bubbles,
    cancelable: cancelable,
    data: JSON.stringify(data, 2, 2),
    origin: origin,
    target: content,
    source: content,
  });

  content.dispatchEvent(event);
};

addMessageListener("pixelperfect/event/message", messageListener);

window.addEventListener("unload", event => {
  removeMessageListener("firebug/event/message", messageListener);
})


/**
 * Callback for messages coming from the debuggee target (aka the back-end).
 */
function onMessage(event) {
  let parentNode = window.document.getElementById("response");

  Trace.sysout("inspector-content.js; onMessage from: " +
    event.data.from, event);
};

/**
 * Send a message back to the parent panel (chrome scope).
 */
function postChromeMessage(type, object, objects) {
  let data = {
    type: type,
    object: object,
  };

  sendAsyncMessage("message", data, objects);
}

Cu.exportFunction(postChromeMessage, window, {
  defineAs: "postChromeMessage"
});

const observer = {
  observe: (document, topic, data) => {
    // When frame associated with message manager is removed from document `docShell`
    // is set to `null` but observer is still kept alive. At this point accesing
    // `content.document` throws "can't access dead object" exceptions. In order to
    // avoid leaking observer and logged errors observer is going to be removed when
    // `docShell` is set to `null`.
    if (!docShell) {
      observerService.removeObserver(observer, topic);
    }
    else if (document === content.document) {
      if (topic === "content-document-interactive") {
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
