(function initChronoMultiplayer(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.ChronoMultiplayer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createMultiplayerApi() {
    'use strict';

    function finiteNumber(value, fallback) {
        return Number.isFinite(Number(value)) ? Number(value) : fallback;
    }

    function cleanText(value, fallback, maxLength) {
        const text = typeof value === 'string' ? value.trim() : '';
        return (text || fallback).slice(0, maxLength);
    }

    function normalizePlayer(rawPlayer, existingPlayer) {
        const raw = rawPlayer || {};
        const existing = existingPlayer || {};
        const x = finiteNumber(raw.x, finiteNumber(existing.targetX, finiteNumber(existing.x, 4000)));
        const y = finiteNumber(raw.y, finiteNumber(existing.targetY, finiteNumber(existing.y, 4000)));
        const health = finiteNumber(raw.health ?? raw.hp, finiteNumber(existing.health ?? existing.hp, 100));
        const maxHealth = Math.max(1, finiteNumber(raw.maxHealth ?? raw.maxHp, finiteNumber(existing.maxHealth ?? existing.maxHp, 100)));

        return {
            ...existing,
            ...raw,
            id: cleanText(raw.id || existing.id, '', 80),
            username: cleanText(raw.username || existing.username, 'Agent', 20),
            chassis: cleanText(raw.chassis || existing.chassis, 'assault', 20),
            weapon: cleanText(raw.weapon || existing.weapon, 'blaster', 40),
            skin: cleanText(raw.skin || existing.skin, 'default', 60),
            x: finiteNumber(existing.x, x),
            y: finiteNumber(existing.y, y),
            targetX: x,
            targetY: y,
            facingAngle: finiteNumber(existing.facingAngle, finiteNumber(raw.facingAngle ?? raw.angle, 0)),
            targetFacingAngle: finiteNumber(raw.facingAngle ?? raw.angle, finiteNumber(existing.targetFacingAngle, 0)),
            vx: finiteNumber(raw.vx, finiteNumber(existing.vx, 0)),
            vy: finiteNumber(raw.vy, finiteNumber(existing.vy, 0)),
            health,
            hp: health,
            maxHealth,
            maxHp: maxHealth,
            shield: Math.max(0, finiteNumber(raw.shield, finiteNumber(existing.shield, 0))),
            radius: Math.max(12, finiteNumber(raw.radius, finiteNumber(existing.radius, 18))),
            score: Math.max(0, finiteNumber(raw.score, finiteNumber(existing.score, 0))),
            kills: Math.max(0, finiteNumber(raw.kills, finiteNumber(existing.kills, 0))),
            deaths: Math.max(0, finiteNumber(raw.deaths, finiteNumber(existing.deaths, 0))),
            isDead: Boolean(raw.isDead),
            lastSeenAt: Date.now()
        };
    }

    function createPlayerUpdate(player, options) {
        if (!player) return null;
        const extra = options || {};
        return {
            x: Math.round(finiteNumber(player.x, 4000)),
            y: Math.round(finiteNumber(player.y, 4000)),
            vx: Number(finiteNumber(player.vx, 0).toFixed(2)),
            vy: Number(finiteNumber(player.vy, 0).toFixed(2)),
            facingAngle: Number(finiteNumber(player.facingAngle, 0).toFixed(3)),
            health: Math.max(0, finiteNumber(player.hp, 0)),
            maxHealth: Math.max(1, finiteNumber(player.maxHp, 100)),
            shield: Math.max(0, finiteNumber(player.shieldCharges, 0)),
            maxShield: Math.max(0, finiteNumber(player.shieldMaxCharges, 0)),
            chassis: cleanText(player.chassis, 'assault', 20),
            weapon: cleanText(player.weapon, 'blaster', 40),
            skin: cleanText(extra.skin, 'default', 60),
            overchargeActive: Boolean(player.overchargeActive),
            isDashing: finiteNumber(player.dashInvulnerableTimer, 0) > 0,
            sprintActive: finiteNumber(player.sprintTimer, 0) > 0,
            isFiringUlt: Boolean(player.isFiringUlt),
            isDead: Boolean(extra.isDead),
            score: Math.max(0, Math.floor(finiteNumber(extra.score, 0))),
            kills: Math.max(0, Math.floor(finiteNumber(extra.kills, 0)))
        };
    }

    return Object.freeze({ normalizePlayer, createPlayerUpdate });
});
