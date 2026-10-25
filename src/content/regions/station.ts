import { MapBuilder } from '../mapBuilder.ts';
import { Floor, WallStyle } from '../tiles.ts';
import type { EntityDef, RegionDef, StaticLight } from '../types.ts';
import { F, OBS, REGIONS } from '../ids.ts';
import { any, flag, hasCap, not, px, seq } from '../cond.ts';

// Last Platform: Bracken Underground's final station, sealed for forty years. A hub that
// reconnects the street (boarded entrance, bar inside), the Service Veins (STAFF ONLY door),
// the storm drains (track tunnel), the gallery balcony (signal gantry) and, through the
// Section 9 isolation, the Platform Zero lift down to the sea.
const m = new MapBuilder(56, 22)
  // ticket hall
  .carve(3, 2, 18, 6, '.')
  .sprinkle('.', ',', 5, 3)
  .carve(1, 4, 2, 2, 'k') // staff passage from the Service Veins
  // stairs from the hall down to the platform
  .carve(18, 8, 3, 3, 'u')
  // platform
  .carve(2, 11, 47, 4, '.')
  .sprinkle('.', ',', 6, 5)
  .hrun(2, 48, 15, 'e')
  .carve(36, 12, 2, 1, 'z')
  // track bed: west tunnel to the storm drains, east end past the third rail to the shaft hatch
  .carve(0, 16, 56, 4, 't')
  .carve(53, 17, 2, 2, 'g')
  // signal cabin, up a short stair from the platform's east end
  .carve(43, 2, 11, 6, 'w')
  .carve(45, 8, 2, 3, 'u');

const hallLights: StaticLight[] = [6, 12, 18].map((x, i) => ({
  id: `station_hall_lamp_${i}`,
  x: px(x),
  y: px(3),
  radius: 88,
  color: [255, 236, 190],
  intensity: 0.85,
  when: flag(F.section9Live),
}));
const platformLights: StaticLight[] = [6, 14, 22, 30, 38, 46].map((x, i) => ({
  id: `station_platform_lamp_${i}`,
  x: px(x),
  y: px(12),
  radius: 96,
  color: [255, 236, 190],
  intensity: 0.8,
  when: flag(F.section9Live),
}));
const emergency: StaticLight[] = [8, 26, 44].map((x, i) => ({
  id: `station_emergency_${i}`,
  x: px(x),
  y: px(12),
  radius: 56,
  color: [255, 90, 60],
  intensity: 0.45,
  flicker: 0.25,
  when: not(F.section9Live),
}));

const railLive = not(F.stationRailIsolated);

const entities: EntityDef[] = [
  // --- ticket hall
  { kind: 'prop', id: 'station_entrance_inside', tx: 10, ty: 1, frame: 'entrance_boarded', wall: true, alt: { when: flag(F.stationStreetOpen), frame: 'entrance_open' } },
  { kind: 'interact', id: 'station_bar_lift', tx: 10, ty: 2, verb: 'Lift', label: 'Bar across the boards', action: 'lift_station_bar', hideWhen: flag(F.stationStreetOpen), reach: 16 },
  { kind: 'exit', id: 'station_to_street', tx: 10, ty: 2, w: 1, h: 1, auto: false, verb: 'Climb', label: 'Stairs up to Bracken', gate: flag(F.stationStreetOpen), target: { region: REGIONS.street, entry: 'underground' } },
  { kind: 'prop', id: 'station_roundel_hall', tx: 5, ty: 1, frame: 'station_roundel', wall: true, ox: 8, oy: -2, lit: true },
  { kind: 'prop', id: 'station_network_map', tx: 16, ty: 1, frame: 'network_map', wall: true, ox: 8, oy: -1 },
  { kind: 'interact', id: 'station_network_map_read', tx: 16, ty: 2, w: 2, verb: 'Study', label: 'Network map', action: 'read_network_map' },
  ...[6, 8, 12, 14].map((x): EntityDef => ({ kind: 'prop', id: `station_barrier_${x}`, tx: x, ty: 6, frame: 'ticket_barrier', solid: { w: 1, h: 1 } })),
  { kind: 'pickup', id: 'pickup_station_rounds', tx: 4, ty: 3, item: 'light_rounds', amount: 10 },
  { kind: 'pickup', id: 'pickup_station_ticket', tx: 19, ty: 3, item: 'curio', amount: 1, ref: 'curio_platform_pass' },
  // STAFF ONLY door to the Service Veins: a manual release on this side
  { kind: 'prop', id: 'station_staff_door', tx: 1, ty: 3, frame: 'staff_door_closed', wall: true, alt: { when: any(flag(F.stationStaffOpen), flag(F.relayReconnected)), frame: 'staff_door_open' } },
  { kind: 'exit', id: 'station_to_service', tx: 1, ty: 4, w: 1, h: 2, auto: false, verb: 'Open', label: 'STAFF ONLY door', gate: any(flag(F.stationStaffOpen), flag(F.relayReconnected)), target: { region: REGIONS.service, entry: 'staff' } },
  { kind: 'interact', id: 'station_staff_release', tx: 2, ty: 3, verb: 'Pull', label: 'Manual door release', action: 'staff_release', hideWhen: any(flag(F.stationStaffOpen), flag(F.relayReconnected)), reach: 18 },
  // --- platform
  { kind: 'prop', id: 'station_board', tx: 28, ty: 10, frame: 'board_dead_0', wall: true, ox: 8, anim: seq('board_dead', 2, 1.2), alt: { when: flag(F.section9Live), anim: seq('board_live', 2, 2) }, lit: true },
  { kind: 'prop', id: 'station_roundel_platform', tx: 12, ty: 10, frame: 'station_roundel', wall: true, ox: 8, oy: -1 },
  { kind: 'prop', id: 'station_roundel_platform_b', tx: 44, ty: 10, frame: 'station_roundel', wall: true, ox: 8, oy: -1 },
  { kind: 'prop', id: 'station_bench_a', tx: 6, ty: 11, frame: 'platform_bench', solid: { w: 2, h: 1 } },
  { kind: 'prop', id: 'station_bench_b', tx: 24, ty: 11, frame: 'platform_bench', solid: { w: 2, h: 1 } },
  { kind: 'prop', id: 'station_bench_c', tx: 40, ty: 11, frame: 'platform_bench', solid: { w: 2, h: 1 } },
  // the Platform Zero lift, dead while Section 9 is isolated
  { kind: 'prop', id: 'station_lift_zero', tx: 36, ty: 10, frame: 'lift_zero_closed', wall: true, ox: 8, alt: { when: flag(F.section9Live), frame: 'lift_zero_open' } },
  { kind: 'prop', id: 'station_call_panel', tx: 38, ty: 10, frame: 'call_panel_dead', wall: true, oy: -2, alt: { when: flag(F.section9Live), frame: 'call_panel_live' }, glow: { radius: 10, color: [255, 80, 60], dy: -10 } },
  { kind: 'interact', id: 'station_call_panel_read', tx: 38, ty: 11, verb: 'Read', label: 'Lift call panel', action: `note:${OBS.zeroPanel}:zero_panel`, hideWhen: flag(F.section9Live) },
  { kind: 'exit', id: 'station_lift_down', tx: 36, ty: 11, w: 2, h: 1, auto: false, verb: 'Ride', label: 'Platform Zero lift', gate: flag(F.section9Live), lockedText: 'zero_dead', target: { region: REGIONS.tidal, entry: 'lift' } },
  { kind: 'trigger', id: 'station_platform_title', tx: 2, ty: 11, w: 47, h: 1, action: 'title:Last Platform', once: true },
  // --- track bed
  { kind: 'exit', id: 'station_tunnel_west', tx: 0, ty: 16, w: 1, h: 4, auto: true, target: { region: 'gen:street_storm_drain', entry: 'link_station' } },
  { kind: 'prop', id: 'station_signal_west', tx: 2, ty: 16, frame: 'signal_lamp_0', solid: { w: 1, h: 1 } },
  { kind: 'enemy', id: 'station_track_skitter_a', tx: 20, ty: 18, type: 'skitter', respawns: true },
  { kind: 'enemy', id: 'station_track_skitter_b', tx: 34, ty: 17, type: 'skitter', respawns: true },
  { kind: 'enemy', id: 'station_track_leech', tx: 8, ty: 18, type: 'leech', respawns: true },
  // live third rail feeding the old shaft: the dangerous way down (needs insulated gloves)
  ...[16, 17, 18, 19].map((y, i): EntityDef => ({ kind: 'prop', id: `station_rail_${y}`, tx: 50, ty: y, frame: `junction_${i % 3}`, solid: { w: 1, h: 1 }, opaque: true, solidWhen: railLive, anim: { frames: [`junction_${i % 3}`, `junction_${(i + 1) % 3}`, `junction_${(i + 2) % 3}`], fps: 8 }, alt: { when: flag(F.stationRailIsolated), frame: 'junction_open' } })),
  { kind: 'interact', id: 'station_rail_use', tx: 50, ty: 16, h: 4, reach: 14, verb: 'Disconnect', label: 'Live third rail', action: 'isolate_rail', when: hasCap('insulated_gloves'), lockedText: 'rail_locked', hideWhen: flag(F.stationRailIsolated) },
  { kind: 'trigger', id: 'station_rail_seen', tx: 44, ty: 16, w: 5, h: 4, action: `observe:${OBS.liveRail}`, once: true },
  { kind: 'prop', id: 'station_shaft_hatch', tx: 53, ty: 17, frame: 'hatch_open', floor: true },
  { kind: 'exit', id: 'station_shaft_down', tx: 53, ty: 17, w: 2, h: 2, auto: false, verb: 'Climb down', label: 'Lift-shaft ladder', target: { region: REGIONS.tidal, entry: 'shaft' } },
  // --- signal cabin (a refuge once Orin has met you)
  { kind: 'prop', id: 'cabin_levers', tx: 46, ty: 1, frame: 'lever_bank_off', wall: true, ox: 8, oy: 4, alt: { when: flag(F.section9Live), frame: 'lever_bank_on' } },
  { kind: 'prop', id: 'cabin_isolation', tx: 51, ty: 2, frame: 'isolation_off', solid: { w: 1, h: 1 }, alt: { when: flag(F.section9Live), frame: 'isolation_on' }, glow: { radius: 8, color: [255, 90, 60], dy: -6, when: not(F.section9Live) } },
  { kind: 'prop', id: 'cabin_radio', tx: 44, ty: 2, frame: 'radio_set_0', solid: { w: 1, h: 1 }, anim: seq('radio_set', 2, 1.5), glow: { radius: 10, color: [255, 200, 120], dy: -8 } },
  { kind: 'interact', id: 'cabin_radio_listen', tx: 44, ty: 3, verb: 'Listen', label: 'Signal radio', action: `note:${OBS.orinRadio}:orin_radio` },
  { kind: 'prop', id: 'cabin_rota', tx: 49, ty: 1, frame: 'rota_board', wall: true, oy: 3 },
  { kind: 'interact', id: 'cabin_rota_read', tx: 49, ty: 2, verb: 'Read', label: 'Duty rota', action: `note:${OBS.orinRota}:orin_rota_board` },
  { kind: 'prop', id: 'cabin_orin', tx: 48, ty: 4, frame: 'orin_idle_0', solid: { w: 1, h: 1 }, anim: seq('orin_idle', 2, 1.2) },
  { kind: 'interact', id: 'cabin_orin_talk', tx: 48, ty: 4, reach: 22, verb: 'Talk', label: 'Orin Vale, signalman', action: 'talk_orin' },
  { kind: 'prop', id: 'cabin_lamp', tx: 52, ty: 5, frame: 'refuge_lamp_on', solid: { w: 1, h: 1 }, glow: { radius: 20, color: [255, 200, 120], dy: -22 } },
  { kind: 'interact', id: 'cabin_rest', tx: 52, ty: 5, reach: 24, verb: 'Rest', label: 'Signal cabin stove', action: 'rest_refuge', when: flag(F.metOrin), lockedText: 'cabin_not_yet' },
  { kind: 'pickup', id: 'pickup_cabin_bandage', tx: 44, ty: 6, item: 'bandage', amount: 1 },
  // the signal gantry crosses over to the gallery balcony
  { kind: 'prop', id: 'cabin_gantry_door', tx: 53, ty: 1, frame: 'door_metal_open', wall: true },
  { kind: 'exit', id: 'cabin_to_gantry', tx: 53, ty: 2, w: 1, h: 1, auto: false, verb: 'Cross', label: 'Signal gantry', target: { region: REGIONS.gallery, entry: 'balcony' } },
];

export const station: RegionDef = {
  id: REGIONS.station,
  name: 'Last Platform',
  biome: 'last_platform',
  map: m.rows(),
  legend: {
    '#': { wall: WallStyle.STATION },
    '.': { floor: Floor.STATION_TILE },
    ',': { floor: Floor.STATION_TILE_B },
    e: { floor: Floor.PLATFORM_EDGE },
    z: { floor: Floor.STATION_ZERO },
    t: { floor: Floor.TRACK },
    g: { floor: Floor.GRATE },
    u: { floor: Floor.STAIRS_DOWN },
    k: { floor: Floor.CONCRETE_A },
    w: { floor: Floor.WOOD_B },
  },
  ambient: [30, 34, 44],
  ambience: 'station',
  motes: 'dust',
  refuge: { id: 'refuge_signal_cabin', entry: 'cabin' },
  entries: {
    street: { tx: 10, ty: 3, face: 'down' },
    staff: { tx: 2, ty: 5, face: 'right' },
    tunnel: { tx: 2, ty: 18, face: 'right' },
    gantry: { tx: 52, ty: 3, face: 'left' },
    lift: { tx: 36, ty: 12, face: 'down' },
    shaft_top: { tx: 52, ty: 17, face: 'left' },
    cabin: { tx: 50, ty: 5, face: 'down' },
  },
  discoverTitle: 'Bracken Underground',
  announce: {
    every: 40,
    lines: [
      { when: not(F.section9Live), speaker: 'Platform announcement', text: '…Platform Zero services are suspended. Section 9 is isolated. Passengers for the Tidal Platform should apply to the signal cabin…' },
      { when: flag(F.section9Live), speaker: 'Platform announcement', text: 'Platform Zero: lift in service to the Tidal Platform. Mind the gap, and mind the tide.' },
    ],
  },
  lights: [
    { id: 'station_hall_spill', x: px(10), y: px(2), radius: 60, color: [120, 150, 200], intensity: 0.5, when: flag(F.stationStreetOpen) },
    { id: 'station_staff_lamp', x: px(2), y: px(4), radius: 44, color: [150, 255, 220], intensity: 0.5 },
    { id: 'station_board_glow', x: px(28), y: px(10), radius: 52, color: [255, 190, 110], intensity: 0.6, flicker: 0.2 },
    { id: 'station_cabin_lamp', x: px(48), y: px(4), radius: 104, color: [255, 196, 120], intensity: 1, flicker: 0.03 },
    { id: 'station_cabin_stair', x: px(46), y: px(9), radius: 48, color: [255, 196, 120], intensity: 0.5 },
    { id: 'station_rail_glow', x: px(50), y: px(18), radius: 48, color: [150, 255, 220], intensity: 0.7, flicker: 0.5, when: railLive },
    { id: 'station_shaft_glow', x: px(54), y: px(18), radius: 40, color: [140, 190, 255], intensity: 0.4 },
    { id: 'station_lift_glow', x: px(37), y: px(11), radius: 56, color: [150, 255, 220], intensity: 0.7, when: flag(F.section9Live) },
    { id: 'station_tunnel_mouth', x: px(1), y: px(18), radius: 50, color: [140, 190, 255], intensity: 0.4, flicker: 0.1 },
    ...hallLights,
    ...platformLights,
    ...emergency,
  ],
  entities,
};
