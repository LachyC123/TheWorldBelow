// Small RGBA raster with pixel-art drawing helpers. Build-time only.
export type Rgba = [number, number, number, number];

export function hex(c: string, a = 255): Rgba {
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a];
}

export type Color = string | Rgba | null;

function toRgba(c: Color): Rgba | null {
  if (c === null) return null;
  return typeof c === 'string' ? hex(c) : c;
}

/** Deterministic RNG so regenerated art is byte-identical. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export class Raster {
  readonly data: Uint8ClampedArray;
  readonly w: number;
  readonly h: number;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  get(x: number, y: number): Rgba | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    return [this.data[i]!, this.data[i + 1]!, this.data[i + 2]!, this.data[i + 3]!];
  }

  alpha(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3]!;
  }

  px(x: number, y: number, c: Color): this {
    x = Math.round(x);
    y = Math.round(y);
    const col = toRgba(c);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    const i = (y * this.w + x) * 4;
    if (col === null) {
      this.data[i + 3] = 0;
      return this;
    }
    const a = col[3] / 255;
    if (a >= 1 || this.data[i + 3] === 0) {
      this.data[i] = col[0];
      this.data[i + 1] = col[1];
      this.data[i + 2] = col[2];
      this.data[i + 3] = col[3];
    } else {
      this.data[i] = this.data[i]! * (1 - a) + col[0] * a;
      this.data[i + 1] = this.data[i + 1]! * (1 - a) + col[1] * a;
      this.data[i + 2] = this.data[i + 2]! * (1 - a) + col[2] * a;
      this.data[i + 3] = Math.max(this.data[i + 3]!, col[3]);
    }
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: Color): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }

  hline(x0: number, x1: number, y: number, c: Color): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.px(x, y, c);
    return this;
  }

  vline(x: number, y0: number, y1: number, c: Color): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.px(x, y, c);
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Color): this {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** Filled ellipse centred at (cx, cy) with radii rx, ry (pixel-centre sampling). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    return this;
  }

  /** Apply fn to every opaque pixel; fn returns a colour or undefined to keep. */
  map(fn: (x: number, y: number, c: Rgba) => Color | undefined): this {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y)!;
        if (c[3] === 0) continue;
        const r = fn(x, y, c);
        if (r !== undefined) {
          const i = (y * this.w + x) * 4;
          this.data[i + 3] = 0;
          this.px(x, y, r);
        }
      }
    return this;
  }

  /** Add a 1px outline around opaque shapes (4-neighbour), drawn into transparent pixels. */
  outline(c: Color = '#0b0d14', diagonal = false): this {
    const marks: Array<[number, number]> = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        const n =
          this.alpha(x - 1, y) || this.alpha(x + 1, y) || this.alpha(x, y - 1) || this.alpha(x, y + 1) ||
          (diagonal && (this.alpha(x - 1, y - 1) || this.alpha(x + 1, y - 1) || this.alpha(x - 1, y + 1) || this.alpha(x + 1, y + 1)));
        if (n) marks.push([x, y]);
      }
    for (const [x, y] of marks) this.px(x, y, c);
    return this;
  }

  /** Copy another raster into this one at (dx, dy) with alpha compositing. */
  blit(src: Raster, dx: number, dy: number, flipX = false): this {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flipX ? src.w - 1 - x : x, y)!;
        if (c[3] > 0) this.px(dx + x, dy + y, c);
      }
    return this;
  }

  clone(): Raster {
    const r = new Raster(this.w, this.h);
    r.data.set(this.data);
    return r;
  }

  flipX(): Raster {
    const r = new Raster(this.w, this.h);
    r.blit(this, 0, 0, true);
    return r;
  }

  /** Rotate by 90° steps clockwise. */
  rot90(times = 1): Raster {
    let cur: Raster = this.clone();
    for (let t = 0; t < ((times % 4) + 4) % 4; t++) {
      const r = new Raster(cur.h, cur.w);
      for (let y = 0; y < cur.h; y++) for (let x = 0; x < cur.w; x++) {
        const c = cur.get(x, y)!;
        if (c[3] > 0) r.px(cur.h - 1 - y, x, c);
      }
      cur = r;
    }
    return cur;
  }

  /** Dither-free noise speckle in a region. */
  speckle(x: number, y: number, w: number, h: number, colors: Color[], density: number, rand: () => number): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (rand() < density) this.px(x + i, y + j, colors[Math.floor(rand() * colors.length)]!);
    return this;
  }
}
