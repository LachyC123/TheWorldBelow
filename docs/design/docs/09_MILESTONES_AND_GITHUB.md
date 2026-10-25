# 09 · Milestones, implementation tickets and GitHub workflow

## Repository setup
This pack does not require access to GitHub to read. The owner supplies/opens the intended repo in Claude Code. No repo URL was supplied during planning. For a new repo, extract the files into root. For an existing repo, preserve current README/CLAUDE/AGENTS and import design documents under a named folder. Audit before merging instructions. Never replace an existing working implementation merely because the plan suggests a preferred stack.

Recommended branches: a short-lived feature branch per coherent milestone; review before merging. Commit lockfile and content manifests. Ignore node_modules, dist, local secrets, temporary captures and private saves. Retain authored assets only when license allows repo inclusion; use a documented private asset acquisition step otherwise. Keep build outputs reproducible from source and the lockfile.

CI targets after scaffold: npm ci; npm run typecheck; npm run lint; npm run test; npm run validate:content; npm run build; selected browser smoke checks. These scripts are planned contracts, not commands present in this archive. Implement them before citing them as passed. Pin the tested Node/toolchain version and workflow actions when setting up CI.

## M0 — Audit and identity
Tickets: inventory repo and assets; establish commands; verify supported versions; record architecture decisions; create visual contract; produce first finished target room; identify missing/licensed assets; define real-device test access.
Deliverables: PROGRESS.md, asset manifest, architecture notes, actual visual target and gap list.
Exit: coherent art source and a feasible rendering/input plan. Missing production art can permit a labelled prototype, not a polish claim.

## M1 — Movement and sensory prototype
Tickets in order: boot/preload/title; responsive layout/safe areas; pointer ownership; move/collide/camera; two fire modes; one projectile/hit; torch visibility and muzzle flash; one enemy with full anticipation; dodge; damage/death/restart; minimal HUD and audio unlock.
Exit: 5-minute combat room works repeatedly on touch and desktop. Muzzle light reveals nearby room detail without wall leaks; effects remain legible. Restart does not multiply timers/listeners. Capture active gameplay, not just title screen.

## M2 — Complete discovery slice
Tickets: author street/laundrette graph; integrate descent/gallery/refuge; guarantee humming-wall secret; add Pipekeeper and shotgun; implement relay quest and return lift; journal/map; inventory; checkpoint and reload; export/import.
Exit: first-time play reaches objective and returns via a shortcut, can die/retry, finds at least one meaningful optional route, and resumes with world changes intact. This is the first required owner playtest milestone. Show remaining art gaps and ask about control feel, exploration payoff and atmosphere.

## M3 — Persistence and expansion foundation
Tickets: formal schemas; independent RNG streams; region manifests and deltas; worker generation; socket/module rules; graph and geometry validators; unique content reservations; novelty ledger; storage recovery; migration fixture; bounded streaming.
Exit: generate/test 1,000 seeds initially, extend to 10,000 for release; no unresolved reachable-critical-path violations. Walk representative generated regions manually. Save several altered regions, restart, and prove stable topology and state. Benchmark save growth and streaming.

## M4 — Representative world and story
Tickets: add Last Platform and one contrasting region; NPC dialogue/quests; distinct enemy compositions; equipment unlock; multiple clue channels; consequence graph; refuge services; minimised backtracking; secret-chain authoring tool/checker.
Exit: three regions feel different in play, not just palette. Players can pursue different leads and understand their return routes. Main quest cannot be blocked by missing generated requirements. Perform a spoiler-free external playtest where possible.

## M5 — Reveal feasibility and continuation
Build an isolated reveal prototype early enough to validate art/memory cost, then integrate only after story-state prerequisites exist. Tickets: Foundation resolution flags; observation carriage; staged parallax reveal; map scale transition; skip/resume; Quiet Shore route; return connector; lower-world rules and second region.
Exit: every interruption checkpoint is recoverable; reveal is moving and readable at phone size; lower world is genuinely playable. Do not label a cinematic alone as the postgame. Keep test entry separate from normal progression.

## M6 — Content production and campaign assembly
Tickets: author remaining upper families; complete planned boss/weapon/NPC set; integrate long secret chains; verify ecological/power clues; implement ending variants; add lower-region library; audit repeated modules and reward diversity.
Exit: bounded main story can be completed, optional exploration has substantial variety, no mock content or empty mandatory destinations remain. Use measured production rate to revise scope openly. Do not silently reduce the central promise to hit an invented date.

## M7 — Main polish and release gates
Tickets: animation/FX second pass; sound mix; low-effects and accessibility; phone layouts; storage failure UI; touch edge cases; warm-device performance; load budgets; production hosting test; save migrations; credits and licenses; optional PWA/offline only if verified.
Exit: all critical QA checks pass or explicitly block release. Conduct the second required owner review, with evidence, measured performance and remaining limitations. A clean build alone is not release approval.

## M8 — Continuing content
Add authored region packs and secrets using stable IDs and migration tests. Attach only to compatible frontier sockets. Keep old saves usable. Include enough new art, rules and discoveries to justify each pack. No daily chores or paid randomness necessary.

## Issue definition template
Each issue names the player-visible problem, relevant doc section, scope, dependencies, acceptance checks, visual/audio requirement, persistence behaviour, test route and evidence. Mark assets and device testing as real dependencies. Do not close an issue because a class or file exists.

## Review and progress reporting
After each milestone: summarise playable behaviour, controls/run command, actual assets, automated/manual checks, screenshots, performance observations, missing content and next priority. If physical iPhone access is unavailable, label device verification pending and provide a short owner test script. Do not invent device results from Playwright emulation.

## Risk register
Art throughput: highest early risk; approve one room and one full actor animation set before scaling.
Discovery repetition: measure novelty and author contrasting modules; do not multiply empty geography.
Save longevity: pin versions, materialize visited regions, export backups, test upgrades.
Mobile lighting: prototype mask/occlusion early and degrade cosmetics first.
Scope: first release is bounded authored content plus expandable frontier, not every region imaginable.
Narrative reveal: must have playable lower content and maintain the original achievement.
Browser storage/thermal limits: design around finite resources, observe real devices, communicate actual support.
