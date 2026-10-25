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
