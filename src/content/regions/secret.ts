import { MapBuilder } from '../mapBuilder.ts';
import { Floor, WallStyle } from '../tiles.ts';
import type { EntityDef, RegionDef } from '../types.ts';
import { F, REGIONS } from '../ids.ts';
import { flag, not, px } from '../cond.ts';

// The humming wall's hidden gallery: a narrow approach then the Pipekeeper's three-pillar arena.
const m = new MapBuilder(34, 24)
  .carve(3, 13, 2, 9, 'r')
  .carve(5, 13, 1, 2, 'r')
  .carve(6, 4, 24, 14, 'f')
  .sprinkle('f', 'R', 17, 9)
  .carve(11, 7, 2, 2, '#')
  .carve(23, 7, 2, 2, '#')
  .carve(17, 12, 2, 2, '#')
  .carve(30, 9, 3, 2, 'r');

const vents: Array<[number, number, 'a' | 'b']> = [
  [9, 6, 'a'], [15, 9, 'a'], [21, 15, 'a'], [27, 10, 'a'], [14, 15, 'a'],
  [9, 11, 'b'], [20, 6, 'b'], [27, 15, 'b'], [15, 5, 'b'], [22, 11, 'b'],
];

const entities: EntityDef[] = [
  { kind: 'exit', id: 'secret_to_gallery', tx: 3, ty: 21, w: 2, h: 1, auto: true, target: { region: REGIONS.gallery, entry: 'panel' } },
  { kind: 'prop', id: 'secret_gate', tx: 5, ty: 13, frame: 'door_metal_closed', solid: { w: 1, h: 2 }, opaque: true, solidWhen: flag('tmp_arena_sealed'), visibleWhen: flag('tmp_arena_sealed'), oy: 0 },
  { kind: 'prop', id: 'secret_gate_b', tx: 5, ty: 13, frame: 'door_metal_closed', visibleWhen: flag('tmp_arena_sealed'), oy: -16 },
  { kind: 'trigger', id: 'secret_commit', tx: 7, ty: 12, w: 2, h: 5, action: 'pipekeeper_commit', once: false },
  { kind: 'enemy', id: 'boss_pipekeeper', tx: 20, ty: 9, type: 'keeper', respawns: false },
  { kind: 'prop', id: 'secret_wheel', tx: 26, ty: 3, frame: 'wheel_0', wall: true, alt: { when: flag(F.pipekeeperWheelClosed), frame: 'wheel_2' } },
  { kind: 'interact', id: 'secret_wheel_turn', tx: 26, ty: 4, verb: 'Turn', label: 'Pressure wheel', action: 'turn_wheel', hideWhen: flag(F.pipekeeperWheelClosed) },
  ...vents.map(([x, y, g], i): EntityDef => ({ kind: 'vent', id: `secret_vent_${i}`, tx: x, ty: y, group: g })),
  { kind: 'pickup', id: 'reward_torch_lens', tx: 19, ty: 10, item: 'torch_lens', amount: 1, when: flag(F.pipekeeperDefeated) },
  { kind: 'pickup', id: 'reward_pressure_note', tx: 21, ty: 10, item: 'note', amount: 1, journal: 'journal_pressure_route', when: flag(F.pipekeeperDefeated) },
  { kind: 'pickup', id: 'reward_keeper_badge', tx: 17, ty: 9, item: 'curio', amount: 1, ref: 'curio_badge', when: flag(F.pipekeeperDefeated) },
  { kind: 'interact', id: 'secret_pressure_valves', tx: 32, ty: 9, h: 2, reach: 14, verb: 'Force', label: 'Seized valves', action: 'open_pressure_route', when: flag(F.pipekeeperDefeated), lockedText: 'pressure_keeper', hideWhen: flag(F.pressureRouteOpen) },
  { kind: 'exit', id: 'secret_pressure_exit', tx: 32, ty: 9, w: 1, h: 2, auto: false, verb: 'Enter', label: 'Pressure route', gate: flag(F.pressureRouteOpen), target: { region: REGIONS.gallery, entry: 'pressure' } },
  { kind: 'prop', id: 'secret_valve_a', tx: 31, ty: 8, frame: 'valve', wall: true },
  { kind: 'prop', id: 'secret_bench', tx: 7, ty: 4, frame: 'workbench', solid: { w: 2, h: 1 } },
  { kind: 'prop', id: 'secret_pipe', tx: 14, ty: 3, frame: 'big_pipe', wall: true },
  { kind: 'pickup', id: 'pickup_secret_shells', tx: 4, ty: 15, item: 'shells', amount: 4 },
  { kind: 'pickup', id: 'pickup_secret_bandage', tx: 3, ty: 17, item: 'bandage', amount: 1 },
];

export const secret: RegionDef = {
  id: REGIONS.secret,
  name: 'The Pipeworks',
  biome: 'service_veins',
  map: m.rows(),
  legend: {
    '#': { wall: WallStyle.RUST },
    r: { floor: Floor.RUST_FLOOR },
    f: { floor: Floor.CONCRETE_B },
    R: { floor: Floor.RUST_FLOOR },
  },
  ambient: [46, 36, 32],
  ambience: 'pipeworks',
  motes: 'dust',
  entries: { gap: { tx: 3, ty: 20, face: 'up' }, pressure: { tx: 30, ty: 9, face: 'left' } },
  discoverTitle: 'The Pipeworks',
  lights: [
    { id: 'secret_corridor', x: px(4), y: px(16), radius: 60, color: [255, 150, 90], intensity: 0.6, flicker: 0.2 },
    { id: 'secret_nw', x: px(8), y: px(5), radius: 80, color: [255, 150, 90], intensity: 0.55, flicker: 0.1 },
    { id: 'secret_ne', x: px(28), y: px(5), radius: 80, color: [255, 150, 90], intensity: 0.55 },
    { id: 'secret_s', x: px(18), y: px(16), radius: 90, color: [255, 150, 90], intensity: 0.5, flicker: 0.15 },
    { id: 'secret_reward', x: px(20), y: px(10), radius: 64, color: [170, 255, 220], intensity: 0.7, when: { type: 'all', conditions: [flag(F.pipekeeperDefeated), not(F.hummingWallResolved)] } },
  ],
  emitters: [{ id: 'secret_lint', type: 'lint', tx: 3, ty: 17, w: 2, h: 4, toX: px(4), toY: px(13), rate: 4 }],
  entities,
};
