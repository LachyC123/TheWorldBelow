import { MapBuilder } from '../mapBuilder.ts';
import { Floor, WallStyle } from '../tiles.ts';
import type { EntityDef, RegionDef } from '../types.ts';
import { F, REGIONS } from '../ids.ts';
import { flag, px, seq } from '../cond.ts';

const m = new MapBuilder(24, 14)
  .carve(1, 2, 15, 11, '.')
  .carve(17, 2, 6, 9, ',')
  .set(16, 8, ',')
  .set(6, 13, 'm')
  .sprinkle('.', 'o', 2, 5);

const entities: EntityDef[] = [
  ...[2, 3, 4, 5].map((x): EntityDef => ({ kind: 'prop', id: `washer_n_${x}`, tx: x, ty: 2, frame: 'washer_0', solid: { w: 1, h: 1 }, anim: seq('washer', 3, 4 + x) })),
  ...[9, 10, 11].map((x): EntityDef => ({ kind: 'prop', id: `dryer_n_${x}`, tx: x, ty: 2, frame: 'dryer_0', solid: { w: 1, h: 1 }, anim: seq('dryer', 3, 3) })),
  ...[3, 4, 5, 6, 7, 8].map((x): EntityDef => ({ kind: 'prop', id: `washer_i_${x}`, tx: x, ty: 6, frame: 'washer_1', solid: { w: 1, h: 1 }, ...(x % 2 ? { anim: seq('washer', 3, 5) } : {}) })),
  { kind: 'prop', id: 'laundry_poster', tx: 7, ty: 1, frame: 'poster_0', wall: true, oy: -1 },
  { kind: 'prop', id: 'laundry_poster_b', tx: 13, ty: 1, frame: 'poster_1', wall: true, oy: -1 },
  { kind: 'prop', id: 'laundry_counter', tx: 11, ty: 10, frame: 'counter', solid: { w: 2, h: 1 } },
  { kind: 'prop', id: 'laundry_bench', tx: 3, ty: 10, frame: 'bench', solid: { w: 2, h: 1 } },
  { kind: 'prop', id: 'laundry_shelf', tx: 18, ty: 2, frame: 'shelf', solid: { w: 2, h: 1 } },
  { kind: 'interact', id: 'laundry_card', tx: 18, ty: 3, w: 2, verb: 'Read', label: 'Card on the shelf', action: 'read_laundry_card' },
  { kind: 'prop', id: 'laundry_crate_a', tx: 22, ty: 9, frame: 'crate', solid: { w: 1, h: 1 } },
  { kind: 'prop', id: 'laundry_crate_b', tx: 22, ty: 8, frame: 'crate', solid: { w: 1, h: 1 } },
  { kind: 'prop', id: 'laundry_hatch', tx: 20, ty: 6, frame: 'hatch_closed', floor: true, alt: { when: flag(F.laundryHatchOpen), frame: 'hatch_open' } },
  { kind: 'interact', id: 'laundry_hatch_lift', tx: 20, ty: 6, verb: 'Lift', label: 'Floor hatch', action: 'open_hatch', hideWhen: flag(F.laundryHatchOpen) },
  { kind: 'exit', id: 'laundry_to_service', tx: 20, ty: 6, w: 1, h: 1, auto: false, verb: 'Descend', label: 'Ladder', gate: flag(F.laundryHatchOpen), target: { region: REGIONS.service, entry: 'ladder' } },
  { kind: 'exit', id: 'laundry_to_street', tx: 6, ty: 13, w: 1, h: 1, auto: true, target: { region: REGIONS.street, entry: 'laundry_door' } },
  { kind: 'pickup', id: 'pickup_laundry_bandage', tx: 21, ty: 3, item: 'bandage', amount: 1 },
];

export const laundry: RegionDef = {
  id: REGIONS.laundry,
  name: 'Laundrette',
  biome: 'surface_town',
  map: m.rows(),
  legend: {
    '#': { wall: WallStyle.LAUNDRY },
    '.': { floor: Floor.CHECKER_A },
    o: { floor: Floor.CHECKER_B },
    ',': { floor: Floor.LINO },
    m: { floor: Floor.CHECKER_A },
  },
  ambient: [58, 66, 76],
  ambience: 'room',
  motes: 'dust',
  entries: {
    street_door: { tx: 6, ty: 12, face: 'up' },
    hatch: { tx: 20, ty: 7, face: 'down' },
  },
  discoverTitle: 'The Laundrette',
  lights: [
    { id: 'laundry_tube_a', x: px(4), y: px(4), radius: 86, color: [205, 255, 235], intensity: 0.95 },
    { id: 'laundry_tube_b', x: px(11), y: px(4), radius: 86, color: [205, 255, 235], intensity: 0.95, flicker: 0.04 },
    { id: 'laundry_tube_c', x: px(8), y: px(10), radius: 86, color: [205, 255, 235], intensity: 0.85 },
    { id: 'laundry_back_bulb', x: px(20), y: px(4), radius: 76, color: [255, 190, 120], intensity: 0.8, flicker: 0.3 },
  ],
  entities,
};
