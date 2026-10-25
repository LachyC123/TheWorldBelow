import { MapBuilder } from '../mapBuilder.ts';
import { Floor, WallStyle } from '../tiles.ts';
import type { EntityDef, RegionDef, StaticLight } from '../types.ts';
import { F, OBS, REGIONS } from '../ids.ts';
import { flag, px } from '../cond.ts';

const W = 46;
const m = new MapBuilder(W, 22)
  .carve(1, 4, W - 2, 1, 's')
  .carve(1, 5, W - 2, 1, 'c')
  .carve(1, 6, W - 2, 5, 'a')
  .hrun(3, W - 3, 8, 'a')
  .carve(1, 11, W - 2, 2, 's')
  .carve(34, 13, 3, 1, 'g')
  .carve(32, 14, 12, 6, 'g')
  .sprinkle('a', 'w', 3, 1)
  .sprinkle('a', 'p', 23, 2)
  .sprinkle('s', 'S', 4, 3)
  .set(35, 10, 'd');
for (let x = 4; x < W - 3; x += 3) m.set(x, 8, 'l');

const windows: Array<[number, string]> = [
  [3, 'window_lit_1'], [7, 'window_lit_0'], [10, 'window_lit_2'], [12, 'window_dark'], [14, 'window_lit_0'], [17, 'window_lit_1'],
  [19, 'window_lit_0'], [20, 'window_lit_0'], [24, 'window_lit_0'], [25, 'window_lit_0'],
  [36, 'window_dark'], [38, 'window_lit_2'], [41, 'window_lit_0'], [43, 'window_lit_1'],
];

const lights: StaticLight[] = [
  { id: 'lamp_a', x: px(9), y: px(4), radius: 92, color: [255, 186, 110], intensity: 0.95, flicker: 0.02 },
  { id: 'lamp_b', x: px(26), y: px(4), radius: 92, color: [255, 186, 110], intensity: 0.95 },
  { id: 'lamp_c', x: px(40), y: px(4), radius: 92, color: [255, 186, 110], intensity: 0.8, flicker: 0.12 },
  { id: 'laundrette_spill', x: px(22), y: px(4) + 4, radius: 70, color: [170, 255, 220], intensity: 0.8 },
  { id: 'yard_bulb', x: px(38), y: px(15), radius: 96, color: [255, 200, 130], intensity: 0.9, flicker: 0.05 },
  ...windows
    .filter(([, f]) => f !== 'window_dark')
    .map(([x, f]): StaticLight => ({ id: `win_${x}`, x: px(x), y: px(4) - 2, radius: 38, color: f === 'window_lit_0' && x >= 19 && x <= 25 ? [170, 255, 220] : [255, 190, 110], intensity: 0.7 })),
];

const entities: EntityDef[] = [
  ...windows.map(([x, f]): EntityDef => ({ kind: 'prop', id: `street_window_${x}`, tx: x, ty: 3, frame: f, wall: true, oy: -1 })),
  { kind: 'prop', id: 'home_front_door', tx: 5, ty: 3, frame: 'door_wood_closed', wall: true },
  { kind: 'exit', id: 'street_to_home', tx: 5, ty: 4, w: 1, h: 1, auto: false, verb: 'Enter', label: 'Home', target: { region: REGIONS.home, entry: 'door' } },
  { kind: 'prop', id: 'laundrette_door', tx: 22, ty: 3, frame: 'door_glass_closed', wall: true },
  { kind: 'prop', id: 'laundrette_sign', tx: 22, ty: 2, frame: 'laundrette_sign', wall: true, oy: 9, glow: { radius: 34, color: [140, 255, 200], dy: -7 } },
  { kind: 'exit', id: 'street_to_laundry', tx: 22, ty: 4, w: 1, h: 1, auto: false, verb: 'Enter', label: 'Laundrette', target: { region: REGIONS.laundry, entry: 'street_door' } },
  { kind: 'prop', id: 'street_lift_door', tx: 30, ty: 3, frame: 'lift_door_0', wall: true, ox: 8, alt: { when: flag(F.returnLiftPowered), frame: 'lift_door_3' } },
  { kind: 'prop', id: 'street_lift_panel', tx: 32, ty: 3, frame: 'lift_panel_off', wall: true, oy: -2, alt: { when: flag(F.returnLiftPowered), frame: 'lift_panel_on' } },
  { kind: 'exit', id: 'street_lift', tx: 30, ty: 4, w: 2, h: 1, auto: false, verb: 'Ride', label: 'Service lift', target: { region: REGIONS.gallery, entry: 'lift' }, gate: flag(F.returnLiftPowered), lockedText: 'lift_dead' },
  { kind: 'prop', id: 'street_lamp_a', tx: 9, ty: 4, frame: 'street_lamp', solid: { w: 1, h: 1 }, glow: { radius: 26, color: [255, 200, 120], dy: -41 } },
  { kind: 'prop', id: 'street_lamp_b', tx: 26, ty: 4, frame: 'street_lamp', solid: { w: 1, h: 1 }, glow: { radius: 26, color: [255, 200, 120], dy: -41 } },
  { kind: 'prop', id: 'street_lamp_c', tx: 40, ty: 4, frame: 'street_lamp', solid: { w: 1, h: 1 }, glow: { radius: 22, color: [255, 200, 120], dy: -41 } },
  { kind: 'prop', id: 'street_car', tx: 13, ty: 6, frame: 'car', solid: { w: 3, h: 2 }, glow: { radius: 10, color: [255, 220, 150], dx: 20, dy: -13 } },
  { kind: 'prop', id: 'street_bin_a', tx: 18, ty: 4, frame: 'bin', solid: { w: 1, h: 1 } },
  { kind: 'prop', id: 'street_bin_b', tx: 33, ty: 11, frame: 'bin', solid: { w: 1, h: 1 } },
  { kind: 'prop', id: 'street_bench', tx: 27, ty: 11, frame: 'bench', solid: { w: 2, h: 1 } },
  ...[[1, 6], [1, 8], [2, 7], [1, 10], [2, 9]].map(([x, y]): EntityDef => ({ kind: 'prop', id: `barrier_${x}_${y}`, tx: x!, ty: y!, frame: 'crate', solid: { w: 1, h: 1 } })),
  { kind: 'interact', id: 'street_barrier_sign', tx: 3, ty: 8, verb: 'Read', label: 'Barrier notice', action: 'say:street_barrier', reach: 22 },
  // Ivo's yard behind the shops
  { kind: 'prop', id: 'yard_crate_a', tx: 33, ty: 17, frame: 'crate', solid: { w: 1, h: 1 } },
  { kind: 'prop', id: 'yard_crate_b', tx: 33, ty: 18, frame: 'crate', solid: { w: 1, h: 1 } },
  { kind: 'prop', id: 'yard_fence', tx: 42, ty: 14, frame: 'fence' },
  { kind: 'prop', id: 'yard_fence_b', tx: 43, ty: 14, frame: 'fence' },
  { kind: 'pickup', id: 'pickup_service_pistol', tx: 35, ty: 17, item: 'service_pistol', amount: 1 },
  { kind: 'pickup', id: 'pickup_street_rounds', tx: 36, ty: 18, item: 'light_rounds', amount: 16 },
  { kind: 'target', id: 'tin_a', tx: 40, ty: 15 },
  { kind: 'target', id: 'tin_b', tx: 42, ty: 16 },
  { kind: 'target', id: 'tin_c', tx: 41, ty: 18 },
  { kind: 'target', id: 'tin_d', tx: 39, ty: 19 },
  { kind: 'enemy', id: 'street_drain_skitter', tx: 35, ty: 10, type: 'skitter', respawns: false, activeWhen: flag(F.hasPistol) },
  // Bracken Underground: boarded for forty years, the bar is on the inside
  { kind: 'prop', id: 'street_station_entrance', tx: 34, ty: 3, frame: 'entrance_boarded', wall: true, alt: { when: flag(F.stationStreetOpen), frame: 'entrance_open' } },
  { kind: 'interact', id: 'street_station_look', tx: 34, ty: 4, verb: 'Inspect', label: 'Boarded station entrance', action: `note:${OBS.boarded}:station_boarded`, hideWhen: flag(F.stationStreetOpen) },
  { kind: 'exit', id: 'street_to_station', tx: 34, ty: 4, w: 1, h: 1, auto: false, verb: 'Go down', label: 'Bracken Underground', gate: flag(F.stationStreetOpen), target: { region: REGIONS.station, entry: 'street' } },
  // ways down: an open storm drain and manholes bolted from below until opened from underneath
  { kind: 'prop', id: 'street_storm_drain', tx: 5, ty: 10, frame: 'manhole_open', floor: true },
  { kind: 'exit', id: 'street_storm_drain_exit', tx: 5, ty: 10, w: 1, h: 1, auto: false, verb: 'Climb down', label: 'Storm drain', gate: flag(F.hasPistol), lockedText: 'drain_unarmed', target: { region: 'gen:street_storm_drain', entry: 'from_parent' } },
  ...(['a', 'b', 'c'] as const).map((m, i): EntityDef[] => {
    const [x, y] = ([[11, 9], [24, 10], [41, 9]] as const)[i]!;
    return [
      { kind: 'prop', id: `street_manhole_${m}`, tx: x, ty: y, frame: 'manhole_closed', floor: true, alt: { when: flag(`manhole_${m}_open`), frame: 'manhole_open' } },
      { kind: 'exit', id: `street_manhole_${m}_exit`, tx: x, ty: y, w: 1, h: 1, auto: false, verb: 'Climb down', label: 'Manhole', gate: flag(`manhole_${m}_open`), lockedText: 'manhole_locked', target: { region: `manhole:${m}`, entry: 'ladder' } },
    ];
  }).flat(),
];

export const street: RegionDef = {
  id: REGIONS.street,
  name: 'Bracken',
  biome: 'surface_town',
  map: m.rows(),
  legend: {
    '#': { wall: WallStyle.BRICK },
    s: { floor: Floor.SIDEWALK_A },
    S: { floor: Floor.SIDEWALK_B },
    c: { floor: Floor.CURB },
    a: { floor: Floor.ASPHALT_A },
    w: { floor: Floor.ASPHALT_WET },
    p: { floor: Floor.PUDDLE },
    l: { floor: Floor.ROAD_LINE },
    d: { floor: Floor.DRAIN },
    g: { floor: Floor.GRAVEL },
  },
  ambient: [70, 78, 106],
  ambience: 'rain',
  rain: true,
  motes: 'none',
  entries: {
    home_door: { tx: 5, ty: 4, face: 'down' },
    laundry_door: { tx: 22, ty: 4, face: 'down' },
    lift: { tx: 30, ty: 4, face: 'down' },
    storm_drain: { tx: 6, ty: 9, face: 'down' },
    manhole_a: { tx: 12, ty: 9, face: 'down' },
    manhole_b: { tx: 25, ty: 10, face: 'down' },
    manhole_c: { tx: 42, ty: 9, face: 'down' },
    underground: { tx: 34, ty: 5, face: 'down' },
  },
  discoverTitle: 'Bracken',
  lights,
  entities,
};
