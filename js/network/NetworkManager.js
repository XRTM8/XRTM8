/**
 * NetworkManager.js
 * Hybrid Multiplayer Manager:
 * 1. Offline Mode with Smart AI Bots (zero latency, works anytime).
 * 2. Peer-to-Peer (P2P) WebRTC DataChannels using PeerJS.
 * Allows friends to join via a simple Room Code with no server deployment required.
 */

class NetworkManager {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.connections = []; // For Host: list of client DataConnection objects
        this.hostConn = null;  // For Client: connection to Host
        this.isHost = true;
        this.isOnline = false;
        this.roomCode = null;
        this.myPeerId = null;
        this.ping = 0;

        this.syncInterval = null;
        this.pingInterval = null;
        this.lastSyncTime = 0;
    }

    /**
     * Start an offline match with bots
     */
    startOfflineMatch(botCount = 3) {
        this.isOnline = false;
        this.isHost = true;
        this.game.setupMatch(this.isHost, botCount);
    }

    /**
     * Host a new P2P Online Room
     */
    hostRoom(playerName, onRoomReady, onError) {
        if (typeof Peer === 'undefined') {
            onError('PeerJS library not loaded. Starting in Offline Bot mode.');
            this.startOfflineMatch();
            return;
        }

        // Generate a clean 4-character room code
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const fullPeerId = 'neon-clash-' + code.toLowerCase();

        this.peer = new Peer(fullPeerId, {
            debug: 1,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            this.isHost = true;
            this.isOnline = true;
            this.roomCode = code;
            this.myPeerId = id;

            this.game.setupMatch(true, 0); // Start match as host
            onRoomReady(code);
            this.startHostSync();
        });

        this.peer.on('connection', (conn) => {
            this.handleIncomingClient(conn);
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'unavailable-id') {
                // Retry with another code
                this.hostRoom(playerName, onRoomReady, onError);
            } else {
                onError(err.message || 'Connection error');
            }
        });
    }

    /**
     * Join an existing P2P Room by Code
     */
    joinRoom(roomCode, playerName, isSpectator = false, onConnected, onError) {
        if (typeof Peer === 'undefined') {
            if (onError) onError('PeerJS library not loaded.');
            return;
        }

        const targetPeerId = 'neon-clash-' + roomCode.trim().toLowerCase();
        this.peer = new Peer({
            debug: 1,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            this.myPeerId = id;
            const conn = this.peer.connect(targetPeerId, { reliable: false });

            conn.on('open', () => {
                this.isHost = false;
                this.isOnline = true;
                this.hostConn = conn;
                this.roomCode = roomCode.toUpperCase();

                // Send join handshake with spectator flag
                conn.send({
                    type: 'JOIN_REQUEST',
                    playerId: this.myPeerId,
                    playerName: playerName,
                    isSpectator: !!isSpectator
                });

                this.setupClientReceiver(conn);
                if (onConnected) onConnected();
            });

            conn.on('error', (err) => {
                if (onError) onError('Failed to connect to room: ' + roomCode);
            });
        });

        this.peer.on('error', (err) => {
            if (onError) onError(err.message || 'Network error');
        });
    }

    handleIncomingClient(conn) {
        conn.on('open', () => {
            this.connections.push(conn);
        });

        conn.on('data', (data) => {
            this.handleMessageFromClient(conn, data);
        });

        conn.on('close', () => {
            this.connections = this.connections.filter(c => c !== conn);
            if (conn.peerPlayerId && !conn.isSpectator) {
                this.game.removeRemotePlayer(conn.peerPlayerId);
            }
        });
    }

    setupClientReceiver(conn) {
        conn.on('data', (data) => {
            this.handleMessageFromHost(data);
        });

        // Periodic ping to host
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            if (this.isOnline && !this.isHost && this.hostConn && this.hostConn.open) {
                this.hostConn.send({ type: 'PING', time: performance.now() });
            }
        }, 1200);

        conn.on('close', () => {
            if (this.pingInterval) clearInterval(this.pingInterval);
            if (this.game && this.game.handleHostDisconnect) {
                this.game.handleHostDisconnect();
            } else {
                this.isOnline = false;
                if (this.game && this.game.showToast) {
                    this.game.showToast('DISCONNECTED FROM HOST');
                }
            }
        });
    }

    buildWorldStatePacket() {
        return {
            type: 'WORLD_STATE',
            time: performance.now(),
            players: this.game.players.map(p => ({
                id: p.id,
                name: p.name,
                x: Math.round(p.x),
                y: Math.round(p.y),
                vx: Math.round(p.vx),
                vy: Math.round(p.vy),
                angle: p.angle,
                health: p.health,
                shield: p.shield,
                isDashing: p.isDashing,
                isSliding: !!p.isSliding,
                isParrying: p.isParrying,
                isDead: p.isDead,
                phaseTimer: p.phaseTimer || 0,
                overdriveTimer: p.overdriveTimer || 0,
                spawnProtectionTimer: p.spawnProtectionTimer || 0,
                kills: p.kills,
                deaths: p.deaths,
                team: p.team,
                selectedWeaponIndex: p.selectedWeaponIndex,
                isReloading: p.isReloading,
                ammo: (p.ammo && p.ammo[p.selectedWeaponIndex] !== undefined) ? p.ammo[p.selectedWeaponIndex] : 10,
                reloadDuration: p.reloadDuration,
                reloadTimer: p.reloadTimer,
                title: p.title,
                baseColor: p.baseColor,
                gunGameTier: (p.gunGameTier !== undefined) ? p.gunGameTier : 0
            })),
            powerUps: (this.game.powerUps || []).map(pu => ({
                id: pu.id,
                type: pu.type,
                x: pu.x,
                y: pu.y,
                isActive: pu.isActive,
                respawnTimer: Math.round(pu.respawnTimer || 0)
            })),
            scores: (this.game.gameMode && this.game.gameMode.teamScores) || { blue: 0, red: 0 },
            winner: this.game.gameMode ? this.game.gameMode.winner : null,
            mode: this.game.gameMode ? this.game.gameMode.mode : 'FFA',
            zone: (this.game.gameMode && this.game.gameMode.mode === 'ZONE_CONTROL') ? this.game.gameMode.zone : null
        };
    }

    /**
     * Host sends periodic state updates (20 times per second)
     */
    startHostSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (!this.isOnline || !this.isHost || this.connections.length === 0) return;
            const packet = this.buildWorldStatePacket();
            this.broadcastToClients(packet);
        }, 50); // 20 Hz sync
    }

    broadcast(data) {
        this.broadcastToClients(data);
    }

    broadcastToClients(data) {
        for (let i = 0; i < this.connections.length; i++) {
            if (this.connections[i].open) {
                this.connections[i].send(data);
            }
        }
    }

    sendToHost(data) {
        if (this.hostConn && this.hostConn.open) {
            this.hostConn.send(data);
        }
    }

    broadcastRematch() {
        if (this.isHost) {
            this.broadcastToClients({ type: 'REMATCH_START' });
        }
    }

    handleMessageFromClient(conn, data) {
        if (data.type === 'PING') {
            conn.send({ type: 'PONG', time: data.time });
            return;
        }

        if (data.type === 'JOIN_REQUEST') {
            conn.peerPlayerId = data.playerId;
            conn.isSpectator = !!data.isSpectator;

            if (!data.isSpectator) {
                this.game.addRemotePlayer(data.playerId, data.playerName);
            } else {
                this.game.renderer.showAnnouncement(`${data.playerName || 'SPECTATOR'} JOINED AS SPECTATOR`, '#ffb703');
            }

            // Send welcome confirmation with arena layout, custom rules, map ID, spectator flag
            conn.send({
                type: 'JOIN_ACCEPTED',
                yourId: data.playerId,
                arenaSize: this.game.arenaSize,
                obstacles: this.game.obstacles,
                mode: this.game.gameMode.mode,
                mapId: this.game.mapManager ? this.game.mapManager.currentMap.id : 'core',
                customRules: this.game.gameMode.customRules,
                isSpectator: !!data.isSpectator
            });
        } else if (data.type === 'CLIENT_INPUT') {
            if (conn.isSpectator) return;
            const player = this.game.players.find(p => p.id === data.playerId);
            if (player) {
                player.applyMovement(data.moveX, data.moveY, 1 / 60);
                player.angle = data.angle;

                // Phase 18: Enforce server-side weapon selection rules against client overrides
                const mutator = this.game.gameMode && this.game.gameMode.customRules && this.game.gameMode.customRules.weaponMutator;
                const isGunGame = this.game.gameMode && this.game.gameMode.mode === 'GUN_GAME';
                if (!isGunGame && (!mutator || mutator === 'all')) {
                    if (data.selectedWeaponIndex !== undefined && data.selectedWeaponIndex >= 0 && data.selectedWeaponIndex < 5) {
                        player.selectedWeaponIndex = data.selectedWeaponIndex;
                    }
                }

                if (data.triggerDash) player.attemptDash(data.moveX, data.moveY);
                if (data.triggerSlide) player.attemptSlide(data.moveX, data.moveY);
                if (data.triggerParry) player.attemptParry();
                if (data.triggerReload) player.attemptReload();
                if (data.triggerFire) {
                    const spawned = [];
                    player.attemptFire((b) => {
                        b.sentTime = data.sentTime || performance.now();
                        this.game.bullets.push(b);
                        spawned.push(b.serialize ? b.serialize() : b);
                    });
                    if (spawned.length > 0) {
                        this.broadcastToClients({
                            type: 'SPAWN_BULLETS',
                            bullets: spawned
                        });
                    }
                }
            }
        } else if (data.type === 'TACTICAL_PING') {
            if (this.game && this.game.pings && data.ping) {
                this.game.pings.push(data.ping);
                if (this.game.pings.length > 8) this.game.pings.shift();
                if (window.AudioEngine && window.AudioEngine.playPing) {
                    window.AudioEngine.playPing(data.ping.type, data.ping.x, data.ping.y);
                }
                this.broadcast(data);
            }
        } else if (data.type === 'POWERUP_COLLECT') {
            const pu = this.game.powerUps ? this.game.powerUps.find(p => p.id === data.powerUpId) : null;
            const pl = this.game.players ? this.game.players.find(p => p.id === data.playerId) : null;
            if (pu && pu.isActive && pl && !pl.isDead) {
                // Phase 20: Server-side distance validation to enforce host authority
                const maxPickupDist = (pu.radius || 20) + (pl.radius || 18) + 35;
                const distSq = (pl.x - pu.x) ** 2 + (pl.y - pu.y) ** 2;
                if (distSq <= maxPickupDist * maxPickupDist) {
                    pl.applyPowerUp(pu.type);
                    pu.isActive = false;
                    pu.respawnTimer = pu.respawnDelay || 28.0;
                    this.broadcastToClients({
                        type: 'POWERUP_CONSUMED',
                        powerUpId: pu.id,
                        playerId: pl.id
                    });
                }
            }
        }
    }

    handleMessageFromHost(data) {
        if (data.type === 'PONG') {
            this.ping = Math.max(1, Math.round(performance.now() - data.time));
            return;
        }

        if (data.type === 'REMATCH_START') {
            this.game.applyRematch();
            return;
        }

        if (data.type === 'JOIN_ACCEPTED') {
            this.game.arenaSize = data.arenaSize;
            this.game.obstacles = data.obstacles;
            if (data.mode) this.game.gameMode.setMode(data.mode);
            if (data.mapId && this.game.mapManager) {
                this.game.mapManager.setMap(data.mapId);
                this.game.initArena();
            }
            if (data.customRules) {
                this.game.gameMode.setCustomRules(data.customRules);
            }
            if (data.isSpectator) {
                this.game.enableSpectatorMode();
            } else if (this.game.localPlayer) {
                this.game.localPlayer.id = data.yourId;
                this.game.applyCustomRulesToPlayers();
            }
        } else if (data.type === 'WORLD_STATE') {
            this.game.applyWorldState(data);
        } else if (data.type === 'SPAWN_BULLETS') {
            if (this.game && this.game.bullets && Array.isArray(data.bullets)) {
                for (let i = 0; i < data.bullets.length; i++) {
                    const bData = data.bullets[i];
                    if (this.game.localPlayer && bData.ownerId === this.game.localPlayer.id) {
                        continue;
                    }
                    if (typeof Bullet !== 'undefined') {
                        const bullet = new Bullet(bData);
                        this.game.bullets.push(bullet);
                    }
                }
            }
        } else if (data.type === 'POWERUP_CONSUMED') {
            const pu = this.game.powerUps ? this.game.powerUps.find(p => p.id === data.powerUpId) : null;
            const pl = this.game.players ? this.game.players.find(p => p.id === data.playerId) : null;
            if (pu) {
                pu.isActive = false;
                pu.respawnTimer = pu.respawnDelay !== undefined ? pu.respawnDelay : (pu.respawnDuration || 28.0);
                if (pl && pl.applyPowerUp) {
                    pl.applyPowerUp(pu.type);
                }
                if (this.game.renderer) {
                    this.game.renderer.spawnParticles(pu.x, pu.y, pu.color, 24, 340);
                    if (pl) {
                        this.game.renderer.spawnFloatingText(pl.x, pl.y - 25, pu.name, pu.color, true);
                    }
                }
            }
        } else if (data.type === 'TACTICAL_PING') {
            if (this.game && this.game.pings && data.ping) {
                this.game.pings.push(data.ping);
                if (this.game.pings.length > 8) this.game.pings.shift();
                if (window.AudioEngine && window.AudioEngine.playPing) {
                    window.AudioEngine.playPing(data.ping.type, data.ping.x, data.ping.y);
                }
                if (this.game.renderer && this.game.renderer.showAnnouncement) {
                    this.game.renderer.showAnnouncement(`[PING] ${data.ping.playerName}: ${data.ping.label}`, data.ping.color);
                }
            }
        }
    }
}

window.NetworkManager = NetworkManager;
