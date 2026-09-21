/**
 * AudioEngine.js
 * 100% Procedural Web Audio API sound synthesis.
 * Zero external audio files to download, instant zero-latency playback.
 */
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.masterVolume = 0.8;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.5;

        // Phase 7: Dynamic 16-Step Procedural Synthesizer
        this.musicPlaying = false;
        this.musicState = 'ambient'; // 'ambient' | 'combat'
        this.musicBpm = 135;
        this.currentStep = 0;
        this.nextStepTime = 0;
        this.musicTimer = null;
        this.musicMainGain = null;
        this.ambientMasterGain = null;
        this.combatMasterGain = null;

        this.initOnUserGesture();
    }

    get effectiveSfxVolume() {
        return this.isMuted ? 0 : (this.masterVolume * this.sfxVolume);
    }

    get effectiveMusicVolume() {
        return this.isMuted ? 0 : (this.masterVolume * this.musicVolume);
    }

    setMasterVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, parseFloat(val)));
        if (this.musicMainGain && this.ctx) {
            this.musicMainGain.gain.setValueAtTime(this.effectiveMusicVolume, this.ctx.currentTime);
        }
        if (this.masterSfxGain && this.ctx) {
            this.masterSfxGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);
        }
    }

    setSfxVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, parseFloat(val)));
    }

    setMusicVolume(val) {
        this.musicVolume = Math.max(0, Math.min(1, parseFloat(val)));
        if (this.musicMainGain && this.ctx) {
            this.musicMainGain.gain.setValueAtTime(this.effectiveMusicVolume, this.ctx.currentTime);
        }
    }

    setupMasterCompressor() {
        if (!this.ctx || this.masterCompressor) return;
        try {
            const realDest = this.ctx.destination;
            const comp = this.ctx.createDynamicsCompressor();
            comp.threshold.setValueAtTime(-6, this.ctx.currentTime);
            comp.knee.setValueAtTime(12, this.ctx.currentTime);
            comp.ratio.setValueAtTime(8, this.ctx.currentTime);
            comp.attack.setValueAtTime(0.003, this.ctx.currentTime);
            comp.release.setValueAtTime(0.15, this.ctx.currentTime);
            comp.connect(realDest);
            this.masterCompressor = comp;

            this.masterSfxGain = this.ctx.createGain();
            this.masterSfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
            this.masterSfxGain.connect(this.masterCompressor);
        } catch (err) {}
    }

    get destination() {
        return this.masterSfxGain || (this.ctx ? this.ctx.destination : null);
    }

    get sfxDestination() {
        return this.masterSfxGain || (this.ctx ? this.ctx.destination : null);
    }

    initOnUserGesture() {
        const unlock = () => {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                    this.setupMasterCompressor();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        };
        window.addEventListener('click', unlock, { passive: true });
        window.addEventListener('keydown', unlock, { passive: true });
        window.addEventListener('touchstart', unlock, { passive: true });

        // WebAudio hardening for Safari/iOS tab switching and background lock
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        });
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.setupMasterCompressor();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    // Play spawn invulnerability shield activation
    playSpawnShield() {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.22);

        gain.gain.setValueAtTime(0.35 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // Play cyberpunk in-game notification chime
    playNotification() {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1040, now);
        osc1.frequency.setValueAtTime(1560, now + 0.08);

        gain1.gain.setValueAtTime(0.22 * this.effectiveSfxVolume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        osc1.connect(gain1);
        gain1.connect(this.destination);

        osc1.start(now);
        osc1.stop(now + 0.26);
    }

    // Play blaster / pulse rifle shot
    playShootBlaster(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

        gain.gain.setValueAtTime(0.25 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(outNode);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    // Play heavy sniper shot
    playShootSniper(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        // Sub bass thump
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(180, now);
        osc1.frequency.exponentialRampToValueAtTime(30, now + 0.28);
        gain1.gain.setValueAtTime(0.6 * this.effectiveSfxVolume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc1.connect(gain1);
        gain1.connect(outNode);
        osc1.start(now);
        osc1.stop(now + 0.28);

        // High frequency rail spark
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(1400, now);
        osc2.frequency.exponentialRampToValueAtTime(120, now + 0.18);
        gain2.gain.setValueAtTime(0.35 * this.effectiveSfxVolume, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc2.connect(gain2);
        gain2.connect(outNode);
        osc2.start(now);
        osc2.stop(now + 0.18);
    }

    // Play shotgun blast
    playShootShotgun(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        // White noise burst
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.linearRampToValueAtTime(200, now + 0.15);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(outNode);

        noise.start(now);
        noise.stop(now + 0.15);
    }

    // Phase 13: Play Vortex Cannon heavy plasma implosion & launch
    playShootVortex(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        // Sub-bass heavy thump
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(160, now);
        osc1.frequency.exponentialRampToValueAtTime(36, now + 0.22);
        gain1.gain.setValueAtTime(0.55 * this.effectiveSfxVolume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc1.connect(gain1);
        gain1.connect(outNode);
        osc1.start(now);
        osc1.stop(now + 0.22);

        // Plasma resonant sweep
        const osc2 = ctx.createOscillator();
        const filter2 = ctx.createBiquadFilter();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(280, now);
        osc2.frequency.exponentialRampToValueAtTime(750, now + 0.08);
        osc2.frequency.exponentialRampToValueAtTime(90, now + 0.25);

        filter2.type = 'bandpass';
        filter2.frequency.setValueAtTime(500, now);
        filter2.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
        filter2.frequency.exponentialRampToValueAtTime(350, now + 0.25);
        filter2.Q.setValueAtTime(5.0, now);

        gain2.gain.setValueAtTime(0.38 * this.effectiveSfxVolume, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(outNode);
        osc2.start(now);
        osc2.stop(now + 0.25);
    }

    // Play Parry deflection (Resonant crystal/metallic chime)
    playParry(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        [880, 1320, 1760].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.02);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.35);

            gain.gain.setValueAtTime(0.4 * this.effectiveSfxVolume, now + idx * 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(outNode);
            osc.start(now + idx * 0.02);
            osc.stop(now + 0.35);
        });
    }

    // Play Dash whoosh
    playDash(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

        gain.gain.setValueAtTime(0.3 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(outNode);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    // Play hit marker sound (Crisp metallic click)
    playHitMarker(isKill = false) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        const baseFreq = isKill ? 1200 : 800;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.06);

        gain.gain.setValueAtTime(0.35 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Play UI click and navigation feedback sound
    playUiClick(type = 'subtle') {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const startFreq = type === 'hero' ? 1400 : (type === 'tab' ? 1100 : 850);
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 0.45, now + 0.032);

        const vol = (type === 'hero' ? 0.22 : 0.14) * this.effectiveSfxVolume;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

        osc.connect(gain);
        gain.connect(this.destination);
        osc.start(now);
        osc.stop(now + 0.032);
    }

    // Play shield shatter audio (glass-fracture chime and sub-bass drop)
    playShieldBreak(sourceX = null, sourceY = null) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        // 1. Crystal fracture chime
        [1760, 2200, 3100].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.015);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.24);

            gain.gain.setValueAtTime(0.25 * this.effectiveSfxVolume, now + idx * 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

            osc.connect(gain);
            gain.connect(outNode);
            osc.start(now + idx * 0.015);
            osc.stop(now + 0.24);
        });

        // 2. Sub-bass collapse thud
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(140, now);
        subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.28);
        subGain.gain.setValueAtTime(0.35 * this.effectiveSfxVolume, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        subOsc.connect(subGain);
        subGain.connect(outNode);
        subOsc.start(now);
        subOsc.stop(now + 0.28);
    }

    // Play multi-kill fanfare chord
    playMultikill(streak = 2) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const baseF = streak >= 4 ? 660 : (streak === 3 ? 550 : 440);
        const intervals = [1.0, 1.25, 1.5, 2.0];
        intervals.forEach((mult, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(baseF * mult, now + i * 0.035);
            osc.frequency.exponentialRampToValueAtTime(baseF * mult * 1.05, now + 0.45);

            gain.gain.setValueAtTime(0.18 * this.effectiveSfxVolume, now + i * 0.035);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(this.destination);
            osc.start(now + i * 0.035);
            osc.stop(now + 0.45);
        });
    }

    // Play tactical weapon switch latch
    playWeaponSwap(weaponType = 'blaster') {
        this.playWeaponEquip(weaponType);
    }

    // Play empty chamber dry-fire click
    playEmptyClick(sourceX = null, sourceY = null) {
        return this.playDryFire(sourceX, sourceY);
    }

    playDryFire(sourceX = null, sourceY = null) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const dest = this.getSpatialOutput(sourceX, sourceY);

        // Mechanical hammer strike: Dual-transient sharp metallic click
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(2400, now);
        osc1.frequency.exponentialRampToValueAtTime(320, now + 0.028);

        gain1.gain.setValueAtTime(0.32 * this.effectiveSfxVolume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

        osc1.connect(gain1);
        gain1.connect(dest);
        osc1.start(now);
        osc1.stop(now + 0.028);

        // Metallic chassis resonance
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(820, now);
        osc2.frequency.exponentialRampToValueAtTime(140, now + 0.04);

        gain2.gain.setValueAtTime(0.18 * this.effectiveSfxVolume, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc2.connect(gain2);
        gain2.connect(dest);
        osc2.start(now);
        osc2.stop(now + 0.04);
    }

    // Play reload initiation (mag release & bolt slide)
    playReloadStart(weaponType = 'blaster') {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(850, now);
        osc1.frequency.exponentialRampToValueAtTime(220, now + 0.06);
        gain1.gain.setValueAtTime(0.22 * this.effectiveSfxVolume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc1.connect(gain1);
        gain1.connect(this.destination);
        osc1.start(now);
        osc1.stop(now + 0.06);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        const startFreq = weaponType === 'blade' || weaponType === 'vortex' ? 620 : 340;
        osc2.frequency.setValueAtTime(startFreq, now + 0.04);
        osc2.frequency.exponentialRampToValueAtTime(140, now + 0.18);
        gain2.gain.setValueAtTime(0.18 * this.effectiveSfxVolume, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc2.connect(gain2);
        gain2.connect(this.destination);
        osc2.start(now + 0.04);
        osc2.stop(now + 0.18);
    }

    // Play reload completion (mag click lock & cock)
    playReloadFinish(weaponType = 'blaster') {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(320, now);
        osc1.frequency.exponentialRampToValueAtTime(980, now + 0.05);
        gain1.gain.setValueAtTime(0.35 * this.effectiveSfxVolume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(this.destination);
        osc1.start(now);
        osc1.stop(now + 0.08);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(1250, now + 0.04);
        osc2.frequency.exponentialRampToValueAtTime(450, now + 0.11);
        gain2.gain.setValueAtTime(0.25 * this.effectiveSfxVolume, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc2.connect(gain2);
        gain2.connect(this.destination);
        osc2.start(now + 0.04);
        osc2.stop(now + 0.11);
    }

    // Play weapon equip sound
    playWeaponEquip(weaponType = 'blaster', sourceX = null, sourceY = null) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const dest = this.getSpatialOutput(sourceX, sourceY);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = weaponType === 'blade' ? 'sine' : 'sawtooth';
        const startF = weaponType === 'sniper' ? 260 : (weaponType === 'blade' ? 700 : 480);
        osc.frequency.setValueAtTime(startF, now);
        osc.frequency.exponentialRampToValueAtTime(startF * 1.6, now + 0.09);
        gain.gain.setValueAtTime(0.18 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    // Phase 9: Tactical Footstep Synthesizer (Walking / Sprinting / Sliding)
    playFootstep(sourceX, sourceY, isSliding = false, isSprinting = false) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        let outNode = this.destination;
        if (sourceX !== undefined && sourceX !== null && sourceY !== undefined && sourceY !== null && window.game && window.game.localPlayer) {
            const spatial = this.createSpatialPanner(sourceX, sourceY, window.game.localPlayer.x, window.game.localPlayer.y, window.game.localPlayer.angle);
            if (spatial && spatial.inputNode) outNode = spatial.inputNode;
        }

        if (isSliding) {
            // Metallic friction scrape noise
            const dur = 0.08;
            const bufferSize = Math.floor(ctx.sampleRate * dur);
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1100, now);
            filter.Q.setValueAtTime(3.5, now);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.14 * this.effectiveSfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(outNode);
            noise.start(now);
        } else {
            // Crisp tactical boot click on arena metal floor
            const dur = isSprinting ? 0.024 : 0.032;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const baseFreq = isSprinting ? (260 + Math.random() * 60) : (190 + Math.random() * 40);
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + dur);

            const vol = (isSprinting ? 0.20 : 0.14) * this.effectiveSfxVolume;
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            osc.connect(gain);
            gain.connect(outNode);
            osc.start(now);
            osc.stop(now + dur);

            // Subtle surface high transient tap
            const tap = ctx.createOscillator();
            const tapGain = ctx.createGain();
            tap.type = 'sine';
            tap.frequency.setValueAtTime(1400 + Math.random() * 300, now);
            tap.frequency.exponentialRampToValueAtTime(400, now + 0.012);
            tapGain.gain.setValueAtTime(0.06 * this.effectiveSfxVolume, now);
            tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
            tap.connect(tapGain);
            tapGain.connect(outNode);
            tap.start(now);
            tap.stop(now + 0.012);
        }
    }

    // Phase 9: Bullet Obstacle Impact & Ricochet Chime
    playWallHit(sourceX, sourceY, isRicochet = false) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        let outNode = this.destination;
        if (sourceX !== undefined && sourceX !== null && sourceY !== undefined && sourceY !== null && window.game && window.game.localPlayer) {
            const spatial = this.createSpatialPanner(sourceX, sourceY, window.game.localPlayer.x, window.game.localPlayer.y, window.game.localPlayer.angle);
            if (spatial && spatial.inputNode) outNode = spatial.inputNode;
        }

        if (isRicochet) {
            // High-pitched resonant whine
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(2600 + Math.random() * 400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.07);
            gain.gain.setValueAtTime(0.24 * this.effectiveSfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.connect(gain);
            gain.connect(outNode);
            osc.start(now);
            osc.stop(now + 0.07);
        } else {
            // Metallic/concrete bullet thud + spark chirp
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(950 + Math.random() * 200, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.045);
            gain.gain.setValueAtTime(0.20 * this.effectiveSfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
            osc.connect(gain);
            gain.connect(outNode);
            osc.start(now);
            osc.stop(now + 0.045);
        }
    }

    // Phase 9: Low Ammo Tactical Warning Dual-Chirp
    playLowAmmoWarning() {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1960, now);
        osc.frequency.setValueAtTime(2480, now + 0.035);

        gain.gain.setValueAtTime(0.12 * this.effectiveSfxVolume, now);
        gain.gain.setValueAtTime(0.001, now + 0.03);
        gain.gain.setValueAtTime(0.12 * this.effectiveSfxVolume, now + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(this.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    }

    // Phase 9: Gun Game Melee Demotion Tone
    playDemoted() {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const freqs = [330, 246.94, 185]; // Descending E minor chord
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.08;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, start);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.85, start + 0.16);

            gain.gain.setValueAtTime(0.25 * this.effectiveSfxVolume, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

            osc.connect(gain);
            gain.connect(this.destination);

            osc.start(start);
            osc.stop(start + 0.16);
        });
    }

    // Phase 19: Quantum Teleportation Sound Synthesis
    playTeleport(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const out = this.getSpatialOutput(sourceX, sourceY);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(1180, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.22);

        gain.gain.setValueAtTime(0.35 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    // Phase 19: Kinetic Jump Pad Pneumatic Chime Synthesis
    playJumpPad(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const out = this.getSpatialOutput(sourceX, sourceY);

        // Low kinetic punch
        const oscLow = ctx.createOscillator();
        const gainLow = ctx.createGain();
        oscLow.type = 'triangle';
        oscLow.frequency.setValueAtTime(130, now);
        oscLow.frequency.exponentialRampToValueAtTime(45, now + 0.18);
        gainLow.gain.setValueAtTime(0.4 * this.effectiveSfxVolume, now);
        gainLow.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        oscLow.connect(gainLow);
        gainLow.connect(out);
        oscLow.start(now);
        oscLow.stop(now + 0.18);

        // High resonant chime
        const oscHigh = ctx.createOscillator();
        const gainHigh = ctx.createGain();
        oscHigh.type = 'sine';
        oscHigh.frequency.setValueAtTime(740, now);
        oscHigh.frequency.exponentialRampToValueAtTime(1240, now + 0.14);
        gainHigh.gain.setValueAtTime(0.25 * this.effectiveSfxVolume, now);
        gainHigh.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        oscHigh.connect(gainHigh);
        gainHigh.connect(out);
        oscHigh.start(now);
        oscHigh.stop(now + 0.14);
    }

    // Play explosion sound (Phase 17: Spatialized with distance falloff)
    playExplosion(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.linearRampToValueAtTime(40, now + 0.4);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        const out = this.getSpatialOutput(sourceX, sourceY);
        gain.connect(out);

        noise.start(now);
        noise.stop(now + 0.4);
    }

    // Play killstreak cue
    playKillstreak() {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);

            gain.gain.setValueAtTime(0.25 * this.effectiveSfxVolume, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);

            osc.connect(gain);
            gain.connect(this.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.2);
        });
    }

    // Play Wall Bounce acoustic ping
    playWallBounce(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.09);

        gain.gain.setValueAtTime(0.3 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(outNode);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    // Play Slide friction whoosh
    playSlide(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.25);

        gain.gain.setValueAtTime(0.25 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(outNode);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    // Play low-HP tension heartbeat thump
    playHeartbeat() {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        [0, 0.12].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(75, now + offset);
            osc.frequency.exponentialRampToValueAtTime(35, now + offset + 0.1);

            gain.gain.setValueAtTime(0.45 * this.effectiveSfxVolume, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);

            osc.connect(gain);
            gain.connect(this.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.1);
        });
    }

    // Start Procedural Cyberpunk Synth Arpeggio
    startAmbientMusic() {
        if (this.ambientInterval) return;
        this.ambientStep = 0;
        this.ambientNotes = [110, 130.81, 146.83, 164.81, 110, 164.81, 196.00, 146.83]; // A2, C3, D3, E3...

        this.ambientInterval = setInterval(() => {
            if (this.isMuted || !this.ctx || this.ctx.state === 'suspended') return;
            const ctx = this.ctx;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            const freq = this.ambientNotes[this.ambientStep % this.ambientNotes.length];
            this.ambientStep++;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, now);
            filter.frequency.exponentialRampToValueAtTime(150, now + 0.28);

            gain.gain.setValueAtTime(0.06 * this.effectiveMusicVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.destination);

            osc.start(now);
            osc.stop(now + 0.28);
        }, 320); // ~188 BPM 16th note feel
    }

    stopAmbientMusic() {
        if (this.ambientInterval) {
            clearInterval(this.ambientInterval);
            this.ambientInterval = null;
        }
    }

    // Play Neon Blade / Glaive crescent slash
    playBladeSlash(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        // Metallic whoosh slice
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.16);
        filter.Q.setValueAtTime(4.0, now);

        gain.gain.setValueAtTime(0.45 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(outNode);

        osc.start(now);
        osc.stop(now + 0.16);
    }

    // Play Power-Up Pickup Chime
    playPowerUpPickup(type) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const baseFreq = type === 'overdrive' ? 440 : (type === 'shield' ? 523.25 : 659.25);
        const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2.0];

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const noteStart = now + idx * 0.055;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.05, noteStart + 0.18);

            gain.gain.setValueAtTime(0.28 * this.effectiveSfxVolume, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.18);

            osc.connect(gain);
            gain.connect(this.destination);

            osc.start(noteStart);
            osc.stop(noteStart + 0.18);
        });
    }

    // Play Multikill Announcer Chords
    playMultikill(streak = 2) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        let chordFreqs = [220, 277.18, 329.63]; // A major
        if (streak === 2) chordFreqs = [261.63, 329.63, 392.0]; // C major
        else if (streak === 3) chordFreqs = [293.66, 369.99, 440.0]; // D major
        else if (streak >= 4) chordFreqs = [329.63, 415.3, 493.88, 659.25]; // E dominant / huge power

        chordFreqs.forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = streak >= 4 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.4);

            gain.gain.setValueAtTime(0.22 * this.effectiveSfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

            osc.connect(gain);
            gain.connect(this.destination);

            osc.start(now);
            osc.stop(now + 0.4);
        });
    }

    // Play Match Countdown Beep (3.. 2.. 1.. ENGAGE!)
    playCountdownBeep(isFinal = false) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        if (!isFinal) {
            // Standard digital countdown ping (440Hz)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);

            gain.gain.setValueAtTime(0.35 * this.effectiveSfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this.destination);

            osc.start(now);
            osc.stop(now + 0.12);
        } else {
            // High-octane ENGAGE chord burst (880Hz + 1320Hz)
            const freqs = [880, 1320];
            freqs.forEach((freq) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + 0.38);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(3200, now);
                filter.frequency.exponentialRampToValueAtTime(600, now + 0.38);

                gain.gain.setValueAtTime(0.38 * this.effectiveSfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.destination);

                osc.start(now);
                osc.stop(now + 0.4);
            });
        }
    }

    // Play Tactical EMP Supernova Shockwave
    playSupernova() {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Sub-bass drop (180Hz down to 34Hz)
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(180, now);
        subOsc.frequency.exponentialRampToValueAtTime(34, now + 0.55);

        subGain.gain.setValueAtTime(0.65 * this.effectiveSfxVolume, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        subOsc.connect(subGain);
        subGain.connect(this.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.55);

        // Resonant sweeping EMP filter burst
        const sweepOsc = ctx.createOscillator();
        const sweepFilter = ctx.createBiquadFilter();
        const sweepGain = ctx.createGain();

        sweepOsc.type = 'sawtooth';
        sweepOsc.frequency.setValueAtTime(120, now);

        sweepFilter.type = 'lowpass';
        sweepFilter.frequency.setValueAtTime(2400, now);
        sweepFilter.frequency.exponentialRampToValueAtTime(160, now + 0.45);
        sweepFilter.Q.setValueAtTime(7.0, now);

        sweepGain.gain.setValueAtTime(0.42 * this.effectiveSfxVolume, now);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        sweepOsc.connect(sweepFilter);
        sweepFilter.connect(sweepGain);
        sweepGain.connect(this.destination);

        sweepOsc.start(now);
        sweepOsc.stop(now + 0.45);
    }

    // Play Low-HP Heartbeat Thump (lub-dub)
    playHeartbeat() {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Lub (first beat)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(70, now);
        osc1.frequency.exponentialRampToValueAtTime(42, now + 0.08);

        gain1.gain.setValueAtTime(0.48 * this.effectiveSfxVolume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc1.connect(gain1);
        gain1.connect(this.destination);
        osc1.start(now);
        osc1.stop(now + 0.09);

        // Dub (second beat 130ms later)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(60, now + 0.13);
        osc2.frequency.exponentialRampToValueAtTime(36, now + 0.23);

        gain2.gain.setValueAtTime(0.55 * this.effectiveSfxVolume, now + 0.13);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        osc2.connect(gain2);
        gain2.connect(this.destination);
        osc2.start(now + 0.13);
        osc2.stop(now + 0.24);
    }

    // Phase 6: Stereo Spatial Panning Node Builder (3D Binaural Positioning)
    createSpatialPanner(sourceX, sourceY, listenerX, listenerY, listenerAngle = 0, duration = 0.5) {
        if (!this.ensureContext()) return null;
        const ctx = this.ctx;
        const dx = sourceX - listenerX;
        const dy = sourceY - listenerY;
        const dist = Math.hypot(dx, dy);

        // Distance attenuation with realistic 1600px cutoff
        if (dist > 1600) {
            const dummy = ctx.createGain();
            dummy.gain.setValueAtTime(0, ctx.currentTime);
            return { inputNode: dummy, pan: 0, distGain: 0, cleanup: () => {} };
        }

        // Phase 17: Accurate 2D lateral stereo panning projected onto listener's right axis
        // In screen coordinates (+X right, +Y down, angle theta measured from +X axis):
        // Forward vector: F = (cos(theta), sin(theta))
        // Right vector: R = (-sin(theta), cos(theta))
        const sin = Math.sin(listenerAngle);
        const cos = Math.cos(listenerAngle);
        const relRight = -dx * sin + dy * cos;
        const pan = Math.max(-1, Math.min(1, relRight / 650));

        // Realistic distance attenuation with smooth drop-off towards 1600px
        const distGain = Math.max(0, (1 - dist / 1600)) * (1 / (1 + (dist / 650) * 1.5));

        const distNode = ctx.createGain();
        distNode.gain.setValueAtTime(distGain, ctx.currentTime);
        distNode.connect(this.destination);

        let inputNode = distNode;
        let panner = null;
        if (ctx.createStereoPanner) {
            panner = ctx.createStereoPanner();
            panner.pan.setValueAtTime(pan, ctx.currentTime);
            panner.connect(distNode);
            inputNode = panner;
        }

        const cleanup = () => {
            try {
                if (panner) panner.disconnect();
                if (distNode) distNode.disconnect();
            } catch (e) {}
        };

        // Auto-cleanup WebAudio nodes after sound duration to eliminate memory leaks
        setTimeout(cleanup, Math.max(120, Math.round(duration * 1000 + 100)));

        return { inputNode, pan, distGain, cleanup, panner, distNode };
    }

    // Update spatial listener position & orientation
    updateListener(x, y, angle = 0) {
        this.listenerX = x;
        this.listenerY = y;
        this.listenerAngle = angle;
    }

    // Resolves spatial output node or falls back to master sfx destination
    getSpatialOutput(sourceX, sourceY) {
        if (sourceX !== undefined && sourceX !== null && sourceY !== undefined && sourceY !== null) {
            let lx = this.listenerX;
            let ly = this.listenerY;
            let la = this.listenerAngle || 0;
            if ((lx === undefined || ly === undefined) && window.game) {
                const targetP = window.game.localPlayer || (window.game.getSpectatorTarget ? window.game.getSpectatorTarget() : null);
                if (targetP) {
                    lx = targetP.x;
                    ly = targetP.y;
                    la = targetP.angle;
                }
            }
            if (lx !== undefined && ly !== undefined) {
                const spatial = this.createSpatialPanner(sourceX, sourceY, lx, ly, la);
                if (spatial && spatial.inputNode) {
                    return spatial.inputNode;
                }
            }
        }
        return this.destination;
    }

    getSpatialPanner(sourceX, sourceY) {
        return this.getSpatialOutput(sourceX, sourceY);
    }

    // Phase 6: Tactical Ping Radio Chimes
    playPing(type = 'enemy', sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        let freqs = [980, 1180];
        let wave = 'sine';
        if (type === 'defend') {
            freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
            wave = 'triangle';
        } else if (type === 'powerup') {
            freqs = [440, 660, 880];
            wave = 'sine';
        } else if (type === 'assist') {
            freqs = [700, 700, 850];
            wave = 'sawtooth';
        }

        let outNode = this.destination;
        if (sourceX !== undefined && sourceY !== undefined && window.game && window.game.localPlayer) {
            const spatial = this.createSpatialPanner(sourceX, sourceY, window.game.localPlayer.x, window.game.localPlayer.y, window.game.localPlayer.angle);
            if (spatial && spatial.inputNode) outNode = spatial.inputNode;
        }

        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = now + idx * 0.06;

            osc.type = wave;
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + 0.12);

            gain.gain.setValueAtTime(0.3 * this.effectiveSfxVolume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

            osc.connect(gain);
            gain.connect(outNode);

            osc.start(startTime);
            osc.stop(startTime + 0.12);
        });
    }

    // Phase 6: Central Plasma Reactor Pulse
    playPlasmaPulse(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter ? ctx.createBiquadFilter() : null;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.5);

        gain.gain.setValueAtTime(0.45 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        if (filter) {
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(350, now);
            filter.frequency.exponentialRampToValueAtTime(120, now + 0.5);
            filter.Q.setValueAtTime(6.0, now);
            osc.connect(filter);
            filter.connect(gain);
        } else {
            osc.connect(gain);
        }
        gain.connect(outNode);

        osc.start(now);
        osc.stop(now + 0.5);
    }

    // Phase 7: Wall Kick Parkour Clack & Whoosh
    playWallKick(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter ? ctx.createBiquadFilter() : null;
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.12);

        gain.gain.setValueAtTime(0.4 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        if (filter) {
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.12);
            osc.connect(filter);
            filter.connect(gain);
        } else {
            osc.connect(gain);
        }
        gain.connect(outNode);

        osc.start(now);
        osc.stop(now + 0.12);

        // Air whoosh
        if (ctx.createBuffer) {
            const bufferSize = Math.floor(ctx.sampleRate * 0.1);
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            const noiseFilter = ctx.createBiquadFilter ? ctx.createBiquadFilter() : null;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.25 * this.effectiveSfxVolume, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            if (noiseFilter) {
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.setValueAtTime(800, now);
                noiseFilter.frequency.exponentialRampToValueAtTime(2200, now + 0.1);
                whiteNoise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
            } else {
                whiteNoise.connect(noiseGain);
            }
            noiseGain.connect(outNode);

            whiteNoise.start(now);
        }
    }

    // Phase 7: Shield Break Shatter FX (Spatialized)
    playShieldBreak(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        // Crystalline fracture chimes
        [1480, 2200, 3100].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.02;

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, start);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.4, start + 0.28);

            gain.gain.setValueAtTime(0.28 * this.effectiveSfxVolume, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

            osc.connect(gain);
            gain.connect(outNode);

            osc.start(start);
            osc.stop(start + 0.28);
        });

        // Electrical noise burst
        if (ctx.createBuffer) {
            const bufferSize = Math.floor(ctx.sampleRate * 0.22);
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            const filter = ctx.createBiquadFilter ? ctx.createBiquadFilter() : null;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.35 * this.effectiveSfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            if (filter) {
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(2400, now);
                noise.connect(filter);
                filter.connect(gain);
            } else {
                noise.connect(gain);
            }
            gain.connect(outNode);

            noise.start(now);
            noise.stop(now + 0.22);
        }
    }

    // Phase 7: Ejected Shell Casing Floor Clink with Spatial Panning
    playCasingClink(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        let outNode = this.destination;
        if (sourceX !== undefined && sourceY !== undefined && window.game && window.game.localPlayer) {
            const spatial = this.createSpatialPanner(sourceX, sourceY, window.game.localPlayer.x, window.game.localPlayer.y, window.game.localPlayer.angle);
            if (spatial && spatial.inputNode) outNode = spatial.inputNode;
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const baseFreq = 2600 + Math.random() * 800;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + 0.04);

        gain.gain.setValueAtTime(0.12 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(outNode);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    // Phase 7: Bullet Near-Miss Doppler Whiz-By
    playBulletWhiz(sourceX, sourceY) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const outNode = this.getSpatialOutput(sourceX, sourceY);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter ? ctx.createBiquadFilter() : null;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(3200, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.09);

        gain.gain.setValueAtTime(0.18 * this.effectiveSfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        if (filter) {
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2400, now);
            filter.frequency.exponentialRampToValueAtTime(800, now + 0.09);
            filter.Q.setValueAtTime(5.0, now);
            osc.connect(filter);
            filter.connect(gain);
        } else {
            osc.connect(gain);
        }
        gain.connect(outNode);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    // Phase 7: Dynamic 16-Step Procedural Synthesizer Routing
    initMusicRouting() {
        if (!this.ctx) return;
        if (!this.musicMainGain) {
            this.musicMainGain = this.ctx.createGain();
            this.musicMainGain.gain.setValueAtTime(this.effectiveMusicVolume, this.ctx.currentTime);
            this.musicMainGain.connect(this.ctx.destination);

            this.ambientMasterGain = this.ctx.createGain();
            this.ambientMasterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
            this.ambientMasterGain.connect(this.musicMainGain);

            this.combatMasterGain = this.ctx.createGain();
            this.combatMasterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
            this.combatMasterGain.connect(this.musicMainGain);
        }
    }

    startMusic() {
        if (this.musicPlaying || !this.ensureContext()) return;
        this.initMusicRouting();
        this.musicPlaying = true;
        this.currentStep = 0;
        this.nextStepTime = this.ctx.currentTime + 0.05;

        if (this.musicTimer) clearInterval(this.musicTimer);
        this.musicTimer = setInterval(() => this.scheduleMusic(), 25);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }

    setMusicState(state) {
        if (this.musicState === state) return;
        this.musicState = state;
        if (!this.ensureContext()) return;
        this.initMusicRouting();

        const now = this.ctx.currentTime;
        if (state === 'combat') {
            this.ambientMasterGain.gain.setTargetAtTime(0.25, now, 0.35);
            this.combatMasterGain.gain.setTargetAtTime(0.85, now, 0.25);
        } else {
            this.ambientMasterGain.gain.setTargetAtTime(0.75, now, 0.6);
            this.combatMasterGain.gain.setTargetAtTime(0.0, now, 0.5);
        }
    }

    scheduleMusic() {
        if (!this.musicPlaying || !this.ctx || this.isMuted) return;
        const ctx = this.ctx;
        const stepTime = (60.0 / this.musicBpm) / 4; // 16th note (~0.111s)

        while (this.nextStepTime < ctx.currentTime + 0.14) {
            const time = this.nextStepTime;
            const step = this.currentStep; // 0 to 63 (4 bars x 16 steps)
            const bar = Math.floor(step / 16); // 0: A Minor, 1: F Major, 2: D Minor, 3: E Minor
            const stepInBar = step % 16;

            // Phase 11: 4-Bar Cyberpunk Harmonic Progression
            const harmonicScales = [
                AudioEngine.scales.Am9,
                AudioEngine.scales.Fmaj7,
                AudioEngine.scales.Dm7,
                AudioEngine.scales.Em9
            ];
            const bassFrequencies = AudioEngine.bassFrequencies;

            // --- AMBIENT SYNTH LAYER ---
            if (stepInBar % 2 === 0) {
                const activeScale = harmonicScales[bar];
                const pattern = [0, 2, 4, 3, 5, 4, 2, 1];
                const noteIdx = pattern[(stepInBar / 2) % pattern.length];
                const freq = activeScale[noteIdx];

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                osc.type = (bar === 2) ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(freq, time);

                // Breathing dynamic filter cutoff across the 64-step cycle
                const filterCutoff = 1100 + Math.sin((step / 64) * Math.PI * 2) * 450;
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(filterCutoff, time);
                filter.frequency.exponentialRampToValueAtTime(380, time + stepTime * 1.8);

                gain.gain.setValueAtTime(0.18, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + stepTime * 1.8);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ambientMasterGain);

                osc.start(time);
                osc.stop(time + stepTime * 1.8);
            }

            // --- COMBAT DNB / SYNTHWAVE LAYER ---
            // 1. Kick on steps [0, 6, 10], with extra tension kick on Bar 3 step 12
            const isKickStep = (stepInBar === 0 || stepInBar === 6 || stepInBar === 10 || (bar === 3 && stepInBar === 12));
            if (isKickStep) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(160, time);
                osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

                gain.gain.setValueAtTime(0.65, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

                osc.connect(gain);
                gain.connect(this.combatMasterGain);

                osc.start(time);
                osc.stop(time + 0.13);
            }

            // 2. Snare on steps [4, 12], with turnaround roll on Bar 3 steps [14, 15]
            const isSnareStep = (stepInBar === 4 || stepInBar === 12 || (bar === 3 && (stepInBar === 14 || stepInBar === 15)));
            if (isSnareStep) {
                const isRoll = (bar === 3 && (stepInBar === 14 || stepInBar === 15));
                const osc = ctx.createOscillator();
                const oscGain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(190, time);
                osc.frequency.exponentialRampToValueAtTime(90, time + (isRoll ? 0.04 : 0.08));
                oscGain.gain.setValueAtTime(isRoll ? 0.28 : 0.4, time);
                oscGain.gain.exponentialRampToValueAtTime(0.001, time + (isRoll ? 0.04 : 0.08));
                osc.connect(oscGain);
                oscGain.connect(this.combatMasterGain);
                osc.start(time);
                osc.stop(time + (isRoll ? 0.04 : 0.08));

                const bufferSize = Math.floor(ctx.sampleRate * (isRoll ? 0.06 : 0.14));
                const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(1200, time);
                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(isRoll ? 0.3 : 0.45, time);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, time + (isRoll ? 0.06 : 0.14));
                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(this.combatMasterGain);
                noise.start(time);
            }

            // 3. Hi-hat on odd 16th steps
            if (stepInBar % 2 === 1) {
                const bufferSize = Math.floor(ctx.sampleRate * 0.04);
                const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(7000, time);
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.2, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.combatMasterGain);
                noise.start(time);
            }

            // 4. Rolling Dynamic Bassline tuned to current Bar chord root & fifth
            const bassSteps = [0, 2, 3, 6, 8, 10, 11, 14];
            if (bassSteps.indexOf(stepInBar) !== -1) {
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                const bassConfig = bassFrequencies[bar];
                const bassFreq = (stepInBar >= 8 && stepInBar < 12) ? bassConfig.fifth : bassConfig.root;
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(bassFreq, time);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(550, time);
                filter.frequency.exponentialRampToValueAtTime(140, time + stepTime * 0.95);
                filter.Q.setValueAtTime(3.0, time);

                gain.gain.setValueAtTime(0.38, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + stepTime * 0.95);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.combatMasterGain);

                osc.start(time);
                osc.stop(time + stepTime * 0.95);
            }

            this.nextStepTime += stepTime;
            this.currentStep = (this.currentStep + 1) % 64;
        }
    }

    // Phase 25: Synthesized Tactical UI Clicks
    playUiClick(type = 'subtle') {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const dest = this.masterSfxGain || this.destination || ctx.destination;

        if (type === 'hero' || type === 'confirm') {
            // Bright dual-harmonic confirmation chime
            [1046.5, 1567.98].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = now + idx * 0.035;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.25, start + 0.08);

                gain.gain.setValueAtTime(0.2 * this.effectiveSfxVolume, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

                osc.connect(gain);
                gain.connect(dest);
                osc.start(start);
                osc.stop(start + 0.08);
            });
        } else if (type === 'tab') {
            // Smooth metallic sliding tab tick
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.025);

            gain.gain.setValueAtTime(0.14 * this.effectiveSfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.025);
        } else if (type === 'toggle') {
            // Crisp chirp toggle
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1400, now);
            osc.frequency.exponentialRampToValueAtTime(2100, now + 0.03);

            gain.gain.setValueAtTime(0.15 * this.effectiveSfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.03);
        } else {
            // Default subtle crisp navigation click
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1900, now);
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.018);

            gain.gain.setValueAtTime(0.12 * this.effectiveSfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.018);
        }
    }

    // Phase 25: Multi-Kill Fanfare Synthesizer
    playMultikill(streak = 2) {
        if (this.isMuted || !this.ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const dest = this.masterSfxGain || this.destination || ctx.destination;

        let notes = [440, 554.37]; // Double Kill
        if (streak === 3) notes = [440, 554.37, 659.25]; // Triple Kill
        else if (streak >= 4) notes = [329.63, 440, 554.37, 880]; // Rampage / Unstoppable

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.06;
            osc.type = streak >= 4 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.22 * this.effectiveSfxVolume, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(start);
            osc.stop(start + 0.18);
        });

        // Sub-bass thud for Rampage
        if (streak >= 4) {
            const subOsc = ctx.createOscillator();
            const subGain = ctx.createGain();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(80, now);
            subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

            subGain.gain.setValueAtTime(0.35 * this.effectiveSfxVolume, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            subOsc.connect(subGain);
            subGain.connect(dest);
            subOsc.start(now);
            subOsc.stop(now + 0.35);
        }
    }

    // Phase 25: Tactical Weapon Swap Mechanical Sound
    playWeaponSwap(weaponType = 'blaster', sourceX = null, sourceY = null) {
        return this.playWeaponEquip(weaponType, sourceX, sourceY);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.musicMainGain && this.ctx) {
            this.musicMainGain.gain.setValueAtTime(this.effectiveMusicVolume, this.ctx.currentTime);
        }
        if (this.masterSfxGain && this.ctx) {
            this.masterSfxGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);
        }
        return this.isMuted;
    }
}

// Phase 11: Cyberpunk Harmonic Progression Scales & Bass Frequencies
AudioEngine.scales = {
    Am9: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33], // Bar 0: A Minor (Am9)
    Fmaj7: [174.61, 220.00, 261.63, 329.63, 349.23, 392.00, 440.00, 523.25], // Bar 1: F Major (Fmaj7)
    Dm7: [146.83, 174.61, 220.00, 261.63, 293.66, 349.23, 392.00, 440.00], // Bar 2: D Minor (Dm7)
    Em9: [164.81, 196.00, 220.00, 246.94, 329.63, 392.00, 440.00, 493.88]  // Bar 3: E Minor / Em(add9)
};

AudioEngine.bassFrequencies = [
    { root: 55.00, fifth: 82.41 }, // Bar 0: A1 / E2
    { root: 43.65, fifth: 65.41 }, // Bar 1: F1 / C2
    { root: 36.71, fifth: 55.00 }, // Bar 2: D1 / A1
    { root: 41.20, fifth: 82.41 }  // Bar 3: E1 / E2
];

window.AudioEngine = new AudioEngine();
window.AudioEngine.scales = AudioEngine.scales;
window.AudioEngine.bassFrequencies = AudioEngine.bassFrequencies;

