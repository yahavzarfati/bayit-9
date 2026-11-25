import { buildComparisonSeries, parseTemperatureValue } from './temperature-comparison.js';
import { createNativeCards, sensorGraphConfig } from './toolbar-panels.js';

const day = 24 * 60 * 60 * 1000;
const chartWidth = 320;
const chartHeight = 45;
const svgNamespace = 'http://www.w3.org/2000/svg';
let nextChartId = 0;

function chartPaths(points, start, end) {
  const values = points.flatMap(point => point.value == null ? [] : [point.value]);
  if (!values.length) return [];
  const low = Math.min(...values);
  const span = Math.max(1, Math.max(...values) - low);
  const segments = [[]];
  for (const point of points) {
    const segment = segments.at(-1);
    if (point.value == null) {
      if (segment.length) segments.push([]);
      continue;
    }
    const x = (point.at - start) * chartWidth / (end - start);
    const y = chartHeight - 2 - (point.value - low) * (chartHeight - 7) / span;
    segment.push([x, y]);
  }
  return segments.filter(segment => segment.length > 1).map(segment => {
    const first = segment[0];
    const last = segment.at(-1);
    let line = 'M' + first.join(',');
    for (const [index, point] of segment.slice(1, -1).entries()) {
      const next = segment[index + 2];
      const middle = [(point[0] + next[0]) / 2, (point[1] + next[1]) / 2];
      line += ' Q' + point.join(',') + ' ' + middle.join(',');
    }
    line += ' L' + last.join(',');
    return { line, fill: line + ' V' + chartHeight + ' H' + first[0] + ' Z' };
  });
}

function buildCompactGraph(config, hass, { host, make, icon, moreInfo, locale, t }) {
  const document = host.ownerDocument;
  const view = document.defaultView;
  const root = make('button', 'room-temperature-chart');
  root.type = 'button';
  root.dir = 'ltr';
  root.style.setProperty('--room-chart-color', config.room_temperature_graph_color);
  root.append(icon(config.room_icon || 'mdi:thermometer'));
  root.addEventListener('click', () => moreInfo(config, root));

  const reading = make('span', 'room-temperature-reading');
  const value = make('span', 'room-temperature-value');
  const units = make('span', 'room-temperature-unit');
  reading.append(value, units);
  root.append(reading);

  function shape(tag, attributes) {
    const item = document.createElementNS(svgNamespace, tag);
    for (const [name, value] of Object.entries(attributes)) item.setAttribute(name, value);
    return item;
  }

  const svg = shape('svg', {
    viewBox: '0 0 ' + chartWidth + ' ' + chartHeight,
    preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false',
  });
  const id = 'bayit-room-temperature-' + ++nextChartId;
  const defs = shape('defs', {});
  const gradient = shape('linearGradient', { id, x1: '0', x2: '0', y1: '0', y2: '1' });
  gradient.append(shape('stop', { offset: '0%', 'stop-opacity': '.36' }), shape('stop', { offset: '100%', 'stop-opacity': '0' }));
  defs.append(gradient);
  const plot = shape('g', {});
  svg.append(defs, plot);
  root.append(svg);

  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const heading = config.room_name || t('room_temperature_chart');
  let disposed = false;
  let latest;
  let currentHass = hass;
  let started = false;
  let scheduled;

  function update(next) {
    currentHass = next;
    const sensor = next?.states?.[config.entity];
    if (sensor !== latest) {
      latest = sensor;
      const reported = parseTemperatureValue(sensor?.state);
      const amount = reported !== null ? number.format(reported) : '—';
      const unit = typeof sensor?.attributes?.unit_of_measurement === 'string' ? sensor.attributes.unit_of_measurement : '';
      value.textContent = amount;
      units.textContent = reported !== null ? unit : '';
      root.setAttribute('aria-label', heading + ' · ' + (reported !== null ?
        amount + (unit ? ' ' + unit : '') : t('unknown')) + ' · ' + t('more_info'));
    } else if (!root.hasAttribute('aria-label')) {
      value.textContent = '—';
      root.setAttribute('aria-label', heading + ' · ' + t('unknown') + ' · ' + t('more_info'));
    }
    if (!started && typeof next?.callWS === 'function') {
      started = true;
      scheduled = view.requestAnimationFrame(load);
    }
  }

  async function load() {
    scheduled = undefined;
    if (disposed || !root.isConnected) return;
    const end = Date.now();
    const start = end - day;
    const unit = currentHass.states?.[config.entity]?.attributes?.unit_of_measurement;
    try {
      const result = await currentHass.callWS({
        type: 'history/history_during_period', entity_ids: [config.entity],
        start_time: new Date(start - 30 * 60000).toISOString(), end_time: new Date(end).toISOString(),
        minimal_response: true, significant_changes_only: false,
      });
      if (disposed || !root.isConnected) return;
      const [series] = buildComparisonSeries(result, [{ entity: config.entity, unit }], { startMs: start, endMs: end });
      const paths = chartPaths(series?.points ?? [], start, end);
      plot.replaceChildren(...paths.flatMap(({ line, fill }) => [
        shape('path', { class: 'room-temperature-fill', d: fill, fill: 'url(#' + id + ')' }),
        shape('path', { class: 'room-temperature-line', d: line }),
      ]));
    } catch { /* The current reading remains available if the recorder cannot serve history. */ }
  }

  update(hass);
  return {
    root,
    update,
    dispose() {
      disposed = true;
      if (scheduled !== undefined) view.cancelAnimationFrame(scheduled);
    },
  };
}

export function createRoomGraphs(host, hass, context) {
  const native = createNativeCards(host, hass, context.make);
  const compact = [];
  return {
    mount(config, fallback) {
      if (!config.room_temperature_graph_color) return native.mount(sensorGraphConfig(config, { moreInfo: true }), fallback);
      const chart = buildCompactGraph(config, hass, { ...context, host });
      compact.push(chart);
      return chart.root;
    },
    update(next) {
      hass = next;
      native.update(next);
      for (const chart of compact) chart.update(next);
    },
    dispose() {
      native.dispose();
      for (const chart of compact) chart.dispose();
      compact.length = 0;
    },
  };
}

export const roomTemperatureChartStyles = `
  .room-temperature-chart {
    display:grid; gap:0; grid-template-rows:26px 48px 44px; justify-items:start;
    width:100%; min-width:0; text-align:start; padding:8px 1px 2px; border:0;
    border-radius:10px; color:var(--ink); background:transparent;
  }
  .room-temperature-chart > ha-icon { margin-inline-start:12px; }
  .room-temperature-reading {
    display:flex; align-items:baseline; align-self:center; gap:3px;
    margin-inline-start:14px; font-variant-numeric:tabular-nums;
  }
  .room-temperature-value { font-size:22px; line-height:1.2; font-weight:500; }
  .room-temperature-unit { color:var(--secondary); font-size:12px; }
  .room-temperature-chart svg { display:block; width:100%; height:44px; overflow:hidden; }
  .room-temperature-chart stop { stop-color:var(--room-chart-color); }
  .room-temperature-line {
    fill:none; stroke:var(--room-chart-color); stroke-width:1.4; stroke-linecap:round;
    stroke-linejoin:round; vector-effect:non-scaling-stroke;
  }
  @media (prefers-contrast:more), (forced-colors:active) {
    .room-temperature-line { stroke:currentColor; stroke-width:2; }
    .room-temperature-fill { display:none; }
  }
`;
