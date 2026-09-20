const M = require('./engine.js');
function run(label, design, priceMul, seed) {
    const g = M.newGame({ seed, companyName: 'T', home: 'me' });
    const r = M.designCar(g, design);
    if (!r.ok) { console.log(label, 'DESIGN FAIL', r.error); return; }
    if (priceMul) M.setPrice(g, r.model.id, Math.round(r.model.price * priceMul));
    const m = g.models[0];
    const est = M.estimate(g, m.design, m.price);
    console.log(label, 'price', m.price, 'parts', m.spec.partsCost, 'fair', Math.round(est.fair), 'estDemand', est.total, 'spec', JSON.stringify(m.spec));
    for (let i = 0; i < 8; i++) { while (g.events.length) M.resolveEvent(g, g.events[0].id, 0); const e = M.endTurn(g); if (!e.ok) { console.log(e); break; } if (i % 2 == 0) console.log('  ', g.year, g.quarter, 'sold', e.summary.sold, 'dem', m.demandLast, 'profit', M.fmtMoney(e.summary.profit), 'cash', M.fmtMoney(g.cash), 'brand', g.brand.toFixed(1)); }
}
run('GOOD sedan', { name: 'Nova', body: 'sedan', engine: 'i4', gearbox: 'm4', interior: 'std', safety: 1, quality: 50, price: 0 }, 1.1, 1);
run('CHEAP city', { name: 'Eco', body: 'city', engine: 'i3_small', gearbox: 'm3', interior: 'basic', safety: 0, quality: 20, price: 0 }, 1, 2);
run('OVERPRICED lux', { name: 'Lux', body: 'luxury', engine: 'v8', gearbox: 'a3', interior: 'lux', safety: 1, quality: 90, price: 0 }, 1.8, 3);
run('BAD junk', { name: 'Junk', body: 'coupe', engine: 'i3_small', gearbox: 'a3', interior: 'lux', safety: 0, quality: 0, price: 0 }, 1.5, 4);

// Full 70-year crash test with random actions
const g = M.newGame({ seed: 7, companyName: 'Sim', home: 'na' });
let rnd = 7; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
let turns = 0;
while (!g.gameOver && turns < 400) {
    while (g.events.length) M.resolveEvent(g, g.events[0].id, Math.floor(R() * g.events[0].choices.length));
    const av = M.availableParts(g);
    if ((turns===0 || R() < 0.15) && g.cash > 1e6 * M.inflation(g.year)) {
        const d = { name: 'M' + turns, body: av.bodies[Math.floor(R() * av.bodies.length)], engine: av.engines[Math.floor(R() * av.engines.length)], gearbox: av.gearboxes[Math.floor(R() * av.gearboxes.length)], interior: av.interiors[Math.floor(R() * 4)], safety: av.safety[av.safety.length - 1], quality: Math.floor(R() * 100), price: 0 };
        if (M.ENGINES[d.engine].ev) d.gearbox = 'ev1'; else if (d.gearbox === 'ev1') d.gearbox = av.gearboxes[0];
        M.designCar(g, d);
    }
    if (R() < 0.1) { const t = Object.keys(M.TECHS)[Math.floor(R() * 19)]; M.startResearch(g, t); }
    if (R() < 0.05) M.buildFactory(g, Object.keys(M.REGIONS)[Math.floor(R() * 6)]);
    if (R() < 0.08) M.expandFactory(g, g.factories[0].id);
    if (R() < 0.05) M.upgradeAutomation(g, g.factories[0].id);
    if (R() < 0.05) M.takeLoan(g, 1e6);
    if (R() < 0.05) M.setMarketing(g, 'na', 2);
    if (R() < 0.03) M.setRacing(g, true, 500000);
    for (const f of g.factories) if (f.assigned == null) { const m = g.models.find(x => !x.discontinued); if (m) M.assignFactory(g, f.id, m.id); }
    for (const m of g.models) if (!m.discontinued && m.age > 5) M.discontinue(g, m.id);
    const e = M.endTurn(g); if (!e.ok) throw new Error(e.error);
    turns++;
}
console.log('SIM done', g.year, g.gameOverReason, 'cash', M.fmtMoney(g.cash), 'value', M.fmtMoney(M.companyValue(g)), 'models', g.models.length, 'techs', g.techs.length, 'ach', g.achievements.map(a => a.id));
const json = JSON.stringify(g); console.log('save size', json.length);
console.log('ALL OK');
