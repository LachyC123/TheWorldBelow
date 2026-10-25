// Browser smoke test for the first playable slice (docs/design/docs/10 path A-E subset).
// Usage: npm run build && npx vite preview --port 4173 & npm run smoke [-- http://localhost:4173/]
// Drives the real game UI with keyboard/touch. Teleports between waypoints via the ?smoke
// test hook to keep runtime short; movement, combat, saves and menus run through game code.
// Note: headless Chromium renders with software GL, so frame rates here are not device data.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const URL = `${BASE}?smoke=1`;
const OUT = 'captures/smoke/';
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

const S = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });
const state = () =>
  S(() => {
    const a = window.__twb.app;
    const w = a.world;
    return { mode: a.mode, region: w.def.id, hp: w.data.hp, flags: w.data.flags, journal: w.data.journal, weapons: w.data.weapons, caps: w.data.capabilities, x: w.player.x, y: w.player.y, alive: w.player.alive, refuge: w.data.lastRefuge, cache: w.data.cache, mag: w.data.mag, res: w.data.reserves };
  });
const tp = (tx, ty, dx = 8, dy = 12) => S(([x, y]) => { const p = window.__twb.app.world.player; p.x = x; p.y = y; }, [tx * 16 + dx, ty * 16 + dy]);
const skipDialogue = async () => {
  for (let i = 0; i < 20; i++) {
    const active = await S(() => window.__twb.app.dialogue.active);
    if (!active) return;
    await wait(220);
    await page.keyboard.press('Enter');
  }
};
const interact = async () => {
  await page.keyboard.press('e');
  await wait(350);
  await skipDialogue();
  await wait(200);
};
const waitRegion = async (id, ms = 4000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await S(() => ({ r: window.__twb.app.world.def.id, m: window.__twb.app.mode }));
    if (s.r === id && s.m === 'play') return true;
    await wait(150);
  }
  return false;
};
const noMouseAim = () => S(() => { window.__twb.app.input.mouseActive = false; });

await page.goto(URL);
await page.waitForSelector('#title-screen', { timeout: 20000 });
await wait(600);
await shot('01_title');
check('title screen shows', await page.isVisible('#title-screen'));

// ---------------------------------------------------------------- A. main path
await page.getByText('New Journey').click();
await page.locator('.slot .btn').first().click();
await wait(900);
let s = await state();
check('new journey starts at home', s.region === 'region_home_001' && s.mode === 'play');
await shot('02_home');

await tp(3, 3, 8, 12);
await interact();
s = await state();
check('intercom answered, lead journalled', s.flags.intercom_answered && s.journal.includes('lead_relay'));

await tp(11, 5, 16, 12);
await interact();
s = await state();
check('grandmother note read', s.flags.home_note_read && s.journal.includes('lead_toolbox'));

await tp(8, 10);
await page.keyboard.down('s');
await wait(500);
await page.keyboard.up('s');
check('walked out of home to the street', await waitRegion('region_surface_001'));
await wait(400);
await shot('03_street');

await tp(35, 16, 8, 8);
await page.keyboard.down('s');
await wait(300);
await page.keyboard.up('s');
await wait(400);
await skipDialogue();
s = await state();
check('service pistol collected', s.weapons.includes('service_pistol') && s.flags.has_pistol);

await noMouseAim();
await page.keyboard.down('w');
await wait(100);
await page.keyboard.up('w');
await page.keyboard.down('k');
let skitterDead = false;
for (let i = 0; i < 70 && !skitterDead; i++) {
  await wait(150);
  if (i === 6) await shot('04_street_fight');
  const e = await S(() => { const en = window.__twb.app.world.enemies.find((x) => x.id === 'street_drain_skitter'); return { dead: en.dead, st: en.state }; });
  if (e.st === 'telegraph') await page.keyboard.press('Space');
  skitterDead = e.dead;
}
await page.keyboard.up('k');
s = await state();
check('drain Skitter defeated with assisted fire', skitterDead, `hp ${Math.round(s.hp)}`);

await tp(22, 4);
await interact();
check('entered the laundrette', await waitRegion('region_laundry_001'));
await tp(19, 4, 0, 12);
await interact();
await tp(20, 7);
await interact();
s = await state();
check('shelf clue read and hatch opened', s.flags.laundry_shelf_clue_read && s.flags.laundry_hatch_open);
await shot('05_laundrette');
await page.keyboard.press('e');
check('descended to the Service Veins', await waitRegion('region_service_001'));
await wait(300);
await shot('06_service');

await tp(21, 4);
await interact();
await page.keyboard.press('e');
await wait(500);
s = await state();
check('refuge lamp restored and rested', s.flags.relay_booth_lamp_lit && s.refuge.id === 'refuge_relay_booth');
await shot('07_booth');

await tp(46, 16);
await page.keyboard.down('d');
await wait(400);
await page.keyboard.up('d');
check('reached the Pumping Gallery', await waitRegion('region_gallery_001'));
await wait(300);
await shot('08_gallery');

await tp(16, 7);
await interact();
await tp(10, 7);
await wait(300);
await skipDialogue();
s = await state();
check('both humming-wall clues observed', s.flags.clue_airflow_diagram && s.flags.clue_moving_lint);
await tp(18, 6, 8, 12);
await interact();
await tp(11, 7);
await interact();
s = await state();
check('fan started and maintenance panel opened', s.flags.gallery_fan_powered && s.flags.maintenance_panel_open);
await shot('09_humming_wall');
await page.keyboard.press('e');
check('entered the Pipeworks secret', await waitRegion('region_secret_001'));

await tp(7, 14);
await wait(1800);
await noMouseAim();
check('arena sealed on commitment', await S(() => window.__twb.app.world.ctx.flag('tmp_arena_sealed')));
await tp(14, 11);
await page.keyboard.down('k');
let bossDead = false;
for (let i = 0; i < 80 && !bossDead; i++) {
  await S(() => { const w = window.__twb.app.world; w.data.hp = 100; w.player.iframes = 0.3; });
  if (i === 10) await shot('10_pipekeeper');
  if (i === 25) await S(() => { const k = window.__twb.app.world.enemies.find((e) => e.type === 'keeper'); if (k.hp > 20) k.hp = 20; });
  await wait(150);
  bossDead = await S(() => window.__twb.app.world.enemies.find((e) => e.type === 'keeper').dead);
}
await page.keyboard.up('k');
await wait(1500);
await skipDialogue();
s = await state();
check('Pipekeeper defeated; gate reopened', bossDead && s.flags.boss_pipekeeper_defeated && !(await S(() => window.__twb.app.world.ctx.flag('tmp_arena_sealed'))));
await tp(19, 10, 8, 10);
await wait(300);
await skipDialogue();
await tp(21, 10, 8, 10);
await wait(300);
await skipDialogue();
s = await state();
check('torch lens and pressure-route clue claimed', s.caps.includes('torch_lens') && s.flags.humming_wall_resolved && s.journal.includes('journal_pressure_route'));
await shot('11_reward');

await tp(3, 21, 8, 4);
await page.keyboard.down('s');
await wait(300);
await page.keyboard.up('s');
check('returned through the maintenance gap', await waitRegion('region_gallery_001'));
await tp(48, 8, 0, 12);
await interact();
s = await state();
check('relay reconnected, lift powered', s.flags.relay_reconnected && s.flags.return_lift_powered && s.journal.includes('resolved_relay'));
await wait(600);
await shot('12_relay');
await tp(52, 7, 0, 12);
await page.keyboard.press('e');
check('rode the return lift to the street', await waitRegion('region_surface_001', 6000));
s = await state();
check('lift arrives at the familiar street landmark', Math.abs(s.x - (30 * 16 + 8)) < 20);
await tp(5, 4);
await interact();
check('back home', await waitRegion('region_home_001'));
await tp(3, 3, 8, 12);
await interact();
await wait(300);
await skipDialogue();
s = await state();
check('slice objective complete', s.flags.slice_complete && s.journal.includes('resolved_slice'), JSON.stringify({ mode: s.mode, x: s.x, y: s.y, f: s.flags.slice_complete, j: s.journal }));

// ---------------------------------------------------------------- save, quit, reload, continue
const before = await state();
await page.keyboard.press('Escape');
await wait(300);
await page.getByText('Save & Exit to title').click();
await page.waitForSelector('#title-screen');
await page.reload();
await page.waitForSelector('#title-screen', { timeout: 20000 });
await page.getByRole('button', { name: /^Continue/ }).click();
await wait(900);
s = await state();
check(
  'reload restores region, position, flags, journal, equipment',
  s.region === before.region && Math.abs(s.x - before.x) < 1 && Math.abs(s.y - before.y) < 1 && JSON.stringify(s.flags) === JSON.stringify(before.flags) && s.journal.length === before.journal.length && s.weapons.join() === before.weapons.join() && s.caps.join() === before.caps.join(),
);

// ---------------------------------------------------------------- B. death and recovery cache
await S(() => window.__twb.app.transition('region_gallery_001', 'west'));
await waitRegion('region_gallery_001');
await S(() => { const w = window.__twb.app.world; w.data.reserves.light_rounds = 30; w.player.iframes = 0; w.hurtPlayer(999, 'a test hazard', w.player.x + 5, w.player.y); });
await page.waitForSelector('.death', { timeout: 8000 }).catch(async (e) => {
  console.log('death wait failed', JSON.stringify(await S(() => ({ mode: window.__twb.app.mode, alive: window.__twb.app.world.player.alive, deathT: window.__twb.app.deathT, frame: window.__twb.game.loop.frame, hp: window.__twb.app.world.data.hp }))));
  throw e;
});
await shot('13_death');
check('death screen explains the cause', (await page.textContent('.death')).includes('test hazard'));
await page.getByText('Return to refuge').click();
await wait(800);
s = await state();
check('respawned at last refuge with full health and a recovery cache', s.region === 'region_service_001' && s.hp === 100 && s.cache && s.cache.regionId === 'region_gallery_001' && s.weapons.includes('service_pistol'));

// ---------------------------------------------------------------- C. hidden tab pauses and releases input
await page.keyboard.down('d');
await S(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
await wait(200);
await S(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
await page.keyboard.up('d');
s = await state();
check('hidden tab pauses the game', s.mode === 'pause');
const x0 = s.x;
await wait(400);
check('no movement while paused', Math.abs((await state()).x - x0) < 0.01);
await page.getByText('Resume').click();
await wait(300);
check('explicit resume returns to play', (await state()).mode === 'play');

// ---------------------------------------------------------------- D. orientation
await page.setViewportSize({ width: 390, height: 844 });
await wait(500);
check('portrait shows rotate screen and pauses', (await page.isVisible('#rotate')) && (await state()).mode === 'pause');
await shot('14_portrait');
await page.setViewportSize({ width: 844, height: 390 });
await wait(500);
check('landscape stays paused until resume', !(await page.isVisible('#rotate')) && (await state()).mode === 'pause');
await page.getByText('Resume').click();
await wait(300);

// ---------------------------------------------------------------- touch ownership (two fingers, cancel)
const cdp = await context.newCDPSession(page);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
// a first touch switches the HUD from keyboard to touch layout
await touch('touchStart', [{ x: 60, y: 300, id: 9 }]);
await touch('touchEnd', []);
await wait(300);
check('touch controls appear after touching the screen', await page.isVisible('#btn-fire'));
const fire = await page.locator('#btn-fire').boundingBox();
await tp(20, 4);
const startX = (await state()).x;
const magBefore = (await state()).mag.service_pistol;
await touch('touchStart', [{ x: 120, y: 260, id: 1 }, { x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 2 }]);
await touch('touchMove', [{ x: 170, y: 260, id: 1 }, { x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 2 }]);
await wait(1000);
await shot('15_touch');
const mid = await state();
check('touch: move finger moves while fire finger shoots', mid.x > startX + 10 && (mid.mag.service_pistol !== magBefore || mid.res.light_rounds !== s.res.light_rounds));
await touch('touchCancel', []);
await wait(300);
const after1 = await state();
await wait(600);
const after2 = await state();
check('touch cancel releases all controls (no phantom move/fire)', Math.abs(after2.x - after1.x) < 0.5 && after2.mag.service_pistol === after1.mag.service_pistol);

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
