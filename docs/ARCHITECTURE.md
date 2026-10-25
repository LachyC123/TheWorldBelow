# Architecture decisions (M0–M3 and the world-structure pass)

## ADR-1 Toolchain (pinned 25 Oct 2026)
TypeScript **6.0.3** (strict, `erasableSyntaxOnly`), Phaser **4.2.1**, Vite **8.3.4**, Vitest **4.1.12** (4.1.11 has a published mocker advisory), ESLint **10.12.0** + typescript-eslint **8.71.2**, Playwright **1.63.0**. All versions are exact pins in `package.json` and the lockfile; each was released more than two weeks before pinning, except Vitest 4.1.12, which is a security patch. TypeScript 7 (the native port) was skipped as too new. Phaser 4 is used only through APIs verified against its bundled type definitions; `tsc` gates every API use. Note: npm 10.9.4 crashes resolving this tree (an `edgesOut` arborist bug), so `npm ci` works but adding packages needs npm ≥ 11.

## ADR-2 Simulation is separate from presentation
`src/sim` is plain TypeScript with no Phaser or DOM. `World.step(commands)` runs a fixed **60 Hz** tick (at most 5 catch-up steps per frame; time stops while paused or in a hidden tab). It emits immutable, sequence-numbered events (`WeaponFired`, `DamageApplied`, `EnemyTelegraph`, …). Rendering, particles, audio and the HUD subscribe to those events and never award items or decide deaths. This is why the sim is unit-testable in Node, including determinism: identical inputs produce identical state.

Update order: input sample → player (movement, dodge, heal, weapon) → interaction → path field → creatures → swept projectiles → floor vents → pickups/triggers/exits → exploration mask.

## ADR-3 Collision and projectiles
Tile grids are derived from authored ASCII maps, with three layers: walk-block, shot-block and light-block. Movement uses axis-separated 1 px sub-steps with corner forgiveness. Bullets are swept each tick with a grid DDA ray plus segment–circle tests against creatures; the nearest hit wins, so nothing tunnels. Damage is applied exactly once, and the projectile is removed as it resolves. Creatures path toward the player with a BFS distance field, so they search around walls rather than attacking through them.

## ADR-4 Lighting: visibility-clipped light mask
A light canvas at world resolution (1 light pixel = 1 world pixel) is filled with each region's ambient floor. Lights are added with `lighter` compositing, each clipped to a **visibility polygon** raycast against the light-block grid (uniform rays plus ±ε rays to exposed wall corners). The canvas is uploaded as a Phaser `CanvasTexture` and multiplied over the crisp world art. Static lights are cached in a region-sized canvas until geometry or lamp state changes. The torch, muzzle flashes (peak/decay envelope with capped combined exposure), creature glows and flickering lamps are drawn per frame. Telegraphs, emissive glows and tracers draw *above* the mask, so a dangerous attack is never hidden by darkness.

South-facing wall fronts let light in so their faces get lit, while wall tops stay opaque. Tests confirm a flash cannot cross a wall. Measured JS cost per frame (headless Chromium, all regions): about 0.8–1.2 ms average, of which lighting is about 0.5–0.7 ms. On-device GPU cost has not been measured.

## ADR-5 Pixel-perfect scaling
The canvas renders at device pixels (CSS × DPR, capped at 3). The camera zoom is an integer: `max(round(pxH/216), ceil(pxW/480))`. That gives about 216 world pixels of height and never more than 480 of width, so wide phones don't reveal extra combat space. On an iPhone 16 Pro Max (932×430 at 3×) this is zoom 6, a 466×215 view. The camera centre is snapped to device pixels. The HUD and menus are DOM at CSS resolution, so text stays crisp.

## ADR-6 Input ownership
DOM pointer events with `setPointerCapture`. Each pointer is bound to one control on `pointerdown`, at most one pointer per control, and released on up, cancel, lost capture, blur, hidden tab, pause, dialogue or region change. Touch and desktop modes switch on the last input used; synthetic mouse events after a touch are ignored. Dialogues swallow their own keys so the key that closes one cannot re-trigger the interaction (a bug the smoke test caught).

## ADR-7 Persistence
Saves live in IndexedDB (`slots` + `backups` stores). Each write is serialized and atomic: in the same transaction, the previous record becomes the backup. "Saved" is only shown after the transaction commits. If the latest record fails validation, loading falls back to the backup. The envelope carries `saveSchemaVersion`, `gameBuild` (git SHA), `contentManifestVersion`, world ID, seed, generator versions, revision, timestamps and an FNV-1a checksum over canonical JSON.

Imports are capped at 2 MB, parsed as data and validated field by field: types, ranges, duplicates, and every ID checked against the content registry. Saves from newer versions are refused with a clear message. Checkpoints happen on new game, region change, refuge, key story/discovery moments and boss defeat, plus an autosave every 10 s and a best-effort save when the tab is hidden. A Web Locks lock per slot puts a second tab into read-only mode. Without IndexedDB (some private modes), saves fall back to memory and the game says so.

## ADR-8 Content as typed, validated data
Regions are TypeScript data: ASCII maps, a legend, entities (props, interactables, exits, pickups, enemies, triggers, vents), lights, emitters and entries. Every ID is a persistent save key. `tests/content.test.ts` checks:
- rectangular maps and that every legend character resolves
- globally unique IDs and resolvable exit targets
- that every dialogue, journal entry and atlas frame referenced actually exists
- flood-fill reachability of all entries, exits, interactables, pickups and enemies
- that every gate flag has an authored setter
- that the humming-wall clues are observable before the secret opens
- that the region graph is connected and includes the lift shortcut

The design pack's example contracts were adapted (`src/content/types.ts`, `src/save/envelope.ts`) rather than copied.

## ADR-9 Art as authored code
No art pack was supplied. All pixel art is drawn by deterministic TypeScript in `tools/art/*` against a role-based palette, then exported to PNG atlases (Phaser hash JSON) plus `public/assets/asset-manifest.json`. That makes it original, licence-clean and reproducible. It also means every sprite can be redrawn by editing code, and real pixel-art files can replace any atlas later without engine changes. See `docs/ASSETS.md` for the gap list.

## ADR-10 Audio
Web Audio cues are synthesized at runtime (no samples yet) on category buses: ambience, weapons, creatures, UI, world. Audio is unlocked by the Start/Continue gesture, suspended when hidden and resumed on return. Identical cues are rate-limited. Every critical sound has a visual equivalent: telegraph glyphs, visual sound-cue icons and journal text.

## ADR-11 Persistent generated frontier (M3)
The authored slice opens onto generated territory at **sockets**: the street storm drain, the Cistern Hall's south passage, and the gallery's east and south exits. Each socket generates a district the first time it is entered.

**What a district is made of.** `src/world/generator.ts` is pure and deterministic. It turns (world seed, socket, ledger, generator version) into:
- a macro grid of 4–12 cells
- a randomized spanning tree plus loops, so districts have alternate routes
- roles: arrival, connector, combat, reward, rest, landmark, secret, vault
- authored room modules (`src/world/modules.ts`) placed per role and door side
- 2-wide corridors, plus exits on the map edge back to the parent and on to 1–2 child sockets

**What goes inside.** Encounters scale with depth; Watchman Drones appear from depth 2, or in the pump works. Loot, survey maps, refuges and decoration come from biome kits (`src/world/kits.ts`): service veins, storm drains and pump works.

**Secrets and gated rooms.** Secret rooms sit behind loose brickwork with a visible clue (lint drifting through the gaps). Vaults sit behind live junctions that need the insulated gloves.

**Unique content.** Curios, upgrades, landmarks and the gloves are reserved in a per-world ledger, so nothing unique is placed twice. The gloves are guaranteed in the first district generated. Hand-placed uniques are excluded from the generator.

**Novelty.** Module choice is weighted by how often each module has been seen in this world, and by repeats within the district. Independent RNG streams (topology, encounters, decoration, loot) keep a cosmetic change from moving a corridor.

**Validation before commit.** Flood fills run twice: with gates closed (return path, onward exits, ladder, refuge, gloves) and with gates open (everything else). Checks also cover safe arrival spacing (no creature within 7 tiles), unique IDs and map integrity. Up to 12 seeded retries, then a known-good fallback layout. This was tested across 1,200 seeds × biomes × sides × depths with zero rejections, and a 40-district chain with no duplicated uniques.

**Workers and commit.** Generation runs in a module Web Worker (`src/workers/generate.worker.ts`). Jobs carry IDs and a world epoch, so results from a previous slot are discarded. If a worker can't start, generation falls back to the main thread. The result is re-validated on the main thread and committed atomically into the save as **materialized data** (`data.world.generated`): map rows, entities, lights and entries. A visited district is therefore never regenerated, even if the generator changes. Sockets map to committed region IDs.

**Shortcuts.** Ladders in depth-1 districts unbolt one of three street manholes from below. Those become two-way shortcuts.

**Saves.** Schema v2 adds `world` (ledger and districts) and `finds`. v1 saves are checksum-verified, then migrated, and the original record stays as the slot backup until the next save. Imported districts are revalidated (tiles must belong to their biome legend, entities must be well-formed, and the full district validation runs) before acceptance.

## ADR-12 Local region rules are deterministic simulation, not presentation (tide)
The underground sea's rule is the tide (`src/sim/tide.ts`). It is a pure function of a clock: a 46 s cycle (high → falling → low → rising), with every third ebb a spring ebb.
- **Cells.** Tidal cells are authored floor cells with `tidal: 1 | 2` in the region legend. `Grid.tideLevel` blocks every tidal cell above the current level on each `resetDynamic`, so collision, path fields and projectiles all agree.
- **Clock.** The World seeds its tide clock from `playSeconds` on entry and advances it with the fixed step. The tide is predictable and reproducible, never random.
- **Feedback.** The bell is a sim event (`TideBell`) 6 s before the water turns. It plays a sound, shows a subtitle and an on-screen cue icon, and swings the bell sprite. The gauge sprite reads the level through temporary flags.
- **No drowning.** If rising water covers the player, a BFS through non-wall cells sets them on the nearest dry, unblocked tile (`TideCarried`) with no damage.
- **Rendering.** Presentation only fades two tide tilemap layers by coverage.

## ADR-13 Objectives are journal questions computed from evidence
`src/content/questions.ts` defines questions with an `opens` condition, a `resolves` condition, evidence lines (each gated by an observation flag) and a three-step hint ladder.
- **Evidence.** Observation flags (`OBS` in `ids.ts`) are set by `observe:` triggers, `note:` interactions, locked-text explanations and conversations.
- **Hints.** Revealed hints are stored as `hint_<question>_<tier>` flags, so they persist and never re-hide.
- **Pause.** The pause menu lists open question titles instead of an objective string.
- **Saves.** No new save fields: everything is flags in the existing v2 schema, so older saves load unchanged and simply have no observations yet.

## ADR-14 Authored reconnections into generated districts are derived, not stored
`AUTHORED_LINKS` in `generator.ts` maps a socket (currently `street_storm_drain`) to an authored region entry. `toRegionDef` adds the link when a committed record is turned into a region:
- **Placement.** It sits on the reachable floor cell farthest from the arrival, computed with gates closed, so it never hides behind an optional obstacle.
- **Contents.** It adds a grate, an exit, a `link_<key>` entry, a light, a drip clue and an observation trigger.
- **Not stored.** Because the link is computed from the committed map, districts committed by earlier builds gain it too, in the same place every time, without regenerating anything. The committed record never stores it, so the save format and `GENERATOR_VERSION` are unchanged.

## ADR-15 Lit props and scale reveals
- **`lit` props.** Props marked `lit` draw above the light layer (distant vistas, station signage), so a far-off town can glow in a dark cavern.
- **Solid props for set pieces.** Large set pieces that must be lit (the great door) are solid, non-opaque props over floor cells, not art painted on wall tops, which light cannot reach.
- **First-sight looks.** First sight of a spectacular destination triggers a short scripted camera look (`GameApp.look`) with a subtitle. Phone viewports are short, and the reveal must not depend on where the player happens to stand.

## Not yet built
- More region families (Drowned Ward, gardens), the Foundation and the reveal. The Shoreward Stacks are visible but not reachable.
- Map custom markers, refuge stash/inventory grid, service worker/offline.
- Storage growth profiling at 1,000+ districts (each district is roughly 10–15 KB of JSON in the save).
