
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
const mapServices = { oref_alert: { last_update: {}, areas_status: {}, synthetic_alert: {} } };
const failure = options.get('failure');
const failuresAt = new Set((options.get('fail-at') ?? '1').split(',').map(Number));
document.addEventListener('hass-more-info', event => tracker.details.push(event.detail));
const hass = {
  locale: { language: options.has('he') ? 'he' : 'en' }, themes: {},
  states: {
    'lock.fixture': { state: 'locked', attributes: { friendly_name: 'Front door' } },
    'zone.home': { state: '1', attributes: { latitude: 1.234, longitude: 2.345 } },
  },
  areas: {}, devices: {}, entities: { 'lock.fixture': {} },
  config: { latitude: 1.234, longitude: 2.345 },
  services: options.has('missing-services') ? {} : mapServices,
  callService(...args) {
    tracker.calls.push(args);
    if (options.has('read-fails')) return Promise.reject(new Error('Fixture blocked read'));
    if (options.has('late-timeout')) return new Promise((_, reject) => {
      tracker.rejectLateRead = () => reject({ code: 'timeout' });
    });
    if (failure && (failuresAt.has(tracker.calls.length) || options.has('repeat'))) {
      const error = ['socket', 'timeout'].includes(failure)
        ? { type: 'result', success: false, error: { code: failure === 'socket' ? 3 : 'timeout', message: 'Fixture read failure' } }
        : { code: failure };
      return Promise.reject(error);
    }
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
  if (options.has('localized-readouts')) {
    const names = options.has('he') ? ['התראה בבית', 'סטטוס', 'זמן להתמגן', 'כל האזורים']
      : ['Home alert', 'Status', 'Shelter time', 'All areas'];
    readouts.entities.forEach((item, index) => { item.name = names[index]; });
  }
  for (const [item, state] of readouts.entities.map((item, index) => [item, ['on', 'SAFE', '15', 'off'][index]])) {
    hass.states[item.entity] = { state, attributes: { friendly_name: item.name } };
    hass.entities[item.entity] = {};
  }
}
if (options.has('two-readouts') && readouts) readouts.entities = readouts.entities.slice(0, 2);
const securityActions = options.has('danger-action') && { kind: 'actions', entities: [
  { entity: 'script.fixture_secure', name: 'Secure fixture', role: 'action', icon: 'mdi:shield-lock',
    command: 'run_script', confirmation: 'Confirm fixture action?', action_appearance: 'danger' },
  { entity: 'script.fixture_neutral', name: 'Neutral fixture', role: 'action', command: 'run_script', confirmation: true },
  { entity: 'script.fixture_immediate', name: 'Immediate fixture', role: 'action',
    command: 'run_script', confirmation: false, action_appearance: 'danger' },
] };
if (securityActions) {
  for (const item of securityActions.entities) {
    hass.states[item.entity] = { state: 'off', attributes: { friendly_name: item.name } };
    hass.entities[item.entity] = {};
  }
  hass.services = { ...hass.services, script: { turn_on: {} } };
  hass.callWS = async request => {
    tracker.calls.push(request);
    return {};
  };
}
const sections = [securityActions, readouts].filter(Boolean);
const config = { type: 'custom:bayit-9', toolbar: [
  { kind: 'security', entities: ['lock.fixture'], ...(sections.length && { sections }), oref_map: { enabled: !options.has('disabled'), auto_fit: false,
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
tracker.setRegistry = (entity, info) => {
  hass.entities = { ...hass.entities, [entity]:info };
  dashboard.hass = { ...hass };
};
tracker.hideBeforeDispatch = entity => {
  const update = dashboard.update;
  dashboard.update = function (...args) {
    this.update = update;
    tracker.setRegistry(entity,{disabled_by:'user'});
    return update.apply(this,args);
  };
};
tracker.removeSecureAction = () => {
  config.toolbar[0].sections[0].entities = config.toolbar[0].sections[0].entities
    .filter(item => item.entity !== 'script.fixture_secure');
  dashboard.setConfig(Strategy.generate(config,hass).views[0].cards[0]);
};
tracker.setMapServices = available => {
  hass.services = available ? mapServices : {};
  dashboard.hass = { ...hass };
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

const failures = [];
try {
  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
    let browser;
    try {
      browser = await engine.launch();
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
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);
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

      await page.clock.install();
      const readCount = () => page.evaluate(() => tracker.calls.length);
      async function startWithFailedMap(query) {
        await openFixture(query);
        await security();
        await page.waitForFunction(() => tracker.detached === 1);
        await fallback.waitFor();
        assert.equal(await map.count(), 0);
        assert.equal(await readCount(), 1);
      }
      const refreshSnapshot = () => page.evaluate(() => tracker.setState('lock.fixture', 'locked'));
      const leaveDashboard = () => page.evaluate(() => {
        history.pushState({}, '', '/a-different-dashboard');
        window.dispatchEvent(new CustomEvent('location-changed'));
      });

      for (const code of ['socket', 'timeout']) {
        await startWithFailedMap('?failure=' + code);
        await refreshSnapshot();
        await refreshSnapshot();
        await page.clock.fastForward(500);
        assert.equal(await factories(), 1);
        assert.equal(await fallback.isVisible(), true);
        await page.clock.fastForward(1300);
        await map.waitFor();
        assert.equal(await fallback.isVisible(), false);
        assert.equal(await factories(), 2);
        assert.equal(await readCount(), 2);
        await page.clock.fastForward(20000);
        assert.equal(await factories(), 2);
      }

      await openFixture('?failure=socket&fail-at=2,4,6,8');
      await security();
      await map.waitFor();
      for (const [delay, retries] of [[1800, true], [4300, true], [10300, true], [30000, false]]) {
        await page.evaluate(() => tracker.scoped.callService('oref_alert', 'areas_status').catch(() => {}));
        await fallback.waitFor();
        assert.equal(await map.count(), 0);
        await page.clock.fastForward(delay);
        if (retries) await map.waitFor();
      }
      assert.equal(await map.count(), 0);
      assert.equal(await factories(), 4);
      assert.equal(await fallback.isVisible(), true);
      assert.deepEqual(await page.evaluate(() => tracker.calls.map(args => args[1])),
        Array.from({ length: 4 }, () => ['last_update', 'areas_status']).flat());

      for (const code of ['connection_lost', 'timeout']) {
        await startWithFailedMap('?failure=' + code + '&repeat');
        for (const [delay, expected] of [[1800, 2], [4300, 3], [10300, 4]]) {
          await page.clock.fastForward(delay);
          await page.waitForFunction(total => tracker.detached === total, expected);
          await refreshSnapshot();
          assert.equal(await factories(), expected);
          assert.equal(await readCount(), expected);
          assert.equal(await fallback.isVisible(), true);
          assert.equal(await map.count(), 0);
        }
        await page.clock.fastForward(30000);
        assert.equal(await factories(), 4);
        assert.equal(await readCount(), 4);
      }

      for (const code of ['forbidden', 'not_found', 'unknown_error']) {
        await startWithFailedMap('?failure=' + code);
        await refreshSnapshot();
        await page.clock.fastForward(30000);
        assert.equal(await readCount(), 1);
      }

      await openFixture('?late-timeout');
      await security();
      await page.waitForFunction(() => tracker.rejectLateRead);
      await close();
      await map.waitFor({ state: 'detached' });
      await page.evaluate(() => tracker.rejectLateRead());
      await page.clock.fastForward(30000);
      assert.equal(await factories(), 1);
      assert.equal(await readCount(), 1);
      assert.equal(await map.count(), 0);

      for (const end of [close, leaveDashboard, () => page.evaluate(() => tracker.setMapServices(false))]) {
        await startWithFailedMap('?failure=socket');
        await end();
        await page.clock.fastForward(30000);
        if (end === leaveDashboard) {
          await page.evaluate(() => {
            history.replaceState({}, '', '/fixture-home/home');
            window.dispatchEvent(new CustomEvent('location-changed'));
          });
        }
        await page.evaluate(() => tracker.setMapServices(true));
        await page.clock.fastForward(30000);
        assert.equal(await factories(), 1);
        assert.equal(await readCount(), 1);
        assert.equal(await map.count(), 0);
      }

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
      // Local system fonts can add a line to a readout at the same viewport width.
      assert.ok(stripHeight >= 62 && stripHeight <= 94, 'The four readouts fit in one compact row at ' + stripHeight + ' px');
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

      for (const he of [false, true]) {
        const localeFlag = he ? '&he' : '';
        const openSecurity = () => page.getByRole('button', { name: he ? 'אבטחה' : 'Security', exact: true }).click();
        await page.setViewportSize({ width: 391, height: 844 });
        await openFixture('?readouts&localized-readouts&disabled' + localeFlag);
        await openSecurity();
        const caption = tiles.first().locator('.tile-label');
        assert.equal(await caption.textContent(), he ? 'התראה בבית' : 'Home alert');
        for (const width of [391, 320]) {
          await page.setViewportSize({ width, height: 844 });
          const placements = await tiles.evaluateAll(items => items.map(tile => {
            const rect = tile.getBoundingClientRect();
            const caption = tile.querySelector('.tile-label');
            return { x:rect.x, top:rect.top, left:rect.left, right:rect.right,
              direction:getComputedStyle(tile).direction, captionHeight:caption.getBoundingClientRect().height };
          }));
          assert.ok(placements.every(tile => tile.left >= 0 && tile.right <= width && tile.direction === (he ? 'rtl' : 'ltr')));
          assert.ok(placements[0].captionHeight <= 15);
          assert.equal(placements[0].top, placements[1].top);
          assert.ok(placements[0].x < placements[1].x);
          if (width === 391) {
            assert.equal(placements[0].top, placements[3].top);
            assert.ok(placements[1].x < placements[2].x && placements[2].x < placements[3].x);
          } else {
            assert.ok(placements[1].top < placements[2].top);
            assert.ok(placements[2].x < placements[3].x);
            assert.equal(placements[2].top, placements[3].top);
          }
        }
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);

        await page.setViewportSize({ width: 391, height: 844 });
        await openFixture('?danger-action&disabled' + localeFlag);
        await openSecurity();
        const action = page.getByRole('button', { name: 'Secure fixture', exact: true });
        const neutral = page.getByRole('button', { name: 'Neutral fixture', exact: true });
        const immediate = page.getByRole('button', { name: 'Immediate fixture', exact: true });
        await action.waitFor();
        assert.equal(await action.getAttribute('data-security-danger'), '');
        assert.equal(await neutral.getAttribute('data-security-danger'), null);
        assert.equal(await immediate.getAttribute('data-security-danger'), null);
        assert.notEqual(await action.evaluate(button => getComputedStyle(button).borderTopColor),
          await neutral.evaluate(button => getComputedStyle(button).borderTopColor));
        await action.click();
        const prompt = page.getByRole('dialog', { name: he ? 'אישור פעולה' : 'Confirm action', exact: true });
        await prompt.getByText('Confirm fixture action?', { exact: true }).waitFor();
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);
        await prompt.getByRole('button', { name: he ? 'ביטול' : 'Cancel', exact: true }).click();
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);
        const accept = prompt.getByRole('button', { name: he ? 'אישור' : 'Confirm', exact: true });
        const script = 'script.fixture_secure';
        const unavailable = he ? 'לא זמין' : 'Unavailable';
        const disabled = page.getByRole('button', { name:'Secure fixture · ' + unavailable, exact:true });
        const restore = async () => {
          await page.evaluate(script => tracker.setRegistry(script,{}),script);
          await action.waitFor();
        };
        await action.evaluate((tile,id) => {
          tracker.setRegistry(id,{hidden_by:'user'});
          tile.click();
        }, script);
        await disabled.waitFor();
        assert.equal(await disabled.isDisabled(),true);
        assert.equal(await prompt.isVisible(),false);
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);
        await restore();

        await action.click();
        await prompt.waitFor();
        await page.evaluate(script => tracker.setRegistry(script,{hidden:true}),script);
        await accept.click();
        await prompt.waitFor({state:'hidden'});
        await disabled.waitFor();
        assert.equal(await disabled.isDisabled(),true);
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);
        await restore();

        await action.click();
        await prompt.waitFor();
        await page.evaluate(script => tracker.hideBeforeDispatch(script),script);
        await accept.click();
        await prompt.waitFor({state:'hidden'});
        await disabled.waitFor();
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);
        await restore();

        await action.click();
        await accept.click();
        await prompt.waitFor({state:'hidden'});
        await page.evaluate(() => document.querySelector('bayit-dashboard').shadowRoot.querySelector('[data-role=accept]').click());
        await page.waitForFunction(() => tracker.calls.length === 1);
        assert.deepEqual(await page.evaluate(() => tracker.calls),
          [{ type:'call_service', domain:'script', service:'turn_on', service_data:{}, target:{ entity_id:'script.fixture_secure' } }]);
        await page.evaluate(() => tracker.setState('script.fixture_secure', 'unavailable'));
        await page.locator('[data-security-danger]').waitFor({ state:'detached' });
        await disabled.click();
        assert.deepEqual(await page.evaluate(() => tracker.details.map(item=>item.entityId)),['script.fixture_secure']);
        await page.evaluate(script => tracker.setState(script,'off'),script);
        await action.waitFor();
        const stale = await action.elementHandle();
        await action.click();
        await prompt.waitFor();
        await page.evaluate(() => tracker.removeSecureAction());
        await prompt.waitFor({state:'hidden'});
        await stale.evaluate(item => item.click());
        assert.equal(await prompt.isVisible(),false);
        assert.equal(await page.evaluate(() => tracker.calls.length),1);

        await openFixture('?danger-action&disabled&editor' + localeFlag);
        const editor = page.locator('#editor');
        await editor.getByText(he ? 'סרגל ומסכים נוספים' : 'Toolbar and extra screens', { exact: true }).click();
        await editor.getByRole('button', { name: 'Secure fixture', exact: true }).click();
        const warning = editor.getByLabel(he ? 'הדגשת הפעולה באדום' : 'Highlight this action in red', { exact: true });
        const confirmation = editor.getByLabel(he ? 'אישור פעולה' : 'Confirmation', { exact: true });
        const saved = () => page.evaluate(() => tracker.draft.toolbar[0].sections[0].entities[0]);
        assert.equal(await warning.isChecked(), true);
        await warning.uncheck();
        assert.equal((await saved()).action_appearance, undefined);
        await warning.check();
        assert.equal((await saved()).action_appearance, 'danger');
        await confirmation.selectOption('skip');
        assert.equal(await warning.isVisible(), false);
        assert.equal((await saved()).action_appearance, undefined);
        assert.equal((await saved()).confirmation, false);
        await confirmation.selectOption('ask');
        assert.equal(await warning.isVisible(), true);
        assert.equal(await warning.isChecked(), false);
        await warning.check();
        assert.equal((await saved()).confirmation, true);
        await editor.getByLabel(he ? 'הפעלת התסריט מהכפתור' : 'Run script from this button', { exact: true }).uncheck();
        assert.equal(await warning.count(), 0);
        assert.equal((await saved()).action_appearance, undefined);
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);
      }
      await page.setViewportSize({ width: 390, height: 844 });

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
      console.log(name + ': optional alert map, capped transient recovery, ' + stripHeight + ' px read-only status tiles, isolated context, navigation and visual editor passed');
    } catch (error) {
      failures.push({ name, error });
    } finally {
      await browser?.close().catch(error => failures.push({ name, error }));
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) {
  for (const { name, error } of failures) console.error(name + ': ' + (error?.stack ?? String(error)));
  process.exitCode = 1;
}
