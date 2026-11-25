import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoilerScheduler, isBoilerScheduleProfile } from '../src/boiler-schedule.js';

const boiler = {
  kind: 'boiler', entity: 'switch.fixture_boiler',
  timed: { simple_timer_entity: 'sensor.fixture_timer', min_minutes: 15, max_minutes: 300, step_minutes: 15 },
};
const guard = { save_script: 'script.safe_store', delete_script: 'script.safe_remove' };
const timerData = { entry_id: 'fixture-id', duration: 90 };
const draft = { name: 'Morning', duration: 90, time: '07:30', weekdays: ['sun', 'thu'] };
const row = (id = 'current', data = timerData, options = {}) => ({
  schedule_id: id, entity_id: 'switch.schedule_' + id, name: 'Morning - 90 min', enabled: true, weekdays: ['sun', 'thu'],
  repeat_type: 'repeat', start_date: null, end_date: null, tags: ['preserve-me'],
  timeslots: [{ start: '07:30:00', stop: null, conditions: [], condition_type: null, track_conditions: false,
    actions: [{ service: 'simple_timer.start_timer', entity_id: null, service_data: data }] }], ...options,
});

function fixture(config = boiler, initial = [row()]) {
  const database = new Map(initial.map(record => [record.schedule_id, structuredClone(record)]));
  const calls = [];
  const services = {
    scheduler: { add: {}, edit: {}, remove: {} }, switch: { turn_on: {}, turn_off: {} },
    simple_timer: { start_timer: {} }, script: { safe_store: {}, safe_remove: {} },
  };
  const hass = { user: { is_admin: true }, services, states: {
    'sensor.fixture_timer': { state: '0', attributes: { switch_entity_id: boiler.entity, entry_id: timerData.entry_id } },
    ...Object.fromEntries(initial.map(record => [record.entity_id, { state: 'on', last_updated: 'revision-at-open' }])),
  } };
  let respond;
  hass.callWS = async message => {
    calls.push(structuredClone(message));
    if (message.type === 'scheduler') return [...database.values()];
    if (message.type === 'scheduler/item') return database.get(message.schedule_id) ?? null;
    return respond?.(message);
  };
  const controller = createBoilerScheduler(config, () => hass, { retry: [] });
  const writes = () => calls.filter(call => call.type === 'call_service');
  const onWrite = apply => { respond = apply; };
  return { controller, calls, writes, hass, database, onWrite };
}

test('scheduler discovery proves mapped boiler identity and preserves complex or foreign records', async () => {
  const complex = row('custom');
  complex.timeslots[0].conditions.push({ entity_id: 'binary_sensor.present' });
  const malformed = row('unsafe', { ...timerData, unit: 'h' });
  const select = fixture(boiler, [row(), row('foreign', { entry_id: 'another-timer', duration: 90 }), complex, malformed]);
  const { controller, hass, writes } = select;
  assert.equal(isBoilerScheduleProfile({ ...boiler, kind: 'heater' }), false);
  assert.deepEqual((await controller.list()).map(r => [r.id, r.editable]), [
    ['current', true], ['custom', false], ['unsafe', false],
  ]);
  hass.states['sensor.fixture_timer'].attributes.switch_entity_id = 'switch.other_device';
  await assert.rejects(() => controller.create(draft), { code: 'unavailable' });
  assert.deepEqual(writes(), []);
});

test('native edits and deletes re-read authoritative ownership and settings and reject stale/custom records before calling a service', async () => {
  const { controller, database, writes, calls } = fixture();
  const [opening] = await controller.list();
  const baseline = controller.revisionOf(opening);
  database.get('current').tags.push('added-in-native-ui');
  await assert.rejects(() => controller.update(baseline, { ...draft, duration: 120 }), { code: 'changed' });
  database.get('current').tags.pop();
  database.get('current').timeslots[0].actions[0].service_data.entry_id = 'another-timer';
  await assert.rejects(() => controller.remove(baseline), { code: 'changed' });
  assert.deepEqual(writes(), []);
  assert.equal(calls.filter(call => call.type === 'scheduler/item').length, 2);
});

test('scheduler declines abandoned form writes after preflight and keeps normal toggles unchanged', async () => {
  for (const config of [boiler, { ...boiler, schedule:guard }]) {
    const { controller, database, hass, writes, onWrite } = fixture(config);
    const [opening] = await controller.list();
    const saved = controller.revisionOf(opening);
    const send = hass.callWS;
    const changedDraft = { ...draft, duration:105 };
    for (const [read, action] of [
      ['scheduler', stillCurrent => controller.create(changedDraft, stillCurrent)],
      ['scheduler/item', stillCurrent => controller.update(saved, changedDraft, stillCurrent)],
      ['scheduler/item', stillCurrent => controller.remove(saved, stillCurrent)],
    ]) {
      let current = true;
      let release;
      hass.callWS = request => request.type === read ? new Promise(resolve => {
        release = () => resolve(send(request));
      }) : send(request);
      const pending = action(() => current);
      assert.equal(typeof release,'function');
      current = false;
      release();
      await assert.rejects(pending,{code:'abandoned'});
    }
    assert.deepEqual(writes(),[]);
    hass.callWS = send;
    onWrite(message => { if (message.service === 'turn_off') database.get('current').enabled = false; });
    await controller.setEnabled(saved,false);
    assert.deepEqual(writes().map(call=>[call.domain,call.service]),[['switch','turn_off']]);
  }
});

test('an already dispatched schedule write still reconciles after its form leaves', async () => {
  const { controller, database, calls, writes, onWrite } = fixture();
  const [opening] = await controller.list();
  const saved = controller.revisionOf(opening);
  let current = true;
  let release;
  let dispatched;
  const dispatch = new Promise(resolve => { dispatched = resolve; });
  onWrite(message => new Promise(resolve => {
    release = () => {
      const updated = database.get('current');
      updated.name = message.service_data.name;
      updated.timeslots[0].actions[0].service_data.duration = 105;
      resolve({});
    };
    dispatched();
  }));
  const updating = controller.update(saved,{...draft,duration:105},()=>current);
  await dispatch;
  current = false;
  release();
  await updating;
  assert.equal(writes().length,1);
  assert.equal(calls.filter(call=>call.type === 'scheduler/item').length,2);
});

test('native CRUD writes only the proven schedule or the mapped timer and verifies readback', async () => {
  const { controller, database, writes, onWrite } = fixture();
  const [opening] = await controller.list();
  onWrite(message => {
    const data = message.service_data;
    if (message.service === 'add') database.set('new', row('new', data.timeslots[0].actions[0].service_data, { name: data.name }));
    if (message.service === 'edit') {
      const existing = database.get('current');
      existing.timeslots[0].actions[0].service_data = data.timeslots[0].actions[0].service_data;
      existing.name = data.name;
    }
    if (message.service === 'turn_off') database.get('current').enabled = false;
    if (message.service === 'remove') database.delete('current');
  });
  await controller.create({ ...draft, name: 'Backup' });
  assert.deepEqual(writes()[0], {
    type: 'call_service', domain: 'scheduler', service: 'add',
    service_data: { name: 'Backup - 90 min', weekdays: ['sun', 'thu'], repeat_type: 'repeat',
      timeslots: [{ start: '07:30:00', actions: [{ service: 'simple_timer.start_timer', service_data: timerData }] }] },
  });
  await controller.update(opening, { ...draft, duration: 105 });
  const updated = (await controller.list()).find(r => r.id === 'current');
  assert.equal(updated.duration, 105);
  const edit = writes()[1];
  assert.equal(edit.service_data.entity_id, 'switch.schedule_current');
  assert.equal(Object.hasOwn(edit.service_data, 'tags'), false);
  assert.equal(Object.hasOwn(edit.service_data, 'enabled'), false);
  await controller.setEnabled(updated, false);
  assert.deepEqual(writes()[2], { type: 'call_service', domain: 'switch', service: 'turn_off',
    service_data: {}, target: { entity_id: 'switch.schedule_current' } });
  const disabled = (await controller.list()).find(r => r.id === 'current');
  await controller.remove(disabled);
  assert.deepEqual(writes()[3], { type: 'call_service', domain: 'scheduler', service: 'remove',
    service_data: { entity_id: 'switch.schedule_current' } });
  assert.deepEqual([...database.keys()], ['new']);
});

test('configured guarded action uses strict server revision and response without falling back on failure', async () => {
  const { controller, hass, writes, onWrite } = fixture({ ...boiler, schedule: guard });
  const [opening] = await controller.list();
  const saved = controller.revisionOf(opening);
  hass.states[opening.entity].last_updated = 'newer';
  await assert.rejects(() => controller.remove(saved), { code: 'changed' });
  assert.deepEqual(writes(), []);
  hass.states[opening.entity].last_updated = saved.lastUpdated;
  onWrite(() => ({ response: { success: false } }));
  await assert.rejects(() => controller.update(saved, { ...draft, duration: 120 }), { code: 'uncertain' });
  assert.deepEqual(writes()[0], { type: 'call_service', domain: 'script', service: 'safe_store',
    service_data: { schedule_entity: opening.entity, expected_revision: 'revision-at-open',
      schedule_name: draft.name, schedule_time: draft.time, duration: 120, weekdays: draft.weekdays },
    return_response: true });
  delete hass.services.script.safe_remove;
  await assert.rejects(() => controller.create(draft), { code: 'unavailable' });
  assert.equal(writes().length, 1);
});

test('guarded schedules use the same fixed duration grid in records and writes regardless of immediate timer settings', async () => {
  const timed = { ...boiler.timed, min_minutes: 1, max_minutes: 75, step_minutes: 1 };
  const initial = [row(), row('offgrid', { ...timerData, duration: 17 })];
  const guarded = fixture({ ...boiler, timed, schedule: guard }, initial);
  assert.deepEqual(guarded.controller.limits, { min: 15, max: 300, step: 15 });
  assert.equal(guarded.controller.defaultDuration, 90);
  const [editable, offGrid] = await guarded.controller.list();
  assert.deepEqual([editable.mutable, editable.duration, offGrid.mutable], [true, 90, false]);
  for (const duration of [1, 17, 301]) {
    await assert.rejects(() => guarded.controller.create({ ...draft, duration }), { code: 'invalid' });
    await assert.rejects(() => guarded.controller.update(editable, { ...draft, duration }), { code: 'invalid' });
  }
  assert.deepEqual(guarded.writes(), []);
  guarded.onWrite(({ service_data }) => {
    guarded.database.get(editable.id).timeslots[0].actions[0].service_data.duration = service_data.duration;
    guarded.database.get(editable.id).name = service_data.schedule_name;
    return { response: { success: true } };
  });
  await guarded.controller.update(guarded.controller.revisionOf(editable), { ...draft, duration: 300 });
  assert.equal(guarded.writes()[0].service_data.duration, 300);

  const native = fixture({ ...boiler, timed }, initial).controller;
  assert.deepEqual(native.limits, { min: 1, max: 75, step: 1 });
  assert.equal(native.defaultDuration, 75);
  assert.deepEqual((await native.list()).map(record => record.mutable), [false, true]);
});

test('rejects invalid days, off-grid minutes and non-admin writes; never treats a silent acknowledgement as success', async () => {
  const { controller, writes, hass } = fixture();
  for (const bad of [{ weekdays: [] }, { weekdays: ['sun', 'sun'] }, { time: '07:31' }, { duration: 301 }]) {
    await assert.rejects(() => controller.create({ ...draft, ...bad }), { code: 'invalid' });
  }
  hass.user.is_admin = false;
  await assert.rejects(() => controller.create(draft), { code: 'unavailable' });
  assert.deepEqual(writes(), []);
  hass.user.is_admin = true;
  await assert.rejects(() => controller.create(draft), { code: 'uncertain' });
  assert.equal(writes().length, 1);
});
