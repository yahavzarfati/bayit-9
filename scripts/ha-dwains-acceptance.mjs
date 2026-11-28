// Exercise the installed bundle against a fresh, marker-protected Home Assistant Core test instance.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
import { connect, fixtureOrigin, onboard, poll, RESOURCE_URL } from './ha-acceptance-provision.mjs';

const homes = {
  'rental-flat': {
    locale: 'en', layout: 'classic', mainFloor: 'Ground floor', otherFloor: 'Ground floor',
    room: 'Fixture den', renamed: 'Fixture reading room', otherRoom: 'Fixture kitchen',
    devices: ['Fixture floor lamp', 'Fixture ceiling light', 'Fixture reading light', 'Fixture kitchen light'],
    alias: 'bedside globe', domain: 'light', service: 'turn_on', prepare: 'turn_off', initial: 'off', active: 'on',
    appearance: 'Appearance', setup: 'Customize home', rooms: 'Rooms', picker: 'Room to customize',
    management: 'Manage rooms',
    displayName: 'Room display name', contents: 'Room contents', hide: 'Hide device', restore: 'Show device',
    save: 'Save dashboard', close: 'Close', finder: 'Find rooms and devices', search: 'Search rooms and devices',
    group: 'Turn on room lights', confirmTitle: 'Confirm action', confirm: 'Confirm', cancel: 'Cancel',
  },
  'garden-house': {
    locale: 'he', layout: 'header', mainFloor: 'קומת קרקע', otherFloor: 'קומה עליונה',
    room: 'מרפסת בדיקה', renamed: 'מרפסת קדמית לבדיקה', otherRoom: 'חדר בדיקה למעלה',
    devices: ['תריס חזית בבדיקה', 'תריס צד בבדיקה', 'וילון מעקה בבדיקה', 'גגון בבדיקה', 'דלת מוסך בבדיקה'],
    alias: 'מסך ירוק', domain: 'cover', service: 'open_cover', prepare: 'close_cover', initial: 'closed', active: 'open',
    appearance: 'מראה', setup: 'התאמת הבית', rooms: 'חדרים', picker: 'חדר להתאמה אישית',
    management: 'ניהול חדרים',
    displayName: 'שם החדר לתצוגה', contents: 'תכולת החדר', hide: 'הסתרת מכשיר', restore: 'הצגת מכשיר',
    save: 'שמירת הדשבורד', close: 'סגירה', finder: 'חיפוש חדרים ומכשירים', search: 'חיפוש חדר או מכשיר',
    group: 'פתיחת תריסים בחדר', confirmTitle: 'אישור פעולה', confirm: 'אישור', cancel: 'ביטול',
  },
};
const { values } = parseArgs({ options: { home: { type: 'string' } } });
const key = values.home;
assert.ok(Object.hasOwn(homes, key), 'Select --home rental-flat or --home garden-house');
const home = homes[key];
const base = fixtureOrigin(process.env.BAYIT_QA_URL);
const tokens = await onboard(base, process.env.BAYIT_QA_MARKER);
const api = await connect(base, tokens.access_token);
let dashboardPath = 'bayit-dwains-' + key;
const issues = [];
const protocolErrors = [];
const results = resolve(process.env.BAYIT_QA_RESULTS ?? 'test-results/ha-dwains-acceptance', key);
let browser;
let page;

const list = (kind) => api.command('config/' + kind + '_registry/list');
const getStates = async () => new Map((await api.command('get_states')).map(item => [item.entity_id, item]));
const readConfig = () => api.command('lovelace/config', { url_path: dashboardPath, force: true });

async function seedHome() {
  const createFloor = (name, level) => api.command('config/floor_registry/create', { name, level });
  const mainFloor = await createFloor(home.mainFloor, 0);
  const otherFloor = home.otherFloor === home.mainFloor ? mainFloor : await createFloor(home.otherFloor, 1);
  const createRoom = (name, floor) => api.command('config/area_registry/create', { name, floor_id: floor.floor_id });
  const mainRoom = await createRoom(home.room, mainFloor);
  const otherRoom = await createRoom(home.otherRoom, otherFloor);
  assert.notEqual(mainRoom.area_id, otherRoom.area_id);
  assert.equal(mainRoom.floor_id, mainFloor.floor_id);
  assert.equal(otherRoom.floor_id, otherFloor.floor_id);

  const entries = await poll('registered native demo devices', async () => {
    const states = await getStates();
    const registered = (await list('entity')).filter(item => item.platform === 'demo' &&
      item.entity_id.startsWith(home.domain + '.') && !item.hidden_by && !item.disabled_by &&
      states.has(item.entity_id));
    const find = (domain, index) => registered.find(item => item.unique_id === domain + '_' + index);
    const selected = (home.domain === 'light' ? [1, 2, 3, 4] : [1, 2, 3, 5, 4]).map(index => find(home.domain, index));
    return selected.every(Boolean) && selected;
  }, { timeout: 90000 });
  const [first, second, late, other, excluded] = entries;
  const ids = entries.map(item => item.entity_id);
  assert.equal(new Set(ids).size, home.devices.length);
  for (const [index, item] of entries.entries()) {
    await api.command('config/entity_registry/update', {
      entity_id: item.entity_id, name: home.devices[index],
      area_id: index === 2 || index === 3 ? otherRoom.area_id : mainRoom.area_id,
      ...(index === 2 && { aliases: [home.alias] }),
      ...(home.domain === 'cover' && index < 3 && { device_class: index === 2 ? 'curtain' : 'shutter' }),
    });
  }
  // One initial device and the later arrival inherit their area from the native device registry.
  async function moveDevice(entry, area) {
    assert.ok(entry.device_id, 'Expected a registered demo device for ' + entry.entity_id);
    await api.command('config/device_registry/update', { device_id: entry.device_id, area_id: area.area_id });
    await api.command('config/entity_registry/update', { entity_id: entry.entity_id, area_id: null });
  }
  await moveDevice(first, mainRoom);
  await moveDevice(late, otherRoom);
  const controllable = [first.entity_id, second.entity_id, late.entity_id];
  await api.command('call_service', { domain: home.domain, service: home.prepare, service_data: {},
    target: { entity_id: controllable } });
  await poll('demo devices to start inactive', async () => {
    const states = await getStates();
    return controllable.every(id => states.get(id)?.state === home.initial);
  });
  return { mainRoom, otherRoom, first, second, late, other, excluded, moveDevice };
}

try {
  if (process.env.BAYIT_QA_HA_VERSION) assert.equal(api.version, process.env.BAYIT_QA_HA_VERSION);
  await poll('Home Assistant Core to finish starting', async () => (await api.command('get_config')).state === 'RUNNING',
    { timeout: 180000 });
  const services = await api.command('get_services');
  for (const action of [home.prepare, home.service]) {
    assert.ok(Object.hasOwn(services[home.domain] ?? {}, action), 'Core omitted the required ' + home.domain + '.' + action);
  }
  const fixture = await seedHome();
  const bundle = await fetch(base + RESOURCE_URL, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  assert.ok(bundle.ok, 'The committed bundle must be installed in the fixture www folder');
  assert.deepEqual(Buffer.from(await bundle.arrayBuffer()), await readFile(new URL('../dist/bayit-9.js', import.meta.url)));
  const resources = await api.command('lovelace/resources');
  assert.ok(!resources.some(resource => resource.url === RESOURCE_URL), 'Expected a fresh module registry');
  await api.command('lovelace/resources/create', { res_type: 'module', url: RESOURCE_URL });
  if (key === 'garden-house') {
    await api.command('lovelace/dashboards/create', { url_path: dashboardPath, title: 'Bayit Dwains Acceptance', show_in_sidebar: true });
    const strategy = { type: 'custom:bayit-9', locale: home.locale, layout: home.layout, show_unassigned: false };
    await api.command('lovelace/config/save', { url_path: dashboardPath, config: { strategy } });
    assert.deepEqual((await readConfig()).strategy, strategy);
  }

  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: home.locale, hasTouch: true,
    isMobile: true, reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).origin === base
    ? route.continue() : route.abort());
  await context.addInitScript(({ origin, credentials }) => {
    if (location.origin !== origin) return;
    localStorage.setItem('hassTokens', JSON.stringify(credentials));
    const send = WebSocket.prototype.send;
    window.bayitAcceptanceCalls = [];
    WebSocket.prototype.send = function (body) {
      if (typeof body === 'string' && body.includes('"call_service"')) {
        const { type, domain, service, target } = JSON.parse(body);
        if (type === 'call_service') window.bayitAcceptanceCalls.push({ domain, service, entity: target?.entity_id });
      }
      return send.call(this, body);
    };
  }, { origin: base, credentials: tokens });
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('websocket', socket => {
    socket.on('socketerror', error => protocolErrors.push(error));
    socket.on('framereceived', ({ payload }) => {
      if (typeof payload !== 'string' || !payload.includes('"success":false')) return;
      let decoded;
      try { decoded = JSON.parse(payload); } catch { return; }
      for (const packet of Array.isArray(decoded) ? decoded : [decoded]) {
        if (packet.type === 'result' && packet.success === false && protocolErrors.length < 20) {
          protocolErrors.push(packet.error?.code + ': ' + packet.error?.message);
        }
      }
    });
  });
  page.setDefaultTimeout(12000);
  if (key === 'rental-flat') {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(base + '/config/lovelace/dashboards', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Add dashboard', exact: true }).click();
    const picker = page.locator('ha-dialog-new-dashboard');
    await picker.getByText('Community dashboards', { exact: true }).waitFor();
    await picker.locator('dashboard-card').filter({ hasText: 'Bayit 9' }).click();
    await page.locator('dialog-lovelace-dashboard-detail').getByRole('button', { name: 'Create', exact: true }).click();
    dashboardPath = await poll('dashboard created through the Home Assistant picker', async () => {
      const dashboards = await api.command('lovelace/dashboards/list');
      const found = dashboards.find(item => item.title === 'Bayit 9' && item.mode === 'storage');
      if (!found) return false;
      try {
        const saved = await api.command('lovelace/config', { url_path: found.url_path, force: true });
        return saved.strategy?.type === 'custom:bayit-9' && found.url_path;
      } catch (error) {
        if (!/not_found|config_not/.test(error.message)) throw error;
        return false;
      }
    });
    assert.match(dashboardPath, /^[a-z0-9_-]+$/);
    assert.equal((await readConfig()).strategy.room_overrides, undefined);
    console.log('Native Community dashboards picker created ' + dashboardPath);
    await page.setViewportSize({ width: 390, height: 844 });
  }
  const target = base + '/' + dashboardPath + '/home';
  const card = page.locator('bayit-dashboard');
  const button = (name, scope = card) => scope.getByRole('button', { name, exact: true });
  const dialog = name => card.getByRole('dialog', { name, exact: true });
  const roomDevice = (room, entry) => room.locator('.device[data-entity="' + entry.entity_id + '"]');
  async function toggleVisibility(editor, entry, action) {
    // Home Assistant can prefix a custom entity name with its device name.
    const control = editor.locator('button[data-room-focus="room-contents:' + entry.entity_id + ':visibility"]');
    await control.waitFor();
    assert.ok((await control.getAttribute('aria-label')).startsWith(action + ' · '));
    await control.tap();
  }
  const currentCalls = () => page.evaluate(() => window.bayitAcceptanceCalls);
  const goto = () => page.goto(target, { waitUntil: 'domcontentloaded' });
  async function openSettingsItem(name) {
    await button(home.appearance).tap();
    await button(name, dialog(home.appearance)).tap();
    return dialog(name);
  }
  async function roomEditor() {
    const editor = await openSettingsItem(home.setup);
    await editor.getByText(home.rooms, { exact: true }).tap();
    await editor.getByLabel(home.picker, { exact: true }).selectOption(fixture.mainRoom.area_id);
    return editor;
  }
  async function editSaved(editor, expected) {
    await button(home.save, editor).tap();
    await poll('saved dashboard room edit', async () => expected((await readConfig()).strategy));
    await editor.waitFor({ state: 'hidden' });
    await button(home.renamed).waitFor();
  }

  await goto();
  await button(home.room).waitFor();
  await button(home.otherRoom).waitFor();
  assert.equal(await card.locator('.shell').getAttribute('data-layout'), home.layout);
  await button(home.room).tap();
  const original = dialog(home.room);
  await roomDevice(original, fixture.first).waitFor();
  await roomDevice(original, fixture.second).waitFor();
  assert.equal(await roomDevice(original, fixture.late).count(), 0);
  if (fixture.excluded) await roomDevice(original, fixture.excluded).waitFor();
  await button(home.close, original).tap();
  console.log('Verified automatic rooms and effective entity/device placement on Core ' + api.version);

  const editor = await roomEditor();
  await editor.getByText(home.management, { exact: true }).tap();
  const rooms = editor.locator('[data-room-management] .room-entry');
  await rooms.filter({ hasText: home.room }).getByText(home.mainFloor, { exact: true }).waitFor();
  await rooms.filter({ hasText: home.otherRoom }).getByText(home.otherFloor, { exact: true }).waitFor();
  const name = editor.getByLabel(home.displayName, { exact: true });
  await name.fill(home.renamed);
  await name.press('Tab');
  await editor.getByText(home.contents, { exact: true }).tap();
  await toggleVisibility(editor, fixture.second, home.hide);
  const override = saved => saved.room_overrides?.[fixture.mainRoom.area_id];
  await editSaved(editor, saved => override(saved)?.name === home.renamed &&
    override(saved).hidden_entities?.includes(fixture.second.entity_id));
  assert.equal(override((await readConfig()).strategy).entities, undefined, 'The room remains auto-discovered');

  const chip = area => card.locator('article.room[data-room="' + area.area_id + '"] .quick-button[data-entity="' +
    fixture.late.entity_id + '"]');
  assert.equal(await chip(fixture.mainRoom).count(), 0);
  const documentTime = await page.evaluate(() => performance.timeOrigin);
  await fixture.moveDevice(fixture.late, fixture.mainRoom);
  await chip(fixture.mainRoom).waitFor({ timeout: 12000 });
  await chip(fixture.otherRoom).waitFor({ state: 'detached', timeout: 12000 });
  assert.equal(await page.evaluate(() => performance.timeOrigin), documentTime, 'The device must be discovered without loading a new page');
  console.log('Verified live native room reassignment after a saved edit');

  const finder = await openSettingsItem(home.finder);
  const search = finder.getByRole('searchbox', { name: home.search, exact: true });
  const finderRows = finder.locator('.device-finder-open');
  const lateRow = finderRows.filter({ hasText: home.renamed }).filter({ hasText: home.devices[2] });
  await search.fill(home.devices[2]);
  await lateRow.waitFor();
  await search.fill(home.devices[1]);
  assert.equal(await finderRows.count(), 0, 'The saved hidden device is excluded from Finder');
  await search.fill(home.alias);
  try {
    await lateRow.waitFor({ timeout: 3500 });
  } catch {
    const registry = await api.command('config/entity_registry/get_entries', { entity_ids: [fixture.late.entity_id] });
    assert.ok(registry[fixture.late.entity_id]?.aliases?.includes(home.alias));
    issues.push(new Error('Native Finder did not find a saved entity alias: ' + home.alias));
  }
  await search.fill(home.devices[2]);
  await lateRow.tap();
  const label = (await getStates()).get(fixture.late.entity_id)?.attributes?.friendly_name;
  assert.ok(label?.includes(home.devices[2]), 'The demo device should keep its native Home Assistant name');
  const details = dialog(label);
  await details.waitFor();
  assert.equal(new URL(page.url()).hash, '#device/' + fixture.mainRoom.area_id + '/' + fixture.late.entity_id);
  assert.deepEqual(await currentCalls(), []);
  await button(home.close, details).tap();
  await details.waitFor({ state: 'hidden' });
  console.log('Verified saved hide, Finder device names and native detail route');

  const before = await getStates();
  await button(home.renamed).tap();
  const room = dialog(home.renamed);
  const group = button(home.group, room);
  const confirmation = dialog(home.confirmTitle);
  await group.tap();
  assert.match(await confirmation.innerText(), /(?<![0-9])2(?![0-9])/u);
  assert.deepEqual(await currentCalls(), []);
  await button(home.cancel, confirmation).tap();
  await confirmation.waitFor({ state: 'hidden' });
  assert.deepEqual(await currentCalls(), []);
  await group.tap();
  await button(home.confirm, confirmation).tap();
  const expected = [fixture.first.entity_id, fixture.late.entity_id].sort();
  const untouched = [fixture.second, fixture.other, fixture.excluded].filter(Boolean).map(entry => entry.entity_id);
  await poll('confirmed group changes in Home Assistant', async () => {
    const states = await getStates();
    return expected.every(id => states.get(id)?.state === home.active);
  });
  const calls = await currentCalls();
  assert.deepEqual(calls.map(call => call.entity).sort(), expected);
  assert.ok(calls.every(call => call.domain === home.domain && call.service === home.service));
  const after = await getStates();
  for (const id of untouched) assert.equal(after.get(id)?.state, before.get(id)?.state, 'Excluded device changed: ' + id);
  await button(home.close, room).tap();
  await room.waitFor({ state: 'hidden' });
  console.log('Verified canceled confirmation and exact real group targets');

  const restore = await roomEditor();
  await restore.getByText(home.contents, { exact: true }).tap();
  await toggleVisibility(restore, fixture.second, home.restore);
  await editSaved(restore, saved => override(saved)?.name === home.renamed && !override(saved).hidden_entities);
  await button(home.renamed).tap();
  await roomDevice(dialog(home.renamed), fixture.second).waitFor();
  assert.deepEqual(errors, []);
  console.log('Verified restore after a saved dashboard edit');
  if (issues.length) throw new AggregateError(issues, key + ' native acceptance gaps');
  console.log('PASS ' + key);
} catch (error) {
  for (const message of protocolErrors) console.error('Home Assistant protocol: ' + message);
  await mkdir(results, { recursive: true });
  const failure = { message: error.stack, issues: issues.map(item => item.message), protocolErrors };
  if (page && !page.isClosed()) {
    failure.route = new URL(page.url()).pathname;
    await page.screenshot({ path: resolve(results, 'failure.png'), timeout: 5000 }).catch(() => {});
  }
  await writeFile(resolve(results, 'failure.json'), JSON.stringify(failure, null, 2) + '\n');
  throw error;
} finally {
  await browser?.close();
  api.close();
}
