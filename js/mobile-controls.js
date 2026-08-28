(function initChronoMobileControls(root) {
    'use strict';

    function updateViewportMetrics() {
        const viewport = window.visualViewport;
        const viewportHeight = viewport ? viewport.height : window.innerHeight;
        const viewportWidth = viewport ? viewport.width : window.innerWidth;
        const coarse = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
        document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
        document.documentElement.style.setProperty('--app-width', `${Math.round(viewportWidth)}px`);
        document.documentElement.style.setProperty('--touch-scale', viewportWidth < 430 ? '0.9' : '1');
        document.body.classList.toggle('coarse-pointer', coarse);
        document.body.classList.toggle('compact-height', viewportHeight < 560);
    }

    function releaseControls() {
        if (typeof root.resetJoystick === 'function') root.resetJoystick();
        if (typeof root.resetAimJoystick === 'function') root.resetAimJoystick();
    }

    function preventGesture(event) {
        if (event.cancelable) event.preventDefault();
    }

    window.addEventListener('resize', updateViewportMetrics, { passive: true });
    window.addEventListener('orientationchange', updateViewportMetrics, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            updateViewportMetrics();
            if (typeof root.resize === 'function') root.resize();
        }, { passive: true });
    }
    window.addEventListener('blur', releaseControls, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) releaseControls();
    });
    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('gestureend', preventGesture, { passive: false });
    document.addEventListener('contextmenu', event => {
        if (event.target && event.target.closest('#gameCanvas, #touch-controls-container')) preventGesture(event);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateViewportMetrics, { once: true });
    } else {
        updateViewportMetrics();
    }

    root.ChronoMobileControls = Object.freeze({ updateViewportMetrics, releaseControls });
})(typeof globalThis !== 'undefined' ? globalThis : window);
