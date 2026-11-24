import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = function () {
  const query = new URL(location.href).searchParams;
  const language = query.get('locale') || 'en';
  const primary = 'calendar.demo_primary';
  const secondary = 'calendar.demo_secondary';
  const offline = 'calendar.demo_offline';
  const denied = 'calendar.demo_denied';
  const weather = 'weather.demo_daily';
  const loadRequests = [];
  const restRequests = [];
  const mutations = [];
  const selected = { locale: language, toolbar: [
    { kind:'settings' },
    { kind:'calendar', id:'demo-calendar', placement:'settings',
      calendar_agenda:{ enabled:true, weather_entity: weather },
      sections:[{ kind:'devices', entities: [
        { entity:primary, icon:'mdi:account', accent_color:'#AABBCC' },
        { entity:secondary, icon:'mdi:star', accent_color:'#ABCDEF' },
        offline, denied,
      ] }] },
  ] };
  if (query.has('automatic')) delete selected.toolbar[1].sections;
  const state = (name, status = 'off', attributes = {}) => ({state:status, attributes:{friendly_name:name,...attributes}});
  const states = {
    [primary]:state('Primary'), [secondary]:state('Secondary'), [offline]:state('Offline','unavailable'),
    [denied]:state('Denied'), 'calendar.demo_unselected':state('Unselected'),
    [weather]:state('Daily weather','sunny',{ supported_features:1, temperature_unit:'°C' }),
    'weather.demo_hourly':state('Hourly weather','sunny',{ supported_features:2 }),
  };
  const date = (offset, hour = 12) => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour);
  };
  const day = offset => {
    const local = date(offset);
    return [local.getFullYear(), local.getMonth()+1, local.getDate()].map(part => String(part).padStart(2,'0')).join('-');
  };
  const event = (summary, offset) => ({summary,start:{date:day(offset)},end:{date:day(offset+1)},location:'Fixture hall'});
  const shared = event('Shared appointment with a long but readable fixture title',0);
  const planned = [shared, event('<b>Literal text</b>',0), {...event('Multi-day appointment',0),end:{date:day(3)}},
    ...Array.from({length:6}, (_, i) => event('Future appointment ' + (i+1), i+1))];
  const hass = {
    states, locale:{language,time_format:'24'}, user:{is_admin:true,id:'synthetic'},
    callService(...args) { mutations.push(args); },
    callWS(...args) { mutations.push(args); },
    callApi(method, path) { restRequests.push({method,path}); return Promise.resolve([]); },
    connection: query.has('rest') ? undefined : {
      subscribeMessage(callback, message) {
        const request = {message,callback,closed:0};
        loadRequests.push(request);
        if (message.entity_id === denied) return Promise.reject({code:'unauthorized'});
        if (query.has('delayed') && message.entity_id === secondary) {
          return new Promise(resolve => { request.ack = () => resolve(() => { request.closed++; }); });
        }
        return Promise.resolve(() => { request.closed++; });
      },
    },
  };
  const strategy = customElements.get('ll-strategy-dashboard-bayit-9');
  const card = document.createElement('bayit-dashboard');
  card.setConfig(strategy.generate(selected,hass).views[0].cards[0]);
  card.hass = hass;
  document.body.append(card);
  if (query.has('editor')) {
    card.hidden = true;
    const editor = strategy.getConfigElement();
    editor.setConfig(selected);
    editor.hass = hass;
    editor.addEventListener('config-changed', event => { window.draft = event.detail.config; });
    document.body.append(editor);
  }
  window.fixture = {
    requests: () => loadRequests.map(({message,closed}) => ({...message,closed})),
    restRequests,
    mutations,
    send(index, payload) { loadRequests[index].callback(payload); },
    populate() {
      loadRequests.find(request => request.message.entity_id === primary).callback({events:planned});
      loadRequests.find(request => request.message.entity_id === secondary).callback({events:[shared]});
      loadRequests.find(request => request.message.entity_id === weather).callback(
        {type:'daily',forecast:[{datetime:date(0).toISOString(),temperature:26,templow:12,condition:'sunny'}]});
    },
    acknowledge() { loadRequests.find(request => request.message.entity_id === secondary)?.ack?.(); },
    loseWeather() {
      delete states[weather];
      card.hass = {...hass,states:{...states}};
    },
  };
};
const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<style>body{margin:0}</style><script type="module">import "/bayit-9.js";(' + fixture + ')();</script>';
const server = http.createServer((request, response) => {
  if (request.url === '/bayit-9.js') response.writeHead(200,{'Content-Type':'text/javascript'}).end(bundle);
  else response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const base = 'http://127.0.0.1:' + server.address().port;

try {
  for (const [label, launcher, locale, width] of [['Chromium',chromium,'en',390],['WebKit',webkit,'he',320]]) {
    const browser = await launcher.launch({headless:true});
    try {
      const page = await browser.newPage({ viewport:{width,height:844}, hasTouch:true, reducedMotion:'reduce',
        timezoneId:'America/New_York' });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const hebrew = locale === 'he';
      const names = { settings:hebrew ? 'מראה' : 'Appearance', calendar:hebrew ? 'יומן' : 'Calendar',
        show:hebrew ? 'הצגת השבוע המלא' : 'Show the full week', hide:hebrew ? 'תצוגה מקוצרת' : 'Show less',
        partial:hebrew ? 'חלק מהיומנים אינם זמינים כרגע.' : 'Some calendars are unavailable right now.' };
      const open = async () => {
        await page.getByRole('button',{name:names.settings,exact:true}).tap();
        await page.getByRole('dialog').getByRole('button',{name:names.calendar,exact:true}).tap();
        return page.getByRole('dialog',{name:names.calendar,exact:true});
      };
      await page.goto(base + '?delayed&locale=' + locale);
      assert.equal(await page.evaluate(() => window.fixture.requests().length),0);
      const dialog = await open();
      await page.waitForFunction(() => window.fixture.requests().length === 4);
      const requests = await page.evaluate(() => window.fixture.requests());
      assert.deepEqual(requests.map(request => request.entity_id),
        ['calendar.demo_primary','calendar.demo_secondary','calendar.demo_denied','weather.demo_daily']);
      assert.equal(requests[0].type,'calendar/event/subscribe');
      assert.equal(requests.at(-1).forecast_type,'daily');
      assert.equal(new Date(requests[0].start).getTime(), new Date(requests[1].start).getTime());
      assert.equal(new Date(requests[0].end).getTime(), new Date(requests[1].end).getTime());
      await page.evaluate(() => window.fixture.populate());
      await dialog.getByText(names.partial,{exact:true}).waitFor();
      await dialog.getByText('26°C',{exact:true}).waitFor();
      assert.equal(await dialog.getByText('12°C',{exact:true}).count(),0);
      assert.equal(await dialog.locator('.calendar-agenda-day').count(),4);
      assert.equal(await dialog.locator('.calendar-agenda-event').count(),6);
      const shared = dialog.locator('.calendar-agenda-event').filter({hasText:'Shared appointment'});
      assert.equal(await shared.count(),1);
      assert.equal(await shared.locator('.calendar-agenda-source').count(),2);
      assert.match(await shared.getAttribute('style'),/#AABBCC/i);
      await dialog.getByText('<b>Literal text</b>',{exact:true}).waitFor();
      const multiDay = dialog.locator('.calendar-agenda-event').filter({hasText:'Multi-day appointment'});
      assert.match(await multiDay.locator('.calendar-agenda-time').innerText(), hebrew ? /כל היום.+עד/ : /All day.+Until/);
      assert.equal(await dialog.getByText('Fixture hall').count(),0);
      await shared.tap();
      const collapse = dialog.getByRole('button',{name:names.hide,exact:true});
      await collapse.waitFor();
      assert.equal(await dialog.locator('.calendar-agenda-day').count(),7);
      assert.equal(await dialog.locator('.calendar-agenda-event').count(),9);
      assert.equal(await collapse.getAttribute('aria-expanded'),'true');
      await collapse.press('Enter');
      assert.equal(await dialog.getByRole('button',{name:names.show,exact:true}).getAttribute('aria-expanded'),'false');
      assert.equal(await dialog.locator('.calendar-agenda').evaluate(el => el.scrollWidth <= el.clientWidth + 1),true);
      await page.evaluate(() => window.fixture.loseWeather());
      await dialog.getByText('26°C',{exact:true}).waitFor({state:'hidden'});
      await page.keyboard.press('Escape');
      await dialog.waitFor({state:'hidden'});
      await page.evaluate(() => window.fixture.acknowledge());
      await page.waitForFunction(() => window.fixture.requests().filter(request => request.closed === 1).length === 3);
      await page.evaluate(() => window.fixture.send(0,{events:[]}));
      await open();
      await page.waitForFunction(() => window.fixture.requests().length === 7);
      assert.equal(await dialog.locator('.calendar-agenda-event').count(),0);
      assert.equal(await page.evaluate(() => window.fixture.restRequests.length),0);
      assert.equal(await page.evaluate(() => window.fixture.mutations.length),0);
      assert.deepEqual(errors,[]);

      await page.goto(base + '?automatic&locale=' + locale);
      await open();
      const choose = hebrew ? 'אפשר לבחור יומנים בהגדרות הדשבורד.' : 'Choose calendars in the dashboard settings.';
      await dialog.getByText(choose,{exact:true}).waitFor();
      assert.deepEqual(await page.evaluate(() => window.fixture.requests()),[]);

      await page.goto(base + '?rest&locale=' + locale);
      await open();
      await page.waitForFunction(() => window.fixture.restRequests.length === 3);
      const rest = await page.evaluate(() => window.fixture.restRequests);
      assert.ok(rest.every(request => request.method === 'GET' &&
        /^calendars\/calendar\.demo_.*\?start=.*&end=/.test(request.path)));
      assert.equal(await page.evaluate(() => window.fixture.mutations.length),0);
      if (!hebrew) {
        await page.goto(base + '?editor');
        await page.getByText('Toolbar and extra screens',{exact:true}).click();
        await page.getByRole('button',{name:'Calendar',exact:true}).click();
        assert.equal(await page.getByLabel('Compact agenda',{exact:true}).isChecked(),true);
        const forecast = page.getByLabel('Daily forecast beside dates',{exact:true});
        assert.equal(await forecast.inputValue(),'weather.demo_daily');
        assert.equal(await forecast.locator('option[value="weather.demo_hourly"]').count(),0);
        await forecast.selectOption('');
        assert.deepEqual(await page.evaluate(() => window.draft.toolbar[1].calendar_agenda),{enabled:true});
        await page.getByRole('button',{name:'Devices',exact:true}).click();
        await page.getByRole('button',{name:'Primary',exact:true}).click();
        const accent = page.getByLabel('Calendar accent',{exact:true});
        await accent.fill('#4755aa');
        await accent.press('Tab');
        assert.equal(await page.evaluate(() => window.draft.toolbar[1].sections[0].entities[0].accent_color),'#4755aa');
      }
      console.log(label + ': scoped calendars with compact/expanded agenda, merged accents, weather, and cleanup');
    } finally { await browser.close(); }
  }
} finally { await new Promise(resolve => server.close(resolve)); }
