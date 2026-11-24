import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CUSTOM_ROOM_PREFIX, dashboardRoomOptions, discoverRooms, generateDashboard,
  normalizeProfile, selectableRoomEntities, suggestedDashboard,
} from '../src/strategy-model.js';
import { getDeviceModel } from '../src/device-control.mjs';

test('keeps explicit vacuum floor bindings and excludes card config and geometry', () => {
  const states = Object.fromEntries(['vacuum.robot', 'select.map', 'select.other', 'image.first', 'image.second']
    .map(entity => [entity, { state: 'on', attributes: {} }]));
  const hass = { states, entities: {
    'vacuum.robot': { di: 'robot' }, 'select.map': { di: 'robot' }, 'select.other': { di: 'other' },
  } };
  const map = { enabled: true, vacuum: 'vacuum.robot', selector: 'select.map', activate: 'select.select_option',
    floors: [
      { option: 'First', image: 'image.first', outline: [[1, 2]] },
      { option: 'First', image: 'image.second' },
      { option: 'Hidden', image: 'image.second' },
    ] };
  const toolbar = generateDashboard({ hidden_entities: ['image.second'], toolbar: [
    { kind: 'vacuum', vacuum_map: map },
    { kind: 'vacuum', vacuum_map: { ...map, selector: 'select.other' } },
    { kind: 'vacuum', vacuum_map: { ...map, enabled: false } },
    { kind: 'security', vacuum_map: map },
  ] }, hass).views[0].cards[0].toolbar;
  assert.deepEqual(toolbar[0].vacuum_map, { enabled: true, vacuum: 'vacuum.robot', selector: 'select.map',
    floors: [{ option: 'First', image: 'image.first' }] });
  assert.deepEqual(toolbar.slice(1).map(button => button.vacuum_map), [undefined, undefined, undefined]);
});

test('explicitly enables the Oref map on Security entries with only its typed options', () => {
  const toolbar = generateDashboard({ toolbar: [
    { kind: 'security' },
    { kind: 'security', oref_map: { enabled: 'true' } },
    { kind: 'security', oref_map: { enabled: false, auto_fit: false } },
    { kind: 'weather', oref_map: { enabled: true } },
    { kind: 'security', placement: 'settings', oref_map: { enabled: true, auto_fit: false, show_pre_alert: true,
      show_end: 'false', show_home: true, show_location: true, tileLayer: 'https://fixture.invalid', entities: ['zone.home'] } },
  ] }, {}).views[0].cards[0].toolbar;
  assert.deepEqual(toolbar.slice(0, 4).map(entry => entry.oref_map), Array(4).fill(undefined));
  assert.equal(toolbar[4].placement, 'settings');
  assert.deepEqual(toolbar[4].oref_map, {
    enabled: true, auto_fit: false, hebrew_basemap: true, show_pre_alert: true, show_end: true,
  });
});

function home() {
  return {
    locale: { language: 'he-IL' },
    areas: {
      studio: { area_id: 'studio', name: 'חדר עבודה', icon: 'mdi:desk' },
      lounge: { area_id: 'lounge', name: 'סלון' },
      porch: { area_id: 'porch', name: 'מרפסת' },
    },
    devices: { dimmer: { area_id: 'lounge' } },
    entities: {
      'light.demo_lamp': { device_id: 'dimmer' },
      'fan.demo_fan': { area_id: 'studio', device_id: 'dimmer' },
      'sensor.demo_rssi': { area_id: 'lounge', entity_category: 'diagnostic' },
      'climate.demo_air': { area_id: 'lounge', hidden_by: 'user' },
      'switch.demo_boiler': {}, 'timer.demo_boiler': {}, 'script.demo_start': {},
      'switch.demo_missing': { area_id: 'studio', disabled_by: 'user' },
      'calendar.demo_schedule': { area_id: 'porch' },
    },
    states: {
      'light.demo_lamp': { state: 'off', attributes: { friendly_name: 'מנורה' } },
      'fan.demo_fan': { state: 'unavailable', attributes: { friendly_name: 'מאוורר' } },
      'sensor.demo_rssi': { state: '-60', attributes: { friendly_name: 'RSSI' } },
      'climate.demo_air': { state: 'cool', attributes: {} },
      'switch.demo_boiler': { state: 'off', attributes: { friendly_name: 'דוד' } },
      'timer.demo_boiler': { state: 'idle', attributes: {} },
      'script.demo_start': { state: 'off', attributes: {} },
      'sensor.test_template_without_registry': { state: '16', attributes: {} },
      'calendar.demo_schedule': { state: 'off', attributes: {} },
    },
  };
}

test('installs as a native panel dashboard from a Hebrew Home Assistant', () => {
  const mock = home();
  const output = generateDashboard({}, mock);
  assert.deepEqual(suggestedDashboard(mock), { title: 'בית 9', icon: 'mdi:home-variant-outline' });
  const view = output.views[0];
  assert.equal(view.type, 'panel');
  assert.equal(view.path, 'home');
  assert.equal(view.cards[0].type, 'custom:bayit-dashboard');
  assert.equal(view.cards[0].page, true);
  assert.equal(view.cards[0].locale, 'he');
  assert.equal(view.cards[0].rooms.at(-1).name, 'ללא חדר');
});

test('maps effect categories to visible controllable lights and preserves native names exactly', () => {
  const states = Object.fromEntries(['light.demo_lamp', 'light.demo_read_only', 'light.demo_hidden', 'switch.demo_switch']
    .map(entity => [entity, { state: 'off', attributes: {} }]));
  const config = { area_ids: ['bayit_room_demo'], room_overrides: {
    bayit_room_demo: { name: 'Demo', entities: Object.keys(states), read_only_entities: ['light.demo_read_only'] },
  }, hidden_entities: ['light.demo_hidden'] };
  const name = 'Spring\u00a0Wind';
  const effects = [{ title: ' Nature ', effects: [{ effect: name, name: ' Breeze ', icon: 'mdi:weather-windy' },
    name, '  ', { effect: 'Unknown', icon: 'not-mdi', action: 'script.any' }] }];
  config.light_effect_groups = Object.fromEntries(Object.keys(states).map(entity => [entity, effects]));
  const [room] = discoverRooms(config, { states }, 'en');
  assert.deepEqual(room.entities, [
    { entity: 'light.demo_lamp', effect_groups: [{ title: 'Nature', effects: [
      { effect: name, name: 'Breeze', icon: 'mdi:weather-windy' }, { effect: 'Unknown' },
    ] }] },
    { entity: 'light.demo_read_only', role: 'status' }, { entity: 'switch.demo_switch' },
  ]);
  assert.equal(effects[0].title, ' Nature ');
});

test('discovers rooms via device and entity registries without exposing hidden or disabled entries', () => {
  const rooms = Object.fromEntries(discoverRooms({}, home(), 'en').map(room => [room.id, room]));
  assert.deepEqual(rooms.lounge.entities.map(entry => entry.entity), ['light.demo_lamp']);
  assert.deepEqual(rooms.studio.entities.map(entry => entry.entity), ['fan.demo_fan']);
  assert.equal(rooms.studio.icon, 'mdi:desk');
  assert.equal(rooms.bayit9_unassigned.entities[0].entity, 'switch.demo_boiler');
});

test('handles registry-less and empty instances without fixed entity ids', () => {
  const dashboard = generateDashboard({}, { states: {} });
  assert.deepEqual(dashboard.views[0].cards[0].rooms, []);
  assert.equal(dashboard.title, 'Bayit 9');
  const another = { states: { 'cover.demo_blinds': { state: 'closed', attributes: {} } } };
  assert.equal(generateDashboard({}, another).views[0].cards[0].rooms[0].entities[0].entity, 'cover.demo_blinds');
});

test('honors explicit area order, unassigned setting and compact HA registry fields', () => {
  const mock = home();
  mock.entities['calendar.demo_schedule'] = { ai: 'porch' };
  mock.entities['light.demo_lamp'] = { di: 'dimmer', ic: 'mdi:lightbulb', en: 'Hall bulb' };
  delete mock.states['light.demo_lamp'].attributes.friendly_name;
  const rooms = discoverRooms({ area_ids: ['porch', 'lounge'], show_unassigned: false }, mock, 'en');
  assert.deepEqual(rooms.map(room => room.id), ['porch', 'lounge']);
  assert.deepEqual(rooms[1].entities, [{ entity: 'light.demo_lamp', name: 'Hall bulb', icon: 'mdi:lightbulb' }]);
});

test('includes explicitly selected extras without discovering all scripts or hidden items', () => {
  const rooms = discoverRooms({
    hidden_entities: ['light.demo_lamp'],
    included_entities: ['sensor.demo_rssi', 'sensor.test_template_without_registry', 'climate.demo_air'],
  }, home(), 'en');
  assert.deepEqual(rooms.find(room => room.id === 'lounge').entities.map(entity => entity.entity), ['sensor.demo_rssi']);
  assert.ok(rooms.at(-1).entities.some(entity => entity.entity === 'sensor.test_template_without_registry'));
  assert.ok(rooms.every(room => room.entities.every(entity => entity.entity !== 'script.demo_start')));
});

test('maps local timer and scripts to the configured heating entity', () => {
  const config = {
    profiles: [{
      entity: 'switch.demo_boiler', kind: 'boiler', name: 'Test boiler',
      timed: { start_script: 'script.demo_start', stop_script: 'light.demo_lamp',
        timer_entity: 'timer.demo_boiler', min_minutes: 10, max_minutes: 45, step_minutes: 5 },
    }],
  };
  const card = discoverRooms(config, home(), 'en').at(-1).entities[0];
  assert.deepEqual(card, {
    entity: 'switch.demo_boiler', kind: 'boiler', name: 'Test boiler',
    timed: { start_script: 'script.demo_start', timer_entity: 'timer.demo_boiler',
      duration_field: 'duration', min_minutes: 10, max_minutes: 45, step_minutes: 5 },
  });
  assert.equal(normalizeProfile({ entity: 'light.demo_lamp', kind: 'heater', timed: {} }), null);
  assert.equal(normalizeProfile({ entity: 'switch.demo_bad', kind: 'vacuum' }), null);
});

test('resolves appearance and filters unknown options', () => {
  const configured = generateDashboard({
    locale: 'en', title: ' Demo ', background: 'lagoon',
    shape: 'circle', layout: 'header', preference_key: 'mobile',
  }, home()).views[0].cards[0];
  assert.deepEqual([configured.locale, configured.title, configured.background,
    configured.shape, configured.layout, configured.preference_key],
  ['en', 'Demo', 'lagoon', 'circle', 'header', 'mobile']);
  const invalid = generateDashboard({ background: '<input>', shape: 'wrong', layout: 'wrong' }, home()).views[0].cards[0];
  assert.equal(invalid.background, undefined);
  assert.equal(invalid.shape, undefined);
  assert.equal(invalid.layout, undefined);
});

test('honors room filtering and does not mutate HA state or strategy settings', () => {
  const hass = home();
  const input = { area_ids: ['studio'], hidden_entities: ['switch.demo_boiler'] };
  const snapshot = structuredClone({ hass, input });
  assert.deepEqual(discoverRooms(input, hass, 'en').map(room => room.id), ['studio']);
  assert.deepEqual({ hass, input }, snapshot);
});

test('chooses valid unique IDs for unassigned devices even if a room uses the reserved name', () => {
  const mock = home();
  mock.areas.bayit9_unassigned = { name: 'Attic', area_id: 'bayit9_unassigned' };
  const rooms = discoverRooms({}, mock, 'en');
  assert.equal(rooms.at(-1).id, 'bayit9_unassigned_1');
  assert.ok(normalizeProfile({ entity: 'fan.demo_heater', kind: 'heater' }));
  assert.equal(normalizeProfile({ entity: 'input_boolean.demo_heater', kind: 'heater' }), null);
});

test('keeps curated shortcuts in order, limits them to visible room members, and honors an empty list', () => {
  const hass = home();
  const ids = Array.from({ length: 8 }, (_, index) => 'switch.demo_' + index);
  for (const entity of ids) {
    hass.states[entity] = { state: 'off', attributes: {} };
    hass.entities[entity] = { area_id: 'lounge' };
  }
  const rooms = discoverRooms({
    hidden_entities: [ids[0]],
    room_shortcuts: { lounge: [ids[0], ids[4], 'fan.demo_fan', ...ids], studio: [] },
  }, hass, 'en');
  assert.deepEqual(rooms.find(room => room.id === 'lounge').shortcuts,
    [ids[4], ids[1], ids[2], ids[3], ids[5], ids[6]]);
  assert.deepEqual(rooms.find(room => room.id === 'studio').shortcuts, []);
  assert.equal(rooms.find(room => room.id === 'porch').shortcuts, undefined);
});

test('overview cannot surface hidden or excluded devices', () => {
  const dashboard = generateDashboard({
    area_ids: ['lounge', 'porch'],
    hidden_entities: ['light.demo_lamp'],
    overview_entities: ['calendar.demo_schedule', 'light.demo_lamp', 'fan.demo_fan', 'calendar.demo_schedule'],
  }, home());
  assert.deepEqual(dashboard.views[0].cards[0].overview, ['calendar.demo_schedule']);
});

test('supports status-only room devices without changing the same device in another room', () => {
  const entity = 'switch.demo_boiler';
  const hass = home();
  const rooms = discoverRooms({
    area_ids: ['lounge', 'studio'],
    room_overrides: {
      lounge: { entities: [entity], read_only_entities: [entity, 'switch.not_in_room'] },
      studio: { entities: [entity] },
    },
    room_shortcuts: { lounge: [entity] },
  }, hass, 'en');
  assert.deepEqual(rooms[0].entities.map(device => [device.entity, device.role]), [[entity, 'status']]);
  assert.deepEqual(rooms[0].shortcuts, [entity]);
  assert.deepEqual(rooms[1].entities.map(device => [device.entity, device.role]), [[entity, undefined]]);
  assert.deepEqual(Object.keys(getDeviceModel(rooms[0].entities[0], hass.states).actions), ['more_info']);
  assert.ok(getDeviceModel(rooms[1].entities[0], hass.states).actions.turn_on);
});

test('honors room names, icons and hand-picked device order across areas without moving HA entities', () => {
  const hass = home();
  const config = {
    area_ids: ['lounge', 'porch', 'studio'],
    show_unassigned: false,
    room_overrides: {
      lounge: { name: '  Main room  ', icon: ' mdi:star ', entities: [
        'switch.demo_boiler', 'light.demo_lamp', 'fan.demo_fan', 'light.demo_lamp',
      ], entity_icons: {
        'switch.demo_boiler': ' mdi:radiator ',
        'light.demo_lamp': '<img>',
        'script.demo_start': 'mdi:star',
      } },
      porch: { entities: [] },
      studio: { name: 'Workshop', icon: '<svg>', entities: 'invalid',
        entity_icons: { 'fan.demo_fan': 'mdi:fan' } },
      obsolete: { name: 'An area no longer present', entities: ['calendar.demo_schedule'] },
    },
    room_shortcuts: { lounge: ['fan.demo_fan', 'calendar.demo_schedule', 'switch.demo_boiler'] },
    overview_entities: ['calendar.demo_schedule', 'fan.demo_fan'],
  };
  const original = structuredClone({ hass, config });
  const card = generateDashboard(config, hass).views[0].cards[0];
  assert.deepEqual(card.rooms.map(room => room.id), ['lounge', 'porch']);
  assert.deepEqual(card.rooms[0], {
    id: 'lounge', name: 'Main room', icon: 'mdi:star',
    entities: [
      { entity: 'switch.demo_boiler', name: 'דוד', icon: 'mdi:radiator' },
      { entity: 'light.demo_lamp', name: 'מנורה' },
      { entity: 'fan.demo_fan', name: 'מאוורר' },
    ],
    shortcuts: ['fan.demo_fan', 'switch.demo_boiler'],
  });
  assert.deepEqual(card.rooms[1].entities, []);
  assert.deepEqual(card.overview, ['fan.demo_fan']);
  assert.deepEqual({ hass, config }, original);

  const studio = discoverRooms({ room_overrides: config.room_overrides, area_ids: ['studio'] }, hass, 'he')[0];
  assert.equal(studio.name, 'Workshop');
  assert.equal(studio.icon, 'mdi:desk');
  assert.deepEqual(studio.entities[0], { entity: 'fan.demo_fan', name: 'מאוורר', icon: 'mdi:fan' });
});

test('shares room-picker exclusions with visible devices, including registry-less manual choices', () => {
  const hass = home();
  hass.entities['light.compact_hidden'] = { hidden: true };
  hass.states['light.compact_hidden'] = { state: 'on', attributes: {} };
  hass.states['switch.demo_missing'] = { state: 'off', attributes: {} };
  hass.states['sensor.non_state'] = null;
  const allowed = ['fan.demo_fan', 'sensor.test_template_without_registry', 'sensor.demo_rssi'];
  const denied = [
    'not.an entity', 'sensor.no_such_state', 'sensor.non_state', 'climate.demo_air',
    'switch.demo_missing', 'light.compact_hidden', 'light.demo_lamp',
  ];
  const config = {
    discovery_mode: 'controls',
    hidden_entities: ['light.demo_lamp'],
    area_ids: ['studio'],
    show_unassigned: false,
    room_overrides: { studio: { entities: [...allowed, ...denied] } },
  };
  assert.deepEqual(discoverRooms(config, hass, 'he')[0].entities.map(item => item.entity), allowed);
  const selectable = new Set(selectableRoomEntities(config, hass).map(item => item.entity));
  assert.ok(allowed.every(id => selectable.has(id)));
  assert.ok(denied.every(id => !selectable.has(id)));
});

test('supports additional dashboard-only rooms in the room order and retains empty rooms', () => {
  const hass = home();
  const custom = CUSTOM_ROOM_PREFIX + 'washing-room';
  const empty = CUSTOM_ROOM_PREFIX + 'empty';
  const real = CUSTOM_ROOM_PREFIX + 'actual-area';
  hass.areas[real] = { area_id: real, name: 'Existing HA area' };
  hass.entities['calendar.demo_schedule'].area_id = real;
  const config = {
    area_ids: [empty, custom, real, 'studio'],
    show_unassigned: false,
    room_overrides: {
      [custom]: { name: 'Laundry', icon: 'mdi:washing-machine', entities: ['fan.demo_fan', 'switch.demo_boiler'] },
      [empty]: { name: 'Empty room' },
      [real]: { name: 'Actual area', icon: 'unknown:icon' },
      ['bayit_room_Forbidden']: { name: 'Invalid ID' },
      ['bayit_room_nameless']: { entities: ['fan.demo_fan'] },
      studio: { entities: ['fan.demo_fan'] },
    },
  };
  const rooms = discoverRooms(config, hass, 'en');
  assert.deepEqual(rooms.map(room => room.id), config.area_ids);
  assert.deepEqual(rooms[0].entities, []);
  assert.deepEqual(rooms[1].entities.map(item => item.entity), ['fan.demo_fan', 'switch.demo_boiler']);
  assert.equal(rooms[2].entities[0].entity, 'calendar.demo_schedule');
  assert.equal(rooms[3].entities[0].entity, 'fan.demo_fan');

  const options = dashboardRoomOptions(config, hass);
  assert.deepEqual(options.filter(option => option.custom).map(option => option.id), [custom, empty]);
  assert.deepEqual(options.find(option => option.id === real), {
    id: real, name: 'Actual area', icon: 'mdi:home-outline', custom: false,
  });
  assert.ok(options.some(option => option.id === 'lounge'));
  const automatic = discoverRooms({ ...config, area_ids: [] }, hass, 'en');
  assert.ok(automatic.some(room => room.id === empty));
  assert.ok(automatic.some(room => room.id === custom));
});

test('keeps existing discovery behavior and limits explicit controls mode to directly controllable devices', () => {
  const hass = home();
  for (const entity of ['camera.demo', 'vacuum.demo', 'sensor.demo_temperature', 'water_heater.demo']) {
    hass.entities[entity] = { area_id: 'porch' };
    hass.states[entity] = { state: 'off', attributes: {} };
  }
  const collect = config => discoverRooms(config, hass, 'en').find(room => room.id === 'porch').entities.map(item => item.entity);
  const legacy = ['water_heater.demo', 'vacuum.demo', 'camera.demo', 'sensor.demo_temperature', 'calendar.demo_schedule'];
  assert.deepEqual(collect({}), legacy);
  assert.deepEqual(collect({ discovery_mode: 'all' }), legacy);
  assert.deepEqual(collect({ discovery_mode: 'bad' }), legacy);
  assert.deepEqual(collect({ discovery_mode: 'controls' }), ['water_heater.demo']);
  assert.deepEqual(collect({
    discovery_mode: 'controls', included_entities: ['sensor.demo_temperature'],
  }), ['water_heater.demo', 'sensor.demo_temperature']);
});

test('exposes curated household context independently of room filters without returning hidden entities', () => {
  const hass = home();
  const add = (entity, state, deviceClass, entry = {}) => {
    hass.states[entity] = { state, attributes: { device_class: deviceClass } };
    hass.entities[entity] = entry;
  };
  add('lock.entry', 'locked', undefined);
  add('alarm_control_panel.home', 'disarmed', undefined);
  add('person.friend', 'home', undefined);
  add('person.hidden', 'home', undefined, { hidden_by: 'user' });
  add('weather.local', 'sunny', undefined);
  add('weather.disabled', 'sunny', undefined, { disabled_by: 'user' });
  add('binary_sensor.entry', 'off', 'door');
  add('binary_sensor.window', 'off', 'window');
  add('binary_sensor.motion', 'off', 'motion');
  add('sensor.energy', '1200', 'energy');
  add('sensor.power', '215', 'power');
  add('sensor.other', '20', 'temperature');
  const config = {
    area_ids: ['studio'], discovery_mode: 'controls', show_unassigned: false,
    hidden_entities: ['binary_sensor.window'],
    overview_entities: ['sensor.energy', 'sensor.other'],
  };
  const card = generateDashboard(config, hass).views[0].cards[0];
  assert.deepEqual(card.rooms.map(room => room.id), ['studio']);
  assert.deepEqual(card.context, {
    security: [{ entity: 'alarm_control_panel.home' }, { entity: 'binary_sensor.entry' }, { entity: 'lock.entry' }],
    presence: [{ entity: 'person.friend' }],
    weather: [{ entity: 'weather.local' }],
    energy: [{ entity: 'sensor.energy' }],
  });
  assert.equal(card.overview, undefined);
  assert.equal(generateDashboard({}, { states: {} }).views[0].cards[0].context, undefined);
});

test('keeps configured room section order, roles and empty headings without changing area or shortcut order', () => {
  const hass = home();
  hass.states['climate.demo_visible'] = { state: 'cool', attributes: {} };
  hass.entities['climate.demo_visible'] = { area_id: 'porch' };
  const config = {
    area_ids: ['lounge'], show_unassigned: false,
    room_overrides: {
      lounge: {
        entities: ['light.demo_lamp', 'switch.demo_boiler', 'climate.demo_visible'],
        entity_icons: { 'switch.demo_boiler': 'mdi:radiator' },
        sections: [
          { id: 'section-2', kind: 'climate', title: '', entities: ['climate.demo_visible'] },
          { kind: 'lights', title: '  Lighting  ', entities: ['light.demo_lamp', 'light.demo_lamp', 'fan.demo_fan'] },
          { id: 'bogus', kind: 'browser-script', entities: ['switch.demo_boiler'] },
          { kind: 'heating', entities: ['switch.demo_boiler', 'climate.demo_air'] },
          { kind: 'garage', entities: [] },
        ],
      },
    },
    room_shortcuts: { lounge: ['switch.demo_boiler', 'light.demo_lamp'] },
  };
  const previous = structuredClone({ config, hass });
  const room = discoverRooms(config, hass, 'en')[0];
  assert.deepEqual(room.entities.map(item => item.entity),
    ['light.demo_lamp', 'switch.demo_boiler', 'climate.demo_visible']);
  assert.deepEqual(room.sections.map(({ id, kind, title, entities }) => [id, kind, title, entities.map(item => item.entity)]), [
    ['section-2', 'climate', '', ['climate.demo_visible']],
    ['section-2-2', 'lights', 'Lighting', ['light.demo_lamp']],
    ['section-4', 'heating', undefined, ['switch.demo_boiler']],
    ['section-5', 'garage', undefined, []],
  ]);
  assert.equal(room.sections[2].entities[0].icon, 'mdi:radiator');
  assert.deepEqual(room.shortcuts, ['switch.demo_boiler', 'light.demo_lamp']);
  assert.deepEqual({ config, hass }, previous);
});

test('derives room membership from sections when flat membership is omitted', () => {
  const hass = home();
  const custom = CUSTOM_ROOM_PREFIX + 'controlled';
  const config = {
    area_ids: [custom, 'lounge'], show_unassigned: false,
    room_overrides: {
      [custom]: {
        name: 'Controls',
        sections: [
          { kind: 'lights', entities: ['light.demo_lamp', 'climate.demo_air'] },
          { kind: 'sensors', entities: ['sensor.demo_rssi'] },
          { kind: 'sensors', title: 'Another sensor group', entities: ['sensor.test_template_without_registry'] },
        ],
      },
    },
  };
  const rooms = discoverRooms(config, hass, 'en');
  assert.deepEqual(rooms.map(item => item.id), [custom]);
  assert.deepEqual(rooms[0].entities.map(item => item.entity),
    ['light.demo_lamp', 'sensor.demo_rssi', 'sensor.test_template_without_registry']);
  assert.deepEqual(rooms[0].sections.map(section => section.kind), ['lights', 'sensors', 'sensors']);
  assert.equal(discoverRooms({}, hass, 'en')[0].sections, undefined);
});

test('emits ordered toolbar entries, protects visibility, and limits navigation to local rooted paths', () => {
  const hass = home();
  for (const [entity, area_id] of [['automation.visible', 'studio'], ['automation.excluded', 'lounge'],
    ['automation.unassigned', undefined], ['automation.hidden', 'studio']]) {
    hass.states[entity] = { state: 'on', attributes: {} };
    hass.entities[entity] = { area_id, ...(entity.endsWith('.hidden') && { hidden_by: 'user' }) };
  }
  const config = {
    area_ids: ['studio'], show_unassigned: false,
    hidden_entities: ['light.demo_lamp'],
    toolbar: [
      { kind: 'automations', label: '  Simulated actions  ', icon: ' mdi:home-automation ',
        entities: ['automation.visible', 'automation.visible', 'automation.hidden', 'script.demo_start', 'light.demo_lamp'] },
      { kind: 'link', path: '/config/automation/dashboard#main', icon: '<svg>', execute: 'unsafe-test-field' },
      { kind: 'link', path: '//elsewhere.invalid' },
      { kind: 'link', path: 'https://elsewhere.invalid' },
      { kind: 'link', path: '/config/%2e%2e' },
      { kind: 'link', path: '/config/../energy' },
      { kind: 'security', path: 'https://elsewhere.invalid', entities: [] },
      { kind: 'settings' },
    ],
  };
  const card = generateDashboard(config, hass).views[0].cards[0];
  assert.deepEqual(card.context.automations, [{ entity: 'automation.visible' }]);
  assert.deepEqual(card.toolbar, [
    { id: 'toolbar-1', kind: 'automations', label: 'Simulated actions', icon: 'mdi:home-automation',
      entities: [{ entity: 'automation.visible' }, { entity: 'script.demo_start' }] },
    { id: 'toolbar-2', kind: 'link', path: '/config/automation/dashboard#main' },
    { id: 'toolbar-7', kind: 'security', entities: [] },
    { id: 'toolbar-8', kind: 'settings' },
  ]);
  assert.deepEqual(generateDashboard({ toolbar: [] }, hass).views[0].cards[0].toolbar, []);
  assert.equal(generateDashboard({}, hass).views[0].cards[0].toolbar, undefined);
});

test('supports explicit native climate timer profiles and never generates two start adapters', () => {
  const timer = {
    simple_timer_entity: 'sensor.test_timer', simple_timer_target: 'input_boolean.test_timer_link',
    daily_usage_entity: 'sensor.test_usage',
    timer_entity: 'timer.demo_boiler', min_minutes: 10, max_minutes: 45, step_minutes: 5,
    presets: [45, 10, 10, 12, 50, '15'],
  };
  const climate = { entity: 'climate.test', kind: 'climate', timed: timer };
  assert.deepEqual(normalizeProfile(climate), {
    entity: 'climate.test', kind: 'climate',
    timed: { simple_timer_entity: 'sensor.test_timer', simple_timer_target: 'input_boolean.test_timer_link',
      daily_usage_entity: 'sensor.test_usage',
      presets: [45, 10], duration_field: 'duration', min_minutes: 10, max_minutes: 45, step_minutes: 5 },
  });
  const native = normalizeProfile({ ...climate, timed: { ...timer, start_script: 'script.demo_start' } });
  assert.equal(native.timed.start_script, 'script.demo_start');
  assert.equal(native.timed.timer_entity, 'timer.demo_boiler');
  assert.equal(native.timed.simple_timer_entity, undefined);
  assert.equal(native.timed.simple_timer_target, undefined);
  assert.equal(normalizeProfile({ ...climate, timed: { ...timer, simple_timer_target: 'switch.demo_boiler' } })
    .timed.simple_timer_target, undefined);
  assert.equal(normalizeProfile({ entity: 'switch.demo_boiler', kind: 'boiler', timed: timer })
    .timed.simple_timer_target, undefined);
  assert.deepEqual(normalizeProfile({ ...climate, timed: { ...timer, presets: [] } }).timed.presets, []);
  assert.equal(normalizeProfile({ ...climate, entity: 'switch.demo_boiler' }), null);
  assert.equal(normalizeProfile({ ...climate, timed: { simple_timer_entity: 'timer.wrong' } }).timed, undefined);
});


test('allows explicit linked-switch and fan-level adapters only for a named heater fan', () => {
  const profile = {
    entity: 'fan.demo_heater', kind: 'heater', level_steps: 9, level_read_entity: 'input_number.demo_level',
    timed: { simple_timer_entity: 'sensor.demo_timer', simple_timer_target: 'switch.demo_power' },
  };
  const heater = normalizeProfile(profile);
  assert.equal(heater.level_steps, 9);
  assert.equal(heater.level_read_entity, 'input_number.demo_level');
  assert.equal(heater.timed.simple_timer_target, 'switch.demo_power');
  assert.equal(normalizeProfile({ ...profile, level_steps: 13 }).level_steps, undefined);
  const withNumber = normalizeProfile({ ...profile, level_entity: 'number.demo_favorite' });
  assert.equal(withNumber.level_entity, 'number.demo_favorite');
  assert.equal(withNumber.level_steps, undefined);
  assert.equal(withNumber.level_read_entity, undefined);
  const withSwitch = normalizeProfile({ ...profile, entity: 'switch.demo_power' });
  assert.equal(withSwitch.level_steps, undefined);
  assert.equal(withSwitch.timed.simple_timer_target, undefined);
});

test('projects a level selection script only through a timed heater fan and its feedback helper', () => {
  const profile = { entity: 'fan.demo_step_heat', kind: 'heater', level_steps: 9,
    level_read_entity: 'input_number.demo_feedback', level_select_script: 'script.demo_select_level',
    timed: { simple_timer_entity: 'sensor.demo_heat_runtime', simple_timer_target: 'switch.demo_heat_relay' } };
  assert.equal(normalizeProfile(profile).level_select_script, profile.level_select_script);
  for (const invalid of [
    { level_read_entity: undefined }, { level_steps: 13 }, { level_select_script: 'switch.some_device' },
    { kind: 'boiler' }, { entity: 'switch.demo_heat_relay' }, { timed: { timer_entity: 'timer.demo_heating' } },
  ]) assert.equal(normalizeProfile({ ...profile, ...invalid }).level_select_script, undefined);

  const hass = home();
  hass.states[profile.entity] = { state: 'off', attributes: {} };
  hass.entities[profile.entity] = { area_id: 'studio' };
  const generated = generateDashboard({ profiles: [profile] }, hass).views[0].cards[0];
  const heater = generated.rooms.flatMap(room => room.entities).find(item => item.entity === profile.entity);
  assert.equal(heater.level_select_script, profile.level_select_script);
  assert.equal(heater.level_read_entity, profile.level_read_entity);
  assert.equal(heater.timed.simple_timer_target, profile.timed.simple_timer_target);
});

test('projects next-start level only for a heater fan with an explicitly linked Simple Timer switch', () => {
  const profile = { entity: 'fan.demo_step_heat', kind: 'heater', level_steps: 9,
    level_preselect_entity: 'input_number.demo_next_level',
    timed: { simple_timer_entity: 'sensor.demo_heat_runtime', simple_timer_target: 'switch.demo_heat_relay' } };
  for (const invalid of [
    { kind: 'boiler' }, { level_steps: 1 }, { level_entity: 'number.level' }, { level_preselect_entity: 'number.level' },
    { timed: { simple_timer_entity: 'sensor.demo_heat_runtime' } },
    { timed: { start_script: 'script.demo_start', timer_entity: 'timer.demo_heat_runtime' } },
  ]) assert.equal(normalizeProfile({ ...profile, ...invalid }).level_preselect_entity, undefined);
  const hass = home();
  hass.states[profile.entity] = { state: 'off', attributes: {} };
  hass.entities[profile.entity] = { area_id: 'studio' };
  hass.states[profile.level_preselect_entity] = { state: '5', attributes: {} };
  hass.entities[profile.level_preselect_entity] = { area_id: 'studio' };
  const entities = generateDashboard({ profiles: [profile] }, hass).views[0].cards[0].rooms.flatMap(room => room.entities);
  assert.equal(entities.find(item => item.entity === profile.entity).level_preselect_entity, profile.level_preselect_entity);
  assert.equal(entities.some(item => item.entity === profile.level_preselect_entity), false);
});

test('limits optional dashboard destinations and excludes cameras from automatic context', () => {
  const hass = home();
  const contextRows = [
    ['media_player.speaker', 'studio'], ['media_player.outside', 'lounge'], ['vacuum.floor', 'studio'],
    ['calendar.area', 'studio'], ['calendar.unassigned', undefined], ['vacuum.hidden', 'studio', 'user'],
    ['camera.private', 'studio'],
  ];
  for (const [entity, area_id, hidden_by] of contextRows) {
    hass.states[entity] = { state: 'idle', attributes: {} };
    hass.entities[entity] = { area_id, hidden_by };
  }
  const kinds = ['media', 'vacuum', 'calendar', 'sensors'];
  const { context, toolbar } = generateDashboard({
    area_ids: ['studio'],
    show_unassigned: false,
    toolbar: kinds.map(kind => ({ kind })),
  }, hass).views[0].cards[0];
  assert.deepEqual(context.media, [{ entity: 'media_player.speaker' }]);
  assert.deepEqual(context.vacuum, [{ entity: 'vacuum.floor' }]);
  assert.deepEqual(context.calendar, [{ entity: 'calendar.area' }]);
  assert.equal(Object.values(context).flat().some(item => item.entity.startsWith('camera.')), false);
  assert.deepEqual(toolbar.map(item => item.kind), kinds);
});

test('keeps curated toolbar sections ordered, visibly scoped and restricted to supported actions and presentation', () => {
  const hass = home();
  const known = ['weather.fixture', 'sun.sun', 'person.fixture', 'sensor.fixture', 'lock.fixture',
    'sensor.hidden', 'sensor.disabled', 'sensor.omitted'];
  for (const entity of known) {
    hass.states[entity] = { state: 'on', attributes: {} };
    hass.entities[entity] = {};
  }
  hass.entities['sensor.hidden'].hidden_by = 'user';
  hass.entities['sensor.disabled'].disabled_by = 'user';
  const { toolbar } = generateDashboard({
    hidden_entities: ['sensor.omitted'],
    toolbar: [
      { kind: 'security', entities: ['lock.fixture'], sections: [
        { id: 'curated', kind: 'actions', title: '', entities: [
          { entity: 'script.demo_start', name: ' Close fixtures ', icon: ' mdi:lock ', role: 'action',
            command: 'run_script', confirmation: ' Continue? ', service: 'homeassistant.restart' },
          { entity: 'script.demo_start', role: 'status' },
          { entity: 'lock.fixture', role: 'lock', command: 'run_script', confirmation: false },
          'sensor.hidden', 'sensor.disabled', 'sensor.omitted', 'sensor.missing',
        ] },
        { id: 'curated', kind: 'status', entities: [
          { entity: 'script.demo_start', role: 'action', command: 'run_script', confirmation: false },
          { entity: 'sensor.fixture', role: 'lock' },
          { entity: 'sensor.fixture', role: 'graph', graph_hours: 24 },
        ] },
        { kind: 'unknown', entities: ['script.demo_start'] },
      ] },
      { kind: 'weather', sections: [
        { kind: 'forecast', entities: [{ entity: 'weather.fixture', role: 'forecast' }] },
        { kind: 'sun', entities: [{ entity: 'sun.sun', role: 'sun' }] },
        { kind: 'readings', entities: [{ entity: 'sensor.fixture', role: 'graph', graph_hours: 337 }] },
      ] },
      { kind: 'presence', sections: [{ kind: 'people', entities: [{ entity: 'person.fixture', role: 'person' }] }] },
      { kind: 'energy', sections: [{ kind: 'electricity', entities: [] }, { kind: 'water', entities: [] }] },
    ],
  }, hass).views[0].cards[0];
  assert.deepEqual(toolbar[0].entities, [{ entity: 'lock.fixture' }]);
  assert.deepEqual(toolbar[0].sections, [
    { id: 'curated', kind: 'actions', title: '', entities: [
      { entity: 'script.demo_start', name: 'Close fixtures', icon: 'mdi:lock', role: 'action',
        command: 'run_script', confirmation: 'Continue?' },
      { entity: 'lock.fixture', role: 'lock' },
    ] },
    { id: 'section-2', kind: 'status', entities: [
      { entity: 'script.demo_start', role: 'action', command: 'run_script', confirmation: false },
      { entity: 'sensor.fixture', role: 'graph', graph_hours: 24 },
    ] },
  ]);
  assert.deepEqual(toolbar[1].sections.map(section => section.entities[0]), [
    { entity: 'weather.fixture', role: 'forecast' }, { entity: 'sun.sun', role: 'sun' },
    { entity: 'sensor.fixture', role: 'graph' },
  ]);
  assert.deepEqual(toolbar[2].sections[0].entities, [{ entity: 'person.fixture', role: 'person' }]);
  assert.deepEqual(toolbar[3].sections.map(section => section.kind), ['electricity', 'water']);
});
