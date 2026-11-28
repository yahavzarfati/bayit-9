import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roomGroupMembers } from '../src/room-group-actions.mjs';

test('room cover actions keep native capability, movement, visibility and independent confirmation boundaries', () => {
  const devices = [
    { entity: 'cover.window' }, { entity: 'cover.partial' }, { entity: 'cover.in_motion' },
    { entity: 'cover.hidden' }, { entity: 'cover.readonly', role: 'status' },
    { entity: 'cover.confirmed', confirmation: 'Check the patio first.' },
    { entity: 'cover.stop_only' }, { entity: 'cover.unavailable' }, { entity: 'cover.pending' },
    { entity: 'cover.garage' }, { entity: 'cover.unclassified' },
  ];
  const state = (state, supported_features = 3, current_position, device_class = 'shutter') => ({
    state, attributes: { supported_features, current_position, device_class },
  });
  const states = Object.fromEntries(devices.map(({ entity }) => [entity, state('closed')]));
  states['cover.in_motion'] = state('closing');
  states['cover.partial'] = state('open', 3, 50);
  states['cover.stop_only'] = state('closed', 8);
  states['cover.unavailable'] = state('unavailable');
  states['cover.garage'] = state('closed', 3, 0, 'garage');
  delete states['cover.unclassified'].attributes.device_class;
  const options = { domain: 'cover', action: 'open', states, services: { cover: { open_cover: {} } },
    visible: entity => entity !== 'cover.hidden', pending: entity => entity === 'cover.pending' };
  const result = roomGroupMembers(devices, options);
  assert.deepEqual(result.targets.map(device => device.entity), ['cover.window', 'cover.partial']);
  assert.deepEqual(roomGroupMembers(devices, { ...options, services: {} }).targets, []);
});

test('room light actions skip timers and issue the chosen command only to lights changing state', () => {
  const devices = [
    { entity: 'light.hall' }, { entity: 'light.study' }, { entity: 'light.timer', timed: {} },
    { entity: 'switch.boiler' }, { entity: 'light.whole_house' },
  ];
  const states = Object.fromEntries(devices.map(({ entity }) => [entity, {
    state: entity === 'light.study' ? 'off' : 'on', attributes: {},
  }]));
  const result = roomGroupMembers(devices, { domain: 'light', action: 'turn_off', states,
    services: { light: { turn_off: {} } }, registry: { 'light.whole_house': { platform: 'group' } },
    visible: () => true, pending: () => false });
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.targets, [devices[0]]);
});
