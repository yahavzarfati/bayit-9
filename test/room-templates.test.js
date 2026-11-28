import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRoomLayout, initialRoomLayoutBindings, resolveRoomLayout, roomLayoutCandidates,
  roomLayoutOverride } from '../src/room-templates.js';

const item = (entity, name = entity, kind) => ({ entity, name, kind });
const room = {
  id: 'den',
  entities: [item('light.den'), item('fan.hvac'), item('fan.heat', 'Den heater', 'heater'), item('cover.drape'),
    item('cover.garage'), item('lock.back'), item('sensor.co2'), item('light.hidden')],
  panel_hidden_entities: ['light.hidden'],
};
const states = {
  'cover.drape': { attributes: { device_class: 'curtain' } },
  'cover.garage': { attributes: { device_class: 'garage' } },
  'cover.den_fixture': { attributes: { device_class: 'curtain' } },
};

test('built-in layouts select visible local members, match heater profiles, and keep other devices unbound', () => {
  const layout = buildRoomLayout(room, 'comfort', states);
  assert.deepEqual(layout.map(group => group.kind), ['climate', 'heating', 'sensors', 'lights', 'covers']);
  const bindings = initialRoomLayoutBindings(layout, room, states);
  const resolved = resolveRoomLayout(layout, bindings, room, states);
  assert.deepEqual(resolved.flatMap(group => group.entities), ['fan.hvac', 'fan.heat', 'sensor.co2', 'light.den', 'cover.drape']);
  assert.deepEqual(buildRoomLayout(room, 'access', states).map(group => group.kind), ['security', 'garage', 'covers', 'lights', 'sensors']);
  assert.deepEqual(buildRoomLayout({ ...room, entities: [] }, 'daily', states), []);
});

test('copied layout preserves only presentation, maps same capability to target room and skips absent inputs', () => {
  const sameRoom = {
    ...room, sections: [{ kind: 'lights', entities: [item('light.den')] }],
  };
  assert.deepEqual(buildRoomLayout(room, '', states, sameRoom), []);
  const source = {
    id: 'study',
    entities: [
      item('cover.den_fixture', 'Study drape'), item('sensor.study_co2', 'CO2'),
      item('sensor.study_humidity', 'Humidity'), item('fan.study_heat', 'Study heater', 'heater'),
    ],
    panel_hidden_entities: ['sensor.study_humidity'],
    sections: [
      { kind: 'covers', title: 'Shades', columns: 2, entities: [item('cover.den_fixture')], action: 'move' },
      { kind: 'heating', entities: [item('fan.study_heat')] },
      { kind: 'devices', title: '', tile_status: 'attention', entities: [
        item('sensor.study_co2'), item('sensor.study_humidity'), item('sensor.unrelated'),
      ] },
      { kind: 'lights', entities: [] },
    ],
    extra_entities: ['script.source'],
  };
  const layout = buildRoomLayout(room, '', states, source);
  assert.equal(layout.length, 3);
  assert.equal(JSON.stringify(layout).includes('cover.den_fixture'), false);
  assert.deepEqual(roomLayoutCandidates(room, layout[0].inputs[0], states).map(device => device.entity), ['cover.drape']);
  assert.deepEqual(roomLayoutCandidates(room, layout[1].inputs[0], states).map(device => device.entity), ['fan.heat']);
  const bindings = initialRoomLayoutBindings(layout, room, states);
  assert.deepEqual(resolveRoomLayout(layout, bindings, room, states), [
    { id: 'layout-1', kind: 'covers', title: 'Shades', columns: 2, entities: ['cover.drape'] },
    { id: 'layout-2', kind: 'heating', entities: ['fan.heat'] },
    { id: 'layout-3', kind: 'devices', title: '', tile_status: 'attention', entities: ['sensor.co2'] },
  ]);
  bindings.set(layout[0].inputs[0].id, 'cover.den_fixture');
  bindings.set(layout[1].inputs[0].id, 'fan.hvac');
  assert.deepEqual(resolveRoomLayout(layout, bindings, room, states).map(group => group.kind), ['devices']);
  assert.deepEqual(resolveRoomLayout(layout, bindings, undefined, states), []);
});

test('ambiguous copied inputs require a local choice and a device cannot be bound twice', () => {
  const target = { id: 'den', entities: [item('light.den'), item('light.other')] };
  const source = {
    id: 'bed', entities: [item('light.one'), item('light.two')],
    sections: [{ kind: 'lights', entities: [item('light.one'), item('light.two')] }],
  };
  const layout = buildRoomLayout(target, '', {}, source);
  assert.deepEqual(initialRoomLayoutBindings(layout, target), new Map());
  const bindings = new Map(layout[0].inputs.map(input => [input.id, 'light.den']));
  assert.deepEqual(resolveRoomLayout(layout, bindings, target), [
    { id: 'layout-1', kind: 'lights', entities: ['light.den'] },
  ]);
});

test('applying a layout preserves automatic discovery and explicit or legacy manual memberships', () => {
  const sections = [{ id: 'layout-lights', kind: 'lights', entities: ['light.den'] }];
  const auto = { name: 'Den', additional_entities: ['fan.heat'], panel_hidden_entities: ['light.hidden'] };
  assert.deepEqual(roomLayoutOverride(auto, sections, false, room.entities.map(item => item.entity)),
    { ...auto, device_selection: 'auto', sections });

  const legacyManual = {
    sections: [{ id: 'old', kind: 'devices', entities: ['light.den', 'sensor.previous', 'light.unavailable'] }],
    group_controls: false,
  };
  assert.deepEqual(roomLayoutOverride(legacyManual, sections, false, legacyManual.sections.flatMap(group => group.entities)),
    { ...legacyManual, sections, entities: ['light.den', 'sensor.previous', 'light.unavailable'] });

  const explicit = { ...legacyManual, entities: ['light.den', 'lock.explicit'], hidden_entities: ['light.hidden'] };
  assert.deepEqual(roomLayoutOverride(explicit, sections, true, []), { ...explicit, sections });
  assert.equal(roomLayoutOverride(auto, [], false, []), undefined);
});
