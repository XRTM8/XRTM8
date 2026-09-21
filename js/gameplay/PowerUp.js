/**
 * PowerUp.js
 * Timed Arena Pickups (Overdrive Core, Nano-Shield Surge, Phase Shift).
 * Spawns periodically, features dynamic bobbing & rotation animations,
 * and grants temporary tactical advantages.
 */

class PowerUp {
    constructor(id, type, x, y) {
        this.id = id;
        this.type = type; // 'overdrive', 'shield', 'phase'
        this.x = x;
        this.y = y;
        this.radius = 20;

        this.isActive = true;
        this.respawnTimer = 0;
        this.respawnDelay = 28; // 28 seconds

        this.angle = 0;
        this.bobTime = Math.random() * 10;

        // Visual configs
        if (type === 'overdrive') {
            this.name = 'OVERDRIVE CORE';
            this.color = '#ffb703';
            this.glowColor = 'rgba(255, 183, 3, 0.6)';
        } else if (type === 'shield') {
            this.name = 'NANO-SHIELD';
            this.color = '#00f0ff';
            this.glowColor = 'rgba(0, 240, 255, 0.6)';
        } else {
            this.name = 'PHASE SHIFT';
            this.color = '#d946ef';
            this.glowColor = 'rgba(217, 70, 239, 0.6)';
        }
    }

    update(dt) {
        this.bobTime += dt * 3;
        this.angle += dt * 2.2;

        if (!this.isActive) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.isActive = true;
            }
        }
    }

    checkPickup(player) {
        if (!this.isActive || player.isDead) return false;
        const distSq = (player.x - this.x) ** 2 + (player.y - this.y) ** 2;
        const pickupDist = this.radius + player.radius + 6;
        if (distSq < pickupDist * pickupDist) {
            this.isActive = false;
            this.respawnTimer = this.respawnDelay;
            player.applyPowerUp(this.type);
            return true;
        }
        return false;
    }
}

window.PowerUp = PowerUp;
