import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

const moduleSource = await readFile(new URL('../src/page-chrome.js', import.meta.url));
const fixture = `<!doctype html><meta charset="utf-8">
<body></body>
<script type="module">
import { createPageChrome, preparePageChrome } from '/page-chrome.js';

function shadow(host, html) {
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = html;
  return root;
}
const app = document.body.appendChild(document.createElement('home-assistant'));
const main = shadow(app, '<home-assistant-main></home-assistant-main>').firstElementChild;
const drawer = shadow(main, '<ha-drawer><ha-sidebar></ha-sidebar><partial-panel-resolver slot="appContent"><ha-panel-lovelace></ha-panel-lovelace></partial-panel-resolver></ha-drawer><style>:host{--mdc-drawer-width:56px}</style>').firstElementChild;
const drawerRoot = shadow(drawer, '<style>.app-content{padding-inline-start:56px}</style><div class="layout"><div class="sidebar-shell"><slot></slot></div><div class="app-content"><slot name="appContent"></slot></div></div>');
const panel = drawer.querySelector('ha-panel-lovelace');
panel.panel = { url_path: 'bayit-9' };
const huiRoot = shadow(panel, '<hui-root></hui-root>').firstElementChild;
const hui = shadow(huiRoot, '<style>:host{--safe-area-inset-top:12px}#view{display:block;padding-top:60px}</style><div class="narrow"><div class="header"><button>Edit dashboard</button></div><hui-view-container id="view"><hui-view><hui-panel-view></hui-panel-view></hui-view></hui-view-container></div>');
const cardParent = shadow(hui.querySelector('hui-panel-view'), '<div></div>').firstElementChild;
const card = document.createElement('bayit9-test-card');
shadow(card, '<dialog></dialog>');
const changes = [];
const chrome = createPageChrome(card, { onChange(hidden) { changes.push(hidden); } });
const settings = {
  enabled: true,
  hass: { panels: { 'bayit-9': { component_name: 'lovelace' } } },
};

function navigate(path) {
  history.replaceState(history.state, '', path);
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: true } }));
}
function state() {
  return [
    getComputedStyle(hui.querySelector('.header')).display,
    getComputedStyle(drawerRoot.querySelector('.sidebar-shell')).display,
    getComputedStyle(drawerRoot.querySelector('.app-content')).paddingInlineStart,
    getComputedStyle(hui.querySelector('#view')).paddingTop,
  ];
}
window.test = {
  app, card, cardParent, chrome, changes, drawer, drawerRoot, hui, huiRoot, panel, navigate, state,
  early: () => preparePageChrome(settings),
};
</script>`;
const server = http.createServer((request, response) => {
  if (request.url === '/page-chrome.js') {
    response.writeHead(200, { 'content-type': 'text/javascript' });
    response.end(moduleSource);
  } else {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(fixture);
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

const full = ['none', 'none', '0px', '12px'];
const native = ['block', 'block', '56px', '60px'];
try {
  for (const [engine, launcher] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await launcher.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error));
      await page.goto(`http://127.0.0.1:${server.address().port}/bayit-9/home?test=1#room`);
      await page.waitForFunction(() => window.test);
      const state = () => page.evaluate(() => window.test.state());
      const evaluate = fn => page.evaluate(fn);
      assert.deepEqual(await state(), native);

      await evaluate(() => test.early());
      assert.deepEqual(await state(), full);
      await evaluate(() => {
        test.cardParent.append(test.card);
        test.chrome.update({ enabled: true });
      });
      assert.deepEqual(await state(), full);
      assert.deepEqual(await evaluate(() => test.changes), [true]);
      assert.deepEqual(await evaluate(() => [test.chrome.showHomeAssistantMenu(), location.search, location.hash]),
        [true, '?test=1&disable_km=1', '#room']);
      assert.deepEqual(await state(), native);
      assert.equal(await evaluate(() => test.chrome.toggleHomeAssistantMenu()), true);
      assert.deepEqual(await state(), full);

      await evaluate(() => test.hui.querySelector('.narrow').classList.add('edit-mode'));
      assert.deepEqual(await state(), native);
      await evaluate(() => test.hui.querySelector('.narrow').classList.remove('edit-mode'));
      assert.deepEqual(await state(), full);
      await evaluate(() => test.navigate('/bayit-9/home?edit=1'));
      assert.deepEqual(await state(), native);
      await evaluate(() => test.navigate('/bayit-9/home'));
      assert.deepEqual(await state(), full);
      await evaluate(() => test.chrome.update({ enabled: true, editing: true }));
      assert.deepEqual(await state(), native);
      await evaluate(() => test.chrome.update({ enabled: true }));
      assert.deepEqual(await state(), full);

      await evaluate(() => {
        test.card.shadowRoot.querySelector('dialog').showModal();
      });
      assert.deepEqual(await state(), full);
      await evaluate(() => {
        test.card.shadowRoot.querySelector('dialog').close();
        test.drawer.setAttribute('open', '');
      });
      assert.deepEqual(await state(), native);
      await evaluate(() => test.drawer.removeAttribute('open'));
      assert.deepEqual(await state(), full);
      await evaluate(() => {
        window.dispatchEvent(new CustomEvent('show-dialog', { detail: { dialogTag: 'dialog-more-info' } }));
        history.replaceState({ dialog: 'dialog-more-info' }, '', location.href);
      });
      assert.deepEqual(await state(), native);
      await evaluate(() => {
        window.dispatchEvent(new CustomEvent('dialog-closed', { detail: { dialog: 'dialog-more-info' } }));
        history.replaceState({}, '', location.href);
      });
      await page.waitForFunction(() => test.state()[0] === 'none');
      assert.deepEqual(await state(), full);

      await evaluate(() => test.navigate('/another-dashboard/home'));
      assert.deepEqual(await state(), native);
      assert.equal(await evaluate(() => test.chrome.showHomeAssistantMenu()), false);
      await evaluate(() => {
        test.panel.panel = { url_path: 'another-dashboard' };
        test.navigate('/another-dashboard/0');
      });
      assert.deepEqual(await state(), native);
      await evaluate(() => { test.panel.panel = { url_path: 'bayit-9' }; });
      await evaluate(() => test.navigate('/bayit-9/a-subview'));
      assert.deepEqual(await state(), native);
      await evaluate(() => test.navigate('/bayit-9/0'));
      assert.deepEqual(await state(), full);
      await evaluate(() => {
        test.chrome.dispose();
        document.body.append(test.card);
        test.chrome.update({ enabled: true });
      });
      assert.deepEqual(await state(), native);
      await evaluate(() => {
        test.cardParent.append(test.card);
        test.chrome.update({ enabled: true });
        test.chrome.update({ enabled: false });
      });
      assert.deepEqual(await state(), native);

      await evaluate(() => {
        test.card.remove();
        test.navigate('/bayit-9/home?disable_km=1');
        test.early();
      });
      assert.deepEqual(await state(), native);
      await evaluate(() => {
        test.navigate('/bayit-9/home');
        test.early();
      });
      assert.deepEqual(await state(), full);
      await page.waitForFunction(() => test.state()[0] === 'block');
      assert.deepEqual(await state(), native);

      const legacy = () => evaluate(() => {
        const sidebar = test.drawerRoot.querySelector('.mdc-drawer');
        const content = test.drawerRoot.querySelector('.mdc-drawer-app-content');
        return [getComputedStyle(sidebar).display, getComputedStyle(content).paddingLeft];
      });
      await evaluate(() => {
        test.drawerRoot.innerHTML =
          '<style>.mdc-drawer-app-content{padding-left:var(--mdc-drawer-width)}</style>' +
          '<aside class="mdc-drawer"><slot></slot></aside><div class="mdc-drawer-app-content"><slot name="appContent"></slot></div>';
        test.cardParent.append(test.card);
        test.chrome.update({ enabled: true });
      });
      assert.deepEqual(await legacy(), ['none', '0px']);
      await evaluate(() => test.chrome.dispose());
      assert.deepEqual(await legacy(), ['block', '56px']);
      assert.deepEqual(errors, []);
      console.log(`${engine}: page chrome ownership, native recovery and cleanup passed`);
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
