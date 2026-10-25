// Authored room modules for generated districts (docs/design/docs/02 "Module metadata").
// Legend: . , x floor variants · # solid mass · ~ water · = grate bridge
// Slots (become floor + content): E enemy · L loot · C special find · P decor · K 2x2 cover (top-left)
//                                S light · R refuge lamp · M survey map
// Authoring rule (checked by tests): door midpoints on allowed sides are floor, three cells wide.

export type Side = 'N' | 'S' | 'E' | 'W';
export type Role = 'arrival' | 'connector' | 'combat' | 'reward' | 'rest' | 'landmark' | 'secret' | 'vault';

export interface ModuleProp {
  dx: number;
  dy: number;
  frame: string;
  solid?: { w: number; h: number };
  opaque?: boolean;
  wall?: boolean;
  floor?: boolean;
  anim?: { frames: string[]; fps: number };
  ox?: number;
  oy?: number;
}

export interface ModuleLight {
  dx: number;
  dy: number;
  color: [number, number, number];
  radius: number;
  intensity: number;
  flicker?: number;
}

export interface RoomModule {
  id: string;
  rows: string[];
  roles: Role[];
  /** sides a corridor may enter from (default: all) */
  doors?: Side[];
  /** biomes it suits (default: all) */
  biomes?: string[];
  landmark?: { name: string; props: ModuleProp[]; lights: ModuleLight[]; emitter?: { toDx: number; toDy: number } };
}

const fan = (n: number, fps: number): { frames: string[]; fps: number } => ({ frames: Array.from({ length: n }, (_, i) => `big_fan_${i}`), fps });

export const MODULES: RoomModule[] = [
  {
    id: 'junction',
    roles: ['arrival', 'connector'],
    rows: ['.........', '.S.....P.', '.........', '....E....', '.........', '.P..M..L.', '.........'],
  },
  {
    id: 'pillar_hall',
    roles: ['combat', 'connector', 'arrival'],
    rows: ['...............', '.S..##...##..S.', '....##...##....', '.E.............', '...............', '.......E.......', '....##...##.L..', '.P..##...##....', '...............'],
  },
  {
    id: 'pipe_room',
    roles: ['combat', 'reward'],
    rows: ['.............', '.K.......P.S.', '.............', '.....E.......', '.............', '.......E..K..', '.L...........', '.............', '......C......'],
  },
  {
    id: 'cistern_pools',
    roles: ['combat', 'reward', 'connector'],
    rows: ['...............', '.~~~~.....~~~~.', '.~~~~..S..~~~~.', '.~~~~.....~~~~.', '.....E.........', '...............', '.........E.....', '.~~~~.....~~~~.', '.~~~~..L..~~~~.', '.~~~~.....~~~~.', '...............'],
  },
  {
    id: 'flooded_crossing',
    roles: ['combat', 'connector'],
    doors: ['E', 'W'],
    rows: ['......~~~......', '.S....~~~...P..', '......~~~......', '...E..===......', '......===..E...', '......===......', '.L....~~~......', '......~~~...S..', '......~~~......'],
  },
  {
    id: 'storage',
    roles: ['reward', 'connector'],
    rows: ['.............', '.PP.PP...P.S.', '.............', '.PP.PP.......', '.............', '.......PP.PP.', '..E..........', '.......PP.PP.', '.L.........C.'],
  },
  {
    id: 'boiler_room',
    roles: ['combat', 'reward'],
    rows: ['.............', '.S.........S.', '...K.....K...', '.............', '....E...E....', '.............', '...K.....K...', '.L...........', '......C......'],
  },
  {
    id: 'collapsed',
    roles: ['combat', 'reward', 'connector'],
    rows: ['.............', '.S..###......', '....###..E...', '.........##..', '.P.......##..', '....E........', '..##.......L.', '..##....P....', '......C......'],
  },
  {
    id: 'long_gallery',
    roles: ['connector', 'combat', 'arrival'],
    rows: ['...............', '.S....P....S...', '...............', '..E.......E....', '...............', '.L.....P....M..', '...............'],
  },
  {
    id: 'cross_vault',
    roles: ['combat', 'connector'],
    rows: ['....#...#....', '.S..#...#..S.', '....#...#....', '.##.......##.', '.....E.E.....', '.##.......##.', '....#...#....', '.L..#...#..P.', '....#...#....'],
  },
  {
    id: 'refuge_nook',
    roles: ['rest'],
    rows: ['.........', '.S..R..P.', '.........', '.........', '.........', '.P.....L.', '.........'],
  },
  {
    id: 'secret_cache',
    roles: ['secret'],
    rows: ['.........', '.L.....L.', '.........', '....C....', '.........', '.P..S..P.', '.........'],
  },
  {
    id: 'sealed_vault',
    roles: ['vault', 'secret'],
    rows: ['...........', '.S.......S.', '..L.....L..', '.....C.....', '..L.....P..', '...........', '...........'],
  },
  // ---------------------------------------------------------------- unique landmarks
  {
    id: 'lm_flooded_chapel',
    roles: ['landmark'],
    rows: ['...............', '...............', '...............', '.......C.......', '...............', '...............', '...............', '...............', '..~~~~~~~~~~~..', '..~~~~~~~~~~~..', '...............'],
    landmark: {
      name: 'The Flooded Chapel',
      props: [
        { dx: 6, dy: 1, frame: 'counter', solid: { w: 2, h: 1 } },
        { dx: 2, dy: 3, frame: 'pew', solid: { w: 2, h: 1 } },
        { dx: 10, dy: 3, frame: 'pew', solid: { w: 2, h: 1 } },
        { dx: 2, dy: 5, frame: 'pew', solid: { w: 2, h: 1 } },
        { dx: 10, dy: 5, frame: 'pew', solid: { w: 2, h: 1 } },
        { dx: 1, dy: 1, frame: 'candle_0', anim: { frames: ['candle_0', 'candle_1'], fps: 5 } },
        { dx: 13, dy: 1, frame: 'candle_0', anim: { frames: ['candle_1', 'candle_0'], fps: 4 } },
        { dx: 5, dy: 1, frame: 'candle_0', anim: { frames: ['candle_0', 'candle_1'], fps: 6 } },
        { dx: 9, dy: 1, frame: 'candle_0', anim: { frames: ['candle_1', 'candle_0'], fps: 5 } },
      ],
      lights: [
        { dx: 7, dy: 1, color: [255, 190, 110], radius: 96, intensity: 0.9, flicker: 0.12 },
        { dx: 1, dy: 1, color: [255, 180, 100], radius: 40, intensity: 0.7, flicker: 0.2 },
        { dx: 13, dy: 1, color: [255, 180, 100], radius: 40, intensity: 0.7, flicker: 0.2 },
        { dx: 7, dy: 9, color: [110, 170, 230], radius: 70, intensity: 0.5 },
      ],
    },
  },
  {
    id: 'lm_fallen_carriage',
    roles: ['landmark'],
    rows: ['...............', '.S...........S.', '...............', '...............', '...............', '..E.........E..', '.........C.....', '...............', '...............'],
    landmark: {
      name: 'The Fallen Carriage',
      props: [{ dx: 5, dy: 3, frame: 'carriage', solid: { w: 4, h: 2 }, opaque: true }],
      lights: [
        { dx: 7, dy: 2, color: [255, 200, 120], radius: 60, intensity: 0.8, flicker: 0.25 },
        { dx: 7, dy: 6, color: [150, 255, 210], radius: 70, intensity: 0.4 },
      ],
    },
  },
  {
    id: 'lm_great_fan',
    roles: ['landmark'],
    rows: ['...............', '...............', '.S...........S.', '...............', '.....E...E.....', '...............', '.L...........P.', '...............', '.......C.......'],
    landmark: {
      name: 'The Great Fan',
      props: [{ dx: 7, dy: -1, frame: 'big_fan_0', wall: true, anim: fan(4, 10) }],
      lights: [{ dx: 7, dy: 1, color: [170, 210, 255], radius: 110, intensity: 0.7, flicker: 0.35 }],
      emitter: { toDx: 7, toDy: -1 },
    },
  },
  {
    id: 'lm_root_vault',
    roles: ['landmark'],
    rows: ['.............', '.............', '.............', '.............', '......C......', '.............', '.............', '.............', '.............'],
    landmark: {
      name: 'The Root Vault',
      props: [
        { dx: 2, dy: 2, frame: 'roots', solid: { w: 2, h: 1 } },
        { dx: 9, dy: 2, frame: 'roots', solid: { w: 2, h: 1 } },
        { dx: 5, dy: 7, frame: 'roots', solid: { w: 2, h: 1 } },
      ],
      lights: [
        { dx: 3, dy: 2, color: [150, 255, 200], radius: 60, intensity: 0.7, flicker: 0.1 },
        { dx: 10, dy: 2, color: [150, 255, 200], radius: 60, intensity: 0.6 },
        { dx: 6, dy: 7, color: [150, 255, 200], radius: 60, intensity: 0.6, flicker: 0.1 },
      ],
    },
  },
  {
    id: 'lm_switchboard_hall',
    roles: ['landmark'],
    rows: ['...............', '...............', '...............', '..E.........E..', '...............', '.......C.......', '...............', '.L...........P.'],
    landmark: {
      name: 'The Switchboard Hall',
      props: [
        { dx: 2, dy: -1, frame: 'switchboard_0', wall: true, oy: 10, anim: { frames: ['switchboard_0', 'switchboard_1'], fps: 2 } },
        { dx: 7, dy: -1, frame: 'switchboard_1', wall: true, oy: 10, anim: { frames: ['switchboard_1', 'switchboard_0'], fps: 3 } },
        { dx: 12, dy: -1, frame: 'switchboard_0', wall: true, oy: 10, anim: { frames: ['switchboard_0', 'switchboard_1'], fps: 2.5 } },
      ],
      lights: [
        { dx: 2, dy: 1, color: [255, 200, 120], radius: 56, intensity: 0.7, flicker: 0.3 },
        { dx: 7, dy: 1, color: [255, 200, 120], radius: 56, intensity: 0.7, flicker: 0.2 },
        { dx: 12, dy: 1, color: [255, 200, 120], radius: 56, intensity: 0.7, flicker: 0.3 },
      ],
    },
  },
  {
    id: 'lm_boiler_heart',
    roles: ['landmark'],
    rows: ['.............', '.S.........S.', '.............', '.............', '.............', '.............', '.E.........E.', '.............', '......C......'],
    landmark: {
      name: 'The Boiler Heart',
      props: [{ dx: 5, dy: 3, frame: 'boiler_0', solid: { w: 2, h: 2 }, opaque: true, oy: 2, ox: 8, anim: { frames: ['boiler_0', 'boiler_1'], fps: 4 } }],
      lights: [{ dx: 6, dy: 5, color: [255, 150, 70], radius: 120, intensity: 1, flicker: 0.2 }],
    },
  },
];

export const MODULE_BY_ID: Record<string, RoomModule> = Object.fromEntries(MODULES.map((m) => [m.id, m]));

export function moduleSize(m: RoomModule): { w: number; h: number } {
  return { w: m.rows[0]!.length, h: m.rows.length };
}
