/**
 * GameMode.js
 * Match management, Scoring, Killfeed notifications, and Win Condition checks.
 * Supports: FFA, TDM, GUN GAME, and ZONE CONTROL.
 */

class GameModeManager {
    constructor(mode = 'FFA', scoreLimit = 15) {
        this.mode = mode; // 'FFA', 'TDM', 'GUN_GAME', 'ZONE_CONTROL'
        this.scoreLimit = scoreLimit;
        this.matchTime = 300; // 5 minutes
        this.elapsedTime = 0;
        this.isMatchOver = false;
        this.winner = null;

        // Team scores for TDM and Zone Control
        this.teamScores = { blue: 0, red: 0 };
        this.soloScores = {};

        // Zone Control State
        this.zone = {
            x: 0,
            y: 0,
            radius: 200,
            owner: null, // 'blue', 'red', or player id
            contested: false,
            captureProgress: 0,
            accumulatedTime: 0
        };

        // Custom Match Rules (Phase 4)
        this.customRules = {
            speedMultiplier: 1.0,   // 1.0 or 1.4
            weaponMutator: 'all'    // 'all', 'snipers_only', 'shotguns_only', 'instagib'
        };

        // Killfeed list
        this.killfeed = [];

        // Local player multikill tracker
        this.recentKills = 0;
        this.multiKillTimer = 0;

        // Phase 9: Cinematic Victory Slow-Motion Finish
        this.victorySlowTimer = 0;
        this.timeScale = 1.0;
    }

    reset() {
        this.elapsedTime = 0;
        this.isMatchOver = false;
        this.winner = null;
        this.teamScores = { blue: 0, red: 0 };
        this.soloScores = {};
        this.killfeed = [];
        this.recentKills = 0;
        this.multiKillTimer = 0;
        this.victorySlowTimer = 0;
        this.timeScale = 1.0;
        if (this.zone) {
            this.zone.owner = null;
            this.zone.contested = false;
            this.zone.captureProgress = 0;
            this.zone.accumulatedTime = 0;
        }
    }

    setCustomRules(rules) {
        if (rules) {
            this.customRules = { ...this.customRules, ...rules };
        }
    }

    setMode(mode) {
        this.mode = mode;
        if (mode === 'GUN_GAME') {
            this.scoreLimit = 5; // 5 weapon tiers (Blaster -> Shotgun -> Sniper -> Vortex -> Glaive)
        } else if (mode === 'ZONE_CONTROL') {
            this.scoreLimit = 50; // 50 capture points to win
        } else {
            this.scoreLimit = 15;
        }
        this.teamScores = { blue: 0, red: 0 };
        this.soloScores = {};
        this.zone.owner = null;
        this.zone.captureProgress = 0;
        this.elapsedTime = 0;
        this.isMatchOver = false;
        this.winner = null;
        this.victorySlowTimer = 0;
        this.timeScale = 1.0;
    }

    update(dt, players) {
        // Phase 9: Victory slow-motion countdown
        if (this.victorySlowTimer > 0) {
            this.victorySlowTimer -= dt;
            if (this.victorySlowTimer <= 0) {
                this.timeScale = 1.0;
            }
        }

        if (this.isMatchOver) return;

        this.elapsedTime += dt;

        // Multikill timer reset
        if (this.multiKillTimer > 0) {
            this.multiKillTimer -= dt;
            if (this.multiKillTimer <= 0) {
                this.recentKills = 0;
            }
        }

        // Clean up old killfeed items
        const now = performance.now();
        this.killfeed = this.killfeed.filter(item => now - item.timestamp < 4500);

        // --- Zone Control Logic ---
        if (this.mode === 'ZONE_CONTROL') {
            this.updateZoneControl(dt, players);
        }

        // Check match time limit
        if (this.elapsedTime >= this.matchTime) {
            this.endMatchByTime(players);
        }
    }

    updateZoneControl(dt, players) {
        const zone = this.zone;
        const inZonePlayers = players.filter(p => !p.isDead && Physics.distSq(p.x, p.y, zone.x, zone.y) < zone.radius * zone.radius);

        if (inZonePlayers.length === 0) {
            zone.contested = false;
            return;
        }

        // Check if players from multiple teams are in zone
        const teamsPresent = new Set(inZonePlayers.map(p => p.team || p.id));
        if (teamsPresent.size > 1) {
            zone.contested = true;
            return; // Contested, no capture points awarded
        }

        zone.contested = false;
        const controllingTeam = inZonePlayers[0].team || inZonePlayers[0].id;
        const controllingPlayer = inZonePlayers[0];

        // Capture progression
        if (zone.owner && zone.owner !== controllingTeam) {
            // Stage 1: Neutralize enemy control before capturing
            zone.captureProgress -= dt * 0.75;
            if (zone.captureProgress <= 0) {
                zone.owner = null;
                zone.captureProgress = 0;
            }
        } else if (!zone.owner) {
            // Stage 2: Capture neutral zone
            zone.captureProgress += dt * 0.75;
            if (zone.captureProgress >= 1.0) {
                zone.owner = controllingTeam;
                zone.captureProgress = 1.0;
                if (window.AudioEngine) window.AudioEngine.playKillstreak();
            }
        } else {
            // Zone owned by controlling team: reinforce capture progress to max
            zone.captureProgress = Math.min(1.0, zone.captureProgress + dt * 0.75);

            // Award Zone Points every 0.8s
            zone.accumulatedTime += dt;
            if (zone.accumulatedTime >= 0.8) {
                zone.accumulatedTime = 0;

                if (controllingPlayer.team) {
                    this.teamScores[controllingPlayer.team]++;
                    if (this.teamScores[controllingPlayer.team] >= this.scoreLimit) {
                        this.finishMatch(`${controllingPlayer.team.toUpperCase()} TEAM WINS ZONE CONTROL!`);
                    }
                } else {
                    const current = (this.soloScores[controllingPlayer.id] || 0) + 1;
                    this.soloScores[controllingPlayer.id] = current;
                    controllingPlayer.score += 25;
                    if (current >= this.scoreLimit) {
                        this.finishMatch(`${controllingPlayer.name} WINS ZONE CONTROL!`);
                    }
                }
            }
        }
    }

    recordKill(killer, victim, weaponName = 'Blaster', isParryKill = false) {
        if (!killer || !victim) return;

        // Friendly Fire Check: If in TDM/ZONE_CONTROL and killer & victim are on same team
        const isTeamKill = (this.mode === 'TDM' || this.mode === 'ZONE_CONTROL') && killer.team && victim.team && killer.team === victim.team && killer.id !== victim.id;
        if (isTeamKill) {
            killer.killStreak = 0;
            killer.score = Math.max(0, killer.score - 50);
            return `[TEAM-KILL] ${killer.name} ELIMINATED ALLY ${victim.name}!`;
        }

        // Suicide / Self-Elimination Check:
        if (killer.id === victim.id) {
            killer.killStreak = 0;
            killer.score = Math.max(0, killer.score - 50);
            return `[SUICIDE] ${victim.name} ELIMINATED THEMSELVES!`;
        }

        killer.kills++;
        killer.score += 100;
        killer.killStreak++;

        // If TDM, update team score
        if (this.mode === 'TDM' && killer.team) {
            this.teamScores[killer.team]++;
        }

        // --- GUN GAME Progression (5 Tiers including Neon Glaive) ---
        if (this.mode === 'GUN_GAME') {
            if (typeof killer.gunGameTier === 'undefined') killer.gunGameTier = 0;
            killer.gunGameTier++;

            // Phase 9: Melee Blade Demotion for victim
            const isMeleeElimination = weaponName === 'Neon Glaive' || isParryKill;
            if (isMeleeElimination && victim) {
                if (typeof victim.gunGameTier === 'undefined') victim.gunGameTier = 0;
                if (victim.gunGameTier > 0) {
                    victim.gunGameTier--;
                    victim.selectedWeaponIndex = victim.gunGameTier;
                    victim.isReloading = false;
                    victim.reloadTimer = 0;
                    victim.weaponSwapTimer = 0.15;
                    const wep = (typeof WEAPONS !== 'undefined' && WEAPONS[victim.selectedWeaponIndex]) ? WEAPONS[victim.selectedWeaponIndex] : null;
                    if (wep && victim.ammo) {
                        victim.ammo[victim.selectedWeaponIndex] = wep.magSize || 10;
                    }
                    if (victim.isLocal && window.AudioEngine && window.AudioEngine.playDemoted) {
                        window.AudioEngine.playDemoted();
                    }
                }
            }

            if (killer.gunGameTier >= 5) {
                // Completed all 5 tiers!
                this.finishMatch(`${killer.name} WINS GUN GAME!`);
            } else {
                killer.selectedWeaponIndex = killer.gunGameTier;
                killer.isReloading = false;
                killer.reloadTimer = 0;
                killer.weaponSwapTimer = 0.15;
                const wep = (typeof WEAPONS !== 'undefined' && WEAPONS[killer.selectedWeaponIndex]) ? WEAPONS[killer.selectedWeaponIndex] : null;
                if (wep && killer.ammo) {
                    killer.ammo[killer.selectedWeaponIndex] = wep.magSize || 10;
                }
                if (killer.isLocal) {
                    if (window.AudioEngine) window.AudioEngine.playKillstreak();
                }
            }
        }

        // Multikill tracking for local player
        let announcement = null;
        if (killer.isLocal) {
            this.recentKills++;
            this.multiKillTimer = 4.0; // 4 seconds window

            if (this.mode === 'GUN_GAME') {
                const nextWeapon = (typeof WEAPONS !== 'undefined' && WEAPONS[killer.selectedWeaponIndex]) ? WEAPONS[killer.selectedWeaponIndex].name : 'Glaive';
                announcement = `TIER UP! [${nextWeapon}]`;
            } else if (isParryKill) {
                announcement = 'PARRY REVERSAL!';
            } else if (this.recentKills === 2) {
                announcement = 'DOUBLE KILL!';
            } else if (this.recentKills === 3) {
                announcement = 'TRIPLE KILL!';
            } else if (this.recentKills >= 4) {
                announcement = 'RAMPAGE!';
            } else if (killer.killStreak >= 5) {
                announcement = 'UNSTOPPABLE!';
            }

            if (window.AudioEngine) {
                window.AudioEngine.playHitMarker(true);
                if (this.recentKills >= 2) {
                    window.AudioEngine.playMultikill(this.recentKills);
                } else if (announcement) {
                    window.AudioEngine.playKillstreak();
                }
            }

            if (announcement) {
                const rend = (window.game && window.game.renderer) || window.RendererInstance;
                if (rend && rend.showAnnouncement) {
                    const color = this.recentKills >= 4 ? '#ef4444' : (this.recentKills === 3 ? '#a855f7' : (this.recentKills === 2 ? '#f59e0b' : '#00f0ff'));
                    rend.showAnnouncement(announcement, color);
                }
            }
        }

        // Add to killfeed with distance telemetry
        const dist = Math.max(1, Math.round(Math.hypot(killer.x - victim.x, killer.y - victim.y) / 22));
        this.killfeed.unshift({
            killerName: killer.name,
            killerColor: killer.baseColor,
            victimName: victim.name,
            victimColor: victim.baseColor,
            weapon: isParryKill ? 'PARRY' : weaponName,
            distance: dist,
            isParry: isParryKill,
            timestamp: performance.now()
        });

        // Check Win Condition for FFA / TDM
        if (this.mode === 'FFA') {
            if (killer.kills >= this.scoreLimit) {
                this.finishMatch(killer.name + ' WINS!');
            }
        } else if (this.mode === 'TDM') {
            if (this.teamScores.blue >= this.scoreLimit) {
                this.finishMatch('BLUE TEAM WINS!');
            } else if (this.teamScores.red >= this.scoreLimit) {
                this.finishMatch('RED TEAM WINS!');
            }
        }

        return announcement;
    }

    endMatchByTime(players) {
        if (!players || players.length === 0) {
            this.finishMatch('Nobody WINS!');
            return;
        }

        if (this.mode === 'GUN_GAME') {
            let topPlayer = players[0];
            for (let i = 1; i < players.length; i++) {
                const pTier = players[i].gunGameTier || 0;
                const topTier = topPlayer ? (topPlayer.gunGameTier || 0) : 0;
                if (pTier > topTier || (pTier === topTier && players[i].kills > (topPlayer ? topPlayer.kills : 0))) {
                    topPlayer = players[i];
                }
            }
            this.finishMatch((topPlayer ? topPlayer.name : 'Nobody') + ' WINS!');
        } else if (this.mode === 'FFA') {
            let topPlayer = players[0];
            for (let i = 1; i < players.length; i++) {
                if (players[i].kills > topPlayer.kills) topPlayer = players[i];
            }
            this.finishMatch((topPlayer ? topPlayer.name : 'Nobody') + ' WINS!');
        } else if (this.mode === 'ZONE_CONTROL' && (!players[0] || !players[0].team)) {
            // Solo Zone Control (FFA): evaluate highest solo capture score
            let topPlayer = players[0];
            let topScore = (topPlayer && this.soloScores[topPlayer.id]) || 0;
            for (let i = 1; i < players.length; i++) {
                const s = this.soloScores[players[i].id] || 0;
                if (s > topScore || (s === topScore && players[i].kills > (topPlayer ? topPlayer.kills : 0))) {
                    topPlayer = players[i];
                    topScore = s;
                }
            }
            this.finishMatch((topPlayer ? topPlayer.name : 'Nobody') + ' WINS ZONE CONTROL!');
        } else {
            if (this.teamScores.blue > this.teamScores.red) {
                this.finishMatch('BLUE TEAM WINS!');
            } else if (this.teamScores.red > this.teamScores.blue) {
                this.finishMatch('RED TEAM WINS!');
            } else {
                this.finishMatch('DRAW MATCH!');
            }
        }
    }

    finishMatch(winnerText) {
        if (this.isMatchOver) return;
        this.isMatchOver = true;
        this.winner = winnerText;
        this.victorySlowTimer = 1.2; // 1.2s cinematic slow-motion finish
        this.timeScale = 0.35;
    }
}

window.GameModeManager = GameModeManager;
window.GameMode = GameModeManager;
