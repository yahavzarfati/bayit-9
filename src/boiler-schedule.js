import { isReadOnlyRole } from './device-control.mjs';

export const SCHEDULE_DAYS = Object.freeze(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
const TIMER_SERVICE = 'simple_timer.start_timer';
const ENTITY = /^[a-z_]+\.[a-z0-9_]+$/;
const SCHEDULE_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5][05]$/;
const scheduleHours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const scheduleMinutes = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
const withoutClockReadouts = ['schedule_id', 'entity_id', 'name', 'enabled', 'weekdays', 'repeat_type',
  'start_date', 'end_date', 'timeslots', 'tags', 'timestamps', 'next_entries'];
const slotKeys = ['start', 'stop', 'conditions', 'condition_type', 'track_conditions', 'actions'];
const actionKeys = ['service', 'entity_id', 'service_data'];
const timerKeys = ['entry_id', 'entity_id', 'duration', 'unit', 'reverse_mode'];

class ScheduleError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const reject = code => { throw new ScheduleError(code); };
const available = state => typeof state?.state === 'string' && !['', 'unknown', 'unavailable'].includes(state.state);
const isEntity = (value, domain) => typeof value === 'string' && ENTITY.test(value) && value.startsWith(domain + '.');
const knownKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).every(key => keys.includes(key));
const visible = (hass, entity) => {
  const entry = hass.entities?.[entity];
  return entry?.hidden !== true && !entry?.hidden_by && !entry?.disabled_by;
};
const actionsOf = slot => Array.isArray(slot?.actions) ? slot.actions : [];
const slotsOf = record => Array.isArray(record?.timeslots) ? record.timeslots : [];
const hasService = (hass, domain, service) => !!hass.services?.[domain]?.[service];

export function isBoilerScheduleProfile(config) {
  return config?.kind === 'boiler' && typeof config.entity === 'string' && ENTITY.test(config.entity)
    && isEntity(config.timed?.simple_timer_entity, 'sensor') && !config.timed.start_script;
}

function boilerBinding(config, hass) {
  if (!isBoilerScheduleProfile(config)) return null;
  const timer = config.timed.simple_timer_entity;
  const state = hass?.states?.[timer];
  const entryId = state?.attributes?.entry_id;
  return available(state) && typeof entryId === 'string' && SCHEDULE_ID.test(entryId)
    && state.attributes.switch_entity_id === config.entity ? { timer, entryId } : null;
}

export function canOpenBoilerSchedule(config, hass, hidden) {
  if (!config || isReadOnlyRole(config.role) || typeof hass?.callWS !== 'function' ||
      !(config.schedule || hass.services?.scheduler)) return false;
  const binding = boilerBinding(config, hass);
  return Boolean(binding && [config.entity, binding.timer].every(entity =>
    hass.states?.[entity] && !hidden?.has(entity) && visible(hass, entity)));
}

const guardedScheduleLimits = Object.freeze({ min: 15, max: 300, step: 15 });

function limitsFor(config) {
  if (config.schedule !== undefined) return guardedScheduleLimits;
  const { min_minutes: min = 15, max_minutes: max = 300, step_minutes: step = 15 } = config.timed;
  if (![min, max, step].every(Number.isSafeInteger) || min < 1 || max > 360 || max < min || step < 1) {
    reject('unavailable');
  }
  return { min, max, step };
}

function validDuration(duration, { min, max, step }) {
  return Number.isSafeInteger(duration) && duration >= min && duration <= max
    && (duration - min) % step === 0;
}

const normalDays = (weekdays, daily = false) => {
  if (!Array.isArray(weekdays)) return null;
  if (daily && weekdays.length === 1 && weekdays[0] === 'daily') return [...SCHEDULE_DAYS];
  if (!weekdays.length || new Set(weekdays).size !== weekdays.length || !weekdays.every(day => SCHEDULE_DAYS.includes(day))) {
    return null;
  }
  return SCHEDULE_DAYS.filter(day => weekdays.includes(day));
};

function durationName(duration, locale) {
  if (locale !== 'he') return duration + ' min';
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  if (!hours) return mins + ' דקות';
  const hourText = hours === 1 ? 'שעה' : hours === 2 ? 'שעתיים' : hours + ' שעות';
  return mins ? hourText + ' ו־' + mins + ' דקות' : hourText;
}

function formName(name, duration) {
  const title = name.trim();
  if (!duration) return title;
  const labels = [durationName(duration, 'he'), durationName(duration, 'en')];
  if ([60, 120].includes(duration)) labels.push(duration / 60 + ' שעות');
  const suffix = labels.map(label => ' - ' + label).find(label => title.endsWith(label));
  return suffix ? title.slice(0, -suffix.length).trim() : title;
}

function ownsAction(action, binding) {
  const data = action?.service_data;
  return action?.service === TIMER_SERVICE && action.entity_id == null && data
    && (data.entry_id === binding.entryId && data.entity_id === undefined
      || data.entity_id === binding.timer && data.entry_id === undefined);
}

function scheduleRow(record, binding, limits, hass) {
  const { schedule_id: id, entity_id: entity, name, enabled, weekdays, timeslots } = record ?? {};
  if (typeof id !== 'string' || !SCHEDULE_ID.test(id) || !isEntity(entity, 'switch') || !visible(hass, entity)
      || !slotsOf(record).some(slot => actionsOf(slot).some(action => ownsAction(action, binding)))) return null;
  const [slot] = timeslots;
  const [action] = actionsOf(slot);
  const timer = action?.service_data;
  const time = typeof slot?.start === 'string' && slot.start.endsWith(':00') ? slot.start.slice(0, -3) : '';
  const days = normalDays(weekdays, true);
  const duration = timer?.duration;
  const title = typeof name === 'string' ? name : '';
  const editable = !!(knownKeys(record, withoutClockReadouts) && timeslots.length === 1
    && typeof enabled === 'boolean' && (typeof name === 'string' || name === null)
    && record.repeat_type === 'repeat' && record.start_date === null && record.end_date === null
    && Array.isArray(record.tags) && record.tags.every(tag => typeof tag === 'string')
    && knownKeys(slot, slotKeys) && slot.stop === null && slot.condition_type === null && slot.track_conditions === false
    && Array.isArray(slot.conditions) && !slot.conditions.length && actionsOf(slot).length === 1
    && knownKeys(action, actionKeys) && ownsAction(action, binding) && knownKeys(timer, timerKeys)
    && (timer.unit === undefined || timer.unit === 'min') && (timer.reverse_mode === undefined || timer.reverse_mode === false)
    && TIME.test(time) && validDuration(duration, limits) && days && formName(title, duration).length <= 40);
  const revision = editable ? JSON.stringify([id, entity, name, enabled, slot.start, duration, [...weekdays].sort(),
    [...record.tags].sort(), timer.entry_id ?? null, timer.entity_id ?? null, timer.unit ?? null, timer.reverse_mode ?? null]) : null;
  return { id, entity, title, enabled, time, weekdays: days ?? [],
    duration: validDuration(duration, limits) ? duration : null, name: formName(title, duration),
    editable, revision, entryTarget: timer?.entry_id === binding.entryId, ...(editable && { serviceData: { ...timer } }) };
}

export function createBoilerScheduler(config, getHass, { locale = 'en', retry = [120, 260, 520, 1000] } = {}) {
  if (!isBoilerScheduleProfile(config)) reject('unavailable');
  const limits = limitsFor(config);
  const configured = config.schedule;
  const useGuards = configured !== undefined;
  const saveScript = isEntity(configured?.save_script, 'script') ? configured.save_script.slice(7) : null;
  const deleteScript = isEntity(configured?.delete_script, 'script') ? configured.delete_script.slice(7) : null;
  const binding = () => {
    const hass = getHass();
    const current = boilerBinding(config, hass);
    if (!current) reject('unavailable');
    return current;
  };
  const call = message => getHass().callWS(message);
  const item = id => call({ type: 'scheduler/item', schedule_id: id });
  const records = async () => {
    const list = await call({ type: 'scheduler' });
    if (!Array.isArray(list)) reject('unavailable');
    return list;
  };
  const ready = (domain, service) => {
    const hass = getHass();
    return hass?.user?.is_admin === true && hasService(hass, domain, service);
  };
  const canCreate = () => ready('simple_timer', 'start_timer') && (useGuards
    ? !!saveScript && !!deleteScript && ready('script', saveScript) && ready('script', deleteScript)
    : ready('scheduler', 'add'));
  const parse = (record, attached) => {
    const row = scheduleRow(record, attached, limits, getHass());
    return row ? { ...row, mutable: row.editable && (!useGuards || row.entryTarget) } : null;
  };
  const durationDefault = limits.min + Math.min(Math.round((90 - limits.min) / limits.step), Math.floor((limits.max - limits.min) / limits.step))
    * limits.step;

  const capabilities = () => ({
    create: canCreate(),
    edit: canCreate() && (useGuards || ready('scheduler', 'edit')),
    remove: canCreate() && (useGuards || ready('scheduler', 'remove')),
    toggle: ready('switch', 'turn_on') && ready('switch', 'turn_off'),
  });

  async function list() {
    const linked = binding();
    const results = await records();
    if (binding().entryId !== linked.entryId) reject('changed');
    return results.map(record => parse(record, linked)).filter(Boolean);
  }

  function validate(draft) {
    const name = typeof draft?.name === 'string' ? draft.name.trim() : null;
    const days = normalDays(draft?.weekdays);
    if (name === null || name.length > 40 || !TIME.test(draft.time) || !validDuration(draft.duration, limits) || !days) {
      reject('invalid');
    }
    return { name, time: draft.time, duration: draft.duration, weekdays: days };
  }

  async function preflight(saved, attached) {
    if (!saved?.editable || typeof saved.id !== 'string' || !SCHEDULE_ID.test(saved.id) || !saved.revision) reject('changed');
    const current = parse(await item(saved.id), attached);
    const state = getHass().states?.[current?.entity];
    if (binding().entryId !== attached.entryId || !current?.mutable || current.revision !== saved.revision
        || !state || !['on', 'off'].includes(state.state)) reject('changed');
    return { current, lastUpdated: state.last_updated };
  }

  async function send(domain, service, service_data, target, returns = false) {
    if (!ready(domain, service)) reject('unavailable');
    const result = await call({ type: 'call_service', domain, service, service_data,
      ...(target && { target }), ...(returns && { return_response: true }) });
    if (returns && result?.response?.success !== true) reject('uncertain');
  }

  async function observe(check) {
    for (const pause of [0, ...retry]) {
      if (pause) await new Promise(resolve => setTimeout(resolve, pause));
      try {
        if (await check()) return;
      } catch { /* Wait briefly for HA's schedule entity to be registered or replaced. */ }
    }
    reject('uncertain');
  }

  const sameSettings = (entry, draft) => entry?.editable && entry.name === draft.name && entry.time === draft.time
    && entry.duration === draft.duration && entry.weekdays.join(',') === draft.weekdays.join(',');
  const titleFor = draft => draft.name + ' - ' + durationName(draft.duration, locale);
  const profileName = locale === 'he' ? 'דוד' : 'Boiler';
  const dataFor = (draft, attached, serviceData = { entry_id: attached.entryId }) => ({
    name: titleFor(draft), weekdays: draft.weekdays, repeat_type: 'repeat', timeslots: [{
      start: draft.time + ':00', actions: [{ service: TIMER_SERVICE,
        service_data: { ...serviceData, duration: draft.duration } }],
    }],
  });

  function requireCurrentForm(stillCurrent) {
    if (stillCurrent && !stillCurrent()) reject('abandoned');
  }

  async function create(input, stillCurrent) {
    if (!canCreate()) reject('unavailable');
    const draft = validate(input);
    draft.name ||= useGuards ? 'דוד' : profileName;
    const linked = binding();
    const before = new Set((await records()).map(record => record.schedule_id));
    if (binding().entryId !== linked.entryId) reject('changed');
    requireCurrentForm(stillCurrent);
    if (useGuards) {
      await send('script', saveScript, { schedule_entity: '', expected_revision: '', schedule_name: draft.name,
        schedule_time: draft.time, duration: draft.duration, weekdays: draft.weekdays }, null, true);
    } else {
      await send('scheduler', 'add', dataFor(draft, linked));
    }
    await observe(async () => (await list()).filter(entry => !before.has(entry.id) && sameSettings(entry, draft)).length === 1);
  }

  async function update(saved, input, stillCurrent) {
    if (!capabilities().edit) reject('unavailable');
    const draft = validate(input);
    draft.name ||= useGuards ? 'דוד' : profileName;
    const linked = binding();
    const { current, lastUpdated } = await preflight(saved, linked);
    if (sameSettings(current, draft)) return;
    requireCurrentForm(stillCurrent);
    if (useGuards) {
      if (!current.entryTarget || !lastUpdated || lastUpdated !== saved.lastUpdated) reject('changed');
      await send('script', saveScript, { schedule_entity: current.entity, expected_revision: lastUpdated,
        schedule_name: draft.name, schedule_time: draft.time, duration: draft.duration, weekdays: draft.weekdays }, null, true);
    } else {
      const data = dataFor(draft, linked, current.serviceData);
      if (current.name === draft.name && current.duration === draft.duration) delete data.name;
      await send('scheduler', 'edit', { entity_id: current.entity, ...data });
    }
    await observe(async () => sameSettings(parse(await item(saved.id), binding()), draft));
  }

  async function remove(saved, stillCurrent) {
    if (!capabilities().remove) reject('unavailable');
    const { current, lastUpdated } = await preflight(saved, binding());
    requireCurrentForm(stillCurrent);
    if (useGuards) {
      if (!current.entryTarget || !lastUpdated || lastUpdated !== saved.lastUpdated) reject('changed');
      await send('script', deleteScript, { schedule_entity: current.entity, expected_revision: lastUpdated }, null, true);
    } else {
      await send('scheduler', 'remove', { entity_id: current.entity });
    }
    await observe(async () => await item(saved.id) === null);
  }

  async function setEnabled(saved, enabled) {
    if (!capabilities().toggle || typeof enabled !== 'boolean'
        || (enabled && !ready('simple_timer', 'start_timer'))) reject('unavailable');
    const { current } = await preflight(saved, binding());
    if (current.enabled === enabled) return;
    await send('switch', enabled ? 'turn_on' : 'turn_off', {}, { entity_id: current.entity });
    await observe(async () => {
      const fresh = parse(await item(saved.id), binding());
      return fresh?.editable && fresh.enabled === enabled;
    });
  }

  function revisionOf(row) {
    return { ...row, lastUpdated: getHass().states?.[row.entity]?.last_updated };
  }

  return { list, create, update, remove, setEnabled, capabilities, limits, revisionOf,
    defaultDuration: Math.max(limits.min, durationDefault) };
}

const text = {
  en: {
    loading: 'Loading schedules…', unavailable: 'No compatible Scheduler and Simple Timer setup was found for this boiler.',
    empty: 'No boiler schedules yet.', add: 'Add schedule', refresh: 'Refresh', edit: 'Edit', enable: 'Enable', disable: 'Disable',
    enabled: 'Enabled', disabled: 'Disabled', scheduleSwitch: 'Schedule status', custom: 'Managed in Scheduler', name: 'Name', time: 'Start time',
    hour: 'Hour', minute: 'Minutes', namePlaceholder: 'e.g. Morning heat',
    duration: 'Duration', days: 'Days', daily: 'Every day', work: 'Weekdays', weekend: 'Weekend', clear: 'Clear',
    save: 'Save schedule', cancel: 'Cancel', remove: 'Delete schedule', confirm: 'Delete this schedule?',
    yes: 'Delete', invalid: 'Check the time, duration and days. Select at least one day.',
    changed: 'This schedule changed. Refresh the list and open it again.', error: 'The request failed. Refresh and check the schedule.',
    uncertain: 'The change could not be confirmed. Refresh the list before trying again.', saved: 'Schedule saved.',
    removed: 'Schedule deleted.', updated: 'Schedule status updated.',
  },
  he: {
    loading: 'טוען תזמונים…', unavailable: 'לא נמצאה הגדרה מתאימה של Scheduler ו־Simple Timer לדוד הזה.',
    empty: 'עדיין אין תזמונים לדוד.', add: 'הוספת תזמון', refresh: 'רענון', edit: 'עריכה', enable: 'הפעלה', disable: 'השבתה',
    enabled: 'פעיל', disabled: 'מושבת', scheduleSwitch: 'מצב התזמון', custom: 'מנוהל במתזמן', name: 'שם', time: 'שעת התחלה',
    hour: 'שעה', minute: 'דקות', namePlaceholder: 'למשל, חימום בוקר',
    duration: 'משך חימום', days: 'ימי הפעלה', daily: 'כל יום', work: 'ימי חול', weekend: 'סוף שבוע', clear: 'נקה',
    save: 'שמירת תזמון', cancel: 'ביטול', remove: 'מחיקת תזמון', confirm: 'למחוק את התזמון הזה?',
    yes: 'מחיקה', invalid: 'בדקו את השעה והמשך ובחרו לפחות יום אחד.',
    changed: 'התזמון השתנה. רעננו את הרשימה ופתחו אותו שוב.', error: 'הבקשה נכשלה. רעננו ובדקו את התזמון.',
    uncertain: 'השינוי טרם אומת. רעננו את הרשימה לפני ניסיון נוסף.', saved: 'התזמון נשמר.',
    removed: 'התזמון נמחק.', updated: 'מצב התזמון עודכן.',
  },
};

const styles = [
  '.bayit-boiler-schedules { display:grid; gap:12px; min-width:0; }',
  '.bayit-boiler-schedules [hidden] { display:none!important; }',
  '.bayit-boiler-schedules :is(.schedule-toolbar,.schedule-row-actions,.schedule-days,.schedule-fields) { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }',
  '.bayit-boiler-schedules .schedule-days .control-button { flex:1; padding-inline:0; }',
  '.bayit-boiler-schedules .schedule-row,.bayit-boiler-schedules .schedule-form { border:1px solid var(--edge,rgba(255,255,255,.25)); border-radius:14px; padding:12px; }',
  '.bayit-boiler-schedules .schedule-list,.bayit-boiler-schedules .schedule-form { display:grid; gap:10px; }',
  '.bayit-boiler-schedules .schedule-row { display:grid; gap:7px; min-width:0; }',
  '.bayit-boiler-schedules .schedule-summary { display:grid; gap:4px; overflow-wrap:anywhere; }',
  '.bayit-boiler-schedules .schedule-details { display:flex; gap:6px; flex-wrap:wrap; font-size:.85em; }',
  '.bayit-boiler-schedules .schedule-is-enabled { color:var(--warm,currentColor); }',
  '.schedule-compact { gap:6px; margin-block-start:8px; padding:6px; border:1px solid var(--soft-line); border-radius:12px; }',
  '.schedule-compact .schedule-list { gap:5px; }',
  '.schedule-compact:has(> .schedule-form:not([hidden])) > :is(.schedule-toolbar,.schedule-list) { display:none; }',
  '.boiler-panel:has(> .boiler-schedule-host:not([hidden]) > .schedule-compact > .schedule-form:not([hidden])) > .boiler-pane:first-child { display:none; }',
  '.schedule-compact:has(> .schedule-form:not([hidden])) { margin:0; padding:0; border:0; }',
  '.schedule-compact .schedule-toolbar > .schedule-add { flex:1; }',
  '.schedule-compact .schedule-row { display:flex; align-items:stretch; gap:0; padding:0; border:1px solid var(--soft-line); border-radius:8px; background:var(--room-tile-fill); }',
  '.schedule-compact .schedule-summary { flex:1; min-width:0; display:flex; flex-wrap:wrap; align-content:center; align-items:center; gap:2px 5px; min-height:44px; padding:4px 7px; font-size:12px; text-align:start; }',
  '.schedule-compact .schedule-summary.control-button { justify-content:flex-start; border:0; border-radius:8px; background:transparent; }',
  '.schedule-compact .schedule-details { gap:2px 5px; font-size:inherit; align-items:center; }',
  '.schedule-compact .schedule-details > :not(:last-child)::after { content:" ·"; }',
  '.schedule-compact .schedule-toggle { flex:0 0 44px; min-height:44px; display:grid; place-items:center; padding:0; border:0; background:transparent; border-radius:8px; }',
  '.schedule-switch-track { display:flex; align-items:center; width:26px; height:14px; padding:1px; border:1px solid var(--soft-line); border-radius:999px; color:var(--secondary); }',
  '.schedule-switch-track::after { content:""; width:10px; height:10px; border-radius:50%; background:currentColor; }',
  '.schedule-toggle[aria-checked=true] .schedule-switch-track { justify-content:flex-end; background:#83d9aa; color:#143c29; border-color:transparent; }',
  '.bayit-boiler-schedules .schedule-form label { display:grid; gap:5px; flex:1; min-width:0; }',
  '.bayit-boiler-schedules .schedule-form input,.bayit-boiler-schedules .schedule-form select { width:100%; box-sizing:border-box; min-height:44px; font:inherit; color:inherit; border:1px solid var(--edge,rgba(255,255,255,.28)); border-radius:10px; background:transparent; padding:6px 9px; }',
  '.bayit-boiler-schedules .schedule-form select option { color:CanvasText; background:Canvas; }',
  '.schedule-compact .schedule-form { gap:8px; padding:8px; border:1px solid var(--soft-line); }',
  '.schedule-compact .schedule-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }',
  '.schedule-compact .schedule-fields > label:first-child { grid-column:1 / -1; }',
  '.schedule-compact .schedule-form .schedule-field { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:6px; min-height:48px; padding:2px 6px; border:1px solid var(--soft-line); border-radius:8px; background:var(--room-tile-fill,transparent); }',
  '.schedule-compact .schedule-field > ha-icon { color:var(--warm); --mdc-icon-size:18px; width:18px; height:18px; margin-inline:3px; pointer-events:none; }',
  '.schedule-field-copy { display:grid; align-content:center; min-width:0; }',
  '.schedule-field-caption,.schedule-duration-heading > span { color:var(--secondary); font-size:11px; line-height:1.2; }',
  '.schedule-compact .schedule-field-copy :is(input,select) { display:block; border:0; border-radius:4px; min-height:30px; padding:1px 2px; line-height:1.2; font-weight:650; }',
  '.schedule-compact .schedule-field-copy input::placeholder { color:var(--secondary); opacity:1; }',
  '.schedule-compact .schedule-field-copy select { direction:ltr; text-align:end; }',
  '.schedule-compact .schedule-field:focus-within { border-color:var(--line); }',
  '.schedule-compact .schedule-day-group { gap:5px; }',
  '.schedule-compact .schedule-day-group legend { margin-block-end:3px; }',
  '.schedule-compact .schedule-day-presets { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:4px; }',
  '.schedule-compact .schedule-days { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,40px),1fr)); gap:3px; }',
  '.schedule-compact :is(.schedule-day-presets,.schedule-days,.schedule-form-actions) .control-button { min-width:0; min-height:44px; padding:3px; border-radius:8px; overflow-wrap:anywhere; }',
  '.schedule-compact .schedule-day-presets .control-button { font-size:11px; }',
  '.schedule-compact .schedule-days .control-button[aria-pressed=true] { color:var(--warm); border-color:var(--warm); }',
  '.schedule-compact .schedule-duration { display:grid; gap:2px; padding:4px 7px; border:1px solid var(--soft-line); border-radius:8px; background:var(--room-tile-fill,transparent); }',
  '.schedule-compact .schedule-duration-heading { display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:4px 8px; }',
  '.schedule-compact .schedule-duration-value { color:var(--ink,currentColor); font-size:.88em; }',
  '.schedule-compact .schedule-form input.schedule-duration-range { direction:ltr; margin:0; padding:0; border:0; accent-color:var(--warm,auto); }',
  '@container (min-width:375px) { .schedule-compact .schedule-duration { grid-template-columns:minmax(0,1fr) minmax(160px,1.65fr); align-items:center; gap:6px; } .schedule-compact .schedule-duration-heading { display:grid; gap:2px; } }',
  '.schedule-compact .schedule-form-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }',
  '.schedule-compact .schedule-form-actions:has(> .schedule-form-remove) { grid-template-columns:repeat(3,minmax(0,1fr)); }',
  '.schedule-compact .schedule-form-actions [type=submit]:not(:disabled) { color:var(--warm); border-color:var(--warm); }',
  '.bayit-boiler-schedules .schedule-form-title { margin:0; font-size:1em; }',
  '.bayit-boiler-schedules .schedule-day-group { margin:0; min-width:0; border:0; padding:0; display:grid; gap:7px; }',
  '.bayit-boiler-schedules .schedule-description { margin:0; }',
  '.bayit-boiler-schedules .schedule-confirm { border:1px solid var(--critical,currentColor); display:grid; gap:8px; padding:10px; border-radius:10px; }',
].join('\n');

export function createBoilerSchedulePanel(config, {
  host, viewport, hass, locale = 'en', compact = false, pauseScrollMemory, isCurrent = () => true,
}) {
  const t = text[locale] ?? text.en;
  const make = (tag, cls, value) => {
    const node = host.ownerDocument.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  let currentHass = hass;
  let gone = false;
  let pending = false;
  let needsRefresh = false;
  let epoch = 0;
  let schedule;
  let unsubscribe;
  let listRows = [];
  let draft;
  let formOrigin;
  let resumeScrollMemory;
  let confirmedRemove = false;
  let ready = false;
  const editControls = new Map();
  const region = make('section', compact ? 'bayit-boiler-schedules schedule-compact' : 'bayit-boiler-schedules');
  region.lang = locale;
  region.dir = locale === 'he' ? 'rtl' : 'ltr';
  region.append(make('style', '', styles));
  const toolbar = make('div', 'schedule-toolbar');
  const notice = make('p', 'schedule-description', t.loading);
  notice.setAttribute('role', 'status');
  const list = make('div', 'schedule-list');
  const form = make('form', 'schedule-form');
  form.hidden = true;
  region.append(toolbar, notice, list, form);
  host.append(region);
  const button = (msg, fn) => {
    const node = make('button', 'control-button', msg);
    node.type = 'button';
    node.onclick = fn;
    return node;
  };
  const add = button(t.add, () => openForm());
  const refreshing = button(t.refresh, () => { void refresh(); });
  if (compact) {
    add.classList.add('schedule-add');
    refreshing.classList.add('round-action');
    refreshing.setAttribute('aria-label', t.refresh);
    refreshing.title = t.refresh;
    const refreshIcon = make('ha-icon');
    refreshIcon.setAttribute('icon', 'mdi:refresh');
    refreshIcon.setAttribute('aria-hidden', 'true');
    refreshing.replaceChildren(refreshIcon);
  }
  add.hidden = true;
  toolbar.append(add, refreshing);
  const short = locale === 'he' ? ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const dayNames = locale === 'he' ? ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function message(value) {
    notice.hidden = !value;
    notice.textContent = value || '';
  }

  function syncButtons() {
    region.setAttribute('aria-busy', String(pending));
    const permissions = schedule?.capabilities();
    add.hidden = !ready || needsRefresh || !permissions?.create || !!draft;
    refreshing.disabled = pending;
    for (const node of form.querySelectorAll('button, input, select')) {
      node.disabled = pending || (needsRefresh && node.hasAttribute('data-schedule-commit'));
    }
    for (const node of list.querySelectorAll('button')) node.disabled = !ready || pending || needsRefresh || !!draft;
  }

  function renderList() {
    const caps = schedule.capabilities();
    editControls.clear();
    list.replaceChildren();
    for (const row of listRows) {
      const tile = make('section', 'schedule-row');
      const rowName = row.name || row.title || row.time;
      const canToggle = row.mutable && caps.toggle;
      const canEdit = row.mutable && caps.edit;
      const edit = canEdit ? button(t.edit, () => openForm(row)) : undefined;
      if (edit) {
        edit.setAttribute('aria-label', t.edit + ' · ' + rowName);
        editControls.set(row.id, edit);
      }
      const summary = compact && edit ? edit : make('div');
      summary.classList.add('schedule-summary');
      summary.replaceChildren(make('strong', '', (compact ? rowName : row.title || row.name) || t.name));
      const details = make('span', 'schedule-details');
      if (row.time) {
        const time = make('bdi', '', row.time);
        time.dir = 'ltr';
        details.append(time);
      }
      if (row.weekdays.length) details.append(make('span', '', row.weekdays.length === 7
        ? t.daily : row.weekdays.map(day => short[SCHEDULE_DAYS.indexOf(day)]).join(' · ')));
      if (compact && row.duration && row.name) details.append(make('span', '', durationName(row.duration, locale)));
      if (!compact || !canToggle) details.append(make('span', row.enabled ? 'schedule-is-enabled' : '',
        !row.mutable ? t.custom : row.enabled ? t.enabled : t.disabled));
      summary.append(details);
      const toggle = canToggle ? button(row.enabled ? t.disable : t.enable,
        () => operate(() => schedule.setEnabled(schedule.revisionOf(row), !row.enabled), t.updated)) : undefined;
      tile.append(summary);
      if (compact) {
        if (toggle) {
          toggle.classList.add('schedule-toggle');
          toggle.setAttribute('role', 'switch');
          toggle.setAttribute('aria-checked', String(row.enabled));
          toggle.setAttribute('aria-label', t.scheduleSwitch + ' · ' + rowName);
          toggle.replaceChildren(make('span', 'schedule-switch-track'));
          tile.append(toggle);
        }
      } else {
        const actions = make('div', 'schedule-row-actions');
        if (toggle) {
          toggle.setAttribute('aria-label', toggle.textContent + ' · ' + rowName);
          actions.append(toggle);
        }
        if (edit) actions.append(edit);
        tile.append(actions);
      }
      list.append(tile);
    }
    syncButtons();
  }

  async function refresh({ quiet = false, keepMessage = false } = {}) {
    if (gone || !schedule) return;
    const run = ++epoch;
    if (!quiet) {
      pending = true;
      message(t.loading);
      syncButtons();
    }
    try {
      const rows = await schedule.list();
      if (gone || run !== epoch) return;
      ready = true;
      if (!quiet) needsRefresh = false;
      listRows = rows;
      renderList();
      if (!keepMessage && (!quiet || !draft) && !needsRefresh) message(draft || listRows.length ? '' : t.empty);
    } catch {
      if (gone || run !== epoch) return;
      ready = false;
      if (!quiet || !listRows.length) message(t.unavailable);
    } finally {
      if (!gone && run === epoch) {
        if (!quiet) pending = false;
        syncButtons();
      }
    }
  }

  function focusInPanel(target, atStart = false) {
    target.focus({ preventScroll: true });
    if (!viewport?.offsetHeight) return;
    const visible = viewport.getBoundingClientRect();
    const bounds = target.getBoundingClientRect();
    const above = bounds.top - visible.top - 8;
    const below = bounds.bottom - visible.bottom + 8;
    const scale = visible.height / viewport.offsetHeight;
    if (scale > 0) viewport.scrollTop += (atStart || above < 0 ? above : Math.max(0, below)) / scale;
  }

  function resumeRememberingScroll() {
    resumeScrollMemory?.();
    resumeScrollMemory = undefined;
  }

  function restoreFormOrigin({ id, scrollTop }) {
    resumeRememberingScroll();
    if (viewport) viewport.scrollTop = scrollTop;
    const control = id ? editControls.get(id) : add;
    focusInPanel(control && !control.hidden && !control.disabled ? control : refreshing);
  }

  function closeForm() {
    const origin = formOrigin;
    draft = undefined;
    formOrigin = undefined;
    confirmedRemove = false;
    form.hidden = true;
    form.replaceChildren();
    syncButtons();
    return origin;
  }

  function openForm(row) {
    if (pending || !ready || !schedule || row && !row.mutable) return;
    const selected = new Set(row?.weekdays);
    formOrigin = { id: row?.id, scrollTop: viewport?.scrollTop ?? 0 };
    resumeScrollMemory = pauseScrollMemory?.();
    draft = row ? schedule.revisionOf(row) : {};
    message('');
    form.replaceChildren();
    const heading = make('h3', 'schedule-form-title', row ? t.edit + ' · ' + (row.name || row.title || row.time) : t.add);
    heading.tabIndex = -1;
    const fields = make('div', 'schedule-fields');
    const title = make('input');
    title.type = 'text';
    title.maxLength = 40;
    title.value = row?.name ?? '';
    const field = (label, control, glyph) => {
      const wrapper = make('label', compact ? 'schedule-field' : '');
      const caption = make('span', compact ? 'schedule-field-caption' : '', label);
      if (compact) {
        const icon = make('ha-icon');
        icon.setAttribute('icon', glyph);
        icon.setAttribute('aria-hidden', 'true');
        const copy = make('span', 'schedule-field-copy');
        copy.append(caption, control);
        wrapper.append(icon, copy);
      } else wrapper.append(caption, control);
      return wrapper;
    };
    const initialTime = row?.time ?? '14:30';
    let readTime;
    fields.append(field(t.name, title, 'mdi:form-textbox'));
    if (compact) {
      title.placeholder = t.namePlaceholder;
      const clockPart = (values, current) => {
        const select = make('select');
        for (const value of values) {
          const option = make('option', '', value);
          option.value = value;
          select.append(option);
        }
        select.required = true;
        select.value = current;
        return select;
      };
      const [currentHour, currentMinute] = initialTime.split(':');
      const hours = clockPart(scheduleHours, currentHour);
      const minutes = clockPart(scheduleMinutes, currentMinute);
      fields.append(field(t.hour, hours, 'mdi:clock-outline'), field(t.minute, minutes, 'mdi:timer-outline'));
      readTime = () => hours.value + ':' + minutes.value;
    } else {
      const time = make('input');
      time.type = 'time';
      time.step = '300';
      time.required = true;
      time.value = initialTime;
      fields.append(field(t.time, time));
      readTime = () => time.value;
    }
    const { min, max, step } = schedule.limits;
    const duration = make(compact ? 'input' : 'select');
    const initialDuration = row?.duration ?? schedule.defaultDuration;
    let durationField;
    if (compact) {
      duration.type = 'range';
      duration.className = 'schedule-duration-range';
      duration.setAttribute('aria-label', t.duration);
      duration.min = min;
      duration.max = min + Math.floor((max - min) / step) * step;
      duration.step = step;
      duration.value = initialDuration;
      const value = make('output', 'schedule-duration-value');
      value.setAttribute('aria-hidden', 'true');
      const updateDuration = () => {
        const caption = durationName(duration.valueAsNumber, locale);
        value.value = caption;
        duration.setAttribute('aria-valuetext', caption);
      };
      duration.addEventListener('input', updateDuration);
      updateDuration();
      durationField = make('label', 'schedule-duration');
      const label = make('span', 'schedule-duration-heading');
      label.append(make('span', '', t.duration), value);
      durationField.append(label, duration);
    } else {
      for (let minutes = min; minutes <= max; minutes += step) {
        const option = make('option', '', durationName(minutes, locale));
        option.value = minutes;
        duration.append(option);
      }
      duration.value = initialDuration;
      fields.append(field(t.duration, duration));
    }

    const group = make('fieldset', 'schedule-day-group');
    group.append(make('legend', '', t.days));
    const weekdays = make('div', 'schedule-days');
    const dayButtons = SCHEDULE_DAYS.map((day, index) => {
      const control = button(short[index], () => {
        if (selected.has(day)) selected.delete(day);
        else selected.add(day);
        markDays();
      });
      control.setAttribute('aria-label', dayNames[index]);
      weekdays.append(control);
      return control;
    });
    function markDays() {
      for (const [index, day] of SCHEDULE_DAYS.entries()) dayButtons[index].setAttribute('aria-pressed', String(selected.has(day)));
    }
    const quick = make('div', compact ? 'schedule-toolbar schedule-day-presets' : 'schedule-toolbar');
    const workdays = locale === 'he' ? SCHEDULE_DAYS.slice(0, 5) : SCHEDULE_DAYS.slice(1, 6);
    const weekend = SCHEDULE_DAYS.filter(day => !workdays.includes(day));
    for (const [name, days] of [[t.daily, SCHEDULE_DAYS], [t.work, workdays], [t.weekend, weekend], [t.clear, []]]) {
      quick.append(button(name, () => {
        selected.clear();
        for (const day of days) selected.add(day);
        markDays();
      }));
    }
    markDays();
    group.append(...(compact ? [quick, weekdays] : [weekdays, quick]));
    const commands = make('div', compact ? 'schedule-toolbar schedule-form-actions' : 'schedule-toolbar');
    const submit = button(t.save);
    submit.type = 'submit';
    submit.setAttribute('data-schedule-commit', '');
    commands.append(submit, button(t.cancel, () => {
      const origin = closeForm();
      message(listRows.length ? '' : t.empty);
      if (origin) restoreFormOrigin(origin);
    }));
    const confirmation = make('div', 'schedule-confirm');
    confirmation.hidden = true;
    if (row && schedule.capabilities().remove) {
      const deletion = button(t.remove, () => {
        confirmedRemove = true;
        confirmation.hidden = false;
        cancelDelete.focus({ preventScroll: true });
      });
      if (compact) deletion.classList.add('schedule-form-remove');
      const acceptDelete = button(t.yes, () => {
        if (confirmedRemove && draft?.id === row.id) {
          void operate(stillCurrent => schedule.remove(draft, stillCurrent), t.removed);
        }
      });
      acceptDelete.setAttribute('data-schedule-commit', '');
      const cancelDelete = button(t.cancel, () => {
        confirmedRemove = false;
        confirmation.hidden = true;
        deletion.focus({ preventScroll: true });
      });
      const choices = make('div', 'schedule-toolbar');
      choices.append(cancelDelete, acceptDelete);
      confirmation.append(make('strong', '', t.confirm), choices);
      commands.append(deletion);
    }
    form.onsubmit = event => {
      event.preventDefault();
      const payload = { name: title.value, time: readTime(), duration: Number(duration.value), weekdays: [...selected] };
      void operate(stillCurrent => row ? schedule.update(draft, payload, stillCurrent)
        : schedule.create(payload, stillCurrent), t.saved);
    };
    form.append(heading, fields, group);
    if (durationField) form.append(durationField);
    form.append(commands, confirmation);
    form.hidden = false;
    syncButtons();
    focusInPanel(heading, true);
  }

  async function operate(action, success) {
    if (gone || pending || !ready || needsRefresh) return;
    epoch++;
    pending = true;
    message('');
    syncButtons();
    const submittedDraft = draft;
    const stillCurrent = () => !gone && isCurrent() && form.isConnected && !form.hidden && submittedDraft === draft;
    let origin;
    try {
      await action(stillCurrent);
      if (gone || (submittedDraft && !stillCurrent())) return;
      origin = closeForm();
      message(success);
      await refresh({ quiet: true, keepMessage: true });
    } catch (error) {
      if (!gone && error?.code !== 'abandoned' && (!submittedDraft || stillCurrent())) {
        if (error?.code === 'uncertain') needsRefresh = true;
        message(t[error?.code] ?? t.error);
      }
    } finally {
      if (!gone) {
        pending = false;
        syncButtons();
        if (origin) restoreFormOrigin(origin);
      }
    }
  }

  const currentLink = () => boilerBinding(config, currentHass)?.entryId;
  let link = currentLink();
  try {
    schedule = createBoilerScheduler(config, () => currentHass, { locale });
    void refresh();
    const connection = currentHass?.connection;
    if (typeof connection?.subscribeMessage === 'function') {
      void connection.subscribeMessage(event => {
        if (!gone && !pending && !draft && !['scheduler_timer_updated', 'scheduler_timer_finished'].includes(event?.event)) {
          void refresh({ quiet: true });
        }
      }, { type: 'scheduler_updated' }).then(cancel => {
        if (gone) void cancel();
        else unsubscribe = cancel;
      }).catch(() => {});
    }
  } catch {
    message(t.unavailable);
  }
  return {
    update(next) {
      currentHass = next;
      const attached = currentLink();
      if (attached === link) return;
      link = attached;
      if (!pending) void refresh({ quiet: !!listRows.length });
    },
    destroy() {
      gone = true;
      if (unsubscribe) void Promise.resolve(unsubscribe()).catch(() => {});
      region.remove();
      resumeRememberingScroll();
    },
  };
}
