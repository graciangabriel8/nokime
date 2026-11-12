/* L'atlas: the moving wall of drawings and the films that open as you reach them.
   Runs before site.js, which draws every [data-art] this file adds. */
(function () {
  "use strict";
  var ROWS = [
    "anise redcurrant sea-buckthorn watercress fraise-des-bois butternut blackcurrant-leaf dover-sole angelica star-anise guinea-fowl pigeon parsley cod frisee cilantro kale sardine raspberry venison".split(" "),
    "sea-urchin blackcurrant maitake trout chicken calamansi cavolo-nero anchovy pine-nut abalone lamb-shank bergamot langoustine pheasant quail hare oyster chanterelle chives corn".split(" ")
  ];
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var walls = [].slice.call(document.querySelectorAll("[data-wall]"));
  var rows = [];
  walls.forEach(function (w) {
    var n = +w.getAttribute("data-wall") || 2, start = Math.floor(Math.random() * 20);
    for (var r = 0; r < n; r++) {
      var row = document.createElement("div"), ids = ROWS[r % ROWS.length];
      row.className = "wall-row";
      for (var i = 0; i < ids.length; i++) {
        var c = document.createElement("span");
        c.className = "wall-cell";
        c.setAttribute("data-art", ids[(i + start) % ids.length]);
        row.appendChild(c);
      }
      w.appendChild(row);
      rows.push({ el: row, wall: w, dir: r % 2 ? 1 : -1 });
    }
  });
  var FAM = window.NOKIME_FAM || {};
  [].slice.call(document.querySelectorAll(".wall [data-art],.plate [data-art],.q-art[data-art],.nf-art[data-art],.art-cluster [data-art]")).forEach(function (el) {
    var f = FAM[el.getAttribute("data-art")]; if (f) el.setAttribute("data-fam", f);
  });
  if (calm) return;
  var frames = [].slice.call(document.querySelectorAll(".shot-frame"));
  var queued = false;
  function paint() {
    queued = false;
    var vh = window.innerHeight, range = Math.min(320, window.innerWidth * 0.34);
    rows.forEach(function (r) {
      var b = r.wall.getBoundingClientRect();
      if (b.bottom < -80 || b.top > vh + 80) return;
      var p = Math.max(0, Math.min(1, (vh - b.top) / (vh + b.height)));
      var x = r.dir < 0 ? -p * range : (p - 1) * range;
      r.el.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
    });
    frames.forEach(function (f) {
      var b = f.getBoundingClientRect();
      if (b.bottom < -80 || b.top > vh + 80) return;
      var p = Math.max(0, Math.min(1, (vh - b.top) / (vh * 0.62)));
      f.style.transform = "scale(" + (0.94 + 0.06 * p).toFixed(4) + ")";
    });
  }
  function ask() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
  window.addEventListener("scroll", ask, { passive: true });
  window.addEventListener("resize", ask);
  ask();
})();
