/**
 * Weapon.js
 * Modular weapon specifications and projectile mechanics.
 * Supports bullet ricochets, parry-reflection, and particle trails.
 */

const WEAPONS = [
    {
        id: 'blaster',
        name: 'Pulse Blaster',
        fireRate: 0.14, // Seconds between shots (~7 shots/sec)
        damage: 22,
        speed: 950,
        spread: 0.05,
        pellets: 1,
        bounces: 0,
        color: '#00f0ff', // Cyan
        trailColor: 'rgba(0, 240, 255, 0.4)',
        radius: 4,
        screenShake: 2,
        sound: 'playShootBlaster',
        magSize: 20,
        reloadTime: 1.1,
        equipTime: 0.2
    },
    {
        id: 'shotgun',
        name: 'Plasma Shotgun',
        fireRate: 0.65,
        damage: 18, // per pellet (5 * 18 = 90 max burst)
        speed: 850,
        spread: 0.32,
        pellets: 5,
        bounces: 0,
        color: '#ffb703', // Amber Gold
        trailColor: 'rgba(255, 183, 3, 0.35)',
        radius: 3.5,
        screenShake: 6,
        sound: 'playShootShotgun',
        magSize: 6,
        reloadTime: 1.5,
        equipTime: 0.25
    },
    {
        id: 'sniper',
        name: 'Apex Sniper',
        fireRate: 0.95,
        damage: 90,
        speed: 1750,
        spread: 0.005,
        pellets: 1,
        bounces: 1, // Bounces once off walls!
        penetration: 1, // Wall-bang: punches through thin barrier covers!
        color: '#d946ef', // Neon Magenta
        trailColor: 'rgba(217, 70, 239, 0.6)',
        radius: 5,
        screenShake: 8,
        sound: 'playShootSniper',
        magSize: 4,
        reloadTime: 2.0,
        equipTime: 0.3
    },
    {
        id: 'vortex',
        name: 'Vortex Cannon',
        fireRate: 0.8,
        damage: 60,
        speed: 700,
        spread: 0.02,
        pellets: 1,
        bounces: 0,
        isExplosive: true,
        blastRadius: 85,
        color: '#10b981', // Emerald
        trailColor: 'rgba(16, 185, 129, 0.4)',
        radius: 7,
        screenShake: 9,
        sound: 'playShootVortex',
        magSize: 5,
        reloadTime: 1.7,
        equipTime: 0.28
    },
    {
        id: 'blade',
        name: 'Neon Glaive',
        fireRate: 0.42,
        damage: 75,
        speed: 1250,
        spread: 0.0,
        pellets: 1,
        bounces: 0,
        isMeleeSlash: true,
        color: '#38bdf8',
        trailColor: 'rgba(56, 189, 248, 0.5)',
        radius: 12,
        screenShake: 4,
        sound: 'playBladeSlash',
        magSize: 9,
        reloadTime: 1.2,
        equipTime: 0.2
    }
];

class Bullet {
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.vx = config.vx;
        this.vy = config.vy;
        this.radius = config.radius || 4;
        this.damage = config.damage;
        this.color = config.color;
        this.trailColor = config.trailColor;
        this.ownerId = config.ownerId;
        this.ownerTeam = config.ownerTeam || null;
        this.bouncesRemaining = config.bounces || 0;
        this.penetrationRemaining = config.penetration || 0;
        this.isExplosive = config.isExplosive || false;
        this.blastRadius = config.blastRadius || 0;
        this.isMeleeSlash = config.isMeleeSlash || false;
        this.comboStep = config.comboStep !== undefined ? config.comboStep : 0;
        this.weaponId = config.weaponId || 'blaster';
        this.isParried = false;
        this.life = 0;
        this.sentTime = (config.sentTime !== undefined && config.sentTime !== null) ? config.sentTime : performance.now();
        this.maxLife = config.maxLife || (this.isMeleeSlash ? 0.20 : 3.0); // Melee dissipation cap (250px max travel)

        // Performance Overhaul: fixed ring-buffer trail (zero per-frame allocation;
        // previously push/shift created a new {x,y} object per bullet per frame)
        this.trailBuf = new Array(8);
        for (let ti = 0; ti < 8; ti++) this.trailBuf[ti] = { x: 0, y: 0 };
        this.trailHead = 0;  // next write slot
        this.trailCount = 0; // filled slots (≤ 8)

        this.isDead = false;
    }

    /** Oldest→newest ordered access to the ring-buffer trail (idx in [0, trailCount)) */
    getTrailPointAt(idx) {
        const n = this.trailCount;
        if (idx < 0 || idx >= n) return this.trailBuf[(this.trailHead - 1 + 8) % 8];
        return this.trailBuf[(this.trailHead - n + idx + 8) % 8];
    }

    serialize() {
        return {
            x: Math.round(this.x),
            y: Math.round(this.y),
            vx: Math.round(this.vx),
            vy: Math.round(this.vy),
            radius: this.radius,
            damage: this.damage,
            color: this.color,
            trailColor: this.trailColor,
            ownerId: this.ownerId,
            ownerTeam: this.ownerTeam,
            sentTime: this.sentTime,
            bounces: this.bouncesRemaining,
            penetration: this.penetrationRemaining,
            isExplosive: this.isExplosive,
            blastRadius: this.blastRadius,
            isMeleeSlash: this.isMeleeSlash,
            comboStep: this.comboStep,
            weaponId: this.weaponId,
            maxLife: this.maxLife
        };
    }

    update(dt, obstacles, onExplode, onSpawnParticles, onWallHit = null) {
        if (this.isDead) return;

        this.life += dt;
        if (this.life >= this.maxLife) {
            this.destroy(onExplode, onSpawnParticles);
            return;
        }

        // Save trail position (zero-GC ring buffer write)
        const slot = this.trailBuf[this.trailHead];
        slot.x = this.x;
        slot.y = this.y;
        this.trailHead = (this.trailHead + 1) % 8;
        if (this.trailCount < 8) this.trailCount++;

        const stepX = this.vx * dt;
        const stepY = this.vy * dt;
        const nextX = this.x + stepX;
        const nextY = this.y + stepY;

        // Phase 19: Arena Boundary Out-of-Bounds Culling (prevents infinite simulation in void)
        if (Math.abs(this.x) > 1600 || Math.abs(this.y) > 1600 || Math.abs(nextX) > 1600 || Math.abs(nextY) > 1600) {
            this.x = nextX;
            this.y = nextY;
            this.isDead = true;
            return;
        }

        // Check collision against obstacles via Raycast
        let closestHit = null;
        let hitBox = null;

        // Performance Overhaul: broad-phase segment-AABB reject — a bullet step only
        // spans tens of pixels, so ~95% of obstacle tests are skipped with 4 compares
        const minSX = this.x < nextX ? this.x : nextX;
        const maxSX = this.x > nextX ? this.x : nextX;
        const minSY = this.y < nextY ? this.y : nextY;
        const maxSY = this.y > nextY ? this.y : nextY;

        for (let i = 0; i < obstacles.length; i++) {
            const box = obstacles[i];
            if (box.x > maxSX || box.x + box.w < minSX || box.y > maxSY || box.y + box.h < minSY) continue;
            const hit = Physics.raycastBox(this.x, this.y, nextX, nextY, box);
            if (hit && hit.t >= 0 && hit.t <= 1) {
                if (!closestHit || hit.t < closestHit.t) {
                    closestHit = hit;
                    hitBox = box;
                }
            }
        }

        if (closestHit) {
            // Hit an obstacle
            const speed = Math.hypot(this.vx, this.vy);
            const isThinWall = hitBox && (hitBox.w <= 85 || hitBox.h <= 85);

            if (this.penetrationRemaining > 0 && isThinWall && speed > 100) {
                // Wall-Bang: Penetrate through thin barrier with 30% damage reduction
                this.penetrationRemaining--;
                this.damage = Math.max(15, Math.round(this.damage * 0.70));
                const dirX = this.vx / speed;
                const dirY = this.vy / speed;

                // Phase 16: Robust Ray-AABB exit distance calculation to prevent bullet trapping at acute angles
                let txMax = Infinity;
                let tyMax = Infinity;
                if (Math.abs(dirX) > 0.0001) {
                    const t1 = (hitBox.x - closestHit.point.x) / dirX;
                    const t2 = (hitBox.x + hitBox.w - closestHit.point.x) / dirX;
                    txMax = Math.max(t1, t2);
                }
                if (Math.abs(dirY) > 0.0001) {
                    const t1 = (hitBox.y - closestHit.point.y) / dirY;
                    const t2 = (hitBox.y + hitBox.h - closestHit.point.y) / dirY;
                    tyMax = Math.max(t1, t2);
                }
                const exitT = Math.min(txMax, tyMax);
                const punchDist = (exitT > 0 && isFinite(exitT)) ? (exitT + 8) : (Math.min(hitBox.w, hitBox.h) + 14);

                this.x = closestHit.point.x + dirX * punchDist;
                this.y = closestHit.point.y + dirY * punchDist;

                if (onSpawnParticles) {
                    onSpawnParticles(this.x, this.y, '#ffffff', 8, 280, { x: dirX, y: dirY });
                }
                if (onWallHit) {
                    onWallHit(closestHit.point.x, closestHit.point.y, closestHit.normal, this.color, this.weaponId);
                }
                if (window.AudioEngine && window.AudioEngine.playWallHit) {
                    window.AudioEngine.playWallHit(this.x, this.y, false);
                }
            } else if (this.bouncesRemaining > 0) {
                // Ricochet!
                this.bouncesRemaining--;
                this.x = closestHit.point.x + closestHit.normal.x * 2;
                this.y = closestHit.point.y + closestHit.normal.y * 2;

                // Reflect velocity: v' = v - 2 * (v . n) * n
                const dot = this.vx * closestHit.normal.x + this.vy * closestHit.normal.y;
                this.vx = this.vx - 2 * dot * closestHit.normal.x;
                this.vy = this.vy - 2 * dot * closestHit.normal.y;

                if (onSpawnParticles) {
                    onSpawnParticles(this.x, this.y, this.color, 12, 340, closestHit.normal);
                }
                if (onWallHit) {
                    onWallHit(this.x, this.y, closestHit.normal, this.color, this.weaponId);
                }
                if (window.AudioEngine && window.AudioEngine.playWallHit) {
                    window.AudioEngine.playWallHit(this.x, this.y, true);
                }
            } else {
                this.x = closestHit.point.x;
                this.y = closestHit.point.y;
                if (window.AudioEngine && window.AudioEngine.playWallHit) {
                    window.AudioEngine.playWallHit(this.x, this.y, false);
                }
                if (onWallHit) {
                    onWallHit(this.x, this.y, closestHit.normal, this.color, this.weaponId);
                }
                this.destroy(onExplode, onSpawnParticles, closestHit.normal);
            }
        } else {
            this.x = nextX;
            this.y = nextY;
        }
    }

    destroy(onExplode, onSpawnParticles, normal = null) {
        this.isDead = true;
        if (this.isExplosive && onExplode) {
            onExplode(this.x, this.y, this.blastRadius, this.damage, this.ownerId);
        } else if (onSpawnParticles) {
            onSpawnParticles(this.x, this.y, this.color, 8, 260, normal);
        }
    }

    /**
     * Called when a player parries this bullet.
     * Reverses velocity, boosts speed 1.4x, increases damage 1.5x, changes color to Gold!
     */
    parry(newOwnerId, reflectAngle = null, newOwnerTeam = null) {
        this.isParried = true;
        this.ownerId = newOwnerId;
        if (newOwnerTeam !== null && newOwnerTeam !== undefined) {
            this.ownerTeam = newOwnerTeam;
        }
        this.damage = Math.round(this.damage * 1.5);
        this.color = '#ffffff';
        this.trailColor = 'rgba(255, 230, 0, 0.8)';
        this.radius = Math.min(8, this.radius * 1.3);

        const currentSpeed = Math.hypot(this.vx, this.vy) * 1.4;

        if (reflectAngle !== null) {
            this.vx = Math.cos(reflectAngle) * currentSpeed;
            this.vy = Math.sin(reflectAngle) * currentSpeed;
        } else {
            // Reverse 180 degrees
            this.vx = -this.vx * 1.4;
            this.vy = -this.vy * 1.4;
        }

        // Reset lifetime to give the parried projectile a full flight
        this.life = 0;
    }
}

/**
 * ShellCasing
 * Physics-simulated ejected bullet casing with bounce mechanics and audio clinks.
 */
class ShellCasing {
    constructor(x, y, angle, type = 'brass') {
        this.x = x;
        this.y = y;
        this.z = 10; // Vertical elevation off the arena floor
        this.vz = 40 + Math.random() * 30;
        // Ejection 90 degrees offset from barrel
        const ejectAngle = angle + (Math.PI / 2) + (Math.random() - 0.5) * 0.45;
        const ejectSpeed = 80 + Math.random() * 110;
        this.vx = Math.cos(ejectAngle) * ejectSpeed;
        this.vy = Math.sin(ejectAngle) * ejectSpeed;
        this.rot = Math.random() * Math.PI * 2;
        this.vRot = (Math.random() - 0.5) * 22;
        this.type = type; // 'brass', 'plasma', 'slug'
        this.life = 6.5; // Decays over time to optimize memory
        this.maxLife = 6.5;
        this.bounces = 0;
        this.isDead = false;
    }

    update(dt) {
        if (this.isDead) return;
        this.life -= dt;
        if (this.life <= 0) {
            this.isDead = true;
            return;
        }

        if (this.z > 0 || this.vz !== 0) {
            this.vz -= 360 * dt; // Gravity
            this.z += this.vz * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.rot += this.vRot * dt;

            if (this.z <= 0) {
                this.z = 0;
                this.bounces++;
                if (this.bounces < 3) {
                    this.vz = -this.vz * 0.42; // Floor restitution
                    this.vx *= 0.55;
                    this.vy *= 0.55;
                    this.vRot *= 0.5;
                    if (this.bounces === 1 && window.AudioEngine && window.AudioEngine.playCasingClink) {
                        window.AudioEngine.playCasingClink(this.x, this.y);
                    }
                } else {
                    this.vz = 0;
                    this.vx = 0;
                    this.vy = 0;
                    this.vRot = 0;
                }
            }
        } else {
            this.vx *= 0.88;
            this.vy *= 0.88;
        }
    }
}

window.WEAPONS = WEAPONS;
window.Bullet = Bullet;
window.ShellCasing = ShellCasing;
