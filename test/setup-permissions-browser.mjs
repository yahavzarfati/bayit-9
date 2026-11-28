import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';

const { outputFiles: [{ text: fixture }] } = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
    contents: `
      import './src/index.js';
      import { generateDashboard } from './src/strategy-model.js';
      const config = { type: 'custom:bayit-9', locale: 'en', title: 'Shared title',
        toolbar: [{ id: 'settings', kind: 'settings' }] };
      const states = { 'light.living': { state: 'off', attributes: { friendly_name: 'Living light' } } };
      const entities = { 'light.living': { area_id: 'living' } };
      const areas = { living: { name: 'Living' } };
      const calls = [];
      let holdNextRead = false;
      let finishHeldRead;
      let oldEditor;
      const makeHass = (id, is_admin) => ({
        user: { id, is_admin }, states, entities, areas,
        async callWS(request) {
          calls.push({ id, ...request });
          if (request.type === 'lovelace/dashboards/list') return [{ url_path: 'bayit-fixture', mode: 'storage' }];
          if (request.type === 'lovelace/config') {
            if (holdNextRead) {
              holdNextRead = false;
              await new Promise(resolve => { finishHeldRead = resolve; });
            }
            return { strategy: structuredClone(config) };
          }
          if (request.type === 'lovelace/config/save') return {};
          throw new Error('Unexpected command ' + request.type);
        },
      });
      const card = document.createElement('bayit-dashboard');
      const initial = makeHass('admin-a', true);
      card.hass = initial;
      card.setConfig(generateDashboard(config, initial).views[0].cards[0]);
      document.body.append(card);
      window.setupFixture = {
        calls, changeUser: (id, admin) => { card.hass = makeHass(id, admin); },
        holdRead: () => { holdNextRead = true; },
        get waiting() { return !!finishHeldRead; },
        releaseRead() { const complete = finishHeldRead; finishHeldRead = undefined; complete(); },
        saveEditor() { oldEditor = card.setup.editor; },
        staleChange() { oldEditor.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: { ...config, title: 'Stale secret replacement' } },
        })); },
      };
    `,
  },
  bundle: true,
  format: 'esm',
  write: false,
});

await runBrowserEngines([[chromium], [webkit]], async engine => {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error));
    await page.route('http://bayit-test.local/**', route => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">',
    }));
    await page.goto('http://bayit-test.local/bayit-fixture/home');
    await page.addScriptTag({ type: 'module', content: fixture });
    assert.deepEqual(errors, []);

    const settings = page.getByRole('button', { name: 'Appearance', exact: true });
    const entry = page.getByRole('button', { name: 'Customize home', exact: true });
    const setup = page.getByRole('dialog', { name: 'Customize home', exact: true });
    const title = setup.getByLabel('Dashboard title', { exact: true });
    const commit = setup.getByRole('button', { name: 'Save dashboard', exact: true });
    const edit = async () => {
      await settings.click();
      await entry.click();
      await title.waitFor();
    };
    const changeUser = (id, admin) => page.evaluate(({ id, admin }) => window.setupFixture.changeUser(id, admin), { id, admin });
    const writes = () => page.evaluate(() => window.setupFixture.calls.filter(item => item.type === 'lovelace/config/save'));

    await edit();
    await title.fill('Admin A private draft');
    await title.blur();
    await page.evaluate(() => window.setupFixture.saveEditor());
    await changeUser('member', false);
    await setup.waitFor({ state: 'hidden' });
    await settings.click();
    assert.equal(await entry.count(), 0, 'normal users can still use Settings but cannot enter the editor');
    await page.getByRole('dialog', { name: 'Appearance', exact: true }).getByRole('button', { name: 'Close', exact: true }).click();
    await page.evaluate(() => window.setupFixture.staleChange());

    await changeUser('admin-b', true);
    await edit();
    assert.equal(await title.inputValue(), 'Shared title');
    await changeUser('admin-a', true);
    await setup.waitFor({ state: 'hidden' });
    await edit();
    assert.equal(await title.inputValue(), 'Admin A private draft', 'inactive editor event could not rewrite the preserved draft');

    await page.evaluate(() => window.setupFixture.holdRead());
    await commit.click();
    await page.waitForFunction(() => window.setupFixture.waiting);
    await changeUser('admin-a', false);
    await setup.waitFor({ state: 'hidden' });
    // The old command remains revoked even if the same identity regains authority first.
    await changeUser('admin-a', true);
    await page.evaluate(() => window.setupFixture.releaseRead());
    await edit();
    assert.equal(await title.inputValue(), 'Admin A private draft', 'an unauthorized deferred save preserves the owner’s draft');
    assert.deepEqual(await writes(), []);

    await setup.getByRole('button', { name: 'Close', exact: true }).click();
    await page.evaluate(() => window.setupFixture.holdRead());
    await settings.click();
    await entry.click();
    await page.waitForFunction(() => window.setupFixture.waiting);
    await changeUser('admin-b', true);
    await setup.waitFor({ state: 'hidden' });
    await page.evaluate(() => window.setupFixture.releaseRead());
    await edit();
    assert.equal(await title.inputValue(), 'Shared title');
    assert.deepEqual(await writes(), []);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
