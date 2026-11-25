import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));

const fixture = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<script type="module">import "/dashboard.js";(' + function () {
    const params = new URL(location.href).searchParams;
    const locale = params.get('locale');
    const guardedSchedule = params.has('guarded-schedule');
    const timing = params.has('compact') ? { min_minutes: 1, max_minutes: 300, step_minutes: 1, presets: [] }
      : { min_minutes: 15, max_minutes: 60, step_minutes: 15 };
    const boiler = { entity: 'switch.fixture_boiler', name: 'Fixture boiler', kind: 'boiler',
      ...(params.has('stacked') && { boiler_timer_with_details: true }),
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
    const moreInfo = [];
    const scheduleActions = params.has('schedule-actions') || guardedSchedule;
    const scheduleCalls = [];
    let pausedScheduleRead;
    let releaseScheduleRead;
    const card = document.createElement('bayit-dashboard');
    card.setConfig({ locale, page: params.has('routed'),
      ...(params.has('hide-runtime') && {hidden_entities:['sensor.fixture_runtime']}),
      popup_aliases:{ '#former-boiler-form':'#device/bath/switch.fixture_boiler/schedule' }, rooms: [
      { id: 'kitchen', name: 'Kitchen', entities: [...sensors, boiler], shortcuts: [] },
      { id: 'bath', name: 'Bath', entities: [boiler], shortcuts: [boiler.entity] },
      { id: 'monitor', name: 'Monitor', entities: [{ ...boiler, role: 'status' }], shortcuts: [boiler.entity] },
    ] });
    const services = { simple_timer: { start_timer: {} } };
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
    const hass = {
      user: { is_admin: true }, states, services,
      callWS(request) {
        requests.push(request.type);
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
        return Promise.resolve(request.type === 'history/history_during_period' ? {} : []);
      },
    };
    card.hass = hass;
    card.addEventListener('hass-more-info', event => moreInfo.push(event.detail.entityId));
    if (params.has('editor')) {
      const editor = document.createElement('bayit-9-strategy-editor');
      editor.setConfig({ type: 'custom:bayit-9', locale, profiles: [boiler] });
      editor.hass = hass;
      editor.addEventListener('config-changed', event => { window.latest = event.detail.config; });
      document.body.append(editor);
    } else document.body.append(card);
    window.fixture = {
      requests, moreInfo, scheduleCalls,
      pauseScheduleRead(type = 'scheduler') { pausedScheduleRead = type; },
      scheduleReadWaiting() { return Boolean(releaseScheduleRead); },
      releaseScheduleRead() {
        releaseScheduleRead();
        releaseScheduleRead = undefined;
      },
      setupState(deviceState, timerState) {
        states[boiler.entity] = { state: deviceState, attributes: {} };
        states['sensor.fixture_runtime'] = {
          state: timerState === 'unavailable' ? 'unavailable' : '0',
          attributes: {
            entry_id: 'fixture-runtime', switch_entity_id: boiler.entity, timer_state: timerState,
            timer_finishes_at: new Date(Date.now() + 120000).toISOString(),
            device_active: deviceState === 'on',
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
      await assertBoilerScheduleLinks(browser, locale);
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
      await start.waitFor();
      await timer.waitFor({ state: 'hidden' });
      assert.equal(await off.count(), 0);
      assert.equal(await timerArea.getAttribute('data-compact'), '');
      assert.equal(await timerArea.locator('.timer-range').getAttribute('aria-valuetext'), locale === 'he' ? '300 דקות' : '300 Minutes');
      await compactDialog.evaluate(node => Promise.allSettled(node.getAnimations().map(animation => animation.finished)));
      const [scheduleBox, historyBox, timerBox, startBox] = await Promise.all(
        [schedule, history, timerArea, start].map(item => item.boundingBox()));
      assert.ok(scheduleBox.height >= 44 && historyBox.height >= 44 && startBox.height >= 44);
      assert.ok(Math.abs(scheduleBox.y - historyBox.y) < 1 && scheduleBox.y >= timerBox.y + timerBox.height);

      await schedule.tap();
      await timer.waitFor();
      await start.waitFor({ state: 'hidden' });
      await history.tap();
      await compact.waitForFunction(() => window.fixture.requests.includes('history/history_during_period'));
      await timer.tap();
      await start.waitFor();
      assert.equal(await schedule.evaluate(button => button.getRootNode().activeElement === button), true);

      await compact.evaluate(() => window.fixture.setupState('on', 'active'));
      await stop.waitFor();
      assert.equal(await timerArea.getAttribute('data-compact'), null);
      await compact.evaluate(() => window.fixture.setupState('off', 'unavailable'));
      await off.waitFor();
      assert.equal(await start.count(), 0);
      await compact.evaluate(() => window.fixture.setupState('off', 'idle'));
      await start.waitFor();
      assert.equal(await off.count(), 0);
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
