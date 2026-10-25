// Touch + keyboard/mouse input with explicit pointer ownership (docs/design/docs/05).
// Each pointer is assigned to exactly one control on pointerdown and released on
// up/cancel/lost-capture/blur/hidden/pause. Produces one Commands snapshot per sim tick.
import type { Commands } from '../sim/types.ts';

type ControlId = 'move' | 'fire' | 'dodge' | 'interact' | 'heal' | 'swap' | 'torch';

interface Owned {
  control: ControlId;
  startX: number;
  startY: number;
  x: number;
  y: number;
}

export interface InputHooks {
  /** client coords -> world angle from the player's chest (mouse aim) */
  aimFromClient(clientX: number, clientY: number): number | null;
  onPause(): void;
  onMap(): void;
  onJournal(): void;
  isGameplayActive(): boolean;
}

const DRAG_THRESHOLD = 10;
const STICK_RADIUS = 44;
const STICK_DEAD = 0.18;

export class InputController {
  private readonly owners = new Map<number, Owned>();
  private readonly keys = new Set<string>();
  private readonly edges = new Set<ControlId | 'reload'>();
  private mouseDown = false;
  private mouseX = 0;
  private mouseY = 0;
  private mouseActive = false;
  private lastTouchTime = -1e9;
  mode: 'touch' | 'desktop' = 'desktop';
  private readonly root: HTMLElement;
  private readonly hooks: InputHooks;
  private readonly stickBase: HTMLElement;
  private readonly stickKnob: HTMLElement;
  private readonly fireBtn: HTMLElement;
  private readonly aimLine: HTMLElement;
  /** manual aim from a fire-button drag (radians, screen space == world space) */
  private dragAim: number | null = null;
  private stickVec = { x: 0, y: 0 };
  onModeChange: ((m: 'touch' | 'desktop') => void) | null = null;
  private readonly disposers: Array<() => void> = [];

  constructor(root: HTMLElement, canvas: HTMLElement, hooks: InputHooks) {
    this.root = root;
    this.hooks = hooks;
    this.stickBase = root.querySelector('#stick-base')!;
    this.stickKnob = root.querySelector('#stick-knob')!;
    this.fireBtn = root.querySelector('#btn-fire')!;
    this.aimLine = root.querySelector('#aim-line')!;

    const on = <K extends keyof WindowEventMap>(t: EventTarget, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions): void => {
      t.addEventListener(type, fn as EventListener, opts);
      this.disposers.push(() => t.removeEventListener(type, fn as EventListener, opts));
    };

    // --- touch controls
    const zones: Array<[string, ControlId]> = [
      ['#touch-move', 'move'],
      ['#btn-fire', 'fire'],
      ['#btn-dodge', 'dodge'],
      ['#btn-interact', 'interact'],
      ['#btn-heal', 'heal'],
      ['#btn-swap', 'swap'],
      ['#btn-torch', 'torch'],
    ];
    for (const [sel, control] of zones) {
      const el = root.querySelector<HTMLElement>(sel);
      if (!el) continue;
      on(el, 'pointerdown', (e: PointerEvent) => this.down(e, control, el));
      on(el, 'pointermove', (e: PointerEvent) => this.move(e));
      on(el, 'pointerup', (e: PointerEvent) => this.up(e));
      on(el, 'pointercancel', (e: PointerEvent) => this.up(e));
      on(el, 'lostpointercapture', (e: PointerEvent) => this.up(e));
    }
    for (const [sel, fn] of [['#btn-pause', () => hooks.onPause()], ['#btn-map', () => hooks.onMap()]] as const) {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) on(el, 'click', () => fn());
    }

    // --- mouse on the game canvas (ignored when it's a synthetic event after touch)
    on(canvas, 'pointerdown', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      this.setMode('desktop');
      if (e.button === 0) this.mouseDown = true;
      this.mouseActive = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    on(window, 'pointerup', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button === 0) this.mouseDown = false;
    });
    on(window, 'pointermove', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (performance.now() - this.lastTouchTime < 800) return;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.mouseActive = true;
    });
    on(canvas, 'contextmenu', (e: Event) => e.preventDefault());
    on(canvas, 'wheel', (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 4) this.edges.add('swap');
    }, { passive: true });

    // --- keyboard
    on(window, 'keydown', (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return;
      const k = e.code;
      if (!e.repeat) {
        if (k === 'Space') this.edges.add('dodge');
        if (k === 'KeyE' || k === 'Enter') this.edges.add('interact');
        if (k === 'KeyQ') this.edges.add('heal');
        if (k === 'KeyR') this.edges.add('reload');
        if (k === 'KeyF') this.edges.add('torch');
        if (k === 'Digit1' || k === 'Digit2') this.edges.add('swap');
        if (k === 'Escape' || k === 'KeyP') hooks.onPause();
        if (k === 'Tab' || k === 'KeyM') hooks.onMap();
        if (k === 'KeyJ') hooks.onJournal();
      }
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k) && hooks.isGameplayActive()) e.preventDefault();
      this.keys.add(k);
      if (this.mode !== 'desktop' && /^(Key[WASD]|Arrow)/.test(k)) this.setMode('desktop');
    });
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    on(window, 'blur', () => this.resetAll());
    on(document, 'visibilitychange', () => {
      if (document.hidden) this.resetAll();
    });
    on(window, 'touchstart', () => {
      this.lastTouchTime = performance.now();
      this.setMode('touch');
    }, { passive: true });
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers.length = 0;
  }

  setMode(m: 'touch' | 'desktop'): void {
    if (this.mode === m) return;
    this.mode = m;
    if (m === 'touch') {
      this.mouseActive = false;
      this.mouseDown = false;
    }
    this.onModeChange?.(m);
  }

  private down(e: PointerEvent, control: ControlId, el: HTMLElement): void {
    if (e.pointerType === 'mouse' && control === 'move') return;
    e.preventDefault();
    if (e.pointerType !== 'mouse') {
      this.lastTouchTime = performance.now();
      this.setMode('touch');
    }
    if (this.owners.has(e.pointerId)) return;
    // one pointer per control; a second finger on the same control is ignored
    for (const o of this.owners.values()) if (o.control === control) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // capture unsupported; ownership still tracked by id
    }
    this.owners.set(e.pointerId, { control, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY });
    if (control === 'move') {
      const r = this.root.getBoundingClientRect();
      this.stickBase.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
      this.stickBase.classList.add('active');
      this.stickKnob.style.transform = 'translate(0px, 0px)';
      this.stickVec = { x: 0, y: 0 };
    } else if (control === 'fire') {
      this.fireBtn.classList.add('pressed');
      this.dragAim = null;
    } else {
      el.classList.add('pressed');
      this.edges.add(control);
      window.setTimeout(() => el.classList.remove('pressed'), 120);
    }
  }

  private move(e: PointerEvent): void {
    const o = this.owners.get(e.pointerId);
    if (!o) return;
    o.x = e.clientX;
    o.y = e.clientY;
    if (o.control === 'move') {
      const dx = o.x - o.startX;
      const dy = o.y - o.startY;
      const d = Math.hypot(dx, dy);
      const k = Math.min(1, d / STICK_RADIUS);
      const nx = d > 0 ? (dx / d) * k : 0;
      const ny = d > 0 ? (dy / d) * k : 0;
      this.stickVec = k < STICK_DEAD ? { x: 0, y: 0 } : { x: nx, y: ny };
      this.stickKnob.style.transform = `translate(${nx * STICK_RADIUS}px, ${ny * STICK_RADIUS}px)`;
    } else if (o.control === 'fire') {
      const dx = o.x - o.startX;
      const dy = o.y - o.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        this.dragAim = Math.atan2(dy, dx);
        this.aimLine.classList.add('active');
        this.aimLine.style.transform = `translate(${o.startX - this.root.getBoundingClientRect().left}px, ${o.startY - this.root.getBoundingClientRect().top}px) rotate(${this.dragAim}rad)`;
      }
    }
  }

  private up(e: PointerEvent): void {
    const o = this.owners.get(e.pointerId);
    if (!o) return;
    this.owners.delete(e.pointerId);
    if (o.control === 'move') {
      this.stickVec = { x: 0, y: 0 };
      this.stickBase.classList.remove('active');
    } else if (o.control === 'fire') {
      this.fireBtn.classList.remove('pressed');
      this.dragAim = null;
      this.aimLine.classList.remove('active');
    }
  }

  /** Release every owned pointer and held key (pause, blur, hidden tab, scene change). */
  resetAll(): void {
    this.owners.clear();
    this.keys.clear();
    this.edges.clear();
    this.mouseDown = false;
    this.stickVec = { x: 0, y: 0 };
    this.dragAim = null;
    this.stickBase.classList.remove('active');
    this.fireBtn.classList.remove('pressed');
    this.aimLine.classList.remove('active');
  }

  /** Discard pending edge presses (e.g. a menu tap must not become a dodge). */
  clearEdges(): void {
    this.edges.clear();
  }

  hasMouseAim(): boolean {
    return this.mode === 'desktop' && this.mouseActive;
  }

  mouseClient(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  /** Snapshot for one simulation tick; edge presses are consumed. */
  sample(aimAssist: boolean): Commands {
    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    if (mx === 0 && my === 0) {
      mx = this.stickVec.x;
      my = this.stickVec.y;
    }
    let fire = this.mouseDown || this.keys.has('KeyK');
    for (const o of this.owners.values()) if (o.control === 'fire') fire = true;
    let aimAngle: number | null = null;
    if (this.dragAim !== null) aimAngle = this.dragAim;
    else if (this.hasMouseAim()) aimAngle = this.hooks.aimFromClient(this.mouseX, this.mouseY);
    const cmd: Commands = {
      moveX: mx,
      moveY: my,
      aimAngle,
      assist: aimAssist,
      fire,
      dodge: this.edges.has('dodge'),
      interact: this.edges.has('interact'),
      heal: this.edges.has('heal'),
      swap: this.edges.has('swap'),
      reload: this.edges.has('reload'),
      torch: this.edges.has('torch'),
    };
    this.edges.clear();
    return cmd;
  }
}
