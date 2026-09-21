/**
 * main.js
 * Main Game Coordinator and High-Framerate Delta-Time Loop.
 * Handles competitive arena layouts, hit detection, particle reactions, and HUD updates.
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.input = new InputManager();
        this.network = new NetworkManager(this);
        this.networkManager = this.network;
        this.gameMode = new GameModeManager('FFA', 15);

        this.mapManager = window.MapManager;
        this.arenaSize = this.mapManager ? this.mapManager.currentMap.size : 2200;
        this.obstacles = [];
        this.players = [];
        this.bots = [];
        this.bullets = [];
        this.powerUps = [];
        this.localPlayer = null;
        this.hitstopTimer = 0;
        this.botDifficulty = 'veteran';

        // Phase 5: Competitive Supernova Suite
        this.countdownTimer = 0;
        this.lastCountdownInteger = null;
        this.supernovas = [];
        this.floorDecals = [];
        this.wallDecals = [];

        // Phase 6: Tactical Ping System
        this.pings = [];

        // Phase 11: Netcode Lag Compensation (Historical Hitbox Rewind Buffer)
        this.hitboxHistory = [];

        // Spectator Mode (Phase 4)
        this.isSpectator = false;
        this.spectatorTargetIndex = 0;
        this.spectatorTargetId = null;
        this.isPaused = false;

        this.lastTime = performance.now();
        this.fps = 60;
        this.fpsCounterTimer = 0;
        this.frameCount = 0;

        this.initArena();
        this.ui = new UIManager(this);
        this.ui.init();
        this.startLoop();
    }

    initArena() {
        if (!this.mapManager) return;
        this.arenaSize = this.mapManager.currentMap.size;
        this.obstacles = this.mapManager.currentMap.createObstacles(this.arenaSize);
    }

    setupMatch(isHost = true, botCount = 3, asSpectator = false) {
        this.isSpectator = asSpectator;
        this.isPaused = false;
        this.spectatorTargetIndex = 0;
        this.spectatorTargetId = null;
        this.players = [];
        this.bots = [];
        this.bullets = [];
        this.shellCasings = [];
        this.powerUps = [];
        this.supernovas = [];
        this.floorDecals = [];
        this.wallDecals = [];
        this.pings = [];
        this.countdownTimer = 3.5;
        this.lastCountdownInteger = 4;
        this.hasRecordedMatch = false;
        this.combatMusicTimer = 0;

        // Start dynamic procedural music
        if (window.AudioEngine && window.AudioEngine.startMusic) {
            window.AudioEngine.startMusic();
        }

        // Apply Selected Map
        const selectedMapId = document.getElementById('mapSelect')?.value || 'core';
        if (this.mapManager) this.mapManager.setMap(selectedMapId);
        this.initArena();

        // Spawn Timed Arena Power-Ups
        const puSpawns = (this.mapManager && this.mapManager.currentMap.powerUpSpawns) || [];
        for (let i = 0; i < puSpawns.length; i++) {
            const s = puSpawns[i];
            this.powerUps.push(new PowerUp(`pu_${i}`, s.type, s.x, s.y));
        }

        // Apply Selected Game Mode
        const selectedMode = document.querySelector('input[name="gameMode"]:checked')?.value || 'FFA';
        this.gameMode.setMode(selectedMode);

        // Apply Custom Rules & Mutators (Phase 4)
        const speedMultiplier = parseFloat(document.getElementById('ruleSpeedSelect')?.value || '1.0');
        const weaponMutator = document.getElementById('ruleMutatorSelect')?.value || 'all';
        this.gameMode.setCustomRules({ speedMultiplier, weaponMutator });

        // Read Bot Difficulty
        this.botDifficulty = document.getElementById('botDifficultySelect')?.value || 'veteran';

        const playerName = document.getElementById('playerNameInput')?.value.trim() || 'Operator';
        if (window.ProgressionManager) window.ProgressionManager.setName(playerName);

        const mapSpawns = (this.mapManager && this.mapManager.currentMap.spawns) || [{ x: 0, y: 350 }];

        // Spawn Local Player if not in spectator mode
        if (!this.isSpectator) {
            const localTeam = (this.gameMode.mode === 'TDM' || this.gameMode.mode === 'ZONE_CONTROL') ? 'blue' : null;
            this.localPlayer = new Player('local', playerName, true, localTeam);
            this.localPlayer.spawn(mapSpawns[0].x, mapSpawns[0].y);
            if (this.gameMode.mode === 'GUN_GAME') {
                this.localPlayer.gunGameTier = 0;
                this.localPlayer.selectedWeaponIndex = 0;
                this.input.selectedWeaponIndex = 0;
            }
            this.players.push(this.localPlayer);
        } else {
            this.localPlayer = null;
            this.enableSpectatorMode();
        }

        // Spawn Tactical Bots if in Solo/Host mode
        const effectiveBots = (this.isSpectator && botCount === 0) ? 4 : botCount;
        if (isHost && effectiveBots > 0) {
            const botNames = ['Viper', 'Ghost', 'Spectre', 'Ares', 'Cipher', 'Nova'];

            for (let i = 0; i < effectiveBots; i++) {
                const name = botNames[i % botNames.length];
                const team = (this.gameMode.mode === 'TDM' || this.gameMode.mode === 'ZONE_CONTROL') ? (i % 2 === 0 ? 'red' : 'blue') : null;
                const botPlayer = new Player('bot_' + i, name, false, team);
                const spawn = mapSpawns[(i + (this.isSpectator ? 0 : 1)) % mapSpawns.length];
                botPlayer.spawn(spawn.x, spawn.y);

                if (this.gameMode.mode === 'GUN_GAME') {
                    botPlayer.gunGameTier = 0;
                    botPlayer.selectedWeaponIndex = 0;
                }

                this.players.push(botPlayer);
                this.bots.push(new BotController(botPlayer, this, this.botDifficulty));
            }
        }

        // Enforce mutators and rules
        this.applyCustomRulesToPlayers();

        // Hide Lobby Modal
        const lobbyModal = document.getElementById('lobbyModal');
        if (lobbyModal) lobbyModal.classList.add('hidden');

        // Start Procedural Ambient Cyberpunk Music (Phase 1 Juice)
        if (window.AudioEngine) window.AudioEngine.startAmbientMusic();
    }

    applyCustomRulesToPlayers() {
        const rules = this.gameMode.customRules;
        if (!rules) return;

        for (let p of this.players) {
            p.speedMultiplier = rules.speedMultiplier || 1.0;
            if (rules.weaponMutator === 'instagib') {
                p.isInstagib = true;
                p.maxHealth = 1;
                p.health = 1;
                p.maxShield = 0;
                p.shield = 0;
                p.selectedWeaponIndex = 2; // Apex Sniper
            } else if (rules.weaponMutator === 'snipers_only') {
                p.selectedWeaponIndex = 2;
            } else if (rules.weaponMutator === 'shotguns_only') {
                p.selectedWeaponIndex = 1;
            }
        }

        if (this.localPlayer && rules.weaponMutator !== 'all') {
            const lockedIdx = (rules.weaponMutator === 'snipers_only' || rules.weaponMutator === 'instagib') ? 2 : 1;
            this.localPlayer.selectedWeaponIndex = lockedIdx;
            this.input.selectedWeaponIndex = lockedIdx;
        }
    }

    enableSpectatorMode() {
        this.isSpectator = true;
        if (this.localPlayer) {
            const idx = this.players.indexOf(this.localPlayer);
            if (idx !== -1) this.players.splice(idx, 1);
            this.localPlayer = null;
        }

        const vitals = document.querySelector('.vitals-container');
        if (vitals) vitals.style.display = 'none';
        const wepBar = document.querySelector('.weapons-selector-bar');
        if (wepBar) wepBar.style.display = 'none';
        const mobileLayer = document.querySelector('.mobile-controls-layer');
        if (mobileLayer) mobileLayer.style.display = 'none';

        const specOverlay = document.getElementById('spectatorOverlay');
        if (specOverlay) specOverlay.classList.remove('hidden');

        const lobby = document.getElementById('lobbyModal');
        if (lobby) lobby.classList.add('hidden');

        this.renderer.showAnnouncement('SPECTATOR MODE ACTIVE', '#ffb703');
    }

    getSpectatorTarget() {
        if (!this.players || this.players.length === 0) return null;
        const candidates = this.players.filter(p => p !== this.localPlayer);
        if (candidates.length === 0) {
            return this.localPlayer || null;
        }

        const alive = candidates.filter(p => !p.isDead);
        const pool = alive.length > 0 ? alive : candidates;

        if (this.spectatorTargetId) {
            const current = pool.find(p => p.id === this.spectatorTargetId);
            if (current && (!current.isDead || alive.length === 0)) {
                return current;
            }
        }

        const safeIdx = ((this.spectatorTargetIndex % pool.length) + pool.length) % pool.length;
        const target = pool[safeIdx];
        if (target) {
            this.spectatorTargetId = target.id;
        }
        return target;
    }

    cycleSpectatorTarget(dir = 1) {
        const candidates = this.players.filter(p => p !== this.localPlayer);
        if (candidates.length === 0) return;

        const alive = candidates.filter(p => !p.isDead);
        const pool = alive.length > 0 ? alive : candidates;

        let curIdx = pool.findIndex(p => p.id === this.spectatorTargetId);
        if (curIdx === -1) curIdx = 0;
        const newIdx = ((curIdx + dir) % pool.length + pool.length) % pool.length;
        const target = pool[newIdx];
        if (target) {
            this.spectatorTargetId = target.id;
            this.spectatorTargetIndex = newIdx;
            if (window.AudioEngine) window.AudioEngine.playHitMarker(false);
            this.renderer.showAnnouncement(`SPECTATING: ${target.name}`, target.baseColor || '#ffb703');
        }
    }

    addRemotePlayer(id, name) {
        if (this.players.find(p => p.id === id)) return;
        const team = this.gameMode.mode === 'TDM' ? (this.players.length % 2 === 0 ? 'red' : 'blue') : null;
        const remote = new Player(id, name, false, team);
        remote.spawn(300, -300);
        this.players.push(remote);

        // Apply active custom match rules to new player
        this.applyCustomRulesToPlayers();

        this.renderer.showAnnouncement(`${name} JOINED THE ARENA!`, remote.baseColor);
    }

    removeRemotePlayer(id) {
        if (this.spectatorTargetId === id) {
            this.spectatorTargetId = null;
        }
        const index = this.players.findIndex(p => p.id === id);
        if (index !== -1) {
            const name = this.players[index].name;
            this.players.splice(index, 1);
            this.renderer.showAnnouncement(`${name} LEFT`, '#ef4444');
        }
    }

    applyWorldState(packet) {
        if (packet.players && Array.isArray(packet.players)) {
            const packetPlayerIds = new Set(packet.players.map(p => p.id));
            for (let i = this.players.length - 1; i >= 0; i--) {
                const pl = this.players[i];
                if (!pl.isLocal && !packetPlayerIds.has(pl.id)) {
                    const leftName = pl.name || 'OPERATIVE';
                    this.players.splice(i, 1);
                    if (this.renderer && this.renderer.showAnnouncement) {
                        this.renderer.showAnnouncement(`${leftName} LEFT`, '#ef4444');
                    }
                }
            }
        }

        for (let remoteData of packet.players) {
            if (this.localPlayer && remoteData.id === this.localPlayer.id) {
                // Confirm health and score from authoritative host
                this.localPlayer.health = remoteData.health;
                this.localPlayer.shield = remoteData.shield;
                this.localPlayer.kills = remoteData.kills;
                this.localPlayer.deaths = remoteData.deaths;
                this.localPlayer.isDead = remoteData.isDead;
                if (remoteData.gunGameTier !== undefined) {
                    this.localPlayer.gunGameTier = remoteData.gunGameTier;
                    if (this.gameMode && this.gameMode.mode === 'GUN_GAME') {
                        const targetWeapon = Math.min(4, Math.max(0, remoteData.gunGameTier));
                        if (this.localPlayer.selectedWeaponIndex !== targetWeapon) {
                            this.localPlayer.selectedWeaponIndex = targetWeapon;
                            if (this.input) this.input.selectedWeaponIndex = targetWeapon;
                        }
                    }
                }
                continue;
            }

            let player = this.players.find(p => p.id === remoteData.id);
            if (!player) {
                player = new Player(remoteData.id, remoteData.name, false, remoteData.team);
                this.players.push(player);
            }

            // Predictive velocity dead-reckoning extrapolation (smooth 240Hz tracking)
            const predictedX = remoteData.x + (remoteData.vx || 0) * 0.05;
            const predictedY = remoteData.y + (remoteData.vy || 0) * 0.05;
            const errDist = Math.hypot(remoteData.x - player.x, remoteData.y - player.y);
            if (errDist > 300) {
                player.x = remoteData.x;
                player.y = remoteData.y;
            } else {
                player.x += (predictedX - player.x) * 0.45;
                player.y += (predictedY - player.y) * 0.45;
            }
            player.vx = remoteData.vx || 0;
            player.vy = remoteData.vy || 0;
            player.angle = remoteData.angle;
            player.health = remoteData.health;
            player.shield = remoteData.shield;
            player.isDashing = remoteData.isDashing;
            player.isSliding = !!remoteData.isSliding;
            player.isParrying = remoteData.isParrying;
            player.isDead = remoteData.isDead;
            player.phaseTimer = remoteData.phaseTimer || 0;
            player.overdriveTimer = remoteData.overdriveTimer || 0;
            player.spawnProtectionTimer = remoteData.spawnProtectionTimer || 0;
            player.kills = remoteData.kills;
            if (remoteData.gunGameTier !== undefined) player.gunGameTier = remoteData.gunGameTier;
            player.selectedWeaponIndex = remoteData.selectedWeaponIndex !== undefined ? remoteData.selectedWeaponIndex : player.selectedWeaponIndex;
            player.isReloading = !!remoteData.isReloading;
            player.reloadDuration = remoteData.reloadDuration || 0;
            player.reloadTimer = remoteData.reloadTimer || 0;
            if (remoteData.ammo !== undefined && player.ammo) {
                player.ammo[player.selectedWeaponIndex] = remoteData.ammo;
            }
        }

        // Phase 12: Sync Power-Ups from authoritative host
        if (packet.powerUps && this.powerUps) {
            for (let rpu of packet.powerUps) {
                const localPu = this.powerUps.find(p => p.id === rpu.id);
                if (localPu) {
                    localPu.isActive = rpu.isActive;
                    localPu.respawnTimer = rpu.respawnTimer || 0;
                }
            }
        }

        if (packet.scores) {
            this.gameMode.teamScores = packet.scores;
        }
        if (packet.winner && !this.gameMode.isMatchOver) {
            this.gameMode.finishMatch(packet.winner);
        }
    }

    startLoop() {
        const loop = (currentTime) => {
            // Calculate Delta-Time in seconds with startup and tab suspension protection
            const rawDt = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0.016;
            const dt = Math.max(0.001, Math.min(0.05, isNaN(rawDt) ? 0.016 : rawDt));
            this.lastTime = currentTime;

            // Measure FPS accurately
            this.frameCount++;
            this.fpsCounterTimer += dt;
            if (this.fpsCounterTimer >= 0.5) {
                this.fps = Math.round(this.frameCount / this.fpsCounterTimer);
                this.frameCount = 0;
                this.fpsCounterTimer = 0;
                const fpsEl = document.getElementById('fpsCounter');
                if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;
            }

            const effectiveDt = (this.gameMode && this.gameMode.victorySlowTimer > 0) ? (dt * (this.gameMode.timeScale || 0.35)) : dt;
            if (!this.isPaused) {
                this.update(effectiveDt);
            }
            this.renderer.render(this, dt);

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    triggerHitstop(duration = 0.04) {
        this.hitstopTimer = duration;
    }

    update(dt) {
        // --- 0. Micro-Hitstop (Kinetic Freeze Frame) ---
        if (this.hitstopTimer > 0) {
            this.hitstopTimer -= dt;
            this.renderer.update(dt);
            this.updateHUD();
            return;
        }

        // --- 0.1 Update Floor Decals & Supernovas (Phase 5 & 24) ---
        for (let i = this.floorDecals.length - 1; i >= 0; i--) {
            const d = this.floorDecals[i];
            d.life -= dt;
            d.alpha = Math.max(0, d.life / d.maxLife);
            if (d.life <= 0) {
                this.floorDecals.splice(i, 1);
            }
        }

        if (this.wallDecals) {
            for (let i = this.wallDecals.length - 1; i >= 0; i--) {
                const wd = this.wallDecals[i];
                wd.life -= dt;
                wd.alpha = Math.max(0, wd.life / wd.maxLife);
                if (wd.life <= 0) {
                    this.wallDecals.splice(i, 1);
                }
            }
        }

        for (let i = this.supernovas.length - 1; i >= 0; i--) {
            const s = this.supernovas[i];
            s.timer += dt;
            if (s.timer >= s.duration) {
                this.supernovas.splice(i, 1);
            }
        }

        // --- 0.15 Update Tactical Pings Decay (Phase 6) ---
        for (let i = this.pings.length - 1; i >= 0; i--) {
            this.pings[i].life -= dt;
            if (this.pings[i].life <= 0) {
                this.pings.splice(i, 1);
            }
        }

        // --- 0.2 Esports Match Start Countdown (Phase 5) ---
        if (this.countdownTimer > 0) {
            this.countdownTimer -= dt;
            const currentInt = Math.ceil(this.countdownTimer);
            if (currentInt > 0 && currentInt < this.lastCountdownInteger && currentInt <= 3) {
                this.lastCountdownInteger = currentInt;
                if (window.AudioEngine) window.AudioEngine.playCountdownBeep(false);
            } else if (this.countdownTimer <= 0 && this.lastCountdownInteger !== 0) {
                this.lastCountdownInteger = 0;
                if (window.AudioEngine) window.AudioEngine.playCountdownBeep(true);
            }

            // Lock movement and weapons during countdown (before 0.5s ENGAGE)
            if (this.countdownTimer > 0.5) {
                if (this.localPlayer) {
                    const playerScreenPos = (this.renderer && this.renderer.worldToScreen)
                        ? this.renderer.worldToScreen(this.localPlayer.x, this.localPlayer.y)
                        : {
                            x: this.canvas.width / (2 * (this.renderer ? this.renderer.dpr : 1)),
                            y: this.canvas.height / (2 * (this.renderer ? this.renderer.dpr : 1))
                        };
                    this.input.update(playerScreenPos, this.players, this.localPlayer);
                    this.localPlayer.angle = this.input.aimAngle;
                    if (this.localPlayer.selectedWeaponIndex !== this.input.selectedWeaponIndex) {
                        this.localPlayer.setWeapon(this.input.selectedWeaponIndex);
                    }
                }
                this.renderer.update(dt);
                this.updateHUD();
                return;
            }
        }

        // --- 1. Process Local Player Input (if playing) ---
        if (this.localPlayer) {
            const playerScreenPos = (this.renderer && this.renderer.worldToScreen)
                ? this.renderer.worldToScreen(this.localPlayer.x, this.localPlayer.y)
                : {
                    x: this.canvas.width / (2 * (this.renderer ? this.renderer.dpr : 1)),
                    y: this.canvas.height / (2 * (this.renderer ? this.renderer.dpr : 1))
                };
            this.input.update(playerScreenPos, this.players, this.localPlayer);

            if (!this.localPlayer.isDead) {
                this.localPlayer.angle = this.input.aimAngle;
                if (this.localPlayer.selectedWeaponIndex !== this.input.selectedWeaponIndex) {
                    this.localPlayer.setWeapon(this.input.selectedWeaponIndex);
                }
                this.localPlayer.applyMovement(this.input.move.x, this.input.move.y, dt);

                if (this.input.isDashing) {
                    if (this.localPlayer.wallContactTimer > 0) {
                        this.localPlayer.attemptWallKick((x, y, color, count, speed, normal) => {
                            this.renderer.spawnParticles(x, y, color, count, speed, normal);
                        });
                    } else {
                        this.localPlayer.attemptDash(this.input.move.x, this.input.move.y);
                    }
                }
                if (this.input.isSliding) {
                    this.localPlayer.attemptSlide(this.input.move.x, this.input.move.y);
                }
                if (this.input.isParrying) {
                    this.localPlayer.attemptParry();
                }
                if (this.input.isReloading) {
                    this.localPlayer.attemptReload();
                }
                if (this.input.isFiring) {
                    const spawnedBullets = [];
                    const fired = this.localPlayer.attemptFire(
                        (bullet) => {
                            this.bullets.push(bullet);
                            spawnedBullets.push(bullet.serialize ? bullet.serialize() : bullet);
                        },
                        (x, y, angle, type) => {
                            this.addShellCasing(x, y, angle, type);
                        }
                    );
                    if (fired) {
                        this.combatMusicTimer = 3.5;
                        if (this.network && this.network.isOnline && this.network.isHost && spawnedBullets.length > 0) {
                            this.network.broadcastToClients({
                                type: 'SPAWN_BULLETS',
                                bullets: spawnedBullets
                            });
                        }
                    }
                }
                if (this.input.isTriggeringUltimate) {
                    this.localPlayer.attemptUltimate((x, y, player) => {
                        this.triggerSupernova(x, y, player);
                    });
                }
                if (this.input.isTriggeringPing) {
                    this.input.isTriggeringPing = false;
                    const screenCenterX = this.canvas.width / (2 * this.renderer.dpr);
                    const screenCenterY = this.canvas.height / (2 * this.renderer.dpr);
                    const zoom = this.renderer.camera.zoom || 1.0;
                    const mouseWorldX = this.localPlayer.x + (this.input.mouse.x - screenCenterX) / zoom;
                    const mouseWorldY = this.localPlayer.y + (this.input.mouse.y - screenCenterY) / zoom;
                    const pingType = this.input.selectedPingType || 'enemy';
                    this.addPing(mouseWorldX, mouseWorldY, pingType, this.localPlayer);
                }

                // If connected to Host as client, send input packet
                if (this.network.isOnline && !this.network.isHost) {
                    this.network.sendToHost({
                        type: 'CLIENT_INPUT',
                        playerId: this.localPlayer.id,
                        sentTime: performance.now(),
                        moveX: this.input.move.x,
                        moveY: this.input.move.y,
                        angle: this.localPlayer.angle,
                        selectedWeaponIndex: this.localPlayer.selectedWeaponIndex,
                        triggerDash: this.input.isDashing,
                        triggerSlide: this.input.isSliding,
                        triggerParry: this.input.isParrying,
                        triggerReload: this.input.isReloading,
                        triggerFire: this.input.isFiring
                    });
                }
            }
        }

        // Update Spatial Audio listener for Spectator mode
        if (this.isSpectator && window.AudioEngine && window.AudioEngine.updateListener) {
            const specTarget = this.getSpectatorTarget();
            if (specTarget) {
                window.AudioEngine.updateListener(specTarget.x, specTarget.y, specTarget.angle);
            }
        }

        // --- 2. Update Bots ---
        for (let i = 0; i < this.bots.length; i++) {
            this.bots[i].update(dt);
        }

        // --- 2.1 Update Environmental Hazards & Speed Pads & Dynamic Doors ---
        if (this.mapManager) {
            this.mapManager.updateHazards(dt, this.players,
                (x, y, color, count) => this.renderer.spawnParticles(x, y, color, count),
                (p, dmg) => {
                    this.renderer.spawnFloatingText(p.x, p.y, `-${dmg}`, '#ef4444', true);
                    if (p.isLocal) this.renderer.addScreenShake(3);
                },
                this.obstacles
            );
        }

        // --- 2.2 Update Timed Arena Power-Ups ---
        if (this.powerUps) {
            for (let i = 0; i < this.powerUps.length; i++) {
                const pu = this.powerUps[i];
                pu.update(dt);
                for (let j = 0; j < this.players.length; j++) {
                    const pl = this.players[j];
                    if (this.network && this.network.isOnline && !this.network.isHost) {
                        // Client: only test pickup for local player to avoid desync
                        if (pl.isLocal && pu.checkPickup(pl)) {
                            if (window.AudioEngine) {
                                window.AudioEngine.playPowerUpPickup(pu.type);
                            }
                            this.renderer.spawnParticles(pu.x, pu.y, pu.color, 24, 340);
                            this.renderer.spawnFloatingText(pl.x, pl.y - 25, pu.name, pu.color, true);
                            this.renderer.addScreenShake(4);
                            this.network.sendToHost({
                                type: 'POWERUP_COLLECT',
                                powerUpId: pu.id,
                                playerId: pl.id
                            });
                        }
                    } else {
                        // Host or Single Player
                        if (pu.checkPickup(pl)) {
                            if (window.AudioEngine && pl.isLocal) {
                                window.AudioEngine.playPowerUpPickup(pu.type);
                            }
                            this.renderer.spawnParticles(pu.x, pu.y, pu.color, 24, 340);
                            this.renderer.spawnFloatingText(pl.x, pl.y - 25, pu.name, pu.color, true);
                            if (pl.isLocal) this.renderer.addScreenShake(4);
                            if (this.network && this.network.isOnline && this.network.isHost) {
                                this.network.broadcastToClients({
                                    type: 'POWERUP_CONSUMED',
                                    powerUpId: pu.id,
                                    playerId: pl.id
                                });
                            }
                        }
                    }
                }
            }
        }

        // --- 2.3 Enforce Gun Game & Weapon Mutator Locks (Local and Bots) ---
        const mutator = this.gameMode && this.gameMode.customRules && this.gameMode.customRules.weaponMutator;
        const isGunGame = this.gameMode && this.gameMode.mode === 'GUN_GAME';

        for (let p of this.players) {
            if (isGunGame) {
                if (typeof p.gunGameTier === 'undefined') p.gunGameTier = 0;
                p.selectedWeaponIndex = Math.min(4, p.gunGameTier);
            } else if (mutator === 'snipers_only' || mutator === 'instagib') {
                p.selectedWeaponIndex = 2;
            } else if (mutator === 'shotguns_only') {
                p.selectedWeaponIndex = 1;
            }
        }

        if (this.localPlayer) {
            this.input.selectedWeaponIndex = this.localPlayer.selectedWeaponIndex;
        }

        // --- 3. Update All Players ---
        for (let i = 0; i < this.players.length; i++) {
            const p = this.players[i];
            p.update(dt, this.obstacles, (bullet) => this.bullets.push(bullet), (x, y, color, count) => {
                this.renderer.spawnParticles(x, y, color, count);
            });

            // Hard boundary clamping to prevent tunneling through arena walls
            const maxCoord = this.arenaSize / 2 - p.radius - 2;
            p.x = Math.max(-maxCoord, Math.min(maxCoord, p.x));
            p.y = Math.max(-maxCoord, Math.min(maxCoord, p.y));

            // Respawn handling (Phase 10C: Tactical Spawns with enemy avoidance & spawn protection)
            if (p.isDead && p.respawnTimer <= 0) {
                const spawnPt = this.getTacticalSpawnPoint(p);
                p.spawn(spawnPt.x, spawnPt.y);
                this.renderer.spawnParticles(spawnPt.x, spawnPt.y, p.baseColor, 18, 300);
                if (p.isLocal && window.AudioEngine && window.AudioEngine.playSpawnShield) {
                    window.AudioEngine.playSpawnShield();
                }
            }
        }

        // Resolve Player vs Player repulsion
        for (let i = 0; i < this.players.length; i++) {
            for (let j = i + 1; j < this.players.length; j++) {
                if (!this.players[i].isDead && !this.players[j].isDead) {
                    Physics.resolveCircleCircle(this.players[i], this.players[j]);
                }
            }
        }

        // Phase 11: Record Historical Hitbox Snapshot for Lag Compensation
        this.recordHitboxSnapshot();

        // --- 4. Update Bullets & Collisions ---
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b.isDead) {
                this.bullets.splice(i, 1);
                continue;
            }

            b.update(
                dt,
                this.obstacles,
                // On Explode
                (ex, ey, blastRadius, damage, ownerId) => {
                    this.handleExplosion(ex, ey, blastRadius, damage, ownerId);
                },
                // On Spawn Particles
                (px, py, color, count, speed, normal) => {
                    this.renderer.spawnParticles(px, py, color, count, speed, normal);
                },
                // On Wall Hit (Phase 24)
                (wx, wy, normal, color, weaponId) => {
                    this.addWallDecal(wx, wy, normal, color, weaponId);
                }
            );

            // Near-miss bullet whiz-by audio for local player
            if (!b.whizPlayed && this.localPlayer && !this.localPlayer.isDead && b.ownerId !== this.localPlayer.id) {
                const distSq = Physics.distSq(b.x, b.y, this.localPlayer.x, this.localPlayer.y);
                if (distSq < 3200 && distSq > 450) {
                    b.whizPlayed = true;
                    if (window.AudioEngine && window.AudioEngine.playBulletWhiz) {
                        window.AudioEngine.playBulletWhiz(b.x, b.y);
                    }
                }
            }

            // Check bullet vs players
            for (let p of this.players) {
                if (p.isDead || b.isDead) continue;
                if (b.ownerId === p.id && !b.isParried) continue;

                let hitResult = (p.checkBulletHit ? p.checkBulletHit(b) : (p.hitTestBullet ? p.hitTestBullet(b) : { hit: false, parried: false }));

                // Phase 11: Lag-Compensated Rewind Hit Detection
                if (!hitResult.hit && b.sentTime && !p.isDead && b.ownerId !== p.id) {
                    const rewoundPlayers = this.getRewoundHitboxSnapshot(b.sentTime);
                    if (rewoundPlayers) {
                        const savedP = rewoundPlayers.find(snap => snap.id === p.id);
                        if (savedP && !savedP.isDead && !savedP.isDashing && !savedP.phaseTimer && !savedP.spawnProtectionTimer) {
                            const distSq = Physics.distSq(b.x, b.y, savedP.x, savedP.y);
                            const hitRadius = (savedP.radius || p.radius) + b.radius;
                            if (distSq <= hitRadius * hitRadius) {
                                if (savedP.isParrying) {
                                    p.parrySuccessAnim = 1.0;
                                    p.parriesCount++;
                                    b.parry(p.id, p.angle, p.team);
                                    if (window.AudioEngine && window.AudioEngine.playParry) {
                                        window.AudioEngine.playParry(p.x, p.y);
                                    }
                                    hitResult = { hit: true, parried: true };
                                } else {
                                    const angleToBullet = Math.atan2(b.y - savedP.y, b.x - savedP.x);
                                    const diffAngle = Math.abs(Math.atan2(Math.sin(angleToBullet - savedP.angle), Math.cos(angleToBullet - savedP.angle)));
                                    let isCrit = false;
                                    let critType = null;
                                    let damageMultiplier = 1.0;
                                    if (diffAngle < 0.62) {
                                        isCrit = true;
                                        critType = 'HEADSHOT';
                                        damageMultiplier = 1.5;
                                    } else if (diffAngle > 2.35) {
                                        isCrit = true;
                                        critType = 'BACKSTAB';
                                        damageMultiplier = 1.25;
                                    }
                                    hitResult = {
                                        hit: true,
                                        parried: false,
                                        isCrit,
                                        critType,
                                        damageMultiplier
                                    };
                                }
                            }
                        }
                    }
                }

                if (hitResult.hit) {
                    if (hitResult.parried) {
                        // Bullet was deflected! Spawn brilliant sparks, screen shake, and micro-hitstop
                        this.triggerHitstop(0.04);
                        this.renderer.spawnParticles(p.x, p.y, '#ffffff', 18, 380);
                        this.renderer.addScreenShake(6);
                        this.renderer.spawnFloatingText(p.x, p.y - 30, 'PARRIED!', '#00f0ff', true);
                        p.addUltimateCharge(35);
                    } else {
                        // Direct Hit!
                        // Phase 16: Check friendly fire before destroying bullet so friendly fire does not absorb teammate shots
                        const attacker = this.players.find(pl => pl.id === b.ownerId);
                        const isTeamMode = this.gameMode && (this.gameMode.mode === 'TDM' || this.gameMode.mode === 'ZONE_CONTROL');
                        if (attacker && p.team && attacker.team === p.team && isTeamMode && attacker.id !== p.id) {
                            continue;
                        }

                        b.destroy(
                            (ex, ey, r, dmg, id) => this.handleExplosion(ex, ey, r, dmg, id, p.id),
                            (x, y, color, count) => this.renderer.spawnParticles(x, y, color, count)
                        );
                        this.addFloorDecal(b.x, b.y, Math.random() * 5 + 10, b.color, 6.0);
                        const mult = hitResult.damageMultiplier || 1.0;
                        const finalDamage = Math.round(b.damage * mult);
                        if (attacker) attacker.addUltimateCharge(finalDamage * 0.35);

                        const died = p.takeDamage(finalDamage, b.ownerId, b.x, b.y);
                        this.addFloorDecal(p.x, p.y, 16, p.baseColor || b.color, 6.0);

                        const isCrit = hitResult.isCrit || finalDamage >= 50;
                        if (hitResult.isCrit) {
                            this.triggerHitstop(0.045);
                            const critLabel = hitResult.critType === 'HEADSHOT' ? 'HEADSHOT!' : 'BACKSTAB!';
                            const critColor = hitResult.critType === 'HEADSHOT' ? '#ffd700' : '#ff0055';
                            this.renderer.spawnFloatingText(p.x, p.y - 25, critLabel, critColor, true);
                            this.renderer.spawnParticles(p.x, p.y, critColor, 10, 320);
                        } else if (isCrit) {
                            this.triggerHitstop(0.035);
                        }
                        // Floating kinetic combat damage numbers (Cyan for shield, White for health, Gold/Pink for crit)
                        const dmgShield = (p.lastDamageTaken && p.lastDamageTaken.shieldDamage) || 0;
                        const dmgHealth = (p.lastDamageTaken && p.lastDamageTaken.healthDamage) || 0;
                        if (dmgShield > 0) {
                            this.renderer.spawnFloatingText(p.x, p.y - 12, `-${dmgShield}`, '#38bdf8', false);
                        }
                        if (dmgHealth > 0) {
                            const healthColor = hitResult.isCrit ? '#ffd700' : (isCrit ? '#ff0055' : '#ffffff');
                            this.renderer.spawnFloatingText(p.x, p.y, `-${dmgHealth}`, healthColor, isCrit);
                        } else if (dmgShield === 0) {
                            this.renderer.spawnFloatingText(p.x, p.y, `-${finalDamage}`, hitResult.isCrit ? '#ffd700' : (isCrit ? '#ff0055' : '#ffb703'), isCrit);
                        }

                        // If local player scored hit
                        if (this.localPlayer && b.ownerId === this.localPlayer.id) {
                            this.renderer.addScreenShake(isCrit ? 6 : 2);
                            window.AudioEngine.playHitMarker(died);
                            if (this.renderer && this.renderer.triggerHitmarker) {
                                this.renderer.triggerHitmarker(died);
                            }
                            if (this.input && this.input.triggerHaptic) {
                                this.input.triggerHaptic(died ? 'kill' : 'medium');
                            }
                        }

                        if (died) {
                            const killer = this.players.find(pl => pl.id === b.ownerId);
                            const wepName = (killer && WEAPONS[killer.selectedWeaponIndex]) ? WEAPONS[killer.selectedWeaponIndex].name : 'Pulse Blaster';
                            const distM = killer ? Math.round(Physics.dist(killer.x, killer.y, p.x, p.y)) : 0;
                            p.killerInfo = {
                                name: killer ? killer.name : 'Unknown Operator',
                                team: killer ? killer.team : null,
                                color: killer ? killer.baseColor : '#ff0055',
                                weaponName: wepName,
                                distance: distM
                            };
                            if (killer) {
                                killer.addUltimateCharge(25);
                                if (killer.isLocal && window.ProgressionManager && typeof WEAPONS !== 'undefined') {
                                    const wep = WEAPONS[killer.selectedWeaponIndex];
                                    if (wep) {
                                        const res = window.ProgressionManager.addWeaponXp(wep.id, 120, 1);
                                        if (res && res.leveledUp) {
                                            this.renderer.showAnnouncement(`WEAPON MASTERY UP! ${wep.name} -> TIER ${res.tier.tier}: ${res.tier.name.toUpperCase()}`, '#f59e0b');
                                            if (window.AudioEngine && window.AudioEngine.playLevelUp) {
                                                window.AudioEngine.playLevelUp();
                                            }
                                        }
                                    }
                                }
                            }

                            const announce = this.gameMode.recordKill(killer, p, wepName, b.isParried);
                            if (announce) {
                                this.renderer.showAnnouncement(announce, '#ff0055');
                            }
                            this.renderer.spawnParticles(p.x, p.y, p.baseColor, 30, 400);
                        }
                        break;
                    }
                }
            }
        }

        // --- 4.05 Update Physical Shell Casings ---
        if (this.shellCasings) {
            for (let i = this.shellCasings.length - 1; i >= 0; i--) {
                this.shellCasings[i].update(dt);
                if (this.shellCasings[i].isDead) {
                    this.shellCasings.splice(i, 1);
                }
            }
        }

        // --- 4.06 Dynamic Combat Music Crossfader ---
        if (this.localPlayer && !this.localPlayer.isDead) {
            for (let i = 0; i < this.players.length; i++) {
                const other = this.players[i];
                if (other.id !== this.localPlayer.id && !other.isDead) {
                    if (Physics.distSq(this.localPlayer.x, this.localPlayer.y, other.x, other.y) < 250000) {
                        this.combatMusicTimer = Math.max(this.combatMusicTimer, 2.5);
                        break;
                    }
                }
            }
        }
        if (this.combatMusicTimer > 0) {
            this.combatMusicTimer = Math.max(0, this.combatMusicTimer - dt);
            if (window.AudioEngine && window.AudioEngine.setMusicState) {
                window.AudioEngine.setMusicState('combat');
            }
        } else {
            if (window.AudioEngine && window.AudioEngine.setMusicState) {
                window.AudioEngine.setMusicState('ambient');
            }
        }

        // --- 5. Update Visual Effects & Game Mode ---
        this.renderer.update(dt);
        this.gameMode.update(dt, this.players);
        this.updateHUD();
    }

    // --- Phase 11: Lag Compensation (Hitbox Rewind Buffer) ---
    recordHitboxSnapshot() {
        const now = performance.now();
        const snapshot = {
            time: now,
            players: this.players.map(p => ({
                id: p.id,
                x: p.x,
                y: p.y,
                angle: p.angle,
                radius: p.radius,
                isDead: p.isDead,
                isDashing: p.isDashing,
                isParrying: p.isParrying,
                phaseTimer: p.phaseTimer || 0,
                spawnProtectionTimer: p.spawnProtectionTimer || 0,
                team: p.team
            }))
        };
        this.hitboxHistory.push(snapshot);
        // Retain past 450ms of tick history (plenty for high latency up to 350ms)
        const cutoff = now - 450;
        while (this.hitboxHistory.length > 0 && this.hitboxHistory[0].time < cutoff) {
            this.hitboxHistory.shift();
        }
    }

    getRewoundHitboxSnapshot(targetTime) {
        if (!targetTime || !this.hitboxHistory || this.hitboxHistory.length === 0) return null;
        const now = performance.now();
        // Clamp rewind between (now - 350ms) and now to prevent client spoofing / latency abuse
        const clampedTarget = Math.max(now - 350, Math.min(now, targetTime));

        if (clampedTarget <= this.hitboxHistory[0].time) {
            return this.hitboxHistory[0].players;
        }
        const lastIdx = this.hitboxHistory.length - 1;
        if (clampedTarget >= this.hitboxHistory[lastIdx].time) {
            return this.hitboxHistory[lastIdx].players;
        }

        let prev = this.hitboxHistory[0];
        let next = this.hitboxHistory[lastIdx];

        for (let i = 0; i < lastIdx; i++) {
            if (this.hitboxHistory[i].time <= clampedTarget && this.hitboxHistory[i + 1].time >= clampedTarget) {
                prev = this.hitboxHistory[i];
                next = this.hitboxHistory[i + 1];
                break;
            }
        }

        const span = next.time - prev.time;
        const alpha = span > 0.0001 ? (clampedTarget - prev.time) / span : 0;

        return prev.players.map(p0 => {
            const p1 = next.players.find(p => p.id === p0.id);
            if (!p1) return { ...p0 };
            return {
                id: p0.id,
                x: p0.x + (p1.x - p0.x) * alpha,
                y: p0.y + (p1.y - p0.y) * alpha,
                angle: p0.angle + (p1.angle - p0.angle) * alpha,
                radius: p1.radius,
                isDead: p1.isDead,
                isDashing: p1.isDashing,
                isParrying: p1.isParrying,
                phaseTimer: Math.max(p0.phaseTimer, p1.phaseTimer),
                spawnProtectionTimer: Math.max(p0.spawnProtectionTimer, p1.spawnProtectionTimer),
                team: p1.team
            };
        });
    }

    handleExplosion(ex, ey, radius, damage, ownerId, excludeDamagePlayerId = null) {
        this.renderer.spawnParticles(ex, ey, '#10b981', 35, 380);
        this.renderer.addScreenShake(10);
        window.AudioEngine.playExplosion(ex, ey);
        this.addFloorDecal(ex, ey, 48, '#10b981', 10.0);

        const attacker = this.players.find(pl => pl.id === ownerId);
        const isTeamMode = this.gameMode && (this.gameMode.mode === 'TDM' || this.gameMode.mode === 'ZONE_CONTROL');

        for (let p of this.players) {
            if (p.isDead || (p.spawnProtectionTimer && p.spawnProtectionTimer > 0)) continue;
            // Ignore blast damage to teammates in team modes
            if (attacker && p.team && attacker.team === p.team && isTeamMode && attacker.id !== p.id) {
                continue;
            }

            const dist = Physics.dist(ex, ey, p.x, p.y);
            if (dist < radius) {
                const falloff = 1 - (dist / radius);

                // Knockback
                const angle = Math.atan2(p.y - ey, p.x - ex);
                const kbMult = (p.id === ownerId) ? 0.6 : 1.0;
                p.vx += Math.cos(angle) * (Math.max(0.25, falloff) * 600 * kbMult);
                p.vy += Math.sin(angle) * (Math.max(0.25, falloff) * 600 * kbMult);

                // If player was the direct hit target, direct damage was already resolved
                if (excludeDamagePlayerId && p.id === excludeDamagePlayerId) {
                    continue;
                }

                // Self-damage mitigation: 40% damage to avoid instant suicide
                const selfMult = (p.id === ownerId) ? 0.4 : 1.0;
                const actualDamage = Math.round(damage * falloff * selfMult);
                if (attacker && p.id !== ownerId) attacker.addUltimateCharge(actualDamage * 0.35);
                const died = p.takeDamage(actualDamage, attacker ? attacker.name : 'Unknown', ex, ey);

                this.renderer.spawnFloatingText(p.x, p.y, `-${actualDamage}`, '#10b981', true);

                if (died) {
                    const isSelfKill = attacker && attacker.id === p.id;
                    const killer = attacker;
                    const distM = killer ? Math.round(Physics.dist(killer.x, killer.y, p.x, p.y)) : 0;
                    p.killerInfo = {
                        name: isSelfKill ? 'Self-Destruct' : (killer ? killer.name : 'Unknown Operator'),
                        team: isSelfKill ? null : (killer ? killer.team : null),
                        color: isSelfKill ? '#ef4444' : (killer ? killer.baseColor : '#10b981'),
                        weaponName: 'Vortex Cannon',
                        distance: distM
                    };
                    if (killer && !isSelfKill) {
                        killer.addUltimateCharge(25);
                        if (killer.isLocal && window.ProgressionManager) {
                            const res = window.ProgressionManager.addWeaponXp('vortex', 120, 1);
                            if (res && res.leveledUp) {
                                this.renderer.showAnnouncement(`WEAPON MASTERY UP! Vortex Cannon -> TIER ${res.tier.tier}: ${res.tier.name.toUpperCase()}`, '#f59e0b');
                                if (window.AudioEngine && window.AudioEngine.playLevelUp) {
                                    window.AudioEngine.playLevelUp();
                                }
                            }
                        }
                    }
                    const announce = this.gameMode.recordKill(killer, p, 'Vortex Cannon');
                    if (announce) this.renderer.showAnnouncement(announce, isSelfKill ? '#ef4444' : '#10b981');
                }
            }
        }
    }

    /**
     * Phase 10C: Safe Tactical Respawn selector with enemy avoidance and obstacle collision validation.
     */
    getTacticalSpawnPoint(player) {
        const candidateSpawns = (this.mapManager && this.mapManager.currentMap && this.mapManager.currentMap.spawns && this.mapManager.currentMap.spawns.length > 0)
            ? this.mapManager.currentMap.spawns
            : [
                { x: -500, y: -500 },
                { x: 500, y: -500 },
                { x: -500, y: 500 },
                { x: 500, y: 500 },
                { x: 0, y: -550 },
                { x: 0, y: 550 }
            ];

        // Find active living opponents
        const enemies = this.players.filter(other => {
            if (!other || other.id === player.id || other.isDead) return false;
            if (this.gameMode && (this.gameMode.mode === 'TDM' || this.gameMode.mode === 'ZONE_CONTROL') && player.team && other.team === player.team) {
                return false;
            }
            return true;
        });

        let bestSpawn = candidateSpawns[0];
        let maxMinEnemyDist = -1;

        for (let i = 0; i < candidateSpawns.length; i++) {
            const spawn = candidateSpawns[i];
            let minEnemyDist = Infinity;

            for (let j = 0; j < enemies.length; j++) {
                const d = Physics.dist(spawn.x, spawn.y, enemies[j].x, enemies[j].y);
                if (d < minEnemyDist) {
                    minEnemyDist = d;
                }
            }

            if (minEnemyDist > maxMinEnemyDist) {
                maxMinEnemyDist = minEnemyDist;
                bestSpawn = spawn;
            }
        }

        // Slight jitter (+-15px) to prevent direct overlap
        const jitterX = (Math.random() - 0.5) * 30;
        const jitterY = (Math.random() - 0.5) * 30;
        const finalPoint = { x: bestSpawn.x + jitterX, y: bestSpawn.y + jitterY, radius: player.radius || 18 };

        // Zero clipping guarantee: test against all arena obstacles
        if (this.obstacles) {
            for (let obs of this.obstacles) {
                Physics.resolveCircleBox(finalPoint, obs);
            }
        }

        return finalPoint;
    }

    /**
     * Phase 10E: Cyberpunk in-game notification helper.
     */
    showNotification(title, message = '', type = 'info') {
        if (this.renderer && this.renderer.showCyberpunkToast) {
            this.renderer.showCyberpunkToast(title, message, type);
        } else {
            this.showToast(`${title}: ${message}`);
        }
    }

    // Phase 21: FIFO Bound Particle Casings (Max 80)
    addShellCasing(x, y, angle, type = 'brass') {
        if (!this.shellCasings) this.shellCasings = [];
        if (this.shellCasings.length >= 80) {
            this.shellCasings.shift();
        }
        if (typeof ShellCasing !== 'undefined') {
            this.shellCasings.push(new ShellCasing(x, y, angle, type));
        }
    }

    // Phase 5: Floor Scorch Decals & EMP Supernova Execution
    addFloorDecal(x, y, radius, color, maxLife = 8.0) {
        if (this.floorDecals.length > 55) {
            this.floorDecals.shift();
        }
        this.floorDecals.push({
            x, y, radius, color,
            alpha: 1.0,
            life: maxLife,
            maxLife
        });
    }

    // Phase 24: Wall Impact Scorch & Gouge Decals (Max 36)
    addWallDecal(x, y, normal, color = '#00f0ff', weaponId = 'blaster', maxLife = 5.0) {
        if (!this.wallDecals) this.wallDecals = [];
        if (this.wallDecals.length >= 36) {
            this.wallDecals.shift();
        }
        this.wallDecals.push({
            x,
            y,
            nx: normal ? normal.x : 0,
            ny: normal ? normal.y : 0,
            color,
            weaponId,
            alpha: 1.0,
            life: maxLife,
            maxLife
        });
    }

    triggerSupernova(x, y, sourcePlayer) {
        if (window.AudioEngine) window.AudioEngine.playSupernova();
        this.renderer.addScreenShake(16);
        this.renderer.spawnFloatingText(x, y - 25, 'EMP SUPERNOVA!', '#00f0ff', true);

        this.supernovas.push({
            x, y,
            radius: 20,
            maxRadius: 360,
            duration: 0.55,
            timer: 0,
            color: sourcePlayer.baseColor || '#00f0ff',
            sourcePlayer
        });

        this.addFloorDecal(x, y, 65, sourcePlayer.baseColor || '#00f0ff', 12.0);

        // Destroy all enemy bullets within 360px
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b.ownerId !== sourcePlayer.id && !b.isDead) {
                const dist = Physics.dist(x, y, b.x, b.y);
                if (dist < 360) {
                    b.isDead = true;
                    this.renderer.spawnParticles(b.x, b.y, '#ffffff', 6, 260);
                }
            }
        }

        // Deal 40 damage and massive knockback to all enemies within 360px
        for (let p of this.players) {
            if (p.id === sourcePlayer.id || p.isDead) continue;
            if (this.gameMode.mode === 'TDM' && p.team === sourcePlayer.team) continue;

            const dist = Physics.dist(x, y, p.x, p.y);
            if (dist < 360) {
                const falloff = 1 - (dist / 360);
                const dmg = Math.round(40 * (0.6 + 0.4 * falloff));
                const died = p.takeDamage(dmg, sourcePlayer.name + ' [EMP]');

                const angle = Math.atan2(p.y - y, p.x - x);
                const push = 1100 * falloff;
                p.vx += Math.cos(angle) * push;
                p.vy += Math.sin(angle) * push;

                this.renderer.spawnFloatingText(p.x, p.y, `-${dmg}`, '#00f0ff', true);
                this.renderer.spawnParticles(p.x, p.y, p.baseColor, 12, 340);

                if (died) {
                    const distM = Math.round(dist);
                    p.killerInfo = {
                        name: sourcePlayer.name,
                        team: sourcePlayer.team,
                        color: sourcePlayer.baseColor,
                        weaponName: 'EMP Supernova',
                        distance: distM
                    };
                    sourcePlayer.addUltimateCharge(25);
                    const announce = this.gameMode.recordKill(sourcePlayer, p, 'EMP Supernova');
                    if (announce) this.renderer.showAnnouncement(announce, '#00f0ff');
                }
            }
        }
    }

    // Phase 6: Tactical Ping Beacons & World Callout Placement
    addPing(x, y, type = 'enemy', sourcePlayer = null) {
        let detectedType = type;
        let detectedLabel = 'TACTICAL PING';
        let detectedColor = '#ef4444';

        // Check power-up proximity
        if (this.powerUps) {
            for (let pu of this.powerUps) {
                if (pu.isActive && Math.hypot(pu.x - x, pu.y - y) < 70) {
                    detectedType = 'powerup';
                    detectedLabel = `PICKUP: ${pu.name.toUpperCase()}`;
                    detectedColor = pu.glowColor || '#ffb703';
                    break;
                }
            }
        }

        // Check enemy proximity if still generic
        if (detectedType === 'enemy') {
            for (let pl of this.players) {
                if (!pl.isDead && pl !== sourcePlayer && Math.hypot(pl.x - x, pl.y - y) < 65) {
                    detectedType = 'enemy';
                    detectedLabel = `ENEMY: ${pl.name.toUpperCase()}`;
                    detectedColor = '#ef4444';
                    break;
                }
            }
        }

        if (detectedType === 'defend') {
            detectedLabel = 'DEFEND LOCATION';
            detectedColor = '#3b82f6';
        } else if (detectedType === 'assist') {
            detectedLabel = 'ASSIST REQUESTED';
            detectedColor = '#00f0ff';
        }

        const pingObj = {
            id: 'ping_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            x: Math.round(x),
            y: Math.round(y),
            type: detectedType,
            label: detectedLabel,
            color: detectedColor,
            playerName: sourcePlayer ? sourcePlayer.name : 'Tactical',
            life: 4.5,
            maxLife: 4.5
        };

        this.pings.push(pingObj);

        // Cap maximum active pings to prevent clutter
        if (this.pings.length > 8) {
            this.pings.shift();
        }

        // Sound chime with spatial panning
        if (window.AudioEngine && window.AudioEngine.playPing) {
            window.AudioEngine.playPing(detectedType, x, y);
        }

        // Tactical HUD announcement
        if (this.renderer && this.renderer.showAnnouncement) {
            const senderName = sourcePlayer ? sourcePlayer.name : 'Operator';
            this.renderer.showAnnouncement(`[PING] ${senderName}: ${detectedLabel}`, detectedColor);
        }

        // Network broadcast if online
        if (this.network && this.network.isOnline) {
            this.network.broadcast({
                type: 'TACTICAL_PING',
                ping: pingObj
            });
        }
        return pingObj;
    }

    setupUI() {
        if (this.ui) this.ui.init();
    }

    updateHUD() {
        if (this.ui) this.ui.updateHUD();
    }

    renderPostMatchSummary(res) {
        if (this.ui) this.ui.renderPostMatchSummary(res);
    }

    showToast(msg) {
        if (this.ui) this.ui.showToast(msg);
    }

    saveSettings() {
        if (this.ui) this.ui.saveSettings();
    }

    loadSettings() {
        if (this.ui) this.ui.loadSettings();
    }

    checkUrlParams() {
        if (this.ui) this.ui.checkUrlParams();
    }

    rematch() {
        const gameOverModal = document.getElementById('gameOverModal');
        if (gameOverModal) gameOverModal.classList.add('hidden');
        this.hasRecordedMatch = false;

        if (this.network.isOnline) {
            if (this.network.isHost) {
                this.network.broadcastRematch();
                this.setupMatch(true, this.bots.length, this.isSpectator);
            } else {
                this.showToast('WAITING FOR HOST TO INITIATE REMATCH...');
            }
        } else {
            // Offline match
            const botCount = this.bots.length || 3;
            this.setupMatch(true, botCount, this.isSpectator);
        }
        this.renderer.showAnnouncement('MATCH RESTARTED // OVERDRIVE', '#00f0ff');
    }

    // Phase 25: Instant Match Restart (Pause Menu / In-game Rematch)
    restartMatch() {
        this.isPaused = false;
        const pauseModal = document.getElementById('pauseModal');
        if (pauseModal) pauseModal.classList.add('hidden');
        const gameOverModal = document.getElementById('gameOverModal');
        if (gameOverModal) gameOverModal.classList.add('hidden');

        if (this.input) {
            this.input.isPointerLocked = true;
        }

        this.applyRematch();
        this.renderer.showAnnouncement('MATCH RESTARTED // OVERDRIVE', '#00f0ff');
        if (window.AudioEngine && window.AudioEngine.playUiClick) {
            window.AudioEngine.playUiClick('confirm');
        }
    }

    applyRematch() {
        const gameOverModal = document.getElementById('gameOverModal');
        if (gameOverModal) gameOverModal.classList.add('hidden');
        this.hasRecordedMatch = false;
        if (this.gameMode) {
            if (typeof this.gameMode.reset === 'function') {
                this.gameMode.reset();
            } else {
                this.gameMode.isMatchOver = false;
                this.gameMode.winner = null;
                this.gameMode.teamScores = { blue: 0, red: 0 };
                this.gameMode.soloScores = {};
                this.gameMode.elapsedTime = 0;
                this.gameMode.killfeed = [];
                this.gameMode.recentKills = 0;
                this.gameMode.multiKillTimer = 0;
                this.gameMode.victorySlowTimer = 0;
                this.gameMode.timeScale = 1.0;
                if (this.gameMode.zone) {
                    this.gameMode.zone.owner = null;
                    this.gameMode.zone.contested = false;
                    this.gameMode.zone.captureProgress = 0;
                    this.gameMode.zone.accumulatedTime = 0;
                }
            }
        }
        this.bullets = [];
        this.supernovas = [];
        this.floorDecals = [];
        this.wallDecals = [];
        this.pings = [];
        this.countdownTimer = 3.5;
        this.lastCountdownInteger = 4;

        // Respawn Timed Arena Power-Ups
        this.powerUps = [];
        const puSpawns = (this.mapManager && this.mapManager.currentMap.powerUpSpawns) || [];
        for (let i = 0; i < puSpawns.length; i++) {
            const s = puSpawns[i];
            this.powerUps.push(new PowerUp(`pu_${i}`, s.type, s.x, s.y));
        }

        const mapSpawns = (this.mapManager && this.mapManager.currentMap.spawns) || [{ x: 0, y: 350 }];
        for (let i = 0; i < this.players.length; i++) {
            const p = this.players[i];
            const spawn = mapSpawns[i % mapSpawns.length];
            p.spawn(spawn.x, spawn.y);
            p.kills = 0;
            p.deaths = 0;
            p.score = 0;
            p.powerUpsCollected = 0;
            if (this.gameMode.mode === 'GUN_GAME') {
                p.gunGameTier = 0;
                p.selectedWeaponIndex = 0;
            }
        }
        this.applyCustomRulesToPlayers();
        this.renderer.showAnnouncement('REMATCH INITIATED!', '#10b981');
    }

    renderQrCode(code) {
        if (this.ui) this.ui.renderQrCode(code);
    }

    handleHostDisconnect() {
        const net = this.network || this.networkManager;
        if (net) {
            net.isOnline = false;
            net.isConnected = false;
            net.isHost = false;
            if (net.peer) {
                try { net.peer.destroy(); } catch (e) {}
            }
        }
        if (this.networkManager) {
            this.networkManager.isOnline = false;
            this.networkManager.isConnected = false;
            this.networkManager.isHost = false;
        }

        // Clean up transient multiplayer combat entities
        this.bullets = [];
        this.supernovas = [];
        this.floorDecals = [];
        this.wallDecals = [];
        this.pings = [];

        // Retain only the local player and restore default state
        if (this.localPlayer) {
            this.players = [this.localPlayer];
            this.localPlayer.isDead = false;
            this.localPlayer.health = this.localPlayer.maxHealth;
            this.localPlayer.shield = this.localPlayer.maxShield;
        } else {
            this.players = [];
        }

        // Close Game Over modal if active
        const gameOverModal = document.getElementById('gameOverModal');
        if (gameOverModal) gameOverModal.classList.add('hidden');

        // Hide spectator overlay if active
        const spectatorOverlay = document.getElementById('spectatorOverlay');
        if (spectatorOverlay) spectatorOverlay.classList.add('hidden');

        // Hide room code info
        const roomInfo = document.getElementById('roomInfo');
        if (roomInfo) roomInfo.classList.add('hidden');

        // Display lobby modal
        const lobbyModal = document.getElementById('lobbyModal');
        if (lobbyModal) lobbyModal.classList.remove('hidden');

        // Visual and audio notification
        if (this.renderer && this.renderer.showAnnouncement) {
            this.renderer.showAnnouncement('HOST DISCONNECTED - RETURNED TO LOBBY', '#ef4444');
        }
        if (window.AudioEngine && window.AudioEngine.playParryFailure) {
            window.AudioEngine.playParryFailure();
        }

        // Reset network UI buttons/status
        const joinBtn = document.getElementById('joinBtn');
        if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.textContent = 'JOIN';
        }
        const hostBtn = document.getElementById('hostBtn');
        if (hostBtn) {
            hostBtn.disabled = false;
            hostBtn.textContent = 'HOST ONLINE ROOM';
        }
    }

    togglePause() {
        if (this.ui && this.ui.togglePause) {
            this.ui.togglePause();
        }
    }
}

window.Game = Game;

window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
