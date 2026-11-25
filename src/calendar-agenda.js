const calendarId = /^calendar\.[a-z0-9_]+$/;
const weatherId = /^weather\.[a-z0-9_]+$/;
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const notReady = new Set(['unknown', 'unavailable']);
let nextAgendaId = 0;

export function calendarAccent(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
}

export function normalizeCalendarAgenda(value, visibleWeather = () => true) {
  if (value?.enabled !== true) return undefined;
  const weather = value.weather_entity;
  return { enabled: true, ...(value.show_month === true && { show_month: true }),
    ...(typeof weather === 'string' && weatherId.test(weather) &&
    visibleWeather(weather) && { weather_entity: weather }) };
}

export function supportsDailyForecast(state) {
  const features = state?.attributes?.supported_features;
  return Number.isInteger(features) && (features & 1) === 1;
}

function dayKey(value) {
  return [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part, index) => String(part).padStart(index ? 2 : 4, '0')).join('-');
}

export function agendaWindow(now) {
  const [year, month, day] = [now.getFullYear(), now.getMonth(), now.getDate()];
  const start = new Date(year, month, day);
  const tomorrow = new Date(year, month, day + 1);
  const end = new Date(year, month, day + 7);
  return { start, tomorrow, end, firstDay: dayKey(start), afterLastDay: dayKey(end) };
}

function calendarDay(value) {
  if (typeof value !== 'string' || !isoDay.test(value)) return undefined;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(+date) && date.toISOString().startsWith(value) ? value : undefined;
}

function eventTime(value) {
  const text = typeof value === 'string' ? value : value?.dateTime;
  return typeof text === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)
    ? Date.parse(text) : NaN;
}

function normalizedEvent(event, now, range) {
  if (typeof event?.summary !== 'string') return undefined;
  const location = typeof event.location === 'string' ? event.location : '';
  const startDay = calendarDay(event.start?.date ?? event.start);
  if (startDay) {
    const endDay = calendarDay(event.end?.date ?? event.end);
    if (!endDay || endDay <= startDay || endDay <= range.firstDay || startDay >= range.afterLastDay) return undefined;
    return { summary: event.summary, day: startDay < range.firstDay ? range.firstDay : startDay,
      startDay, endDay, signature: JSON.stringify([event.summary, startDay, endDay, location]) };
  }
  const start = eventTime(event.start);
  if (!Number.isFinite(start) || start >= +range.end) return undefined;
  const suppliedEnd = eventTime(event.end);
  const end = suppliedEnd >= start ? suppliedEnd : start;
  if (end <= +now) return undefined;
  return { summary: event.summary, day: dayKey(new Date(Math.max(start, +range.start))),
    start, end, signature: JSON.stringify([event.summary, start, end, location]) };
}

export function buildCalendarAgenda(sources, now, range = agendaWindow(now)) {
  const unique = new Map();
  for (const { source, events } of sources) {
    if (!Array.isArray(events)) continue;
    for (const event of events) {
      const normalized = normalizedEvent(event, now, range);
      if (!normalized) continue;
      const { signature, ...row } = normalized;
      const existing = unique.get(signature);
      if (!existing) unique.set(signature, { ...row, sources: [source] });
      else if (!existing.sources.some(item => item.entity === source.entity)) existing.sources.push(source);
    }
  }
  const rows = [...unique.values()].sort((a, b) => a.day.localeCompare(b.day) ||
    (a.start === b.start ? 0 : (a.start ?? -Infinity) - (b.start ?? -Infinity)));
  const days = new Map();
  let nextChange = +range.tomorrow;
  for (const row of rows) {
    if (!days.has(row.day)) days.set(row.day, { day: row.day, rows: [] });
    days.get(row.day).rows.push(row);
    if (row.end !== undefined) nextChange = Math.min(nextChange, row.end);
  }
  const full = [...days.values()];
  const compact = [];
  let remaining = 6;
  for (const { day, rows: group } of full.slice(0, 4)) {
    if (remaining === 0) break;
    const rowsToShow = group.slice(0, remaining);
    compact.push({ day, rows: rowsToShow });
    remaining -= rowsToShow.length;
  }
  const count = full.reduce((total, group) => total + group.rows.length, 0);
  return { full, compact, count, canExpand: count > 6 || full.length > 4, nextChange };
}

const words = {
  en: {
    loading: 'Loading calendars…', empty: 'No upcoming events in the next 7 days.',
    unavailable: 'Calendars are unavailable right now.', partial: 'Some calendars are unavailable right now.',
    partialDetail: 'Events from available calendars are shown below.',
    partialEmpty: 'No upcoming events in the available calendars.',
    choose: 'Choose calendars in the dashboard settings.', show: 'Show the full week', hide: 'Show less',
    allDay: 'All day', until: 'Until',
  },
  he: {
    loading: 'טוען יומנים…', empty: 'אין אירועים ב־7 הימים הקרובים.',
    unavailable: 'היומנים אינם זמינים כרגע.', partial: 'חלק מהיומנים אינם זמינים כרגע.',
    partialDetail: 'מוצגים כאן האירועים מהיומנים הזמינים.',
    partialEmpty: 'אין אירועים קרובים ביומנים הזמינים.',
    choose: 'אפשר לבחור יומנים בהגדרות הדשבורד.', show: 'הצגת השבוע המלא', hide: 'תצוגה מקוצרת',
    allDay: 'כל היום', until: 'עד',
  },
};

const weatherIcons = {
  'clear-night': 'mdi:weather-night', cloudy: 'mdi:weather-cloudy', fog: 'mdi:weather-fog',
  hail: 'mdi:weather-hail', lightning: 'mdi:weather-lightning', 'lightning-rainy': 'mdi:weather-lightning-rainy',
  partlycloudy: 'mdi:weather-partly-cloudy', pouring: 'mdi:weather-pouring', rainy: 'mdi:weather-rainy',
  snowy: 'mdi:weather-snowy', 'snowy-rainy': 'mdi:weather-snowy-rainy', sunny: 'mdi:weather-sunny',
  windy: 'mdi:weather-windy', 'windy-variant': 'mdi:weather-windy-variant', exceptional: 'mdi:alert-outline',
};

function available(hass, entity) {
  if (!Object.hasOwn(hass?.states ?? {}, entity)) return false;
  const registry = hass.entities?.[entity];
  const state = hass.states[entity]?.state;
  return !registry?.hidden_by && !registry?.disabled_by && !registry?.hidden && !registry?.disabled &&
    typeof state === 'string' && !notReady.has(state);
}

function calendarSourceConfig(items) {
  const exact = new Map();
  for (const item of items) {
    if (!calendarId.test(item.entity) || exact.has(item.entity)) continue;
    const accent = calendarAccent(item.accent_color);
    exact.set(item.entity, { entity: item.entity, name: item.name,
      ...(typeof item.icon === 'string' && /^mdi:[a-z0-9-]+$/.test(item.icon) && { icon: item.icon }),
      ...(accent && { accent }) });
  }
  return [...exact.values()];
}

export function createCalendarAgenda({ host, context, items, settings }) {
  const { make, icon, button, locale } = context;
  const labels = words[locale] ?? words.en;
  const view = host.ownerDocument.defaultView;
  const sources = calendarSourceConfig(items);
  const weather = settings.weather_entity;
  const panel = make('section', 'calendar-agenda');
  panel.toggleAttribute('data-date-rail', settings.show_month === true);
  const status = make('p', 'calendar-agenda-status');
  status.setAttribute('role', 'status');
  const alertIcon = icon('mdi:alert-outline');
  const statusCopy = make('span', 'calendar-agenda-status-copy');
  const statusText = make('span');
  const statusDetail = make('span', 'calendar-agenda-status-detail');
  statusCopy.append(statusText, statusDetail);
  status.append(alertIcon, statusCopy);
  const content = make('div', 'calendar-agenda-days');
  content.id = 'bayit-agenda-' + ++nextAgendaId;
  const expand = button('control-button', labels.show);
  expand.classList.add('calendar-agenda-expand');
  expand.setAttribute('aria-controls', content.id);
  panel.append(status, content, expand);
  host.append(panel);
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday:'long', month:'long', day:'numeric' });
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday:'short' });
  const monthFormat = new Intl.DateTimeFormat(locale, { month:'short' });
  const fullDateFormat = new Intl.DateTimeFormat(locale, { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const dateNumber = new Intl.NumberFormat(locale, { useGrouping:false });
  const subscriptions = new Map();
  let range;
  let hass;
  let stopWeather;
  let forecasts;
  let alarm;
  let alarmAt;
  let disposed = false;
  let expanded = false;
  let signature;

  const handleToggle = () => {
    if (expand.hidden) return;
    expanded = !expanded;
    draw();
  };
  expand.onclick = handleToggle;
  content.onclick = handleToggle;

  function unsubscribe(stop) {
    try { void Promise.resolve(stop()).catch(() => {}); } catch { /* The connection may already have closed. */ }
  }

  function subscribe(message, receive, onError) {
    let closed = false;
    let close;
    try {
      const connection = hass.connection;
      void Promise.resolve(connection.subscribeMessage(data => { if (!closed) receive(data); }, message))
        .then(stop => {
          if (typeof stop !== 'function') return;
          if (closed) unsubscribe(stop);
          else close = stop;
        }).catch(error => { if (!closed) onError(error); });
    } catch (error) { onError(error); }
    return () => {
      if (closed) return;
      closed = true;
      if (close) unsubscribe(close);
    };
  }

  function loadSource(source) {
    const requestHass = hass;
    const entry = { status: 'pending', events: [], close: undefined };
    subscriptions.set(source.entity, entry);
    const current = () => !disposed && subscriptions.get(source.entity) === entry;
    const receive = data => {
      if (!current()) return;
      const valid = Array.isArray(data);
      entry.status = valid ? 'ready' : 'failed';
      entry.events = valid ? data : [];
      view.clearTimeout(timeout);
      draw();
    };
    const timeout = view.setTimeout(() => receive(null), 8000);
    const params = { entity_id: source.entity, start: range.start.toISOString(), end: range.end.toISOString() };
    const rest = () => {
      if (!current() || typeof requestHass.callApi !== 'function') return receive(null);
      const query = new URLSearchParams({ start: params.start, end: params.end });
      void Promise.resolve().then(() => {
        if (current()) return requestHass.callApi('GET', 'calendars/' + source.entity + '?' + query);
      }).then(receive, () => receive(null));
    };
    if (typeof requestHass.connection?.subscribeMessage === 'function') {
      entry.close = subscribe({ type:'calendar/event/subscribe', ...params }, data => receive(data?.events),
        error => error?.code === 'unknown_command' ? rest() : receive(null));
    } else rest();
    entry.stop = () => {
      view.clearTimeout(timeout);
      entry.close?.();
    };
  }

  function clearSources() {
    for (const [id, entry] of subscriptions) {
      subscriptions.delete(id);
      entry.stop?.();
    }
  }

  function clearWeather() {
    stopWeather?.();
    stopWeather = forecasts = undefined;
  }

  function updateWeather() {
    const state = weather && hass?.states?.[weather];
    if (!supportsDailyForecast(state) || !available(hass, weather) ||
        typeof hass.connection?.subscribeMessage !== 'function') {
      clearWeather();
      return;
    }
    stopWeather ??= subscribe({type:'weather/subscribe_forecast', entity_id:weather, forecast_type:'daily'},
      result => {
        forecasts = Array.isArray(result?.forecast) ? result.forecast : undefined;
        draw();
      }, () => {
        forecasts = undefined;
        draw();
      });
  }

  function renderDay({ day, rows }, timeFormat, forecastByDay, unit, showYear) {
    const group = make('section', 'calendar-agenda-day');
    const title = make('div', 'calendar-agenda-day-head');
    const date = new Date(day + 'T12:00:00');
    const heading = make('h3');
    if (settings.show_month) {
      const rail = make('time', 'calendar-agenda-date');
      rail.dateTime = day;
      rail.setAttribute('aria-hidden', 'true');
      heading.setAttribute('aria-label', fullDateFormat.format(date));
      rail.append(make('span', 'calendar-agenda-weekday', weekdayFormat.format(date)),
        make('bdi', 'calendar-agenda-day-number', dateNumber.format(date.getDate())),
        make('span', 'calendar-agenda-month', monthFormat.format(date)));
      if (showYear) rail.append(make('bdi', 'calendar-agenda-year', dateNumber.format(date.getFullYear())));
      heading.append(rail);
    } else heading.textContent = dayFormat.format(date);
    title.append(heading);
    const forecast = forecastByDay.get(day);
    if (forecast && Number.isFinite(forecast.temperature)) {
      const temperature = make('span', 'calendar-agenda-forecast');
      const glyph = typeof forecast.condition === 'string' && Object.hasOwn(weatherIcons, forecast.condition)
        ? weatherIcons[forecast.condition] : undefined;
      if (glyph) {
        const localized = hass?.localize?.('component.weather.entity_component._.state.' + forecast.condition);
        const condition = make('span');
        if (localized) { condition.setAttribute('role', 'img'); condition.setAttribute('aria-label', localized); }
        condition.append(icon(glyph));
        temperature.append(condition);
      }
      const high = make('bdi', '', String(Math.round(forecast.temperature)) + unit);
      temperature.append(high);
      title.append(temperature);
    }
    const list = make('ul', 'calendar-agenda-list');
    for (const row of rows) {
      const item = make('li', 'calendar-agenda-event');
      if (row.sources[0].accent) item.style.setProperty('--agenda-accent', row.sources[0].accent);
      const caption = make('span', 'calendar-agenda-event-title');
      const seenIcons = new Set();
      for (const source of row.sources) {
        if (!source.icon || seenIcons.has(source.icon)) continue;
        seenIcons.add(source.icon);
        const mark = make('span', 'calendar-agenda-source');
        const name = source.name || hass?.states?.[source.entity]?.attributes?.friendly_name;
        if (name) { mark.setAttribute('role', 'img'); mark.setAttribute('aria-label', name); }
        mark.append(icon(source.icon));
        caption.append(mark);
      }
      caption.append(make('bdi', '', row.summary));
      let time = labels.allDay;
      if (row.start !== undefined) {
        const start = new Date(row.start);
        const end = new Date(row.end);
        time = timeFormat.format(start);
        if (dayKey(end) !== dayKey(start)) time += ' · ' + labels.until + ' ' + dayFormat.format(end) + ', ' + timeFormat.format(end);
        else if (row.end !== row.start) time += ' – ' + timeFormat.format(end);
      } else {
        const last = new Date(row.endDay + 'T12:00:00');
        last.setDate(last.getDate() - 1);
        if (dayKey(last) !== row.startDay) time += ' · ' + labels.until + ' ' + dayFormat.format(last);
      }
      item.append(caption, make('bdi', 'calendar-agenda-time', time));
      list.append(item);
    }
    group.append(title, list);
    return group;
  }

  function draw() {
    if (disposed || !range) return;
    const now = new Date();
    const entries = sources.map(source => ({ source, ...subscriptions.get(source.entity) }));
    const pending = entries.some(entry => entry.status === 'pending');
    const ready = entries.filter(entry => entry.status === 'ready').length;
    const partial = entries.some(entry => entry.status !== 'ready' && entry.status !== 'pending');
    const model = buildCalendarAgenda(entries, now, range);
    const text = !sources.length ? labels.choose : !ready ? (pending ? labels.loading : labels.unavailable)
      : partial ? labels.partial : !model.count ? (pending ? labels.loading : labels.empty) : '';
    const detail = text === labels.partial ? (model.count ? labels.partialDetail : pending ? labels.loading : labels.partialEmpty) : '';
    if (!model.canExpand) expanded = false;
    const shown = expanded ? model.full : model.compact;
    const forecastByDay = new Map();
    for (const forecast of forecasts ?? []) {
      const time = eventTime(forecast?.datetime);
      if (Number.isFinite(time)) forecastByDay.set(dayKey(new Date(time)), forecast);
    }
    const unitValue = hass?.states?.[weather]?.attributes?.temperature_unit;
    const unit = ['°C','°F','K'].includes(unitValue) ? unitValue : '°';
    const timePreference = hass?.locale?.time_format;
    const hourCycle = timePreference === '24' ? 'h23' : timePreference === '12' ? 'h12' : undefined;
    const order = JSON.stringify([text, detail, shown, [...forecastByDay], expanded, model.canExpand, unit, hourCycle]);
    if (alarmAt !== model.nextChange) {
      view.clearTimeout(alarm);
      alarmAt = model.nextChange;
      alarm = view.setTimeout(() => {
        alarmAt = undefined;
        update(hass);
      }, Math.max(1000, model.nextChange - +now));
    }
    if (order === signature) return;
    signature = order;
    const warning = text === labels.partial || text === labels.unavailable;
    status.toggleAttribute('data-warning', warning);
    alertIcon.hidden = !warning;
    statusText.textContent = text;
    statusDetail.hidden = !detail;
    statusDetail.textContent = detail;
    status.hidden = !text;
    expand.hidden = !model.canExpand;
    expand.textContent = expanded ? labels.hide : labels.show;
    expand.setAttribute('aria-expanded', String(expanded));
    content.dataset.expandable = String(model.canExpand);
    const timeFormat = new Intl.DateTimeFormat(locale, { hour:'numeric', minute:'2-digit', hourCycle });
    const showYear = shown[0]?.day.slice(0, 4) !== shown.at(-1)?.day.slice(0, 4);
    content.replaceChildren(...shown.map(group => renderDay(group, timeFormat, forecastByDay, unit, showYear)));
  }

  function update(next) {
    if (disposed || !next) return;
    if (hass?.connection !== next.connection || hass?.user?.id !== next.user?.id) {
      clearSources();
      clearWeather();
    }
    hass = next;
    const window = agendaWindow(new Date());
    if (range?.firstDay !== window.firstDay || +range?.start !== +window.start) {
      clearSources();
      range = window;
    }
    for (const source of sources) {
      const current = subscriptions.get(source.entity);
      if (available(hass, source.entity)) {
        if (!current) loadSource(source);
      } else if (current) {
        subscriptions.delete(source.entity);
        current.stop?.();
      }
    }
    if (sources.length) updateWeather();
    draw();
  }

  const resumed = () => { if (!host.ownerDocument.hidden) update(hass); };
  host.ownerDocument.addEventListener('visibilitychange', resumed);
  return {
    update,
    dispose() {
      disposed = true;
      clearSources();
      clearWeather();
      view.clearTimeout(alarm);
      host.ownerDocument.removeEventListener('visibilitychange', resumed);
    },
  };
}

export const calendarAgendaStyles = `
  .calendar-agenda, .calendar-agenda-days, .calendar-agenda-list { display: grid; gap: 8px; min-width: 0; }
  .calendar-agenda-days[data-expandable=true] { cursor: pointer; }
  .calendar-agenda-day { border-block-start: 1px solid var(--soft-line); padding-block-start: 9px; }
  .calendar-agenda-day-head { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 6px; margin-block-end: 6px; }
  .calendar-agenda-day-head h3 { margin: 0; font-size: 14px; }
  .calendar-agenda[data-date-rail] .calendar-agenda-days:not(:empty) {
    padding: 12px; border: 1px solid var(--soft-line); border-radius: 12px;
  }
  .calendar-agenda[data-date-rail] .calendar-agenda-day {
    display: grid; grid-template-columns: 50px minmax(0,1fr); gap: 8px; direction: ltr;
  }
  .calendar-agenda[data-date-rail] .calendar-agenda-day:first-child { border: 0; padding-block-start: 0; }
  .calendar-agenda[data-date-rail] .calendar-agenda-day-head {
    display: grid; align-content: start; justify-items: center; justify-content: center; gap: 3px; margin: 0;
  }
  .shell[dir=rtl] .calendar-agenda[data-date-rail] .calendar-agenda-list { direction: rtl; }
  .calendar-agenda-date {
    display: grid; justify-items: center; gap: 1px; font-size: 11px; line-height: 1.2; color: var(--secondary);
  }
  .calendar-agenda-day-number { color: var(--ink); font-size: 20px; font-weight: 760; }
  .calendar-agenda[data-date-rail] .calendar-agenda-forecast { gap: 3px; }
  .calendar-agenda-forecast, .calendar-agenda-event-title { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .calendar-agenda-forecast ha-icon, .calendar-agenda-source ha-icon { --mdc-icon-size: 17px; }
  .calendar-agenda-forecast, .calendar-agenda-time, .calendar-agenda-status { color: var(--secondary); font-size: 12px; }
  .calendar-agenda-list { padding: 0; margin: 0; list-style: none; }
  .calendar-agenda-event { display: grid; gap: 4px; padding: 8px 10px; border-radius: 12px; border-inline-start: 2px solid var(--agenda-accent, var(--soft-line)); background: var(--control); }
  .calendar-agenda-event[style] { background: color-mix(in srgb, var(--agenda-accent) 14%, var(--control)); }
  .calendar-agenda-event-title { flex-wrap: wrap; font-size: 13px; font-weight: 680; }
  .calendar-agenda-event-title bdi { flex: 1 1 130px; min-width: 0; overflow-wrap: anywhere; }
  .calendar-agenda-status { margin: 0; }
  .calendar-agenda-status[data-warning] {
    display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px;
    border: 1px solid var(--soft-line); border-radius: 8px; background: var(--room-tile-fill);
    color: var(--ink); font-size: 13px;
  }
  .calendar-agenda-status[data-warning] > ha-icon { flex: none; color: var(--warm); --mdc-icon-size: 18px; }
  .calendar-agenda-status-copy { display: grid; gap: 3px; min-width: 0; }
  .calendar-agenda-status-detail { color: var(--secondary); }
  .calendar-agenda-expand { justify-self: center; }
`;
