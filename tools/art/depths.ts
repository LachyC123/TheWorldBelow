// Art for the world-structure pass: Last Platform (Bracken Underground), the Tidal Platform
// and its underground sea, Edda's cellar, Orin Vale, Nemi and the lantern crabs.
import { Raster, rng, type Color } from './raster.ts';
import { P } from './palette.ts';
import type { Frame } from './pack.ts';

const R = (w: number, h: number): Raster => new Raster(w, h);
const done = (r: Raster): Raster => r.outline(P.ink);

// 3x5 pixel glyphs for signage (readable at 1x, never the only carrier of information)
const G: Record<string, string[]> = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
  K: ['101', '110', '100', '110', '101'], L: ['100', '100', '100', '100', '111'], M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'], O: ['111', '101', '101', '101', '111'], P: ['110', '101', '110', '100', '100'],
  R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'], V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'], '0': ['111', '101', '101', '101', '111'],
  '9': ['111', '101', '111', '001', '111'], '-': ['000', '000', '111', '000', '000'], ' ': ['000', '000', '000', '000', '000'],
};
function text(r: Raster, x: number, y: number, s: string, c: Color): number {
  for (const ch of s) {
    const g = G[ch] ?? G[' ']!;
    g.forEach((row, j) => [...row].forEach((b, i) => b === '1' && r.px(x + i, y + j, c)));
    x += 4;
  }
  return x;
}

// ---------------------------------------------------------------- station
function roundel(): Raster {
  const r = R(48, 18);
  r.ellipse(24, 9, 10, 8.5, P.verm[2]).ellipse(24, 9, 7, 5.6, '#cfc5a8');
  r.rect(4, 6, 40, 7, '#1f3a6a').hline(4, 43, 6, '#3a5a9a');
  text(r, 10, 7, 'BRACKEN', P.bone[3]);
  return done(r);
}
function departureBoard(live: boolean, f: number): Raster {
  const r = R(48, 22);
  r.rect(0, 2, 48, 18, P.slate[1]).rect(2, 4, 44, 14, '#0a0c10');
  r.vline(10, 0, 2, P.slate[3]).vline(38, 0, 2, P.slate[3]);
  const lit: Color = live ? P.amber[4] : '#3a3020';
  const dim: Color = live ? P.amber[2] : '#241e16';
  text(r, 4, 5, '0', lit);
  text(r, 10, 5, live ? 'TIDAL' : 'SUSPEND', live && f ? P.amber[5] : lit);
  text(r, 4, 12, '1', dim);
  text(r, 10, 12, 'BRACKEN', dim);
  if (!live && f) r.rect(8, 5, 2, 5, '#0a0c10');
  return done(r);
}
function liftZero(open: boolean): Raster {
  const r = R(32, 34);
  r.rect(0, 2, 32, 32, '#6a5a3a').rect(0, 2, 32, 3, '#9a8456');
  r.rect(3, 6, 26, 28, P.void);
  if (!open) {
    for (let x = 3; x < 29; x += 3) r.vline(x, 6, 33, x % 2 ? '#8a7448' : '#5a4a2e'); // brass lattice gate
    for (let y = 9; y < 33; y += 6) r.line(3, y, 28, y + 3, '#5a4a2e');
  } else r.rect(5, 8, 22, 24, '#1a2a30').hline(5, 26, 8, P.mint[3]);
  r.ellipse(16, 2, 5, 3, '#cfc5a8');
  text(r, 15, 0, '0', '#1f3a6a');
  return done(r);
}
function callPanel(live: boolean): Raster {
  const r = R(12, 16);
  r.rect(0, 0, 12, 16, P.slate[3]).rect(2, 2, 8, 4, live ? P.mint[4] : P.verm[1]);
  r.ellipse(6, 10, 2.5, 2.5, live ? P.amber[4] : P.slate[1]);
  r.hline(2, 9, 14, P.slate[1]);
  return done(r);
}
function entrance(open: boolean): Raster {
  const r = R(28, 32);
  r.rect(0, 4, 28, 28, '#cfc5a8');
  for (let y = 6; y < 32; y += 3) r.hline(0, 27, y, '#b8ae92');
  r.rect(0, 26, 28, 2, '#1f4a3a');
  r.rect(4, 8, 20, 24, P.void);
  r.ellipse(14, 8, 10, 4, P.void);
  if (open) {
    for (let y = 14; y < 32; y += 4) r.hline(5, 22, y, P.slate[1]); // stairs dropping away
  } else {
    for (const [y, a] of [[11, 1], [17, -1], [23, 1], [28, 0]] as const) r.line(3, y + a, 24, y - a, P.wood[2]).line(3, y + 1 + a, 24, y + 1 - a, P.wood[3]);
    r.px(5, 11, P.slate[4]).px(22, 17, P.slate[4]).px(6, 23, P.slate[4]);
  }
  r.ellipse(14, 2, 6, 3, P.verm[2]).rect(5, 1, 18, 3, '#1f3a6a');
  return done(r);
}
function networkMap(): Raster {
  const r = R(36, 24);
  r.rect(0, 0, 36, 24, P.paper[3]).rect(0, 0, 36, 2, P.wood[2]);
  r.line(3, 6, 32, 6, P.verm[2]).line(3, 7, 32, 7, P.verm[2]); // Bracken line
  r.line(18, 7, 18, 20, '#1f3a6a').line(19, 7, 19, 20, '#1f3a6a'); // platform 0 line, down
  r.line(19, 20, 33, 20, P.teal[3]); // the water
  for (let x = 6; x < 33; x += 8) r.ellipse(x, 6.5, 1.6, 1.6, P.bone[3]).px(x, 6, P.ink);
  r.ellipse(18.5, 20, 2, 2, P.bone[3]);
  for (let x = 24; x < 33; x += 3) r.px(x, 22, P.teal[3]); // dotted ferry line
  r.px(33, 18, P.amber[3]).px(34, 17, P.amber[3]);
  return done(r);
}
function ticketBarrier(): Raster {
  const r = R(16, 20);
  r.rect(1, 4, 5, 16, P.slate[3]).rect(10, 4, 5, 16, P.slate[3]).hline(1, 5, 4, P.slate[5]).hline(10, 14, 4, P.slate[5]);
  r.rect(6, 10, 4, 2, P.verm[2]);
  r.px(3, 7, P.mint[3]).px(12, 7, P.verm[2]);
  return done(r);
}
function leverBank(on: boolean): Raster {
  const r = R(40, 22);
  r.rect(0, 12, 40, 10, P.wood[2]).hline(0, 39, 12, P.wood[4]);
  for (let i = 0; i < 6; i++) {
    const x = 4 + i * 6;
    const up = on || i % 2 === 0;
    r.line(x, 14, x + (up ? -1 : 2), up ? 3 : 7, i === 3 ? P.verm[2] : P.slate[4]);
    r.rect(x - 1 + (up ? -1 : 2), up ? 2 : 6, 3, 2, i === 3 ? P.verm[3] : P.bone[2]);
  }
  return done(r);
}
function isolationLever(on: boolean): Raster {
  const r = R(14, 26);
  r.rect(2, 18, 10, 8, P.slate[2]).hline(2, 11, 18, P.slate[4]);
  if (on) r.line(7, 19, 3, 5, P.verm[2]).rect(1, 3, 4, 3, P.verm[3]);
  else r.line(7, 19, 11, 5, P.verm[2]).rect(9, 3, 4, 3, P.verm[3]);
  r.rect(4, 21, 6, 2, on ? P.mint[4] : P.verm[1]);
  return done(r);
}
function radioSet(f: number): Raster {
  const r = R(20, 16);
  r.rect(0, 3, 20, 13, P.wood[2]).rect(2, 5, 9, 7, P.slate[0]);
  for (let y = 6; y < 12; y += 2) r.hline(3, 10, y, P.slate[2]);
  r.rect(13, 5, 5, 3, f ? P.amber[4] : P.amber[2]).ellipse(15, 11, 2, 2, P.slate[3]);
  r.line(16, 3, 19, 0, P.slate[3]);
  return done(r);
}
function rotaBoard(): Raster {
  const r = R(20, 20);
  r.rect(0, 0, 20, 20, P.wood[1]).rect(1, 1, 18, 18, P.paper[3]);
  for (let y = 4; y < 18; y += 3) r.hline(3, 16, y, P.slate[3]);
  r.rect(3, 9, 6, 1, P.verm[2]); // one name underlined
  return done(r);
}
function staffDoor(open: boolean): Raster {
  const r = R(16, 16);
  if (open) {
    r.rect(0, 0, 16, 16, P.void).rect(0, 0, 2, 16, P.teal[2]).rect(14, 0, 2, 16, P.teal[2]);
    return r;
  }
  r.rect(1, 0, 14, 16, P.teal[2]).hline(1, 14, 0, P.teal[4]).rect(2, 3, 12, 5, P.bone[2]);
  text(r, 3, 3, 'STA', P.verm[1]);
  r.hline(3, 12, 11, P.teal[1]).hline(3, 12, 13, P.teal[1]);
  r.rect(0, 0, 1, 16, P.ink).rect(15, 0, 1, 16, P.ink);
  return r;
}
function maglock(on: boolean): Raster {
  const r = R(6, 6);
  r.rect(0, 0, 6, 6, P.slate[1]).rect(1, 1, 4, 4, on ? P.mint[4] : '#2a1010');
  if (on) r.px(2, 2, P.mint[5]);
  return r;
}
function chainedLadder(down: boolean): Raster {
  if (down) {
    const r = R(14, 40);
    r.vline(2, 0, 39, P.slate[4]).vline(11, 0, 39, P.slate[4]).vline(3, 0, 39, P.slate[2]).vline(12, 0, 39, P.slate[2]);
    for (let y = 3; y < 40; y += 5) r.hline(3, 11, y, P.slate[5]);
    return done(r);
  }
  const r = R(16, 14);
  r.rect(1, 6, 14, 6, P.slate[3]);
  for (let x = 3; x < 14; x += 3) r.vline(x, 6, 11, P.slate[5]);
  for (let i = 0; i < 6; i++) r.px(2 + i * 2, 2 + (i % 2), P.bone[1]); // the chain
  r.rect(13, 1, 3, 3, P.amber[2]);
  return done(r);
}
function signalLamp(f: number): Raster {
  const r = R(10, 22);
  r.rect(4, 8, 2, 14, P.slate[3]).rect(1, 0, 8, 10, P.slate[1]);
  r.ellipse(5, 3, 2, 2, f === 0 ? P.verm[3] : '#2a1010').ellipse(5, 7, 2, 2, f === 1 ? P.mint[4] : '#102a1a');
  return done(r);
}
function bench2(): Raster {
  const r = R(32, 14);
  r.rect(0, 3, 32, 3, '#1f4a3a').hline(0, 31, 3, '#2e6b56').rect(0, 7, 32, 3, '#1f4a3a');
  r.rect(2, 10, 2, 4, P.slate[2]).rect(28, 10, 2, 4, P.slate[2]);
  return done(r);
}

// ---------------------------------------------------------------- the sea
function tideGauge(level: number): Raster {
  const r = R(12, 44);
  r.rect(4, 0, 4, 44, P.wood[3]).vline(4, 0, 43, P.wood[4]);
  for (let y = 4; y < 40; y += 4) r.hline(5, 7, y, y % 12 === 4 ? P.verm[2] : P.bone[2]);
  // three painted bands: high, low, spring
  r.rect(8, 6, 3, 3, P.verm[2]).rect(8, 22, 3, 3, P.amber[3]).rect(8, 34, 3, 3, P.mint[3]);
  const wy = [8, 24, 36][level] ?? 8;
  r.rect(0, wy, 12, 44 - wy, [36, 82, 122, 170]).hline(0, 11, wy, P.water[5]);
  return done(r);
}
function tideBell(f: number): Raster {
  const r = R(20, 28);
  r.rect(1, 0, 18, 3, P.wood[2]).rect(1, 0, 2, 28, P.wood[2]).rect(17, 0, 2, 28, P.wood[2]);
  const sw = [0, -2, 2][f]!;
  r.vline(10, 3, 6, P.slate[3]);
  r.ellipse(10 + sw, 12, 5, 5, P.amber[2]).rect(5 + sw, 12, 11, 5, P.amber[2]).hline(4 + sw, 16 + sw, 17, P.amber[3]);
  r.vline(8 + sw, 9, 15, P.amber[4]);
  r.px(10 + sw * 2, 19, P.slate[4]);
  return done(r);
}
function buoy(f: number): Raster {
  const r = R(14, 22);
  const b = f % 2;
  r.ellipse(7, 18 + b, 6, 3, P.verm[1]).rect(2, 10 + b, 10, 8, P.verm[2]).rect(2, 13 + b, 10, 2, P.bone[2]);
  r.vline(7, 3 + b, 10 + b, P.slate[3]);
  r.ellipse(7, 3 + b, 2, 2, f < 2 ? P.amber[4] : P.amber[2]);
  r.hline(0, 13, 20, P.water[4]);
  return done(r);
}
function giantDoor(): Raster {
  const r = R(120, 104);
  // a door built for something forty times your height; you could not see its top from the shore
  r.rect(0, 0, 120, 104, '#1a2028');
  r.rect(8, 0, 104, 104, '#2a3240');
  for (let x = 10; x < 110; x += 12) r.vline(x, 0, 103, '#222a36');
  for (let y = 8; y < 104; y += 22) r.hline(8, 111, y, '#34405a');
  r.rect(56, 0, 8, 104, '#141820'); // the seam between the leaves
  for (let i = 0; i < 5; i++) r.rect(40 + i * 8, 40, 4, 12, '#4a5874'); // a hinge-bolt the size of a car
  r.ellipse(60, 46, 10, 10, P.mint[1]).ellipse(60, 46, 7, 7, '#1a2028').ellipse(60, 46, 3, 3, P.mint[3]);
  // the human-sized hatch cut into the bottom corner, much later, by hand
  r.rect(26, 84, 12, 20, P.wood[1]).rect(27, 85, 10, 19, P.wood[2]).px(35, 94, P.amber[4]);
  r.rect(25, 83, 14, 1, P.slate[4]);
  const rand = rng(41);
  r.speckle(8, 60, 104, 44, ['#3a5a4a', '#2a4a3a'], 0.08, rand);
  for (let i = 0; i < 12; i++) r.px(10 + Math.floor(rand() * 100), 70 + Math.floor(rand() * 30), P.mint[4]);
  return r.outline('#07080c');
}
function giantStep(): Raster {
  const r = R(64, 12);
  r.rect(0, 0, 64, 5, '#4a5468').hline(0, 63, 0, '#6a7890').rect(0, 5, 64, 7, '#1a1f2a');
  const rand = rng(9);
  r.speckle(0, 0, 64, 5, ['#3a4458', '#56627a'], 0.2, rand);
  for (let x = 0; x < 64; x += 16) r.vline(x, 0, 4, '#2a3040');
  return r;
}
function drownedCarriage(): Raster {
  const r = R(72, 30);
  r.rect(0, 4, 72, 18, '#2f4a4f').rect(0, 4, 72, 3, '#456a70');
  for (let x = 4; x < 68; x += 12) r.rect(x, 9, 8, 7, P.slate[0]).rect(x + 1, 10, 6, 5, P.teal[1]);
  r.hline(0, 71, 18, P.amber[1]);
  r.rect(0, 20, 72, 10, [36, 82, 122, 200]).hline(0, 71, 20, P.water[5]);
  r.px(13, 11, P.mint[4]).px(42, 12, P.mint[4]);
  return r.outline(P.ink);
}
function parcels(): Raster {
  const r = R(22, 18);
  r.rect(1, 8, 10, 9, P.paper[1]).rect(11, 10, 10, 7, P.paper[2]).rect(4, 2, 11, 7, P.paper[2]);
  r.vline(6, 8, 16, P.wood[1]).hline(1, 10, 12, P.wood[1]).vline(9, 2, 8, P.wood[1]).vline(16, 10, 16, P.wood[1]);
  r.rect(13, 12, 3, 2, P.verm[2]);
  return done(r);
}
function glowGrowth(f: number): Raster {
  const r = R(16, 16);
  for (let i = 0; i < 5; i++) {
    const x = 2 + i * 3;
    const h = 6 + ((i * 5) % 7);
    r.line(x, 15, x + (f && i % 2 ? 1 : 0), 15 - h, P.teal[3]);
    r.px(x + (f && i % 2 ? 1 : 0), 15 - h, P.mint[5]);
  }
  return r;
}
function stacksVista(f: number): Raster {
  // The Shoreward Stacks: a town of houses piled on houses, rising out of the far water.
  const r = R(208, 120);
  const rand = rng(1904);
  const towers: Array<[number, number, number]> = [[10, 46, 18], [30, 20, 26], [58, 6, 30], [92, 30, 22], [116, 12, 28], [148, 40, 20], [172, 26, 24], [194, 56, 12]];
  for (const [x, top, w] of towers) {
    for (let y = top; y < 108; y += 9) {
      const jog = Math.floor(rand() * 5) - 2;
      r.rect(x + jog, y, w, 9, rand() < 0.5 ? '#151b26' : '#1a2230');
      r.line(x + jog, y, x + jog + w / 2, y - 4, '#1e2838').line(x + jog + w / 2, y - 4, x + jog + w, y, '#1e2838');
      for (let wx = x + jog + 2; wx < x + jog + w - 2; wx += 4) if (rand() < 0.28) r.rect(wx, y + 3, 2, 3, rand() < 0.8 ? P.amber[3] : P.mint[3]);
    }
  }
  // a single moving light climbing between the stacks
  const path: Array<[number, number]> = [[64, 96], [70, 70], [76, 48], [100, 40]];
  const [lx, ly] = path[f % path.length]!;
  r.rect(lx, ly, 3, 3, P.bone[3]).px(lx + 1, ly - 1, P.amber[5]);
  // waterline reflections
  r.rect(0, 108, 208, 12, '#0a1626');
  for (let i = 0; i < 40; i++) r.hline(Math.floor(rand() * 200), Math.floor(rand() * 200) + 4, 110 + Math.floor(rand() * 9), rand() < 0.5 ? '#3a3020' : '#12304a');
  return r;
}

// ---------------------------------------------------------------- the cellar and home
function trapdoor(open: boolean): Raster {
  const r = R(16, 16);
  if (open) {
    r.rect(1, 1, 14, 14, P.void);
    for (let y = 4; y < 15; y += 3) r.hline(3, 12, y, P.wood[1]);
    r.rect(0, 0, 16, 2, P.wood[3]);
    return r;
  }
  r.rect(1, 1, 14, 14, P.wood[2]);
  for (let x = 1; x < 15; x += 4) r.vline(x, 1, 14, P.wood[1]);
  r.rect(6, 7, 4, 2, P.slate[3]);
  return r.outline(P.wood[0]);
}
function eddaDesk(): Raster {
  const r = R(36, 24);
  r.rect(0, 8, 36, 6, P.wood[3]).hline(0, 35, 8, P.wood[4]).rect(2, 14, 3, 10, P.wood[1]).rect(31, 14, 3, 10, P.wood[1]);
  r.rect(4, 4, 10, 5, P.paper[3]).rect(15, 2, 8, 7, P.slate[2]).rect(16, 3, 6, 4, P.amber[2]); // radio
  r.rect(26, 5, 6, 4, P.paper[2]).line(26, 7, 31, 6, P.teal[3]);
  return done(r);
}
function mapWall(): Raster {
  const r = R(48, 26);
  r.rect(0, 0, 48, 26, P.wood[1]);
  r.rect(2, 2, 18, 13, P.paper[3]).rect(22, 3, 14, 10, P.paper[2]).rect(38, 2, 8, 12, P.paper[3]).rect(8, 16, 22, 8, P.paper[2]);
  r.line(4, 6, 18, 6, P.verm[2]).line(11, 6, 11, 13, '#1f3a6a').line(24, 10, 34, 5, P.teal[3]).line(10, 20, 28, 20, P.teal[3]);
  r.line(19, 9, 39, 6, P.verm[3]).line(29, 19, 41, 9, P.verm[3]); // red string between pins
  for (const [x, y] of [[19, 9], [39, 6], [29, 19], [41, 9], [11, 13]] as const) r.px(x, y, P.bone[3]);
  return done(r);
}
function wineRack(): Raster {
  const r = R(24, 22);
  r.rect(0, 0, 24, 22, P.wood[1]);
  for (let y = 2; y < 20; y += 5) for (let x = 2; x < 22; x += 5) r.ellipse(x + 1.5, y + 1.5, 1.8, 1.8, (x + y) % 3 ? '#1a2a1a' : P.slate[1]);
  return done(r);
}
function cellarStair(): Raster {
  const r = R(16, 28);
  for (let i = 0; i < 6; i++) r.rect(1, i * 4 + 4, 14, 4, i % 2 ? P.wood[2] : P.wood[3]).hline(1, 14, i * 4 + 4, P.wood[4]);
  r.rect(0, 0, 16, 4, P.void);
  return done(r);
}

// ---------------------------------------------------------------- people and creatures
interface Npc { coat: Color; coatHi: Color; coatLo: Color; skin: Color; hair: Color; hat?: Color; lantern?: boolean }
function drawNpc(n: Npc, f: number, talk: boolean): Raster {
  const r = R(24, 32);
  const bob = f % 2;
  r.ellipse(12, 30, 6, 1.5, [0, 0, 0, 90]);
  r.rect(8, 23, 3, 7, P.coat[0]).rect(13, 23, 3, 7, P.coat[0]).rect(8, 29, 3, 2, P.wood[1]).rect(13, 29, 3, 2, P.wood[1]);
  r.rect(7, 12 + bob, 10, 13 - bob, n.coat).rect(7, 12 + bob, 2, 13 - bob, n.coatHi).rect(15, 12 + bob, 2, 13 - bob, n.coatLo);
  r.vline(12, 14 + bob, 24, n.coatLo);
  r.rect(5, 13 + bob, 2, 9, n.coat).rect(17, 13 + bob, 2, 9, n.coat);
  r.rect(5, 21 + bob, 2, 2, n.skin);
  if (talk) r.rect(17, 11 + bob, 2, 3, n.skin).rect(17, 13 + bob, 2, 6, n.coat);
  else r.rect(17, 21 + bob, 2, 2, n.skin);
  r.rect(8, 4 + bob, 8, 8, n.skin).rect(8, 4 + bob, 8, 2, n.hair).rect(8, 4 + bob, 1, 5, n.hair).rect(15, 4 + bob, 1, 4, n.hair);
  r.px(10, 7 + bob, P.ink).px(13, 7 + bob, P.ink);
  if (talk && f % 2) r.hline(11, 12, 10 + bob, P.skin[0]);
  if (n.hat) r.rect(7, 2 + bob, 10, 3, n.hat).hline(6, 17, 4 + bob, n.hat).px(11, 3 + bob, P.amber[4]);
  if (n.lantern) {
    r.vline(19, 20 + bob, 22 + bob, P.slate[3]);
    r.rect(18, 22 + bob, 4, 5, P.slate[2]).rect(19, 23 + bob, 2, 3, f % 2 ? P.amber[5] : P.amber[4]);
  }
  return done(r);
}
const ORIN: Npc = { coat: '#1f3a6a', coatHi: '#2f5290', coatLo: '#16294a', skin: P.skin[2], hair: P.bone[1], hat: '#16294a' };
const NEMI: Npc = { coat: '#8a6a1a', coatHi: '#b08a2a', coatLo: '#5a4410', skin: P.skin[1], hair: P.wood[0], lantern: true };

function crab(f: number): Raster {
  const r = R(12, 9);
  r.ellipse(6, 5, 4, 2.6, P.teal[3]).ellipse(6, 4.5, 2.5, 1.5, P.mint[4]);
  for (let i = 0; i < 3; i++) {
    const s = (f + i) % 2;
    r.px(1 + s, 5 + i % 2, P.teal[2]).px(10 - s, 5 + i % 2, P.teal[2]);
  }
  r.px(4, 2, P.mint[5]).px(8, 2, P.mint[5]);
  return done(r);
}

export function depthsProps(): Frame[] {
  const f: Frame[] = [];
  const add = (name: string, img: Raster, pivotY = 1): void => void f.push({ name, img, pivotY });
  add('station_roundel', roundel());
  for (let i = 0; i < 2; i++) { add(`board_dead_${i}`, departureBoard(false, i)); add(`board_live_${i}`, departureBoard(true, i)); }
  add('lift_zero_closed', liftZero(false)); add('lift_zero_open', liftZero(true));
  add('call_panel_dead', callPanel(false)); add('call_panel_live', callPanel(true));
  add('entrance_boarded', entrance(false)); add('entrance_open', entrance(true));
  add('network_map', networkMap()); add('ticket_barrier', ticketBarrier());
  add('lever_bank_off', leverBank(false)); add('lever_bank_on', leverBank(true));
  add('isolation_off', isolationLever(false)); add('isolation_on', isolationLever(true));
  for (let i = 0; i < 2; i++) add(`radio_set_${i}`, radioSet(i));
  add('rota_board', rotaBoard());
  add('staff_door_closed', staffDoor(false)); add('staff_door_open', staffDoor(true));
  add('maglock_off', maglock(false)); add('maglock_on', maglock(true));
  add('ladder_chained', chainedLadder(false)); add('ladder_down', chainedLadder(true));
  for (let i = 0; i < 2; i++) add(`signal_lamp_${i}`, signalLamp(i));
  add('platform_bench', bench2());
  for (let i = 0; i < 3; i++) add(`tide_gauge_${i}`, tideGauge(i));
  for (let i = 0; i < 3; i++) add(`tide_bell_${i}`, tideBell(i));
  for (let i = 0; i < 3; i++) add(`buoy_${i}`, buoy(i));
  add('giant_door', giantDoor()); add('giant_step', giantStep()); add('drowned_carriage', drownedCarriage());
  add('parcels', parcels());
  for (let i = 0; i < 2; i++) add(`glow_growth_${i}`, glowGrowth(i));
  for (let i = 0; i < 4; i++) add(`stacks_vista_${i}`, stacksVista(i));
  add('trapdoor_closed', trapdoor(false)); add('trapdoor_open', trapdoor(true));
  add('edda_desk', eddaDesk()); add('map_wall', mapWall()); add('wine_rack', wineRack()); add('cellar_stair', cellarStair());
  for (let i = 0; i < 2; i++) {
    add(`orin_idle_${i}`, drawNpc(ORIN, i, false));
    add(`orin_talk_${i}`, drawNpc(ORIN, i, true));
    add(`nemi_idle_${i}`, drawNpc(NEMI, i, false));
    add(`crab_${i}`, crab(i));
  }
  return f;
}
