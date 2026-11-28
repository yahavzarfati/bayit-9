import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';

const homes = [
  {
    key: 'rental-flat', locale: 'en', domain: 'light', service: 'turn_on', roomId: 'den', room: 'Den', renamed: 'Reading room', otherRoom: 'Kitchen',
    first: 'Den lamp', second: 'Reading light', newName: 'Floor lamp', alias: 'stand lamp',
    otherDevice: 'Kitchen pendant', hidden: 'Diagnostic lamp', finder: 'Find rooms and devices',
    search: 'Search rooms and devices', favorite: 'Favorite', favorites: 'Favorites',
    settings: 'Appearance', setup: 'Customize home', rooms: 'Rooms', roomPicker: 'Room to customize',
    displayName: 'Room display name', save: 'Save dashboard', close: 'Close', group: 'Turn on room lights',
    confirmTitle: 'Confirm action', confirm: 'Confirm', cancel: 'Cancel',
  },
  {
    key: 'garden-house', locale: 'he', domain: 'cover', service: 'open_cover', roomId: 'patio', room: 'מרפסת', renamed: 'מרפסת קדמית', otherRoom: 'מטבח',
    first: 'תריס מרפסת', second: 'וילון חוץ', newName: 'תריס מעקה', alias: 'וילון צמוד',
    otherDevice: 'תריס מטבח', hidden: 'תריס כיול', finder: 'חיפוש חדרים ומכשירים',
    search: 'חיפוש חדר או מכשיר', favorite: 'מועדף', favorites: 'מועדפים',
    settings: 'מראה', setup: 'התאמת הבית', rooms: 'חדרים', roomPicker: 'חדר להתאמה אישית',
    displayName: 'שם החדר לתצוגה', save: 'שמירת הדשבורד', close: 'סגירה', group: 'פתיחת תריסים בחדר',
    confirmTitle: 'אישור פעולה', confirm: 'אישור', cancel: 'ביטול',
  },
];

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));

function fixture(home) {
  return `<!doctype html>
<html lang="${home.locale}"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;font:16px system-ui}bayit-dashboard{width:100%}</style>
<main></main>
<script type="module">
import '/bayit-9.js';
const home = ${JSON.stringify(home)};
const strategy = customElements.get('ll-strategy-dashboard-bayit-9');
let card = document.createElement('bayit-dashboard');
const configKey = 'dwains-bayit-acceptance/' + home.key;
const first = home.domain + '.' + home.roomId + '_one';
const second = home.domain + '.' + home.roomId + '_two';
const later = home.domain + '.' + home.roomId + '_new';
const other = home.domain + '.kitchen_' + home.roomId;
const hidden = home.domain + '.calibration_' + home.roomId;
const garage = 'cover.patio_garage';
const defaultConfig = { strategy: { type:'custom:bayit-9' } };
const saved = () => JSON.parse(sessionStorage.getItem(configKey)) ?? defaultConfig;
const equipment = (name, deviceClass = 'curtain') => home.domain === 'cover'
  ? { state:'closed', attributes:{ friendly_name:name, supported_features:3, device_class:deviceClass, current_position:0 } }
  : { state:'off', attributes:{ friendly_name:name, supported_color_modes:['onoff'] } };
let hass = {
  connected:true, connection:{ connected:true }, language:home.locale, locale:{ language:home.locale },
  user:{ is_admin:true, id:'fixture-admin' },
  areas:{ [home.roomId]:{name:home.room}, kitchen:{name:home.otherRoom} },
  devices:{ native_bridge:{name:'Fixture bridge',area_id:home.roomId} },
  entities:{ [first]:{area_id:home.roomId}, [second]:{device_id:'native_bridge'}, [other]:{area_id:'kitchen'},
    [hidden]:{area_id:home.roomId,hidden_by:'user'},
    ...(home.domain === 'cover' && { [garage]:{area_id:home.roomId} }) },
  states:{ [first]:equipment(home.first, 'shutter'), [second]:equipment(home.second), [other]:equipment(home.otherDevice),
    [hidden]:equipment(home.hidden), ...(home.domain === 'cover' && { [garage]:equipment('דלת מוסך', 'garage') }) },
  services:{ light:{turn_on:{},turn_off:{}}, cover:{open_cover:{},close_cover:{}} },
  async callWS(request) {
    if (request.type === 'config/entity_registry/get_entries') {
      if (request.entity_ids.includes(hidden)) throw new Error('Finder requested hidden metadata');
      return Object.fromEntries(request.entity_ids.map(id => [id, id === later ? { aliases:[home.alias] } : null]));
    }
    if (request.type === 'lovelace/dashboards/list') return [{mode:'storage',url_path:home.key}];
    if (request.type === 'lovelace/config' && request.url_path === home.key) return structuredClone(saved());
    if (request.type === 'lovelace/config/save' && request.url_path === home.key) {
      sessionStorage.setItem(configKey, JSON.stringify(request.config));
      return {};
    }
    if (request.type === 'call_service' && request.domain === home.domain && request.service === home.service) {
      const entity = request.target.entity_id;
      if (typeof entity !== 'string' || !hass.states[entity]) throw new Error('Unexpected fixture target');
      services.push(structuredClone(request));
      const changed = { ...hass.states[entity], state:home.domain === 'cover' ? 'open' : 'on' };
      if (home.domain === 'cover') changed.attributes = {...changed.attributes,current_position:100};
      hass = {...hass, states:{...hass.states, [entity]:changed}};
      card.hass = hass;
      return {};
    }
    throw new Error('Unexpected fixture request: ' + request.type);
  },
};
const services = [];
const config = saved().strategy;
function paint() {
  card.setConfig(strategy.generate(config, hass).views[0].cards[0]);
  card.hass = hass;
}
window.fixture = {
  strategy:() => saved().strategy,
  services,
  discover() {
    const previous = hass;
    hass = {...hass, entities:{...hass.entities, [later]:{device_id:'native_bridge'}},
      states:{...hass.states,[later]:equipment(home.newName)}};
    const regenerated = strategy.shouldRegenerate(config, previous, hass);
    if (regenerated) {
      const previousCard = card;
      card = document.createElement('bayit-dashboard');
      paint();
      previousCard.replaceWith(card);
    }
    return regenerated;
  },
};
paint();
document.querySelector('main').append(card);
</script>`;
}

const server = http.createServer(async (request, response) => {
  const path = new URL(request.url, 'http://fixture.invalid').pathname;
  if (path === '/bayit-9.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    return response.end(bundle);
  }
  if (/^\/bayit9-wallpaper-[a-z0-9-]+\.webp$/.test(path)) {
    try {
      const wallpaper = await readFile(new URL('../dist' + path, import.meta.url));
      response.setHeader('Content-Type', 'image/webp');
      return response.end(wallpaper);
    } catch {}
  }
  const home = homes.find(item => path === '/' + item.key + '/home');
  if (!home) {
    response.statusCode = 404;
    return response.end();
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(fixture(home));
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = 'http://127.0.0.1:' + server.address().port;

try {
  await runBrowserEngines([[chromium], [webkit]], async launcher => {
    const browser = await launcher.launch();
    try {
      for (const home of homes) {
        const page = await browser.newPage({ viewport:{ width:390,height:844 }, locale:home.locale,
          isMobile:true, hasTouch:true, reducedMotion:'reduce' });
        page.setDefaultTimeout(8000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
          await page.route(/https?:\/\//, route => new URL(route.request().url()).origin === origin
            ? route.continue() : route.abort());
          await page.goto(origin + '/' + home.key + '/home');
          const button = name => page.getByRole('button', { name, exact:true });
          const dialog = name => page.getByRole('dialog', { name, exact:true });
          const settings = () => button(home.settings).tap();
          const serviceCalls = () => page.evaluate(() => window.fixture.services);

          await button(home.room).waitFor();
          await button(home.otherRoom).waitFor();
          assert.deepEqual(await page.evaluate(() => window.fixture.strategy()), { type:'custom:bayit-9' });
          await settings();
          await button(home.setup).tap();
          const setup = dialog(home.setup);
          await setup.getByText(home.rooms, { exact:true }).tap();
          await setup.getByLabel(home.roomPicker, { exact:true }).selectOption(home.roomId);
          const name = setup.getByLabel(home.displayName, { exact:true });
          await name.fill(home.renamed);
          await name.press('Tab');
          await Promise.all([page.waitForEvent('framenavigated'),
            setup.getByRole('button', { name:home.save, exact:true }).tap()]);
          await button(home.renamed).waitFor();
          const override = (await page.evaluate(() => window.fixture.strategy())).room_overrides[home.roomId];
          assert.equal(override.name, home.renamed);
          assert.equal(override.entities, undefined, 'renaming an area retains automatic device discovery');
          assert.deepEqual(await serviceCalls(), []);

          await settings();
          await button(home.finder).tap();
          const finder = dialog(home.finder);
          const search = finder.getByRole('searchbox', { name:home.search, exact:true });
          const rows = finder.locator('.device-finder-open');
          await search.fill(home.hidden);
          assert.equal(await rows.count(), 0, 'registry-hidden device is excluded');
          await search.fill(home.alias);
          const devices = finder.locator('.device-finder-filters button').nth(2);
          await devices.tap();
          assert.equal(await page.evaluate(() => window.fixture.discover()), true);
          await finder.waitFor();
          assert.equal(await search.inputValue(), home.alias, 'the query survives a native dashboard remount');
          assert.equal(await devices.getAttribute('aria-pressed'), 'true', 'the filter survives a native dashboard remount');
          await rows.waitFor();
          assert.equal(await rows.count(), 1, 'the new registry alias is searchable after a saved room edit');
          assert.ok((await rows.innerText()).includes(home.newName));
          const pin = home.favorite + ' · ' + home.newName + ' · ' + home.renamed;
          await finder.getByRole('button', {name:pin,exact:true}).tap();
          await finder.getByRole('button', {name:home.favorites,exact:true}).tap();
          await rows.tap();
          const details = dialog(home.newName);
          await details.waitFor();
          assert.equal(new URL(page.url()).hash, '#device/' + home.roomId + '/' + home.domain + '.' + home.roomId + '_new');
          assert.deepEqual(await serviceCalls(), [], 'navigation and starring have no device side effects');
          await details.getByRole('button', { name:home.close, exact:true }).tap();
          await details.waitFor({state:'hidden'});

          await button(home.renamed).tap();
          const room = dialog(home.renamed);
          if (home.domain === 'cover') {
            await room.locator('.device[data-entity="cover.patio_garage"]').waitFor();
          }
          const group = room.getByRole('button', {name:home.group,exact:true});
          await group.tap();
          const confirmation = dialog(home.confirmTitle);
          const confirmScope = await confirmation.innerText();
          assert.match(confirmScope, /(?<![0-9])3(?![0-9])/, 'only the three eligible devices are counted');
          assert.deepEqual(await serviceCalls(), []);
          await confirmation.getByRole('button', { name:home.cancel,exact:true }).tap();
          await confirmation.waitFor({state:'hidden'});
          assert.deepEqual(await serviceCalls(), []);
          await group.tap();
          await confirmation.getByRole('button', { name:home.confirm,exact:true }).tap();
          await page.waitForFunction(() => window.fixture.services.length >= 3);
          const calls = await serviceCalls();
          assert.deepEqual(calls.map(call => call.target.entity_id).sort(),
            [home.domain + '.' + home.roomId + '_new',home.domain + '.' + home.roomId + '_one',home.domain + '.' + home.roomId + '_two']);
          assert.ok(calls.every(call => call.type === 'call_service' && call.domain === home.domain &&
            call.service === home.service), 'confirm only sends target-specific native requests');
          assert.deepEqual(errors, []);
          console.log('PASS ' + launcher.name() + ' ' + home.key + ' fresh setup, discovery, Finder and group controls');
        } catch (error) {
          throw new Error(home.key + ' acceptance fixture', { cause:error });
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
  });
} finally {
  server.close();
}
