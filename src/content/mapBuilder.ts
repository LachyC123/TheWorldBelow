// Authoring helper: start from solid wall and carve rooms/corridors with legend characters.
export class MapBuilder {
  private rowsData: string[][];
  readonly w: number;
  readonly h: number;
  constructor(w: number, h: number, fill = '#') {
    this.w = w;
    this.h = h;
    this.rowsData = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }

  /** Fill a rectangle (tile coords, inclusive start, w/h size) with a legend char. */
  carve(x: number, y: number, w: number, h: number, ch: string): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch);
    return this;
  }

  set(x: number, y: number, ch: string): this {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) throw new Error(`MapBuilder out of bounds ${x},${y}`);
    this.rowsData[y]![x] = ch;
    return this;
  }

  /** Horizontal run of a char. */
  hrun(x0: number, x1: number, y: number, ch: string): this {
    for (let x = x0; x <= x1; x++) this.set(x, y, ch);
    return this;
  }

  vrun(x: number, y0: number, y1: number, ch: string): this {
    for (let y = y0; y <= y1; y++) this.set(x, y, ch);
    return this;
  }

  /** Scatter a char over cells currently equal to `onto`, deterministic by coordinates. */
  sprinkle(onto: string, ch: string, every: number, salt = 0): this {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const hsh = ((x * 73856093) ^ (y * 19349663) ^ (salt * 83492791)) >>> 0;
        if (this.rowsData[y]![x] === onto && hsh % every === 0) this.rowsData[y]![x] = ch;
      }
    return this;
  }

  rows(): string[] {
    return this.rowsData.map((r) => r.join(''));
  }
}
