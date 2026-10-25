// Persistent player/world state: exactly what a save stores (plus envelope metadata).
import type { AmmoPool, WeaponId } from '../content/ids.ts';
import { REGIONS } from '../content/ids.ts';
import { WEAPONS } from '../content/weapons.ts';

export interface RegionDelta {
  /** unique pickups collected */
  collected: string[];
  /** enemies defeated (ordinary ones are cleared again by refuge rest) */
  defeated: string[];
  /** once-only triggers that have fired */
  triggers: string[];
  /** explored tile bitmask, base64 */
  explored: string;
}

export interface RecoveryCache {
  regionId: string;
  x: number;
  y: number;
  reserves: Record<AmmoPool, number>;
  bandages: number;
}

export interface GameData {
  regionId: string;
  x: number;
  y: number;
  face: 'down' | 'up' | 'left' | 'right';
  hp: number;
  maxHp: number;
  weapons: WeaponId[];
  activeWeapon: number;
  mag: Partial<Record<WeaponId, number>>;
  reserves: Record<AmmoPool, number>;
  bandages: number;
  capabilities: string[];
  torchOn: boolean;
  lastRefuge: { regionId: string; entry: string; id: string };
  flags: Record<string, boolean>;
  regions: Record<string, RegionDelta>;
  journal: string[];
  visitedRegions: string[];
  cache: RecoveryCache | null;
  playSeconds: number;
  deaths: number;
}

export const REFUGE_BASELINE: Record<AmmoPool, number> = { light_rounds: 24, shells: 4 };
export const BANDAGE_BASELINE = 2;
export const BANDAGE_HEAL = 40;

export function newGameData(): GameData {
  return {
    regionId: REGIONS.home,
    x: 0,
    y: 0,
    face: 'down',
    hp: 100,
    maxHp: 100,
    weapons: [],
    activeWeapon: 0,
    mag: {},
    reserves: { light_rounds: 0, shells: 0 },
    bandages: 1,
    capabilities: [],
    torchOn: true,
    lastRefuge: { regionId: REGIONS.home, entry: 'bed', id: 'refuge_home' },
    flags: {},
    regions: {},
    journal: [],
    visitedRegions: [],
    cache: null,
    playSeconds: 0,
    deaths: 0,
  };
}

export function regionDelta(data: GameData, regionId: string): RegionDelta {
  let d = data.regions[regionId];
  if (!d) {
    d = { collected: [], defeated: [], triggers: [], explored: '' };
    data.regions[regionId] = d;
  }
  return d;
}

export function giveWeapon(data: GameData, id: WeaponId): void {
  if (!data.weapons.includes(id)) data.weapons.push(id);
  data.mag[id] = WEAPONS[id].magazine;
  data.activeWeapon = data.weapons.indexOf(id);
}
