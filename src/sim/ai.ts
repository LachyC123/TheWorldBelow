// Creature behaviour. Every attack has an identifiable telegraph, a hit window and recovery
// (docs/design/docs/04). Perception is local: sight with line of sight, sound from shots.
import type { EnemyDef } from '../content/types.ts';
import type { WeaponId } from '../content/ids.ts';
import { F } from '../content/ids.ts';
import type { EnemyState } from './types.ts';
import { DT, type World } from './world.ts';
import { updateKeeper } from './keeper.ts';

export const SKITTER = { hp: 40, speed: 62, telegraph: 0.62, lungeTime: 0.3, lungeSpeed: 200, recover: 0.7, damage: 14, sight: 150, sightDark: 100, attackRange: 54 };
export const LEECH = { hp: 30, drift: 34, exposure: 0.8, swell: 0.55, drainPerSecond: 7 };
export const KEEPER_HP = 480;
export const DRONE = { hp: 50, range: 130, half: 0.3, lock: 0.7, cool: 1.15, boltSpeed: 125, damage: 16, patrolSpeed: 18 };

export function createEnemy(def: EnemyDef, w: World): EnemyState {
  const x = def.tx * 16 + 8;
  const y = def.ty * 16 + 12;
  const base: EnemyState = {
    id: def.id,
    type: def.type,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: 40,
    maxHp: 40,
    state: 'idle',
    t: w.rng.range(0.5, 2.5),
    face: 1,
    angle: 0,
    active: true,
    dead: false,
    deadT: 0,
    hitT: 0,
    respawns: def.respawns,
    homeX: x,
    homeY: y,
    alerted: false,
    seenX: x,
    seenY: y,
    hasSeen: false,
    attackHit: false,
    cooldown: 0,
    stuckT: 0,
    meter: 0,
    phase: 1,
    hw: 5,
    hh: 5,
    radius: 7,
    strafe: w.rng.next() < 0.5 ? 1 : -1,
    cd2: 0,
    aux: 0,
  };
  if (def.activeWhen) base.active = w.cond(def.activeWhen);
  if (def.type === 'leech') {
    Object.assign(base, { hp: LEECH.hp, maxHp: LEECH.hp, hw: 4, hh: 10, radius: 7 });
  } else if (def.type === 'drone') {
    Object.assign(base, { hp: DRONE.hp, maxHp: DRONE.hp, hw: 5, hh: 14, radius: 8, state: 'sweep', meter: w.rng.range(-Math.PI, Math.PI), aux: w.rng.range(0, 6) });
    base.angle = base.meter;
  } else if (def.type === 'keeper') {
    Object.assign(base, { hp: KEEPER_HP, maxHp: KEEPER_HP, hw: 14, hh: 14, radius: 17, state: 'dormant', active: false, cooldown: 2, cd2: 0 });
  } else {
    Object.assign(base, { hp: SKITTER.hp, maxHp: SKITTER.hp });
  }
  return base;
}

export function updateEnemy(e: EnemyState, w: World): void {
  if (e.dead) {
    e.deadT += DT;
    return;
  }
  e.hitT = Math.max(0, e.hitT - DT);
  e.cooldown = Math.max(0, e.cooldown - DT);
  e.cd2 = Math.max(0, e.cd2 - DT);
  if (e.type === 'keeper') {
    updateKeeper(e, w);
    return;
  }
  if (!e.active) {
    if (w.isEnemyActive(e.id)) {
      e.active = true;
      e.alerted = true;
      e.hasSeen = true;
      e.seenX = w.player.x;
      e.seenY = w.player.y;
      e.state = 'emerge';
      e.t = 0.9;
      w.emit({ type: 'EnemyAlerted', id: e.id, enemy: e.type, x: e.x, y: e.y });
    }
    return;
  }
  if (e.type === 'skitter') updateSkitter(e, w);
  else if (e.type === 'leech') updateLeech(e, w);
  else if (e.type === 'drone') updateDrone(e, w);
}

function separate(e: EnemyState, w: World): void {
  for (const o of w.enemies) {
    if (o === e || o.dead || !o.active || o.type !== e.type) continue;
    const dx = e.x - o.x;
    const dy = e.y - o.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.01 && d < 12) w.moveBox(e, (dx / d) * (12 - d) * 0.1, (dy / d) * (12 - d) * 0.1, e.hw, e.hh);
  }
}

function moveToward(e: EnemyState, w: World, tx: number, ty: number, speed: number): boolean {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const s = Math.min(speed * DT, d);
  const hit = w.moveBox(e, (dx / d) * s, (dy / d) * s, e.hw, e.hh);
  if (Math.abs(dx) > 0.5) e.face = dx > 0 ? 1 : -1;
  e.vx = (dx / d) * speed;
  e.vy = (dy / d) * speed;
  if (hit.hitX && hit.hitY) e.stuckT += DT;
  else e.stuckT = Math.max(0, e.stuckT - DT);
  return d < 2;
}

function updateSkitter(e: EnemyState, w: World): void {
  const p = w.player;
  const px = p.x;
  const py = p.y;
  const dist = Math.hypot(px - e.x, py - e.y);
  const los = p.alive && w.grid.clear(w.grid.shot, e.x, e.y - 5, px, py - 8);
  const sight = w.data.torchOn ? SKITTER.sight : SKITTER.sightDark;
  if (los && dist < sight) {
    if (!e.alerted) w.emit({ type: 'EnemyAlerted', id: e.id, enemy: 'skitter', x: e.x, y: e.y });
    e.alerted = true;
    e.hasSeen = true;
    e.seenX = px;
    e.seenY = py;
    e.meter = 0; // time since last seen
  } else e.meter += DT;

  const stagger = e.hitT > 0 && e.state !== 'lunge' && e.state !== 'telegraph';
  e.t -= DT;
  switch (e.state) {
    case 'emerge':
      if (e.t <= 0) e.state = 'chase';
      return;
    case 'idle': {
      if (e.alerted) {
        e.state = 'chase';
        return;
      }
      if (e.t <= 0) {
        e.t = w.rng.range(1.5, 3.5);
        e.seenX = e.homeX + w.rng.range(-24, 24);
        e.seenY = e.homeY + w.rng.range(-16, 16);
      }
      if (!stagger) moveToward(e, w, e.seenX, e.seenY, 18);
      break;
    }
    case 'chase': {
      if (!p.alive || e.meter > 6) {
        e.alerted = false;
        e.state = 'idle';
        e.seenX = e.homeX;
        e.seenY = e.homeY;
        return;
      }
      if (los && dist < SKITTER.attackRange && e.cooldown <= 0) {
        e.state = 'telegraph';
        e.t = SKITTER.telegraph;
        e.angle = Math.atan2(py - e.y, px - e.x);
        e.face = Math.cos(e.angle) >= 0 ? 1 : -1;
        w.emit({ type: 'EnemyTelegraph', id: e.id, enemy: 'skitter', attack: 'lunge', x: e.x, y: e.y, angle: e.angle, duration: SKITTER.telegraph });
        return;
      }
      if (stagger) return;
      if (los) {
        // flank: approach at an angle, tightening as it closes in
        const a = Math.atan2(py - e.y, px - e.x) + e.strafe * Math.min(0.9, (dist - 30) / 90);
        const tx = e.x + Math.cos(a) * 20;
        const ty = e.y + Math.sin(a) * 20;
        moveToward(e, w, tx, ty, SKITTER.speed);
        if (e.stuckT > 0.4) {
          e.strafe = -e.strafe;
          e.stuckT = 0;
        }
      } else {
        const n = w.path.next(e.x, e.y - 4);
        if (n) moveToward(e, w, n.x, n.y + 4, SKITTER.speed);
      }
      separate(e, w);
      break;
    }
    case 'telegraph':
      if (e.t <= 0) {
        e.state = 'lunge';
        e.t = SKITTER.lungeTime;
        e.attackHit = false;
        w.emit({ type: 'EnemyAttack', id: e.id, enemy: 'skitter', attack: 'lunge', x: e.x, y: e.y, angle: e.angle });
      }
      break;
    case 'lunge': {
      const hit = w.moveBox(e, Math.cos(e.angle) * SKITTER.lungeSpeed * DT, Math.sin(e.angle) * SKITTER.lungeSpeed * DT, e.hw, e.hh);
      if (!e.attackHit && p.alive && Math.hypot(p.x - e.x, p.y - e.y) < 11) {
        e.attackHit = true;
        w.hurtPlayer(SKITTER.damage, 'a Pipe Skitter lunge', e.x, e.y);
      }
      if (e.t <= 0 || hit.hitX || hit.hitY) {
        e.state = 'recover';
        e.t = SKITTER.recover;
      }
      break;
    }
    case 'recover':
      if (e.t <= 0) {
        e.state = 'chase';
        e.cooldown = 0.5;
        e.strafe = w.rng.next() < 0.5 ? 1 : -1;
      }
      break;
  }
}

function updateLeech(e: EnemyState, w: World): void {
  const p = w.player;
  const dist = Math.hypot(p.x - e.x, p.y - e.y);
  const lit = w.inTorch(e.x, e.y - 12);
  e.t -= DT;
  switch (e.state) {
    case 'idle':
      e.meter = lit ? e.meter + DT : Math.max(0, e.meter - DT * 0.5);
      if (e.meter > LEECH.exposure && p.alive) {
        e.state = 'agitated';
        e.alerted = true;
        w.emit({ type: 'EnemyAlerted', id: e.id, enemy: 'leech', x: e.x, y: e.y });
      }
      break;
    case 'agitated': {
      e.meter = lit ? Math.min(2, e.meter + DT) : e.meter - DT * 0.35;
      if (e.meter <= 0 || !p.alive) {
        e.state = 'idle';
        e.alerted = false;
        e.meter = 0;
        break;
      }
      if (e.hitT <= 0) {
        const n = w.grid.clear(w.grid.block, e.x, e.y - 4, p.x, p.y - 4) ? { x: p.x, y: p.y } : w.path.next(e.x, e.y - 4);
        if (n) moveToward(e, w, n.x, n.y, LEECH.drift * (lit ? 1.15 : 0.85));
      }
      if (dist < 20) {
        e.state = 'swell';
        e.t = LEECH.swell;
        w.emit({ type: 'EnemyTelegraph', id: e.id, enemy: 'leech', attack: 'latch', x: e.x, y: e.y, angle: Math.atan2(p.y - e.y, p.x - e.x), duration: LEECH.swell });
      }
      break;
    }
    case 'swell':
      if (e.t <= 0) {
        if (p.alive && dist < 24 && p.dodgeT <= 0 && !p.latchedBy) {
          e.state = 'latch';
          p.latchedBy = e.id;
          e.aux = 0;
          w.emit({ type: 'LeechLatched', id: e.id });
          w.emit({ type: 'EnemyAttack', id: e.id, enemy: 'leech', attack: 'latch', x: e.x, y: e.y, angle: 0 });
        } else e.state = 'agitated';
      }
      break;
    case 'latch':
      if (!p.alive || p.latchedBy !== e.id) {
        if (p.latchedBy === e.id) p.latchedBy = null;
        e.state = 'stunned';
        e.t = 1;
        break;
      }
      e.x = p.x;
      e.y = p.y + 1;
      e.aux += DT;
      w.drainPlayer(LEECH.drainPerSecond * DT, 'a Lamp Leech');
      if (e.aux > 0.5) {
        e.aux = 0;
        w.emit({ type: 'PlayerHurt', amount: LEECH.drainPerSecond * 0.5, source: 'a Lamp Leech', angle: 0 });
      }
      break;
    case 'flee': {
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      moveToward(e, w, e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, 58);
      if (e.t <= 0) {
        e.state = 'agitated';
        e.meter = 0.3;
      }
      break;
    }
    case 'stunned':
      if (e.t <= 0) {
        e.state = 'agitated';
        e.meter = Math.max(e.meter, 0.6);
      }
      break;
  }
}

/** Is the player inside the drone's searchlight (and visible to it)? */
export function inBeam(e: EnemyState, w: World, half: number): boolean {
  const p = w.player;
  if (!p.alive) return false;
  const ex = e.x;
  const ey = e.y - e.hh;
  const d = Math.hypot(p.x - ex, p.y - 8 - ey);
  if (d > DRONE.range) return false;
  const diff = Math.abs(wrap(Math.atan2(p.y - 8 - ey, p.x - ex) - e.angle));
  if (diff > half && d > 18) return false;
  return w.grid.clear(w.grid.light, ex, ey, p.x, p.y - 8);
}

function wrap(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function turnToward(e: EnemyState, target: number, rate: number): void {
  const d = wrap(target - e.angle);
  e.angle = wrap(e.angle + Math.max(-rate * DT, Math.min(rate * DT, d)));
}

/**
 * Watchman Drone: sweeps a visible searchlight. Inside the beam it locks on (red beam, rising
 * tone), then fires a slow bolt you can dodge. Break line of sight or leave the beam to lose it.
 */
function updateDrone(e: EnemyState, w: World): void {
  const p = w.player;
  const toP = Math.atan2(p.y - 8 - (e.y - e.hh), p.x - e.x);
  e.t -= DT;
  e.aux += DT;
  e.face = Math.cos(e.angle) >= 0 ? 1 : -1;
  const lock = (): void => {
    e.state = 'lock';
    e.t = DRONE.lock;
    e.alerted = true;
    w.emit({ type: 'EnemyTelegraph', id: e.id, enemy: 'drone', attack: 'bolt', x: e.x, y: e.y, angle: toP, duration: DRONE.lock });
  };
  switch (e.state) {
    case 'sweep': {
      e.angle = wrap(e.meter + Math.sin(e.aux * 0.9) * 1.1);
      const tx = e.homeX + Math.cos(e.aux * 0.35) * 26;
      const ty = e.homeY + Math.sin(e.aux * 0.35) * 14;
      const dx = tx - e.x;
      const dy = ty - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) w.moveBox(e, (dx / d) * DRONE.patrolSpeed * DT, (dy / d) * DRONE.patrolSpeed * DT, e.hw, 4, w.grid.shot);
      if (inBeam(e, w, DRONE.half)) {
        if (!e.alerted) w.emit({ type: 'EnemyAlerted', id: e.id, enemy: 'drone', x: e.x, y: e.y });
        lock();
      }
      break;
    }
    case 'lock':
      turnToward(e, toP, 3);
      e.seenX = p.x;
      e.seenY = p.y;
      if (!inBeam(e, w, 0.55)) {
        e.state = 'search';
        e.t = 2.2;
        break;
      }
      if (e.t <= 0) {
        w.emit({ type: 'EnemyAttack', id: e.id, enemy: 'drone', attack: 'bolt', x: e.x, y: e.y - e.hh, angle: e.angle });
        w.fireBolt(e.x + Math.cos(e.angle) * 6, e.y - e.hh + 4 + Math.sin(e.angle) * 6, toP, DRONE.boltSpeed, DRONE.damage);
        e.state = 'cool';
        e.t = DRONE.cool;
      }
      break;
    case 'cool':
      turnToward(e, toP, 2);
      if (e.t <= 0) {
        if (inBeam(e, w, DRONE.half + 0.1)) lock();
        else {
          e.state = 'search';
          e.t = 2;
        }
      }
      break;
    case 'search': {
      const base = Math.atan2(e.seenY - 8 - (e.y - e.hh), e.seenX - e.x);
      e.angle = wrap(base + Math.sin(e.aux * 2.2) * 0.8);
      const dx = e.seenX - e.x;
      const dy = e.seenY - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 30) w.moveBox(e, (dx / d) * 26 * DT, (dy / d) * 26 * DT, e.hw, 4, w.grid.shot);
      if (inBeam(e, w, DRONE.half)) lock();
      else if (e.t <= 0) {
        e.state = 'sweep';
        e.meter = e.angle;
        e.aux = 0;
      }
      break;
    }
  }
}

/** Authoritative damage application (exactly once per projectile hit). */
export function damageEnemy(e: EnemyState, w: World, amount: number, hx: number, hy: number, angle: number, knockback: number, source: WeaponId | string): void {
  if (e.dead) return;
  let material: 'flesh' | 'jelly' | 'metal' = e.type === 'leech' ? 'jelly' : e.type === 'keeper' || e.type === 'drone' ? 'metal' : 'flesh';
  if (e.type === 'drone' && (e.state === 'sweep' || e.state === 'search')) {
    // being shot reveals you: it swings its light toward the shooter
    e.angle = Math.atan2(w.player.y - 8 - (e.y - e.hh), w.player.x - e.x);
    e.state = 'lock';
    e.t = DRONE.lock;
    e.alerted = true;
    w.emit({ type: 'EnemyTelegraph', id: e.id, enemy: 'drone', attack: 'bolt', x: e.x, y: e.y, angle: e.angle, duration: DRONE.lock });
  }
  if (e.type === 'keeper') {
    if (e.state === 'stunned') {
      amount *= 1.5;
      material = 'flesh';
    } else amount *= 0.85;
  }
  e.hp -= amount;
  e.hitT = 0.12;
  if (e.type === 'skitter' && e.state !== 'lunge') w.moveBox(e, Math.cos(angle) * knockback * 0.08, Math.sin(angle) * knockback * 0.08, e.hw, e.hh);
  if (e.type === 'skitter' && !e.alerted) {
    e.alerted = true;
    e.hasSeen = true;
    e.seenX = w.player.x;
    e.seenY = w.player.y;
    w.emit({ type: 'EnemyAlerted', id: e.id, enemy: e.type, x: e.x, y: e.y });
  }
  if (e.type === 'leech' && (e.state === 'idle' || e.state === 'flee')) {
    e.state = 'agitated';
    e.meter = 1;
  }
  const fatal = e.hp <= 0;
  w.emit({ type: 'Impact', x: hx, y: hy, angle, material });
  w.emit({ type: 'DamageApplied', target: e.id, amount, x: hx, y: hy, material, source: String(source), fatal });
  if (!fatal) return;
  e.dead = true;
  e.deadT = 0;
  if (w.player.latchedBy === e.id) w.player.latchedBy = null;
  if (!w.delta.defeated.includes(e.id)) w.delta.defeated.push(e.id);
  w.emit({ type: 'EnemyDied', id: e.id, enemy: e.type, x: e.x, y: e.y });
  if (e.type === 'keeper') {
    w.data.flags[F.pipekeeperDefeated] = true;
    w.temp.tmp_arena_sealed = false;
    w.refresh();
  }
}
