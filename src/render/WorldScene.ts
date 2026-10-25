// Presentation of the active World: tilemaps, y-sorted sprites, light mask, particles,
// telegraphs and camera. Reads sim state; reacts to sim events; never changes gameplay.
import Phaser from 'phaser';
import type { PropDef, Rgb, StaticLight } from '../content/types.ts';
import { TILE } from '../content/tiles.ts';
import { WEAPONS } from '../content/weapons.ts';
import type { World } from '../sim/world.ts';
import { wrapAngle } from '../sim/world.ts';
import type { SequencedEvent } from '../sim/events.ts';
import type { EnemyState } from '../sim/types.ts';
import { KEEPER, nozzle } from '../sim/keeper.ts';
import { buildTileLayers } from './autotile.ts';
import { LightMap, LIGHT_SCALE, type LightSource } from './lighting.ts';
import { ParticlePool, type ParticleLayer } from './particles.ts';
import type { Settings } from '../app/settings.ts';
import { PARTICLE_BUDGET, DYNAMIC_LIGHT_BUDGET } from '../app/settings.ts';
import type { AudioEngine } from '../audio/audio.ts';

const D = {
  floor: 0,
  floorProp: 1,
  floorFx: 2,
  shadow: 3,
  walls: 4,
  wallProp: 5,
  sorted: 10,
  air: 40,
  rain: 41,
  light: 50,
  glow: 51,
  glowFx: 52,
  tracer: 53,
  tele: 54,
  marker: 55,
};

interface PropView {
  def: PropDef;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image | null;
}

interface Flash {
  x: number;
  y: number;
  radius: number;
  color: Rgb;
  t: number;
  peak: number;
  decay: number;
  strength: number;
}

const ITEM_FRAME: Record<string, string> = {
  service_pistol: 'pickup_pistol',
  pump_shotgun: 'pickup_shotgun',
  light_rounds: 'pickup_light_rounds',
  shells: 'pickup_shells',
  bandage: 'pickup_bandage',
  torch_lens: 'pickup_torch_lens',
  note: 'pickup_note',
  cache: 'pickup_cache',
};

export class WorldScene extends Phaser.Scene {
  onFrame: ((dtMs: number) => void) | null = null;
  onReady: (() => void) | null = null;
  settings!: Settings;
  audio!: AudioEngine;
  zoom = 3;
  private world: World | null = null;
  private regionObjects: Phaser.GameObjects.GameObject[] = [];
  private maps: Phaser.Tilemaps.Tilemap[] = [];
  private props: PropView[] = [];
  private player!: { body: Phaser.GameObjects.Image; gun: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image };
  private enemySprites = new Map<string, { body: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image }>();
  private pickupSprites = new Map<string, { s: Phaser.GameObjects.Image; g: Phaser.GameObjects.Image }>();
  private targetSprites = new Map<string, Phaser.GameObjects.Image>();
  private ventSprites = new Map<string, Phaser.GameObjects.Image>();
  private tracerPool: Phaser.GameObjects.Image[] = [];
  private muzzle!: Phaser.GameObjects.Image;
  private muzzleT = 0;
  private recoilT = 0;
  private marker!: Phaser.GameObjects.Image;
  private reticle!: Phaser.GameObjects.Image;
  private tele!: Phaser.GameObjects.Graphics;
  private lightMap = new LightMap();
  private lightTex: Phaser.Textures.CanvasTexture | null = null;
  private lightImage!: Phaser.GameObjects.Image;
  private particles!: ParticlePool;
  private particleGfx!: Record<ParticleLayer, Phaser.GameObjects.Graphics>;
  private rainGfx!: Phaser.GameObjects.Graphics;
  private flashes: Flash[] = [];
  private shake = { x: 0, y: 0, mag: 0, t: 0 };
  private camX = 0;
  private camY = 0;
  private emitterAcc = new Map<string, number>();
  private moteAcc = 0;
  private rain: Array<{ x: number; y: number; vy: number; vx: number; len: number }> = [];
  private time0 = 0;
  /** world-space reticle for mouse aim (set by Game) */
  reticleWorld: { x: number; y: number } | null = null;
  ready = false;

  constructor() {
    super({ key: 'world' });
  }

  create(): void {
    this.particleGfx = {
      floor: this.add.graphics().setDepth(D.floorFx),
      air: this.add.graphics().setDepth(D.air),
      glow: this.add.graphics().setDepth(D.glowFx).setBlendMode(Phaser.BlendModes.ADD),
    };
    this.rainGfx = this.add.graphics().setDepth(D.rain);
    this.particles = new ParticlePool(this.particleGfx, PARTICLE_BUDGET[this.settings.quality]);
    this.tele = this.add.graphics().setDepth(D.tele);
    this.lightTex = this.textures.addCanvas('lightmap', this.lightMap.canvas);
    this.lightTex?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.lightImage = this.add.image(0, 0, 'lightmap').setOrigin(0, 0).setDepth(D.light).setBlendMode(Phaser.BlendModes.MULTIPLY).setScale(1 / LIGHT_SCALE);
    this.player = {
      shadow: this.add.image(0, 0, 'fx', 'shadow').setDepth(D.shadow),
      body: this.add.image(0, 0, 'chars', 'player_down_idle_0').setOrigin(0.5, 1),
      gun: this.add.image(0, 0, 'chars', 'weapon_service_pistol'),
    };
    this.muzzle = this.add.image(0, 0, 'fx', 'muzzle_pistol_0').setDepth(D.tracer).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.marker = this.add.image(0, 0, 'fx', 'target_0').setDepth(D.marker).setVisible(false);
    this.reticle = this.add.image(0, 0, 'fx', 'reticle').setDepth(D.marker).setVisible(false);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#07080c');
    this.ready = true;
    this.onReady?.();
  }

  override update(_time: number, delta: number): void {
    this.onFrame?.(Math.min(delta, 100));
  }

  setQuality(): void {
    if (this.particles) this.particles.budget = PARTICLE_BUDGET[this.settings.quality];
  }

  // ------------------------------------------------------------------ region lifecycle
  buildRegion(world: World): void {
    this.clearRegion();
    this.world = world;
    const def = world.def;
    const layers = buildTileLayers(def, world.grid);
    const floorMap = this.make.tilemap({ data: layers.floor, tileWidth: TILE, tileHeight: TILE });
    const ts1 = floorMap.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    floorMap.createLayer(0, ts1, 0, 0)!.setDepth(D.floor);
    const wallMap = this.make.tilemap({ data: layers.walls, tileWidth: TILE, tileHeight: TILE });
    const ts2 = wallMap.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    wallMap.createLayer(0, ts2, 0, 0)!.setDepth(D.walls);
    this.maps.push(floorMap, wallMap);

    for (const e of def.entities) {
      if (e.kind === 'prop') this.addProp(e);
    }
    for (const t of world.targets) {
      const s = this.add.image(t.x, t.y, 'props', 'tin_target_up').setOrigin(0.5, 1);
      this.targetSprites.set(t.id, s);
      this.regionObjects.push(s);
    }
    for (const v of world.vents) {
      const s = this.add.image(v.x, v.y, 'props', 'vent_0').setDepth(D.floorProp);
      this.ventSprites.set(v.id, s);
      this.regionObjects.push(s);
    }
    this.lightMap.setGrid(world.grid);
    this.particles.clear();
    this.flashes = [];
    this.rain = [];
    this.emitterAcc.clear();
    const p = world.player;
    this.camX = p.x;
    this.camY = p.y - 8;
    this.applyCamera(true);
  }

  private addProp(def: PropDef): void {
    const w = def.solid?.w ?? 1;
    const h = def.solid?.h ?? 1;
    const x = (def.tx + w / 2) * TILE + (def.ox ?? 0);
    const y = (def.ty + h) * TILE + (def.oy ?? 0);
    const s = this.add.image(Math.round(x), Math.round(y), 'props', def.frame).setOrigin(0.5, 1);
    if (def.floor) {
      s.setOrigin(0.5, 0.5).setPosition(Math.round(x), Math.round(y - h * TILE / 2)).setDepth(D.floorProp);
    } else if (def.wall) s.setDepth(D.wallProp);
    else s.setDepth(D.sorted + y * 0.01);
    let glow: Phaser.GameObjects.Image | null = null;
    if (def.glow) {
      glow = this.add.image(x + (def.glow.dx ?? 0), y + (def.glow.dy ?? 0), 'fx', 'glow_64').setDepth(D.glow).setBlendMode(Phaser.BlendModes.ADD);
      glow.setScale(def.glow.radius / 32).setTint(rgbInt(def.glow.color)).setAlpha(0.55);
      this.regionObjects.push(glow);
    }
    this.props.push({ def, sprite: s, glow });
    this.regionObjects.push(s);
  }

  private clearRegion(): void {
    for (const o of this.regionObjects) o.destroy();
    this.regionObjects = [];
    for (const m of this.maps) m.destroy();
    this.maps = [];
    this.props = [];
    for (const v of this.enemySprites.values()) {
      v.body.destroy();
      v.shadow.destroy();
    }
    this.enemySprites.clear();
    for (const v of this.pickupSprites.values()) {
      v.s.destroy();
      v.g.destroy();
    }
    this.pickupSprites.clear();
    this.targetSprites.clear();
    this.ventSprites.clear();
    for (const t of this.tracerPool) t.setVisible(false);
    this.world = null;
  }

  // ------------------------------------------------------------------ per-frame sync
  sync(world: World, dt: number, cameraFocus: { x: number; y: number } | null): void {
    if (world !== this.world) this.buildRegion(world);
    this.time0 += dt;
    this.syncProps(world);
    this.syncPlayer(world, dt);
    this.syncEnemies(world);
    this.syncPickups(world);
    this.syncProjectiles(world);
    this.syncTelegraphs(world);
    this.updateAmbientFx(world, dt);
    this.particles.update(dt);
    this.particles.draw();
    // camera
    const p = world.player;
    let tx = p.x;
    let ty = p.y - 10;
    if (cameraFocus) {
      tx = cameraFocus.x;
      ty = cameraFocus.y;
    } else if (p.alive) {
      const look = p.firingT > 0 || p.manualAim ? 22 : 8;
      tx += Math.cos(p.aim) * look;
      ty += Math.sin(p.aim) * look * 0.7;
    }
    const k = 1 - Math.pow(0.0015, dt);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    this.updateShake(dt);
    this.applyCamera(false);
    this.renderLights(world, dt);
  }

  private applyCamera(snap: boolean): void {
    const cam = this.cameras.main;
    const world = this.world;
    if (!world) return;
    cam.setZoom(this.zoom);
    const vw = cam.width / this.zoom;
    const vh = cam.height / this.zoom;
    const W = world.grid.w * TILE;
    const H = world.grid.h * TILE;
    let cx = W <= vw ? W / 2 : Phaser.Math.Clamp(this.camX, vw / 2, W - vw / 2);
    let cy = H <= vh ? H / 2 : Phaser.Math.Clamp(this.camY, vh / 2, H - vh / 2);
    if (snap) {
      this.camX = cx;
      this.camY = cy;
    }
    cx += this.shake.x;
    cy += this.shake.y;
    // snap the camera to whole device pixels so pixel art stays stable
    cx = Math.round(cx * this.zoom) / this.zoom;
    cy = Math.round(cy * this.zoom) / this.zoom;
    cam.centerOn(cx, cy);
  }

  addShake(mag: number, angle?: number): void {
    const k = this.settings.reducedShake ? 0.25 : 1;
    this.shake.mag = Math.max(this.shake.mag, mag * k);
    this.shake.t = 0.18;
    if (angle !== undefined) {
      this.shake.x -= Math.cos(angle) * mag * k * 0.6;
      this.shake.y -= Math.sin(angle) * mag * k * 0.6;
    }
  }

  private updateShake(dt: number): void {
    this.shake.t = Math.max(0, this.shake.t - dt);
    const m = this.shake.mag * (this.shake.t / 0.18);
    this.shake.x = this.shake.x * 0.6 + (Math.random() * 2 - 1) * m * 0.5;
    this.shake.y = this.shake.y * 0.6 + (Math.random() * 2 - 1) * m * 0.5;
    if (this.shake.t <= 0) {
      this.shake.mag = 0;
      this.shake.x *= 0.5;
      this.shake.y *= 0.5;
    }
  }

  private syncProps(world: World): void {
    const t = this.time0;
    for (const pv of this.props) {
      const d = pv.def;
      const visible = !d.visibleWhen || world.cond(d.visibleWhen);
      pv.sprite.setVisible(visible);
      let frame = d.frame;
      let anim = d.anim;
      const alts = d.alt ? (Array.isArray(d.alt) ? d.alt : [d.alt]) : [];
      for (const a of alts) {
        if (world.cond(a.when)) {
          if (a.frame) {
            frame = a.frame;
            anim = undefined;
          }
          if (a.anim) anim = a.anim;
          break;
        }
      }
      if (anim && anim.frames.length) frame = anim.frames[Math.floor(t * anim.fps) % anim.frames.length]!;
      if (pv.sprite.frame.name !== frame) pv.sprite.setFrame(frame);
      if (pv.glow) {
        const on = visible && (!d.glow?.when || world.cond(d.glow.when));
        pv.glow.setVisible(on);
        if (on) pv.glow.setAlpha(0.45 + Math.sin(t * 3 + d.tx) * 0.05);
      }
    }
    for (const tg of world.targets) this.targetSprites.get(tg.id)?.setFrame(tg.knocked ? 'tin_target_down' : 'tin_target_up').setDepth(D.sorted + tg.y * 0.01);
    for (const v of world.vents) {
      const s = this.ventSprites.get(v.id);
      if (!s) continue;
      s.setFrame(v.state === 'idle' ? 'vent_0' : v.state === 'tell' ? (Math.floor(t * 10) % 2 ? 'vent_1' : 'vent_2') : 'vent_2');
    }
  }

  private syncPlayer(world: World, dt: number): void {
    const p = world.player;
    const d = world.data;
    const { body, gun, shadow } = this.player;
    const dir = p.face === 'left' ? 'right' : p.face;
    let frame: string;
    if (!p.alive) frame = `player_death_${Math.min(5, Math.floor(p.deathT * 7))}`;
    else if (p.dodgeT > 0) frame = `player_${dir}_dodge_${Math.min(3, Math.floor((1 - p.dodgeT / 0.24) * 4))}`;
    else if (p.hurtT > 0) frame = `player_${dir}_hurt_${p.hurtT > 0.15 ? 0 : 1}`;
    else if (p.healT > 0) frame = `player_${dir}_heal_${Math.floor(this.time0 * 6) % 4}`;
    else if (p.moving) frame = `player_${dir}_walk_${Math.floor(p.walkT / 5) % 6}`;
    else frame = `player_${dir}_idle_${Math.floor(this.time0 * 3) % 4}`;
    body.setFrame(frame);
    body.setFlipX(p.face === 'left' && p.alive);
    body.setPosition(Math.round(p.x), Math.round(p.y + 1));
    body.setDepth(D.sorted + p.y * 0.01);
    shadow.setPosition(Math.round(p.x), Math.round(p.y)).setVisible(p.alive || p.deathT < 0.5);
    // damage flash: white fill while invulnerable after a hit
    if (p.hurtT > 0.12) body.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else body.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    body.setAlpha(p.iframes > 0 && p.dodgeT <= 0 && p.alive && Math.floor(this.time0 * 20) % 2 === 0 ? 0.65 : 1);

    const wid = d.weapons[d.activeWeapon];
    const showGun = !!wid && p.alive && p.healT <= 0 && p.dodgeT <= 0;
    gun.setVisible(showGun);
    if (showGun && wid) {
      const w = WEAPONS[wid];
      if (gun.frame.name !== w.spriteId) gun.setFrame(w.spriteId);
      const hand = world.handPoint();
      this.recoilT = Math.max(0, this.recoilT - dt);
      const recoil = this.recoilT > 0 ? (this.recoilT / 0.08) * (wid === 'pump_shotgun' ? 3 : 2) : 0;
      const reloadDip = world.player.reloadT > 0 ? 0.6 : 0;
      gun.setOrigin(wid === 'pump_shotgun' ? 2 / 22 : 2 / 14, 0.5);
      gun.setPosition(Math.round(hand.x - Math.cos(p.aim) * recoil), Math.round(hand.y - Math.sin(p.aim) * recoil));
      const left = Math.cos(p.aim) < 0;
      gun.setRotation(p.aim + (left ? -reloadDip : reloadDip));
      gun.setFlipY(left);
      gun.setDepth(body.depth + (p.face === 'up' ? -0.001 : 0.001));
    }
    if (this.muzzleT > 0) {
      this.muzzleT -= dt;
      const wid2 = d.weapons[d.activeWeapon] ?? 'service_pistol';
      const f = Math.min(2, Math.floor((1 - this.muzzleT / 0.07) * 3));
      this.muzzle.setFrame(`${wid2 === 'pump_shotgun' ? 'muzzle_shotgun' : 'muzzle_pistol'}_${f}`);
      this.muzzle.setVisible(this.muzzleT > 0);
    } else this.muzzle.setVisible(false);

    // target marker vs manual reticle
    const tgt = p.targetId ? world.enemies.find((e) => e.id === p.targetId) ?? world.targets.find((t) => t.id === p.targetId) : null;
    if (tgt && p.alive && !p.manualAim && (p.firingT > 0 || this.settings.aimAssist)) {
      const isEnemy = 'hh' in tgt;
      const ty = isEnemy ? (tgt as EnemyState).y - (tgt as EnemyState).hh : tgt.y - 4;
      this.marker.setVisible(p.firingT > 0 || isEnemy).setPosition(Math.round(tgt.x), Math.round(ty)).setFrame(`target_${Math.floor(this.time0 * 4) % 2}`);
      this.marker.setAlpha(p.firingT > 0 ? 1 : 0.45);
      if (isEnemy && (tgt as EnemyState).type === 'keeper') this.marker.setScale(2);
      else this.marker.setScale(1);
    } else this.marker.setVisible(false);
    if (this.reticleWorld && p.alive) this.reticle.setVisible(true).setPosition(Math.round(this.reticleWorld.x), Math.round(this.reticleWorld.y));
    else this.reticle.setVisible(false);
  }

  private syncEnemies(world: World): void {
    const t = this.time0;
    for (const e of world.enemies) {
      let v = this.enemySprites.get(e.id);
      if (!v) {
        const big = e.type === 'keeper';
        v = {
          shadow: this.add.image(e.x, e.y, 'fx', big ? 'shadow_big' : 'shadow').setDepth(D.shadow),
          body: this.add.image(e.x, e.y, 'chars', `${e.type}_idle_0`).setOrigin(0.5, 1),
        };
        this.enemySprites.set(e.id, v);
      }
      const visible = e.active || (e.type === 'keeper' && !e.dead);
      v.body.setVisible(visible && !(e.dead && e.deadT > 9));
      v.shadow.setVisible(visible && !e.dead);
      if (!visible) continue;
      const frame = enemyFrame(e, t);
      if (v.body.frame.name !== frame) v.body.setFrame(frame);
      let ox = 0;
      let oy = 0;
      if (e.type === 'leech') oy = e.state === 'latch' ? -6 : e.dead ? 0 : -14 + Math.sin(t * 2.4 + e.homeX) * 2;
      if ((e.state === 'telegraph' || e.state.endsWith('_tell')) && !e.dead) ox = Math.round(Math.sin(t * 60) * 1);
      if (e.type === 'leech' && e.state === 'swell') ox = Math.round(Math.sin(t * 50) * 1);
      v.body.setPosition(Math.round(e.x + ox), Math.round(e.y + oy + (e.type === 'keeper' ? 4 : 1)));
      v.body.setFlipX(e.face === -1);
      v.body.setDepth(D.sorted + (e.y + (e.state === 'latch' ? 2 : 0)) * 0.01);
      v.shadow.setPosition(Math.round(e.x), Math.round(e.y));
      if (e.hitT > 0.06 && !e.dead) v.body.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else v.body.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      v.body.setAlpha(e.dead && e.deadT > 6 ? Math.max(0, 1 - (e.deadT - 6) / 3) : e.type === 'leech' ? 0.92 : 1);
    }
  }

  private syncPickups(world: World): void {
    const seen = new Set<string>();
    for (const k of world.pickups) {
      seen.add(k.id);
      let v = this.pickupSprites.get(k.id);
      if (!v) {
        v = {
          s: this.add.image(k.x, k.y, 'props', ITEM_FRAME[k.item] ?? 'pickup_note').setOrigin(0.5, 1),
          g: this.add.image(k.x, k.y, 'fx', 'glow_16').setDepth(D.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0c0),
        };
        this.pickupSprites.set(k.id, v);
      }
      const bob = Math.round(Math.sin(this.time0 * 3 + k.bob) * 1);
      v.s.setVisible(k.visible).setPosition(Math.round(k.x), Math.round(k.y + bob)).setDepth(D.sorted + k.y * 0.01);
      v.g.setVisible(k.visible).setPosition(Math.round(k.x), Math.round(k.y - 5)).setAlpha(0.25 + Math.sin(this.time0 * 4 + k.bob) * 0.12).setScale(1.4);
    }
    for (const [id, v] of this.pickupSprites) {
      if (seen.has(id)) continue;
      v.s.destroy();
      v.g.destroy();
      this.pickupSprites.delete(id);
    }
  }

  private syncProjectiles(world: World): void {
    let i = 0;
    for (const b of world.projectiles) {
      let s = this.tracerPool[i];
      if (!s) {
        s = this.add.image(0, 0, 'fx', 'tracer').setDepth(D.tracer).setBlendMode(Phaser.BlendModes.ADD);
        this.tracerPool.push(s);
      }
      const pellet = b.weaponId === 'pump_shotgun';
      s.setFrame(pellet ? 'pellet' : 'tracer').setVisible(true).setPosition(b.x, b.y).setRotation(Math.atan2(b.dy, b.dx));
      i++;
    }
    for (; i < this.tracerPool.length; i++) this.tracerPool[i]!.setVisible(false);
  }

  // ------------------------------------------------------------------ telegraphs (always above the light layer)
  private syncTelegraphs(world: World): void {
    const g = this.tele;
    g.clear();
    const hc = this.settings.highContrastThreats;
    const red = hc ? 0xff2a2a : 0xff5a36;
    const lw = hc ? 2 : 1;
    const t = this.time0;
    for (const e of world.enemies) {
      if (e.dead || !e.active) continue;
      if (e.type === 'skitter' && e.state === 'telegraph') {
        const prog = 1 - e.t / 0.62;
        const len = 52;
        const ex = e.x + Math.cos(e.angle) * len;
        const ey = e.y - 4 + Math.sin(e.angle) * len;
        g.lineStyle(lw, red, 0.35 + prog * 0.55);
        dashed(g, e.x, e.y - 4, ex, ey, 3, 3);
        g.fillStyle(red, 0.5 + prog * 0.5);
        const a = e.angle;
        g.fillTriangle(ex + Math.cos(a) * 4, ey + Math.sin(a) * 4, ex + Math.cos(a + 2.4) * 4, ey + Math.sin(a + 2.4) * 4, ex + Math.cos(a - 2.4) * 4, ey + Math.sin(a - 2.4) * 4);
        // angular warning glyph above the head
        g.fillTriangle(e.x, e.y - 18, e.x - 3, e.y - 13, e.x + 3, e.y - 13);
      }
      if (e.type === 'leech' && e.state === 'swell') {
        const prog = 1 - e.t / 0.55;
        g.lineStyle(lw, red, 0.9);
        g.strokeCircle(e.x, e.y - 14, 12 - prog * 6);
      }
      if (e.type === 'leech' && e.state === 'latch') {
        g.lineStyle(1, red, 0.6 + Math.sin(t * 12) * 0.3);
        g.strokeCircle(e.x, e.y - 10, 9);
      }
      if (e.type === 'keeper') this.keeperTelegraph(g, world, e, red, lw);
    }
    for (const v of world.vents) {
      if (v.state === 'tell') {
        g.lineStyle(lw, 0xffb040, 0.6 + Math.sin(t * 20) * 0.3);
        g.strokeRect(v.x - 8, v.y - 8, 16, 16);
      }
    }
  }

  private keeperTelegraph(g: Phaser.GameObjects.Graphics, world: World, e: EnemyState, red: number, lw: number): void {
    if (e.state === 'hose_tell') {
      const prog = 1 - e.t / KEEPER.hoseTell;
      const n = nozzle(e);
      g.fillStyle(red, 0.08 + prog * 0.12);
      g.lineStyle(lw, red, 0.5 + prog * 0.4);
      const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(n.x, n.y)];
      for (let i = 0; i <= 16; i++) {
        const a = e.angle - KEEPER.hoseSweep + (2 * KEEPER.hoseSweep * i) / 16;
        const hit = world.grid.ray(world.grid.shot, n.x, n.y, Math.cos(a), Math.sin(a), KEEPER.hoseRange);
        pts.push(new Phaser.Math.Vector2(hit.x, hit.y));
      }
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
    } else if (e.state === 'hose') {
      const n = nozzle(e);
      g.lineStyle(3, 0xbfe8ff, 0.9);
      g.lineBetween(n.x, n.y, n.x + Math.cos(e.angle) * e.aux, n.y + Math.sin(e.angle) * e.aux);
      g.lineStyle(1, 0xffffff, 1);
      g.lineBetween(n.x, n.y, n.x + Math.cos(e.angle) * e.aux, n.y + Math.sin(e.angle) * e.aux);
    } else if (e.state === 'rush_tell') {
      const prog = 1 - e.t / KEEPER.rushTell;
      const hit = world.grid.ray(world.grid.block, e.x, e.y - 6, Math.cos(e.angle), Math.sin(e.angle), 400);
      g.lineStyle(lw + 1, red, 0.4 + prog * 0.5);
      dashed(g, e.x, e.y - 6, hit.x, hit.y, 5, 3);
      const px = -Math.sin(e.angle) * 14;
      const py = Math.cos(e.angle) * 14;
      g.lineStyle(lw, red, 0.25 + prog * 0.3);
      g.lineBetween(e.x + px, e.y - 6 + py, hit.x + px, hit.y + py);
      g.lineBetween(e.x - px, e.y - 6 - py, hit.x - px, hit.y - py);
    } else if (e.state === 'vent_tell') {
      const prog = 1 - e.t / KEEPER.ventTell;
      g.lineStyle(lw + 1, red, 0.5 + prog * 0.5);
      g.strokeCircle(e.x, e.y - 8, KEEPER.ventRadius);
      g.fillStyle(0xffb040, 0.08 + prog * 0.18);
      g.fillCircle(e.x, e.y - 8, KEEPER.ventRadius * prog);
    } else if (e.state === 'stunned') {
      g.lineStyle(1, 0xb7ead0, 0.8);
      g.strokeCircle(e.x, e.y - 14, 6 + Math.sin(this.time0 * 10) * 2);
    }
  }

  // ------------------------------------------------------------------ lights
  private renderLights(world: World, dt: number): void {
    const cam = this.cameras.main;
    const view = cam.worldView;
    if (this.lightMap.resize(view.width, view.height) && this.lightTex) {
      this.lightTex.setSize(this.lightMap.canvas.width, this.lightMap.canvas.height);
    }
    const statics: StaticLight[] = world.def.lights.filter((l) => !l.when || world.cond(l.when));
    const staticKey = `${world.grid.revision}|${statics.map((l) => l.id).join(',')}`;
    this.lightMap.updateStatic(staticKey, statics.filter((l) => !l.flicker).map(toSource));
    const dyn: LightSource[] = [];
    const t = this.time0;
    for (const l of statics) {
      if (!l.flicker) continue;
      const f = 1 - l.flicker * (0.5 + 0.5 * Math.sin(t * 13 + l.x) * Math.sin(t * 7.3 + l.y)) - (Math.random() < l.flicker * 0.05 ? l.flicker : 0);
      dyn.push({ ...toSource(l), intensity: l.intensity * f });
    }
    const p = world.player;
    // player presence light keeps the protagonist readable in any darkness
    if (p.alive) dyn.push({ x: p.x, y: p.y - 8, radius: 30, color: [150, 160, 190], intensity: 0.45, core: 0.2 });
    if (world.data.torchOn && p.alive) {
      const { range, half } = world.torchParams();
      dyn.push({ x: p.x + Math.cos(p.aim) * 3, y: p.y - 9 + Math.sin(p.aim) * 3, radius: range, color: [255, 236, 200], intensity: 0.95, cone: { a0: p.aim - half, a1: p.aim + half }, core: 0.25 });
    }
    // muzzle flashes with capped combined exposure
    let budget = DYNAMIC_LIGHT_BUDGET[this.settings.quality];
    let exposure = 0;
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]!;
      f.t += dt;
      const life = f.peak + f.decay;
      if (f.t >= life) {
        this.flashes.splice(i, 1);
        continue;
      }
      if (budget <= 0) continue;
      const k = f.t < f.peak ? 1 : 1 - (f.t - f.peak) / f.decay;
      const strength = Math.min(1.5 - exposure, f.strength * k * k);
      if (strength <= 0.02) continue;
      exposure += strength * 0.6;
      budget--;
      dyn.push({ x: f.x, y: f.y, radius: f.radius * (0.85 + 0.15 * k), color: f.color, intensity: strength, core: 0.3 });
    }
    // creature and machine glows
    for (const e of world.enemies) {
      if (e.dead || !e.active) continue;
      if (e.type === 'leech') dyn.push({ x: e.x, y: e.y - 14, radius: e.state === 'swell' ? 40 : 22, color: e.state === 'swell' ? [255, 90, 60] : [120, 230, 190], intensity: 0.35, core: 0.2 });
      if (e.type === 'keeper' && e.state !== 'dormant') {
        const eyeX = e.x + e.face * 16;
        const a = e.face > 0 ? 0.25 : Math.PI - 0.25;
        dyn.push({ x: eyeX, y: e.y - 16, radius: 120, color: e.state.endsWith('_tell') ? [255, 110, 80] : [170, 255, 220], intensity: 0.6, cone: { a0: a - 0.5, a1: a + 0.5 }, core: 0.2 });
      }
    }
    for (const v of world.vents) if (v.state !== 'idle') dyn.push({ x: v.x, y: v.y, radius: 34, color: [255, 160, 70], intensity: v.state === 'burst' ? 0.9 : 0.4, core: 0.2 });
    this.lightMap.render(view.x, view.y, world.def.ambient, dyn);
    this.lightTex?.refresh();
    this.lightImage.setPosition(this.lightMap.originX, this.lightMap.originY);
  }

  addFlash(x: number, y: number, radius: number, color: Rgb, peakMs: number, decayMs: number, strength: number): void {
    const rf = this.settings.reducedFlash;
    this.flashes.push({ x, y, radius, color, t: 0, peak: (rf ? peakMs * 0.5 : peakMs) / 1000, decay: (rf ? decayMs * 1.6 : decayMs) / 1000, strength: rf ? strength * 0.6 : strength });
  }

  // ------------------------------------------------------------------ ambient particles
  private updateAmbientFx(world: World, dt: number): void {
    const cam = this.cameras.main.worldView;
    const def = world.def;
    const q = this.settings.quality;
    if (def.rain) {
      const target = q === 'low' ? 40 : q === 'medium' ? 80 : 130;
      while (this.rain.length < target) this.rain.push({ x: cam.x + Math.random() * cam.width, y: cam.y + Math.random() * cam.height, vy: 260 + Math.random() * 80, vx: -30, len: 3 + Math.random() * 3 });
      const g = this.rainGfx;
      g.clear();
      g.fillStyle(0xa8c8e8, 0.45);
      for (const r of this.rain) {
        r.y += r.vy * dt;
        r.x += r.vx * dt;
        if (r.y > cam.y + cam.height || r.x < cam.x - 8) {
          // splash where it lands, then recycle above the view
          if (Math.random() < 0.3) this.particles.spawn('floor', { x: r.x, y: r.y, life: 0.25, size: 1, color: 0xbfd8f0, alpha: 0.7, vx: Math.random() * 20 - 10, vy: -8 });
          r.y = cam.y - 10 - Math.random() * 30;
          r.x = cam.x + Math.random() * (cam.width + 30);
        }
        for (let i = 0; i < r.len; i++) g.fillRect(Math.round(r.x - (r.vx / r.vy) * i), Math.round(r.y - i), 1, 1);
      }
    } else this.rainGfx.clear();
    if (def.motes && def.motes !== 'none' && !this.settings.reducedMotion) {
      this.moteAcc += dt * (q === 'low' ? 2 : q === 'medium' ? 4 : 6);
      while (this.moteAcc > 1) {
        this.moteAcc -= 1;
        this.particles.spawn('air', { x: cam.x + Math.random() * cam.width, y: cam.y + Math.random() * cam.height, life: 4 + Math.random() * 3, size: 1, color: 0xdcd6c6, alpha: 0.35, vx: Math.random() * 6 - 3, vy: -2 - Math.random() * 3, drag: 1 });
      }
    }
    for (const em of def.emitters ?? []) {
      let rate = em.rate;
      if (em.boost && world.cond(em.boost.when)) rate *= em.boost.factor;
      const acc = (this.emitterAcc.get(em.id) ?? 0) + rate * dt;
      let n = Math.floor(acc);
      this.emitterAcc.set(em.id, acc - n);
      while (n-- > 0) {
        const x = (em.tx + Math.random() * em.w) * TILE;
        const y = (em.ty + Math.random() * em.h) * TILE;
        // Lint is a clue: it must stay visible on every quality setting, so it ignores reducedMotion.
        this.particles.spawn('glow', { x, y, life: 6, size: 1, color: 0xf4f0e4, alpha: 0.55, vx: Math.random() * 6 - 3, vy: Math.random() * 6 - 3, attract: em.toX !== undefined ? 22 * (rate > em.rate ? 2 : 1) : 0, ax: em.toX ?? 0, ay: em.toY ?? 0, drag: 0.985, fade: false });
      }
    }
  }

  // ------------------------------------------------------------------ events -> FX
  handleEvents(world: World, events: SequencedEvent[]): void {
    const P = this.particles;
    const pan = (x: number): number => Phaser.Math.Clamp((x - world.player.x) / 160, -0.8, 0.8);
    for (const ev of events) {
      switch (ev.type) {
        case 'WeaponFired': {
          const w = WEAPONS[ev.weaponId];
          this.muzzleT = 0.07;
          this.recoilT = 0.08;
          this.muzzle.setPosition(ev.x, ev.y).setRotation(ev.angle);
          this.addFlash(ev.x + Math.cos(ev.angle) * 6, ev.y + Math.sin(ev.angle) * 6, w.flashRadiusPx, [255, 214, 150], w.flashPeakMs, w.flashDecayMs, 1.35);
          this.addShake(w.shakePx, ev.angle);
          this.audio.play(w.shotCueId);
          const n = ev.weaponId === 'pump_shotgun' ? 9 : 5;
          for (let i = 0; i < n; i++) {
            const a = ev.angle + (Math.random() - 0.5) * (ev.weaponId === 'pump_shotgun' ? 0.9 : 0.5);
            const sp = 80 + Math.random() * 120;
            P.spawn('glow', { x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.08 + Math.random() * 0.1, color: 0xffd27a, size: 1, drag: 0.85, streak: 2 });
          }
          for (let i = 0; i < (ev.weaponId === 'pump_shotgun' ? 4 : 2); i++)
            P.spawn('air', { x: ev.x, y: ev.y, vx: Math.cos(ev.angle) * 20 + Math.random() * 10 - 5, vy: Math.sin(ev.angle) * 20 - 6, life: 0.6 + Math.random() * 0.4, color: 0x9a948a, alpha: 0.35, size: 2, drag: 0.93 });
          // case ejection with a bounce, settling as a short-lived floor decal
          const side = Math.cos(ev.angle) >= 0 ? -1 : 1;
          const ca = ev.angle + side * 1.9;
          P.spawn('air', { x: world.player.x, y: world.player.y, z: 10, vx: Math.cos(ca) * 40, vy: Math.sin(ca) * 25, vz: 50, gravity: 260, bounce: 0.35, life: 2.5, color: ev.weaponId === 'pump_shotgun' ? 0xd63a22 : 0xe39a3c, size: 1, drag: 0.97, fade: true });
          break;
        }
        case 'DryFire':
          this.audio.play('dryfire');
          break;
        case 'ReloadStarted':
          this.audio.play('reload_start');
          break;
        case 'ReloadFinished':
          this.audio.play('reload_end');
          break;
        case 'Impact': {
          const back = ev.angle + Math.PI;
          const mat = ev.material;
          const col = mat === 'flesh' ? 0x9ccd4c : mat === 'jelly' ? 0xb7ead0 : mat === 'metal' || mat === 'tin' ? 0xffe0a0 : 0xdcd6c6;
          const n = mat === 'metal' ? 8 : mat === 'flesh' || mat === 'jelly' ? 6 : 5;
          for (let i = 0; i < n; i++) {
            const a = back + (Math.random() - 0.5) * 1.6;
            const sp = 40 + Math.random() * (mat === 'metal' ? 140 : 70);
            const layer: ParticleLayer = mat === 'metal' || mat === 'tin' ? 'glow' : 'air';
            P.spawn(layer, { x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.15 + Math.random() * 0.3, color: col, size: 1, drag: 0.88, streak: layer === 'glow' ? 2 : 0, gravity: mat === 'flesh' || mat === 'jelly' ? 0 : 0 });
          }
          if (mat === 'wall' || mat === 'metal') P.spawn('air', { x: ev.x, y: ev.y, life: 0.5, size: 3, color: 0x8d877a, alpha: 0.4, vx: Math.cos(back) * 10, vy: Math.sin(back) * 10 - 4, drag: 0.9 });
          if (mat === 'flesh') for (let i = 0; i < 3; i++) P.spawn('floor', { x: ev.x + Math.random() * 6 - 3, y: ev.y + 6 + Math.random() * 4, life: 5, size: 1, color: 0x5f8f28, alpha: 0.8 });
          if (mat === 'metal') this.addFlash(ev.x, ev.y, 26, [255, 210, 150], 20, 70, 0.6);
          this.audio.play(`impact_${mat === 'armor' ? 'metal' : mat}`, pan(ev.x), 0.8);
          break;
        }
        case 'DamageApplied':
          if (ev.target !== 'player' && ev.fatal) this.addShake(1.5);
          break;
        case 'PlayerHurt':
          this.addShake(3, ev.angle + Math.PI);
          this.audio.play('hurt');
          for (let i = 0; i < 6; i++) P.spawn('air', { x: world.player.x, y: world.player.y - 10, vx: Math.cos(ev.angle) * 40 + Math.random() * 30 - 15, vy: Math.sin(ev.angle) * 40 + Math.random() * 30 - 15, life: 0.3, color: 0xd63a22, size: 1, drag: 0.9 });
          break;
        case 'PlayerDied':
          this.audio.play('death');
          this.addShake(4);
          break;
        case 'Dodged':
          this.audio.play('dodge');
          for (let i = 0; i < 7; i++) P.spawn('air', { x: ev.x - ev.dx * i * 2, y: ev.y - ev.dy * i * 2, vx: -ev.dx * 20 + Math.random() * 10 - 5, vy: -ev.dy * 20 - 5, life: 0.35 + Math.random() * 0.2, color: 0xb8b2a2, alpha: 0.4, size: 2, drag: 0.9 });
          break;
        case 'DodgeRejected':
          this.audio.play('dodge_reject');
          break;
        case 'HealStarted':
          this.audio.play('heal_start');
          break;
        case 'Healed':
          this.audio.play('heal_done');
          for (let i = 0; i < 10; i++) P.spawn('glow', { x: world.player.x + Math.random() * 12 - 6, y: world.player.y - Math.random() * 18, vx: 0, vy: -20 - Math.random() * 15, life: 0.6, color: 0xb7ead0, size: 1 });
          break;
        case 'Footstep': {
          this.audio.play(`footstep_${ev.surface}`);
          if (ev.surface === 'wet') this.spawnRipple(ev.x, ev.y);
          else if (Math.random() < 0.3 && !this.settings.reducedMotion) P.spawn('floor', { x: ev.x, y: ev.y, life: 0.4, size: 1, color: 0xb8b2a2, alpha: 0.4, vx: Math.random() * 10 - 5, vy: -3 });
          break;
        }
        case 'EnemyAlerted':
          this.audio.play(ev.enemy === 'skitter' ? 'skitter_alert' : ev.enemy === 'leech' ? 'leech_alert' : 'keeper_alert', pan(ev.x));
          if (ev.enemy === 'skitter') for (let i = 0; i < 8; i++) P.spawn('air', { x: ev.x, y: ev.y, vx: Math.random() * 40 - 20, vy: -Math.random() * 30, life: 0.5, color: 0x8d877a, alpha: 0.5, size: 2, drag: 0.9 });
          break;
        case 'EnemyTelegraph':
          this.audio.play(ev.enemy === 'skitter' ? 'skitter_tell' : ev.enemy === 'leech' ? 'leech_tell' : 'keeper_tell', pan(ev.x));
          break;
        case 'EnemyAttack':
          if (ev.enemy === 'skitter') this.audio.play('skitter_lunge', pan(ev.x));
          if (ev.enemy === 'leech') this.audio.play('leech_latch', pan(ev.x));
          if (ev.enemy === 'keeper') {
            this.audio.play(ev.attack === 'hose' ? 'keeper_hose' : ev.attack === 'rush' ? 'keeper_rush' : 'keeper_vent', pan(ev.x));
            if (ev.attack === 'vent') {
              this.addShake(3);
              for (let i = 0; i < 40; i++) {
                const a = Math.random() * Math.PI * 2;
                const sp = 60 + Math.random() * 80;
                P.spawn('air', { x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, life: 0.6 + Math.random() * 0.4, color: 0xe6eef0, alpha: 0.55, size: 2, drag: 0.9 });
              }
              this.addFlash(ev.x, ev.y, 70, [255, 170, 90], 40, 260, 0.8);
            }
          }
          break;
        case 'EnemyDied': {
          const big = ev.enemy === 'keeper';
          this.audio.play(`${ev.enemy}_die`, pan(ev.x));
          const col = ev.enemy === 'skitter' ? 0x9ccd4c : ev.enemy === 'leech' ? 0xb7ead0 : 0xffd27a;
          for (let i = 0; i < (big ? 60 : 14); i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 20 + Math.random() * (big ? 120 : 60);
            P.spawn(big ? 'glow' : 'air', { x: ev.x, y: ev.y - (big ? 16 : 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + Math.random() * (big ? 1.2 : 0.4), color: col, size: 1, drag: 0.9, streak: big ? 2 : 0 });
          }
          if (big) {
            this.addShake(6);
            this.addFlash(ev.x, ev.y - 16, 140, [255, 200, 140], 80, 600, 1.2);
          }
          break;
        }
        case 'LeechLatched':
          this.addShake(2);
          break;
        case 'LeechDetached':
          this.audio.play('leech_flee');
          break;
        case 'LeechFled':
          this.audio.play('leech_flee', 0, 0.6);
          break;
        case 'BossStunned':
          this.audio.play('keeper_stun');
          this.addShake(5);
          for (let i = 0; i < 24; i++) {
            const a = Math.random() * Math.PI * 2;
            P.spawn('glow', { x: ev.x, y: ev.y - 10, vx: Math.cos(a) * (60 + Math.random() * 100), vy: Math.sin(a) * (60 + Math.random() * 100), life: 0.3 + Math.random() * 0.3, color: 0xffe0a0, size: 1, drag: 0.88, streak: 2 });
          }
          this.addFlash(ev.x, ev.y - 10, 60, [255, 210, 150], 30, 200, 0.9);
          break;
        case 'VentTelegraph':
          this.audio.play('vent_tell');
          break;
        case 'VentBurst':
          this.audio.play('vent_burst', pan(ev.x));
          for (let i = 0; i < 12; i++) P.spawn('air', { x: ev.x + Math.random() * 10 - 5, y: ev.y, vx: Math.random() * 20 - 10, vy: -30 - Math.random() * 40, life: 0.7, color: 0xe6eef0, alpha: 0.5, size: 2, drag: 0.94 });
          break;
        case 'PickedUp':
          this.audio.play(ev.item === 'service_pistol' || ev.item === 'pump_shotgun' ? 'pickup_weapon' : 'pickup');
          for (let i = 0; i < 8; i++) P.spawn('glow', { x: ev.x, y: ev.y - 4, vx: Math.random() * 40 - 20, vy: -Math.random() * 40, life: 0.4, color: 0xfff0b8, size: 1, drag: 0.9 });
          break;
        case 'TargetKnocked':
          break;
        case 'WeaponSwapped':
          this.audio.play('reload_start');
          break;
        case 'TorchToggled':
          this.audio.play('ui_click');
          break;
        case 'Locked':
          this.audio.play('locked');
          break;
        default:
          break;
      }
    }
  }

  spawnRipple(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.particles.spawn('floor', { x: x + Math.cos(a) * 2, y: y + Math.sin(a), vx: Math.cos(a) * 14, vy: Math.sin(a) * 6, life: 0.4, size: 1, color: 0xa9d8f5, alpha: 0.6, drag: 0.92 });
    }
  }

  /** Burst used by Game for story moments (lamp restored, relay reconnected...). */
  sparkle(x: number, y: number, color: number, n = 16): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.spawn('glow', { x, y, vx: Math.cos(a) * (20 + Math.random() * 40), vy: Math.sin(a) * (20 + Math.random() * 40) - 10, life: 0.5 + Math.random() * 0.5, color, size: 1, drag: 0.92 });
    }
  }

  particleCount(): number {
    return this.particles.count();
  }

  /** Convert client coordinates to world coordinates (mouse aim). */
  clientToWorld(clientX: number, clientY: number, canvasRect: DOMRect): { x: number; y: number } {
    const cam = this.cameras.main;
    const sx = ((clientX - canvasRect.left) / canvasRect.width) * cam.width;
    const sy = ((clientY - canvasRect.top) / canvasRect.height) * cam.height;
    const wp = cam.getWorldPoint(sx, sy);
    return { x: wp.x, y: wp.y };
  }
}

function toSource(l: StaticLight): LightSource {
  return { x: l.x, y: l.y, radius: l.radius, color: l.color, intensity: l.intensity };
}

function rgbInt(c: Rgb): number {
  return (c[0] << 16) | (c[1] << 8) | c[2];
}

function dashed(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, dash: number, gap: number): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const dx = (x1 - x0) / (len || 1);
  const dy = (y1 - y0) / (len || 1);
  for (let d = 0; d < len; d += dash + gap) {
    const e = Math.min(len, d + dash);
    g.lineBetween(x0 + dx * d, y0 + dy * d, x0 + dx * e, y0 + dy * e);
  }
}

function enemyFrame(e: EnemyState, t: number): string {
  if (e.type === 'skitter') {
    if (e.dead) return `skitter_dead_${Math.min(4, Math.floor(e.deadT * 8))}`;
    if (e.hitT > 0.04 && e.state !== 'lunge' && e.state !== 'telegraph') return 'skitter_hit_0';
    if (e.state === 'telegraph') return `skitter_crouch_${Math.floor(t * 12) % 2}`;
    if (e.state === 'lunge') return `skitter_lunge_${Math.floor(t * 16) % 2}`;
    if (e.state === 'chase' || (e.state === 'idle' && Math.hypot(e.vx, e.vy) > 1 && e.t > 0.2)) return `skitter_run_${Math.floor(t * 12) % 4}`;
    if (e.state === 'emerge') return `skitter_crouch_${Math.floor(t * 8) % 2}`;
    return `skitter_idle_${Math.floor(t * 3) % 2}`;
  }
  if (e.type === 'leech') {
    if (e.dead) return `leech_dead_${Math.min(3, Math.floor(e.deadT * 6))}`;
    if (e.state === 'swell') return `leech_swell_${Math.floor(t * 8) % 2}`;
    if (e.state === 'latch') return `leech_latch_${Math.floor(t * 6) % 2}`;
    if (e.state === 'flee' || e.state === 'stunned') return `leech_flee_${Math.floor(t * 6) % 2}`;
    if (e.state === 'agitated') return `leech_agitated_${Math.floor(t * 6) % 2}`;
    return `leech_idle_${Math.floor(t * 3) % 3}`;
  }
  // keeper
  if (e.dead) return `keeper_dead_${Math.min(3, Math.floor(e.deadT * 3))}`;
  const two = Math.floor(t * 6) % 2;
  switch (e.state) {
    case 'walk':
      return `keeper_walk_${Math.floor(t * 6) % 4}`;
    case 'hose_tell':
      return `keeper_hose_tell_${two}`;
    case 'hose':
      return `keeper_hose_${two}`;
    case 'rush_tell':
      return `keeper_rush_tell_${two}`;
    case 'rush':
      return `keeper_rush_${two}`;
    case 'vent_tell':
      return `keeper_vent_tell_${Math.floor(t * 10) % 2}`;
    case 'vent':
      return `keeper_vent_${two}`;
    case 'stunned':
      return `keeper_stunned_${Math.floor(t * 4) % 2}`;
    default:
      return `keeper_idle_${Math.floor(t * 2) % 2}`;
  }
}

export { wrapAngle };
