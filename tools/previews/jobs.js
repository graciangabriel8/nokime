// Nokime Jobs: the board with its example offers (each tagged "exemple" on the card) —
// see the offers, keep the seasons, open one, write to the establishment, then the establishments' side.
// Filmed on https://jobs.nokime.fr/?demo=1 (the live site; ?demo=1 is its
// own switch for the example offers, never shown in the public list).
const card = () => H.$$('article.job').find(a => a.offsetParent !== null);
return {
  duration: 14, cursor: 'dark', ripple: '#2038D5',
  setup: () => { if (LANG === 'en') H.$('#langBtn').click(); },
  P: {
    start: () => [innerWidth * 0.8, innerHeight * 0.82],
    see: () => H.ctr(H.btn(H.$('.hero'), /Voir les offres|See the offers|offres|offers/)),
    season: () => H.ctr(H.$('[data-kind=saison]')),
    more: () => H.ctr(card().querySelector('details summary')),
    apply: () => H.ctr(card().querySelector('a.btn')),
    all: () => H.ctr(H.$('[data-kind=all]')),
    rest: () => [innerWidth * 0.72, innerHeight * 0.6],
  },
  SCROLLS: [[2.3, 3.4, () => H.top(H.$('#offres')) - 8], [10.2, 11.6, () => H.top(H.$('#prix')) - 24]],
  MOVES: [[0.7, 1.9, 'start', 'see'], [3.5, 4.3, 'see', 'season'], [5.0, 5.8, 'season', 'more'], [7.2, 8.0, 'more', 'apply'],
          [8.7, 9.4, 'apply', 'all'], [10.0, 10.8, 'all', 'rest']],
  CLICKS: [[2.1, null],                                   // the button is pressed; the scroll below is the page's own anchor, driven per frame
           [4.4, () => H.$('[data-kind=saison]').click()],
           [5.9, () => card().querySelector('details summary').click()],
           [8.1, null],                                   // "Écrire à l'établissement" opens the visitor's mail app: pressed, not followed
           [9.5, () => H.$('[data-kind=all]').click()]],
};
