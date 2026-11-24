import { createBoilerScheduler, isBoilerScheduleProfile } from './boiler-schedule.js';

const DAY = 86400000;
const conditions = new Set(['on','off','unknown','unavailable']);
const timestamp = value => typeof value === 'number' && Number.isFinite(value) ? value * 1000
  : typeof value === 'string' ? Date.parse(value) : NaN;

function sourceOf(record, matchesSchedule) {
  const domain = record?.context_domain;
  if (domain === 'homekit') return 'boiler_homekit';
  if (domain === 'scheduler' || record?.context_event_type === 'automation_triggered') return 'boiler_automation';
  if (domain === 'simple_timer' && !record.context_user_id && matchesSchedule) return 'boiler_schedule_match';
  if (domain === 'simple_timer' || (domain === 'switcher_kis' && record?.context_service === 'turn_on_with_timer')) return 'timed';
  if (record?.context_user_id || domain === 'switch' || domain === 'homeassistant') return 'boiler_manual';
  return 'unknown';
}

function scheduleMatcher(rows, timeZone) {
  if (typeof timeZone !== 'string' || !timeZone) return () => false;
  const recurring = new Set(rows.filter(row => row.editable && row.enabled === true)
    .flatMap(row => row.weekdays.map(day => `${day}:${row.time}`)));
  if (!recurring.size) return () => false;
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {timeZone, weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  } catch { return () => false; }
  return time => {
    const parts = Object.fromEntries(formatter.formatToParts(time).map(part => [part.type, part.value]));
    return recurring.has(`${parts.weekday.toLowerCase()}:${parts.hour}:${parts.minute}`);
  };
}

export function buildBoilerSessions({entity, history = [], logbook = [], schedules = [], timeZone, device, start, end, minimum = 120000}) {
  const matchesSchedule = scheduleMatcher(schedules, timeZone);
  const logEvents = logbook.flatMap(item => {
    const time = timestamp(item?.when);
    return item?.entity_id === entity && conditions.has(item.state) && time >= start && time <= end ?
      [{ time, state: item.state, source: sourceOf(item, item.state === 'on' && matchesSchedule(time)) }] : [];
  });
  const toEvent = item => ({ state: item?.s ?? item?.state, time: timestamp(item?.lc ?? item?.last_changed ?? item?.lu) });
  const events = [...history.map(toEvent), ...logEvents].filter(event => conditions.has(event.state) &&
    Number.isFinite(event.time) && event.time <= end).sort((a,b) => a.time - b.time);
  const liveTime = timestamp(device?.last_changed);
  if (conditions.has(device?.state) && Number.isFinite(liveTime) && liveTime <= end &&
      (!events.length || liveTime >= events.at(-1).time)) {
    events.push({ state: device.state, time: liveTime });
  }
  const sessions = [];
  let opened;
  function finish(time, running) {
    if (!opened) return;
    const since = Math.max(opened.time, start);
    if (time - since >= minimum) {
      const match = logEvents.find(item => item.state === 'on' && Math.abs(item.time - opened.time) <= 1000);
      sessions.push({ start: since, end: time, running, partial: opened.time < start,
        source: match?.source ?? 'unknown' });
    }
    opened = undefined;
  }
  for (const event of events) {
    if (event.state === 'on') opened ??= event;
    else if (event.state === 'off') finish(event.time, false);
    // An unavailable interval cannot be counted as a confirmed heating run.
    else opened = undefined;
  }
  if (device?.state === 'on') finish(end, true);
  return sessions.reverse();
}

function readWindow(hass, entity, end, start) {
  const range = { start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(), entity_ids: [entity] };
  return Promise.allSettled([
    { type:'history/history_during_period', ...range, minimal_response:true, no_attributes:true, significant_changes_only:false },
    { type:'logbook/get_events', ...range },
  ].map(request => Promise.resolve().then(() => hass.callWS(request))));
}

export function openBoilerHistory({host, config, locale, hass, t}) {
  const {entity} = config;
  const document = host.ownerDocument;
  const view = document.defaultView;
  let currentHass = hass;
  let currentState;
  let closed = false;
  let reading = false;
  let shouldRefresh = false;
  const node = (tag, className, text) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text != null) item.textContent = String(text);
    return item;
  };
  const message = key => node('p', 'boiler-history-message', t(key));
  host.replaceChildren(message('boiler_history_loading'));

  async function readSchedules() {
    if (!currentHass?.services?.scheduler || !isBoilerScheduleProfile(config)) return [];
    try { return await createBoilerScheduler(config, () => currentHass, {locale}).list(); }
    catch { return []; }
  }

  function format(options) {
    try { return new Intl.DateTimeFormat(locale, { ...options, timeZone: currentHass?.config?.time_zone }); }
    catch { return new Intl.DateTimeFormat(locale, options); }
  }

  function draw(sessions) {
    if (!sessions.length) { host.replaceChildren(message('boiler_history_empty')); return; }
    const calendar = format({ weekday:'long', year:'numeric', month:'short', day:'numeric' });
    const clock = format({ hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
    const groups = new Map();
    for (const item of sessions) {
      const key = calendar.format(item.start);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    host.replaceChildren(...Array.from(groups, ([day, items]) => {
      const block = node('section', 'boiler-history-day');
      const head = node('header', 'boiler-history-day-title');
      const sum = Math.round(items.reduce((total,item) => total + item.end - item.start, 0) / 60000);
      head.append(node('h4', '', day), node('span', '', t('boiler_total') + ' ' + sum + ' ' + t('duration')));
      block.append(head);
      for (const period of items) {
        const item = node('div', 'boiler-history-row');
        let begin = clock.format(period.start);
        if (period.partial) begin = '≤' + begin;
        const until = period.running ? t('boiler_now') : clock.format(period.end);
        const length = Math.round((period.end - period.start) / 60000);
        item.append(node('span', 'boiler-history-hours', begin + ' – ' + until),
          node('span', 'boiler-history-source', t(period.source)), node('span','boiler-history-length',length + ' ' + t('duration')));
        block.append(item);
      }
      return block;
    }));
  }

  async function refresh() {
    if (closed) return;
    if (reading) { shouldRefresh = true; return; }
    if (typeof currentHass?.callWS !== 'function') { host.replaceChildren(message('boiler_history_error')); return; }
    const end = Date.now(), start = end - 7 * DAY;
    reading = true;
    try {
      const [[states, logbook], schedules] = await Promise.all([readWindow(currentHass, entity, end, start), readSchedules()]);
      if (closed) return;
      if (states.status !== 'fulfilled' && logbook.status !== 'fulfilled') {
        host.replaceChildren(message('boiler_history_error'));
        return;
      }
      const history = Array.isArray(states.value?.[entity]) ? states.value[entity] : [];
      const log = Array.isArray(logbook.value) ? logbook.value : [];
      draw(buildBoilerSessions({entity, history, logbook:log, schedules, timeZone:currentHass.config?.time_zone,
        device:currentHass.states?.[entity], start, end}));
    } finally {
      reading = false;
      if (!closed && shouldRefresh) { shouldRefresh = false; void refresh(); }
    }
  }

  const timer = view.setInterval(() => { void refresh(); }, 90000);
  return {
    update(hass) {
      currentHass = hass;
      const state = hass?.states?.[entity];
      const key = state?.state + ':' + state?.last_changed;
      if (key !== currentState) { currentState = key; void refresh(); }
    },
    dispose() {
      closed = true;
      view.clearInterval(timer);
    },
  };
}

export const boilerHistoryStyles = `
  .boiler-history-host { min-height: 75px; }
  .boiler-history-message { color: var(--secondary); text-align: center; }
  .boiler-history-day { display: grid; gap: 6px; margin-bottom: 12px; }
  .boiler-history-day-title, .boiler-history-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .boiler-history-day-title h4 { margin: 0; font-size: 12px; color: var(--secondary); }
  .boiler-history-day-title span { color: var(--warm); font-size: 12px; text-align: end; font-weight: 720; }
  .boiler-history-row { padding: 8px; min-height: 42px; border-radius: 10px; border: 1px solid var(--soft-line);
    background: var(--control); font-size: 12px; }
  .boiler-history-hours { direction: ltr; font-variant-numeric: tabular-nums; font-weight: 750; }
  .boiler-history-source { color: var(--secondary); }
  .boiler-history-length { font-weight: 750; color: var(--warm); }
  .boiler-tabs { display: grid; grid-template-columns: repeat(auto-fit,minmax(82px,1fr)); gap: 6px; margin-bottom: 8px; }
  .boiler-pane { min-width: 0; }
`;
