import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<script type="module">import "/dashboard.js";(' + function () {
    const options = new URL(location.href).searchParams;
    const locale = options.get('locale') || 'en';
    const solar = options.get('solar');
    const horizonMode = options.get('horizon');
    const clockMode = options.get('clock-card');
    const clock = { configurations:[], contexts:[], events:[], details:0 };
    const horizon = { configurations:[], contexts:[], connected:0, requests:[] };
    const entity = 'weather.fixture';
    const weatherReadings = [
      {entity:'binary_sensor.fixture_rain',name:'Rain fixture',role:'status',weather_status:'rain'},
      {entity:'binary_sensor.fixture_warning',name:'Warning fixture',role:'status',weather_status:'warning'},
      {entity:'binary_sensor.fixture_generic',name:'Generic fixture',role:'status',weather_status:'invalid'},
    ];
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
      datetime:iso(start + hour * index), temperature:15.5,
      condition: solar ? index === 3 ? 'cloudy' : 'sunny' : index === 1 ? 'rainy' : 'cloudy',
      ...(solar && index === 2 && { is_daytime: true }),
      ...(solar && index === 4 && { is_daytime: false }),
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
    if (['installed', 'reject'].includes(clockMode)) {
      customElements.define('clock-weather-card', class extends HTMLElement {
        setConfig(config) {
          if (clockMode === 'reject') throw new Error('Clock Weather card setup failed');
          this.config = config;
          clock.configurations.push(config);
        }
        set hass(value) { this.scoped = value; clock.contexts.push(value); }
        connectedCallback() {
          this.textContent = 'Clock Weather fixture';
          if (options.has('pager-geometry')) {
            this.style.cssText = 'display:block;height:290px';
            this.append(Object.assign(document.createElement('button'),{textContent:'Forecast fixture control'}));
            const root = this.shadowRoot ?? this.attachShadow({mode:'open'});
            root.innerHTML = '<style>' +
              'div { display:flex; justify-content:space-between }' +
              '#hours { justify-content:flex-start; overflow-x:auto }' +
              '#hours span { flex:0 0 72px }' +
              '#range:dir(rtl) .range-bar { transform:scaleX(-1) }' +
              '</style><slot></slot>' +
              '<div id="summary"><span>☁</span><span>19:00</span></div>' +
              '<div id="hours">' + Array.from({length:24}, (_,index) => '<span>' + ((20 + index) % 24) + ':00</span>').join('') + '</div>' +
              '<div id="range"><span>15°C</span><span class="range-bar">◂—▸</span><span>28°C</span></div>';
          }
          this.stop = ['hourly','daily'].map(type => this.scoped.connection.subscribeMessage(event => {
            clock.events.push([type, event.forecast.length]);
          }, { type:'weather/subscribe_forecast', entity_id:this.config.entity, forecast_type:type }));
        }
        disconnectedCallback() { for (const stop of this.stop) void stop.then(unsubscribe => unsubscribe()); }
      });
    }
    if (['installed', 'reject', 'no-location'].includes(horizonMode)) {
      customElements.define('horizon-card', class extends HTMLElement {
        setConfig(config) {
          if (horizonMode === 'reject') throw new Error('Unavailable Horizon Card');
          this.config = config;
          horizon.configurations.push(config);
        }
        set hass(value) { horizon.contexts.push(value); }
        connectedCallback() {
          horizon.connected++;
          this.textContent = 'Sun and Moon fixture';
          if (options.has('pager-geometry')) {
            this.style.cssText = 'display:block;height:205px';
            const axis = document.createElement('div');
            axis.style.cssText = 'display:flex;justify-content:space-between';
            const labels = this.config.language === 'he' ? ['זריחה', 'שקיעה'] : ['Sunrise', 'Sunset'];
            axis.append(...labels.map(textContent => Object.assign(document.createElement('span'), {textContent})));
            this.append(axis);
            this.append(Object.assign(document.createElement('button'),{textContent:'Sun fixture control'}));
          }
        }
        disconnectedCallback() { horizon.connected--; }
      });
    }
    const hass = {
      config: { time_zone:'Asia/Jerusalem',
        ...(horizonMode !== 'no-location' && { latitude:45, longitude:5, elevation:20 }),
      }, locale: { language:locale }, areas: {}, devices: {}, themes: {},
      entities: { [entity]:{}, 'sun.sun':{} },
      states: {
        ...(options.has('status-readings') && Object.fromEntries(weatherReadings.map(({entity}) =>
          [entity,{state:'off',attributes:{}}]))),
        ...(options.has('pager-geometry') && {'sensor.fixture_temperature':{ state:'24', attributes:{unit_of_measurement:'°C'} }}),
        [entity]: { state:'cloudy', attributes:{ friendly_name:'Fixture Outlook', supported_features:3,
          temperature:18.6, temperature_unit:'°C' } },
        'sun.sun': { state:solar === 'evening' ? 'below_horizon' : 'above_horizon', attributes:{ azimuth:140, elevation:35,
          next_rising:solar ? '2026-11-26T06:18:58.538099+02:00' : iso(start + 6.5 * hour),
          next_setting:solar ? '2026-11-' + (solar === 'evening' ? '26' : '25') + 'T16:33:28.401451+02:00'
            : iso(start + 2.5 * hour) } },
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
      callWS(request) {
        horizon.requests.push(request);
        throw new Error('Unexpected Home Assistant request: ' + request.type);
      },
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
        ...(clockMode && { clock_weather_card:true }),
      }] }, { id:'sun', kind:'sun', title:'Sun settings', entities:[{ entity:'sun.sun', role:'sun',
        ...(horizonMode && { horizon_card:true }),
      }] }, ...(options.has('pager-geometry') ? [{id:'readings',kind:'readings', layout:'readings-list', entities:[
        {entity:'sensor.fixture_temperature',name:'Pager reading',role:'status'},
      ]}] : []), ...(options.has('status-readings') ? [{id:'weather-status',kind:'readings',
        title:'Weather status settings',layout:'readings-list',entities:weatherReadings}] : [])],
    }] };
    const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
    const dashboard = document.createElement('bayit-dashboard');
    dashboard.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
    dashboard.hass = hass;
    dashboard.addEventListener('hass-more-info', event => details.push(event.detail.entityId));
    const tracker = {
      created, forecastCalls, details, horizon, clock,
      tryClockAction(source, action) {
        const card = dashboard.shadowRoot.querySelector('clock-weather-card');
        card.dispatchEvent(new CustomEvent('hass-action',{ bubbles:true,composed:true,detail:{
          config:{ entity:source,tap_action:{action} }, action:'tap',
        } }));
      },
      hideSun(hidden) {
        hass.entities['sun.sun'] = hidden ? { hidden_by:'user' } : {};
        dashboard.hass = { ...hass, entities:{ ...hass.entities } };
      },
      setSun(state) {
        hass.states['sun.sun'] = { ...hass.states['sun.sun'], state };
        dashboard.hass = { ...hass, states:{ ...hass.states } };
      },
      setWeatherStatus(state) {
        for (const { entity } of weatherReadings) hass.states[entity] = {state,attributes:{}};
        dashboard.hass = { ...hass, states:{ ...hass.states } };
      },
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

async function assertClockWeatherCard(browser) {
  for (const [locale, reducedMotion] of [['en','no-preference'],['he','reduce']]) {
    const page = await browser.newPage({ viewport:{width:391,height:844}, hasTouch:true, reducedMotion });
    page.setDefaultTimeout(8000);
    const hebrew = locale === 'he';
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const panel = page.getByRole('dialog',{name:'Fixture Weather',exact:true});
    const original = panel.locator('.weather-current-summary');
    const card = panel.locator('clock-weather-card');
    const open = mode => page.goto(base + '?locale=' + locale + '&clock-card=' + mode + '#panel/weather-fixture');
    try {
      for (const mode of ['missing','reject','installed&no-subscriptions','installed&daily-error']) {
        await open(mode);
        await original.waitFor();
        assert.equal(await original.evaluate(node => getComputedStyle(node).direction),'ltr');
        if (mode.endsWith('daily-error')) {
          await panel.getByText(hebrew ? 'התחזית היומית אינה זמינה' : 'Daily forecast unavailable',{exact:true}).waitFor();
        }
        for (let frame = 0; frame < 2; frame++) await page.evaluate(() => new Promise(requestAnimationFrame));
        assert.equal(await card.count(),0);
      }
      await open('installed');
      await card.waitFor();
      assert.equal(await original.count(),0);
      await page.waitForFunction(() => tracker.clock.events.length === 2);
      const { configurations, contexts, events } = await page.evaluate(() => tracker.clock);
      assert.deepEqual(configurations,[{
        type:'custom:clock-weather-card',entity:'weather.fixture',locale,sun_entity:'sun.sun',weather_icon_type:'line',
        tap_action:{action:'more-info'},
        sections:{ header:{animated_icons:!hebrew},forecast_strip:{forecast_type:'hourly',count:24,hide_sunrise_sunset:false},
          forecast_list:{forecast_type:'daily',count:5} },
      }]);
      assert.deepEqual(events,[['hourly',27],['daily',7]]);
      assert.deepEqual(Object.keys(contexts.at(-1)).sort(),['config','connection','language','locale','states']);
      assert.deepEqual(Object.keys(contexts.at(-1).states).sort(),['sun.sun','weather.fixture']);
      assert.equal(contexts.at(-1).locale.time_format,'24');
      assert.equal(await page.evaluate(() => tracker.maximum()),2);

      const refused = await page.evaluate(async () => {
        const scope = tracker.clock.contexts.at(-1);
        const requests = [
          {type:'render_template',template:'{{ 1 }}'},
          {type:'call_service',domain:'weather',service:'get_forecasts'},
          {type:'weather/subscribe_forecast',forecast_type:'daily',entity_id:'weather.other'},
          {type:'weather/subscribe_forecast',forecast_type:'twice_daily',entity_id:'weather.fixture'},
        ];
        return await Promise.all(requests.map(request =>
          scope.connection.subscribeMessage(()=>{},request).then(()=>false,()=>true)));
      });
      assert.deepEqual(refused,[true,true,true,true]);
      await page.evaluate(() => {
        tracker.tryClockAction('weather.other','more-info');
        tracker.tryClockAction('weather.fixture','call-service');
        tracker.tryClockAction('weather.fixture','more-info');
      });
      assert.deepEqual(await page.evaluate(() => tracker.details),['weather.fixture']);
      await page.evaluate(() => tracker.setFeatures(3,'unavailable'));
      await card.waitFor({state:'detached'});
      await original.waitFor();
      await page.waitForFunction(() => tracker.active().length === 0);
      await page.evaluate(() => tracker.setFeatures(3));
      await card.waitFor();
      await panel.getByRole('button',{name:hebrew ? 'סגירה' : 'Close',exact:true}).tap();
      await panel.waitFor({state:'hidden'});
      await page.waitForFunction(() => tracker.active().length === 0);
      assert.ok(await page.evaluate(async () => {
        const scope=tracker.clock.contexts.at(-1);
        try {
          await scope.connection.subscribeMessage(()=>{},{
            type:'weather/subscribe_forecast',forecast_type:'daily',entity_id:'weather.fixture',
          });
          return false;
        } catch { return true; }
      }));
      assert.deepEqual(await page.evaluate(() => tracker.horizon.requests),[]);
      assert.deepEqual(errors,[]);

      await page.goto(base + '?editor&locale=' + locale);
      await page.getByText(hebrew ? 'סרגל ומסכים נוספים' : 'Toolbar and extra screens',{exact:true}).tap();
      await page.getByRole('button',{name:'Fixture Weather',exact:true}).tap();
      await page.getByRole('button',{name:'Forecast settings',exact:true}).tap();
      await page.getByRole('button',{name:'Fixture Outlook',exact:true}).tap();
      const setting = page.getByRole('checkbox',{ name:hebrew ? 'הצגת התחזית באמצעות Clock Weather Card'
        : 'Use Clock Weather Card for the forecast',exact:true });
      const saved = () => page.evaluate(() => tracker.draft.toolbar[0].sections[0].entities[0].clock_weather_card);
      assert.equal(await setting.isChecked(),false);
      await setting.check();
      assert.equal(await saved(),true);
      await setting.uncheck();
      assert.equal(await saved(),undefined);
      await setting.check();
      await page.getByLabel(hebrew ? 'אופן התצוגה' : 'Display as',{exact:true}).selectOption('status');
      assert.equal(await saved(),undefined);
      await setting.waitFor({ state:'hidden' });
    } finally { await page.close(); }
  }
}

async function assertHorizonPresentation(browser) {
  for (const locale of ['en', 'he']) {
    const page = await browser.newPage({ viewport:{ width:391, height:844 }, hasTouch:true, reducedMotion:'reduce' });
    page.setDefaultTimeout(8000);
    const hebrew = locale === 'he';
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const panel = page.getByRole('dialog',{ name:'Fixture Weather', exact:true });
    const sun = panel.locator('[data-section=sun]');
    const card = sun.locator('horizon-card');
    const fallback = sun.locator('.sun-panel');
    async function open(mode) {
      await page.goto(base + '?locale=' + locale + '&horizon=' + mode + '#panel/weather-fixture');
      await panel.getByRole('button',{ name:hebrew ? 'שמש' : 'Sun', exact:true }).tap();
    }
    try {
      for (const mode of ['missing','no-location','reject']) {
        await open(mode);
        await fallback.getByText('140°',{ exact:true }).waitFor();
        assert.equal(await card.count(),0);
        assert.deepEqual(await page.evaluate(() => tracker.horizon.requests),[]);
      }
      await open('installed&no-native');
      await card.waitFor();
      assert.equal(await fallback.count(),0);
      assert.deepEqual(await page.evaluate(() => tracker.horizon.configurations),[{
        type:'custom:horizon-card',entity:'sun.sun',language:locale,time_format:24,sun:true,moon:true,graph:true,
        fields:{sunrise:true,sunset:true,dawn:true,dusk:true,azimuth:true,elevation:true},
      }]);
      const context = await page.evaluate(() => tracker.horizon.contexts.at(-1));
      assert.deepEqual(Object.keys(context).sort(),['config','locale','states','themes']);
      assert.deepEqual(context.config,{ latitude:45,longitude:5,elevation:20,time_zone:'Asia/Jerusalem' });
      assert.deepEqual(Object.keys(context.states),['sun.sun']);
      await page.evaluate(() => tracker.setSun('unavailable'));
      await card.waitFor({ state:'detached' });
      await fallback.getByText(hebrew ? 'לא זמין' : 'Unavailable',{ exact:true }).waitFor();
      await page.evaluate(() => tracker.setSun('above_horizon'));
      await card.waitFor();
      await page.evaluate(() => tracker.hideSun(true));
      await card.waitFor({ state:'detached' });
      await fallback.getByText(hebrew ? 'לא זמין' : 'Unavailable',{ exact:true }).waitFor();
      await page.evaluate(() => tracker.hideSun(false));
      await card.waitFor();
      await panel.getByRole('button',{ name:hebrew ? 'סגירה' : 'Close', exact:true }).tap();
      await panel.waitFor({ state:'hidden' });
      await page.waitForFunction(() => tracker.horizon.connected === 0);
      assert.deepEqual(await page.evaluate(() => tracker.horizon.requests),[]);
      assert.deepEqual(errors,[]);

      await page.goto(base + '?editor&locale=' + locale);
      await page.getByText(hebrew ? 'סרגל ומסכים נוספים' : 'Toolbar and extra screens',{exact:true}).tap();
      await page.getByRole('button',{name:'Fixture Weather',exact:true}).tap();
      await page.getByRole('button',{name:'Sun settings',exact:true}).tap();
      await page.getByRole('button',{name:'sun.sun',exact:true}).tap();
      const setting = page.getByRole('checkbox',{name:hebrew ? 'הצגת השמש והירח באמצעות Horizon Card'
        : 'Show the Sun and Moon with Horizon Card',exact:true});
      const saved = () => page.evaluate(() => tracker.draft.toolbar[0].sections[1].entities[0].horizon_card);
      assert.equal(await setting.isChecked(),false);
      await setting.check();
      assert.equal(await saved(),true);
      await setting.uncheck();
      assert.equal(await saved(),undefined);
      await setting.check();
      await page.getByLabel(hebrew ? 'אופן התצוגה' : 'Display as',{exact:true}).selectOption('status');
      await setting.waitFor({state:'hidden'});
      assert.equal(await saved(),undefined);
    } finally { await page.close(); }
  }
}

async function assertDetailedPagerStable(browser) {
  for (const locale of ['en', 'he']) {
    const he = locale === 'he';
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
    try {
      await page.goto(base + '?clock-card=installed&horizon=installed&pager-geometry&locale=' + locale + '#panel/weather-fixture');
      const panel = page.getByRole('dialog',{name:'Fixture Weather',exact:true});
      const stack = panel.locator('.weather-pager');
      const forecast = stack.locator('[data-section=forecast]');
      const sun = stack.locator('[data-section=sun]');
      const forecastChoice = stack.getByRole('button',{name:he ? 'תחזית' : 'Forecast',exact:true});
      const sunChoice = stack.getByRole('button',{name:he ? 'שמש' : 'Sun',exact:true});
      const focus = button => button.evaluate(control => control.getRootNode().activeElement === control);
      const reading = panel.getByText('Pager reading',{exact:true});
      await reading.waitFor();
      await forecast.locator('clock-weather-card').waitFor();
      await sun.locator('horizon-card').waitFor({state:'attached'});
      await page.waitForFunction(() => tracker.clock.events.length === 2);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await sun.getAttribute('aria-hidden'),'true');
      assert.equal(await sun.getAttribute('inert'),'');
      assert.equal(await sun.getByRole('button',{name:'Sun fixture control',exact:true}).count(),0);
      const stability = () => panel.evaluate(element => {
        const body = element.querySelector('.modal-body');
        const carrier = element.querySelector('.weather-pager');
        return {
          cardHeight:carrier.getBoundingClientRect().height,
          dotsY:element.querySelector('.weather-page-dots').getBoundingClientRect().top,
          readingY:element.querySelector('.weather-reading').getBoundingClientRect().top,
          fits:body.scrollWidth <= body.clientWidth,
          scrollRange:body.scrollHeight - body.clientHeight,
        };
      });
      for (const width of [320,391]) {
        await page.setViewportSize({width,height:844});
        await page.emulateMedia({reducedMotion:width === 320 ? 'reduce' : 'no-preference'});
        const before = await stability();
        assert.equal(before.fits,true);
        const topology = await forecast.locator('clock-weather-card').evaluate(card => {
          const [summary, hours, range] = ['summary','hours','range'].map(id => card.shadowRoot.getElementById(id));
          const leftToRight = row => row.children[0].getBoundingClientRect().left < row.children[1].getBoundingClientRect().left;
          hours.scrollLeft = 72;
          const scrollLeft = hours.scrollLeft;
          hours.scrollLeft = 0;
          return {
            sectionDirection:getComputedStyle(card.closest('[data-section]')).direction,
            iconBeforeClock:leftToRight(summary),
            chronological:leftToRight(hours),
            lowBeforeHigh:range.firstElementChild.getBoundingClientRect().left < range.lastElementChild.getBoundingClientRect().left,
            rangeTransform:getComputedStyle(range.querySelector('.range-bar')).transform,
            scrollLeft,
          };
        });
        assert.deepEqual(topology,{
          sectionDirection:he ? 'rtl' : 'ltr',iconBeforeClock:true,chronological:true,lowBeforeHigh:true,
          rangeTransform:'none',scrollLeft:72,
        });
        const nativeForecast = forecast.getByRole('button',{name:'Forecast fixture control',exact:true});
        await nativeForecast.focus();
        assert.ok(await focus(nativeForecast));
        await forecast.evaluate((section,direction) => {
          for (const [type,x] of [['pointerdown',150],['pointerup',150+direction*110]]) {
            section.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',isPrimary:true,pointerId:9,clientX:x}));
          }
        },he ? 1 : -1);
        await sun.locator('horizon-card').waitFor();
        const sunrise = await sun.getByText(he ? 'זריחה' : 'Sunrise',{exact:true}).boundingBox();
        const sunset = await sun.getByText(he ? 'שקיעה' : 'Sunset',{exact:true}).boundingBox();
        assert.ok(sunrise.x < sunset.x, 'Sunrise and sunset must follow Horizon’s left-to-right solar graph');
        assert.equal(await sun.evaluate(node => getComputedStyle(node).direction),he ? 'rtl' : 'ltr');
        assert.equal(await sunChoice.getAttribute('aria-pressed'),'true');
        assert.equal(await forecast.getAttribute('aria-hidden'),'true');
        assert.equal(await forecast.getAttribute('inert'),'');
        assert.equal(await nativeForecast.count(),0);
        assert.equal(await sun.getAttribute('aria-hidden'),null);
        assert.equal(await sun.getAttribute('inert'),null);
        assert.ok(await focus(sunChoice));
        assert.equal(await sun.evaluate(node => getComputedStyle(node).animationName),
          width === 320 ? 'none' : 'weather-page-reveal');
        assert.deepEqual(await stability(),before);
        await forecastChoice.press('Enter');
        assert.ok(await focus(forecastChoice));
        assert.equal(await forecastChoice.getAttribute('aria-pressed'),'true');
        assert.deepEqual(await stability(),before);
      }
      assert.deepEqual(await page.evaluate(() => ({
        clockConfig:tracker.clock.configurations.length, forecastEvents:tracker.clock.events.length,
        horizonConfig:tracker.horizon.configurations.length, horizonCount:tracker.horizon.connected,
        requests:tracker.horizon.requests, details:tracker.details,
      })),{clockConfig:1,forecastEvents:2,horizonConfig:1,horizonCount:1,requests:[],details:[]});
    } finally {
      await page.close();
    }
  }
}

async function assertWeatherStatuses(browser) {
  const states = {
    en: { off:['Not raining','No warning','Off'], on:['Raining','Active warning','On'],
      unknown:Array(3).fill('Unknown state'), unavailable:Array(3).fill('Unavailable') },
    he: { off:['לא יורד','אין','כבוי'], on:['יורד גשם','יש התראה','פועל'],
      unknown:Array(3).fill('מצב לא ידוע'), unavailable:Array(3).fill('לא זמין') },
  };
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    const he = locale === 'he';
    try {
      await page.goto(base + '?locale=' + locale + '&status-readings#panel/weather-fixture');
      const readings = page.locator('[data-section=readings] .weather-reading');
      await readings.first().waitFor();
      for (const [state,labels] of Object.entries(states[locale])) {
        await page.evaluate(state => tracker.setWeatherStatus(state),state);
        await page.waitForFunction(labels => {
          const values = document.querySelector('bayit-dashboard')?.shadowRoot
            ?.querySelectorAll('[data-section=readings] .weather-reading .tile-state');
          return values?.length === labels.length && [...values].every((value,index) => value.textContent === labels[index]);
        },labels,{timeout:4000});
      }

      await page.goto(base + '?editor&status-readings&locale=' + locale);
      await page.getByText(he ? 'סרגל ומסכים נוספים' : 'Toolbar and extra screens',{exact:true}).tap();
      await page.getByRole('button',{name:'Fixture Weather',exact:true}).tap();
      await page.getByRole('button',{name:'Weather status settings',exact:true}).tap();
      await page.getByRole('button',{name:'Rain fixture',exact:true}).tap();
      const meaning = page.getByLabel(he ? 'משמעות המדד' : 'Meaning of the reading',{exact:true});
      assert.equal(await meaning.inputValue(),'rain');
      const saved = () => page.evaluate(() => tracker.draft.toolbar[0].sections[2].entities[0].weather_status);
      await meaning.selectOption('warning');
      assert.equal(await saved(),'warning');
      await meaning.selectOption('');
      assert.equal(await saved(),undefined);
    } finally {
      await page.close();
    }
  }
}

async function assertSolarForecast(browser) {
  for (const locale of ['en', 'he']) {
    const page = await browser.newPage({ viewport: { width:391, height:844 }, hasTouch:true, isMobile:true });
    try {
      await page.clock.install({ time: new Date('2026-11-25T19:43:00+02:00') });
      const load = phase => page.goto(base + '?locale=' + locale + '&solar=' + phase + '#panel/weather-fixture');
      const hourly = page.locator('.hourly-weather-list');
      const symbols = hourly.locator('li ha-icon');
      const row = time => hourly.locator('li').filter({
        has: page.locator('time').getByText(time, { exact:true }),
      });
      const glyph = time => row(time).locator('ha-icon').getAttribute('icon');
      await load('evening');
      await hourly.waitFor();
      assert.deepEqual(await symbols.evaluateAll(nodes => nodes.slice(0,5).map(node => node.getAttribute('icon'))),
        ['mdi:weather-night','mdi:weather-night','mdi:weather-sunny','mdi:weather-cloudy','mdi:weather-night']);
      assert.equal(await row('20:00').locator('.hourly-weather-temperature').textContent(), '16°');
      assert.equal(await glyph('06:00'), 'mdi:weather-night');
      assert.equal(await glyph('07:00'), 'mdi:weather-sunny');

      await page.clock.setSystemTime(new Date('2026-11-25T14:43:00+02:00'));
      await load('day');
      await hourly.waitFor();
      assert.equal(await glyph('15:00'), 'mdi:weather-sunny');
      assert.equal(await glyph('16:00'), 'mdi:weather-sunny');
      assert.equal(await glyph('18:00'), 'mdi:weather-night');
      assert.equal(await glyph('19:00'), 'mdi:weather-night');
      assert.ok(await hourly.evaluate(el => el.scrollWidth > el.clientWidth));
    } finally {
      await page.close();
    }
  }
}

try {
  await runBrowserEngines([[chromium, 'en'], [webkit, 'he']], async (engine, locale) => {
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
          sun.inert && sun.getAttribute('aria-hidden') === 'true' && container.scrollWidth <= container.clientWidth &&
          buttons.every(box => box.width >= 44 && box.height >= 28);
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
      await assertClockWeatherCard(browser);
      console.log(engine.name() + ' at 391 px (EN/HE): optional Clock Weather forecast, narrow feed scope, and fallback');
      await assertHorizonPresentation(browser);
      await assertDetailedPagerStable(browser);
      console.log(engine.name() + ' at 391 px (EN/HE): optional read-only Sun/Moon presentation and native fallback');
      await assertWeatherStatuses(browser);
      console.log(engine.name() + ' at 320 px (EN/HE): localized rain and warning states, generic status, and editor');
      await assertSolarForecast(browser);
      console.log(engine.name() + ' at 391 px (EN/HE): sunny icons follow the reported sun window');
    } finally {
      await browser.close();
    }
  });
} finally {
  server.close();
}
