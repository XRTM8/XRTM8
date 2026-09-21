/**
 * Input.js
 * Unified cross-platform input manager for PC (Keyboard/Mouse) and Mobile (Dynamic Dual Joysticks).
 * Prevents any browser gesture interference.
 */
class InputManager {
    constructor() {
        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        // Normalized movement vector [-1..1, -1..1]
        this.move = { x: 0, y: 0 };
        
        // Aim angle in radians
        this.aimAngle = 0;
        this.aimDist = 0; // For mobile joystick distance
        
        // Action states
        this.isFiring = false;
        this.isDashing = false;
        this.isSliding = false;
        this.isParrying = false;
        this.isReloading = false;
        this.isTriggeringUltimate = false;
        this.isTriggeringPing = false;
        this.selectedWeaponIndex = 0; // 0: Blaster, 1: Shotgun, 2: Sniper, 3: Vortex, 4: Glaive
        this.aimAssistEnabled = true;

        // Tactical Radial Ping Wheel (Phase 9E)
        this.isPingKeyDown = false;
        this.pingKeyDownTime = 0;
        this.pingWheelActive = false;
        this.pingWheelCenter = { x: 0, y: 0 };
        this.selectedPingType = 'enemy';

        // Keybinding Re-mapping Suite (Phase 8E)
        this.defaultKeybinds = {
            moveUp: 'KeyW',
            moveDown: 'KeyS',
            moveLeft: 'KeyA',
            moveRight: 'KeyD',
            dash: 'Space',
            slide: 'KeyC',
            parry: 'KeyE',
            reload: 'KeyR',
            ultimate: 'KeyF',
            ping: 'KeyV',
            weapon1: 'Digit1',
            weapon2: 'Digit2',
            weapon3: 'Digit3',
            weapon4: 'Digit4',
            weapon5: 'Digit5',
            cycleWeapon: 'KeyQ'
        };
        this.keybinds = Object.assign({}, this.defaultKeybinds);
        this.loadKeybinds();
        
        // Raw mouse position relative to canvas
        this.mouse = { x: 0, y: 0, isDown: false, rightDown: false };
        this.mouseSensitivity = 1.0;
        this.keys = {};
        
        // Mobile touch states
        this.touchMoveId = null;
        this.touchMoveOrigin = { x: 0, y: 0 };
        this.touchMovePos = { x: 0, y: 0 };
        
        this.touchAimId = null;
        this.touchAimOrigin = { x: 0, y: 0 };
        this.touchAimPos = { x: 0, y: 0 };

        // Phase 11: 2-Thumb Mobile Ergonomics & Gesture Recognition
        this.lastMoveTapTime = 0;
        this.lastMoveTapPos = { x: 0, y: 0 };
        this.lastAimTapTime = 0;
        this.lastAimTapPos = { x: 0, y: 0 };
        this.touchAimStartTime = 0;
        this.touchAimDistMax = 0;
        this.touchAimDeadzone = 15;
        this.lastMoveFlickTime = 0;
        this.lastWheelTime = 0;

        // Phase 12: HTML5 Gamepad API Support (Controllers)
        this.gamepadConnected = false;
        this.gamepadIndex = null;
        this.gamepadDeadzone = 0.18;
        this.gamepadAimAngle = 0;
        this.gamepadMoveActive = false;
        this.gamepadAimActive = false;
        this.prevGamepadButtons = {};
        this.hapticsEnabled = true;
        
        this.init();
    }

    triggerHaptic(type = 'light') {
        if (!this.hapticsEnabled) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                if (type === 'light') {
                    navigator.vibrate(10);
                } else if (type === 'medium') {
                    navigator.vibrate(25);
                } else if (type === 'heavy') {
                    navigator.vibrate(50);
                } else if (type === 'kill') {
                    navigator.vibrate([30, 40, 60]);
                }
            } catch (e) {}
        }
    }

    getTouchMoveData() {
        if (this.touchMoveId === null) return null;
        return {
            origin: this.touchMoveOrigin,
            current: this.touchMovePos,
            radius: 45
        };
    }

    getTouchAimData() {
        if (this.touchAimId === null) return null;
        return {
            origin: this.touchAimOrigin,
            current: this.touchAimPos,
            radius: 50,
            deadzone: this.touchAimDeadzone || 15
        };
    }

    isInteractiveUI(target) {
        if (!target || typeof target.closest !== 'function') return false;
        if (target.id === 'gameCanvas') return false;
        const selector = 'button, input, select, textarea, a, .modal, .modal-backdrop, .modal-overlay, .settings-card, .armory-card, .lobby-card, #settingsModal, #armoryModal, #gameOverModal, #lobbyOverlay, #mobileControls, .crosshair-opt-btn, .fow-opt-btn, .assist-opt-btn, .keybind-btn, .slider, #pauseModal, #guideModal, .sector-card, .settings-tab-btn, .color-swatch-btn, .haptic-opt-btn, .quick-deploy-card, #quickDeployBtn';
        return !!target.closest(selector);
    }

    loadKeybinds() {
        try {
            const raw = localStorage.getItem('neon_rift_keybinds');
            if (raw) {
                const parsed = JSON.parse(raw);
                this.keybinds = Object.assign({}, this.defaultKeybinds, parsed);
            }
        } catch (e) {}
    }

    saveKeybinds() {
        try {
            localStorage.setItem('neon_rift_keybinds', JSON.stringify(this.keybinds));
        } catch (e) {}
    }

    setKeybind(action, code) {
        if (this.keybinds[action] !== undefined) {
            this.keybinds[action] = code;
            this.saveKeybinds();
        }
    }

    resetKeybinds() {
        this.keybinds = Object.assign({}, this.defaultKeybinds);
        this.saveKeybinds();
    }

    isActionKey(action, code) {
        if (this.keybinds[action] === code) return true;
        if (action === 'dash' && (code === 'ShiftLeft' || code === 'ShiftRight')) return true;
        if (action === 'slide' && (code === 'ControlLeft' || code === 'ControlRight')) return true;
        if (action === 'ultimate' && code === 'KeyX') return true;
        return false;
    }

    isActionActive(action) {
        const primary = this.keybinds[action];
        if (primary && this.keys[primary]) return true;
        if (action === 'moveUp' && this.keys['ArrowUp']) return true;
        if (action === 'moveDown' && this.keys['ArrowDown']) return true;
        if (action === 'moveLeft' && this.keys['ArrowLeft']) return true;
        if (action === 'moveRight' && this.keys['ArrowRight']) return true;
        if (action === 'dash' && (this.keys['ShiftLeft'] || this.keys['ShiftRight'])) return true;
        if (action === 'slide' && (this.keys['ControlLeft'] || this.keys['ControlRight'])) return true;
        if (action === 'ultimate' && this.keys['KeyX']) return true;
        return false;
    }

    init() {
        this.setupPC();
        this.setupGamepad();
        if (this.isMobile) {
            this.setupMobile();
        }
    }

    setupPC() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }

            // Dash
            if (this.isActionKey('dash', e.code)) {
                this.isDashing = true;
            }

            // Slide
            if (this.isActionKey('slide', e.code)) {
                this.isSliding = true;
            }

            // Parry
            if (this.isActionKey('parry', e.code)) {
                this.isParrying = true;
            }

            // Reload (Phase 8A)
            if (this.isActionKey('reload', e.code)) {
                this.isReloading = true;
            }

            // Ultimate Supernova
            if (this.isActionKey('ultimate', e.code)) {
                this.isTriggeringUltimate = true;
            }

            // Tactical Ping (Hold for Radial Wheel, Tap for Enemy Alert)
            if (this.isActionKey('ping', e.code)) {
                if (!this.isPingKeyDown) {
                    this.isPingKeyDown = true;
                    this.pingKeyDownTime = performance.now();
                    this.pingWheelCenter = { x: this.mouse.x, y: this.mouse.y };
                    this.selectedPingType = 'enemy';
                }
            }

            // Weapon switching
            if (!this.isWeaponLocked()) {
                if (this.isActionKey('weapon1', e.code)) this.selectedWeaponIndex = 0;
                if (this.isActionKey('weapon2', e.code)) this.selectedWeaponIndex = 1;
                if (this.isActionKey('weapon3', e.code)) this.selectedWeaponIndex = 2;
                if (this.isActionKey('weapon4', e.code)) this.selectedWeaponIndex = 3;
                if (this.isActionKey('weapon5', e.code)) this.selectedWeaponIndex = 4;
                if (this.isActionKey('cycleWeapon', e.code)) {
                    const totalWeps = (typeof WEAPONS !== 'undefined') ? WEAPONS.length : 5;
                    this.selectedWeaponIndex = (this.selectedWeaponIndex + 1) % totalWeps;
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (this.isActionKey('dash', e.code)) {
                this.isDashing = false;
            }
            if (this.isActionKey('slide', e.code)) {
                this.isSliding = false;
            }
            if (this.isActionKey('parry', e.code)) {
                this.isParrying = false;
            }
            if (this.isActionKey('reload', e.code)) {
                this.isReloading = false;
            }
            if (this.isActionKey('ultimate', e.code)) {
                this.isTriggeringUltimate = false;
            }
            if (this.isActionKey('ping', e.code)) {
                this.isPingKeyDown = false;
                this.pingWheelActive = false;
                this.isTriggeringPing = true;
            }
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mousedown', (e) => {
            if (this.isInteractiveUI(e.target)) return;
            if (e.button === 0) {
                this.mouse.isDown = true;
                this.isFiring = true;
            } else if (e.button === 2) {
                this.mouse.rightDown = true;
                this.isParrying = true;
            } else if (e.button === 1) {
                this.isPingKeyDown = true;
                this.pingKeyDownTime = performance.now();
                this.pingWheelCenter = { x: this.mouse.x, y: this.mouse.y };
                this.selectedPingType = 'enemy';
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.isDown = false;
                this.isFiring = false;
            } else if (e.button === 2) {
                this.mouse.rightDown = false;
                this.isParrying = false;
            } else if (e.button === 1) {
                this.isPingKeyDown = false;
                this.pingWheelActive = false;
                this.isTriggeringPing = true;
            }
        });

        window.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent right-click context menu in-game
        });

        window.addEventListener('wheel', (e) => {
            if (this.isInteractiveUI(e.target)) return;
            if (this.isWeaponLocked()) return;
            const now = performance.now();
            if (now - this.lastWheelTime < 80) return; // 80ms hardware notch debounce
            this.lastWheelTime = now;
            const totalWeps = (typeof WEAPONS !== 'undefined') ? WEAPONS.length : 5;
            if (e.deltaY > 0) {
                this.selectedWeaponIndex = (this.selectedWeaponIndex + 1) % totalWeps;
            } else if (e.deltaY < 0) {
                this.selectedWeaponIndex = (this.selectedWeaponIndex + totalWeps - 1) % totalWeps;
            }
        }, { passive: true });
    }

    isWeaponLocked() {
        const game = window.game;
        if (game) {
            if (game.gameMode && game.gameMode.mode === 'GUN_GAME') return true;
            if (game.activeMutator === 'snipers_only' || game.activeMutator === 'shotguns_only' || game.activeMutator === 'instagib') return true;
            if (game.mutators && (game.mutators.snipers_only || game.mutators.shotguns_only || game.mutators.instagib)) return true;
        }
        return false;
    }

    get mouseAngle() {
        return this.aimAngle;
    }

    set mouseAngle(val) {
        this.aimAngle = val;
    }

    setupMobile() {
        const touchContainer = document.body;

        touchContainer.addEventListener('touchstart', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const halfWidth = window.innerWidth / 2;

                // Check if touching UI buttons or modals first
                if (this.isInteractiveUI(t.target) || t.target.closest('.mobile-btn') || t.target.closest('.lobby-modal')) {
                    continue;
                }

                const now = performance.now();

                // Left half of screen: Movement Joystick & Double-Tap Dash
                if (t.clientX < halfWidth && this.touchMoveId === null) {
                    const distFromLastMove = Math.hypot(t.clientX - this.lastMoveTapPos.x, t.clientY - this.lastMoveTapPos.y);
                    if (now - this.lastMoveTapTime < 270 && distFromLastMove < 90) {
                        this.isDashing = true;
                    }
                    this.lastMoveTapTime = now;
                    this.lastMoveTapPos = { x: t.clientX, y: t.clientY };

                    this.touchMoveId = t.identifier;
                    this.touchMoveOrigin = { x: t.clientX, y: t.clientY };
                    this.touchMovePos = { x: t.clientX, y: t.clientY };
                }
                // Right half of screen: Aim & Fire Joystick & Tactile Parry Gestures
                else if (t.clientX >= halfWidth && this.touchAimId === null) {
                    const distFromLastAim = Math.hypot(t.clientX - this.lastAimTapPos.x, t.clientY - this.lastAimTapPos.y);
                    if (now - this.lastAimTapTime < 270 && distFromLastAim < 90) {
                        this.isParrying = true;
                    }
                    this.lastAimTapTime = now;
                    this.lastAimTapPos = { x: t.clientX, y: t.clientY };

                    this.touchAimId = t.identifier;
                    this.touchAimOrigin = { x: t.clientX, y: t.clientY };
                    this.touchAimPos = { x: t.clientX, y: t.clientY };
                    this.touchAimStartTime = now;
                    this.touchAimDistMax = 0;
                }
                // Secondary touch on right side while aiming triggers tactile Parry!
                else if (t.clientX >= halfWidth && this.touchAimId !== null && t.identifier !== this.touchAimId) {
                    this.isParrying = true;
                }
            }
        }, { passive: false });

        touchContainer.addEventListener('touchmove', (e) => {
            // Prevent browser scroll/zoom
            if (e.cancelable && !e.target.closest('.scrollable-ui')) {
                e.preventDefault();
            }

            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];

                if (t.identifier === this.touchMoveId) {
                    this.touchMovePos = { x: t.clientX, y: t.clientY };
                    const moveDist = Math.hypot(t.clientX - this.touchMoveOrigin.x, t.clientY - this.touchMoveOrigin.y);
                    // Flick Slide: pushing joystick to full extension triggers slide
                    if (moveDist > 52) {
                        const now = performance.now();
                        if (now - this.lastMoveFlickTime > 650) {
                            this.lastMoveFlickTime = now;
                            this.isSliding = true;
                        }
                    }
                } else if (t.identifier === this.touchAimId) {
                    this.touchAimPos = { x: t.clientX, y: t.clientY };
                    const aimDist = Math.hypot(t.clientX - this.touchAimOrigin.x, t.clientY - this.touchAimOrigin.y);
                    this.touchAimDistMax = Math.max(this.touchAimDistMax, aimDist);
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];

                if (t.identifier === this.touchMoveId) {
                    this.touchMoveId = null;
                    this.move.x = 0;
                    this.move.y = 0;
                    this.isDashing = false;
                    this.isSliding = false;
                } else if (t.identifier === this.touchAimId) {
                    const tapDuration = performance.now() - this.touchAimStartTime;
                    // Quick-tap release on right stick (< 150ms, moved < 12px) triggers instant Parry tap
                    if (tapDuration < 150 && this.touchAimDistMax < 12) {
                        this.isParrying = true;
                    }
                    this.touchAimId = null;
                    this.isFiring = false;
                }
            }
        };

        touchContainer.addEventListener('touchend', endTouch, { passive: false });
        touchContainer.addEventListener('touchcancel', endTouch, { passive: false });
    }

    // --- Phase 12: HTML5 Gamepad API Support ---
    setupGamepad() {
        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadConnected = true;
            this.gamepadIndex = e.gamepad.index;
            if (window.game && window.game.showToast) {
                const name = (e.gamepad.id || 'CONTROLLER').slice(0, 24).toUpperCase();
                window.game.showToast(`CONTROLLER CONNECTED: ${name}`);
            }
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadConnected = false;
                this.gamepadIndex = null;
                if (window.game && window.game.showToast) {
                    window.game.showToast('CONTROLLER DISCONNECTED');
                }
            }
        });
    }

    pollGamepad() {
        if (!navigator.getGamepads) return;
        let gamepads = null;
        try {
            gamepads = navigator.getGamepads();
        } catch (e) { return; }
        if (!gamepads) return;

        let gp = null;
        if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
            gp = gamepads[this.gamepadIndex];
        } else {
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i] && gamepads[i].connected) {
                    gp = gamepads[i];
                    this.gamepadIndex = i;
                    break;
                }
            }
        }
        if (!gp || !gp.connected) return;

        this.gamepadConnected = true;

        // 1. Left Analog Stick (Movement) - Axes 0 & 1
        const deadzone = this.gamepadDeadzone || 0.18;
        let moveX = gp.axes[0] || 0;
        let moveY = gp.axes[1] || 0;
        const moveMag = Math.hypot(moveX, moveY);
        this.gamepadMoveActive = moveMag > deadzone;
        if (this.gamepadMoveActive) {
            const normMag = Math.min(1.0, (moveMag - deadzone) / (1.0 - deadzone));
            this.move.x = (moveX / moveMag) * normMag;
            this.move.y = (moveY / moveMag) * normMag;
            this.keys['KeyD'] = moveX > deadzone;
            this.keys['KeyA'] = moveX < -deadzone;
            this.keys['KeyS'] = moveY > deadzone;
            this.keys['KeyW'] = moveY < -deadzone;
        } else {
            this.gamepadMoveActive = false;
            if (this.gamepadConnected) {
                if (this.keys['KeyD'] && !this.mouse.isDown) this.keys['KeyD'] = false;
                if (this.keys['KeyA']) this.keys['KeyA'] = false;
                if (this.keys['KeyS']) this.keys['KeyS'] = false;
                if (this.keys['KeyW']) this.keys['KeyW'] = false;
            }
        }

        // 2. Right Analog Stick (Aiming) - Axes 2 & 3
        let aimX = gp.axes[2] || 0;
        let aimY = gp.axes[3] || 0;
        const aimMag = Math.hypot(aimX, aimY);
        this.gamepadAimActive = aimMag > deadzone;
        if (this.gamepadAimActive) {
            this.aimAngle = Math.atan2(aimY, aimX);
            this.gamepadAimAngle = this.aimAngle;
        }

        // 3. Trigger & Button Mapping (Standard W3C Gamepad Layout)
        const isBtnDown = (idx) => {
            const b = gp.buttons[idx];
            return b ? (typeof b === 'object' ? (b.pressed || b.value > 0.45) : b > 0.45) : false;
        };
        const isBtnJustPressed = (idx) => {
            const down = isBtnDown(idx);
            const wasDown = !!this.prevGamepadButtons[idx];
            return down && !wasDown;
        };

        // Right Trigger (Button 7) = Primary Fire
        if (isBtnDown(7)) {
            this.isFiring = true;
        } else if (this.gamepadConnected && !this.mouse.isDown) {
            this.isFiring = false;
        }

        // Left Trigger (Button 6) = Parry Deflector
        if (isBtnDown(6)) {
            this.isParrying = true;
        } else if (this.gamepadConnected && !this.mouse.rightDown) {
            this.isParrying = false;
        }

        // Right Bumper (Button 5) or Face Button A (Button 0) = Dash
        if (isBtnDown(5) || isBtnDown(0)) {
            this.isDashing = true;
        }

        // Left Bumper (Button 4) or Face Button B (Button 1) = Slide
        if (isBtnDown(4) || isBtnDown(1)) {
            this.isSliding = true;
        }

        // Face Button X (Button 2) = Reload
        if (isBtnDown(2)) {
            this.isReloading = true;
        }

        // Face Button Y (Button 3) = Ultimate Supernova
        if (isBtnDown(3)) {
            this.isTriggeringUltimate = true;
        }

        // D-Pad / Weapon Selection
        const totalWeps = (typeof WEAPONS !== 'undefined') ? WEAPONS.length : 5;
        if (isBtnJustPressed(14)) { // D-Pad Left: Previous weapon
            this.selectedWeaponIndex = (this.selectedWeaponIndex + totalWeps - 1) % totalWeps;
        }
        if (isBtnJustPressed(15)) { // D-Pad Right: Next weapon
            this.selectedWeaponIndex = (this.selectedWeaponIndex + 1) % totalWeps;
        }
        if (isBtnJustPressed(12)) { // D-Pad Up: Apex Sniper
            this.selectedWeaponIndex = 2;
        }
        if (isBtnJustPressed(13)) { // D-Pad Down: Neon Glaive
            this.selectedWeaponIndex = 4;
        }

        // Back / Select (Button 8) = Ping
        if (isBtnJustPressed(8)) {
            this.isTriggeringPing = true;
            this.selectedPingType = 'enemy';
        }

        // Save button state for edge detection
        if (gp.buttons) {
            for (let i = 0; i < gp.buttons.length; i++) {
                this.prevGamepadButtons[i] = isBtnDown(i);
            }
        }
    }

    /**
     * Update called each game frame
     * @param {Object} playerScreenPos - {x, y} player's center on screen for PC mouse aiming
     * @param {Array} nearbyTargets - array of other players for Mobile Aim Assist magnetic pull
     * @param {Object} localPlayer - the local player reference
     */
    update(playerScreenPos, nearbyTargets = null, localPlayer = null) {
        // Phase 12: Poll HTML5 Gamepad Controller
        this.pollGamepad();

        // --- Calculate Movement ---
        if (this.touchMoveId !== null) {
            // Mobile Joystick vector
            const dx = this.touchMovePos.x - this.touchMoveOrigin.x;
            const dy = this.touchMovePos.y - this.touchMoveOrigin.y;
            const dist = Math.hypot(dx, dy);
            const maxRadius = 45;

            if (dist > 5) {
                const power = Math.min(1, dist / maxRadius);
                this.move.x = (dx / dist) * power;
                this.move.y = (dy / dist) * power;
            } else {
                this.move.x = 0;
                this.move.y = 0;
            }
        } else {
            // PC Keyboard Configurable Keybinds
            let mx = 0;
            let my = 0;
            if (this.isActionActive('moveUp')) my -= 1;
            if (this.isActionActive('moveDown')) my += 1;
            if (this.isActionActive('moveLeft')) mx -= 1;
            if (this.isActionActive('moveRight')) mx += 1;

            if (mx !== 0 && my !== 0) {
                const len = Math.SQRT2;
                mx /= len;
                my /= len;
            }

            // Keyboard overrides if keys are pressed; otherwise preserve analog gamepad movement
            if (mx !== 0 || my !== 0) {
                this.move.x = mx;
                this.move.y = my;
            } else if (!this.gamepadMoveActive) {
                this.move.x = 0;
                this.move.y = 0;
            }
        }

        // --- Calculate Aiming ---
        if (this.touchAimId !== null) {
            // Mobile Aim Stick with Inner Deadzone
            const dx = this.touchAimPos.x - this.touchAimOrigin.x;
            const dy = this.touchAimPos.y - this.touchAimOrigin.y;
            const dist = Math.hypot(dx, dy);
            const deadzone = this.touchAimDeadzone || 15;

            if (dist >= deadzone) {
                let stickAngle = Math.atan2(dy, dx);

                // Mobile Aim Assist: Magnetic angle pull towards closest enemy operative within +/- 18 deg (Phase 8E)
                if (this.aimAssistEnabled && nearbyTargets && localPlayer) {
                    let bestDiff = 0.32; // ~18.3 degrees pull threshold
                    let bestAngle = null;
                    for (let i = 0; i < nearbyTargets.length; i++) {
                        const target = nearbyTargets[i];
                        if (!target || target.isDead || target.id === localPlayer.id) continue;
                        if (target.team && localPlayer.team && target.team === localPlayer.team) continue;
                        const tdx = target.x - localPlayer.x;
                        const tdy = target.y - localPlayer.y;
                        const targetDistSq = tdx * tdx + tdy * tdy;
                        if (targetDistSq > 600 * 600) continue; // Max assist range

                        const targetAngle = Math.atan2(tdy, tdx);
                        let diff = Math.abs(targetAngle - stickAngle);
                        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
                        if (diff < bestDiff) {
                            bestDiff = diff;
                            bestAngle = targetAngle;
                        }
                    }
                    if (bestAngle !== null) {
                        let diff = bestAngle - stickAngle;
                        while (diff < -Math.PI) diff += Math.PI * 2;
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        stickAngle += diff * 0.38; // 38% magnetic pull
                    }
                }

                this.aimAngle = stickAngle;
                this.isFiring = true;
            } else if (this.touchAimDistMax < deadzone) {
                this.isFiring = false;
            }
        } else if (this.gamepadAimActive) {
            // Controller right analog stick maintains active control
            this.aimAngle = this.gamepadAimAngle;
        } else if (playerScreenPos) {
            // PC Mouse Aim
            const sens = this.mouseSensitivity || 1.0;
            const dx = (this.mouse.x - playerScreenPos.x) * sens;
            const dy = (this.mouse.y - playerScreenPos.y) * sens;
            this.aimAngle = Math.atan2(dy, dx);
        }

        // Phase 9E: Tactical Radial Ping Wheel slice selection
        if (this.isPingKeyDown) {
            const holdMs = performance.now() - this.pingKeyDownTime;
            if (holdMs > 180) {
                this.pingWheelActive = true;
                const dx = this.mouse.x - this.pingWheelCenter.x;
                const dy = this.mouse.y - this.pingWheelCenter.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 16) {
                    const ang = Math.atan2(dy, dx);
                    if (ang < -0.78 && ang > -2.35) {
                        this.selectedPingType = 'enemy';
                    } else if (ang >= -0.78 && ang <= 1.1) {
                        this.selectedPingType = 'defend';
                    } else {
                        this.selectedPingType = 'assist';
                    }
                }
            }
        }
    }

    // Trigger haptic vibration on mobile
    vibrate(pattern = 15) {
        if (navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) {}
        }
    }
}

window.InputManager = InputManager;
window.Input = InputManager;
