import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));

const fixture = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<script type="module">import "/dashboard.js";(' + function () {
    const locale = new URL(location.href).searchParams.get('locale');
    const boiler = { entity: 'switch.fixture_boiler', name: 'Fixture boiler', kind: 'boiler',
      timed: { simple_timer_entity: 'sensor.fixture_runtime', min_minutes: 15, max_minutes: 60, step_minutes: 15 } };
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
    const requests = [];
    const moreInfo = [];
    const card = document.createElement('bayit-dashboard');
    card.setConfig({ locale, rooms: [
      { id: 'kitchen', name: 'Kitchen', entities: [...sensors, boiler], shortcuts: [] },
      { id: 'bath', name: 'Bath', entities: [boiler], shortcuts: [boiler.entity] },
      { id: 'monitor', name: 'Monitor', entities: [{ ...boiler, role: 'status' }], shortcuts: [boiler.entity] },
    ] });
    card.hass = {
      user: { is_admin: true }, states, services: { scheduler: { add: {} }, simple_timer: { start_timer: {} } },
      callWS(request) { requests.push(request.type); return Promise.resolve(request.type === 'history/history_during_period' ? {} : []); },
    };
    card.addEventListener('hass-more-info', event => moreInfo.push(event.detail.entityId));
    document.body.append(card);
    window.fixture = { requests, moreInfo };
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

try {
  for (const [launcher, locale] of [[chromium, 'en'], [webkit, 'he']]) {
    const browser = await launcher.launch();
    try {
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
      const details = dialog.locator('[data-entity="switch.fixture_boiler"]').getByRole('button', { name: words.details });
      const back = dialog.getByRole('button', { name: words.back });
      const body = dialog.locator('.modal-body');
      await kitchen.tap();
      await page.getByRole('dialog', { name: 'Kitchen', exact: true }).waitFor();
      await details.scrollIntoViewIfNeeded();
      const before = await body.evaluate(element => element.scrollTop);
      assert.ok(before > 0, 'The kitchen fixture must start scrolled');
      await details.tap();
      await page.getByRole('dialog', { name: 'Fixture boiler', exact: true }).waitFor();
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

      await details.tap();
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

      const { requests, moreInfo } = await page.evaluate(() => window.fixture);
      assert.equal(requests.includes('call_service'), false);
      assert.deepEqual(moreInfo, []);
      assert.deepEqual(errors, []);
      console.log(launcher.name() + ' at 375 px: kitchen boiler tabs, Back restores scroll and focus, Close and home shortcut unchanged, status-only stays read-only');
    } finally { await browser.close(); }
  }
} finally { server.close(); }
