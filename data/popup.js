/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { PopupPanel } = require("popup-panel");
const { LayerStore } = require("layer-store");

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
  state.layers = state.layers || panel.state.layers;
  state.selection = state.selection || panel.state.selection;

  // Update default selection if necessary (the current selected
  // layer might be removed).
  state.selection = ensureSelection(state.layers, state.selection);

  // Finally, update the UI panel component.
  panel.setState(state);

  postChromeMessage("panel-refreshed");
});

/**
 * Display the page content when it's ready to avoid flashing
 * during the page load.
 */
document.addEventListener("load", event => {
  document.body.removeAttribute("collapsed");
  onResize();
}, true);

/**
 * Update height of the layer list according to the current height of
 * the document.
 *
 * xxxHonza: can we ensure that the main table (popupPanelTable) has the
 * right height that's equal to the height of the document and not bigger
 * using just CSS?
 */
function onResize(event) {
  var table = document.querySelector(".layerList");
  if (table) {
    table.setAttribute("style", "height: " + document.body.clientHeight + "px;");
  }
};

window.addEventListener("resize", onResize);

// Helpers

function ensureSelection(layers, id) {
  for (var i=0; i<layers.length; i++) {
    if (layers[i].id == id) {
      return layers[i].id;
    }
  }

  return layers.length ? layers[0].id : null;
}

// Panel is loaded, let the chrome content send the first
// 'refresh' message.
postChromeMessage("panel-ready");

// End of main.js
});
