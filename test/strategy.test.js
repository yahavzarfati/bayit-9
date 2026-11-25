import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CUSTOM_ROOM_PREFIX, dashboardRoomOptions, discoverOverviewEntities, discoverRooms, generateDashboard,
  normalizeOverviewDiscovery, normalizeProfile, normalizeShortcutDetailRoutes, roomPanelOptions,
  selectableRoomEntities, shortcutDetailPanels, suggestedDashboard,
} from '../src/strategy-model.js';
import { getDeviceModel } from '../src/device-control.mjs';

test('discovers only visible active lights from an opted-in Overview section', () => {
  const hass = home();
  const add = (entity, state, metadata = {}) => {
    hass.states[entity] = { state, attributes: { friendly_name: entity } };
    hass.entities[entity] = metadata;
  };
  add('light.first', 'on', { ai: 'other' });
  add('light.second', 'on');
  add('light.excluded', 'on');
  add('light.utility_helper', 'on');
  add('light.compact_hidden', 'on', { hidden: true });
  add('light.registry_hidden', 'on', { hidden_by: 'user' });
  add('light.registry_disabled', 'on', { disabled_by: 'user' });
  add('light.dashboard_hidden', 'on');
  add('light.gone', 'unavailable');
  add('light.inactive', 'off');
  add('switch.active', 'on');

  const discover = { domain: 'light', exclude_entities: ['light.excluded'], exclude_id_contains: ['helper'] };
  const section = { kind: 'status', discover };
  const card = generateDashboard({
    area_ids: ['studio'], show_unassigned: false, hidden_entities: ['light.dashboard_hidden'],
    toolbar: [{ kind: 'overview', sections: [section] }, { kind: 'security', sections: [{ ...section, entities: [] }] }],
  }, hass).views[0].cards[0];
  assert.deepEqual(card.toolbar[0].sections, [{ id: 'section-1', kind: 'status', filter: 'active', discover, entities: [] }]);
  assert.deepEqual(card.toolbar[1].sections, [{ id: 'section-1', kind: 'status', entities: [] }]);
  assert.deepEqual(card.hidden_entities, ['light.dashboard_hidden']);
  const hidden = new Set(card.hidden_entities);
  const visible = () => discoverOverviewEntities(discover, hass, hidden, 'en').map(({ entity, role }) => [entity, role]);
  assert.deepEqual(visible(), [['light.first', 'action'], ['light.second', 'action']]);
  add('light.new', 'on');
  assert.deepEqual(visible(), [['light.first', 'action'], ['light.new', 'action'], ['light.second', 'action']]);
  assert.deepEqual(discoverOverviewEntities(discover, { ...hass, entities: undefined }, hidden, 'en'), []);
  assert.equal(normalizeOverviewDiscovery({ ...discover, exclude_id_contains: ['.*'] }), undefined);
  assert.equal(normalizeOverviewDiscovery({ ...discover, exclude_entities: ['switch.active'] }), undefined);
  assert.equal(normalizeOverviewDiscovery({ domain: 'script' }), undefined);
});

test('Overview discovers active covers as status rows, honoring exclusions, visibility and closing preference', () => {
  const hass = home();
  const add = (entity, state, metadata = {}) => {
    hass.states[entity] = { state, attributes: { friendly_name: entity } };
    hass.entities[entity] = metadata;
  };
  add('cover.open', 'open');
  add('cover.opening', 'opening');
  add('cover.closing', 'closing');
  add('cover.stopped', 'stopped');
  add('cover.closed', 'closed');
  add('cover.unknown', 'unknown');
  add('cover.unavailable', 'unavailable');
  add('cover.omit', 'open');
  add('cover.test_helper', 'open');
  add('cover.hidden', 'open', { hidden_by: 'user' });
  add('cover.disabled', 'open', { disabled_by: 'user' });
  add('cover.dashboard_hidden', 'open');
  add('lock.open', 'open');
  const discover = { domain: 'cover', exclude_entities: ['cover.omit'], exclude_id_contains: ['helper'] };
  const section = { kind:'status', entities: ['cover.closed'], discover, include_closing: true };
  const hiddenEntities = ['cover.dashboard_hidden'];
  const { toolbar } = generateDashboard({
    hidden_entities: hiddenEntities,
    toolbar: [
      { kind: 'overview', sections: [section, { ...section, kind:'covers' }, { ...section, kind:'devices' }] },
      { kind: 'security', sections: [section] },
    ],
  }, hass).views[0].cards[0];
  assert.deepEqual(toolbar[0].sections.map(({ discover }) => discover), [discover, discover, undefined]);
  assert.equal(toolbar[0].sections[0].include_closing, true);
  assert.equal(toolbar[0].sections[0].filter, 'active');
  assert.equal(toolbar[0].sections[0].entities[0].entity, 'cover.closed');
  assert.equal(toolbar[1].sections[0].discover, undefined);
  assert.equal(normalizeOverviewDiscovery({ ...discover, exclude_entities:['light.outside'] }), undefined);
  const visible = closing => discoverOverviewEntities(discover, hass, new Set(hiddenEntities), 'en', closing)
    .map(({ entity, role }) => [entity, role]);
  assert.deepEqual(visible(false), ['open','opening','stopped'].map(name => ['cover.' + name, 'status']));
  add('cover.added_later', 'open');
  assert.deepEqual(visible(true), ['added_later','closing','open','opening','stopped'].map(name => ['cover.' + name, 'status']));
});

test('Overview group off is opt-in for active light discovery or selected light actions only', () => {
  const hass = home();
  const setting = { turn_off_active_lights: true };
  const status = { ...setting, kind:'status', filter:'active' };
  const light = { entity:'light.demo_lamp', role:'action' };
  const { toolbar } = generateDashboard({ toolbar: [
    {kind:'overview', sections: [
      {...status, discover:{domain:'light'}},
      {...status, entities:[light]},
      {...status, discover:{domain:'cover'}, entities:[light]},
      {...status, filter:undefined, entities:[light]},
      {...status, entities:[{...light,role:'status'}]},
      {...status, kind:'covers', entities:[light]},
      {...status, discover:{domain:'light'}, turn_off_active_lights:undefined},
    ]},
    {kind:'security', sections:[{...status,entities:[light]}]},
  ] }, hass).views[0].cards[0];
  assert.deepEqual(toolbar[0].sections.map(section => section.turn_off_active_lights),
    [true,true,undefined,undefined,undefined,undefined,undefined]);
  assert.equal(toolbar[1].sections[0].turn_off_active_lights, undefined);
});

test('normalizes only visible media remote targets on Media destinations', () => {
  const hass = home();
  Object.assign(hass.states, {
    'media_player.demo_transport': { state: 'off', attributes: {} },
    'media_player.demo_hidden_volume': { state: 'on', attributes: {} },
    'media_player.demo_screen': { state: 'standby', attributes: {} },
  });
  hass.entities ??= {};
  hass.entities['media_player.demo_hidden_volume'] = { hidden: true };
  const card = generateDashboard({ toolbar: [
    { kind: 'media', media_remote: { transport_entity: 'media_player.demo_transport',
      volume_entity: 'media_player.demo_hidden_volume', allow_standby: true, command: 'ignored' } },
    { kind: 'vacuum', media_remote: { transport_entity: 'media_player.demo_transport', power_entity: 'media_player.demo_screen' } },
    { kind: 'media', media_remote: { transport_entity: 'light.living_room', volume_entity: 'media_player.missing',
      power_entity: 'media_player.demo_hidden_volume' } },
    { kind: 'media', media_remote: { power_entity: 'media_player.demo_screen' } },
    { kind: 'media', media_remote: { power_entity: 'switch.demo_screen' } },
  ] }, hass).views[0].cards[0];
  assert.deepEqual(card.toolbar.map(item => item.media_remote), [
    { transport_entity: 'media_player.demo_transport', allow_standby: true }, undefined, undefined,
    { power_entity: 'media_player.demo_screen', allow_standby: false }, undefined,
  ]);
});

test('keeps closing covers opt-in and leaves legacy active and other toolbar sections alone', () => {
  const cover = { kind: 'covers', filter: 'active', entities: [] };
  const chosen = { ...cover, include_closing: true };
  const inactive = { ...chosen, filter: undefined };
  const card = generateDashboard({ toolbar: [
    { kind: 'overview', sections: [cover, chosen, inactive] }, { kind: 'security', sections: [chosen] },
  ] }, home()).views[0].cards[0];
  const [legacy, explicit, unfiltered] = card.toolbar[0].sections;
  assert.deepEqual(legacy, { id: 'section-1', ...cover });
  assert.deepEqual(explicit, { id: 'section-2', ...chosen });
  assert.deepEqual(unfiltered, { id: 'section-3', kind: 'covers', entities: [] });
  assert.deepEqual(card.toolbar[1].sections, [{ id: 'section-1', ...cover }]);
  assert.equal(card.hidden_entities, undefined);
});

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

test('preserves a bounded unreported swing label only on explicit climate profiles', () => {
  const entity = 'climate.demo_air';
  const kind = 'climate';
  const profile = { entity, kind, unreported_swing_mode: 'default' };
  assert.deepEqual(normalizeProfile(profile), profile);
  for (const unreported_swing_mode of [true, '', ' default ', 'a'.repeat(81), 'default\u0000']) {
    assert.deepEqual(normalizeProfile({ entity, kind, unreported_swing_mode }), { entity, kind });
  }
  assert.deepEqual(normalizeProfile({ ...profile, kind: 'heater' }), { entity, kind: 'heater' });
  assert.equal(normalizeProfile({ ...profile, entity: 'switch.demo_heat' }), null);
  const hass = home();
  delete hass.entities[entity].hidden_by;
  const [room] = discoverRooms({ area_ids: ['lounge'], show_unassigned: false, profiles: [profile] }, hass, 'en');
  assert.deepEqual(room.entities.find(item => item.entity === entity), profile);
});

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

test('projects a scoped hold destination only to an active shortcut and an admitted screen', () => {
  const hass = home();
  const lock = 'lock.example_lock';
  const cover = 'cover.example_cover';
  const hidden = 'cover.example_hidden';
  const sensor = 'sensor.example_status';
  const washer = 'switch.example_washer';
  for (const entity of [lock, cover, hidden, sensor, washer]) {
    hass.states[entity] = { state: 'unavailable', attributes: {} };
    hass.entities[entity] = { area_id: 'studio' };
  }
  const excluded = 'bayit_room_den';
  const config = { area_ids: ['studio', excluded], show_unassigned: false, hidden_entities: [hidden],
    room_shortcuts: { studio: [lock, cover, hidden, sensor, washer, 'light.demo_lamp'] },
    room_overrides: {
      studio: { entities: [lock, cover, hidden, sensor, washer, 'light.demo_lamp'], read_only_entities: [sensor],
        shortcut_no_details: [washer], shortcut_detail_routes: {
          [lock]: 'panel:security-panel', [cover]: 'native', [hidden]: 'native', [sensor]: 'native',
          [washer]: 'panel:security-panel', 'light.demo_lamp': 'panel:settings-only', 'fan.not_a_member': 'native',
        } },
      [excluded]: { name: 'Den', entities: [cover] },
    },
    toolbar: [
      { id: 'security-panel', kind: 'security' },
      { id: 'settings-only', kind: 'devices', placement: 'settings' },
      { id: 'settings', kind: 'settings' },
      { id: 'linked-media', kind: 'media', placement: 'linked' },
      { id: 'external', kind: 'link', path: '/elsewhere/screen' },
    ],
  };
  const project = () => generateDashboard(config, hass).views[0].cards[0];
  const configBefore = structuredClone(config);
  const card = project();
  assert.deepEqual(card.rooms[0].shortcut_detail_routes, { [lock]: 'panel:security-panel', [cover]: 'native' });
  assert.deepEqual(card.rooms[0].shortcut_no_details, [washer]);
  assert.equal(card.rooms[1].shortcut_detail_routes, undefined);
  assert.deepEqual(config, configBefore);
  assert.deepEqual(shortcutDetailPanels(card.toolbar).map(panel => panel.id), ['security-panel', 'linked-media']);
  assert.deepEqual(shortcutDetailPanels([...card.toolbar, { id: 'security-panel', kind: 'settings' }])
    .map(panel => panel.id), ['linked-media']);

  config.toolbar.shift();
  assert.deepEqual(project().rooms[0].shortcut_detail_routes, { [cover]: 'native' });
  config.room_shortcuts.studio = [lock];
  assert.equal(project().rooms[0].shortcut_detail_routes, undefined);
  assert.deepEqual(normalizeShortcutDetailRoutes(card.rooms[0], [cover, 'native'], []), {});
});

test('scopes the details opt-out to an active ordinary switch shortcut', () => {
  const hass = home();
  const washer = 'switch.demo_washer';
  const extra = 'bayit_room_laundry';
  const ordinary = 'switch.demo_ordinary';
  const hidden = 'switch.demo_hidden';
  hass.states[washer] = hass.states[ordinary] = hass.states[hidden] = { state: 'off', attributes: {} };
  hass.entities[washer] = hass.entities[ordinary] = { area_id: 'studio' };
  hass.entities[hidden] = { area_id: 'studio', disabled_by: 'user' };
  const config = { area_ids: ['studio', extra], show_unassigned: false, room_shortcuts: { studio: [washer, 'light.demo_lamp', ordinary] },
    room_overrides: {
      studio: { entities: [washer, ordinary, hidden, 'light.demo_lamp'], read_only_entities: [ordinary],
        panel_hidden_entities: [washer], shortcut_no_details: [washer, washer, hidden, ordinary, 'light.demo_lamp'] },
      [extra]: { name: 'Laundry', entities: [washer] },
    } };
  const [studio, laundry] = discoverRooms(config, hass, 'en');
  assert.deepEqual(studio.shortcut_no_details, [washer]);
  assert.deepEqual(studio.shortcuts, [washer, 'light.demo_lamp', ordinary]);
  assert.deepEqual(studio.panel_hidden_entities, [washer]);
  assert.equal(laundry.shortcut_no_details, undefined);
  config.room_shortcuts.studio = [];
  assert.equal(discoverRooms(config, hass, 'en')[0].shortcut_no_details, undefined);
  delete config.room_shortcuts.studio;
  assert.deepEqual(discoverRooms(config, hass, 'en')[0].shortcut_no_details, [washer]);
});

test('routes only active shortcut details to another visible device in the same room', () => {
  const hass = home();
  const source = 'light.demo_lamp';
  const dimmer = 'light.demo_dimmer';
  const extra = 'bayit_room_den';
  const heater = 'switch.demo_boiler';
  const readOnly = 'sensor.test_template_without_registry';
  hass.states[dimmer] = { state: 'off', attributes: { supported_color_modes: ['color_temp'] } };
  hass.entities[dimmer] = { area_id: 'studio' };
  const targetMap = {
    [source]: dimmer,
    [dimmer]: dimmer,
    [heater]: dimmer,
    'fan.demo_fan': dimmer,
    [readOnly]: 'calendar.demo_schedule',
  };
  const config = {
    area_ids: ['studio', extra], show_unassigned: false,
    room_shortcuts: { studio: [source, heater, readOnly, dimmer], [extra]: [source] },
    room_overrides: {
      studio: {
        entities: [source, dimmer, heater, readOnly, 'fan.demo_fan', 'climate.demo_air'],
        read_only_entities: [readOnly], shortcut_no_details: [heater],
        shortcut_detail_entities: targetMap,
      },
      [extra]: { name: 'Den', entities: [source], shortcut_detail_entities: { [source]: dimmer } },
    },
  };
  const discover = () => discoverRooms(config, hass, 'en');
  const [studio, den] = discover();
  assert.deepEqual(studio.shortcut_detail_entities, { [source]: dimmer });
  assert.deepEqual(studio.shortcut_no_details, [heater]);
  assert.equal(den.shortcut_detail_entities, undefined);
  assert.equal(targetMap[heater], dimmer);

  const override = config.room_overrides.studio;
  override.shortcut_detail_entities = { [source]: { entity: dimmer }, [readOnly]: 'climate.demo_air' };
  assert.equal(discover()[0].shortcut_detail_entities, undefined);
  override.shortcut_detail_entities[source] = readOnly;
  assert.deepEqual(discover()[0].shortcut_detail_entities, { [source]: readOnly });
  assert.equal(discover()[0].entities.find(item => item.entity === readOnly).role, 'status');
  config.hidden_entities = [readOnly];
  assert.equal(discover()[0].shortcut_detail_entities, undefined);
  delete config.hidden_entities;

  override.shortcut_detail_entities = { [source]: dimmer };
  delete config.room_shortcuts.studio;
  assert.deepEqual(discover()[0].shortcut_detail_entities, { [source]: dimmer });
  config.room_shortcuts.studio = [];
  assert.equal(discover()[0].shortcut_detail_entities, undefined);
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

test('only an opted-in timed boiler projects the combined timer and detail layout', () => {
  const profile = {
    entity: 'switch.demo_boiler', kind: 'boiler', boiler_timer_with_details: true,
    timed: { simple_timer_entity: 'sensor.demo_timer' },
  };
  const projected = discoverRooms({ profiles: [profile] }, home(), 'en')
    .flatMap(room => room.entities).find(entity => entity.entity === profile.entity);
  assert.equal(projected.boiler_timer_with_details, true);
  assert.equal(normalizeProfile({ ...profile, timed: { timer_entity: 'timer.demo_boiler' } })
    .boiler_timer_with_details, true);
  assert.equal(normalizeProfile({ ...profile, kind: 'heater' }).boiler_timer_with_details, undefined);
  assert.equal(normalizeProfile({ ...profile, timed: { start_script: 'script.demo_start' } })
    .boiler_timer_with_details, undefined);
  assert.equal(normalizeProfile({ ...profile, timed: { simple_timer_entity: 'input_boolean.demo_timer' } })
    .boiler_timer_with_details, undefined);
  assert.equal(normalizeProfile({ ...profile, boiler_timer_with_details: 'true' }).boiler_timer_with_details, undefined);
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

test('keeps selected native rooms even without eligible devices and distinguishes empty selection from automatic', () => {
  const hass = home();
  hass.areas.spare = { area_id: 'spare', name: 'Spare' };
  hass.areas.readings = { area_id: 'readings', name: 'Readings' };
  hass.entities['sensor.demo_reading'] = { area_id: 'readings' };
  hass.states['sensor.demo_reading'] = { state: '19', attributes: {} };
  const config = { show_unassigned: false, discovery_mode: 'controls' };
  const rooms = selection => discoverRooms({ ...config, ...selection }, hass, 'en');
  assert.ok(!rooms({ area_ids: [] }).some(room => ['spare', 'readings'].includes(room.id)));
  assert.deepEqual(rooms({ area_ids: ['readings', 'spare', 'studio'] }).map(room => room.id), ['studio']);
  assert.deepEqual(rooms({ room_selection: 'manual', area_ids: ['readings', 'spare', 'studio'] }).map(room => room.id),
    ['readings', 'spare', 'studio']);
  assert.deepEqual(rooms({ room_selection: 'manual', area_ids: ['readings', 'spare'] }).map(room => room.entities), [[], []]);
  assert.ok(rooms({ area_ids: [] }).some(room => room.id === 'studio'));
  assert.deepEqual(rooms({ room_selection: 'manual', area_ids: [] }), []);
  assert.deepEqual(rooms({ room_selection: 'auto', area_ids: ['spare'] }), rooms({ area_ids: [] }));
  assert.deepEqual(rooms({ room_selection: 'manual', area_ids: [], show_unassigned: true }).map(room => room.id),
    ['bayit9_unassigned']);
  const moved = rooms({ room_selection: 'manual', area_ids: ['studio', 'bayit_room_moved'],
    room_overrides: { studio: { name: 'Workshop' }, bayit_room_moved: { name: 'Elsewhere', entities: ['fan.demo_fan'] } } });
  assert.equal(moved[0].name, 'Workshop');
  assert.deepEqual(moved[0].entities, []);
  assert.ok(moved[1].entities.some(entity => entity.entity === 'fan.demo_fan'));
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

test('scopes optional climate preset shortcuts to visible, writable room thermostats', () => {
  const hass = home();
  const thermostat = 'climate.demo_thermostat';
  const readOnly = 'climate.demo_status';
  const hidden = 'climate.demo_hidden';
  for (const entity of [thermostat, readOnly, hidden]) {
    hass.states[entity] = { state: 'off', attributes: { supported_features: 16, preset_modes: ['eco', 'none'] } };
  }
  const shortcut = { preset: 'none', label: 'SE', icon: 'mdi:leaf', highlight_when: 'eco' };
  const extra = 'bayit_room_preset_test';
  const section = { kind: 'climate', entities: [thermostat, readOnly, hidden] };
  const rooms = discoverRooms({ area_ids: ['studio', extra], show_unassigned: false, room_overrides: {
    studio: {
      entities: [thermostat, readOnly, hidden, 'light.demo_lamp'], sections: [section],
      read_only_entities: [readOnly], panel_hidden_entities: [hidden],
      climate_preset_shortcuts: { [thermostat]: shortcut, [readOnly]: shortcut, [hidden]: shortcut,
        'light.demo_lamp': shortcut, 'climate.missing': shortcut },
    },
    [extra]: { name: 'Second room', entities: [thermostat] },
  } }, hass, 'en');
  const [owner, other] = rooms;
  const selected = owner.entities.find(item => item.entity === thermostat);
  assert.deepEqual(selected.room_climate_preset, shortcut);
  assert.deepEqual(owner.sections[0].entities[0].room_climate_preset, shortcut);
  assert.equal(owner.entities.filter(item => item.room_climate_preset).length, 1);
  assert.equal(other.entities[0].room_climate_preset, undefined);
});

test('projects explicit names and blank captions only onto visible members of the configured room', () => {
  const hass = home();
  const thermostat = 'climate.room_fixture';
  const lamp = 'light.demo_lamp';
  const fan = 'fan.demo_fan';
  hass.states[thermostat] = { state: 'off', attributes: { friendly_name: 'Native thermostat' } };
  hass.entities[thermostat] = { area_id: 'studio' };
  const room = 'bayit_room_extra';
  const cfg = {
    room_selection: 'manual', area_ids: ['studio', room], show_unassigned: false,
    profiles: [{ entity: thermostat, kind: 'climate', name: 'Dedicated thermostat' }],
    room_shortcuts: { studio: [lamp] },
    room_overrides: {
      studio: {
        entities: [lamp, thermostat, fan],
        entity_names: { [lamp]: '  Workshop light  ', [thermostat]: '', [fan]: '  ', 'switch.demo_missing': 'Hidden member' },
        sections: [{ kind: 'lights', entities: [lamp] }, { kind: 'climate', entities: [thermostat] }],
      },
      [room]: { name: 'Spare', entities: [lamp], entity_names: { [lamp]: 'Spare light' } },
    },
  };
  const original = structuredClone({ cfg, hass });
  const [studio, spare] = discoverRooms(cfg, hass, 'en');
  assert.deepEqual(studio.entities.map(item => [item.entity, item.room_name]),
    [[lamp, 'Workshop light'], [thermostat, ''], [fan, undefined]]);
  assert.deepEqual(studio.sections.flatMap(section => section.entities.map(item => item.room_name)), ['Workshop light', '']);
  assert.deepEqual(studio.shortcuts, [lamp]);
  assert.equal(spare.entities[0].room_name, 'Spare light');
  assert.equal(getDeviceModel(studio.entities[1], hass.states).name, 'Dedicated thermostat');
  assert.equal(studio.entities[0].name, spare.entities[0].name);
  assert.deepEqual({ cfg, hass }, original);
});

test('scopes room panel exclusions to current members without changing dashboard access', () => {
  const hass = home();
  const lamp = 'light.demo_lamp';
  const fan = 'fan.demo_fan';
  const disabled = 'light.disabled';
  const hidden = 'light.hidden';
  hass.states[disabled] = hass.states[hidden] = { state: 'on', attributes: {} };
  hass.entities[disabled] = { area_id: 'studio', disabled_by: 'user' };
  hass.entities[hidden] = { area_id: 'studio', hidden_by: 'user' };
  const den = CUSTOM_ROOM_PREFIX + 'den';
  const config = {
    area_ids: ['studio', den], show_unassigned: false,
    overview_entities: [lamp], room_shortcuts: { studio: [lamp, fan] },
    room_overrides: {
      studio: {
        entities: [lamp, fan, disabled, hidden],
        sections: [{ kind: 'lights', entities: [lamp] }],
      },
      [den]: { name: 'Den', entities: [lamp] },
    },
  };
  const withoutExclusions = generateDashboard(config, hass).views[0].cards[0];
  config.room_overrides.studio.panel_hidden_entities = [lamp, fan, lamp, disabled, hidden, 'light.missing', 1];
  const card = generateDashboard(config, hass).views[0].cards[0];
  assert.deepEqual(card.rooms[0].panel_hidden_entities, [lamp, fan]);
  delete card.rooms[0].panel_hidden_entities;
  assert.deepEqual(card, withoutExclusions);

  const automatic = discoverRooms({ room_overrides: { studio: { panel_hidden_entities: [fan, 'calendar.demo_schedule'] } } },
    hass, 'en').find(room => room.id === 'studio');
  assert.deepEqual(automatic.panel_hidden_entities, [fan]);
  assert.ok(automatic.entities.some(item => item.entity === fan));
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

test('keeps automatic room membership independent from section layout without changing legacy/manual membership', () => {
  const hass = home();
  hass.entities['light.demo_lamp'] = {area_id:'studio'};
  for (const [entity, area_id] of [['light.later','studio'], ['light.foreign','lounge'], ['light.hidden','studio']]) {
    hass.states[entity] = {state: 'off', attributes: {friendly_name: entity}};
    hass.entities[entity] = {area_id, ...(entity === 'light.hidden' && {hidden_by:'user'})};
  }
  const sections = [{kind:'lights', title:'Custom fixtures', entities:['light.demo_lamp','light.foreign','light.hidden']}];
  const build = override => discoverRooms({
    room_selection:'manual', area_ids:['studio','lounge'], show_unassigned:false,
    room_overrides:{studio:{sections,...override}},
  }, hass, 'en');
  const [automatic, autoLounge] = build({device_selection:'auto'});
  assert.ok(automatic.entities.some(item => item.entity === 'light.later'));
  assert.deepEqual(automatic.sections[0].entities.map(item => item.entity), ['light.demo_lamp']);
  assert.equal(automatic.sections[0].title,'Custom fixtures');
  assert.ok(autoLounge.entities.some(item => item.entity === 'light.foreign'));
  assert.equal(build({ device_selection:'auto', entities:[] })[0].entities.length, automatic.entities.length);
  const [legacy, legacyLounge] = build({});
  assert.deepEqual(legacy.entities.map(item => item.entity), ['light.demo_lamp','light.foreign']);
  assert.ok(!legacyLounge.entities.some(item => item.entity === 'light.foreign'));
  assert.deepEqual(build({entities:[]})[0].entities,[]);
  assert.deepEqual(build({entities:['light.foreign']})[0].entities.map(item => item.entity), ['light.foreign']);
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
  assert.equal(normalizeProfile({ ...climate, timed: { ...timer, daily_usage_entity: 'sensor.test_timer',
    allow_daily_usage_reset: true } }).timed.allow_daily_usage_reset, true);
  assert.equal(normalizeProfile({ ...climate, timed: { ...timer, daily_usage_entity: 'sensor.separate', allow_daily_usage_reset: true } })
    .timed.allow_daily_usage_reset, undefined);
  assert.equal(normalizeProfile({ ...climate, timed: { timer_entity: 'timer.native', allow_daily_usage_reset: true } })
    .timed.allow_daily_usage_reset, undefined);
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

test('only an individual Sensors history graph can link to an existing Vacuum panel', () => {
  const hass = home();
  hass.states['sensor.fixture'] = { state: '25', attributes: {} };
  hass.entities['sensor.fixture'] = {};
  const graph = { entity: 'sensor.fixture', role: 'graph', graph_hours: 168, vacuum_panel_id: 'robot' };
  const config = {
    toolbar: [
      { kind: 'sensors', sections: [
        { kind: 'readings', entities: [graph] },
        { kind: 'readings', entities: [{ ...graph, vacuum_panel_id: 'media' }] },
        { kind: 'series', entities: [graph] },
        { kind: 'readings', entities: [{ ...graph, role: 'status' }] },
      ] },
      { kind: 'energy', sections: [{ kind: 'readings', entities: [graph] }] },
      { kind: 'media', id: 'media' },
      { kind: 'vacuum', id: 'robot' },
    ],
  };
  const makeToolbar = () => generateDashboard(config, hass).views[0].cards[0].toolbar;
  const toolbar = makeToolbar();
  assert.deepEqual(toolbar[0].sections[0].entities[0], graph);
  assert.deepEqual(toolbar[0].sections.slice(1).map(section => section.entities[0].vacuum_panel_id),
    [undefined, undefined, undefined]);
  assert.equal(toolbar[1].sections[0].entities[0].vacuum_panel_id, undefined);
  config.toolbar.pop();
  assert.equal(makeToolbar()[0].sections[0].entities[0].vacuum_panel_id, undefined);
});

test('light toggle tiles are explicit and scoped to visible lights in Devices sections', () => {
  const hass = home();
  const tile = entity => ({ entity, role: 'light_tile' });
  const { toolbar } = generateDashboard({
    hidden_entities: ['light.hidden_fixture'],
    toolbar: [
      { kind: 'devices', placement: 'settings', sections: [
        { kind: 'devices', entities: [
          { ...tile('light.demo_lamp'), confirmation: 'Control this lamp?' },
          tile('light.hidden_fixture'), tile('switch.demo_heater'),
        ] },
        { kind: 'status', entities: [tile('light.demo_lamp')] },
      ] },
      { kind: 'security', sections: [{ kind: 'devices', entities: [tile('light.demo_lamp')] }] },
    ],
  }, { ...hass, states: { ...hass.states, 'light.hidden_fixture': { state: 'off', attributes: {} } } }).views[0].cards[0];
  assert.deepEqual(toolbar[0].sections.map(section => section.entities), [[{
    entity: 'light.demo_lamp', name: 'מנורה', role: 'light_tile', confirmation: 'Control this lamp?',
  }], []]);
  assert.deepEqual(toolbar[1].sections[0].entities, []);
});

test('linked placement is restricted to Media and Vacuum while both remain room panel choices', () => {
  const config = { toolbar: [
    { id: 'screen-media', kind: 'media', label: 'TV', placement: 'linked' },
    { id: 'screen-vacuum', kind: 'vacuum', label: 'Robot', placement: 'linked' },
    { id: 'screen-weather', kind: 'weather', placement: 'linked' },
    { id: 'screen-calendar', kind: 'calendar', placement: 'settings' },
    { id: 'main-appearance', kind: 'settings', placement: 'settings' },
  ] };
  const hass = home();
  const { toolbar } = generateDashboard(config, hass).views[0].cards[0];
  assert.deepEqual(toolbar.map(entry => entry.placement), ['linked', 'linked', undefined, 'settings', undefined]);
  assert.deepEqual(roomPanelOptions(config, hass), [
    { id: 'screen-media', label: 'TV', kind: 'media' },
    { id: 'screen-vacuum', label: 'Robot', kind: 'vacuum' },
  ]);
});

test('room popup position applies only to opted-in Devices screens in Settings', () => {
  const { toolbar } = generateDashboard({
    toolbar: [
      { kind: 'devices', placement: 'settings', popup_position: 'room' },
      { kind: 'devices', popup_position: 'room' },
      { kind: 'devices', placement: 'settings', popup_position: 'unknown' },
      { kind: 'weather', placement: 'settings', popup_position: 'room' },
    ],
  }, home()).views[0].cards[0];
  assert.deepEqual(toolbar.map(entry => entry.popup_position), ['room', undefined, undefined, undefined]);
});

test('only Devices and Overview status sections retain the compact layout without changing entity roles', () => {
  const hass = home();
  hass.states['lock.fixture'] = { state: 'locked', attributes: {} };
  const status = { kind: 'status', layout: 'compact', entities: [{ entity: 'lock.fixture', role: 'status' }] };
  const { toolbar } = generateDashboard({
    toolbar: [
      { kind: 'devices', sections: [status, { ...status, kind: 'devices' }] },
      { kind: 'overview', sections: [status, { ...status, layout: undefined }] },
      { kind: 'security', sections: [status] },
    ],
  }, hass).views[0].cards[0];
  assert.deepEqual(toolbar.map(item => item.sections.map(section => section.layout)),
    [['compact', undefined], ['compact', undefined], [undefined]]);
  assert.ok(toolbar.every(item => item.sections.every(section => section.entities[0].role === 'status')));
});

test('compact readings are opt-in for Weather readings and preserve graph configuration', () => {
  const hass = home();
  const sensor = 'sensor.fixture_outside';
  hass.states[sensor] = { state: '21.2', attributes: { unit_of_measurement: '°C' } };
  hass.entities[sensor] = {};
  const readings = { kind: 'readings', layout: 'readings-list', entities: [
    { entity: sensor, name: 'Outside', icon: 'mdi:thermometer', role: 'status' },
  ] };
  const graph = { entity: sensor, role: 'graph', graph_hours: 24 };
  const { toolbar } = generateDashboard({ toolbar: [
    { kind: 'weather', sections: [readings, { ...readings, kind: 'sun' },
      { kind: 'readings', entities: [graph] }] },
    { kind: 'energy', sections: [readings] },
  ] }, hass).views[0].cards[0];
  const [compact, sun, history, electricity] = toolbar.flatMap(entry => entry.sections);
  assert.deepEqual([compact.layout, sun.layout, history.layout, electricity.layout],
    ['readings-list', undefined, undefined, undefined]);
  assert.equal(compact.entities[0].name, 'Outside');
  assert.equal(compact.entities[0].icon, 'mdi:thermometer');
  assert.equal(compact.entities[0].role, 'status');
  assert.equal(history.entities[0].role, 'graph');
  assert.equal(history.entities[0].graph_hours, 24);
});

test('an optional Sensors comparison retains only valid graph colors and bounded options', () => {
  const hass = home();
  const sensors = ['inside', 'outside', 'hidden'].map(name => 'sensor.fixture_' + name);
  for (const entity of sensors) hass.states[entity] = { state: '20', attributes: { unit_of_measurement: '°C' } };
  hass.entities[sensors[2]] = { hidden_by:'user' };
  const [inside, outside, hidden] = sensors;
  const entities = [
    { entity: inside, role:'graph', graph_hours:24, series_color:'#397bd6' },
    { entity: outside, role:'status', series_color:'#228A60' },
    { entity: hidden, role:'graph', series_color:'#F4C95D' },
  ];
  const series = { kind:'series', entities, comparison:{enabled:true, hours:500, bucket_minutes:3} };
  const { toolbar } = generateDashboard({ toolbar:[
    { kind:'sensors', sections:[series, { ...series, kind:'readings' }, { ...series, comparison:{enabled:false} }] },
    { kind:'weather', sections:[series] },
  ] }, hass).views[0].cards[0];
  const [active, ...legacy] = toolbar.flatMap(entry => entry.sections);
  assert.deepEqual(active.comparison, { enabled:true, hours:24, bucket_minutes:30 });
  assert.deepEqual(active.entities.map(item => [item.entity,item.series_color]), [[inside,'#397BD6'],[outside,undefined]]);
  assert.equal(active.entities[0].graph_hours,24);
  for (const section of legacy) {
    assert.equal(section.comparison,undefined);
    assert.ok(section.entities.every(item => item.series_color === undefined));
  }
});

test('Security readouts require the explicit status layout and supported source entity and state types', () => {
  const hass = home();
  const binary = 'binary_sensor.fixture_signal';
  const sensor = 'sensor.fixture_reading';
  const activeLock = 'lock.fixture';
  const hidden = 'sensor.fixture_hidden';
  for (const [entity, state] of [[binary, 'unknown'], [sensor, 'unavailable'], [activeLock, 'locked'], [hidden, 'safe']]) {
    hass.states[entity] = { state, attributes: {} };
    hass.entities[entity] = {};
  }
  hass.entities[hidden].hidden_by = 'user';
  const readouts = { kind: 'status', layout: 'readouts', entities: [
    { entity: binary, role: 'status', readout: { state_labels: {
      on: ' Active ', off: 'Quiet', unknown: 'Clear', unavailable: 'Clear', safe: 'Clear',
    }, danger_on: true, unit: 's', extra: true } },
    { entity: sensor, readout: { state_labels: {
      safe: 'Cle\u202ear', ok: ' Ready ', on: 'Active', unknown: 'Ready',
    }, danger_on: true, unit: ' seconds ' } },
    { entity: activeLock, role: 'lock', readout: { danger_on: true } },
    { entity: hidden, readout: { unit: 's' } },
  ] };
  const card = generateDashboard({ toolbar: [
    { kind: 'security', sections: [readouts, { ...readouts, kind: 'readings' }] },
    { kind: 'overview', sections: [readouts] },
    { kind: 'security', sections: [{ ...readouts, layout: undefined }, { ...readouts, entities: [
      { entity: binary, role: 'action', readout: { danger_on: true } },
      { entity: sensor, readout: { unit: 'a'.repeat(13), state_labels: { ok: 'a'.repeat(49) } } },
    ] }] },
  ] }, hass).views[0].cards[0];
  const allSections = card.toolbar.flatMap(entry => entry.sections);
  assert.deepEqual(allSections.map(section => section.layout), ['readouts', undefined, undefined, undefined, 'readouts']);
  assert.deepEqual(allSections[0].entities.map(item => ({ id: item.entity, role: item.role, readout: item.readout })), [
    { id: binary, role: 'status', readout: { state_labels: { on: 'Active', off: 'Quiet' }, danger_on: true } },
    { id: sensor, role: undefined, readout: { state_labels: { ok: 'Ready' }, unit: 'seconds' } },
    { id: activeLock, role: 'lock', readout: undefined },
  ]);
  assert.ok(allSections.slice(1).flatMap(section => section.entities).every(item => !Object.hasOwn(item, 'readout')));
});

test('Vacuum readouts retain only validated settings on explicit readings sections', () => {
  const hass = home();
  for (const entity of ['sensor.fixture_state', 'sensor.fixture_invalid', 'select.fixture_floor', 'binary_sensor.fixture_dock',
    'switch.fixture_power', 'sensor.fixture_graph']) {
    hass.states[entity] = { state: 'unknown', attributes: {} };
    hass.entities[entity] = {};
  }
  const section = { kind: 'readings', layout: 'readouts', entities: [
    { entity: 'sensor.fixture_state', role: 'status', readout: { state_labels: {
      Docked: ' At dock ', docked: 'On dock', 'Current room': ' Office ', 'malformed\u202ekey': 'Hidden',
      unknown: 'Ready', Unavailable: 'Ready', harmless: 'unsafe\nlabel', 'spaced ': 'Trailing',
    }, precision: 0, unit: ' % ', danger_on: true } },
    { entity: 'sensor.fixture_invalid', readout: { state_labels: ['Invalid'], precision: 1.5, unit: 'a'.repeat(13) } },
    { entity: 'select.fixture_floor', role: 'status', readout: { state_labels: { Upper: 'Second floor' }, precision: 2, unit: 'h' } },
    { entity: 'binary_sensor.fixture_dock', readout: { state_labels: { on: 'In use', error: 'Error' }, precision: 3, danger_on: true } },
    { entity: 'switch.fixture_power', role: 'status', readout: { state_labels: { off: 'Off' } } },
    { entity: 'sensor.fixture_graph', role: 'graph', readout: { unit: 'h' } },
  ] };
  const { toolbar } = generateDashboard({ toolbar: [
    { kind: 'vacuum', sections: [section, { ...section, layout: undefined }, { ...section, kind: 'status' }] },
    { kind: 'sensors', sections: [section] },
  ] }, hass).views[0].cards[0];
  const [compact, ...others] = toolbar.flatMap(entry => entry.sections);
  assert.equal(compact.layout, 'readouts');
  assert.deepEqual(compact.entities.map(item => item.readout), [
    { state_labels: { Docked: 'At dock', docked: 'On dock', 'Current room': 'Office' }, precision: 0, unit: '%' },
    undefined, { state_labels: { Upper: 'Second floor' } }, { state_labels: { on: 'In use' } }, undefined, undefined,
  ]);
  assert.ok(others.every(section => section.layout === undefined && section.entities.every(item => item.readout === undefined)));
});

test('only selected vacuum action buttons can retain one-tap program behavior', () => {
  const hass = home();
  const item = { entity: 'button.fixture_clean', role: 'action', command: 'vacuum_program', confirmation: 'Start now?' };
  const helper = { ...item, entity: 'input_button.fixture_clean' };
  for (const device of [item, helper]) hass.states[device.entity] = { state: 'unknown', attributes: {} };
  const actions = { kind: 'actions', entities: [item, helper] };
  const { toolbar } = generateDashboard({
    toolbar: [
      { kind: 'vacuum', sections: [actions, { ...actions, kind: 'status' }] },
      { kind: 'automations', sections: [actions] },
    ],
  }, hass).views[0].cards[0];
  assert.deepEqual(toolbar.map(entry => entry.sections.map(section => section.entities.map(device => device.command))),
    [[['vacuum_program', undefined], [undefined, undefined]], [[undefined, undefined]]]);
  assert.equal(toolbar[0].sections[0].entities[0].confirmation, 'Start now?');
});

test('script toggles stay scoped to explicit Automations actions and preserve confirmation settings', () => {
  const item = { entity: 'script.demo_start', role: 'action', command: 'toggle_script', confirmation: false };
  const section = (kind, entities) => ({ kind, entities });
  const [automations, security] = generateDashboard({ toolbar: [
    { kind: 'automations', sections: [
      section('actions', [item, { ...item, entity: 'switch.demo_boiler' }]),
      section('actions', [{ ...item, role: 'status' }]),
      section('status', [item]),
    ] },
    { kind: 'security', sections: [section('actions', [item])] },
  ] }, home()).views[0].cards[0].toolbar;
  assert.deepEqual(automations.sections[0].entities[0], item);
  for (const entry of [automations.sections[0].entities[1], automations.sections[1].entities[0],
    automations.sections[2].entities[0], security.sections[0].entities[0]]) {
    assert.equal(entry.command, undefined);
    assert.equal(entry.confirmation, undefined);
  }
});

test('only an individual Sensors history graph can link to a room projected by this dashboard', () => {
  const hass = home();
  const sensor = 'sensor.fixture';
  hass.states[sensor] = { state: '25', attributes: {} };
  hass.entities[sensor] = {};
  const graph = { entity: sensor, role: 'graph', graph_hours: 24 };
  const section = (kind, item) => ({ kind, entities: [item] });
  const linked = { ...graph, graph_room_id: 'studio' };
  const robot = { ...graph, vacuum_panel_id: 'robot' };
  const config = {
    area_ids: ['studio'], show_unassigned: false,
    toolbar: [
      { kind: 'sensors', sections: [
        section('readings', linked), section('readings', graph), section('series', linked),
        section('readings', { ...linked, role: 'status' }),
        section('readings', { ...linked, entity: 'light.demo_lamp' }),
        section('readings', { ...robot, graph_room_id: 'lounge' }),
        section('readings', { ...robot, graph_room_id: 'studio' }),
        section('readings', { ...graph, graph_room_id: 'https://example.test/room' }),
      ] },
      { kind: 'weather', sections: [section('readings', linked)] },
      { kind: 'vacuum', id: 'robot' },
    ],
  };
  const [sensors, weather] = generateDashboard(config, hass).views[0].cards[0].toolbar;
  assert.deepEqual(sensors.sections.map(({ entities: [item] }) => [item.graph_room_id, item.vacuum_panel_id]), [
    ['studio', undefined], [undefined, undefined], [undefined, undefined], [undefined, undefined],
    [undefined, undefined], [undefined, 'robot'], ['studio', undefined], [undefined, undefined],
  ]);
  assert.deepEqual(sensors.sections[1].entities[0], graph);
  assert.deepEqual(weather.sections[0].entities[0], graph);
  config.area_ids = ['lounge'];
  assert.deepEqual(generateDashboard(config, hass).views[0].cards[0].toolbar[0].sections[0].entities[0], graph);
});

test('an optional lighting count selection changes only the scope of the room badge', () => {
  const hass = home();
  for (const entity of ['light.fixture_detail','light.fixture_hidden','light.fixture_elsewhere']) {
    hass.states[entity] = {state:'on', attributes:{}};
  }
  hass.entities['light.fixture_hidden'] = {hidden:true};
  const entities = ['light.demo_lamp','light.fixture_detail','light.fixture_hidden','switch.demo_boiler'];
  const scope = ['light.demo_lamp','light.demo_lamp','light.fixture_hidden','light.fixture_elsewhere','switch.demo_heater'];
  const build = (lighting_count_entities, turn_off_entities) => generateDashboard({
    room_overrides:{studio:{entities, lighting_count_entities, turn_off_entities}},
    room_shortcuts:{studio:['light.fixture_detail']},
  }, hass).views[0].cards[0].rooms.find(room => room.id === 'studio');
  const automatic = build();
  assert.deepEqual(build(scope), { ...automatic, lighting_count_entities:['light.demo_lamp'] });
  assert.ok(automatic.entities.some(item => item.entity === 'light.fixture_detail'));
  assert.deepEqual(automatic.shortcuts, ['light.fixture_detail']);
  assert.deepEqual(build([]),automatic);
  assert.deepEqual(build(['light.fixture_elsewhere']),automatic);
  assert.deepEqual(build(scope, ['light.fixture_detail','light.fixture_hidden','light.fixture_elsewhere','switch.demo_boiler']),
    { ...automatic, lighting_count_entities:['light.demo_lamp'], turn_off_entities:['light.fixture_detail','switch.demo_boiler'] });
});

test('native cover details are scoped to visible controls in the opted-in room', () => {
  const hass = home();
  const shade = 'cover.reading_shade';
  const readOnly = 'cover.entrance_shade';
  const hidden = 'cover.maintenance_shade';
  const foreign = 'cover.other_shade';
  for (const entity of [shade, readOnly, hidden, foreign]) {
    hass.entities[entity] = { area_id: 'studio' };
    hass.states[entity] = { state: 'closed', attributes: {} };
  }
  const [studio, lounge] = discoverRooms({
    area_ids: ['studio', 'lounge'],
    room_overrides: {
      studio: { entities: [shade, readOnly, hidden, 'light.demo_lamp'],
        read_only_entities: [readOnly], panel_hidden_entities: [hidden],
        native_cover_header_entities: [shade, shade, readOnly, hidden, foreign, 'light.demo_lamp'] },
      lounge: { entities: [shade, foreign] },
    },
  }, hass, 'en');
  assert.deepEqual(studio.entities.filter(item => item.room_cover_native_details).map(item => item.entity), [shade]);
  assert.ok(lounge.entities.every(item => !item.room_cover_native_details));
});

test('native light holds apply only to writable tiles in the opted-in room', () => {
  const hass = home();
  const explicitTile = 'light.demo_lamp';
  const automaticTile = 'light.reading_lamp';
  const readOnly = 'light.entry_status';
  const hidden = 'light.maintenance_lamp';
  const nonTile = 'light.utility_lamp';
  const foreign = 'light.other_room_lamp';
  for (const entity of [automaticTile, readOnly, hidden, nonTile, foreign]) {
    hass.entities[entity] = { area_id: 'studio' };
    hass.states[entity] = { state: 'off', attributes: {} };
  }
  const [studio, lounge] = discoverRooms({
    area_ids: ['studio', 'lounge'],
    room_overrides: {
      studio: {
        entities: [explicitTile, automaticTile, readOnly, hidden, nonTile, 'switch.demo_heater'],
        sections: [{ kind: 'lights', entities: [explicitTile] }, { kind: 'devices', entities: [nonTile] }],
        read_only_entities: [readOnly], panel_hidden_entities: [hidden],
        native_light_hold_entities: [explicitTile, explicitTile, automaticTile, readOnly, hidden, nonTile, foreign, 'switch.demo_heater'],
      },
      lounge: { entities: [explicitTile, foreign] },
    },
  }, hass, 'en');
  const optedIn = room => room.entities.filter(item => item.room_light_native_hold).map(item => item.entity);
  assert.deepEqual(optedIn(studio), [explicitTile, automaticTile]);
  assert.deepEqual(optedIn(lounge), []);
});
