# 07 · Browser implementation architecture

## Stack decision
Default: TypeScript, Phaser, Vite, schema validation, a lightweight IndexedDB wrapper or explicit typed repository, Vitest for pure systems, Playwright for browser automation. Select exact supported versions at implementation, record them in an architecture decision and lockfile, and use version-matched official docs. No React requirement for the game loop. DOM overlays are suitable for accessible menus, settings and save dialogs. Do not add a heavyweight backend, runtime generative AI, API key or user account to the core game.

Phaser supplies scenes, sprites, tilemaps, animation, input and collision support; custom modules own world graph, discovery, persistence and lighting policy. Prefer ordinary arcade-style movement with deliberate swept projectile collision to general rigid-body simulation. Benchmark the planned render pipeline early. No assertion that all Phaser lights automatically cast suitable shadows.

## Suggested source ownership
src/app: bootstrap, feature detection, lifecycle, settings.
src/scenes: boot, preload, title, world, HUD, reveal.
src/sim: fixed tick, entities, movement, combat, AI, interaction, hazards.
src/world: region graph, chunk streaming, generation, topology validator, novelty director.
src/discovery: secret evaluation, clue journal, quest state, consequences.
src/render: sprites, animation, visibility, light masks, particles, camera.
src/audio: buses, ambience, cue playback, suspension.
src/ui: touch input, DOM menus, map, icons, accessibility.
src/save: repositories, snapshot/deltas, migrations, export/import, recovery.
src/content: typed registry, validated authored definitions.
src/workers: deterministic generation jobs and pure validation.
public/assets: licensed processed atlases/audio with manifests.
tests: unit, generation properties, integration, browser scenarios.
tools: content validation, atlas manifest checks, seed reports.

## Authoritative update order
Input → commands → fixed-step movement/collision → perception/AI → projectile/hazard resolution → interactions and progression → domain events → presentation → render. Use a capped accumulated fixed tick, initially 60Hz with at most five catch-up steps. On hidden tab, pause rather than accumulating hours of simulation. Movement interpolation may smooth render frames. Effects and sound subscribe to immutable events; they never award items or decide boss deaths.

Event examples: WeaponFired, ImpactResolved, DamageApplied, DoorChanged, PowerCircuitChanged, SecretObserved, DiscoveryResolved, RegionCommitted, SaveCommitted. Include stable instance IDs and sequence numbers where exactly-once processing matters. Presentation can miss/rebuild cosmetic state; gameplay cannot depend on a sound ending.

## Streaming
Start with 32×32-tile chunks and a region-level manifest. Load the current room/chunks and a bounded neighbour ring, tune by memory. Prefetch probable exits; use an in-world doorway pause/loading state if assets are unavailable rather than allowing invisible enemies. Keep active entities only within the simulation radius plus threats capable of affecting the player. Return frozen entities to snapshots on unload. Evict atlases/audio by explicit reference counts and a bounded LRU cache; never evict currently used resources.

Generation worker messages carry world ID, region ID, job ID, seed, version and permitted content set. Validate result, reject stale jobs, persist the region, then attach it to the renderer. Worker failure retries with a deterministic fallback and logs a diagnostic without breaking the save. Asset fetches are independent of world state creation and support failure/retry.

## Persistence design
IndexedDB stores settings-independent save slots, world metadata, immutable/materialized region manifests, entity/delta state, discovery flags, inventory, journal, maps and recovery snapshots. localStorage can hold tiny noncritical boot preferences only. A transaction updates related save state together; generation commit and graph attachment must not leave a dangling edge. Keep a last-known-good snapshot and a journal of bounded recent commits, compacted atomically.

Save envelope: saveSchemaVersion, gameBuild, contentManifestVersion, worldId, rootSeed, generatorVersions, createdAt, updatedAt, playSeconds, player, regionIndex, discoveryLedger, storyState, checksums. Timestamps are informational, not secret triggers. Validate types, lengths, ID references and range constraints on import; JSON data is never executable code. Limit import size and show clear unsupported-version errors.

Checkpoint on refuge entry, region transition, unique discovery, boss resolution and major story stage; save inventory/world deltas periodically while playing, initially every 10 seconds if dirty. Save on visibility change when possible, but never rely on unload handlers to finish an asynchronous transaction. Snapshot simulation state consistently before enqueueing a write. Serialize writes and display Saved only after commit. On quota error, preserve the last valid save, stop unsafe progression if necessary and offer export/retry; never clear saves to make room for textures.

Browser storage can be evicted or cleared. Request persistent storage where available, show actual capability/result without guaranteeing permanence, and ship manual export/import early. Three rotating local snapshots do not protect against whole-origin eviction. Encourage backup after meaningful progress without nagging. Cloud sync is a future separately scoped feature, not claimed implemented. A hostname/origin change requires explicit save export/import or a planned migration.

## Growth without storage explosion
Keep a compact region index and compressed explored-state/deltas. Materialized visited geometry takes storage, so profile its growth against 100, 1,000 and 10,000 generated districts using synthetic fixtures. Do not promise an infinite save on finite storage. Expose storage usage in save management and permit archiving whole worlds through export. Never prune discovered unique state automatically. Decorative ephemeral state need not persist; regenerate it with a local pinned seed.

Content updates pin old region generation and preserve manifests. Missing content IDs use explicit migration/substitution with a backup, never silently erase an inventory. Add new territory at reserved sockets. Service worker updates wait for a save-safe pause; do not swap code under active play. Asset manifests use immutable hashed paths. Keep schema-compatible deployment rollbacks; old application code must reject newer saves safely rather than corrupting them.

## Lifecycle and platform behaviour
Handle resize, browser chrome changes, safe areas, orientation, context loss, hidden tab, interrupted audio, lost pointer capture and network loss. Pause on interruption and require deliberate resume. Feature-detect storage/audio/rendering capabilities. No haptics required for basic feedback. PWA install guidance is optional and browser-specific; never make ordinary play depend on installation. Offline support is a later verified feature: only cached territories/assets are available unless a defined content pack has finished downloading. No unconditional offline promise.

## Performance targets and measurement
Aim for stable 60fps on the owner's recent iPhone, with a deliberate 30fps low-quality mode on slower tested devices. Initial internal budgets: game frame p95 <=20ms in high mode, no sustained >33ms spikes; input response visible within about 100ms under load; initial compressed transfer ideally <=12MB excluding optional audio/content; subsequent region packs loaded as needed. These are targets requiring profiling, not compatibility guarantees.

Measure CPU simulation, render, draw calls, active objects, texture memory estimates, worker latency, asset bytes and save duration. Safari may not expose reliable total memory: do not invent readings. Run a 20-minute combat/travel soak to detect heat-related slowdown. Adapt cosmetic particles, dynamic lights, render resolution and ambience voices before reducing threat readability. Avoid per-frame allocations and DOM layout churn. Prewarm pools and keep offscreen map rendering bounded.

## Hosting
Static hosting is sufficient for v1: serve production build over HTTPS with correct module/asset MIME types. GitHub is source control, not automatically a running website. GitHub Pages is an optional host; for project subpaths configure Vite asset base and router paths, and test a production preview under that prefix. A simple app with no route changes avoids deep-link rewrites. Deployment requires the owner's selected host and appropriate authorization; the pack itself does not deploy anything. Never place private keys or license-restricted source assets in public build output.
