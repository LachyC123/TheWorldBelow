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
