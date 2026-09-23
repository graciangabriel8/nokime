// Nokime Copius: its own motto, filmed — start from a product, follow its pairings, test a plate.
// Search "asperge", open the asparagus, follow its pairing to butter, close, open the Lab, set
// asparagus × butter: "a classic pairing". Filmed on https://copius.fr/atlas.html (the live site).
const WORD = LANG === 'en' ? 'asparagus' : 'asperge';
const T0 = 1.9, T1 = 3.1;   // typing, one letter at a time
return {
  duration: 15, cursor: 'dark', ripple: '#4F5B3F',
  setup: () => { if (LANG === 'en') H.$('#lang-en').click(); },
  P: {
    start: () => [innerWidth * 0.78, innerHeight * 0.78],
    search: () => { const r = H.$('#search').getBoundingClientRect(); return [r.left + 70, r.top + r.height * 0.62]; },
    card: () => H.ctr(H.$('article.card[data-id=asparagus] .card-main')),
    chip: () => H.ctr(H.$('#modal .pair-chip[data-open=butter]')),
    close: () => H.ctr(H.$('#closeBtn')),
    tab: () => H.below(H.$('#tabLab'), 0.5, 10),
    labA: () => H.ctr(H.$('#labA')),
    labB: () => H.ctr(H.$('#labB')),
  },
  MOVES: [[0.6, 1.5, 'start', 'search'], [3.3, 4.2, 'search', 'card'], [5.6, 6.4, 'card', 'chip'], [7.9, 8.7, 'chip', 'close'],
          [9.1, 9.8, 'close', 'tab'], [10.2, 10.8, 'tab', 'labA'], [11.3, 11.9, 'labA', 'labB']],
  CLICKS: [[1.7, () => H.$('#search').focus()],
           [4.3, () => H.$('article.card[data-id=asparagus] .card-main').click()],
           [6.5, () => H.$('#modal .pair-chip[data-open=butter]').click()],
           [8.8, () => H.$('#closeBtn').click()],
           [9.9, () => H.$('#tabLab').click()],
           [10.9, () => H.pick(H.$('#labA'), 'asparagus')],
           [12.0, () => H.pick(H.$('#labB'), 'butter')]],
  onFrame: (t) => {
    if (t >= T0 && t <= T1 + 0.05) { const n = Math.min(WORD.length, Math.ceil((t - T0) / (T1 - T0) * WORD.length)); const s = H.$('#search'); if (s.value !== WORD.slice(0, n)) H.type(s, WORD.slice(0, n)); }
  },
};
