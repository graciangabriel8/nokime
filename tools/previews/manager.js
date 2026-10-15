// Nokime Manager: open the sea bass, open its sheet, count the price down until the plate falls
// under its floor, cancel, show Exploitation. Filmed on the online app, signed in on a local test
// server (COOKIE=__Host-manager_session=<its session id> /tmp/preview http://localhost:8672/app/ ...).
// The sea bass is found by its price, not its position: the English list sorts differently.
const dish = () => H.$$('.dish').find(d => /30[.,]91/.test(d.textContent));
// The sheet is taller than the frame: its overlay scrolls to the end before the cursor sets off, so the
// verdict line and Cancel are on screen.
const sheet = () => H.$('.modal').closest('.overlay');
const ease = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const PRICES = []; for (let c = 340; c >= 190; c--) PRICES.push((c / 10).toString());   // 0.10 € a frame: the marker glides
return {
  duration: 14, cursor: 'dark', ripple: '#5E7D45',
  setup: () => { if (H.$('#langBtn').textContent.trim().toLowerCase() === LANG) H.$('#langBtn').click(); },   // the button names the other language; signed in, the last choice is the account's
  P: {
    start: () => [innerWidth * 0.66, innerHeight * 0.955],   // empty space beside « Comment lire la ligne »: the poster shows no cursor over a figure
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
    if (t >= 5.0 && t < 5.5) { const o = sheet(); o.scrollTop = (o.scrollHeight - o.clientHeight) * ease((t - 5.0) / 0.5); }   // done well before the price target is read at 5.7
    if (t >= 5.5 && t < 5.6) { const o = sheet(); o.scrollTop = o.scrollHeight - o.clientHeight; }
    if (t >= 7.0 && t < 9.6) { const i = Math.min(PRICES.length - 1, Math.floor((t - 7.0) / (2.5 / PRICES.length))); const inp = H.$('#d_price'); if (inp && inp.value !== PRICES[i]) H.type(inp, PRICES[i]); }
  },
};
