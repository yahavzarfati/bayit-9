import { roomSections, usesAutomaticRoomDevices } from './strategy-model.js';

const ROOM_LAYOUTS = new Map([
  ['daily', ['lights', 'covers', 'climate', 'heating', 'media']],
  ['comfort', ['climate', 'heating', 'sensors', 'weather', 'lights', 'covers']],
  ['access', ['security', 'garage', 'covers', 'lights', 'sensors']],
]);

const domainOf = entity => entity.split('.')[0];
const deviceClassOf = (entity, states) => states[entity]?.attributes?.device_class;

function sectionKind(device, states) {
  if (device.kind === 'heater' || device.kind === 'boiler') return 'heating';
  switch (domainOf(device.entity)) {
    case 'light': return 'lights';
    case 'cover': return deviceClassOf(device.entity, states) === 'garage' ? 'garage' : 'covers';
    case 'climate':
    case 'fan':
    case 'water_heater': return 'climate';
    case 'sensor':
    case 'binary_sensor': return 'sensors';
    case 'weather': return 'weather';
    case 'camera':
    case 'lock':
    case 'alarm_control_panel': return 'security';
    case 'media_player': return 'media';
    default: return undefined;
  }
}

function roomDevices(room) {
  const hidden = new Set(room?.panel_hidden_entities);
  return (room?.entities ?? []).filter(device => !hidden.has(device.entity));
}

function entityInput(id, device, states, suggested) {
  const domain = domainOf(device.entity);
  return {
    id, domain, kind: device.kind,
    deviceClass: deviceClassOf(device.entity, states),
    label: device.name !== device.entity ? device.name : undefined,
    suggested,
  };
}

export function buildRoomLayout(room, selection, states = {}, source) {
  if (source && source.id !== room?.id) {
    const members = new Map(roomDevices(source).map(device => [device.entity, device]));
    return (source.sections ?? []).flatMap(({ kind, title, columns, tile_status, entities }, index) => {
      const id = 'layout-' + (index + 1);
      const inputs = entities.map(item => members.get(item.entity)).filter(Boolean)
        .map((device, slot) => entityInput(id + '-' + (slot + 1), device, states));
      return inputs.length ? [{ id, kind, title, columns, tile_status, inputs }] : [];
    });
  }
  const devices = roomDevices(room);
  return (ROOM_LAYOUTS.get(selection) ?? []).flatMap(kind => {
    const id = 'layout-' + kind;
    const inputs = devices.filter(device => sectionKind(device, states) === kind)
      .map(device => entityInput(id + ':' + device.entity, device, states, device.entity));
    return inputs.length ? [{ id, kind, inputs }] : [];
  });
}

export function roomLayoutCandidates(room, input, states = {}) {
  return roomDevices(room).filter(device =>
    domainOf(device.entity) === input.domain &&
    device.kind === input.kind &&
    (!input.deviceClass || deviceClassOf(device.entity, states) === input.deviceClass));
}

export function initialRoomLayoutBindings(layout, room, states = {}) {
  const bindings = new Map();
  const used = new Set();
  for (const { inputs } of layout) {
    for (const input of inputs) {
      const options = roomLayoutCandidates(room, input, states).filter(device => !used.has(device.entity));
      const suggestion = input.suggested ?? (options.length === 1 ? options[0].entity : undefined);
      if (!suggestion || !options.some(device => device.entity === suggestion)) continue;
      bindings.set(input.id, suggestion);
      used.add(suggestion);
    }
  }
  return bindings;
}

export function resolveRoomLayout(layout, bindings, room, states = {}) {
  const used = new Set();
  return roomSections(layout.flatMap(({ inputs, ...section }) => {
    const entities = [];
    for (const input of inputs) {
      const entity = bindings.get(input.id);
      if (used.has(entity) || !roomLayoutCandidates(room, input, states).some(device => device.entity === entity)) continue;
      used.add(entity);
      entities.push(entity);
    }
    return entities.length ? [{ ...section, entities }] : [];
  }));
}

export function roomLayoutOverride(override, sections, custom, existingMembership) {
  if (!sections.length) return undefined;
  const next = { ...override, sections };
  if (usesAutomaticRoomDevices(override, roomSections(override.sections), custom)) {
    next.device_selection = 'auto';
  } else if (!Array.isArray(override.entities)) {
    next.entities = [...existingMembership];
  }
  return next;
}
