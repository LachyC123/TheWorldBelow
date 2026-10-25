// World-structure pass: the tide rule, the sea's no-drowning promise, and the authored
// reconnection from the generated storm drains into the station.
import { describe, expect, it } from 'vitest';
import { makeWorld, run } from './helpers.ts';
import { REGIONS } from '../src/content/ids.ts';
import { TILE } from '../src/content/tiles.ts';
import { getRegion } from '../src/content/registry.ts';
import { Grid } from '../src/sim/grid.ts';
import { TIDE_PERIOD, TIDE_OUT, TIDE_RISE, TIDE_BELL, SPRING_EVERY, tideAt } from '../src/sim/tide.ts';
import { generateDistrict, toRegionDef, validateDistrict } from '../src/world/generator.ts';
import { AUTHORED_SOCKETS } from '../src/world/frontier.ts';

describe('tide rule', () => {
  it('exposes the shoals every ebb and the causeway only every third ebb', () => {
    const levels = new Set<string>();
    for (let cycle = 0; cycle < SPRING_EVERY * 2; cycle++) {
      const low = tideAt(cycle * TIDE_PERIOD + (TIDE_OUT + TIDE_RISE) / 2);
      const high = tideAt(cycle * TIDE_PERIOD + 2);
      expect(high.level).toBe(0);
      expect(low.level).toBe(cycle % SPRING_EVERY === SPRING_EVERY - 1 ? 2 : 1);
      levels.add(`${cycle % SPRING_EVERY}:${low.level}`);
    }
    expect(levels.size).toBe(SPRING_EVERY);
  });

  it('rings the bell before the water returns, with time to walk ashore', () => {
    expect(TIDE_BELL).toBeLessThan(TIDE_RISE);
    expect(TIDE_RISE - TIDE_BELL).toBeGreaterThanOrEqual(5);
    // the spring window is long enough to walk the causeway and back several times
    expect(TIDE_RISE - TIDE_OUT).toBeGreaterThanOrEqual(15);
  });

  it('the great door hatch can only be reached on the spring ebb', () => {
    const def = getRegion(REGIONS.tidal);
    const hatch = def.entities.find((e) => e.id === 'tidal_hatch')!;
    const start = def.entries.lift!;
    const reachable = (level: number): boolean => {
      const g = new Grid(def);
      g.tideLevel = level;
      g.resetDynamic();
      const seen = new Uint8Array(g.w * g.h);
      const q = [start.ty * g.w + start.tx];
      while (q.length) {
        const i = q.pop()!;
        if (seen[i] || g.block[i]) continue;
        seen[i] = 1;
        const x = i % g.w;
        const y = (i / g.w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (x + dx >= 0 && y + dy >= 0 && x + dx < g.w && y + dy < g.h) q.push((y + dy) * g.w + x + dx);
      }
      return !!seen[hatch.ty * g.w + hatch.tx];
    };
    expect(reachable(0)).toBe(false);
    expect(reachable(1)).toBe(false);
    expect(reachable(2)).toBe(true);
  });

  it('never drowns the player: rising water carries you to dry ground unhurt', () => {
    // start on the spring causeway just before the water turns
    const w = makeWorld(REGIONS.tidal, 'hatch', (d) => {
      d.playSeconds = (SPRING_EVERY - 1) * TIDE_PERIOD + TIDE_RISE - 1;
    });
    const hp0 = w.data.hp;
    expect(w.grid.tideLevel).toBe(2);
    const ev = run(w, 2);
    expect(ev.some((e) => e.type === 'TideTurned')).toBe(true);
    expect(ev.some((e) => e.type === 'TideCarried')).toBe(true);
    expect(w.data.hp).toBe(hp0);
    const tx = Math.floor(w.player.x / TILE);
    const ty = Math.floor((w.player.y - 3) / TILE);
    expect(w.grid.tidal[ty * w.grid.w + tx]).toBe(0);
    expect(w.boxOn(w.grid.block, w.player.x - 5, w.player.y - 6, w.player.x + 5, w.player.y)).toBe(false);
  });

  it('warns with a bell event before the water rises', () => {
    const w = makeWorld(REGIONS.tidal, 'lift', (d) => {
      d.playSeconds = TIDE_BELL - 0.5;
    });
    const ev = run(w, 1);
    expect(ev.some((e) => e.type === 'TideBell')).toBe(true);
    expect(w.temp.tmp_tide_bell).toBe(true);
  });
});

describe('authored reconnection through the storm drains', () => {
  it('the first storm-drain district always gains a reachable grate into the station', () => {
    const spec = AUTHORED_SOCKETS.street_storm_drain!;
    for (let i = 0; i < 60; i++) {
      const { record } = generateDistrict({ worldSeed: `link${i}`, socket: spec, ledger: { seenModules: {}, uniques: [], names: [], manholesFree: ['a', 'b', 'c'], districts: 0 } });
      expect(validateDistrict(record), record.id).toEqual([]);
      const def = toRegionDef(record);
      const link = def.entities.find((e) => e.kind === 'exit' && e.target.region === REGIONS.station);
      expect(link, record.id).toBeDefined();
      expect(def.entries.link_station).toBeDefined();
      // derived, not stored: the committed record is untouched and the link is stable
      expect(record.entities.some((e) => e.id.includes('_link_'))).toBe(false);
      expect(JSON.stringify(toRegionDef(record).entries.link_station)).toBe(JSON.stringify(def.entries.link_station));
      // arriving from the station puts you on clear ground
      const e = def.entries.link_station!;
      const g = new Grid(def);
      expect(g.block[e.ty * g.w + e.tx]).toBe(0);
    }
  });

  it('other districts are not given a link', () => {
    const { record } = generateDistrict({ worldSeed: 'x', socket: AUTHORED_SOCKETS.service_south!, ledger: { seenModules: {}, uniques: [], names: [], manholesFree: [], districts: 0 } });
    expect(toRegionDef(record).entries.link_station).toBeUndefined();
  });
});
