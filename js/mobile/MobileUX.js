/**
 * MobileUX.js
 * Mobile & PWA experience layer:
 * 1. Service Worker registration (installable + offline play).
 * 2. Custom "Install App" button (Android beforeinstallprompt + iOS instructions).
 * 3. Match-mode tracking: Wake Lock (screen stays on) + Fullscreen during matches.
 * 4. iOS Safari gesture blocking (pinch-zoom, double-tap zoom).
 * 5. Low-end device detection → sane defaults (low particles).
 *
 * Zero dependencies; listens to the lobby modal so it works across
 * every match-start/exit path (solo, host, join, spectator, disconnect...).
 */
(function () {
    const MobileUX = {
        deferredInstallPrompt: null,
        isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        isTouchDevice: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            window.navigator.standalone === true,
        wakeLock: null,
        matchActive: false,
        fullscreenRetryBound: false,

        init() {
            this.registerServiceWorker();
            this.setupInstallPrompt();
            this.setupMatchModeTracking();
            this.setupGestureBlocking();
            this.setupWakeLockRecovery();
            this.applyLowEndDefaults();
        },

        // --- 1. Service Worker ---
        registerServiceWorker() {
            if (!('serviceWorker' in navigator)) return;
            // SW requires a secure context (https or localhost)
            if (!window.isSecureContext) return;
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js').catch((err) => {
                    console.warn('[MobileUX] SW registration failed:', err);
                });
            });
        },

        // --- 2. Install Prompt ---
        setupInstallPrompt() {
            const btn = document.getElementById('installAppBtn');
            if (!btn) return;

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault(); // Take control of the native mini-infobar
                this.deferredInstallPrompt = e;
                this.showInstallButton();
            });

            window.addEventListener('appinstalled', () => {
                this.deferredInstallPrompt = null;
                btn.classList.add('hidden');
                this.toast('GAME INSTALLED // اللعبة مثبتة على جهازك');
            });

            // iOS Safari never fires beforeinstallprompt → show manual guide button
            if (this.isIOS && !this.isStandalone) {
                const label = document.getElementById('installAppBtnLabel');
                if (label) label.textContent = 'INSTALL ON IOS (SHARE → ADD TO HOME SCREEN)';
                this.showInstallButton();
            }

            btn.addEventListener('click', () => this.handleInstallClick());
        },

        showInstallButton() {
            const btn = document.getElementById('installAppBtn');
            if (btn && !this.isStandalone) btn.classList.remove('hidden');
        },

        async handleInstallClick() {
            if (this.deferredInstallPrompt) {
                this.deferredInstallPrompt.prompt();
                try {
                    const choice = await this.deferredInstallPrompt.userChoice;
                    if (choice && choice.outcome === 'accepted') {
                        this.toast('INSTALLING... // جاري التثبيت');
                    }
                } catch (e) { /* user dismissed */ }
                this.deferredInstallPrompt = null;
                return;
            }
            if (this.isIOS) {
                this.toast('iOS: زر المشاركة ⤴ ثم «Add to Home Screen» // Share → Add to Home Screen', 6000);
                return;
            }
            this.toast('OPEN BROWSER MENU → "INSTALL APP" / "ADD TO HOME SCREEN"');
        },

        toast(msg, duration = 4000) {
            if (window.game && window.game.showToast) {
                window.game.showToast(msg);
                return;
            }
            const el = document.getElementById('toastNotification');
            if (!el) return;
            el.textContent = msg;
            el.classList.remove('hidden');
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
        },

        // --- 3. Match-Mode Tracking (lobby hidden ⇔ match running) ---
        setupMatchModeTracking() {
            const lobby = document.getElementById('lobbyModal');
            if (!lobby || typeof MutationObserver === 'undefined') {
                // Fallback: game not bootstrapped yet; nothing to track
                return;
            }
            const apply = () => {
                const inMatch = lobby.classList.contains('hidden');
                if (inMatch === this.matchActive) return;
                this.matchActive = inMatch;
                document.body.classList.toggle('match-active', inMatch);
                if (inMatch) this.enterMatchMode();
                else this.exitMatchMode();
            };
            new MutationObserver(apply).observe(lobby, { attributes: true, attributeFilter: ['class'] });
            apply(); // Initial state (lobby visible → match inactive)
        },

        enterMatchMode() {
            this.requestFullscreen();
            this.requestWakeLock();
        },

        exitMatchMode() {
            this.releaseWakeLock();
            this.exitFullscreen();
        },

        requestFullscreen() {
            // Only worth forcing on phones/tablets; desktop users keep their window.
            const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 900;
            if (!this.isTouchDevice || !smallScreen || this.isStandalone) return;
            if (document.fullscreenElement) return;

            const el = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (!req) return;

            try {
                const p = req.call(el);
                if (p && p.catch) {
                    p.catch(() => this.scheduleFullscreenRetry());
                }
            } catch (e) {
                this.scheduleFullscreenRetry();
            }
        },

        scheduleFullscreenRetry() {
            // Fullscreen usually needs a direct user gesture — retry once on next tap.
            if (this.fullscreenRetryBound) return;
            this.fullscreenRetryBound = true;
            const retry = () => {
                this.fullscreenRetryBound = false;
                if (this.matchActive && !document.fullscreenElement) {
                    const el = document.documentElement;
                    const req = el.requestFullscreen || el.webkitRequestFullscreen;
                    if (req) { try { req.call(el).catch(() => {}); } catch (e) {} }
                }
            };
            window.addEventListener('pointerup', retry, { once: true });
            window.addEventListener('touchend', retry, { once: true });
        },

        exitFullscreen() {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        },

        async requestWakeLock() {
            if (!('wakeLock' in navigator)) return;
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.wakeLock.addEventListener('release', () => { this.wakeLock = null; });
            } catch (e) {
                this.wakeLock = null;
            }
        },

        releaseWakeLock() {
            if (this.wakeLock) {
                try { this.wakeLock.release(); } catch (e) {}
                this.wakeLock = null;
            }
        },

        setupWakeLockRecovery() {
            // Wake locks auto-release when the tab hides; reclaim on return mid-match.
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && this.matchActive) {
                    this.requestWakeLock();
                }
            });
        },

        // --- 4. iOS Gesture Blocking ---
        setupGestureBlocking() {
            // iOS Safari pinch-zoom (legacy gesture events)
            document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
            document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
            // Double-tap zoom fallback on older iOS versions
            let lastTap = 0;
            document.addEventListener('touchend', (e) => {
                const now = performance.now();
                if (now - lastTap < 310 && !e.target.closest('.scrollable-ui')) {
                    e.preventDefault();
                }
                lastTap = now;
            }, { passive: false });
        },

        // --- 5. Low-End Defaults ---
        applyLowEndDefaults() {
            // Only for users who never saved settings — never override a choice.
            if (localStorage.getItem('neon_clash_settings')) return;
            if (!this.isTouchDevice) return;

            const weakCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
            const weakRAM = navigator.deviceMemory && navigator.deviceMemory <= 4;
            if (!weakCPU && !weakRAM) return;

            const applyWhenReady = () => {
                if (!window.game || !window.game.renderer) {
                    return setTimeout(applyWhenReady, 250);
                }
                window.game.renderer.particleDensity = 'low';
                const partEl = document.getElementById('particleDensitySelect');
                if (partEl) partEl.value = 'low';
                // Performance Overhaul: weak devices start on the reduced effects tier
                // (the governor can still restore it if FPS stays high)
                if (window.game.renderer.setPerfTier) window.game.renderer.setPerfTier(1);
            };
            window.addEventListener('load', applyWhenReady);
        }
    };

    window.MobileUX = MobileUX;
    window.addEventListener('DOMContentLoaded', () => MobileUX.init());
})();
