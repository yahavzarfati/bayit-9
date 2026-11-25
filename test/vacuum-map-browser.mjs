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
const tracker = { factories: 0, calls: [], configs: [], hass: [], closed: 0 };
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
  locale: { language: 'en' }, themes: {},
  states: {
    [vacuum]: { state: 'docked', attributes: { friendly_name: 'Robot', supported_features: 30524 } },
    [selector]: { state: 'Upper', attributes: { friendly_name: 'Map selector', options: ['Lower','Upper'] } },
    'select.wrong': { state: 'Lower', attributes: { friendly_name: 'Other robot selector', options: ['Lower','Upper'] } },
    [downstairs]: image(downstairs, 2), [upstairs]: image(upstairs, 8),
    'image.hidden': image('image.hidden', 6),
    'button.fixture_daily': { state:'unknown', attributes:{ friendly_name:'Daily cleaning' } },
    'button.fixture_night': { state:'unknown', attributes:{ friendly_name:'Night cleaning' } },
    'button.fixture_reset': { state:'unknown', attributes:{ friendly_name:'Reset counter' } },
    'button.fixture_other': { state:'unknown', attributes:{ friendly_name:'Other button' } },
    'sensor.fixture_reading': { state:'47', attributes:{ friendly_name:'Vacuum battery', unit_of_measurement:'%' } },
    'sensor.fixture_status': { state:'Docked', attributes:{ friendly_name:'Robot status' } },
    'sensor.fixture_maintenance': { state:'54.64', attributes:{ friendly_name:'Filter', unit_of_measurement:'h' } },
  },
  areas: {}, devices: {},
  entities: { [vacuum]: { di:'robot' }, [selector]: { di:'robot' }, 'select.wrong': { di:'other' },
    'image.hidden': { hidden: true } },
  callWS(message) {
    tracker.calls.push(message);
    if (options.has('reject-floor') && message.domain === 'select') return Promise.reject(new Error('Fixture refused floor switch'));
    return Promise.resolve({});
  },
};
const tag = 'xiaomi-vacuum-map-card';
if (!options.has('missing')) customElements.define(tag, class extends HTMLElement {
  connectedCallback() { this.textContent = 'Synthetic map'; }
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
  { kind: 'vacuum', sections: [{ id:'robot', kind: 'vacuum', entities: [{ entity: vacuum, role: 'device' }] },
    ...(options.has('programs') ? [
      {id:'programs',kind:'actions',title:'Programs',entities:[
        {entity:'button.fixture_daily',role:'action',command:'vacuum_program'},
        {entity:'button.fixture_night',role:'action',command:'vacuum_program',confirmation:'Start night cleaning?'},
        {entity:'button.fixture_other',role:'action'},
      ]},
      {id:'status',kind:'readings',title:'Status and maintenance',...(options.has('readouts') && { layout:'readouts' }),entities:[
        {entity:'sensor.fixture_reading',role:'status'},
        ...(options.has('readouts') ? [
          {entity:'sensor.fixture_status',role:'status',readout:{state_labels:{Docked:'At dock',unknown:'Misleading label',unavailable:'Also misleading'}}},
          {entity:selector,role:'status',readout:{state_labels:{Upper:'Second floor'}}},
          {entity:'sensor.fixture_maintenance',role:'status',readout:{precision:0}},
        ] : []),
      ]},
      {id:'resets',kind:'actions',title:'Maintenance resets',entities:[
        {entity:'button.fixture_reset',role:'action',confirmation:'Reset the counter?'},
      ]},
    ] : [])],
    vacuum_map: { enabled: !options.has('disabled'), vacuum, selector,
      ...(before && { before_section: before }),
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
tracker.hideImage = id => {
  hass.entities[id] = { hidden: true };
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
  const script = request.url === '/bayit-9.js';
  response.writeHead(200, { 'content-type': script ? 'text/javascript' : 'text/html' });
  response.end(script ? bundle : fixture);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

try {
  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
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
      await page.evaluate(() => tracker.hideImage('image.lower'));
      await map.waitFor({state:'detached'});
      await close();

      await openFixture('?reject-floor');
      await open();
      await map.waitFor();
      await page.getByRole('button', {name:'Lower floor'}).click();
      await page.getByText('The vacuum has not confirmed this floor.', {exact:false}).waitFor();
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
      assert.deepEqual((await values()).slice(1), ['Docked', 'Second floor', 'Unavailable']);
      await page.evaluate(() => tracker.setState('sensor.fixture_status', 'unknown'));
      await tiles.getByText('Unknown state', { exact:true }).waitFor();
      assert.deepEqual((await values()).slice(1), ['Unknown state', 'Second floor', 'Unavailable']);
      assert.deepEqual(await callLog(), []);
      await close();

      await openFixture('?editor&programs&before=status');
      await page.getByText('Toolbar and extra screens', { exact:true }).click();
      const placement = page.getByLabel('Show map before section', { exact:true });
      assert.equal(await placement.inputValue(), 'status');
      await placement.selectOption({ label:'End of the screen' });
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].vacuum_map.before_section), undefined);
      await placement.selectOption('programs');
      assert.equal(await page.evaluate(() => tracker.draft.toolbar[0].vacuum_map.before_section), 'programs');
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
      console.log(name + ': calibrated map placement, explicit selection, and scoped program commands');
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
