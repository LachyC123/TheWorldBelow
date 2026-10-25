import { MapBuilder } from '../mapBuilder.ts';
import { Floor, WallStyle } from '../tiles.ts';
import type { EntityDef, RegionDef, StaticLight } from '../types.ts';
import { F, OBS, REGIONS } from '../ids.ts';
import { flag, not, px, seq } from '../cond.ts';

// The Tidal Platform: the line's last stop opens onto an underground sea. The scale changes:
// steps cut for something forty times your height, a door in the cliff you cannot see the top
// of, and across the water a lit town stacked on itself. Local rule: THE TIDE. Every low tide
// exposes the near shoals; every third ebb (the spring ebb) drains the causeway to the door.
const W = 64;
const H = 46;
const m = new MapBuilder(W, H)
  // Platform Zero
  .carve(26, 2, 16, 4, '.')
  .hrun(26, 41, 6, 'e')
  // shaft ledge (route B arrives here in the dark)
  .carve(46, 2, 8, 3, 'r')
  .carve(42, 4, 4, 2, 'r')
  // giant steps descending to the shore
  .carve(20, 7, 28, 10, 'R')
  // beach
  .carve(14, 17, 45, 4, 'S')
  .hrun(14, 58, 21, 's')
  // sea (everything south of the beach), and the pool beneath the great door
  .carve(0, 22, W, H - 23, '~')
  .carve(0, 9, 14, 13, '~')
  // shingle spit running toward the door
  .carve(12, 15, 2, 7, 'h')
  // low-tide shoal (every ebb) and the spring causeway (every third ebb)
  .carve(6, 17, 6, 2, '1')
  .carve(4, 10, 2, 9, '2')
  .carve(3, 9, 3, 1, '2')
  // the pier
  .carve(44, 22, 3, 9, 'p')
  .hrun(44, 46, 31, 'q');

const crabs: Array<[number, number]> = [[4, 11], [5, 14], [4, 17], [8, 18], [10, 17]];
const steps: EntityDef[] = [];
for (const ty of [9, 12, 15]) for (let tx = 20; tx < 48; tx += 4) steps.push({ kind: 'prop', id: `tidal_step_${tx}_${ty}`, tx, ty, frame: 'giant_step', floor: true, ox: 24 });

const platformLamps: StaticLight[] = [28, 34, 40].map((x, i) => ({
  id: `tidal_platform_lamp_${i}`,
  x: px(x),
  y: px(3),
  radius: 84,
  color: [255, 236, 190],
  intensity: 0.85,
  when: flag(F.section9Live),
}));

const entities: EntityDef[] = [
  // --- Platform Zero and its lift
  { kind: 'prop', id: 'tidal_lift', tx: 31, ty: 1, frame: 'lift_zero_closed', wall: true, ox: 8, alt: { when: flag(F.section9Live), frame: 'lift_zero_open' } },
  { kind: 'exit', id: 'tidal_lift_up', tx: 31, ty: 2, w: 2, h: 1, auto: false, verb: 'Ride', label: 'Lift up to Last Platform', gate: flag(F.section9Live), lockedText: 'zero_dead_below', target: { region: REGIONS.station, entry: 'lift' } },
  { kind: 'prop', id: 'tidal_roundel', tx: 37, ty: 1, frame: 'station_roundel', wall: true, ox: 8, oy: -1 },
  { kind: 'prop', id: 'tidal_bench', tx: 27, ty: 3, frame: 'platform_bench', solid: { w: 2, h: 1 } },
  { kind: 'pickup', id: 'pickup_tidal_shells', tx: 40, ty: 3, item: 'shells', amount: 6 },
  // --- the shaft ledge
  { kind: 'prop', id: 'tidal_shaft_ladder', tx: 52, ty: 1, frame: 'ladder_up', wall: true },
  { kind: 'exit', id: 'tidal_shaft_up', tx: 52, ty: 2, w: 1, h: 1, auto: false, verb: 'Climb', label: 'Lift-shaft ladder', target: { region: REGIONS.station, entry: 'shaft_top' } },
  { kind: 'enemy', id: 'tidal_shaft_leech', tx: 47, ty: 3, type: 'leech', respawns: true },
  { kind: 'enemy', id: 'tidal_shaft_leech_b', tx: 43, ty: 5, type: 'leech', respawns: true },
  // --- arrival: the scale of the place, introduced from the top of the steps
  { kind: 'trigger', id: 'tidal_first_sight', tx: 14, ty: 18, w: 45, h: 1, action: 'reveal_stacks', once: true },
  ...steps,
  { kind: 'prop', id: 'tidal_growth_a', tx: 21, ty: 8, frame: 'glow_growth_0', anim: seq('glow_growth', 2, 1), glow: { radius: 12, color: [120, 255, 200], dy: -8 } },
  { kind: 'prop', id: 'tidal_growth_b', tx: 45, ty: 11, frame: 'glow_growth_0', anim: seq('glow_growth', 2, 0.8), glow: { radius: 12, color: [120, 255, 200], dy: -8 } },
  { kind: 'prop', id: 'tidal_growth_c', tx: 30, ty: 14, frame: 'glow_growth_0', anim: seq('glow_growth', 2, 1.2), glow: { radius: 12, color: [120, 255, 200], dy: -8 } },
  { kind: 'pickup', id: 'pickup_tidal_bandage', tx: 46, ty: 8, item: 'bandage', amount: 1 },
  // --- the great door: built for something enormous; a hatch was cut into it much later, by hand
  { kind: 'prop', id: 'tidal_great_door', tx: 5, ty: 8, frame: 'giant_door', wall: true, ox: 10 },
  { kind: 'trigger', id: 'tidal_door_seen', tx: 12, ty: 15, w: 4, h: 7, action: `observe:${OBS.greatDoor}`, once: true },
  { kind: 'exit', id: 'tidal_hatch', tx: 4, ty: 9, w: 1, h: 1, auto: false, verb: 'Open', label: 'Hatch in the great door', target: { region: REGIONS.cellar, entry: 'cave' } },
  // --- the tide's instruments
  { kind: 'prop', id: 'tidal_gauge', tx: 11, ty: 15, frame: 'tide_gauge_0', alt: [{ when: flag('tmp_tide_spring'), frame: 'tide_gauge_2' }, { when: flag('tmp_tide_low'), frame: 'tide_gauge_1' }] },
  { kind: 'interact', id: 'tidal_gauge_read', tx: 12, ty: 15, reach: 18, verb: 'Read', label: 'Tide gauge', action: 'read_tide_gauge' },
  { kind: 'prop', id: 'tidal_bell', tx: 16, ty: 17, frame: 'tide_bell_0', solid: { w: 1, h: 1 }, alt: { when: flag('tmp_tide_bell'), anim: { frames: ['tide_bell_1', 'tide_bell_0', 'tide_bell_2', 'tide_bell_0'], fps: 6 } } },
  { kind: 'interact', id: 'tidal_bell_read', tx: 16, ty: 18, verb: 'Read', label: 'Bell plaque', action: `note:${OBS.tideBell}:bell_plaque` },
  ...crabs.map(([x, y], i): EntityDef => ({ kind: 'prop', id: `tidal_crab_${i}`, tx: x, ty: y, frame: 'crab_0', anim: seq('crab', 2, 2 + i * 0.3), glow: { radius: 12, color: [150, 255, 220], dy: -4 } })),
  { kind: 'trigger', id: 'tidal_crabs_seen', tx: 12, ty: 17, w: 2, h: 4, action: `observe:${OBS.crabs}`, once: true },
  { kind: 'pickup', id: 'pickup_tidal_curio', tx: 5, ty: 12, item: 'curio', amount: 1, ref: 'curio_bell_clapper' },
  // --- the shore
  { kind: 'prop', id: 'tidal_carriage', tx: 28, ty: 25, frame: 'drowned_carriage' },
  { kind: 'prop', id: 'tidal_nemi', tx: 43, ty: 19, frame: 'nemi_idle_0', solid: { w: 1, h: 1 }, anim: seq('nemi_idle', 2, 1), glow: { radius: 14, color: [255, 200, 120], dx: 7, dy: -8 } },
  { kind: 'interact', id: 'tidal_nemi_talk', tx: 43, ty: 19, reach: 22, verb: 'Talk', label: 'Nemi, ferry hand', action: 'talk_nemi' },
  { kind: 'prop', id: 'tidal_parcels', tx: 41, ty: 18, frame: 'parcels', solid: { w: 1, h: 1 } },
  { kind: 'interact', id: 'tidal_pier_end', tx: 45, ty: 31, reach: 18, verb: 'Read', label: 'Buoy marker', action: `note:${OBS.ferry}:buoy_marker` },
  ...[[43, 33], [47, 33], [40, 32], [50, 34]].map(([x, y], i): EntityDef => ({ kind: 'prop', id: `tidal_buoy_${i}`, tx: x!, ty: y!, frame: 'buoy_0', anim: seq('buoy', 3, 1.5 + i * 0.2), glow: { radius: 10, color: [255, 200, 120], dy: -18 } })),
  // the Shoreward Stacks: lit, enormous, unreachable from here
  { kind: 'prop', id: 'tidal_stacks', tx: 54, ty: 30, frame: 'stacks_vista_0', ox: 8, lit: true, anim: seq('stacks_vista', 4, 0.4) },
];

export const tidal: RegionDef = {
  id: REGIONS.tidal,
  name: 'Tidal Platform',
  biome: 'underground_sea',
  map: m.rows(),
  legend: {
    '#': { wall: WallStyle.CLIFF },
    '.': { floor: Floor.STATION_TILE },
    e: { floor: Floor.PLATFORM_EDGE },
    r: { floor: Floor.CAVE_ROCK },
    R: { floor: Floor.CAVE_ROCK },
    S: { floor: Floor.SAND },
    s: { floor: Floor.SAND_WET },
    h: { floor: Floor.SHINGLE },
    '1': { floor: Floor.GLOW_SAND, tidal: 1 },
    '2': { floor: Floor.GLOW_SAND, tidal: 2 },
    p: { floor: Floor.PIER },
    q: { floor: Floor.PIER_EDGE },
    '~': { water: true, deep: true },
  },
  ambient: [28, 36, 56],
  ambience: 'sea',
  motes: 'spores',
  tide: true,
  entries: {
    lift: { tx: 31, ty: 3, face: 'down' },
    shaft: { tx: 51, ty: 3, face: 'left' },
    hatch: { tx: 4, ty: 10, face: 'down' },
  },
  discoverTitle: 'The Underground Sea',
  lights: [
    { id: 'tidal_platform_emergency', x: px(33), y: px(3), radius: 70, color: [255, 120, 80], intensity: 0.5, flicker: 0.2, when: not(F.section9Live) },
    ...platformLamps,
    { id: 'tidal_shaft_glim', x: px(52), y: px(2), radius: 32, color: [140, 190, 255], intensity: 0.35 },
    { id: 'tidal_steps_glow', x: px(33), y: px(11), radius: 120, color: [90, 150, 210], intensity: 0.35 },
    { id: 'tidal_beach_glow', x: px(24), y: px(19), radius: 110, color: [90, 150, 210], intensity: 0.4 },
    { id: 'tidal_beach_glow_b', x: px(50), y: px(19), radius: 110, color: [90, 150, 210], intensity: 0.4 },
    { id: 'tidal_door_glow', x: px(6), y: px(6), radius: 96, color: [120, 255, 200], intensity: 0.35, flicker: 0.05 },
    { id: 'tidal_nemi_lantern', x: px(44), y: px(19), radius: 72, color: [255, 200, 120], intensity: 0.9, flicker: 0.06 },
    { id: 'tidal_bell_lamp', x: px(16), y: px(16), radius: 56, color: [255, 200, 120], intensity: 0.6, flicker: 0.04 },
    { id: 'tidal_pier_lamp', x: px(45), y: px(30), radius: 56, color: [255, 200, 120], intensity: 0.6, flicker: 0.1 },
    { id: 'tidal_far_glow', x: px(55), y: px(28), radius: 130, color: [255, 190, 110], intensity: 0.35 },
  ],
  entities,
};
