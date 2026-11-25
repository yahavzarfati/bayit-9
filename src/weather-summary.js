import { weatherCondition, weatherIconName } from './hourly-weather.js';
import { createForecastFeed } from './weather-forecast-feed.js';

const formatter = (locale, zone, options) => {
  try { return new Intl.DateTimeFormat(locale, { ...options, timeZone: zone }); }
  catch { return new Intl.DateTimeFormat(locale, options); }
};
const isoEpoch = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)
  ? Date.parse(value) : NaN;
const temperature = value => Number.isFinite(value) ? value : undefined;
const temperatureUnit = value => ['°C', '°F', 'K'].includes(value) ? value : '°';
const showTemperature = (value, unit) => value === undefined ? '—' : Math.round(value) + unit;

export function dailyWeatherRows(forecast, epoch, zone, currentTemperature) {
  if (!Array.isArray(forecast)) return [];
  const date = formatter('en-US', zone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const dayKey = value => {
    const fields = Object.fromEntries(date.formatToParts(value).map(({ type, value }) => [type, value]));
    return fields.year + fields.month + fields.day;
  };
  const today = dayKey(epoch);
  const valid = forecast.flatMap(entry => {
    const at = isoEpoch(entry?.datetime);
    if (!Number.isFinite(at)) return [];
    let low = temperature(entry.templow);
    let high = temperature(entry.temperature);
    if (low === undefined && high === undefined) return [];
    if (low > high) [low, high] = [high, low];
    return [{ at, low, high, condition: weatherCondition(entry.condition) }];
  }).sort((a, b) => a.at - b.at);
  const seen = new Set();
  const rows = [];
  for (const item of valid) {
    const key = dayKey(item.at);
    if (key < today || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      ...item, today: key === today, current: key === today ? temperature(currentTemperature) : undefined,
    });
    if (rows.length === 5) break;
  }
  const range = rows.flatMap(item => [item.low, item.high, item.current].filter(Number.isFinite));
  const min = Math.min(...range);
  const max = Math.max(...range);
  const percent = value => min === max ? 50 : (value - min) / (max - min) * 100;
  return rows.map(item => ({
    ...item, from: percent(item.low ?? item.high), to: percent(item.high ?? item.low),
    marker: item.current === undefined ? undefined : percent(item.current),
  }));
}

export function createWeatherSummary({ make, icon, button, t, locale, state, fallbackState, onDetails, canOpen }) {
  const root = button('weather-current-summary');
  const visual = icon('mdi:weather-cloudy');
  visual.classList.add('weather-current-icon');
  visual.setAttribute('aria-hidden', 'true');
  const details = make('span', 'weather-current-details');
  const observation = make('span', 'weather-current-observation');
  const reading = make('span', 'weather-current-temperature');
  const temperatureIcon = icon('mdi:thermometer');
  temperatureIcon.setAttribute('aria-hidden', 'true');
  const amount = make('span');
  reading.append(temperatureIcon, amount);
  const condition = make('span', 'weather-current-condition');
  condition.dir = 'auto';
  observation.append(reading, condition);
  const time = make('time', 'weather-current-time');
  time.dir = 'ltr';
  const dateLine = make('span', 'weather-current-date');
  const calendar = icon('mdi:calendar');
  calendar.setAttribute('aria-hidden', 'true');
  const date = make('time');
  date.dir = 'auto';
  dateLine.append(calendar, date);
  details.append(observation, time, dateLine);
  root.append(visual, details);
  root.onclick = () => { if (canOpen()) onDetails(root); };

  let painted;
  return {
    root,
    update(now, zone) {
      const current = state();
      const available = current && !['unknown', 'unavailable'].includes(current.state);
      const conditionId = available ? weatherCondition(current.state) : undefined;
      const value = available ? temperature(current.attributes?.temperature) : undefined;
      const unit = temperatureUnit(current?.attributes?.temperature_unit);
      const open = canOpen();
      const signature = JSON.stringify([Math.floor(now / 60000), zone, current?.state, value, unit, open]);
      if (signature === painted) return;
      painted = signature;
      visual.setAttribute('icon', weatherIconName(conditionId));
      condition.textContent = conditionId ? t('weather_condition_' + conditionId) : fallbackState();
      amount.textContent = showTemperature(value, unit);
      reading.hidden = value === undefined;
      time.textContent = formatter(locale, zone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
      time.dateTime = new Date(now).toISOString();
      date.textContent = formatter(locale, zone, { year: 'numeric', month: 'long', day: 'numeric' }).format(now);
      root.setAttribute('aria-label', [condition.textContent, value === undefined ? '' : amount.textContent,
        time.textContent, date.textContent, open ? t('weather_open_details') : ''].filter(Boolean).join(' · '));
      root.disabled = !open;
    },
  };
}

export function createDailyWeather({ entity, make, icon, t, locale }) {
  const root = make('section', 'daily-weather');
  root.setAttribute('aria-label', t('forecast_daily'));
  const list = make('ol', 'daily-weather-list');
  list.setAttribute('role', 'list');
  const notice = make('p', 'hourly-weather-notice');
  notice.setAttribute('role', 'status');
  root.append(list, notice);
  let hass;
  let active = false;
  let painted;
  let previousInputs;
  const feed = createForecastFeed(entity, 'daily', render);

  function render() {
    root.hidden = !active;
    if (root.hidden) return;
    const state = hass.states[entity];
    const unit = temperatureUnit(state?.attributes?.temperature_unit);
    const timeZone = hass.config?.time_zone;
    const now = Date.now();
    const current = state?.attributes?.temperature;
    const input = [feed.forecast, feed.status, Math.floor(now / 60000), timeZone, current, unit];
    if (previousInputs && input.every((value, index) => Object.is(value, previousInputs[index]))) return;
    previousInputs = input;
    const day = formatter(locale, timeZone, { weekday: 'short' });
    const rows = dailyWeatherRows(feed.forecast, now, timeZone, current)
      .map(item => ({ ...item, label: item.today ? t('weather_today') : day.format(item.at) }));
    const signature = JSON.stringify([rows, unit, feed.status]);
    if (signature === painted) return;
    painted = signature;
    list.replaceChildren(...rows.map(item => {
      const row = make('li', 'daily-weather-row');
      const name = make('span', 'daily-weather-day', item.label);
      name.dir = 'auto';
      const condition = icon(weatherIconName(item.condition));
      condition.setAttribute('aria-hidden', 'true');
      const low = make('span', 'daily-weather-low', showTemperature(item.low, unit));
      const high = make('span', 'daily-weather-high', showTemperature(item.high, unit));
      const track = make('span', 'daily-weather-track');
      track.setAttribute('aria-hidden', 'true');
      const range = make('span', 'daily-weather-range');
      range.style.setProperty('--weather-range-start', item.from + '%');
      range.style.setProperty('--weather-range-end', item.to + '%');
      if (item.from === item.to) range.dataset.single = '';
      track.append(range);
      if (item.marker !== undefined) {
        const marker = make('span', 'daily-weather-marker');
        marker.style.setProperty('--weather-range-marker', item.marker + '%');
        track.append(marker);
      }
      row.setAttribute('aria-label', [item.label, item.condition && t('weather_condition_' + item.condition),
        item.low !== undefined && t('weather_daily_low').replace('{value}', low.textContent),
        item.high !== undefined && t('weather_daily_high').replace('{value}', high.textContent),
        item.current !== undefined && t('weather_daily_now').replace('{value}', showTemperature(item.current, unit)),
      ].filter(Boolean).join(' · '));
      row.append(name, condition, low, track, high);
      return row;
    }));
    list.hidden = !rows.length;
    notice.hidden = !!rows.length;
    notice.textContent = rows.length ? '' : t('forecast_daily_' + feed.status);
  }

  return {
    root,
    update(next, enabled) {
      hass = next;
      active = enabled;
      feed.update(enabled ? hass.connection : undefined);
      render();
    },
    refreshTime: render,
    dispose() {
      active = false;
      feed.dispose();
    },
  };
}

export const weatherSummaryStyles = String.raw`
  .weather-current-summary {
    box-sizing: border-box; width: 100%; display: grid; grid-template-columns: minmax(60px,.8fr) minmax(0,1.2fr);
    align-items: center; gap: 10px; direction: ltr; text-align: start; color: var(--ink); padding: 12px 10px;
    border: 1px solid var(--soft-line); border-radius: 12px; background: var(--room-tile-fill);
    font: inherit;
  }
  .weather-current-summary:not(:disabled) { cursor: pointer; }
  .weather-current-summary:disabled { opacity: 1; }
  .weather-current-summary:focus-visible { outline: 2px solid var(--warm); outline-offset: 2px; }
  .weather-current-icon {
    width: clamp(48px,20vw,88px); height: clamp(48px,20vw,88px);
    --mdc-icon-size: clamp(48px,20vw,88px); justify-self: center;
  }
  .weather-current-details { min-width: 0; display: grid; justify-items: center; }
  .weather-current-observation {
    width: 100%; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
    gap: 2px 6px; font-size: 13px; color: var(--secondary);
  }
  .weather-current-temperature { display: inline-flex; align-items: center; gap: 3px; font-variant-numeric: tabular-nums; }
  .weather-current-temperature ha-icon, .weather-current-date ha-icon {
    width: 14px; height: 14px; --mdc-icon-size: 14px;
  }
  .weather-current-time { font-size: clamp(35px,13vw,58px); line-height: 1.08; font-variant-numeric: tabular-nums; }
  .weather-current-date { display: inline-flex; align-items: center; gap: 4px; color: var(--secondary); font-size: 12px; }
  .daily-weather { min-width: 0; padding: 3px 5px 2px; }
  .daily-weather-list { list-style: none; margin: 0; padding: 0; }
  .daily-weather-row {
    display: grid; grid-template-columns: 3.3em 17px 3em minmax(34px,1fr) 3em; align-items: center;
    gap: 5px; direction: ltr; min-height: 28px; color: var(--ink); font-size: 12px; font-variant-numeric: tabular-nums;
  }
  .daily-weather-row > ha-icon { width: 17px; height: 17px; --mdc-icon-size: 17px; color: var(--secondary); }
  .daily-weather-low, .daily-weather-high { text-align: center; }
  .daily-weather-low { color: var(--secondary); }
  .daily-weather-track {
    position: relative; height: 12px; border-radius: 999px; background: var(--soft-line); margin-inline: 3px;
  }
  .daily-weather-range {
    position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(90deg, #7ecdb0, #e5d885 58%, #e5a76a);
    clip-path: inset(0 calc(100% - var(--weather-range-end)) 0 var(--weather-range-start) round 999px);
  }
  .daily-weather-range[data-single] {
    left: var(--weather-range-start); top: 3px; width: 6px; height: 6px;
    transform: translateX(-50%); background: var(--warm); clip-path: none;
  }
  .daily-weather-marker {
    box-sizing: border-box; position: absolute; width: 11px; height: 11px; border-radius: 50%; top: .5px;
    left: var(--weather-range-marker); transform: translateX(-50%); background: var(--ink);
    border: 2px solid var(--room-tile-fill);
  }
`;
