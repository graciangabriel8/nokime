# Nokime — site du groupe

The group's public site: Nokime Manager, Nokime Copius, Nokime Jobs, the group, contact, legal. Static, no build step, no dependencies.

Manager (manager.nokime.fr), Copius (copius.fr) and Jobs (jobs.nokime.fr) have their own sites; their pages here present them and link out. `jobs/offres/` and `jobs/publier/` are redirects to the Jobs site, kept so old links still land; `git grep jobs.nokime.fr` and `git grep manager.nokime.fr` list every place those URLs are written, for when a domain changes.

- French is the source language and lives in the HTML; `js/site.js` reads it out of every `data-t` element at load, so pages read without JavaScript. English lives in `js/i18n.js`.
- nokime.fr opens in French and nokime.com in English: same files, the address picks (`js/site.js` and the inline script at the top of every page). A `?lang=` link or the FR/EN button overrides it, remembered per address. Every page's canonical stays on nokime.fr, so search engines keep indexing the French address.
- Fonts are self-hosted in `fonts/` (latin subset, OFL — see `fonts/LICENSE.txt`); nothing loads from a third party.
- Drawings in `js/art.js` come from the Copius atlas. Regenerate after a Copius data change:

      python3 tools/extract-art.py <manager repo>/data/ingredients.js

Serve locally: `python3 -m http.server 8647` (or `preview_start` name `nokime`).
Before a commit that touches `css/` or `js/`: `python3 tools/bump.py` (raises `?v=N` on every asset link, so a push never pairs new HTML with cached CSS).
Check that every French key has its English: `python3 tools/check-i18n.py`.

The Manager, Copius and Jobs pages each carry a real recording of the tool (`media/<tool>-preview-{fr,en}.mp4` + posters), made by `tools/preview.swift` from the scene in `tools/previews/<tool>.js` — usage at the top of that file. Re-record a tool after a visible change to it.

Instagram posts are queued in `social/posts.json` and posted by `.github/workflows/instagram.yml` (`tools/ig_post.py`); `social/README.md` explains the queue, the failure messages and the one-time key setup.
