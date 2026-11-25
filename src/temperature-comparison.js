const MINUTE_MS = 60000;
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

export function parseTemperatureValue(raw) {
  const value = typeof raw === 'string' && decimal.test(raw.trim()) ? Number(raw) : raw;
  return Number.isFinite(value) ? value : null;
}

function cleanUnit(raw) {
  return typeof raw === 'string' ? raw.trim() : '';
}

function recorderEvents(history, unit) {
  if (!Array.isArray(history)) return [];
  const valid = history.flatMap(record => {
    if (!record || typeof record !== 'object') return [];
    const time = record.lc ?? record.last_changed ?? record.lu ?? record.last_updated;
    const at = typeof time === 'number' ? Math.round(time * 1000)
      : typeof time === 'string' ? Date.parse(time) : NaN;
    const state = Object.hasOwn(record, 's') ? record.s : record.state;
    if (!Number.isSafeInteger(at) || state === undefined) return [];
    const attributes = record.a ?? record.attributes;
    return [{ at, state, unit: cleanUnit(attributes?.unit_of_measurement) }];
  }).sort((left, right) => left.at - right.at);

  const events = [];
  const expectedUnit = cleanUnit(unit) || valid.find(event => event.unit)?.unit;
  let recordedUnit = expectedUnit;
  for (const event of valid) {
    // Compact recorder rows omit attributes when the previous unit still applies.
    if (event.unit) recordedUnit = event.unit;
    const value = recordedUnit === expectedUnit ? parseTemperatureValue(event.state) : null;
    if (events.at(-1)?.at === event.at) events.pop();
    events.push({ at: event.at, value });
  }
  return events;
}

function bucketPoints(events, startMs, endMs, interval) {
  if (!events.length || events[0].at > endMs) return [];
  const points = [];
  const add = (at, value) => {
    const previous = points.at(-1);
    const point = { at, value: Number.isFinite(value) ? value : null };
    if (previous?.at === at) points[points.length - 1] = point;
    else if (at === endMs || point.value !== null || previous?.value !== null) points.push(point);
  };
  const extendPrior = at => {
    const previous = points.at(-1);
    // End immediately before the outage, leaving the following segment unconnected.
    if (previous?.value != null && previous.at < at - 1) add(at - 1, previous.value);
  };

  let index = 0;
  let lastValue = null;
  while (index < events.length && events[index].at < startMs) {
    lastValue = events[index++].value;
  }

  // Align full buckets to the end of the interval. A shorter first bucket is possible.
  let start = startMs;
  let end = endMs - (Math.ceil((endMs - startMs) / interval) - 1) * interval;
  while (start < endMs) {
    let segment = start;
    let sum = 0;
    let count = 0;
    const average = () => count ? sum / count : lastValue;
    while (index < events.length && events[index].at < end) {
      const { at, value } = events[index++];
      if (value === null) {
        if (lastValue !== null) {
          if (at > segment) add(segment, average());
          extendPrior(at);
        }
        segment = at;
        add(at, null);
        sum = 0;
        count = 0;
      } else {
        if (lastValue === null && at > segment) {
          add(segment, null);
          segment = at;
        }
        sum += value;
        count++;
      }
      lastValue = value;
    }
    add(segment, average());
    start = end;
    end = Math.min(end + interval, endMs);
  }

  const boundary = events[index];
  if (boundary?.at === endMs && boundary.value === null) extendPrior(endMs);
  add(endMs, boundary?.at === endMs ? boundary.value : points.at(-1)?.value);
  return points.some(point => point.value !== null) ? points : [];
}

/**
 * Group a Home Assistant recorder response into arithmetic averages of reported samples.
 * Times are epoch milliseconds. Null points split the line at outages or unknown states.
 */
export function buildComparisonSeries(history, items, { startMs, endMs, bucketMinutes = 30 } = {}) {
  const interval = bucketMinutes * MINUTE_MS;
  if (!Array.isArray(items) || !Number.isSafeInteger(startMs) || !Number.isSafeInteger(endMs) || endMs <= startMs ||
      !Number.isSafeInteger(endMs - startMs) || !Number.isInteger(bucketMinutes) || bucketMinutes < 1 ||
      !Number.isSafeInteger(interval)) return [];

  return items.filter(item => typeof item?.entity === 'string' && item.entity).map(({ entity, unit }) => ({
    entity,
    points: bucketPoints(recorderEvents(history?.[entity], unit), startMs, endMs, interval),
  }));
}
