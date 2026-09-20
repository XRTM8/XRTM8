/**
 * CyberClash - Multiplayer WebSocket Integration Test
 * Run: node test_ws.js
 *
 * Spawns a temporary server, connects TWO real WS clients,
 * and verifies:
 *  - matchmaking (queue -> match_start for both)
 *  - snapshot flow (20Hz, correct perspective for P2: self at bottom)
 *  - card play actions routed through the server
 *  - match_finished with CORRECT per-client winner perspective
 *  - room cleanup after the match (no leaks)
 */
const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const Room = require('./game_room.js');
const COST = {};
for (const k in Room.CARD_DATABASE) COST[k] = Room.CARD_DATABASE[k].cost;

const PORT = 3111;
let failures = 0;
function assert(cond, msg) {
    if (cond) console.log('   ✅ ' + msg);
    else { failures++; console.error('   ❌ ' + msg); }
}

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        http.get(url, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

function waitForHealth(retries = 60) {
    return new Promise((resolve, reject) => {
        const tryOnce = (left) => {
            fetchJSON(`http://127.0.0.1:${PORT}/health`)
                .then(() => resolve())
                .catch(() => {
                    if (left > 0) setTimeout(() => tryOnce(left - 1), 400);
                    else reject(new Error('server health check failed'));
                });
        };
        tryOnce(retries);
    });
}

const DECK = {
    p1: ['scout_drone', 'cyber_trooper', 'mech_titan', 'plasma_caster', 'swarm_droids', 'plasma_mod', 'nano_repair', 'emp_overcharge'],
    p2: ['scout_drone', 'cyber_trooper', 'mech_titan', 'ghost_sniper', 'sentry_bunker', 'plasma_mod', 'nano_repair', 'orbital_salvo']
};

function makeClient(name) {
    const client = {
        name,
        ws: new WebSocket(`ws://127.0.0.1:${PORT}/ws`),
        snapshots: 0,
        matchStart: null,
        finished: null,
        lastSnapshot: null,
        lastPlay: 0,
        actionsSent: 0
    };
    client.ws.on('open', () => {
        client.ws.send(JSON.stringify({
            type: 'queue_match',
            playerId: 'test_' + name,
            playerName: 'Test' + name.toUpperCase(),
            trophies: 2000,
            deck: DECK[name],
            level: 2,
            cardLevels: { scout_drone: 2 },
            isTripleElixir: false
        }));
    });
    client.ws.on('message', raw => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'match_start') client.matchStart = msg;
        else if (msg.type === 'game_snapshot') {
            client.snapshots++;
            client.lastSnapshot = msg.snapshot;
            maybePlay(client);
        } else if (msg.type === 'match_finished') {
            client.finished = msg;
        }
    });
    return client;
}

function sendCard(client, id, x, y) {
    client.lastPlay = Date.now();
    client.actionsSent++;
    client.ws.send(JSON.stringify({ type: 'match_action_card', cardId: id, x: Math.round(x), y: Math.round(y) }));
}

// Both clients focus-fire the enemy main tower (always at 540,295 in their own perspective)
function maybePlay(client) {
    const s = client.lastSnapshot;
    if (!s || !s.p1 || !Array.isArray(s.p1.hand)) return;
    if (Date.now() - client.lastPlay < 1500) return;
    const hand = s.p1.hand;
    const e = s.p1.energy;
    if (hand.includes('orbital_salvo') && e >= 4) return sendCard(client, 'orbital_salvo', 540, 295);
    if (hand.includes('mech_titan') && e >= 5) return sendCard(client, 'mech_titan', 540, 400);
    if (hand.includes('ghost_sniper') && e >= 4) return sendCard(client, 'ghost_sniper', 540, 400);
    if (hand.includes('plasma_caster') && e >= 4) return sendCard(client, 'plasma_caster', 540, 420);
    const cheap = hand.find(id => COST[id] !== undefined && COST[id] <= e);
    if (cheap) sendCard(client, cheap, 540, 1100);
}

(async () => {
    console.log('Starting temporary server on port ' + PORT + '...');
    const server = spawn('node', ['server.js'], {
        env: { ...process.env, PORT: String(PORT) },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    server.stderr.on('data', d => {
        const s = d.toString();
        if (s.includes('Error') || s.includes('error')) process.stderr.write('[server] ' + s);
    });

    try {
        await waitForHealth();
        console.log('Server healthy. Connecting two players...');

        const p1 = makeClient('p1');
        const p2 = makeClient('p2');

        // Wait for both matches to be established
        const t0 = Date.now();
        while ((!p1.matchStart || !p2.matchStart) && Date.now() - t0 < 15000) {
            await new Promise(r => setTimeout(r, 100));
        }

        assert(!!p1.matchStart, 'P1 received match_start');
        assert(!!p2.matchStart, 'P2 received match_start');
        if (p1.matchStart && p2.matchStart) {
            assert(p1.matchStart.role === 1 && p2.matchStart.role === 2, 'Roles assigned (P1=1, P2=2)');
            assert(p1.matchStart.opponentName === 'TestP2' && p2.matchStart.opponentName === 'TestP1', 'Opponent names exchanged');
        }

        // Wait for the match to finish (focus fire should end it well before overtime)
        const matchStartWall = Date.now();
        while ((!p1.finished || !p2.finished) && Date.now() - matchStartWall < 200000) {
            await new Promise(r => setTimeout(r, 250));
        }

        assert(p1.snapshots > 50 && p2.snapshots > 50,
            `Snapshots streamed (P1=${p1.snapshots}, P2=${p2.snapshots})`);
        assert(p1.actionsSent > 5 && p2.actionsSent > 5,
            `Both players sent card actions (P1=${p1.actionsSent}, P2=${p2.actionsSent})`);

        // Perspective check: in P2's view, P2's own main tower sits at the BOTTOM (y=1280)
        const p2s = p2.lastSnapshot;
        if (p2s) {
            assert(p2s.p1.towers.main.y === 1315, 'P2 perspective: own main tower at bottom (flipped)');
            assert(p2s.p2.towers.main.y === 295, 'P2 perspective: enemy main tower at top');
            assert(p2s.p1.hand && p2s.p1.hand.length === 4, 'P2 perspective: own hand visible (4 cards)');
        }
        const p1s = p1.lastSnapshot;
        if (p1s) {
            assert(p1s.p1.towers.main.y === 1315, 'P1 perspective: own main tower at bottom');
        }

        assert(!!p1.finished, 'P1 received match_finished');
        assert(!!p2.finished, 'P2 received match_finished');

        if (p1.finished && p2.finished) {
            const w1 = p1.finished.winner;
            const w2 = p2.finished.winner;
            const consistent = (w1 === w2 && w1 === 'TIE') || (w1 === 1 && w2 === 2) || (w1 === 2 && w2 === 1);
            assert(consistent, `Winner perspective consistent across clients (P1-view=${w1}, P2-view=${w2})`);
            // The winner's own view must say 1 (I won)
            if (w1 !== 'TIE') {
                const winnerView = w1 === 1 ? w1 : w2;
                const loserView = w1 === 1 ? w2 : w1;
                assert(winnerView === 1 && loserView === 2, 'Winner sees "1", loser sees "2" in their own view');
            }
        }

        // Server cleanup: room removed after finish
        const health = await fetchJSON(`http://127.0.0.1:${PORT}/health`);
        assert(health.activeMatches === 0, `Room cleaned up after match (activeMatches=${health.activeMatches})`);
        assert(health.status === 'healthy', 'Server still healthy after match');
    } finally {
        server.kill('SIGTERM');
    }

    console.log('\n' + '='.repeat(50));
    if (failures === 0) {
        console.log('🎉 MULTIPLAYER TEST PASSED');
        process.exit(0);
    } else {
        console.error(`💥 ${failures} MULTIPLAYER TEST(S) FAILED`);
        process.exit(1);
    }
})().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
