/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { PopupPanel } = require("popup-panel");
const { OverlayStore } = require("overlay-store");

// Initial panel content rendering.
var panel = React.render(PopupPanel(), document.body);

/**
 * Handle refresh events sent from the chrome scope and refresh
 * the panel content. The data attached to the event represents
 * new state (or state changes) for the panel component.
 */
window.addEventListener("refresh", event => {
  var state = JSON.parse(event.data);

  // Merge new state properties into the current state.
  state.overlays = state.overlays || panel.state.overlays;
  state.selection = state.selection || panel.state.selection;

  // Update default selection if necessary (the current selected
  // overlay might be removed).
  state.selection = ensureSelection(state.overlays, state.selection);

  // Finally, update the UI panel component.
  panel.setState(state);
});

/**
 * Display the page content when it's ready to avoid flashing
 * during the page load.
 */
document.addEventListener("load", event => {
  document.body.removeAttribute("collapsed");
}, true);

// Helpers

function ensureSelection(overlays, id) {
  for (var i=0; i<overlays.length; i++) {
    if (overlays[i].id == id) {
      return overlays[i].id;
    }
  }

  return overlays.length ? overlays[0].id : null;
}

// Panel is loaded, let the chrome content send the first
// 'refresh' message.
postChromeMessage("panel-ready");

// End of main.js
});
