// Converts a region's cell grid into floor and wall tile layers (top faces vs fronts).
import type { RegionDef } from '../content/types.ts';
import { Floor, wallFrontIndex, wallTopIndex, type WallStyleId } from '../content/tiles.ts';
import { Cell, type Grid } from '../sim/grid.ts';

export interface TileLayers {
  floor: number[][];
  walls: number[][];
}

export function buildTileLayers(def: RegionDef, grid: Grid): TileLayers {
  const floor: number[][] = [];
  const walls: number[][] = [];
  const cellAt = (x: number, y: number): number => (x < 0 || y < 0 || x >= grid.w || y >= grid.h ? Cell.Wall : grid.cells[y * grid.w + x]!);
  for (let y = 0; y < grid.h; y++) {
    const fr: number[] = [];
    const wr: number[] = [];
    for (let x = 0; x < grid.w; x++) {
      const ch = def.map[y]![x]!;
      const cd = def.legend[ch]!;
      if ('floor' in cd) {
        fr.push(cd.floor);
        wr.push(-1);
      } else if ('water' in cd) {
        fr.push(cellAt(x, y - 1) === Cell.Water ? Floor.WATER : Floor.WATER_EDGE);
        wr.push(-1);
      } else if ('void' in cd) {
        fr.push(Floor.VOID);
        wr.push(-1);
      } else {
        fr.push(-1);
        const style = cd.wall as WallStyleId;
        if (grid.isFront(x, y)) {
          const l = cellAt(x - 1, y) === Cell.Wall && grid.isFront(x - 1, y);
          const r = cellAt(x + 1, y) === Cell.Wall && grid.isFront(x + 1, y);
          let v = hash(x, y) % 9 === 0 ? 2 : hash(x, y) % 2;
          if (!l && !r) v = 5;
          else if (!l) v = 3;
          else if (!r) v = 4;
          wr.push(wallFrontIndex(style, v));
        } else {
          let mask = 0;
          if (cellAt(x, y - 1) !== Cell.Wall) mask |= 1;
          if (cellAt(x + 1, y) !== Cell.Wall) mask |= 2;
          if (cellAt(x - 1, y) !== Cell.Wall) mask |= 8;
          wr.push(wallTopIndex(style, mask));
        }
      }
    }
    floor.push(fr);
    walls.push(wr);
  }
  return { floor, walls };
}

function hash(x: number, y: number): number {
  return (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000;
}
