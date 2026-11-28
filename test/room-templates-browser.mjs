import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';

const { outputFiles: [{ text: fixture }] } = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
    contents: `
      import { Bayit9StrategyEditor } from './src/strategy-editor.js';
      customElements.define('bayit9-editor-fixture', Bayit9StrategyEditor);
      const state = (name, device_class) => ({
        state: 'off', attributes: { friendly_name: name, ...(device_class && { device_class }) },
      });
      let hass = {
        areas: { den: { name: 'Den' }, study: { name: 'Study' } },
        entities: {
          'light.den_one': { area_id: 'den' }, 'light.den_two': { area_id: 'den' },
          'light.den_hidden': { area_id: 'den' }, 'cover.den_curtain': { area_id: 'den' },
          'cover.den_garage': { area_id: 'den' }, 'sensor.den_temperature': { area_id: 'den' },
          'light.den_late': { area_id: 'den' },
          'light.study': { area_id: 'study' }, 'cover.study_curtain': { area_id: 'study' },
        },
        states: {
          'light.den_one': state('Desk lamp'), 'light.den_two': state('Floor lamp'),
          'light.den_hidden': state('Hidden lamp'), 'cover.den_curtain': state('Den curtain', 'curtain'),
          'cover.den_garage': state('Garage door', 'garage'), 'sensor.den_temperature': state('Den temperature', 'temperature'),
          'light.study': state('Study lamp'), 'cover.study_curtain': state('Study curtain', 'curtain'),
        },
      };
      const editor = document.createElement('bayit9-editor-fixture');
      editor.hass = hass;
      editor.setConfig({
        locale: 'en',
        room_overrides: {
          den: { name: 'Den', device_selection: 'auto', panel_hidden_entities: ['light.den_hidden'],
            sections: [{ id: 'existing', kind: 'sensors', entities: ['sensor.den_temperature'] }] },
          study: {
            device_selection: 'auto',
            sections: [
              { id: 'shades', kind: 'covers', title: 'Shades', columns: 2, entities: ['cover.study_curtain'] },
              { id: 'lights', kind: 'lights', entities: ['light.study'] },
            ],
          },
        },
      });
      const events = [];
      editor.addEventListener('config-changed', event => events.push(event.detail.config));
      document.body.append(editor);
      editor.openRooms({ manage: true });
      Object.assign(window, { editor, events, patchStates(patch, removed = []) {
        const states = { ...hass.states, ...patch };
        for (const id of removed) delete states[id];
        hass = { ...hass, states };
        editor.hass = hass;
      } });
    `,
  },
  bundle: true,
  format: 'esm',
  write: false,
});

await runBrowserEngines([[chromium], [webkit]], async engine => {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error));
    await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">');
    await page.addScriptTag({ type: 'module', content: fixture });

    const editor = page.locator('bayit9-editor-fixture');
    await editor.getByText('Room layouts', { exact: true }).click();
    await editor.getByLabel('Room to arrange', { exact: true }).selectOption('den');
    const layout = editor.getByLabel('Layout template', { exact: true });
    await layout.selectOption('copy:study');

    const curtain = editor.getByLabel('Study curtain', { exact: true });
    const lamp = editor.getByLabel('Study lamp', { exact: true });
    assert.equal(await curtain.inputValue(), 'cover.den_curtain', 'one compatible local device is suggested');
    assert.equal(await lamp.inputValue(), '', 'an ambiguous choice is left for the user');
    assert.equal(await curtain.locator('option[value="cover.den_garage"]').count(), 0);
    assert.equal(await lamp.locator('option[value="light.den_hidden"]').count(), 0);
    assert.equal(await lamp.locator('option[value="light.study"]').count(), 0);
    await lamp.selectOption('light.den_two');
    const apply = editor.getByRole('button', { name: 'Apply room layout' });
    assert.equal(await apply.isDisabled(), true);
    assert.equal(await page.evaluate(() => window.events.length), 0);
    await editor.getByRole('checkbox', { name: 'Replace this room’s current groups' }).check();
    await apply.click();
    assert.equal(await editor.getByRole('status').textContent(), 'Layout added to the dashboard draft.');
    assert.equal(await page.evaluate(() => window.events.length), 1);
    const override = await page.evaluate(() => window.events[0].room_overrides.den);
    assert.deepEqual(override, {
      name: 'Den', device_selection: 'auto', panel_hidden_entities: ['light.den_hidden'],
      sections: [
        { id: 'layout-1', kind: 'covers', title: 'Shades', columns: 2, entities: ['cover.den_curtain'] },
        { id: 'layout-2', kind: 'lights', entities: ['light.den_two'] },
      ],
    });

    await page.evaluate(() => window.editor.openRooms({ roomId: 'den', focus: 'templates' }));
    await editor.getByRole('heading', { name: 'Room layouts' }).waitFor();
    assert.equal(await editor.getByLabel('Room to arrange', { exact: true }).count(), 0);
    await editor.getByLabel('Layout template', { exact: true }).selectOption('daily');
    assert.equal(await editor.getByRole('button', { name: 'Apply room layout' }).isDisabled(), true);

    await page.evaluate(() => window.editor.openRooms({ focus: 'templates' }));
    const destination = editor.getByLabel('Room to arrange', { exact: true });
    await destination.selectOption('study');
    assert.equal(await destination.inputValue(), 'study');
    assert.equal(await page.evaluate(() => window.events.length), 1);

    await page.evaluate(() => window.editor.openRooms({ roomId: 'den', focus: 'contents' }));
    const editorEvents = await page.evaluate(() => window.events.length);
    const search = editor.getByLabel('Find a device in this room', { exact: true });
    await search.fill('Late light');
    const beforeArrival = await search.elementHandle();
    await page.evaluate(() => window.patchStates({
      'light.den_late': { state: 'off', attributes: { friendly_name: 'Late light' } },
    }));
    assert.equal(await beforeArrival.evaluate(control => control === control.getRootNode().activeElement), true);
    assert.equal(await editor.getByText('Late light', { exact: true }).count(), 0);
    await search.blur();
    await editor.getByText('Late light', { exact: true }).waitFor();
    assert.equal(await search.inputValue(), 'Late light', 'the contents query survives the registry refresh');

    await search.focus();
    const beforeOrdinaryChange = await search.elementHandle();
    await page.evaluate(() => window.patchStates({
      'light.den_late': { state: 'on', attributes: { friendly_name: 'Late light' } },
    }));
    await search.blur();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    assert.equal(await beforeOrdinaryChange.evaluate(control => control.isConnected), true);

    await page.evaluate(() => window.patchStates({
      'light.fallback': { state: 'off', attributes: { friendly_name: 'Fallback light', area_id: 'den' } },
    }, ['light.den_late']));
    await editor.getByText('Late light', { exact: true }).waitFor({ state: 'hidden' });
    await search.fill('');
    await search.blur();
    await editor.getByText('Fallback light', { exact: true }).waitFor();
    await page.evaluate(() => window.patchStates({
      'light.fallback': { state: 'off', attributes: { friendly_name: 'Fallback light', area_id: 'study' } },
    }));
    await editor.getByText('Fallback light', { exact: true }).waitFor({ state: 'hidden' });
    await page.evaluate(() => window.editor.openRooms({ roomId: 'study', focus: 'contents' }));
    await editor.getByText('Fallback light', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.events.length), editorEvents, 'discovery must not write configuration');

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
