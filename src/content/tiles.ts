// Tileset layout shared by the art tool (tools/art) and the runtime map builder.
// Indices are stable: changing them requires regenerating art and is not a save concern (maps are authored).
export const TILE = 16;
export const TILESET_COLUMNS = 16;

export const Floor = {
  VOID: 0,
  ASPHALT_A: 1,
  ASPHALT_B: 2,
  ASPHALT_WET: 3,
  SIDEWALK_A: 4,
  SIDEWALK_B: 5,
  PUDDLE: 6,
  WOOD_A: 7,
  WOOD_B: 8,
  RUG: 9,
  CHECKER_A: 10,
  CHECKER_B: 11,
  CONCRETE_A: 12,
  CONCRETE_B: 13,
  CONCRETE_STAIN: 14,
  GRATE: 15,
  METAL_A: 16,
  METAL_B: 17,
  METAL_HAZARD: 18,
  WATER: 19,
  WATER_EDGE: 20,
  STAIRS_DOWN: 21,
  CURB: 22,
  GRAVEL: 23,
  LINO: 24,
  RUST_FLOOR: 25,
  CABLE_H: 26,
  CABLE_V: 27,
  ROAD_LINE: 28,
  DRAIN: 29,
  METAL_DARK: 30,
  CABLE_CORNER: 31,
  // second floor block (after the wall styles)
  STATION_TILE: 288,
  STATION_TILE_B: 289,
  PLATFORM_EDGE: 290,
  TRACK: 291,
  SAND: 292,
  SAND_WET: 293,
  SHINGLE: 294,
  PIER: 295,
  DEEP_WATER: 296,
  TIDE_WATER: 297,
  CELLAR_FLOOR: 298,
  CAVE_ROCK: 299,
  GLOW_SAND: 300,
  STATION_ZERO: 301,
  PIER_EDGE: 302,
  TIDE_FOAM: 303,
} as const;
export type FloorKind = (typeof Floor)[keyof typeof Floor];

export const WallStyle = { BRICK: 0, HOME: 1, LAUNDRY: 2, SERVICE: 3, GALLERY: 4, RUST: 5, STATION: 6, CLIFF: 7 } as const;
export type WallStyleId = (typeof WallStyle)[keyof typeof WallStyle];
export const WALL_STYLE_COUNT = 8;

/** Wall top with an exposed-edge bitmask: 1=N 2=E 4=S 8=W neighbour is not wall. */
export function wallTopIndex(style: WallStyleId, mask: number): number {
  return 32 + style * 32 + (mask & 15);
}

/** Wall front variants: 0,1 plain, 2 feature, 3 left end, 4 right end, 5 single. */
export function wallFrontIndex(style: WallStyleId, variant: number): number {
  return 32 + style * 32 + 16 + variant;
}

export const TILESET_ROWS = 2 + WALL_STYLE_COUNT * 2 + 2;
