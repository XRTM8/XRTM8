/**
 * MapManager.js
 * Competitive Map layouts, Obstacle generators, and Dynamic Environmental Hazards (The Crucible).
 */

const MAPS = [
    {
        id: 'core',
        name: 'The Core',
        desc: 'Symmetric tactical arena with central cover and balanced sightlines',
        size: 2200,
        hazards: [],
        teleporters: [
            {
                id: 'portal_alpha',
                targetId: 'portal_beta',
                name: 'PORTAL ALPHA',
                x: -750,
                y: -750,
                radius: 38,
                color: '#00f0ff',
                angle: 0
            },
            {
                id: 'portal_beta',
                targetId: 'portal_alpha',
                name: 'PORTAL BETA',
                x: 750,
                y: 750,
                radius: 38,
                color: '#a855f7',
                angle: 0
            }
        ],
        powerUpSpawns: [
            { type: 'overdrive', x: 0, y: 0 },
            { type: 'shield', x: -500, y: 0 },
            { type: 'phase', x: 500, y: 0 }
        ],
        spawns: [
            { x: -550, y: -550 },
            { x: 550, y: -550 },
            { x: -550, y: 550 },
            { x: 550, y: 550 },
            { x: 0, y: -650 },
            { x: 0, y: 650 }
        ],
        createObstacles: (size) => {
            const half = size / 2;
            const wallThick = 60;
            const obs = [
                // Perimeter boundaries
                { x: -half - wallThick, y: -half - wallThick, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: half, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: -half, w: wallThick, h: size },
                { x: half, y: -half, w: wallThick, h: size },

                // Center Octagonal Box
                { x: -90, y: -90, w: 180, h: 180 },

                // 4 Quadrants
                { x: -480 - 65, y: -480 - 65, w: 130, h: 130 },
                { x: 480 - 65, y: -480 - 65, w: 130, h: 130 },
                { x: -480 - 65, y: 480 - 65, w: 130, h: 130 },
                { x: 480 - 65, y: 480 - 65, w: 130, h: 130 },

                // L-barriers
                { x: -90, y: -800, w: 180, h: 35 },
                { x: -90, y: 800 - 35, w: 180, h: 35 },
                { x: -800, y: -90, w: 35, h: 180 },
                { x: 800 - 35, y: -90, w: 35, h: 180 }
            ];
            return obs;
        }
    },
    {
        id: 'alleys',
        name: 'Neon Alleyways',
        desc: 'Tight corridors, blind corners, and ambush lanes ideal for shotguns & ricochets',
        size: 2400,
        hazards: [],
        powerUpSpawns: [
            { type: 'shield', x: 0, y: 0 },
            { type: 'overdrive', x: -600, y: -200 },
            { type: 'phase', x: 600, y: 200 }
        ],
        spawns: [
            { x: -850, y: -850 },
            { x: 850, y: -850 },
            { x: -850, y: 850 },
            { x: 850, y: 850 },
            { x: 0, y: -850 },
            { x: 0, y: 850 }
        ],
        createObstacles: (size) => {
            const half = size / 2;
            const wallThick = 60;
            const obs = [
                // Outer boundaries
                { x: -half - wallThick, y: -half - wallThick, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: half, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: -half, w: wallThick, h: size },
                { x: half, y: -half, w: wallThick, h: size }
            ];

            // Complex Urban Corridors & T-junctions
            const thick = 40;
            // Central intersection blocks
            obs.push(
                { x: -280, y: -280, w: 180, h: thick },
                { x: -280, y: -280, w: thick, h: 180 },
                { x: 100, y: -280, w: 180, h: thick },
                { x: 240, y: -280, w: thick, h: 180 },
                { x: -280, y: 240, w: 180, h: thick },
                { x: -280, y: 100, w: thick, h: 180 },
                { x: 100, y: 240, w: 180, h: thick },
                { x: 240, y: 100, w: thick, h: 180 }
            );

            // Perimeter chicane pillars
            obs.push(
                { x: -650, y: -450, w: 380, h: thick },
                { x: 270, y: -450, w: 380, h: thick },
                { x: -650, y: 450, w: 380, h: thick },
                { x: 270, y: 450, w: 380, h: thick },

                { x: -450, y: -650, w: thick, h: 380 },
                { x: 450, y: -650, w: thick, h: 380 },
                { x: -450, y: 270, w: thick, h: 380 },
                { x: 450, y: 270, w: thick, h: 380 }
            );

            return obs;
        }
    },
    {
        id: 'crucible',
        name: 'The Crucible',
        desc: 'Industrial battle arena with pulsating deadly environmental laser hazard fields',
        size: 2200,
        hazards: [
            // Center Horizontal Laser Hazard Beam
            {
                id: 'center_laser_h',
                type: 'beam',
                x: -600,
                y: -25,
                w: 1200,
                h: 50,
                cycleTimer: 0,
                warningTime: 2.0, // 2s blinking warning
                activeTime: 2.2,  // 2.2s lethal active laser
                cooldownTime: 4.5,// 4.5s safe cooldown
                state: 'cooldown', // 'cooldown', 'warning', 'active'
                damagePerSec: 120
            },
            // Center Vertical Laser Hazard Beam
            {
                id: 'center_laser_v',
                type: 'beam',
                x: -25,
                y: -600,
                w: 50,
                h: 1200,
                cycleTimer: 0,
                warningTime: 2.0,
                activeTime: 2.2,
                cooldownTime: 4.5,
                state: 'cooldown',
                damagePerSec: 120
            }
        ],
        powerUpSpawns: [
            { type: 'overdrive', x: 0, y: -450 },
            { type: 'shield', x: 0, y: 450 },
            { type: 'phase', x: -500, y: 500 }
        ],
        spawns: [
            { x: -650, y: -650 },
            { x: 650, y: -650 },
            { x: -650, y: 650 },
            { x: 650, y: 650 },
            { x: -750, y: 0 },
            { x: 750, y: 0 }
        ],
        createObstacles: (size) => {
            const half = size / 2;
            const wallThick = 60;
            const obs = [
                // Outer boundaries
                { x: -half - wallThick, y: -half - wallThick, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: half, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: -half, w: wallThick, h: size },
                { x: half, y: -half, w: wallThick, h: size }
            ];

            // 4 Corner Safety Bunkers
            const bunkerOffset = 500;
            const bSize = 140;
            obs.push(
                { x: -bunkerOffset - bSize / 2, y: -bunkerOffset - bSize / 2, w: bSize, h: bSize },
                { x: bunkerOffset - bSize / 2, y: -bunkerOffset - bSize / 2, w: bSize, h: bSize },
                { x: -bunkerOffset - bSize / 2, y: bunkerOffset - bSize / 2, w: bSize, h: bSize },
                { x: bunkerOffset - bSize / 2, y: bunkerOffset - bSize / 2, w: bSize, h: bSize }
            );

            // Perimeter Angled Covers
            obs.push(
                { x: -250, y: -800, w: 500, h: 40 },
                { x: -250, y: 760, w: 500, h: 40 },
                { x: -800, y: -250, w: 40, h: 500 },
                { x: 760, y: -250, w: 40, h: 500 }
            );

            return obs;
        }
    },
    {
        id: 'hyperloop',
        name: 'Hyperloop Station',
        desc: 'High-speed transit hub featuring dual kinetic acceleration pads and timed energy transit gates',
        size: 2400,
        hazards: [],
        speedPads: [
            // Upper Express Track (Boosts Right)
            { x: -700, y: -280, w: 1400, h: 90, boostVx: 720, boostVy: 0, dir: 'right', color: '#00f0ff' },
            // Lower Express Track (Boosts Left)
            { x: -700, y: 190, w: 1400, h: 90, boostVx: -720, boostVy: 0, dir: 'left', color: '#ffb703' }
        ],
        dynamicDoors: [
            { id: 'door_west', x: -350, y: -65, w: 30, h: 130, cycleTimer: 0, openDuration: 4.0, closedDuration: 4.0, isOpen: false },
            { id: 'door_east', x: 320, y: -65, w: 30, h: 130, cycleTimer: 4.0, openDuration: 4.0, closedDuration: 4.0, isOpen: true }
        ],
        powerUpSpawns: [
            { type: 'overdrive', x: 0, y: -45 },
            { type: 'shield', x: -750, y: 0 },
            { type: 'phase', x: 750, y: 0 }
        ],
        spawns: [
            { x: -800, y: -650 },
            { x: 800, y: -650 },
            { x: -800, y: 650 },
            { x: 800, y: 650 },
            { x: 0, y: -650 },
            { x: 0, y: 650 }
        ],
        createObstacles: (size) => {
            const half = size / 2;
            const wallThick = 60;
            const obs = [
                // Outer boundaries
                { x: -half - wallThick, y: -half - wallThick, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: half, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: -half, w: wallThick, h: size },
                { x: half, y: -half, w: wallThick, h: size },

                // Central Platform Core
                { x: -260, y: -65, w: 520, h: 130 },

                // Track Barriers
                { x: -700, y: -320, w: 1400, h: 30 },
                { x: -700, y: -180, w: 1400, h: 30 },
                { x: -700, y: 150, w: 1400, h: 30 },
                { x: -700, y: 290, w: 1400, h: 30 },

                // Corner Terminal Hubs
                { x: -650, y: -650, w: 180, h: 180 },
                { x: 470, y: -650, w: 180, h: 180 },
                { x: -650, y: 470, w: 180, h: 180 },
                { x: 470, y: 470, w: 180, h: 180 }
            ];
            return obs;
        }
    },
    {
        id: 'foundry',
        name: 'Orbital Foundry',
        desc: 'Zero-gravity industrial platform with kinetic jump pads and a central pulsing plasma reactor core',
        size: 2600,
        hazards: [],
        jumpPads: [
            // North Pad (launches Down toward center)
            { id: 'pad_n', x: -60, y: -680, w: 120, h: 60, jumpVx: 0, jumpVy: 850, dir: 'down', color: '#00f0ff' },
            // South Pad (launches Up toward center)
            { id: 'pad_s', x: -60, y: 620, w: 120, h: 60, jumpVx: 0, jumpVy: -850, dir: 'up', color: '#00f0ff' },
            // West Pad (launches Right toward center)
            { id: 'pad_w', x: -680, y: -60, w: 60, h: 120, jumpVx: 850, jumpVy: 0, dir: 'right', color: '#ffb703' },
            // East Pad (launches Left toward center)
            { id: 'pad_e', x: 620, y: -60, w: 60, h: 120, jumpVx: -850, jumpVy: 0, dir: 'left', color: '#ffb703' }
        ],
        plasmaCore: {
            x: 0,
            y: 0,
            radius: 80,
            blastRadius: 260,
            cycleTimer: 0,
            warningTime: 2.2,
            activeTime: 1.2,
            cooldownTime: 6.0,
            state: 'cooldown',
            rotation: 0,
            damagePerSec: 140,
            color: '#a855f7'
        },
        powerUpSpawns: [
            { type: 'overdrive', x: 0, y: -400 },
            { type: 'shield', x: 0, y: 400 },
            { type: 'phase', x: -450, y: 0 }
        ],
        spawns: [
            { x: -950, y: -950 },
            { x: 950, y: -950 },
            { x: -950, y: 950 },
            { x: 950, y: 950 },
            { x: -1050, y: 0 },
            { x: 1050, y: 0 }
        ],
        createObstacles: (size) => {
            const half = size / 2;
            const wallThick = 60;
            const obs = [
                // Outer boundaries
                { x: -half - wallThick, y: -half - wallThick, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: half, w: size + wallThick * 2, h: wallThick },
                { x: -half - wallThick, y: -half, w: wallThick, h: size },
                { x: half, y: -half, w: wallThick, h: size }
            ];

            // 4 Corner Core Platforms
            const cornerSize = 180;
            obs.push(
                { x: -800, y: -800, w: cornerSize, h: cornerSize },
                { x: 620, y: -800, w: cornerSize, h: cornerSize },
                { x: -800, y: 620, w: cornerSize, h: cornerSize },
                { x: 620, y: 620, w: cornerSize, h: cornerSize }
            );

            // 4 Containment Baffles guarding the central core
            obs.push(
                { x: -200, y: -200, w: 80, h: 80 },
                { x: 120, y: -200, w: 80, h: 80 },
                { x: -200, y: 120, w: 80, h: 80 },
                { x: 120, y: 120, w: 80, h: 80 }
            );

            // Perimeter Catwalk Dividers & Chicanes
            const thick = 40;
            obs.push(
                { x: -520, y: -300, w: thick, h: 220 },
                { x: 480, y: -300, w: thick, h: 220 },
                { x: -520, y: 80, w: thick, h: 220 },
                { x: 480, y: 80, w: thick, h: 220 },

                { x: -300, y: -520, w: 220, h: thick },
                { x: 80, y: -520, w: 220, h: thick },
                { x: -300, y: 480, w: 220, h: thick },
                { x: 80, y: 480, w: 220, h: thick }
            );

            return obs;
        }
    }
];

class MapManager {
    constructor() {
        this.currentMap = MAPS[0];
    }

    setMap(mapId) {
        const found = MAPS.find(m => m.id === mapId);
        if (found) {
            this.currentMap = found;
            // Reset hazards timers
            if (this.currentMap.hazards) {
                for (let h of this.currentMap.hazards) {
                    h.cycleTimer = 0;
                    h.state = 'cooldown';
                }
            }
            if (this.currentMap.dynamicDoors) {
                for (let d of this.currentMap.dynamicDoors) {
                    d.cycleTimer = 0;
                    d.isOpen = false;
                }
            }
            if (this.currentMap.plasmaCore) {
                this.currentMap.plasmaCore.cycleTimer = 0;
                this.currentMap.plasmaCore.state = 'cooldown';
                this.currentMap.plasmaCore.rotation = 0;
            }
            this.navWaypoints = null;
        }
        return this.currentMap;
    }

    /**
     * Phase 8D: Build Navigation Waypoint Graph around obstacles with safe clearance margins.
     */
    buildNavWaypoints(obstacles, arenaSize = 2200) {
        if (!obstacles || obstacles.length === 0) return [];
        const waypoints = [];
        const margin = 38; // safe clearance around obstacles
        const halfArena = (arenaSize / 2) - 60;

        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (obs.w > arenaSize * 0.6 || obs.h > arenaSize * 0.6) continue; // Skip boundary walls

            const corners = [
                { x: obs.x - margin, y: obs.y - margin },
                { x: obs.x + obs.w + margin, y: obs.y - margin },
                { x: obs.x + obs.w + margin, y: obs.y + obs.h + margin },
                { x: obs.x - margin, y: obs.y + obs.h + margin }
            ];

            for (let c of corners) {
                if (Math.abs(c.x) > halfArena || Math.abs(c.y) > halfArena) continue;

                let insideAny = false;
                for (let j = 0; j < obstacles.length; j++) {
                    const other = obstacles[j];
                    if (c.x >= other.x - 4 && c.x <= other.x + other.w + 4 &&
                        c.y >= other.y - 4 && c.y <= other.y + other.h + 4) {
                        insideAny = true;
                        break;
                    }
                }
                if (!insideAny) {
                    const exists = waypoints.some(wp => Math.hypot(wp.x - c.x, wp.y - c.y) < 24);
                    if (!exists) {
                        waypoints.push({ id: waypoints.length, x: Math.round(c.x), y: Math.round(c.y) });
                    }
                }
            }
        }

        // Connect neighbor waypoints with Line of Sight
        for (let i = 0; i < waypoints.length; i++) {
            const wp1 = waypoints[i];
            wp1.neighbors = [];
            for (let j = 0; j < waypoints.length; j++) {
                if (i === j) continue;
                const wp2 = waypoints[j];
                const d = Math.hypot(wp2.x - wp1.x, wp2.y - wp1.y);
                if (d < 700 && Physics.hasLineOfSight(wp1.x, wp1.y, wp2.x, wp2.y, obstacles)) {
                    wp1.neighbors.push({ node: wp2, dist: d });
                }
            }
        }

        this.navWaypoints = waypoints;
        return waypoints;
    }

    /**
     * Phase 8D: A* Shortest Pathfinding over Waypoint Graph.
     */
    findPath(startX, startY, goalX, goalY, obstacles) {
        if (Physics.hasLineOfSight(startX, startY, goalX, goalY, obstacles)) {
            return [{ x: goalX, y: goalY }];
        }

        const waypoints = this.navWaypoints || this.buildNavWaypoints(obstacles);
        if (!waypoints || waypoints.length === 0) {
            return [{ x: goalX, y: goalY }];
        }

        let startWp = null;
        let bestStartDist = Infinity;
        for (let wp of waypoints) {
            const d = Math.hypot(wp.x - startX, wp.y - startY);
            if (d < bestStartDist && Physics.hasLineOfSight(startX, startY, wp.x, wp.y, obstacles)) {
                bestStartDist = d;
                startWp = wp;
            }
        }

        let goalWp = null;
        let bestGoalDist = Infinity;
        for (let wp of waypoints) {
            const d = Math.hypot(wp.x - goalX, wp.y - goalY);
            if (d < bestGoalDist && Physics.hasLineOfSight(goalX, goalY, wp.x, wp.y, obstacles)) {
                bestGoalDist = d;
                goalWp = wp;
            }
        }

        if (!startWp || !goalWp) {
            return [{ x: goalX, y: goalY }];
        }

        if (startWp.id === goalWp.id) {
            return [{ x: goalWp.x, y: goalWp.y }, { x: goalX, y: goalY }];
        }

        const openSet = new Set([startWp.id]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        for (let wp of waypoints) {
            gScore.set(wp.id, Infinity);
            fScore.set(wp.id, Infinity);
        }

        gScore.set(startWp.id, 0);
        fScore.set(startWp.id, Math.hypot(goalWp.x - startWp.x, goalWp.y - startWp.y));

        while (openSet.size > 0) {
            let current = null;
            let lowestF = Infinity;
            for (let id of openSet) {
                const f = fScore.get(id);
                if (f < lowestF) {
                    lowestF = f;
                    current = waypoints[id];
                }
            }

            if (!current || current.id === goalWp.id) {
                const path = [{ x: goalX, y: goalY }];
                let currId = goalWp.id;
                while (cameFrom.has(currId)) {
                    const wp = waypoints[currId];
                    path.unshift({ x: wp.x, y: wp.y });
                    currId = cameFrom.get(currId);
                }
                path.unshift({ x: startWp.x, y: startWp.y });
                return path;
            }

            openSet.delete(current.id);

            for (let edge of (current.neighbors || [])) {
                const neighbor = edge.node;
                const tentativeG = gScore.get(current.id) + edge.dist;
                if (tentativeG < gScore.get(neighbor.id)) {
                    cameFrom.set(neighbor.id, current.id);
                    gScore.set(neighbor.id, tentativeG);
                    const h = Math.hypot(goalWp.x - neighbor.x, goalWp.y - neighbor.y);
                    fScore.set(neighbor.id, tentativeG + h);
                    openSet.add(neighbor.id);
                }
            }
        }

        return [{ x: startWp.x, y: startWp.y }, { x: goalX, y: goalY }];
    }

    updateHazards(dt, players, onSpawnParticles, onHazardHit, obstacles) {
        // 1. Dynamic Doors (Hyperloop)
        if (this.currentMap.dynamicDoors && obstacles) {
            for (let d of this.currentMap.dynamicDoors) {
                d.cycleTimer += dt;
                const total = d.openDuration + d.closedDuration;
                const pos = d.cycleTimer % total;
                d.isOpen = pos < d.openDuration;

                const exIdx = obstacles.findIndex(o => o.doorId === d.id);
                if (!d.isOpen) {
                    if (exIdx === -1) {
                        obstacles.push({
                            x: d.x, y: d.y, w: d.w, h: d.h,
                            doorId: d.id,
                            isDoor: true
                        });
                    }
                } else {
                    if (exIdx !== -1) {
                        obstacles.splice(exIdx, 1);
                    }
                }
            }
        }

        // 2. Speed Pads (Hyperloop)
        if (this.currentMap.speedPads) {
            for (let pad of this.currentMap.speedPads) {
                for (let p of players) {
                    if (p.isDead) continue;
                    if (p.x >= pad.x && p.x <= pad.x + pad.w &&
                        p.y >= pad.y && p.y <= pad.y + pad.h) {
                        p.vx += pad.boostVx * dt * 3.5;
                        p.vy += pad.boostVy * dt * 3.5;
                        if (Math.random() < 0.25 && onSpawnParticles) {
                            onSpawnParticles(p.x, p.y, pad.color, 2, 180);
                        }
                    }
                }
            }
        }

        // 3. Environmental Lasers (Crucible)
        if (this.currentMap.hazards && this.currentMap.hazards.length > 0) {
            for (let h of this.currentMap.hazards) {
                h.cycleTimer += dt;

                if (h.state === 'cooldown') {
                    if (h.cycleTimer >= h.cooldownTime) {
                        h.state = 'warning';
                        h.cycleTimer = 0;
                    }
                } else if (h.state === 'warning') {
                    if (h.cycleTimer >= h.warningTime) {
                        h.state = 'active';
                        h.cycleTimer = 0;
                        const blastX = h.x + (h.w || 0) / 2;
                        const blastY = h.y + (h.h || 0) / 2;
                        if (window.AudioEngine && window.AudioEngine.playExplosion) {
                            window.AudioEngine.playExplosion(blastX, blastY);
                        }
                    }
                } else if (h.state === 'active') {
                    // Spawn laser sparks
                    if (Math.random() < 0.6 && onSpawnParticles) {
                        const sparkX = h.x + Math.random() * h.w;
                        const sparkY = h.y + Math.random() * h.h;
                        onSpawnParticles(sparkX, sparkY, '#ef4444', 3, 260);
                    }

                    // Check collision against players
                    for (let p of players) {
                        if (p.isDead) continue;
                        // Circle vs Box check
                        const closestX = Math.max(h.x, Math.min(p.x, h.x + h.w));
                        const closestY = Math.max(h.y, Math.min(p.y, h.y + h.h));
                        const dx = p.x - closestX;
                        const dy = p.y - closestY;

                        if (dx * dx + dy * dy < p.radius * p.radius) {
                            // Player touched active laser! Framerate-independent floating point accumulator
                            p._hazardDamageAccum = (p._hazardDamageAccum || 0) + (h.damagePerSec * dt);
                            if (p._hazardDamageAccum >= 1.0) {
                                const damage = Math.floor(p._hazardDamageAccum);
                                p._hazardDamageAccum -= damage;
                                p.takeDamage(damage, 'ENVIRONMENTAL LASER');
                                if (onHazardHit) onHazardHit(p, damage);
                            }
                        }
                    }

                    if (h.cycleTimer >= h.activeTime) {
                        h.state = 'cooldown';
                        h.cycleTimer = 0;
                    }
                }
            }
        }

        // 4. Quantum Teleporters (The Core)
        if (this.currentMap.teleporters) {
            for (let tp of this.currentMap.teleporters) {
                tp.angle = (tp.angle || 0) + dt * 2.8;
                for (let p of players) {
                    if (p.isDead) continue;
                    if (p.teleportCooldown && p.teleportCooldown > 0) continue;
                    const dist = Math.hypot(p.x - tp.x, p.y - tp.y);
                    if (dist < tp.radius + p.radius * 0.7) {
                        const dest = this.currentMap.teleporters.find(t => t.id === tp.targetId);
                        if (dest) {
                            if (onSpawnParticles) onSpawnParticles(p.x, p.y, tp.color, 18, 340);
                            p.x = dest.x;
                            p.y = dest.y;
                            p.teleportCooldown = 1.6;
                            if (onSpawnParticles) onSpawnParticles(dest.x, dest.y, dest.color, 24, 380);
                            if (window.AudioEngine && window.AudioEngine.playTeleport) {
                                window.AudioEngine.playTeleport(tp.x, tp.y);
                            }
                        }
                    }
                }
            }
        }

        // 5. Kinetic Jump Pads (Orbital Foundry)
        if (this.currentMap.jumpPads) {
            for (let pad of this.currentMap.jumpPads) {
                for (let p of players) {
                    if (p.isDead) continue;
                    if (p.jumpCooldown && p.jumpCooldown > 0) continue;
                    if (p.x >= pad.x && p.x <= pad.x + pad.w &&
                        p.y >= pad.y && p.y <= pad.y + pad.h) {
                        p.vx += pad.jumpVx;
                        p.vy += pad.jumpVy;
                        p.jumpCooldown = 0.8;
                        p.jumpTimer = 0.45;
                        if (window.AudioEngine && window.AudioEngine.playJumpPad) {
                            window.AudioEngine.playJumpPad(pad.x + (pad.w || 0) / 2, pad.y + (pad.h || 0) / 2);
                        }
                        if (onSpawnParticles) {
                            onSpawnParticles(p.x, p.y, pad.color || '#00f0ff', 16, 340);
                        }
                    }
                }
            }
        }

        // 6. Plasma Reactor Core (Orbital Foundry)
        if (this.currentMap.plasmaCore) {
            const core = this.currentMap.plasmaCore;
            core.rotation = (core.rotation || 0) + dt * 1.5;
            core.cycleTimer += dt;

            if (core.state === 'cooldown') {
                if (core.cycleTimer >= core.cooldownTime) {
                    core.state = 'warning';
                    core.cycleTimer = 0;
                }
            } else if (core.state === 'warning') {
                if (Math.random() < 0.4 && onSpawnParticles) {
                    const ang = Math.random() * Math.PI * 2;
                    const r = Math.random() * core.radius;
                    onSpawnParticles(core.x + Math.cos(ang) * r, core.y + Math.sin(ang) * r, '#a855f7', 2, 140);
                }
                if (core.cycleTimer >= core.warningTime) {
                    core.state = 'active';
                    core.cycleTimer = 0;
                    if (window.AudioEngine && window.AudioEngine.playPlasmaPulse) {
                        window.AudioEngine.playPlasmaPulse(core.x, core.y);
                    }
                    if (onSpawnParticles) {
                        onSpawnParticles(core.x, core.y, '#c084fc', 35, 420);
                    }
                }
            } else if (core.state === 'active') {
                if (Math.random() < 0.7 && onSpawnParticles) {
                    const ang = Math.random() * Math.PI * 2;
                    const r = Math.random() * core.blastRadius;
                    onSpawnParticles(core.x + Math.cos(ang) * r, core.y + Math.sin(ang) * r, '#e879f9', 3, 220);
                }

                for (let p of players) {
                    if (p.isDead) continue;
                    const dist = Math.hypot(p.x - core.x, p.y - core.y);
                    if (dist < core.blastRadius) {
                        p._hazardDamageAccum = (p._hazardDamageAccum || 0) + (core.damagePerSec * dt);
                        if (p._hazardDamageAccum >= 1.0) {
                            const damage = Math.floor(p._hazardDamageAccum);
                            p._hazardDamageAccum -= damage;
                            p.takeDamage(damage, 'PLASMA REACTOR CORE');
                            if (onHazardHit) onHazardHit(p, damage);
                        }
                        const pushAng = Math.atan2(p.y - core.y, p.x - core.x);
                        p.vx += Math.cos(pushAng) * 220 * dt;
                        p.vy += Math.sin(pushAng) * 220 * dt;
                    }
                }

                if (core.cycleTimer >= core.activeTime) {
                    core.state = 'cooldown';
                    core.cycleTimer = 0;
                }
            }
        }
    }

    /**
     * Phase 18: Visibility-Graph A* Pathfinding for tactical Bot AI navigation.
     * Routes around solid obstacles using obstacle corner waypoints.
     */
    findPath(startX, startY, goalX, goalY, obstacles) {
        if (!obstacles || obstacles.length === 0) {
            return [{ x: goalX, y: goalY }];
        }

        // Direct Line-of-Sight fast path
        if (typeof Physics !== 'undefined' && Physics.hasLineOfSight(startX, startY, goalX, goalY, obstacles)) {
            return [{ x: goalX, y: goalY }];
        }

        const margin = 32; // Offset outside obstacle corners to allow bot circle clearance (radius 18)
        const candidateNodes = [];

        // Helper: check if a point is inside any obstacle
        const isInsideObstacle = (px, py) => {
            for (let i = 0; i < obstacles.length; i++) {
                const o = obstacles[i];
                if (px > o.x + 2 && px < o.x + o.w - 2 && py > o.y + 2 && py < o.y + o.h - 2) {
                    return true;
                }
            }
            return false;
        };

        // Generate corner waypoints for each obstacle
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const corners = [
                { x: obs.x - margin, y: obs.y - margin },
                { x: obs.x + obs.w + margin, y: obs.y - margin },
                { x: obs.x + obs.w + margin, y: obs.y + obs.h + margin },
                { x: obs.x - margin, y: obs.y + obs.h + margin }
            ];

            for (let c = 0; c < corners.length; c++) {
                const pt = corners[c];
                if (!isInsideObstacle(pt.x, pt.y)) {
                    candidateNodes.push({
                        x: pt.x,
                        y: pt.y,
                        g: Infinity,
                        f: Infinity,
                        parent: null,
                        closed: false
                    });
                }
            }
        }

        const startNode = { x: startX, y: startY, g: 0, f: Math.hypot(goalX - startX, goalY - startY), parent: null, closed: false };
        const goalNode = { x: goalX, y: goalY, g: Infinity, f: Infinity, parent: null, closed: false };

        const allNodes = [startNode, ...candidateNodes, goalNode];
        const openSet = [startNode];

        while (openSet.length > 0) {
            // Find node in openSet with lowest f
            let lowestIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[lowestIdx].f) {
                    lowestIdx = i;
                }
            }

            const current = openSet.splice(lowestIdx, 1)[0];
            current.closed = true;

            // Reached goal
            if (current === goalNode) {
                const path = [];
                let curr = goalNode;
                while (curr && curr.parent) {
                    path.unshift({ x: curr.x, y: curr.y });
                    curr = curr.parent;
                }
                return path.length > 0 ? path : [{ x: goalX, y: goalY }];
            }

            // Expand neighbors
            for (let i = 0; i < allNodes.length; i++) {
                const neighbor = allNodes[i];
                if (neighbor === current || neighbor.closed) continue;

                // Check Line of Sight between current and neighbor
                if (!Physics.hasLineOfSight(current.x, current.y, neighbor.x, neighbor.y, obstacles)) {
                    continue;
                }

                const dist = Math.hypot(neighbor.x - current.x, neighbor.y - current.y);
                const tentativeG = current.g + dist;

                if (tentativeG < neighbor.g) {
                    neighbor.parent = current;
                    neighbor.g = tentativeG;
                    neighbor.f = tentativeG + Math.hypot(goalX - neighbor.x, goalY - neighbor.y);

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        // If goal wasn't reached, pick the visible candidate node closest to goal
        let bestFallback = null;
        let bestDist = Infinity;
        for (let i = 0; i < candidateNodes.length; i++) {
            const n = candidateNodes[i];
            if (Physics.hasLineOfSight(startX, startY, n.x, n.y, obstacles)) {
                const d = Math.hypot(goalX - n.x, goalY - n.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestFallback = n;
                }
            }
        }

        if (bestFallback) {
            return [{ x: bestFallback.x, y: bestFallback.y }, { x: goalX, y: goalY }];
        }

        return [{ x: goalX, y: goalY }];
    }
}

window.MAPS = MAPS;
window.MapManager = new MapManager();
