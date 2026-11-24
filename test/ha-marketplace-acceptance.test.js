import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { verifyPublishedRelease } from '../scripts/ha-hacs-acceptance-provision.mjs';
import { installMarketplaceRelease } from '../scripts/ha-marketplace-acceptance-provision.mjs';

const origin = 'http://127.0.0.1:18256';
const repository = 'fake-owner/bayit-9';
const repositoryUrl = 'https://github.com/' + repository;
const testToken = 'synthetic-job-token';
const bundle = 'export const synthetic = true;';
const digest = 'sha256:' + createHash('sha256').update(bundle).digest('hex');
const published = { repository, tag: 'v0.1.0', digest, prerelease: false };
const fixtureReadiness = { timeout: 1000, interval: 0 };

test('Marketplace preflight accepts the same-repository job credential without HACS upstream access', async () => {
  const visited = [];
  const download = repositoryUrl + '/releases/download/' + published.tag + '/bayit-9.js';
  const request = async (url, options) => {
    visited.push(url);
    if (url === download) {
      assert.equal(options.headers, undefined);
      return new Response(bundle);
    }
    assert.match(url, /^https:\/\/api\.github\.com\//);
    assert.ok(['Bearer ' + testToken, 'token ' + testToken].includes(options.headers.Authorization));
    const { pathname } = new URL(url);
    if (pathname === '/repos/' + repository) return Response.json({ private: false, full_name: repository });
    if (pathname.endsWith('/releases/tags/' + published.tag)) return Response.json({
      draft: false, prerelease: false, tag_name: published.tag, assets: [{
        name: 'bayit-9.js', state: 'uploaded', size: Buffer.byteLength(bundle), digest, browser_download_url: download,
      }],
    });
    if (pathname === '/installation/repositories') return Response.json({ repositories: [{ full_name: repository }] });
    if (pathname === '/repos/' + repository + '/contents/hacs.json') return Response.json({});
    if (pathname === '/rate_limit') return Response.json({ resources: { core: { remaining: 995 } } });
    throw new Error('Unexpected GitHub request');
  };
  assert.deepEqual(await verifyPublishedRelease(repository, published.tag, {
    token: testToken, request, verifyHacsUpstream: false,
  }), published);
  assert.equal(visited.some(url => url.includes('/repos/hacs/')), false);
});

function native({ release = published, override = {}, existing = [], actualBundle = bundle, readiness = fixtureReadiness } = {}) {
  const calls = [];
  const repositoryId = '1234';
  const moduleUrl = '/local/community/bayit-9/bayit-9.js?v=' + repositoryId + '-' + release.tag;
  let warning = false;
  let detected = false;
  let registered = false;
  let beta = false;
  let installed = false;
  const api = {
    async command(type, fields) {
      calls.push(type);
      if (type in override) return override[type](fields);
      switch (type) {
        case 'lovelace/resources':
          return installed ? [{ type: 'module', url: moduleUrl }] : existing;
        case 'marketplace/info':
          return { stage: 'running', startup: false, github_connected: true, warning_accepted: warning };
        case 'marketplace/warning/accept':
          warning = true;
          return null;
        case 'marketplace/repositories/detect':
          assert.ok(warning);
          assert.deepEqual(fields, { repository: repositoryUrl });
          detected = true;
          return { categories: ['plugin'] };
        case 'marketplace/repositories/add':
          assert.ok(detected);
          assert.deepEqual(fields, { repository: repositoryUrl, category: 'plugin' });
          registered = true;
          return null;
        case 'marketplace/repositories/list':
          assert.ok(registered);
          assert.deepEqual(fields, { categories: ['plugin'] });
          return [{ id: Number(repositoryId), full_name: repository, custom: true,
            installed: false, category: 'plugin', can_install: true }];
        case 'marketplace/repository/beta':
          assert.deepEqual(fields, { repository: repositoryId, show_beta: true });
          beta = true;
          return null;
        case 'marketplace/repository/releases':
          assert.equal(beta, release.prerelease);
          assert.deepEqual(fields, { repository_id: repositoryId });
          return [{ tag: release.tag, prerelease: release.prerelease }];
        case 'marketplace/repository/install':
          assert.deepEqual(fields, { repository: repositoryId, version: release.tag });
          installed = true;
          return null;
        case 'marketplace/repository/info':
          assert.ok(installed);
          assert.deepEqual(fields, { repository_id: repositoryId });
          return { installed: true, installed_version: release.tag, category: 'plugin' };
        default:
          throw new Error('Unexpected native command ' + type);
      }
    },
  };
  const request = async (url, options) => {
    assert.equal(url, origin + moduleUrl);
    assert.equal(options.redirect, 'error');
    return new Response(actualBundle);
  };
  const run = () => installMarketplaceRelease(api, origin, release, { request, readiness });
  return { calls, moduleUrl, run };
}

test('Marketplace route accepts the owner notice and installs the exact stable release using native commands', async () => {
  const { run, calls, moduleUrl } = native();
  assert.equal(await run(), moduleUrl);
  assert.deepEqual(calls, [
    'lovelace/resources', 'marketplace/info', 'marketplace/warning/accept', 'marketplace/info',
    'marketplace/repositories/detect', 'marketplace/repositories/add', 'marketplace/repositories/list',
    'marketplace/repository/releases', 'marketplace/repository/install', 'marketplace/repository/info',
    'lovelace/resources', 'marketplace/info',
  ]);
});

test('Marketplace route switches to preview visibility only for a published prerelease', async () => {
  const { run, calls, moduleUrl } = native({ release: { ...published, tag: 'v0.1.0-beta.1', prerelease: true } });
  assert.equal(await run(), moduleUrl);
  assert.ok(calls.indexOf('marketplace/repository/beta') < calls.indexOf('marketplace/repository/install'));
});

test('Marketplace routes wait for the native entry and connected state before accepting the owner notice', async () => {
  let attempt = 0;
  const { run } = native({ override: {
    'marketplace/info': () => {
      attempt++;
      if (attempt === 1) throw new Error('marketplace/info: unknown_command (Unknown command)');
      if (attempt === 2) throw new Error('marketplace/info: not_loaded (The entry is unloaded)');
      if (attempt === 3) return { stage: 'running', startup: false, github_connected: false };
      if (attempt === 4) return { stage: 'startup', startup: false, github_connected: true };
      return { stage: 'running', startup: false, github_connected: true, warning_accepted: attempt > 5 };
    },
  } });
  await run();
  assert.equal(attempt, 7);
});

test('Marketplace reports that it never registered when startup times out without a status', async () => {
  const { run } = native({ readiness: { timeout: 0, interval: 0 }, override: {
    'marketplace/info': () => { throw new Error('marketplace/info: unknown_command (Unknown command)'); },
  } });
  await assert.rejects(run(), /Timed out waiting.*\(stage unregistered, GitHub not connected\)/);
});

test('Marketplace acceptance rejects preloaded modules, disabled integration, wrong release and wrong bytes', async () => {
  for (const [options, message] of [
    [{ existing: [{ url: '/local/bayit-9.js', type: 'module' }] }, /already has a Bayit 9/],
    [{ existing: [{ url: '/hacsfiles/bayit-9/bayit-9.js', type: 'module' }] }, /already has a Bayit 9/],
    [{ override: { 'marketplace/info': () => ({ disabled_reason: 'rate_limit' }) } }, /disabled \(rate_limit\)/],
    [{ override: { 'marketplace/repository/releases': () => [] } }, /exact published release/],
    [{ actualBundle: 'different bundle' }, /differs from the published release asset/],
  ]) {
    await assert.rejects(native(options).run(), message);
  }
});

test('Marketplace keeps upstream error bodies out of acceptance output', async () => {
  const { run } = native({ override: {
    'marketplace/repositories/add': () => {
      throw new Error('marketplace/repositories/add: add_failed (details hidden from logs)');
    },
  } });
  await assert.rejects(run(), { message: 'marketplace/repositories/add failed (add_failed)' });
});
