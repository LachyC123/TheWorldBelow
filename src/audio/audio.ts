// Web Audio cue synthesis with category buses (placeholder sound design: synthesized, no
// third-party samples). Unlocked from the Start/Continue gesture; recovers suspended contexts.
import type { AmbienceId } from '../content/types.ts';

type Bus = 'ambience' | 'weapons' | 'creatures' | 'ui' | 'world';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<Bus, GainNode>> = {};
  private noise: AudioBuffer | null = null;
  private ambienceNodes: AudioNode[] = [];
  private ambienceGain: GainNode | null = null;
  private currentAmbience: AmbienceId | null = null;
  private dripTimer: number | null = null;
  volumes = { master: 0.8, ambience: 0.7, effects: 0.9 };
  private lastPlayed = new Map<string, number>();

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Must be called from a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      for (const b of ['ambience', 'weapons', 'creatures', 'ui', 'world'] as Bus[]) {
        const g = this.ctx.createGain();
        g.connect(this.master);
        this.buses[b] = g;
      }
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let seed = 1234567;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        d[i] = (seed / 0x7fffffff) * 2 - 1;
      }
      this.applyVolumes();
    }
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend().catch(() => undefined);
  }

  resume(): void {
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
  }

  applyVolumes(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.value = this.volumes.master;
    this.buses.ambience!.gain.value = this.volumes.ambience;
    for (const b of ['weapons', 'creatures', 'ui', 'world'] as Bus[]) this.buses[b]!.gain.value = this.volumes.effects;
  }

  // ------------------------------------------------------------ primitives
  private noiseBurst(bus: Bus, opts: { dur: number; gain: number; type: BiquadFilterType; freq: number; q?: number; freqEnd?: number; attack?: number; delay?: number; pan?: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type;
    f.frequency.setValueAtTime(opts.freq, t);
    if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + opts.dur);
    f.Q.value = opts.q ?? 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain, t + (opts.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    const p = ctx.createStereoPanner();
    p.pan.value = opts.pan ?? 0;
    src.connect(f).connect(g).connect(p).connect(this.buses[bus]!);
    src.start(t, Math.random() * 1.5);
    src.stop(t + opts.dur + 0.05);
  }

  private tone(bus: Bus, opts: { freq: number; freqEnd?: number; dur: number; gain: number; type?: OscillatorType; delay?: number; attack?: number; pan?: number }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const o = ctx.createOscillator();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(opts.freq, t);
    if (opts.freqEnd) o.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + opts.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain, t + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    const p = ctx.createStereoPanner();
    p.pan.value = opts.pan ?? 0;
    o.connect(g).connect(p).connect(this.buses[bus]!);
    o.start(t);
    o.stop(t + opts.dur + 0.05);
  }

  /** Rate-limit identical cues so overlapping events never stack into noise. */
  private gate(id: string, minGap: number): boolean {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime;
    const last = this.lastPlayed.get(id) ?? -1;
    if (now - last < minGap) return false;
    this.lastPlayed.set(id, now);
    return true;
  }

  // ------------------------------------------------------------ cues
  play(cue: string, pan = 0, volume = 1): void {
    if (!this.ctx) return;
    const v = volume;
    switch (cue) {
      case 'shot_service_pistol':
        this.noiseBurst('weapons', { dur: 0.09, gain: 0.7 * v, type: 'highpass', freq: 1800, pan });
        this.noiseBurst('weapons', { dur: 0.22, gain: 0.5 * v, type: 'lowpass', freq: 1400, freqEnd: 300, pan });
        this.tone('weapons', { freq: 140, freqEnd: 50, dur: 0.16, gain: 0.5 * v, type: 'triangle', pan });
        this.noiseBurst('weapons', { dur: 0.5, gain: 0.08 * v, type: 'bandpass', freq: 500, q: 0.6, delay: 0.05, attack: 0.04, pan }); // room tail
        break;
      case 'shot_pump_shotgun':
        this.noiseBurst('weapons', { dur: 0.14, gain: 0.9 * v, type: 'highpass', freq: 900, pan });
        this.noiseBurst('weapons', { dur: 0.4, gain: 0.7 * v, type: 'lowpass', freq: 1000, freqEnd: 160, pan });
        this.tone('weapons', { freq: 95, freqEnd: 38, dur: 0.3, gain: 0.7 * v, type: 'triangle', pan });
        this.noiseBurst('weapons', { dur: 0.8, gain: 0.12 * v, type: 'bandpass', freq: 380, q: 0.5, delay: 0.06, attack: 0.05, pan });
        this.noiseBurst('weapons', { dur: 0.06, gain: 0.25 * v, type: 'bandpass', freq: 2400, q: 4, delay: 0.42, pan }); // pump
        this.noiseBurst('weapons', { dur: 0.06, gain: 0.25 * v, type: 'bandpass', freq: 1800, q: 4, delay: 0.55, pan });
        break;
      case 'dryfire':
        this.noiseBurst('weapons', { dur: 0.03, gain: 0.3, type: 'bandpass', freq: 3000, q: 6 });
        break;
      case 'reload_start':
        this.noiseBurst('weapons', { dur: 0.05, gain: 0.25, type: 'bandpass', freq: 2200, q: 5 });
        break;
      case 'reload_end':
        this.noiseBurst('weapons', { dur: 0.05, gain: 0.3, type: 'bandpass', freq: 1500, q: 5 });
        this.noiseBurst('weapons', { dur: 0.04, gain: 0.3, type: 'bandpass', freq: 2600, q: 6, delay: 0.07 });
        break;
      case 'impact_wall':
        if (!this.gate(cue, 0.03)) return;
        this.noiseBurst('world', { dur: 0.07, gain: 0.25 * v, type: 'bandpass', freq: 1600, q: 1.5, pan });
        break;
      case 'impact_metal':
        if (!this.gate(cue, 0.03)) return;
        this.tone('world', { freq: 1800 + Math.random() * 600, freqEnd: 1400, dur: 0.12, gain: 0.12 * v, type: 'square', pan });
        this.noiseBurst('world', { dur: 0.05, gain: 0.2 * v, type: 'highpass', freq: 3000, pan });
        break;
      case 'impact_flesh':
        if (!this.gate(cue, 0.03)) return;
        this.noiseBurst('creatures', { dur: 0.1, gain: 0.35 * v, type: 'lowpass', freq: 700, pan });
        break;
      case 'impact_jelly':
        this.noiseBurst('creatures', { dur: 0.15, gain: 0.3 * v, type: 'bandpass', freq: 400, q: 3, pan });
        break;
      case 'impact_tin':
        this.tone('world', { freq: 2400, freqEnd: 1900, dur: 0.25, gain: 0.15, type: 'triangle', pan });
        this.tone('world', { freq: 3300, dur: 0.15, gain: 0.08, type: 'triangle', pan });
        break;
      case 'impact_water':
        this.noiseBurst('world', { dur: 0.12, gain: 0.2, type: 'bandpass', freq: 900, q: 2, pan });
        break;
      case 'skitter_alert':
        if (!this.gate(cue, 0.4)) return;
        for (let i = 0; i < 5; i++) this.noiseBurst('creatures', { dur: 0.025, gain: 0.25 * v, type: 'bandpass', freq: 3200 + i * 200, q: 8, delay: i * 0.035, pan });
        break;
      case 'skitter_tell':
        // rising chitter: the audible warning that has a visual crouch equivalent
        for (let i = 0; i < 8; i++) this.noiseBurst('creatures', { dur: 0.02, gain: 0.3 * v, type: 'bandpass', freq: 2500 + i * 250, q: 10, delay: i * 0.06, pan });
        break;
      case 'skitter_lunge':
        this.noiseBurst('creatures', { dur: 0.18, gain: 0.3 * v, type: 'bandpass', freq: 1200, freqEnd: 2600, q: 2, pan });
        break;
      case 'skitter_die':
        this.noiseBurst('creatures', { dur: 0.35, gain: 0.35 * v, type: 'bandpass', freq: 1800, freqEnd: 400, q: 3, pan });
        break;
      case 'leech_alert':
        this.tone('creatures', { freq: 220, freqEnd: 330, dur: 0.6, gain: 0.12 * v, type: 'sine', attack: 0.2, pan });
        break;
      case 'leech_tell':
        this.tone('creatures', { freq: 300, freqEnd: 900, dur: 0.55, gain: 0.18 * v, type: 'sawtooth', attack: 0.1, pan });
        break;
      case 'leech_latch':
        this.noiseBurst('creatures', { dur: 0.25, gain: 0.4, type: 'lowpass', freq: 500, pan });
        this.tone('creatures', { freq: 120, dur: 0.4, gain: 0.2, type: 'square' });
        break;
      case 'leech_flee':
        this.tone('creatures', { freq: 900, freqEnd: 200, dur: 0.3, gain: 0.12 * v, type: 'sine', pan });
        break;
      case 'leech_die':
        this.noiseBurst('creatures', { dur: 0.4, gain: 0.3 * v, type: 'bandpass', freq: 600, freqEnd: 150, q: 2, pan });
        break;
      case 'keeper_alert':
        this.tone('creatures', { freq: 70, freqEnd: 45, dur: 1.2, gain: 0.5, type: 'sawtooth', attack: 0.1 });
        this.noiseBurst('creatures', { dur: 1, gain: 0.3, type: 'lowpass', freq: 400, attack: 0.2 });
        break;
      case 'keeper_tell':
        this.tone('creatures', { freq: 180, freqEnd: 360, dur: 0.6, gain: 0.25 * v, type: 'square', attack: 0.05, pan });
        break;
      case 'keeper_hose':
        this.noiseBurst('creatures', { dur: 1.0, gain: 0.45 * v, type: 'bandpass', freq: 1500, q: 0.8, attack: 0.05, pan });
        break;
      case 'keeper_rush':
        this.tone('creatures', { freq: 60, freqEnd: 90, dur: 0.8, gain: 0.5 * v, type: 'sawtooth', pan });
        break;
      case 'keeper_vent':
        this.noiseBurst('creatures', { dur: 0.7, gain: 0.6 * v, type: 'highpass', freq: 1200, freqEnd: 400, attack: 0.01, pan });
        break;
      case 'keeper_stun':
        this.tone('world', { freq: 300, freqEnd: 120, dur: 0.6, gain: 0.4, type: 'square' });
        this.noiseBurst('world', { dur: 0.3, gain: 0.6, type: 'lowpass', freq: 800 });
        break;
      case 'keeper_die':
        this.tone('creatures', { freq: 200, freqEnd: 30, dur: 2, gain: 0.5, type: 'sawtooth', attack: 0.02 });
        this.noiseBurst('creatures', { dur: 1.6, gain: 0.4, type: 'lowpass', freq: 1200, freqEnd: 100 });
        break;
      case 'drone_alert':
        this.tone('creatures', { freq: 880, freqEnd: 1320, dur: 0.18, gain: 0.08 * v, type: 'square', pan });
        this.tone('creatures', { freq: 1320, dur: 0.12, gain: 0.06 * v, type: 'square', delay: 0.2, pan });
        break;
      case 'drone_lock':
        // rising lock-on tone: the audible warning before every bolt
        this.tone('creatures', { freq: 400, freqEnd: 1600, dur: 0.7, gain: 0.1 * v, type: 'sawtooth', attack: 0.05, pan });
        break;
      case 'drone_fire':
        this.tone('creatures', { freq: 900, freqEnd: 180, dur: 0.3, gain: 0.18 * v, type: 'square', pan });
        this.noiseBurst('creatures', { dur: 0.15, gain: 0.2 * v, type: 'bandpass', freq: 1800, q: 2, pan });
        break;
      case 'drone_die':
        this.tone('creatures', { freq: 1200, freqEnd: 60, dur: 0.9, gain: 0.2 * v, type: 'sawtooth', pan });
        this.noiseBurst('world', { dur: 0.5, gain: 0.35, type: 'lowpass', freq: 1400, delay: 0.6 });
        break;
      case 'vent_tell':
        this.noiseBurst('world', { dur: 0.8, gain: 0.12, type: 'bandpass', freq: 2000, q: 3, attack: 0.5 });
        break;
      case 'vent_burst':
        if (!this.gate(cue, 0.1)) return;
        this.noiseBurst('world', { dur: 0.45, gain: 0.35, type: 'highpass', freq: 1500 });
        break;
      case 'footstep_hard':
      case 'footstep_wet':
      case 'footstep_wood':
      case 'footstep_metal':
      case 'footstep_gravel': {
        const f = { footstep_hard: 900, footstep_wet: 1300, footstep_wood: 500, footstep_metal: 2200, footstep_gravel: 1700 }[cue];
        this.noiseBurst('world', { dur: cue === 'footstep_wet' ? 0.09 : 0.05, gain: 0.07, type: 'bandpass', freq: f * (0.9 + Math.random() * 0.2), q: cue === 'footstep_metal' ? 6 : 1.5 });
        if (cue === 'footstep_metal') this.tone('world', { freq: 600 + Math.random() * 80, dur: 0.08, gain: 0.02, type: 'triangle' });
        break;
      }
      case 'dodge':
        this.noiseBurst('world', { dur: 0.18, gain: 0.18, type: 'bandpass', freq: 700, freqEnd: 1800, q: 1 });
        break;
      case 'dodge_reject':
        this.tone('ui', { freq: 160, dur: 0.06, gain: 0.08, type: 'square' });
        break;
      case 'hurt':
        this.tone('world', { freq: 220, freqEnd: 110, dur: 0.18, gain: 0.25, type: 'triangle' });
        this.noiseBurst('world', { dur: 0.08, gain: 0.3, type: 'lowpass', freq: 900 });
        break;
      case 'heal_start':
        this.noiseBurst('ui', { dur: 1.1, gain: 0.06, type: 'bandpass', freq: 3000, q: 1, attack: 0.3 });
        break;
      case 'heal_done':
        this.tone('ui', { freq: 523, dur: 0.15, gain: 0.08 });
        this.tone('ui', { freq: 784, dur: 0.25, gain: 0.08, delay: 0.1 });
        break;
      case 'pickup':
        this.tone('ui', { freq: 880, dur: 0.07, gain: 0.08, type: 'triangle' });
        this.tone('ui', { freq: 1320, dur: 0.1, gain: 0.07, type: 'triangle', delay: 0.06 });
        break;
      case 'pickup_weapon':
        this.noiseBurst('weapons', { dur: 0.06, gain: 0.3, type: 'bandpass', freq: 1800, q: 4 });
        this.noiseBurst('weapons', { dur: 0.08, gain: 0.3, type: 'bandpass', freq: 1200, q: 4, delay: 0.12 });
        break;
      case 'interact':
        this.noiseBurst('ui', { dur: 0.06, gain: 0.15, type: 'bandpass', freq: 1400, q: 3 });
        break;
      case 'locked':
        this.tone('ui', { freq: 140, dur: 0.12, gain: 0.12, type: 'square' });
        break;
      case 'door':
        this.noiseBurst('world', { dur: 0.3, gain: 0.2, type: 'lowpass', freq: 500, attack: 0.02 });
        break;
      case 'hatch':
        this.tone('world', { freq: 180, freqEnd: 90, dur: 0.6, gain: 0.15, type: 'sawtooth' });
        this.noiseBurst('world', { dur: 0.5, gain: 0.25, type: 'lowpass', freq: 600 });
        break;
      case 'tide_bell':
        this.tone('world', { freq: 392, dur: 1.8, gain: 0.12, type: 'sine', attack: 0.005 });
        this.tone('world', { freq: 784.6, dur: 1.2, gain: 0.05, type: 'sine', attack: 0.005 });
        this.tone('world', { freq: 392, dur: 1.8, gain: 0.1, type: 'sine', attack: 0.005, delay: 0.9 });
        break;
      case 'tide_wash':
        this.noiseBurst('world', { dur: 1.4, gain: 0.25, type: 'lowpass', freq: 700, freqEnd: 200, attack: 0.2 });
        break;
      case 'chime':
        // station public address: two falling notes before every announcement
        this.tone('ui', { freq: 587, dur: 0.45, gain: 0.07, type: 'triangle', attack: 0.01 });
        this.tone('ui', { freq: 440, dur: 0.7, gain: 0.07, type: 'triangle', attack: 0.01, delay: 0.4 });
        break;
      case 'lever':
        this.tone('world', { freq: 90, freqEnd: 60, dur: 0.4, gain: 0.2, type: 'square' });
        this.noiseBurst('world', { dur: 0.25, gain: 0.2, type: 'highpass', freq: 1500, delay: 0.3 });
        break;
      case 'relay_tones':
        // the recurring three-tone relay motif
        this.tone('ui', { freq: 659, dur: 0.5, gain: 0.12, type: 'sine', attack: 0.02 });
        this.tone('ui', { freq: 523, dur: 0.5, gain: 0.12, type: 'sine', delay: 0.45 });
        this.tone('ui', { freq: 784, dur: 0.9, gain: 0.12, type: 'sine', delay: 0.9 });
        break;
      case 'discover':
        this.tone('ui', { freq: 392, dur: 0.7, gain: 0.06, type: 'sine', attack: 0.1 });
        this.tone('ui', { freq: 587, dur: 1.0, gain: 0.05, type: 'sine', attack: 0.1, delay: 0.25 });
        break;
      case 'lamp_on':
        this.noiseBurst('world', { dur: 0.04, gain: 0.25, type: 'highpass', freq: 3000 });
        this.tone('world', { freq: 100, dur: 0.6, gain: 0.05, type: 'sawtooth', attack: 0.1 });
        break;
      case 'fan_on':
        this.tone('world', { freq: 40, freqEnd: 110, dur: 1.6, gain: 0.2, type: 'sawtooth', attack: 0.3 });
        break;
      case 'lift':
        this.tone('world', { freq: 80, freqEnd: 60, dur: 1.4, gain: 0.25, type: 'sawtooth', attack: 0.2 });
        this.tone('ui', { freq: 988, dur: 0.4, gain: 0.07, delay: 1.2 });
        break;
      case 'intercom':
        if (!this.gate(cue, 1.6)) return;
        for (let i = 0; i < 2; i++) this.tone('ui', { freq: 740, dur: 0.18, gain: 0.08 * v, type: 'square', delay: i * 0.3 });
        break;
      case 'radio':
        this.noiseBurst('ui', { dur: 0.3, gain: 0.06, type: 'bandpass', freq: 2000, q: 1 });
        break;
      case 'death':
        this.tone('world', { freq: 300, freqEnd: 60, dur: 1.4, gain: 0.25, type: 'sine' });
        break;
      case 'ui_click':
        this.tone('ui', { freq: 1200, dur: 0.04, gain: 0.05, type: 'square' });
        break;
      case 'ui_back':
        this.tone('ui', { freq: 700, dur: 0.05, gain: 0.05, type: 'square' });
        break;
      case 'save':
        this.tone('ui', { freq: 660, dur: 0.12, gain: 0.04 });
        break;
    }
  }

  // ------------------------------------------------------------ ambience beds
  setAmbience(id: AmbienceId | null): void {
    if (!this.ctx || id === this.currentAmbience) return;
    this.stopAmbience();
    this.currentAmbience = id;
    if (!id || !this.noise) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.5);
    out.connect(this.buses.ambience!);
    this.ambienceGain = out;
    const loop = (type: BiquadFilterType, freq: number, gain: number, q = 0.7): void => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(out);
      src.start();
      this.ambienceNodes.push(src, f, g);
    };
    const hum = (freq: number, gain: number): void => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq * 3;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(f).connect(g).connect(out);
      o.start();
      this.ambienceNodes.push(o, f, g);
    };
    switch (id) {
      case 'rain':
        loop('highpass', 2500, 0.16);
        loop('bandpass', 900, 0.1, 0.4);
        loop('lowpass', 200, 0.12);
        break;
      case 'room':
        loop('lowpass', 300, 0.05);
        hum(50, 0.025);
        loop('highpass', 4000, 0.012); // rain beyond the window
        break;
      case 'tunnel':
        loop('lowpass', 140, 0.2);
        loop('bandpass', 600, 0.025, 2);
        hum(41, 0.02);
        this.startDrips(2.5);
        break;
      case 'gallery':
        loop('lowpass', 180, 0.18);
        hum(55, 0.05);
        hum(82.5, 0.02);
        loop('bandpass', 1200, 0.02, 3);
        this.startDrips(3.5);
        break;
      case 'pipeworks':
        loop('lowpass', 120, 0.22);
        hum(36.7, 0.06);
        loop('bandpass', 2600, 0.015, 5);
        break;
      case 'station':
        // a big tiled hall: low air movement, a distant tunnel draught, fluorescent buzz
        loop('lowpass', 110, 0.18);
        loop('bandpass', 380, 0.04, 0.5);
        hum(100, 0.012);
        this.startDrips(5);
        break;
      case 'sea':
        // an enclosed sea: slow surf, wide and soft, with the cavern's low resonance
        loop('lowpass', 420, 0.2, 0.3);
        loop('bandpass', 1400, 0.03, 0.3);
        hum(30.9, 0.03);
        this.startDrips(4);
        break;
    }
  }

  setAmbienceIntensity(k: number): void {
    if (this.ambienceGain && this.ctx) this.ambienceGain.gain.setTargetAtTime(Math.max(0.05, k), this.ctx.currentTime, 0.4);
  }

  private startDrips(every: number): void {
    const tick = (): void => {
      if (!this.ctx) return;
      const pan = Math.random() * 1.6 - 0.8;
      this.tone('ambience', { freq: 1400 + Math.random() * 1400, freqEnd: 700, dur: 0.12, gain: 0.03, type: 'sine', pan });
      this.dripTimer = window.setTimeout(tick, (every * (0.4 + Math.random())) * 1000);
    };
    this.dripTimer = window.setTimeout(tick, 800);
  }

  private stopAmbience(): void {
    if (this.dripTimer !== null) clearTimeout(this.dripTimer);
    this.dripTimer = null;
    for (const n of this.ambienceNodes) {
      try {
        if (n instanceof AudioScheduledSourceNode) n.stop();
        n.disconnect();
      } catch {
        // already stopped
      }
    }
    this.ambienceNodes = [];
    this.ambienceGain?.disconnect();
    this.ambienceGain = null;
    this.currentAmbience = null;
  }
}
