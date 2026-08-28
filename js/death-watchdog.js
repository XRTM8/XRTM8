(function installDeathWatchdog(root) {
    'use strict';

    function checkDeathState() {
        const bridge = root.ChronoDeathBridge;
        if (!bridge || typeof bridge.tick !== 'function') return;
        try {
            bridge.tick();
        } catch (error) {
            // Keep the watchdog alive; the next tick retries the UI recovery path.
        }
    }

    root.setInterval(checkDeathState, 100);
    root.addEventListener('error', checkDeathState);
    root.addEventListener('unhandledrejection', checkDeathState);
    root.addEventListener('pageshow', checkDeathState);
})(typeof globalThis !== 'undefined' ? globalThis : window);
