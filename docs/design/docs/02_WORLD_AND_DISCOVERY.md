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
