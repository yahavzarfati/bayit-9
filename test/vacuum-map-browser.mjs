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
const tracker = { factories: 0, calls: [], configs: [], hass: [], closed: 0, details: [] };
document.addEventListener('hass-more-info', event => tracker.details.push(event.detail.entityId));
const compactFixture = options.has('layout-proof');
const he = options.get('locale') === 'he';
const vacuum = 'vacuum.fixture';
const selector = 'select.fixture';
const downstairs = 'image.lower';
const upstairs = 'image.upper';
const calibration = [
  { map: { x: 10, y: 30 }, vacuum: { x: 1000, y: 3000 } },
  { map: { x: 20, y: 30 }, vacuum: { x: 2000, y: 3000 } },
  { map: { x: 10, y: 40 }, vacuum: { x: 1000, y: 4000 } },
];
const image = (entity, id) => ({ state: '2026-11-25T10:00:00Z', attributes: {
  entity_picture: '/api/image_proxy/' + entity + '?token=fixture',
  calibration_points: options.has('bad-calibration') ? Array(3).fill(calibration[0]) : calibration,
  friendly_name: id === 2 ? 'Lower image' : 'Upper image',
  rooms: { [id]: { name: 'Room ' + id, outline: [[1000,3000],[2000,3000],[1000,4000]] } },
} });
const hass = {
  locale: { language: he ? 'he' : 'en' }, themes: {},
  states: {
    [vacuum]: { state: 'docked', attributes: { friendly_name: 'Robot', supported_features: 30524,
      ...(compactFixture && { fan_speed: 'Balanced', fan_speed_list: ['Quiet', 'Balanced', 'Max'] }) } },
    [selector]: { state: 'Upper', attributes: { friendly_name: 'Map selector', options: ['Lower','Upper'] } },
    'select.wrong': { state: 'Lower', attributes: { friendly_name: 'Other robot selector', options: ['Lower','Upper'] } },
    [downstairs]: image(downstairs, 2), [upstairs]: image(upstairs, 8),
    'image.hidden': image('image.hidden', 6),
    'button.fixture_daily': { state:'unknown', attributes:{ friendly_name:he ? 'תוכנית יומית' : 'Daily cleaning' } },
    'button.fixture_night': { state:'unknown', attributes:{ friendly_name:he ? 'ניקוי לילה' : 'Night cleaning' } },
    'button.fixture_upper': { state:'unknown', attributes:{ friendly_name:he ? 'שאיבת הקומה העליונה' : 'Vacuum the upper floor' } },
    'button.fixture_mop': { state:'unknown', attributes:{ friendly_name:he ? 'שטיפת הקומה העליונה' : 'Mop the upper floor' } },
    'button.fixture_reset': { state:'unknown', attributes:{ friendly_name:'Reset counter' } },
    'button.fixture_reset_brush': { state:'unknown', attributes:{ friendly_name:he ? 'איפוס מונה המברשת הראשית' : 'Reset the main brush counter' } },
    'button.fixture_other': { state:'unknown', attributes:{ friendly_name:'Other button' } },
    'sensor.fixture_reading': { state:'47', attributes:{ friendly_name:'Vacuum battery', unit_of_measurement:'%' } },
    'sensor.fixture_status': { state:'Docked', attributes:{ friendly_name:'Robot status' } },
    'sensor.fixture_maintenance': { state:'54.64', attributes:{ friendly_name:'Filter', unit_of_measurement:'h' } },
    ...(options.has('hero') && {
      'sensor.fixture_progress': { state:'28', attributes:{friendly_name:'Cleaning progress'} },
      'binary_sensor.fixture_cleaning': { state:'off', attributes:{friendly_name:'Cleaning activity'} },
      'sensor.fixture_room': { state:'Room 3', attributes:{friendly_name:'Current room'} },
      'sensor.fixture_room_conflict': { state:'ROOM 3', attributes:{friendly_name:'Room code'} },
      'sensor.fixture_hidden': { state:'50', attributes:{friendly_name:'Hidden sensor'} },
    }),
  },
  areas: {}, devices: {},
  entities: { [vacuum]: { di:'robot' }, [selector]: { di:'robot' }, 'select.wrong': { di:'other' },
    'image.hidden': { hidden: true }, 'sensor.fixture_hidden': { hidden: true } },
  callWS(message) {
    tracker.calls.push(message);
    if (message.domain === 'select') {
      if (options.has('reject-floor')) return Promise.reject(new Error('Fixture refused floor switch'));
      if (options.has('request-timeout')) return new Promise(() => {});
    }
    return Promise.resolve({});
  },
};
const tag = 'xiaomi-vacuum-map-card';
if (!options.has('missing')) customElements.define(tag, class extends HTMLElement {
  connectedCallback() {
    this.textContent = 'Synthetic map';
    if (compactFixture) {
      this.tabIndex = 0;
      this.style.minHeight = '250px';
      this.style.display = 'block';
    }
  }
  disconnectedCallback() { tracker.closed++; }
  setConfig(config) { tracker.configs.push(config); }
  set hass(value) { tracker.hass.push(value); }
});
window.loadCardHelpers = async () => {
  if (options.has('delay')) await new Promise(resolve => { tracker.build = resolve; });
  return { createCardElement(config) {
    tracker.factories++;
    const element = document.createElement(tag);
    element.setConfig(config);
    return element;
  } };
};
const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
const before = options.get('before');
const config = { type: 'custom:bayit-9', toolbar: [
  { kind: 'vacuum', sections: [{ id:'robot', kind: 'vacuum', entities: [{ entity: vacuum, role: 'device',
    ...(options.has('hero') && { vacuum_summary: { status_entity:'sensor.fixture_status', battery_entity:'sensor.fixture_reading',
      progress_entity:'sensor.fixture_progress', cleaning_entity:'binary_sensor.fixture_cleaning' } }),
  }] },
    ...(options.has('programs') ? [
      {id:'programs',kind:'actions',title:'Programs',entities:[
        {entity:'button.fixture_daily',role:'action',command:'vacuum_program'},
        {entity:'button.fixture_night',role:'action',command:'vacuum_program',confirmation:'Start night cleaning?'},
        ...(compactFixture ? [
          {entity:'button.fixture_upper',role:'action',command:'vacuum_program'},
          {entity:'button.fixture_mop',role:'action',command:'vacuum_program'},
        ] : [{entity:'button.fixture_other',role:'action'}]),
      ]},
      {id:'status',kind:'readings',title:'Status and maintenance',...(options.has('readouts') && { layout:'readouts' }),entities:[
        {entity:'sensor.fixture_reading',role:'status'},
        ...(options.has('readouts') ? [
          {entity:'sensor.fixture_status',role:'status',readout:{state_labels:{
            Docked:he ? 'מחובר לעמדה' : 'At dock', segment_cleaning:he ? 'מנקה חדר' : 'Cleaning a room',
            unknown:'Misleading label', unavailable:'Also misleading',
          }}},
          {entity:selector,role:'status',readout:{state_labels:{Upper:'Second floor'}}},
          {entity:'sensor.fixture_maintenance',role:'status',readout:{precision:0}},
        ] : []),
        ...(options.has('hero') ? [
          {entity:'sensor.fixture_room',role:'status',readout:{state_labels:{'room 3':he ? 'חדר 3' : 'Third room'}}},
          {entity:'sensor.fixture_room_conflict',role:'status',readout:{state_labels:{'room 3':'Lower','Room 3':'Mixed'}}},
        ] : []),
      ]},
      {id:'resets',kind:'actions',title:'Maintenance resets',entities:[
        {entity:'button.fixture_reset',role:'action',confirmation:'Reset the counter?'},
        ...(compactFixture ? [{entity:'button.fixture_reset_brush',role:'action',confirmation:true}] : []),
      ]},
    ] : [])],
    vacuum_map: { enabled: !options.has('disabled'), vacuum, selector,
      ...(before && { before_section: before }),
      ...(options.has('compact') && { compact_controls: true }),
      ...(options.has('editor') ? { floors: [] } : { floors: [
        { option: 'Lower', name: 'Lower floor', image: downstairs },
        { option: 'Upper', name: 'Upper floor', image: upstairs },
      ] }) } },
  { kind: 'settings' },
] };
const dashboard = document.createElement('bayit-dashboard');
dashboard.setConfig(Strategy.generate(config, hass).views[0].cards[0]);
dashboard.hass = hass;
document.querySelector('main').append(dashboard);
tracker.setState = (entity, value) => {
  hass.states[entity] = { ...hass.states[entity], state: value };
  dashboard.hass = { ...hass, states: { ...hass.states } };
};
tracker.floor = value => tracker.setState(selector, value);
tracker.hideEntity = (id, hidden = true) => {
  hass.entities[id] = { ...hass.entities[id], hidden };
  dashboard.hass = { ...hass, entities: { ...hass.entities } };
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
  if (request.url.startsWith('/api/image_proxy/')) {
    response.writeHead(200, { 'content-type':'image/svg+xml' });
    return response.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60"><rect x="5" y="5" width="70" height="50" fill="silver"/></svg>');
  }
  const script = request.url === '/bayit-9.js';
  response.writeHead(200, { 'content-type': script ? 'text/javascript' : 'text/html' });
  response.end(script ? bundle : fixture);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

async function assertVacuumFloorRecovery(browser) {
  for (const [flags, locale] of [['reject-floor','en'],['state-timeout','he'],['request-timeout','en']]) {
    const hebrew = locale === 'he';
    const page = await browser.newPage({ viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce' });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = 'http://127.0.0.1:' + server.address().port + '/fixture-home/home';
    const name = hebrew ? 'שואב' : 'Robot vacuum';
    const panel = page.getByRole('dialog',{name,exact:true});
    const map = panel.locator('xiaomi-vacuum-map-card');
    const preview = panel.getByRole('img',{name:hebrew ? 'מפת קומה לצפייה בלבד' : 'Read-only floor map',exact:true});
    const select = panel.getByRole('button',{name:'Lower floor',exact:true});
    const unavailable = hebrew ? 'מפת הקומה אינה זמינה.' : 'The floor map is unavailable.';
    const expected = { type:'call_service',domain:'select',service:'select_option',
      service_data:{option:'Lower'},target:{entity_id:'select.fixture'} };
    const commands = () => page.evaluate(() => tracker.calls);
    const open = () => page.getByRole('button',{name,exact:true}).tap();
    const close = async () => {
      await panel.getByRole('button',{name:hebrew ? 'סגירה' : 'Close',exact:true}).tap();
      await panel.waitFor({state:'hidden'});
    };
    const oldMapBlocked = () => page.evaluate(async () => {
      try {
        await tracker.hass[0].callService('roborock','set_vacuum_goto_position',{entity_id:'vacuum.fixture',x:1,y:2});
        return false;
      } catch { return true; }
    });
    try {
      if (flags !== 'reject-floor') await page.clock.install();
      await page.goto(base + '?' + flags + '&locale=' + locale);
      await open();
      await map.waitFor();
      assert.deepEqual(await commands(),[]);
      await select.tap();
      await map.waitFor({state:'detached'});
      assert.deepEqual(await commands(),[expected]);
      assert.equal(await oldMapBlocked(),true);
      if (flags !== 'reject-floor') {
        assert.equal(await preview.isVisible(),false);
        await close();
        await open();
        assert.equal(await map.count(),0);
        assert.equal(await preview.isVisible(),false);
        await page.clock.fastForward(11000);
      }
      await preview.waitFor();
      assert.match(await preview.getAttribute('src'),/\/api\/image_proxy\/image\.upper\?token=fixture$/);
      assert.ok(await preview.evaluate(async image => {
        await image.decode();
        return image.naturalWidth > 0;
      }));
      assert.equal(await map.count(),0);
      await panel.getByText(hebrew ? 'הפקודות מהמפה מושהות.' : 'Map commands are paused.',{exact:false}).waitFor();
      await close();
      await open();
      await preview.waitFor();
      assert.equal(await map.count(),0);
      assert.equal(await oldMapBlocked(),true);
      assert.deepEqual(await commands(),[expected]);

      await page.evaluate(() => tracker.floor('unavailable'));
      await preview.waitFor({state:'hidden'});
      await panel.getByText(unavailable,{exact:false}).waitFor();
      assert.equal(await map.count(),0);
      assert.equal(await select.isDisabled(),true);

      await page.evaluate(() => tracker.floor('Upper'));
      await preview.waitFor();
      assert.equal(await map.count(),0);
      assert.equal(await select.isEnabled(),true);
      await page.evaluate(() => tracker.floor('Lower'));
      await map.waitFor();
      await preview.waitFor({state:'hidden'});
      assert.equal(await page.evaluate(() => tracker.configs.at(-1).map_source.camera),'image.lower');
      assert.equal(await oldMapBlocked(),true);
      await page.evaluate(() => tracker.hass.at(-1).callService('roborock','set_vacuum_goto_position',
        {entity_id:'vacuum.fixture',x:1,y:2}));
      assert.deepEqual(await commands(),[expected,{type:'call_service',domain:'roborock',
        service:'set_vacuum_goto_position',service_data:{x:1,y:2},target:{entity_id:'vacuum.fixture'}}]);
      assert.deepEqual(errors,[]);
    } finally { await page.close(); }
  }
}

async function assertCompactVacuumMap(browser) {
  for (const locale of ['en', 'he']) {
    const he = locale === 'he';
    const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    page.setDefaultTimeout(8000);
    const url = `http://127.0.0.1:${server.address().port}/fixture-home/home?programs&before=status&layout-proof&locale=${locale}`;
    const dialog = page.getByRole('dialog', { name: he ? 'שואב' : 'Robot vacuum', exact: true });
    const map = dialog.locator('xiaomi-vacuum-map-card');
    const robot = dialog.locator('[data-toolbar-vacuum-compact]');
    const programs = dialog.locator('[data-vacuum-compact-program]');
    const resets = dialog.locator('[data-vacuum-compact-resets]');
    const details = robot.locator('.vacuum-extra-controls');
    const summary = details.locator('summary');
    const read = () => page.evaluate(() => tracker.calls);
    const open = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button', { name: he ? 'שואב' : 'Robot vacuum', exact: true }).tap();
      await dialog.waitFor();
    };
    const geometry = () => dialog.evaluate(panel => {
      const bounds = panel.getBoundingClientRect();
      const map = panel.querySelector('xiaomi-vacuum-map-card')?.getBoundingClientRect();
      const sections = [...panel.querySelectorAll('.toolbar-panes > .toolbar-section')].map(node => node.dataset.section);
      const actionBoxes = selector => [...panel.querySelectorAll(selector)].map(button => {
        const box = button.getBoundingClientRect();
        const text = button.querySelector('.tile-label');
        const label = document.createRange();
        label.selectNodeContents(text);
        const linesFit = [...label.getClientRects()].every(line => line.top >= box.top && line.bottom <= box.bottom &&
          line.left >= box.left && line.right <= box.right);
        const style = getComputedStyle(button);
        return { x: box.x, y: box.y, w: box.width, h: box.height,
          fullLabel: linesFit && text.scrollHeight <= text.clientHeight && text.scrollWidth <= text.clientWidth + 1,
          border:style.borderColor, radius:style.borderRadius };
      });
      const touch = [...panel.querySelectorAll('[data-toolbar-vacuum-compact] :is(.device-panel-launch,.basic-actions button), .vacuum-extra-controls > summary, [data-section=vacuum-map] .weather-tabs button')].map(button => {
        const box = button.getBoundingClientRect();
        return [box.width, box.height];
      });
      const body = panel.querySelector('.modal-body');
      return { mapTop: map?.y, mapVisible: map && Math.min(bounds.bottom, map.bottom) - map.y,
        sections, programs:actionBoxes('[data-vacuum-compact-program]'),
        resets:actionBoxes('.toolbar-section[data-section=actions]:last-child .tile-row'),
        touch, fits: body.scrollWidth <= body.clientWidth + 1 };
    });
    try {
      for (const width of [320, 391]) {
        await page.setViewportSize({ width, height: 844 });
        await open('');
        await map.waitFor();
        assert.equal(await robot.count(), 0);
        assert.equal(await programs.count(), 0);
        assert.equal(await resets.count(), 0);
        const standard = await geometry();
        await open('&compact');
        await map.waitFor();
        await summary.waitFor();
        const compact = await geometry();
        assert.equal(await map.evaluate(element => getComputedStyle(element).getPropertyValue('--map-card-zoomer-background').trim()), 'transparent');
        assert.deepEqual(compact.sections, standard.sections);
        assert.ok(compact.mapTop <= standard.mapTop - 100, JSON.stringify({ width, compact, standard }));
        assert.ok(compact.mapVisible >= 240, JSON.stringify({ width, compact }));
        assert.ok(compact.fits && compact.touch.every(([w, h]) => w >= 43.9 && h >= 43.9), JSON.stringify({ width, compact }));
        assert.equal(compact.programs.length, 4);
        assert.ok(compact.programs.every(({ w, h, fullLabel }) => w >= 44 && h >= 44 && fullLabel),
          JSON.stringify({ width, locale, programs:compact.programs }));
        const [first, second, third, fourth] = compact.programs;
        assert.ok(first.x < second.x && third.x < fourth.x && first.y === second.y && third.y === fourth.y && third.y > first.y);
        assert.equal(await resets.count(), 1);
        assert.equal(compact.resets.length, 2);
        assert.ok(compact.resets.every(({ w, h, fullLabel, border, radius }, index) =>
          w >= 44 && h >= 52 && h < standard.resets[index].h && fullLabel && border !== standard.resets[index].border && radius === '20px'),
          JSON.stringify({ width, locale, resets:compact.resets }));
        assert.ok(compact.resets[0].x < compact.resets[1].x);
        assert.equal(await summary.getAttribute('aria-label'), he ? 'פקדי שואב נוספים' : 'More vacuum controls');
        assert.equal(await details.locator('select:visible').count(), 0);
        assert.deepEqual(await read(), []);
      }
      await summary.press('Enter');
      const fan = details.getByRole('combobox');
      await fan.waitFor();
      assert.equal(await fan.inputValue(), 'Balanced');
      await fan.selectOption('Max');
      assert.deepEqual(await read(), []);
      await details.locator('button[data-action=set_fan_speed]').tap();
      await page.waitForFunction(() => tracker.calls.some(call => call.service === 'set_fan_speed'));
      assert.deepEqual((await read())[0], { type: 'call_service', domain: 'vacuum', service: 'set_fan_speed',
        service_data: { fan_speed: 'Max' }, target: { entity_id: 'vacuum.fixture' } });
      await summary.press('Enter');
      await fan.waitFor({ state: 'hidden' });
      await map.focus();
      await page.evaluate(() => tracker.setState('vacuum.fixture', 'cleaning'));
      await robot.getByRole('button', { name: he ? 'השהיית ניקוי' : 'Pause cleaning', exact: true }).waitFor();
      assert.ok(await map.evaluate(node => node.getRootNode().activeElement === node));
      assert.equal(await page.evaluate(() => tracker.factories), 1);

      await programs.nth(1).tap();
      const confirm = page.locator('dialog.confirm[open]');
      await confirm.getByText('Start night cleaning?', { exact: true }).waitFor();
      assert.equal((await read()).length, 1);
      await confirm.getByRole('button', { name: he ? 'ביטול' : 'Cancel', exact: true }).tap();
      await programs.first().tap();
      await page.waitForFunction(() => tracker.calls.length === 2);
      assert.deepEqual((await read())[1], { type: 'call_service', domain: 'button', service: 'press',
        service_data: {}, target: { entity_id: 'button.fixture_daily' } });

      const reset = resets.getByRole('button', { name:'Reset counter', exact:true });
      await reset.tap();
      await confirm.getByText('Reset the counter?', { exact:true }).waitFor();
      assert.equal((await read()).length, 2);
      await confirm.getByRole('button', { name:he ? 'ביטול' : 'Cancel', exact:true }).tap();
      assert.ok(await reset.evaluate(button => button.getRootNode().activeElement === button));
      assert.equal((await read()).length, 2);
      await reset.tap();
      await confirm.getByRole('button', { name:he ? 'אישור' : 'Confirm', exact:true }).tap();
      await page.waitForFunction(() => tracker.calls.length === 3);
      assert.deepEqual((await read())[2], { type:'call_service', domain:'button', service:'press',
        service_data:{}, target:{ entity_id:'button.fixture_reset' } });

      await open('&compact&disabled');
      assert.equal(await robot.count(), 0);
      assert.equal(await programs.count(), 0);
      assert.equal(await resets.count(), 0);
      assert.equal(await map.count(), 0);
      assert.deepEqual(await read(), []);
    } finally {
      await page.close();
    }
  }
}

async function assertVacuumHeroSummary(browser) {
  for (const locale of ['en','he']) {
    const he = locale === 'he';
    const page = await browser.newPage({ viewport:{width:391,height:844},hasTouch:true,reducedMotion:'reduce' });
    page.setDefaultTimeout(8000);
    const home = 'http://127.0.0.1:' + server.address().port + '/fixture-home/home';
    const query = '?programs&readouts&before=status&compact&locale=' + locale;
    const name = he ? 'שואב' : 'Robot vacuum';
    const dialog = page.getByRole('dialog',{name,exact:true});
    const head = dialog.locator('[data-treatment=vacuum] .device-head');
    const reading = head.locator('.current');
    const readouts = dialog.locator('[data-section=readings]');
    const map = dialog.locator('xiaomi-vacuum-map-card');
    const open = async flags => {
      await page.goto(home + query + flags);
      await page.getByRole('button',{name,exact:true}).tap();
      await map.waitFor();
    };
    const state = (entity,value) => page.evaluate(([id,state]) => tracker.setState(id,state), [entity,value]);
    const hide = entity => page.evaluate(id => tracker.hideEntity(id), entity);
    try {
      await open('');
      assert.doesNotMatch(await reading.textContent(),/47%/);
      await open('&hero');
      const atDock = he ? 'מחובר לעמדה' : 'At dock';
      const cleaningRoom = he ? 'מנקה חדר' : 'Cleaning a room';
      const mode = dialog.locator('[data-section=vacuum] [data-action=vacuum_start]');
      await mode.waitFor();
      await reading.filter({hasText:atDock}).waitFor();
      assert.match(await reading.textContent(),/47%/);
      assert.doesNotMatch(await reading.textContent(),/28%/);
      const detail = head.and(dialog.getByRole('button', { name: he ? 'Robot · מידע נוסף' : 'Robot · More info', exact: true }));
      await detail.waitFor({timeout: 3000});
      assert.match(await detail.getAttribute('aria-description'), /47%/);
      for (const width of [320, 391]) {
        await page.setViewportSize({ width, height: 844 });
        const { width: hitWidth, height: hitHeight } = await detail.boundingBox();
        assert.ok(hitWidth >= 210 && hitHeight >= 44);
      }
      await detail.getByText('Robot', { exact: true }).tap();
      const detailEvents = () => page.evaluate(() => tracker.details);
      assert.deepEqual(await detailEvents(), ['vacuum.fixture']);
      await reading.dispatchEvent('pointerdown', { pointerType:'touch', pointerId:5, button:0, isPrimary:true });
      await page.waitForFunction(() => tracker.details.length === 2);
      await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { pointerType:'touch', pointerId:5 })));
      await detail.press('Shift+Enter');
      assert.deepEqual(await detailEvents(), Array(3).fill('vacuum.fixture'));
      const wasStillVisible = await detail.evaluate(button => {
        tracker.hideEntity('vacuum.fixture');
        const visible = button.isConnected && !button.disabled;
        button.click();
        tracker.hideEntity('vacuum.fixture', false);
        return visible;
      });
      assert.equal(wasStillVisible, true, 'The old header can still be present before the registry re-renders');
      assert.deepEqual(await detailEvents(), Array(3).fill('vacuum.fixture'));
      assert.deepEqual(await page.evaluate(() => tracker.calls), []);
      await readouts.getByText(he ? 'חדר 3' : 'Third room',{exact:true}).waitFor();
      await readouts.getByText('ROOM 3',{exact:true}).waitFor();
      await state('sensor.fixture_room_conflict','Room 3');
      await readouts.getByText('Mixed',{exact:true}).waitFor();
      await state('sensor.fixture_status','segment_cleaning');
      await reading.filter({hasText:cleaningRoom}).waitFor();
      assert.match(await reading.textContent(),/28%/);
      assert.ok(await reading.evaluate(text => text.scrollWidth <= text.clientWidth + 1));
      await state('sensor.fixture_status','Docked');
      await reading.filter({hasText:atDock}).waitFor();
      assert.doesNotMatch(await reading.textContent(),/28%/);
      await state('binary_sensor.fixture_cleaning','on');
      await reading.filter({hasText:/28%/}).waitFor();
      await hide('sensor.fixture_status');
      await reading.filter({hasText:he ? 'בעמדה' : 'Docked'}).waitFor();
      assert.match(await reading.textContent(),/47%/);
      await hide('sensor.fixture_reading');
      await reading.filter({hasNotText:/47%/}).waitFor();
      assert.equal(await page.evaluate(() => tracker.factories),1);
      assert.deepEqual(await page.evaluate(() => tracker.calls),[]);
      await state('vacuum.fixture','unavailable');
      await reading.filter({hasText:he ? 'לא זמין' : 'Unavailable'}).waitFor();
      assert.doesNotMatch(await reading.textContent(),/28%/);
      await map.waitFor({state:'detached'});
      assert.deepEqual(await page.evaluate(() => tracker.calls),[]);

      await page.goto(home + query + '&hero&editor');
      await page.getByText(he ? 'סרגל ומסכים נוספים' : 'Toolbar and extra screens',{exact:true}).click();
      const editor = page.locator('#editor');
      await editor.locator('[data-toolbar-focus=section-edit-0]').click();
      await editor.locator('[data-toolbar-focus=entity-edit-0]').click();
      const battery = editor.getByLabel(he ? 'חיישן רמת הסוללה' : 'Battery level sensor',{exact:true});
      const activity = editor.getByLabel(he ? 'חיישן פעילות הניקוי' : 'Cleaning activity sensor',{exact:true});
      assert.equal(await battery.inputValue(),'sensor.fixture_reading');
      assert.equal(await activity.inputValue(),'binary_sensor.fixture_cleaning');
      assert.equal(await battery.locator('option[value="sensor.fixture_hidden"]').count(),0);
      assert.equal(await activity.locator('option[value="sensor.fixture_reading"]').count(),0);
      await battery.selectOption('');
      const saved = await page.evaluate(() => tracker.draft.toolbar[0].sections[0].entities[0].vacuum_summary);
      assert.deepEqual(saved,{ status_entity:'sensor.fixture_status', progress_entity:'sensor.fixture_progress',
        cleaning_entity:'binary_sensor.fixture_cleaning' });
    } finally { await page.close(); }
  }
}

try {
  await runBrowserEngines([[chromium, 'Chromium'], [webkit, 'WebKit']], async (engine, name) => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on('pageerror', error => errors.push(error));
      const openFixture = options => page.goto(`http://127.0.0.1:${server.address().port}/fixture-home/home${options}`);
      const open = () => page.getByRole('button', { name: 'Robot vacuum', exact: true }).click();
      const close = () => page.getByRole('button', { name: 'Close', exact: true }).click();
      const map = page.locator('xiaomi-vacuum-map-card');

      for (const [query, text] of [['?missing', 'Install the Xiaomi Vacuum Map Card'],
        ['?bad-calibration', 'The floor map is unavailable.'], ['?disabled', null]]) {
        await openFixture(query);
        await open();
        await page.getByText('Robot', { exact: true }).waitFor();
        if (text) await page.getByText(text, { exact: false }).waitFor();
        else assert.equal(await page.getByRole('heading', {name:'Floor map'}).count(), 0);
        assert.equal(await map.count(), 0);
        assert.equal(await page.evaluate(() => tracker.calls.length), 0);
      }

      await openFixture('');
      assert.equal(await map.count(), 0);
      await open();
      await map.waitFor();
      assert.deepEqual(await page.evaluate(() => tracker.calls), []);
      const proveUpper = await page.evaluate(() => ({ config: tracker.configs[0], states: Object.keys(tracker.hass.at(-1).states) }));
      assert.deepEqual(proveUpper.config.map_source, { camera: 'image.upper' });
      assert.equal(Object.hasOwn(proveUpper.config,'activate'), false);
      assert.equal(Object.hasOwn(proveUpper.config,'additional_presets'), false);
      assert.deepEqual(proveUpper.config.map_modes.map(mode => mode.template),
        ['vacuum_clean_zone','vacuum_clean_segment','vacuum_goto']);
      assert.equal(proveUpper.config.map_modes[1].predefined_selections[0].id, '8');
      assert.deepEqual(proveUpper.states, ['vacuum.fixture','image.upper']);

      await page.getByRole('button', { name: 'Lower floor', exact: true }).click();
      await page.getByText('Waiting for the vacuum to report', { exact: false }).waitFor();
      await map.waitFor({ state:'detached' });
      assert.deepEqual(await page.evaluate(() => tracker.calls), [
        { type:'call_service', domain:'select', service:'select_option', service_data:{option:'Lower'}, target:{entity_id:'select.fixture'} },
      ]);
      assert.equal(await page.evaluate(async () => {
        try { await tracker.hass[0].callService('roborock','set_vacuum_goto_position',{entity_id:'vacuum.fixture',x:1,y:2}); }
        catch { return true; }
        return false;
      }), true);
      await page.evaluate(() => tracker.floor('Lower'));
      await map.waitFor();
      assert.equal(await page.evaluate(() => tracker.configs.at(-1).map_source.camera), 'image.lower');
      const requests = await page.evaluate(async () => {
        const scoped = tracker.hass.at(-1);
        const block = async (...args) => {
          try { await scoped.callService(...args); return false; }
          catch { return true; }
        };
        const forbidden = await Promise.all([
          block('select','select_option',{entity_id:'select.fixture',option:'Upper'}),
          block('vacuum','send_command',{entity_id:'other.robot',command:'app_zoned_clean',params:[[1,2,3,4,1]]}),
          block('vacuum','send_command',{entity_id:'vacuum.fixture',command:'app_segment_clean',params:[{segments:[8],repeat:1}]}),
          block('vacuum','send_command',{entity_id:'vacuum.fixture',command:'app_zoned_clean',params:[[1,2,3,4,8]]}),
        ]);
        await scoped.callService('vacuum','send_command',{entity_id:'vacuum.fixture',command:'app_segment_clean',params:[{segments:[2],repeat:1}]});
        await scoped.callService('roborock','set_vacuum_goto_position',{entity_id:'vacuum.fixture',x:1,y:2});
        return { forbidden, calls:tracker.calls.slice(1) };
      });
      assert.deepEqual(requests.forbidden,[true,true,true,true]);
      assert.deepEqual(requests.calls,[
        {type:'call_service',domain:'vacuum',service:'send_command',service_data:{command:'app_segment_clean',params:[{segments:[2],repeat:1}]},target:{entity_id:'vacuum.fixture'}},
        {type:'call_service',domain:'roborock',service:'set_vacuum_goto_position',service_data:{x:1,y:2},target:{entity_id:'vacuum.fixture'}},
      ]);
      await page.evaluate(() => tracker.hideEntity('image.lower'));
      await map.waitFor({state:'detached'});
      await close();

      await openFixture('?reject-floor');
      await open();
      await map.waitFor();
      await page.getByRole('button', {name:'Lower floor'}).click();
      await page.getByText('The vacuum has not confirmed the change.', {exact:false}).waitFor();
      assert.equal(await map.count(),0);
      assert.equal(await page.evaluate(() => tracker.calls.length),1);
      await page.evaluate(() => tracker.floor('Lower'));
      await map.waitFor();
      await page.evaluate(() => {
        history.pushState({}, '', '/another-dashboard');
        window.dispatchEvent(new CustomEvent('location-changed'));
      });
      await map.waitFor({ state:'detached' });

      await openFixture('?delay');
      await open();
      await page.waitForFunction(() => tracker.build);
      await close();
      await page.evaluate(() => tracker.build());
      assert.equal(await page.evaluate(() => tracker.factories),0);
      assert.equal(await map.count(),0);

      await openFixture('?editor&disabled');
      await page.getByText('Toolbar and extra screens', {exact:true}).click();
      await page.getByLabel('Show calibrated floor maps').check();
      const selector = page.getByLabel('Selected-map entity');
      assert.equal(await selector.locator('option[value="select.wrong"]').count(),0);
      await page.getByLabel('Map option').selectOption('Lower');
      await page.getByRole('button', {name:'Add floor'}).click();
      const image = page.getByLabel('Calibrated map image');
      assert.equal(await image.locator('option[value="image.hidden"]').count(),0);
      await image.selectOption('image.lower');
      assert.deepEqual(await page.evaluate(() => tracker.draft.toolbar[0].vacuum_map.floors),
        [{ option:'Lower',image:'image.lower',name:undefined }]);

      const mapOrder = () => page.locator('dialog[open] .toolbar-panes > .toolbar-section').evaluateAll(
        sections => sections.map(section => section.dataset.section));
      for (const target of ['status', 'no-longer-present', '[invalid]']) {
        await openFixture('?programs&before=' + encodeURIComponent(target));
        await open();
        await map.waitFor();
        assert.deepEqual(await mapOrder(), target === 'status'
          ? ['vacuum', 'actions', 'vacuum-map', 'readings', 'actions']
          : ['vacuum', 'actions', 'readings', 'actions', 'vacuum-map']);
        assert.deepEqual(await page.evaluate(() => tracker.calls), []);
      }
      await openFixture('?programs&before=status');
      await open();
      const callLog = () => page.evaluate(() => tracker.calls);
      const dialog = page.getByRole('dialog', { name:'Robot vacuum', exact:true });
      const confirm = page.locator('dialog.confirm[open]');
      assert.equal(await dialog.getByRole('button', { name:'Vacuum battery', exact:false }).count(), 1);
      const expected = entity_id => ({ type:'call_service', domain:'button', service:'press', service_data:{}, target:{entity_id} });
      await dialog.getByRole('button', { name:'Daily cleaning', exact:true }).click();
      assert.equal(await confirm.count(), 0);
      assert.deepEqual(await callLog(), [expected('button.fixture_daily')]);
      for (const [button, prompt] of [
        ['Night cleaning', 'Start night cleaning?'], ['Reset counter', 'Reset the counter?'],
        ['Other button', 'Continue with Press button on Other button?'],
      ]) {
        await dialog.getByRole('button', { name:button, exact:true }).click();
        await confirm.getByText(prompt, { exact:true }).waitFor();
        assert.deepEqual(await callLog(), [expected('button.fixture_daily')]);
        await confirm.getByRole('button', { name:'Cancel', exact:true }).click();
      }
      await dialog.getByRole('button', { name:'Night cleaning', exact:true }).click();
      await confirm.getByRole('button', { name:'Confirm', exact:true }).click();
      assert.deepEqual(await callLog(), [expected('button.fixture_daily'), expected('button.fixture_night')]);

      await openFixture('?programs&readouts&before=status');
      await open();
      await map.waitFor();
      const readings = dialog.locator('[data-section=readings]');
      const tiles = readings.locator('.toolbar-readout');
      const values = () => tiles.locator('.tile-state').allTextContents();
      assert.deepEqual(await values(), ['\u206647 %\u2069', 'At dock', 'Second floor', '55 h']);
      const positions = await tiles.evaluateAll(items => items.map(item => Math.round(item.getBoundingClientRect().top)));
      assert.equal(new Set(positions).size, 1);
      assert.equal(await readings.getByRole('button').count(), 0);
      await page.evaluate(() => tracker.setState('sensor.fixture_status', 'docked'));
      await page.evaluate(() => tracker.setState('sensor.fixture_maintenance', 'unavailable'));
      await tiles.getByText('Unavailable', { exact:true }).waitFor();
      assert.deepEqual((await values()).slice(1), ['At dock', 'Second floor', 'Unavailable']);
      await page.evaluate(() => tracker.setState('sensor.fixture_status', 'unknown'));
      await tiles.getByText('Unknown state', { exact:true }).waitFor();
      assert.deepEqual((await values()).slice(1), ['Unknown state', 'Second floor', 'Unavailable']);
      assert.deepEqual(await callLog(), []);
      await close();

      await openFixture('?editor&programs&before=status');
      await page.getByText('Toolbar and extra screens', { exact:true }).click();
      const compact = page.getByLabel('Use compact robot and program controls', { exact:true });
      assert.ok(!await compact.isChecked());
      await compact.check();
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].vacuum_map.compact_controls), true);
      const placement = page.getByLabel('Show map before section', { exact:true });
      assert.equal(await placement.inputValue(), 'status');
      await placement.selectOption({ label:'End of the screen' });
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].vacuum_map.before_section), undefined);
      await placement.selectOption('programs');
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].vacuum_map.before_section), 'programs');
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].vacuum_map.compact_controls), true);
      await compact.uncheck();
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].vacuum_map.compact_controls), undefined);
      await page.getByRole('button', { name:'Programs', exact:true }).click();
      await page.locator('#editor').getByRole('button', { name:'Other button', exact:true }).click();
      const programConfirm = page.getByLabel('Confirmation', { exact:true });
      await programConfirm.selectOption({ label:'Run immediately' });
      const programDraft = () => page.evaluate(() => tracker.draft.toolbar[0].sections.find(section => section.id === 'programs')
        .entities.find(item => item.entity === 'button.fixture_other'));
      assert.equal((await programDraft()).command, 'vacuum_program');
      await programConfirm.selectOption({ label:'Ask before running' });
      assert.equal((await programDraft()).confirmation, true);
      await programConfirm.selectOption({ label:'Automatic' });
      assert.equal((await programDraft()).command, undefined);
      await page.getByRole('button', { name:'Status and maintenance', exact:true }).click();
      await page.getByLabel('Show compact read-only status tiles').check();
      await page.locator('#editor').getByRole('button', { name:'Vacuum battery', exact:true }).click();
      const decimalPlaces = page.getByLabel('Decimal places (0–3)');
      await decimalPlaces.fill('0');
      await decimalPlaces.press('Tab');
      const unit = page.getByLabel('Display unit for numeric readings');
      await unit.fill('percent');
      await unit.press('Tab');
      const labels = page.getByLabel('Labels for reported values');
      await labels.fill('Full = Charged\nEmpty = Needs charge');
      await labels.press('Tab');
      const readoutDraft = () => page.evaluate(() => tracker.draft.toolbar[0].sections.find(section => section.id === 'status'));
      const saved = await readoutDraft();
      assert.equal(saved.layout, 'readouts');
      assert.deepEqual(saved.entities[0].readout, { precision:0, unit:'percent', state_labels:{Full:'Charged', Empty:'Needs charge'} });
      await labels.fill('unknown = Misleading');
      await labels.press('Tab');
      assert.equal(await labels.getAttribute('aria-invalid'), 'true');
      assert.deepEqual(await readoutDraft(), saved);
      assert.deepEqual(errors, []);
      await assertVacuumFloorRecovery(browser);
      console.log(name + ': rejected and timed-out floor changes stay read-only through reopening until HA confirms a calibrated floor');
      await assertCompactVacuumMap(browser);
      console.log(name + ': calibrated map placement, compact mobile layout, explicit selection, and scoped program commands');
      await assertVacuumHeroSummary(browser);
      console.log(name + ': robot summary, folded room labels, live source visibility and editor bindings');
    } finally {
      await browser.close();
    }
  });
} finally {
  await new Promise(resolve => server.close(resolve));
}
