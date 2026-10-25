import type { AmmoPool, WeaponId } from './ids.ts';

// Trial balance from docs/design/examples/weapons.json, extended with presentation needs.
export interface WeaponDef {
  id: WeaponId;
  name: string;
  ammoPool: AmmoPool;
  magazine: number;
  damagePerProjectile: number;
  projectilesPerShot: number;
  spreadRadians: number;
  cadenceMs: number;
  reloadMs: number;
  maxRangePx: number;
  projectileSpeed: number;
  flashPeakMs: number;
  flashDecayMs: number;
  flashRadiusPx: number;
  /** sound propagation radius for creature perception */
  noisePx: number;
  /** muzzle distance from the hand pivot along the aim */
  muzzlePx: number;
  shakePx: number;
  knockback: number;
  spriteId: string;
  shotCueId: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  service_pistol: {
    id: 'service_pistol',
    name: 'Service Pistol',
    ammoPool: 'light_rounds',
    magazine: 8,
    damagePerProjectile: 20,
    projectilesPerShot: 1,
    spreadRadians: 0.025,
    cadenceMs: 250,
    reloadMs: 1100,
    maxRangePx: 240,
    projectileSpeed: 540,
    flashPeakMs: 35,
    flashDecayMs: 140,
    flashRadiusPx: 104,
    noisePx: 220,
    muzzlePx: 12,
    shakePx: 1,
    knockback: 40,
    spriteId: 'weapon_service_pistol',
    shotCueId: 'shot_service_pistol',
  },
  pump_shotgun: {
    id: 'pump_shotgun',
    name: 'Pump Shotgun',
    ammoPool: 'shells',
    magazine: 4,
    damagePerProjectile: 8,
    projectilesPerShot: 6,
    spreadRadians: 0.36,
    cadenceMs: 800,
    reloadMs: 1600,
    maxRangePx: 112,
    projectileSpeed: 440,
    flashPeakMs: 45,
    flashDecayMs: 170,
    flashRadiusPx: 136,
    noisePx: 280,
    muzzlePx: 19,
    shakePx: 2.5,
    knockback: 22,
    spriteId: 'weapon_pump_shotgun',
    shotCueId: 'shot_pump_shotgun',
  },
};
