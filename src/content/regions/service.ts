import { MapBuilder } from '../mapBuilder.ts';
import { Floor, WallStyle } from '../tiles.ts';
import type { EntityDef, RegionDef } from '../types.ts';
import { F, REGIONS } from '../ids.ts';
import { flag, not, px } from '../cond.ts';

const m = new MapBuilder(48, 28)
  .carve(2, 2, 4, 3, '.')
  .carve(6, 3, 10, 2, '.')
  .carve(18, 2, 6, 5, ',')
  .carve(16, 4, 2, 1, '.')
  .carve(14, 5, 2, 7, '.')
  .carve(6, 12, 26, 13, 'k')
  .sprinkle('k', 'x', 11, 4)
  .carve(11, 15, 2, 2, '#')
  .carve(19, 13, 2, 2, '#')
  .carve(25, 13, 2, 2, '#')
  .carve(10, 21, 2, 2, '#')
  .carve(6, 19, 26, 1, '~')
  .carve(15, 19, 2, 1, 'g')
  .carve(28, 19, 2, 1, 'g')
  .carve(32, 16, 16, 2, '.')
  .carve(22, 25, 2, 3, ',')
  .carve(1, 14, 4, 5, 'k')
  .carve(5, 16, 1, 2, 'k')
  // amber-painted cable route: the slice's breadcrumb trail
  .hrun(4, 13, 4, 'h')
  .vrun(14, 4, 15, 'v')
  .set(14, 4, 'C')
  .set(14, 16, 'L')
  .hrun(15, 46, 16, 'h');

const entities: EntityDef[] = [
  { kind: 'prop', id: 'service_ladder', tx: 3, ty: 2, frame: 'hatch_open', floor: true },
  { kind: 'exit', id: 'service_to_laundry', tx: 3, ty: 2, w: 1, h: 1, auto: false, verb: 'Climb', label: 'Ladder up', target: { region: REGIONS.laundry, entry: 'hatch' } },
  { kind: 'prop', id: 'booth_bench', tx: 18, ty: 2, frame: 'workbench', solid: { w: 2, h: 1 } },
  { kind: 'prop', id: 'booth_locker', tx: 23, ty: 5, frame: 'locker', solid: { w: 1, h: 1 } },
  { kind: 'prop', id: 'booth_lamp', tx: 22, ty: 3, frame: 'refuge_lamp_off', solid: { w: 1, h: 1 }, alt: { when: flag(F.boothLampLit), frame: 'refuge_lamp_on' }, glow: { radius: 20, color: [255, 200, 120], dy: -22, when: flag(F.boothLampLit) } },
  { kind: 'interact', id: 'booth_lamp_light', tx: 22, ty: 3, reach: 26, verb: 'Light', label: 'Refuge lamp', action: 'restore_booth_lamp', hideWhen: flag(F.boothLampLit) },
  { kind: 'interact', id: 'booth_rest', tx: 22, ty: 3, reach: 26, verb: 'Rest', label: 'Relay booth', action: 'rest_refuge', when: flag(F.boothLampLit) },
  { kind: 'pickup', id: 'pickup_booth_bandage', tx: 19, ty: 5, item: 'bandage', amount: 1 },
  { kind: 'pickup', id: 'pickup_service_rounds_a', tx: 7, ty: 13, item: 'light_rounds', amount: 8 },
  { kind: 'pickup', id: 'pickup_service_rounds_b', tx: 8, ty: 23, item: 'light_rounds', amount: 12 },
  { kind: 'pickup', id: 'pickup_service_bandage_b', tx: 27, ty: 23, item: 'bandage', amount: 1 },
  { kind: 'prop', id: 'hall_pipe_a', tx: 8, ty: 11, frame: 'big_pipe', wall: true },
  { kind: 'prop', id: 'hall_pipe_b', tx: 23, ty: 11, frame: 'big_pipe', wall: true },
  { kind: 'prop', id: 'hall_pipe_c', tx: 18, ty: 24, frame: 'big_pipe', solid: { w: 4, h: 1 } },
  { kind: 'prop', id: 'hall_valve', tx: 9, ty: 12, frame: 'valve', solid: { w: 1, h: 1 } },
  { kind: 'trigger', id: 'service_dark_tip', tx: 14, ty: 11, w: 2, h: 1, action: 'tip_dark', once: true },
  { kind: 'trigger', id: 'service_hall_title', tx: 6, ty: 12, w: 26, h: 2, action: 'title:Cistern Hall', once: true },
  { kind: 'enemy', id: 'service_skitter_a', tx: 22, ty: 16, type: 'skitter', respawns: true },
  { kind: 'enemy', id: 'service_skitter_b', tx: 9, ty: 23, type: 'skitter', respawns: true },
  { kind: 'enemy', id: 'service_skitter_c', tx: 29, ty: 22, type: 'skitter', respawns: true },
  { kind: 'exit', id: 'service_south_frontier', tx: 22, ty: 27, w: 2, h: 1, auto: true, target: { region: 'gen:service_south', entry: 'from_parent' } },
  { kind: 'prop', id: 'service_junction_a', tx: 5, ty: 16, frame: 'junction_0', solid: { w: 1, h: 1 }, opaque: true, solidWhen: not(F.serviceJunctionOpen), anim: { frames: ['junction_0', 'junction_1', 'junction_2'], fps: 8 }, alt: { when: flag(F.serviceJunctionOpen), frame: 'junction_open' } },
  { kind: 'prop', id: 'service_junction_b', tx: 5, ty: 17, frame: 'junction_1', solid: { w: 1, h: 1 }, opaque: true, solidWhen: not(F.serviceJunctionOpen), anim: { frames: ['junction_1', 'junction_2', 'junction_0'], fps: 8 }, alt: { when: flag(F.serviceJunctionOpen), frame: 'junction_open' } },
  { kind: 'interact', id: 'service_junction_use', tx: 5, ty: 16, h: 2, reach: 14, verb: 'Disconnect', label: 'Live junction', action: `open_gate:${F.serviceJunctionOpen}`, when: { type: 'hasCapability', id: 'insulated_gloves' }, lockedText: 'junction_locked', hideWhen: flag(F.serviceJunctionOpen) },
  { kind: 'pickup', id: 'service_store_tonic', tx: 2, ty: 15, item: 'upgrade', amount: 1, ref: 'tonic_4' },
  { kind: 'pickup', id: 'service_store_curio', tx: 3, ty: 17, item: 'curio', amount: 1, ref: 'curio_rota_card' },
  { kind: 'pickup', id: 'service_store_shells', tx: 1, ty: 17, item: 'shells', amount: 6 },
  { kind: 'prop', id: 'service_store_shelf', tx: 4, ty: 14, frame: 'shelf_junk', solid: { w: 1, h: 1 } },
  { kind: 'exit', id: 'service_to_gallery', tx: 47, ty: 16, w: 1, h: 2, auto: true, target: { region: REGIONS.gallery, entry: 'west' } },
];

export const service: RegionDef = {
  id: REGIONS.service,
  name: 'Service Veins',
  biome: 'service_veins',
  map: m.rows(),
  legend: {
    '#': { wall: WallStyle.SERVICE },
    '.': { floor: Floor.CONCRETE_A },
    ',': { floor: Floor.CONCRETE_B },
    k: { floor: Floor.CONCRETE_A },
    x: { floor: Floor.CONCRETE_STAIN },
    '~': { water: true },
    g: { floor: Floor.GRATE },
    h: { floor: Floor.CABLE_H },
    v: { floor: Floor.CABLE_V },
    C: { floor: Floor.CABLE_CORNER },
    L: { floor: Floor.CABLE_H },
  },
  ambient: [24, 27, 37],
  ambience: 'tunnel',
  motes: 'dust',
  refuge: { id: 'refuge_relay_booth', entry: 'booth' },
  entries: {
    ladder: { tx: 3, ty: 3, face: 'down' },
    booth: { tx: 20, ty: 4, face: 'down' },
    east: { tx: 46, ty: 16, face: 'left' },
    south: { tx: 22, ty: 24, face: 'up' },
  },
  discoverTitle: 'Service Veins',
  lights: [
    { id: 'service_green_a', x: px(9), y: px(3), radius: 64, color: [120, 255, 190], intensity: 0.8 },
    { id: 'service_green_b', x: px(15), y: px(8), radius: 64, color: [120, 255, 190], intensity: 0.75, flicker: 0.1 },
    { id: 'service_green_c', x: px(37), y: px(16), radius: 64, color: [120, 255, 190], intensity: 0.8 },
    { id: 'service_green_d', x: px(45), y: px(16), radius: 64, color: [120, 255, 190], intensity: 0.75 },
    { id: 'service_ladder_spill', x: px(3), y: px(2), radius: 44, color: [255, 190, 120], intensity: 0.5 },
    { id: 'service_emergency', x: px(30), y: px(12), radius: 60, color: [255, 70, 50], intensity: 0.5, flicker: 0.35 },
    { id: 'service_store_glow', x: px(5), y: px(16), radius: 40, color: [150, 255, 220], intensity: 0.7, flicker: 0.5, when: not(F.serviceJunctionOpen) },
    { id: 'service_store_lamp', x: px(2), y: px(15), radius: 56, color: [255, 190, 120], intensity: 0.5, flicker: 0.2 },
    { id: 'service_south_light', x: px(22), y: px(25), radius: 50, color: [140, 190, 255], intensity: 0.5, flicker: 0.1 },
    { id: 'service_booth_lamp', x: px(22), y: px(3), radius: 104, color: [255, 196, 120], intensity: 1, flicker: 0.02, when: flag(F.boothLampLit) },
  ],
  entities,
};
