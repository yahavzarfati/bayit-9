import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<script type="module">import "/dashboard.js";(' + function () {
    const options = new URL(location.href).searchParams;
    const locale = options.get('locale') || 'en';
    const one = 'light.fixture_one';
    const two = 'light.fixture_two';
    const optionsForLight = ['Fixture wave', 'Fixture pulse', 'Fixture rays', 'Fixture glow'];
    const state = (name, value = optionsForLight[0]) => ({
      state: 'on', attributes: { friendly_name:name, supported_features:4,
        supported_color_modes:['rgb'], color_mode:'rgb', effect_list:optionsForLight, effect:value },
    });
    const requests = [];
    const hass = {
      user: { id:'account-a', is_admin:true }, locale: { language:locale },
      states: { [one]: state('Fixture lamp one'), [two]: state('Fixture lamp two') },
      entities: { [one]: { area_id:'studio' }, [two]: { area_id:'studio' } },
      areas: { studio: { area_id:'studio', name:'Studio' } },
      services: { light:{ turn_on:{}, turn_off:{} } },
      async callWS(request) {
        if (request.type !== 'call_service' || request.domain !== 'light' || request.service !== 'turn_on') {
          throw new Error('Unexpected Home Assistant request: ' + request.type);
        }
        requests.push(request);
        return {};
      },
    };
    const groups = [
      { title:'Wave fixtures', effects:[{ effect:'Fixture wave', name:'Gentle wave' }] },
      { title:'Pulse fixtures', effects:['Fixture pulse'] },
      { title:'Ray fixtures', effects:['Fixture rays'] },
      { title:'Glow fixtures', effects:['Fixture glow'] },
    ];
    const config = {
      type:'custom:bayit-9', locale, light_effect_groups:{ [one]:groups, [two]:groups },
      ...(!options.has('default') && { light_effect_favorites:[one, two] }),
    };
    const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
    const card = document.createElement('bayit-dashboard');
    card.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
    card.hass = hass;
    const fixture = {
      requests,
      setUser(id) {
        hass.user = id ? { id, is_admin:true } : undefined;
        card.hass = { ...hass };
      },
      setEffects(effect, options = optionsForLight) {
        const prior = hass.states[one];
        hass.states[one] = { ...prior, attributes:{ ...prior.attributes, effect, effect_list:options } };
        card.hass = { ...hass, states:{ ...hass.states } };
      },
      storageFails() {
        const write = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key.startsWith('bayit-9.light-effect-favorites.v1:')) throw new Error('Fixture storage failed');
          return write.call(this, key, value);
        };
      },
    };
    window.fixture = fixture;
    if (options.has('editor')) {
      const editor = Strategy.getConfigElement();
      editor.hass = hass;
      editor.setConfig(config);
      editor.addEventListener('config-changed', event => { fixture.setup = event.detail.config; });
      document.body.append(editor);
    } else document.body.append(card);
  }.toString() + ')();</script>';
const server = createServer((request, response) => {
  const script = request.url === '/dashboard.js';
  response.writeHead(200, { 'content-type':script ? 'text/javascript' : 'text/html; charset=utf-8' });
  response.end(script ? bundle : html);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port + '/fixture/home';
const key = (user, light) => 'bayit-9.light-effect-favorites.v1:' + JSON.stringify([user, light]);
const prefix = '#device/studio/light.fixture_';

try {
  for (const [engine, locale] of [[chromium, 'en'], [webkit, 'he']]) {
    const browser = await engine.launch();
    const rtl = locale === 'he';
    try {
      const page = await browser.newPage({ viewport:{ width:320, height:844 }, isMobile:true, hasTouch:true, reducedMotion:'reduce' });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const open = (params = '') => page.goto(base + '?locale=' + locale + params + prefix + 'one');
      const gallery = name => page.getByRole('dialog', { name:'Fixture lamp ' + name, exact:true }).locator('.light-effect-gallery');
      const one = gallery('one');
      const starOf = view => view.locator('[data-effect-favorite-control=star]');
      const filterOf = view => view.getByRole('button', { name:rtl ? 'הצגת מועדפים בלבד' : 'Show favorites only', exact:true });
      const star = starOf(one);
      const filter = filterOf(one);
      const choices = one.locator('.light-effect-choices');
      const picker = one.locator('.light-effect-categories select');
      const status = one.locator('.light-effect-favorite-message');
      const local = user => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key(user, 'light.fixture_one'));
      const setEffects = (effect, options) => page.evaluate(({ effect, options }) => fixture.setEffects(effect, options), { effect, options });
      const expectEffectCount = count => page.waitForFunction(expected => document.querySelector('bayit-dashboard').shadowRoot
        .querySelectorAll('.light-effect-choices button').length === expected, count);

      await open('');
      await star.waitFor();
      assert.equal(await star.getAttribute('aria-pressed'), 'false');
      assert.match(await star.getAttribute('aria-label'), rtl ? /שמירת האפקט/ : /Add active effect/);
      await filter.tap();
      await status.getByText(rtl ? 'אין מועדפים זמינים כרגע' : 'No favorites currently available').waitFor();
      assert.equal(await filter.getAttribute('aria-pressed'), 'true');
      await picker.selectOption({ label:'Glow fixtures' });
      await choices.getByRole('button', { name:'Fixture glow', exact:true }).tap();
      await star.tap();
      assert.equal(await star.getAttribute('aria-pressed'), 'true');
      assert.match(await one.locator('.light-effect-status').textContent(), /Fixture glow/);
      assert.deepEqual(await local('account-a'), ['Fixture wave']);
      await setEffects('Fixture pulse');
      await page.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('[data-effect-favorite-control=star]').getAttribute('aria-label').endsWith('Fixture pulse'));
      await star.tap();
      await filter.tap();
      await expectEffectCount(2);
      assert.equal(await picker.inputValue(), 'favorites');
      assert.match(await status.textContent(), /2/);
      assert.deepEqual(await choices.getByRole('button').allTextContents(), ['Gentle wave','Fixture pulse']);
      await filter.focus();
      await setEffects('Fixture rays', ['Fixture wave', 'Fixture rays', 'Fixture glow']);
      await expectEffectCount(1);
      assert.equal(await filter.getAttribute('aria-pressed'), 'true');
      assert.equal(await filter.evaluate(node => node.getRootNode().activeElement === node), true);
      assert.deepEqual(await local('account-a'), ['Fixture wave','Fixture pulse']);
      assert.match(await one.locator('.light-effect-status').textContent(), /Fixture glow/);
      await setEffects('Fixture rays');
      await expectEffectCount(2);
      assert.deepEqual(await page.evaluate(() => fixture.requests), []);
      await page.evaluate(() => fixture.setUser('account-b'));
      await page.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('[data-effect-favorite-control=filter]').getAttribute('aria-pressed') === 'false');
      assert.doesNotMatch(await one.locator('.light-effect-status').textContent(), /Fixture glow/);
      await filter.tap();
      await status.getByText(rtl ? 'אין מועדפים זמינים כרגע' : 'No favorites currently available').waitFor();
      await star.tap();
      await expectEffectCount(1);
      assert.deepEqual(await local('account-b'), ['Fixture rays']);
      assert.deepEqual(await local('account-a'), ['Fixture wave','Fixture pulse']);
      await page.evaluate(() => fixture.setUser(undefined));
      await filter.waitFor({ state:'hidden' });
      assert.equal(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('bayit-9.light-effect-favorites.v1:')).length), 2);
      await page.evaluate(() => fixture.setUser('account-a'));
      await filter.tap();
      await expectEffectCount(2);

      await page.evaluate(hash => { location.hash = hash; }, prefix + 'two');
      const two = gallery('two');
      await filterOf(two).waitFor();
      await filterOf(two).tap();
      await two.locator('.light-effect-favorite-message').getByText(rtl ? 'אין מועדפים זמינים כרגע' : 'No favorites currently available').waitFor();
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key('account-a', 'light.fixture_two')), null);

      await open('');
      await filter.tap();
      await expectEffectCount(2);
      await choices.getByRole('button', { name:'Fixture pulse', exact:true }).tap();
      const apply = one.getByRole('button', { name:rtl ? 'החל · אפקט תאורה' : 'Apply · Light effect', exact:true });
      await apply.tap();
      assert.deepEqual(await page.evaluate(() => fixture.requests), [{
        type:'call_service', domain:'light', service:'turn_on', service_data:{ effect:'Fixture pulse' },
        target:{ entity_id:'light.fixture_one' },
      }]);
      await page.evaluate(() => fixture.storageFails());
      await star.tap();
      await status.getByText(rtl ? 'לא ניתן לשמור מועדפים במכשיר זה.' : 'Could not save favorites on this device.').waitFor();
      assert.deepEqual(await local('account-a'), ['Fixture wave','Fixture pulse']);

      await page.reload();
      await page.evaluate(key => localStorage.setItem(key, '{"bad":true}'), key('account-a', 'light.fixture_one'));
      await page.reload();
      await filter.tap();
      await status.getByText(rtl ? 'אין מועדפים זמינים כרגע' : 'No favorites currently available').waitFor();
      await setEffects('Unsupported fixture');
      await page.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('[data-effect-favorite-control=star]').disabled);
      await open('&default');
      await one.waitFor();
      assert.equal(await filter.count(), 0);
      await page.goto(base + '?editor&default&locale=' + locale);
      await page.getByText(rtl ? 'קטגוריות אפקטים לתאורה' : 'Light effect categories', { exact:true }).tap();
      await page.getByLabel(rtl ? 'תאורה' : 'Light', { exact:true }).selectOption('light.fixture_one');
      const setting = page.getByRole('checkbox', { name:rtl ? 'אפשר סימון מועדפים אישיים במכשיר' : 'Allow personal favorites on this device' });
      assert.equal(await setting.isChecked(), false);
      await setting.check();
      assert.deepEqual(await page.evaluate(() => fixture.setup.light_effect_favorites), ['light.fixture_one']);
      await setting.uncheck();
      assert.deepEqual(await page.evaluate(() => fixture.setup.light_effect_favorites), []);
      assert.deepEqual(errors, []);
      console.log(engine.name() + ' (' + locale + '): per-light/account favorites, advertised options, explicit Apply, and editor');
    } finally { await browser.close(); }
  }
} finally { server.close(); }
