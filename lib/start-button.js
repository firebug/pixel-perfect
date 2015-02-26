/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("./sdk/core/trace.js").get(module.id);
const { Locale } = require("./sdk/core/locale.js");
const { ToolbarButton } = require("./sdk/toolbar-button.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Chrome } = require("./sdk/chrome.js");
const { StyleEditorOverlay } = require("./style-editor-overlay.js");
const { defer } = require("sdk/core/promise");

const { CustomizableUI } = Cu.import("resource:///modules/CustomizableUI.jsm", {});
const { AREA_PANEL, AREA_NAVBAR } = CustomizableUI;
const { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm", {});

// DevTools
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

const startButtonId = "pixel-perfect-start-button";

/**
 * xxxHonza TODO docs
 */
var StartButton =
/** @lends StartButton */
{
  // Initialization

  initialize: function() {
    // Create customizable button in browser toolbar.
    // Read more:
    // https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/CustomizableUI.jsm
    // https://blog.mozilla.org/addons/2014/03/06/australis-for-add-on-developers-2/
    CustomizableUI.createWidget({
      id: startButtonId,
      type: "custom",
      defaultArea: AREA_NAVBAR,
      allowedAreas: [AREA_PANEL, AREA_NAVBAR],
      onBuild: this.onBuild.bind(this)
    });
  },

  shutdown: function(reason) {
    CustomizableUI.destroyWidget(startButtonId);
  },

  onBuild: function(doc) {
    Trace.sysout("startButton.onBuild;", doc);

    let button = new ToolbarButton({
      document: doc,
      id: startButtonId,
      label: "pixelPerfect.startButton.title",
      tooltiptext: "pixelPerfect.startButton.tip",
      type: "menu-button",
      "class": "toolbarbutton-1 chromeclass-toolbar-additional",
      image: "chrome://pixelperfect/skin/logo_16x16.png",
      items: this.getMenuItems.bind(this, doc.defaultView),
      command: this.onTogglePixelPerfect.bind(this)
    });

    return button.button;
  },

  // Menu Actions

  getMenuItems: function(win) {
    let items = [];

    items.push({
      nol10n: true,
      label: Locale.$STR("pixelPerfect.about.label") + " " + self.version,
      tooltiptext: Locale.$STR("pixelPerfect.about.tip"),
      image: "chrome://pixelperfect/skin/logo_16x16.png",
      command: this.onAbout.bind(this)
    });

    return items;
  },

  onTogglePixelPerfect: function(event) {
    Trace.sysout("startButton.onTogglePixelPerfect;");

    // xxxHonza: it shouldn't be necessary to select the Style Editor panel
    getToolboxWhenReady("styleeditor").then(toolbox => {
      let context = Chrome.getContext(toolbox);
      let overlay = context.getOverlay(StyleEditorOverlay.prototype.overlayId);
      overlay.onTogglePopup();
    });
  },

  onAbout: function(event) {
    AddonManager.getAddonByID(self.id, function (addon) {
      let browser = getMostRecentBrowserWindow();
      browser.openDialog("chrome://mozapps/content/extensions/about.xul", "",
        "chrome,centerscreen,modal", addon);
    });
  },
}

// Helpers

function getToolbox() {
  let browser = getMostRecentBrowserWindow();
  let tab = browser.gBrowser.mCurrentTab;
  let target = devtools.TargetFactory.forTab(tab);
  return gDevTools.getToolbox(target);
}

function getToolboxWhenReady(toolId) {
  let deferred = defer();
  let toolbox = getToolbox();
  if (toolbox) {
    deferred.resolve(toolbox);
  }
  else {
    showToolbox(toolId).then(toolbox => {
      deferred.resolve(toolbox);
    });
  }
  return deferred.promise;
}

function showToolbox(toolId) {
  let browser = getMostRecentBrowserWindow();
  let tab = browser.gBrowser.mCurrentTab;
  let target = devtools.TargetFactory.forTab(tab);
  return gDevTools.showToolbox(target, toolId);
}

// Exports from this module
exports.StartButton = StartButton;
