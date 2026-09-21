/**
 * BotAI.js
 * Tactical smart AI for offline play or filling match slots.
 * Features line-of-sight checks, range-based positioning, strafing, evasive dashing,
 * predictive aiming, parrying, and difficulty scaling (Recruit, Veteran, Apex Nightmare).
 */

class BotController {
    constructor(player, game, difficulty = 'veteran') {
        this.player = player;
        this.game = game;
        this.difficulty = difficulty || (game && game.botDifficulty) || 'veteran';

        this.reactionTimer = 0;
        this.target = null;
        this.strafeDirection = 1;
        this.strafeTimer = 0;
        this.parryReactionTimer = 0;
        this.pingCooldownTimer = Math.random() * 4.0;
        this.stuckTimer = 0;
        
        // Weapon specialization per bot (supports all 5 weapons including Neon Glaive)
        const availableWeapons = [0, 1, 2, 3, 4];
        const ruleMutator = this.game && this.game.gameMode && this.game.gameMode.customRules && this.game.gameMode.customRules.weaponMutator;
        const directMutator = this.game && (this.game.mutator || (this.game.mutators && (this.game.mutators.snipers_only || this.game.mutators.shotguns_only || this.game.mutators.instagib)));
        const hasMutator = (ruleMutator && ruleMutator !== 'all') || !!directMutator;

        const isGunGame = this.game && this.game.gameMode && this.game.gameMode.mode === 'GUN_GAME';

        if (hasMutator) {
            this.preferredWeapon = this.player.selectedWeaponIndex;
        } else if (isGunGame) {
            this.preferredWeapon = 0;
            this.player.selectedWeaponIndex = 0;
            this.player.gunGameTier = 0;
        } else {
            this.preferredWeapon = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
            this.player.selectedWeaponIndex = this.preferredWeapon;
        }

        // Difficulty Tuning Parameters
        this.setupDifficultyParameters();
    }

    setupDifficultyParameters() {
        if (this.difficulty === 'recruit') {
            this.reactionInterval = 0.28;
            this.aimLeadMultiplier = 0.35;
            this.parryChance = 0.25;
            this.evasionChance = 0.02;
            this.seeksPowerUps = false;
        } else if (this.difficulty === 'apex') {
            this.reactionInterval = 0.05;
            this.aimLeadMultiplier = 1.0;
            this.parryChance = 0.92;
            this.evasionChance = 0.12;
            this.seeksPowerUps = true;
        } else {
            // Veteran (Default)
            this.reactionInterval = 0.14;
            this.aimLeadMultiplier = 0.72;
            this.parryChance = 0.55;
            this.evasionChance = 0.05;
            this.seeksPowerUps = true;
        }
    }

    /**
     * Phase 11: Dynamic obstacle calculation merging static geometry with active/warning hazards.
     */
    getDynamicObstacles() {
        const obs = (this.game.obstacles && this.game.obstacles.length > 0) ? [...this.game.obstacles] : [];
        const map = (this.game.mapManager && this.game.mapManager.currentMap) ? this.game.mapManager.currentMap : null;
        if (!map) return obs;

        // The Crucible: pulsating deadly laser beams
        if (map.hazards && map.hazards.length > 0) {
            for (let h of map.hazards) {
                if (h.state === 'warning' || h.state === 'active') {
                    obs.push({
                        x: h.x - 20,
                        y: h.y - 20,
                        w: h.w + 40,
                        h: h.h + 40,
                        isHazard: true
                    });
                }
            }
        }

        // Orbital Foundry: pulsing plasma reactor core
        if (map.plasmaCore && (map.plasmaCore.state === 'warning' || map.plasmaCore.state === 'active')) {
            const core = map.plasmaCore;
            const r = (core.blastRadius || 260) + 30;
            obs.push({
                x: core.x - r,
                y: core.y - r,
                w: r * 2,
                h: r * 2,
                isHazard: true
            });
        }

        return obs;
    }

    isPointInHazard(px, py) {
        const map = (this.game.mapManager && this.game.mapManager.currentMap) ? this.game.mapManager.currentMap : null;
        if (!map) return false;

        if (map.hazards && map.hazards.length > 0) {
            for (let h of map.hazards) {
                if (h.state === 'warning' || h.state === 'active') {
                    if (px >= (h.x - 20) && px <= (h.x + h.w + 20) &&
                        py >= (h.y - 20) && py <= (h.y + h.h + 20)) {
                        return true;
                    }
                }
            }
        }

        if (map.plasmaCore && (map.plasmaCore.state === 'warning' || map.plasmaCore.state === 'active')) {
            const core = map.plasmaCore;
            const dist = Math.hypot(px - core.x, py - core.y);
            if (dist < (core.blastRadius || 260) + 30) {
                return true;
            }
        }

        return false;
    }

    checkHazardDanger(dt) {
        const map = (this.game.mapManager && this.game.mapManager.currentMap) ? this.game.mapManager.currentMap : null;
        if (!map) return false;

        // 1. Crucible Laser Beams
        if (map.hazards && map.hazards.length > 0) {
            for (let h of map.hazards) {
                if (h.state === 'warning' || h.state === 'active') {
                    const inX = this.player.x >= (h.x - 15) && this.player.x <= (h.x + h.w + 15);
                    const inY = this.player.y >= (h.y - 15) && this.player.y <= (h.y + h.h + 15);
                    if (inX && inY) {
                        let escX = 0;
                        let escY = 0;
                        if (h.w >= h.h) {
                            // Horizontal beam: escape along Y axis
                            escY = this.player.y < (h.y + h.h / 2) ? -1 : 1;
                        } else {
                            // Vertical beam: escape along X axis
                            escX = this.player.x < (h.x + h.w / 2) ? -1 : 1;
                        }
                        this.player.applyMovement(escX, escY, dt);
                        if (Math.random() < 0.6) {
                            this.player.attemptDash(escX, escY);
                        } else {
                            this.player.attemptSlide(escX, escY);
                        }
                        return true;
                    }
                }
            }
        }

        // 2. Orbital Foundry Plasma Core
        if (map.plasmaCore && (map.plasmaCore.state === 'warning' || map.plasmaCore.state === 'active')) {
            const core = map.plasmaCore;
            const dist = Math.hypot(this.player.x - core.x, this.player.y - core.y);
            const dangerDist = (core.blastRadius || 260) + 35;
            if (dist < dangerDist) {
                const escAngle = Math.atan2(this.player.y - core.y, this.player.x - core.x);
                const escX = Math.cos(escAngle);
                const escY = Math.sin(escAngle);
                this.player.applyMovement(escX, escY, dt);
                if (Math.random() < 0.6) {
                    this.player.attemptDash(escX, escY);
                } else {
                    this.player.attemptSlide(escX, escY);
                }
                return true;
            }
        }

        return false;
    }

    findCoverPosition(target) {
        const obstacles = this.getDynamicObstacles();
        if (!obstacles || obstacles.length === 0 || !target) return null;
        let bestCover = null;
        let bestDist = Infinity;
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (obs.isHazard) continue; // Never take cover inside a hazard!
            const ox = obs.x + obs.w / 2;
            const oy = obs.y + obs.h / 2;
            const toObsAngle = Math.atan2(oy - target.y, ox - target.x);
            const coverX = ox + Math.cos(toObsAngle) * (Math.max(obs.w, obs.h) * 0.6 + 25);
            const coverY = oy + Math.sin(toObsAngle) * (Math.max(obs.w, obs.h) * 0.6 + 25);

            // Avoid cover positions located within hazards
            if (this.isPointInHazard(coverX, coverY)) continue;

            const d = Physics.dist(this.player.x, this.player.y, coverX, coverY);
            if (d < bestDist && !Physics.hasLineOfSight(target.x, target.y, coverX, coverY, obstacles)) {
                bestDist = d;
                bestCover = { x: coverX, y: coverY };
            }
        }
        return bestCover;
    }

    /**
     * Phase 8D / 11: Resolve navigation steering target using dynamic obstacles and hazard avoidance.
     */
    getSteeringTarget(goalX, goalY) {
        const obstacles = this.getDynamicObstacles();

        // Teleporter route awareness:
        // If distance to goal is large (> 850px), check if a nearby teleporter offers a substantial shortcut
        const distDirect = Math.hypot(goalX - this.player.x, goalY - this.player.y);
        if (distDirect > 850 && this.game.mapManager && this.game.mapManager.currentMap && this.game.mapManager.currentMap.teleporters) {
            const teleporters = this.game.mapManager.currentMap.teleporters;
            for (let tp of teleporters) {
                const distToTp = Math.hypot(tp.x - this.player.x, tp.y - this.player.y);
                if (distToTp < 550) {
                    const targetTp = teleporters.find(t => t.id === tp.targetId);
                    if (targetTp) {
                        const distFromExitToGoal = Math.hypot(goalX - targetTp.x, goalY - targetTp.y);
                        // If taking the portal saves at least 320px travel distance
                        if (distToTp + distFromExitToGoal < distDirect - 320) {
                            return { x: tp.x, y: tp.y };
                        }
                    }
                }
            }
        }

        if (!obstacles || obstacles.length === 0) return { x: goalX, y: goalY };
        if (Physics.hasLineOfSight(this.player.x, this.player.y, goalX, goalY, obstacles)) {
            return { x: goalX, y: goalY };
        }

        if (this.game.mapManager && this.game.mapManager.findPath) {
            const path = this.game.mapManager.findPath(this.player.x, this.player.y, goalX, goalY, obstacles);
            if (path && path.length > 0) {
                let targetNode = path[0];
                const distToNode = Math.hypot(targetNode.x - this.player.x, targetNode.y - this.player.y);
                if (distToNode < 35 && path.length > 1) {
                    targetNode = path[1];
                }
                return targetNode;
            }
        }
        return { x: goalX, y: goalY };
    }

    update(dt) {
        if (this.player.isDead) return;

        // Phase 11: Emergency Environmental Hazard Evasion
        if (this.checkHazardDanger(dt)) {
            return;
        }

        this.reactionTimer -= dt;
        this.strafeTimer -= dt;
        this.pingCooldownTimer -= dt;

        // Switch strafe direction periodically
        if (this.strafeTimer <= 0) {
            this.strafeDirection *= -1;
            this.strafeTimer = (this.difficulty === 'apex' ? 0.6 : 1.0) + Math.random() * 1.2;
        }

        // Parkour Wall Kick Reflex
        if (this.player.wallContactTimer > 0 && (this.player.health < 60 || this.difficulty === 'apex')) {
            this.player.attemptWallKick((x, y, color, count, speed, normal) => {
                if (this.game.renderer) this.game.renderer.spawnParticles(x, y, color, count, speed, normal);
            });
        }

        // --- Tactical Reaction Tick ---
        if (this.reactionTimer <= 0) {
            this.reactionTimer = this.reactionInterval;
            this.target = this.findBestTarget();
        }

        // --- Tactical Cover Seeking (Vitals critical OR Magazine Reload Retreat - Phase 8D) ---
        let seekingCover = null;
        const curAmmo = this.player.ammo ? this.player.ammo[this.player.selectedWeaponIndex] : 20;
        const needsReload = this.player.isReloading || curAmmo <= 0;
        if (this.target && (needsReload || (this.player.shield <= 0 && this.player.health < 45)) && this.difficulty !== 'recruit') {
            seekingCover = this.findCoverPosition(this.target);
            if (curAmmo <= 0 && !this.player.isReloading) {
                this.player.attemptReload();
            }
        }

        // --- Tactical Power-Up Seeking ---
        let seekingPowerUp = null;
        if (!seekingCover && this.seeksPowerUps && this.game.powerUps && (!this.target || this.player.health < 60 || this.difficulty === 'apex')) {
            let closestPowerUpDist = 1400;
            for (let pu of this.game.powerUps) {
                if (!pu.isActive) continue;
                const pDist = Physics.dist(this.player.x, this.player.y, pu.x, pu.y);
                if (pDist < closestPowerUpDist) {
                    closestPowerUpDist = pDist;
                    seekingPowerUp = pu;
                }
            }
        }

        // --- Tactical Zone Control Objective Seeking (Phase 15) ---
        let seekingZone = null;
        if (!seekingCover && this.game.gameMode && this.game.gameMode.mode === 'ZONE_CONTROL' && this.game.gameMode.zone) {
            const zone = this.game.gameMode.zone;
            const isOurZone = zone.owner && (zone.owner === this.player.team || zone.owner === this.player.id);
            const distToZone = Physics.dist(this.player.x, this.player.y, zone.x, zone.y);
            // If zone is uncaptured, contested, enemy-owned, or bot is outside perimeter
            if (!isOurZone || zone.contested || distToZone > zone.radius * 0.85) {
                seekingZone = zone;
            }
        }
        this.seekingZone = !!seekingZone;

        if (!this.target && !seekingPowerUp && !seekingCover && !seekingZone) {
            // Idle roam or search
            this.player.applyMovement(Math.cos(this.player.angle), Math.sin(this.player.angle), dt);
            return;
        }

        let moveX = 0;
        let moveY = 0;

        // Priority 1: Seeking Cover
        if (seekingCover) {
            const navGoal = this.getSteeringTarget(seekingCover.x, seekingCover.y);
            const coverAngle = Math.atan2(navGoal.y - this.player.y, navGoal.x - this.player.x);
            moveX = Math.cos(coverAngle);
            moveY = Math.sin(coverAngle);
            if (Math.random() < this.evasionChance * 1.6) {
                this.player.attemptDash(moveX, moveY);
            }
        }
        // Priority 2: Seeking Power-Up
        else if (seekingPowerUp) {
            const navGoal = this.getSteeringTarget(seekingPowerUp.x, seekingPowerUp.y);
            const puAngle = Math.atan2(navGoal.y - this.player.y, navGoal.x - this.player.x);
            moveX += Math.cos(puAngle);
            moveY += Math.sin(puAngle);
            if (this.difficulty === 'apex' && Math.random() < 0.04) {
                this.player.attemptSlide(moveX, moveY);
            }
        }
        // Priority 3: Seeking / Defending Capture Zone (Phase 15)
        else if (seekingZone) {
            const distToZone = Physics.dist(this.player.x, this.player.y, seekingZone.x, seekingZone.y);
            if (distToZone > seekingZone.radius * 0.6) {
                const navGoal = this.getSteeringTarget(seekingZone.x, seekingZone.y);
                const zoneAngle = Math.atan2(navGoal.y - this.player.y, navGoal.x - this.player.x);
                moveX += Math.cos(zoneAngle);
                moveY += Math.sin(zoneAngle);
                if (this.difficulty === 'apex' && Math.random() < 0.04) {
                    this.player.attemptSlide(moveX, moveY);
                }
            } else {
                // Patrol / hold zone
                const patrolAngle = this.player.angle + (Math.PI / 2) * this.strafeDirection;
                moveX += Math.cos(patrolAngle) * 0.45;
                moveY += Math.sin(patrolAngle) * 0.45;
            }
        }

        if (this.target) {
            const dist = Physics.dist(this.player.x, this.player.y, this.target.x, this.target.y);
            const hasLoS = Physics.hasLineOfSight(
                this.player.x, this.player.y,
                this.target.x, this.target.y,
                this.game.obstacles
            );

            // Calculate aim angle with predictive leading tuned by difficulty
            const wep = WEAPONS[this.player.selectedWeaponIndex] || WEAPONS[0];
            const bulletSpeed = wep.speed;
            const timeToHit = dist / bulletSpeed;
            const predictedX = this.target.x + (this.target.vx || 0) * timeToHit * this.aimLeadMultiplier;
            const predictedY = this.target.y + (this.target.vy || 0) * timeToHit * this.aimLeadMultiplier;
            this.player.angle = Math.atan2(predictedY - this.player.y, predictedX - this.player.x);

            // --- Tactical Movement towards/away from target ---
            if (!seekingPowerUp && !seekingCover) {
                if (!hasLoS) {
                    // Navigate around obstacles using A* Waypoint Pathfinding (Phase 8D)
                    const navGoal = this.getSteeringTarget(this.target.x, this.target.y);
                    const navAngle = Math.atan2(navGoal.y - this.player.y, navGoal.x - this.player.x);
                    moveX += Math.cos(navAngle);
                    moveY += Math.sin(navAngle);
                } else {
                    const angleToTarget = Math.atan2(this.target.y - this.player.y, this.target.x - this.player.x);

                    // Optimal distance depends on weapon
                    let idealDistance = 300;
                    if (this.player.selectedWeaponIndex === 1) idealDistance = 130; // Shotgun = rush close
                    if (this.player.selectedWeaponIndex === 2) idealDistance = 560; // Sniper = stay back
                    if (this.player.selectedWeaponIndex === 4) idealDistance = 160; // Neon Glaive = rush CQB

                    if (dist > idealDistance + 60) {
                        moveX += Math.cos(angleToTarget);
                        moveY += Math.sin(angleToTarget);
                    } else if (dist < idealDistance - 60) {
                        moveX -= Math.cos(angleToTarget);
                        moveY -= Math.sin(angleToTarget);
                    }

                    // Circle-strafe perpendicular to target
                    const strafeAngle = angleToTarget + (Math.PI / 2) * this.strafeDirection;
                    moveX += Math.cos(strafeAngle) * 0.75;
                    moveY += Math.sin(strafeAngle) * 0.75;
                }
            }

            // Jump Pad traversal logic
            if (this.game.mapManager && this.game.mapManager.currentMap && this.game.mapManager.currentMap.jumpPads) {
                const pads = this.game.mapManager.currentMap.jumpPads;
                for (let k = 0; k < pads.length; k++) {
                    const pad = pads[k];
                    const padDist = Physics.dist(this.player.x, this.player.y, pad.x, pad.y);
                    if (padDist < 140 && padDist > 30 && (this.difficulty === 'apex' || (seekingCover && Math.random() < 0.35))) {
                        const padAngle = Math.atan2(pad.y - this.player.y, pad.x - this.player.x);
                        moveX += Math.cos(padAngle) * 0.55;
                        moveY += Math.sin(padAngle) * 0.55;
                        break;
                    }
                }
            }

            // --- Firing ---
            if (hasLoS && dist < 800 && !this.player.isReloading) {
                const spawned = [];
                const fired = this.player.attemptFire((bullet) => {
                    this.game.bullets.push(bullet);
                    spawned.push(bullet.serialize ? bullet.serialize() : bullet);
                });
                if (fired && this.game.network && this.game.network.isOnline && this.game.network.isHost && spawned.length > 0) {
                    this.game.network.broadcastToClients({
                        type: 'SPAWN_BULLETS',
                        bullets: spawned
                    });
                }
                if (!fired && curAmmo <= 0) {
                    this.player.attemptReload();
                }
            }

            // --- Tactical EMP Supernova Trigger (Phase 5) ---
            if (this.player.ultimateCharge >= 100 && (dist < 280 || this.player.health < 40)) {
                this.player.attemptUltimate((x, y, p) => {
                    if (this.game.triggerSupernova) {
                        this.game.triggerSupernova(x, y, p);
                    }
                });
            }

            // --- Tactical Team Ping (Phase 6/7) ---
            if (this.pingCooldownTimer <= 0 && (this.difficulty === 'apex' || this.difficulty === 'veteran')) {
                if (this.game.gameMode && (this.game.gameMode.mode === 'TDM' || this.game.gameMode.mode === 'ZONE_CONTROL')) {
                    this.pingCooldownTimer = 9.0 + Math.random() * 4.0;
                    if (this.game.addPing) {
                        this.game.addPing(this.target.x, this.target.y, 'enemy', this.player);
                    }
                }
            }

            // --- Evasive Dash / Slide when under pressure ---
            if (this.player.health < 45 && Math.random() < this.evasionChance) {
                this.player.attemptDash(moveX, moveY);
            } else if (this.difficulty === 'apex' && dist < 220 && Math.random() < 0.05) {
                this.player.attemptSlide(moveX, moveY);
            }
        }

        // --- Tactical Adaptive Weapon Switching (when not in Gun Game or Mutator match) ---
        const ruleMutator = this.game.gameMode && this.game.gameMode.customRules && this.game.gameMode.customRules.weaponMutator;
        const directMutator = this.game.mutator || (this.game.mutators && (this.game.mutators.snipers_only || this.game.mutators.shotguns_only || this.game.mutators.instagib));
        const hasMutator = (ruleMutator && ruleMutator !== 'all') || !!directMutator;
        if (this.target && (!this.game.gameMode || this.game.gameMode.mode !== 'GUN_GAME') && !hasMutator) {
            const targetDist = Physics.dist(this.player.x, this.player.y, this.target.x, this.target.y);
            if (targetDist < 180 && this.player.selectedWeaponIndex === 2) {
                this.player.setWeapon(1); // Swap sniper to shotgun CQB
            } else if (targetDist > 380 && (this.player.selectedWeaponIndex === 1 || this.player.selectedWeaponIndex === 4)) {
                this.player.setWeapon(this.preferredWeapon === 2 ? 2 : 0); // Swap shotgun/glaive to ranged
            }
        }

        // Phase 11: Steer away from hazards if movement vector leads into active hazard
        if (moveX !== 0 || moveY !== 0) {
            const lookahead = 65;
            if (this.isPointInHazard(this.player.x + moveX * lookahead, this.player.y + moveY * lookahead)) {
                moveX *= -1;
                moveY *= -1;
            }
        }

        // Phase 12: Corner-Stuck Detection & Whisker Steering (Esports AI Polish)
        const isTryingToMove = (moveX !== 0 || moveY !== 0);
        const curSpeed = Math.hypot(this.player.vx || 0, this.player.vy || 0);

        if (isTryingToMove && curSpeed < 18) {
            this.stuckTimer = (this.stuckTimer || 0) + dt;
            if (this.stuckTimer > 0.28) {
                // Cast diagonal whiskers to detect clear path around corner
                const desiredAngle = Math.atan2(moveY, moveX);
                const whiskerDist = 55;
                const obstacles = this.getDynamicObstacles();

                const leftAngle = desiredAngle - Math.PI / 4;
                const rightAngle = desiredAngle + Math.PI / 4;

                const leftX = this.player.x + Math.cos(leftAngle) * whiskerDist;
                const leftY = this.player.y + Math.sin(leftAngle) * whiskerDist;
                const rightX = this.player.x + Math.cos(rightAngle) * whiskerDist;
                const rightY = this.player.y + Math.sin(rightAngle) * whiskerDist;

                const leftClear = (typeof Physics !== 'undefined' && Physics.hasLineOfSight(this.player.x, this.player.y, leftX, leftY, obstacles)) && !this.isPointInHazard(leftX, leftY);
                const rightClear = (typeof Physics !== 'undefined' && Physics.hasLineOfSight(this.player.x, this.player.y, rightX, rightY, obstacles)) && !this.isPointInHazard(rightX, rightY);

                let deflectAngle = desiredAngle;
                if (leftClear && !rightClear) {
                    deflectAngle = desiredAngle - Math.PI / 2;
                } else if (rightClear && !leftClear) {
                    deflectAngle = desiredAngle + Math.PI / 2;
                } else if (leftClear && rightClear) {
                    deflectAngle = desiredAngle + (this.strafeDirection * Math.PI / 2);
                } else {
                    deflectAngle = desiredAngle + Math.PI;
                }

                moveX = Math.cos(deflectAngle);
                moveY = Math.sin(deflectAngle);

                // If stuck longer than 0.55s, trigger evasive dash to instantly break free
                if (this.stuckTimer > 0.55) {
                    this.player.attemptDash(moveX, moveY);
                    this.stuckTimer = 0;
                }
            }
        } else {
            this.stuckTimer = 0;
        }

        this.player.applyMovement(moveX, moveY, dt);

        // --- Check incoming bullets to Parry! ---
        this.checkIncomingBulletsToParry();
    }

    checkIncomingBulletsToParry() {
        if (this.player.isParrying || this.player.parryCooldownTimer > 0) return;

        const checkDist = this.difficulty === 'apex' ? 220 : 140;
        const maxAngleDiff = this.difficulty === 'apex' ? 0.6 : 0.4;
        const isTeamMode = this.game.gameMode && (this.game.gameMode.mode === 'TDM' || this.game.gameMode.mode === 'ZONE_CONTROL');

        for (let i = 0; i < this.game.bullets.length; i++) {
            const b = this.game.bullets[i];
            if (b.ownerId === this.player.id || b.isDead) continue;
            if (isTeamMode && b.ownerTeam && this.player.team && b.ownerTeam === this.player.team) continue;

            const dist = Physics.dist(this.player.x, this.player.y, b.x, b.y);
            if (dist < checkDist) {
                // Line of sight check: do not waste parry if bullet is separated by solid cover
                if (this.game.obstacles && !Physics.hasLineOfSight(this.player.x, this.player.y, b.x, b.y, this.game.obstacles)) {
                    continue;
                }

                // Check if bullet is heading towards bot (Phase 17: circular wraparound normalized)
                const bAngle = Math.atan2(b.vy, b.vx);
                const angleToBot = Math.atan2(this.player.y - b.y, this.player.x - b.x);
                const diff = Math.abs(Math.atan2(Math.sin(bAngle - angleToBot), Math.cos(bAngle - angleToBot)));

                if (diff < maxAngleDiff && Math.random() < this.parryChance) {
                    this.player.attemptParry();
                    break;
                }
            }
        }
    }

    findBestTarget() {
        let bestTarget = null;
        let minDist = Infinity;
        const isTeamMode = this.game.gameMode && (this.game.gameMode.mode === 'TDM' || this.game.gameMode.mode === 'ZONE_CONTROL');

        const allPlayers = (this.game && this.game.players) ? this.game.players : [];
        for (let i = 0; i < allPlayers.length; i++) {
            const p = allPlayers[i];
            if (p.id === this.player.id || p.isDead) continue;
            // In team modes, ignore teammates
            if (isTeamMode && p.team && this.player.team && p.team === this.player.team) continue;

            const dist = Physics.dist(this.player.x, this.player.y, p.x, p.y);
            const hasLoS = this.game.obstacles ? Physics.hasLineOfSight(this.player.x, this.player.y, p.x, p.y, this.game.obstacles) : true;
            // Prioritize enemies with direct line-of-sight over enemies occluded by obstacles
            const effectiveDist = hasLoS ? dist : dist + 500;

            if (effectiveDist < minDist) {
                minDist = effectiveDist;
                bestTarget = p;
            }
        }
        return bestTarget;
    }
}

window.BotController = BotController;
window.BotAI = BotController;
