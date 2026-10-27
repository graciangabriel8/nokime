/* The welcome door of the home page: Copius + Manager + Jobs = Nokime. No dependency, no external resource.
   Runs after js/site.js, which draws the data-art drawings and translates every data-t of the door.
   progress p = how far the pinned stage has scrolled through its track (0 → 1); every layer is a pure function of p,
   so the melt runs the same in both scroll directions. Only transform, opacity, colour (through a few custom properties set once per
   column), a light blur on the equation and stroke-dashoffset change, plus the corner radius of one rectangle as the mass settles,
   and one canvas, where the shooting star is drawn.
   The three column names are not part of the swirl: each travels down to its own term of the equation and hands over to it.
   Melted into one, the three terms squeeze into a shooting star, which circles the forming block and dives into it at the foot of the N:
   the knife draws behind it (his ask, 27 Oct).
   Once scrolled past, the door is gone until the next load (drop, below). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var door = $("#door"), track = $("#doorTrack"), stage = $("#doorStage");
  if (!door || !track || !stage) return;

  /* ---------- paint: the colours mix like paint (multiply), never like light ---------- */
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mul3(a, b, c) { return [0, 1, 2].map(function (i) { return Math.round(a[i] * b[i] * c[i] / 65025); }); }   // paint: channel product on 0-1 values, rounded once
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c) { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }
  function rgba(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + a.toFixed(3) + ")"; }
  function token(name, fallback) {
    var v = (window.getComputedStyle(document.documentElement).getPropertyValue(name) || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(v) ? hex(v) : hex(fallback);
  }
  var GREEN = token("--paint-c", "#BBEB8A"), GOLD = token("--paint-m", "#E7C370"), BLUE = token("--paint-j", "#4B75FF");   // the paint: Copius, Manager, Jobs
  var MIX = mul3(GREEN, GOLD, BLUE);                           // #32523D, the deep green of the mark (same as --mix in css/door.css)
  var TXT = { c: token("--accent", "#3E6B1F"), m: token("--brass", "#876510"), j: token("--blue", "#2038D5") };   // the names' readable colours, which the equation's terms take over
  var PAIR = mix(TXT.c, TXT.m, .5);                            // Copius + Manager meet first: halfway between their readable colours, #636818 (their paint mix #A9B43D is too pale to read on the paper)
  var CREAM = hex("#FFFDF4");                                  // the star's white-hot head
  /* each world's drawings: line and the three fills, tinted in its colour (the same as the CSS defaults of css/door.css) */
  var ART = {
    c: { line: hex("#3E6B1F"), f: [hex("#E4F0DB"), hex("#D0E2C0"), hex("#B4CE9B")] },
    m: { line: hex("#876510"), f: [hex("#F4EAD5"), hex("#E9D9B6"), hex("#D9C18C")] },
    j: { line: hex("#2038D5"), f: [hex("#E2EBFF"), hex("#CCDBFD"), hex("#AEC3F6")] }
  };

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }
  function ease(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function eio(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var rm = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var worldsEl = $("#ddWorlds"), head = $("#ddHead"), hint = $("#ddHint"), final = $("#ddFinal"), pools = $("#ddPools");
  var knife = $("#ddKnife"), halves = $("#ddHalves"), body = $("#ddBody"), rim = $("#ddRim"), glow = $("#ddGlow");
  var eq = $("#ddEq"), eqT = { c: $(".eq-c", eq), m: $(".eq-m", eq), j: $(".eq-j", eq) }, eqP = $$(".eq-p", eq), eqIs = $(".eq-is", eq), EQ = { c: 0, m: 0, j: 0 };
  var TW = { c: 0, m: 0, j: 0 }, TP = { c: 0, m: 0 }, T3 = { c: 0, m: 0, j: 0 };   // term widths, and where each lands side by side: as the pair, then as the triple
  var EG = { dy: 0, bs: 1, x: 0, wx: 0, ws: 1, wl: 0, wn: 1 };   // the equation line: drop, fit scale, centre, and where the name waits at its right end
  var skip = $(".d-skip", door), langTo = $("#ddLang", door), word = $("#ddWord"), line = $("#ddLine"), act = $("#ddAct"), links = $("#ddLinks");
  var POOL = { c: $("#ddPA"), m: $("#ddPB"), j: $("#ddPC") };
  var star = $("#ddStar"), pen = star && star.getContext ? star.getContext("2d") : null;
  /* the star's flight, one path sampled into points (pts, and the length run up to each): the loop round the block, then the N.
     D1 = the loop's length, L = the N's, VE = the speed it enters the N at (px per unit of p), E0 = the equation line's centre untransformed,
     box = what the last frame drew, cleared before the next, m = the canvas's density and centre, lit = whether the canvas shows */
  var FLY = { pts: [[0, 0]], run: [0], D1: 1, L: 1, VE: 0, h: 1, E0: { x: 0, y: 0 }, box: null, m: [1, 0, 0], lit: null };
  var WORLD_X = { c: -1, m: 0, j: 1 };                     // which side of the block each world's pieces land on
  var START = { c: [.06, .45], m: [.06, .47], j: [.15, .5] };   // Copius and Manager meet first, Jobs pours in after: pair, then triple
  var SWING = { c: 3.6, m: 5.7, j: 1.5 };                        // the angle each pool swings out at as it leaves its disc

  var fades = $$("[data-fade]", door);
  var pieces = $$(".d-piece", door).map(function (el, i) {
    return {
      el: el, w: el.getAttribute("data-w"), rot: parseFloat(el.style.getPropertyValue("--rot")) || 0,
      i: i, t0: .03 + ((i * 5) % 9) * .011, spin: ((i % 2) ? 1 : -1) * (70 + (i * 37) % 70),
      x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, s1: .13
    };
  });
  /* the column names: each travels down to its own term of the equation (window of p), then the term takes over */
  var NAMES = ["c", "m", "j"].map(function (k, n) {
    return { k: k, el: $(".d-name[data-w=" + k + "]", door), a: .04 + n * .01, b: .2 + n * .01, x0: 0, y0: 0, w0: 1, dx: 0, dy: 0, sc: 1 };
  });
  var worlds = { c: $(".d-copius .d-world", door), m: $(".d-manager .d-world", door), j: $(".d-jobs .d-world", door) };
  var discs = { c: $(".d-copius .d-disc", door), m: $(".d-manager .d-disc", door), j: $(".d-jobs .d-disc", door) };
  var G = { W: 1, H: 1, T: { x: 0, y: 0 }, s: 1, w: { c: {}, m: {}, j: {} }, range: 1, sw: 1.4, top: 0 };
  var on = false, last = -1, queued = false, cur = 0, mw = 0, msh = 0, mth = 0, md = 0, gone = false, dyed = "";


  function rot(x, y, a) { var c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }

  function measure() {
    var sr = stage.getBoundingClientRect(), W = sr.width, H = sr.height, cx = sr.left + W / 2, cy = sr.top + H / 2;
    G.W = W; G.H = H; mw = window.innerWidth; msh = stage.offsetHeight; mth = track.offsetHeight;
    G.sw = W < 720 ? .9 : 1.4;
    pieces.forEach(function (P) { P.el.style.transform = ""; });
    NAMES.forEach(function (N) { N.el.style.transform = ""; });
    NAMES.forEach(function (N) { var r = N.el.getBoundingClientRect(); N.x0 = r.left + r.width / 2 - cx; N.y0 = r.top + r.height / 2 - cy; N.w0 = r.width; });
    pieces.forEach(function (P) {
      var r = P.el.getBoundingClientRect();
      P.x = r.left + r.width / 2 - cx; P.y = r.top + r.height / 2 - cy;
    });
    ["c", "m", "j"].forEach(function (k) {
      var r = discs[k].getBoundingClientRect();
      G.w[k] = { x: r.left + r.width / 2 - cx, y: r.top + r.height / 2 - cy, R: r.width / 2 };       // the pool IS the disc
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
    /* the equation « Copius + Manager + Jobs = nokime »: measured with every transform off. The name waits at the right end of the line,
       the whole line is scaled to fit the stage, and it sits low, clear of the pools, until the terms melt */
    [eq, word, eqIs, eqT.c, eqT.m, eqT.j].forEach(function (el) { el.style.transform = ""; });
    var er = eq.getBoundingClientRect(), ex = er.left + er.width / 2;
    FLY.E0 = { x: ex - cx, y: er.top + er.height / 2 - cy };
    ["c", "m", "j"].forEach(function (k) { var r = eqT[k].getBoundingClientRect(); EQ[k] = r.left + r.width / 2 - ex; TW[k] = r.width; });
    /* the terms melt into each other side by side (no letter on top of another): « CopiusManager », then « CopiusManagerJobs » */
    var mid0 = (EQ.c + EQ.m) / 2, t3 = TW.c + TW.m + TW.j;
    TP.c = mid0 - (TW.c + TW.m) / 2 + TW.c / 2; TP.m = TP.c + TW.c / 2 + TW.m / 2;
    T3.c = -t3 / 2 + TW.c / 2; T3.m = T3.c + TW.c / 2 + TW.m / 2; T3.j = T3.m + TW.m / 2 + TW.j / 2;
    var E = parseFloat(window.getComputedStyle(eq).fontSize) || 40, FW = parseFloat(window.getComputedStyle(word).fontSize) || 80;
    var wr = word.getBoundingClientRect(), sn = Math.min(1, E * 1.12 / FW), gw = .12 * E, tot = er.width + gw + wr.width * sn;
    var bs = Math.min(1, (G.W - 28) / tot), ts = tot * bs;
    EG.bs = bs; EG.x = (er.width * bs - ts) / 2; EG.ws = sn * bs; EG.wn = wr.width;
    EG.wx = -ts / 2 + (er.width + gw) * bs + wr.width * sn * bs / 2; EG.wl = EG.wx - wr.width * EG.ws / 2;
    /* on a phone the worlds are rows and the Jobs pool pours out of the bottom one, so the line waits lower: midway between the
       paint's lowest reach and the foot of the stage, never off it (on the Jobs row the paint took « Manager » down to 2.2:1, 27 Oct) */
    var low = G.H * .34;
    if (G.W < 720) {
      var reach = -G.H / 2;
      for (var i = 0; i < 3; i++) for (var s = 0; s <= 1; s += .02) { var b = poolAt(i, s); reach = Math.max(reach, b.y + b.ry); }
      low = Math.min((reach + G.H / 2) / 2, G.H / 2 - Math.max(er.height * bs, wr.height * EG.ws) / 2 - 12);
    }
    EG.dy = Math.max(0, low - (wr.top + wr.height / 2 - cy));
    /* where each name lands: on its own term of the equation, the line as it stands before the terms melt */
    eq.style.transform = "translate(" + EG.x.toFixed(1) + "px," + EG.dy.toFixed(1) + "px) scale(" + EG.bs.toFixed(3) + ")";
    NAMES.forEach(function (N) {
      var r = eqT[N.k].getBoundingClientRect();
      N.dx = r.left + r.width / 2 - cx - N.x0; N.dy = r.top + r.height / 2 - cy - N.y0; N.sc = r.width / N.w0;
    });
    eq.style.transform = "";
    G.top = track.getBoundingClientRect().top + window.pageYOffset;
    G.range = Math.max(1, track.offsetHeight - stage.offsetHeight);
    flight();
    canvas();
  }
  /* the star's canvas at the screen's density, at most 2x and at most 6 million pixels (a 5K screen at 2x would hold 59 MB for one star;
     1440 x 900 still gets 2x), drawn in px from the stage's centre like everything above; remade when the window moves to another screen */
  function canvas() {
    md = window.devicePixelRatio || 1;
    if (!pen) return;
    var W = G.W, H = G.H, dpr = Math.min(2, md, Math.sqrt(6e6 / (W * H))), cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (star.width !== cw || star.height !== ch) { star.width = cw; star.height = ch; }
    FLY.m = [dpr, W / 2 * dpr, H / 2 * dpr];
    FLY.box = [-W / 2, -H / 2, W / 2, H / 2];
  }

  /* the star's flight, measured with the rest. From the line's centre at launch it goes out to the left and up, over the top, down the right
     side, round the block's corner and along its foot, then turns up into the foot of the N and follows the knife to its end. Hermite curves
     through those waypoints, each crossed in the direction given, sampled into one polyline the star is placed on by length */
  function flight() {
    var C = G.T, s = G.s, h = 105 * s, g = Math.max(4, .08 * h), d = Math.SQRT1_2;   // g: how close it hugs the block's corner and foot, above « nokime »
    var rx = Math.max(1.4 * h, Math.min(2.8 * h, G.W / 2 - 14 - .3 * h - Math.abs(C.x))), rt = Math.max(1.4 * h, Math.min(2.5 * h, C.y + G.H / 2 - 14 - .3 * h));   // the rays' tips 14 px inside the stage
    var K = [[78.75, 225], [78.75, 72], [161.25, 168], [161.25, 15]].map(function (v) { return [C.x + (v[0] - 120) * s, C.y + (v[1] - 120) * s]; });   // the knife of the mark (its path, ddKnife), in the stage
    var B = [FLY.E0.x + EG.x, FLY.E0.y + EG.dy * (1 - eio(seg(.6, .5, .68)))];   // where the terms squeezed in, as the line stands at launch
    var way = [
      [B, [-.45, -.9]],
      [[C.x - rx, C.y + .1 * h], [0, -1]],
      [[C.x, C.y - rt], [1, 0]],
      [[C.x + rx, C.y + .1 * h], [0, 1]],
      [[C.x + .88 * h + g * d, C.y + .88 * h + g * d], [-.8, .6]],
      [[C.x + .58 * h, C.y + h + g], [-1, 0]],   // the corner rounded, so the run along the foot never sags towards the name
      [[K[0][0] + g, K[0][1] + g], [-1, 0]],
      [K[0], [0, -1]]
    ];
    var pts = [], run = [], tot = 0;
    function put(x, y) { if (pts.length) tot += Math.hypot(x - pts[pts.length - 1][0], y - pts[pts.length - 1][1]); pts.push([x, y]); run.push(tot); }
    function unit(v) { var n = Math.hypot(v[0], v[1]) || 1; return [v[0] / n, v[1] / n]; }
    put(B[0], B[1]);
    for (var i = 1; i < way.length; i++) {
      var P0 = way[i - 1][0], P1 = way[i][0], T0 = unit(way[i - 1][1]), T1 = unit(way[i][1]);
      var m = 1.17 * Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);   // a quarter turn's tangent, so each piece bends like an arc
      for (var n = 1; n <= 40; n++) {
        var t = n / 40, t2 = t * t, t3 = t2 * t, a = 2 * t3 - 3 * t2 + 1, b = (t3 - 2 * t2 + t) * m, c = 3 * t2 - 2 * t3, e = (t3 - t2) * m;
        put(a * P0[0] + b * T0[0] + c * P1[0] + e * T1[0], a * P0[1] + b * T0[1] + c * P1[1] + e * T1[1]);
      }
    }
    FLY.D1 = tot;
    for (i = 1; i < K.length; i++) put(K[i][0], K[i][1]);
    FLY.L = tot - FLY.D1; FLY.pts = pts; FLY.run = run; FLY.h = h;
    FLY.VE = 1.6 * FLY.L / .09;   // it enters the N at 1.6 times the N's mean speed, then slows to a stop at its end
  }
  /* how far along the flight the star is at progress p: at rest until .6, round the loop to the foot of the N at .78, then along the N to .87;
     each stretch a Hermite in p, joined at the same speed, so it never jumps */
  function along(p) {
    var t;
    if (p <= .6) return 0;
    if (p < .78) { t = (p - .6) / .18; return FLY.D1 * (3 * t * t - 2 * t * t * t) + FLY.VE * .18 * (t * t * t - t * t); }
    if (p < .87) { t = (p - .78) / .09; return FLY.D1 + FLY.VE * .09 * (t * t * t - 2 * t * t + t) + FLY.L * (3 * t * t - 2 * t * t * t); }
    return FLY.D1 + FLY.L;
  }
  function speed(p) {
    var t;
    if (p <= .6 || p >= .87) return 0;
    if (p < .78) { t = (p - .6) / .18; return (FLY.D1 * (6 * t - 6 * t * t) + FLY.VE * .18 * (3 * t * t - 2 * t)) / .18; }
    t = (p - .78) / .09; return (FLY.VE * .09 * (3 * t * t - 4 * t + 1) + FLY.L * (6 * t - 6 * t * t)) / .09;
  }
  function at(d) {
    var run = FLY.run, pts = FLY.pts, lo = 0, hi = run.length - 1, mid;
    if (d <= 0) return pts[0];
    if (d >= run[hi]) return pts[hi];
    while (hi - lo > 1) { mid = (lo + hi) >> 1; if (run[mid] < d) lo = mid; else hi = mid; }
    var f = (d - run[lo]) / ((run[hi] - run[lo]) || 1);
    return [lerp(pts[lo][0], pts[hi][0], f), lerp(pts[lo][1], pts[hi][1], f)];
  }

  /* the star: a white-hot head in a gold and green halo with four thin rays turning as it flies, and a tail as long as it is fast: three
     strands (Copius green, Manager gold, Jobs blue) braided behind it, in their readable colours on the paper and their bright paint on the block */
  function drawStar(p) {
    if (!pen) return;
    var b = FLY.box, h = FLY.h, m = FLY.m;
    pen.setTransform(m[0], 0, 0, m[0], m[1], m[2]);   // every frame: a canvas the browser dropped and gave back has lost it
    if (b) { pen.clearRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); FLY.box = null; }
    var life = ease(seg(p, .56, .6)) * (1 - ease(seg(p, .875, .905))), lit = life > 0;
    if (lit !== FLY.lit) { FLY.lit = lit; star.style.visibility = lit ? "" : "hidden"; }   // no star, no canvas for the page to composite
    if (!lit) return;
    var d = along(p), hd = p < .6 ? [FLY.E0.x + EG.x, FLY.E0.y + EG.dy * (1 - eio(seg(p, .5, .68)))] : at(d);   // until launch it sits where the terms squeeze in
    var x0 = hd[0], y0 = hd[1], x1 = hd[0], y1 = hd[1], i, k;
    var tl = Math.min(2.6 * h, speed(p) * .024), n = 20, amp = .07 * h, w0 = Math.max(1.6, .03 * h);
    var inside = function (q) { return ease(seg(q, FLY.D1 - .1 * h, FLY.D1 + .3 * h)); };
    if (tl > 1) {
      var q = [], nr = [], u, gw;
      for (i = 0; i <= n; i++) { q.push(at(d - tl * i / n)); x0 = Math.min(x0, q[i][0]); y0 = Math.min(y0, q[i][1]); x1 = Math.max(x1, q[i][0]); y1 = Math.max(y1, q[i][1]); }
      for (i = 0; i <= n; i++) {
        var A = q[Math.max(0, i - 1)], Z = q[Math.min(n, i + 1)], dx = A[0] - Z[0], dy = A[1] - Z[1], l = Math.hypot(dx, dy) || 1;
        nr.push([-dy / l, dx / l]);
      }
      if (tl > .3 * h) {   /* a soft gold glow under the tail: one shape, narrowing and fading to its end */
        var gg = pen.createLinearGradient(q[0][0], q[0][1], q[n][0], q[n][1]);
        gg.addColorStop(0, rgba(GOLD, .4 * life)); gg.addColorStop(.5, rgba(GOLD, .1 * life)); gg.addColorStop(1, rgba(GOLD, 0));
        pen.fillStyle = gg; pen.beginPath();
        for (i = 0; i <= n; i++) { gw = .09 * h * (1 - .7 * i / n); pen.lineTo(q[i][0] + nr[i][0] * gw, q[i][1] + nr[i][1] * gw); }
        for (i = n; i >= 0; i--) { gw = .09 * h * (1 - .7 * i / n); pen.lineTo(q[i][0] - nr[i][0] * gw, q[i][1] - nr[i][1] * gw); }
        pen.closePath(); pen.fill();
      }
      pen.lineCap = "round";
      var col = [[TXT.c, GREEN], [TXT.m, GOLD], [TXT.j, BLUE]];
      for (k = 0; k < 3; k++) {
        var off = [];
        for (i = 0; i <= n; i++) { u = i / n; off.push(amp * Math.pow(u, .7) * Math.sin(2 * Math.PI * (d - tl * u) / (.9 * h) + k * 2.0944)); }
        for (i = 0; i < n; i++) {
          u = i / n;
          var qd = d - tl * (i + .5) / n;
          pen.strokeStyle = rgba(mix(col[k][0], col[k][1], inside(qd)), .95 * life * Math.pow(1 - u, 1.3)); pen.lineWidth = w0 * (1 - .75 * u);
          pen.beginPath();
          pen.moveTo(q[i][0] + nr[i][0] * off[i], q[i][1] + nr[i][1] * off[i]);
          pen.lineTo(q[i + 1][0] + nr[i + 1][0] * off[i + 1], q[i + 1][1] + nr[i + 1][1] * off[i + 1]);
          pen.stroke();
        }
      }
    }
    var low = ease(seg(d, FLY.D1 - 2 * h, FLY.D1 - 1.4 * h)) * (1 - ease(seg(d, FLY.D1 + .1 * h, FLY.D1 + .6 * h)));   // under the block, just over « nokime », the head draws in
    var fl = (1 + .8 * Math.sin(Math.PI * seg(p, .86, .9))) * (1 - .5 * low), R = .2 * h * fl;   // it flares at the end of the N, as the cut opens
    var gr = pen.createRadialGradient(hd[0], hd[1], 0, hd[0], hd[1], R);
    gr.addColorStop(0, rgba(CREAM, life)); gr.addColorStop(.16, rgba(GOLD, .85 * life)); gr.addColorStop(.45, rgba(GREEN, .3 * life)); gr.addColorStop(1, rgba(GREEN, 0));
    pen.fillStyle = gr; pen.beginPath(); pen.arc(hd[0], hd[1], R, 0, 2 * Math.PI); pen.fill();
    var an = d / (1.5 * h) + .3, rl = .3 * h * fl, rw = .03 * h;
    pen.fillStyle = rgba(mix(TXT.m, CREAM, inside(d)), .95 * life);
    for (k = 0; k < 2; k++) {   /* four rays: two thin diamonds across each other */
      var ca = Math.cos(an + k * Math.PI / 2), sa = Math.sin(an + k * Math.PI / 2);
      pen.beginPath();
      pen.moveTo(hd[0] + ca * rl, hd[1] + sa * rl); pen.lineTo(hd[0] - sa * rw, hd[1] + ca * rw);
      pen.lineTo(hd[0] - ca * rl, hd[1] - sa * rl); pen.lineTo(hd[0] + sa * rw, hd[1] - ca * rw);
      pen.closePath(); pen.fill();
    }
    pen.fillStyle = rgba(CREAM, life); pen.beginPath(); pen.arc(hd[0], hd[1], Math.max(1.6, .03 * h) * fl, 0, 2 * Math.PI); pen.fill();
    var M = Math.max(R, rl) + amp + .07 * h + 4;
    FLY.box = [x0 - M, y0 - M, x1 + M, y1 + M];
  }
  function remeasure() { if (!on) return; measure(); last = -1; schedule(); }

  /* where pool i (Copius, Manager, Jobs) is at its own progress s: it leaves its disc, swells and swings out, and settles on the mark */
  function poolAt(i, s) {
    var k = "cmj".charAt(i), w = G.w[k], g = ease(s), orb = Math.sin(Math.PI * s);
    var R = lerp(w.R, 100 * G.s, g) * (1 + .22 * orb), rho = .5 * R * orb, an = SWING[k] + 4 * g, wob = .1 * Math.sin(6 * g + i * 2.1) * orb;
    return { x: G.T.x + (w.x - G.T.x) * (1 - g) + rho * Math.cos(an), y: G.T.y + (w.y - G.T.y) * (1 - g) + rho * Math.sin(an), rx: R * (1 + wob), ry: R * (1 - wob) };
  }
  function blob(el, x, y, rx, ry) { el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + (rx / 160).toFixed(4) + "," + (ry / 160).toFixed(4) + ")"; }   // a pool is a 320 px disc: radius 160 = scale 1

  function render(p) {
    if (p === last) return; last = p;
    var T = G.T, i, P;

    /* the questions step aside; the names and the drawings carry on */
    var eh = ease(seg(p, .03, .2));
    head.style.opacity = 1 - eh; head.style.transform = "translateY(" + (-16 * eh).toFixed(1) + "px)";
    fades.forEach(function (el) { el.style.opacity = (1 - eh).toFixed(3); el.style.transform = "translateY(" + (-10 * eh).toFixed(1) + "px)"; });
    hint.style.opacity = 1 - seg(p, 0, .035);
    worldsEl.style.setProperty("--hl", (1 - ease(seg(p, .02, .14))).toFixed(3));   // the phone rows' hairlines go with the worlds

    /* each drawing is carried round the centre in a swirl, shrinks and lands inside the block; its colour follows the pools
       (Copius and Manager drawings turn to the pair's mix first, then every drawing to the triple's), set once per world */
    var dc = ease(seg(p, .32, .46)), dm = ease(seg(p, .48, .6)), key = dc.toFixed(3) + dm.toFixed(3);
    if (key !== dyed) {
      dyed = key;
      ["c", "m", "j"].forEach(function (k) {
        var ws = worlds[k].style, A = ART[k], line = k === "j" ? mix(A.line, MIX, dm) : mix(mix(A.line, PAIR, dc), MIX, dm);
        ws.setProperty("--dal", rgb(line));
        ws.setProperty("--da1", rgb(mix(A.f[0], MIX, dm))); ws.setProperty("--da2", rgb(mix(A.f[1], MIX, dm))); ws.setProperty("--da3", rgb(mix(A.f[2], MIX, dm)));
      });
    }
    if (p >= .68) {
      if (!gone) { gone = true; door.classList.add("melted"); pieces.forEach(function (P) { P.el.style.opacity = 0; }); }
    } else {
      if (gone) { gone = false; door.classList.remove("melted"); }
      for (i = 0; i < pieces.length; i++) {
        P = pieces[i];
        var e = eio(seg(p, P.t0, P.t0 + .4));
        var v = rot(lerp(P.vx, P.tx, e), lerp(P.vy, P.ty, e), G.sw * e);
        var tx = T.x + v[0] - P.x, ty = T.y + v[1] - P.y;
        var sc = lerp(1, P.s1, ease(e));
        P.el.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) rotate(" + (P.rot + e * P.spin).toFixed(1) + "deg) scale(" + sc.toFixed(3) + ")";
        P.el.style.opacity = (1 - ease(seg(p, .6, .67))).toFixed(3);      // the pieces sink into the block as it appears, then are gone
      }
    }

    /* three pools of paint bleed into each other; where they overlap the multiply mix shows: pair, then triple, then #32523D */
    for (i = 0; i < 3; i++) {
      var k2 = "cmj".charAt(i), b = poolAt(i, seg(p, START[k2][0], START[k2][1]));
      blob(POOL[k2], b.x, b.y, b.rx, b.ry);
    }
    var pop = lerp(.22, .72, ease(seg(p, .06, .36)));
    pop = lerp(pop, 1, ease(seg(p, .4, .52))) * (1 - ease(seg(p, .6, .67)));
    pools.style.opacity = pop.toFixed(3);

    /* the mass congeals into the block: a circle of the same radius takes over, its corners come in, the knife cuts, the cut opens */
    var rx = lerp(105, 44, eio(seg(p, .62, .78)));
    body.style.opacity = ease(seg(p, .46, .56)).toFixed(3);
    body.setAttribute("rx", rx.toFixed(1)); rim.setAttribute("rx", rx.toFixed(1));
    rim.style.opacity = ease(seg(p, .72, .82)).toFixed(3);
    halves.style.opacity = ease(seg(p, .765, .785)).toFixed(3);                  // same colour and same shape as the body once the corners are in
    knife.style.strokeDashoffset = (1 - clamp((along(p) - FLY.D1) / FLY.L)).toFixed(4);   // the knife draws, thin, behind the star, from the foot of the N
    knife.style.strokeWidth = lerp(3.4, 30, eio(seg(p, .87, .93))).toFixed(2);   // then the cut opens to its full width
    glow.style.opacity = (ease(seg(p, .62, .92)) * .95).toFixed(3);

    /* the column names travel down to the equation: each leaves its column, shrinks to the size of its term and lands on it; the term takes over
       the frame the name arrives (same place, size, face and colour, so no double is ever seen), and the name is gone. Back up, the other way round. */
    NAMES.forEach(function (N) {
      var u = ease(seg(p, N.a, N.b)), landed = p >= N.b;
      N.el.style.transform = u > 0 ? "translate(" + (N.dx * u).toFixed(2) + "px," + (N.dy * u).toFixed(2) + "px) scale(" + lerp(1, N.sc, u).toFixed(4) + ")" : "";
      N.el.style.opacity = landed ? 0 : 1;
    });

    /* the equation: first one sharp beat « Copius + Manager + Jobs = nokime », the name already at its right end; then the first two terms
       flow together (pair), Jobs joins (triple); each term is dyed by the paint it melts into, softens by a few px and fades as the mass
       settles into the name, which slides to the centre and grows to its size while the « = » goes */
    var q1 = eio(seg(p, .36, .48)), q2 = eio(seg(p, .48, .6)), ew = eio(seg(p, .5, .68));
    var dy = EG.dy * (1 - ew), wx = lerp(EG.wx, 0, ew), wsc = lerp(EG.ws, 1, ew);
    var ap = ease(seg(p, .17, .25));                                              // the « + » signs and the « = » appear around the landing names
    eq.style.transform = "translate(" + EG.x.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + EG.bs.toFixed(3) + ")";
    /* melted, the line squeezes into one point at its centre, where the star lights up */
    var cz = ease(seg(p, .545, .6)), tOp = (1 - ease(seg(p, .575, .6))).toFixed(3);
    var sq = cz > 0 ? " scale(" + lerp(1, .03, cz).toFixed(3) + "," + lerp(1, .25, cz).toFixed(3) + ")" : "";
    [["c", TXT.c], ["m", TXT.m], ["j", TXT.j]].forEach(function (t) {
      var k3 = t[0], el = eqT[k3], pair = k3 !== "j";
      var x = (pair ? lerp(lerp(EQ[k3], TP[k3], q1), T3[k3], q2) : lerp(EQ[k3], T3[k3], q2)) * (1 - cz);
      var col = pair ? mix(mix(t[1], PAIR, q1), MIX, q2) : mix(t[1], MIX, q2);
      var bl = pair ? 1.2 * q1 + 1.8 * q2 : 3 * q2;
      el.style.transform = "translateX(" + (x - EQ[k3]).toFixed(1) + "px)" + sq; el.style.color = rgb(col); el.style.opacity = p >= NAMES[k3 === "c" ? 0 : k3 === "m" ? 1 : 2].b ? tOp : 0;
      el.style.filter = bl > .2 ? "blur(" + bl.toFixed(1) + "px)" : "";
    });
    eqP[0].style.opacity = (ap * (1 - ease(seg(q1, 0, .25)))).toFixed(3);
    eqP[1].style.opacity = (ap * (1 - ease(seg(q2, 0, .2)))).toFixed(3);
    eqIs.style.opacity = (ap * (1 - ease(seg(p, .58, .66)))).toFixed(3);
    eqIs.style.transform = "translateX(" + (((wx - EG.wn * wsc / 2) - EG.wl) / EG.bs).toFixed(1) + "px)";   // the « = » travels with the name's left edge

    /* the name arrives beside the « = » and takes the line's place */
    var ow = ease(seg(p, .24, .32)), ol = ease(seg(p, .92, .98)), oa = ease(seg(p, .94, 1));
    word.style.opacity = ow.toFixed(3); word.style.filter = ow < .98 ? "blur(" + (3 * (1 - ow)).toFixed(1) + "px)" : "";
    word.style.transform = "translate(" + wx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + wsc.toFixed(3) + ")";
    line.style.opacity = ol.toFixed(3); line.style.transform = "translateY(" + (14 * (1 - ol)).toFixed(1) + "px)";
    act.style.opacity = oa.toFixed(3); links.style.opacity = oa.toFixed(3);
    /* at zero they are hidden outright, not only transparent: Safari once kept a stale half-faded « Entrer sur le site » over the opening
       after scrolling back (his screenshot, 12 Oct); a focused link keeps its place so the keyboard is never dropped */
    var keep = final.contains(document.activeElement);
    act.style.visibility = links.style.visibility = oa > 0 || keep ? "" : "hidden";
    line.style.visibility = ol > 0 || keep ? "" : "hidden";
    act.style.transform = links.style.transform = "translateY(" + (12 * (1 - oa)).toFixed(1) + "px)";
    final.classList.toggle("is-final", p >= .94);
    skip.classList.toggle("done", p >= .94);           // the finished page has its own way in; the link stays for the keyboard
    if (langTo) langTo.classList.toggle("done", p >= .94);   // and the site header, with its own language button, follows
    drawStar(p);
  }

  function progress() { return clamp((window.pageYOffset - G.top) / G.range); }   // the track's offset is measured once, not every frame
  function frame() {   // the last tenth of the track holds the finished mark
    queued = false; if (!on) return;
    if ((window.devicePixelRatio || 1) !== md) { canvas(); last = -1; }   // a move to another screen fires no resize everywhere
    cur = progress(); render(clamp(cur / .9));
  }
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
    });
    fades.forEach(function (el) { el.removeAttribute("style"); });
    [worldsEl, head, hint, pools, halves, body, rim, glow, knife, eq, eqT.c, eqT.m, eqT.j, eqP[0], eqP[1], eqIs, word, line, act, links, worlds.c, worlds.m, worlds.j, POOL.c, POOL.m, POOL.j].concat(NAMES.map(function (N) { return N.el; })).forEach(function (el) { el.removeAttribute("style"); });
    gone = false; dyed = ""; door.classList.remove("melted");
    body.setAttribute("rx", "44"); rim.setAttribute("rx", "44");
    final.classList.remove("is-final"); skip.classList.remove("done"); if (langTo) langTo.classList.remove("done");
    if (pen) { pen.setTransform(1, 0, 0, 1, 0, 0); pen.clearRect(0, 0, star.width, star.height); FLY.box = null; FLY.lit = null; star.style.visibility = ""; }
  }

  window.addEventListener("scroll", schedule, { passive: true });
  /* the pinned or static choice follows the window (a phone turned on its side); a re-measure is for a change of width or of the boxes the maths depends on
     (the stage and the track), so a phone's URL bar showing or hiding (svh and lvh units do not move) costs nothing, and a desktop window resized in height does */
  window.addEventListener("resize", function () {
    var was = on; gate();
    if (!was || !on) return;
    if (Math.abs(window.innerWidth - mw) < 1 && stage.offsetHeight === msh && track.offsetHeight === mth) return;
    measure(); last = -1; schedule();
  }, { passive: true });
  window.addEventListener("load", remeasure);
  window.addEventListener("pageshow", function (e) { if (e.persisted) { last = -1; schedule(); } });   // back from another page (bfcache): draw the frame for where the page is now
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { last = -1; schedule(); } });   // back to the tab: the frame for where the page is now
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", remeasure);   // a web font that lands late (swap) changes the widths measured
  /* the pinned layout is the CSS's call (it needs motion and scripting allowed): the script runs only where the stage really is sticky */
  function gate() { if (door.hidden || rm.matches || window.getComputedStyle(stage).position !== "sticky") stop(); else start(); }
  if (rm.addEventListener) rm.addEventListener("change", gate); else if (rm.addListener) rm.addListener(gate);
  gate();

  var langBtn = $("#langBtn");
  if (langBtn) langBtn.addEventListener("click", function () { setTimeout(remeasure, 0); });
  /* the language button of the door (the site header comes after the door): it presses the header's own, then copies its label */
  if (langBtn && langTo) {
    langTo.hidden = false; langTo.textContent = langBtn.textContent; langTo.setAttribute("lang", langBtn.getAttribute("lang") || "en"); langTo.setAttribute("aria-label", langBtn.getAttribute("aria-label") || "");
    langTo.addEventListener("click", function () {
      langBtn.click();
      langTo.textContent = langBtn.textContent; langTo.setAttribute("lang", langBtn.getAttribute("lang") || "en"); langTo.setAttribute("aria-label", langBtn.getAttribute("aria-label") || "");
    });
  }
  /* an instant jump, even where "instant" is unknown and the page's smooth scrolling would apply (older Safari); the style is read first,
     as a scroll to the very top does not refresh it on its own (Chrome) and would glide */
  function jump(y) {
    var root = document.documentElement, was = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto"; root.getBoundingClientRect(); window.scrollTo(0, y); root.style.scrollBehavior = was;
  }

  /* once scrolled past, the door goes, until the next load: scrolling back up ends at the site's header, never in the melt again (his ask, 14 Oct).
     It goes while the scrolling goes on (a trackpad's momentum keeps scrolling for seconds): the browser keeps the view where it is
     (scroll anchoring), or, where it does not, the page is put back by the door's height, so nothing moves on screen. As jobs.nokime.fr's door. */
  var end = $("#doorEnd");
  function drop() {
    if (door.hidden || !end) return;
    window.removeEventListener("scroll", passed);
    var before = end.getBoundingClientRect().top;
    door.hidden = true;
    var shift = end.getBoundingClientRect().top - before;   // 0 where the browser kept the view itself
    if (Math.abs(shift) >= 1) jump(window.pageYOffset + shift);   // not for a sub-pixel rest: a jump would stop a smooth scroll on its way
    stop();
    /* a reload opens on the door, at its start: the place the browser would restore was taken without the door and would land mid-melt */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }
  function passed() { if (door.getBoundingClientRect().bottom <= 0) drop(); }
  window.addEventListener("scroll", passed, { passive: true });
  /* a jump to a part of the page past the door (opened at #outils, a link to it): the door goes first, because the browser's smooth scroll
     keeps the target it took at the start and would land a door's height too far if the door went on the way */
  function outside(hash) { var t = hash.length > 1 && document.getElementById(hash.slice(1)); return !!t && !door.contains(t); }
  if (outside(location.hash)) drop(); else passed();   // or a reload that lands past it
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href*='#']") : null;
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && a.pathname === location.pathname && outside(a.hash)) drop();
  });

  /* « Passer » and « Entrer » go past the door at once, and the page opens on the site (the site scrolls smoothly, which would play the whole
     melt fast-forwarded); without the script they are plain links to the same place */
  $$("a[href='#doorEnd']", door).forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!end) return; e.preventDefault();
      drop(); jump(end.getBoundingClientRect().top + window.pageYOffset);
      end.focus({ preventScroll: true });
    });
  });

  /* keyboard: reaching the way in completes the melt first, so the focused link is never an invisible one */
  final.addEventListener("focusin", function () {
    if (!on || cur >= .9) return;
    jump(G.top + G.range * .92);
    schedule();
  });

  /* nothing animates while the door is out of sight */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { door.classList.toggle("away", !en[en.length - 1].isIntersecting); }).observe(door);
  }
})();
