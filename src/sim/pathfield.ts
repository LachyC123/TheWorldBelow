// Breadth-first distance field toward the player over walkable tiles. Cheap for slice-sized
// regions; creatures follow the gradient instead of attacking through walls.
import { TILE } from '../content/tiles.ts';
import type { Grid } from './grid.ts';

const UNREACHED = 32767;

export class PathField {
  readonly dist: Int16Array;
  private readonly grid: Grid;
  private tx = -1;
  private ty = -1;
  private dirty = true;
  private lastT = -1;
  private readonly queue: Int32Array;

  constructor(grid: Grid) {
    this.grid = grid;
    this.dist = new Int16Array(grid.w * grid.h).fill(UNREACHED);
    this.queue = new Int32Array(grid.w * grid.h);
  }

  invalidate(): void {
    this.dirty = true;
  }

  update(x: number, y: number, time: number): void {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!this.dirty && tx === this.tx && ty === this.ty) return;
    if (!this.dirty && time - this.lastT < 0.12) return;
    this.tx = tx;
    this.ty = ty;
    this.dirty = false;
    this.lastT = time;
    this.compute(tx, ty);
  }

  private compute(sx: number, sy: number): void {
    const { w, h, block } = this.grid;
    this.dist.fill(UNREACHED);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
    let head = 0;
    let tail = 0;
    const start = sy * w + sx;
    this.dist[start] = 0;
    this.queue[tail++] = start;
    while (head < tail) {
      const i = this.queue[head++]!;
      const x = i % w;
      const y = (i / w) | 0;
      const nd = this.dist[i]! + 1;
      for (const [ox, oy] of DIRS4) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (block[ni] || this.dist[ni]! <= nd) continue;
        this.dist[ni] = nd;
        this.queue[tail++] = ni;
      }
    }
  }

  distanceAt(x: number, y: number): number {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.grid.w || ty >= this.grid.h) return UNREACHED;
    return this.dist[ty * this.grid.w + tx]!;
  }

  /** Centre of the best neighbouring tile toward the player, or null if unreachable. */
  next(x: number, y: number): { x: number; y: number } | null {
    const { w, h, block } = this.grid;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return null;
    const here = this.dist[ty * w + tx]!;
    let best = here;
    let bx = -1;
    let by = -1;
    for (const [ox, oy] of DIRS8) {
      const nx = tx + ox;
      const ny = ty + oy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (ox !== 0 && oy !== 0 && (block[ty * w + nx] || block[ny * w + tx])) continue; // no corner cutting
      const d = this.dist[ny * w + nx]!;
      if (d < best) {
        best = d;
        bx = nx;
        by = ny;
      }
    }
    if (bx < 0) return here === UNREACHED ? null : { x: tx * TILE + 8, y: ty * TILE + 8 };
    return { x: bx * TILE + 8, y: by * TILE + 8 };
  }
}

const DIRS4: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
