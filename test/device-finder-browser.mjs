import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

const source = await readFile(new URL('../src/device-finder.js', import.meta.url));
const fixture = `<!doctype html>
<html lang="he" dir="rtl" style="color-scheme:dark"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px system-ui; background: #293f3a; color: white; }
  [hidden] { display: none !important; }
  #modal { margin: 12px; padding: 10px; border: 1px solid #738881; border-radius: 24px; }
  ha-icon { display: inline-block; width:20px; height:20px; }
</style>
<main id="modal"></main>
<script type="module">
import { createDeviceFinder } from '/finder.js';
const rooms = [{ id: 'kitchen', name: 'מטבח' }, { id: 'garden', name: 'גינה' }];
const devices = [
  { room: 'kitchen', entity: 'cover.kitchen', name: 'תריס שמאל', available: false },
  { room: 'garden', entity: 'light.garden', name: 'מנורת גינה' },
  ...Array.from({length: 30}, (_, i) => ({ room:'garden', entity:'light.garden_' + i, name:'מנורה ' + i })),
];
let finder;
window.opens = [];
window.mount = (userId, scope = 'bayit-home') => {
  finder?.dispose();
  finder = createDeviceFinder({ ownerDocument: document, locale: 'he', scope, userId,
    getEntries: () => ({ rooms, devices }),
    onRoom: (room, source) => opens.push([room, source.isConnected]),
    onDevice: (room, entity, source) => opens.push([room, entity, source.isConnected]),
  });
  document.querySelector('#modal').replaceChildren(finder.element);
};
window.dropCover = () => {
  devices.shift();
  finder.refresh();
};
mount('alice');
</script>`;

const server = http.createServer((request, response) => {
  const module = request.url === '/finder.js';
  response.setHeader('Content-Type', module ? 'text/javascript' : 'text/html; charset=utf-8');
  response.end(module ? source : fixture);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

try {
  for (const launcher of [chromium, webkit]) {
    const browser = await launcher.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const address = 'http://127.0.0.1:' + server.address().port;
      await page.goto(address);
      const search = page.getByRole('searchbox', { name: 'חיפוש חדר או מכשיר' });
      const favorites = page.getByRole('button', { name: 'מועדפים', exact: true });
      const all = page.getByRole('button', { name: 'הכול', exact: true });
      const open = page.locator('.device-finder-open');
      const cover = open.filter({ hasText: 'תריס שמאל' });
      const pinCover = page.getByRole('button', { name: 'מועדף · תריס שמאל · מטבח' });

      await search.waitFor();
      assert.equal(await open.count(), 24, 'long inventory is paged');
      await page.getByRole('button', { name: 'הצגת פריטים נוספים' }).click();
      assert.equal(await open.count(), 34, 'show more exposes the remaining destinations');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 375);
      assert.ok((await pinCover.boundingBox()).width >= 44);
      await search.fill('תריס במטבח');
      assert.equal(await open.count(), 1);
      assert.match(await cover.innerText(), /לא זמין/);
      await cover.click();
      assert.deepEqual(await page.evaluate(() => opens), [['kitchen', 'cover.kitchen', true]]);
      await pinCover.click();
      assert.equal(await pinCover.getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await page.evaluate(() => opens), [['kitchen', 'cover.kitchen', true]], 'pinning does not open or call a device');
      await page.getByRole('button', { name: 'ניקוי החיפוש' }).click();
      assert.equal(await search.inputValue(), '');
      await favorites.click();
      assert.equal(await open.count(), 1);

      await page.reload();
      await favorites.click();
      assert.equal(await open.count(), 1, 'favorites survive a reload');
      await page.evaluate(() => mount('bob'));
      await favorites.click();
      assert.equal(await open.count(), 0, 'favorites are isolated per user');
      await page.evaluate(() => mount('alice', 'another-dashboard'));
      await favorites.click();
      assert.equal(await open.count(), 0, 'favorites are isolated per dashboard');
      await page.evaluate(() => mount('alice'));
      await favorites.click();
      assert.equal(await open.count(), 1);
      await page.evaluate(() => dropCover());
      assert.equal(await open.count(), 0, 'a removed entry cannot leak through favorites');
      await all.click();
      await open.filter({ hasText: /^מטבח$/ }).click();
      assert.deepEqual(await page.evaluate(() => opens), [['kitchen', true]]);
      assert.deepEqual(errors, []);
      console.log('PASS ' + launcher.name() + ' mobile finder and favorites');
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}
