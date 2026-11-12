/* Au quotidien. On a plain page, three small things: the clock follows the scroll, a pairing leads to the next ingredient, and the price can be tried.
   Where it can run, the same page also becomes one stage where the scroll is the time. Everything reads and writes the page itself, and French stays in the HTML. */
(function () {
  "use strict";
  var root = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function en() { return root.getAttribute("lang") === "en"; }
  function money(c, whole) { var n = (c / 100).toFixed(whole ? 0 : 2); return en() ? "€" + n : n.replace(".", ",") + "\u202f€"; }
  function staged() { return root.classList.contains("day-on"); }
  function el(tag, c) { var e = document.createElement(tag); e.className = c; return e; }
  /* each drawing's own square inside the 96 box, so all of them fill their small plate alike */
  var BOX = { butternut: "8 11.5 78 78", sage: "20 30 55 55", butter: "28 33 42 42", hazelnut: "24.5 26 47 47", chestnut: "13 11 66 66", cream: "31 32 44 44", parmesan: "18 19 60 60" };
  /* one drawing, wherever it is shown: always a copy of the one in the 9 h panels */
  function draw(id) { var a = $('#dayPlate [data-id="' + id + '"] .day-drawing').cloneNode(true); a.setAttribute("class", "art day-thumb"); a.setAttribute("viewBox", BOX[id]); return a; }
  var SV = null;

  /* ---------- the clock on the wall: between two scenes, time runs in proportion to the distance ---------- */
  (function () {
    var clock = $("#dayClock");
    if (!clock || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var hh = $(".hh", clock), mm = $(".mm", clock), foot = $(".site-foot"), stops = [];
    function measure() {
      if (staged()) return;
      var at = innerHeight * .4;
      stops = [{ y: 0, m: 450 }];
      $$("[data-min]").forEach(function (el) { stops.push({ y: el.getBoundingClientRect().top + scrollY - at, m: +el.getAttribute("data-min") }); });
      stops.push({ y: root.scrollHeight - innerHeight, m: 1440 });
    }
    function paint() {
      if (staged()) return;
      var y = scrollY, i = 1;
      while (i < stops.length - 1 && y > stops[i].y) i++;
      var a = stops[i - 1], b = stops[i], k = Math.max(0, Math.min(1, (y - a.y) / ((b.y - a.y) || 1))), m = a.m + (b.m - a.m) * k;
      clock.classList.toggle("over", innerHeight > foot.getBoundingClientRect().top + 40);
      hh.setAttribute("transform", "rotate(" + m / 2 + " 28 28)");
      mm.setAttribute("transform", "rotate(" + m * 6 + " 28 28)");
    }
    var queued = false;
    addEventListener("scroll", function () { if (queued) return; queued = true; setTimeout(function () { queued = false; paint(); }, 16); }, { passive: true });
    addEventListener("resize", function () { measure(); paint(); });
    addEventListener("load", function () { measure(); paint(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); paint(); });
    measure(); paint();
    clock.hidden = false;
  })();

  /* ---------- 9 h: a pairing leads to the next ingredient. The panels are in the HTML, so site.js translates them hidden or not. ---------- */
  (function () {
    var plate = $("#dayPlate"), hint = $("#hopHint"), cap = $("#hopCap");
    if (!plate) return;
    /* on the big plate they keep some air, or the fullest ones press on the rim */
    var MID = { butternut: BOX.butternut, sage: "16 26 62 62", butter: "23 28 52 52", hazelnut: "19.5 21 56 56", chestnut: "8 6 76 76", cream: "26 27 54 54", parmesan: "13 14 70 70" };
    var CYCLE = 5.4;
    $$(".day-panel", plate).forEach(function (p) {
      var ring = $(".day-ring", p), d = $(".day-drawing", ring), lead = $(".day-leaders", ring), dish = el("div", "day-dish"), lean = el("div", "day-lean"), orbit = el("div", "day-orbit"), lines = $$("line", lead);
      d.setAttribute("viewBox", MID[p.getAttribute("data-id")]);
      ring.insertBefore(orbit, d); ring.insertBefore(dish, d);
      dish.appendChild(lean); lean.appendChild(d); orbit.appendChild(lead);
      lines.forEach(function (l, i) {
        var s = el("i", "day-seed");
        ["x1", "y1", "x2", "y2"].forEach(function (k) { s.style.setProperty("--" + k, +l.getAttribute(k) / 100); });
        s.style.animationDelay = (i * CYCLE / lines.length).toFixed(2) + "s";
        orbit.appendChild(s);
      });
    });
    $$("[data-go]", plate).forEach(function (s) {
      var b = document.createElement("button"), disc = el("span", "day-disc"), go = s.getAttribute("data-go"), art = $('[data-id="' + go + '"] .day-drawing', plate).cloneNode(true), li = s.parentNode;
      art.setAttribute("class", "art day-thumb"); art.setAttribute("viewBox", BOX[go]);
      disc.appendChild(art);
      disc.style.animationDelay = ([].indexOf.call(li.parentNode.children, li) * CYCLE / li.parentNode.children.length).toFixed(2) + "s";
      b.type = "button"; b.className = parseFloat(li.style.top) < 50 ? "day-hop day-hop-up" : "day-hop";
      b.setAttribute("data-go", go);
      li.replaceChild(b, s);
      s.removeAttribute("data-go");
      b.appendChild(disc); b.appendChild(s);
    });
    hint.hidden = cap.hidden = false;
    cap.classList.add("off");
    /* pointing at a little plate leans the big one towards it */
    if (window.matchMedia("(hover:hover)").matches) {
      plate.addEventListener("pointerover", function (e) {
        var b = e.target.closest && e.target.closest(".day-hop"), li = b && b.parentNode, p = li && li.closest(".day-panel");
        if (!li || !staged()) return;
        $(".day-lean", p).style.transform = "translate(" + ((parseFloat(li.style.left) - 50) * .03).toFixed(2) + "%," + ((parseFloat(li.style.top) - 50) * .03).toFixed(2) + "%)";
      });
      plate.addEventListener("pointerout", function (e) {
        var b = e.target.closest && e.target.closest(".day-hop");
        if (b) $(".day-lean", b.closest(".day-panel")).style.transform = "";
      });
    }
    var hopped = -1000;
    plate.addEventListener("click", function (e) {
      var b = e.target.closest("[data-go]");
      /* the next panel's label can sit right under the pointer: a double click stays on the first ingredient it chose */
      if (!b || e.timeStamp - hopped < 350) return;
      hopped = e.timeStamp;
      var next = $('[data-id="' + b.getAttribute("data-go") + '"]', plate), was = b.closest(".day-panel");
      var from = staged() && next.animate ? $(".day-disc", b).getBoundingClientRect() : null, ghost = from && $(".day-dish", was).cloneNode(true);
      $$(".day-panel", plate).forEach(function (p) { p.hidden = p !== next; p.classList.remove("in"); });
      void next.offsetWidth;
      next.classList.add("in");
      hint.classList.add("off");
      cap.classList.remove("off");
      plate.dispatchEvent(new Event("dayhop"));
      if (from) {
        /* the little plate flies in, the old one flies out to where it was, and the new pairings burst from the centre */
        var dish = $(".day-dish", next), ring = $(".day-ring", next), to = dish.getBoundingClientRect(), cur = dish.style.transform || "none";
        var dx = from.left + from.width / 2 - to.left - to.width / 2, dy = from.top + from.height / 2 - to.top - to.height / 2, sc = (from.width / to.width).toFixed(3);
        var fly = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + sc + ")";
        ring.insertBefore(ghost, dish.nextSibling);
        ghost.animate([{ transform: cur, opacity: 1 }, { transform: fly, opacity: 0 }], { duration: 300, easing: "ease-in", fill: "forwards" }).onfinish = function () { ghost.parentNode.removeChild(ghost); };
        dish.animate([{ transform: fly + " rotate(-18deg)", opacity: .4 }, { transform: cur, opacity: 1 }], { duration: 520, easing: "cubic-bezier(.2,.9,.25,1.14)" });
        var rip = el("i", "day-ripple");
        ring.insertBefore(rip, dish);
        rip.animate([{ transform: "scale(.9)", opacity: 0 }, { transform: "scale(1)", opacity: .5, offset: .25 }, { transform: "scale(1.42)", opacity: 0 }], { duration: 760, delay: 240, fill: "both", easing: "ease-out" }).onfinish = function () { rip.parentNode.removeChild(rip); };
        $(".day-orbit", next).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 300, fill: "backwards" });
        var C = ring.getBoundingClientRect();
        $$(".day-pairs li", next).forEach(function (li, i) {
          var r = li.getBoundingClientRect(), now = li.style.transform;
          var back = "translate(" + (C.left + C.width / 2 - r.left - r.width / 2).toFixed(1) + "px," + (C.top + C.height / 2 - r.top - r.height / 2).toFixed(1) + "px) " + now + " scale(.35)";
          li.animate([{ transform: back, opacity: 0 }, { transform: now, opacity: 1 }], { duration: 520, delay: 170 + i * 55, fill: "backwards", easing: "cubic-bezier(.2,.9,.25,1.22)" });
        });
      }
      $(".day-fact", next).focus({ preventScroll: true });
    });
  })();

  /* ---------- 15 h 30: try the price. Same sums as Manager, in whole cents so the subtraction on screen is always right. ---------- */
  (function () {
    var val = $("#pxVal"), text = $("#pxText"), live = $("#pxLive"), down = $("#pxDown"), up = $("#pxUp"), costEl = $("#dayCost");
    if (!val || !costEl) return;
    var cost = +costEl.getAttribute("data-eur"), price = 10, MIN = 6, MAX = 20, shownHt = 0, RM = window.matchMedia("(prefers-reduced-motion: reduce)");
    function fill(el, map) { return el.getAttribute("data-tpl").replace(/\{(\w)\}/g, function (_, k) { return map[k]; }); }
    function set(el, s) { if (el.textContent !== s) el.textContent = s; }

    /* the dish on its plate, and around it the price before VAT: each ingredient takes its exact share of the circle, and what stays gold is the gross margin */
    var IDS = ["butternut", "chestnut", "hazelnut", "cream", "sage", "butter"], serve = $("#dayServe"), rows = $$(".day-bill-a li"), arcs = [], R = 41, CIRC = 2 * Math.PI * R;
    var SPOT = [null, [20, 25, 25], [75, 21, 21], [50, 85, 21], [27, 76, 25], [76, 75, 23]];
    rows.forEach(function (li, i) {
      var d = el("span", "day-disc"); d.setAttribute("data-id", IDS[i]); d.appendChild(draw(IDS[i]));
      li.insertBefore(d, li.firstChild);
    });
    serve.innerHTML = '<div class="day-serve-in"><svg class="day-arcs" viewBox="0 0 100 100"><defs><path id="dayArcTop" d="M5 50A45 45 0 0 1 95 50"/><path id="dayArcBot" d="M1.4 50A48.6 48.6 0 0 0 98.6 50"/></defs>' +
      '<circle class="day-arc-base" cx="50" cy="50" r="41"/>' + IDS.map(function (id) { return '<circle class="day-arc" data-id="' + id + '" cx="50" cy="50" r="41"/>'; }).join("") +
      '<g class="day-arc-words"><text class="day-arc-c" text-anchor="middle"><textPath href="#dayArcTop" startOffset="50%"></textPath></text><text class="day-arc-m" text-anchor="middle"><textPath href="#dayArcBot" startOffset="50%"></textPath></text></g></svg>' +
      '<div class="day-serve-plate" data-id="butternut"></div><i class="day-serve-run"></i></div>';
    var plateEl = $(".day-serve-plate", serve), wordC = $(".day-arc-c textPath", serve), wordM = $(".day-arc-m textPath", serve), svgEl = $(".day-arcs", serve);
    arcs = $$(".day-arc", serve).map(function (a) { return { el: a, land: 1, at: 0, shownOp: -1 }; });
    var gars = IDS.map(function (id, i) {
      var g = el("span", i ? "day-gar" : "day-gar day-gar-main"), s = SPOT[i];
      g.setAttribute("data-id", id);
      if (s) { g.style.left = s[0] - s[2] / 2 + "%"; g.style.top = s[1] - s[2] / 2 + "%"; g.style.width = g.style.height = s[2] + "%"; }
      g.appendChild(draw(id));
      plateEl.appendChild(g);
      return g;
    });
    function paintArc(a) { a.el.setAttribute("transform", "rotate(" + (a.at - (1 - a.land) * 32).toFixed(2) + " 50 50)"); }
    function ring(ht) {
      var eur = rows.map(function (li) { return +$("b", li).getAttribute("data-eur"); }), whole = cost / ht * 360, at = -90 - whole / 2;
      arcs.forEach(function (a, i) {
        var deg = eur[i] / ht * 360;
        a.el.setAttribute("stroke-dasharray", (Math.max(.4, deg - 1.1) / 360 * CIRC).toFixed(2) + " " + CIRC.toFixed(2));
        a.at = at + .55; paintArc(a); at += deg;
      });
    }
    var tween = 0;
    function turnTo(ht) {
      clearTimeout(tween);
      if (!shownHt || RM.matches) { shownHt = ht; ring(ht); return; }
      var from = shownHt, n = 0, N = 22;
      (function tick() {
        n++;
        var t = n / N, bk = t - 1, k = 1 + 2.2 * bk * bk * bk + 1.2 * bk * bk;
        shownHt = from + (ht - from) * k; ring(shownHt);
        if (n < N) tween = setTimeout(tick, 16); else { shownHt = ht; ring(ht); }
      })();
    }
    function words(ratio, marginStr) {
      var map = { m: marginStr, r: ratio + (en() ? "%" : " %") };
      set(wordC, serve.getAttribute("data-tc").replace("{r}", map.r));
      set(wordM, serve.getAttribute("data-tm").replace("{m}", map.m));
    }
    SV = {
      el: serve, plate: plateEl, gars: gars, words: $(".day-arc-words", serve),
      land: function (i, k) { var a = arcs[i]; if (a.land === k && a.shownOp === k) return; a.land = k; a.shownOp = k; a.el.style.opacity = k; paintArc(a); },
      reset: function () { arcs.forEach(function (a) { a.land = 1; a.shownOp = 1; a.el.style.opacity = ""; paintArc(a); }); gars.forEach(function (g) { g.style.transform = ""; g.style.opacity = ""; }); },
      fit: function () { var w = serve.offsetWidth || 340; svgEl.style.setProperty("--fs", Math.max(3.1, 12.5 / w * 100).toFixed(2) + "px"); }
    };
    serve.hidden = false;
    /* pointing at a row of the bill finds its share of the circle and its piece on the plate */
    rows.forEach(function (li, i) {
      li.addEventListener("pointerenter", function () { arcs[i].el.classList.add("on"); gars[i].classList.add("on"); });
      li.addEventListener("pointerleave", function () { arcs[i].el.classList.remove("on"); gars[i].classList.remove("on"); });
    });

    function sentence(ht) {
      var s = fill(text, { h: money(ht), m: "\u0001", r: Math.round(cost / ht * 100) + (en() ? "%" : " %") }), p = s.split("\u0001"), m = money(ht - cost);
      if (text.textContent === p.join(m) && text.querySelector("b")) return;
      text.textContent = p[0];
      var bold = document.createElement("b"); bold.textContent = m; text.appendChild(bold);
      text.appendChild(document.createTextNode(p[1] || ""));
    }
    function render() {
      var ht = Math.round(price * 100 / 1.1), ratio = Math.round(cost / ht * 100);
      $$("[data-eur]").forEach(function (el) { set(el, money(+el.getAttribute("data-eur"))); });
      set(val, money(price * 100, true));
      sentence(ht);
      words(ratio, money(ht - cost));
      turnTo(ht);
      down.setAttribute("aria-disabled", String(price <= MIN));
      up.setAttribute("aria-disabled", String(price >= MAX));
    }
    function step(d) {
      var p = Math.min(MAX, Math.max(MIN, price + d));
      if (p === price) return;
      price = p;
      render();
      $(".day-sold").classList.remove("fresh");
      if (staged() && val.animate) {
        val.animate([{ transform: "translateY(" + (d > 0 ? ".45em" : "-.45em") + ")", opacity: .15 }, { transform: "none", opacity: 1 }], { duration: 170, easing: "ease-out" });
        plateEl.animate([{ transform: "scale(1)" }, { transform: "scale(" + (d > 0 ? 1.035 : .965) + ")", offset: .35 }, { transform: "scale(1)" }], { duration: 340, easing: "ease-out" });
        var mb = $("b", text); if (mb) mb.animate([{ transform: "translateY(-2px) scale(1.14)" }, { transform: "none" }], { duration: 260, easing: "ease-out" });
      }
      /* only + and − speak: switching language rewrites the visible sentence, and a screen reader stays quiet about that */
      live.textContent = fill(live, { p: money(price * 100, true) }) + text.textContent;
    }
    down.addEventListener("click", function () { step(-1); });
    up.addEventListener("click", function () { step(1); });
    down.hidden = up.hidden = false;
    $(".day-sold").classList.add("fresh");
    SV.fit();
    render();
    /* site.js sets the language and sends no event; this runs once it has finished translating the templates too */
    new MutationObserver(function () { live.textContent = ""; render(); }).observe(root, { attributes: true, attributeFilter: ["lang"] });
  })();

  /* ---------- 23 h 30: the jacket swings once, the first time it comes into view ---------- */
  (function () {
    var peg = $(".day-peg");
    if (!peg) return;
    var art = $(".art", peg), hang = el("div", "day-hang"), sway = el("div", "day-sway"), dark = art.cloneNode(true);
    dark.setAttribute("class", "art day-dark");
    peg.insertBefore(hang, art); hang.appendChild(sway); sway.appendChild(art); sway.appendChild(dark);
    var lamp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    lamp.setAttribute("class", "day-lamp"); lamp.setAttribute("viewBox", "0 0 96 96"); lamp.setAttribute("aria-hidden", "true");
    lamp.innerHTML = '<path class="day-cone" d="M41.2-8.5H53.8L104 128H-9z"/><path class="day-cord" d="M47.5-400V-17"/><path class="day-shade" d="M47.5-18Q37-18 35.5-7.5H59.5Q58-18 47.5-18z"/><ellipse class="day-bulb" cx="47.5" cy="-7.2" rx="4.4" ry="1.5"/>';
    peg.insertBefore(lamp, peg.firstChild);
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || staged()) return;
      peg.classList.add("swing");
      io.disconnect();
    }, { threshold: .5 });
    io.observe(peg);
  })();
  /* ---------- the day on one stage: the scroll is the time. Positions below are in screens of scroll, and every move is a transform or an opacity.
     Where this cannot run or does not fit (reduced motion, a phone on its side, very large text), the page stays the plain one above. ---------- */
  (function () {
    var track = $("#dayTrack"), stage = $("#dayStage"), clock = $("#dayClock"), time = $("#dayTime"), puck = $("#dayPuck");
    if (!track || !stage || !clock || !time || !puck) return;
    var rm = window.matchMedia("(prefers-reduced-motion: reduce)");

    function rowsAt(start, gap, c, d) { return [1, 2, 3, 4, 5, 6].map(function (n, i) { return [".day-bill-a li:nth-child(" + n + ")", start + i * gap, start + (i + 1) * gap, c, d, 8]; }); }
    var WIDE = {
      name: "wide", len: 9.3, unit: 1, hz: .78,
      time: [[0, 450], [.45, 520], [1, 540], [2.4, 570], [3, 750], [3.55, 765], [4.2, 930], [6, 960], [6.8, 1140], [7.3, 1160], [8, 1410], [9.3, 1430]],
      sky: [[.35, .95], [2.4, 3.1], [3.55, 4.2], [6, 6.8], [7.3, 8]],
      marks: [2, 3.35, 5.8, 7.1, 8.9],
      hours: [[-.6, .95, 2.5, 3], [2.55, 3, 3.6, 4], [3.6, 4.1, 6.1, 6.5], [6.15, 6.7, 7.3, 7.7], [7.35, 7.9, 99, 99]],
      fan: [.85, 1.6], out: [2.3, 2.72], jacket: [8, 8.9],
      rush: [2.72, 3.5, 3.6, 3.95], pass: [6.35, 7.05, 7.3, 7.72], rows: [4.5, .12], serve: [4.15, 4.55, 6, 6.25], paper: [4.2, 4.5, 6, 6.25], words: [5.2, 5.4], rail: [7.85, 8.25], lamp: [8.1, 8.55], shrink: null,
      blocks: [
        [".day-opening>.wrap", -2, -1, .35, .7, 24],
        [".day-morning .day-line", .55, .85, 2.4, 2.7], ["#dayPlate", .85, 1.25, 2.4, 2.75], [".day-morning .day-tool", 1.35, 1.65, 2.4, 2.7],
        [".day-noon .day-line", 3, 3.25, 3.55, 3.75],
        [".day-break .day-line", 4.1, 4.35, 6, 6.25], [".day-dishname", 4.35, 4.5, 6, 6.25], [".day-note", 4.35, 4.5, 6, 6.25]
      ].concat(rowsAt(4.5, .12, 6, 6.25), [
        [".day-total", 4.42, 4.55, 6, 6.25], [".day-sold", 5.25, 5.45, 6, 6.25], [".day-rest", 5.25, 5.45, 6, 6.25], [".day-after", 5.35, 5.55, 6, 6.25], [".day-break .day-tool", 5.45, 5.65, 6, 6.25],
        [".day-dusk .day-line", 6.7, 6.95, 7.3, 7.5],
        [".day-night .day-line", 7.9, 8.2, 99, 99], [".day-peg", 8, 8.4, 99, 99], [".day-night .day-tool", 8.3, 8.5, 99, 99]
      ]),
      fit: ["#dayCue", "#dayPlate", ".day-morning .day-tool", ".day-bill", ".day-bill-b", ".day-serve", ".day-break .day-tool", ".day-night .day-tool"]
    };
    var NARROW = {
      name: "narrow", len: 11.5, unit: .8, hz: .82,
      time: [[0, 450], [.45, 520], [1, 540], [3.5, 570], [4.1, 750], [4.5, 765], [5.2, 930], [8.3, 960], [8.9, 1140], [9.3, 1160], [10, 1410], [11.5, 1430]],
      sky: [[.3, .95], [3.5, 4.1], [4.5, 5.2], [8.3, 8.9], [9.3, 10]],
      marks: [2.3, 4.35, 7.6, 9.1, 11.3],
      hours: [[-.6, .95, 3.55, 3.95], [3.5, 3.9, 4.6, 4.9], [4.55, 5, 8.2, 8.6], [8.25, 8.7, 9.35, 9.7], [9.35, 9.8, 99, 99]],
      fan: [1.5, 2.2], out: [2.68, 3], jacket: [9.9, 10.8], lift: [7, 7.25],
      rush: [3.75, 4.45, 4.55, 4.9], pass: [8.45, 9.05, 9.3, 9.7], rows: [5.85, .12], serve: [5.3, 5.7, 8.4, 8.55], paper: [5.65, 5.9, 7, 7.2], words: [7.25, 7.45], rail: [9.75, 10.1], lamp: [9.95, 10.35], shrink: [10.7, 10.95],
      blocks: [
        [".day-opening>.wrap", -2, -1, .3, .6, 24],
        [".day-morning .day-line", .55, .8, 1.35, 1.5], ["#dayPlate", 1.45, 1.8, 2.85, 3], [".day-morning .day-tool", 2.95, 3.15, 3.5, 3.7],
        [".day-noon .day-line", 3.95, 4.15, 4.5, 4.7],
        [".day-break .day-line", 5, 5.25, 5.6, 5.75], [".day-dishname", 5.7, 5.9, 7, 7.2], [".day-note", 5.7, 5.9, 7, 7.2]
      ].concat(rowsAt(5.85, .12, 7, 7.2), [
        [".day-total", 5.85, 6, 7.85, 8], [".day-sold", 7.15, 7.35, 7.85, 8], [".day-rest", 7.15, 7.35, 7.85, 8], [".day-after", 7.2, 7.4, 7.85, 8], [".day-break .day-tool", 7.95, 8.15, 8.4, 8.55],
        [".day-dusk .day-line", 8.75, 8.95, 9.3, 9.5],
        [".day-night .day-line", 9.85, 10.05, 10.35, 10.5], [".day-peg", 9.9, 10.3, 99, 99], [".day-night .day-tool", 10.9, 11.1, 99, 99]
      ]),
      fit: ["#dayCue", "#dayPlate", ".day-morning .day-tool", ".day-break .day-tool", ".day-night .day-tool", ".day-peg"]
    };

    /* 19 h holds longer while the plate is built: everything after it moves down by the same amount */
    function stretch(c, at, by) {
      function m(x) { return x > at && x < 90 ? x + by : x; }
      c.len += by;
      c.time.forEach(function (t) { t[0] = m(t[0]); });
      c.marks = c.marks.map(m);
      c.sky = c.sky.map(function (t) { return t.map(m); });
      c.hours = c.hours.map(function (t) { return t.map(m); });
      ["pass", "jacket", "rail", "lamp", "shrink"].forEach(function (k) { if (c[k]) c[k] = c[k].map(m); });
      c.blocks.forEach(function (b) { for (var i = 1; i < 5; i++) b[i] = m(b[i]); });
    }
    stretch(WIDE, 7.25, 1.7); WIDE.dish = [7, 8.7];
    stretch(NARROW, 9.25, 2); NARROW.dish = [9, 11];

    function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
    function seg(x, a, b) { return clamp((x - a) / ((b - a) || 1), 0, 1); }
    function ease(k) { return k * k * (3 - 2 * k); }
    function interp(t, x) {
      var i = 1;
      while (i < t.length - 1 && x > t[i][0]) i++;
      return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * seg(x, t[i - 1][0], t[i][0]);
    }
    /* every style the stage writes goes through here, so stopping can give each element back exactly what it had */
    var touched = [];
    function put(el, prop, val) {
      if (el._was === undefined) { el._was = el.getAttribute("style"); el._cur = {}; touched.push(el); }
      if (el._cur[prop] === val) return;
      el._cur[prop] = val; el.style[prop] = val;
    }
    function restore() {
      touched.forEach(function (el) {
        if (el._was === null) el.removeAttribute("style"); else el.setAttribute("style", el._was);
        el._was = undefined; el._cur = undefined;
      });
      touched = [];
    }

    /* what only the stage needs: the sky, the table, the shadows, the running total, a box the height of the small viewport */
    var sky = document.createElement("div"); sky.className = "day-sky"; sky.setAttribute("aria-hidden", "true");
    var layers = [0, 1, 2, 3, 4, 5].map(function (i) { var l = document.createElement("i"); l.className = "s" + i; sky.appendChild(l); return l; });
    var tableA = document.createElement("div"), tableB = document.createElement("div");
    tableA.className = "day-table"; tableB.className = "day-table pale";
    stage.insertBefore(tableB, stage.firstChild); stage.insertBefore(tableA, tableB); stage.insertBefore(sky, tableA);
    var probe = document.createElement("div"); probe.className = "day-probe"; document.body.appendChild(probe);
    var costEl = $("#dayCost"), count = document.createElement("b"); count.className = "day-count"; count.setAttribute("aria-hidden", "true");
    costEl.parentNode.insertBefore(count, costEl);
    var BASE = [.2, .16, .2, .42, .22];
    var hours = $$(".day-hour", stage).map(function (h, i) {
      var inner = document.createElement("span"); inner.className = "day-hour-in";
      while (h.firstChild) inner.appendChild(h.firstChild);
      h.appendChild(inner);
      var sh = document.createElement("div"); sh.className = "day-shadow"; sh.setAttribute("aria-hidden", "true");
      sh.innerHTML = inner.innerHTML;
      h.parentNode.insertBefore(sh, h.nextSibling);
      return { h: h, inner: inner, sh: sh, base: BASE[i] };
    });
    var eur = $$(".day-bill-a li b").map(function (b) { return +b.getAttribute("data-eur"); });
    var line = $(".day-track-line", time), marks = [], peg = $(".day-peg"), jacket = peg && $(".day-hang", peg), swayEl = peg && $(".day-sway", peg), plate = $("#dayPlate");
    var breakWrap = $(".day-break>.wrap"), split = $(".day-split"), billA = $(".day-bill-a"), billB = $(".day-bill-b"), billEl = $(".day-bill"), totEl = $(".day-total");

    /* 12 h 30: the tickets come faster than anyone can clear them, and the fire is up behind the table */
    function backOut(k) { var t = k - 1; return 1 + 2.2 * t * t * t + 1.2 * t * t; }
    var rush = el("div", "day-rush"); rush.setAttribute("aria-hidden", "true");
    var flames = el("div", "day-flames"), flameRow = el("div", "day-flame-row"), TICKET = [[9, -2.6], [20, 1.8], [31, -1.2], [42, 2.4], [53, -2], [64, 1.3], [75, -2.8], [86, 2], [97, -1.4]], ORDER = [4, 1, 6, 2, 7, 0, 5, 3, 8];
    var fireCv = el("canvas", "day-fire"), heat = el("i", "day-heat"), fireOn = false;
    flameRow.appendChild(fireCv);
    var fire = (function (cv) {
      /* four layers of tongues, each layer filled as one shape, so they merge into a single fire and only their tips show */
      var cx = cv.getContext && cv.getContext("2d"), W = 0, H = 0, raf = 0, last = 0, layers = [], t0 = 0;
      var LAYERS = [
        { lo: .62, hi: 1, top: "#C5350F", bot: "#E85A1A" },
        { lo: .42, hi: .74, top: "#E85A1A", bot: "#F4851F" },
        { lo: .26, hi: .5, top: "#F4851F", bot: "#FBB03A" },
        { lo: .12, hi: .27, top: "#FDBF4E", bot: "#FFE7A3" }
      ];
      function rnd(n) { var x = Math.sin(n * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); }
      function size() {
        if (!cx) return;
        var r = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.round(cv.clientWidth * r), h = Math.round(cv.clientHeight * r);
        if (!w || !h || (w === W && h === H)) return;
        W = w; H = h; cv.width = W; cv.height = H;
        layers = LAYERS.map(function (l, li) {
          /* a flame is taller than it is wide, whatever the screen: the width follows its height */
          var mid = H * (l.lo + l.hi) / 2, wd = mid * (li === 3 ? .7 : .5), g = wd * .6, n = Math.ceil(W / g) + 4, list = [], paint = cx.createLinearGradient(0, H * (1 - l.hi), 0, H);
          paint.addColorStop(0, l.top); paint.addColorStop(1, l.bot);
          for (var i = 0; i < n; i++) {
            var id = li * 100 + i, gx = (i - 2 + (rnd(id) - .5) * .8) * g, off = (gx - W / 2) / (W * .2), tall = (l.lo + (l.hi - l.lo) * rnd(id + .2)) * (1 - .36 * Math.exp(-off * off));
            list.push({ x: gx, tall: tall, w: H * tall * (li === 3 ? .7 : .5) * (.85 + rnd(id + .1) * .3), f1: 3.1 + rnd(id + .3) * 3.2, f2: 2.1 + rnd(id + .4) * 2.4, p1: rnd(id + .5) * 6.28, p2: rnd(id + .6) * 6.28, p3: rnd(id + .7) * 6.28 });
          }
          return { paint: paint, list: list, band: H * l.lo * .13 };
        });
      }
      function show(now) {
        var t = now / 1000 - t0, B = H + 2;
        cx.clearRect(0, 0, W, H);
        layers.forEach(function (l) {
          cx.beginPath();
          l.list.forEach(function (g) {
            var lick = .5 + .5 * Math.sin(t * g.f1 + g.p1), fast = .5 + .5 * Math.sin(t * g.f1 * 2.3 + g.p2), h = H * g.tall * (.68 + .24 * lick + .08 * fast);
            var sw = g.w * (.34 * Math.sin(t * g.f2 + g.p2) + .14 * Math.sin(t * g.f2 * 2.7 + g.p3)), x = g.x + g.w * .05 * Math.sin(t * .8 + g.p3), tx = x + sw, ty = H - h;
            cx.moveTo(x - g.w * .42, B);
            cx.bezierCurveTo(x - g.w * .74, H - h * .3, tx - sw * .95 - g.w * .05, H - h * .56, tx, ty);
            cx.bezierCurveTo(tx - sw * .55 + g.w * .09, H - h * .54, x + g.w * .74, H - h * .28, x + g.w * .42, B);
            cx.closePath();
          });
          cx.rect(0, H - l.band, W, l.band + 2);
          cx.fillStyle = l.paint;
          cx.fill();
        });
      }
      function tick(now) { raf = requestAnimationFrame(tick); if (now - last < 32) return; last = now; show(now); }
      return {
        size: size,
        start: function () { if (!cx) return; size(); if (!W) return; show(performance.now()); if (!raf) raf = requestAnimationFrame(tick); },
        stop: function () { if (raf) cancelAnimationFrame(raf); raf = 0; }
      };
    })(fireCv);
    flames.appendChild(flameRow);
    var railBar = el("i", "day-rush-rail");
    var tickets = TICKET.map(function (t, i) {
      var k = el("i", "day-ticket"), lines = "";
      [[8, 34, 2.6], [17, 44, 1.5], [24, 38, 1.5], [31, 46, 1.5], [38, 30, 1.5], [45, 42, 1.5], [52, 24 + i * 2, 1.5]].forEach(function (r) { lines += '<rect x="8" y="' + r[0] + '" width="' + r[1] + '" height="' + r[2] + '"/>'; });
      k.innerHTML = '<svg viewBox="0 0 60 70" preserveAspectRatio="none"><path class="p" d="M0 0H60V66L55 70 50 66 45 70 40 66 35 70 30 66 25 70 20 66 15 70 10 66 5 70 0 66Z"/>' + lines + "</svg>";
      k.style.left = t[0] + "%"; k._r = t[1];
      rush.appendChild(k);
      return k;
    });
    rush.appendChild(railBar);
    rush.insertBefore(heat, rush.firstChild);
    rush.appendChild(flames);
    var noonWrap = $(".day-noon>.wrap"); noonWrap.parentNode.insertBefore(rush, noonWrap);

    /* 19 h: the kitchen at sunset, and on the pass one plate: the new dish, built gesture by gesture with the scroll */
    var pass = el("div", "day-pass"); pass.setAttribute("aria-hidden", "true");
    var dishBox = el("div", "day-night-dish");
    pass.appendChild(dishBox);
    var kit = el("div", "day-kit"), kitFar = el("div", "day-kfar"), kitNear = el("div", "day-knear"), kitPass = el("div", "day-kpass");
    kit.appendChild(el("i", "day-ksky")); kit.appendChild(kitFar); kit.appendChild(kitNear); kit.appendChild(kitPass);
    pass.insertBefore(kit, pass.firstChild);
    var KI = "#0F1240", CU = "#A25B33", CUD = "#7A4226", CUL = "#EDAA72", ST = "#39407F", CR = "#EFE7D2", SUN = "#F8C98A";
    var HANG = {
      pan: '<path fill="' + KI + '" d="M-3 0h6l2 52H-5z"/><circle cy="88" r="40" fill="' + CU + '"/><circle cy="88" r="33" fill="' + CUD + '"/><path fill="none" stroke="' + CUL + '" stroke-width="2.400" stroke-linecap="round" d="M-23 68A32 32 0 0 1 7 59"/>',
      pot: '<path fill="' + KI + '" d="M-3 0h6v42H-3z"/><rect x="-28" y="40" width="56" height="58" rx="5" fill="' + CU + '"/><rect x="-32" y="37" width="64" height="7" rx="3.500" fill="' + CUD + '"/><path fill="none" stroke="' + CUL + '" stroke-width="2.400" stroke-linecap="round" d="M-20 52V86"/>',
      ladle: '<path fill="none" stroke="' + KI + '" stroke-width="3.200" d="M0 0V98"/><path fill="' + KI + '" d="M-16 96a16 16 0 0 0 32 0z"/>',
      whisk: '<path fill="none" stroke="' + KI + '" stroke-width="4.500" stroke-linecap="round" d="M0 0V50"/><path fill="none" stroke="' + KI + '" stroke-width="1.700" d="M0 50C-18 70-18 106 0 114C18 106 18 70 0 50ZM0 50C-8 70-8 106 0 114C8 106 8 70 0 50Z"/>',
      spider: '<path fill="none" stroke="' + KI + '" stroke-width="3" d="M0 0V66"/><circle cy="88" r="22" fill="' + KI + '" fill-opacity=".28" stroke="' + KI + '" stroke-width="3"/><path fill="none" stroke="' + KI + '" stroke-width="1.100" d="M-20 80H20M-22 88H22M-20 96H20M-8 67V109M0 66V110M8 67V109"/>',
      board: '<rect x="-24" y="4" width="48" height="104" rx="9" fill="' + CU + '"/><rect x="-24" y="4" width="48" height="104" rx="9" fill="none" stroke="' + CUD + '" stroke-width="2"/><circle cy="18" r="5" fill="' + KI + '"/><path fill="none" stroke="' + CUD + '" stroke-opacity=".7" stroke-width="1.200" d="M-12 34V96M4 30V100M13 44V88"/>'
    };
    var BASE = {
      stock: function (c) { return '<rect x="-36" y="-78" width="72" height="78" rx="3" fill="' + c + '"/><rect x="-30" y="-78" width="12" height="78" fill="#BCC9FF" fill-opacity=".16"/><rect x="-39" y="-83" width="78" height="7" rx="3.500" fill="' + KI + '"/><path fill="none" stroke="' + KI + '" stroke-width="3.200" d="M-36-60h-9v15h9M36-60h9v15h-9"/><path fill="none" stroke="' + SUN + '" stroke-opacity=".6" stroke-width="1.600" d="M36-74V-2"/>'; },
      sauce: function (c) { return '<path fill="' + c + '" d="M-28-38H28L26-3a3 3 0 0 1-3 3H-23a3 3 0 0 1-3-3Z"/><rect x="-31" y="-42" width="62" height="5" rx="2.500" fill="' + KI + '"/><path fill="' + KI + '" d="M30-36L82-46l1 6-53 10Z"/><path fill="none" stroke="' + SUN + '" stroke-opacity=".6" stroke-width="1.600" d="M27-34L25-3"/>'; },
      saute: function (c) { return '<path fill="' + c + '" d="M-38-23H38L36-3a3 3 0 0 1-3 3H-33a3 3 0 0 1-3-3Z"/><rect x="-41" y="-27" width="82" height="5" rx="2.500" fill="' + KI + '"/><path fill="' + KI + '" d="M-40-22L-92-30l-1 6 53 8Z"/>'; },
      round: function (c) { return '<path fill="' + c + '" d="M-44-30H44L42-3a3 3 0 0 1-3 3H-39a3 3 0 0 1-3-3Z"/><path fill="' + KI + '" d="M-46-30C-44-48-18-54 0-54S44-48 46-30Z"/><rect x="-5" y="-61" width="10" height="8" rx="3" fill="' + KI + '"/><path fill="none" stroke="#BCC9FF" stroke-opacity=".34" stroke-width="1.500" stroke-linecap="round" d="M-32-37C-27-43-18-47-9-48"/><path fill="none" stroke="' + KI + '" stroke-width="3.200" d="M-44-23h-8v11h8M44-23h8v11h-8"/>'; },
      crock: function () { return '<path fill="none" stroke="' + KI + '" stroke-width="3" stroke-linecap="round" d="M-8-36L-20-94M6-36L10-104M-1-36L-3-86"/><ellipse cx="-22" cy="-100" rx="7" ry="10" fill="' + KI + '" transform="rotate(-12 -22 -100)"/><rect x="2" y="-122" width="17" height="21" rx="4" fill="' + KI + '"/><path fill="' + KI + '" d="M-13-92h20l-2 8h-16z"/><rect x="-18" y="-40" width="36" height="40" rx="4" fill="' + KI + '"/><path fill="none" stroke="' + SUN + '" stroke-opacity=".6" stroke-width="1.600" d="M18-36V-3"/>'; },
      oil: function () { return '<path fill="' + KI + '" d="M-10 0a2 2 0 0 1-2-2V-30q0-6 6-8l3-14h6l3 14q6 2 6 8V-2a2 2 0 0 1-2 2Z"/><path fill="none" stroke="' + KI + '" stroke-width="2.400" stroke-linecap="round" d="M2-52L17-67"/><path fill="none" stroke="' + KI + '" stroke-width="2.600" d="M12-30h7v16h-7"/><path fill="none" stroke="' + SUN + '" stroke-opacity=".6" stroke-width="1.400" d="M12-36V-3"/>'; },
      jar: function () { return '<rect x="-14" y="-34" width="28" height="34" rx="5" fill="' + KI + '" fill-opacity=".85"/><rect x="-14" y="-18" width="28" height="18" rx="4" fill="' + CU + '"/><rect x="-12" y="-41" width="24" height="8" rx="2" fill="#C9A44C"/><path fill="none" stroke="' + SUN + '" stroke-opacity=".6" stroke-width="1.300" d="M14-30V-4"/>'; },
      mill: function () { return '<path fill="' + KI + '" d="M-11 0C-14-14-6-24-7-34C-8-40-12-44-10-52C-8-60 8-60 10-52C12-44 8-40 7-34C6-24 14-14 11 0Z"/><circle cy="-62" r="4" fill="' + KI + '"/>'; },
      plates: function () { for (var o = "", k = 0; k < 8; k++) o += '<rect x="' + (-38 + (k % 3 == 1 ? 1.5 : 0)) + '" y="' + (-5 - k * 5) + '" width="76" height="4" rx="2" fill="' + CR + '"/><rect x="-26" y="' + (-1.2 - k * 5) + '" width="52" height="1.200" fill="#6E67A0"/>'; return o; },
      bowls: function () { return '<path fill="' + CR + '" d="M-30-34h60C28-14 16 0 0 0S-28-14-30-34Z"/><path fill="' + CR + '" d="M-32-44h64C30-30 22-22 0-22S-30-30-32-44Z" stroke="#6E67A0" stroke-width="1"/><path fill="' + CR + '" d="M-34-54h68C32-40 24-32 0-32S-32-40-34-54Z" stroke="#6E67A0" stroke-width="1"/>'; },
      tin: function () { return '<rect x="-17" y="-44" width="34" height="44" rx="2" fill="' + KI + '"/><rect x="-19" y="-49" width="38" height="7" rx="2" fill="#C9A44C"/><rect x="-11" y="-30" width="22" height="16" fill="' + CR + '"/>'; }
    };
    function at(x, y, k, c, rot) { return '<g transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + k.toFixed(3) + ")" + (rot ? " rotate(" + rot + ")" : "") + '">' + c + "</g>"; }
    function kitchen(W, H, wide, cords, textTop) {
      var u = wide ? clamp(Math.min(H / 640, W / 1300), .7, 1.25) : clamp(W / 700, .5, .8), ry = Math.round(Math.min(H * .74, textTop - 26 * u)), wx = Math.round(W * (wide ? .62 : .6)), o = 44, far = "", near = "", fx = "";
      /* hang or stand things in a row, never behind the cord of a lamp; thin things never along a window bar either */
      var bars = (wide ? [.155, .31, .465] : [.2, .4]).map(function (b) { return W * b; }), clear = cords.concat(bars).sort(function (a, b) { return a - b; });
      function row(a, b, items, draw) {
        var cur = a;
        items.forEach(function (it) {
          var hw = it.w * u / 2, x = cur + hw;
          (it.w < 40 ? clear : cords).forEach(function (c) { if (Math.abs(x - c) < hw + 7) x = c + hw + 7; });   /* left to right: one pass is enough */
          if (x + hw <= b) { draw(x, it); cur = x + hw + (it.g || 12) * u; }
        });
      }
      /* far: the sun going down over the roofs */
      far += '<circle cx="' + W * .3 + '" cy="' + (ry - H * .13) + '" r="' + H * .085 + '" fill="#FFE6AE"/>';
      var roofs = [[.07, .1, 0], [.05, .15, 1], [.08, .08, 0], [.04, .17, 2], [.09, .11, 1], [.06, .07, 0], [.07, .14, 1], [.05, .1, 2], [.08, .16, 0], [.06, .09, 1], [.07, .13, 0], [.09, .08, 1], [.06, .12, 0]];
      [["#8E5F88", 0, 1.1], ["#4B3E7E", 1, .86]].forEach(function (t, ti) {
        var x = -40, path = "M-40 " + ry, win = "";
        for (var n = 0; x < wx + 40; n++) {
          var r = roofs[(n + ti * 5) % roofs.length], w = r[0] * Math.max(W, 900) * .8, h = r[1] * H * t[2];
          var top = ry - h, slope = w * .16;
          path += "L" + x.toFixed(0) + " " + (top + slope * .9).toFixed(0) + "L" + (x + slope).toFixed(0) + " " + top.toFixed(0);
          if (r[2]) path += "H" + (x + w * .3).toFixed(0) + "V" + (top - h * .16).toFixed(0) + "H" + (x + w * .38).toFixed(0) + "V" + top.toFixed(0);
          path += "H" + (x + w - slope).toFixed(0) + "L" + (x + w).toFixed(0) + " " + (top + slope * .9).toFixed(0);
          if (ti) for (var q = 0; q < 3; q++) if ((n * 3 + q * 5) % 4 != 1) win += '<rect x="' + (x + w * (.22 + q * .24)).toFixed(0) + '" y="' + (top + slope + 6 + ((q + n) % 2) * 14 * u).toFixed(0) + '" width="' + (5 * u).toFixed(1) + '" height="' + (8 * u).toFixed(1) + '" fill="#FFD68C"/>';
          x += w;
        }
        far += '<path fill="' + t[0] + '" d="' + path + "L" + (x + 40).toFixed(0) + " " + ry + 'Z"/>' + win;
      });
      /* near: the wall, the hood and the window frame */
      var hx = W * (wide ? .8 : .8), hw = W * (wide ? .3 : .36), hy = Math.round(H * (wide ? .42 : .36));
      near += '<defs><pattern id="kTile" width="' + 34 * u + '" height="' + 18 * u + '" patternUnits="userSpaceOnUse"><path d="M0 0H' + 34 * u + "M0 " + 9 * u + "H" + 34 * u + "M0 0V" + 9 * u + "M" + 17 * u + " " + 9 * u + "V" + 18 * u + '" stroke="#BCC9FF" stroke-opacity=".09" stroke-width="1" fill="none"/></pattern><linearGradient id="kWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC979" stop-opacity=".26"/><stop offset="1" stop-color="#FFC979" stop-opacity="0"/></linearGradient><linearGradient id="kBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191D58"/><stop offset="1" stop-color="#0F1240"/></linearGradient></defs>';
      near += '<rect x="' + wx + '" y="-5" width="' + (W - wx + o * 2) + '" height="' + (ry + 5) + '" fill="#191C55"/><rect x="' + wx + '" y="-5" width="' + (W - wx + o * 2) + '" height="' + (ry + 5) + '" fill="url(#kTile)"/>';
      near += '<path fill="url(#kWarm)" d="M' + (hx - hw * .48) + " " + hy + "H" + (hx + hw * .48) + "L" + (hx + hw * .56) + " " + ry + "H" + (hx - hw * .56) + 'Z"/>';
      /* the bars of the window */
      bars.forEach(function (b) { near += '<rect x="' + (b - 2.5) + '" y="-5" width="5" height="' + (ry + 5) + '" fill="' + KI + '"/>'; });
      near += '<rect x="-' + o + '" y="' + Math.round(H * .35) + '" width="' + (wx + o) + '" height="4" fill="' + KI + '"/><rect x="' + (wx - 5) + '" y="-5" width="11" height="' + (ry + 5) + '" fill="' + KI + '"/>';
      /* the hood */
      near += '<path fill="#2B3077" d="M' + (hx - hw * .17) + " -5H" + (hx + hw * .17) + "V" + H * .13 + "L" + (hx + hw * .5) + " " + (hy - 12 * u) + "H" + (hx - hw * .5) + "L" + (hx - hw * .17) + " " + H * .13 + 'Z"/><path fill="#BCC9FF" fill-opacity=".1" d="M' + (hx - hw * .17) + " -5H" + (hx - hw * .08) + "V" + H * .13 + "L" + (hx - hw * .3) + " " + (hy - 12 * u) + "H" + (hx - hw * .5) + "L" + (hx - hw * .17) + " " + H * .13 + 'Z"/>';
      near += '<rect x="' + (hx - hw * .52) + '" y="' + (hy - 13 * u) + '" width="' + hw * 1.04 + '" height="' + 13 * u + '" rx="2" fill="#4A5196"/><path d="M' + (hx - hw * .17) + " " + H * .13 + "H" + (hx + hw * .17) + '" stroke="#BCC9FF" stroke-opacity=".28" stroke-width="1.500" fill="none"/>';
      [-.3, 0, .3].forEach(function (d) { near += '<rect x="' + (hx + hw * d - 24 * u) + '" y="' + hy + '" width="' + 48 * u + '" height="' + 3.5 * u + '" rx="1.500" fill="#FFE4A8"/>'; });
      /* the rack of pans, and the shelves against the window */
      var rx = wide ? [.255, .595] : [.25, .585], ry0 = Math.round(H * .16), rods = [W * (rx[0] + .015), W * (rx[1] - .015)].map(function (x, i) { (i ? clear.slice().reverse() : clear).forEach(function (c) { if (Math.abs(x - c) < 26) x = c + (i ? -26 : 26); }); return x; });
      near += '<path d="M' + rods[0] + " -5V" + ry0 + "M" + rods[1] + " -5V" + ry0 + '" stroke="' + KI + '" stroke-width="2.500"/><rect x="' + W * rx[0] + '" y="' + (ry0 - 2.5) + '" width="' + W * (rx[1] - rx[0]) + '" height="5" rx="2.500" fill="' + KI + '"/>';
      row(W * rx[0] + 12 * u, W * rx[1], wide ? [{ n: "pan", k: 1, w: 82, g: 34 }, { n: "ladle", k: 1, w: 34, g: 30 }, { n: "pot", k: .95, w: 62, g: 34 }, { n: "whisk", k: 1, w: 30, g: 34 }, { n: "pan", k: .72, w: 60, g: 30 }, { n: "spider", k: 1, w: 46, g: 30 }, { n: "board", k: .82, w: 42 }] : [{ n: "pan", k: .95, w: 78, g: 16 }, { n: "ladle", k: 1, w: 34, g: 14 }, { n: "pot", k: .9, w: 60 }], function (x, h) { near += at(x, ry0, u * h.k, HANG[h.n]); });
      (wide ? [{ y: .5, a: .015, b: .225, it: [{ n: "plates", k: 1, w: 78, g: 14 }, { n: "bowls", k: .9, w: 62, g: 14 }, { n: "jar", k: 1.1, w: 32, g: 12 }, { n: "jar", k: .9, w: 26, g: 12 }, { n: "tin", k: 1, w: 38 }] }, { y: .27, a: .015, b: .135, it: [{ n: "tin", k: 1, w: 38, g: 14 }, { n: "jar", k: 1.2, w: 34, g: 14 }, { n: "bowls", k: .72, w: 50 }] }] : [{ y: .5, a: .015, b: .3, it: [{ n: "plates", k: .9, w: 70, g: 8 }, { n: "bowls", k: .85, w: 58, g: 8 }, { n: "jar", k: 1, w: 28 }] }]).forEach(function (sh) {
        var sy = Math.round(Math.min(H * sh.y, ry - (.5 - sh.y) * H - 146 * u));   /* always clear of what stands on the range */
        row(W * sh.a + 8 * u, W * sh.b, sh.it, function (x, i) { near += at(x, sy, u * i.k, BASE[i.n](KI)); });
        near += '<rect x="' + W * sh.a + '" y="' + sy + '" width="' + W * (sh.b - sh.a) + '" height="' + 6 * u + '" rx="1.500" fill="' + KI + '"/>';
      });
      /* what stands on the range */
      var burn = [];
      (wide ? [[.05, "crock"], [.1, "oil"], [.13, "oil", .84], [.175, "mill"], [.25, "plates", .86], [.34, "jar", 1.1], [.375, "jar", .84], [.48, "round", .96, KI], [.565, "sauce", .86, KI], [.685, "saute", 1, CU, 1], [.77, "stock", 1.08, ST, 1], [.865, "round", .94, CU, 1], [.945, "sauce", .92, ST, 1]] : [[.07, "crock", .9], [.2, "oil"], [.27, "jar"], [.42, "sauce", .9, KI], [.72, "stock", 1, ST, 1], [.9, "sauce", .8, CU, 1]]).forEach(function (r) {
        var x = W * r[0], k = u * (r[2] || 1);
        near += at(x, ry, k, BASE[r[1]](r[3] || KI));
        if (r[4]) burn.push([x, k, r[1]]);
      });
      /* the range itself: doors, handles, knobs */
      var bh = H - ry;
      near += '<rect x="-' + o + '" y="' + ry + '" width="' + (W + o * 2) + '" height="' + (bh + 4) + '" fill="url(#kBar)"/><rect x="-' + o + '" y="' + (ry - 2) + '" width="' + (W + o * 2) + '" height="' + 7 * u + '" fill="#555CA6"/><rect x="-' + o + '" y="' + (ry - 2) + '" width="' + (W + o * 2) + '" height="1.500" fill="#DDE3FF" fill-opacity=".7"/>';
      /* each door: width, handle, window (1 dark, 2 lit). Plain behind the words */
      var dx = -10, doors = wide ? [[.33, 1, 0], [.12, 1, 0], [.19, 1, 2], [.06, 1, 0], [.3, 0, 0]] : [[.46, 0, 0], [.54, 0, 0]], dt = ry + 9 * u + 16 * u;
      doors.forEach(function (d) {
        var w = W * d[0];
        near += '<rect x="' + (dx + 3).toFixed(1) + '" y="' + dt + '" width="' + (w - 6).toFixed(1) + '" height="' + (H - dt + 8) + '" rx="2" fill="#191D5C" stroke="#BCC9FF" stroke-opacity=".14"/>';
        if (d[1]) near += '<rect x="' + (dx + w * .14).toFixed(1) + '" y="' + (dt + 8 * u) + '" width="' + (w * .72).toFixed(1) + '" height="' + 4.500 * u + '" rx="2" fill="#C9A44C"/>';
        if (d[2]) near += '<rect x="' + (dx + w * .2).toFixed(1) + '" y="' + (dt + 24 * u) + '" width="' + (w * .6).toFixed(1) + '" height="' + Math.min(52 * u, H - dt - 34 * u).toFixed(1) + '" rx="3" fill="#E8964A" fill-opacity=".62" stroke="#BCC9FF" stroke-opacity=".2"/>';
        dx += w;
      });
      for (var kx = W * (wide ? .46 : .62), kEnd = W * (wide ? .8 : .98); kx < kEnd; kx += 46 * u) near += '<circle cx="' + kx.toFixed(1) + '" cy="' + (ry + 15 * u) + '" r="' + 4.500 * u + '" fill="#C9A44C"/>';
      /* tickets waiting on the rail: at head height, on a bar hung from the window frame, clear of the sun and of what stands on the range */
      var tRail = Math.round(hy + (ry - hy) * .1), tA = W * .36, tB = W * (wide ? .6 : .59), tTop = Math.round(H * .35) + 4, tStems = [tA + 10 * u, tB - 10 * u].map(function (x, i) { (i ? bars.slice().reverse() : bars).forEach(function (c) { if (Math.abs(x - c) < 9) x = c + (i ? -9 : 9); }); return x; });
      near += '<path d="M' + tStems[0] + " " + tTop + "V" + tRail + "M" + tStems[1] + " " + tTop + "V" + tRail + '" stroke="' + KI + '" stroke-width="2.500"/>';
      row(tA + 12 * u, tB - 8 * u, (wide ? [[74, -2], [96, 2], [62, -1], [88, 3], [70, -2]] : [[70, -2], [86, 2], [62, -2]]).map(function (t) { return { w: 34, g: wide ? 30 : 22, l: t[0], r: t[1] }; }), function (x, t) {
        var c = '<path fill="#FFFEF8" d="M-17 0H17V' + t.l + 'l-4-3-4 3-4-3-5 3-4-3-4 3-4-3-5 3Z"/><path stroke="#2E2F27" stroke-opacity=".55" stroke-width="1.500" fill="none" d="M-11 11H4M-11 21H11M-11 30H8M-11 39H11' + (t.l > 72 ? "M-11 50H6M-11 60H11" : "") + '"/>';
        near += at(x, tRail + 2, u, c, t.r);
      });
      near += '<rect x="' + tA + '" y="' + tRail + '" width="' + (tB - tA) + '" height="' + 6 * u + '" rx="2" fill="' + KI + '"/>';
      /* small things that move: blue flames under the pans, steam from the pot */
      burn.forEach(function (b) {
        var w = (b[2] == "stock" ? 58 : b[2] == "saute" ? 62 : 54) * b[1];
        for (var q = 0; q < 5; q++) fx += '<i class="day-kflame" style="left:' + (o + b[0] - w / 2 + q * w / 4 - 3 * u).toFixed(1) + "px;top:" + (ry - 9 * u).toFixed(1) + "px;width:" + (6 * u).toFixed(1) + "px;height:" + (10 * u).toFixed(1) + "px;animation-delay:-" + ((q * 37 + Math.round(b[0])) % 100) / 100 + 's"></i>';
        if (b[2] == "stock") for (var v = 0; v < 3; v++) fx += '<i class="day-ksteam" style="left:' + (o + b[0] - 26 * b[1] + v * 18 * b[1]).toFixed(1) + "px;top:" + (ry - 170 * b[1]).toFixed(1) + "px;width:" + (26 * u).toFixed(1) + "px;height:" + (84 * u).toFixed(1) + "px;animation-delay:-" + v * 1.3 + 's"></i>';
      });
      kitFar.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">' + far + "</svg>";
      kitNear.style.cssText = "left:-" + o + "px;width:" + (W + o * 2) + "px;height:" + H + "px";
      kitNear.innerHTML = '<svg width="' + (W + o * 2) + '" height="' + H + '" viewBox="-' + o + " 0 " + (W + o * 2) + " " + H + '" aria-hidden="true">' + near + "</svg>" + fx;
      return ry;
    }

    /* the plate: drawn layers, the food in the same cartoon as the ingredients at 9 h, each laid out in plate units (0,0 is the plate's centre) and moved by the same scroll */
    var DM = {"plate":{"x":-232.0,"y":-87.33,"w":472.0,"h":207.33},"puree":{"x":-132.67,"y":-27.0,"w":269.33,"h":63.0},"wedge":{"x":-61.0,"y":-42.0,"w":144.0,"h":83.0},"cream":{"x":-39.33,"y":5.67,"w":157.0,"h":49.33},"leaf1":{"x":-44.33,"y":-25.33,"w":49.0,"h":29.0},"leaf2":{"x":-25.33,"y":-24.67,"w":58.33,"h":17.67},"leaf3":{"x":17.0,"y":-26.33,"w":41.33,"h":26.33},"nuts1":{"x":-51.0,"y":-39.33,"w":114.33,"h":47.67},"nuts2":{"x":-112.67,"y":-24.33,"w":223.0,"h":56.0},"stream":{"x":55.0,"y":-108.0,"w":10.0,"h":144.0},"spoon":{"x":-6.33,"y":-234.0,"w":179.33,"h":237.0},"dollop":{"x":-14.67,"y":-41.33,"w":64.0,"h":42.67},"slice":{"x":-91.33,"y":-94.33,"w":341.67,"h":122.67},"pot":{"x":-6.33,"y":-41.67,"w":277.0,"h":103.0}};
    var dRoot = el("div", "d-root"); dishBox.appendChild(dRoot);
    function dLayer(k, ox, oy) {
      var m = DM[k], i = new Image();
      i.alt = ""; i.decoding = "async"; i.className = "d-l"; i.setAttribute("data-k", k);
      i.style.left = m.x + "px"; i.style.top = m.y + "px"; i.style.width = m.w + "px"; i.style.height = m.h + "px";
      i.style.transformOrigin = ((ox || 0) - m.x) + "px " + ((oy || 0) - m.y) + "px";
      dRoot.appendChild(i);
      return { n: i, m: m };
    }
    /* back to front. A tool's own 0,0 is the point it works from: the spoon's tip, the slice's edge, the casserole's lip */
    var D = {
      root: dRoot, plate: dLayer("plate"), puree: dLayer("puree"), cream: dLayer("cream", 60, 30), slice: dLayer("slice"), wedge: dLayer("wedge"),
      nuts2: dLayer("nuts2"), leaves: ["leaf1", "leaf2", "leaf3"].map(function (k) { return dLayer(k); }), nuts1: dLayer("nuts1"),
      stream: dLayer("stream"), pot: dLayer("pot"), spoon: dLayer("spoon"), dollop: dLayer("dollop")
    };
    /* only the staged day shows the plate, so its layers load when it starts; decode() is a warm-up, and a refusal just leaves the browser to decode on first show */
    function dLoad() { [].forEach.call(dRoot.children, function (i) { if (i.src) return; i.src = "../media/dish/" + i.getAttribute("data-k") + ".webp?v=2"; if (i.decode) i.decode().catch(function () {}); }); }
    function dPut(l, on, x, y, a, sc, op) {
      put(l.n, "display", on ? "block" : "none");
      if (!on) return;
      put(l.n, "transform", "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + a.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")");
      put(l.n, "opacity", op.toFixed(3));
    }
    function swipeY(x) { return 1 - .17 * x + 3 * (x / 125) * (x / 125); }    /* the middle of the purée's swipe */
    var DW = [1.5, 1, 1.1, 1];    /* how much scroll each gesture takes */
    function plating(pos, a, b) {
      var sum = DW.reduce(function (x, y) { return x + y; }), at = a, K = DW.map(function (w) { var d = (b - a) * w / sum, k = seg(pos, at, at + d); at += d; return k; }), k;
      /* 1. a spoonful of chestnut purée is set down, and the back of the spoon pulls it into a swipe. It is too thick to pour */
      k = K[0];
      var drag = ease(seg(k, .3, .82)), sx = -118 + 246 * drag, half = Math.max(3, 17 * (1 - Math.pow(Math.abs(sx) / 135, 4))), tx = sx - 12, ty = swipeY(sx) + half;
      var inA = 1 - ease(seg(k, 0, .22)), outA = ease(seg(k, .84, 1)), far = inA + outA, sOp = seg(k, 0, .08) * (1 - seg(k, .9, 1));
      dPut(D.spoon, sOp > 0, tx + 120 * far, ty - 170 * far, 0, 1, sOp);
      dPut(D.dollop, sOp > 0 && drag < .92, tx + 120 * far, ty - 170 * far, 0, 1 - .78 * drag, sOp);
      var pOn = k > .24, m = D.puree.m;
      dPut(D.puree, pOn, 0, 0, 0, 1, 1);
      if (pOn) {
        if (k >= .82) put(D.puree.n, "clipPath", "none");
        else {
          /* the edge of what has been swiped runs along the spoon's bowl, so the bowl hides it */
          var slant = 35 / 48, eTop = tx + (ty - m.y) * slant - m.x, eBot = tx - (m.y + m.h - ty) * slant - m.x;
          put(D.puree.n, "clipPath", "polygon(0 0," + eTop.toFixed(1) + "px 0," + eBot.toFixed(1) + "px " + m.h + "px,0 " + m.h + "px)");
        }
      }
      /* 2. the roast half-moon comes in on the fish slice, is set down, and the slice slides out from under it */
      k = K[1];
      var wA = 1 - ease(seg(k, 0, .32)), wDown = ease(seg(k, .32, .5)), wOut = ease(seg(k, .56, .94)), wx = 200 * wA, wy = -12 * (1 - wDown) - 44 * wA;
      dPut(D.wedge, k > 0, wx, wy, 0, 1, seg(k, 0, .08));
      dPut(D.slice, k > 0 && k < 1, wx + 2 + 250 * wOut, wy + 18 - 34 * wOut, 0, 1, seg(k, 0, .08) * (1 - seg(wOut, .62, 1)));
      /* 3. the cream: a liquid, so this one does pour, from the little casserole */
      k = K[2];
      var cA = 1 - ease(seg(k, 0, .2)) + ease(seg(k, .78, 1)), tilt = -6 - 24 * ease(seg(k, .14, .28)) + 24 * ease(seg(k, .62, .76));
      var cOp = seg(k, 0, .08) * (1 - seg(k, .92, 1));
      dPut(D.pot, cOp > 0, 60 + 150 * cA, -104 - 80 * cA, tilt, 1, cOp);
      var falls = seg(k, .26, .34), lifts = seg(k, .62, .72);
      dPut(D.stream, k > .26 && k < .72, 0, 0, 0, 1, 1);
      if (k > .26 && k < .72) put(D.stream.n, "clipPath", "inset(" + (lifts * 100).toFixed(1) + "% 0 " + ((1 - falls) * 100).toFixed(1) + "% 0)");
      var ck = ease(seg(k, .32, .72));
      dPut(D.cream, k > .32, 0, 0, 0, .06 + .94 * ck, seg(k, .32, .38));
      /* 4. crisp sage, then crushed hazelnuts */
      k = K[3];
      D.leaves.forEach(function (l, i) {
        var g = ease(seg(k, i * .13, .3 + i * .13));
        dPut(l, g > 0, 0, -70 * (1 - g), (i - 1) * 24 * (1 - g), 1, seg(k, i * .13, .08 + i * .13));
      });
      var n2 = ease(seg(k, .5, .76)), n1 = ease(seg(k, .62, .92));
      dPut(D.nuts2, n2 > 0, 0, -34 * (1 - n2), 0, 1, seg(k, .5, .58));
      dPut(D.nuts1, n1 > 0, 0, -34 * (1 - n1), 0, 1, seg(k, .62, .7));
    }
    var duskWrap = $(".day-dusk>.wrap"); duskWrap.parentNode.insertBefore(pass, duskWrap);

    /* 15 h 30: the ticket hangs from the top of the screen, and each ingredient leaves its row for the plate */
    var paper = el("i", "day-paper"); paper.setAttribute("aria-hidden", "true");
    billEl.insertBefore(paper, billEl.firstChild);
    var flyers = SV.gars.map(function (g) {
      var f = el("span", "day-fly"), id = g.getAttribute("data-id");
      f.setAttribute("data-id", id); f.setAttribute("aria-hidden", "true"); f.appendChild(draw(id));
      split.appendChild(f);
      return { el: f, x0: 0, y0: 0, x1: 0, y1: 0, s: 1 };
    });
    var serveS1 = 1, rail = peg && $(".day-rail", peg), hooks = rail ? [].slice.call(rail.querySelectorAll("path")).slice(1) : [], lampEl = peg && $(".day-lamp", peg), coneEl = lampEl && $(".day-cone", lampEl), darkEl = peg && $(".day-dark", peg), dishS = 1, dishX = 0;
    function bx(e, stop) { var x = 0, y = 0, n = e; while (n && n !== stop) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x: x, y: y, w: e.offsetWidth, h: e.offsetHeight }; }
    var cue = $(".day-cue"); if (cue) cue.id = "dayCue";
    if (plate) plate.addEventListener("dayhop", function () { paint(); });

    var on = false, L = null, blocks = [], queued = false, f = 0, hz = 0, hb = 0, K = 1, stageTop = 0, range = 1, railW = 0, liftBy = 0, shown = -1, sceneNow = -1, pos = 0, lastSize = "", tween = 0;

    function buildMarks() {
      marks.forEach(function (m) { m.parentNode.removeChild(m); });
      marks = L.marks.map(function (at, i) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "day-mark"; b.tabIndex = -1; b.setAttribute("aria-hidden", "true"); b.style.left = (at / L.len * 100) + "%";
        b.addEventListener("click", function () { stopTween(); go(L.marks[i]); });
        line.insertBefore(b, puck);
        return b;
      });
    }
    function measure() {
      var w = window.innerWidth; f = probe.offsetHeight;
      if (f < 520 || (w >= 1000 && f < 600)) return false;
      var next = w >= 1000 ? WIDE : NARROW;
      if (next !== L) { restore(); L = next; root.classList.toggle("day-wide", L === WIDE); root.classList.toggle("day-narrow", L === NARROW); buildMarks(); }
      hz = Math.round(f * L.hz);
      var S = stage.style, h9 = hours[0], fs = parseFloat(getComputedStyle(h9.h).fontSize), mark = document.createElement("span");
      S.setProperty("--f", f + "px"); S.setProperty("--hz", hz + "px");
      mark.style.cssText = "display:inline-block;width:0;height:0"; h9.inner.appendChild(mark);
      hb = Math.round(mark.getBoundingClientRect().bottom - h9.inner.getBoundingClientRect().top + fs * .012);
      h9.inner.removeChild(mark);
      S.setProperty("--hb", hb + "px");
      S.setProperty("--top", Math.round(clamp(f * .07, 28, 64)) + "px");
      S.setProperty("--ring", Math.floor(L === WIDE ? Math.min(480, hz - 122) : Math.min(440, w - 32, hz - hb - 150)) + "px");
      var pegS = Math.floor(L === WIDE ? Math.min(470, (hz - 64) / 1.26) : Math.min(w * .62, 300, (hz - hb - 90) / 1.26));
      S.setProperty("--peg", pegS + "px"); S.setProperty("--pegtop", Math.round(pegS * .26) + "px");
      /* the lamp's light stops where the table starts */
      var capEl = peg && $(".day-peg-cap", peg), endY = L === WIDE ? (hz - Math.round(pegS * .26)) / pegS * 96 : 91.2 + (capEl ? capEl.offsetHeight : 24) / pegS * 96 + 3, halfW = (endY + 8.5) * .36;
      if (coneEl) coneEl.setAttribute("d", "M41.2-8.5H53.8L" + (47.5 + halfW).toFixed(1) + " " + endY.toFixed(1) + (L === WIDE ? "H" + (47.5 - halfW).toFixed(1) : "A" + halfW.toFixed(1) + " " + (halfW * .14).toFixed(1) + " 0 0 1 " + (47.5 - halfW).toFixed(1) + " " + endY.toFixed(1)) + "z");
      K = (f - hz - 6) / hb;
      track.style.height = Math.round(L.len * L.unit * f + stage.offsetHeight) + "px";
      stageTop = track.getBoundingClientRect().top + window.pageYOffset;
      range = track.offsetHeight - stage.offsetHeight;
      railW = line.offsetWidth;
      /* the rest of the bill starts where the total ends up on a phone, and the total lifts by the height of the rows */
      var tot = totEl, gut = L === NARROW ? 16 : 24, W = breakWrap.clientWidth - gut * 2, topPx = Math.round(clamp(f * .07, 28, 64));
      S.setProperty("--rowdisc", Math.floor(L === WIDE ? clamp((hz - topPx - 150) / 6 - 10, 28, 46) : 26) + "px");
      if (L === WIDE) {
        /* three columns: the ticket, the plate with the price under it, the tool over the hour */
        var T = Math.round(clamp(W * .31, 330, 430)), gapC = Math.round(clamp(W * .025, 20, 44)), hw = hours[2].h.offsetWidth, colC = W - T - gapC * 2 - Math.max(hw, 340);
        S.setProperty("--tkt", T + "px"); S.setProperty("--bbw", colC + "px"); S.setProperty("--bbx", (T + gapC) + "px");
        var bbH = billB.offsetHeight, P = Math.floor(Math.min(colC, hz - bbH - 34));
        if (P < 200) return false;
        S.setProperty("--svp", P + "px"); S.setProperty("--svx", (gut + T + gapC + Math.round((colC - P) / 2)) + "px"); S.setProperty("--svy", "10px");
        S.setProperty("--bby", (P + 18 - topPx) + "px"); S.setProperty("--toolx", (gut + T + gapC * 2 + colC) + "px");
        S.setProperty("--paperh", (tot.offsetTop + tot.offsetHeight + topPx + 16) + "px");
        serveS1 = 1; liftBy = 0;
      } else {
        var aH = billA.offsetHeight, tH = tot.offsetHeight + 12, top = hz - hb - 14 - aH - tH, bH = billB.offsetHeight, avail = hz - hb - 14;
        var bT = Math.max(8, top), blockTop = avail - tH - 4 - bH, P2 = Math.floor(Math.min(w - 32, blockTop - 10));
        S.setProperty("--billtop", bT + "px"); S.setProperty("--billb", (blockTop - bT + tH + 4) + "px");
        liftBy = bT + aH - blockTop;
        if (top < 8 || P2 < 120) return false;
        S.setProperty("--svp", P2 + "px"); S.setProperty("--svx", Math.round((w - P2) / 2) + "px"); S.setProperty("--svy", "6px");
        serveS1 = clamp((bT - 22) / P2, .3, 1);
        S.setProperty("--paperh", (aH + tH + 22) + "px");
      }
      SV.fit();
      flyers.forEach(function (fy, i) {
        var from = bx($(".day-disc", $$(".day-bill-a li")[i]), breakWrap), g = SV.gars[i], to = bx(g, breakWrap), sv = bx(SV.el, breakWrap), cx = sv.x + sv.w / 2, sy = sv.y;
        S.setProperty("--flyw", from.w + "px");
        var land = Math.round(to.w * serveS1);
        fy.el.style.width = fy.el.style.height = land + "px";
        fy.x0 = from.x + from.w / 2 - land / 2; fy.y0 = from.y + from.h / 2 - land / 2;
        fy.x1 = cx + (to.x + to.w / 2 - cx) * serveS1 - land / 2; fy.y1 = sy + (to.y + to.h / 2 - sy) * serveS1 - land / 2;
        fy.s0 = from.w / land;
      });
      fire.size();
      /* 19 h: the plate stands on the pass, or on a phone on top of the range, clear of the words */
      var dryK = kitchen(window.innerWidth, hz, L === WIDE, [], $(".day-dusk .day-line").getBoundingClientRect().top - pass.getBoundingClientRect().top);
      if (D) {
        dishS = L === WIDE ? clamp(Math.min(f / 720, window.innerWidth / 1280), .72, 1.4) : clamp(window.innerWidth / 550, .6, .95);
        dishX = window.innerWidth * (L === WIDE ? .4375 : .46);
        put(D.root, "transform", "translate(" + dishX.toFixed(1) + "px," + (L === WIDE ? hz + 41 * dishS : dryK - 48 * dishS).toFixed(1) + "px) scale(" + dishS.toFixed(3) + ")");
      }
      blocks = L.blocks.map(function (b) { var el = $(b[0]); return { el: el, a: b[1], b: b[2], c: b[3], d: b[4], y: b[5] === undefined ? 10 : b[5], tab: !!el.querySelector("a,button") }; });
      var at = stage.getBoundingClientRect().top, limit = L === WIDE ? hz + 2 : hz - hb + 14;
      return L.fit.every(function (s) {
        var el = $(s); if (!el) return true;
        var r = el.getBoundingClientRect();
        return r.top - at > -14 && r.bottom - at < limit + 14 && r.right <= w + 1;
      });
    }
    function sun(m) {
      var e = Math.sin(Math.PI * (m - 420) / 810);
      if (e > .05) return { k: Math.min(.3 / (e * e), K), a: -(m - 825) / 420 * 62, o: Math.min(1, (e - .05) / .12) };
      return { k: Math.min(.4, K), a: 0, o: seg(m, 1250, 1380) };   /* after dark, only the lamp over the pass */
    }
    function paint() {
      queued = false; if (!on) return;
      pos = clamp((window.pageYOffset - stageTop) / range, 0, 1) * L.len;
      var m = interp(L.time, pos), i, s = sun(m);
      /* the sky: two layers at most, the one on top fading in */
      var from = 0, fade = 0;
      for (i = 0; i < L.sky.length; i++) { if (pos >= L.sky[i][0]) { from = i; fade = seg(pos, L.sky[i][0], L.sky[i][1]); if (fade >= 1) { from = i + 1; fade = 0; } } }
      layers.forEach(function (l, n) {
        var o = n === from ? 1 : n === from + 1 ? fade : 0;
        put(l, "visibility", o > 0 ? "visible" : "hidden"); put(l, "opacity", o.toFixed(3));
      });
      var dusk = seg(pos, L.sky[3][0], L.sky[3][1]);
      put(tableA, "opacity", (1 - dusk).toFixed(3)); put(tableB, "opacity", dusk.toFixed(3));
      time.classList.toggle("pale", dusk > .5);
      /* the hours and their shadows */
      hours.forEach(function (h, n) {
        var r = L.hours[n], v = ease(seg(pos, r[0], r[1])) * (1 - ease(seg(pos, r[2], r[3])));
        put(h.inner, "transform", "translateY(" + ((1 - v) * 104).toFixed(2) + "%)");
        put(h.sh, "visibility", v > .004 ? "visible" : "hidden");
        if (v > .004) {
          var dk = n === 3 ? Math.min(s.k, .36) : s.k, da = n === 3 ? Math.max(s.a, -8) : s.a;
          put(h.sh, "transform", "skewX(" + da.toFixed(2) + "deg) scaleY(" + (-dk * v).toFixed(4) + ")");
          put(h.sh, "opacity", (n === 3 && L === NARROW ? 0 : h.base * s.o * v).toFixed(3));
        }
      });
      /* what each scene shows */
      blocks.forEach(function (b) {
        var up = ease(seg(pos, b.a, b.b)), dn = ease(seg(pos, b.c, b.d)), o = up * (1 - dn);
        put(b.el, "opacity", o.toFixed(3));
        if (b.el !== peg) put(b.el, "transform", "translateY(" + ((1 - up) * b.y - dn * b.y * .6).toFixed(2) + "px)");
        put(b.el, "pointerEvents", o > .6 ? "auto" : "none");
        /* nothing to reach by keyboard in it: gone means gone */
        if (!b.tab) put(b.el, "visibility", o > 0 ? "visible" : "hidden");
      });
      /* 9 h, on whichever ingredient is showing: the plate is set down, the pairings arrive one by one and overshoot, the whole ring turns slowly with the scroll, and it all gathers back in when the scene leaves */
      plate.classList.toggle("day-live", pos > L.fan[0] && pos < L.out[1]);
      var fa = L.fan[0], span = L.fan[1] - fa, k = ease(seg(pos, fa, L.fan[1])), gone = ease(seg(pos, L.out[0], L.out[1])), panel = $(".day-panel:not([hidden])", plate), ring = panel && $(".day-ring", panel);
      if (ring) {
        var turn = (seg(pos, fa, L.out[1]) - .5) * 10, rad = turn * Math.PI / 180, co = Math.cos(rad), si = Math.sin(rad);
        put($(".day-dish", panel), "transform", "rotate(" + ((1 - k) * -24 + turn * .3).toFixed(2) + "deg) scale(" + (.62 + .38 * k - .16 * gone).toFixed(3) + ")");
        put($(".day-orbit", panel), "transform", "rotate(" + turn.toFixed(2) + "deg)");
        put($(".day-orbit", panel), "opacity", (ease(seg(pos, fa + span * .5, L.fan[1])) * (1 - gone)).toFixed(3));
        var W = ring.offsetWidth, lis = $$(".day-pairs li", panel);
        lis.forEach(function (li, n) {
          var start = fa + span * .5 * n / lis.length, ki = seg(pos, start, start + span * .5), bk = ki - 1, r = (1 + 2.2 * bk * bk * bk + 1.2 * bk * bk) * (1 - gone * .4);
          var vx = (parseFloat(li.style.left) - 50) / 100 * W, vy = (parseFloat(li.style.top) - 50) / 100 * W;
          put(li, "transform", "translate(-50%,-50%) translate(" + ((vx * co - vy * si) * r - vx).toFixed(1) + "px," + ((vx * si + vy * co) * r - vy).toFixed(1) + "px) scale(" + (.5 + .5 * Math.min(1, ki * 1.4)).toFixed(3) + ")");
          put(li, "opacity", (Math.min(1, ki * 2.5) * (1 - gone)).toFixed(3));
        });
      }
      /* 12 h 30: tickets slap onto the rail one after the other, then the whole lot is torn away; the fire rises and dies with the scene */
      var RU = L.rush, ruOn = pos > RU[0] && pos < RU[3];
      rush.classList.toggle("live", ruOn);
      put(rush, "visibility", ruOn ? "visible" : "hidden");
      if (ruOn !== fireOn) { fireOn = ruOn; if (ruOn) fire.start(); else fire.stop(); }
      if (ruOn) {
        var ruGone = ease(seg(pos, RU[2], RU[3]));
        var ruUp = ease(seg(pos, RU[0], RU[0] + .3)) * (1 - ruGone);
        put(flameRow, "transform", "translateY(" + ((1 - ruUp) * 102).toFixed(1) + "%)");
        put(heat, "opacity", ruUp.toFixed(3));
        put(railBar, "transform", "translateY(" + (-(1 - ease(seg(pos, RU[0], RU[0] + .15)) * (1 - ruGone)) * 120).toFixed(1) + "%)");
        var ruStep = (RU[1] - RU[0] - .2) / tickets.length;
        tickets.forEach(function (k, i) {
          var st = RU[0] + .05 + ORDER.indexOf(i) * ruStep, ki = seg(pos, st, st + .16), b = ki > 0 ? backOut(ki) : 0;
          put(k, "transform", "translateY(" + ((b - 1) * 108 - ruGone * 108).toFixed(1) + "%) rotate(" + (k._r * (2 - b)).toFixed(2) + "deg)");
        });
      }
      /* 15 h 30 */
      var SVG = SV.el, SA = L.serve, RW = L.rows, svOn = pos > SA[0] && pos < SA[3], svIn = ease(seg(pos, SA[0], SA[1])), svOut = ease(seg(pos, SA[2], SA[3]));
      SVG.classList.toggle("live", svOn);
      put(SVG, "visibility", svOn ? "visible" : "hidden");
      if (svOn) {
        var svK = L.lift ? serveS1 + (1 - serveS1) * ease(seg(pos, L.lift[0], L.lift[1])) : 1;
        put(SVG, "opacity", (svIn * (1 - svOut)).toFixed(3));
        put(SVG, "transform", "rotate(" + ((1 - svIn) * -18).toFixed(2) + "deg) scale(" + (svK * (.66 + .34 * backOut(seg(pos, SA[0], SA[1]))) * (1 - .12 * svOut)).toFixed(3) + ")");
        put(SV.words, "opacity", ease(seg(pos, L.words[0], L.words[1])).toFixed(3));
        flyers.forEach(function (fy, i) {
          var end = RW[0] + RW[1] * (i + 1), kf = seg(pos, end - RW[1] * .35, end + RW[1] * .95), vis = kf > 0 && kf < 1;
          put(fy.el, "visibility", vis ? "visible" : "hidden");
          if (vis) {
            var e = ease(kf), hop = Math.sin(Math.PI * e) * 46;
            put(fy.el, "transform", "translate(" + (fy.x0 + (fy.x1 - fy.x0) * e).toFixed(1) + "px," + (fy.y0 + (fy.y1 - fy.y0) * e - hop).toFixed(1) + "px) rotate(" + ((1 - e) * -40).toFixed(1) + "deg) scale(" + (fy.s0 + (1 - fy.s0) * e).toFixed(3) + ")");
          }
          var kp = seg(pos, end + RW[1] * .8, end + RW[1] * 1.35);
          put(SV.gars[i], "opacity", kp > 0 ? "1" : "0");
          put(SV.gars[i], "transform", "scale(" + (kp > 0 ? backOut(kp) : .4).toFixed(3) + ")");
          SV.land(i, +ease(seg(pos, end + RW[1] * .6, end + RW[1] * 1.3)).toFixed(3));
        });
      }
      var PA = L.paper, paIn = seg(pos, PA[0], PA[1]), paOut = ease(seg(pos, PA[2], PA[3]));
      put(paper, "visibility", paIn > 0 && paOut < 1 ? "visible" : "hidden");
      put(paper, "transform", "translateY(" + ((paIn > 0 ? backOut(paIn) : 0) * 100 - 100).toFixed(2) + "%)");
      put(paper, "opacity", (1 - paOut).toFixed(3));
      /* 19 h: the empty plate comes along the pass, is built gesture by gesture, and goes through */
      var PS = L.pass, paOn = pos > PS[0] && pos < PS[3];
      pass.classList.toggle("live", paOn);
      put(pass, "visibility", paOn ? "visible" : "hidden");
      if (paOn) {
        var kOut = ease(seg(pos, PS[2] + .08, PS[3])), kIn = ease(seg(pos, PS[0], PS[0] + .3)), kDrift = seg(pos, PS[0], PS[3]) - .5;
        put(kit, "opacity", (kIn * (1 - kOut)).toFixed(3));
        put(kitNear, "transform", "translateX(" + (kDrift * -26).toFixed(1) + "px)");
        put(kitFar, "transform", "translateX(" + (kDrift * -10).toFixed(1) + "px)");
        if (D) {
          var dIn = seg(pos, PS[0] + .22, PS[1] - .02), dGone = ease(seg(pos, PS[2] + .02, PS[3]));
          put(dishBox, "transform", "translateX(" + (((dIn > 0 ? backOut(dIn) : 0) - 1) * (dishX + 240 * dishS) + dGone * (window.innerWidth - dishX + 240 * dishS)).toFixed(1) + "px)");
          plating(pos, L.dish[0], L.dish[1]);
        }
      }
      /* the bill: the total is the sum of the rows that have landed, and on a phone it climbs when the rows leave */
      var sum = 0;
      L.blocks.forEach(function (b, n) { var hit = /nth-child\((\d)\)/.exec(b[0]); if (hit && pos >= (b[1] + b[2]) / 2) sum += eur[+hit[1] - 1]; });
      if (sum !== shown) { shown = sum; count.textContent = money(sum); }
      if (L.lift) { var tot = $(".day-total"); put(tot, "transform", "translateY(" + (-liftBy * ease(seg(pos, L.lift[0], L.lift[1]))).toFixed(1) + "px)"); }
      /* the jacket moves when the room empties */
      if (jacket) {
        var x = seg(pos, L.jacket[0], L.jacket[1]), railK = ease(seg(pos, L.rail[0], L.rail[1])), lampK = seg(pos, L.lamp[0], L.lamp[1]);
        put(jacket, "transform", "translateX(" + ((1 - railK) * 60).toFixed(1) + "px) rotate(" + ((1 - railK) * -9 + 2.8 * Math.sin(x * 14) * Math.exp(-3.4 * x) * (x > 0 ? 1 : 0)).toFixed(2) + "deg)");
        put(rail, "transform", "translateX(" + ((1 - railK) * 60).toFixed(1) + "px)");
        hooks.forEach(function (h, i) {
          var xk = seg(pos, L.rail[1] - .12 + i * .05, L.rail[1] + .55 + i * .05);
          put(h, "transform", "rotate(" + (16 * Math.sin(xk * 15) * Math.exp(-4.2 * xk) * (xk > 0 ? 1 : 0)).toFixed(2) + "deg)");
        });
        /* the lamp stutters on, and only then is the jacket white */
        var lit2 = lampK < .28 ? 0 : lampK < .42 ? .75 : lampK < .55 ? .12 : lampK < .66 ? .9 : lampK < .72 ? .3 : 1;
        put(lampEl, "transform", "translateY(" + (-(1 - ease(seg(pos, L.rail[0], L.lamp[0]))) * 40).toFixed(1) + "%)");
        put(coneEl, "opacity", lit2);
        put(darkEl, "opacity", (1 - lit2).toFixed(2));
        peg.classList.toggle("live", pos > L.lamp[1]);
        if (L.shrink) { var sk = ease(seg(pos, L.shrink[0], L.shrink[1])); put(peg, "transform", "scale(" + (1 - sk * .25).toFixed(3) + ")"); }
      }
      /* the clock on its rail */
      $(".hh", clock).setAttribute("transform", "rotate(" + m / 2 + " 28 28)");
      $(".mm", clock).setAttribute("transform", "rotate(" + m * 6 + " 28 28)");
      put(puck, "transform", "translateX(" + (pos / L.len * railW).toFixed(1) + "px)");
      var scene = 0;
      for (i = 0; i < L.hours.length; i++) if (pos >= L.hours[i][0]) scene = i;
      if (scene !== sceneNow) { sceneNow = scene; speak(); }
    }
    function speak() {
      var said = $('[data-lang="' + (en() ? "en" : "fr") + '"]', hours[Math.max(0, sceneNow)].h);
      puck.setAttribute("aria-valuetext", said ? said.textContent : "");
      puck.setAttribute("aria-valuenow", String(Math.max(0, sceneNow)));
    }
    function schedule() {
      if (queued || !on) return; queued = true;
      if (window.requestAnimationFrame) requestAnimationFrame(paint);
      setTimeout(function () { if (queued) paint(); }, 120);   // a throttled or hidden view still lands on the right frame
    }
    function go(p) { window.scrollTo(0, stageTop + clamp(p / L.len, 0, 1) * range); if (on) paint(); }

    function start() {
      on = true; root.classList.add("day-on");
      puck.appendChild(clock); clock.hidden = false;
      lastSize = window.innerWidth + "x" + probe.offsetHeight;
      var ok = false;
      try { ok = measure(); if (ok) { dLoad(); shown = -1; sceneNow = -1; paint(); } }
      catch (e) { ok = false; if (window.console) console.warn("au-quotidien: the staged day is off, the plain page stays", e); }   /* the plain page is complete on its own */
      if (!ok) stop();
    }
    function stop() {
      if (on || root.classList.contains("day-on")) {
        on = false; restore(); SV.reset(); fire.stop(); fireOn = false;
        [rush, pass, SV.el, peg, plate].forEach(function (n) { if (n) n.classList.remove("live", "day-live"); });
        root.classList.remove("day-on", "day-wide", "day-narrow");
        track.style.height = ""; L = null;
        document.body.appendChild(clock);
        window.dispatchEvent(new Event("resize"));   // the plain page's clock measures itself again
      }
    }
    /* a size the stage did not fit is not tried again until the size changes: stop() sends a resize, which comes back here */
    var noFit = "";
    function gate() {
      if (rm.matches || window.innerHeight < 480) { stop(); return; }
      if (!on) { var key = window.innerWidth + "x" + window.innerHeight; if (key === noFit) return; noFit = key; start(); if (on) noFit = ""; }
      else {
        var size = window.innerWidth + "x" + probe.offsetHeight;
        if (size !== lastSize) { lastSize = size; if (!measure()) stop(); else { shown = -1; paint(); } }
      }
    }
    function remeasure() { if (on) { if (!measure()) stop(); else { shown = -1; sceneNow = -1; paint(); } } else { noFit = ""; gate(); } }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", function () { gate(); }, { passive: true });
    window.addEventListener("load", remeasure);
    window.addEventListener("pageshow", function (e) { if (e.persisted) schedule(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) schedule(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    if (rm.addEventListener) rm.addEventListener("change", gate); else if (rm.addListener) rm.addListener(gate);
    new MutationObserver(function () { setTimeout(remeasure, 0); }).observe(root, { attributes: true, attributeFilter: ["lang"] });

    /* the clock in your hand: drag it along the rail, press the arrows, or tap a mark */
    var dragging = false;
    function dragTo(e) { var r = line.getBoundingClientRect(); go(clamp((e.clientX - r.left) / r.width, 0, 1) * L.len); }
    puck.setAttribute("aria-valuemin", "0"); puck.setAttribute("aria-valuemax", "4");
    puck.addEventListener("pointerdown", function (e) { stopTween(); dragging = true; if (puck.setPointerCapture) puck.setPointerCapture(e.pointerId); e.preventDefault(); puck.focus({ preventScroll: true }); });
    puck.addEventListener("pointermove", function (e) { if (dragging) dragTo(e); });
    ["pointerup", "pointercancel"].forEach(function (t) { puck.addEventListener(t, function () { dragging = false; }); });
    puck.addEventListener("keydown", function (e) {
      if (!on) return;
      var i = 0, M = L.marks;
      while (i < M.length && M[i] <= pos + .02) i++;   // i: the first mark after here
      var to = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") to = i < M.length ? M[i] : null;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { var j = i - 1; if (j >= 0 && M[j] > pos - .02) j--; to = j >= 0 ? M[j] : 0; }
      else if (e.key === "Home") to = 0; else if (e.key === "End") to = M[M.length - 1];
      if (to === null) return;
      e.preventDefault(); go(to);
    });

    /* a keyboard moving through the page brings the moment it is in */
    stage.addEventListener("focusin", function (e) {
      if (!on || e.target === puck) return;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (b.el.contains(e.target)) { if (pos < b.b || pos > b.c) go(b.b + .02); return; }
      }
    });

    if (peg) peg.addEventListener("click", function () {
      if (!on) return;
      peg.classList.remove("swing"); void peg.offsetWidth; peg.classList.add("swing");
    });
    if (swayEl) swayEl.addEventListener("animationend", function (e) { if (e.animationName === "daySwing") peg.classList.remove("swing"); });

    /* back to 9 h: the day runs backwards, fast. Any touch or wheel gives the page back. */
    function stopTween() { if (tween) { clearTimeout(tween); tween = 0; } }
    ["wheel", "touchstart"].forEach(function (t) { window.addEventListener(t, stopTween, { passive: true }); });
    var back = $(".day-back");
    if (back) back.addEventListener("click", function (e) {
      if (!on) return;
      e.preventDefault(); stopTween();
      var y0 = window.pageYOffset, y1 = stageTop + L.marks[0] / L.len * range, n = 0, N = 96;
      (function tick() {
        n++;
        var t = n / N, k = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        window.scrollTo(0, y0 + (y1 - y0) * k);
        if (n < N) tween = setTimeout(tick, 16);
        else { tween = 0; hours[0].h.setAttribute("tabindex", "-1"); hours[0].h.focus({ preventScroll: true }); }
      })();
    });

    gate();
  })();
})();
