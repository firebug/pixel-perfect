/* See license.txt for terms of usage */

// RequireJS configuration
require.config({
  baseUrl: ".",
  paths: {
    "jquery": "./lib/jquery/jquery.min",
    "react": "./lib/react/react",
    "bootstrap-slider": "./lib/bootstrap-slider/js/bootstrap-slider",
  }
});

// Load the main panel module
requirejs(["main"]);
