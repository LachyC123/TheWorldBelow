# Repository instructions — THE WORLD BELOW

Read docs/design/README.md and the relevant numbered docs in docs/design/docs before coding. The original design pack lives unmodified in docs/design (see docs/design/MANIFEST.json). Respect the owner's latest explicit decisions.

## Non-negotiable identity
- Browser game, iPhone Safari first, landscape, keyboard/mouse second. Do not substitute a native Unity build, desktop-only game, generic roguelike, industrial sim, or one-file demo.
- Exploration is the primary reward. The upper world leads to a genuine narrative resolution and a spectacular playable deeper-world reveal.
- Preserve discovered places and opened shortcuts. Never regenerate a visited region silently after an update.
- Crisp coherent pixel art, expressive animations, atmospheric detail, rich particles, and meaningful room-revealing muzzle light. Generic rectangles are temporary debug art, not an acceptable polished result.
- Simple controls: move, assisted/manual fire, dodge, contextual interaction. Avoid adding buttons for every system.
- No claim of literally infinite unique bosses, ten years of content, or polish without evidence.

## Execution rules
1. Inspect repo, AGENTS/CLAUDE guidance, package lock, assets, existing functionality, and errors. If empty, scaffold the chosen stack. If already viable, preserve it rather than migrating automatically.
2. Produce an asset inventory with licenses, missing-art list, a one-page charter, and one finished visual target room. Do not buy assets or claim generated sprites are animation-ready without inspection.
3. Default stack: TypeScript + Phaser + Vite; choose and pin a currently supported stable combination from official docs at implementation time. Do not mix APIs from different Phaser versions. No runtime LLM/API needed.
4. Implement one complete slice: control, objective, threat, feedback, failure, restart, save. Do not implement every region superficially.
5. Keep simulation separate from effects. Use stable content IDs, seeded local RNG streams, schemas, versioned saves, explicit lifecycle cleanup, bounded caches, and worker cancellation.
6. Test in the running game, including touch ownership and pause/resume. Desktop viewport emulation alone does not prove real iPhone Safari works.
7. At first playable and main polish milestone, provide screenshots/video where available, exact controls, checks, known gaps, and one focused review request. Do not halt for every reversible implementation choice.
8. Preserve user content and working features. Make small reviewable commits. Never embed keys. Never force-push, rewrite history, or deploy without scope/authorization established for those actions.
9. Update PROGRESS.md after each milestone. Separate implemented, proposed, tested, and unverified. If blocked by missing art or devices, state exactly what remains and continue independent work.
10. Never fake depth through unimplemented map labels, inaccessible promised regions, changing counters, or identical bosses recoloured at higher health.

## Prioritisation
P0: save integrity, input, readable combat, beautiful first room, meaningful discovery.
P1: complete slice, generation validity, authored secret chain, asset loading and measured performance.
P2: representative deep-world reveal prototype, several regions, broader content pipeline.
P3: release content, optional bosses, accessibility polish, offline caching, continued expansion.

Avoid multiplayer, base building, survival hunger/thirst, full destructible terrain, procedural pixel-art generation at runtime, or monetisation unless the owner explicitly adds them.

## Repository layout (implementation)
- `src/` game source (see docs/ARCHITECTURE.md for ownership), `tools/art` build-time pixel-art authoring (writes `public/assets`), `tests/` Vitest, `tools/smoke.mjs` Playwright browser smoke.
- Commands: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run validate:content`, `npm run art`, `npm run smoke`.
- Regenerate art with `npm run art` after editing `tools/art`; never hand-edit generated PNGs.
- Content IDs in `src/content` are persistent save keys: never rename or reuse them.
