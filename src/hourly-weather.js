const icons = {
  'clear-night': 'weather-night', cloudy: 'weather-cloudy', exceptional: 'weather-cloudy-alert',
  fog: 'weather-fog', hail: 'weather-hail', lightning: 'weather-lightning', 'lightning-rainy': 'weather-lightning-rainy',
  partlycloudy: 'weather-partly-cloudy', pouring: 'weather-pouring', rainy: 'weather-rainy',
  snowy: 'weather-snowy', 'snowy-rainy': 'weather-snowy-rainy', sunny: 'weather-sunny',
  windy: 'weather-windy', 'windy-variant': 'weather-windy-variant',
};
const hourMs = 3600000;
const count = 24;
const dateTime = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)
  ? Date.parse(value) : NaN;
const rainfall = value => Number.isFinite(value) && value >= 0 && value <= 100
  ? Math.round(value / 10) * 10 || undefined : undefined;

export function hourlyWeatherItems(forecast, now, sun, currentTemperature) {
  if (!Array.isArray(forecast)) return [];
  const byTime = new Map();
  for (const entry of forecast) {
    const at = dateTime(entry?.datetime);
    if (!Number.isFinite(at) || byTime.has(at)) continue;
    const condition = entry.is_daytime === false && entry.condition === 'sunny' ? 'clear-night' : entry.condition;
    byTime.set(at, {
      at,
      temperature: Number.isFinite(entry.temperature) ? entry.temperature : undefined,
      probability: rainfall(entry.precipitation_probability),
      condition: typeof condition === 'string' && Object.hasOwn(icons, condition) ? condition : undefined,
    });
  }
  const sorted = [...byTime.values()].sort((left, right) => left.at - right.at);
  const firstFuture = sorted.findIndex(item => item.at > now);
  if (firstFuture === -1) return [];
  const previous = sorted[firstFuture - 1];
  const includesNow = previous && now - previous.at < hourMs;
  const selected = sorted.slice(firstFuture - (includesNow ? 1 : 0), firstFuture + count - (includesNow ? 1 : 0));
  if (includesNow) {
    const [item] = selected;
    selected[0] = { ...item, now: true, temperature: Number.isFinite(currentTemperature) ? currentTemperature : item.temperature };
  }
  const last = selected.at(-1).at;
  for (const [event, attribute] of [['sunrise', 'next_rising'], ['sunset', 'next_setting']]) {
    const time = dateTime(sun?.[attribute]);
    if (time >= Math.floor(now / 60000) * 60000 && time <= last) selected.push({ at: time, event });
  }
  return selected.sort((left, right) => left.at - right.at).slice(0, count);
}

const hourlyStreams = new WeakMap();

function hourlyStream(connection, entity) {
  if (!hourlyStreams.has(connection)) hourlyStreams.set(connection, new Map());
  const streams = hourlyStreams.get(connection);
  if (streams.has(entity)) return streams.get(entity);

  const listeners = new Set();
  let subscription;
  let latest;

  function retire(entry) {
    entry.retiring = true;
    if (!entry.stop || entry.ending) return;
    entry.ending = true;
    void Promise.resolve().then(() => entry.stop()).catch(() => {}).finally(() => {
      subscription = undefined;
      reconcile();
    });
  }

  function reconcile() {
    if (!listeners.size) {
      latest = undefined;
      if (subscription && !subscription.failed) retire(subscription);
      else streams.delete(entity);
      return;
    }
    if (subscription) return;
    const entry = {};
    subscription = entry;
    const unavailable = () => {
      if (entry.retiring) {
        subscription = undefined;
        reconcile();
      } else {
        entry.failed = true;
        latest = undefined;
        for (const listener of listeners) listener.failed();
      }
    };
    try {
      const pending = connection.subscribeMessage(data => {
        if (subscription !== entry || entry.retiring || entry.failed || data?.type !== 'hourly') return;
        latest = data;
        for (const listener of listeners) listener.received(data);
      }, { type: 'weather/subscribe_forecast', entity_id: entity, forecast_type: 'hourly' });
      void Promise.resolve(pending).then(stop => {
        if (typeof stop !== 'function') return unavailable();
        entry.stop = stop;
        if (entry.retiring) retire(entry);
      }, unavailable);
    } catch {
      unavailable();
    }
  }

  const stream = {
    listen(listener) {
      listeners.add(listener);
      if (subscription?.failed) listener.failed();
      else if (latest) listener.received(latest);
      reconcile();
      return () => {
        listeners.delete(listener);
        reconcile();
      };
    },
  };
  streams.set(entity, stream);
  return stream;
}

export function createHourlyWeather({ entity, sunEntity, make, icon, t, locale, visible }) {
  const root = make('section', 'hourly-weather');
  root.setAttribute('aria-label', t('forecast_hourly'));
  const list = make('ol', 'hourly-weather-list');
  list.tabIndex = 0;
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', t('forecast_hourly'));
  const notice = make('p', 'hourly-weather-notice');
  notice.setAttribute('role', 'status');
  root.append(list, notice);

  let hass;
  let connection;
  let unsubscribe;
  let failed = false;
  let disposed = false;
  let event;
  let painted;
  const reported = () => {
    const state = hass?.states?.[entity];
    const features = state?.attributes?.supported_features;
    return !disposed && state && !['unavailable', 'unknown'].includes(state.state) &&
      Number.isInteger(features) && (features & 2) === 2 && visible(hass, entity);
  };

  function render() {
    if (disposed) return;
    root.hidden = !reported();
    if (root.hidden) return;
    const now = Date.now();
    const weather = hass.states[entity].attributes;
    const sun = sunEntity && visible(hass, sunEntity) && hass.states[sunEntity];
    const sunlight = sun && ['above_horizon', 'below_horizon'].includes(sun.state) ? sun.attributes : null;
    const items = hourlyWeatherItems(event?.forecast, now, sunlight, weather.temperature);
    let clock;
    const clockOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    try { clock = new Intl.DateTimeFormat(locale, { ...clockOptions, timeZone: hass.config?.time_zone }); }
    catch { clock = new Intl.DateTimeFormat(locale, clockOptions); }
    const labels = items.map(item => [item, item.now ? t('forecast_now') : clock.format(item.at)]);
    const unit = typeof weather.temperature_unit === 'string' ? weather.temperature_unit : '';
    const signature = JSON.stringify([labels, unit]);
    if (signature !== painted) {
      painted = signature;
      list.replaceChildren(...labels.map(([item, label]) => {
        const row = make('li', 'hourly-weather-item');
        const time = make('time', 'hourly-weather-time', label);
        time.dateTime = new Date(item.at).toISOString();
        if (!item.now) time.dir = 'ltr';
        row.append(time);
        const glyph = item.event ? 'weather-' + item.event : icons[item.condition];
        const symbol = icon('mdi:' + (glyph || 'weather-cloudy-alert'));
        const condition = item.condition && hass.formatEntityState?.({ ...hass.states[entity], state: item.condition });
        if (condition) {
          symbol.setAttribute('role', 'img');
          symbol.setAttribute('aria-label', condition);
        } else symbol.setAttribute('aria-hidden', 'true');
        row.append(symbol);
        if (item.event) {
          row.append(make('span', 'hourly-weather-event', t(item.event === 'sunrise' ? 'sun_rise' : 'sun_set')));
          return row;
        }
        const temperature = make('span', 'hourly-weather-temperature',
          item.temperature === undefined ? '—' : Math.round(item.temperature) + '°');
        if (item.temperature !== undefined && unit) temperature.setAttribute('aria-label',
          Math.round(item.temperature) + ' ' + unit);
        row.append(temperature);
        if (item.probability !== undefined) {
          const rain = make('span', 'hourly-weather-rain', item.probability + '%');
          rain.dir = 'ltr';
          rain.setAttribute('aria-label', t('forecast_rain_probability').replace('{percent}', item.probability + '%'));
          row.append(rain);
        }
        return row;
      }));
    }
    list.hidden = !items.length;
    notice.hidden = !!items.length;
    const status = event || failed || typeof hass.connection?.subscribeMessage !== 'function'
      ? 'forecast_unavailable' : 'forecast_loading';
    const message = items.length ? '' : t(status);
    if (notice.textContent !== message) notice.textContent = message;
  }

  function sync() {
    const nextConnection = reported() && typeof hass.connection?.subscribeMessage === 'function' ? hass.connection : undefined;
    if (connection !== nextConnection) {
      unsubscribe?.();
      event = undefined;
      failed = false;
      connection = nextConnection;
      unsubscribe = connection && hourlyStream(connection, entity).listen({
        received(data) {
          event = data;
          render();
        },
        failed() {
          event = undefined;
          failed = true;
          render();
        },
      });
    }
    render();
  }

  return {
    root,
    update(next) { hass = next; sync(); },
    refreshTime: render,
    dispose() {
      disposed = true;
      sync();
    },
  };
}

export const hourlyWeatherStyles = String.raw`
  .hourly-weather { min-width: 0; color: var(--ink); }
  .hourly-weather-list {
    display: flex; flex-direction: row; overflow-x: auto; overflow-y: hidden; overscroll-behavior-inline: contain;
    list-style: none; margin: 0; padding: 6px 0 8px; gap: 6px; scrollbar-width: thin;
    border: 1px solid var(--soft-line); border-radius: 12px; touch-action: pan-x pan-y pinch-zoom;
  }
  .hourly-weather-item {
    display: grid; grid-template-rows: 1.2em 24px 1.2em 1.2em; align-items: center; justify-items: center;
    flex: 0 0 52px; gap: 3px; font-size: 12px; text-align: center; font-variant-numeric: tabular-nums;
  }
  .hourly-weather-item ha-icon { width: 24px; height: 24px; --mdc-icon-size: 24px; color: var(--secondary); }
  .hourly-weather-time, .hourly-weather-event, .hourly-weather-notice { color: var(--secondary); }
  .hourly-weather-rain { color: var(--ink); }
  .hourly-weather-notice { margin: 0; padding: 8px; font-size: .85em; }
`;
