// Effective weapon numbers after the player's found modifications.
import type { WeaponId } from '../content/ids.ts';
import { WEAPONS, type WeaponDef } from '../content/weapons.ts';

const cache = new Map<string, WeaponDef>();

export function weaponStats(id: WeaponId, caps: readonly string[]): WeaponDef {
  const ext = caps.includes('extended_mag');
  const choke = caps.includes('tight_choke');
  const quick = caps.includes('quick_hands');
  const key = `${id}|${ext}|${choke}|${quick}`;
  let w = cache.get(key);
  if (w) return w;
  w = { ...WEAPONS[id] };
  if (id === 'service_pistol' && ext) w.magazine = 12;
  if (id === 'pump_shotgun' && choke) {
    w.spreadRadians = 0.22;
    w.maxRangePx = Math.round(w.maxRangePx * 1.25);
  }
  if (quick) w.reloadMs = Math.round(w.reloadMs * 0.7);
  cache.set(key, w);
  return w;
}
