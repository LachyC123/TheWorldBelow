# THE WORLD BELOW — Complete Master Plan

Version 1.0 · 25 October 2026

Design handoff for Claude Code. Not a playable build.

See README.md for repository setup and START_HERE_PROMPT.md for the initial instruction.


---

# 01 · Vision, charter and scope

## Player fantasy
I am a small, capable explorer in a beautiful place that keeps exceeding my understanding. Ordinary spaces lead somewhere extraordinary. Every expedition may reveal a route, creature, object, community, or rule I did not know existed.

Core loop: prepare at a refuge → follow a clue or curiosity → navigate and fight → discover something meaningful → open a return route and preserve knowledge. Expeditions can end after 5–15 minutes at frequent suspension points, while longer sessions support sustained journeys. These are pacing targets, not timers imposed on play.

The defining relationship is between knowledge and geography: understanding the world opens routes that raw damage upgrades cannot. The defining sensory event is a gunshot briefly revealing more space than the player knew was there.

## Three pillars
1. Beautiful uncertainty: each region has recognisable visual identity, quiet life, and something unexplained.
2. Persistent discovery: places and consequences survive leaving, dying, saving, and ordinary updates.
3. Simple action, deep decisions: touch controls are learnable quickly; positioning, equipment, attention and route knowledge create mastery.

Reject generic neon dungeon rooms, muddy unreadable darkness, endless numerical loot, forced daily logins, chore survival, and decorative promises of inaccessible worlds. Horror is a contrast used in specific depths, not the only emotional register.

## What unlimited means operationally
The game can create more valid territories at its frontier using persistent seeded generation. A finite library supplies authored rooms, behaviours, discoveries and bosses. These can combine in many ways, but combinations are not automatically meaningful novelty. Further authored content packs grow the library over time. Systemic outcomes produce additional stories without requiring an authored quest for each.

Do not market a mathematically large seed count as a content count. Do not guarantee any player will spend ten years without exhausting novelty. There is no final geographical boundary required by the design, but browser storage, finite production capacity and diminishing variation are real constraints. Avoid empty procedural miles: when the novelty pool is thin, offer a clear alternate region or a return route rather than endless filler.

## Production tiers
| Tier | Concrete scope | Release meaning |
|---|---|---|
| First slice | One street, laundrette, service descent, pumping gallery, one refuge, two enemies, two guns, optional mini-boss, return lift | Tests the promise; not the full game |
| Representative alpha | Three connected upper regions, several authored secret chains, controlled generated branches, real save migrations, a small isolated reveal test | Validates depth and production pipeline |
| Campaign release candidate | Six upper-region families, personal story resolution, scale reveal, at least two substantial playable lower-region families, supported expandable frontier | Complete bounded story with continued exploration |
| Continuing growth | Additional region kits, mysteries, enemy families, optional bosses and interactions | Adds actual novelty to existing saves |

Proposed campaign content targets, to revise after the slice's measured production cost: 80 authored room modules, 18 landmark/set-piece rooms, 24 secret chains, 12 regular enemy archetypes, 8 boss encounters including optional ones, 10 weapon archetypes, 6 named NPCs. Modules may span multiple rooms; targets are not claimed delivered assets. Two lower region families must include real travel, encounters, discoveries and return paths, not a two-minute epilogue.

## Asset-first production
No art pack has been supplied. Asset acquisition is a real project task. Select or commission a coherent core pack, create missing bespoke art, and keep license receipts. Source art, animation atlases and audio are not included in this ZIP. Produce one approved visual room before building dozens of rooms around unsuitable art. Programmatic geometry may test logic but cannot satisfy the final art gate.

## Development assumptions
Solo player, local-first saves, no account requirement, no backend necessary for core play. Landscape browser orientation with a portrait pause/rotate screen. Optional installable web-app shell later; ordinary Safari remains supported. No mandatory fullscreen capability. Intended device baseline: test on a real iPhone 12-class device and the owner's iPhone 16 Pro Max, then publish an honest tested support matrix.

## Success signals
A new player understands movement and shooting without verbal coaching. A screenshot is recognisably this game. Players remember routes by landmarks. A first-time player discovers a meaningful optional space within the slice. Re-visiting is satisfying rather than tedious. A save resumes with opened doors and discoveries intact. Players understand why damage occurred. The reveal provokes curiosity and leads immediately into playable territory.


---

# 02 · World structure and discovery engine

## Three cooperating layers
The authored spine contains story-critical settlements, landmarks, boss arenas, unique secrets, and fixed logical connections. Seeded territories expand between and beyond anchors using curated topology and room grammars. Systemic interactions connect power, sound, light, water states and inhabitants. None of these replaces the others.

Use a region graph rather than one massive tilemap. Nodes are persistent districts. Edges are doors, stairs, tunnels, lifts, rail routes or traversable boundaries. Each region has a local room graph and tiled geometry. Floors are graph relationships, not a promise that all areas fit on a literal vertical Cartesian stack. Geography must still be plausible enough to explain shared water and power systems.

A district must contain: arrival landmark; at least one understandable route forward; optional risk/reward route; recovery space; a distinct environmental rule; discovery; and a return route or safe retreat. Larger districts contain loops. Design geometry around sightlines, cover, retreat and the phone's camera framing before decoration.

## Upper macro graph
Surface town connects to service tunnels through several entrances. Service tunnels connect to transit platforms and the pumping network. Transit reaches the underground gardens. Pumping routes reach the drowned district. Both gardens and drowned district lead to the buried civic quarter. The civic quarter leads to the Foundation. Cross-links open progressively; a station-to-surface lift and gardens-to-service freight line reduce backtracking. The Foundation observation carriage crosses the reveal boundary into the lower expanse.

Not every branch is available immediately. Gates are machinery, environmental hazards, knowledge, relationships, or tools; do not fill the world with colour keys. Each mandatory gate has a guaranteed obtainable solution. Optional gates can have multiple solutions. Do not require a rare random drop for main progression.

## Generation pipeline
1. Allocate a stable region ID at an allowed frontier socket. Store seed, generator version, content version and parent connection.
2. Select biome using the macro graph and transition constraints, never unrestricted random biome roulette.
3. Build a role graph: arrival, orientation, tension, choice, reward, rest, landmark, exit. Insert optional loops and secrets according to budget.
4. Place authored modules with typed sockets and verified rotations. Never mirror text, handed puzzles, animation or baked light carelessly.
5. Reserve story footprints, clue locations, unique rewards, safe spawns, and return route before filler encounters.
6. Add encounter compositions using visibility, traversal and resource budgets. Add authored prop vignettes before minor random scatter.
7. Validate geometry and state dependencies. Repair locally or reject with a deterministic retry seed. Cap retries and fall back to a known-good district; log failures in development.
8. Commit the region manifest atomically before allowing entry. Save map deltas as actions happen. Never regenerate a discovered region from a newer algorithm.

Keep independent RNG streams for topology, encounters, decoration, loot and audio variation. A new decorative plant must not change a boss or a corridor. Generate near the frontier in a worker, not synchronously during a dodge. Workers return serializable data, never live engine objects. Canceled jobs cannot commit stale results after a world switch.

## Module metadata
Each module declares footprint, walkable mask, connection sockets, door orientations, biome tags, difficulty band, role, landmark tags, uniqueness group, enemy compatibility, occlusion segments, navigation clearance, interaction slots, reward slots, and transformation permissions. Secret rooms have explicit clue hooks and entry solutions. Module validation rejects unreachable exits, ambiguous collision seams and invalid rotations.

## Novelty director
Track seen module IDs and variants, recent region roles, encounter compositions, secret categories, landmark families and reward types. Weight unseen candidates, suppress recent repetitions, and separate unique one-time encounters from repeatable events. Start with no repeated landmark within a district and no identical encounter composition in the last five combat rooms. If the pool cannot obey constraints, relax decoration variety first, then ordinary encounter variety; never duplicate a unique boss or break story consistency.

The director can guarantee opportunities, not player discoveries. Seed a clue-bearing room along plausible routes after a player explores several districts without a major discovery. Do not teleport objects into an already observed room or silently move the secret to chase the player. Persistent placements occur when new territory is committed. Expose novelty metrics to developers, not a global completion percentage to players.

## Secret contract
Every substantial secret needs: an authored premise; at least two useful clue channels; achievable entry conditions; an explicit resolved state; a reward that changes knowledge, access, play or emotional understanding; persistence; and a recovery path if clues/items are missed.

Clue channels include architecture, sound with visual equivalent, documents, NPC testimony, machine response and creature behaviour. A clue may be subtle but must survive ordinary readability settings. Colour alone, perfect hearing, real-world calendar dates, several hours of idle waiting, and datamining are not required solutions.

Rare situations are generated from compatible conditions, not vanishingly small probability. Once a player begins a long chain, guarantee that its required components remain obtainable in that world. Unique rewards are never consumed irreversibly to solve another mandatory gate. Add an optional journal hint ladder after repeated revisits: observation → region suggestion → actionable clue, each requested by the player.

## World persistence and updates
Store generation manifests for visited regions plus persistent deltas: doors, switches, water state, unique enemies, discoveries, inventories, NPC outcomes, shortcuts and dropped recoverable supplies. Unvisited reserved regions can retain seed plus pinned generator/content versions. If future versions cannot reproduce old seeds reliably, preserve materialized geometry or a compatible old generator; do not assume a seed alone is sufficient.

New content attaches to unused sockets or an explicit in-world event. Never overwrite explored tiles. Store provenance and dependency versions. If a new connector becomes available in an existing region, introduce it visibly and preserve previous routes. Compatibility migrations must be reversible from a backup.

## Simulation boundaries
Only nearby chunks simulate active combat. Distant regions store state, not thousands of running NPCs. Power/water consequences use a bounded dependency graph evaluated on actions and entry. Do not simulate ten years of events on resume. Restocking is limited and explicit; unique discoveries, boss deaths and destroyed one-off props persist. Predictable refuge supplies prevent a depleted world from trapping the player.

## Validation invariants
Every committed district connects to its parent; required objectives are reachable with obtainable capabilities; there is a retreat or explicit safe exit; unique IDs cannot duplicate; clues cannot be placed behind their own required gate; boss arenas include legal movement space; no enemy spawns on the player; mandatory loot is not inside invalid collision; resource scarcity never makes escape logically impossible. Test thousands of seeds in headless graph/geometry validation, then manually inspect representative extremes in the running game.


---

# 03 · Story, characters and the apparent ending

## Theme and boundaries
What do we owe the people and places the world has forgotten? The underground is real within the fiction. Avoid an ending that dismisses exploration as a dream or reduces every monster to a mental-health metaphor. Give neglected communities humour, ordinary routines, disagreement and agency. The player is an explorer, not a predestined ruler of everything below.

## Proposed premise
An intercom in your inherited home receives a message despite having been disconnected for decades. The caller, Mara Venn, knows your grandmother's name and asks you to reconnect a relay beneath the laundrette. Your grandmother worked on the Upper Habitat isolation network. Her decision helped contain a spreading failure but stranded communities. Records disagree about how much she knew.

Mara is a living relay keeper, not a supernatural narrator. Her knowledge is local and incomplete. She believes the Foundation is the bottom because that is the limit of her maps. She needs help restoring communications, not the entire world's power at any cost.

## Story progression
Act I, The Wrong Address: explore home, follow cable markings, reach Mara's outpost, discover habitation below. The initial mystery is answered partially: the line works because an old emergency circuit has returned. Offer a meaningful optional secret before the first formal task ends.

Act II, The Severed Lines: reconnect transit, gardens and pumping districts. Learn that reconnection affects real communities. Each relay quest offers a comprehensible local choice: quiet bypass versus noisy restoration, preserve a habitat versus divert its supply. Choices change local states, not hidden morality points.

Act III, The Foundation: obtain access through repaired routes and evidence. Reach the coordinator chamber, confront the Warden Engine, and resolve the isolation system. Record exactly which communities are connected, protected or still isolated. Mara's voice becomes one of several voices. The player's original task concludes.

Aftermath: quiet walking time, messages from known characters, and a real return opportunity. The player may visit home before taking the newly activated observation lift. Ending outcomes differ in who can communicate and which routes operate; none destroys the playable world. Optional discoveries can offer better routing choices without making an uninformed player irreversibly ruin the save.

## Named NPC proposals
| NPC | Role | Behaviour and personal thread | Mechanical contribution |
|---|---|---|---|
| Mara Venn | Relay keeper | Repairs small radios; wants to hear her brother's district again | Main anchor; radio and route guidance |
| Ivo Reed | Surface caretaker | Tends empty homes rather than calling them abandoned | Refuge stash, recognisable homecoming |
| Sella Moss | Garden technician | Collects obsolete plant labels and invents new names | Filter tool; habitat-preserving bypass |
| Orin Vale | Transit signaler | Maintains a timetable with destinations he has never reached | Rail shortcuts; missing-platform clue |
| Nemi | Drowned-district courier | Leaves dry parcels above flood lines | Breathing equipment route; reservoir clues |
| The Surveyor | Lower-expanse traveller | Measures structures nobody remembers building | First post-reveal orientation, no omniscient exposition |

NPC tasks are authored state machines. Do not require an AI language service. Dialogue is short, skippable, journalled where useful, and never runs through urgent combat. NPCs have visible idle/work animations. The player cannot accidentally shoot an essential quest out of existence; weapon safety engages in clearly communicated refuges.

## Reveal sequence: Upper Habitat
1. Foundation resolution sets storyResolutionCommitted and saves a safe checkpoint. Radios celebrate or cautiously reconnect according to outcomes. No fake shutdown, corrupted save message, or deceptive system UI.
2. Observation access activates. An understated sign says FOUNDATION ACCESS — OBSERVATION. It appears to be a final viewpoint.
3. Inside the carriage, initial scenery uses familiar pipework. Descend past its supports; then the architecture ends.
4. The player can move a few steps inside. Outside lights pass slowly, creating scale without excessive duration. Target 60–100 seconds for the whole controlled descent, tune through playtesting.
5. Radio reception falls away. Music thins. A maintenance sequence illuminates progressively distant structures with carefully authored parallax and pixel-art silhouettes.
6. Reveal the carriage descending the exterior of an immense inhabited structure. Weather-like clouds and other illuminated structures imply depth, but named accessible destinations correspond to actual content.
7. Pull the camera back in controlled stages. Keep the carriage identifiable with its warm window. The previous regions appear as a small connected upper cluster, not a literal replay of all tilemaps.
8. Open a dedicated map-reveal composition. Retain player markers inside the zoomed cluster. Label it UPPER HABITAT. Show only a few incomplete lower silhouettes, no completion percentage or hundreds of empty icons.
9. Restore normal camera at the landing. Doors open. The player steps into the Quiet Shore and meets a new environmental rule. A genuine route extends beyond the landing.
10. Unlock a reliable return link after arrival, save, and resume normal exploration. Main credits can be viewed from the journal/menu or after the resolution; they must not interrupt the central reveal.

## Technical staging and recovery
Preload reveal atlases before boarding. Use a small cinematic scene, layered art, and controlled camera; do not load the entire world to show its scale. Store discrete reveal stages with idempotent transitions. On interruption, resume at the last safe stage or offer Resume descent/Skip to arrival after assets load. Skipping commits exactly the same world flags once. Never duplicate rewards or leave the player outside geometry. Reduced-motion mode replaces the large zoom with successive framed views; reduced-flash mode retains the light sequence without abrupt peaks.

Use first-play discovery as the default. No early developer labels revealing lower-region names in normal UI. Debug tools can access all scenes but are excluded from production. Browser source can be inspected; absolute spoiler secrecy is not enforceable in a client-distributed game.

## Post-reveal purpose
The original story remains complete. Exploration is voluntary: investigate lower societies, track mysteries, acquire traversal tools, chart new regions, or revisit old ones. No arbitrary level reset, lost equipment or inflated health wall. Lower threats introduce rules rather than simply multiplying damage. The Quiet Shore must contain a refuge, optional mystery, distinct fauna, real route choices and an accessible return route at launch. The second lower family, Bellglass Wilds, proves the reveal opens a world rather than one scenic room.


---

# 04 · Combat, survival, progression and failure

## Feel target
Responsive movement and short, decisive encounters. Shooting feels physical through animation, sound, impact and environmental response. This is not Soulslike difficulty or a horde-survival game. Quiet travel, curiosity, social spaces and environmental problem-solving occupy substantial time. Difficulty comes from readable combinations, positioning and expedition choices.

## Starting balance hypotheses
All units below use a 16-world-pixel tile; tune on-device. Player speed 90 world pixels/second; diagonal movement normalised. Dodge travels about 42 pixels over 0.24 seconds, cooldown 1.1 seconds, initial invulnerability trial 0.12 seconds. Dodge collides with walls and cannot cross locked doors. Buffer dodge for at most 0.1 seconds; never queue repeated dodges indefinitely. Player health starts at 100. Common enemy hit 12–20, common threat attack warning 0.45–0.8 seconds. Do not conceal attacks behind particles or spawn enemies into an already committed hit.

Pistol trial: 8 rounds, 0.25 seconds between shots, 1.1-second reload, 20 damage against ordinary unarmoured targets. Common weak enemy 40 health. Pump shotgun trial: 4 shells, 0.8-second cadence, 1.6-second reload, pellets with a bounded close-range total damage. Numbers are test baselines, not final balance. Firing immediately consumes ammo and emits one authoritative event; animation callbacks never own damage.

## Combat rules
Aim assistance selects visible hostile targets in a facing-weighted cone. Weight angular error, distance and immediate threat, with hysteresis so targets do not jitter. Never aim through walls, select neutral wildlife by default, or silently target explosive scenery. Manual drag overrides assistance immediately; releasing fire ends shooting. A visible target marker distinguishes acquired target from manual reticle.

Fast bullets use swept collision tests to avoid tunnelling. Slow special projectiles are fully simulated and readable. Resolve nearest valid hit, cover, shield and material response consistently. Damage events contain source, target, amount, hit position, direction and material. A hit on armour has different sound and sparks from a hit on flesh. Shots do not need gratuitous gore; impact readability is more important.

Sound propagates over room connections with material attenuation, not an omniscient global radius. Nearby creatures can investigate a last-heard position. Light-sensitive creatures react to a perception signal from illumination, with cooldowns, not every visual particle. A shot can reveal enemies but does not universally aggro the entire region.

## Weapons and inventory
Two equipped weapons, one healing item, one equipped utility, 12 ordinary inventory slots initially. Quest knowledge and essential keys occupy a separate permanent collection. Ammo pools are modest and clearly labelled; avoid twelve nearly identical ammunition types. Start with light rounds, shells and special charges. Reserve capacity tuning until touch readability is proven.

Weapons have authored identities: pistol for reliable precision, shotgun for close interruption, flare launcher for persistent light and area denial, coil carbine for conductive interactions, suppressed utility weapon for lower sound, rivet launcher for heavy stagger. No random +0.7% affix spam. Attachments change choices: wider flashlight cone versus longer range, tight choke versus spread, reduced noise versus lower impulse. Keep two meaningful attachment slots per weapon at first.

Utility tools unlock capabilities: breathing mask, insulated gloves, signal receiver, line launcher. Tool use is contextual where possible. Environmental puzzles indicate why the equipped capability matters. Mandatory tools have guaranteed acquisition and cannot be permanently sold/lost. Duplicate utility rewards become useful supplies or alternate discoveries, never a broken quest.

## Survival pressure
Ammo and healing matter; darkness and hazards influence routes. No hunger, thirst, periodic food chore or weapon durability in v1. Basic torch does not exhaust; finite flares are tactical resources. Dangerous submerged routes use a visible breath meter with generous retreat warning; safe surface water does not. Filters are capability upgrades rather than a constant tax. Rest areas replenish a limited baseline of basic supplies so players cannot run out of every means of progression.

Health recovery has a short interruptible use animation, trial 1.2 seconds, and is cancelled by dodge or damage. Show the exact held item and quantity. No accidental healing from tapping adjacent ammo UI. An optional auto-heal setting can be considered after manual use is proven; it is not a required hidden behaviour.

## Progression
Progress is access, knowledge, equipment identity, and useful capacity rather than endless level inflation. Early pistol remains viable with skill. Major discoveries may grant: a shortcut, environmental tool, alternate weapon behaviour, refuge service, clue connection, new destination or narrative resolution. Materials pay for clear upgrades at refuges; no production management.

Map knowledge, journal entries, permanent tools, shortcuts and resolved bosses persist through death. On death, respawn at last refuge, keep equipped weapons and essential items, and leave a recoverable portion of unbanked ordinary supplies. Only one recovery cache: on another death, merge recoverable supplies up to a documented cap or return part to refuge; do not silently delete a unique discovery. Offer a gentler option retaining all supplies. Enemy reset policy is explicit: unresolved ordinary encounters may return after refuge rest; bosses and unique events stay resolved.

## Enemy lifecycle
States: dormant/patrol → suspicious → investigate → engage → telegraph → act → recover → search/return or dead. Keep perception local. Unreachable targets trigger reposition/search, never wall attacks. Every attack needs an identifiable silhouette, audio cue with visual equivalent, hit window, recovery and counterplay. Freeze off-region actors into persistent snapshots. Defeated unique actors remain defeated.

Initial enemies: Pipe Skitter flanks and lunges after crouching; Lamp Leech reacts to sustained light and retreats from brief flashes; Watchman Drone sweeps a visible beam and fires after locking; Drowned Carrier makes slow, wide attacks and disrupts cover. Each is introduced alone in favourable learning conditions before combinations.

## Boss design contract
A boss has a memorable arena, discovery route, three or four readable verbs, phase transitions that change spatial decisions, short retry route, distinctive reward and story purpose. No attack that requires a third simultaneous thumb. Camera must show telegraphs within the playable viewport. Warnings precede offscreen threats. More health alone is not a phase.

First optional mini-boss, The Pipekeeper: arena with three pillars and a pressure wheel. Telegraphs a sweeping hose, a straight rush and a vent burst. Pillars interrupt line attacks; the wheel opens a safe lane but is not mandatory mid-dodge. Defeating it yields a torch lens and a maintenance shortcut clue. Retreat is possible before commitment; failure returns to a nearby refuge.

The Reservoir Sleeper is a later secret boss exposed by draining part of a reservoir. Its emergence changes the arena water lanes; electric equipment interacts with marked conductive pools but cannot make unavoidable full-arena damage. The Warden Engine is the story encounter: shutters, visible power lanes and exposed cores. It tests learned cover, repositioning and interaction, not obscure secret knowledge.


---

# 05 · iPhone controls, screens and onboarding

## Input contract
Landscape only for active play. Portrait pauses the simulation and presents a readable rotate screen with settings/menu access. Never require orientation-lock or fullscreen support. Calculate layout from actual viewport and safe-area insets, including browser chrome. Support left-handed layout and control-size adjustment without changing combat.

| Action | Touch | Desktop | Feedback |
|---|---|---|---|
| Move | Floating left stick, clamp to movement zone | WASD/arrows | Stick ring, movement pose |
| Fire | Hold large right button; facing-based assist | Left mouse | Target marker, weapon recoil, ammo tick |
| Manual aim | Drag out from fire origin | Mouse position | Reticle and soft aim line when learning |
| Dodge | Adjacent thumb-reachable button | Space | Direction cue, cooldown ring |
| Interact | Context hand button | E | Verb + object name |
| Heal | Bandage button; hold if accidental taps occur in testing | Q | Use ring, count and cancellation |
| Switch weapon | Tap equipped weapon silhouette | 1/2 or wheel | Clear silhouette swap |
| Torch | Tap torch icon inside equipment drawer; default on | F | Beam/setting state |
| Pause/map | Top buttons away from action thumbs | Esc/Tab | Paused modal/map |

Start with minimum 48 CSS-pixel touch targets, fire 68–84, dodge 56–64, gaps 8–12; measure after safe-area layout. HUD art may be small but hit targets must remain large. Fire button supports hold without dragging; drag activates manual aim after an adjustable threshold, initially 10 CSS pixels. An optional manual aim-lock mode can free the right thumb to dodge, but default two-thumb action must work without it: releasing fire to dodge is valid and responsive. Do not require holding shoot, move and a third action simultaneously.

## Pointer ownership
Assign each active pointer to one control on pointerdown. Capture where supported; release ownership on up, cancel, lost capture, blur, hidden tab or scene shutdown. Fire pointers cannot become menu pointers while still held. Movement pointer stays owned when crossing the centre. Reset all actions before resuming from a pause. Use touch-action rules only on the game surface so surrounding page UI remains usable. Ignore duplicate synthetic mouse events after touch.

Left stick has a small dead zone, analogue visual movement, constant reliable run speed after threshold, and no hidden sprint stamina. Dodge direction is movement direction; if idle use last deliberate move direction and preview that behaviour in tutorial. Reject an impossible dodge with a brief button pulse, not a silent action.

## HUD layout
Top left: health bar with numeric accessibility option and current hazard warning. Top centre: brief discovered-place name, then fade. Top right: map and pause. Bottom left: movement zone. Bottom right: fire, dodge and contextual action arc. Weapon/ammo and bandage sit above that arc, clear of notch and home indicator. Never put secrets, danger or essential pickups directly behind opaque controls; add camera framing margin and control transparency.

Keep the exploratory view clean. Do not display quest arrows over everything. Optional objective reminder is one short line in the journal, not a permanent large panel. Nearby interaction target uses outline plus verb, prioritising the nearest unobstructed intentional target. If overlapping targets exist, tap the prompt to cycle or reposition; do not interact through walls.

## Icon grammar
Hand = interact; magazine = ammo; bandage = healing; folded map = map; torch = lighting; footprint with streaks = dodge; padlock = requirement; broken circuit = power missing; wave line = water hazard; ear with pulse = sound event. Icons have distinct silhouettes and text labels on first use. Danger is shape plus colour. Build 16/24/32-pixel art variants where needed and present crisp UI at adequate CSS size; avoid tiny pixel fonts for paragraphs.

## Menus and flows
Title: restrained animated view of home/intercom, Continue if valid save, New Journey, Saves, Settings, Credits. New Journey: three save slots, optional seed entry under Advanced, difficulty/accessibility; no story spoilers. Continue shows last refuge, played time and save timestamp, not percent complete.

Pause: Resume, Map, Journal, Equipment, Save & Exit, Settings. Equipment: two weapon slots, utility slot, bandage slot, inventory grid, stash at refuges only. Selected item shows purpose, capacity and plain-language tradeoffs; compare behaviour rather than a wall of numerical stats. Journal: current leads, observed clues, resolved threads; hidden content is absent rather than a list of unknown boss silhouettes.

Map: current region with discovered geometry and visited connectors. Pan and pinch on map only; large reset-to-player control. Players place door, danger, supply, mystery and custom-note markers. Notes have bounded text length and are treated as text, not HTML. Upper/lower map hierarchy unlocks at the reveal. No whole-world fog rectangle implying a finite completion checklist.

Death: clear reason where known, recovered/left supplies, Return to refuge. Loading: meaningful progress by asset group, retry on failure, preserve save. Save failure: blocking-for-progress explanation with Retry and Export options; do not display Saved when transaction failed. Import: inspect version/world name, warn before replacing slot, preserve backup. New game never overwrites a slot without a deliberate confirmation.

## Tutorial: first ten minutes, flexible pace
0–1: wake beside the intercom. Move to a lit table, interact with a note. Teach only move and hand icon.
1–3: rainy street, laundrette visible across a puddle. First gun pickup and a safe practice target behind the shop; show hold fire and manual drag.
3–5: one telegraphed Skitter, wide retreat route. Introduce dodge after the enemy demonstrates its wind-up. No lethal tutorial trap.
5–7: descend, use a muzzle flash to reveal chamber scale. Interaction restores a refuge lamp; introduce save and healing naturally.
7–10: choose direct relay route or an optional humming wall. A visible loop leads back above. Discovering the optional branch is not required to finish the tutorial.

Instructions fade after demonstrated use and remain in Controls. A player who struggles gets a context tip, not a forced multi-page tutorial. Never put story dialogue on top of a first combat lesson.

## Accessibility
Independent aim assist, text size, control size/placement, left-handed layout, reduced flash, reduced shake, reduced motion, high-contrast threats, subtitles and visual sound cues. Distinguish ambient particles from damaging projectiles by shape and trajectory. Maintain clues under all accessibility settings. Menu controls need labels and focus handling; canvas gameplay accessibility limitations should be documented honestly. Pausing is allowed except during atomic transitions that last only until a safe state is committed.


---

# 06 · Pixel-art bible, animation, lighting and sound

## Art contract
Top-down view with visible wall/building fronts, not isometric diamonds. Use a 16×16 world tile grid, 24×32 player frame canvas, feet-centred pivot, about 10×8-pixel foot collision footprint. Enemies use deliberately distinct silhouettes. Oversized bosses use bespoke frames with clearly separated hit regions. These are production defaults; validate the camera test before commissioning large quantities.

Use a virtual world view about 384×216 logical pixels as a starting composition, adapting width for wider phones without exposing huge offscreen combat advantages. Scale sprites with nearest-neighbour filtering. Prefer integer scaling and modest framing/letterboxing where practical; if fractional scaling is necessary, verify pixel stability on real devices. Keep movement simulation subpixel but presentation consistently snapped; do not snap physics or jitter the camera against independently snapped sprites. UI is composed at CSS resolution, not reduced to the world render size.

Visual pillars: recognisable domestic detail; monumental hidden architecture; luminous natural life. Reject random packs with incompatible perspective, smeared AI textures masquerading as pixel art, and bloom covering weak sprites. Colours have roles: slate and deep teal for structure; warm amber for human shelter; pale mint for machinery; off-white for readable player edges; vermilion/angular cues for danger. Regions may shift these roles but cannot erase threat readability.

Each room has a primary focal point, a navigational landmark, quiet negative space and a secondary story detail. Decorate functional architecture: drainage follows slope, cables lead somewhere, furniture leaves walkable clearance. Avoid uniformly scattered crates, symmetrical clutter and perfect repeated damage marks. Plan the macro silhouette before adding surface texture.

## Asset pipeline and license gate
Create a manifest with asset ID, source author/URL, license, commercial-use permission, attribution, modification permission, original file path and derived atlas path. Original source assets live separately from game-ready exports. Never commit paid raw assets to a public repo if the license disallows redistribution. GitHub visibility and asset license need to agree. Missing art is explicitly tracked; never invent a purchased pack.

Candidate workflow: select coherent licensed base tiles/characters, commission or draw unique landmarks and bosses, produce animation sheets in a pixel editor, export trimmed atlases with stable frame names. Generated concept art can guide atmosphere but must be redrawn/cleaned to consistent pixels, perspective, silhouettes, pivots and animation before use. No reference images are included in this pack.

## First-slice asset inventory
Player: 8-direction locomotion/aim poses with layered gun where viable, idle 4 frames, walk 6, recoil 2, dodge 4–6, hurt 2, heal 4, death 6. Ensure weapon muzzle anchors exist per facing. Avoid mirroring asymmetric equipment blindly.

Enemies: two complete families with idle, move, anticipation, attack, recovery, hit and death states; Pipekeeper mini-boss with bespoke readable phases. Environment: street/laundrette/service/pump tilesets, wall cutaways, doors, stairs, lift, puddles, machines, posters, lamps, pipes, furniture and one secret wall. FX: muzzle flashes for two guns, bullet impacts by material, shell cases, dust, water ripples, sparks, healing, interaction and enemy telegraphs. UI: complete minimal icon set, button states, item silhouettes and readable font license. Audio: footsteps by surface, two weapon sets, reloads, impacts, enemy cues, ambience loops, interaction and UI sounds.

## Animation and feedback coverage
| Event | Sprite/world response | FX/audio | Rules |
|---|---|---|---|
| Move | Footstep cycle, slight body weight | Surface steps, occasional dust/ripple | Not every frame spawns particles |
| Fire | Facing pose, recoil, case ejection | Flash, shot, reverberation | One response per authoritative shot |
| Hit enemy | Brief recoil/stagger by type | Material impact, restrained hit cue | Hit confirmation never hides telegraph |
| Dodge | Compressed pose then displacement/recovery | Short dust streak, cloth movement | Collision and cooldown match animation |
| Open door | Hinged/sliding frames | Latch, dust, light spill | Collider state changes at defined point |
| Restore power | Switch animation, staged lamps | Relay clicks, motor hum | World state saved once |
| Discover | Player remains controllable where safe | Short musical motif, subtle title | Never obscure danger |
| Die/restart | Clear collapse, fade after safe commit | Sound mix lowers | Inputs and effects reset |

## Dynamic lighting pipeline
Prototype rendering before promising a particular engine light API. Preferred scalable approach: render crisp world art; build a low-resolution illumination mask from static baked/local lights and a small budget of dynamic lights; constrain light contribution by room visibility and nearby occluder segments; composite with an ambient floor. Art and light masks can use different smoothing intentionally, but world sprites stay crisp.

Never equate field of view with current brightness. Occlusion prevents seeing through walls; ambient visibility keeps navigation legible; torch/muzzle light reveals detail within visible space. The muzzle flash belongs to the weapon muzzle anchor and nearby visible region, not a full-screen white overlay. Raycast a visibility polygon against nearby static walls/closed doors, caching topology until geometry changes. Multiply a short radial flash by that polygon. Adjacent open-door space can receive light. No costly real-time global illumination or shadows from every debris particle.

Initial shot-light envelope: 30–50ms bright peak, softer 100–180ms decay, tuned per weapon and accessibility mode. Radius trial 5–8 tiles in darkness; shotgun somewhat wider. This is a test range, not a reason to wash the entire screen white. Sustained automatic fire must cap combined exposure; overlapping flashes should not add without bound. Reduced-flash retains the same informational reveal with lower contrast and smoother decay.

Use a readable ambient floor and strong sprite separation. A creature in full darkness need not be exposed by a HUD outline, but attacks that can hit now must have detectable warning. Reveal vistas can show silhouettes without revealing all interactive detail. Lighting must not serve as a wallhack or make a necessary clue invisible at low quality.

## Rich particles within a budget
Separate gameplay-critical signals from decoration. Critical bullets, enemy telegraphs, hazard boundaries and discovery clues are never culled by a cosmetic setting. Pool cosmetic sparks, cases, dust, spores and ripples. Initial quality budgets: low 120, medium 240, high 400 simultaneously active cosmetic particles; dynamic relevant lights 3/5/8. Measure and revise; these are not claimed device limits. Prefer atlas batches and bounded lifetimes. Settled cases become sparse decals or disappear, never thousands of physics bodies.

Density comes from layering: low-speed background spores, local machine dust, responsive foot ripples, and sharp shot bursts. Most of the view should remain calm between events. Camera shake starts small, directional and short; no shake on every footstep. Hit-stop is optional and very short, never slowing touch pointer processing or hiding dangerous projectiles.

## Audio
Category buses: music, atmosphere, weapons, creatures, interaction/UI. Unlock from the Start/Continue gesture; support suspended context recovery. Offer independent volume controls, subtitles and visual cues. Use authored ambience beds with sparse positional one-shots; never emit dozens of simultaneous drips. Gunshots combine transient, body and short room response; avoid expensive reverb per projectile. Underground gardens sound spacious and alive; flooded corridors muffle; Foundation aftermath briefly quiets before the descent.

Mystery motifs recur in different contexts: three relay tones, water knocks, a carriage chime. Clues based on sound get a journal observation or visual reaction. A silent-mode player can complete every critical objective. No essential spoken voice-over dependency; text dialogue and environmental audio suffice initially.

## Art approval gate
Inspect a daylight street, dark gunfight, refuge, water scene, secret doorway, and reveal frame at actual phone size. Check crisp pixels, palette unity, silhouettes, animation pivots, occlusion, and readability under maximum intended effects. Beautiful screenshots alone are insufficient: inspect moving play and touch controls over the same scene.


---

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


---

# 08 · Initial content bible

All entries are proposals for authorship. They are not assets already created. Stable IDs use lower_snake_case. A prototype implementation must clearly distinguish content actually playable from planned content.

## Region families
| ID/name | Visual and traversal identity | Discovery | Threat and refuge |
|---|---|---|---|
| surface_town / Bracken | Rain, brick fronts, amber windows, small domestic interiors | Cable routes link unrelated houses | Sparse scavengers; inherited home |
| service_veins / Service Veins | Rust pipes, warm steam, green lamps; narrow loops opening into chambers | Pressure/power bypasses and maintenance signs | Skitters and leeches; relay booth |
| last_platform / Last Platform | Long dark sightlines, faded station tiles, lit timetable boards | Missing destinations and rail routes | Watchman drones; signal cabin |
| drowned_ward / Drowned Ward | Blue water, pale windows, raised walkways, submerged furniture | Reservoir levels expose routes | Carriers and aquatic silhouettes; dry post office |
| artificial_spring / Artificial Spring | Moss, amber grow lights, huge roots, glass partitions | Ecological light cycles and old labels | Territorial fauna; gardener workshop |
| buried_civic / Buried Civic Quarter | Monumental faded facades, silent lifts and paper archives | Isolation records and incompatible old maps | Wardens; public reading room |
| quiet_shore / Quiet Shore | Ash-coloured sand, enormous vertical structures, distant warm windows | Lower inhabitants use resonance for orientation | Slow unfamiliar wildlife; survey shelter |
| bellglass_wilds / Bellglass Wilds | Translucent mineral growths, deep greens, pale gold pulses | Light/sound routes through growth | Resonant predators; dampened alcoves |

Foundation is an authored landmark complex linked to Buried Civic, not another randomly repeated biome. Region transitions need bridge modules: roots entering pipes, transit drainage into floodwater, institutional plant corridors into gardens. Never hard-cut between incompatible terrain without a believable connector.

## Discovery catalogue
| ID | Clue pair | Entry/condition | Payoff | Persistence/fairness |
|---|---|---|---|---|
| humming_wall | Moving lint + airflow diagram | Open maintenance panel, restore local fan | First optional gallery | Guaranteed in slice, no audio-only gate |
| dry_postbox | Parcel marks + courier note | Approach from upper walkway | Refuge and Nemi | Never behind mandatory breath upgrade |
| last_train | Incomplete timetable + signal log | Repair branch signal and choose destination | Optional flooded annex | Player can summon again; no real-time waiting |
| reservoir_stair | Huge water silhouette + drainage records | Link two known pump circuits | Reservoir Sleeper route | Components guaranteed after clue chain starts |
| wrong_window | Warm window + interior plan mismatch | Find external service balcony | Inhabited tiny room, personal story | No combat reward required |
| garden_night | Label warning + shutter controls | Temporarily close grow-light shutters | Luminous bloom and filter clue | Reversible, does not kill essential crops |
| borrowed_voice | Repeated call sign + recorded equipment tag | Trace signal with receiver | An abandoned automated message with context | Journal differentiates recording from living caller |
| paper_floor | Draft + furniture wear | Move a permitted shelf | Lower archive | Context action, not random wall shooting |
| listening_well | Surface ripples + carved resonance marks | Use known resonator sequence | Safe lower-region route | Visual sequence equivalent |
| empty_uniform | Repair bench + signed rota | Return after local relay restoration | Former enemy unit becomes nonhostile guide | State change visible and saved |
| downward_rain | Updraft mist + ventilation map | Open side pressure route | Vast hidden shaft vista and connector | No lethal blind jump |
| white_procession | Tracks + survey notes | Follow migration trail without firing | Living sanctuary and rare utility variant | Trail recurs; failure not permanent |

These are secret families with authored instances. Do not repeat the same named mystery across every generated district. A journal entry records observations and leads, not the full solution. Optional rewards must vary among routes, tools, stories and encounters.

## Boss proposals
Pipekeeper: first optional mechanical scavenger; pillars, pressure lanes, lens reward.
Reservoir Sleeper: massive organism revealed under drained water; water-level phases, shoreline cover, breathing-tool variant and lower archive route.
Station Choir: linked signal machines producing alternating danger lanes; visual rhythm cues, disabling optional amplifiers changes fight, rail routing reward.
Glass Gardener: territorial maintenance organism, light/shade positions, no obligatory plant destruction; access reward through peaceful bypass or combat.
Warden Engine: story machinery guarding Foundation coordinator, shutter and core phases; resolution enables reconnection.
The Unlit Passenger: optional entity linked to a traceable rail mystery, false silhouettes and a clearly identifiable real attack source; unique utility.
Shore Colossus: lower-world optional encounter seen at distance before approach, traversable cover islands and slow enormous attacks; route change rather than generic damage upgrade.
The Bellglass Listener: sound-sensitive predator with visual resonance warning, terrain damping and deliberate shot choices; resonance navigation tool.

Boss count target includes alternatives and optional encounters; author a complete one before producing another. Each needs attack/state tables, sprites, audio, arena, rewards, defeat state, save recovery, low-effects readability and an accessible retry.

## Weapon catalogue
Service Pistol: accurate, common rounds, quick feedback; starting anchor.
Pump Shotgun: short range, strong interrupt, wide flash, scarce shells.
Flare Launcher: slow bright projectile, temporary visible area, danger/utility tradeoff.
Coil Carbine: controlled bursts, interacts with authored conductive targets, no universal water electrocution.
Rivet Driver: heavy slow projectile, armour-specific stagger, loud.
Quiet Needle: quieter precise shots, weaker stopping power, dedicated small charge pool shared with specials if UI demands simplicity.
Survey Beacon: utility slot rather than third firearm; marks a return point and attracts specified curious fauna.

Not all weapons belong in the first build. First slice has pistol and shotgun. Every new gun needs a different encounter decision, sound, silhouette, recoil, projectile or impact rule. No generated weapon names implying mechanics that do not exist.

## Landmark room specifications
Laundrette: washing-machine rows, rain against frontage, backroom floor hatch, readable shelf clue. Street entrance and later lift exit frame the same landmark. Pumping Gallery: 2-screen-wide industrial chamber, bright refuge alcove before combat, three cover masses, observable inaccessible balcony, pressure loop and secret maintenance door. Garden Atrium: broad roots around an artificial sun, clear shade path, gardener shelter, optional shutter puzzle. Quiet Shore Landing: tiny warm lift door against vast pale ground, visible safe shelter, distant moving silhouette, return console and two distinct route promises.

## Encounter rhythm
For a normal expedition, mix orientation, observation, traversal, combat, consequence and relief. Start by testing a 3–5-minute rhythm with at most two sustained combats before recovery; tune rather than enforce a rigid timer. Empty space earns its place through atmosphere or anticipation, not distance padding. Give dead ends a clue, view, resource, or micro-story. Never put a boss after a long unskippable repeat corridor.


---

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


---

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


---

# 11 · Content production and long-term discovery

## The content multiplier
The game's longevity comes from authored specificity combined with reusable systemic rules. One pump rule can serve a route puzzle, a combat hazard, a refuge quest and a secret reservoir encounter. Each use still needs distinct clues, geometry and reward. Do not multiply a number of modules by a number of palettes and call the product unique adventures.

## Region pack pipeline
1. Write a region promise: one feeling, one dominant landmark language, one traversal difference, one environmental rule and one reward identity.
2. Draw the room-role graph and three exemplar routes before building tiles.
3. Produce a coherent tileset, props, ambience and at least one complete enemy family.
4. Author arrival, refuge, landmark, combat, observation, traversal, secret and exit modules.
5. Add at least two secrets with different clue/solution types and one meaningful connection to another region.
6. Validate socket geometry, navigation, IDs, dependency graph, resource budgets and accessibility.
7. Batch-generate variants, inspect outliers, play complete routes, then test integration into an old save.
8. Publish only after actual assets and game rules exist. Keep narrative spoilers out of normal patch notes where practical.

## Small content pack target
One new region family might begin with 12–18 modules, three bespoke landmarks, two enemy behaviours, one optional boss or substantial noncombat climax, four secret chains, one tool/weapon interaction and two connections to known content. This is an authoring estimate; actual production effort must be measured. Large sprite bosses and polished music are expensive. Fewer distinctive modules outperform many empty modules.

## Discovery diversity checks
Classify each reward by knowledge, route, equipment, relationship, spectacle, mechanical interaction or emotional story. Do not let all rewards become currency. Classify secrets by observation, exploration, interpretation, tool, consequence and behaviour. Recent sessions should expose opportunities across categories. The player may intentionally prefer one type; do not force the director to punish that preference.

## Fair mystery rules
A secret can be deeply hidden without being arbitrary. Show a first clue, corroborate it elsewhere, and provide an observable response when the player experiments correctly. Avoid required pixel hunts, random input sequences, unmarked lethal jumps, and unrecoverable real-time windows. A long investigation must leave journal traces. Optional hints are requested, tiered, and preserve the pleasure of inference.

## Maintaining an old world
New definitions receive new IDs. Never recycle an ID for a different boss or item. Deprecate through migrations and compatibility tables. Regions store their own version manifest. Existing secrets remain solvable if related rules change. Add new connections as explicit events or at previously reserved boundaries. Back up before migrations; dry-run imported saves against the new content registry.

## Balancing discovery frequency
Test whether players encounter a question early, a meaningful answer during a normal expedition, and a compelling unresolved lead at return. There is no universal mandatory discovery every fixed minute. Use telemetry only if consent/privacy and infrastructure are deliberately scoped; local playtest logs suffice initially. Track rooms seen, repeated module families, dead ends without payoff, unused clues and abandoned routes to guide authoring.

## Do not rely on runtime AI
No model is required to generate story, executable events, bosses or tilemaps during play. Author and validate content offline. Runtime AI would add latency, cost, safety and coherence problems without guaranteeing worthwhile discoveries. If future authoring tools use AI, generated output still passes human/agent review, licensing checks, schemas and playtests before shipping as ordinary content.

## Finite release, open-ended future
A truthful launch offers a complete personal story, the dramatic reveal, substantial playable lower content, and expandable frontier exploration built from its available library. A truthful future adds actual authored surprises. When a player has seen the current library's major families, keep exploration functional but do not pretend no repetition exists. Optional expeditions can be satisfying through tactical combinations even after their room art is familiar.


---

# 12 · Technical sources and verification notes

Checked 25 October 2026. These primary references support technical choices, not the original fictional design. Exact package versions and platform capabilities must be checked again when implementation begins. No game build or physical iPhone test occurred while producing this planning pack.

- Phaser overview: https://docs.phaser.io/ — browser-oriented 2D framework with JavaScript/TypeScript support. Basis for the proposed engine choice.
- Phaser project templates: https://docs.phaser.io/phaser/getting-started/project-templates — official templates include Vite and TypeScript options. Use a compatible template rather than mixing unrelated tutorials.
- Phaser installation: https://docs.phaser.io/phaser/getting-started/installation — package/install guidance and bundled type definitions. Pin selected versions during scaffold.
- MDN storage quotas and eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria — browser storage can be best-effort and evicted; persistence requests do not eliminate user deletion. This motivates IndexedDB error handling, export/import and honest backup language.

Implementation reference checkpoints (consult current official pages before using APIs): Vite deployment/base configuration at https://vite.dev/guide/static-deploy ; MDN IndexedDB at https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API ; Pointer Events at https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events ; Web Audio at https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API ; Page Visibility at https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API ; WebKit feature notes at https://webkit.org/blog/ . These checkpoint links are guidance for the implementer, not a claim that every linked page was reviewed for this archive.

All render budgets, combat timings, content counts and view sizes in the pack are proposed starting targets. Benchmark and adjust rather than treating them as verified hardware limits. PWA installation, orientation locking, fullscreen, vibration, persistent-storage grants and offline behaviour require feature detection and real-device checks; none is assumed universally available.
