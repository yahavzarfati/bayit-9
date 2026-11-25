import assert from 'node:assert/strict';
import test from 'node:test';
import { createPopupHistory, normalizePopupAliases, parsePopupRoute, popupRouteFragment, resolvePopupRoute } from '../src/popup-routes.js';

const room = { kind: 'room', room: 'Studio_1' };
const device = { kind: 'device', room: 'Studio_1', entity: 'light.desk' };
const panel = { kind: 'panel', panel: 'weather-main' };
const roomHash = '#room-Studio_1';
const deviceHash = '#device/Studio_1/light.desk';
const panelHash = '#panel/weather-main';
const aliases = new Map([['#legacy-light', deviceHash], ['#legacy-weather', panelHash]]);

class Browser extends EventTarget {
  CustomEvent = CustomEvent;
  setTimeout = setTimeout;
  clearTimeout = clearTimeout;
  entries;
  index = 0;

  constructor(url) {
    super();
    this.entries = [{ url: new URL(url, 'http://fixture.invalid'), state: { root: true } }];
    const view = this;
    this.history = {
      get state() { return view.entries[view.index].state; },
      pushState(state, _, url) {
        const next = new URL(url, view.location);
        view.entries.splice(++view.index, view.entries.length, { state, url: next });
      },
      replaceState(state, _, url) {
        view.entries[view.index] = { state, url: new URL(url, view.location) };
      },
      back() { view.move(-1); },
    };
  }

  get location() { return this.entries[this.index].url; }
  move(step) {
    this.index += step;
    this.dispatchEvent(new Event('popstate'));
    this.dispatchEvent(new Event('hashchange'));
  }
}

function fixture(url) {
  const view = new Browser(url);
  const admitted = new Set([roomHash, panelHash, deviceHash]);
  const observations = [];
  const navigation = createPopupHistory({ view,
    resolve: hash => resolvePopupRoute(hash, route => admitted.has(popupRouteFragment(route)), aliases),
    onChange: change => observations.push(change),
  });
  return { view, admitted, observations, navigation };
}

test('canonical routes round-trip and reject malformed or untrusted form fragments', () => {
  for (const [route, hash] of [[room, roomHash], [device, deviceHash], [panel, panelHash]]) {
    assert.equal(popupRouteFragment(route), hash);
    assert.deepEqual(parsePopupRoute(hash), route);
  }
  for (const fragment of [undefined, 'room-Studio_1', '#room-Studio%5F1', '#room-Studio_1\n',
    '#device/../light.desk', '#device/Studio_1/light.Desk', '#device/Studio_1/light.desk/action',
    '#panel//weather-main', '#boiler-schedule-edit', '#' + 'a'.repeat(512)]) {
    assert.equal(parsePopupRoute(fragment), null);
  }
  assert.equal(popupRouteFragment({ kind: 'form', mode: 'edit' }), '');
  assert.equal(popupRouteFragment({ kind: 'room', room: 'Studio\n' }), '');
});

test('a device schedule address has one typed pane and never carries an edit or draft target', () => {
  const route = {kind:'device',room:'Studio_1',entity:'switch.boiler',detail:'schedule'};
  const fragment = '#device/Studio_1/switch.boiler/schedule';
  assert.equal(popupRouteFragment(route),fragment);
  assert.deepEqual(parsePopupRoute(fragment),route);
  const config = normalizePopupAliases({'#former-form':fragment});
  const aliases = new Map(Object.entries(config));
  assert.deepEqual(resolvePopupRoute('#former-form',route=>route.detail === 'schedule',aliases),route);
  assert.equal(resolvePopupRoute('#former-form',()=>false,aliases),null);
  assert.equal(popupRouteFragment({...route,detail:'edit'}),'');
  assert.equal(parsePopupRoute(fragment + '/edit'),null);
  assert.equal(parsePopupRoute(fragment + '?schedule_id=draft'),null);
});

test('aliases cannot bypass admission, shadow valid native routes, or chain to other aliases', () => {
  const configured = new Map([...aliases, [roomHash, panelHash], ['#chain', '#legacy-light']]);
  const valid = route => [deviceHash, roomHash, panelHash].includes(popupRouteFragment(route));
  assert.deepEqual(resolvePopupRoute(roomHash, valid, configured), room);
  assert.deepEqual(resolvePopupRoute('#legacy-light', valid, configured), device);
  assert.equal(resolvePopupRoute('#legacy-light', route => route.kind !== 'device', configured), null);
  assert.equal(resolvePopupRoute('#chain', valid, configured), null);
  assert.equal(resolvePopupRoute(undefined, valid, configured), null);
});

test('owner aliases accept only local fragments with typed popup destinations', () => {
  assert.deepEqual(normalizePopupAliases({
    '#old-room': roomHash, '#old-lamp': deviceHash, [panelHash]: panelHash,
    '#other-site': 'https://example.com/#weather', '#old-form': '#boiler-schedule-edit',
    '#malformed\n': roomHash, '#bad-route': '/another/dashboard',
  }), { '#old-room': roomHash, '#old-lamp': deviceHash });
});

test('preserves direct aliases, pushes explicit opens once, and restores through Back/Forward without an origin', () => {
  const { view, observations, navigation } = fixture('/dashboard/home?kiosk=1#legacy-light');
  navigation.start();
  assert.deepEqual(observations[0], { route: device, hash: '#legacy-light', inScope: true, reason: 'initial', source: undefined });
  assert.equal(view.location.hash, '#legacy-light');
  const source = {};
  assert.equal(navigation.open(room, { source }), true);
  assert.equal(navigation.open(room, { source }), false);
  assert.equal(view.location.search, '?kiosk=1');
  assert.deepEqual(observations[1], { route: room, hash: roomHash, inScope: true, reason: 'open', source });
  assert.equal(navigation.open({ kind: 'room', room: 'hidden' }), false);
  view.move(-1);
  view.move(1);
  assert.deepEqual(observations.slice(2).map(change => [change.route, change.reason, change.source]),
    [[device, 'location', undefined], [room, 'location', undefined]]);
});

test('close replaces only a recognized hash, keeps Home Assistant state, and never rewrites other views', () => {
  const { view, observations, navigation } = fixture('/dashboard/home?compact=1#legacy-weather');
  navigation.start();
  assert.equal(navigation.close(), true);
  assert.equal(view.location.href, 'http://fixture.invalid/dashboard/home?compact=1');
  assert.deepEqual(view.history.state, { root: true });
  assert.equal(view.entries.length, 1);
  assert.equal(observations.at(-1).reason, 'close');
  view.history.pushState(null, '', '/dashboard/home?compact=1#foreign-widget');
  view.dispatchEvent(new Event('location-changed'));
  assert.equal(navigation.close(), false);
  assert.equal(view.location.hash, '#foreign-widget');
  assert.equal(navigation.open(panel, { replace: true }), true);
  assert.equal(view.entries.length, 2);
  assert.equal(navigation.close('#legacy-weather'), false);
  assert.equal(view.location.hash, panelHash);
  view.history.pushState(null, '', '/other/view' + roomHash);
  view.dispatchEvent(new Event('location-changed'));
  assert.equal(observations.at(-1).inScope, false);
  assert.equal(navigation.open(room), false);
  assert.equal(navigation.close(), false);
  assert.equal(view.location.hash, roomHash);
});

test('keeps a linked Bayit parent across native More Info history and removes it for unrelated navigation', () => {
  for (const mode of ['legacy', 'modern', 'unrelated']) {
    const { view, navigation, observations } = fixture('/dashboard/home?compact=1');
    navigation.start();
    navigation.open(room);
    navigation.open(device, { fromRoom: room.room });
    const parent = view.location.href;
    view.history.replaceState({ ...view.history.state, opensDialog: true }, '', parent);
    const child = new URL(parent);
    if (mode !== 'legacy') child.searchParams.set('more-info-entity-id', device.entity);
    if (mode === 'unrelated') child.searchParams.set('unrelated', '1');
    view.history.pushState({ dialog: 'ha-more-info-dialog' }, '', child.href);
    view.dispatchEvent(new Event('location-changed'));
    navigation.refresh();
    view.history.back();
    assert.equal(view.location.href, parent);
    assert.equal(navigation.backToRoom(room.room, { source: {}, fallback: () => assert.fail() }), mode !== 'unrelated');
    if (mode !== 'unrelated') assert.equal(observations.at(-1).reason, 'room-return');
  }
});

test('takes late configuration into account and stops listening on teardown', () => {
  const { view, admitted, observations, navigation } = fixture('/dashboard/home' + deviceHash);
  admitted.delete(deviceHash);
  navigation.start();
  assert.equal(observations[0].route, null);
  admitted.add(deviceHash);
  navigation.refresh();
  navigation.refresh();
  assert.equal(observations.length, 2);
  assert.deepEqual(observations[1].route, device);
  navigation.stop();
  view.history.pushState(null, '', '/dashboard/home' + panelHash);
  view.dispatchEvent(new Event('hashchange'));
  assert.equal(observations.length, 2);
  navigation.start();
  assert.deepEqual(observations[2].route, panel);
});

test('returns once to the exact preceding room entry and retains the original browser history', () => {
  const { view, observations, navigation } = fixture('/dashboard/home?kiosk=1');
  navigation.start();
  navigation.open(room);
  navigation.open(device, { fromRoom: room.room });
  assert.equal(navigation.backToRoom(room.room, { source: device.entity, fallback: assert.fail }), true);
  assert.equal(view.location.hash, roomHash);
  assert.equal(observations.at(-1).reason, 'room-return');
  assert.equal(observations.at(-1).source, device.entity);
  assert.equal(navigation.backToRoom(room.room, { fallback: assert.fail }), false);
  view.move(-1);
  assert.equal(view.location.hash, '');
  view.move(2);
  assert.equal(view.location.hash, deviceHash);
  assert.equal(navigation.backToRoom(room.room, { fallback: assert.fail }), false);
});

test('skips unlinked entries and fallbacks immediately if the browser refuses to traverse', () => {
  const { view, navigation } = fixture('/dashboard/home' + deviceHash);
  navigation.start();
  assert.equal(navigation.backToRoom(room.room, { fallback: assert.fail }), false);
  navigation.open(room);
  navigation.open(device, { fromRoom: room.room });
  view.history.replaceState(null, '', view.location.href);
  assert.equal(navigation.backToRoom(room.room, { fallback: assert.fail }), false);
  navigation.open(room);
  navigation.open(device, { fromRoom: room.room });
  view.history.back = () => { throw new Error('History is unavailable'); };
  assert.equal(navigation.backToRoom(room.room, { fallback: assert.fail }), false);
});

test('uses the replacement fallback at most once if the linked entry does not move', () => {
  const { view, navigation } = fixture('/dashboard/home' + roomHash);
  navigation.start();
  navigation.open(device, { fromRoom: room.room });
  let timeout;
  view.setTimeout = callback => { timeout = callback; return 1; };
  view.clearTimeout = () => {};
  view.history.back = () => {};
  let fallbacks = 0;
  const options = { fallback: () => {
    fallbacks++;
    navigation.open(room, { replace: true });
  } };
  assert.equal(navigation.backToRoom(room.room, options), true);
  assert.equal(navigation.backToRoom(room.room, options), true);
  assert.equal(fallbacks, 0);
  timeout();
  assert.equal(fallbacks, 1);
  assert.equal(view.location.hash, roomHash);
  assert.equal(navigation.backToRoom(room.room, options), false);
});
