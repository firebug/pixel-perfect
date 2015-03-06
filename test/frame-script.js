/* See license.txt for terms of usage */

"use strict";

(function({content, addMessageListener, sendAsyncMessage, removeMessageListener}) {

const document = content.document;
const window = content;

/**
 * xxxHonza: TODO docs
 */
function messageListener(message) {
  const { type, data } = message.data;

  let element;
  let result;

  // Perform requested check.
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

addMessageListener("test/request", messageListener);

window.addEventListener("unload", event => {
  removeMessageListener("test/request", messageListener);
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
