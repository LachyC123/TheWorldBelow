import type { Condition } from './types.ts';

export const flag = (id: string, value = true): Condition => ({ type: 'flag', id, value });
export const not = (id: string): Condition => ({ type: 'flag', id, value: false });
export const all = (...conditions: Condition[]): Condition => ({ type: 'all', conditions });
export const any = (...conditions: Condition[]): Condition => ({ type: 'any', conditions });
export const hasWeapon = (id: string): Condition => ({ type: 'hasWeapon', id });
export const hasCap = (id: string): Condition => ({ type: 'hasCapability', id });

/** Pixel centre of a tile. */
export const px = (t: number): number => t * 16 + 8;

/** Animation frame names prefix_0..prefix_{n-1}. */
export const seq = (prefix: string, n: number, fps: number): { frames: string[]; fps: number } => ({
  frames: Array.from({ length: n }, (_, i) => `${prefix}_${i}`),
  fps,
});
