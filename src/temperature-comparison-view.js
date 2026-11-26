import { buildComparisonSeries } from './temperature-comparison.js';
import { SENSOR_COMPARISON_MAX_BUCKETS } from './strategy-model.js';

const colors = ['#78A9FF', '#FF91AF', '#C8ACFF', '#78DCA0', '#FFA264', '#F5CC65',
  '#55D7D2', '#B6CD72', '#B2B7FA', '#FFADD5', '#A4C8CA', '#E9A779'];
const plotWidth = 1000;
const plotHeight = 230;
const minuteMs = 60000;
const refreshDelayMs = 1500;
const historyTimeoutMs = 10000;
let nextComparisonId = 0;
const clip = (value, max) => Math.min(max, Math.max(0, value));

function readingUnit(record) {
  const unit = record?.attributes?.unit_of_measurement;
  if (typeof unit === 'string' && unit.trim().length > 0 && unit.length <= 20) return unit.trim();
  const state = record?.state;
  if (typeof state === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(state) && Number.isFinite(Number(state))) return '';
}

export function comparisonSources(items, hass, visible, settings) {
  if (!settings?.enabled || Math.ceil(settings.hours * 60 / settings.bucket_minutes) > SENSOR_COMPARISON_MAX_BUCKETS) return;
  const sources = items.flatMap(item => {
    if (item.role !== 'graph' || !item.entity.startsWith('sensor.') || !visible(item.entity, hass)) return [];
    const record = hass?.states?.[item.entity];
    const unit = readingUnit(record);
    return unit === undefined ? [] : [{ entity:item.entity, name:item.name || record.attributes?.friendly_name || item.entity,
      color:item.series_color, unit }];
  });
  if (sources.length < 2 || sources.length > colors.length || sources.some(item => item.unit !== sources[0].unit)) return;
  return sources.map((item, index) => ({ ...item, color:/^#[0-9a-f]{6}$/i.test(item.color) ? item.color : colors[index] }));
}

function formatTime(locale, hass, withDate) {
  const options = { hour:'2-digit', minute:'2-digit', ...(withDate && { month:'short', day:'numeric' }) };
  try { return new Intl.DateTimeFormat(locale, { ...options, timeZone:hass?.config?.time_zone }); }
  catch { return new Intl.DateTimeFormat(locale, options); }
}

function numericBounds(series) {
  let min = Infinity;
  let max = -Infinity;
  for (const item of series) {
    for (const point of item.points) {
      if (!Number.isFinite(point.value)) continue;
      min = Math.min(min, point.value);
      max = Math.max(max, point.value);
    }
  }
  if (min === Infinity) return;
  const scale = Math.max(1, Math.abs(min), Math.abs(max));
  const low = min / scale;
  const high = max / scale;
  const padding = high === low ? Math.min(1 / scale, 0.1) : (high - low) * 0.08;
  const floor = low - padding;
  const span = high + padding - floor || 1;
  return {
    y: value => plotHeight * (1 - (value / scale - floor) / span),
    at: fraction => Math.min(Number.MAX_VALUE, Math.max(-Number.MAX_VALUE, (floor + span * fraction) * scale)),
  };
}

function drawPaths(points, x, y) {
  const segments = [];
  let segment = '';
  let firstX;
  let prev;
  const close = () => {
    if (prev) segments.push({ stroke:segment, area:prev.x > firstX &&
      segment + ' L' + prev.x + ',' + plotHeight + ' H' + firstX + ' Z' });
    prev = undefined;
  };
  for (const point of points) {
    if (!Number.isFinite(point.value)) { close(); continue; }
    const next = { x:Math.round(x(point.at) * 10) / 10, y:Math.round(y(point.value) * 10) / 10 };
    if (prev) {
      const middle = (prev.x + next.x) / 2;
      segment += ' C' + middle + ',' + prev.y + ' ' + middle + ',' + next.y + ' ' + next.x + ',' + next.y;
    } else {
      firstX = next.x;
      segment = 'M' + next.x + ',' + next.y + ' h0.1';
    }
    prev = next;
  }
  close();
  return segments;
}

export function createTemperatureComparison({ host, dialog, context, sources, settings, visible }) {
  const { make, button, t, stateLabel, modelFor, locale } = context;
  const document = host.ownerDocument;
  const view = document.defaultView;
  const pathname = view.location.pathname;
  const step = settings.bucket_minutes * minuteMs;
  const span = settings.hours * 60 * minuteMs;
  let endMs = Date.now();
  let startMs = endMs - span;
  const x = time => plotWidth * clip((time - startMs) / (endMs - startMs), 1);
  const slot = make('div', 'temperature-comparison');
  const message = make('p', 'comparison-message', t('comparison_loading'));
  message.setAttribute('role', 'status');
  const visual = make('div', 'comparison-visual');
  visual.dir = 'ltr';
  visual.hidden = true;
  visual.setAttribute('aria-hidden', 'true');
  const yAxis = make('div', 'comparison-y-axis');
  const xAxis = make('div', 'comparison-x-axis');
  const shape = (tag, attributes) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  };
  const svg = shape('svg', { viewBox:'0 0 ' + plotWidth + ' ' + plotHeight, preserveAspectRatio:'none', focusable:'false' });
  const marker = shape('line', { 'class':'comparison-marker', x1:plotWidth, x2:plotWidth, y1:0, y2:plotHeight });
  visual.append(yAxis, svg, xAxis);
  const picker = make('label', 'comparison-picker');
  picker.hidden = true;
  const time = make('span', 'comparison-selected-time');
  const input = make('input');
  input.type = 'range';
  input.dir = 'ltr';
  input.min = '0';
  input.step = '1';
  input.setAttribute('aria-label', t('comparison_time'));
  picker.append(time, input);
  const readings = make('ul', 'comparison-readings');
  readings.setAttribute('role', 'list');
  const readingPrefix = 'bayit-comparison-' + ++nextComparisonId;
  const keptSeries = make('span', '', t('comparison_keep_series'));
  keptSeries.id = readingPrefix + '-keep';
  keptSeries.hidden = true;
  slot.append(message, visual, picker, readings, keptSeries);
  host.append(slot);

  let hass = context.hass;
  let disposed = false;
  let refreshTimer;
  let refreshQueued = false;
  let pendingRequest;
  let pending = true;
  let data;
  let failure;
  let key;
  let readingKey;
  let valueViews = [];
  const readingViews = new Map();
  const hiddenSeries = new Set();
  let selectedTimes = [];
  let selectedTime = endMs;
  const fullTime = formatTime(locale, hass, true);
  const shortTime = formatTime(locale, hass, settings.hours > 24);
  const regularNumber = new Intl.NumberFormat(locale, { maximumFractionDigits:2 });
  const scientificNumber = new Intl.NumberFormat(locale, { maximumFractionDigits:2, notation:'scientific' });
  const formatNumber = value => {
    const absolute = Math.abs(value);
    return (absolute >= 1000000 || (absolute > 0 && absolute < .01) ? scientificNumber : regularNumber).format(value);
  };
  const valueText = (value, unit) => formatNumber(value) + (unit ? ' ' + unit : '');
  const active = () => !disposed && slot.isConnected && dialog?.open && !dialog.hasAttribute('data-closing') &&
    view.location.pathname === pathname;
  const activeSources = () => sources.filter(item => {
    const currentUnit = readingUnit(hass?.states?.[item.entity]);
    return visible(item.entity, hass) && (currentUnit === undefined || currentUnit === item.unit);
  });

  const sourceSnapshot = () => new Map(activeSources().map(({ entity }) => {
    const current = hass.states[entity];
    return [entity, JSON.stringify([current.state, current.last_changed])];
  }));
  let seenSources = sourceSnapshot();
  let hasRecorder = typeof hass?.callWS === 'function';

  function selectTime(index, updateInput = true) {
    const at = selectedTimes[index];
    if (!Number.isFinite(at)) return;
    selectedTime = at;
    if (updateInput) input.value = String(index);
    const label = fullTime.format(at);
    time.textContent = label;
    marker.setAttribute('x1', x(at));
    marker.setAttribute('x2', x(at));
    const output = [];
    for (const item of valueViews) {
      if (hiddenSeries.has(item.entity)) continue;
      const value = item.points.findLast(point => point.at <= at)?.value;
      const text = Number.isFinite(value) ? valueText(value, item.unit) : t('comparison_no_value');
      item.value.textContent = text;
      output.push(item.name + ' ' + text);
    }
    input.setAttribute('aria-valuetext', [label, ...output].join(', '));
  }

  function toggleSeries(entity) {
    if (!active()) return;
    const sources = activeSources();
    if (!sources.some(item => item.entity === entity)) return;
    if (!hiddenSeries.delete(entity)) {
      if (sources.filter(item => !hiddenSeries.has(item.entity)).length <= 1) return;
      hiddenSeries.add(entity);
    }
    paint();
  }

  function readingView(item) {
    if (readingViews.has(item.entity)) return readingViews.get(item.entity);
    const li = make('li', 'comparison-reading');
    const control = button('comparison-series');
    const dot = make('span', 'comparison-swatch');
    dot.style.setProperty('--series-color', item.color);
    dot.setAttribute('aria-hidden', 'true');
    const name = make('span', 'comparison-reading-name', item.name);
    name.dir = 'auto';
    const value = make('span', 'comparison-value');
    value.dir = 'auto';
    value.id = readingPrefix + '-value-' + readingViews.size;
    control.setAttribute('aria-label', t('comparison_toggle_series').replace('{name}', item.name));
    control.onclick = () => toggleSeries(item.entity);
    control.append(dot, name, value);
    li.append(control);
    const result = { li, control, value };
    readingViews.set(item.entity, result);
    return result;
  }

  function paint() {
    const selected = activeSources();
    if (selected.length && selected.every(item => hiddenSeries.has(item.entity))) {
      hiddenSeries.delete(selected[0].entity);
    }
    const sourceKey = selected.map(item => item.entity).join(' ');
    const shown = selected.filter(item => !hiddenSeries.has(item.entity));
    const selectedKey = sourceKey + '|' + shown.map(item => item.entity).join(' ');
    if (key === selectedKey) {
      if (visual.hidden) {
        for (const item of valueViews) item.value.textContent = stateLabel(modelFor(item));
      }
      return;
    }
    key = selectedKey;
    const series = selected.map(item => ({ ...item,
      points:data?.find(candidate => candidate.entity === item.entity)?.points ?? [] }));
    const visibleSeries = series.filter(item => !hiddenSeries.has(item.entity));
    const bounds = numericBounds(visibleSeries);
    visual.hidden = picker.hidden = !bounds;
    message.hidden = !!bounds && !failure;
    message.textContent = t(pending ? 'comparison_loading' : failure
      ? bounds ? 'comparison_refresh_failed' : 'comparison_unavailable' : 'comparison_empty');
    valueViews = series.map(item => {
      const { li, control, value } = readingView(item);
      const showing = !hiddenSeries.has(item.entity);
      const lastVisible = showing && shown.length === 1;
      control.setAttribute('aria-pressed', String(showing));
      control.setAttribute('aria-disabled', String(lastVisible));
      if (showing) control.setAttribute('aria-describedby', value.id + (lastVisible ? ' ' + keptSeries.id : ''));
      else control.removeAttribute('aria-describedby');
      control.title = lastVisible ? t('comparison_keep_series') : control.getAttribute('aria-label');
      value.hidden = !showing;
      value.textContent = stateLabel(modelFor(item));
      return { ...item, li, value };
    });
    if (readingKey !== sourceKey) {
      readingKey = sourceKey;
      readings.replaceChildren(...valueViews.map(item => item.li));
    }
    if (!bounds) return;

    const marks = [0, 1 / 3, 2 / 3, 1];
    yAxis.replaceChildren(...marks.map(mark => make('span', '', formatNumber(bounds.at(1 - mark)))));
    xAxis.replaceChildren(...marks.map(mark => make('span', '', shortTime.format(startMs + mark * (endMs - startMs)))));
    const grid = marks.map(mark => shape('line',
      { 'class':'comparison-grid', x1:0, x2:plotWidth, y1:plotHeight * mark, y2:plotHeight * mark }));
    const strokes = [];
    const areas = [];
    for (const item of visibleSeries) {
      for (const path of drawPaths(item.points, x, bounds.y)) {
        strokes.push(shape('path', { 'class':'comparison-line', d:path.stroke, stroke:item.color }));
        if (path.area) areas.push(shape('path', { 'class':'comparison-fill', d:path.area, fill:item.color }));
      }
    }
    svg.replaceChildren(...grid, ...areas, ...strokes, marker);
    const times = [startMs];
    for (let at = endMs - Math.floor((endMs - startMs) / step) * step; at < endMs; at += step) {
      if (at > startMs) times.push(at);
    }
    times.push(endMs);
    if (selectedTime > startMs && selectedTime < endMs && !times.includes(selectedTime)) {
      times.splice(times.findIndex(at => at > selectedTime), 0, selectedTime);
    }
    selectedTimes = times;
    input.max = String(times.length - 1);
    selectTime(Math.max(0, times.findIndex(at => at >= selectedTime)));
  }

  input.addEventListener('input', () => selectTime(Number(input.value), false));
  svg.addEventListener('click', event => {
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width) return;
    const fraction = clip((event.clientX - bounds.x) / bounds.width, 1);
    const at = startMs + fraction * (endMs - startMs);
    const nearest = selectedTimes.reduce((best, time, index) =>
      Math.abs(time - at) < Math.abs(selectedTimes[best] - at) ? index : best, 0);
    selectTime(nearest);
  });

  function queueRefresh() {
    if (!refreshQueued || pendingRequest || refreshTimer !== undefined || !active()) return;
    refreshTimer = view.setTimeout(() => {
      refreshTimer = undefined;
      if (refreshQueued) refresh();
    }, refreshDelayMs);
  }

  function settle(attempt, history, failed = false) {
    if (pendingRequest !== attempt || !active()) return;
    view.clearTimeout(attempt.timeout);
    pendingRequest = undefined;
    pending = false;
    failure = failed;
    key = undefined;
    if (!failed) {
      const followLatest = selectedTime === endMs;
      startMs = attempt.start;
      endMs = attempt.end;
      selectedTime = followLatest ? endMs : Math.min(endMs, Math.max(startMs, selectedTime));
      data = buildComparisonSeries(history, activeSources(), { startMs, endMs, bucketMinutes:settings.bucket_minutes });
    }
    paint();
    queueRefresh();
  }

  function refresh() {
    if (!active() || pendingRequest) return;
    refreshQueued = false;
    const end = Date.now();
    const attempt = { start: end - span, end };
    pendingRequest = attempt;
    const selected = activeSources();
    if (!selected.length) { settle(attempt, {}); return; }
    if (typeof hass?.callWS !== 'function') { settle(attempt, null, true); return; }
    attempt.timeout = view.setTimeout(() => settle(attempt, null, true), historyTimeoutMs);
    const request = {
      type:'history/history_during_period', entity_ids:selected.map(item => item.entity),
      start_time:new Date(attempt.start - step).toISOString(), end_time:new Date(attempt.end).toISOString(),
      minimal_response:true, no_attributes:true, significant_changes_only:false,
    };
    let response;
    try { response = hass.callWS(request); }
    catch { settle(attempt, null, true); return; }
    Promise.resolve(response).then(
      result => {
        const valid = result && typeof result === 'object' && !Array.isArray(result);
        settle(attempt, valid ? result : null, !valid);
      },
      () => settle(attempt, null, true),
    );
  }

  const launch = view.requestAnimationFrame(refresh);

  return {
    update(nextHass) {
      hass = nextHass;
      if (!active()) return;
      const snapshot = sourceSnapshot();
      const recorderReady = typeof hass?.callWS === 'function';
      const changed = [...snapshot].some(([entity, state]) => seenSources.get(entity) !== state);
      if (changed || (recorderReady && !hasRecorder)) refreshQueued = true;
      seenSources = snapshot;
      hasRecorder = recorderReady;
      queueRefresh();
      paint();
    },
    dispose() {
      disposed = true;
      view.cancelAnimationFrame(launch);
      view.clearTimeout(refreshTimer);
      view.clearTimeout(pendingRequest?.timeout);
      pendingRequest = undefined;
    },
  };
}

export const temperatureComparisonStyles = `
  .temperature-comparison { container: bayit-comparison / inline-size; display:grid; gap:8px; min-inline-size:0; }
  .temperature-comparison [hidden] { display:none !important; }
  .comparison-visual {
    display:grid; grid-template-columns:auto minmax(0,1fr); gap:4px 7px;
    padding-block:6px 0; color:var(--secondary); font-size:11px; font-variant-numeric:tabular-nums;
  }
  .comparison-visual svg { inline-size:100%; block-size:clamp(154px,42vw,230px); overflow:visible; }
  .comparison-grid, .comparison-marker,.comparison-line { vector-effect:non-scaling-stroke; }
  .comparison-grid { stroke:currentColor; opacity:.20; stroke-width:1; }
  .comparison-marker { stroke:currentColor; opacity:.70; stroke-width:1; stroke-dasharray:3 3; }
  .comparison-line { fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  .comparison-fill { opacity:.16; }
  .comparison-y-axis { display:flex; flex-direction:column; justify-content:space-between; text-align:end; margin-block:-6px; }
  .comparison-x-axis { grid-column:2; display:flex; justify-content:space-between; gap:3px; }
  .comparison-x-axis > span { min-inline-size:0; text-align:center; }
  .comparison-picker { display:grid; gap:2px; justify-items:center; color:var(--secondary); font-size:12px; }
  .comparison-picker input { inline-size:100%; min-block-size:44px; margin:0; accent-color:var(--warm); }
  .comparison-selected-time { font-variant-numeric:tabular-nums; }
  .comparison-message { margin:0; color:var(--secondary); text-align:center; padding:8px; }
  .comparison-readings { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,124px),1fr)); gap:6px; list-style:none; margin:0; padding:0; }
  .comparison-series { display:grid; grid-template-columns:9px minmax(0,1fr) auto; align-items:center; gap:5px;
    inline-size:100%; min-inline-size:0; min-block-size:44px; padding:4px 6px; text-align:start; font-size:12px;
    border:1px solid var(--soft-line); border-radius:8px; background:transparent; }
  .comparison-series[aria-disabled=true] { cursor:default; }
  .comparison-swatch { inline-size:8px; block-size:8px; border-radius:50%; background:var(--series-color); }
  .comparison-series[aria-pressed=false] .comparison-swatch { border:1px solid var(--series-color); background:transparent; }
  .comparison-series[aria-pressed=false] .comparison-reading-name { text-decoration:line-through; color:var(--secondary); }
  .comparison-reading-name { color:var(--ink); overflow-wrap:anywhere; }
  .comparison-value { color:var(--secondary); font-weight:650; text-align:end;
    max-inline-size:11ch; overflow-wrap:anywhere; font-variant-numeric:tabular-nums; }
  @container bayit-comparison (max-width: 379px) {
    .comparison-visual svg { block-size:clamp(140px,48cqi,180px); }
    .comparison-readings { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .comparison-series {
      grid-template-columns:9px minmax(0,1fr); grid-template-areas:"label label" "color value";
      gap:2px 5px; padding-block:3px;
    }
    .comparison-reading-name { grid-area:label; }
    .comparison-swatch { grid-area:color; }
    .comparison-value { grid-area:value; text-align:start; }
  }
  @container bayit-comparison (286px <= width <= 379px) {
    .comparison-readings:has(> :nth-child(3)) { grid-template-columns:repeat(3,minmax(0,1fr)); }
  }
  @media (prefers-contrast:more) {
    .comparison-line { stroke-width:3; }
    .comparison-fill { opacity:.08; }
    .comparison-swatch { outline:1px solid currentColor; }
  }
  @media (forced-colors:active) {
    .comparison-grid,.comparison-line,.comparison-marker { stroke:CanvasText; }
    .comparison-fill { display:none; }
    .comparison-swatch { background:CanvasText; }
    .comparison-series[aria-pressed=false] .comparison-swatch { border-color:CanvasText; }
  }
`;
