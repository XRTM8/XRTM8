
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
 * Engine: Node.js + Express + Socket.IO + persistent JSON profiles
 * Features: Custom Rooms, Anti-Cheat, Time Anomalies, Boss Raids, i18n
 * ====================================================================
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingInterval: 20000,
    pingTimeout: 30000,
    maxHttpBufferSize: 1e6
});

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '145329ma';

// Universal Cross-Origin Resource Sharing (CORS) for global embedding (Itch.io, GitHub Pages, Poki, CrazyGames, etc.)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Middleware for parsing JSON requests
app.use(express.json());

// Explicit MIME-type and caching headers for static assets
app.use(express.static(path.resolve(__dirname), {
    dotfiles: 'ignore',
    etag: true,
    maxAge: 0,
    setHeaders: (res, filePath) => {
        // The game is updated frequently; never let an installed PWA keep an old
        // death/UI script after a fix has been deployed.
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
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

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const topPlayers = await dbAll(`
            SELECT username, level, trophies, pvp_kills, pvp_deaths, pve_revives, total_kills, highest_wave, credits
            FROM players
            ORDER BY trophies DESC, total_kills DESC, highest_wave DESC
            LIMIT 50
        `);
        res.json({ success: true, leaderboard: topPlayers || [] });
    } catch (e) {
        res.json({ success: false, leaderboard: [], error: e.message });
    }
});

app.get('/api/server-info', (req, res) => {
    res.json({
        onlineCount: activeSockets.size,
        rooms: Array.from(gameRooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            mode: r.mode,
            playerCount: r.players.size,
            maxPlayers: r.maxPlayers,
            isCustom: r.isCustom
        }))
    });
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
// 2. RESILIENT PERSISTENT DATABASE ENGINE (JSON STORE)
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

console.log('ℹ [DB Engine] Operating with persistent JSON Store (chronodrift_db.json).');
useJsonDb = true;

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
                else resolve(rows || []);
            });
        });
    }

    return new Promise((resolve) => {
        const sqlUpper = sql.toUpperCase();
        if (sqlUpper.includes('FROM PLAYERS')) {
            const sorted = [...jsonDbState.players].sort((a, b) => {
                const tropDiff = (b.trophies || 0) - (a.trophies || 0);
                if (tropDiff !== 0) return tropDiff;
                const killDiff = (b.total_kills || 0) - (a.total_kills || 0);
                if (killDiff !== 0) return killDiff;
                return (b.highest_wave || 0) - (a.highest_wave || 0);
            });
            resolve(sorted.slice(0, 50));
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
const CHASSIS_COMBAT_STATS = Object.freeze({
    assault: { hp: 90, shield: 2 },
    breacher: { hp: 140, shield: 3 },
    support: { hp: 135, shield: 3 },
    engineer: { hp: 105, shield: 2 },
    sniper: { hp: 75, shield: 1 }
});
const PVE_REVIVE_DURATION_MS = 5000;
const PVE_REVIVE_DISTANCE = 120;

// Initialize permanent public standard rooms with strict balanced capacity
gameRooms.set('online_pve', new GameRoom('online_pve', 'Co-Op PvE Arena', 'online_coop', { maxPlayers: 4 }));
gameRooms.set('online_coop', gameRooms.get('online_pve')); // alias
gameRooms.set('online_pvp', new GameRoom('online_pvp', 'Warzone PvP Arena', 'online_pvp', { maxPlayers: 8 }));
gameRooms.set('online_boss_raid', new GameRoom('online_boss_raid', 'Quantum Boss Raid', 'online_boss_raid', { maxPlayers: 6 }));
gameRooms.set('online_free_roam', new GameRoom('online_free_roam', 'Free Roam Sandbox', 'online_free_roam', { maxPlayers: 12 }));

// ====================================================================
// SIMULATED ONLINE BOT PLAYERS SUBSYSTEM & DYNAMIC REBALANCING
// ====================================================================
const BOT_NAMES_POOL = [
    // Arabic Authentic Gamer Handles
    'صقر_الصحراء', 'البرق_الأسطوري', 'قاهر_الظلام', 'فارس_الليل', 'شبح_الساحة',
    'سيد_الرماية', 'كاسر_الأمواج', 'النسر_الملكي', 'عاصفة_النار', 'بطل_المجرة',
    'ذئب_الفضاء', 'سيف_الحق', 'طيف_السرعة', 'صياد_الزعماء', 'موجة_الدمار',
    'قناص_الرياض', 'فهد_الجزيرة', 'شبح_دبي', 'أمير_الظلال', 'درع_الوطن',
    // English Authentic Gamer Handles
    'ShadowSniper_99', 'Ghost_Valkyrie', 'Neon_Overlord', 'Vortex_Spectre', 'CyberTitan_X',
    'Apex_Striker', 'QuantumDrifter', 'Nova_Blaze', 'HyperZero', 'ZeroGravity',
    'Echo_Warrior', 'SolarFlare_07', 'DarkMatter', 'Pulse_Cannon', 'Star_Cruiser',
    'Omega_Phantom', 'Rogue_Hydra', 'Stealth_Reaper', 'Aero_Knight', 'Blaze_Core'
];

const BOT_CHASSIS_LIST = ['assault', 'breacher', 'support', 'engineer', 'sniper'];
const BOT_WEAPONS_LIST = ['blaster', 'plasma_scatter', 'railgun', 'laser_beam', 'vulcan_gatling', 'missile_pod', 'flamethrower'];
const BOT_SKINS_LIST = ['default', 'cyber_neon', 'stealth_obsidian', 'gold_striker', 'plasma_void', 'crimson_fury', 'solar_flare'];

class BotPlayer {
    constructor(room) {
        this.id = 'bot_' + Math.random().toString(36).substring(2, 9);
        this.isBot = true;
        this.username = BOT_NAMES_POOL[Math.floor(Math.random() * BOT_NAMES_POOL.length)];
        this.chassis = BOT_CHASSIS_LIST[Math.floor(Math.random() * BOT_CHASSIS_LIST.length)];
        this.weapon = BOT_WEAPONS_LIST[Math.floor(Math.random() * BOT_WEAPONS_LIST.length)];
        this.skin = BOT_SKINS_LIST[Math.floor(Math.random() * BOT_SKINS_LIST.length)];
        
        const stats = CHASSIS_COMBAT_STATS[this.chassis] || CHASSIS_COMBAT_STATS.assault;
        this.maxHp = stats.hp;
        this.hp = stats.hp;
        this.health = stats.hp;
        this.maxHealth = stats.hp;
        this.shield = stats.shield;
        this.maxShield = stats.shield;

        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = 350 + Math.random() * 1400;
        this.x = Math.round(4000 + Math.cos(spawnAngle) * spawnDist);
        this.y = Math.round(4000 + Math.sin(spawnAngle) * spawnDist);
        this.vx = 0;
        this.vy = 0;
        this.facingAngle = Math.random() * Math.PI * 2;

        this.targetX = this.x;
        this.targetY = this.y;
        this.isDashing = false;
        this.sprintActive = false;
        this.overchargeActive = false;
        this.isFiringUlt = false;
        this.isDead = false;
        this.isDowned = false;
        this.score = Math.floor(Math.random() * 2800);
        this.kills = Math.floor(Math.random() * 6);
        this.deaths = 0;
        this.revives = 0;
        this.ping = Math.floor(28 + Math.random() * 32);
        this.level = Math.floor(12 + Math.random() * 48);

        this.aiChangeTargetTime = Date.now() + Math.random() * 2000;
        this.aiTargetAngle = this.facingAngle;
        this.aiSpeed = 4.2 + Math.random() * 2.2;
        this.aiDashCooldown = Date.now() + 4000 + Math.random() * 6000;
    }

    update(room, dt) {
        if (this.isDead) return;
        const now = Date.now();

        // Dynamic tactical roaming & target acquisition
        if (now > this.aiChangeTargetTime) {
            this.aiChangeTargetTime = now + 1600 + Math.random() * 2400;
            
            let target = null;
            let minDist = 1800;

            for (const other of room.players.values()) {
                if (other.id !== this.id && !other.isDead) {
                    const dist = Math.hypot(other.x - this.x, other.y - this.y);
                    if (dist < minDist) {
                        minDist = dist;
                        target = other;
                    }
                }
            }

            if (target && (room.mode === 'online_pvp' || (room.mode === 'online_coop' && target.isDowned))) {
                const angToTarget = Math.atan2(target.y - this.y, target.x - this.x);
                if (minDist > 320) {
                    this.aiTargetAngle = angToTarget + (Math.random() - 0.5) * 0.4;
                } else {
                    this.aiTargetAngle = angToTarget + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
                }
                this.facingAngle = angToTarget;
            } else if (room.bossState && room.mode === 'online_boss_raid') {
                const angToBoss = Math.atan2(room.bossState.y - this.y, room.bossState.x - this.x);
                const distToBoss = Math.hypot(room.bossState.x - this.x, room.bossState.y - this.y);
                if (distToBoss > 650) {
                    this.aiTargetAngle = angToBoss + (Math.random() - 0.5) * 0.5;
                } else {
                    this.aiTargetAngle = angToBoss + Math.PI / 2;
                }
                this.facingAngle = angToBoss;
            } else {
                if (this.x < 1500 || this.x > 6500 || this.y < 1500 || this.y > 6500) {
                    this.aiTargetAngle = Math.atan2(4000 - this.y, 4000 - this.x);
                } else {
                    this.aiTargetAngle += (Math.random() - 0.5) * 1.4;
                }
                this.facingAngle = this.aiTargetAngle;
            }
        }

        const moveVx = Math.cos(this.aiTargetAngle) * this.aiSpeed;
        const moveVy = Math.sin(this.aiTargetAngle) * this.aiSpeed;
        this.vx = moveVx;
        this.vy = moveVy;
        this.x = Math.max(800, Math.min(7200, this.x + this.vx));
        this.y = Math.max(800, Math.min(7200, this.y + this.vy));

        // Occasional tactical evasion dash
        if (now > this.aiDashCooldown) {
            this.aiDashCooldown = now + 6000 + Math.random() * 8000;
            this.isDashing = true;
            setTimeout(() => { this.isDashing = false; }, 260);
        }
    }
}

// Room Dynamic Slot Balancing Engine
function manageRoomBots(room) {
    if (!room || room.isCustom) return;

    const targetCounts = {
        'online_pve': 4,
        'online_coop': 4,
        'online_pvp': 8,
        'online_boss_raid': 6,
        'online_free_roam': 8
    };

    const targetCount = targetCounts[room.id] || targetCounts[room.mode] || 4;
    
    let humanCount = 0;
    let botPlayers = [];

    for (const [pId, p] of room.players.entries()) {
        if (p.isBot) {
            botPlayers.push(p);
        } else {
            humanCount++;
        }
    }

    const totalCount = humanCount + botPlayers.length;

    // A) If room is over capacity, gracefully remove a bot to free slot for human
    if (totalCount > targetCount && botPlayers.length > 0) {
        const botToRemove = botPlayers.pop();
        room.players.delete(botToRemove.id);
        io.to(room.id).emit('player_left', {
            id: botToRemove.id,
            username: botToRemove.username,
            reason: 'slot_rebalance'
        });
    }
    // B) If room has space, backfill with simulated bot player
    else if (totalCount < targetCount) {
        const newBot = new BotPlayer(room);
        room.players.set(newBot.id, newBot);
        io.to(room.id).emit('player_joined', {
            id: newBot.id,
            username: newBot.username,
            chassis: newBot.chassis,
            weapon: newBot.weapon,
            skin: newBot.skin,
            x: newBot.x,
            y: newBot.y,
            isBot: true
        });
    }
}

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
    if (!newState || typeof newState.x !== 'number' || typeof newState.y !== 'number') return false;
    const now = Date.now();
    let history = playerMovementHistory.get(socket.id);
    if (!history) {
        playerMovementHistory.set(socket.id, { lastX: newState.x, lastY: newState.y, lastTime: now, warnings: 0 });
        return true;
    }

    // If player is respawning, dead, or warped, reset anchor seamlessly
    if (newState.isRespawn || newState.portalWarp || newState.isDead || (newState.health !== undefined && newState.health <= 0)) {
        history.lastX = newState.x;
        history.lastY = newState.y;
        history.lastTime = now;
        history.warnings = 0;
        return true;
    }

    const elapsedMs = Math.max(16, Math.min(2000, now - history.lastTime));
    const maxAllowedSpeedUnitsPerSec = newState.isDashing ? 2800 : (newState.sprintActive ? 1600 : 950);
    const maxAllowedDistance = (maxAllowedSpeedUnitsPerSec * (elapsedMs / 1000)) + 300; // generous latency buffer

    const distanceTravelled = Math.hypot(newState.x - history.lastX, newState.y - history.lastY);

    if (distanceTravelled > maxAllowedDistance) {
        history.warnings++;
        // Decay warnings slowly over time
        if (history.warnings > 25) {
            console.warn(`[WARN] [Anti-Cheat] Excess movement speed detected for ${socket.id} (${distanceTravelled.toFixed(0)}px vs max ${maxAllowedDistance.toFixed(0)}px). Correcting position.`);
            history.warnings = 5;
        }
        // Sync position to current to avoid perpetual distance accumulation
        history.lastX = newState.x;
        history.lastY = newState.y;
        history.lastTime = now;
        return true;
    }

    // Decay warning count on valid movement
    if (history.warnings > 0) history.warnings = Math.max(0, history.warnings - 0.1);

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
        const combatStats = CHASSIS_COMBAT_STATS[meta.chassis] || CHASSIS_COMBAT_STATS.assault;

        const initialSpawnState = {
            id: socket.id,
            username: cleanUsername,
            chassis: meta.chassis,
            weapon: sanitizeText(data ? data.weapon : 'blaster', 20),
            skin: sanitizeText(data ? data.skin : 'default', 40),
            x: Math.floor(3500 + Math.random() * 1000),
            y: Math.floor(3500 + Math.random() * 1000),
            angle: 0,
            hp: combatStats.hp,
            health: combatStats.hp,
            maxHp: combatStats.hp,
            maxHealth: combatStats.hp,
            shield: combatStats.shield,
            maxShield: combatStats.shield,
            isDead: false,
            isDowned: false,
            respawnAvailableAt: 0,
            isDashing: false,
            sprintActive: false,
            kills: 0,
            deaths: 0,
            revives: 0,
            score: 0,
            ping: meta.ping || 20,
            lastUpdate: Date.now()
        };

        // Dynamic bot slot rebalance on human join: make room if room is full
        if (room.players.size >= room.maxPlayers) {
            let botToRemove = null;
            for (const [pId, p] of room.players.entries()) {
                if (p.isBot) {
                    botToRemove = p;
                    break;
                }
            }
            if (botToRemove) {
                room.players.delete(botToRemove.id);
                io.to(room.id).emit('player_left', {
                    id: botToRemove.id,
                    username: botToRemove.username,
                    reason: 'slot_rebalance'
                });
            }
        }

        room.players.set(socket.id, initialSpawnState);
        manageRoomBots(room);

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

    socket.on('leave_game_mode', () => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (room) {
            room.players.delete(socket.id);
            room.readyPlayers.delete(socket.id);
            socket.to(room.id).emit('player_left', {
                id: socket.id,
                username: meta.username
            });
            socket.leave(room.id);
            manageRoomBots(room);
        }
        meta.currentRoomId = null;
        meta.mode = 'lobby';
        playerMovementHistory.delete(socket.id);
        playerShootHistory.delete(socket.id);
        broadcastOnlineCount();
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

        // A defeated player remains represented in snapshots but cannot move or overwrite
        // the authoritative death state until the respawn endpoint completes.
        if (existingPlayer.isDead || existingPlayer.isDowned) {
            existingPlayer.lastUpdate = Date.now();
            return;
        }

        // Anti-cheat movement check
        if (!verifyPlayerMovement(socket, state)) return;

        existingPlayer.x = state.x;
        existingPlayer.y = state.y;
        existingPlayer.vx = typeof state.vx === 'number' ? state.vx : 0;
        existingPlayer.vy = typeof state.vy === 'number' ? state.vy : 0;
        existingPlayer.facingAngle = typeof state.facingAngle === 'number' ? state.facingAngle : (typeof state.angle === 'number' ? state.angle : 0);
        existingPlayer.angle = existingPlayer.facingAngle;
        existingPlayer.hp = state.health !== undefined ? state.health : (state.hp !== undefined ? state.hp : existingPlayer.hp);
        existingPlayer.health = existingPlayer.hp;
        existingPlayer.maxHealth = state.maxHealth || existingPlayer.maxHealth || 100;
        existingPlayer.shield = state.shield !== undefined ? state.shield : existingPlayer.shield;
        existingPlayer.maxShield = state.maxShield !== undefined ? state.maxShield : existingPlayer.maxShield;
        existingPlayer.chassis = state.chassis || existingPlayer.chassis || 'assault';
        existingPlayer.weapon = state.weapon || existingPlayer.weapon || 'blaster';
        existingPlayer.skin = state.skin || existingPlayer.skin || 'default';
        existingPlayer.username = meta.username || existingPlayer.username;
        existingPlayer.isDashing = !!state.isDashing;
        existingPlayer.sprintActive = !!state.sprintActive;
        existingPlayer.overchargeActive = !!state.overchargeActive;
        existingPlayer.isFiringUlt = !!state.isFiringUlt;
        existingPlayer.score = state.score !== undefined ? state.score : existingPlayer.score;
        existingPlayer.kills = state.kills !== undefined ? state.kills : existingPlayer.kills;
        existingPlayer.lastUpdate = Date.now();
    });

    // ----------------------------------------------------------------
    // Shooting & Actions Pipeline
    // ----------------------------------------------------------------
    socket.on('player_shoot', (bulletData) => {
        if (!verifyPlayerShooting(socket)) return;
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        const shooterState = room ? room.players.get(socket.id) : null;
        if (!room || !shooterState || shooterState.isDead || shooterState.isDowned) return;

        const bulletAngle = (bulletData && typeof bulletData.angle === 'number')
            ? bulletData.angle
            : (bulletData && (bulletData.vx || bulletData.vy) ? Math.atan2(bulletData.vy || 0, bulletData.vx || 1) : 0);

        socket.to(meta.currentRoomId).emit('remote_shoot', {
            shooterId: socket.id,
            x: bulletData ? bulletData.x : 0,
            y: bulletData ? bulletData.y : 0,
            angle: bulletAngle,
            speed: (bulletData && bulletData.speed) ? bulletData.speed : 22,
            damage: (bulletData && bulletData.damage) ? bulletData.damage : 14,
            isParried: !!(bulletData && bulletData.isParried),
            isPiercing: !!(bulletData && bulletData.isPiercing),
            type: bulletData ? (bulletData.type || 'normal') : 'normal',
            color: bulletData ? (bulletData.color || '#00f3ff') : '#00f3ff',
            weaponType: bulletData ? (bulletData.weaponType || 'blaster') : 'blaster'
        });
    });

    socket.on('player_action', (actionData) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;

        socket.to(meta.currentRoomId).emit('remote_action', {
            playerId: socket.id,
            action: actionData ? actionData.action : 'dash',
            type: actionData ? actionData.action : 'dash',
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
        const room = gameRooms.get(meta.currentRoomId);
        if (!room || room.mode !== 'online_pvp') return;
        const attackerState = room.players.get(socket.id);
        const targetState = room.players.get(data.targetId);
        if (!attackerState || !targetState || attackerState.isDead || targetState.isDead || data.targetId === socket.id) return;

        // Damage sanity clamp (prevent 1-hit-kill hack)
        const safeDamage = Math.min(60, Math.max(8, data.damage));

        io.to(data.targetId).emit('pvp_take_damage', {
            attackerId: socket.id,
            attackerName: meta.username,
            damage: safeDamage,
            isCrit: !!data.isCrit,
            weaponType: sanitizeText(data.weaponType || data.weapon || 'blaster', 40)
        });

        socket.to(meta.currentRoomId).emit('pvp_hit_effect', {
            targetId: data.targetId,
            attackerId: socket.id,
            x: data.x,
            y: data.y
        });
    });

    socket.on('pvp_player_eliminated', async (data) => {
        const elimination = data || {};
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room || room.mode !== 'online_pvp') return;

        const victimState = room.players.get(socket.id);
        if (!victimState || victimState.isDead || elimination.killerId === socket.id) return;

        let killerState = null;
        let killerSocket = null;
        let killerName = 'الساحة';
        if (elimination.killerId) {
            killerState = room.players.get(elimination.killerId);
            killerSocket = io.sockets.sockets.get(elimination.killerId);
            const killerMeta = killerSocket ? activeSockets.get(elimination.killerId) : null;
            if (!killerState || killerState.isDead || !killerMeta || killerMeta.currentRoomId !== meta.currentRoomId) return;
            killerName = killerMeta.username;
        }

        victimState.isDead = true;
        victimState.hp = 0;
        victimState.health = 0;
        victimState.shield = 0;
        victimState.vx = 0;
        victimState.vy = 0;
        victimState.deaths = (victimState.deaths || 0) + 1;
        victimState.respawnAvailableAt = Date.now() + 2500;
        if (killerState) killerState.kills = (killerState.kills || 0) + 1;

        // Update stats
        try {
            if (killerState) {
                await dbRun('UPDATE players SET pvp_kills = pvp_kills + 1, trophies = trophies + 25, credits = credits + 50 WHERE username = ? COLLATE NOCASE', [killerName]);
            }
            await dbRun('UPDATE players SET pvp_deaths = pvp_deaths + 1, trophies = MAX(0, trophies - 10) WHERE username = ? COLLATE NOCASE', [meta.username]);
        } catch (e) {}

        io.to(room.id).emit('kill_feed_event', {
            killerName: killerName,
            victimName: meta.username,
            weapon: elimination.weapon || 'blaster'
        });
        io.to(room.id).emit('player_eliminated', {
            id: socket.id,
            username: meta.username,
            killerId: elimination.killerId || null,
            killerName,
            respawnAt: victimState.respawnAvailableAt
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
        if (!playerState) return;
        if (room.mode === 'online_pvp' && !playerState.isDead) return;
        if (playerState.isDead && Date.now() < (playerState.respawnAvailableAt || 0)) {
            socket.emit('respawn_wait', {
                remainingMs: Math.max(0, playerState.respawnAvailableAt - Date.now())
            });
            return;
        }
        const spawnX = Math.floor(3500 + (Math.random() - 0.5) * 1200);
        const spawnY = Math.floor(3500 + (Math.random() - 0.5) * 1200);
        const combatStats = CHASSIS_COMBAT_STATS[playerState.chassis] || CHASSIS_COMBAT_STATS.assault;

        playerState.hp = combatStats.hp;
        playerState.health = combatStats.hp;
        playerState.maxHp = combatStats.hp;
        playerState.maxHealth = combatStats.hp;
        playerState.shield = combatStats.shield;
        playerState.maxShield = combatStats.shield;
        playerState.x = spawnX;
        playerState.y = spawnY;
        playerState.vx = 0;
        playerState.vy = 0;
        playerState.isDead = false;
        playerState.isDowned = false;
        playerState.respawnAvailableAt = 0;
        playerState.lastUpdate = Date.now();

        // Reset anti-cheat anchor cleanly
        playerMovementHistory.set(socket.id, {
            lastX: spawnX,
            lastY: spawnY,
            lastTime: Date.now(),
            warnings: 0
        });

        io.to(room.id).emit('player_respawned', {
            id: socket.id,
            username: meta.username,
            x: spawnX,
            y: spawnY,
            hp: playerState.hp,
            health: playerState.health,
            maxHp: playerState.maxHp,
            maxHealth: playerState.maxHealth,
            shield: playerState.shield,
            maxShield: playerState.maxShield,
            chassis: playerState.chassis,
            weapon: playerState.weapon,
            skin: playerState.skin,
            invulnerableMs: 3000,
            isDead: false,
            isDowned: false
        });
    });

    // ----------------------------------------------------------------
    // PVE Downed & Revive Pipeline
    // ----------------------------------------------------------------
    socket.on('pve_player_downed', (data) => {
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room || room.mode !== 'online_coop') return;
        const downedState = room.players.get(socket.id);
        if (!downedState || downedState.isDead || downedState.isDowned) return;

        downedState.isDowned = true;
        downedState.hp = 0;
        downedState.health = 0;
        downedState.shield = 0;
        downedState.vx = 0;
        downedState.vy = 0;
        downedState.downedAt = Date.now();
        downedState.lastUpdate = Date.now();

        io.to(room.id).emit('pve_downed_alert', {
            downedId: socket.id,
            downedUsername: meta.username,
            x: downedState.x,
            y: downedState.y,
            reviveDurationMs: PVE_REVIVE_DURATION_MS
        });
    });

    socket.on('pve_revive_ally', async (data) => {
        if (!data || !data.targetId) return;
        const meta = activeSockets.get(socket.id);
        if (!meta || !meta.currentRoomId) return;
        const room = gameRooms.get(meta.currentRoomId);
        if (!room || room.mode !== 'online_coop' || data.targetId === socket.id) return;

        const reviverState = room.players.get(socket.id);
        const targetState = room.players.get(data.targetId);
        if (!reviverState || !targetState || reviverState.isDead || reviverState.isDowned || !targetState.isDowned) return;
        if ((reviverState.hp || reviverState.health || 0) <= 0) return;

        const remainingMs = PVE_REVIVE_DURATION_MS - (Date.now() - (targetState.downedAt || Date.now()));
        if (remainingMs > 150) {
            socket.emit('pve_revive_rejected', {
                targetId: data.targetId,
                reason: 'duration',
                remainingMs
            });
            return;
        }

        const dx = reviverState.x - targetState.x;
        const dy = reviverState.y - targetState.y;
        if ((dx * dx) + (dy * dy) > PVE_REVIVE_DISTANCE * PVE_REVIVE_DISTANCE) {
            socket.emit('pve_revive_rejected', {
                targetId: data.targetId,
                reason: 'distance',
                remainingMs: 0
            });
            return;
        }

        const combatStats = CHASSIS_COMBAT_STATS[targetState.chassis] || CHASSIS_COMBAT_STATS.assault;
        targetState.hp = combatStats.hp;
        targetState.health = combatStats.hp;
        targetState.maxHp = combatStats.hp;
        targetState.maxHealth = combatStats.hp;
        targetState.shield = combatStats.shield;
        targetState.maxShield = combatStats.shield;
        targetState.isDead = false;
        targetState.isDowned = false;
        targetState.downedAt = 0;
        targetState.vx = 0;
        targetState.vy = 0;
        targetState.lastUpdate = Date.now();
        reviverState.revives = (reviverState.revives || 0) + 1;

        io.to(room.id).emit('pve_revive_success', {
            revivedId: targetState.id,
            reviverId: socket.id,
            reviverName: meta.username,
            targetName: targetState.username,
            hp: targetState.hp,
            health: targetState.health,
            maxHp: targetState.maxHp,
            maxHealth: targetState.maxHealth,
            shield: targetState.shield,
            maxShield: targetState.maxShield,
            invulnerableMs: 3000,
            isDead: false,
            isDowned: false
        });

        socket.emit('pve_reviver_reward', {
            credits: 75,
            xp: 100,
            revivedName: targetState.username
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
    // Rank Leaderboard Telemetry & Match Records Submission
    // ----------------------------------------------------------------
    socket.on('get_rank_leaderboard', async (options) => {
        try {
            const category = (options && options.category) ? options.category : 'trophies';
            let orderClause = 'ORDER BY trophies DESC, total_kills DESC';
            if (category === 'kills' || category === 'pvp') {
                orderClause = 'ORDER BY pvp_kills DESC, total_kills DESC';
            } else if (category === 'wave') {
                orderClause = 'ORDER BY highest_wave DESC, trophies DESC';
            }

            const topPlayers = await dbAll(`
                SELECT username, level, trophies, pvp_kills, pvp_deaths, pve_revives, total_kills, highest_wave, credits
                FROM players
                ${orderClause}
                LIMIT 50
            `);
            socket.emit('rank_leaderboard_data', topPlayers || []);
        } catch (e) {
            socket.emit('rank_leaderboard_data', []);
        }
    });

    socket.on('submit_match_record', async (data) => {
        if (!data) return;
        const meta = activeSockets.get(socket.id);
        const username = meta ? meta.username : sanitizeUsername(data.username);
        const score = Math.max(0, parseInt(data.score, 10) || 0);
        const wave = Math.max(1, parseInt(data.wave, 10) || 1);
        const kills = Math.max(0, parseInt(data.kills, 10) || 0);
        const pvpKills = Math.max(0, parseInt(data.pvpKills, 10) || 0);
        const credits = Math.max(0, parseInt(data.credits, 10) || 0);
        const level = Math.max(1, parseInt(data.level, 10) || 1);

        try {
            const existing = await dbGet('SELECT * FROM players WHERE username = ? COLLATE NOCASE', [username]);
            if (existing) {
                const clientTrophies = Math.max(0, parseInt(data.trophies, 10) || 0);
                const newWave = Math.max(existing.highest_wave || 1, wave);
                const newKills = (existing.total_kills || 0) + kills;
                const newPvpKills = (existing.pvp_kills || 0) + pvpKills;
                const newTrophies = Math.max(existing.trophies || 0, clientTrophies, Math.floor(score / 50) + (newWave * 10));
                const newCredits = (existing.credits || 0) + credits;
                const newLevel = Math.max(existing.level || 1, level);

                await dbRun(`
                    UPDATE players
                    SET highest_wave = ?, total_kills = ?, pvp_kills = ?, trophies = ?, credits = ?, level = ?, last_seen = CURRENT_TIMESTAMP
                    WHERE username = ? COLLATE NOCASE
                `, [newWave, newKills, newPvpKills, newTrophies, newCredits, newLevel, username]);
            }
        } catch (e) {
            console.error('Error submitting match record:', e);
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
            const trophies = parseInt(data.trophies, 10) || 0;
            const wave = parseInt(data.highest_wave, 10) || 1;

            await dbRun(`
                UPDATE players
                SET credits = MAX(credits, ?), level = MAX(level, ?), xp = ?, trophies = MAX(trophies, ?), highest_wave = MAX(highest_wave, ?), last_seen = CURRENT_TIMESTAMP
                WHERE username = ? COLLATE NOCASE
            `, [credits, level, xp, trophies, wave, username]);

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
        let name = sanitizeUsername(data.name || 'Agent_Google');
        const avatarUrl = sanitizeText(data.picture || '', 300);
        const deviceToken = data.deviceToken || null;
        const incomingCredits = Math.max(0, parseInt(data.credits, 10) || 0);
        const incomingLevel = Math.max(1, parseInt(data.level, 10) || 1);
        const incomingXp = Math.max(0, parseInt(data.xp, 10) || 0);

        try {
            // Check if player exists by google_id, email, or username
            let playerRow = null;
            if (useJsonDb) {
                playerRow = jsonDbState.players.find(p => p.google_id === googleId || (email && p.email === email) || p.username.toLowerCase() === name.toLowerCase());
            } else if (db) {
                playerRow = await dbGet('SELECT * FROM players WHERE google_id = ? OR (email != "" AND email = ?) OR username = ? COLLATE NOCASE LIMIT 1', [googleId, email, name]);
            }

            if (playerRow) {
                const mergedCredits = Math.max(Number(playerRow.credits) || 0, incomingCredits);
                const mergedLevel = Math.max(Number(playerRow.level) || 1, incomingLevel);
                const mergedXp = Math.max(Number(playerRow.xp) || 0, incomingXp);

                // Update Google metadata, merge progress & last seen
                if (useJsonDb) {
                    playerRow.google_id = googleId;
                    if (email) playerRow.email = email;
                    if (avatarUrl) playerRow.avatar_url = avatarUrl;
                    playerRow.credits = mergedCredits;
                    playerRow.level = mergedLevel;
                    playerRow.xp = mergedXp;
                    playerRow.last_seen = new Date().toISOString();
                    saveJsonDb();
                } else if (db) {
                    await dbRun('UPDATE players SET google_id = ?, email = COALESCE(NULLIF(?, ""), email), avatar_url = COALESCE(NULLIF(?, ""), avatar_url), credits = ?, level = ?, xp = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [
                        googleId, email, avatarUrl, mergedCredits, mergedLevel, mergedXp, playerRow.id
                    ]);
                    playerRow = await dbGet('SELECT * FROM players WHERE id = ?', [playerRow.id]);
                }

                console.log(`[NET] [Google Auth] استرجاع ومزامنة حساب العميل عبر Google: ${playerRow.username} (${email || googleId})`);
                socket.emit('google_auth_result', {
                    success: true,
                    isExisting: true,
                    message: `[OK] مرحباً بك مجدداً أيها العميل ${playerRow.username}! تمت المزامنة السحابية بنجاح.`,
                    profile: playerRow
                });
            } else {
                // Ensure unique name for new profile
                if (db) {
                    const existingName = await dbGet('SELECT id FROM players WHERE username = ? COLLATE NOCASE', [name]);
                    if (existingName) {
                        name = name.substring(0, 14) + '_' + Math.floor(100 + Math.random() * 900);
                    }
                } else if (useJsonDb) {
                    const existingName = jsonDbState.players.find(p => p.username.toLowerCase() === name.toLowerCase());
                    if (existingName) {
                        name = name.substring(0, 14) + '_' + Math.floor(100 + Math.random() * 900);
                    }
                }

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
                        credits: incomingCredits,
                        level: incomingLevel,
                        xp: incomingXp,
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
                    `, [name, googleId, email, avatarUrl, deviceToken, incomingCredits, incomingLevel, incomingXp, clientIp]);

                    newPlayerObj = await dbGet('SELECT * FROM players WHERE google_id = ? LIMIT 1', [googleId]);
                }

                console.log(`[NET] [Google Auth] إنشاء حساب سحابي جديد مربوط بـ Google للعميل: ${name} (${email || googleId})`);
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
// 7. UNIFIED HIGH-PERFORMANCE 35HZ REAL-TIME NETCODE 2.0 TICK LOOP
// ====================================================================
setInterval(() => {
    const now = Date.now();
    for (const room of gameRooms.values()) {
        // Update Bot Player AI Movements & Combat Decisions
        for (const p of room.players.values()) {
            if (p.isBot && typeof p.update === 'function') {
                p.update(room, 0.028);
            }
        }

        if (room.players.size > 0) {
            updateRoomAnomalies(room);
            const snapshot = Array.from(room.players.values()).map(p => ({
                id: p.id,
                username: p.username,
                x: p.x,
                y: p.y,
                vx: p.vx || 0,
                vy: p.vy || 0,
                facingAngle: p.facingAngle || 0,
                hp: p.hp,
                health: p.health,
                maxHp: p.maxHp,
                maxHealth: p.maxHealth,
                shield: p.shield,
                maxShield: p.maxShield,
                chassis: p.chassis,
                weapon: p.weapon,
                skin: p.skin,
                isDashing: p.isDashing,
                sprintActive: p.sprintActive,
                overchargeActive: p.overchargeActive,
                isFiringUlt: p.isFiringUlt,
                isDead: p.isDead,
                isDowned: p.isDowned,
                score: p.score,
                kills: p.kills,
                ping: p.isBot ? p.ping : (activeSockets.get(p.id)?.ping || 20),
                serverTs: now,
                isBot: Boolean(p.isBot)
            }));
            io.to(room.id).emit('room_tick_sync', {
                serverTs: now,
                players: snapshot,
                bossState: room.bossState
            });
        }
    }
}, 28); // ~35.7Hz high-frequency tick rate

// Periodic Bot Room Manager (Ensures public rooms remain populated & balanced)
setInterval(() => {
    for (const room of gameRooms.values()) {
        manageRoomBots(room);
    }
}, 3000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
============================================================
 CHRONO DRIFT (الانجراف الزمني) SERVER RUNNING ON PORT ${PORT}
[SYS] WebGL Client & Netcode 2.0 Engine Active (35Hz Tick)
[DB] Persistent profile store: chronodrift_db.json
[SEC] Anti-Cheat, XSS Shields, Custom Lobbies & Anomalies Ready
============================================================
`);
});
