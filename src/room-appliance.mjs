export const activityKinds = {
  oven: { icon: 'mdi:stove', required: ['operation_entity', 'finish_entity'] },
  hob: { icon: 'mdi:gas-burner', required: ['operation_entity', 'power_entity'] },
  dishwasher: { icon: 'mdi:dishwasher', required: ['operation_entity'], optional: ['finish_entity'] },
  washer: { icon: 'mdi:washing-machine', required: ['operation_entity', 'power_entity'],
    optional: ['finish_entity', 'done_entity', 'progress_entity'] },
  boiler: { icon: 'mdi:water-boiler', required: ['boiler_entity', 'started_at_entity'] },
};

export const activitySources = {
  operation_entity: ['sensor'], finish_entity: ['sensor'], progress_entity: ['sensor'],
  power_entity: ['switch', 'binary_sensor', 'input_boolean'],
  done_entity: ['sensor', 'binary_sensor', 'input_boolean'],
  boiler_entity: ['switch'], started_at_entity: ['input_datetime'],
};

const entityId = /^[a-z_]+\.[a-z0-9_]+$/;
const unavailable = new Set(['', 'unknown', 'unavailable']);
const inactive = new Set([...unavailable, 'off', 'idle', 'inactive', 'standby', 'ready', 'none']);
const step = 60000;

export function normalizeRoomActivities(items, visible = () => true) {
  if (!Array.isArray(items)) return [];
  const kinds = new Set();
  return items.flatMap(item => {
    if (!Object.hasOwn(activityKinds, item?.kind) || kinds.has(item.kind)) return [];
    const shape = activityKinds[item.kind];
    const mapped = { kind: item.kind };
    for (const key of [...shape.required, ...(shape.optional ?? [])]) {
      const entity = item[key];
      if (typeof entity === 'string' && entityId.test(entity) && activitySources[key].includes(entity.split('.')[0]) && visible(entity)) {
        mapped[key] = entity;
      }
    }
    if (!shape.required.every(key => Object.hasOwn(mapped, key))) return [];
    kinds.add(item.kind);
    return [mapped];
  });
}

function timestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) ? Date.parse(value) : NaN;
}

const stateOf = (states, id) => typeof states?.[id]?.state === 'string' ? states[id].state.trim().toLowerCase() : '';
const finished = value => /finish|complete|\bdone\b|סיום|הסתיים/.test(value);

function elapsed(start, now) {
  const minutes = Math.floor((now - start) / step);
  return { type: 'elapsed', minutes, nextAt: start + (minutes + 1) * step };
}

function boilerElapsed(activity, states, now) {
  const { boiler_entity, started_at_entity } = activity;
  const power = states?.[boiler_entity];
  const helper = states?.[started_at_entity];
  const attributes = helper?.attributes;
  const epochSeconds = attributes?.timestamp;
  if (power?.state !== 'on' || unavailable.has(stateOf(states, started_at_entity)) ||
      attributes?.has_date !== true || attributes?.has_time !== true || !Number.isFinite(epochSeconds)) return null;
  const started = epochSeconds * 1000;
  const switchedOn = timestamp(power.last_changed);
  // input_datetime stores whole seconds. Allow the recorded on time to round down.
  if (!Number.isFinite(switchedOn) || started + 1000 < switchedOn || started > now) return null;
  return elapsed(started, now);
}

export function applianceActivity(activity, states, now) {
  if (activity.kind === 'boiler') return boilerElapsed(activity, states, now);
  const { kind, operation_entity, finish_entity, power_entity, done_entity, progress_entity } = activity;
  const operation = stateOf(states, operation_entity);
  const powered = stateOf(states, power_entity) === 'on';
  const finish = timestamp(states?.[finish_entity]?.state);
  const remaining = () => {
    const minutes = Math.floor((finish - now) / step);
    return { type: 'remaining', minutes, nextAt: minutes > 0 ? finish - minutes * step + 1 : finish };
  };
  const active = !inactive.has(operation) && !finished(operation);
  if (kind === 'oven') return active && finish > now ? remaining() : null;
  if (kind === 'hob') {
    const start = timestamp(states?.[power_entity]?.last_changed);
    if (!powered || !active || !Number.isFinite(start) || start > now) return null;
    return elapsed(start, now);
  }
  if (kind === 'dishwasher') {
    if (finished(operation)) return { type: 'finished' };
    return active ? finish > now ? remaining() : { type: 'running' } : null;
  }
  if (kind !== 'washer' || !powered) return null;
  if (finish > now) return remaining();
  const done = stateOf(states, done_entity);
  const progress = Number(stateOf(states, progress_entity));
  if (finished(operation) || finished(done) || ['on', 'true', '1', 'yes', 'present'].includes(done) ||
      (Number.isFinite(finish) && finish <= now) || (progress >= 99 && progress <= 100)) {
    return { type: 'finished' };
  }
  return { type: 'running' };
}
