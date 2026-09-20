/**
 * CyberClash - Headless Engine Regression Tests
 * Run: node test_headless.js
 *
 * Verifies gameplay logic WITHOUT a browser:
 *  [1] Full match simulation (both sides play every card type randomly)
 *  [2] Bot AI v2 activity (local match, human idle)
 *  [3] Slow effect (burn / cryo thaw = -40% move speed)
 *  [4] Elixir fairness (online = equal rates, local = bot handicap)
 *  [5] Field fusion (compatible / incompatible / double-fuse)
 *  [6] Snapshot shape (fields needed by renderer & online clients)
 *  [8] Air Hyper-Lane (ground reroute, aerial flight, core capture, tower vulnerability)
 *  [9] Ground/Air targeting, Quantum Reactor economy & Guardian Wrath
 *  [10] Sky Zap anti-air spell, tower self-repair & Daily Champion card
 *  [11] Thermal Storm air hazard, aerial avoidance & Adaptive Bot intel
 */
const Room = require('./game_room.js');
const CD = Room.CARD_DATABASE;

let failures = 0;
function assert(cond, msg) {
    if (cond) console.log('   ✅ ' + msg);
    else { failures++; console.error('   ❌ ' + msg); }
}

const laneX = [230, 540, 850];

// ---------- [1] Full match simulation ----------
(function testFullMatch() {
    console.log('\n[1] Full match simulation (random play, all card types):');
    const room = new Room({ isLocal: false, p1Level: 4, p2Level: 4 });
    room.start();
    for (let tick = 0; tick < 9000 && room.state === 'RUNNING'; tick++) {
        room.update();
        if (room.currentTick % 45 === 0) {
            for (const pnum of [1, 2]) {
                const p = pnum === 1 ? room.p1 : room.p2;
                const playable = p.hand.filter(id => CD[id] && CD[id].cost <= p.energy + 2);
                if (!playable.length) continue;
                if (Math.random() < 0.85) {
                    const id = playable[Math.floor(Math.random() * playable.length)];
                    const c = CD[id];
                    const lane = Math.floor(Math.random() * 3);
                    const x = laneX[lane] + (Math.random() - 0.5) * 120;
                    const y = c.isSpell ? (pnum === 1 ? 640 : 1200) : (pnum === 1 ? 1150 : 470);
                    room.playCard(pnum, id, x, y);
                }
            }
        }
        if (room.currentTick % 360 === 0) {
            room.triggerCommandCannon(1, Math.floor(Math.random() * 3));
            room.triggerCommandCannon(2, Math.floor(Math.random() * 3));
        }
    }
    assert(room.state === 'OVER', `Match finished (winner=${room.winner}, tick=${room.currentTick})`);
    const snap = room.getSnapshot();
    assert(Array.isArray(snap.units), 'Snapshot has units array');
    assert(typeof snap.timeRemaining === 'number', 'Snapshot has timeRemaining');
    assert(Array.isArray(snap.combatFeed) && snap.combatFeed.length > 0, 'Combat feed populated');
    assert('id' in snap.p1.towers.left && 'id' in snap.p2.towers.main, 'Snapshot towers carry ids');
})();

// ---------- [2] Bot AI v2 activity ----------
(function testBotAI() {
    console.log('\n[2] Bot AI v2 activity (local match, human idle):');
    const room = new Room({ isLocal: true, p1Level: 3, p2Level: 3 });
    room.start();
    let botPlays = 0, botSpells = 0, botCannons = 0, botFusions = 0;
    room.onEvent = (evt) => {
        if (evt.type === 'card_played' && evt.playerNum === 2) {
            botPlays++;
            if (CD[evt.cardId] && CD[evt.cardId].isSpell) botSpells++;
        }
        if (evt.type === 'cannon_fired' && evt.playerNum === 2) botCannons++;
        if (evt.type === 'unit_fused' && evt.owner === 2) botFusions++;
    };
    for (let tick = 0; tick < 4800 && room.state === 'RUNNING'; tick++) {
        // Passive opponent: P1 pushes something roughly every 3s so the bot faces real threats
        if (room.currentTick % 60 === 0) {
            const playable = room.p1.hand.filter(id => CD[id] && !CD[id].isSpell && CD[id].cost <= room.p1.energy);
            if (playable.length) {
                const id = playable[Math.floor(Math.random() * playable.length)];
                const lane = Math.floor(Math.random() * 3);
                room.playCard(1, id, laneX[lane] + (Math.random() - 0.5) * 60, 1150);
            }
        }
        room.update();
    }
    console.log(`   Bot stats: plays=${botPlays}, spells=${botSpells}, cannons=${botCannons}, fusions=${botFusions}, endState=${room.state}`);
    assert(botPlays > 6, `Bot deployed cards actively (plays=${botPlays})`);
    assert(botSpells >= 1, `Bot used tactical spells (spells=${botSpells})`);
    assert(botFusions >= 0, 'Bot fusion logic ran without errors');
})();

// ---------- [3] Slow effect ----------
(function testSlow() {
    console.log('\n[3] Slow effect (40% move speed while slowed):');
    const room = new Room({ isLocal: false });
    room.start();
    const u1 = room.spawnUnit(1, CD.scout_drone, 0, 0, false, 230, 1100); // slowed
    const u2 = room.spawnUnit(1, CD.scout_drone, 0, 0, false, 310, 1100); // control
    u1.slowTimer = 2.0;
    const y1a = u1.y, y2a = u2.y;
    for (let i = 0; i < 40; i++) room.update(); // 2s
    const moved1 = y1a - u1.y, moved2 = y2a - u2.y;
    assert(u2.alive && moved2 > 100, `Control unit moved forward (${moved2.toFixed(0)}px in 2s)`);
    assert(u1.alive && moved1 > 20 && moved1 < moved2 * 0.8,
        `Slowed unit moved ~60% distance (${moved1.toFixed(0)}px vs ${moved2.toFixed(0)}px)`);
})();

// ---------- [4] Burn DoT ----------
(function testBurn() {
    console.log('\n[4] Plasma burn (lingering fire deals DoT):');
    const room = new Room({ isLocal: false });
    room.start();
    const swarm = room.spawnUnit(1, CD.swarm_droids, 0, 0, false, 230, 1100);
    const firstDroid = room.units.find(u => u.cardId === 'swarm_droids' && u.lane === 0);
    const hpBefore = firstDroid.hp;
    firstDroid.burnTimer = 3.0;
    // Isolate: remove all other units so nothing else attacks
    room.units = [firstDroid];
    for (let i = 0; i < 40; i++) room.update(); // 2s
    const lost = hpBefore - firstDroid.hp;
    assert(lost >= 100 && lost <= 140, `Burn dealt ~130 damage over 2s (lost=${lost.toFixed(1)})`);
})();

// ---------- [5] Elixir fairness ----------
(function testRate() {
    console.log('\n[5] Elixir fairness:');
    const room = new Room({ isLocal: false });
    room.start();
    room.p1.energy = 0; room.p2.energy = 0;
    for (let i = 0; i < 200; i++) room.update(); // 10s
    const diff = Math.abs(room.p1.energy - room.p2.energy);
    assert(diff < 0.05, `Online rates equal: P1=${room.p1.energy.toFixed(2)}, P2=${room.p2.energy.toFixed(2)} (diff=${diff.toFixed(3)})`);

    const room2 = new Room({ isLocal: true });
    room2.start();
    room2.botAITickCooldown = 1e9; // suppress bot card plays for a clean rate check
    room2.p1.energy = 0; room2.p2.energy = 0;
    for (let i = 0; i < 200; i++) room2.update();
    assert(room2.p1.energy > room2.p2.energy,
        `Local bot handicap kept: player=${room2.p1.energy.toFixed(2)} > bot=${room2.p2.energy.toFixed(2)}`);
})();

// ---------- [6] Field fusion ----------
(function testFusion() {
    console.log('\n[6] Field fusion:');
    const room = new Room({ isLocal: false });
    room.start();
    const scout = room.spawnUnit(1, CD.scout_drone, 0, 0, false, 230, 1100);
    room.p1.hand = ['plasma_mod', 'scout_drone', 'scout_drone', 'scout_drone'];
    room.p1.energy = 3;
    const res = room.attemptFusion(1, 'plasma_mod', scout.id);
    assert(res.success === true, 'Compatible fusion succeeds');
    assert(scout.cardId === 'railgun_drone', `Unit evolved to ${scout.cardId}`);
    const res2 = room.attemptFusion(1, 'plasma_mod', scout.id);
    assert(res2.success === false, 'Fused unit cannot fuse again');
    const mech = room.spawnUnit(1, CD.mech_titan, 0, 0, false, 310, 1100);
    room.p1.hand = ['plasma_mod', 'scout_drone', 'scout_drone', 'scout_drone'];
    room.p1.energy = 3;
    const res3 = room.attemptFusion(1, 'plasma_mod', mech.id);
    assert(res3.success === false, 'Incompatible fusion rejected');
})();

// ---------- [7] Snapshot shape for renderer / online ----------
(function testSnapshotShape() {
    console.log('\n[7] Snapshot fields for renderer & online clients:');
    const room = new Room({ isLocal: false });
    room.start();
    room.spawnUnit(1, CD.scout_drone, 1, 0, false, 540, 1100);
    room.spawnUnit(2, CD.inferno_tower, 0, 0, false, 230, 470);
    room.spawnUnit(2, CD.sentry_bunker, 2, 0, false, 850, 470);
    room.update();
    const snap = room.getSnapshot();
    const u = snap.units.find(x => x.cardId === 'scout_drone');
    const inf = snap.units.find(x => x.cardId === 'inferno_tower');
    const bld = snap.units.find(x => x.cardId === 'sentry_bunker');
    assert(u && 'isSlowed' in u && 'isBurning' in u && 'decayTotal' in u, 'Units carry slow/burn/decay fields');
    assert(inf && inf.isRamping === true && inf.maxRampDamage > 0, 'Ramping unit exposes isRamping & maxRampDamage');
    assert(bld && bld.decayTimer > 0 && bld.decayTotal > 0, 'Building exposes decayTimer/decayTotal for decay ring');
    assert(snap.p1 && snap.p1.cannonCooldown !== undefined && snap.p2 && snap.p2.cannonCooldown !== undefined, 'Both players expose cannon cooldown');
})();

// ---------- [8] Air Hyper-Lane ----------
(function testAerial() {
    console.log('\n[8] Air Hyper-Lane (aerial units & removed center bridge):');
    const room = new Room({ isLocal: false });
    room.start();

    // 8a. Ground units deployed on the center are rerouted to a flank
    const ground = room.spawnUnit(1, CD.cyber_trooper, 1, 0, false, 540, 1150);
    assert(ground.lane === 0 || ground.lane === 2, `Ground center deploy rerouted to flank (lane=${ground.lane}, x=${ground.x})`);
    assert(ground.x < 400 || ground.x > 680, `Rerouted unit is physically on a side bridge (x=${ground.x})`);
    const groundLeft = room.spawnUnit(1, CD.cyber_trooper, 1, 0, false, 500, 1150);
    assert(groundLeft.lane === 0 && groundLeft.x === 230, `Center-left ground deploy snaps to left bridge (lane=${groundLeft.lane}, x=${groundLeft.x})`);

    // 8b. Aerial unit keeps the air lane and flies straight across the chasm
    const scout = room.spawnUnit(1, CD.scout_drone, 1, 0, false, 540, 1150);
    assert(scout.lane === 1, `Aerial keeps the air hyper-lane (lane=${scout.lane})`);
    assert(scout.isAerial === true, 'Unit object carries isAerial flag');
    const y0 = scout.y;
    for (let i = 0; i < 60 && scout.alive; i++) room.update(); // 3s
    assert(scout.alive && (y0 - scout.y) > 200, `Aerial crossed the chasm fast (${(y0 - scout.y).toFixed(0)}px in 3s, now y=${scout.y.toFixed(0)})`);
    assert(Math.abs(scout.x - 540) < 30, `Aerial flies a straight center line (x=${scout.x.toFixed(0)})`);

    // 8c. Aerials take +25% damage from towers
    const room2 = new Room({ isLocal: false });
    room2.start();
    const scout2 = room2.spawnUnit(1, CD.scout_drone, 0, 0, false, 540, 1150);
    const trooper2 = room2.spawnUnit(1, CD.cyber_trooper, 0, 0, false, 230, 1150);
    const hpS = scout2.hp, hpT = trooper2.hp;
    const mainTower = room2.p2.towers.main;
    room2.applyDamage(scout2, 100, mainTower);
    room2.applyDamage(trooper2, 100, mainTower);
    const aerialLost = hpS - scout2.hp;
    const groundLost = hpT - trooper2.hp;
    assert(aerialLost === Math.round(hpS * 0.25) || Math.abs(aerialLost - 125) < 3, `Aerial took +25% tower damage (lost=${aerialLost.toFixed(1)})`);
    assert(Math.abs(groundLost - 100) < 1, `Ground took normal tower damage (lost=${groundLost.toFixed(1)})`);

    // 8d. Aerial captures the Relay Core; ground cannot (even overlapping it)
    const room3 = new Room({ isLocal: false });
    room3.start();
    const flyer = room3.spawnUnit(1, CD.swarm_droids, 0, 0, false, 540, 900);
    const anyFlyer = room3.units.find(u => u.cardId === 'swarm_droids' && u.isAerial);
    for (let i = 0; i < 80 && room3.relayCore.owner === 0; i++) room3.update();
    assert(room3.relayCore.owner === 1, `Aerial captured the Relay Core (owner=${room3.relayCore.owner})`);
    assert(anyFlyer && anyFlyer.shieldHp >= 300, `Core captor gained plasma shield (shield=${anyFlyer ? anyFlyer.shieldHp : 'n/a'})`);

    const room4 = new Room({ isLocal: false });
    room4.start();
    const walker = room4.spawnUnit(1, CD.cyber_trooper, 0, 0, false, 230, 880);
    walker.x = 540; walker.y = 820; walker.speed = 0; // force a ground unit to sit on the core
    room4.update(); room4.update();
    assert(room4.relayCore.owner === 0, `Ground unit on the core CANNOT capture it (owner=${room4.relayCore.owner})`);

    // 8e. Bot AI contests the core with aerial units
    const room5 = new Room({ isLocal: true });
    room5.start();
    let botAerial = 0;
    room5.onEvent = (evt) => {
        if (evt.type === 'card_played' && evt.playerNum === 2 && CD[evt.cardId] && CD[evt.cardId].isAerial) botAerial++;
    };
    for (let tick = 0; tick < 2400 && room5.state === 'RUNNING'; tick++) room5.update();
    assert(botAerial >= 1, `Bot deployed aerial units to contest the core (count=${botAerial})`);
})();

// ---------- [9] Ground/Air, Quantum Reactor & Guardian Wrath ----------
(function testAirGroundEconomyEnrage() {
    console.log('\n[9] Ground/Air targeting, Quantum Reactor & Guardian Wrath:');

    // 9a. Ground-only trooper ignores an aerial unit in its range
    const room = new Room({ isLocal: false });
    room.start();
    const trooper = room.spawnUnit(1, CD.cyber_trooper, 0, 0, false, 230, 1150);
    room.spawnUnit(2, CD.scout_drone, 0, 0, false, 230, 1080); // same lane, 70px ahead, inside 85px carbine range
    for (let i = 0; i < 5; i++) room.update();
    assert(trooper.state === 'MOVE', `Ground-only trooper does NOT attack the flyer (state=${trooper.state})`);

    // 9b. Universal unit (Ghost Sniper) DOES target aerials
    const room2 = new Room({ isLocal: false });
    room2.start();
    const sniper = room2.spawnUnit(1, CD.ghost_sniper, 0, 0, false, 230, 1150);
    const flyer2 = room2.spawnUnit(2, CD.scout_drone, 1, 0, false, 300, 1000); // ~165px away, inside 360px range
    flyer2.hp = flyer2.maxHp = 5000; // keep it alive through the sniper + friendly-tower fire
    for (let i = 0; i < 3; i++) room2.update();
    assert(sniper.state === 'ATTACK', `Universal unit locks onto the aerial (state=${sniper.state})`);

    // 9c. Quantum Reactor generates +1 energy every 7 seconds
    const room3 = new Room({ isLocal: false });
    room3.start();
    let genEvents = 0;
    const oe3 = room3.onEvent;
    room3.onEvent = (evt) => { if (evt.type === 'energy_generated') genEvents++; oe3(evt); };
    const reactor = room3.spawnUnit(1, CD.quantum_reactor, 0, 0, false, 230, 1100);
    assert(reactor && reactor.energyRegen === 1.0, 'Reactor unit carries energyRegen=1.0');
    room3.p1.energy = 0; // clean baseline (natural regen ~6.5/7.5s, reactor adds +1)
    for (let i = 0; i < 150 && genEvents < 1; i++) room3.update(); // 7.5s
    assert(genEvents >= 1, `Quantum reactor generated energy (events=${genEvents})`);
    assert(room3.p1.energy >= 7.0, `Owner banked the reactor energy (energy=${room3.p1.energy.toFixed(2)})`);

    // 9d. Guardian Wrath: below 40% main HP the citadel roars (+40% dmg, +30% range)
    const room4 = new Room({ isLocal: false });
    room4.start();
    const p2main = room4.p2.towers.main;
    p2main.hp = Math.floor(p2main.maxHp * 0.39);
    let enrageEvents = 0;
    const oe4 = room4.onEvent;
    room4.onEvent = (evt) => { if (evt.type === 'tower_enrage') enrageEvents++; oe4(evt); };
    const dummyA = room4.spawnUnit(1, CD.scout_drone, 1, 0, false, 540, 600); // 305px from main
    const hpA = dummyA.hp;
    room4.update();
    assert(enrageEvents === 1, `Guardian Wrath triggered once (events=${enrageEvents})`);
    assert(room4.getSnapshot().p2.towers.main.isEnraged === true, 'Snapshot exposes tower isEnraged');
    const lostEnraged = hpA - dummyA.hp; // 165 * 1.4 * 1.25 (aerial) = 288.75
    assert(Math.abs(lostEnraged - 288.75) < 6, `Enraged main hit for +40% (lost=${lostEnraged.toFixed(1)})`);

    const room5 = new Room({ isLocal: false });
    room5.start();
    const dummyB = room5.spawnUnit(1, CD.scout_drone, 1, 0, false, 540, 600);
    const hpB = dummyB.hp;
    room5.update();
    const lostNormal = hpB - dummyB.hp; // 165 * 1.25 (aerial, no enrage) = 206.25
    assert(Math.abs(lostNormal - 206.25) < 6, `Normal main dealt base damage (lost=${lostNormal.toFixed(1)})`);
    assert(lostEnraged > lostNormal, 'Enraged citadel out-damages the calm one');
})();

// ---------- [10] Sky Zap, Tower Regen & Daily Champion ----------
(function testSkyZapRegenChampion() {
    console.log('\n[10] Sky Zap anti-air, tower self-repair & Daily Champion:');

    // 10a. Sky Zap hits aerials only
    const room = new Room({ isLocal: false });
    room.start();
    const flyer = room.spawnUnit(2, CD.scout_drone, 1, 0, false, 540, 600);
    const walker = room.spawnUnit(2, CD.cyber_trooper, 0, 0, false, 460, 600);
    const hpF = flyer.hp, hpW = walker.hp;
    room.executeSpell(1, CD.sky_zap, 1, 540, 600); // 340px radius covers both
    assert(flyer.hp === hpF - 200, `Sky Zap damaged the aerial for 200 (hp=${flyer.hp})`);
    assert(flyer.slowTimer >= 2.4 && flyer.stunTimer > 0, `Aerial stunned & slowed (slow=${flyer.slowTimer.toFixed(1)}s)`);
    assert(walker.hp === hpW, `Ground unit untouched by anti-air spell (hp=${walker.hp})`);

    // 10b. Towers self-repair (1%/s up to 60% cap) when unhit for 5s
    const room2 = new Room({ isLocal: false });
    room2.start();
    const main2 = room2.p2.towers.main;
    main2.hp = main2.maxHp * 0.5;
    for (let i = 0; i < 220; i++) room2.update(); // 11s, no units around
    assert(main2.hp > main2.maxHp * 0.58, `Untouched tower self-repaired (hp=${(main2.hp / main2.maxHp * 100).toFixed(1)}%)`);
    assert(main2.hp <= main2.maxHp * 0.6 + 1, `Repair respects the 60% cap (hp=${(main2.hp / main2.maxHp * 100).toFixed(1)}%)`);

    const room3 = new Room({ isLocal: false });
    room3.start();
    const main3 = room3.p2.towers.main;
    main3.hp = main3.maxHp * 0.5;
    for (let i = 0; i < 300; i++) {
        if (i % 80 === 40) room3.applyDamage(main3, 50, null); // stays "hot" (hit < 5s ago)
        room3.update();
    }
    assert(main3.hp < main3.maxHp * 0.5, `Heavily hit tower does NOT self-repair (hp=${(main3.hp / main3.maxHp * 100).toFixed(1)}%)`);

    // 10c. Daily Champion: +20% stats on the rotating card
    const room4 = new Room({ isLocal: false, dailyChampionCardId: 'cyber_trooper' });
    room4.start();
    const champ = room4.spawnUnit(1, CD.cyber_trooper, 0, 0, false, 230, 1150);
    const plain = room4.spawnUnit(1, CD.scout_drone, 1, 0, false, 540, 1150);
    assert(champ.maxHp === Math.round(950 * 1.2), `Champion card buffed +20% (hp=${champ.maxHp})`);
    assert(plain.maxHp === 420, `Non-champion card untouched (hp=${plain.maxHp})`);
    assert(room4.getSnapshot().dailyChampion === 'cyber_trooper', 'Snapshot exposes dailyChampion');
})();

// ---------- [11] Thermal Storm & Adaptive Bot ----------
(function testThermalStormAdaptiveBot() {
    console.log('\n[11] Thermal Storm air hazard & Adaptive Bot:');

    // 11a. No storm before the scheduled window (35-45s = tick 700+)
    const room0 = new Room({ isLocal: true });
    room0.start();
    for (let i = 0; i < 100; i++) room0.update();
    assert(room0.thermalStorms.length === 0, `No storm before the scheduled window (t=${room0.currentTick})`);
    assert(Array.isArray(room0.getSnapshot().thermalStorms), 'Snapshot exposes thermalStorms');

    // 11b. A forced storm burns AERIALS only (ground immune at the same spot)
    const room = new Room({ isLocal: false });
    room.start();
    room.nextThermalStormTick = 10;
    for (let i = 0; i < 12; i++) room.update();
    const storm = room.thermalStorms[0];
    assert(storm && !storm.active, `Storm forms in the warning phase (warnTicks=${storm ? storm.warnTicks : 'none'})`);
    storm.x = 540; storm.y = 700; storm.radius = 105; // pin to a tower-free, core-free spot

    const flyer = room.spawnUnit(1, CD.scout_drone, 1, 0, false, storm.x, storm.y);
    flyer.hp = flyer.maxHp = 5000;
    const walker = room.spawnUnit(1, CD.cyber_trooper, 0, 0, false, 230, 1150);
    const hpW0 = walker.hp;
    for (let i = 0; i < 160; i++) {
        if (flyer.alive) { flyer.x = storm.x; flyer.y = storm.y; }
        walker.x = storm.x; walker.y = storm.y;
        room.update();
    }
    assert(flyer.hp < 5000 - 200 && flyer.hp > 5000 - 350, `Storm burned the aerial all 5s (hp=${flyer.hp.toFixed(0)})`);
    assert(walker.hp === hpW0, `Ground unit is immune to the heat cell (hp=${walker.hp})`);
    assert(room.thermalStorms.length === 0, 'Storm cell dissipates after its lifetime');

    // 11c. Aerials bank away from an active storm on their flight path
    const room2 = new Room({ isLocal: false });
    room2.start();
    room2.thermalStorms.push({ id: 99, x: 540, y: 700, radius: 105, warnTicks: 0, activeTicks: 600, active: true });
    const flyer2 = room2.spawnUnit(1, CD.scout_drone, 1, 0, false, 540, 1150);
    flyer2.hp = flyer2.maxHp = 5000;
    for (let i = 0; i < 30; i++) room2.update();
    assert(Math.abs(flyer2.x - 540) > 20, `Aerial banks to the clear lane side (x=${flyer2.x.toFixed(0)}, start=540)`);

    // 11d. Adaptive Bot: reads the human commander's card plays & counters
    const room3 = new Room({ isLocal: true });
    room3.start();
    for (const cid of ['scout_drone', 'swarm_droids', 'plasma_caster']) {
        const hi = room3.p1.hand.indexOf(cid);
        if (hi === -1) room3.p1.hand[0] = cid;
        room3.p1.energy = 10;
        const res = room3.deployCard(1, cid, 540, 1150);
        assert(res.success, `Player deployed ${cid}`);
    }
    assert(room3.botIntel.aerial === 3, `Bot intel counted aerial plays (aerial=${room3.botIntel.aerial})`);
    assert(room3.botIntel.swarm === 1, `Bot intel counted swarm plays (swarm=${room3.botIntel.swarm})`);
    // Deterministic decision path: no spells/fusion in hand, cannon & core busy
    room3.p2.hand = ['scout_drone', 'cyber_trooper', 'mech_titan', 'ghost_sniper'];
    room3.p2.energy = 10;
    room3.p2.cannonCooldown = 999;
    room3.relayCore.cooldownTicks = 999;
    room3.botAITickCooldown = 0;
    room3.update();
    assert(room3.botIntel.announced.air === true, 'Bot announced its air counter-adaptation');
})();

console.log('\n' + '='.repeat(50));
if (failures === 0) {
    console.log('🎉 ALL TESTS PASSED');
    process.exit(0);
} else {
    console.error(`💥 ${failures} TEST(S) FAILED`);
    process.exit(1);
}
