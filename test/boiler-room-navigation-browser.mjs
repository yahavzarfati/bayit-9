import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));

const fixture = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<script type="module">import "/dashboard.js";(' + async function () {
    const params = new URL(location.href).searchParams;
    const locale = params.get('locale');
    const guardedSchedule = params.has('guarded-schedule');
    const idleZero = params.has('idle-zero');
    const shared = params.has('shared-preference');
    const preference = 'input_boolean.fixture_boiler_view';
    const hiddenPreference = 'input_boolean.fixture_hidden';
    const timerTarget = 'input_boolean.fixture_climate_timer';
    const timing = params.has('compact') ? { max_minutes: 300, presets: [],
      ...(idleZero ? { min_minutes: 15, step_minutes: 15, idle_zero_duration: true }
        : { min_minutes: 1, step_minutes: 1 }),
    } : { min_minutes: 15, max_minutes: 60, step_minutes: 15 };
    const boiler = { entity: 'switch.fixture_boiler', name: 'Fixture boiler', kind: 'boiler',
      ...(params.has('stacked') && { boiler_timer_with_details: true }),
      ...(shared && !params.has('unbound-preference') && { boiler_detail_preference_entity:preference }),
      ...(guardedSchedule && { schedule: { save_script: 'script.fixture_schedule_save', delete_script: 'script.fixture_schedule_delete' } }),
      ...(!params.has('untimed') && { timed: { simple_timer_entity: 'sensor.fixture_runtime', ...timing } }) };
    const sensors = Array.from({ length: 12 }, (_, index) => ({
      entity: 'sensor.fixture_' + index, name: 'Fixture reading ' + index,
    }));
    const states = {
      ...Object.fromEntries(sensors.map(sensor => [sensor.entity, { state: '20', attributes: {} }])),
      [boiler.entity]: { state: 'off', attributes: {} },
      'sensor.fixture_runtime': { state: '0', attributes: {
        entry_id: 'fixture-runtime', switch_entity_id: boiler.entity, timer_state: 'idle', device_active: false,
      } },
    };
    if (shared) {
      states[preference] = { state:await window.fixtureReadBoilerView(), attributes:{} };
      states[hiddenPreference] = { state:'off', attributes:{} };
      states[timerTarget] = { state:'off', attributes:{} };
    }
    if (params.has('wrong-runtime-target')) states['sensor.fixture_runtime'].attributes.switch_entity_id = 'switch.another';
    const names = ['Morning', 'Evening'];
    if (guardedSchedule) names.push(...Array.from({ length: 10 }, (_, index) => 'Fixture schedule ' + index));
    const schedules = names.map((name, index) => ({
      schedule_id: 'fixture' + index, entity_id: 'switch.schedule_fixture' + index, name, enabled: true,
      weekdays: ['daily'], repeat_type: 'repeat', start_date: null, end_date: null, tags: [],
      timeslots: [{ start: index ? '17:30:00' : '07:30:00', stop: null, conditions: [],
        condition_type: null, track_conditions: false, actions: [{ service: 'simple_timer.start_timer',
          entity_id: null, service_data: { entry_id: 'fixture-runtime', duration: 30 } }] }],
    }));
    const requests = [];
    const timerCalls = [];
    const moreInfo = [];
    const scheduleActions = params.has('schedule-actions') || guardedSchedule;
    const scheduleCalls = [];
    let pausedScheduleRead;
    let releaseScheduleRead;
    const card = document.createElement('bayit-dashboard');
    card.setConfig({ locale, page: params.has('routed'),
      ...(params.has('hide-runtime') && {hidden_entities:['sensor.fixture_runtime']}),
      popup_aliases:{ '#former-boiler-form':'#device/bath/switch.fixture_boiler/schedule' }, rooms: [
      { id: 'kitchen', name: 'Kitchen', entities: [...sensors,
        { ...boiler, ...(params.has('room-schedule-entry') && { room_boiler_schedule_entry: true }) }],
        shortcuts: [] },
      { id: 'bath', name: 'Bath', entities: [boiler], shortcuts: [boiler.entity] },
      { id: 'monitor', name: 'Monitor', entities: [{ ...boiler, role: 'status' }], shortcuts: [boiler.entity] },
    ] });
    const services = { simple_timer: { start_timer: {} } };
    if (shared) services.input_boolean = { turn_on:{}, turn_off:{} };
    if (!params.has('without-scheduler')) services.scheduler = { add: {} };
    if (scheduleActions) {
      services.scheduler.edit = {};
      services.switch = { turn_on: {}, turn_off: {} };
      for (const schedule of schedules) states[schedule.entity_id] = { state: 'on', last_updated: 'fixture-revision', attributes: {} };
    }
    if (guardedSchedule) services.script = { fixture_schedule_save: {}, fixture_schedule_delete: {} };
    const readSchedule = (type, data) => {
      if (pausedScheduleRead !== type) return Promise.resolve(data);
      pausedScheduleRead = undefined;
      return new Promise(resolve => { releaseScheduleRead = () => resolve(data); });
    };
    const preferenceCalls = [];
    const hass = {
      user: { id:params.get('account'), is_admin: true }, states, services,
      entities:{ [hiddenPreference]:{ hidden_by:'user' } },
      callWS(request) {
        requests.push(request.type);
        if (shared && request.type === 'call_service') {
          preferenceCalls.push(request);
          if (request.domain !== 'input_boolean' || request.target?.entity_id !== preference) {
            return Promise.reject(new Error('Unexpected state write in view preference fixture'));
          }
          return window.fixtureWriteBoilerView(request);
        }
        if (idleZero && request.type === 'call_service' && request.domain === 'simple_timer') {
          timerCalls.push(request);
          return Promise.resolve({});
        }
        if ((params.has('stacked') || params.has('schedule-link')) && request.type === 'scheduler') {
          return readSchedule(request.type,schedules);
        }
        if (scheduleActions && request.type === 'scheduler/item') {
          return readSchedule(request.type,schedules.find(schedule => schedule.schedule_id === request.schedule_id));
        }
        if (scheduleActions && request.type === 'call_service') {
          if (guardedSchedule) {
            const payload = request.service_data;
            const existing = payload?.schedule_entity;
            if (request.domain !== 'script' || request.service !== 'fixture_schedule_save' || request.return_response !== true
                || payload.duration < 15 || payload.duration > 300 || payload.duration % 15 || !payload.weekdays.length
                || (existing && payload.expected_revision !== states[existing]?.last_updated)) {
              return Promise.reject(new Error('Unexpected guarded write in schedule fixture'));
            }
            const record = existing ? schedules.find(item => item.entity_id === existing) : {
              ...structuredClone(schedules[0]), schedule_id: 'created', entity_id: 'switch.schedule_created',
            };
            record.name = payload.schedule_name;
            record.weekdays = payload.weekdays;
            record.timeslots[0].start = payload.schedule_time + ':00';
            record.timeslots[0].actions[0].service_data.duration = payload.duration;
            if (!existing) {
              schedules.push(record);
              states[record.entity_id] = { state: 'on', last_updated: 'fixture-created', attributes: {} };
            }
            scheduleCalls.push(request);
            return Promise.resolve({ response: { success: true } });
          }
          const schedule = schedules.find(entry => entry.entity_id === request.target?.entity_id);
          if (request.domain !== 'switch' || request.service !== 'turn_off' || !schedule) {
            return Promise.reject(new Error('Unexpected service in schedule fixture'));
          }
          scheduleCalls.push(request);
          schedule.enabled = false;
          states[schedule.entity_id].state = 'off';
          return Promise.resolve({});
        }
        if (params.has('history-layout') && request.type === 'history/history_during_period') {
          const events = [35, 60, 95, 120, 20].flatMap((minutes, index) => {
            const end = Date.now() / 1000 - (index + 1) * 86400;
            return [{s:'on', lu:end - minutes * 60}, {s:'off', lu:end}];
          });
          return Promise.resolve({[boiler.entity]:events});
        }
        return Promise.resolve(request.type === 'history/history_during_period' ? {} : []);
      },
    };
    card.hass = hass;
    card.addEventListener('hass-more-info', event => moreInfo.push(event.detail.entityId));
    if (params.has('editor')) {
      const editor = document.createElement('bayit-9-strategy-editor');
      editor.setConfig({ type: 'custom:bayit-9', locale, profiles: [boiler, ...(shared ? [{
        entity:'climate.fixture_heating', kind:'climate',
        timed:{ simple_timer_entity:'sensor.fixture_climate_runtime', simple_timer_target:timerTarget },
      }] : [])] });
      editor.hass = hass;
      editor.addEventListener('config-changed', event => { window.latest = event.detail.config; });
      document.body.append(editor);
    } else document.body.append(card);
    window.fixture = {
      requests, moreInfo, scheduleCalls, timerCalls, preferenceCalls,
      reportPreference(next) {
        states[preference] = { state:next, attributes:{} };
        card.hass = { ...hass, states:{ ...states } };
      },
      setPreferenceService(enabled) {
        services.input_boolean = enabled ? {turn_on:{},turn_off:{}} : {};
        card.hass = { ...hass, services:{ ...services } };
      },
      setPreferenceVisibility(visible) {
        hass.entities[preference] = visible ? {} : { hidden_by:'user' };
        card.hass = { ...hass, entities:{ ...hass.entities } };
      },
      pauseScheduleRead(type = 'scheduler') { pausedScheduleRead = type; },
      scheduleReadWaiting() { return Boolean(releaseScheduleRead); },
      releaseScheduleRead() {
        releaseScheduleRead();
        releaseScheduleRead = undefined;
      },
      setupState(deviceState, timerState, { showSeconds, usedSeconds = 0 } = {}) {
        states[boiler.entity] = { state: deviceState, attributes: {} };
        states['sensor.fixture_runtime'] = {
          state: timerState === 'unavailable' ? 'unavailable' : String(usedSeconds),
          attributes: {
            entry_id: 'fixture-runtime', switch_entity_id: boiler.entity, timer_state: timerState,
            timer_finishes_at: new Date(Date.now() + 120000).toISOString(),
            device_active: deviceState === 'on',
            ...(showSeconds !== undefined && { show_seconds: showSeconds }),
          },
        };
        card.hass = { ...hass, states: { ...states } };
      },
    };
  }.toString() + ')();</script>';

const server = createServer((request, response) => {
  if (request.url === '/dashboard.js') {
    response.writeHead(200, { 'Content-Type': 'application/javascript' });
    response.end(bundle);
  } else {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(fixture);
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

async function assertSharedBoilerView(browser, locale) {
  const home = 'http://127.0.0.1:' + server.address().port + '?stacked&routed&shared-preference&locale=' + locale;
  const route = '#device/bath/switch.fixture_boiler';
  const helper = 'input_boolean.fixture_boiler_view';
  const he = locale === 'he';
  const words = {
    schedule:he ? 'תזמון' : 'Schedule', history:he ? 'היסטוריית שימוש' : 'Usage history',
    profiles:he ? 'שליטה בדוד ובתנורים' : 'Boiler and heater controls', edit:he ? 'עריכה' : 'Edit',
    save:he ? 'שמירת בקר' : 'Save profile',
    helper:he ? 'בורר משותף לתזמון ולהיסטוריה' : 'Shared Schedule and History helper',
  };
  let reported = 'on';
  const writes = [];
  const events = new EventEmitter();
  const clients = [];
  const client = async account => {
    const page = await browser.newPage({ viewport:{width:340,height:844}, hasTouch:true, reducedMotion:'reduce' });
    clients.push(page);
    page.setDefaultTimeout(8000);
    await page.exposeFunction('fixtureReadBoilerView', () => reported);
    await page.exposeFunction('fixtureWriteBoilerView', request => new Promise((resolve,reject) => {
      writes.push({request,resolve,reject});
      events.emit('write');
    }));
    const dialog = page.getByRole('dialog',{name:'Fixture boiler',exact:true});
    const tabs = dialog.locator('.boiler-tabs');
    const ready = active => tabs.locator('button[aria-pressed=true]').filter({hasText:words[active]}).waitFor();
    const tab = name => tabs.getByRole('button',{name:words[name],exact:true});
    const reflect = state => page.evaluate(value => fixture.reportPreference(value),state);
    const calls = () => page.evaluate(() => fixture.preferenceCalls);
    const open = (suffix = '', hash = route) => page.goto(home + '&account=' + account + suffix + hash);
    return {page,tabs,ready,tab,reflect,calls,open};
  };
  const waitForWrites = async total => {
    if (writes.length < total) await once(events,'write',{signal:AbortSignal.timeout(8000)});
    assert.equal(writes.length,total);
  };
  const publish = async (state,...views) => {
    reported = state;
    await Promise.all(views.map(view => view.reflect(state)));
  };
  try {
    const first = await client('account-a');
    const second = await client('account-b');
    assert.notEqual(first.page.context(),second.page.context());
    await Promise.all([first.open(),second.open()]);
    await Promise.all([first.ready('history'),second.ready('history')]);
    assert.deepEqual(await first.calls(),[]);
    assert.deepEqual(await second.calls(),[]);

    await first.tab('schedule').press('Enter');
    await waitForWrites(1);
    assert.deepEqual(writes[0].request,{type:'call_service',domain:'input_boolean',service:'turn_off',
      target:{entity_id:helper},service_data:{}});
    await first.tabs.locator('button[aria-disabled=true]').first().waitFor();
    await first.ready('history');
    await second.ready('history');
    assert.equal(await first.tab('schedule').evaluate(node => node.getRootNode().activeElement === node),true);
    await publish('off',first,second);
    writes[0].resolve({});
    await Promise.all([first.ready('schedule'),second.ready('schedule')]);
    await first.tabs.locator('button[aria-disabled=false]').first().waitFor();
    await second.page.reload();
    await second.ready('schedule');
    assert.deepEqual(await second.calls(),[]);

    await first.tab('history').tap();
    await waitForWrites(2);
    assert.deepEqual(writes[1].request,{type:'call_service',domain:'input_boolean',service:'turn_on',
      target:{entity_id:helper},service_data:{}});
    writes[1].reject(new Error('Fixture rejected the change'));
    await first.tabs.locator('button[aria-disabled=false]').first().waitFor();
    await first.ready('schedule');
    assert.deepEqual(await first.calls(),writes.map(write => write.request));

    // The direct schedule route takes precedence without persisting a new view.
    reported = 'on';
    await second.open('&schedule-link',route + '/schedule');
    await second.ready('schedule');
    await publish('off',second);
    await publish('on',second);
    await second.ready('schedule');
    assert.equal(writes.length,2);
    assert.deepEqual(await second.calls(),[]);

    // Invalid, hidden or unavailable helper states leave local tab navigation useful.
    await first.reflect('unavailable');
    await first.tab('history').tap();
    await first.ready('history');
    await first.reflect('off');
    await first.ready('schedule');
    await first.page.evaluate(() => fixture.setPreferenceVisibility(false));
    await first.tab('history').tap();
    await first.ready('history');
    await first.page.evaluate(() => fixture.setPreferenceVisibility(true));
    await first.ready('schedule');
    await first.page.evaluate(() => fixture.setPreferenceService(false));
    await first.tab('history').tap();
    await first.ready('history');
    assert.equal(writes.length,2);
    await first.reflect('off');
    reported = 'unavailable';
    await first.page.reload();
    await first.ready('history');
    assert.deepEqual(await first.calls(),[]);

    reported = 'off';
    await first.open('&editor&unbound-preference','');
    await first.page.getByText(words.profiles,{exact:true}).click();
    await first.page.getByRole('button',{name:words.edit,exact:true}).first().click();
    const helperPicker = first.page.getByLabel(words.helper,{exact:true});
    assert.deepEqual(await helperPicker.locator('option').evaluateAll(items => items.map(item => item.value)),['',helper]);
    await helperPicker.selectOption(helper);
    await first.page.getByRole('button',{name:words.save,exact:true}).click();
    assert.equal(await first.page.evaluate(() => window.latest.profiles[0].boiler_detail_preference_entity),helper);
    assert.deepEqual(await first.calls(),[]);
  } finally { await Promise.all(clients.map(page => page.close())); }
}

async function assertDedicatedBoilerPresentation(browser, locale) {
  const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const he = locale === 'he';
  const scheduleLabel = he ? 'תזמון' : 'Schedule';
  const historyLabel = he ? 'היסטוריית שימוש' : 'Usage history';
  const dialog = page.getByRole('dialog', { name: 'Fixture boiler', exact: true });
  const header = dialog.locator('.boiler-state-head');
  const symbol = header.locator('.device-icon');
  const status = header.locator('.current');
  const range = dialog.locator('.timer-range');
  const info = header.getByRole('button', { name: he ? 'מידע נוסף' : 'More info', exact: true });
  const schedule = dialog.getByRole('button', { name: scheduleLabel, exact: true });
  const history = dialog.getByRole('button', { name: historyLabel, exact: true });
  const schedulePane = dialog.getByRole('region', { name: scheduleLabel, exact: true });
  const historyPane = dialog.getByRole('region', { name: historyLabel, exact: true });
  const boxFor = items => Promise.all(items.map(item => item.boundingBox()));
  const mark = () => symbol.evaluate(node => ({
    heating: node.closest('.device').hasAttribute('data-boiler-heating'), color: getComputedStyle(node).color,
  }));
  try {
    await page.goto('http://127.0.0.1:' + server.address().port + '?compact&stacked&locale=' + locale);
    await page.locator('[data-room=bath] .quick-button').tap();
    await schedulePane.waitFor();
    assert.equal(await dialog.getByRole('heading', { name: 'Fixture boiler', exact: true }).count(), 1);
    assert.equal(await header.locator('.device-name').isHidden(), true);
    assert.equal(await header.getByRole('button').count(), 1);
    assert.equal(await symbol.getAttribute('icon'), 'mdi:water-boiler');
    assert.equal(await symbol.getAttribute('aria-hidden'), 'true');
    assert.equal(await status.textContent(), he ? 'כבוי' : 'Off');
    const idle = await mark();
    assert.equal(idle.heating, false);

    for (const width of [320,391]) {
      await page.setViewportSize({ width, height: 844 });
      const [glyphBox,stateBox,infoBox,scheduleBox,historyBox] = await boxFor([symbol,status,info,schedule,history]);
      assert.ok(glyphBox.x + glyphBox.width <= stateBox.x && stateBox.x + stateBox.width <= infoBox.x);
      assert.ok(scheduleBox.x < historyBox.x && Math.abs(scheduleBox.y - historyBox.y) < 1);
      assert.ok([infoBox,scheduleBox,historyBox].every(box => box.width >= 44 && box.height >= 44));
    }
    for (const tab of [schedule,history]) {
      assert.equal(await tab.evaluate(button => button.getRootNode().getElementById(button.getAttribute('aria-controls'))
        ?.getAttribute('aria-labelledby')), await tab.getAttribute('id'));
    }

    await symbol.tap();
    await status.tap();
    assert.deepEqual(await page.evaluate(() => window.fixture.moreInfo), []);
    await info.tap();
    assert.deepEqual(await page.evaluate(() => window.fixture.moreInfo), ['switch.fixture_boiler']);
    await schedule.focus();
    await page.keyboard.press('Tab');
    assert.equal(await history.evaluate(button => button.getRootNode().activeElement === button), true);
    await page.keyboard.press('Enter');
    await historyPane.waitFor();
    assert.equal(await history.getAttribute('aria-pressed'), 'true');
    await schedulePane.waitFor({ state: 'hidden' });
    await schedule.press('Enter');
    await schedulePane.waitFor();
    assert.equal(await schedule.getAttribute('aria-pressed'), 'true');
    await historyPane.waitFor({ state: 'hidden' });

    await page.evaluate(() => window.fixture.setupState('off','active'));
    await dialog.locator('button[data-action=extend_timed]').waitFor();
    assert.deepEqual(await mark(), idle, 'The icon follows the reported boiler state even when the timer reports activity');
    await page.evaluate(() => window.fixture.setupState('on','active'));
    await header.getByText(he ? 'פועל' : 'On', { exact: true }).waitFor();
    const active = await mark();
    assert.equal(active.heating,true);
    assert.equal(active.color,'rgb(255, 155, 105)');
    assert.notEqual(active.color,idle.color);
    const railStyle = () => range.evaluate(input => {
      const css = getComputedStyle(input);
      return {
        thumb: css.getPropertyValue('--timer-thumb').trim(), border: css.getPropertyValue('--timer-thumb-border').trim(),
        rail: css.getPropertyValue('--timer-rail').trim(), forcedAdjustment: css.getPropertyValue('forced-color-adjust'),
      };
    });
    const glass = await railStyle();
    assert.equal(glass.thumb,'#ff9b69');
    assert.equal(glass.border,'#20100a');
    await page.emulateMedia({ contrast:'more' });
    if (await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches)) {
      const contrast = await railStyle();
      assert.equal(contrast.thumb,glass.thumb);
      assert.notEqual(contrast.rail,glass.rail);
    }
    await page.emulateMedia({ contrast:'no-preference', forcedColors:'active' });
    if (await page.evaluate(() => matchMedia('(forced-colors: active)').matches)) {
      const { forcedAdjustment, ...colors } = await railStyle();
      assert.deepEqual(colors,{ thumb:'Highlight', border:'Canvas', rail:'CanvasText' });
      if (await page.evaluate(() => CSS.supports('forced-color-adjust','none'))) assert.equal(forcedAdjustment,'none');
      await range.press('Home');
      assert.equal(await range.inputValue(),await range.getAttribute('min'));
    }
    await page.emulateMedia({ forcedColors:'none' });
    await page.evaluate(() => window.fixture.setupState('unavailable','active'));
    await header.getByText(he ? 'לא זמין' : 'Unavailable', { exact: true }).waitFor();
    assert.deepEqual(await mark(), idle);
    assert.equal(await page.evaluate(() => window.fixture.requests.includes('call_service')), false);
  } finally {
    await page.close();
  }
}

async function assertIdleZeroBoilerDuration(browser, locale) {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, hasTouch: true, reducedMotion: 'reduce' });
  const he = locale === 'he';
  const base = 'http://127.0.0.1:' + server.address().port + '?compact&idle-zero&stacked&locale=' + locale;
  const dialog = page.getByRole('dialog', { name: 'Fixture boiler', exact: true });
  const shortcut = page.locator('[data-room=bath] .quick-button');
  const range = dialog.locator('.timer-range');
  const start = dialog.locator('[data-action=start_timed]');
  const extend = dialog.locator('[data-action=extend_timed]');
  const savedKey = 'bayit-9.timer-duration.v1:sensor.fixture_runtime';
  const input = async () => {
    await page.goto(base);
    await shortcut.tap();
    await range.waitFor();
  };
  const save = value => page.evaluate(([key,value]) => localStorage.setItem(key,value), [savedKey,value]);
  const modelState = (device,timer) => page.evaluate(([device,timer]) => window.fixture.setupState(device,timer), [device,timer]);
  const calls = () => page.evaluate(() => window.fixture.timerCalls.map(({service, service_data}) => [service,service_data.duration]));
  try {
    await input();
    assert.deepEqual(await range.evaluate(node => [node.min, node.max, node.step, node.value]), ['0', '300', '15', '300']);
    assert.equal(await dialog.locator('.timer-presets').count(), 0);

    await save('14');
    await input();
    assert.equal(await range.inputValue(), '15');
    await save('7');
    await input();
    assert.equal(await range.inputValue(), '0');
    assert.equal(await range.getAttribute('aria-valuetext'), he ? 'לא נבחר משך זמן' : 'No duration selected');
    assert.ok(await start.isDisabled());
    await start.evaluate(control => control.onclick());
    assert.deepEqual(await calls(), []);

    await range.press('ArrowUp');
    assert.equal(await range.inputValue(), '15');
    assert.ok(await start.isEnabled());
    await range.press('Home');
    assert.equal(await range.inputValue(), '0');
    assert.ok(await start.isDisabled());
    assert.equal(await page.evaluate(key => localStorage.getItem(key), savedKey), '0');

    await modelState('on','active');
    await extend.waitFor();
    assert.deepEqual(await range.evaluate(node => [node.min, node.max, node.step, node.value]), ['15','300','15','15']);
    await modelState('off','idle');
    await start.waitFor();
    assert.equal(await range.inputValue(), '0');
    assert.ok(await start.isDisabled());

    await range.press('ArrowUp');
    await start.tap();
    await page.waitForFunction(() => window.fixture.timerCalls.length === 1);
    assert.deepEqual(await calls(), [['start_timer',15]]);
    await modelState('on','active');
    await page.locator('[data-action=extend_timed]:enabled').waitFor();
    await extend.tap();
    await page.waitForFunction(() => window.fixture.timerCalls.length === 2);
    assert.deepEqual(await calls(), [['start_timer',15],['add_timer',15]]);

    const editor = he ? {
      profiles: 'שליטה בדוד ובתנורים', edit: 'עריכה', save: 'שמירת בקר',
      max: 'זמן מקסימלי בדקות', step: 'מרווח בחירה בדקות',
      option: 'אפשרות להשאיר את משך הטיימר ללא בחירה (0 דקות)',
    } : {
      profiles: 'Boiler and heater controls', edit: 'Edit', save: 'Save profile',
      max: 'Longest run in minutes', step: 'Step in minutes',
      option: 'Allow an unselected timer duration (0 minutes)',
    };
    await page.goto(base + '&editor');
    await page.getByText(editor.profiles, { exact: true }).click();
    await page.getByRole('button', { name: editor.edit, exact: true }).click();
    const option = page.getByRole('checkbox', { name: editor.option, exact: true });
    assert.ok(await option.isChecked());
    const step = page.getByLabel(editor.step, { exact: true });
    await step.fill('1');
    await option.waitFor({ state:'hidden' });
    await step.fill('15');
    const max = page.getByLabel(editor.max, { exact: true });
    await max.fill('15');
    await option.waitFor({ state:'hidden' });
    await max.fill('300');
    assert.ok(await option.isChecked());
    await option.uncheck();
    const saveProfile = page.getByRole('button', { name: editor.save, exact: true });
    await saveProfile.click();
    assert.equal(await page.evaluate(() => window.latest.profiles[0].timed.idle_zero_duration), undefined);
    await page.getByRole('button', { name: editor.edit, exact: true }).click();
    await option.check();
    await saveProfile.click();
    assert.equal(await page.evaluate(() => window.latest.profiles[0].timed.idle_zero_duration), true);
    assert.deepEqual(await calls(), []);
  } finally {
    await page.close();
  }
}

async function assertCompactBoilerHistory(browser, locale) {
  const page = await browser.newPage({viewport:{width:391,height:845},hasTouch:true,reducedMotion:'reduce'});
  const he = locale === 'he';
  const title = he ? 'היסטוריית שימוש' : 'Usage history';
  const base = 'http://127.0.0.1:' + server.address().port + '?compact&routed&history-layout&locale=' + locale;
  const route = '#device/bath/switch.fixture_boiler';
  const panel = page.getByRole('dialog',{name:'Fixture boiler',exact:true});
  try {
    await page.goto(base + '&stacked' + route);
    await panel.getByRole('button',{name:title,exact:true}).tap();
    const history = panel.getByRole('region',{name:title,exact:true});
    await history.locator('.boiler-history-row').first().waitFor();
    const durations = he ? ['35 דקות', 'שעה', '1:35 שעות', '2 שעות', '20 דקות']
      : ['35 Minutes', '1 hour', '1:35 hours', '2 hours', '20 Minutes'];
    assert.deepEqual(await history.locator('.boiler-history-length').allTextContents(), durations);
    assert.ok((await history.locator('.boiler-history-day-title').allTextContents())[2].includes(durations[2]));
    await history.focus();
    const layout = await history.evaluate(element => {
      const body = element.closest('.modal-body');
      const outer = body.scrollTop;
      element.scrollTop = element.scrollHeight;
      return {height:element.clientHeight, scrolling:element.scrollTop>0, focused:element.getRootNode().activeElement===element,
        outerUntouched:body.scrollTop===outer};
    });
    assert.deepEqual(layout,{height:154,scrolling:true,focused:true,outerUntouched:true});
    assert.equal(await page.evaluate(()=>window.fixture.requests.includes('call_service')),false);

    await page.goto(base + route);
    await panel.getByRole('button',{name:title,exact:true}).tap();
    const standardHistory = panel.locator('.boiler-history-host');
    await standardHistory.locator('.boiler-history-row').first().waitFor();
    assert.equal(await standardHistory.getAttribute('data-compact-history'),null);
    assert.ok((await standardHistory.boundingBox()).height>154);
  } finally {
    await page.close();
  }
}

async function assertBoilerScheduleLinks(browser, locale) {
  const page = await browser.newPage({viewport:{width:320,height:680},hasTouch:true,reducedMotion:'reduce'});
  page.setDefaultTimeout(8000);
  const he = locale === 'he';
  const base = 'http://127.0.0.1:' + server.address().port + '?compact&routed&schedule-link&locale=' + locale;
  const stacked = base + '&stacked&guarded-schedule';
  const regular = '#device/bath/switch.fixture_boiler';
  const panel = page.getByRole('dialog',{name:'Fixture boiler',exact:true});
  const schedule = panel.getByRole('button',{name:he ? 'תזמון' : 'Schedule',exact:true});
  const history = panel.getByRole('button',{name:he ? 'היסטוריית שימוש' : 'Usage history',exact:true});
  const morning = panel.locator('.schedule-list').getByText('Morning',{exact:true});
  const noWrite = async () =>
    assert.equal(await page.evaluate(()=>window.fixture.requests.includes('call_service')),false);
  try {
    await page.goto(stacked + regular);
    await history.tap();
    await panel.locator('.boiler-history-host').waitFor();
    assert.equal(await history.getAttribute('aria-pressed'),'true');

    await page.goto(stacked + '#former-boiler-form');
    await morning.waitFor();
    assert.equal(await schedule.getAttribute('aria-pressed'),'true');
    assert.equal(new URL(page.url()).hash,'#former-boiler-form');
    const form = panel.locator('.schedule-form');
    assert.equal(await form.isVisible(),false);
    await noWrite();

    await panel.getByRole('button',{name:he ? 'הוספת תזמון' : 'Add schedule',exact:true}).tap();
    await form.waitFor();
    await form.getByRole('button',{name:he ? 'ביטול' : 'Cancel',exact:true}).tap();
    await form.waitFor({state:'hidden'});
    await morning.waitFor();
    assert.equal(new URL(page.url()).hash,'#former-boiler-form');
    await noWrite();

    await page.goto(stacked + regular);
    await panel.locator('.boiler-history-host').waitFor();
    assert.equal(await history.getAttribute('aria-pressed'),'true');
    await page.goto(stacked + regular + '/schedule');
    await morning.waitFor();
    await page.evaluate(()=>history.back());
    await panel.locator('.boiler-history-host').waitFor();
    await noWrite();

    await page.goto(base + regular + '/schedule');
    await morning.waitFor();
    assert.equal(await schedule.getAttribute('aria-pressed'),'true');
    await panel.locator('[data-role=close]').tap();
    await panel.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).hash,'');
    await noWrite();

    for (const [url, fragment] of [
      [base + '&without-scheduler',regular + '/schedule'],
      [base + '&wrong-runtime-target',regular + '/schedule'],
      [base + '&hide-runtime',regular + '/schedule'],
      [base,'#device/monitor/switch.fixture_boiler/schedule'],
      [base,'#device/kitchen/sensor.fixture_0/schedule'],
      [base,'#device/unknown/switch.fixture_boiler/schedule'],
    ]) {
      await page.goto(url + fragment);
      await page.getByRole('button',{name:'Bath',exact:true}).waitFor();
      assert.equal(await page.getByRole('dialog').count(),0);
      assert.equal(await page.evaluate(()=>window.fixture.requests.includes('scheduler')),false);
      await noWrite();
    }
  } finally {
    await page.close();
  }
}

async function assertRoomBoilerScheduleEntry(browser, locale) {
  const he = locale === 'he';
  const page = await browser.newPage({ viewport:{width:320,height:680}, hasTouch:true, reducedMotion:'reduce' });
  page.setDefaultTimeout(8000);
  const url = 'http://127.0.0.1:' + server.address().port +
    '?routed&stacked&schedule-link&room-schedule-entry&locale=' + locale;
  const room = page.getByRole('dialog', { name:'Kitchen', exact:true });
  const details = page.getByRole('dialog', { name:'Fixture boiler', exact:true });
  const title = he ? 'תזמון' : 'Schedule';
  const boiler = room.locator('[data-entity="switch.fixture_boiler"]');
  const entry = boiler.getByRole('button', { name:'Fixture boiler · ' + title, exact:true });
  const controls = boiler.getByRole('button', { name:'Fixture boiler · ' + (he ? 'פקדי המכשיר' : 'Device controls'), exact:true });
  const body = room.locator('.modal-body');
  const route = '#device/kitchen/switch.fixture_boiler';
  const noWrite = async () => assert.equal(await page.evaluate(() => window.fixture.requests.includes('call_service')), false);
  try {
    for (const width of [320,391]) {
      await page.setViewportSize({width,height:680});
      await page.goto(url);
      await page.getByRole('button', {name:'Kitchen',exact:true}).tap();
      await entry.scrollIntoViewIfNeeded();
      const caption = entry.getByText(title, {exact:true});
      await caption.waitFor();
      assert.equal(await entry.locator('.boiler-room-entry ha-icon').getAttribute('icon'),'mdi:calendar-clock');
      assert.ok((await entry.boundingBox()).height >= 44);
      assert.equal(await boiler.locator('.device-timer').count(),1);
      const before = await body.evaluate(element => element.scrollTop);
      assert.ok(before > 0);

      await entry.tap();
      const schedule = details.getByRole('button', {name:title,exact:true});
      await details.locator('.schedule-list').getByText('Morning',{exact:true}).waitFor();
      await page.waitForURL(value => value.hash === route + '/schedule');
      assert.equal(await schedule.getAttribute('aria-pressed'),'true');
      assert.equal(await details.locator('.device-timer').count(),1);
      await noWrite();
      await details.locator('[data-role=back]').tap();
      await page.waitForURL(value => value.hash === '#room-kitchen');
      await entry.waitFor();
      assert.ok(Math.abs(await body.evaluate(element => element.scrollTop) - before) < 2);
      assert.equal(await entry.evaluate(button => button.getRootNode().activeElement === button),true);

      await entry.press('Shift+Enter');
      await page.waitForURL(value => value.hash === route);
      await details.locator('[data-role=back]').tap();
      await entry.waitFor();
      await page.evaluate(() => window.fixture.setupState('off','unavailable'));
      await controls.waitFor();
      assert.equal(await entry.count(),0);
      await controls.tap();
      await page.waitForURL(value => value.hash === route);
      await noWrite();
    }
  } finally {
    await page.close();
  }
}

async function assertClosedBoilerSchedulePreflight(browser, locale) {
  const page = await browser.newPage({viewport:{width:320,height:680},hasTouch:true,reducedMotion:'reduce'});
  page.setDefaultTimeout(8000);
  const he = locale === 'he';
  const url = 'http://127.0.0.1:' + server.address().port + '?compact&routed&stacked&guarded-schedule&locale=' + locale;
  const shortcut = page.locator('[data-room="bath"] .quick-button[data-entity="switch.fixture_boiler"]');
  const panel = page.getByRole('dialog',{name:'Fixture boiler',exact:true});
  const schedule = panel.getByRole('button',{name:he ? 'תזמון' : 'Schedule',exact:true});
  const history = panel.getByRole('button',{name:he ? 'היסטוריית שימוש' : 'Usage history',exact:true});
  const form = panel.locator('.schedule-form');
  const save = form.getByRole('button',{name:he ? 'שמירת תזמון' : 'Save schedule',exact:true});
  const list = panel.locator('.schedule-list');
  const morning = list.getByRole('button',{name:(he ? 'עריכה' : 'Edit') + ' · Morning',exact:true});
  const pause = type => page.evaluate(type=>window.fixture.pauseScheduleRead(type),type);
  const release = () => page.evaluate(() => new Promise(resolve => {
    window.fixture.releaseScheduleRead();
    setTimeout(resolve,0);
  }));
  const noWrite = () => page.evaluate(()=>window.fixture.requests.filter(request=>request === 'call_service'))
    .then(requests=>assert.deepEqual(requests,[]));
  try {
    await page.goto(url);
    await shortcut.tap();
    await morning.waitFor();
    await panel.getByRole('button',{name:he ? 'הוספת תזמון' : 'Add schedule',exact:true}).tap();
    await form.getByRole('button',{name:he ? 'כל יום' : 'Every day',exact:true}).tap();
    await form.locator('input[type=text]').fill('Cancelled creation');
    await pause('scheduler');
    await save.tap();
    await page.waitForFunction(()=>window.fixture.scheduleReadWaiting());
    await panel.locator('[data-role=close]').tap();
    await release();
    await panel.waitFor({state:'hidden'});
    await noWrite();

    await shortcut.tap();
    await morning.waitFor();
    await morning.tap();
    await form.locator('input[type=text]').fill('Cancelled edit');
    await pause('scheduler/item');
    await save.tap();
    await page.waitForFunction(()=>window.fixture.scheduleReadWaiting());
    await history.tap();
    await panel.locator('.boiler-history-host').waitFor();
    await release();
    await schedule.tap();
    await morning.waitFor();
    await form.waitFor({state:'hidden'});
    assert.equal(await list.getByText('Cancelled edit',{exact:true}).count(),0);
    await noWrite();
  } finally {
    await page.close();
  }
}

try {
  for (const [launcher, locale] of [[chromium, 'en'], [webkit, 'he']]) {
    const browser = await launcher.launch();
    try {
      for (const language of ['en', 'he']) {
        await assertDedicatedBoilerPresentation(browser, language);
        await assertSharedBoilerView(browser, language);
        await assertIdleZeroBoilerDuration(browser, language);
      }
      const routed = await browser.newPage({ viewport: { width: 375, height: 812 }, hasTouch: true });
      await routed.goto('http://127.0.0.1:' + server.address().port + '?routed&locale=' + locale);
      const routedRoom = routed.getByRole('dialog', { name: 'Kitchen', exact: true });
      const routedDetails = routedRoom.locator('[data-entity="switch.fixture_boiler"] .device-panel-launch');
      const routedBody = routedRoom.locator('.modal-body');
      await routed.getByRole('button', { name: 'Kitchen', exact: true }).tap();
      await routedDetails.scrollIntoViewIfNeeded();
      const previousScroll = await routedBody.evaluate(element => element.scrollTop);
      assert.ok(previousScroll > 0);
      await routedDetails.tap();
      await routed.waitForFunction(() => location.hash === '#device/kitchen/switch.fixture_boiler');
      await routed.getByRole('dialog', { name: 'Fixture boiler', exact: true }).locator('[data-role=back]').tap();
      await routedRoom.waitFor();
      await routed.waitForFunction(() => location.hash === '#room-kitchen');
      assert.ok(Math.abs(await routedBody.evaluate(element => element.scrollTop) - previousScroll) < 2);
      assert.equal(await routedDetails.evaluate(button => button.getRootNode().activeElement === button), true);
      const nextHash = await routed.evaluate(() => new Promise(resolve => {
        window.addEventListener('popstate', () => resolve(location.hash), { once: true });
        history.back();
      }));
      assert.equal(nextHash, '', 'The browser Back button must leave the room in one step');
      await routedRoom.waitFor({ state: 'hidden' });
      await routed.evaluate(() => history.forward());
      await routedRoom.waitFor();
      await routed.evaluate(() => history.forward());
      const reopenedBoiler = routed.getByRole('dialog', { name: 'Fixture boiler', exact: true });
      await reopenedBoiler.waitFor();
      await reopenedBoiler.locator('[data-role=back]').waitFor({ state: 'hidden' });
      await routed.close();
      await assertCompactBoilerHistory(browser, locale);
      await assertBoilerScheduleLinks(browser, locale);
      await assertRoomBoilerScheduleEntry(browser, locale);
      await assertClosedBoilerSchedulePreflight(browser, locale);

      const page = await browser.newPage({ viewport: { width: 375, height: 812 }, hasTouch: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + server.address().port + '?locale=' + locale);
      const words = locale === 'he' ? {
        details: 'פקדי המכשיר', back: 'חזרה לחדר', schedule: 'תזמון', history: 'היסטוריית שימוש', close: 'סגירה',
        backIcon: 'mdi:chevron-right',
      } : {
        details: 'Device controls', back: 'Back to room', schedule: 'Schedule', history: 'Usage history', close: 'Close',
        backIcon: 'mdi:chevron-left',
      };
      const kitchen = page.getByRole('button', { name: 'Kitchen', exact: true });
      const dialog = page.getByRole('dialog');
      const boilerRow = dialog.locator('[data-entity="switch.fixture_boiler"]');
      const details = boilerRow.getByRole('button', { name: 'Fixture boiler · ' + words.details, exact: true });
      const back = dialog.getByRole('button', { name: words.back });
      const body = dialog.locator('.modal-body');
      await kitchen.tap();
      await page.getByRole('dialog', { name: 'Kitchen', exact: true }).waitFor();
      await details.scrollIntoViewIfNeeded();
      const before = await body.evaluate(element => element.scrollTop);
      assert.ok(before > 0, 'The kitchen fixture must start scrolled');
      assert.ok((await details.boundingBox()).height >= 44);
      const powerControls = boilerRow.locator('.action-list');
      assert.ok(await powerControls.locator('button').count() > 0);
      assert.equal(await details.locator('button').count(), 0);
      const titleArea = details.locator('.device-name');
      await titleArea.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, pointerId: 7, isPrimary: true });
      await page.getByRole('dialog', { name: 'Fixture boiler', exact: true }).waitFor();
      await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { pointerType:'touch', pointerId:7 })));
      const title = dialog.getByRole('heading', { name: 'Fixture boiler', exact: true });
      await title.waitFor();
      assert.equal(await title.count(), 1);
      await dialog.locator('.device-state-head .current').waitFor();
      assert.ok((await dialog.getByRole('button', { name: words.close, exact: true }).boundingBox()).width >= 44);
      assert.equal(await back.locator('ha-icon').getAttribute('icon'), words.backIcon);
      await dialog.getByRole('button', { name: words.schedule, exact: true }).tap();
      await page.waitForFunction(() => window.fixture.requests.includes('scheduler'));
      await dialog.getByRole('button', { name: words.history, exact: true }).tap();
      await page.waitForFunction(() => window.fixture.requests.includes('history/history_during_period'));
      await back.tap();
      await page.getByRole('dialog', { name: 'Kitchen', exact: true }).waitFor();
      await dialog.getByRole('heading', { name: 'Kitchen', exact: true }).waitFor();
      assert.ok(Math.abs(await body.evaluate(element => element.scrollTop) - before) < 2);
      assert.equal(await details.evaluate(button => button.getRootNode().activeElement === button), true);
      await back.waitFor({ state: 'hidden' });

      await details.press('Shift+Enter');
      await dialog.getByRole('button', { name: words.schedule, exact: true }).waitFor();
      await dialog.getByRole('button', { name: words.close, exact: true }).tap();
      await dialog.waitFor({ state: 'hidden' });
      await page.waitForFunction(() =>
        document.querySelector('bayit-dashboard').shadowRoot.activeElement?.getAttribute('aria-label') === 'Kitchen');

      await page.locator('[data-room="bath"] .quick-button[data-entity="switch.fixture_boiler"]').tap();
      await dialog.getByRole('button', { name: words.schedule, exact: true }).waitFor();
      await back.waitFor({ state: 'hidden' });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });

      const monitor = page.locator('[data-room="monitor"]');
      await monitor.getByRole('button', { name: 'Monitor', exact: true }).tap();
      await dialog.getByRole('heading', { name: 'Monitor', exact: true }).waitFor();
      assert.equal(await details.count(), 0);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await monitor.locator('.quick-button[data-entity="switch.fixture_boiler"]').tap();
      await dialog.getByRole('heading', { name: 'Fixture boiler', exact: true }).first().waitFor();
      await dialog.getByRole('button', { name: words.schedule, exact: true }).waitFor({ state: 'hidden' });
      assert.equal(await dialog.locator('.boiler-state-head').count(), 0);
      await back.waitFor({ state: 'hidden' });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });

      const compact = await browser.newPage({ viewport: { width: 320, height: 680 }, hasTouch: true });
      const compactDialog = compact.getByRole('dialog', { name: 'Fixture boiler', exact: true });
      const shortcut = compact.locator('[data-room="bath"] .quick-button[data-entity="switch.fixture_boiler"]');
      await compact.goto('http://127.0.0.1:' + server.address().port + '?compact&locale=' + locale);
      await shortcut.tap();
      const start = compactDialog.locator('[data-action="start_timed"]');
      const stop = compactDialog.locator('[data-action="stop_timed"]');
      const off = compactDialog.locator('[data-action="turn_off"]');
      const schedule = compactDialog.getByRole('button', { name: words.schedule, exact: true });
      const history = compactDialog.getByRole('button', { name: words.history, exact: true });
      const timer = compactDialog.getByRole('button', { name: locale === 'he' ? 'טיימר' : 'Timer', exact: true });
      const timerArea = compactDialog.locator('.device-timer');
      const railStyle = () => timerArea.locator('.timer-range').evaluate(input => {
        const css = getComputedStyle(input);
        return { appearance: css.appearance, thumb: css.getPropertyValue('--timer-thumb').trim() };
      });
      await start.waitFor();
      await timer.waitFor({ state: 'hidden' });
      assert.equal(await off.count(), 0);
      assert.equal(await timerArea.getAttribute('data-compact'), '');
      const idleRail = await railStyle();
      assert.equal(idleRail.appearance, 'none');
      assert.equal(idleRail.thumb,'#ff9b69');
      assert.equal(await timerArea.locator('.timer-range').getAttribute('aria-valuetext'), locale === 'he' ? '300 דקות' : '300 Minutes');
      await compactDialog.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
      const [scheduleBox, historyBox, timerBox, startBox] = await Promise.all(
        [schedule, history, timerArea, start].map(item => item.boundingBox()));
      assert.ok(scheduleBox.height >= 44 && historyBox.height >= 44 && startBox.height >= 44);
      assert.ok(Math.abs(scheduleBox.y - historyBox.y) < 1 && scheduleBox.y >= timerBox.y + timerBox.height);

      const activeFill = control => control.evaluate(button => {
        const style = getComputedStyle(button);
        const canvas = document.createElement('canvas');
        const pixels = canvas.getContext('2d');
        pixels.fillStyle = style.backgroundColor;
        pixels.fillRect(0, 0, 1, 1);
        return { rgba: [...pixels.getImageData(0, 0, 1, 1).data], radius: style.borderTopLeftRadius };
      });
      await schedule.tap();
      await timer.waitFor();
      await start.waitFor({ state: 'hidden' });
      const selectedTab = await activeFill(schedule);
      assert.equal(selectedTab.radius, '8px');
      assert.ok(selectedTab.rgba[0] > 240 && selectedTab.rgba[1] < 170 && selectedTab.rgba[3] >= 34);
      assert.ok((await activeFill(history)).rgba[3] < 16);
      await history.tap();
      await compact.waitForFunction(() => window.fixture.requests.includes('history/history_during_period'));
      await timer.tap();
      await start.waitFor();
      assert.equal(await schedule.evaluate(button => button.getRootNode().activeElement === button), true);

      await compact.evaluate(() => window.fixture.setupState('on', 'active'));
      await stop.waitFor();
      const stopFill = (await activeFill(stop)).rgba;
      assert.ok(stopFill[0] > 240 && stopFill[1] < 170 && stopFill[3] >= 54);
      const extend = compactDialog.locator('[data-action="extend_timed"]');
      await extend.waitFor();
      assert.equal(await timerArea.getAttribute('data-compact'), '');
      assert.deepEqual(await railStyle(), idleRail);
      assert.equal(await timerArea.locator('.timer-range').getAttribute('aria-valuetext'), locale === 'he' ? '300 דקות' : '300 Minutes');
      const [activeSlider, activeExtend, activeStop] = await Promise.all(
        [timerArea.locator('.timer-range'), extend, stop].map(item => item.boundingBox()));
      assert.ok([activeSlider, activeExtend, activeStop].every(bounds => bounds.width >= 44 && bounds.height >= 44));
      assert.ok(activeSlider.x < activeExtend.x && activeExtend.x < activeStop.x);
      await compact.clock.setFixedTime(new Date('2026-11-25T15:30:00Z'));
      const clockText = timerArea.locator('.timer-clock');
      const usageText = timerArea.locator('.timer-usage');
      for (const [showSeconds, remaining, usage] of [
        [false, /^00:02$/, /01:30$/],
        [true, /^00:02:00$/, /01:30:25$/],
        [undefined, /^02:00$/, /1:30:26$/],
      ]) {
        await compact.evaluate(showSeconds => window.fixture.setupState('on', 'active', { showSeconds, usedSeconds: 5425.4 }), showSeconds);
        await clockText.filter({ hasText: remaining }).waitFor();
        await usageText.filter({ hasText: usage }).waitFor();
      }
      await compact.evaluate(() => window.fixture.setupState('off', 'unavailable'));
      await off.waitFor();
      assert.equal(await start.count(), 0);
      await compact.evaluate(() => window.fixture.setupState('off', 'idle'));
      await start.waitFor();
      assert.equal(await off.count(), 0);
      assert.deepEqual(await railStyle(), idleRail);
      await compact.evaluate(() => window.fixture.setupState('unknown', 'idle'));
      await start.waitFor({ state: 'detached' });
      assert.equal(await off.count(), 0);
      assert.equal(await compact.evaluate(() => window.fixture.requests.includes('call_service')), false);

      await compact.goto('http://127.0.0.1:' + server.address().port + '?untimed&locale=' + locale);
      await shortcut.tap();
      await timer.waitFor();
      await off.waitFor();
      assert.equal(await timerArea.count(), 0);
      assert.equal(await compact.evaluate(() => window.fixture.requests.includes('call_service')), false);
      await compact.close();

      const stackedPage = await browser.newPage({ viewport: { width: 320, height: 680 }, hasTouch: true });
      const stackedUrl = 'http://127.0.0.1:' + server.address().port + '?compact&stacked&locale=' + locale;
      const stackedShortcut = stackedPage.locator('[data-room="bath"] .quick-button[data-entity="switch.fixture_boiler"]');
      const stackedDialog = stackedPage.getByRole('dialog', { name: 'Fixture boiler', exact: true });
      const stackedStart = stackedDialog.locator('[data-action="start_timed"]');
      const stackedSchedule = stackedDialog.getByRole('button', { name: words.schedule, exact: true });
      const stackedHistory = stackedDialog.getByRole('button', { name: words.history, exact: true });
      const stackedRange = stackedDialog.locator('.timer-range');
      const scheduleRows = stackedDialog.locator('.schedule-list');
      const historyPane = stackedDialog.locator('.boiler-history-host');
      await stackedPage.goto(stackedUrl);
      await stackedShortcut.tap();
      await stackedStart.waitFor();
      await scheduleRows.waitFor();
      await scheduleRows.getByText('Morning', { exact: true }).waitFor();
      await scheduleRows.getByText('Evening', { exact: true }).waitFor();
      assert.equal(await stackedSchedule.getAttribute('aria-pressed'), 'true');
      const [railBox, scheduleLink, historyLink] = await stackedDialog.evaluate(dialog => {
        const box = selector => {
          const item = dialog.querySelector(selector);
          const bounds = item.getBoundingClientRect();
          return { y: bounds.y, bottom: bounds.bottom, height: item.offsetHeight };
        };
        return [box('.device-timer'), box('.boiler-tabs button:first-child'), box('.boiler-tabs button:last-child')];
      });
      assert.ok(railBox.bottom <= scheduleLink.y && Math.abs(scheduleLink.y - historyLink.y) < 1);
      assert.ok(scheduleLink.height >= 44 && historyLink.height >= 44);
      assert.equal(await historyPane.isHidden(), true);
      assert.equal(await stackedDialog.locator('.boiler-tabs button').count(), 2);
      await stackedRange.press('ArrowLeft');
      const duration = await stackedRange.inputValue();
      assert.equal(duration, '299');
      await stackedHistory.tap();
      await stackedPage.waitForFunction(() => window.fixture.requests.includes('history/history_during_period'));
      await historyPane.waitFor();
      assert.equal(await stackedStart.isVisible(), true);
      assert.equal(await stackedRange.inputValue(), duration);
      assert.equal(await stackedHistory.getAttribute('aria-pressed'), 'true');
      await scheduleRows.waitFor({ state: 'hidden' });

      await stackedDialog.getByRole('button', { name: words.close, exact: true }).tap();
      await stackedDialog.waitFor({ state: 'hidden' });
      await stackedShortcut.tap();
      await historyPane.waitFor();
      assert.equal(await stackedStart.isVisible(), true);
      await stackedSchedule.tap();
      await scheduleRows.waitFor();
      await stackedPage.goto(stackedUrl + '&without-scheduler');
      await stackedShortcut.tap();
      await historyPane.waitFor();
      assert.equal(await stackedSchedule.count(), 0);
      assert.equal(await stackedStart.isVisible(), true);
      await stackedPage.goto(stackedUrl);
      await stackedShortcut.tap();
      await scheduleRows.waitFor();
      assert.equal(await stackedSchedule.getAttribute('aria-pressed'), 'true');
      assert.equal(await stackedPage.evaluate(() => window.fixture.requests.includes('call_service')), false);

      await stackedPage.goto(stackedUrl + '&schedule-actions');
      await stackedShortcut.tap();
      const edit = scheduleRows.getByRole('button', { name: (locale === 'he' ? 'עריכה' : 'Edit') + ' · Morning', exact: true });
      const scheduleSwitch = scheduleRows.getByRole('switch', {
        name: (locale === 'he' ? 'מצב התזמון' : 'Schedule status') + ' · Morning', exact: true,
      });
      await scheduleSwitch.waitFor();
      assert.equal(await scheduleSwitch.getAttribute('aria-checked'), 'true');
      await stackedDialog.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
      const [editBox, switchBox] = await Promise.all([edit.boundingBox(), scheduleSwitch.boundingBox()]);
      assert.ok(editBox.height >= 44 && switchBox.height >= 44 && switchBox.width >= 44);
      assert.ok(Math.abs(editBox.y - switchBox.y) < 1, 'The edit and status controls share a row');
      await edit.tap();
      const form = stackedDialog.locator('.schedule-form');
      await form.waitFor();
      assert.equal(await form.locator('input[type="text"]').inputValue(), 'Morning');
      assert.equal(await form.locator('input[type="time"]').inputValue(), '07:30');
      await form.getByRole('button', { name: locale === 'he' ? 'ביטול' : 'Cancel', exact: true }).tap();
      await form.waitFor({ state: 'hidden' });
      assert.deepEqual(await stackedPage.evaluate(() => window.fixture.scheduleCalls), []);
      await scheduleSwitch.tap();
      await scheduleRows.getByRole('switch', { name: /Morning/, checked: false }).waitFor();
      assert.deepEqual(await stackedPage.evaluate(() => window.fixture.scheduleCalls), [
        { type: 'call_service', domain: 'switch', service: 'turn_off', service_data: {},
          target: { entity_id: 'switch.schedule_fixture0' } },
      ]);

      // Enough rows to put the inline editor well below the trigger at a phone viewport.
      await stackedPage.goto(stackedUrl + '&guarded-schedule&routed');
      await stackedShortcut.tap();
      await scheduleRows.getByText('Fixture schedule 9', { exact: true }).waitFor();
      await stackedDialog.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
      const english = locale === 'en';
      const dialogViewport = stackedDialog.locator('.modal-body');
      const rootScroll = () => stackedDialog.evaluate(node => [window.scrollY, node.getRootNode().querySelector('.room-scroll').scrollTop]);
      const focused = node => node.getRootNode().activeElement === node;
      const startingPageScroll = await rootScroll();
      const add = stackedDialog.getByRole('button', { name: english ? 'Add schedule' : 'הוספת תזמון', exact: true });
      const heading = form.getByRole('heading');
      const choices = form.locator('select');
      const cancel = form.getByRole('button', { name: english ? 'Cancel' : 'ביטול', exact: true });
      const save = form.getByRole('button', { name: english ? 'Save schedule' : 'שמירת תזמון', exact: true });
      async function openScheduleForm(trigger) {
        await trigger.scrollIntoViewIfNeeded();
        const start = await dialogViewport.evaluate(node => node.scrollTop);
        await trigger.tap();
        await heading.waitFor();
        assert.equal(await heading.evaluate(focused), true, 'Opening a form focuses its heading without a software keyboard');
        assert.equal(await heading.evaluate(node => {
          const heading = node.getBoundingClientRect();
          const body = node.closest('.modal-body').getBoundingClientRect();
          return heading.top >= body.top && heading.bottom <= body.bottom;
        }), true, 'The form heading is inside the visible dialog immediately after tapping');
        assert.ok(await dialogViewport.evaluate(node => node.scrollTop) > start);
        assert.deepEqual(await rootScroll(), startingPageScroll);
        return start;
      }
      async function expectFormReturn(trigger) {
        await form.waitFor({ state: 'hidden' });
        await trigger.waitFor();
        await stackedPage.waitForFunction(selector => {
          const root = document.querySelector('bayit-dashboard').shadowRoot;
          return root.activeElement?.matches(selector);
        }, await trigger.evaluate(node => node.getAttribute('aria-label')
          ? 'button[aria-label=' + JSON.stringify(node.getAttribute('aria-label')) + ']' : 'button.schedule-add'));
        assert.equal(await trigger.evaluate(focused), true);
        assert.equal(await trigger.evaluate(node => {
          const control = node.getBoundingClientRect();
          const body = node.closest('.modal-body').getBoundingClientRect();
          return control.top >= body.top - 1 && control.bottom <= body.bottom + 1;
        }), true, 'The originating control is revealed again');
        assert.deepEqual(await rootScroll(), startingPageScroll);
      }
      await openScheduleForm(add);
      assert.deepEqual(await choices.locator('option').evaluateAll(nodes => nodes.map(node => Number(node.value))),
        Array.from({ length: 20 }, (_, index) => (index + 1) * 15));
      assert.equal(await choices.inputValue(), '90');
      await cancel.tap();
      await expectFormReturn(add);
      assert.deepEqual(await stackedPage.evaluate(() => window.fixture.scheduleCalls), []);

      await openScheduleForm(edit);
      assert.equal(await choices.inputValue(), '30');
      await cancel.tap();
      await expectFormReturn(edit);
      await openScheduleForm(edit);
      await choices.selectOption('45');
      await save.tap();
      await expectFormReturn(edit);
      assert.equal(await stackedPage.evaluate(() => window.fixture.scheduleCalls[0].service_data.duration), 45);
      await openScheduleForm(add);
      await form.locator('input[type=text]').fill('New fixture');
      await choices.selectOption('15');
      await form.getByRole('button', { name: english ? 'Every day' : 'כל יום', exact: true }).tap();
      await save.tap();
      await expectFormReturn(add);
      await scheduleRows.getByText('New fixture', { exact: true }).waitFor();
      assert.deepEqual(await stackedPage.evaluate(() => window.fixture.scheduleCalls.map(({ domain, service, service_data }) =>
        [domain, service, service_data.schedule_entity, service_data.duration])), [
        ['script', 'fixture_schedule_save', 'switch.schedule_fixture0', 45], ['script', 'fixture_schedule_save', '', 15],
      ]);
      assert.equal(await stackedRange.getAttribute('step'), '1');

      const midListEdit = scheduleRows.getByRole('button', {
        name: (english ? 'Edit' : 'עריכה') + ' · Fixture schedule 6', exact: true,
      });
      const previousBoilerScroll = Math.round(await openScheduleForm(midListEdit));
      assert.ok(previousBoilerScroll > 0);
      const closeBoiler = stackedDialog.getByRole('button', { name: words.close, exact: true });
      await closeBoiler.tap();
      await stackedDialog.waitFor({ state: 'hidden' });
      const savedBoilerScroll = await stackedPage.evaluate(() => {
        const key = Object.keys(sessionStorage).find(key => key.startsWith('bayit-9.popup-scroll.v1:')
          && key.includes('#device/bath/switch.fixture_boiler'));
        return Number(sessionStorage.getItem(key));
      });
      assert.equal(savedBoilerScroll, previousBoilerScroll, 'Dismissing a draft keeps the pre-editor scroll offset');
      await stackedPage.evaluate(() => window.fixture.pauseScheduleRead());
      await stackedShortcut.tap();
      await stackedPage.waitForFunction(() => window.fixture.scheduleReadWaiting());
      const beforeRead = await dialogViewport.evaluate(node => node.scrollHeight - node.clientHeight);
      assert.ok(beforeRead < previousBoilerScroll, 'The modal cannot reach the saved offset before schedule rows load');
      await stackedPage.evaluate(() => window.fixture.releaseScheduleRead());
      await scheduleRows.getByText('New fixture', { exact: true }).waitFor();
      try {
        await stackedPage.waitForFunction(expected => {
          const viewport = document.querySelector('bayit-dashboard').shadowRoot.querySelector('dialog[open] .modal-body');
          return viewport && Math.abs(viewport.scrollTop - expected) < 1;
        }, previousBoilerScroll, { timeout: 3000 });
      } catch (error) {
        const details = await stackedDialog.evaluate(dialog => {
          const { scrollTop, scrollHeight, clientHeight } = dialog.querySelector('.modal-body');
          return { route: location.hash, scrollTop, scrollHeight, clientHeight };
        });
        throw new Error('Expected reopened boiler offset ' + previousBoilerScroll + ' but observed ' +
          JSON.stringify(details), { cause: error });
      }

      const editorWords = locale === 'he' ? {
        profiles: 'שליטה בדוד ובתנורים', edit: 'עריכה', save: 'שמירת בקר',
        option: 'הצגת טיימר הדוד לצד התזמון או ההיסטוריה', kind: 'סוג בקר',
      } : {
        profiles: 'Boiler and heater controls', edit: 'Edit', save: 'Save profile',
        option: 'Show the boiler timer with schedule or history', kind: 'Control profile',
      };
      await stackedPage.goto(stackedUrl + '&editor');
      await stackedPage.getByText(editorWords.profiles, { exact: true }).click();
      await stackedPage.getByRole('button', { name: editorWords.edit, exact: true }).click();
      const layout = stackedPage.getByRole('checkbox', { name: editorWords.option, exact: true });
      await layout.waitFor();
      assert.equal(await layout.isChecked(), true);
      await layout.uncheck();
      await stackedPage.getByRole('button', { name: editorWords.save, exact: true }).click();
      assert.equal(await stackedPage.evaluate(() => window.latest.profiles[0].boiler_timer_with_details), undefined);
      await stackedPage.getByRole('button', { name: editorWords.edit, exact: true }).click();
      await layout.check();
      await stackedPage.getByRole('button', { name: editorWords.save, exact: true }).click();
      assert.equal(await stackedPage.evaluate(() => window.latest.profiles[0].boiler_timer_with_details), true);
      await stackedPage.getByRole('button', { name: editorWords.edit, exact: true }).click();
      await stackedPage.getByLabel(editorWords.kind, { exact: true }).selectOption('heater');
      await layout.waitFor({ state: 'hidden' });
      await stackedPage.getByRole('button', { name: editorWords.save, exact: true }).click();
      assert.equal(await stackedPage.evaluate(() => window.latest.profiles[0].boiler_timer_with_details), undefined);
      assert.equal(await stackedPage.evaluate(() => window.fixture.requests.includes('call_service')), false);
      await stackedPage.close();

      const { requests, moreInfo } = await page.evaluate(() => window.fixture);
      assert.equal(requests.includes('call_service'), false);
      assert.deepEqual(moreInfo, []);
      assert.deepEqual(errors, []);
      console.log(launcher.name() + ' at 320–375 px: compact idle boiler, guarded states, combined timer with schedule/history, saved editor option and zero power calls');
    } finally { await browser.close(); }
  }
} finally { server.close(); }
