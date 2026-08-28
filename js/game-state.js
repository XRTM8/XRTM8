(function initChronoGameState(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.ChronoGameState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGameStateApi() {
    'use strict';

    const RESPAWN_DELAY_MS = 3000;
    const PVE_REVIVE_DURATION_MS = 5000;

    function finiteNumber(value, fallback) {
        return Number.isFinite(Number(value)) ? Number(value) : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, finiteNumber(value, min)));
    }

    function applyPvpHit(currentState, hit) {
        const maxHp = Math.max(1, finiteNumber(currentState && currentState.maxHp, 100));
        const hp = clamp(currentState && currentState.hp, 0, maxHp);
        const shieldCharges = Math.max(0, Math.floor(finiteNumber(currentState && currentState.shieldCharges, 0)));
        const rawDamage = finiteNumber(hit && hit.damage, 35);
        const damage = clamp(rawDamage, 8, 60);

        if (shieldCharges > 0) {
            return {
                hp,
                maxHp,
                shieldCharges: shieldCharges - 1,
                damageApplied: 0,
                shieldAbsorbed: true,
                fatal: false
            };
        }

        const nextHp = Math.max(0, hp - damage);
        return {
            hp: nextHp,
            maxHp,
            shieldCharges: 0,
            damageApplied: hp - nextHp,
            shieldAbsorbed: false,
            fatal: nextHp <= 0
        };
    }

    function createRespawnState(currentState, serverState) {
        const maxHp = Math.max(1, finiteNumber(
            serverState && (serverState.maxHp ?? serverState.maxHealth),
            currentState && currentState.maxHp ? currentState.maxHp : 100
        ));
        const maxShield = Math.max(0, Math.floor(finiteNumber(
            serverState && (serverState.maxShield ?? serverState.shield),
            currentState && (currentState.shieldMaxCharges ?? currentState.shieldLevel) || 1
        )));

        return {
            x: finiteNumber(serverState && serverState.x, currentState && currentState.x || 4000),
            y: finiteNumber(serverState && serverState.y, currentState && currentState.y || 4000),
            vx: 0,
            vy: 0,
            hp: clamp(serverState && (serverState.hp ?? serverState.health), 1, maxHp),
            maxHp,
            shieldCharges: maxShield,
            shieldMaxCharges: maxShield,
            invulnerableTimer: Math.max(1000, finiteNumber(serverState && serverState.invulnerableMs, 3000)),
            isKnockedDown: false,
            isEliminated: false
        };
    }

    function shouldShowGameOver(state) {
        if (!state) return false;
        if (state.mode === 'online_pvp' && state.awaitingRespawn) return false;
        if (state.mode === 'online_pve' || state.mode === 'online_coop') {
            return state.hp <= 0 && !state.hasAliveTeammates;
        }
        return state.hp <= 0;
    }

    return Object.freeze({
        RESPAWN_DELAY_MS,
        PVE_REVIVE_DURATION_MS,
        applyPvpHit,
        createRespawnState,
        shouldShowGameOver
    });
});
