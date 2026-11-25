import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

const moduleSource = await readFile(new URL('../src/page-chrome.js', import.meta.url));
const toolbarPressSource = await readFile(new URL('../src/popup-toolbar-press.js', import.meta.url));
const fixture = `<!doctype html><meta charset="utf-8">
<style>
#ha-launch-screen { position:fixed; inset:0; z-index:100; opacity:1; background:#111; transition:opacity 250ms ease-out; }
#ha-launch-screen.removing { opacity:0; }
</style>
<body></body>
<script type="module">
import { createPageChrome, isActiveDashboardPage, preparePageChrome } from '/page-chrome.js';
import { preserveToolbarPopupPress } from '/popup-toolbar-press.js';

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
if (new URLSearchParams(location.search).has('launch-toolbar')) {
  const splash = document.body.appendChild(document.createElement('div'));
  splash.id = 'ha-launch-screen';
  const popup = card.shadowRoot.querySelector('dialog');
  const received = { popup:[], device:0, link:0, recovery:0 };
  for (const kind of ['weather','settings','device','link']) {
    const button = card.shadowRoot.appendChild(document.createElement('button'));
    button.textContent = kind;
    button.style.cssText = 'width:60px;height:44px';
    if (kind === 'link' || kind === 'device') button.onclick = () => received[kind]++;
    else {
      button.onclick = () => { received.popup.push(kind); popup.showModal(); };
      preserveToolbarPopupPress(button, kind, kind, () => !popup.open, () => isActiveDashboardPage(card));
    }
  }
  cardParent.append(card);
  chrome.update({ enabled:true });
  test.launch = {
    splash, popup, received,
    fade(opacity, removing) {
      splash.style.transitionDuration = '0s';
      splash.classList.toggle('removing', removing);
      splash.style.opacity = opacity;
    },
  };
}
</script>`;
const server = http.createServer((request, response) => {
  if (request.url === '/page-chrome.js') {
    response.writeHead(200, { 'content-type': 'text/javascript' });
    response.end(moduleSource);
  } else if (request.url === '/popup-toolbar-press.js') {
    response.writeHead(200, { 'content-type': 'text/javascript' });
    response.end(toolbarPressSource);
  } else {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(fixture);
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

const full = ['none', 'none', '0px', '12px'];
const native = ['block', 'block', '56px', '60px'];
async function assertLaunchToolbarPress(browser, base) {
  const page = await browser.newPage({ viewport:{width:390,height:844}, hasTouch:true });
  try {
    const url = base + '/bayit-9/home?launch-toolbar=1';
    await page.goto(url);
    await page.waitForFunction(() => window.test?.launch);
    const point = async name => {
      const box = await page.getByRole('button',{name,exact:true}).boundingBox();
      return {x:box.x+box.width/2,y:box.y+box.height/2};
    };
    const activate = async (name, touch = false) => {
      const at = await point(name);
      if (touch) await page.touchscreen.tap(at.x,at.y);
      else await page.mouse.click(at.x,at.y);
    };
    const fade = (opacity, removing) => page.evaluate(
      ({opacity,removing}) => test.launch.fade(opacity, removing), {opacity,removing});
    const events = () => page.evaluate(() => test.launch.received);
    const assertNoActivation = async () => {
      await page.waitForTimeout(45);
      assert.deepEqual(await events(), { popup:[], device:0, link:0, recovery:0 });
    };

    await fade(.18,false);
    await activate('weather');
    await assertNoActivation();
    await fade(.6,true);
    const start = await point('weather');
    await page.mouse.move(start.x,start.y);
    await page.mouse.down();
    await fade(.18,true);
    await page.mouse.up();
    await assertNoActivation();

    await activate('device',true);
    await activate('link');
    await assertNoActivation();
    await page.evaluate(at => {
      for (const type of ['pointerdown','pointerup']) test.launch.splash.dispatchEvent(new PointerEvent(type, {
        bubbles:true, isPrimary:true, pointerType:'mouse', pointerId:1, button:0, clientX:at.x, clientY:at.y,
      }));
    }, start);
    await assertNoActivation();
    await page.mouse.move(start.x,start.y);
    await page.mouse.down();
    await page.mouse.move(start.x+18,start.y);
    await page.mouse.move(start.x,start.y);
    await page.mouse.up();
    await assertNoActivation();

    await page.evaluate(() => {
      const shield = document.body.appendChild(document.createElement('div'));
      shield.id='second-overlay';
      shield.style.cssText='position:fixed;inset:0;z-index:99';
    });
    await activate('weather');
    await assertNoActivation();
    await page.evaluate(() => {
      document.getElementById('second-overlay').remove();
      test.navigate('/bayit-9/home?launch-toolbar=1&edit=1');
    });
    await activate('weather');
    await assertNoActivation();
    await page.evaluate(() => test.navigate('/another-dashboard/home?launch-toolbar=1'));
    await activate('weather');
    await assertNoActivation();
    await page.evaluate(url => test.navigate(url), url);

    await page.evaluate(at => {
      const recovery = test.launch.splash.appendChild(document.createElement('button'));
      recovery.textContent='Recovery';
      recovery.style.cssText='position:fixed;left:'+(at.x-20)+'px;top:'+(at.y-16)+'px;width:40px;height:32px';
      recovery.onclick=()=>test.launch.received.recovery++;
    }, await point('weather'));
    await activate('weather');
    assert.deepEqual(await events(), { popup:[], device:0, link:0, recovery:1 });
    await page.evaluate(() => test.launch.splash.querySelector('button').remove());

    for (const [name,touch] of [['weather',true],['settings',false]]) {
      const at = await point(name);
      assert.equal(await page.evaluate(at => document.elementFromPoint(at.x,at.y).id,at),'ha-launch-screen');
      await activate(name,touch);
      await page.waitForFunction(() => test.launch.popup.open);
      assert.deepEqual(await page.evaluate(() => [
        getComputedStyle(test.launch.splash).pointerEvents, getComputedStyle(test.launch.splash).opacity,
      ]), ['auto','0.18']);
      await page.evaluate(() => test.launch.popup.close());
    }
    const duringRemoval = await point('weather');
    await page.mouse.move(duringRemoval.x,duringRemoval.y);
    await page.mouse.down();
    await page.evaluate(() => test.launch.splash.remove());
    await page.mouse.up();
    await page.waitForFunction(() => test.launch.popup.open);
    await page.evaluate(() => test.launch.popup.close());
    await activate('weather');
    await page.waitForFunction(() => test.launch.popup.open);
    assert.deepEqual(await events(), { popup:['weather','settings','weather','weather'], device:0, link:0, recovery:1 });
  } finally {
    await page.close();
  }
}

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
      await assertLaunchToolbarPress(browser, 'http://127.0.0.1:' + server.address().port);
      console.log(engine + ': trusted launch-screen presses reach only the visible toolbar popup');
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
