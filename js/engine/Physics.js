/**
 * Physics.js
 * High-precision 2D deterministic collision solver.
 * Mathematical Circle-AABB and Ray-Box intersection with zero clipping.
 */
class Physics {
    // Clamp helper
    static clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    // Distance squared between two points
    static distSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    // Distance between two points
    static dist(x1, y1, x2, y2) {
        return Math.sqrt(this.distSq(x1, y1, x2, y2));
    }

    /**
     * Resolve Circle vs AABB (Axis-Aligned Bounding Box) collision.
     * Modifies circle's x, y to slide smoothly outside the box.
     * @param {Object} circle - {x, y, radius, vx, vy}
     * @param {Object} box - {x, y, w, h}
     * @returns {boolean} true if collision occurred
     */
    static resolveCircleBox(circle, box) {
        // Find closest point on box to circle center
        const closestX = this.clamp(circle.x, box.x, box.x + box.w);
        const closestY = this.clamp(circle.y, box.y, box.y + box.h);

        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        const dSq = dx * dx + dy * dy;

        // If distance is less than radius, circle is colliding
        if (dSq < circle.radius * circle.radius) {
            const d = Math.sqrt(dSq);
            if (d === 0) {
                // Center is strictly inside box, push to nearest edge
                const left = circle.x - box.x;
                const right = (box.x + box.w) - circle.x;
                const top = circle.y - box.y;
                const bottom = (box.y + box.h) - circle.y;
                const minD = Math.min(left, right, top, bottom);

                if (minD === left) { circle.x = box.x - circle.radius; circle.lastWallNormal = { x: -1, y: 0 }; }
                else if (minD === right) { circle.x = box.x + box.w + circle.radius; circle.lastWallNormal = { x: 1, y: 0 }; }
                else if (minD === top) { circle.y = box.y - circle.radius; circle.lastWallNormal = { x: 0, y: -1 }; }
                else { circle.y = box.y + box.h + circle.radius; circle.lastWallNormal = { x: 0, y: 1 }; }
            } else {
                const nx = dx / d;
                const ny = dy / d;
                circle.lastWallNormal = { x: nx, y: ny };
                const overlap = circle.radius - d;

                // Check if colliding with a corner vertex
                const isCorner = (closestX === box.x || closestX === box.x + box.w) &&
                                 (closestY === box.y || closestY === box.y + box.h);

                if (isCorner && overlap > 0.001) {
                    // Corner Sliding / Beveling Assist:
                    // Determine dominant movement direction and slide player around the corner
                    const vx = circle.vx || 0;
                    const vy = circle.vy || 0;
                    const speed = Math.hypot(vx, vy);

                    if (speed > 10) {
                        const absVx = Math.abs(vx);
                        const absVy = Math.abs(vy);

                        if (absVx > absVy * 1.2) {
                            // Player is moving mostly horizontally, assist vertical slide around corner
                            const slideDirY = ny !== 0 ? Math.sign(ny) : (vy !== 0 ? Math.sign(vy) : 1);
                            circle.y += slideDirY * overlap * 0.9;
                            circle.x += nx * overlap * 0.4;
                            // Preserve horizontal momentum
                            circle.vx = vx * 0.96;
                            circle.vy = (circle.vy || 0) + slideDirY * speed * 0.25;
                            return true;
                        } else if (absVy > absVx * 1.2) {
                            // Player is moving mostly vertically, assist horizontal slide around corner
                            const slideDirX = nx !== 0 ? Math.sign(nx) : (vx !== 0 ? Math.sign(vx) : 1);
                            circle.x += slideDirX * overlap * 0.9;
                            circle.y += ny * overlap * 0.4;
                            // Preserve vertical momentum
                            circle.vy = vy * 0.96;
                            circle.vx = (circle.vx || 0) + slideDirX * speed * 0.25;
                            return true;
                        }
                    }
                }

                // Standard edge push circle out along normal
                circle.x += nx * overlap;
                circle.y += ny * overlap;

                // Dampen velocity pointing into the box
                const dot = (circle.vx || 0) * nx + (circle.vy || 0) * ny;
                if (dot < 0) {
                    circle.vx -= dot * nx;
                    circle.vy -= dot * ny;
                }
            }
            return true;
        }
        return false;
    }

    /**
     * Resolve Circle vs Circle collision (Push apart)
     */
    static resolveCircleCircle(c1, c2) {
        if (!c1 || !c2 || c1.isDead || c2.isDead) return false;
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const distSq = dx * dx + dy * dy;
        const minDist = c1.radius + c2.radius;

        if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Push both equally
            c1.x -= nx * overlap * 0.5;
            c1.y -= ny * overlap * 0.5;
            c2.x += nx * overlap * 0.5;
            c2.y += ny * overlap * 0.5;
            return true;
        }
        return false;
    }

    /**
     * Raycast vs AABB (Used for bullet trajectory, ricochets & line-of-sight)
     * @param {number} x1 - start x
     * @param {number} y1 - start y
     * @param {number} x2 - end x
     * @param {number} y2 - end y
     * @param {Object} box - {x, y, w, h}
     * @returns {Object|null} {hit: boolean, point: {x,y}, normal: {x,y}, t: number}
     */
    static raycastBox(x1, y1, x2, y2, box) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        let tmin = 0.0;
        let tmax = 1.0;
        let normalX = 0;
        let normalY = 0;

        // X axis slab
        if (Math.abs(dx) < 1e-8) {
            if (x1 < box.x || x1 > box.x + box.w) return null;
        } else {
            const invD = 1.0 / dx;
            let t1 = (box.x - x1) * invD;
            let t2 = (box.x + box.w - x1) * invD;
            let nx = -1;
            if (t1 > t2) {
                const tmp = t1; t1 = t2; t2 = tmp;
                nx = 1;
            }
            if (t1 > tmin) {
                tmin = t1;
                normalX = nx;
                normalY = 0;
            }
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return null;
        }

        // Y axis slab
        if (Math.abs(dy) < 1e-8) {
            if (y1 < box.y || y1 > box.y + box.h) return null;
        } else {
            const invD = 1.0 / dy;
            let t1 = (box.y - y1) * invD;
            let t2 = (box.y + box.h - y1) * invD;
            let ny = -1;
            if (t1 > t2) {
                const tmp = t1; t1 = t2; t2 = tmp;
                ny = 1;
            }
            if (t1 > tmin) {
                tmin = t1;
                normalX = 0;
                normalY = ny;
            }
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return null;
        }

        return {
            hit: true,
            point: { x: x1 + dx * tmin, y: y1 + dy * tmin },
            normal: { x: normalX, y: normalY },
            t: tmin
        };
    }

    /**
     * Check if a line between A and B is blocked by any obstacles (Line of Sight)
     */
    static hasLineOfSight(x1, y1, x2, y2, obstacles) {
        for (let i = 0; i < obstacles.length; i++) {
            const hit = this.raycastBox(x1, y1, x2, y2, obstacles[i]);
            if (hit && hit.t >= 0 && hit.t <= 1) {
                return false;
            }
        }
        return true;
    }
}

window.Physics = Physics;
