import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fixtureOrigin, poll, RESOURCE_URL } from './ha-acceptance-provision.mjs';

export const HACS_VERSION = '2.0.5';
const FILE_NAME = 'bayit-9.js';
const GITHUB_API = 'https://api.github.com';
const GITHUB_HEADERS = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
const MAX_BUNDLE_SIZE = 10 * 1024 * 1024;
const READINESS = { timeout: 180000, interval: 900 };

function releaseTarget(repository, tag) {
  assert.ok(typeof repository === 'string' && /^[a-z0-9][a-z0-9-]*\/bayit-9$/i.test(repository),
    'Select a public Bayit 9 GitHub repository (owner/bayit-9)');
  assert.ok(typeof tag === 'string' && /^v?\d+\.\d+\.\d+(?:[+-][A-Za-z0-9][A-Za-z0-9.+-]*)?$/.test(tag),
    'Select a specific published Bayit 9 version tag');
  return { repository, tag };
}

async function github(path, label, request, token, scheme = 'Bearer') {
  const headers = { ...GITHUB_HEADERS };
  if (token) headers.Authorization = scheme + ' ' + token;
  const response = await request(GITHUB_API + path, {
    headers, redirect: 'error', signal: AbortSignal.timeout(12000),
  }).catch(() => { throw new Error(label + ' could not reach GitHub'); });
  if (!response.ok) throw new Error(label + ' returned HTTP ' + response.status);
  return response.json().catch(() => { throw new Error(label + ' returned invalid JSON'); });
}

function bundleDigest(bytes) {
  return 'sha256:' + createHash('sha256').update(bytes).digest('hex');
}

export async function verifyPublishedRelease(repository, tag, { token, request = fetch, verifyHacsUpstream = true } = {}) {
  const target = releaseTarget(repository, tag);
  assert.ok(typeof token === 'string' && token.length > 0,
    'Provide a read-only GitHub Actions or App installation token for the disposable fixture');
  const repo = await github('/repos/' + repository, 'Public repository metadata lookup', request, token);
  assert.ok(repo.private === false && repo.full_name?.toLowerCase() === repository.toLowerCase(),
    'HACS acceptance requires a canonical public release repository');
  const release = await github('/repos/' + repository + '/releases/tags/' + encodeURIComponent(tag),
    'Published release metadata lookup', request, token);
  assert.ok(release.draft === false && release.tag_name === tag && typeof release.prerelease === 'boolean',
    'Select an already published release with the exact requested tag');
  const asset = release.assets?.find(item => item.name === FILE_NAME && item.state === 'uploaded');
  assert.ok(Number.isInteger(asset?.size) && asset.size > 0 && asset.size <= MAX_BUNDLE_SIZE,
    'The public release has no valid bayit-9.js asset');
  const download = new URL(asset.browser_download_url ?? 'about:blank');
  const expectedPath = '/' + repo.full_name + '/releases/download/' + encodeURIComponent(tag) + '/' + FILE_NAME;
  assert.ok(download.origin === 'https://github.com' && download.pathname === expectedPath &&
    !download.username && !download.password && !download.search && !download.hash,
    'The release metadata does not point to the canonical public GitHub download');

  const installation = await github('/installation/repositories?per_page=100',
    'GitHub installation repository lookup', request, token);
  assert.ok(installation.repositories?.some(item => item.full_name?.toLowerCase() === repository.toLowerCase()),
    'Use a job or read-only App token for the Bayit 9 repository');
  await github('/repos/' + repository + '/contents/hacs.json?ref=' + encodeURIComponent(tag),
    'Bayit 9 manifest permission check', request, token, 'token');
  if (verifyHacsUpstream) {
    const upstream = '/repos/hacs/integration';
    await github(upstream, 'HACS upstream repository permission check', request, token, 'token');
    await github(upstream + '/git/trees/' + HACS_VERSION, 'HACS upstream tree permission check', request, token, 'token');
    await github(upstream + '/contents/custom_components/hacs/manifest.json?ref=' + HACS_VERSION,
      'HACS upstream manifest permission check', request, token, 'token');
    await github(upstream + '/releases/tags/' + HACS_VERSION,
      'HACS upstream release permission check', request, token, 'token');
  }
  const limit = await github('/rate_limit', 'GitHub credential rate-limit check', request, token);
  assert.ok(Number.isInteger(limit.resources?.core?.remaining) && limit.resources.core.remaining > 0,
    'The GitHub credential has no remaining Core requests');

  const response = await request(download.href, { redirect: 'follow', signal: AbortSignal.timeout(60000) })
    .catch(() => { throw new Error('Anonymous GitHub release asset download failed'); });
  if (!response.ok) throw new Error('Anonymous GitHub release asset returned HTTP ' + response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(bytes.byteLength, asset.size, 'GitHub release asset size differs from its metadata');
  const digest = bundleDigest(bytes);
  if (asset.digest) assert.equal(digest, asset.digest, 'GitHub release asset does not match its published digest');
  return { ...target, prerelease: release.prerelease, digest };
}

async function hacsCommand(api, type, payload, { allowNotReady = false } = {}) {
  try {
    return await api.command(type, payload);
  } catch (error) {
    // Home Assistant errors may embed integration-provided messages. Retain only the error code.
    const prefix = type + ': ';
    const detail = error?.message?.startsWith(prefix) ? error.message.slice(prefix.length) : '';
    const code = /^[a-z_]+(?= \()/.exec(detail)?.[0] ?? 'request_failed';
    if (allowNotReady && code === 'unknown_command') return null;
    throw new Error(type + ' failed (' + code + ')');
  }
}

function assertHacsEnabled(status) {
  if (!status.disabled_reason) return;
  const reason = /^[a-z0-9_]+$/i.test(status.disabled_reason) ? status.disabled_reason : 'unknown';
  throw new Error('HACS is disabled (' + reason + ')');
}

export async function installPublishedRelease(api, url, verifiedRelease, { request = fetch, readiness = READINESS } = {}) {
  const origin = fixtureOrigin(url);
  const { repository, tag } = releaseTarget(verifiedRelease?.repository, verifiedRelease?.tag);
  const { digest, prerelease } = verifiedRelease;
  assert.match(digest ?? '', /^sha256:[0-9a-f]{64}$/, 'Expected a verified public release digest');
  assert.equal(typeof prerelease, 'boolean', 'Expected the published release type');
  const resourcePath = '/hacsfiles/bayit-9/' + FILE_NAME;
  const resources = () => api.command('lovelace/resources');

  const existing = await resources();
  assert.ok(existing.every(item => {
    const path = new URL(item.url, origin).pathname;
    return path !== RESOURCE_URL && path !== resourcePath;
  }), 'This fixture already has a Bayit 9 dashboard module');
  let lastStage;
  try {
    await poll('HACS startup', async () => {
      const status = await hacsCommand(api, 'hacs/info', undefined, { allowNotReady: true });
      if (!status) return false;
      lastStage = /^[a-z_]+$/.test(status.stage) ? status.stage : 'unrecognized';
      assert.equal(status.version, HACS_VERSION, 'Unexpected HACS version');
      assertHacsEnabled(status);
      return status.stage === 'running' && status.startup === false;
    }, readiness);
  } catch (error) {
    if (error.message !== 'Timed out waiting for HACS startup') throw error;
    const entries = await api.command('config_entries/get', { domain: 'hacs' }).catch(() => []);
    const state = entries.find(item => item.domain === 'hacs')?.state;
    const entryState = /^[a-z_]+$/.test(state) ? state : 'missing';
    throw new Error(error.message + ' (stage ' + (lastStage ?? 'unregistered') + ', entry ' + entryState + ')');
  }

  await hacsCommand(api, 'hacs/repositories/add', {
    repository: 'https://github.com/' + repository, category: 'plugin',
  });
  const item = await poll('the HACS repository entry', async () => {
    const entries = await hacsCommand(api, 'hacs/repositories/list', { categories: ['plugin'] });
    return entries.find(candidate => candidate.full_name?.toLowerCase() === repository.toLowerCase());
  }, readiness);
  assert.match(String(item.id), /^\d+$/, 'HACS returned no repository identifier');
  assert.equal(item.custom, true, 'The HACS package is not registered as a custom repository');
  assert.equal(item.installed, false, 'The package already exists on the isolated fixture');
  const repositoryId = String(item.id);
  if (prerelease) await hacsCommand(api, 'hacs/repository/beta', { repository: repositoryId, show_beta: true });
  await hacsCommand(api, 'hacs/repository/download', { repository: repositoryId, version: tag });
  const installed = await hacsCommand(api, 'hacs/repository/info', { repository_id: repositoryId });
  assert.equal(installed.installed, true, 'HACS did not mark the package installed');
  assert.equal(installed.installed_version, tag, 'HACS installed a different version');
  assert.equal(installed.category, 'plugin', 'HACS installed a different repository category');

  const resource = await poll('the HACS-created Lovelace module', async () => {
    const matches = (await resources()).filter(item => new URL(item.url, origin).pathname === resourcePath);
    assert.ok(matches.length <= 1, 'HACS created duplicate Bayit 9 resources');
    return matches[0];
  }, readiness);
  const moduleUrl = new URL(resource.url, origin);
  assert.ok(resource.type === 'module' && moduleUrl.origin === origin && !moduleUrl.hash &&
    /^\d+$/.test(moduleUrl.searchParams.get('hacstag') ?? ''),
    'HACS did not create its native cache-busted Lovelace module URL');
  const installedAsset = await request(moduleUrl.href, {
    redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  assert.ok(installedAsset.ok, 'The HACS-created module did not return HTTP success');
  const downloadedDigest = bundleDigest(new Uint8Array(await installedAsset.arrayBuffer()));
  assert.equal(downloadedDigest, digest, 'The HACS-served module differs from the published release asset');
  assertHacsEnabled(await hacsCommand(api, 'hacs/info'));
  return moduleUrl.pathname + moduleUrl.search;
}
