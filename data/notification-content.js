/* See license.txt for terms of usage */

/**
 * Content script for notification panel. It's only purpose is registering
 * a listener for 'click' event and sending a message to the chrome scope
 * if the user clicks on 'Start Pixel Perfect' link.
 */
window.addEventListener("click", function(event) {
  var target = event.target;
  if (target.id == "start") {
    self.port.emit("start");
  }
});

/**
 * Receive localized strings from the chrome scope. These strings are
 * used in the notification panel UI.
 */
self.port.on("locales", function(locales) {
  document.body.setAttribute("data-locales", JSON.stringify(locales));
});

