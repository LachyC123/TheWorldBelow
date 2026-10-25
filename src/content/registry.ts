import type { RegionDef, RegionId } from './types.ts';
import { home } from './regions/home.ts';
import { street } from './regions/street.ts';
import { laundry } from './regions/laundry.ts';
import { service } from './regions/service.ts';
import { gallery } from './regions/gallery.ts';
import { secret } from './regions/secret.ts';
import { station } from './regions/station.ts';
import { tidal } from './regions/tidal.ts';
import { cellar } from './regions/cellar.ts';

/** Bumped whenever authored content changes in a way saves should know about. */
export const CONTENT_VERSION = 1;

export const REGION_LIST: RegionDef[] = [home, street, laundry, service, gallery, secret, station, tidal, cellar];
export const REGION_DEFS: Record<RegionId, RegionDef> = Object.fromEntries(REGION_LIST.map((r) => [r.id, r]));

/** Generated districts committed to the active save (materialized, never regenerated). */
const DYNAMIC = new Map<RegionId, RegionDef>();

export function registerRegion(def: RegionDef): void {
  DYNAMIC.set(def.id, def);
}

export function clearDynamicRegions(): void {
  DYNAMIC.clear();
}

export function findRegion(id: RegionId): RegionDef | undefined {
  return REGION_DEFS[id] ?? DYNAMIC.get(id);
}

export function getRegion(id: RegionId): RegionDef {
  const r = findRegion(id);
  if (!r) throw new Error(`Unknown region ${id}`);
  return r;
}
