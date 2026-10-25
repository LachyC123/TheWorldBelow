// Authoritative fixed-step simulation for the active region. No rendering or DOM here:
// presentation reads state and subscribes to events (docs/design/docs/07 update order).
import type { EntityDef, ExitDef, InteractDef, RegionDef, TriggerDef } from '../content/types.ts';
import { TILE } from '../content/tiles.ts';
import { WEAPONS } from '../content/weapons.ts';
import { CAP_TORCH_LENS, type AmmoPool } from '../content/ids.ts';
import { Grid } from './grid.ts';
import { evaluate, type ConditionContext } from './conditions.ts';
import type { SequencedEvent, SimEvent } from './events.ts';
import { BANDAGE_HEAL, giveWeapon, regionDelta, type GameData, type RegionDelta } from './gameData.ts';
import { Rng } from './rng.ts';
import type { Commands, EnemyState, Face, PickupState, PlayerState, ProjectileState, Prompt, TargetState, VentState } from './types.ts';
import { createEnemy, updateEnemy, damageEnemy } from './ai.ts';
import { PathField } from './pathfield.ts';

export const DT = 1 / 60;
export const PLAYER_SPEED = 90;
const DODGE_TIME = 0.24;
const DODGE_DIST = 42;
const DODGE_COOLDOWN = 1.1;
const DODGE_IFRAMES = 0.14;
const DODGE_BUFFER = 0.1;
const HEAL_TIME = 1.2;
const PLAYER_HW = 5;
const PLAYER_HH = 6;
const HURT_IFRAMES = 0.6;
const ASSIST_CONE = 0.62;
export const TORCH_RANGE = 104;
export const TORCH_RANGE_LENS = 140;
export const TORCH_HALF_ANGLE = 0.42;
export const TORCH_HALF_ANGLE_LENS = 0.6;

export class World {
  readonly def: RegionDef;
  readonly grid: Grid;
  readonly data: GameData;
  readonly delta: RegionDelta;
  readonly player: PlayerState;
  readonly enemies: EnemyState[] = [];
  readonly projectiles: ProjectileState[] = [];
  readonly pickups: PickupState[] = [];
  readonly targets: TargetState[] = [];
  readonly vents: VentState[] = [];
  readonly temp: Record<string, boolean> = {};
  readonly rng: Rng;
  readonly ctx: ConditionContext;
  readonly path: PathField;
  readonly explored: Uint8Array;
  time = 0;
  tick = 0;
  /** pending events since last drain */
  private events: SequencedEvent[] = [];
  private seq = 0;
  private projectileSeq = 0;
  private insideTriggers = new Set<string>();
  private exitLatched = false;
  private flagsKey = '';
  ventCycleT = 0;
  ventGroup: 'a' | 'b' = 'a';
  /** true once an auto/requested exit fired; Game swaps regions */
  exiting = false;

  constructor(def: RegionDef, data: GameData, spawn: { x: number; y: number; face: Face }) {
    this.def = def;
    this.data = data;
    this.grid = new Grid(def);
    this.delta = regionDelta(data, def.id);
    this.rng = new Rng(`${def.id}:${data.playSeconds.toFixed(3)}:${data.deaths}`);
    this.path = new PathField(this.grid);
    this.explored = decodeExplored(this.delta.explored, this.grid.w * this.grid.h);
    this.ctx = {
      flag: (id) => (id.startsWith('tmp_') ? this.temp[id] === true : this.data.flags[id] === true),
      hasCapability: (id) => this.data.capabilities.includes(id),
      hasWeapon: (id) => (this.data.weapons as string[]).includes(id),
    };
    this.player = {
      x: spawn.x,
      y: spawn.y,
      face: spawn.face,
      aim: faceAngle(spawn.face),
      moving: false,
      walkT: 0,
      lastMoveX: Math.cos(faceAngle(spawn.face)),
      lastMoveY: Math.sin(faceAngle(spawn.face)),
      dodgeT: 0,
      dodgeCd: 0,
      dodgeDx: 0,
      dodgeDy: 0,
      dodgeBuffer: 0,
      iframes: 0.5,
      hurtT: 0,
      healT: 0,
      reloadT: 0,
      fireCd: 0,
      idleFireT: 0,
      dryLatch: false,
      alive: data.hp > 0,
      deathT: 0,
      deathSource: '',
      latchedBy: null,
      targetId: null,
      firingT: 0,
      footT: 0,
      manualAim: false,
    };
    for (const e of def.entities) this.spawnEntity(e);
    if (data.cache && data.cache.regionId === def.id) {
      this.pickups.push({ id: 'recovery_cache', item: 'cache', amount: 1, x: data.cache.x, y: data.cache.y, visible: true, bob: 0 });
    }
    this.refresh();
    // Arrival inside a trigger should not fire it immediately (e.g. returning through a doorway).
    for (const e of def.entities) if (e.kind === 'trigger' && this.inRect(e, this.player.x, this.player.y)) this.insideTriggers.add(e.id);
    this.markExplored();
  }

  private spawnEntity(e: EntityDef): void {
    switch (e.kind) {
      case 'enemy': {
        if (this.delta.defeated.includes(e.id)) return;
        this.enemies.push(createEnemy(e, this));
        return;
      }
      case 'pickup': {
        if (this.delta.collected.includes(e.id)) return;
        const p: PickupState = { id: e.id, item: e.item, amount: e.amount, x: e.tx * TILE + 8, y: e.ty * TILE + 10, visible: true, bob: this.pickups.length };
        if (e.journal) p.journal = e.journal;
        this.pickups.push(p);
        return;
      }
      case 'target':
        this.targets.push({ id: e.id, x: e.tx * TILE + 8, y: e.ty * TILE + 12, knocked: false });
        return;
      case 'vent':
        this.vents.push({ id: e.id, x: e.tx * TILE + 8, y: e.ty * TILE + 8, group: e.group, state: 'idle' });
        return;
      default:
        return;
    }
  }

  // ------------------------------------------------------------------ events
  emit(e: SimEvent): void {
    this.events.push({ ...e, seq: ++this.seq } as SequencedEvent);
  }

  drainEvents(): SequencedEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  cond(c: Parameters<typeof evaluate>[0]): boolean {
    return evaluate(c, this.ctx);
  }

  /** Re-stamp dynamic geometry (props, gates) after flags change. */
  refresh(): void {
    this.grid.resetDynamic();
    for (const e of this.def.entities) {
      if (e.kind !== 'prop' || !e.solid) continue;
      if (e.solidWhen && !this.cond(e.solidWhen)) continue;
      if (e.visibleWhen && !this.cond(e.visibleWhen) && !e.solidWhen) continue;
      this.grid.stamp(e.tx, e.ty, e.solid.w, e.solid.h, { block: true, shot: true, light: e.opaque === true });
    }
    for (const en of this.enemies) if (!en.active && en.type !== 'keeper') en.active = this.isEnemyActive(en.id);
    for (const p of this.pickups) {
      const def = this.def.entities.find((d) => d.id === p.id);
      p.visible = !(def && def.kind === 'pickup' && def.when) || this.cond(def.kind === 'pickup' ? def.when : undefined);
    }
    this.path.invalidate();
    this.flagsKey = JSON.stringify(this.data.flags) + JSON.stringify(this.temp);
  }

  isEnemyActive(id: string): boolean {
    const def = this.def.entities.find((d) => d.id === id);
    return !(def && def.kind === 'enemy' && def.activeWhen) || this.cond(def.kind === 'enemy' ? def.activeWhen : undefined);
  }

  setFlag(id: string, value = true): void {
    if (id.startsWith('tmp_')) this.temp[id] = value;
    else this.data.flags[id] = value;
    this.refresh();
  }

  // ------------------------------------------------------------------ step
  step(cmd: Commands): void {
    this.time += DT;
    this.tick++;
    const fk = JSON.stringify(this.data.flags) + JSON.stringify(this.temp);
    if (fk !== this.flagsKey) this.refresh();
    this.updatePlayer(cmd);
    if (cmd.interact && this.player.alive && !this.exiting) this.interact();
    this.path.update(this.player.x, this.player.y - 4, this.time);
    for (const e of this.enemies) updateEnemy(e, this);
    this.updateProjectiles();
    this.updateVents();
    if (this.player.alive) {
      this.updatePickups();
      this.updateTriggersAndExits();
    }
    if (this.tick % 15 === 0) this.markExplored();
  }

  // ------------------------------------------------------------------ player
  private updatePlayer(cmd: Commands): void {
    const p = this.player;
    const d = this.data;
    p.iframes = Math.max(0, p.iframes - DT);
    p.hurtT = Math.max(0, p.hurtT - DT);
    p.dodgeCd = Math.max(0, p.dodgeCd - DT);
    p.fireCd = Math.max(0, p.fireCd - DT);
    p.firingT = Math.max(0, p.firingT - DT);
    if (!p.alive) {
      p.deathT += DT;
      return;
    }

    if (cmd.torch) {
      d.torchOn = !d.torchOn;
      this.emit({ type: 'TorchToggled', on: d.torchOn });
    }
    if (cmd.swap && d.weapons.length > 1 && p.healT <= 0) {
      d.activeWeapon = (d.activeWeapon + 1) % d.weapons.length;
      p.reloadT = 0;
      p.fireCd = Math.max(p.fireCd, 0.18);
      this.emit({ type: 'WeaponSwapped', weaponId: d.weapons[d.activeWeapon]! });
    }

    // movement intent
    let mx = cmd.moveX;
    let my = cmd.moveY;
    const ml = Math.hypot(mx, my);
    if (ml > 1) {
      mx /= ml;
      my /= ml;
    }
    const movingIntent = ml > 0.15;
    if (movingIntent) {
      p.lastMoveX = mx / Math.max(ml, 0.001);
      p.lastMoveY = my / Math.max(ml, 0.001);
    }

    // dodge (buffered briefly, rejected visibly when impossible)
    if (cmd.dodge) p.dodgeBuffer = DODGE_BUFFER;
    if (p.dodgeBuffer > 0) {
      if (p.dodgeT <= 0 && p.dodgeCd <= 0) {
        p.dodgeBuffer = 0;
        p.dodgeT = DODGE_TIME;
        p.dodgeCd = DODGE_COOLDOWN;
        p.dodgeDx = movingIntent ? p.lastMoveX : p.lastMoveX;
        p.dodgeDy = movingIntent ? p.lastMoveY : p.lastMoveY;
        p.iframes = Math.max(p.iframes, DODGE_IFRAMES);
        if (p.healT > 0) {
          p.healT = 0;
          this.emit({ type: 'HealCancelled' });
        }
        if (p.latchedBy) this.detachLeech(p.latchedBy);
        this.emit({ type: 'Dodged', x: p.x, y: p.y, dx: p.dodgeDx, dy: p.dodgeDy });
      } else {
        p.dodgeBuffer -= DT;
        if (p.dodgeBuffer <= 0) this.emit({ type: 'DodgeRejected' });
      }
    }

    // heal
    if (cmd.heal && p.healT <= 0 && p.dodgeT <= 0) {
      if (d.bandages > 0 && d.hp < d.maxHp) {
        p.healT = HEAL_TIME;
        p.reloadT = 0;
        this.emit({ type: 'HealStarted' });
      } else this.emit({ type: 'Locked', textId: d.bandages > 0 ? 'heal_full' : 'heal_none' });
    }
    if (p.healT > 0) {
      p.healT -= DT;
      if (p.healT <= 0) {
        p.healT = 0;
        const amount = Math.min(BANDAGE_HEAL, d.maxHp - d.hp);
        d.hp += amount;
        d.bandages--;
        this.emit({ type: 'Healed', amount });
      }
    }

    // displacement
    let vx = 0;
    let vy = 0;
    if (p.dodgeT > 0) {
      const sp = DODGE_DIST / DODGE_TIME;
      vx = p.dodgeDx * sp;
      vy = p.dodgeDy * sp;
      p.dodgeT = Math.max(0, p.dodgeT - DT);
    } else if (movingIntent) {
      const speed = PLAYER_SPEED * (p.healT > 0 ? 0.4 : 1) * (p.latchedBy ? 0.6 : 1) * Math.min(1, 0.35 + ml);
      vx = (mx / ml) * speed;
      vy = (my / ml) * speed;
    }
    const before = { x: p.x, y: p.y };
    this.moveBox(p, vx * DT, vy * DT, PLAYER_HW, PLAYER_HH);
    const moved = Math.hypot(p.x - before.x, p.y - before.y);
    p.moving = moved > 0.05 && p.dodgeT <= 0;
    if (p.moving) {
      p.walkT += moved;
      p.footT += moved;
      if (p.footT > 14) {
        p.footT = 0;
        this.emit({ type: 'Footstep', x: p.x, y: p.y, surface: this.surfaceAt(p.x, p.y) });
      }
    }

    // aim: manual drag/mouse overrides; otherwise facing with assistance while firing
    const weapon = d.weapons.length ? WEAPONS[d.weapons[d.activeWeapon]!] : null;
    p.manualAim = cmd.aimAngle !== null;
    if (cmd.aimAngle !== null) {
      p.aim = cmd.aimAngle;
      p.targetId = null;
    } else {
      const facing = movingIntent ? Math.atan2(my, mx) : p.aim;
      const target = weapon && cmd.assist ? this.selectTarget(facing, weapon.maxRangePx + 30) : null;
      p.targetId = target ? target.id : null;
      if (target && (cmd.fire || p.firingT > 0)) p.aim = Math.atan2(target.y - (p.y - 8), target.x - p.x);
      else p.aim = facing;
    }
    if (p.dodgeT <= 0) p.face = angleFace(movingIntent && !cmd.fire && cmd.aimAngle === null ? Math.atan2(my, mx) : p.aim);

    // weapon
    if (weapon) {
      const id = weapon.id;
      const mag = d.mag[id] ?? 0;
      if (p.reloadT > 0) {
        p.reloadT -= DT;
        if (p.reloadT <= 0) {
          p.reloadT = 0;
          const take = Math.min(weapon.magazine - mag, d.reserves[weapon.ammoPool]);
          d.mag[id] = mag + take;
          d.reserves[weapon.ammoPool] -= take;
          this.emit({ type: 'ReloadFinished', weaponId: id });
        }
      }
      const canAct = p.dodgeT <= 0 && p.healT <= 0 && p.reloadT <= 0;
      if (!cmd.fire) p.dryLatch = false;
      if (cmd.fire) p.firingT = 0.6;
      p.idleFireT = cmd.fire ? 0 : p.idleFireT + DT;
      if (cmd.fire && canAct && p.fireCd <= 0) {
        if ((d.mag[id] ?? 0) > 0) this.fire(weapon.id);
        else if (d.reserves[weapon.ammoPool] > 0) this.startReload();
        else if (!p.dryLatch) {
          p.dryLatch = true;
          this.emit({ type: 'DryFire' });
        }
      }
      const wantsReload = cmd.reload || (p.idleFireT > 1.4 && !this.anyEngaged() && (d.mag[id] ?? 0) < weapon.magazine);
      if (wantsReload && canAct && (d.mag[id] ?? 0) < weapon.magazine && d.reserves[weapon.ammoPool] > 0) this.startReload();
    }
  }

  private startReload(): void {
    const d = this.data;
    const id = d.weapons[d.activeWeapon];
    if (!id || this.player.reloadT > 0) return;
    this.player.reloadT = WEAPONS[id].reloadMs / 1000;
    this.emit({ type: 'ReloadStarted', weaponId: id });
  }

  reloadProgress(): number {
    const id = this.data.weapons[this.data.activeWeapon];
    if (!id || this.player.reloadT <= 0) return 0;
    return 1 - this.player.reloadT / (WEAPONS[id].reloadMs / 1000);
  }

  private fire(id: keyof typeof WEAPONS): void {
    const p = this.player;
    const w = WEAPONS[id];
    this.data.mag[id] = (this.data.mag[id] ?? 0) - 1;
    p.fireCd = w.cadenceMs / 1000;
    const hand = this.handPoint();
    const mx = hand.x + Math.cos(p.aim) * w.muzzlePx;
    const my = hand.y + Math.sin(p.aim) * w.muzzlePx;
    this.emit({ type: 'WeaponFired', weaponId: id, x: mx, y: my, angle: p.aim });
    for (let i = 0; i < w.projectilesPerShot; i++) {
      const spread = w.projectilesPerShot > 1 ? ((i / (w.projectilesPerShot - 1)) - 0.5) * w.spreadRadians + this.rng.range(-0.04, 0.04) : this.rng.range(-w.spreadRadians, w.spreadRadians);
      const a = p.aim + spread;
      this.projectiles.push({
        id: ++this.projectileSeq,
        x: p.x,
        y: p.y - 8,
        dx: Math.cos(a),
        dy: Math.sin(a),
        speed: w.projectileSpeed * (w.projectilesPerShot > 1 ? this.rng.range(0.9, 1.1) : 1),
        dist: 0,
        maxDist: w.maxRangePx * (w.projectilesPerShot > 1 ? this.rng.range(0.85, 1.1) : 1),
        damage: w.damagePerProjectile,
        weaponId: id,
        alive: true,
        sx: mx,
        sy: my,
      });
    }
    // Sound propagates locally; walls attenuate. Light-sensitive creatures react to the flash.
    for (const e of this.enemies) {
      if (e.dead || !e.active) continue;
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      const los = this.grid.clear(this.grid.shot, p.x, p.y - 8, e.x, e.y - e.hh);
      if (dist < (los ? w.noisePx : w.noisePx * 0.5)) {
        e.seenX = p.x;
        e.seenY = p.y;
        e.hasSeen = true;
        if (!e.alerted && e.type !== 'leech' && e.type !== 'keeper') {
          e.alerted = true;
          this.emit({ type: 'EnemyAlerted', id: e.id, enemy: e.type, x: e.x, y: e.y });
        }
      }
      if (e.type === 'leech' && dist < w.flashRadiusPx && this.grid.clear(this.grid.light, mx, my, e.x, e.y - 8) && e.state !== 'latch') {
        e.state = 'flee';
        e.t = 1.4;
        e.meter = Math.min(e.meter, 0.3);
        this.emit({ type: 'LeechFled', id: e.id });
      }
    }
  }

  /** Weapon hand pivot in world px (also used by rendering). */
  handPoint(): { x: number; y: number } {
    const p = this.player;
    const side = Math.cos(p.aim) >= 0 ? 1 : -1;
    return { x: p.x + side * 3, y: p.y - 11 + (p.face === 'up' ? -1 : 0) };
  }

  private selectTarget(facing: number, range: number): { id: string; x: number; y: number } | null {
    const p = this.player;
    const cx = p.x;
    const cy = p.y - 8;
    let best: { id: string; x: number; y: number; score: number } | null = null;
    let current: { id: string; x: number; y: number; score: number } | null = null;
    const consider = (id: string, x: number, y: number, threat: number): void => {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > range) return;
      const diff = Math.abs(wrapAngle(Math.atan2(y - cy, x - cx) - facing));
      const cone = dist < 28 ? Math.PI : ASSIST_CONE;
      if (diff > cone) return;
      if (!this.grid.clear(this.grid.shot, cx, cy, x, y)) return;
      const score = diff * 1.2 + (dist / range) * 0.6 - threat;
      const cand = { id, x, y, score };
      if (!best || score < best.score) best = cand;
      if (id === p.targetId) current = cand;
    };
    for (const e of this.enemies) {
      if (e.dead || !e.active) continue;
      const threat = e.id === p.latchedBy ? 1.5 : e.state === 'telegraph' || e.state.endsWith('_tell') ? 0.35 : e.alerted ? 0.15 : 0;
      consider(e.id, e.x, e.y - e.hh, threat);
    }
    if (!best) for (const t of this.targets) if (!t.knocked) consider(t.id, t.x, t.y - 4, -0.2);
    const b = best as { id: string; x: number; y: number; score: number } | null;
    const c = current as { id: string; x: number; y: number; score: number } | null;
    if (c && b && c.score <= b.score + 0.25) return c; // hysteresis: no jitter between similar targets
    return b;
  }

  anyEngaged(): boolean {
    return this.enemies.some((e) => !e.dead && e.active && e.alerted && Math.hypot(e.x - this.player.x, e.y - this.player.y) < 220);
  }

  // ------------------------------------------------------------------ projectiles
  private updateProjectiles(): void {
    for (const b of this.projectiles) {
      if (!b.alive) continue;
      const step = Math.min(b.speed * DT, b.maxDist - b.dist);
      const wall = this.grid.ray(this.grid.shot, b.x, b.y, b.dx, b.dy, step);
      let bestT = wall.hit ? wall.dist : Infinity;
      let hitEnemy: EnemyState | null = null;
      let hitTarget: TargetState | null = null;
      for (const e of this.enemies) {
        if (e.dead || !e.active) continue;
        const t = segCircle(b.x, b.y, b.dx, b.dy, step, e.x, e.y - e.hh, e.radius);
        if (t !== null && t < bestT) {
          bestT = t;
          hitEnemy = e;
          hitTarget = null;
        }
      }
      for (const tg of this.targets) {
        if (tg.knocked) continue;
        const t = segCircle(b.x, b.y, b.dx, b.dy, step, tg.x, tg.y - 4, 4);
        if (t !== null && t < bestT) {
          bestT = t;
          hitTarget = tg;
          hitEnemy = null;
        }
      }
      if (bestT === Infinity) {
        b.x += b.dx * step;
        b.y += b.dy * step;
        b.dist += step;
        if (b.dist >= b.maxDist - 0.01) b.alive = false;
        continue;
      }
      const hx = b.x + b.dx * bestT;
      const hy = b.y + b.dy * bestT;
      b.alive = false;
      b.x = hx;
      b.y = hy;
      const angle = Math.atan2(b.dy, b.dx);
      if (hitEnemy) {
        damageEnemy(hitEnemy, this, b.damage, hx, hy, angle, WEAPONS[b.weaponId].knockback, b.weaponId);
      } else if (hitTarget) {
        hitTarget.knocked = true;
        this.emit({ type: 'Impact', x: hx, y: hy, angle, material: 'tin' });
        this.emit({ type: 'TargetKnocked', id: hitTarget.id, x: hitTarget.x, y: hitTarget.y });
      } else {
        const mat = this.def.biome === 'surface_town' && this.def.ambience === 'rain' ? 'wall' : this.materialAtCell(wall.cx, wall.cy);
        this.emit({ type: 'Impact', x: hx - b.dx * 0.5, y: hy - b.dy * 0.5, angle, material: mat });
      }
    }
    // compact
    for (let i = this.projectiles.length - 1; i >= 0; i--) if (!this.projectiles[i]!.alive) this.projectiles.splice(i, 1);
  }

  private materialAtCell(cx: number, cy: number): 'wall' | 'metal' {
    if (this.grid.isWall(cx, cy)) return this.def.biome === 'service_veins' && this.def.ambience === 'gallery' ? 'metal' : 'wall';
    return 'metal';
  }

  // ------------------------------------------------------------------ player damage
  hurtPlayer(amount: number, source: string, fromX: number, fromY: number): boolean {
    const p = this.player;
    if (!p.alive || p.iframes > 0) return false;
    const d = this.data;
    d.hp = Math.max(0, d.hp - amount);
    p.iframes = HURT_IFRAMES;
    p.hurtT = 0.25;
    if (p.healT > 0) {
      p.healT = 0;
      this.emit({ type: 'HealCancelled' });
    }
    const angle = Math.atan2(p.y - fromY, p.x - fromX);
    this.emit({ type: 'PlayerHurt', amount, source, angle });
    this.emit({ type: 'DamageApplied', target: 'player', amount, x: p.x, y: p.y - 8, material: 'flesh', source, fatal: d.hp <= 0 });
    // brief knockback away from the source
    this.moveBox(p, Math.cos(angle) * 5, Math.sin(angle) * 5, PLAYER_HW, PLAYER_HH);
    if (d.hp <= 0) {
      p.alive = false;
      p.deathT = 0;
      p.deathSource = source;
      p.reloadT = 0;
      if (p.latchedBy) this.detachLeech(p.latchedBy);
      this.emit({ type: 'PlayerDied', source });
    }
    return true;
  }

  /** Continuous drain that ignores i-frames (a latched leech) but never double-applies per tick. */
  drainPlayer(amount: number, source: string): void {
    const p = this.player;
    if (!p.alive) return;
    this.data.hp = Math.max(0, this.data.hp - amount);
    if (this.data.hp <= 0) {
      p.iframes = 0;
      this.data.hp = 0.0001;
      this.hurtPlayer(1, source, p.x, p.y + 1);
    }
  }

  detachLeech(id: string): void {
    const e = this.enemies.find((x) => x.id === id);
    this.player.latchedBy = null;
    if (e && !e.dead) {
      e.state = 'stunned';
      e.t = 1.1;
      const a = this.rng.range(0, Math.PI * 2);
      e.x += Math.cos(a) * 10;
      e.y += Math.sin(a) * 10;
      this.emit({ type: 'LeechDetached', id });
    }
  }

  // ------------------------------------------------------------------ pickups, triggers, exits
  private updatePickups(): void {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i]!;
      if (!k.visible) continue;
      if (Math.hypot(k.x - p.x, k.y - p.y) > 12) continue;
      this.pickups.splice(i, 1);
      this.applyPickup(k);
    }
  }

  private applyPickup(k: PickupState): void {
    const d = this.data;
    switch (k.item) {
      case 'service_pistol':
      case 'pump_shotgun':
        giveWeapon(d, k.item);
        break;
      case 'light_rounds':
      case 'shells':
        d.reserves[k.item as AmmoPool] += k.amount;
        break;
      case 'bandage':
        d.bandages += k.amount;
        break;
      case 'torch_lens':
        if (!d.capabilities.includes(CAP_TORCH_LENS)) d.capabilities.push(CAP_TORCH_LENS);
        break;
      case 'note':
        if (k.journal && !d.journal.includes(k.journal)) d.journal.push(k.journal);
        break;
      case 'cache':
        if (d.cache) {
          d.reserves.light_rounds += d.cache.reserves.light_rounds;
          d.reserves.shells += d.cache.reserves.shells;
          d.bandages += d.cache.bandages;
          d.cache = null;
          this.emit({ type: 'CacheRecovered' });
        }
        break;
    }
    if (k.item !== 'cache') this.delta.collected.push(k.id);
    this.emit({ type: 'PickedUp', id: k.id, item: k.item === 'cache' ? 'note' : k.item, amount: k.amount, x: k.x, y: k.y });
  }

  private inRect(e: { tx: number; ty: number; w?: number; h?: number }, x: number, y: number): boolean {
    const w = (e.w ?? 1) * TILE;
    const h = (e.h ?? 1) * TILE;
    return x >= e.tx * TILE && x < e.tx * TILE + w && y - 3 >= e.ty * TILE - 4 && y - 3 < e.ty * TILE + h;
  }

  private updateTriggersAndExits(): void {
    if (this.exiting) return;
    const p = this.player;
    for (const e of this.def.entities) {
      if (e.kind === 'trigger') this.checkTrigger(e);
      else if (e.kind === 'exit' && e.auto) {
        const inside = this.inRect(e, p.x, p.y);
        if (inside && !this.exitLatched && this.cond(e.gate)) {
          this.exitLatched = true;
          this.exiting = true;
          this.emit({ type: 'ExitRequested', region: e.target.region, entry: e.target.entry });
          return;
        }
      }
    }
  }

  private checkTrigger(e: TriggerDef): void {
    const inside = this.inRect(e, this.player.x, this.player.y);
    if (!inside) {
      this.insideTriggers.delete(e.id);
      return;
    }
    if (this.insideTriggers.has(e.id)) return;
    this.insideTriggers.add(e.id);
    if (e.once && this.delta.triggers.includes(e.id)) return;
    if (e.once) this.delta.triggers.push(e.id);
    this.emit({ type: 'ActionRequested', action: e.action, entityId: e.id });
  }

  /** Nearest available interaction (verb + object), used for the context prompt and button. */
  interactionCandidate(): { def: InteractDef | ExitDef; prompt: Prompt } | null {
    const p = this.player;
    if (!p.alive) return null;
    let best: { def: InteractDef | ExitDef; prompt: Prompt; d: number } | null = null;
    for (const e of this.def.entities) {
      if (e.kind !== 'interact' && !(e.kind === 'exit' && !e.auto)) continue;
      let locked = false;
      if (e.kind === 'interact') {
        if (e.hideWhen && this.cond(e.hideWhen)) continue;
        if (e.when && !this.cond(e.when)) {
          if (!e.lockedText) continue;
          locked = true;
        }
      } else {
        if (!this.cond(e.gate)) {
          if (!e.lockedText) continue;
          locked = true;
        }
      }
      const w = (e.w ?? 1) * TILE;
      const h = (e.h ?? 1) * TILE;
      const cx = e.tx * TILE + w / 2;
      const cy = e.ty * TILE + h / 2;
      // distance from the player's feet to the footprint rectangle
      const dx = Math.max(e.tx * TILE - p.x, 0, p.x - (e.tx * TILE + w));
      const dy = Math.max(e.ty * TILE - (p.y - 3), 0, p.y - 3 - (e.ty * TILE + h));
      const dist = Math.hypot(dx, dy);
      const reach = e.kind === 'interact' ? (e.reach ?? 14) : 12;
      if (dist > reach) continue;
      if (!best || dist < best.d) {
        best = {
          def: e,
          d: dist,
          prompt: { id: e.id, verb: e.verb ?? 'Use', label: e.label ?? '', locked, x: cx, y: cy },
        };
      }
    }
    return best ? { def: best.def, prompt: best.prompt } : null;
  }

  /** Called by the controller when the interact command is pressed. */
  interact(): void {
    const c = this.interactionCandidate();
    if (!c) return;
    const e = c.def;
    if (e.kind === 'exit') {
      if (!this.cond(e.gate)) {
        if (e.lockedText) this.emit({ type: 'Locked', textId: e.lockedText });
        return;
      }
      this.exiting = true;
      this.emit({ type: 'ExitRequested', region: e.target.region, entry: e.target.entry });
      return;
    }
    if (e.when && !this.cond(e.when)) {
      if (e.lockedText) this.emit({ type: 'Locked', textId: e.lockedText });
      return;
    }
    this.emit({ type: 'ActionRequested', action: e.action, entityId: e.id });
  }

  // ------------------------------------------------------------------ boss floor vents
  private updateVents(): void {
    if (!this.vents.length) return;
    const keeper = this.enemies.find((e) => e.type === 'keeper');
    const active = keeper && !keeper.dead && keeper.phase >= 2 && !this.ctx.flag('pipekeeper_wheel_closed');
    if (!active) {
      for (const v of this.vents) v.state = 'idle';
      this.ventCycleT = 0;
      return;
    }
    this.ventCycleT += DT;
    // cycle: tell 0.9s -> burst 0.45s -> rest 1.3s, alternating groups
    const t = this.ventCycleT;
    const group = this.ventGroup;
    const prev = this.vents.find((v) => v.group === group)?.state;
    const state: VentState['state'] = t < 0.9 ? 'tell' : t < 1.35 ? 'burst' : 'idle';
    for (const v of this.vents) v.state = v.group === group ? state : 'idle';
    if (state === 'tell' && prev === 'idle' && t < DT * 1.5) this.emit({ type: 'VentTelegraph', group });
    if (state === 'burst' && prev === 'tell') {
      for (const v of this.vents) {
        if (v.group !== group) continue;
        this.emit({ type: 'VentBurst', x: v.x, y: v.y });
        if (Math.abs(this.player.x - v.x) < 10 && Math.abs(this.player.y - 3 - v.y) < 10) this.hurtPlayer(10, 'steam vent', v.x, v.y);
      }
    }
    if (t > 2.65) {
      this.ventCycleT = 0;
      this.ventGroup = group === 'a' ? 'b' : 'a';
    }
  }

  // ------------------------------------------------------------------ geometry helpers
  moveBox(ent: { x: number; y: number }, dx: number, dy: number, hw: number, hh: number, layer = this.grid.block): { hitX: boolean; hitY: boolean } {
    const free = (x: number, y: number): boolean => !this.boxOn(layer, x - hw, y - hh, x + hw, y);
    let hitX = false;
    let hitY = false;
    let rem = dx;
    while (Math.abs(rem) > 1e-6) {
      const s = Math.sign(rem) * Math.min(1, Math.abs(rem));
      if (free(ent.x + s, ent.y)) {
        ent.x += s;
        rem -= s;
      } else {
        // corner forgiveness: slide around near-miss corners when moving mostly on this axis
        if (Math.abs(dx) > Math.abs(dy) * 2) {
          for (const o of [1, -1, 2, -2, 3, -3]) {
            if (free(ent.x, ent.y + o) && free(ent.x + s, ent.y + o)) {
              ent.y += Math.sign(o) * Math.min(Math.abs(o), 0.6);
              break;
            }
          }
        }
        hitX = true;
        break;
      }
    }
    rem = dy;
    while (Math.abs(rem) > 1e-6) {
      const s = Math.sign(rem) * Math.min(1, Math.abs(rem));
      if (free(ent.x, ent.y + s)) {
        ent.y += s;
        rem -= s;
      } else {
        if (Math.abs(dy) > Math.abs(dx) * 2) {
          for (const o of [1, -1, 2, -2, 3, -3]) {
            if (free(ent.x + o, ent.y) && free(ent.x + o, ent.y + s)) {
              ent.x += Math.sign(o) * Math.min(Math.abs(o), 0.6);
              break;
            }
          }
        }
        hitY = true;
        break;
      }
    }
    return { hitX, hitY };
  }

  boxOn(layer: Uint8Array, x0: number, y0: number, x1: number, y1: number): boolean {
    const g = this.grid;
    const tx0 = Math.floor(x0 / TILE);
    const ty0 = Math.floor(y0 / TILE);
    const tx1 = Math.floor((x1 - 0.001) / TILE);
    const ty1 = Math.floor((y1 - 0.001) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (g.blocked(layer, tx, ty)) return true;
    return false;
  }

  surfaceAt(x: number, y: number): 'hard' | 'wet' | 'wood' | 'metal' | 'gravel' {
    const ch = this.def.map[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] ?? '.';
    const cd = this.def.legend[ch];
    if (!cd || !('floor' in cd)) return 'hard';
    const f = cd.floor;
    if (f === 7 || f === 8 || f === 9) return 'wood';
    if (f === 3 || f === 6 || f === 2 || f === 1 || f === 28 || f === 29) return 'wet';
    if (f === 15 || f === 16 || f === 17 || f === 18 || f === 30) return 'metal';
    if (f === 23 || f === 25) return 'gravel';
    return 'hard';
  }

  torchParams(): { range: number; half: number } {
    const lens = this.data.capabilities.includes(CAP_TORCH_LENS);
    return { range: lens ? TORCH_RANGE_LENS : TORCH_RANGE, half: lens ? TORCH_HALF_ANGLE_LENS : TORCH_HALF_ANGLE };
  }

  /** Is a point inside the player's lit torch cone (with light line of sight)? */
  inTorch(x: number, y: number): boolean {
    if (!this.data.torchOn || !this.player.alive) return false;
    const p = this.player;
    const { range, half } = this.torchParams();
    const d = Math.hypot(x - p.x, y - (p.y - 8));
    if (d > range) return false;
    if (Math.abs(wrapAngle(Math.atan2(y - (p.y - 8), x - p.x) - p.aim)) > half) return false;
    return this.grid.clear(this.grid.light, p.x, p.y - 8, x, y);
  }

  private markExplored(): void {
    const p = this.player;
    const g = this.grid;
    const ptx = Math.floor(p.x / TILE);
    const pty = Math.floor((p.y - 4) / TILE);
    const R = 7;
    for (let ty = pty - R; ty <= pty + R; ty++)
      for (let tx = ptx - R; tx <= ptx + R; tx++) {
        if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) continue;
        const i = ty * g.w + tx;
        if (this.explored[i]) continue;
        if ((tx - ptx) ** 2 + (ty - pty) ** 2 > R * R) continue;
        const cx = tx * TILE + 8;
        const cy = ty * TILE + 8;
        // walls are explored when their face is seen
        const d = Math.hypot(cx - p.x, cy - (p.y - 6));
        const hit = g.ray(g.light, p.x, p.y - 6, (cx - p.x) / (d || 1), (cy - (p.y - 6)) / (d || 1), d);
        if (!hit.hit || (hit.cx === tx && hit.cy === ty)) this.explored[i] = 1;
      }
  }

  exportExplored(): string {
    return encodeExplored(this.explored);
  }
}

// ------------------------------------------------------------------ math helpers
export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function faceAngle(f: Face): number {
  return f === 'right' ? 0 : f === 'down' ? Math.PI / 2 : f === 'left' ? Math.PI : -Math.PI / 2;
}

export function angleFace(a: number): Face {
  const c = Math.cos(a);
  const s = Math.sin(a);
  if (Math.abs(c) > Math.abs(s) * 0.9) return c > 0 ? 'right' : 'left';
  return s > 0 ? 'down' : 'up';
}

/** Segment (origin + dir * [0,len]) vs circle; returns distance along segment or null. */
export function segCircle(ox: number, oy: number, dx: number, dy: number, len: number, cx: number, cy: number, r: number): number | null {
  const fx = ox - cx;
  const fy = oy - cy;
  const b = fx * dx + fy * dy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0 || t > len) return null;
  return t;
}

function encodeExplored(bits: Uint8Array): string {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) if (bits[i]) bytes[i >> 3]! |= 1 << (i & 7);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function decodeExplored(b64: string, n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (!b64) return out;
  try {
    const s = atob(b64);
    for (let i = 0; i < n; i++) out[i] = (s.charCodeAt(i >> 3) >> (i & 7)) & 1;
  } catch {
    // corrupted map knowledge is cosmetic; start fresh rather than failing the load
  }
  return out;
}

