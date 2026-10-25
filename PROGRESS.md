# Project progress

## Milestone: M3 — persistent generated frontier and exploration pass (current)
**Owner direction (25 Oct 2026):** the feel is good, but don't let it turn into a linear game. Exploration and finding things should be the heart of it.

### Implemented
- **Many ways down from the street:**
  - the laundrette hatch (authored)
  - an open **storm drain** (needs the pistol first)
  - three **manholes**, bolted from below until you find the ladder that opens each one
  - the Cistern Hall's **south passage**
  - the gallery's **east and south exits**
- **Generated districts:** seeded, persistent, built from 13 authored room modules plus **6 unique landmarks**: The Flooded Chapel, The Fallen Carriage, The Great Fan, The Root Vault, The Switchboard Hall, The Boiler Heart.
  - Three biome families: service veins, storm drains, pump works.
  - Branching layouts with loops; each district has 1–2 onward exits, so the frontier keeps opening deeper.
  - Districts get darker and more dangerous with depth.
  - Once entered, a district is committed to your save and never regenerated.
- **Things to find:**
  - **Secret rooms** behind loose brickwork; the clue is lint drifting through the gaps.
  - **24 unique curios** with short stories.
  - **Upgrades:** 4 steadying tonics (+15 max health each), an extended magazine, a tight choke, a speed loader.
  - **Survey maps** that chart a whole district.
  - **Refuges** deep in the tunnels.
  - Landmarks, recorded in the journal.
- **Backtracking with purpose:**
  - **Insulated gloves** are guaranteed in the first district you open. They let you disconnect **live junctions** that seal off vaults, including one in the Cistern Hall you'll have walked past at the start.
  - Beating the Pipekeeper lets you force a **pressure-route shortcut** into the gallery.
- **New enemy, the Watchman Drone:** sweeps a visible searchlight. Inside the beam it locks on (red beam, rising tone) and fires a slow red bolt you can dodge. Shots draw its light to you; breaking line of sight loses it.
- **Map:** every place you've charted, with a pulsing **?** on each way onward you haven't taken.
- **Journal:** a Finds section (curios, landmarks, hidden ways opened).
- **Equipment:** lists tools and upgrades.
- **Saves:** schema v2 with checksum-verified migration from v1, so the save on your phone carries over.

### Tests actually run
- `npm run test`: **61/61**, including:
  - 1,200 generated districts (3 biomes × 4 entry sides × depths 1–5) all valid: reachable exits and refuges with gates closed, clear arrival, no creature within 7 tiles of the arrival point
  - determinism
  - a 40-district chain with no duplicate unique finds and the gloves first
  - re-resolving a socket returns the committed district
  - tampered districts rejected
  - v1 → v2 save migration
  - every room module's door rule
- `npm run smoke`: **44/44** against the dev server and the **production build** (with the generation worker), on two different random worlds. The new frontier checks cover:
  - the storm drain generating a committed district
  - a secret wall opened and staying open
  - finds collected
  - a frontier exit generating a depth-2 district
  - save → quit → reload resuming inside the district with identical geometry
  - a ladder unbolting a manhole that then works as a shortcut back down
- Lint, typecheck and build are clean.

### Unverified
- Real iPhone feel of the drone fights and long expeditions; save growth over hundreds of districts; thermal behaviour.

### Known gaps
- Generated rooms are more varied now but still simpler than the hand-built ones.
- Only the three tunnel biomes exist so far. The bigger region families (Last Platform, Drowned Ward, gardens), NPCs, the Foundation and the reveal are still ahead.
- Sound is still synthesized. Map custom markers are not built.

### Next actions
1. Owner plays the link: try the storm drain, look for draughty brickwork, find the gloves, come back for the junction in the Cistern Hall.
2. Next pass ideas, pending your feedback:
   - a first new region family (Last Platform), with its NPC and a station-signal mystery
   - more room modules and set pieces per biome
   - map markers and a journal hint ladder

---

## Milestone: M0 + M1 + M2 — first playable slice
**Build:** branch `claude/m0-m2-slice`. The build SHA is shown on the title screen.

### Implemented (playable now)
- **Route:** home (intercom, grandmother's note) → rainy Bracken street → Ivo's yard (pistol, tin targets, a Skitter crawls out of the drain) → laundrette (shelf clue, floor hatch) → Service Veins (amber cable trail, dark Cistern Hall, relay-booth refuge) → Pumping Gallery (pump cover, water channel, unreachable balcony, shotgun locker, relay objective) → return lift to the street → home for the intercom ending of the slice.
- **Optional secret ("humming wall"):** two clues (lint drifting toward a wall seam, plus an airflow diagram), the fan valve and the maintenance panel lead into the **Pipeworks**. That's the **Pipekeeper** mini-boss: hose sweep, straight rush and vent burst; it is stunned by pillars; phase 2 adds floor vents that the pressure wheel can shut. Retreat is possible until you commit, and the arena gate seals after that. Rewards: the **Torch Lens** (wider, longer torch) and a pressure-route journal clue.
- **Combat:**
  - Service Pistol and Pump Shotgun using the trial balance numbers.
  - Facing-weighted aim assist with hysteresis and line of sight, plus a manual drag/mouse override and a visible target marker versus reticle.
  - Swept projectiles; damage applied exactly once.
  - Dodge (42 px, 1.1 s cooldown, i-frames, 0.1 s buffer, visible rejection); interruptible bandage heal.
  - Auto/manual reload, dry fire.
- **Creatures:** Pipe Skitter (flank, crouch telegraph, lunge, recover). Lamp Leech (drawn by a steady torch beam, flees muzzle flashes, latches on and drains you; dodge shakes it off). Local perception plus sound from shots, and BFS pathing around walls.
- **Feedback:** muzzle flash, bloom, sparks, smoke, ejected cases, material-specific impacts, ichor, dust, ripples, rain splashes, lint and dust motes, screen shake (reducible), hit flash, damage vignette, telegraph overlays above the darkness, and synthesized audio for every action.
- **Lighting:** visibility-clipped light mask with torch cone, muzzle flashes, lamps, creature glows and flicker. Flashes reveal rooms but never leak through walls.
- **Persistence:**
  - 3 IndexedDB slots with backups and checksums; autosave every 10 s plus checkpoints.
  - Export/import with full validation, overwrite confirmation and version gating.
  - Same-slot tab lock (read-only second tab).
  - Death keeps map, journal, routes and resolved encounters, and leaves a recovery cache (gentle-death option available).
  - Refuge rest restocks baseline supplies; ordinary encounters respawn, unique ones never do.
- **UI:**
  - Title screen with an animated home view; Continue / New Journey / Saves / Settings / Controls / Credits.
  - Pause menu: Map (explored geometry, pan/zoom), Journal (leads/clues/resolved), Equipment.
  - Context prompts (verb + object), one-time tutorial tips, dialogue box, death screen.
  - Portrait rotate screen; safe-area and left-handed layouts; accessibility settings.

### Assets and licensing
All art is original, deterministic, code-authored pixel art (`tools/art`, manifest in `public/assets/asset-manifest.json`). Font: Pixelify Sans (OFL). Audio is runtime synthesis. No third-party or purchased assets. Coverage and gaps are in `docs/ASSETS.md`.

### Tests actually run
- `npm run typecheck`, `npm run lint`, `npm run build`: clean.
- `npm run test`: **37/37** (simulation, determinism, collision, dodge, exactly-once damage, cover, no aim through walls, telegraph-before-attack, leech/keeper rules, unique pickups; save validation/corruption/future-version/example rejection; light never crosses walls; content validation for IDs, references, reachability, gate setters, fair secret, atlas frames).
- `npm run smoke` (Playwright, 844×390 at DPR 3, touch-enabled): **36/36** against the dev server and against the production preview. It covers path A (full main path plus secret plus boss plus lift shortcut, then save, quit, reload and compare state), path B (death, recovery cache, refuge respawn), path C (hidden tab pauses; input released; explicit resume), path D (portrait pauses; landscape stays paused until resume), and two-finger touch (move plus fire) with touch-cancel releasing everything.
  - Repeat runs: 7 runs, one intermittent failure that I couldn't reproduce or attribute (output wasn't captured). I widened the two timing-sensitive waits afterwards.
- Frame cost (headless Chromium, software GL): JS per frame averages 0.8–1.2 ms in every region, p95 ≤ 1.6 ms, lighting ≈ 0.5–0.7 ms. Headless frame *rate* is meaningless here because it is software rendering.

### Screenshots / evidence
`docs/screenshots/` contains the title, home with touch controls, street, laundrette, refuge booth, humming wall, Pipekeeper fight, relay, death screen, the two-thumb touch test, and the Cistern Hall before and after a muzzle flash (the visual target). The smoke run writes fresh captures to `captures/smoke/`.

### Unverified
- **No physical iPhone testing yet.** Safari touch feel, safe areas around the notch and home indicator, audio unlock, Web Locks, IndexedDB persistence/eviction, Home Screen mode, real GPU frame time and a 20-minute warm-device soak are all unverified. Emulated viewports don't prove device behaviour.
- Thumb occlusion, aim-assist feel, dodge timing, lighting balance and atmosphere need human playtesting.
- Gamepad support and screen readers in canvas gameplay are not supported (menus are DOM with labels).

### Known gaps and blockers
- Art is a strong prototype, not final pixel art. The player has 3 drawn facings rather than 8, and there's no music or designed sound.
- Not built: map custom markers, journal hint ladder, inventory grid and refuge stash, the actual pressure-route shortcut (only its clue), service worker/offline.
- M3 generation (workers, sockets, validators, novelty director) is not started; the slice world is fully authored.

### Next actions
1. **Owner playtest on iPhone 16 Pro Max** using the device test script below; report control feel, readability in the dark rooms, and the flash moment.
2. Focused polish pass: an 8-direction player body and a recoil pose, a second pass on the street and gallery art, designed audio for gunshots and ambience, and map markers.
3. Then M3: seeded generation of one service-veins frontier branch off the gallery, with workers and validators.

### Device test script (about 10 minutes)
1. Serve `npm run dev` on your network (or deploy `dist/`) and open it in Safari, in landscape.
2. New Journey → walk with your left thumb → answer the intercom → read the note on the table.
3. In the yard, pick up the pistol; hold FIRE at the tins, then drag from FIRE to aim by hand.
4. Fight the drain Skitter; dodge when it crouches. Then check: was the warning readable, and could you dodge in time?
5. Laundrette → hatch → in the dark hall, turn the torch off and fire once. Did the flash reveal the room?
6. Lock the phone mid-fight and unlock it: the game should be paused with no phantom shooting. Rotate to portrait and back.
7. Reach the gallery, reconnect the relay, ride the lift up. Force-quit Safari, reopen and Continue: are you in the same place, with the hatch open and the journal intact?
