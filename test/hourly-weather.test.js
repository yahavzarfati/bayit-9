import assert from 'node:assert/strict';
import test from 'node:test';
import { hourlyWeatherItems } from '../src/hourly-weather.js';

const sunset = '2026-11-26T16:33:28.401451+02:00';
const sunrise = '2026-11-26T06:18:58.538099+02:00';
const sun = {
  state: 'below_horizon', attributes: { next_rising: sunrise, next_setting: sunset },
};
const item = (datetime, condition = 'sunny', is_daytime) => ({
  datetime, condition, temperature: 16, ...(is_daytime !== undefined && { is_daytime }),
});
const now = Date.parse('2026-11-25T19:43:00+02:00');

test('clear hours follow the reported solar window and respect explicit weather conditions', () => {
  const result = hourlyWeatherItems([
    item('2026-11-25T19:00:00+02:00'),
    item('2026-11-25T20:00:00+02:00'),
    item('2026-11-25T21:00:00+02:00', 'sunny', true),
    item('2026-11-25T22:00:00+02:00', 'rainy'),
    item('2026-11-26T05:00:00+02:00', 'clear-night'),
    item('2026-11-26T07:00:00+02:00'),
    item('2026-11-26T08:00:00+02:00', 'sunny', false),
    item('2026-11-26T17:00:00+02:00'),
    item('2026-11-28T00:00:00+02:00'),
  ], now, sun, 17.1);
  assert.deepEqual(result.filter(entry => !entry.event).map(entry => entry.condition),
    ['clear-night', 'clear-night', 'sunny', 'rainy', 'clear-night', 'sunny', 'clear-night', 'clear-night', 'sunny']);
  assert.equal(result[0].temperature, 17.1);
  assert.equal(result[0].now, true);
  assert.deepEqual(result.filter(entry => entry.event), [
    { at: Date.parse('2026-11-26T06:18:58.538+02:00'), event: 'sunrise' },
    { at: Date.parse('2026-11-26T16:33:28.401+02:00'), event: 'sunset' },
  ]);
});

test('daytime changes at the next sunset without relying on guessed hours', () => {
  const status = {
    state: 'above_horizon', attributes: { next_rising: sunrise, next_setting: '2026-11-25T16:30:00+02:00' },
  };
  const conditions = hourlyWeatherItems([
    item('2026-11-25T15:00:00+02:00'),
    item('2026-11-25T16:00:00+02:00'),
    item('2026-11-25T17:00:00+02:00'),
    item('2026-11-26T08:00:00+02:00'),
  ], Date.parse('2026-11-25T14:30:00+02:00'), status).filter(entry => !entry.event).map(entry => entry.condition);
  assert.deepEqual(conditions, ['sunny', 'sunny', 'clear-night', 'sunny']);
});

test('missing or inconsistent solar forecasts leave unspecified future conditions unchanged', () => {
  const future = [
    item('2026-11-25T20:00:00+02:00'),
    item('2026-11-25T21:00:00+02:00', 'sunny', false),
  ];
  for (const source of [undefined, { ...sun, state: 'unavailable' }, { ...sun, attributes: {} },
    { ...sun, attributes: { next_rising: sunset, next_setting: sunrise } }]) {
    const conditions = hourlyWeatherItems(future, now, source).filter(entry => !entry.event).map(entry => entry.condition);
    assert.deepEqual(conditions, ['sunny', 'clear-night']);
  }
});
