import type { EnemyType, ItemId } from '../content/types.ts';
import type { WeaponId } from '../content/ids.ts';

export type Face = 'down' | 'up' | 'left' | 'right';

export interface Commands {
  /** analogue movement, length <= 1 */
  moveX: number;
  moveY: number;
  /** manual aim angle (radians) or null for facing-based assistance */
  aimAngle: number | null;
  /** facing-weighted aim assistance (settings) */
  assist: boolean;
  fire: boolean;
  dodge: boolean;
  interact: boolean;
  heal: boolean;
  swap: boolean;
  reload: boolean;
  torch: boolean;
}

export const NO_COMMANDS: Commands = { moveX: 0, moveY: 0, aimAngle: null, assist: true, fire: false, dodge: false, interact: false, heal: false, swap: false, reload: false, torch: false };

export interface PlayerState {
  x: number;
  y: number;
  face: Face;
  /** current weapon/aim angle */
  aim: number;
  moving: boolean;
  walkT: number;
  lastMoveX: number;
  lastMoveY: number;
  dodgeT: number;
  dodgeCd: number;
  dodgeDx: number;
  dodgeDy: number;
  dodgeBuffer: number;
  iframes: number;
  hurtT: number;
  healT: number;
  reloadT: number;
  fireCd: number;
  idleFireT: number;
  dryLatch: boolean;
  alive: boolean;
  deathT: number;
  deathSource: string;
  latchedBy: string | null;
  targetId: string | null;
  firingT: number;
  footT: number;
  manualAim: boolean;
}

export interface EnemyState {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  state: string;
  t: number;
  face: 1 | -1;
  angle: number;
  active: boolean;
  dead: boolean;
  deadT: number;
  hitT: number;
  respawns: boolean;
  homeX: number;
  homeY: number;
  alerted: boolean;
  seenX: number;
  seenY: number;
  hasSeen: boolean;
  attackHit: boolean;
  cooldown: number;
  stuckT: number;
  /** leech light exposure / keeper phase etc. */
  meter: number;
  phase: number;
  hw: number;
  hh: number;
  radius: number;
  strafe: number;
  /** secondary cooldown (boss vent) */
  cd2: number;
  /** presentation helper: current jet length / sweep (boss hose) */
  aux: number;
}

export interface ProjectileState {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  dist: number;
  maxDist: number;
  damage: number;
  weaponId: WeaponId;
  alive: boolean;
  /** visual start point (muzzle) */
  sx: number;
  sy: number;
}

export interface PickupState {
  id: string;
  item: ItemId | 'cache';
  amount: number;
  x: number;
  y: number;
  journal?: string;
  ref?: string;
  visible: boolean;
  bob: number;
}

export interface BoltState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  alive: boolean;
}

export interface TargetState {
  id: string;
  x: number;
  y: number;
  knocked: boolean;
}

export interface VentState {
  id: string;
  x: number;
  y: number;
  group: 'a' | 'b';
  state: 'idle' | 'tell' | 'burst';
}

export interface Prompt {
  id: string;
  verb: string;
  label: string;
  locked: boolean;
  x: number;
  y: number;
}
