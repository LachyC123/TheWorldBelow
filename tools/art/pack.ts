// Shelf-packs named frames into one atlas and emits Phaser-compatible JSON (hash format).
import { Raster } from './raster.ts';

export interface Frame { name: string; img: Raster; pivotX?: number; pivotY?: number }

export function packAtlas(frames: Frame[], imageName: string, maxWidth = 1024): { image: Raster; json: unknown } {
  const sorted = [...frames].sort((a, b) => b.img.h - a.img.h || a.name.localeCompare(b.name));
  let x = 0;
  let y = 0;
  let rowH = 0;
  const pos = new Map<string, { x: number; y: number }>();
  for (const f of sorted) {
    if (x + f.img.w + 1 > maxWidth) {
      x = 0;
      y += rowH + 1;
      rowH = 0;
    }
    pos.set(f.name, { x, y });
    x += f.img.w + 1;
    rowH = Math.max(rowH, f.img.h);
  }
  const height = y + rowH;
  let h = 1;
  while (h < height) h *= 2;
  const image = new Raster(maxWidth, h);
  const out: Record<string, unknown> = {};
  for (const f of frames) {
    const p = pos.get(f.name)!;
    image.blit(f.img, p.x, p.y);
    out[f.name] = {
      frame: { x: p.x, y: p.y, w: f.img.w, h: f.img.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.img.w, h: f.img.h },
      sourceSize: { w: f.img.w, h: f.img.h },
      pivot: { x: f.pivotX ?? 0.5, y: f.pivotY ?? 1 },
    };
  }
  return { image, json: { frames: out, meta: { app: 'tools/art', version: '1', image: imageName, format: 'RGBA8888', size: { w: maxWidth, h }, scale: '1' } } };
}
