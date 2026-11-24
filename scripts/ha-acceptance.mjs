import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { connect, fixtureOrigin, onboard, poll, RESOURCE_URL, seedLovelace } from './ha-acceptance-provision.mjs';

const base = fixtureOrigin(process.env.BAYIT_QA_URL);
const tokens = await onboard(base, process.env.BAYIT_QA_MARKER);
const api = await connect(base, tokens.access_token);
const artifacts = resolve(process.env.BAYIT_QA_RESULTS ?? 'test-results/ha-acceptance');
let browser;
let page;
const moduleResponses = [];
const runtimeErrors = [];

try {
  if (process.env.BAYIT_QA_HA_VERSION) assert.equal(api.version, process.env.BAYIT_QA_HA_VERSION);
  const fixture = await seedLovelace(api);
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
    if (new URL(result.url()).pathname === RESOURCE_URL) moduleResponses.push(result.status());
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
