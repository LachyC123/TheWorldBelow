// Low-resolution light mask composited over crisp world art with MULTIPLY.
// Ambient floor keeps navigation legible; lights are clipped to visibility polygons so a
// muzzle flash reveals the room it is in and never leaks through walls (docs/design/docs/06).
import type { Rgb } from '../content/types.ts';
import type { Grid } from '../sim/grid.ts';
import { visibilityPolygon } from './visibility.ts';

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: Rgb;
  intensity: number;
  cone?: { a0: number; a1: number };
  /** soft falloff exponent shaping (0.3 = broad, 0.6 = tight core) */
  core?: number;
}

export const LIGHT_SCALE = 1;

export class LightMap {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticKey = '';
  private grid: Grid | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 4;
    this.canvas.height = 4;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false })!;
  }

  /** Size for a view in world px. Returns true if the canvas changed size. */
  resize(viewW: number, viewH: number): boolean {
    const w = Math.ceil(viewW * LIGHT_SCALE) + 2;
    const h = Math.ceil(viewH * LIGHT_SCALE) + 2;
    if (w === this.canvas.width && h === this.canvas.height) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    return true;
  }

  setGrid(grid: Grid): void {
    this.grid = grid;
    this.staticKey = '';
  }

  /** Rebuild cached static lights when geometry or lamp states change. */
  updateStatic(key: string, lights: LightSource[]): void {
    if (!this.grid || key === this.staticKey) return;
    this.staticKey = key;
    const g = this.grid;
    const c = this.staticCanvas ?? document.createElement('canvas');
    c.width = Math.ceil(g.w * 16 * LIGHT_SCALE);
    c.height = Math.ceil(g.h * 16 * LIGHT_SCALE);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) this.drawLight(ctx, l, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    this.staticCanvas = c;
  }

  render(viewX: number, viewY: number, ambient: Rgb, dynamic: LightSource[]): void {
    const ctx = this.ctx;
    const ox = Math.floor(viewX) - 2;
    const oy = Math.floor(viewY) - 2;
    this.originX = ox;
    this.originY = oy;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgb(${ambient[0]},${ambient[1]},${ambient[2]})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    if (this.staticCanvas) ctx.drawImage(this.staticCanvas, -ox * LIGHT_SCALE, -oy * LIGHT_SCALE);
    for (const l of dynamic) {
      if (l.x + l.radius < ox || l.y + l.radius < oy || l.x - l.radius > ox + this.canvas.width / LIGHT_SCALE || l.y - l.radius > oy + this.canvas.height / LIGHT_SCALE) continue;
      this.drawLight(ctx, l, ox, oy);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  originX = 0;
  originY = 0;

  private drawLight(ctx: CanvasRenderingContext2D, l: LightSource, ox: number, oy: number): void {
    if (!this.grid || l.intensity <= 0.01) return;
    const poly = visibilityPolygon(this.grid, this.grid.light, l.x, l.y, l.radius, l.cone, l.radius > 90 ? 96 : 64);
    if (poly.length < 6) return;
    const s = LIGHT_SCALE;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo((poly[0]! - ox) * s, (poly[1]! - oy) * s);
    for (let i = 2; i < poly.length; i += 2) ctx.lineTo((poly[i]! - ox) * s, (poly[i + 1]! - oy) * s);
    ctx.closePath();
    ctx.clip();
    const cx = (l.x - ox) * s;
    const cy = (l.y - oy) * s;
    const r = l.radius * s;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const k = Math.min(1.6, l.intensity);
    const col = (m: number): string => `rgb(${Math.min(255, Math.round(l.color[0] * k * m))},${Math.min(255, Math.round(l.color[1] * k * m))},${Math.min(255, Math.round(l.color[2] * k * m))})`;
    const core = l.core ?? 0.4;
    g.addColorStop(0, col(1));
    g.addColorStop(core, col(0.62));
    g.addColorStop(Math.min(0.95, core + 0.35), col(0.22));
    g.addColorStop(1, 'rgb(0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }
}
