/**
 * Hyper-Lane Tactics Online - Tactical Canvas 2D Renderer (v5.0 Overhaul)
 * 60-120 FPS requestAnimationFrame with Linear Interpolation (Lerp)
 * Cyber Fortresses, Plasma Chasm River, High-Detail Mecha Units & Floating Damage Text
 */

class TacticalRenderer {
    constructor(canvas, gameRoom, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.room = gameRoom;
        this.options = options;

        // Virtual Resolution (9:16)
        this.V_WIDTH = 1080;
        this.V_HEIGHT = 1920;

        // Display scaling
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;

        // Snapshot buffer for Lerp
        this.prevSnapshot = null;
        this.currentSnapshot = null;
        this.lastSnapshotTime = performance.now();
        this.tickInterval = 50; // 50ms (20 Ticks/sec)

        // Particle System Pool & FX
        this.particles = [];
        this.laserBeams = [];
        this.mortarShells = [];
        this.empRings = [];
        this.floatingTexts = [];
        this.maxParticles = 180;

        // Interactive Drag State
        this.dragState = {
            active: false,
            cardId: null,
            canvasX: 0,
            canvasY: 0,
            hoveredLane: null,
            snappedUnitId: null,
            isCatalyst: false
        };

        this.selectedCardId = null;
        this.screenShake = 0;
        this.activeHazardAlert = null;

        this.initResize();
        this.bindEvents();
        this.hookGameRoomEvents();
    }

    initResize() {
        const resize = () => {
            const parent = this.canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();
            const renderW = Math.round(rect.width);
            const renderH = Math.round(rect.height);

            if (renderW === 0 || renderH === 0) return;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = Math.round(renderW * dpr);
            this.canvas.height = Math.round(renderH * dpr);
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';

            this.scale = (renderW * dpr) / this.V_WIDTH;
            this.dpr = dpr;
        };

        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', resize);
        if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
            new ResizeObserver(resize).observe(this.canvas.parentElement);
        }
        resize();
    }

    feedSnapshot(snapshot) {
        this.prevSnapshot = this.currentSnapshot || snapshot;
        this.currentSnapshot = snapshot;
        this.lastSnapshotTime = performance.now();
    }

    hookGameRoomEvents() {
        this.room.onEvent = (evt) => {
            if (this.options.onSoundTrigger) {
                this.options.onSoundTrigger(evt.type, evt);
            }

            // Visual effects triggers
            if (evt.type === 'unit_attack') {
                this.createSparks(evt.targetX, evt.targetY, evt.splash ? 18 : 8, '#00F2FE');
            } else if (evt.type === 'tower_laser_fire') {
                const color = evt.owner === 1 ? '#00F2FE' : '#FF2A54';
                this.laserBeams.push({
                    fromX: evt.fromX, fromY: evt.fromY,
                    toX: evt.toX, toY: evt.toY,
                    color: color,
                    life: 0.22, maxLife: 0.22
                });
                this.createSparks(evt.toX, evt.toY, 12, color);
            } else if (evt.type === 'emp_blast' || evt.type === 'cannon_fired') {
                const blastRadius = evt.radius || 340;
                this.empRings.push({
                    x: evt.x, y: evt.y || 820,
                    radius: 20, maxRadius: blastRadius,
                    color: '#00F2FE',
                    life: 0.65, maxLife: 0.65
                });
                this.empRings.push({
                    x: evt.x, y: evt.y || 820,
                    radius: 12, maxRadius: blastRadius * 0.65,
                    color: '#FBBF24',
                    life: 0.5, maxLife: 0.5
                });
                this.createSparks(evt.x, evt.y || 820, 45, '#38BDF8');
                this.createSparks(evt.x, evt.y || 820, 25, '#FBBF24');
                const empText = (window.i18n && window.i18n.currentLang === 'ar') ? '⚡ صعق كهرومغناطيسي!' : '⚡ EMP CASCADE!';
                this.addFloatingText(evt.x, (evt.y || 820) - 45, empText, '#00F2FE', true);
                this.screenShake = Math.max(this.screenShake, 18);
                try { if (window.audio && window.audio.playEmpBlast) window.audio.playEmpBlast(); } catch (_) {}
            } else if (evt.type === 'unit_fused') {
                this.createSparks(evt.x, evt.y, 50, '#00F2FE');
                this.createSparks(evt.x, evt.y, 25, '#FFFFFF');
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 20, maxRadius: 220,
                    color: '#00F2FE',
                    life: 0.45, maxLife: 0.45
                });
                const fusionText = (window.i18n && window.i18n.currentLang === 'ar') ? 'تطور دمج خارق!' : 'FUSION EVOLUTION!';
                this.addFloatingText(evt.x, evt.y - 45, fusionText, '#00F2FE', true);
                this.screenShake = 10;
            } else if (evt.type === 'tower_destroyed') {
                this.createSparks(evt.x, evt.y, 75, '#FF2A54');
                this.createSparks(evt.x, evt.y, 35, '#FFB703');
                const destroyedText = (window.i18n && window.i18n.currentLang === 'ar') ? 'تدمير الحصن!' : 'FORTRESS DESTROYED';
                this.addFloatingText(evt.x, evt.y, destroyedText, '#FF2A54', true);
                this.screenShake = 26;
            } else if (evt.type === 'relay_captured') {
                this.empRings.push({
                    x: 540, y: 820,
                    radius: 20, maxRadius: 260,
                    color: evt.owner === 1 ? '#00F2FE' : '#FF2A54',
                    life: 0.5, maxLife: 0.5
                });
                const relayText = (window.i18n && window.i18n.currentLang === 'ar') ? 'شحن فائق للنواة!' : 'RELAY OVERCHARGE!';
                this.addFloatingText(540, 800, relayText, evt.owner === 1 ? '#00F2FE' : '#FF2A54', true);
            } else if (evt.type === 'tower_enrage') {
                // Guardian Wrath: the main citadel roars to life
                const c = evt.owner === 1 ? '#FF4500' : '#FF2A54';
                this.createSparks(evt.x, evt.y, 55, c);
                this.createSparks(evt.x, evt.y, 30, '#FFB703');
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 25, maxRadius: 240,
                    color: c,
                    life: 0.7, maxLife: 0.7
                });
                const rageText = (window.i18n && window.i18n.currentLang === 'ar') ? '🔥 غضب الوصي!' : '🔥 GUARDIAN WRATH!';
                this.addFloatingText(evt.x, evt.y - 50, rageText, c, true);
                this.screenShake = Math.max(this.screenShake, 14);
                try { if (window.audio && window.audio.playExplosion) window.audio.playExplosion(); } catch (_) {}
            } else if (evt.type === 'sky_zap_pulse') {
                // Anti-air cloud strike
                const zapRadius = evt.radius || 340;
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 20, maxRadius: zapRadius,
                    color: '#38BDF8',
                    life: 0.65, maxLife: 0.65
                });
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 12, maxRadius: zapRadius * 0.6,
                    color: '#E0F2FE',
                    life: 0.5, maxLife: 0.5
                });
                this.createSparks(evt.x, evt.y, 40, '#7DD3FC');
                this.createSparks(evt.x, evt.y, 20, '#FFFFFF');
                const zapText = (window.i18n && window.i18n.currentLang === 'ar') ? '⚡ صاعقة سحابية!' : '⚡ SKY ZAP!';
                this.addFloatingText(evt.x, evt.y - 40, zapText, '#7DD3FC', true);
                this.screenShake = Math.max(this.screenShake, 10);
            } else if (evt.type === 'energy_generated') {
                // Quantum Reactor pulse
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 10, maxRadius: 90,
                    color: '#10B981',
                    life: 0.5, maxLife: 0.5
                });
                this.createSparks(evt.x, evt.y, 18, '#34D399');
                const genText = (window.i18n && window.i18n.currentLang === 'ar') ? `⚡ +${evt.amount} طاقة!` : `⚡ +${evt.amount} ENERGY!`;
                this.addFloatingText(evt.x, evt.y - 34, genText, '#34D399', true);
            } else if (evt.type === 'damage_dealt') {
                const color = evt.isShield ? '#00F2FE' : (evt.isTower ? '#FFB703' : '#FF2A54');
                const text = evt.isShield ? `SHIELD -${evt.amount}` : `-${evt.amount}`;
                this.addFloatingText(evt.x + (Math.random() - 0.5) * 35, evt.y - 25, text, color, evt.amount > 130);
            } else if (evt.type === 'orbital_strike') {
                this.laserBeams.push({
                    fromX: evt.fromX, fromY: evt.fromY,
                    toX: evt.toX, toY: evt.toY,
                    color: '#FFB703',
                    life: 0.4, maxLife: 0.4
                });
                this.createSparks(evt.toX, evt.toY, 35, '#FFB703');
                this.addFloatingText(evt.toX, evt.toY - 25, 'ORBITAL BEAM -260', '#FFB703', true);
                this.screenShake = 18;
            } else if (evt.type === 'sniper_fire') {
                const color = evt.owner === 1 ? '#00F2FE' : '#FF2A54';
                this.laserBeams.push({
                    fromX: evt.x, fromY: evt.y,
                    toX: evt.targetX !== undefined ? evt.targetX : evt.x,
                    toY: evt.targetY !== undefined ? evt.targetY : (evt.y - 300),
                    color: color,
                    life: 0.28, maxLife: 0.28
                });
                this.createSparks(evt.x, evt.y, 14, '#FFFFFF');
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 6, maxRadius: 50,
                    color: color,
                    life: 0.2, maxLife: 0.2
                });
                this.addFloatingText(evt.x, evt.y - 35, '🎯 SNIPER CRIT', color, true);
            } else if (evt.type === 'turret_fire') {
                const color = evt.owner === 1 ? '#00F2FE' : '#FFB703';
                this.laserBeams.push({
                    fromX: evt.x, fromY: evt.y,
                    toX: evt.targetX !== undefined ? evt.targetX : evt.x,
                    toY: evt.targetY !== undefined ? evt.targetY : (evt.y - 180),
                    color: color,
                    life: 0.12, maxLife: 0.12
                });
                this.createSparks(evt.targetX !== undefined ? evt.targetX : evt.x, evt.targetY !== undefined ? evt.targetY : evt.y, 6, color);
            } else if (evt.type === 'mortar_fire') {
                const color = evt.owner === 1 ? '#00F2FE' : '#FFB703';
                this.mortarShells.push({
                    fromX: evt.x, fromY: evt.y,
                    toX: evt.targetX !== undefined ? evt.targetX : evt.x,
                    toY: evt.targetY !== undefined ? evt.targetY : (evt.y - 450),
                    splashRadius: evt.splashRadius || 130,
                    color: color,
                    duration: 0.75, // 0.75s travel time
                    elapsed: 0,
                    owner: evt.owner
                });
                this.createSparks(evt.x, evt.y - 18, 16, '#FFB703');
            } else if (evt.type === 'orbital_target_locked') {
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: evt.radius || 340, maxRadius: 30,
                    color: '#FF2A54',
                    life: 0.85, maxLife: 0.85
                });
                const lockText = (window.i18n && window.i18n.currentLang === 'ar') ? '⚠️ تصويب قصف مداري!' : '⚠️ ORBITAL LOCK!';
                this.addFloatingText(evt.x, evt.y - 40, lockText, '#FF2A54', true);
            } else if (evt.type === 'orbital_impact') {
                // Vertical orbital laser beam descending from space
                this.laserBeams.push({
                    fromX: evt.x, fromY: 0,
                    toX: evt.x, toY: evt.y,
                    color: '#FF5500',
                    life: 0.32, maxLife: 0.32
                });
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 15, maxRadius: 210,
                    color: '#FFB703',
                    life: 0.48, maxLife: 0.48
                });
                this.createSparks(evt.x, evt.y, 40, '#FF5500');
                this.createSparks(evt.x, evt.y, 20, '#FFD700');
                this.screenShake = Math.max(this.screenShake, 16);
                try { if (window.audio && window.audio.playOrbitalImpact) window.audio.playOrbitalImpact(); } catch (_) {}
            } else if (evt.type === 'nano_shield_aoe') {
                const aoeRadius = evt.radius || 340;
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 20, maxRadius: aoeRadius,
                    color: '#10B981',
                    life: 0.7, maxLife: 0.7
                });
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 15, maxRadius: aoeRadius * 0.65,
                    color: '#34D399',
                    life: 0.55, maxLife: 0.55
                });
                this.createSparks(evt.x, evt.y, 50, '#34D399');
                this.createSparks(evt.x, evt.y, 20, '#A7F3D0');
                const aegisText = (window.i18n && window.i18n.currentLang === 'ar') ? '🛡️ درع نانوي فائق +650' : '🛡️ NANO AEGIS +650';
                this.addFloatingText(evt.x, evt.y - 45, aegisText, '#10B981', true);
                try { if (window.audio && window.audio.playNanoShield) window.audio.playNanoShield(); } catch (_) {}
            } else if (evt.type === 'plasma_blast') {
                const aoeRadius = evt.radius || 340;
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 20, maxRadius: aoeRadius,
                    color: '#FF2A54',
                    life: 0.7, maxLife: 0.7
                });
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 15, maxRadius: aoeRadius * 0.7,
                    color: '#FFA500',
                    life: 0.55, maxLife: 0.55
                });
                this.createSparks(evt.x, evt.y, 60, '#FF4500');
                this.createSparks(evt.x, evt.y, 30, '#FFD700');
                const plasmaText = (window.i18n && window.i18n.currentLang === 'ar') ? '🔥 ضربة بلازما حارقة!' : '🔥 PLASMA STRIKE!';
                this.addFloatingText(evt.x, evt.y - 45, plasmaText, '#FF2A54', true);
                this.screenShake = Math.max(this.screenShake, 16);
                try { if (window.audio && window.audio.playPlasmaBlast) window.audio.playPlasmaBlast(); } catch (_) {}
            } else if (evt.type === 'cryo_freeze_pulse') {
                const aoeRadius = evt.radius || 340;
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 25, maxRadius: aoeRadius,
                    color: '#A5F3FC',
                    life: 0.85, maxLife: 0.85
                });
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 15, maxRadius: aoeRadius * 0.65,
                    color: '#00F2FE',
                    life: 0.65, maxLife: 0.65
                });
                this.createSparks(evt.x, evt.y, 55, '#E0F2FE');
                this.createSparks(evt.x, evt.y, 25, '#38BDF8');
                const freezeText = (window.i18n && window.i18n.currentLang === 'ar') ? '❄️ تجميد مطلق 4 ثوانٍ!' : '❄️ CRYO FREEZE 4.0s';
                this.addFloatingText(evt.x, evt.y - 45, freezeText, '#00F2FE', true);
                this.screenShake = Math.max(this.screenShake, 12);
                try { if (window.audio && window.audio.playCryoFreeze) window.audio.playCryoFreeze(); } catch (_) {}
            } else if (evt.type === 'cryo_shatter') {
                // Crystal ice shatter explosion!
                this.createSparks(evt.x, evt.y, 30, '#A5F3FC');
                this.createSparks(evt.x, evt.y, 20, '#FFFFFF');
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 10, maxRadius: 90,
                    color: '#38BDF8',
                    life: 0.35, maxLife: 0.35
                });
                const shatterText = (window.i18n && window.i18n.currentLang === 'ar') ? '❄️ سحق جليدي!' : '❄️ ICE SHATTERED!';
                this.addFloatingText(evt.x, evt.y - 30, shatterText, '#38BDF8', true);
                this.screenShake = Math.max(this.screenShake, 8);
            } else if (evt.type === 'spawner_deploy') {
                this.empRings.push({
                    x: evt.x, y: evt.y,
                    radius: 10, maxRadius: 60,
                    color: '#00F2FE',
                    life: 0.45, maxLife: 0.45
                });
                this.createSparks(evt.x, evt.y, 25, '#38BDF8');
            } else if (evt.type === 'inferno_beam_tick') {
                const rampFactor = Math.min(1.0, (evt.beamDuration || 0) / 4.0);
                const sparkColor = rampFactor > 0.7 ? '#FFFA65' : (rampFactor > 0.3 ? '#FF8C00' : '#FF4500');
                this.createSparks(evt.targetX, evt.targetY, Math.round(3 + rampFactor * 8), sparkColor);
                if (rampFactor > 0.6 && Math.random() < 0.35) {
                    this.screenShake = Math.max(this.screenShake, 3);
                }
            } else if (evt.type === 'twin_zap_strike') {
                const color = '#00F2FE';
                this.laserBeams.push({
                    fromX: evt.attackerX, fromY: evt.attackerY,
                    toX: evt.target1X, toY: evt.target1Y,
                    color: color,
                    life: 0.18, maxLife: 0.18
                });
                this.createSparks(evt.target1X, evt.target1Y, 14, '#38BDF8');
                this.addFloatingText(evt.target1X, evt.target1Y - 25, '⚡ MICRO-STUN', '#00F2FE', false);

                if (evt.target2X !== null && evt.target2Y !== null) {
                    this.laserBeams.push({
                        fromX: evt.attackerX, fromY: evt.attackerY,
                        toX: evt.target2X, toY: evt.target2Y,
                        color: '#67E8F9',
                        life: 0.18, maxLife: 0.18
                    });
                    this.createSparks(evt.target2X, evt.target2Y, 14, '#67E8F9');
                    this.addFloatingText(evt.target2X, evt.target2Y - 25, '⚡ MICRO-STUN', '#00F2FE', false);
                }
                this.screenShake = Math.max(this.screenShake, 4);
            } else if (evt.type === 'thermal_storm') {
                // Thermal Storm cell over the air corridor (warning telegraph / eruption / end)
                const stormRadius = evt.radius || 105;
                const isAr = window.i18n && window.i18n.currentLang === 'ar';
                if (evt.phase === 'warning') {
                    this.empRings.push({
                        x: evt.x, y: evt.y,
                        radius: 15, maxRadius: stormRadius * 1.25,
                        color: '#FF8A3C',
                        life: 0.8, maxLife: 0.8
                    });
                    const warnText = isAr ? '🌪️ عاصفة حرارية قادمة!' : '🌪️ THERMAL STORM INBOUND!';
                    this.addFloatingText(evt.x, evt.y - 55, warnText, '#FFB703', true);
                } else if (evt.phase === 'active') {
                    this.empRings.push({
                        x: evt.x, y: evt.y,
                        radius: 10, maxRadius: stormRadius * 1.5,
                        color: '#FF5722',
                        life: 0.7, maxLife: 0.7
                    });
                    this.createSparks(evt.x, evt.y, 40, '#FFB703');
                    this.createSparks(evt.x, evt.y, 25, '#FF5722');
                    const fireText = isAr ? '🔥 انفجار حراري!' : '🔥 THERMAL ERUPTION!';
                    this.addFloatingText(evt.x, evt.y - 50, fireText, '#FF5722', true);
                    this.screenShake = Math.max(this.screenShake, 12);
                }
            } else if (evt.type === 'arena_hazard') {
                this.activeHazardAlert = {
                    hazardType: evt.hazardType,
                    title: evt.title,
                    desc: evt.desc,
                    life: 3.8,
                    maxLife: 3.8
                };
                this.screenShake = Math.max(this.screenShake, 16);
                if (evt.hazardType === 'plasma_storm') {
                    for (let i = 0; i < 6; i++) {
                        const rx = 180 + Math.random() * 720;
                        const ry = 720 + Math.random() * 180;
                        this.empRings.push({
                            x: rx, y: ry,
                            radius: 15, maxRadius: 180,
                            color: '#A855F7',
                            life: 0.75, maxLife: 0.75
                        });
                        this.createSparks(rx, ry, 35, '#C084FC');
                    }
                } else {
                    this.empRings.push({
                        x: 540, y: 820,
                        radius: 40, maxRadius: 460,
                        color: '#FFB703',
                        life: 1.2, maxLife: 1.2
                    });
                    this.createSparks(540, 820, 65, '#F59E0B');
                }
            }
        };
    }

    addFloatingText(x, y, text, color, isCrit = false) {
        if (this.floatingTexts.length > 30) this.floatingTexts.shift();
        this.floatingTexts.push({
            x, y,
            text,
            color,
            isCrit,
            life: 0.75,
            maxLife: 0.75,
            vy: -40 - Math.random() * 20
        });
    }

    createSparks(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 240;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 3 + Math.random() * 5,
                life: 0.25 + Math.random() * 0.35,
                maxLife: 0.6
            });
        }
    }

    // --- MAIN RENDER LOOP ---
    render(now) {
        const ctx = this.ctx;
        const nowMs = now || performance.now();
        const dt = 0.016;

        const elapsed = nowMs - this.lastSnapshotTime;
        const alpha = Math.min(1.0, elapsed / this.tickInterval);

        let shakeX = 0, shakeY = 0;
        if (this.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * this.screenShake;
            shakeY = (Math.random() - 0.5) * this.screenShake;
            this.screenShake = Math.max(0, this.screenShake - 0.8);
        }

        ctx.save();
        try {
            ctx.scale(this.scale, this.scale);
            ctx.translate(shakeX, shakeY);

            // 1. Draw Cyber Arena Map & Plasma Chasm River
            this.drawArenaBackground(ctx, nowMs);

            // 2. Draw 3 Distinct Lanes with guidance rails
            this.drawLanes(ctx, nowMs);

            // 3. Draw Bridges crossing the Plasma Chasm
            this.drawChasmBridges(ctx);

            // 4. Draw Central Relay Core
            const relayState = this.currentSnapshot ? this.currentSnapshot.relayCore : null;
            this.drawRelayCore(ctx, relayState, nowMs);

            // 4.5. Draw Thermal Storm heat cells over the air corridor
            this.drawThermalStorms(ctx, nowMs);

            // 5. Draw Cyber Fortresses (Towers)
            if (this.currentSnapshot) {
                this.drawTowers(ctx, this.currentSnapshot.p1.towers, 1, nowMs);
                this.drawTowers(ctx, this.currentSnapshot.p2.towers, 2, nowMs);
            }

            // 6. Draw Units with Lerp & Mecha Vectors
            this.drawUnits(ctx, alpha, nowMs);

            // 7. Draw Visual FX & Floating Damage Text
            this.drawVisualEffects(ctx, dt);

            // 8. Draw Drag Reticle
            this.drawDragOverlay(ctx);

            // 9. Draw Redline Edge Warning
            if (this.currentSnapshot && this.currentSnapshot.p1.isRedline) {
                this.drawRedlineGlow(ctx, nowMs);
            }

            // 10. Draw In-World Overtime Sky Banner directly above Enemy Base
            if (this.currentSnapshot && this.currentSnapshot.isOvertime) {
                this.drawOvertimeSkyBanner(ctx, nowMs);
            }

            // 11. Draw Dynamic Arena Hazard In-World Sky Banner
            if (this.activeHazardAlert && this.activeHazardAlert.life > 0) {
                this.drawHazardSkyBanner(ctx, dt, nowMs);
            }
        } catch (renderErr) {
            console.error('TacticalRenderer.render error:', renderErr);
        } finally {
            ctx.restore();
        }
    }

    drawArenaBackground(ctx, nowMs) {
        // Deep carbon background with high-tech vignette
        ctx.fillStyle = '#06080E';
        ctx.fillRect(0, 0, this.V_WIDTH, this.V_HEIGHT);

        // Glowing cyber tactical grid
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.035)';
        ctx.lineWidth = 1;
        const gridSize = 64;

        ctx.beginPath();
        for (let x = 0; x <= this.V_WIDTH; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.V_HEIGHT);
        }
        for (let y = 0; y <= this.V_HEIGHT; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.V_WIDTH, y);
        }
        ctx.stroke();

        // Hexagonal ambient pattern in deployment zones
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.022)';
        ctx.lineWidth = 1.2;
        const hexSize = 56;
        for (let hx = 60; hx < this.V_WIDTH; hx += hexSize * 3) {
            for (let hy = 960; hy < this.V_HEIGHT - 120; hy += hexSize * 1.732) {
                ctx.beginPath();
                for (let k = 0; k < 6; k++) {
                    const ha = (k * Math.PI) / 3;
                    const hpx = hx + Math.cos(ha) * hexSize * 0.55;
                    const hpy = hy + Math.sin(ha) * hexSize * 0.55;
                    if (k === 0) ctx.moveTo(hpx, hpy);
                    else ctx.lineTo(hpx, hpy);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }

        // --- MULTI-LAYER ANIMATED PLASMA CHASM (River at Y = 820) ---
        const chasmY = 820;
        const chasmH = 84;

        // 1. Chasm trench deep shadow and base glow
        const riverGrad = ctx.createLinearGradient(0, chasmY - chasmH/2, 0, chasmY + chasmH/2);
        riverGrad.addColorStop(0, 'rgba(3, 7, 18, 0.98)');
        riverGrad.addColorStop(0.2, 'rgba(14, 165, 233, 0.18)');
        riverGrad.addColorStop(0.5, 'rgba(0, 242, 254, 0.32)');
        riverGrad.addColorStop(0.8, 'rgba(14, 165, 233, 0.18)');
        riverGrad.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
        ctx.fillStyle = riverGrad;
        ctx.fillRect(0, chasmY - chasmH/2, this.V_WIDTH, chasmH);

        // 2. Chasm glowing riverbanks (Embankments)
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
        ctx.lineWidth = 2.5;
        // North Bank
        ctx.beginPath();
        ctx.moveTo(0, chasmY - chasmH/2);
        ctx.lineTo(this.V_WIDTH, chasmY - chasmH/2);
        ctx.stroke();
        // South Bank
        ctx.beginPath();
        ctx.moveTo(0, chasmY + chasmH/2);
        ctx.lineTo(this.V_WIDTH, chasmY + chasmH/2);
        ctx.stroke();

        // Bank neon ambient glow strips
        ctx.fillStyle = 'rgba(0, 242, 254, 0.07)';
        ctx.fillRect(0, chasmY - chasmH/2 - 8, this.V_WIDTH, 8);
        ctx.fillRect(0, chasmY + chasmH/2, this.V_WIDTH, 8);

        // 3. Multi-Harmonic Sinusoidal Flowing Energy Currents
        // Primary plasma wave
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= this.V_WIDTH; x += 8) {
            const yOffset = Math.sin((x * 0.012) + (nowMs * 0.0035)) * 16;
            if (x === 0) ctx.moveTo(x, chasmY + yOffset);
            else ctx.lineTo(x, chasmY + yOffset);
        }
        ctx.stroke();

        // Secondary high-speed plasma wave (counter-frequency)
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= this.V_WIDTH; x += 10) {
            const yOffset = Math.sin((x * 0.02) - (nowMs * 0.004)) * 11;
            if (x === 0) ctx.moveTo(x, chasmY + yOffset);
            else ctx.lineTo(x, chasmY + yOffset);
        }
        ctx.stroke();

        // 4. Floating Plasma Sparks / Embers rising from the River
        const sparkCount = 16;
        for (let i = 0; i < sparkCount; i++) {
            const seed = i * 137.5;
            const sx = (seed * 19 + nowMs * 0.035) % this.V_WIDTH;
            const progress = ((nowMs * 0.001 + i * 0.4) % 1);
            const sy = (chasmY + chasmH/2) - (progress * chasmH);
            const size = 1.5 + Math.sin(progress * Math.PI) * 2;
            const alpha = Math.sin(progress * Math.PI) * 0.8;
            ctx.fillStyle = `rgba(0, 242, 254, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. Tactical Free Deployment boundary warning line at Y = 860
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 8]);
        ctx.beginPath();
        ctx.moveTo(40, 860);
        ctx.lineTo(this.V_WIDTH - 40, 860);
        ctx.stroke();
        ctx.setLineDash([]);

        const isAr = (typeof window !== 'undefined' && window.i18n && window.i18n.currentLang === 'ar');
        ctx.font = '700 13px "Rajdhani"';
        ctx.fillStyle = 'rgba(0, 242, 254, 0.75)';
        ctx.textAlign = isAr ? 'right' : 'left';
        const labelText = isAr 
            ? '⚡ منطقة الإنزال الحر (FREE TACTICAL DEPLOYMENT ZONE)'
            : '⚡ FREE TACTICAL DEPLOYMENT ZONE (منطقة الإنزال الحر)';
        ctx.fillText(labelText, isAr ? (this.V_WIDTH - 50) : 50, 882);
    }

    drawLanes(ctx, nowMs) {
        // Bridges crossing the chasm at Y = 820
        const bridges = [
            { x: 230, w: 180, isHyper: false, id: 0, name: 'LEFT BRIDGE' },
            { x: 540, w: 200, isHyper: true, id: 1, name: 'HYPER-CORE' },
            { x: 850, w: 180, isHyper: false, id: 2, name: 'RIGHT BRIDGE' }
        ];

        // Draw bridge approaches only (spanning Y: 740 to 900)
        for (const b of bridges) {
            const isHovered = this.dragState.active && this.dragState.hoveredLane === b.id;

            if (b.isHyper) {
                // AIR HYPER-LANE: glowing flight corridor (no ground bridge here!)
                const laneColor = isHovered ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.07)';
                ctx.fillStyle = laneColor;
                ctx.fillRect(b.x - b.w / 2, 740, b.w, 160);

                ctx.strokeStyle = isHovered ? '#38BDF8' : 'rgba(56, 189, 248, 0.4)';
                ctx.lineWidth = isHovered ? 2.5 : 1.5;
                ctx.setLineDash([12, 8]);
                ctx.strokeRect(b.x - b.w / 2, 740, b.w, 160);
                ctx.setLineDash([]);

                // Animated up/down airflow chevrons
                const airPhase = (nowMs * 0.05) % 40;
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
                ctx.lineWidth = 2;
                for (let ay = 750 + airPhase; ay < 900; ay += 40) {
                    ctx.beginPath();
                    ctx.moveTo(b.x - 16, ay + 8);
                    ctx.lineTo(b.x, ay);
                    ctx.lineTo(b.x + 16, ay + 8);
                    ctx.stroke();
                }

                // Air lane plate
                ctx.fillStyle = 'rgba(6, 8, 14, 0.85)';
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
                ctx.lineWidth = 1.5;
                if (ctx.roundRect) ctx.roundRect(b.x - 58, 706, 116, 24, 6); else ctx.rect(b.x - 58, 706, 116, 24);
                ctx.fill();
                ctx.stroke();
                ctx.font = 'bold 13px "Rajdhani", sans-serif';
                ctx.fillStyle = '#7DD3FC';
                ctx.textAlign = 'center';
                ctx.fillText('✈️ ممر جوي (طيران فقط)', b.x, 723);
                continue;
            }

            const laneColor = 'rgba(0, 242, 254, 0.08)';
            const borderColor = '#00F2FE';

            // Bridge tactical approach pads (only near the chasm, not full screen!)
            ctx.fillStyle = isHovered ? 'rgba(0, 242, 254, 0.2)' : laneColor;
            ctx.fillRect(b.x - b.w / 2, 740, b.w, 160);

            ctx.strokeStyle = isHovered ? borderColor : 'rgba(0, 242, 254, 0.25)';
            ctx.lineWidth = isHovered ? 2.5 : 1.5;
            ctx.strokeRect(b.x - b.w / 2, 740, b.w, 160);

            // Directional chevron arrows at bridge entry
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
            ctx.lineWidth = 2;
            const arrowY = 875;
            ctx.beginPath();
            ctx.moveTo(b.x - 24, arrowY + 10);
            ctx.lineTo(b.x, arrowY);
            ctx.lineTo(b.x + 24, arrowY + 10);
            ctx.stroke();
        }
    }

    drawChasmBridges(ctx, nowMs = performance.now()) {
        const bridges = [230, 540, 850];
        const chasmY = 820;
        const bw = 176;
        const bh = 86;

        for (let idx = 0; idx < bridges.length; idx++) {
            const bx = bridges[idx];
            const isCenter = idx === 1;

            // --- CENTER: AIR CORRIDOR (no ground bridge - only the flight tube spans the chasm) ---
            if (isCenter) {
                // Dark void gap where the old bridge was removed
                ctx.fillStyle = 'rgba(3, 6, 12, 0.85)';
                ctx.fillRect(bx - bw / 2 - 6, chasmY - bh / 2 - 4, bw + 12, bh + 8);

                // Dashed cyan corridor edge rails (energy walls of the flight tube)
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([16, 10]);
                ctx.beginPath();
                ctx.moveTo(bx - bw / 2, chasmY - bh / 2);
                ctx.lineTo(bx + bw / 2, chasmY - bh / 2);
                ctx.moveTo(bx - bw / 2, chasmY + bh / 2);
                ctx.lineTo(bx + bw / 2, chasmY + bh / 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Animated upward airflow chevrons inside the tube
                const airOffset = (nowMs * 0.06) % 42;
                ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
                ctx.lineWidth = 2.2;
                for (let ay = chasmY - bh / 2 + airOffset; ay < chasmY + bh / 2; ay += 42) {
                    ctx.beginPath();
                    ctx.moveTo(bx - 16, ay - 7);
                    ctx.lineTo(bx, ay);
                    ctx.lineTo(bx + 16, ay - 7);
                    ctx.stroke();
                }

                // Suspended pylons at both banks
                for (const px of [bx - bw / 2, bx + bw / 2]) {
                    ctx.fillStyle = '#1E293B';
                    ctx.strokeStyle = '#38BDF8';
                    ctx.lineWidth = 1.5;
                    if (ctx.roundRect) ctx.roundRect(px - 7, chasmY - bh / 2 - 7, 14, 14, 3); else ctx.rect(px - 7, chasmY - bh / 2 - 7, 14, 14);
                    ctx.fill();
                    ctx.stroke();
                    const ledPulse = 0.5 + Math.sin(nowMs * 0.008 + bx) * 0.5;
                    ctx.fillStyle = `rgba(255, 255, 255, ${ledPulse})`;
                    ctx.beginPath();
                    ctx.arc(px, chasmY - bh / 2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                continue;
            }

            // 1. Reinforced Heavy Substructure & Shadow
            ctx.fillStyle = '#04070D';
            ctx.fillRect(bx - bw / 2 - 6, chasmY - bh / 2 - 4, bw + 12, bh + 8);

            // 2. High-Tech Hex Composite Deck Platform
            ctx.fillStyle = '#0A101D';
            ctx.fillRect(bx - bw / 2, chasmY - bh / 2, bw, bh);

            // Deck Diamond Plate / Traction Tread pattern
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1.5;
            for (let x = bx - bw / 2 + 16; x < bx + bw / 2; x += 22) {
                ctx.beginPath();
                ctx.moveTo(x, chasmY - bh / 2);
                ctx.lineTo(x, chasmY + bh / 2);
                ctx.stroke();
            }

            // Cross-brace diagonal tension cables
            ctx.strokeStyle = isCenter ? 'rgba(255, 183, 3, 0.16)' : 'rgba(0, 242, 254, 0.14)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(bx - bw / 2, chasmY - bh / 2);
            ctx.lineTo(bx + bw / 2, chasmY + bh / 2);
            ctx.moveTo(bx - bw / 2, chasmY + bh / 2);
            ctx.lineTo(bx + bw / 2, chasmY - bh / 2);
            ctx.stroke();

            // 3. Neon Energy Guide Rails
            const railColor = isCenter ? '#FFB703' : '#00F2FE';
            ctx.strokeStyle = railColor;
            ctx.lineWidth = 3.5;
            // North rail
            ctx.beginPath();
            ctx.moveTo(bx - bw / 2, chasmY - bh / 2);
            ctx.lineTo(bx + bw / 2, chasmY - bh / 2);
            ctx.stroke();
            // South rail
            ctx.beginPath();
            ctx.moveTo(bx - bw / 2, chasmY + bh / 2);
            ctx.lineTo(bx + bw / 2, chasmY + bh / 2);
            ctx.stroke();

            // Luminous rail energy core
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx - bw / 2 + 4, chasmY - bh / 2);
            ctx.lineTo(bx + bw / 2 - 4, chasmY - bh / 2);
            ctx.moveTo(bx - bw / 2 + 4, chasmY + bh / 2);
            ctx.lineTo(bx + bw / 2 - 4, chasmY + bh / 2);
            ctx.stroke();

            // 4. Smooth Animated Directional Chevrons advancing along lanes
            const flowOffset = (nowMs * 0.05) % 36;
            ctx.strokeStyle = railColor;
            ctx.lineWidth = 2.2;
            for (let y = chasmY - bh / 2 + flowOffset; y < chasmY + bh / 2; y += 36) {
                ctx.beginPath();
                ctx.moveTo(bx - 14, y - 7);
                ctx.lineTo(bx, y);
                ctx.lineTo(bx + 14, y - 7);
                ctx.stroke();
            }

            // 5. Heavy Corner Suspension Pylons with pulsating LED status nodes
            const corners = [
                [bx - bw / 2, chasmY - bh / 2],
                [bx + bw / 2, chasmY - bh / 2],
                [bx - bw / 2, chasmY + bh / 2],
                [bx + bw / 2, chasmY + bh / 2]
            ];
            for (const [cx, cy] of corners) {
                ctx.fillStyle = '#1E293B';
                ctx.strokeStyle = railColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(cx - 7, cy - 7, 14, 14, 3);
                else ctx.rect(cx - 7, cy - 7, 14, 14);
                ctx.fill();
                ctx.stroke();

                // Glowing central node
                const ledPulse = 0.5 + Math.sin(nowMs * 0.008 + bx) * 0.5;
                ctx.fillStyle = railColor;
                ctx.beginPath();
                ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `rgba(255, 255, 255, ${ledPulse})`;
                ctx.beginPath();
                ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawRelayCore(ctx, relayState, nowMs) {
        const cx = 540;
        const cy = 820;
        const owner = relayState ? relayState.owner : 0;
        const isCooldown = relayState && relayState.cooldown > 0;

        let auraColor = '#FFB703';
        if (owner === 1) auraColor = '#00F2FE';
        if (owner === 2) auraColor = '#FF2A54';

        const angle = (nowMs * 0.0018) % (Math.PI * 2);

        ctx.save();
        ctx.translate(cx, cy);

        // 1. Holographic Ground Projection Ring
        const pulse = 1 + Math.sin(nowMs * 0.006) * 0.1;
        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 62 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Luminous radial ground field
        const groundGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 62 * pulse);
        groundGrad.addColorStop(0, auraColor === '#FFB703' ? 'rgba(255, 183, 3, 0.22)' : (auraColor === '#00F2FE' ? 'rgba(0, 242, 254, 0.22)' : 'rgba(255, 42, 84, 0.22)'));
        groundGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 62 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // 2. Heavy Segmented Mechanical Gear Ring (Clockwise)
        ctx.rotate(angle);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 6;
        ctx.setLineDash([18, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, 48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner glowing dial (Counter-Clockwise)
        ctx.rotate(-angle * 2);
        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Central Quantum Plasma Singularity Core
        const corePulse = 1 + Math.sin(nowMs * 0.008) * 0.15;
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26 * corePulse);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.35, auraColor);
        grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 26 * corePulse, 0, Math.PI * 2);
        ctx.fill();

        // Core Center Diamond Emblem
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -18); ctx.lineTo(18, 0); ctx.lineTo(0, 18); ctx.lineTo(-18, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = auraColor;
        ctx.beginPath();
        ctx.moveTo(0, -13); ctx.lineTo(13, 0); ctx.lineTo(0, 13); ctx.lineTo(-13, 0);
        ctx.closePath();
        ctx.fill();

        // 4. Orbiting Quantum Plasma Nodes with luminous trails
        for (let i = 0; i < 4; i++) {
            const orbAngle = angle * 2.2 + (i * Math.PI / 2);
            const ox = Math.cos(orbAngle) * 36;
            const oy = Math.sin(orbAngle) * 36;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ox, oy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = auraColor;
            ctx.beginPath();
            ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lightning energy discharge to bridges when overcharged or claimed
        if (isCooldown || owner !== 0) {
            this.drawElectricArcs(ctx, 46, auraColor, nowMs);
        }

        ctx.restore();

        // Tactical Status HUD Readout
        ctx.font = 'bold 16px "Rajdhani"';
        ctx.textAlign = 'center';
        const isAr = (typeof window !== 'undefined' && window.i18n && window.i18n.currentLang === 'ar');
        if (isCooldown) {
            ctx.fillStyle = '#94A3B8';
            ctx.fillText(isAr ? `⚡ شحن النواة: ${relayState.cooldown} ث` : `OVERCHARGE: ${relayState.cooldown}s`, cx, cy + 90);
        } else {
            ctx.fillStyle = '#FFB703';
            ctx.fillText(isAr ? '⚡ نواة الطاقة (للوحدات الجوية فقط)' : 'RELAY CORE (AERIAL ONLY)', cx, cy + 90);
        }
    }

    // --- OVERHAULED CYBER FORTRESSES (TOWERS) ---
    drawTowers(ctx, towers, playerNum, nowMs) {
        const isP1 = playerNum === 1;
        const primaryColor = isP1 ? '#00F2FE' : '#FF2A54';

        const list = [
            { key: 'left', data: towers.left, isMain: false },
            { key: 'main', data: towers.main, isMain: true },
            { key: 'right', data: towers.right, isMain: false }
        ];

        for (const t of list) {
            const tower = t.data;
            if (!tower.alive) {
                this.drawDestroyedFortress(ctx, tower, t.isMain, nowMs);
                continue;
            }

            // Find closest enemy unit to aim motorized turrets dynamically!
            let targetAngle = isP1 ? -Math.PI / 2 : Math.PI / 2;
            let hasTarget = false;
            if (this.currentSnapshot && this.currentSnapshot.units) {
                let minDist = tower.range || (t.isMain ? 310 : 260);
                let closest = null;
                for (const u of this.currentSnapshot.units) {
                    if (!u.alive || u.owner === playerNum || u.isStealth) continue;
                    const d = Math.hypot(u.x - tower.x, u.y - tower.y);
                    if (d <= minDist) {
                        minDist = d;
                        closest = u;
                    }
                }
                if (closest) {
                    targetAngle = Math.atan2(closest.y - tower.y, closest.x - tower.x);
                    hasTarget = true;
                } else {
                    // Idle subtle surveillance scan
                    targetAngle += Math.sin(nowMs * 0.0016 + (tower.x * 0.02)) * 0.28;
                }
            }

            ctx.save();
            ctx.translate(tower.x, tower.y);

            if (t.isMain) {
                this.drawMainCitadel(ctx, tower, isP1, primaryColor, targetAngle, hasTarget, nowMs);
            } else {
                this.drawSentryTower(ctx, tower, isP1, primaryColor, targetAngle, hasTarget, nowMs);
            }

            // Guardian Wrath aura (main citadel below 40% HP)
            if (tower.isEnraged) {
                const eRadius = (t.isMain ? 92 : 64) * (1 + Math.sin(nowMs * 0.012) * 0.12);
                const eGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, eRadius);
                eGrad.addColorStop(0, 'rgba(255, 90, 20, 0.55)');
                eGrad.addColorStop(0.6, 'rgba(255, 40, 0, 0.25)');
                eGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = eGrad;
                ctx.beginPath();
                ctx.arc(0, 0, eRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#FF4500';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, (t.isMain ? 74 : 54) * (1 + Math.sin(nowMs * 0.02) * 0.06), 0, Math.PI * 2);
                ctx.stroke();

                this.drawElectricArcs(ctx, t.isMain ? 66 : 48, '#FF4500', nowMs);
            }

            // Frozen Ice Dome Overlay (Cryo Freeze Pulse)
            if (tower.isFrozen) {
                const rFrozen = t.isMain ? 68 : 50;
                ctx.strokeStyle = '#A5F3FC';
                ctx.fillStyle = 'rgba(165, 243, 252, 0.35)';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(0, 0, rFrozen, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#E0F2FE';
                for (let k = 0; k < 6; k++) {
                    const ia = (k * Math.PI * 2) / 6;
                    const ix = Math.cos(ia) * rFrozen;
                    const iy = Math.sin(ia) * rFrozen;
                    ctx.beginPath();
                    ctx.moveTo(ix, iy);
                    ctx.lineTo(ix + Math.cos(ia) * 16, iy + Math.sin(ia) * 16);
                    ctx.lineTo(ix + Math.cos(ia + 0.3) * 8, iy + Math.sin(ia + 0.3) * 8);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            ctx.restore();

            // Segmented Holographic Health Bar
            const barY = tower.y + (isP1 ? (t.isMain ? 78 : 64) : (t.isMain ? -78 : -64));
            this.drawHealthBar(ctx, tower.x, barY, tower.hp, tower.maxHp, t.isMain ? 120 : 86, primaryColor, true);

            // Floating Holographic Level Badge
            const lvl = tower.level || (isP1 ? (typeof playerLevel !== 'undefined' ? playerLevel : 1) : 1);
            const badgeY = tower.y + (isP1 ? (t.isMain ? 102 : 88) : (t.isMain ? -102 : -88));
            this.drawTowerLevelBadge(ctx, tower.x, badgeY, lvl, primaryColor);
        }
    }

    drawTowerLevelBadge(ctx, x, y, level, primaryColor) {
        ctx.save();
        ctx.translate(x, y);

        // Shield container
        ctx.fillStyle = 'rgba(8, 14, 26, 0.92)';
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-22, -10, 44, 20, 5);
        else ctx.rect(-22, -10, 44, 20);
        ctx.fill();
        ctx.stroke();

        // Level text
        ctx.font = '900 11px "Rajdhani"';
        ctx.fillStyle = '#FFDE59';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv.${level}`, 0, 1);

        ctx.restore();
    }

    drawMainCitadel(ctx, tower, isP1, primaryColor, targetAngle, hasTarget, nowMs) {
        const baseRadius = 58;

        // 1. Ground Energy Foundation Ring
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius + 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Heavy 8-Sided Armored Bastion Platform
        ctx.fillStyle = '#0B111D';
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI * 2) / 8 + Math.PI / 8;
            const px = Math.cos(a) * baseRadius;
            const py = Math.sin(a) * baseRadius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4 Corner Outpost Bastions with LED lights
        for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI / 2);
            const bx = Math.cos(a) * (baseRadius - 4);
            const by = Math.sin(a) * (baseRadius - 4);
            ctx.fillStyle = '#1E293B';
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bx, by, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Conduit lines connecting bastions to core
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(0, 0);
            ctx.stroke();
        }

        // 3. Rotating Command Deck Ring
        const ringAngle = (nowMs * 0.001) % (Math.PI * 2);
        ctx.save();
        ctx.rotate(ringAngle);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 4. Central Nuclear Reactor Spire Core
        const corePulse = 1 + Math.sin(nowMs * 0.007) * 0.12;
        const radGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24 * corePulse);
        radGrad.addColorStop(0, '#FFFFFF');
        radGrad.addColorStop(0.5, primaryColor);
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 24 * corePulse, 0, Math.PI * 2);
        ctx.fill();

        // 5. Motorized Heavy Dual-Barrel Plasma Turret Head (Aims dynamically!)
        ctx.save();
        ctx.rotate(targetAngle);

        // Armored Mantlet Box
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-16, -16, 32, 32, 6);
        else ctx.rect(-16, -16, 32, 32);
        ctx.fill();
        ctx.stroke();

        // Twin Heavy Plasma Cannons extending forward along targetAngle
        ctx.fillStyle = primaryColor;
        ctx.fillRect(8, -10, 28, 7);
        ctx.fillRect(8, 3, 28, 7);

        // Glowing energy coils along barrels
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(16, -9, 4, 5);
        ctx.fillRect(16, 4, 4, 5);
        ctx.fillRect(24, -9, 4, 5);
        ctx.fillRect(24, 4, 4, 5);

        // Muzzle brakes
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(34, -12, 6, 11);
        ctx.fillRect(34, 1, 6, 11);

        // Laser targeting beam with reticle lock when enemy is locked
        if (hasTarget) {
            ctx.strokeStyle = isP1 ? 'rgba(0, 242, 254, 0.75)' : 'rgba(255, 42, 84, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(40, 0);
            ctx.lineTo(130, 0);
            ctx.stroke();
            ctx.setLineDash([]);

            // Reticle ping
            ctx.strokeStyle = isP1 ? '#00F2FE' : '#FF2A54';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(130, 0, 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // Command Spire Tip Apex
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSentryTower(ctx, tower, isP1, primaryColor, targetAngle, hasTarget, nowMs) {
        const baseRadius = 40;

        // 1. Reinforced Hex Bunker Base
        ctx.fillStyle = '#0B111D';
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI * 2) / 6;
            const px = Math.cos(a) * baseRadius;
            const py = Math.sin(a) * baseRadius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Neon armor edge segments
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius - 8, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Independent Rotating Radar Dish
        const radarAngle = (nowMs * 0.003) % (Math.PI * 2);
        ctx.save();
        ctx.rotate(radarAngle);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(baseRadius - 12, 0);
        ctx.stroke();
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(baseRadius - 12, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. Motorized Twin-Gatling Ball Turret (Aims dynamically!)
        ctx.save();
        ctx.rotate(targetAngle);

        // Ball turret dome
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Twin Gatling Barrels
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(8, -6, 20, 4);
        ctx.fillRect(8, 2, 20, 4);

        // Muzzle Glow and Laser Sight if target locked
        if (hasTarget) {
            ctx.fillStyle = primaryColor;
            ctx.beginPath();
            ctx.arc(28, -4, 3, 0, Math.PI * 2);
            ctx.arc(28, 4, 3, 0, Math.PI * 2);
            ctx.fill();

            // Laser sight line
            ctx.strokeStyle = isP1 ? 'rgba(0, 242, 254, 0.65)' : 'rgba(255, 42, 84, 0.65)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(30, 0);
            ctx.lineTo(110, 0);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    drawDestroyedFortress(ctx, tower, isMain, nowMs) {
        const rad = isMain ? 52 : 38;

        // 1. Molten Scorched Crater
        ctx.fillStyle = 'rgba(11, 15, 25, 0.95)';
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, rad, 0, Math.PI * 2);
        ctx.fill();

        // Fiery molten cracks
        ctx.strokeStyle = 'rgba(255, 69, 0, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tower.x - rad * 0.7, tower.y - rad * 0.2);
        ctx.lineTo(tower.x + rad * 0.1, tower.y + rad * 0.3);
        ctx.lineTo(tower.x + rad * 0.8, tower.y - rad * 0.4);
        ctx.moveTo(tower.x - rad * 0.3, tower.y + rad * 0.6);
        ctx.lineTo(tower.x + rad * 0.4, tower.y - rad * 0.5);
        ctx.stroke();

        // Shattered armor rim
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rising smoke plume rings
        const smokePhase = (nowMs * 0.002) % 1;
        ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.beginPath();
        ctx.arc(tower.x + Math.sin(nowMs * 0.003) * 6, tower.y - 12 - smokePhase * 24, 14 + smokePhase * 12, 0, Math.PI * 2);
        ctx.fill();

        // Intermittent electrical short-circuit spark
        if (Math.sin(nowMs * 0.02) > 0.85) {
            ctx.strokeStyle = '#FF2A54';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tower.x - 10, tower.y);
            ctx.lineTo(tower.x, tower.y - 8);
            ctx.lineTo(tower.x + 12, tower.y + 2);
            ctx.stroke();
        }

        // Glitch Holographic Sign
        const glitchAlpha = 0.6 + Math.sin(nowMs * 0.015) * 0.35;
        ctx.save();
        ctx.font = 'bold 13px "Rajdhani"';
        ctx.fillStyle = `rgba(255, 42, 84, ${glitchAlpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡ CRITICAL OFFLINE ⚡', tower.x, tower.y + 4);
        ctx.restore();
    }

    // --- UNIT SPRITES RENDERING ---
    drawUnits(ctx, alpha, nowMs) {
        if (!this.currentSnapshot) return;

        const currentUnits = this.currentSnapshot.units;
        const prevUnitsMap = new Map();
        if (this.prevSnapshot) {
            for (const u of this.prevSnapshot.units) prevUnitsMap.set(u.id, u);
        }

        // 1. Draw Nanite Healing Tether Beams (Aero-Medic Drones)
        for (const unit of currentUnits) {
            if (unit.healer && unit.healingTargetId) {
                const target = currentUnits.find(u => u.id === unit.healingTargetId && u.alive);
                if (target) {
                    const prev = prevUnitsMap.get(unit.id) || unit;
                    const uX = prev.x + (unit.x - prev.x) * alpha;
                    const uY = prev.y + (unit.y - prev.y) * alpha;

                    const tPrev = prevUnitsMap.get(target.id) || target;
                    const tX = tPrev.x + (target.x - tPrev.x) * alpha;
                    const tY = tPrev.y + (target.y - tPrev.y) * alpha;

                    ctx.save();
                    const tetherGrad = ctx.createLinearGradient(uX, uY, tX, tY);
                    tetherGrad.addColorStop(0, '#10B981');
                    tetherGrad.addColorStop(0.5, '#34D399');
                    tetherGrad.addColorStop(1, '#00F2FE');

                    // Outer glowing energy sheath
                    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(uX, uY);
                    ctx.lineTo(tX, tY);
                    ctx.stroke();

                    // Central rippling nanite stream
                    ctx.strokeStyle = tetherGrad;
                    ctx.lineWidth = 2.5;
                    const dist = Math.hypot(tX - uX, tY - uY);
                    const steps = 14;
                    ctx.beginPath();
                    ctx.moveTo(uX, uY);
                    for (let s = 1; s < steps; s++) {
                        const prog = s / steps;
                        const mx = uX + (tX - uX) * prog;
                        const my = uY + (tY - uY) * prog;
                        const wave = Math.sin(prog * 16 - nowMs * 0.015) * 5;
                        const perpX = -(tY - uY) / (dist || 1) * wave;
                        const perpY = (tX - uX) / (dist || 1) * wave;
                        ctx.lineTo(mx + perpX, my + perpY);
                    }
                    ctx.lineTo(tX, tY);
                    ctx.stroke();

                    // Flowing nanite sparkle node
                    const naniteProg = (nowMs * 0.0035) % 1;
                    const nx = uX + (tX - uX) * naniteProg;
                    const ny = uY + (tY - uY) * naniteProg;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }
            }
        }

        // 1.5. Draw Continuous Ramping Heat Beams (Inferno Tower)
        for (const unit of currentUnits) {
            if (unit.isRamping && unit.beamTargetId) {
                let targetPos = null;
                const targetUnit = currentUnits.find(u => u.id === unit.beamTargetId && u.alive);
                if (targetUnit) {
                    const tPrev = prevUnitsMap.get(targetUnit.id) || targetUnit;
                    targetPos = {
                        x: tPrev.x + (targetUnit.x - tPrev.x) * alpha,
                        y: tPrev.y + (targetUnit.y - tPrev.y) * alpha
                    };
                } else if (this.currentSnapshot) {
                    const allTowers = [
                        ...Object.values(this.currentSnapshot.p1.towers || {}),
                        ...Object.values(this.currentSnapshot.p2.towers || {})
                    ];
                    const tTower = allTowers.find(t => t.id === unit.beamTargetId && t.alive);
                    if (tTower) {
                        targetPos = { x: tTower.x, y: tTower.y };
                    }
                }

                if (targetPos) {
                    const prev = prevUnitsMap.get(unit.id) || unit;
                    const uX = prev.x + (unit.x - prev.x) * alpha;
                    const uY = prev.y + (unit.y - prev.y) * alpha;

                    ctx.save();
                    const duration = unit.beamDuration || 0;
                    const rampFactor = Math.min(1.0, duration / 4.0);
                    const outerWidth = 4 + rampFactor * 14;
                    const innerWidth = 1.5 + rampFactor * 6;

                    const beamGrad = ctx.createLinearGradient(uX, uY, targetPos.x, targetPos.y);
                    if (rampFactor < 0.4) {
                        beamGrad.addColorStop(0, '#FF4500');
                        beamGrad.addColorStop(0.6, '#FF8C00');
                        beamGrad.addColorStop(1, '#FFD700');
                    } else if (rampFactor < 0.8) {
                        beamGrad.addColorStop(0, '#FF1493');
                        beamGrad.addColorStop(0.5, '#FF4500');
                        beamGrad.addColorStop(1, '#FFFA65');
                    } else {
                        beamGrad.addColorStop(0, '#FF0055');
                        beamGrad.addColorStop(0.4, '#FFE600');
                        beamGrad.addColorStop(0.8, '#00F2FE');
                        beamGrad.addColorStop(1, '#FFFFFF');
                    }

                    // Outer intense heat aura
                    ctx.strokeStyle = rampFactor > 0.7 ? 'rgba(255, 40, 0, 0.65)' : 'rgba(255, 69, 0, 0.4)';
                    ctx.lineWidth = outerWidth;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(uX, uY);
                    ctx.lineTo(targetPos.x, targetPos.y);
                    ctx.stroke();

                    // Inner plasma core beam
                    ctx.strokeStyle = beamGrad;
                    ctx.lineWidth = innerWidth;
                    ctx.beginPath();
                    ctx.moveTo(uX, uY);
                    ctx.lineTo(targetPos.x, targetPos.y);
                    ctx.stroke();

                    // White superheated center filament
                    if (rampFactor > 0.3) {
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = Math.max(1, innerWidth * 0.4);
                        ctx.beginPath();
                        ctx.moveTo(uX, uY);
                        ctx.lineTo(targetPos.x, targetPos.y);
                        ctx.stroke();
                    }

                    // Target impact scorch flare
                    const flareRadius = 8 + rampFactor * 18;
                    const pulse = Math.sin(nowMs * 0.03) * 3;
                    const flareGrad = ctx.createRadialGradient(targetPos.x, targetPos.y, 0, targetPos.x, targetPos.y, flareRadius + pulse);
                    flareGrad.addColorStop(0, '#FFFFFF');
                    flareGrad.addColorStop(0.3, rampFactor > 0.7 ? '#FFE600' : '#FF4500');
                    flareGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                    ctx.fillStyle = flareGrad;
                    ctx.beginPath();
                    ctx.arc(targetPos.x, targetPos.y, flareRadius + pulse, 0, Math.PI * 2);
                    ctx.fill();

                    // Emitter muzzle glow at tower top
                    ctx.fillStyle = '#FFE600';
                    ctx.beginPath();
                    ctx.arc(uX, uY, 5 + rampFactor * 6, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }
            }
        }

        // 2. Draw Each Tactical Unit
        for (const unit of currentUnits) {
            const prev = prevUnitsMap.get(unit.id) || unit;

            const renderX = prev.x + (unit.x - prev.x) * alpha;
            const renderY = prev.y + (unit.y - prev.y) * alpha;

            // Angle interpolation
            let unitAngle = unit.angle !== undefined ? unit.angle : (unit.owner === 1 ? -Math.PI / 2 : Math.PI / 2);
            if (prev && prev.angle !== undefined) {
                let diff = unit.angle - prev.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                unitAngle = prev.angle + diff * alpha;
            }

            const isP1 = unit.owner === 1;
            const teamColor = isP1 ? '#00F2FE' : '#FF2A54';

            // Aerial hover: gentle vertical bob (flying units are above the ground plane)
            const airBob = unit.isAerial ? (Math.sin(nowMs * 0.005 + (unit.id || 0) * 1.7) * 3.5 - 4) : 0;

            // Adrenaline Ghost Motion Trails (adrenalineTimer locally, hasAdrenaline from online snapshots)
            if ((unit.adrenalineTimer || 0) > 0 || unit.hasAdrenaline) {
                ctx.save();
                ctx.globalAlpha = 0.28;
                ctx.translate(renderX - Math.cos(unitAngle) * 16, renderY + airBob - Math.sin(unitAngle) * 16);
                ctx.rotate(unitAngle + Math.PI / 2);
                this.renderUnitSprite(ctx, unit, '#FFB703', nowMs);
                ctx.restore();
            }

            ctx.save();
            ctx.translate(renderX, renderY + airBob);

            // Ground shadow (aerial units cast a smaller, lower, fainter shadow)
            ctx.fillStyle = unit.isAerial ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, unit.isAerial ? 42 : 18, unit.isAerial ? 16 : 22, unit.isAerial ? 6 : 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Stun effect
            if (unit.isStunned) {
                ctx.strokeStyle = '#FFB703';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.arc(0, 0, 42, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Frozen effect (Cryo Freeze Pulse)
            if (unit.isFrozen) {
                ctx.strokeStyle = '#A5F3FC';
                ctx.fillStyle = 'rgba(165, 243, 252, 0.28)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 38, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // 4 Ice crystal spikes
                ctx.fillStyle = '#E0F2FE';
                for (let k = 0; k < 4; k++) {
                    const ia = (k * Math.PI / 2) + Math.PI / 4;
                    const ix = Math.cos(ia) * 38;
                    const iy = Math.sin(ia) * 38;
                    ctx.beginPath();
                    ctx.moveTo(ix, iy);
                    ctx.lineTo(ix + Math.cos(ia) * 12, iy + Math.sin(ia) * 12);
                    ctx.lineTo(ix + Math.cos(ia + 0.3) * 6, iy + Math.sin(ia + 0.3) * 6);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Slowed / burning status ring (plasma burn & cryo post-thaw slow)
            if (unit.isSlowed || unit.isBurning) {
                ctx.strokeStyle = unit.isBurning ? 'rgba(255, 120, 0, 0.85)' : 'rgba(245, 158, 11, 0.75)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(0, 0, 28, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                if (unit.isBurning) {
                    // Small flickering flame glyph above the unit
                    const flick = 0.6 + Math.sin(nowMs * 0.02 + (unit.id || 0)) * 0.4;
                    ctx.fillStyle = `rgba(255, 160, 30, ${flick})`;
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🔥', 14, -30);
                }
            }

            // Shield bubble
            if (unit.shieldHp > 0) {
                ctx.strokeStyle = 'rgba(0, 242, 254, 0.85)';
                ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 36, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // Deployable structure remaining decay ring (Sentry Bunker)
            if (unit.isBuilding && unit.decayTimer !== undefined && unit.decayTimer > 0) {
                const decayPct = Math.max(0, unit.decayTimer / (unit.decayTotal || 35));
                ctx.strokeStyle = 'rgba(255, 183, 3, 0.85)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, 38, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * decayPct));
                ctx.stroke();
            }

            // Stealth Optical Cloaking Shimmer
            if (unit.isStealth) {
                ctx.globalAlpha = 0.32;
                ctx.strokeStyle = '#00F2FE';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(0, 0, 32, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Magnetic snap highlight during card drag
            if (this.dragState.snappedUnitId === unit.id) {
                ctx.strokeStyle = '#00F2FE';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, 48 + Math.sin(nowMs * 0.01) * 5, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#00F2FE';
                ctx.font = 'bold 20px "Rajdhani"';
                ctx.textAlign = 'center';
                ctx.fillText('FUSION READY', 0, -52);
            }

            // Rotate Mecha Vector to match dynamic facing direction!
            ctx.save();
            ctx.rotate(unitAngle + Math.PI / 2);
            this.renderUnitSprite(ctx, unit, teamColor, nowMs);

            // Muzzle Flash when attacking
            if (unit.state === 'ATTACK') {
                const flashY = -34;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(0, flashY, 4, 0, Math.PI * 2);
                ctx.fill();

                // 4-Point Star Muzzle Flare
                ctx.fillStyle = teamColor;
                ctx.beginPath();
                ctx.moveTo(0, flashY - 14);
                ctx.lineTo(3, flashY);
                ctx.lineTo(14, flashY);
                ctx.lineTo(3, flashY + 2);
                ctx.lineTo(0, flashY + 14);
                ctx.lineTo(-3, flashY + 2);
                ctx.lineTo(-14, flashY);
                ctx.lineTo(-3, flashY);
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
            ctx.restore();

            // Low-HP Critical Damage Smoke & Sparks (<30% HP)
            if (unit.hp / unit.maxHp < 0.3) {
                ctx.save();
                ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
                const smokePhase = (nowMs * 0.003 + (unit.id || 0)) % 1;
                ctx.beginPath();
                ctx.arc(renderX + Math.sin(nowMs * 0.008) * 6, renderY - 12 - smokePhase * 20, 5 + smokePhase * 8, 0, Math.PI * 2);
                ctx.fill();

                if (Math.sin(nowMs * 0.02 + (unit.id || 0)) > 0.8) {
                    ctx.strokeStyle = '#FF2A54';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(renderX - 6, renderY - 8);
                    ctx.lineTo(renderX + 2, renderY - 14);
                    ctx.lineTo(renderX + 8, renderY - 6);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Health Bar (drawn horizontally above the unit)
            this.drawHealthBar(ctx, renderX, renderY - 44, unit.hp, unit.maxHp, 64, teamColor, false);

            // Unit Level Badge (Lv.X)
            const uLvl = unit.level || 1;
            ctx.save();
            ctx.fillStyle = 'rgba(6, 10, 20, 0.9)';
            ctx.strokeStyle = teamColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') ctx.roundRect(renderX - 45, renderY - 50, 16, 12, 2);
            else ctx.rect(renderX - 45, renderY - 50, 16, 12);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 9px "Rajdhani", sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${uLvl}`, renderX - 37, renderY - 44);
            ctx.restore();
        }
    }

    drawOvertimeSkyBanner(ctx, nowMs) {
        if (!this.currentSnapshot || !this.currentSnapshot.isOvertime) return;

        const bx = 540;
        const by = 215; // Directly in the sky above enemy base (y = 295) and below top HUD
        const bw = 500;
        const bh = 64;

        const overtimeSec = this.currentSnapshot.overtimeRemaining !== undefined
            ? this.currentSnapshot.overtimeRemaining
            : (this.currentSnapshot.timeRemaining || 0);

        const isUrgent = overtimeSec <= 15;
        const glowColor = isUrgent ? '#FF2A54' : '#FFB703';
        const pulse = 0.5 + Math.sin(nowMs * 0.008) * 0.5;

        ctx.save();
        ctx.translate(bx, by);

        // 1. Semi-translucent holographic dark panel with glow border
        ctx.fillStyle = 'rgba(6, 8, 14, 0.90)';
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 2.5;

        // Chamfered corner hexagon banner
        const chamf = 14;
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + chamf, -bh / 2);
        ctx.lineTo(bw / 2 - chamf, -bh / 2);
        ctx.lineTo(bw / 2, -bh / 2 + chamf);
        ctx.lineTo(bw / 2, bh / 2 - chamf);
        ctx.lineTo(bw / 2 - chamf, bh / 2);
        ctx.lineTo(-bw / 2 + chamf, bh / 2);
        ctx.lineTo(-bw / 2, bh / 2 - chamf);
        ctx.lineTo(-bw / 2, -bh / 2 + chamf);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. Neon Corner Tech Brackets
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        const bLen = 14;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(-bw / 2 - 4, -bh / 2 + bLen); ctx.lineTo(-bw / 2 - 4, -bh / 2 - 4); ctx.lineTo(-bw / 2 + bLen, -bh / 2 - 4);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(bw / 2 + 4, -bh / 2 + bLen); ctx.lineTo(bw / 2 + 4, -bh / 2 - 4); ctx.lineTo(bw / 2 - bLen, -bh / 2 - 4);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(-bw / 2 - 4, bh / 2 - bLen); ctx.lineTo(-bw / 2 - 4, bh / 2 + 4); ctx.lineTo(-bw / 2 + bLen, bh / 2 + 4);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bw / 2 + 4, bh / 2 - bLen); ctx.lineTo(bw / 2 + 4, bh / 2 + 4); ctx.lineTo(bw / 2 - bLen, bh / 2 + 4);
        ctx.stroke();

        // 3. Side warning chevrons
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 2.5;
        // Left chevrons
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + 20, -10); ctx.lineTo(-bw / 2 + 28, 0); ctx.lineTo(-bw / 2 + 20, 10);
        ctx.moveTo(-bw / 2 + 32, -10); ctx.lineTo(-bw / 2 + 40, 0); ctx.lineTo(-bw / 2 + 32, 10);
        ctx.stroke();
        // Right chevrons
        ctx.beginPath();
        ctx.moveTo(bw / 2 - 20, -10); ctx.lineTo(bw / 2 - 28, 0); ctx.lineTo(bw / 2 - 20, 10);
        ctx.moveTo(bw / 2 - 32, -10); ctx.lineTo(bw / 2 - 40, 0); ctx.lineTo(bw / 2 - 32, 10);
        ctx.stroke();

        // 4. Banner Text
        ctx.textAlign = 'center';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12 * pulse;

        // Title
        ctx.font = 'bold 18px "Rajdhani", sans-serif';
        ctx.fillStyle = glowColor;
        const title = isUrgent
            ? '⚠️ استنزاف حاسم للمباني (SUDDEN DEATH TIEBREAKER) ⚠️'
            : '⚡ الوقت الإضافي - الهدف الذهبي (SUDDEN DEATH) ⚡';
        ctx.fillText(title, 0, -6);

        // Subtitle
        ctx.font = '600 13px "Readex Pro", sans-serif';
        ctx.fillStyle = '#F1F5F9';
        ctx.shadowBlur = 0;
        const sub = `أول قلعة تسقط تحسم الفوز فوراً | المتبقي: ${overtimeSec} ثانية`;
        ctx.fillText(sub, 0, 19);

        ctx.restore();
    }

    drawThermalStorms(ctx, nowMs) {
        const storms = (this.currentSnapshot && this.currentSnapshot.thermalStorms) || [];
        if (storms.length === 0) return;
        const t = nowMs / 1000;
        for (const s of storms) {
            if (s.active) {
                // Erupting fire cell: glowing core, dashed heat boundary, rising embers
                const pulse = 1 + Math.sin(t * 9 + s.id) * 0.06;
                const r = s.radius * pulse;
                const grad = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, r);
                grad.addColorStop(0, 'rgba(255, 190, 80, 0.34)');
                grad.addColorStop(0.65, 'rgba(255, 90, 30, 0.20)');
                grad.addColorStop(1, 'rgba(255, 60, 20, 0.0)');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(255, 140, 50, 0.85)';
                ctx.lineWidth = 3;
                ctx.setLineDash([14, 10]);
                ctx.lineDashOffset = -t * 60;
                ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                if (Math.random() < 0.5) {
                    this.createSparks(s.x + (Math.random() - 0.5) * r * 1.4, s.y + (Math.random() - 0.5) * r * 1.4, 1, Math.random() < 0.5 ? '#FFB703' : '#FF5722');
                }
            } else {
                // Warning telegraph: pulsing dashed ring that grows as the cell ignites
                const progress = 1 - (s.warnTicks / 60);
                const r = s.radius * (0.55 + progress * 0.45);
                const blink = (Math.sin(t * 10) + 1) / 2;
                ctx.strokeStyle = `rgba(255, 150, 60, ${0.35 + blink * 0.45})`;
                ctx.lineWidth = 2.5;
                ctx.setLineDash([10, 12]);
                ctx.lineDashOffset = -t * 90;
                ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = `rgba(255, 150, 60, ${0.10 + blink * 0.10})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
                if (Math.floor(t * 4) % 2 === 0) {
                    ctx.font = '34px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🌪️', s.x, s.y + 12);
                }
            }
        }
    }

    drawHazardSkyBanner(ctx, dt, nowMs) {
        if (!this.activeHazardAlert) return;
        this.activeHazardAlert.life -= dt;
        if (this.activeHazardAlert.life <= 0) {
            this.activeHazardAlert = null;
            return;
        }

        const alert = this.activeHazardAlert;
        const alpha = Math.min(1.0, alert.life / 0.5);
        const isStorm = alert.hazardType === 'plasma_storm';
        const glowColor = isStorm ? '#C084FC' : '#FBBF24';
        const pulse = 0.6 + Math.sin(nowMs * 0.012) * 0.4;

        const bx = 540;
        const by = 820; // Exactly across the plasma river chasm
        const bw = 580;
        const bh = 76;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(bx, by);

        // Semi-translucent cyber holographic plate
        ctx.fillStyle = 'rgba(6, 8, 14, 0.94)';
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;

        const chamf = 16;
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + chamf, -bh / 2);
        ctx.lineTo(bw / 2 - chamf, -bh / 2);
        ctx.lineTo(bw / 2, -bh / 2 + chamf);
        ctx.lineTo(bw / 2, bh / 2 - chamf);
        ctx.lineTo(bw / 2 - chamf, bh / 2);
        ctx.lineTo(-bw / 2 + chamf, bh / 2);
        ctx.lineTo(-bw / 2, bh / 2 - chamf);
        ctx.lineTo(-bw / 2, -bh / 2 + chamf);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Neon cyber bracket corners
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        const bLen = 12;
        ctx.beginPath();
        ctx.moveTo(-bw / 2 - 3, -bh / 2 + bLen); ctx.lineTo(-bw / 2 - 3, -bh / 2 - 3); ctx.lineTo(-bw / 2 + bLen, -bh / 2 - 3);
        ctx.moveTo(bw / 2 + 3, -bh / 2 + bLen); ctx.lineTo(bw / 2 + 3, -bh / 2 - 3); ctx.lineTo(bw / 2 - bLen, -bh / 2 - 3);
        ctx.moveTo(-bw / 2 - 3, bh / 2 - bLen); ctx.lineTo(-bw / 2 - 3, bh / 2 + 3); ctx.lineTo(-bw / 2 + bLen, bh / 2 + 3);
        ctx.moveTo(bw / 2 + 3, bh / 2 - bLen); ctx.lineTo(bw / 2 + 3, bh / 2 + 3); ctx.lineTo(bw / 2 - bLen, bh / 2 + 3);
        ctx.stroke();

        // Hazard Banner Content
        ctx.textAlign = 'center';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 14 * pulse;

        ctx.font = 'bold 20px "Rajdhani", sans-serif';
        ctx.fillStyle = glowColor;
        ctx.fillText(`⚠️ إنذار بيئي تكتيكي: ${alert.title} ⚠️`, 0, -8);

        ctx.font = '600 13px "Readex Pro", sans-serif';
        ctx.fillStyle = '#F8FAFC';
        ctx.shadowBlur = 0;
        ctx.fillText(alert.desc, 0, 19);

        ctx.restore();
    }

    renderUnitSprite(ctx, unit, color, nowMs) {
        if (unit.cardId === 'sentry_bunker' || unit.cardId === 'fortress_turret') {
            // SENTRY BUNKER / FORTRESS BASTION: Deployable Heavy Ground Emplacement
            const isFortress = unit.cardId === 'fortress_turret' || unit.fusionTier > 0;
            const r = isFortress ? 34 : 28;
            const isAttacking = unit.state === 'ATTACK';
            const gatlingSpin = isAttacking ? (nowMs * 0.08) % (Math.PI * 2) : 0;

            // 1. Reinforced Octagonal Concrete/Armor Foundation
            ctx.fillStyle = '#0F172A';
            ctx.strokeStyle = isFortress ? '#FFB703' : color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI * 2) / 8 + Math.PI / 8;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Heavy Corner Steel Brackets & Hazard Markings
            ctx.fillStyle = '#1E293B';
            [-r * 0.7, r * 0.7].forEach(bx => {
                [-r * 0.7, r * 0.7].forEach(by => {
                    ctx.fillRect(bx - 4, by - 4, 8, 8);
                });
            });

            // Hazard stripe accents
            ctx.strokeStyle = isFortress ? '#FFB703' : color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-r + 6, r - 6); ctx.lineTo(r - 6, r - 6);
            ctx.stroke();

            // 3. Central Armored Rotating Gatling Ball Turret
            ctx.fillStyle = '#1E293B';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Twin Rapid Gatling Barrels (extending forward)
            ctx.save();
            ctx.rotate(gatlingSpin * 0.2); // slight barrel vibration
            ctx.fillStyle = '#334155';
            ctx.strokeStyle = isFortress ? '#FFB703' : color;
            ctx.lineWidth = 1.5;
            // Left barrel
            ctx.fillRect(-9, -r - 12, 5, 18);
            ctx.strokeRect(-9, -r - 12, 5, 18);
            // Right barrel
            ctx.fillRect(4, -r - 12, 5, 18);
            ctx.strokeRect(4, -r - 12, 5, 18);

            // Muzzle flutes / flash suppressors
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(-10, -r - 14, 7, 3);
            ctx.fillRect(3, -r - 14, 7, 3);
            ctx.restore();

            // 4. Central Optic Sensor Eye (pulsing red/amber)
            const eyePulse = 0.7 + Math.sin(nowMs * 0.01) * 0.3;
            ctx.fillStyle = isFortress ? `rgba(255, 183, 3, ${eyePulse})` : `rgba(255, 42, 84, ${eyePulse})`;
            ctx.beginPath();
            ctx.arc(0, -2, 5, 0, Math.PI * 2);
            ctx.fill();

            // Cooling Exhaust Vents with subtle steam
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(-6, r * 0.4, 12, 3);
        } else if (unit.cardId === 'mortar_cannon' || unit.cardId === 'hellfire_mortar') {
            // CYBER SIEGE MORTAR / HELLFIRE MORTAR: Heavy Arced Artillery Emplacement
            const isHellfire = unit.cardId === 'hellfire_mortar' || unit.fusionTier > 0;
            const r = isHellfire ? 35 : 29;
            const isAttacking = unit.state === 'ATTACK';
            const recoilOffset = isAttacking ? 6 : 0;

            // 1. Heavy Reinforced Circular Blast Plate
            ctx.fillStyle = '#090D16';
            ctx.strokeStyle = isHellfire ? '#FF4500' : '#FFB703';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 2. Heavy Outrigger Tripod Anchors with hydraulic jacks
            ctx.fillStyle = '#1E293B';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            [0, Math.PI * 0.67, Math.PI * 1.33].forEach(ang => {
                ctx.save();
                ctx.rotate(ang);
                ctx.fillRect(-6, r - 3, 12, 14);
                ctx.strokeRect(-6, r - 3, 12, 14);
                ctx.fillStyle = isHellfire ? '#FF4500' : '#FFB703';
                ctx.fillRect(-3, r + 7, 6, 4);
                ctx.restore();
            });

            // 3. Hazard Warning Ring on Baseplate
            ctx.strokeStyle = isHellfire ? '#FF4500' : '#FFB703';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
            ctx.stroke();

            // 4. Massive Cylindrical Siege Mortar Tube
            ctx.save();
            ctx.translate(0, recoilOffset);
            // Hydraulic recoil dampers on sides
            ctx.fillStyle = '#334155';
            ctx.fillRect(-14, -r * 0.8, 4, r * 0.9);
            ctx.fillRect(10, -r * 0.8, 4, r * 0.9);

            // Mortar main barrel
            const barrelGrad = ctx.createLinearGradient(-10, 0, 10, 0);
            barrelGrad.addColorStop(0, '#1E293B');
            barrelGrad.addColorStop(0.5, '#475569');
            barrelGrad.addColorStop(1, '#0F172A');
            ctx.fillStyle = barrelGrad;
            ctx.strokeStyle = isHellfire ? '#FF2A54' : '#00F2FE';
            ctx.lineWidth = 2;
            ctx.fillRect(-10, -r - 10, 20, r + 8);
            ctx.strokeRect(-10, -r - 10, 20, r + 8);

            // Muzzle Ring & Reinforced Choke
            ctx.fillStyle = isHellfire ? '#FF4500' : '#FFB703';
            ctx.fillRect(-12, -r - 14, 24, 6);

            // Glowing Plasma Breach / Core inside barrel
            ctx.fillStyle = isHellfire ? '#FF0055' : '#00F2FE';
            ctx.shadowColor = isHellfire ? '#FF0055' : '#00F2FE';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.ellipse(0, -r - 14, 8, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Warning targeting light
            ctx.fillStyle = '#FF2A54';
            ctx.fillRect(-2, -4, 4, 8);
            ctx.restore();
        } else if (unit.cardId === 'drone_factory') {
            // DRONE FACTORY (DRONE SPAWNER HUB): Heavy Industrial Robotics Hangar
            const r = 32;
            const hangarPulse = (Math.sin(nowMs * 0.005) + 1) * 0.5;

            // 1. Reinforced Hexagonal Foundation
            ctx.fillStyle = '#0B1220';
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI * 2) / 6;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Heavy Corner Steel Rivets
            ctx.fillStyle = '#334155';
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI * 2) / 6;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4), 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // 3. Central Dual Launch Bay Hatch Doors
            ctx.fillStyle = '#1E293B';
            ctx.strokeStyle = '#00F2FE';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-16, -14, 32, 28);
            ctx.fillRect(-16, -14, 32, 28);

            // Runway Arrows inside Launch Bay
            ctx.fillStyle = `rgba(0, 242, 254, ${0.4 + hangarPulse * 0.6})`;
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(8, -2);
            ctx.lineTo(3, -2);
            ctx.lineTo(3, 8);
            ctx.lineTo(-3, 8);
            ctx.lineTo(-3, -2);
            ctx.lineTo(-8, -2);
            ctx.closePath();
            ctx.fill();

            // 4. Rotating Turbine Fan on top of Hangar
            const fanAngle = (nowMs * 0.008) % (Math.PI * 2);
            ctx.save();
            ctx.rotate(fanAngle);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 2;
            for (let b = 0; b < 3; b++) {
                const ba = (b * Math.PI * 2) / 3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(ba) * 12, Math.sin(ba) * 12);
                ctx.stroke();
            }
            ctx.restore();

            // 5. Dual Communication Aerial Antenna Spikes with blinking LEDs
            ctx.strokeStyle = '#64748B';
            ctx.lineWidth = 2;
            // Left Antenna
            ctx.beginPath();
            ctx.moveTo(-r + 4, -8);
            ctx.lineTo(-r - 4, -20);
            ctx.stroke();
            ctx.fillStyle = (nowMs % 600 < 300) ? '#10B981' : '#047857';
            ctx.beginPath();
            ctx.arc(-r - 4, -20, 3, 0, Math.PI * 2);
            ctx.fill();

            // Right Antenna
            ctx.beginPath();
            ctx.moveTo(r - 4, -8);
            ctx.lineTo(r + 4, -20);
            ctx.stroke();
            ctx.fillStyle = (nowMs % 600 >= 300) ? '#10B981' : '#047857';
            ctx.beginPath();
            ctx.arc(r + 4, -20, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (unit.cardId === 'inferno_tower') {
            // INFERNO TOWER: High-Tech Ramping Laser Citadel Pylon
            const r = 30;
            const rampFactor = unit.beamTargetId ? Math.min(1.0, (unit.beamDuration || 0) / 4.0) : 0;
            const coreColor = rampFactor > 0.7 ? '#FF0055' : (rampFactor > 0.3 ? '#FF4500' : '#FFA500');

            // 1. Reinforced Hexagonal Heat-Sinks Base
            ctx.fillStyle = '#0F172A';
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI * 2) / 6;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Spinning Cooling Exhaust Rings
            const ringSpin = (nowMs * (0.003 + rampFactor * 0.01)) % (Math.PI * 2);
            ctx.save();
            ctx.rotate(ringSpin);
            ctx.strokeStyle = coreColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // 3. Central Ramping Thermal Lens & Glowing Core
            const corePulse = 1 + Math.sin(nowMs * (0.01 + rampFactor * 0.03)) * 0.25;
            const coreRad = (8 + rampFactor * 8) * corePulse;
            const lensGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRad);
            lensGrad.addColorStop(0, '#FFFFFF');
            lensGrad.addColorStop(0.4, coreColor);
            lensGrad.addColorStop(1, 'rgba(255, 69, 0, 0)');
            ctx.fillStyle = lensGrad;
            ctx.beginPath();
            ctx.arc(0, 0, coreRad, 0, Math.PI * 2);
            ctx.fill();

            // 4. Heavy Focused Laser Emitter Nozzle
            ctx.fillStyle = '#1E293B';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -r + 4, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (unit.cardId === 'electro_striker') {
            // ELECTRO STRIKER: Mobile High-Voltage Shock Commando
            const r = 21;

            // 1. Dual High-Voltage Gauntlet Coils (drawn on sides)
            ctx.fillStyle = '#00F2FE';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            // Left coil
            ctx.fillRect(-r - 4, -12, 6, 16);
            ctx.strokeRect(-r - 4, -12, 6, 16);
            // Right coil
            ctx.fillRect(r - 2, -12, 6, 16);
            ctx.strokeRect(r - 2, -12, 6, 16);

            // 2. Electric Shock Arcs dancing between wrists
            ctx.strokeStyle = '#00F2FE';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const sparkY = -6 + Math.sin(nowMs * 0.05) * 4;
            ctx.moveTo(-r, sparkY);
            ctx.lineTo(-6, sparkY - 5);
            ctx.lineTo(6, sparkY + 5);
            ctx.lineTo(r, sparkY);
            ctx.stroke();

            // 3. Armored Cyber Chassis
            ctx.fillStyle = '#0F172A';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 4. Capacitive Dynamo Backpack / Battery Pack
            ctx.fillStyle = '#1E293B';
            ctx.fillRect(-8, 8, 16, 8);
            ctx.fillStyle = '#00F2FE';
            ctx.fillRect(-6, 10, 12, 4);

            // 5. Electrified Combat Visor
            ctx.fillStyle = '#00F2FE';
            ctx.beginPath();
            ctx.moveTo(-8, -6);
            ctx.lineTo(8, -6);
            ctx.lineTo(5, -12);
            ctx.lineTo(-5, -12);
            ctx.closePath();
            ctx.fill();

            // 6. Micro-lightning aura around body
            this.drawElectricArcs(ctx, r + 4, '#00F2FE', nowMs);
        } else if (unit.cardId === 'ghost_sniper' || unit.cardId === 'vortex_sniper') {
            // GHOST SNIPER / VORTEX SNIPER: Stealth Assassin Cyber Marksman
            const isVortex = unit.cardId === 'vortex_sniper' || unit.fusionTier > 0;
            const r = isVortex ? 22 : 18;

            // 1. Sleek Carbon Assassin Chassis (Angular Stealth Hull)
            ctx.fillStyle = '#0A0F1D';
            ctx.strokeStyle = isVortex ? '#A855F7' : (unit.isStealth ? '#00F2FE' : color);
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(0, -r - 6);
            ctx.lineTo(r, r * 0.5);
            ctx.lineTo(r * 0.4, r);
            ctx.lineTo(-r * 0.4, r);
            ctx.lineTo(-r, r * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Ultra-Long Heavy Rail Sniper Rifle (Extends 44px forward!)
            const gunLen = isVortex ? 46 : 38;
            ctx.fillStyle = '#1E293B';
            ctx.strokeStyle = isVortex ? '#C084FC' : '#64748B';
            ctx.lineWidth = 1.5;
            ctx.fillRect(-3, -gunLen, 6, gunLen);
            ctx.strokeRect(-3, -gunLen, 6, gunLen);

            // Barrel Induction Accelerator Coils
            ctx.fillStyle = isVortex ? '#A855F7' : '#00F2FE';
            for (let y = -gunLen + 8; y <= -12; y += 7) {
                ctx.fillRect(-5, y, 10, 2.5);
            }

            // Vortex Rings (for Vortex Sniper)
            if (isVortex) {
                const ringPulse = 1 + Math.sin(nowMs * 0.015) * 0.2;
                ctx.strokeStyle = '#E879F9';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(0, -gunLen * 0.6, 9 * ringPulse, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 3. High-Magnification Scope with Optical Lens
            ctx.fillStyle = '#334155';
            ctx.fillRect(4, -20, 4, 14);
            ctx.fillStyle = isVortex ? '#A855F7' : '#FF2A54';
            ctx.beginPath();
            ctx.arc(6, -21, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Forward Laser Guidance Line
            ctx.strokeStyle = isVortex ? 'rgba(168, 85, 247, 0.6)' : 'rgba(0, 242, 254, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, -gunLen);
            ctx.lineTo(0, -gunLen - 55);
            ctx.stroke();
            ctx.setLineDash([]);

            // 4. Rear Tripod Recoil Stabilizers
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-r * 0.3, r * 0.6); ctx.lineTo(-r * 0.9, r * 1.3);
            ctx.moveTo(r * 0.3, r * 0.6);  ctx.lineTo(r * 0.9, r * 1.3);
            ctx.stroke();
        } else if (unit.cardId === 'aero_repairer' || unit.cardId === 'overcharge_drone') {
            // AERO-MEDIC DRONE / OVERCHARGE DRONE: Tactical Support Craft
            const isOvercharge = unit.cardId === 'overcharge_drone' || unit.fusionTier > 0;
            const r = isOvercharge ? 24 : 20;
            const rotorAngle = (nowMs * 0.035) % (Math.PI * 2);

            // 1. Aerodynamic Medical Fuselage
            ctx.fillStyle = '#0B1220';
            ctx.strokeStyle = isOvercharge ? '#FFB703' : '#10B981';
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.85, r * 1.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 2. Twin High-Lift Wing Nacelles with Spinning Rotors
            const nacelles = [[-r - 8, -4], [r + 8, -4]];
            for (const [nx, ny] of nacelles) {
                // Nacelle wing strut
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(0, ny);
                ctx.lineTo(nx, ny);
                ctx.stroke();

                // Spinning Rotor Disk Halo
                ctx.strokeStyle = isOvercharge ? 'rgba(255, 183, 3, 0.6)' : 'rgba(16, 185, 129, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(nx, ny, 11, 0, Math.PI * 2);
                ctx.stroke();

                // Rotor Blades
                ctx.save();
                ctx.translate(nx, ny);
                ctx.rotate(rotorAngle);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
                ctx.stroke();
                ctx.restore();
            }

            // 3. Glowing Medical Insignia (Caduceus / Cross)
            const medColor = isOvercharge ? '#FFB703' : '#10B981';
            ctx.fillStyle = medColor;
            // Vertical bar
            ctx.fillRect(-2.5, -8, 5, 16);
            // Horizontal bar
            ctx.fillRect(-8, -2.5, 16, 5);

            // 4. Underside Nanite Projection Emitter (Emerald Orb)
            const emitterPulse = 1 + Math.sin(nowMs * 0.012) * 0.2;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, -r * 0.7, 4 * emitterPulse, 0, Math.PI * 2);
            ctx.fill();

            // Forward ion headlights
            ctx.fillStyle = medColor;
            ctx.beginPath();
            ctx.arc(-5, -r * 0.9, 2.5, 0, Math.PI * 2);
            ctx.arc(5, -r * 0.9, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (unit.isHeavy) {
            // MECH TITAN / SIEGE COLOSSUS: Heavy Cyber Tank
            const isColossus = unit.fusionTier > 0;
            const r = isColossus ? 36 : 30;
            const recoil = unit.state === 'ATTACK' ? -4 : 0;

            // 1. Caterpillar Treads (Left and Right)
            const treadW = 10;
            const treadH = r * 1.8;
            const treadY = -treadH / 2;
            const treadOffset = (nowMs * 0.04) % 8;

            ctx.fillStyle = '#0B1220';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;

            // Left tread
            ctx.fillRect(-r - treadW, treadY, treadW, treadH);
            ctx.strokeRect(-r - treadW, treadY, treadW, treadH);
            // Right tread
            ctx.fillRect(r, treadY, treadW, treadH);
            ctx.strokeRect(r, treadY, treadW, treadH);

            // Tread links / segments
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            for (let y = treadY + treadOffset; y < treadY + treadH; y += 8) {
                ctx.beginPath();
                ctx.moveTo(-r - treadW, y); ctx.lineTo(-r, y);
                ctx.moveTo(r, y); ctx.lineTo(r + treadW, y);
                ctx.stroke();
            }

            // 2. Heavy Armored Octagonal Hull
            ctx.fillStyle = '#0F172A';
            ctx.strokeStyle = isColossus ? '#FFB703' : color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            const sides = 8;
            for (let i = 0; i < sides; i++) {
                const a = (i * Math.PI * 2) / sides;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 3. Frontal Armor Plating / Dozer Ram (Colossus)
            if (isColossus) {
                // Heavy Bulldozer Shield
                ctx.fillStyle = '#1E293B';
                ctx.strokeStyle = '#FFB703';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-r - 12, -r - 6);
                ctx.lineTo(r + 12, -r - 6);
                ctx.lineTo(r + 8, -r + 6);
                ctx.lineTo(-r - 8, -r + 6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Yellow/Black Hazard chevrons on shield
                ctx.strokeStyle = '#FFB703';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-16, -r - 4); ctx.lineTo(-8, -r + 4);
                ctx.moveTo(0, -r - 4); ctx.lineTo(8, -r + 4);
                ctx.moveTo(16, -r - 4); ctx.lineTo(24, -r + 4);
                ctx.stroke();

                // Triple Heavy Siege Cannons
                ctx.fillStyle = '#FFB703';
                [-14, 0, 14].forEach(bx => {
                    ctx.fillRect(bx - 3, -r - 18 + recoil, 6, 20);
                    ctx.fillRect(bx - 5, -r - 22 + recoil, 10, 5); // muzzle brake
                });

                this.drawElectricArcs(ctx, r + 14, '#FFB703', nowMs);
            } else {
                // Mech Titan: Dual Heavy Autocannons
                ctx.fillStyle = color;
                // Left cannon
                ctx.fillRect(-14, -r - 14 + recoil, 7, 20);
                ctx.fillRect(-16, -r - 18 + recoil, 11, 4); // brake
                // Right cannon
                ctx.fillRect(7, -r - 14 + recoil, 7, 20);
                ctx.fillRect(5, -r - 18 + recoil, 11, 4); // brake
            }

            // 4. Central Nuclear Reactor Core
            const corePulse = 1 + Math.sin(nowMs * 0.008) * 0.15;
            ctx.fillStyle = isColossus ? '#FFB703' : color;
            ctx.beginPath();
            ctx.arc(0, 0, (isColossus ? 12 : 9) * corePulse, 0, Math.PI * 2);
            ctx.fill();

            // Rotating segmented reactor ring
            ctx.save();
            ctx.rotate(nowMs * 0.003);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (unit.cardId === 'plasma_caster' || unit.cardId === 'super_caster') {
            // PLASMA CASTER / SUPER CASTER: Hovering Heavy Artillery
            const isSuper = unit.cardId === 'super_caster' || unit.fusionTier > 0;
            const r = isSuper ? 26 : 22;

            // 1. Triangular Hover Chassis
            ctx.fillStyle = '#0B1220';
            ctx.strokeStyle = isSuper ? '#A855F7' : color;
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(0, -r - 8);
            ctx.lineTo(r + 10, r + 6);
            ctx.lineTo(-r - 10, r + 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 3 Corner Ion Hover Thrusters (cyan glow)
            const thrusters = [[0, -r - 6], [r + 8, r + 4], [-r - 8, r + 4]];
            ctx.fillStyle = '#00F2FE';
            for (const [tx, ty] of thrusters) {
                ctx.beginPath();
                ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // 2. Long Magnetic Plasma Mortar Barrel
            const barrelLen = isSuper ? 38 : 30;
            ctx.fillStyle = '#1E293B';
            ctx.fillRect(-5, -barrelLen, 10, barrelLen);
            ctx.strokeStyle = isSuper ? '#A855F7' : color;
            ctx.lineWidth = 2;
            ctx.strokeRect(-5, -barrelLen, 10, barrelLen);

            // Barrel Induction Coils / Rings
            ctx.fillStyle = isSuper ? '#A855F7' : '#00F2FE';
            ctx.fillRect(-7, -barrelLen + 6, 14, 3);
            ctx.fillRect(-7, -barrelLen + 14, 14, 3);
            ctx.fillRect(-7, -barrelLen + 22, 14, 3);

            // 3. Central Swirling Plasma Chamber
            const plasmaPulse = 9 + Math.sin(nowMs * 0.012) * 3;
            const pGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, plasmaPulse);
            pGrad.addColorStop(0, '#FFFFFF');
            pGrad.addColorStop(0.5, isSuper ? '#C084FC' : '#00F2FE');
            pGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(0, 0, plasmaPulse, 0, Math.PI * 2);
            ctx.fill();

            // 4. Orbiting Plasma Spheres
            const orbCount = isSuper ? 4 : 3;
            const orbRadius = isSuper ? 34 : 28;
            for (let i = 0; i < orbCount; i++) {
                const orbAngle = (nowMs * 0.005) + (i * (Math.PI * 2 / orbCount));
                const ox = Math.cos(orbAngle) * orbRadius;
                const oy = Math.sin(orbAngle) * orbRadius;

                // Glowing tail arc
                ctx.strokeStyle = isSuper ? 'rgba(168, 85, 247, 0.4)' : 'rgba(0, 242, 254, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, orbRadius, orbAngle - 0.4, orbAngle);
                ctx.stroke();

                // Sphere
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(ox, oy, isSuper ? 5 : 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = isSuper ? '#A855F7' : '#00F2FE';
                ctx.beginPath();
                ctx.arc(ox, oy, isSuper ? 3.5 : 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (unit.cardId === 'scout_drone' || unit.cardId === 'railgun_drone') {
            // SCOUT DRONE / RAILGUN DRONE: Quad-Rotor Stealth Fighter
            const isRailgun = unit.cardId === 'railgun_drone' || unit.fusionTier > 0;
            const rotAngle = (nowMs * 0.03) % (Math.PI * 2);

            // 1. Sleek Delta Stealth Wings
            ctx.fillStyle = '#0F172A';
            ctx.strokeStyle = isRailgun ? '#FFB703' : color;
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(0, -24);  // Nose
            ctx.lineTo(26, 12);  // Right wingtip
            ctx.lineTo(12, 18);  // Right rear inner
            ctx.lineTo(0, 10);   // Rear center
            ctx.lineTo(-12, 18); // Left rear inner
            ctx.lineTo(-26, 12); // Left wingtip
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Quad-Rotor Nacelles & Spinning Halos
            const rotorPods = [[-20, -8], [20, -8], [-16, 14], [16, 14]];
            for (const [rx, ry] of rotorPods) {
                // Rotor mount arm
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(rx * 0.4, ry * 0.4);
                ctx.lineTo(rx, ry);
                ctx.stroke();

                // Glowing Halo
                ctx.strokeStyle = isRailgun ? 'rgba(255, 183, 3, 0.7)' : 'rgba(0, 242, 254, 0.7)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(rx, ry, 9, 0, Math.PI * 2);
                ctx.stroke();

                // Spinning rotor blade
                ctx.save();
                ctx.translate(rx, ry);
                ctx.rotate(rotAngle);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
                ctx.stroke();
                ctx.restore();
            }

            if (isRailgun) {
                // Long Electromagnetic Railgun Barrel extending out front
                ctx.strokeStyle = '#FFB703';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, -18);
                ctx.lineTo(0, -42);
                ctx.stroke();

                // Railgun acceleration coils
                ctx.fillStyle = '#00F2FE';
                for (let y = -22; y >= -38; y -= 5) {
                    ctx.fillRect(-3, y, 6, 2);
                }

                // Twin Jet Afterburners at rear
                ctx.fillStyle = '#00F2FE';
                ctx.fillRect(-6, 12, 3, 7 + Math.random() * 4);
                ctx.fillRect(3, 12, 3, 7 + Math.random() * 4);
            } else {
                // Scout Drone: Twin pulse blasters on wingtips
                ctx.fillStyle = color;
                ctx.fillRect(-22, -14, 3, 10);
                ctx.fillRect(19, -14, 3, 10);

                // Cockpit Sensory Visor
                ctx.fillStyle = '#00F2FE';
                ctx.beginPath();
                ctx.ellipse(0, -8, 5, 8, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (unit.cardId === 'cyber_trooper' || unit.cardId === 'shield_vanguard') {
            // CYBER TROOPER / SHIELD VANGUARD: Armored Commando
            const isVanguard = unit.cardId === 'shield_vanguard' || unit.fusionTier > 0;
            const r = isVanguard ? 24 : 19;

            // 1. Commando Armored Torso
            ctx.fillStyle = '#0B1220';
            ctx.strokeStyle = isVanguard ? '#00F2FE' : color;
            ctx.lineWidth = 2.5;

            // Hexagonal chestplate
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(r, -r * 0.4);
            ctx.lineTo(r * 0.7, r * 0.8);
            ctx.lineTo(-r * 0.7, r * 0.8);
            ctx.lineTo(-r, -r * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Armored Pauldrons (Shoulders with power nodes)
            ctx.fillStyle = color;
            ctx.fillRect(-r - 4, -r * 0.5, 6, 12);
            ctx.fillRect(r - 2, -r * 0.5, 6, 12);

            // Glowing Visor Line on helmet
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-8, -r * 0.5);
            ctx.lineTo(8, -r * 0.5);
            ctx.stroke();

            if (isVanguard) {
                // Heavy Riot Force Shield Arc in front
                ctx.strokeStyle = '#00F2FE';
                ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, -6, r + 14, -Math.PI * 0.78, -Math.PI * 0.22);
                ctx.stroke();

                // Shield Hexagonal Energy Pattern
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.arc(0, -6, r + 10, -Math.PI * 0.7, -Math.PI * 0.3);
                ctx.stroke();
            } else {
                // Cyber Trooper: Pulse Carbine held forward
                ctx.fillStyle = '#334155';
                ctx.fillRect(4, -r - 10, 5, 18);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(4, -r - 10, 5, 18);

                // Laser Sight Targeting Beam extending forward onto the field!
                ctx.strokeStyle = 'rgba(255, 42, 84, 0.65)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(6, -r - 10);
                ctx.lineTo(6, -r - 45);
                ctx.stroke();
                ctx.setLineDash([]);

                // Small red dot at laser endpoint
                ctx.fillStyle = '#FF2A54';
                ctx.beginPath();
                ctx.arc(6, -r - 45, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (unit.cardId === 'quantum_reactor') {
            // QUANTUM REACTOR: Mobile energy generation building
            const r = 28;
            const corePulse = 1 + Math.sin(nowMs * 0.008) * 0.18;
            const chargePhase = (nowMs % 3500) / 3500; // visual 7s cycle charge-up

            // 1. Reinforced Octagonal Containment Base
            ctx.fillStyle = '#0B1220';
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI * 2) / 8 + Math.PI / 8;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Rotating Containment Field Ring
            const ringSpin = (nowMs * 0.004) % (Math.PI * 2);
            ctx.save();
            ctx.rotate(ringSpin);
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 8]);
            ctx.beginPath();
            ctx.arc(0, 0, r - 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // 3. 4 Stabilizer Coil Nodes with charge progress
            for (let i = 0; i < 4; i++) {
                const a = (i * Math.PI / 2) + Math.PI / 4;
                const nx = Math.cos(a) * (r - 4);
                const ny = Math.sin(a) * (r - 4);
                const nodeCharge = Math.max(0, Math.min(1, chargePhase * 4 - i));
                ctx.fillStyle = '#1E293B';
                ctx.strokeStyle = '#34D399';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(nx, ny, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = nodeCharge >= 1 ? '#FFFFFF' : `rgba(52, 211, 153, ${0.3 + nodeCharge * 0.7})`;
                ctx.beginPath();
                ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
                ctx.fill();
                // Conduit to core
                ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(nx, ny);
                ctx.lineTo(0, 0);
                ctx.stroke();
            }

            // 4. Central Quantum Core (pulsing)
            const coreRad = 11 * corePulse;
            const qGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, coreRad);
            qGrad.addColorStop(0, '#FFFFFF');
            qGrad.addColorStop(0.45, '#34D399');
            qGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
            ctx.fillStyle = qGrad;
            ctx.beginPath();
            ctx.arc(0, 0, coreRad, 0, Math.PI * 2);
            ctx.fill();

            // 5. Rising energy light column
            const columnH = 18 + Math.sin(nowMs * 0.006) * 6;
            const colGrad = ctx.createLinearGradient(0, 0, 0, -columnH);
            colGrad.addColorStop(0, 'rgba(52, 211, 153, 0.75)');
            colGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
            ctx.fillStyle = colGrad;
            ctx.fillRect(-3, -columnH, 6, columnH);
        } else {
            // SWARM DROIDS: Fast cyber mantis / scarabs with scythe claws
            const legWalk = Math.sin(nowMs * 0.03 + (unit.id || 0)) * 4;

            // 1. Segmented Mecha Insect Abdomen & Thorax
            ctx.fillStyle = '#0F172A';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            // Abdomen (rear)
            ctx.beginPath();
            ctx.ellipse(0, 10, 8, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Thorax (front)
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, -3, 9, 0, Math.PI * 2);
            ctx.fill();

            // 2. Articulated Cyber Legs (4 legs)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            // Left legs
            ctx.beginPath();
            ctx.moveTo(-6, -4); ctx.lineTo(-18, -10 + legWalk); ctx.lineTo(-24, -4 + legWalk);
            ctx.moveTo(-6, 6);  ctx.lineTo(-18, 10 - legWalk);  ctx.lineTo(-24, 18 - legWalk);
            // Right legs
            ctx.moveTo(6, -4);  ctx.lineTo(18, -10 - legWalk);  ctx.lineTo(24, -4 - legWalk);
            ctx.moveTo(6, 6);   ctx.lineTo(18, 10 + legWalk);   ctx.lineTo(24, 18 + legWalk);
            ctx.stroke();

            // 3. Twin Razor Mantis Scythe Claws (extended forward)
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2.5;
            // Left claw
            ctx.beginPath();
            ctx.moveTo(-4, -8);
            ctx.lineTo(-12, -20);
            ctx.lineTo(-4, -26);
            ctx.stroke();
            // Right claw
            ctx.beginPath();
            ctx.moveTo(4, -8);
            ctx.lineTo(12, -20);
            ctx.lineTo(4, -26);
            ctx.stroke();

            // 4. Glowing Tri-Sensor Eyes
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(-3, -7, 2, 0, Math.PI * 2);
            ctx.arc(3, -7, 2, 0, Math.PI * 2);
            ctx.arc(0, -10, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawElectricArcs(ctx, radius, color, nowMs) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (nowMs * 0.005 + i * 1.5) % (Math.PI * 2);
            const x1 = Math.cos(angle) * radius;
            const y1 = Math.sin(angle) * radius;
            const x2 = Math.cos(angle + 0.3) * (radius + 10);
            const y2 = Math.sin(angle + 0.3) * (radius + 10);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
    }

    drawHealthBar(ctx, x, y, current, max, width, color, showText = false) {
        const height = showText ? 10 : 7;
        const pct = Math.max(0, Math.min(1, current / max));

        ctx.fillStyle = 'rgba(4, 6, 10, 0.85)';
        ctx.fillRect(x - width / 2, y - height / 2, width, height);

        ctx.fillStyle = color;
        ctx.fillRect(x - width / 2, y - height / 2, width * pct, height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - width / 2, y - height / 2, width, height);

        if (showText) {
            ctx.font = 'bold 12px "Rajdhani"';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText(`${current} / ${max}`, x, y - 8);
        }
    }

    drawVisualEffects(ctx, dt) {
        // Laser beams
        for (let i = this.laserBeams.length - 1; i >= 0; i--) {
            const b = this.laserBeams[i];
            b.life -= dt;
            if (b.life <= 0) {
                this.laserBeams.splice(i, 1);
                continue;
            }

            const alpha = b.life / b.maxLife;
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 5 * alpha;
            ctx.beginPath();
            ctx.moveTo(b.fromX, b.fromY);
            ctx.lineTo(b.toX, b.toY);
            ctx.stroke();
        }

        // Lobbed Parabolic Mortar Shells in Flight
        for (let i = this.mortarShells.length - 1; i >= 0; i--) {
            const ms = this.mortarShells[i];
            ms.elapsed += dt;
            const progress = Math.min(1.0, ms.elapsed / ms.duration);
            const currentX = ms.fromX + (ms.toX - ms.fromX) * progress;
            const currentY = ms.fromY + (ms.toY - ms.fromY) * progress;
            const arcHeight = Math.sin(progress * Math.PI) * 220; // High 2.5D flight arc
            const shellY = currentY - arcHeight;

            // Ground target shadow
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            const shadowRadius = 8 + (1 - Math.sin(progress * Math.PI) * 0.5) * 8;
            ctx.ellipse(currentX, currentY, shadowRadius * 1.6, shadowRadius * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Arcing plasma explosive shell
            const shellColor = ms.color || '#FFB703';
            ctx.fillStyle = shellColor;
            ctx.shadowColor = shellColor;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(currentX, shellY, 9, 0, Math.PI * 2);
            ctx.fill();

            // Shell glowing core
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(currentX, shellY, 4.5, 0, Math.PI * 2);
            ctx.fill();

            // Smoke/spark trail behind shell
            if (Math.random() < 0.6) {
                this.particles.push({
                    x: currentX + (Math.random() - 0.5) * 6,
                    y: shellY + (Math.random() - 0.5) * 6,
                    vx: (Math.random() - 0.5) * 20,
                    vy: 30 + Math.random() * 20,
                    size: 3 + Math.random() * 3,
                    color: Math.random() > 0.5 ? '#FF5500' : 'rgba(255, 183, 3, 0.7)',
                    life: 0.35,
                    maxLife: 0.35
                });
            }
            ctx.restore();

            // Impact!
            if (progress >= 1.0) {
                this.mortarShells.splice(i, 1);
                this.empRings.push({
                    x: ms.toX,
                    y: ms.toY,
                    radius: 10,
                    maxRadius: ms.splashRadius || 130,
                    color: shellColor,
                    life: 0.38,
                    maxLife: 0.38
                });
                this.createSparks(ms.toX, ms.toY, 28, '#FF4500');
                this.createSparks(ms.toX, ms.toY, 18, '#FFD700');
                this.screenShake = Math.max(this.screenShake, 10);
                this.addFloatingText(ms.toX, ms.toY - 35, '💥 MORTAR IMPACT', '#FFB703', true);
            }
        }

        // EMP Shockwave rings
        for (let i = this.empRings.length - 1; i >= 0; i--) {
            const ring = this.empRings[i];
            ring.life -= dt;
            if (ring.life <= 0) {
                this.empRings.splice(i, 1);
                continue;
            }

            const progress = 1 - (ring.life / ring.maxLife);
            const currentR = ring.radius + (ring.maxRadius - ring.radius) * progress;
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = 4 * (1 - progress);
            ctx.beginPath();
            ctx.arc(ring.x, ring.y, currentR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Particle pool
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
        }

        // Floating Damage Text
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }

            ft.y += ft.vy * dt;
            const alpha = ft.life / ft.maxLife;

            ctx.save();
            ctx.font = ft.isCrit ? 'bold 24px "Rajdhani"' : 'bold 18px "Rajdhani"';
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    drawDragOverlay(ctx) {
        // Mode 1: Active touch-drag reticle
        if (this.dragState.active) {
            const x = this.dragState.canvasX;
            const y = this.dragState.canvasY;
            const isSpell = this.dragState.isCatalyst;
            const cardData = this.dragState.cardId ? TacticalGameRoom.CARD_DATABASE[this.dragState.cardId] : null;

            if (isSpell) {
                // Giant Multi-Unit AoE Holographic Targeting Ring (340px radius)
                const aoeRadius = 340;
                const isAr = !window.i18n || window.i18n.currentLang === 'ar';

                // Distinct color per spell identity
                let ringColor = '#00F2FE';
                let spellTitle = isAr ? 'تعويذة تكتيكية' : 'TACTICAL SPELL';
                if (cardData) {
                    if (cardData.id === 'nano_repair') {
                        ringColor = '#10B981';
                        spellTitle = isAr ? '🛡️ درع وترميم النانو' : '🛡️ NANO AEGIS';
                    } else if (cardData.id === 'emp_overcharge') {
                        ringColor = '#00F2FE';
                        spellTitle = isAr ? '⚡ عاصفة الـ EMP' : '⚡ EMP OVERCHARGE';
                    } else if (cardData.id === 'plasma_mod') {
                        ringColor = '#F59E0B';
                        spellTitle = isAr ? '🔥 ضربة البلازما' : '🔥 PLASMA STRIKE';
                    } else if (cardData.id === 'cryo_freeze') {
                        ringColor = '#38BDF8';
                        spellTitle = isAr ? '❄️ التجميد المطلق' : '❄️ CRYO FREEZE';
                    } else if (cardData.id === 'sky_zap') {
                        ringColor = '#7DD3FC';
                        spellTitle = isAr ? '⚡ الصاعقة السحابية (جوي فقط)' : '⚡ SKY ZAP (AERIAL ONLY)';
                    } else if (cardData.id === 'orbital_salvo') {
                        ringColor = '#FF2A54';
                        spellTitle = isAr ? '🚀 القصف المداري' : '🚀 ORBITAL BARRAGE';
                    }
                }

                // Outer scan ring with animated radar sweep
                const nowSec = performance.now() * 0.002;
                ctx.strokeStyle = ringColor;
                ctx.lineWidth = 3.5;
                ctx.setLineDash([14, 10]);
                ctx.beginPath();
                ctx.arc(x, y, aoeRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Inner concentric range ring
                ctx.strokeStyle = ringColor;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.arc(x, y, aoeRadius * 0.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Semi-transparent AoE zone fill
                ctx.fillStyle = ringColor.replace('#', 'rgba(') + (ringColor.startsWith('rgba') ? '' : ')'); // fallback
                // Use safe RGBA for zone fill
                ctx.fillStyle = (ringColor === '#10B981') ? 'rgba(16, 185, 129, 0.12)' :
                                (ringColor === '#FF2A54') ? 'rgba(255, 42, 84, 0.12)' :
                                (ringColor === '#F59E0B') ? 'rgba(245, 158, 11, 0.12)' :
                                (ringColor === '#38BDF8') ? 'rgba(56, 189, 248, 0.12)' : 'rgba(0, 242, 254, 0.12)';
                ctx.beginPath();
                ctx.arc(x, y, aoeRadius, 0, Math.PI * 2);
                ctx.fill();

                // Crosshair azimuth lines spanning the 340px perimeter
                ctx.strokeStyle = ringColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x - aoeRadius, y); ctx.lineTo(x + aoeRadius, y);
                ctx.moveTo(x, y - aoeRadius); ctx.lineTo(x, y + aoeRadius);
                ctx.stroke();

                // Center targeting reticle
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, 34, 0, Math.PI * 2);
                ctx.stroke();

                // --- DYNAMIC MULTI-UNIT TARGET HIGHLIGHTING ---
                // Highlights and locks onto ALL units caught inside the 340px circle!
                let affectedEnemies = 0;
                let affectedFriends = 0;
                if (this.currentSnapshot && this.currentSnapshot.units) {
                    for (const u of this.currentSnapshot.units) {
                        if (!u.alive) continue;
                        const d = Math.hypot(u.x - x, u.y - y);
                        if (d <= aoeRadius) {
                            const isFriendly = u.owner === 1;
                            if (isFriendly) affectedFriends++;
                            else affectedEnemies++;

                            ctx.save();
                            const highlightColor = isFriendly ? '#10B981' : '#FF2A54';
                            ctx.strokeStyle = highlightColor;
                            ctx.lineWidth = 2.5;
                            ctx.setLineDash([4, 4]);
                            ctx.beginPath();
                            ctx.arc(u.x, u.y, 30, 0, Math.PI * 2);
                            ctx.stroke();

                            // Corner lock brackets
                            const s = 16;
                            ctx.lineWidth = 2;
                            ctx.setLineDash([]);
                            ctx.beginPath();
                            // Top-left
                            ctx.moveTo(u.x - s, u.y - s + 6); ctx.lineTo(u.x - s, u.y - s); ctx.lineTo(u.x - s + 6, u.y - s);
                            // Top-right
                            ctx.moveTo(u.x + s - 6, u.y - s); ctx.lineTo(u.x + s, u.y - s); ctx.lineTo(u.x + s, u.y - s + 6);
                            // Bottom-left
                            ctx.moveTo(u.x - s, u.y + s - 6); ctx.lineTo(u.x - s, u.y + s); ctx.lineTo(u.x - s + 6, u.y + s);
                            // Bottom-right
                            ctx.moveTo(u.x + s - 6, u.y + s); ctx.lineTo(u.x + s, u.y + s); ctx.lineTo(u.x + s, u.y + s - 6);
                            ctx.stroke();

                            ctx.font = 'bold 12px "Rajdhani"';
                            ctx.fillStyle = highlightColor;
                            ctx.textAlign = 'center';
                            const badgeTxt = isFriendly ? (isAr ? '✓ تعزيز جماعي' : '✓ AOE BUFF') : (isAr ? '🎯 هدف جماعي' : '🎯 AOE TARGET');
                            ctx.fillText(badgeTxt, u.x, u.y - 34);
                            ctx.restore();
                        }
                    }
                }

                // --- TOWER LOCK HIGHLIGHTING ---
                // Highlights any towers caught inside the 340px circle!
                if (this.currentSnapshot) {
                    const allTowers = [
                        ...Object.values(this.currentSnapshot.p1.towers || {}),
                        ...Object.values(this.currentSnapshot.p2.towers || {})
                    ];
                    for (const t of allTowers) {
                        if (!t.alive) continue;
                        if (Math.hypot(t.x - x, t.y - y) <= aoeRadius) {
                            ctx.save();
                            const isFriendly = t.owner === 1;
                            const towerColor = isFriendly ? '#10B981' : '#FFB703';
                            ctx.strokeStyle = towerColor;
                            ctx.lineWidth = 2.5;
                            ctx.setLineDash([6, 6]);
                            ctx.beginPath();
                            ctx.arc(t.x, t.y, 48, 0, Math.PI * 2);
                            ctx.stroke();

                            ctx.font = 'bold 13px "Rajdhani"';
                            ctx.fillStyle = towerColor;
                            ctx.textAlign = 'center';
                            ctx.fillText(isFriendly ? (isAr ? '💚 ترميم البرج' : '💚 REPAIR') : (isAr ? '⚡ تعطيل البرج' : '⚡ SHUTDOWN'), t.x, t.y - 54);
                            ctx.restore();
                        }
                    }
                }

                // Dynamic Status Banner Above Circle
                ctx.font = 'bold 22px "Rajdhani"';
                ctx.textAlign = 'center';
                ctx.fillStyle = ringColor;
                const statusSummary = isAr
                    ? `${spellTitle} (تأثير جماعي 340px)`
                    : `${spellTitle} (340px ALL-UNIT AOE)`;
                ctx.fillText(statusSummary, x, y - aoeRadius - 20);

                // Subtitle readout with target count
                ctx.font = 'bold 14px "Readex Pro", "Rajdhani"';
                ctx.fillStyle = '#FFFFFF';
                const countMsg = isAr
                    ? `[ يشمل كل الجنود: ${affectedEnemies} أعداء 🎯 | ${affectedFriends} حلفاء 🛡️ ]`
                    : `[ Hits All Units: ${affectedEnemies} Enemies | ${affectedFriends} Allies ]`;
                ctx.fillText(countMsg, x, y - aoeRadius - 2);
            } else if (cardData && cardData.isBuilding) {
                // Defense / Siege Building Placement with Range Circles & Blind-spot
                ctx.save();
                // Outer range circle
                ctx.strokeStyle = cardData.id === 'mortar_cannon' ? 'rgba(255, 183, 3, 0.45)' : 'rgba(0, 242, 254, 0.4)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([10, 6]);
                ctx.beginPath();
                ctx.arc(x, y, cardData.range, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = cardData.id === 'mortar_cannon' ? 'rgba(255, 183, 3, 0.04)' : 'rgba(0, 242, 254, 0.04)';
                ctx.fill();

                // Inner blind spot circle if exists
                if (cardData.minRange) {
                    ctx.strokeStyle = 'rgba(255, 42, 84, 0.7)';
                    ctx.fillStyle = 'rgba(255, 42, 84, 0.12)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.arc(x, y, cardData.minRange, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();

                // Center reticle
                const reticleColor = cardData.id === 'mortar_cannon' ? '#FFB703' : '#00F2FE';
                ctx.strokeStyle = reticleColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, 36, 0, Math.PI * 2);
                ctx.stroke();

                ctx.font = 'bold 18px "Rajdhani"';
                ctx.fillStyle = reticleColor;
                ctx.textAlign = 'center';
                const label = cardData.id === 'mortar_cannon'
                    ? '🎯 مدفع الهاون: قصف بعيد المدى (650px)'
                    : '🛡️ بنكر دفاعي: تغطية شاملة 360° للمنطقة';
                ctx.fillText(label, x, y - 48);
            } else if (cardData && cardData.isAerial) {
                // AERIAL Unit: straight flight corridor over the chasm straight to the enemy main tower
                const targetX = 540;
                const targetY = 295;

                ctx.save();
                ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([14, 10]);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(targetX, targetY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Destination lock on the enemy main fortress
                ctx.strokeStyle = '#7DD3FC';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(targetX, targetY, 40 + Math.sin(performance.now() * 0.01) * 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🛸', targetX, targetY - 48);
                ctx.restore();

                // Reticle rings
                ctx.strokeStyle = '#7DD3FC';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, 38, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = 'rgba(125, 211, 252, 0.25)';
                ctx.beginPath();
                ctx.arc(x, y, 28, 0, Math.PI * 2);
                ctx.fill();

                ctx.font = 'bold 18px "Rajdhani"';
                ctx.fillStyle = '#7DD3FC';
                ctx.textAlign = 'center';
                ctx.fillText('✈️ إنزال جوي حر ➔ مسار مباشر', x, y - 48);
            } else {
                // Standard Unit Deployment Reticle with directional trajectory to nearest bridge
                // (Ground units can only use the two side bridges - mirrors engine reroute)
                const nearestBridgeX = x < 540 ? 230 : 850;
                const bridgeY = 820;

                // Tactical trajectory line to bridge
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 242, 254, 0.45)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 8]);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(nearestBridgeX, bridgeY);
                ctx.stroke();
                ctx.restore();

                // Reticle rings
                ctx.strokeStyle = '#00F2FE';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, 38, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = 'rgba(0, 242, 254, 0.25)';
                ctx.beginPath();
                ctx.arc(x, y, 28, 0, Math.PI * 2);
                ctx.fill();

                // Small bridge marker icon at destination
                ctx.fillStyle = '#00F2FE';
                ctx.beginPath();
                ctx.arc(nearestBridgeX, bridgeY, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.font = 'bold 18px "Rajdhani"';
                ctx.fillStyle = '#00F2FE';
                ctx.textAlign = 'center';
                ctx.fillText('إنزال حر ➔ أقرب جسر جانبي', x, y - 48);
            }
        }
        // Mode 2: Card is selected via Tap Mode (waiting for field tap)
        else if (this.selectedCardId) {
            const cardData = TacticalGameRoom.CARD_DATABASE[this.selectedCardId];
            if (!cardData) return;

            ctx.save();
            const color = cardData.isSpell ? 'rgba(168, 85, 247, 0.5)' : 'rgba(0, 242, 254, 0.45)';
            const txtColor = cardData.isSpell ? '#D8B4FE' : '#00F2FE';

            // Glowing deployment zone outline in player territory
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([12, 8]);
            ctx.strokeRect(50, 860, this.V_WIDTH - 100, 520);
            ctx.setLineDash([]);

            ctx.fillStyle = cardData.isSpell ? 'rgba(168, 85, 247, 0.06)' : 'rgba(0, 242, 254, 0.05)';
            ctx.fillRect(50, 860, this.V_WIDTH - 100, 520);

            // In-world guide banner
            ctx.textAlign = 'center';
            ctx.font = 'bold 22px "Rajdhani", sans-serif';
            ctx.fillStyle = txtColor;
            ctx.shadowColor = txtColor;
            ctx.shadowBlur = 10;
            const promptMsg = cardData.isSpell
                ? '⚡ المس أي موقع على الساحة لإلقاء التعويذة على كل الجنود في النطاق (340px) ⚡'
                : '⚡ المس أي مكان في نصف ساحتك لإنزال الوحدة فوراً ⚡';
            ctx.fillText(promptMsg, 540, 1120);

            // Show cursor preview everywhere on arena with dynamic valid/invalid status
            if (this.hoverCanvasPos) {
                const isValid = cardData.isSpell 
                    ? (this.hoverCanvasPos.y >= 180 && this.hoverCanvasPos.y <= 1650)
                    : (this.hoverCanvasPos.y >= 860 && this.hoverCanvasPos.y <= 1380);

                ctx.strokeStyle = isValid ? txtColor : 'rgba(255, 42, 84, 0.85)';
                ctx.fillStyle = isValid ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 42, 84, 0.18)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(this.hoverCanvasPos.x, this.hoverCanvasPos.y, 34, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                if (cardData.isBuilding && isValid) {
                    ctx.save();
                    ctx.strokeStyle = cardData.id === 'mortar_cannon' ? 'rgba(255, 183, 3, 0.45)' : 'rgba(0, 242, 254, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([8, 6]);
                    ctx.beginPath();
                    ctx.arc(this.hoverCanvasPos.x, this.hoverCanvasPos.y, cardData.range, 0, Math.PI * 2);
                    ctx.stroke();
                    if (cardData.minRange) {
                        ctx.strokeStyle = 'rgba(255, 42, 84, 0.6)';
                        ctx.fillStyle = 'rgba(255, 42, 84, 0.08)';
                        ctx.setLineDash([5, 4]);
                        ctx.beginPath();
                        ctx.arc(this.hoverCanvasPos.x, this.hoverCanvasPos.y, cardData.minRange, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                if (cardData.isSpell && isValid) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([12, 8]);
                    ctx.beginPath();
                    ctx.arc(this.hoverCanvasPos.x, this.hoverCanvasPos.y, 320, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
                    ctx.fill();
                    ctx.restore();
                }

                if (!isValid) {
                    ctx.strokeStyle = '#FF2A54';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(this.hoverCanvasPos.x - 14, this.hoverCanvasPos.y - 14);
                    ctx.lineTo(this.hoverCanvasPos.x + 14, this.hoverCanvasPos.y + 14);
                    ctx.stroke();
                }
            }

            ctx.restore();
        }
    }

    drawRedlineGlow(ctx, nowMs) {
        const pulse = 0.35 + Math.sin(nowMs * 0.009) * 0.25;
        ctx.strokeStyle = `rgba(255, 42, 84, ${pulse})`;
        ctx.lineWidth = 16;
        ctx.strokeRect(0, 0, this.V_WIDTH, this.V_HEIGHT);
    }

    // --- ACCURATE TOUCH & MOUSE COORDINATES ---
    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX = 0, clientY = 0;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else if (e.clientX !== undefined) {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const normX = rect.width > 0 ? (clientX - rect.left) / rect.width : 0.5;
        const normY = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.6;

        return {
            x: Math.max(0, Math.min(this.V_WIDTH, normX * this.V_WIDTH)),
            y: Math.max(0, Math.min(this.V_HEIGHT, normY * this.V_HEIGHT)),
            rawX: clientX,
            rawY: clientY
        };
    }

    handleCardPointerDown(cardId, isCatalyst, clientX, clientY) {
        const now = performance.now();
        if (this.cardTouchSession && (now - this.cardTouchSession.timestamp < 120)) {
            return;
        }
        this.cardTouchSession = {
            cardId: cardId,
            isCatalyst: isCatalyst,
            startX: clientX,
            startY: clientY,
            isDragging: false,
            timestamp: now
        };
    }

    // --- MOUSE & TOUCH EVENT BINDINGS (Mobile-First) ---
    bindEvents() {
        const onMove = (e) => {
            let clientX = e.clientX, clientY = e.clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }

            // Check if user is initiating drag from card
            if (this.cardTouchSession && !this.cardTouchSession.isDragging) {
                const dist = Math.hypot(clientX - this.cardTouchSession.startX, clientY - this.cardTouchSession.startY);
                if (dist > 18) {
                    this.cardTouchSession.isDragging = true;
                    this.dragState.active = true;
                    this.dragState.cardId = this.cardTouchSession.cardId;
                    this.dragState.isCatalyst = this.cardTouchSession.isCatalyst;
                    this.selectedCardId = this.cardTouchSession.cardId;
                    this.notifyCardSelected(this.cardTouchSession.cardId);
                }
            }

            if (this.dragState.active) {
                if (e.cancelable) e.preventDefault(); // Stop mobile browser scrolling during drag
                const pos = this.getCanvasCoords(e);
                this.dragState.canvasX = pos.x;
                this.dragState.canvasY = pos.y;

                if (pos.x < 380) this.dragState.hoveredLane = 0;
                else if (pos.x < 700) this.dragState.hoveredLane = 1;
                else this.dragState.hoveredLane = 2;

                if (this.dragState.isCatalyst && this.currentSnapshot) {
                    const cardData = TacticalGameRoom.CARD_DATABASE[this.dragState.cardId];
                    // Fusion catalysts (Plasma / Nano / EMP) magnet-snap onto a compatible
                    // friendly unit for FUSION EVOLUTION. Pure damage/control spells stay free AoE.
                    if (cardData && Array.isArray(cardData.catalystFor) && cardData.catalystFor.length > 0) {
                        let best = null;
                        let bestDist = 95;
                        for (const u of this.currentSnapshot.units) {
                            if (!u.alive || u.owner !== 1 || (u.fusionTier || 0) > 0) continue;
                            const base = TacticalGameRoom.CARD_DATABASE[u.cardId];
                            if (!base || base.fusionTarget !== this.dragState.cardId) continue;
                            const d = Math.hypot(u.x - pos.x, u.y - pos.y);
                            if (d < bestDist) { bestDist = d; best = u; }
                        }
                        this.dragState.snappedUnitId = best ? best.id : null;
                    } else {
                        this.dragState.snappedUnitId = null;
                    }
                }
            } else if (this.selectedCardId) {
                this.hoverCanvasPos = this.getCanvasCoords(e);
            }
        };

        const onUp = (e) => {
            let clientX = e.clientX, clientY = e.clientY;
            if (e.changedTouches && e.changedTouches.length > 0) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            }

            if (this.cardTouchSession) {
                if (this.cardTouchSession.isDragging) {
                    // Finger was dragging card onto arena
                    const pos = this.getCanvasCoords(e);
                    const cardData = TacticalGameRoom.CARD_DATABASE[this.cardTouchSession.cardId];
                    const isSpell = cardData && cardData.isSpell;
                    const isValidY = isSpell ? (pos.y >= 180 && pos.y <= 1600) : (pos.y >= 840 && pos.y <= 1400);
                    const snappedId = this.dragState.snappedUnitId;
                    this.dragState.snappedUnitId = null;

                    // Released inside a valid placement zone
                    if (isValidY) {
                        if (snappedId) {
                            // Dropped a fusion catalyst onto a compatible friendly unit → FUSION EVOLUTION
                            this.room.attemptFusion(1, this.cardTouchSession.cardId, snappedId);
                        } else {
                            const deployY = isSpell ? pos.y : Math.max(860, Math.min(1380, pos.y));
                            this.room.deployCard(1, this.cardTouchSession.cardId, pos.x, deployY);
                        }
                        this.clearCardSelection();
                    } else {
                        // Cancelled
                        this.clearCardSelection();
                    }
                } else {
                    // Tap on card: toggle selection!
                    const tappedId = this.cardTouchSession.cardId;
                    if (this.selectedCardId === tappedId) {
                        this.clearCardSelection();
                    } else {
                        this.selectedCardId = tappedId;
                        this.dragState.active = false;
                        this.dragState.cardId = tappedId;
                        this.dragState.isCatalyst = this.cardTouchSession.isCatalyst;
                        this.notifyCardSelected(tappedId);
                    }
                }

                this.cardTouchSession = null;
                this.dragState.active = false;
                return;
            }

            if (this.dragState.active) {
                this.dragState.active = false;
            }
        };

        // Pointer event listeners on canvas for tap-to-deploy
        const handleCanvasPointerDown = (e) => {
            if (!this.selectedCardId) return;

            const pos = this.getCanvasCoords(e);
            const cardData = TacticalGameRoom.CARD_DATABASE[this.selectedCardId];
            if (!cardData) return;
            const isSpell = cardData.isSpell;
            const isValidY = isSpell ? (pos.y >= 180 && pos.y <= 1600) : (pos.y >= 840 && pos.y <= 1400);

            if (isValidY) {
                const deployY = isSpell ? pos.y : Math.max(860, Math.min(1380, pos.y));
                this.room.deployCard(1, this.selectedCardId, pos.x, deployY);
                this.clearCardSelection();
            }
        };

        this.canvas.addEventListener('pointerdown', handleCanvasPointerDown);
        this.canvas.addEventListener('click', handleCanvasPointerDown);

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mousemove', onMove);

        window.addEventListener('pointerup', onUp);
        window.addEventListener('touchend', onUp);
        window.addEventListener('mouseup', onUp);
    }

    notifyCardSelected(cardId) {
        if (this.options.onCardSelected) {
            this.options.onCardSelected(cardId);
        }
    }

    clearCardSelection() {
        this.selectedCardId = null;
        this.hoverCanvasPos = null;
        this.dragState.active = false;
        this.dragState.cardId = null;
        this.dragState.snappedUnitId = null;
        this.dragState.hoveredLane = null;
        if (this.options.onCardDeselected) {
            this.options.onCardDeselected();
        }
        if (this.options.onDragEnd) {
            this.options.onDragEnd();
        }
    }

    startCardDrag(cardId, isCatalyst = false) {
        this.selectedCardId = cardId;
        this.dragState.active = true;
        this.dragState.cardId = cardId;
        this.dragState.isCatalyst = isCatalyst;
        this.dragState.canvasX = 540;
        this.dragState.canvasY = 1160;
        this.dragState.hoveredLane = 1;
        this.dragState.snappedUnitId = null;
        this.notifyCardSelected(cardId);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TacticalRenderer;
} else {
    window.TacticalRenderer = TacticalRenderer;
}
