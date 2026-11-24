import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

export const FIXTURE_HOME = 'Bayit 9 Acceptance Fixture';
export const ROOM_NAME = 'Acceptance Workshop';
export const RESOURCE_URL = '/local/bayit-9.js';
const MARKER_URL = '/local/bayit-acceptance-marker.txt';

export function fixtureOrigin(value) {
  assert.equal(typeof value, 'string', 'Provide the loopback URL printed by the fixture launcher');
  const parsed = new URL(value);
  assert.ok(parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1' && parsed.port &&
    parsed.pathname === '/' && !parsed.username && !parsed.password && !parsed.search && !parsed.hash,
  'The acceptance runner only uses an explicit HTTP loopback address and port');
  return parsed.origin;
}

export async function poll(label, check, { timeout = 30000, interval = 350 } = {}) {
  const deadline = performance.now() + timeout;
  do {
    const result = await check();
    if (result) return result;
    await sleep(interval);
  } while (performance.now() < deadline);
  throw new Error('Timed out waiting for ' + label);
}

async function response(origin, path, { auth, form, data, method = 'GET', request = fetch, timeout = 15000 } = {}) {
  const headers = {};
  if (auth) headers.Authorization = 'Bearer ' + auth;
  let body;
  if (form) {
    body = new URLSearchParams(form);
  } else if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }
  return request(origin + path, { method, body, headers, redirect: 'error', signal: AbortSignal.timeout(timeout) });
}

async function json(origin, path, options) {
  const result = await response(origin, path, options);
  if (!result.ok) throw new Error(path + ' returned HTTP ' + result.status);
  return result.json();
}

export async function onboard(url, marker, { request = fetch, startupTimeout = 180000 } = {}) {
  const origin = fixtureOrigin(url);
  assert.match(marker ?? '', /^[a-f0-9]{32}$/, 'Provide the temporary fixture marker from the launcher');
  const readiness = { timeout: startupTimeout, interval: 600 };
  await poll('the isolated Home Assistant fixture', async () => {
    let served;
    try {
      served = await response(origin, MARKER_URL, { request, timeout: 2500 });
    } catch {
      return false;
    }
    if (served.status === 404 || served.status === 502 || served.status === 503) return false;
    assert.ok(served.ok, 'Cannot read the fixture marker, HTTP ' + served.status);
    assert.equal((await served.text()).trim() === marker, true, 'Refusing to initialize an unverified Home Assistant instance');
    return true;
  }, readiness);

  const status = await poll('Home Assistant onboarding', async () => {
    let result;
    try {
      result = await response(origin, '/api/onboarding', { request, timeout: 2500 });
    } catch {
      return false;
    }
    if (result.status === 502 || result.status === 503) return false;
    assert.ok(result.ok, 'Onboarding status returned HTTP ' + result.status);
    return result.json();
  }, readiness);
  assert.equal(status.find(step => step.step === 'user')?.done, false,
    'Refusing to initialize a Home Assistant instance that already has a user');

  const clientId = origin + '/';
  const send = (path, options = {}) => json(origin, path, { method: 'POST', request, ...options });
  const code = await send('/api/onboarding/users', {
    data: {
      client_id: clientId,
      language: 'en',
      name: 'Acceptance Tester',
      username: 'acceptance',
      password: randomBytes(24).toString('hex'),
    },
  });
  const exchange = authCode => {
    assert.equal(typeof authCode, 'string', 'Onboarding returned no authorization code');
    return send('/auth/token', {
      form: { client_id: clientId, grant_type: 'authorization_code', code: authCode },
    });
  };
  const first = await exchange(code.auth_code);
  assert.ok(typeof first.access_token === 'string' && first.access_token.length > 0, 'OAuth returned no access token');
  const auth = first.access_token;
  for (const step of ['core_config', 'analytics']) {
    if (!status.find(item => item.step === step)?.done) await send('/api/onboarding/' + step, { auth, data: {} });
  }
  const integration = await send('/api/onboarding/integration', {
    auth,
    data: { client_id: clientId, redirect_uri: clientId },
  });
  const tokens = await exchange(integration.auth_code);
  assert.ok(typeof tokens.access_token === 'string' && tokens.access_token.length > 0 &&
    typeof tokens.refresh_token === 'string' && tokens.refresh_token.length > 0 &&
    Number.isFinite(tokens.expires_in), 'OAuth returned incomplete browser credentials');
  const config = await json(origin, '/api/config', { request, auth: tokens.access_token });
  assert.equal(config.location_name, FIXTURE_HOME, 'This instance is not the configured acceptance fixture');
  return {
    hassUrl: origin,
    clientId,
    expires: Date.now() + tokens.expires_in * 1000,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
  };
}

export async function connect(url, token, { WebSocketImpl = WebSocket, timeout = 12000 } = {}) {
  const origin = fixtureOrigin(url);
  const socket = new WebSocketImpl(origin.replace('http:', 'ws:') + '/api/websocket');
  const pending = new Map();
  let id = 0;
  let accepting;
  let failAuth;
  const authenticated = new Promise((resolve, reject) => { accepting = resolve; failAuth = reject; });
  const startup = setTimeout(() => failAuth(new Error('Home Assistant WebSocket authentication timed out')), timeout);
  const failAll = message => {
    failAuth(new Error(message));
    for (const handler of pending.values()) handler.reject(new Error(message));
    pending.clear();
  };
  socket.addEventListener('error', () => failAll('Home Assistant WebSocket connection failed'));
  socket.addEventListener('close', () => failAll('Home Assistant WebSocket closed'));
  socket.addEventListener('message', ({ data }) => {
    let packet;
    try { packet = JSON.parse(data); } catch {
      failAll('Home Assistant returned invalid WebSocket JSON');
      return;
    }
    if (packet.type === 'auth_required') {
      socket.send(JSON.stringify({ type: 'auth', access_token: token }));
    } else if (packet.type === 'auth_ok') {
      accepting(packet.ha_version);
    } else if (packet.type === 'auth_invalid') {
      failAuth(new Error('Home Assistant refused the temporary token'));
    } else if (packet.type === 'result') {
      const handler = pending.get(packet.id);
      if (handler) {
        pending.delete(packet.id);
        if (packet.success) handler.resolve(packet.result);
        else handler.reject(new Error(handler.type + ': ' + (packet.error?.code ?? 'unknown_error') +
          ' (' + (packet.error?.message ?? 'request failed') + ')'));
      }
    }
  });

  let version;
  try {
    version = await authenticated;
  } catch (error) {
    socket.close();
    throw error;
  } finally {
    clearTimeout(startup);
  }
  return {
    version,
    command(type, options = {}) {
      return new Promise((resolve, reject) => {
        const messageId = ++id;
        const timer = setTimeout(() => {
          pending.delete(messageId);
          reject(new Error(type + ' timed out'));
        }, timeout);
        pending.set(messageId, { type,
          resolve: value => { clearTimeout(timer); resolve(value); },
          reject: error => { clearTimeout(timer); reject(error); },
        });
        try {
          socket.send(JSON.stringify({ ...options, id: messageId, type }));
        } catch (error) {
          pending.get(messageId).reject(error);
          pending.delete(messageId);
        }
      });
    },
    close() { socket.close(); },
  };
}

export async function seedLovelace(api) {
  const area = await api.command('config/area_registry/create', { name: ROOM_NAME, icon: 'mdi:tools' });
  assert.ok(area?.area_id, 'Home Assistant did not return an area ID');

  const demo = await poll('a registered synthetic demo light', async () => {
    const entries = await api.command('config/entity_registry/list');
    const candidates = entries.filter(item => item.platform === 'demo' && /^light\.[a-z0-9_]+$/.test(item.entity_id) &&
      !item.disabled_by && !item.hidden_by).sort((a, b) => a.entity_id.localeCompare(b.entity_id));
    const states = await api.command('get_states');
    return candidates.find(item => states.some(state =>
      state.entity_id === item.entity_id && ['on', 'off'].includes(state.state)));
  }, { timeout: 90000 });
  await api.command('config/entity_registry/update', { entity_id: demo.entity_id, area_id: area.area_id });
  const resources = await api.command('lovelace/resources');
  assert.ok(!resources.some(resource => resource.url === RESOURCE_URL), 'The temporary resource already exists');
  await api.command('lovelace/resources/create', { res_type: 'module', url: RESOURCE_URL });
  const registered = await api.command('lovelace/resources');
  assert.ok(registered.some(resource => resource.url === RESOURCE_URL && resource.type === 'module'),
    'The bundle was not stored as a Lovelace module');
  return { entity: demo.entity_id, area: area.area_id, room: ROOM_NAME };
}
