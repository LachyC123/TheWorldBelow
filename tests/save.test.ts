import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeEnvelope, parseImport, validateEnvelope, SAVE_SCHEMA_VERSION, checksum } from '../src/save/envelope.ts';
import { newGameData, giveWeapon } from '../src/sim/gameData.ts';

const summary = { regionName: 'Home', refugeName: 'Home' };

function sample() {
  const d = newGameData();
  giveWeapon(d, 'service_pistol');
  d.flags.intercom_answered = true;
  d.regions.region_home_001 = { collected: ['x'], defeated: [], triggers: [], explored: '' };
  d.x = 64;
  d.y = 60;
  return makeEnvelope('slot_1', d, null, summary);
}

describe('save envelope', () => {
  it('round-trips through JSON export/import', () => {
    const env = sample();
    const v = parseImport(JSON.stringify(env));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.envelope.data).toEqual(env.data);
  });

  it('increments revision and keeps identity across saves', () => {
    const a = sample();
    const b = makeEnvelope('slot_1', a.data, a, summary);
    expect(b.revision).toBe(a.revision + 1);
    expect(b.worldId).toBe(a.worldId);
    expect(b.createdAt).toBe(a.createdAt);
  });

  it('detects corruption via checksum', () => {
    const env = sample();
    env.data.hp = 50;
    const v = validateEnvelope(env);
    expect(v.ok).toBe(false);
  });

  it('rejects saves from a newer version with a clear message', () => {
    const env = { ...sample(), saveSchemaVersion: SAVE_SCHEMA_VERSION + 1 };
    const v = validateEnvelope(env);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/newer version/);
  });

  it('rejects the design pack example and malformed files', () => {
    const example = readFileSync('docs/design/examples/save_envelope.json', 'utf8');
    expect(parseImport(example).ok).toBe(false);
    expect(parseImport('{nope').ok).toBe(false);
    expect(parseImport('x'.repeat(3_000_000)).ok).toBe(false);
    expect(parseImport('[]').ok).toBe(false);
  });

  it('rejects unknown regions, weapons, duplicates and out-of-range values', () => {
    const mk = (mut: (d: ReturnType<typeof sample>['data']) => void) => {
      const env = sample();
      mut(env.data);
      env.checksum = checksum(env.data);
      return validateEnvelope(env).ok;
    };
    expect(mk((d) => (d.regionId = 'region_nowhere'))).toBe(false);
    expect(mk((d) => (d.weapons = ['laser' as never]))).toBe(false);
    expect(mk((d) => (d.weapons = ['service_pistol', 'service_pistol']))).toBe(false);
    expect(mk((d) => (d.hp = 1e9))).toBe(false);
    expect(mk((d) => (d.regions.region_home_001!.collected = ['a', 'a']))).toBe(false);
    expect(mk((d) => (d.flags.x = 'yes' as never))).toBe(false);
    expect(mk((d) => (d.lastRefuge = { regionId: 'region_home_001', entry: 'nope', id: 'r' }))).toBe(false);
    expect(mk(() => undefined)).toBe(true);
  });
});
