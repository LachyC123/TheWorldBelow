// The Pipekeeper: optional mini-boss with three readable verbs (hose sweep, straight rush,
// vent burst). Phase 2 wakes the arena floor vents unless the pressure wheel is turned.
// Pillars interrupt line attacks; rushing into one stuns it and exposes its core.
import type { EnemyState } from './types.ts';
import { DT, type World } from './world.ts';

export const KEEPER = {
  hoseTell: 0.8,
  hoseTime: 1.0,
  hoseRange: 132,
  hoseSweep: 0.95,
  hoseDamage: 15,
  rushTell: 0.65,
  rushSpeed: 210,
  rushDamage: 20,
  ventTell: 0.75,
  ventRadius: 60,
  ventDamage: 18,
  stun: 1.6,
  walkSpeed: 30,
};

export function nozzle(e: EnemyState): { x: number; y: number } {
  return { x: e.x - e.face * 4 + Math.cos(e.angle) * 18, y: e.y - 14 + Math.sin(e.angle) * 10 };
}

export function updateKeeper(e: EnemyState, w: World): void {
  const p = w.player;
  const dist = Math.hypot(p.x - e.x, p.y - e.y);
  const toPlayer = Math.atan2(p.y - 8 - (e.y - 12), p.x - e.x);
  e.t -= DT;
  if (e.state === 'dormant') {
    if (w.ctx.flag('tmp_arena_sealed')) {
      e.active = true;
      e.state = 'intro';
      e.t = 1.3;
      e.alerted = true;
      w.emit({ type: 'BossPhase', id: e.id, phase: 1 });
      w.emit({ type: 'EnemyAlerted', id: e.id, enemy: 'keeper', x: e.x, y: e.y });
    }
    return;
  }
  if (!p.alive) {
    e.state = 'recover';
    e.t = 1;
    return;
  }
  if (e.phase === 1 && e.hp < e.maxHp * 0.5) {
    e.phase = 2;
    w.emit({ type: 'BossPhase', id: e.id, phase: 2 });
  }
  const fast = e.phase === 2 ? 0.75 : 1;
  switch (e.state) {
    case 'intro':
    case 'recover':
      if (e.t <= 0) e.state = 'choose';
      break;
    case 'choose': {
      e.face = p.x >= e.x ? 1 : -1;
      const los = w.grid.clear(w.grid.shot, e.x, e.y - 12, p.x, p.y - 8);
      if (dist < KEEPER.ventRadius - 6 && e.cd2 <= 0) {
        tell(e, w, 'vent_tell', KEEPER.ventTell, toPlayer);
      } else if (los && dist > 70 && e.cooldown <= 0) {
        tell(e, w, 'rush_tell', KEEPER.rushTell, Math.atan2(p.y - e.y, p.x - e.x));
      } else if (los && dist < KEEPER.hoseRange + 10) {
        tell(e, w, 'hose_tell', KEEPER.hoseTell, toPlayer);
      } else {
        e.state = 'walk';
        e.t = 0.9;
      }
      break;
    }
    case 'walk': {
      const n = w.grid.clear(w.grid.block, e.x, e.y - 6, p.x, p.y - 4) ? { x: p.x, y: p.y } : w.path.next(e.x, e.y - 6);
      if (n) {
        const dx = n.x - e.x;
        const dy = n.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        w.moveBox(e, (dx / d) * KEEPER.walkSpeed * DT / fast, (dy / d) * KEEPER.walkSpeed * DT / fast, e.hw, e.hh);
        e.face = dx >= 0 ? 1 : -1;
      }
      if (e.t <= 0) e.state = 'choose';
      break;
    }
    case 'hose_tell':
      if (e.t <= 0) {
        e.state = 'hose';
        e.t = KEEPER.hoseTime;
        e.attackHit = false;
        e.strafe = w.rng.next() < 0.5 ? 1 : -1;
        e.meter = e.angle; // sweep centre
        w.emit({ type: 'EnemyAttack', id: e.id, enemy: 'keeper', attack: 'hose', x: e.x, y: e.y, angle: e.angle });
      }
      break;
    case 'hose': {
      const k = 1 - Math.max(0, e.t) / KEEPER.hoseTime;
      e.angle = e.meter + e.strafe * KEEPER.hoseSweep * (k * 2 - 1);
      const n = nozzle(e);
      const dx = Math.cos(e.angle);
      const dy = Math.sin(e.angle);
      const hit = w.grid.ray(w.grid.shot, n.x, n.y, dx, dy, KEEPER.hoseRange);
      e.aux = hit.dist;
      if (!e.attackHit) {
        // distance from player chest to the jet segment
        const px = p.x - n.x;
        const py = p.y - 6 - n.y;
        const t = Math.max(0, Math.min(hit.dist, px * dx + py * dy));
        const off = Math.hypot(px - dx * t, py - dy * t);
        if (off < 7 && t > 0 && t < hit.dist) {
          if (w.hurtPlayer(KEEPER.hoseDamage, 'the Pipekeeper’s hose', n.x, n.y)) e.attackHit = true;
        }
      }
      if (e.t <= 0) {
        e.aux = 0;
        e.state = 'recover';
        e.t = 0.6 * fast;
      }
      break;
    }
    case 'rush_tell':
      if (e.t <= 0) {
        e.state = 'rush';
        e.t = 1.6;
        e.attackHit = false;
        w.emit({ type: 'EnemyAttack', id: e.id, enemy: 'keeper', attack: 'rush', x: e.x, y: e.y, angle: e.angle });
      }
      break;
    case 'rush': {
      const hit = w.moveBox(e, Math.cos(e.angle) * KEEPER.rushSpeed * DT, Math.sin(e.angle) * KEEPER.rushSpeed * DT, e.hw, e.hh);
      if (!e.attackHit && Math.hypot(p.x - e.x, p.y - e.y) < 18) {
        if (w.hurtPlayer(KEEPER.rushDamage, 'the Pipekeeper’s rush', e.x, e.y)) e.attackHit = true;
      }
      if (hit.hitX || hit.hitY) {
        e.state = 'stunned';
        e.t = KEEPER.stun;
        e.cooldown = 3.5;
        w.emit({ type: 'BossStunned', id: e.id, x: e.x + Math.cos(e.angle) * 16, y: e.y + Math.sin(e.angle) * 8 });
      } else if (e.t <= 0) {
        e.state = 'recover';
        e.t = 0.5;
        e.cooldown = 3;
      }
      break;
    }
    case 'vent_tell':
      if (e.t <= 0) {
        e.state = 'vent';
        e.t = 0.35;
        e.cd2 = 3.2;
        w.emit({ type: 'EnemyAttack', id: e.id, enemy: 'keeper', attack: 'vent', x: e.x, y: e.y - 10, angle: 0 });
        const los = w.grid.clear(w.grid.shot, e.x, e.y - 10, p.x, p.y - 6);
        if (los && Math.hypot(p.x - e.x, p.y - 4 - (e.y - 8)) < KEEPER.ventRadius) w.hurtPlayer(KEEPER.ventDamage, 'the Pipekeeper’s vent burst', e.x, e.y - 8);
      }
      break;
    case 'vent':
      if (e.t <= 0) {
        e.state = 'recover';
        e.t = 0.7 * fast;
      }
      break;
    case 'stunned':
      if (e.t <= 0) {
        e.state = 'recover';
        e.t = 0.3;
      }
      break;
  }
}

function tell(e: EnemyState, w: World, state: string, duration: number, angle: number): void {
  e.state = state;
  e.t = duration;
  e.angle = angle;
  e.face = Math.cos(angle) >= 0 ? 1 : -1;
  w.emit({ type: 'EnemyTelegraph', id: e.id, enemy: 'keeper', attack: state.replace('_tell', ''), x: e.x, y: e.y, angle, duration });
}
