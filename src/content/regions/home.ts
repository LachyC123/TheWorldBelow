import { MapBuilder } from '../mapBuilder.ts';
import { Floor, WallStyle } from '../tiles.ts';
import type { RegionDef } from '../types.ts';
import { F, REGIONS } from '../ids.ts';
import { all, any, flag, not, px, seq } from '../cond.ts';

const m = new MapBuilder(18, 12).carve(1, 2, 16, 9, '.').carve(7, 5, 4, 3, 'r').set(8, 11, 'm');

export const home: RegionDef = {
  id: REGIONS.home,
  name: 'Home',
  biome: 'surface_town',
  map: m.rows(),
  legend: { '#': { wall: WallStyle.HOME }, '.': { floor: Floor.WOOD_A }, r: { floor: Floor.RUG }, m: { floor: Floor.WOOD_B } },
  ambient: [46, 50, 70],
  ambience: 'room',
  motes: 'dust',
  refuge: { id: 'refuge_home', entry: 'bed' },
  entries: {
    start: { tx: 4, ty: 3, face: 'down' },
    door: { tx: 8, ty: 10, face: 'up' },
    bed: { tx: 13, ty: 4, face: 'down' },
  },
  lights: [
    { id: 'home_table_lamp', x: px(12), y: px(3), radius: 110, color: [255, 196, 120], intensity: 1, flicker: 0.03 },
    { id: 'home_window', x: px(9), y: px(2), radius: 46, color: [120, 150, 200], intensity: 0.6 },
    { id: 'home_intercom', x: px(3), y: px(2), radius: 26, color: [255, 80, 60], intensity: 0.7, when: any(not(F.intercomAnswered), all(flag(F.relayReconnected), not(F.sliceComplete))) },
  ],
  entities: [
    { kind: 'prop', id: 'home_intercom', tx: 3, ty: 1, frame: 'intercom_0', wall: true, oy: -1, alt: { when: any(not(F.intercomAnswered), all(flag(F.relayReconnected), not(F.sliceComplete))), anim: seq('intercom', 2, 3) } },
    { kind: 'interact', id: 'home_intercom_use', tx: 3, ty: 2, verb: 'Answer', label: 'Intercom', action: 'intercom' },
    { kind: 'prop', id: 'home_window', tx: 9, ty: 1, frame: 'window_dark', wall: true, oy: -1 },
    { kind: 'prop', id: 'home_table', tx: 11, ty: 3, frame: 'table_lamp', solid: { w: 2, h: 1 }, glow: { radius: 22, color: [255, 200, 120], dx: 5, dy: -21 } },
    { kind: 'interact', id: 'home_note', tx: 11, ty: 4, w: 2, verb: 'Read', label: "Grandmother's note", action: 'read_home_note' },
    { kind: 'prop', id: 'home_bed', tx: 14, ty: 2, frame: 'bed', solid: { w: 2, h: 2 }, oy: 2 },
    { kind: 'interact', id: 'home_bed_rest', tx: 14, ty: 4, w: 2, verb: 'Rest', label: 'Bed', action: 'rest_refuge' },
    { kind: 'prop', id: 'home_shelf', tx: 1, ty: 2, frame: 'bookshelf', solid: { w: 2, h: 1 } },
    { kind: 'prop', id: 'home_chair', tx: 5, ty: 6, frame: 'armchair', solid: { w: 1, h: 1 } },
    { kind: 'exit', id: 'home_exit', tx: 8, ty: 11, w: 1, h: 1, auto: true, target: { region: REGIONS.street, entry: 'home_door' } },
  ],
};
