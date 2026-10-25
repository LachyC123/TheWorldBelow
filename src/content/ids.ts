// Persistent flags and IDs used across content, discovery and saves.
export const F = {
  intercomAnswered: 'intercom_answered',
  noteRead: 'home_note_read',
  hasPistol: 'has_pistol',
  laundryHatchOpen: 'laundry_hatch_open',
  laundryClueRead: 'laundry_shelf_clue_read',
  boothLampLit: 'relay_booth_lamp_lit',
  galleryFanPowered: 'gallery_fan_powered',
  maintenancePanelOpen: 'maintenance_panel_open',
  clueMovingLint: 'clue_moving_lint',
  clueAirflowDiagram: 'clue_airflow_diagram',
  pipekeeperCommitted: 'pipekeeper_committed',
  pipekeeperDefeated: 'boss_pipekeeper_defeated',
  pipekeeperWheelClosed: 'pipekeeper_wheel_closed',
  hummingWallResolved: 'humming_wall_resolved',
  relayReconnected: 'relay_reconnected',
  returnLiftPowered: 'return_lift_powered',
  sliceComplete: 'slice_complete',
  darkTipShown: 'tip_dark_shown',
  serviceJunctionOpen: 'service_junction_open',
  pressureRouteOpen: 'pressure_route_open',
  // world-structure pass: the station, the sea and the cellar (persistent save keys)
  stationStreetOpen: 'station_street_open',
  stationStaffOpen: 'station_staff_open',
  galleryLadderDown: 'gallery_ladder_down',
  section9Live: 'section9_live',
  stationRailIsolated: 'station_rail_isolated',
  homeTrapdoorOpen: 'home_trapdoor_open',
  metOrin: 'met_orin',
  metNemi: 'met_nemi',
  networkMapRead: 'network_map_read',
} as const;

/** Observation flags: evidence the player has noticed (journal questions read these). */
export const OBS = {
  relayGap: 'obs_relay_gap',
  closeToHome: 'obs_close_to_home',
  amberCable: 'obs_amber_cable',
  relayDark: 'obs_relay_dark',
  boarded: 'obs_boarded',
  staffDoor: 'obs_staff_door',
  drainGrate: 'obs_drain_grate',
  zeroAnnounce: 'obs_zero_announce',
  zeroPanel: 'obs_zero_panel',
  orinRefuses: 'obs_orin_refuses',
  orinRota: 'obs_orin_rota',
  orinRadio: 'obs_orin_radio',
  liveRail: 'obs_live_rail',
  balconyChain: 'obs_balcony_chain',
  tideGauge: 'obs_tide_gauge',
  tideBell: 'obs_tide_bell',
  crabs: 'obs_crabs',
  nemiTide: 'obs_nemi_tide',
  greatDoor: 'obs_great_door',
  stacks: 'obs_stacks',
  ferry: 'obs_ferry',
  trapdoor: 'obs_trapdoor',
} as const;

/** Flag set the first time an authored region is entered. */
export const seenFlag = (regionId: string): string => `seen_${regionId}`;

export const REGIONS = {
  home: 'region_home_001',
  street: 'region_surface_001',
  laundry: 'region_laundry_001',
  service: 'region_service_001',
  gallery: 'region_gallery_001',
  secret: 'region_secret_001',
  station: 'region_station_001',
  tidal: 'region_tidal_001',
  cellar: 'region_cellar_001',
} as const;

export const WEAPON_IDS = ['service_pistol', 'pump_shotgun'] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];
export type AmmoPool = 'light_rounds' | 'shells';
export const CAP_TORCH_LENS = 'torch_lens';
