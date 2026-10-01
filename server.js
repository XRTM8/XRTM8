/**
 * XRTM8 Production Cloud Server (Render / Cloud VPS)
 * Features:
 * 1. 24/7 HTTP Health Check (/healthz, /api/health) for Uptime / Pingers
 * 2. Full-featured WebSocket Master Server for BFD (Battlefield Dominance) on /bfd & /ws
 * 3. Matchmaking, Squads, Real-time Lobby Presence, Friend Invites & Game Relay
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = '0.0.0.0';
const ROOT = path.resolve(__dirname);

// =============================================================================
// 1. HTTP Server & Health-Check Endpoints (Keeps Server Awake 24/7)
// =============================================================================

function sendJson(res, statusCode, data) {
    const payload = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(payload);
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    let pathname = decodeURIComponent(parsedUrl.pathname || '/');

    // Health check endpoint for Render & 24/7 pingers (UptimeRobot, etc.)
    if (pathname === '/healthz' || pathname === '/api/health') {
        return sendJson(res, 200, {
            status: 'healthy',
            service: 'XRTM8 Cloud Master & Matchmaking Relay',
            uptime: process.uptime(),
            online_bfd_players: bfdClients.size,
            active_squads: bfdSquads.size
        });
    }

    // BFD status check API
    if (pathname === '/api/bfd/status') {
        return sendJson(res, 200, {
            status: 'online',
            service: 'BFD Tactical Master Server',
            online_players: bfdClients.size,
            active_squads: bfdSquads.size
        });
    }

    // Fallback: Default HTML response for root or browser visits
    const indexPath = path.join(ROOT, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(indexPath).pipe(res);
    } else {
        return sendJson(res, 200, {
            status: 'online',
            service: 'BFD Tactical Master & Matchmaking Relay',
            message: 'Server is running and listening for BFD game clients on /bfd',
            uptime: process.uptime(),
            online_players: bfdClients.size
        });
    }
});

// =============================================================================
// 2. BFD (Battlefield Dominance) - Master & Matchmaking Relay Engine
// =============================================================================

let wsLib = null;
try {
    wsLib = require('ws');
} catch (e) {
    console.error('[BFD MasterServer] Critical: "ws" package not found. Run npm install.');
}

const bfdClients = new Map(); // id -> { id, ws, ip, name, status, squad_id, ready, class }
const bfdSquads = new Map();  // squad_id -> { id, leader_id, members: [] }
let bfdNextClientId = 100;
let bfdNextSquadNum = 1001;
let bfdNextMatchNum = 501;

function bfdBroadcastPresence() {
    const players = Array.from(bfdClients.values()).map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        squad_id: c.squad_id,
        class: c.class
    }));
    const msg = JSON.stringify({
        action: 'presence_update',
        online_count: players.length,
        players: players
    });
    for (const c of bfdClients.values()) {
        try {
            if (c.ws && c.ws.readyState === 1) c.ws.send(msg);
        } catch (err) {}
    }
}

function bfdSendTo(clientId, data) {
    const c = bfdClients.get(clientId);
    if (c && c.ws && c.ws.readyState === 1) {
        try {
            c.ws.send(JSON.stringify(data));
        } catch (err) {}
    }
}

function bfdSyncSquad(squadId) {
    const sq = bfdSquads.get(squadId);
    if (!sq) return;
    const membersData = sq.members
        .filter(mid => bfdClients.has(mid))
        .map(mid => {
            const c = bfdClients.get(mid);
            return {
                id: c.id,
                name: c.name,
                ready: c.ready,
                class: c.class
            };
        });
    const msg = {
        action: 'squad_sync',
        squad_id: squadId,
        leader_id: sq.leader_id,
        members: membersData
    };
    for (const mid of sq.members) {
        bfdSendTo(mid, msg);
    }
}

function bfdProcessMessage(cid, action, msg) {
    if (action === 'register') {
        const c = bfdClients.get(cid);
        if (c) {
            c.name = String(msg.name || `Commander_${cid}`).trim();
            c.class = Number(msg.class || 0);
            bfdSendTo(cid, {
                action: 'registered',
                client_id: cid,
                ip: c.ip,
                name: c.name
            });
            bfdBroadcastPresence();
        }
    } else if (action === 'squad_create') {
        const sqId = `SQ-${bfdNextSquadNum++}`;
        bfdSquads.set(sqId, {
            id: sqId,
            leader_id: cid,
            members: [cid]
        });
        const c = bfdClients.get(cid);
        if (c) {
            c.squad_id = sqId;
            c.status = 'IN_SQUAD';
            c.ready = true;
            bfdSendTo(cid, {
                action: 'squad_created',
                squad_id: sqId,
                leader_id: cid
            });
            bfdSyncSquad(sqId);
            bfdBroadcastPresence();
        }
    } else if (action === 'squad_invite') {
        const targetId = Number(msg.target_id || 0);
        const c = bfdClients.get(cid);
        if (c && c.squad_id && bfdClients.has(targetId)) {
            bfdSendTo(targetId, {
                action: 'squad_invite_received',
                squad_id: c.squad_id,
                from_id: cid,
                from_name: c.name
            });
        }
    } else if (action === 'squad_respond_invite') {
        const sqId = String(msg.squad_id || '');
        const accept = Boolean(msg.accept);
        const sq = bfdSquads.get(sqId);
        const c = bfdClients.get(cid);
        if (accept && sq && c) {
            if (sq.members.length < 4) {
                sq.members.push(cid);
                c.squad_id = sqId;
                c.status = 'IN_SQUAD';
                c.ready = true;
                bfdSyncSquad(sqId);
                bfdBroadcastPresence();
            } else {
                bfdSendTo(cid, { action: 'system_message', text: 'الفصيل ممتلئ بالكامل (4 لاعبين).' });
            }
        } else if (!accept && sq && c) {
            bfdSendTo(sq.leader_id, { action: 'system_message', text: `اعتذر ${c.name} عن قبول دعوة الفصيل.` });
        }
    } else if (action === 'squad_ready') {
        const c = bfdClients.get(cid);
        if (c) {
            c.ready = Boolean(msg.ready);
            if (msg.class !== undefined) c.class = Number(msg.class);
            if (c.squad_id) bfdSyncSquad(c.squad_id);
        }
    } else if (action === 'squad_leave') {
        const c = bfdClients.get(cid);
        if (c && c.squad_id) {
            const sqId = c.squad_id;
            const sq = bfdSquads.get(sqId);
            if (sq) {
                sq.members = sq.members.filter(m => m !== cid);
                if (sq.members.length === 0) {
                    bfdSquads.delete(sqId);
                } else {
                    if (sq.leader_id === cid) sq.leader_id = sq.members[0];
                    bfdSyncSquad(sqId);
                }
            }
            c.squad_id = '';
            c.status = 'LOBBY';
            c.ready = false;
            bfdSendTo(cid, { action: 'squad_left' });
            bfdBroadcastPresence();
        }
    } else if (action === 'matchmaking_start') {
        const c = bfdClients.get(cid);
        if (c) {
            const sqId = c.squad_id;
            const sq = sqId ? bfdSquads.get(sqId) : null;
            const party = sq ? sq.members : [cid];
            for (const mid of party) {
                const member = bfdClients.get(mid);
                if (member) {
                    member.status = 'MATCHMAKING';
                    bfdSendTo(mid, { action: 'matchmaking_status', status: 'SEARCHING' });
                }
            }
            const matchId = `M-${bfdNextMatchNum++}`;
            const hostId = party[0];
            bfdSendTo(hostId, {
                action: 'match_host_order',
                match_id: matchId,
                port: 7777,
                team: 1
            });
        }
    } else if (action === 'match_host_ready') {
        const matchId = String(msg.match_id || '');
        const port = Number(msg.port || 7777);
        const c = bfdClients.get(cid);
        if (c) {
            const hostIp = c.ip;
            const sqId = c.squad_id;
            const sq = sqId ? bfdSquads.get(sqId) : null;
            const party = sq ? sq.members : [cid];
            c.status = 'IN_GAME';
            for (const mid of party) {
                if (mid !== cid && bfdClients.has(mid)) {
                    const member = bfdClients.get(mid);
                    member.status = 'IN_GAME';
                    bfdSendTo(mid, {
                        action: 'match_join_order',
                        ip: hostIp,
                        port: port,
                        team: 1
                    });
                }
            }
            bfdBroadcastPresence();
        }
    } else if (action === 'matchmaking_cancel') {
        const c = bfdClients.get(cid);
        if (c) {
            c.status = c.squad_id ? 'IN_SQUAD' : 'LOBBY';
            bfdSendTo(cid, { action: 'matchmaking_status', status: 'CANCELLED' });
        }
    }
}

if (wsLib) {
    const wss = new wsLib.Server({ noServer: true });

    wss.on('connection', (ws, req) => {
        // Extract real public IP from Render's X-Forwarded-For header
        const forwarded = req.headers['x-forwarded-for'];
        const clientIp = forwarded ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1');
        const cid = bfdNextClientId++;

        bfdClients.set(cid, {
            id: cid,
            ws: ws,
            ip: clientIp,
            name: `Commander_${cid}`,
            status: 'LOBBY',
            squad_id: '',
            ready: false,
            class: 0
        });

        console.log(`[BFD MasterServer] Player connected: ID=${cid} IP=${clientIp}`);
        bfdBroadcastPresence();

        ws.on('message', (raw) => {
            try {
                const data = JSON.parse(raw.toString());
                bfdProcessMessage(cid, data.action, data);
            } catch (err) {
                console.error(`[BFD MasterServer] JSON error from ${cid}:`, err.message);
            }
        });

        ws.on('close', () => {
            const c = bfdClients.get(cid);
            if (c && c.squad_id) {
                const sq = bfdSquads.get(c.squad_id);
                if (sq) {
                    sq.members = sq.members.filter(m => m !== cid);
                    if (sq.members.length === 0) {
                        bfdSquads.delete(c.squad_id);
                    } else {
                        if (sq.leader_id === cid) sq.leader_id = sq.members[0];
                        bfdSyncSquad(c.squad_id);
                    }
                }
            }
            bfdClients.delete(cid);
            console.log(`[BFD MasterServer] Player disconnected: ID=${cid}`);
            bfdBroadcastPresence();
        });

        ws.on('error', (err) => {
            console.error(`[BFD MasterServer] Socket error for ${cid}:`, err.message);
        });
    });

    server.on('upgrade', (request, socket, head) => {
        const pathname = url.parse(request.url).pathname;
        if (pathname === '/bfd' || pathname === '/ws' || pathname === '/ws/' || pathname === '/') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
    });

    // 30s Heartbeat to prevent Render proxy timeouts
    setInterval(() => {
        for (const c of bfdClients.values()) {
            if (c.ws && c.ws.readyState === 1) {
                c.ws.ping();
            }
        }
    }, 30000);
}

// Start HTTP + WebSocket Server
server.listen(PORT, HOST, () => {
    console.log(`================================================================`);
    console.log(`  BFD Tactical Master & Matchmaking Relay running on port ${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/healthz`);
    console.log(`  WebSocket URL: ws://localhost:${PORT}/bfd`);
    console.log(`================================================================`);
});
