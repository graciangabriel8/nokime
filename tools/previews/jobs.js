// Nokime Jobs: the welcome door (drawings drifting behind the line), then the board with its example offers
// (each tagged "exemple" on the card) — press "Voir les offres", keep the seasons, open one, write to the
// establishment, then the establishments' side. The door is held 1.5 s so the opening reads.
// Filmed on https://jobs.nokime.fr/?demo=1 (the live site; ?demo=1 is its
// own switch for the example offers, never shown in the public list).
const card = () => H.$$('article.job').find(a => a.offsetParent !== null);
return {
  duration: 14, cursor: 'dark', ripple: '#2038D5',
  setup: () => { if (LANG === 'en') H.$('#langBtn').click(); },
  P: {
    start: () => [innerWidth * 0.8, innerHeight * 0.82],
    see: () => H.ctr(H.btn(H.$('.door'), /Voir les offres|See the offers|offres|offers/)),
    season: () => H.ctr(H.$('[data-kind=saison]')),
    more: () => H.ctr(card().querySelector('details summary')),
    apply: () => H.ctr(card().querySelector('a.btn')),
    all: () => H.ctr(H.$('[data-kind=all]')),
    rest: () => [innerWidth * 0.72, innerHeight * 0.6],
  },
  SCROLLS: [[3.1, 4.2, () => H.top(H.$('#offres')) - 8], [11.0, 12.4, () => H.top(H.$('#prix')) - 24]],
  MOVES: [[1.5, 2.7, 'start', 'see'], [4.3, 5.1, 'see', 'season'], [5.8, 6.6, 'season', 'more'], [8.0, 8.8, 'more', 'apply'],
          [9.5, 10.2, 'apply', 'all'], [10.8, 11.6, 'all', 'rest']],
  CLICKS: [[2.9, null],                                   // the door's button is pressed; the scroll below is the page's own anchor, driven per frame
           [5.2, () => H.$('[data-kind=saison]').click()],
           [6.7, () => card().querySelector('details summary').click()],
           [8.9, null],                                   // "Écrire à l'établissement" opens the visitor's mail app: pressed, not followed
           [10.3, () => H.$('[data-kind=all]').click()]],
};
