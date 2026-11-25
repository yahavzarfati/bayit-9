import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';
import { catalog, wallpaperGroups } from '../src/wallpaper-catalog.js';

const dist = new URL('../dist/', import.meta.url);
const files = new Map(await Promise.all([
  ['bayit-9.js', 'text/javascript'],
  ...wallpaperGroups.photos.flatMap(id => [catalog[id].photo.full, catalog[id].photo.preview])
    .map(file => [file, 'image/webp']),
].map(async ([file, contentType]) => [file, { contentType, body: await readFile(new URL(file, dist)) }])));

const app = `
  const hass = {
    user: { is_admin: false },
    locale: { language: 'en' },
    states: { 'light.studio': { state: 'off', attributes: { friendly_name: 'Studio light' } } },
    entities: { 'light.studio': { area_id: 'studio' } },
    areas: { studio: { area_id: 'studio', name: 'Studio' } },
    callWS: async () => ({}),
  };
  const strategy = customElements.get('ll-strategy-dashboard-bayit-9');
  const card = document.createElement('bayit-dashboard');
  card.setConfig(strategy.generate({}, hass).views[0].cards[0]);
  card.hass = hass;
  document.body.append(card);
</script>`;

function fixture(modulePath) {
  return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style>'
    + '<script type="module">import ' + JSON.stringify(modulePath) + ';' + app;
}

const fail = catalog.copper_dunes.photo.full;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const match = /^\/(hacsfiles|marketplace\/frontend)\/bayit-9\/([^/]+)$/.exec(url.pathname);
  if (match && match[2] !== fail && files.has(match[2])) {
    const {contentType, body} = files.get(match[2]);
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' });
    res.end(body);
  } else if (url.pathname.startsWith('/fixture/')) {
    const prefix = url.pathname.endsWith('marketplace') ? '/marketplace/frontend' : '/hacsfiles';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fixture(prefix + '/bayit-9/bayit-9.js?v=fixture'));
  } else {
    res.writeHead(404).end();
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

const origin = 'http://127.0.0.1:' + server.address().port;
const photoPath = (prefix, filename) => origin + prefix + '/bayit-9/' + filename;
const shellBackground = page => page.locator('.shell').evaluate(node => node.style.getPropertyValue('--bayit-wallpaper'));

try {
  for (const [engine, launcher, prefix, fixtureName] of [
    ['Chromium', chromium, '/hacsfiles', 'hacs'],
    ['WebKit', webkit, '/marketplace/frontend', 'marketplace'],
  ]) {
    const browser = await launcher.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      const requests = [];
      page.on('request', req => {
        if (req.url().endsWith('.webp')) requests.push(req.url());
      });
      await page.goto(origin + '/fixture/' + fixtureName);
      await page.locator('.shell[data-background=aurora]').waitFor();
      await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
      const gallery = page.locator('.wallpaper-gallery');
      assert.deepEqual(requests, []);
      await gallery.locator('summary').tap();
      assert.deepEqual(requests, []);
      await gallery.evaluate(element => {
        const rules = document.createElement('style');
        rules.textContent = '.wallpaper-options { max-height: 67px; overflow-y: auto; }';
        element.append(rules);
      });

      const firstPreview = photoPath(prefix, catalog.misty_lake.photo.preview);
      const firstPreviewLoaded = page.waitForResponse(res => res.url() === firstPreview && res.ok());
      await gallery.getByRole('button', { name: 'Photos', exact: true }).tap();
      await firstPreviewLoaded;
      assert.ok(requests.every(url => url.startsWith(origin + prefix) && url.includes('-preview-')));
      const copperPreview = photoPath(prefix, catalog.copper_dunes.photo.preview);
      assert.ok(!requests.includes(copperPreview), 'Off-screen photo previews should remain unloaded');
      const lastPreviewLoaded = page.waitForResponse(res => res.url() === copperPreview && res.ok());
      await gallery.locator('.wallpaper-options').evaluate(element => { element.scrollTop = element.scrollHeight; });
      await lastPreviewLoaded;
      await gallery.locator('.wallpaper-options').evaluate(element => { element.style.maxHeight = 'none'; });

      const mediterranean = photoPath(prefix, catalog.mediterranean_coast.photo.full);
      const activePhotoLoaded = page.waitForResponse(res => res.url() === mediterranean && res.ok());
      await gallery.getByRole('button', { name: 'Mediterranean coast', exact: true }).tap();
      await activePhotoLoaded;
      await page.waitForFunction(asset => document.querySelector('bayit-dashboard').shadowRoot.querySelector('.shell')
        .style.getPropertyValue('--bayit-wallpaper').includes(asset), mediterranean);
      await page.locator('.room[data-wallpaper-ink]').waitFor();
      await page.locator('.toolbar .chrome-button[data-wallpaper-ink]').first().waitFor();
      assert.deepEqual([...new Set(requests.filter(url => url.includes('-full-')))], [mediterranean]);

      const graphite = photoPath(prefix, catalog.graphite_and_bronze.photo.full);
      const started = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(graphite, async route => {
        started.resolve();
        await release.promise;
        await route.continue();
      });
      const late = page.waitForResponse(res => res.url() === graphite && res.ok());
      await gallery.getByRole('button', { name: 'Graphite and bronze', exact: true }).tap();
      await started.promise;
      assert.equal(await shellBackground(page), catalog.graphite_and_bronze.background);
      await gallery.getByRole('button', { name: 'Nature', exact: true }).tap();
      await gallery.getByRole('button', { name: 'Misty forest', exact: true }).tap();
      release.resolve();
      await (await late).finished();
      await page.unroute(graphite);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.ok(!(await shellBackground(page)).includes(graphite), 'A late image must not displace the new wallpaper');

      await gallery.getByRole('button', { name: 'Photos', exact: true }).tap();
      await page.evaluate(() => {
        HTMLCanvasElement.prototype.getContext = () => { throw new Error('Synthetic canvas denial'); };
      });
      await gallery.getByRole('button', { name: 'Graphite and bronze', exact: true }).tap();
      await page.waitForFunction(asset => document.querySelector('bayit-dashboard').shadowRoot.querySelector('.shell')
        .style.getPropertyValue('--bayit-wallpaper').includes(asset), graphite);
      assert.equal(await page.locator('.room[data-wallpaper-ink]').count(), 0);

      const missingPhoto = page.waitForResponse(res => res.url() === photoPath(prefix, fail) && res.status() === 404);
      await gallery.getByRole('button', { name: 'Copper dunes', exact: true }).tap();
      await missingPhoto;
      await page.locator('.shell[data-background=copper_dunes]').waitFor();
      assert.equal(await shellBackground(page), catalog.copper_dunes.background);

      await page.reload();
      await page.locator('.shell[data-background=copper_dunes]').waitFor();
      assert.equal(await shellBackground(page), catalog.copper_dunes.background);
      console.log(engine + ' verified deferred same-origin previews, adaptive ink, late-load guard and saved fallbacks');
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
