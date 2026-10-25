import { Raster } from './raster.ts';
import { P } from './palette.ts';
import type { Frame } from './pack.ts';

function flash(size: number, f: number, spread: number): Raster {
  const r = new Raster(size, size);
  const c = size / 2;
  const len = c * [1, 0.8, 0.45][f]!;
  // star-shaped muzzle bloom pointing +x
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
    const dx = i + 0.5 - 2;
    const dy = j + 0.5 - c;
    if (dx < 0) continue;
    const cone = Math.abs(dy) <= (dx / len) * c * spread * 0.6 + (dx < 3 ? 2 : 0);
    if (dx <= len && cone) {
      const t = dx / len;
      r.px(i, j, t < 0.35 ? P.amber[5] : t < 0.7 ? P.amber[4] : P.amber[3]);
    }
  }
  if (f < 2) r.ellipse(3, c, 2.5, 2.5, P.bone[3]);
  return r;
}

function soft(size: number): Raster {
  // Smooth radial falloff used by additive glows (intentionally not pixel-stepped).
  const r = new Raster(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / c;
    if (d < 1) {
      const a = Math.pow(1 - d, 2);
      r.px(x, y, [255, 255, 255, Math.round(a * 255)]);
    }
  }
  return r;
}

function puff(f: number, col: string): Raster {
  const r = new Raster(10, 10);
  const rad = [1.5, 2.8, 3.8, 4.4][f]!;
  const a = [255, 220, 150, 80][f]!;
  const h = col.replace('#', '');
  r.ellipse(5, 5, rad, rad, [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a]);
  if (f >= 2) r.ellipse(5, 5, rad - 1.5, rad - 1.5, null);
  return r;
}

function ripple(f: number): Raster {
  const r = new Raster(18, 10);
  const rx = 2 + f * 2;
  const ry = 1 + f;
  for (let t = 0; t < 64; t++) {
    const a = (t / 64) * Math.PI * 2;
    r.px(9 + Math.cos(a) * rx, 5 + Math.sin(a) * ry, [170, 210, 235, 200 - f * 45]);
  }
  return r;
}

function steam(f: number): Raster {
  const r = new Raster(16, 16);
  const a = [200, 170, 120, 60][f]!;
  r.ellipse(8, 9 - f, 3 + f, 3 + f * 0.7, [210, 220, 220, a]);
  r.ellipse(6, 8 - f, 2 + f * 0.5, 2, [240, 245, 245, a]);
  return r;
}

export function fxFrames(): Frame[] {
  const out: Frame[] = [];
  const add = (name: string, img: Raster, px = 0.5, py = 0.5): void => void out.push({ name, img, pivotX: px, pivotY: py });
  for (let i = 0; i < 3; i++) add(`muzzle_pistol_${i}`, flash(12, i, 0.9), 2 / 12, 0.5);
  for (let i = 0; i < 3; i++) add(`muzzle_shotgun_${i}`, flash(18, i, 1.6), 2 / 18, 0.5);
  const casing = new Raster(3, 2);
  casing.rect(0, 0, 3, 2, P.amber[3]).px(2, 0, P.amber[5]);
  add('casing', casing);
  const shell = new Raster(4, 2);
  shell.rect(0, 0, 3, 2, P.verm[2]).rect(3, 0, 1, 2, P.amber[3]);
  add('shell_case', shell);
  add('glow_64', soft(64));
  add('glow_16', soft(16));
  for (let i = 0; i < 4; i++) add(`dust_${i}`, puff(i, P.bone[1]));
  for (let i = 0; i < 4; i++) add(`ichor_${i}`, puff(i, P.ichor[3]));
  for (let i = 0; i < 4; i++) add(`ripple_${i}`, ripple(i));
  for (let i = 0; i < 4; i++) add(`steam_${i}`, steam(i));
  const shadow = new Raster(16, 6);
  shadow.ellipse(8, 3, 7.5, 2.6, [0, 0, 0, 110]);
  add('shadow', shadow);
  const bigShadow = new Raster(44, 10);
  bigShadow.ellipse(22, 5, 21, 4.5, [0, 0, 0, 120]);
  add('shadow_big', bigShadow);
  // target marker: four corner brackets (acquired target; distinct from manual reticle)
  for (let i = 0; i < 2; i++) {
    const m = new Raster(18, 18);
    const o = i;
    const c = P.verm[3];
    for (const [x, y, dx, dy] of [[o, o, 1, 1], [17 - o, o, -1, 1], [o, 17 - o, 1, -1], [17 - o, 17 - o, -1, -1]] as const) {
      m.px(x, y, c).px(x + dx, y, c).px(x + 2 * dx, y, c).px(x, y + dy, c).px(x, y + 2 * dy, c);
    }
    add(`target_${i}`, m);
  }
  const ret = new Raster(9, 9);
  ret.px(4, 0, P.bone[3]).px(4, 1, P.bone[3]).px(4, 7, P.bone[3]).px(4, 8, P.bone[3]).px(0, 4, P.bone[3]).px(1, 4, P.bone[3]).px(7, 4, P.bone[3]).px(8, 4, P.bone[3]).px(4, 4, P.verm[3]);
  add('reticle', ret);
  const bullet = new Raster(6, 2);
  bullet.rect(0, 0, 6, 2, P.amber[4]).rect(4, 0, 2, 2, P.amber[5]);
  add('tracer', bullet);
  const pellet = new Raster(3, 2);
  pellet.rect(0, 0, 3, 2, P.amber[4]);
  add('pellet', pellet);
  const jet = new Raster(8, 6);
  jet.ellipse(4, 3, 4, 2.5, [140, 200, 230, 230]).ellipse(3, 2.5, 2, 1, [230, 250, 255, 255]);
  add('jet', jet);
  const drop = new Raster(1, 4);
  drop.rect(0, 0, 1, 4, [170, 200, 230, 170]);
  add('rain', drop);
  const lint = new Raster(2, 2);
  lint.px(0, 0, P.bone[3]).px(1, 1, P.bone[2]);
  add('lint', lint);
  const spore = new Raster(1, 1);
  spore.px(0, 0, [210, 255, 230, 200]);
  add('mote', spore);
  return out;
}
