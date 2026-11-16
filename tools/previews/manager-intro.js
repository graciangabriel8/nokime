// Nokime Manager, its welcome: open the card from « ? », read the dish line (cost, floor, target, price),
// then « Chiffrer mon premier plat » and the spotlight's first four stops on that line.
// Filmed on the released app served locally with a service filled in (covers, brigade, rent), so the
// floor and target are the app's own figures, not « — »: http://localhost:8693/app/?film=1
const tip = () => H.$('.in-tip');
const next = () => H.btn(tip(), /^(Suivant|Next)$/);
return {
  duration: 17, cursor: 'dark', ripple: '#5E7D45',
  setup: () => { if (H.$('#langBtn').textContent.trim().toLowerCase() === LANG) H.$('#langBtn').click(); },   // the button names the other language
  P: {
    start: () => [innerWidth * 0.62, innerHeight * 0.80],
    help: () => H.ctr(H.$('#helpBtn')),
    go: () => H.ctr(H.btn(H.$('.in-card'), /Chiffrer mon premier plat|Cost my first dish/)),
    n1: () => H.ctr(next()), n2: () => H.ctr(next()), n3: () => H.ctr(next()),   // each read when its move starts: the tip moves with the stop
  },
  MOVES: [[0.5, 1.6, 'start', 'help'], [5.4, 6.4, 'help', 'go'], [7.6, 8.4, 'go', 'n1'], [10.6, 11.4, 'n1', 'n2'], [12.9, 13.7, 'n2', 'n3']],
  CLICKS: [[1.8, () => H.$('#helpBtn').click()],
           [6.6, () => H.btn(H.$('.in-card'), /Chiffrer mon premier plat|Cost my first dish/).click()],
           [9.6, () => next().click()],
           [11.9, () => next().click()],
           [14.2, () => next().click()]],
};
