// Regenerates all game-ready art under public/assets from authored source in tools/art.
// Usage: npm run art   (deterministic: identical output for identical source)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodePng } from './png.ts';
import { packAtlas, type Frame } from './pack.ts';
import { buildTileset } from './tiles.ts';
import { playerFrames, weaponFrames, skitterFrames, leechFrames, keeperFrames } from './chars.ts';
import { propFrames } from './props.ts';
import { fxFrames } from './fx.ts';
import { ICONS } from './icons.ts';
import type { Raster } from './raster.ts';

const OUT = join(import.meta.dirname, '../../public/assets');
mkdirSync(join(OUT, 'ui'), { recursive: true });

const manifest: Array<Record<string, string>> = [];
const LICENSE = {
  source: 'Original pixel art authored in this repository (tools/art/*.ts)',
  author: 'THE WORLD BELOW project',
  license: 'Project-owned original work; no third-party material',
  commercialUse: 'yes',
  attribution: 'not required',
};

function writePng(rel: string, r: Raster, sourceFile: string): void {
  writeFileSync(join(OUT, rel), encodePng(r.w, r.h, r.data));
  manifest.push({ id: rel.replace(/\.png$/, ''), path: `assets/${rel}`, sourceFile, ...LICENSE });
}

function atlas(name: string, frames: Frame[], source: string, width = 512): void {
  const { image, json } = packAtlas(frames, `${name}.png`, width);
  writePng(`${name}.png`, image, source);
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(json));
}

writePng('tiles.png', buildTileset(), 'tools/art/tiles.ts');
atlas('chars', [...playerFrames(), ...weaponFrames(), ...skitterFrames(), ...leechFrames(), ...keeperFrames()], 'tools/art/chars.ts', 1024);
atlas('props', propFrames(), 'tools/art/props.ts', 512);
atlas('fx', fxFrames(), 'tools/art/fx.ts', 256);
for (const [name, r] of Object.entries(ICONS)) writePng(`ui/${name}.png`, r, 'tools/art/icons.ts');

writeFileSync(join(OUT, 'asset-manifest.json'), JSON.stringify({ generatedBy: 'tools/art/build.ts', assets: manifest }, null, 2));
console.log(`wrote ${manifest.length} assets to ${OUT}`);
