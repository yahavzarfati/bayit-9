export const activityKinds = {
  oven: { icon: 'mdi:stove', required: ['operation_entity', 'finish_entity'] },
  hob: { icon: 'mdi:gas-burner', required: ['operation_entity', 'power_entity'] },
  dishwasher: { icon: 'mdi:dishwasher', required: ['operation_entity'], optional: ['finish_entity'] },
  washer: { icon: 'mdi:washing-machine', required: ['operation_entity', 'power_entity'],
    optional: ['finish_entity', 'done_entity', 'progress_entity'] },
  boiler: { icon: 'mdi:water-boiler', required: ['boiler_entity', 'started_at_entity'] },
  vacuum: { icon: 'mdi:robot-vacuum', required: ['vacuum_entity'],
    optional: ['status_entity', 'cleaning_entity', 'progress_entity', 'mop_mode_entity'] },
};

export const activitySources = {
  operation_entity: ['sensor'], finish_entity: ['sensor'], progress_entity: ['sensor'],
  power_entity: ['switch', 'binary_sensor', 'input_boolean'],
  done_entity: ['sensor', 'binary_sensor', 'input_boolean'],
  boiler_entity: ['switch'], started_at_entity: ['input_datetime'],
  vacuum_entity: ['vacuum'], status_entity: ['sensor'], cleaning_entity: ['binary_sensor'],
  mop_mode_entity: ['select', 'input_select', 'sensor'],
};

const entityId = /^[a-z_]+\.[a-z0-9_]+$/;
const unavailable = new Set(['', 'unknown', 'unavailable']);
const inactive = new Set([...unavailable, 'off', 'idle', 'inactive', 'standby', 'ready', 'none']);
const step = 60000;
const vacuumTransitions = new Map([
  ['returning', 'vacuum_returning'], ['returning_home', 'vacuum_returning'], ['docking', 'vacuum_returning'],
  ['going_to_wash_the_mop', 'vacuum_mop_travel'], ['washing_the_mop', 'vacuum_mop_wash'],
  ['emptying_the_bin', 'vacuum_emptying'],
]);
const vacuumCleaning = new Set(['cleaning', 'spot_cleaning', 'zoned_cleaning', 'segment_cleaning',
  'clean_mop_cleaning', 'segment_clean_mop_cleaning', 'zoned_clean_mop_cleaning']);
const vacuumMopping = new Set(['mopping', 'robot_status_mopping', 'clean_mop_mopping', 'segment_mopping',
  'segment_clean_mop_mopping', 'zoned_mopping', 'zoned_clean_mop_mopping']);
const stoppedVacuum = new Set([...unavailable, 'paused', 'error']);

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

export function sensorPercentage(record) {
  const raw = record?.state;
  const unit = record?.attributes?.unit_of_measurement;
  if ((unit && unit !== '%') || typeof raw !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw.trim())) return;
  const value = Number(raw);
  if (Number.isFinite(value) && value >= 0 && value <= 100) return Math.round(value);
}

function vacuumActivity(activity, states, visible) {
  const { vacuum_entity, status_entity, cleaning_entity, progress_entity, mop_mode_entity } = activity;
  const state = id => id && visible(id) ? stateOf(states, id) : '';
  const vacuum = state(vacuum_entity);
  const status = state(status_entity);
  if (stoppedVacuum.has(vacuum) || status === 'paused' || status === 'error') return null;
  const transition = vacuumTransitions.get(status) ?? vacuumTransitions.get(vacuum);
  if (transition) return { type: transition };

  const cleaning = state(cleaning_entity) === 'on';
  const mopping = vacuumMopping.has(status) || vacuumMopping.has(vacuum);
  const running = mopping || vacuumCleaning.has(status) || vacuumCleaning.has(vacuum);
  if (!cleaning && !running) return null;
  const type = mopping || !inactive.has(state(mop_mode_entity)) ? 'vacuum_mopping' : 'vacuum_cleaning';
  const progress = (cleaning || (!cleaning_entity && running)) && progress_entity && visible(progress_entity)
    ? sensorPercentage(states?.[progress_entity]) : undefined;
  return progress > 0 ? { type, progress } : { type };
}

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

export function applianceActivity(activity, states, now, visible = () => true) {
  if (activity.kind === 'boiler') return boilerElapsed(activity, states, now);
  if (activity.kind === 'vacuum') return vacuumActivity(activity, states, visible);
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
