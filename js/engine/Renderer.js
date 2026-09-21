/**
 * Renderer.js
 * High-DPI, Uncapped Framerate Canvas Renderer with Cyberpunk Lighting,
 * Particle Systems, Screen Shake, and Floating Combat Text.
 */

function hexToRgba(hex, alpha = 1.0) {
    if (!hex || typeof hex !== 'string') return `rgba(0, 240, 255, ${alpha})`;
    if (hex.startsWith('rgba')) return hex;
    if (hex.startsWith('rgb')) {
        return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(0, 240, 255, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Camera & Recoil Punch (Phase 24)
        this.camera = { x: 0, y: 0, targetX: 0, targetY: 0, zoom: 1.0 };
        this.screenShake = 0;
        this.shakeMultiplier = 1.0;
        this.recoilPunchX = 0;
        this.recoilPunchY = 0;
        this.currentShakeX = 0;
        this.currentShakeY = 0;
        this.crosshairStyle = 'cross'; // 'dot', 'cross', 'circle', 'kinetic'
        this.crosshairColor = '#00f0ff';
        this.crosshairBloom = 0;
        this.resolutionScale = 1.0;
        this.particleDensity = 'full';
        this.hitmarkers = [];
        this.fogOfWarEnabled = true; // 2D Dynamic Line-of-Sight Fog of War

        // Phase 10D: Pre-allocated Zero-GC Particle Pool (600 particles)
        this.maxParticles = 600;
        this.particlePool = new Array(this.maxParticles);
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool[i] = {
                active: false,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                radius: 2,
                color: '#ffffff',
                alpha: 0,
                decay: 2.0
            };
        }
        this.poolIndex = 0;
        this.particles = this.particlePool; // Backwards compatibility reference

        this.floatingTexts = [];
        this.announcements = [];
        this.damageIndicators = [];
        this.shieldShatterTimer = 0;
        this.toasts = [];
        this.damageNumbersEnabled = true;
        this.crosshairReloadArcEnabled = true;

        window.RendererInstance = this;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    static triggerShieldShatter() {
        if (window.RendererInstance) window.RendererInstance.triggerShieldShatter();
    }

    static triggerDamageIndicator(angle) {
        if (window.RendererInstance) window.RendererInstance.triggerDamageIndicator(angle);
    }

    triggerShieldShatter() {
        this.shieldShatterTimer = 0.5;
    }

    triggerDamageIndicator(angle) {
        this.damageIndicators.push({ angle: angle, timer: 0.65, maxTimer: 0.65 });
    }

    triggerHitmarker(isKill = false) {
        this.hitmarkers.push({ timer: 0.22, maxTimer: 0.22, isKill: !!isKill });
    }

    setResolutionScale(scale, isUser = true) {
        this.resolutionScale = Math.max(0.25, Math.min(2.0, parseFloat(scale) || 1.0));
        // Remember the player's chosen quality ceiling; the dynamic-resolution
        // governor in main.js may dip below it but never exceeds it.
        if (isUser) this.userResScale = this.resolutionScale;
        this.resize();
    }

    resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Mobile Overhaul: adaptive base camera zoom — small screens zoom out so
        // phone players see a fair share of the arena (desktop stays 1.0).
        const isCoarse = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (isCoarse) {
            const shortSide = Math.min(this.width, this.height);
            this.baseZoom = Math.max(0.55, Math.min(1.0, shortSide / 640));
        } else {
            this.baseZoom = 1.0;
        }

        const scale = this.resolutionScale || 1.0;
        this.canvas.width = Math.round(this.width * this.dpr * scale);
        this.canvas.height = Math.round(this.height * this.dpr * scale);

        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.resetTransform();
        this.ctx.scale(this.dpr * scale, this.dpr * scale);
    }

    addScreenShake(amount) {
        this.screenShake = Math.min(25, this.screenShake + amount * this.shakeMultiplier);
    }

    spawnParticles(x, y, color, count = 10, speedMax = 260, normal = null) {
        if (this.particleDensity === 'low') count = Math.ceil(count * 0.35);
        else if (this.particleDensity === 'medium') count = Math.ceil(count * 0.65);
        for (let i = 0; i < count; i++) {
            let angle;
            if (normal && (normal.x !== 0 || normal.y !== 0)) {
                const baseAng = Math.atan2(normal.y, normal.x);
                angle = baseAng + (Math.random() - 0.5) * 1.4;
            } else {
                angle = Math.random() * Math.PI * 2;
            }
            const speed = Math.random() * speedMax + 40;

            const p = this.particlePool[this.poolIndex];
            this.poolIndex = (this.poolIndex + 1) % this.maxParticles;

            p.active = true;
            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.radius = Math.random() * 3.5 + 1.5;
            p.color = color;
            p.alpha = 1.0;
            p.decay = Math.random() * 2.5 + 2.0;
        }
    }

    spawnFloatingText(x, y, text, color = '#ffffff', isCrit = false) {
        if (this.damageNumbersEnabled === false && typeof text === 'number') return;
        this.floatingTexts.push({
            x: x + (Math.random() - 0.5) * 22,
            y: y - 18,
            text: String(text),
            color: color,
            alpha: 1.0,
            vy: isCrit ? -85 : -55,
            scale: isCrit ? 1.45 : 1.0,
            life: 0.85
        });
        if (this.floatingTexts.length > 50) {
            this.floatingTexts.shift();
        }
    }

    showAnnouncement(text, color = '#00f0ff') {
        this.announcements.push({
            text: text,
            color: color,
            alpha: 1.0,
            scale: 0.5,
            targetScale: 1.2,
            life: 2.2
        });
    }

    update(dt) {
        // Decay screen shake
        if (this.screenShake > 0) {
            this.screenShake = Math.max(0, this.screenShake - dt * 25);
        }

        // Update particles (Zero-GC pool)
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particlePool[i];
            if (!p.active) continue;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.alpha -= p.decay * dt;
            if (p.alpha <= 0) {
                p.active = false;
            }
        }

        // Update floating texts (kinetic pop and smooth fade)
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.vy *= 0.92;
            ft.life = (ft.life !== undefined ? ft.life : 1.0) - dt;
            if (ft.life < 0.35) {
                ft.alpha = Math.max(0, ft.life / 0.35);
            }
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Update announcements
        for (let i = this.announcements.length - 1; i >= 0; i--) {
            const a = this.announcements[i];
            a.scale += (a.targetScale - a.scale) * 12 * dt;
            a.life -= dt;
            if (a.life < 0.6) {
                a.alpha = Math.max(0, a.life / 0.6);
            }
            if (a.life <= 0) {
                this.announcements.splice(i, 1);
            }
        }

        // Update cyberpunk in-game toasts
        for (let i = this.toasts.length - 1; i >= 0; i--) {
            const t = this.toasts[i];
            t.timer -= dt;
            if (t.timer < 0.4) {
                t.alpha = Math.max(0, t.timer / 0.4);
            }
            if (t.timer <= 0) {
                this.toasts.splice(i, 1);
            }
        }

        // Update shield shatter timer
        if (this.shieldShatterTimer > 0) {
            this.shieldShatterTimer = Math.max(0, this.shieldShatterTimer - dt);
        }

        // Update damage threat indicators
        for (let i = this.damageIndicators.length - 1; i >= 0; i--) {
            this.damageIndicators[i].timer -= dt;
            if (this.damageIndicators[i].timer <= 0) {
                this.damageIndicators.splice(i, 1);
            }
        }

        // Update hitmarkers decay
        if (this.hitmarkers && this.hitmarkers.length > 0) {
            for (let i = this.hitmarkers.length - 1; i >= 0; i--) {
                this.hitmarkers[i].timer -= dt;
                if (this.hitmarkers[i].timer <= 0) {
                    this.hitmarkers.splice(i, 1);
                }
            }
        }

        // Decay crosshair dynamic bloom
        if (this.crosshairBloom > 0) {
            this.crosshairBloom = Math.max(0, this.crosshairBloom - dt * 25);
        }

        // Decay directional camera recoil punch (Phase 24)
        if (this.recoilPunchX || this.recoilPunchY) {
            this.recoilPunchX = (this.recoilPunchX || 0) * Math.pow(0.0001, dt);
            this.recoilPunchY = (this.recoilPunchY || 0) * Math.pow(0.0001, dt);
            if (Math.abs(this.recoilPunchX) < 0.1) this.recoilPunchX = 0;
            if (Math.abs(this.recoilPunchY) < 0.1) this.recoilPunchY = 0;
        }
    }

    render(game, dt) {
        if (!dt || typeof dt !== 'number' || dt <= 0 || dt > 0.1) {
            const now = performance.now();
            dt = this._lastRenderTime ? Math.min(0.05, Math.max(0.001, (now - this._lastRenderTime) / 1000)) : (1 / 60);
            this._lastRenderTime = now;
        }

        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;

        ctx.clearRect(0, 0, width, height);

        // Framerate-independent exponential smoothing factors (identical decay at 60Hz, 120Hz, 144Hz, 240Hz)
        const cameraLerp = 1 - Math.pow(1 - 0.12, dt * 60);
        const zoomLerp = 1 - Math.pow(1 - 0.08, dt * 60);

        // --- Camera Follow Smoothly with Dynamic Velocity Lead ---
        let targetPlayer = game.localPlayer;
        if (game.isSpectator || !targetPlayer || targetPlayer.isDead) {
            const specTarget = game.getSpectatorTarget ? game.getSpectatorTarget() : null;
            if (specTarget) {
                targetPlayer = specTarget;
            }
        }

        if (targetPlayer) {
            const speed = Math.hypot(targetPlayer.vx, targetPlayer.vy);
            const lookDist = game.isSpectator ? 40 : Math.min(160, 75 + speed * 0.15);
            const leadX = (targetPlayer.vx || 0) * 0.10;
            const leadY = (targetPlayer.vy || 0) * 0.10;
            this.camera.targetX = targetPlayer.x + Math.cos(targetPlayer.angle) * lookDist + leadX;
            this.camera.targetY = targetPlayer.y + Math.sin(targetPlayer.angle) * lookDist + leadY;

            // Speed FOV Breathing & Precision Sniper Scope Zoom
            const isHighSpeed = targetPlayer.isDashing || targetPlayer.isSliding || targetPlayer.jumpTimer > 0 || speed > 550;
            const isSniper = targetPlayer.selectedWeaponIndex === 2;
            let targetZoom = 1.0;
            if (isHighSpeed) {
                targetZoom = 0.90; // Dynamic peripheral expansion during slide/dash
            } else if (isSniper) {
                targetZoom = 1.14; // Precision sniper scope zoom
            }
            // Mobile Overhaul: scale every zoom state by the device-adaptive base
            targetZoom *= (this.baseZoom || 1.0);
            this.camera.zoom += (targetZoom - this.camera.zoom) * zoomLerp;
        }

        this.camera.x += (this.camera.targetX - this.camera.x) * cameraLerp;
        this.camera.y += (this.camera.targetY - this.camera.y) * cameraLerp;

        // Apply Screen Shake & Directional Recoil Punch (Phase 24)
        let shakeX = (this.recoilPunchX || 0);
        let shakeY = (this.recoilPunchY || 0);
        if (this.screenShake > 0) {
            shakeX += (Math.random() - 0.5) * this.screenShake;
            shakeY += (Math.random() - 0.5) * this.screenShake;
        }
        this.currentShakeX = shakeX;
        this.currentShakeY = shakeY;

        ctx.save();
        // Translate world center to screen center
        ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);

        // 1. Draw Arena Floor & Grid
        this.renderArena(ctx, game.arenaSize);

        // 1.0 Energy Scorch Floor Decals (Phase 5)
        if (game.floorDecals && game.floorDecals.length > 0) {
            this.renderFloorDecals(ctx, game.floorDecals);
        }

        // 1.05 Ejected Shell Casings (Phase 7)
        if (game.shellCasings && game.shellCasings.length > 0) {
            this.renderShellCasings(ctx, game.shellCasings);
        }

        // 1.1 Speed Pads (Hyperloop Station)
        if (game.mapManager && game.mapManager.currentMap && game.mapManager.currentMap.speedPads) {
            this.renderSpeedPads(ctx, game.mapManager.currentMap.speedPads);
        }

        // 1.2 Quantum Teleporters (The Core - Phase 5)
        if (game.mapManager && game.mapManager.currentMap && game.mapManager.currentMap.teleporters) {
            this.renderTeleporters(ctx, game.mapManager.currentMap.teleporters);
        }

        // 1.25 Kinetic Jump Pads (Orbital Foundry - Phase 6)
        if (game.mapManager && game.mapManager.currentMap && game.mapManager.currentMap.jumpPads) {
            this.renderJumpPads(ctx, game.mapManager.currentMap.jumpPads);
        }

        // 1.26 Plasma Reactor Core (Orbital Foundry - Phase 6)
        if (game.mapManager && game.mapManager.currentMap && game.mapManager.currentMap.plasmaCore) {
            this.renderPlasmaCore(ctx, game.mapManager.currentMap.plasmaCore);
        }

        // 1.3 Draw Zone Control Capture Area (if active)
        if (game.gameMode && game.gameMode.mode === 'ZONE_CONTROL') {
            this.renderCaptureZone(ctx, game.gameMode.zone);
        }

        // 1.4 Draw Environmental Hazards (The Crucible)
        if (game.mapManager && game.mapManager.currentMap) {
            this.renderHazards(ctx, game.mapManager.currentMap);
        }

        // 1.5 Draw Timed Arena Power-Ups
        if (game.powerUps) {
            this.renderPowerUps(ctx, game.powerUps);
        }

        // 1.9 Muzzle Flash Ground Reflections & Dynamic Illumination (Phase 24)
        if (game.players && game.players.length > 0) {
            this.renderMuzzleFlashGroundReflections(ctx, game.players);
        }

        // 2. Draw Obstacles & Dynamic Doors
        this.renderObstacles(ctx, game.obstacles);
        if (game.mapManager && game.mapManager.currentMap && game.mapManager.currentMap.dynamicDoors) {
            this.renderDynamicDoors(ctx, game.mapManager.currentMap.dynamicDoors);
        }

        // 2.1 Draw Wall Impact Scorch & Gouge Decals (Phase 24)
        if (game.wallDecals && game.wallDecals.length > 0) {
            this.renderWallDecals(ctx, game.wallDecals);
        }

        // 2.2 Muzzle Flash Wall Surface Specular Reflections (Phase 24)
        if (game.players && game.players.length > 0 && game.obstacles) {
            this.renderMuzzleFlashWallReflections(ctx, game.players, game.obstacles);
        }

        // 3. Draw Dash Ghosts
        this.renderDashGhosts(ctx, game.players);

        // 4. Draw Bullets & Trails
        this.renderBullets(ctx, game.bullets);

        // 5. Draw Particles
        this.renderParticles(ctx);

        // 5.1 Draw EMP Supernova Shockwaves (Phase 5)
        if (game.supernovas && game.supernovas.length > 0) {
            this.renderSupernovas(ctx, game.supernovas);
        }

        // 6. Draw Players
        this.renderPlayers(ctx, game.players, game.localPlayer, game.obstacles);

        // 7. Draw Floating Combat Texts
        this.renderFloatingTexts(ctx);

        // 7.1 Draw Tactical Pings & Beacons (Phase 6)
        if (game.pings && game.pings.length > 0) {
            this.renderPings(ctx, game.pings);
        }

        // 7.2 Draw 2D Dynamic Line-of-Sight Fog of War Shroud (Phase 8C)
        if (this.fogOfWarEnabled && game.localPlayer && !game.localPlayer.isDead && !game.isSpectator) {
            this.renderFogOfWar(ctx, game.localPlayer.x, game.localPlayer.y, game.obstacles, game.arenaSize);
        }

        ctx.restore();

        // 8. Draw Screen Overlay HUD (Minimap, Announcements, Mobile Joysticks, Countdown, Death Recap)
        this.renderHUD(ctx, game);
    }

    // --- Phase 12: High-Performance Camera Viewport Frustum Culling ---
    isBoxInFrustum(x, y, w, h, margin = 60) {
        const zoom = this.camera.zoom || 1.0;
        const halfW = (this.width / (2 * zoom)) + margin;
        const halfH = (this.height / (2 * zoom)) + margin;
        const left = this.camera.x - halfW;
        const right = this.camera.x + halfW;
        const top = this.camera.y - halfH;
        const bottom = this.camera.y + halfH;

        return (x + w >= left && x <= right && y + h >= top && y <= bottom);
    }

    isPointInFrustum(x, y, margin = 60) {
        const zoom = this.camera.zoom || 1.0;
        const halfW = (this.width / (2 * zoom)) + margin;
        const halfH = (this.height / (2 * zoom)) + margin;
        return (x >= this.camera.x - halfW && x <= this.camera.x + halfW &&
                y >= this.camera.y - halfH && y <= this.camera.y + halfH);
    }

    renderArena(ctx, size) {
        // Deep background
        ctx.fillStyle = '#06080e';
        ctx.fillRect(-size / 2, -size / 2, size, size);

        // Tactical neon grid
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 64;
        const half = size / 2;

        ctx.beginPath();
        for (let x = -half; x <= half; x += gridSize) {
            ctx.moveTo(x, -half);
            ctx.lineTo(x, half);
        }
        for (let y = -half; y <= half; y += gridSize) {
            ctx.moveTo(-half, y);
            ctx.lineTo(half, y);
        }
        ctx.stroke();

        // Arena Outer Boundary
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.strokeRect(-half, -half, size, size);
        ctx.shadowBlur = 0;
    }

    renderCaptureZone(ctx, zone) {
        ctx.save();
        ctx.translate(zone.x, zone.y);

        let glowColor = '#00f0ff';
        if (zone.contested) glowColor = '#f59e0b';
        else if (zone.owner === 'blue') glowColor = '#3b82f6';
        else if (zone.owner === 'red') glowColor = '#ef4444';

        // Outer Pulsing Hologram Circle
        const pulse = Math.sin(performance.now() * 0.005) * 6;
        ctx.strokeStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, zone.radius + pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Faint Tint
        ctx.fillStyle = glowColor === '#f59e0b' ? 'rgba(245, 158, 11, 0.08)' : (glowColor === '#3b82f6' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)');
        ctx.beginPath();
        ctx.arc(0, 0, zone.radius, 0, Math.PI * 2);
        ctx.fill();

        // Center Zone Icon / Text
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = glowColor;
        const statusText = zone.contested ? 'CONTESTED' : (zone.owner ? `${zone.owner.toUpperCase()} CAPTURED` : 'NEUTRAL ZONE');
        ctx.fillText(statusText, 0, 5);

        ctx.restore();
    }

    renderHazards(ctx, map) {
        if (!map || !map.hazards) return;

        for (let h of map.hazards) {
            ctx.save();
            if (h.state === 'cooldown') {
                // Faint danger hatch markings
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
                ctx.lineWidth = 1;
                ctx.strokeRect(h.x, h.y, h.w, h.h);
            } else if (h.state === 'warning') {
                // Flashing bright amber/red warning zone
                const blink = Math.sin(performance.now() * 0.02) > 0;
                ctx.strokeStyle = blink ? '#f59e0b' : '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 14;
                ctx.lineWidth = 2;
                ctx.strokeRect(h.x, h.y, h.w, h.h);

                ctx.fillStyle = blink ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.12)';
                ctx.fillRect(h.x, h.y, h.w, h.h);

                // Warning Text in center of hazard
                ctx.font = 'bold 12px "Inter", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText('! LASER HAZARD IMMINENT', h.x + h.w / 2, h.y + h.h / 2 + 4);
            } else if (h.state === 'active') {
                // Lethal Active Laser Beam!
                ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
                ctx.fillRect(h.x, h.y, h.w, h.h);

                // Intense White-Red Laser Core
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 24;

                if (h.w > h.h) {
                    ctx.fillRect(h.x, h.y + h.h * 0.3, h.w, h.h * 0.4);
                } else {
                    ctx.fillRect(h.x + h.w * 0.3, h.y, h.w * 0.4, h.h);
                }
            }
            ctx.restore();
        }
    }

    renderSpeedPads(ctx, speedPads) {
        if (!speedPads) return;
        const now = performance.now() * 0.003;
        for (let pad of speedPads) {
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(pad.x, pad.y, pad.w, pad.h);

            ctx.strokeStyle = pad.color;
            ctx.shadowColor = pad.color;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;
            ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);

            // Draw scrolling kinetic chevron arrows
            ctx.strokeStyle = pad.color;
            ctx.shadowColor = pad.color;
            ctx.shadowBlur = 8;
            ctx.lineWidth = 3;
            const arrowSpacing = 80;
            const offset = (pad.boostVx > 0 ? (now * 80) : (-now * 80)) % arrowSpacing;

            for (let ax = pad.x + offset - arrowSpacing; ax < pad.x + pad.w + arrowSpacing; ax += arrowSpacing) {
                if (ax < pad.x + 10 || ax > pad.x + pad.w - 20) continue;
                const cy = pad.y + pad.h / 2;
                ctx.beginPath();
                if (pad.boostVx > 0) {
                    ctx.moveTo(ax - 12, cy - 16);
                    ctx.lineTo(ax + 6, cy);
                    ctx.lineTo(ax - 12, cy + 16);
                } else {
                    ctx.moveTo(ax + 12, cy - 16);
                    ctx.lineTo(ax - 6, cy);
                    ctx.lineTo(ax + 12, cy + 16);
                }
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    renderDynamicDoors(ctx, dynamicDoors) {
        if (!dynamicDoors) return;
        for (let d of dynamicDoors) {
            ctx.save();
            if (!d.isOpen) {
                // Closed solid barrier with glowing warning core
                ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
                ctx.fillRect(d.x, d.y, d.w, d.h);

                ctx.strokeStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 16;
                ctx.lineWidth = 2.5;
                ctx.strokeRect(d.x, d.y, d.w, d.h);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(d.x + d.w * 0.35, d.y, d.w * 0.3, d.h);
            } else {
                // Open energy threshold
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(d.x, d.y, d.w, d.h);
            }
            ctx.restore();
        }
    }

    renderPowerUps(ctx, powerUps) {
        if (!powerUps) return;
        for (let i = 0; i < powerUps.length; i++) {
            const p = powerUps[i];
            if (!p.isActive) continue;

            ctx.save();
            const bobOffset = Math.sin(p.bobTime) * 6;
            ctx.translate(p.x, p.y + bobOffset);

            // Dynamic Ambient Floor Glow (Phase 25 Optics)
            ctx.save();
            ctx.scale(1, 0.45);
            const floorGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, p.radius * 3.2);
            floorGrad.addColorStop(0, p.color || '#00f0ff');
            floorGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.2)');
            floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = floorGrad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Glowing ground beacon ring
            ctx.save();
            ctx.scale(1, 0.4);
            ctx.strokeStyle = p.glowColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 1.6 + Math.sin(p.bobTime * 2) * 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Rotating Core shape
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 18;

            if (p.type === 'overdrive') {
                // Diamond shape
                ctx.beginPath();
                ctx.moveTo(0, -p.radius * 1.1);
                ctx.lineTo(p.radius * 0.8, 0);
                ctx.lineTo(0, p.radius * 1.1);
                ctx.lineTo(-p.radius * 0.8, 0);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'shield') {
                // Hexagonal shield core
                ctx.beginPath();
                for (let a = 0; a < 6; a++) {
                    const ang = (a * Math.PI) / 3;
                    const hx = Math.cos(ang) * (p.radius * 0.9);
                    const hy = Math.sin(ang) * (p.radius * 0.9);
                    if (a === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                // Phase Shift: Rotating ring with floating orb
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius * 0.9, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();

            // Overhead floating label
            ctx.save();
            ctx.font = 'bold 10px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.fillText(p.name, p.x, p.y - p.radius - 14 + bobOffset);
            ctx.restore();
        }
    }

    renderObstacles(ctx, obstacles) {
        ctx.lineWidth = 2;
        for (let i = 0; i < obstacles.length; i++) {
            const box = obstacles[i];
            // Phase 12 Frustum Culling: Skip off-screen obstacles entirely
            if (!this.isBoxInFrustum(box.x, box.y, box.w, box.h, 45)) continue;

            // Dark inner fill
            ctx.fillStyle = '#0e1322';
            ctx.fillRect(box.x, box.y, box.w, box.h);

            // Neon cyan border with glow
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.strokeRect(box.x, box.y, box.w, box.h);

            // Inner bevel accent
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.strokeRect(box.x + 4, box.y + 4, box.w - 8, box.h - 8);
        }
        ctx.shadowBlur = 0;
    }

    renderDashGhosts(ctx, players) {
        for (let p of players) {
            for (let g of p.dashGhosts) {
                if (!this.isPointInFrustum(g.x, g.y, p.radius + 40)) continue;
                ctx.save();
                ctx.translate(g.x, g.y);
                ctx.rotate(g.angle);
                ctx.globalAlpha = g.alpha * 0.4;
                ctx.fillStyle = g.color;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    renderBullets(ctx, bullets) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Additive Bloom for intense neon projectile radiance
        for (let i = 0; i < bullets.length; i++) {
            const b = bullets[i];
            if (b.isDead) continue;
            // Phase 12 Frustum Culling: Skip off-screen bullets
            if (!this.isPointInFrustum(b.x, b.y, 80)) continue;

            const bSpeed = Math.hypot(b.vx, b.vy);
            const bAng = Math.atan2(b.vy, b.vx);

            // 1. Draw Supersonic Tracer Wake (Dual-layer: outer ionized glow + inner incandescent filament)
            if (b.trail.length > 1) {
                // Outer ionized envelope
                ctx.strokeStyle = b.trailColor;
                ctx.lineWidth = b.radius * 1.6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(b.trail[0].x, b.trail[0].y);
                for (let t = 1; t < b.trail.length; t++) {
                    ctx.lineTo(b.trail[t].x, b.trail[t].y);
                }
                ctx.stroke();

                // Inner white-hot incandescent supersonic filament
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(1.2, b.radius * 0.65);
                ctx.beginPath();
                const startIdx = Math.max(0, b.trail.length - 4);
                ctx.moveTo(b.trail[startIdx].x, b.trail[startIdx].y);
                for (let t = startIdx + 1; t < b.trail.length; t++) {
                    ctx.lineTo(b.trail[t].x, b.trail[t].y);
                }
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }

            // 2. Draw bullet core or combo slash
            if (b.isMeleeSlash) {
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(bAng);

                const combo = b.comboStep || 0;
                if (combo === 2) {
                    // Whirlwind Finisher: Full spinning shock disc
                    ctx.strokeStyle = b.color;
                    ctx.shadowColor = b.color;
                    ctx.shadowBlur = 24;
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(0, 0, 24, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, 18, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (combo === 1) {
                    // Slash B: Backhand heavy violet crescent
                    ctx.strokeStyle = b.color;
                    ctx.shadowColor = b.color;
                    ctx.shadowBlur = 18;
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(4, 0, 22, -Math.PI / 2.0, Math.PI / 2.0);
                    ctx.stroke();

                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.arc(2, 0, 18, -Math.PI / 2.5, Math.PI / 2.5);
                    ctx.stroke();
                } else {
                    // Slash A: Forehand cyan crescent blade
                    ctx.strokeStyle = b.color;
                    ctx.shadowColor = b.color;
                    ctx.shadowBlur = 16;
                    ctx.lineWidth = 4.5;
                    ctx.beginPath();
                    ctx.arc(-4, 0, 19, -Math.PI / 2.2, Math.PI / 2.2);
                    ctx.stroke();

                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(-2, 0, 15, -Math.PI / 3, Math.PI / 3);
                    ctx.stroke();
                }
                ctx.restore();
            } else {
                // Ballistic Ranged Projectiles: Aerodynamic Spitzer/Ogive Silhouette & Caliber Detailing
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(bAng);

                const wid = b.weaponId || (b.isExplosive ? 'vortex' : (b.radius >= 5 ? 'sniper' : 'blaster'));

                if (wid === 'sniper' || (b.radius >= 5 && bSpeed > 1400)) {
                    // Apex Sniper: Long Hyper-Velocity Sabot Kinetic Dart & Supersonic Mach Shockwave
                    const len = 24;
                    const halfW = 2.6;

                    // Supersonic Mach Shock Cones (\ /)
                    ctx.strokeStyle = 'rgba(217, 70, 239, 0.45)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(len * 0.4, 0);
                    ctx.lineTo(-len * 0.6, -14);
                    ctx.moveTo(len * 0.4, 0);
                    ctx.lineTo(-len * 0.6, 14);
                    ctx.stroke();

                    // Aerodynamic Spitzer Bullet Body
                    ctx.fillStyle = b.color;
                    ctx.shadowColor = b.color;
                    ctx.shadowBlur = 16;
                    ctx.beginPath();
                    ctx.moveTo(len * 0.55, 0); // Pointed tip
                    ctx.lineTo(len * 0.15, halfW); // Shoulder
                    ctx.lineTo(-len * 0.35, halfW); // Cylindrical body
                    ctx.lineTo(-len * 0.55, halfW * 0.65); // Boat-tail taper
                    ctx.lineTo(-len * 0.55, -halfW * 0.65);
                    ctx.lineTo(-len * 0.35, -halfW);
                    ctx.lineTo(len * 0.15, -halfW);
                    ctx.closePath();
                    ctx.fill();

                    // Searing White-Hot Tungsten Penetrator Core
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(len * 0.55, 0);
                    ctx.lineTo(len * 0.05, halfW * 0.5);
                    ctx.lineTo(-len * 0.45, halfW * 0.3);
                    ctx.lineTo(-len * 0.45, -halfW * 0.3);
                    ctx.lineTo(len * 0.05, -halfW * 0.5);
                    ctx.closePath();
                    ctx.fill();
                } else if (wid === 'shotgun') {
                    // Plasma Shotgun: Heavy kinetic buckshot slug
                    const len = 11;
                    const halfW = 2.8;

                    ctx.fillStyle = b.color;
                    ctx.shadowColor = b.color;
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, len * 0.5, halfW, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Incandescent core
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.ellipse(len * 0.1, 0, len * 0.28, halfW * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                } else if (wid === 'vortex' || b.isExplosive) {
                    // Vortex Cannon: Gravitational Singularity Core with Orbiting Accretion Filament
                    const r = b.radius || 7;
                    ctx.fillStyle = b.color;
                    ctx.shadowColor = b.color;
                    ctx.shadowBlur = 18;
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();

                    // Pulsing Accretion Ring
                    const spin = (b.life || 0) * 14;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, r * 1.35, r * 0.55, spin, 0, Math.PI * 2);
                    ctx.stroke();

                    // White-hot core
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Pulse Blaster (Standard Tactical Kinetic Spitzer Round)
                    const len = 16;
                    const halfW = 2.2;

                    ctx.fillStyle = b.color;
                    ctx.shadowColor = b.color;
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.moveTo(len * 0.5, 0); // Pointed nose
                    ctx.lineTo(len * 0.1, halfW); // Shoulder
                    ctx.lineTo(-len * 0.35, halfW); // Body
                    ctx.lineTo(-len * 0.5, halfW * 0.6); // Boat tail
                    ctx.lineTo(-len * 0.5, -halfW * 0.6);
                    ctx.lineTo(-len * 0.35, -halfW);
                    ctx.lineTo(len * 0.1, -halfW);
                    ctx.closePath();
                    ctx.fill();

                    // Incandescent penetrator tip
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(len * 0.5, 0);
                    ctx.lineTo(0, halfW * 0.4);
                    ctx.lineTo(-len * 0.25, 0);
                    ctx.lineTo(0, -halfW * 0.4);
                    ctx.closePath();
                    ctx.fill();
                }

                ctx.restore();
            }
        }
        ctx.restore();
    }

    renderParticles(ctx) {
        ctx.save();
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particlePool[i];
            if (!p.active) continue;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderPlayers(ctx, players, localPlayer, obstacles) {
        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            if (p.isDead) continue;

            const isTeammate = p.team && localPlayer && localPlayer.team && p.team === localPlayer.team;
            // Fog of War: hide enemy operatives outside line-of-sight unless firing or pinged (teammates always visible)
            if (this.fogOfWarEnabled && localPlayer && !localPlayer.isDead && p.id !== localPlayer.id && !isTeammate) {
                const isRevealed = (p.muzzleFlashTimer > 0) || (p.timeSinceLastHit < 0.6) || (p.isPinged);
                const hasLoS = Physics.hasLineOfSight(localPlayer.x, localPlayer.y, p.x, p.y, obstacles);
                if (!hasLoS && !isRevealed) continue;
            }

            ctx.save();
            ctx.translate(p.x, p.y);

            // Kinetic jump pad aerial elevation (Phase 6)
            if (p.jumpTimer && p.jumpTimer > 0) {
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.beginPath();
                ctx.ellipse(0, 16, p.radius * 0.9, p.radius * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.scale(1.15, 1.15);
            }

            // 0. Power-Up Tactical Visual Auras
            if (p.phaseTimer > 0) {
                ctx.save();
                ctx.strokeStyle = '#d946ef';
                ctx.shadowColor = '#d946ef';
                ctx.shadowBlur = 16;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            if (p.overdriveTimer > 0) {
                ctx.save();
                ctx.strokeStyle = '#ffb703';
                ctx.shadowColor = '#ffb703';
                ctx.shadowBlur = 18;
                ctx.lineWidth = 2.5;
                const sparkAngle = Math.random() * Math.PI * 2;
                const sparkR = p.radius + 7 + Math.random() * 8;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#ffb703';
                ctx.fillRect(Math.cos(sparkAngle) * sparkR, Math.sin(sparkAngle) * sparkR, 4, 4);
                ctx.restore();
            }

            if (p.shield > 50) {
                ctx.save();
                ctx.strokeStyle = '#00f0ff';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 12;
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.arc(0, 0, p.radius + 9, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Spawn Protection Invulnerability Shield Aura (Phase 10C)
            if (p.spawnProtectionTimer && p.spawnProtectionTimer > 0) {
                ctx.save();
                const pulse = (Math.sin(performance.now() * 0.01) + 1) * 0.5;
                ctx.strokeStyle = '#38bdf8';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 18 + pulse * 10;
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 4]);
                ctx.lineDashOffset = -performance.now() * 0.02;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius + 12, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = `rgba(56, 189, 248, ${0.12 + pulse * 0.08})`;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius + 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 1. Draw Parry Deflector Bubble if active
            if (p.isParrying) {
                ctx.save();
                const parryProgress = 1 - (p.parryTimer / p.parryDuration);
                const bubbleRadius = p.radius + 14 + Math.sin(parryProgress * Math.PI) * 4;
                ctx.strokeStyle = '#ffffff';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 20;
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
                ctx.fill();
                ctx.restore();
            }

            // 2. Sniper Laser Sight (Phase 1 Juice)
            if (p.selectedWeaponIndex === 2) {
                this.renderSniperLaser(ctx, p, obstacles || (window.game && window.game.obstacles) || []);
            }

            // If in Phase Shift, make player semi-translucent
            if (p.phaseTimer > 0) {
                ctx.globalAlpha = 0.55;
            }

            // 3. Rotate player body and aim weapon
            ctx.rotate(p.angle);

            // Weapon Barrel with Recoil Kickback
            const kick = p.recoilKick || 0;
            ctx.fillStyle = '#334155';
            ctx.fillRect(8 - kick, -3.5, 18, 7);

            // Weapon Mastery Chroma Accent (Phase 6)
            let barrelColor = p.baseColor;
            if (p.isLocal && window.ProgressionManager && typeof WEAPONS !== 'undefined') {
                const currentWep = WEAPONS[p.selectedWeaponIndex];
                if (currentWep) {
                    const mInfo = window.ProgressionManager.getWeaponMastery(currentWep.id);
                    if (mInfo && mInfo.level >= 3) {
                        barrelColor = '#f59e0b'; // Apex Gold Tier
                    } else if (mInfo && mInfo.level === 2) {
                        barrelColor = '#38bdf8'; // Tactical Cyan Tier
                    }
                }
            }
            ctx.fillStyle = barrelColor;
            ctx.fillRect(20 - kick, -2, 6, 4);

            // Muzzle Flash Tactical Crisp Starburst (Compact & Sharp)
            if (p.muzzleFlashTimer > 0) {
                const wep = (window.WEAPONS && window.WEAPONS[p.selectedWeaponIndex]) || { color: '#00f0ff', screenShake: 2 };
                const flashCol = wep.color || '#00f0ff';
                const flashProgress = Math.min(1.0, p.muzzleFlashTimer / 0.05); // snappy 50ms decay
                const tipX = 25 - kick;

                ctx.save();
                ctx.translate(tipX, 0);

                // 1. Incandescent White Diamond Core
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = flashCol;
                ctx.shadowBlur = 12;
                ctx.beginPath();
                const coreR = (3.2 + (wep.screenShake || 2) * 0.4) * flashProgress;
                ctx.arc(0, 0, coreR, 0, Math.PI * 2);
                ctx.fill();

                // 2. Compact Forward Needle Flame
                const fwd = (7 + (wep.screenShake || 2) * 1.5) * flashProgress;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(fwd, 0);
                ctx.moveTo(0, 0);
                ctx.lineTo(fwd * 0.65, -3 * flashProgress);
                ctx.moveTo(0, 0);
                ctx.lineTo(fwd * 0.65, 3 * flashProgress);
                ctx.stroke();

                // 3. Subtle Compensator Lateral Vents
                const vent = (4.5 + (wep.screenShake || 2) * 0.6) * flashProgress;
                ctx.strokeStyle = flashCol;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(0, -1);
                ctx.lineTo(1, -vent);
                ctx.moveTo(0, 1);
                ctx.lineTo(1, vent);
                ctx.stroke();

                ctx.restore();
            }

            // Player Tactical Cyber Operative
            // Base Torso
            ctx.fillStyle = '#0a0f1d';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Tactical Armor Backplate / Shoulder Pauldrons
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.ellipse(-p.radius * 0.25, 0, p.radius * 0.65, p.radius * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();

            // Left and Right Tactical Hands / Grips
            ctx.fillStyle = p.baseColor;
            ctx.beginPath();
            ctx.arc(10, -7, 3.2, 0, Math.PI * 2);
            ctx.arc(14 - kick * 0.5, 5, 3.2, 0, Math.PI * 2);
            ctx.fill();

            // Neon Outer Armor Trim
            ctx.strokeStyle = p.baseColor;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = p.baseColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Tactical Glowing Cyber Visor
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.baseColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.ellipse(p.radius * 0.55, 0, 3.0, 5.0, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.restore(); // Restore rotation

            // 4. Overhead Health & Shield Bars
            this.renderOverheadBars(ctx, p);
        }
    }

    renderSniperLaser(ctx, p, obstacles) {
        const barrelDist = p.radius + 20;
        const startX = Math.cos(p.angle) * barrelDist;
        const startY = Math.sin(p.angle) * barrelDist;

        // Trace laser line to obstacle or max range
        const maxDist = 1400;
        const worldStartX = p.x + startX;
        const worldStartY = p.y + startY;
        const worldEndX = worldStartX + Math.cos(p.angle) * maxDist;
        const worldEndY = worldStartY + Math.sin(p.angle) * maxDist;

        let endX = worldEndX;
        let endY = worldEndY;
        let closestT = 1.0;

        for (let i = 0; i < obstacles.length; i++) {
            const hit = Physics.raycastBox(worldStartX, worldStartY, worldEndX, worldEndY, obstacles[i]);
            if (hit && hit.t < closestT) {
                closestT = hit.t;
                endX = hit.point.x;
                endY = hit.point.y;
            }
        }

        // Draw laser beam
        ctx.save();
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 8;
        ctx.setLineDash([8, 6]);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        // Convert world hit point to player local coordinate
        ctx.lineTo(endX - p.x, endY - p.y);
        ctx.stroke();

        // Pulsing Target Dot
        ctx.fillStyle = '#d946ef';
        ctx.beginPath();
        ctx.arc(endX - p.x, endY - p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    renderOverheadBars(ctx, p) {
        const barWidth = 44;
        const barHeight = 4;
        const barY = p.y - p.radius - 18;

        // Player Name & Rank Title Tag
        ctx.font = '11px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = p.isLocal ? p.baseColor : '#e2e8f0';
        const displayName = p.title ? `[${p.title}] ${p.name}` : p.name;
        ctx.fillText(displayName, p.x, barY - 6);

        // Shield Bar (if any)
        if (p.shield > 0) {
            const shieldW = (p.shield / p.maxShield) * barWidth;
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(p.x - barWidth / 2, barY - 4, shieldW, 2.5);
        }

        // Health Bar Background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(p.x - barWidth / 2, barY, barWidth, barHeight);

        // Health Bar Fill
        const hpPercent = Math.max(0, p.health / p.maxHealth);
        ctx.fillStyle = hpPercent > 0.4 ? '#10b981' : (hpPercent > 0.2 ? '#f59e0b' : '#ef4444');
        ctx.fillRect(p.x - barWidth / 2, barY, barWidth * hpPercent, barHeight);
    }

    renderFloatingTexts(ctx) {
        if (this.damageNumbersEnabled === false) return;
        for (let i = 0; i < this.floatingTexts.length; i++) {
            const ft = this.floatingTexts[i];
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.font = `900 ${Math.round(15 * ft.scale)}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            // High-contrast dark outline
            ctx.strokeStyle = '#05070d';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, ft.x, ft.y);
            // Core colored glow
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    renderHUD(ctx, game) {
        const width = this.width;
        const height = this.height;

        // --- Low Health Tension Vignette (Phase 1 Juice) ---
        if (game.localPlayer && !game.localPlayer.isDead && game.localPlayer.health < 35) {
            this.renderTensionVignette(ctx, width, height, game.localPlayer.health);
        }

        // --- Hexagonal Shield Shatter Screen FX (Phase 7 Juice) ---
        if (this.shieldShatterTimer > 0) {
            this.renderShieldShatter(ctx, width, height);
        }

        // --- Directional Damage Indicator Arcs (Phase 7 Esports HUD) ---
        if (this.damageIndicators.length > 0) {
            this.renderDamageIndicators(ctx, width, height);
        }

        // --- High-Velocity Kinetic Wind Streaks (Phase 25 Optics) ---
        if (game.localPlayer && !game.localPlayer.isDead) {
            const lp = game.localPlayer;
            const curSpd = lp.isDashing ? Math.hypot(lp.dashVx || 0, lp.dashVy || 0) : (lp.isSliding ? Math.hypot(lp.slideVx || 0, lp.slideVy || 0) : Math.hypot(lp.vx || 0, lp.vy || 0));
            if (curSpd > 480 || lp.isDashing || lp.isSliding) {
                const moveAng = Math.atan2(lp.vy || lp.dashVy || 0, lp.vx || lp.dashVx || 0);
                this.renderKineticWindStreaks(ctx, width, height, curSpd, moveAng);
            }
        }

        // --- Center Screen Announcements ---
        for (let a of this.announcements) {
            ctx.save();
            ctx.translate(width / 2, height / 2 - 80);
            ctx.scale(a.scale, a.scale);
            ctx.globalAlpha = a.alpha;
            ctx.font = 'bold 36px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = a.color;
            ctx.shadowColor = a.color;
            ctx.shadowBlur = 18;
            ctx.fillText(a.text, 0, 0);
            ctx.restore();
        }

        // --- Mobile Joysticks HUD (if active) ---
        if (game.input && (game.input.isMobile || game.input.touchMoveId !== null || game.input.touchAimId !== null)) {
            this.renderMobileJoysticks(ctx, game.input);
        }

        // --- Minimap (Top Right) ---
        this.renderMinimap(ctx, game);

        // --- Custom Esports Crosshair (Phase 1 QoL) ---
        this.renderCrosshair(ctx, game);

        // --- Visual Hitmarkers ---
        this.renderHitmarkers(ctx, game);

        // --- Spectator Mode HUD (Phase 4) ---
        if (game.isSpectator) {
            this.renderSpectatorHUD(ctx, game);
        }

        // --- Match Start Esports Countdown (Phase 5) ---
        if (game.countdownTimer && game.countdownTimer > 0) {
            this.renderCountdown(ctx, game.countdownTimer);
        }

        // --- Holographic Death Recap & Killer Cam (Phase 5) ---
        if (game.localPlayer && game.localPlayer.isDead && game.localPlayer.killerInfo) {
            this.renderDeathRecap(ctx, game);
        }

        // --- Off-Screen Objective & Threat Radar (Phase 10E) ---
        this.renderOffScreenIndicators(ctx, game);

        // --- Cyberpunk In-Game Notification Toasts (Phase 10E) ---
        this.renderToasts(ctx);

        // --- Tactical Radial Ping Wheel Overlay (Phase 9E) ---
        if (game.input && game.input.pingWheelActive) {
            this.renderPingWheel(ctx, game.input);
        }
    }

    renderOffScreenIndicators(ctx, game) {
        if (!game || !game.localPlayer || game.localPlayer.isDead) return;

        // Zone Control Objective Off-Screen Indicator
        if (game.gameMode && game.gameMode.mode === 'ZONE_CONTROL' && game.gameMode.zone) {
            const z = game.gameMode.zone;
            const screenX = (z.x - this.camera.x) * this.camera.zoom + this.width / 2;
            const screenY = (z.y - this.camera.y) * this.camera.zoom + this.height / 2;

            const margin = 50;
            const isOffScreen = screenX < margin || screenX > this.width - margin || screenY < margin || screenY > this.height - margin;

            if (isOffScreen) {
                const centerX = this.width / 2;
                const centerY = this.height / 2;
                const angle = Math.atan2(screenY - centerY, screenX - centerX);

                const halfW = this.width / 2 - margin;
                const halfH = this.height / 2 - margin;
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);

                let edgeX, edgeY;
                if (Math.abs(sinA * halfW) > Math.abs(cosA * halfH)) {
                    edgeY = sinA > 0 ? halfH : -halfH;
                    edgeX = edgeY * (cosA / sinA);
                } else {
                    edgeX = cosA > 0 ? halfW : -halfW;
                    edgeY = edgeX * (sinA / cosA);
                }

                const indicatorX = centerX + edgeX;
                const indicatorY = centerY + edgeY;
                const distM = Math.round(Physics.dist(game.localPlayer.x, game.localPlayer.y, z.x, z.y) / 20);
                const zoneColor = z.controllingTeam === 'blue' ? '#3b82f6' : (z.controllingTeam === 'red' ? '#ef4444' : '#ffd700');

                ctx.save();
                ctx.translate(indicatorX, indicatorY);

                // Draw glowing directional chevron
                ctx.rotate(angle);
                ctx.fillStyle = zoneColor;
                ctx.shadowColor = zoneColor;
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.moveTo(14, 0);
                ctx.lineTo(-8, -10);
                ctx.lineTo(-3, 0);
                ctx.lineTo(-8, 10);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Draw distance label
                ctx.save();
                ctx.translate(indicatorX, indicatorY);
                ctx.font = 'bold 11px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = zoneColor;
                ctx.shadowBlur = 8;
                ctx.fillText(`ZONE ${distM}m`, 0, sinA > 0 ? -16 : 24);
                ctx.restore();
            }
        }
    }

    showCyberpunkToast(title, subtitle = '', type = 'info', duration = 3.5) {
        if (!this.toasts) this.toasts = [];
        const colors = {
            info: '#00f0ff',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444'
        };
        const color = colors[type] || '#00f0ff';
        this.toasts.push({
            title: title.toUpperCase(),
            subtitle: subtitle,
            color: color,
            timer: duration,
            maxTimer: duration,
            alpha: 1.0
        });
        if (this.toasts.length > 3) this.toasts.shift();
        if (window.AudioEngine && window.AudioEngine.playNotification) {
            window.AudioEngine.playNotification();
        }
    }

    renderToasts(ctx) {
        if (!this.toasts || this.toasts.length === 0) return;

        const startY = 70;
        const toastWidth = Math.min(380, this.width - 40);
        const toastHeight = 50;
        const spacing = 10;

        for (let i = 0; i < this.toasts.length; i++) {
            const t = this.toasts[i];
            const y = startY + i * (toastHeight + spacing);
            const x = (this.width - toastWidth) / 2;

            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, t.alpha !== undefined ? t.alpha : 1.0));

            // Cyberpunk Dark Glass Panel
            ctx.fillStyle = 'rgba(8, 14, 26, 0.94)';
            ctx.strokeStyle = t.color;
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 14;
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, toastWidth, toastHeight, 8);
            } else {
                ctx.rect(x, y, toastWidth, toastHeight);
            }
            ctx.fill();
            ctx.stroke();

            // Accent Left Pill
            ctx.fillStyle = t.color;
            ctx.fillRect(x, y, 5, toastHeight);

            // Toast Title
            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = t.color;
            ctx.shadowBlur = 0;
            ctx.fillText(t.title, x + 16, y + 20);

            // Toast Subtitle / Description
            if (t.subtitle) {
                ctx.font = '11px "Inter", sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(t.subtitle, x + 16, y + 38);
            }

            ctx.restore();
        }
    }

    renderPingWheel(ctx, input) {
        const cx = input.pingWheelCenter ? input.pingWheelCenter.x : (this.width / 2);
        const cy = input.pingWheelCenter ? input.pingWheelCenter.y : (this.height / 2);
        const selected = input.selectedPingType || 'enemy';
        const radius = 80;

        ctx.save();
        ctx.translate(cx, cy);

        // Circular dark background disc
        ctx.fillStyle = 'rgba(8, 12, 22, 0.90)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3 Tactical Sectors: DANGER (Top), DEFEND (Right), ASSIST (Left)
        const sectors = [
            { type: 'enemy', label: 'DANGER', color: '#ef4444', start: -Math.PI * 0.75, end: -Math.PI * 0.25, iconX: 0, iconY: -44 },
            { type: 'defend', label: 'DEFEND', color: '#3b82f6', start: -Math.PI * 0.25, end: Math.PI * 0.45, iconX: 42, iconY: 10 },
            { type: 'assist', label: 'ASSIST', color: '#00f0ff', start: Math.PI * 0.45, end: Math.PI * 1.25, iconX: -42, iconY: 10 }
        ];

        for (let sec of sectors) {
            const isSel = selected === sec.type;

            if (isSel) {
                // Highlight active sector wedge
                ctx.save();
                ctx.fillStyle = sec.color;
                ctx.globalAlpha = 0.28;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, radius - 2, sec.start, sec.end);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Divider rays
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(sec.start) * radius, Math.sin(sec.start) * radius);
            ctx.stroke();
            ctx.restore();

            // Label text
            ctx.save();
            ctx.font = isSel ? 'bold 12px "Inter", sans-serif' : '10px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isSel ? '#ffffff' : 'rgba(255, 255, 255, 0.65)';
            ctx.shadowColor = isSel ? sec.color : 'transparent';
            ctx.shadowBlur = isSel ? 12 : 0;
            ctx.fillText(sec.label, sec.iconX, sec.iconY);
            ctx.restore();
        }

        // Center reticle dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pointer vector towards cursor
        const mx = input.mouse.x - cx;
        const my = input.mouse.y - cy;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(mx, my);
        ctx.stroke();

        ctx.restore();
    }

    renderCrosshair(ctx, game) {
        if (!game.input || game.input.isMobile || game.isSpectator) return;
        const mx = game.input.mouse ? game.input.mouse.x : (game.input.mouseX || 0);
        const my = game.input.mouse ? game.input.mouse.y : (game.input.mouseY || 0);
        if (mx <= 0 || my <= 0 || mx >= this.width || my >= this.height) return;

        ctx.save();
        const style = this.crosshairStyle || 'cross';
        const color = this.crosshairColor || '#00f0ff';
        const bloom = this.crosshairBloom || 0;
        const isFiring = game.input.isFiring;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;

        if (style === 'dot') {
            ctx.beginPath();
            ctx.arc(mx, my, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(mx, my, 8 + bloom * 0.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (style === 'circle') {
            const r = (isFiring ? 13 : 9) + bloom;
            ctx.beginPath();
            ctx.arc(mx, my, r, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(mx, my, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (style === 'kinetic') {
            const gap = (isFiring ? 12 : 7) + bloom;
            const len = 6;
            ctx.beginPath();
            // Top-left
            ctx.moveTo(mx - gap, my - gap + len);
            ctx.lineTo(mx - gap, my - gap);
            ctx.lineTo(mx - gap + len, my - gap);

            // Top-right
            ctx.moveTo(mx + gap - len, my - gap);
            ctx.lineTo(mx + gap, my - gap);
            ctx.lineTo(mx + gap, my - gap + len);

            // Bottom-right
            ctx.moveTo(mx + gap, my + gap - len);
            ctx.lineTo(mx + gap, my + gap);
            ctx.lineTo(mx + gap - len, my + gap);

            // Bottom-left
            ctx.moveTo(mx - gap + len, my + gap);
            ctx.lineTo(mx - gap, my + gap);
            ctx.lineTo(mx - gap, my + gap - len);
            ctx.stroke();

            // Center precision dot
            ctx.beginPath();
            ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Dynamic Cross
            const gap = (isFiring ? 9 : 5) + bloom;
            const len = 7;

            // Top
            ctx.beginPath();
            ctx.moveTo(mx, my - gap);
            ctx.lineTo(mx, my - gap - len);
            ctx.stroke();

            // Bottom
            ctx.beginPath();
            ctx.moveTo(mx, my + gap);
            ctx.lineTo(mx, my + gap + len);
            ctx.stroke();

            // Left
            ctx.beginPath();
            ctx.moveTo(mx - gap, my);
            ctx.lineTo(mx - gap - len, my);
            ctx.stroke();

            // Right
            ctx.beginPath();
            ctx.moveTo(mx + gap, my);
            ctx.lineTo(mx + gap + len, my);
            ctx.stroke();

            // Center micro dot
            ctx.fillRect(mx - 1, my - 1, 2, 2);
        }

        // Phase 5: Ultimate Charge Indicator Ring
        if (game.localPlayer && !game.localPlayer.isDead) {
            const ult = game.localPlayer.ultimateCharge || 0;
            if (ult >= 100) {
                const pulse = (Math.sin(performance.now() * 0.01) + 1) * 0.5;
                ctx.save();
                ctx.strokeStyle = '#00f0ff';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 12;
                ctx.lineWidth = 2.0;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(mx, my, 22 + pulse * 2, 0, Math.PI * 2);
                ctx.stroke();

                ctx.font = 'bold 9px "Inter", sans-serif';
                ctx.fillStyle = '#00f0ff';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 8;
                ctx.fillText('[F] READY', mx, my + 34);
                ctx.restore();
            } else if (ult > 0) {
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(mx, my, 20, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (ult / 100)));
                ctx.stroke();
                ctx.restore();
            }
        }

        // Tactical Reload Progress Ring & Label (Phase 8A / Phase 25 Overhaul)
        if (game.localPlayer && !game.localPlayer.isDead && game.localPlayer.isReloading && this.crosshairReloadArcEnabled !== false) {
            const reloadProgress = 1 - Math.max(0, game.localPlayer.reloadTimer / (game.localPlayer.reloadDuration || 1));
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 183, 3, 0.25)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(mx, my, 18, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#ffb703';
            ctx.shadowColor = '#ffb703';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(mx, my, 18, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * reloadProgress));
            ctx.stroke();

            ctx.font = 'bold 9px "Inter", sans-serif';
            ctx.fillStyle = '#ffb703';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 8;
            ctx.fillText('RELOAD', mx, my - 24);
            ctx.restore();
        } else if (game.localPlayer && !game.localPlayer.isDead && !game.localPlayer.isReloading && game.localPlayer.selectedWeaponIndex !== 4) {
            // Low Ammo Warning Pulse (when ammo <= 2 for non-melee weapons)
            const lp = game.localPlayer;
            const curAmmo = (lp.ammo && lp.ammo[lp.selectedWeaponIndex] !== undefined) ? lp.ammo[lp.selectedWeaponIndex] : 10;
            if (curAmmo <= 2) {
                const pulse = (Math.sin(performance.now() * 0.015) + 1) * 0.5;
                ctx.save();
                ctx.strokeStyle = curAmmo === 0 ? '#ef4444' : `rgba(245, 158, 11, ${0.4 + pulse * 0.5})`;
                ctx.shadowColor = curAmmo === 0 ? '#ef4444' : '#f59e0b';
                ctx.shadowBlur = 8;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(mx, my, 18, 0, Math.PI * 2);
                ctx.stroke();

                if (curAmmo === 0) {
                    ctx.font = 'bold 9px "Inter", sans-serif';
                    ctx.fillStyle = '#ef4444';
                    ctx.textAlign = 'center';
                    ctx.fillText('[R] EMPTY', mx, my - 24);
                }
                ctx.restore();
            }
        }

        ctx.restore();
    }

    renderSpectatorHUD(ctx, game) {
        const width = this.width;
        const target = game.getSpectatorTarget ? game.getSpectatorTarget() : null;

        ctx.save();
        const bannerW = Math.min(480, width - 40);
        const bannerH = 76;
        const bx = (width - bannerW) / 2;
        const by = 20;

        // Background Glass
        ctx.fillStyle = 'rgba(6, 8, 14, 0.88)';
        ctx.fillRect(bx, by, bannerW, bannerH);
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bannerW, bannerH);

        // Header
        ctx.font = 'bold 11px "Inter", sans-serif';
        ctx.fillStyle = '#ffb703';
        ctx.textAlign = 'left';
        ctx.fillText('LIVE BROADCAST // SPECTATOR MODE', bx + 16, by + 18);

        ctx.font = 'bold 10px "Inter", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'right';
        ctx.fillText('[< / >] SWITCH OPERATOR', bx + bannerW - 16, by + 18);

        if (target) {
            // Target Name & Rank Title
            ctx.font = 'bold 15px "Inter", sans-serif';
            ctx.fillStyle = target.baseColor || '#00f0ff';
            ctx.textAlign = 'left';
            const teamTag = target.team ? `[${target.team.toUpperCase()}] ` : '';
            ctx.fillText(`${teamTag}${target.name} [${target.title || 'Operative'}]`, bx + 16, by + 39);

            // Target Kills & Weapon
            const wepName = (typeof WEAPONS !== 'undefined' && WEAPONS[target.selectedWeaponIndex]) ? WEAPONS[target.selectedWeaponIndex].name : 'Blaster';
            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'right';
            ctx.fillText(`KILLS: ${target.kills} | ${wepName}`, bx + bannerW - 16, by + 39);

            // Mini Health & Shield bars
            const barW = (bannerW - 32);
            const hpRatio = Math.max(0, target.health / target.maxHealth);
            const shieldRatio = Math.max(0, target.shield / target.maxShield);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.fillRect(bx + 16, by + 50, barW, 6);

            // Shield segment
            const shieldW = barW * 0.33 * shieldRatio;
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(bx + 16, by + 50, shieldW, 6);

            // Health segment
            const hpW = barW * 0.67 * hpRatio;
            ctx.fillStyle = target.health < 35 ? '#ef4444' : '#00f0ff';
            ctx.fillRect(bx + 16 + barW * 0.33, by + 50, hpW, 6);
        } else {
            ctx.font = 'bold 14px "Inter", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText('SEARCHING FOR ACTIVE OPERATOR...', bx + bannerW / 2, by + 45);
        }
        ctx.restore();
    }

    renderTensionVignette(ctx, width, height, health) {
        ctx.save();
        const pulse = (Math.sin(performance.now() * 0.008) + 1) * 0.5;
        const maxAlpha = ((35 - health) / 35) * 0.65;
        const alpha = 0.2 + pulse * maxAlpha;

        const grad = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.35,
            width / 2, height / 2, Math.max(width, height) * 0.75
        );
        grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
        grad.addColorStop(1, `rgba(239, 68, 68, ${alpha})`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Trigger periodic heartbeat sound
        if (!this.lastHeartbeat || performance.now() - this.lastHeartbeat > 750) {
            this.lastHeartbeat = performance.now();
            if (window.AudioEngine) window.AudioEngine.playHeartbeat();
        }
    }

    // Phase 25: High-Velocity Kinetic Wind Streaks
    renderKineticWindStreaks(ctx, width, height, speed, angle = 0) {
        ctx.save();
        const intensity = Math.min(1.0, Math.max(0.15, (speed - 450) / 450));
        const alpha = intensity * 0.42;
        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;

        const time = performance.now() * 0.003;
        const numLines = Math.floor(12 + intensity * 14);
        const cx = width / 2;
        const cy = height / 2;

        for (let i = 0; i < numLines; i++) {
            const rad = ((i * 32.5 + time * 140) % 360) * (Math.PI / 180);
            const dist = Math.min(width, height) * 0.40 + (Math.sin(i * 11 + time * 4) * 40);
            const len = 40 + (i % 6) * 20 + intensity * 45;

            const startX = cx + Math.cos(rad) * dist;
            const startY = cy + Math.sin(rad) * dist;
            const endX = startX + Math.cos(rad) * len;
            const endY = startY + Math.sin(rad) * len;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Phase 25: Live Crosshair Preview Renderer
    static renderCrosshairPreview(canvas, style = 'cross', color = '#00f0ff') {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Dark esports background
        ctx.fillStyle = '#080d1a';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();

        const cx = w / 2;
        const cy = h / 2;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;

        if (style === 'dot') {
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (style === 'circle') {
            ctx.beginPath();
            ctx.arc(cx, cy, 9, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (style === 'kinetic') {
            const gap = 6;
            const len = 9;
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy - gap - len);
            ctx.lineTo(cx, cy - gap);
            ctx.lineTo(cx + 5, cy - gap - len);
            ctx.moveTo(cx - 5, cy + gap + len);
            ctx.lineTo(cx, cy + gap);
            ctx.lineTo(cx + 5, cy + gap + len);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Default cross
            const gap = 4;
            const len = 7;
            ctx.beginPath();
            ctx.moveTo(cx - gap - len, cy);
            ctx.lineTo(cx - gap, cy);
            ctx.moveTo(cx + gap, cy);
            ctx.lineTo(cx + gap + len, cy);
            ctx.moveTo(cx, cy - gap - len);
            ctx.lineTo(cx, cy - gap);
            ctx.moveTo(cx, cy + gap);
            ctx.lineTo(cx, cy + gap + len);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderCrosshairPreview(canvas, style, color) {
        Renderer.renderCrosshairPreview(canvas, style || this.crosshairStyle, color || this.crosshairColor);
    }

    renderMobileJoysticks(ctx, input) {
        // Mobile Overhaul: stick size setting scales every visual radius
        const s = input.stickScale || 1.0;

        // Move Joystick
        if (input.touchMoveId !== null) {
            ctx.save();
            // Outer gesture boundary (Double-Tap Dash / Flick Slide)
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(input.touchMoveOrigin.x, input.touchMoveOrigin.y, 56 * s, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Main joystick base
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(input.touchMoveOrigin.x, input.touchMoveOrigin.y, 45 * s, 0, Math.PI * 2);
            ctx.stroke();

            // Inner thumb knob
            ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
            ctx.beginPath();
            ctx.arc(input.touchMovePos.x, input.touchMovePos.y, 22 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Aim Joystick
        if (input.touchAimId !== null) {
            ctx.save();
            // Tactile Parry Perimeter Arc
            ctx.strokeStyle = 'rgba(217, 70, 239, 0.45)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.arc(input.touchAimOrigin.x, input.touchAimOrigin.y, 58 * s, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Main aim base
            ctx.strokeStyle = 'rgba(217, 70, 239, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(input.touchAimOrigin.x, input.touchAimOrigin.y, 45 * s, 0, Math.PI * 2);
            ctx.stroke();

            // Inner Deadzone Ring (Aim threshold)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.arc(input.touchAimOrigin.x, input.touchAimOrigin.y, input.touchAimDeadzone || 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Inner thumb knob
            ctx.fillStyle = 'rgba(217, 70, 239, 0.75)';
            ctx.beginPath();
            ctx.arc(input.touchAimPos.x, input.touchAimPos.y, 22 * s, 0, Math.PI * 2);
            ctx.fill();

            // Mobile Overhaul: live aim-direction arrow from the stick base —
            // gives the drift direction even when the thumb hides the knob.
            const dx = input.touchAimPos.x - input.touchAimOrigin.x;
            const dy = input.touchAimPos.y - input.touchAimOrigin.y;
            const dist = Math.hypot(dx, dy);
            if (dist > (input.touchAimDeadzone || 15)) {
                const ang = Math.atan2(dy, dx);
                const ax = input.touchAimOrigin.x + Math.cos(ang) * 72 * s;
                const ay = input.touchAimOrigin.y + Math.sin(ang) * 72 * s;
                ctx.strokeStyle = 'rgba(217, 70, 239, 0.65)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(input.touchAimOrigin.x + Math.cos(ang) * 26 * s, input.touchAimOrigin.y + Math.sin(ang) * 26 * s);
                ctx.lineTo(ax, ay);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(ax - Math.cos(ang - 0.45) * 10, ay - Math.sin(ang - 0.45) * 10);
                ctx.moveTo(ax, ay);
                ctx.lineTo(ax - Math.cos(ang + 0.45) * 10, ay - Math.sin(ang + 0.45) * 10);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    renderHitmarkers(ctx, game) {
        if (!this.hitmarkers || this.hitmarkers.length === 0) return;
        const cx = (game.input && !game.input.isMobile && game.input.mouse && game.input.mouse.x > 0) ? game.input.mouse.x : (this.width / 2);
        const cy = (game.input && !game.input.isMobile && game.input.mouse && game.input.mouse.y > 0) ? game.input.mouse.y : (this.height / 2);
        const len = 8;
        const gap = 6;

        ctx.save();
        for (let i = this.hitmarkers.length - 1; i >= 0; i--) {
            const hm = this.hitmarkers[i];
            const alpha = Math.max(0, hm.timer / (hm.maxTimer || 0.22));
            const color = hm.isKill ? '#ef4444' : '#ffffff';
            ctx.strokeStyle = hm.isKill ? `rgba(239, 68, 68, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = hm.isKill ? 2.5 : 1.8;
            ctx.shadowColor = color;
            ctx.shadowBlur = hm.isKill ? 10 : 4;

            ctx.beginPath();
            ctx.moveTo(cx - gap, cy - gap);
            ctx.lineTo(cx - gap - len, cy - gap - len);

            ctx.moveTo(cx + gap, cy - gap);
            ctx.lineTo(cx + gap + len, cy - gap - len);

            ctx.moveTo(cx - gap, cy + gap);
            ctx.lineTo(cx - gap - len, cy + gap + len);

            ctx.moveTo(cx + gap, cy + gap);
            ctx.lineTo(cx + gap + len, cy + gap + len);
            ctx.stroke();
        }
        ctx.restore();
    }

    renderMinimap(ctx, game) {
        const mapSize = 130;
        const padding = 20;
        const mapX = this.width - mapSize - padding;
        const mapY = padding + 55; // Below killfeed/header

        ctx.save();
        ctx.fillStyle = 'rgba(6, 8, 14, 0.75)';
        ctx.fillRect(mapX, mapY, mapSize, mapSize);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(mapX, mapY, mapSize, mapSize);

        const scale = mapSize / game.arenaSize;

        // Draw Obstacles in Minimap
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let box of game.obstacles) {
            const bx = mapX + (box.x + game.arenaSize / 2) * scale;
            const by = mapY + (box.y + game.arenaSize / 2) * scale;
            ctx.fillRect(bx, by, box.w * scale, box.h * scale);
        }

        // Draw Capture Zone in Minimap
        if (game.captureZone) {
            const zx = mapX + (game.captureZone.x + game.arenaSize / 2) * scale;
            const zy = mapY + (game.captureZone.y + game.arenaSize / 2) * scale;
            const zRadius = Math.max(3, game.captureZone.radius * scale);

            let zoneFill = 'rgba(255, 255, 255, 0.15)';
            let zoneStroke = 'rgba(255, 255, 255, 0.6)';
            if (game.captureZone.owner === 'blue') {
                zoneFill = 'rgba(59, 130, 246, 0.35)';
                zoneStroke = '#3b82f6';
            } else if (game.captureZone.owner === 'red') {
                zoneFill = 'rgba(239, 68, 68, 0.35)';
                zoneStroke = '#ef4444';
            }

            ctx.fillStyle = zoneFill;
            ctx.beginPath();
            ctx.arc(zx, zy, zRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = zoneStroke;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(zx, zy, zRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw Active Power-ups in Minimap (Phase 17 fix: use pu.isActive)
        if (game.powerUps) {
            for (let pu of game.powerUps) {
                if (!pu.isActive) continue;
                const pux = mapX + (pu.x + game.arenaSize / 2) * scale;
                const puy = mapY + (pu.y + game.arenaSize / 2) * scale;
                ctx.fillStyle = pu.color || '#eab308';
                ctx.beginPath();
                ctx.moveTo(pux, puy - 2.5);
                ctx.lineTo(pux + 2.5, puy);
                ctx.lineTo(pux, puy + 2.5);
                ctx.lineTo(pux - 2.5, puy);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Draw Players in Minimap
        for (let p of game.players) {
            if (p.isDead) continue;
            const isTeammate = p.team && game.localPlayer && game.localPlayer.team && p.team === game.localPlayer.team;
            // Check fog of war visibility on minimap (teammates always visible)
            if (this.fogOfWarEnabled && game.localPlayer && !game.localPlayer.isDead && !game.isSpectator && p.id !== game.localPlayer.id && !isTeammate) {
                const isRevealed = (p.muzzleFlashTimer > 0) || (p.timeSinceLastHit < 0.6) || (p.isPinged);
                const hasLoS = Physics.hasLineOfSight(game.localPlayer.x, game.localPlayer.y, p.x, p.y, game.obstacles);
                if (!hasLoS && !isRevealed) continue;
            }

            const px = mapX + (p.x + game.arenaSize / 2) * scale;
            const py = mapY + (p.y + game.arenaSize / 2) * scale;

            let dotColor = p.baseColor || '#a855f7';
            if (p.isLocal) {
                dotColor = '#00f0ff';
            } else if (p.team === 'blue') {
                dotColor = '#3b82f6';
            } else if (p.team === 'red') {
                dotColor = '#ef4444';
            }

            ctx.fillStyle = dotColor;
            ctx.beginPath();
            ctx.arc(px, py, p.isLocal ? 3.5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Phase 5: Render Energy Scorch Floor Decals
    renderFloorDecals(ctx, floorDecals) {
        if (!floorDecals || floorDecals.length === 0) return;
        ctx.save();
        for (let i = 0; i < floorDecals.length; i++) {
            const d = floorDecals[i];
            if (d.alpha <= 0.01) continue;
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.globalAlpha = d.alpha;

            // Scorch core (dark blast crater)
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, d.radius);
            grad.addColorStop(0, 'rgba(4, 5, 8, 0.95)');
            grad.addColorStop(0.65, 'rgba(10, 15, 24, 0.7)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
            ctx.fill();

            // Glowing neon energy residue rim
            if (d.color) {
                ctx.strokeStyle = d.color;
                ctx.lineWidth = 1.2;
                ctx.globalAlpha = d.alpha * 0.45;
                ctx.beginPath();
                ctx.arc(0, 0, d.radius * 0.75, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore();
    }

    // Phase 5: Render Quantum Teleporters (The Core)
    renderTeleporters(ctx, teleporters) {
        if (!teleporters || teleporters.length === 0) return;
        ctx.save();
        for (let tp of teleporters) {
            ctx.save();
            ctx.translate(tp.x, tp.y);

            const time = performance.now() * 0.003;
            const rot = tp.angle || 0;

            // Outer pulse ring
            const pulseR = tp.radius + Math.sin(time * 3) * 3;
            ctx.strokeStyle = tp.color;
            ctx.shadowColor = tp.color;
            ctx.shadowBlur = 15;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
            ctx.stroke();

            // Inner rotating vortex blades (3 arcs)
            ctx.rotate(rot);
            for (let b = 0; b < 3; b++) {
                ctx.rotate((Math.PI * 2) / 3);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, tp.radius * 0.65, 0, Math.PI * 0.45);
                ctx.stroke();
            }

            // Glowing singularity core
            const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, tp.radius * 0.4);
            coreGrad.addColorStop(0, '#ffffff');
            coreGrad.addColorStop(0.5, tp.color);
            coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(0, 0, tp.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Portal Label
            ctx.rotate(-rot);
            ctx.font = 'bold 10px "Inter", sans-serif';
            ctx.fillStyle = tp.color;
            ctx.textAlign = 'center';
            ctx.shadowBlur = 8;
            ctx.fillText(tp.name, 0, tp.radius + 18);

            ctx.restore();
        }
        ctx.restore();
    }

    // Phase 5: Render EMP Supernova Shockwaves
    renderSupernovas(ctx, supernovas) {
        if (!supernovas || supernovas.length === 0) return;
        ctx.save();
        for (let i = 0; i < supernovas.length; i++) {
            const s = supernovas[i];
            const progress = s.timer / s.duration; // 0 to 1
            const currentR = s.radius + (s.maxRadius - s.radius) * progress;
            const alpha = Math.max(0, 1 - progress);

            ctx.save();
            ctx.translate(s.x, s.y);

            // Primary shockwave ring
            ctx.strokeStyle = s.color || '#00f0ff';
            ctx.shadowColor = s.color || '#00f0ff';
            ctx.shadowBlur = 24;
            ctx.lineWidth = Math.max(1, 8 * (1 - progress));
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(0, 0, currentR, 0, Math.PI * 2);
            ctx.stroke();

            // Secondary high-frequency trailing wavefront
            if (currentR > 40) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.globalAlpha = alpha * 0.7;
                ctx.beginPath();
                ctx.arc(0, 0, currentR * 0.85, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Center EMP burst flash
            const flashR = Math.max(10, (1 - progress) * 60);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
            grad.addColorStop(0, 'rgba(255, 255, 255, ' + (alpha * 0.9) + ')');
            grad.addColorStop(0.5, s.color || '#00f0ff');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, flashR, 0, Math.PI * 2);
            ctx.fill();

            // Radial EMP lightning tendrils
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            for (let t = 0; t < 6; t++) {
                const angle = (t * Math.PI / 3) + progress * 2.0;
                const dist1 = currentR * 0.4;
                const dist2 = currentR * 0.95;
                const midAngle = angle + (Math.sin(t * 12 + progress * 20) * 0.25);
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * dist1, Math.sin(angle) * dist1);
                ctx.lineTo(Math.cos(midAngle) * ((dist1 + dist2) / 2), Math.sin(midAngle) * ((dist1 + dist2) / 2));
                ctx.lineTo(Math.cos(angle) * dist2, Math.sin(angle) * dist2);
                ctx.stroke();
            }

            ctx.restore();
        }
        ctx.restore();
    }

    // Phase 6: Render Kinetic Jump Launch Pads (Orbital Foundry)
    renderJumpPads(ctx, jumpPads) {
        if (!jumpPads || jumpPads.length === 0) return;
        const now = performance.now() * 0.004;
        for (let pad of jumpPads) {
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(pad.x, pad.y, pad.w, pad.h);

            // Pad metallic outer glow frame
            ctx.strokeStyle = pad.color || '#00f0ff';
            ctx.shadowColor = pad.color || '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);

            // Inner directional launch chevrons
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            const cx = pad.x + pad.w / 2;
            const cy = pad.y + pad.h / 2;

            ctx.save();
            ctx.translate(cx, cy);
            if (pad.dir === 'up') ctx.rotate(-Math.PI / 2);
            else if (pad.dir === 'down') ctx.rotate(Math.PI / 2);
            else if (pad.dir === 'left') ctx.rotate(Math.PI);

            for (let i = -1; i <= 1; i++) {
                const ox = i * 16 + (now * 24) % 16 - 8;
                ctx.beginPath();
                ctx.moveTo(ox - 6, -10);
                ctx.lineTo(ox + 4, 0);
                ctx.lineTo(ox - 6, 10);
                ctx.stroke();
            }
            ctx.restore();

            // Tactical badge
            ctx.font = 'bold 9px "Inter", sans-serif';
            ctx.fillStyle = pad.color || '#00f0ff';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 6;
            ctx.fillText('[JUMP PAD]', cx, pad.y - 6);

            ctx.restore();
        }
    }

    // Phase 6: Render Central Plasma Reactor Core Hazard (Orbital Foundry)
    renderPlasmaCore(ctx, core) {
        if (!core) return;
        ctx.save();
        ctx.translate(core.x, core.y);

        const rot = core.rotation || 0;
        const state = core.state || 'cooldown';

        // 1. Blast danger radius boundary
        ctx.save();
        ctx.setLineDash([8, 6]);
        if (state === 'active') {
            ctx.strokeStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 18;
            ctx.lineWidth = 3;
        } else if (state === 'warning') {
            const blink = Math.sin(performance.now() * 0.02) > 0;
            ctx.strokeStyle = blink ? '#f59e0b' : 'rgba(239, 68, 68, 0.4)';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
            ctx.lineWidth = 1.5;
        }
        ctx.beginPath();
        ctx.arc(0, 0, core.blastRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 2. Outer heavy mechanical containment ring
        ctx.save();
        ctx.rotate(rot);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, core.radius + 14, 0, Math.PI * 2);
        ctx.stroke();

        // Mechanical pylons on ring
        for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.fillStyle = (state === 'active') ? '#ef4444' : ((state === 'warning') ? '#f59e0b' : '#00f0ff');
            ctx.fillRect(core.radius + 8, -6, 12, 12);
        }
        ctx.restore();

        // 3. Inner Pulsing Core
        ctx.save();
        let coreColor = '#a855f7';
        let glowRadius = core.radius;
        if (state === 'active') {
            coreColor = '#ef4444';
            glowRadius = core.radius * 1.35;
        } else if (state === 'warning') {
            coreColor = '#f59e0b';
            glowRadius = core.radius * (1.0 + Math.sin(performance.now() * 0.03) * 0.15);
        }

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, coreColor);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = (state === 'active') ? 35 : 18;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Radiation arcs if active
        if (state === 'active') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            for (let a = 0; a < 8; a++) {
                const ang = Math.random() * Math.PI * 2;
                const r1 = core.radius * 0.4;
                const r2 = core.blastRadius * (0.5 + Math.random() * 0.5);
                ctx.beginPath();
                ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
                ctx.lineTo(Math.cos(ang + 0.1) * (r1 + r2) * 0.5, Math.sin(ang + 0.1) * (r1 + r2) * 0.5);
                ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
                ctx.stroke();
            }
        }
        ctx.restore();

        // 4. Label & status
        ctx.font = 'bold 11px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = (state === 'active') ? '#ef4444' : ((state === 'warning') ? '#f59e0b' : '#a855f7');
        ctx.shadowBlur = 8;
        const text = (state === 'active') ? '! LETHAL CORE RADIATION !' : ((state === 'warning') ? '! CORE PULSE IMMINENT !' : 'PLASMA REACTOR CORE');
        ctx.fillText(text, 0, core.radius + 36);

        ctx.restore();
    }

    // Phase 6: Render Tactical Ping Beacons & World Callouts
    renderPings(ctx, pings) {
        if (!pings || pings.length === 0) return;
        const now = performance.now() * 0.005;

        for (let p of pings) {
            const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalAlpha = alpha;

            const color = p.color || '#ef4444';

            // Expanding sonar rings on ground
            const ringProgress = (now * 2) % 1;
            const r1 = 12 + ringProgress * 36;
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.lineWidth = Math.max(1, 3 * (1 - ringProgress));
            ctx.beginPath();
            ctx.arc(0, 0, r1, 0, Math.PI * 2);
            ctx.stroke();

            // Vertical holographic light beam
            const beamGrad = ctx.createLinearGradient(0, 0, 0, -110);
            beamGrad.addColorStop(0, color);
            beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = beamGrad;
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(6, 0);
            ctx.lineTo(2, -110);
            ctx.lineTo(-2, -110);
            ctx.closePath();
            ctx.fill();

            // Diamond beacon head
            const bob = Math.sin(now * 4) * 5;
            ctx.translate(0, -110 + bob);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(14, 0);
            ctx.lineTo(0, 14);
            ctx.lineTo(-14, 0);
            ctx.closePath();
            ctx.fill();

            // White inner symbol
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 11px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let symbol = '!';
            if (p.type === 'defend') symbol = 'D';
            else if (p.type === 'powerup') symbol = '*';
            else if (p.type === 'assist') symbol = '+';
            ctx.fillText(symbol, 0, 0);

            // Text Callout Banner
            ctx.font = 'bold 10px "Inter", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 6;
            const callerTag = p.playerName ? `${p.playerName}: ` : '';
            ctx.fillText(`${callerTag}${p.label || 'TACTICAL PING'}`, 0, -22);

            ctx.restore();
        }
    }

    // Phase 5: Render Esports Match Start Countdown
    renderCountdown(ctx, countdownTimer) {
        if (countdownTimer <= 0) return;
        const width = this.width;
        const height = this.height;

        ctx.save();
        ctx.translate(width / 2, height / 2 - 40);

        let mainText = '';
        let subText = 'OPERATIVE SYSTEMS ENGAGING';
        let color = '#00f0ff';
        let scale = 1.0;

        if (countdownTimer > 2.5) {
            mainText = '3';
            const frac = countdownTimer - 2.5;
            scale = 1.0 + frac * 0.6;
            color = '#38bdf8';
        } else if (countdownTimer > 1.5) {
            mainText = '2';
            const frac = countdownTimer - 1.5;
            scale = 1.0 + frac * 0.6;
            color = '#a855f7';
        } else if (countdownTimer > 0.5) {
            mainText = '1';
            const frac = countdownTimer - 0.5;
            scale = 1.0 + frac * 0.6;
            color = '#ffb703';
        } else {
            mainText = 'ENGAGE!';
            subText = 'ARENA COMBAT INITIATED // GO';
            const frac = countdownTimer / 0.5;
            scale = 1.3 - frac * 0.3;
            color = '#10b981';
        }

        // Dark frosted backdrop bar
        ctx.fillStyle = 'rgba(6, 8, 14, 0.75)';
        ctx.fillRect(-width / 2, -75, width, 140);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-width / 2, -75);
        ctx.lineTo(width / 2, -75);
        ctx.moveTo(-width / 2, 65);
        ctx.lineTo(width / 2, 65);
        ctx.stroke();

        ctx.scale(scale, scale);

        // Huge Countdown Number / Text
        ctx.font = '900 76px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 28;
        ctx.fillText(mainText, 0, -10);

        // Subtitle
        ctx.font = '700 13px "Inter", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.fillText(subText, 0, 42);

        ctx.restore();
    }

    // Phase 5: Render Holographic Death Recap & Killer Cam
    renderDeathRecap(ctx, game) {
        const local = game.localPlayer;
        if (!local || !local.isDead || !local.killerInfo) return;

        const width = this.width;
        const height = this.height;
        const info = local.killerInfo;

        ctx.save();
        const cardW = 380;
        const cardH = 130;
        const cx = (width - cardW) / 2;
        const cy = height - cardH - 120; // Above bottom vitals

        // Glass background
        ctx.fillStyle = 'rgba(10, 14, 23, 0.92)';
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx, cy, cardW, cardH);

        // Red top accent stripe
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx, cy, cardW, 4);

        // Header
        ctx.font = 'bold 11px "Inter", sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'left';
        ctx.fillText('// ELIMINATED BY OPERATOR', cx + 18, cy + 24);

        // Killer Name
        ctx.font = 'bold 20px "Inter", sans-serif';
        ctx.fillStyle = info.color || '#ffffff';
        const teamTag = info.team ? `[${info.team.toUpperCase()}] ` : '';
        ctx.fillText(`${teamTag}${info.name}`, cx + 18, cy + 52);

        // Weapon & Distance
        ctx.font = '600 12px "Inter", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`WEAPON: ${info.weaponName}  |  DISTANCE: ${info.distance}m`, cx + 18, cy + 74);

        // Respawn bar
        const barW = cardW - 36;
        const respawnTotal = 3.0;
        const respawnProgress = Math.max(0, 1 - (local.respawnTimer / respawnTotal));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(cx + 18, cy + 90, barW, 8);

        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(cx + 18, cy + 90, barW * respawnProgress, 8);

        ctx.font = 'bold 10px "Inter", sans-serif';
        ctx.fillStyle = '#00f0ff';
        ctx.textAlign = 'right';
        ctx.fillText(`RESPAWNING IN ${Math.max(0, local.respawnTimer).toFixed(1)}s`, cx + cardW - 18, cy + 115);

        ctx.restore();
    }

    renderShellCasings(ctx, casings) {
        if (!casings || casings.length === 0) return;
        ctx.save();
        for (let i = 0; i < casings.length; i++) {
            const c = casings[i];
            if (c.isDead) continue;

            const alpha = Math.min(1.0, c.life / 1.2);
            ctx.globalAlpha = alpha;

            // Ground drop shadow (simulates 3D elevation)
            if (c.z > 0) {
                ctx.save();
                ctx.translate(c.x, c.y + c.z * 0.4);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.beginPath();
                ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Shell casing body
            ctx.save();
            ctx.translate(c.x, c.y - c.z);
            ctx.rotate(c.rot);

            if (c.type === 'plasma') {
                ctx.fillStyle = '#10b981';
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 6;
                ctx.fillRect(-3, -1.5, 6, 3);
            } else if (c.type === 'slug') {
                ctx.fillStyle = '#d946ef';
                ctx.shadowColor = '#d946ef';
                ctx.shadowBlur = 6;
                ctx.fillRect(-4, -1.5, 8, 3);
            } else {
                // Brass casing
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(-3, -1.5, 6, 3);
                ctx.fillStyle = '#fef3c7';
                ctx.fillRect(-3, -1.5, 2, 3); // Primer cap
            }
            ctx.restore();
        }
        ctx.restore();
    }

    renderShieldShatter(ctx, width, height) {
        if (this.shieldShatterTimer <= 0) return;
        ctx.save();
        const progress = this.shieldShatterTimer / 0.5; // 1 down to 0
        const alpha = progress * 0.65;

        // Cyan electric vignette along screen perimeter
        const grad = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.35,
            width / 2, height / 2, Math.max(width, height) * 0.75
        );
        grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
        grad.addColorStop(1, `rgba(0, 240, 255, ${alpha})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Hexagonal shatter fragments at screen corners
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 14;

        const hexPoints = [
            { x: 80, y: 80 }, { x: width - 80, y: 80 },
            { x: 80, y: height - 80 }, { x: width - 80, y: height - 80 }
        ];

        for (let pt of hexPoints) {
            ctx.save();
            ctx.translate(pt.x, pt.y);
            for (let a = 0; a < 6; a++) {
                const ang = (a * Math.PI) / 3;
                const hx = Math.cos(ang) * (36 * (1 - progress * 0.25));
                const hy = Math.sin(ang) * (36 * (1 - progress * 0.25));
                if (a === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    renderDamageIndicators(ctx, width, height) {
        if (!this.damageIndicators || this.damageIndicators.length === 0) return;
        ctx.save();
        const cx = width / 2;
        const cy = height / 2;
        const arcRadius = Math.min(width, height) * 0.22;

        for (let ind of this.damageIndicators) {
            const alpha = Math.max(0, ind.timer / ind.maxTimer);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(ind.angle);

            // Red/amber threat arc pointing towards incoming fire
            ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.9})`;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, 0, arcRadius, -Math.PI * 0.15, Math.PI * 0.15);
            ctx.stroke();

            // Inner danger tick
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(arcRadius + 12, 0);
            ctx.lineTo(arcRadius + 2, -5);
            ctx.lineTo(arcRadius + 2, 5);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
        ctx.restore();
    }

    /**
     * Phase 8C: Build 2D Dynamic Line-of-Sight Visibility Polygon
     * Casts rays to all obstacle corners and circular perimeter for realistic shadow casting.
     */
    buildVisibilityPolygon(ox, oy, obstacles, maxDist = 980) {
        if (!obstacles || obstacles.length === 0) return [];
        const maxDistSq = (maxDist + 40) * (maxDist + 40);

        // Phase 12: Pre-filter obstacles within maxDist radius to eliminate thousands of useless ray-box tests
        const relevant = [];
        for (let i = 0; i < obstacles.length; i++) {
            const b = obstacles[i];
            const nearestX = Math.max(b.x, Math.min(ox, b.x + b.w));
            const nearestY = Math.max(b.y, Math.min(oy, b.y + b.h));
            const dsq = (ox - nearestX) * (ox - nearestX) + (oy - nearestY) * (oy - nearestY);
            if (dsq < maxDistSq) {
                relevant.push(b);
            }
        }
        if (relevant.length === 0) return [];

        // 1. Gather relevant corners within maxDist
        const angles = [];
        for (let i = 0; i < relevant.length; i++) {
            const b = relevant[i];
            const corners = [
                { x: b.x, y: b.y },
                { x: b.x + b.w, y: b.y },
                { x: b.x + b.w, y: b.y + b.h },
                { x: b.x, y: b.y + b.h }
            ];
            for (let c of corners) {
                const dx = c.x - ox;
                const dy = c.y - oy;
                if (dx * dx + dy * dy < maxDistSq) {
                    const baseAng = Math.atan2(dy, dx);
                    angles.push(baseAng - 0.0003, baseAng, baseAng + 0.0003);
                }
            }
        }

        // 2. Add 24 circular boundary rays for smooth open space
        const circleRays = 24;
        for (let k = 0; k < circleRays; k++) {
            angles.push((k / circleRays) * Math.PI * 2 - Math.PI);
        }

        // 3. Cast rays and find closest intersection for each angle
        const points = [];
        for (let a of angles) {
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            const endX = ox + cos * maxDist;
            const endY = oy + sin * maxDist;

            let closestT = 1.0;
            let hitX = endX;
            let hitY = endY;

            for (let i = 0; i < relevant.length; i++) {
                const hit = Physics.raycastBox(ox, oy, endX, endY, relevant[i]);
                if (hit && hit.t < closestT) {
                    closestT = hit.t;
                    hitX = hit.point.x;
                    hitY = hit.point.y;
                }
            }

            points.push({
                x: hitX,
                y: hitY,
                angle: Math.atan2(hitY - oy, hitX - ox)
            });
        }

        // 4. Sort points radially
        points.sort((p1, p2) => p1.angle - p2.angle);

        // Deduplicate adjacent points with identical angles
        const filtered = [];
        for (let i = 0; i < points.length; i++) {
            if (i === 0 || Math.abs(points[i].angle - points[i - 1].angle) > 0.0001) {
                filtered.push(points[i]);
            }
        }

        return filtered;
    }

    /**
     * Phase 8C: Render 2D Dynamic Fog of War & Shadow Shroud
     */
    renderFogOfWar(ctx, originX, originY, obstacles, arenaSize = 2200) {
        if (!this.fogOfWarEnabled) return;
        const poly = this.buildVisibilityPolygon(originX, originY, obstacles, 980);
        if (!poly || poly.length < 3) return;

        ctx.save();
        // Cut out the illuminated visibility polygon using evenodd fill rule
        ctx.fillStyle = 'rgba(5, 7, 14, 0.70)';
        ctx.beginPath();
        const bound = (arenaSize || 2200) * 1.5;
        // Outer dark box
        ctx.rect(-bound, -bound, bound * 2, bound * 2);

        // Cutout illuminated polygon
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let i = poly.length - 1; i >= 0; i--) {
            ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.closePath();
        ctx.fill('evenodd');

        // Draw soft ambient neon vision perimeter rim along line-of-sight boundary
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) {
            ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Phase 24: High-Precision Coordinate Transforms
     */
    worldToScreen(worldX, worldY) {
        const shakeX = this.currentShakeX !== undefined ? this.currentShakeX : (this.recoilPunchX || 0);
        const shakeY = this.currentShakeY !== undefined ? this.currentShakeY : (this.recoilPunchY || 0);
        const sx = (this.width / 2 + shakeX) + (worldX - this.camera.x) * this.camera.zoom;
        const sy = (this.height / 2 + shakeY) + (worldY - this.camera.y) * this.camera.zoom;
        return { x: sx, y: sy };
    }

    screenToWorld(screenX, screenY) {
        const shakeX = this.currentShakeX !== undefined ? this.currentShakeX : (this.recoilPunchX || 0);
        const shakeY = this.currentShakeY !== undefined ? this.currentShakeY : (this.recoilPunchY || 0);
        const wx = this.camera.x + (screenX - (this.width / 2 + shakeX)) / this.camera.zoom;
        const wy = this.camera.y + (screenY - (this.height / 2 + shakeY)) / this.camera.zoom;
        return { x: wx, y: wy };
    }

    /**
     * Phase 24: Muzzle Flash Ground Illumination & Radiance (Soft Gaussian Bloom)
     */
    renderMuzzleFlashGroundReflections(ctx, players) {
        if (!players || players.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            if (p.isDead || !p.muzzleFlashTimer || p.muzzleFlashTimer <= 0) continue;

            const kick = p.recoilKick || 0;
            const barrelDist = p.radius + 22 - kick;
            const flashX = p.x + Math.cos(p.angle) * barrelDist;
            const flashY = p.y + Math.sin(p.angle) * barrelDist;

            if (!this.isPointInFrustum(flashX, flashY, 360)) continue;

            const wep = (window.WEAPONS && window.WEAPONS[p.selectedWeaponIndex]) || { color: '#00f0ff', screenShake: 2 };
            const flashColor = wep.color || '#00f0ff';
            const intensity = Math.min(1.0, p.muzzleFlashTimer / 0.045);
            const flashRadius = Math.max(160, (wep.screenShake || 2) * 28 + 140);

            // Soft atmospheric radial bloom with smooth Gaussian falloff (NO hard geometric edges)
            const radialGrad = ctx.createRadialGradient(flashX, flashY, 2, flashX, flashY, flashRadius);
            radialGrad.addColorStop(0, `rgba(255, 255, 255, ${0.45 * intensity})`);
            radialGrad.addColorStop(0.20, hexToRgba(flashColor, 0.28 * intensity));
            radialGrad.addColorStop(0.55, hexToRgba(flashColor, 0.08 * intensity));
            radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radialGrad;
            ctx.beginPath();
            ctx.arc(flashX, flashY, flashRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * Phase 24: Dynamic Muzzle Flash Wall Surface Specular Reflections
     */
    renderMuzzleFlashWallReflections(ctx, players, obstacles) {
        if (!players || players.length === 0 || !obstacles || obstacles.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let pIdx = 0; pIdx < players.length; pIdx++) {
            const p = players[pIdx];
            if (p.isDead || !p.muzzleFlashTimer || p.muzzleFlashTimer <= 0) continue;

            const kick = p.recoilKick || 0;
            const barrelDist = p.radius + 22 - kick;
            const flashX = p.x + Math.cos(p.angle) * barrelDist;
            const flashY = p.y + Math.sin(p.angle) * barrelDist;

            if (!this.isPointInFrustum(flashX, flashY, 380)) continue;

            const wep = (window.WEAPONS && window.WEAPONS[p.selectedWeaponIndex]) || { color: '#00f0ff', screenShake: 2 };
            const flashColor = wep.color || '#00f0ff';
            const intensity = Math.min(1.0, p.muzzleFlashTimer / 0.045);
            const flashRadius = Math.max(180, (wep.screenShake || 2) * 32 + 150);

            // Check each obstacle in range
            for (let i = 0; i < obstacles.length; i++) {
                const box = obstacles[i];
                if (flashX < box.x - flashRadius || flashX > box.x + box.w + flashRadius ||
                    flashY < box.y - flashRadius || flashY > box.y + box.h + flashRadius) {
                    continue;
                }

                // Check 4 faces: Top, Bottom, Left, Right
                if (flashY < box.y) {
                    this._renderWallEdgeReflection(ctx, box.x, box.y, box.x + box.w, box.y, flashX, flashY, flashColor, flashRadius, intensity);
                }
                if (flashY > box.y + box.h) {
                    this._renderWallEdgeReflection(ctx, box.x, box.y + box.h, box.x + box.w, box.y + box.h, flashX, flashY, flashColor, flashRadius, intensity);
                }
                if (flashX < box.x) {
                    this._renderWallEdgeReflection(ctx, box.x, box.y, box.x, box.y + box.h, flashX, flashY, flashColor, flashRadius, intensity);
                }
                if (flashX > box.x + box.w) {
                    this._renderWallEdgeReflection(ctx, box.x + box.w, box.y, box.x + box.w, box.y + box.h, flashX, flashY, flashColor, flashRadius, intensity);
                }
            }
        }
        ctx.restore();
    }

    _renderWallEdgeReflection(ctx, x1, y1, x2, y2, fx, fy, color, maxDist, intensity) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return;

        let t = ((fx - x1) * dx + (fy - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = x1 + t * dx;
        const cy = y1 + t * dy;

        const dist = Math.hypot(fx - cx, fy - cy);
        if (dist >= maxDist) return;

        const falloff = (1.0 - (dist / maxDist)) * intensity;
        if (falloff <= 0.02) return;

        // Localized specular reflection span along the wall face
        const span = Math.max(16, Math.min(110, 140 * (1.0 - dist / maxDist)));
        let hx1 = cx, hy1 = cy, hx2 = cx, hy2 = cy;
        if (Math.abs(dx) > Math.abs(dy)) {
            hx1 = Math.max(Math.min(x1, x2), cx - span);
            hx2 = Math.min(Math.max(x1, x2), cx + span);
        } else {
            hy1 = Math.max(Math.min(y1, y2), cy - span);
            hy2 = Math.min(Math.max(y1, y2), cy + span);
        }

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8 + falloff * 2.0;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8 + falloff * 14;
        ctx.globalAlpha = Math.min(0.85, falloff * 1.1);
        ctx.beginPath();
        ctx.moveTo(hx1, hy1);
        ctx.lineTo(hx2, hy2);
        ctx.stroke();

        // White-hot core highlight
        const coreSpan = span * 0.45;
        let cx1 = cx, cy1 = cy, cx2 = cx, cy2 = cy;
        if (Math.abs(dx) > Math.abs(dy)) {
            cx1 = Math.max(hx1, cx - coreSpan);
            cx2 = Math.min(hx2, cx + coreSpan);
        } else {
            cy1 = Math.max(hy1, cy - coreSpan);
            cy2 = Math.min(hy2, cy + coreSpan);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = Math.min(1.0, falloff * 1.5);
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Phase 24: Render Wall Impact Scorch & Gouge Decals
     */
    renderWallDecals(ctx, wallDecals) {
        if (!wallDecals || wallDecals.length === 0) return;
        ctx.save();
        for (let i = 0; i < wallDecals.length; i++) {
            const wd = wallDecals[i];
            if (wd.alpha <= 0.01) continue;
            if (!this.isPointInFrustum(wd.x, wd.y, 40)) continue;

            ctx.save();
            ctx.translate(wd.x, wd.y);

            // Determine rotation based on normal vector
            const normAng = (wd.nx !== 0 || wd.ny !== 0) ? Math.atan2(wd.ny, wd.nx) : 0;
            ctx.rotate(normAng);

            const heat = Math.max(0, (wd.life - (wd.maxLife - 1.2)) / 1.2); // 1.0 down to 0 in first 1.2s

            // 1. Dark carbon blast pit
            ctx.fillStyle = '#05070c';
            ctx.beginPath();
            ctx.ellipse(0, 0, 4.5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. Glowing molten bullet gouge core (fades from white/orange/color to dark)
            if (heat > 0) {
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = wd.color || '#00f0ff';
                ctx.shadowBlur = 10 * heat;
                ctx.globalAlpha = Math.min(1.0, wd.alpha * heat * 1.5);
                ctx.beginPath();
                ctx.ellipse(0, 0, 2.5 * heat + 0.5, 1.2 * heat + 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // 3. Molten rim edge
            ctx.strokeStyle = wd.color || '#00f0ff';
            ctx.lineWidth = 1.0;
            ctx.globalAlpha = wd.alpha * 0.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, 4.0, 2.2, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
        ctx.restore();
    }
}

window.Renderer = Renderer;
