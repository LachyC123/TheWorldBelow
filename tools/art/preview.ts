// Writes an upscaled contact sheet of any raster for visual inspection during art authoring.
import { writeFileSync } from 'node:fs';
import { Raster } from './raster.ts';
import { encodePng } from './png.ts';

export function writePreview(path: string, src: Raster, scale = 4, bg = '#2a2f3a'): void {
  const r = new Raster(src.w * scale, src.h * scale);
  const b = [parseInt(bg.slice(1, 3), 16), parseInt(bg.slice(3, 5), 16), parseInt(bg.slice(5, 7), 16), 255] as [number, number, number, number];
  r.rect(0, 0, r.w, r.h, b);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const c = src.get(x, y)!;
    if (c[3]) r.rect(x * scale, y * scale, scale, scale, c);
  }
  writeFileSync(path, encodePng(r.w, r.h, r.data));
}
