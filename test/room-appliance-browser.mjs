import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

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
  };
  const mappings = [
    { kind: 'oven', operation_entity: 'sensor.demo_oven_mode', finish_entity: 'sensor.demo_oven_finish' },
    { kind: 'hob', operation_entity: 'sensor.demo_hob_mode', power_entity: 'switch.demo_hob' },
    { kind: 'dishwasher', operation_entity: 'sensor.demo_dish_mode', finish_entity: 'sensor.demo_dish_finish' },
  ];
  const config = {
    type: 'custom:bayit-9', locale: 'he', layout: query.has('header') ? 'header' : 'classic',
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
    editor.addEventListener('config-changed', event => { window.latestConfig = event.detail.config; });
    editor.setConfig({ ...config, room_overrides: {} });
    editor.hass = hass;
    document.body.append(editor);
  } else {
    const card = document.createElement('bayit-dashboard');
    card.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
    card.hass = hass;
    document.body.append(card);
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
  for (const launcher of [chromium, webkit]) {
    const browser = await launcher.launch();
    try {
      for (const layout of ['classic','header']) {
        const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '?' + layout);
        const kitchen = page.locator('[data-room="kitchen"]');
        const oven = kitchen.getByRole('img', { name: /^תנור/ });
        const hob = kitchen.getByRole('img', { name: /^כיריים/ });
        const dish = kitchen.getByRole('img', { name: /^מדיח כלים/ });
        const washer = page.locator('[data-room="laundry"]').getByRole('img', { name: /^מכונת כביסה/ });
        await oven.getByText('00:01', { exact: false }).waitFor();
        assert.match(await hob.getAttribute('aria-label'), /זמן פעולה/);
        assert.match(await dish.getAttribute('aria-label'), /זמן שנותר/);
        assert.match(await washer.getAttribute('aria-label'), /רץ/);
        const layoutFits = await kitchen.evaluate(room => {
          const strip = room.querySelector('.room-status-strip');
          const chips = [...strip.children].filter(chip => !chip.hidden);
          const bounds = room.getBoundingClientRect(), bottom = room.querySelector('.quick').getBoundingClientRect().top;
          return chips.length === 4 && chips.every(chip => {
            const box = chip.getBoundingClientRect();
            return box.left >= bounds.left && box.right <= bounds.right && box.bottom <= bottom + 1
              && chip.scrollWidth <= chip.clientWidth + 1;
          });
        });
        assert.equal(layoutFits, true);
        await page.waitForFunction(() => document.querySelector('bayit-dashboard').applianceUpdateAt > 0);
        await kitchen.evaluate(room => { room.style.display = 'none'; });
        await page.waitForFunction(() => document.querySelector('bayit-dashboard').applianceUpdateAt === 0);
        await kitchen.evaluate(room => { room.style.display = ''; });
        await oven.getByText('00:00', { exact: false }).waitFor();
        await page.evaluate(() => window.useCompleted());
        await oven.waitFor({ state: 'hidden' });
        await hob.waitFor({ state: 'hidden' });
        await dish.getByText('סיים', { exact: true }).waitFor();
        await washer.getByText('סיים', { exact: true }).waitFor();
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
      console.log(launcher.name() + ' Hebrew 320px: appliance display, minute tick, no writes and native editor passed');
    } finally { await browser.close(); }
  }
} finally { server.close(); }
