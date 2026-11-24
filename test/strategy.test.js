import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverRooms, generateDashboard, normalizeProfile, suggestedDashboard } from '../src/strategy-model.js';

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
  assert.equal(view.cards[0].locale, 'he');
  assert.equal(view.cards[0].rooms.at(-1).name, 'ללא חדר');
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
