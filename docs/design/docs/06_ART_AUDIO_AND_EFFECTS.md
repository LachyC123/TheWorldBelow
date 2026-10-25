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
