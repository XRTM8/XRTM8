'use strict';

const assert = require('node:assert/strict');
const state = require('../js/game-state.js');
const multiplayer = require('../js/multiplayer.js');

const shieldHit = state.applyPvpHit({ hp: 100, maxHp: 100, shieldCharges: 1 }, { damage: 40 });
assert.equal(shieldHit.shieldCharges, 0);
assert.equal(shieldHit.hp, 100);
assert.equal(shieldHit.fatal, false);

const bodyHit = state.applyPvpHit({ hp: 30, maxHp: 100, shieldCharges: 0 }, { damage: 40 });
assert.equal(bodyHit.hp, 0);
assert.equal(bodyHit.fatal, true);

assert.equal(state.shouldShowGameOver({ mode: 'online_pvp', hp: 0, awaitingRespawn: true }), false);
assert.equal(state.shouldShowGameOver({ mode: 'offline', hp: 0 }), true);
assert.equal(state.shouldShowGameOver({ mode: 'online_pve', hp: 0, hasAliveTeammates: true }), false);
assert.equal(state.shouldShowGameOver({ mode: 'online_pve', hp: 0, hasAliveTeammates: false }), true);
assert.equal(state.PVE_REVIVE_DURATION_MS, 5000);

const remote = multiplayer.normalizePlayer({ id: 'p2', username: 'Pilot', x: 12, y: 34, skin: 'skin_gold' });
assert.equal(remote.username, 'Pilot');
assert.equal(remote.targetX, 12);
assert.equal(remote.skin, 'skin_gold');

const update = multiplayer.createPlayerUpdate({ x: 10.4, y: 20.6, vx: 1, vy: 2, hp: 75, maxHp: 100, shieldCharges: 2, shieldMaxCharges: 3, chassis: 'assault', weapon: 'railgun' }, { skin: 'skin_gold', score: 50 });
assert.equal(update.health, 75);
assert.equal(update.shield, 2);
assert.equal(update.skin, 'skin_gold');

console.log('game-state tests passed');
