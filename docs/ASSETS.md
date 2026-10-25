# Asset inventory and licensing

All runtime art is **original work generated in this repository** by `tools/art/*.ts` (run `npm run art`). It contains no third-party art, no purchased packs and no AI-generated images. The machine-readable manifest is `public/assets/asset-manifest.json` (asset ID, path, source file, licence, commercial use, attribution).

| Asset | File | Source | Licence |
|---|---|---|---|
| Tileset: 6 wall styles × 16 autotile tops + 6 fronts, 32 floors | `public/assets/tiles.png` | `tools/art/tiles.ts` | Project-owned |
| Characters: player, Pipe Skitter, Lamp Leech, Pipekeeper, layered guns | `public/assets/chars.{png,json}` | `tools/art/chars.ts` | Project-owned |
| Props and pickups (~90 frames) | `public/assets/props.{png,json}` | `tools/art/props.ts` | Project-owned |
| FX: muzzle flashes, glows, puffs, ripples, steam, markers | `public/assets/fx.{png,json}` | `tools/art/fx.ts` | Project-owned |
| UI icons (19) | `public/assets/ui/*.png` | `tools/art/icons.ts` | Project-owned |
| Font: Pixelify Sans | via `@fontsource/pixelify-sans` 5.3.0 | Stefie Justprince | SIL OFL 1.1 |
| Engine: Phaser 4.2.1 | npm | Phaser Studio | MIT |
| Audio | synthesized at runtime (`src/audio/audio.ts`) | — | Project-owned |

## Coverage against the first-slice inventory (docs/design/docs/06)

| Required | State |
|---|---|
| Player 8-direction locomotion/aim | **Partial**: 3 drawn facings (down, up, side; left mirrors the body only) plus a free-rotating layered gun with a muzzle anchor at any angle. Idle 4, walk 6, dodge 4, hurt 2, heal 4, death 6 frames. No dedicated body recoil frames (gun kick and screen nudge instead). |
| Two enemy families with idle/move/anticipation/attack/recovery/hit/death | **Done** (Skitter, Lamp Leech), drawn programmatically. |
| Pipekeeper bespoke readable phases | **Done**: idle, walk, hose/rush/vent telegraph and attack, stunned, death. |
| Street, laundrette, service, pump tilesets; doors, lift, puddles, machines, posters, lamps, pipes, furniture, secret wall | **Done at prototype fidelity**. Missing: wall cutaways, more poster/prop variety, stair art in use. |
| FX: flashes ×2, material impacts, shell cases, dust, ripples, sparks, healing, interaction, telegraphs | **Done**, as pooled particles and vector telegraphs. |
| UI icon set, button states, item silhouettes, readable font | **Done** (16 px icons drawn at CSS scale). |
| Audio: footsteps by surface, two weapon sets, reloads, impacts, enemy cues, ambience, UI | **Placeholder synthesis.** No recorded or designed audio and no music. |

## Honest quality note
This art is coherent, crisp and animated, but it was drawn procedurally by an engineer, not by a pixel artist. It has **not** passed the art approval gate in docs/design/docs/06. Treat it as a strong, licence-clean prototype and the visual target to beat. The highest-value art investments are listed in PROGRESS.md.
