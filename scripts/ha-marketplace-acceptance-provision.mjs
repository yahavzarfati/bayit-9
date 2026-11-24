import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fixtureOrigin, poll, RESOURCE_URL } from './ha-acceptance-provision.mjs';

const NATIVE_PATH = '/local/community/bayit-9/bayit-9.js';
const LEGACY_PATH = '/hacsfiles/bayit-9/bayit-9.js';
const READINESS = { timeout: 180000, interval: 900 };

async function marketplaceCommand(api, type, fields, transient = []) {
  try {
    return await api.command(type, fields);
  } catch (error) {
    const prefix = type + ': ';
    const detail = error?.message?.startsWith(prefix) ? error.message.slice(prefix.length) : '';
    const code = /^[a-z_]+(?= \()/.exec(detail)?.[0] ?? 'request_failed';
    if (transient.includes(code)) return null;
    throw new Error(type + ' failed (' + code + ')');
  }
}

function assertMarketplaceEnabled(status) {
  if (!status.disabled_reason) return;
  const reason = /^[a-z_]+$/.test(status.disabled_reason) ? status.disabled_reason : 'unknown';
  throw new Error('Marketplace is disabled (' + reason + ')');
}

export async function installMarketplaceRelease(api, url, published, { request = fetch, readiness = READINESS } = {}) {
  const origin = fixtureOrigin(url);
  const { repository, tag, digest, prerelease } = published ?? {};
  assert.match(repository ?? '', /^[a-z0-9][a-z0-9-]*\/bayit-9$/i, 'Expected a verified Bayit 9 repository');
  assert.match(tag ?? '', /^v?\d+\.\d+\.\d+(?:[+-][A-Za-z0-9][A-Za-z0-9.+-]*)?$/, 'Expected a verified release tag');
  assert.match(digest ?? '', /^sha256:[0-9a-f]{64}$/, 'Expected a verified public release digest');
  assert.equal(typeof prerelease, 'boolean', 'Expected the published release type');
  const command = (type, fields, transient) => marketplaceCommand(api, 'marketplace/' + type, fields, transient);
  const resources = () => api.command('lovelace/resources');

  const existing = await resources();
  assert.ok(existing.every(item => ![RESOURCE_URL, NATIVE_PATH, LEGACY_PATH].includes(new URL(item.url, origin).pathname)),
    'This fixture already has a Bayit 9 dashboard module');

  let lastStatus;
  try {
    await poll('native Marketplace startup and GitHub authentication', async () => {
      const status = await command('info', undefined, ['unknown_command', 'not_loaded']);
      if (!status) return false;
      lastStatus = status;
      assertMarketplaceEnabled(status);
      return status.stage === 'running' && status.startup === false && status.github_connected === true;
    }, readiness);
  } catch (error) {
    if (!error.message.startsWith('Timed out waiting')) throw error;
    const stage = typeof lastStatus?.stage === 'string' && /^[a-z_]+$/.test(lastStatus.stage)
      ? lastStatus.stage : 'unregistered';
    throw new Error(error.message + ' (stage ' + stage + ', GitHub ' +
      (lastStatus?.github_connected === true ? 'connected' : 'not connected') + ')');
  }

  // Accept the normal first-use notice only for the temporary fixture owner.
  await command('warning/accept');
  const status = await command('info');
  assert.equal(status.warning_accepted, true, 'Marketplace did not record the fixture owner’s acknowledgement');
  const repositoryUrl = 'https://github.com/' + repository;
  const detected = await command('repositories/detect', { repository: repositoryUrl });
  assert.ok(detected.categories.includes('plugin'), 'Marketplace did not detect a native dashboard resource');
  await command('repositories/add', { repository: repositoryUrl, category: 'plugin' });
  const record = await poll('the Marketplace custom repository entry', async () => {
    const entries = await command('repositories/list', { categories: ['plugin'] });
    return entries.find(item => item.full_name?.toLowerCase() === repository.toLowerCase());
  }, readiness);
  const repositoryId = String(record.id);
  assert.match(repositoryId, /^\d+$/, 'Marketplace returned no repository identifier');
  assert.equal(record.custom, true, 'Marketplace did not add a custom repository');
  assert.equal(record.category, 'plugin', 'Marketplace added a different category');
  assert.equal(record.can_install, true, 'Marketplace cannot install this dashboard resource');
  assert.equal(record.installed, false, 'Marketplace already installed this package');
  if (prerelease) await command('repository/beta', { repository: repositoryId, show_beta: true });
  const releases = await command('repository/releases', { repository_id: repositoryId });
  assert.ok(releases.some(release => release.tag === tag && release.prerelease === prerelease),
    'Marketplace did not expose the exact published release');
  await command('repository/install', { repository: repositoryId, version: tag });
  const installed = await command('repository/info', { repository_id: repositoryId });
  assert.equal(installed.installed, true, 'Marketplace did not mark Bayit 9 installed');
  assert.equal(installed.installed_version, tag, 'Marketplace installed a different version');
  assert.equal(installed.category, 'plugin', 'Marketplace installed a different category');

  const module = await poll('the Marketplace-created Lovelace module', async () => {
    const matches = (await resources()).filter(item => new URL(item.url, origin).pathname === NATIVE_PATH);
    assert.ok(matches.length <= 1, 'Marketplace created duplicate Bayit 9 resources');
    return matches[0];
  }, readiness);
  const moduleUrl = new URL(module.url, origin);
  assert.ok(module.type === 'module' && moduleUrl.origin === origin && !moduleUrl.hash &&
    moduleUrl.searchParams.get('v') === repositoryId + '-' + tag,
    'Marketplace did not register the expected versioned dashboard module');
  const asset = await request(moduleUrl.href, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  assert.ok(asset.ok, 'The Marketplace module did not return HTTP success');
  const installedDigest = 'sha256:' + createHash('sha256').update(new Uint8Array(await asset.arrayBuffer())).digest('hex');
  assert.equal(installedDigest, digest, 'The Marketplace-served module differs from the published release asset');
  assertMarketplaceEnabled(await command('info'));
  return moduleUrl.pathname + moduleUrl.search;
}
