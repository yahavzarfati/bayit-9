import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const markup = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<script type="module">import "/dashboard.js";(' + async function () {
    const query = new URLSearchParams(location.search);
    const locale = query.get('locale');
    const categories = locale === 'he' ? ['טבע','שינה','חגים','נוסף','הכל'] : ['Nature','Sleep','Holidays','Local','All'];
    const [nature, sleep, holidays, local, all] = categories;
    const light = 'light.fixture_lamp';
    const category = 'input_select.fixture_categories';
    const effects = ['Wave','Night','Glow','Dawn','Unsorted'];
    const groups = categories.slice(0,4).map((title, index) => ({ title, effects:[effects[index]] }));
    const calls = [];
    const options = [nature,sleep,holidays,all];
    const categoryState = await window.fixtureCategoryRead();
    const hass = {
      user:{ id:query.get('account'), is_admin:true },
      locale:{ language:locale },
      states:{
        [light]:{ state:'off', attributes:{
          friendly_name:'Fixture lamp', supported_features:4, supported_color_modes:['rgb'], effect_list:effects,
        } },
        [category]:{ state:categoryState, attributes:{ friendly_name:'Fixture category', options } },
        'input_select.fixture_hidden':{ state:nature, attributes:{ options } },
        'input_select.fixture_unmatched':{ state:'Other', attributes:{ options:['Other'] } },
        'select.fixture_wrong_domain':{ state:nature, attributes:{ options } },
      },
      areas:{ studio:{ area_id:'studio', name:'Studio' } },
      entities:{ [light]:{ area_id:'studio' }, [category]:{}, 'input_select.fixture_hidden':{ hidden_by:'user' } },
      services:{ input_select:{ select_option:{} }, light:{ turn_on:{} } },
      async callWS(request) {
        calls.push(request);
        if (request.type !== 'call_service' || request.domain !== 'input_select' || request.service !== 'select_option') {
          throw new Error('Unexpected Home Assistant request');
        }
        return await window.fixtureCategoryWrite(request);
      },
    };
    const config = {
      type:'custom:bayit-9', locale, light_effect_groups:{ [light]:groups },
      light_effect_favorites:[light],
      ...(!query.has('unbound') && { light_effect_category_sources:{ [light]:{ entity:category, all_option:all } } }),
    };
    const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
    const card = document.createElement('bayit-dashboard');
    card.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
    card.hass = hass;
    const fixture = window.fixture = {
      calls,
      setCategory(state, reported = options) {
        hass.states[category] = { state, attributes:{ options:reported } };
        card.hass = { ...hass, states:{ ...hass.states } };
      },
      setVisible(visible) {
        hass.entities[category] = visible ? {} : { hidden_by:'user' };
        card.hass = { ...hass, entities:{ ...hass.entities } };
      },
      setService(enabled) {
        hass.services.input_select = enabled ? { select_option:{} } : {};
        card.hass = { ...hass, services:{ ...hass.services } };
      },
    };
    if (query.has('editor')) {
      const editor = Strategy.getConfigElement();
      editor.hass = hass;
      editor.setConfig(config);
      editor.addEventListener('config-changed', event => { fixture.setup = event.detail.config; });
      document.body.append(editor);
    } else document.body.append(card);
  }.toString() + ')();</script>';

const server = createServer((request, response) => {
  const script = request.url === '/dashboard.js';
  response.writeHead(200, {'content-type':script ? 'text/javascript' : 'text/html; charset=utf-8'});
  response.end(script ? bundle : markup);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port + '/fixture/home';
const hash = '#device/studio/light.fixture_lamp';
const exact = (name) => ({name,exact:true});

try {
  for (const [engine, locale] of [[chromium,'en'],[webkit,'he']]) {
    const browser = await engine.launch();
    const he = locale === 'he';
    const [nature,sleep,holidays,local,all] = he ? ['טבע','שינה','חגים','נוסף','הכל'] : ['Nature','Sleep','Holidays','Local','All'];
    const allLabel = he ? 'כל האפקטים' : 'All effects';
    const options = [nature,sleep,holidays,all];
    let stored = sleep;
    const requests = [];
    const errors = [];
    const writers = [];
    const writeEvents = new EventEmitter();
    const waitForWrites = async total => {
      if (requests.length < total) await once(writeEvents, 'write', { signal:AbortSignal.timeout(6000) });
      assert.equal(requests.length,total);
    };
    const pageFor = async account => {
      const page = await browser.newPage({ viewport:{width:360,height:820}, hasTouch:true, reducedMotion:'reduce' });
      page.setDefaultTimeout(6000);
      page.on('pageerror', error => errors.push(error.message));
      await page.exposeFunction('fixtureCategoryRead', () => stored);
      await page.exposeFunction('fixtureCategoryWrite', request => new Promise((resolve,reject) => {
        requests.push(request);
        writers.push({resolve,reject});
        writeEvents.emit('write');
      }));
      const open = (params = '', route = hash) => page.goto(base + '?locale=' + locale + '&account=' + account + params + route);
      const gallery = page.getByRole('dialog', exact('Fixture lamp')).locator('.light-effect-gallery');
      const picker = gallery.getByRole('combobox', exact(he ? 'קטגוריות אפקטים' : 'Effect categories'));
      const button = name => gallery.locator('.light-effect-choices').getByRole('button', exact(name));
      const select = label => picker.selectOption({ label });
      const reflect = (state, reported) => page.evaluate(([state,reported]) => fixture.setCategory(state,reported), [state,reported]);
      const calls = () => page.evaluate(() => fixture.calls);
      return {page,open,gallery,picker,button,select,reflect,calls};
    };
    try {
      const first = await pageFor('account-a');
      const second = await pageFor('account-b');
      assert.notEqual(first.page.context(), second.page.context());
      await Promise.all([first.open(),second.open()]);
      await Promise.all([first.button('Night').waitFor(),second.button('Night').waitFor()]);
      assert.equal(await first.picker.locator('option:checked').textContent(),sleep);

      // This pane is user-owned. Changing it is independent of the light and favorites.
      const favorites = first.gallery.getByRole('button',exact(he ? 'הצגת מועדפים בלבד' : 'Show favorites only'));
      await favorites.tap();
      assert.equal(await first.picker.inputValue(),'favorites');
      await favorites.tap();
      assert.deepEqual(requests,[]);

      await first.select(holidays);
      await first.page.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('.light-effect-categories select').disabled);
      await first.button('Night').waitFor();
      assert.equal(await first.picker.locator('option:checked').textContent(),sleep);
      assert.equal(await second.picker.locator('option:checked').textContent(),sleep);
      await waitForWrites(1);
      assert.deepEqual(requests,[{type:'call_service',domain:'input_select',service:'select_option',
        service_data:{option:holidays},target:{entity_id:'input_select.fixture_categories'}}]);

      stored = holidays;
      await Promise.all([first.reflect(stored),second.reflect(stored)]);
      writers.shift().resolve({});
      await Promise.all([first.button('Glow').waitFor(),second.button('Glow').waitFor()]);
      await first.page.waitForFunction(() => !document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('.light-effect-categories select').disabled);
      assert.deepEqual(await second.calls(),[]);
      await second.open();
      await second.button('Glow').waitFor();
      assert.deepEqual(await second.calls(),[]);

      // All is the union of advertised effects and is the last authored category.
      assert.equal(await first.picker.locator('option:not([hidden])').last().textContent(),allLabel);
      await first.select(allLabel);
      await waitForWrites(2);
      assert.equal(requests.at(-1).service_data.option,all);
      stored = all;
      await Promise.all([first.reflect(stored),second.reflect(stored)]);
      writers.shift().resolve({});
      await Promise.all([first.button('Unsorted').waitFor(),second.button('Dawn').waitFor()]);
      assert.deepEqual(await first.gallery.locator('.light-effect-choices button').allTextContents(),
        ['Wave','Night','Glow','Dawn','Unsorted']);

      // Removing All and changing the shared value from elsewhere never issues a request.
      stored = nature;
      await Promise.all([first.reflect(stored,[nature,sleep,holidays]),second.reflect(stored)]);
      const allOption = first.picker.locator('option').filter({hasText:allLabel});
      await allOption.waitFor({state:'detached'});
      assert.equal(await first.picker.locator('option:checked').textContent(),nature);
      await first.select(local);
      await first.button('Dawn').waitFor();
      await first.gallery.getByText(he ? 'בחירת הקטגוריה הזו זמנית.' : 'This category choice is temporary.',{exact:true}).waitFor();
      assert.equal(requests.length,2);
      await first.reflect('unavailable');
      await first.select(sleep);
      await first.button('Night').waitFor();
      await first.reflect(nature,[nature,holidays]);
      await first.button('Wave').waitFor();
      await first.select(sleep);
      await first.button('Night').waitFor();
      assert.equal(requests.length,2);
      await first.reflect(holidays);
      await first.button('Glow').waitFor();
      await first.page.evaluate(() => fixture.setVisible(false));
      await first.select(nature);
      await first.button('Wave').waitFor();
      await first.page.evaluate(() => fixture.setVisible(true));
      await first.button('Glow').waitFor();
      await first.page.evaluate(() => fixture.setService(false));
      await first.select(nature);
      await first.button('Wave').waitFor();
      assert.equal(requests.length,2);

      // A rejected request never replaces the confirmed selection or mutates the light.
      await first.page.evaluate(() => fixture.setService(true));
      await first.reflect(nature);
      await first.select(sleep);
      await waitForWrites(3);
      writers.shift().reject(new Error('Declined fixture request'));
      await first.page.waitForFunction(() => !document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('.light-effect-categories select').disabled);
      await first.button('Wave').waitFor();
      assert.equal(await first.picker.locator('option:checked').textContent(),nature);
      assert.ok(requests.every(({domain,target}) => domain === 'input_select' && target.entity_id === 'input_select.fixture_categories'));
      assert.deepEqual(await first.calls(),requests);
      assert.deepEqual(await second.calls(),[]);

      await first.open('&unbound');
      await first.button('Wave').waitFor();
      assert.equal(await first.picker.locator('option').filter({hasText:allLabel}).count(),0);
      await first.select(sleep);
      await first.button('Night').waitFor();
      assert.deepEqual(await first.calls(),[]);

      await first.open('&editor&unbound','');
      await first.page.getByText(he ? 'קטגוריות אפקטים לתאורה' : 'Light effect categories',{exact:true}).tap();
      await first.page.getByLabel(he ? 'תאורה' : 'Light',{exact:true}).selectOption('light.fixture_lamp');
      const helper = first.page.getByLabel(he ? 'בורר לקטגוריה משותפת' : 'Shared category helper',{exact:true});
      assert.deepEqual(await helper.locator('option').evaluateAll(items => items.map(item => item.value)),
        ['', 'input_select.fixture_categories']);
      await helper.selectOption('input_select.fixture_categories');
      const allPicker = first.page.getByLabel(he ? 'אפשרות בורר לכל האפקטים' : 'Helper option for All effects',{exact:true});
      assert.deepEqual(await allPicker.locator('option').evaluateAll(items => items.map(item => item.value)),['', all]);
      await allPicker.selectOption(all);
      assert.deepEqual(await first.page.evaluate(() => fixture.setup.light_effect_category_sources),{
        'light.fixture_lamp':{entity:'input_select.fixture_categories',all_option:all},
      });
      await helper.selectOption('');
      assert.deepEqual(await first.page.evaluate(() => fixture.setup.light_effect_category_sources),{});
      assert.deepEqual(await first.calls(),[]);
      assert.deepEqual(errors,[]);
      console.log(engine.name() + ' (' + locale + '): shared light categories across accounts, write guards, All, local fallback and editor');
    } finally { await browser.close(); }
  }
} finally { server.close(); }
