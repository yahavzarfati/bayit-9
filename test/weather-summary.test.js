import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyWeatherRows } from '../src/weather-summary.js';

test('daily ranges use local dates and include the current measured temperature in a shared scale', () => {
  const now = Date.parse('2026-11-25T22:30:00Z');
  const row = (datetime, templow, temperature) => ({ datetime, templow, temperature, condition: 'cloudy' });
  const rows = dailyWeatherRows([
    row('2026-11-27T08:00:00+02:00', undefined, 16),
    row('2026-11-25T00:00:00+02:00', -10, 99),
    row('2026-11-26T00:00:00+02:00', 20, 10),
    row('2026-11-26T12:00:00+02:00', 0, 40),
    row('2026-11-28T08:00:00', 0, 40),
    row('2026-11-28T08:00:00+02:00', null, '21'),
  ], now, 'Asia/Jerusalem', 25);
  assert.deepEqual(rows.map(({ low, high, today }) => [low, high, today]), [[10, 20, true], [undefined, 16, false]]);
  assert.equal(rows[0].marker, 100);
  assert.equal(rows[0].from, 0);
  assert.equal(rows[1].from, rows[1].to);
  assert.equal(rows[1].marker, undefined);
});
