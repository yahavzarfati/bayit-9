import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const repository = new URL('../', import.meta.url);
const dashboard = 'dashboard-browser.mjs';
const engines = ['chromium', 'webkit'];
const requestedGroup = process.env.BAYIT_BROWSER_SUITE;
const { values: { scenario: requestedScenarios = [] } } = parseArgs({
  options: { scenario: { type: 'string', multiple: true } },
});

async function browserSuites() {
  if (requestedGroup && ![...engines, 'standalone'].includes(requestedGroup)) {
    throw new Error('BAYIT_BROWSER_SUITE must be chromium, webkit, or standalone');
  }
  if (requestedScenarios.some(scenario => !scenario.trim())) throw new Error('--scenario requires a name');
  if (requestedScenarios.length && requestedGroup === 'standalone') {
    throw new Error('--scenario selects dashboard scenarios and cannot be used with the standalone suite');
  }
  const files = await readdir(new URL('test/', repository), { withFileTypes: true });
  const sources = files.filter(entry => entry.isFile() && entry.name !== dashboard && entry.name.endsWith('-browser.mjs'))
    .map(entry => entry.name).sort();
  const suites = [
    ...engines.map(engine => ({
      group: engine, name: 'Dashboard (' + engine + ')',
      args: ['test/' + dashboard, ...requestedScenarios.flatMap(name => ['--scenario', name])],
      env: { BAYIT_BROWSER_ENGINE: engine },
    })),
    ...sources.map(file => ({ group: 'standalone', name: file, args: ['test/' + file] })),
  ];
  return suites.filter(suite => (!requestedGroup || suite.group === requestedGroup) &&
    (!requestedScenarios.length || suite.group !== 'standalone'));
}

function runSuite({ args, env }) {
  return new Promise(resolveResult => {
    const started = performance.now();
    const child = spawn(process.execPath, args, {
      cwd: repository,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });
    let launchError;
    child.once('error', error => { launchError = error.message; });
    child.once('close', (code, signal) => {
      const failure = launchError ?? (signal ? 'signal ' + signal : code === 0 ? undefined : 'exit ' + code);
      resolveResult({ failure, duration: performance.now() - started });
    });
  });
}

function seconds(duration) {
  return (duration / 1000).toFixed(1) + 's';
}

async function runBrowserSuites(suites) {
  const started = performance.now();
  const results = [];
  for (const [index, suite] of suites.entries()) {
    console.log('\n[' + (index + 1) + '/' + suites.length + '] ' + suite.name);
    results.push({ name: suite.name, ...await runSuite(suite) });
  }

  console.log('\nBrowser suite results');
  for (const { name, failure, duration } of results) {
    console.log((failure ? 'FAIL' : 'PASS') + '  ' + name + ' (' + seconds(duration) +
      (failure ? ', ' + failure : '') + ')');
  }
  const failed = results.filter(result => result.failure).length;
  console.log((results.length - failed) + ' passed, ' + failed + ' failed (' + seconds(performance.now() - started) + ')');
  return failed ? 1 : 0;
}

process.exitCode = await runBrowserSuites(await browserSuites());
