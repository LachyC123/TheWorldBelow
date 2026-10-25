# 10 · QA and acceptance gates

This document defines tests for the future game. The archive itself has been checked as a document/data handoff, not tested as a playable implementation.

## Severity
P0: corrupted/lost saves, impossible critical path, stuck controls, crash, invisible damaging threat, broken restart, unlicensed required asset. Blocks release.
P1: frequent performance failure, unreadable UI, major repetition, inaccessible key interaction, incorrect story/secret state. Blocks claiming polish.
P2: minor cosmetic defect, rare nonblocking clipping, optional variation gap. Track with reproduction and scope.

## Essential end-to-end paths
A. Fresh slot → tutorial → pistol fight → gallery discovery → relay → lift shortcut → refuge → save → reload. Compare position, equipment, door state, journal, map markers and secret flags.
B. Lose to ordinary enemy → death UI → return → recover cache → win → reload. No item duplication or permanent loss of essential tools.
C. Hold move/fire → switch app → return → release fingers → resume. All inputs reset; no phantom shooting.
D. Rotate during combat and during menu → safe paused layout → landscape → explicit resume. No damage while paused or button under browser chrome.
E. Export world → import into different empty slot → compare checksums/critical state → reject malformed/unsupported file without touching original slot.
F. Generate frontier region → mutate it → install content update → return. Geometry, unique rewards and shortcuts remain stable; new content appears only in valid new locations.
G. Complete Foundation → interrupt/reload at every reveal stage → finish/skip → enter Quiet Shore → return upper world. No duplicate reward, missing bridge or story rollback.

## Input matrix
Two simultaneous touches, fire drag beyond button, movement finger crossing UI, pointer cancel, lost capture, quick tap, long hold, third accidental touch, thumb near screen edge, left-handed layout, control resize, menu opening while firing, UI closing while pointer held. Verify selection target hysteresis and manual override. Test fire aim near a wall and explosive object; no unintended auto-targeting through cover.

## Readability and art
Inspect screenshots and motion at 667×375, 844×390 and 932×430 CSS viewports, plus actual device viewports rather than assuming they match these values. Test Safari browser mode with chrome visible and Home Screen mode if supported. Check safe areas on both landscape rotations. Inspect dark room, bright garden, water, boss, heavy particles, map and inventory. Confirm attacks remain visible with reduced flashes, low FX and colour-vision-friendly settings. Standard text remains readable without zoom.

## Generation properties
For a seed fixture set: identical seed/version → identical topology/content allocations; decoration edits do not change layout; unique encounter reserved at most once; main path exists; dependencies are acyclic or have intentional solvable loops; key before lock; safe spawn free; exit clearance meets controller size; no invalid sockets; no secret clue behind its own gate; resource fallback exists; stale worker job cannot attach to another world. Include adversarial small rooms and heavily constrained biome sockets. Persist failing seeds and minimal reproductions.

## Save fault tests
Abrupt tab termination after checkpoint; interrupted region commit; quota error; unavailable storage; corrupted latest snapshot with valid backup; missing content definition; old schema; future schema; duplicate IDs; huge import; simultaneous tabs opening same slot; interrupted migration; service worker update during write. Implement a same-slot lock or explicit read-only/transfer-ownership flow so two tabs cannot silently overwrite each other. Keep user's export intact after import failure.

## Combat tests
Sweep bullets at max configured velocity; point-blank attack against walls; dodge into corners; hit stun at same tick as death; reload cancel/switch; no ammo; all targets offscreen; enemy path blocked by door; boss phase interrupted by death; explosion behind wall; simultaneous projectile impacts; actor unload/reload; pause during telegraph. Damage application is exactly once; presentation can be rebuilt.

## Performance tests
Measure real active play: combat plus muzzle lights and particles, region streaming while moving, map with many discovered regions, large save write, reveal, and 20-minute warm-device soak. Record device/browser/OS, build SHA, quality settings, frame-time distribution, long tasks and accessible memory/texture estimates. Do not report inaccessible memory metrics as measured. Compare low/high modes for information parity. Ensure bounded entities/listeners/particles across ten restarts and fifty region transitions.

## Content and narrative QA
Main path has all clues and rewards even when optional branches are ignored. Optional chain remains solvable if started late. NPC dialogue reflects actual power/water/story state. Essential NPC safety is clear. Ending outcomes match actions. Original story resolution remains valid after reveal. Missing train can be summoned again. No required wall-clock event or audio-only puzzle. First secret teaches observation rather than brute-force wall attacks.

## Automated versus manual evidence
Automated: type/build/lint, schema references, deterministic generation, progression/save transitions, UI bounding boxes, screenshots, scripted main path, error logs. Manual: perceived beauty, aiming feel, suspense, landmark memory, discovery satisfaction, real thumb occlusion, real Safari interruptions and thermal slowdown. Neither substitutes for the other.

## Release sign-off
Require actual gameplay evidence for objective/failure/restart, save/import/migration, touch/device matrix, content/license inventory, performance under intended effects and a completed post-reveal route. List known limitations plainly. Never write “fully polished” while core rooms are placeholder tiles, enemy attacks lack animation, unexplored regions are empty, or device tests remain unperformed.
