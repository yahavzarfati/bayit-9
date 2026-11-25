import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';

const repository = new URL('../', import.meta.url);
const dashboard = 'dashboard-browser.mjs';

async function defaultSuites() {
  const files = await readdir(new URL('test/', repository), { withFileTypes: true });
  const standalone = files.filter(entry => entry.isFile() && entry.name !== dashboard && entry.name.endsWith('-browser.mjs'))
    .map(entry => entry.name).sort();
  return [
    ...['chromium', 'webkit'].map(engine => ({
      name: 'Dashboard (' + engine + ')', args: ['test/' + dashboard], env: { BAYIT_BROWSER_ENGINE: engine },
    })),
    ...standalone.map(file => ({ name: file, args: ['test/' + file] })),
  ];
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

process.exitCode = await runBrowserSuites(await defaultSuites());
