// Pooled cosmetic particles drawn as crisp pixel rects. Gameplay-critical signals never live
// here; this budget can shrink on low quality without hiding threats.
import type Phaser from 'phaser';

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  color: number;
  alpha: number;
  gravity: number;
  drag: number;
  bounce: number;
  /** fade alpha over life */
  fade: boolean;
  /** length of motion streak in px (rain, sparks) */
  streak: number;
  /** attractor (lint drawn into the wall) */
  ax: number;
  ay: number;
  attract: number;
  active: boolean;
}

export type ParticleLayer = 'floor' | 'air' | 'glow';

export class ParticlePool {
  private readonly pools: Record<ParticleLayer, Particle[]> = { floor: [], air: [], glow: [] };
  budget: number;
  private readonly gfx: Record<ParticleLayer, Phaser.GameObjects.Graphics>;

  constructor(gfx: Record<ParticleLayer, Phaser.GameObjects.Graphics>, budget: number) {
    this.gfx = gfx;
    this.budget = budget;
  }

  count(): number {
    let n = 0;
    for (const k of ['floor', 'air', 'glow'] as const) for (const p of this.pools[k]) if (p.active) n++;
    return n;
  }

  spawn(layer: ParticleLayer, init: Partial<Particle> & { x: number; y: number }): Particle | null {
    const pool = this.pools[layer];
    let p = pool.find((q) => !q.active);
    if (!p) {
      if (this.count() >= this.budget) return null;
      p = blank();
      pool.push(p);
    }
    Object.assign(p, blank(), init, { active: true });
    p.max = p.max || p.life;
    return p;
  }

  clear(): void {
    for (const k of ['floor', 'air', 'glow'] as const) for (const p of this.pools[k]) p.active = false;
  }

  update(dt: number): void {
    for (const k of ['floor', 'air', 'glow'] as const) {
      for (const p of this.pools[k]) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        if (p.attract > 0) {
          const dx = p.ax - p.x;
          const dy = p.ay - p.y;
          const d = Math.hypot(dx, dy) || 1;
          p.vx += (dx / d) * p.attract * dt;
          p.vy += (dy / d) * p.attract * dt;
          if (d < 3) p.life = Math.min(p.life, 0.05);
        }
        const drag = Math.pow(p.drag, dt * 60);
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gravity) {
          p.vz -= p.gravity * dt;
          p.z += p.vz * dt;
          if (p.z < 0) {
            p.z = 0;
            p.vz = -p.vz * p.bounce;
            p.vx *= 0.6;
            p.vy *= 0.6;
          }
        }
      }
    }
  }

  draw(): void {
    for (const k of ['floor', 'air', 'glow'] as const) {
      const g = this.gfx[k];
      g.clear();
      for (const p of this.pools[k]) {
        if (!p.active) continue;
        const a = p.fade ? p.alpha * Math.min(1, (p.life / p.max) * 1.6) : p.alpha;
        g.fillStyle(p.color, a);
        const x = Math.round(p.x);
        const y = Math.round(p.y - p.z);
        if (p.streak > 0) {
          const sp = Math.hypot(p.vx, p.vy) || 1;
          const n = Math.max(1, Math.round(p.streak));
          for (let i = 0; i < n; i++) g.fillRect(Math.round(x - (p.vx / sp) * i), Math.round(y - (p.vy / sp) * i), p.size, p.size);
        } else g.fillRect(x, y, p.size, p.size);
      }
    }
  }
}

function blank(): Particle {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 0, size: 1, color: 0xffffff, alpha: 1, gravity: 0, drag: 1, bounce: 0.3, fade: true, streak: 0, ax: 0, ay: 0, attract: 0, active: false };
}
