// Collision, visibility and bullet-blocking grids for one region, plus DDA raycasting.
import type { RegionDef } from '../content/types.ts';
import { TILE } from '../content/tiles.ts';

export const Cell = { Floor: 0, Wall: 1, Water: 2, Void: 3 } as const;

export interface RayHit {
  x: number;
  y: number;
  /** distance travelled in px */
  dist: number;
  hit: boolean;
  /** cell coordinates of the blocking cell */
  cx: number;
  cy: number;
}

export class Grid {
  readonly w: number;
  readonly h: number;
  readonly cells: Uint8Array;
  /** cannot be walked through (walls, water, solid props, closed gates) */
  readonly block: Uint8Array;
  /** stops bullets and creature line of sight */
  readonly shot: Uint8Array;
  /** stops light */
  readonly light: Uint8Array;
  private readonly staticBlock: Uint8Array;
  private readonly staticShot: Uint8Array;
  private readonly staticLight: Uint8Array;
  /** tidal class per cell (0 = dry land, 1 = every low tide, 2 = spring ebb only) */
  readonly tidal: Uint8Array;
  readonly hasTide: boolean;
  /** cells with tidal class above this level are under water */
  tideLevel = 0;
  /** bumped whenever dynamic geometry changes (light caches key on this) */
  revision = 0;

  constructor(def: RegionDef) {
    this.h = def.map.length;
    this.w = def.map[0]!.length;
    const n = this.w * this.h;
    this.cells = new Uint8Array(n);
    this.tidal = new Uint8Array(n);
    let tide = false;
    for (let y = 0; y < this.h; y++) {
      const row = def.map[y]!;
      if (row.length !== this.w) throw new Error(`${def.id}: row ${y} has length ${row.length}, expected ${this.w}`);
      for (let x = 0; x < this.w; x++) {
        const cd = def.legend[row[x]!];
        if (!cd) throw new Error(`${def.id}: unknown legend char '${row[x]}' at ${x},${y}`);
        this.cells[y * this.w + x] = 'wall' in cd ? Cell.Wall : 'water' in cd ? Cell.Water : 'void' in cd ? Cell.Void : Cell.Floor;
        if ('floor' in cd && cd.tidal) {
          this.tidal[y * this.w + x] = cd.tidal;
          tide = true;
        }
      }
    }
    this.hasTide = tide;
    this.staticBlock = new Uint8Array(n);
    this.staticShot = new Uint8Array(n);
    this.staticLight = new Uint8Array(n);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const c = this.cells[i]!;
        this.staticBlock[i] = c === Cell.Floor ? 0 : 1;
        this.staticShot[i] = c === Cell.Wall ? 1 : 0;
        this.staticLight[i] = c === Cell.Wall && !this.isLightTransparentFront(x, y) ? 1 : 0;
      }
    this.block = new Uint8Array(this.staticBlock);
    this.shot = new Uint8Array(this.staticShot);
    this.light = new Uint8Array(this.staticLight);
  }

  isWall(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return true;
    return this.cells[y * this.w + x] === Cell.Wall;
  }

  /** Wall face visible from the south (rendered as a front). */
  isFront(x: number, y: number): boolean {
    return this.isWall(x, y) && y + 1 < this.h && !this.isWall(x, y + 1);
  }

  /**
   * Fronts of horizontal wall runs let light paint their faces; their tops still block.
   * Ends of vertical walls stay opaque so light cannot leak sideways between rooms.
   */
  private isLightTransparentFront(x: number, y: number): boolean {
    return this.isFront(x, y) && this.isWall(x, y - 1) && (this.isWall(x - 1, y) || this.isWall(x + 1, y));
  }

  /** Reset dynamic layers to static geometry; callers then stamp props/gates. */
  resetDynamic(): void {
    this.block.set(this.staticBlock);
    this.shot.set(this.staticShot);
    this.light.set(this.staticLight);
    if (this.hasTide) for (let i = 0; i < this.tidal.length; i++) if (this.tidal[i]! > this.tideLevel) this.block[i] = 1;
    this.revision++;
  }

  /** Is this walkable cell currently under the tide? */
  submerged(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return false;
    return this.tidal[ty * this.w + tx]! > this.tideLevel;
  }

  stamp(tx: number, ty: number, w: number, h: number, opts: { block?: boolean; shot?: boolean; light?: boolean }): void {
    for (let y = ty; y < ty + h; y++)
      for (let x = tx; x < tx + w; x++) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        const i = y * this.w + x;
        if (opts.block) this.block[i] = 1;
        if (opts.shot) this.shot[i] = 1;
        if (opts.light) this.light[i] = 1;
      }
  }

  blocked(layer: Uint8Array, tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    return layer[ty * this.w + tx] === 1;
  }

  /** Is an axis-aligned box (px) overlapping any blocked cell? */
  boxBlocked(x0: number, y0: number, x1: number, y1: number): boolean {
    const tx0 = Math.floor(x0 / TILE);
    const ty0 = Math.floor(y0 / TILE);
    const tx1 = Math.floor((x1 - 0.001) / TILE);
    const ty1 = Math.floor((y1 - 0.001) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.blocked(this.block, tx, ty)) return true;
    return false;
  }

  /**
   * Grid DDA raycast from (x0,y0) toward angle up to maxDist px against a layer.
   * Returns the exact boundary intersection, so light polygons align with walls.
   */
  ray(layer: Uint8Array, x0: number, y0: number, dx: number, dy: number, maxDist: number): RayHit {
    let cx = Math.floor(x0 / TILE);
    let cy = Math.floor(y0 / TILE);
    if (this.blocked(layer, cx, cy)) return { x: x0, y: y0, dist: 0, hit: true, cx, cy };
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const tDeltaX = dx !== 0 ? Math.abs(TILE / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(TILE / dy) : Infinity;
    let tMaxX = dx !== 0 ? ((dx > 0 ? (cx + 1) * TILE - x0 : x0 - cx * TILE) / Math.abs(dx)) : Infinity;
    let tMaxY = dy !== 0 ? ((dy > 0 ? (cy + 1) * TILE - y0 : y0 - cy * TILE) / Math.abs(dy)) : Infinity;
    for (let guard = 0; guard < 512; guard++) {
      let t: number;
      if (tMaxX < tMaxY) {
        t = tMaxX;
        tMaxX += tDeltaX;
        cx += stepX;
      } else {
        t = tMaxY;
        tMaxY += tDeltaY;
        cy += stepY;
      }
      if (t >= maxDist) break;
      if (this.blocked(layer, cx, cy)) return { x: x0 + dx * t, y: y0 + dy * t, dist: t, hit: true, cx, cy };
    }
    return { x: x0 + dx * maxDist, y: y0 + dy * maxDist, dist: maxDist, hit: false, cx, cy };
  }

  /** Clear line between two points on a layer. */
  clear(layer: Uint8Array, x0: number, y0: number, x1: number, y1: number): boolean {
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (d < 0.001) return true;
    return !this.ray(layer, x0, y0, (x1 - x0) / d, (y1 - y0) / d, d).hit;
  }
}
