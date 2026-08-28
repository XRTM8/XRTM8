(function initChronoUI(root) {
    'use strict';

    function getElement(target) {
        return typeof target === 'string' ? document.getElementById(target) : target;
    }

    function showOverlay(target, zIndex) {
        const element = getElement(target);
        if (!element) return false;
        element.classList.remove('hidden');
        element.removeAttribute('inert');
        element.setAttribute('aria-hidden', 'false');
        element.style.setProperty('display', 'flex', 'important');
        element.style.setProperty('visibility', 'visible', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('pointer-events', 'auto', 'important');
        if (zIndex) element.style.setProperty('z-index', String(zIndex), 'important');
        const focusTarget = element.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (focusTarget) window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 30);
        return true;
    }

    function hideOverlay(target) {
        const element = getElement(target);
        if (!element) return false;
        element.classList.add('hidden');
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('inert', '');
        element.style.setProperty('display', 'none', 'important');
        return true;
    }

    function announce(message) {
        const region = document.getElementById('game-live-region');
        if (!region) return;
        region.textContent = '';
        window.setTimeout(() => { region.textContent = message || ''; }, 10);
    }

    function installAccessibility() {
        if (!document.body) return;
        let liveRegion = document.getElementById('game-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'game-live-region';
            liveRegion.className = 'sr-only';
            liveRegion.setAttribute('aria-live', 'assertive');
            liveRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(liveRegion);
        }

        const gameOver = document.getElementById('game-over-screen');
        if (gameOver) {
            gameOver.setAttribute('role', 'dialog');
            gameOver.setAttribute('aria-modal', 'true');
            gameOver.setAttribute('aria-labelledby', 'game-over-title');
        }
        const respawn = document.getElementById('pvp-respawn-modal');
        if (respawn) {
            respawn.setAttribute('role', 'dialog');
            respawn.setAttribute('aria-modal', 'true');
            respawn.setAttribute('aria-labelledby', 'respawn-title');
        }
        const killFeed = document.getElementById('online-kill-feed');
        if (killFeed) killFeed.setAttribute('aria-live', 'polite');

        const controlLabels = [
            ['joystick-base', 'عصا حركة المركبة'],
            ['joystick-aim-base', 'عصا التصويب وإطلاق النار'],
            ['pause-btn-hud', 'إيقاف اللعبة مؤقتاً']
        ];
        controlLabels.forEach(([id, label]) => {
            const element = document.getElementById(id);
            if (!element) return;
            element.setAttribute('role', 'button');
            element.setAttribute('aria-label', label);
        });

        document.querySelectorAll('button').forEach(button => {
            if (!button.getAttribute('type')) button.setAttribute('type', 'button');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installAccessibility, { once: true });
    } else {
        installAccessibility();
    }

    root.ChronoUI = Object.freeze({ showOverlay, hideOverlay, announce, installAccessibility });
})(typeof globalThis !== 'undefined' ? globalThis : window);
