import assert from 'node:assert/strict';
import test from 'node:test';
import { connect, FIXTURE_HOME, fixtureOrigin, onboard, ROOM_NAME, RESOURCE_URL, seedLovelace } from '../scripts/ha-acceptance-provision.mjs';

const base = 'http://127.0.0.1:39048';
const marker = 'f8b674cd7c38bf344f6382c524eeb307';
const json = obj => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } });
const newStatus = ['user', 'core_config', 'analytics', 'integration'].map(step => ({ step, done: false }));

test('only the explicitly marked loopback fixture can be onboarded', async () => {
  for (const wrong of ['http://homeassistant.local:8123', 'http://127.0.0.1', base + '/x', base + '?x', 'https://127.0.0.1:39048']) {
    assert.throws(() => fixtureOrigin(wrong));
  }
  assert.equal(fixtureOrigin(base + '/'), base);
  const paths = [];
  await assert.rejects(onboard(base, marker, { request: async url => {
    paths.push(new URL(url).pathname);
    return new Response('wrong fixture');
  } }), /unverified Home Assistant/);
  assert.deepEqual(paths, ['/local/bayit-acceptance-marker.txt']);

  paths.length = 0;
  await assert.rejects(onboard(base, marker, { request: async url => {
    paths.push(new URL(url).pathname);
    return paths.length === 1 ? new Response(marker) : json([{ step: 'user', done: true }]);
  } }), /already has a user/);
  assert.deepEqual(paths, ['/local/bayit-acceptance-marker.txt', '/api/onboarding']);
});

test('fresh onboarding follows the native OAuth and onboarding request shapes', async () => {
  const paths = [];
  let users = 0;
  let exchanges = 0;
  const browser = await onboard(base, marker, { request: async (url, opts) => {
    assert.equal(new URL(url).origin, base);
    assert.equal(opts.redirect, 'error');
    const path = new URL(url).pathname;
    paths.push(path);
    if (path === '/local/bayit-acceptance-marker.txt') return new Response(marker + '\n');
    if (path === '/api/onboarding') return json(newStatus);
    if (path === '/api/onboarding/users') {
      assert.equal(opts.method, 'POST');
      const data = JSON.parse(opts.body);
      assert.equal(data.client_id, base + '/');
      assert.equal(data.language, 'en');
      assert.match(data.password, /^[a-f0-9]{48}$/);
      users++;
      return json({ auth_code: 'first' });
    }
    if (path === '/auth/token') {
      assert.equal(opts.body.get('grant_type'), 'authorization_code');
      assert.equal(opts.body.get('client_id'), base + '/');
      exchanges++;
      assert.equal(opts.body.get('code'), exchanges === 1 ? 'first' : 'second');
      return json({ access_token: 'syntheticAccess' + exchanges, refresh_token: 'syntheticRefresh', expires_in: 1800 });
    }
    if (path === '/api/config') {
      assert.equal(opts.headers.Authorization, 'Bearer syntheticAccess2');
      return json({ location_name: FIXTURE_HOME });
    }
    assert.equal(opts.headers.Authorization, 'Bearer syntheticAccess1');
    if (path.endsWith('/integration')) {
      assert.equal(JSON.parse(opts.body).redirect_uri, base + '/');
      return json({ auth_code: 'second' });
    }
    return json({});
  } });
  assert.deepEqual(paths, ['/local/bayit-acceptance-marker.txt', '/api/onboarding', '/api/onboarding/users',
    '/auth/token', '/api/onboarding/core_config', '/api/onboarding/analytics',
    '/api/onboarding/integration', '/auth/token', '/api/config']);
  assert.equal(users, 1);
  assert.equal(browser.hassUrl, base);
  assert.equal(browser.clientId, base + '/');
  assert.ok(browser.expires > Date.now());
});

test('WebSocket sends auth then command envelopes with correlated responses', async () => {
  class FakeSocket extends EventTarget {
    constructor(url) {
      super();
      assert.equal(url, 'ws://127.0.0.1:39048/api/websocket');
      queueMicrotask(() => this.emit({ type: 'auth_required', ha_version: '2026.11.2' }));
    }
    emit(value) {
      this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(value) }));
    }
    send(text) {
      const value = JSON.parse(text);
      if (value.type === 'auth') {
        assert.equal(value.access_token, 'syntheticToken');
        this.emit({ type: 'auth_ok', ha_version: '2026.11.2' });
      } else if (value.type === 'invalid') {
        this.emit({ id: value.id, type: 'result', success: false, error: { code: 'invalid_format', message: 'intentional' } });
      } else {
        this.emit({ id: value.id, type: 'result', success: true, result: value.input });
      }
    }
    close() { this.dispatchEvent(new Event('close')); }
  }
  const api = await connect(base, 'syntheticToken', { WebSocketImpl: FakeSocket });
  assert.equal(api.version, '2026.11.2');
  assert.deepEqual(await Promise.all([api.command('echo', { input: 5 }), api.command('echo', { input: 9 })]), [5, 9]);
  await assert.rejects(api.command('invalid'), /invalid: invalid_format/);
  api.close();
});

test('seeding chooses only a registered demo light and registers a native module', async () => {
  const commands = [];
  const response = await seedLovelace({ async command(type, data) {
    commands.push([type, data]);
    switch (type) {
      case 'config/area_registry/create': return { area_id: 'acceptance_area' };
      case 'config/entity_registry/list': return [
        { entity_id: 'light.aaa', platform: 'non_demo' },
        { entity_id: 'light.demo', platform: 'demo', device_id: 'fake_demo_device' },
      ];
      case 'get_states': return [{ entity_id: 'light.aaa', state: 'on' }, { entity_id: 'light.demo', state: 'off' }];
      case 'lovelace/resources': return commands.some(([command]) => command === 'lovelace/resources/create')
        ? [{ url: RESOURCE_URL, type: 'module' }] : [];
      default: return {};
    }
  } });
  assert.deepEqual(response, { room: ROOM_NAME, area: 'acceptance_area', entity: 'light.demo' });
  assert.ok(commands.some(([type, data]) => type === 'config/device_registry/update' &&
    data.device_id === 'fake_demo_device' && data.area_id === 'acceptance_area'));
  assert.ok(commands.some(([type, data]) => type === 'lovelace/resources/create' &&
    data.res_type === 'module' && data.url === RESOURCE_URL));
});
