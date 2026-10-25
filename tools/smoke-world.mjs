// Browser smoke test for the world-structure pass: Bracken Underground, the Platform Zero
// investigation (both approaches), the tide rule, Edda's cellar, every reconnection, journal
// questions with hints, and persistence across save/quit/reload.
// Usage: npx vite --port 5173 &  then  npm run smoke:world [-- http://localhost:5173/]
// Teleports between waypoints via the ?smoke hook; interactions, transitions, generation,
// dialogue, menus and saves all run through game code.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const OUT = 'captures/smoke-world/';
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
const flags = () => S(() => window.__twb.app.data.flags);
const region = () => S(() => window.__twb.app.world.def.id);
const skipDialogue = async () => {
  for (let i = 0; i < 30; i++) {
    const active = await S(() => window.__twb.app.dialogue.active);
    if (!active) return;
    await wait(200);
    await page.keyboard.press('Enter');
  }
};
const interact = async () => {
  await page.keyboard.press('e');
  await wait(350);
  await skipDialogue();
  await wait(250);
};
const waitRegion = async (id, ms = 6000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await S(() => ({ r: window.__twb.app.world.def.id, m: window.__twb.app.mode }));
    if (s.r === id && s.m === 'play') return true;
    await wait(150);
  }
  return false;
};
const go = async (r, e) => {
  await S(([r, e]) => window.__twb.app.transition(r, e), [r, e]);
  return waitRegion(r.startsWith('gen:') ? undefined : r);
};
// stand on the nearest free orthogonal neighbour of an entity (or on it, for floor exits)
const nextTo = (id, on = false) =>
  S(([eid, on]) => {
    const w = window.__twb.app.world;
    const e = w.def.entities.find((x) => x.id === eid);
    if (!e) return false;
    const g = w.grid;
    const ew = e.w ?? 1;
    const eh = e.h ?? 1;
    const tiles = on ? [[e.tx, e.ty]] : [];
    for (let x = e.tx; x < e.tx + ew; x++) tiles.push([x, e.ty + eh]);
    for (let x = e.tx; x < e.tx + ew; x++) tiles.push([x, e.ty - 1]);
    for (let y = e.ty; y < e.ty + eh; y++) tiles.push([e.tx - 1, y], [e.tx + ew, y]);
    for (const [x, y] of tiles)
      if (x >= 0 && y >= 0 && x < g.w && y < g.h && !g.block[y * g.w + x]) {
        w.player.x = x * 16 + 8;
        w.player.y = y * 16 + 12;
        return true;
      }
    return false;
  }, [id, on]);
const safe = () => S(() => { const w = window.__twb.app.world; w.data.hp = w.data.maxHp; w.player.iframes = 2; for (const en of w.enemies) en.active = false; });
const subtitle = () => S(() => document.querySelector('#subtitle')?.textContent ?? '');

await page.goto(`${BASE}?smoke=1`);
await page.waitForSelector('#title-screen', { timeout: 20000 });
await wait(500);
await page.getByText('New Journey').click();
await page.locator('.slot .btn').first().click();
await wait(900);
check('new journey starts at home', (await region()) === 'region_home_001');

// ---------------------------------------------------------------- evidence, not instructions
await nextTo('home_intercom_use');
await page.keyboard.press('e');
await wait(350);
let relayLines = '';
for (let i = 0; i < 30; i++) {
  if (!(await S(() => window.__twb.app.dialogue.active))) break;
  relayLines += ' ' + ((await page.locator('#dialogue .text').textContent()) ?? '');
  await wait(250);
  await page.keyboard.press('Enter');
}
await wait(250);
check('Mara reports evidence; she no longer names the place or the route', /gap in the hum/.test(relayLines) && !/laundrette/i.test(relayLines) && !/amber/i.test(relayLines), relayLines.slice(0, 120));
await page.keyboard.press('Escape');
await wait(300);
const pauseText = await page.locator('.pause-questions').textContent().catch(() => '');
check('pause shows open questions instead of an objective', /Which relay went quiet\?/.test(pauseText ?? ''), pauseText ?? '');
await page.getByRole('button', { name: 'Journal', exact: true }).click();
await wait(300);
check('journal lists the question with its observations', await page.locator('.journal-entry.question b', { hasText: 'Which relay went quiet?' }).isVisible());
await page.locator('.hintbtn').first().click();
await wait(200);
const hint1 = await page.locator('.hint.tier1').first().textContent();
check('hint ladder reveals a first, vague hint', /close to home/i.test(hint1 ?? ''), hint1 ?? '');
check('revealed hint is persisted as a flag', !!(await flags()).hint_q_relay_1);
await shot('01_journal_question');
await page.getByRole('button', { name: 'Back', exact: true }).click();
await wait(200);
await page.getByRole('button', { name: 'Resume', exact: true }).click();
await wait(300);
// the trapdoor at home is visible from the start, bolted from below
await nextTo('home_trapdoor_look');
await interact();
check('home trapdoor is visible and explained (bolted from below)', !!(await flags()).obs_trapdoor);

// ---------------------------------------------------------------- the storm drains lead to the old line
await S(() => { const d = window.__twb.app.data; d.flags.has_pistol = true; if (!d.weapons.includes('service_pistol')) d.weapons.push('service_pistol'); d.mag.service_pistol = 8; d.reserves.light_rounds = 40; });
await S(() => window.__twb.app.transition('gen:street_storm_drain', 'from_parent'));
await wait(2500);
const drain = await S(() => { const w = window.__twb.app.world; const link = w.def.entities.find((e) => e.kind === 'exit' && e.target.region === 'region_station_001'); return { id: w.def.id, link: link?.id ?? null }; });
check('first storm-drain district gains a grate onto the old line', drain.id.startsWith('gen_') && !!drain.link, JSON.stringify(drain));
await safe();
await nextTo(drain.link, true);
await interact();
check('the grate drops onto the station tracks', await waitRegion('region_station_001'));
await safe();
await shot('02_station_tracks');

// the public address: chime + subtitle, and it is journalled as evidence
let heard = false;
for (let i = 0; i < 40 && !heard; i++) {
  await wait(250);
  heard = /Section 9 is isolated/.test(await subtitle());
}
check('station announcement is subtitled (Section 9 isolated)', heard);
check('announcement recorded as an observation', !!(await flags()).obs_zero_announce);

// ---------------------------------------------------------------- Platform Zero: refusal first
await nextTo('station_call_panel_read');
await interact();
await nextTo('cabin_orin_talk');
await interact();
let f = await flags();
check('Orin refuses a stranger and the lift stays dead', f.met_orin && !f.section9_live && f.obs_orin_refuses);
await nextTo('cabin_rota_read');
await interact();
await nextTo('cabin_radio_listen');
await interact();
f = await flags();
check('the evidence for both social approaches is in his cabin', f.obs_orin_rota && f.obs_orin_radio);
await shot('03_signal_cabin');

// ---------------------------------------------------------------- approach B: tool + danger
await safe();
await nextTo('station_rail_use');
await interact();
check('live third rail explains itself without gloves', /third rail is live/.test(await subtitle()) && !(await flags()).station_rail_isolated);
await S(() => window.__twb.app.data.capabilities.push('insulated_gloves'));
await interact();
check('insulated gloves isolate the third rail', !!(await flags()).station_rail_isolated);
await safe();
await nextTo('station_shaft_down', true);
await interact();
check('the lift-shaft ladder leads down to the sea', await waitRegion('region_tidal_001'));
await safe();
await nextTo('tidal_lift_up');
await interact();
check('lift stays dead from below after the dangerous route', /dead from this end/.test(await subtitle()) && !(await flags()).section9_live);

// ---------------------------------------------------------------- the strange region and its rule
await S(() => { const w = window.__twb.app.world; w.player.x = 30 * 16 + 8; w.player.y = 18 * 16 + 12; });
await wait(1500);
check('arriving on the shore reveals the far town (camera look + observation)', !!(await flags()).obs_stacks);
await shot('04_stacks_reveal');
await wait(2600);
// high tide: the causeway is under water
await S(() => { const w = window.__twb.app.world; w.tideT = 2 * 46 + 5; });
await wait(400);
const covered = await S(() => window.__twb.app.world.grid.tideLevel);
await nextTo('tidal_gauge_read');
await interact();
check('tide gauge reads the water and the ebb tally', !!(await flags()).obs_tide_gauge);
await nextTo('tidal_nemi_talk');
await interact();
check('Nemi explains the tide and why the ferry does not run', (await flags()).met_nemi && (await flags()).obs_nemi_tide);
// the spring ebb drains the causeway
await S(() => { const w = window.__twb.app.world; w.tideT = 2 * 46 + 21; });
await wait(400);
const spring = await S(() => window.__twb.app.world.grid.tideLevel);
check('every third ebb drains the causeway (tide level 0 -> 2)', covered === 0 && spring === 2, `${covered} -> ${spring}`);
await shot('05_spring_ebb');
// no drowning: stand on the causeway as the water turns
await S(() => { const w = window.__twb.app.world; w.player.x = 5 * 16 + 8; w.player.y = 14 * 16 + 12; w.tideT = 2 * 46 + 39.5; });
await wait(1500);
const carried = await S(() => { const w = window.__twb.app.world; const g = w.grid; const tx = Math.floor(w.player.x / 16); const ty = Math.floor((w.player.y - 3) / 16); return { tidal: g.tidal[ty * g.w + tx], hp: w.data.hp, max: w.data.maxHp, alive: w.player.alive }; });
check('rising water carries you ashore unhurt', carried.tidal === 0 && carried.alive && carried.hp === carried.max, JSON.stringify(carried));
// back out on the next spring ebb, through the hatch in the great door
await S(() => { const w = window.__twb.app.world; w.tideT = 5 * 46 + 22; w.player.x = 4 * 16 + 8; w.player.y = 10 * 16 + 12; });
await wait(500);
await nextTo('tidal_hatch');
await interact();
check('the hatch in the great door opens onto a cellar', await waitRegion('region_cellar_001'));
await shot('06_cellar');
await nextTo('cellar_letter');
await interact();
await nextTo('cellar_bolts');
await interact();
check('drawing the cellar bolts opens the home trapdoor', !!(await flags()).home_trapdoor_open);
await nextTo('cellar_to_home');
await interact();
check('the cellar stair comes up in the house you started in', await waitRegion('region_home_001'));
await nextTo('home_to_cellar', true);
await interact();
check('and the trapdoor is now a shortcut down to the sea', await waitRegion('region_cellar_001'));

// ---------------------------------------------------------------- the boarded entrance, from inside
await go('region_station_001', 'tunnel');
await safe();
await nextTo('station_bar_lift');
await interact();
check('lifting the bar opens Bracken Underground to the street', !!(await flags()).station_street_open);
await interact();
check('the station stairs come up on Bracken street', await waitRegion('region_surface_001'));
await nextTo('street_to_station');
await interact();
check('and the street entrance now leads back down', await waitRegion('region_station_001'));

// ---------------------------------------------------------------- approach A: social, after the relay
await go('region_gallery_001', 'west');
await safe();
await nextTo('gallery_relay_use');
await interact();
check('relay reconnected (main story)', !!(await flags()).relay_reconnected);
await go('region_service_001', 'east');
await safe();
await nextTo('service_to_station');
await interact();
check('relay power releases the STAFF ONLY maglock into the station', await waitRegion('region_station_001'));
await safe();
await nextTo('cabin_orin_talk');
await interact();
check('Mara vouches over the radio and Orin lifts the isolation', !!(await flags()).section9_live);
await nextTo('station_lift_down');
await interact();
check('Platform Zero lift now runs to the sea', await waitRegion('region_tidal_001', 8000));
await nextTo('tidal_lift_up');
await interact();
check('and back up again', await waitRegion('region_station_001', 8000));

// ---------------------------------------------------------------- the balcony, at last
await nextTo('cabin_to_gantry');
await interact();
check('the signal gantry crosses to the gallery balcony', await waitRegion('region_gallery_001'));
await nextTo('balcony_ladder_lower');
await interact();
check('the chained ladder lowers from the balcony', !!(await flags()).gallery_ladder_down);
await shot('07_balcony');
await nextTo('balcony_ladder_descend', true);
await interact();
const foot = await S(() => window.__twb.app.world.player.y);
check('the ladder reaches the gallery floor', foot > 6 * 16);

// ---------------------------------------------------------------- persistence
const before = await flags();
await page.keyboard.press('Escape');
await wait(300);
await page.getByText('Save & Exit to title').click();
await page.waitForSelector('#title-screen');
await page.reload();
await page.waitForSelector('#title-screen', { timeout: 20000 });
await page.getByRole('button', { name: /^Continue/ }).click();
await wait(1000);
const after = await flags();
const keys = ['station_street_open', 'station_rail_isolated', 'section9_live', 'home_trapdoor_open', 'gallery_ladder_down', 'met_orin', 'met_nemi', 'hint_q_relay_1', 'obs_stacks', 'seen_region_cellar_001'];
check('every opened route, met character, observation and hint survives reload', keys.every((k) => after[k] === true && before[k] === true), keys.filter((k) => !after[k]).join(','));
await page.keyboard.press('Escape');
await wait(300);
await page.getByRole('button', { name: 'Journal', exact: true }).click();
await wait(300);
const answered = await page.locator('.journal-entry.resolved').allTextContents();
check('answered questions record how they were answered', answered.some((t) => /Orin lifted the Section 9 isolation/.test(t)) && answered.some((t) => /Edda/.test(t)), answered.join(' | ').slice(0, 160));
await shot('08_journal_answered');

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
