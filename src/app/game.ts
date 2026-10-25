// Application controller: lifecycle, fixed-step loop, region transitions, story actions,
// death/respawn, checkpoints and menus. Owns GameData; the World owns only its region.
import type Phaser from 'phaser';
import { getRegion, findRegion } from '../content/registry.ts';
import { Frontier } from '../world/frontier.ts';
import { CURIO_BY_ID, UPGRADE_BY_ID } from '../content/discoveries.ts';
import { DIALOGUE, JOURNAL, type Line } from '../content/story.ts';
import { F, REGIONS } from '../content/ids.ts';
import { TILE } from '../content/tiles.ts';
import type { RegionDef } from '../content/types.ts';
import { World, DT } from '../sim/world.ts';
import { newGameData, REFUGE_BASELINE, BANDAGE_BASELINE, type GameData } from '../sim/gameData.ts';
import type { SequencedEvent } from '../sim/events.ts';
import type { Face } from '../sim/types.ts';
import { WorldScene } from '../render/WorldScene.ts';
import { InputController } from '../ui/input.ts';
import { Hud, Dialogue } from '../ui/hud.ts';
import { Screens, fmtTime, h } from '../ui/screens.ts';
import { AudioEngine } from '../audio/audio.ts';
import { saveSettings, type Settings } from './settings.ts';
import { SaveRepository } from '../save/repository.ts';
import { makeEnvelope, parseImport, GAME_BUILD, type SaveEnvelope } from '../save/envelope.ts';

type Mode = 'boot' | 'title' | 'play' | 'pause' | 'dialogue' | 'transition' | 'dead';

const REFUGE_NAMES: Record<string, string> = { refuge_home: 'Home', refuge_relay_booth: 'Relay booth' };
const MAX_STEPS = 5;
const AUTOSAVE_SECONDS = 10;

export class GameApp {
  private mode: Mode = 'boot';
  private world: World | null = null;
  private data: GameData = newGameData();
  private slotId: string | null = null;
  private lastEnv: SaveEnvelope | null = null;
  private readOnly = false;
  private releaseLock: (() => void) | null = null;
  private acc = 0;
  private autosaveT = 0;
  private deathT = 0;
  private portrait = false;
  private pausedForPortrait = false;
  private ringT = 0;
  private frameTimes: number[] = [];
  private statsT = 0;
  private cameraFocus: { x: number; y: number } | null = null;
  private readonly hud = new Hud();
  private readonly dialogue = new Dialogue();
  private readonly screens = new Screens();
  readonly input: InputController;
  private readonly game: Phaser.Game;
  private readonly scene: WorldScene;
  private readonly settings: Settings;
  private readonly audio: AudioEngine;
  private readonly repo = new SaveRepository();
  private readonly frontier = new Frontier();
  private readonly canvasEl: HTMLElement;

  constructor(game: Phaser.Game, scene: WorldScene, settings: Settings, audio: AudioEngine) {
    this.game = game;
    this.scene = scene;
    this.settings = settings;
    this.audio = audio;
    this.canvasEl = document.querySelector<HTMLElement>('#game')!;
    this.screens.onClick = () => this.audio.unlock();
    this.input = new InputController(document.querySelector('#app')!, this.canvasEl, {
      aimFromClient: (cx, cy) => this.aimFromClient(cx, cy),
      onPause: () => this.togglePause(),
      onMap: () => this.openMapFromPlay(),
      onJournal: () => this.openJournalFromPlay(),
      isGameplayActive: () => this.mode === 'play',
    });
    this.input.onModeChange = (m) => this.applyInputMode(m);
    this.applyInputMode(matchMedia('(pointer: coarse)').matches ? 'touch' : 'desktop');
    if (matchMedia('(pointer: coarse)').matches) this.input.setMode('touch');
    this.applySettings();
    scene.onFrame = (dt) => this.frame(dt);
    this.installLifecycle();
  }

  // ------------------------------------------------------------------ boot / title
  async start(): Promise<void> {
    await this.repo.open();
    this.layout();
    this.showTitle();
  }

  private storageNote(): string {
    if (!this.repo.available) return 'Storage unavailable in this browser mode: progress lasts only for this session. Use Export to keep it.';
    return this.repo.persistent ? 'Saves stored on this device (persistent storage granted).' : 'Saves stored on this device. Browsers may clear site data; export a backup after big discoveries.';
  }

  private async showTitle(): Promise<void> {
    this.mode = 'title';
    this.hud.show(false);
    this.touchVisible(false);
    this.screens.clear();
    // attract view: the inherited home, rain at the window, intercom blinking
    const attract = newGameData();
    this.frontier.activate(attract);
    this.enterWorld(attract, REGIONS.home, { x: 3 * TILE + 8, y: 3 * TILE + 12, face: 'up' }, false);
    this.cameraFocus = { x: 6 * TILE, y: 4 * TILE };
    const slots = await this.repo.list();
    const latest = slots.filter((s) => s.envelope).sort((a, b) => (b.envelope!.updatedAt > a.envelope!.updatedAt ? 1 : -1))[0];
    this.screens.title({
      canContinue: latest?.envelope ? `${latest.envelope.summary.regionName} · ${fmtTime(latest.envelope.playSeconds)}` : null,
      onContinue: () => latest && this.loadSlot(latest.slotId),
      onNew: () => this.openSlots('new'),
      onSaves: () => this.openSlots('manage'),
      onSettings: () => this.openSettings(),
      onControls: () => this.screens.controls(this.input.mode === 'touch', () => this.screens.pop()),
      onCredits: () => this.screens.credits(() => this.screens.pop()),
      build: GAME_BUILD,
      storageNote: this.storageNote(),
    });
    document.querySelector('#loading')?.remove();
  }

  private async openSlots(mode: 'new' | 'manage'): Promise<void> {
    this.audio.unlock();
    const slots = await this.repo.list();
    const est = await this.repo.estimate();
    const storage = `${this.storageNote()}${est ? ` Using ${(est.usage / 1024).toFixed(0)} KB of about ${(est.quota / 1048576).toFixed(0)} MB.` : ''}`;
    this.screens.slots({
      mode,
      slots,
      storage,
      onPick: (slotId, existing) => {
        if (mode === 'manage') return void this.loadSlot(slotId);
        if (existing)
          this.screens.confirm('Start a new journey in this slot? The existing journey will be replaced (its previous save stays as a backup until the next save).', 'Replace', () => this.newGame(slotId), () => this.screens.pop(), true);
        else void this.newGame(slotId);
      },
      onExport: (slotId) => void this.exportSlot(slotId),
      onImport: (slotId) => this.importInto(slotId, () => {
        this.screens.pop();
        void this.openSlots(mode);
      }),
      onDelete: (slotId) =>
        this.screens.confirm('Delete this save and its backup? This cannot be undone. Export it first if unsure.', 'Delete', async () => {
          await this.repo.remove(slotId);
          this.screens.pop();
          this.screens.pop();
          void this.openSlots(mode);
        }, () => this.screens.pop(), true),
      onBack: () => this.screens.pop(),
    });
  }

  private openSettings(): void {
    this.screens.settings(this.settings, (s) => {
      saveSettings(s);
      this.applySettings();
    }, () => this.screens.pop());
  }

  private applySettings(): void {
    const s = this.settings;
    document.documentElement.style.setProperty('--ctl', String(s.controlScale));
    document.documentElement.style.setProperty('--text', String(s.textScale));
    document.body.classList.toggle('lefty', s.leftHanded);
    this.audio.volumes = { master: s.volMaster, ambience: s.volAmbience, effects: s.volEffects };
    this.audio.applyVolumes();
    this.scene.setQuality();
    if (!s.showStats) this.hud.setStats(null);
  }

  private applyInputMode(m: 'touch' | 'desktop'): void {
    document.body.classList.toggle('desktop', m === 'desktop');
    document.body.classList.toggle('touchmode', m === 'touch');
    this.touchVisible(this.mode === 'play' || this.mode === 'dialogue');
  }

  private touchVisible(on: boolean): void {
    document.querySelector('#touch')!.classList.toggle('hidden', !on || this.input.mode !== 'touch');
  }

  // ------------------------------------------------------------------ slots, saving, locking
  private async acquireLock(slotId: string): Promise<boolean> {
    this.releaseLock?.();
    this.releaseLock = null;
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    if (!locks) return true;
    return new Promise<boolean>((resolve) => {
      void locks.request(`twb-${slotId}`, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return undefined;
        }
        resolve(true);
        return new Promise<void>((release) => (this.releaseLock = release));
      });
    });
  }

  private async newGame(slotId: string): Promise<void> {
    this.audio.unlock();
    this.screens.clear();
    this.readOnly = !(await this.acquireLock(slotId));
    this.slotId = slotId;
    this.lastEnv = null;
    this.data = newGameData();
    this.frontier.activate(this.data);
    void this.repo.requestPersistence();
    const def = getRegion(REGIONS.home);
    const e = def.entries.start!;
    this.beginPlay();
    this.enterWorld(this.data, REGIONS.home, { x: e.tx * TILE + 8, y: e.ty * TILE + 12, face: e.face }, true);
    await this.save('new journey');
    this.tip('tip_move', this.input.mode === 'touch' ? 'Move with your left thumb anywhere on the left side. Something on the wall is buzzing.' : 'Move with WASD. Something on the wall is buzzing.');
  }

  private async loadSlot(slotId: string): Promise<void> {
    this.audio.unlock();
    const r = await this.repo.load(slotId);
    if (!r.envelope) {
      this.screens.message('Could not load', r.error ?? 'That slot is empty.', () => this.screens.pop());
      return;
    }
    this.screens.clear();
    this.readOnly = !(await this.acquireLock(slotId));
    this.slotId = slotId;
    this.lastEnv = r.envelope;
    this.data = structuredClone(r.envelope.data);
    this.frontier.activate(this.data);
    void this.repo.requestPersistence();
    this.beginPlay();
    const def = getRegion(this.data.regionId);
    const spawn = this.safeSpawn(def, this.data.x, this.data.y, this.data.face);
    this.enterWorld(this.data, def.id, spawn, false);
    this.hud.placeTitle(def.name);
    if (r.error) this.hud.toast(r.error, true);
    if (this.readOnly) this.hud.toast('This save is open in another tab. Saving is disabled here.', true);
  }

  private safeSpawn(def: RegionDef, x: number, y: number, face: Face): { x: number; y: number; face: Face } {
    const probe = new World(def, structuredClone(this.data), { x, y, face });
    const blocked = probe.boxOn(probe.grid.block, x - 5, y - 6, x + 5, y);
    if (!blocked && x > 0 && y > 0) return { x, y, face };
    const ref = this.data.lastRefuge;
    const rdef = getRegion(ref.regionId);
    const e = rdef.entries[ref.entry]!;
    this.data.regionId = rdef.id;
    return { x: e.tx * TILE + 8, y: e.ty * TILE + 12, face: e.face };
  }

  private flushWorld(): void {
    if (!this.world || this.world.data !== this.data) return;
    const w = this.world;
    this.data.regions[w.def.id] = { ...w.delta, explored: w.exportExplored() };
    if (w.player.alive) {
      this.data.x = w.player.x;
      this.data.y = w.player.y;
      this.data.face = w.player.face;
    }
    this.data.regionId = w.def.id;
  }

  private async save(reason: string): Promise<boolean> {
    if (!this.slotId || this.readOnly || !this.world || this.world.data !== this.data) return false;
    if (!this.world.player.alive || this.data.hp <= 0) return false;
    this.flushWorld();
    const ref = findRegion(this.data.lastRefuge.regionId);
    const env = makeEnvelope(this.slotId, this.data, this.lastEnv, { regionName: this.world.def.name, refugeName: REFUGE_NAMES[this.data.lastRefuge.id] ?? ref?.name ?? 'Unknown' });
    try {
      await this.repo.save(env);
      this.lastEnv = env;
      this.autosaveT = 0;
      if (reason !== 'auto') this.hud.saveState('saved');
      return true;
    } catch (err) {
      const msg = err instanceof Error && err.name === 'QuotaExceededError' ? 'Storage full — save NOT written. Export a backup.' : 'Save failed — progress not written. Export a backup.';
      this.hud.saveState('error', msg);
      this.hud.toast(msg, true);
      return false;
    }
  }

  private async exportSlot(slotId: string): Promise<void> {
    let env: SaveEnvelope | null;
    if (slotId === this.slotId && this.world?.data === this.data) {
      await this.save('export');
      env = this.lastEnv;
    } else env = (await this.repo.load(slotId)).envelope;
    if (!env) return;
    const blob = new Blob([JSON.stringify(env, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `the-world-below-${slotId}-${env.updatedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.hud.toast('Save exported.');
  }

  private importInto(slotId: string, done: () => void): void {
    const input = h('input', { type: 'file', accept: 'application/json,.json' }) as HTMLInputElement;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const v = parseImport(text);
      if (!v.ok) {
        this.screens.message('Import rejected', `${v.error} Your existing saves were not changed.`, () => this.screens.pop());
        return;
      }
      const env = v.envelope;
      const existing = (await this.repo.load(slotId)).envelope;
      const info = `World ${env.worldId} · ${env.summary.regionName} · ${fmtTime(env.playSeconds)} played · saved ${new Date(env.updatedAt).toLocaleString()} · save v${env.saveSchemaVersion}, build ${env.gameBuild}.`;
      const apply = async (): Promise<void> => {
        const copy: SaveEnvelope = { ...env, slotId };
        await this.repo.save(copy);
        this.screens.pop();
        this.hud.toast('Save imported.');
        done();
      };
      if (existing) this.screens.confirm(`${info} Replace the journey in this slot? The current one is kept as this slot's backup.`, 'Import', () => void apply(), () => this.screens.pop(), true);
      else this.screens.confirm(`${info} Import into this empty slot?`, 'Import', () => void apply(), () => this.screens.pop());
    });
    input.click();
  }

  // ------------------------------------------------------------------ world entry
  private beginPlay(): void {
    this.mode = 'play';
    this.cameraFocus = null;
    this.hud.show(true);
    this.touchVisible(true);
    this.input.resetAll();
    this.acc = 0;
    this.autosaveT = 0;
  }

  private enterWorld(data: GameData, regionId: string, spawn: { x: number; y: number; face: Face }, announce: boolean): void {
    if (this.world && this.world.data === data) this.flushWorld();
    const def = getRegion(regionId);
    data.regionId = def.id;
    this.world = new World(def, data, spawn);
    this.scene.buildRegion(this.world);
    this.audio.setAmbience(def.ambience);
    if (data === this.data && !data.visitedRegions.includes(def.id)) {
      data.visitedRegions.push(def.id);
      if (announce && def.discoverTitle) {
        this.hud.placeTitle(def.discoverTitle);
        this.audio.play('discover');
      }
    } else if (announce && data === this.data) this.hud.placeTitle(def.name);
    if (data === this.data && def.id.startsWith('gen_')) this.tip('tip_frontier', DIALOGUE.frontier_first![0]!.text);
  }

  private entrySpawn(regionId: string, entry: string): { x: number; y: number; face: Face } {
    const def = getRegion(regionId);
    const e = def.entries[entry];
    if (!e) throw new Error(`Missing entry ${entry} in ${regionId}`);
    return { x: e.tx * TILE + 8, y: e.ty * TILE + 12, face: e.face };
  }

  private transition(target: string, entry: string, slow = false): void {
    if (this.mode === 'transition') return;
    this.mode = 'transition';
    this.input.resetAll();
    const fade = document.querySelector('#fade')!;
    fade.classList.add('on');
    if (slow) this.audio.play('lift');
    else this.audio.play('door');
    const started = performance.now();
    const minWait = slow ? 1100 : 280;
    const go = async (): Promise<void> => {
      let regionId = target;
      try {
        // the frontier: generate (in a worker) and commit a district the first time it is entered
        if (target.startsWith('gen:')) regionId = await this.frontier.resolve(this.data, target.slice(4));
        else if (target.startsWith('manhole:')) {
          const r = this.data.world.manholes[target.slice(8)];
          if (!r) throw new Error('manhole leads nowhere yet');
          regionId = r;
        }
      } catch (err) {
        console.error(err);
        fade.classList.remove('on');
        if (this.world) this.world.cancelExit();
        this.mode = 'play';
        this.hud.toast('The way ahead is blocked. Try again.', true);
        return;
      }
      window.setTimeout(() => {
        this.enterWorld(this.data, regionId, this.entrySpawn(regionId, entry), true);
        void this.save('region');
        window.setTimeout(() => {
          fade.classList.remove('on');
          if (this.mode === 'transition') this.mode = 'play';
        }, slow ? 500 : 120);
      }, Math.max(0, minWait - (performance.now() - started)));
    };
    void go();
  }

  // ------------------------------------------------------------------ main loop
  private frame(dtMs: number): void {
    const dt = dtMs / 1000;
    this.hud.tick(dt);
    if (!this.world) return;
    if (this.mode === 'play' && !this.portrait) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= DT && steps < MAX_STEPS) {
        const cmd = this.input.sample(this.settings.aimAssist);
        this.world.step(cmd);
        steps++;
        this.acc -= DT;
        this.processEvents(this.world.drainEvents());
        if (this.mode !== 'play') break;
      }
      if (steps === MAX_STEPS) this.acc = 0; // never spiral after a long stall
      this.data.playSeconds += dt;
      this.autosaveT += dt;
      if (this.autosaveT > AUTOSAVE_SECONDS && this.world.player.alive) void this.save('auto');
      this.homeIntercom(dt);
      if (!this.world.player.alive) {
        this.deathT += dt;
        if (this.deathT > 1.6) this.showDeath();
      }
    } else {
      this.acc = 0;
      if (this.mode !== 'title') this.input.clearEdges();
    }
    // mouse reticle
    if (this.input.hasMouseAim() && this.mode === 'play') {
      const m = this.input.mouseClient();
      this.scene.reticleWorld = this.scene.clientToWorld(m.x, m.y, this.canvasEl.getBoundingClientRect());
    } else this.scene.reticleWorld = null;
    this.scene.sync(this.world, dt, this.cameraFocus);
    if (this.mode !== 'title') this.hud.update(this.world, this.mode === 'play' ? this.world.interactionCandidate()?.prompt ?? null : null);
    this.updateStats(dtMs);
  }

  private updateStats(dtMs: number): void {
    if (!this.settings.showStats) return;
    this.frameTimes.push(dtMs);
    if (this.frameTimes.length > 240) this.frameTimes.shift();
    this.statsT += dtMs;
    if (this.statsT < 500) return;
    this.statsT = 0;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const avg = sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length);
    this.hud.setStats(`${(1000 / avg).toFixed(0)} fps · p95 ${p95.toFixed(1)}ms · particles ${this.scene.particleCount()} · ${this.game.renderer.type === 2 ? 'WebGL' : 'Canvas'} · zoom ${this.scene.zoom}`);
  }

  private homeIntercom(dt: number): void {
    const w = this.world!;
    if (w.def.id !== REGIONS.home) return;
    const calling = !this.data.flags[F.intercomAnswered] || (this.data.flags[F.relayReconnected] && !this.data.flags[F.sliceComplete]);
    if (!calling) return;
    this.ringT -= dt;
    if (this.ringT <= 0) {
      this.ringT = 3.5;
      this.audio.play('intercom');
      if (this.settings.visualSoundCues) this.cueAt(3 * TILE + 8, TILE + 8, 'ear');
    }
  }

  private cueAt(wx: number, wy: number, icon: 'ear' | 'fire'): void {
    const cam = this.scene.cameras.main;
    const rect = this.canvasEl.getBoundingClientRect();
    const sx = ((wx - cam.worldView.x) / cam.worldView.width) * rect.width + rect.left;
    const sy = ((wy - cam.worldView.y) / cam.worldView.height) * rect.height + rect.top;
    this.hud.soundCue(sx, sy, icon);
  }

  private aimFromClient(cx: number, cy: number): number | null {
    if (!this.world) return null;
    const wp = this.scene.clientToWorld(cx, cy, this.canvasEl.getBoundingClientRect());
    const p = this.world.player;
    return Math.atan2(wp.y - (p.y - 8), wp.x - p.x);
  }

  // ------------------------------------------------------------------ events -> story/actions
  private processEvents(events: SequencedEvent[]): void {
    const w = this.world!;
    this.scene.handleEvents(w, events);
    for (const ev of events) {
      switch (ev.type) {
        case 'ActionRequested':
          void this.runAction(ev.action, ev.entityId);
          break;
        case 'ExitRequested': {
          if (ev.region === REGIONS.street && ev.entry.startsWith('manhole_') && !this.data.flags[`${ev.entry}_open`]) {
            this.data.flags[`${ev.entry}_open`] = true;
            this.hud.toast('You unbolt the manhole from below: a new way down from the street.');
          }
          const lift = ev.region === REGIONS.street && w.def.id === REGIONS.gallery || ev.region === REGIONS.gallery && w.def.id === REGIONS.street;
          this.transition(ev.region, ev.entry, lift);
          break;
        }
        case 'Locked':
          this.sayLocked(ev.textId);
          break;
        case 'PickedUp':
          this.onPickup(ev.item, ev.amount, ev.ref);
          break;
        case 'CacheRecovered':
          this.hud.toast('Recovered your dropped supplies.');
          break;
        case 'PlayerHurt':
          if (ev.amount >= 2) this.hud.hit();
          if (this.data.bandages > 0 && this.data.hp < 60) this.tip('tip_heal', this.input.mode === 'touch' ? 'Hurt? Tap the bandage to heal (moving slowly while you wrap it).' : 'Hurt? Press Q to use a bandage.');
          break;
        case 'PlayerDied':
          this.deathT = 0;
          break;
        case 'EnemyTelegraph':
          if (ev.enemy === 'skitter') this.tip('tip_dodge', this.input.mode === 'touch' ? 'It crouches before it lunges — tap DODGE (footprint) to slip aside.' : 'It crouches before it lunges — press SPACE to dodge aside.');
          if (this.settings.visualSoundCues) this.offscreenCue(ev.x, ev.y);
          break;
        case 'EnemyAlerted':
          if (ev.enemy === 'drone') this.tip('tip_drone', 'A Watchman Drone sweeps its searchlight. Stay out of the beam, or break its line of sight before it locks on and fires.');
          if (ev.enemy === 'leech') this.tip('tip_leech', `Lamp Leeches hunt steady light. Switch the torch off (${this.input.mode === 'touch' ? 'torch button' : 'F'}) or startle them with a shot's flash.`);
          if (ev.enemy === 'keeper') {
            this.hud.placeTitle('The Pipekeeper', true);
            this.hud.subtitle('', DIALOGUE.keeper_intro![0]!.text, 3.5);
          }
          if (this.settings.visualSoundCues) this.offscreenCue(ev.x, ev.y);
          break;
        case 'BossPhase':
          if (ev.phase === 2) {
            this.hud.subtitle('', this.data.flags[F.pipekeeperWheelClosed] ? 'It vents harder — but the floor stays quiet.' : 'The floor vents start to hiss. A pressure wheel squeals on the north wall.', 4);
          }
          break;
        case 'EnemyDied':
          if (ev.enemy === 'keeper') {
            this.hud.subtitle('', DIALOGUE.keeper_defeat![0]!.text, 4);
            void this.save('boss');
          }
          break;
        case 'DodgeRejected':
          this.hud.rejectDodge();
          break;
        case 'WeaponFired':
          this.tip('tip_reload_auto', 'Reloading happens automatically when empty or when you stop firing (R on keyboard).');
          break;
        default:
          break;
      }
    }
  }

  private offscreenCue(x: number, y: number): void {
    const v = this.scene.cameras.main.worldView;
    if (x < v.x || x > v.right || y < v.y || y > v.bottom) this.cueAt(x, y, 'ear');
  }

  private tip(id: string, text: string): void {
    if (this.data.flags[id] || this.world?.data !== this.data) return;
    this.data.flags[id] = true;
    this.hud.subtitle('', text, 6);
  }

  private sayLocked(textId: string): void {
    if (textId === 'heal_full') return this.hud.toast('Already at full health.');
    if (textId === 'heal_none') return this.hud.toast('No bandages.', true);
    const lines = DIALOGUE[textId];
    if (lines) this.hud.subtitle(lines[0]!.speaker ?? '', lines[0]!.text, 4.5);
  }

  private async talk(id: string): Promise<void> {
    const lines = DIALOGUE[id];
    if (!lines) return;
    await this.modal(lines);
  }

  private async modal(lines: Line[]): Promise<void> {
    if (this.mode !== 'play') return;
    this.mode = 'dialogue';
    this.input.resetAll();
    this.audio.play('ui_click');
    await this.dialogue.show(lines);
    this.input.resetAll();
    if (this.mode === 'dialogue') this.mode = 'play';
  }

  private journal(id: string): void {
    if (this.data.journal.includes(id)) return;
    this.data.journal.push(id);
    const e = JOURNAL[id];
    if (e) this.hud.toast(`Journal: ${e.title}`);
  }

  private setFlag(id: string, v = true): void {
    this.world?.setFlag(id, v);
  }

  private async runAction(action: string, entityId = ''): Promise<void> {
    const w = this.world!;
    const d = this.data;
    if (action.startsWith('say:')) return this.talk(action.slice(4));
    if (action.startsWith('open_gate:')) {
      const flag = action.slice(10);
      if (d.flags[flag]) return;
      const junction = w.def.entities.some((e) => e.id === entityId && e.kind === 'interact' && e.label === 'Live junction');
      this.setFlag(flag);
      d.finds.secrets++;
      this.audio.play(junction ? 'keeper_stun' : 'hatch');
      this.scene.sparkle(w.player.x, w.player.y - 10, junction ? 0xb7ead0 : 0xdcd6c6, 22);
      this.scene.addShake(junction ? 2 : 1.5);
      this.hud.subtitle('', junction ? 'You wrench the junction loose. The arc dies with a snap.' : 'The loose bricks come away. Cold air rushes out of a hidden room.', 4);
      void this.save('discovery');
      return;
    }
    if (action.startsWith('restore_lamp:')) {
      this.audio.play('lamp_on');
      this.setFlag(action.slice(13));
      this.scene.sparkle(w.player.x, w.player.y - 16, 0xffc867, 20);
      if (w.def.refuge) d.lastRefuge = { regionId: w.def.id, entry: w.def.refuge.entry, id: w.def.refuge.id };
      this.hud.subtitle('', 'The lamp catches. A refuge: rest here to recover, restock and save.', 4.5);
      void this.save('refuge');
      return;
    }
    if (action.startsWith('survey:')) {
      this.setFlag(action.slice(7));
      w.explored.fill(1);
      this.audio.play('discover');
      this.hud.subtitle('Survey map', `You copy every room and exit of ${w.def.name} onto your map.`, 4.5);
      this.hud.toast('Map updated');
      void this.save('discovery');
      return;
    }
    if (action.startsWith('landmark:')) {
      const name = action.slice(9);
      this.hud.placeTitle(name);
      this.audio.play('discover');
      if (!d.finds.landmarks.includes(name)) {
        d.finds.landmarks.push(name);
        this.hud.toast(`Landmark discovered: ${name}`);
      }
      return;
    }
    if (action.startsWith('title:')) {
      this.hud.placeTitle(action.slice(6));
      this.audio.play('discover');
      return;
    }
    switch (action) {
      case 'intercom':
        this.audio.play('radio');
        if (!d.flags[F.intercomAnswered]) {
          this.setFlag(F.intercomAnswered);
          await this.talk('intercom_first');
          this.journal('lead_relay');
          void this.save('story');
        } else if (d.flags[F.relayReconnected] && !d.flags[F.sliceComplete]) {
          await this.talk('intercom_final');
          this.setFlag(F.sliceComplete);
          this.journal('resolved_slice');
          await this.save('story');
          await this.talk('slice_end');
        } else await this.talk(d.flags[F.sliceComplete] ? 'intercom_after' : 'intercom_waiting');
        return;
      case 'read_home_note':
        await this.talk('home_note');
        this.setFlag(F.noteRead);
        this.journal('lead_toolbox');
        return;
      case 'rest_refuge':
        await this.rest();
        return;
      case 'read_laundry_card':
        await this.talk('laundry_card');
        this.setFlag(F.laundryClueRead);
        this.journal('clue_hatch');
        return;
      case 'open_hatch':
        this.audio.play('hatch');
        this.setFlag(F.laundryHatchOpen);
        this.scene.sparkle(20 * TILE + 8, 6 * TILE + 8, 0xdcd6c6, 10);
        this.hud.subtitle('', DIALOGUE.hatch![0]!.text, 4);
        return;
      case 'restore_booth_lamp':
        this.audio.play('lamp_on');
        this.setFlag(F.boothLampLit);
        this.scene.sparkle(22 * TILE + 8, 2 * TILE + 8, 0xffc867, 20);
        await this.talk('booth_lamp');
        d.lastRefuge = { regionId: w.def.id, entry: 'booth', id: 'refuge_relay_booth' };
        void this.save('refuge');
        return;
      case 'read_diagram':
        await this.talk('diagram');
        this.setFlag(F.clueAirflowDiagram);
        this.journal('clue_airflow_diagram');
        return;
      case 'observe_lint':
        this.setFlag(F.clueMovingLint);
        this.hud.subtitle('', DIALOGUE.lint![0]!.text, 5);
        this.journal('clue_moving_lint');
        return;
      case 'fan_on':
        this.audio.play('fan_on');
        this.setFlag(F.galleryFanPowered);
        this.hud.subtitle('', DIALOGUE.fan_on![0]!.text, 4);
        this.audio.setAmbienceIntensity(1.4);
        return;
      case 'open_panel':
        this.audio.play('hatch');
        this.setFlag(F.maintenancePanelOpen);
        this.scene.sparkle(11 * TILE + 8, 5 * TILE + 12, 0xf4f0e4, 14);
        this.hud.subtitle('', DIALOGUE.panel_open![0]!.text, 4);
        void this.save('discovery');
        return;
      case 'reconnect_relay':
        this.audio.play('relay_tones');
        this.setFlag(F.relayReconnected);
        this.setFlag(F.returnLiftPowered);
        this.scene.sparkle(48 * TILE, 6 * TILE, 0xb7ead0, 30);
        this.scene.addShake(1.5);
        await this.talk('relay');
        this.journal('resolved_relay');
        this.journal('lead_return_home');
        void this.save('story');
        return;
      case 'pipekeeper_commit':
        if (d.flags[F.pipekeeperDefeated] || w.ctx.flag('tmp_arena_sealed')) return;
        this.setFlag('tmp_arena_sealed', true);
        this.audio.play('door');
        this.scene.addShake(2);
        return;
      case 'turn_wheel':
        this.audio.play('hatch');
        this.setFlag(F.pipekeeperWheelClosed);
        this.hud.subtitle('', DIALOGUE.wheel![0]!.text, 4);
        return;
      case 'open_pressure_route':
        this.audio.play('fan_on');
        this.setFlag(F.pressureRouteOpen);
        this.scene.addShake(2);
        this.hud.subtitle('', DIALOGUE.pressure_open![0]!.text, 4.5);
        this.hud.toast('Shortcut opened: Pipeworks ↔ Pumping Gallery');
        void this.save('discovery');
        return;
      case 'tip_dark':
        this.hud.subtitle('', DIALOGUE.dark_tip![0]!.text, 6);
        return;
      default:
        console.warn('Unknown action', action);
    }
  }

  private onPickup(item: string, amount: number, ref?: string): void {
    const d = this.data;
    switch (item) {
      case 'curio': {
        const c = ref ? CURIO_BY_ID[ref] : undefined;
        if (!c) break;
        this.audio.play('discover');
        this.hud.subtitle(c.title, c.text, 8);
        this.hud.toast(`Found: ${c.title} · ${d.finds.curios.length} curios`);
        void this.save('discovery');
        break;
      }
      case 'upgrade': {
        const u = ref ? UPGRADE_BY_ID[ref] : undefined;
        if (!u) break;
        this.audio.play('relay_tones');
        this.hud.subtitle(u.title, u.text, 5);
        this.hud.toast(`Upgrade: ${u.title}`);
        void this.save('discovery');
        break;
      }
      case 'insulated_gloves':
        void this.talk('gloves');
        void this.save('discovery');
        break;
      case 'service_pistol':
        this.setFlag(F.hasPistol);
        void this.talk('pistol').then(() =>
          this.tip('tip_fire', this.input.mode === 'touch' ? 'Hold FIRE to shoot — it aims for you. Drag away from FIRE to aim by hand. Try the tins on the fence.' : 'Hold the left mouse button to fire; the mouse aims. Try the tins on the fence.'),
        );
        void this.save('weapon');
        break;
      case 'pump_shotgun':
        this.hud.subtitle('Locker', DIALOGUE.shotgun![0]!.text, 4.5);
        this.tip('tip_swap', this.input.mode === 'touch' ? 'Tap the weapon panel to switch weapons.' : 'Press 1/2 or use the mouse wheel to switch weapons.');
        break;
      case 'torch_lens':
        this.setFlag(F.hummingWallResolved);
        this.journal('resolved_humming_wall');
        void this.talk('lens');
        void this.save('discovery');
        break;
      case 'note':
        if (d.journal.includes('journal_pressure_route')) {
          this.hud.subtitle('Maintenance log', DIALOGUE.pressure_note![0]!.text, 5);
          this.hud.toast('Journal: Pressure route');
        }
        break;
      case 'light_rounds':
        this.hud.toast(`+${amount} light rounds`);
        break;
      case 'shells':
        this.hud.toast(`+${amount} shells`);
        break;
      case 'bandage':
        this.hud.toast(`+${amount} bandage`);
        break;
    }
  }

  private async rest(): Promise<void> {
    const w = this.world!;
    const d = this.data;
    d.hp = d.maxHp;
    for (const pool of ['light_rounds', 'shells'] as const) {
      if (pool === 'shells' && !d.weapons.includes('pump_shotgun')) continue;
      d.reserves[pool] = Math.max(d.reserves[pool], REFUGE_BASELINE[pool]);
    }
    d.bandages = Math.max(d.bandages, BANDAGE_BASELINE);
    // Unresolved ordinary encounters may return after rest; unique ones never do.
    for (const [rid, delta] of Object.entries(d.regions)) {
      const def = findRegion(rid);
      if (!def) continue;
      delta.defeated = delta.defeated.filter((id) => {
        const e = def.entities.find((x) => x.id === id);
        return !(e && e.kind === 'enemy' && e.respawns);
      });
    }
    if (w.def.refuge) d.lastRefuge = { regionId: w.def.id, entry: w.def.refuge.entry, id: w.def.refuge.id };
    this.audio.play('heal_done');
    this.scene.sparkle(w.player.x, w.player.y - 10, 0xffc867, 18);
    const ok = await this.save('rest');
    this.hud.subtitle('', `Rested. Health restored, basic supplies restocked${ok ? ', saved' : ''}. Creatures may return to the tunnels.`, 4.5);
  }

  // ------------------------------------------------------------------ death & respawn
  private showDeath(): void {
    if (this.mode === 'dead') return;
    this.mode = 'dead';
    this.input.resetAll();
    this.touchVisible(false);
    const d = this.data;
    const w = this.world!;
    let supplies: string;
    if (this.settings.gentleDeath) supplies = 'Gentle death is on: you keep all supplies.';
    else {
      const lr = Math.floor(d.reserves.light_rounds / 2);
      const sh = Math.floor(d.reserves.shells / 2);
      const bd = Math.floor(d.bandages / 2);
      const prev = d.cache;
      d.reserves.light_rounds -= lr;
      d.reserves.shells -= sh;
      d.bandages -= bd;
      // One recovery cache: merge an older one (capped) into the new location.
      d.cache = {
        regionId: w.def.id,
        x: Math.round(w.player.x),
        y: Math.round(w.player.y),
        reserves: { light_rounds: Math.min(80, lr + (prev?.reserves.light_rounds ?? 0)), shells: Math.min(16, sh + (prev?.reserves.shells ?? 0)) },
        bandages: Math.min(4, bd + (prev?.bandages ?? 0)),
      };
      supplies = lr + sh + bd > 0 || prev ? `Some supplies were left where you fell (${d.cache.reserves.light_rounds} rounds, ${d.cache.reserves.shells} shells, ${d.cache.bandages} bandages). Recover them from the marked spot.` : 'You were carrying no spare supplies.';
    }
    this.screens.death({
      reason: `You were brought down by ${w.player.deathSource || 'something in the dark'}.`,
      supplies,
      onReturn: () => this.respawn(),
    });
  }

  private respawn(): void {
    this.screens.clear();
    const d = this.data;
    d.deaths++;
    d.hp = d.maxHp;
    this.mode = 'play';
    this.touchVisible(true);
    const ref = d.lastRefuge;
    this.enterWorld(d, ref.regionId, this.entrySpawn(ref.regionId, ref.entry), false);
    this.hud.placeTitle(REFUGE_NAMES[ref.id] ?? getRegion(ref.regionId).name);
    void this.save('respawn');
  }

  // ------------------------------------------------------------------ pause & menus
  private objectiveText(): string {
    const f = this.data.flags;
    if (!f[F.intercomAnswered]) return 'The intercom is buzzing.';
    if (!f[F.relayReconnected]) return 'Lead: reconnect the relay beneath the laundrette. Follow the amber cable markings.';
    if (!f[F.sliceComplete]) return 'Lead: return home and answer the intercom (the service lift now reaches the street).';
    return 'The line is alive. The tunnels branch everywhere: the storm drain, the Cistern Hall’s south passage, the gallery’s far exits. Follow whatever calls to you.';
  }

  togglePause(): void {
    if (this.mode === 'play') this.openPause();
    else if (this.mode === 'pause' && this.screens.open) {
      this.screens.pop();
      if (!this.screens.open) this.resume();
    }
  }

  private openPause(): void {
    if (this.mode !== 'play') return;
    this.mode = 'pause';
    this.input.resetAll();
    this.touchVisible(false);
    this.screens.pause({
      objective: this.objectiveText(),
      readOnly: this.readOnly,
      onResume: () => {
        this.screens.clear();
        this.resume();
      },
      onMap: () => this.openMap(),
      onJournal: () => this.screens.journal(this.data, () => this.screens.pop()),
      onEquipment: () => this.screens.equipment(this.data, () => this.screens.pop()),
      onSettings: () => this.openSettings(),
      onControls: () => this.screens.controls(this.input.mode === 'touch', () => this.screens.pop()),
      onExport: () => this.slotId && void this.exportSlot(this.slotId),
      onSaveExit: async () => {
        await this.save('exit');
        this.releaseLock?.();
        this.releaseLock = null;
        this.slotId = null;
        void this.showTitle();
      },
    });
  }

  private openMap(): void {
    const w = this.world!;
    this.screens.map(this.data, w.def.id, w.explored, { x: w.player.x, y: w.player.y }, () => this.screens.pop());
  }

  private openMapFromPlay(): void {
    if (this.mode === 'play') {
      this.openPause();
      this.openMap();
    } else if (this.mode === 'pause') {
      this.screens.clear();
      this.resume();
    }
  }

  private openJournalFromPlay(): void {
    if (this.mode !== 'play') return;
    this.openPause();
    this.screens.journal(this.data, () => this.screens.pop());
  }

  private resume(): void {
    if (this.portrait) return;
    this.mode = 'play';
    this.input.resetAll();
    this.touchVisible(true);
    this.audio.resume();
  }

  // ------------------------------------------------------------------ lifecycle & layout
  private installLifecycle(): void {
    const onResize = (): void => this.layout();
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => window.setTimeout(onResize, 150));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.input.resetAll();
        if (this.mode === 'play') this.openPause();
        void this.save('hidden');
        this.audio.suspend();
      } else if (this.mode !== 'play') this.audio.resume();
    });
    window.addEventListener('pagehide', () => void this.save('hidden'));
    this.game.events.on('contextlost', () => this.hud.toast('Graphics context lost — recovering…', true));
  }

  layout(): void {
    const vv = window.visualViewport;
    const cssW = Math.round(vv?.width ?? window.innerWidth);
    const cssH = Math.round(vv?.height ?? window.innerHeight);
    const portrait = cssH > cssW * 1.05 && matchMedia('(pointer: coarse)').matches;
    document.querySelector('#rotate')!.classList.toggle('hidden', !portrait);
    if (portrait && !this.portrait) {
      this.portrait = true;
      this.input.resetAll();
      if (this.mode === 'play') {
        this.pausedForPortrait = true;
        this.openPause();
      }
    } else if (!portrait && this.portrait) {
      this.portrait = false;
      this.pausedForPortrait = false;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const pxW = Math.max(1, Math.round(cssW * dpr));
    const pxH = Math.max(1, Math.round(cssH * dpr));
    // integer world->device scale: ~216 world px tall, never wider than 480 world px
    const zoom = Math.max(1, Math.round(pxH / 216), Math.ceil(pxW / 480));
    this.scene.zoom = zoom;
    if (this.game.scale.width !== pxW || this.game.scale.height !== pxH) this.game.scale.resize(pxW, pxH);
    const canvas = this.game.canvas;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  }
}
