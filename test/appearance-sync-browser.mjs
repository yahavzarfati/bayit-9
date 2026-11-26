import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';
import { runBrowserEngines } from './browser-engines.mjs';
import { catalog } from '../src/wallpaper-catalog.js';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const photograph = await readFile(new URL('../dist/' + catalog.misty_lake.photo.preview, import.meta.url));
const states = new Map();
const helpers = new Map();
const helperBindings = {
  background: { entity:'input_select.fixture_palette', options:{ aurora:'Aurora', jade:'Jade', 'shared-garden':'Garden' } },
  shape: { entity:'input_select.fixture_shape', options:{ soft:'Rounded', circle:'Round' } },
  layout: { entity:'input_select.fixture_layout', options:{ classic:'Classic', header:'Titles above' } },
};
const helperSeed = Object.fromEntries(Object.values(helperBindings).map(({entity, options}) => [entity,
  { entity_id:entity, state:Object.values(options)[0], attributes:{ options:Object.values(options) } },
]));
const defaults = {
  type:'custom:bayit-9', title:'Fixture Home', appearance_sync:true,
  background:'aurora', layout:'classic', shape:'soft',
  shared_wallpapers:[
    { id:'shared-garden', name:'Garden photo', path:'/local/fixture/garden.webp' },
    { id:'shared-missing', name:'Missing photo', path:'/local/fixture/missing.webp' },
  ],
};
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<main></main><script type="module">
import '/bayit-9.js';
const query = new URL(location.href).searchParams;
const fixtureId = query.get('fixture');
const admin = !query.has('member');
const profile = '/fixture-appearance-backend/' + fixtureId;
const helperPath = '/fixture-appearance-helpers/' + fixtureId;
const linked = query.has('helpers');
const tracker = { attempts:[], saves:[], release:undefined, reject:false };
const read = async () => (await fetch(profile, { cache:'no-store' })).json();
const hass = {
  user:{ id:admin ? 'admin' : 'member', is_admin:admin }, locale:{ language:'en' }, themes:{}, states:{}, entities:{},
  services:linked ? { input_select:{ select_option:{} } } : {},
  async callWS(request) {
    tracker.attempts.push(request);
    if (request.type === 'call_service' && linked) {
      if (tracker.holdHelper) {
        tracker.holdHelper = false;
        await new Promise(resolve => { tracker.releaseHelper = resolve; });
      }
      if (tracker.rejectHelper) {
        tracker.rejectHelper = false;
        throw new Error('Fixture denied helper change');
      }
      const response = await fetch(helperPath, { method:'POST', body:JSON.stringify(request) });
      if (!response.ok) throw new Error('Invalid helper request');
      await tracker.syncHelpers();
      return {};
    }
    if (request.type === 'lovelace/dashboards/list') return [{ url_path:'fixture-appearance', mode:'storage' }];
    if (request.type === 'lovelace/config') {
      const config = await read();
      if (tracker.holdRead && --tracker.holdRead === 0) {
        await new Promise(resolve => { tracker.releaseRead = resolve; });
        tracker.readFinished = true;
      }
      if (tracker.conflict && --tracker.conflict === 0) config.strategy.title = 'External revision';
      return config;
    }
    if (request.type === 'lovelace/config/save') {
      tracker.saves.push(request.config.strategy);
      if (tracker.hold) {
        tracker.hold = false;
        await new Promise(resolve => { tracker.release = resolve; });
      }
      if (tracker.reject) { tracker.reject = false; throw new Error('Fixture rejected storage change'); }
      await fetch(profile, { method:'POST', body:JSON.stringify(request.config) });
      if (tracker.rebuildOnSave) {
        const replace = tracker.rebuildOnSave === 'replace';
        tracker.rebuildOnSave = undefined;
        await tracker.refresh(replace);
      }
      return {};
    }
    throw new Error('Unexpected request ' + request.type);
  },
};
const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
let card;
tracker.syncHelpers = async () => {
  hass.states = await (await fetch(helperPath, { cache:'no-store' })).json();
  if (card) card.hass = { ...hass };
};
tracker.updateRegistry = (entity, metadata) => {
  hass.entities = { ...hass.entities, [entity]:metadata };
  card.hass = { ...hass };
};
tracker.refresh = async (replace = false) => {
  const strategy = (await read()).strategy;
  if (linked) {
    strategy.locale = query.get('locale') || 'en';
    strategy.appearance_helpers = ${JSON.stringify(helperBindings)};
  }
  const config = Strategy.generate(strategy, hass).views[0].cards[0];
  if (replace || !card) {
    const next = document.createElement('bayit-dashboard');
    next.setConfig(config);
    next.hass = hass;
    document.querySelector('main').replaceChildren(next);
    card = next;
  } else {
    card.setConfig(config);
    card.hass = hass;
  }
};
if (linked) await tracker.syncHelpers();
await tracker.refresh();
window.tracker = tracker;
</script>`;
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const profile = /^\/fixture-appearance-backend\/([a-z0-9-]+)$/.exec(url.pathname);
  const helperBackend = /^\/fixture-appearance-helpers\/([a-z0-9-]+)$/.exec(url.pathname);
  if (helperBackend) {
    const id = helperBackend[1];
    if (!helpers.has(id)) helpers.set(id, structuredClone(helperSeed));
    const records = helpers.get(id);
    if (request.method === 'POST') {
      const chunks = [];
      for await (const bytes of request) chunks.push(bytes);
      const payload = JSON.parse(Buffer.concat(chunks).toString());
      const { type, domain, service, target, service_data:data } = payload;
      const entity = records[target?.entity_id];
      if (type !== 'call_service' || domain !== 'input_select' || service !== 'select_option' ||
          !entity?.attributes.options.includes(data?.option)) return response.writeHead(400).end();
      entity.state = data.option;
    }
    response.writeHead(200, { 'content-type':'application/json', 'cache-control':'no-store' }).end(JSON.stringify(records));
  } else if (url.pathname === '/bayit-9.js') {
    response.writeHead(200, { 'content-type':'text/javascript' }).end(bundle);
  } else if (profile) {
    const id = profile[1];
    if (!states.has(id)) states.set(id, { strategy:{ ...defaults, appearance_sync:!id.endsWith('-legacy') } });
    if (request.method === 'POST') {
      const chunks = [];
      for await (const bytes of request) chunks.push(bytes);
      states.set(id, JSON.parse(Buffer.concat(chunks).toString()));
    }
    response.writeHead(200, { 'content-type':'application/json', 'cache-control':'no-store' }).end(JSON.stringify(states.get(id)));
  } else if (url.pathname === '/local/fixture/garden.webp') {
    response.writeHead(200, { 'content-type':'image/webp' }).end(photograph);
  } else if (url.pathname.startsWith('/local/')) {
    response.writeHead(404).end();
  } else {
    response.writeHead(200, { 'content-type':'text/html; charset=utf-8' }).end(fixture);
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

const home = 'http://127.0.0.1:' + server.address().port + '/fixture-appearance/home?fixture=';
const openSettings = async page => {
  const dialog = page.getByRole('dialog', { name:'Appearance', exact:true });
  if (!await dialog.isVisible()) await page.getByRole('button', { name:'Appearance', exact:true }).click();
  await dialog.waitFor();
  return dialog;
};
const openLayout = async dialog => {
  const layout = dialog.locator('.appearance-layout');
  if (!await layout.getAttribute('open').then(value => value !== null)) await layout.locator('summary').click();
};
const pressed = (dialog, key, value) => dialog.locator('[data-preference="' + key + '"][value="' + value + '"]');
const current = (page, key) => page.locator('.shell').getAttribute('data-' + key);
const after = (page, key, value) => page.locator('.shell[data-' + key + '="' + value + '"]').waitFor();
const saves = page => page.evaluate(() => tracker.saves.length);

async function assertRemountedAppearanceOverrides(browser, prefix) {
  for (const [locale, words] of [
    ['en', { appearance:'Appearance', setup:'Customize home', enable:'Save admin appearance choices for the household immediately',
      save:'Save dashboard', saved:'Household appearance saved.', error:'Could not load or save dashboard settings.' }],
    ['he', { appearance:'מראה', setup:'התאמת הבית', enable:'שמירה מיידית של בחירות מנהל הבית לכל הבית',
      save:'שמירת הדשבורד', saved:'מראה הבית נשמר.', error:'לא ניתן לטעון או לשמור את הגדרות הדשבורד.' }],
  ]) {
    for (const newer of [false, true]) {
      const id = prefix + '-remount-' + locale + (newer ? '-newer' : '-retained');
      states.set(id, { strategy:{ ...defaults, appearance_sync:false, locale } });
      const page = await browser.newPage({ viewport:{ width:locale === 'he' ? 391 : 320, height:844 },
        hasTouch:true, reducedMotion:'reduce' });
      page.setDefaultTimeout(8000);
      const url = home + id;
      const otherScope = 'bayit-9.preferences.v1:/other-household';
      const localChoices = () => page.evaluate(() => {
        const card = document.querySelector('bayit-dashboard');
        return JSON.parse(localStorage.getItem(card.config.storageKey));
      });
      const settings = page.getByRole('dialog', { name:words.appearance, exact:true });
      const open = async () => {
        await page.getByRole('button', { name:words.appearance, exact:true }).press('Enter');
        await settings.waitFor();
        await openLayout(settings);
      };
      const feedback = text => settings.locator('.appearance-actions [role=status]').filter({ hasText:text });
      try {
        await page.goto(url);
        await open();
        await pressed(settings,'shape','square').press('Enter');
        await pressed(settings,'layout','header').press('Enter');
        await after(page,'shape','square');
        assert.deepEqual(await localChoices(), { shape:'square', layout:'header' });
        assert.equal(await saves(page), 0, 'Disabled household sync keeps appearance on this browser');

        await settings.getByRole('button', { name:words.setup, exact:true }).press('Enter');
        const setup = page.getByRole('dialog', { name:words.setup, exact:true });
        await setup.getByText(words.appearance, { exact:true }).press('Enter');
        await setup.getByLabel(words.enable, { exact:true }).check();
        await Promise.all([page.waitForEvent('load'), setup.getByRole('button', { name:words.save, exact:true }).press('Enter')]);
        await open();
        assert.equal(await current(page,'shape'), 'square');

        await page.evaluate(() => { tracker.reject = true; });
        await pressed(settings,'shape','circle').press('Enter');
        await feedback(words.error).waitFor();
        assert.deepEqual(await localChoices(), { shape:'square', layout:'header' });
        assert.equal(states.get(id).strategy.shape, 'soft');

        await page.evaluate(() => { tracker.hold = true; tracker.rebuildOnSave = 'replace'; });
        await pressed(settings,'shape','circle').press('Enter');
        await page.waitForFunction(() => Boolean(tracker.release));
        await page.evaluate(({ newer, otherScope }) => {
          if (newer) {
            const { storageKey } = document.querySelector('bayit-dashboard').config;
            const stored = JSON.parse(localStorage.getItem(storageKey));
            localStorage.setItem(storageKey, JSON.stringify({ ...stored, shape:'soft' }));
          }
          localStorage.setItem(otherScope, JSON.stringify({ shape:'square', layout:'classic' }));
          tracker.release();
        }, { newer, otherScope });
        await feedback(words.saved).waitFor();
        const expectedShape = newer ? 'soft' : 'circle';
        const expectedLocal = newer ? { shape:'soft', layout:'header' } : { layout:'header' };
        await after(page,'shape',expectedShape);
        assert.deepEqual(await localChoices(), expectedLocal);
        assert.equal(await current(page,'layout'), 'header');
        assert.equal(states.get(id).strategy.shape, 'circle');
        assert.equal(states.get(id).strategy.layout, 'classic');
        await page.reload();
        await after(page,'shape',expectedShape);
        assert.equal(await current(page,'layout'), 'header');
        assert.deepEqual(await localChoices(), expectedLocal);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), otherScope),
          JSON.stringify({ shape:'square', layout:'classic' }));
      } finally {
        await page.close();
      }
    }
  }
}

async function assertLinkedAppearance(browser, prefix) {
  for (const locale of ['en','he']) {
    const fixtureId = prefix + '-linked-' + locale;
    const member = await browser.newPage({ viewport:{width:320,height:844}, hasTouch:true, reducedMotion:'reduce' });
    const admin = await browser.newPage({ viewport:{width:390,height:844}, hasTouch:true, reducedMotion:'reduce' });
    const errors = [];
    for (const page of [member, admin]) {
      page.setDefaultTimeout(8000);
      page.on('pageerror', error => errors.push(error.message));
    }
    const waitAttempts = (page, count) => page.waitForFunction(value => tracker.attempts.length === value, count);
    const sync = page => page.evaluate(() => tracker.syncHelpers());
    const calls = page => page.evaluate(() => tracker.attempts);
    const call = (key, option) => ({ type:'call_service', domain:'input_select', service:'select_option',
      target:{ entity_id:helperBindings[key].entity }, service_data:{ option } });
    const open = async page => {
      const name = locale === 'he' ? 'מראה' : 'Appearance';
      await page.getByRole('button', { name,exact:true }).click();
      return page.getByRole('dialog', { name,exact:true });
    };
    const refreshRegistry = (page, entity, metadata) =>
      page.evaluate(([id,value]) => tracker.updateRegistry(id,value),[entity,metadata]);
    try {
      const url = home + fixtureId + '&helpers&locale=' + locale;
      await Promise.all([member.goto(url + '&member'), admin.goto(url)]);
      const memberSettings = await open(member);
      const adminSettings = await open(admin);
      await Promise.all([openLayout(memberSettings),openLayout(adminSettings)]);
      const memberRound = pressed(memberSettings,'shape','circle');
      assert.deepEqual(await calls(member),[]);
      assert.deepEqual(await calls(admin),[]);

      await member.evaluate(() => { tracker.holdHelper = true; });
      await memberRound.click();
      await member.waitForFunction(() => !!tracker.releaseHelper);
      assert.equal(await current(member,'shape'),'soft');
      assert.equal(await current(admin,'shape'),'soft');
      assert.equal(await memberRound.getAttribute('aria-disabled'),'true');
      await member.evaluate(() => tracker.releaseHelper());
      await after(member,'shape','circle');
      await sync(admin);
      await after(admin,'shape','circle');
      assert.equal(await memberRound.getAttribute('aria-pressed'),'true');
      assert.deepEqual(await calls(member),[call('shape','Round')]);

      // An unmapped choice is browser-local even as a member of a shared home.
      await pressed(memberSettings,'shape','square').click();
      await after(member,'shape','square');
      await pressed(adminSettings,'shape','soft').click();
      await after(admin,'shape','soft');
      await pressed(adminSettings,'layout','header').click();
      await after(admin,'layout','header');
      await sync(member);
      await after(member,'layout','header');
      assert.equal(await current(member,'shape'),'square');
      assert.deepEqual(await calls(admin),[call('shape','Rounded'),call('layout','Titles above')]);
      assert.deepEqual(await calls(member),[call('shape','Round')]);

      const layout = pressed(memberSettings,'layout','classic');
      await refreshRegistry(member, helperBindings.layout.entity,{ hidden_by:'user' });
      await member.waitForFunction(() =>
        document.querySelector('bayit-dashboard').shadowRoot
          .querySelector('[data-preference=layout][value=classic]').getAttribute('aria-disabled') === 'true');
      await layout.evaluate(item => item.click());
      assert.deepEqual(await calls(member),[call('shape','Round')]);
      await refreshRegistry(member, helperBindings.layout.entity,{});
      await after(member,'layout','header');
      assert.equal(await layout.getAttribute('aria-disabled'),'false');

      const memberGallery = memberSettings.locator('.wallpaper-gallery');
      await memberGallery.locator('summary').click();
      const selectGroup = (gallery, group) => gallery.locator('[data-wallpaper-category="' + group + '"]').click();
      await selectGroup(memberGallery,'nature');
      const jade = memberGallery.locator('[data-wallpaper-choice=jade]');
      await member.evaluate(() => { tracker.rejectHelper = true; });
      await jade.click();
      await memberGallery.getByText(locale === 'he'
        ? 'לא ניתן לשמור את בחירת המראה המשותפת.' : 'Could not save this shared appearance choice.',{exact:true}).waitFor();
      assert.equal(await current(member,'background'),'aurora');
      await jade.click();
      await after(member,'background','jade');
      await sync(admin);
      await after(admin,'background','jade');

      await selectGroup(memberGallery,'personal');
      await memberGallery.locator('input[type=file]').setInputFiles({ name:'Fixture.webp', mimeType:'image/webp', buffer:photograph });
      await after(member,'background','personal');
      const adminGallery = adminSettings.locator('.wallpaper-gallery');
      await adminGallery.locator('summary').click();
      await selectGroup(adminGallery,'shared');
      await adminGallery.locator('[data-wallpaper-choice=shared-garden]').click();
      await after(admin,'background','shared-garden');
      await sync(member);
      assert.equal(await current(member,'background'),'personal');
      const reset = locale === 'he' ? 'שימוש בברירת המחדל של הבית' : 'Use household defaults';
      await memberSettings.getByRole('button',{name:reset,exact:true}).click();
      await after(member,'background','shared-garden');
      await after(member,'shape','soft');
      await waitAttempts(member,3);
      assert.deepEqual(await calls(member),[call('shape','Round'),call('background','Jade'),call('background','Jade')]);
      assert.deepEqual(await calls(admin),[call('shape','Rounded'),call('layout','Titles above'),call('background','Garden')]);
      assert.deepEqual(errors,[]);
    } finally {
      await Promise.all([member.close(),admin.close()]);
    }
  }
}

try {
  await runBrowserEngines([[chromium, 'Chromium'], [webkit, 'WebKit']], async (engine, name) => {
    const browser = await engine.launch();
    try {
      const admin = await browser.newPage({ viewport:{ width:390, height:844 }, hasTouch:true, reducedMotion:'reduce' });
      const member = await browser.newPage({ viewport:{ width:320, height:844 }, hasTouch:true, reducedMotion:'reduce' });
      const errors = [];
      for (const page of [admin,member]) {
        page.setDefaultTimeout(8000);
        page.on('pageerror', error => errors.push(error.message));
      }
      const fixtureId = name.toLowerCase();
      await admin.goto(home + fixtureId);
      await member.goto(home + fixtureId + '&member');
      let settings = await openSettings(admin);
      const memberSettings = await openSettings(member);
      assert.equal(await settings.getByRole('region',{name:'Household appearance',exact:true}).count(),1);
      assert.equal(await memberSettings.getByRole('region',{name:'Appearance on this browser',exact:true}).count(),1);
      assert.equal(await settings.getByRole('button',{name:'Save as household defaults',exact:true}).count(),0);
      await openLayout(settings);

      await admin.evaluate(() => { tracker.hold = true; tracker.rebuildOnSave = 'replace'; });
      await pressed(settings,'shape','circle').focus();
      await pressed(settings,'shape','circle').click();
      await admin.waitForFunction(() => !!tracker.release);
      assert.equal(await current(admin,'shape'),'soft');
      assert.equal(await pressed(settings,'shape','square').getAttribute('aria-disabled'),'true');
      await pressed(settings,'shape','square').evaluate(node => node.click());
      assert.equal(await saves(admin),1);
      await admin.evaluate(() => tracker.release());
      await after(admin,'shape','circle');
      await settings.getByText('Household appearance saved.',{exact:true}).waitFor();
      const focused = locator => locator.evaluate(item => item.getRootNode().activeElement === item);
      assert.equal(await settings.locator('.appearance-layout').getAttribute('open'),'');
      assert.equal(await focused(pressed(settings,'shape','circle')),true);
      await admin.evaluate(() => tracker.refresh());
      await settings.waitFor();
      assert.equal(await settings.locator('.appearance-layout').getAttribute('open'),'');
      assert.equal(await focused(pressed(settings,'shape','circle')),true);
      await member.evaluate(() => tracker.refresh());
      await after(member,'shape','circle');

      await openLayout(memberSettings);
      await pressed(memberSettings,'shape','square').click();
      await after(member,'shape','square');
      assert.equal(await saves(member),0);
      await pressed(settings,'layout','header').click();
      await after(admin,'layout','header');
      await member.evaluate(() => tracker.refresh());
      await after(member,'layout','header');
      assert.equal(await current(member,'shape'),'square');
      assert.equal(states.get(fixtureId).strategy.shape,'circle');

      await admin.evaluate(() => { tracker.reject = true; });
      await pressed(settings,'layout','classic').click();
      await settings.getByText('Could not load or save dashboard settings.',{exact:true}).waitFor();
      assert.equal(await current(admin,'layout'),'header');
      assert.equal(states.get(fixtureId).strategy.layout,'header');
      const beforeConflict = await saves(admin);
      await admin.evaluate(() => { tracker.conflict = 2; });
      await pressed(settings,'layout','classic').click();
      await settings.getByText('The dashboard changed while you were editing. Reload it and try again.',{exact:true}).waitFor();
      assert.equal(await current(admin,'layout'),'header');
      assert.equal(await saves(admin),beforeConflict);
      for (const read of [1,2]) {
        await admin.evaluate(index => {
          tracker.holdRead = index;
          tracker.releaseRead = undefined;
          tracker.readFinished = false;
        }, read);
        await pressed(settings,'layout','classic').click();
        await admin.waitForFunction(() => !!tracker.releaseRead);
        await settings.getByRole('button',{name:'Close',exact:true}).evaluate(control => {
          // Resume data loading before the browser delivers the queued dialog close event.
          control.click();
          tracker.releaseRead();
        });
        await settings.waitFor({state:'hidden'});
        await admin.waitForFunction(() => tracker.readFinished);
        await admin.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        assert.equal(await saves(admin),beforeConflict, 'Canceled on read ' + read);
        assert.equal(await current(admin,'layout'),'header');
        settings = await openSettings(admin);
        await openLayout(settings);
      }

      const gallery = settings.locator('.wallpaper-gallery');
      await gallery.locator('summary').click();
      await gallery.getByRole('button',{name:'Shared photos',exact:true}).click();
      const count = await saves(admin);
      await gallery.getByRole('button',{name:'Missing photo',exact:true}).click();
      await gallery.getByText('Could not load this shared photo.',{exact:true}).waitFor();
      assert.equal(await current(admin,'background'),'aurora');
      assert.equal(await saves(admin),count);
      await admin.evaluate(() => { tracker.hold = true; tracker.release = undefined; });
      await gallery.getByRole('button',{name:'Garden photo',exact:true}).click();
      await admin.waitForFunction(() => !!tracker.release);
      assert.equal(await current(admin,'background'),'aurora');
      assert.equal(await gallery.getByRole('button',{name:'Missing photo',exact:true}).getAttribute('aria-disabled'),'true');
      await admin.evaluate(() => tracker.release());
      await after(admin,'background','shared-garden');
      await gallery.getByText('Household appearance saved.',{exact:true}).waitFor();
      await member.evaluate(() => tracker.refresh());
      await after(member,'background','shared-garden');

      await gallery.getByRole('button',{name:'All',exact:true}).click();
      await gallery.getByRole('button',{name:'More wallpapers',exact:true}).click();
      const jade = gallery.locator('[data-wallpaper-choice="jade"]');
      await admin.evaluate(() => { tracker.hold = true; tracker.release = undefined; tracker.rebuildOnSave = 'same'; });
      await jade.focus();
      await jade.click();
      await admin.waitForFunction(() => !!tracker.release);
      const modalBody = settings.locator('.modal-body');
      const scroll = await modalBody.evaluate(body => body.scrollTop);
      assert.ok(scroll > 30);
      await admin.evaluate(() => tracker.release());
      await after(admin,'background','jade');
      assert.equal(states.get(fixtureId).strategy.background,'jade');
      assert.equal(await gallery.getAttribute('open'),'');
      assert.equal(await gallery.getByRole('button',{name:'All',exact:true}).getAttribute('aria-pressed'),'true');
      assert.equal(await gallery.getByRole('button',{name:'More wallpapers',exact:true}).count(),0);
      assert.equal(await focused(jade),true);
      assert.ok(Math.abs(await modalBody.evaluate(body => body.scrollTop) - scroll) <= 2);
      assert.equal(await jade.evaluate(item => {
        const visible = item.closest('.modal-body').getBoundingClientRect();
        const bounds = item.getBoundingClientRect();
        return bounds.bottom > visible.top && bounds.top < visible.bottom;
      }),true);

      await gallery.getByRole('button',{name:'My photo',exact:true}).click();
      const beforePersonal = await saves(admin);
      await gallery.locator('input[type=file]').setInputFiles({ name:'Fixture.webp', mimeType:'image/webp', buffer:photograph });
      await after(admin,'background','personal');
      assert.equal(await saves(admin),beforePersonal);
      assert.equal(states.get(fixtureId).strategy.background,'jade');

      await settings.getByRole('button',{name:'Customize home',exact:true}).click();
      const setup = admin.getByRole('dialog',{name:'Customize home',exact:true});
      await setup.getByText('Appearance',{exact:true}).click();
      const sync = setup.getByLabel('Save admin appearance choices for the household immediately',{exact:true});
      assert.equal(await sync.isChecked(),true);
      const title = setup.getByLabel('Dashboard title',{exact:true});
      await title.fill('Unsaved draft');
      await title.press('Tab');
      await setup.getByRole('button',{name:'Close',exact:true}).click();
      await setup.waitFor({state:'hidden'});
      settings = await openSettings(admin);
      await openLayout(settings);
      await pressed(settings,'shape','soft').click();
      await settings.getByText('Save or discard your dashboard draft before changing the household appearance.',{exact:true}).waitFor();
      assert.equal(await saves(admin),beforePersonal);
      assert.equal(await current(admin,'shape'),'circle');

      await settings.getByRole('button',{name:'Close',exact:true}).click();
      await settings.waitFor({state:'hidden'});
      await admin.evaluate(() => tracker.refresh(true));
      assert.equal(await settings.isVisible(),false);
      settings = await openSettings(admin);
      assert.equal(await settings.locator('.appearance-layout').getAttribute('open'),null);
      assert.equal(await settings.locator('.wallpaper-gallery').getAttribute('open'),null);

      await admin.goto(home + fixtureId + '-legacy');
      settings = await openSettings(admin);
      await openLayout(settings);
      await pressed(settings,'shape','square').click();
      await after(admin,'shape','square');
      assert.equal(await saves(admin),0);
      assert.equal(await settings.getByRole('button',{name:'Save as household defaults',exact:true}).count(),1);
      assert.deepEqual(errors,[]);
      console.log(name + ': opt-in household appearance, selected-key writes, failures, draft guard and personal overrides');
      await assertLinkedAppearance(browser, fixtureId);
      console.log(name + ': linked member and admin appearance, localized controls, registry guard and local-only overrides');
      await assertRemountedAppearanceOverrides(browser, fixtureId);
      console.log(name + ': household appearance clears only superseded local overrides across a dashboard replacement');
    } finally {
      await browser.close();
    }
  });
} finally {
  await new Promise(resolve => server.close(resolve));
}
