import { Raster, rng, type Color } from './raster.ts';
import { P } from './palette.ts';
import { Floor, WallStyle, TILESET_COLUMNS, TILESET_ROWS, wallFrontIndex, wallTopIndex, type WallStyleId } from '../../src/content/tiles.ts';

const T = 16;

function tile(): Raster {
  return new Raster(T, T);
}

function asphalt(seed: number, wet: boolean): Raster {
  const r = tile();
  const rand = rng(seed);
  r.rect(0, 0, T, T, P.slate[1]);
  r.speckle(0, 0, T, T, [P.slate[0], P.slate[2]], 0.22, rand);
  r.speckle(0, 0, T, T, [P.slate[3]], 0.03, rand);
  if (wet) {
    // thin wet sheen streaks catching window light
    for (let i = 0; i < 3; i++) {
      const y = Math.floor(rand() * 15);
      const x = Math.floor(rand() * 10);
      r.hline(x, x + 2 + Math.floor(rand() * 4), y, P.teal[2]);
    }
  }
  return r;
}

function sidewalk(seed: number): Raster {
  const r = tile();
  const rand = rng(seed);
  r.rect(0, 0, T, T, P.slate[3]);
  r.speckle(0, 0, T, T, [P.slate[2], P.slate[4]], 0.15, rand);
  // slab joints
  r.hline(0, 15, 0, P.slate[2]);
  r.vline(0, 0, 15, P.slate[2]);
  r.vline(8, 8, 15, P.slate[2]);
  r.hline(0, 15, 8, P.slate[2]);
  r.hline(1, 15, 1, P.slate[4]);
  return r;
}

function wood(seed: number): Raster {
  const r = tile();
  const rand = rng(seed);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const base = row % 2 ? P.wood[2] : P.wood[3];
    r.rect(0, y, T, 4, base);
    r.hline(0, 15, y + 3, P.wood[1]);
    r.hline(0, 15, y, P.wood[4]);
    const seam = Math.floor(rand() * 14) + 1;
    r.vline(seam, y, y + 2, P.wood[1]);
    if (rand() < 0.5) r.px(Math.floor(rand() * 16), y + 1, P.wood[1]);
  }
  return r;
}

function checker(alt: boolean): Raster {
  const r = tile();
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const a = (Math.floor(x / 8) + Math.floor(y / 8) + (alt ? 1 : 0)) % 2 === 0;
      r.px(x, y, a ? P.tileW[1] : P.teal[2]);
    }
  r.hline(0, 15, 0, P.tileW[1]);
  r.vline(0, 0, 15, P.tileW[1]);
  r.hline(0, 15, 8, P.tileW[1]);
  r.vline(8, 0, 15, P.tileW[1]);
  r.px(2, 2, P.tileW[3]).px(10, 10, P.tileW[3]);
  return r;
}

function concrete(seed: number, stain = false): Raster {
  const r = tile();
  const rand = rng(seed);
  r.rect(0, 0, T, T, P.slate[2]);
  r.speckle(0, 0, T, T, [P.slate[1], P.slate[3]], 0.18, rand);
  if (stain) {
    r.ellipse(8, 9, 5, 3, [20, 40, 36, 150]);
    r.ellipse(7, 9, 3, 2, [10, 30, 30, 120]);
  }
  if (rand() < 0.6) {
    const x = Math.floor(rand() * 12);
    r.line(x, 3, x + 3, 7, P.slate[1]);
  }
  return r;
}

function grate(): Raster {
  const r = tile();
  r.rect(0, 0, T, T, P.void);
  for (let x = 1; x < T; x += 3) r.vline(x, 0, 15, P.slate[3]);
  r.hline(0, 15, 0, P.slate[4]);
  r.hline(0, 15, 15, P.slate[1]);
  r.hline(0, 15, 7, P.slate[2]);
  return r;
}

function metal(seed: number, dark = false): Raster {
  const r = tile();
  const rand = rng(seed);
  const base = dark ? P.slate[1] : P.teal[2];
  r.rect(0, 0, T, T, base);
  r.hline(0, 15, 0, dark ? P.slate[2] : P.teal[3]);
  r.vline(0, 0, 15, dark ? P.slate[2] : P.teal[3]);
  r.hline(0, 15, 15, P.teal[0]);
  r.vline(15, 0, 15, P.teal[0]);
  // tread pattern
  for (let y = 3; y < 14; y += 4) for (let x = 3; x < 14; x += 4) r.px(x, y, dark ? P.slate[3] : P.teal[4]).px(x + 1, y + 1, P.teal[1]);
  r.px(1, 1, P.mint[2]).px(14, 1, P.mint[2]).px(1, 14, P.mint[1]).px(14, 14, P.mint[1]);
  if (rand() < 0.5) r.speckle(2, 2, 12, 12, [P.rust[2]], 0.04, rand);
  return r;
}

function hazard(): Raster {
  const r = metal(41);
  for (let x = 0; x < T; x++) for (let y = 12; y < T; y++) r.px(x, y, (x + y) % 6 < 3 ? P.amber[3] : P.ink);
  return r;
}

function water(edge: boolean, seed: number): Raster {
  const r = tile();
  const rand = rng(seed);
  r.rect(0, 0, T, T, P.water[1]);
  r.speckle(0, 0, T, T, [P.water[2]], 0.12, rand);
  for (let i = 0; i < 3; i++) {
    const y = 3 + Math.floor(rand() * 11);
    const x = Math.floor(rand() * 10);
    r.hline(x, x + 3, y, P.water[3]);
  }
  if (edge) {
    r.rect(0, 0, T, 3, P.slate[2]);
    r.hline(0, 15, 0, P.slate[4]);
    r.hline(0, 15, 3, P.water[0]);
    r.hline(0, 15, 4, P.water[4]);
  }
  return r;
}

function stairs(): Raster {
  const r = tile();
  for (let i = 0; i < 4; i++) {
    const y = i * 4;
    const shade = [P.slate[4], P.slate[3], P.slate[2], P.slate[1]][i]!;
    r.rect(0, y, T, 4, shade);
    r.hline(0, 15, y, P.slate[5 - i] ?? P.slate[1]);
    r.hline(0, 15, y + 3, P.ink);
  }
  r.vline(0, 0, 15, P.ink).vline(15, 0, 15, P.ink);
  return r;
}

function curb(seed: number): Raster {
  const r = sidewalk(seed);
  r.rect(0, 12, T, 4, P.slate[2]);
  r.hline(0, 15, 12, P.slate[5]);
  r.hline(0, 15, 13, P.slate[4]);
  r.hline(0, 15, 15, P.ink);
  return r;
}

function gravel(seed: number): Raster {
  const r = tile();
  const rand = rng(seed);
  r.rect(0, 0, T, T, P.slate[2]);
  r.speckle(0, 0, T, T, [P.slate[1], P.slate[3], P.slate[4], P.wood[1]], 0.45, rand);
  return r;
}

function lino(): Raster {
  const r = tile();
  r.rect(0, 0, T, T, '#3c4a3e');
  for (let y = 0; y < T; y += 4) r.hline(0, 15, y, '#334036');
  r.px(4, 6, '#4a5a4c').px(11, 13, '#4a5a4c');
  return r;
}

function rustFloor(seed: number): Raster {
  const r = tile();
  const rand = rng(seed);
  r.rect(0, 0, T, T, P.rust[0]);
  r.speckle(0, 0, T, T, [P.rust[1], P.slate[1]], 0.3, rand);
  r.hline(0, 15, 0, P.rust[1]);
  r.vline(0, 0, 15, P.rust[1]);
  return r;
}

function cable(dir: 'h' | 'v' | 'c', seed: number): Raster {
  const r = concrete(seed);
  // Painted maintenance marking with a run of real cable: the slice's breadcrumb trail.
  const paint: Color = P.amber[2];
  if (dir === 'h' || dir === 'c') {
    // corner pieces join the left edge to the bottom edge
    const x1 = dir === 'c' ? 9 : 15;
    r.hline(0, x1, 7, P.ink).hline(0, x1, 8, P.mint[1]).hline(0, x1 - 1, 9, P.ink);
    for (let x = 2; x < x1 - 1; x += 6) r.px(x, 5, paint).px(x + 1, 5, paint);
  }
  if (dir === 'v' || dir === 'c') {
    const y0 = dir === 'c' ? 8 : 0;
    r.vline(7, y0 + (dir === 'c' ? 2 : 0), 15, P.ink).vline(8, y0, 15, P.mint[1]).vline(9, y0, 15, P.ink);
    for (let y = dir === 'c' ? 11 : 2; y < T; y += 6) r.px(11, y, paint).px(11, y + 1, paint);
  }
  return r;
}

function roadLine(seed: number): Raster {
  const r = asphalt(seed, true);
  r.rect(3, 7, 10, 2, P.bone[0]);
  r.hline(3, 12, 7, P.bone[1]);
  return r;
}

function drain(seed: number): Raster {
  const r = asphalt(seed, true);
  r.rect(4, 5, 8, 6, P.ink);
  for (let x = 5; x < 12; x += 2) r.vline(x, 6, 9, P.slate[3]);
  r.hline(4, 11, 4, P.slate[3]);
  return r;
}

function puddle(seed: number): Raster {
  const r = asphalt(seed, true);
  r.ellipse(8, 8, 7, 5, P.water[2]);
  r.ellipse(8, 8, 6, 4, P.water[3]);
  r.hline(4, 9, 6, P.amber[3]); // window reflection
  r.hline(6, 8, 7, P.amber[2]);
  r.hline(8, 12, 10, P.water[4]);
  return r;
}

function rug(): Raster {
  const r = tile();
  r.rect(0, 0, T, T, '#5a2a30');
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) r.px(x, y, P.amber[1]);
  r.rect(6, 6, 4, 4, P.amber[2]);
  return r;
}

// ---- walls ---------------------------------------------------------------

interface WallLook { top: string; topHi: string; topLo: string; front: (r: Raster, v: number, rand: () => number) => void }

function brickFront(r: Raster, v: number, rand: () => number): void {
  r.rect(0, 0, T, T, P.brick[2]);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    r.hline(0, 15, y + 3, P.brick[1]);
    const off = row % 2 ? 4 : 0;
    for (let x = off; x < T; x += 8) r.vline(x, y, y + 2, P.brick[1]);
    for (let x = 0; x < T; x++) if (rand() < 0.12) r.px(x, y + Math.floor(rand() * 3), rand() < 0.5 ? P.brick[3] : P.brick[1]);
  }
  r.hline(0, 15, 0, P.brick[4]);
  if (v === 2) {
    // drainpipe
    r.rect(11, 0, 3, 16, P.slate[2]);
    r.vline(11, 0, 15, P.slate[4]);
    r.vline(13, 0, 15, P.slate[1]);
    r.rect(10, 7, 5, 2, P.slate[3]);
  }
  r.rect(0, 14, T, 2, P.brick[0]);
}

function homeFront(r: Raster, v: number): void {
  r.rect(0, 0, T, T, P.wallpaper[2]);
  for (let x = 1; x < T; x += 4) r.vline(x, 1, 11, P.wallpaper[1]);
  for (let x = 3; x < T; x += 4) for (let y = 2; y < 11; y += 3) r.px(x, y, P.wallpaper[3]);
  r.rect(0, 11, T, 5, P.wood[2]); // skirting/wainscot
  r.hline(0, 15, 11, P.wood[4]);
  r.hline(0, 15, 15, P.wood[0]);
  if (v === 2) {
    r.rect(4, 2, 8, 6, P.wood[1]);
    r.rect(5, 3, 6, 4, P.paper[1]);
    r.px(7, 4, P.skin[2]).px(8, 4, P.skin[2]).px(7, 5, P.coat[2]).px(8, 5, P.coat[2]);
  }
}

function laundryFront(r: Raster, v: number): void {
  r.rect(0, 0, T, T, P.tileW[2]);
  for (let y = 0; y < 12; y += 4) r.hline(0, 15, y, P.tileW[1]);
  for (let x = 0; x < T; x += 4) r.vline(x, 0, 11, P.tileW[1]);
  r.rect(0, 12, T, 4, P.teal[2]);
  r.hline(0, 15, 12, P.teal[4]);
  if (v === 2) {
    r.rect(3, 2, 10, 7, P.paper[2]);
    r.hline(4, 11, 4, P.ink).hline(4, 9, 6, P.ink);
  }
}

function serviceFront(r: Raster, v: number, rand: () => number): void {
  r.rect(0, 0, T, T, P.slate[3]);
  r.speckle(0, 0, T, 14, [P.slate[2], P.slate[4]], 0.15, rand);
  r.hline(0, 15, 0, P.slate[4]);
  r.rect(0, 13, T, 3, P.slate[1]);
  // horizontal pipe run
  r.rect(0, 4, T, 3, P.rust[2]);
  r.hline(0, 15, 4, P.rust[4]);
  r.hline(0, 15, 6, P.rust[1]);
  if (v === 2) {
    r.rect(5, 3, 3, 5, P.rust[1]);
    r.rect(6, 8, 6, 4, P.mint[0]);
    r.rect(7, 9, 4, 2, P.mint[2]);
  }
  if (v === 1) r.rect(9, 8, 1, 5, [10, 20, 20, 160]);
}

function galleryFront(r: Raster, v: number): void {
  r.rect(0, 0, T, T, P.teal[1]);
  r.rect(1, 1, 14, 11, P.teal[2]);
  r.hline(1, 14, 1, P.teal[3]);
  r.px(2, 2, P.mint[2]).px(13, 2, P.mint[2]).px(2, 10, P.mint[1]).px(13, 10, P.mint[1]);
  r.rect(0, 12, T, 4, P.slate[1]);
  r.hline(0, 15, 12, P.mint[1]);
  if (v === 2) {
    r.rect(5, 4, 6, 5, P.slate[1]);
    r.rect(6, 5, 4, 1, P.mint[3]);
    r.rect(6, 7, 2, 1, P.verm[2]);
  }
  if (v === 1) {
    r.vline(8, 1, 11, P.teal[1]);
  }
}

function rustFront(r: Raster, v: number, rand: () => number): void {
  r.rect(0, 0, T, T, P.rust[1]);
  r.speckle(0, 0, T, T, [P.rust[0], P.rust[2], P.rust[3]], 0.25, rand);
  r.hline(0, 15, 0, P.rust[3]);
  for (let x = 0; x < T; x += 5) r.vline(x, 0, 13, P.rust[0]);
  r.rect(0, 13, T, 3, P.rust[0]);
  if (v === 2) r.rect(4, 3, 8, 3, P.slate[2]).hline(4, 11, 3, P.slate[4]);
}

const LOOKS: Record<WallStyleId, WallLook> = {
  [WallStyle.BRICK]: { top: '#20263a', topHi: P.slate[4], topLo: P.ink, front: brickFront },
  [WallStyle.HOME]: { top: '#1d2228', topHi: P.wood[4], topLo: P.ink, front: homeFront },
  [WallStyle.LAUNDRY]: { top: '#1d272c', topHi: P.tileW[3], topLo: P.ink, front: laundryFront },
  [WallStyle.SERVICE]: { top: '#191e28', topHi: P.slate[5], topLo: P.ink, front: serviceFront },
  [WallStyle.GALLERY]: { top: '#122225', topHi: P.mint[2], topLo: P.ink, front: galleryFront },
  [WallStyle.RUST]: { top: '#20160f', topHi: P.rust[4], topLo: P.ink, front: rustFront },
};

function wallTop(style: WallStyleId, mask: number): Raster {
  const look = LOOKS[style];
  const r = tile();
  const rand = rng(style * 97 + mask);
  r.rect(0, 0, T, T, look.top);
  if (style === WallStyle.BRICK) {
    // slate roofs over the street's buildings
    for (let y = 0; y < T; y += 4) {
      r.hline(0, 15, y + 3, '#151a24');
      for (let x = (y / 4) % 2 ? 2 : 0; x < T; x += 4) r.vline(x, y, y + 2, '#151a24');
      r.hline(0, 15, y, '#2c3446');
    }
    r.speckle(0, 0, T, T, ['#1c2230', '#36405a'], 0.08, rand);
  } else r.speckle(1, 1, 14, 14, [[255, 255, 255, 12]], 0.25, rand);
  // exposed edges get a bright rim so room shapes stay readable in the dark
  if (mask & 1) r.hline(0, 15, 0, look.topHi).hline(0, 15, 1, [255, 255, 255, 40]);
  if (mask & 8) r.vline(0, 0, 15, look.topHi).vline(1, 0, 15, [255, 255, 255, 30]);
  if (mask & 2) r.vline(15, 0, 15, look.topHi).vline(14, 0, 15, [0, 0, 0, 60]);
  if (mask & 4) r.hline(0, 15, 15, look.topLo);
  return r;
}

function wallFront(style: WallStyleId, variant: number): Raster {
  const look = LOOKS[style];
  const r = tile();
  const rand = rng(style * 131 + variant * 7 + 3);
  look.front(r, variant >= 3 ? 0 : variant, rand);
  // end shading for wall runs that terminate (corner reads as solid mass)
  if (variant === 3 || variant === 5) r.vline(0, 0, 15, P.ink).vline(1, 0, 15, [0, 0, 0, 90]);
  if (variant === 4 || variant === 5) r.vline(15, 0, 15, P.ink).vline(14, 0, 15, [0, 0, 0, 90]);
  // ambient occlusion where the wall meets the floor
  r.hline(0, 15, 15, [0, 0, 0, 160]);
  return r;
}

export function buildTileset(): Raster {
  const sheet = new Raster(TILESET_COLUMNS * T, TILESET_ROWS * T);
  const put = (index: number, r: Raster): void => {
    sheet.blit(r, (index % TILESET_COLUMNS) * T, Math.floor(index / TILESET_COLUMNS) * T);
  };
  const voidT = tile().rect(0, 0, T, T, P.void);
  put(Floor.VOID, voidT);
  put(Floor.ASPHALT_A, asphalt(1, false));
  put(Floor.ASPHALT_B, asphalt(2, true));
  put(Floor.ASPHALT_WET, asphalt(3, true));
  put(Floor.SIDEWALK_A, sidewalk(4));
  put(Floor.SIDEWALK_B, sidewalk(5));
  put(Floor.PUDDLE, puddle(6));
  put(Floor.WOOD_A, wood(7));
  put(Floor.WOOD_B, wood(8));
  put(Floor.RUG, rug());
  put(Floor.CHECKER_A, checker(false));
  put(Floor.CHECKER_B, checker(true));
  put(Floor.CONCRETE_A, concrete(12));
  put(Floor.CONCRETE_B, concrete(13));
  put(Floor.CONCRETE_STAIN, concrete(14, true));
  put(Floor.GRATE, grate());
  put(Floor.METAL_A, metal(16));
  put(Floor.METAL_B, metal(17));
  put(Floor.METAL_HAZARD, hazard());
  put(Floor.WATER, water(false, 19));
  put(Floor.WATER_EDGE, water(true, 20));
  put(Floor.STAIRS_DOWN, stairs());
  put(Floor.CURB, curb(22));
  put(Floor.GRAVEL, gravel(23));
  put(Floor.LINO, lino());
  put(Floor.RUST_FLOOR, rustFloor(25));
  put(Floor.CABLE_H, cable('h', 26));
  put(Floor.CABLE_V, cable('v', 27));
  put(Floor.ROAD_LINE, roadLine(28));
  put(Floor.DRAIN, drain(29));
  put(Floor.METAL_DARK, metal(30, true));
  put(Floor.CABLE_CORNER, cable('c', 31));
  for (const style of Object.values(WallStyle)) {
    for (let m = 0; m < 16; m++) put(wallTopIndex(style, m), wallTop(style, m));
    for (let v = 0; v < 6; v++) put(wallFrontIndex(style, v), wallFront(style, v));
  }
  return sheet;
}
