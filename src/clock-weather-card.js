import { createForecastFeed } from './weather-forecast-feed.js';

const feature = Object.freeze({ daily: 1, hourly: 2, twice_daily: 4 });
const activeWeather = state => typeof state?.state === 'string' && !['unknown', 'unavailable'].includes(state.state);

export function createClockWeatherProjection({ entity, sun, locale, visible, active, source, onUnavailable }) {
  let upstream;
  let connection;
  let unavailable;

  function subscribeMessage(used, callback, request) {
    const current = source();
    const mode = request?.forecast_type;
    if (!active() || current?.connection !== used || !visible(current, entity) ||
        !activeWeather(current?.states?.[entity]) || typeof callback !== 'function' ||
        request?.type !== 'weather/subscribe_forecast' || request.entity_id !== entity ||
        !Object.hasOwn(feature, mode) || !(current.states[entity].attributes?.supported_features & feature[mode])) {
      return Promise.reject(new Error('Only this Weather forecast is available.'));
    }
    const feed = createForecastFeed(entity, mode, () => {
      const current = source();
      if (!active() || used !== current?.connection || !visible(current, entity) ||
          !activeWeather(current?.states?.[entity])) return;
      if (Array.isArray(feed.forecast)) callback({ type: mode, forecast: feed.forecast });
      else {
        unavailable = used;
        queueMicrotask(onUnavailable);
      }
    });
    feed.update(used);
    return Promise.resolve(() => feed.dispose());
  }

  return hass => {
    const { states, config, connection: next } = hass ?? {};
    const weather = states?.[entity];
    if (!visible(hass, entity) || !activeWeather(weather) || typeof next?.subscribeMessage !== 'function' ||
        next === unavailable || !(weather.attributes?.supported_features & 7)) return;
    const solar = sun && visible(hass, sun) && states[sun];
    if (sun && !activeWeather(solar)) return;
    if (upstream !== next) {
      upstream = next;
      connection = Object.freeze({ subscribeMessage: subscribeMessage.bind(null, next) });
    }
    const { supported_features, temperature, temperature_unit } = weather.attributes;
    return {
      language: locale,
      locale: { language: locale, time_format: '24' },
      config: { time_zone: config?.time_zone, unit_system: { temperature: config?.unit_system?.temperature ?? temperature_unit } },
      connection,
      states: {
        [entity]: { state: weather.state, attributes: { supported_features, temperature, temperature_unit } },
        ...(solar && { [sun]: { state: solar.state, attributes: {
          next_rising: solar.attributes?.next_rising, next_setting: solar.attributes?.next_setting,
        } } }),
      },
    };
  };
}
