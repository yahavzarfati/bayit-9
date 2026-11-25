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
const moreInfoCalls = [];
const moreInfoHashes = [];
document.addEventListener('hass-more-info', event => {
  moreInfoCalls.push(event.detail.entityId);
  moreInfoHashes.push(location.hash);
});
const coverRequests = [];
let finishLevel;
let finishPreselect;
const query = new URL(location.href).searchParams;
const storedKey = 'bayit9-browser-fixture';
const initialStrategy = { type: 'custom:bayit-9', ...(query.has('room-selection') && { show_unassigned: false }),
  ...(query.has('legacy-room-order') && { area_ids: ['lounge', 'studio'] }),
  ...(query.has('cross-area-room-device') && { room_overrides: { lounge: { entities: ['light.demo_lamp'] } } }),
  ...(query.has('sole-room') && { area_ids: ['bayit_room_only'],
    room_overrides: { bayit_room_only: { name: 'Reading nook', entities: [] } } }),
};
const stored = () => JSON.parse(sessionStorage.getItem(storedKey) ||
  JSON.stringify({ strategy: initialStrategy }));
const hass = {
  user: { is_admin: query.has('configuration') && !query.has('member') },
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
      sessionStorage.setItem(storedKey + '-hash-at-save', location.hash);
      return Promise.resolve();
    }
    if (request.domain === 'light') {
      const id = request.target.entity_id;
      const { color_temp_kelvin, effect, rgb_color } = request.service_data ?? {};
      const attributes = { ...states[id].attributes };
      if (color_temp_kelvin !== undefined) attributes.color_temp_kelvin = color_temp_kelvin;
      if (rgb_color) Object.assign(attributes, { rgb_color: [255, 135, 75], xy_color: [0.574, 0.359], color_mode: 'xy' });
      if (effect !== undefined) attributes.effect = effect;
      states[id] = { ...states[id], attributes, state: request.service === 'turn_off' ? 'off' : 'on' };
      card.hass = { ...hass, states: { ...states } };
    }
    if (request.domain === 'cover' && query.has('cover-feedback')) {
      return new Promise((resolve, reject) => {
        coverRequests.push(failed => failed ? reject(new Error('Fixture rejection')) : resolve({}));
      });
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
    if (request.domain === 'input_number' && request.target?.entity_id === nextLevel) {
      return new Promise(resolve => {
        finishPreselect = () => {
          states[nextLevel].state = String(request.service_data.value);
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
    if (request.domain === 'media_player' && request.service === 'media_pause') {
      const id = request.target.entity_id;
      states[id] = { ...states[id], state: 'paused' };
      card.hass = { ...hass, states: { ...states } };
    }
    return Promise.resolve({});
  },
};
if (query.has('room-selection')) {
  hass.areas.spare = { area_id: 'spare', name: 'Spare room' };
  hass.areas.lounge = { area_id: 'lounge', name: 'Lounge' };
  hass.entities['light.demo_lounge'] = { area_id: 'lounge' };
  states['light.demo_lounge'] = { state: 'off', attributes: { friendly_name: 'Lounge lamp', supported_color_modes: ['onoff'] } };
  if (query.has('empty-source-room')) delete states['switch.demo_heater'];
}
if (query.has('overview-opt-in')) {
  for (const [id, name, metadata] of [
    ['light.demo_dining', 'Dining task lamp', {}],
    ['light.demo_excluded', 'Excluded lamp', {}],
    ['light.demo_helper', 'Helper lamp', {}],
    ['light.demo_compact_hidden', 'Compact hidden lamp', { hidden: true }],
    ['light.demo_registry_hidden', 'Registry hidden lamp', { hidden_by: 'user' }],
    ['light.demo_disabled', 'Disabled lamp', { disabled_by: 'user' }],
    ['light.demo_dashboard_hidden', 'Dashboard hidden lamp', {}],
  ]) {
    states[id] = { state: 'on', attributes: { friendly_name: name, supported_color_modes: ['onoff'] } };
    hass.entities[id] = metadata;
  }
  states['cover.demo_overview_window'] = { state: 'closing', attributes: { friendly_name: 'Overview cover', supported_features: 15 } };
  hass.entities['cover.demo_overview_window'] = {};
}
if (query.has('room-grid')) {
  for (const [entity, name, colorMode] of [
    ['light.demo_wall', 'Wall lamp', 'onoff'], ['light.demo_pendant', 'Pendant lamp', 'color_temp'],
    ['light.demo_monitor', 'Monitor lamp', 'color_temp'],
  ]) {
    states[entity] = { state: 'on', attributes: { friendly_name: name, supported_color_modes: [colorMode] } };
    hass.entities[entity] = { area_id: 'studio' };
    if (colorMode === 'color_temp') Object.assign(states[entity].attributes, {
      supported_color_modes: ['color_temp', 'xy'], color_mode: 'color_temp',
      min_color_temp_kelvin: 2200, max_color_temp_kelvin: 7000, color_temp_kelvin: 3200,
      supported_features: 4, effect_list: ['Color loop', 'Slow pulse'], effect: 'off',
    });
  }
  if (query.has('many-effect-categories')) {
    states['light.demo_pendant'].attributes.effect_list.push('Sunburst', 'Midnight',
      ...Array.from({ length: 7 }, (_, i) => 'Preset ' + (i + 1)));
  }
}
if (query.has('cover-grid')) {
  for (const [id, name] of [['cover.demo_shade', 'Window shade'], ['cover.demo_curtain', 'Long living room curtain']]) {
    states[id] = { state: 'closed', attributes: { friendly_name: name, current_position: 0, supported_features: 15 } };
    hass.entities[id] = { area_id: 'studio' };
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
    'cover.demo_window': {
      state: query.has('cover-feedback') ? 'closed' : 'opening',
      attributes: { friendly_name: 'Window shade', current_position: query.has('cover-feedback') ? 0 : 57, supported_features: 15 },
    },
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
const nextLevel = 'input_number.demo_next_step';
if (query.has('heater-level')) {
  Object.assign(states, {
    [heaterFan]: { state: 'off', attributes: { friendly_name: 'Fixture step heater', supported_features: 49 } },
    [helper]: { state: '3', attributes: { min: 0, max: 9, step: 1 } },
    [nextLevel]: { state: '5', attributes: { min: 0, max: 9, step: 1 } },
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
    'sensor.demo_progress': {state:'40',attributes:{friendly_name:'Cleaning progress',unit_of_measurement:'%'}},
    'media_player.demo_speaker': {state:'playing',attributes:{friendly_name:'Speaker',supported_features:30781,volume_level:.24,
      is_volume_muted:false,source:'Radio',source_list:['Radio','Aux'],media_title:'Station',media_artist:'Fixture artist',
      media_position:12,media_duration:180,media_position_updated_at:new Date().toISOString(),
      entity_picture:'/api/media_player_proxy/media_player.demo_speaker?token=fixture'}},
    'media_player.demo_tv': {state:'on',attributes:{friendly_name:'Television',supported_features:1416,is_volume_muted:false}},
    'vacuum.demo_robot': {state:'idle',attributes:{friendly_name:'Robot',supported_features:8244,fan_speed_list:['silent','normal']}},
    'button.demo_filter': {state:'unknown',attributes:{friendly_name:'Reset filter'}},
    'calendar.demo_household': {state:'off',attributes:{friendly_name:'Household'}},
    'calendar.demo_birthdays': {state:'off',attributes:{friendly_name:'Birthdays'}},
  });
  hass.entities['sensor.demo_studio_temperature'] = { area_id: 'studio' };
  window.loadCardHelpers = async () => ({createCardElement(configuration) {
    const graphAction = configuration.tap_action?.action === 'fire-dom-event' && configuration.tap_action;
    const card = document.createElement(graphAction ? 'button' : 'div');
    const dialog = document.querySelector('bayit-dashboard')?.shadowRoot.querySelector('.modal[open]');
    card.dataset.duringOpening = String(!!dialog?.getAnimations().some(animation =>
      animation.playState === 'running' || animation.pending));
    card.dataset.nativeType = configuration.type;
    if (configuration.graph) card.dataset.graphHours = configuration.hours_to_show;
    card.textContent = configuration.type === 'calendar' ? configuration.entities.length + ' calendars' : configuration.name || configuration.entity;
    if (graphAction) {
      card.dataset.holdAction = configuration.hold_action?.action;
      card.dataset.doubleTapAction = configuration.double_tap_action?.action;
      card.onclick = () => card.dispatchEvent(new CustomEvent('ll-custom',
        {bubbles:true,composed:true,detail:graphAction}));
      const plot = document.createElement('span');
      plot.dataset.historyPlot = '';
      plot.textContent = 'Plot';
      plot.onclick = event => event.stopPropagation();
      card.append(plot);
    }
    return card;
  }});
}
if (query.has('large-setup')) {
  for (let area = 0; area < 6; area++) {
    const id = 'scale_' + area;
    hass.areas[id] = {area_id:id, name:'Scale area ' + area};
  }
  const domains = ['light', 'sensor', 'switch', 'fan', 'cover', 'number'];
  for (let index = 0; index < 600; index++) {
    const domain = domains[Math.floor(index / 6) % domains.length];
    const id = domain + '.scale_entity_' + index;
    hass.entities[id] = {area_id:'scale_' + index % 6};
    states[id] = {state:'off', attributes:{friendly_name:'Scale entity ' + index}};
  }
}
const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
const selected = query.has('configuration') ? stored().strategy : query.has('popup-routes') ? {
  room_overrides: { studio: { entities: ['light.demo_lamp', 'switch.demo_heater'],
    read_only_entities: ['switch.demo_heater'] } },
  hidden_entities: ['script.demo_start'],
  toolbar: [
    { id: 'appearance', kind: 'settings' },
    { id: 'room-status', kind: 'devices', label: 'Device viewer', placement: 'settings', entities: ['switch.demo_heater'] },
    { id: 'outside', kind: 'link', path: '/outside/view' },
  ],
  popup_aliases: {
    '#legacy-lamp': '#device/studio/light.demo_lamp',
    '#legacy-viewer': '#panel/room-status',
    '#legacy-hidden': '#device/studio/script.demo_start',
    '#legacy-link': '#panel/outside',
  },
} : query.has('curated') ? {
  room_shortcuts: { studio: ['switch.demo_heater', 'light.demo_lamp'] },
  overview_entities: ['switch.demo_heater'],
} : query.has('popup-geometry') ? {
  room_overrides: { studio: { entities: ['switch.demo_heater'] } },
  room_shortcuts: { studio: ['switch.demo_heater'] },
} : query.has('room-grid') ? {
  room_overrides: { studio: { entities: ['light.demo_lamp', 'light.demo_wall', 'light.demo_pendant', 'light.demo_monitor'],
    read_only_entities: ['light.demo_monitor'] } },
  ...(query.has('grouped-effects') && { light_effect_groups: {
    'light.demo_pendant': [
      { title: 'Evening', effects: [{ effect: 'Slow pulse', name: 'Gentle glow', icon: 'mdi:weather-night' }, 'Missing',
        ...Array.from({ length: 7 }, (_, i) => 'Preset ' + (i + 1))] },
      { title: 'Morning', effects: ['Sunburst'] },
      { title: 'Night', effects: ['Midnight'] },
    ],
    'light.demo_monitor': [{ title: 'Evening', effects: ['Slow pulse'] }],
  } }),
} : query.has('device-panel') ? {
  room_shortcuts: { studio: ['light.demo_lamp', 'climate.demo_air'] },
  profiles: [{ entity: 'climate.demo_air', kind: 'climate', timed: {
    simple_timer_entity: 'sensor.demo_air_usage', simple_timer_target: 'input_boolean.demo_air_timer',
    min_minutes: 15, max_minutes: 120, step_minutes: 15, presets: [30,60,90,120],
  } }],
} : query.has('room-status') ? roomStatusSelected : query.has('heater-level') ? {
  ...(query.has('compact-heater-steps') && { shape: 'circle' }),
  room_shortcuts: { studio: [heaterFan] },
  profiles: [{ entity: heaterFan, kind: 'heater', level_steps: 9,
    level_read_entity: helper, level_select_script: heaterScript,
    ...(query.has('preselect') && { level_preselect_entity: nextLevel }),
    timed: { simple_timer_entity: heaterTimer, simple_timer_target: heaterRelay } }],
} : query.has('overview-opt-in') ? {
  hidden_entities: ['light.demo_dashboard_hidden'],
  toolbar: [{kind:'overview',sections:[
    {kind:'status',title:'Discovered lighting',discover:{domain:'light',
      exclude_entities:['light.demo_excluded'],exclude_id_contains:['helper']},entities:['light.demo_lamp']},
    {kind:'covers',title:'Closing status',filter:'active',include_closing:true,entities:[
      {entity:'cover.demo_overview_window',role:'status'}]},
    {kind:'covers',title:'Default covers',filter:'active',entities:[
      {entity:'cover.demo_overview_window',role:'status'}]},
  ]},{kind:'settings'}],
} : query.has('toolbar-panels') ? {
  ...(query.has('room-link') && { room_overrides: { studio: {
    entities:['light.demo_lamp','media_player.demo_tv','vacuum.demo_robot'],
    media_panel_links:{'media_player.demo_tv':'media-panel'},
    vacuum_panel_links:{'vacuum.demo_robot':'vacuum-panel'},
  } } }),
  toolbar:[
    {kind:'automations',sections:[{kind:'actions',entities:[{entity:'script.demo_scene',role:'action',command:'run_script',confirmation:'Run the evening scene?'},
      {entity:'lock.demo_entry',role:'lock',confirmation:'Open the front door?'}]}]},
    {kind:'presence',sections:[{kind:'people',entities:['person.demo_friend']}]},
    {kind:'weather',sections:[{kind:'forecast',entities:['weather.demo_home']},{kind:'sun',entities:['sun.sun']}]},
    {kind:'energy',sections:[{kind:'electricity',entities:[{entity:'sensor.demo_meter',role:'graph',graph_hours:168}]}]},
    {kind:'settings'},
    {id:'media-panel',kind:'media',placement:'settings',sections:[
      {kind:'media',title:'Speaker',entities:[{entity:'media_player.demo_speaker',role:'now_playing'}]},
      {kind:'media',title:'TV',entities:[{entity:'media_player.demo_tv',role:'device'}]},
    ]},
    {id:'vacuum-panel',kind:'vacuum',placement:'settings',sections:[{kind:'vacuum',entities:[{entity:'vacuum.demo_robot',role:'device'}]},
      {kind:'actions',entities:[{entity:'button.demo_filter',role:'action',confirmation:'Reset the filter?'}]}]},
    {id:'sensors-panel',kind:'sensors',placement:'settings',sections:[{kind:'readings',entities:[
      {entity:'sensor.demo_progress',role:'graph',graph_hours:168,vacuum_panel_id:'vacuum-panel'}]}]},
    {kind:'calendar',placement:'settings',entities:['calendar.demo_household','calendar.demo_birthdays']},
  ],
} : {};
const config = Strategy.generate(selected, query.has('empty') ? { ...hass, states: {} } : hass);
const cardConfig = { ...config.views[0].cards[0], ...(query.has('embedded-popup-card') && { page: false }) };
const card = document.createElement('bayit-dashboard');
card.setConfig(cardConfig);
if (!query.has('defer-popup-hass')) card.hass = hass;
document.querySelector('#surface').append(card);

if (query.has('editor')) {
  document.querySelector('#surface').hidden = true;
  const editor = Strategy.getConfigElement();
  editor.setConfig({ type: 'custom:bayit-9', ...((query.has('toolbar-panels') || query.has('overview-opt-in')) && selected) });
  editor.hass = hass;
  editor.addEventListener('config-changed', event => { window.latest = event.detail.config; });
  document.querySelector('#editor').append(editor);
}
window.bayitTest = {
  registrations: window.customStrategies, calls, moreInfoCalls, moreInfoHashes, config,
  loadPopupHass() { card.hass = hass; },
  finishCover: (index, failed = false) => coverRequests[index](failed),
  setRoomState(entity, state) {
    states[entity] = { ...states[entity], state };
    card.hass = { ...hass, states: { ...states } };
  },
  setDiscoveredLight(entity, name, metadata) {
    states[entity] = { state: 'on', attributes: { friendly_name: name, supported_color_modes: ['onoff'] } };
    hass.entities = { ...hass.entities, [entity]: metadata };
    card.hass = { ...hass, states: { ...states } };
  },
  setLightModes(entity, modes) {
    states[entity] = { ...states[entity], attributes: { ...states[entity].attributes, supported_color_modes: modes } };
    card.hass = { ...hass, states: { ...states } };
  },
  setRoomLayout(layout) { card.setConfig({ ...cardConfig, layout }); },
  setMediaArt(entity_picture) {
    states['media_player.demo_speaker'].attributes.entity_picture = entity_picture;
    card.hass = { ...hass, states: { ...states } };
  },
  finishLevel: () => finishLevel(),
  finishPreselect: () => finishPreselect(),
  heatingState: () => [states[heaterFan].state, states[heaterRelay].state, states[heaterTimer].attributes.timer_state],
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
  } else if (url.pathname === '/api/media_player_proxy/media_player.demo_speaker') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="teal"/></svg>');
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
async function assertDeviceHeading(dialog, name) {
  assert.equal(await dialog.getByRole('heading', { name, exact: true }).count(), 1);
  const status = dialog.locator('.device-state-head');
  await status.locator('.current').waitFor();
  await status.getByRole('button', { name: /^(More info|מידע נוסף)$/ }).waitFor();
  assert.equal(await status.locator('.device-name, .device-icon').filter({ visible: true }).count(), 0);
}

try {
  for (const [engine, launcher] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await launcher.launch({ headless: true });
    try {
      const routesPage = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const rtlRoutes = engine === 'WebKit';
      const routeUrl = base + '/fixture-home/home?popup-routes&locale=' + (rtlRoutes ? 'he' : 'en');
      const delayedUrl = routeUrl + '&defer-popup-hass';
      const routeDialog = routesPage.getByRole('dialog');
      const routeClose = routeDialog.getByRole('button', { name: rtlRoutes ? 'סגירה' : 'Close', exact: true });
      const deskHeading = routeDialog.getByRole('heading', { name: 'Desk lamp', exact: true });
      const studioHeading = routeDialog.getByRole('heading', { name: 'Studio', exact: true });
      const routeErrors = [];
      routesPage.on('pageerror', error => routeErrors.push(error.message));

      await routesPage.goto(delayedUrl + '#legacy-lamp');
      await routesPage.waitForFunction(() => window.bayitTest);
      assert.equal(await routeDialog.count(), 0);
      await routesPage.evaluate(() => window.bayitTest.loadPopupHass());
      await deskHeading.waitFor();
      assert.equal(await routesPage.locator('[data-popup-origin]').count(), 0);
      assert.equal(await routeClose.evaluate(button => button.getRootNode().activeElement === button), true);
      assert.equal(new URL(routesPage.url()).hash, '#legacy-lamp');
      await routesPage.reload();
      await routesPage.waitForFunction(() => window.bayitTest);
      await routesPage.evaluate(() => window.bayitTest.loadPopupHass());
      await deskHeading.waitFor();
      const more = routeDialog.getByRole('button', { name: rtlRoutes ? 'מידע נוסף' : 'More info', exact: true });
      await more.tap();
      await routeDialog.waitFor({ state: 'hidden' });
      assert.deepEqual(await routesPage.evaluate(() => [window.bayitTest.moreInfoCalls, window.bayitTest.moreInfoHashes]),
        [['light.demo_lamp'], ['']]);
      assert.equal(new URL(routesPage.url()).search, new URL(delayedUrl).search);

      await routesPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      await studioHeading.waitFor();
      assert.equal(new URL(routesPage.url()).hash, '#room-studio');
      assert.equal(await routesPage.locator('.room[data-popup-origin]').count(), 1);
      await routeDialog.locator('[data-entity="light.demo_lamp"] .device-tile').press('Shift+Enter');
      await deskHeading.waitFor();
      assert.equal(new URL(routesPage.url()).hash, '#device/studio/light.demo_lamp');
      await routesPage.evaluate(() => history.back());
      await studioHeading.waitFor();
      assert.equal(await routesPage.locator('[data-popup-origin]').count(), 0);
      await routesPage.evaluate(() => history.forward());
      await deskHeading.waitFor();
      await routeClose.tap();
      await routeDialog.waitFor({ state: 'hidden' });
      await routesPage.waitForURL(delayedUrl);

      // Closing an animated source-open panel must remove its route before a refresh can reopen it.
      await routesPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      await studioHeading.waitFor();
      const hashDuringDismissal = await routeClose.evaluate(button => {
        button.click();
        return location.hash;
      });
      assert.equal(hashDuringDismissal, '');
      await routesPage.reload();
      await routesPage.waitForFunction(() => window.bayitTest);
      await routesPage.evaluate(() => window.bayitTest.loadPopupHass());
      await routeDialog.waitFor({ state: 'hidden' });

      await routesPage.goto(routeUrl + '#legacy-viewer');
      await routeDialog.getByRole('heading', { name: 'Device viewer', exact: true }).waitFor();
      await routesPage.goto(routeUrl + '#device/studio/switch.demo_heater');
      await routeDialog.getByRole('heading', { level: 2, name: 'Room heater', exact: true }).waitFor();
      assert.equal(await routeDialog.locator('.action-list button').count(), 0);
      await routesPage.evaluate(() => { location.hash = '#native-anchor'; });
      await routeDialog.waitFor({ state: 'hidden' });
      assert.equal(new URL(routesPage.url()).hash, '#native-anchor');
      for (const hash of ['#legacy-hidden', '#legacy-link', '#boiler-schedule-edit']) {
        await routesPage.goto(routeUrl + hash);
        await routesPage.waitForFunction(() => window.bayitTest);
        assert.equal(await routeDialog.count(), 0);
        assert.equal(new URL(routesPage.url()).hash, hash);
      }
      await routesPage.evaluate(() => {
        history.pushState(null, '', '/other/view#room-studio');
        window.dispatchEvent(new CustomEvent('location-changed'));
      });
      assert.equal(await routeDialog.count(), 0);
      assert.equal(new URL(routesPage.url()).pathname, '/other/view');
      assert.equal(await routesPage.evaluate(() => window.bayitTest.calls.length), 0);
      assert.deepEqual(routeErrors, []);

      await routesPage.goto(routeUrl + '&embedded-popup-card#legacy-lamp');
      await routesPage.waitForFunction(() => window.bayitTest);
      assert.equal(await routeDialog.count(), 0);
      await routesPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      await studioHeading.waitFor();
      assert.equal(new URL(routesPage.url()).hash, '#legacy-lamp');
      await routesPage.close();

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
        await dialog.getByRole('button', { name: 'Desk lamp · ' + (locale === 'he' ? 'הדלקה' : 'Turn on'), exact: true }).tap();
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

      for (const locale of ['en', 'he']) {
        const reduce = locale === 'he';
        const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true,
          reducedMotion: reduce ? 'reduce' : 'no-preference' });
        page.setDefaultTimeout(8000);
        await page.goto(base + '?room-status&cover-feedback&locale=' + locale);
        const room = page.locator('.room[data-room="bayit_room_status"]');
        const shade = room.locator('.quick-button[data-entity="cover.demo_window"]');
        const indicator = (direction, busy) => shade.and(page.locator(
          '.quick-button[data-tone="moving"][data-transition="' + direction + '"][aria-busy="' + busy + '"]'));
        const state = value => page.evaluate(value => window.bayitTest.setRoomState('cover.demo_window', value), value);
        const finish = (index, failed) => page.evaluate(([index, failed]) => window.bayitTest.finishCover(index, failed), [index, failed]);
        await shade.tap();
        await indicator('opening', true).waitFor();
        assert.match(await shade.getAttribute('aria-label'), reduce ? /נשלחה בקשת פתיחה · עצירה/ : /Opening requested · Stop/);
        assert.equal(await shade.evaluate(el => getComputedStyle(el, '::before').animationName), reduce ? 'none' : 'cover-direction');

        // A second tap stops the same cover before either movement or acknowledgement is reported.
        await shade.tap();
        assert.deepEqual(await page.evaluate(() => window.bayitTest.calls), ['open_cover', 'stop_cover'].map(service => ({
          type: 'call_service', domain: 'cover', service, service_data: {}, target: { entity_id: 'cover.demo_window' },
        })));
        await shade.and(page.locator('[data-transition=""][aria-busy="true"]')).waitFor();
        await finish(0, true);
        await finish(1);
        await shade.and(page.locator('[data-tone="quiet"][aria-busy="false"]')).waitFor();
        const note = page.locator('.notice[data-role="page-notice"]');
        await note.filter({ hasText: reduce ? 'נשלחה פקודה אל' : 'Command sent to' }).waitFor();

        // Closing has distinct feedback, and a known stop can settle before a new direction.
        await state('open');
        await shade.tap();
        await indicator('closing', true).waitFor();
        assert.match(await shade.getAttribute('aria-label'), reduce ? /נשלחה בקשת סגירה/ : /Closing requested/);
        await state('closing');
        await shade.and(page.getByRole('button', { name: reduce ? /^Window shade · נסגר ·/ : /^Window shade · Closing ·/ })).waitFor();
        await shade.press('Shift+Enter');
        const details = page.getByRole('dialog');
        const stop = details.locator('[data-action="stop"]');
        await stop.waitFor();
        assert.equal(await stop.isEnabled(), true);
        assert.equal(await details.locator('[data-action="open"]').isDisabled(), true);
        await stop.tap();
        await page.keyboard.press('Escape');
        await details.waitFor({ state: 'hidden' });
        await finish(2);
        await finish(3);
        await indicator('closing', true).waitFor();
        await state('closed');
        await shade.and(page.locator('[data-tone="quiet"][aria-busy="false"]')).waitFor();
        await shade.tap();
        await indicator('opening', true).waitFor();
        await state('unavailable');
        await shade.and(page.locator('[data-transition=""][data-tone="quiet"][aria-busy="false"]')).waitFor();
        assert.match(await room.locator('[data-badge="availability"]').getAttribute('aria-label'), /Window shade/);
        await finish(4, true);
        await note.filter({ hasText: reduce ? 'הפעולה לא הושלמה.' : 'Could not complete the action.' }).waitFor();
        await page.evaluate(() => window.bayitTest.setRoomState('light.demo_unavailable', 'on'));
        await room.locator('.quick-button[data-entity="light.demo_unavailable"][data-tone="warm"][data-transition=""]').waitFor();
        assert.deepEqual(await page.evaluate(() => window.bayitTest.calls.map(call => call.service)),
          ['open_cover', 'stop_cover', 'close_cover', 'stop_cover', 'open_cover']);
        await page.close();
        console.log(engine + ' ' + locale + ' 320: delayed cover feedback, stop, reversal, reduced motion, and availability');
      }

      const mediaPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      mediaPage.setDefaultTimeout(8000);
      const mediaErrors = [];
      mediaPage.on('pageerror', error => mediaErrors.push(error.message));
      await mediaPage.goto(base + '?toolbar-panels&room-link');
      await mediaPage.getByRole('button', { name: 'Appearance', exact: true }).click();
      await mediaPage.getByRole('button', { name: 'Media', exact: true }).click();
      const media = mediaPage.getByRole('dialog');
      await media.getByText('Fixture artist', { exact: true }).waitFor();
      const cover = media.locator('.now-playing img');
      await cover.waitFor();
      const progress = media.getByRole('progressbar', { name: 'Playback progress' });
      const first = await progress.evaluate(meter => meter.value);
      await mediaPage.waitForFunction(second =>
        document.querySelector('bayit-dashboard').shadowRoot.querySelector('.now-playing progress').value > second, first);
      await media.getByRole('button', { name: 'Next', exact: true }).click();
      await media.getByRole('button', { name: 'Pause playback', exact: true }).click();
      await media.getByRole('button', { name: 'Play', exact: true }).waitFor();
      const paused = await progress.evaluate(meter => meter.value);
      await mediaPage.evaluate(() => window.bayitTest.setMediaArt('https://fixture.invalid/art'));
      await cover.waitFor({ state: 'hidden' });
      assert.equal(await cover.getAttribute('src'), null);
      await media.getByText('Station', { exact: true }).waitFor();
      assert.equal(await progress.evaluate(meter => meter.value), paused);
      await media.getByRole('button', { name:'Volume up', exact:true }).last().click();
      const calls = await mediaPage.evaluate(() => window.bayitTest.calls.map(request => [request.service,request.target.entity_id]));
      assert.deepEqual(calls,[['media_next_track','media_player.demo_speaker'],['media_pause','media_player.demo_speaker'],
        ['volume_up','media_player.demo_tv']]);
      await media.getByRole('button', { name:'Close', exact:true }).click();
      await media.waitFor({ state:'hidden' });
      await mediaPage.getByRole('button', { name:'Appearance', exact:true }).click();
      await mediaPage.getByRole('button', { name:'Robot vacuum', exact:true }).click();
      await mediaPage.getByRole('button', { name:'Start cleaning', exact:true }).waitFor();
      await mediaPage.getByRole('button', { name:'Close', exact:true }).click();
      const studio = mediaPage.getByRole('button', {name:'Studio',exact:true});
      const tvHeader = mediaPage.getByRole('button', {name:'Television · More info',exact:true});
      await studio.click();
      await tvHeader.click();
      await mediaPage.waitForFunction(() => window.bayitTest.moreInfoCalls[0] === 'media_player.demo_tv');
      await studio.click();
      const bounds = await tvHeader.boundingBox();
      await mediaPage.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await mediaPage.mouse.down();
      await mediaPage.getByRole('heading', {name:'Media',exact:true}).waitFor();
      await mediaPage.mouse.up();
      assert.deepEqual(await mediaPage.evaluate(() => window.bayitTest.moreInfoCalls), ['media_player.demo_tv']);
      await mediaPage.getByRole('button', {name:'Back to room',exact:true}).click();
      assert.equal(await tvHeader.evaluate(element => element.getRootNode().activeElement === element), true);
      await tvHeader.press('Shift+Enter');
      await mediaPage.getByRole('heading', {name:'Media',exact:true}).waitFor();
      await mediaPage.getByRole('button', {name:'Close',exact:true}).click();
      await studio.click();
      const vacuumHeader = mediaPage.getByRole('button', {name:'Robot · Open Robot vacuum',exact:true});
      await vacuumHeader.click();
      const vacuum = mediaPage.getByRole('dialog', { name:'Robot vacuum',exact:true });
      await vacuum.getByRole('button', { name:'Start cleaning',exact:true }).waitFor();
      await vacuum.getByRole('button', { name:'Back to room',exact:true }).click();
      assert.equal(await vacuumHeader.evaluate(button => button.getRootNode().activeElement === button),true);
      const robotBounds = await vacuumHeader.boundingBox();
      await mediaPage.mouse.move(robotBounds.x + robotBounds.width / 2, robotBounds.y + robotBounds.height / 2);
      await mediaPage.mouse.down();
      await mediaPage.waitForFunction(() => window.bayitTest.moreInfoCalls.includes('vacuum.demo_robot'));
      await mediaPage.mouse.up();
      await studio.click();
      await vacuumHeader.press('Shift+Enter');
      await mediaPage.waitForFunction(() => window.bayitTest.moreInfoCalls.filter(entity => entity === 'vacuum.demo_robot').length === 2);
      assert.deepEqual(await mediaPage.evaluate(() => window.bayitTest.calls.map(request => request.service)),
        ['media_next_track','media_pause','volume_up']);
      await mediaPage.goto(base + '?toolbar-panels&room-link&editor');
      await mediaPage.getByText('Rooms', {exact:true}).click();
      await mediaPage.getByLabel('Room to customize', {exact:true}).selectOption('studio');
      const roomMediaLink = mediaPage.getByLabel('Open on media press and hold · Television', {exact:true});
      const roomVacuumLink = mediaPage.getByLabel('Open on vacuum tap · Robot', {exact:true});
      assert.equal(await roomMediaLink.inputValue(),'media-panel');
      assert.equal(await roomVacuumLink.inputValue(),'vacuum-panel');
      await roomVacuumLink.selectOption('');
      assert.equal(await mediaPage.evaluate(() => window.latest.room_overrides.studio.vacuum_panel_links), undefined);
      assert.equal(await roomMediaLink.inputValue(),'media-panel');
      await roomMediaLink.selectOption('');
      assert.equal(await mediaPage.evaluate(() => window.latest.room_overrides.studio.media_panel_links), undefined);
      await mediaPage.getByText('Toolbar and extra screens', { exact:true }).click();
      await mediaPage.getByRole('button', {name:'Media',exact:true}).click();
      await mediaPage.getByRole('button', {name:'TV',exact:true}).click();
      await mediaPage.getByRole('button', {name:'Television',exact:true}).click();
      await mediaPage.getByLabel('Display as', { exact:true }).selectOption('now_playing');
      assert.equal(await mediaPage.evaluate(() => window.latest.toolbar.find(item => item.kind === 'media')
        .sections[1].entities[0].role), 'now_playing');
      assert.deepEqual(mediaErrors, []);
      await mediaPage.close();
      console.log(engine + ': curated media and vacuum controls, Now Playing, and the original room shortcuts');

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
      const nextHelper = editorPage.getByLabel('Next-start level helper');
      assert.ok(await nextHelper.getAttribute('aria-describedby'));
      await nextHelper.selectOption('input_number.demo_next_step');
      await editorPage.getByRole('button', {name: 'Save profile'}).click();
      const heaterProfile = await editorPage.evaluate(() => window.latest.profiles.find(item => item.entity.startsWith('fan.')));
      assert.equal(heaterProfile?.level_select_script, 'script.demo_select_heat_step');
      assert.equal(heaterProfile?.level_read_entity, 'input_number.demo_heat_step');
      assert.equal(heaterProfile?.level_preselect_entity, 'input_number.demo_next_step');
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
      assert.equal(await compactLights.first().locator('.current').isVisible(), false);
      assert.equal(await compactLights.first().locator('.device-tile').getAttribute('aria-pressed'), 'false');
      assert.ok(await compactLights.first().evaluate(tile => tile.offsetHeight >= 108));
      const dimmable = lightGroup.locator('[data-entity="light.demo_pendant"] .device-tile');
      await dimmable.getByText('Pendant lamp', { exact: true }).waitFor();
      assert.equal(await lightGroup.getByRole('slider').count(), 0);
      assert.equal(await lightGroup.locator('input[type="color"]').count(), 0);
      await dimmable.press('Shift+Enter');
      const pendant = roomGridPage.getByRole('dialog', { name: 'Pendant lamp', exact: true });
      const kelvin = pendant.getByRole('slider', { name: 'גוון לבן' });
      await kelvin.waitFor();
      await assertDeviceHeading(pendant, 'Pendant lamp');
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
      const color = pendant.getByLabel('צבע התאורה', { exact: true });
      const applyColor = pendant.getByRole('button', { name: 'החל · צבע התאורה', exact: true });
      assert.equal(await color.getAttribute('type'), 'color');
      await color.fill('#000000');
      assert.equal(await applyColor.isDisabled(), true);
      await color.fill('#804020');
      assert.equal(await roomGridPage.evaluate(() => window.bayitTest.calls.length), 2);
      await applyColor.click();
      await roomGridPage.waitForFunction(() => window.bayitTest.calls.length === 3);
      await pendant.getByText('המצב של Pendant lamp עודכן.', { exact: true }).waitFor();
      assert.deepEqual(await roomGridPage.evaluate(() => window.bayitTest.calls), [
        { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { color_temp_kelvin: 3500 } },
        { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { effect: 'Slow pulse' } },
        { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { rgb_color: [128, 64, 32] } },
      ]);
      await roomGridPage.keyboard.press('Escape');
      await pendant.waitFor({ state: 'hidden' });
      await roomGridPage.getByRole('button', { name: 'Studio', exact: true }).click();
      const monitorTile = roomGridPage.getByRole('dialog').getByRole('button', { name: 'Monitor lamp · מידע נוסף', exact: true });
      assert.equal(await monitorTile.getAttribute('aria-pressed'), null);
      await monitorTile.press('Shift+Enter');
      const monitor = roomGridPage.getByRole('dialog', { name: 'Monitor lamp', exact: true });
      await monitor.waitFor();
      assert.equal(await monitor.locator('.action-list').evaluate(node => node.childElementCount), 0);
      assert.equal(await monitor.locator('input[type="color"]').count(), 0);
      assert.equal(await roomGridPage.evaluate(() => window.bayitTest.calls.length), 3);
      await roomGridPage.close();

      const geometryPage = await browser.newPage({
        viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
      });
      await geometryPage.goto(base + '?popup-geometry&locale=he');
      const geometryDialog = geometryPage.getByRole('dialog');
      const modalGeometry = () => geometryDialog.evaluate(dialog => {
        const root = dialog.getRootNode();
        const rect = dialog.getBoundingClientRect();
        const close = dialog.querySelector('[data-role="close"]').getBoundingClientRect();
        const source = root.querySelector('[data-popup-origin]');
        return {
          kind: dialog.dataset.kind, name: dialog.getAttribute("aria-label"),
          top: rect.top, bottom: rect.bottom, height: rect.height,
          gridTop: root.querySelector('.room-scroll').getBoundingClientRect().top,
          closeX: close.left + close.width / 2,
          closeOffset: close.top - rect.top,
          sourceRing: getComputedStyle(source).boxShadow,
        };
      });
      await geometryPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      const roomGeometry = await modalGeometry();
      assert.equal(roomGeometry.kind, 'room');
      assert.ok(Math.abs(roomGeometry.top - roomGeometry.gridTop - 86) <= 1);
      assert.match(roomGeometry.sourceRing, /2px inset/);
      await geometryPage.keyboard.press('Escape');
      await geometryDialog.waitFor({ state: 'hidden' });
      const geometryShortcut = geometryPage.locator('.quick-button[data-entity="switch.demo_heater"]');
      await geometryShortcut.press('Shift+Enter');
      await geometryPage.getByRole('dialog', { name: 'Room heater', exact: true }).waitFor();
      const deviceGeometry = await modalGeometry();
      assert.equal(deviceGeometry.kind, 'device');
      assert.ok(Math.abs(deviceGeometry.top - (roomGeometry.top + 844 - 16 - deviceGeometry.height) / 2) <= 1);
      const roomBandHeight = 844 - 16 - roomGeometry.top;
      assert.ok(deviceGeometry.height < roomBandHeight, 'Standalone relay should fit the device panel band ' + JSON.stringify(deviceGeometry));
      assert.equal(deviceGeometry.closeX, roomGeometry.closeX);
      assert.equal(deviceGeometry.closeOffset, roomGeometry.closeOffset);
      assert.match(deviceGeometry.sourceRing, /2px inset/);

      // Constrain the visual bottom inside the layout viewport, as a phone keyboard does.
      await geometryDialog.evaluate(dialog => dialog.style.setProperty('--bayit-popup-view-bottom', '330px'));
      const constrainedGeometry = await modalGeometry();
      assert.ok(constrainedGeometry.bottom <= 315);
      assert.ok(constrainedGeometry.top >= roomGeometry.top - 1);
      await geometryPage.keyboard.press('Escape');
      await geometryDialog.waitFor({ state: 'hidden' });
      assert.equal(await geometryShortcut.evaluate(button => button.getRootNode().activeElement === button), true);
      await geometryPage.close();

      for (const [locale, width] of [['he', 320], ['en', 375], ['he', 390]]) {
        const coverGridPage = await browser.newPage({ viewport: { width, height: 800 }, hasTouch: true, reducedMotion: 'reduce' });
        await coverGridPage.goto(base + '?cover-grid&locale=' + locale);
        await coverGridPage.getByRole('button', { name: 'Studio', exact: true }).tap();
        const dialog = coverGridPage.getByRole('dialog', { name: 'Studio', exact: true });
        const covers = dialog.locator('[data-group="room_covers"] > [data-compact="cover"]');
        await covers.nth(1).waitFor();
        const geometry = await covers.evaluateAll(tiles => tiles.map(tile => ({
          top: tile.getBoundingClientRect().top,
          left: tile.getBoundingClientRect().left,
          scroll: tile.scrollWidth > tile.clientWidth,
          buttons: [...tile.querySelectorAll('.basic-actions button')].map(button => {
            const rect = button.getBoundingClientRect();
            return [button.dataset.action, rect.top, rect.width, rect.height];
          }),
        })));
        const [first, second] = geometry;
        assert.equal(first.top, second.top);
        assert.ok(first.left < second.left, 'Room cover order matches the grid in either language');
        for (const tile of geometry) {
          assert.equal(tile.scroll, false);
          assert.deepEqual(tile.buttons.map(([action]) => action), ['open', 'stop', 'close']);
          assert.equal(new Set(tile.buttons.map(([, top]) => top)).size, 1, 'Cover actions stay on one line');
          assert.ok(tile.buttons.every(([, , width, height]) => width >= 28 && height >= 44));
        }
        await dialog.locator('[data-entity="cover.demo_shade"] [data-action="open"]').tap();
        assert.deepEqual(await coverGridPage.evaluate(() => window.bayitTest.calls), [
          { type: 'call_service', domain: 'cover', service: 'open_cover', service_data: {}, target: { entity_id: 'cover.demo_shade' } },
        ]);
        await coverGridPage.close();
      }
      console.log(engine + ': room cover rails stay on one line at 320–390 px');

      for (const [locale, width] of [['he', 320], ['en', 390]]) {
        const effectsPage = await browser.newPage({ viewport: { width, height: 760 }, hasTouch: true });
        const many = locale === 'en' ? '&many-effect-categories' : '';
        await effectsPage.goto(base + '?room-grid&grouped-effects&locale=' + locale + many);
        await effectsPage.getByRole('button', { name: 'Studio', exact: true }).tap();
        await effectsPage.getByRole('dialog').locator('[data-entity="light.demo_pendant"] .device-tile').press('Shift+Enter');
        const effectsDialog = effectsPage.getByRole('dialog', { name: 'Pendant lamp', exact: true });
        const gallery = effectsDialog.getByRole('region', { name: locale === 'he' ? 'אפקט תאורה' : 'Light effect' });
        const apply = gallery.getByRole('button', { name: locale === 'he' ? 'החל · אפקט תאורה' : 'Apply · Light effect' });
        const gentle = gallery.getByRole('button', { name: 'Gentle glow · Slow pulse', exact: true });
        const mode = effectsDialog.getByRole('group', { name: locale === 'he' ? 'מצב תאורה' : 'Light mode' });
        const effectsMode = mode.getByRole('button', { name: locale === 'he' ? 'אפקטים' : 'Effects', exact: true });
        const fixedMode = mode.getByRole('button', { name: locale === 'he' ? 'צבע קבוע' : 'Fixed color', exact: true });
        const whiteMode = mode.getByRole('button', { name: locale === 'he' ? 'לבן' : 'White', exact: true });
        const color = effectsDialog.getByLabel(locale === 'he' ? 'צבע התאורה' : 'Light color', { exact: true });
        const white = effectsDialog.getByRole('slider', { name: locale === 'he' ? 'גוון לבן' : 'White temperature', exact: true });
        await gentle.waitFor();
        assert.equal(await effectsMode.getAttribute('aria-pressed'), 'true');
        assert.equal(await color.isVisible(), false);
        assert.equal(await white.isVisible(), false);
        assert.equal(await mode.evaluate(el => el.scrollWidth > el.clientWidth), false);
        assert.ok(await fixedMode.evaluate(el => el.offsetHeight >= 44));
        await whiteMode.press('Enter');
        await gallery.waitFor({ state: 'hidden' });
        assert.equal(await white.inputValue(), '3200');
        await fixedMode.press('Enter');
        await color.waitFor();
        assert.equal(await white.isVisible(), false);
        await effectsMode.press('Enter');
        await gentle.waitFor();
        assert.equal(await gallery.getByText('Missing').count(), 0);
        assert.equal(await apply.isDisabled(), true);
        await gentle.tap();
        assert.equal(await gentle.getAttribute('aria-pressed'), 'true');
        assert.equal(await effectsPage.evaluate(() => window.bayitTest.calls.length), 0);
        if (locale === 'he') {
          await gallery.getByRole('button', { name: 'אפקטים נוספים', exact: true }).tap();
          await gallery.getByText('נבחר · Gentle glow', { exact: true }).waitFor();
        } else {
          assert.equal(await gallery.getByText('1 of 2', { exact: true }).count(), 1);
          await gallery.getByRole('button', { name: 'Next', exact: true }).tap();
          await gallery.getByRole('button', { name: 'Preset 7', exact: true }).waitFor();
          await gallery.getByText('Selected · Gentle glow', { exact: true }).waitFor();
          await gallery.getByRole('button', { name: 'Previous', exact: true }).tap();
          await gentle.waitFor();
          assert.equal(await gentle.getAttribute('aria-pressed'), 'true');
          await gallery.getByRole('combobox', { name: 'Effect categories' }).selectOption({ label: 'Other effects' });
          await gallery.getByText('Selected · Gentle glow', { exact: true }).waitFor();
        }
        const leftover = gallery.getByRole('button', { name: 'Color loop', exact: true });
        await leftover.waitFor();
        assert.ok((await leftover.boundingBox()).height >= 44);
        assert.equal(await gallery.evaluate(el => el.scrollWidth > el.clientWidth), false);
        assert.equal(await effectsPage.evaluate(() => window.bayitTest.calls.length), 0);
        await apply.tap();
        await gallery.getByText(locale === 'he' ? 'פעיל · Gentle glow' : 'Active · Gentle glow', { exact: true }).waitFor();
        assert.equal(await apply.isDisabled(), true);
        assert.deepEqual(await effectsPage.evaluate(() => window.bayitTest.calls), [
          { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
            service_data: { effect: 'Slow pulse' } },
        ]);
        await fixedMode.press('Enter');
        await color.fill('#804020');
        assert.equal(await effectsPage.evaluate(() => window.bayitTest.calls.length), 1);
        const applyColor = effectsDialog.getByRole('button', {
          name: locale === 'he' ? 'החל · צבע התאורה' : 'Apply · Light color', exact: true,
        });
        await applyColor.tap();
        await effectsDialog.getByText(locale === 'he' ? 'המצב של Pendant lamp עודכן.' : 'Pendant lamp updated.', { exact: true }).waitFor();
        assert.deepEqual(await effectsPage.evaluate(() => window.bayitTest.calls[1]), {
          type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { rgb_color: [128, 64, 32] },
        });
        await fixedMode.focus();
        await effectsPage.evaluate(() => window.bayitTest.setLightModes('light.demo_pendant', ['xy']));
        await whiteMode.waitFor({ state: 'detached' });
        assert.equal(await fixedMode.getAttribute('aria-pressed'), 'true');
        assert.equal(await fixedMode.evaluate(el => el.getRootNode().activeElement === el), true);
        await effectsPage.evaluate(() => window.bayitTest.setRoomState('light.demo_pendant', 'unavailable'));
        await mode.waitFor({ state: 'hidden' });
        assert.equal(await color.isVisible(), false);
        await effectsPage.keyboard.press('Escape');
        await effectsDialog.waitFor({ state: 'hidden' });
        await effectsPage.getByRole('button', { name: 'Studio', exact: true }).tap();
        await effectsPage.getByRole('dialog').locator('[data-entity="light.demo_monitor"] .device-tile').press('Shift+Enter');
        const readOnlyLight = effectsPage.getByRole('dialog', { name: 'Monitor lamp', exact: true });
        await readOnlyLight.waitFor();
        assert.equal(await readOnlyLight.locator('.light-effect-gallery, .light-mode-bar, [data-action="set_effect"]').count(), 0);
        await effectsPage.close();
      }

      const detailPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const rightToLeft = engine === 'WebKit';
      await detailPage.goto(base + '?device-panel&locale=' + (rightToLeft ? 'he' : 'en'));
      const quickAir = detailPage.locator('.quick-button[data-entity="climate.demo_air"]');
      await quickAir.click({ delay: 600 });
      const air = detailPage.getByRole('dialog', { name: 'Studio air conditioner', exact: true });
      await air.getByRole('button', { name: rightToLeft ? 'העלאת טמפרטורת היעד' : 'Increase target temperature' }).waitFor();
      await assertDeviceHeading(air, 'Studio air conditioner');
      assert.equal(await quickAir.getAttribute('data-popup-origin'), '');
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
      await assertDeviceHeading(heaterPanel, 'Fixture step heater');
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

      const nextPage = await browser.newPage({ viewport: { width: 320, height: 812 }, hasTouch: true, reducedMotion: 'reduce' });
      await nextPage.goto(base + '?heater-level&preselect&compact-heater-steps&locale=' + (rightToLeft ? 'he' : 'en'));
      await nextPage.locator('.quick-button[data-entity="fan.demo_step_heater"]').tap();
      const nextPanel = nextPage.getByRole('dialog', { name: 'Fixture step heater', exact: true });
      const nextStep = step => nextPanel.getByRole('button', {
        name: (rightToLeft ? 'עוצמה להפעלה הבאה ' : 'Level for next start ') + step, exact: true,
      });
      await nextStep(5).waitFor();
      assert.equal(await nextStep(5).getAttribute('aria-pressed'), 'true');
      for (const width of [320, 390, 280]) {
        await nextPage.setViewportSize({ width, height: 812 });
        const layout = await nextPanel.locator('.heat-level-options').evaluate(row => {
          const buttons = [...row.querySelectorAll('.heat-level-choice')];
          const selected = buttons.find(button => button.getAttribute('aria-pressed') === 'true');
          return {
            targets: buttons.map(button => {
              const { x, y, width, height } = button.getBoundingClientRect();
              return { value: button.textContent, x, y, width, height };
            }),
            active: selected?.textContent,
            selectedBackground: getComputedStyle(selected).backgroundColor,
            idleBackground: getComputedStyle(buttons[0]).backgroundColor,
            fits: row.scrollWidth <= row.clientWidth + 1,
          };
        });
        assert.deepEqual(layout.targets.map(target => target.value), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
        assert.equal(layout.active, '5');
        assert.notEqual(layout.selectedBackground, layout.idleBackground);
        assert.equal(layout.fits, true);
        assert.ok(layout.targets.every(target => target.width >= 24.9 && target.height >= 43.9));
        const rows = new Set(layout.targets.map(target => Math.round(target.y)));
        if (width === 280) assert.ok(rows.size > 1, 'Smaller containers wrap without narrowing the targets');
        else {
          assert.equal(rows.size, 1, 'All levels fit on one row');
          assert.ok(layout.targets.every((target, index) => index === 0 || target.x > layout.targets[index - 1].x));
        }
      }
      await nextPage.setViewportSize({ width: 320, height: 812 });
      await nextStep(7).tap();
      assert.equal(await nextStep(7).getAttribute('data-changing'), '');
      assert.deepEqual(await nextPage.evaluate(() => window.bayitTest.heatingState()), ['off', 'off', 'idle']);
      assert.deepEqual(await nextPage.evaluate(() => window.bayitTest.calls), [{
        type: 'call_service', domain: 'input_number', service: 'set_value',
        target: { entity_id: 'input_number.demo_next_step' }, service_data: { value: 7 },
      }]);
      await nextPage.evaluate(() => window.bayitTest.finishPreselect());
      await nextPanel.locator('[data-role="modal-notice"]').filter({
        hasText: rightToLeft ? 'העוצמה להפעלה הבאה נשמרה' : 'Next-start level saved',
      }).waitFor();
      assert.equal(await nextStep(7).getAttribute('aria-pressed'), 'true');
      await nextPage.evaluate(() => window.bayitTest.setHeaterPower('on'));
      const runningStep = nextPanel.getByRole('button', {
        name: (rightToLeft ? 'עוצמת חימום ' : 'Heating level ') + '3', exact: true,
      });
      await runningStep.waitFor();
      assert.equal(await runningStep.getAttribute('aria-pressed'), 'true');
      assert.equal(await nextStep(7).count(), 0);
      await nextPage.evaluate(() => {
        window.bayitTest.setHeaterPower('off');
        window.bayitTest.repointTimer();
      });
      await nextStep(7).waitFor();
      assert.equal(await nextStep(7).isDisabled(), true);
      assert.equal(await nextPage.evaluate(() => window.bayitTest.calls.length), 1);
      await nextPage.close();
      console.log(engine + ' 320: helper-only heater preselect, observed save and independent running controls');

      const panelsPage = await browser.newPage({ viewport: { width:390,height:844 } });
      if (engine === 'Chromium') {
        const session = await panelsPage.context().newCDPSession(panelsPage);
        await session.send('Emulation.setEmulatedMedia', { features: [
          { name: 'prefers-reduced-transparency', value: 'no-preference' },
        ] });
      }
      await panelsPage.goto(base + '?toolbar-panels');
      const roomGraph = panelsPage.locator('[data-native-type=sensor][data-graph-hours="24"]');
      assert.equal(await roomGraph.count(), 0);
      await panelsPage.getByRole('button', {name:'Studio',exact:true}).click();
      const graphRoom = panelsPage.getByRole('dialog',{name:'Studio',exact:true});
      await graphRoom.getByText('Studio temperature',{exact:true}).waitFor();
      await roomGraph.waitFor();
      assert.equal(await roomGraph.getAttribute('data-during-opening'), 'false', 'The optional graph cannot preempt opening motion');
      const material = await graphRoom.evaluate(dialog => {
        const reduced = matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)').matches;
        const surface = getComputedStyle(dialog);
        return { reduced, fill: surface.backgroundColor, blur: surface.backdropFilter,
          backdrop: getComputedStyle(dialog, '::backdrop').backgroundColor };
      });
      if (!material.reduced) {
        assert.equal(material.fill, 'rgba(0, 0, 0, 0)');
        assert.equal(material.backdrop, 'rgba(0, 0, 0, 0)');
        assert.equal(material.blur, 'blur(14px)');
      }
      await panelsPage.emulateMedia({ contrast: 'more' });
      assert.equal(await graphRoom.evaluate(dialog => getComputedStyle(dialog).backdropFilter), 'none');
      assert.equal(await graphRoom.evaluate(dialog => getComputedStyle(dialog).backgroundColor), 'rgb(40, 40, 40)');
      await panelsPage.emulateMedia({ contrast: 'no-preference' });
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
      await panelsPage.getByRole('dialog').getByRole('button',{name:'Sensors',exact:true}).click();
      const sensors = panelsPage.getByRole('dialog',{name:'Sensors',exact:true});
      const progressGraph = sensors.locator('[data-native-type="sensor"][data-graph-hours="168"]');
      await progressGraph.waitFor();
      assert.equal(await progressGraph.getAttribute('data-hold-action'), 'none');
      assert.equal(await progressGraph.getAttribute('data-double-tap-action'), 'none');
      await progressGraph.getByText('Plot',{exact:true}).click();
      await progressGraph.dispatchEvent('ll-custom',{bubbles:true,composed:true,detail:{action:'fire-dom-event'}});
      assert.equal(await sensors.isVisible(), true);
      await progressGraph.press('Enter');
      panels = panelsPage.getByRole('dialog',{name:'Robot vacuum',exact:true});
      await panels.getByRole('button',{name:'Start cleaning',exact:true}).waitFor();
      assert.equal(await panelsPage.evaluate(() => window.bayitTest.calls.length),0);
      assert.equal(await panels.getByRole('button',{name:'Back to room',exact:true}).count(),0);
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Appearance',exact:true}).click();
      await panelsPage.getByRole('dialog').getByRole('button',{name:'Calendar',exact:true}).click();
      await panelsPage.getByRole('dialog',{name:'Calendar',exact:true}).getByText('2 calendars',{exact:true}).waitFor();
      await panelsPage.close();

      const overviewPage = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      overviewPage.setDefaultTimeout(8000);
      await overviewPage.goto(base + '?overview-opt-in');
      await overviewPage.getByRole('button', { name: 'Home overview', exact: true }).tap();
      const overviewDrawer = overviewPage.getByRole('dialog', { name: 'Home overview', exact: true });
      const overviewSection = title => overviewDrawer.locator('.toolbar-section').filter({
        has: overviewPage.getByRole('heading', { name: title, exact: true, includeHidden: true }),
      });
      const lighting = overviewSection('Discovered lighting');
      const closes = overviewSection('Closing status');
      const legacyCovers = overviewSection('Default covers');
      const dining = lighting.getByRole('button', { name: 'Dining task lamp · On', exact: true });
      await dining.waitFor();
      assert.deepEqual(await lighting.locator('.tile-label').allTextContents(), ['Dining task lamp']);
      await closes.getByRole('button', { name: 'Overview cover · Closing', exact: true }).waitFor();
      assert.equal(await legacyCovers.isVisible(), false);
      for (const state of ['unknown', 'unavailable', 'closed']) {
        await overviewPage.evaluate(() => window.bayitTest.setRoomState('cover.demo_overview_window', 'opening'));
        await legacyCovers.getByRole('button', { name: 'Overview cover · Opening', exact: true }).waitFor();
        await overviewPage.evaluate(state => window.bayitTest.setRoomState('cover.demo_overview_window', state), state);
        await legacyCovers.waitFor({ state: 'hidden' });
        await closes.waitFor({ state: 'hidden' });
      }

      await dining.focus();
      await overviewPage.evaluate(() => window.bayitTest.setDiscoveredLight('light.demo_arrived', 'A new lamp', {}));
      const arrived = lighting.getByRole('button', { name: 'A new lamp · On', exact: true });
      await arrived.waitFor();
      assert.deepEqual(await lighting.locator('.tile-label').allTextContents(), ['A new lamp', 'Dining task lamp']);
      assert.equal(await dining.evaluate(tile => tile.getRootNode().activeElement === tile), true);
      await arrived.evaluate(tile => {
        window.bayitTest.setDiscoveredLight('light.demo_arrived', 'A new lamp', { hidden: true });
        tile.click();
      });
      await arrived.waitFor({ state: 'hidden' });
      assert.equal(await overviewPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
      await dining.tap();
      await lighting.waitFor({ state: 'hidden' });
      assert.deepEqual(await overviewPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain)), [{
        type: 'call_service', domain: 'light', service: 'turn_off', target: { entity_id: 'light.demo_dining' }, service_data: {},
      }]);
      await overviewDrawer.getByText('All quiet', { exact: true }).waitFor();
      await overviewPage.close();

      const overviewEditor = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true });
      overviewEditor.setDefaultTimeout(8000);
      await overviewEditor.goto(base + '?overview-opt-in&editor');
      await overviewEditor.getByText('Toolbar and extra screens', { exact: true }).tap();
      await overviewEditor.getByRole('button', { name: 'Overview', exact: true }).tap();
      await overviewEditor.getByRole('button', { name: 'Discovered lighting', exact: true }).tap();
      const lightSource = overviewEditor.getByLabel('Device source', { exact: true });
      assert.equal(await lightSource.inputValue(), 'discover');
      await overviewEditor.getByLabel('Exclude these lights', { exact: true }).selectOption(['light.demo_excluded', 'light.demo_dining']);
      const fragments = overviewEditor.getByLabel('Exclude by text in entity ID', { exact: true });
      await fragments.fill('unsafe.*');
      await fragments.blur();
      assert.equal(await fragments.getAttribute('aria-invalid'), 'true');
      assert.deepEqual(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[0].discover.exclude_id_contains), ['helper']);
      await fragments.fill('helper, AUX');
      await fragments.blur();
      assert.deepEqual(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[0].discover), {
        domain: 'light', exclude_entities: ['light.demo_dining', 'light.demo_excluded'], exclude_id_contains: ['helper', 'aux'],
      });
      await lightSource.selectOption('manual');
      assert.deepEqual(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[0].entities), ['light.demo_lamp']);
      assert.equal(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[0].discover), undefined);
      await lightSource.selectOption('discover');
      await overviewEditor.getByRole('button', { name: 'Default covers', exact: true }).tap();
      const closingOption = overviewEditor.getByLabel('Include closing covers', { exact: true });
      assert.equal(await closingOption.isChecked(), false);
      await closingOption.check();
      assert.equal(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[2].include_closing), true);
      await overviewEditor.close();
      console.log(engine + ' 320: live Overview discovery, exclusions, closing covers and visual editor');

      const effectEditorPage = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await effectEditorPage.addInitScript(() => {
        const key = 'bayit9-browser-fixture';
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, JSON.stringify({ strategy: { type: 'custom:bayit-9',
          room_overrides: { studio: { read_only_entities: ['light.demo_monitor'] } },
          light_effect_groups: {
            'light.demo_pendant': [{ title: 'Evening', effects: [
              { effect: 'Slow pulse', name: 'Gentle glow', icon: 'mdi:weather-night' }, 'Retired preset',
            ] }],
            'light.other_saved': [{ title: 'Elsewhere', effects: ['Other effect'] }],
          },
        } }));
      });
      await effectEditorPage.goto(base + '/fixture-home/home?configuration&room-grid');
      await effectEditorPage.getByRole('button', { name: 'Appearance', exact: true }).click();
      await effectEditorPage.getByRole('button', { name: 'Customize home', exact: true }).click();
      const effectSetup = effectEditorPage.getByRole('dialog', { name: 'Customize home', exact: true });
      await effectSetup.getByText('Light effect categories', { exact: true }).click();
      const effectLight = effectSetup.getByLabel('Light', { exact: true });
      assert.deepEqual(await effectLight.locator('option').evaluateAll(options => options.map(option => option.value)),
        ['', 'light.demo_pendant']);
      await effectLight.selectOption('light.demo_pendant');
      const groupName = effectSetup.getByLabel('Category name', { exact: true });
      const groupPicker = effectSetup.getByLabel('Category', { exact: true });
      const effectToAdd = effectSetup.getByLabel('Available effect', { exact: true });
      const saveEffects = effectSetup.getByRole('button', { name: 'Save dashboard', exact: true });
      assert.deepEqual(await effectToAdd.locator('option').evaluateAll(options => options.map(option => option.value)),
        ['', 'Color loop']);
      await effectEditorPage.evaluate(() => window.bayitTest.setRoomState('light.demo_pendant', 'unavailable'));
      await effectSetup.getByText('This light is not reporting effects right now. Saved categories are kept.').waitFor();
      assert.equal(await effectToAdd.count(), 0);
      assert.equal(await saveEffects.isDisabled(), true);
      await groupName.fill('After dark');
      assert.equal(await saveEffects.isEnabled(), true);
      await groupName.press('Tab');
      assert.equal(await groupPicker.locator('option:checked').innerText(), 'After dark');
      await effectEditorPage.evaluate(() => window.bayitTest.setRoomState('light.demo_pendant', 'on'));
      await effectToAdd.selectOption('Color loop');
      await effectSetup.getByRole('button', { name: 'Add effect', exact: true }).click();
      await effectSetup.getByRole('button', { name: 'Move up · Color loop', exact: true }).click();
      await groupPicker.selectOption('new');
      await groupName.fill('Weekend');
      await effectToAdd.selectOption('Slow pulse');
      await effectSetup.getByRole('button', { name: 'Add category', exact: true }).click();
      await effectSetup.getByRole('button', { name: 'Delete category', exact: true }).click();
      await groupPicker.selectOption('new');
      await groupName.fill('Morning');
      await effectToAdd.selectOption('Color loop');
      await effectSetup.getByRole('button', { name: 'Add category', exact: true }).click();
      assert.equal(await effectEditorPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
      await saveEffects.click();
      await effectSetup.waitFor({ state: 'hidden' });
      assert.deepEqual(await effectEditorPage.evaluate(() =>
        JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.light_effect_groups), {
        'light.demo_pendant': [
          { title: 'After dark', effects: [
            { effect: 'Slow pulse', name: 'Gentle glow', icon: 'mdi:weather-night' },
            { effect: 'Color loop' }, { effect: 'Retired preset' },
          ] },
          { title: 'Morning', effects: [{ effect: 'Color loop' }] },
        ],
        'light.other_saved': [{ title: 'Elsewhere', effects: ['Other effect'] }],
      });
      await effectEditorPage.getByRole('button', { name: 'Studio', exact: true }).click();
      await effectEditorPage.getByRole('dialog').locator('[data-entity="light.demo_pendant"] .device-tile').press('Shift+Enter');
      const savedGallery = effectEditorPage.getByRole('region', { name: 'Light effect', exact: true });
      await savedGallery.getByRole('button', { name: 'After dark', exact: true }).waitFor();
      await savedGallery.getByRole('button', { name: 'Morning', exact: true }).waitFor();
      assert.equal(await savedGallery.getByText('Retired preset', { exact: true }).count(), 0);
      await effectEditorPage.close();

      const rtlEffects = await browser.newPage({ viewport: { width: 320, height: 760 }, hasTouch: true });
      await rtlEffects.goto(base + '?editor&room-grid&locale=he');
      await rtlEffects.getByText('קטגוריות אפקטים לתאורה', { exact: true }).tap();
      await rtlEffects.getByLabel('תאורה', { exact: true }).selectOption('light.demo_pendant');
      await rtlEffects.getByLabel('שם קטגוריה', { exact: true }).fill('ערב');
      await rtlEffects.getByLabel('אפקט זמין', { exact: true }).selectOption('Slow pulse');
      await rtlEffects.getByRole('button', { name: 'הוספת קטגוריה', exact: true }).tap();
      assert.equal(await rtlEffects.getByLabel('קטגוריה', { exact: true }).locator('option:checked').innerText(), 'ערב');
      assert.equal(await rtlEffects.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await rtlEffects.close();

      const setupPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await setupPage.goto(base + '/fixture-home/home?configuration&large-setup');
      await setupPage.getByRole('button', { name: 'Appearance', exact: true }).click();
      assert.equal(new URL(setupPage.url()).hash, '#panel/settings');
      await setupPage.getByRole('button', { name: 'Customize home', exact: true }).click();
      const setup = setupPage.getByRole('dialog', { name: 'Customize home', exact: true });
      const setupEditor = setup.locator('.setup-editor');
      await setupEditor.getByText('Device visibility', { exact: true }).waitFor();
      assert.equal(await setupEditor.locator('option').count(), 3, 'Closed setup sections only mount their summaries');
      const visibility = setupEditor.getByText('Device visibility', { exact: true });
      const hideDevices = setupEditor.getByLabel('Hide devices', { exact: true });
      await visibility.click();
      assert.equal(await hideDevices.locator('option').count(), 605);
      await hideDevices.selectOption(['sensor.scale_entity_6']);
      await visibility.click();
      assert.equal(await hideDevices.count(), 0);
      await visibility.press('Enter');
      assert.deepEqual(await hideDevices.locator('option:checked').evaluateAll(nodes => nodes.map(node => node.value)),
        ['sensor.scale_entity_6']);
      await visibility.click();

      const profiles = setupEditor.getByText('Boiler and heater controls', { exact: true });
      const profileName = setupEditor.getByLabel('Display name', { exact: true });
      await profiles.click();
      await setupEditor.getByRole('button', { name: 'Add profile', exact: true }).click();
      await profileName.fill('Uncommitted heater name');
      await profiles.click();
      assert.equal(await profileName.count(), 0);

      const shortcuts = setupEditor.getByText('Room shortcuts', { exact: true });
      const shortcutRoom = setupEditor.getByLabel('Room', { exact: true });
      const automaticShortcuts = setupEditor.getByLabel('Choose shortcuts automatically', { exact: true });
      await shortcuts.click();
      await automaticShortcuts.waitFor();
      assert.equal(await setupEditor.getByLabel('Shortcut 1', { exact: true }).count(), 0);
      await shortcutRoom.selectOption('studio');
      assert.equal(await shortcutRoom.evaluate(input => input.getRootNode().activeElement === input), true);
      assert.equal(await automaticShortcuts.isChecked(), true);
      await automaticShortcuts.uncheck();
      const firstShortcut = setupEditor.getByLabel('Shortcut 1', { exact: true });
      await firstShortcut.selectOption('light.demo_lamp');
      await automaticShortcuts.check();
      assert.equal(await firstShortcut.count(), 0);
      await automaticShortcuts.uncheck();
      assert.equal(await firstShortcut.inputValue(), 'light.demo_lamp');
      await shortcuts.click();
      await profiles.click();

      await setup.getByText('Rooms', { exact: true }).click();
      await setup.getByText('New dashboard-only room', { exact: true }).click();
      await setup.getByLabel('New room name', { exact: true }).fill('Reading nook');
      await setup.getByRole('button', { name: 'Create room', exact: true }).click();
      await setup.getByLabel('Available devices', { exact: true }).selectOption('light.demo_lamp');
      await setup.getByRole('button', { name: 'Add device', exact: true }).click();
      await setup.getByLabel('Show status only for selected room devices', { exact: true }).selectOption(['light.demo_lamp']);
      assert.equal(await profileName.inputValue(), 'Uncommitted heater name');
      await setup.getByRole('button', { name: 'Save dashboard', exact: true }).click();
      await setupPage.getByRole('button', { name: 'Reading nook', exact: true }).waitFor();
      const persisted = await setupPage.evaluate(() => JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')));
      assert.equal(await setupPage.evaluate(() => sessionStorage.getItem('bayit9-browser-fixture-hash-at-save')), '');
      assert.deepEqual(Object.values(persisted.strategy.room_overrides), [{ name: 'Reading nook',
        entities: ['light.demo_lamp'], read_only_entities: ['light.demo_lamp'] }]);
      assert.deepEqual(persisted.strategy.hidden_entities, ['sensor.scale_entity_6']);
      assert.deepEqual(persisted.strategy.room_shortcuts.studio, ['light.demo_lamp']);
      assert.equal(persisted.strategy.profiles, undefined);
      assert.equal(await setupPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
      await setupPage.close();

      const roomConfigUrl = base + '/fixture-home/home?configuration&room-selection';
      const openRoomEditor = async page => {
        await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
        await page.getByRole('button', { name: 'Customize home', exact: true }).tap();
        const setup = page.getByRole('dialog', { name: 'Customize home', exact: true });
        await setup.getByText('Rooms', { exact: true }).tap();
        return setup;
      };
      const newRoomConfigPage = () => browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true });
      const roomOrder = page => page.locator('.room').evaluateAll(rooms => rooms.map(room => room.dataset.room));
      const selectionSettings = page => page.evaluate(() => {
        const { area_ids, room_selection } = JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy;
        return { area_ids, room_selection };
      });
      const roomMode = setup => setup.getByLabel('Rooms on the dashboard', { exact: true });
      const saveRoomConfig = async setup => {
        await setup.getByRole('button', { name: 'Save dashboard', exact: true }).tap();
        await setup.waitFor({ state: 'hidden' });
      };

      const selectedRoomsPage = await newRoomConfigPage();
      await selectedRoomsPage.goto(roomConfigUrl + '&legacy-room-order');
      let roomSetup = await openRoomEditor(selectedRoomsPage);
      assert.equal(await roomMode(roomSetup).inputValue(), 'custom');
      await roomSetup.getByLabel('Available rooms', { exact: true }).selectOption('spare');
      await roomSetup.getByRole('button', { name: 'Show room', exact: true }).tap();
      const roomName = roomSetup.getByLabel('Room display name', { exact: true });
      await roomName.fill('Guest room');
      await roomName.press('Enter');
      const moveUp = roomSetup.getByRole('button', { name: 'Move up · Guest room', exact: true });
      await moveUp.press('Enter');
      assert.equal(await moveUp.evaluate(control => control.getRootNode().activeElement === control), true);
      await saveRoomConfig(roomSetup);
      await selectedRoomsPage.getByRole('button', { name: 'Guest room', exact: true }).waitFor();
      assert.deepEqual(await roomOrder(selectedRoomsPage), ['lounge', 'spare', 'studio']);
      assert.deepEqual(await selectionSettings(selectedRoomsPage), {
        area_ids: ['lounge', 'spare', 'studio'], room_selection: 'manual',
      });
      await selectedRoomsPage.getByRole('button', { name: 'Guest room', exact: true }).tap();
      await selectedRoomsPage.getByText('No devices in this room.', { exact: true }).waitFor();
      await selectedRoomsPage.goto(roomConfigUrl + '&member');
      await selectedRoomsPage.getByRole('button', { name: 'Guest room', exact: true }).waitFor();
      await selectedRoomsPage.getByRole('button', { name: 'Appearance', exact: true }).tap();
      assert.equal(await selectedRoomsPage.getByRole('button', { name: 'Customize home', exact: true }).count(), 0);
      assert.equal(await selectedRoomsPage.evaluate(() => window.bayitTest.calls.length), 0);
      await selectedRoomsPage.close();

      const lastRoomPage = await newRoomConfigPage();
      await lastRoomPage.goto(roomConfigUrl + '&sole-room');
      await lastRoomPage.getByRole('button', { name: 'Reading nook', exact: true }).waitFor();
      assert.deepEqual(await roomOrder(lastRoomPage), ['bayit_room_only']);
      roomSetup = await openRoomEditor(lastRoomPage);
      await roomSetup.getByRole('button', { name: 'Delete dashboard room', exact: true }).tap();
      assert.equal(await roomMode(roomSetup).inputValue(), 'custom');
      await saveRoomConfig(roomSetup);
      await lastRoomPage.getByText('No rooms have been added.', { exact: true }).waitFor();
      assert.deepEqual(await selectionSettings(lastRoomPage), { area_ids: [], room_selection: 'manual' });
      roomSetup = await openRoomEditor(lastRoomPage);
      await roomSetup.getByLabel('Available rooms', { exact: true }).selectOption('studio');
      await roomSetup.getByRole('button', { name: 'Show room', exact: true }).tap();
      await roomSetup.getByRole('button', { name: 'Hide room · Studio', exact: true }).press('Enter');
      assert.equal(await roomMode(roomSetup).evaluate(control => control.getRootNode().activeElement === control), true);
      await roomMode(roomSetup).selectOption('auto');
      await saveRoomConfig(roomSetup);
      await lastRoomPage.getByRole('button', { name: 'Studio', exact: true }).waitFor();
      assert.deepEqual(await roomOrder(lastRoomPage), ['lounge', 'studio']);
      await lastRoomPage.close();
      console.log(engine + ' 320: explicit empty room selection, keyboard order, and member behavior');

      for (const empty of [false, true]) {
        const membershipPage = await newRoomConfigPage();
        const roomCase = empty ? '&empty-source-room' : '&legacy-room-order';
        await membershipPage.goto(roomConfigUrl + '&cross-area-room-device' + roomCase);
        const before = membershipPage.locator('.room[data-room="studio"]');
        const movedLamp = membershipPage.locator('.room[data-room="lounge"] [data-entity="light.demo_lamp"]');
        await movedLamp.waitFor();
        assert.equal(await before.count(), empty ? 0 : 1);
        assert.equal(await before.locator('[data-entity="light.demo_lamp"]').count(), 0);

        const membershipSetup = await openRoomEditor(membershipPage);
        const currentRoom = membershipSetup.getByLabel('Room to customize', { exact: true });
        await currentRoom.selectOption('studio');
        const deviceMode = membershipSetup.getByLabel('Devices in this room', { exact: true });
        assert.equal(await deviceMode.inputValue(), 'auto');
        await deviceMode.selectOption('manual');
        const removal = membershipSetup.getByRole('button', { name: 'Remove · Room heater', exact: true });
        assert.equal(await removal.count(), empty ? 0 : 1);
        assert.equal(await membershipSetup.getByRole('button', { name: 'Remove · Desk lamp', exact: true }).count(), 0);
        if (empty) await membershipSetup.getByText('No devices selected.', { exact: true }).waitFor();
        await deviceMode.selectOption('auto');
        const roomsDisclosure = membershipSetup.getByText('Rooms', { exact: true });
        await roomsDisclosure.tap();
        await currentRoom.waitFor({ state: 'hidden' });
        await roomsDisclosure.tap();
        assert.equal(await currentRoom.inputValue(), 'studio');
        assert.equal(await deviceMode.inputValue(), 'auto');
        await deviceMode.selectOption('manual');
        assert.equal(await removal.count(), empty ? 0 : 1);
        assert.equal(await membershipSetup.getByRole('button', { name: 'Remove · Desk lamp', exact: true }).count(), 0);

        await saveRoomConfig(membershipSetup);
        await before.waitFor();
        assert.equal(await before.locator('[data-entity="light.demo_lamp"]').count(), 0);
        assert.equal(await movedLamp.count(), 1);
        assert.deepEqual(await membershipPage.evaluate(() =>
          JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.room_overrides), {
          lounge: { entities: ['light.demo_lamp'] },
          studio: { entities: empty ? [] : ['switch.demo_heater'] },
        });
        await membershipPage.close();
      }
      console.log(engine + ' 320: automatic device membership preserves existing cross-area placement when edited and reopened');

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
