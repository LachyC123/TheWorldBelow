// Versioned save envelope, validation and migration. Imported JSON is data, never code:
// every field is type/range checked and IDs must resolve against the content registry.
import { REGION_DEFS, CONTENT_VERSION } from '../content/registry.ts';
import { WEAPON_IDS, type WeaponId } from '../content/ids.ts';
import { newFinds, newWorldLedger, type GameData, type RegionDelta } from '../sim/gameData.ts';
import { validateDistrict, GENERATOR_VERSION, type GeneratedRegionRecord } from '../world/generator.ts';
import { KITS } from '../world/kits.ts';

export const SAVE_FORMAT = 'the-world-below-save';
export const SAVE_SCHEMA_VERSION = 2;
export const GENERATOR_VERSIONS = { base: 1 };
export const MAX_IMPORT_BYTES = 16_000_000;
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
    // verify the old record is intact before transforming it
    if (!isObj(env.data) || !isStr(env.checksum, 16) || env.checksum !== checksum(env.data)) return { ok: false, error: 'Checksum mismatch: the save is damaged or incomplete.' };
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
  const wl = d.world;
  if (!isObj(wl) || !isStr(wl.seed) || !isObj(wl.generated) || !isObj(wl.sockets) || !isObj(wl.seenModules) || !isStrArr(wl.uniques, 500) || !isStrArr(wl.names, 5000) || !isObj(wl.manholes) || !isNum(wl.districts, 0))
    return 'Invalid world ledger.';
  if (Object.keys(wl.generated).length > 5000) return 'Too many generated districts.';
  for (const [id, rec] of Object.entries(wl.generated)) {
    const e = validateGenerated(id, rec);
    if (e) return e;
  }
  const known = (id: unknown): boolean => isStr(id) && (!!REGION_DEFS[id] || !!(wl.generated as Record<string, unknown>)[id]);
  const entriesOf = (id: string): Record<string, unknown> => (REGION_DEFS[id]?.entries ?? (wl.generated as Record<string, GeneratedRegionRecord>)[id]?.entries ?? {}) as Record<string, unknown>;
  const f = d.finds;
  if (!isObj(f) || !isStrArr(f.curios, 500) || !isStrArr(f.upgrades, 100) || !isStrArr(f.landmarks, 500) || !isNum(f.secrets, 0)) return 'Invalid finds.';
  if (!known(d.regionId)) return `Unknown region "${String(d.regionId)}".`;
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
  if (!isObj(d.lastRefuge) || !known(d.lastRefuge.regionId) || !isStr(d.lastRefuge.entry) || !isStr(d.lastRefuge.id)) return 'Invalid refuge.';
  if (!entriesOf(d.lastRefuge.regionId as string)[d.lastRefuge.entry]) return 'Refuge entry missing.';
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
    if (!isObj(c) || !known(c.regionId) || !isNum(c.x, 0) || !isNum(c.y, 0) || !isObj(c.reserves) || !isNum(c.reserves.light_rounds, 0, 9999) || !isNum(c.reserves.shells, 0, 9999) || !isNum(c.bandages, 0, 99))
      return 'Invalid recovery cache.';
  }
  if (!isNum(d.playSeconds, 0) || !isNum(d.deaths, 0)) return 'Invalid counters.';
  return null;
}

const ENTITY_KINDS = new Set(['prop', 'interact', 'exit', 'pickup', 'enemy', 'trigger', 'target', 'vent']);

/** Structural and gameplay validation of a materialized generated district from a save. */
function validateGenerated(id: string, raw: unknown): string | null {
  if (!isObj(raw)) return `Invalid district ${id}.`;
  const r = raw as unknown as GeneratedRegionRecord;
  if (r.id !== id || !isStr(r.name, 80) || !isStr(r.socketId, 200) || !isStr(r.parentRegion) || !isStr(r.parentEntry, 80)) return `Invalid district ${id}.`;
  if (!(r.biome in KITS) || !isNum(r.depth, 1, 10000) || !isNum(r.generatorVersion, 1, GENERATOR_VERSION)) return `District ${id} has an unknown biome or version.`;
  if (!Array.isArray(r.map) || r.map.length < 3 || r.map.length > 300 || !r.map.every((row) => isStr(row, 300) && row.length === r.map[0]!.length)) return `District ${id} has an invalid map.`;
  const legend = KITS[r.biome].legend;
  if (!r.map.every((row) => [...row].every((ch) => ch in legend))) return `District ${id} has unknown tiles.`;
  if (!Array.isArray(r.entities) || r.entities.length > 3000) return `District ${id} has invalid entities.`;
  for (const e of r.entities) {
    if (!isObj(e) || !ENTITY_KINDS.has(e.kind as string) || !isStr(e.id, 120) || !isNum(e.tx, -2, 300) || !isNum(e.ty, -2, 300)) return `District ${id} has an invalid entity.`;
  }
  if (!Array.isArray(r.lights) || !r.lights.every((l) => isObj(l) && isNum(l.x) && isNum(l.y) && isNum(l.radius, 0, 1000) && isNum(l.intensity, 0, 4))) return `District ${id} has invalid lights.`;
  if (!isObj(r.entries) || !Array.isArray(r.emitters) || !Array.isArray(r.childSockets)) return `District ${id} is incomplete.`;
  const problems = validateDistrict(r);
  if (problems.length) return `District ${id} failed validation: ${problems[0]}`;
  return null;
}

/** Schema upgrades. Each step keeps the original record as the slot backup until the next save. */
export function migrate(env: SaveEnvelope): SaveEnvelope {
  const out = JSON.parse(JSON.stringify(env)) as SaveEnvelope;
  if (out.saveSchemaVersion < 2) {
    // v2: persistent generated frontier and finds
    const d = out.data as GameData & { world?: unknown; finds?: unknown };
    if (!d.world) d.world = newWorldLedger(`${out.rootSeed}:${out.worldId}`);
    if (!d.finds) d.finds = newFinds();
  }
  out.saveSchemaVersion = SAVE_SCHEMA_VERSION;
  out.checksum = checksum(out.data);
  return out;
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
