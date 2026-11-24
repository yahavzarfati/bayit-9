import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfiguration, saveConfiguration } from '../src/dashboard-configuration.js';

function dashboard() {
  const calls = [];
  let config = { title: 'Example', strategy: { type: 'custom:bayit-9', locale: 'en', unknown: true } };
  const hass = {
    user: { is_admin: true },
    async callWS(command) {
      calls.push(command);
      if (command.type === 'lovelace/dashboards/list') return [
        { url_path: 'example-home', mode: 'storage' },
        { url_path: 'another-home', mode: 'yaml' },
      ];
      if (command.type === 'lovelace/config') return structuredClone(config);
      if (command.type === 'lovelace/config/save') config = structuredClone(command.config);
    },
  };
  return { hass, calls, get config() { return config; } };
}

test('saves only the active storage dashboard strategy after rereading it', async () => {
  const { hass, calls } = dashboard();
  const base = await loadConfiguration(hass, '/example-home/home');
  const patch = { ...base.strategy, area_ids: ['bayit_room_1'] };
  await saveConfiguration(hass, base, patch);
  assert.deepEqual(calls.at(-1), {
    type: 'lovelace/config/save', url_path: 'example-home',
    config: { title: 'Example', strategy: patch },
  });
  assert.equal(calls.at(-2).force, true);
});

test('refuses to edit a YAML dashboard and avoids overwriting a concurrent strategy change', async () => {
  const { hass, calls } = dashboard();
  await assert.rejects(() => loadConfiguration(hass, '/another-home/home'), { code: 'setup_storage' });
  const base = await loadConfiguration(hass, '/example-home/home');
  await saveConfiguration(hass, base, { ...base.strategy, title: 'From another tab' });
  await assert.rejects(() => saveConfiguration(hass, base, { ...base.strategy, title: 'My draft' }), { code: 'setup_conflict' });
  assert.equal(calls.filter(call => call.type === 'lovelace/config/save').length, 1);
  hass.user.is_admin = false;
  await assert.rejects(() => loadConfiguration(hass, '/example-home/home'), { code: 'setup_storage' });
});
