/**
 * Player.js
 * Comprehensive Player Entity logic:
 * Kinetic movement, Dash with i-frames, Parry deflector bubble, Shield auto-regen, and Weapon firing.
 */

class Player {
    constructor(id, name, isLocal = false, team = null, title = null, customSkinColor = null) {
        this.id = id;
        this.name = name || 'Operator';
        this.isLocal = isLocal;
        this.team = team; // 'blue', 'red', or null for FFA

        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 18;
        this.angle = 0;
        this.targetAngle = 0;

        // Vitals
        this.maxHealth = 100;
        this.health = 100;
        this.maxShield = 50;
        this.shield = 50;
        this.timeSinceLastHit = 0;

        // Energy (Dash & Parry resource)
        this.maxEnergy = 100;
        this.energy = 100;

        // Speed stats
        this.baseSpeed = 380;
        this.speedMultiplier = 1.0;
        this.isInstagib = false;
        this.friction = 0.86;

        // Dash mechanic
        this.isDashing = false;
        this.dashDuration = 0.18; // Seconds of invulnerability
        this.dashTimer = 0;
        this.dashCooldown = 0.65;
        this.dashCooldownTimer = 0;
        this.dashVx = 0;
        this.dashVy = 0;
        this.dashGhosts = [];

        // Slide mechanic (Advanced Movement Tech)
        this.isSliding = false;
        this.slideDuration = 0.35;
        this.slideTimer = 0;
        this.slideCooldown = 0.8;
        this.slideCooldownTimer = 0;
        this.slideVx = 0;
        this.slideVy = 0;

        // Visual Polish: Recoil Kickback & Muzzle Flash
        this.recoilKick = 0;
        this.muzzleFlashTimer = 0;

        // Parry mechanic
        this.isParrying = false;
        this.parryDuration = 0.28; // Active deflection window
        this.parryTimer = 0;
        this.parryCooldown = 1.1;
        this.parryCooldownTimer = 0;
        this.parrySuccessAnim = 0;

        // Weapons & Tactical Ammo Economy
        this.selectedWeaponIndex = 0;
        this.fireCooldownTimer = 0;
        this.ammo = [20, 6, 4, 5, 9];
        this.isReloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 0;
        this.weaponSwapTimer = 0;

        // Tactical Ultimate: EMP Supernova
        this.ultimateCharge = 0; // 0 to 100%
        this.teleportCooldown = 0; // Quantum warp anti-loop timer
        this.jumpCooldown = 0; // Kinetic jump pad cooldown
        this.jumpTimer = 0; // Kinetic aerial leap duration
        this.killerInfo = null; // Holographic Death Recap info { name, team, color, weaponName, distance }

        // Kinetic Parkour & Combos (Grand Overhaul)
        this.wallContactTimer = 0;
        this.wallKickCooldown = 0;
        this.lastWallHitBox = null;
        this.glaiveComboStep = 0;
        this.lastGlaiveSwingTime = 0;
        this.lungeTimer = 0; // Kinetic forward lunge window during melee slashes
        this.slideCancelBonus = false;
        this.stepDistanceAccumulator = 0;
        this.slideFrictionTimer = 0;

        // Scoring & Life
        this.kills = 0;
        this.deaths = 0;
        this.score = 0;
        this.killStreak = 0;
        this.parriesCount = 0;
        this.title = title || (isLocal && window.ProgressionManager ? window.ProgressionManager.getTitle() : 'Operative');
        this.isDead = false;
        this.respawnTimer = 0;

        // Timed Power-Up Buffs
        this.overdriveTimer = 0;
        this.phaseTimer = 0;
        this.powerUpsCollected = 0;
        this.spawnProtectionTimer = 0; // Invulnerability window on respawn
        this._hazardDamageAccum = 0; // Precision floating-point accumulator for environmental hazards

        // Visuals & Color
        let skinColor = customSkinColor;
        if (!skinColor && isLocal && window.ProgressionManager) {
            skinColor = window.ProgressionManager.getSelectedSkin().color;
        }
        this.baseColor = team === 'red' ? '#ef4444' : (team === 'blue' ? '#3b82f6' : (skinColor || (isLocal ? '#00f0ff' : '#a855f7')));
    }

    spawn(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.health = this.maxHealth;
        this.shield = this.maxShield;
        this.energy = this.maxEnergy;
        this.isDead = false;
        this.respawnTimer = 0;
        this.isDashing = false;
        this.isSliding = false;
        this.isParrying = false;
        this.lungeTimer = 0;
        this.spawnProtectionTimer = 1.5; // 1.5s invulnerability shield
        this.overdriveTimer = 0;
        this.phaseTimer = 0;
        this._hazardDamageAccum = 0;
        this.teleportCooldown = 0;
        this.jumpCooldown = 0;
        this.jumpTimer = 0;
        this.wallContactTimer = 0;
        this.wallKickCooldown = 0;
        this.lastWallHitBox = null;
        this.glaiveComboStep = 0;
        this.lastGlaiveSwingTime = 0;
        this.slideCancelBonus = false;
        this.killerInfo = null;

        // Reset ammo magazines to full capacity
        const magSizes = (typeof WEAPONS !== 'undefined') ? WEAPONS.map(w => w.magSize || 10) : [20, 6, 4, 5, 9];
        this.ammo = [...magSizes];
        this.isReloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 0;
        this.weaponSwapTimer = 0;
        this.stepDistanceAccumulator = 0;
        this.slideFrictionTimer = 0;
    }

    addUltimateCharge(amount) {
        if (this.isDead) return;
        this.ultimateCharge = Math.min(100, Math.max(0, this.ultimateCharge + amount));
    }

    attemptUltimate(onSupernova) {
        if (this.isDead || this.ultimateCharge < 100) return false;
        this.ultimateCharge = 0;
        if (onSupernova) {
            onSupernova(this.x, this.y, this);
        }
        return true;
    }

    update(dt, obstacles, onSpawnBullet, onSpawnParticles) {
        if (this.isDead) {
            this.respawnTimer -= dt;
            return;
        }

        if (this.isLocal && window.AudioEngine && window.AudioEngine.updateListener) {
            window.AudioEngine.updateListener(this.x, this.y, this.angle);
        }

        // --- Timers & Cooldowns ---
        if (this.fireCooldownTimer > 0) this.fireCooldownTimer -= dt;
        if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
        if (this.slideCooldownTimer > 0) this.slideCooldownTimer -= dt;
        if (this.parryCooldownTimer > 0) this.parryCooldownTimer -= dt;
        if (this.parrySuccessAnim > 0) this.parrySuccessAnim -= dt * 3;
        if (this.recoilKick > 0) this.recoilKick = Math.max(0, this.recoilKick - dt * 45);
        if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer -= dt;
        if (this.overdriveTimer > 0) this.overdriveTimer -= dt;
        if (this.phaseTimer > 0) this.phaseTimer -= dt;
        if (this.teleportCooldown > 0) this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);
        if (this.jumpCooldown > 0) this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
        if (this.jumpTimer > 0) this.jumpTimer = Math.max(0, this.jumpTimer - dt);
        if (this.wallContactTimer > 0) this.wallContactTimer = Math.max(0, this.wallContactTimer - dt);
        if (this.wallKickCooldown > 0) this.wallKickCooldown = Math.max(0, this.wallKickCooldown - dt);
        if (this.weaponSwapTimer > 0) this.weaponSwapTimer = Math.max(0, this.weaponSwapTimer - dt);
        if (this.spawnProtectionTimer > 0) this.spawnProtectionTimer = Math.max(0, this.spawnProtectionTimer - dt);
        if (this.lungeTimer > 0) this.lungeTimer = Math.max(0, this.lungeTimer - dt);

        // Tactical Reload Countdown
        if (this.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.isReloading = false;
                this.reloadTimer = 0;
                const wep = WEAPONS[this.selectedWeaponIndex] || WEAPONS[0];
                this.ammo[this.selectedWeaponIndex] = wep.magSize || 20;
                if (this.isLocal && window.AudioEngine && window.AudioEngine.playReloadFinish) {
                    window.AudioEngine.playReloadFinish(wep.id);
                }
            }
        }

        this.timeSinceLastHit += dt;

        // Shield Auto-Regen (after 3.5s of no damage)
        if (this.timeSinceLastHit > 3.5 && this.shield < this.maxShield) {
            this.shield = Math.min(this.maxShield, this.shield + 22 * dt);
        }

        // Energy Regen (38 per second)
        if (this.energy < this.maxEnergy && !this.isDashing && !this.isSliding && !this.isParrying) {
            this.energy = Math.min(this.maxEnergy, this.energy + 38 * dt);
        }

        // --- Dash Update ---
        if (this.isDashing) {
            this.dashTimer -= dt;
            this.x += this.dashVx * dt;
            this.y += this.dashVy * dt;

            // Spawn neon ghost trails
            if (Math.random() < 0.4) {
                this.dashGhosts.push({
                    x: this.x,
                    y: this.y,
                    angle: this.angle,
                    color: this.baseColor,
                    alpha: 0.6
                });
            }

            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        } else if (this.isSliding) {
            // Slide Update (Low hitbox, smooth friction, sparks)
            this.slideTimer -= dt;
            this.radius = 13; // Lower profile hitbox
            this.x += this.slideVx * dt;
            this.y += this.slideVy * dt;
            this.slideVx *= Math.pow(0.92, dt * 60);
            this.slideVy *= Math.pow(0.92, dt * 60);

            if (Math.random() < 0.5 && onSpawnParticles) {
                onSpawnParticles(this.x, this.y, '#00f0ff', 2, 120);
            }

            // Phase 9: Slide friction audio trigger
            this.slideFrictionTimer = (this.slideFrictionTimer || 0) + dt;
            if (this.slideFrictionTimer >= 0.08) {
                this.slideFrictionTimer = 0;
                if (window.AudioEngine && window.AudioEngine.playFootstep) {
                    window.AudioEngine.playFootstep(this.x, this.y, true, false);
                }
            }

            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.radius = 18;
                // Momentum Preservation: carry remaining slide speed into standard velocity
                this.vx = this.slideVx * 0.65;
                this.vy = this.slideVy * 0.65;
            }
        } else {
            // Standard Physics Movement with friction
            this.radius = 18;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            // Apply client friction damping only to local player or bot;
            // Remote players coast with network-synced velocity to prevent inter-packet stutter
            if (this.isLocal || this.isBot) {
                this.vx *= Math.pow(this.friction, dt * 60);
                this.vy *= Math.pow(this.friction, dt * 60);
            }

            // Phase 9: Tactical Footstep audio tracking
            const curSpeed = Math.hypot(this.vx, this.vy);
            if (!this.isDashing && curSpeed > 25) {
                this.stepDistanceAccumulator = (this.stepDistanceAccumulator || 0) + curSpeed * dt;
                const isSprinting = curSpeed > 380;
                const stepThreshold = isSprinting ? 38 : 48;
                if (this.stepDistanceAccumulator >= stepThreshold) {
                    this.stepDistanceAccumulator = 0;
                    if (window.AudioEngine && window.AudioEngine.playFootstep) {
                        window.AudioEngine.playFootstep(this.x, this.y, false, isSprinting);
                    }
                }
            }
        }

        // --- Parry Update ---
        if (this.isParrying) {
            this.parryTimer -= dt;
            if (this.parryTimer <= 0) {
                this.isParrying = false;
            }
        }

        // --- Fade Dash Ghosts ---
        for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
            this.dashGhosts[i].alpha -= dt * 3.5;
            if (this.dashGhosts[i].alpha <= 0) {
                this.dashGhosts.splice(i, 1);
            }
        }

        // --- Obstacle Collision & Wall-Bounce Boost ---
        for (let i = 0; i < obstacles.length; i++) {
            const hit = Physics.resolveCircleBox(this, obstacles[i]);
            if (hit) {
                this.lastWallHitBox = obstacles[i];
                this.wallContactTimer = 0.16;

                if (this.isDashing || this.isSliding) {
                    // Wall-Bounce Kinetic Boost!
                    if (window.AudioEngine && window.AudioEngine.playWallBounce) window.AudioEngine.playWallBounce(this.x, this.y);
                    if (onSpawnParticles) onSpawnParticles(this.x, this.y, '#ffffff', 8, 280);

                    // Surface-Normal Reflection for wall bounce
                    let reflectX, reflectY;
                    if (this.lastWallNormal && (this.lastWallNormal.x !== 0 || this.lastWallNormal.y !== 0)) {
                        const nx = this.lastWallNormal.x;
                        const ny = this.lastWallNormal.y;
                        const inVx = this.isDashing ? this.dashVx : this.slideVx;
                        const inVy = this.isDashing ? this.dashVy : this.slideVy;
                        const dot = inVx * nx + inVy * ny;
                        if (dot < 0) {
                            reflectX = inVx - 2 * dot * nx;
                            reflectY = inVy - 2 * dot * ny;
                            const rLen = Math.hypot(reflectX, reflectY);
                            if (rLen > 0.001) {
                                reflectX /= rLen;
                                reflectY /= rLen;
                            } else {
                                reflectX = nx;
                                reflectY = ny;
                            }
                        } else {
                            reflectX = nx;
                            reflectY = ny;
                        }
                    } else {
                        const box = obstacles[i];
                        const boxCenterX = box.x + box.w / 2;
                        const boxCenterY = box.y + box.h / 2;
                        const angle = Math.atan2(this.y - boxCenterY, this.x - boxCenterX);
                        reflectX = Math.cos(angle);
                        reflectY = Math.sin(angle);
                    }

                    if (this.isDashing) {
                        this.dashVx = reflectX * 1100;
                        this.dashVy = reflectY * 1100;
                    } else if (this.isSliding) {
                        this.slideVx = reflectX * 850;
                        this.slideVy = reflectY * 850;
                    }
                    this.lastWallNormal = null;
                }
            }
        }
    }

    applyMovement(moveX, moveY, dt) {
        if (this.isDead || this.isDashing) return;

        const moveLen = Math.hypot(moveX, moveY);
        if (moveLen > 0.05) {
            const overdriveBoost = this.overdriveTimer > 0 ? 1.25 : 1.0;
            const mult = (this.speedMultiplier || 1.0) * overdriveBoost;
            const normX = moveX / moveLen;
            const normY = moveY / moveLen;

            // Counter-strafing acceleration boost (1.6x when reversing movement vector)
            const dot = this.vx * normX + this.vy * normY;
            const counterBoost = dot < -10 ? 1.6 : 1.0;
            const accel = 2800 * mult * counterBoost;

            this.vx += normX * accel * dt;
            this.vy += normY * accel * dt;

            // Cap to max base speed (exempt during kinetic lunge window)
            if (this.lungeTimer <= 0) {
                const effectiveMax = this.baseSpeed * mult;
                const currentSpeed = Math.hypot(this.vx, this.vy);
                if (currentSpeed > effectiveMax) {
                    this.vx = (this.vx / currentSpeed) * effectiveMax;
                    this.vy = (this.vy / currentSpeed) * effectiveMax;
                }
            }
        } else if (this.isLocal && !this.isSliding && this.lungeTimer <= 0) {
            // Snappy active braking when movement keys are released for crisp counter-strafing
            const brakeDamping = Math.pow(0.72, dt * 60);
            this.vx *= brakeDamping;
            this.vy *= brakeDamping;
            if (Math.hypot(this.vx, this.vy) < 12) {
                this.vx = 0;
                this.vy = 0;
            }
        }
    }

    attemptDash(moveX, moveY) {
        if (this.isDead || this.isDashing || this.dashCooldownTimer > 0 || this.energy < 30) {
            return false;
        }

        // Slide-canceling tech: cancel slide instantly and boost dash momentum
        let dashSpeedMult = 1.0;
        if (this.isSliding) {
            this.isSliding = false;
            this.radius = 18;
            this.slideCancelBonus = true;
            dashSpeedMult = 1.25;
        }

        let dx = moveX;
        let dy = moveY;
        const len = Math.hypot(dx, dy);

        // If no movement key pressed, dash towards aim angle
        if (len < 0.1) {
            dx = Math.cos(this.angle);
            dy = Math.sin(this.angle);
        } else {
            dx /= len;
            dy /= len;
        }

        this.energy -= 30;
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldownTimer = this.dashCooldown;
        const dashSpeed = 950 * (this.speedMultiplier || 1.0) * dashSpeedMult;
        this.dashVx = dx * dashSpeed;
        this.dashVy = dy * dashSpeed;

        if (window.AudioEngine && window.AudioEngine.playDash) window.AudioEngine.playDash(this.x, this.y);
        return true;
    }

    attemptWallKick(onSpawnParticles) {
        if (this.isDead || this.wallKickCooldown > 0 || this.wallContactTimer <= 0 || !this.lastWallHitBox) {
            return false;
        }

        // Slide-canceling into wall kick: cancel slide and boost kinetic kick
        if (this.isSliding) {
            this.isSliding = false;
            this.radius = 18;
            this.slideCancelBonus = true;
        }

        const box = this.lastWallHitBox;
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        let awayAngle;
        if (this.lastWallNormal && (this.lastWallNormal.x !== 0 || this.lastWallNormal.y !== 0)) {
            awayAngle = Math.atan2(this.lastWallNormal.y, this.lastWallNormal.x);
        } else {
            awayAngle = Math.atan2(this.y - cy, this.x - cx);
        }

        // Lateral kinetic impulse away from the obstacle
        const kickSpeed = 820 * (this.speedMultiplier || 1.0);
        this.vx = Math.cos(awayAngle) * kickSpeed;
        this.vy = Math.sin(awayAngle) * kickSpeed;
        this.jumpTimer = 0.38; // Visual jump lift
        this.wallKickCooldown = 0.45;
        this.wallContactTimer = 0;
        this.lastWallHitBox = null;

        // Parkour reward: refund +15 energy
        this.energy = Math.min(this.maxEnergy, this.energy + 15);

        if (window.AudioEngine && window.AudioEngine.playWallKick) {
            window.AudioEngine.playWallKick(this.x, this.y);
        }

        if (onSpawnParticles) {
            const normal = { x: Math.cos(awayAngle), y: Math.sin(awayAngle) };
            onSpawnParticles(this.x, this.y, '#00f0ff', 12, 340, normal);
        }
        return true;
    }

    attemptSlide(moveX, moveY) {
        if (this.isDead || this.isDashing) {
            return false;
        }

        // Slide-cancel: If already sliding, tapping slide again cancels slide and carries momentum into standard velocity
        if (this.isSliding) {
            this.isSliding = false;
            this.radius = 18;
            this.vx = this.slideVx * 0.75;
            this.vy = this.slideVy * 0.75;
            return true;
        }

        if (this.slideCooldownTimer > 0 || this.energy < 20) {
            return false;
        }

        let dx = moveX;
        let dy = moveY;
        const len = Math.hypot(dx, dy);

        if (len < 0.1) {
            dx = Math.cos(this.angle);
            dy = Math.sin(this.angle);
        } else {
            dx /= len;
            dy /= len;
        }

        this.energy -= 20;
        this.isSliding = true;
        this.slideTimer = this.slideDuration;
        this.slideCooldownTimer = this.slideCooldown;
        const slideSpeed = 740 * (this.speedMultiplier || 1.0);
        this.slideVx = dx * slideSpeed;
        this.slideVy = dy * slideSpeed;

        if (window.AudioEngine && window.AudioEngine.playSlide) window.AudioEngine.playSlide(this.x, this.y);
        return true;
    }

    attemptParry() {
        if (this.isDead || this.isParrying || this.parryCooldownTimer > 0 || this.energy < 35) {
            return false;
        }

        // Slide-canceling into parry: cancel slide, reset radius, convert slide momentum into standard velocity
        if (this.isSliding) {
            this.isSliding = false;
            this.radius = 18;
            this.vx = this.slideVx * 0.75;
            this.vy = this.slideVy * 0.75;
        }

        this.energy -= 35;
        this.isParrying = true;
        this.parryTimer = this.parryDuration;
        this.parryCooldownTimer = this.parryCooldown;
        return true;
    }

    setWeapon(index) {
        if (index === this.selectedWeaponIndex || index < 0 || (typeof WEAPONS !== 'undefined' && index >= WEAPONS.length)) return;
        this.selectedWeaponIndex = index;
        if (this.isReloading) {
            this.isReloading = false;
            this.reloadTimer = 0;
        }
        const weapon = (typeof WEAPONS !== 'undefined' && WEAPONS[this.selectedWeaponIndex]) ? WEAPONS[this.selectedWeaponIndex] : { id: 'blaster', equipTime: 0.2 };
        this.weaponSwapTimer = weapon.equipTime || 0.2;
        if (window.AudioEngine) {
            if (window.AudioEngine.playWeaponSwap) {
                window.AudioEngine.playWeaponSwap(weapon.id, this.x, this.y);
            } else if (window.AudioEngine.playWeaponEquip) {
                window.AudioEngine.playWeaponEquip(weapon.id, this.x, this.y);
            }
        }
    }

    attemptReload() {
        if (this.isDead || this.isReloading || this.weaponSwapTimer > 0) return false;
        const weapon = (typeof WEAPONS !== 'undefined' && WEAPONS[this.selectedWeaponIndex]) ? WEAPONS[this.selectedWeaponIndex] : { magSize: 20, reloadTime: 1.1, id: 'blaster' };
        const currentAmmo = this.ammo[this.selectedWeaponIndex];
        const maxAmmo = weapon.magSize || 20;
        if (currentAmmo >= maxAmmo) return false;

        this.isReloading = true;
        this.reloadDuration = weapon.reloadTime || 1.1;
        this.reloadTimer = this.reloadDuration;

        if (this.isLocal && window.AudioEngine && window.AudioEngine.playReloadStart) {
            window.AudioEngine.playReloadStart(weapon.id);
        }
        return true;
    }

    attemptFire(onSpawnBullet, onSpawnCasing) {
        if (this.isDead || this.isDashing || this.isSliding || this.phaseTimer > 0 || this.fireCooldownTimer > 0 || this.weaponSwapTimer > 0 || this.isReloading) {
            return false;
        }

        // Firing immediately forfeits spawn invulnerability
        if (this.spawnProtectionTimer > 0) {
            this.spawnProtectionTimer = 0;
        }

        // Check Magazine Ammo
        if (this.ammo[this.selectedWeaponIndex] <= 0) {
            if (window.AudioEngine) {
                if (window.AudioEngine.playDryFire) {
                    window.AudioEngine.playDryFire(this.x, this.y);
                } else if (window.AudioEngine.playEmptyClick) {
                    window.AudioEngine.playEmptyClick(this.x, this.y);
                }
            }
            this.attemptReload();
            return false;
        }

        this.ammo[this.selectedWeaponIndex]--;
        if (this.ammo[this.selectedWeaponIndex] === 0) {
            this.attemptReload();
        } else if (this.isLocal && this.ammo[this.selectedWeaponIndex] <= 2 && this.selectedWeaponIndex !== 4) {
            // Tactical low-ammo warning chirp for non-melee weapons
            if (window.AudioEngine && window.AudioEngine.playLowAmmoWarning) {
                window.AudioEngine.playLowAmmoWarning();
            }
        }

        const weapon = WEAPONS[this.selectedWeaponIndex] || WEAPONS[0];
        const rateMultiplier = this.overdriveTimer > 0 ? 0.5 : 1.0;
        this.fireCooldownTimer = weapon.fireRate * rateMultiplier;

        // Visual Polish: Recoil Kickback & Muzzle Flash Light
        this.recoilKick = weapon.screenShake * 1.6;
        this.muzzleFlashTimer = 0.08;

        if (this.isLocal) {
            if (window.RendererInstance) {
                const bloomInc = weapon.bloomSpread || 7;
                window.RendererInstance.crosshairBloom = Math.min(18, (window.RendererInstance.crosshairBloom || 0) + bloomInc);
                // Directional Camera Recoil Punch (Phase 24)
                const punch = (weapon.screenShake || 2) * 1.5;
                window.RendererInstance.recoilPunchX = -Math.cos(this.angle) * punch;
                window.RendererInstance.recoilPunchY = -Math.sin(this.angle) * punch;
            }
            if (window.game && window.game.input && window.game.input.triggerHaptic) {
                window.game.input.triggerHaptic('light');
            }
        }

        // Play weapon sound with spatial binaural positioning
        if (window.AudioEngine && window.AudioEngine[weapon.sound]) {
            window.AudioEngine[weapon.sound](this.x, this.y);
        }

        // Neon Glaive 3-Hit Melee Combo
        if (weapon.isMeleeSlash) {
            const now = performance.now() / 1000;
            if (now - this.lastGlaiveSwingTime > 1.1) {
                this.glaiveComboStep = 0;
            }
            this.lastGlaiveSwingTime = now;

            const combo = this.glaiveComboStep;
            // Phase 11: Enhanced Kinetic Lunge on Glaive Slashes
            // Step 0: Slash A (surge 440, dmg 75)
            // Step 1: Slash B (surge 500, dmg 85)
            // Step 2: Whirlwind Finisher (surge 600, 3 spinning blades around player, dmg 110)
            const surgeSpeed = combo === 2 ? 600 : (combo === 1 ? 500 : 440);
            this.lungeTimer = 0.24; // 240ms un-choked kinetic lunge impulse window
            this.vx = Math.cos(this.angle) * surgeSpeed;
            this.vy = Math.sin(this.angle) * surgeSpeed;

            const barrelDist = this.radius + 16;
            const barrelX = this.x + Math.cos(this.angle) * barrelDist;
            const barrelY = this.y + Math.sin(this.angle) * barrelDist;

            if (combo === 2) {
                // Whirlwind Finisher: 3 blades distributed around player
                const bladeAngles = [this.angle, this.angle + 2.0944, this.angle - 2.0944];
                for (let k = 0; k < 3; k++) {
                    const bAngle = bladeAngles[k];
                    const bx = this.x + Math.cos(bAngle) * barrelDist;
                    const by = this.y + Math.sin(bAngle) * barrelDist;
                    const bullet = new Bullet({
                        x: bx,
                        y: by,
                        vx: Math.cos(bAngle) * weapon.speed,
                        vy: Math.sin(bAngle) * weapon.speed,
                        radius: weapon.radius * 1.25,
                        damage: 110,
                        color: '#f43f5e',
                        trailColor: 'rgba(244, 63, 94, 0.6)',
                        ownerId: this.id,
                        ownerTeam: this.team,
                        bounces: weapon.bounces,
                        isExplosive: false,
                        blastRadius: 0,
                        isMeleeSlash: true,
                        maxLife: 0.20,
                        comboStep: 2
                    });
                    onSpawnBullet(bullet);
                }
                this.recoilKick = 8;
            } else {
                const bullet = new Bullet({
                    x: barrelX,
                    y: barrelY,
                    vx: Math.cos(this.angle) * weapon.speed,
                    vy: Math.sin(this.angle) * weapon.speed,
                    radius: weapon.radius,
                    damage: combo === 1 ? 85 : 75,
                    color: combo === 1 ? '#a855f7' : weapon.color,
                    trailColor: combo === 1 ? 'rgba(168, 85, 247, 0.5)' : weapon.trailColor,
                    ownerId: this.id,
                    ownerTeam: this.team,
                    bounces: weapon.bounces,
                    isExplosive: false,
                    blastRadius: 0,
                    isMeleeSlash: true,
                    maxLife: 0.20,
                    comboStep: combo
                });
                onSpawnBullet(bullet);
            }

            this.glaiveComboStep = (this.glaiveComboStep + 1) % 3;
            return true;
        }

        // Ranged Weapons
        const barrelDist = this.radius + 14;
        const barrelX = this.x + Math.cos(this.angle) * barrelDist;
        const barrelY = this.y + Math.sin(this.angle) * barrelDist;

        // Pinpoint Crosshair Aim Alignment (Phase 24 Overhaul):
        // For local player using mouse, orient trajectory from barrel tip directly through mouse world target
        let baseAngle = this.angle;
        if (this.isLocal && window.game && window.game.renderer && window.game.input &&
            !window.game.input.gamepadAimActive && window.game.input.touchAimId === null) {
            const mouse = window.game.input.mouse;
            if (mouse && window.game.renderer.screenToWorld) {
                const targetWorld = window.game.renderer.screenToWorld(mouse.x, mouse.y);
                const aimDx = targetWorld.x - barrelX;
                const aimDy = targetWorld.y - barrelY;
                if (Math.hypot(aimDx, aimDy) > 12) {
                    baseAngle = Math.atan2(aimDy, aimDx);
                }
            }
        }

        for (let i = 0; i < weapon.pellets; i++) {
            const spreadAngle = (Math.random() - 0.5) * weapon.spread;
            const bulletAngle = baseAngle + spreadAngle;

            const bullet = new Bullet({
                x: barrelX,
                y: barrelY,
                vx: Math.cos(bulletAngle) * weapon.speed,
                vy: Math.sin(bulletAngle) * weapon.speed,
                radius: weapon.radius,
                damage: weapon.damage,
                color: weapon.color,
                trailColor: weapon.trailColor,
                ownerId: this.id,
                ownerTeam: this.team,
                bounces: weapon.bounces,
                penetration: weapon.penetration || 0,
                isExplosive: weapon.isExplosive,
                blastRadius: weapon.blastRadius,
                isMeleeSlash: weapon.isMeleeSlash,
                comboStep: 0,
                weaponId: weapon.id
            });

            onSpawnBullet(bullet);
        }

        // Eject physical shell casing
        if (onSpawnCasing) {
            const casingType = weapon.id === 'sniper' ? 'slug' : (weapon.id === 'vortex' ? 'plasma' : 'brass');
            onSpawnCasing(barrelX, barrelY, this.angle, casingType);
        }

        // Slight weapon recoil
        this.vx -= Math.cos(this.angle) * (weapon.screenShake * 18);
        this.vy -= Math.sin(this.angle) * (weapon.screenShake * 18);

        return true;
    }

    /**
     * Check if a bullet hits this player. Handles Parry reflection!
     * @returns {Object} { hit: boolean, parried: boolean }
     */
    checkBulletHit(bullet) {
        if (this.isDead || bullet.isDead || bullet.ownerId === this.id) {
            return { hit: false, parried: false };
        }

        // Friendly fire protection: In team modes (TDM/ZONE_CONTROL), ignore bullets from same team
        if (this.team && bullet.ownerTeam && this.team === bullet.ownerTeam) {
            return { hit: false, parried: false };
        }

        const distSq = Physics.distSq(this.x, this.y, bullet.x, bullet.y);
        const hitRadius = this.radius + bullet.radius;

        if (distSq < hitRadius * hitRadius) {
            // Check if player is dashing (Invulnerable i-frames!), Phase Shifted, or has Spawn Protection
            if (this.isDashing || this.phaseTimer > 0 || this.spawnProtectionTimer > 0) {
                return { hit: false, parried: false };
            }

            // Check if player is PARRYING!
            if (this.isParrying) {
                // Successful Parry! Deflect bullet back at shooter
                this.parrySuccessAnim = 1.0;
                this.parriesCount++;
                bullet.parry(this.id, this.angle, this.team);
                if (window.AudioEngine && window.AudioEngine.playParry) window.AudioEngine.playParry(this.x, this.y);
                return { hit: true, parried: true };
            }

            // Phase 9: Precision Directional Visor Headshot & Backstab
            const angleToBullet = Math.atan2(bullet.y - this.y, bullet.x - this.x);
            const diffAngle = Math.abs(Math.atan2(Math.sin(angleToBullet - this.angle), Math.cos(angleToBullet - this.angle)));

            let isCrit = false;
            let critType = null;
            let damageMultiplier = 1.0;

            if (diffAngle < 0.62) {
                // Frontal Visor / Headshot: within +-35.5 degree forward cone
                isCrit = true;
                critType = 'HEADSHOT';
                damageMultiplier = 1.5;
            } else if (diffAngle > 2.35) {
                // Rear Flank / Backstab: > 135 degree rear arc
                isCrit = true;
                critType = 'BACKSTAB';
                damageMultiplier = 1.25;
            }

            return {
                hit: true,
                parried: false,
                isCrit,
                critType,
                damageMultiplier
            };
        }
        return { hit: false, parried: false, isCrit: false, critType: null, damageMultiplier: 1.0 };
    }

    takeDamage(amount, attackerName = 'Unknown', sourceX = null, sourceY = null) {
        if (this.isDead || this.isDashing || this.phaseTimer > 0 || this.spawnProtectionTimer > 0) return false;

        this.timeSinceLastHit = 0;

        // Directional damage indicator for local player
        if (this.isLocal && sourceX !== null && sourceY !== null) {
            const hitAngle = Math.atan2(sourceY - this.y, sourceX - this.x);
            const rend = (window.game && window.game.renderer) || window.RendererInstance || window.Renderer;
            if (rend && rend.triggerDamageIndicator) {
                rend.triggerDamageIndicator(hitAngle);
            }
        }

        const prevShield = this.shield;
        let shieldDmg = 0;
        let healthDmg = 0;

        // Shield absorbs first
        if (this.shield > 0) {
            if (this.shield >= amount) {
                this.shield -= amount;
                shieldDmg = amount;
                amount = 0;
            } else {
                shieldDmg = this.shield;
                amount -= this.shield;
                this.shield = 0;
            }
        }

        // Shield Shatter Event: Shield collapsed from >0 to 0
        if (prevShield > 0 && this.shield === 0) {
            if (this.isLocal) {
                const rend = (window.game && window.game.renderer) || window.RendererInstance || window.Renderer;
                if (rend && rend.triggerShieldShatter) {
                    rend.triggerShieldShatter();
                }
            }
            if (window.AudioEngine && window.AudioEngine.playShieldBreak) {
                window.AudioEngine.playShieldBreak(this.x, this.y);
            }
        }

        // Remaining damage to health
        if (amount > 0) {
            healthDmg = Math.min(this.health, amount);
            this.health = Math.max(0, this.health - amount);
        }

        this.lastDamageTaken = {
            shieldDamage: shieldDmg,
            healthDamage: healthDmg,
            totalDamage: shieldDmg + healthDmg
        };

        // Environmental damage floating text
        if (attackerName && (typeof attackerName === 'string') && (attackerName.includes('LASER') || attackerName.includes('REACTOR') || attackerName.includes('EMP'))) {
            const rend = (window.game && window.game.renderer) || window.RendererInstance || window.Renderer;
            if (rend && rend.spawnFloatingText) {
                if (shieldDmg > 0) rend.spawnFloatingText(this.x, this.y - 12, `-${Math.round(shieldDmg)}`, '#38bdf8', false);
                if (healthDmg > 0) rend.spawnFloatingText(this.x, this.y, `-${Math.round(healthDmg)}`, '#ef4444', false);
            }
        }

        if (this.health <= 0) {
            this.isDead = true;
            this.deaths++;
            this.respawnTimer = 3.0; // 3 seconds respawn
            this.killStreak = 0;
            return true; // Player died
        }

        return false;
    }

    applyPowerUp(type) {
        this.powerUpsCollected = (this.powerUpsCollected || 0) + 1;
        if (type === 'overdrive') {
            this.overdriveTimer = 10.0;
        } else if (type === 'shield') {
            this.shield = this.maxShield || 100;
            this.timeSinceLastHit = 0;
        } else if (type === 'phase') {
            this.phaseTimer = 5.0;
        }
    }
}

// Backward-compatibility alias
Player.prototype.hitTestBullet = Player.prototype.checkBulletHit;

window.Player = Player;
