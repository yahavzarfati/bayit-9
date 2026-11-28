import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<main></main><div id="editor"></div><script type="module">
import '/bayit-9.js';
const options = new URL(location.href).searchParams;
const tracker = { requests:[], native:[], readings:[], held:[] };
const inside = 'sensor.fixture_inside';
const outside = 'sensor.fixture_outside';
const excluded = 'sensor.fixture_excluded';
const progress = 'sensor.fixture_progress';
const precise = 'sensor.fixture_precise';
const readingCards = options.has('readings');
const names = options.get('locale') === 'he' ?
  { inside:'טמפרטורת סלון', progress:'התקדמות ניקוי', precise:'מדידה מדויקת' } :
  { inside:'Lounge temperature', progress:'Cleaning progress', precise:'Precise reading' };
const unit = options.has('unitless') ? {} : { unit_of_measurement:'°C' };
const sensor = (state, name, attributes) => ({ state, attributes:{ friendly_name:name, ...attributes } });
const extraNames = options.get('locale') === 'he' ? ['חדר משחקים', 'חדר למעלה', 'חדר הורים', 'ממ״ד'] :
  ['Play Room', 'Upstairs', 'Main Bedroom', 'Office'];
if (options.has('full-series')) extraNames.push(...['Hall', 'Den', 'Kitchen', 'Study', 'Attic', 'Deck']);
const extraLegend = options.has('legend-density') ?
  extraNames.map((name,index) => ['sensor.fixture_extra_' + index,name]) : [];
const hass = {
  config:{ time_zone:'Asia/Jerusalem' }, locale:{ language:options.get('locale') || 'en' }, themes:{},
  areas:readingCards ? { studio:{area_id:'studio',name:'Studio'} } : {},
  devices:{}, entities:{ [excluded]:{hidden_by:'user'}, ...(readingCards && {'light.fixture_studio':{area_id:'studio'}}) },
  states:{
    [inside]:sensor(readingCards ? '22.5' : '22','Inside',unit),
    [outside]:sensor('16','Outside',options.has('mixed') ? {unit_of_measurement:'°F'} : unit),
    [excluded]:sensor('30','Hidden series',unit),
    ...(readingCards && {
      'light.fixture_studio':sensor('off','Studio light',{supported_color_modes:['onoff']}),
      [progress]:sensor('0','Cleaning progress',{unit_of_measurement:'%'}),
      [precise]:sensor('71.2345','Precise reading',{unit_of_measurement:'°F'}),
    }),
    ...Object.fromEntries(extraLegend.map(([id,name]) => [id,sensor('24',name,unit)])),
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
      [progress]:[row(-1500,'0'),row(-120,'45'),row(-25,'0')],
      [precise]:[row(-1450,'70.5'),row(-110,'74.12'),row(-30,'71.2345')],
      ...Object.fromEntries(extraLegend.map(([id]) => [id,[row(-1430,'22'),row(-30,'24')]])),
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
    ...(readingCards ? [{
      id:'readings', kind:'readings', title:'Readings', layout:'reading-cards',
      entities:[
        { entity:inside, role:'graph', name:names.inside, icon:'mdi:thermometer',
          compact_history_graph:true, series_color:'#80BFFF', graph_room_id:'studio' },
        { entity:outside, role:'graph', name:'Outside' },
        { entity:progress, role:'graph', name:names.progress, icon:'mdi:robot-vacuum',
          compact_history_graph:true, series_color:'#69D8A3', graph_hours:168, vacuum_panel_id:'fixture-vacuum' },
        { entity:precise, role:'graph', name:names.precise, compact_history_graph:true, series_color:'#bf9dff' },
        { entity:excluded, role:'graph', name:'Hidden reading', compact_history_graph:true },
      ],
    }] : [{ id:'series', kind:'series', title:'Room comparison',
      ...(!options.has('legacy') && { comparison:{ enabled:true, hours:options.has('dense') ? 72 : 24,
        bucket_minutes:options.has('dense') ? 5 : 30,
        ...(options.has('compact-comparison') && { layout:'compact' }) } }),
      entities:[{ entity:inside, role:'graph', name:'Inside', series_color:'#397BD6', graph_hours:48 },
        { entity:outside, role:'graph', name:'Outside', series_color:'#967000' },
        { entity:excluded, role:'graph', name:'Hidden series', series_color:'#112233' },
        ...extraLegend.map(([entity,name]) => ({ entity, name, role:'graph' }))],
    }]),
  ] },
  ...(readingCards ? [{ id:'fixture-vacuum', kind:'vacuum', label:'Fixture Vacuum', sections:[
    { id:'status', kind:'status', entities:[{ entity:progress, role:'status' }] },
  ] }] : []),
] };
const dashboard = document.createElement('bayit-dashboard');
dashboard.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
dashboard.hass = hass;
document.querySelector('main').append(dashboard);
window.addEventListener('hass-more-info', event => { tracker.details = event.detail.entityId; });
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

async function assertSensorReadingCards(browser) {
  for (const [width, locale] of [[320,'he'],[391,'en']]) {
    const page = await browser.newPage({ viewport:{width,height:845},hasTouch:true,reducedMotion:'reduce' });
    page.setDefaultTimeout(8000);
    const modal = page.getByRole('dialog',{name:'Fixture Sensors',exact:true});
    const cards = modal.locator('.toolbar-sensor-chart');
    const reading = index => cards.nth(index).locator('.room-temperature-value');
    try {
      await page.goto(home+'?readings&locale='+locale+hash);
      await modal.locator('.room-temperature-line').first().waitFor();
      assert.equal(await cards.count(),3);
      assert.equal(await reading(0).textContent(),'22.5');
      assert.equal(await reading(1).textContent(),'0');
      assert.equal(await reading(2).textContent(),'71.2345');
      assert.deepEqual(await cards.locator('.room-temperature-unit').allTextContents(), ['°C','%','°F']);
      assert.equal(await cards.first().locator('ha-icon').getAttribute('icon'),'mdi:thermometer');
      assert.equal(await cards.nth(1).locator('ha-icon').getAttribute('icon'),'mdi:robot-vacuum');
      assert.deepEqual(await cards.evaluateAll(items => items.map(item => item.style.getPropertyValue('--room-chart-color'))),
        ['#80BFFF','#69D8A3','#BF9DFF']);
      assert.ok(await cards.evaluateAll(items => items.every(item => {
        const heading = item.querySelector('bdi').getBoundingClientRect();
        const icon = item.querySelector('ha-icon').getBoundingClientRect();
        return item.offsetWidth >= 44 && item.offsetHeight >= 44 && item.scrollWidth <= item.clientWidth + 1 &&
          heading.right <= icon.left && item.querySelector('.room-temperature-fill');
      })));
      const requests = await page.evaluate(() => tracker.requests);
      assert.deepEqual(requests.map(request => request.entity_ids), [[inside],['sensor.fixture_progress'],['sensor.fixture_precise']]);
      assert.equal(Date.parse(requests[1].end_time) - Date.parse(requests[1].start_time),168.5 * 3600000);
      assert.deepEqual(await page.evaluate(() => tracker.native.map(card => card.entity)),[outside]);

      await cards.nth(2).press('Enter');
      assert.equal(await page.evaluate(() => tracker.details),'sensor.fixture_precise');
      await cards.nth(1).tap();
      await page.getByRole('dialog',{name:'Fixture Vacuum',exact:true}).waitFor();
      await page.goto(home+'?readings&locale='+locale+hash);
      await cards.first().tap();
      await page.getByRole('dialog',{name:'Studio',exact:true}).waitFor();

      await page.goto(home+'?readings&locale='+locale+hash);
      await cards.first().waitFor();
      await page.evaluate(() => tracker.dropInside());
      await cards.first().getByText('—',{exact:true}).waitFor();
      assert.equal(await cards.first().locator('.room-temperature-unit').textContent(),'');
      assert.match(await cards.first().getAttribute('aria-label'),locale === 'he' ? /לא זמין/ : /Unavailable/);
      await page.evaluate(() => tracker.changeInside('22.500'));
      await cards.first().getByText('22.500',{exact:true}).waitFor();
      await page.evaluate(() => tracker.hideInside());
      await page.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
        .querySelectorAll('.toolbar-sensor-chart:not([hidden])').length === 2);
      assert.equal(await cards.first().isHidden(),true);
      assert.equal(await reading(0).textContent(),'—');
      assert.equal(await cards.first().locator('.room-temperature-unit').textContent(),'');
      assert.equal(await cards.first().locator('.room-temperature-line').count(),0);
      if (locale === 'en') {
        await page.goto(home+'?readings&editor');
        const editor = page.locator('#editor');
        await editor.getByText('Toolbar and extra screens',{exact:true}).click();
        await editor.getByRole('button',{name:'Fixture Sensors',exact:true}).click();
        await editor.getByRole('button',{name:'Readings',exact:true}).click();
        await editor.getByRole('button',{name:'Lounge temperature',exact:true}).click();
        const compact = editor.getByLabel('Compact history chart',{exact:true});
        assert.equal(await compact.isChecked(),true);
        const color = editor.getByLabel('Line color for this sensor',{exact:true});
        await color.fill('#AACCEE');
        await color.press('Tab');
        await compact.uncheck();
        const entry = await page.evaluate(() => tracker.draft.toolbar[0].sections[0].entities[0]);
        assert.equal(entry.series_color,'#AACCEE');
        assert.equal(entry.compact_history_graph,undefined);
        assert.equal(entry.graph_room_id,'studio');
      }
    } finally { await page.close(); }
  }
}

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

async function assertTouchPreviewFits(preview, expectedReadings) {
  const layout = await preview.evaluate(node => {
    const bounds = node.closest('.comparison-plot').getBoundingClientRect();
    const area = node.getBoundingClientRect();
    const inside = (box, outer) => box.top >= outer.top - 1 && box.bottom <= outer.bottom + 1 &&
      box.left >= outer.left - 1 && box.right <= outer.right + 1;
    const rows = [...node.querySelectorAll('li')];
    return {
      fits:inside(area,bounds) && node.scrollHeight <= node.clientHeight + 1,
      pointerEvents:getComputedStyle(node).pointerEvents,
      readings:rows.length,
      cropped:rows.filter(row => !inside(row.getBoundingClientRect(),area) ||
        row.lastElementChild.scrollWidth > row.lastElementChild.clientWidth + 1).map(row => row.textContent),
    };
  });
  assert.deepEqual(layout,{fits:true,pointerEvents:'none',readings:expectedReadings,cropped:[]});
}

async function assertCompactComparison(browser) {
  for (const [width, locale] of [[320,'he'],[391,'en']]) {
    const page = await browser.newPage({ viewport:{width,height:845},hasTouch:true,reducedMotion:'reduce' });
    const chart = page.locator('.temperature-comparison');
    const range = chart.getByRole('slider');
    const plot = chart.locator('.comparison-plot svg');
    const time = chart.locator('.comparison-selected-time');
    const preview = chart.locator('.comparison-preview');
    const legend = chart.getByRole('button', {
      name: locale === 'he' ? 'הצגה או הסתרה של Inside' : 'Show or hide Inside', exact:true,
    });
    const query = home+'?legend-density&locale='+locale;
    try {
      await page.goto(query+hash);
      await range.waitFor();
      const before = (await chart.boundingBox()).height;
      assert.equal(await chart.getAttribute('data-comparison-compact'),null);
      await page.goto(query+'&compact-comparison'+hash);
      await range.waitFor();
      const shape = await chart.evaluate(box => {
        const plot = box.querySelector('svg').getBoundingClientRect();
        const slider = box.querySelector('input').getBoundingClientRect();
        const legend = [...box.querySelectorAll('.comparison-series')];
        return { height:box.offsetHeight, fits:box.scrollWidth <= box.clientWidth + 1,
          plot:plot.height, slider:slider.height, integrated: Math.abs(slider.bottom - plot.bottom) < 1,
          rows:new Set(legend.map(button => Math.round(button.getBoundingClientRect().top))).size,
          targets:legend.every(button => button.offsetWidth >= 44 && button.offsetHeight >= 44),
          readingsFit:legend.every(button => [...button.querySelectorAll('.comparison-reading-name,.comparison-value')]
            .every(text => text.scrollWidth <= text.clientWidth + 1)) };
      });
      assert.ok(before - shape.height >= 80,JSON.stringify(shape));
      assert.ok(shape.fits && shape.targets && shape.integrated && shape.readingsFit && shape.slider >= 44,JSON.stringify(shape));
      assert.equal(shape.rows,2);
      assert.ok(shape.plot >= 95 && shape.plot <= 112,JSON.stringify(shape));
      assert.deepEqual(await chart.locator('.comparison-y-axis span').allTextContents(),['25','20','15','10']);
      assert.equal(await chart.locator('.comparison-x-axis span').count(),4);
      assert.equal(await time.isHidden(),true);

      await range.press('Home');
      assert.equal(await range.inputValue(),'0');
      assert.match(await range.getAttribute('aria-valuetext'),/Inside 23 °C/);
      await time.waitFor();
      assert.equal(await range.evaluate(input => getComputedStyle(input).opacity),'1');
      await range.press('End');
      const committed = await range.getAttribute('aria-valuetext');
      const plotWidth = (await plot.boundingBox()).width;
      await plot.hover({ position:{x:Math.floor(plotWidth * .5),y:18} });
      assert.equal(await preview.isVisible(),true);
      assert.equal(await preview.locator('li').count(),6);
      assert.equal(await range.getAttribute('aria-valuetext'),committed);
      await plot.tap({ position:{x:Math.floor(plotWidth * .65),y:18} });
      await preview.waitFor();
      assert.equal(await preview.getAttribute('data-touch'),'');
      assert.equal(await preview.locator('.comparison-preview-time').textContent(),await time.textContent());
      assert.equal(await time.isHidden(),true);
      await assertTouchPreviewFits(preview,6);
      assert.notEqual(await range.getAttribute('aria-valuetext'),committed);

      const slider = await range.boundingBox();
      const chartSelection = await range.getAttribute('aria-valuetext');
      await range.tap({ position:{x:Math.floor(slider.width * .27),y:Math.floor(slider.height / 2)} });
      assert.notEqual(await range.getAttribute('aria-valuetext'),chartSelection);
      await preview.waitFor({state:'hidden'});
      await range.press('End');
      const beforeSwipe = await range.getAttribute('aria-valuetext');
      await plot.evaluate(node => {
        const bounds = node.getBoundingClientRect();
        for (const sequence of [
          [['pointerdown',18],['pointermove',38],['pointerup',18],['click',18]],
          [['pointerdown',18],['pointercancel',18],['click',18]],
        ]) {
          for (const [type,y] of sequence) {
            node.dispatchEvent(new PointerEvent(type,{pointerType:'touch',pointerId:72,isPrimary:true,bubbles:true,
              clientX:bounds.left+bounds.width*.4,clientY:bounds.top+y}));
          }
        }
      });
      assert.equal(await range.getAttribute('aria-valuetext'),beforeSwipe);
      assert.equal(await preview.isHidden(),true);
      await page.mouse.move(slider.x + slider.width - 8, slider.y + slider.height / 2);
      await page.mouse.down();
      await page.mouse.move(slider.x + slider.width * .27, slider.y + slider.height / 2,{steps:4});
      await page.mouse.up();
      assert.notEqual(await range.getAttribute('aria-valuetext'),committed);
      await legend.press('Space');
      assert.equal(await legend.getAttribute('aria-pressed'),'false');
      assert.equal(await legend.locator('.comparison-value').isHidden(),true);
      await plot.tap({ position:{x:Math.floor(plotWidth * .45),y:18} });
      await preview.waitFor();
      assert.equal(await preview.locator('li').count(),5);
      await legend.tap();
      assert.equal(await legend.getAttribute('aria-pressed'),'true');
      await preview.waitFor({state:'hidden'});
      await plot.tap({ position:{x:Math.floor(plotWidth * .45),y:18} });
      await preview.waitFor();
      const beforeScroll = await range.getAttribute('aria-valuetext');
      await chart.locator('.comparison-visual').evaluate(el => el.dispatchEvent(new Event('scroll')));
      await preview.waitFor({state:'hidden'});
      assert.equal(await range.getAttribute('aria-valuetext'),beforeScroll);
      await page.evaluate(() => tracker.hideInside());
      await legend.waitFor({state:'detached'});
      assert.doesNotMatch(await range.getAttribute('aria-valuetext'),/Inside/);
      assert.equal(await page.evaluate(() => tracker.requests.length),1);
      if (width === 320) {
        await page.goto(query+'&compact-comparison&full-series'+hash);
        await range.waitFor();
        await plot.tap({ position:{x:Math.floor(plotWidth * .65),y:18} });
        await preview.waitFor();
        await assertTouchPreviewFits(preview,12);
      }
    } finally { await page.close(); }
  }
}

try {
  await runBrowserEngines([[chromium, 'Chromium'], [webkit, 'WebKit']], async (engine, name) => {
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
      const preview = comparison.locator('.comparison-preview');
      const marker = plot.locator('.comparison-marker');
      const committed = await range.getAttribute('aria-valuetext');
      const committedPosition = await marker.getAttribute('x1');
      await plot.scrollIntoViewIfNeeded();
      const plotBounds = await plot.boundingBox();
      const olderPoint = { x:plotBounds.width * .6, y:20 };
      await plot.hover({ position:olderPoint });
      assert.equal(await preview.isVisible(), true);
      assert.equal(await preview.locator('li').count(), 2);
      assert.match(await preview.locator('li').first().textContent(), /InsideNo reading/);
      assert.notEqual(await marker.getAttribute('x1'), committedPosition);
      assert.equal(await range.getAttribute('aria-valuetext'), committed);
      assert.equal(await reading('Inside').innerText(), '22 °C');
      assert.deepEqual(await plot.boundingBox(), plotBounds);
      await plot.hover({ position:{ x:plotBounds.width * .3, y:20 } });
      assert.equal(await preview.getAttribute('data-right'), '');
      await range.hover();
      assert.equal(await preview.isHidden(), true);
      assert.equal(await marker.getAttribute('x1'), committedPosition);
      await plot.tap({ position:olderPoint });
      await preview.waitFor();
      assert.equal(await preview.getAttribute('data-touch'), '');
      assert.match(await preview.locator('li').first().textContent(), /InsideNo reading/);
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
      const compact = editor.getByLabel('Use a compact comparison chart',{exact:true});
      await compact.check();
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].sections[0].comparison.layout),'compact');
      await compact.uncheck();
      assert.equal(await page.evaluate(() => Object.hasOwn(tracker.draft.toolbar[0].sections[0].comparison,'layout')),false);
      assert.deepEqual(mediaRequests, []);
      assert.deepEqual(errors, []);
      for (const locale of ['en','he']) {
        for (const [width, expectedRows] of [[320,[2,2,2]],[391,[3,3]]]) {
          await page.setViewportSize({width,height:844});
          await open('?legend-density&locale=' + locale);
          await range.waitFor();
          const layout = await comparison.evaluate(chart => {
            const legend = [...chart.querySelectorAll('.comparison-series')];
            const groups = new Map();
            for (const item of legend) {
              const y = Math.round(item.getBoundingClientRect().top);
              groups.set(y, (groups.get(y) ?? 0) + 1);
            }
            return {
              rows:[...groups.values()],
              fitted:chart.scrollWidth <= chart.clientWidth + 1,
              touches:legend.every(item => item.offsetWidth >= 44 && item.offsetHeight >= 44),
              labels:legend.flatMap(item => {
                const name = item.querySelector('.comparison-reading-name');
                const value = item.querySelector('.comparison-value');
                const nameClipping = name.scrollWidth - name.clientWidth;
                const valueClipping = value.scrollWidth - value.clientWidth;
                const overlap = name.getBoundingClientRect().bottom - value.getBoundingClientRect().top;
                return Math.max(nameClipping,valueClipping,overlap) <= 1
                  ? [] : [{name:name.textContent,nameClipping,valueClipping,overlap}];
              }),
              plotHeight:chart.querySelector('svg').getBoundingClientRect().height,
              sliderHeight:chart.querySelector('input[type=range]').getBoundingClientRect().height,
            };
          });
          const details = JSON.stringify({locale,width,layout});
          assert.deepEqual(layout.rows,expectedRows,details);
          assert.ok(layout.fitted && layout.touches && layout.labels.length === 0,details);
          assert.ok(layout.plotHeight >= 140 && layout.plotHeight <= 152 && layout.sliderHeight >= 44,details);
          const insideLegend = legend('Inside',locale);
          await insideLegend.press('Space');
          assert.equal(await insideLegend.getAttribute('aria-pressed'),'false');
          assert.equal(await range.isEnabled(),true);
          await insideLegend.press('Space');
          assert.equal(await insideLegend.getAttribute('aria-pressed'),'true');
        }
      }
      await assertLiveComparison(browser);
      await assertSensorReadingCards(browser);
      await assertCompactComparison(browser);
      console.log(name + ': compact timeline controls, six and twelve tap-preview readings, and scroll/drag safety');
      console.log(name + ': opted-in Sensors readings, retained precision, history, graph navigation and editor');
      console.log(name + ': rolling Recorder refresh, historical selection, one trailing refresh, stale response and teardown');
      console.log(name + ': responsive sensor comparison, recorder gaps, keyboard values, native fallback, disposal and editor');
    } finally {
      await browser.close();
    }
  });
} finally {
  await new Promise(resolve => server.close(resolve));
}
