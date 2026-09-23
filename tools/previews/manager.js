// Nokime Manager: open the sea bass, open its sheet, count the price down until the plate falls
// under its floor, cancel, show Exploitation. Filmed on http://localhost:8645/ (the tool served
// from ~/Projets/nokime-manager). The sea bass is found by its price, not its position: the
// English list sorts differently.
const dish = () => H.$$('.dish').find(d => /30[.,]91/.test(d.textContent));
const PRICES = []; for (let c = 340; c >= 190; c--) PRICES.push((c / 10).toString());   // 0.10 € a frame: the marker glides
return {
  duration: 14, cursor: 'dark', ripple: '#5E7D45',
  setup: () => { if (LANG === 'en') H.$('#langBtn').click(); },
  P: {
    start: () => [innerWidth * 0.84, innerHeight * 0.86],
    row: () => { const r = dish().querySelector('.head').getBoundingClientRect(); return [r.left + Math.min(250, r.width * 0.22), r.top + r.height / 2]; },
    edit: () => H.ctr(H.btn(dish(), /Modifier|Edit/)),
    price: () => H.below(H.$('#d_price'), 0.3, 16),
    cancel: () => H.ctr(H.btn(H.$('.modal'), /Annuler|Cancel/)),
    tab: () => H.below(H.$('[data-view=exploitation]'), 0.45, 14),
  },
  MOVES: [[0.6, 2.3, 'start', 'row'], [3.5, 4.6, 'row', 'edit'], [5.7, 6.5, 'edit', 'price'], [10.0, 10.9, 'price', 'cancel'], [11.5, 12.3, 'cancel', 'tab']],
  CLICKS: [[2.5, () => dish().querySelector('.head').click()],
           [4.8, () => H.btn(dish(), /Modifier|Edit/).click()],
           [6.7, () => { const i = H.$('#d_price'); i.focus(); i.select(); }],
           [11.1, () => H.btn(H.$('.modal'), /Annuler|Cancel/).click()],
           [12.5, () => H.$('[data-view=exploitation]').click()]],
  onFrame: (t) => {
    if (t >= 7.0 && t < 9.6) { const i = Math.min(PRICES.length - 1, Math.floor((t - 7.0) / (2.5 / PRICES.length))); const inp = H.$('#d_price'); if (inp && inp.value !== PRICES[i]) H.type(inp, PRICES[i]); }
  },
};
