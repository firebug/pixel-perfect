/* See license.txt for terms of usage */

"use strict";

(function({content, addMessageListener, sendAsyncMessage, removeMessageListener}) {

const document = content.document;
const window = content;

/**
 * Listener for requests (messages) sent from a test (chrome scope).
 * A response is always sent back together with a result.
 */
function requestListener(message) {
  const { type, data } = message.data;

  let element;
  let result;

  // Perform requested action.
  switch (type) {
  case "exist":
    element = document.querySelector(data.selector);
    break;

  case "click":
    element = document.querySelector(data.selector);
    if (element) {
      element.click();
    }
    break;
  }

  result = element ? true : false;
  postChromeResponse(type, result);
};

addMessageListener("test/request", requestListener);

window.addEventListener("unload", event => {
  removeMessageListener("test/request", requestListener);
})

/**
 * Send a message back to the parent panel (chrome scope).
 */
function postChromeResponse(type, args, objects) {
  let data = {
    type: type,
    args: args,
  };

  sendAsyncMessage("test/response", data, objects);
}
})(this);
