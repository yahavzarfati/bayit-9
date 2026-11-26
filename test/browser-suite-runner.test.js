import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

async function invoke(t, scripts) {
  const root = await mkdtemp(join(tmpdir(), 'bayit-browser-runner-'));
  const scriptDir = join(root, 'scripts');
  const testDir = join(root, 'test');
  const runner = join(scriptDir, 'run-browser-suites.mjs');
  const entries = Object.entries(scripts).map(([name, code]) => [join(testDir, name), code]);
  t.after(async () => {
    await Promise.all([runner, ...entries.map(([path]) => path)].map(path => rm(path, { force: true })));
    await Promise.all([scriptDir, testDir].map(path => rmdir(path)));
    await rmdir(root);
  });
  await Promise.all([mkdir(scriptDir), mkdir(testDir)]);
  await Promise.all([
    copyFile(new URL('../scripts/run-browser-suites.mjs', import.meta.url), runner),
    ...entries.map(([path, code]) => writeFile(path, code, 'utf8')),
  ]);
  return spawnSync(process.execPath, [runner], { cwd: tmpdir(), encoding: 'utf8', timeout: 15000 });
}

test('runs both dashboard engines and later browser suites after failures, preserving all child logs', async t => {
  const result = await invoke(t, {
    'dashboard-browser.mjs': `
      if (process.env.BAYIT_BROWSER_ENGINE === 'chromium') {
        console.error('injected first browser failure');
        process.exitCode = 7;
      } else {
        console.log('second engine ran:', process.env.BAYIT_BROWSER_ENGINE);
      }
    `,
    'independent-browser.mjs': "console.error('injected later failure'); process.exitCode = 3;",
    'last-browser.mjs': "console.log('last independent suite ran');",
    'browser-helper.mjs': "throw new Error('non-suite helper should not run');",
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /injected first browser failure/);
  assert.match(result.stderr, /injected later failure/);
  assert.match(result.stdout, /second engine ran: webkit[\s\S]*last independent suite ran/);
  assert.match(result.stdout, /FAIL  Dashboard \(chromium\) \(\d+\.\ds, exit 7\)/);
  assert.match(result.stdout, /FAIL  independent-browser\.mjs \(\d+\.\ds, exit 3\)/);
  assert.match(result.stdout, /PASS  last-browser\.mjs[\s\S]*2 passed, 2 failed/);
});

test('continues standalone engine checks after the first failure and reports both engines by name', async t => {
  const result = await invoke(t, {
    'dashboard-browser.mjs': '',
    'browser-engines.mjs': await readFile(new URL('./browser-engines.mjs', import.meta.url), 'utf8'),
    'split-browser.mjs': `
      import { runBrowserEngines } from './browser-engines.mjs';
      const chromium = { name: () => 'chromium', launch: async () => { throw new Error('injected startup failure'); } };
      const webkit = { name: () => 'webkit', launch: async () => { console.log('second standalone engine ran'); } };
      await runBrowserEngines([[chromium], [webkit]], engine => engine.launch());
    `,
    'z-later-browser.mjs': "console.log('later standalone browser suite ran');",
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FAIL browser engine: chromium[\s\S]*injected startup failure/);
  assert.match(result.stdout, /second standalone engine ran[\s\S]*PASS browser engine: webkit/);
  assert.match(result.stdout, /later standalone browser suite ran[\s\S]*FAIL  split-browser\.mjs[\s\S]*3 passed, 1 failed/);
});

test('returns zero when every browser suite passes', async t => {
  const result = await invoke(t, {
    'dashboard-browser.mjs': "console.log('completed dashboard:', process.env.BAYIT_BROWSER_ENGINE);",
    'standalone-browser.mjs': "console.log('completed standalone suite');",
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /completed dashboard: chromium[\s\S]*completed dashboard: webkit/);
  assert.match(result.stdout, /completed standalone suite[\s\S]*3 passed, 0 failed/);
});
