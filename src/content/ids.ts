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
} as const;

export const REGIONS = {
  home: 'region_home_001',
  street: 'region_surface_001',
  laundry: 'region_laundry_001',
  service: 'region_service_001',
  gallery: 'region_gallery_001',
  secret: 'region_secret_001',
} as const;

export const WEAPON_IDS = ['service_pistol', 'pump_shotgun'] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];
export type AmmoPool = 'light_rounds' | 'shells';
export const CAP_TORCH_LENS = 'torch_lens';
