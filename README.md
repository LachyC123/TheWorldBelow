# The World Below

A pixel-art exploration survival shooter for the browser, designed first for **landscape iPhone Safari**, with keyboard and mouse supported too. Beautiful mystery above, frightening depths below, and muzzle flashes that light up the room you're in.

**Status: first playable slice (milestones M0–M2).** You can play from your inherited home, down a rainy street, through a laundrette, into the service tunnels and the pumping gallery, then back. There's one optional secret and an optional mini-boss. See [PROGRESS.md](PROGRESS.md) for what's verified and what isn't.

![Muzzle flash revealing the Cistern Hall](docs/screenshots/cistern_muzzle_flash.png)

## Run it

```bash
npm ci
npm run dev          # http://localhost:5173 (also reachable from a phone on the same network)
npm run build        # static production build in dist/
npx vite preview     # serve the production build on http://localhost:4173
```

Requires Node ≥ 22.18. The build is fully static and uses relative asset paths, so `dist/` works from any HTTPS host or sub-path (e.g. GitHub Pages). It needs no API keys, accounts or backend.

## Controls

| Action | Touch (landscape) | Keyboard / mouse |
|---|---|---|
| Move | Left thumb anywhere on the left half (floating stick) | WASD / arrows |
| Fire | Hold the big FIRE button (aims for you) | Hold left mouse button |
| Manual aim | Drag away from FIRE while holding | Mouse |
| Dodge | Footprint button | Space |
| Interact | Hand button (lights up when something is in reach) | E |
| Heal | Bandage button | Q |
| Switch weapon | Tap the weapon panel | 1 / 2 / mouse wheel |
| Torch on/off | Torch button (top right) | F |
| Reload | Automatic when empty or idle | R |
| Map / Journal / Pause | Top-right buttons | M or Tab / J / Esc |

Settings include: aim assist, left-handed layout, control and text size, reduced flash/shake/motion, high-contrast threat warnings, visual sound cues, gentle death, and volume.

## Scripts

| Script | Purpose |
|---|---|
| `npm run typecheck` | Strict TypeScript |
| `npm run lint` | ESLint |
| `npm run test` | Vitest: simulation, saves, light visibility, content validation |
| `npm run validate:content` | Content validation only: IDs, references, reachability, fair secrets, atlas frames |
| `npm run art` | Regenerate all pixel art from `tools/art` into `public/assets` |
| `npm run smoke [-- URL]` | Playwright browser run of the whole slice (36 checks; screenshots go to `captures/smoke/`) |

## Repository map

- `src/` — the game ([docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains how it's organised and why).
- `tools/art/` — authored pixel art as code: tiles, characters, props, FX and icons (see [docs/ASSETS.md](docs/ASSETS.md)).
- `docs/design/` — the original design pack, unmodified.
- [docs/CHARTER_AND_VISUAL_TARGET.md](docs/CHARTER_AND_VISUAL_TARGET.md) — one-page charter and the visual target room.
- `tests/`, `tools/smoke.mjs` — automated checks.
