import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<script type="module">import "/dashboard.js";(' + function () {
    const options = new URL(location.href).searchParams;
    const locale = options.get('locale') || 'en';
    const entity = 'weather.fixture';
    const connected = new Set();
    const forecastCalls = [];
    const created = [];
    let maximumConnected = 0;
    let success;
    customElements.define('fixture-weather-forecast', class extends HTMLElement {
      connectedCallback() {
        connected.add(this);
        maximumConnected = Math.max(maximumConnected, connected.size);
        forecastCalls.push(this.dataset.mode + ':' + this.dataset.slots);
      }
      disconnectedCallback() { connected.delete(this); }
    });
    const hass = {
      config: { time_zone:'Asia/Jerusalem' }, locale: { language:locale }, areas: {}, devices: {}, themes: {},
      entities: { [entity]:{}, 'sun.sun':{} },
      states: {
        [entity]: { state:'cloudy', attributes:{ friendly_name:'Fixture Outlook', supported_features:3 } },
        'sun.sun': { state:'above_horizon', attributes:{ azimuth:140, elevation:35 } },
      },
      callWS(request) { throw new Error('Unexpected Home Assistant request: ' + request.type); },
    };
    if (!options.has('no-native')) window.loadCardHelpers = async () => {
      if (options.has('delayed')) await new Promise(resolve => { success = resolve; });
      return { createCardElement(config) {
        if (config.type !== 'weather-forecast') throw new Error('Unexpected card: ' + config.type);
        const card = document.createElement('fixture-weather-forecast');
        card.dataset.mode = config.forecast_type;
        card.dataset.slots = config.forecast_slots;
        card.dataset.current = String(config.show_current);
        card.textContent = 'Forecast fixture';
        created.push(config.forecast_type + ':' + config.forecast_slots);
        return card;
      } };
    };
    const config = { type:'custom:bayit-9', locale, toolbar: [{ id:'weather-fixture', kind:'weather', label:'Fixture Weather',
      sections: [{ id:'forecast', title:'Forecast settings', kind:'forecast', entities:[{
        entity, role:'forecast', ...(!options.has('legacy') && { hourly_forecast:true }),
      }] }, { id:'sun', kind:'sun', entities:['sun.sun'] }],
    }] };
    const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
    const dashboard = document.createElement('bayit-dashboard');
    dashboard.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
    dashboard.hass = hass;
    const tracker = {
      created, forecastCalls,
      active: () => [...connected].map(card => card.dataset.mode + ':' + card.dataset.slots),
      maximum: () => maximumConnected,
      setFeatures(features, state = 'cloudy') {
        hass.states[entity] = { state, attributes:{ ...hass.states[entity].attributes, supported_features:features } };
        dashboard.hass = { ...hass, states:{ ...hass.states } };
      },
      readyToFinish: () => typeof success === 'function',
      finish: () => success(),
    };
    window.tracker = tracker;
    if (options.has('editor')) {
      const editor = Strategy.getConfigElement();
      editor.hass = hass;
      editor.setConfig(config);
      editor.addEventListener('config-changed', event => { tracker.draft = event.detail.config; });
      document.body.append(editor);
    } else document.body.append(dashboard);
  }.toString() + ')();</script>';

const server = createServer((request, response) => {
  const script = request.url === '/dashboard.js';
  response.writeHead(200, { 'content-type': script ? 'text/javascript' : 'text/html; charset=utf-8' });
  response.end(script ? bundle : fixture);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port + '/fixture/home';

try {
  for (const [engine, locale] of [[chromium, 'en'], [webkit, 'he']]) {
    const rtl = locale === 'he';
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport:{ width:320, height:844 }, hasTouch:true, reducedMotion:'reduce' });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const open = extra => page.goto(base + '?locale=' + locale + extra + '#panel/weather-fixture');
      const modal = page.getByRole('dialog', { name:'Fixture Weather', exact:true });
      const sun = modal.locator('[data-section=sun]');
      const forecasts = modal.locator('fixture-weather-forecast');
      const hourly = forecasts.and(modal.getByRole('group', { name:rtl ? 'תחזית ל־24 שעות' : '24-hour forecast' })
        .locator('fixture-weather-forecast'));
      const daily = forecasts.and(modal.getByRole('group', { name:rtl ? 'תחזית יומית' : 'Daily forecast' })
        .locator('fixture-weather-forecast'));
      const show = async (...modes) => {
        for (const entry of modes) {
          const [mode, slots] = entry.split(':');
          await forecasts.and(modal.locator('[data-mode="' + mode + '"][data-slots="' + slots + '"]')).waitFor();
        }
        await page.waitForFunction(expected => tracker.active().slice().sort().join(',') === expected, modes.slice().sort().join(','));
        assert.deepEqual(await forecasts.evaluateAll(nodes => nodes.map(node => node.dataset.mode + ':' + node.dataset.slots)), modes);
      };
      await open('');
      await show('hourly:24', 'daily:5');
      assert.equal(await hourly.getAttribute('data-current'), 'false');
      assert.equal(await daily.getAttribute('data-current'), 'true');
      assert.ok(await hourly.evaluate(node => {
        const root = node.closest('.weather-forecast-stack');
        const daily = root.querySelector('fixture-weather-forecast[data-mode=daily]');
        return root.scrollWidth <= root.clientWidth && node.getBoundingClientRect().bottom <= daily.getBoundingClientRect().top;
      }));
      const originalRoute = new URL(page.url()).hash;
      await hourly.evaluate((target, rtl) => {
        for (const [type, x] of [['pointerdown', 150], ['pointerup', rtl ? 260 : 40]]) {
          target.dispatchEvent(new PointerEvent(type, { bubbles:true, composed:true, pointerType:'touch',
            pointerId:5, isPrimary:true, clientX:x, clientY:100 }));
        }
      }, rtl);
      assert.equal(await sun.isHidden(), true, 'Swiping the hourly strip does not navigate to the sun panel');
      assert.equal(new URL(page.url()).hash, originalRoute);
      const extraReads = await page.evaluate(() => tracker.forecastCalls.slice());
      await modal.getByRole('button', { name:rtl ? 'שמש' : 'Sun', exact:true }).tap();
      await sun.waitFor();
      await modal.getByRole('button', { name:rtl ? 'תחזית' : 'Forecast', exact:true }).tap();
      await show('hourly:24', 'daily:5');
      await page.evaluate(() => tracker.setFeatures(3));
      assert.deepEqual(await page.evaluate(() => tracker.forecastCalls), extraReads);
      await page.evaluate(() => tracker.setFeatures(1));
      await show('daily:5');
      await hourly.waitFor({ state:'hidden' });
      assert.deepEqual(await page.evaluate(() => tracker.forecastCalls), extraReads, 'The daily subscription stays active');
      await page.evaluate(() => tracker.setFeatures(3));
      await show('hourly:24', 'daily:5');
      const withBoth = await page.evaluate(() => tracker.forecastCalls.slice());
      await page.evaluate(() => tracker.setFeatures(2));
      await show('hourly:24');
      await daily.waitFor({ state:'hidden' });
      await modal.getByRole('button', { name:/Fixture Outlook/ }).waitFor();
      assert.deepEqual(await page.evaluate(() => tracker.forecastCalls), withBoth, 'The hourly subscription stays active');
      await page.evaluate(() => tracker.setFeatures(3, 'unavailable'));
      await show();
      await page.evaluate(() => tracker.setFeatures(3));
      await show('hourly:24', 'daily:5');
      assert.equal(await page.evaluate(() => tracker.maximum()), 2);
      assert.deepEqual(await page.evaluate(() => tracker.created.slice().sort()), ['daily:5', 'hourly:24']);
      await modal.getByRole('button', { name:rtl ? 'סגירה' : 'Close', exact:true }).tap();
      await modal.waitFor({ state:'hidden' });
      await page.waitForFunction(() => tracker.active().length === 0);

      await open('&delayed');
      await page.waitForFunction(() => tracker.readyToFinish());
      await page.evaluate(() => tracker.setFeatures(1));
      await modal.locator('.weather-forecast-view[data-mode=hourly]').waitFor({ state:'detached' });
      await page.evaluate(() => tracker.finish());
      await show('daily:5');
      assert.deepEqual(await page.evaluate(() => tracker.forecastCalls), ['daily:5']);
      await open('&no-native');
      await modal.getByRole('button', { name:/Fixture Outlook/ }).waitFor();
      assert.equal(await modal.getByRole('button', { name:/Fixture Outlook/ }).count(), 1);

      await open('&legacy');
      await show('daily:5');
      assert.equal(await hourly.count(), 0);

      await page.goto(base + '?editor&legacy&locale=' + locale);
      await page.getByText(rtl ? 'סרגל ומסכים נוספים' : 'Toolbar and extra screens', { exact:true }).tap();
      await page.getByRole('button', { name:'Fixture Weather', exact:true }).tap();
      await page.getByRole('button', { name:'Forecast settings', exact:true }).tap();
      await page.getByRole('button', { name:'Fixture Outlook', exact:true }).tap();
      const setting = page.getByRole('checkbox', {
        name:rtl ? 'הצגת תחזית ל־24 שעות מעל התחזית היומית' : 'Show the 24-hour forecast above the daily forecast', exact:true,
      });
      assert.equal(await setting.isChecked(), false);
      const savedOption = () => page.evaluate(() => tracker.draft.toolbar[0].sections[0].entities[0].hourly_forecast);
      await setting.check();
      assert.equal(await savedOption(), true);
      await setting.uncheck();
      assert.equal(await savedOption(), undefined);
      await setting.check();
      await page.getByLabel(rtl ? 'אופן התצוגה' : 'Display as', { exact:true }).selectOption('status');
      await setting.waitFor({ state:'hidden' });
      assert.equal(await savedOption(), undefined);
      assert.deepEqual(errors, []);
      console.log(engine.name() + ' at 320 px (' + locale + '): stacked hourly and daily weather, one subscription per type, touch, fallbacks, and editor');
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}
