/* See license.txt for terms of usage */

/**
 * xxxHonza: TODO docs
 */
window.addEventListener("click", function(event) {
  var target = event.target;
  if (target.id == "start") {
    console.log("from content " + target.id)
    self.port.emit("start");
  }
})

