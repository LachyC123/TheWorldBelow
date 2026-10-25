import type { Condition } from '../content/types.ts';

export interface ConditionContext {
  flag(id: string): boolean;
  hasCapability(id: string): boolean;
  hasWeapon(id: string): boolean;
}

export function evaluate(c: Condition | undefined, ctx: ConditionContext): boolean {
  if (!c) return true;
  switch (c.type) {
    case 'flag':
      return ctx.flag(c.id) === c.value;
    case 'hasCapability':
      return ctx.hasCapability(c.id);
    case 'hasWeapon':
      return ctx.hasWeapon(c.id);
    case 'all':
      return c.conditions.every((x) => evaluate(x, ctx));
    case 'any':
      return c.conditions.some((x) => evaluate(x, ctx));
  }
}
