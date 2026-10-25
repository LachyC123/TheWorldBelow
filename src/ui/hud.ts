// DOM HUD composed at CSS resolution (crisp text), updated only when values change.
import type { World } from '../sim/world.ts';
import type { Prompt } from '../sim/types.ts';
import { WEAPONS } from '../content/weapons.ts';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

export class Hud {
  private readonly root = $('#hud');
  private readonly hpFill = $('#hp .fill');
  private readonly hpGhost = $('#hp .ghost');
  private readonly hpNum = $('#hp .num');
  private readonly hazard = $('#hazard');
  private readonly title = $('#place-title');
  private readonly swap = $('#btn-swap');
  private readonly heal = $('#btn-heal');
  private readonly prompt = $('#prompt');
  private readonly subtitleEl = $('#subtitle');
  private readonly toasts = $('#toasts');
  private readonly saveEl = $('#save-indicator');
  private readonly stats = $('#stats');
  private readonly interactBtn = $('#btn-interact');
  private readonly dodgeBtn = $('#btn-dodge');
  private readonly torchBtn = $('#btn-torch');
  private readonly vignette = $('#vignette');
  private readonly cues = $('#sound-cues');
  private last = new Map<string, string>();
  private titleTimer = 0;
  private subtitleTimer = 0;
  private saveTimer = 0;
  showNumbers = true;

  private set(key: string, value: string, apply: () => void): void {
    if (this.last.get(key) === value) return;
    this.last.set(key, value);
    apply();
  }

  show(on: boolean): void {
    this.root.classList.toggle('hidden', !on);
  }

  update(world: World, prompt: Prompt | null): void {
    const d = world.data;
    const p = world.player;
    const hpPct = Math.max(0, Math.min(100, (d.hp / d.maxHp) * 100));
    this.set('hp', hpPct.toFixed(1), () => {
      this.hpFill.style.width = `${hpPct}%`;
      this.hpGhost.style.width = `${hpPct}%`;
      this.hpNum.textContent = this.showNumbers ? `${Math.ceil(d.hp)}` : '';
    });
    const low = d.hp > 0 && d.hp / d.maxHp < 0.3;
    this.set('low', String(low), () => this.vignette.classList.toggle('low', low));
    const latched = !!p.latchedBy;
    this.set('hazard', String(latched), () => {
      this.hazard.classList.toggle('hidden', !latched);
      this.hazard.textContent = latched ? 'Leech! Dodge to shake it off' : '';
    });

    const wid = d.weapons[d.activeWeapon];
    if (!wid) this.set('weapon', 'none', () => this.swap.classList.add('none'));
    else {
      const w = WEAPONS[wid];
      const mag = d.mag[wid] ?? 0;
      const res = d.reserves[w.ammoPool];
      this.set('weapon', `${wid}|${mag}|${res}|${d.weapons.length}`, () => {
        this.swap.classList.remove('none');
        this.swap.querySelector<HTMLImageElement>('.wicon')!.src = `./assets/ui/${wid === 'pump_shotgun' ? 'shotgun' : 'pistol'}.png`;
        this.swap.querySelector('.wname')!.textContent = d.weapons.length > 1 ? `${w.name} ⇄` : w.name;
        this.swap.querySelector('.mag')!.textContent = String(mag);
        this.swap.querySelector('.res')!.textContent = String(res);
        this.swap.classList.toggle('empty', mag === 0);
      });
      const rp = world.reloadProgress();
      this.set('reload', rp.toFixed(2), () => {
        this.swap.classList.toggle('reloading', rp > 0);
        this.swap.querySelector<HTMLElement>('.reload span')!.style.width = `${rp * 100}%`;
      });
    }
    this.set('bandage', `${d.bandages}|${p.healT > 0}`, () => {
      this.heal.querySelector('.count')!.textContent = String(d.bandages);
      this.heal.classList.toggle('none', d.bandages === 0);
      this.heal.classList.toggle('healing', p.healT > 0);
    });
    this.set('torch', String(d.torchOn), () => this.torchBtn.classList.toggle('off', !d.torchOn));
    const cd = p.dodgeCd > 0 ? Math.round((p.dodgeCd / 1.1) * 100) : 0;
    this.set('dodge', String(cd), () => this.dodgeBtn.style.setProperty('--cd', `${cd}%`));

    const pk = prompt ? `${prompt.id}|${prompt.locked}` : '';
    this.set('prompt', pk, () => {
      this.prompt.classList.toggle('hidden', !prompt);
      this.interactBtn.classList.toggle('available', !!prompt && !prompt.locked);
      if (prompt) {
        this.prompt.classList.toggle('locked', prompt.locked);
        this.prompt.querySelector('.verb')!.textContent = prompt.locked ? 'Inspect' : prompt.verb;
        this.prompt.querySelector('.label')!.textContent = prompt.label;
      }
    });
  }

  tick(dt: number): void {
    if (this.titleTimer > 0) {
      this.titleTimer -= dt;
      if (this.titleTimer <= 0) this.title.classList.remove('show');
    }
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) this.subtitleEl.classList.add('hidden');
    }
    if (this.saveTimer > 0) {
      this.saveTimer -= dt;
      if (this.saveTimer <= 0) this.saveEl.classList.remove('show');
    }
  }

  placeTitle(name: string, boss = false): void {
    this.title.querySelector('.name')!.textContent = name;
    this.title.classList.toggle('boss', boss);
    this.title.classList.add('show');
    this.titleTimer = 3;
  }

  subtitle(speaker: string, text: string, seconds = 4.5): void {
    this.subtitleEl.querySelector('.speaker')!.textContent = speaker ? `${speaker}:` : '';
    this.subtitleEl.querySelector('.text')!.textContent = text;
    this.subtitleEl.classList.remove('hidden');
    this.subtitleTimer = seconds;
  }

  toast(text: string, warn = false): void {
    const el = document.createElement('div');
    el.className = `toast${warn ? ' warn' : ''}`;
    el.textContent = text;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 4) this.toasts.firstChild?.remove();
    window.setTimeout(() => el.remove(), 2700);
  }

  saveState(state: 'saved' | 'error', message?: string): void {
    this.saveEl.classList.remove('error');
    if (state === 'saved') {
      this.saveEl.textContent = 'Saved';
      this.saveEl.classList.add('show');
      this.saveTimer = 1.6;
    } else {
      this.saveEl.textContent = message ?? 'Save failed';
      this.saveEl.classList.add('error');
    }
  }

  hit(): void {
    this.vignette.classList.add('hit');
    window.setTimeout(() => this.vignette.classList.remove('hit'), 90);
  }

  rejectDodge(): void {
    this.dodgeBtn.classList.remove('reject');
    void this.dodgeBtn.offsetWidth;
    this.dodgeBtn.classList.add('reject');
  }

  /** Visual equivalent of an audio cue, placed toward its source and clamped on-screen. */
  soundCue(sx: number, sy: number, icon: 'ear' | 'fire' = 'ear'): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = Math.max(28, Math.min(w - 28, sx));
    const y = Math.max(70, Math.min(h - 28, sy));
    const el = document.createElement('div');
    el.className = 'sound-cue';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    const img = document.createElement('img');
    img.src = `./assets/ui/${icon}.png`;
    img.alt = '';
    el.appendChild(img);
    this.cues.appendChild(el);
    window.setTimeout(() => el.remove(), 950);
  }

  setStats(text: string | null): void {
    this.stats.classList.toggle('hidden', text === null);
    if (text !== null) this.stats.textContent = text;
  }
}

export class Dialogue {
  private readonly el = $('#dialogue');
  private lines: Array<{ speaker?: string; text: string }> = [];
  private i = 0;
  private resolve: (() => void) | null = null;
  private openedAt = 0;
  active = false;

  constructor() {
    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.advance();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        this.advance();
      }
    });
  }

  show(lines: Array<{ speaker?: string; text: string }>): Promise<void> {
    this.lines = lines;
    this.i = 0;
    this.active = true;
    this.openedAt = performance.now();
    this.render();
    this.el.classList.remove('hidden');
    return new Promise((r) => (this.resolve = r));
  }

  private render(): void {
    const l = this.lines[this.i];
    if (!l) return;
    this.el.querySelector('.speaker')!.textContent = l.speaker ?? '';
    this.el.querySelector('.text')!.textContent = l.text;
  }

  advance(): void {
    // ignore the tap that opened it (e.g. the interact button press)
    if (!this.active || performance.now() - this.openedAt < 180) return;
    this.openedAt = performance.now();
    this.i++;
    if (this.i >= this.lines.length) {
      this.active = false;
      this.el.classList.add('hidden');
      const r = this.resolve;
      this.resolve = null;
      r?.();
    } else this.render();
  }
}
