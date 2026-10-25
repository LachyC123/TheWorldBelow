// DOM menus: title, slots, settings, pause, journal, map, death, confirm.
// User/imported text is always inserted as textContent, never as HTML.
import type { Settings } from '../app/settings.ts';
import type { SlotSummary } from '../save/repository.ts';
import type { GameData } from '../sim/gameData.ts';
import { findRegion } from '../content/registry.ts';
import { CURIO_BY_ID, UPGRADE_BY_ID } from '../content/discoveries.ts';
import { JOURNAL } from '../content/story.ts';
import { TILE } from '../content/tiles.ts';
import { Cell, Grid } from '../sim/grid.ts';

type Child = Node | string | null | undefined | false;

export function h(tag: string, attrs: Record<string, string | boolean | ((e: Event) => void)> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k, v as EventListener);
    else if (typeof v === 'boolean') {
      if (v) el.setAttribute(k, '');
    } else el.setAttribute(k, v);
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const btn = (label: string, onClick: () => void, cls = '', sub?: string): HTMLElement =>
  h('button', { class: `btn ${cls}`, type: 'button', click: (e: Event) => { e.stopPropagation(); onClick(); } }, label, sub ? h('small', {}, sub) : null);

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const hh = Math.floor(m / 60);
  return hh > 0 ? `${hh}h ${m % 60}m` : `${m}m ${Math.floor(sec % 60)}s`;
}

export class Screens {
  private readonly root = document.querySelector<HTMLElement>('#screens')!;
  private stack: HTMLElement[] = [];
  onClick: (() => void) | null = null;

  get open(): boolean {
    return this.stack.length > 0;
  }

  push(el: HTMLElement): HTMLElement {
    this.stack.at(-1)?.classList.add('hidden');
    this.stack.push(el);
    this.root.appendChild(el);
    const first = el.querySelector<HTMLElement>('button, input, select');
    first?.focus({ preventScroll: true });
    return el;
  }

  pop(): void {
    this.stack.pop()?.remove();
    this.stack.at(-1)?.classList.remove('hidden');
  }

  clear(): void {
    for (const s of this.stack) s.remove();
    this.stack = [];
  }

  screen(card: HTMLElement, id?: string, cls = ''): HTMLElement {
    const s = h('div', { class: `screen ${cls}`, ...(id ? { id } : {}) }, card);
    s.addEventListener('pointerdown', () => this.onClick?.());
    return s;
  }

  // ---------------------------------------------------------------- title
  title(opts: { canContinue: string | null; onContinue: () => void; onNew: () => void; onSaves: () => void; onSettings: () => void; onControls: () => void; onCredits: () => void; build: string; storageNote: string }): void {
    const col = h(
      'div',
      { class: 'title-col' },
      h('h1', {}, 'THE WORLD', h('br'), 'BELOW'),
      h('p', { class: 'tag' }, 'The intercom has been disconnected for decades. Tonight it is ringing.'),
      h(
        'div',
        { class: 'btns' },
        opts.canContinue ? btn('Continue', opts.onContinue, 'primary', opts.canContinue) : null,
        btn('New Journey', opts.onNew, opts.canContinue ? '' : 'primary'),
        btn('Saves', opts.onSaves),
        btn('Settings', opts.onSettings),
        btn('Controls', opts.onControls),
        btn('Credits', opts.onCredits),
      ),
    );
    const s = h('div', { class: 'screen', id: 'title-screen' }, col, h('div', { class: 'foot' }, `First playable slice · build ${opts.build}`, h('br'), opts.storageNote));
    s.addEventListener('pointerdown', () => this.onClick?.());
    this.push(s);
  }

  // ---------------------------------------------------------------- slots
  slots(opts: {
    mode: 'new' | 'manage';
    slots: SlotSummary[];
    storage: string;
    onPick: (slotId: string, existing: boolean) => void;
    onExport: (slotId: string) => void;
    onImport: (slotId: string) => void;
    onDelete: (slotId: string) => void;
    onBack: () => void;
  }): void {
    const rows = opts.slots.map((s, i) => {
      const env = s.envelope;
      const label = env ? `Slot ${i + 1} · ${env.summary.regionName}` : `Slot ${i + 1} · Empty`;
      const sub = env ? `Last refuge: ${env.summary.refugeName} · ${fmtTime(env.playSeconds)} played · saved ${new Date(env.updatedAt).toLocaleString()}` : s.error ? `Unreadable: ${s.error}` : 'No journey yet';
      const main = btn(opts.mode === 'new' ? (env ? `${label} (overwrite)` : label) : env ? `Load: ${label}` : label, () => opts.onPick(s.slotId, !!env), env || opts.mode === 'new' ? '' : '', sub);
      if (opts.mode === 'manage' && !env) (main as HTMLButtonElement).disabled = true;
      const side = h('div', { class: 'side' }, env ? btn('Export', () => opts.onExport(s.slotId)) : null, btn('Import', () => opts.onImport(s.slotId)), env ? btn('Delete', () => opts.onDelete(s.slotId), 'danger') : null);
      return h('div', { class: 'slot' }, main, opts.mode === 'manage' ? side : null);
    });
    const card = h(
      'div',
      { class: 'card' },
      h('h2', {}, opts.mode === 'new' ? 'New Journey — choose a slot' : 'Saves'),
      ...rows,
      h('p', { class: 'meta' }, opts.storage),
      h('div', { class: 'btns row' }, btn('Back', opts.onBack)),
    );
    this.push(this.screen(card));
  }

  // ---------------------------------------------------------------- confirm / message
  confirm(text: string, yes: string, onYes: () => void, onNo: () => void, danger = false): void {
    const card = h('div', { class: 'card' }, h('p', {}, text), h('div', { class: 'btns row' }, btn(yes, onYes, danger ? 'danger' : 'primary'), btn('Cancel', onNo)));
    this.push(this.screen(card));
  }

  message(title: string, text: string | Node, onOk: () => void, ok = 'OK'): void {
    const card = h('div', { class: 'card' }, h('h2', {}, title), typeof text === 'string' ? h('p', {}, text) : text, h('div', { class: 'btns row' }, btn(ok, onOk, 'primary')));
    this.push(this.screen(card));
  }

  // ---------------------------------------------------------------- settings
  settings(s: Settings, onChange: (s: Settings) => void, onBack: () => void): void {
    const toggle = (key: keyof Settings, label: string): HTMLElement => {
      const input = h('input', { type: 'checkbox', 'aria-label': label }) as HTMLInputElement;
      input.checked = s[key] as boolean;
      input.addEventListener('change', () => {
        (s as unknown as Record<string, unknown>)[key] = input.checked;
        onChange(s);
      });
      return h('label', { class: 'setting' }, label, input);
    };
    const range = (key: keyof Settings, label: string, min: number, max: number, step: number): HTMLElement => {
      const input = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), 'aria-label': label }) as HTMLInputElement;
      input.value = String(s[key]);
      input.addEventListener('input', () => {
        (s as unknown as Record<string, unknown>)[key] = Number(input.value);
        onChange(s);
      });
      return h('label', { class: 'setting' }, label, input);
    };
    const quality = h('select', { 'aria-label': 'Effects quality' }, ...(['low', 'medium', 'high'] as const).map((q) => h('option', { value: q, ...(s.quality === q ? { selected: true } : {}) }, q[0]!.toUpperCase() + q.slice(1)))) as HTMLSelectElement;
    quality.addEventListener('change', () => {
      s.quality = quality.value as Settings['quality'];
      onChange(s);
    });
    const card = h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Settings'),
      toggle('aimAssist', 'Aim assistance'),
      toggle('leftHanded', 'Left-handed controls'),
      range('controlScale', 'Control size', 0.8, 1.3, 0.05),
      range('textScale', 'Text size', 0.9, 1.4, 0.05),
      h('label', { class: 'setting' }, 'Effects quality', quality),
      toggle('reducedFlash', 'Reduced flash'),
      toggle('reducedShake', 'Reduced screen shake'),
      toggle('reducedMotion', 'Reduced motion (ambient particles)'),
      toggle('highContrastThreats', 'High-contrast threat warnings'),
      toggle('visualSoundCues', 'Visual sound cues'),
      toggle('gentleDeath', 'Gentle death (keep all supplies)'),
      range('volMaster', 'Master volume', 0, 1, 0.05),
      range('volAmbience', 'Ambience volume', 0, 1, 0.05),
      range('volEffects', 'Effects volume', 0, 1, 0.05),
      toggle('showStats', 'Show performance stats'),
      h('div', { class: 'btns row', style: 'margin-top:12px' }, btn('Back', onBack, 'primary')),
    );
    this.push(this.screen(card));
  }

  controls(touch: boolean, onBack: () => void): void {
    const row = (k: string, v: string): HTMLElement[] => [h('span', { class: 'kbd' }, k), h('span', {}, v)];
    const card = h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Controls'),
      h('p', {}, 'Touch: left thumb anywhere on the left half moves. Hold the big FIRE button to shoot with aim assistance; drag away from it to aim by hand. Footprint = dodge, hand = interact, bandage = heal, tap the weapon panel to switch weapons.'),
      h('div', { class: 'controls-grid' }, ...row('WASD', 'Move'), ...row('Mouse', 'Aim'), ...row('LMB', 'Fire (hold)'), ...row('Space', 'Dodge'), ...row('E', 'Interact / continue'), ...row('Q', 'Bandage'), ...row('R', 'Reload'), ...row('1 / 2', 'Switch weapon (or wheel)'), ...row('F', 'Torch on/off'), ...row('M / Tab', 'Map'), ...row('J', 'Journal'), ...row('Esc', 'Pause')),
      h('p', { class: 'meta' }, touch ? 'Touch controls detected.' : 'Keyboard and mouse detected; touch controls appear when you touch the screen.'),
      h('div', { class: 'btns row' }, btn('Back', onBack, 'primary')),
    );
    this.push(this.screen(card));
  }

  credits(onBack: () => void): void {
    const card = h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Credits'),
      h('p', {}, 'THE WORLD BELOW — first playable slice.'),
      h('p', {}, 'Pixel art, sound synthesis and code: original work created for this project (see public/assets/asset-manifest.json).'),
      h('p', {}, 'Engine: Phaser (MIT). Font: Pixelify Sans (SIL Open Font License 1.1).'),
      h('div', { class: 'btns row' }, btn('Back', onBack, 'primary')),
    );
    this.push(this.screen(card));
  }

  // ---------------------------------------------------------------- pause
  pause(opts: { objective: string; onResume: () => void; onMap: () => void; onJournal: () => void; onEquipment: () => void; onSettings: () => void; onControls: () => void; onExport: () => void; onSaveExit: () => void; readOnly: boolean }): void {
    const card = h(
      'div',
      { class: 'card' },
      h('h2', {}, 'Paused'),
      h('p', {}, opts.objective),
      opts.readOnly ? h('p', { class: 'err' }, 'This save is open in another tab — progress here is not being saved.') : null,
      h(
        'div',
        { class: 'btns' },
        btn('Resume', opts.onResume, 'primary'),
        btn('Map', opts.onMap),
        btn('Journal', opts.onJournal),
        btn('Equipment', opts.onEquipment),
        btn('Settings', opts.onSettings),
        btn('Controls', opts.onControls),
        btn('Export save (backup file)', opts.onExport),
        btn('Save & Exit to title', opts.onSaveExit),
      ),
    );
    this.push(this.screen(card));
  }

  // ---------------------------------------------------------------- equipment
  equipment(data: GameData, onBack: () => void): void {
    const DESC: Record<string, string> = {
      service_pistol: 'Reliable and accurate. Eight light rounds; quick feedback at mid range.',
      pump_shotgun: 'Short range, strong interruption and a wide flash that lights whole rooms. Shells are scarce.',
    };
    const item = (title: string, text: string): HTMLElement => h('div', { class: 'journal-entry' }, h('b', {}, title), h('span', {}, text));
    const weapons = data.weapons.map((id) => {
      const res = id === 'pump_shotgun' ? data.reserves.shells : data.reserves.light_rounds;
      const name = id === 'pump_shotgun' ? 'Pump Shotgun' : 'Service Pistol';
      return item(`${name}${data.weapons[data.activeWeapon] === id ? ' (equipped)' : ''}`, `${DESC[id] ?? ''} Loaded ${data.mag[id] ?? 0}, carrying ${res}.`);
    });
    const TOOL: Record<string, [string, string]> = {
      torch_lens: ['Torch Lens', 'Ground glass from the Pipekeeper’s lamp: your torch reaches further and wider.'],
      insulated_gloves: ['Insulated gloves', 'Lets you disconnect live junctions that seal off rooms.'],
    };
    const caps = data.capabilities.filter((c) => TOOL[c]).map((c) => item(TOOL[c]![0], TOOL[c]![1]));
    const mods = data.finds.upgrades.map((u) => UPGRADE_BY_ID[u]).filter((u): u is NonNullable<typeof u> => !!u);
    const tonics = mods.filter((u) => u.kind === 'tonic').length;
    if (tonics) caps.push(item(`Steadying tonics ×${tonics}`, `Maximum health raised to ${data.maxHp}.`));
    for (const u of mods.filter((x) => x.kind === 'mod')) caps.push(item(u.title, u.text));
    const card = h(
      'div',
      { class: 'card wide' },
      h('h2', {}, 'Equipment'),
      h('div', { class: 'journal-section' }, h('h3', {}, 'Weapons'), ...(weapons.length ? weapons : [h('p', {}, 'Unarmed.')])),
      h('div', { class: 'journal-section' }, h('h3', {}, 'Supplies'), item('Bandages', `${data.bandages} carried. Heals 40 over 1.2 s; dodging or taking damage interrupts it.`), item('Torch', `${data.torchOn ? 'On' : 'Off'}. Never runs out. Lamp Leeches are drawn to a steady beam.`)),
      caps.length ? h('div', { class: 'journal-section' }, h('h3', {}, 'Tools'), ...caps) : null,
      data.cache ? h('p', { class: 'meta' }, `Dropped supplies waiting in ${findRegion(data.cache.regionId)?.name ?? 'the dark'} (marked red on the map).`) : null,
      h('div', { class: 'btns row', style: 'margin-top:12px' }, btn('Back', onBack, 'primary')),
    );
    this.push(this.screen(card));
  }

  // ---------------------------------------------------------------- journal
  journal(data: GameData, onBack: () => void): void {
    const entries = data.journal.map((id) => JOURNAL[id]).filter((e): e is NonNullable<typeof e> => !!e);
    const section = (title: string, kind: 'lead' | 'clue' | 'resolved'): HTMLElement | null => {
      const list = entries.filter((e) => e.kind === kind);
      if (!list.length) return null;
      return h('div', { class: 'journal-section' }, h('h3', {}, title), ...list.map((e) => h('div', { class: `journal-entry ${kind}` }, h('b', {}, e.title), h('span', {}, e.text))));
    };
    const card = h(
      'div',
      { class: 'card wide' },
      h('h2', {}, 'Journal'),
      entries.length ? null : h('p', {}, 'Nothing written yet.'),
      section('Current leads', 'lead'),
      section('Observations', 'clue'),
      section('Resolved', 'resolved'),
      findsSection(data),
      h('div', { class: 'btns row', style: 'margin-top:12px' }, btn('Back', onBack, 'primary')),
    );
    this.push(this.screen(card));
  }

  // ---------------------------------------------------------------- map
  map(data: GameData, currentRegion: string, liveExplored: Uint8Array | null, player: { x: number; y: number }, onBack: () => void): void {
    const canvas = h('canvas') as HTMLCanvasElement;
    const wrap = h('div', { class: 'mapwrap' }, canvas);
    let region = currentRegion;
    const tabs = h('div', { class: 'maptabs' });
    const view = { scale: 0, ox: 0, oy: 0 };
    const draw = (): void => {
      const def = findRegion(region);
      if (!def) return;
      const grid = new Grid(def);
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#05060a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const bits = region === currentRegion && liveExplored ? liveExplored : decode(data.regions[region]?.explored ?? '', grid.w * grid.h);
      if (view.scale === 0) {
        view.scale = Math.max(2, Math.floor(Math.min(canvas.width / grid.w, canvas.height / grid.h) * 0.92));
        view.ox = (canvas.width - grid.w * view.scale) / 2;
        view.oy = (canvas.height - grid.h * view.scale) / 2;
      }
      const s = view.scale;
      for (let y = 0; y < grid.h; y++)
        for (let x = 0; x < grid.w; x++) {
          if (!bits[y * grid.w + x]) continue;
          const c = grid.cells[y * grid.w + x];
          // draw walls only where they bound known open ground, so the map reads as rooms, not mass
          if (c === Cell.Wall) {
            let edge = false;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < grid.w && ny < grid.h && grid.cells[ny * grid.w + nx] !== Cell.Wall && bits[ny * grid.w + nx]) edge = true;
            }
            if (!edge) continue;
          }
          ctx.fillStyle = c === Cell.Wall ? '#5a6680' : c === Cell.Water ? '#1d3a5a' : '#262e40';
          ctx.fillRect(view.ox + x * s, view.oy + y * s, s, s);
        }
      const mark = (tx: number, ty: number, col: string, size = 1): void => {
        if (!bits[ty * grid.w + tx]) return;
        ctx.fillStyle = col;
        ctx.fillRect(view.ox + tx * s - (s * (size - 1)) / 2, view.oy + ty * s - (s * (size - 1)) / 2, s * size, s * size);
      };
      const t = performance.now() / 1000;
      for (const e of def.entities) {
        if (e.kind === 'exit') {
          const tr = e.target.region;
          const unexplored = (tr.startsWith('gen:') && !data.world.sockets[tr.slice(4)]) || (!tr.startsWith('gen:') && !tr.startsWith('manhole:') && !data.visitedRegions.includes(tr));
          if (unexplored && bits[e.ty * grid.w + e.tx]) {
            // unexplored ways onward pulse on the map: the pull of the frontier
            ctx.strokeStyle = `rgba(255,200,103,${0.55 + Math.sin(t * 4) * 0.35})`;
            ctx.lineWidth = Math.max(1, s * 0.4);
            ctx.beginPath();
            ctx.arc(view.ox + (e.tx + 0.5) * s, view.oy + (e.ty + 0.5) * s, s * 1.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffc867';
            ctx.font = `${Math.max(8, s * 1.6)}px Pixelify Sans, monospace`;
            ctx.fillText('?', view.ox + (e.tx + 0.2) * s, view.oy + (e.ty + 0.9) * s);
          } else mark(e.tx, e.ty, '#e39a3c');
        }
        if (e.kind === 'interact' && e.action === 'rest_refuge') mark(e.tx, e.ty, '#ffc867', 1.6);
      }
      if (data.cache && data.cache.regionId === region) mark(Math.floor(data.cache.x / TILE), Math.floor(data.cache.y / TILE), '#ff6a40', 1.6);
      if (region === currentRegion) {
        ctx.fillStyle = '#b7ead0';
        const px = view.ox + (player.x / TILE) * s;
        const py = view.oy + ((player.y - 4) / TILE) * s;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(3, s * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#b8b2a2';
      ctx.font = `${12 * dpr}px Pixelify Sans, monospace`;
      ctx.fillText(def.name.toUpperCase(), 10 * dpr, 18 * dpr);
    };
    const visited = [currentRegion, ...data.visitedRegions.filter((r) => r !== currentRegion)];
    for (const r of visited) {
      const b = btn(findRegion(r)?.name ?? r, () => {
        region = r;
        view.scale = 0;
        for (const c of tabs.children) c.classList.remove('on');
        b.classList.add('on');
        draw();
      });
      if (r === currentRegion) b.classList.add('on');
      tabs.appendChild(b);
    }
    // pan + pinch/wheel zoom on the map only
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dpr = canvas.width / canvas.getBoundingClientRect().width;
      if (pointers.size === 1) {
        view.ox += (e.clientX - p.x) * dpr;
        view.oy += (e.clientY - p.y) * dpr;
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const d = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
        if (pinch) view.scale = Math.max(2, Math.min(24, view.scale * (d / pinch)));
        pinch = d;
      }
      p.x = e.clientX;
      p.y = e.clientY;
      draw();
    });
    const end = (e: PointerEvent): void => {
      pointers.delete(e.pointerId);
      pinch = 0;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => {
      view.scale = Math.max(2, Math.min(24, Math.round(view.scale * (e.deltaY < 0 ? 1.25 : 0.8))));
      draw();
    }, { passive: true });
    const card = h(
      'div',
      { class: 'card wide' },
      h('h2', {}, 'Map'),
      tabs,
      wrap,
      h('p', { class: 'meta' }, `Only places you have seen are drawn. Pulsing ? marks a way onward you have not taken. Gold: refuges · red: dropped supplies. Places charted: ${data.visitedRegions.length}.`),
      h('div', { class: 'btns row' }, btn('Back', onBack, 'primary'), btn('Centre', () => { view.scale = 0; draw(); })),
    );
    this.push(this.screen(card));
    const tick = (): void => {
      if (!card.isConnected) return;
      draw();
      window.setTimeout(() => requestAnimationFrame(tick), 120);
    };
    requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------------- death
  death(opts: { reason: string; supplies: string; onReturn: () => void }): void {
    const card = h(
      'div',
      { class: 'card death' },
      h('h2', {}, 'You fell'),
      h('p', {}, opts.reason),
      h('p', {}, opts.supplies),
      h('p', { class: 'meta' }, 'Map knowledge, journal, opened routes and resolved encounters are kept.'),
      h('div', { class: 'btns' }, btn('Return to refuge', opts.onReturn, 'primary')),
    );
    this.push(this.screen(card));
  }
}

function findsSection(data: GameData): HTMLElement | null {
  const f = data.finds;
  if (!f.curios.length && !f.landmarks.length && !f.upgrades.length && !f.secrets) return null;
  const items: HTMLElement[] = [];
  for (const id of f.curios) {
    const c = CURIO_BY_ID[id];
    if (c) items.push(h('div', { class: 'journal-entry clue' }, h('b', {}, c.title), h('span', {}, c.text)));
  }
  return h(
    'div',
    { class: 'journal-section' },
    h('h3', {}, `Finds · ${f.curios.length} curios · ${f.landmarks.length} landmarks · ${f.secrets} hidden ways opened`),
    f.landmarks.length ? h('p', { class: 'meta' }, `Landmarks: ${f.landmarks.join(', ')}.`) : null,
    ...items,
  );
}

function decode(b64: string, n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (!b64) return out;
  try {
    const s = atob(b64);
    for (let i = 0; i < n; i++) out[i] = (s.charCodeAt(i >> 3) >> (i & 7)) & 1;
  } catch {
    // unreadable map knowledge is cosmetic
  }
  return out;
}
