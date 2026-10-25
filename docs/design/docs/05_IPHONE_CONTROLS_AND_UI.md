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
