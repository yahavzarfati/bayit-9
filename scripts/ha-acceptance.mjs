import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { connect, fixtureOrigin, onboard, poll, RESOURCE_URL, seedLovelace } from './ha-acceptance-provision.mjs';
import { installPublishedRelease } from './ha-hacs-acceptance-provision.mjs';
import { installMarketplaceRelease } from './ha-marketplace-acceptance-provision.mjs';

const hacsReceipt = process.env.BAYIT_QA_HACS_RECEIPT;
const marketplaceReceipt = process.env.BAYIT_QA_MARKETPLACE_RECEIPT;
assert.ok(!(hacsReceipt && marketplaceReceipt), 'Select only one package installation path');
const releaseReceipt = hacsReceipt ?? marketplaceReceipt;
const installRelease = marketplaceReceipt ? installMarketplaceRelease : installPublishedRelease;
const base = fixtureOrigin(process.env.BAYIT_QA_URL);
const tokens = await onboard(base, process.env.BAYIT_QA_MARKER);
const api = await connect(base, tokens.access_token, releaseReceipt ? { timeout: 90000 } : undefined);
const artifacts = resolve(process.env.BAYIT_QA_RESULTS ?? 'test-results/ha-acceptance');
let browser;
let page;
const moduleResponses = [];
const runtimeErrors = [];

try {
  if (process.env.BAYIT_QA_HA_VERSION) assert.equal(api.version, process.env.BAYIT_QA_HA_VERSION);
  const fixture = await seedLovelace(api, { registerModule: !releaseReceipt });
  const resourceUrl = releaseReceipt
    ? await installRelease(api, base, JSON.parse(await readFile(releaseReceipt, 'utf8')))
    : RESOURCE_URL;
  const browserModuleUrl = new URL(resourceUrl, base).href;
  console.log('Synthetic Home Assistant ' + api.version + ' onboarded and module registered');

  browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1200, height: 900 } });
  await context.route(/https?:\/\//, route => new URL(route.request().url()).origin === base
    ? route.continue() : route.abort());
  await context.addInitScript(({ expectedOrigin, savedTokens }) => {
    if (location.origin === expectedOrigin) localStorage.setItem('hassTokens', JSON.stringify(savedTokens));
  }, { expectedOrigin: base, savedTokens: tokens });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('response', result => {
    if (result.url() === browserModuleUrl) moduleResponses.push(result.status());
  });
  page.on('pageerror', error => runtimeErrors.push(error.message));

  await page.goto(base + '/config/lovelace/dashboards', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add dashboard', exact: true }).click();
  const picker = page.locator('ha-dialog-new-dashboard');
  await picker.getByText('Community dashboards', { exact: true }).waitFor();
  const choice = picker.locator('dashboard-card').filter({ hasText: 'Bayit 9' });
  await choice.click();
  const metadata = page.locator('dialog-lovelace-dashboard-detail');
  await metadata.getByRole('button', { name: 'Create', exact: true }).click();

  const dashboard = await poll('the dashboard created by the native picker', async () => {
    const list = await api.command('lovelace/dashboards/list');
    const record = list.find(item => item.title === 'Bayit 9' && item.mode === 'storage');
    if (!record) return false;
    try {
      const saved = await api.command('lovelace/config', { url_path: record.url_path, force: true });
      return saved?.strategy?.type === 'custom:bayit-9' ? record : false;
    } catch (error) {
      if (!/not_found|config_not/.test(error.message)) throw error;
      return false;
    }
  });
  assert.match(dashboard.url_path, /^[a-z0-9_-]+$/);
  console.log('Native picker created ' + dashboard.url_path);

  const target = base + '/' + dashboard.url_path + '/home';
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  const card = page.locator('bayit-dashboard');
  await card.getByRole('heading', { name: 'Bayit 9', exact: true, level: 1 }).waitFor();
  const roomButton = card.getByRole('button', { name: fixture.room, exact: true });
  await roomButton.click();
  const room = card.getByRole('dialog', { name: fixture.room, exact: true });
  const device = room.locator('[data-entity="' + fixture.entity + '"]');
  await device.waitFor();

  const deviceState = async () => (await api.command('get_states')).find(state => state.entity_id === fixture.entity)?.state;
  const original = await deviceState();
  assert.ok(['on', 'off'].includes(original), 'Expected an available synthetic light');
  await device.getByRole('button', { name: original === 'on' ? 'Turn off' : 'Turn on', exact: true }).click();
  await poll('the real Home Assistant state of the synthetic light to change', async () => (
    await deviceState() === (original === 'on' ? 'off' : 'on')
  ));
  await room.getByRole('button', { name: 'Close', exact: true }).click();
  console.log('Generated room and native device control verified');

  await page.setViewportSize({ width: 390, height: 844 });
  const settings = card.getByRole('button', { name: 'Appearance', exact: true });
  await settings.click();
  const appearance = card.getByRole('dialog', { name: 'Appearance', exact: true });
  const lagoon = appearance.getByRole('button', { name: 'Lagoon', exact: true });
  await lagoon.click();
  assert.equal(await lagoon.getAttribute('aria-pressed'), 'true');
  await appearance.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await roomButton.waitFor();
  await settings.click();
  await appearance.getByRole('button', { name: 'Lagoon', exact: true, pressed: true }).waitFor();
  assert.ok(moduleResponses.includes(200) || moduleResponses.includes(304),
    'The browser did not fetch the registered Bayit 9 bundle');
  console.log('Mobile-width appearance setting saved and survived reload');

  await appearance.getByRole('button', { name: 'Close', exact: true }).click();
  await mkdir(artifacts, { recursive: true });
  await card.screenshot({ path: resolve(artifacts, 'dashboard.png'), animations: 'disabled' });
  await roomButton.click();
  await room.waitFor();
  await room.screenshot({ path: resolve(artifacts, 'room.png'), animations: 'disabled' });
  await room.getByRole('button', { name: 'Close', exact: true }).click();

  await settings.click();
  await appearance.getByRole('button', { name: 'Customize home', exact: true }).click();
  const setup = card.getByRole('dialog', { name: 'Customize home', exact: true });
  await setup.getByText('Rooms', { exact: true }).click();
  await setup.getByText('New dashboard-only room', { exact: true }).click();
  await setup.getByLabel('New room name', { exact: true }).fill('Reading nook');
  await setup.getByRole('button', { name: 'Create room', exact: true }).click();
  await setup.getByRole('button', { name: 'Save dashboard', exact: true }).click();
  await poll('the room added by Bayit 9 to be stored in Home Assistant', async () => {
    const saved = await api.command('lovelace/config', { url_path: dashboard.url_path, force: true });
    return Object.values(saved?.strategy?.room_overrides ?? {}).some(room => room.name === 'Reading nook');
  });
  await card.getByRole('button', { name: 'Reading nook', exact: true }).waitFor();
  console.log('Bayit 9 room customization was saved and survived the dashboard reload');

  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await card.getByRole('heading', { name: 'Bayit 9', exact: true, level: 1 }).waitFor();
  const dashboardHeader = page.locator('hui-root');
  const edit = page.getByRole('button', { name: 'Edit dashboard', exact: true });
  try {
    await edit.click({ timeout: 6000 });
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    const labelText = /^\s*Edit dashboard\s*$/;
    const tooltip = dashboardHeader.locator('ha-tooltip').filter({ hasText: labelText });
    if (await tooltip.count() === 1) {
      const anchorId = await tooltip.evaluate(element => element.for);
      assert.match(anchorId ?? '', /^button-\d+$/);
      await dashboardHeader.locator('#' + anchorId).click();
    } else {
      await dashboardHeader.locator('#dashboardmenu').click();
      await dashboardHeader.locator('ha-dropdown-item').filter({ hasText: labelText }).click();
    }
  }
  const editor = page.locator('dialog-dashboard-strategy-editor');
  const editorTitle = editor.getByLabel('Dashboard title', { exact: true });
  await editorTitle.fill('Bayit 9 Test Home');
  await editorTitle.blur();
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await poll('settings saved through the native dashboard strategy editor', async () => {
    const saved = await api.command('lovelace/config', { url_path: dashboard.url_path, force: true });
    return saved?.strategy?.title === 'Bayit 9 Test Home';
  });
  await card.getByRole('heading', { name: 'Bayit 9 Test Home', exact: true, level: 1 }).waitFor();
  console.log('Dashboard title saved through the strategy editor');

  await settings.click();
  await appearance.getByRole('button', { name: 'Customize home', exact: true }).click();
  await setup.getByText('Appearance', { exact: true }).click();
  await setup.getByRole('checkbox', { name: 'Hide Home Assistant chrome on this dashboard' }).check();
  await setup.getByRole('button', { name: 'Save dashboard', exact: true }).click();
  await poll('full-screen preference persisted', async () => {
    const saved = await api.command('lovelace/config', { url_path: dashboard.url_path, force: true });
    return saved?.strategy?.fullscreen === true;
  });
  await settings.waitFor();
  const nativeHeader = dashboardHeader.locator('.header').first();
  await nativeHeader.waitFor({ state: 'hidden' });
  await settings.click();
  await appearance.getByRole('button', { name: 'Home Assistant menu', exact: true }).click();
  await nativeHeader.waitFor({ state: 'visible' });
  assert.equal(new URL(page.url()).searchParams.get('disable_km'), '1');
  console.log('Full-screen layout and native menu recovery verified in Home Assistant');
} catch (error) {
  await mkdir(artifacts, { recursive: true });
  if (page && !page.isClosed()) {
    await page.screenshot({ path: resolve(artifacts, 'failure.png'), timeout: 5000 }).catch(() => {});
    console.error('Browser route: ' + new URL(page.url()).pathname);
  }
  console.error('Bundle HTTP statuses: ' + (moduleResponses.join(', ') || 'none'));
  for (const message of runtimeErrors.slice(-8)) console.error('Browser runtime: ' + message);
  throw error;
} finally {
  await browser?.close();
  api.close();
}
