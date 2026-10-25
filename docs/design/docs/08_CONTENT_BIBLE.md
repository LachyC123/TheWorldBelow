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
