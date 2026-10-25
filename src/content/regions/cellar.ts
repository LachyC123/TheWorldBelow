import { MapBuilder } from '../mapBuilder.ts';
import { Floor, WallStyle } from '../tiles.ts';
import type { RegionDef } from '../types.ts';
import { F, REGIONS } from '../ids.ts';
import { flag, px, seq } from '../cond.ts';

// Edda's cellar: the room under the house you grew up in, reached from the sea. The trapdoor
// above is bolted from this side: drawing the bolts makes the sea a shortcut from home.
const m = new MapBuilder(20, 15)
  .carve(2, 2, 16, 6, 'c')
  .carve(3, 8, 2, 6, 'R')
  .carve(5, 11, 2, 2, 'R');

export const cellar: RegionDef = {
  id: REGIONS.cellar,
  name: "Edda's Cellar",
  biome: 'surface_town',
  map: m.rows(),
  legend: {
    '#': { wall: WallStyle.BRICK },
    c: { floor: Floor.CELLAR_FLOOR },
    R: { floor: Floor.CAVE_ROCK },
  },
  ambient: [40, 36, 40],
  ambience: 'room',
  motes: 'dust',
  entries: {
    cave: { tx: 3, ty: 12, face: 'up' },
    stair: { tx: 15, ty: 3, face: 'down' },
  },
  discoverTitle: "Edda's Cellar",
  lights: [
    { id: 'cellar_candle_a', x: px(7), y: px(2), radius: 80, color: [255, 190, 110], intensity: 0.95, flicker: 0.08 },
    { id: 'cellar_candle_b', x: px(13), y: px(5), radius: 64, color: [255, 190, 110], intensity: 0.7, flicker: 0.1 },
    { id: 'cellar_cave', x: px(4), y: px(12), radius: 48, color: [120, 255, 200], intensity: 0.4 },
    { id: 'cellar_stair_spill', x: px(15), y: px(2), radius: 40, color: [255, 196, 120], intensity: 0.5, when: flag(F.homeTrapdoorOpen) },
  ],
  entities: [
    { kind: 'exit', id: 'cellar_to_sea', tx: 3, ty: 13, w: 2, h: 1, auto: true, target: { region: REGIONS.tidal, entry: 'hatch' } },
    { kind: 'prop', id: 'cellar_desk', tx: 6, ty: 2, frame: 'edda_desk', solid: { w: 2, h: 1 } },
    { kind: 'interact', id: 'cellar_letter', tx: 6, ty: 3, w: 2, verb: 'Read', label: 'Letter on the desk', action: 'read_edda_letter' },
    { kind: 'prop', id: 'cellar_maps', tx: 11, ty: 1, frame: 'map_wall', wall: true, ox: 8, oy: 1 },
    { kind: 'interact', id: 'cellar_maps_read', tx: 11, ty: 2, w: 2, verb: 'Study', label: 'Maps and string', action: 'say:cellar_maps' },
    { kind: 'prop', id: 'cellar_rack', tx: 2, ty: 2, frame: 'wine_rack', solid: { w: 1, h: 1 }, ox: 4 },
    { kind: 'prop', id: 'cellar_candle_prop_a', tx: 8, ty: 2, frame: 'candle_0', anim: seq('candle', 2, 5), oy: -14 },
    { kind: 'prop', id: 'cellar_candle_prop_b', tx: 13, ty: 5, frame: 'candle_0', anim: seq('candle', 2, 4) },
    { kind: 'pickup', id: 'pickup_cellar_curio', tx: 9, ty: 4, item: 'curio', amount: 1, ref: 'curio_tide_table' },
    { kind: 'pickup', id: 'pickup_cellar_bandage', tx: 16, ty: 6, item: 'bandage', amount: 1 },
    { kind: 'pickup', id: 'pickup_cellar_rounds', tx: 3, ty: 6, item: 'light_rounds', amount: 12 },
    { kind: 'prop', id: 'cellar_stair', tx: 15, ty: 1, frame: 'cellar_stair', wall: true, oy: 4 },
    { kind: 'interact', id: 'cellar_bolts', tx: 15, ty: 2, verb: 'Draw', label: 'Trapdoor bolts', action: 'unbolt_trapdoor', hideWhen: flag(F.homeTrapdoorOpen), reach: 16 },
    { kind: 'exit', id: 'cellar_to_home', tx: 15, ty: 2, w: 1, h: 1, auto: false, verb: 'Climb', label: 'Stair to the house', gate: flag(F.homeTrapdoorOpen), target: { region: REGIONS.home, entry: 'trapdoor' } },
  ],
};
