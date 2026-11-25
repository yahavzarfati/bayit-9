import assert from 'node:assert/strict';
import test from 'node:test';
import { buildComparisonSeries } from '../src/temperature-comparison.js';

const inside = 'sensor.fixture_inside';
const outside = 'sensor.fixture_outside';
const startMs = Date.parse('2026-10-25T00:09:00Z');
const at = minute => startMs + minute * 60000;
const row = (minute, s, a) => ({ s, lu: at(minute) / 1000, ...(a && { a }) });
const point = (minute, value) => ({ at: at(minute), value });
const before = (minute, value) => ({ at: at(minute) - 1, value });
const range = end => ({ startMs, endMs: at(end) });
const series = (rows, end, unit) => buildComparisonSeries({ [inside]: rows }, [{ entity: inside, unit }], range(end))[0].points;

test('uses arithmetic samples, aligns buckets to the end, and fills empty buckets with the last reported value', () => {
  const history = [
    row(-2, '20'), row(11, '23'), row(24, '19'),
    { state: '18', last_changed: new Date(at(35)).toISOString(), last_updated: new Date(at(38)).toISOString() },
    row(41, '24'), row(120, '54'),
  ];
  assert.deepEqual(series(history, 95), [
    point(0, 20), point(5, 21), point(35, 21), point(65, 24), point(95, 24),
  ]);
});

test('displays real gaps even between readings in the same bucket or exactly on a bucket boundary', () => {
  const history = [
    row(0, '20'), row(5, '26'), row(10, 'unavailable'), row(12, 'unknown'),
    row(15, '31'), row(20, '25'), row(30, null), row(39, '21'), row(70, 'unavailable'),
  ];
  assert.deepEqual(series(history, 90), [
    point(0, 23), before(10, 23), point(10, null), point(15, 28), before(30, 28),
    point(30, null), point(39, 21), point(60, 21), before(70, 21), point(70, null), point(90, null),
  ]);
});

test('limits the visible range, waits for evidence after an initial outage, and honors exact end reports', () => {
  const history = [row(-15, '19'), row(-5, 'unavailable'), row(18, '23'), row(60, 'unknown'), row(64, '41')];
  assert.deepEqual(series(history, 60), [
    point(0, null), point(18, 23), point(30, 23), before(60, 23), point(60, null),
  ]);
  assert.deepEqual(series([row(-10, '19'), row(60, '-1.5e1')], 60), [
    point(0, 19), point(30, 19), point(60, -15),
  ]);
  assert.deepEqual(series([row(60, '0')], 60), [point(0, null), point(60, 0)]);
});

test('uses expected room units when compact rows omit attributes and never combines mismatched units', () => {
  const history = [
    row(-4, '18', { unit_of_measurement: '°C' }),
    row(8, '68', { unit_of_measurement: '°F' }),
    row(15, '72'),
    { state: '20.5', last_updated: new Date(at(33)).toISOString(), attributes: { unit_of_measurement: ' °C ' } },
    row(45, '21.5'),
  ];
  assert.deepEqual(series(history, 60, '°C'), [
    point(0, 18), before(8, 18), point(8, null), point(33, 21), point(60, 21),
  ]);
  assert.deepEqual(series(history, 60, 'K'), []);
  assert.deepEqual(series([row(-4, '22.1')], 30, '°C'), [point(0, 22.1), point(30, 22.1)]);
});

test('retains configured series order, resolves duplicate timestamps and skips malformed rows', () => {
  const items = [{ entity: outside }, { entity: inside }];
  const input = {
    [inside]: [
      row(14, '22.7'), row(-2, 21), row(14, '23'), null, { s: '7', lu: false },
      { lu: at(19) / 1000 }, row(40, '0x15'), row(51, 'NaN'),
    ],
  };
  assert.deepEqual(buildComparisonSeries(input, items, range(60)), [
    { entity: outside, points: [] },
    { entity: inside, points: [
      point(0, 23), point(30, 23), before(40, 23), point(40, null), point(60, null),
    ] },
  ]);
  assert.equal(input[inside][0].s, '22.7');
});

test('returns empty series on missing history and rejects invalid windows or bucket sizes', () => {
  assert.deepEqual(series([row(0, 'unavailable'), row(6, 'unknown')], 60), []);
  assert.deepEqual(buildComparisonSeries(null, [{ entity: inside }], range(1)), [{ entity: inside, points: [] }]);
  for (const options of [range(0), range(-1), { ...range(30), bucketMinutes: 0 },
    { ...range(30), bucketMinutes: 0.5 }, { ...range(30), bucketMinutes: Infinity }]) {
    assert.deepEqual(buildComparisonSeries({}, [{ entity: inside }], options), []);
  }
});
