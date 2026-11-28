import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';

const files = new Map(await Promise.all(['wallpapers.js', 'wallpaper-catalog.js'].map(async name =>
  ['/' + name, await readFile(new URL('../src/' + name, import.meta.url))])));

const fixture = `<!doctype html><meta charset="utf-8">
<style>
  body { margin: 0; }
  .shell { position: relative; height: 100dvh; }
  .room { position: absolute; }
  .room-light-background { left: 8%; top: 16%; }
  .room-dark-background { right: 6%; bottom: 14%; }
</style>
<div class="shell">
  <div class="room room-light-background"><div class="room-title">Studio</div></div>
  <div class="room room-dark-background"><div class="room-title">Garden</div></div>
</div>
<script type="module">
  import { createWallpaperController, wallpaperStyles } from '/wallpapers.js';
  const style = document.createElement('style');
  style.textContent = wallpaperStyles;
  document.head.append(style);
  window.wallpaper = createWallpaperController(document.querySelector('.shell'));
  await wallpaper.apply('ink_on_paper');
</script>`;

const server = http.createServer((request, response) => {
  if (files.has(request.url)) {
    response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(files.get(request.url));
  } else if (request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html' }).end(fixture);
  } else {
    response.writeHead(404).end();
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

try {
  await runBrowserEngines([[chromium, 'Chromium'], [webkit, 'WebKit']], async (launcher, engine) => {
    const browser = await launcher.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 391, height: 845 }, hasTouch: true });
      if (engine === 'Chromium') {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setEmulatedMedia', { features: [
          { name: 'prefers-reduced-transparency', value: 'no-preference' },
          { name: 'prefers-contrast', value: 'no-preference' },
        ] });
      }
      await page.goto('http://127.0.0.1:' + server.address().port);
      await page.locator('.shell[data-background=ink_on_paper]').waitFor();
      const roomInks = () => page.locator('.room').evaluateAll(rooms => rooms.map(room => ({
        mode: room.dataset.wallpaperInk,
        text: getComputedStyle(room).color,
        fill: getComputedStyle(room).backgroundColor,
      })));
      const expected = [
        { mode: 'dark', text: 'rgb(0, 0, 0)', fill: 'rgba(0, 0, 0, 0)' },
        { mode: 'light', text: 'rgb(255, 255, 255)', fill: 'rgba(0, 0, 0, 0)' },
      ];
      assert.deepEqual(await roomInks(), expected);
      await page.setViewportSize({ width: 320, height: 710 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.deepEqual(await roomInks(), expected);
      await page.evaluate(() => wallpaper.apply('jade'));
      assert.ok((await roomInks()).every(room => room.mode === undefined));
      await page.evaluate(() => wallpaper.apply('ink_on_paper'));
      assert.deepEqual(await roomInks(), expected);
      await page.close();

      for (const blocked of ['context', 'pixels']) {
        const restricted = await browser.newPage({ viewport: { width: 391, height: 845 } });
        const errors = [];
        restricted.on('pageerror', error => errors.push(error.message));
        await restricted.addInitScript(mode => {
          if (mode === 'context') {
            HTMLCanvasElement.prototype.getContext = () => null;
          } else {
            CanvasRenderingContext2D.prototype.getImageData = () => { throw new DOMException('Blocked', 'SecurityError'); };
          }
        }, blocked);
        await restricted.goto('http://127.0.0.1:' + server.address().port);
        await restricted.locator('.shell[data-background=ink_on_paper][data-wallpaper-ink=dark]').waitFor();
        assert.deepEqual(errors, []);
        await restricted.evaluate(() => wallpaper.apply('jade'));
        assert.equal(await restricted.evaluate(() => wallpaper.apply('ink_on_paper')), true);
        assert.equal(await restricted.locator('.room[data-wallpaper-ink]').count(), 0);
        assert.equal(await restricted.locator('.shell').getAttribute('data-wallpaper-ink'), 'dark');
        await restricted.close();
      }
    } finally {
      await browser.close();
    }
  });
} finally {
  await new Promise(resolve => server.close(resolve));
}
