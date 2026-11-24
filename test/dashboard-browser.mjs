import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;font:16px system-ui;color:#152334}.app{width:100%;min-height:100vh}#editor{width:min(460px,100%);margin:auto}</style>
<main id="surface" class="app"></main><div id="editor"></div>
<script type="module">
import '/bayit-9.js';
const states = {
  'light.demo_lamp': { state: 'off', attributes: { friendly_name: 'Desk lamp', supported_color_modes: ['onoff'] } },
  'switch.demo_heater': { state: 'off', attributes: { friendly_name: 'Room heater' } },
  'script.demo_start': { state: 'off', attributes: { friendly_name: 'Demo start' } },
  'number.demo_level': { state: '3', attributes: { friendly_name: 'Demo heater level', min: 1, max: 9, step: 1 } },
  'timer.demo_heater': { state: 'idle', attributes: { friendly_name: 'Demo timer' } },
};
const calls = [];
let finishLevel;
const query = new URL(location.href).searchParams;
const storedKey = 'bayit9-browser-fixture';
const stored = () => JSON.parse(sessionStorage.getItem(storedKey) ||
  '{"strategy":{"type":"custom:bayit-9"}}');
const hass = {
  user: { is_admin: query.has('configuration') },
  locale: { language: new URL(location.href).searchParams.get('locale') || 'en' },
  states,
  entities: { 'light.demo_lamp': { area_id: 'studio' }, 'switch.demo_heater': { area_id: 'studio' } },
  areas: { studio: { area_id: 'studio', name: 'Studio', icon: 'mdi:desk' } },
  devices: {},
  callWS(request) {
    calls.push(request);
    if (request.type === 'lovelace/dashboards/list') {
      return Promise.resolve([{ url_path: 'fixture-home', mode: 'storage' }]);
    }
    if (request.type === 'lovelace/config') return Promise.resolve(stored());
    if (request.type === 'lovelace/config/save') {
      sessionStorage.setItem(storedKey, JSON.stringify(request.config));
      return Promise.resolve();
    }
    if (request.domain === 'light') {
      const id = request.target.entity_id;
      const { color_temp_kelvin, effect } = request.service_data ?? {};
      const attributes = { ...states[id].attributes };
      if (color_temp_kelvin !== undefined) attributes.color_temp_kelvin = color_temp_kelvin;
      if (effect !== undefined) attributes.effect = effect;
      states[id] = { ...states[id], attributes, state: request.service === 'turn_off' ? 'off' : 'on' };
      card.hass = { ...hass, states: { ...states } };
    }
    if (request.domain === 'script' && request.service === 'demo_select_heat_step') {
      states['script.demo_select_heat_step'] = { state: 'on', attributes: {} };
      card.hass = { ...hass, states: { ...states } };
      return new Promise(resolve => {
        finishLevel = () => {
          states['input_number.demo_heat_step'].state = String(request.service_data.target_step);
          states['script.demo_select_heat_step'] = { state: 'off', attributes: {} };
          card.hass = { ...hass, states: { ...states } };
          resolve({});
        };
      });
    }
    if (request.domain === 'simple_timer' && request.service === 'start_timer') {
      const id = request.service_data.entity_id;
      const attrs = states[id].attributes;
      states[id] = { ...states[id], attributes: { ...attrs, timer_state: 'active', device_active: true,
        timer_finishes_at: new Date(Date.now() + request.service_data.duration * 60000).toISOString() } };
      states['climate.demo_air'] = { ...states['climate.demo_air'], state: 'cool' };
      card.hass = { ...hass, states: { ...states } };
    }
    return Promise.resolve({});
  },
};
if (query.has('room-grid')) {
  for (const [entity, name, colorMode] of [
    ['light.demo_wall', 'Wall lamp', 'onoff'], ['light.demo_pendant', 'Pendant lamp', 'color_temp'],
    ['light.demo_monitor', 'Monitor lamp', 'color_temp'],
  ]) {
    states[entity] = { state: 'on', attributes: { friendly_name: name, supported_color_modes: [colorMode] } };
    hass.entities[entity] = { area_id: 'studio' };
    if (colorMode === 'color_temp') Object.assign(states[entity].attributes, {
      min_color_temp_kelvin: 2200, max_color_temp_kelvin: 7000, color_temp_kelvin: 3200,
      supported_features: 4, effect_list: ['Color loop', 'Slow pulse'], effect: 'off',
    });
  }
}
if (query.has('device-panel')) {
  states['climate.demo_air'] = { state: 'off', attributes: {
    friendly_name: 'Studio air conditioner', supported_features: 425, hvac_modes: ['off','cool','heat'],
    fan_modes: ['low','auto'], swing_modes: ['off','vertical'], temperature: 23, current_temperature: 25,
    min_temp: 15, max_temp: 30, target_temp_step: 1, fan_mode: 'auto', swing_mode: 'off',
  } };
  states['sensor.demo_air_usage'] = { state: '600', attributes: {
    switch_entity_id: 'input_boolean.demo_air_timer', timer_state: 'idle', device_active: false,
  } };
  hass.entities['climate.demo_air'] = { area_id: 'studio' };
}
const roomStatusSelected = {
  area_ids: ['bayit_room_status', ...Array.from({ length: 9 }, (_, index) => 'bayit_room_fixture_' + index)],
  room_overrides: {
    bayit_room_status: {
      name: hass.locale.language === 'he' ? 'חדר הפנאי' : 'Family room',
      entities: ['climate.demo_room', 'cover.demo_window', 'sensor.demo_temperature', 'light.demo_unavailable',
        'light.demo_side1', 'light.demo_side2', 'light.demo_side3'],
    },
    ...Object.fromEntries(Array.from({ length: 9 }, (_, index) =>
      ['bayit_room_fixture_' + index, { name: 'Room ' + index, entities: [] }])),
  },
  profiles: [{ entity: 'climate.demo_room', kind: 'climate', timed: { timer_entity: 'timer.demo_room' } }],
};
if (query.has('room-status')) {
  hass.config = { unit_system: { temperature: '°C' } };
  Object.assign(states, {
    'climate.demo_room': { state: 'cool', attributes: { friendly_name: 'Cooling', temperature: 26, current_temperature: 19 } },
    'cover.demo_window': { state: 'opening', attributes: { friendly_name: 'Window shade', current_position: 57 } },
    'sensor.demo_temperature': { state: '23.5', attributes: { device_class: 'temperature', unit_of_measurement: '°C' } },
    'sensor.demo_unmapped': { state: '99', attributes: { device_class: 'temperature', unit_of_measurement: '°C' } },
    'light.demo_unavailable': { state: 'unavailable', attributes: { friendly_name: 'Desk light' } },
    'timer.demo_room': { state: 'active', attributes: { finishes_at: new Date(Date.now() + 3660000).toISOString() } },
  });
  for (const number of [1, 2, 3]) {
    states['light.demo_side' + number] = { state: 'off', attributes: { supported_color_modes: ['onoff'] } };
  }
}
const heaterFan = 'fan.demo_step_heater';
const helper = 'input_number.demo_heat_step';
const heaterTimer = 'sensor.demo_step_runtime';
const heaterRelay = 'switch.demo_step_power';
const heaterScript = 'script.demo_select_heat_step';
if (query.has('heater-level')) {
  Object.assign(states, {
    [heaterFan]: { state: 'off', attributes: { friendly_name: 'Fixture step heater', supported_features: 49 } },
    [helper]: { state: '3', attributes: { min: 0, max: 9, step: 1 } },
    [heaterRelay]: { state: 'off', attributes: {} },
    [heaterTimer]: { state: '0', attributes: { switch_entity_id: heaterRelay, timer_state: 'idle' } },
    [heaterScript]: { state: 'off', attributes: {} },
  });
  hass.entities[heaterFan] = { area_id: 'studio' };
}
if (query.has('toolbar-panels')) {
  Object.assign(states, {
    'script.demo_scene': {state:'off', attributes:{friendly_name:'Evening scene'}},
    'lock.demo_entry': {state:'locked', attributes:{friendly_name:'Front door',code_format:'^[0-9]+$'}},
    'weather.demo_home': {state:'sunny', attributes:{friendly_name:'Home forecast',supported_features:1,temperature:23}},
    'sun.sun': {state:'above_horizon', attributes:{friendly_name:'Sun', next_rising:'2026-11-25T04:00:00Z',elevation:15,azimuth:270}},
    'person.demo_friend': {state:'home',attributes:{friendly_name:'Simona'}},
    'sensor.demo_meter': {state:'51',attributes:{friendly_name:'Energy meter',unit_of_measurement:'kWh'}},
    'sensor.demo_studio_temperature': {state:'22.5',attributes:{friendly_name:'Studio temperature',unit_of_measurement:'°C'}},
    'media_player.demo_speaker': {state:'playing',attributes:{friendly_name:'Speaker',supported_features:30749,volume_level:.24,
      is_volume_muted:false,source:'Radio',source_list:['Radio','Aux'],media_title:'Station'}},
    'vacuum.demo_robot': {state:'idle',attributes:{friendly_name:'Robot',supported_features:8244,fan_speed_list:['silent','normal']}},
    'button.demo_filter': {state:'unknown',attributes:{friendly_name:'Reset filter'}},
    'calendar.demo_household': {state:'off',attributes:{friendly_name:'Household'}},
    'calendar.demo_birthdays': {state:'off',attributes:{friendly_name:'Birthdays'}},
  });
  hass.entities['sensor.demo_studio_temperature'] = { area_id: 'studio' };
  window.loadCardHelpers = async () => ({createCardElement(configuration) {
    const card = document.createElement('div');
    card.dataset.nativeType = configuration.type;
    if (configuration.graph) card.dataset.graphHours = configuration.hours_to_show;
    card.textContent = configuration.type === 'calendar' ? configuration.entities.length + ' calendars' : configuration.name || configuration.entity;
    return card;
  }});
}
const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
const selected = query.has('configuration') ? stored().strategy : query.has('curated') ? {
  room_shortcuts: { studio: ['switch.demo_heater', 'light.demo_lamp'] },
  overview_entities: ['switch.demo_heater'],
} : query.has('room-grid') ? {
  room_overrides: { studio: { entities: ['light.demo_lamp', 'light.demo_wall', 'light.demo_pendant', 'light.demo_monitor'],
    read_only_entities: ['light.demo_monitor'] } },
} : query.has('device-panel') ? {
  room_shortcuts: { studio: ['light.demo_lamp', 'climate.demo_air'] },
  profiles: [{ entity: 'climate.demo_air', kind: 'climate', timed: {
    simple_timer_entity: 'sensor.demo_air_usage', simple_timer_target: 'input_boolean.demo_air_timer',
    min_minutes: 15, max_minutes: 120, step_minutes: 15, presets: [30,60,90,120],
  } }],
} : query.has('room-status') ? roomStatusSelected : query.has('heater-level') ? {
  room_shortcuts: { studio: [heaterFan] },
  profiles: [{ entity: heaterFan, kind: 'heater', level_steps: 9,
    level_read_entity: helper, level_select_script: heaterScript,
    timed: { simple_timer_entity: heaterTimer, simple_timer_target: heaterRelay } }],
} : query.has('toolbar-panels') ? {
  toolbar:[
    {kind:'automations',sections:[{kind:'actions',entities:[{entity:'script.demo_scene',role:'action',command:'run_script',confirmation:'Run the evening scene?'},
      {entity:'lock.demo_entry',role:'lock',confirmation:'Open the front door?'}]}]},
    {kind:'presence',sections:[{kind:'people',entities:['person.demo_friend']}]},
    {kind:'weather',sections:[{kind:'forecast',entities:['weather.demo_home']},{kind:'sun',entities:['sun.sun']}]},
    {kind:'energy',sections:[{kind:'electricity',entities:[{entity:'sensor.demo_meter',role:'graph',graph_hours:168}]}]},
    {kind:'settings'},
    {kind:'media',placement:'settings',entities:['media_player.demo_speaker']},
    {kind:'vacuum',placement:'settings',sections:[{kind:'devices',entities:['vacuum.demo_robot']},
      {kind:'actions',entities:[{entity:'button.demo_filter',role:'action',confirmation:'Reset the filter?'}]}]},
    {kind:'calendar',placement:'settings',entities:['calendar.demo_household','calendar.demo_birthdays']},
  ],
} : {};
const config = Strategy.generate(selected, query.has('empty') ? { ...hass, states: {} } : hass);
const cardConfig = config.views[0].cards[0];
const card = document.createElement('bayit-dashboard');
card.setConfig(cardConfig);
card.hass = hass;
document.querySelector('#surface').append(card);

if (query.has('editor')) {
  document.querySelector('#surface').hidden = true;
  const editor = Strategy.getConfigElement();
  editor.setConfig({ type: 'custom:bayit-9' });
  editor.hass = hass;
  editor.addEventListener('config-changed', event => { window.latest = event.detail.config; });
  document.querySelector('#editor').append(editor);
}
window.bayitTest = {
  registrations: window.customStrategies, calls, config,
  setRoomState(entity, state) {
    states[entity] = { ...states[entity], state };
    card.hass = { ...hass, states: { ...states } };
  },
  setRoomLayout(layout) { card.setConfig({ ...cardConfig, layout }); },
  finishLevel: () => finishLevel(),
  setHeaterPower: state => {
    states[heaterFan].state = states[heaterRelay].state = state;
    card.hass = { ...hass, states: { ...states } };
  },
  repointTimer: () => {
    states[heaterTimer].attributes.switch_entity_id = 'switch.demo_foreign';
    card.hass = { ...hass, states: { ...states } };
  },
};
</script></html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/bayit-9.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(bundle);
  } else if (['/', '/fixture-home/home'].includes(url.pathname)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fixture);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
try {
  for (const [engine, launcher] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await launcher.launch({ headless: true });
    try {
      for (const [locale, width] of [['en', 320], ['he', 390], ['en', 430]]) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '?locale=' + locale);
        await page.waitForFunction(() => window.bayitTest);
        assert.equal(await page.evaluate(() => window.bayitTest.registrations.filter(
          item => item.type === 'bayit-9' && item.strategyType === 'dashboard').length), 1);
        await page.getByRole('heading', { name: locale === 'he' ? 'בית 9' : 'Bayit 9' }).waitFor();
        await page.getByRole('button', { name: 'Studio', exact: true }).tap();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('heading', { name: 'Studio' }).waitFor();
        await dialog.getByRole('button', { name: locale === 'he' ? 'הדלקה' : 'Turn on', exact: true }).first().tap();
        await page.waitForFunction(() => window.bayitTest.calls.length > 0);
        const call = await page.evaluate(() => window.bayitTest.calls[0]);
        assert.equal(call.domain, 'light');
        assert.equal(call.service, 'turn_on');
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        const overflows = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflows, false, 'The dashboard overflows horizontally');
        assert.deepEqual(errors, []);
        await page.close();
        console.log(engine + ' ' + locale + ' ' + width + ': strategy, room modal, light command, close');
      }

      for (const locale of ['en', 'he']) {
        const statusPage = await browser.newPage({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce' });
        await statusPage.goto(base + '?room-status&locale=' + locale);
        const fixtureRoom = statusPage.locator('.room[data-room="bayit_room_status"]');
        const strip = fixtureRoom.locator('.room-status-strip');
        const active = strip.locator('[data-badge="activity"]');
        await active.locator('ha-icon[icon="mdi:timer-outline"]').waitFor();
        await strip.locator('[data-badge="availability"]:not([hidden])').waitFor();
        assert.equal(await strip.locator('.room-status:not([hidden])').count(), 3);
        assert.match(await strip.locator('[data-badge="temperature"]').innerText(), /23\.5°C/);
        assert.match(await active.innerText(), /\d+:\d{2}/);
        assert.match(await strip.locator('[data-badge="availability"]').getAttribute('aria-label'), /Desk light/);
        assert.equal(await fixtureRoom.locator('.room-count').innerText(), '—');
        assert.equal(await fixtureRoom.locator('.quick-button[data-entity="cover.demo_window"]').getAttribute('data-tone'), 'moving');
        const fits320 = await strip.evaluate(group => [...group.querySelectorAll('.room-status:not([hidden])')].every(chip => {
          const bounds = group.getBoundingClientRect();
          const tile = chip.getBoundingClientRect();
          const text = chip.querySelector('span');
          return tile.left >= bounds.left && tile.right <= bounds.right + 1 && text.scrollWidth <= text.clientWidth + 1;
        }));
        assert.equal(fits320, true, 'The combined readings fit at 320px');
        const oldHeight = (await fixtureRoom.boundingBox()).height;
        await statusPage.evaluate(() => window.bayitTest.setRoomState('timer.demo_room', 'idle'));
        await active.locator('ha-icon[icon="mdi:air-conditioner"]').waitFor();
        assert.match(await active.innerText(), /26°C/);
        assert.equal((await fixtureRoom.boundingBox()).height, oldHeight);
        await statusPage.evaluate(() => window.bayitTest.setRoomState('cover.demo_window', 'closed'));
        await fixtureRoom.locator('.quick-button[data-entity="cover.demo_window"][data-tone="quiet"]').waitFor();
        await statusPage.evaluate(() => window.bayitTest.setRoomState('light.demo_unavailable', 'on'));
        await strip.locator('[data-badge="availability"]').waitFor({ state: 'hidden' });
        assert.equal(await fixtureRoom.locator('.room-count').innerText(), '1');
        await statusPage.evaluate(() => window.bayitTest.setRoomState('sensor.demo_temperature', 'unavailable'));
        await strip.locator('[data-badge="temperature"]').filter({ hasText: '19°C' }).waitFor();
        await strip.locator('[data-badge="availability"]:not([hidden])').waitFor();
        assert.match(await active.innerText(), /26°C/);
        for (const width of [320, 391, 430]) {
          await statusPage.setViewportSize({ width, height: 845 });
          const arrangement = await fixtureRoom.evaluate(room => {
            const controls = [...room.querySelectorAll('.quick-button')].map(button => button.getBoundingClientRect());
            const heading = room.querySelector('.room-title').getBoundingClientRect();
            const rows = [...new Set(controls.map(box => box.top))];
            return [rows.map(top => controls.filter(box => box.top === top).length),
              heading.top >= Math.max(...controls.map(box => box.bottom))];
          });
          assert.deepEqual(arrangement, width <= 420 ? [[3, 3], true] : [[2, 2, 2], false]);
        }
        await statusPage.setViewportSize({ width: 320, height: 845 });
        await statusPage.evaluate(() => window.bayitTest.setRoomLayout('header'));
        const headingY = await fixtureRoom.locator('.room-title').boundingBox();
        assert.ok(headingY.y < (await strip.boundingBox()).y);
        await statusPage.evaluate(() => window.bayitTest.setRoomLayout('classic'));
        for (const [width, columns, gridWidth] of [[860, 2, 430], [900, 4, 804], [1280, 4, 900]]) {
          await statusPage.setViewportSize({ width, height: 721 });
          const measured = await statusPage.locator('.rooms').evaluate(grid => {
            const box = grid.getBoundingClientRect();
            return [getComputedStyle(grid).gridTemplateColumns.split(' ').length, Math.round(box.width), Math.round(box.left)];
          });
          assert.deepEqual(measured, [columns, gridWidth, (width - gridWidth) / 2]);
          const alignment = await fixtureRoom.locator('.room-title').evaluate(title => {
            const glyph = title.querySelector('ha-icon').getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(title.querySelector('.room-name'));
            const text = range.getBoundingClientRect();
            return Math.abs((text.left + text.width / 2) - (glyph.left + glyph.width / 2));
          });
          assert.ok(alignment < 45, 'Classic room labels stay close to their icon on wide screens');
          if (width === 1280) assert.equal(Math.round((await fixtureRoom.boundingBox()).height), 208);
        }
        assert.equal(await statusPage.evaluate(() => window.bayitTest.calls.length), 0);
        await statusPage.close();
      }

      const editorPage = await browser.newPage({ viewport: {width: 390, height: 844} });
      await editorPage.goto(base + '?editor&heater-level');
      await editorPage.getByRole('heading', { name: 'Bayit 9' }).waitFor({ state: 'hidden' });
      const title = editorPage.getByLabel('Dashboard title');
      await title.fill('Demo Home');
      await title.blur();
      await editorPage.waitForFunction(() => window.latest?.title === 'Demo Home');
      await editorPage.getByText('Home overview', { exact: true }).click();
      await editorPage.getByLabel('Devices and sensors to show', { exact: true }).selectOption(['switch.demo_heater']);
      assert.deepEqual(await editorPage.evaluate(() => window.latest.overview_entities), ['switch.demo_heater']);
      await editorPage.getByText('Room shortcuts', { exact: true }).click();
      const automatic = editorPage.getByRole('checkbox', { name: 'Choose shortcuts automatically' });
      await automatic.uncheck();
      await editorPage.getByLabel('Shortcut 1', { exact: true }).selectOption('switch.demo_heater');
      await editorPage.getByLabel('Shortcut 2', { exact: true }).selectOption('light.demo_lamp');
      assert.deepEqual(await editorPage.evaluate(() => window.latest.room_shortcuts.studio),
        ['switch.demo_heater', 'light.demo_lamp']);
      await automatic.check();
      assert.deepEqual(await editorPage.evaluate(() => window.latest.room_shortcuts), {});
      await editorPage.getByText('Boiler and heater controls', { exact: true }).click();
      await editorPage.getByRole('button', { name: 'Add profile' }).click();
      await editorPage.getByLabel('Heating device').selectOption('switch.demo_heater');
      await editorPage.getByLabel('Scheduled start script').selectOption('script.demo_start');
      await editorPage.getByLabel('Heating level entity').selectOption('number.demo_level');
      await editorPage.getByLabel('Timer', { exact: true }).selectOption('timer.demo_heater');
      await editorPage.getByRole('button', { name: 'Save profile' }).click();
      const profile = await editorPage.evaluate(() => window.latest.profiles[0]);
      assert.equal(profile.entity, 'switch.demo_heater');
      assert.equal(profile.level_entity, 'number.demo_level');
      assert.equal(profile.timed.start_script, 'script.demo_start');
      assert.equal(profile.timed.timer_entity, 'timer.demo_heater');
      await editorPage.getByRole('button', { name: 'Add profile' }).click();
      await editorPage.getByLabel('Heating device').selectOption('fan.demo_step_heater');
      await editorPage.getByLabel('Timer source').selectOption('simple');
      await editorPage.getByLabel('Simple Timer sensor').selectOption('sensor.demo_step_runtime');
      await editorPage.getByLabel('Level selection script').selectOption('script.demo_select_heat_step');
      await editorPage.getByRole('button', {name: 'Save profile'}).click();
      await editorPage.getByRole('alert').getByText('Set 2–12 heating levels', { exact: false }).waitFor();
      await editorPage.getByLabel('Number of heating levels').fill('9');
      await editorPage.getByLabel('Heating level feedback').selectOption('input_number.demo_heat_step');
      await editorPage.getByRole('button', {name: 'Save profile'}).click();
      const heaterProfile = await editorPage.evaluate(() => window.latest.profiles.find(item => item.entity.startsWith('fan.')));
      assert.equal(heaterProfile?.level_select_script, 'script.demo_select_heat_step');
      assert.equal(heaterProfile?.level_read_entity, 'input_number.demo_heat_step');
      assert.equal(heaterProfile?.timed.simple_timer_target, 'switch.demo_step_power');
      assert.equal(await editorPage.evaluate(() => window.bayitTest.calls.length), 0);
      await editorPage.getByLabel('Language').selectOption('he');
      await editorPage.getByLabel('שם הדשבורד').waitFor();
      await editorPage.close();

      const curatedPage = await browser.newPage({ viewport: {width: 320, height: 660} });
      await curatedPage.goto(base + '?curated');
      const controls = curatedPage.locator('.quick-button');
      await controls.first().waitFor();
      assert.deepEqual(await controls.evaluateAll(items => items.map(item => item.dataset.entity)),
        ['switch.demo_heater', 'light.demo_lamp']);
      await curatedPage.getByRole('button', { name: 'Home overview', exact: true }).click();
      const overview = curatedPage.getByRole('dialog', { name: 'Home overview', exact: true });
      await overview.getByRole('heading', { name: 'Room heater', exact: true }).waitFor();
      assert.equal(await overview.locator('section[data-entity]').count(), 1);
      assert.equal(await curatedPage.evaluate(() => window.bayitTest.calls.length), 0);
      await curatedPage.keyboard.press('Escape');
      await overview.waitFor({ state: 'hidden' });
      await curatedPage.close();

      const roomGridPage = await browser.newPage({ viewport: { width: 320, height: 690 } });
      await roomGridPage.goto(base + '?room-grid&locale=he');
      await roomGridPage.getByRole('button', { name: 'Studio', exact: true }).click();
      const lightGroup = roomGridPage.getByRole('dialog').locator('[data-group="room_lights"]');
      const compactLights = lightGroup.locator('[data-compact="tile"]');
      await compactLights.nth(1).waitFor();
      const [firstTile, secondTile] = await compactLights.evaluateAll(tiles => tiles.map(tile => {
        const rect = tile.getBoundingClientRect();
        return [rect.top, rect.left, rect.width];
      }));
      assert.equal(firstTile[0], secondTile[0], 'Simple lights share one row');
      assert.notEqual(firstTile[1], secondTile[1]);
      const dimmable = lightGroup.locator('[data-entity="light.demo_pendant"] .device-tile');
      assert.equal(await lightGroup.getByRole('slider').count(), 0);
      await dimmable.press('Shift+Enter');
      const pendant = roomGridPage.getByRole('dialog', { name: 'Pendant lamp', exact: true });
      const kelvin = pendant.getByRole('slider', { name: 'גוון לבן' });
      await kelvin.waitFor();
      assert.equal(await pendant.getByRole('slider').count(), 2);
      assert.equal(await kelvin.inputValue(), '3200');
      assert.equal(await kelvin.getAttribute('min'), '2200');
      assert.equal(await kelvin.getAttribute('max'), '7000');
      assert.equal(await pendant.locator('.device').count(), 1);
      assert.equal(await roomGridPage.evaluate(() => window.bayitTest.calls.length), 0);
      await kelvin.fill('3500');
      await pendant.getByText('3500 K', { exact: true }).waitFor();
      await pendant.getByRole('button', { name: 'החל · גוון לבן', exact: true }).click();
      await roomGridPage.waitForFunction(() => window.bayitTest.calls.length === 1);
      const effect = pendant.getByRole('combobox', { name: 'אפקט תאורה' });
      const applyEffect = pendant.getByRole('button', { name: 'החל · אפקט תאורה', exact: true });
      assert.equal(await effect.inputValue(), '');
      assert.equal(await applyEffect.isDisabled(), true);
      await effect.selectOption('Slow pulse');
      assert.equal(await roomGridPage.evaluate(() => window.bayitTest.calls.length), 1);
      await applyEffect.click();
      assert.deepEqual(await roomGridPage.evaluate(() => window.bayitTest.calls), [
        { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { color_temp_kelvin: 3500 } },
        { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { effect: 'Slow pulse' } },
      ]);
      await roomGridPage.keyboard.press('Escape');
      await pendant.waitFor({ state: 'hidden' });
      await roomGridPage.getByRole('button', { name: 'Studio', exact: true }).click();
      await roomGridPage.getByRole('dialog').locator('[data-entity="light.demo_monitor"] .device-tile').press('Shift+Enter');
      const monitor = roomGridPage.getByRole('dialog', { name: 'Monitor lamp', exact: true });
      await monitor.waitFor();
      assert.equal(await monitor.locator('.action-list').evaluate(node => node.childElementCount), 0);
      assert.equal(await roomGridPage.evaluate(() => window.bayitTest.calls.length), 2);
      await roomGridPage.close();

      const detailPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const rightToLeft = engine === 'WebKit';
      await detailPage.goto(base + '?device-panel&locale=' + (rightToLeft ? 'he' : 'en'));
      const quickAir = detailPage.locator('.quick-button[data-entity="climate.demo_air"]');
      await quickAir.click({ delay: 600 });
      const air = detailPage.getByRole('dialog', { name: 'Studio air conditioner', exact: true });
      await air.getByRole('button', { name: rightToLeft ? 'העלאת טמפרטורת היעד' : 'Increase target temperature' }).waitFor();
      const airBody = await air.locator('.modal-body').evaluate(body => {
        const styles = getComputedStyle(body);
        const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
        return {
          available: body.clientHeight,
          scroll: body.scrollHeight,
          content: body.querySelector('[data-role="content"]').offsetHeight + padding,
        };
      });
      assert.equal(airBody.scroll, airBody.available, 'A short thermostat panel needs no scroll');
      assert.ok(Math.abs(airBody.available - airBody.content) < 3, 'A short thermostat panel fits its contents');
      assert.equal(await air.getByRole('combobox', { name: rightToLeft ? 'נדנוד' : 'Swing' }).inputValue(), 'off');
      assert.equal(await air.getByText(rightToLeft ? 'שימוש היום 10:00' : 'Used today 10:00', { exact: true }).count(), 1);
      const presetPositions = await air.locator('.timer-preset').evaluateAll(presets =>
        presets.map(item => item.getBoundingClientRect().left));
      assert.equal(presetPositions.length, 4);
      assert.ok(presetPositions.every((left, index) => index === 0 || left > presetPositions[index - 1]));
      assert.equal(await detailPage.evaluate(() => window.bayitTest.calls.length), 0);
      await air.getByRole('button', { name: rightToLeft ? 'הפעלת טיימר · 60 דקות' : 'Start timer · 60 Minutes', exact: true }).click();
      await air.getByRole('button', { name: rightToLeft ? 'הארכת טיימר' : 'Extend timer', exact: true }).waitFor();
      assert.deepEqual(await detailPage.evaluate(() => window.bayitTest.calls[0]), {
        type: 'call_service', domain: 'simple_timer', service: 'start_timer',
        service_data: {entity_id: 'sensor.demo_air_usage', duration: 60, unit: 'min', reverse_mode: false},
      });
      await detailPage.keyboard.press('Escape');
      await air.waitFor({ state: 'hidden' });
      assert.equal(await quickAir.evaluate(control => control.getRootNode().activeElement === control), true);
      await detailPage.close();

      const heaterPage = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await heaterPage.goto(base + '?heater-level&locale=' + (rightToLeft ? 'he' : 'en'));
      await heaterPage.locator('.quick-button[data-entity="fan.demo_step_heater"]').click();
      const heaterPanel = heaterPage.getByRole('dialog', { name: 'Fixture step heater', exact: true });
      const level = step => heaterPanel.getByRole('button', {
        name: (rightToLeft ? 'עוצמת חימום ' : 'Heating level ') + step, exact: true,
      });
      await level(3).waitFor();
      assert.equal(await level(3).getAttribute('aria-pressed'), 'true');
      await level(8).click();
      assert.equal(await level(8).getAttribute('data-changing'), '');
      assert.equal(await level(8).isDisabled(), true);
      await heaterPage.evaluate(() => window.bayitTest.finishLevel());
      await heaterPage.waitForFunction(() => !document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('.heat-level-choice[data-action="set_heating_level"]')?.disabled);
      assert.equal(await level(8).getAttribute('aria-pressed'), 'true');
      await heaterPage.evaluate(() => window.bayitTest.setHeaterPower('on'));
      await level(2).click();
      await heaterPage.evaluate(() => window.bayitTest.finishLevel());
      assert.deepEqual(await heaterPage.evaluate(() => window.bayitTest.calls), [8, 2].map(target_step => ({
        type: 'call_service', domain: 'script', service: 'demo_select_heat_step', service_data: { target_step },
      })));
      await heaterPage.evaluate(() => window.bayitTest.repointTimer());
      await heaterPage.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('.heat-level-choice[data-action="set_heating_level"]')?.disabled);
      await heaterPage.close();

      const panelsPage = await browser.newPage({ viewport: { width:390,height:844 } });
      await panelsPage.goto(base + '?toolbar-panels');
      const roomGraph = panelsPage.locator('[data-native-type=sensor][data-graph-hours="24"]');
      assert.equal(await roomGraph.count(), 0);
      await panelsPage.getByRole('button', {name:'Studio',exact:true}).click();
      await panelsPage.getByRole('dialog',{name:'Studio',exact:true}).getByText('Studio temperature',{exact:true}).waitFor();
      await roomGraph.waitFor();
      await panelsPage.keyboard.press('Escape');
      await roomGraph.waitFor({state:'detached'});
      await panelsPage.getByRole('button',{name:'Weather',exact:true}).click();
      let panels = panelsPage.getByRole('dialog',{name:'Weather',exact:true});
      await panels.locator('[data-native-type=weather-forecast]').waitFor();
      await panels.getByRole('button',{name:'Sun',exact:true}).click();
      await panels.getByText('Sunrise',{exact:true}).waitFor();
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Automations',exact:true}).click();
      panels = panelsPage.getByRole('dialog',{name:'Automations',exact:true});
      await panels.getByRole('button',{name:'Evening scene',exact:true}).click();
      let confirm = panelsPage.getByRole('dialog',{name:'Confirm action',exact:true});
      await confirm.getByText('Run the evening scene?',{exact:true}).waitFor();
      await confirm.getByRole('button',{name:'Cancel'}).click();
      assert.equal(await panelsPage.evaluate(() => window.bayitTest.calls.length),0);
      await panels.getByRole('button',{name:/Front door/}).click();
      await confirm.getByText('Open the front door?',{exact:true}).waitFor();
      await confirm.getByRole('button',{name:'Cancel'}).click();
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Appearance',exact:true}).click();
      const wallpaper = panelsPage.getByRole('dialog').locator('.wallpaper-gallery');
      assert.equal(await wallpaper.locator('[data-wallpaper-choice]').count(), 0);
      await wallpaper.locator('summary').click();
      await wallpaper.getByRole('button', { name:'Materials', exact:true }).click();
      await wallpaper.getByRole('button', { name:'Brushed bronze', exact:true }).click();
      await wallpaper.locator('.wallpaper-current').getByText('Brushed bronze', { exact:true }).waitFor();
      assert.equal(await panelsPage.locator('.shell').getAttribute('data-background'), 'bronze');
      await wallpaper.locator('summary').click();
      await wallpaper.getByRole('button', { name:'Materials', exact:true }).waitFor({ state:'hidden' });
      await panelsPage.getByRole('dialog').getByRole('button',{name:'Media',exact:true}).click();
      panels = panelsPage.getByRole('dialog',{name:'Media',exact:true});
      await panels.getByRole('button',{name:'Pause playback',exact:true}).waitFor();
      assert.equal(await panels.getByRole('slider',{name:'Volume',exact:true}).inputValue(),'24');
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Appearance',exact:true}).click();
      await panelsPage.getByRole('dialog').getByRole('button',{name:'Robot vacuum',exact:true}).click();
      panels = panelsPage.getByRole('dialog',{name:'Robot vacuum',exact:true});
      await panels.getByRole('button',{name:'Start cleaning',exact:true}).waitFor();
      await panels.getByRole('button',{name:'Reset filter',exact:true}).click();
      await confirm.getByText('Reset the filter?',{exact:true}).waitFor();
      await confirm.getByRole('button',{name:'Cancel'}).click();
      assert.equal(await panelsPage.evaluate(() => window.bayitTest.calls.length),0);
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Appearance',exact:true}).click();
      await panelsPage.getByRole('dialog').getByRole('button',{name:'Calendar',exact:true}).click();
      await panelsPage.getByRole('dialog',{name:'Calendar',exact:true}).getByText('2 calendars',{exact:true}).waitFor();
      await panelsPage.close();

      const setupPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await setupPage.goto(base + '/fixture-home/home?configuration');
      await setupPage.getByRole('button', { name: 'Appearance', exact: true }).click();
      await setupPage.getByRole('button', { name: 'Customize home', exact: true }).click();
      const setup = setupPage.getByRole('dialog', { name: 'Customize home', exact: true });
      await setup.getByText('Rooms', { exact: true }).click();
      await setup.getByText('New dashboard-only room', { exact: true }).click();
      await setup.getByLabel('New room name', { exact: true }).fill('Reading nook');
      await setup.getByRole('button', { name: 'Create room', exact: true }).click();
      await setup.getByLabel('Available devices', { exact: true }).selectOption('light.demo_lamp');
      await setup.getByRole('button', { name: 'Add device', exact: true }).click();
      await setup.getByLabel('Show status only for selected room devices', { exact: true }).selectOption(['light.demo_lamp']);
      await setup.getByRole('button', { name: 'Save dashboard', exact: true }).click();
      await setupPage.getByRole('button', { name: 'Reading nook', exact: true }).waitFor();
      const persisted = await setupPage.evaluate(() => JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')));
      assert.deepEqual(Object.values(persisted.strategy.room_overrides), [{ name: 'Reading nook',
        entities: ['light.demo_lamp'], read_only_entities: ['light.demo_lamp'] }]);
      assert.equal(await setupPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
      await setupPage.close();

      const emptyPage = await browser.newPage();
      await emptyPage.goto(base + '?empty');
      await emptyPage.getByText('No rooms have been added.', { exact: true }).waitFor();
      await emptyPage.close();
      console.log(engine + ': visual profile editor, locale changes and no-device installation');
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
  await once(server, 'close');
}
