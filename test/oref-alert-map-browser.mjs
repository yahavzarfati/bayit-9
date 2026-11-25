
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<main></main><div id="editor"></div><script type="module">
import '/bayit-9.js';
const options = new URL(location.href).searchParams;
const tracker = { factories: 0, calls: [], configs: [], reads: [], escaped: [], detached: 0, details: [] };
document.addEventListener('hass-more-info', event => tracker.details.push(event.detail));
const hass = {
  locale: { language: options.has('he') ? 'he' : 'en' }, themes: {},
  states: {
    'lock.fixture': { state: 'locked', attributes: { friendly_name: 'Front door' } },
    'zone.home': { state: '1', attributes: { latitude: 1.234, longitude: 2.345 } },
  },
  areas: {}, devices: {}, entities: { 'lock.fixture': {} },
  config: { latitude: 1.234, longitude: 2.345 },
  services: options.has('missing-services') ? {} : { oref_alert: { last_update: {}, areas_status: {}, synthetic_alert: {} } },
  callService(...args) {
    tracker.calls.push(args);
    if (options.has('read-fails')) return Promise.reject(new Error('Fixture blocked read'));
    return Promise.resolve({ response: {} });
  },
};
document.addEventListener('context-request', event => {
  tracker.escaped.push(event.context);
  event.callback({ config: hass.config, states: hass.states });
});
const tag = 'oref-alert-map';
class MockOref extends HTMLElement {
  connectedCallback() {
    const requests = {};
    const target = this.attachShadow({ mode: 'open' }).appendChild(document.createElement('span'));
    target.textContent = 'Fixture map';
    for (const context of ['hassConfig', 'config', 'states', 'entities', 'fullEntities', 'areas', 'devices']) {
      const event = new Event('context-request', { bubbles: true, composed: true });
      Object.assign(event, { context, callback: value => { requests[context] = value; } });
      target.dispatchEvent(event);
    }
    tracker.reads.push(requests);
  }
  disconnectedCallback() { tracker.detached++; }
  setConfig(config) { tracker.configs.push(config); }
  set hass(value) {
    tracker.scoped = value;
    void value.callService('oref_alert', 'last_update').catch(() => {});
  }
}
if (!options.has('missing-module')) customElements.define(tag, MockOref);
window.loadCardHelpers = async () => {
  if (options.has('delay')) await new Promise(resolve => { tracker.resolveFactory = resolve; });
  return { createCardElement(configuration) {
    tracker.factories++;
    const element = document.createElement(tag);
    element.setConfig(configuration);
    return element;
  } };
};
const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
const readouts = options.has('readouts') && {
  kind: 'status', title: 'Security readings', ...(options.has('normal') ? {} : { layout: 'readouts' }),
  entities: [
    { entity: 'binary_sensor.fixture_local', name: 'Local signal', role: 'status',
      readout: { state_labels: { on: 'Signal active', off: 'Quiet', unknown: 'Quiet' }, danger_on: true } },
    { entity: 'sensor.fixture_summary', name: 'Summary',
      readout: { state_labels: { safe: 'Quiet', ok: 'Normal' } } },
    { entity: 'sensor.fixture_count', name: 'Time reading', readout: { unit: 'seconds' } },
    { entity: 'binary_sensor.fixture_remote', name: 'Remote signal',
      readout: { state_labels: { off: 'Quiet', unavailable: 'Quiet' }, danger_on: true } },
  ],
};
if (readouts) {
  for (const [item, state] of readouts.entities.map((item, index) => [item, ['on', 'SAFE', '15', 'off'][index]])) {
    hass.states[item.entity] = { state, attributes: { friendly_name: item.name } };
    hass.entities[item.entity] = {};
  }
}
if (options.has('two-readouts') && readouts) readouts.entities = readouts.entities.slice(0, 2);
const config = { type: 'custom:bayit-9', toolbar: [
  { kind: 'security', entities: ['lock.fixture'], ...(readouts && { sections: [readouts] }), oref_map: { enabled: !options.has('disabled'), auto_fit: false,
    hebrew_basemap: false, show_pre_alert: false, show_location: true, show_home: true,
    tileLayer: 'https://fixture.invalid/', entities: ['zone.home'] } },
  { kind: 'settings' },
] };
const dashboard = document.createElement('bayit-dashboard');
dashboard.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
dashboard.hass = hass;
tracker.setState = (entity, state) => {
  hass.states[entity] = { ...hass.states[entity], state };
  dashboard.hass = { ...hass, states: { ...hass.states } };
};
document.querySelector('main').append(dashboard);
if (options.has('editor')) {
  const editor = Strategy.getConfigElement();
  editor.hass = hass;
  editor.setConfig(config);
  editor.addEventListener('config-changed', event => { tracker.draft = event.detail.config; });
  document.querySelector('#editor').append(editor);
}
window.tracker = tracker;
</script>`;
const server = http.createServer((request, response) => {
  const script = request.url === '/bayit-9.js';
  response.writeHead(200, { 'content-type': script ? 'text/javascript' : 'text/html' });
  response.end(script ? bundle : fixture);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

try {
  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({viewport: { width: 390, height: 844 }, reducedMotion: 'reduce'});
      page.setDefaultTimeout(7000);
      const errors = [];
      page.on('pageerror', error => errors.push(error));
      const openFixture = options => page.goto(`http://127.0.0.1:${server.address().port}/fixture-home/home${options}`);
      const security = () => page.getByRole('button', { name: 'Security', exact: true }).click();
      const map = page.locator('oref-alert-map');
      const fallback = page.getByText('The alert map is unavailable.', { exact: false });
      const close = () => page.getByRole('button', { name: 'Close', exact: true }).click();
      const factories = () => page.evaluate(() => tracker.factories);

      for (const [query, usesFallback] of [['?disabled', false], ['?missing-module', true], ['?missing-services', true]]) {
        await openFixture(query);
        await security();
        await page.getByText('Front door', { exact: true }).waitFor();
        assert.equal(await fallback.isVisible(), usesFallback);
        assert.equal(await factories(), 0);
      }

      await openFixture('');
      assert.equal(await map.count(), 0);
      await security();
      await map.waitFor();
      const scope = await page.evaluate(() => ({
        cfg: tracker.configs[0], requests: tracker.reads[0], escaped: tracker.escaped,
        config: tracker.scoped.config, states: tracker.scoped.states, calls: tracker.calls,
      }));
      assert.deepEqual(scope.cfg, {
        type: 'custom:oref-alert-map', auto_fit: false, hebrew_basemap: false, show_pre_alert: false, show_end: true,
        show_home: false, show_location: false, default_zoom: 8, aspect_ratio: '4:3',
      });
      assert.deepEqual(scope.escaped, []);
      assert.deepEqual(scope.config, scope.requests.hassConfig.config);
      assert.deepEqual(scope.config, scope.requests.config);
      assert.equal(scope.config.country, 'IL');
      assert.notEqual(scope.config.latitude, 1.234);
      assert.notEqual(scope.config.longitude, 2.345);
      assert.deepEqual(scope.states, {});
      for (const key of ['states','entities','fullEntities','areas','devices']) assert.deepEqual(scope.requests[key], {});
      assert.deepEqual(scope.calls, [['oref_alert', 'last_update', {}, undefined, false, true]]);
      assert.equal(await page.evaluate(async () => {
        try { await tracker.scoped.callService('oref_alert', 'synthetic_alert'); }
        catch { return true; }
        return false;
      }), true);
      await page.evaluate(() => tracker.scoped.callService('oref_alert', 'areas_status', { area: 'fixture' }, { entity_id: 'zone.home' }));
      assert.deepEqual(await page.evaluate(() => tracker.calls.at(-1)), ['oref_alert', 'areas_status', {}, undefined, false, true]);
      await close();
      await map.waitFor({ state: 'detached' });
      const stoppedAt = await page.evaluate(() => tracker.calls.length);
      await page.evaluate(() => tracker.scoped.callService('oref_alert', 'last_update'));
      assert.equal(await page.evaluate(() => tracker.calls.length), stoppedAt);

      await security();
      await map.waitFor();
      await page.evaluate(() => {
        history.pushState({}, '', '/a-different-dashboard');
        window.dispatchEvent(new CustomEvent('location-changed'));
      });
      await map.waitFor({ state: 'detached' });
      await page.evaluate(() => {
        history.replaceState({}, '', '/fixture-home/home');
        window.dispatchEvent(new CustomEvent('location-changed'));
      });
      assert.equal(await map.count(), 0);

      await openFixture('?delay');
      await security();
      await page.waitForFunction(() => tracker.resolveFactory);
      await close();
      await page.evaluate(() => tracker.resolveFactory());
      assert.equal(await factories(), 0);
      assert.equal(await map.count(), 0);

      await openFixture('?read-fails');
      await security();
      await fallback.waitFor();
      assert.equal(await map.count(), 0);
      await page.getByText('Front door', { exact: true }).waitFor();

      await openFixture('?readouts&disabled');
      await security();
      const strip = page.locator('.toolbar-section[data-layout=readouts]');
      const tiles = strip.locator('.security-readout');
      await strip.getByText('Signal active', { exact: true }).waitFor();
      assert.deepEqual(await tiles.locator('.tile-state').allTextContents(), ['Signal active', 'Quiet', '15 seconds', 'Quiet']);
      assert.equal(await strip.getByRole('button').count(), 0);
      assert.equal(await strip.locator('.security-readout[data-danger]').count(), 1);
      const rowCount = () => tiles.evaluateAll(items => new Set(items.map(tile => Math.round(tile.getBoundingClientRect().top))).size);
      assert.equal(await rowCount(), 1);
      const stripHeight = Math.round((await strip.locator('.toolbar-section-items').boundingBox()).height);
      assert.ok(stripHeight >= 62 && stripHeight <= 82, 'The four concise readouts fit in one compact row at ' + stripHeight + ' px');
      await page.setViewportSize({ width: 320, height: 844 });
      assert.equal(await rowCount(), 2);
      await page.setViewportSize({ width: 390, height: 844 });
      await tiles.first().click();
      await page.evaluate(() => {
        tracker.setState('binary_sensor.fixture_local', 'unknown');
        tracker.setState('sensor.fixture_summary', 'ok');
        tracker.setState('sensor.fixture_count', 'waiting');
        tracker.setState('binary_sensor.fixture_remote', 'unavailable');
      });
      await strip.getByText('Unknown state', { exact: true }).waitFor();
      assert.deepEqual(await tiles.locator('.tile-state').allTextContents(), ['Unknown state', 'Normal', 'waiting', 'Unavailable']);
      assert.equal(await strip.locator('.security-readout[data-danger]').count(), 0);
      assert.deepEqual(await page.evaluate(() => ({ details: tracker.details, calls: tracker.calls })), { details: [], calls: [] });

      await openFixture('?readouts&disabled&two-readouts');
      await security();
      await tiles.nth(1).waitFor();
      assert.ok((await tiles.first().boundingBox()).width >= 130, 'Two readouts share the available row width');

      await openFixture('?readouts&disabled&normal');
      await security();
      assert.equal(await tiles.count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Local signal · On', exact: true }).count(), 1);

      await openFixture('?readouts&disabled&editor');
      await page.getByText('Toolbar and extra screens', { exact: true }).click();
      const readoutOption = page.getByLabel('Show compact read-only status tiles', { exact: true });
      assert.equal(await readoutOption.isChecked(), true);
      await page.getByRole('button', { name: 'Local signal', exact: true }).click();
      const onLabel = page.getByLabel('Label for on', { exact: true });
      assert.equal(await onLabel.inputValue(), 'Signal active');
      await onLabel.fill('Custom active');
      await onLabel.blur();
      await page.getByLabel('Highlight the on state in red', { exact: true }).uncheck();
      assert.deepEqual(await page.evaluate(() => tracker.draft.toolbar[0].sections[0].entities[0].readout), {
        state_labels: { on: 'Custom active', off: 'Quiet' },
      });
      await readoutOption.uncheck();
      assert.equal(await onLabel.count(), 0);
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].sections[0].layout), undefined);

      await openFixture('?readouts&disabled&editor&he');
      await page.getByText('סרגל ומסכים נוספים', { exact: true }).click();
      await page.getByRole('button', { name: 'Local signal', exact: true }).click();
      assert.equal(await page.getByLabel('תווית למצב פעיל', { exact: true }).inputValue(), 'Signal active');
      assert.equal(await page.getByLabel('הדגשת מצב פעיל באדום', { exact: true }).isChecked(), true);

      await openFixture('?editor&disabled');
      await page.getByText('Toolbar and extra screens', { exact: true }).click();
      const optIn = page.getByLabel('Show the Oref alert map', { exact: true });
      const preAlerts = page.getByLabel('Show advance warnings', { exact: true });
      assert.equal(await preAlerts.isVisible(), false);
      await optIn.check();
      await preAlerts.check();
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].oref_map.show_pre_alert), true);
      await optIn.uncheck();
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].oref_map.enabled), false);
      assert.equal(await preAlerts.isVisible(), false);
      assert.deepEqual(errors, []);
      console.log(name + ': optional alert map, ' + stripHeight + ' px read-only status tiles, isolated context, navigation and visual editor passed');
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
