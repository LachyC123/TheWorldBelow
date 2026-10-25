import type { RegionDef, RegionId } from './types.ts';
import { home } from './regions/home.ts';
import { street } from './regions/street.ts';
import { laundry } from './regions/laundry.ts';
import { service } from './regions/service.ts';
import { gallery } from './regions/gallery.ts';
import { secret } from './regions/secret.ts';

/** Bumped whenever authored content changes in a way saves should know about. */
export const CONTENT_VERSION = 1;

export const REGION_LIST: RegionDef[] = [home, street, laundry, service, gallery, secret];
export const REGION_DEFS: Record<RegionId, RegionDef> = Object.fromEntries(REGION_LIST.map((r) => [r.id, r]));

export function getRegion(id: RegionId): RegionDef {
  const r = REGION_DEFS[id];
  if (!r) throw new Error(`Unknown region ${id}`);
  return r;
}
