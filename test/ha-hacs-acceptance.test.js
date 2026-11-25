import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { HACS_VERSION, installPublishedRelease, verifyPublishedRelease } from '../scripts/ha-hacs-acceptance-provision.mjs';

const repository = 'synthetic-owner/bayit-9';
const tag = 'v0.1.0';
const base = 'http://127.0.0.1:18123';
const bundle = 'export const synthetic = true;';
const digest = 'sha256:' + createHash('sha256').update(bundle).digest('hex');
const token = 'synthetic-test-credential';
const published = { repository, tag, digest, prerelease: false };
const assetUrl = 'https://github.com/' + repository + '/releases/download/' + tag + '/bayit-9.js';
const nativeUrl = '/hacsfiles/bayit-9/bayit-9.js?hacstag=123010';
const enabled = { version: HACS_VERSION, startup: false, stage: 'running', lovelace_mode: 'auto-gen' };
const readiness = { timeout: 1000, interval: 0 };

function githubFixture({ privateRepo = false, overrideDigest, remaining = 990 } = {}) {
  const calls = [];
  const request = async (url, options) => {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const auth = options.headers?.Authorization;
    calls.push({ url, auth });
    if (url === assetUrl) {
      assert.equal(auth, undefined);
      assert.equal(options.redirect, 'follow');
      return new Response(bundle);
    }
    assert.equal(parsed.origin, 'https://api.github.com');
    assert.equal(options.redirect, 'error');
    if (path === '/repos/' + repository) {
      assert.equal(auth, 'Bearer ' + token);
      return Response.json({ private: privateRepo, full_name: repository });
    }
    if (path === '/repos/' + repository + '/releases/tags/' + tag) {
      assert.equal(auth, 'Bearer ' + token);
      return Response.json({ draft: false, tag_name: tag, prerelease: false, assets: [{
        name: 'bayit-9.js', state: 'uploaded', size: Buffer.byteLength(bundle),
        digest: overrideDigest || digest, browser_download_url: assetUrl,
      }] });
    }
    if (path === '/installation/repositories') {
      assert.equal(auth, 'Bearer ' + token);
      return Response.json({ repositories: [{ full_name: repository }] });
    }
    if (path === '/rate_limit') {
      assert.equal(auth, 'Bearer ' + token);
      return Response.json({ resources: { core: { remaining } } });
    }
    assert.equal(auth, 'token ' + token);
    if (path === '/repos/' + repository + '/contents/hacs.json') assert.equal(parsed.searchParams.get('ref'), tag);
    if (path.startsWith('/repos/hacs/integration') || path === '/repos/' + repository + '/contents/hacs.json') {
      return Response.json({});
    }
    throw new Error('Unrecognized synthetic GitHub URL');
  };
  return { calls, request };
}

test('GitHub release preflight keeps the credential off anonymous downloads and probes HACS startup endpoints', async () => {
  const { calls, request } = githubFixture();
  const receipt = await verifyPublishedRelease(repository, tag, { token, request });
  assert.deepEqual(receipt, published);
  assert.deepEqual(calls.filter(item => !item.auth), [{ url: assetUrl, auth: undefined }]);
  for (const path of ['/git/trees/2.0.5', '/contents/custom_components/hacs/manifest.json?ref=2.0.5', '/releases/tags/2.0.5']) {
    assert.ok(calls.some(item => item.url === 'https://api.github.com/repos/hacs/integration' + path &&
      item.auth === 'token ' + token));
  }
});

test('HACS release preflight stops at private repository metadata before requesting assets', async () => {
  const { calls, request } = githubFixture({ privateRepo: true });
  await assert.rejects(verifyPublishedRelease(repository, tag, { token, request }), /public release repository/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].auth, 'Bearer ' + token);
});

test('HACS release preflight rejects incorrect release bytes and an exhausted credential', async () => {
  await assert.rejects(verifyPublishedRelease(repository, tag, {
    token, request: githubFixture({ overrideDigest: 'sha256:' + '0'.repeat(64) }).request,
  }), /published digest/);
  await assert.rejects(verifyPublishedRelease(repository, tag, {
    token, request: githubFixture({ remaining: 0 }).request,
  }), /no remaining Core requests/);
});

function nativeFixture({ existing = [], overrideBundle = bundle, errorForAdd, disabledReason } = {}) {
  const calls = [];
  let state = 0;
  const api = {
    async command(type, fields) {
      calls.push({ type, fields });
      if (type === 'lovelace/resources') {
        return state >= 2 ? [{ type: 'module', url: nativeUrl }] : existing;
      }
      if (type === 'hacs/info') return { ...enabled, disabled_reason: disabledReason };
      if (type === 'hacs/repositories/add') {
        if (errorForAdd) throw new Error(type + ': error (' + errorForAdd + ')');
        assert.deepEqual(fields, { repository: 'https://github.com/' + repository, category: 'plugin' });
        state = 1;
        return {};
      }
      if (type === 'hacs/repositories/list') {
        assert.equal(state, 1);
        return [{ full_name: repository, id: 123, installed: false, custom: true }];
      }
      if (type === 'hacs/repository/beta') {
        assert.deepEqual(fields, { repository: '123', show_beta: true });
        return {};
      }
      if (type === 'hacs/repository/download') {
        assert.deepEqual(fields, { repository: '123', version: tag });
        state = 2;
        return {};
      }
      if (type === 'hacs/repository/info') {
        assert.equal(state, 2);
        assert.deepEqual(fields, { repository_id: '123' });
        return { installed: true, installed_version: tag, category: 'plugin' };
      }
      throw new Error('Unexpected WebSocket command ' + type);
    },
  };
  const request = async (url, options) => {
    assert.equal(url, base + nativeUrl);
    assert.equal(options.redirect, 'error');
    return new Response(overrideBundle);
  };
  return { api, request, calls };
}

test('HACS installation uses the native repository, version, and automatically registered module', async () => {
  const { api, request, calls } = nativeFixture();
  assert.equal(await installPublishedRelease(api, base, published, { request, readiness }), nativeUrl);
  assert.deepEqual(calls.map(call => call.type), ['lovelace/resources', 'hacs/info', 'hacs/repositories/add',
    'hacs/repositories/list', 'hacs/repository/download', 'hacs/repository/info', 'lovelace/resources', 'hacs/info']);
});

test('HACS discovery waits for native WebSocket registration and for startup cleanup to finish', async () => {
  const { api, request } = nativeFixture();
  const command = api.command.bind(api);
  let statuses = 0;
  api.command = async (type, fields) => {
    if (type === 'hacs/info') {
      statuses++;
      if (statuses === 1) throw new Error('hacs/info: unknown_command (Unknown command)');
      if (statuses === 2) return { ...enabled, stage: 'startup' };
    }
    if (type === 'hacs/repositories/add') assert.equal(statuses, 3);
    return command(type, fields);
  };
  await installPublishedRelease(api, base, published, { request, readiness });
  assert.equal(statuses, 4);
});

test('HACS preview release enables native beta before download', async () => {
  const { api, request, calls } = nativeFixture();
  await installPublishedRelease(api, base, { ...published, prerelease: true }, { request, readiness });
  assert.ok(calls.findIndex(item => item.type === 'hacs/repository/beta') <
    calls.findIndex(item => item.type === 'hacs/repository/download'));
});

test('HACS acceptance rejects preloaded modules, disablement, and package byte mismatch', async () => {
  for (const [settings, message] of [
    [{ existing: [{ type: 'module', url: '/local/bayit-9.js' }] }, /already has a Bayit 9/],
    [{ disabledReason: 'rate_limit' }, /disabled \(rate_limit\)/],
    [{ overrideBundle: 'different bundle' }, /differs from the published release/],
  ]) {
    const { api, request } = nativeFixture(settings);
    await assert.rejects(installPublishedRelease(api, base, published, { request, readiness }), message);
  }
});

test('HACS WebSocket rejection omits upstream error details', async () => {
  const { api, request } = nativeFixture({ errorForAdd: 'sensitive upstream details' });
  await assert.rejects(installPublishedRelease(api, base, published, { request, readiness }),
    { message: 'hacs/repositories/add failed (error)' });
});
