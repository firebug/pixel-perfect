/* See license.txt for terms of usage */

// RequireJS configuration
require.config({
  baseUrl: ".",
  paths: {
    "react": "./lib/react/react.min",
  }
});

// Load the main panel module
requirejs(["popup"]);
