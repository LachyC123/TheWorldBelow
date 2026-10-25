# THE WORLD BELOW
## Claude Code browser-game production pack · v1.0 · 25 October 2026

A beautiful, mysterious pixel-art exploration shooter for iPhone browsers, with frightening depths, persistent discoveries, and an apparent ending that reveals the extraordinary scale beneath the known world.

**This archive is a design and implementation handoff, not a playable game or an asset pack.** It contains the complete proposed direction, implementation contracts, example data, acceptance gates, and prompts for building incrementally in your GitHub repository. No repository has been created or modified on your behalf.

## Start here
1. Extract this ZIP on your development computer. On iPhone, download to Files and tap the ZIP to extract it; repository setup is easier on your computer or a connected coding environment.
2. For an empty repository, copy this folder's contents into its root, commit, and push. For an existing repository, put these documents in a dedicated design folder and merge the guidance in CLAUDE.md with existing instructions; do not overwrite existing code or guidance blindly.
3. Connect/open that repository in Claude Code. Paste START_HERE_PROMPT.md.
4. Claude should first audit the repo and assets, then produce the visual contract and the first playable slice. Review those before authorising the next large milestone.
5. Keep the finished implementation and docs in the GitHub repo. Use small commits and preserve the lockfile, content IDs, and save migrations.

## What is settled
Browser-based, single-player, landscape, iPhone-first, desktop supported. Top-down pixel art. Beautiful and mysterious overall, frightening in selected regions. Punchy survival shooting with lots of purposeful particles and room-revealing muzzle light. Simple touch controls. Light survival pressure, not repetitive chores. Persistent interconnected world. Meaningful personal story, real resolution, then a playable scale reveal and continued exploration. No industrial-management or turn-based mode.

## What is proposed
Names, characters, exact story events, region counts, enemy designs, combat numbers, and schedules below are concrete proposals to make the project buildable. They may be tuned without discarding the settled pillars. All numerical budgets are initial targets, not measured claims. A decade of unseen authored content cannot be guaranteed; the design supports open-ended geography, systemic surprises, optional secrets, and continuing content additions.

## Reading order
- docs/01_VISION_AND_SCOPE.md — player promise and production tiers.
- docs/02_WORLD_AND_DISCOVERY.md — persistent generation and discovery architecture.
- docs/03_STORY_AND_REVEAL.md — narrative, NPCs, quests, ending and continuation; spoilers.
- docs/04_COMBAT_AND_PROGRESSION.md — survival, guns, enemies, bosses, rewards.
- docs/05_IPHONE_CONTROLS_AND_UI.md — input, tutorial, screens, icons and accessibility.
- docs/06_ART_AUDIO_AND_EFFECTS.md — asset specifications, pixel art, dynamic lighting and sound.
- docs/07_BROWSER_ARCHITECTURE.md — systems, workers, persistence, hosting and performance.
- docs/08_CONTENT_BIBLE.md — concrete regions, secrets, weapons and encounter seeds.
- docs/09_MILESTONES_AND_GITHUB.md — ordered tasks and repository workflow.
- docs/10_QA_AND_ACCEPTANCE.md — evidence required before completion claims.
- docs/11_CONTENT_AUTHORING_AND_LIVE_GROWTH.md — expansion without endless sameness.
- docs/12_TECHNICAL_SOURCES.md — primary technical references and verification notes.

CLAUDE.md contains implementation instructions. examples/ contains illustrative contracts and valid JSON seeds; none is production-ready game code. templates/ contains reusable review and content templates.

## First build in one sentence
Walk down a beautiful rainy street, enter a laundrette, descend unexpectedly far, use muzzle light during a readable fight, discover a concealed encounter, restore a lift, return to the familiar street, save, and resume on iPhone.
