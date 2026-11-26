import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const script = function () {
  const query = new URL(location.href).searchParams;
  const states = {
    'light.demo_kitchen': { state: 'off', attributes: {} },
    'switch.demo_boiler': { state: 'off', attributes: {} },
    'input_datetime.demo_boiler_start': { state: '2026-11-25 17:18:00', attributes: { has_date: true, has_time: true } },
    'input_datetime.demo_time_only': { state: '17:18:00', attributes: { has_date: false, has_time: true } },
    'light.demo_laundry': { state: 'off', attributes: {} },
    'sensor.demo_room_temp': { state: '23.5', attributes: { device_class: 'temperature', unit_of_measurement: '°C' } },
    'sensor.demo_oven_mode': { state: 'run', attributes: {} },
    'sensor.demo_oven_finish': { state: new Date(Date.now() + 62500).toISOString(), attributes: {} },
    'sensor.demo_hob_mode': { state: 'run', attributes: {} },
    'switch.demo_hob': { state: 'on', attributes: {}, last_changed: new Date(Date.now() - 26 * 60000).toISOString() },
    'sensor.demo_dish_mode': { state: 'run', attributes: {} },
    'sensor.demo_dish_finish': { state: new Date(Date.now() + 31 * 60000).toISOString(), attributes: {} },
    'sensor.demo_wash_mode': { state: 'run', attributes: {} },
    'switch.demo_wash': { state: 'on', attributes: {} },
    'binary_sensor.demo_wash_done': { state: 'off', attributes: {} },
    'sensor.demo_wash_progress': { state: '35', attributes: { unit_of_measurement: '%' } },
    'vacuum.demo_robot': { state: 'cleaning', attributes: {} },
    'sensor.demo_robot_status': { state: 'segment_cleaning', attributes: {} },
    'binary_sensor.demo_robot_cleaning': { state: 'on', attributes: {} },
    'sensor.demo_robot_progress': { state: '64', attributes: { unit_of_measurement: '%' } },
    'select.demo_robot_mop': { state: 'high', attributes: {} },
  };
  const mappings = [
    { kind: 'oven', operation_entity: 'sensor.demo_oven_mode', finish_entity: 'sensor.demo_oven_finish' },
    { kind: 'hob', operation_entity: 'sensor.demo_hob_mode', power_entity: 'switch.demo_hob' },
    { kind: 'dishwasher', operation_entity: 'sensor.demo_dish_mode', finish_entity: 'sensor.demo_dish_finish' },
    { kind: 'vacuum', vacuum_entity: 'vacuum.demo_robot', status_entity: 'sensor.demo_robot_status',
      cleaning_entity: 'binary_sensor.demo_robot_cleaning', progress_entity: 'sensor.demo_robot_progress', mop_mode_entity: 'select.demo_robot_mop' },
  ];
  const config = {
    type: 'custom:bayit-9', locale: query.get('locale') || 'he', layout: query.has('header') ? 'header' : 'classic',
    area_ids: ['kitchen','laundry'], show_unassigned: false,
    profiles: [{ kind: 'boiler', entity: 'switch.demo_boiler' }],
    room_overrides: {
      kitchen: { entities: ['light.demo_kitchen','sensor.demo_room_temp'], activities: mappings },
      laundry: { entities: ['light.demo_laundry'], activities: [
        { kind: 'washer', operation_entity: 'sensor.demo_wash_mode', power_entity: 'switch.demo_wash',
          done_entity: 'binary_sensor.demo_wash_done', progress_entity: 'sensor.demo_wash_progress' },
      ] },
    },
  };
  const calls = [];
  const hass = {
    user: { is_admin: true }, states, entities: { 'switch.demo_boiler': { area_id: 'kitchen' } }, devices: {},
    areas: { kitchen: { area_id: 'kitchen', name: 'מטבח' }, laundry: { area_id: 'laundry', name: 'כביסה' } },
    callWS(message) { calls.push(message); return Promise.resolve({}); },
  };
  const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
  if (query.has('editor')) {
    const editor = Strategy.getConfigElement();
    editor.addEventListener('config-changed', event => {
      window.latestConfig = event.detail.config;
      sessionStorage.setItem('fixture-appliances', JSON.stringify(window.latestConfig));
    });
    editor.setConfig(JSON.parse(sessionStorage.getItem('fixture-appliances')) ?? { ...config, room_overrides: {} });
    editor.hass = hass;
    document.body.append(editor);
  } else {
    const card = document.createElement('bayit-dashboard');
    card.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
    card.hass = hass;
    document.body.append(card);
    window.robotState = (vacuum, status, cleaning, progress) => {
      states['vacuum.demo_robot'].state = vacuum;
      states['sensor.demo_robot_status'].state = status;
      states['binary_sensor.demo_robot_cleaning'].state = cleaning;
      states['sensor.demo_robot_progress'].state = progress;
      card.hass = { ...hass, states: { ...states } };
    };
    window.useCompleted = () => {
      states['sensor.demo_oven_mode'].state = 'ready';
      states['sensor.demo_dish_mode'].state = 'finished';
      states['switch.demo_hob'].state = 'off';
      states['binary_sensor.demo_wash_done'].state = 'on';
      card.hass = { ...hass, states: { ...states } };
    };
  }
  window.fixtureCalls = calls;
}.toString();
const fixture = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<style>body{margin:0;font:16px system-ui}</style><script type="module">import "/bayit-9.js";(' + script + ')();</script>';
const server = http.createServer((request, response) => {
  if (request.url === '/bayit-9.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    response.end(bundle);
  } else {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(fixture);
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
try {
  await runBrowserEngines([[chromium], [webkit]], async (launcher) => {
    const browser = await launcher.launch();
    try {
      for (const layout of ['classic','header']) {
        const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const he = layout === 'classic';
        await page.goto(base + '?' + layout + '&locale=' + (he ? 'he' : 'en'));
        const kitchen = page.locator('[data-room="kitchen"]');
        const oven = kitchen.getByRole('img', { name: he ? /^תנור/ : /^Oven/ });
        const hob = kitchen.getByRole('img', { name: he ? /^כיריים/ : /^Cooktop/ });
        const dish = kitchen.getByRole('img', { name: he ? /^מדיח כלים/ : /^Dishwasher/ });
        const robot = kitchen.getByRole('img', { name: he ? /^שואב רובוטי/ : /^Robot vacuum/ });
        const washer = page.locator('[data-room="laundry"]').getByRole('img', { name: he ? /^מכונת כביסה/ : /^Washing machine/ });
        await oven.getByText('00:01', { exact: false }).waitFor();
        assert.match(await hob.getAttribute('aria-label'), he ? /זמן פעולה/ : /Time running/);
        assert.match(await dish.getAttribute('aria-label'), he ? /זמן שנותר/ : /Time remaining/);
        assert.match(await washer.getAttribute('aria-label'), he ? /רץ/ : /Running/);
        assert.match(await robot.getAttribute('aria-label'), he ? /שוטף.*התקדמות.*64%/ : /Mopping.*Progress.*64%/);
        const layoutFits = await kitchen.evaluate(room => {
          const strip = room.querySelector('.room-status-strip');
          const chips = [...strip.children].filter(chip => !chip.hidden);
          const bounds = room.getBoundingClientRect(), bottom = room.querySelector('.quick').getBoundingClientRect().top;
          return chips.length === 5 && chips.every(chip => {
            const box = chip.getBoundingClientRect();
            return box.left >= bounds.left && box.right <= bounds.right && box.bottom <= bottom + 1
              && chip.scrollWidth <= chip.clientWidth + 1;
          });
        });
        assert.equal(layoutFits, true);
        await page.evaluate(() => window.robotState('returning', 'returning_home', 'on', '64'));
        await robot.getByText(he ? 'בדרך לעמדה' : 'Returning to dock', { exact: true }).waitFor();
        await page.evaluate(() => window.robotState('docked', 'washing_the_mop', 'off', '64'));
        await robot.getByText(he ? 'שוטף מגב' : 'Washing mop', { exact: true }).waitFor();
        await page.evaluate(() => window.robotState('docked', 'emptying_the_bin', 'off', '64'));
        await robot.getByText(he ? 'מרוקן אבק' : 'Emptying bin', { exact: true }).waitFor();
        await page.evaluate(() => window.robotState('docked', 'charging', 'off', '64'));
        await robot.waitFor({ state: 'hidden' });
        await page.waitForFunction(() => document.querySelector('bayit-dashboard').applianceUpdateAt > 0);
        await kitchen.evaluate(room => { room.style.display = 'none'; });
        await page.waitForFunction(() => document.querySelector('bayit-dashboard').applianceUpdateAt === 0);
        await kitchen.evaluate(room => { room.style.display = ''; });
        await oven.getByText('00:00', { exact: false }).waitFor();
        await page.evaluate(() => window.useCompleted());
        await oven.waitFor({ state: 'hidden' });
        await hob.waitFor({ state: 'hidden' });
        await dish.getByText(he ? 'סיים' : 'Done', { exact: true }).waitFor();
        await washer.getByText(he ? 'סיים' : 'Done', { exact: true }).waitFor();
        await page.waitForFunction(() => document.querySelector('bayit-dashboard').applianceUpdateAt === 0);
        assert.deepEqual(await page.evaluate(() => window.fixtureCalls), []);
        assert.deepEqual(errors, []);
        await page.close();
      }
      const editor = await browser.newPage({ viewport: { width: 320, height: 700 } });
      await editor.goto(base + '?editor');
      await editor.getByText('חדרים', { exact: true }).click();
      await editor.getByLabel('חדר להתאמה אישית', { exact: true }).selectOption('kitchen');
      await editor.getByText('חיווי פעילות מכשירים', { exact: true }).click();
      await editor.getByRole('button',{name:'שמירת חיווי'}).click();
      await editor.getByRole('alert').getByText('בחרו את מקורות הנתונים הנדרשים לשמירת החיווי.').waitFor();
      await editor.getByLabel('מצב פעולה', { exact: true }).selectOption('sensor.demo_oven_mode');
      await editor.getByLabel('זמן סיום צפוי', { exact: true }).selectOption('sensor.demo_oven_finish');
      await editor.getByRole('button',{name:'שמירת חיווי'}).click();
      assert.deepEqual(await editor.evaluate(() => window.latestConfig.room_overrides.kitchen.activities), [
        { kind: 'oven', operation_entity: 'sensor.demo_oven_mode', finish_entity: 'sensor.demo_oven_finish' },
      ]);
      await editor.getByRole('button',{name:'הסרת חיווי'}).click();
      assert.equal(await editor.evaluate(() => window.latestConfig.room_overrides.kitchen), undefined);
      await editor.getByLabel('מכשיר', { exact: true }).selectOption('boiler');
      const boiler = editor.getByLabel('דוד בחדר הזה', { exact: true });
      const started = editor.getByLabel('עזר תאריך ושעת הפעלת הדוד', { exact: true });
      assert.deepEqual(await boiler.locator('option').evaluateAll(items => items.map(item => item.value)), ['', 'switch.demo_boiler']);
      assert.deepEqual(await started.locator('option').evaluateAll(items => items.map(item => item.value)), ['', 'input_datetime.demo_boiler_start']);
      await boiler.selectOption('switch.demo_boiler');
      await started.selectOption('input_datetime.demo_boiler_start');
      await editor.getByRole('button',{name:'שמירת חיווי'}).click();
      assert.deepEqual(await editor.evaluate(() => window.latestConfig.room_overrides.kitchen.activities), [
        { kind: 'boiler', boiler_entity: 'switch.demo_boiler', started_at_entity: 'input_datetime.demo_boiler_start' },
      ]);
      assert.deepEqual(await editor.evaluate(() => window.fixtureCalls), []);
      await editor.close();
      for (const locale of ['en','he']) {
        const he = locale === 'he';
        const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
        const fields = [
          ['vacuum_entity', he ? 'ישות שואב רובוטי' : 'Robot vacuum entity', 'vacuum.demo_robot'],
          ['status_entity', he ? 'חיישן מצב מפורט של השואב' : 'Detailed robot status sensor', 'sensor.demo_robot_status'],
          ['cleaning_entity', he ? 'חיישן בינארי לניקוי' : 'Cleaning binary sensor', 'binary_sensor.demo_robot_cleaning'],
          ['progress_entity', he ? 'התקדמות (%)' : 'Progress (%)', 'sensor.demo_robot_progress'],
          ['mop_mode_entity', he ? 'מצב שטיפה' : 'Mop mode', 'select.demo_robot_mop'],
        ];
        const kind = page.getByLabel(he ? 'מכשיר' : 'Appliance', { exact: true });
        const open = async () => {
          await page.getByText(he ? 'חדרים' : 'Rooms', { exact: true }).click();
          await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize', { exact: true }).selectOption('kitchen');
          await page.getByText(he ? 'חיווי פעילות מכשירים' : 'Appliance activity badges', { exact: true }).click();
        };
        await page.goto(base + '?editor&locale=' + locale);
        await open();
        await kind.selectOption('vacuum');
        for (const [, label, value] of fields) await page.getByLabel(label, { exact: true }).selectOption(value);
        await page.getByRole('button', { name: he ? 'שמירת חיווי' : 'Save badge', exact: true }).click();
        assert.deepEqual(await page.evaluate(() => window.latestConfig.room_overrides.kitchen.activities), [
          { kind: 'vacuum', ...Object.fromEntries(fields.map(([key, , value]) => [key, value])) },
        ]);
        await page.reload();
        await open();
        assert.equal(await kind.inputValue(), 'vacuum');
        for (const [, label, value] of fields) assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), value);
        assert.deepEqual(await page.evaluate(() => window.fixtureCalls), []);
        await page.close();
      }
      console.log(launcher.name() + ' 320px: appliance and robot activity, editor persistence, no service calls');
    } finally { await browser.close(); }
  });
} finally { server.close(); }
