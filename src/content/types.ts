// Authored content contracts (adapted from docs/design/examples/contracts.ts).
// IDs are persistent save keys: never rename or reuse them for different content.
import type { FloorKind, WallStyleId } from './tiles.ts';

export type StableId = string;
export type RegionId = StableId;
export type Rgb = [number, number, number];

export type Condition =
  | { type: 'flag'; id: StableId; value: boolean }
  | { type: 'hasCapability'; id: StableId }
  | { type: 'hasWeapon'; id: StableId }
  | { type: 'all'; conditions: Condition[] }
  | { type: 'any'; conditions: Condition[] };

export type CellDef = { floor: FloorKind } | { wall: WallStyleId } | { water: true } | { void: true };

export interface EntryPoint {
  /** tile coordinates of the arrival spot */
  tx: number;
  ty: number;
  face: 'down' | 'up' | 'left' | 'right';
}

export interface StaticLight {
  id: StableId;
  /** world pixels */
  x: number;
  y: number;
  radius: number;
  color: Rgb;
  intensity: number;
  flicker?: number;
  /** only lit while the condition holds (e.g. a restored lamp) */
  when?: Condition;
}

export interface AnimDef { frames: string[]; fps: number }
export interface AltDef { when: Condition; frame?: string; anim?: AnimDef }

interface EntityBase {
  id: StableId;
  /** tile coordinates (top-left of footprint) */
  tx: number;
  ty: number;
}

export interface PropDef extends EntityBase {
  kind: 'prop';
  frame: string;
  /** looping animation (frame names) */
  anim?: AnimDef;
  /** frame/animation overrides; the first whose condition holds wins */
  alt?: AltDef | AltDef[];
  /** pixel offset of the sprite's bottom-centre from the footprint's bottom-centre */
  ox?: number;
  oy?: number;
  /** collision footprint in tiles (relative to tx,ty); omitted = no collision */
  solid?: { w: number; h: number };
  /** blocks light and bullets (tall cover) */
  opaque?: boolean;
  /** draw flat on the floor (below actors) */
  floor?: boolean;
  /** draw on a wall face (depth just above wall) */
  wall?: boolean;
  /** additive glow drawn above the light layer */
  glow?: { frame?: string; radius: number; color: Rgb; when?: Condition; dx?: number; dy?: number };
  /** visible only while condition holds */
  visibleWhen?: Condition;
  /** collision only while condition holds (gates); uses `solid` footprint */
  solidWhen?: Condition;
}

export type ActionId = string;

export interface InteractDef extends EntityBase {
  kind: 'interact';
  verb: string;
  label: string;
  action: ActionId;
  /** interaction available only while condition holds (otherwise `lockedText` explains) */
  when?: Condition;
  lockedText?: string;
  /** hide prompt entirely while condition holds (e.g. already done) */
  hideWhen?: Condition;
  /** reach radius in px from footprint centre (default 20) */
  reach?: number;
  w?: number;
  h?: number;
}

export interface ExitDef extends EntityBase {
  kind: 'exit';
  w: number;
  h: number;
  target: { region: RegionId; entry: StableId };
  /** walk-through exits trigger on contact; others need the interact button */
  auto: boolean;
  verb?: string;
  label?: string;
  gate?: Condition;
  lockedText?: string;
}

export type ItemId = 'service_pistol' | 'pump_shotgun' | 'light_rounds' | 'shells' | 'bandage' | 'torch_lens' | 'note';

export interface PickupDef extends EntityBase {
  kind: 'pickup';
  item: ItemId;
  amount: number;
  /** note pickups add a journal entry */
  journal?: StableId;
  /** hidden until condition holds */
  when?: Condition;
}

export type EnemyType = 'skitter' | 'leech' | 'keeper';

export interface EnemyDef extends EntityBase {
  kind: 'enemy';
  type: EnemyType;
  /** ordinary encounters may return after refuge rest; unique ones never do */
  respawns: boolean;
  /** stays dormant/hidden until condition holds */
  activeWhen?: Condition;
}

export interface TriggerDef extends EntityBase {
  kind: 'trigger';
  w: number;
  h: number;
  action: ActionId;
  once: boolean;
}

export interface TargetDef extends EntityBase {
  kind: 'target';
}

/** Floor steam vent used by boss phases; group alternates which vents fire. */
export interface VentDef extends EntityBase {
  kind: 'vent';
  group: 'a' | 'b';
}

export type EntityDef = PropDef | InteractDef | ExitDef | PickupDef | EnemyDef | TriggerDef | TargetDef | VentDef;

/** Cosmetic particle stream that is also a visual clue (e.g. lint drawn into a wall seam). */
export interface EmitterDef {
  id: StableId;
  type: 'lint' | 'steam' | 'drip';
  /** source area (tiles) */
  tx: number;
  ty: number;
  w: number;
  h: number;
  /** optional attractor point in world px */
  toX?: number;
  toY?: number;
  rate: number;
  /** rate multiplier while condition holds */
  boost?: { when: Condition; factor: number };
}

export type AmbienceId = 'rain' | 'room' | 'tunnel' | 'gallery' | 'pipeworks';

export interface RegionDef {
  id: RegionId;
  name: string;
  biome: StableId;
  map: string[];
  legend: Record<string, CellDef>;
  /** ambient light floor (0-255) keeping navigation legible */
  ambient: Rgb;
  ambience: AmbienceId;
  rain?: boolean;
  /** cosmetic airborne motes */
  motes?: 'dust' | 'spores' | 'none';
  entries: Record<StableId, EntryPoint>;
  lights: StaticLight[];
  entities: EntityDef[];
  /** shown briefly when first entered */
  discoverTitle?: string;
  refuge?: { id: StableId; entry: StableId };
  emitters?: EmitterDef[];
}
