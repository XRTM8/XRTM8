/**
 * UIManager.js
 * Decoupled UI and DOM Controller for Neon Rift Arena.
 * Manages menus, HUD telemetry, modals, settings, QR rendering, and armory progression.
 */

class UIManager {
    constructor(game) {
        this.game = game;
        this.toastTimer = null;

        // Phase 25: Universal Tactical UI Click Feedback
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button, .btn, .tab, .sector-card, .weapon-slot, .color-swatch-btn, .crosshair-opt-btn, .settings-tab-btn, .haptic-opt-btn, .assist-opt-btn, .damage-opt-btn, .reloadarc-opt-btn');
            if (btn && window.AudioEngine && window.AudioEngine.playUiClick) {
                if (btn.classList.contains('btn-primary') || btn.id === 'quickDeployBtn' || btn.id === 'soloBtn' || btn.id === 'pauseRestartBtn') {
                    window.AudioEngine.playUiClick('confirm');
                } else if (btn.classList.contains('tab') || btn.classList.contains('settings-tab-btn')) {
                    window.AudioEngine.playUiClick('tab');
                } else if (btn.classList.contains('color-swatch-btn') || btn.classList.contains('crosshair-opt-btn') || btn.classList.contains('damage-opt-btn') || btn.classList.contains('reloadarc-opt-btn')) {
                    window.AudioEngine.playUiClick('toggle');
                } else {
                    window.AudioEngine.playUiClick('subtle');
                }
            }
        });
    }

    init() {
        this.setupWeaponSlots();
        this.setupMobileButtons();
        this.setupLobbyListeners();
        this.setupModernHub();
        this.setupPauseUI();
        this.setupGuideUI();
        this.setupSettingsUI();
        this.setupArmoryUI();
        this.loadSettings();
        this.checkUrlParams();
    }

    setupWeaponSlots() {
        const weaponSlots = document.querySelectorAll('.weapon-slot');
        weaponSlots.forEach((slot, idx) => {
            slot.addEventListener('click', () => {
                if (this.game.input) this.game.input.selectedWeaponIndex = idx;
            });
        });
    }

    setupMobileButtons() {
        const dashBtn = document.getElementById('mobileDashBtn');
        const slideBtn = document.getElementById('mobileSlideBtn');
        const parryBtn = document.getElementById('mobileParryBtn');
        const switchBtn = document.getElementById('mobileSwitchBtn');
        const audioBtn = document.getElementById('audioToggleBtn');

        if (dashBtn) {
            dashBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isDashing = true;
            });
            dashBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isDashing = false;
            });
        }

        if (slideBtn) {
            slideBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isSliding = true;
            });
            slideBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isSliding = false;
            });
        }

        if (parryBtn) {
            parryBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isParrying = true;
            });
            parryBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isParrying = false;
            });
        }

        if (switchBtn) {
            switchBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const totalWeps = (typeof WEAPONS !== 'undefined') ? WEAPONS.length : 5;
                if (this.game.input) {
                    this.game.input.selectedWeaponIndex = (this.game.input.selectedWeaponIndex + 1) % totalWeps;
                }
            });
        }

        const reloadBtn = document.getElementById('mobileReloadBtn');
        if (reloadBtn) {
            reloadBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isReloading = true;
            });
            reloadBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isReloading = false;
            });
            reloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.game.localPlayer) this.game.localPlayer.attemptReload();
            });
        }

        const superBtn = document.getElementById('mobileSuperBtn');
        if (superBtn) {
            superBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isTriggeringUltimate = true;
            });
            superBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (this.game.input) this.game.input.isTriggeringUltimate = false;
            });
        }

        const pingBtn = document.getElementById('mobilePingBtn');
        if (pingBtn) {
            pingBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                if (this.game.input) {
                    this.game.input.isPingKeyDown = true;
                    this.game.input.pingKeyDownTime = performance.now();
                    this.game.input.pingWheelCenter = {
                        x: touch ? touch.clientX : (window.innerWidth / 2),
                        y: touch ? touch.clientY : (window.innerHeight / 2)
                    };
                    this.game.input.selectedPingType = 'enemy';
                }
            });
            pingBtn.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                if (touch && this.game.input) {
                    this.game.input.mouse.x = touch.clientX;
                    this.game.input.mouse.y = touch.clientY;
                }
            });
            pingBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (this.game.input) {
                    this.game.input.isPingKeyDown = false;
                    this.game.input.pingWheelActive = false;
                    this.game.input.isTriggeringPing = true;
                }
            });
            pingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.game.input) {
                    this.game.input.selectedPingType = 'enemy';
                    this.game.input.isTriggeringPing = true;
                }
            });
        }

        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                if (window.AudioEngine) {
                    const muted = window.AudioEngine.toggleMute();
                    audioBtn.classList.toggle('muted', muted);
                    audioBtn.setAttribute('title', muted ? 'Unmute Audio' : 'Mute Audio');
                }
            });
        }
    }

    setupLobbyListeners() {
        const soloBtn = document.getElementById('soloBtn');
        const spectateBotsBtn = document.getElementById('spectateBotsBtn');
        const hostBtn = document.getElementById('hostBtn');
        const joinBtn = document.getElementById('joinBtn');
        const spectateBtn = document.getElementById('spectateBtn');
        const spectatePrevBtn = document.getElementById('spectatePrevBtn');
        const spectateNextBtn = document.getElementById('spectateNextBtn');

        if (soloBtn) {
            soloBtn.addEventListener('click', () => {
                const botCount = parseInt(document.getElementById('botCountSelect')?.value) || 3;
                if (this.game.network) this.game.network.startOfflineMatch(botCount);
            });
        }

        if (spectateBotsBtn) {
            spectateBotsBtn.addEventListener('click', () => {
                const botCount = parseInt(document.getElementById('botCountSelect')?.value) || 4;
                this.game.setupMatch(true, botCount, true);
            });
        }

        if (hostBtn) {
            hostBtn.addEventListener('click', () => {
                const name = document.getElementById('playerNameInput')?.value || 'Operator';
                if (this.game.network) {
                    this.game.network.hostRoom(name, (code) => {
                        const roomInfo = document.getElementById('roomInfo');
                        const codeDisplay = document.getElementById('roomCodeDisplay');
                        if (codeDisplay) codeDisplay.textContent = code;
                        if (roomInfo) {
                            roomInfo.classList.remove('hidden');
                        }
                        this.renderQrCode(code);
                    }, (err) => this.game.showNotification('HOST ERROR', String(err), 'danger'));
                }
            });
        }

        const copyInviteBtn = document.getElementById('copyInviteBtn');
        const toggleQrBtn = document.getElementById('toggleQrBtn');
        const rematchBtn = document.getElementById('rematchBtn');
        const returnLobbyBtn = document.getElementById('returnLobbyBtn');

        if (copyInviteBtn) {
            copyInviteBtn.addEventListener('click', () => {
                const code = this.game.network ? this.game.network.roomCode : null;
                if (!code) return;
                const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).then(() => {
                        this.showToast('INVITE LINK COPIED TO CLIPBOARD!');
                    }).catch(() => {
                        prompt('Copy Room Invite URL:', url);
                    });
                } else {
                    prompt('Copy Room Invite URL:', url);
                }
            });
        }

        if (toggleQrBtn) {
            toggleQrBtn.addEventListener('click', () => {
                const qrBox = document.getElementById('qrCodeContainer');
                if (qrBox) {
                    qrBox.classList.toggle('hidden');
                    if (!qrBox.classList.contains('hidden') && this.game.network && this.game.network.roomCode) {
                        this.renderQrCode(this.game.network.roomCode);
                    }
                }
            });
        }

        if (rematchBtn) {
            rematchBtn.addEventListener('click', () => this.game.rematch());
        }

        if (returnLobbyBtn) {
            returnLobbyBtn.addEventListener('click', () => {
                const gameOver = document.getElementById('gameOverModal');
                if (gameOver) gameOver.classList.add('hidden');
                const lobby = document.getElementById('lobbyModal');
                if (lobby) lobby.classList.remove('hidden');
            });
        }

        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                const code = document.getElementById('joinCodeInput')?.value.trim();
                const name = document.getElementById('playerNameInput')?.value || 'Operator';
                if (!code) {
                    this.game.showNotification('ROOM CODE REQUIRED', 'Please enter a 4-letter Room Code', 'warning');
                    return;
                }
                if (this.game.network) {
                    this.game.network.joinRoom(code, name, false, () => {
                        const lobby = document.getElementById('lobbyModal');
                        if (lobby) lobby.classList.add('hidden');
                    }, (err) => this.game.showNotification('JOIN ERROR', String(err), 'danger'));
                }
            });
        }

        if (spectateBtn) {
            spectateBtn.addEventListener('click', () => {
                const code = document.getElementById('joinCodeInput')?.value.trim();
                const name = document.getElementById('playerNameInput')?.value || 'Spectator';
                if (!code) {
                    this.game.showNotification('ROOM CODE REQUIRED', 'Please enter a 4-letter Room Code', 'warning');
                    return;
                }
                if (this.game.network) {
                    this.game.network.joinRoom(code, name, true, () => {
                        this.game.enableSpectatorMode();
                    }, (err) => this.game.showNotification('SPECTATE ERROR', String(err), 'danger'));
                }
            });
        }

        if (spectatePrevBtn) {
            spectatePrevBtn.addEventListener('click', () => this.game.cycleSpectatorTarget(-1));
        }
        if (spectateNextBtn) {
            spectateNextBtn.addEventListener('click', () => this.game.cycleSpectatorTarget(1));
        }

        // Global keyboard listener for Spectator mode cycling
        window.addEventListener('keydown', (e) => {
            if (this.game.isSpectator) {
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                    this.game.cycleSpectatorTarget(-1);
                } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === ' ') {
                    this.game.cycleSpectatorTarget(1);
                }
            }
        });

        // Mode switch
        const modeRadios = document.querySelectorAll('input[name="gameMode"]');
        modeRadios.forEach(r => {
            r.addEventListener('change', (e) => {
                if (this.game.gameMode) this.game.gameMode.mode = e.target.value;
            });
        });
    }

    setupModernHub() {
        const quickDeployBtn = document.getElementById('quickDeployBtn');
        const hubTabCustomBtn = document.getElementById('hubTabCustomBtn');
        const hubTabOnlineBtn = document.getElementById('hubTabOnlineBtn');
        const hubCustomPanel = document.getElementById('hubCustomPanel');
        const hubOnlinePanel = document.getElementById('hubOnlinePanel');
        const guideBtn = document.getElementById('guideBtn');

        if (quickDeployBtn) {
            quickDeployBtn.addEventListener('click', () => {
                const mapSelect = document.getElementById('mapSelect');
                if (mapSelect) {
                    mapSelect.value = 'core';
                    mapSelect.dispatchEvent(new Event('change'));
                }
                const sectorCards = document.querySelectorAll('.sector-card');
                sectorCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-map') === 'core'));

                const ffaRadio = document.querySelector('input[name="gameMode"][value="FFA"]');
                if (ffaRadio) ffaRadio.checked = true;
                if (this.game.gameMode) this.game.gameMode.mode = 'FFA';

                const botCountSelect = document.getElementById('botCountSelect');
                if (botCountSelect) botCountSelect.value = '3';

                if (this.game.network) {
                    this.game.network.startOfflineMatch(3);
                } else if (this.game.setupMatch) {
                    this.game.setupMatch(true, 3, false);
                }
                document.getElementById('lobbyModal')?.classList.add('hidden');
            });
        }

        if (hubTabCustomBtn && hubTabOnlineBtn) {
            hubTabCustomBtn.addEventListener('click', () => {
                hubTabCustomBtn.classList.add('active');
                hubTabOnlineBtn.classList.remove('active');
                if (hubCustomPanel) hubCustomPanel.classList.remove('hidden');
                if (hubOnlinePanel) hubOnlinePanel.classList.add('hidden');
            });

            hubTabOnlineBtn.addEventListener('click', () => {
                hubTabOnlineBtn.classList.add('active');
                hubTabCustomBtn.classList.remove('active');
                if (hubOnlinePanel) hubOnlinePanel.classList.remove('hidden');
                if (hubCustomPanel) hubCustomPanel.classList.add('hidden');
            });
        }

        const sectorCards = document.querySelectorAll('.sector-card');
        sectorCards.forEach(card => {
            card.addEventListener('click', () => {
                sectorCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const mapId = card.getAttribute('data-map');
                const mapSelect = document.getElementById('mapSelect');
                if (mapSelect) {
                    mapSelect.value = mapId;
                    mapSelect.dispatchEvent(new Event('change'));
                }
            });
        });

        if (guideBtn) {
            guideBtn.addEventListener('click', () => {
                const guideModal = document.getElementById('guideModal');
                if (guideModal) guideModal.classList.remove('hidden');
            });
        }
    }

    setupPauseUI() {
        const pauseResumeBtn = document.getElementById('pauseResumeBtn');
        const pauseSettingsBtn = document.getElementById('pauseSettingsBtn');
        const pauseGuideBtn = document.getElementById('pauseGuideBtn');
        const pauseLeaveBtn = document.getElementById('pauseLeaveBtn');

        if (pauseResumeBtn) {
            pauseResumeBtn.addEventListener('click', () => this.togglePause());
        }

        const pauseRestartBtn = document.getElementById('pauseRestartBtn');
        if (pauseRestartBtn) {
            pauseRestartBtn.addEventListener('click', () => {
                if (this.game && this.game.restartMatch) {
                    this.game.restartMatch();
                }
            });
        }

        if (pauseSettingsBtn) {
            pauseSettingsBtn.addEventListener('click', () => {
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal) settingsModal.classList.remove('hidden');
            });
        }

        if (pauseGuideBtn) {
            pauseGuideBtn.addEventListener('click', () => {
                const guideModal = document.getElementById('guideModal');
                if (guideModal) guideModal.classList.remove('hidden');
            });
        }

        if (pauseLeaveBtn) {
            pauseLeaveBtn.addEventListener('click', () => {
                const pauseModal = document.getElementById('pauseModal');
                if (pauseModal) pauseModal.classList.add('hidden');
                this.game.isPaused = false;
                const lobby = document.getElementById('lobbyModal');
                if (lobby) lobby.classList.remove('hidden');
                if (this.game.network && this.game.network.isOnline) {
                    this.game.network.leaveRoom();
                }
            });
        }
    }

    togglePause() {
        const pauseModal = document.getElementById('pauseModal');
        if (!pauseModal) return;
        const isCurrentlyOpen = !pauseModal.classList.contains('hidden');
        if (isCurrentlyOpen) {
            pauseModal.classList.add('hidden');
            this.game.isPaused = false;
            this.game.lastTime = performance.now();
        } else {
            const lobby = document.getElementById('lobbyModal');
            const gameOver = document.getElementById('gameOverModal');
            if (lobby && !lobby.classList.contains('hidden')) return;
            if (gameOver && !gameOver.classList.contains('hidden')) return;

            pauseModal.classList.remove('hidden');
            this.game.isPaused = !this.game.network || !this.game.network.isOnline;
            this.updatePauseStats();
        }
    }

    updatePauseStats() {
        const killsEl = document.getElementById('pauseKillsVal');
        const scoreEl = document.getElementById('pauseScoreVal');
        const sectorEl = document.getElementById('pauseSectorVal');
        if (killsEl) killsEl.textContent = this.game.localPlayer ? this.game.localPlayer.kills : 0;
        if (scoreEl) scoreEl.textContent = this.game.localPlayer ? this.game.localPlayer.score : 0;
        if (sectorEl) {
            const mapName = (this.game.mapManager && this.game.mapManager.currentMap && this.game.mapManager.currentMap.name) ? this.game.mapManager.currentMap.name : 'CORE';
            sectorEl.textContent = mapName.toUpperCase();
        }
    }

    setupGuideUI() {
        const closeGuideBtn = document.getElementById('closeGuideBtn');
        if (closeGuideBtn) {
            closeGuideBtn.addEventListener('click', () => {
                const guideModal = document.getElementById('guideModal');
                if (guideModal) guideModal.classList.add('hidden');
            });
        }
    }

    setupSettingsUI() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');

        const toggleSettings = () => {
            if (!settingsModal) return;
            const isHidden = settingsModal.classList.contains('hidden');
            if (isHidden) {
                settingsModal.classList.remove('hidden');
                this.updateCrosshairPreview();
            } else {
                settingsModal.classList.add('hidden');
                this.saveSettings();
            }
        };

        if (settingsBtn) settingsBtn.addEventListener('click', toggleSettings);
        if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', toggleSettings);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const guideModal = document.getElementById('guideModal');
                const armoryModal = document.getElementById('armoryModal');
                const lobbyModal = document.getElementById('lobbyModal');
                const gameOverModal = document.getElementById('gameOverModal');

                if (guideModal && !guideModal.classList.contains('hidden')) {
                    guideModal.classList.add('hidden');
                } else if (settingsModal && !settingsModal.classList.contains('hidden')) {
                    toggleSettings();
                } else if (armoryModal && !armoryModal.classList.contains('hidden')) {
                    armoryModal.classList.add('hidden');
                } else if ((!lobbyModal || lobbyModal.classList.contains('hidden')) &&
                           (!gameOverModal || gameOverModal.classList.contains('hidden'))) {
                    this.togglePause();
                }
            }
        });

        // Settings Tabs Header (Phase 23)
        const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
        const settingsTabContents = document.querySelectorAll('.settings-tab-content');
        settingsTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                settingsTabBtns.forEach(b => b.classList.remove('active'));
                settingsTabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-tab');
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.classList.add('active');
                if (targetId === 'tab-gameplay') {
                    this.updateCrosshairPreview();
                }
            });
        });

        // Volume Sliders
        const masterSlider = document.getElementById('masterVolSlider');
        const sfxSlider = document.getElementById('sfxVolSlider');
        const musicSlider = document.getElementById('musicVolSlider');
        const sensSlider = document.getElementById('sensSlider');
        const shakeSlider = document.getElementById('shakeSlider');

        if (masterSlider) {
            masterSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                const el = document.getElementById('masterVolVal');
                if (el) el.textContent = `${val}%`;
                if (window.AudioEngine) window.AudioEngine.setMasterVolume(val / 100);
                this.saveSettings();
            });
        }

        if (sfxSlider) {
            sfxSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                const el = document.getElementById('sfxVolVal');
                if (el) el.textContent = `${val}%`;
                if (window.AudioEngine) window.AudioEngine.setSfxVolume(val / 100);
                this.saveSettings();
            });
        }

        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                const el = document.getElementById('musicVolVal');
                if (el) el.textContent = `${val}%`;
                if (window.AudioEngine) window.AudioEngine.setMusicVolume(val / 100);
                this.saveSettings();
            });
        }

        if (sensSlider) {
            sensSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                const sens = (val / 100).toFixed(1);
                const el = document.getElementById('sensVal');
                if (el) el.textContent = `${sens}x`;
                if (this.game.input) this.game.input.mouseSensitivity = parseFloat(sens);
                this.saveSettings();
            });
        }

        if (shakeSlider) {
            shakeSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                const el = document.getElementById('shakeVal');
                if (el) el.textContent = `${val}%`;
                if (this.game.renderer) this.game.renderer.shakeMultiplier = val / 100;
                this.saveSettings();
            });
        }

        // Crosshair style buttons
        const crosshairBtns = document.querySelectorAll('.crosshair-opt-btn');
        crosshairBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                crosshairBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const style = btn.getAttribute('data-style');
                if (this.game.renderer) this.game.renderer.crosshairStyle = style;
                this.updateCrosshairPreview();
                this.saveSettings();
            });
        });

        // Crosshair Color Swatches (Phase 23)
        const swatchBtns = document.querySelectorAll('.color-swatch-btn');
        swatchBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                swatchBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const color = btn.getAttribute('data-color');
                if (this.game.renderer) this.game.renderer.crosshairColor = color;
                this.updateCrosshairPreview();
                this.saveSettings();
            });
        });

        // Floating Damage Numbers toggle (Phase 25 QOL)
        const dmgBtns = document.querySelectorAll('.damage-opt-btn');
        dmgBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                dmgBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const enabled = btn.getAttribute('data-enabled') === 'true';
                if (this.game.renderer) this.game.renderer.damageNumbersEnabled = enabled;
                this.saveSettings();
            });
        });

        // Crosshair Reload Arc toggle (Phase 25 QOL)
        const reloadArcBtns = document.querySelectorAll('.reloadarc-opt-btn');
        reloadArcBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                reloadArcBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const enabled = btn.getAttribute('data-enabled') === 'true';
                if (this.game.renderer) this.game.renderer.crosshairReloadArcEnabled = enabled;
                this.saveSettings();
            });
        });

        // Resolution Scale (Phase 23)
        const resScaleSelect = document.getElementById('resScaleSelect');
        if (resScaleSelect) {
            resScaleSelect.addEventListener('change', (e) => {
                const scale = parseFloat(e.target.value) || 1.0;
                if (this.game.renderer) this.game.renderer.setResolutionScale(scale);
                this.saveSettings();
            });
        }

        // Particle Density (Phase 23)
        const particleDensitySelect = document.getElementById('particleDensitySelect');
        if (particleDensitySelect) {
            particleDensitySelect.addEventListener('change', (e) => {
                if (this.game.renderer) this.game.renderer.particleDensity = e.target.value;
                this.saveSettings();
            });
        }

        // 2D Dynamic Fog of War toggle (Phase 8C)
        const fowBtns = document.querySelectorAll('.fow-opt-btn');
        fowBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                fowBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.game.renderer) this.game.renderer.fogOfWarEnabled = btn.getAttribute('data-fow') === 'true';
                this.saveSettings();
            });
        });

        // Mobile Aim Assist toggle (Phase 8E)
        const assistBtns = document.querySelectorAll('.assist-opt-btn');
        assistBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                assistBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.game.input) this.game.input.aimAssistEnabled = btn.getAttribute('data-assist') === 'true';
                this.saveSettings();
            });
        });

        // Mobile Overhaul: Mobile Fire Mode toggle (Auto-fire vs Fire-on-Release)
        const autofireBtns = document.querySelectorAll('.autofire-opt-btn');
        autofireBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                autofireBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.game.input) this.game.input.mobileAutoFire = btn.getAttribute('data-autofire') === 'true';
                this.saveSettings();
            });
        });

        // Mobile Overhaul: Left-handed layout toggle (mirrors halves + button stack)
        const leftyBtns = document.querySelectorAll('.lefty-opt-btn');
        leftyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                leftyBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const isLefty = btn.getAttribute('data-lefty') === 'true';
                if (this.game.input) this.game.input.leftHanded = isLefty;
                document.body.classList.toggle('lefty-mode', isLefty);
                this.saveSettings();
            });
        });

        // Mobile Overhaul: Stick size slider (visual + reach scaling)
        const stickSizeSlider = document.getElementById('stickSizeSlider');
        if (stickSizeSlider) {
            stickSizeSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10) || 100;
                if (this.game.input) this.game.input.stickScale = val / 100;
                const valEl = document.getElementById('stickSizeVal');
                if (valEl) valEl.textContent = `${val}%`;
                this.saveSettings();
            });
        }

        // Mobile Haptics Toggle (Phase 23)
        const hapticBtns = document.querySelectorAll('.haptic-opt-btn');
        hapticBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                hapticBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const enabled = btn.getAttribute('data-haptic') === 'true';
                if (this.game.input) this.game.input.hapticsEnabled = enabled;
                this.saveSettings();
            });
        });

        // SFX Sound Check Button (Phase 23)
        const testSfxBtn = document.getElementById('testSfxBtn');
        if (testSfxBtn) {
            testSfxBtn.addEventListener('click', () => {
                if (window.AudioEngine) {
                    if (window.AudioEngine.playWeaponFire) window.AudioEngine.playWeaponFire('sniper', 0, 0);
                    if (window.AudioEngine.playHitMarker) window.AudioEngine.playHitMarker(false);
                }
                if (this.game.renderer && this.game.renderer.triggerHitmarker) {
                    this.game.renderer.triggerHitmarker(false);
                }
            });
        }

        // Keybinding Re-mapping Suite (Phase 8E)
        this.renderKeybindsUI();
        const resetKeybindsBtn = document.getElementById('resetKeybindsBtn');
        if (resetKeybindsBtn) {
            resetKeybindsBtn.addEventListener('click', () => {
                if (this.game.input) {
                    this.game.input.resetKeybinds();
                    this.renderKeybindsUI();
                    this.showToast('KEYBINDINGS RESET TO DEFAULTS');
                }
            });
        }
    }

    renderKeybindsUI() {
        const container = document.getElementById('keybindsContainer');
        if (!container || !this.game.input) return;

        const actionLabels = {
            moveUp: 'FORWARD',
            moveDown: 'BACKWARD',
            moveLeft: 'STRAFE LEFT',
            moveRight: 'STRAFE RIGHT',
            dash: 'DASH',
            slide: 'SLIDE',
            parry: 'PARRY',
            reload: 'RELOAD',
            ultimate: 'SUPERNOVA ULT',
            ping: 'TACTICAL PING',
            cycleWeapon: 'CYCLE WEAPON',
            weapon1: 'WEAPON 1 [BLASTER]',
            weapon2: 'WEAPON 2 [SHOTGUN]',
            weapon3: 'WEAPON 3 [SNIPER]',
            weapon4: 'WEAPON 4 [VORTEX]',
            weapon5: 'WEAPON 5 [GLAIVE]'
        };

        container.innerHTML = '';
        const formatKey = (code) => {
            if (!code) return 'NONE';
            if (code.startsWith('Key')) return code.slice(3);
            if (code.startsWith('Digit')) return code.slice(5);
            return code;
        };

        for (let [action, label] of Object.entries(actionLabels)) {
            const row = document.createElement('div');
            row.className = 'keybind-row';

            const labelEl = document.createElement('span');
            labelEl.className = 'keybind-label';
            labelEl.textContent = label;

            const btn = document.createElement('button');
            btn.className = 'keybind-btn';
            btn.textContent = formatKey(this.game.input.keybinds[action]);

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.keybind-btn.listening').forEach(b => {
                    b.classList.remove('listening');
                    b.textContent = b.dataset.originalKey || b.textContent;
                });

                btn.dataset.originalKey = btn.textContent;
                btn.textContent = 'PRESS KEY...';
                btn.classList.add('listening');

                const captureHandler = (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    window.removeEventListener('keydown', captureHandler, true);

                    btn.classList.remove('listening');
                    if (ev.code === 'Escape') {
                        btn.textContent = btn.dataset.originalKey;
                        return;
                    }
                    this.game.input.setKeybind(action, ev.code);
                    btn.textContent = formatKey(ev.code);
                };

                window.addEventListener('keydown', captureHandler, { capture: true, once: true });
            });

            row.appendChild(labelEl);
            row.appendChild(btn);
            container.appendChild(row);
        }
    }

    saveSettings() {
        const settings = {
            master: parseInt(document.getElementById('masterVolSlider')?.value || 80),
            sfx: parseInt(document.getElementById('sfxVolSlider')?.value || 80),
            music: parseInt(document.getElementById('musicVolSlider')?.value || 50),
            sens: parseInt(document.getElementById('sensSlider')?.value || 100),
            shake: parseInt(document.getElementById('shakeSlider')?.value || 100),
            crosshair: this.game.renderer ? (this.game.renderer.crosshairStyle || 'cross') : 'cross',
            crosshairColor: this.game.renderer ? (this.game.renderer.crosshairColor || '#00f0ff') : '#00f0ff',
            fow: this.game.renderer ? this.game.renderer.fogOfWarEnabled : true,
            aimAssist: this.game.input ? this.game.input.aimAssistEnabled : true,
            resScale: parseFloat(document.getElementById('resScaleSelect')?.value || 1.0),
            particleDensity: document.getElementById('particleDensitySelect')?.value || 'full',
            haptics: this.game.input ? this.game.input.hapticsEnabled : true,
            damageNumbers: this.game.renderer ? (this.game.renderer.damageNumbersEnabled !== false) : true,
            crosshairReloadArc: this.game.renderer ? (this.game.renderer.crosshairReloadArcEnabled !== false) : true,
            mobileAutoFire: this.game.input ? (this.game.input.mobileAutoFire !== false) : true,
            leftHanded: this.game.input ? (this.game.input.leftHanded === true) : false,
            stickScale: this.game.input ? (this.game.input.stickScale || 1.0) : 1.0
        };
        try {
            localStorage.setItem('neon_clash_settings', JSON.stringify(settings));
        } catch (e) {}
    }

    updateCrosshairPreview() {
        const canvas = document.getElementById('crosshairPreviewCanvas');
        if (!canvas) return;
        const style = (this.game && this.game.renderer && this.game.renderer.crosshairStyle) || 'cross';
        const color = (this.game && this.game.renderer && this.game.renderer.crosshairColor) || '#00f0ff';
        if (typeof Renderer !== 'undefined' && Renderer.renderCrosshairPreview) {
            Renderer.renderCrosshairPreview(canvas, style, color);
        } else if (this.game && this.game.renderer && this.game.renderer.renderCrosshairPreview) {
            this.game.renderer.renderCrosshairPreview(canvas, style, color);
        }
    }

    loadSettings() {
        try {
            const raw = localStorage.getItem('neon_clash_settings');
            if (!raw) return;
            const s = JSON.parse(raw);
            if (s.master !== undefined && window.AudioEngine) {
                window.AudioEngine.setMasterVolume(s.master / 100);
                const el = document.getElementById('masterVolSlider');
                if (el) el.value = s.master;
                const valEl = document.getElementById('masterVolVal');
                if (valEl) valEl.textContent = `${s.master}%`;
            }
            if (s.sfx !== undefined && window.AudioEngine) {
                window.AudioEngine.setSfxVolume(s.sfx / 100);
                const el = document.getElementById('sfxVolSlider');
                if (el) el.value = s.sfx;
                const valEl = document.getElementById('sfxVolVal');
                if (valEl) valEl.textContent = `${s.sfx}%`;
            }
            if (s.music !== undefined && window.AudioEngine) {
                window.AudioEngine.setMusicVolume(s.music / 100);
                const el = document.getElementById('musicVolSlider');
                if (el) el.value = s.music;
                const valEl = document.getElementById('musicVolVal');
                if (valEl) valEl.textContent = `${s.music}%`;
            }
            if (s.sens !== undefined && this.game.input) {
                this.game.input.mouseSensitivity = s.sens / 100;
                const el = document.getElementById('sensSlider');
                if (el) el.value = s.sens;
                const valEl = document.getElementById('sensVal');
                if (valEl) valEl.textContent = `${(s.sens / 100).toFixed(1)}x`;
            }
            if (s.shake !== undefined && this.game.renderer) {
                this.game.renderer.shakeMultiplier = s.shake / 100;
                const el = document.getElementById('shakeSlider');
                if (el) el.value = s.shake;
                const valEl = document.getElementById('shakeVal');
                if (valEl) valEl.textContent = `${s.shake}%`;
            }
            if (s.crosshair && this.game.renderer) {
                this.game.renderer.crosshairStyle = s.crosshair;
                const btns = document.querySelectorAll('.crosshair-opt-btn');
                btns.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-style') === s.crosshair);
                });
            }
            if (s.crosshairColor && this.game.renderer) {
                this.game.renderer.crosshairColor = s.crosshairColor;
                const swatches = document.querySelectorAll('.color-swatch-btn');
                swatches.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-color') === s.crosshairColor);
                });
            }
            if (s.resScale !== undefined && this.game.renderer) {
                this.game.renderer.setResolutionScale(s.resScale);
                const resEl = document.getElementById('resScaleSelect');
                if (resEl) resEl.value = String(s.resScale);
            }
            if (s.particleDensity !== undefined && this.game.renderer) {
                this.game.renderer.particleDensity = s.particleDensity;
                const partEl = document.getElementById('particleDensitySelect');
                if (partEl) partEl.value = s.particleDensity;
            }
            if (s.fow !== undefined && this.game.renderer) {
                this.game.renderer.fogOfWarEnabled = s.fow;
                const btns = document.querySelectorAll('.fow-opt-btn');
                btns.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-fow') === String(s.fow));
                });
            }
            if (s.aimAssist !== undefined && this.game.input) {
                this.game.input.aimAssistEnabled = s.aimAssist;
                const btns = document.querySelectorAll('.assist-opt-btn');
                btns.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-assist') === String(s.aimAssist));
                });
            }
            // Mobile Overhaul: restore mobile fire mode / hand layout / stick size
            if (s.mobileAutoFire !== undefined && this.game.input) {
                this.game.input.mobileAutoFire = s.mobileAutoFire;
                const afBtns = document.querySelectorAll('.autofire-opt-btn');
                afBtns.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-autofire') === String(s.mobileAutoFire));
                });
            }
            if (s.leftHanded !== undefined && this.game.input) {
                this.game.input.leftHanded = s.leftHanded;
                document.body.classList.toggle('lefty-mode', s.leftHanded === true);
                const lhBtns = document.querySelectorAll('.lefty-opt-btn');
                lhBtns.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-lefty') === String(s.leftHanded === true));
                });
            }
            if (s.stickScale !== undefined && this.game.input) {
                this.game.input.stickScale = s.stickScale;
                const stickEl = document.getElementById('stickSizeSlider');
                if (stickEl) stickEl.value = Math.round(s.stickScale * 100);
                const stickVal = document.getElementById('stickSizeVal');
                if (stickVal) stickVal.textContent = `${Math.round(s.stickScale * 100)}%`;
            }
            if (s.haptics !== undefined && this.game.input) {
                this.game.input.hapticsEnabled = s.haptics;
                const hapticBtns = document.querySelectorAll('.haptic-opt-btn');
                hapticBtns.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-haptic') === String(s.haptics));
                });
            }
            if (s.damageNumbers !== undefined && this.game.renderer) {
                this.game.renderer.damageNumbersEnabled = s.damageNumbers;
                const dmgBtns = document.querySelectorAll('.damage-opt-btn');
                dmgBtns.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-enabled') === String(s.damageNumbers));
                });
            }
            if (s.crosshairReloadArc !== undefined && this.game.renderer) {
                this.game.renderer.crosshairReloadArcEnabled = s.crosshairReloadArc;
                const arcBtns = document.querySelectorAll('.reloadarc-opt-btn');
                arcBtns.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-enabled') === String(s.crosshairReloadArc));
                });
            }
            this.updateCrosshairPreview();
        } catch (e) {}
    }

    setupArmoryUI() {
        const armoryBtn = document.getElementById('armoryBtn');
        const armoryModal = document.getElementById('armoryModal');
        const closeArmoryBtn = document.getElementById('closeArmoryBtn');

        if (armoryBtn && armoryModal) {
            armoryBtn.addEventListener('click', () => {
                this.renderArmoryContent();
                armoryModal.classList.remove('hidden');
            });
        }

        if (closeArmoryBtn && armoryModal) {
            closeArmoryBtn.addEventListener('click', () => {
                armoryModal.classList.add('hidden');
                if (this.game.localPlayer && window.ProgressionManager) {
                    this.game.localPlayer.baseColor = window.ProgressionManager.getSelectedSkin().color;
                }
            });
        }
    }

    renderArmoryContent() {
        if (!window.ProgressionManager) return;
        const stats = window.ProgressionManager.getStats();

        const statsEl = document.getElementById('profileStatsCard');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-col">
                    <span class="stat-num">${stats.level}</span>
                    <span class="stat-lbl">${stats.title}</span>
                </div>
                <div class="stat-col">
                    <span class="stat-num">${stats.kills}</span>
                    <span class="stat-lbl">TOTAL KILLS</span>
                </div>
                <div class="stat-col">
                    <span class="stat-num">${stats.kd}</span>
                    <span class="stat-lbl">K/D RATIO</span>
                </div>
                <div class="stat-col">
                    <span class="stat-num">${stats.parries}</span>
                    <span class="stat-lbl">PARRIES</span>
                </div>
                <div class="stat-col">
                    <span class="stat-num">${stats.winrate}</span>
                    <span class="stat-lbl">WIN RATE</span>
                </div>
            `;
        }

        const masteryList = document.getElementById('weaponMasteryList');
        if (masteryList && typeof WEAPONS !== 'undefined') {
            masteryList.innerHTML = WEAPONS.map(w => {
                const mInfo = window.ProgressionManager.getWeaponMastery(w.id);
                const tier = mInfo ? mInfo.tier : { tier: 1, name: 'Standard' };
                const xp = mInfo ? mInfo.xp : 0;
                const kills = mInfo ? mInfo.kills : 0;
                const nextXp = tier.tier === 1 ? 500 : (tier.tier === 2 ? 1500 : 3000);
                const pct = Math.min(100, Math.round((xp / nextXp) * 100));

                let badgeColor = '#94a3b8';
                if (tier.tier === 2) badgeColor = '#38bdf8';
                else if (tier.tier === 3) badgeColor = '#f59e0b';

                return `
                    <div class="mastery-card">
                        <div class="mastery-header">
                            <span class="mastery-name" style="color: ${w.color}">${w.name}</span>
                            <span class="mastery-badge" style="color: ${badgeColor}; border-color: ${badgeColor}">TIER ${tier.tier}: ${tier.name.toUpperCase()}</span>
                        </div>
                        <div class="mastery-progress-bar">
                            <div class="mastery-fill" style="width: ${pct}%; background: ${badgeColor}"></div>
                        </div>
                        <div class="mastery-footer">
                            <span>${kills} KILLS</span>
                            <span>${xp} / ${nextXp} XP (${pct}%)</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        const skinsGrid = document.getElementById('skinsGrid');
        if (skinsGrid && typeof SKINS !== 'undefined') {
            skinsGrid.innerHTML = SKINS.map(s => {
                const isUnlocked = window.ProgressionManager.data.unlockedSkins.includes(s.id);
                const isSelected = window.ProgressionManager.data.selectedSkin === s.id;

                return `
                    <div class="skin-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}" data-skin-id="${s.id}">
                        <div class="skin-circle" style="background: ${s.color}; box-shadow: 0 0 12px ${s.color}"></div>
                        <div class="skin-info">
                            <div class="skin-title">${s.name}</div>
                            <div class="skin-req">${isUnlocked ? (isSelected ? 'EQUIPPED' : 'UNLOCKED') : s.desc}</div>
                        </div>
                    </div>
                `;
            }).join('');

            skinsGrid.querySelectorAll('.skin-card').forEach(card => {
                card.addEventListener('click', () => {
                    const skinId = card.getAttribute('data-skin-id');
                    if (window.ProgressionManager.selectSkin(skinId)) {
                        this.renderArmoryContent();
                    }
                });
            });
        }
    }

    updateHUD() {
        const game = this.game;

        // Player Level & Rank Badge or Spectator Tag
        const rankBadge = document.getElementById('playerRankBadge');
        if (rankBadge) {
            if (game.isSpectator) {
                rankBadge.textContent = '[SPECTATOR]';
                rankBadge.style.borderColor = '#ffb703';
                rankBadge.style.color = '#ffb703';
            } else if (window.ProgressionManager) {
                rankBadge.textContent = `LVL ${window.ProgressionManager.data.level} [${window.ProgressionManager.getTitle()}]`;
            }
        }

        // Player Vitals (Operative or Spectator Target)
        const targetP = game.localPlayer || (game.getSpectatorTarget ? game.getSpectatorTarget() : null);
        if (targetP) {
            const hpFill = document.getElementById('hudHpFill');
            const hpGhost = document.getElementById('hudHpGhost');
            const shieldFill = document.getElementById('hudShieldFill');
            const hpText = document.getElementById('hudHpText');
            const shieldText = document.getElementById('hudShieldText');

            const hpPct = Math.max(0, (targetP.health / targetP.maxHealth) * 100);
            if (hpFill) hpFill.style.width = `${hpPct}%`;
            if (hpGhost) hpGhost.style.width = `${hpPct}%`;
            if (shieldFill) shieldFill.style.width = `${Math.max(0, (targetP.shield / targetP.maxShield) * 100)}%`;
            if (hpText) hpText.textContent = `${Math.round(targetP.health)} / 100`;
            if (shieldText) shieldText.textContent = `${Math.round(targetP.shield)} / 50`;

            const energyFill = document.getElementById('hudEnergyFill');
            if (energyFill) energyFill.style.width = `${Math.max(0, (targetP.energy / targetP.maxEnergy) * 100)}%`;

            // Ultimate Charge HUD Display
            const ult = Math.round(targetP.ultimateCharge || 0);
            const ultFill = document.getElementById('hudUltFill');
            const ultText = document.getElementById('hudUltText');
            if (ultFill) {
                ultFill.style.width = `${ult}%`;
                ultFill.classList.toggle('ready', ult >= 100);
            }
            if (ultText) {
                ultText.textContent = ult >= 100 ? 'READY [F]' : `${ult}%`;
                ultText.style.color = ult >= 100 ? '#ffb703' : '#00f0ff';
            }
            const superBtn = document.getElementById('mobileSuperBtn');
            if (superBtn) {
                superBtn.classList.toggle('ready', ult >= 100);
            }

            // Buff Badges (Overdrive, Phase Shift, Spawn Shield)
            const buffContainer = document.getElementById('buffContainer');
            if (buffContainer) {
                const buffs = [];
                if (targetP.overdriveTimer > 0) {
                    buffs.push({
                        name: 'OVERDRIVE',
                        time: targetP.overdriveTimer.toFixed(1) + 's',
                        pct: Math.min(100, (targetP.overdriveTimer / 10) * 100),
                        color: '#ef4444'
                    });
                }
                if (targetP.phaseTimer > 0) {
                    buffs.push({
                        name: 'PHASE SHIFT',
                        time: targetP.phaseTimer.toFixed(1) + 's',
                        pct: Math.min(100, (targetP.phaseTimer / 5) * 100),
                        color: '#d946ef'
                    });
                }
                if (targetP.spawnProtectionTimer > 0) {
                    buffs.push({
                        name: 'SPAWN SHIELD',
                        time: targetP.spawnProtectionTimer.toFixed(1) + 's',
                        pct: Math.min(100, (targetP.spawnProtectionTimer / 1.5) * 100),
                        color: '#00f0ff'
                    });
                }

                const buffKey = buffs.map(b => `${b.name}:${b.time}`).join('|');
                if (this._lastBuffKey !== buffKey) {
                    this._lastBuffKey = buffKey;
                    buffContainer.innerHTML = buffs.map(b => `
                        <div class="buff-badge" style="border-color: ${b.color}; color: ${b.color};">
                            <div class="buff-badge-header">
                                <span class="buff-badge-name">${b.name}</span>
                                <span class="buff-badge-time">${b.time}</span>
                            </div>
                            <div class="buff-timer-track">
                                <div class="buff-timer-fill" style="width: ${b.pct}%; background-color: ${b.color};"></div>
                            </div>
                        </div>
                    `).join('');
                }
            }

            const weaponSlots = document.querySelectorAll('.weapon-slot');
            weaponSlots.forEach((slot, idx) => {
                if (idx === targetP.selectedWeaponIndex) {
                    slot.classList.add('active');
                } else {
                    slot.classList.remove('active');
                }
            });

            // Tactical Magazine Ammo Update
            const ammoCurEl = document.getElementById('hudAmmoCur');
            const ammoMaxEl = document.getElementById('hudAmmoMax');
            const ammoStatusEl = document.getElementById('hudAmmoStatus');
            if (ammoCurEl && ammoMaxEl && targetP.ammo) {
                const wepIdx = targetP.selectedWeaponIndex;
                const wep = (typeof WEAPONS !== 'undefined' && WEAPONS[wepIdx]) ? WEAPONS[wepIdx] : { magSize: 20 };
                const cur = targetP.ammo[wepIdx] !== undefined ? targetP.ammo[wepIdx] : (wep.magSize || 20);
                const max = wep.magSize || 20;
                ammoCurEl.textContent = cur;
                ammoMaxEl.textContent = max;
                if (ammoStatusEl) {
                    if (targetP.isReloading) {
                        ammoStatusEl.textContent = 'RELOADING...';
                        ammoStatusEl.className = 'ammo-status reloading';
                    } else if (cur === 0) {
                        ammoStatusEl.textContent = 'EMPTY [R]';
                        ammoStatusEl.className = 'ammo-status empty';
                    } else if (cur <= Math.ceil(max * 0.25)) {
                        ammoStatusEl.textContent = 'LOW AMMO';
                        ammoStatusEl.className = 'ammo-status low';
                    } else {
                        ammoStatusEl.textContent = 'READY';
                        ammoStatusEl.className = 'ammo-status';
                    }
                }
            }
        }

        // Killfeed list update (dirty-checked to eliminate 144Hz/240Hz DOM thrashing)
        const killfeedEl = document.getElementById('killfeedList');
        if (killfeedEl && game.gameMode) {
            const kf = game.gameMode.killfeed;
            const kfLen = kf.length;
            const lastTimestamp = kfLen > 0 ? (kf[kfLen - 1].time || kfLen) : 0;
            const kfKey = `${kfLen}_${lastTimestamp}`;
            if (this._lastKillfeedKey !== kfKey) {
                this._lastKillfeedKey = kfKey;
                killfeedEl.innerHTML = kf.map(k => `
                    <div class="killfeed-item">
                        <span style="color: ${k.killerColor}">${k.killerName}</span>
                        <span class="killfeed-weapon">${k.weapon}</span>
                        <span class="killfeed-dist">${k.distance ? k.distance + 'm' : ''}</span>
                        <span style="color: ${k.victimColor}">${k.victimName}</span>
                    </div>
                `).join('');
            }
        }

        // Match Score Display
        const scoreEl = document.getElementById('scoreDisplay');
        if (scoreEl && game.gameMode) {
            const targetP = game.localPlayer || game.getSpectatorTarget();
            if (game.gameMode.mode === 'GUN_GAME') {
                const tier = (targetP && typeof targetP.gunGameTier !== 'undefined') ? targetP.gunGameTier : 0;
                const wepIdx = targetP ? targetP.selectedWeaponIndex : 0;
                const weaponName = (typeof WEAPONS !== 'undefined' && WEAPONS[wepIdx]) ? WEAPONS[wepIdx].name : 'Blaster';
                scoreEl.innerHTML = `GUN GAME: <strong>TIER ${tier + 1}/5</strong> [${weaponName}]`;
            } else if (game.gameMode.mode === 'ZONE_CONTROL') {
                const status = game.gameMode.zone.contested ? 'CONTESTED' : (game.gameMode.zone.owner ? game.gameMode.zone.owner.toUpperCase() : 'NEUTRAL');
                scoreEl.innerHTML = `ZONE: <strong>${status}</strong> | <span style="color:#3b82f6">BLUE ${game.gameMode.teamScores.blue}</span> : <span style="color:#ef4444">${game.gameMode.teamScores.red} RED</span>`;
            } else if (game.gameMode.mode === 'TDM') {
                scoreEl.innerHTML = `<span style="color:#3b82f6">BLUE ${game.gameMode.teamScores.blue}</span> : <span style="color:#ef4444">${game.gameMode.teamScores.red} RED</span>`;
            } else {
                const kills = game.localPlayer ? game.localPlayer.kills : (targetP ? targetP.kills : 0);
                scoreEl.innerHTML = `${game.isSpectator ? 'LEADER' : 'KILLS'}: <strong>${kills}</strong> / ${game.gameMode.scoreLimit}`;
            }
        }

        // Ping Telemetry Display
        const pingBadge = document.getElementById('pingCounter');
        if (pingBadge && game.network) {
            if (game.network.isOnline) {
                if (game.network.isHost) {
                    pingBadge.textContent = 'HOST';
                    pingBadge.style.color = '#00f0ff';
                    pingBadge.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                } else {
                    const p = game.network.ping || 1;
                    pingBadge.textContent = `${p} ms`;
                    if (p < 60) {
                        pingBadge.style.color = '#10b981';
                        pingBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    } else if (p < 120) {
                        pingBadge.style.color = '#ffb703';
                        pingBadge.style.borderColor = 'rgba(255, 183, 3, 0.4)';
                    } else {
                        pingBadge.style.color = '#ef4444';
                        pingBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                    }
                }
            } else {
                pingBadge.textContent = 'LOCAL';
                pingBadge.style.color = '#94a3b8';
                pingBadge.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }
        }

        // Game Over Banner & XP Award
        const gameOverModal = document.getElementById('gameOverModal');
        if (game.gameMode && game.gameMode.isMatchOver && (!game.gameMode.victorySlowTimer || game.gameMode.victorySlowTimer <= 0) && gameOverModal) {
            gameOverModal.classList.remove('hidden');
            const winnerEl = document.getElementById('winnerText');
            if (winnerEl) winnerEl.textContent = game.gameMode.winner;

            if (!game.hasRecordedMatch && !game.isSpectator && game.localPlayer && window.ProgressionManager) {
                game.hasRecordedMatch = true;
                const isWin = game.gameMode.winner && (
                    game.gameMode.winner.includes(game.localPlayer.name) ||
                    ((game.gameMode.mode === 'TDM' || game.gameMode.mode === 'ZONE_CONTROL') && game.localPlayer.team && game.gameMode.winner.includes(game.localPlayer.team.toUpperCase()))
                );

                const res = window.ProgressionManager.recordMatch(
                    game.localPlayer.kills,
                    game.localPlayer.deaths,
                    game.localPlayer.parriesCount || 0,
                    isWin,
                    game.localPlayer.score
                );

                this.renderPostMatchSummary(res);
            }
        }
    }

    renderPostMatchSummary(res) {
        const summaryEl = document.getElementById('postMatchSummary');
        if (!summaryEl) return;

        const sortedPlayers = this.game.players.slice().sort((a, b) => b.score - a.score);
        const mvp = sortedPlayers[0] || this.game.localPlayer || { name: 'Operator', score: 0, kills: 0, title: 'Operative' };
        const localStats = this.game.localPlayer || { kills: 0, deaths: 0, parriesCount: 0, powerUpsCollected: 0 };
        const kd = localStats.deaths === 0 ? localStats.kills.toFixed(1) : (localStats.kills / localStats.deaths).toFixed(1);

        summaryEl.innerHTML = `
            <div class="mvp-award-banner">
                <div class="mvp-title-tag">MATCH MVP</div>
                <div class="mvp-name-row">
                    <span class="mvp-name" style="color: ${mvp.baseColor || '#ffb703'};">${mvp.name}</span>
                    <span class="mvp-score">${mvp.score} PTS</span>
                </div>
                <div class="mvp-subtext">OPERATOR [${mvp.title || 'APEX OPERATIVE'}] // ${mvp.kills} ELIMINATIONS</div>
            </div>

            <div class="combat-stats-grid">
                <div class="combat-stat-card">
                    <div class="combat-stat-val" style="color: #00f0ff;">${localStats.kills}</div>
                    <div class="combat-stat-lbl">KILLS</div>
                </div>
                <div class="combat-stat-card">
                    <div class="combat-stat-val" style="color: #ef4444;">${localStats.deaths}</div>
                    <div class="combat-stat-lbl">DEATHS</div>
                </div>
                <div class="combat-stat-card">
                    <div class="combat-stat-val" style="color: #ffb703;">${kd}</div>
                    <div class="combat-stat-lbl">K/D RATIO</div>
                </div>
                <div class="combat-stat-card">
                    <div class="combat-stat-val" style="color: #a855f7;">${localStats.parriesCount || 0}</div>
                    <div class="combat-stat-lbl">PARRIES</div>
                </div>
                <div class="combat-stat-card">
                    <div class="combat-stat-val" style="color: #10b981;">${localStats.powerUpsCollected || 0}</div>
                    <div class="combat-stat-lbl">POWER-UPS</div>
                </div>
                <div class="combat-stat-card">
                    <div class="combat-stat-val" style="color: #38bdf8;">+${res.gainedXP}</div>
                    <div class="combat-stat-lbl">XP GAINED</div>
                </div>
            </div>

            <div class="xp-reward-box">
                <div class="level-progress-row">
                    <span class="level-tag">LVL ${res.newLevel}</span>
                    <span class="rank-tag">${window.ProgressionManager.getTitle()}</span>
                </div>
                <div class="bar-track" style="margin-top: 8px; height: 8px;">
                    <div class="bar-fill" style="width: ${(res.currentXP / res.neededXP) * 100}%; background: var(--neon-cyan);"></div>
                </div>
                <div class="xp-subtext">${res.currentXP} / ${res.neededXP} XP to Level ${res.newLevel + 1}</div>
                ${res.leveledUp ? '<div class="level-up-badge">LEVEL UP ACHIEVED</div>' : ''}
                ${res.newUnlocks.length > 0 ? `<div class="unlock-badge">NEW SKIN UNLOCKED: ${res.newUnlocks.map(u => u.name).join(', ')}</div>` : ''}
            </div>
        `;

        if (res.leveledUp && window.AudioEngine) {
            window.AudioEngine.playKillstreak();
        }
    }

    showToast(msg) {
        const toast = document.getElementById('toastNotification');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.remove('hidden');
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2800);
    }

    checkUrlParams() {
        try {
            const params = new URLSearchParams(window.location.search);
            const room = params.get('room');
            if (room) {
                const clean = room.trim().toUpperCase().slice(0, 4);
                const joinInput = document.getElementById('joinCodeInput');
                if (joinInput) joinInput.value = clean;
                this.showToast(`ROOM INVITE DETECTED: [${clean}]`);
            }
        } catch (e) {}
    }

    renderQrCode(code) {
        const canvas = document.getElementById('qrCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const size = 140;
        ctx.clearRect(0, 0, size, size);

        // Background
        ctx.fillStyle = '#06080e';
        ctx.fillRect(0, 0, size, size);

        const modules = 21; // Standard Version 1 QR matrix size
        const cellSize = Math.floor((size - 16) / modules);
        const offsetX = Math.floor((size - (cellSize * modules)) / 2);
        const offsetY = Math.floor((size - (cellSize * modules)) / 2);

        // Helper to draw Finder Pattern (7x7)
        const drawFinder = (r, c) => {
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize * 7, cellSize * 7);
            ctx.fillStyle = '#06080e';
            ctx.fillRect(offsetX + (c + 1) * cellSize, offsetY + (r + 1) * cellSize, cellSize * 5, cellSize * 5);
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(offsetX + (c + 2) * cellSize, offsetY + (r + 2) * cellSize, cellSize * 3, cellSize * 3);
        };

        drawFinder(0, 0); // Top-left
        drawFinder(0, modules - 7); // Top-right
        drawFinder(modules - 7, 0); // Bottom-left

        // Pseudo-random deterministic hash from room URL
        let hash = 0;
        const fullStr = `${window.location.origin}${window.location.pathname}?room=${code}`;
        for (let i = 0; i < fullStr.length; i++) {
            hash = ((hash << 5) - hash) + fullStr.charCodeAt(i);
            hash |= 0;
        }

        // Draw deterministic matrix data modules
        ctx.fillStyle = '#00f0ff';
        for (let r = 0; r < modules; r++) {
            for (let c = 0; c < modules; c++) {
                if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) {
                    continue;
                }
                if (r === 6 || c === 6) {
                    if ((r + c) % 2 === 0) {
                        ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize - 1, cellSize - 1);
                    }
                    continue;
                }
                const bit = Math.abs(Math.sin(hash * (r * modules + c + 1))) > 0.52;
                if (bit) {
                    ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize - 1, cellSize - 1);
                }
            }
        }
    }
}

window.UIManager = UIManager;
