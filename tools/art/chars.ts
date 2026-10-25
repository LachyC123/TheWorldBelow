import { Raster, type Color } from './raster.ts';
import { P } from './palette.ts';
import type { Frame } from './pack.ts';

/** Rim-light pixels exposed to the upper-left (readable player/enemy edges), then outline. */
function finish(r: Raster, rim: Color = P.bone[2], outline: Color = P.ink): Raster {
  const marks: Array<[number, number]> = [];
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) if (r.alpha(x, y) && (!r.alpha(x, y - 1) || !r.alpha(x - 1, y))) marks.push([x, y]);
  for (const [x, y] of marks) {
    const c = r.get(x, y)!;
    const rc = typeof rim === 'string' ? rim : '#ffffff';
    const rr = parseInt(rc.slice(1, 3), 16), rg = parseInt(rc.slice(3, 5), 16), rb = parseInt(rc.slice(5, 7), 16);
    r.px(x, y, [Math.round((c[0] + rr) / 2), Math.round((c[1] + rg) / 2), Math.round((c[2] + rb) / 2), 255]);
  }
  return r.outline(outline);
}

// ---------------------------------------------------------------- player
type Facing = 'down' | 'up' | 'right';
interface Pose { bob: number; legA: number; legB: number; armA: number; armB: number; lean: number; crouch: number; heal?: boolean; hurt?: boolean }

function drawPlayer(face: Facing, pose: Pose): Raster {
  const r = new Raster(24, 32);
  const cx = 12 + pose.lean;
  const top = 4 + pose.bob + pose.crouch;
  const legTop = 23 + Math.floor(pose.crouch / 2);
  // legs
  const legColor = P.coat[0];
  if (face === 'right') {
    const l1 = pose.legA, l2 = pose.legB;
    r.rect(cx - 2 + l1, legTop, 3, 30 - legTop, legColor).rect(cx - 2 + l1, 29, 4, 2, P.wood[1]);
    r.rect(cx - 1 + l2, legTop, 3, 30 - legTop, P.coat[1]).rect(cx - 1 + l2, 29, 4, 2, P.wood[2]);
  } else {
    r.rect(cx - 4, legTop + Math.max(0, pose.legA), 3, 30 - legTop - Math.max(0, pose.legA), legColor);
    r.rect(cx + 1, legTop + Math.max(0, pose.legB), 3, 30 - legTop - Math.max(0, pose.legB), legColor);
    r.rect(cx - 4, 29 - Math.min(0, -pose.legA) * 0, 3, 2, P.wood[1]);
    r.rect(cx + 1, 29, 3, 2, P.wood[1]);
  }
  // coat body
  const bodyTop = top + 9;
  r.rect(cx - 5, bodyTop, 10, legTop - bodyTop + 2, P.coat[2]);
  r.rect(cx - 5, bodyTop, 2, legTop - bodyTop + 2, P.coat[3]);
  r.rect(cx + 3, bodyTop, 2, legTop - bodyTop + 2, P.coat[1]);
  r.hline(cx - 5, cx + 4, legTop + 1, P.coat[1]); // hem
  if (face === 'down') {
    r.vline(cx, bodyTop + 2, legTop + 1, P.coat[1]); // coat opening
    r.px(cx - 2, bodyTop + 5, P.amber[3]).px(cx - 2, bodyTop + 8, P.amber[3]); // buttons
    r.rect(cx - 5, bodyTop + 7, 10, 1, P.wood[1]); // belt
    r.px(cx + 1, bodyTop + 7, P.amber[3]);
  } else if (face === 'up') {
    r.rect(cx - 4, bodyTop + 1, 8, 7, P.wood[2]); // backpack
    r.rect(cx - 4, bodyTop + 1, 8, 1, P.wood[3]);
    r.rect(cx - 3, bodyTop + 4, 6, 1, P.wood[1]);
    r.px(cx + 2, bodyTop + 3, P.mint[3]); // radio LED
  } else {
    r.rect(cx - 6, bodyTop + 1, 3, 7, P.wood[2]); // backpack side
    r.rect(cx - 5, bodyTop + 7, 9, 1, P.wood[1]);
  }
  // arms
  if (pose.heal) {
    r.rect(cx - 4, bodyTop + 3, 8, 3, P.coat[3]);
    r.rect(cx - 2, bodyTop + 3, 4, 3, P.bone[3]);
    r.px(cx - 1, bodyTop + 4, P.verm[2]);
  } else if (face !== 'right') {
    r.rect(cx - 7, bodyTop + 1 + pose.armA, 2, 7, P.coat[3]).px(cx - 7, bodyTop + 8 + pose.armA, P.skin[2]).px(cx - 6, bodyTop + 8 + pose.armA, P.skin[2]);
    r.rect(cx + 5, bodyTop + 1 + pose.armB, 2, 7, P.coat[1]).px(cx + 5, bodyTop + 8 + pose.armB, P.skin[1]).px(cx + 6, bodyTop + 8 + pose.armB, P.skin[1]);
  } else {
    r.rect(cx - 1 + pose.armA, bodyTop + 1, 3, 7, P.coat[3]).rect(cx - 1 + pose.armA, bodyTop + 8, 3, 1, P.skin[2]);
  }
  // scarf (amber: the warm human note)
  r.rect(cx - 4, bodyTop - 1, 8, 3, P.amber[2]);
  r.hline(cx - 4, cx + 3, bodyTop - 1, P.amber[3]);
  if (face === 'up') r.rect(cx + 1, bodyTop + 2, 2, 4, P.amber[2]);
  if (face === 'right') r.rect(cx - 5 - (pose.bob ? 1 : 0), bodyTop, 2, 4, P.amber[2]);
  // head
  const hy = top + 4;
  r.ellipse(cx, hy + 0.5, 4.6, 4.8, P.skin[2]);
  if (face === 'down') {
    r.ellipse(cx, hy - 1.5, 4.8, 3.2, P.ink); // hair
    r.rect(cx - 5, hy - 2, 2, 5, P.ink);
    r.rect(cx + 3, hy - 2, 2, 4, P.ink);
    r.px(cx - 2, hy + 1, P.ink).px(cx + 1, hy + 1, P.ink); // eyes
    r.px(cx - 2, hy, P.bone[3]).px(cx + 1, hy, P.bone[3]);
    r.hline(cx - 1, cx, hy + 3, P.skin[1]);
  } else if (face === 'up') {
    r.ellipse(cx, hy, 4.8, 5, P.ink);
    r.px(cx - 2, hy - 3, P.slate[3]).px(cx - 1, hy - 3, P.slate[3]);
  } else {
    r.ellipse(cx - 1, hy - 1.5, 4.6, 3.4, P.ink);
    r.rect(cx - 5, hy - 2, 3, 6, P.ink);
    r.px(cx + 2, hy + 1, P.ink).px(cx + 2, hy, P.bone[3]);
    r.px(cx + 5, hy + 2, P.skin[3]);
  }
  if (pose.hurt) r.map((_x, _y, c) => [Math.min(255, c[0] + 90), Math.min(255, c[1] + 50), Math.min(255, c[2] + 50), 255]);
  return finish(r);
}

function deathFrame(i: number): Raster {
  // Collapse sequence: kneel, slump, fall, lie still.
  if (i <= 1) return drawPlayer('down', { bob: 0, legA: 0, legB: 0, armA: 1, armB: 1, lean: 0, crouch: 3 + i * 2 });
  const r = new Raster(24, 32);
  const lying = drawPlayer('right', { bob: 0, legA: 0, legB: 1, armA: 0, armB: 0, lean: 0, crouch: 0 }).rot90(i >= 3 ? 1 : 0);
  if (i === 2) {
    r.blit(drawPlayer('right', { bob: 0, legA: -1, legB: 2, armA: 1, armB: 0, lean: 2, crouch: 6 }), 0, 0);
    return r;
  }
  r.blit(lying, -4, 32 - lying.h);
  if (i === 5) r.map((_x, _y, c) => [Math.round(c[0] * 0.8), Math.round(c[1] * 0.8), Math.round(c[2] * 0.85), 255]);
  return r;
}

export function playerFrames(): Frame[] {
  const out: Frame[] = [];
  const faces: Facing[] = ['down', 'up', 'right'];
  for (const f of faces) {
    for (let i = 0; i < 4; i++) out.push({ name: `player_${f}_idle_${i}`, img: drawPlayer(f, { bob: i === 2 ? 1 : 0, legA: 0, legB: 0, armA: i === 2 ? 1 : 0, armB: i === 2 ? 1 : 0, lean: 0, crouch: 0 }) });
    for (let i = 0; i < 6; i++) {
      const s = Math.sin((i / 6) * Math.PI * 2);
      const pose: Pose = f === 'right'
        ? { bob: i % 3 === 1 ? -1 : 0, legA: Math.round(s * 3), legB: Math.round(-s * 3), armA: Math.round(-s * 2), armB: 0, lean: 0, crouch: 0 }
        : { bob: i % 3 === 1 ? -1 : 0, legA: Math.round(Math.max(0, s) * 2), legB: Math.round(Math.max(0, -s) * 2), armA: Math.round(s), armB: Math.round(-s), lean: 0, crouch: 0 };
      out.push({ name: `player_${f}_walk_${i}`, img: drawPlayer(f, pose) });
    }
    for (let i = 0; i < 4; i++) {
      const crouch = [3, 5, 4, 1][i]!;
      out.push({ name: `player_${f}_dodge_${i}`, img: drawPlayer(f, { bob: 0, legA: f === 'right' ? 3 : 1, legB: f === 'right' ? -3 : 1, armA: f === 'right' ? -2 : 2, armB: 2, lean: f === 'right' ? 2 : 0, crouch }) });
    }
    for (let i = 0; i < 2; i++) out.push({ name: `player_${f}_hurt_${i}`, img: drawPlayer(f, { bob: 0, legA: 0, legB: 1, armA: -1, armB: -1, lean: f === 'right' ? -1 : 0, crouch: 1, hurt: i === 0 }) });
    for (let i = 0; i < 4; i++) out.push({ name: `player_${f}_heal_${i}`, img: drawPlayer(f, { bob: i % 2, legA: 0, legB: 0, armA: 0, armB: 0, lean: 0, crouch: 0, heal: true }) });
  }
  for (let i = 0; i < 6; i++) out.push({ name: `player_death_${i}`, img: deathFrame(i) });
  return out;
}

// ---------------------------------------------------------------- weapons (layered, rotate at runtime)
export function weaponFrames(): Frame[] {
  const pistol = new Raster(14, 8);
  pistol.rect(3, 2, 9, 3, P.slate[3]).hline(3, 11, 2, P.slate[5]).rect(11, 2, 2, 2, P.slate[2]);
  pistol.rect(3, 4, 3, 3, P.wood[2]).px(6, 5, P.slate[2]);
  pistol.rect(1, 3, 3, 3, P.skin[2]); // hand
  finish(pistol);
  const shotgun = new Raster(22, 8);
  shotgun.rect(5, 2, 15, 2, P.slate[3]).hline(5, 19, 2, P.slate[5]).rect(7, 4, 9, 2, P.wood[2]).hline(8, 14, 4, P.wood[3]);
  shotgun.rect(0, 3, 6, 3, P.wood[1]).rect(1, 3, 3, 3, P.skin[2]).rect(10, 4, 3, 2, P.skin[1]);
  finish(shotgun);
  return [
    { name: 'weapon_service_pistol', img: pistol, pivotX: 2 / 14, pivotY: 4 / 8 },
    { name: 'weapon_pump_shotgun', img: shotgun, pivotX: 2 / 22, pivotY: 4 / 8 },
  ];
}

// ---------------------------------------------------------------- Pipe Skitter
type SkitterPose = 'idle' | 'run' | 'crouch' | 'lunge' | 'hit' | 'dead';
function drawSkitter(pose: SkitterPose, f: number): Raster {
  const r = new Raster(22, 16);
  const low = pose === 'crouch' ? 2 : 0;
  const stretch = pose === 'lunge' ? 3 : 0;
  const by = 8 + low;
  const legPhase = pose === 'run' ? [0, 1, 0, -1][f % 4]! : pose === 'idle' ? (f % 2) : 0;
  // legs: three pairs of bent pipe-like limbs
  for (let k = 0; k < 3; k++) {
    const lx = 6 + k * 4 - (pose === 'lunge' ? k : 0);
    const ph = (k % 2 ? legPhase : -legPhase);
    const knee = pose === 'crouch' ? 1 : 0;
    r.line(lx, by + 1, lx - 2 + ph, by + 4 - knee, P.rust[1]);
    r.line(lx - 2 + ph, by + 4 - knee, lx - 2 + ph, 15, P.rust[0]);
    r.line(lx + 1, by + 1, lx + 3 - ph, by + 4 - knee, P.rust[2]);
    r.line(lx + 3 - ph, by + 4 - knee, lx + 3 - ph, 15, P.rust[1]);
  }
  // segmented carapace
  r.ellipse(10 + stretch / 2, by, 7 + stretch / 2, 3.6, P.rust[2]);
  r.ellipse(9 + stretch / 2, by - 1, 5 + stretch / 2, 2.2, P.rust[3]);
  for (let s = 5; s < 16 + stretch; s += 3) r.vline(s, by - 3, by + 1, P.rust[1]);
  r.hline(5, 13 + stretch, by - 3, P.rust[4]);
  // head + mandibles
  const hx = 17 + stretch;
  r.ellipse(hx, by + 0.5, 3, 2.6, P.rust[1]);
  r.line(hx + 2, by + 2, hx + 4, by + 3 - (pose === 'lunge' ? 2 : 0), P.bone[1]);
  r.line(hx + 2, by - 1, hx + 4, by - 2 + (pose === 'lunge' ? -1 : 0), P.bone[1]);
  // eye: mint when calm, vermilion when telegraphing
  const eye = pose === 'crouch' || pose === 'lunge' ? P.verm[3] : P.mint[3];
  r.px(hx + 1, by - 1, eye).px(hx, by - 1, pose === 'crouch' ? P.verm[2] : P.mint[2]);
  if (pose === 'hit') r.map((_x, _y, c) => [Math.min(255, c[0] + 100), Math.min(255, c[1] + 90), Math.min(255, c[2] + 80), 255]);
  if (pose === 'dead') {
    const d = new Raster(22, 16);
    const flipped = new Raster(22, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 22; x++) { const c = r.get(x, y)!; if (c[3]) flipped.px(x, 15 - y, c); }
    d.blit(flipped, 0, f >= 2 ? 3 : 0);
    if (f >= 3) d.map((_x, _y, c) => [Math.round(c[0] * 0.75), Math.round(c[1] * 0.7), Math.round(c[2] * 0.7), f >= 4 ? 200 : 255]);
    d.ellipse(11, 13, 5 + f, 1.5, [90, 140, 40, 150]);
    return d.outline(P.ink);
  }
  return finish(r, P.rust[4]);
}

export function skitterFrames(): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 2; i++) out.push({ name: `skitter_idle_${i}`, img: drawSkitter('idle', i) });
  for (let i = 0; i < 4; i++) out.push({ name: `skitter_run_${i}`, img: drawSkitter('run', i) });
  for (let i = 0; i < 2; i++) out.push({ name: `skitter_crouch_${i}`, img: drawSkitter('crouch', i) });
  for (let i = 0; i < 2; i++) out.push({ name: `skitter_lunge_${i}`, img: drawSkitter('lunge', i) });
  out.push({ name: 'skitter_hit_0', img: drawSkitter('hit', 0) });
  for (let i = 0; i < 5; i++) out.push({ name: `skitter_dead_${i}`, img: drawSkitter('dead', i) });
  return out;
}

// ---------------------------------------------------------------- Lamp Leech
type LeechPose = 'idle' | 'agitated' | 'swell' | 'latch' | 'flee' | 'dead';
function drawLeech(pose: LeechPose, f: number): Raster {
  const r = new Raster(18, 22);
  const pulse = f % 3 === 1 ? 0.6 : 0;
  const swell = pose === 'swell' ? 1.5 + f * 0.5 : 0;
  const shrink = pose === 'flee' ? -1.5 : 0;
  const cy = pose === 'latch' ? 13 : 9;
  const rx = 6 + pulse + swell + shrink;
  const ry = (pose === 'latch' ? 4 : 6) + pulse + swell + shrink;
  // tendrils
  for (let t = 0; t < 4; t++) {
    const tx = 5 + t * 2.7;
    const wav = ((f + t) % 2) * (pose === 'agitated' ? 2 : 1);
    r.line(tx, cy + ry - 1, tx + wav - 0.5, 21 - (pose === 'latch' ? 3 : 0), [150, 200, 180, 160]);
  }
  // translucent bell
  r.ellipse(9, cy, rx, ry, [120, 190, 165, 200]);
  r.ellipse(9, cy - 1, rx - 1.5, ry - 1.8, [170, 230, 205, 210]);
  // light-hungry core
  const core = pose === 'swell' ? P.verm[3] : pose === 'agitated' ? P.amber[4] : P.mint[1];
  r.ellipse(9, cy + 1, 2.4 + swell / 2, 2.2 + swell / 2, core);
  r.px(8, cy, P.bone[3]);
  if (pose === 'agitated' || pose === 'swell') {
    for (let s = -2; s <= 2; s++) r.px(9 + s * 2.5, cy - ry - 1, P.verm[2]);
  }
  if (pose === 'dead') {
    const d = new Raster(18, 22);
    d.ellipse(9, 18, 6 + f, 2.5, [120, 190, 165, 200 - f * 30]);
    d.ellipse(9, 18, 2, 1, P.mint[1]);
    return d.outline([12, 20, 18, 200]);
  }
  return r.outline([12, 30, 26, 255]);
}

export function leechFrames(): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 3; i++) out.push({ name: `leech_idle_${i}`, img: drawLeech('idle', i) });
  for (let i = 0; i < 2; i++) out.push({ name: `leech_agitated_${i}`, img: drawLeech('agitated', i) });
  for (let i = 0; i < 2; i++) out.push({ name: `leech_swell_${i}`, img: drawLeech('swell', i) });
  for (let i = 0; i < 2; i++) out.push({ name: `leech_latch_${i}`, img: drawLeech('latch', i) });
  for (let i = 0; i < 2; i++) out.push({ name: `leech_flee_${i}`, img: drawLeech('flee', i) });
  for (let i = 0; i < 4; i++) out.push({ name: `leech_dead_${i}`, img: drawLeech('dead', i) });
  return out;
}

// ---------------------------------------------------------------- The Pipekeeper (mini-boss)
type KeeperPose = 'idle' | 'walk' | 'hose_tell' | 'hose' | 'rush_tell' | 'rush' | 'vent_tell' | 'vent' | 'stunned' | 'dead';
function drawKeeper(pose: KeeperPose, f: number): Raster {
  const r = new Raster(52, 52);
  const bob = pose === 'walk' ? (f % 2) : 0;
  const lean = pose === 'rush' ? 3 : pose === 'rush_tell' ? -2 : 0;
  const baseY = 46;
  // four stubby hydraulic legs
  const legs = [8, 17, 31, 40];
  legs.forEach((lx, k) => {
    const step = pose === 'walk' ? ((k + f) % 2) * 2 : 0;
    r.rect(lx + lean / 2, baseY - 12 + step, 5, 12 - step, P.slate[2]);
    r.rect(lx + lean / 2, baseY - 12 + step, 5, 2, P.slate[4]);
    r.rect(lx - 1 + lean / 2, baseY - 2, 7, 3, P.slate[1]);
  });
  // boiler tank body
  const ty = 14 + bob + (pose === 'stunned' ? 3 : 0);
  r.ellipse(26 + lean, ty + 12, 19, 14, P.rust[2]);
  r.ellipse(24 + lean, ty + 9, 15, 9, P.rust[3]);
  r.ellipse(21 + lean, ty + 6, 7, 3, P.rust[4]);
  for (let bx = 10; bx <= 42; bx += 8) r.vline(bx + lean, ty + 2, ty + 22, P.rust[1]);
  for (let bx = 12; bx <= 40; bx += 4) r.px(bx + lean, ty + 20, P.rust[4]);
  // back vents: glow amber when telegraphing burst
  const ventHot = pose === 'vent_tell' || pose === 'vent';
  for (let v = 0; v < 3; v++) {
    const vx = 16 + v * 8 + lean;
    r.rect(vx, ty - 2, 5, 4, P.slate[1]);
    r.rect(vx + 1, ty - 1, 3, 2, ventHot ? (f % 2 ? P.amber[4] : P.amber[3]) : P.slate[0]);
  }
  // exposed core (vulnerable when stunned)
  const coreCol = pose === 'stunned' ? (f % 2 ? P.mint[5] : P.mint[4]) : P.mint[2];
  r.ellipse(26 + lean, ty + 15, 4, 3, P.slate[0]);
  r.ellipse(26 + lean, ty + 15, 2.5, 2, coreCol);
  // headlamp eye
  const eyeCol = pose === 'rush_tell' || pose === 'hose_tell' ? P.verm[3] : P.mint[4];
  r.rect(38 + lean, ty + 4, 8, 7, P.slate[2]);
  r.rect(39 + lean, ty + 5, 6, 5, P.slate[0]);
  r.rect(40 + lean, ty + 6, 4, 3, eyeCol);
  r.px(40 + lean, ty + 6, P.bone[3]);
  // hose arm
  const hoseUp = pose === 'hose_tell' ? -6 : pose === 'hose' ? -2 + f : 4;
  r.line(8 + lean, ty + 12, 2, ty + 12 + hoseUp, P.slate[1]);
  r.line(9 + lean, ty + 13, 3, ty + 13 + hoseUp, P.slate[3]);
  r.rect(0, ty + 11 + hoseUp, 4, 4, P.amber[2]);
  r.px(0, ty + 12 + hoseUp, P.ink);
  if (pose === 'dead') {
    const d = new Raster(52, 52);
    const sunk = r.clone().map((_x, _y, c) => [Math.round(c[0] * 0.6), Math.round(c[1] * 0.6), Math.round(c[2] * 0.6), 255]);
    d.blit(sunk, 0, Math.min(6, f * 2));
    if (f >= 2) d.ellipse(26, 46, 18, 3, [20, 40, 50, 160]);
    return d.outline(P.ink);
  }
  return finish(r, P.rust[4]);
}

export function keeperFrames(): Frame[] {
  const out: Frame[] = [];
  const add = (pose: KeeperPose, n: number): void => {
    for (let i = 0; i < n; i++) out.push({ name: `keeper_${pose}_${i}`, img: drawKeeper(pose, i) });
  };
  add('idle', 2);
  add('walk', 4);
  add('hose_tell', 2);
  add('hose', 2);
  add('rush_tell', 2);
  add('rush', 2);
  add('vent_tell', 2);
  add('vent', 2);
  add('stunned', 2);
  add('dead', 4);
  return out;
}
