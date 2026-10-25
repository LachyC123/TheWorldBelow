// Versioned save envelope, validation and migration. Imported JSON is data, never code:
// every field is type/range checked and IDs must resolve against the content registry.
import { REGION_DEFS, CONTENT_VERSION } from '../content/registry.ts';
import { WEAPON_IDS, type WeaponId } from '../content/ids.ts';
import type { GameData, RegionDelta } from '../sim/gameData.ts';

export const SAVE_FORMAT = 'the-world-below-save';
export const SAVE_SCHEMA_VERSION = 1;
export const GENERATOR_VERSIONS = { base: 1 };
export const MAX_IMPORT_BYTES = 2_000_000;
export const GAME_BUILD = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

declare const __BUILD_ID__: string | undefined;

export interface SaveEnvelope {
  format: typeof SAVE_FORMAT;
  saveSchemaVersion: number;
  gameBuild: string;
  contentManifestVersion: number;
  worldId: string;
  rootSeed: string;
  generatorVersions: Record<string, number>;
  slotId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  playSeconds: number;
  summary: { regionName: string; refugeName: string };
  data: GameData;
  checksum: string;
}

export type ValidationResult = { ok: true; envelope: SaveEnvelope; migrated: boolean } | { ok: false; error: string };

/** Deterministic JSON with sorted keys so checksums are stable across engines. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
}

/** FNV-1a 32-bit; detects corruption/truncation, not tampering. */
export function checksum(data: GameData): string {
  const s = stableStringify(data);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function makeEnvelope(slotId: string, data: GameData, prev: SaveEnvelope | null, summary: SaveEnvelope['summary']): SaveEnvelope {
  const now = new Date().toISOString();
  const copy = JSON.parse(JSON.stringify(data)) as GameData;
  return {
    format: SAVE_FORMAT,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    gameBuild: GAME_BUILD,
    contentManifestVersion: CONTENT_VERSION,
    worldId: prev?.worldId ?? `world_${Date.now().toString(36)}`,
    rootSeed: prev?.rootSeed ?? 'world-below-slice-001',
    generatorVersions: { ...GENERATOR_VERSIONS },
    slotId,
    revision: (prev?.revision ?? 0) + 1,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    playSeconds: copy.playSeconds,
    summary,
    data: copy,
    checksum: checksum(copy),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max;
const isNum = (v: unknown, min = -Infinity, max = Infinity): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isStrArr = (v: unknown, maxLen = 2000, maxStr = 80): v is string[] => Array.isArray(v) && v.length <= maxLen && v.every((x) => isStr(x, maxStr));

export function validateEnvelope(raw: unknown): ValidationResult {
  if (!isObj(raw)) return { ok: false, error: 'Not a save file.' };
  if (raw.exampleOnly === true) return { ok: false, error: 'This is an example document, not a real save.' };
  if (raw.format !== SAVE_FORMAT) return { ok: false, error: 'Not a World Below save file.' };
  if (!isNum(raw.saveSchemaVersion, 1)) return { ok: false, error: 'Missing save version.' };
  if (raw.saveSchemaVersion > SAVE_SCHEMA_VERSION)
    return { ok: false, error: `This save was made by a newer version of the game (save v${raw.saveSchemaVersion}). Update the game to load it.` };
  let env = raw as unknown as SaveEnvelope;
  let migrated = false;
  if (env.saveSchemaVersion < SAVE_SCHEMA_VERSION) {
    env = migrate(env);
    migrated = true;
  }
  for (const k of ['gameBuild', 'worldId', 'rootSeed', 'slotId', 'createdAt', 'updatedAt'] as const) if (!isStr(env[k])) return { ok: false, error: `Invalid field: ${k}` };
  if (!isNum(env.revision, 0) || !isNum(env.playSeconds, 0) || !isNum(env.contentManifestVersion, 0)) return { ok: false, error: 'Invalid counters.' };
  if (!isObj(env.summary) || !isStr(env.summary.regionName) || !isStr(env.summary.refugeName)) return { ok: false, error: 'Invalid summary.' };
  const err = validateData(env.data);
  if (err) return { ok: false, error: err };
  if (!isStr(env.checksum, 16) || env.checksum !== checksum(env.data)) return { ok: false, error: 'Checksum mismatch: the save is damaged or incomplete.' };
  return { ok: true, envelope: env, migrated };
}

function validateData(d: unknown): string | null {
  if (!isObj(d)) return 'Missing world data.';
  if (!isStr(d.regionId) || !REGION_DEFS[d.regionId]) return `Unknown region "${String(d.regionId)}".`;
  if (!isNum(d.x, 0, 100000) || !isNum(d.y, 0, 100000)) return 'Invalid position.';
  if (!['down', 'up', 'left', 'right'].includes(d.face as string)) return 'Invalid facing.';
  if (!isNum(d.maxHp, 1, 1000) || !isNum(d.hp, 0, d.maxHp as number)) return 'Invalid health.';
  if (!Array.isArray(d.weapons) || d.weapons.length > 2 || !d.weapons.every((w) => (WEAPON_IDS as readonly string[]).includes(w as string))) return 'Invalid weapons.';
  if (new Set(d.weapons).size !== d.weapons.length) return 'Duplicate weapons.';
  if (!isNum(d.activeWeapon, 0, Math.max(0, d.weapons.length - 1))) return 'Invalid active weapon.';
  if (!isObj(d.mag)) return 'Invalid magazines.';
  for (const [k, v] of Object.entries(d.mag)) if (!(WEAPON_IDS as readonly string[]).includes(k) || !isNum(v, 0, 99)) return 'Invalid magazine.';
  if (!isObj(d.reserves) || !isNum(d.reserves.light_rounds, 0, 9999) || !isNum(d.reserves.shells, 0, 9999)) return 'Invalid ammunition.';
  if (!isNum(d.bandages, 0, 99)) return 'Invalid bandages.';
  if (!isStrArr(d.capabilities, 50)) return 'Invalid capabilities.';
  if (typeof d.torchOn !== 'boolean') return 'Invalid torch state.';
  if (!isObj(d.lastRefuge) || !isStr(d.lastRefuge.regionId) || !REGION_DEFS[d.lastRefuge.regionId] || !isStr(d.lastRefuge.entry) || !isStr(d.lastRefuge.id)) return 'Invalid refuge.';
  if (!REGION_DEFS[d.lastRefuge.regionId]!.entries[d.lastRefuge.entry]) return 'Refuge entry missing.';
  if (!isObj(d.flags) || Object.keys(d.flags).length > 2000 || !Object.entries(d.flags).every(([k, v]) => isStr(k, 80) && typeof v === 'boolean')) return 'Invalid flags.';
  if (!isObj(d.regions) || Object.keys(d.regions).length > 5000) return 'Invalid region records.';
  for (const [id, r] of Object.entries(d.regions)) {
    if (!isStr(id, 80) || !isObj(r)) return 'Invalid region record.';
    const rd = r as unknown as RegionDelta;
    if (!isStrArr(rd.collected) || !isStrArr(rd.defeated) || !isStrArr(rd.triggers) || !isStr(rd.explored, 40000)) return `Invalid region record ${id}.`;
    if (new Set(rd.collected).size !== rd.collected.length) return `Duplicate unique pickups in ${id}.`;
  }
  if (!isStrArr(d.journal, 500) || !isStrArr(d.visitedRegions, 5000)) return 'Invalid journal.';
  if (d.cache !== null) {
    const c = d.cache;
    if (!isObj(c) || !isStr(c.regionId) || !REGION_DEFS[c.regionId] || !isNum(c.x, 0) || !isNum(c.y, 0) || !isObj(c.reserves) || !isNum(c.reserves.light_rounds, 0, 9999) || !isNum(c.reserves.shells, 0, 9999) || !isNum(c.bandages, 0, 99))
      return 'Invalid recovery cache.';
  }
  if (!isNum(d.playSeconds, 0) || !isNum(d.deaths, 0)) return 'Invalid counters.';
  return null;
}

/** Placeholder for future schema upgrades; each step must be reversible from a backup. */
export function migrate(env: SaveEnvelope): SaveEnvelope {
  return { ...env, saveSchemaVersion: SAVE_SCHEMA_VERSION };
}

export function parseImport(text: string): ValidationResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'File is too large to be a save.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  return validateEnvelope(raw);
}

export function isWeaponId(v: string): v is WeaponId {
  return (WEAPON_IDS as readonly string[]).includes(v);
}
