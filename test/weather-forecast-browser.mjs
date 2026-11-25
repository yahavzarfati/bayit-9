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
    const hourlyReaders = [];
    const details = [];
    let maximumConnected = 0;
    let maximumHourly = 0;
    let success;
    let releaseHourly;
    const hour = 3600000;
    const start = Math.floor(Date.now() / hour) * hour;
    const iso = epoch => new Date(epoch).toISOString();
    const forecast = Array.from({ length:27 }, (_, index) => ({
      datetime:iso(start + hour * index), temperature:15.5, condition:index === 1 ? 'rainy' : 'cloudy',
      precipitation_probability:[0,14,37,4,undefined,120,'39',-5][index],
    }));
    const today = Date.UTC(2026, 10, 25);
    const dailyForecast = Array.from({ length:7 }, (_, index) => ({
      datetime:iso(today + 24 * hour * index), templow:[14,10,14,14,15,18,19][index],
      temperature:[24,26,28,27,24,29,27][index], condition:index === 1 ? 'rainy' : 'cloudy',
    }));
    const activate = reader => {
      connected.add(reader);
      maximumConnected = Math.max(maximumConnected, connected.size);
      forecastCalls.push(reader.dataset.mode + ':' + reader.dataset.slots);
    };
    customElements.define('fixture-weather-forecast', class extends HTMLElement {
      connectedCallback() { activate(this); }
      disconnectedCallback() { connected.delete(this); }
    });
    const hass = {
      config: { time_zone:'Asia/Jerusalem' }, locale: { language:locale }, areas: {}, devices: {}, themes: {},
      entities: { [entity]:{}, 'sun.sun':{} },
      states: {
        [entity]: { state:'cloudy', attributes:{ friendly_name:'Fixture Outlook', supported_features:3,
          temperature:18.6, temperature_unit:'°C' } },
        'sun.sun': { state:'above_horizon', attributes:{ azimuth:140, elevation:35,
          next_rising:iso(start + 6.5 * hour), next_setting:iso(start + 2.5 * hour) } },
      },
      connection: { subscribeMessage(callback, message) {
        const mode = message.forecast_type;
        if (message.type !== 'weather/subscribe_forecast' || !['hourly', 'daily'].includes(mode) || message.entity_id !== entity) {
          throw new Error('Unexpected forecast subscription');
        }
        if (mode === 'daily') {
          if (options.has('daily-error')) return Promise.reject(new Error('unavailable'));
          const reader = { callback, dataset:{mode:'daily',slots:'5'} };
          activate(reader);
          callback({ type:'daily', forecast:dailyForecast });
          return Promise.resolve(() => connected.delete(reader));
        }
        if (options.has('weather-error')) return Promise.reject(new Error('unavailable'));
        const reader = { callback, dataset:{ mode, slots:'24' } };
        hourlyReaders.push(reader);
        activate(reader);
        maximumHourly = Math.max(maximumHourly, [...connected].filter(value => value.dataset.mode === 'hourly').length);
        if (!options.has('silent-hourly')) callback({ type:'hourly', forecast });
        const stop = () => connected.delete(reader);
        if (options.has('delay-hourly') && hourlyReaders.length === 1) {
          return new Promise(resolve => { releaseHourly = () => resolve(stop); });
        }
        return Promise.resolve(stop);
      } },
      callWS(request) { throw new Error('Unexpected Home Assistant request: ' + request.type); },
    };
    if (options.has('no-subscriptions')) delete hass.connection;
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
    dashboard.addEventListener('hass-more-info', event => details.push(event.detail.entityId));
    const tracker = {
      created, forecastCalls, details,
      active: () => [...connected].map(card => card.dataset.mode + ':' + card.dataset.slots),
      maximum: () => maximumConnected,
      maximumHourly: () => maximumHourly,
      hourlyReads: () => hourlyReaders.length,
      releaseHourly: () => releaseHourly(),
      deliverStale: () => hourlyReaders[0].callback({ type:'hourly', forecast:[] }),
      setFeatures(features, state = 'cloudy') {
        hass.states[entity] = { state, attributes:{ ...hass.states[entity].attributes, supported_features:features } };
        dashboard.hass = { ...hass, states:{ ...hass.states } };
      },
      setTemperature(value) {
        hass.states[entity] = { ...hass.states[entity], attributes:{ ...hass.states[entity].attributes, temperature:value } };
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
      const page = await browser.newPage({ viewport:{ width:320, height:844 }, hasTouch:true, isMobile:true, reducedMotion:'reduce' });
      page.setDefaultTimeout(8000);
      await page.clock.install({ time:new Date('2026-11-25T09:10:00Z') });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const open = extra => page.goto(base + '?locale=' + locale + extra + '#panel/weather-fixture');
      const modal = page.getByRole('dialog', { name:'Fixture Weather', exact:true });
      const sun = modal.locator('[data-section=sun]');
      const forecastPanel = modal.locator('[data-section=forecast]');
      const forecasts = modal.locator('fixture-weather-forecast');
      const hourly = modal.locator('.hourly-weather');
      const list = hourly.locator('.hourly-weather-list');
      const daily = modal.locator('.daily-weather');
      const header = modal.locator('.weather-current-summary');
      const show = async (...modes) => {
        await page.waitForFunction(expected => tracker.active().slice().sort().join(',') === expected, modes.slice().sort().join(','));
      };
      await open('');
      await show('hourly:24', 'daily:5');
      await list.waitFor();
      assert.equal(await list.locator('li').count(), 24);
      assert.equal(await list.evaluate(node => getComputedStyle(node).direction), 'ltr');
      assert.equal(await list.locator('.hourly-weather-time').first().textContent(), rtl ? 'עכשיו' : 'Now');
      assert.equal(await list.locator('.hourly-weather-time').nth(1).textContent(), '12:00');
      assert.equal(await list.locator('.hourly-weather-temperature').first().textContent(), '19°');
      assert.equal(await list.locator('ha-icon').nth(1).getAttribute('icon'), 'mdi:weather-rainy');
      assert.deepEqual(await list.locator('.hourly-weather-rain').allTextContents(), ['10%', '40%']);
      assert.deepEqual(await list.locator('.hourly-weather-event').allTextContents(), rtl ? ['שקיעה','זריחה'] : ['Sunset','Sunrise']);
      assert.equal(await list.locator('.hourly-weather-time').nth(3).textContent(), '13:30');
      await daily.waitFor();
      assert.equal(await daily.locator('li').count(), 5);
      const dots = modal.locator('.weather-page-dots');
      const forecastChoice = dots.getByRole('button', { name:rtl ? 'תחזית' : 'Forecast', exact:true });
      const sunChoice = dots.getByRole('button', { name:rtl ? 'שמש' : 'Sun', exact:true });
      assert.equal(await forecastChoice.getAttribute('aria-pressed'), 'true');
      assert.equal(await sunChoice.getAttribute('aria-pressed'), 'false');
      assert.ok(await dots.evaluate(node => {
        const container = node.closest('.weather-pager');
        const forecast = container.querySelector('[data-section=forecast]');
        const sun = container.querySelector('[data-section=sun]');
        const buttons = [...node.querySelectorAll('button')].map(button => button.getBoundingClientRect());
        return node.getBoundingClientRect().top >= forecast.getBoundingClientRect().bottom &&
          sun.hidden && container.scrollWidth <= container.clientWidth && buttons.every(box => box.width >= 44 && box.height >= 28);
      }));
      assert.equal(await modal.locator('.weather-tabs').count(), 0);
      assert.equal(await daily.locator('.daily-weather-day').first().textContent(), rtl ? 'היום' : 'Today');
      assert.deepEqual(await daily.locator('.daily-weather-low').allTextContents(), ['14°C', '10°C', '14°C', '14°C', '15°C']);
      assert.deepEqual(await daily.locator('.daily-weather-high').allTextContents(), ['24°C', '26°C', '28°C', '27°C', '24°C']);
      assert.equal(await daily.locator('li').nth(1).locator('ha-icon').getAttribute('icon'), 'mdi:weather-rainy');
      assert.equal(await daily.locator('.daily-weather-marker').count(), 1);
      assert.ok(Math.abs(parseFloat(await daily.locator('.daily-weather-marker').evaluate(node => node.style.getPropertyValue('--weather-range-marker'))) - 47.78) < .1);
      assert.equal(await header.locator('.weather-current-icon').getAttribute('icon'), 'mdi:weather-cloudy');
      assert.equal(await header.locator('.weather-current-temperature span').textContent(), '19°C');
      assert.equal(await header.locator('.weather-current-condition').textContent(), rtl ? 'מעונן' : 'Cloudy');
      assert.equal(await header.locator('.weather-current-time').textContent(), '11:10');
      assert.match(await header.locator('.weather-current-date time').textContent(), rtl ? /נובמבר/ : /November 25/);
      await page.clock.fastForward(60000);
      await header.locator('.weather-current-time').getByText('11:11').waitFor();
      assert.equal(await modal.locator('.forecast-clock').count(), 0);
      assert.equal(await forecasts.count(), 0);
      assert.ok(await hourly.evaluate(node => {
        const root = node.closest('.weather-forecast-stack');
        const current = root.querySelector('.weather-current-summary');
        const daily = root.querySelector('.daily-weather');
        const scroller = node.querySelector('.hourly-weather-list');
        return root.scrollWidth <= root.clientWidth && scroller.scrollWidth > scroller.clientWidth &&
          current.getBoundingClientRect().bottom <= node.getBoundingClientRect().top &&
          node.getBoundingClientRect().bottom <= daily.getBoundingClientRect().top;
      }));
      const originalRoute = new URL(page.url()).hash;
      const direction = rtl ? 1 : -1;
      const swipe = (locator, dx, dy = 0) => locator.evaluate((target, motion) => {
        for (const [type, x, y] of [['pointerdown', 150, 100], ['pointerup', 150 + motion.dx, 100 + motion.dy]]) {
          target.dispatchEvent(new PointerEvent(type, { bubbles:true, composed:true, pointerType:'touch',
            pointerId:5, isPrimary:true, clientX:x, clientY:y }));
        }
      }, { dx, dy });
      await swipe(list.locator('li').first(), direction * 110);
      assert.equal(await sun.isHidden(), true, 'Swiping the hourly strip does not navigate to the sun panel');
      await swipe(daily.locator('.daily-weather-range').first(), direction * 15, 110);
      assert.equal(await sun.isHidden(), true, 'Vertical weather scrolling does not switch pages');
      await swipe(daily.locator('.daily-weather-range').first(), direction * 110);
      await sun.waitFor();
      assert.equal(await sunChoice.getAttribute('aria-pressed'), 'true');
      assert.equal(await forecastChoice.getAttribute('aria-pressed'), 'false');
      await swipe(sun.locator('.sun-panel'), -direction * 110);
      await forecastPanel.waitFor();
      assert.equal(new URL(page.url()).hash, originalRoute);
      assert.deepEqual(await page.evaluate(() => tracker.details), [], 'A swipe does not open native weather details');
      const extraReads = await page.evaluate(() => tracker.forecastCalls.slice());
      await page.evaluate(() => tracker.setTemperature(22.4));
      await header.locator('.weather-current-temperature').getByText('22°C').waitFor();
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
      await header.waitFor();
      assert.deepEqual(await page.evaluate(() => tracker.forecastCalls), withBoth, 'The hourly subscription stays active');
      await page.evaluate(() => tracker.setFeatures(3, 'unavailable'));
      await show();
      await page.evaluate(() => tracker.setFeatures(3));
      await show('hourly:24', 'daily:5');
      assert.equal(await page.evaluate(() => tracker.maximum()), 2);
      assert.deepEqual(await page.evaluate(() => tracker.created), []);
      await modal.getByRole('button', { name:rtl ? 'סגירה' : 'Close', exact:true }).tap();
      await modal.waitFor({ state:'hidden' });
      await page.waitForFunction(() => tracker.active().length === 0);

      await open('&legacy&delayed');
      await page.waitForFunction(() => tracker.readyToFinish());
      await page.evaluate(() => tracker.finish());
      await show('daily:5');
      assert.equal(await forecasts.count(), 1);
      assert.deepEqual(await page.evaluate(() => tracker.forecastCalls), ['daily:5']);

      await open('&delay-hourly');
      await show('hourly:24', 'daily:5');
      await page.evaluate(() => tracker.setFeatures(1));
      await hourly.waitFor({ state:'hidden' });
      await page.evaluate(() => tracker.setFeatures(3));
      await hourly.getByText(rtl ? 'טוען תחזית לפי שעות…' : 'Loading hourly forecast…', { exact:true }).waitFor();
      assert.equal(await page.evaluate(() => tracker.hourlyReads()), 1);
      await page.evaluate(() => tracker.releaseHourly());
      await page.waitForFunction(() => tracker.hourlyReads() === 2);
      await list.waitFor();
      await page.evaluate(() => tracker.deliverStale());
      assert.equal(await list.locator('li').count(), 24);
      assert.equal(await page.evaluate(() => tracker.maximumHourly()), 1);

      await page.goto(base + '?locale=' + locale + '&delay-hourly');
      const opener = page.getByRole('button', { name:'Fixture Weather', exact:true });
      await opener.tap();
      await show('hourly:24', 'daily:5');
      await modal.getByRole('button', { name:rtl ? 'סגירה' : 'Close', exact:true }).tap();
      await modal.waitFor({ state:'hidden' });
      await page.waitForFunction(() => location.hash === '');
      await opener.tap();
      await modal.waitFor();
      await hourly.getByText(rtl ? 'טוען תחזית לפי שעות…' : 'Loading hourly forecast…', { exact:true }).waitFor();
      assert.equal(await page.evaluate(() => tracker.hourlyReads()), 1, 'Rapid reopen waits for the previous subscriber to retire');
      await page.evaluate(() => tracker.releaseHourly());
      await page.waitForFunction(() => tracker.hourlyReads() === 2);
      await list.waitFor();
      await page.evaluate(() => tracker.deliverStale());
      assert.equal(await list.locator('li').count(), 24);
      assert.equal(await page.evaluate(() => tracker.maximumHourly()), 1);

      await open('&weather-error');
      await show('daily:5');
      await hourly.getByText(rtl ? 'תחזית לפי שעות אינה זמינה' : 'Hourly forecast unavailable', { exact:true }).waitFor();
      assert.equal(await daily.locator('li').count(), 5);
      await open('&daily-error');
      await show('hourly:24');
      await daily.getByText(rtl ? 'התחזית היומית אינה זמינה' : 'Daily forecast unavailable', { exact:true }).waitFor();
      assert.equal(await list.locator('li').count(), 24);
      await open('&no-native');
      await show('hourly:24', 'daily:5');
      await header.tap();
      await page.waitForFunction(() => tracker.details.length === 1);
      assert.deepEqual(await page.evaluate(() => tracker.details), ['weather.fixture']);
      await open('&no-subscriptions');
      await show('daily:5');
      assert.equal(await forecasts.count(), 1);
      await daily.waitFor({ state:'hidden' });

      await open('&legacy');
      await show('daily:5');
      assert.equal(await forecasts.count(), 1);
      assert.equal(await hourly.count(), 0);
      assert.equal(await dots.count(), 0);
      assert.equal(await modal.locator('.weather-tabs').count(), 1);
      await swipe(forecastPanel, direction * 110);
      await sun.waitFor();
      await swipe(sun.locator('.sun-panel'), -direction * 110);
      await forecastPanel.waitFor();

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
      if (engine === chromium) {
        await open('');
        await show('hourly:24', 'daily:5');
        const mobile = await page.context().newCDPSession(page);
        const touchSwipe = async (locator, direction) => {
          const box = await locator.boundingBox();
          assert.ok(box && box.y + box.height / 2 < 844);
          const x = Math.round(box.x + box.width * (direction < 0 ? .82 : .18));
          const y = Math.round(box.y + box.height / 2);
          await mobile.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
          for (const offset of [25, 60, 110]) {
            await mobile.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:x + direction * offset, y }] });
          }
          await mobile.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
        };
        try {
          await touchSwipe(daily.locator('li').first(), -1);
          await sun.waitFor();
          await touchSwipe(sun.locator('.sun-panel'), 1);
          await forecastPanel.waitFor();
          await touchSwipe(list, -1);
          await page.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
            .querySelector('.hourly-weather-list').scrollLeft > 0);
          assert.equal(await sun.isHidden(), true);
        } finally {
          await mobile.detach();
        }
      }
      assert.deepEqual(errors, []);
      console.log(engine.name() + ' at 320 px (' + locale + '): forecast/Sun swipe, hourly scrolling, daily ranges, subscriptions, and editor');
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}
