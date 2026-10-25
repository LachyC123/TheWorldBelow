import { describe, expect, it } from 'vitest';
import { Grid } from '../src/sim/grid.ts';
import { visibilityPolygon } from '../src/render/visibility.ts';
import { buildTileLayers } from '../src/render/autotile.ts';
import { getRegion } from '../src/content/registry.ts';
import { REGIONS } from '../src/content/ids.ts';
import { TILE } from '../src/content/tiles.ts';
import type { RegionDef } from '../src/content/types.ts';
import { Floor, WallStyle } from '../src/content/tiles.ts';

const room: RegionDef = {
  id: 'test_room',
  name: 'test',
  biome: 'test',
  map: ['##########', '##########', '#...#....#', '#...#....#', '#...#....#', '##########'],
  legend: { '#': { wall: WallStyle.SERVICE }, '.': { floor: Floor.CONCRETE_A } },
  ambient: [0, 0, 0],
  ambience: 'tunnel',
  entries: { a: { tx: 1, ty: 3, face: 'down' } },
  lights: [],
  entities: [],
};

describe('light visibility', () => {
  it('a flash never lights the room on the other side of a wall', () => {
    const g = new Grid(room);
    const poly = visibilityPolygon(g, g.light, 2 * TILE + 8, 3 * TILE + 8, 200);
    for (let i = 0; i < poly.length; i += 2) expect(poly[i]!).toBeLessThanOrEqual(4 * TILE + 0.01);
  });

  it('cone lights include their apex and stay within the cone', () => {
    const g = new Grid(room);
    const poly = visibilityPolygon(g, g.light, 6 * TILE, 3 * TILE + 8, 100, { a0: -0.3, a1: 0.3 });
    expect(poly[0]).toBe(6 * TILE);
    for (let i = 2; i < poly.length; i += 2) expect(poly[i]!).toBeGreaterThanOrEqual(6 * TILE - 0.01);
  });

  it('horizontal wall fronts receive light, wall tops do not', () => {
    const g = new Grid(getRegion(REGIONS.service));
    // service corridor y=3..4 has a 2-thick north wall (top row 1 is opaque, front row 2 transparent)
    expect(g.light[2 * g.w + 8]).toBe(0);
    expect(g.light[1 * g.w + 8]).toBe(1);
  });

  it('autotiler produces a tile for every cell', () => {
    for (const id of Object.values(REGIONS)) {
      const def = getRegion(id);
      const g = new Grid(def);
      const t = buildTileLayers(def, g);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) expect(t.floor[y]![x]! >= 0 || t.walls[y]![x]! >= 0).toBe(true);
    }
  });
});
