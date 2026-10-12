/* The welcome door of the home page: Copius + Manager + Jobs = Nokime. No dependency, no external resource.
   Runs after js/site.js, which draws the data-art drawings and translates every data-t of the door.
   progress p = how far the pinned stage has scrolled through its track (0 → 1); every layer is a pure function of p,
   so the melt runs the same in both scroll directions. Only transform, opacity, colour and stroke-dashoffset change
   (plus the corner radius of one rectangle as the mass settles into the block). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var door = $("#door"), track = $("#doorTrack"), stage = $("#doorStage");
  if (!door || !track || !stage) return;

  function curLang() { return document.documentElement.getAttribute("lang") === "en" ? "en" : "fr"; }

  /* ---------- Manager's lines: the real €/kg bands of the atlas ---------- */
  function rows() {
    var ART = window.NOKIME_ART || {}, l = curLang();
    $$("[data-row]", door).forEach(function (el) {
      var a = ART[el.getAttribute("data-row")]; if (!a) return;
      var lo = Math.round(a.lo), hi = Math.round(a.hi);
      el.firstChild.textContent = a[l] || a.fr;
      el.lastChild.textContent = l === "fr" ? lo + "–" + hi + " €/" + a.unit : "€" + lo + "–" + hi + "/" + a.unit;
    });
  }

  rows();

  /* ---------- paint: the colours mix like paint (multiply), never like light ---------- */
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mul3(a, b, c) { return [0, 1, 2].map(function (i) { return Math.round(a[i] * b[i] * c[i] / 65025); }); }   // paint: channel product on 0-1 values, rounded once
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c) { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }
  function token(name, fallback) {
    var v = (window.getComputedStyle(document.documentElement).getPropertyValue(name) || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(v) ? hex(v) : hex(fallback);
  }
  var GREEN = token("--accent", "#BBEB8A"), GOLD = token("--brass", "#E7C370"), BLUE = token("--blue", "#4B75FF");   // Copius, Manager, Jobs
  var MIX = mul3(GREEN, GOLD, BLUE);                           // #32523D, the deep green of the mark (same as --mix in css/door.css)
  var PAIR = mul3(GREEN, GOLD, [255, 255, 255]);               // Copius + Manager meet first: #A9B43D
  var OWN = { c: GREEN, m: GOLD, j: BLUE };
  var ART_LINE = hex("#B3E080"), ART_F = [hex("#1F2B17"), hex("#2A3B1F"), hex("#35502A")], PANEL_BG = token("--brass-soft", "#2E2716");

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }
  function ease(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function eio(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var rm = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var worldsEl = $("#ddWorlds"), head = $("#ddHead"), hint = $("#ddHint"), final = $("#ddFinal"), pools = $("#ddPools"), paint = $("#ddPaint");
  var knife = $("#ddKnife"), halves = $("#ddHalves"), body = $("#ddBody"), rim = $("#ddRim"), glow = $("#ddGlow");
  var eq = $("#ddEq"), eqT = { c: $(".eq-c", eq), m: $(".eq-m", eq), j: $(".eq-j", eq) }, eqP = $$(".eq-p", eq), EQ = { c: 0, m: 0, j: 0 }, eqDy = 0;
  var word = $("#ddWord"), line = $("#ddLine"), act = $("#ddAct"), links = $("#ddLinks");
  var POOL = { c: $("#ddPA"), m: $("#ddPB"), j: $("#ddPC") };
  var WORLD_X = { c: -1, m: 0, j: 1 };                     // which side of the block each world's pieces land on
  var START = { c: [.06, .45], m: [.06, .47], j: [.15, .5] };   // Copius and Manager meet first, Jobs pours in after: pair, then triple

  var fades = $$("[data-fade]", door);
  var pieces = $$(".d-piece", door).map(function (el, i) {
    return {
      el: el, w: el.getAttribute("data-w"), kind: el.getAttribute("data-kind"), rot: parseFloat(el.style.getPropertyValue("--rot")) || 0,
      i: i, t0: el.getAttribute("data-kind") === "panel" ? .03 : .03 + ((i * 5) % 9) * .011, spin: ((i % 2) ? 1 : -1) * (el.getAttribute("data-kind") === "art" ? 70 + (i * 37) % 70 : 18 + (i * 13) % 20),
      x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0,
      s1: { art: .13, name: .1, job: .1, panel: .2 }[el.getAttribute("data-kind")] || .12,
      inner: el.getAttribute("data-kind") === "panel" ? el.firstElementChild : null
    };
  });
  var worlds = { c: $(".d-copius .d-world", door), m: $(".d-manager .d-world", door), j: $(".d-jobs .d-world", door) };
  var G = { W: 1, H: 1, T: { x: 0, y: 0 }, s: 1, w: { c: {}, m: {}, j: {} }, range: 1, sw: 1.4 };
  var on = false, last = -1, queued = false, cur = 0, mw = 0, mh = 0;

  function rot(x, y, a) { var c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }

  function measure() {
    var sr = stage.getBoundingClientRect(), W = sr.width, H = sr.height, cx = sr.left + W / 2, cy = sr.top + H / 2;
    G.W = W; G.H = H; mw = window.innerWidth; mh = window.innerHeight;
    G.sw = W < 720 ? .9 : 1.4;
    paint.setAttribute("viewBox", (-W / 2) + " " + (-H / 2) + " " + W + " " + H);
    pieces.forEach(function (P) { P.el.style.transform = ""; });
    pieces.forEach(function (P) {
      var r = P.el.getBoundingClientRect();
      P.x = r.left + r.width / 2 - cx; P.y = r.top + r.height / 2 - cy;
    });
    ["c", "m", "j"].forEach(function (k) {
      var r = worlds[k].getBoundingClientRect();
      G.w[k] = { x: r.left + r.width / 2 - cx, y: r.top + r.height / 2 - cy, R: Math.min(r.width * .62, r.height * .56) };
    });
    var mr = $(".d-mark", door).getBoundingClientRect();
    G.T = { x: mr.left + mr.width / 2 - cx, y: mr.top + mr.height / 2 - cy };
    G.s = mr.width / 240;
    /* every piece lands somewhere inside the block of the mark: the pieces ARE what the block is made of */
    pieces.forEach(function (P) {
      var ang = P.i * 2.39996, rr = (.16 + .5 * ((P.i * .37) % 1)) * 105 * G.s;
      var dx = WORLD_X[P.w] * .38 * 105 * G.s + rr * Math.cos(ang) * .6, dy = rr * Math.sin(ang) * .85;
      var v0 = [P.x - G.T.x, P.y - G.T.y], vt = rot(dx, dy, -G.sw);        // pre-turned so the swirl ends exactly on the target
      P.vx = v0[0]; P.vy = v0[1]; P.tx = vt[0]; P.ty = vt[1];
    });
    /* the equation's terms: where each one sits in the line, measured from the line's centre (their transforms are off while measuring) */
    var er = eq.getBoundingClientRect(), ex = er.left + er.width / 2;
    ["c", "m", "j"].forEach(function (k) { eqT[k].style.transform = ""; var r = eqT[k].getBoundingClientRect(); EQ[k] = r.left + r.width / 2 - ex; });
    /* the line first sits low, under the pools of paint so its colours stay readable, then rises into the name's place as the terms merge */
    var wr = word.getBoundingClientRect();
    eqDy = Math.max(0, G.H * .4 - (wr.top + wr.height / 2 - cy));
    G.range = Math.max(1, track.offsetHeight - stage.offsetHeight);
  }
  function remeasure() { if (!on) return; measure(); last = -1; schedule(); }

  function blob(el, x, y, rx, ry) { el.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + rx.toFixed(1) + " " + ry.toFixed(1) + ")"); }

  function render(p) {
    if (p === last) return; last = p;
    var T = G.T, i, P;

    /* the questions step aside; the names, drawings, job names and the Manager card carry on */
    var eh = ease(seg(p, .03, .2));
    head.style.opacity = 1 - eh; head.style.transform = "translateY(" + (-16 * eh).toFixed(1) + "px)";
    fades.forEach(function (el) { el.style.opacity = (1 - eh).toFixed(3); el.style.transform = "translateY(" + (-10 * eh).toFixed(1) + "px)"; });
    hint.style.opacity = 1 - seg(p, 0, .035);
    worldsEl.style.setProperty("--hl", (1 - ease(seg(p, .02, .14))).toFixed(3));   // the phone rows' hairlines go with the worlds

    /* each piece is carried round the centre in a swirl, shrinks, is dyed by the mix, and lands inside the block */
    for (i = 0; i < pieces.length; i++) {
      P = pieces[i];
      var e = eio(seg(p, P.t0, P.t0 + .44));
      var v = rot(lerp(P.vx, P.tx, e), lerp(P.vy, P.ty, e), G.sw * e);
      var tx = T.x + v[0] - P.x, ty = T.y + v[1] - P.y;
      var sc = lerp(1, P.s1, P.kind === "panel" ? eio(seg(e, 0, .7)) : ease(e));
      P.el.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) rotate(" + (P.rot + e * P.spin).toFixed(1) + "deg) scale(" + sc.toFixed(3) + ")";
      P.el.style.opacity = (1 - ease(seg(p, .6, .67))).toFixed(3);      // by then the mass is the same deep green: the pieces are in it
      var k = ease(seg(e, .08, .8));
      if (P.kind === "art") {
        P.el.style.setProperty("--dal", rgb(mix(ART_LINE, MIX, k)));
        P.el.style.setProperty("--da1", rgb(mix(ART_F[0], MIX, k)));
        P.el.style.setProperty("--da2", rgb(mix(ART_F[1], MIX, k)));
        P.el.style.setProperty("--da3", rgb(mix(ART_F[2], MIX, k)));
      } else if (P.kind === "panel") {
        P.el.style.backgroundColor = rgb(mix(PANEL_BG, MIX, k));
        P.el.style.borderColor = rgb(mix(GOLD, MIX, k));
        P.inner.style.opacity = (1 - ease(seg(e, .04, .5))).toFixed(3);    // the card moves as one unit; its lines are gone before it turns
      } else P.el.style.color = rgb(mix(OWN[P.w], MIX, k));
    }

    /* three pools of paint bleed into each other; where they overlap the multiply mix shows: pair, then triple, then #32523D */
    var Rend = 100 * G.s, order = ["c", "m", "j"], ang = { c: 3.6, m: 5.7, j: 1.5 };
    for (i = 0; i < 3; i++) {
      var k2 = order[i], w = G.w[k2], s = seg(p, START[k2][0], START[k2][1]);
      var g = ease(s), orb = Math.sin(Math.PI * s);
      var R = lerp(w.R, Rend, g) * (1 + .22 * orb), rho = .5 * R * orb, an = ang[k2] + 4 * g;
      var x = T.x + (w.x - T.x) * (1 - g) + rho * Math.cos(an), y = T.y + (w.y - T.y) * (1 - g) + rho * Math.sin(an);
      var wob = .1 * Math.sin(6 * g + i * 2.1) * orb;
      blob(POOL[k2], x, y, R * (1 + wob), R * (1 - wob));
    }
    var pop = lerp(.22, .72, ease(seg(p, .06, .36)));
    pop = lerp(pop, 1, ease(seg(p, .4, .52))) * (1 - ease(seg(p, .58, .64)));
    pools.style.opacity = pop.toFixed(3);

    /* the mass congeals into the block: a circle of the same radius takes over, its corners come in, the knife cuts, the cut opens */
    var rx = lerp(105, 44, eio(seg(p, .62, .78)));
    body.style.opacity = ease(seg(p, .5, .58)).toFixed(3);
    body.setAttribute("rx", rx.toFixed(1)); rim.setAttribute("rx", rx.toFixed(1));
    rim.style.opacity = ease(seg(p, .72, .82)).toFixed(3);
    halves.style.opacity = ease(seg(p, .765, .785)).toFixed(3);                  // same colour and same shape as the body once the corners are in
    knife.style.strokeDashoffset = (1 - ease(seg(p, .78, .87))).toFixed(4);      // the knife draws, thin, from the bottom
    knife.style.strokeWidth = lerp(3.4, 30, eio(seg(p, .87, .93))).toFixed(2);   // then the cut opens to its full width
    glow.style.opacity = (ease(seg(p, .62, .92)) * .95).toFixed(3);

    /* the equation Copius + Manager + Jobs: the first two flow together (pair), then Jobs joins (triple); each term is dyed by the paint
       it melts into and softens to a blur, and the mass resolves into « = nokime » as the pools turn into the deep green */
    var q1 = eio(seg(p, .3, .43)), q2 = eio(seg(p, .45, .58)), mid = (EQ.c + EQ.m) / 2;
    eq.style.transform = "translateY(" + (eqDy * (1 - q2)).toFixed(1) + "px)";
    eq.style.opacity = (ease(seg(p, .19, .27)) * (1 - ease(seg(p, .54, .62)))).toFixed(3);
    [["c", GREEN], ["m", GOLD], ["j", BLUE]].forEach(function (t) {
      var k3 = t[0], el = eqT[k3], pair = k3 !== "j";
      var x = pair ? lerp(lerp(EQ[k3], mid, q1), 0, q2) : lerp(EQ[k3], 0, q2);
      var col = pair ? mix(mix(t[1], PAIR, q1), MIX, q2) : mix(t[1], MIX, q2);
      var bl = (pair ? 6 * q1 + 9 * q2 : 15 * q2).toFixed(1);
      el.style.transform = "translateX(" + (x - EQ[k3]).toFixed(1) + "px)"; el.style.color = rgb(col); el.style.filter = bl > 0.2 ? "blur(" + bl + "px)" : "";
    });
    eqP[0].style.opacity = (1 - ease(seg(q1, 0, .55))).toFixed(3);
    eqP[1].style.opacity = (1 - ease(seg(q2, 0, .45))).toFixed(3);

    /* the name arrives out of the blur, the line and the way in follow */
    var ow = ease(seg(p, .52, .66)), ol = ease(seg(p, .92, .98)), oa = ease(seg(p, .94, 1));
    word.style.opacity = ow.toFixed(3); word.style.filter = ow < .98 ? "blur(" + (14 * (1 - ow)).toFixed(1) + "px)" : "";
    word.style.setProperty("--eqo", (ease(seg(p, .6, .68)) * (1 - ease(seg(p, .88, .94)))).toFixed(3));
    line.style.opacity = ol.toFixed(3); line.style.transform = "translateY(" + (14 * (1 - ol)).toFixed(1) + "px)";
    act.style.opacity = oa.toFixed(3); links.style.opacity = oa.toFixed(3);
    act.style.transform = links.style.transform = "translateY(" + (12 * (1 - oa)).toFixed(1) + "px)";
    final.classList.toggle("is-final", p >= .94);
  }

  function progress() {
    var top = track.getBoundingClientRect().top;
    return clamp(-top / G.range);
  }
  function frame() { queued = false; if (on) { cur = progress(); render(clamp(cur / .9)); } }   // the last tenth of the track holds the finished mark
  function schedule() {
    if (queued || !on) return; queued = true;
    if (window.requestAnimationFrame) requestAnimationFrame(frame);
    setTimeout(function () { if (queued) frame(); }, 120);   // a throttled or hidden view still lands on the right frame
  }

  var styles = pieces.map(function (P) { return P.el.getAttribute("style"); });
  function start() {
    if (on) return; on = true;
    measure(); last = -1; frame();
  }
  function stop() {
    if (!on) return; on = false;
    pieces.forEach(function (P, i) {
      if (styles[i]) P.el.setAttribute("style", styles[i]); else P.el.removeAttribute("style");
      if (P.inner) P.inner.removeAttribute("style");
    });
    fades.forEach(function (el) { el.removeAttribute("style"); });
    [worldsEl, head, hint, pools, halves, body, rim, glow, knife, eq, eqT.c, eqT.m, eqT.j, eqP[0], eqP[1], word, line, act, links].forEach(function (el) { el.removeAttribute("style"); });
    pools.setAttribute("style", "isolation:isolate");
    body.setAttribute("rx", "44"); rim.setAttribute("rx", "44");
    final.classList.remove("is-final");
  }

  window.addEventListener("scroll", schedule, { passive: true });
  /* a phone's URL bar resizes the view while scrolling: re-measure only for a real change of width, or of height by more than ~120 px */
  window.addEventListener("resize", function () {
    if (!on) return;
    if (Math.abs(window.innerWidth - mw) < 1 && Math.abs(window.innerHeight - mh) < 120) return;
    measure(); last = -1; schedule();
  }, { passive: true });
  window.addEventListener("load", remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  function gate() { if (rm.matches) stop(); else start(); }
  if (rm.addEventListener) rm.addEventListener("change", gate); else if (rm.addListener) rm.addListener(gate);
  gate();

  var langBtn = $("#langBtn");
  if (langBtn) langBtn.addEventListener("click", function () { setTimeout(function () { rows(); remeasure(); }, 0); });

  /* keyboard: reaching the way in completes the melt first, so the focused link is never an invisible one */
  final.addEventListener("focusin", function () {
    if (!on || cur >= .9) return;
    var y = track.getBoundingClientRect().top + window.pageYOffset + G.range * .92;
    try { window.scrollTo({ top: y, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); }
    schedule();
  });

  /* nothing animates while the door is out of sight */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { door.classList.toggle("away", !en[0].isIntersecting); }).observe(door);
  }
})();
