// Art for the exploration pass: drone, secret/gate props, shortcuts, finds and landmark set pieces.
import { Raster, rng } from './raster.ts';
import { P } from './palette.ts';
import type { Frame } from './pack.ts';

const R = (w: number, h: number): Raster => new Raster(w, h);
const done = (r: Raster): Raster => r.outline(P.ink);

// ---------------------------------------------------------------- Watchman Drone
type DronePose = 'idle' | 'lock' | 'fire' | 'hit' | 'dead';
function drawDrone(pose: DronePose, f: number): Raster {
  const r = R(22, 18);
  if (pose === 'dead') {
    const d = R(22, 18);
    d.ellipse(11, 14, 7, 2.5, P.slate[1]).ellipse(11, 13, 5, 2, P.slate[2]);
    d.line(4, 14 - f, 2, 11 - f, P.slate[3]).line(18, 14, 21, 12 + (f % 2), P.slate[3]);
    if (f < 2) d.px(11, 12, P.amber[4]);
    return done(d);
  }
  // rotors
  const rot = f % 2 ? 1 : 0;
  r.hline(1 + rot, 8 - rot, 3, P.slate[4]).hline(13 + rot, 20 - rot, 3, P.slate[4]);
  r.vline(5, 3, 6, P.slate[2]).vline(16, 3, 6, P.slate[2]);
  // body: a battered municipal surveillance pod
  r.ellipse(11, 9, 7, 4.5, P.slate[3]);
  r.ellipse(10, 8, 5, 2.5, P.slate[4]);
  r.rect(5, 10, 12, 2, P.slate[2]);
  r.hline(6, 15, 7, P.amber[2]); // municipal stripe
  // lens: mint when sweeping, vermilion when locked
  const lens = pose === 'lock' || pose === 'fire' ? (f % 2 ? P.verm[3] : P.verm[4]) : P.mint[4];
  r.ellipse(11, 12.5, 2.6, 2.2, P.ink);
  r.ellipse(11, 12.5, 1.6, 1.4, lens);
  r.px(10, 12, P.bone[3]);
  if (pose === 'fire') r.ellipse(11, 15, 2, 1.5, P.verm[4]);
  // antenna
  r.vline(11, 2, 4, P.slate[2]).px(11, 1, pose === 'lock' ? P.verm[3] : P.mint[3]);
  if (pose === 'hit') r.map((_x, _y, c) => [Math.min(255, c[0] + 110), Math.min(255, c[1] + 110), Math.min(255, c[2] + 110), 255]);
  return done(r);
}

export function droneFrames(): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 2; i++) out.push({ name: `drone_idle_${i}`, img: drawDrone('idle', i) });
  for (let i = 0; i < 2; i++) out.push({ name: `drone_lock_${i}`, img: drawDrone('lock', i) });
  for (let i = 0; i < 2; i++) out.push({ name: `drone_fire_${i}`, img: drawDrone('fire', i) });
  out.push({ name: 'drone_hit_0', img: drawDrone('hit', 0) });
  for (let i = 0; i < 4; i++) out.push({ name: `drone_dead_${i}`, img: drawDrone('dead', i) });
  return out;
}

export function droneFx(): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 2; i++) {
    const b = R(9, 9);
    b.ellipse(4.5, 4.5, 4.5, 4.5, [255, 90, 60, 120]);
    b.ellipse(4.5, 4.5, 3, 3, P.verm[3]);
    b.ellipse(4.5, 4.5, 1.6 + i * 0.4, 1.6 + i * 0.4, P.verm[4]);
    b.px(4, 3, P.bone[3]);
    out.push({ name: `bolt_${i}`, img: b, pivotX: 0.5, pivotY: 0.5 });
  }
  const spark = R(5, 5);
  spark.line(0, 2, 4, 2, P.mint[5]).line(2, 0, 2, 4, P.mint[4]);
  out.push({ name: 'live_spark', img: spark, pivotX: 0.5, pivotY: 0.5 });
  return out;
}

// ---------------------------------------------------------------- secret walls, gates, shortcuts
function rubble(open: boolean, seed: number): Raster {
  const r = R(16, 16);
  const rand = rng(seed);
  if (open) {
    r.speckle(1, 10, 14, 5, [P.brick[2], P.brick[3], P.slate[3]], 0.35, rand);
    r.rect(2, 13, 3, 2, P.brick[3]).rect(10, 12, 4, 2, P.brick[2]);
    return r;
  }
  // loose, uneven brickwork: offset courses, gaps you can see light/air through
  r.rect(0, 0, 16, 16, P.brick[1]);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    let x = row % 2 ? -3 : 0;
    while (x < 16) {
      const w = 4 + Math.floor(rand() * 3);
      const tilt = rand() < 0.3 ? 1 : 0;
      r.rect(x + 1, y + tilt, w - 1, 3, rand() < 0.5 ? P.brick[3] : P.brick[2]);
      r.hline(x + 1, x + w - 1, y + tilt, P.brick[4]);
      x += w;
    }
  }
  r.line(4, 1, 7, 7, P.ink).line(7, 7, 6, 12, P.ink).line(11, 4, 13, 10, P.ink);
  r.px(8, 9, P.void).px(9, 9, P.void).px(12, 6, P.void);
  return r.outline(P.ink);
}

function junction(f: number, open: boolean): Raster {
  const r = R(16, 16);
  if (open) {
    r.rect(0, 0, 2, 16, P.slate[2]).rect(14, 0, 2, 16, P.slate[2]).rect(0, 14, 16, 2, P.slate[1]);
    return r;
  }
  r.rect(0, 0, 16, 16, P.slate[3]).hline(0, 15, 0, P.slate[5]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (y > 11 && (x + y) % 6 < 3) r.px(x, y, P.amber[3]);
  r.rect(4, 3, 8, 6, P.slate[1]);
  r.rect(5, 4, 6, 4, P.slate[0]);
  // live arc crawling over the terminals
  const pts = [[6, 6], [7, 4], [8, 7], [9, 5], [10, 6]];
  for (let i = 0; i < pts.length - 1; i++) if ((i + f) % 3 !== 0) r.line(pts[i]![0]!, pts[i]![1]!, pts[i + 1]![0]!, pts[i + 1]![1]!, f % 2 ? P.mint[5] : P.mint[4]);
  r.px(3, 10, P.verm[3]);
  return done(r);
}

function manhole(open: boolean): Raster {
  const r = R(16, 16);
  if (open) {
    r.ellipse(8, 8, 7, 6, P.slate[2]).ellipse(8, 8, 5.5, 4.5, P.void);
    r.hline(5, 11, 7, P.rust[3]).hline(5, 11, 10, P.rust[3]);
    r.rect(12, 2, 4, 3, P.slate[3]);
    return r;
  }
  r.ellipse(8, 8, 7, 6, P.slate[3]).ellipse(8, 8, 6, 5, P.slate[2]);
  for (let x = 4; x < 13; x += 2) r.vline(x, 5, 11, P.slate[1]);
  r.hline(4, 12, 8, P.slate[4]);
  return r.outline(P.slate[1]);
}

function ladderUp(): Raster {
  const r = R(16, 20);
  r.rect(3, 0, 10, 20, P.void);
  r.vline(4, 0, 19, P.rust[3]).vline(11, 0, 19, P.rust[3]);
  for (let y = 2; y < 20; y += 4) r.hline(4, 11, y, P.rust[4]);
  r.rect(2, 0, 12, 2, P.slate[3]);
  return done(r);
}

function surveyMap(): Raster {
  const r = R(16, 14);
  r.rect(0, 0, 16, 14, P.wood[2]);
  r.rect(1, 1, 14, 12, P.paper[2]);
  r.line(3, 10, 6, 5, P.teal[3]).line(6, 5, 10, 8, P.teal[3]).line(10, 8, 13, 3, P.teal[3]);
  r.rect(3, 3, 2, 2, P.verm[2]).px(12, 10, P.amber[2]).px(8, 11, P.amber[2]);
  return done(r);
}

function pickupArt(kind: string): Raster {
  const r = R(14, 12);
  switch (kind) {
    case 'curio':
      r.rect(3, 4, 8, 7, P.amber[1]).rect(3, 4, 8, 2, P.amber[3]).px(7, 7, P.amber[5]).rect(5, 2, 4, 2, P.bone[2]);
      break;
    case 'tonic':
      r.rect(5, 1, 4, 2, P.bone[1]).rect(4, 3, 6, 8, P.verm[1]).rect(5, 4, 4, 6, P.verm[2]).px(6, 5, P.verm[4]).rect(5, 7, 4, 2, P.bone[2]);
      break;
    case 'upgrade':
      r.rect(2, 4, 10, 6, P.slate[2]).rect(3, 5, 8, 4, P.slate[4]).rect(6, 2, 2, 3, P.mint[3]).px(4, 6, P.mint[4]).px(9, 6, P.mint[4]);
      break;
    case 'gloves':
      r.rect(2, 4, 4, 7, P.amber[2]).rect(8, 4, 4, 7, P.amber[2]).rect(2, 2, 1, 3, P.amber[3]).rect(4, 2, 1, 3, P.amber[3]).rect(8, 2, 1, 3, P.amber[3]).rect(10, 2, 1, 3, P.amber[3]).hline(2, 5, 9, P.ink).hline(8, 11, 9, P.ink);
      break;
    case 'map':
      r.rect(2, 3, 10, 8, P.paper[2]).line(3, 9, 6, 5, P.teal[3]).line(6, 5, 10, 7, P.teal[3]).px(4, 4, P.verm[2]);
      break;
  }
  return done(r);
}

// ---------------------------------------------------------------- landmark set pieces
function pew(): Raster {
  const r = R(32, 14);
  r.rect(0, 2, 32, 4, P.wood[2]).hline(0, 31, 2, P.wood[4]).rect(0, 7, 32, 3, P.wood[3]).rect(1, 10, 2, 4, P.wood[1]).rect(29, 10, 2, 4, P.wood[1]);
  return done(r);
}
function carriage(): Raster {
  const r = R(64, 34);
  r.rect(0, 6, 64, 24, '#2f4a4f').rect(0, 6, 64, 3, '#456a70').rect(0, 26, 64, 4, P.slate[1]);
  for (let x = 4; x < 60; x += 12) {
    r.rect(x, 11, 8, 8, P.slate[0]);
    r.rect(x + 1, 12, 6, 6, x % 24 === 4 ? P.amber[2] : P.teal[1]);
  }
  r.hline(0, 63, 21, P.amber[2]);
  r.rect(6, 30, 8, 4, P.ink).rect(50, 30, 8, 4, P.ink);
  r.line(20, 6, 26, 0, P.slate[2]).line(26, 0, 40, 0, P.slate[2]);
  return done(r);
}
function roots(): Raster {
  const r = R(32, 30);
  const rand = rng(77);
  for (let i = 0; i < 6; i++) {
    let x = 8 + rand() * 16;
    let y = 0;
    for (let s = 0; s < 30; s++) {
      x += rand() * 2 - 1;
      y += 1;
      r.rect(x, y, 3 - Math.floor(s / 12), 1, s % 5 ? P.wood[2] : P.wood[3]);
    }
  }
  r.ellipse(16, 27, 12, 3, P.wood[1]);
  r.px(12, 20, P.mint[4]).px(20, 14, P.mint[4]).px(17, 24, P.mint[3]);
  return done(r);
}
function switchboard(f: number): Raster {
  const r = R(32, 32);
  r.rect(0, 2, 32, 30, P.wood[1]).rect(2, 4, 28, 20, P.slate[0]);
  for (let y = 6; y < 22; y += 4) for (let x = 4; x < 29; x += 4) r.px(x, y, (x + y + f * 4) % 12 === 0 ? P.amber[4] : P.slate[3]);
  r.rect(2, 24, 28, 6, P.wood[2]);
  r.line(6, 26, 14, 10, P.verm[2]).line(18, 26, 10, 14, P.mint[2]).line(24, 27, 26, 8, P.amber[2]);
  return done(r);
}
function bigFan(f: number): Raster {
  const r = R(48, 48);
  r.ellipse(24, 24, 23, 23, P.slate[2]).ellipse(24, 24, 20, 20, P.void);
  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2 + (f / 4) * (Math.PI * 2 / 5);
    for (let t = 3; t < 19; t++) r.ellipse(24 + Math.cos(a) * t, 24 + Math.sin(a) * t, 1.6, 1.6, t < 10 ? P.slate[4] : P.slate[3]);
  }
  r.ellipse(24, 24, 4, 4, P.rust[3]).ellipse(24, 24, 2, 2, P.amber[3]);
  for (let y = 6; y < 44; y += 5) r.hline(4, 44, y, [160, 170, 180, 50]);
  return done(r);
}
function boiler(f: number): Raster {
  const r = R(32, 36);
  r.ellipse(16, 18, 14, 16, P.rust[2]).ellipse(14, 14, 9, 10, P.rust[3]);
  r.rect(10, 22, 12, 8, P.ink).rect(11, 23, 10, 6, f % 2 ? P.amber[3] : P.amber[2]);
  for (let x = 11; x < 21; x += 2) r.vline(x, 23, 28, P.amber[4]);
  r.rect(14, 0, 4, 4, P.slate[3]);
  return done(r);
}
function candle(f: number): Raster {
  const r = R(6, 10);
  r.rect(2, 4, 2, 6, P.bone[2]).px(2 + (f % 2), 2, P.amber[4]).px(2, 3, P.amber[5]);
  return r;
}
function shelfJunk(): Raster {
  const r = R(16, 20);
  r.rect(0, 0, 16, 20, P.slate[1]).hline(0, 15, 6, P.slate[3]).hline(0, 15, 13, P.slate[3]);
  r.rect(2, 2, 3, 4, P.amber[2]).rect(7, 3, 4, 3, P.teal[3]).rect(3, 9, 5, 4, P.paper[2]).rect(10, 15, 4, 4, P.verm[1]);
  return done(r);
}
function pipeStack(): Raster {
  const r = R(16, 24);
  for (let i = 0; i < 3; i++) r.rect(1 + i * 5, 0, 4, 24, i % 2 ? P.rust[2] : P.slate[3]).vline(1 + i * 5, 0, 23, i % 2 ? P.rust[4] : P.slate[5]);
  r.rect(0, 8, 16, 3, P.slate[2]);
  return done(r);
}
function puddleProp(): Raster {
  const r = R(24, 10);
  r.ellipse(12, 5, 11, 4, P.water[2]).ellipse(12, 5, 9, 3, P.water[3]).hline(6, 10, 4, P.water[5]);
  return r;
}

export function discoveryProps(): Frame[] {
  const f: Frame[] = [];
  const add = (name: string, img: Raster, pivotY = 1): void => void f.push({ name, img, pivotY });
  add('rubble_wall', rubble(false, 3));
  add('rubble_wall_b', rubble(false, 11));
  add('rubble_open', rubble(true, 5));
  for (let i = 0; i < 3; i++) add(`junction_${i}`, junction(i, false));
  add('junction_open', junction(0, true));
  add('manhole_closed', manhole(false));
  add('manhole_open', manhole(true));
  add('ladder_up', ladderUp());
  add('survey_map', surveyMap());
  for (const k of ['curio', 'tonic', 'upgrade', 'gloves', 'map']) add(`pickup_${k}`, pickupArt(k));
  add('pew', pew());
  add('carriage', carriage());
  add('roots', roots());
  for (let i = 0; i < 2; i++) add(`switchboard_${i}`, switchboard(i));
  for (let i = 0; i < 4; i++) add(`big_fan_${i}`, bigFan(i));
  for (let i = 0; i < 2; i++) add(`boiler_${i}`, boiler(i));
  for (let i = 0; i < 2; i++) add(`candle_${i}`, candle(i));
  add('shelf_junk', shelfJunk());
  add('pipe_stack', pipeStack());
  add('puddle_prop', puddleProp());
  return f;
}
