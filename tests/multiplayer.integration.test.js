'use strict';

const assert = require('node:assert/strict');
const { io } = require('socket.io-client');

const serverUrl = process.env.TEST_SERVER_URL || 'http://127.0.0.1:3000';
const runId = Date.now().toString(36).slice(-6);

function once(socket, event, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, onEvent);
            reject(new Error(`Timed out waiting for ${event}`));
        }, timeoutMs);
        function onEvent(data) {
            clearTimeout(timer);
            resolve(data);
        }
        socket.once(event, onEvent);
    });
}

function waitFor(socket, event, predicate, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, onEvent);
            reject(new Error(`Timed out waiting for matching ${event}`));
        }, timeoutMs);
        function onEvent(data) {
            if (!predicate(data)) return;
            clearTimeout(timer);
            socket.off(event, onEvent);
            resolve(data);
        }
        socket.on(event, onEvent);
    });
}

async function connectClient() {
    const socket = io(serverUrl, { transports: ['websocket'], forceNew: true, timeout: 4000 });
    await once(socket, 'connect', 5000);
    return socket;
}

async function run() {
    const alpha = await connectClient();
    const beta = await connectClient();

    try {
        const alphaName = `Alpha_${runId}`;
        const betaName = `Beta_${runId}`;
        const alphaRoom = once(alpha, 'current_room_state');
        alpha.emit('join_game_mode', {
            mode: 'online_pvp',
            username: alphaName,
            chassis: 'assault',
            weapon: 'railgun',
            skin: 'skin_golden_striker',
            deviceToken: `test-alpha-${runId}`
        });
        await alphaRoom;

        const betaRoom = once(beta, 'current_room_state');
        beta.emit('join_game_mode', {
            mode: 'online_pvp',
            username: betaName,
            chassis: 'sniper',
            weapon: 'blaster',
            skin: 'skin_quantum_void',
            deviceToken: `test-beta-${runId}`
        });
        await betaRoom;

        const snapshot = await waitFor(alpha, 'room_tick_sync', players => {
            return Array.isArray(players) && players.some(player => player.id === beta.id);
        });
        const remoteBeta = snapshot.find(player => player.id === beta.id);
        assert.equal(remoteBeta.username, betaName);
        assert.equal(remoteBeta.skin, 'skin_quantum_void');
        assert.equal(remoteBeta.chassis, 'sniper');

        const remoteShotPromise = once(beta, 'remote_shoot');
        alpha.emit('player_shoot', {
            x: 4000,
            y: 4000,
            angle: 0.25,
            speed: 26,
            damage: 18,
            color: '#ffd166',
            weaponType: 'railgun'
        });
        const remoteShot = await remoteShotPromise;
        assert.equal(remoteShot.shooterId, alpha.id);
        assert.equal(remoteShot.weaponType, 'railgun');
        assert.equal(remoteShot.color, '#ffd166');

        const damagePromise = once(beta, 'pvp_take_damage');
        alpha.emit('pvp_damage_dealt', {
            targetId: beta.id,
            damage: 24,
            weaponType: 'railgun',
            x: remoteBeta.x,
            y: remoteBeta.y
        });
        const damage = await damagePromise;
        assert.equal(damage.attackerId, alpha.id);
        assert.equal(damage.attackerName, alphaName);
        assert.equal(damage.damage, 24);

        const eliminatedPromise = waitFor(alpha, 'player_eliminated', event => event.id === beta.id);
        beta.emit('pvp_player_eliminated', { killerId: alpha.id, weapon: 'railgun' });
        const eliminated = await eliminatedPromise;
        assert.equal(eliminated.killerName, alphaName);

        await new Promise(resolve => setTimeout(resolve, 2600));
        const respawnPromise = waitFor(beta, 'player_respawned', event => event.id === beta.id);
        beta.emit('player_respawn');
        const respawn = await respawnPromise;
        assert.equal(respawn.isDead, false);
        assert.equal(respawn.hp, 75);
        assert.equal(respawn.shield, 1);
        assert.equal(respawn.skin, 'skin_quantum_void');

        const arenaEliminationPromise = waitFor(alpha, 'player_eliminated', event => event.id === beta.id);
        beta.emit('pvp_player_eliminated', { weapon: 'arena_hazard' });
        const arenaElimination = await arenaEliminationPromise;
        assert.equal(arenaElimination.killerId, null);
        assert.equal(arenaElimination.killerName, 'الساحة');

        console.log('multiplayer integration test passed');
    } finally {
        alpha.emit('leave_game_mode');
        beta.emit('leave_game_mode');
        alpha.disconnect();
        beta.disconnect();
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
