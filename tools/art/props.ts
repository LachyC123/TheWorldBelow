import { Raster } from './raster.ts';
import { P } from './palette.ts';
import type { Frame } from './pack.ts';

const R = (w: number, h: number): Raster => new Raster(w, h);
const done = (r: Raster): Raster => r.outline(P.ink);

// ---------------- home
function intercom(on: boolean): Raster {
  const r = R(12, 14);
  r.rect(1, 1, 10, 12, P.bone[1]).rect(1, 1, 10, 1, P.bone[3]).rect(10, 1, 1, 12, P.bone[0]);
  for (let y = 3; y < 8; y += 2) r.hline(3, 8, y, P.slate[2]);
  r.rect(3, 9, 3, 2, P.slate[3]);
  r.rect(7, 9, 2, 2, on ? P.verm[3] : P.verm[0]);
  return done(r);
}
function tableLamp(): Raster {
  const r = R(32, 26);
  r.rect(2, 12, 28, 8, P.wood[3]).hline(2, 29, 12, P.wood[4]).rect(2, 18, 28, 2, P.wood[1]);
  r.rect(4, 20, 2, 6, P.wood[1]).rect(26, 20, 2, 6, P.wood[1]);
  // lamp
  r.rect(21, 7, 2, 6, P.slate[3]).rect(18, 2, 8, 6, P.amber[3]).hline(18, 25, 2, P.amber[4]).hline(17, 26, 7, P.amber[2]);
  // the note
  r.rect(7, 13, 7, 5, P.paper[3]).hline(8, 12, 14, P.slate[3]).hline(8, 11, 16, P.slate[3]);
  r.rect(15, 14, 3, 3, P.slate[1]); // mug
  return done(r);
}
function bed(): Raster {
  const r = R(24, 36);
  r.rect(1, 2, 22, 32, P.wood[2]).rect(1, 2, 22, 3, P.wood[4]);
  r.rect(3, 5, 18, 7, P.bone[2]).hline(3, 20, 5, P.bone[3]);
  r.rect(2, 12, 20, 20, '#3a4d63').hline(2, 21, 12, '#4f6884');
  for (let y = 15; y < 31; y += 4) r.hline(3, 20, y, '#33445a');
  return done(r);
}
function bookshelf(): Raster {
  const r = R(32, 30);
  r.rect(0, 0, 32, 30, P.wood[1]).rect(1, 1, 30, 28, P.wood[0]);
  const cols = [P.verm[1], P.teal[3], P.amber[2], P.bone[1], P.mint[1], P.wood[3]];
  for (let s = 0; s < 3; s++) {
    const y = 2 + s * 9;
    r.hline(1, 30, y + 8, P.wood[3]);
    let x = 2;
    let k = s * 2;
    while (x < 29) {
      const w = 2 + (k % 2);
      const h = 5 + ((k * 3) % 3);
      r.rect(x, y + 8 - h, w, h, cols[k % cols.length]!);
      x += w + (k % 4 === 0 ? 1 : 0);
      k++;
    }
  }
  return done(r);
}
function armchair(): Raster {
  const r = R(18, 18);
  r.rect(1, 2, 16, 10, '#5a2e34').rect(1, 2, 16, 2, '#7a4048');
  r.rect(0, 7, 4, 9, '#4a242a').rect(14, 7, 4, 9, '#4a242a');
  r.rect(3, 10, 12, 6, '#6a363e');
  return done(r);
}
function door(kind: 'wood' | 'glass' | 'metal', open: boolean): Raster {
  const r = R(16, 16);
  if (open) {
    r.rect(0, 0, 16, 16, P.void);
    r.rect(0, 0, 2, 16, kind === 'wood' ? P.wood[1] : P.slate[2]);
    r.rect(14, 0, 2, 16, kind === 'wood' ? P.wood[1] : P.slate[2]);
    r.rect(2, 0, 12, 2, kind === 'wood' ? P.wood[0] : P.slate[1]);
    return r;
  }
  if (kind === 'wood') {
    r.rect(1, 0, 14, 16, P.wood[3]).rect(3, 2, 10, 5, P.wood[2]).rect(3, 9, 10, 5, P.wood[2]).px(12, 8, P.amber[4]);
  } else if (kind === 'glass') {
    r.rect(1, 0, 14, 16, P.slate[3]).rect(3, 2, 10, 11, P.teal[3]).line(4, 11, 9, 3, P.teal[5]).px(12, 8, P.bone[3]);
  } else {
    r.rect(1, 0, 14, 16, P.slate[3]).hline(1, 14, 0, P.slate[5]);
    for (let y = 3; y < 15; y += 4) r.hline(2, 13, y, P.slate[2]);
    r.rect(6, 6, 4, 3, P.amber[3]);
  }
  r.rect(0, 0, 1, 16, P.ink).rect(15, 0, 1, 16, P.ink);
  return r;
}

// ---------------- street
function streetLamp(): Raster {
  const r = R(14, 48);
  r.rect(6, 6, 2, 40, P.slate[2]).vline(6, 6, 45, P.slate[4]);
  r.rect(4, 44, 6, 4, P.slate[1]);
  r.rect(2, 2, 10, 5, P.slate[1]).rect(3, 6, 8, 2, P.amber[4]).hline(3, 10, 2, P.slate[3]);
  return done(r);
}
function windowLit(lit: boolean, curtain: number): Raster {
  const r = R(16, 14);
  r.rect(1, 1, 14, 12, P.slate[1]);
  r.rect(2, 2, 12, 10, lit ? P.amber[3] : P.slate[0]);
  if (lit) {
    r.rect(2, 2, 12, 3, P.amber[4]);
    if (curtain === 1) r.rect(2, 2, 4, 10, P.amber[1]).rect(10, 2, 4, 10, P.amber[1]);
    if (curtain === 2) { r.rect(8, 6, 3, 6, P.amber[1]); r.ellipse(9.5, 5, 1.6, 1.6, P.amber[1]); } // silhouette
  } else r.line(3, 10, 8, 3, P.slate[2]);
  r.vline(8, 2, 11, P.slate[1]).hline(2, 13, 7, P.slate[1]);
  r.rect(0, 12, 16, 2, P.bone[0]);
  return r;
}
function laundretteSign(): Raster {
  const r = R(56, 14);
  r.rect(0, 0, 56, 14, P.slate[0]).rect(1, 1, 54, 12, P.teal[1]);
  // pixel lettering "LAUNDRETTE" (3x5 glyphs)
  const G: Record<string, string[]> = {
    L: ['100', '100', '100', '100', '111'], A: ['010', '101', '111', '101', '101'], U: ['101', '101', '101', '101', '111'],
    N: ['101', '111', '111', '111', '101'], D: ['110', '101', '101', '101', '110'], R: ['110', '101', '110', '101', '101'],
    E: ['111', '100', '110', '100', '111'], T: ['111', '010', '010', '010', '010'],
  };
  let x = 4;
  for (const ch of 'LAUNDRETTE') {
    const g = G[ch]!;
    g.forEach((row, j) => [...row].forEach((b, i) => b === '1' && r.px(x + i, 5 + j, P.mint[4])));
    x += 5;
  }
  return r;
}
function car(): Raster {
  const r = R(48, 28);
  r.ellipse(24, 24, 22, 3, [0, 0, 0, 90]);
  r.rect(2, 10, 44, 12, '#3b4a5e').rect(2, 10, 44, 2, '#55698a');
  r.rect(10, 3, 26, 9, '#334055').rect(12, 4, 10, 7, P.teal[2]).rect(24, 4, 10, 7, P.teal[2]);
  r.line(13, 9, 17, 5, P.teal[4]);
  r.rect(4, 20, 9, 6, P.ink).rect(35, 20, 9, 6, P.ink).rect(6, 21, 5, 4, P.slate[3]).rect(37, 21, 5, 4, P.slate[3]);
  r.rect(43, 13, 3, 3, P.amber[4]).rect(2, 13, 2, 3, P.verm[2]);
  return done(r);
}
function bin(): Raster {
  const r = R(12, 16);
  r.rect(1, 3, 10, 12, P.teal[1]).rect(0, 1, 12, 3, P.teal[2]).hline(0, 11, 1, P.teal[3]);
  for (let x = 3; x < 10; x += 3) r.vline(x, 5, 13, P.teal[0]);
  return done(r);
}
function fence(): Raster {
  const r = R(16, 16);
  r.hline(0, 15, 4, P.wood[2]).hline(0, 15, 10, P.wood[2]);
  for (let x = 1; x < 16; x += 5) r.rect(x, 1, 3, 15, P.wood[3]).hline(x, x + 2, 1, P.wood[4]);
  return done(r);
}
function tinTarget(knocked: boolean): Raster {
  const r = R(10, 10);
  if (knocked) { r.rect(1, 6, 7, 3, P.slate[4]).hline(1, 7, 6, P.bone[2]).rect(2, 7, 3, 1, P.verm[2]); }
  else { r.rect(2, 1, 6, 8, P.slate[4]).vline(2, 1, 8, P.bone[2]).rect(2, 3, 6, 3, P.verm[2]); }
  return done(r);
}
function crate(): Raster {
  const r = R(16, 16);
  r.rect(0, 0, 16, 16, P.wood[3]).rect(0, 0, 16, 2, P.wood[4]).rect(0, 14, 16, 2, P.wood[1]);
  r.line(1, 13, 14, 2, P.wood[2]).vline(0, 0, 15, P.wood[1]).vline(15, 0, 15, P.wood[1]);
  return done(r);
}
function bench(): Raster {
  const r = R(28, 14);
  r.rect(0, 3, 28, 3, P.wood[3]).rect(0, 7, 28, 3, P.wood[2]).rect(2, 10, 2, 4, P.slate[2]).rect(24, 10, 2, 4, P.slate[2]);
  return done(r);
}

// ---------------- laundrette
function washer(f: number, dryer = false): Raster {
  const r = R(16, 22);
  r.rect(0, 0, 16, 22, dryer ? P.bone[1] : P.bone[2]).rect(0, 0, 16, 4, P.bone[1]).hline(0, 15, 0, P.bone[3]);
  r.rect(2, 1, 4, 2, P.slate[2]).px(11, 2, f % 2 ? P.mint[3] : P.mint[1]).px(13, 2, P.amber[3]);
  r.ellipse(8, 12.5, 6, 6, P.slate[2]);
  r.ellipse(8, 12.5, 4.5, 4.5, dryer ? P.slate[1] : P.water[2]);
  // tumbling laundry
  const a = (f / 3) * Math.PI * 2;
  r.ellipse(8 + Math.cos(a) * 2, 12.5 + Math.sin(a) * 2, 1.8, 1.4, dryer ? P.amber[2] : P.bone[2]);
  r.ellipse(8 - Math.cos(a) * 2, 12.5 - Math.sin(a) * 2, 1.4, 1.2, P.verm[1]);
  r.px(6, 10, P.bone[3]);
  r.rect(0, 20, 16, 2, P.slate[1]);
  return done(r);
}
function counter(): Raster {
  const r = R(32, 18);
  r.rect(0, 0, 32, 18, P.teal[2]).rect(0, 0, 32, 4, P.bone[2]).hline(0, 31, 0, P.bone[3]);
  for (let x = 4; x < 32; x += 8) r.vline(x, 5, 16, P.teal[1]);
  r.rect(22, 1, 6, 3, P.slate[2]).px(23, 2, P.mint[3]); // till
  return done(r);
}
function shelf(): Raster {
  const r = R(32, 22);
  r.rect(0, 0, 32, 22, P.wood[1]).rect(1, 1, 30, 20, P.wood[0]);
  r.hline(1, 30, 10, P.wood[3]).hline(1, 30, 20, P.wood[3]);
  const cols = [P.verm[2], P.mint[3], P.amber[3], P.teal[4]];
  for (let i = 0; i < 6; i++) r.rect(2 + i * 5, 4, 4, 6, cols[i % 4]!).hline(2 + i * 5, 5 + i * 5, 4, P.bone[3]);
  r.rect(4, 13, 9, 7, P.paper[3]).hline(5, 11, 15, P.slate[2]).hline(5, 9, 17, P.slate[2]); // the clue card
  r.rect(18, 14, 5, 6, P.mint[2]).rect(25, 13, 5, 7, P.bone[1]);
  return done(r);
}
function hatch(open: boolean): Raster {
  const r = R(16, 16);
  if (open) {
    r.rect(1, 1, 14, 14, P.void).rect(1, 1, 14, 2, P.slate[2]);
    for (let y = 4; y < 15; y += 3) r.hline(4, 11, y, P.rust[3]);
    r.vline(4, 3, 15, P.rust[2]).vline(11, 3, 15, P.rust[2]);
  } else {
    r.rect(1, 1, 14, 14, P.slate[3]).rect(1, 1, 14, 1, P.slate[5]);
    for (let x = 3; x < 14; x += 3) r.vline(x, 2, 13, P.slate[2]);
    r.rect(6, 6, 4, 3, P.rust[3]);
  }
  r.outline(P.slate[1]);
  return r;
}

// ---------------- service / gallery
function refugeLamp(on: boolean): Raster {
  const r = R(12, 28);
  r.rect(5, 8, 2, 18, P.slate[2]).rect(3, 25, 6, 3, P.slate[1]);
  r.rect(2, 2, 8, 7, P.slate[2]).rect(3, 3, 6, 5, on ? P.amber[4] : P.slate[0]).hline(2, 9, 2, P.slate[4]);
  if (on) r.px(4, 4, P.amber[5]);
  return done(r);
}
function relayCabinet(on: boolean, f: number): Raster {
  const r = R(24, 32);
  r.rect(1, 0, 22, 30, P.slate[2]).rect(1, 0, 22, 2, P.slate[4]).rect(21, 0, 2, 30, P.slate[1]);
  r.rect(3, 3, 18, 10, P.slate[0]);
  for (let i = 0; i < 6; i++) r.px(5 + i * 3, 5, on ? ((i + f) % 3 ? P.mint[4] : P.amber[4]) : P.slate[2]);
  r.rect(5, 8, 14, 3, on ? P.mint[1] : P.slate[1]);
  if (on) for (let x = 5; x < 19; x++) r.px(x, 9 + Math.round(Math.sin((x + f * 2) * 0.9)), P.mint[4]);
  r.rect(4, 16, 7, 11, P.slate[3]).rect(13, 16, 7, 11, P.slate[3]);
  r.rect(6, 18, 3, 3, on ? P.mint[3] : P.verm[1]).rect(15, 18, 3, 3, on ? P.mint[3] : P.slate[1]);
  r.line(7, 27, 7, 31, P.ink).line(16, 27, 18, 31, P.ink); // cables
  return done(r);
}
function pump(f: number): Raster {
  const r = R(32, 38);
  r.rect(2, 14, 28, 22, P.teal[2]).rect(2, 14, 28, 3, P.teal[4]).rect(27, 14, 3, 22, P.teal[1]);
  r.rect(0, 32, 32, 6, P.slate[1]).hline(0, 31, 32, P.slate[3]);
  const py = [0, 2, 4, 2][f % 4]!;
  r.rect(12, 2 + py, 8, 13 - py, P.slate[4]).vline(12, 2 + py, 14, P.slate[5]).rect(10, 1 + py, 12, 3, P.slate[2]);
  r.ellipse(9, 24, 4, 4, P.slate[1]).ellipse(9, 24, 2, 2, P.mint[f % 2 ? 3 : 2]);
  r.rect(17, 20, 9, 6, P.slate[0]);
  for (let x = 18; x < 25; x += 2) r.vline(x, 21, 24, f % 2 ? P.amber[3] : P.amber[2]);
  r.px(4, 18, P.mint[2]).px(25, 18, P.mint[2]);
  return done(r);
}
function fan(f: number): Raster {
  const r = R(32, 32);
  r.rect(0, 0, 32, 32, P.slate[2]).rect(1, 1, 30, 30, P.slate[1]);
  r.ellipse(16, 16, 13, 13, P.void);
  for (let b = 0; b < 4; b++) {
    const a = (b / 4) * Math.PI * 2 + (f / 4) * (Math.PI / 2);
    for (let t = 2; t < 12; t++) {
      const x = 16 + Math.cos(a) * t;
      const y = 16 + Math.sin(a) * t;
      r.px(x, y, P.slate[4]).px(x + Math.cos(a + 1.57), y + Math.sin(a + 1.57), P.slate[3]);
    }
  }
  r.ellipse(16, 16, 2.5, 2.5, P.mint[2]);
  for (let y = 4; y < 29; y += 4) r.hline(4, 27, y, [140, 160, 170, 70]); // guard bars
  return done(r);
}
function panel(state: 'closed' | 'rattle' | 'open'): Raster {
  const r = R(16, 16);
  if (state === 'open') {
    r.rect(1, 1, 14, 14, P.void).rect(1, 1, 14, 2, P.slate[2]);
    r.rect(0, 2, 2, 13, P.slate[3]); // swung plate
  } else {
    const o = state === 'rattle' ? 1 : 0;
    r.rect(1 + o, 1, 14, 14, P.slate[3]).hline(1 + o, 14 + o, 1, P.slate[5]);
    for (let y = 4; y < 13; y += 2) r.hline(3 + o, 12 + o, y, P.slate[1]);
    r.px(2 + o, 2, P.bone[1]).px(13 + o, 2, P.bone[1]).px(2 + o, 13, P.bone[1]).px(13 + o, 13, P.bone[1]);
  }
  return done(r);
}
function diagram(): Raster {
  const r = R(16, 16);
  r.rect(1, 1, 14, 14, P.paper[2]).rect(1, 1, 14, 2, P.paper[1]);
  r.ellipse(5, 9, 2.5, 2.5, P.teal[3]); // fan
  r.line(7, 9, 12, 9, P.teal[3]).px(11, 8, P.teal[3]).px(11, 10, P.teal[3]); // airflow arrow
  r.rect(12, 6, 2, 7, P.verm[1]); // hidden gallery behind wall
  r.hline(3, 12, 4, P.slate[3]);
  return done(r);
}
function liftDoor(f: number): Raster {
  const r = R(32, 32);
  r.rect(0, 0, 32, 32, P.slate[2]).rect(0, 0, 32, 3, P.slate[4]);
  r.rect(3, 4, 26, 28, P.void);
  const gap = [0, 4, 9, 13][f]!;
  r.rect(3, 4, 13 - gap, 28, P.slate[3]).rect(16 + gap, 4, 13 - gap, 28, P.slate[3]);
  r.vline(15 - gap, 4, 31, P.slate[1]).vline(16 + gap, 4, 31, P.slate[5]);
  if (f === 3) r.rect(5, 6, 22, 24, '#2a2416').hline(5, 26, 6, P.amber[3]);
  for (let x = 4; x < 28; x += 6) r.px(x, 1, P.amber[3]);
  return done(r);
}
function liftPanel(on: boolean): Raster {
  const r = R(8, 12);
  r.rect(0, 0, 8, 12, P.slate[3]).rect(2, 2, 4, 3, on ? P.mint[4] : P.verm[1]).rect(2, 7, 4, 3, P.slate[1]).px(3, 8, on ? P.amber[4] : P.slate[2]);
  return done(r);
}
function locker(): Raster {
  const r = R(16, 30);
  r.rect(0, 0, 16, 30, P.teal[2]).vline(8, 1, 29, P.teal[0]).hline(0, 15, 0, P.teal[4]);
  for (let y = 3; y < 9; y += 2) r.hline(2, 6, y, P.teal[0]).hline(10, 14, y, P.teal[0]);
  r.px(6, 15, P.bone[2]).px(10, 15, P.bone[2]);
  return done(r);
}
function workbench(): Raster {
  const r = R(32, 22);
  r.rect(0, 6, 32, 6, P.wood[3]).hline(0, 31, 6, P.wood[4]).rect(2, 12, 3, 10, P.slate[2]).rect(27, 12, 3, 10, P.slate[2]);
  r.rect(4, 2, 8, 4, P.slate[3]).rect(15, 3, 6, 3, P.amber[2]).rect(24, 1, 3, 5, P.mint[2]);
  r.hline(3, 28, 17, P.slate[1]);
  return done(r);
}
function wheel(f: number): Raster {
  const c = new Raster(16, 16);
  c.ellipse(8, 8, 7, 7, P.verm[2]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const dx = x + 0.5 - 8, dy = y + 0.5 - 8; if (dx * dx + dy * dy < 25) c.px(x, y, null); }
  for (let s = 0; s < 3; s++) {
    const a = (s / 3) * Math.PI * 2 + f * (Math.PI / 6);
    c.line(8, 8, 8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, P.verm[2]);
  }
  c.ellipse(8, 8, 1.8, 1.8, P.slate[4]);
  return done(c);
}
function vent(state: number): Raster {
  const r = R(16, 16);
  r.rect(1, 1, 14, 14, P.slate[1]).rect(2, 2, 12, 12, P.void);
  const glow = [P.slate[2], P.amber[2], P.amber[4]][state]!;
  for (let y = 3; y < 13; y += 3) r.hline(3, 12, y, glow);
  return r.outline(P.slate[0]);
}
function railing(): Raster {
  const r = R(16, 10);
  r.hline(0, 15, 1, P.mint[2]).hline(0, 15, 2, P.mint[1]);
  for (let x = 1; x < 16; x += 4) r.vline(x, 3, 9, P.mint[1]);
  return r;
}
function bigPipe(): Raster {
  const r = R(64, 22);
  r.rect(0, 3, 64, 16, P.rust[2]).rect(0, 3, 64, 4, P.rust[4]).rect(0, 15, 64, 4, P.rust[1]);
  for (let x = 8; x < 64; x += 20) r.rect(x, 1, 4, 20, P.slate[3]).vline(x, 1, 20, P.slate[5]);
  return done(r);
}
function valve(): Raster {
  const r = R(12, 12);
  r.rect(4, 6, 4, 6, P.slate[3]).ellipse(6, 4, 5, 3, P.verm[2]).ellipse(6, 4, 2, 1, P.slate[2]);
  return done(r);
}
function poster(kind: number): Raster {
  const r = R(12, 14);
  r.rect(0, 0, 12, 14, kind === 0 ? P.paper[2] : P.mint[1]);
  if (kind === 0) { r.rect(2, 2, 8, 5, P.verm[1]); r.hline(2, 9, 9, P.slate[2]).hline(2, 7, 11, P.slate[2]); }
  else { r.ellipse(6, 6, 3, 3, P.mint[4]); r.hline(2, 9, 11, P.mint[3]); }
  return done(r);
}

// ---------------- pickups
function pickup(kind: string): Raster {
  const r = R(14, 12);
  switch (kind) {
    case 'pistol': r.rect(1, 3, 12, 7, P.slate[1]).hline(1, 12, 3, P.slate[3]).rect(3, 5, 7, 2, P.slate[4]).rect(4, 7, 2, 2, P.wood[2]); break;
    case 'shotgun': r.rect(0, 5, 14, 2, P.slate[3]).rect(0, 7, 6, 3, P.wood[2]).rect(7, 7, 4, 2, P.wood[3]); break;
    case 'light_rounds': r.rect(2, 4, 10, 7, P.amber[1]).rect(2, 4, 10, 2, P.amber[2]); for (let x = 3; x < 12; x += 2) r.vline(x, 1, 4, P.amber[4]); break;
    case 'shells': r.rect(2, 4, 10, 7, P.verm[1]).rect(2, 4, 10, 2, P.verm[2]); for (let x = 3; x < 12; x += 3) r.rect(x, 1, 2, 4, P.verm[3]); break;
    case 'bandage': r.rect(2, 3, 10, 7, P.bone[3]).rect(6, 4, 2, 5, P.verm[2]).rect(4, 6, 6, 1, P.verm[2]); break;
    case 'torch_lens': r.ellipse(7, 6, 5, 5, P.slate[3]).ellipse(7, 6, 3.5, 3.5, P.mint[4]).px(5, 4, P.mint[5]); break;
    case 'note': r.rect(2, 2, 10, 8, P.paper[3]).hline(3, 10, 4, P.slate[3]).hline(3, 8, 6, P.slate[3]); break;
    case 'cache': r.rect(2, 2, 10, 9, P.wood[2]).rect(2, 2, 10, 3, P.wood[3]).px(7, 6, P.amber[4]).rect(5, 8, 4, 2, P.mint[3]); break;
  }
  return done(r);
}

export function propFrames(): Frame[] {
  const f: Frame[] = [];
  const add = (name: string, img: Raster, pivotY = 1): void => void f.push({ name, img, pivotY });
  add('intercom_0', intercom(false)); add('intercom_1', intercom(true));
  add('table_lamp', tableLamp()); add('bed', bed()); add('bookshelf', bookshelf()); add('armchair', armchair());
  for (const k of ['wood', 'glass', 'metal'] as const) { add(`door_${k}_closed`, door(k, false)); add(`door_${k}_open`, door(k, true)); }
  add('street_lamp', streetLamp());
  add('window_lit_0', windowLit(true, 0)); add('window_lit_1', windowLit(true, 1)); add('window_lit_2', windowLit(true, 2)); add('window_dark', windowLit(false, 0));
  add('laundrette_sign', laundretteSign()); add('car', car()); add('bin', bin()); add('fence', fence()); add('crate', crate()); add('bench', bench());
  add('tin_target_up', tinTarget(false)); add('tin_target_down', tinTarget(true));
  for (let i = 0; i < 3; i++) { add(`washer_${i}`, washer(i)); add(`dryer_${i}`, washer(i, true)); }
  add('counter', counter()); add('shelf', shelf()); add('hatch_closed', hatch(false)); add('hatch_open', hatch(true));
  add('refuge_lamp_off', refugeLamp(false)); add('refuge_lamp_on', refugeLamp(true));
  add('relay_off', relayCabinet(false, 0)); for (let i = 0; i < 3; i++) add(`relay_on_${i}`, relayCabinet(true, i));
  for (let i = 0; i < 4; i++) add(`pump_${i}`, pump(i));
  for (let i = 0; i < 4; i++) add(`fan_${i}`, fan(i));
  add('panel_closed', panel('closed')); add('panel_rattle', panel('rattle')); add('panel_open', panel('open'));
  add('diagram', diagram());
  for (let i = 0; i < 4; i++) add(`lift_door_${i}`, liftDoor(i));
  add('lift_panel_off', liftPanel(false)); add('lift_panel_on', liftPanel(true));
  add('locker', locker()); add('workbench', workbench());
  for (let i = 0; i < 4; i++) add(`wheel_${i}`, wheel(i));
  for (let i = 0; i < 3; i++) add(`vent_${i}`, vent(i));
  add('railing', railing()); add('big_pipe', bigPipe()); add('valve', valve()); add('poster_0', poster(0)); add('poster_1', poster(1));
  for (const k of ['pistol', 'shotgun', 'light_rounds', 'shells', 'bandage', 'torch_lens', 'note', 'cache']) add(`pickup_${k}`, pickup(k));
  return f;
}
