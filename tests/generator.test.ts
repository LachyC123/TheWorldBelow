import { describe, expect, it } from 'vitest';
import { generateDistrict, validateDistrict, toRegionDef, type GenRequest, type SocketSpec } from '../src/world/generator.ts';
import { MODULES, moduleSize } from '../src/world/modules.ts';
import { KITS, type BiomeId } from '../src/world/kits.ts';
import { Frontier, AUTHORED_SOCKETS } from '../src/world/frontier.ts';
import { newGameData } from '../src/sim/gameData.ts';
import { World } from '../src/sim/world.ts';
import { TILE } from '../src/content/tiles.ts';
import { makeEnvelope, validateEnvelope, checksum } from '../src/save/envelope.ts';
import { AUTHORED_UNIQUES } from '../src/content/discoveries.ts';

const ledger = () => ({ seenModules: {}, uniques: [] as string[], names: [] as string[], manholesFree: ['a', 'b', 'c'], districts: 0 });
const sock = (id: string, biome: BiomeId, side: SocketSpec['entrySide'], depth = 1): SocketSpec => ({ socketId: id, biome, entrySide: side, parentRegion: 'region_service_001', parentEntry: 'south', depth });

describe('room modules', () => {
  for (const m of MODULES) {
    it(`${m.id} is rectangular and honours its door rule`, () => {
      const { w, h } = moduleSize(m);
      for (const r of m.rows) expect(r.length, m.id).toBe(w);
      const floorish = (ch: string): boolean => ch !== '#' && ch !== '~';
      const doors = m.doors ?? ['N', 'S', 'E', 'W'];
      const mx = Math.floor(w / 2);
      const my = Math.floor(h / 2);
      for (const d of doors) {
        for (let k = -1; k <= 1; k++) {
          const ch = d === 'N' ? m.rows[0]![mx + k]! : d === 'S' ? m.rows[h - 1]![mx + k]! : d === 'W' ? m.rows[my + k]![0]! : m.rows[my + k]![w - 1]!;
          expect(floorish(ch), `${m.id} door ${d} offset ${k}`).toBe(true);
        }
      }
    });
  }
});

describe('district generation', () => {
  it('is deterministic for the same seed, socket and ledger', () => {
    const req: GenRequest = { worldSeed: 'det', socket: sock('s1', 'service_veins', 'N'), ledger: ledger() };
    expect(JSON.stringify(generateDistrict(req))).toBe(JSON.stringify(generateDistrict(req)));
  });

  it('produces valid, fair districts across 1,200 seeds, biomes, sides and depths', () => {
    const biomes = Object.keys(KITS) as BiomeId[];
    let n = 0;
    for (let i = 0; i < 100; i++)
      for (const b of biomes)
        for (const side of ['N', 'S', 'E', 'W'] as const) {
          const { record } = generateDistrict({ worldSeed: `w${i}`, socket: sock(`k${i}${side}`, b, side, 1 + (i % 5)), ledger: ledger() });
          expect(validateDistrict(record), record.id).toEqual([]);
          const exits = record.entities.filter((e) => e.kind === 'exit');
          expect(exits.some((e) => e.id.endsWith('_return'))).toBe(true);
          expect(exits.some((e) => e.id.includes('_frontier_'))).toBe(true);
          expect(record.childSockets.length).toBeGreaterThan(0);
          // the arrival spawn is clear and no creature waits on top of it
          const def = toRegionDef(record);
          const e = def.entries.from_parent!;
          const w = new World(def, newGameData(), { x: e.tx * TILE + 8, y: e.ty * TILE + 12, face: e.face });
          expect(w.boxOn(w.grid.block, w.player.x - 5, w.player.y - 6, w.player.x + 5, w.player.y)).toBe(false);
          for (const en of w.enemies) expect(Math.hypot(en.x - w.player.x, en.y - w.player.y)).toBeGreaterThan(100);
          n++;
        }
    expect(n).toBe(1200);
  });

  it('never places a unique find twice along a long chain of districts; the gloves always appear first', async () => {
    const data = newGameData();
    data.world.seed = 'chain-seed';
    const f = new Frontier();
    const queue = Object.keys(AUTHORED_SOCKETS);
    const placed: string[] = [];
    let first = true;
    while (queue.length && data.world.districts < 40) {
      const id = await f.resolve(data, queue.shift()!);
      const rec = data.world.generated[id]!;
      if (first) {
        expect(rec.entities.some((e) => e.kind === 'pickup' && e.item === 'insulated_gloves')).toBe(true);
        first = false;
      }
      for (const e of rec.entities) if (e.kind === 'pickup' && (e.ref || e.item === 'insulated_gloves')) placed.push(e.ref ?? e.item);
      queue.push(...rec.childSockets.map((s) => s.socketId));
    }
    expect(data.world.districts).toBe(40);
    expect(new Set(placed).size).toBe(placed.length);
    for (const u of AUTHORED_UNIQUES) expect(placed).not.toContain(u);
    // resolving the same socket again returns the committed district, never a new one
    const again = await f.resolve(data, 'service_south');
    expect(again).toBe(data.world.sockets.service_south);
    expect(data.world.districts).toBe(40);
    // landmark names are unique per world
    const lms = Object.values(data.world.generated).map((r) => r.landmark).filter(Boolean);
    expect(new Set(lms).size).toBe(lms.length);
  });
});

describe('saves with a generated frontier', () => {
  it('round-trips committed districts and rejects a tampered one', async () => {
    const data = newGameData();
    const f = new Frontier();
    const id = await f.resolve(data, 'gallery_east');
    const env = makeEnvelope('slot_1', data, null, { regionName: 'x', refugeName: 'y' });
    const ok = validateEnvelope(JSON.parse(JSON.stringify(env)));
    expect(ok.ok).toBe(true);
    const bad = JSON.parse(JSON.stringify(env));
    bad.data.world.generated[id].map[3] = 'Z'.repeat(bad.data.world.generated[id].map[3].length);
    bad.checksum = checksum(bad.data);
    expect(validateEnvelope(bad).ok).toBe(false);
  });

  it('migrates a version 1 save without losing progress', () => {
    const d = newGameData() as unknown as Record<string, unknown>;
    delete d.world;
    delete d.finds;
    (d.flags as Record<string, boolean>).intercom_answered = true;
    const v1 = { format: 'the-world-below-save', saveSchemaVersion: 1, gameBuild: 'old', contentManifestVersion: 1, worldId: 'w', rootSeed: 'r', generatorVersions: { base: 1 }, slotId: 'slot_1', revision: 3, createdAt: 'a', updatedAt: 'b', playSeconds: 1, summary: { regionName: 'Home', refugeName: 'Home' }, data: d, checksum: checksum(d as never) };
    const v = validateEnvelope(v1);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.migrated).toBe(true);
      expect(v.envelope.saveSchemaVersion).toBe(2);
      expect(v.envelope.data.flags.intercom_answered).toBe(true);
      expect(v.envelope.data.world.generated).toEqual({});
    }
  });
});
