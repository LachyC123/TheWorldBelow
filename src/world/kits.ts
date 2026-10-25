// Biome kits: how one generated district family looks, sounds, and what lives there.
import { Floor, WallStyle, type WallStyleId } from '../content/tiles.ts';
import type { AmbienceId, CellDef, EnemyType, Rgb } from '../content/types.ts';

export type BiomeId = 'service_veins' | 'storm_drains' | 'pump_works';

export interface BiomeKit {
  id: BiomeId;
  wall: WallStyleId;
  legend: Record<string, CellDef>;
  ambient: Rgb;
  ambience: AmbienceId;
  lightColors: Rgb[];
  decor: Array<{ frame: string; floor?: boolean }>;
  cover: Array<{ frame: string; anim?: { frames: string[]; fps: number }; oy?: number }>;
  /** solid 1x1 dressing placed against the north wall */
  wallDecor: string[];
  /** walkable floor decals */
  floorDecor: string[];
  enemies: Partial<Record<EnemyType, number>>;
  names: [string[], string[]];
  /** neighbouring families a frontier socket may lead to (transition constraints) */
  next: BiomeId[];
}

const pump = { frame: 'pump_0', anim: { frames: ['pump_0', 'pump_1', 'pump_2', 'pump_3'], fps: 3 } };

export const KITS: Record<BiomeId, BiomeKit> = {
  service_veins: {
    id: 'service_veins',
    wall: WallStyle.SERVICE,
    legend: {
      '#': { wall: WallStyle.SERVICE },
      '.': { floor: Floor.CONCRETE_A },
      ',': { floor: Floor.CONCRETE_B },
      x: { floor: Floor.CONCRETE_STAIN },
      h: { floor: Floor.CONCRETE_B },
      '~': { water: true },
      '=': { floor: Floor.GRATE },
    },
    ambient: [28, 31, 42],
    ambience: 'tunnel',
    lightColors: [[120, 255, 190], [255, 190, 120], [120, 255, 190]],
    decor: [{ frame: 'crate' }, { frame: 'valve' }, { frame: 'pipe_stack' }, { frame: 'shelf_junk' }, { frame: 'locker' }],
    cover: [pump, { frame: 'boiler_0', anim: { frames: ['boiler_0', 'boiler_1'], fps: 4 }, oy: 2 }],
    wallDecor: ['pipe_stack', 'locker', 'shelf_junk', 'valve', 'crate'],
    floorDecor: ['hatch_closed'],
    enemies: { skitter: 6, leech: 2, drone: 1 },
    names: [['Cable', 'Valve', 'Sump', 'Junction', 'Pressure', 'Spur', 'Relay', 'Fuse', 'Gauge', 'Bypass'], ['Run', 'Hall', 'Works', 'Reach', 'Loop', 'Gallery', 'Vein']],
    next: ['service_veins', 'storm_drains', 'pump_works'],
  },
  storm_drains: {
    id: 'storm_drains',
    wall: WallStyle.BRICK,
    legend: {
      '#': { wall: WallStyle.BRICK },
      '.': { floor: Floor.CONCRETE_B },
      ',': { floor: Floor.ASPHALT_WET },
      x: { floor: Floor.DRAIN },
      h: { floor: Floor.CONCRETE_B },
      '~': { water: true },
      '=': { floor: Floor.GRATE },
    },
    ambient: [26, 32, 44],
    ambience: 'tunnel',
    lightColors: [[150, 190, 255], [255, 190, 120]],
    decor: [{ frame: 'crate' }, { frame: 'puddle_prop', floor: true }, { frame: 'pipe_stack' }, { frame: 'bin' }, { frame: 'puddle_prop', floor: true }],
    cover: [{ frame: 'crate' }, pump],
    wallDecor: ['pipe_stack', 'bin', 'crate', 'pipe_stack'],
    floorDecor: ['puddle_prop', 'puddle_prop', 'manhole_closed'],
    enemies: { skitter: 5, leech: 3, drone: 1 },
    names: [['Storm', 'Culvert', 'Overflow', 'Gutter', 'Silt', 'Weir', 'Outfall', 'Brook', 'Sluice'], ['Drain', 'Channel', 'Tunnels', 'Vault', 'Run', 'Cut']],
    next: ['storm_drains', 'service_veins'],
  },
  pump_works: {
    id: 'pump_works',
    wall: WallStyle.GALLERY,
    legend: {
      '#': { wall: WallStyle.GALLERY },
      '.': { floor: Floor.METAL_A },
      ',': { floor: Floor.METAL_B },
      x: { floor: Floor.METAL_DARK },
      h: { floor: Floor.METAL_B },
      '~': { water: true },
      '=': { floor: Floor.GRATE },
    },
    ambient: [30, 38, 44],
    ambience: 'gallery',
    lightColors: [[120, 255, 190], [255, 196, 120], [150, 255, 220]],
    decor: [{ frame: 'locker' }, { frame: 'valve' }, { frame: 'crate' }, { frame: 'pipe_stack' }],
    cover: [pump],
    wallDecor: ['locker', 'pipe_stack', 'valve', 'locker'],
    floorDecor: ['hatch_closed'],
    enemies: { skitter: 4, leech: 2, drone: 3 },
    names: [['Piston', 'Pump', 'Flywheel', 'Gasket', 'Turbine', 'Intake', 'Governor'], ['Hall', 'Works', 'Gallery', 'Floor', 'Bay']],
    next: ['pump_works', 'service_veins'],
  },
};

/** Deeper districts get darker; the ambient floor never drops below legibility. */
export function ambientFor(kit: BiomeKit, depth: number): Rgb {
  const k = Math.max(0.7, 1 - (depth - 1) * 0.07);
  return [Math.round(kit.ambient[0] * k), Math.round(kit.ambient[1] * k), Math.round(kit.ambient[2] * k)];
}
