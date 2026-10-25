// 16x16 UI icon set (docs/design/docs/05 icon grammar). Exported individually for crisp DOM use.
import { Raster } from './raster.ts';
import { P } from './palette.ts';

const W = P.bone[3];
const D = P.bone[1];

function icon(draw: (r: Raster) => void): Raster {
  const r = new Raster(16, 16);
  draw(r);
  return r.outline(P.ink);
}

export const ICONS: Record<string, Raster> = {
  hand: icon((r) => { r.rect(4, 7, 8, 7, W); for (let i = 0; i < 4; i++) r.rect(4 + i * 2, 2 + (i === 0 || i === 3 ? 2 : 0), 2, 6, W); r.rect(1, 8, 3, 2, W); r.vline(6, 4, 8, D).vline(8, 3, 8, D).vline(10, 4, 8, D); }),
  magazine: icon((r) => { r.rect(5, 2, 6, 12, W).rect(6, 3, 4, 2, P.amber[3]).hline(6, 9, 7, D).hline(6, 9, 10, D); }),
  bandage: icon((r) => { r.rect(2, 5, 12, 6, W).rect(6, 5, 4, 6, D).rect(7, 6, 2, 4, P.verm[2]); }),
  map: icon((r) => { r.rect(2, 3, 4, 11, W).rect(6, 2, 4, 11, D).rect(10, 3, 4, 11, W).px(11, 6, P.verm[2]).px(12, 7, P.verm[2]); }),
  torch: icon((r) => { r.rect(2, 6, 7, 4, W).rect(9, 5, 3, 6, D); for (let i = 0; i < 3; i++) r.px(13 + (i % 2), 4 + i * 4, P.amber[4]); r.px(14, 8, P.amber[4]); }),
  dodge: icon((r) => { r.ellipse(10, 8, 3, 4.5, W); r.hline(1, 5, 5, D).hline(2, 6, 8, D).hline(1, 5, 11, D); }),
  padlock: icon((r) => { r.rect(3, 7, 10, 7, W).rect(5, 3, 2, 5, D).rect(9, 3, 2, 5, D).hline(5, 10, 2, D).rect(7, 9, 2, 3, P.ink); }),
  power: icon((r) => { r.rect(2, 7, 4, 2, W).rect(10, 7, 4, 2, W).line(6, 9, 9, 6, P.verm[3]); }),
  wave: icon((r) => { for (let x = 1; x < 15; x++) { r.px(x, 6 + Math.round(Math.sin(x * 0.9) * 2), P.water[5]); r.px(x, 11 + Math.round(Math.sin(x * 0.9 + 1) * 2), P.water[4]); } }),
  ear: icon((r) => { r.ellipse(6, 8, 4, 6, W).ellipse(6, 8, 2, 3.5, D); r.vline(12, 5, 10, P.mint[3]).vline(14, 3, 12, P.mint[2]); }),
  pause: icon((r) => { r.rect(4, 3, 3, 10, W).rect(9, 3, 3, 10, W); }),
  pistol: icon((r) => { r.rect(2, 5, 11, 3, W).rect(3, 8, 3, 5, D).px(12, 5, P.slate[3]); }),
  shotgun: icon((r) => { r.rect(1, 6, 14, 2, W).rect(1, 8, 5, 3, D).rect(8, 8, 4, 2, D); }),
  journal: icon((r) => { r.rect(3, 2, 10, 12, P.amber[2]).rect(4, 3, 8, 10, W).hline(5, 10, 5, D).hline(5, 10, 7, D).hline(5, 9, 9, D); }),
  gear: icon((r) => { r.ellipse(8, 8, 5, 5, W).ellipse(8, 8, 2, 2, P.ink); for (const [x, y] of [[7, 1], [7, 13], [1, 7], [13, 7]] as const) r.rect(x, y, 2, 2, W); }),
  heart: icon((r) => { r.ellipse(5.5, 6, 3, 3, P.verm[2]).ellipse(10.5, 6, 3, 3, P.verm[2]); for (let y = 6; y < 14; y++) r.hline(3 + (y - 6), 13 - (y - 6), y, P.verm[2]); r.px(4, 5, P.verm[4]); }),
  fire: icon((r) => { r.ellipse(8, 8, 6, 6, P.verm[2]).ellipse(8, 8, 3, 3, P.amber[4]); r.hline(1, 3, 8, W).hline(13, 15, 8, W).vline(8, 0, 2, W).vline(8, 13, 15, W); }),
  swap: icon((r) => { r.hline(3, 12, 5, W).px(11, 4, W).px(11, 6, W).hline(3, 12, 11, W).px(4, 10, W).px(4, 12, W); }),
  close: icon((r) => { r.line(3, 3, 12, 12, W).line(12, 3, 3, 12, W).line(4, 3, 12, 11, W).line(11, 3, 3, 11, W); }),
};
