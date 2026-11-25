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
  const shared = location.pathname.startsWith('/fixture-shared/');
  const initial = {
    type: 'custom:bayit-9', background: 'aurora', shared_wallpapers: [
      { id:'shared-garden', name:'Garden photo', path:'/local/fixture/garden.webp', preview:'/local/fixture/garden-small.webp' },
      { id:'shared-missing', name:'Missing photo', path:'/local/fixture/missing.webp' },
      { id:'shared-redirect', name:'Redirected photo', path:'/local/fixture/redirect.webp' },
    ],
  };
  const config = () => ({ strategy:shared ? JSON.parse(sessionStorage.getItem('shared-fixture') || JSON.stringify(initial)) : {} });
  const hass = {
    user: { is_admin: shared },
    locale: { language: 'en' },
    states: { 'light.studio': { state: 'off', attributes: { friendly_name: 'Studio light' } } },
    entities: { 'light.studio': { area_id: 'studio' } },
    areas: { studio: { area_id: 'studio', name: 'Studio' } },
    async callWS(request) {
      if (request.type === 'lovelace/dashboards/list') return [{ url_path:'fixture-shared', mode:'storage' }];
      if (request.type === 'lovelace/config') return config();
      if (request.type === 'lovelace/config/save') {
        sessionStorage.setItem('shared-fixture',JSON.stringify(request.config.strategy));
        return {};
      }
      return {};
    },
  };
  const strategy = customElements.get('ll-strategy-dashboard-bayit-9');
  const card = document.createElement('bayit-dashboard');
  card.setConfig(strategy.generate(config().strategy, hass).views[0].cards[0]);
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
  } else if (['/local/fixture/garden.webp','/local/fixture/garden-small.webp','/local/fixture/night.webp'].includes(url.pathname)) {
    const item = catalog.misty_lake.photo;
    const { contentType, body } = files.get(url.pathname.endsWith('-small.webp') ? item.preview : item.full);
    res.writeHead(200, { 'Content-Type':contentType });
    res.end(body);
  } else if (url.pathname === '/local/fixture/redirect.webp') {
    res.writeHead(302, { Location:'/redirect-trap.webp' }).end();
  } else if (url.pathname.startsWith('/fixture/') || url.pathname.startsWith('/fixture-shared/')) {
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

async function assertSharedRevision(browser, fixtureName, byModifiedDate) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const path = '/local/fixture/garden.webp';
  const shared = { type: 'custom:bayit-9', background: 'shared-garden',
    shared_wallpapers: [{ id: 'shared-garden', name: 'Garden photo', path }] };
  const operations = [];
  let revision = 1;
  let mode;
  let release;
  try {
    page.setDefaultTimeout(10000);
    await page.clock.install();
    await page.addInitScript(config => {
      sessionStorage.setItem('shared-fixture', JSON.stringify(config));
      window.fixtureVisibility = 'visible';
      Object.defineProperty(document, 'visibilityState', { get: () => window.fixtureVisibility });
      window.revokedPhotos = [];
      const revoke = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = value => { window.revokedPhotos.push(value); revoke(value); };
    }, shared);
    const photos = await page.evaluate(() => ['rgb(35, 66, 105)', 'rgb(40, 140, 78)'].map(color => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 16;
      const context = canvas.getContext('2d');
      context.fillStyle = color;
      context.fillRect(0, 0, 16, 16);
      return canvas.toDataURL().split(',')[1];
    }));
    await page.route('**' + path, async route => {
      const method = route.request().method();
      operations.push(method);
      const headers = mode === 'missing-validator' ? {} : byModifiedDate
        ? { 'Last-Modified': new Date(Date.UTC(2026, 10, revision)).toUTCString() }
        : { ETag: '"fixture-' + revision + '"' };
      if (method === 'HEAD') return route.fulfill({ status: 200, headers, body: '' });
      if (mode === 'held') await new Promise(resolve => { release = resolve; });
      const body = mode === 'broken' ? Buffer.from('invalid image') : Buffer.from(photos[revision === 1 ? 0 : 1], 'base64');
      try { await route.fulfill({ status: 200, headers, contentType: 'image/png', body }); } catch { /* Cancelled by selection. */ }
    });
    await page.goto(origin + '/fixture-shared/' + fixtureName);
    await page.locator('.shell[data-background=shared-garden]').waitFor();
    const colorAtCenter = () => page.locator('.shell').evaluate(async node => {
      const url = node.style.getPropertyValue('--bayit-wallpaper').match(/url\("([^"]+)"\)/)[1];
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      return Array.from(context.getImageData(8, 8, 1, 1).data);
    });
    assert.deepEqual(await colorAtCenter(), [35, 66, 105, 255]);
    const burst = state => page.evaluate(visibility => {
      window.fixtureVisibility = visibility;
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('focus'));
    }, state);
    const recheck = async () => {
      const head = page.waitForResponse(response => response.url().endsWith(path) && response.request().method() === 'HEAD');
      await burst('visible');
      await page.clock.fastForward(2400);
      await head;
    };

    await burst('hidden');
    await page.clock.fastForward(2400);
    assert.deepEqual(operations, ['GET']);
    revision = 2;
    const before = await shellBackground(page);
    await recheck();
    await page.waitForFunction(previous => document.querySelector('bayit-dashboard').shadowRoot.querySelector('.shell')
      .style.getPropertyValue('--bayit-wallpaper') !== previous, before);
    assert.deepEqual(await colorAtCenter(), [40, 140, 78, 255]);
    const valid = await shellBackground(page);
    assert.deepEqual(operations, ['GET', 'HEAD', 'GET'], 'The return events coalesce into one check and one fresh download');
    assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem('shared-fixture'))), shared);
    assert.equal(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('bayit-9.preferences.'))), false);

    await recheck();
    assert.equal(await shellBackground(page), valid);
    assert.deepEqual(operations, ['GET', 'HEAD', 'GET', 'HEAD'], 'An unchanged revision does not download another image');
    mode = 'missing-validator';
    await recheck();
    assert.equal(await shellBackground(page), valid);
    assert.equal(operations.at(-1), 'HEAD');
    assert.equal(operations.filter(method => method === 'GET').length, 2);

    revision = 3;
    mode = 'broken';
    const revoked = await page.evaluate(() => window.revokedPhotos.length);
    await recheck();
    await page.waitForFunction(previous => window.revokedPhotos.length > previous, revoked);
    assert.equal(await shellBackground(page), valid);
    assert.deepEqual(await colorAtCenter(), [40, 140, 78, 255]);

    revision = 4;
    mode = 'held';
    const request = page.waitForRequest(value => value.url().endsWith(path) && value.method() === 'GET');
    await recheck();
    await request;
    await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
    const gallery = page.locator('.wallpaper-gallery');
    await gallery.locator('summary').tap();
    await gallery.getByRole('button', { name: 'Nature', exact: true }).tap();
    await gallery.getByRole('button', { name: catalog.aurora.en, exact: true }).tap();
    await page.locator('.shell[data-background=aurora]').waitFor();
    release?.();
    const count = operations.length;
    await burst('visible');
    await page.clock.fastForward(2400);
    assert.equal(operations.length, count, 'A built-in selection receives no shared-file checks');
    assert.doesNotMatch(await shellBackground(page), /blob:/, 'The late download cannot replace a newer selection');
  } finally {
    release?.();
    await page.close();
  }
}

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
      assert.ok((await gallery.locator('.wallpaper-current-preview').evaluate(node => getComputedStyle(node).backgroundImage))
        .includes(mediterranean), 'The closed-row swatch uses the active wallpaper');
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
      await page.close();

      const family = await browser.newPage({ viewport:{ width:390, height:844 }, hasTouch:true, reducedMotion:'reduce' });
      family.setDefaultTimeout(10000);
      await family.emulateMedia({ contrast:'no-preference' });
      if (engine === 'Chromium') {
        const cdp = await family.context().newCDPSession(family);
        await cdp.send('Emulation.setEmulatedMedia', { features:[
          { name:'prefers-reduced-transparency', value:'no-preference' },
          { name:'prefers-contrast', value:'no-preference' },
        ] });
      }
      const appearance = family.getByRole('dialog',{ name:'Appearance', exact:true });
      const openSettings = async () => {
        if (!await appearance.isVisible()) await family.getByRole('button',{ name:'Appearance', exact:true }).tap();
        await appearance.waitFor();
      };
      const userFiles = [];
      family.on('request', req => {
        if (req.url().includes('/local/') || req.url().endsWith('/redirect-trap.webp')) userFiles.push(new URL(req.url()).pathname);
      });
      await family.goto(origin + '/fixture-shared/' + fixtureName);
      await family.locator('.shell[data-background=aurora]').waitFor();
      const splitPhoto = await family.evaluate(() => {
        const image = document.createElement('canvas');
        image.width = 390;
        image.height = 844;
        const context = image.getContext('2d');
        context.fillStyle = '#dbe4ee';
        context.fillRect(0, 0, 195, 844);
        context.fillStyle = '#19252f';
        context.fillRect(195, 0, 195, 844);
        return image.toDataURL('image/png').split(',')[1];
      });
      await family.route('**/local/fixture/garden.webp', route => route.fulfill({
        contentType: 'image/png', body: Buffer.from(splitPhoto, 'base64'),
      }));
      await family.getByRole('button',{ name:'Appearance', exact:true }).tap();
      const familyGallery = family.locator('.wallpaper-gallery');
      await familyGallery.locator('summary').tap();
      assert.deepEqual(userFiles,[]);
      const previewRequest = family.waitForResponse(res => res.url().endsWith('garden-small.webp') && res.ok());
      await familyGallery.getByRole('button',{name:'Shared photos',exact:true}).tap();
      await previewRequest;
      assert.ok(!userFiles.includes('/local/fixture/garden.webp'), 'The supplied miniature should load without the full photo');
      const garden = familyGallery.getByRole('button',{name:'Garden photo',exact:true});
      await garden.tap();
      await family.locator('.shell[data-background=shared-garden]').waitFor();
      assert.match(await shellBackground(family), /blob:/);
      const room = family.locator('.room[data-wallpaper-ink=dark]');
      await room.waitFor();
      await family.locator('.toolbar .chrome-button[data-wallpaper-ink=dark]').first().waitFor();
      await family.locator('.toolbar .chrome-button[data-wallpaper-ink=light]').first().waitFor();
      const colors = await room.evaluate(room => {
        const root = room.getRootNode();
        const color = element => getComputedStyle(element).color;
        const toolbar = mode => root.querySelector('.toolbar .chrome-button[data-wallpaper-ink=' + mode + '] > ha-icon');
        const shell = root.querySelector('.shell').getBoundingClientRect();
        const card = room.getBoundingClientRect();
        const split = shell.left + shell.width / 2;
        const name = room.querySelector('.room-name');
        const title = document.createRange();
        title.selectNodeContents(name);
        return {
          reduced: matchMedia('(prefers-reduced-transparency: reduce)').matches,
          spansBothHalves: card.left < split && card.right > split,
          titleOnLightSide: title.getBoundingClientRect().right < split,
          values: [color(name), color(room.querySelector('.quick-button > ha-icon')),
            color(toolbar('dark')), color(toolbar('light'))],
        };
      });
      const white = 'rgb(255, 255, 255)';
      const dark = 'rgb(16, 18, 23)';
      if (engine === 'Chromium') assert.equal(colors.reduced, false);
      assert.ok(colors.spansBothHalves && colors.titleOnLightSide, 'The full-width card crosses the split, but the title is on the light half');
      assert.deepEqual(colors.values, colors.reduced ? [dark, 'rgb(32, 36, 43)', dark, white] : [dark, white, white, white]);
      for (const name of ['Missing photo','Redirected photo']) {
        await familyGallery.getByRole('button',{name,exact:true}).tap();
        await familyGallery.getByText('Could not load this wallpaper.',{exact:true}).waitFor();
        assert.equal(await garden.getAttribute('aria-pressed'),'true');
      }
      assert.ok(!userFiles.includes('/redirect-trap.webp'), 'The shared wallpaper cannot follow an HTTP redirect');
      assert.equal(await family.locator('.appearance-layout').getAttribute('open'),null);
      await family.getByRole('button',{name:'Save as household defaults',exact:true}).tap();
      await family.waitForFunction(() => JSON.parse(sessionStorage.getItem('shared-fixture') ?? '{}').background === 'shared-garden');
      await family.evaluate(() => localStorage.clear());
      await family.reload();
      await family.locator('.shell[data-background=shared-garden]').waitFor();

      await openSettings();
      await family.getByRole('button',{name:'Customize home',exact:true}).tap();
      const setup = family.getByRole('dialog',{name:'Customize home',exact:true});
      await setup.getByText('Appearance',{exact:true}).tap();
      await setup.getByText('Shared photos',{exact:true}).tap();
      const photoName = setup.getByLabel('Photo name',{exact:true});
      const photoField = setup.getByLabel('Local image path',{exact:true});
      await photoName.fill('Night photo');
      await photoField.fill('https://elsewhere.example/night.webp');
      await setup.getByRole('button',{name:'Add photo',exact:true}).tap();
      assert.equal(await photoField.evaluate(field => field.checkValidity()),false);
      await photoField.fill('/local/fixture/night.webp');
      await setup.getByRole('button',{name:'Add photo',exact:true}).tap();
      const addedId = await setup.getByLabel('Shared wallpaper',{exact:true}).inputValue();
      assert.match(addedId,/^shared-/);
      await setup.getByLabel('Wallpaper',{exact:true}).selectOption(addedId);
      await setup.getByRole('button',{name:'Save dashboard',exact:true}).tap();
      await setup.waitFor({state:'hidden'});
      await family.reload();
      await family.locator('.shell[data-background="' + addedId + '"]').waitFor();
      const saved = await family.evaluate(() => JSON.parse(sessionStorage.getItem('shared-fixture')));
      assert.equal(saved.background,addedId);
      assert.deepEqual(saved.shared_wallpapers.find(item=>item.id===addedId),
        { id:addedId, name:'Night photo', path:'/local/fixture/night.webp' });
      await openSettings();
      await family.getByRole('button',{name:'Customize home',exact:true}).tap();
      await setup.getByText('Appearance',{exact:true}).tap();
      await setup.getByText('Shared photos',{exact:true}).tap();
      await setup.getByLabel('Shared wallpaper',{exact:true}).selectOption(addedId);
      await setup.getByRole('button',{name:'Remove photo',exact:true}).tap();
      await setup.getByRole('button',{name:'Save dashboard',exact:true}).tap();
      await setup.waitFor({state:'hidden'});
      await family.reload();
      await family.locator('.shell[data-background=aurora]').waitFor();
      assert.ok(!(await shellBackground(family)).includes('blob:'));
      await family.close();
      console.log(engine + ' verified shared photo gallery, safe local paths, household save and editor add/remove');
      await assertSharedRevision(browser, fixtureName, engine === 'WebKit');
      console.log(engine + ' verified shared revision refresh, one HEAD per return, failed decode, and late-choice safety');
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
