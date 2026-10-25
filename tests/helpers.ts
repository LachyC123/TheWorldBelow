import { getRegion } from '../src/content/registry.ts';
import { TILE } from '../src/content/tiles.ts';
import { World, DT } from '../src/sim/world.ts';
import { newGameData, type GameData } from '../src/sim/gameData.ts';
import { NO_COMMANDS, type Commands } from '../src/sim/types.ts';
import type { SequencedEvent } from '../src/sim/events.ts';

export function makeWorld(regionId: string, entry: string, mutate?: (d: GameData) => void): World {
  const data = newGameData();
  mutate?.(data);
  const def = getRegion(regionId);
  const e = def.entries[entry]!;
  return new World(def, data, { x: e.tx * TILE + 8, y: e.ty * TILE + 12, face: e.face });
}

export function run(w: World, seconds: number, cmd: Partial<Commands> = {}): SequencedEvent[] {
  const out: SequencedEvent[] = [];
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    w.step({ ...NO_COMMANDS, ...cmd });
    out.push(...w.drainEvents());
  }
  return out;
}

export function once(w: World, cmd: Partial<Commands>): SequencedEvent[] {
  w.step({ ...NO_COMMANDS, ...cmd });
  return w.drainEvents();
}
