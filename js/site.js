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
    // then French, whatever the browser's language: the page is French, and search engines read it with an
    // English browser, so guessing from navigator.language had Google index the site in English
    return "fr";
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
      founders: { subject: "Nokime Manager — établissement fondateur", body: "Établissement :\nVille :\nCouverts par service :\nCe qui me fait écrire :\n" },
      copius: { subject: "Nokime Copius — classe pilote", body: "Établissement :\nClasse, niveau :\nCe que j’aimerais en faire :\n" },
      general: { subject: "Nokime — contact", body: "" }
    },
    en: {
      founders: { subject: "Nokime Manager — founding restaurant", body: "Restaurant:\nCity:\nCovers per service:\nWhy I am writing:\n" },
      copius: { subject: "Nokime Copius — pilot class", body: "School:\nClass, level:\nWhat I would like to do with it:\n" },
      general: { subject: "Nokime — contact", body: "" }
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
      if (v.currentSrc.indexOf(src.replace(/^(\.\.\/)+/, "")) === -1) {
        /* play only once the new source can: a play() issued with the swap is aborted by the load */
        if (!v.hasAttribute("data-still")) v.addEventListener("canplay", function () { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }, { once: true });
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
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var lb = $("#langBtn"); if (lb) lb.addEventListener("click", function () { setLang(lang === "fr" ? "en" : "fr"); });
  var mb = $("#menuBtn"), nav = $("#nav");
  if (mb && nav) {
    mb.addEventListener("click", function () {
      var open = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); } });
  }
})();
