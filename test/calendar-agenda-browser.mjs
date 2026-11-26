import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = function () {
  const query = new URL(location.href).searchParams;
  const language = query.get('locale') || 'en';
  const primary = 'calendar.demo_primary';
  const secondary = 'calendar.demo_secondary';
  const offline = 'calendar.demo_offline';
  const denied = 'calendar.demo_denied';
  const weather = 'weather.demo_daily';
  let rejectRest;
  let liveCalendar = false;
  let nextRest;
  let finishRest;
  let primarySummary = 'Original REST appointment';
  const connectionEvents = new EventTarget();
  const loadRequests = [];
  const restRequests = [];
  const mutations = [];
  const selected = { locale: language, toolbar: [
    { kind:'settings' },
    { kind:'calendar', id:'demo-calendar', placement:'settings',
      calendar_agenda:{ enabled:true, weather_entity:weather, ...(query.has('month') && { show_month:true }),
        ...(query.has('details') && { event_details:true }) },
      sections:[{ kind:'devices', entities: [
        { entity:primary, icon:'mdi:account', accent_color:'#AABBCC' },
        { entity:secondary, icon:'mdi:star', accent_color:'#ABCDEF' },
        offline, denied,
      ] }] },
  ] };
  if (query.has('automatic')) delete selected.toolbar[1].sections;
  if (query.has('loading-single')) selected.toolbar[1].sections[0].entities = [primary];
  const state = (name, status = 'off', attributes = {}) => ({state:status, attributes:{friendly_name:name,...attributes}});
  const states = {
    [primary]:state('Primary'), [secondary]:state('Secondary'), [offline]:state('Offline',query.has('missing') ? 'off' : 'unavailable'),
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
  if (query.has('details')) planned.push({
    summary:'Recurring team appointment',
    start:{ dateTime:date(0,18).toISOString() }, end:{ dateTime:date(1,7).toISOString() },
    location:'Second floor', description:'<img src="/should-not-be-loaded.png">\nBring notes',
    recurrence_id:'fixture-occurrence', rrule:'FREQ=WEEKLY',
  });
  const hass = {
    states, locale:{language,time_format:'24', ...(query.has('server-zone') && {time_zone:'server'})},
    ...(query.has('server-zone') && {config:{time_zone:'America/Los_Angeles'}}), user:{is_admin:true,id:'synthetic'},
    callService(...args) { mutations.push(args); },
    callWS(...args) { mutations.push(args); },
    callApi(method, path) {
      restRequests.push({method,path});
      if (query.has('rest-poll') && path.startsWith('calendars/' + primary + '?')) {
        if (nextRest) {
          nextRest = false;
          return new Promise(resolve => { finishRest = () => resolve([event('Expired REST reply',0)]); });
        }
        return Promise.resolve([event(primarySummary,0)]);
      }
      if (query.has('rest-retry')) {
        if (path.startsWith('calendars/' + denied + '?')) return Promise.reject({status:403});
        if (path.startsWith('calendars/' + offline + '?')) return Promise.reject({status:404});
        if (path.startsWith('calendars/' + primary + '?')) {
          const attempts = restRequests.filter(request => request.path.startsWith('calendars/' + primary + '?'));
          if (attempts.length === 1) {
            if (query.has('rest-inflight')) return new Promise((_, reject) => { rejectRest = reject; });
            return Promise.reject({status:503});
          }
          return Promise.resolve([event('Recovered appointment',0)]);
        }
      }
      if (query.has('details') && path.startsWith('calendars/' + primary + '?')) return Promise.resolve(planned);
      return Promise.resolve([]);
    },
    connection: query.has('rest') ? undefined : {
      addEventListener: connectionEvents.addEventListener.bind(connectionEvents),
      removeEventListener: connectionEvents.removeEventListener.bind(connectionEvents),
      subscribeMessage(callback, message) {
        const request = {message,callback,closed:0};
        loadRequests.push(request);
        if (message.entity_id === denied) return Promise.reject({code:'unauthorized'});
        if (message.entity_id === offline) return Promise.reject({code:'not_found'});
        if (query.has('rest-poll') && message.type === 'calendar/event/subscribe' && !liveCalendar) {
          return Promise.reject({code:'unknown_command'});
        }
        if (message.entity_id === primary && query.has('recover')) {
          const attempts = loadRequests.filter(entry => entry.message.entity_id === primary).length;
          if (attempts <= Number(query.get('recover'))) return Promise.reject({code:'connection_lost'});
        }
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
    rejectRest: status => rejectRest?.({ status }),
    updateRestSummary: value => { primarySummary = value; },
    holdNextRest: () => { nextRest = true; },
    releaseRest: () => { finishRest?.(); },
    reconnect() {
      liveCalendar = true;
      connectionEvents.dispatchEvent(new Event('ready'));
    },
    mutations,
    send(index, payload) { loadRequests[index].callback(payload); },
    useBrowserTimeZone() {
      hass.locale = { ...hass.locale, time_zone:'local' };
      card.hass = { ...hass };
    },
    populate() {
      loadRequests.find(request => request.message.entity_id === primary).callback({events:planned});
      loadRequests.find(request => request.message.entity_id === secondary).callback({events:[shared]});
      loadRequests.find(request => request.message.entity_id === weather).callback(
        {type:'daily',forecast:[{datetime:date(0).toISOString(),temperature:26,templow:12,condition:'sunny'}]});
    },
    acknowledge() { loadRequests.find(request => request.message.entity_id === secondary)?.ack?.(); },
    emitSecondary() {
      loadRequests.findLast(request => request.message.entity_id === secondary)?.callback({events:[shared]});
    },
    emitPrimary(previous = false) {
      const attempts = loadRequests.filter(request => request.message.entity_id === primary);
      attempts[previous ? 0 : attempts.length - 1]?.callback({events:[event('Recovered appointment',0)]});
    },
    dropPrimary() {
      states[primary] = state('Primary','unavailable');
      card.hass = { ...hass, states:{ ...states } };
    },
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

async function assertCalendarLoadingGeometry(browser, locale, name) {
  const page = await browser.newPage({ viewport:{ width:320, height:844 }, hasTouch:true, reducedMotion:'reduce' });
  page.setDefaultTimeout(8000);
  const dialog = page.getByRole('dialog', { name, exact:true });
  const loading = dialog.locator('.calendar-agenda-loading');
  const warning = dialog.locator('.calendar-agenda-status[data-warning]');
  const close = dialog.locator('[data-role=close]');
  const url = base + '?month&details&locale=' + locale;
  try {
    for (const width of [320,391]) {
      await page.setViewportSize({ width, height:844 });
      await page.goto(url + '&loading-width=' + width + '#panel/demo-calendar');
      await loading.waitFor();
      await warning.waitFor();
      assert.equal(await loading.getAttribute('role'), 'status');
      assert.equal(await dialog.locator('.calendar-agenda-event').count(), 0);
      const waiting = await close.boundingBox();
      assert.ok((await loading.boundingBox()).height >= 96);

      await page.evaluate(() => window.fixture.emitPrimary());
      await dialog.getByText('Recovered appointment', { exact:true }).waitFor();
      await loading.waitFor({ state:'hidden' });
      await warning.waitFor();
      const ready = await close.boundingBox();
      assert.ok(Math.abs(ready.y - waiting.y) <= 26, JSON.stringify({ locale, width, waiting, ready }));
      assert.equal(await close.evaluate(node => node.getRootNode().activeElement === node), true);
    }

    await page.goto(url + '&loading-single#panel/demo-calendar');
    await loading.waitFor();
    assert.equal(await warning.isVisible(), false);
    const initialHeight = (await dialog.boundingBox()).height;
    await page.evaluate(() => window.fixture.send(0, { events:[] }));
    await loading.waitFor({ state:'hidden' });
    assert.ok((await dialog.boundingBox()).height < initialHeight - 44, 'An empty agenda does not retain the loading height');
    await page.evaluate(() => window.fixture.dropPrimary());
    await warning.waitFor();
    assert.equal(await loading.isVisible(), false);
    assert.deepEqual(await page.evaluate(() => window.fixture.mutations), []);
  } finally { await page.close(); }
}

async function assertCalendarRestPoll(browser, locale, name) {
  const page = await browser.newPage({viewport:{width:391,height:844},hasTouch:true,reducedMotion:'reduce',
    timezoneId:'America/New_York'});
  page.setDefaultTimeout(8000);
  const clock = page.clock;
  const panel = page.getByRole('dialog',{name,exact:true});
  const primaryReads = () => page.evaluate(() => window.fixture.restRequests.filter(request =>
    request.path.startsWith('calendars/calendar.demo_primary?')));
  const waitReads = length => page.waitForFunction(length => window.fixture.restRequests.filter(request =>
    request.path.startsWith('calendars/calendar.demo_primary?')).length === length, length);
  const allReads = () => page.evaluate(() => window.fixture.restRequests.length);
  const fresh = title => panel.getByText(title,{exact:true}).waitFor();
  const url = base + '?rest-poll&locale=' + locale + '#panel/demo-calendar';
  try {
    await clock.install({time:new Date('2026-11-25T16:00:00Z')});
    await page.goto(url);
    await fresh('Original REST appointment');
    assert.equal(await allReads(),2);
    await page.evaluate(() => window.fixture.updateRestSummary('New REST appointment'));
    await clock.fastForward(29 * 60000);
    assert.equal(await allReads(),2);
    await clock.fastForward(61000);
    await fresh('New REST appointment');
    assert.equal(await allReads(),4);
    assert.equal(await page.evaluate(() => window.fixture.requests().filter(request =>
      request.entity_id === 'calendar.demo_primary').length),1);

    await page.evaluate(() => window.fixture.holdNextRest());
    await clock.fastForward(30 * 60000 + 100);
    await waitReads(3);
    await page.evaluate(() => window.fixture.reconnect());
    await page.waitForFunction(() => window.fixture.requests().filter(request =>
      request.entity_id === 'calendar.demo_primary').length === 2);
    await page.evaluate(() => window.fixture.emitPrimary());
    await fresh('Recovered appointment');
    await page.evaluate(() => window.fixture.releaseRest());
    await clock.fastForward(30 * 60000 + 200);
    assert.equal((await primaryReads()).length,3);
    assert.equal(await panel.getByText('Expired REST reply',{exact:true}).count(),0);

    await clock.setSystemTime(new Date('2026-11-25T04:45:00Z'));
    await page.goto(url.replace('#', '&case=midnight#'));
    await fresh('Original REST appointment');
    await clock.fastForward(16 * 60000);
    await waitReads(2);
    const ranges = await primaryReads();
    assert.match(decodeURIComponent(ranges[0].path), /2026-11-24T05:00:00/);
    assert.match(decodeURIComponent(ranges[1].path), /2026-11-25T05:00:00/);
    await clock.fastForward(16 * 60000);
    assert.equal((await primaryReads()).length,2);
    await page.evaluate(() => window.fixture.holdNextRest());
    await clock.fastForward(15 * 60000);
    await waitReads(3);
    await panel.locator('button[data-role=close]').tap();
    await panel.waitFor({state:'hidden'});
    await page.evaluate(() => window.fixture.releaseRest());
    await clock.fastForward(31 * 60000);
    assert.equal((await primaryReads()).length,3);
    assert.deepEqual(await page.evaluate(() => window.fixture.mutations),[]);
  } finally { await page.close(); }
}

try {
  await runBrowserEngines([[chromium, 'Chromium', 'en', 390], [webkit, 'WebKit', 'he', 320]], async (launcher, label, locale, width) => {
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
      await assertCalendarLoadingGeometry(browser, locale, names.calendar);
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
      const warning = dialog.locator('.calendar-agenda-status[data-warning]');
      assert.equal(await warning.getAttribute('role'),'status');
      assert.ok(await warning.evaluate(element => element.getBoundingClientRect().height >= 44));
      assert.equal(await dialog.locator('.calendar-agenda-date').count(),0);
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

      // Verify chronological days, localized labels and usability across a year boundary in both layouts.
      await page.clock.setFixedTime(new Date('2026-12-30T17:00:00Z'));
      await page.goto(base + '?month&locale=' + locale);
      const monthDialog = await open();
      await page.waitForFunction(() => window.fixture.requests().length === 4);
      await page.evaluate(() => window.fixture.populate());
      await monthDialog.getByText(names.partial,{exact:true}).waitFor();
      await monthDialog.getByText('26°C',{exact:true}).waitFor();
      const dates = monthDialog.locator('time.calendar-agenda-date');
      const isoDates = () => dates.evaluateAll(items => items.map(item => item.dateTime));
      assert.deepEqual(await isoDates(), ['2026-12-30','2026-12-31','2027-01-01','2027-01-02']);
      const dateText = await dates.evaluateAll(items => items.map(item => ({
        month:item.querySelector('.calendar-agenda-month').textContent,
        year:item.querySelector('.calendar-agenda-year').textContent,
        heading:item.parentElement.getAttribute('aria-label'),
      })));
      assert.equal(dateText[0].month,dateText[1].month);
      assert.notEqual(dateText[0].month,dateText[2].month);
      assert.deepEqual(dateText.map(item => item.year),['2026','2026','2027','2027']);
      assert.ok(dateText.every(item => item.heading.includes(item.year)));
      const columns = await dates.first().evaluate(date => {
        const group = date.closest('.calendar-agenda-day');
        const list = group.querySelector('.calendar-agenda-list');
        return [date.getBoundingClientRect().right,list.getBoundingClientRect().left,getComputedStyle(list).direction];
      });
      assert.ok(columns[0] <= columns[1] && columns[2] === (hebrew ? 'rtl' : 'ltr'));
      assert.equal(await monthDialog.locator('.calendar-agenda-event').count(),6);
      await monthDialog.getByRole('button',{name:names.show,exact:true}).tap();
      assert.equal((await isoDates()).at(-1),'2027-01-05');
      assert.equal(await monthDialog.locator('.calendar-agenda-event').count(),9);
      assert.equal(await monthDialog.locator('.calendar-agenda').evaluate(el => el.scrollWidth <= el.clientWidth + 1),true);
      assert.equal(await page.evaluate(() => window.fixture.mutations.length),0);

      await page.goto(base + '?details&month&locale=' + locale);
      const eventDialog = await open();
      const detail = eventDialog.locator('.calendar-agenda-detail');
      const timedName = 'Recurring team appointment';
      const timed = eventDialog.getByRole('button', { name:timedName, exact:true });
      const back = detail.getByRole('button', { name:hebrew ? 'חזרה ליומן' : 'Back to agenda', exact:true });
      const when = detail.locator('dt').filter({ hasText:hebrew ? /^מועד$/ : /^When$/ }).locator('+ dd');
      const hasFocus = locator => locator.evaluate(node => node.getRootNode().activeElement === node);
      const extraRequests = [];
      page.on('request', request => {
        if (request.url().includes('/should-not-be-loaded.png')) extraRequests.push(request.url());
      });
      await page.waitForFunction(() => window.fixture.requests().length === 4);
      await page.evaluate(() => window.fixture.populate());
      await timed.waitFor();
      assert.equal(await detail.isVisible(), false);
      assert.equal(await eventDialog.getByText('Second floor',{exact:true}).count(),0);
      await eventDialog.locator('.calendar-agenda-day-head').first().click();
      await eventDialog.getByRole('button', { name:names.hide, exact:true }).waitFor();
      await timed.focus();
      await timed.press('Enter');
      await detail.waitFor();
      assert.equal(await hasFocus(back),true);
      assert.equal(await detail.getByRole('heading',{name:timedName,exact:true}).count(),1);
      assert.match((await when.innerText()).replace(/[\u200e\u200f]/gu,''),/18:00[\s\S]*\b0?7:00/);
      assert.equal(await detail.getByText('Second floor',{exact:true}).count(),1);
      assert.equal(await detail.getByText('Primary',{exact:true}).count(),1);
      assert.equal(await detail.getByText(hebrew ? 'אירוע חוזר' : 'Recurring event',{exact:true}).count(),1);
      assert.equal(await detail.locator('dd').filter({hasText:'Bring notes'}).textContent(),
        '<img src="/should-not-be-loaded.png">\nBring notes');
      assert.equal(await detail.locator('img, a').count(),0);
      assert.deepEqual(extraRequests,[]);
      await back.press('Escape');
      await detail.waitFor({state:'hidden'});
      assert.equal(await eventDialog.isVisible(),true);
      assert.equal(await hasFocus(timed),true);
      assert.equal(await eventDialog.getByRole('button',{name:names.hide,exact:true}).getAttribute('aria-expanded'),'true');

      const wholeDay = eventDialog.getByRole('button',{name:'Multi-day appointment',exact:true});
      await wholeDay.tap();
      await detail.waitFor();
      const detailsDates = await when.textContent();
      const format = new Intl.DateTimeFormat(locale, {weekday:'long',month:'long',day:'numeric',year:'numeric'});
      assert.ok(detailsDates.includes(format.format(new Date(2026,11,30,12))));
      assert.ok(detailsDates.includes(format.format(new Date(2027,0,1,12))));
      assert.ok(!detailsDates.includes(format.format(new Date(2027,0,2,12))));
      assert.equal(await detail.getByText(hebrew ? 'אירוע חוזר' : 'Recurring event',{exact:true}).count(),0);
      await back.tap();
      assert.equal(await hasFocus(wholeDay),true);
      const sharedEvent = eventDialog.getByRole('button',{name:'Shared appointment with a long but readable fixture title',exact:true});
      await sharedEvent.tap();
      await detail.waitFor();
      assert.equal(await detail.getByText('Primary, Secondary',{exact:true}).count(),1);
      await back.click();
      await eventDialog.getByRole('button',{name:names.hide,exact:true}).click();
      await timed.tap();
      await detail.waitFor();
      await back.click();
      assert.equal(await eventDialog.getByRole('button',{name:names.show,exact:true}).getAttribute('aria-expanded'),'false');
      await timed.tap();
      await page.evaluate(() => window.fixture.dropPrimary());
      await detail.waitFor({state:'hidden'});
      assert.equal(await eventDialog.isVisible(),true);
      assert.equal(await eventDialog.evaluate(el => el.getRootNode().activeElement.classList.contains('calendar-agenda-days')),true);
      assert.equal(await page.evaluate(() => window.fixture.requests().length),4);
      assert.deepEqual(await page.evaluate(() => window.fixture.restRequests),[]);
      assert.deepEqual(await page.evaluate(() => window.fixture.mutations),[]);

      await page.goto(base + '?details&rest&locale=' + locale);
      await open();
      await timed.tap();
      await detail.waitFor();
      assert.equal(await detail.getByText('Second floor',{exact:true}).count(),1);
      assert.equal(await page.evaluate(() => window.fixture.restRequests.length),3);
      assert.deepEqual(await page.evaluate(() => window.fixture.requests()),[]);

      if (!hebrew) {
        await page.goto(base + '?editor');
        await page.getByText('Toolbar and extra screens',{exact:true}).click();
        await page.getByRole('button',{name:'Calendar',exact:true}).click();
        assert.equal(await page.getByLabel('Compact agenda',{exact:true}).isChecked(),true);
        const forecast = page.getByLabel('Daily forecast beside dates',{exact:true});
        const showMonth = page.getByLabel('Show month in the date column',{exact:true});
        assert.equal(await forecast.inputValue(),'weather.demo_daily');
        assert.equal(await forecast.locator('option[value="weather.demo_hourly"]').count(),0);
        await showMonth.check();
        assert.deepEqual(await page.evaluate(() => window.draft.toolbar[1].calendar_agenda),
          {enabled:true, weather_entity:'weather.demo_daily', show_month:true});
        await forecast.selectOption('');
        assert.deepEqual(await page.evaluate(() => window.draft.toolbar[1].calendar_agenda),{enabled:true,show_month:true});
        await showMonth.uncheck();
        assert.deepEqual(await page.evaluate(() => window.draft.toolbar[1].calendar_agenda),{enabled:true});
        const eventDetails = page.getByLabel('Open event details when tapped',{exact:true});
        assert.equal(await eventDetails.isChecked(),false);
        await eventDetails.check();
        assert.deepEqual(await page.evaluate(() => window.draft.toolbar[1].calendar_agenda),{enabled:true,event_details:true});
        await eventDetails.uncheck();
        assert.deepEqual(await page.evaluate(() => window.draft.toolbar[1].calendar_agenda),{enabled:true});
        await page.getByRole('button',{name:'Devices',exact:true}).click();
        await page.getByRole('button',{name:'Primary',exact:true}).click();
        const accent = page.getByLabel('Calendar accent',{exact:true});
        await accent.fill('#4755aa');
        await accent.press('Tab');
        assert.equal(await page.evaluate(() => window.draft.toolbar[1].sections[0].entities[0].accent_color),'#4755aa');
      }
      const retryPage = await browser.newPage({ viewport:{width,height:844}, hasTouch:true, reducedMotion:'reduce',
        timezoneId:'America/New_York' });
      retryPage.setDefaultTimeout(8000);
      retryPage.on('pageerror', error => errors.push(error.message));
      const clock = retryPage.clock;
      await clock.install({ time:new Date('2026-12-30T17:00:00Z') });
      const retryDialog = retryPage.getByRole('dialog',{name:names.calendar,exact:true});
      let fixtureOpen = 0;
      const retryOpen = async (options, restOnly = false) => {
        await retryPage.goto(base + '?' + options + '&open=' + ++fixtureOpen + '&locale=' + locale + '#panel/demo-calendar');
        await retryDialog.waitFor();
        if (!restOnly) {
          await retryPage.waitForFunction(() => window.fixture.requests().some(request => request.entity_id === 'calendar.demo_secondary'));
          await retryPage.evaluate(() => window.fixture.emitSecondary());
        }
      };
      const attempts = (entity = 'primary') => retryPage.evaluate(name => window.fixture.requests()
        .filter(request => request.entity_id === 'calendar.demo_' + name), entity);
      const restAttempts = entity => retryPage.evaluate(name => window.fixture.restRequests
        .filter(request => request.path.startsWith('calendars/calendar.demo_' + name + '?')).length, entity);
      await retryOpen('recover=2&missing');
      assert.equal((await attempts()).length,1);
      await clock.fastForward(58000);
      assert.equal((await attempts()).length,1);
      await clock.fastForward(4000);
      assert.equal((await attempts()).length,2);
      await clock.fastForward(117000);
      assert.equal((await attempts()).length,2);
      await clock.fastForward(5000);
      assert.equal((await attempts()).length,3);
      await retryPage.evaluate(() => window.fixture.emitPrimary());
      await retryDialog.getByText('Recovered appointment',{exact:true}).waitFor();
      await clock.fastForward(121000);
      assert.equal((await attempts()).length,3);
      assert.equal((await attempts('denied')).length,1);
      assert.equal((await attempts('offline')).length,1);

      await retryOpen('timeout');
      await clock.fastForward(9000);
      await clock.fastForward(61000);
      assert.deepEqual((await attempts()).map(request => request.closed),[1,0]);
      await retryPage.evaluate(() => window.fixture.emitPrimary(true));
      assert.equal(await retryDialog.getByText('Recovered appointment',{exact:true}).count(),0);
      await retryPage.evaluate(() => window.fixture.emitPrimary());
      await retryDialog.getByText('Recovered appointment',{exact:true}).waitFor();

      await retryOpen('timeout');
      await clock.fastForward(9000);
      await retryPage.evaluate(() => window.fixture.emitPrimary());
      await retryDialog.getByText('Recovered appointment',{exact:true}).waitFor();
      await clock.fastForward(61000);
      assert.equal((await attempts()).length,1);
      assert.equal((await attempts())[0].closed,0);

      await retryOpen('recover=1');
      await retryPage.evaluate(() => window.fixture.dropPrimary());
      await clock.fastForward(61000);
      assert.equal((await attempts()).length,1);
      await retryOpen('recover=1');
      await retryPage.keyboard.press('Escape');
      await retryDialog.waitFor({state:'hidden'});
      await clock.fastForward(61000);
      assert.equal((await attempts()).length,1);

      await retryOpen('rest&rest-retry&missing', true);
      await retryPage.waitForFunction(() => window.fixture.restRequests.length === 4);
      await clock.fastForward(61000);
      await retryDialog.getByText('Recovered appointment',{exact:true}).waitFor();
      assert.equal(await restAttempts('primary'),2);
      assert.equal(await restAttempts('denied'),1);
      assert.equal(await restAttempts('offline'),1);
      assert.deepEqual(await retryPage.evaluate(() => window.fixture.mutations),[]);

      await retryOpen('rest&rest-retry&rest-inflight&missing', true);
      await retryPage.waitForFunction(() => window.fixture.restRequests.length === 4);
      await clock.fastForward(9000);
      await clock.fastForward(61000);
      assert.equal(await restAttempts('primary'),1);
      await retryPage.evaluate(() => window.fixture.rejectRest(503));
      await retryDialog.getByText('Recovered appointment',{exact:true}).waitFor();
      assert.equal(await restAttempts('primary'),2);

      await clock.setSystemTime(new Date('2026-12-31T04:59:30Z'));
      await retryOpen('recover=2');
      await clock.fastForward(42000);
      const startAfterMidnight = await attempts();
      assert.equal(startAfterMidnight.length,2);
      assert.notEqual(startAfterMidnight[0].start,startAfterMidnight[1].start);
      await clock.fastForward(24000);
      assert.equal((await attempts()).length,2);
      assert.deepEqual(errors,[]);
      await retryPage.close();

      const zonePage = await browser.newPage({ viewport:{width,height:844}, hasTouch:true, reducedMotion:'reduce',
        ...(launcher !== chromium && {timezoneId:'America/New_York'}) });
      const devtools = launcher === chromium ? await zonePage.context().newCDPSession(zonePage) : undefined;
      await devtools?.send('Emulation.setTimezoneOverride', {timezoneId:'America/New_York'});
      await zonePage.clock.install({ time:new Date('2026-03-08T07:15:00Z') });
      await zonePage.goto(base + '?server-zone&month&details&locale=' + locale + '#panel/demo-calendar');
      const zoneDialog = zonePage.getByRole('dialog',{name:names.calendar,exact:true});
      await zoneDialog.waitFor();
      const primaryRequests = () => zonePage.evaluate(() => window.fixture.requests().filter(request =>
        request.entity_id === 'calendar.demo_primary'));
      const emitAppointment = async () => zonePage.evaluate(() => {
        const requests = window.fixture.requests();
        const primary = requests.findLastIndex(request => request.entity_id === 'calendar.demo_primary');
        const daily = requests.findLastIndex(request => request.entity_id === 'weather.demo_daily');
        window.fixture.send(primary, {events:[{
          summary:'Appointment near midnight',start:{dateTime:'2026-03-08T07:30:00Z'},end:{dateTime:'2026-03-08T07:45:00Z'},
        }]});
        window.fixture.send(daily, {type:'daily',forecast:[{datetime:'2026-03-08T07:00:00Z',temperature:26,condition:'sunny'}]});
      });
      await zonePage.waitForFunction(() => window.fixture.requests().some(request => request.entity_id === 'weather.demo_daily'));
      let requestsWithZone = await primaryRequests();
      assert.equal(requestsWithZone[0].start,'2026-03-07T08:00:00.000Z');
      assert.equal(requestsWithZone[0].end,'2026-03-14T07:00:00.000Z');
      await emitAppointment();
      const appointment = zoneDialog.getByRole('button',{name:'Appointment near midnight',exact:true});
      await appointment.waitFor();
      assert.equal(await zoneDialog.locator('.calendar-agenda-date').getAttribute('datetime'),'2026-03-07');
      assert.match(await zoneDialog.locator('.calendar-agenda-time').innerText(),/23:30/);
      assert.match(await zoneDialog.locator('.calendar-agenda-forecast').innerText(),/26°C/);
      await appointment.click();
      assert.match(await zoneDialog.locator('.calendar-agenda-detail dd').first().innerText(),/23:30/);
      await zonePage.keyboard.press('Escape');
      await appointment.waitFor();
      await zonePage.evaluate(() => window.fixture.useBrowserTimeZone());
      await zonePage.waitForFunction(() => window.fixture.requests().filter(request => request.entity_id === 'calendar.demo_primary').length === 2);
      requestsWithZone = await primaryRequests();
      assert.equal(requestsWithZone[0].closed,1);
      assert.equal(requestsWithZone[1].start,'2026-03-08T05:00:00.000Z');
      await emitAppointment();
      await appointment.waitFor();
      assert.equal(await zoneDialog.locator('.calendar-agenda-date').getAttribute('datetime'),'2026-03-08');
      assert.match(await zoneDialog.locator('.calendar-agenda-time').innerText(),/0?3:30/);
      if (devtools) {
        await devtools.send('Emulation.setTimezoneOverride', {timezoneId:''});
        await devtools.send('Emulation.setTimezoneOverride', {timezoneId:'America/Denver'});
        await zonePage.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await zonePage.waitForFunction(() => window.fixture.requests().filter(request => request.entity_id === 'calendar.demo_primary').length === 3);
        requestsWithZone = await primaryRequests();
        assert.deepEqual(requestsWithZone.map(request => request.closed),[1,1,0]);
        assert.equal(requestsWithZone[2].start,'2026-03-08T07:00:00.000Z');
        await emitAppointment();
        await appointment.waitFor();
        assert.equal(await zoneDialog.locator('.calendar-agenda-date').getAttribute('datetime'),'2026-03-08');
        assert.match(await zoneDialog.locator('.calendar-agenda-time').innerText(),/00:30/);
        await devtools.detach();
      }
      assert.equal(await zonePage.evaluate(() => window.fixture.mutations.length),0);
      await zonePage.close();

      await assertCalendarRestPoll(browser, locale, names.calendar);

      console.log(label + ': compact/expanded agenda, localized event details, availability, retry, cleanup, and Home Assistant time zone');
    } finally { await browser.close(); }
  });
} finally { await new Promise(resolve => server.close(resolve)); }
