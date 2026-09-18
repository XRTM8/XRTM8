/**
 * CyberClash Online - Master Production Backend Server
 * Real-Time WebSockets Multiplayer + REST Cloud Saves + Render.com Ready
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer, WebSocket } = require('ws');

// Import deterministic game room engine
const TacticalGameRoom = require('./game_room.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

// File-backed persistence for cloud saves
const SAVES_FILE = path.join(__dirname, 'cloud_saves.json');
let cloudSaves = {};

try {
    if (fs.existsSync(SAVES_FILE)) {
        cloudSaves = JSON.parse(fs.readFileSync(SAVES_FILE, 'utf8'));
    }
} catch (err) {
    console.warn('Could not read cloud_saves.json, starting with fresh in-memory storage:', err.message);
    cloudSaves = {};
}

function persistSaves() {
    try {
        fs.writeFile(SAVES_FILE, JSON.stringify(cloudSaves, null, 2), () => {});
    } catch (_) {}
}

// --- REST API ROUTES ---

// Health check for Render.com
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        activeMatches: activeRooms.size,
        queuedPlayers: matchmakingQueue.length,
        totalSavedProfiles: Object.keys(cloudSaves).length
    });
});

// Cloud Save endpoint (Google Play / Commander profile sync)
app.post('/api/profile/save', (req, res) => {
    const { playerId, profileData } = req.body;
    if (!playerId || !profileData) {
        return res.status(400).json({ success: false, error: 'Missing playerId or profileData' });
    }

    cloudSaves[playerId] = {
        ...profileData,
        lastSavedAt: new Date().toISOString()
    };
    persistSaves();

    res.json({ success: true, savedAt: cloudSaves[playerId].lastSavedAt });
});

// Cloud Load endpoint
app.get('/api/profile/load/:playerId', (req, res) => {
    const { playerId } = req.params;
    const profile = cloudSaves[playerId];
    if (!profile) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, profile });
});

// Global Live Leaderboard endpoint
app.get('/api/leaderboard', (req, res) => {
    // Default top bot commanders + real saved players
    let commanders = [
        { rank: 1, name: 'CYBER-LORD_99', trophies: 3450, tag: '#TOP1', isOnline: true },
        { rank: 2, name: 'VORTEX_TITAN', trophies: 3210, tag: '#VORT', isOnline: true },
        { rank: 3, name: 'NEO_PHANTOM', trophies: 3080, tag: '#NEOX', isOnline: true },
        { rank: 4, name: 'IRON_COLOSSUS', trophies: 2990, tag: '#IRON', isOnline: false },
        { rank: 5, name: 'QUANTUM_RAY', trophies: 2910, tag: '#QRAY', isOnline: true }
    ];

    // Merge saved profiles into leaderboard
    for (const pId in cloudSaves) {
        const p = cloudSaves[pId];
        if (p.playerName && p.trophies) {
            commanders.push({
                rank: 0,
                name: p.playerName,
                trophies: parseInt(p.trophies, 10) || 0,
                tag: '#' + pId.slice(-4).toUpperCase(),
                isOnline: true,
                isGooglePlayLinked: !!p.isGooglePlayLinked
            });
        }
    }

    // Sort descending by trophies
    commanders.sort((a, b) => b.trophies - a.trophies);
    commanders = commanders.slice(0, 15).map((c, idx) => ({ ...c, rank: idx + 1 }));

    res.json({ success: true, leaderboard: commanders });
});

// Serve game index
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// --- REAL-TIME WEBSOCKET MULTIPLAYER & MATCHMAKING ENGINE ---

const matchmakingQueue = []; // [{ ws, playerId, playerName, trophies, deck, joinedAt }]
const activeRooms = new Map(); // roomId -> { room, p1Ws, p2Ws, loopInterval }

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.currentRoomId = null;

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (raw) => {
        try {
            const data = JSON.parse(raw.toString());
            handleClientMessage(ws, data);
        } catch (err) {
            console.error('WS parse error:', err);
        }
    });

    ws.on('close', () => {
        handleClientDisconnect(ws);
    });

    ws.on('error', () => {
        handleClientDisconnect(ws);
    });

    // Send welcome greeting
    ws.send(JSON.stringify({
        type: 'connected',
        serverTime: Date.now(),
        onlinePlayers: wss.clients.size
    }));
});

function handleClientMessage(ws, data) {
    switch (data.type) {
        case 'queue_match': {
            // Remove existing entry if re-queueing
            removeFromQueue(ws);

            const entry = {
                ws,
                playerId: data.playerId || 'guest_' + Math.floor(Math.random() * 10000),
                playerName: data.playerName || 'COMMANDER',
                trophies: data.trophies || 2840,
                level: Math.min(10, Math.max(1, parseInt(data.level, 10) || 1)),
                cardLevels: (typeof data.cardLevels === 'object' && data.cardLevels) ? data.cardLevels : {},
                isTripleElixir: Boolean(data.isTripleElixir),
                wagerTier: data.wagerTier || 'training',
                deck: Array.isArray(data.deck) && data.deck.length === 8 ? data.deck : null,
                joinedAt: Date.now()
            };

            // Check if there is another player waiting in the queue
            if (matchmakingQueue.length > 0) {
                const opponent = matchmakingQueue.shift();
                createMultiplayerMatch(opponent, entry);
            } else {
                matchmakingQueue.push(entry);
                ws.send(JSON.stringify({
                    type: 'queued',
                    message: 'البحث عن خصم متصل في الساحة...',
                    queuePosition: matchmakingQueue.length
                }));

                // Fallback timer: if no opponent found in 12 seconds, allow client to fight bot
                setTimeout(() => {
                    const idx = matchmakingQueue.indexOf(entry);
                    if (idx !== -1) {
                        matchmakingQueue.splice(idx, 1);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'queue_timeout_bot_fallback',
                                message: 'لم يتم العثور على خصم فوري، بدء القتال ضد الذكاء الاصطناعي!'
                            }));
                        }
                    }
                }, 12000);
            }
            break;
        }

        case 'cancel_queue': {
            removeFromQueue(ws);
            ws.send(JSON.stringify({ type: 'queue_cancelled' }));
            break;
        }

        case 'match_action_card': {
            if (!ws.currentRoomId) return;
            const match = activeRooms.get(ws.currentRoomId);
            if (!match || !match.room) return;

            const playerNum = (ws === match.p1Ws) ? 1 : 2;
            let targetX = data.x;
            let targetY = data.y;

            // If player 2 (Red - top base), invert Y coordinates so both see their own side at bottom
            if (playerNum === 2) {
                targetX = 1080 - targetX;
                targetY = 1920 - targetY;
            }

            match.room.playCard(playerNum, data.cardId, targetX, targetY);
            break;
        }

        case 'match_action_cannon': {
            if (!ws.currentRoomId) return;
            const match = activeRooms.get(ws.currentRoomId);
            if (!match || !match.room) return;

            const playerNum = (ws === match.p1Ws) ? 1 : 2;
            let laneIndex = data.laneIndex;
            if (playerNum === 2) {
                // Invert lane 0 and 2 for opposite perspective
                if (laneIndex === 0) laneIndex = 2;
                else if (laneIndex === 2) laneIndex = 0;
            }

            match.room.triggerCommandCannon(playerNum, laneIndex);
            break;
        }
    }
}

function removeFromQueue(ws) {
    const idx = matchmakingQueue.findIndex(e => e.ws === ws);
    if (idx !== -1) matchmakingQueue.splice(idx, 1);
}

function createMultiplayerMatch(player1, player2) {
    const roomId = 'room_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const room = new TacticalGameRoom({
        roomId,
        isLocal: false,
        p1Deck: player1.deck,
        p2Deck: player2.deck,
        p1Level: player1.level || 1,
        p2Level: player2.level || 1,
        p1CardLevels: player1.cardLevels || {},
        p2CardLevels: player2.cardLevels || {},
        isTripleElixir: player1.isTripleElixir || player2.isTripleElixir,
        onEvent: (evt) => {
            broadcastToRoom(roomId, { type: 'battle_event', event: evt });
        }
    });

    player1.ws.currentRoomId = roomId;
    player2.ws.currentRoomId = roomId;

    // Start 20 Ticks/sec Server Loop
    room.start();
    const loopInterval = setInterval(() => {
        try {
            room.update();
            const snapshot = room.getSnapshot();

            // Broadcast snapshots customized per player perspective
            if (player1.ws.readyState === WebSocket.OPEN) {
                player1.ws.send(JSON.stringify({ type: 'game_snapshot', role: 1, snapshot }));
            }
            if (player2.ws.readyState === WebSocket.OPEN) {
                // Player 2 gets snapshot with inverted perspective coordinates
                const p2Snapshot = createP2Snapshot(snapshot);
                player2.ws.send(JSON.stringify({ type: 'game_snapshot', role: 2, snapshot: p2Snapshot }));
            }

            if (snapshot.state === 'OVER') {
                clearInterval(loopInterval);
                broadcastToRoom(roomId, {
                    type: 'match_finished',
                    winner: snapshot.winner,
                    snapshot
                });
                activeRooms.delete(roomId);
            }
        } catch (err) {
            console.error('Room loop error:', err);
        }
    }, 50);

    activeRooms.set(roomId, {
        room,
        p1Ws: player1.ws,
        p2Ws: player2.ws,
        loopInterval
    });

    // Notify both players of match found
    const activeWager = player1.wagerTier || player2.wagerTier || 'training';
    if (player1.ws.readyState === WebSocket.OPEN) {
        player1.ws.send(JSON.stringify({
            type: 'match_start',
            roomId,
            role: 1,
            wagerTier: activeWager,
            opponentName: player2.playerName,
            opponentTrophies: player2.trophies,
            opponent: { name: player2.playerName, trophies: player2.trophies }
        }));
    }

    if (player2.ws.readyState === WebSocket.OPEN) {
        player2.ws.send(JSON.stringify({
            type: 'match_start',
            roomId,
            role: 2,
            wagerTier: activeWager,
            opponentName: player1.playerName,
            opponentTrophies: player1.trophies,
            opponent: { name: player1.playerName, trophies: player1.trophies }
        }));
    }
}

function createP2Snapshot(s) {
    // Invert Y-coordinates and towers so P2 plays from the bottom looking up
    const inverted = JSON.parse(JSON.stringify(s));

    inverted.units = (inverted.units || []).map(u => ({
        ...u,
        x: 1080 - u.x,
        y: 1920 - u.y,
        lane: u.lane === 0 ? 2 : (u.lane === 2 ? 0 : 1),
        owner: u.owner === 1 ? 2 : 1 // Swap owner perspective
    }));

    inverted.projectiles = (inverted.projectiles || []).map(p => ({
        ...p,
        x: 1080 - p.x,
        y: 1920 - p.y
    }));

    // Invert Relay Core perspective
    if (inverted.relayCore) {
        inverted.relayCore.owner = inverted.relayCore.owner === 1 ? 2 : (inverted.relayCore.owner === 2 ? 1 : 0);
    }

    // Build P2's friendly towers (which were P2 towers at top y: 450/330, mirrored to bottom y: 1160/1280)
    const p2FriendlyTowers = {
        left: {
            x: 230,
            y: 1160,
            hp: s.p2.towers.right.hp,
            maxHp: s.p2.towers.right.maxHp,
            alive: s.p2.towers.right.alive,
            isFrozen: s.p2.towers.right.isFrozen
        },
        main: {
            x: 540,
            y: 1280,
            hp: s.p2.towers.main.hp,
            maxHp: s.p2.towers.main.maxHp,
            alive: s.p2.towers.main.alive,
            isFrozen: s.p2.towers.main.isFrozen
        },
        right: {
            x: 850,
            y: 1160,
            hp: s.p2.towers.left.hp,
            maxHp: s.p2.towers.left.maxHp,
            alive: s.p2.towers.left.alive,
            isFrozen: s.p2.towers.left.isFrozen
        }
    };

    // Build P2's enemy towers (which were P1 towers at bottom y: 1160/1280, mirrored to top y: 450/330)
    const p2EnemyTowers = {
        left: {
            x: 230,
            y: 450,
            hp: s.p1.towers.right.hp,
            maxHp: s.p1.towers.right.maxHp,
            alive: s.p1.towers.right.alive,
            isFrozen: s.p1.towers.right.isFrozen
        },
        main: {
            x: 540,
            y: 330,
            hp: s.p1.towers.main.hp,
            maxHp: s.p1.towers.main.maxHp,
            alive: s.p1.towers.main.alive,
            isFrozen: s.p1.towers.main.isFrozen
        },
        right: {
            x: 850,
            y: 450,
            hp: s.p1.towers.left.hp,
            maxHp: s.p1.towers.left.maxHp,
            alive: s.p1.towers.left.alive,
            isFrozen: s.p1.towers.left.isFrozen
        }
    };

    // Set P1 (friendly perspective for P2 client)
    inverted.p1 = {
        energy: s.p2.energy,
        maxEnergy: s.p2.maxEnergy,
        energyDebt: s.p2.energyDebt || 0,
        isRedline: !!s.p2.isRedline,
        hand: s.p2.hand ? [...s.p2.hand] : (s.p1.hand ? [...s.p1.hand] : []),
        nextCard: s.p2.nextCard || null,
        cannonCooldown: s.p2.cannonCooldown || 0,
        towers: p2FriendlyTowers
    };

    // Set P2 (enemy perspective for P2 client)
    inverted.p2 = {
        energy: s.p1.energy,
        maxEnergy: s.p1.maxEnergy,
        isRedline: !!s.p1.isRedline,
        cannonCooldown: s.p1.cannonCooldown || 0,
        towers: p2EnemyTowers
    };

    return inverted;
}

function broadcastToRoom(roomId, messageObj) {
    const match = activeRooms.get(roomId);
    if (!match) return;
    const msg = JSON.stringify(messageObj);
    if (match.p1Ws && match.p1Ws.readyState === WebSocket.OPEN) match.p1Ws.send(msg);
    if (match.p2Ws && match.p2Ws.readyState === WebSocket.OPEN) match.p2Ws.send(msg);
}

function handleClientDisconnect(ws) {
    removeFromQueue(ws);
    if (ws.currentRoomId) {
        const match = activeRooms.get(ws.currentRoomId);
        if (match) {
            clearInterval(match.loopInterval);
            const otherWs = (ws === match.p1Ws) ? match.p2Ws : match.p1Ws;
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
                otherWs.send(JSON.stringify({
                    type: 'opponent_disconnected',
                    message: 'انسحب الخصم من المعركة! فوز مؤزر للقائد.'
                }));
            }
            activeRooms.delete(ws.currentRoomId);
        }
    }
}

// Heartbeat interval to maintain active connections on Render free tier
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Start Server
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` CyberClash Online Server Active!`);
    console.log(` Local HTTP Server: http://localhost:${PORT}`);
    console.log(` WebSocket Service: ws://localhost:${PORT}/ws`);
    console.log(` Deployment Ready:  Render.com (Port ${PORT})`);
    console.log(`====================================================`);
});
