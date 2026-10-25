// Content validation (npm run validate:content): referential integrity, reachability,
// fair secrets and art references across the whole shipped content set.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { REGION_LIST, REGION_DEFS } from '../src/content/registry.ts';
import { DIALOGUE, JOURNAL } from '../src/content/story.ts';
import { F, REGIONS } from '../src/content/ids.ts';
import { Grid } from '../src/sim/grid.ts';
import { AUTHORED_SOCKETS, MANHOLES } from '../src/world/frontier.ts';
import type { Condition, RegionDef } from '../src/content/types.ts';

const atlas = (n: string): Record<string, unknown> => (JSON.parse(readFileSync(`public/assets/${n}.json`, 'utf8')) as { frames: Record<string, unknown> }).frames;
const PROPS = atlas('props');
const CHARS = atlas('chars');

/** Flood fill walkable cells (props stamped, all gates open) from a tile. */
function reach(def: RegionDef, sx: number, sy: number): Set<number> {
  const g = new Grid(def);
  for (const e of def.entities) if (e.kind === 'prop' && e.solid && !e.solidWhen) g.stamp(e.tx, e.ty, e.solid.w, e.solid.h, { block: true });
  const seen = new Set<number>();
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.pop()!;
    if (x! < 0 || y! < 0 || x! >= g.w || y! >= g.h) continue;
    const i = y! * g.w + x!;
    if (seen.has(i) || g.block[i]) continue;
    seen.add(i);
    q.push([x! + 1, y!], [x! - 1, y!], [x!, y! + 1], [x!, y! - 1]);
  }
  return seen;
}

function flagsIn(c: Condition | undefined, out: Set<string>): void {
  if (!c) return;
  if (c.type === 'flag') out.add(c.id);
  if (c.type === 'all' || c.type === 'any') c.conditions.forEach((x) => flagsIn(x, out));
}

describe('content registry', () => {
  it('maps are rectangular and every legend char resolves', () => {
    for (const r of REGION_LIST) expect(() => new Grid(r), r.id).not.toThrow();
  });

  it('entity IDs are globally unique', () => {
    const ids = REGION_LIST.flatMap((r) => r.entities.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every exit targets an existing region entry', () => {
    for (const r of REGION_LIST)
      for (const e of r.entities)
        if (e.kind === 'exit') {
          if (e.target.region.startsWith('gen:')) {
            const s = AUTHORED_SOCKETS[e.target.region.slice(4)];
            expect(s, `${r.id}:${e.id} socket`).toBeDefined();
            expect(s!.parentRegion).toBe(r.id);
            expect(r.entries[s!.parentEntry], `${r.id}:${e.id} return entry`).toBeDefined();
          } else if (e.target.region.startsWith('manhole:')) {
            const m = e.target.region.slice(8);
            expect(MANHOLES).toContain(m);
            expect(r.entries[`manhole_${m}`], `${r.id}:${e.id} manhole entry`).toBeDefined();
          } else {
            expect(REGION_DEFS[e.target.region], `${r.id}:${e.id}`).toBeDefined();
            expect(REGION_DEFS[e.target.region]!.entries[e.target.entry], `${r.id}:${e.id}`).toBeDefined();
          }
        }
  });

  it('dialogue and journal references exist', () => {
    for (const r of REGION_LIST)
      for (const e of r.entities) {
        if (e.kind === 'interact' && e.lockedText) expect(DIALOGUE[e.lockedText], e.id).toBeDefined();
        if (e.kind === 'exit' && e.lockedText) expect(DIALOGUE[e.lockedText], e.id).toBeDefined();
        if ((e.kind === 'interact' || e.kind === 'trigger') && e.action.startsWith('say:')) expect(DIALOGUE[e.action.slice(4)], e.id).toBeDefined();
        if (e.kind === 'pickup' && e.journal) expect(JOURNAL[e.journal], e.id).toBeDefined();
      }
  });

  it('prop and animation frames exist in the generated atlases', () => {
    for (const r of REGION_LIST)
      for (const e of r.entities) {
        if (e.kind !== 'prop') continue;
        const frames = [e.frame, ...(e.anim?.frames ?? [])];
        const alts = e.alt ? (Array.isArray(e.alt) ? e.alt : [e.alt]) : [];
        for (const a of alts) frames.push(...(a.frame ? [a.frame] : []), ...(a.anim?.frames ?? []));
        for (const f of frames) expect(PROPS[f], `${r.id}:${e.id} frame ${f}`).toBeDefined();
      }
    for (const n of ['player_down_idle_0', 'player_death_5', 'skitter_dead_4', 'leech_dead_3', 'keeper_dead_3', 'weapon_pump_shotgun']) expect(CHARS[n], n).toBeDefined();
  });
});

describe('reachability and fairness', () => {
  for (const r of REGION_LIST) {
    it(`${r.id}: entries, exits, interactions, pickups and enemies are reachable`, () => {
      const firstEntry = Object.values(r.entries)[0]!;
      const area = reach(r, firstEntry.tx, firstEntry.ty);
      const g = new Grid(r);
      const near = (tx: number, ty: number, w = 1, h = 1): boolean => {
        for (let y = ty - 1; y <= ty + h; y++) for (let x = tx - 1; x <= tx + w; x++) if (area.has(y * g.w + x)) return true;
        return false;
      };
      for (const [id, e] of Object.entries(r.entries)) expect(area.has(e.ty * g.w + e.tx), `entry ${id}`).toBe(true);
      for (const e of r.entities) {
        if (e.kind === 'exit' || e.kind === 'interact' || e.kind === 'trigger') expect(near(e.tx, e.ty, (e as { w?: number }).w ?? 1, (e as { h?: number }).h ?? 1), e.id).toBe(true);
        if (e.kind === 'pickup' || e.kind === 'enemy' || e.kind === 'target') expect(area.has(e.ty * g.w + e.tx), e.id).toBe(true);
      }
    });
  }

  it('every gate flag can be obtained through some authored action', () => {
    const setters: Record<string, string> = {
      [F.laundryHatchOpen]: 'open_hatch',
      [F.returnLiftPowered]: 'reconnect_relay',
      [F.maintenancePanelOpen]: 'open_panel',
      [F.galleryFanPowered]: 'fan_on',
      [F.boothLampLit]: 'restore_booth_lamp',
      [F.hasPistol]: 'pickup_service_pistol',
      [F.pipekeeperDefeated]: 'boss_pipekeeper',
      tmp_arena_sealed: 'pipekeeper_commit',
      [F.serviceJunctionOpen]: `open_gate:${F.serviceJunctionOpen}`,
      [F.pressureRouteOpen]: 'open_pressure_route',
      // manholes open when the player climbs a generated district's ladder (Game.onExit)
      manhole_a_open: 'street_manhole_a_exit',
      manhole_b_open: 'street_manhole_b_exit',
      manhole_c_open: 'street_manhole_c_exit',
    };
    const actions = new Set(REGION_LIST.flatMap((r) => r.entities.map((e) => ('action' in e ? e.action : e.id))));
    const gates = new Set<string>();
    for (const r of REGION_LIST)
      for (const e of r.entities) {
        if (e.kind === 'exit') flagsIn(e.gate, gates);
        if (e.kind === 'interact') flagsIn(e.when, gates);
        if (e.kind === 'prop') flagsIn(e.solidWhen, gates);
        if (e.kind === 'enemy') flagsIn(e.activeWhen, gates);
        if (e.kind === 'pickup') flagsIn(e.when, gates);
      }
    for (const g of gates) {
      expect(setters[g], `no known setter for gate ${g}`).toBeDefined();
      expect(actions.has(setters[g]!), `setter ${setters[g]} for ${g} not present in content`).toBe(true);
    }
  });

  it('humming wall clues are observable before the secret opens (no self-locked clue)', () => {
    const g = REGION_DEFS[REGIONS.gallery]!;
    const lint = g.entities.find((e) => e.id === 'gallery_lint_seen')!;
    const diagram = g.entities.find((e) => e.id === 'gallery_diagram_read')!;
    expect(lint.kind === 'trigger' && !('when' in lint)).toBe(true);
    expect(diagram.kind === 'interact' && diagram.when === undefined).toBe(true);
    expect(g.emitters?.some((em) => em.type === 'lint')).toBe(true);
  });

  it('the slice region graph is connected and the return shortcut exists', () => {
    const adj = new Map<string, Set<string>>();
    for (const r of REGION_LIST) for (const e of r.entities) if (e.kind === 'exit' && REGION_DEFS[e.target.region]) {
      if (!adj.has(r.id)) adj.set(r.id, new Set());
      adj.get(r.id)!.add(e.target.region);
    }
    const seen = new Set<string>([REGIONS.home]);
    const q = [REGIONS.home as string];
    while (q.length)
      for (const n of adj.get(q.pop()!) ?? [])
        if (!seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
    expect(seen.size).toBe(REGION_LIST.length);
    expect(adj.get(REGIONS.gallery)!.has(REGIONS.street)).toBe(true);
    expect(adj.get(REGIONS.street)!.has(REGIONS.gallery)).toBe(true);
  });
});
