// Seeded district generator (docs/design/docs/02 generation pipeline). Pure and deterministic:
// identical (world seed, socket, ledger, generator version) -> identical district. Runs in a worker
// in the game and directly in tests. Output is materialized data committed to the save; a
// visited district is never regenerated, even if this algorithm changes later.
import { Rng } from '../sim/rng.ts';
import { Grid } from '../sim/grid.ts';
import { TILE } from '../content/tiles.ts';
import type { EmitterDef, EntityDef, EntryPoint, RegionDef, StaticLight } from '../content/types.ts';
import { CURIOS, UPGRADES, CAP_GLOVES, AUTHORED_UNIQUES } from '../content/discoveries.ts';
import { MODULES, moduleSize, type Role, type RoomModule, type Side } from './modules.ts';
import { KITS, ambientFor, type BiomeId } from './kits.ts';

export const GENERATOR_VERSION = 1;
const CELL_W = 17;
const CELL_H = 13;
const MAX_ATTEMPTS = 12;
const SAFE_SPAWN_PX = 112;
export const STREET_REGION = 'region_surface_001';

export interface SocketSpec {
  socketId: string;
  biome: BiomeId;
  /** side of the new district the player enters from */
  entrySide: Side;
  parentRegion: string;
  parentEntry: string;
  depth: number;
}

export interface Ledger {
  seenModules: Record<string, number>;
  uniques: string[];
  names: string[];
  manholesFree: string[];
  districts: number;
}

export interface GenRequest {
  worldSeed: string;
  socket: SocketSpec;
  ledger: Ledger;
}

export interface GeneratedRegionRecord {
  id: string;
  generatorVersion: number;
  seed: string;
  attempt: number;
  biome: BiomeId;
  depth: number;
  socketId: string;
  parentRegion: string;
  parentEntry: string;
  name: string;
  map: string[];
  entities: EntityDef[];
  lights: StaticLight[];
  entries: Record<string, EntryPoint>;
  emitters: EmitterDef[];
  refuge?: { id: string; entry: string };
  childSockets: SocketSpec[];
  manhole?: string;
  landmark?: string;
}

export interface GenResult {
  record: GeneratedRegionRecord;
  reserved: { modules: string[]; uniques: string[]; name: string; manhole?: string };
}

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function regionIdForSocket(worldSeed: string, socketId: string): string {
  return `gen_${hashString(`${worldSeed}|${socketId}`).toString(36)}`;
}

const OPP: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const DIR: Record<Side, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

interface Cell {
  c: number;
  r: number;
  key: string;
  role: Role;
  module: RoomModule | null;
  rx: number;
  ry: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  doors: Set<Side>;
}

type Slot = { ch: string; x: number; y: number };

const flagT = (id: string) => ({ type: 'flag' as const, id, value: true });
const flagF = (id: string) => ({ type: 'flag' as const, id, value: false });

export function generateDistrict(req: GenRequest): GenResult {
  const id = regionIdForSocket(req.worldSeed, req.socket.socketId);
  const seed = `${req.worldSeed}|${req.socket.socketId}|g${GENERATOR_VERSION}`;
  let lastErrors: string[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = attemptDistrict(req, id, seed, attempt, false);
    lastErrors = validateDistrict(res.record);
    if (lastErrors.length === 0) return res;
  }
  // Fallback: a small, known-good two-room layout. Logged in development, never blocks play.
  const res = attemptDistrict(req, id, seed, MAX_ATTEMPTS, true);
  const errs = validateDistrict(res.record);
  if (errs.length) throw new Error(`District generation failed for ${req.socket.socketId}: ${errs.join('; ')} (previous: ${lastErrors.join('; ')})`);
  return res;
}

function attemptDistrict(req: GenRequest, id: string, seed: string, attempt: number, fallback: boolean): GenResult {
  const { socket, ledger } = req;
  const kit = KITS[socket.biome];
  const topo = new Rng(`${seed}|${attempt}|topology`);
  const enc = new Rng(`${seed}|${attempt}|encounters`);
  const deco = new Rng(`${seed}|${attempt}|decoration`);
  const loot = new Rng(`${seed}|${attempt}|loot`);
  const depth = socket.depth;

  // ---------------------------------------------------------------- macro layout
  const cols = fallback ? 2 : 3 + (depth >= 2 && topo.next() < 0.5 ? 1 : 0);
  const rows = fallback ? 1 : 2 + (topo.next() < 0.6 ? 1 : 0);
  const entry = entryCell(socket.entrySide, cols, rows, topo);
  const key = (c: number, r: number): string => `${c},${r}`;
  const active = new Set<string>([key(entry[0], entry[1])]);
  const target = fallback ? 2 : Math.max(4, Math.min(cols * rows, Math.round(cols * rows * topo.range(0.62, 0.9))));
  while (active.size < target) {
    const cand: Array<[number, number]> = [];
    for (const k of active) {
      const [c, r] = k.split(',').map(Number) as [number, number];
      for (const s of ['N', 'S', 'E', 'W'] as Side[]) {
        const nc = c + DIR[s][0];
        const nr = r + DIR[s][1];
        if (nc >= 0 && nr >= 0 && nc < cols && nr < rows && !active.has(key(nc, nr))) cand.push([nc, nr]);
      }
    }
    if (!cand.length) break;
    const p = topo.pick(cand);
    active.add(key(p[0], p[1]));
  }
  // spanning tree by randomized DFS, then loops
  const edges = new Set<string>();
  const ek = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const seen = new Set<string>();
  const stack = [key(entry[0], entry[1])];
  seen.add(stack[0]!);
  while (stack.length) {
    const cur = stack[stack.length - 1]!;
    const [c, r] = cur.split(',').map(Number) as [number, number];
    const nbs = (['N', 'S', 'E', 'W'] as Side[]).map((s) => key(c + DIR[s][0], r + DIR[s][1])).filter((k) => active.has(k) && !seen.has(k));
    if (!nbs.length) {
      stack.pop();
      continue;
    }
    const nb = topo.pick(nbs);
    edges.add(ek(cur, nb));
    seen.add(nb);
    stack.push(nb);
  }
  for (const a of active) {
    const [c, r] = a.split(',').map(Number) as [number, number];
    for (const s of ['E', 'S'] as Side[]) {
      const b = key(c + DIR[s][0], r + DIR[s][1]);
      if (active.has(b) && !edges.has(ek(a, b)) && topo.next() < 0.3) edges.add(ek(a, b));
    }
  }
  const degree = (k: string): number => [...edges].filter((e) => e.split('|').includes(k)).length;
  const dist = new Map<string, number>([[key(entry[0], entry[1]), 0]]);
  const q = [key(entry[0], entry[1])];
  while (q.length) {
    const cur = q.shift()!;
    for (const e of edges) {
      const [a, b] = e.split('|') as [string, string];
      const nb = a === cur ? b : b === cur ? a : null;
      if (nb && !dist.has(nb)) {
        dist.set(nb, dist.get(cur)! + 1);
        q.push(nb);
      }
    }
  }

  // ---------------------------------------------------------------- roles
  const cells = new Map<string, Cell>();
  for (const k of active) {
    const [c, r] = k.split(',').map(Number) as [number, number];
    cells.set(k, { c, r, key: k, role: 'combat', module: null, rx: 0, ry: 0, w: 0, h: 0, cx: 0, cy: 0, doors: new Set() });
  }
  const entryKey = key(entry[0], entry[1]);
  cells.get(entryKey)!.role = 'arrival';
  const others = [...cells.values()].filter((c) => c.key !== entryKey).sort((a, b) => (dist.get(b.key) ?? 0) - (dist.get(a.key) ?? 0) || a.key.localeCompare(b.key));
  const landmarks = MODULES.filter((m) => m.landmark && !ledger.uniques.includes(m.id) && (!m.biomes || m.biomes.includes(socket.biome)));
  let landmarkModule: RoomModule | null = null;
  if (!fallback && landmarks.length && others.length && topo.next() < 0.8) {
    landmarkModule = topo.pick(landmarks);
    others[0]!.role = 'landmark';
  }
  const leaves = others.filter((c) => c.role === 'combat' && degree(c.key) === 1);
  const secretCell = !fallback && leaves.length ? leaves[0]! : null;
  if (secretCell) secretCell.role = 'secret';
  const vaultCell = !fallback && leaves.length > 1 && topo.next() < 0.75 ? leaves[1]! : null;
  if (vaultCell) vaultCell.role = 'vault';
  const mids = others.filter((c) => c.role === 'combat');
  if (!fallback && mids.length && topo.next() < 0.6) topo.pick(mids).role = 'rest';
  for (const c of others) if (c.role === 'combat' && topo.next() < 0.35) c.role = topo.next() < 0.5 ? 'reward' : 'connector';

  // doors from edges
  for (const e of edges) {
    const [a, b] = e.split('|') as [string, string];
    const A = cells.get(a)!;
    const B = cells.get(b)!;
    const s = sideBetween(A, B);
    A.doors.add(s);
    B.doors.add(OPP[s]);
  }
  cells.get(entryKey)!.doors.add(socket.entrySide);

  // frontier sockets on outer edges (never on the entry side, never from secret/vault rooms)
  const frontier: Array<{ cell: Cell; side: Side }> = [];
  const outer: Array<{ cell: Cell; side: Side }> = [];
  for (const cell of cells.values()) {
    if (cell.role === 'secret' || cell.role === 'vault') continue;
    for (const s of ['N', 'S', 'E', 'W'] as Side[]) {
      if (cell.key === entryKey && s === socket.entrySide) continue;
      const nc = cell.c + DIR[s][0];
      const nr = cell.r + DIR[s][1];
      if (nc >= 0 && nr >= 0 && nc < cols && nr < rows) continue;
      if (s === socket.entrySide) continue;
      outer.push({ cell, side: s });
    }
  }
  const nFrontier = fallback ? 1 : depth <= 1 ? 2 : 1 + (topo.next() < 0.5 ? 1 : 0);
  outer.sort((a, b) => (dist.get(b.cell.key) ?? 0) - (dist.get(a.cell.key) ?? 0) || a.cell.key.localeCompare(b.cell.key) || a.side.localeCompare(b.side));
  const usedSides = new Set<Side>();
  for (const o of outer) {
    if (frontier.length >= nFrontier) break;
    if (usedSides.has(o.side) && outer.some((x) => !usedSides.has(x.side) && !frontier.includes(x))) continue;
    frontier.push(o);
    usedSides.add(o.side);
    o.cell.doors.add(o.side);
  }

  // ---------------------------------------------------------------- modules
  const usedHere = new Map<string, number>();
  const reservedModules: string[] = [];
  for (const cell of cells.values()) {
    let mod: RoomModule | null = null;
    if (cell.role === 'landmark' && landmarkModule && doorsOk(landmarkModule, cell.doors)) mod = landmarkModule;
    if (!mod) {
      if (cell.role === 'landmark') cell.role = 'reward';
      const role: Role = cell.role;
      const cands = MODULES.filter((m) => !m.landmark && m.roles.includes(role) && doorsOk(m, cell.doors) && (!m.biomes || m.biomes.includes(socket.biome)));
      const pool = cands.length ? cands : MODULES.filter((m) => !m.landmark && doorsOk(m, cell.doors) && (m.roles.includes('combat') || m.roles.includes('connector')));
      mod = weightedPick(pool, (m) => (1 / (1 + 0.6 * (ledger.seenModules[m.id] ?? 0))) * (usedHere.has(m.id) ? 0.25 : 1), topo);
    }
    cell.module = mod;
    usedHere.set(mod.id, (usedHere.get(mod.id) ?? 0) + 1);
    reservedModules.push(mod.id);
    const { w, h } = moduleSize(mod);
    const ox = 1 + cell.c * CELL_W;
    const oy = 1 + cell.r * CELL_H;
    cell.cx = ox + Math.floor(CELL_W / 2);
    cell.cy = oy + 7;
    cell.w = w;
    cell.h = h;
    cell.rx = cell.cx - Math.floor(w / 2);
    cell.ry = cell.cy - Math.floor(h / 2);
  }

  // ---------------------------------------------------------------- carve
  const W = cols * CELL_W + 2;
  const H = rows * CELL_H + 3;
  const grid: string[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => '#'));
  const set = (x: number, y: number, ch: string): void => {
    if (x >= 0 && y >= 0 && x < W && y < H) grid[y]![x] = ch;
  };
  const slots: Array<Slot & { cell: Cell }> = [];
  for (const cell of cells.values()) {
    const m = cell.module!;
    for (let j = 0; j < cell.h; j++)
      for (let i = 0; i < cell.w; i++) {
        const ch = m.rows[j]![i]!;
        const x = cell.rx + i;
        const y = cell.ry + j;
        if (ch === '#' || ch === '~' || ch === '=') set(x, y, ch);
        else if (ch === '.' || ch === ',' || ch === 'x') set(x, y, varyFloor(ch, deco));
        else {
          set(x, y, '.');
          slots.push({ ch, x, y, cell });
        }
      }
  }
  const corridor = (x0: number, y0: number, x1: number, y1: number): void => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (grid[y]?.[x] === '#') set(x, y, 'h');
  };
  const gates: Array<{ tiles: Array<[number, number]>; kind: 'rubble' | 'junction'; from: Cell; to: Cell }> = [];
  for (const e of edges) {
    const [a, b] = e.split('|') as [string, string];
    let A = cells.get(a)!;
    let B = cells.get(b)!;
    if (A.c > B.c || A.r > B.r) [A, B] = [B, A];
    const gatedCell = A.role === 'secret' || A.role === 'vault' ? A : B.role === 'secret' || B.role === 'vault' ? B : null;
    if (A.r === B.r) {
      corridor(A.rx + A.w, A.cy, B.rx - 1, A.cy + 1);
      if (gatedCell) {
        const gx = gatedCell === B ? B.rx - 1 : A.rx + A.w;
        gates.push({ tiles: [[gx, A.cy], [gx, A.cy + 1]], kind: gatedCell.role === 'vault' ? 'junction' : 'rubble', from: gatedCell === B ? A : B, to: gatedCell });
      }
    } else {
      corridor(A.cx, A.ry + A.h, A.cx + 1, B.ry - 1);
      if (gatedCell) {
        const gy = gatedCell === B ? B.ry - 1 : A.ry + A.h;
        gates.push({ tiles: [[A.cx, gy], [A.cx + 1, gy]], kind: gatedCell.role === 'vault' ? 'junction' : 'rubble', from: gatedCell === B ? A : B, to: gatedCell });
      }
    }
  }
  const edgeExit = (cell: Cell, side: Side): { tx: number; ty: number; w: number; h: number; spawn: EntryPoint } => {
    if (side === 'W') {
      corridor(0, cell.cy, cell.rx - 1, cell.cy + 1);
      return { tx: 0, ty: cell.cy, w: 1, h: 2, spawn: { tx: 2, ty: cell.cy, face: 'right' } };
    }
    if (side === 'E') {
      corridor(cell.rx + cell.w, cell.cy, W - 1, cell.cy + 1);
      return { tx: W - 1, ty: cell.cy, w: 1, h: 2, spawn: { tx: W - 3, ty: cell.cy, face: 'left' } };
    }
    if (side === 'N') {
      corridor(cell.cx, 0, cell.cx + 1, cell.ry - 1);
      return { tx: cell.cx, ty: 0, w: 2, h: 1, spawn: { tx: cell.cx, ty: 2, face: 'down' } };
    }
    corridor(cell.cx, cell.ry + cell.h, cell.cx + 1, H - 1);
    return { tx: cell.cx, ty: H - 1, w: 2, h: 1, spawn: { tx: cell.cx, ty: H - 3, face: 'up' } };
  };

  const entities: EntityDef[] = [];
  const lights: StaticLight[] = [];
  const emitters: EmitterDef[] = [];
  const entries: Record<string, EntryPoint> = {};
  let n = 0;
  const nid = (k: string): string => `${id}_${k}${n++}`;

  const entryCellObj = cells.get(entryKey)!;
  const ret = edgeExit(entryCellObj, socket.entrySide);
  entries.from_parent = ret.spawn;
  entities.push({ kind: 'exit', id: `${id}_return`, tx: ret.tx, ty: ret.ty, w: ret.w, h: ret.h, auto: true, target: { region: socket.parentRegion, entry: socket.parentEntry } });
  lights.push({ id: nid('l'), x: ret.spawn.tx * TILE + 8, y: ret.spawn.ty * TILE + 8, radius: 56, color: kit.lightColors[0]!, intensity: 0.55 });

  const childSockets: SocketSpec[] = [];
  frontier.forEach((f, i) => {
    const ex = edgeExit(f.cell, f.side);
    const socketId = `${id}_s${i}`;
    const entryName = `socket_${i}`;
    entries[entryName] = ex.spawn;
    const biome = pickNextBiome(kit.next, socket.biome, topo);
    childSockets.push({ socketId, biome, entrySide: OPP[f.side], parentRegion: id, parentEntry: entryName, depth: depth + 1 });
    entities.push({ kind: 'exit', id: `${id}_frontier_${i}`, tx: ex.tx, ty: ex.ty, w: ex.w, h: ex.h, auto: true, target: { region: `gen:${socketId}`, entry: 'from_parent' } });
    lights.push({ id: nid('l'), x: ex.spawn.tx * TILE + 8, y: ex.spawn.ty * TILE + 8, radius: 48, color: KITS[biome].lightColors[0]!, intensity: 0.45, flicker: 0.15 });
  });

  // gates: rubble (secret) or live junction (vault; needs insulated gloves)
  gates.forEach((g, gi) => {
    const flag = `${id}_gate_${gi}`;
    for (const [i, [tx, ty]] of g.tiles.entries()) {
      if (g.kind === 'rubble')
        entities.push({ kind: 'prop', id: `${id}_gate_${gi}_${i}`, tx, ty, frame: i % 2 ? 'rubble_wall_b' : 'rubble_wall', solid: { w: 1, h: 1 }, opaque: true, solidWhen: flagF(flag), alt: { when: flagT(flag), frame: 'rubble_open' } });
      else
        entities.push({ kind: 'prop', id: `${id}_gate_${gi}_${i}`, tx, ty, frame: 'junction_0', solid: { w: 1, h: 1 }, opaque: true, solidWhen: flagF(flag), anim: { frames: ['junction_0', 'junction_1', 'junction_2'], fps: 8 }, alt: { when: flagT(flag), frame: 'junction_open' } });
    }
    const [t0, t1] = g.tiles as [[number, number], [number, number]];
    const horiz = t0[1] === t1[1];
    entities.push(
      g.kind === 'rubble'
        ? { kind: 'interact', id: `${id}_gate_${gi}_use`, tx: t0[0], ty: t0[1], w: horiz ? 2 : 1, h: horiz ? 1 : 2, verb: 'Pull', label: 'Loose brickwork', action: `open_gate:${flag}`, hideWhen: flagT(flag), reach: 14 }
        : { kind: 'interact', id: `${id}_gate_${gi}_use`, tx: t0[0], ty: t0[1], w: horiz ? 2 : 1, h: horiz ? 1 : 2, verb: 'Disconnect', label: 'Live junction', action: `open_gate:${flag}`, when: { type: 'hasCapability', id: CAP_GLOVES }, lockedText: 'junction_locked', hideWhen: flagT(flag), reach: 14 },
    );
    if (g.kind === 'rubble') {
      // the clue: dust and lint drawn through the gaps in the brickwork
      const fx = g.from;
      emitters.push({ id: `${id}_draft_${gi}`, type: 'lint', tx: Math.max(fx.rx, Math.min(t0[0], t1[0]) - 3), ty: Math.max(fx.ry, Math.min(t0[1], t1[1]) - 2), w: 6, h: 5, toX: ((t0[0] + t1[0]) / 2) * TILE + 8, toY: ((t0[1] + t1[1]) / 2) * TILE + 8, rate: 3 });
    } else {
      lights.push({ id: nid('l'), x: t0[0] * TILE + 8, y: t0[1] * TILE + 8, radius: 40, color: [150, 255, 220], intensity: 0.7, flicker: 0.5 });
    }
  });

  // ---------------------------------------------------------------- content
  const spawnX = entries.from_parent.tx * TILE + 8;
  const spawnY = entries.from_parent.ty * TILE + 12;
  const reservedUniques: string[] = [];
  const takeUpgrade = (): string | null => {
    const u = UPGRADES.find((x) => !ledger.uniques.includes(x.id) && !reservedUniques.includes(x.id) && !AUTHORED_UNIQUES.includes(x.id));
    if (!u) return null;
    reservedUniques.push(u.id);
    return u.id;
  };
  const takeCurio = (): string | null => {
    const free = CURIOS.filter((c) => !ledger.uniques.includes(c.id) && !reservedUniques.includes(c.id) && !AUTHORED_UNIQUES.includes(c.id));
    if (!free.length) return null;
    const pref = free.filter((c) => c.biomes.includes(socket.biome));
    const c = loot.pick(pref.length && loot.next() < 0.6 ? pref : free);
    reservedUniques.push(c.id);
    return c.id;
  };
  let needGloves = !ledger.uniques.includes(CAP_GLOVES);
  const lootItem = (x: number, y: number): EntityDef => {
    const r = loot.next();
    if (r < 0.5) return { kind: 'pickup', id: nid('p'), tx: x, ty: y, item: 'light_rounds', amount: 6 + Math.floor(loot.next() * 7) };
    if (r < 0.78) return { kind: 'pickup', id: nid('p'), tx: x, ty: y, item: 'bandage', amount: 1 };
    return { kind: 'pickup', id: nid('p'), tx: x, ty: y, item: 'shells', amount: 2 + Math.floor(loot.next() * 3) };
  };

  // order: gate-free rooms first so the gloves never land behind a junction
  const ordered = [...slots].sort((a, b) => rank(a.cell.role) - rank(b.cell.role) || a.y - b.y || a.x - b.x);
  let enemyBudget = fallback ? 1 : Math.min(12, 3 + depth * 2 + Math.floor(enc.next() * 3));
  const enemyTypes = Object.entries(kit.enemies).filter(([t]) => t !== 'drone' || depth >= 2 || socket.biome === 'pump_works') as Array<[string, number]>;
  for (const s of ordered) {
    const role = s.cell.role;
    switch (s.ch) {
      case 'E': {
        if (role === 'arrival' || role === 'rest' || role === 'secret' || role === 'vault' || enemyBudget <= 0) break;
        if (Math.hypot(s.x * TILE + 8 - spawnX, s.y * TILE + 12 - spawnY) < SAFE_SPAWN_PX) break;
        const type = weightedPick(enemyTypes, ([, w]) => w, enc)[0] as 'skitter' | 'leech' | 'drone';
        entities.push({ kind: 'enemy', id: nid('e'), tx: s.x, ty: s.y, type, respawns: true });
        enemyBudget--;
        break;
      }
      case 'L':
        if (role === 'reward' || role === 'secret' || role === 'vault' || loot.next() < 0.45) entities.push(lootItem(s.x, s.y));
        break;
      case 'C': {
        if (needGloves && (role === 'reward' || role === 'landmark' || role === 'combat' || role === 'connector' || role === 'arrival')) {
          entities.push({ kind: 'pickup', id: `${id}_gloves`, tx: s.x, ty: s.y, item: 'insulated_gloves', amount: 1 });
          reservedUniques.push(CAP_GLOVES);
          needGloves = false;
          break;
        }
        let ref: string | null = null;
        let item: 'upgrade' | 'curio' = 'curio';
        if (role === 'secret' || role === 'vault') {
          ref = takeUpgrade();
          item = 'upgrade';
          if (!ref) {
            ref = takeCurio();
            item = 'curio';
          }
        } else if (role === 'landmark' || (role === 'reward' && loot.next() < 0.75) || loot.next() < 0.25) ref = takeCurio();
        if (ref) entities.push({ kind: 'pickup', id: nid('f'), tx: s.x, ty: s.y, item, amount: 1, ref });
        else if (role === 'reward' || role === 'secret' || role === 'vault') entities.push(lootItem(s.x, s.y));
        break;
      }
      case 'P':
        if (deco.next() < 0.65) {
          const d = deco.pick(kit.decor);
          entities.push({ kind: 'prop', id: nid('d'), tx: s.x, ty: s.y, frame: d.frame, ...(d.floor ? { floor: true } : { solid: { w: 1, h: 1 } }) });
        }
        break;
      case 'K': {
        const c = deco.pick(kit.cover);
        entities.push({ kind: 'prop', id: nid('k'), tx: s.x, ty: s.y, frame: c.frame, solid: { w: 2, h: 2 }, opaque: true, ...(c.anim ? { anim: c.anim } : {}), ...(c.oy ? { oy: c.oy } : {}) });
        break;
      }
      case 'S': {
        const col = deco.pick(kit.lightColors);
        lights.push({ id: nid('l'), x: s.x * TILE + 8, y: s.y * TILE + 8, radius: Math.round(deco.range(64, 92)), color: col, intensity: deco.range(0.55, 0.8), ...(deco.next() < 0.3 ? { flicker: deco.range(0.08, 0.3) } : {}) });
        break;
      }
      case 'R': {
        if (role !== 'rest') break;
        const lamp = `${id}_lamp`;
        entities.push({ kind: 'prop', id: `${id}_refuge_lamp`, tx: s.x, ty: s.y, frame: 'refuge_lamp_off', solid: { w: 1, h: 1 }, alt: { when: flagT(lamp), frame: 'refuge_lamp_on' }, glow: { radius: 20, color: [255, 200, 120], dy: -22, when: flagT(lamp) } });
        entities.push({ kind: 'interact', id: `${id}_refuge_light`, tx: s.x, ty: s.y, reach: 26, verb: 'Light', label: 'Refuge lamp', action: `restore_lamp:${lamp}`, hideWhen: flagT(lamp) });
        entities.push({ kind: 'interact', id: `${id}_refuge_rest`, tx: s.x, ty: s.y, reach: 26, verb: 'Rest', label: 'Refuge', action: 'rest_refuge', when: flagT(lamp) });
        lights.push({ id: `${id}_refuge_light_src`, x: s.x * TILE + 8, y: s.y * TILE + 4, radius: 104, color: [255, 196, 120], intensity: 1, when: flagT(lamp) });
        entries.refuge = { tx: s.x, ty: s.y + 1, face: 'up' };
        break;
      }
      case 'M': {
        if (role !== 'arrival' && deco.next() > 0.35) break;
        if (entities.some((e) => e.id === `${id}_survey`)) break;
        const done = `${id}_surveyed`;
        entities.push({ kind: 'prop', id: `${id}_survey`, tx: s.x, ty: s.y, frame: 'survey_map', solid: { w: 1, h: 1 } });
        entities.push({ kind: 'interact', id: `${id}_survey_use`, tx: s.x, ty: s.y, reach: 18, verb: 'Study', label: 'Survey map', action: `survey:${done}`, hideWhen: flagT(done) });
        break;
      }
    }
  }
  if (needGloves) {
    // guarantee: place the gloves on any reachable floor tile in the arrival room
    const a = cells.get(entryKey)!;
    entities.push({ kind: 'pickup', id: `${id}_gloves`, tx: a.cx + 2, ty: a.cy + 1, item: 'insulated_gloves', amount: 1 });
    reservedUniques.push(CAP_GLOVES);
  }

  // dressing: things leaned against the north wall and floor decals, never in a doorway
  const taken = new Set(entities.map((e) => `${e.tx},${e.ty}`));
  for (const s of slots) taken.add(`${s.x},${s.y}`);
  for (const cell of cells.values()) {
    if (cell.module?.landmark) continue;
    const n = 1 + Math.floor(deco.next() * 3);
    for (let i = 0; i < n; i++) {
      const x = cell.rx + 1 + Math.floor(deco.next() * Math.max(1, cell.w - 2));
      const y = cell.ry;
      if (Math.abs(x - cell.cx) <= 2 || grid[y]?.[x] === '#' || grid[y]?.[x] === '~' || taken.has(`${x},${y}`) || taken.has(`${x},${y + 1}`)) continue;
      taken.add(`${x},${y}`);
      entities.push({ kind: 'prop', id: nid('w'), tx: x, ty: y, frame: deco.pick(kit.wallDecor), solid: { w: 1, h: 1 } });
    }
    const decals = Math.floor(deco.next() * 3);
    for (let i = 0; i < decals && kit.floorDecor.length; i++) {
      const x = cell.rx + Math.floor(deco.next() * cell.w);
      const y = cell.ry + 1 + Math.floor(deco.next() * Math.max(1, cell.h - 2));
      if (grid[y]?.[x] !== '.' || taken.has(`${x},${y}`)) continue;
      taken.add(`${x},${y}`);
      entities.push({ kind: 'prop', id: nid('f'), tx: x, ty: y, frame: deco.pick(kit.floorDecor), floor: true });
    }
  }

  // landmark set piece
  let landmarkName: string | undefined;
  for (const cell of cells.values()) {
    const lm = cell.module?.landmark;
    if (!lm) continue;
    landmarkName = lm.name;
    reservedUniques.push(cell.module!.id);
    for (const p of lm.props) {
      const e: EntityDef = { kind: 'prop', id: nid('m'), tx: cell.rx + p.dx, ty: cell.ry + p.dy, frame: p.frame };
      if (p.solid) e.solid = p.solid;
      if (p.opaque) e.opaque = true;
      if (p.wall) e.wall = true;
      if (p.floor) e.floor = true;
      if (p.anim) e.anim = p.anim;
      if (p.ox) e.ox = p.ox;
      if (p.oy) e.oy = p.oy;
      entities.push(e);
    }
    lm.lights.forEach((l) => lights.push({ id: nid('l'), x: (cell.rx + l.dx) * TILE + 8, y: (cell.ry + l.dy) * TILE + 8, radius: l.radius, color: l.color, intensity: l.intensity, ...(l.flicker ? { flicker: l.flicker } : {}) }));
    if (lm.emitter) emitters.push({ id: `${id}_landmark_air`, type: 'lint', tx: cell.rx + 1, ty: cell.ry + 3, w: cell.w - 2, h: cell.h - 4, toX: (cell.rx + lm.emitter.toDx) * TILE + 8, toY: (cell.ry + lm.emitter.toDy) * TILE + 8, rate: 6 });
    entities.push({ kind: 'trigger', id: `${id}_landmark_seen`, tx: cell.rx, ty: cell.ry, w: cell.w, h: cell.h, action: `landmark:${lm.name}`, once: true });
  }

  // a ladder back up to a street manhole: the shortcut that makes deep trips comfortable
  let manhole: string | undefined;
  if (!fallback && depth === 1 && ledger.manholesFree.length && topo.next() < 0.75) {
    const cand = [...cells.values()].filter((c) => c.role !== 'secret' && c.role !== 'vault' && c.key !== entryKey);
    if (cand.length) {
      const cell = topo.pick(cand);
      const lx = cell.rx + 1 + Math.floor(topo.next() * Math.max(1, cell.w - 2));
      const ly = cell.ry;
      if (grid[ly]?.[lx] !== '#' && grid[ly]?.[lx] !== '~' && !slots.some((s) => s.x === lx && s.y === ly)) {
        manhole = ledger.manholesFree[0]!;
        entities.push({ kind: 'prop', id: `${id}_ladder`, tx: lx, ty: ly, frame: 'ladder_up', wall: true, oy: 4 });
        entities.push({ kind: 'exit', id: `${id}_ladder_exit`, tx: lx, ty: ly, w: 1, h: 1, auto: false, verb: 'Climb', label: 'Ladder to the street', target: { region: STREET_REGION, entry: `manhole_${manhole}` } });
        entries.ladder = { tx: lx, ty: ly + 1, face: 'down' };
        lights.push({ id: nid('l'), x: lx * TILE + 8, y: ly * TILE + 10, radius: 44, color: [200, 220, 255], intensity: 0.6 });
      }
    }
  }

  const name = pickName(kit.names, ledger.names, topo);
  const record: GeneratedRegionRecord = {
    id,
    generatorVersion: GENERATOR_VERSION,
    seed,
    attempt,
    biome: socket.biome,
    depth,
    socketId: socket.socketId,
    parentRegion: socket.parentRegion,
    parentEntry: socket.parentEntry,
    name,
    map: grid.map((r) => r.join('')),
    entities,
    lights,
    entries,
    emitters,
    childSockets,
    ...(entries.refuge ? { refuge: { id: `refuge_${id}`, entry: 'refuge' } } : {}),
    ...(manhole ? { manhole } : {}),
    ...(landmarkName ? { landmark: landmarkName } : {}),
  };
  return { record, reserved: { modules: reservedModules, uniques: reservedUniques, name, ...(manhole ? { manhole } : {}) } };
}

function rank(role: Role): number {
  return role === 'arrival' ? 0 : role === 'reward' || role === 'landmark' ? 1 : role === 'secret' || role === 'vault' ? 3 : 2;
}

function entryCell(side: Side, cols: number, rows: number, rng: Rng): [number, number] {
  if (side === 'W') return [0, Math.floor(rng.next() * rows)];
  if (side === 'E') return [cols - 1, Math.floor(rng.next() * rows)];
  if (side === 'N') return [Math.floor(rng.next() * cols), 0];
  return [Math.floor(rng.next() * cols), rows - 1];
}

function sideBetween(a: Cell, b: Cell): Side {
  if (b.c > a.c) return 'E';
  if (b.c < a.c) return 'W';
  if (b.r > a.r) return 'S';
  return 'N';
}

function doorsOk(m: RoomModule, doors: Set<Side>): boolean {
  if (!m.doors) return true;
  for (const d of doors) if (!m.doors.includes(d)) return false;
  return true;
}

function weightedPick<T>(items: T[], weight: (t: T) => number, rng: Rng): T {
  let total = 0;
  for (const i of items) total += weight(i);
  let r = rng.next() * total;
  for (const i of items) {
    r -= weight(i);
    if (r <= 0) return i;
  }
  return items[items.length - 1]!;
}

function varyFloor(ch: string, rng: Rng): string {
  if (ch !== '.') return ch;
  const r = rng.next();
  return r < 0.12 ? ',' : r < 0.16 ? 'x' : '.';
}

function pickNextBiome(next: BiomeId[], current: BiomeId, rng: Rng): BiomeId {
  // mostly stay in family; transitions happen through believable connectors
  return rng.next() < 0.65 ? current : rng.pick(next);
}

function pickName(parts: [string[], string[]], used: string[], rng: Rng): string {
  for (let i = 0; i < 40; i++) {
    const n = `${rng.pick(parts[0])} ${rng.pick(parts[1])}`;
    if (!used.includes(n)) return n;
  }
  let k = 2;
  const base = `${parts[0][0]} ${parts[1][0]}`;
  while (used.includes(`${base} ${k}`)) k++;
  return `${base} ${k}`;
}

// ---------------------------------------------------------------- region conversion & validation
export function toRegionDef(rec: GeneratedRegionRecord): RegionDef {
  const kit = KITS[rec.biome];
  const def: RegionDef = {
    id: rec.id,
    name: rec.name,
    biome: rec.biome,
    map: rec.map,
    legend: kit.legend,
    ambient: ambientFor(kit, rec.depth),
    ambience: kit.ambience,
    motes: 'dust',
    entries: rec.entries,
    lights: rec.lights,
    entities: rec.entities,
    emitters: rec.emitters,
    discoverTitle: rec.name,
  };
  if (rec.refuge) def.refuge = rec.refuge;
  return def;
}

/** Returns a list of problems; empty means the district is safe to commit. */
export function validateDistrict(rec: GeneratedRegionRecord): string[] {
  const errs: string[] = [];
  const def = toRegionDef(rec);
  let grid: Grid;
  try {
    grid = new Grid(def);
  } catch (e) {
    return [(e as Error).message];
  }
  const ids = def.entities.map((e) => e.id);
  if (new Set(ids).size !== ids.length) errs.push('duplicate entity ids');
  const spawn = def.entries.from_parent;
  if (!spawn) return ['missing arrival entry'];
  const flood = (gatesOpen: boolean): Uint8Array => {
    const block = new Uint8Array(grid.block);
    for (const e of def.entities)
      if (e.kind === 'prop' && e.solid && !(gatesOpen && e.solidWhen))
        for (let y = e.ty; y < e.ty + e.solid.h; y++) for (let x = e.tx; x < e.tx + e.solid.w; x++) block[y * grid.w + x] = 1;
    const seen = new Uint8Array(grid.w * grid.h);
    const q = [spawn.ty * grid.w + spawn.tx];
    if (block[q[0]!]) return seen;
    seen[q[0]!] = 1;
    while (q.length) {
      const i = q.pop()!;
      const x = i % grid.w;
      const y = (i / grid.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
        const ni = ny * grid.w + nx;
        if (seen[ni] || block[ni]) continue;
        seen[ni] = 1;
        q.push(ni);
      }
    }
    return seen;
  };
  const open = flood(true);
  const closed = flood(false);
  if (!open[spawn.ty * grid.w + spawn.tx]) errs.push('spawn blocked');
  const near = (m: Uint8Array, tx: number, ty: number, w = 1, h = 1): boolean => {
    for (let y = ty - 1; y <= ty + h; y++) for (let x = tx - 1; x <= tx + w; x++) if (x >= 0 && y >= 0 && x < grid.w && y < grid.h && m[y * grid.w + x]) return true;
    return false;
  };
  const at = (m: Uint8Array, tx: number, ty: number): boolean => !!m[ty * grid.w + tx];
  for (const e of def.entities) {
    if (e.kind === 'exit') {
      const required = e.id.endsWith('_return') || e.id.includes('_frontier_') || e.id.endsWith('_ladder_exit');
      if (!near(required ? closed : open, e.tx, e.ty, e.w, e.h)) errs.push(`exit ${e.id} unreachable`);
    } else if (e.kind === 'pickup') {
      const req = e.item === 'insulated_gloves';
      if (!at(req ? closed : open, e.tx, e.ty)) errs.push(`pickup ${e.id} unreachable`);
    } else if (e.kind === 'interact') {
      const req = e.action === 'rest_refuge' || e.action.startsWith('restore_lamp') || e.action.startsWith('survey');
      if (!near(req ? closed : open, e.tx, e.ty, e.w ?? 1, e.h ?? 1)) errs.push(`interaction ${e.id} unreachable`);
    } else if (e.kind === 'enemy') {
      if (!at(open, e.tx, e.ty)) errs.push(`enemy ${e.id} off the walkable area`);
      if (Math.hypot(e.tx - spawn.tx, e.ty - spawn.ty) * TILE < SAFE_SPAWN_PX - 1) errs.push(`enemy ${e.id} too close to arrival`);
    }
  }
  return errs;
}
