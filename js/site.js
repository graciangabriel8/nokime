/* Nokime — site script. No build step, no dependencies.
   Language: French is read out of the page itself at load; English comes from i18n.js.
   Paper only: there is no theme code. */
(function () {
  "use strict";

  var LS_LANG = "nokime-lang";
  var ADDRESS = "contact@nokime.fr";
  var I18N = window.NOKIME_I18N || { fr: {}, en: {} };
  var ART = window.NOKIME_ART || {};

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- language ---------- */
  var lang = (function () {
    // ?lang=en or ?lang=fr in a shared link wins, and is remembered so the next page keeps it
    var q = /[?&]lang=(fr|en)(?:&|$)/.exec(location.search);
    // then it leaves the address bar, or a reload would undo a later click on the FR/EN button
    if (q) {
      try { localStorage.setItem(LS_LANG, q[1]); } catch (e) {}
      try { history.replaceState(history.state, "", location.pathname + location.search.replace(/([?&])lang=(?:fr|en)(&|$)/, function (m, a, b) { return b ? a : ""; }) + location.hash); } catch (e) {}
      return q[1];
    }
    try { var v = localStorage.getItem(LS_LANG); if (v === "fr" || v === "en") return v; } catch (e) {}
    // then the address: English on nokime.com, French everywhere else (the inline script in every page's head does
    // the same), whatever the browser's language: search engines read pages with an English browser, so guessing
    // from navigator.language had Google index nokime.fr in English
    return /(^|\.)nokime\.com$/.test(location.hostname) ? "en" : "fr";
  })();
  function T() { return I18N[lang] || I18N.fr; }

  /* The page is the French source: read it once before anything is replaced. */
  function harvest() {
    var fr = I18N.fr;
    $$("[data-t]").forEach(function (el) { var k = el.getAttribute("data-t"); if (fr[k] === undefined) fr[k] = el.textContent; });
    $$("[data-t-attr]").forEach(function (el) {
      el.getAttribute("data-t-attr").split(",").forEach(function (pair) {
        var p = pair.split(":"), attr = p[0].trim(), k = p[1].trim();
        if (fr[k] === undefined) fr[k] = el.getAttribute(attr) || "";
      });
    });
    var tk = document.body.getAttribute("data-title"); if (tk && fr[tk] === undefined) fr[tk] = document.title;
    var dk = document.body.getAttribute("data-desc"), md = $('meta[name="description"]');
    if (dk && md && fr[dk] === undefined) fr[dk] = md.getAttribute("content") || "";
  }

  var MAIL = {
    fr: {
      founders: { subject: "Nokime Manager : essayer l’outil", body: "Établissement :\nVille :\nCouverts par service :\nCe qui me fait écrire :\n" },
      copius: { subject: "Nokime Copius : classe pilote", body: "Établissement :\nClasse, niveau :\nCe que j’aimerais en faire :\n" },
      general: { subject: "Nokime : contact", body: "" }
    },
    en: {
      founders: { subject: "Nokime Manager: trying the tool", body: "Restaurant:\nCity:\nCovers per service:\nWhy I am writing:\n" },
      copius: { subject: "Nokime Copius: pilot class", body: "School:\nClass, level:\nWhat I would like to do with it:\n" },
      general: { subject: "Nokime: contact", body: "" }
    }
  };

  function applyLang() {
    var t = T();
    document.documentElement.setAttribute("lang", lang);
    $$("[data-t]").forEach(function (el) { var k = el.getAttribute("data-t"); if (t[k] !== undefined) el.textContent = t[k]; });
    $$("[data-t-attr]").forEach(function (el) {
      el.getAttribute("data-t-attr").split(",").forEach(function (pair) {
        var p = pair.split(":"), attr = p[0].trim(), k = p[1].trim();
        if (t[k] !== undefined) el.setAttribute(attr, t[k]);
      });
    });
    $$("[data-mail]").forEach(function (a) {
      var m = (MAIL[lang] || MAIL.fr)[a.getAttribute("data-mail")];
      if (m) a.href = "mailto:" + ADDRESS + "?subject=" + encodeURIComponent(m.subject) + (m.body ? "&body=" + encodeURIComponent(m.body) : "");
    });
    var tk = document.body.getAttribute("data-title"); if (tk && t[tk]) document.title = t[tk];
    var dk = document.body.getAttribute("data-desc"), md = $('meta[name="description"]');
    if (dk && t[dk] && md) md.setAttribute("content", t[dk]);
    var lb = $("#langBtn");
    if (lb) { lb.textContent = lang === "fr" ? "EN" : "FR"; lb.setAttribute("lang", lang === "fr" ? "en" : "fr"); lb.setAttribute("aria-label", t.langSwitch || ""); }
    var mb = $("#menuBtn"); if (mb && t.menuLabel) mb.setAttribute("aria-label", t.menuLabel);
    $$("[data-art]").forEach(drawInto);
    $$("video[data-src-fr]").forEach(function (v) {
      var src = v.getAttribute("data-src-" + lang) || v.getAttribute("data-src-fr"), poster = v.getAttribute("data-poster-" + lang);
      if (poster) v.setAttribute("poster", poster);
      var cur = v.currentSrc || (v.querySelector("source") ? v.querySelector("source").src : "");
      if (cur.indexOf(src.replace(/^(\.\.\/)+/, "")) === -1) {
        /* play only once the new source can: a play() issued with the swap is aborted by the load */
        if (!v.hasAttribute("data-still")) v.addEventListener("canplay", function () {
          /* not a film the visitor paused, and not one off screen */
          var r = v.getBoundingClientRect();
          if ($(".shot-toggle.held", v.parentNode) || r.bottom < 0 || r.top > window.innerHeight) return;
          var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
        }, { once: true });
        v.src = src; v.load();
      }
    });
  }
  function setLang(l) { lang = l; try { localStorage.setItem(LS_LANG, l); } catch (e) {} applyLang(); }

  /* ---------- drawings ---------- */
  function art(id, label) {
    var a = ART[id]; if (!a) return "";
    return '<svg class="art" viewBox="0 0 96 96" role="img" aria-label="' + esc(label || a[lang] || a.fr) + '">' + a.svg + "</svg>";
  }
  function drawInto(el) {
    var id = el.getAttribute("data-art"), a = ART[id]; if (!a) return;
    var caption = el.hasAttribute("data-caption");
    el.innerHTML = caption
      ? '<svg class="art" viewBox="0 0 96 96" aria-hidden="true">' + a.svg + "</svg><figcaption>" + esc(a[lang] || a.fr) + "</figcaption>"
      : art(id);
  }

  /* ---------- navigation ---------- */
  function markCurrent() {
    var here = location.pathname.replace(/index\.html$/, "");
    var brand = document.querySelector(".brand"), home = brand ? brand.pathname.replace(/index\.html$/, "") : "/";
    $$(".nav a").forEach(function (a) {
      var target = a.pathname.replace(/index\.html$/, "");
      if (target !== home && here.indexOf(target) === 0) a.setAttribute("aria-current", "page");
    });
  }

  /* ---------- the home hero: a new set of drawings on each visit ----------
     One large animal, then two more animals and three plants, never two of a kind, each a little tilted.
     Without script the six in the page stay as written. */
  var HERO_POOL = {
    anchor: ["chicken", "canard-colvert", "venison", "hare", "american-lobster", "dungeness-crab", "sea-urchin", "escargot-de-bourgogne", "squid", "hake"],
    animal: { bird: ["chicken", "canard-colvert"], meat: ["venison", "hare", "lamb-shank"], crustacean: ["langoustine", "american-lobster", "dungeness-crab", "brown-shrimp"],
              sea: ["scallop", "sea-urchin", "squid"], fish: ["cod", "hake", "anchovy"], snail: ["escargot-de-bourgogne"] },
    plant: { mushroom: ["porcini", "maitake"], fruit: ["fraise-des-bois", "avocado"], herb: ["cilantro"],
             veg: ["corn", "garlic", "kohlrabi", "bell-pepper", "musquee-de-provence-squash"] }
  };
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function shuffled(list) { return list.slice().sort(function () { return Math.random() - 0.5; }); }
  function shuffleHero() {
    var spans = $$(".hero-art [data-art]"); if (spans.length !== 6) return;
    var anchor = pick(HERO_POOL.anchor.filter(function (id) { return ART[id]; })), kindOf = {};
    Object.keys(HERO_POOL.animal).forEach(function (k) { HERO_POOL.animal[k].forEach(function (id) { kindOf[id] = k; }); });
    var animals = shuffled(Object.keys(HERO_POOL.animal).filter(function (k) { return k !== kindOf[anchor]; })).slice(0, 2)
      .map(function (k) { return pick(HERO_POOL.animal[k]); });
    var plants = shuffled(Object.keys(HERO_POOL.plant)).slice(0, 3).map(function (k) { return pick(HERO_POOL.plant[k]); });
    var ids = [anchor].concat(shuffled(animals.concat(plants)));
    if (ids.some(function (id) { return !ART[id]; })) return;
    spans.forEach(function (el, i) {
      el.setAttribute("data-art", ids[i]);
      var tilt = (Math.random() * 2 - 1) * (i === 0 ? 6 : 14);
      el.style.transform = "rotate(" + tilt.toFixed(1) + "deg)";
    });
  }

  /* ---------- boot ---------- */
  /* reduced motion: the preview stays still on its poster, with controls to play it */
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $$("video[data-src-fr]").forEach(function (v) { v.setAttribute("data-still", ""); v.removeAttribute("autoplay"); v.pause(); v.controls = true; });
  }
  harvest();
  shuffleHero();
  applyLang();
  markCurrent();
  /* back from a page where the language changed, the page restored from memory follows it */
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    var l = null; try { l = localStorage.getItem(LS_LANG); } catch (x) {}
    if ((l === "fr" || l === "en") && l !== lang) { lang = l; applyLang(); }
  });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var lb = $("#langBtn"); if (lb) lb.addEventListener("click", function () { setLang(lang === "fr" ? "en" : "fr"); });
  var mb = $("#menuBtn"), nav = $("#nav");
  if (mb && nav) {
    var setMenu = function (open) {
      nav.classList.toggle("open", open); mb.setAttribute("aria-expanded", String(open));
      mb.setAttribute("aria-label", open ? (T().menuClose || "") : (T().menuLabel || "Menu"));
    };
    mb.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); mb.focus(); } });
    document.addEventListener("click", function (e) { if (nav.classList.contains("open") && !nav.contains(e.target) && !mb.contains(e.target)) setMenu(false); });
    window.addEventListener("scroll", function () { if (nav.classList.contains("open")) setMenu(false); }, { passive: true });
  }

  /* ---------- the product films: a pause button, and no play while off screen ---------- */
  $$("video[data-src-fr]").forEach(function (v) {
    if (v.hasAttribute("data-still")) return;
    var box = v.parentNode, b = document.createElement("button"), held = false;
    b.type = "button"; b.className = "shot-toggle";
    b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="i-pause" d="M5 3v10M11 3v10"/><path class="i-play" d="M5 3l8 5-8 5z"/></svg>';
    function label() { var t = T(); b.setAttribute("aria-label", held ? (t.shotPlay || "") : (t.shotPause || "")); b.classList.toggle("held", held); }
    b.addEventListener("click", function () { held = !held; label(); if (held) v.pause(); else { var p = v.play(); if (p && p.catch) p.catch(function () {}); } });
    if (box.classList) { box.classList.add("shot-box"); box.appendChild(b); label(); }
    if (lb) lb.addEventListener("click", label);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (held) return; if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
    }, { threshold: 0.05 }).observe(v);
  });

  /* ---------- a mail link does nothing without a mail program: the address can be copied ---------- */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var a = b.getAttribute("data-copy"), s = b.querySelector("[data-t]");
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(a).then(function () { if (s) { var k = s.getAttribute("data-t"), t = T(); s.textContent = t.ctCopied || ""; setTimeout(function () { s.textContent = T()[k] || I18N.fr[k] || ""; }, 1800); } }, function () {});
    });
  });
})();

/* Smooth wheel scrolling (his ask, 25 Nov 2026, after cantor8.io, which uses Lenis): each wheel step moves a target and
   the page eases toward it, 10 % of the way per 60 Hz frame, never faster than VMAX, and a flick aims at most LEAD
   screens ahead, so a hard flick does not land at the bottom (his ask, same day). The Copius and Manager films are stops:
   a glide halts with the film centred, and the next wheel gesture moves on (his ask, same day). Touch, keyboard, scrollbar, anchors and the pages' own
   scrollTo stay native: a scroll this code did not make cancels the glide. Off under reduced motion, for pinch-zoom
   (ctrl + wheel) or a pinch-zoomed page, for sideways wheels, and inside any box that can still scroll itself (the open menu). */
(function () {
  var mq = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
  if (!window.requestAnimationFrame || (mq && mq.matches)) return;
  var VMAX = 35, LEAD = 0.75;   // px per 60 Hz frame at most (~2 100 px/s), and how far ahead of the page a flick may aim, in screens
  var root = document.documentElement, cur = 0, target = 0, set = -1, raf = 0, last = 0, was = "", lastWheel = 0;
  var stops = [].slice.call(document.querySelectorAll(".shot-frame")), head = document.querySelector(".site-head");
  function stopAt(el) {   // the scroll position that centres a film between the sticky header and the window's bottom
    var r = el.getBoundingClientRect(), h = head ? head.offsetHeight : 0;
    return Math.max(0, Math.min(max(), Math.round(window.pageYOffset + r.top - h - (root.clientHeight - h - r.height) / 2)));
  }
  function hold(from, to, fresh) {   // a glide halts on each film it reaches; a new wheel gesture (after a 250 ms pause) moves on from it
    for (var i = 0; i < stops.length; i++) {
      if (!stops[i].offsetParent) continue;
      var s = stopAt(stops[i]);
      if (Math.abs(from - s) < 6) { if (!fresh) return s; continue; }
      if ((from < s && to > s) || (from > s && to < s)) to = s;
    }
    return to;
  }
  function max() { return Math.max(0, root.scrollHeight - root.clientHeight); }
  function inner(el, dy) {   // an element between the pointer and the page that can still scroll this way
    for (; el && el !== document.body && el !== root; el = el.parentElement) {
      if (el.nodeType !== 1 || el.clientHeight === undefined || el.scrollHeight <= el.clientHeight + 1) continue;   // SVG has no clientHeight
      var o = getComputedStyle(el).overflowY;
      if ((o === "auto" || o === "scroll") && (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
    }
    return false;
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; set = -1; root.style.scrollBehavior = was; }
  function frame(now) {
    if (Math.abs(window.pageYOffset - set) > 2) { stop(); return; }   // moved by something else since the last frame
    var dt = Math.min(64, now - (last || now - 16.7)); last = now;
    var step = (target - cur) * (1 - Math.pow(0.9, dt / 16.7)), cap = VMAX * dt / 16.7;
    cur += Math.max(-cap, Math.min(cap, step));
    if (Math.abs(target - cur) < 0.5) cur = target;
    set = Math.round(cur); window.scrollTo(0, set);
    if (cur === target) { stop(); return; }
    raf = requestAnimationFrame(frame);
  }
  window.addEventListener("wheel", function (e) {
    if (e.defaultPrevented || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY || (mq && mq.matches)) return;
    if ((window.visualViewport && visualViewport.scale > 1.01) || inner(e.target, e.deltaY)) { if (raf) stop(); return; }   // pinch-zoomed: the wheel pans the zoom
    var d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
    if (!raf) { cur = target = set = window.pageYOffset; was = root.style.scrollBehavior; root.style.scrollBehavior = "auto"; last = 0; }
    var lead = LEAD * root.clientHeight;   // a hard flick never runs more than this far ahead of the page
    var t = e.timeStamp || performance.now(), fresh = t - lastWheel > 250; lastWheel = t;
    target = hold(cur, Math.max(0, Math.min(max(), Math.max(cur - lead, Math.min(cur + lead, target + d)))), fresh && !raf);
    e.preventDefault();
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: false });
  window.addEventListener("scroll", function () { if (raf && Math.abs(window.pageYOffset - set) > 2) stop(); }, { passive: true });
  if (mq && mq.addEventListener) mq.addEventListener("change", function (m) { if (m.matches) stop(); });
})();
