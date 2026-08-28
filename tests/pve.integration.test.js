'use strict';

const assert = require('node:assert/strict');
const { io } = require('socket.io-client');

const serverUrl = process.env.TEST_SERVER_URL || 'http://127.0.0.1:3000';
const runId = Date.now().toString(36).slice(-6);

function once(socket, event, timeoutMs = 7000) {
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

function waitFor(socket, event, predicate, timeoutMs = 8000) {
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

async function joinPve(socket, username, chassis) {
    const roomPromise = once(socket, 'current_room_state');
    socket.emit('join_game_mode', {
        mode: 'online_pve',
        username,
        chassis,
        weapon: 'blaster',
        skin: 'default',
        deviceToken: `test-pve-${username}`
    });
    return roomPromise;
}

async function run() {
    const medic = await connectClient();
    const ally = await connectClient();

    try {
        await joinPve(medic, `Medic_${runId}`, 'support');
        await joinPve(ally, `Ally_${runId}`, 'assault');

        const sharedState = {
            x: 4000,
            y: 4000,
            vx: 0,
            vy: 0,
            facingAngle: 0,
            health: 100,
            maxHealth: 100,
            shield: 2
        };
        medic.emit('player_update', sharedState);
        ally.emit('player_update', sharedState);
        await waitFor(medic, 'room_tick_sync', players => Array.isArray(players)
            && players.some(player => player.id === medic.id && player.x === 4000)
            && players.some(player => player.id === ally.id && player.x === 4000));

        const downedPromise = waitFor(medic, 'pve_downed_alert', event => event.downedId === ally.id);
        ally.emit('pve_player_downed', { x: 4000, y: 4000 });
        const downed = await downedPromise;
        assert.equal(downed.reviveDurationMs, 5000);

        const rejectedPromise = once(medic, 'pve_revive_rejected');
        medic.emit('pve_revive_ally', { targetId: ally.id });
        const rejected = await rejectedPromise;
        assert.equal(rejected.reason, 'duration');
        assert.ok(rejected.remainingMs > 0);

        await new Promise(resolve => setTimeout(resolve, 5000));
        const revivedPromise = waitFor(medic, 'pve_revive_success', event => event.revivedId === ally.id);
        medic.emit('pve_revive_ally', { targetId: ally.id });
        const revived = await revivedPromise;
        assert.equal(revived.isDowned, false);
        assert.equal(revived.hp, 90);
        assert.equal(revived.shield, 2);

        const allyDownAgain = waitFor(medic, 'pve_downed_alert', event => event.downedId === ally.id);
        ally.emit('pve_player_downed', { x: 4000, y: 4000 });
        await allyDownAgain;
        const medicDown = waitFor(ally, 'pve_downed_alert', event => event.downedId === medic.id);
        medic.emit('pve_player_downed', { x: 4000, y: 4000 });
        await medicDown;

        const wipedSnapshot = await waitFor(ally, 'room_tick_sync', players => Array.isArray(players)
            && players.filter(player => player.id === medic.id || player.id === ally.id).every(player => player.isDowned));
        assert.equal(wipedSnapshot.filter(player => player.isDowned).length >= 2, true);

        console.log('PVE downed, five-second revive, and squad-wipe state test passed');
    } finally {
        medic.emit('leave_game_mode');
        ally.emit('leave_game_mode');
        medic.disconnect();
        ally.disconnect();
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
