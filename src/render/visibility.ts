// Visibility polygons against the light-blocking grid. Lights (torch, muzzle flash, lamps)
// are multiplied by these so they reveal the room they are in, never through walls.
import { TILE } from '../content/tiles.ts';
import type { Grid } from '../sim/grid.ts';

const EPS = 0.0006;

/**
 * Returns polygon vertices (flat x,y pairs) visible from (x,y) within radius.
 * With a cone (a0..a1, radians, a0<a1) the origin is included as the apex.
 */
export function visibilityPolygon(grid: Grid, layer: Uint8Array, x: number, y: number, radius: number, cone?: { a0: number; a1: number }, baseRays = 64): number[] {
  // Nudge out of a blocking cell (e.g. a lamp mounted on a wall face).
  if (grid.blocked(layer, Math.floor(x / TILE), Math.floor(y / TILE))) {
    if (!grid.blocked(layer, Math.floor(x / TILE), Math.floor((y + 9) / TILE))) y += 9;
    else return [];
  }
  const angles: number[] = [];
  const full = !cone;
  const a0 = cone ? cone.a0 : -Math.PI;
  const a1 = cone ? cone.a1 : Math.PI;
  const span = a1 - a0;
  const n = Math.max(8, Math.ceil(baseRays * (span / (Math.PI * 2))));
  for (let i = 0; i <= n; i++) angles.push(a0 + (span * i) / n);
  // Rays to the corners of nearby blocking cells give exact shadow edges.
  const tx0 = Math.max(0, Math.floor((x - radius) / TILE));
  const ty0 = Math.max(0, Math.floor((y - radius) / TILE));
  const tx1 = Math.min(grid.w - 1, Math.floor((x + radius) / TILE));
  const ty1 = Math.min(grid.h - 1, Math.floor((y + radius) / TILE));
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!grid.blocked(layer, tx, ty)) continue;
      // only cells with an exposed edge cast meaningful corners
      if (grid.blocked(layer, tx - 1, ty) && grid.blocked(layer, tx + 1, ty) && grid.blocked(layer, tx, ty - 1) && grid.blocked(layer, tx, ty + 1)) continue;
      for (const [cx, cy] of [[tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]] as const) {
        const px = cx * TILE;
        const py = cy * TILE;
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy > radius * radius * 1.05) continue;
        const a = Math.atan2(dy, dx);
        for (const off of [-EPS, EPS]) {
          let aa = a + off;
          if (!full) {
            aa = normaliseInto(aa, a0);
            if (aa < a0 || aa > a1) continue;
          }
          angles.push(aa);
        }
      }
    }
  angles.sort((p, q) => p - q);
  const out: number[] = [];
  if (!full) out.push(x, y);
  let lastA = -Infinity;
  for (const a of angles) {
    if (a - lastA < 1e-5) continue;
    lastA = a;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const hit = grid.ray(layer, x, y, dx, dy, radius);
    out.push(hit.x, hit.y);
  }
  return out;
}

function normaliseInto(a: number, a0: number): number {
  while (a < a0) a += Math.PI * 2;
  while (a > a0 + Math.PI * 2) a -= Math.PI * 2;
  return a;
}
