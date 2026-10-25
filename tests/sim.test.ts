import { describe, expect, it } from 'vitest';
import { makeWorld, once, run } from './helpers.ts';
import { REGIONS } from '../src/content/ids.ts';
import { giveWeapon } from '../src/sim/gameData.ts';
import { TILE } from '../src/content/tiles.ts';
import { World } from '../src/sim/world.ts';
import { getRegion } from '../src/content/registry.ts';

const armed = (d: Parameters<typeof giveWeapon>[0]): void => {
  giveWeapon(d, 'service_pistol');
  d.reserves.light_rounds = 40;
};

describe('movement and collision', () => {
  it('never enters walls when pushing into them', () => {
    const w = makeWorld(REGIONS.home, 'start');
    run(w, 3, { moveY: -1 });
    expect(w.boxOn(w.grid.block, w.player.x - 5, w.player.y - 6, w.player.x + 5, w.player.y)).toBe(false);
    expect(w.player.y).toBeGreaterThan(2 * TILE);
  });

  it('dodges about 42px, then enforces cooldown with a visible rejection', () => {
    const w = makeWorld(REGIONS.gallery, 'west', armed);
    w.player.x = 20 * TILE;
    w.player.y = 9 * TILE;
    const x0 = w.player.x;
    const ev = once(w, { dodge: true, moveX: 1 });
    expect(ev.some((e) => e.type === 'Dodged')).toBe(true);
    run(w, 0.3, { moveX: 0 });
    expect(w.player.x - x0).toBeGreaterThan(38);
    expect(w.player.x - x0).toBeLessThan(46);
    const ev2 = [...once(w, { dodge: true }), ...run(w, 0.15)];
    expect(ev2.some((e) => e.type === 'DodgeRejected')).toBe(true);
  });

  it('is deterministic for identical inputs', () => {
    const script = (w: World): string => {
      for (let i = 0; i < 300; i++) once(w, { moveX: Math.sin(i / 20), moveY: Math.cos(i / 31), fire: i % 50 < 10, dodge: i % 97 === 0 });
      return JSON.stringify({ p: [w.player.x, w.player.y], e: w.enemies.map((e) => [e.x, e.y, e.hp, e.state]), d: w.data.mag });
    };
    const a = script(makeWorld(REGIONS.gallery, 'west', armed));
    const b = script(makeWorld(REGIONS.gallery, 'west', armed));
    expect(a).toBe(b);
  });
});

describe('weapons and damage', () => {
  it('consumes ammo and applies damage exactly once per projectile', () => {
    const w = makeWorld(REGIONS.gallery, 'west', armed);
    const e = w.enemies.find((x) => x.id === 'gallery_skitter_a')!;
    w.player.x = e.x - 60;
    w.player.y = e.y;
    e.state = 'idle';
    const ev = [...once(w, { fire: true, aimAngle: Math.atan2(e.y - e.hh - (w.player.y - 8), e.x - w.player.x) }), ...run(w, 0.2, { fire: false })];
    expect(ev.filter((x) => x.type === 'WeaponFired')).toHaveLength(1);
    expect(w.data.mag.service_pistol).toBe(7);
    const dmg = ev.filter((x) => x.type === 'DamageApplied' && x.target === e.id);
    expect(dmg).toHaveLength(1);
    expect(e.hp).toBe(20);
    const seqs = ev.map((x) => x.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it('bullets stop at walls and cover; nothing behind a pump is hit', () => {
    const w = makeWorld(REGIONS.gallery, 'west', armed);
    const e = w.enemies.find((x) => x.id === 'gallery_skitter_a')!;
    // pump_1 occupies tiles 20-21 x 12-13; put the player south of it and the skitter north
    w.player.x = 21 * TILE;
    w.player.y = 16 * TILE;
    e.x = 21 * TILE;
    e.y = 11 * TILE;
    const ev = [...once(w, { fire: true, aimAngle: -Math.PI / 2 }), ...run(w, 0.5)];
    expect(ev.some((x) => x.type === 'DamageApplied' && x.target === e.id)).toBe(false);
    expect(ev.some((x) => x.type === 'Impact')).toBe(true);
  });

  it('aim assistance never selects a target through walls', () => {
    const w = makeWorld(REGIONS.service, 'booth', armed);
    // booth is walled off from the hall below; enemies there must not be acquired
    run(w, 0.2, { fire: true, moveY: 0.2 });
    expect(w.player.targetId).toBeNull();
  });

  it('reloads from reserves after emptying the magazine', () => {
    const w = makeWorld(REGIONS.home, 'start', armed);
    run(w, 2.2, { fire: true, aimAngle: 0 });
    run(w, 1.3);
    expect(w.data.mag.service_pistol).toBe(8);
    expect(w.data.reserves.light_rounds).toBeLessThan(40);
  });
});

describe('creatures', () => {
  it('a skitter telegraphs before every lunge', () => {
    const w = makeWorld(REGIONS.gallery, 'west', armed);
    const e = w.enemies.find((x) => x.id === 'gallery_skitter_a')!;
    w.player.x = e.x - 40;
    w.player.y = e.y;
    const ev = run(w, 3);
    const tells = ev.filter((x) => x.type === 'EnemyTelegraph' && x.id === e.id);
    const attacks = ev.filter((x) => x.type === 'EnemyAttack' && x.id === e.id);
    expect(attacks.length).toBeGreaterThan(0);
    for (const a of attacks) expect(tells.some((t) => t.seq < a.seq)).toBe(true);
  });

  it('player death is reported once and stops actions', () => {
    const w = makeWorld(REGIONS.gallery, 'west', armed);
    w.data.hp = 10;
    w.player.iframes = 0;
    w.hurtPlayer(20, 'test', w.player.x + 10, w.player.y);
    expect(w.player.alive).toBe(false);
    const ev = run(w, 1, { fire: true });
    expect(ev.some((x) => x.type === 'WeaponFired')).toBe(false);
  });

  it('dodging cancels a bandage and shakes off a latched leech', () => {
    const w = makeWorld(REGIONS.gallery, 'west', (d) => {
      armed(d);
      d.hp = 50;
      d.bandages = 1;
    });
    once(w, { heal: true });
    expect(w.player.healT).toBeGreaterThan(0);
    const leech = w.enemies.find((x) => x.type === 'leech')!;
    leech.state = 'latch';
    w.player.latchedBy = leech.id;
    const ev = once(w, { dodge: true, moveX: 1 });
    expect(ev.some((x) => x.type === 'HealCancelled')).toBe(true);
    expect(w.player.latchedBy).toBeNull();
    expect(w.data.bandages).toBe(1);
  });

  it('a lamp leech flees a nearby muzzle flash', () => {
    const w = makeWorld(REGIONS.gallery, 'west', armed);
    const leech = w.enemies.find((x) => x.id === 'gallery_leech_a')!;
    w.player.x = leech.x - 50;
    w.player.y = leech.y;
    leech.state = 'agitated';
    leech.meter = 1;
    const ev = once(w, { fire: true, aimAngle: Math.PI / 2 });
    expect(ev.some((x) => x.type === 'LeechFled')).toBe(true);
  });

  it('the Pipekeeper sleeps until the arena is sealed and enters phase 2 at half health', () => {
    const w = makeWorld(REGIONS.secret, 'gap', armed);
    const k = w.enemies.find((x) => x.type === 'keeper')!;
    run(w, 1);
    expect(k.state).toBe('dormant');
    w.setFlag('tmp_arena_sealed', true);
    const ev = run(w, 0.2);
    expect(ev.some((x) => x.type === 'BossPhase')).toBe(true);
    k.hp = k.maxHp * 0.45;
    const ev2 = run(w, 0.1);
    expect(ev2.some((x) => x.type === 'BossPhase' && x.phase === 2)).toBe(true);
    expect(w.grid.blocked(w.grid.block, 5, 13)).toBe(true); // gate sealed
  });
});

describe('pickups and persistence deltas', () => {
  it('unique pickups are recorded once and not respawned', () => {
    const w = makeWorld(REGIONS.street, 'home_door');
    const p = w.pickups.find((x) => x.id === 'pickup_service_pistol')!;
    w.player.x = p.x;
    w.player.y = p.y;
    run(w, 0.1);
    expect(w.data.weapons).toContain('service_pistol');
    expect(w.delta.collected).toEqual(['pickup_service_pistol']);
    const again = new World(getRegion(REGIONS.street), w.data, { x: 80, y: 80, face: 'down' });
    expect(again.pickups.some((x) => x.id === 'pickup_service_pistol')).toBe(false);
  });
});
