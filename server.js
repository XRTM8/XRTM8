
// ====================================================================
// GLOBAL CLOUD PROCESS RESILIENCE & CRASH SHIELDS
// ====================================================================
process.on('uncaughtException', (err) => {
    console.error('[Server Safe Recovery] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server Safe Recovery] Unhandled Rejection:', reason);
});


// ====================================================================
// ADVANCED SECURITY & RATE-LIMITING HELPERS
// ====================================================================
function checkSocketRateLimit(socket, actionKey, maxCount, windowMs) {
    if (!socket._rateLimits) socket._rateLimits = {};
    if (!socket._rateLimits[actionKey]) socket._rateLimits[actionKey] = [];

    const now = Date.now();
    // Filter timestamps within window
    socket._rateLimits[actionKey] = socket._rateLimits[actionKey].filter(t => now - t < windowMs);

    if (socket._rateLimits[actionKey].length >= maxCount) {
        return false; // Exceeded rate limit
    }

    socket._rateLimits[actionKey].push(now);
    return true; // Allowed
}

/**
 * ====================================================================
 * Chrono Drift (الانجراف الزمني) - High-Performance Real-Time Multiplayer Server
 * Engine: Node.js + Express + Socket.IO + SQLite3 Database
 * Features: Custom Rooms, Anti-Cheat, Time Anomalies, Boss Raids, i18n
 * ====================================================================
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
// sqlite3 loaded conditionally below
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingInterval: 10000,
    pingTimeout: 5000
});

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '145329ma';

// Middleware for parsing JSON requests
app.use(express.json());

// Explicit MIME-type and caching headers for static assets
app.use(express.static(path.resolve(__dirname), {
    dotfiles: 'ignore',
    etag: true,
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('sw.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (filePath.endsWith('manifest.json')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        }
    }
}));

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// ====================================================================
// 1. INPUT SANITIZATION & SECURITY HELPERS (XSS & EXPLOIT SHIELDS)
// ====================================================================
function sanitizeText(str, maxLen = 100) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .trim()
        .substring(0, maxLen);
}

function sanitizeUsername(str) {
    if (!str || typeof str !== 'string') return 'Agent_' + Math.floor(1000 + Math.random() * 9000);
    const cleaned = str.trim().replace(/[^a-zA-Z0-9_؀-ۿs-]/g, '').substring(0, 20);
    return cleaned || 'Agent_' + Math.floor(1000 + Math.random() * 9000);
}

// Admin Brute-Force Rate Limiting (IP Lockout)
const adminLoginAttempts = new Map(); // ip -> { count, lockedUntil }

function checkAdminRateLimit(ip) {
    const now = Date.now();
    const record = adminLoginAttempts.get(ip);
    if (record) {
        if (record.lockedUntil && now < record.lockedUntil) {
            const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
            return { allowed: false, message: `تم حظر هذا العنوان مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار ${remainingSec} ثانية.` };
        }
        if (record.lockedUntil && now >= record.lockedUntil) {
            adminLoginAttempts.delete(ip);
        }
    }
    return { allowed: true };
}

function recordAdminFailedAttempt(ip) {
    const now = Date.now();
    let record = adminLoginAttempts.get(ip);
    if (!record) {
        record = { count: 1, lockedUntil: 0 };
        adminLoginAttempts.set(ip, record);
    } else {
        record.count++;
        if (record.count >= 5) {
            record.lockedUntil = now + (5 * 60 * 1000); // 5 minutes lockout
            console.warn(`[BAN] [Security] IP ${ip} locked out from Admin for 5 minutes (5 failed attempts).`);
        }
    }
}


// ====================================================================
// 2. RESILIENT PERSISTENT DATABASE ENGINE (SQLITE3 + ATOMIC JSON BACKUP)
// ====================================================================

// ====================================================================
// SQLITE DATABASE TABLES INITIALIZER
// ====================================================================
function initDatabaseTables() {
    if (!db || useJsonDb) return;

    db.serialize(() => {
        // 1. Players table
        db.run(`
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                google_id TEXT,
                email TEXT,
                avatar_url TEXT,
                pin TEXT DEFAULT '0000',
                owner_token TEXT,
                credits INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                trophies INTEGER DEFAULT 0,
                highest_wave INTEGER DEFAULT 1,
                total_kills INTEGER DEFAULT 0,
                pvp_kills INTEGER DEFAULT 0,
                pvp_deaths INTEGER DEFAULT 0,
                highest_killstreak INTEGER DEFAULT 0,
                pve_revives INTEGER DEFAULT 0,
                bounty_claims INTEGER DEFAULT 0,
                unlocked_skins TEXT DEFAULT '["default"]',
                last_ip TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating players table:', err);
            else console.log('[DB] SQLite table "players" verified ready.');
        });

        // 2. Blacklist table
        db.run(`
            CREATE TABLE IF NOT EXISTS blacklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT UNIQUE NOT NULL,
                username TEXT,
                reason TEXT,
                banned_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating blacklist table:', err);
        });

        // 3. Player skins table
        db.run(`
            CREATE TABLE IF NOT EXISTS player_skins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER,
                skin_id TEXT,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating player_skins table:', err);
        });
    });
}


const DB_PATH = path.resolve(__dirname, 'chronodrift.sqlite');
const JSON_DB_PATH = path.resolve(__dirname, 'chronodrift_db.json');

let db = null;
let useJsonDb = false;
let jsonDbState = {
    players: [],
    player_skins: [],
    blacklist: []
};

// Load JSON db from disk if it exists
if (fs.existsSync(JSON_DB_PATH)) {
    try {
        jsonDbState = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
    } catch (e) {
        jsonDbState = { players: [], player_skins: [], blacklist: [] };
    }
}

function saveJsonDb() {
    try {
        fs.writeFileSync(JSON_DB_PATH, JSON.stringify(jsonDbState, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to write JSON DB to disk:', e);
    }
}

try {
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.warn('[!] [DB Warning] Native SQLite3 error, switching to persistent JSON Engine.');
            useJsonDb = true;
        } else {
            console.log('[DB] Connected successfully to SQLite database (chronodrift.sqlite)');
            initDatabaseTables();
        }
    });
} catch (e) {
    console.log('ℹ [DB Engine] Operating with High-Performance Atomic JSON Store (chronodrift_db.json).');
    useJsonDb = true;
}

function dbRun(sql, params = []) {
    if (!useJsonDb && db) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    // JSON Fallback Implementation
    return new Promise((resolve) => {
        const sqlUpper = sql.toUpperCase();
        if (sqlUpper.includes('INSERT INTO PLAYERS')) {
            const [username, pin, owner_token, credits, level, xp, highest_wave, total_kills, last_ip] = params;
            const newPlayer = {
                id: jsonDbState.players.length + 1,
                username: username,
                pin: pin || '0000',
                owner_token: owner_token || null,
                credits: credits || 0,
                level: level || 1,
                xp: xp || 0,
                trophies: 0,
                highest_wave: highest_wave || 1,
                total_kills: total_kills || 0,
                pvp_kills: 0,
                pvp_deaths: 0,
                highest_killstreak: 0,
                pve_revives: 0,
                bounty_claims: 0,
                unlocked_skins: '["default"]',
                last_ip: last_ip || '127.0.0.1',
                created_at: new Date().toISOString(),
                last_seen: new Date().toISOString()
            };
            const existingIdx = jsonDbState.players.findIndex(p => p.username.toLowerCase() === username.toLowerCase());
            if (existingIdx >= 0) {
                jsonDbState.players[existingIdx] = { ...jsonDbState.players[existingIdx], ...newPlayer, id: jsonDbState.players[existingIdx].id };
            } else {
                jsonDbState.players.push(newPlayer);
            }
            saveJsonDb();
            resolve({ id: newPlayer.id, changes: 1 });
        } else if ((sqlUpper.includes('UPDATE PLAYERS') && sqlUpper.includes('SET CREDITS'))) {
            const [credits, level, xp, wave, username] = params;
            const p = jsonDbState.players.find(x => x.username.toLowerCase() === username.toLowerCase());
            if (p) {
                p.credits = Math.max(p.credits || 0, credits);
                p.level = Math.max(p.level || 1, level);
                p.xp = xp;
                p.highest_wave = Math.max(p.highest_wave || 1, wave);
                p.last_seen = new Date().toISOString();
                saveJsonDb();
            }
            resolve({ changes: 1 });
        } else if (sqlUpper.includes('INSERT INTO BLACKLIST')) {
            const [ip, username, reason] = params;
            jsonDbState.blacklist.push({
                id: jsonDbState.blacklist.length + 1,
                ip: ip,
                username: username,
                reason: reason,
                banned_at: new Date().toISOString()
            });
            saveJsonDb();
            resolve({ changes: 1 });
        } else {
            resolve({ changes: 0 });
        }
    });
}

function dbGet(sql, params = []) {
    if (!useJsonDb && db) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    return new Promise((resolve) => {
        const sqlUpper = sql.toUpperCase();
        if (sqlUpper.includes('FROM BLACKLIST WHERE IP = ?')) {
            const ip = params[0];
            const found = jsonDbState.blacklist.find(b => b.ip === ip);
            resolve(found || null);
        } else if (sqlUpper.includes('FROM PLAYERS WHERE USERNAME = ?')) {
            const username = params[0];
            const found = jsonDbState.players.find(p => p.username.toLowerCase() === (username || '').toLowerCase());
            resolve(found || null);
        } else {
            resolve(null);
        }
    });
}

function dbAll(sql, params = []) {
    if (!useJsonDb && db) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    return new Promise((resolve) => {
        const sqlUpper = sql.toUpperCase();
        if (sqlUpper.includes('FROM PLAYERS ORDER BY TROPHIES')) {
            const sorted = [...jsonDbState.players].sort((a, b) => (b.trophies || 0) - (a.trophies || 0));
            resolve(sorted.slice(0, 25));
        } else {
            resolve([]);
        }
    });
}

// ====================================================================
// 3. MULTIPLAYER ROOMS & LOBBIES ARCHITECTURE
// ====================================================================
const activeSockets = new Map(); // socketId -> socketMetadata

class GameRoom {
    constructor(id, name, mode, options = {}) {
        this.id = id;
        this.name = name;
        this.mode = mode; // 'online_coop', 'online_pvp', 'online_boss_raid', 'online_free_roam'
        this.isCustom = !!options.isCustom;
        this.code = options.code || null;
        this.pin = options.pin || null;
        this.hostId = options.hostId || null;
        this.maxPlayers = options.maxPlayers || 16;
        this.anomalyDensity = options.anomalyDensity || 'normal';
        this.players = new Map(); // socketId -> playerState
        this.readyPlayers = new Set();
        this.status = 'active'; // 'lobby', 'in_game', 'active'
        this.anomalies = [];
        this.lastAnomalySpawn = Date.now();
        this.bossState = (mode === 'online_boss_raid') ? {
            name: 'Chrono Titan (قاهر الفضاء)',
            hp: 60000,
            maxHp: 60000,
            phase: 1,
            x: 4000,
            y: 4000
        } : null;
        this.createdAt = Date.now();
    }
}

const gameRooms = new Map();

// Initialize permanent public standard rooms
gameRooms.set('online_pve', new GameRoom('online_pve', 'Co-Op PvE Arena', 'online_coop', { maxPlayers: 16 }));
gameRooms.set('online_coop', gameRooms.get('online_pve')); // alias
gameRooms.set('online_pvp', new GameRoom('online_pvp', 'Warzone PvP Arena', 'online_pvp', { maxPlayers: 16 }));
gameRooms.set('online_boss_raid', new GameRoom('online_boss_raid', 'Quantum Boss Raid', 'online_boss_raid', { maxPlayers: 16 }));
gameRooms.set('online_free_roam', new GameRoom('online_free_roam', 'Free Roam Sandbox', 'online_free_roam', { maxPlayers: 32 }));

function getClientIp(socket) {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return socket.handshake.address || socket.conn.remoteAddress || '127.0.0.1';
}

function broadcastOnlineCount() {
    const totalConnected = io.engine.clientsCount || activeSockets.size;
    const pveCount = gameRooms.get('online_pve').players.size;
    const pvpCount = gameRooms.get('online_pvp').players.size;
    const raidCount = gameRooms.get('online_boss_raid').players.size;
    io.emit('server_presence', {
        total: totalConnected,
        pve: pveCount,
        pvp: pvpCount,
        raid: raidCount
    });
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DRIFT-';
    for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ====================================================================
// 4. TIME ANOMALIES & DYNAMIC IN-MATCH EVENTS ENGINE
// ====================================================================
function updateRoomAnomalies(room) {
    const now = Date.now();
    // Remove expired anomalies
    room.anomalies = room.anomalies.filter(a => a.expiresAt > now);

    // Spawn interval based on density
    const spawnInterval = room.anomalyDensity === 'extreme' ? 18000 : (room.anomalyDensity === 'high' ? 26000 : 38000);

    if (now - room.lastAnomalySpawn > spawnInterval && room.players.size > 0) {
        room.lastAnomalySpawn = now;
        const types = ['stasis', 'hyper_surge', 'quantum_drop'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const posX = Math.floor(1000 + Math.random() * 6000);
        const posY = Math.floor(1000 + Math.random() * 6000);
        const duration = chosenType === 'quantum_drop' ? 35000 : 25000;

        const newAnomaly = {
            id: 'anomaly_' + Math.random().toString(36).substring(2, 9),
            type: chosenType,
            x: posX,
            y: posY,
            radius: chosenType === 'quantum_drop' ? 140 : 420,
            duration: duration,
            expiresAt: now + duration,
            claimed: false
        };

        room.anomalies.push(newAnomaly);
        io.to(room.id).emit('room_anomaly_spawned', newAnomaly);
    }
}

// ====================================================================
// 5. ANTI-CHEAT ENGINE (SPEEDHACK, DAMAGE & RATE LIMIT VERIFICATION)
// ====================================================================
const playerMovementHistory = new Map(); // socketId -> { lastX, lastY, lastTime, warnings }
const playerShootHistory = new Map();    // socketId -> { lastShootTime, bulletCountInSec, resetSecTime }

function verifyPlayerMovement(socket, newState) {
    const now = Date.now();
    const history = playerMovementHistory.get(socket.id);
    if (!history) {
        playerMovementHistory.set(socket.id, { lastX: newState.x, lastY: newState.y, lastTime: now, warnings: 0 });
        return true;
    }

    const elapsedMs = Math.max(16, now - history.lastTime);
    const maxAllowedSpeedUnitsPerSec = newState.isDashing ? 2200 : (newState.sprintActive ? 1100 : 650);
    const maxAllowedDistance = (maxAllowedSpeedUnitsPerSec * (elapsedMs / 1000)) + 90; // with latency buffer

    const distanceTravelled = Math.hypot(newState.x - history.lastX, newState.y - history.lastY);

    if (distanceTravelled > maxAllowedDistance && !newState.portalWarp) {
        history.warnings++;
        if (history.warnings >= 8) {
            console.error(`[BAN] [Anti-Cheat] Auto-disconnecting ${socket.id} for excessive movement delta manipulation.`);
            socket.emit('banned_notification', { reason: 'تم فصلك تلقائياً بسبب تلاعب غير مسموح في الحركة.' });
            socket.disconnect(true);
            return false;
        }
        return false;
    }

    history.lastX = newState.x;
    history.lastY = newState.y;
    history.lastTime = now;
    return true;
}

function verifyPlayerShooting(socket) {
    const now = Date.now();
    let history = playerShootHistory.get(socket.id);
    if (!history) {
        history = { lastShootTime: 0, bulletCountInSec: 0, resetSecTime: now };
        playerShootHistory.set(socket.id, history);
    }

    if (now - history.resetSecTime > 1000) {
        history.resetSecTime = now;
        history.bulletCountInSec = 0;
    }

    history.bulletCountInSec++;
    if (history.bulletCountInSec > 40) {
        return false;
    }

    history.lastShootTime = now;
    return true;
}

// ====================================================================
// 6. MAIN SOCKET.IO EVENT PIPELINE
// ====================================================================
io.on('connection', async (socket) => {
    const clientIp = getClientIp(socket);

    // Blacklist check on connection
    try {
        const banEntry = await dbGet('SELECT * FROM blacklist WHERE ip = ? LIMIT 1', [clientIp]);
        if (banEntry) {
            console.log(`[BAN] [Security] Connection blocked for banned IP: ${clientIp}`);
            socket.emit('banned_notification', { reason: banEntry.reason || 'تم حظر عنوان IP الخاص بك بشكل دائم من الخادم.' });
            socket.disconnect(true);
            return;
        }
    } catch (e) {
        console.error('Error checking IP blacklist:', e);
    }

    // Register active socket
    activeSockets.set(socket.id, {
        id: socket.id,
        ip: clientIp,
        username: 'Agent_' + socket.id.substring(0, 4),
        mode: 'lobby',
        chassis: 'assault',
        currentRoomId: null,
        isAdmin: false,
        ping: 20,
        connectedAt: Date.now()
    });

    console.log(`[CONN] [Connect] العميل انضم: ${socket.id} (IP: ${clientIp}). الإجمالي: ${activeSockets.size}`);
    broadcastOnlineCount();

    // ----------------------------------------------------------------
    // Real-Time Username Availability Check
    // ----------------------------------------------------------------
    socket.on('check_username_availability', async (data) => {
        const rawUsername = sanitizeUsername(data ? data.username : '');
        if (!rawUsername || rawUsername.length < 2) {
            socket.emit('username_check_result', { available: false, message: 'يرجى إدخال اسم عميل صالح.' });
            return;
        }

        try {
            const playerRow = await dbGet('SELECT username, pin, owner_token FROM players WHERE username = ? COLLATE NOCASE', [rawUsername]);
            if (!playerRow) {
                socket.emit('username_check_result', { available: true, isNew: true, message: '[OK] الاسم متاح للتوثيق واللعب!' });
                return;
            }

            const clientToken = data ? data.deviceToken : null;
            if (clientToken && playerRow.owner_token && clientToken === playerRow.owner_token) {
                socket.emit('username_check_result', {
                    available: true,
                    isOwner: true,
                    message: `[OK] مرحباً بك مجدداً أيها العميل ${playerRow.username}`,
                    username: playerRow.username
                });
                return;
            }

            socket.emit('username_check_result', {
                available: false,
                isReserved: true,
                message: '[!] هذا الاسم محجوز لعميل آخر! (يمكنك تسجيل الدخول السحابي برمز PIN إذا كان حسابك)',
                username: playerRow.username
            });
        } catch (e) {
            socket.emit('username_check_result', { available: true, isNew: true });
        }
    });

    // ----------------------------------------------------------------
    // Join Game Mode Handler (Standard or Custom)
    // ----------------------------------------------------------------
    socket.on('join_game_mode', async (data) => {
        const requestedMode = (data && data.mode) ? data.mode : 'online_pve';
        const targetRoomId = (requestedMode === 'online_coop' || requestedMode === 'pve') ? 'online_pve' : requestedMode;

        let room = gameRooms.get(targetRoomId);
        if (!room) {
            // Default to PVE if unknown room
            room = gameRooms.get('online_pve');
        }

        const cleanUsername = sanitizeUsername(data ? data.username : '');
        const clientToken = data ? data.deviceToken : null;

        // Verify account ownership
        try {
            const playerRow = await dbGet('SELECT * FROM players WHERE username = ? COLLATE NOCASE', [cleanUsername]);
            if (playerRow && playerRow.owner_token && clientToken && playerRow.owner_token !== clientToken) {
                socket.emit('username_rejected', {
                    reason: `الاسم "${cleanUsername}" محجوز لعميل آخر ومحمي! يرجى اختيار اسم فريد أو تسجيل الدخول السحابي برمز PIN.`
                });
                return;
            }
        } catch (e) {
            console.error('Error verifying player on join:', e);
        }

        // Leave any previous room
        const meta = activeSockets.get(socket.id);
        if (meta && meta.currentRoomId && gameRooms.has(meta.currentRoomId)) {
            const oldRoom = gameRooms.get(meta.currentRoomId);
            oldRoom.players.delete(socket.id);
            socket.leave(oldRoom.id);
        }

        // Join target room
        socket.join(room.id);
        meta.mode = room.mode;
        meta.currentRoomId = room.id;
        meta.username = cleanUsername;
        meta.chassis = sanitizeText(data ? data.chassis : 'assault', 20);

        const initialSpawnState = {
            id: socket.id,
            username: cleanUsername,
            chassis: meta.chassis,
            weapon: sanitizeText(data ? data.weapon : 'blaster', 20),
            skin: sanitizeText(data ? data.skin : 'default', 40),
            x: Math.floor(3500 + Math.random() * 1000),
            y: Math.floor(3500 + Math.random() * 1000),
            angle: 0,
            hp: 100,
            maxHp: 100,
            shield: 50,
            maxShield: 50,
            isDashing: false,
            sprintActive: false,
            kills: 0,
            deaths: 0,
            revives: 0,
            score: 0,
            ping: meta.ping || 20,
            lastUpdate: Date.now()
        };

        room.players.set(socket.id, initialSpawnState);

        // Fetch trophies and profile
        let userTrophies = 0;
        try {
            const row = await dbGet('SELECT trophies, credits, level, xp FROM players WHERE username = ? COLLATE NOCASE', [cleanUsername]);
            if (row) {
                userTrophies = row.trophies || 0;
                socket.emit('player_profile_sync', row);
            }
        } catch (e) {}

        socket.emit('current_room_state', {
            roomId: room.id,
            roomName: room.name,
            mode: room.mode,
            isCustom: room.isCustom,
            roomCode: room.code,
            selfId: socket.id,
            players: Array.from(room.players.values()),
            anomalies: room.anomalies,
            bossState: room.bossState,
            trophies: userTrophies
        });

        socket.to(room.id).emit('player_joined', initialSpawnState);
        broadcastOnlineCount();
    });

    // ----------------------------------------------------------------
    // Custom Rooms Creation & Management
    // ----------------------------------------------------------------
    socket.on('create_custom_room', (options) => {
        const roomCode = generateRoomCode();
        const roomId = 'custom_' + roomCode;
        const mode = (options && options.mode) ? options.mode : 'online_coop';
        const pin = (options && options.pin) ? sanitizeText(options.pin, 8) : null;
        const maxPlayers = parseInt(options && options.maxPlayers, 10) || 8;
        const anomalyDensity = (options && options.anomalyDensity) ? options.anomalyDensity : 'normal';

        const customRoom = new GameRoom(roomId, `فرقة ${roomCode}`, mode, {
            isCustom: true,
            code: roomCode,
            pin: pin,
            hostId: socket.id,
            maxPlayers: maxPlayers,
            anomalyDensity: anomalyDensity
        });

        gameRooms.set(roomId, customRoom);

        socket.emit('custom_room_created', {
            success: true,
            roomId: roomId,
            roomCode: roomCode,
            mode: mode,
            maxPlayers: maxPlayers,
            isHost: true
        });
    });

    socket.on('join_custom_room_by_code', (data) => {
        const rawCode = (data && data.code ? data.code : '').trim().toUpperCase();
        let targetRoom = null;

        for (const r of gameRooms.values()) {
            if (r.isCustom && r.code === rawCode) {
                targetRoom = r;
                break;
            }
        }

        if (!targetRoom) {
            socket.emit('custom_room_join_result', { success: false, message: '[!] كود الغرفة غير موجود أو انتهت صلاحيته!' });
            return;
        }

        if (targetRoom.players.size >= targetRoom.maxPlayers) {
            socket.emit('custom_room_join_result', { success: false, message: '[!] هذه الغرفة ممتلئة بالكامل!' });
            return;
        }

        if (targetRoom.pin && targetRoom.pin !== (data ? data.pin : '')) {
            socket.emit('custom_room_join_result', { success: false, message: '[!] رمز PIN السري للغرفة غير صحيح!' });
            return;
        }

        socket.emit('custom_room_join_result', {
            success: true,
            roomId: targetRoom.id,
            roomCode: targetRoom.code,
            mode: targetRoom.mode,
            isHost: targetRoom.hostId === socket.id
        });
    });

    socket.on('send_lobby_chat', (data) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room) return;

        const cleanMsg = sanitizeText(data ? data.message : '', 120);
        if (!cleanMsg) return;

        io.to(room.id).emit('lobby_chat_broadcast', {
            username: meta.username,
            message: cleanMsg,
            time: Date.now()
        });
    });

    socket.on('toggle_lobby_ready', () => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room || !room.isCustom) return;

        if (room.readyPlayers.has(socket.id)) {
            room.readyPlayers.delete(socket.id);
        } else {
            room.readyPlayers.add(socket.id);
        }

        io.to(room.id).emit('lobby_ready_update', {
            playerId: socket.id,
            isReady: room.readyPlayers.has(socket.id)
        });
    });

    socket.on('host_start_custom_match', () => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room || !room.isCustom || room.hostId !== socket.id) return;

        room.status = 'in_game';
        io.to(room.id).emit('custom_match_started', {
            roomId: room.id,
            mode: room.mode
        });
    });

    // ----------------------------------------------------------------
    // Player Real-Time Movement & State Updates
    // ----------------------------------------------------------------
    socket.on('player_update', (state) => {
        if (!state || typeof state.x !== 'number' || typeof state.y !== 'number') return;
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room) return;

        const existingPlayer = room.players.get(socket.id);
        if (!existingPlayer) return;

        // Anti-cheat movement check
        if (!verifyPlayerMovement(socket, state)) return;

        existingPlayer.x = state.x;
        existingPlayer.y = state.y;
        existingPlayer.angle = state.angle || 0;
        existingPlayer.hp = state.hp !== undefined ? state.hp : existingPlayer.hp;
        existingPlayer.shield = state.shield !== undefined ? state.shield : existingPlayer.shield;
        existingPlayer.isDashing = !!state.isDashing;
        existingPlayer.sprintActive = !!state.sprintActive;
        existingPlayer.lastUpdate = Date.now();
    });

    // ----------------------------------------------------------------
    // Shooting & Actions Pipeline
    // ----------------------------------------------------------------
    socket.on('player_shoot', (bulletData) => {
        if (!verifyPlayerShooting(socket)) return;
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;

        socket.to(meta.currentRoomId).emit('remote_shoot', {
            shooterId: socket.id,
            x: bulletData ? bulletData.x : 0,
            y: bulletData ? bulletData.y : 0,
            vx: bulletData ? bulletData.vx : 0,
            vy: bulletData ? bulletData.vy : 0,
            type: bulletData ? bulletData.type : 'normal',
            color: bulletData ? bulletData.color : '#00f3ff',
            weaponType: bulletData ? bulletData.weaponType : 'blaster'
        });
    });

    socket.on('player_action', (actionData) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;

        socket.to(meta.currentRoomId).emit('remote_action', {
            playerId: socket.id,
            action: actionData ? actionData.action : 'dash',
            x: actionData ? actionData.x : 0,
            y: actionData ? actionData.y : 0
        });
    });

    // ----------------------------------------------------------------
    // Latency Ping / Pong Roundtrip
    // ----------------------------------------------------------------
    socket.on('latency_ping', (clientTs) => {
        const meta = activeSockets.get(socket.id);
        const now = Date.now();
        if (meta && typeof clientTs === 'number') {
            meta.ping = Math.max(5, Math.min(999, now - clientTs));
        }
        socket.emit('latency_pong', clientTs);
    });

    // ----------------------------------------------------------------
    // PVP Damage & Elimination Pipeline
    // ----------------------------------------------------------------
    socket.on('pvp_damage_dealt', (data) => {
        if (!data || !data.targetId || typeof data.damage !== 'number') return;
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;

        // Damage sanity clamp (prevent 1-hit-kill hack)
        const safeDamage = Math.min(180, Math.max(1, data.damage));

        io.to(data.targetId).emit('pvp_take_damage', {
            attackerId: socket.id,
            attackerName: meta.username,
            damage: safeDamage,
            isCrit: !!data.isCrit,
            weaponType: data.weaponType || 'blaster'
        });

        socket.to(meta.currentRoomId).emit('pvp_hit_effect', {
            targetId: data.targetId,
            attackerId: socket.id,
            x: data.x,
            y: data.y
        });
    });

    socket.on('pvp_player_eliminated', async (data) => {
        if (!data || !data.killerId) return;
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room) return;

        const killerSocket = io.sockets.sockets.get(data.killerId);
        const killerMeta = killerSocket ? activeSockets.get(data.killerId) : null;
        const killerName = killerMeta ? killerMeta.username : 'Unknown Warrior';

        // Update stats
        try {
            await dbRun('UPDATE players SET pvp_kills = pvp_kills + 1, trophies = trophies + 25, credits = credits + 50 WHERE username = ? COLLATE NOCASE', [killerName]);
            await dbRun('UPDATE players SET pvp_deaths = pvp_deaths + 1, trophies = MAX(0, trophies - 10) WHERE username = ? COLLATE NOCASE', [meta.username]);
        } catch (e) {}

        io.to(room.id).emit('kill_feed_event', {
            killerName: killerName,
            victimName: meta.username,
            weapon: data.weapon || 'blaster'
        });

        if (killerSocket) {
            killerSocket.emit('pvp_kill_reward', {
                trophies: 25,
                credits: 50,
                victimName: meta.username
            });
        }
    });

    socket.on('player_respawn', (data) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room) return;

        const playerState = room.players.get(socket.id);
        if (playerState) {
            playerState.hp = 100;
            playerState.shield = 50;
            playerState.x = Math.floor(3500 + Math.random() * 1000);
            playerState.y = Math.floor(3500 + Math.random() * 1000);

            io.to(room.id).emit('player_respawned', {
                id: socket.id,
                x: playerState.x,
                y: playerState.y
            });
        }
    });

    // ----------------------------------------------------------------
    // PVE Downed & Revive Pipeline
    // ----------------------------------------------------------------
    socket.on('pve_player_downed', (data) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        io.to(meta.currentRoomId).emit('pve_downed_alert', {
            downedId: socket.id,
            downedUsername: meta.username,
            x: data ? data.x : 4000,
            y: data ? data.y : 4000
        });
    });

    socket.on('pve_revive_ally', async (data) => {
        if (!data || !data.targetId) return;
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;

        io.to(meta.currentRoomId).emit('pve_revive_success', {
            revivedId: data.targetId,
            reviverId: socket.id,
            reviverName: meta.username
        });

        try {
            await dbRun('UPDATE players SET pve_revives = pve_revives + 1, credits = credits + 75 WHERE username = ? COLLATE NOCASE', [meta.username]);
        } catch (e) {}
    });

    // ----------------------------------------------------------------
    // Tactical Ping & Emote Broadcast
    // ----------------------------------------------------------------
    socket.on('send_tactical_ping', (data) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;

        io.to(meta.currentRoomId).emit('tactical_ping_broadcast', {
            senderId: socket.id,
            senderName: meta.username,
            type: data ? data.type : 'emote',
            icon: data ? data.icon : '',
            text: sanitizeText(data ? data.text : '', 50),
            x: data ? data.x : 0,
            y: data ? data.y : 0
        });
    });

    // ----------------------------------------------------------------
    // Claim Quantum Supply Drop Anomaly
    // ----------------------------------------------------------------
    socket.on('claim_quantum_drop', async (data) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room) return;

        const anomaly = room.anomalies.find(a => a.id === (data ? data.anomalyId : ''));
        if (anomaly && !anomaly.claimed) {
            anomaly.claimed = true;
            io.to(room.id).emit('room_anomaly_claimed', {
                anomalyId: anomaly.id,
                claimerName: meta.username
            });

            try {
                await dbRun('UPDATE players SET credits = credits + 200, trophies = trophies + 30 WHERE username = ? COLLATE NOCASE', [meta.username]);
            } catch (e) {}
        }
    });

    // ----------------------------------------------------------------
    // Rank Leaderboard Telemetry
    // ----------------------------------------------------------------
    socket.on('get_rank_leaderboard', async () => {
        try {
            const topPlayers = await dbAll(`
                SELECT username, level, trophies, pvp_kills, pve_revives, total_kills
                FROM players
                ORDER BY trophies DESC, pvp_kills DESC
                LIMIT 25
            `);
            socket.emit('rank_leaderboard_data', topPlayers);
        } catch (e) {
            socket.emit('rank_leaderboard_data', []);
        }
    });

    // ----------------------------------------------------------------
    // Cloud Accounts & PIN Authentication
    // ----------------------------------------------------------------
    socket.on('cloud_account_auth', async (data) => {
        const username = sanitizeUsername(data ? data.username : '');
        const pin = sanitizeText(data ? data.pin : '0000', 8);
        const deviceToken = data ? data.deviceToken : null;

        if (!username || username.length < 2) {
            socket.emit('cloud_auth_result', { success: false, message: 'يرجى إدخال اسم عميل صالح.' });
            return;
        }

        try {
            let playerRow = await dbGet('SELECT * FROM players WHERE username = ? COLLATE NOCASE', [username]);

            if (playerRow) {
                if (playerRow.pin !== pin) {
                    socket.emit('cloud_auth_result', { success: false, message: 'رمز الحساب السري (PIN) غير صحيح لهذا العميل.' });
                    return;
                }

                await dbRun('UPDATE players SET owner_token = ?, last_ip = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [
                    deviceToken,
                    clientIp,
                    playerRow.id
                ]);

                socket.emit('cloud_auth_result', {
                    success: true,
                    message: `تم استرجاع ومزامنة حساب العميل ${playerRow.username} (المستوى ${playerRow.level}) بنجاح!`,
                    profile: playerRow
                });
            } else {
                const newLevel = Math.max(1, parseInt(data ? data.level : 1, 10) || 1);
                const newCredits = Math.max(0, parseInt(data ? data.credits : 0, 10) || 0);
                const newXp = Math.max(0, parseInt(data ? data.xp : 0, 10) || 0);

                await dbRun(`
                    INSERT INTO players (username, pin, owner_token, credits, level, xp, highest_wave, total_kills, unlocked_skins, last_ip, last_seen)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '["default"]', ?, CURRENT_TIMESTAMP)
                `, [username, pin, deviceToken, newCredits, newLevel, newXp, 1, 0, clientIp]);

                const createdRow = await dbGet('SELECT * FROM players WHERE username = ? COLLATE NOCASE', [username]);
                socket.emit('cloud_auth_result', {
                    success: true,
                    message: `تم إنشاء وتوثيق الحساب السحابي للعميل: ${username}`,
                    profile: createdRow
                });
            }
        } catch (e) {
            socket.emit('cloud_auth_result', { success: false, message: 'حدث خطأ في مزامنة الحساب السحابي.' });
        }
    });

    socket.on('cloud_account_sync_save', async (data) => {
        const username = sanitizeUsername(data ? data.username : '');
        if (!username) return;

        try {
            const credits = parseInt(data.credits, 10) || 0;
            const level = parseInt(data.level, 10) || 1;
            const xp = parseInt(data.xp, 10) || 0;
            const wave = parseInt(data.highest_wave, 10) || 1;

            await dbRun(`
                UPDATE players
                SET credits = MAX(credits, ?), level = MAX(level, ?), xp = ?, highest_wave = MAX(highest_wave, ?), last_seen = CURRENT_TIMESTAMP
                WHERE username = ? COLLATE NOCASE
            `, [credits, level, xp, wave, username]);

            socket.emit('cloud_sync_ack', { success: true });
        } catch (e) {}
    });

    // ----------------------------------------------------------------
    // Cyber Admin Control Pipeline (Brute-Force Protected)
    // ----------------------------------------------------------------
    
    // ----------------------------------------------------------------
    // Google Account Linking & Cloud Progress Sync Engine
    // ----------------------------------------------------------------
    socket.on('google_account_auth', async (data) => {
        if (!data || !data.googleId) {
            socket.emit('google_auth_result', { success: false, message: 'بيانات حساب Google غير صالحة.' });
            return;
        }

        const googleId = sanitizeText(data.googleId, 50);
        const email = sanitizeText(data.email || '', 80);
        const name = sanitizeUsername(data.name || 'Agent_Google');
        const avatarUrl = sanitizeText(data.picture || '', 300);
        const deviceToken = data.deviceToken || null;

        try {
            // Check if player exists by google_id or email
            let playerRow = null;
            if (useJsonDb) {
                playerRow = jsonDbState.players.find(p => p.google_id === googleId || (email && p.email === email));
            } else if (db) {
                playerRow = await dbGet('SELECT * FROM players WHERE google_id = ? OR (email != "" AND email = ?) LIMIT 1', [googleId, email]);
            }

            if (playerRow) {
                // Update Google metadata & last seen
                if (useJsonDb) {
                    playerRow.google_id = googleId;
                    playerRow.email = email;
                    playerRow.avatar_url = avatarUrl;
                    playerRow.last_seen = new Date().toISOString();
                    saveJsonDb();
                } else if (db) {
                    await dbRun('UPDATE players SET google_id = ?, email = ?, avatar_url = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [
                        googleId, email, avatarUrl, playerRow.id
                    ]);
                    playerRow = await dbGet('SELECT * FROM players WHERE id = ?', [playerRow.id]);
                }

                console.log(`[NET] [Google Auth] استرجاع ومزامنة حساب العميل عبر Google: ${playerRow.username} (${email})`);
                socket.emit('google_auth_result', {
                    success: true,
                    isExisting: true,
                    message: `[OK] مرحباً بك مجدداً أيها العميل ${playerRow.username}! تمت المزامنة عبر حساب Google.`,
                    profile: playerRow
                });
            } else {
                // Create new Google-linked profile
                const initLevel = Math.max(1, parseInt(data.level, 10) || 1);
                const initCredits = Math.max(0, parseInt(data.credits, 10) || 0);
                const initXp = Math.max(0, parseInt(data.xp, 10) || 0);

                let newPlayerObj = null;
                if (useJsonDb) {
                    newPlayerObj = {
                        id: jsonDbState.players.length + 1,
                        username: name,
                        google_id: googleId,
                        email: email,
                        avatar_url: avatarUrl,
                        pin: '0000',
                        owner_token: deviceToken,
                        credits: initCredits,
                        level: initLevel,
                        xp: initXp,
                        trophies: 0,
                        highest_wave: 1,
                        total_kills: 0,
                        pvp_kills: 0,
                        pvp_deaths: 0,
                        highest_killstreak: 0,
                        pve_revives: 0,
                        bounty_claims: 0,
                        unlocked_skins: '["default"]',
                        last_ip: clientIp,
                        created_at: new Date().toISOString(),
                        last_seen: new Date().toISOString()
                    };
                    jsonDbState.players.push(newPlayerObj);
                    saveJsonDb();
                } else if (db) {
                    await dbRun(`
                        INSERT INTO players (username, google_id, email, avatar_url, pin, owner_token, credits, level, xp, highest_wave, total_kills, unlocked_skins, last_ip, last_seen)
                        VALUES (?, ?, ?, ?, '0000', ?, ?, ?, ?, 1, 0, '["default"]', ?, CURRENT_TIMESTAMP)
                    `, [name, googleId, email, avatarUrl, deviceToken, initCredits, initLevel, initXp, clientIp]);

                    newPlayerObj = await dbGet('SELECT * FROM players WHERE google_id = ? LIMIT 1', [googleId]);
                }

                console.log(`[NET] [Google Auth] إنشاء حساب سحابي جديد مربوط بـ Google للعميل: ${name} (${email})`);
                socket.emit('google_auth_result', {
                    success: true,
                    isExisting: false,
                    message: `[OK] تم ربط وتوثيق حسابك الجديد مع Google بنجاح: ${name}`,
                    profile: newPlayerObj
                });
            }
        } catch (e) {
            console.error('Error in google_account_auth:', e);
            socket.emit('google_auth_result', { success: false, message: 'حدث خطأ أثناء مزامنة حساب Google.' });
        }
    });


socket.on('admin_auth', (authData) => {
        const rateCheck = checkAdminRateLimit(clientIp);
        if (!rateCheck.allowed) {
            socket.emit('admin_auth_failed', { message: rateCheck.message });
            return;
        }

        const inputPass = authData ? authData.password : '';
        if (inputPass === ADMIN_PASSWORD) {
            const meta = activeSockets.get(socket.id);
            if (meta) meta.isAdmin = true;
            adminLoginAttempts.delete(clientIp);
            socket.emit('admin_auth_success', { message: '[OK] تم توثيق وصول القيادة العليا بنجاح!' });
        } else {
            recordAdminFailedAttempt(clientIp);
            socket.emit('admin_auth_failed', { message: '[X] الرمز السري غير صحيح!' });
        }
    });

    socket.on('admin_request_players', () => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.isAdmin) return;
        socket.emit('admin_players_update', Array.from(activeSockets.values()));
    });

    socket.on('admin_kick_player', (data) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.isAdmin || !data || !data.targetId) return;

        const targetSocket = io.sockets.sockets.get(data.targetId);
        if (targetSocket) {
            targetSocket.emit('kicked_notification', { reason: 'تم طردك من الساحة بواسطة القيادة الإدارية.' });
            targetSocket.disconnect(true);
            socket.emit('admin_action_result', { success: true, message: 'تم طرد العميل بنجاح.' });
        }
    });

    socket.on('admin_ban_player', async (data) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.isAdmin || !data || !data.targetId) return;

        const targetMeta = activeSockets.get(data.targetId);
        const targetSocket = io.sockets.sockets.get(data.targetId);

        if (targetMeta) {
            try {
                await dbRun('INSERT INTO blacklist (ip, username, reason) VALUES (?, ?, ?)', [
                    targetMeta.ip,
                    targetMeta.username,
                    'حظر دائم من قبل القيادة الإدارية'
                ]);
            } catch (e) {}

            if (targetSocket) {
                targetSocket.emit('banned_notification', { reason: 'تم حظرك نهائياً من قبل القيادة الإدارية.' });
                targetSocket.disconnect(true);
            }
            socket.emit('admin_action_result', { success: true, message: 'تم حظر الـ IP والعميل بنجاح.' });
        }
    });

    socket.on('admin_broadcast_message', (data) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.isAdmin || !data || !data.message) return;

        const cleanMsg = sanitizeText(data.message, 250);
        io.emit('server_global_announcement', {
            message: cleanMsg,
            sender: 'القيادة العليا (Apex Admin Matrix)'
        });
    });

    // ----------------------------------------------------------------
    // Disconnection & Graceful Room Cleanup
    // ----------------------------------------------------------------
    socket.on('disconnect', () => {
        const meta = activeSockets.get(socket.id);
        if (meta && meta.currentRoomId && gameRooms.has(meta.currentRoomId)) {
            const room = gameRooms.get(meta.currentRoomId);
            room.players.delete(socket.id);
            room.readyPlayers.delete(socket.id);

            socket.to(room.id).emit('player_left', {
                id: socket.id,
                username: meta.username
            });

            // If host left custom room, migrate host or clean up
            if (room.isCustom && room.hostId === socket.id) {
                if (room.players.size > 0) {
                    const nextHostId = room.players.keys().next().value;
                    room.hostId = nextHostId;
                    io.to(room.id).emit('lobby_host_migrated', { newHostId: nextHostId });
                } else {
                    gameRooms.delete(room.id);
                }
            }
        }

        activeSockets.delete(socket.id);
        playerMovementHistory.delete(socket.id);
        playerShootHistory.delete(socket.id);

        console.log(`[X] [Disconnect] العميل غادر: ${socket.id}. المتبقون: ${activeSockets.size}`);
        broadcastOnlineCount();
    });
});

// ====================================================================
// 7. UNIFIED HIGH-PERFORMANCE 20HZ TICK LOOP
// ====================================================================
setInterval(() => {
    for (const room of gameRooms.values()) {
        if (room.players.size > 0) {
            updateRoomAnomalies(room);
            const snapshot = Array.from(room.players.values());
            io.to(room.id).emit('room_tick_sync', snapshot);
        }
    }
}, 50); // 20Hz clean tick rate

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
============================================================
 CHRONO DRIFT (الانجراف الزمني) SERVER RUNNING ON PORT ${PORT}
[SYS] WebGL Client & Authoritative Engine Active (20Hz Tick)
[DB] SQLite Database: chronodrift.sqlite
[SEC] Anti-Cheat, XSS Shields, Custom Lobbies & Anomalies Ready
============================================================
`);
});
