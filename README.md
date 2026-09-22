# Nokime — site du groupe

The group's public site: Nokime Manager, Nokime Copius, the group, contact, legal. Static, no build step, no dependencies.

- French is the source language and lives in the HTML; `js/site.js` reads it out of every `data-t` element at load, so pages read without JavaScript. English lives in `js/i18n.js`.
- Fonts are self-hosted in `fonts/` (latin subset, OFL — see `fonts/LICENSE.txt`); nothing loads from a third party.
- Drawings and price bands in `js/art.js` come from the Copius atlas. Regenerate after a Copius data change:

      python3 tools/extract-art.py <manager repo>/data/ingredients.js

- The live demo on the home and Manager pages uses the mid-point of each product's Copius price band, all-kg products only.

Serve locally: `python3 -m http.server 8647` (or `preview_start` name `nokime`).
Before a commit that touches `css/` or `js/`: `python3 tools/bump.py` (raises `?v=N` on every asset link, so a push never pairs new HTML with cached CSS).
Check that every French key has its English: `python3 tools/check-i18n.py`.
