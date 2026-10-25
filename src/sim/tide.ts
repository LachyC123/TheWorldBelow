// The tide rule of the underground sea. Deterministic from the journey clock, so it can be
// predicted, read off the gauge and explained, never rolled. Every third ebb is a spring
// ebb that drains the deep causeway.
//
//   level 0 = high (all tidal cells covered)
//   level 1 = low (tidal-1 cells exposed)
//   level 2 = spring low (tidal-1 and tidal-2 cells exposed)

export const TIDE_PERIOD = 46;
/** cycle time (s) at which the water starts to fall, is fully out, warns, and starts to rise */
export const TIDE_FALL = 16;
export const TIDE_OUT = 20;
export const TIDE_BELL = 34;
export const TIDE_RISE = 40;
export const SPRING_EVERY = 3;

export type TidePhase = 'high' | 'falling' | 'low' | 'rising';

export interface TideState {
  level: 0 | 1 | 2;
  phase: TidePhase;
  spring: boolean;
  /** 0..1 water coverage over tidal-1 and tidal-2 cells (for presentation) */
  cover1: number;
  cover2: number;
  /** seconds until the water starts to rise (only meaningful while low) */
  untilRise: number;
  /** ebbs remaining until the next spring ebb (0 = this cycle) */
  ebbsToSpring: number;
}

export function tideAt(seconds: number): TideState {
  const cycle = Math.floor(seconds / TIDE_PERIOD);
  const c = seconds - cycle * TIDE_PERIOD;
  const spring = cycle % SPRING_EVERY === SPRING_EVERY - 1;
  const ebbsToSpring = (SPRING_EVERY - 1 - (cycle % SPRING_EVERY)) % SPRING_EVERY;
  let phase: TidePhase;
  let water: number;
  if (c < TIDE_FALL) {
    phase = 'high';
    water = 1;
  } else if (c < TIDE_OUT) {
    phase = 'falling';
    water = 1 - (c - TIDE_FALL) / (TIDE_OUT - TIDE_FALL);
  } else if (c < TIDE_RISE) {
    phase = 'low';
    water = 0;
  } else {
    phase = 'rising';
    water = Math.min(1, (c - TIDE_RISE) / 4);
  }
  // cells are walkable only once fully drained, and are covered the moment the water turns
  const out = phase === 'low';
  const level: 0 | 1 | 2 = out ? (spring ? 2 : 1) : 0;
  return {
    level,
    phase,
    spring,
    cover1: water,
    cover2: spring ? water : 1,
    untilRise: phase === 'low' ? TIDE_RISE - c : 0,
    ebbsToSpring,
  };
}

/** True during the window in which the bell warns that the water is about to turn. */
export function bellDue(prevSeconds: number, seconds: number): boolean {
  const a = prevSeconds % TIDE_PERIOD;
  const b = seconds % TIDE_PERIOD;
  return a < TIDE_BELL && b >= TIDE_BELL;
}
