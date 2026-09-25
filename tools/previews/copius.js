// Nokime Copius: its own motto, filmed — start from a product, follow its pairings, test a plate.
// Search "asperge" (the filters fold away, the results stay under the tabs), open the
// asparagus, follow its pairing to butter, close, open the Lab, type each ingredient into its box
// and pick it from the list: "a classic pairing". Filmed on the full version, served locally:
// http://localhost:8643/atlas.html?full (copius.fr shows only the free version since Copius e95effc, 25 Sept 2026).
const WORD = LANG === 'en' ? 'asparagus' : 'asperge';
const A = LANG === 'en' ? 'aspar' : 'asper', B = LANG === 'en' ? 'butt' : 'beur';
const T0 = 1.9, T1 = 3.1;   // typing, one letter at a time
// [start, end, box, text]: the lab boxes are typed into the same way.
const TYPED = [[T0, T1, '#search', WORD], [11.4, 12.0, '#labA', A], [13.6, 14.1, '#labB', B]];
return {
  duration: 18, cursor: 'dark', ripple: '#4F5B3F',
  setup: () => {
    if (LANG === 'en') H.$('#lang-en').click();
    // The header is translucent over a backdrop blur, and WebKit snapshots do not draw backdrop
    // filters: what scrolls under it would show sharp. Opaque in its own colour is what a visitor
    // actually sees, the content behind blurred to nothing.
    const rgb = (getComputedStyle(H.$('.site-head')).backgroundColor.match(/[\d.]+/g) || []).slice(0, 3);
    if (rgb.length === 3) { const st = document.createElement('style'); st.textContent = '.site-head{background:rgb(' + rgb.join(',') + ')!important}'; document.head.append(st); }
  },
  P: {
    start: () => [innerWidth * 0.78, innerHeight * 0.78],
    search: () => { const r = H.$('#search').getBoundingClientRect(); return [r.left + 70, r.top + r.height * 0.62]; },
    card: () => H.ctr(H.$('article.card[data-id=asparagus] .card-main')),
    chip: () => H.ctr(H.$('#modal .pair-chip[data-open=butter]')),
    close: () => H.ctr(H.$('#closeBtn')),
    tab: () => H.below(H.$('#tabLab'), 0.5, -12),   // on the tab itself, not under it
    labA: () => { const r = H.$('#labA').getBoundingClientRect(); return [r.left + 60, r.top + r.height * 0.6]; },
    optA: () => H.ctr(H.$('#labAResults [data-pick=asparagus] .pr-name')),
    labB: () => { const r = H.$('#labB').getBoundingClientRect(); return [r.left + 60, r.top + r.height * 0.6]; },
    optB: () => H.ctr(H.$('#labBResults [data-pick=butter] .pr-name')),
  },
  MOVES: [[0.6, 1.5, 'start', 'search'], [3.3, 4.2, 'search', 'card'], [5.6, 6.4, 'card', 'chip'], [7.9, 8.7, 'chip', 'close'],
          [9.6, 10.2, 'close', 'tab'], [10.5, 11.1, 'tab', 'labA'], [12.2, 12.8, 'labA', 'optA'],
          [13.1, 13.5, 'optA', 'labB'], [14.3, 14.9, 'labB', 'optB']],
  CLICKS: [[1.7, () => H.$('#search').focus()],
           [4.3, () => H.$('article.card[data-id=asparagus] .card-main').click()],
           [6.5, () => H.$('#modal .pair-chip[data-open=butter]').click()],
           [8.8, () => H.$('#closeBtn').click()],
           [10.3, () => H.$('#tabLab').click()],
           [11.2, () => H.$('#labA').focus()],
           [12.9, () => H.$('#labAResults [data-pick=asparagus]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))],
           [13.55, () => H.$('#labB').focus()],   // Copius already moved focus here after the first pick
           [15.0, () => H.$('#labBResults [data-pick=butter]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))]],
  onFrame: (t) => {
    TYPED.forEach(([a, b, sel, w]) => {
      if (t < a || t > b + 0.05) return;
      const n = Math.min(w.length, Math.ceil((t - a) / (b - a) * w.length)), box = H.$(sel);
      if (box.value !== w.slice(0, n)) H.type(box, w.slice(0, n));
    });
  },
};
