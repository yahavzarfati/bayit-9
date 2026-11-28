import { getDeviceModel } from './device-control.mjs';

const windowTreatmentClasses = new Set(['blind', 'curtain', 'shade', 'shutter']);

export const roomGroupActions = {
  light: { turn_on: 'turn_on', turn_off: 'turn_off' },
  cover: { open: 'open_cover', close: 'close_cover' },
};

function needsAction(model, action) {
  if (model.domain === 'light') return model.state === (action === 'turn_on' ? 'off' : 'on');
  if (action === 'close') return model.state === 'open';
  return model.state === 'closed' || (model.state === 'open' &&
    Number.isFinite(model.attributes.current_position) && model.attributes.current_position < 100);
}

export function roomGroupMembers(devices, { domain, action, states, services, registry, visible, pending }) {
  const candidates = [];
  const targets = [];
  const service = roomGroupActions[domain]?.[action];
  if (!service) return { candidates, targets };
  for (const device of devices) {
    if (!device.entity.startsWith(domain + '.') || device.timed || !visible(device.entity)) continue;
    const model = getDeviceModel(device, states);
    if (registry?.[device.entity]?.platform === 'group' || Array.isArray(model.attributes.entity_id)) continue;
    if (domain === 'cover' && !windowTreatmentClasses.has(model.attributes.device_class)) continue;
    const operation = model.actions[action];
    if (!model.available || !operation || operation.requiresCode || operation.requiresConfirmation) continue;
    candidates.push(device);
    if (Object.hasOwn(services?.[domain] ?? {}, service) && !pending(device.entity) && needsAction(model, action)) {
      targets.push(device);
    }
  }
  return { candidates, targets };
}
