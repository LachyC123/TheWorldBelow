import { MapBuilder } from '../mapBuilder.ts';
import { Floor, WallStyle } from '../tiles.ts';
import type { EntityDef, RegionDef, StaticLight } from '../types.ts';
import { F, REGIONS } from '../ids.ts';
import { flag, px, seq } from '../cond.ts';

// Two-screen-wide pumping gallery: entry alcove, three pump cover masses, water channel,
// observable but unreachable balcony, the relay objective and the humming-wall secret.
const m = new MapBuilder(60, 30)
  .carve(0, 13, 6, 2, 'h')
  .carve(6, 6, 48, 20, '.')
  .sprinkle('.', ',', 5, 7)
  .carve(6, 20, 48, 2, '~')
  .carve(16, 20, 2, 2, 'g')
  .carve(44, 20, 2, 2, 'g')
  .carve(6, 13, 4, 2, 'z')
  .carve(24, 2, 14, 2, 'b')
  .hrun(6, 46, 14, 'h')
  .carve(29, 9, 2, 2, '#')
  .carve(54, 16, 6, 2, 'h')
  .carve(40, 26, 2, 4, ',');

const relayLamps: StaticLight[] = [12, 20, 28, 36, 44].map((x, i) => ({
  id: `gallery_relay_lamp_${i}`,
  x: px(x),
  y: px(6),
  radius: 84,
  color: [150, 255, 210],
  intensity: 0.75,
  when: flag(F.relayReconnected),
}));

const entities: EntityDef[] = [
  { kind: 'exit', id: 'gallery_to_service', tx: 0, ty: 13, w: 1, h: 2, auto: true, target: { region: REGIONS.service, entry: 'east' } },
  // Bright alcove before combat
  { kind: 'prop', id: 'alcove_bench', tx: 7, ty: 6, frame: 'workbench', solid: { w: 2, h: 1 } },
  { kind: 'pickup', id: 'pickup_gallery_bandage', tx: 8, ty: 8, item: 'bandage', amount: 1 },
  // Humming wall: fan, diagram, panel and the lint drawn into the seam
  {
    kind: 'prop', id: 'gallery_panel', tx: 11, ty: 5, frame: 'panel_closed', wall: true,
    alt: [{ when: flag(F.maintenancePanelOpen), frame: 'panel_open' }, { when: flag(F.galleryFanPowered), anim: { frames: ['panel_closed', 'panel_rattle'], fps: 12 } }],
  },
  { kind: 'prop', id: 'gallery_fan', tx: 13, ty: 5, frame: 'fan_0', wall: true, ox: 8, anim: seq('fan', 4, 1.5), alt: { when: flag(F.galleryFanPowered), anim: seq('fan', 4, 16) } },
  { kind: 'prop', id: 'gallery_diagram', tx: 16, ty: 5, frame: 'diagram', wall: true, oy: -1 },
  { kind: 'interact', id: 'gallery_diagram_read', tx: 16, ty: 6, verb: 'Read', label: 'Airflow diagram', action: 'read_diagram' },
  { kind: 'prop', id: 'gallery_fan_valve', tx: 17, ty: 6, frame: 'valve', solid: { w: 1, h: 1 } },
  { kind: 'interact', id: 'gallery_fan_start', tx: 17, ty: 6, reach: 24, verb: 'Open', label: 'Fan F-2 valve', action: 'fan_on', hideWhen: flag(F.galleryFanPowered) },
  { kind: 'interact', id: 'gallery_panel_open', tx: 11, ty: 6, verb: 'Pull', label: 'Maintenance panel', action: 'open_panel', when: flag(F.galleryFanPowered), lockedText: 'panel_locked', hideWhen: flag(F.maintenancePanelOpen) },
  { kind: 'exit', id: 'gallery_to_secret', tx: 11, ty: 6, w: 1, h: 1, auto: false, verb: 'Squeeze through', label: 'Maintenance gap', gate: flag(F.maintenancePanelOpen), target: { region: REGIONS.secret, entry: 'gap' } },
  { kind: 'trigger', id: 'gallery_lint_seen', tx: 8, ty: 6, w: 7, h: 3, action: 'observe_lint', once: true },
  // Cover masses
  { kind: 'prop', id: 'pump_1', tx: 20, ty: 12, frame: 'pump_0', solid: { w: 2, h: 2 }, opaque: true, anim: seq('pump', 4, 3) },
  { kind: 'prop', id: 'pump_2', tx: 34, ty: 15, frame: 'pump_0', solid: { w: 2, h: 2 }, opaque: true, anim: seq('pump', 4, 3.4) },
  { kind: 'prop', id: 'pump_3', tx: 41, ty: 9, frame: 'pump_0', solid: { w: 2, h: 2 }, opaque: true, anim: seq('pump', 4, 2.6) },
  // Unreachable balcony glimpsed above the north wall
  ...[24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37].map((x): EntityDef => ({ kind: 'prop', id: `balcony_rail_${x}`, tx: x, ty: 3, frame: 'railing', oy: 2 })),
  { kind: 'prop', id: 'balcony_locker', tx: 33, ty: 2, frame: 'locker', oy: 2 },
  { kind: 'prop', id: 'balcony_door', tx: 30, ty: 1, frame: 'door_metal_closed', wall: true },
  // Relay objective and return lift
  { kind: 'prop', id: 'gallery_relay', tx: 47, ty: 6, frame: 'relay_off', solid: { w: 2, h: 1 }, alt: { when: flag(F.relayReconnected), anim: seq('relay_on', 3, 6) }, glow: { radius: 18, color: [120, 255, 200], dy: -24, when: flag(F.relayReconnected) } },
  { kind: 'interact', id: 'gallery_relay_use', tx: 47, ty: 7, w: 2, verb: 'Reconnect', label: 'Gallery relay', action: 'reconnect_relay', hideWhen: flag(F.relayReconnected) },
  { kind: 'prop', id: 'gallery_lift_door', tx: 51, ty: 5, frame: 'lift_door_0', wall: true, ox: 8, alt: { when: flag(F.returnLiftPowered), frame: 'lift_door_3' } },
  { kind: 'prop', id: 'gallery_lift_panel', tx: 50, ty: 5, frame: 'lift_panel_off', wall: true, oy: -2, alt: { when: flag(F.returnLiftPowered), frame: 'lift_panel_on' } },
  { kind: 'exit', id: 'gallery_lift', tx: 51, ty: 6, w: 2, h: 1, auto: false, verb: 'Ride', label: 'Service lift up', gate: flag(F.returnLiftPowered), lockedText: 'lift_dead', target: { region: REGIONS.street, entry: 'lift' } },
  // South pump room across the channel
  { kind: 'prop', id: 'gallery_locker', tx: 25, ty: 22, frame: 'locker', solid: { w: 1, h: 1 } },
  { kind: 'prop', id: 'gallery_bench', tx: 27, ty: 22, frame: 'workbench', solid: { w: 2, h: 1 } },
  { kind: 'pickup', id: 'pickup_pump_shotgun', tx: 27, ty: 23, item: 'pump_shotgun', amount: 1 },
  { kind: 'pickup', id: 'pickup_gallery_shells', tx: 26, ty: 24, item: 'shells', amount: 8 },
  { kind: 'pickup', id: 'pickup_gallery_rounds', tx: 37, ty: 9, item: 'light_rounds', amount: 12 },
  { kind: 'pickup', id: 'pickup_gallery_shells_b', tx: 50, ty: 24, item: 'shells', amount: 4 },
  { kind: 'prop', id: 'gallery_crate_a', tx: 51, ty: 23, frame: 'crate', solid: { w: 1, h: 1 } },
  { kind: 'prop', id: 'gallery_crate_b', tx: 52, ty: 23, frame: 'crate', solid: { w: 1, h: 1 } },
  // Frontier: the gallery opens onto territory nobody has mapped
  { kind: 'exit', id: 'gallery_east_frontier', tx: 59, ty: 16, w: 1, h: 2, auto: true, target: { region: 'gen:gallery_east', entry: 'from_parent' } },
  { kind: 'exit', id: 'gallery_south_frontier', tx: 40, ty: 29, w: 2, h: 1, auto: true, target: { region: 'gen:gallery_south', entry: 'from_parent' } },
  // Pressure door: the shortcut from the Pipeworks, opened from the far side
  { kind: 'prop', id: 'gallery_pressure_door', tx: 36, ty: 5, frame: 'door_metal_closed', wall: true, alt: { when: flag(F.pressureRouteOpen), frame: 'door_metal_open' } },
  { kind: 'exit', id: 'gallery_pressure_exit', tx: 36, ty: 6, w: 1, h: 1, auto: false, verb: 'Enter', label: 'Pressure door', gate: flag(F.pressureRouteOpen), lockedText: 'pressure_locked', target: { region: REGIONS.secret, entry: 'pressure' } },
  // Threats
  { kind: 'enemy', id: 'gallery_skitter_a', tx: 26, ty: 9, type: 'skitter', respawns: true },
  { kind: 'enemy', id: 'gallery_skitter_b', tx: 38, ty: 17, type: 'skitter', respawns: true },
  { kind: 'enemy', id: 'gallery_skitter_c', tx: 33, ty: 24, type: 'skitter', respawns: true },
  { kind: 'enemy', id: 'gallery_leech_a', tx: 45, ty: 13, type: 'leech', respawns: true },
  { kind: 'enemy', id: 'gallery_leech_b', tx: 14, ty: 24, type: 'leech', respawns: true },
];

export const gallery: RegionDef = {
  id: REGIONS.gallery,
  name: 'Pumping Gallery',
  biome: 'service_veins',
  map: m.rows(),
  legend: {
    '#': { wall: WallStyle.GALLERY },
    '.': { floor: Floor.METAL_A },
    ',': { floor: Floor.METAL_B },
    z: { floor: Floor.METAL_HAZARD },
    '~': { water: true },
    g: { floor: Floor.GRATE },
    b: { floor: Floor.METAL_DARK },
    h: { floor: Floor.CABLE_H },
  },
  ambient: [36, 44, 52],
  ambience: 'gallery',
  motes: 'dust',
  entries: {
    west: { tx: 1, ty: 13, face: 'right' },
    lift: { tx: 51, ty: 7, face: 'down' },
    panel: { tx: 11, ty: 7, face: 'down' },
    east: { tx: 57, ty: 16, face: 'left' },
    south: { tx: 40, ty: 25, face: 'up' },
    pressure: { tx: 36, ty: 7, face: 'down' },
  },
  discoverTitle: 'Pumping Gallery',
  lights: [
    { id: 'gallery_work_lamp', x: px(8), y: px(7), radius: 104, color: [255, 196, 120], intensity: 1 },
    { id: 'gallery_green_a', x: px(24), y: px(6), radius: 64, color: [120, 255, 190], intensity: 0.75, flicker: 0.1 },
    { id: 'gallery_green_b', x: px(40), y: px(6), radius: 64, color: [120, 255, 190], intensity: 0.75 },
    { id: 'gallery_green_c', x: px(32), y: px(12), radius: 70, color: [120, 255, 190], intensity: 0.6, flicker: 0.08 },
    { id: 'gallery_green_d', x: px(48), y: px(14), radius: 64, color: [120, 255, 190], intensity: 0.6 },
    { id: 'gallery_channel', x: px(30), y: px(19), radius: 80, color: [90, 160, 220], intensity: 0.5 },
    { id: 'gallery_balcony', x: px(31), y: px(2), radius: 60, color: [150, 255, 220], intensity: 0.6, flicker: 0.2 },
    { id: 'gallery_south', x: px(26), y: px(23), radius: 70, color: [255, 190, 120], intensity: 0.6, flicker: 0.15 },
    { id: 'gallery_lift_light', x: px(51), y: px(6), radius: 60, color: [255, 210, 140], intensity: 0.8, when: flag(F.returnLiftPowered) },
    ...relayLamps,
    { id: 'gallery_east_mouth', x: px(56), y: px(16), radius: 56, color: [150, 255, 220], intensity: 0.5, flicker: 0.15 },
    { id: 'gallery_south_mouth', x: px(40), y: px(26), radius: 50, color: [140, 190, 255], intensity: 0.5 },
  ],
  emitters: [
    { id: 'humming_wall_lint', type: 'lint', tx: 6, ty: 6, w: 10, h: 6, toX: px(11), toY: 5 * 16 + 8, rate: 3, boost: { when: flag(F.galleryFanPowered), factor: 5 } },
  ],
  entities,
};
