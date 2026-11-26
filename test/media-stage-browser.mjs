import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const proxy = '/api/media_player_proxy/media_player.fixture_source';
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<main></main><div id="editor"></div><script type="module">
import '/bayit-9.js';
const options = new URL(location.href).searchParams;
const tracker = { calls: [] };
const source = 'media_player.fixture_source';
const other = 'media_player.fixture_other';
tracker.source = source;
const attributes = { friendly_name:'Fixture player', media_title:'Track title', media_artist:'A performer', app_name:'Media source',
  media_position:options.has('string-timeline') ? '17' : 17,
  media_duration:options.has('string-timeline') ? '180' : 180, entity_picture:'/api/media_player_proxy/' + source + '?format=wide', supported_features: 16433 };
const hass = {
  locale: { language: options.get('locale') || 'en' }, themes: {}, areas:{}, devices:{}, entities:{},
  states: { [source]:{ state:'paused', attributes },
    [other]:{ state:'idle', attributes:{ friendly_name:'Alternative player', supported_features: 1416, is_volume_muted: false } } },
  services: { media_player:{ media_play_pause:{}, media_previous_track:{}, media_next_track:{},
    turn_on:{}, turn_off:{}, volume_down:{}, volume_up:{}, volume_mute:{} } },
  callWS(message) { tracker.calls.push(message); return Promise.resolve({}); },
};
const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
const legacy = options.has('legacy');
const config = { type:'custom:bayit-9', locale:hass.locale.language, toolbar:[
  { id:'sample-media', kind:'media', label:'Fixture Media', placement:'linked',
    ...(!legacy && { media_stage:{ source_entity:source, ...(options.has('default-icon') ? {} : { fallback_icon:'mdi:radio' }) } }),
    media_remote:{ transport_entity:source, ...(options.has('full-remote') && { volume_entity:other, power_entity:other }),
      ...(options.has('mute-standby') && { allow_standby:true }) }, sections:legacy
      ? [{id:'small',kind:'media',entities:[{entity:source,role:'now_playing'}]}] : [] },
] };
const dashboard = document.createElement('bayit-dashboard');
dashboard.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
dashboard.hass = hass;
document.querySelector('main').append(dashboard);
tracker.update = (picture, state = 'paused') => {
  hass.states[source] = { state, attributes:{ ...attributes, entity_picture:picture } };
  dashboard.hass = { ...hass, states:{ ...hass.states } };
};
tracker.hide = () => {
  hass.entities[source] = { hidden_by:'user' };
  dashboard.hass = { ...hass, entities:{ ...hass.entities } };
};
tracker.updateTelevision = (state, supported_features, mute) => {
  hass.states[other] = {state,attributes:{friendly_name:'Alternative player',supported_features,
    ...(typeof mute === 'boolean' && { is_volume_muted:mute }) }};
  dashboard.hass = { ...hass, states:{ ...hass.states } };
};
if (options.has('editor')) {
  const editor = Strategy.getConfigElement();
  editor.hass = hass;
  editor.setConfig(config);
  editor.addEventListener('config-changed', event => { tracker.draft = event.detail.config; });
  document.querySelector('#editor').append(editor);
}
window.tracker = tracker;
</script>`;
const referrers = [];
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/bayit-9.js') {
    response.writeHead(200, { 'content-type':'text/javascript' });
    response.end(bundle);
  } else if (url.pathname === proxy) {
    referrers.push(request.headers.referer);
    const format = url.searchParams.get('format');
    const [width, height] = format === 'tall' ? [100, 260] : [260, 100];
    if (format === 'broken') {
      response.writeHead(404);
      response.end();
    } else {
      response.writeHead(200, { 'content-type':'image/svg+xml' });
      response.end('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
        '<rect width="100%" height="100%" fill="teal"/></svg>');
    }
  } else {
    response.writeHead(200, { 'content-type':'text/html' });
    response.end(fixture);
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

const home = 'http://127.0.0.1:' + server.address().port + '/fixture-home/home';
const hash = '#panel/sample-media';
const state = (page, picture, value) => page.evaluate(([src, current]) => tracker.update(src, current), [picture, value]);

try {
  await runBrowserEngines([[chromium, 'Chromium'], [webkit, 'WebKit']], async (engine, name) => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport:{ width:320, height:844 }, hasTouch:true, reducedMotion:'reduce' });
      page.setDefaultTimeout(8000);
      const errors = [];
      const rejected = [];
      referrers.length = 0;
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/invalid.fixture/**', route => route.abort());
      page.on('request', request => {
        if (request.url().includes('invalid.fixture') || request.url().includes('/api/media_player_proxy/media_player.fixture_other')) {
          rejected.push(request.url());
        }
      });
      const dialog = page.getByRole('dialog', { name:'Fixture Media', exact:true });
      const stage = dialog.locator('.now-playing[data-artwork-stage]');
      const image = stage.locator('img');
      const art = stage.locator('.now-playing-art');
      const details = stage.locator('.now-playing-stage-details');
      const fallback = art.locator('ha-icon');

      for (const [width, locale] of [[320, 'he'], [391, 'en'], [900, 'en']]) {
        await page.setViewportSize({ width, height:844 });
        const timelineFixture = width < 641 ? '&string-timeline' : '';
        await page.goto(home + '?full-remote&locale=' + locale + timelineFixture + hash);
        await image.waitFor();
        const geometry = await stage.evaluate(node => {
          const art = node.querySelector('.now-playing-art');
          const details = node.querySelector('.now-playing-stage-details');
          const artBounds = art.getBoundingClientRect();
          const detailBounds = details.getBoundingClientRect();
          const style = getComputedStyle(art.querySelector('img'));
          return { fit:style.objectFit, height:artBounds.height, artWidth:artBounds.width,
            stageWidth:node.clientWidth, sideBySide:detailBounds.x > artBounds.right,
            stacked:detailBounds.y > artBounds.bottom, overflow:node.scrollWidth > node.clientWidth };
        });
        assert.equal(geometry.fit, 'contain');
        assert.equal(geometry.overflow, false);
        if (width < 641) {
          assert.equal(geometry.height, 190);
          assert.equal(geometry.stacked, true);
          assert.ok(geometry.artWidth > geometry.stageWidth - 20);
        } else {
          assert.equal(geometry.height, 280);
          assert.equal(geometry.sideBySide, true);
        }
        await stage.getByText('Track title', { exact:true }).waitFor();
        assert.deepEqual(await stage.locator('progress').evaluate(meter => [meter.value, meter.max]), [17, 180]);
        assert.equal(await stage.locator('.now-playing-remaining').innerText(), '−2:43');
        assert.equal(await art.getAttribute('aria-hidden'), 'true');
        assert.equal(await image.getAttribute('referrerpolicy'), 'no-referrer');
        assert.equal(await fallback.isVisible(), false);
        assert.equal(await stage.evaluate(node => node.nextElementSibling.classList.contains('media-remote')), true);
        const volume = dialog.getByRole('group', { name: 'Alternative player' });
        assert.deepEqual(await volume.getByRole('button').evaluateAll(buttons =>
          buttons.map(button => button.querySelector('ha-icon')?.getAttribute('icon'))),
        ['mdi:power', 'mdi:volume-minus', 'mdi:volume-plus', 'mdi:volume-mute']);
        const sizes = await volume.getByRole('button').evaluateAll(buttons =>
          buttons.map(button => [button.offsetWidth, button.offsetHeight]));
        assert.ok(sizes.every(([width, height]) => width >= 44 && height >= 44));
        assert.equal(await dialog.locator('.toolbar-device').count(), 0);
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);
      }
      const tallResponse = page.waitForResponse(response => response.url().endsWith('?format=tall'));
      await state(page, proxy + '?format=tall');
      await tallResponse;
      const tallImage = stage.locator('img[src$="?format=tall"]');
      await tallImage.waitFor();
      const portrait = await tallImage.evaluate(node => ({
        fit:getComputedStyle(node).objectFit, width:node.naturalWidth, height:node.naturalHeight,
      }));
      assert.equal(portrait.fit, 'contain');
      assert.ok(portrait.height > portrait.width, JSON.stringify(portrait));

      const loadFailed = page.waitForResponse(response => response.url().endsWith('?format=broken'));
      await state(page, proxy + '?format=broken');
      await loadFailed;
      await fallback.waitFor();
      assert.equal(await image.isVisible(), false);
      assert.equal(await fallback.getAttribute('icon'), 'mdi:radio');
      await stage.getByText('Track title', { exact:true }).waitFor();
      for (const url of ['https://invalid.fixture/art', '/api/media_player_proxy/media_player.fixture_other',
        'https://name:secret@127.0.0.1:' + server.address().port + proxy, proxy + '#invalid']) {
        await state(page, proxy + '?format=wide');
        await image.waitFor();
        await state(page, url);
        await stage.locator('img[src]').waitFor({ state:'detached' });
        await fallback.waitFor();
      }
      assert.deepEqual(rejected, []);
      assert.ok(referrers.length >= 4 && referrers.every(value => value === undefined));
      await state(page, proxy + '?format=wide');
      await image.waitFor();
      await page.evaluate(() => tracker.hide());
      await stage.getByText('No track playing', { exact:true }).waitFor();
      assert.equal(await image.getAttribute('src'), null);
      assert.equal(await details.locator('.now-playing-timeline').isVisible(), false);

      await page.goto(home + '?default-icon' + hash);
      await image.waitFor();
      await state(page, proxy, 'off');
      await stage.getByText('No track playing', { exact:true }).waitFor();
      assert.equal(await fallback.getAttribute('icon'), 'mdi:music-note');
      await state(page, proxy + '?format=wide');
      await image.waitFor();
      await image.evaluate(node => { window.tracker.previousImage = node; });
      await dialog.getByRole('button', { name:'Close', exact:true }).click();
      await dialog.waitFor({ state:'hidden' });
      await page.waitForFunction(() => !tracker.previousImage.hasAttribute('src'));
      assert.deepEqual(await page.evaluate(() => tracker.calls), []);

      await page.goto(home + '?full-remote' + hash);
      const power = dialog.getByRole('button', { name: 'Power · Alternative player', exact: true });
      await power.click();
      await page.waitForFunction(() => tracker.calls.length === 1);
      assert.deepEqual(await page.evaluate(() => tracker.calls), [
        { type: 'call_service', domain: 'media_player', service: 'turn_off', service_data: {},
          target: { entity_id: 'media_player.fixture_other' } },
      ]);
      await stage.getByText('Track title', { exact: true }).waitFor();

      for (const [locale, words] of [
        ['en', { play:'Play', pause:'Pause playback', neutral:'Play or pause' }],
        ['he', { play:'ניגון', pause:'השהיית ניגון', neutral:'ניגון או השהיה' }],
      ]) {
        await page.goto(home + '?locale=' + locale + hash);
        const remote = dialog.locator('.media-remote');
        const key = name => remote.getByRole('button', { name, exact:true });
        const play = key(words.play);
        const pause = key(words.pause);
        const neutral = key(words.neutral);
        const glyph = control => control.locator('ha-icon').getAttribute('icon');
        const paint = control => control.evaluate(node => getComputedStyle(node).backgroundColor);
        await play.waitFor();
        assert.equal(await glyph(play),'mdi:play');
        assert.equal(await play.getAttribute('data-playback-paused'),'');
        const pausedTone = await paint(play);
        await state(page, proxy, 'playing');
        await pause.waitFor();
        assert.equal(await glyph(pause),'mdi:pause');
        assert.equal(await pause.getAttribute('data-playback-paused'),null);
        assert.notEqual(await paint(pause),pausedTone);
        assert.deepEqual(await page.evaluate(() => tracker.calls),[]);
        await pause.press('Enter');
        await page.waitForFunction(() => tracker.calls.length === 1);
        const toggleRequest = {type:'call_service',domain:'media_player',service:'media_play_pause',service_data:{},
          target:{entity_id:'media_player.fixture_source'}};
        assert.deepEqual(await page.evaluate(() => tracker.calls),[toggleRequest]);
        await state(page,proxy,'paused');
        await play.waitFor();
        assert.equal(await glyph(play),'mdi:play');
        assert.equal(await paint(play),pausedTone);
        await play.tap();
        await page.waitForFunction(() => tracker.calls.length === 2);
        assert.deepEqual(await page.evaluate(() => tracker.calls),[toggleRequest,toggleRequest]);
        await state(page,proxy,'buffering');
        await neutral.waitFor();
        assert.equal(await glyph(neutral),'mdi:play-pause');
        assert.equal(await neutral.getAttribute('data-playback-paused'),null);
        await state(page,proxy,'unavailable');
        await neutral.waitFor({state:'hidden'});
        assert.equal(await page.evaluate(() => tracker.calls.length),2);
      }

      for (const [locale, muteName, unmuteName, unavailable] of [
        ['en', 'Mute', 'Unmute', 'Unavailable'], ['he', 'השתקה', 'ביטול השתקה', 'לא זמין'],
      ]) {
        await page.goto(home + '?full-remote&mute-standby&locale=' + locale + hash);
        const tv = dialog.getByRole('group',{name:'Alternative player',exact:true});
        const mute = tv.getByRole('button',{name:muteName,exact:true});
        const unmute = tv.getByRole('button',{name:unmuteName,exact:true});
        const update = (state, features, mute) => page.evaluate(args => tracker.updateTelevision(...args), [state,features,mute]);
        await mute.waitFor();
        await update('off',1416);
        await mute.and(tv.locator(':disabled')).waitFor();
        assert.equal(await mute.getAttribute('aria-description'), unavailable);
        assert.equal(await tv.getByRole('button').count(),4);
        const original = await mute.elementHandle();
        const position = await mute.boundingBox();
        await mute.evaluate(button => button.click());
        assert.deepEqual(await page.evaluate(() => tracker.calls),[]);
        await update('on',1416,false);
        await mute.and(tv.locator(':enabled')).waitFor();
        assert.equal(await mute.getAttribute('aria-description'),null);
        assert.equal(await mute.evaluate((button, previous) => button===previous, original),true);
        assert.deepEqual(await mute.boundingBox(),position);
        await mute.tap();
        await page.waitForFunction(() => tracker.calls.length === 1);
        assert.deepEqual(await page.evaluate(() => tracker.calls), [
          {type:'call_service',domain:'media_player',service:'volume_mute',service_data:{is_volume_muted:true},
            target:{entity_id:'media_player.fixture_other'}},
        ]);
        await update('on',1416,true);
        await unmute.and(tv.locator(':enabled')).waitFor();
        await update('off',1408);
        await mute.waitFor({state:'hidden'});
        await unmute.waitFor({state:'hidden'});
        await update('unavailable',1416);
        assert.equal(await mute.count(),0);
        assert.equal(await page.evaluate(() => tracker.calls.length),1);
        await original.dispose();
      }

      await page.goto(home + '?legacy' + hash);
      const compact = dialog.locator('.now-playing');
      await compact.locator('img').waitFor();
      assert.equal(await stage.count(), 0);
      assert.equal(await compact.locator('img').evaluate(node => getComputedStyle(node).objectFit), 'cover');
      assert.equal(await dialog.locator('.media-remote').evaluate(node => node === node.parentElement.firstElementChild), true);
      assert.equal(await dialog.locator('.toolbar-device').count(), 1);

      await page.goto(home + '?editor&legacy');
      await page.getByText('Toolbar and extra screens', { exact:true }).click();
      await page.locator('#editor').getByRole('button', { name:'Fixture Media', exact:true }).click();
      const picker = page.getByLabel('Artwork and playback source', { exact:true });
      assert.equal(await picker.inputValue(), '');
      await picker.selectOption('media_player.fixture_other');
      const icon = page.getByLabel('Fallback artwork icon', { exact:true });
      await icon.fill('mdi:play-box-outline');
      await icon.press('Tab');
      assert.deepEqual(await page.evaluate(() => tracker.draft.toolbar[0].media_stage),
        { source_entity:'media_player.fixture_other', fallback_icon:'mdi:play-box-outline' });
      await picker.selectOption('');
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].media_stage), undefined);
      assert.deepEqual(errors, []);
      console.log(name + ': artwork stage, responsive containment, private artwork, playback state, cleanup and editor');
    } finally {
      await browser.close();
    }
  });
} finally {
  await new Promise(resolve => server.close(resolve));
}
