import assert from 'node:assert/strict';
import test from 'node:test';
import { applianceActivity, normalizeRoomActivities } from '../src/room-appliance.mjs';
import { generateDashboard } from '../src/strategy-model.js';

const now = Date.parse('2030-01-02T05:00:00Z');
const minute = 60000;
const source = (state, fields) => ({ state, ...fields });
const timestamp = delta => source(new Date(now + delta).toISOString());
const profiles = normalizeRoomActivities([
  { kind: 'oven', operation_entity: 'sensor.fixture_oven_state', finish_entity: 'sensor.fixture_oven_finish' },
  { kind: 'hob', operation_entity: 'sensor.fixture_hob_state', power_entity: 'switch.fixture_hob_power' },
  { kind: 'dishwasher', operation_entity: 'sensor.fixture_dish_state', finish_entity: 'sensor.fixture_dish_finish' },
  { kind: 'washer', operation_entity: 'sensor.fixture_washer_state', power_entity: 'switch.fixture_washer_power',
    finish_entity: 'sensor.fixture_washer_finish', done_entity: 'binary_sensor.fixture_washer_done',
    progress_entity: 'sensor.fixture_washer_pct' },
]);
const [oven, hob, dishwasher, washer] = profiles;

test('room activities validate roles, preserve order and exclude sources invisible in Home Assistant', () => {
  const malformed = [
    { ...oven, operation_entity: 'script.demo' },
    oven, oven, { ...hob, power_entity: 'sensor.wrong_domain' },
    { ...dishwasher, finish_entity: 'media_player.wrong_domain', command: 'turn_on' },
    { ...washer, done_entity: 'sensor.private_done' }, { kind: 'constructor' },
  ];
  const states = Object.fromEntries(profiles.flatMap(profile => Object.entries(profile)
    .filter(([key]) => key !== 'kind').map(([, entity]) => [entity, source('unknown')])));
  states['sensor.private_done'] = source('on');
  const entities = { 'sensor.private_done': { hidden_by: 'user' } };
  const overrides = { entities: [], activities: malformed };
  const config = { area_ids: ['kitchen'], show_unassigned: false, room_overrides: { kitchen: overrides } };
  const hass = { states, entities, areas: { kitchen: { area_id: 'kitchen', name: 'Kitchen' } } };
  const room = generateDashboard(config, hass).views[0].cards[0].rooms[0];
  assert.deepEqual(room.activities, [oven, { kind: 'dishwasher', operation_entity: dishwasher.operation_entity },
    { ...washer, done_entity: undefined }].map(entry => Object.fromEntries(Object.entries(entry).filter(([, id]) => id))));
  assert.deepEqual(room.entities, []);
  assert.equal(config.room_overrides.kitchen.activities, malformed);
});

test('oven shows only a live countdown and schedules the next minute boundary', () => {
  const state = { [oven.operation_entity]: source('run'), [oven.finish_entity]: timestamp(17 * minute + 500) };
  assert.deepEqual(applianceActivity(oven, state, now), { type: 'remaining', minutes: 17, nextAt: now + 501 });
  state[oven.finish_entity] = timestamp(499);
  assert.deepEqual(applianceActivity(oven, state, now), { type: 'remaining', minutes: 0, nextAt: now + 499 });
  for (const inactive of ['finished', 'ready', 'unavailable']) {
    state[oven.operation_entity] = source(inactive);
    assert.equal(applianceActivity(oven, state, now), null);
  }
  state[oven.operation_entity] = source('run');
  state[oven.finish_entity] = timestamp(-1);
  assert.equal(applianceActivity(oven, state, now), null);
});

test('cooktop uses observed powered-on time and excludes false elapsed readings when it is off', () => {
  const last_changed = new Date(now - 67 * minute - 500).toISOString();
  const state = { [hob.operation_entity]: source('run'), [hob.power_entity]: source('on', { last_changed }) };
  assert.deepEqual(applianceActivity(hob, state, now), { type: 'elapsed', minutes: 67, nextAt: now + minute - 500 });
  for (const power of ['off', 'unknown', 'unavailable']) {
    state[hob.power_entity] = source(power, { last_changed });
    assert.equal(applianceActivity(hob, state, now), null);
  }
});

test('dishwasher shows remaining time, running fallback and observed finish', () => {
  const state = { [dishwasher.operation_entity]: source('run'), [dishwasher.finish_entity]: timestamp(18 * minute + 100) };
  assert.equal(applianceActivity(dishwasher, state, now).type, 'remaining');
  state[dishwasher.finish_entity] = source('unavailable');
  assert.deepEqual(applianceActivity(dishwasher, state, now), { type: 'running' });
  state[dishwasher.operation_entity] = source('finished');
  assert.deepEqual(applianceActivity(dishwasher, state, now), { type: 'finished' });
  state[dishwasher.operation_entity] = source('ready');
  assert.equal(applianceActivity(dishwasher, state, now), null);
});

test('washer reports completion from four native sources and future finish takes precedence', () => {
  const running = { [washer.power_entity]: source('on'), [washer.operation_entity]: source('run') };
  assert.deepEqual(applianceActivity(washer, running, now), { type: 'running' });
  for (const [id, entry] of [
    [washer.operation_entity, source('finished')], [washer.done_entity, source('present')],
    [washer.progress_entity, source('99')], [washer.finish_entity, timestamp(-1)],
  ]) {
    const state = { ...running, [id]: entry };
    assert.deepEqual(applianceActivity(washer, state, now), { type: 'finished' });
    state[washer.finish_entity] = timestamp(minute + 5);
    assert.equal(applianceActivity(washer, state, now).type, 'remaining');
    state[washer.power_entity] = source('off');
    assert.equal(applianceActivity(washer, state, now), null);
  }
  assert.deepEqual(applianceActivity(washer, { ...running, [washer.progress_entity]: source('98.99') }, now), { type: 'running' });
});

const boiler = { kind: 'boiler', boiler_entity: 'switch.fixture_boiler', started_at_entity: 'input_datetime.fixture_boiler_started' };

test('boiler elapsed uses the current powered cycle and the helper native epoch', () => {
  const began = now - 17 * minute - 1000;
  const power = { last_changed: new Date(began + 541).toISOString() };
  const attrs = { has_date: true, has_time: true, timestamp: began / 1000 };
  const valid = source('2030-01-02 07:42:59', { attributes: attrs });
  const states = { [boiler.boiler_entity]: source('on', power), [boiler.started_at_entity]: valid };
  assert.deepEqual(applianceActivity(boiler, states, now),
    { type: 'elapsed', minutes: 17, nextAt: now + minute - 1000 });
  assert.deepEqual(applianceActivity(boiler, states, now + minute),
    { type: 'elapsed', minutes: 18, nextAt: now + 2 * minute - 1000 });
  for (const helper of [
    source('unavailable', { attributes: attrs }), undefined,
    source(valid.state, { attributes: { ...attrs, has_date: false } }),
    source(valid.state, { attributes: { ...attrs, timestamp: String(attrs.timestamp) } }),
    source(valid.state, { attributes: { ...attrs, timestamp: (now + 1000) / 1000 } }),
    source(valid.state, { attributes: { ...attrs, timestamp: (began - 1000) / 1000 } }),
  ]) assert.equal(applianceActivity(boiler, { ...states, [boiler.started_at_entity]: helper }, now), null);
  for (const powerState of [source('off', power), source('unavailable', power), source('on')]) {
    assert.equal(applianceActivity(boiler, { ...states, [boiler.boiler_entity]: powerState }, now), null);
  }
});

test('boiler elapsed supports only a room member already configured as a boiler, with access to the helper', () => {
  const config = {
    area_ids: ['bath', 'kitchen'],
    room_overrides: {
      bath: { entities: [boiler.boiler_entity], activities: [boiler] },
      kitchen: { entities: [boiler.boiler_entity] },
    },
    profiles: [{ kind: 'boiler', entity: boiler.boiler_entity }],
  };
  const hass = {
    states: { [boiler.boiler_entity]: source('off'), [boiler.started_at_entity]: source('unavailable') },
    areas: { bath: { name: 'Bathroom' }, kitchen: { name: 'Kitchen' } },
  };
  const rooms = (options = config, data = hass) => generateDashboard(options, data).views[0].cards[0].rooms;
  const [bathroom, kitchen] = rooms();
  assert.deepEqual(bathroom.activities, [boiler]);
  assert.equal(kitchen.activities, undefined);
  assert.deepEqual(bathroom.entities.map(item => item.entity), [boiler.boiler_entity]);
  assert.equal(rooms({ ...config, profiles: [] })[0].activities, undefined);
  assert.equal(rooms(config, { ...hass, entities: { [boiler.started_at_entity]: { hidden_by: 'user' } } })[0].activities, undefined);
  assert.deepEqual(normalizeRoomActivities([{ ...boiler, started_at_entity: 'sensor.wrong_domain' }]), []);
});
