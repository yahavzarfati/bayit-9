import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<main></main><div id="editor"></div><script type="module">
import '/bayit-9.js';
const options = new URL(location.href).searchParams;
const tracker = { requests:[], native:[], readings:[], held:[] };
const inside = 'sensor.fixture_inside';
const outside = 'sensor.fixture_outside';
const excluded = 'sensor.fixture_excluded';
const unit = options.has('unitless') ? {} : { unit_of_measurement:'°C' };
const sensor = (state, name, attributes) => ({ state, attributes:{ friendly_name:name, ...attributes } });
const hass = {
  config:{ time_zone:'Asia/Jerusalem' }, locale:{ language:options.get('locale') || 'en' }, themes:{},
  areas:{}, devices:{}, entities:{ [excluded]:{hidden_by:'user'} },
  states:{
    [inside]:sensor('22','Inside',unit),
    [outside]:sensor('16','Outside',options.has('mixed') ? {unit_of_measurement:'°F'} : unit),
    [excluded]:sensor('30','Hidden series',unit),
  },
  callWS(request) {
    tracker.requests.push(request);
    if (request.type !== 'history/history_during_period') throw new Error('Unexpected request: ' + request.type);
    if (options.has('error')) return Promise.reject(new Error('Fixture Recorder failure'));
    if (options.has('empty')) return Promise.resolve({});
    const end = Date.parse(options.has('live-history') ? tracker.requests[0].end_time : request.end_time);
    const row = (minute, s) => ({ s, lu:(end + minute * 60000) / 1000 });
    const data = {
      [inside]:[row(-1450,'20'),row(-1435,'22'),row(-1430,'24'),row(-608,'unavailable'),row(-514,'18'),row(-30,'22')],
      [outside]:[row(-1450,'10'),row(-550,'14'),row(-80,'16')],
      [excluded]:[row(-390,'30')],
    };
    if (options.has('live-history')) data[inside].push(...tracker.readings);
    if (options.has('delayed') || tracker.holdNext) {
      tracker.holdNext = false;
      return new Promise(resolve => {
        tracker.complete = () => resolve(data);
        tracker.held.push(tracker.complete);
      });
    }
    return Promise.resolve(data);
  },
};
window.loadCardHelpers = async () => ({
  createCardElement(config) {
    tracker.native.push(config);
    return Object.assign(document.createElement('div'), { textContent:'Native history fixture' });
  },
});
const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
const config = { type:'custom:bayit-9', locale:hass.locale.language, toolbar:[
  { id:'chart-fixture', kind:'sensors', label:'Fixture Sensors', sections:[
    { id:'series', kind:'series', title:'Room comparison',
      ...(!options.has('legacy') && { comparison:{ enabled:true, hours:options.has('dense') ? 72 : 24,
        bucket_minutes:options.has('dense') ? 5 : 30 } }),
      entities:[{ entity:inside, role:'graph', name:'Inside', series_color:'#397BD6', graph_hours:48 },
        { entity:outside, role:'graph', name:'Outside', series_color:'#967000' },
        { entity:excluded, role:'graph', name:'Hidden series', series_color:'#112233' }],
    },
  ] },
] };
const dashboard = document.createElement('bayit-dashboard');
dashboard.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
dashboard.hass = hass;
document.querySelector('main').append(dashboard);
tracker.hideInside = () => {
  hass.entities[inside] = { hidden_by:'user' };
  dashboard.hass = { ...hass, entities:{ ...hass.entities } };
};
tracker.dropInside = () => {
  hass.states[inside] = sensor('unavailable','Inside',{});
  dashboard.hass = { ...hass, states:{ ...hass.states } };
};
tracker.changeInside = state => {
  hass.states[inside] = sensor(state, 'Inside', unit);
  const previous = (tracker.readings.at(-1)?.lu ?? 0) * 1000;
  tracker.readings.push({ s:state, lu:Math.max(previous + 2, Date.now()) / 1000 });
  dashboard.hass = { ...hass, states:{ ...hass.states } };
};
tracker.changeUnrelated = () => {
  hass.states['sensor.unrelated'] = sensor('25','Unrelated',unit);
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
const server = http.createServer((request, response) => {
  if (request.url === '/bayit-9.js') {
    response.writeHead(200, { 'content-type':'text/javascript' });
    response.end(bundle);
  } else {
    response.writeHead(200, { 'content-type':'text/html' });
    response.end(fixture);
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

const home = 'http://127.0.0.1:' + server.address().port + '/fixture-home/home';
const hash = '#panel/chart-fixture';
const inside = 'sensor.fixture_inside';
const outside = 'sensor.fixture_outside';

async function assertLiveComparison(browser) {
  const page = await browser.newPage({ viewport:{ width:390,height:844 },hasTouch:true,reducedMotion:'reduce' });
  page.setDefaultTimeout(8000);
  const panel = page.getByRole('dialog',{name:'Fixture Sensors',exact:true});
  const comparison = panel.locator('.temperature-comparison');
  const range = comparison.getByRole('slider');
  const time = comparison.locator('.comparison-selected-time');
  const insideReading = comparison.locator('.comparison-reading').filter({hasText:'Inside'}).locator('.comparison-value');
  const outsideLegend = comparison.getByRole('button',{name:'Show or hide Outside',exact:true});
  const recordedRequests = () => page.evaluate(() => tracker.requests);
  const waitRequests = count => page.waitForFunction(count => tracker.requests.length === count,count);
  const updateFrame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const setInside = async state => {
    await page.evaluate(state=>tracker.changeInside(state),state);
    await updateFrame();
  };
  try {
    await page.clock.install({time:new Date('2026-11-25T12:00:00Z')});
    await page.goto(home+'?live-history'+hash);
    await range.waitFor();
    await insideReading.getByText('22 °C',{exact:true}).waitFor();
    await range.fill('6');
    const chosenTime = await time.textContent();
    const first = (await recordedRequests())[0];
    await outsideLegend.click();
    await page.evaluate(()=>tracker.changeUnrelated());
    await updateFrame();
    await page.clock.fastForward(35 * 60000);
    assert.equal((await recordedRequests()).length,1);

    await page.evaluate(() => {
      tracker.changeInside('32');
      tracker.changeInside('34');
      tracker.changeInside('36');
    });
    await updateFrame();
    await page.clock.fastForward(1250);
    assert.equal((await recordedRequests()).length,1);
    await page.clock.fastForward(350);
    await waitRequests(2);
    const second = (await recordedRequests())[1];
    assert.deepEqual(second.entity_ids,[inside,outside]);
    assert.ok(Date.parse(second.end_time) - Date.parse(first.end_time) >= 35 * 60000);
    assert.equal(Date.parse(second.end_time) - Date.parse(second.start_time),24.5 * 3600000);
    assert.equal(await time.textContent(),chosenTime);
    assert.equal(await outsideLegend.getAttribute('aria-pressed'),'false');
    await range.press('End');
    await insideReading.getByText('34 °C',{exact:true}).waitFor();

    // Reading changes during a request are picked up with a single trailing refresh.
    await page.evaluate(() => { tracker.holdNext = true; });
    await setInside('38');
    await page.clock.fastForward(1650);
    await waitRequests(3);
    await setInside('40');
    await page.clock.fastForward(1650);
    assert.equal((await recordedRequests()).length,3);
    await page.evaluate(() => tracker.held[0]());
    await page.clock.fastForward(1650);
    await waitRequests(4);
    await insideReading.getByText('36 °C',{exact:true}).waitFor();

    // A timed-out older response must not replace a newer successful plot or its time.
    await page.evaluate(() => { tracker.holdNext = true; });
    await setInside('50');
    await page.clock.fastForward(1650);
    await waitRequests(5);
    await setInside('60');
    await page.clock.fastForward(10050);
    await panel.getByText('Could not refresh sensor history.',{exact:true}).waitFor();
    assert.equal(await insideReading.textContent(),'36 °C');
    await page.clock.fastForward(1650);
    await waitRequests(6);
    await panel.getByText('Could not refresh sensor history.',{exact:true}).waitFor({state:'hidden'});
    const afterLatest = await insideReading.textContent();
    const afterLatestTime = await time.textContent();
    assert.notEqual(afterLatest,'36 °C');
    await page.evaluate(() => tracker.held[1]());
    await updateFrame();
    assert.equal(await insideReading.textContent(),afterLatest);
    assert.equal(await time.textContent(),afterLatestTime);
    assert.equal(await outsideLegend.getAttribute('aria-pressed'),'false');

    await setInside('70');
    await panel.getByRole('button',{name:'Close',exact:true}).click();
    await panel.waitFor({state:'hidden'});
    await page.clock.fastForward(2000);
    assert.equal((await recordedRequests()).length,6);
  } finally { await page.close(); }
}

try {
  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport:{ width:320, height:844 }, hasTouch:true, reducedMotion:'reduce' });
      page.setDefaultTimeout(8000);
      const errors = [];
      const mediaRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.resourceType() === 'image') mediaRequests.push(request.url()); });
      const modal = page.getByRole('dialog', { name:'Fixture Sensors', exact:true });
      const comparison = modal.locator('.temperature-comparison');
      const plot = comparison.locator('svg');
      const strokes = plot.locator('path.comparison-line');
      const range = comparison.getByRole('slider');
      const reading = label => comparison.locator('.comparison-reading').filter({ hasText:label }).locator('.comparison-value');
      const legend = (label, locale = 'en') => comparison.getByRole('button', {
        name: (locale === 'he' ? 'הצגה או הסתרה של ' : 'Show or hide ') + label, exact:true,
      });
      const open = query => page.goto(home + query + hash);

      for (const [width, locale] of [[320,'he'],[390,'en'],[900,'en']]) {
        await page.setViewportSize({ width, height:844 });
        await open('?locale=' + locale);
        await range.waitFor();
        assert.equal(await range.getAttribute('aria-label'), locale === 'he' ? 'זמן בהיסטוריית החיישנים' : 'Time in sensor history');
        assert.equal(await plot.getAttribute('preserveAspectRatio'), 'none');
        assert.equal(await comparison.evaluate(node => node.scrollWidth > node.clientWidth), false);
        assert.equal(await strokes.count(),3);
        assert.equal(await plot.locator('path.comparison-fill').count(),3);
        assert.equal(await plot.locator('path.comparison-fill').first().evaluate(node => getComputedStyle(node).opacity), '0.16');
        const lines = await strokes.evaluateAll(nodes => nodes.map(node => ({
          color:node.getAttribute('stroke'), path:node.getAttribute('d'), width:getComputedStyle(node).strokeWidth,
        })));
        assert.deepEqual(lines.map(line => line.color), ['#397BD6','#397BD6','#967000']);
        assert.ok(lines.every(line => line.path.includes(' C') && line.width === '2px' && !line.path.includes('NaN')));
        assert.match(await range.getAttribute('aria-valuetext'), /Inside 22 °C, Outside 16 °C/);
        assert.equal(await reading('Inside').innerText(), '22 °C');
        await range.focus();
        await range.press('Home');
        assert.equal(await reading('Inside').innerText(), '23 °C');
        await range.press('ArrowRight');
        const selected = await range.inputValue();
        assert.notEqual(selected, '0');
        const selectedTime = await comparison.locator('.comparison-selected-time').textContent();
        const originalScale = await comparison.locator('.comparison-y-axis').textContent();
        const insideToggle = legend('Inside', locale);
        const outsideToggle = legend('Outside', locale);
        assert.equal(await insideToggle.getAttribute('aria-pressed'), 'true');
        assert.ok((await insideToggle.boundingBox()).height >= 44);
        await insideToggle.press('Space');
        assert.equal(await insideToggle.getAttribute('aria-pressed'), 'false');
        assert.ok(await insideToggle.evaluate(button => button.getRootNode().activeElement === button));
        assert.deepEqual(await strokes.evaluateAll(nodes => nodes.map(node => node.getAttribute('stroke'))), ['#967000']);
        assert.notEqual(await comparison.locator('.comparison-y-axis').textContent(), originalScale);
        assert.equal(await range.inputValue(), selected);
        assert.equal(await comparison.locator('.comparison-selected-time').textContent(), selectedTime);
        assert.doesNotMatch(await range.getAttribute('aria-valuetext'), /Inside/);
        assert.ok(await reading('Inside').isHidden());
        assert.equal(await outsideToggle.getAttribute('aria-disabled'), 'true');
        const description = await outsideToggle.evaluate(button => button.getAttribute('aria-describedby').split(' ')
          .map(id => button.getRootNode().getElementById(id).textContent));
        assert.deepEqual(description, [
          await reading('Outside').textContent(),
          locale === 'he' ? 'לפחות חיישן אחד צריך להישאר מוצג בגרף' : 'Keep at least one sensor visible in the chart',
        ]);
        assert.equal(await insideToggle.getAttribute('aria-describedby'), null);
        await outsideToggle.press('Enter');
        assert.equal(await outsideToggle.getAttribute('aria-pressed'), 'true');
        await insideToggle.click();
        assert.equal(await insideToggle.getAttribute('aria-pressed'), 'true');
        assert.equal(await outsideToggle.getAttribute('aria-disabled'), 'false');
        assert.equal(await comparison.locator('.comparison-y-axis').textContent(), originalScale);
        assert.equal(await range.inputValue(), selected);
        assert.equal(await comparison.locator('.comparison-selected-time').textContent(), selectedTime);
        assert.equal(await strokes.count(), 3);
        await range.press('End');
        assert.equal(await reading('Inside').innerText(), '22 °C');

        const [request] = await page.evaluate(() => tracker.requests);
        assert.deepEqual(await page.evaluate(() => tracker.requests.length), 1);
        assert.deepEqual(request.entity_ids, [inside, outside]);
        assert.equal(Date.parse(request.end_time) - Date.parse(request.start_time), 24.5 * 3600000);
        assert.equal(request.minimal_response, true);
        assert.equal(request.no_attributes, true);
        assert.equal(request.significant_changes_only, false);
      }
      const plotBounds = await plot.boundingBox();
      await plot.click({ position:{ x:plotBounds.width * .6, y:20 } });
      assert.equal(await reading('Inside').innerText(), 'No reading');
      await page.evaluate(() => tracker.dropInside());
      await range.press('End');
      assert.equal(await reading('Inside').innerText(), '22 °C');
      await legend('Outside').click();
      assert.equal(await legend('Outside').getAttribute('aria-pressed'), 'false');
      await page.evaluate(() => tracker.hideInside());
      await comparison.getByText('Inside', { exact:true }).waitFor({ state:'detached' });
      assert.equal(await legend('Outside').getAttribute('aria-pressed'), 'true');
      assert.equal(await legend('Outside').getAttribute('aria-disabled'), 'true');
      assert.equal(await strokes.count(),1);
      assert.equal(await page.evaluate(() => tracker.requests.length), 1);

      await open('?unitless');
      await range.waitFor();
      assert.equal(await reading('Inside').innerText(), '22');

      await open('?dense');
      await range.waitFor();
      const denseRequest = await page.evaluate(() => tracker.requests[0]);
      assert.equal(Date.parse(denseRequest.end_time) - Date.parse(denseRequest.start_time), (24 * 60 + 5) * 60000);

      for (const [query, hours] of [['?legacy',48], ['?mixed',24]]) {
        await open(query);
        await modal.getByText('Native history fixture', { exact:true }).waitFor();
        assert.equal(await comparison.count(), 0);
        assert.deepEqual(await page.evaluate(() => tracker.requests), []);
        assert.equal(await page.evaluate(() => tracker.native[0].hours_to_show), hours);
      }

      for (const [query, text] of [['?empty','No recorded readings for this period.'], ['?error','Sensor history is unavailable.']]) {
        await open(query);
        await comparison.getByText(text, { exact:true }).waitFor();
        assert.equal(await range.count(), 0);
        assert.match(await reading('Inside').textContent(), /22 °C/);
        await page.evaluate(() => tracker.changeInside('27'));
        await page.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
          .querySelector('.comparison-value').textContent.includes('27 °C'));
        assert.equal(await page.evaluate(() => tracker.requests.length), 1);
      }

      await open('?delayed');
      await comparison.getByText('Loading sensor history…', { exact:true }).waitFor();
      await page.waitForFunction(() => !!tracker.complete);
      await modal.getByRole('button', { name:'Close', exact:true }).click();
      await modal.waitFor({ state:'hidden' });
      await page.evaluate(() => tracker.complete());
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      assert.equal(await page.locator('.temperature-comparison .comparison-line').count(),0);
      assert.equal(await page.evaluate(() => tracker.requests.length),1);

      await page.goto(home + '?editor&legacy');
      await page.getByText('Toolbar and extra screens', { exact:true }).click();
      const editor = page.locator('#editor');
      await editor.getByRole('button', { name:'Fixture Sensors', exact:true }).click();
      await editor.getByRole('button', { name:'Room comparison', exact:true }).click();
      await editor.getByLabel('Compare trends in a single chart', { exact:true }).check();
      await editor.getByLabel('Average interval in minutes', { exact:true }).selectOption('15');
      const hours = editor.getByLabel('Time range in hours', { exact:true });
      await hours.fill('48');
      await hours.press('Tab');
      await editor.getByRole('button', { name:'Inside', exact:true }).click();
      const color = editor.getByLabel('Line color for this sensor', { exact:true });
      await color.fill('#12AACC');
      await color.press('Tab');
      const draft = await page.evaluate(() => tracker.draft.toolbar[0].sections[0]);
      assert.deepEqual(draft.comparison, { enabled:true, hours:48, bucket_minutes:15 });
      assert.equal(draft.entities[0].series_color, '#12AACC');
      assert.deepEqual(mediaRequests, []);
      assert.deepEqual(errors, []);
      await assertLiveComparison(browser);
      console.log(name + ': rolling Recorder refresh, historical selection, one trailing refresh, stale response and teardown');
      console.log(name + ': responsive sensor comparison, recorder gaps, keyboard values, native fallback, disposal and editor');
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
