import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;font:16px system-ui;color:#152334}.app{width:100%;min-height:100vh}#editor{width:min(460px,100%);margin:auto}</style>
<main id="surface" class="app"></main><div id="editor"></div>
<script type="module">
import '/bayit-9.js';
const states = {
  'light.demo_lamp': { state: 'off', attributes: { friendly_name: 'Desk lamp', supported_color_modes: ['onoff'] } },
  'switch.demo_heater': { state: 'off', attributes: { friendly_name: 'Room heater' } },
  'script.demo_start': { state: 'off', attributes: { friendly_name: 'Demo start' } },
  'number.demo_level': { state: '3', attributes: { friendly_name: 'Demo heater level', min: 1, max: 9, step: 1 } },
  'timer.demo_heater': { state: 'idle', attributes: { friendly_name: 'Demo timer' } },
};
const calls = [];
let rejectInlineLight = false;
const moreInfoCalls = [];
const moreInfoHashes = [];
document.addEventListener('hass-more-info', event => {
  moreInfoCalls.push(event.detail.entityId);
  moreInfoHashes.push(location.hash);
});
const coverRequests = [];
let finishLevel;
let rejectLevel = false;
let finishPreselect;
let finishClimatePreset;
let finishUsageReset;
let finishRoomOff;
let scriptSerial = 0;
function observeScript(state) {
  const id = 'script.demo_toggle';
  const previous = states[id];
  const stamp = new Date(Date.UTC(2026, 0, 1, 0, 0, ++scriptSerial)).toISOString();
  states[id] = { ...previous, state, last_changed: state === previous.state ? previous.last_changed : stamp,
    attributes: { ...previous.attributes, last_triggered: state === 'on' ? stamp : previous.attributes.last_triggered } };
  card.hass = { ...hass, states: { ...states } };
}
const query = new URL(location.href).searchParams;
if (query.has('energy-borderless-theme')) {
  document.documentElement.style.setProperty('--ha-card-border-width', '0px');
  document.documentElement.style.setProperty('--ha-card-border-radius', '20px');
}
if (query.has('overview-climate-discovery')) {
  for (const [id, name, state] of [
    ['fixture_lounge', 'Alpha thermostat', 'cool'],
    ['fixture_room_upstairs', 'Zulu thermostat', 'heat'],
    ['fixture_room_excluded', 'Excluded thermostat', 'cool'],
    ['other_fixture_room', 'Unrelated thermostat', 'cool'],
  ]) {
    states['climate.' + id] = { state, attributes: { friendly_name: name, hvac_action: 'idle',
      temperature: 24, current_temperature: 22, hvac_modes: ['off', 'cool', 'heat'] } };
  }
}
if (query.has('automation-compact')) states['script.demo_start'].last_changed = '2026-01-01T00:00:00.000Z';
if (query.has('lock-status-palette')) states['lock.fixture_entry'] = {
  state: 'locked', attributes: { friendly_name: 'Fixture lock' },
};
if (query.has('popup-scroll-memory')) Object.assign(states, {
  'switch.fixture_scroll_boiler': { state:'off', attributes:{friendly_name:'Fixture boiler'} },
  'timer.fixture_scroll_boiler': { state:'idle', attributes:{} },
});
const linkedPanels = query.has('linked-only-panels');
const compactOverview = query.has('compact-overview-status');
if (query.has('native-more-info')) document.addEventListener('hass-more-info', event => {
  const tag = 'ha-more-info-dialog';
  const previous = new URL(location.href);
  const launcher = document.querySelector('bayit-dashboard').shadowRoot.activeElement;
  const host = document.createElement(tag);
  const shadow = host.attachShadow({ mode: 'open' });
  const modal = document.createElement('dialog');
  modal.setAttribute('aria-label', 'Native entity details');
  const close = document.createElement('button');
  close.textContent = 'Close native details';
  close.onclick = () => modal.close();
  modal.append(close);
  shadow.append(modal);
  document.body.append(host);
  history.replaceState({ ...history.state, opensDialog: true }, '', previous.href);
  history.pushState({ dialog: tag }, '', previous.href);
  if (query.get('native-more-info') === 'modern') {
    const child = new URL(previous.href);
    child.searchParams.set('more-info-entity-id', event.detail.entityId);
    child.searchParams.set('more-info-view', 'info');
    history.replaceState(history.state, '', child.href);
    window.dispatchEvent(new CustomEvent('location-changed'));
  }
  modal.addEventListener('close', () => {
    const ownedEntry = history.state?.dialog === tag && location.pathname === previous.pathname && location.hash === previous.hash;
    if (ownedEntry) history.replaceState(history.state, '', previous.href);
    if (query.has('native-focus-anchor')) {
      const underlay = document.querySelector('bayit-dashboard').shadowRoot.querySelector('.modal[open]');
      if (underlay) {
        underlay.tabIndex = -1;
        underlay.focus();
      }
    }
    host.dispatchEvent(new CustomEvent('dialog-closed', { detail: { dialog: tag }, composed: true, bubbles: true }));
    if (ownedEntry) history.back();
    if (launcher?.[Symbol.for('HA focus target')]) requestAnimationFrame(() => setTimeout(() => launcher.focus(), 0));
    host.remove();
  }, { once: true });
  modal.showModal();
  if (!query.has('native-focus-anchor')) {
    modal.dispatchEvent(new CustomEvent('opened', { composed: true, bubbles: true }));
  }
});
if (query.has('entrance-popup-position')) {
  states['sensor.demo_entry_temperature'] = { state: '24', attributes: { friendly_name: 'טמפרטורה', unit_of_measurement: '°C' } };
  states['lock.demo_entry_position'] = { state: 'locked', attributes: { friendly_name: 'מנעול' } };
}
if (query.has('shortcut-detail-routes')) {
  states['lock.demo_route_lock'] = { state: 'locked', attributes: { friendly_name: 'Demo lock' } };
  states['cover.demo_route_shade'] = { state: 'closed', attributes: {
    friendly_name: 'Demo shade', supported_features: 15, current_position: 0,
  } };
}
const storedKey = 'bayit9-browser-fixture';
const initialStrategy = { type: 'custom:bayit-9', ...(query.has('room-selection') && { show_unassigned: false }),
  ...(query.has('compact-settings') && { fullscreen: true, toolbar: [
    { id:'appearance', kind:'settings' },
    ...[['overview','סקירה'], ['sensors','חיישנים'], ['calendar','יומן'], ['devices','כניסה'],
      ['media','מדיה'], ['vacuum','שואב']].map(([kind, label]) => ({id:kind,kind,label,placement:'settings'})),
  ] }),
  ...(query.has('legacy-room-order') && { area_ids: ['lounge', 'studio'] }),
  ...(query.has('cross-area-room-device') && { room_overrides: { lounge: { entities: ['light.demo_lamp'] } } }),
  ...(query.has('popup-scroll-memory') && {
    preference_key:'shared-appearance-for-scroll-test', area_ids:['studio','bayit_room_den'],
    room_overrides:{
      studio:{entities:['light.demo_lamp','switch.fixture_scroll_boiler']},
      bayit_room_den:{name:'Den',entities:['light.demo_lamp']},
    },
    profiles:[{entity:'switch.fixture_scroll_boiler',kind:'boiler',timed:{timer_entity:'timer.fixture_scroll_boiler'}}],
    popup_aliases:{'#boiler-timer':'#device/studio/switch.fixture_scroll_boiler'},
  }),
  ...(query.has('lock-status-palette') && {
    room_overrides: { studio: { entities: ['lock.fixture_entry'] } },
    room_shortcuts: { studio: ['lock.fixture_entry'] },
    toolbar: [
      { kind: 'automations', label: 'Fixture actions', sections: [
        { kind: 'actions', title: 'Quick scenes',
          ...(query.has('automation-compact') && { layout: 'compact-actions' }),
          entities: [{ entity: 'lock.fixture_entry', role: 'lock', confirmation: true },
            ...(query.has('automation-compact') ? [{ entity:'script.demo_start', role:'action', command:'toggle_script' }] : [])] },
      ] },
      { kind: 'security', label: 'Fixture security', sections: [
        { kind: 'locks', entities: [{ entity: 'lock.fixture_entry', role: 'lock', confirmation: true }] },
      ] },
      { kind: 'overview', label: 'Fixture overview', sections: [
        { kind: 'status', layout: 'compact', entities: [{ entity: 'lock.fixture_entry', role: 'lock' }] },
      ] },
      { kind: 'devices', label: 'Fixture entrance', placement: 'settings', sections: [
        { kind: 'status', layout: 'compact', entities: [{ entity: 'lock.fixture_entry', role: 'status' }] },
      ] },
      { kind: 'settings' },
    ],
  }),
  ...(query.has('overview-climate-discovery') && {
    profiles: [{ entity: 'climate.fixture_lounge', kind: 'climate', name: 'Lounge HVAC' }],
    toolbar: [
      { id: 'overview', kind: 'overview', sections: [{
        id: 'climate', kind: 'status', title: 'Air conditioning',
        entities: [{ entity: 'climate.fixture_lounge', role: 'action', icon: 'mdi:air-conditioner' }],
      }] },
      { id: 'appearance', kind: 'settings' },
    ],
  }),
  ...(query.has('sole-room') && { area_ids: ['bayit_room_only'],
    room_overrides: { bayit_room_only: { name: 'Reading nook', entities: [] } } }),
  ...(query.has('swing-unreported') && {
    profiles: [{ entity: 'climate.demo_air', kind: 'climate', unreported_swing_mode: 'default', timed: {
      simple_timer_entity: 'sensor.demo_air_usage', simple_timer_target: 'input_boolean.demo_air_timer',
      min_minutes: 15, max_minutes: 120, step_minutes: 15,
    } }],
  }),
  ...(query.has('room-control-names') && {
    show_unassigned: false, area_ids: ['studio', 'bayit_room_den'],
    profiles: [{ entity: 'climate.demo_air', kind: 'climate', name: 'Dedicated thermostat' }],
    room_overrides: {
      studio: { entities: ['light.demo_lamp', 'climate.demo_air'],
        entity_names: { 'light.demo_lamp': 'Workshop light', 'climate.demo_air': '' } },
      bayit_room_den: { name: 'Den', entities: ['light.demo_lamp'] },
    },
  }),
  ...(query.has('inline-room-lights') && {
    ...(query.has('dual-light-details') && {background:'desert_sunset'}),
    show_unassigned: false, area_ids: ['studio', 'bayit_room_den'],
    room_overrides: {
      studio: { entities: ['light.demo_lamp', 'light.demo_room_read_only'],
        inline_light_entities: ['light.demo_lamp', 'light.demo_room_read_only', 'switch.demo_heater'],
        ...(query.has('dual-light-details') && {dual_light_detail_entities:['light.demo_lamp']}),
        ...(query.has('compact-light-reading') && {compact_light_reading_entities:['light.demo_lamp']}),
        read_only_entities: ['light.demo_room_read_only'] },
      bayit_room_den: { name: 'Den', entities: ['light.demo_lamp'] },
    },
  }),
  ...(query.has('shortcut-detail-routes') && {
    show_unassigned: false, area_ids: ['studio', 'bayit_room_den'],
    room_shortcuts: { studio: ['lock.demo_route_lock', 'cover.demo_route_shade', 'switch.demo_heater'] },
    room_overrides: {
      studio: { entities: ['lock.demo_route_lock', 'cover.demo_route_shade', 'switch.demo_heater'],
        shortcut_no_details: ['switch.demo_heater'],
        shortcut_detail_entities: { 'lock.demo_route_lock': 'switch.demo_heater' },
        shortcut_detail_routes: {
          'lock.demo_route_lock': 'panel:shared-security', 'cover.demo_route_shade': 'native',
          'switch.demo_heater': 'panel:shared-security',
        } },
      bayit_room_den: { name: 'Den', entities: ['cover.demo_route_shade'] },
    },
    toolbar: [
      { id: 'home-settings', kind: 'settings' },
      { id: 'shared-security', kind: 'security', label: 'Room Security', sections: [
        { kind: 'locks', entities: ['lock.demo_route_lock'] },
      ] },
      { id: 'status-extra', kind: 'devices', label: 'Extras', placement: 'settings' },
      { id: 'elsewhere', kind: 'link', path: '/other/home', label: 'Elsewhere' },
    ],
  }),
  ...(query.has('shortcut-no-details') && {
    show_unassigned: false, area_ids: ['studio', 'bayit_room_den'],
    room_shortcuts: { studio: ['switch.demo_heater'] },
    room_overrides: {
      studio: { entities: ['switch.demo_heater'], panel_hidden_entities: ['switch.demo_heater'],
        shortcut_no_details: ['switch.demo_heater'] },
      bayit_room_den: { name: 'Den', entities: ['switch.demo_heater'] },
    },
  }),
  ...(query.has('shortcut-detail-target') && {
    show_unassigned: false, area_ids: ['studio', 'bayit_room_den'],
    room_shortcuts: { studio: ['light.demo_lamp'], bayit_room_den: ['light.demo_lamp'] },
    room_overrides: {
      studio: { entities: ['light.demo_lamp', 'light.demo_dimmer', 'switch.demo_heater'],
        inline_light_entities: ['light.demo_dimmer'],
        shortcut_detail_entities: { 'light.demo_lamp': 'light.demo_dimmer' } },
      bayit_room_den: { name: 'Den', entities: ['light.demo_lamp', 'light.demo_other_room'] },
    },
    popup_aliases: { '#fixture-linked-dimmer': '#device/studio/light.demo_dimmer' },
  }),
  ...(query.has('room-panel-visibility') && {
    show_unassigned: false, area_ids: ['studio', 'bayit_room_den'],
    room_shortcuts: { studio: ['light.demo_lamp'] },
    room_overrides: {
      studio: { entities: ['light.demo_lamp', 'switch.demo_heater'],
        panel_hidden_entities: ['light.demo_lamp', 'switch.demo_heater'],
        sections: [{ kind: 'lights', title: 'Table lamps', entities: ['light.demo_lamp'] }] },
      bayit_room_den: { name: 'Den', entities: ['light.demo_lamp'] },
    },
  }),
};
const sharedName = query.get('shared-appearance');
const sharedURL = sharedName && '/fixture-shared-dashboard/' + encodeURIComponent(sharedName);
const readShared = () => fetch(sharedURL).then(response => response.json());
const sharedConfig = sharedURL ? await readShared() : undefined;
const stored = () => sharedConfig ?? JSON.parse(sessionStorage.getItem(storedKey) ||
  JSON.stringify({ strategy: initialStrategy }));
if (query.has('inline-room-lights')) {
  const attributes = { supported_color_modes: ['color_temp'], brightness: 102,
    min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500, color_temp_kelvin: 3000 };
  Object.assign(states['light.demo_lamp'].attributes, attributes);
  states['light.demo_lamp'].state = 'on';
  if (query.has('compact-light-reading')) {
    states['light.demo_lamp'].state = 'off';
    Object.assign(states['light.demo_lamp'].attributes, {brightness:null,color_temp_kelvin:null});
  }
  states['light.demo_room_read_only'] = { state: 'on', attributes: { ...attributes, friendly_name: 'Read-only lamp' } };
}
if (query.has('shortcut-detail-target')) {
  states['light.demo_dimmer'] = { state: 'on', attributes: { friendly_name: 'Desk dimmer',
    supported_color_modes: ['color_temp'], brightness: 125,
    min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500, color_temp_kelvin: 3000 } };
  states['light.demo_other_room'] = { state: 'off', attributes: { friendly_name: 'Den light', supported_color_modes: ['onoff'] } };
}
let rejectSetupSave = false;
let rejectQuickBoiler = false;
let holdSetupSave = false;
let finishSetupSave;
const hass = {
  user: { is_admin: query.has('configuration') && !query.has('member') },
  ...(query.has('with-energy-dashboard') && {panels:{energy:{}}}),
  locale: { language: new URL(location.href).searchParams.get('locale') || 'en' },
  ...(query.has('sun-horizon') && { config: { time_zone:'Asia/Tokyo' } }),
  states,
  entities: { 'light.demo_lamp': { area_id: 'studio' }, 'switch.demo_heater': { area_id: 'studio' } },
  areas: { studio: { area_id: 'studio', name: 'Studio', icon: 'mdi:desk' } },
  devices: {},
  callWS(request) {
    calls.push(request);
    if (request.type === 'history/history_during_period' && query.has('room-temperature-chart')) {
      const end = Date.parse(request.end_time) / 1000;
      return Promise.resolve({ 'sensor.demo_temperature': [
        { s:'21', lu:end - 85000 }, { s:'22', lu:end - 78000 }, { s:'unknown', lu:end - 72000 },
        { s:'22.5', lu:end - 71000 }, { s:'23.5', lu:end - 20800 },
      ] });
    }
    if (request.type === 'lovelace/dashboards/list') {
      return Promise.resolve([{ url_path: 'fixture-home', mode: 'storage' }]);
    }
    if (request.type === 'lovelace/config') return sharedURL ? readShared() : Promise.resolve(stored());
    if (request.type === 'lovelace/config/save') {
      if (rejectSetupSave) {
        rejectSetupSave = false;
        return Promise.reject(new Error('Fixture rejected dashboard save'));
      }
      if (sharedURL) return fetch(sharedURL, { method: 'POST', body: JSON.stringify(request.config) }).then(response => {
        if (!response.ok) throw new Error('Could not save shared fixture');
      });
      const persist = () => {
        sessionStorage.setItem(storedKey, JSON.stringify(request.config));
        sessionStorage.setItem(storedKey + '-hash-at-save', location.hash);
      };
      if (holdSetupSave) {
        holdSetupSave = false;
        return new Promise(resolve => { finishSetupSave = () => { persist(); resolve(); }; });
      }
      persist();
      return Promise.resolve();
    }
    if (request.domain === 'homeassistant' && request.service === 'turn_off' &&
        (query.has('room-shutdown') || query.has('overview-lights-off') || query.has('overview-lights-off-selected'))) {
      return new Promise((resolve, reject) => {
        finishRoomOff = failed => {
          if (failed) return reject(new Error('Fixture rejected room shutdown'));
          for (const entity of request.target.entity_id) states[entity] = { ...states[entity], state: 'off' };
          card.hass = { ...hass, states: { ...states } };
          resolve({});
        };
      });
    }
    if (query.has('shortcut-no-details') && request.domain === 'switch' && request.target?.entity_id === 'switch.demo_heater') {
      states['switch.demo_heater'] = { ...states['switch.demo_heater'], state: request.service === 'turn_on' ? 'on' : 'off' };
      card.hass = { ...hass, states: { ...states } };
    }
    if (rejectQuickBoiler && (request.target?.entity_id === 'switch.demo_quick_boiler' ||
        request.service_data?.entity_id === 'sensor.demo_boiler_runtime')) {
      rejectQuickBoiler = false;
      return Promise.reject(new Error('Fixture rejected boiler action'));
    }
    if (request.domain === 'light') {
      if (rejectInlineLight) {
        rejectInlineLight = false;
        return Promise.reject(new Error('Fixture rejected inline light command'));
      }
      const id = request.target.entity_id;
      const { brightness_pct, color_temp_kelvin, effect, rgb_color } = request.service_data ?? {};
      const attributes = { ...states[id].attributes };
      if (brightness_pct !== undefined) attributes.brightness = Math.round(brightness_pct * 255 / 100);
      if (color_temp_kelvin !== undefined) attributes.color_temp_kelvin = color_temp_kelvin;
      if (rgb_color) Object.assign(attributes, { rgb_color: [255, 135, 75], xy_color: [0.574, 0.359], color_mode: 'xy' });
      if (effect !== undefined) attributes.effect = effect;
      states[id] = { ...states[id], attributes, state: request.service === 'turn_off' ? 'off' : 'on' };
      card.hass = { ...hass, states: { ...states } };
    }
    if (request.domain === 'cover' && query.has('cover-feedback')) {
      return new Promise((resolve, reject) => {
        coverRequests.push(failed => failed ? reject(new Error('Fixture rejection')) : resolve({}));
      });
    }
    if (request.domain === 'cover' && query.has('security-cover-rail')) {
      const id = request.target.entity_id;
      const value = { open_cover: ['open', 100], stop_cover: ['stopped', 50], close_cover: ['closed', 0] }[request.service];
      if (value) {
        states[id] = { ...states[id], state: value[0], attributes: { ...states[id].attributes, current_position: value[1] } };
        card.hass = { ...hass, states: { ...states } };
      }
    }
    if (request.domain === 'lock' && query.has('compact-entrance-status')) {
      const id = request.target.entity_id;
      states[id] = { ...states[id], state: request.service === 'lock' ? 'locked' : 'unlocked' };
      card.hass = { ...hass, states: { ...states } };
    }
    if (request.domain === 'script' && request.target?.entity_id === 'script.demo_toggle') {
      observeScript(request.service === 'turn_on' ? 'on' : 'off');
    }
    if (request.domain === 'script' && request.service === 'demo_select_heat_step') {
      if (rejectLevel) {
        rejectLevel = false;
        return Promise.reject(new Error('Fixture rejected heater level'));
      }
      states['script.demo_select_heat_step'] = { state: 'on', attributes: {} };
      card.hass = { ...hass, states: { ...states } };
      return new Promise(resolve => {
        finishLevel = () => {
          states['input_number.demo_heat_step'].state = String(request.service_data.target_step);
          states['script.demo_select_heat_step'] = { state: 'off', attributes: {} };
          card.hass = { ...hass, states: { ...states } };
          resolve({});
        };
      });
    }
    if (request.domain === 'input_number' && request.target?.entity_id === nextLevel) {
      return new Promise(resolve => {
        finishPreselect = () => {
          states[nextLevel].state = String(request.service_data.value);
          card.hass = { ...hass, states: { ...states } };
          resolve({});
        };
      });
    }
    if (request.domain === 'climate' && request.service === 'set_preset_mode' && query.has('preset-shortcut')) {
      return new Promise(resolve => {
        finishClimatePreset = () => {
          const id = request.target.entity_id;
          states[id].attributes = { ...states[id].attributes, preset_mode: request.service_data.preset_mode };
          card.hass = { ...hass, states: { ...states } };
          resolve({});
        };
      });
    }
    if (request.domain === 'simple_timer' && request.service === 'reset_daily_usage' && query.has('timer-usage')) {
      return new Promise(resolve => {
        finishUsageReset = () => {
          const id = 'sensor.demo_air_usage';
          states[id] = { ...states[id], state: '0' };
          card.hass = { ...hass, states: { ...states } };
          resolve({});
        };
      });
    }
    if (request.domain === 'simple_timer' && request.service === 'start_timer') {
      const id = request.service_data.entity_id;
      const attrs = states[id].attributes;
      states[id] = { ...states[id], attributes: { ...attrs, timer_state: 'active', device_active: true,
        timer_finishes_at: new Date(Date.now() + request.service_data.duration * 60000).toISOString() } };
      if (query.has('embedded-heater') && id === heaterTimer) {
        states[heaterFan] = { ...states[heaterFan], state: 'on' };
        states[heaterRelay] = { ...states[heaterRelay], state: 'on' };
      } else {
        states['climate.demo_air'] = { ...states['climate.demo_air'], state: 'cool' };
      }
      card.hass = { ...hass, states: { ...states } };
    }
    if (request.domain === 'simple_timer' && request.service === 'cancel_timer' &&
        query.has('embedded-heater') && request.service_data.entity_id === heaterTimer) {
      const attrs = states[heaterTimer].attributes;
      states[heaterTimer] = { ...states[heaterTimer], attributes: { ...attrs, timer_state: 'idle', device_active: false } };
      states[heaterFan] = { ...states[heaterFan], state: 'off' };
      states[heaterRelay] = { ...states[heaterRelay], state: 'off' };
      card.hass = { ...hass, states: { ...states } };
    }
    if (request.domain === 'climate' && query.has('climate-labels')) {
      const attribute = { set_swing_mode: 'swing_mode', set_swing_horizontal_mode: 'swing_horizontal_mode',
        set_fan_mode: 'fan_mode' }[request.service];
      const id = request.target.entity_id;
      if (attribute) {
        states[id].attributes = { ...states[id].attributes, [attribute]: request.service_data[attribute] };
        card.hass = { ...hass, states: { ...states } };
      }
    }
    if (request.domain === 'media_player' && request.service === 'volume_mute' && query.has('media-remote')) {
      const device = states[request.target.entity_id];
      device.attributes.is_volume_muted = request.service_data.is_volume_muted;
      card.hass = { ...hass, states: { ...states } };
    }
    if (request.domain === 'media_player' && request.service === 'media_pause') {
      const id = request.target.entity_id;
      states[id] = { ...states[id], state: 'paused' };
      card.hass = { ...hass, states: { ...states } };
    }
    return Promise.resolve({});
  },
};
if (query.has('room-selection')) {
  hass.areas.spare = { area_id: 'spare', name: 'Spare room' };
  hass.areas.lounge = { area_id: 'lounge', name: 'Lounge' };
  hass.entities['light.demo_lounge'] = { area_id: 'lounge' };
  states['light.demo_lounge'] = { state: 'off', attributes: { friendly_name: 'Lounge lamp', supported_color_modes: ['onoff'] } };
  if (query.has('empty-source-room')) delete states['switch.demo_heater'];
}
if (query.has('overview-opt-in')) {
  for (const [id, name, metadata] of [
    ['light.demo_dining', 'Dining task lamp', {}],
    ['light.demo_excluded', 'Excluded lamp', {}],
    ['light.demo_helper', 'Helper lamp', {}],
    ['light.demo_compact_hidden', 'Compact hidden lamp', { hidden: true }],
    ['light.demo_registry_hidden', 'Registry hidden lamp', { hidden_by: 'user' }],
    ['light.demo_disabled', 'Disabled lamp', { disabled_by: 'user' }],
    ['light.demo_dashboard_hidden', 'Dashboard hidden lamp', {}],
  ]) {
    states[id] = { state: 'on', attributes: { friendly_name: name, supported_color_modes: ['onoff'] } };
    hass.entities[id] = metadata;
  }
  states['cover.demo_overview_window'] = { state: 'closing', attributes: { friendly_name: 'Overview cover', supported_features: 15 } };
  hass.entities['cover.demo_overview_window'] = {};
  if (query.has('overview-lights-off-selected')) {
    for (const id of ['selected','read_only','protected','unrelated']) {
      states['light.demo_' + id] = { state:'on', attributes:{ friendly_name:id, supported_color_modes:['onoff'] } };
      hass.entities['light.demo_' + id] = {};
    }
    states['switch.demo_heater'].state = 'on';
  }
  if (query.has('overview-readings')) {
    Object.assign(states['light.demo_dining'].attributes, { supported_color_modes: ['brightness'], brightness: 128 });
    states['climate.demo_overview_air'] = { state: 'cool', attributes: {
      friendly_name: 'Overview AC', supported_features: 1, hvac_modes: ['cool', 'off'], temperature: 23.5, current_temperature: 22.5,
    } };
    hass.entities['climate.demo_overview_air'] = {};
    hass.config = { ...hass.config, unit_system: { temperature: '°F' } };
  }
}
if (query.has('room-grid')) {
  for (const [entity, name, colorMode] of [
    ['light.demo_wall', 'Wall lamp', 'onoff'], ['light.demo_pendant', 'Pendant lamp', 'color_temp'],
    ['light.demo_monitor', 'Monitor lamp', 'color_temp'],
  ]) {
    states[entity] = { state: 'on', attributes: { friendly_name: name, supported_color_modes: [colorMode] } };
    hass.entities[entity] = { area_id: 'studio' };
    if (colorMode === 'color_temp') Object.assign(states[entity].attributes, {
      supported_color_modes: ['color_temp', 'xy'], color_mode: 'color_temp',
      min_color_temp_kelvin: 2200, max_color_temp_kelvin: 7000, color_temp_kelvin: 3200,
      supported_features: 4, effect_list: ['Color loop', 'Slow pulse'], effect: 'off',
    });
  }
  if (query.has('many-effect-categories')) {
    states['light.demo_pendant'].attributes.effect_list.push('Sunburst', 'Midnight',
      ...Array.from({ length: 7 }, (_, i) => 'Preset ' + (i + 1)));
  }
}
if (query.has('cover-grid')) {
  for (const [id, name, device_class] of [
    ['cover.demo_shade', 'Window shade', 'blind'], ['cover.demo_curtain', 'Long living room curtain', 'curtain'],
  ]) {
    states[id] = { state: 'closed', attributes: { friendly_name: name, device_class, current_position: 0, supported_features: 15 } };
    hass.entities[id] = { area_id: 'studio' };
  }
}
if (query.has('device-panel')) {
  states['climate.demo_air'] = { state: 'off', attributes: {
    friendly_name: 'Studio air conditioner', supported_features: 425, hvac_modes: ['off','cool','heat'],
    fan_modes: ['low','auto'], swing_modes: ['off','vertical'], temperature: 23, current_temperature: 25,
    min_temp: 15, max_temp: 30, target_temp_step: 1, fan_mode: 'auto', swing_mode: 'off',
  } };
  states['sensor.demo_air_usage'] = { state: '600', attributes: {
    switch_entity_id: 'input_boolean.demo_air_timer', timer_state: 'idle', device_active: false,
  } };
  hass.entities['climate.demo_air'] = { area_id: 'studio' };
  const attributes = states['climate.demo_air'].attributes;
  if (query.has('timer-usage')) {
    states['sensor.demo_air_usage'].attributes.entry_id = 'fixture-timer-entry';
    hass.entities['sensor.demo_air_usage'] = { platform: query.has('fake-usage-provider') ? 'template' : 'simple_timer' };
    hass.services = { simple_timer: { reset_daily_usage: {} } };
    states['sensor.demo_read_only_usage'] = { state: '30', attributes: { unit_of_measurement: 'min' } };
  }
  if (query.has('preset-shortcut')) {
    Object.assign(attributes, { supported_features: attributes.supported_features | 16,
      preset_modes: ['none', 'eco', 'boost'], preset_mode: 'eco' });
    hass.services = { climate: query.has('missing-preset-service') ? {} : { set_preset_mode: {} } };
  }
  if (query.has('climate-power-test')) {
    hass.services.climate = { ...hass.services.climate, turn_off: {},
      ...(!query.has('missing-climate-on-service') && {turn_on:{}}) };
  }
  if (query.has('compact-climate-summary')) {
    hass.config = { unit_system: { temperature: '°C' } };
    Object.assign(attributes, { current_temperature: 22.5, temperature: 23.5 });
  }
  if (query.get('climate-labels') === 'positioned') Object.assign(attributes, {
    fan_modes: ['auto', 'low', 'medium low', 'medium', 'medium high', 'high'], fan_mode: 'medium low',
    swing_modes: ['default', 'full_swing', 'fixed_upper', 'fixed_upper_middle', 'fixed_middle', 'fixed_lower_middle',
      'fixed_lower', 'swing_upper', 'swing_upper_middle', 'swing_middle', 'swing_lower_middle', 'swing_lower'],
    swing_mode: 'default',
    supported_features: attributes.supported_features | 512,
    swing_horizontal_modes: ['default', 'full_swing', 'left', 'left_center', 'center', 'right_center', 'right'],
    swing_horizontal_mode: null,
  });
  if (query.has('swing-unreported')) {
    attributes.swing_mode = null;
    states['climate.demo_no_swing'] = { state: 'off', attributes: {
      ...attributes, friendly_name: 'No swing thermostat', supported_features: attributes.supported_features & ~32,
    } };
  }
  if (query.get('climate-labels') === 'lounge') Object.assign(attributes, {
    supported_features: attributes.supported_features & ~32, swing_horizontal_modes: ['left', 'right'],
    fan_modes: ['auto', 'sleep', 'quiet', 'low', 'health', 'medium', 'natural', 'strong', 'high'], fan_mode: 'quiet',
  });
  if (query.get('climate-labels') === 'generic') Object.assign(attributes, {
    supported_features: attributes.supported_features | 512,
    swing_modes: ['default', 'vertical', 'custom_span'], swing_mode: 'default',
  });
}
const roomStatusSelected = {
  area_ids: ['bayit_room_status', ...Array.from({ length: 9 }, (_, index) => 'bayit_room_fixture_' + index)],
  room_overrides: {
    bayit_room_status: {
      name: query.has('classic-quiet') ? (hass.locale.language === 'he' ? 'חדר\\nהפנאי' : 'Family\\nroom')
        : hass.locale.language === 'he' ? 'חדר הפנאי' : 'Family room',
      ...(query.has('classic-quiet') && { turn_off_entities:['light.demo_side1'] }),
      entities: ['climate.demo_room', 'cover.demo_window', 'sensor.demo_temperature', 'light.demo_unavailable',
        'light.demo_side1', 'light.demo_side2', 'light.demo_side3',
        ...(query.has('temperature-source') ? ['sensor.demo_preferred_temperature'] : [])],
      ...(query.has('room-temperature-chart') && { room_temperature_graph_colors:{ 'sensor.demo_temperature':'#9ac8ff' } }),
      ...(query.has('temperature-source') && {
        room_temperature_entity: query.has('temperature-from-climate') ? 'climate.demo_room' : 'sensor.demo_preferred_temperature',
        ...(!query.has('temperature-no-fallback') && {room_temperature_fallback_entity: 'climate.demo_room'}),
      }),
    },
    ...Object.fromEntries(Array.from({ length: 9 }, (_, index) =>
      ['bayit_room_fixture_' + index, { name: 'Room ' + index, entities: [] }])),
  },
  profiles: [{ entity: 'climate.demo_room', kind: 'climate', timed: { timer_entity: 'timer.demo_room' } }],
};
if (query.has('room-status')) {
  hass.config = { unit_system: { temperature: '°C' } };
  Object.assign(states, {
    'climate.demo_room': { state: 'cool', attributes: { friendly_name: 'Cooling', temperature: 26, current_temperature: 19 } },
    'cover.demo_window': {
      state: query.has('cover-feedback') ? 'closed' : 'opening',
      attributes: { friendly_name: 'Window shade', current_position: query.has('cover-feedback') ? 0 : 57, supported_features: 15 },
    },
    'sensor.demo_temperature': { state: '23.5', attributes: { device_class: 'temperature', unit_of_measurement: '°C' } },
    'sensor.demo_unmapped': { state: '99', attributes: { device_class: 'temperature', unit_of_measurement: '°C' } },
    ...(query.has('temperature-source') && {
      'sensor.demo_preferred_temperature': {state:'69.7',attributes:{friendly_name:'Wall thermometer',unit_of_measurement:'°F'}},
    }),
    'light.demo_unavailable': { state: 'unavailable', attributes: { friendly_name: 'Desk light' } },
    'timer.demo_room': { state: 'active', attributes: { finishes_at: new Date(Date.now() + 3660000).toISOString() } },
  });
  for (const number of [1, 2, 3]) {
    states['light.demo_side' + number] = { state: 'off', attributes: { supported_color_modes: ['onoff'] } };
  }
}
const heaterFan = 'fan.demo_step_heater';
const helper = 'input_number.demo_heat_step';
const heaterTimer = 'sensor.demo_step_runtime';
const heaterRelay = 'switch.demo_step_power';
const heaterScript = 'script.demo_select_heat_step';
const nextLevel = query.has('shared-heater-level') ? helper : 'input_number.demo_next_step';
if (query.has('heater-level')) {
  Object.assign(states, {
    [heaterFan]: { state: 'off', attributes: { friendly_name: 'Fixture step heater', supported_features: 49 } },
    [helper]: { state: '3', attributes: { min: 0, max: 9, step: 1 } },
    [nextLevel]: { state: '5', attributes: { min: 0, max: 9, step: 1 } },
    [heaterRelay]: { state: 'off', attributes: {} },
    [heaterTimer]: { state: '0', attributes: { switch_entity_id: heaterRelay, timer_state: 'idle' } },
    [heaterScript]: { state: 'off', attributes: {} },
  });
  hass.entities[heaterFan] = { area_id: 'studio' };
}
if (query.has('toolbar-panels')) {
  if (query.has('security-cover-rail')) Object.assign(states, {
    'cover.demo_security_first': { state: 'closed', attributes: { friendly_name: 'West shade', supported_features: 15, current_position: 0 } },
    'cover.demo_security_second': { state: 'opening', attributes: { friendly_name: 'East curtain', supported_features: 15,
      current_position: 43, device_class: 'curtain' } },
    'cover.demo_security_passive': { state: 'open', attributes: { friendly_name: 'Status shade', supported_features: 15, current_position: 100 } },
  });
  if (query.has('entrance-light-tiles')) Object.assign(states, {
    'light.demo_entry_second': { state: 'off', attributes: { friendly_name: 'Porch light' } },
    'light.demo_entry_guarded': { state: 'on', attributes: { friendly_name: 'Guarded light' } },
    'light.demo_entry_unavailable': { state: 'unavailable', attributes: { friendly_name: 'Offline light' } },
    'light.demo_entry_generic': { state: 'off', attributes: { friendly_name: 'Generic light' } },
  });
  if (query.has('compact-entrance-status')) Object.assign(states, {
    'lock.demo_compact_entry': { state: 'locked', attributes: { friendly_name: 'Front lock',
      ...(query.has('protected-entry-lock') && { code_format: '^[0-9]+$' }) } },
    'lock.demo_compact_readonly': { state: 'locked', attributes: { friendly_name: 'Read-only lock' } },
  });
  Object.assign(states, {
    'script.demo_scene': {state:'off', attributes:{friendly_name:'Evening scene'}},
    'script.demo_toggle': {state:'off', last_changed:'2026-01-01T00:00:00.000Z',
      attributes:{friendly_name:'Arrival scene',last_triggered:null}},
    'lock.demo_entry': {state:'locked', attributes:{friendly_name:'Front door',code_format:'^[0-9]+$'}},
    'weather.demo_home': {state:'sunny', attributes:{friendly_name:'Home forecast',supported_features:1,temperature:23}},
    'sun.sun': {state:'above_horizon', attributes:{friendly_name:'Sun', next_rising:'2026-11-25T04:00:00Z',
      next_noon:'2026-11-25T04:25:00Z',elevation:15,azimuth:270}},
    'person.demo_friend': {state:'home',attributes:{friendly_name:'Simona'}},
    'sensor.demo_meter': {state:'51',attributes:{friendly_name:'Energy meter',unit_of_measurement:'kWh'}},
    'sensor.demo_water_meter': {state:'4',attributes:{friendly_name:'Water meter',unit_of_measurement:'m³'}},
    ...(query.has('energy-readings') && {
      'sensor.demo_bill_forecast': {state:'145',attributes:{friendly_name:'Forecast reading',unit_of_measurement:'USD'}},
      'sensor.demo_last_water': {state:'48',attributes:{friendly_name:'Yesterday water',unit_of_measurement:'L'}},
      'binary_sensor.demo_water_alarm': {state:'off',attributes:{friendly_name:'Meter warning'}},
    }),
    'sensor.demo_studio_temperature': {state:'22.5',attributes:{friendly_name:'Studio temperature',unit_of_measurement:'°C'}},
    ...(query.has('weather-readings') && {
      'sensor.demo_outdoor_temperature': {state:'24.5',attributes:{friendly_name:'Outdoor sensor',unit_of_measurement:'°C'}},
      'binary_sensor.demo_rain': {state:'off',attributes:{friendly_name:'Rain status'}},
    }),
    'sensor.demo_progress': {state:'40',attributes:{friendly_name:'Cleaning progress',unit_of_measurement:'%'}},
    'media_player.demo_speaker': {state:'playing',attributes:{friendly_name:'Speaker',supported_features:30781,volume_level:.24,
      is_volume_muted:false,source:'Radio',source_list:['Radio','Aux'],media_title:'Station',media_artist:'Fixture artist',
      media_position:12,media_duration:180,media_position_updated_at:new Date().toISOString(),
      entity_picture:'/api/media_player_proxy/media_player.demo_speaker?token=fixture'}},
    'media_player.demo_tv': {state:query.has('room-media-test') ? 'playing' : 'on',
      attributes:{friendly_name:'Television',supported_features:1416,is_volume_muted:false,
        ...(query.has('room-media-test') && {supported_features:23997,volume_level:.42,media_title:'Evening news',
          source_list:['HDMI','Live TV'],source:'Live TV'}),
      }},
    ...(query.has('room-compact-pair-test') && {
      'lock.demo_room_compact': {state:'unlocked',attributes:{friendly_name:'Room lock'}},
    }),
    ...(query.has('appliance-tile-test') && {
      'switch.demo_oven': {state:'off',attributes:{friendly_name:'Oven'}},
      'switch.demo_cooktop': {state:'off',attributes:{friendly_name:'Cooktop'}},
      'switch.demo_appliance_boiler': {state:'off',attributes:{friendly_name:'Fixture boiler'}},
      'timer.demo_appliance_boiler': {state:'idle',attributes:{}},
    }),
    'vacuum.demo_robot': {state:'idle',attributes:{friendly_name:'Robot',
      supported_features:query.has('vacuum-room-display-test') ? 8244 | 8 | 512 : 8244,fan_speed_list:['silent','normal']}},
    'button.demo_filter': {state:'unknown',attributes:{friendly_name:'Reset filter'}},
    ...(query.has('vacuum-room-summary') && {
      'sensor.demo_robot_status': {state:'segment_cleaning',attributes:{friendly_name:'Robot state'}},
      'sensor.demo_robot_battery': {state:'43',attributes:{friendly_name:'Robot battery',unit_of_measurement:'%'}},
      'sensor.demo_robot_progress': {state:'28',attributes:{friendly_name:'Robot progress',unit_of_measurement:'%'}},
      'binary_sensor.demo_robot_cleaning': {state:'off',attributes:{friendly_name:'Robot running'}},
    }),
    'calendar.demo_household': {state:'off',attributes:{friendly_name:'Household'}},
    'calendar.demo_birthdays': {state:'off',attributes:{friendly_name:'Birthdays'}},
  });
  if (query.has('boiler-quick-test')) {
    hass.services = { switch:{turn_on:{},turn_off:{}}, simple_timer:{cancel_timer:{}} };
    hass.entities['sensor.demo_boiler_runtime'] = { platform:'simple_timer' };
    states['switch.demo_quick_boiler'] = {state:'off',attributes:{friendly_name:'Quick boiler'}};
    states['sensor.demo_boiler_runtime'] = {state:'0',attributes:{
      timer_state:'idle',switch_entity_id:'switch.demo_quick_boiler',device_active:false,reverse_mode:false,
    }};
  }
  if (query.has('presence-icons')) {
    states['person.demo_friend'].state = 'not_home';
    states['person.demo_guest'] = {state:'not_home',attributes:{friendly_name:'Noa'}};
    states['device_tracker.demo_phone'] = {state:'not_home',attributes:{friendly_name:'Phone'}};
    states['sensor.demo_home_text'] = {state:'home',attributes:{friendly_name:'Text status'}};
  }
  if (query.has('media-remote')) {
    const speaker = states['media_player.demo_speaker'];
    speaker.state = 'off';
    speaker.attributes.supported_features |= 128;
    const tv = states['media_player.demo_tv'];
    tv.state = 'off';
    delete tv.attributes.is_volume_muted;
    hass.services = { media_player: {
      media_previous_track: {}, media_next_track: {}, volume_up: {}, volume_down: {}, volume_mute: {},
      ...(query.has('missing-play-pause') ? {} : { media_play_pause: {} }),
    } };
    if (query.has('media-power')) {
      states['media_player.demo_screen'] = { state: 'standby',
        attributes: { friendly_name: 'Display', supported_features: 384 } };
      if (!query.has('missing-power-on')) hass.services.media_player.turn_on = {};
      hass.services.media_player.turn_off = {};
      tv.attributes.is_volume_muted = false;
    }
  }
  hass.entities['sensor.demo_studio_temperature'] = { area_id: 'studio' };
  if (!query.has('no-native-charts')) window.loadCardHelpers = async () => ({createCardElement(configuration) {
    const graphAction = configuration.tap_action?.action === 'fire-dom-event' && configuration.tap_action;
    const graphMoreInfo = configuration.tap_action?.action === 'more-info' && configuration.entity;
    const card = document.createElement(graphAction || graphMoreInfo ? 'button' : 'div');
    const dialog = document.querySelector('bayit-dashboard')?.shadowRoot.querySelector('.modal[open]');
    card.dataset.duringOpening = String(!!dialog?.getAnimations().some(animation =>
      animation.playState === 'running' || animation.pending));
    card.dataset.nativeType = configuration.type;
    card.dataset.tapAction = configuration.tap_action?.action;
    if (configuration.graph) card.dataset.graphHours = configuration.hours_to_show;
    if (query.has('energy-borderless-theme') && configuration.type === 'sensor') {
      card.style.border = 'var(--ha-card-border-width, 1px) solid var(--ha-card-border-color)';
      card.style.borderRadius = 'var(--ha-card-border-radius, 12px)';
    }
    if (query.has('energy-readings') && configuration.type === 'sensor' && !configuration.graph) {
      card.dataset.sensorIcon = configuration.icon ?? '';
      card.dataset.holdAction = configuration.hold_action?.action;
      card.dataset.doubleTapAction = configuration.double_tap_action?.action;
      Object.defineProperty(card, 'hass', { set(next) {
        const state = next?.states?.[configuration.entity];
        card.dataset.readingState = state?.state ?? '';
      } });
    }
    card.textContent = configuration.type === 'calendar' ? configuration.entities.length + ' calendars' : configuration.name || configuration.entity;
    if (graphAction) {
      card.dataset.holdAction = configuration.hold_action?.action;
      card.dataset.doubleTapAction = configuration.double_tap_action?.action;
      card.onclick = () => card.dispatchEvent(new CustomEvent('ll-custom',
        {bubbles:true,composed:true,detail:graphAction}));
      const plot = document.createElement('span');
      plot.dataset.historyPlot = '';
      plot.textContent = 'Plot';
      plot.onclick = event => event.stopPropagation();
      card.append(plot);
    }
    if (graphMoreInfo) card.onclick = () => card.dispatchEvent(new CustomEvent('hass-more-info',
      {bubbles:true,composed:true,detail:{entityId:graphMoreInfo}}));
    return card;
  }});
}
if (query.has('large-setup')) {
  for (let area = 0; area < 6; area++) {
    const id = 'scale_' + area;
    hass.areas[id] = {area_id:id, name:'Scale area ' + area};
  }
  const domains = ['light', 'sensor', 'switch', 'fan', 'cover', 'number'];
  for (let index = 0; index < 600; index++) {
    const domain = domains[Math.floor(index / 6) % domains.length];
    const id = domain + '.scale_entity_' + index;
    hass.entities[id] = {area_id:'scale_' + index % 6};
    states[id] = {state:'off', attributes:{friendly_name:'Scale entity ' + index}};
  }
}
if (query.has('section-discovery') && stored().strategy.room_overrides?.studio?.sections?.length) {
  states['light.demo_after_sections'] = {state:'off', attributes:{friendly_name:'New lamp after layout', supported_color_modes:['onoff']}};
  hass.entities['light.demo_after_sections'] = {area_id:'studio'};
}
const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
const selected = query.has('configuration') ? stored().strategy : query.has('popup-routes') ? {
  room_overrides: { studio: { entities: ['light.demo_lamp', 'switch.demo_heater'],
    read_only_entities: ['switch.demo_heater'] } },
  hidden_entities: ['script.demo_start'],
  toolbar: [
    { id: 'appearance', kind: 'settings' },
    { id: 'room-status', kind: 'devices', label: 'Device viewer', placement: 'settings', entities: ['switch.demo_heater'] },
    { id: 'outside', kind: 'link', path: '/outside/view' },
  ],
  popup_aliases: {
    '#legacy-lamp': '#device/studio/light.demo_lamp',
    '#legacy-viewer': '#panel/room-status',
    '#legacy-hidden': '#device/studio/script.demo_start',
    '#legacy-link': '#panel/outside',
  },
} : query.has('curated') ? {
  room_shortcuts: { studio: ['switch.demo_heater', 'light.demo_lamp'] },
  overview_entities: ['switch.demo_heater'],
} : query.has('popup-geometry') ? {
  room_overrides: { studio: { entities: ['switch.demo_heater'] } },
  room_shortcuts: { studio: ['switch.demo_heater'] },
} : query.has('entrance-popup-position') ? {
  room_overrides: { studio: { entities: ['switch.demo_heater'] } },
  toolbar: [
    { id:'appearance', kind:'settings' },
    { id:'entry', kind:'devices', label:'כניסה', placement:'settings', popup_position:'room', sections:[
      { kind:'devices', title:'תאורה', entities:[{ entity:'light.demo_lamp', role:'light_tile' }] },
      { kind:'status', title:'אבטחה', layout:'compact', entities:[
        { entity:'lock.demo_entry_position', role:'lock' },
        { entity:'sensor.demo_entry_temperature', role:'graph', graph_hours:24 },
      ] },
    ] },
    { id:'regular-device', kind:'devices', label:'חלונית רגילה', placement:'settings', entities:['switch.demo_heater'] },
  ],
} : query.has('room-grid') ? {
  room_overrides: { studio: { entities: ['light.demo_lamp', 'light.demo_wall', 'light.demo_pendant', 'light.demo_monitor'],
    read_only_entities: ['light.demo_monitor'],
    ...(query.has('room-shutdown') && {turn_off_entities:['light.demo_lamp', 'light.demo_pendant', 'light.demo_monitor']}),
    ...(query.has('lighting-count') && {lighting_count_entities:['light.demo_wall']}) } },
  ...(query.has('grouped-effects') && { light_effect_groups: {
    'light.demo_pendant': [
      { title: 'Evening', effects: [{ effect: 'Slow pulse', name: 'Gentle glow', icon: 'mdi:weather-night' }, 'Missing',
        ...Array.from({ length: 7 }, (_, i) => 'Preset ' + (i + 1))] },
      { title: 'Morning', effects: ['Sunburst'] },
      { title: 'Night', effects: ['Midnight'] },
    ],
    'light.demo_monitor': [{ title: 'Evening', effects: ['Slow pulse'] }],
  } }),
} : query.has('device-panel') ? {
  room_shortcuts: { studio: ['light.demo_lamp', 'climate.demo_air'],
    ...(query.has('preset-shortcut') && { bayit_room_other_preset: ['climate.demo_air'] }) },
  ...(query.has('preset-shortcut') && { area_ids: ['studio', 'bayit_room_other_preset'], room_overrides: {
    studio: { entities: ['light.demo_lamp', 'climate.demo_air'],
      ...(query.has('room-climate-power') && {climate_power_entities:['climate.demo_air']}),
      ...(query.has('compact-climate-controls') && {compact_climate_controls_entities:['climate.demo_air']}),
      climate_preset_shortcuts: {
      'climate.demo_air': { preset: 'none', label: 'SE', icon: 'mdi:leaf', highlight_when: 'eco' },
    } },
    bayit_room_other_preset: { name: 'Second room', entities: ['climate.demo_air'] },
  } }),
  ...(query.has('inline-timer-caption') && { room_overrides: { studio: {
    entity_names: { 'climate.demo_air': 'Near the window' },
  } } }),
  profiles: [{ entity: 'climate.demo_air', kind: 'climate', timed: {
    simple_timer_entity: 'sensor.demo_air_usage', simple_timer_target: 'input_boolean.demo_air_timer',
    min_minutes: 15, max_minutes: 120, step_minutes: 15, presets: [30,60,90,120],
    ...(query.has('timer-usage') && { allow_daily_usage_reset: !query.has('usage-view-only') }),
    ...(query.has('different-usage-source') && { daily_usage_entity: 'sensor.demo_read_only_usage' }),
  } }],
} : query.has('room-status') ? roomStatusSelected : query.has('heater-level') ? {
  ...(query.has('compact-heater-steps') && { shape: 'circle' }),
  ...(query.has('embedded-heater') && { room_overrides: {
    studio: { entities: ['light.demo_lamp', heaterFan], sections: [
      { kind: 'lights', entities: ['light.demo_lamp'] },
      { kind: 'heating', title: '', entities: [heaterFan] },
    ] },
  } }),
  room_shortcuts: { studio: [heaterFan] },
  profiles: [{ entity: heaterFan, kind: 'heater', level_steps: 9,
    level_read_entity: helper, level_select_script: heaterScript,
    ...(query.has('preselect') && { level_preselect_entity: nextLevel }),
    timed: { simple_timer_entity: heaterTimer, simple_timer_target: heaterRelay } }],
} : query.has('overview-opt-in') ? {
  hidden_entities: ['light.demo_dashboard_hidden'],
  toolbar: [{kind:'overview',sections:[
    {kind:'status',title:'Discovered lighting',turn_off_active_lights:query.has('overview-lights-off'),discover:{domain:'light',
      exclude_entities:['light.demo_excluded'],exclude_id_contains:['helper']},entities:['light.demo_lamp']},
    ...(query.has('overview-lights-off-selected') ? [{kind:'status',title:'Selected lighting',filter:'active',
      turn_off_active_lights:true,entities:[
        {entity:'light.demo_dining',role:'action'}, {entity:'light.demo_selected',role:'action'},
        {entity:'light.demo_read_only',role:'status'}, {entity:'light.demo_protected',role:'action',confirmation:true},
        {entity:'switch.demo_heater',role:'action'},
      ]}] : []),
    {kind:'covers',title:'Closing status',filter:'active',include_closing:true,entities:[
      {entity:'cover.demo_overview_window',role:'status'}]},
    {kind:'covers',title:'Default covers',filter:'active',entities:[
      {entity:'cover.demo_overview_window',role:'status'}]},
    ...(query.has('overview-cover-discovery') ? [{kind:'status',title:'Discovered covers',include_closing:true,
      discover:{domain:'cover'},entities:[{entity:'cover.demo_overview_window',role:'status'}]}] : []),
    ...(query.has('overview-readings') ? [{kind:'status',title:'Overview AC status',filter:'active',
      entities:[{entity:'climate.demo_overview_air',role:'status'}]}] : []),
  ]}, ...(query.has('overview-readings') ? [{kind:'security',sections:[{kind:'status',entities:[
    {entity:'light.demo_dining',role:'status'}, {entity:'climate.demo_overview_air',role:'status'},
  ]}]}] : []), {kind:'settings'}],
} : query.has('toolbar-panels') ? {
  ...(query.has('appliance-tile-test') && {profiles:[{entity:'switch.demo_appliance_boiler',kind:'boiler',
    timed:{timer_entity:'timer.demo_appliance_boiler'}}]}),
  ...(query.has('boiler-quick-test') && {profiles:[{entity:'switch.demo_quick_boiler',kind:'boiler',
    timed:{simple_timer_entity:'sensor.demo_boiler_runtime'}}]}),
  ...(linkedPanels && { popup_aliases: { '#legacy-media-panel': '#panel/media-panel' } }),
  ...(query.has('room-link') && { room_overrides: { studio: {
    entities:['light.demo_lamp','media_player.demo_tv','vacuum.demo_robot',
      ...(query.has('appliance-tile-test') ? ['switch.demo_oven','switch.demo_cooktop','switch.demo_appliance_boiler'] : []),
      ...(query.has('boiler-quick-test') ? ['switch.demo_quick_boiler'] : []),
      ...(query.has('room-compact-pair-test') ? ['lock.demo_room_compact'] : [])],
    ...(query.has('room-compact-pair') && {
      compact_device_entities:['lock.demo_room_compact','media_player.demo_tv'],
      sections:[{kind:'devices',entities:['lock.demo_room_compact','media_player.demo_tv']}],
      ...(query.has('compact-pair-read-only') && {read_only_entities:['lock.demo_room_compact']}),
    }),
    ...(query.has('boiler-quick') && {boiler_quick_power_entities:['switch.demo_quick_boiler']}),
    ...(query.has('appliance-tile-test') && {
      read_only_entities:['switch.demo_cooktop'],
      sections:[{kind:'lights',entities:['light.demo_lamp']},{kind:'devices',
        entities:['switch.demo_oven','switch.demo_cooktop','switch.demo_appliance_boiler']}],
      ...(query.has('appliance-tiles') && {appliance_tile_entities:['switch.demo_oven','switch.demo_cooktop','switch.demo_appliance_boiler']}),
    }),
    media_panel_links:{'media_player.demo_tv':'media-panel'},
    ...(query.has('room-media-compact') && {media_compact_entities:['media_player.demo_tv']}),
    vacuum_panel_links:{'vacuum.demo_robot':'vacuum-panel'},
    ...(query.has('vacuum-panel-hold') && {vacuum_panel_hold_entities:['vacuum.demo_robot']}),
    ...(query.has('vacuum-room-display') && {vacuum_panel_presentation:{'vacuum.demo_robot':query.get('vacuum-room-display')}}),
    ...(query.has('vacuum-room-summary') && {vacuum_panel_summary:{'vacuum.demo_robot':{
      status_entity:'sensor.demo_robot_status',battery_entity:'sensor.demo_robot_battery',
      progress_entity:'sensor.demo_robot_progress',cleaning_entity:'binary_sensor.demo_robot_cleaning',
    }}}),
  } } }),
  toolbar:[
    ...(query.has('security-cover-rail') ? [
      {id:'fixture-security',kind:'security',sections:[{kind:'covers',entities:[
        {entity:'cover.demo_security_first',role:'cover', ...query.has('cover-rail-confirm') && {confirmation:true}},
        {entity:'cover.demo_security_second',role:'cover'},
        {entity:'cover.demo_security_passive',role:'status'},
      ]}]},
      {id:'fixture-other-controls',kind:'devices',label:'Other controls',placement:'settings',sections:[{kind:'devices',entities:[
        {entity:'cover.demo_security_first',role:'device'},
      ]}]},
    ] : []),
    {kind:'automations',sections:[{kind:'actions',entities:[{entity:'script.demo_scene',role:'action',command:'run_script',confirmation:'Run the evening scene?'},
      {entity:'lock.demo_entry',role:'lock',confirmation:'Open the front door?'},
      ...(query.has('automation-toggle') ? [{entity:'script.demo_toggle',role:'action',command:'toggle_script',confirmation:'Run the arrival scene?'}] : [])]}]},
    {kind:'presence',
      ...(query.has('presence-custom') && {icon:'mdi:account-heart-outline'}),
      ...(query.has('presence-opt-in') && {presence_dynamic_icon:true}),
      ...(query.has('presence-fixed') && {presence_dynamic_icon:false}),
      sections:[{kind:'people',entities:['person.demo_friend']}, ...(query.has('presence-icons') ? [
        {kind:'people',entities:[{entity:'person.demo_friend',role:'person'},'person.demo_guest','device_tracker.demo_phone']},
        {kind:'status',entities:[{entity:'sensor.demo_home_text',role:'status'}]},
      ] : [])]},
    {kind:'weather',sections:[{kind:'forecast',entities:['weather.demo_home']},{kind:'sun',entities:['sun.sun']},
      ...(query.has('weather-readings') ? [{
        kind:'readings',id:'outside-readings',title:'Outside conditions',
        ...(query.has('weather-readings-list') && {layout:'readings-list'}),
        entities:[
          {entity:'sensor.demo_outdoor_temperature',role:'status',name:'Outside temperature',icon:'mdi:thermometer'},
          'binary_sensor.demo_rain',
          {entity:'sensor.demo_studio_temperature',role:'graph',graph_hours:24},
        ],
      }] : []),
      ...(query.has('utility-graph-details') ? [{kind:'readings',entities:[
        {entity:'sensor.demo_studio_temperature',role:'graph',graph_hours:24},
      ]}] : [])]},
    {kind:'energy',...(query.has('hide-energy-dashboard-link') && {energy_dashboard_link:false}),sections:[{kind:'electricity',
      ...(query.has('energy-readings') && {title:'Electricity'}),
      ...(query.has('energy-reading-cards') && {layout:'reading-cards'}),
      entities:[{entity:'sensor.demo_meter',role:'graph',graph_hours:168},
        ...(query.has('energy-readings') ? [
          {entity:'sensor.demo_bill_forecast',role:'status',name:'Bill estimate',icon:'mdi:cash'},
        ] : []),
      ]},
      ...(query.has('utility-graph-details') || query.has('energy-readings') ? [{kind:'water',
        ...(query.has('energy-readings') && {title:'Water'}),
        ...(query.has('energy-reading-cards') && {layout:'reading-cards'}),
        entities:[{entity:'sensor.demo_water_meter',role:'graph',graph_hours:168},
          ...(query.has('energy-readings') ? [
            {entity:'sensor.demo_last_water',role:'status'},
            {entity:'binary_sensor.demo_water_alarm',role:'status'},
          ] : []),
        ],
      }] : [])]},
    {kind:'settings'},
    {id:'media-panel',kind:'media',placement:linkedPanels ? 'linked' : 'settings',
      ...(linkedPanels && { label:hass.locale.language === 'he' ? 'מדיה מקושרת' : 'Linked Media' }),
      ...(query.has('media-remote') && { media_remote: {
        transport_entity: 'media_player.demo_speaker',
        ...(!query.has('power-only') && { volume_entity: 'media_player.demo_tv' }),
        ...(query.has('media-power') && { power_entity: 'media_player.demo_screen' }),
        allow_standby: !query.has('active-only'),
      } }),
      sections:[
      {kind:'media',title:'Speaker',entities:[{entity:'media_player.demo_speaker',role:'now_playing'}]},
      {kind:'media',title:'TV',entities:[{entity:'media_player.demo_tv',role:'device'}]},
    ]},
    {id:'vacuum-panel',kind:'vacuum',placement:linkedPanels ? 'linked' : 'settings',
      ...(linkedPanels && { label:hass.locale.language === 'he' ? 'שואב מקושר' : 'Linked Vacuum' }),
      sections:[{kind:'vacuum',entities:[{entity:'vacuum.demo_robot',role:'device'}]},
      ...(query.has('vacuum-room-summary') ? [{kind:'readings',layout:'readouts',entities:[{
        entity:'sensor.demo_robot_status',role:'status',readout:{state_labels:{
          segment_cleaning:hass.locale.language === 'he' ? 'מנקה חדר נבחר' : 'Cleaning selected room',
        }},
      }]}] : []),
      {kind:'actions',entities:[{entity:'button.demo_filter',role:'action',confirmation:'Reset the filter?'}]}]},
    ...(!query.has('linked-only-fallback') ? [
      {id:'sensors-panel',kind:'sensors',placement:'settings',sections:[{kind:'readings',entities:[
        {entity:'sensor.demo_progress',role:'graph',graph_hours:168,vacuum_panel_id:'vacuum-panel'},
        {entity:'sensor.demo_studio_temperature',role:'graph',graph_hours:24,graph_room_id:'studio'},
        {entity:'sensor.demo_meter',role:'graph',graph_hours:24,graph_room_id:'removed-room'}]}]},
      {kind:'calendar',placement:'settings',entities:['calendar.demo_household','calendar.demo_birthdays']},
      ...(linkedPanels ? [{id:'overview',kind:'overview',placement:'settings'}, {id:'entrance',kind:'devices',placement:'settings'}] : []),
    ] : []),
    ...(query.has('entrance-light-tiles') ? [{id:'entrance-panel',kind:'devices',label:'Entrance',placement:'settings',
      sections:[{kind:'devices',title:'Lights',entities:[
        {entity:'light.demo_lamp',role:'light_tile'},
        {entity:'light.demo_entry_second',role:'light_tile'},
        {entity:'light.demo_entry_guarded',role:'light_tile',confirmation:'Turn off the guarded light?'},
        {entity:'light.demo_entry_unavailable',role:'light_tile'},
        {entity:'light.demo_entry_generic',role:'device'},
      ]}]}] : []),
    ...(query.has('compact-entrance-status') ? [{id:compactOverview ? 'compact-overview' : 'compact-entrance',
      kind:compactOverview ? 'overview' : 'devices',label:compactOverview ? 'Fixture Overview' : 'Front entrance',placement:'settings',
      sections:[{kind:'status',title:compactOverview ? 'Home status' : 'Entry status',layout:'compact',entities:[
        {entity:'lock.demo_compact_entry',role:'lock'},
        {entity:'sensor.demo_studio_temperature',role:'graph',graph_hours:24},
      ]},{kind:'status',title:'Read-only status',layout:'compact',entities:[
        {entity:'lock.demo_compact_readonly',role:'status'},
      ]}]}] : []),
  ],
} : {};
if (query.has('home-room-sizing')) {
  const count = Number(query.get('home-room-sizing'));
  const he = hass.locale.language === 'he';
  const preferredBreak = he ? 'חדר פנאי' : 'Media Room';
  const long = he ? 'חדר העבודה והמשחקים בקומה העליונה' : 'Upstairs Office and Guest Bedroom';
  hass.areas = {};
  hass.entities = {};
  hass.states = {};
  for (let i = 0; i < count; i++) {
    const room = 'fixture_room_' + i;
    const name = i === 0 ? (count === 3 ? long : preferredBreak) : (he ? 'חדר ' : 'Room ') + (i + 1);
    hass.areas[room] = { area_id:room, name };
    for (let j = 0; j < [6,1,2,6,3,4,5,2,6,3][i]; j++) {
      const entity = 'light.' + room + '_' + j;
      hass.entities[entity] = { area_id:room };
      hass.states[entity] = { state:'off', attributes:{friendly_name:'Fixture light ' + j,supported_color_modes:['onoff']} };
    }
  }
  if (count !== 3) selected.room_overrides = { fixture_room_0:{classic_title_break:1} };
  if (query.has('header')) selected.layout = 'header';
}
if (query.has('wide-home-profile')) {
  selected.wide_alignment = query.get('wide-alignment') || undefined;
  selected.toolbar = [
    ...Array.from({length:5}, (_,index) => ({ kind:'link', path:'/profile-' + (index + 1), label:'View ' + (index + 1) })),
    { kind:'settings' },
  ];
}
const config = Strategy.generate(selected, query.has('empty') ? { ...hass, states: {} } : hass);
const cardConfig = { ...config.views[0].cards[0],
  ...(query.has('embedded-popup-card') && { page: false }),
  ...(query.has('explicit-preference-key') && { preference_key: 'fixture-shared' }),
};
const card = document.createElement('bayit-dashboard');
card.setConfig(cardConfig);
if (!query.has('defer-popup-hass')) card.hass = hass;
document.querySelector('#surface').append(card);
if (query.has('preference-first-frame')) requestAnimationFrame(() => {
  const { background, wallpaperInk, layout, shape } = card.shadowRoot.querySelector('.shell').dataset;
  window.firstAppearance = { background, wallpaperInk, layout, shape };
});

if (query.has('editor')) {
  document.querySelector('#surface').hidden = true;
  const editor = Strategy.getConfigElement();
  editor.setConfig({ type: 'custom:bayit-9',
    ...((query.has('toolbar-panels') || query.has('automation-compact') || query.has('overview-opt-in') || query.has('lighting-count') ||
      query.has('preset-shortcut') || query.has('entrance-popup-position') || query.has('timer-usage') ||
      query.has('swing-unreported') || query.has('temperature-source') || query.has('room-temperature-chart') || query.has('dual-light-details') ||
      query.has('compact-light-reading') || query.has('wide-home-profile')) && selected) });
  editor.hass = hass;
  editor.addEventListener('config-changed', event => { window.latest = event.detail.config; });
  document.querySelector('#editor').append(editor);
}
window.bayitTest = {
  registrations: window.customStrategies, calls, moreInfoCalls, moreInfoHashes, config,
  loadPopupHass() { card.hass = hass; },
  reviseStrategy(change, override) {
    const visible = document.querySelector('bayit-dashboard');
    const previous = visible._hass;
    const next = { ...previous, ...change };
    const regenerate = override || Strategy.shouldRegenerate(selected, previous, next);
    if (regenerate) {
      const nextConfig = override ? { ...selected, ...override } : selected;
      const nextCard = document.createElement('bayit-dashboard');
      nextCard.setConfig(Strategy.generate(nextConfig, next).views[0].cards[0]);
      nextCard.hass = next;
      visible.replaceWith(nextCard);
    } else visible.hass = next;
    return Boolean(regenerate);
  },
  observeScript,
  finishCover: (index, failed = false) => coverRequests[index](failed),
  rejectNextInlineLight() { rejectInlineLight = true; },
  setFixtureRegistry(entity, metadata) {
    hass.entities = { ...hass.entities, [entity]: metadata };
    card.hass = { ...hass, entities: hass.entities };
  },
  rejectNextSetupSave() { rejectSetupSave = true; },
  rejectNextBoilerAction() { rejectQuickBoiler = true; },
  holdNextSetupSave() { holdSetupSave = true; },
  finishHeldSetupSave() { finishSetupSave(); },
  remountDashboardBeforeSaveResult() {
    const fresh = document.createElement('bayit-dashboard');
    fresh.setConfig(cardConfig);
    fresh.hass = hass;
    card.replaceWith(fresh);
  },
  setRoomState(entity, state) {
    states[entity] = { ...states[entity], state };
    card.hass = { ...hass, states: { ...states } };
  },
  setClimatePowerSnapshot(state) {
    states['climate.demo_air'].state = state;
  },
  setMediaPowerSnapshot({ state = 'standby', features = 384, hidden = false, registered = true } = {}) {
    const entity = 'media_player.demo_screen';
    states[entity].state = state;
    states[entity].attributes.supported_features = features;
    hass.entities[entity] = { hidden };
    if (registered) hass.services.media_player.turn_on = {};
    else delete hass.services.media_player.turn_on;
  },
  setFixtureEntityVisibility(entity, hidden) {
    hass.entities = { ...hass.entities, [entity]: { ...hass.entities[entity], hidden } };
    card.hass = { ...hass, states: { ...states } };
  },
  setFixtureAttributes(entity, attributes) {
    states[entity] = { ...states[entity], attributes: { ...states[entity].attributes, ...attributes } };
    card.hass = { ...hass, states: { ...states } };
  },
  setSunState(state, attributes) {
    states['sun.sun'] = { state, attributes };
    card.hass = { ...hass, states: { ...states } };
  },
  setDiscoveredLight(entity, name, metadata) {
    states[entity] = { state: 'on', attributes: { friendly_name: name, supported_color_modes: ['onoff'] } };
    hass.entities = { ...hass.entities, [entity]: metadata };
    card.hass = { ...hass, states: { ...states } };
  },
  setLightModes(entity, modes) {
    states[entity] = { ...states[entity], attributes: { ...states[entity].attributes, supported_color_modes: modes } };
    card.hass = { ...hass, states: { ...states } };
  },
  setRoomLayout(layout, shortcutCount) {
    const rooms = shortcutCount === undefined ? cardConfig.rooms : cardConfig.rooms.map(room =>
      room.id === 'bayit_room_status' ? { ...room,
        shortcuts: room.entities.filter(device => device.entity !== 'sensor.demo_temperature')
          .map(device => device.entity).slice(0, shortcutCount),
        turn_off_entities: ['light.demo_side1'],
      } : room);
    card.setConfig({ ...cardConfig, layout, rooms });
  },
  setMediaArt(entity_picture) {
    states['media_player.demo_speaker'].attributes.entity_picture = entity_picture;
    card.hass = { ...hass, states: { ...states } };
  },
  finishLevel: () => finishLevel(),
  rejectNextLevel: () => { rejectLevel = true; },
  finishPreselect: () => finishPreselect(),
  finishClimatePreset: () => finishClimatePreset(),
  finishUsageReset: () => finishUsageReset(),
  finishRoomOff: failed => finishRoomOff(failed),
  heatingState: () => [states[heaterFan].state, states[heaterRelay].state, states[heaterTimer].attributes.timer_state],
  setHeaterPower: state => {
    states[heaterFan].state = states[heaterRelay].state = state;
    card.hass = { ...hass, states: { ...states } };
  },
  repointTimer: () => {
    states[heaterTimer].attributes.switch_entity_id = 'switch.demo_foreign';
    card.hass = { ...hass, states: { ...states } };
  },
};
</script></html>`;

const sharedFixtureDefaults = { strategy: { type: 'custom:bayit-9', show_unassigned: false }, fixture: true };
const sharedFixtures = new Map();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/bayit-9.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(bundle);
  } else if (/^[/]fixture-shared-dashboard[/][a-z]+$/.test(url.pathname)) {
    if (req.method === 'POST') {
      const body = [];
      for await (const chunk of req) body.push(chunk);
      sharedFixtures.set(url.pathname, JSON.parse(Buffer.concat(body).toString()));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sharedFixtures.get(url.pathname) ?? sharedFixtureDefaults));
  } else if (url.pathname === '/api/media_player_proxy/media_player.demo_speaker') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="teal"/></svg>');
  } else if (url.pathname === '/' || /^\/fixture-(?:home|other)(?:\/(?:home|0))?\/?$/.test(url.pathname)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fixture);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
async function assertHomePreferenceAliases(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const root = '/fixture-home';
  const home = root + '/home';
  const first = async (path, flags = '') => {
    await page.goto(base + path + '?preference-first-frame' + flags);
    await page.waitForFunction(() => window.firstAppearance);
    return page.evaluate(() => window.firstAppearance);
  };
  try {
    await first(home);
    await page.evaluate(path => {
      const key = 'bayit-9.preferences.v1:';
      localStorage.setItem(key + path, JSON.stringify({ background: 'porcelain', layout: 'header', shape: 'circle' }));
      localStorage.setItem(key + 'fixture-shared', JSON.stringify({ background: 'bronze', layout: 'classic', shape: 'square' }));
    }, home);
    const saved = { background: 'porcelain', wallpaperInk: 'dark', layout: 'header', shape: 'circle' };
    for (const path of [home, home + '/', root, root + '/', root + '/0', root + '/0/']) {
      assert.deepEqual(await first(path), saved);
    }
    assert.deepEqual(await first(root + '/0', '&explicit-preference-key'), {
      background: 'bronze', wallpaperInk: 'light', layout: 'classic', shape: 'square',
    });

    // A photo saved by 0.13 under the numeric view key remains readable on
    // Home and after a later preference change writes to the canonical key.
    await page.evaluate(async ({ home, root }) => {
      const key = 'bayit-9.preferences.v1:';
      const legacyKey = key + root + '/0';
      localStorage.removeItem(key + home);
      localStorage.setItem(legacyKey, JSON.stringify({ background: 'personal', layout: 'header' }));
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 16;
      const context = canvas.getContext('2d');
      context.fillStyle = '#f2f4f7';
      context.fillRect(0, 0, 16, 16);
      const thumbnail = canvas.toDataURL('image/jpeg');
      const jpeg = await (await fetch(thumbnail)).arrayBuffer();
      await new Promise((resolve, reject) => {
        const open = indexedDB.open('bayit-9-wallpapers', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('personal');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const transaction = database.transaction('personal', 'readwrite');
          transaction.objectStore('personal').put({ jpeg, thumbnail }, legacyKey);
          transaction.oncomplete = () => { database.close(); resolve(); };
          transaction.onabort = () => { database.close(); reject(transaction.error); };
        };
      });
    }, { home, root });
    const photo = page.locator('.shell[data-background="personal"][data-wallpaper-ink="dark"]');
    await first(home);
    await photo.waitFor();
    assert.equal(await photo.getAttribute('data-layout'), 'header');
    await page.locator('bayit-dashboard').evaluate(card => card.setPreference('shape', 'square'));
    await first(root + '/0');
    await photo.waitFor();
    assert.equal(await photo.getAttribute('data-shape'), 'square');
  } finally {
    await page.close();
  }
}

async function assertPopupScrollMemory(browser) {
  const viewport = { width:391, height:600 };
  const url = base + '/fixture-home/home?configuration&popup-scroll-memory';
  const otherUrl = base + '/fixture-other/home?configuration&popup-scroll-memory';
  const studioHash = '#room-studio';
  const boilerHash = '#boiler-timer';
  const marker = 'bayit-9.popup-scroll.v1:';
  const page = await browser.newPage({ viewport, hasTouch:true, reducedMotion:'reduce' });
  const blocked = await browser.newPage({ viewport, hasTouch:true, reducedMotion:'reduce' });
  page.setDefaultTimeout(8000);
  blocked.setDefaultTimeout(8000);
  try {
    function popup(target) {
      const dialog = target.getByRole('dialog');
      const body = dialog.locator('.modal-body');
      const size = height => body.locator('[data-role=content]').evaluate((content, pixels) => {
        content.style.minBlockSize = pixels + 'px';
      }, height);
      const scroll = top => body.evaluate((element, pixels) => {
        element.scrollTop = pixels;
        element.dispatchEvent(new Event('scroll'));
        return element.scrollTop;
      }, top);
      const position = () => body.evaluate(element => element.scrollTop);
      const waitForPosition = async top => {
        try {
          await target.waitForFunction(value => {
            const body = document.querySelector('bayit-dashboard').shadowRoot.querySelector('dialog[open] .modal-body');
            return body?.scrollTop === value;
          }, top);
        } catch (error) {
          const bounds = await body.evaluate(element => ({ top: element.scrollTop,
            max: element.scrollHeight - element.clientHeight }));
          throw new Error(`Could not restore popup scroll ${top}; observed ${JSON.stringify(bounds)}`, { cause:error });
        }
      };
      return { dialog, body, size, scroll, position, waitForPosition };
    }

    const storage = () => page.evaluate(prefix =>
      Object.fromEntries(Object.keys(sessionStorage).filter(key => key.startsWith(prefix))
        .map(key => [key, sessionStorage.getItem(key)])), marker);
    const roomKey = marker + JSON.stringify(['/fixture-home/home', studioHash]);
    const room = popup(page);
    await page.goto(url + studioHash);
    await room.dialog.waitFor();
    await room.size(1000);
    assert.equal(await room.scroll(460), 460);
    assert.equal((await storage())[roomKey], '460');
    await page.reload();
    await room.dialog.waitFor();
    assert.ok(await room.position() < 460);
    // Reproduce layout/focus moving the body before the saved position fits.
    const partial = await room.body.evaluate(element => {
      const content = element.querySelector('[data-role=content]');
      content.style.minBlockSize = '500px';
      element.scrollTop = 1;
      element.dispatchEvent(new Event('scroll'));
      return { top: element.scrollTop, max: element.scrollHeight - element.clientHeight };
    });
    assert.equal(partial.top, 1);
    assert.ok(partial.max > 2 && partial.max < 460);
    assert.equal((await storage())[roomKey], '460');
    await room.size(1000);
    await room.waitForPosition(460);

    await page.goto(otherUrl + studioHash);
    await room.dialog.waitFor();
    await room.size(1000);
    assert.equal(await room.position(), 0);
    await page.goto(url + '#room-bayit_room_den');
    await room.dialog.waitFor();
    await room.size(1000);
    assert.equal(await room.position(), 0);

    await page.goto(url + studioHash);
    await page.reload();
    await room.dialog.waitFor();
    await room.body.dispatchEvent('wheel', { deltaY:30 });
    await room.size(1000);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    assert.ok(await room.position() < 460);
    await room.scroll(140);
    assert.equal(await room.position(), 140);
    await page.reload();
    await room.dialog.waitFor();
    await room.size(1000);
    await room.waitForPosition(140);

    await page.goto(url + boilerHash);
    await room.dialog.waitFor();
    await room.size(1000);
    assert.equal(await room.scroll(420), 420);
    await page.reload();
    await room.dialog.waitFor();
    await room.size(1000);
    await room.waitForPosition(420);
    const beforeHistory = await storage();
    await room.dialog.getByRole('button', { name:'Usage history', exact:true }).evaluate(button => button.click());
    await room.size(1000);
    assert.equal(await room.scroll(110), 110);
    assert.deepEqual(await storage(), beforeHistory);
    await room.dialog.getByRole('button', { name:'Close', exact:true }).tap();
    await room.dialog.waitFor({ state:'hidden' });
    await page.goto(url + boilerHash);
    await room.dialog.waitFor();
    await room.size(1000);
    await room.waitForPosition(420);

    await blocked.addInitScript(prefix => {
      for (const method of ['getItem', 'setItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (key.startsWith(prefix)) throw new DOMException('Storage blocked', 'SecurityError');
          return original.call(this, key, ...args);
        };
      }
    }, marker);
    const memoryOnly = popup(blocked);
    await blocked.goto(url + studioHash);
    await memoryOnly.dialog.waitFor();
    await memoryOnly.size(1000);
    assert.equal(await memoryOnly.scroll(225), 225);
    await memoryOnly.dialog.getByRole('button', { name:'Close', exact:true }).tap();
    await memoryOnly.dialog.waitFor({ state:'hidden' });
    await blocked.getByRole('button', { name:'Studio', exact:true }).tap();
    await memoryOnly.dialog.waitFor();
    await memoryOnly.waitForPosition(225);
    assert.deepEqual(await page.evaluate(() => window.bayitTest.calls.filter(call => call.domain)), []);
  } finally {
    await Promise.all([page.close(), blocked.close()]);
  }
}

async function assertSharedAppearance(browser) {
  const url = base + '/fixture-home/home?configuration&shared-appearance=' + browser.browserType().name();
  const device = { viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' };
  const adminPage = await browser.newPage(device);
  const memberPage = await browser.newPage(device);
  try {
    await Promise.all([adminPage.goto(url), memberPage.goto(url + '&member')]);
    const openSettings = async page => {
      await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
      return page.getByRole('dialog', { name: 'Appearance', exact: true });
    };
    const appearance = page => page.locator('.shell').evaluate(shell =>
      [shell.dataset.background, shell.dataset.shape, shell.dataset.layout]);
    const admin = await openSettings(adminPage);
    const member = await openSettings(memberPage);
    assert.equal(await admin.locator('.appearance-actions').isVisible(), false);
    assert.equal(await member.locator('.appearance-actions').isVisible(), false);
    await member.locator('.appearance-layout > summary').press('Enter');
    const square = member.getByRole('button', { name: 'Square', exact: true });
    await square.press('Enter');
    assert.equal(await square.evaluate(control => control.getRootNode().activeElement === control), true);
    assert.equal(await member.getByRole('button', { name: 'Save as household defaults' }).count(), 0);
    assert.deepEqual(await appearance(memberPage), ['aurora', 'square', 'classic']);
    assert.deepEqual(await appearance(adminPage), ['aurora', 'soft', 'classic']);

    const wallpaperSummary = admin.locator('.wallpaper-gallery > summary');
    const adminLayout = admin.locator('.appearance-layout > summary');
    const share = admin.getByRole('button', { name: 'Save as household defaults', exact: true });
    const saved = admin.getByText('Household appearance saved.', { exact: true });
    const reset = admin.getByRole('button', { name: 'Use household defaults', exact: true });
    await wallpaperSummary.tap();
    await admin.getByRole('button', { name: 'Misty forest', exact: true }).tap();
    await wallpaperSummary.tap();
    assert.equal(await admin.locator('.appearance-layout').evaluate(layout => layout.open), false);
    await reset.press('Enter');
    assert.equal(await wallpaperSummary.evaluate(summary => summary.getRootNode().activeElement === summary), true);
    await admin.locator('.appearance-actions').waitFor({ state: 'hidden' });
    assert.deepEqual(await appearance(adminPage), ['aurora', 'soft', 'classic']);

    await wallpaperSummary.tap();
    await admin.getByRole('button', { name: 'Misty forest', exact: true }).tap();
    await wallpaperSummary.tap();
    assert.deepEqual(await appearance(adminPage), ['jade', 'soft', 'classic']);
    assert.equal(await adminPage.evaluate(() => window.bayitTest.calls.length), 0);
    await share.press('Enter');
    await saved.waitFor();
    assert.equal(await wallpaperSummary.evaluate(summary => summary.getRootNode().activeElement === summary), true);
    assert.equal(await admin.locator('.appearance-layout').evaluate(layout => layout.open), false);
    const callsAfterWallpaper = await adminPage.evaluate(() => window.bayitTest.calls.length);

    await adminLayout.press('Enter');
    await admin.getByRole('button', { name: 'Round', exact: true }).tap();
    await admin.locator('[data-preference="layout"][value="header"]').tap();
    assert.equal(await adminPage.evaluate(() => window.bayitTest.calls.length), callsAfterWallpaper);
    assert.deepEqual(await appearance(adminPage), ['jade', 'circle', 'header']);
    assert.deepEqual(await appearance(memberPage), ['aurora', 'square', 'classic']);

    await share.press('Enter');
    await saved.waitFor();
    assert.equal(await adminLayout.evaluate(summary => summary.getRootNode().activeElement === summary), true);
    const saveRequests = await adminPage.evaluate(() =>
      window.bayitTest.calls.filter(call => call.type === 'lovelace/config/save'));
    const strategy = { type: 'custom:bayit-9', show_unassigned: false, background: 'jade' };
    const configSave = value => ({ type: 'lovelace/config/save', url_path: 'fixture-home',
      config: { strategy: value, fixture: true } });
    assert.deepEqual(saveRequests, [configSave(strategy), configSave({ ...strategy, shape: 'circle', layout: 'header' })]);
    await reset.waitFor({ state: 'hidden' });

    await memberPage.reload();
    await memberPage.locator('.shell[data-background="jade"][data-layout="header"]').waitFor();
    assert.deepEqual(await appearance(memberPage), ['jade', 'square', 'header']);
    const updated = memberPage.getByRole('dialog', { name: 'Appearance', exact: true });
    const restoredLayout = updated.locator('.appearance-layout > summary');
    assert.equal(await updated.locator('.appearance-layout').evaluate(layout => layout.open), false);
    await updated.getByRole('button', { name: 'Use household defaults', exact: true }).press('Enter');
    assert.equal(await restoredLayout.evaluate(summary => summary.getRootNode().activeElement === summary), true);
    assert.deepEqual(await appearance(memberPage), ['jade', 'circle', 'header']);
    assert.equal(await memberPage.evaluate(() => window.bayitTest.calls.length), 0);
    await memberPage.reload();
    await memberPage.locator('.shell[data-background="jade"][data-shape="circle"][data-layout="header"]').waitFor();
  } finally {
    await Promise.all([adminPage.close(), memberPage.close()]);
  }
}

async function assertNativeRoomCoverHeader(browser) {
  const page = await browser.newPage({ viewport: { width: 320, height: 780 }, hasTouch: true, reducedMotion: 'reduce' });
  try {
    await page.goto(base + '/fixture-home/home?configuration&cover-grid&native-more-info=modern');
    await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
    await page.getByRole('button', { name: 'Customize home', exact: true }).tap();
    const editor = page.getByRole('dialog', { name: 'Customize home', exact: true });
    await editor.getByText('Rooms', { exact: true }).tap();
    await editor.getByText('Device display', { exact: true }).tap();
    await editor.getByLabel('Device to customize', { exact: true }).selectOption('cover.demo_curtain');
    await editor.getByRole('checkbox', { name: 'Open Home Assistant details from the cover header' }).check();
    await editor.getByRole('button', { name: 'Save dashboard', exact: true }).tap();
    await page.waitForURL(url => url.hash === '');
    await editor.waitFor({ state: 'hidden' });

    await page.getByRole('button', { name: 'Studio', exact: true }).tap();
    const room = page.getByRole('dialog', { name: 'Studio', exact: true });
    const header = room.getByRole('button', { name: 'Long living room curtain · More info', exact: true });
    const other = room.getByRole('button', { name: 'Window shade · Device controls', exact: true });
    await header.waitFor();
    await other.waitFor();
    assert.ok((await header.boundingBox()).height >= 44);
    const native = page.getByRole('dialog', { name: 'Native entity details', exact: true });
    const triggers = [
      () => header.tap(),
      () => header.press('Shift+Enter'),
      () => header.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 19, button: 0, isPrimary: true }),
    ];
    for (const trigger of triggers) {
      await trigger();
      await native.waitFor();
      if (trigger === triggers[2]) await page.evaluate(() => document.dispatchEvent(
        new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 19 })));
      assert.equal(new URL(page.url()).hash, '#room-studio');
      assert.equal(new URL(page.url()).searchParams.get('more-info-entity-id'), 'cover.demo_curtain');
      await native.getByRole('button', { name: 'Close native details', exact: true }).tap();
      await native.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => {
        const root = document.querySelector('bayit-dashboard').shadowRoot;
        return history.state?.dialog !== 'ha-more-info-dialog' &&
          root.activeElement?.getAttribute('aria-label') === 'Long living room curtain · More info' &&
          location.hash === '#room-studio' && !new URL(location.href).searchParams.has('more-info-entity-id');
      });
    }
    assert.deepEqual(await page.evaluate(() => window.bayitTest.moreInfoCalls), Array(3).fill('cover.demo_curtain'));
    assert.deepEqual(await page.evaluate(() => window.bayitTest.calls.filter(call => call.domain)), []);
    await other.tap();
    await page.getByRole('dialog', { name: 'Window shade', exact: true }).waitFor();
  } finally {
    await page.close();
  }
}

async function assertNativeRoomLightHold(browser) {
  const page = await browser.newPage({ viewport: { width: 320, height: 780 }, hasTouch: true, reducedMotion: 'reduce' });
  try {
    await page.goto(base + '/fixture-home/home?configuration&room-control-names&native-more-info=modern&native-focus-anchor');
    await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
    await page.getByRole('button', { name: 'Customize home', exact: true }).tap();
    const editor = page.getByRole('dialog', { name: 'Customize home', exact: true });
    await editor.getByText('Rooms', { exact: true }).tap();
    await editor.getByText('Device display', { exact: true }).tap();
    await editor.getByLabel('Device to customize', { exact: true }).selectOption('light.demo_lamp');
    const optIn = editor.getByRole('checkbox', { name: 'Open Home Assistant details with a long press on this light' });
    assert.equal(await optIn.isChecked(), false);
    await optIn.check();
    await editor.getByRole('button', { name: 'Save dashboard', exact: true }).tap();
    await page.waitForURL(url => url.hash === '');
    await editor.waitFor({ state: 'hidden' });

    await page.getByRole('button', { name: 'Studio', exact: true }).tap();
    const studio = page.getByRole('dialog', { name: 'Studio', exact: true });
    const tileFor = room => room.locator('[data-entity="light.demo_lamp"] .device-tile');
    const tile = tileFor(studio);
    const native = page.getByRole('dialog', { name: 'Native entity details', exact: true });
    const commands = () => page.evaluate(() => window.bayitTest.calls.filter(call => call.domain));
    const hold = button => button.evaluate(async target => {
      const pointer = { button: 0, pointerId: 19, pointerType: 'touch', isPrimary: true, bubbles: true, composed: true };
      target.dispatchEvent(new PointerEvent('pointerdown', pointer));
      await new Promise(resolve => setTimeout(resolve, 535));
      target.dispatchEvent(new PointerEvent('pointerup', pointer));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    });
    for (const trigger of [() => tile.press('Shift+Enter'), () => hold(tile)]) {
      await trigger();
      await native.waitFor();
      assert.equal(new URL(page.url()).hash, '#room-studio');
      assert.equal(new URL(page.url()).searchParams.get('more-info-entity-id'), 'light.demo_lamp');
      await native.getByRole('button', { name: 'Close native details', exact: true }).tap();
      await native.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => {
        const root = document.querySelector('bayit-dashboard').shadowRoot;
        return history.state?.dialog !== 'ha-more-info-dialog' && root.activeElement?.matches('.device-tile') &&
          location.hash === '#room-studio' && !new URL(location.href).searchParams.has('more-info-entity-id');
      });
    }
    assert.deepEqual(await commands(), []);
    await tile.tap();
    await studio.locator('[data-entity="light.demo_lamp"] .device-tile[aria-pressed="true"]').waitFor();
    assert.deepEqual((await commands()).map(({ domain, service, target }) => [domain, service, target.entity_id]),
      [['light', 'turn_on', 'light.demo_lamp']]);
    await studio.getByRole('button', { name: 'Close', exact: true }).tap();
    await studio.waitFor({ state: 'hidden' });

    const quick = page.locator('.room[data-room="studio"] .quick-button[data-entity="light.demo_lamp"]');
    await quick.press('Shift+Enter');
    await page.waitForURL(url => url.hash === '#device/studio/light.demo_lamp');
    assert.equal(await native.count(), 0);
    await page.keyboard.press('Escape');
    await page.waitForURL(url => url.hash === '');

    await page.getByRole('button', { name: 'Den', exact: true }).tap();
    await tileFor(page.getByRole('dialog', { name: 'Den', exact: true })).press('Shift+Enter');
    await page.waitForURL(url => url.hash === '#device/bayit_room_den/light.demo_lamp');
    assert.equal(await native.count(), 0);
    assert.deepEqual(await page.evaluate(() => window.bayitTest.moreInfoCalls), Array(2).fill('light.demo_lamp'));
  } finally {
    await page.close();
  }
}

async function assertRoomDeviceIcons(browser) {
  for (const nativePicker of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 320, height: 780 }, hasTouch: true, reducedMotion: 'reduce' });
    try {
      if (nativePicker) {
        await page.addInitScript(() => {
          document.addEventListener('DOMContentLoaded', () => {
            const theme = document.createElement('style');
            theme.textContent = 'html { --primary-text-color: #141414; --secondary-text-color: #404040;' +
              '--ha-color-text-secondary: var(--secondary-text-color); --ha-color-neutral-60: #595959;' +
              '--wa-form-control-value-color: var(--primary-text-color);' +
              '--wa-form-control-placeholder-color: var(--ha-color-text-secondary);' +
              '--wa-color-neutral-on-normal: var(--ha-color-text-secondary);' +
              '--wa-color-neutral-on-quiet: var(--ha-color-text-secondary); }';
            document.head.append(theme);
          }, { once: true });
          customElements.define('ha-icon-picker', class extends HTMLElement {
            constructor() {
              super();
              let root = this.attachShadow({ mode: 'open' });
              for (const tag of ['ha-generic-picker', 'ha-bottom-sheet', 'ha-picker-combo-box', 'ha-input-search']) {
                const child = document.createElement(tag);
                root.append(child);
                root = child.attachShadow({ mode: 'open' });
              }
              root.innerHTML = '<style>wa-input::part(input)::placeholder { color: var(--ha-color-neutral-60); }</style>' +
                '<wa-input><ha-svg-icon slot="start"></ha-svg-icon></wa-input>';
              root.querySelector('wa-input').attachShadow({ mode: 'open' }).innerHTML =
                '<style>.text-field { color: var(--wa-form-control-value-color); background: var(--card-background-color); }' +
                '.control { color: inherit; } .control::placeholder { color: var(--wa-form-control-placeholder-color); }' +
                '.clear { color: var(--wa-color-neutral-on-normal); }</style>' +
                '<div class="text-field"><slot name="start"></slot><input class="control" part="input" ' +
                'placeholder="Search | Add custom item"><button class="clear" type="button">Clear</button></div>';
            }
          });
        });
      }
      await page.goto(base + '/fixture-home/home?configuration&room-control-names');
      const editor = page.getByRole('dialog', { name: 'Customize home', exact: true });
      const open = async () => {
        await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
        await page.getByRole('button', { name: 'Customize home', exact: true }).tap();
        await editor.getByText('Rooms', { exact: true }).tap();
        await editor.getByLabel('Room to customize', { exact: true }).selectOption('studio');
        await editor.getByText('Device display', { exact: true }).tap();
        await editor.getByLabel('Device to customize', { exact: true }).selectOption('light.demo_lamp');
      };
      const save = async () => {
        await editor.getByRole('button', { name: 'Save dashboard', exact: true }).tap();
        await editor.waitFor({ state: 'hidden' });
        await page.waitForURL(url => url.hash === '');
      };
      const input = nativePicker ? editor.locator('ha-icon-picker[aria-label="Icon in this room"]')
        : editor.getByLabel('Icon in this room', { exact: true });
      const icon = 'mdi:ceiling-light';
      const preview = editor.locator('.room-icon-preview ha-icon');
      const reset = editor.getByRole('button', { name: 'Use default icon', exact: true });
      const storedOverride = () => page.evaluate(() => {
        const { studio, bayit_room_den: den } = JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.room_overrides;
        return { studio: studio.entity_icons ?? null, den: den.entity_icons ?? null };
      });
      const waitForHomeIcon = (room, expected) => page.locator('.room[data-room="' + room +
        '"] .quick-button[data-entity="light.demo_lamp"] ha-icon[icon="' + expected + '"]').waitFor({ state: 'attached' });

      await open();
      assert.equal(await preview.last().getAttribute('icon'), 'mdi:lightbulb-outline');
      if (nativePicker) {
        const colors = await input.evaluate(element => {
          const style = getComputedStyle(element);
          return {
            selection: style.getPropertyValue('--ha-color-fill-primary-quiet-resting'),
            input: style.getPropertyValue('--ha-color-on-surface-default').trim(),
            text: style.getPropertyValue('--primary-text-color').trim(),
          };
        });
        assert.match(colors.selection, /color-mix/);
        assert.ok(colors.input);
        assert.equal(colors.input, colors.text);
        const search = input.getByPlaceholder('Search | Add custom item');
        await search.fill('mdi:light-recessed');
        for (const [ink, muted, surface, expected] of [
          ['#fff', '#ccc', '#282828', ['rgb(255, 255, 255)', 'rgb(204, 204, 204)', 'rgb(40, 40, 40)']],
          ['#161616', '#434343', '#f2f2f2', ['rgb(22, 22, 22)', 'rgb(67, 67, 67)', 'rgb(242, 242, 242)']],
        ]) {
          await input.evaluate((picker, palette) => {
            const editor = picker.getRootNode().host;
            editor.style.setProperty('--ink', palette.ink);
            editor.style.setProperty('--secondary', palette.muted);
            editor.style.setProperty('--surface', palette.surface);
          }, { ink, muted, surface });
          const [foreground, secondary, background] = expected;
          const { placeholder, placeholderTokens, ...actual } = await search.evaluate(control => {
            const box = control.parentElement;
            const style = getComputedStyle(box);
            const text = control.value;
            control.value = '';
            const placeholder = getComputedStyle(control, '::placeholder').color;
            control.value = text;
            return {
              value: getComputedStyle(control).color,
              field: style.color,
              background: style.backgroundColor,
              placeholder,
              placeholderTokens: ['--ha-color-neutral-60', '--wa-form-control-placeholder-color']
                .map(token => style.getPropertyValue(token).trim()),
              search: getComputedStyle(box.querySelector('slot').assignedElements()[0]).color,
              clear: getComputedStyle(box.querySelector('.clear')).color,
            };
          });
          assert.deepEqual(actual, {
            value: foreground, field: foreground, background, search: foreground, clear: secondary,
          });
          assert.deepEqual(placeholderTokens, [muted, muted]);
          // WebKit can report the inherited value color from getComputedStyle on this pseudo-element.
          assert.ok([secondary, foreground].includes(placeholder));
        }
        await input.evaluate((element, value) => element.dispatchEvent(new CustomEvent('value-changed', { detail: { value } })), icon);
      } else {
        await input.fill('invalid-icon-prefix');
        await input.press('Enter');
        assert.equal(await input.evaluate(element => element.checkValidity()), false);
        assert.equal(await reset.count(), 0);
        await input.fill(icon);
        assert.equal(await preview.last().getAttribute('icon'), icon);
        await input.press('Enter');
      }
      await reset.waitFor();
      await save();
      assert.deepEqual(await storedOverride(), { studio: { 'light.demo_lamp': icon }, den: null });
      await waitForHomeIcon('studio', icon);
      await waitForHomeIcon('bayit_room_den', 'mdi:lightbulb-outline');
      await page.getByRole('button', { name: 'Studio', exact: true }).tap();
      const room = page.getByRole('dialog', { name: 'Studio', exact: true });
      await room.locator('[data-entity="light.demo_lamp"] .device-icon[icon="' + icon + '"]').waitFor();
      await room.getByRole('button', { name: 'Close', exact: true }).tap();
      await room.waitFor({ state: 'hidden' });

      await open();
      assert.equal(await input.evaluate(element => element.value), icon);
      await reset.tap();
      assert.equal(await input.evaluate(element => element.value), '');
      assert.equal(await preview.last().getAttribute('icon'), 'mdi:lightbulb-outline');
      await save();
      assert.deepEqual(await storedOverride(), { studio: null, den: null });
      await waitForHomeIcon('studio', 'mdi:lightbulb-outline');
      assert.deepEqual(await page.evaluate(() => window.bayitTest.calls.filter(call => call.domain)), []);
    } finally {
      await page.close();
    }
  }
}

async function assertSetupFooterLayout(browser) {
  const page = await browser.newPage({ viewport: { width: 391, height: 845 }, reducedMotion: 'reduce' });
  try {
    await page.goto(base + '/fixture-home/home?configuration');
    const editor = page.getByRole('dialog', { name: 'Customize home', exact: true });
    const open = async () => {
      await page.getByRole('button', { name: 'Appearance', exact: true }).click();
      await page.getByRole('button', { name: 'Customize home', exact: true }).click();
      await editor.getByText('Rooms', { exact: true }).click();
    };
    await open();
    const name = editor.getByRole('textbox', { name: 'Room display name', exact: true });
    const save = editor.getByRole('button', { name: 'Save dashboard', exact: true });
    const body = editor.locator('.modal-body');
    const footer = editor.locator('.setup-footer');
    const roomPicker = editor.getByRole('combobox', { name: 'Room to customize', exact: true });
    assert.equal(await roomPicker.evaluate(field => getComputedStyle(field).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await footer.evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)');
    for (const [width, height] of [[391, 845], [320, 667]]) {
      await page.setViewportSize({ width, height });
      await name.evaluate(field => field.scrollIntoView({ block: 'center' }));
      const [fieldRect, bodyRect, controlsRect] = await Promise.all(
        [name.boundingBox(), body.boundingBox(), footer.boundingBox()]);
      assert.ok(fieldRect.y >= bodyRect.y && fieldRect.y + fieldRect.height <= controlsRect.y,
        'The footer must leave the room name reachable');
      assert.ok(bodyRect.y + bodyRect.height <= controlsRect.y + 1, 'The footer must be outside the scroll viewport');
      await page.mouse.click(fieldRect.x + fieldRect.width / 2, fieldRect.y + fieldRect.height / 2);
      assert.equal(await name.evaluate(field => field.getRootNode().activeElement === field), true);
    }
    await page.keyboard.type('Draft studio');
    await editor.getByRole('button', { name: 'Close', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    await open();
    assert.equal(await name.inputValue(), 'Draft studio');
    assert.equal(await save.isEnabled(), true);
    assert.deepEqual(await page.evaluate(() => window.bayitTest.calls.filter(call => call.type === 'lovelace/config/save')), []);
  } finally {
    await page.close();
  }
}

async function assertSetupDrafts(browser) {
  const page = await browser.newPage({
    viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce',
  });
  page.setDefaultTimeout(8000);
  try {
    await page.goto(base + '/fixture-home/home?configuration');
    const setup = page.getByRole('dialog', { name: 'Customize home', exact: true });
    const title = setup.getByLabel('Dashboard title', { exact: true });
    const save = setup.getByRole('button', { name: 'Save dashboard', exact: true });
    const discard = setup.getByRole('button', { name: 'Discard draft', exact: true });
    const status = setup.getByRole('status');
    const open = async ({ waitForEditor = true } = {}) => {
      await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
      await page.getByRole('button', { name: 'Customize home', exact: true }).tap();
      if (waitForEditor) await title.waitFor();
    };
    const savedTitle = () => page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('bayit9-browser-fixture'))?.strategy.title);
    const writes = () => page.evaluate(() => window.bayitTest.calls.filter(call =>
      call.type === 'lovelace/config/save' || call.domain).length);
    const close = () => setup.getByRole('button', { name: 'Close', exact: true }).tap();

    await open();
    assert.equal(await discard.isVisible(), false);
    await title.fill('Home draft');
    await page.keyboard.press('Escape');
    await setup.waitFor({ state: 'hidden' });
    assert.equal(await writes(), 0);
    assert.equal(await savedTitle(), undefined);
    await open();
    assert.equal(await title.inputValue(), 'Home draft');
    assert.equal(await status.textContent(), 'Unsaved changes restored.');

    await title.fill('Updated draft');
    await page.goBack();
    await setup.waitFor({ state: 'hidden' });
    await open();
    assert.equal(await title.inputValue(), 'Updated draft');
    assert.equal(await writes(), 0);

    await page.evaluate(() => window.bayitTest.rejectNextSetupSave());
    await save.tap();
    await setup.getByText('Could not load or save dashboard settings.', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, '#panel/settings');
    assert.equal(await title.inputValue(), 'Updated draft');
    assert.equal(await savedTitle(), undefined);
    assert.equal(await save.isEnabled(), true);
    await save.tap();
    await page.getByRole('heading', { name: 'Updated draft', exact: true }).waitFor();
    assert.equal(await savedTitle(), 'Updated draft');
    assert.equal(new URL(page.url()).hash, '');

    await open();
    await title.fill('Conflicting draft');
    await title.blur();
    await page.evaluate(() => sessionStorage.setItem('bayit9-browser-fixture',
      JSON.stringify({ strategy: { type: 'custom:bayit-9', title: 'Another administrator' } })));
    await save.tap();
    await setup.getByText(/The dashboard changed elsewhere/).waitFor();
    assert.equal(await writes(), 0, 'A detected conflict must not send a save request');
    await title.fill('Preserved edits');
    await title.blur();
    assert.equal(await save.isEnabled(), false);
    await close();
    await setup.waitFor({ state: 'hidden' });
    await open();
    await setup.getByText(/The dashboard changed elsewhere/).waitFor();
    assert.equal(await title.inputValue(), 'Preserved edits');
    assert.equal(await save.isEnabled(), false);
    await discard.tap();
    await title.waitFor();
    assert.equal(await title.inputValue(), 'Another administrator');
    assert.equal(await discard.isVisible(), false);
    assert.equal(await save.isEnabled(), false);
    assert.equal(await savedTitle(), 'Another administrator');
    assert.equal(await writes(), 0);

    await title.fill('Saved during a Home Assistant remount');
    await title.blur();
    await page.evaluate(() => window.bayitTest.holdNextSetupSave());
    await save.tap();
    await setup.getByText('Saving dashboard…', { exact: true }).waitFor();
    await page.waitForFunction(() => window.bayitTest.calls.some(call => call.type === 'lovelace/config/save'));
    await page.evaluate(() => window.bayitTest.remountDashboardBeforeSaveResult());
    assert.equal(new URL(page.url()).hash, '#panel/settings');
    await page.evaluate(() => window.bayitTest.finishHeldSetupSave());
    await page.waitForURL(url => url.hash === '');
    await page.getByRole('heading', { name: 'Saved during a Home Assistant remount', exact: true }).waitFor();
    assert.equal(await savedTitle(), 'Saved during a Home Assistant remount');
    await open();

    await title.fill('Saved after close');
    await title.blur();
    await page.evaluate(() => window.bayitTest.holdNextSetupSave());
    await save.tap();
    await setup.getByText('Saving dashboard…', { exact: true }).waitFor();
    await page.waitForFunction(() => window.bayitTest.calls.some(call => call.type === 'lovelace/config/save'));
    await close();
    await setup.waitFor({ state: 'hidden' });
    await open({ waitForEditor: false });
    await setup.getByText('Loading dashboard settings…', { exact: true }).waitFor();
    await page.evaluate(() => window.bayitTest.finishHeldSetupSave());
    await title.waitFor();
    assert.equal(await title.inputValue(), 'Saved after close');
    assert.equal(await savedTitle(), 'Saved after close');
    assert.equal(await discard.isVisible(), false);
    assert.equal(await save.isEnabled(), false);
    assert.equal(await writes(), 1);
  } finally {
    await page.close();
  }
}

async function assertCompactSettings(browser) {
  const page = await browser.newPage({ viewport: { width:391, height:845 }, isMobile:true, hasTouch:true, reducedMotion:'reduce' });
  page.setDefaultTimeout(8000);
  try {
    await page.goto(base + '/fixture-home/home?configuration&compact-settings&locale=he');
    const open = page.locator('.chrome-button[data-role=settings]');
    await open.tap();
    const dialog = page.locator('dialog.modal[open]');
    const appearance = dialog.locator('.appearance-preferences');
    const headings = appearance.locator('details > summary');
    assert.match(await headings.nth(0).innerText(), /^רקע הבית/);
    assert.equal(await headings.nth(1).innerText(), 'סידור מסך הבית');
    const geometry = await dialog.evaluate(element => {
      const settings = element.querySelector('.settings');
      const rect = node => node.getBoundingClientRect();
      const disclosures = [...settings.querySelectorAll('details')];
      const systems = [...settings.querySelectorAll('.settings-system > button')];
      const preview = settings.querySelector('.wallpaper-current-preview');
      return { height:rect(element).height, blocks:[...settings.children].map(child => child.className),
        rows:disclosures.map(detail => [detail.open, rect(detail.querySelector('summary')).height]),
        systemPositions:systems.map(button => rect(button).y), shortcutCount:settings.querySelectorAll('.settings-screens > button').length,
        previewWidth:rect(preview).width, previewHeight:rect(preview).height,
        hasOverflow:settings.scrollWidth > settings.clientWidth };
    });
    assert.deepEqual(geometry.blocks, ['appearance-preferences', 'settings-shortcuts', 'settings-system']);
    assert.deepEqual(geometry.rows, [[false,52], [false,52]]);
    assert.deepEqual([geometry.previewWidth, geometry.previewHeight], [36,28]);
    assert.equal(geometry.shortcutCount, 6);
    assert.equal(geometry.systemPositions.length, 2);
    assert.equal(geometry.systemPositions[0], geometry.systemPositions[1]);
    assert.equal(geometry.hasOverflow, false);
    assert.ok(geometry.height <= 442, JSON.stringify(geometry));
    assert.equal(await dialog.locator('[data-preference]:visible').count(), 0);
    assert.equal(await dialog.locator('[data-wallpaper-choice]').count(), 0);
    await headings.nth(1).press('Enter');
    await dialog.locator('[data-preference="shape"]:visible').first().waitFor();
    await headings.nth(1).press('Space');
    assert.equal(await dialog.locator('[data-preference]:visible').count(), 0);
    await dialog.getByRole('button', { name:'כניסה', exact:true }).tap();
    await page.getByRole('dialog', { name:'כניסה', exact:true }).waitFor();
    assert.equal(new URL(page.url()).hash, '#panel/devices');
    assert.deepEqual(await page.evaluate(() => window.bayitTest.calls), []);
  } finally {
    await page.close();
  }
}

async function assertDeviceHeading(dialog, name) {
  assert.equal(await dialog.getByRole('heading', { name, exact: true }).count(), 1);
  const status = dialog.locator('.device-state-head');
  await status.locator('.current').waitFor();
  await status.getByRole('button', { name: /^(More info|מידע נוסף)$/ }).waitFor();
  assert.equal(await status.locator('.device-name, .device-icon').filter({ visible: true }).count(), 0);
}

async function assertShortcutDetailRoutes(browser) {
  const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true });
  try {
    const url = base + '/fixture-home/home?configuration&shortcut-detail-routes&native-more-info=modern';
    await page.goto(url);
    const shortcut = entity => page.locator('.room[data-room="studio"] .quick-button[data-entity="' + entity + '"]');
    const lock = shortcut('lock.demo_route_lock');
    const cover = shortcut('cover.demo_route_shade');
    const washer = shortcut('switch.demo_heater');
    const commands = () => page.evaluate(() => window.bayitTest.calls.filter(call => call.domain));
    const security = page.getByRole('dialog', { name: 'Room Security', exact: true });
    const native = page.getByRole('dialog', { name: 'Native entity details', exact: true });
    const shadeDetail = page.getByRole('dialog', { name: 'Demo shade', exact: true });
    const lockPrompt = page.locator('dialog.confirm[open]');
    const isFocused = control => control.getRootNode().activeElement === control;
    await lock.waitFor();

    await lock.press('Shift+Enter');
    await security.waitFor();
    assert.equal(new URL(page.url()).hash, '#panel/shared-security');
    await lock.evaluate(button => button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    assert.equal(await lockPrompt.count(), 0);
    assert.deepEqual(await commands(), []);
    await page.keyboard.press('Escape');
    await security.waitFor({ state: 'hidden' });
    await page.waitForURL(url);
    assert.equal(await lock.evaluate(isFocused), true);
    await lock.tap();
    await lockPrompt.getByRole('button', { name: 'Cancel', exact: true }).tap();
    await lockPrompt.waitFor({ state: 'hidden' });
    assert.deepEqual(await commands(), []);

    await cover.evaluate(async button => {
      button.dispatchEvent(new PointerEvent('pointerdown', {
        button: 0, pointerId: 13, pointerType: 'touch', isPrimary: true, bubbles: true, composed: true,
      }));
      await new Promise(resolve => setTimeout(resolve, 535));
      button.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 13, pointerType: 'touch', isPrimary: true, bubbles: true, composed: true,
      }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    });
    await native.waitFor();
    assert.equal(new URL(page.url()).searchParams.get('more-info-entity-id'), 'cover.demo_route_shade');
    assert.deepEqual(await page.evaluate(() => window.bayitTest.moreInfoCalls), ['cover.demo_route_shade']);
    assert.deepEqual(await commands(), []);
    await native.getByRole('button', { name: 'Close native details', exact: true }).tap();
    await native.waitFor({ state: 'hidden' });
    await page.waitForURL(url);
    await page.waitForFunction(() => history.state?.dialog !== 'ha-more-info-dialog' &&
      document.querySelector('bayit-dashboard').shadowRoot.activeElement?.dataset.entity === 'cover.demo_route_shade');

    const otherCover = page.locator('.room[data-room="bayit_room_den"] .quick-button[data-entity="cover.demo_route_shade"]');
    await otherCover.press('Shift+Enter');
    await shadeDetail.waitFor();
    assert.equal(new URL(page.url()).hash, '#device/bayit_room_den/cover.demo_route_shade');
    await page.keyboard.press('Escape');
    await shadeDetail.waitFor({ state: 'hidden' });
    await washer.press('Shift+Enter');
    assert.equal(await security.count(), 0);
    assert.deepEqual(await commands(), []);

    await cover.tap();
    await page.waitForFunction(() => window.bayitTest.calls.some(call => call.domain === 'cover'));
    assert.deepEqual(await commands(), [{ type: 'call_service', domain: 'cover', service: 'open_cover', service_data: {},
      target: { entity_id: 'cover.demo_route_shade' } }]);
    assert.deepEqual(await page.evaluate(() => window.bayitTest.moreInfoCalls), ['cover.demo_route_shade']);
    await page.evaluate(() => window.bayitTest.setFixtureRegistry('cover.demo_route_shade', { hidden: true }));
    await cover.press('Shift+Enter');
    assert.equal(await native.count(), 0);
    assert.deepEqual(await page.evaluate(() => window.bayitTest.moreInfoCalls), ['cover.demo_route_shade']);
    await page.evaluate(() => window.bayitTest.setFixtureRegistry('cover.demo_route_shade', {}));

    await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
    await page.getByRole('button', { name: 'Customize home', exact: true }).tap();
    const setup = page.getByRole('dialog', { name: 'Customize home', exact: true });
    await setup.getByText('Room shortcuts', { exact: true }).tap();
    await setup.locator('[data-shortcut-room]').selectOption('studio');
    const destination = name => setup.getByLabel('Long-press destination · ' + name, { exact: true });
    const shadePicker = destination('Demo shade');
    assert.equal(await shadePicker.inputValue(), 'native');
    const lockPicker = destination('Demo lock');
    assert.equal(await lockPicker.inputValue(), 'panel:shared-security');
    await lockPicker.selectOption('native');
    await lockPicker.selectOption('panel:shared-security');
    assert.equal(await destination('Room heater').isDisabled(), true);
    assert.deepEqual(await shadePicker.locator('option').evaluateAll(options => options.map(option => option.value)),
      ['', 'native', 'panel:shared-security', 'lock.demo_route_lock', 'switch.demo_heater']);
    await shadePicker.selectOption('panel:shared-security');
    await Promise.all([page.waitForEvent('load'), setup.getByRole('button', { name: 'Save dashboard', exact: true }).tap()]);
    await page.waitForFunction(() => Boolean(window.bayitTest));
    assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem('bayit9-browser-fixture'))
      .strategy.room_overrides.studio.shortcut_detail_routes), {
      'lock.demo_route_lock': 'panel:shared-security',
      'cover.demo_route_shade': 'panel:shared-security',
      'switch.demo_heater': 'panel:shared-security',
    });
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('bayit9-browser-fixture'))
      .strategy.room_overrides.studio.shortcut_detail_entities), undefined);
    await cover.press('Shift+Enter');
    await security.waitFor();
    assert.deepEqual(await commands(), []);
  } finally {
    await page.close();
  }
}

async function assertWideHomeAlignment(browser) {
  const measurements = async page => {
    const room = page.getByRole('article').first();
    return room.evaluate(el => {
      const root = el.getRootNode();
      const grid = el.parentElement;
      const slots = [...root.querySelectorAll('.toolbar-actions > .chrome-button:not([hidden])')];
      const coords = node => {
        const box = node.getBoundingClientRect();
        return [Math.round(box.left), Math.round(box.width)];
      };
      return { rooms:coords(grid), nav:coords(slots[0].parentElement), buttons:slots.map(button => coords(button)[0]) };
    });
  };
  for (const locale of ['en','he']) {
    const page=await browser.newPage({viewport:{width:391,height:846},reducedMotion:'reduce'});
    const url=base+'?room-status&wide-home-profile&locale='+locale;
    const left='&wide-alignment=left';
    try {
      await page.goto(url);
      const phone=await measurements(page);
      await page.goto(url+left);
      assert.deepEqual(await measurements(page),phone,'The optional alignment starts above phone widths');
      for (const [width,inset,span] of [[768,8,430],[1024,16,900]]) {
        await page.setViewportSize({width,height:846});
        const geometry=await measurements(page);
        assert.deepEqual(geometry.rooms,[inset,span]);
        assert.deepEqual(geometry.nav,[inset,span]);
        assert.equal(geometry.buttons.length,6);
        assert.equal(geometry.buttons[0],inset);
        assert.ok(Math.abs(geometry.buttons[5] - inset - (span+8)*5/6)<=1);
      }
      await page.goto(url+'&wide-alignment=unsupported');
      const defaultWide=await measurements(page);
      assert.deepEqual(defaultWide.rooms,[62,900]);
      assert.ok(defaultWide.nav[0]>defaultWide.rooms[0]);
      await page.goto(url+left+'&editor');
      const he=locale==='he';
      await page.getByText(he?'מראה':'Appearance',{exact:true}).click();
      const setting=page.getByRole('checkbox',{name:he?'הצמדת הדשבורד לשמאל במסכים רחבים':'Align dashboard to the left on wide screens',exact:true});
      assert.equal(await setting.isChecked(),true);
      await setting.uncheck();
      assert.equal(await page.evaluate(()=>window.latest.wide_alignment),undefined);
      await setting.check();
      assert.equal(await page.evaluate(()=>window.latest.wide_alignment),'left');
    } finally { await page.close(); }
  }
}

async function assertWideClassicRoomControls(browser) {
  const page = await browser.newPage({ viewport:{ width:768,height:846 }, reducedMotion:'reduce' });
  const cards = page.locator('.room');
  const capture = () => cards.evaluateAll(rooms => rooms.map(room => {
    const bounds = room.getBoundingClientRect();
    const title = room.querySelector('.room-title');
    const titleText = title.querySelector('.room-name');
    const label = document.createRange();
    label.selectNodeContents(titleText);
    const namePieces = [...label.getClientRects()];
    const controls = [...room.querySelectorAll('.quick-button')].map(button => button.getBoundingClientRect());
    const lastEdge = Math.max(...controls.map(box => box.right));
    const lastBottom = Math.max(...controls.map(box => box.bottom));
    return { size:controls.length, top:controls[0].top - bounds.top, bottom:bounds.bottom - lastBottom,
      right:bounds.right - lastEdge, width:controls[0].width, height:controls[0].height,
      step:controls[1] && controls[1].left - controls[0].left, font:getComputedStyle(title).fontSize, name:titleText.innerText,
      nameFits:namePieces.every(piece => piece.left >= bounds.left && piece.right <= bounds.right &&
        piece.top >= bounds.top && piece.bottom <= bounds.bottom && !controls.some(box =>
          piece.left < box.right && piece.right > box.left && piece.top < box.bottom && piece.bottom > box.top)),
    };
  }));
  try {
    for (const locale of ['en','he']) {
      const baseProfile = base + '?locale=' + locale + '&wide-home-profile&home-room-sizing=';
      await page.setViewportSize({width:420,height:846});
      await page.goto(baseProfile + '10');
      const phone = await capture();
      await page.goto(baseProfile + '10&wide-alignment=left');
      assert.deepEqual(await capture(), phone, 'The classic controls stay the same at the phone breakpoint');

      for (const [width, controlHeight, sparseTop, denseTop] of [[768,33,43,31.6],[1024,34,44,131.7]]) {
        await page.setViewportSize({width,height:846});
        await page.goto(baseProfile + '10&wide-alignment=left');
        const classic = await capture();
        assert.equal(classic.length, 10);
        for (const room of classic) {
          const details = JSON.stringify({locale,width,room});
          assert.deepEqual([room.width,room.height,room.font,room.nameFits], [42,controlHeight,'14px',true], details);
          if (room.size >= 2) assert.deepEqual([room.right,room.step], [9,50], details);
          if (room.size >= 5) {
            assert.equal(room.bottom, 8, details);
            assert.ok(Math.abs(room.top - denseTop) <= 1, details);
          } else assert.ok(Math.abs(room.top - sparseTop) <= 1, details);
        }
        await page.goto(baseProfile + '10');
        assert.ok((await capture()).every(room => room.width === 48 && room.font === '17px'));
        await page.goto(baseProfile + '10&header');
        const header = await capture();
        await page.goto(baseProfile + '10&header&wide-alignment=left');
        assert.deepEqual(await capture(), header, 'Wide alignment preserves Header control geometry');
      }

      await page.goto(baseProfile + '3&wide-alignment=left');
      const title = page.locator('.room[data-room="fixture_room_0"] .room-title');
      const longName = locale === 'he' ? 'חדר העבודה והמשחקים בקומה העליונה' : 'Upstairs Office and Guest Bedroom';
      assert.ok((await capture()).some(room => room.name === longName && room.nameFits && room.size === 6));
      await title.focus();
      await page.keyboard.press('Shift+Tab');
      const lastShortcutFocused = await title.evaluate(title => {
        const lastShortcut = [...title.closest('.room').querySelectorAll('.quick-button')].at(-1);
        return title.getRootNode().activeElement === lastShortcut && lastShortcut.matches(':focus-visible') &&
          getComputedStyle(lastShortcut).outlineStyle === 'solid';
      });
      assert.equal(lastShortcutFocused, true);
    }
  } finally {
    await page.close();
  }
}

async function assertClassicRoomTitleLanes(browser) {
  const page = await browser.newPage({ viewport:{width:320,height:800}, hasTouch:true, reducedMotion:'reduce' });
  const cards = page.locator('.room');
  const grid = () => cards.evaluateAll(rooms => {
    const rowWidth = rooms[0].parentElement.clientWidth;
    const gap = Number.parseFloat(getComputedStyle(rooms[0].parentElement).columnGap);
    return { rowWidth, gap, cards:rooms.map(room => {
      const box = room.getBoundingClientRect();
      const title = room.querySelector('.room-name');
      const titleButton = title.closest('.room-title').getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(title);
      const words = [...range.getClientRects()];
      const buttons = [...room.querySelectorAll('.quick-button')].map(button => button.getBoundingClientRect());
      const overlaps = (first, second) => first.left < second.right && first.right > second.left &&
        first.top < second.bottom && first.bottom > second.top;
      return {
        id:room.dataset.room, x:box.x, top:box.top, width:box.width, height:box.height,
        titleHeight:titleButton.height, titleText:title.textContent,
        labelLines:new Set(words.map(word => Math.round(word.top))).size,
        titleContained:words.every(word => word.top >= titleButton.top - 1 && word.bottom <= box.bottom + 1),
        buttonOverlap:words.some(word => buttons.some(button => overlaps(word,button))),
        buttonCount:buttons.length,
      };
    }) };
  });
  try {
    for (const locale of ['en','he']) {
      const source = base + '?locale=' + locale + '&home-room-sizing=';
      for (const width of [320,390]) {
        await page.setViewportSize({ width, height:800 });
        await page.goto(source + '3');
        await cards.nth(2).waitFor();
        const mixed = await grid();
        const long = mixed.cards.find(room => room.id === 'fixture_room_0');
        assert.equal(long.buttonCount,6);
        assert.ok(long.labelLines >= 3 && long.titleHeight > 31, JSON.stringify(long));
        assert.ok(long.titleContained && !long.buttonOverlap, JSON.stringify(long));
        assert.equal(mixed.cards.length,3);
        assert.deepEqual(mixed.cards.map(item=>item.buttonCount).sort(),[1,2,6]);
        assert.ok(mixed.cards.every(item=>Math.abs(item.width * 2 + mixed.gap - mixed.rowWidth) < 2));

        await page.goto(source + '1');
        await cards.first().waitFor();
        const single = await grid();
        assert.equal(single.cards.length,1);
        assert.ok(Math.abs(single.rowWidth - single.cards[0].width) < 1);
        assert.equal(single.cards[0].titleText,locale === 'he' ? 'חדר\nפנאי' : 'Media\nRoom');

        await page.goto(source + '10');
        await cards.nth(9).waitFor();
        const regular = await grid();
        assert.equal(regular.cards.length,10);
        assert.equal(new Set(regular.cards.map(item=>item.x)).size,2);
        assert.equal(new Set(regular.cards.map(item=>item.top)).size,5);
        assert.equal(new Set(regular.cards.map(item=>item.height)).size,1);
        assert.ok(regular.cards.every(item=>item.titleHeight === 31 && !item.buttonOverlap));
        const split = regular.cards.find(room=>room.id === 'fixture_room_0');
        assert.equal(split.labelLines,2);
        assert.equal(split.titleText,locale === 'he' ? 'חדר\nפנאי' : 'Media\nRoom');
      }

      await page.goto(source + '1&header');
      await cards.first().waitFor();
      const singleHeader = await grid();
      assert.ok(Math.abs(singleHeader.rowWidth - singleHeader.cards[0].width) < 1);
      assert.equal(singleHeader.cards[0].labelLines,1);
    }
  } finally {
    await page.close();
  }
}

async function assertHeaderRoomLayout(browser) {
  const page = await browser.newPage({
    viewport: { width: 391, height: 845 }, hasTouch: true, reducedMotion: 'reduce',
  });
  try {
    await page.goto(base + '?room-status&locale=he');
    const room = page.locator('.room[data-room="bayit_room_status"]');
    const title = room.getByRole('button', { name: 'חדר הפנאי', exact: true });
    const shortcuts = room.locator('.quick-button');
    await title.waitFor();
    const geometry = () => room.evaluate(card => ['.room-title', '.room-status-strip', '.quick']
      .map(selector => card.querySelector(selector).getBoundingClientRect())
      .map(({ x, y, width, height }) => [x, y, width, height]));
    const classic = await geometry();
    for (const width of [320, 360, 391, 430]) {
      await page.setViewportSize({ width, height: 845 });
      for (const count of [2, 3, 4, 6]) {
        await page.evaluate(size => window.bayitTest.setRoomLayout('header', size), count);
        const layout = await room.evaluate(card => {
          const rect = selector => card.querySelector(selector).getBoundingClientRect();
          const style = getComputedStyle(card);
          const grid = rect('.quick');
          const label = card.querySelector('.room-name');
          const heading = rect('.room-title');
          const symbol = rect('.room-title > ha-icon:first-child');
          const status = rect('.room-count');
          const shutdown = rect('.room-turn-off > ha-icon');
          const controls = [...card.querySelectorAll('.quick-button')].map(button => {
            const box = button.getBoundingClientRect();
            return { x: box.left + box.width / 2, top: box.top, bottom: box.bottom };
          });
          const rows = [...new Set(controls.map(control => control.top))];
          return {
            headingHeight: parseInt(style.gridTemplateRows),
            headingTargetHeight: heading.height,
            labelAlign: getComputedStyle(label).textAlign,
            labelWrap: getComputedStyle(label).whiteSpace,
            symbolLeftOfCount: symbol.right <= status.left,
            titleAboveSymbol: rect('.room-name').bottom <= symbol.top,
            shutdownDifference: [shutdown.left - symbol.left, shutdown.top - symbol.top],
            statusBottom: rect('.room-status-strip').bottom,
            gridStart: grid.left,
            gridWidth: grid.width,
            gridBottom: grid.bottom,
            cardBottom: card.getBoundingClientRect().bottom,
            controls,
            rows: rows.map(top => controls.filter(control => control.top === top).length),
          };
        });
        const narrow = width <= 360;
        assert.equal(layout.headingHeight, narrow ? 38 : 29);
        assert.ok(layout.headingTargetHeight >= 44);
        assert.equal(layout.labelAlign, narrow ? 'center' : 'right');
        assert.equal(layout.labelWrap, 'nowrap');
        assert.equal(layout.symbolLeftOfCount, true);
        assert.equal(layout.titleAboveSymbol, narrow);
        assert.ok(layout.shutdownDifference.every(delta => Math.abs(delta) <= 2));
        assert.deepEqual(layout.rows, count <= 3 ? [count] : [3, count - 3]);
        assert.ok(layout.gridBottom < layout.cardBottom && layout.cardBottom - layout.gridBottom <= 9);
        assert.ok(layout.controls[0].top >= layout.statusBottom);
        for (const [index, control] of layout.controls.entries()) {
          const middle = layout.gridStart + layout.gridWidth * (index % 3 + .5) / 3;
          assert.ok(Math.abs(control.x - middle) <= 2);
          assert.ok(control.bottom <= layout.gridBottom);
        }
      }
    }
    const close = page.getByRole('dialog').locator('[data-role=close]');
    await title.press('Enter');
    await close.waitFor();
    await close.press('Enter');
    await close.waitFor({ state: 'hidden' });
    assert.equal(await title.evaluate(element => element.getRootNode().activeElement === element), true);
    await shortcuts.first().press('Shift+Enter');
    await close.waitFor();
    await close.press('Enter');
    await close.waitFor({ state: 'hidden' });
    assert.equal(await shortcuts.first().evaluate(element => element.getRootNode().activeElement === element), true);
    await title.tap();
    await close.waitFor();
    assert.equal(await page.evaluate(() => window.bayitTest.calls.length), 0);
    await close.press('Enter');
    await close.waitFor({ state: 'hidden' });
    await room.locator('.quick-button[data-entity="light.demo_side1"]').tap();
    const commands = await page.evaluate(() => window.bayitTest.calls);
    assert.deepEqual(commands.map(call => [call.domain, call.service, call.target.entity_id]), [
      ['light', 'turn_on', 'light.demo_side1'],
    ]);
    await page.setViewportSize({ width: 391, height: 845 });
    await page.evaluate(() => window.bayitTest.setRoomLayout('classic'));
    assert.deepEqual(await geometry(), classic);
  } finally {
    await page.close();
  }
}

async function assertCompactInlineLightLayout(browser) {
  const cases = [
    { locale: 'en', width: 320, brightness: 'Brightness', temperature: 'White temperature' },
    { locale: 'he', width: 391, brightness: 'בהירות', temperature: 'גוון לבן' },
  ];
  for (const { locale, width, brightness, temperature } of cases) {
    const page = await browser.newPage({
      viewport: { width, height: 845 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
    });
    try {
      await page.goto(base + '/fixture-home/home?configuration&inline-room-lights&locale=' + locale);
      await page.getByRole('button', { name: 'Studio', exact: true }).tap();
      const card = page.getByRole('dialog', { name: 'Studio', exact: true }).locator('[data-inline-light]');
      const mode = card.getByRole('button', { name: temperature, exact: true });
      const bright = card.getByRole('slider', { name: brightness, exact: true });
      const white = card.getByRole('slider', { name: temperature, exact: true });
      await mode.waitFor();
      assert.equal(await mode.getAttribute('aria-pressed'), 'false');
      assert.equal(await white.count(), 0);
      assert.equal(await card.locator('output:visible').textContent(), '40%');
      const [slider, toggle, tile] = await Promise.all([bright.boundingBox(), mode.boundingBox(), card.boundingBox()]);
      assert.ok(slider.width >= 44 && slider.height >= 44, JSON.stringify(slider));
      assert.ok(toggle.width >= 44 && toggle.height >= 44, JSON.stringify(toggle));
      assert.ok(slider.x + slider.width <= toggle.x, 'The slider and mode toggle have separate touch targets');
      // The system font metrics vary between browser hosts.
      assert.ok(tile.height >= 108 && tile.height <= 116, JSON.stringify(tile));
      assert.ok(await card.evaluate(el => el.scrollWidth <= el.clientWidth));
      await mode.tap();
      await white.waitFor();
      assert.equal(await mode.getAttribute('aria-pressed'), 'true');
      assert.equal(await bright.count(), 0);
      assert.equal(await card.locator('output:visible').textContent(), '3000 K');
      assert.equal((await card.boundingBox()).height, tile.height);
      assert.deepEqual(await page.evaluate(() => window.bayitTest.calls), []);
    } finally {
      await page.close();
    }
  }
}

async function assertSharedHeaterLevelInterop(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const script = 'script.demo_select_heat_step';
    const helper = 'input_number.demo_heat_step';
    const relay = 'switch.demo_step_power';
    const panel = page.getByRole('dialog',{name:'Fixture step heater',exact:true});
    const choice = number => panel.locator('.heat-level-choice').getByText(String(number),{exact:true});
    const changing = panel.getByText(he ? 'משנה את עוצמת החימום…' : 'Changing heating level…',{exact:true});
    const state = (entity,value) => page.evaluate(([entity,value])=>window.bayitTest.setRoomState(entity,value),[entity,value]);
    const power = current => page.evaluate(current=>window.bayitTest.setHeaterPower(current),current);
    const calls = () => page.evaluate(()=>window.bayitTest.calls.filter(call=>call.type==='call_service'));
    const activeChoice = number => panel.locator('.heat-level-choice[aria-pressed=true]:enabled').getByText(String(number),{exact:true});
    try {
      await page.goto(base + '/?heater-level&preselect&shared-heater-level&locale=' + locale);
      await page.locator('.quick-button[data-entity="fan.demo_step_heater"]').tap();
      await activeChoice(5).waitFor();
      await state(script,'on');
      await changing.waitFor();
      assert.ok(await choice(7).isDisabled());
      await choice(7).evaluate(button=>button.click());
      assert.deepEqual(await calls(),[]);
      await state(helper,'4');
      await state(script,'off');
      await activeChoice(4).waitFor();

      await choice(7).tap();
      await page.waitForFunction(()=>window.bayitTest.calls.length === 1);
      assert.deepEqual(await page.evaluate(()=>window.bayitTest.heatingState()),['off','off','idle']);
      await page.evaluate(()=>window.bayitTest.finishPreselect());
      await activeChoice(7).waitFor();

      await power('on');
      await panel.locator('[data-action=set_heating_level]:enabled').first().waitFor();
      assert.deepEqual(await page.evaluate(()=>window.bayitTest.heatingState()),['on','on','idle']);
      await state(script,'on');
      await changing.waitFor();
      assert.ok(await choice(2).isDisabled());
      await state(helper,'8');
      await state(script,'off');
      await activeChoice(8).waitFor();
      assert.deepEqual(await calls(),[{type:'call_service',domain:'input_number',service:'set_value',
        target:{entity_id:helper},service_data:{value:7}}]);

      await choice(2).tap();
      assert.ok(await choice(2).isDisabled());
      assert.equal(await choice(2).getAttribute('data-changing'),'');
      await page.evaluate(()=>window.bayitTest.finishLevel());
      await activeChoice(2).waitFor();
      await page.evaluate(()=>window.bayitTest.rejectNextLevel());
      await choice(6).tap();
      await panel.getByText(he ? 'הפעולה לא הושלמה.' : 'Could not complete the action.',{exact:true}).waitFor();
      await activeChoice(2).waitFor();

      const blocked = panel.locator('.heat-level-choice:disabled').getByText('6',{exact:true});
      await state(relay,'off');
      await blocked.waitFor();
      await blocked.evaluate(button=>button.click());
      await state(relay,'on');
      await activeChoice(2).waitFor();
      await state(script,'unavailable');
      await blocked.waitFor();
      await blocked.evaluate(button=>button.click());
      assert.deepEqual(await calls(),[
        {type:'call_service',domain:'input_number',service:'set_value',target:{entity_id:helper},service_data:{value:7}},
        ...[2,6].map(target_step=>({type:'call_service',domain:'script',service:'demo_select_heat_step',service_data:{target_step}})),
      ]);
    } finally {
      await page.close();
    }
  }
}

async function assertCompactRoomHeater(browser) {
  for (const [locale, width] of [['en', 320], ['he', 391]]) {
    const page = await browser.newPage({ viewport: { width, height: 845 }, hasTouch: true, reducedMotion: 'reduce' });
    try {
      await page.goto(base + '/?heater-level&preselect&embedded-heater&locale=' + locale);
      await page.getByRole('button', { name: 'Studio', exact: true }).tap();
      const room = page.getByRole('dialog', { name: 'Studio', exact: true });
      const heater = room.locator('.device[data-entity="fan.demo_step_heater"]');
      const range = heater.locator('.device-timer[data-compact] .timer-range');
      const start = heater.locator('.timer-command[data-action="start_timed"]');
      const stop = heater.locator('.timer-command[data-action="stop_timed"]');
      const off = heater.locator('.basic-actions button[data-action="turn_off"]');
      await heater.getByRole('heading', { name: 'Fixture step heater', exact: true, level: 4 }).waitFor();
      await range.waitFor();
      assert.equal(await off.count(), 0);
      const layout = await heater.evaluate(card => {
        const targets = [...card.querySelectorAll('.heat-level-choice')];
        const rows = new Map();
        for (const button of targets) {
          const y = Math.round(button.getBoundingClientRect().y);
          rows.set(y, (rows.get(y) ?? 0) + 1);
        }
        return {
          rows: [...rows.values()],
          accessible: [...targets, ...card.querySelectorAll('.timer-range,.timer-command,.timer-preset')].every(el =>
            el.getBoundingClientRect().width >= 43.9 && el.getBoundingClientRect().height >= 43.9),
          fits: card.scrollWidth <= card.clientWidth + 1,
          height: card.offsetHeight,
          groupHeight: card.parentElement.offsetHeight,
        };
      });
      assert.deepEqual(layout.rows, [5, 4]);
      assert.equal(layout.accessible, true);
      assert.equal(layout.fits, true);
      // The compact card can wrap labels differently in the host's system font.
      assert.ok(layout.height <= 360, JSON.stringify(layout));
      assert.equal(layout.groupHeight, layout.height, 'An untitled single-heater group has one frame');

      await range.press('ArrowLeft');
      assert.equal(await range.inputValue(), '45');
      await page.evaluate(() => window.bayitTest.setRoomState('sensor.demo_step_runtime', '120'));
      await heater.getByText('02:00', { exact: false }).waitFor();
      assert.equal(await range.inputValue(), '45');
      assert.ok(await range.evaluate(input => input.getRootNode().activeElement === input));
      assert.deepEqual(await page.evaluate(() => window.bayitTest.calls), []);

      const choice = heater.locator('button[data-action="preselect_heating_level"]').nth(6);
      await choice.tap();
      await page.waitForFunction(() => window.bayitTest.calls.length === 1);
      assert.deepEqual(await page.evaluate(() => window.bayitTest.heatingState()), ['off', 'off', 'idle']);
      await page.evaluate(() => window.bayitTest.finishPreselect());
      await heater.locator('button[data-action="preselect_heating_level"][aria-pressed="true"]:not(:disabled)')
        .getByText('7', { exact: true }).waitFor();

      await page.evaluate(() => window.bayitTest.setHeaterPower('on'));
      await off.waitFor();
      await page.evaluate(() => window.bayitTest.setHeaterPower('off'));
      await off.waitFor({ state: 'detached' });
      await start.press('Enter');
      await stop.waitFor();
      assert.equal(await off.count(), 0);
      assert.equal(await heater.locator('button[data-action="set_heating_level"][aria-pressed="true"]').textContent(), '3');
      await stop.tap();
      await start.waitFor();
      assert.equal(await off.count(), 0);
      assert.deepEqual(await page.evaluate(() => window.bayitTest.calls), [
        { type: 'call_service', domain: 'input_number', service: 'set_value',
          target: { entity_id: 'input_number.demo_next_step' }, service_data: { value: 7 } },
        { type: 'call_service', domain: 'simple_timer', service: 'start_timer',
          service_data: { entity_id: 'sensor.demo_step_runtime', duration: 45, unit: 'min', reverse_mode: false } },
        { type: 'call_service', domain: 'simple_timer', service: 'cancel_timer',
          service_data: { entity_id: 'sensor.demo_step_runtime', turn_off_entity: true } },
      ]);
      await page.evaluate(() => window.bayitTest.repointTimer());
      await off.waitFor();
      assert.equal(await start.count(), 0);
      assert.equal(await heater.locator('.heat-level-choice[aria-pressed="true"]').isDisabled(), true);
    } finally {
      await page.close();
    }
  }
}

async function assertRoomTemperatureCharts(browser) {
  for (const locale of ['en', 'he']) {
    const he = locale === 'he';
    const page = await browser.newPage({ viewport:{ width:320, height:844 }, hasTouch:true, reducedMotion:'reduce' });
    page.setDefaultTimeout(8000);
    const url = base + '?room-status&locale=' + locale;
    const route = '#room-bayit_room_status';
    const compact = '&room-temperature-chart';
    const dialog = page.getByRole('dialog', { name:he ? 'חדר הפנאי' : 'Family room', exact:true });
    try {
      await page.goto(url + route);
      await dialog.locator('.native-panel-card [data-entity="sensor.demo_temperature"]').waitFor();
      assert.equal(await dialog.locator('.room-temperature-chart').count(),0);
      await page.goto(url + compact + route);
      const chart = dialog.locator('.room-temperature-chart');
      const value = chart.locator('.room-temperature-value');
      await chart.locator('path.room-temperature-line').first().waitFor();
      assert.equal(await chart.locator('path.room-temperature-line').count(),2,'Unknown history must split the line');
      assert.equal(await value.textContent(),'23.5');
      assert.equal(await chart.locator('.room-temperature-unit').textContent(),'°C');
      assert.equal(await chart.evaluate(el=>el.style.getPropertyValue('--room-chart-color')),'#9AC8FF');
      await chart.press('Enter');
      assert.deepEqual(await page.evaluate(()=>window.bayitTest.moreInfoCalls),['sensor.demo_temperature']);
      await page.evaluate(()=>window.bayitTest.setRoomState('sensor.demo_temperature','unavailable'));
      await chart.getByText('—',{ exact:true }).waitFor();
      assert.equal(await chart.locator('.room-temperature-unit').textContent(),'');
      const calls = await page.evaluate(()=>window.bayitTest.calls);
      const histories = calls.filter(call=>call.type==='history/history_during_period');
      assert.equal(histories.length,1);
      assert.deepEqual(histories[0].entity_ids,['sensor.demo_temperature']);
      assert.equal(Date.parse(histories[0].end_time)-Date.parse(histories[0].start_time),24.5*3600000);
      assert.equal(calls.filter(call=>call.domain).length,0);

      await page.goto(url + compact + '&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{ exact:true }).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{ exact:true }).selectOption('bayit_room_status');
      await page.getByText(he ? 'תצוגת מכשירים' : 'Device display',{ exact:true }).tap();
      await page.getByLabel(he ? 'מכשיר להתאמה אישית' : 'Device to customize',{ exact:true }).selectOption('sensor.demo_temperature');
      const option = page.getByRole('checkbox',{ name:he ? 'גרף טמפרטורה קומפקטי' : 'Compact temperature graph', exact:true });
      assert.equal(await option.isChecked(),true);
      const readMap = () => page.evaluate(()=>window.latest.room_overrides.bayit_room_status.room_temperature_graph_colors);
      await option.uncheck();
      assert.equal(await readMap(),undefined);
      await option.check();
      assert.deepEqual(await readMap(),{'sensor.demo_temperature':'#7AA7FF'});
      const color = page.getByLabel(he ? 'צבע קו הגרף' : 'Graph line color',{ exact:true });
      await color.fill('#5faaff');
      await color.dispatchEvent('change');
      assert.deepEqual(await readMap(),{'sensor.demo_temperature':'#5FAAFF'});
    } finally {
      await page.close();
    }
  }
}

async function assertCompactWeatherReadings(browser) {
  for (const locale of ['en', 'he']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    page.setDefaultTimeout(8000);
    const url = base + '/fixture-home/home?toolbar-panels&weather-readings&locale=' + locale;
    const weather = locale === 'he' ? 'מזג אוויר' : 'Weather';
    const dialog = page.getByRole('dialog', { name: weather, exact: true });
    try {
      await page.goto(url + '&weather-readings-list');
      await page.getByRole('button', { name: weather, exact: true }).tap();
      await dialog.locator('[data-native-type=weather-forecast]').waitFor();
      await dialog.locator('[data-section=sun]').waitFor({ state: 'attached' });
      const section = dialog.locator('[data-layout=readings-list]');
      const rows = section.locator('.weather-reading');
      const temperature = rows.filter({ hasText: 'Outside temperature' });
      const rain = rows.filter({ hasText: 'Rain status' });
      const current = temperature.locator('.tile-state');
      await current.getByText(/24.5 °C/).waitFor();
      assert.equal(await rows.count(), 2);
      assert.equal(await temperature.locator('ha-icon').getAttribute('icon'), 'mdi:thermometer');
      assert.equal(await section.locator('[data-native-type=sensor][data-graph-hours="24"]').getAttribute('data-tap-action'), 'more-info');
      assert.equal(await rows.locator('button, a, [role=button], [tabindex]').count(), 0);
      assert.ok(await section.evaluate(node => {
        const items = node.querySelector('.toolbar-section-items');
        const [first, second] = [...items.querySelectorAll('.weather-reading')].map(row => row.getBoundingClientRect());
        const firstRow = items.firstElementChild;
        const [icon, label, value] = [...firstRow.children].map(el => el.getBoundingClientRect());
        const rtl = getComputedStyle(firstRow).direction === 'rtl';
        return items.scrollWidth <= items.clientWidth && first.width === second.width &&
          first.height < 56 && Math.abs(first.bottom - second.top) < 1 &&
          (rtl ? icon.left > label.left && label.left > value.left : icon.left < label.left && label.left < value.left);
      }));
      await temperature.tap();
      await rain.tap();
      assert.deepEqual(await page.evaluate(() => ({ details: window.bayitTest.moreInfoCalls, calls: window.bayitTest.calls })),
        { details: [], calls: [] });
      const updateTemperature = state => page.evaluate(value =>
        window.bayitTest.setRoomState('sensor.demo_outdoor_temperature', value), state);
      await updateTemperature('25.7');
      await current.getByText(/25.7 °C/).waitFor();
      await updateTemperature('unknown');
      await current.getByText(locale === 'he' ? 'מצב לא ידוע' : 'Unknown state').waitFor();
      await updateTemperature('unavailable');
      await current.getByText(locale === 'he' ? 'לא זמין' : 'Unavailable').waitFor();
      if (locale === 'he') continue;

      await page.goto(url);
      await page.getByRole('button', { name: weather, exact: true }).tap();
      await dialog.getByRole('button', { name: /^Outside temperature/ }).waitFor();
      assert.equal(await dialog.locator('.weather-reading').count(), 0);

      await page.goto(url + '&weather-readings-list&editor');
      await page.getByText('Toolbar and extra screens', { exact: true }).tap();
      await page.getByRole('button', { name: weather, exact: true }).tap();
      await page.getByRole('button', { name: 'Outside conditions', exact: true }).tap();
      const toggle = page.getByRole('checkbox', { name: 'Show readings as a compact read-only list' });
      const currentLayout = () => page.evaluate(() => window.latest.toolbar.find(item => item.kind === 'weather')
        .sections.find(section => section.id === 'outside-readings').layout);
      assert.equal(await toggle.isChecked(), true);
      await toggle.uncheck();
      assert.equal(await currentLayout(), undefined);
      await toggle.check();
      assert.equal(await currentLayout(), 'readings-list');
    } finally {
      await page.close();
    }
  }
}

async function assertToolbarLockPalette(browser) {
  const page = await browser.newPage({ viewport: { width: 360, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  page.setDefaultTimeout(8000);
  try {
    await page.goto(base + '/fixture-home/home?configuration&lock-status-palette');
    const lock = page.locator('.quick-button[data-entity="lock.fixture_entry"]');
    const setState = state => page.evaluate(async value => {
      window.bayitTest.setRoomState('lock.fixture_entry', value);
      await new Promise(requestAnimationFrame);
    }, state);
    await setState('unlocked');
    assert.equal(await lock.getAttribute('data-tone'), 'critical');
    assert.equal(await lock.getAttribute('data-lock-state'), null);

    for (const [name, stateNode, glyphSelector] of [
      ['Fixture overview', '.compact-status-lock .tile-row', '.tile-mark > ha-icon'],
      ['Fixture security', '.toolbar-device', '.device-icon'],
      ['Fixture entrance', '.tile-row', '.tile-mark > ha-icon'],
    ]) {
      if (name === 'Fixture entrance') await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
      await page.getByRole('button', { name, exact: true }).tap();
      const panel = page.getByRole('dialog', { name, exact: true });
      const row = panel.locator(stateNode);
      const glyph = row.locator(glyphSelector);
      const colorOnInk = ink => glyph.evaluate((icon, value) => {
        icon.closest('.modal').dataset.wallpaperInk = value;
        return getComputedStyle(icon).color;
      }, ink);
      for (const [state, color] of [
        ['locked', 'rgb(96, 165, 250)'], ['unlocked', 'rgb(239, 68, 68)'],
        ['locking', 'rgb(251, 191, 36)'], ['unlocking', 'rgb(251, 191, 36)'],
      ]) {
        await setState(state);
        assert.equal(await row.getAttribute('data-lock-state'), state);
        assert.equal(await colorOnInk('light'), color);
      }
      for (const state of ['unknown', 'unavailable', 'jammed']) {
        await setState(state);
        assert.equal(await row.getAttribute('data-lock-state'), null);
      }
      await setState('locked');
      assert.equal(await colorOnInk('dark'), 'rgb(0, 63, 104)');
      await panel.getByRole('button', { name: 'Close', exact: true }).tap();
      await panel.waitFor({ state: 'hidden' });
    }

    await page.getByRole('button', { name: 'Fixture actions', exact: true }).tap();
    const actions = page.getByRole('dialog', { name: 'Fixture actions', exact: true });
    const action = actions.locator('.tile-row');
    for (const contrast of ['no-preference', 'more']) {
      await page.emulateMedia({ contrast });
      let neutral;
      for (const state of ['locked', 'unlocking', 'unlocked', 'unavailable', 'locked']) {
        await setState(state);
        assert.equal(await action.getAttribute('data-lock-state'), null);
        assert.equal(await action.getAttribute('data-automation-unlocked') !== null, state === 'unlocked');
        const colors = await action.evaluate(tile => {
          tile.closest('.modal').dataset.wallpaperInk = 'light';
          const style = getComputedStyle(tile);
          return [style.backgroundColor, style.borderTopColor, getComputedStyle(tile.querySelector('ha-icon')).color];
        });
        if (state === 'unlocked') {
          assert.deepEqual(colors, ['rgba(255, 133, 133, 0.22)', 'rgba(255, 133, 133, 0.38)', 'rgb(255, 133, 133)']);
        } else {
          neutral ??= colors;
          assert.deepEqual(colors, neutral);
        }
      }
    }
    await setState('unlocked');
    await action.tap();
    const confirm = page.getByRole('dialog', { name:'Confirm action', exact:true });
    await confirm.getByRole('button', { name:'Cancel', exact:true }).tap();
    assert.deepEqual(await page.evaluate(() => window.bayitTest.calls.filter(call => call.domain)), []);
  } finally {
    await page.close();
  }
}

async function assertPopupAliasEditing(browser) {
  const initialAliases = Object.fromEntries(Array.from({ length:32 }, (_, index) => ['#legacy-' + index, '#room-studio']));
  Object.assign(initialAliases, { '#legacy-unavailable':'#room-old-room', '#legacy-invalid':'https://example.test/elsewhere' });
  const wordsByLocale = {
    en:{ appearance:'Appearance', setup:'Customize home', toolbar:'Toolbar and extra screens', links:'Popup links',
      entry:'Link to edit', fragment:'Old link fragment', target:'Popup destination', add:'Add link', update:'Update link',
      remove:'Remove link', save:'Save dashboard', invalid:'Enter only the fragment', conflict:'This fragment already opens',
      unavailable:'Destination unavailable' },
    he:{ appearance:'מראה', setup:'התאמת הבית', toolbar:'סרגל ומסכים נוספים', links:'קישורים לחלוניות',
      entry:'קישור לעריכה', fragment:'מקטע הקישור הישן', target:'יעד הקישור', add:'הוספת קישור', update:'עדכון הקישור',
      remove:'הסרת הקישור', save:'שמירת הדשבורד', invalid:'יש להזין רק את המקטע', conflict:'המקטע הזה כבר פותח',
      unavailable:'היעד אינו זמין' },
  };
  for (const [locale, words] of Object.entries(wordsByLocale)) {
    const page = await browser.newPage({ viewport:{ width:320, height:660 }, hasTouch:true, reducedMotion:'reduce' });
    page.setDefaultTimeout(10000);
    try {
      const url = base + '/fixture-home/home?configuration&locale=' + locale;
      await page.addInitScript(aliases => {
        const key = 'bayit9-browser-fixture';
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, JSON.stringify({ strategy:{ type:'custom:bayit-9', popup_aliases:aliases,
          hidden_entities:['switch.demo_heater'], toolbar:[
            { id:'settings', kind:'settings' },
            { id:'fixture-media', kind:'media', placement:'settings', label:'Fixture media' },
            { id:'external', kind:'link', path:'/other-dashboard/home' },
          ],
        } }));
      }, initialAliases);
      const openLinks = async () => {
        await page.getByRole('button', { name:words.appearance, exact:true }).tap();
        await page.getByRole('button', { name:words.setup, exact:true }).tap();
        const setup = page.getByRole('dialog', { name:words.setup, exact:true });
        await setup.getByText(words.toolbar, { exact:true }).tap();
        await setup.getByText(words.links, { exact:true }).tap();
        return setup;
      };
      const stored = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.popup_aliases);
      await page.goto(url);
      const setup = await openLinks();
      const entry = setup.getByLabel(words.entry, { exact:true });
      const fragment = setup.getByLabel(words.fragment, { exact:true });
      const target = setup.getByLabel(words.target, { exact:true });
      const add = setup.getByRole('button', { name:words.add, exact:true });
      const edit = setup.getByRole('button', { name:words.update, exact:true });
      const destinations = () => target.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
      const allowed = await destinations();
      for (const value of ['#room-studio', '#device/studio/light.demo_lamp', '#panel/fixture-media']) assert.ok(allowed.includes(value));
      assert.ok(!allowed.includes('#panel/external') && !allowed.includes('#device/studio/switch.demo_heater'));
      await entry.selectOption('#legacy-unavailable');
      assert.equal(await target.inputValue(), '#room-old-room');
      assert.match(await target.locator('option:checked').textContent(), new RegExp(words.unavailable));
      await entry.selectOption('');
      await target.selectOption('#room-studio');
      await fragment.fill('https://example.test/#old-room');
      await add.tap();
      await setup.getByRole('status').filter({ hasText:words.invalid }).waitFor();
      for (const invalid of ['#legacy-0', '#room-studio']) {
        await fragment.fill(invalid);
        await add.tap();
        await setup.getByRole('status').filter({ hasText:words.conflict }).waitFor();
      }
      const addAlias = async (alias, destination) => {
        await entry.selectOption('');
        await fragment.fill(alias);
        await target.selectOption(destination);
        await add.tap();
        assert.equal(await entry.inputValue(), alias);
      };
      await addAlias('#fixture-room', '#room-studio');
      await fragment.fill('#fixture-room-renamed');
      await edit.tap();
      await addAlias('#fixture-light', '#device/studio/light.demo_lamp');
      await addAlias('#fixture-screen', '#panel/fixture-media');
      await addAlias('#fixture-remove', '#room-studio');
      await setup.getByRole('button', { name:words.remove, exact:true }).tap();
      assert.deepEqual(await stored(), initialAliases);
      await setup.getByRole('button', { name:words.save, exact:true }).tap();
      await setup.waitFor({ state:'hidden' });
      assert.deepEqual(await stored(), { ...initialAliases, '#fixture-room-renamed':'#room-studio',
        '#fixture-light':'#device/studio/light.demo_lamp', '#fixture-screen':'#panel/fixture-media' });
      await page.reload();
      const savedSetup = await openLinks();
      assert.ok(await savedSetup.getByLabel(words.entry, { exact:true }).locator('option[value="#fixture-light"]').count());
      for (const [hash, title] of [['#fixture-room-renamed','Studio'], ['#fixture-light','Desk lamp'], ['#fixture-screen','Fixture media']]) {
        await page.goto(url + hash);
        await page.getByRole('dialog', { name:title, exact:true }).waitFor();
        assert.equal(await page.evaluate(() => window.bayitTest.calls.filter(call => call.type === 'call_service').length), 0);
      }
    } finally {
      await page.close();
    }
  }
}

async function assertWeatherSurvivesRegistryReplay(browser) {
  const page = await browser.newPage({ viewport:{ width:392, height:846 }, hasTouch:true });
  try {
    await page.goto(base + '/fixture-home/home?toolbar-panels&locale=en', { waitUntil:'commit' });
    const weather = page.getByRole('button', { name:'Weather', exact:true });
    const button = await weather.boundingBox();
    await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
    await page.mouse.down();
    const stable = await page.evaluate(() => {
      const card = document.querySelector('bayit-dashboard');
      const { _hass:hass } = card;
      const regenerated = window.bayitTest.reviseStrategy({ areas:structuredClone(hass.areas),
        entities:structuredClone(hass.entities), devices:structuredClone(hass.devices) });
      return { regenerated, retained:card.isConnected };
    });
    await page.mouse.up();
    assert.deepEqual(stable, { regenerated:false, retained:true });
    const dialog = page.getByRole('dialog', { name:'Weather', exact:true });
    await dialog.waitFor();
    const popupHash = new URL(page.url()).hash;
    assert.match(popupHash, /^#panel\//);

    const renamed = await page.evaluate(() => {
      const card = document.querySelector('bayit-dashboard');
      const { _hass:hass } = card;
      const regenerated = window.bayitTest.reviseStrategy({ areas:{ ...hass.areas,
        studio:{ ...hass.areas.studio, name:'Revised studio' } } });
      return { regenerated, retained:card.isConnected };
    });
    assert.deepEqual(renamed, { regenerated:true, retained:false });
    await dialog.waitFor();
    assert.equal(new URL(page.url()).hash, popupHash);
    await dialog.getByRole('button', { name:'Close', exact:true }).click();
    await dialog.waitFor({ state:'hidden' });
    await page.getByRole('button', { name:'Revised studio', exact:true }).waitFor();

    const changed = await page.evaluate(() => {
      const card = () => document.querySelector('bayit-dashboard');
      const entity = 'light.demo_lamp';
      const original = card();
      const hadDevice = original.config.rooms.some(room => room.entities.some(item => item.entity === entity));
      const hidden = window.bayitTest.reviseStrategy({ entities:{ ...original._hass.entities,
        [entity]:{ ...original._hass.entities[entity], hidden:true } } });
      const retainsDevice = card().config.rooms.some(room => room.entities.some(item => item.entity === entity));
      const states = { ...card()._hass.states };
      delete states['switch.demo_heater'];
      const stateOnly = window.bayitTest.reviseStrategy({ states });
      const registryAfterState = window.bayitTest.reviseStrategy({ devices:{ ...card()._hass.devices } });
      const saved = window.bayitTest.reviseStrategy({}, { title:'Revised dashboard' });
      const Strategy = customElements.get('ll-strategy-dashboard-bayit-9');
      const hass = card()._hass;
      const legacy = Strategy.shouldRegenerate({ type:'custom:bayit-9', options:{ area_ids:['studio'] } },
        hass, { ...hass, areas:{ ...hass.areas } });
      return { hadDevice, hidden, retainsDevice, stateOnly, registryAfterState, legacy, saved, title:card().config.title,
        serviceCalls:window.bayitTest.calls.filter(call => call.type === 'call_service').length };
    });
    assert.deepEqual(changed, { hadDevice:true, hidden:true, retainsDevice:false, stateOnly:false,
      registryAfterState:true, legacy:true, saved:true, title:'Revised dashboard', serviceCalls:0 });
  } finally {
    await page.close();
  }
}

async function assertToolbarPressAcrossReplacement(browser) {
  const page = await browser.newPage({ viewport:{width:392,height:846}, reducedMotion:'reduce' });
  const url = base + '/fixture-home/home?configuration&locale=en';
  const toolbar = [{ id:'weather', kind:'weather', entities:['weather.demo_home'] }, { id:'settings', kind:'settings' },
    { id:'fixture-guide', kind:'link', label:'Fixture guide', path:'/different-dashboard/home' }];
  const weather = page.getByRole('button',{ name:'Weather', exact:true });
  const dialog = page.getByRole('dialog',{ name:'Weather', exact:true });
  try {
    await page.addInitScript(toolbar => {
      sessionStorage.setItem('bayit9-browser-fixture', JSON.stringify({ strategy:{ type:'custom:bayit-9', toolbar } }));
      window.fixturePopupOpens = 0;
      window.addEventListener('location-changed', event => {
        if (event.detail?.source === 'bayit9-popup') ++window.fixturePopupOpens;
      });
      window.addEventListener('pointerdown', event => {
        if (event.isTrusted) window.fixtureTrustedPointer = event.pointerId;
      }, true);
    }, toolbar);
    const press = async (target = weather) => {
      await page.goto(url);
      const rect = await target.boundingBox();
      const point = {x:rect.x + rect.width/2, y:rect.y + rect.height/2};
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      return point;
    };
    const replace = override => page.evaluate(override => {
      const existing = document.querySelector('bayit-dashboard');
      const { areas } = existing._hass;
      const changed = { ...areas, studio:{ ...areas.studio, name:'Studio after registry update' } };
      return window.bayitTest.reviseStrategy({ areas:changed },override) && !existing.isConnected;
    }, override);
    const assertOpen = async () => {
      await dialog.waitFor();
      assert.equal(new URL(page.url()).hash, '#panel/weather');
      assert.equal(await page.evaluate(() => window.fixturePopupOpens), 1);
    };
    const assertClosed = async ({urlChanged = false} = {}) => {
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 60)));
      const { pathname, hash } = new URL(page.url());
      assert.equal(pathname, new URL(url).pathname);
      assert.equal(hash, '');
      if (!urlChanged) assert.equal(page.url(), url);
      assert.deepEqual(await page.evaluate(() => ({
        open:document.querySelector('bayit-dashboard').nodes.modal.open,
        routed:window.fixturePopupOpens, calls:window.bayitTest.calls.filter(call => call.type === 'call_service'),
      })), { open:false, routed:0, calls:[] });
    };

    await press();
    assert.ok(await replace());
    await page.mouse.up();
    await assertOpen();

    for (const method of ['click','keyboard']) {
      await page.goto(url);
      if (method === 'click') await weather.click();
      else await weather.press('Enter');
      await assertOpen();
    }

    let point = await press();
    assert.ok(await replace());
    await page.mouse.move(point.x+14, point.y);
    await page.mouse.move(point.x, point.y);
    await page.mouse.up();
    await assertClosed();

    point = await press();
    assert.ok(await replace({ toolbar:[{...toolbar[0],kind:'settings',label:'Different popup'},...toolbar.slice(1)] }));
    const other = await page.getByRole('button',{name:'Different popup',exact:true}).boundingBox();
    assert.ok(point.x > other.x && point.x < other.x + other.width && point.y > other.y && point.y < other.y + other.height);
    await page.mouse.up();
    await assertClosed();

    point = await press();
    assert.ok(await replace());
    await weather.evaluate((element,point) => element.dispatchEvent(new PointerEvent('pointerup', {
      pointerId:window.fixtureTrustedPointer, pointerType:'mouse', isPrimary:true, button:0, bubbles:true, composed:true,
      clientX:point.x, clientY:point.y,
    })), point);
    await page.mouse.move(point.x, point.y+150);
    await page.mouse.up();
    await assertClosed();

    await press();
    assert.ok(await replace());
    await page.evaluate(() => history.replaceState(history.state,'',location.href + '&changed-view'));
    await page.mouse.up();
    await assertClosed({urlChanged:true});

    for (const target of [page.getByRole('button',{name:'Fixture guide',exact:true}),
      page.locator('.quick-button[data-entity="light.demo_lamp"]')]) {
      await press(target);
      assert.ok(await replace());
      await page.mouse.up();
      await assertClosed();
    }
  } finally {
    await page.close();
  }
}

async function assertReportedCoverMotion(browser) {
  const page = await browser.newPage({ viewport:{width:320,height:720}, hasTouch:true, reducedMotion:'reduce' });
  try {
    const surfaces = [
      ['configuration&cover-grid&cover-feedback','Studio','cover.demo_shade'],
      ['toolbar-panels&security-cover-rail','Security','cover.demo_security_first'],
    ];
    const statusFor = { open:'Open', opening:'Opening', closing:'Closing', closed:'Closed',
      unavailable:'Unavailable', unknown:'Unavailable' };
    for (const [query, title, entity] of surfaces) {
      await page.emulateMedia({ contrast:'no-preference', forcedColors:'none' });
      await page.goto(base + '/fixture-home/home?' + query + '&locale=en');
      await page.getByRole('button', {name:title,exact:true}).tap();
      const tile = page.getByRole('dialog',{name:title,exact:true}).locator('.device[data-entity="' + entity + '"]');
      const current = tile.locator('.current');
      const measure = () => tile.evaluate(tile => {
        const rim = getComputedStyle(tile);
        const caption = getComputedStyle(tile.querySelector('.current'));
        const bounds = tile.getBoundingClientRect();
        return { outline:rim.outlineStyle, width:rim.outlineWidth, color:rim.outlineColor, offset:rim.outlineOffset,
          ink:caption.color, animation:rim.animationName, box:[tile.offsetWidth,tile.offsetHeight],
          fits:bounds.left >= 0 && bounds.right <= innerWidth + 1 };
      });
      const update = async (state, position) => {
        await page.evaluate(({entity,state,position}) => {
          window.bayitTest.setFixtureAttributes(entity,{ current_position:position });
          window.bayitTest.setRoomState(entity,state);
        }, {entity,state,position});
        await current.filter({hasText:new RegExp('^' + statusFor[state] + '($| ·)')}).waitFor();
      };
      await update('open', 43);
      const idle = await measure();
      assert.equal(idle.ink, 'rgb(158, 220, 255)');
      assert.equal(idle.outline, 'none');
      assert.equal(idle.fits, true);
      if (title === 'Studio') {
        await tile.locator('button[data-action=open]').tap();
        await current.filter({hasText:'Opening requested'}).waitFor();
        assert.equal((await measure()).outline, 'none', 'A command alone does not signal confirmed movement');
      }
      for (const [state, position] of [['opening',55],['closing',31]]) {
        await update(state, position);
        assert.match(await current.innerText(), new RegExp(position + '%'));
        const moving = await measure();
        assert.deepEqual(moving, {outline:'solid',width:'1px',color:'rgba(244, 201, 93, 0.72)',offset:'-1px',
          ink:'rgb(255, 223, 146)',animation:'none',box:idle.box,fits:true});
      }
      await page.emulateMedia({ contrast:'more' });
      if (await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches)) {
        const enhanced = await measure();
        assert.deepEqual([enhanced.width, enhanced.color, enhanced.offset], ['2px','rgb(255, 223, 146)','-2px']);
      }
      await page.emulateMedia({ contrast:'no-preference', forcedColors:'active' });
      if (await page.evaluate(() => matchMedia('(forced-colors: active)').matches)) {
        const forced = await measure();
        const systemInk = await tile.evaluate(tile => {
          const probe = document.createElement('span');
          probe.style.outline = '1px solid CanvasText';
          tile.append(probe);
          const value = getComputedStyle(probe).outlineColor;
          probe.remove();
          return value;
        });
        assert.deepEqual([forced.outline, forced.color], ['solid',systemInk]);
      }
      await page.emulateMedia({ forcedColors:'none' });
      if (title === 'Studio') await page.evaluate(() => window.bayitTest.finishCover(0, true));
      for (const [state, position] of [['closed',0],['unavailable',31],['unknown',31]]) {
        await update(state, position);
        assert.equal((await measure()).outline, 'none');
      }
      const sent = await page.evaluate(() => window.bayitTest.calls.filter(call => call.type === 'call_service').map(call => call.service));
      assert.deepEqual(sent, title === 'Studio' ? ['open_cover'] : []);
    }
  } finally {
    await page.close();
  }
}

async function assertRoomMirrorPlacement(browser) {
  const rooms = [
    { locale:'en', id:'bayit_room_1', name:'Reading nook', appearance:'Appearance', setup:'Customize home', rooms:'Rooms',
      create:'New dashboard-only room', newName:'New room name', addRoom:'Create room',
      picker:'Available devices', add:'Add device', keep:'Keep in the automatic room too', save:'Save dashboard',
      moveHint:'After saving, the device will move from Lounge to this room on the dashboard.',
      keepHint:'After saving, the device will also appear here and stay in Lounge.' },
    { locale:'he', id:'bayit_room_shared_fixture', name:'פינת עבודה', appearance:'מראה', setup:'התאמת הבית', rooms:'חדרים',
      room:'חדר להתאמה אישית', picker:'מכשירים זמינים', add:'הוספת מכשיר', keep:'להשאיר גם בחדר האוטומטי', save:'שמירת הדשבורד',
      moveHint:'לאחר השמירה המכשיר יעבור בדשבורד מחדר Lounge לחדר הזה.',
      keepHint:'לאחר השמירה המכשיר יישאר ב־Lounge ויופיע גם בחדר הזה.' },
  ];
  for (const words of rooms) {
    const page = await browser.newPage({ viewport:{ width:320, height:844 }, hasTouch:true, reducedMotion:'reduce' });
    page.setDefaultTimeout(10000);
    try {
      if (!words.create) await page.addInitScript(({ id, name }) => {
        const key = 'bayit9-browser-fixture';
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, JSON.stringify({ strategy:{ type:'custom:bayit-9', show_unassigned:false,
          room_overrides:{ [id]:{ name, entities:['switch.demo_heater'] } },
        } }));
      }, words);
      const entity = 'light.demo_lounge';
      await page.goto(base + '/fixture-home/home?configuration&room-selection&locale=' + words.locale);
      const shortcut = room => page.locator('.room[data-room="' + room + '"] .quick-button[data-entity="' + entity + '"]');
      const original = shortcut('lounge');
      const mirrored = shortcut(words.id);
      await original.waitFor();
      const readRegistry = () => page.locator('bayit-dashboard').evaluate(card => {
        const { areas, devices, entities } = card._hass;
        return { areas, devices, entities };
      });
      const registryBefore = await readRegistry();
      assert.equal(registryBefore.entities[entity].area_id, 'lounge');
      await page.getByRole('button', { name:words.appearance, exact:true }).tap();
      await page.getByRole('button', { name:words.setup, exact:true }).tap();
      const setup = page.getByRole('dialog', { name:words.setup, exact:true });
      await setup.getByText(words.rooms, { exact:true }).tap();
      if (words.create) {
        await setup.getByText(words.create, { exact:true }).tap();
        await setup.getByLabel(words.newName, { exact:true }).fill(words.name);
        await setup.getByRole('button', { name:words.addRoom, exact:true }).tap();
      } else await setup.getByLabel(words.room, { exact:true }).selectOption(words.id);
      const picker = setup.getByLabel(words.picker, { exact:true });
      const keep = setup.getByRole('checkbox', { name:words.keep, exact:true });
      assert.equal(await keep.isVisible(), false);
      await picker.selectOption(entity);
      await setup.getByText(words.moveHint).waitFor();
      assert.equal(await keep.isChecked(), false);
      await keep.check();
      await setup.getByText(words.keepHint, { exact:true }).waitFor();
      await picker.selectOption('');
      assert.equal(await keep.isVisible(), false);
      await picker.selectOption(entity);
      assert.equal(await keep.isChecked(), false);
      await keep.check();
      await setup.getByRole('button', { name:words.add, exact:true }).tap();
      assert.equal(await original.count(), 1);
      assert.equal(await mirrored.count(), 0);
      await setup.getByRole('button', { name:words.save, exact:true }).tap();
      await setup.waitFor({ state:'hidden' });
      await original.waitFor();
      await mirrored.waitFor();
      const saved = await page.evaluate(id => JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.room_overrides[id], words.id);
      assert.deepEqual(saved.entities, words.create ? [entity] : ['switch.demo_heater', entity]);
      assert.deepEqual(saved.keep_in_automatic_room_entities, [entity]);
      assert.deepEqual(await readRegistry(), registryBefore);
      assert.equal(await page.evaluate(() => window.bayitTest.calls.filter(call => call.type === 'call_service' ||
        /^config\/(area|device|entity)_registry\//.test(call.type)).length), 0);
      await page.reload();
      await original.waitFor();
      await mirrored.waitFor();
      assert.deepEqual(await readRegistry(), registryBefore);
    } finally {
      await page.close();
    }
  }
}

async function assertCompactAutomationActions(browser) {
  const page = await browser.newPage({ viewport:{ width:320, height:700 }, hasTouch:true, reducedMotion:'reduce' });
  page.setDefaultTimeout(8000);
  try {
    const url = base + '/fixture-home/home?configuration&lock-status-palette';
    const panel = page.getByRole('dialog', { name:'Fixture actions', exact:true });
    const openActions = () => page.getByRole('button', { name:'Fixture actions', exact:true }).tap();
    await page.goto(url);
    await openActions();
    assert.ok((await panel.locator('.tile-row').boundingBox()).height >= 80);
    assert.equal(await panel.locator('[data-section=actions]').evaluate(section => getComputedStyle(section).paddingInlineStart), '8px');
    await panel.getByRole('button', { name:'Close', exact:true }).tap();
    await panel.waitFor({ state:'hidden' });

    for (const locale of ['en', 'he']) {
      await page.goto(url + '&automation-compact&locale=' + locale);
      await openActions();
      const section = panel.locator('[data-layout=compact-actions]');
      const buttons = section.locator('.tile-row:not([hidden])');
      await section.waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(requestAnimationFrame);
      });
      assert.equal(await buttons.count(), 2);
      const measure = labelType => buttons.evaluateAll((tiles, labelType) => {
        const lockLabel = tiles[0].querySelector('.tile-label');
        const isHebrew = getComputedStyle(lockLabel).direction === 'rtl';
        if (labelType === 'two lines') {
          const [first, second] = isHebrew ? ['מנעול', 'כניסה'] : ['Fixture', 'lock'];
          lockLabel.replaceChildren(first + ' ', document.createElement('br'), second);
        } else if (labelType === 'long') {
          lockLabel.textContent = (isHebrew ? 'מנעולכניסהלבית' : 'AnExtraLongEntranceLockName').repeat(3);
        }
        const section = tiles[0].closest('[data-layout=compact-actions]');
        const sectionBox = section.getBoundingClientRect();
        const title = section.querySelector('.toolbar-section-title').getBoundingClientRect();
        const entries = tiles.map(tile => {
          const label = tile.querySelector('.tile-label');
          const caption = tile.querySelector('.tile-state');
          const mark = tile.querySelector('.tile-mark').getBoundingClientRect();
          const text = label.getBoundingClientRect();
          const font = getComputedStyle(label);
          const rtl = font.direction === 'rtl';
          const bounds = tile.getBoundingClientRect();
          return { name:label.textContent, caption:caption.textContent, rtl, font:font.fontFamily,
            left:bounds.left, right:bounds.right, top:bounds.top, bottom:bounds.bottom,
            offsetHeight:tile.offsetHeight, height:bounds.height,
            scrollWidth:tile.scrollWidth, clientWidth:tile.clientWidth,
            scrollHeight:tile.scrollHeight, clientHeight:tile.clientHeight,
            lines:Math.round(text.height / parseFloat(font.lineHeight)),
            iconClearance:text.left - mark.right };
        });
        return { entries, sectionLeft:sectionBox.left, sectionRight:sectionBox.right,
          rim:getComputedStyle(section).borderTopWidth, titleInset:title.top - sectionBox.top,
          titleGap:entries[0].top - title.bottom, bottomInset:sectionBox.bottom - Math.max(...entries.map(tile => tile.bottom)) };
      }, labelType);
      for (const labelType of ['configured', 'two lines', 'long']) {
        const layout = await measure(labelType);
        const { entries, sectionLeft, sectionRight, rim, titleInset, titleGap, bottomInset } = layout;
        const [first, second] = entries;
        const metrics = JSON.stringify({ locale, labelType, ...layout });
        assert.equal(rim, '0px', metrics);
        assert.ok(Math.abs(titleInset - 18) < .5 && Math.abs(titleGap - 14) < .5 && Math.abs(bottomInset - 2) < .5, metrics);
        assert.ok(Math.abs(first.left - sectionLeft - 4) < .5 && Math.abs(sectionRight - second.right - 4) < .5, metrics);
        assert.ok(Math.abs(second.left - first.right - 8) < .5 && Math.abs(first.top - second.top) < .5, metrics);
        if (labelType === 'two lines') assert.equal(first.lines, 2, metrics);
        if (labelType === 'long') assert.ok(first.lines > 2 && first.offsetHeight > 56, metrics);
        for (const tile of entries) {
          assert.equal(tile.rtl, locale === 'he', metrics);
          if (labelType !== 'long') assert.equal(tile.offsetHeight, 56, metrics);
          assert.ok(tile.scrollWidth <= tile.clientWidth && tile.scrollHeight <= tile.clientHeight, metrics);
          assert.ok(tile.iconClearance >= 0, metrics);
        }
      }
      await buttons.first().focus();
      await page.keyboard.press('Tab');
      assert.equal(await buttons.nth(1).evaluate(button => button.getRootNode().activeElement === button), true);
      const toggle = section.locator('.script-toggle .tile-row:not([hidden])');
      const caption = toggle.locator('.tile-state');
      const he = locale === 'he';
      const start = he ? 'הפעלת תרחיש' : 'Start script';
      assert.equal(await caption.isVisible(), false);
      assert.equal(await toggle.getAttribute('aria-label'), 'Demo start · ' + start);
      assert.ok(await buttons.first().locator('.tile-state').isVisible());
      const makePending = busy => page.locator('bayit-dashboard').evaluate((card, busy) => {
        if (busy) card.pending.set('script.demo_start', { id:'start_script' });
        else card.pending.delete('script.demo_start');
        card.update();
      }, busy);
      await makePending(true);
      await caption.filter({ hasText:start }).waitFor();
      await makePending(false);
      await caption.waitFor({ state:'hidden' });
      const scriptState = value => page.evaluate(value => window.bayitTest.setRoomState('script.demo_start', value), value);
      await scriptState('on');
      await caption.filter({ hasText:he ? 'עצירת תרחיש' : 'Stop script' }).waitFor();
      await scriptState('unavailable');
      await caption.filter({ hasText:he ? 'לא זמין' : 'Unavailable' }).waitFor();
      await page.keyboard.press('Escape');
      await panel.waitFor({ state:'hidden' });
    }

    await page.goto(url + '&automation-compact&editor');
    await page.getByText('Toolbar and extra screens', { exact:true }).tap();
    await page.getByRole('button', { name:'Fixture actions', exact:true }).tap();
    await page.getByRole('button', { name:'Quick scenes', exact:true }).tap();
    const check = page.getByRole('checkbox', { name:'Show compact action buttons', exact:true });
    const layout = () => page.evaluate(() => window.latest.toolbar.find(panel => panel.kind === 'automations').sections[0].layout);
    assert.equal(await check.isChecked(), true);
    await check.uncheck();
    assert.equal(await layout(), undefined);
    await check.check();
    assert.equal(await layout(), 'compact-actions');
    assert.equal(await page.evaluate(() => window.bayitTest.calls.length), 0);
  } finally {
    await page.close();
  }
}

async function assertOverviewClimateDiscovery(browser) {
  const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  page.setDefaultTimeout(8000);
  try {
    await page.goto(base + '/fixture-home/home?configuration&overview-climate-discovery');
    await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
    await page.getByRole('button', { name: 'Customize home', exact: true }).tap();
    const editor = page.getByRole('dialog', { name: 'Customize home', exact: true });
    await editor.getByText('Toolbar and extra screens', { exact: true }).tap();
    await editor.getByRole('button', { name: 'Overview', exact: true }).tap();
    await editor.getByRole('button', { name: 'Air conditioning', exact: true }).tap();
    await editor.getByLabel('Device source', { exact: true }).selectOption('climate');
    await editor.getByLabel('Include specific climate devices', { exact: true }).selectOption(['climate.fixture_lounge']);
    await editor.getByLabel('Exclude these climate devices', { exact: true }).selectOption(['climate.fixture_room_excluded']);
    const prefixes = editor.getByLabel('Include climate devices by ID prefix', { exact: true });
    await prefixes.fill('fixture_room.*');
    await prefixes.blur();
    assert.equal(await prefixes.getAttribute('aria-invalid'), 'true');
    await prefixes.fill('FIXTURE_ROOM_');
    await prefixes.blur();
    assert.equal(await prefixes.getAttribute('aria-invalid'), 'false');
    assert.equal(await editor.getByLabel('Include closing covers', { exact: true }).count(), 0);
    assert.equal(await editor.getByLabel('Show a button to turn off these lights', { exact: true }).count(), 0);
    await editor.getByRole('button', { name: 'Save dashboard', exact: true }).tap();
    await editor.waitFor({ state: 'hidden' });
    await page.waitForURL(url => url.hash === '');
    const persisted = await page.evaluate(() => JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.toolbar[0].sections[0]);
    assert.deepEqual(persisted.discover, {
      domain: 'climate', exclude_entities: ['climate.fixture_room_excluded'], exclude_id_contains: [],
      include_entities: ['climate.fixture_lounge'], include_id_prefixes: ['fixture_room_'],
    });
    assert.deepEqual(persisted.entities, [{ entity: 'climate.fixture_lounge', role: 'action', icon: 'mdi:air-conditioner' }]);

    await page.getByRole('button', { name: 'Home overview', exact: true }).tap();
    const panel = page.getByRole('dialog', { name: 'Home overview', exact: true });
    const row = name => panel.getByRole('button', { name: new RegExp(name) });
    const names = () => panel.locator('.tile-row:visible .tile-label').allTextContents();
    const curated = row('Lounge HVAC');
    await curated.waitFor();
    assert.deepEqual(await names(), ['Lounge HVAC', 'Zulu thermostat']);
    assert.equal(await curated.locator('ha-icon').getAttribute('icon'), 'mdi:air-conditioner');
    const reading = (await curated.locator('.tile-state').innerText()).replace(/[\u2066\u2069]/gu, '');
    assert.match(reading, /24/);
    assert.match(reading, /22/);
    await curated.tap();
    assert.deepEqual(await page.evaluate(() => window.bayitTest.moreInfoCalls), ['climate.fixture_lounge']);
    assert.deepEqual(await page.evaluate(() => window.bayitTest.calls.filter(call => call.domain)), []);

    await page.evaluate(() => {
      window.bayitTest.setRoomState('climate.fixture_room_new', 'dry');
      window.bayitTest.setFixtureAttributes('climate.fixture_room_new', { friendly_name: 'New thermostat' });
    });
    await row('New thermostat').waitFor();
    assert.deepEqual(await names(), ['Lounge HVAC', 'New thermostat', 'Zulu thermostat']);
    await page.evaluate(() => {
      window.bayitTest.setRoomState('climate.fixture_lounge', 'off');
      window.bayitTest.setRoomState('climate.fixture_room_upstairs', 'unavailable');
      window.bayitTest.setFixtureRegistry('climate.fixture_room_new', { hidden_by: 'user' });
    });
    await row('Lounge HVAC').waitFor({ state: 'hidden' });
    assert.deepEqual(await names(), []);
  } finally {
    await page.close();
  }
}

async function assertMediaRemotePower(browser) {
  for (const locale of ['en', 'he']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    page.setDefaultTimeout(8000);
    const rtl = locale === 'he';
    const url = base + '?toolbar-panels&media-remote&locale=' + locale;
    const media = rtl ? 'מדיה' : 'Media';
    const openRemote = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button', { name: rtl ? 'מראה' : 'Appearance', exact: true }).tap();
      await page.getByRole('button', { name: media, exact: true }).tap();
      return page.getByRole('dialog', { name: media, exact: true }).locator('.media-remote');
    };
    const commandLog = () => page.evaluate(() => window.bayitTest.calls);
    const updateState = state => page.evaluate(value => window.bayitTest.setRoomState('media_player.demo_screen', value), state);
    const updateFeatures = features => page.evaluate(value => window.bayitTest.setFixtureAttributes(
      'media_player.demo_screen', { supported_features: value }), features);
    const rowIcons = group => group.locator('button:visible ha-icon').evaluateAll(nodes =>
      nodes.map(node => node.getAttribute('icon')));
    try {
      const remote = await openRemote('&media-power');
      const row = remote.getByRole('group', { name: 'Television', exact: true });
      const label = (rtl ? 'הפעלה וכיבוי' : 'Power') + ' · Display';
      const power = remote.getByRole('button', { name: label, exact: true });
      const ready = pressed => remote.locator('.media-remote-key[aria-pressed="' + pressed + '"]:enabled');
      await ready(false).waitFor();
      assert.deepEqual(await rowIcons(row), ['mdi:power', 'mdi:volume-minus', 'mdi:volume-plus', 'mdi:volume-mute']);
      const keys = await row.locator('button:visible').evaluateAll(nodes => nodes.map(node => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      }));
      assert.ok(keys.every((key, i) => key.width >= 44 && key.height >= 44 && key.y === keys[0].y &&
        (i === 0 || key.x > keys[i - 1].x)));
      await power.evaluate(button => {
        for (const change of [{ state: 'on' }, { features: 256 }, { hidden: true }, { registered: false }]) {
          window.bayitTest.setMediaPowerSnapshot(change);
          button.click();
        }
        window.bayitTest.setMediaPowerSnapshot();
      });
      assert.deepEqual(await commandLog(), [], 'A stale, unsupported, hidden, or unregistered power control sends nothing');

      await power.tap();
      await page.waitForFunction(() => window.bayitTest.calls.length === 1);
      assert.equal(await power.getAttribute('aria-pressed'), 'false');
      assert.equal(await power.getAttribute('aria-busy'), 'true');
      await updateState('playing');
      await ready(true).waitFor();
      await power.tap();
      await page.waitForFunction(() => window.bayitTest.calls.length === 2);
      assert.equal(await power.getAttribute('aria-pressed'), 'true');
      await updateState('off');
      await ready(false).waitFor();
      assert.deepEqual(await commandLog(), ['turn_on', 'turn_off'].map(service => ({
        type: 'call_service', domain: 'media_player', service,
        target: { entity_id: 'media_player.demo_screen' }, service_data: {},
      })));
      await updateFeatures(256);
      await power.waitFor({ state: 'hidden' });
      await updateState('idle');
      await ready(true).waitFor();
      await updateState('unknown');
      await power.waitFor({ state: 'hidden' });
      await updateState('unavailable');
      assert.equal(await power.count(), 0);
      assert.equal((await commandLog()).length, 2);

      const noService = await openRemote('&media-power&missing-power-on');
      assert.equal(await noService.getByRole('button', { name: label, exact: true }).count(), 0);
      const powerOnly = await openRemote('&media-power&active-only&power-only');
      await powerOnly.getByRole('group', { name: 'Display', exact: true }).getByRole('button', { name: label, exact: true }).waitFor();

      const legacy = await openRemote('');
      const legacyRow = legacy.getByRole('group', { name: 'Television', exact: true });
      await page.evaluate(() => window.bayitTest.setFixtureAttributes('media_player.demo_tv', { is_volume_muted: false }));
      await legacyRow.getByRole('button', { name: rtl ? 'השתקה' : 'Mute', exact: true }).waitFor();
      assert.deepEqual(await rowIcons(legacyRow), ['mdi:volume-minus', 'mdi:volume-mute', 'mdi:volume-plus']);
      assert.equal(await power.count(), 0);
      if (rtl) continue;

      await page.goto(url + '&media-power&editor');
      await page.getByText('Toolbar and extra screens', { exact: true }).tap();
      await page.getByRole('button', { name: media, exact: true }).tap();
      const picker = page.getByLabel('Power device', { exact: true });
      const currentSettings = () => page.evaluate(() => window.latest.toolbar.find(item => item.kind === 'media').media_remote);
      assert.equal(await picker.inputValue(), 'media_player.demo_screen');
      await picker.selectOption('');
      assert.equal((await currentSettings()).power_entity, undefined);
      await picker.selectOption('media_player.demo_tv');
      assert.deepEqual(await currentSettings(), {
        transport_entity: 'media_player.demo_speaker', volume_entity: 'media_player.demo_tv',
        power_entity: 'media_player.demo_tv', allow_standby: true,
      });
    } finally {
      await page.close();
    }
  }
}

async function assertEnergyPopupPlacement(browser) {
  for(const locale of ['en','he']){
    const he=locale==='he';
    const page=await browser.newPage({viewport:{width:391,height:846},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const title=he?'אנרגיה':'Energy';
    const url=base+'/fixture-home/home?toolbar-panels&energy-readings&with-energy-dashboard&locale='+locale;
    const compact='&energy-reading-cards';
    const hidden='&hide-energy-dashboard-link';
    const dialog=page.getByRole('dialog',{name:title,exact:true});
    const link=dialog.getByRole('link',{name:he?'פתיחת דשבורד האנרגיה':'Open energy dashboard',exact:true});
    const geometry=()=>dialog.evaluate(el=>({centered:el.hasAttribute('data-centered-toolbar'),y:Math.round(el.getBoundingClientRect().top),width:Math.round(el.getBoundingClientRect().width)}));
    try {
      await page.goto(url);
      await page.getByRole('button',{name:title,exact:true}).tap();
      await dialog.waitFor();
      const old=await geometry();
      assert.equal(old.centered,true);
      assert.equal(await link.getAttribute('href'),'/energy');
      const route=new URL(page.url()).hash;
      assert.match(route,/^#panel\//);
      await page.goto(url+compact+hidden+route);
      await dialog.waitFor();
      const fitted=await geometry();
      assert.equal(fitted.centered,false, 'The reading cards align with the toolbar even from a direct URL');
      assert.equal(fitted.width,359);
      assert.ok(fitted.y < old.y, 'The fitted Energy panel starts above the centered one');
      assert.equal(await link.count(),0);
      assert.deepEqual(await page.evaluate(()=>window.bayitTest.calls),[]);
      await page.goto(url+compact);
      await page.getByRole('button',{name:title,exact:true}).tap();
      await dialog.waitFor();
      assert.deepEqual(await geometry(),fitted);
      assert.equal(await link.getAttribute('href'),'/energy');

      await page.goto(url+compact+hidden+'&editor');
      await page.getByText(he?'סרגל ומסכים נוספים':'Toolbar and extra screens',{exact:true}).tap();
      await page.getByRole('button',{name:title,exact:true}).tap();
      const toggle=page.getByRole('checkbox',{name:he?'הצגת קישור לדשבורד האנרגיה של Home Assistant':'Show the Home Assistant Energy dashboard link',exact:true});
      assert.equal(await toggle.isChecked(),false);
      await toggle.check();
      const configured=()=>page.evaluate(()=>window.latest.toolbar.find(item=>item.kind==='energy').energy_dashboard_link);
      assert.equal(await configured(),undefined);
      await toggle.uncheck();
      assert.equal(await configured(),false);
    } finally { await page.close(); }
  }
}

async function assertEnergyReadingCards(browser) {
  for (const locale of ['en', 'he']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    page.setDefaultTimeout(8000);
    const energy = locale === 'he' ? 'אנרגיה' : 'Energy';
    const url = base + '/fixture-home/home?toolbar-panels&energy-readings&energy-borderless-theme&locale=' + locale;
    const open = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button', { name: energy, exact: true }).tap();
      return page.getByRole('dialog', { name: energy, exact: true });
    };
    try {
      const dialog = await open('&energy-reading-cards&native-more-info=modern');
      const electricity = dialog.locator('[data-section=electricity]');
      const water = dialog.locator('[data-section=water]');
      const reading = electricity.getByRole('button', { name: 'Bill estimate', exact: true });
      await reading.waitFor();
      assert.equal(await reading.getAttribute('data-native-type'), 'sensor');
      assert.equal(await reading.getAttribute('data-reading-state'), '145');
      assert.equal(await reading.getAttribute('data-graph-hours'), null);
      assert.equal(await reading.getAttribute('data-sensor-icon'), 'mdi:cash');
      assert.equal(await reading.getAttribute('data-tap-action'), 'more-info');
      assert.equal(await reading.getAttribute('data-hold-action'), 'none');
      assert.equal(await reading.getAttribute('data-double-tap-action'), 'none');
      await water.locator('[data-native-type=sensor]:not([data-graph-hours])').waitFor();
      assert.equal(await water.getByRole('button', { name: /^Meter warning/ }).getAttribute('data-native-type'), null);
      assert.equal(await dialog.locator('[data-native-type=sensor][data-graph-hours="168"]').count(), 2);
      for (const section of [electricity, water]) {
        const cards = section.locator('[data-native-type=sensor]');
        await cards.nth(1).waitFor();
        assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(node => {
          const style = getComputedStyle(node);
          return [style.borderTopWidth, style.borderTopLeftRadius];
        })), [['1px', '8px'], ['1px', '8px']]);
        const order = await section.evaluate(panel => {
          const [history, reading] = panel.querySelector('.toolbar-section-items').children;
          return {
            chartOnLeft: history.getBoundingClientRect().left < reading.getBoundingClientRect().left,
            directions: [history, reading].map(card => getComputedStyle(card).direction),
          };
        });
        assert.deepEqual(order, {
          chartOnLeft: true, directions: Array(2).fill(locale === 'he' ? 'rtl' : 'ltr'),
        });
      }
      assert.ok(await electricity.evaluate(section => {
        const items = section.querySelector('.toolbar-section-items');
        const [history, reading] = [...items.children].map(child => child.getBoundingClientRect());
        return items.scrollWidth <= items.clientWidth && history.y === reading.y && history.x !== reading.x &&
          Math.abs(history.width - reading.width) < 1;
      }));

      await page.evaluate(() => window.bayitTest.setRoomState('sensor.demo_bill_forecast', '149'));
      await electricity.locator('[data-reading-state="149"]').waitFor();
      const panelHash = new URL(page.url()).hash;
      await reading.tap();
      const details = page.getByRole('dialog', { name: 'Native entity details', exact: true });
      await details.waitFor();
      assert.equal(new URL(page.url()).searchParams.get('more-info-entity-id'), 'sensor.demo_bill_forecast');
      assert.equal(new URL(page.url()).hash, panelHash);
      await details.getByRole('button', { name: 'Close native details', exact: true }).tap();
      await dialog.waitFor();
      await page.evaluate(() => window.bayitTest.setFixtureEntityVisibility('sensor.demo_bill_forecast', true));
      await reading.waitFor({ state: 'hidden' });
      await page.evaluate(() => window.bayitTest.setFixtureEntityVisibility('sensor.demo_bill_forecast', false));
      await reading.waitFor();
      assert.deepEqual(await page.evaluate(() => window.bayitTest.calls), []);

      const fallback = await open('&energy-reading-cards&no-native-charts');
      const fallbackReading = fallback.locator('.energy-reading').getByRole('button', { name: /Bill estimate/ });
      await fallbackReading.waitFor();
      assert.match(await fallbackReading.locator('.tile-state').textContent(), /145 USD/);
      await fallbackReading.tap();
      assert.deepEqual(await page.evaluate(() => window.bayitTest.moreInfoCalls), ['sensor.demo_bill_forecast']);

      const legacy = await open('');
      await legacy.getByRole('button', { name: /Bill estimate/ }).waitFor();
      assert.equal(await legacy.locator('.energy-reading').count(), 0);
      const legacyCharts = legacy.locator('[data-native-type=sensor][data-graph-hours="168"]');
      await legacyCharts.nth(1).waitFor();
      assert.deepEqual(await legacyCharts.evaluateAll(nodes => nodes.map(node => {
        const style = getComputedStyle(node);
        return [style.borderTopWidth, style.borderTopLeftRadius];
      })), [['0px', '20px'], ['0px', '20px']]);

      await page.goto(url + '&energy-reading-cards&editor');
      await page.getByText(locale === 'he' ? 'סרגל ומסכים נוספים' : 'Toolbar and extra screens', { exact: true }).tap();
      await page.getByRole('button', { name: energy, exact: true }).tap();
      await page.getByRole('button', { name: 'Electricity', exact: true }).tap();
      const checkbox = locale === 'he' ? 'הצגת ערכי המדידה בגדול' : 'Show readings with large values';
      const toggle = page.getByRole('checkbox', { name: checkbox, exact: true });
      const layout = () => page.evaluate(() => window.latest.toolbar.find(item => item.kind === 'energy').sections[0].layout);
      assert.equal(await toggle.isChecked(), true);
      await toggle.uncheck();
      assert.equal(await layout(), undefined);
      await toggle.check();
      assert.equal(await layout(), 'reading-cards');
    } finally {
      await page.close();
    }
  }
}

async function assertRoomVacuumGestures(browser) {
  const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  page.setDefaultTimeout(8000);
  const url = base + '/fixture-home/home?toolbar-panels&room-link';
  const room = page.getByRole('dialog', { name: 'Studio', exact: true });
  const vacuum = page.getByRole('dialog', { name: 'Robot vacuum', exact: true });
  const details = page.getByRole('dialog', { name: 'Native entity details', exact: true });
  const robot = room.getByRole('button', { name: 'Robot · More info', exact: true });
  const openRoom = async flags => {
    await page.goto(url + flags);
    await page.getByRole('button', { name: 'Studio', exact: true }).tap();
    await room.waitFor();
  };
  const nativeCalls = () => page.evaluate(() => window.bayitTest.moreInfoCalls);
  const active = locator => locator.evaluate(button => button.getRootNode().activeElement === button);
  try {
    await openRoom('&vacuum-panel-hold&native-more-info=modern');
    assert.equal(await robot.getAttribute('aria-description'), 'Press and hold to open Robot vacuum');
    const roomHash = new URL(page.url()).hash;
    await robot.tap();
    await details.waitFor();
    assert.equal(new URL(page.url()).hash, roomHash);
    assert.equal(new URL(page.url()).searchParams.get('more-info-entity-id'), 'vacuum.demo_robot');
    await details.getByRole('button', { name: 'Close native details', exact: true }).tap();
    await details.waitFor({ state: 'hidden' });
    assert.equal(await active(robot), true);

    const bounds = await robot.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await vacuum.waitFor();
    await page.mouse.up();
    assert.equal(new URL(page.url()).hash, '#panel/vacuum-panel');
    assert.deepEqual(await nativeCalls(), ['vacuum.demo_robot']);
    await vacuum.getByRole('button', { name: 'Back to room', exact: true }).tap();
    await room.waitFor();
    assert.equal(await active(robot), true);
    await robot.press('Shift+Enter');
    await vacuum.waitFor();
    await vacuum.getByRole('button', { name: 'Back to room', exact: true }).tap();
    await robot.press('Enter');
    await details.waitFor();
    assert.deepEqual(await nativeCalls(), ['vacuum.demo_robot', 'vacuum.demo_robot']);
    assert.deepEqual(await page.evaluate(() => window.bayitTest.calls), []);

    await openRoom('');
    const defaultRobot = room.getByRole('button', { name: 'Robot · Open Robot vacuum', exact: true });
    await defaultRobot.tap();
    await vacuum.waitFor();
    await vacuum.getByRole('button', { name: 'Back to room', exact: true }).tap();
    await defaultRobot.press('Shift+Enter');
    assert.deepEqual(await nativeCalls(), ['vacuum.demo_robot']);

    await page.goto(url + '&vacuum-panel-hold&editor');
    await page.getByText('Rooms', { exact: true }).tap();
    await page.getByLabel('Room to customize', { exact: true }).selectOption('studio');
    const target = page.getByLabel('Vacuum panel · Robot', { exact: true });
    const gesture = page.getByLabel('Open the vacuum panel with · Robot', { exact: true });
    const holdEntities = () => page.evaluate(() => window.latest.room_overrides.studio.vacuum_panel_hold_entities);
    assert.equal(await gesture.inputValue(), 'hold');
    await gesture.selectOption('tap');
    assert.equal(await holdEntities(), undefined);
    await gesture.selectOption('hold');
    assert.deepEqual(await holdEntities(), ['vacuum.demo_robot']);
    await target.selectOption('');
    assert.equal(await holdEntities(), undefined);
    assert.equal(await gesture.count(), 0);
  } finally {
    await page.close();
  }
}

async function assertSelectedRoomTemperature(browser) {
  const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
  page.setDefaultTimeout(8000);
  const url = base + '?room-status&temperature-source';
  const room = page.locator('article[data-room="bayit_room_status"]');
  const badge = room.locator('[data-badge=temperature]');
  const set = (entity, state) => page.evaluate(([id, value]) => window.bayitTest.setRoomState(id,value), [entity,state]);
  const selected = 'sensor.demo_preferred_temperature';
  try {
    await page.goto(url);
    await badge.getByText(/69[.]7°F/).waitFor();
    assert.match(await badge.getAttribute('aria-label'), /69[.]7°F/);
    await set(selected,'0');
    await badge.getByText(/0°F/).waitFor();
    for (const absent of [' ', 'unknown', 'unavailable', '0x12']) {
      await set(selected,absent);
      await badge.getByText(/19°/).waitFor();
    }
    await set('climate.demo_room','unavailable');
    await badge.waitFor({state:'hidden'});
    await set(selected,'70');
    await badge.getByText(/70°F/).waitFor();
    await page.evaluate(id => window.bayitTest.setFixtureRegistry(id,{hidden:true}), selected);
    await badge.waitFor({state:'hidden'});
    await page.evaluate(id => window.bayitTest.setFixtureRegistry(id,{}), selected);
    await badge.getByText(/70°F/).waitFor();

    await page.goto(url + '&temperature-no-fallback');
    await badge.getByText(/69[.]7°F/).waitFor();
    await set(selected,'unavailable');
    await badge.waitFor({state:'hidden'});

    await page.goto(url + '&temperature-from-climate');
    await badge.getByText(/19°/).waitFor();
    await set('climate.demo_room','unavailable');
    await badge.waitFor({state:'hidden'});

    await page.goto(base + '?room-status');
    await badge.getByText(/23[.]5°/).waitFor();
    await set('sensor.demo_temperature','unavailable');
    await badge.getByText(/19°/).waitFor();

    await page.goto(url + '&editor');
    await page.getByText('Rooms',{exact:true}).tap();
    await page.getByLabel('Room to customize',{exact:true}).selectOption('bayit_room_status');
    const source = page.getByLabel('Temperature on home card',{exact:true});
    const fallback = page.getByLabel('Fallback room temperature',{exact:true});
    const saved = () => page.evaluate(() => window.latest.room_overrides.bayit_room_status);
    assert.equal(await source.inputValue(), selected);
    assert.equal(await source.locator('option[value="sensor.demo_unmapped"]').count(), 0);
    assert.equal(await fallback.inputValue(), 'climate.demo_room');
    await source.selectOption('climate.demo_room');
    assert.equal((await saved()).room_temperature_entity, 'climate.demo_room');
    assert.equal((await saved()).room_temperature_fallback_entity, undefined);
    await source.selectOption(selected);
    await fallback.selectOption('climate.demo_room');
    assert.equal((await saved()).room_temperature_fallback_entity, 'climate.demo_room');
    await source.selectOption('');
    assert.equal((await saved()).room_temperature_entity, undefined);
    assert.equal((await saved()).room_temperature_fallback_entity, undefined);
  } finally {
    await page.close();
  }
}

async function assertRoomVacuumPresentation(browser) {
  for (const locale of ['en', 'he']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const url = base + '/fixture-home/home?toolbar-panels&room-link&vacuum-room-display-test&locale=' + locale;
    const room = page.getByRole('dialog', {name:'Studio', exact:true});
    const vacuum = page.getByRole('dialog', {name:he ? 'שואב' : 'Robot vacuum', exact:true});
    const device = room.locator('[data-entity="vacuum.demo_robot"]');
    const open = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button',{name:'Studio',exact:true}).tap();
      await device.waitFor();
    };
    try {
      await open('&vacuum-room-display=tile&native-more-info=modern');
      const tile = device.locator('.device-tile');
      assert.equal(await device.getByRole('button').count(), 1);
      assert.equal(await device.locator('.action-list').count(), 0);
      assert.equal(await tile.getAttribute('aria-description'), he ? 'לחיצה ארוכה פותחת מידע נוסף' : 'Press and hold for more info');
      assert.ok((await tile.boundingBox()).height >= 44);
      await tile.tap();
      await vacuum.waitFor();
      await vacuum.getByRole('button',{name:he ? 'חזרה לחדר' : 'Back to room',exact:true}).tap();
      await room.waitFor();
      assert.ok(await tile.evaluate(el => el.getRootNode().activeElement === el));
      const roomUrl = page.url();
      await tile.press('Shift+Enter');
      const details = page.getByRole('dialog',{name:'Native entity details',exact:true});
      await details.waitFor();
      assert.deepEqual(await page.evaluate(() => window.bayitTest.moreInfoCalls), ['vacuum.demo_robot']);
      await details.getByRole('button',{name:'Close native details',exact:true}).tap();
      await details.waitFor({state:'hidden'});
      await page.waitForFunction(url => location.href === url && history.state?.dialog !== 'ha-more-info-dialog', roomUrl);
      assert.ok(await tile.evaluate(el => el.getRootNode().activeElement === el));
      assert.deepEqual(await page.evaluate(() => window.bayitTest.calls), []);

      await open('&vacuum-room-display=cleaning-controls&vacuum-panel-hold');
      const header = device.locator('.device-panel-launch');
      await device.locator('[data-action=vacuum_start]').waitFor();
      await page.evaluate(() => window.bayitTest.setRoomState('vacuum.demo_robot','cleaning'));
      await device.locator('[data-action=vacuum_pause]').waitFor();
      await device.locator('[data-action=vacuum_stop]').waitFor();
      await device.locator('[data-action=return_to_base]').waitFor();
      assert.equal(await device.locator('[data-action=locate]').count(), 0);
      assert.equal(await device.getByLabel(he ? 'עוצמת שאיבה' : 'Suction',{exact:true}).count(), 0);
      await header.press('Shift+Enter');
      await vacuum.waitFor();
      await vacuum.locator('[data-action=locate]').waitFor();

      await open('');
      await device.locator('[data-action=locate]').waitFor();

      await page.goto(url + '&vacuum-room-display=tile&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      const selector = page.getByLabel(he ? 'פקדי השואב בחדר · Robot' : 'Vacuum controls in the room · Robot',{exact:true});
      const setting = () => page.evaluate(() => window.latest.room_overrides.studio.vacuum_panel_presentation);
      assert.equal(await selector.inputValue(),'tile');
      await selector.selectOption('cleaning-controls');
      assert.deepEqual(await setting(),{'vacuum.demo_robot':'cleaning-controls'});
      await page.getByLabel(he ? 'חלונית השואב · Robot' : 'Vacuum panel · Robot',{exact:true}).selectOption('');
      assert.equal(await setting(),undefined);
    } finally {
      await page.close();
    }
  }
}

async function assertRoomVacuumSummary(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const url = base + '?toolbar-panels&room-link&vacuum-room-summary&locale=' + locale;
    const open = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button',{name:'Studio',exact:true}).tap();
    };
    const header = page.getByRole('dialog',{name:'Studio',exact:true}).locator('[data-entity="vacuum.demo_robot"] .current');
    const state = (entity,value) => page.evaluate(([id,value]) => window.bayitTest.setRoomState(id,value), [entity,value]);
    try {
      await open('&vacuum-room-display=cleaning-controls&vacuum-panel-hold');
      await header.getByText(he ? /מנקה חדר נבחר/ : /Cleaning selected room/).waitFor();
      assert.match(await header.textContent(),/43%/);
      assert.match(await header.textContent(),/28%/);
      await state('sensor.demo_robot_status','charging');
      await header.getByText(/28%/).waitFor({state:'hidden'});
      await state('binary_sensor.demo_robot_cleaning','on');
      await header.getByText(/28%/).waitFor();
      await state('sensor.demo_robot_progress','101');
      await header.getByText(/28%/).waitFor({state:'hidden'});
      assert.doesNotMatch(await header.textContent(),/101%/);
      await state('sensor.demo_robot_battery','unavailable');
      await state('sensor.demo_robot_status','unknown');
      await header.getByText(he ? /בהמתנה/ : /Idle/).waitFor();
      assert.doesNotMatch(await header.textContent(),/43%/);
      assert.deepEqual(await page.evaluate(() => window.bayitTest.calls),[]);

      await open('&vacuum-room-display=tile');
      assert.doesNotMatch(await header.textContent(),/43%|28%/);

      await page.goto(url + '&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      const battery = page.getByLabel(he ? 'חיישן סוללה' : 'Battery sensor',{exact:true});
      assert.equal(await battery.inputValue(),'sensor.demo_robot_battery');
      await battery.selectOption('');
      const summary = await page.evaluate(() => window.latest.room_overrides.studio.vacuum_panel_summary['vacuum.demo_robot']);
      assert.equal(summary.battery_entity, undefined);
      assert.equal(summary.progress_entity,'sensor.demo_robot_progress');
    } finally {
      await page.close();
    }
  }
}

async function assertHomeMaterial(browser) {
  const engine = browser.browserType().name();
  const quietPage = await browser.newPage({
    viewport: { width: 391, height: 845 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
  });
  try {
    const quietLocale = engine === 'webkit' ? 'he' : 'en';
    await quietPage.goto(base + '?room-status&classic-quiet&locale=' + quietLocale);
    const homeRoom = quietPage.locator('.room[data-room="bayit_room_status"]');
    await homeRoom.waitFor();
    const quietShortcut = homeRoom.locator('.quick-button[data-entity="light.demo_side1"]');
    const cover = homeRoom.locator('.quick-button[data-entity="cover.demo_window"]');
    const appearance = ink => quietShortcut.evaluate((control, inkMode) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const pixel = color => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data);
      };
      const root = control.getRootNode();
      const room = control.closest('.room');
      const chrome = root.querySelector('.chrome-button:not([hidden])');
      room.dataset.wallpaperInk = chrome.dataset.wallpaperInk = inkMode;
      const style = getComputedStyle(control);
      const coverStyle = getComputedStyle(room.querySelector('[data-entity="cover.demo_window"]'));
      const climate = getComputedStyle(room.querySelector('[data-entity="climate.demo_room"]'));
      const badge = [room.querySelector('[data-badge=temperature]'), room.querySelector('.room-count')];
      const [toolbarStyle, chromeStyle, roomStyle] = [root.querySelector('.toolbar'), chrome, room]
        .map(node => getComputedStyle(node));
      const ink = element => pixel(getComputedStyle(element).color);
      return {
        glass: CSS.supports('backdrop-filter: blur(1px)') || CSS.supports('-webkit-backdrop-filter: blur(1px)'),
        labelInk: ink(room.querySelector('.room-name')),
        statusInk: ink(room.querySelector('.room-count')),
        expectedStatusInk: pixel(roomStyle.getPropertyValue('--secondary')),
        chromeInk: ink(chrome.querySelector('ha-icon')),
        roomInk: ink(room.querySelector('.room-title > ha-icon')),
        shutdownInk: ink(room.querySelector('.room-turn-off > ha-icon')),
        shortcutInk: ink(control.querySelector('ha-icon')),
        coverGlyphInk: ink(room.querySelector('[data-entity="cover.demo_window"] ha-icon')),
        reduced: matchMedia('(prefers-reduced-transparency: reduce)').matches,
        stronger: matchMedia('(prefers-contrast: more)').matches,
        background: pixel(style.backgroundColor),
        rim: pixel(style.borderColor)[3],
        strongRim: pixel(style.getPropertyValue('--soft-line'))[3],
        toolbarAlpha: pixel(toolbarStyle.backgroundColor)[3],
        chromeAlpha: pixel(chromeStyle.backgroundColor)[3],
        chromeRim: pixel(chromeStyle.borderColor)[3],
        roomAlpha: pixel(roomStyle.backgroundColor)[3],
        roomRim: pixel(roomStyle.borderColor)[3],
        badges: badge.map(element => {
          const style = getComputedStyle(element);
          return { fill: pixel(style.backgroundColor), rim: pixel(style.borderColor)[3] };
        }),
        coverInk: pixel(coverStyle.color),
        coverFill: pixel(coverStyle.backgroundColor),
        coverRim: pixel(coverStyle.borderColor)[3],
        coverRimStyle: coverStyle.borderStyle,
        climateFill: pixel(climate.backgroundColor),
      };
    }, ink);
    assert.equal(await quietShortcut.locator('ha-icon').evaluate(glyph => glyph.offsetWidth), 24);
    assert.equal(await cover.locator('ha-icon').evaluate(glyph => glyph.offsetWidth), 24);
    const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1, actual + ' should be near ' + expected);
    const assertAppearance = async ink => {
      const current = await appearance(ink);
      const fallback = current.reduced || current.stronger;
      const dark = ink === 'dark';
      const white = [255, 255, 255, 255];
      const labelInk = dark ? [16, 18, 23, 255] : white;
      const transparentGlass = current.glass && !fallback;
      assert.deepEqual(current.labelInk, labelInk);
      assert.deepEqual(current.statusInk, current.expectedStatusInk);
      for (const neutral of [current.chromeInk, current.roomInk, current.shutdownInk]) {
        assert.deepEqual(neutral, transparentGlass ? white : labelInk);
      }
      assert.deepEqual(current.shortcutInk, transparentGlass ? white
        : dark ? [32, 36, 43, 255] : [255, 255, 255, 222]);
      assert.deepEqual(current.coverGlyphInk, current.coverInk);
      assert.equal(current.toolbarAlpha, 0);
      assert.equal(current.chromeAlpha, fallback ? 255 : 0);
      assert.equal(current.roomAlpha, fallback ? 255 : 0);
      near(current.roomRim, (current.stronger ? .58 : current.reduced ? .30 : dark ? .35 : .28) * 255);
      near(current.chromeRim, (current.stronger ? .58 : current.reduced ? .24 : dark ? .35 : .28) * 255);
      if (current.reduced) {
        if (dark) assert.ok(current.background.slice(0, 3).every(value => value > 190));
        else for (const value of current.background.slice(0, 3)) near(value, 62);
        assert.equal(current.background[3], 255);
      } else assert.equal(current.background[3], 0);
      near(current.rim, current.stronger ? current.strongRim : 41);
      for (const { fill, rim } of current.badges) {
        assert.equal(fill[3], fallback ? 255 : 0);
        if (fallback && dark) assert.ok(fill.slice(0, 3).every(value => value > 190));
        else if (fallback) for (const value of fill.slice(0, 3)) near(value, 64);
        near(rim, (current.stronger ? .31 : current.reduced ? .10 : dark ? .22 : .18) * 255);
      }
      assert.deepEqual(current.coverInk, dark ? (fallback ? [0, 63, 104, 255] : [0, 30, 77, 255])
        : fallback ? [122, 167, 255, 255] : [164, 200, 255, 255]);
      near(current.coverFill[3], .18 * 255);
      near(current.coverRim, .38 * 255);
      assert.equal(current.coverRimStyle, 'solid');
      near(current.climateFill[3], .14 * 255);
    };
    const cdp = engine === 'chromium' ? await quietPage.context().newCDPSession(quietPage) : undefined;
    const setMedia = (transparency, contrast) => cdp
      ? cdp.send('Emulation.setEmulatedMedia', { features: [
        { name: 'prefers-reduced-transparency', value: transparency }, { name: 'prefers-contrast', value: contrast },
      ] })
      : quietPage.emulateMedia({ contrast });
    const modes = cdp
      ? [['no-preference', 'no-preference'], ['reduce', 'no-preference'], ['no-preference', 'more'], ['reduce', 'more']]
      : [['no-preference', 'no-preference'], ['no-preference', 'more']];
    for (const [transparency, contrast] of modes) {
      await setMedia(transparency, contrast);
      const mode = await appearance('light');
      if (cdp) assert.equal(mode.reduced, transparency === 'reduce');
      assert.equal(mode.stronger, contrast === 'more');
      await assertAppearance('light');
      await assertAppearance('dark');
    }

    await setMedia('no-preference', 'no-preference');
    const he = quietLocale === 'he';
    const unavailableLabel = he ? 'לא זמין' : 'Unavailable';
    for (const [state, tone, direction, label] of [
      ['open', 'moving', '', he ? 'פתוח' : 'Open'],
      ['opening', 'moving', 'opening', he ? 'נפתח' : 'Opening'],
      ['unavailable', 'quiet', '', unavailableLabel],
      ['unknown', 'quiet', '', unavailableLabel],
      ['closed', 'quiet', '', he ? 'סגור' : 'Closed'],
    ]) {
      await quietPage.evaluate(async state => {
        window.bayitTest.setRoomState('cover.demo_window', state);
        await new Promise(requestAnimationFrame);
      }, state);
      const unavailable = state === 'unknown' || state === 'unavailable';
      assert.equal(await cover.getAttribute('data-tone'), tone);
      assert.equal(await cover.getAttribute('data-transition'), direction);
      assert.equal(await cover.getAttribute('data-unavailable') !== null, unavailable);
      assert.ok((await cover.getAttribute('aria-label')).includes(label));
      for (const ink of ['light', 'dark']) {
        const current = await appearance(ink);
        assert.equal(current.coverRimStyle, unavailable ? 'dashed' : 'solid');
        if (unavailable) {
          near(current.coverRim, .48 * 255);
          assert.equal(await cover.getAttribute('aria-busy'), 'false');
        }
      }
      if (unavailable) {
        await setMedia('reduce', 'more');
        const fallback = await appearance('light');
        assert.equal(fallback.coverRimStyle, 'dashed');
        near(fallback.coverRim, .58 * 255);
        await setMedia('no-preference', 'no-preference');
      }
    }
    const unrelated = homeRoom.locator('.quick-button[data-entity="light.demo_unavailable"]');
    assert.equal(await unrelated.getAttribute('data-unavailable'), null);
    assert.equal(await unrelated.evaluate(control => getComputedStyle(control).borderStyle), 'solid');
    assert.equal(await quietPage.evaluate(() => window.bayitTest.calls.length), 0);
    const quietRoomName = homeRoom.locator('.room-name');
    const nameLines = () => quietRoomName.evaluate(name => {
      const range = document.createRange();
      range.selectNodeContents(name);
      return new Set([...range.getClientRects()].filter(box => box.width > 0).map(box => box.top)).size;
    });
    const rawName = quietLocale === 'he' ? 'חדר\nהפנאי' : 'Family\nroom';
    assert.equal(await quietRoomName.textContent(), rawName);
    assert.equal(await nameLines(), 2);
    const labelFits = await quietRoomName.evaluate(name => {
      const box = name.getBoundingClientRect();
      const tile = name.closest('.room').getBoundingClientRect();
      return box.top >= tile.top && box.bottom <= tile.bottom;
    });
    assert.equal(labelFits, true);
    await quietPage.evaluate(() => window.bayitTest.setRoomLayout('header'));
    assert.equal(await quietRoomName.textContent(), rawName);
    assert.equal(await nameLines(), 1);
    assert.equal(await quietPage.evaluate(() => window.bayitTest.calls.length), 0);
  } finally {
    await quietPage.close();
  }
}

async function assertCompactClimateRail(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    const he = locale === 'he';
    page.setDefaultTimeout(8000);
    const baseUrl = base + '/fixture-home/home?device-panel&preset-shortcut&climate-power-test&room-climate-power&compact-climate-summary&locale=' + locale;
    const layoutUrl = baseUrl + '&compact-climate-controls';
    const detail = '#device/studio/climate.demo_air';
    const room = '#room-studio';
    const rail = page.locator('dialog[open] .compact-climate-rail > .climate-controls');
    const calls = () => page.evaluate(()=>window.bayitTest.calls.filter(request=>request.type === 'call_service'));
    const geometry = () => rail.evaluate(container => {
      const result = new Map();
      const bounds = container.getBoundingClientRect();
      const timer = container.closest('.action-list').querySelector('.device-timer').getBoundingClientRect();
      const accurateTarget = container.querySelector('.target-value');
      let allInside = true;
      for (const control of container.children) {
        const rect = control.getBoundingClientRect();
        const row = Math.round(rect.top);
        result.set(row,(result.get(row) ?? 0)+1);
        allInside &&= rect.left >= bounds.left - .5 && rect.right <= bounds.right + .5 && rect.height >= 44;
      }
      return {rows:[...result.values()],allInside,timerAfter:timer.top >= bounds.bottom,
        targetFits:accurateTarget.scrollWidth <= accurateTarget.clientWidth + 1};
    });
    try {
      for (const width of [320,375,391]) {
        await page.setViewportSize({width,height:844});
        for (const surface of [room,detail]) {
          await page.goto(layoutUrl + surface);
          await rail.waitFor();
          const four = await geometry();
          assert.deepEqual(four.rows,width === 320 ? [2,2] : [4]);
          assert.ok(four.allInside && four.timerAfter && four.targetFits,JSON.stringify(four));
          assert.equal(await rail.locator('select[data-action=set_swing_mode]').count(),1);
          assert.equal(await page.locator('dialog[open] .room-climate-power:enabled').count(),1);
          await rail.locator('select[data-action=set_fan_mode]').focus();
          assert.deepEqual(await calls(),[]);

          await page.goto(layoutUrl + '&climate-labels=lounge' + surface);
          await rail.waitFor();
          const three = await geometry();
          assert.deepEqual(three.rows,[3]);
          assert.ok(three.allInside && three.timerAfter && three.targetFits,JSON.stringify(three));
          assert.equal(await rail.locator('select[data-action=set_swing_mode]').count(),0);
          assert.equal(await page.locator('dialog[open] .timer-preset').count(),4);
          assert.deepEqual(await calls(),[]);
        }
      }

      await page.goto(layoutUrl + '#device/bayit_room_other_preset/climate.demo_air');
      await page.locator('dialog[open] .climate-controls').waitFor();
      assert.equal(await rail.count(),0);
      await page.goto(baseUrl + room);
      await page.locator('dialog[open] .climate-controls').waitFor();
      assert.equal(await rail.count(),0);

      await page.goto(layoutUrl + '&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      await page.getByText(he ? 'תצוגת מכשירים' : 'Device display',{exact:true}).tap();
      await page.getByLabel(he ? 'מכשיר להתאמה אישית' : 'Device to customize',{exact:true}).selectOption('climate.demo_air');
      const setting = page.getByRole('checkbox',{name:he ? 'סידור פקדי המזגן בשורה קומפקטית' : 'Arrange thermostat controls in a compact row',exact:true});
      assert.ok(await setting.isChecked());
      await setting.uncheck();
      const read = () => page.evaluate(()=>window.latest.room_overrides.studio.compact_climate_controls_entities);
      assert.equal(await read(),undefined);
      await setting.check();
      assert.deepEqual(await read(),['climate.demo_air']);
      assert.deepEqual(await calls(),[]);
    } finally {
      await page.close();
    }
  }
}

async function assertRoomClimatePower(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const url = base + '/fixture-home/home?device-panel&preset-shortcut&climate-power-test&locale=' + locale;
    const openRoom = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button',{name:'Studio',exact:true}).tap();
    };
    const room = page.getByRole('dialog',{name:'Studio',exact:true});
    const climate = page.getByRole('dialog',{name:'Studio air conditioner',exact:true});
    const entity = 'climate.demo_air';
    const state = value => page.evaluate(value => window.bayitTest.setRoomState('climate.demo_air',value),value);
    const power = panel => panel.locator('.room-climate-power');
    const ready = (panel, active) => panel.locator('.room-climate-power[aria-pressed="'+active+'"]:enabled');
    const calls = () => page.evaluate(() => window.bayitTest.calls);
    try {
      await openRoom('&room-climate-power&native-more-info=modern');
      await ready(room,false).waitFor();
      assert.equal(await power(room).count(),1);
      assert.ok(await power(room).evaluate(button => {
        const parent = button.parentElement;
        return button.offsetWidth >= 44 && button.offsetHeight >= 44 && parent.scrollWidth <= parent.clientWidth;
      }));
      await power(room).evaluate(button => {
        window.bayitTest.setClimatePowerSnapshot('cool');
        button.click();
        window.bayitTest.setClimatePowerSnapshot('off');
      });
      assert.deepEqual(await calls(),[]);
      await power(room).tap();
      await page.waitForFunction(() => window.bayitTest.calls.length === 1);
      assert.equal(await power(room).getAttribute('aria-pressed'),'false');
      assert.equal(await power(room).getAttribute('aria-busy'),'true');
      await power(room).evaluate(button => button.click());
      assert.equal((await calls()).length,1);
      await state('cool');
      await ready(room,true).waitFor();
      await power(room).press('Shift+Enter');
      const native = page.getByRole('dialog',{name:'Native entity details',exact:true});
      await native.waitFor();
      assert.equal(new URL(page.url()).searchParams.get('more-info-entity-id'),entity);
      await native.getByRole('button',{name:'Close native details',exact:true}).tap();
      await native.waitFor({state:'hidden'});
      assert.ok(await power(room).evaluate(button => button.getRootNode().activeElement === button));
      await power(room).tap();
      await page.waitForFunction(() => window.bayitTest.calls.length === 2);
      assert.equal(await power(room).getAttribute('aria-pressed'),'true');
      await state('off');
      await ready(room,false).waitFor();
      assert.deepEqual(await calls(), ['turn_on','turn_off'].map(service => ({
        type:'call_service',domain:'climate',service,service_data:{},target:{entity_id:entity},
      })));

      await page.goto(url + '&room-climate-power#device/studio/climate.demo_air');
      await ready(climate,false).waitFor();
      assert.equal(await power(climate).count(),1);
      await page.evaluate(() => window.bayitTest.setFixtureAttributes('climate.demo_air',{supported_features:128}));
      await climate.locator('.room-climate-power:disabled').waitFor();
      await state('unknown');
      await climate.locator('.room-climate-power:not([aria-pressed])').waitFor();
      assert.deepEqual(await calls(),[]);

      await openRoom('&room-climate-power&missing-climate-on-service');
      await room.locator('.room-climate-power:disabled').waitFor();
      assert.deepEqual(await calls(),[]);
      await openRoom('');
      assert.equal(await power(room).count(),0);

      await page.goto(url + '&room-climate-power&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      await page.getByText(he ? 'תצוגת מכשירים' : 'Device display',{exact:true}).tap();
      await page.getByLabel(he ? 'מכשיר להתאמה אישית' : 'Device to customize',{exact:true}).selectOption(entity);
      const toggle = page.getByRole('checkbox',{name:he ? 'הצגת כפתור הפעלה וכיבוי מהיר למזגן' : 'Show quick power for this climate device',exact:true});
      assert.equal(await toggle.isChecked(),true);
      const setting = () => page.evaluate(() => window.latest.room_overrides.studio.climate_power_entities);
      await toggle.uncheck();
      assert.equal(await setting(),undefined);
      await toggle.check();
      assert.deepEqual(await setting(),[entity]);
      assert.deepEqual(await calls(),[]);
    } finally {
      await page.close();
    }
  }
}

async function assertCompactRoomDevicePair(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const id = 'lock.demo_room_compact';
    const media = 'media_player.demo_tv';
    const url = base + '/fixture-home/home?toolbar-panels&room-link&room-media-test&room-compact-pair-test&native-more-info=modern&locale=' + locale;
    const room = page.getByRole('dialog',{name:'Studio',exact:true});
    const lock = room.locator('[data-entity="' + id + '"]');
    const tv = room.locator('[data-entity="' + media + '"]');
    const panel = page.getByRole('dialog',{name:he ? 'מדיה' : 'Media',exact:true});
    const native = page.getByRole('dialog',{name:'Native entity details',exact:true});
    const action = (node, name) => node.locator('button[data-action="' + name + '"]');
    const actions = node => node.locator('button[data-action]').evaluateAll(nodes=>nodes.map(control=>control.dataset.action));
    const calls = () => page.evaluate(()=>window.bayitTest.calls.filter(call=>call.type==='call_service'));
    const state = (entity,value) => page.evaluate(([entity,value])=>window.bayitTest.setRoomState(entity,value),[entity,value]);
    const attrs = (entity,value) => page.evaluate(([entity,value])=>window.bayitTest.setFixtureAttributes(entity,value),[entity,value]);
    const open = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button',{name:'Studio',exact:true}).tap();
      await room.waitFor();
    };
    const closeNative = async entity => {
      await native.waitFor();
      assert.equal(new URL(page.url()).searchParams.get('more-info-entity-id'),entity);
      await native.getByRole('button',{name:'Close native details',exact:true}).tap();
      await native.waitFor({state:'hidden'});
      await page.waitForFunction(()=>!new URL(location.href).searchParams.has('more-info-entity-id'));
    };
    try {
      await open('&room-compact-pair');
      await lock.waitFor();
      await tv.waitFor();
      const [left,right] = await Promise.all([lock.boundingBox(),tv.boundingBox()]);
      assert.ok(right.y === left.y && (right.x >= left.x + left.width || left.x >= right.x + right.width));
      assert.equal(await lock.getAttribute('data-room-compact-device'),'lock');
      assert.equal(await tv.getAttribute('data-room-compact-device'),'media_player');
      assert.deepEqual(await actions(lock),['lock']);
      assert.deepEqual(await actions(tv),['turn_off','media_pause','media_next_track','mute']);
      assert.equal(await action(lock,'lock').textContent(),'');
      assert.equal(await action(tv,'mute').textContent(),'');
      assert.ok(await tv.evaluate(node=>node.scrollWidth <= node.clientWidth));
      assert.equal(await lock.locator('.current').isVisible(),false);
      assert.match(await lock.locator('.device-panel-launch').getAttribute('aria-description'),he ? /לא נעול|פתוח/ : /Unlocked/i);
      assert.deepEqual(await calls(),[]);

      await lock.locator('.device-panel-launch').press('Shift+Enter');
      await closeNative(id);
      await lock.locator('.device-panel-launch:focus').waitFor();
      await tv.locator('.device-panel-launch').tap();
      await closeNative(media);
      await tv.locator('.device-panel-launch:focus').waitFor();
      await tv.locator('.device-panel-launch').press('Shift+Enter');
      await panel.waitFor();
      await panel.getByRole('button',{name:he ? 'חזרה לחדר' : 'Back to room',exact:true}).tap();
      await room.waitFor();
      assert.deepEqual(await calls(),[]);

      await state(media,'off');
      const placeholder = tv.locator('[data-room-mute-placeholder]');
      await placeholder.waitFor();
      assert.equal(await placeholder.isDisabled(),true);
      assert.deepEqual(await actions(tv),['turn_on']);
      await placeholder.evaluate(button=>button.click());
      await attrs(media,{supported_features:128});
      await placeholder.waitFor({state:'hidden'});
      await attrs(media,{supported_features:136,is_volume_muted:true});
      await placeholder.waitFor();
      assert.equal(await placeholder.locator('ha-icon').getAttribute('icon'),'mdi:volume-off');
      await state(media,'unavailable');
      await placeholder.waitFor({state:'hidden'});
      assert.deepEqual(await actions(tv),[]);
      assert.deepEqual(await calls(),[]);

      await action(lock,'lock').tap();
      await page.waitForFunction(()=>window.bayitTest.calls.some(call=>call.domain === 'lock'));
      await state(id,'locked');
      const unlock = action(lock,'unlock');
      await unlock.waitFor();
      const accept = page.locator('[data-role="accept"]');
      await unlock.tap();
      await accept.waitFor();
      assert.equal((await calls()).length,1);
      await state(id,'unlocked');
      await accept.tap();
      assert.equal((await calls()).length,1);
      await state(id,'locking');
      await action(lock,'lock').waitFor({state:'hidden'});
      assert.deepEqual(await actions(lock),[]);
      await state(id,'unavailable');
      assert.deepEqual(await actions(lock),[]);

      await attrs(id,{code_format:'^[0-9]+$'});
      await state(id,'locked');
      await unlock.tap();
      await accept.tap();
      await closeNative(id);
      assert.equal((await calls()).length,1);
      await attrs(id,{code_format:undefined});
      await unlock.tap();
      await accept.tap();
      await page.waitForFunction(()=>window.bayitTest.calls.filter(call=>call.domain === 'lock').length === 2);
      assert.deepEqual(await calls(),['lock','unlock'].map(service=>({type:'call_service',domain:'lock',service,
        target:{entity_id:id},service_data:{}})));

      await open('&room-compact-pair&compact-pair-read-only');
      assert.equal(await lock.getAttribute('data-room-compact-device'),null);
      assert.deepEqual(await actions(lock),[]);
      assert.deepEqual(await calls(),[]);

      await page.goto(url + '&room-compact-pair&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      await page.getByText(he ? 'תצוגת מכשירים' : 'Device display',{exact:true}).tap();
      const picker = page.getByLabel(he ? 'מכשיר להתאמה אישית' : 'Device to customize',{exact:true});
      await picker.selectOption(id);
      const compact = page.getByRole('checkbox',{name:he ? 'הצגה ככרטיס מכשיר קומפקטי' : 'Show as a compact device card',exact:true});
      assert.equal(await compact.isChecked(),true);
      await compact.uncheck();
      assert.deepEqual(await page.evaluate(()=>window.latest.room_overrides.studio.compact_device_entities),[media]);
      assert.deepEqual(await calls(),[]);
    } finally {
      await page.close();
    }
  }
}

async function assertCompactRoomMedia(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const url = base + '/fixture-home/home?toolbar-panels&room-link&room-media-test&locale=' + locale;
    const room = page.getByRole('dialog',{name:'Studio',exact:true});
    const panel = page.getByRole('dialog',{name:he ? 'מדיה' : 'Media',exact:true});
    const tv = room.locator('[data-entity="media_player.demo_tv"]');
    const status = tv.locator('.current');
    const header = tv.locator('.device-panel-launch');
    const openRoom = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button',{name:'Studio',exact:true}).tap();
      await tv.waitFor();
    };
    const attrs = attrs => page.evaluate(attrs => window.bayitTest.setFixtureAttributes('media_player.demo_tv',attrs),attrs);
    const state = state => page.evaluate(state => window.bayitTest.setRoomState('media_player.demo_tv',state),state);
    const actions = () => tv.locator('[data-action]').evaluateAll(nodes => [...new Set(nodes.map(node=>node.dataset.action))].sort());
    const compact = '&room-media-compact';
    try {
      await openRoom(compact + '&native-more-info=modern');
      await status.getByText(/Evening news/).waitFor();
      assert.match(await status.textContent(), he ? /עוצמת שמע.*42%/ : /Volume.*42%/);
      assert.match(await header.getAttribute('aria-description'),/42%/);
      assert.deepEqual(await actions(),['media_next_track','media_pause','media_stop','mute','turn_off']);
      assert.ok(await tv.evaluate(node => node.scrollWidth <= node.clientWidth));
      await attrs({is_volume_muted:true,volume_level:0,media_title:''});
      await tv.locator('[data-action=unmute]').waitFor();
      await status.getByText(/0%/).waitFor();
      assert.doesNotMatch(await status.textContent(),/Evening news|42%/);
      await attrs({is_volume_muted:undefined,volume_level:'0.42'});
      await tv.locator('[data-action=unmute]').waitFor({state:'hidden'});
      await status.getByText(/0%/).waitFor({state:'hidden'});
      assert.doesNotMatch(await status.textContent(),/42%/);
      await state('paused');
      await tv.locator('[data-action=media_play]').waitFor();
      await state('off');
      await tv.locator('[data-action=turn_on]').waitFor();
      assert.deepEqual(await actions(),['turn_on']);

      await state('playing');
      await header.tap();
      const native = page.getByRole('dialog',{name:'Native entity details',exact:true});
      await native.waitFor();
      await native.getByRole('button',{name:'Close native details',exact:true}).tap();
      await native.waitFor({state:'hidden'});
      await page.waitForFunction(() => !new URL(location.href).searchParams.has('more-info-entity-id'));
      await tv.locator('.device-panel-launch:focus').waitFor();
      await header.press('Shift+Enter');
      await panel.waitFor();
      await panel.locator('[data-entity="media_player.demo_tv"] input[data-action=volume_set]').waitFor();
      await panel.getByRole('button',{name:he ? 'חזרה לחדר' : 'Back to room',exact:true}).tap();
      await room.waitFor();
      assert.ok(await header.evaluate(button => button.getRootNode().activeElement === button));
      assert.deepEqual(await page.evaluate(() => window.bayitTest.calls),[]);

      await openRoom('');
      assert.ok((await actions()).includes('volume_set'));
      assert.ok((await actions()).includes('select_source'));

      await page.goto(url + compact + '&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      await page.getByText(he ? 'תצוגת מכשירים' : 'Device display',{exact:true}).tap();
      await page.getByLabel(he ? 'מכשיר להתאמה אישית' : 'Device to customize',{exact:true}).selectOption('media_player.demo_tv');
      const picker = page.getByRole('checkbox',{name:he ? 'הצגת פקדי מדיה קומפקטיים בחדר' : 'Show compact media controls in this room',exact:true});
      assert.equal(await picker.isChecked(),true);
      const setting = () => page.evaluate(() => window.latest.room_overrides.studio.media_compact_entities);
      await picker.uncheck();
      assert.equal(await setting(),undefined);
      await picker.check();
      assert.deepEqual(await setting(),['media_player.demo_tv']);
      assert.deepEqual(await page.evaluate(() => window.bayitTest.calls),[]);
    } finally {
      await page.close();
    }
  }
}

async function assertKitchenBoilerQuickPower(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const relay = 'switch.demo_quick_boiler';
    const sensor = 'sensor.demo_boiler_runtime';
    const url = base + '/fixture-home/home?toolbar-panels&room-link&boiler-quick-test&locale=' + locale;
    const room = page.getByRole('dialog',{name:'Studio',exact:true});
    const boiler = page.getByRole('dialog',{name:'Quick boiler',exact:true});
    const tile = room.locator('[data-room-boiler-quick] .device-tile');
    const visibleAction = action => room.locator('[data-room-boiler-quick] [data-action="' + action + '"]');
    const calls = () => page.evaluate(()=>window.bayitTest.calls.filter(call=>call.type==='call_service'));
    const update = (state, timer) => page.evaluate(([relay,sensor,state,timer])=>{
      window.bayitTest.setRoomState(relay,state);
      window.bayitTest.setFixtureAttributes(sensor,timer);
    },[relay,sensor,state,timer]);
    const open = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button',{name:'Studio',exact:true}).tap();
      await room.waitFor();
    };
    const returnToRoom = async () => {
      await boiler.waitFor();
      await boiler.getByRole('button',{name:he ? 'חזרה לחדר' : 'Back to room',exact:true}).tap();
      await room.waitFor();
      assert.ok(await tile.evaluate(button=>button.getRootNode().activeElement === button));
    };
    try {
      await open('&boiler-quick');
      await visibleAction('turn_on').waitFor();
      assert.equal(await tile.getAttribute('aria-pressed'),'false');
      assert.match(await tile.getAttribute('aria-description'),/Shift\+Enter/);
      await tile.evaluate(button=>button.click());
      await tile.press('Shift+Enter');
      await returnToRoom();

      const bounds = await tile.boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2,bounds.y + bounds.height / 2);
      await page.mouse.down();
      await boiler.waitFor();
      await page.mouse.up();
      await returnToRoom();
      assert.deepEqual(await calls(),[]);

      await tile.tap();
      await room.locator('[data-room-boiler-quick] [aria-busy="true"]').waitFor();
      assert.equal(await tile.getAttribute('aria-pressed'),'false');
      await tile.tap();
      assert.equal((await calls()).length,1);
      await update('on',{device_active:true});
      await visibleAction('turn_off').waitFor();
      await tile.press('Enter');
      await room.locator('[data-room-boiler-quick] [aria-busy="true"]').waitFor();
      assert.equal(await tile.getAttribute('aria-pressed'),'true');
      await update('off',{device_active:false});
      await visibleAction('turn_on').waitFor();

      const active = {timer_state:'active',timer_finishes_at:new Date(Date.now()+60_000).toISOString()};
      await update('off',active);
      await room.locator('[data-room-boiler-quick] .device-tile:not([data-action])').waitFor();
      await tile.tap();
      await update('on',{device_active:true,reverse_mode:true});
      await tile.tap();
      await update('on',{reverse_mode:false,switch_entity_id:'switch.incorrect_target'});
      await tile.tap();
      assert.equal((await calls()).length,2);
      await update('on',{switch_entity_id:relay});
      await visibleAction('stop_timed').waitFor();
      assert.match(await tile.getAttribute('aria-label'),he ? /כיבוי הדוד וביטול הטיימר/ : /Switch off and cancel the timer/);
      await tile.tap();
      await room.locator('[data-room-boiler-quick] [aria-busy="true"]').waitFor();
      await update('off',{device_active:false});
      assert.equal(await tile.getAttribute('aria-busy'),'true');
      await update('off',{timer_state:'idle'});
      await visibleAction('turn_on').waitFor();
      assert.deepEqual(await calls(), [
        ...['turn_on','turn_off'].map(service=>({
          type:'call_service',domain:'switch',service,service_data:{},target:{entity_id:relay},
        })),
        {type:'call_service',domain:'simple_timer',service:'cancel_timer',service_data:{entity_id:sensor,turn_off_entity:true}},
      ]);

      await page.evaluate(()=>window.bayitTest.rejectNextBoilerAction());
      await tile.tap();
      await room.getByText(he ? 'הפעולה לא הושלמה.' : 'Could not complete the action.',{exact:true}).waitFor();
      assert.equal(await tile.getAttribute('aria-pressed'),'false');
      assert.equal(await tile.getAttribute('aria-busy'),'false');

      await open('');
      assert.equal(await tile.count(),0);
      await room.locator('[data-entity="' + relay + '"] .device-panel-launch').tap();
      await boiler.waitFor();
      assert.deepEqual(await calls(),[]);

      await page.goto(url + '&boiler-quick&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      await page.getByText(he ? 'תצוגת מכשירים' : 'Device display',{exact:true}).tap();
      const device = page.getByLabel(he ? 'מכשיר להתאמה אישית' : 'Device to customize',{exact:true});
      const option = page.getByRole('checkbox',{name:he ? 'הפעלה מהירה של הדוד' : 'Boiler quick power',exact:true});
      await device.selectOption(relay);
      assert.ok(await option.isChecked());
      await option.uncheck();
      assert.equal(await page.evaluate(()=>window.latest.room_overrides.studio.boiler_quick_power_entities),undefined);
      await option.check();
      assert.deepEqual(await page.evaluate(()=>window.latest.room_overrides.studio.boiler_quick_power_entities),[relay]);
      assert.deepEqual(await calls(),[]);
    } finally {
      await page.close();
    }
  }
}

async function assertKitchenApplianceTiles(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const url = base + '/fixture-home/home?toolbar-panels&room-link&appliance-tile-test&locale=' + locale;
    const room = page.getByRole('dialog',{name:'Studio',exact:true});
    const oven = room.locator('[data-entity="switch.demo_oven"] .device-tile');
    const cooktop = room.locator('[data-entity="switch.demo_cooktop"] .device-tile');
    const boiler = room.locator('[data-entity="switch.demo_appliance_boiler"]');
    const native = page.getByRole('dialog',{name:'Native entity details',exact:true});
    const state = state => page.evaluate(state=>window.bayitTest.setRoomState('switch.demo_oven',state),state);
    const calls = () => page.evaluate(()=>window.bayitTest.calls);
    const open = async flags => {
      await page.goto(url + flags);
      await page.getByRole('button',{name:'Studio',exact:true}).tap();
      await room.waitFor();
    };
    const closeNative = async id => {
      await native.waitFor();
      assert.equal(new URL(page.url()).searchParams.get('more-info-entity-id'),id);
      await native.getByRole('button',{name:'Close native details',exact:true}).tap();
      await page.waitForFunction(()=>!new URL(location.href).searchParams.has('more-info-entity-id'));
    };
    try {
      await open('&appliance-tiles&native-more-info=modern');
      await oven.waitFor();
      const [first, second] = await Promise.all([oven.boundingBox(),cooktop.boundingBox()]);
      assert.ok(first.width >= 44 && first.height >= 44 && second.width >= 44 && second.height >= 44 &&
        Math.abs(first.y - second.y) < 1 && Math.abs(first.x - second.x) >= first.width);
      assert.equal(await cooktop.getAttribute('data-action'),null);
      await cooktop.tap();
      await cooktop.press('Enter');
      assert.deepEqual(await page.evaluate(()=>window.bayitTest.moreInfoCalls),[]);
      await cooktop.press('Shift+Enter');
      await closeNative('switch.demo_cooktop');
      await cooktop.evaluate(button=>button.getRootNode().activeElement === button).then(value=>assert.ok(value));

      await oven.evaluate(button=>button.click());
      const bounds = await oven.boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2,bounds.y + bounds.height / 2);
      await page.mouse.down();
      await native.waitFor();
      await page.mouse.up();
      await closeNative('switch.demo_oven');
      assert.deepEqual(await calls(),[]);

      await page.mouse.move(bounds.x + bounds.width / 2,bounds.y + bounds.height / 2);
      await page.mouse.down();
      await state('on');
      await room.locator('.device-tile[data-action=turn_off]').waitFor();
      await page.mouse.up();
      assert.deepEqual(await calls(),[]);
      await state('off');
      await room.locator('.device-tile[data-action=turn_on]').waitFor();
      await oven.tap();
      await page.waitForFunction(()=>window.bayitTest.calls.length === 1);
      assert.equal(await oven.getAttribute('aria-pressed'),'false');
      await oven.tap();
      assert.equal((await calls()).length,1);
      await state('on');
      await room.locator('.device-tile[data-action=turn_off]').waitFor();
      await oven.press('Enter');
      await page.waitForFunction(()=>window.bayitTest.calls.length === 2);
      await state('off');
      await room.locator('.device-tile[data-action=turn_on]').waitFor();
      for (const missing of ['unknown','unavailable','starting']) {
        await state(missing);
        await room.locator('[data-entity="switch.demo_oven"] .device-tile:not([data-action])').waitFor();
        await oven.tap();
      }
      assert.deepEqual(await calls(), ['turn_on','turn_off'].map(service=>({
        type:'call_service',domain:'switch',service,service_data:{},target:{entity_id:'switch.demo_oven'},
      })));
      assert.equal(await boiler.getAttribute('data-room-appliance-tile'),null);
      await boiler.locator('.device-panel-launch').tap();
      await page.getByRole('dialog',{name:'Fixture boiler',exact:true}).waitFor();

      await open('');
      assert.equal(await oven.count(),0);
      assert.equal(await cooktop.count(),0);

      await page.goto(url + '&appliance-tiles&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      await page.getByText(he ? 'תצוגת מכשירים' : 'Device display',{exact:true}).tap();
      const device = page.getByLabel(he ? 'מכשיר להתאמה אישית' : 'Device to customize',{exact:true});
      const tile = page.getByRole('checkbox',{name:he ? 'הצגה כאריח מכשיר חשמלי' : 'Show as an appliance tile',exact:true});
      await device.selectOption('switch.demo_cooktop');
      assert.equal(await tile.isChecked(),true);
      await tile.uncheck();
      const setting = () => page.evaluate(()=>window.latest.room_overrides.studio);
      assert.ok(!(await setting()).appliance_tile_entities.includes('switch.demo_cooktop'));
      assert.deepEqual((await setting()).read_only_entities,['switch.demo_cooktop']);
      await device.selectOption('switch.demo_appliance_boiler');
      assert.equal(await tile.count(),0);
      assert.deepEqual(await calls(),[]);
    } finally {
      await page.close();
    }
  }
}


async function assertClippedRoomOrigin(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 640 }, isMobile:true, hasTouch:true, reducedMotion:'reduce',
  });
  try {
    for (const locale of ['en','he']) {
      await page.goto(base + '?popup-geometry&locale=' + locale);
      const title = page.getByRole('button', { name:'Studio', exact:true });
      const before = await title.evaluate(source => {
        const clip = source.closest('.room-scroll');
        source.closest('.rooms').style.paddingBlockEnd = '800px';
        const clipTop = clip.getBoundingClientRect().top;
        clip.scrollTop += source.getBoundingClientRect().top - clipTop + 10;
        const bounds = source.getBoundingClientRect();
        return { top:clip.scrollTop, cut:clipTop - bounds.top, height:bounds.height };
      });
      assert.ok(before.top > 14 && before.cut >= 8 && before.cut < before.height, JSON.stringify(before));
      // Call the room activation while the title is partially visible. A locator
      // click would scroll it fully into view on behalf of the automation.
      await title.evaluate(source => source.click());
      const dialog = page.getByRole('dialog', { name:'Studio', exact:true });
      await dialog.waitFor();
      const after = await title.evaluate(source => {
        const clip = source.closest('.room-scroll');
        return { top:clip.scrollTop, gap:source.getBoundingClientRect().top - clip.getBoundingClientRect().top };
      });
      assert.ok(after.top < before.top && after.gap >= 3,
        'Opening should reveal the original room heading ' + JSON.stringify({before,after}));
      await dialog.getByRole('button', { name:locale === 'he' ? 'סגירה' : 'Close', exact:true }).tap();
      await dialog.waitFor({ state:'hidden' });
      await page.locator('[data-popup-origin]').waitFor({ state:'detached' });
      assert.equal(await title.evaluate(source => source.closest('.room-scroll').scrollTop),before.top);
    }
  } finally {
    await page.close();
  }
}

async function assertDualLightDetails(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const url = base + '/fixture-home/home?configuration&inline-room-lights&locale=' + locale;
    const room = page.getByRole('dialog',{name:'Studio',exact:true});
    const details = page.getByRole('dialog',{name:'Desk lamp',exact:true});
    const dual = details.locator('.dual-light-detail-controls');
    const brightness = dual.getByRole('slider',{name:he ? 'בהירות' : 'Brightness',exact:true});
    const white = dual.getByRole('slider',{name:he ? 'גוון לבן' : 'White temperature',exact:true});
    const applyBrightness = dual.locator('button[data-action=set_brightness]');
    const applyWhite = dual.locator('button[data-action=set_color_temp_kelvin]');
    const calls = () => page.evaluate(()=>window.bayitTest.calls.filter(call=>call.type==='call_service'));
    const attrs = attrs => page.evaluate(attrs=>window.bayitTest.setFixtureAttributes('light.demo_lamp',attrs),attrs);
    try {
      await page.goto(url + '&dual-light-details');
      await page.locator('.shell[data-background=desert_sunset]').waitFor();
      await page.getByRole('button',{name:'Studio',exact:true}).tap();
      const inline = room.locator('[data-inline-light]');
      await inline.locator('.compact-light-controls input:visible').waitFor();
      assert.equal(await inline.locator('.compact-light-controls input:visible').count(),1);
      assert.equal(await inline.locator('.dual-light-detail-controls').count(),0);
      await inline.locator('.device-tile').press('Shift+Enter');
      await brightness.waitFor();
      await white.waitFor();
      assert.deepEqual(await Promise.all([brightness.inputValue(),white.inputValue()]),['40','3000']);
      assert.equal(await details.locator('[data-light-mode=compact-temperature]').count(),0);
      assert.ok(await dual.evaluate(node=>node.scrollWidth <= node.clientWidth &&
        [...node.querySelectorAll('input,button')].every(control=>control.getBoundingClientRect().height >= 44)));
      await brightness.focus();
      await white.focus();
      assert.deepEqual(await calls(),[]);
      await brightness.press('ArrowRight');
      await white.press('ArrowRight');
      assert.deepEqual(await calls(),[]);
      assert.deepEqual(await Promise.all([brightness.inputValue(),white.inputValue()]),['41','3001']);
      await applyBrightness.tap();
      await dual.locator('button[data-action=set_color_temp_kelvin]:enabled').waitFor();
      assert.equal(await white.inputValue(),'3001');
      await applyWhite.tap();
      await dual.locator('button[data-action=set_color_temp_kelvin]:enabled').waitFor();
      assert.deepEqual((await calls()).map(call=>[call.domain,call.service,call.service_data]),[
        ['light','turn_on',{brightness_pct:41}],['light','turn_on',{color_temp_kelvin:3001}],
      ]);

      await page.evaluate(()=>window.bayitTest.setRoomState('light.demo_lamp','off'));
      await attrs({brightness:0,color_temp_kelvin:2000});
      await dual.locator('output').filter({hasText:/^0%$/}).waitFor();
      await dual.locator('output').filter({hasText:/^2000 K$/}).waitFor();
      await attrs({brightness:undefined,color_temp_kelvin:undefined});
      await dual.getByText('—',{exact:true}).first().waitFor();
      assert.equal(await applyBrightness.isDisabled(),true);
      assert.equal(await applyWhite.isDisabled(),true);
      await white.focus();
      assert.equal((await calls()).length,2);
      await page.evaluate(()=>window.bayitTest.setLightModes('light.demo_lamp',['color_temp','rgb']));
      await dual.waitFor({state:'hidden'});
      await details.locator('input[type=color]').waitFor();
      await page.evaluate(()=>window.bayitTest.setRoomState('light.demo_lamp','unavailable'));
      await details.getByRole('slider').first().waitFor({state:'hidden'});
      assert.equal((await calls()).length,2);

      await page.goto(url + '#device/studio/light.demo_lamp');
      await details.locator('.compact-light-controls input:visible').waitFor();
      assert.equal(await details.locator('.compact-light-controls input:visible').count(),1);
      assert.equal(await dual.count(),0);

      await page.goto(url + '&dual-light-details&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      await page.getByText(he ? 'תצוגת מכשירים' : 'Device display',{exact:true}).tap();
      await page.getByLabel(he ? 'מכשיר להתאמה אישית' : 'Device to customize',{exact:true}).selectOption('light.demo_lamp');
      const checkbox = page.getByRole('checkbox',{name:he ? 'הצגת שני המחוונים בפרטי התאורה' : 'Show both sliders in light details',exact:true});
      assert.equal(await checkbox.isChecked(),true);
      await checkbox.uncheck();
      const saved = () => page.evaluate(()=>window.latest.room_overrides.studio);
      assert.equal((await saved()).dual_light_detail_entities,undefined);
      assert.ok((await saved()).inline_light_entities.includes('light.demo_lamp'));
      await checkbox.check();
      assert.deepEqual((await saved()).dual_light_detail_entities,['light.demo_lamp']);
      assert.deepEqual(await calls(),[]);
    } finally {
      await page.close();
    }
  }
}

async function assertCompactLightReadings(browser) {
  for (const locale of ['en','he']) {
    const page = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(8000);
    const he = locale === 'he';
    const url = base + '/fixture-home/home?configuration&inline-room-lights&locale=' + locale;
    const route = '#device/studio/light.demo_lamp';
    const opt = '&compact-light-reading';
    const room = page.getByRole('dialog',{name:'Studio',exact:true});
    const details = page.getByRole('dialog',{name:'Desk lamp',exact:true});
    const compact = panel => panel.locator('.compact-light-controls');
    const bright = panel => compact(panel).locator('input[data-action=set_brightness]:visible');
    const tone = panel => compact(panel).locator('input[data-action=set_color_temp_kelvin]:visible');
    const mode = panel => compact(panel).locator('.round-action');
    const reading = panel => compact(panel).locator('.field-row:visible output');
    const calls = () => page.evaluate(()=>window.bayitTest.calls.filter(call=>call.type==='call_service'));
    const attrs = attrs => page.evaluate(attrs=>window.bayitTest.setFixtureAttributes('light.demo_lamp',attrs),attrs);
    try {
      await page.goto(url + opt);
      await page.getByRole('button',{name:'Studio',exact:true}).tap();
      await bright(room).waitFor();
      assert.equal(await bright(room).getAttribute('min'),'1');
      const missingReading = he ? 'אין ערך מדווח' : 'No reported value';
      assert.equal(await reading(room).textContent(),'—');
      assert.equal(await bright(room).getAttribute('aria-valuetext'), missingReading);
      await bright(room).focus();
      await mode(room).tap();
      await tone(room).waitFor();
      assert.equal(await reading(room).textContent(),'—');
      assert.equal(await tone(room).getAttribute('aria-valuetext'), missingReading);
      assert.ok(await compact(room).evaluate(node=>node.scrollWidth <= node.clientWidth));
      assert.deepEqual(await calls(),[]);

      await room.locator('[data-inline-light] .device-tile').press('Shift+Enter');
      await bright(details).waitFor();
      assert.equal(await bright(details).getAttribute('min'),'1');
      assert.equal(await reading(details).textContent(),'—');
      assert.equal(await details.locator('.compact-light-power').getAttribute('data-action'),'turn_on');
      await attrs({brightness:0});
      await reading(details).getByText(/0%/).waitFor();
      assert.equal(await bright(details).getAttribute('aria-valuetext'), '0%');
      await attrs({brightness:102,color_temp_kelvin:3200});
      await reading(details).getByText(/40%/).waitFor();
      await mode(details).tap();
      await reading(details).getByText(/3200 K/).waitFor();
      assert.equal(await tone(details).getAttribute('aria-valuetext'), '3200 K');
      assert.deepEqual(await calls(),[]);
      await mode(details).tap();
      await bright(details).press('Home');
      await page.waitForFunction(()=>window.bayitTest.calls.filter(call=>call.type==='call_service').length===1);
      await details.locator('.compact-light-power[data-action=turn_off]:enabled').waitFor();
      assert.deepEqual((await calls())[0].service_data,{brightness_pct:1});
      await mode(details).tap();
      await tone(details).press('ArrowRight');
      await page.waitForFunction(()=>window.bayitTest.calls.filter(call=>call.type==='call_service').length===2);
      assert.deepEqual((await calls())[1].service_data,{color_temp_kelvin:3201});
      await page.evaluate(()=>window.bayitTest.setRoomState('light.demo_lamp','unavailable'));
      await compact(details).waitFor({state:'hidden'});
      assert.equal((await calls()).length,2);

      await page.goto(url + route);
      await bright(details).waitFor();
      assert.equal(await bright(details).getAttribute('min'),'0');
      await page.goto(url + opt + '&dual-light-details' + route);
      const dual = details.locator('.dual-light-detail-controls');
      await dual.locator('input[data-action=set_brightness]').waitFor();
      assert.equal(await dual.locator('input[data-action=set_brightness]').getAttribute('min'),'0');
      assert.equal(await dual.locator('button[data-action=set_brightness]').count(),1);
      await page.evaluate(()=>window.bayitTest.setLightModes('light.demo_lamp',['color_temp','rgb']));
      await details.locator('input[type=color]').waitFor();
      assert.equal(await dual.count(),0);
      assert.deepEqual(await calls(),[]);

      await page.goto(url + opt + '&editor');
      await page.getByText(he ? 'חדרים' : 'Rooms',{exact:true}).tap();
      await page.getByLabel(he ? 'חדר להתאמה אישית' : 'Room to customize',{exact:true}).selectOption('studio');
      await page.getByText(he ? 'תצוגת מכשירים' : 'Device display',{exact:true}).tap();
      await page.getByLabel(he ? 'מכשיר להתאמה אישית' : 'Device to customize',{exact:true}).selectOption('light.demo_lamp');
      const option = page.getByRole('checkbox',{name:he ? 'הצגת ערכים מדווחים בפקדי תאורה קומפקטיים' : 'Show reported values in compact light controls',exact:true});
      assert.equal(await option.isChecked(),true);
      await option.uncheck();
      const saved = () => page.evaluate(()=>window.latest.room_overrides.studio);
      assert.equal((await saved()).compact_light_reading_entities,undefined);
      assert.ok((await saved()).inline_light_entities.includes('light.demo_lamp'));
      await option.check();
      assert.deepEqual((await saved()).compact_light_reading_entities,['light.demo_lamp']);
      assert.deepEqual(await calls(),[]);
    } finally {
      await page.close();
    }
  }
}

try {
  for (const [engine, launcher] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await launcher.launch({ headless: true });
    try {
      await assertHomePreferenceAliases(browser);
      await assertSharedAppearance(browser);
      await assertClippedRoomOrigin(browser);
      await assertPopupScrollMemory(browser);
      console.log(engine + ': popup scroll survives reload and remains scoped to the room and dashboard');
      await assertCompactSettings(browser);
      await assertToolbarLockPalette(browser);
      console.log(engine + ': semantic toolbar lock colors, contrast and scope');
      await assertCompactAutomationActions(browser);
      console.log(engine + ': compact Automation actions and editor scope');
      await assertOverviewClimateDiscovery(browser);
      console.log(engine + ': editable active climate discovery, passive rows and live scope');
      await assertShortcutDetailRoutes(browser);
      await assertCompactInlineLightLayout(browser);
      await assertCompactRoomHeater(browser);
      await assertSharedHeaterLevelInterop(browser);
      console.log(engine + ': compact room heater, confirmed idle and safe active controls');
      console.log(engine + ': scoped panel and native shortcut destinations, safe taps, focus return and editor persistence');
      console.log(engine + ': independent browser appearance and admin household defaults');
      await assertNativeRoomCoverHeader(browser);
      console.log(engine + ': native room cover header, focus restoration, editor and device isolation');
      await assertNativeRoomLightHold(browser);
      console.log(engine + ': opt-in native room light holds, regular taps, focus and room isolation');
      await assertRoomDeviceIcons(browser);
      console.log(engine + ': per-room device icon editing, native picker, fallback and reset');
      await assertHeaderRoomLayout(browser);
      await assertClassicRoomTitleLanes(browser);
      await assertWideHomeAlignment(browser);
      await assertWideClassicRoomControls(browser);
      console.log(engine + ': room titles, responsive shortcut lanes and keyboard focus');
      await assertSetupFooterLayout(browser);
      console.log(engine + ': setup footer stays clear of the scrollable editor');
      await assertSetupDrafts(browser);
      console.log(engine + ': setup drafts survive closing, preserve conflicts, and retry safely');
      await assertHomeMaterial(browser);
      console.log(engine + ': Home glass, accessibility material, cover states and room labels');

      const routesPage = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const rtlRoutes = engine === 'WebKit';
      const routeUrl = base + '/fixture-home/home?popup-routes&locale=' + (rtlRoutes ? 'he' : 'en');
      const delayedUrl = routeUrl + '&defer-popup-hass';
      const routeDialog = routesPage.getByRole('dialog');
      const routeClose = routeDialog.getByRole('button', { name: rtlRoutes ? 'סגירה' : 'Close', exact: true });
      const routeBack = routeDialog.getByRole('button', { name: rtlRoutes ? 'חזרה לחדר' : 'Back to room', exact: true });
      const deskHeading = routeDialog.getByRole('heading', { name: 'Desk lamp', exact: true });
      const studioHeading = routeDialog.getByRole('heading', { name: 'Studio', exact: true });
      const routeErrors = [];
      routesPage.on('pageerror', error => routeErrors.push(error.message));

      await routesPage.goto(delayedUrl + '#legacy-lamp');
      await routesPage.waitForFunction(() => window.bayitTest);
      assert.equal(await routeDialog.count(), 0);
      await routesPage.evaluate(() => window.bayitTest.loadPopupHass());
      await deskHeading.waitFor();
      assert.equal(await routesPage.locator('[data-popup-origin]').count(), 0);
      assert.equal(await routeBack.count(), 0);
      assert.equal(await routeClose.evaluate(button => button.getRootNode().activeElement === button), true);
      assert.equal(new URL(routesPage.url()).hash, '#legacy-lamp');
      await routesPage.reload();
      await routesPage.waitForFunction(() => window.bayitTest);
      await routesPage.evaluate(() => window.bayitTest.loadPopupHass());
      await deskHeading.waitFor();
      const more = routeDialog.getByRole('button', { name: rtlRoutes ? 'מידע נוסף' : 'More info', exact: true });
      await more.tap();
      await routeDialog.waitFor();
      assert.deepEqual(await routesPage.evaluate(() => [window.bayitTest.moreInfoCalls, window.bayitTest.moreInfoHashes]),
        [['light.demo_lamp'], ['#legacy-lamp']]);
      assert.equal(new URL(routesPage.url()).search, new URL(delayedUrl).search);
      await routeClose.tap();
      await routeDialog.waitFor({ state: 'hidden' });

      await routesPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      await studioHeading.waitFor();
      assert.equal(new URL(routesPage.url()).hash, '#room-studio');
      assert.equal(await routesPage.locator('.room[data-popup-origin]').count(), 1);
      assert.equal(await routesPage.locator('.room[data-current]').count(), 1);
      const roomLamp = routeDialog.locator('[data-entity="light.demo_lamp"] .device-tile');
      await roomLamp.press('Shift+Enter');
      await deskHeading.waitFor();
      assert.equal(new URL(routesPage.url()).hash, '#device/studio/light.demo_lamp');
      await routeBack.tap();
      await studioHeading.waitFor();
      assert.equal(new URL(routesPage.url()).hash, '#room-studio');
      assert.equal(await roomLamp.evaluate(button => button.getRootNode().activeElement === button), true);
      await roomLamp.press('Shift+Enter');
      await deskHeading.waitFor();
      await routesPage.evaluate(() => history.back());
      await studioHeading.waitFor();
      assert.equal(await routesPage.locator('[data-popup-origin]').count(), 0);
      assert.equal(await routesPage.locator('.room[data-current]').count(), 0);
      await routesPage.evaluate(() => history.forward());
      await deskHeading.waitFor();
      await routeClose.tap();
      await routeDialog.waitFor({ state: 'hidden' });
      await routesPage.waitForURL(delayedUrl);
      await routesPage.goto(routeUrl + '#room-studio');
      await studioHeading.waitFor();
      assert.equal(await routesPage.locator('.room[data-current], .room[data-popup-origin]').count(), 0);
      await routeClose.tap();
      await routeDialog.waitFor({ state: 'hidden' });
      await routesPage.goto(delayedUrl);
      await routesPage.waitForFunction(() => window.bayitTest);
      await routesPage.evaluate(() => window.bayitTest.loadPopupHass());

      // Closing an animated source-open panel must remove its route before a refresh can reopen it.
      await routesPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      await studioHeading.waitFor();
      const hashDuringDismissal = await routeClose.evaluate(button => {
        button.click();
        return location.hash;
      });
      assert.equal(hashDuringDismissal, '');
      await routesPage.reload();
      await routesPage.waitForFunction(() => window.bayitTest);
      await routesPage.evaluate(() => window.bayitTest.loadPopupHass());
      await routeDialog.waitFor({ state: 'hidden' });

      await routesPage.goto(routeUrl + '#legacy-viewer');
      await routeDialog.getByRole('heading', { name: 'Device viewer', exact: true }).waitFor();
      await routesPage.goto(routeUrl + '#device/studio/switch.demo_heater');
      await routeDialog.getByRole('heading', { level: 2, name: 'Room heater', exact: true }).waitFor();
      assert.equal(await routeDialog.locator('.action-list button').count(), 0);
      await routesPage.evaluate(() => { location.hash = '#native-anchor'; });
      await routeDialog.waitFor({ state: 'hidden' });
      assert.equal(new URL(routesPage.url()).hash, '#native-anchor');
      for (const hash of ['#legacy-hidden', '#legacy-link', '#boiler-schedule-edit']) {
        await routesPage.goto(routeUrl + hash);
        await routesPage.waitForFunction(() => window.bayitTest);
        assert.equal(await routeDialog.count(), 0);
        assert.equal(new URL(routesPage.url()).hash, hash);
      }
      await routesPage.evaluate(() => {
        history.pushState(null, '', '/other/view#room-studio');
        window.dispatchEvent(new CustomEvent('location-changed'));
      });
      assert.equal(await routeDialog.count(), 0);
      assert.equal(new URL(routesPage.url()).pathname, '/other/view');
      assert.equal(await routesPage.evaluate(() => window.bayitTest.calls.length), 0);
      assert.deepEqual(routeErrors, []);

      await routesPage.goto(routeUrl + '&embedded-popup-card#legacy-lamp');
      await routesPage.waitForFunction(() => window.bayitTest);
      assert.equal(await routeDialog.count(), 0);
      await routesPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      await studioHeading.waitFor();
      assert.equal(new URL(routesPage.url()).hash, '#legacy-lamp');
      await routesPage.close();

      const infoPage = await browser.newPage({ viewport: { width: 320, height: 640 }, hasTouch: true, reducedMotion: 'reduce' });
      infoPage.setDefaultTimeout(8000);
      const nativeDetails = infoPage.getByRole('dialog', { name: 'Native entity details', exact: true });
      const nativeClose = nativeDetails.getByRole('button', { name: 'Close native details', exact: true });
      const openFixtureRoom = async mode => {
        const url = base + '/fixture-home/home?device-panel&native-more-info=' + mode;
        await infoPage.goto(url);
        await infoPage.getByRole('button', { name: 'Studio', exact: true }).tap();
        return { url, dialog: infoPage.getByRole('dialog', { name: 'Studio', exact: true }) };
      };
      const openInfo = async dialog => {
        const control = dialog.getByRole('button', { name: 'More info · Studio air conditioner', exact: true });
        await control.evaluate(button => {
          const root = button.getRootNode();
          const body = root.querySelector('.modal-body');
          const spacer = document.createElement('div');
          spacer.style.height = '450px';
          body.append(spacer);
          body.style.maxHeight = '240px';
          body.scrollTop = 42;
          button.click();
        });
        await nativeDetails.waitFor();
        return control;
      };
      for (const mode of ['legacy', 'modern']) {
        const { url, dialog } = await openFixtureRoom(mode);
        const control = await openInfo(dialog);
        assert.equal(new URL(infoPage.url()).hash, '#room-studio');
        assert.equal(new URL(infoPage.url()).searchParams.get('more-info-entity-id'),
          mode === 'modern' ? 'climate.demo_air' : null);
        assert.equal(await infoPage.locator('bayit-dashboard dialog[data-kind=room]').evaluate(node => node.open), true);
        // An event with the right tag from an unrelated node cannot complete this return.
        await infoPage.evaluate(() => {
          document.querySelector('bayit-dashboard').shadowRoot.querySelector('.modal-body').scrollTop = 103;
          window.dispatchEvent(new CustomEvent('dialog-closed', { detail: { dialog: 'ha-more-info-dialog' } }));
        });
        await nativeClose.tap();
        await nativeDetails.waitFor({ state: 'hidden' });
        await infoPage.waitForFunction(() => {
          const root = document.querySelector('bayit-dashboard').shadowRoot;
          return !history.state?.dialog && root.querySelector('.modal-body').scrollTop === 42 &&
            root.activeElement?.getAttribute('aria-label') === 'More info · Studio air conditioner';
        });
        assert.equal(await control.evaluate(button => button.getRootNode().activeElement === button), true);
        assert.equal(infoPage.url(), url + '#room-studio');
        assert.deepEqual(await infoPage.evaluate(() => window.bayitTest.moreInfoHashes), ['#room-studio']);
        assert.equal(await infoPage.evaluate(() => window.bayitTest.calls.length), 0);
      }
      const { dialog: interrupted } = await openFixtureRoom('modern');
      await openInfo(interrupted);
      await infoPage.evaluate(() => {
        history.pushState(null, '', '/fixture-home/home?device-panel&native-more-info=modern#outside-section');
        window.dispatchEvent(new CustomEvent('location-changed'));
      });
      await interrupted.waitFor({ state: 'hidden' });
      await nativeClose.tap();
      await nativeDetails.waitFor({ state: 'hidden' });
      assert.equal(new URL(infoPage.url()).hash, '#outside-section');
      await infoPage.reload();
      await infoPage.waitForFunction(() => window.bayitTest);
      assert.equal(await interrupted.count(), 0);

      await infoPage.evaluate(() => document.body.dispatchEvent(new CustomEvent('hass-more-info', {
        detail: { entityId: 'light.demo_lamp' }, bubbles: true, composed: true,
      })));
      await nativeDetails.waitFor();
      await nativeClose.tap();
      await nativeDetails.waitFor({ state: 'hidden' });
      assert.equal(await interrupted.count(), 0);
      await infoPage.close();
      console.log(engine + ': native details return to the mounted Bayit popup, exact route, scroll and source focus');

      for (const [locale, width] of [['en', 320], ['he', 390], ['en', 430]]) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '?locale=' + locale);
        await page.waitForFunction(() => window.bayitTest);
        assert.equal(await page.evaluate(() => window.bayitTest.registrations.filter(
          item => item.type === 'bayit-9' && item.strategyType === 'dashboard').length), 1);
        await page.getByRole('heading', { name: locale === 'he' ? 'בית 9' : 'Bayit 9' }).waitFor();
        await page.getByRole('button', { name: 'Studio', exact: true }).tap();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('heading', { name: 'Studio' }).waitFor();
        if (width <= 420) {
          const roomHeader = await dialog.evaluate(async modal => {
            await Promise.allSettled(modal.getAnimations().map(animation => animation.finished));
            const panel = modal.getBoundingClientRect();
            const close = modal.querySelector('[data-role=close]').getBoundingClientRect();
            return [panel.left, panel.right, close.width, close.height,
              panel.right - close.right, close.top - panel.top].map(Math.round);
          });
          assert.deepEqual(roomHeader, [16, width - 16, 50, 50, 18, 18]);
        }
        await dialog.getByRole('button', { name: 'Desk lamp · ' + (locale === 'he' ? 'הדלקה' : 'Turn on'), exact: true }).tap();
        await page.waitForFunction(() => window.bayitTest.calls.length > 0);
        const call = await page.evaluate(() => window.bayitTest.calls[0]);
        assert.equal(call.domain, 'light');
        assert.equal(call.service, 'turn_on');
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        const overflows = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflows, false, 'The dashboard overflows horizontally');
        assert.deepEqual(errors, []);
        await page.close();
        console.log(engine + ' ' + locale + ' ' + width + ': strategy, room modal, light command, close');
      }

      for (const locale of ['en', 'he']) {
        const statusPage = await browser.newPage({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce' });
        await statusPage.goto(base + '?room-status&locale=' + locale);
        const fixtureRoom = statusPage.locator('.room[data-room="bayit_room_status"]');
        const strip = fixtureRoom.locator('.room-status-strip');
        const active = strip.locator('[data-badge="activity"]');
        await active.locator('ha-icon[icon="mdi:timer-outline"]').waitFor();
        await strip.locator('[data-badge="availability"]:not([hidden])').waitFor();
        assert.equal(await strip.locator('.room-status:not([hidden])').count(), 3);
        assert.match(await strip.locator('[data-badge="temperature"]').innerText(), /23\.5°(?!C)/);
        assert.match(await active.innerText(), /\d+:\d{2}/);
        assert.match(await strip.locator('[data-badge="availability"]').getAttribute('aria-label'), /Desk light/);
        assert.equal(await fixtureRoom.locator('.room-count').innerText(), '—');
        assert.equal(await fixtureRoom.locator('.quick-button[data-entity="cover.demo_window"]').getAttribute('data-tone'), 'moving');
        const fits320 = await strip.evaluate(group => [...group.querySelectorAll('.room-status:not([hidden])')].every(chip => {
          const bounds = group.getBoundingClientRect();
          const tile = chip.getBoundingClientRect();
          const text = chip.querySelector('span');
          return tile.left >= bounds.left && tile.right <= bounds.right + 1 && text.scrollWidth <= text.clientWidth + 1;
        }));
        assert.equal(fits320, true, 'The combined readings fit at 320px');
        const oldHeight = (await fixtureRoom.boundingBox()).height;
        await statusPage.evaluate(() => window.bayitTest.setRoomState('timer.demo_room', 'idle'));
        await active.locator('ha-icon[icon="mdi:air-conditioner"]').waitFor();
        assert.match(await active.innerText(), /26°(?!C)/);
        assert.equal((await fixtureRoom.boundingBox()).height, oldHeight);
        await statusPage.evaluate(() => window.bayitTest.setRoomState('cover.demo_window', 'closed'));
        await fixtureRoom.locator('.quick-button[data-entity="cover.demo_window"][data-tone="quiet"]').waitFor();
        await statusPage.evaluate(() => window.bayitTest.setRoomState('light.demo_unavailable', 'on'));
        await strip.locator('[data-badge="availability"]').waitFor({ state: 'hidden' });
        assert.equal(await fixtureRoom.locator('.room-count').innerText(), '1');
        await statusPage.evaluate(() => window.bayitTest.setRoomState('sensor.demo_temperature', 'unavailable'));
        await strip.locator('[data-badge="temperature"]').filter({ hasText: '19°' }).waitFor();
        await strip.locator('[data-badge="availability"]:not([hidden])').waitFor();
        assert.match(await active.innerText(), /26°(?!C)/);
        for (const width of [320, 391, 430]) {
          await statusPage.setViewportSize({ width, height: 845 });
          const arrangement = await fixtureRoom.evaluate(room => {
            const controls = [...room.querySelectorAll('.quick-button')].map(button => button.getBoundingClientRect());
            const heading = room.querySelector('.room-title').getBoundingClientRect();
            const rows = [...new Set(controls.map(box => box.top))];
            return [rows.map(top => controls.filter(box => box.top === top).length),
              heading.top >= Math.max(...controls.map(box => box.bottom))];
          });
          assert.deepEqual(arrangement, width <= 420 ? [[3, 3], true] : [[2, 2, 2], false]);
        }
        await statusPage.setViewportSize({ width: 320, height: 845 });
        await statusPage.evaluate(() => window.bayitTest.setRoomLayout('header'));
        const headingY = await fixtureRoom.locator('.room-title').boundingBox();
        assert.ok(headingY.y < (await strip.boundingBox()).y);
        await statusPage.evaluate(() => window.bayitTest.setRoomLayout('classic'));
        for (const [width, columns, gridWidth] of [[860, 2, 430], [900, 4, 804], [1280, 4, 900]]) {
          await statusPage.setViewportSize({ width, height: 721 });
          await statusPage.waitForFunction(({ width, height }) => {
            const card = document.querySelector('bayit-dashboard');
            const shell = card.shadowRoot.querySelector('.shell');
            const viewport = window.visualViewport;
            const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
            const fittedHeight = parseFloat(shell.style.getPropertyValue('--bayit-view-height'));
            return window.innerWidth === width && Math.abs(bottom - height) < 1 &&
              Math.abs(fittedHeight - (bottom - card.getBoundingClientRect().top)) < 1;
          }, { width, height: 721 });
          const measured = await statusPage.locator('.rooms').evaluate(grid => {
            const box = grid.getBoundingClientRect();
            return [getComputedStyle(grid).gridTemplateColumns.split(' ').length, Math.round(box.width), Math.round(box.left)];
          });
          assert.deepEqual(measured, [columns, gridWidth, (width - gridWidth) / 2]);
          const alignment = await fixtureRoom.locator('.room-title').evaluate(title => {
            const glyph = title.querySelector('ha-icon').getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(title.querySelector('.room-name'));
            const text = range.getBoundingClientRect();
            return Math.abs((text.left + text.width / 2) - (glyph.left + glyph.width / 2));
          });
          assert.ok(alignment < 45, 'Classic room labels stay close to their icon on wide screens');
          if (width === 1280) assert.equal(Math.round((await fixtureRoom.boundingBox()).height), 208);
        }
        assert.equal(await statusPage.evaluate(() => window.bayitTest.calls.length), 0);
        await statusPage.close();
      }

      for (const locale of ['en', 'he']) {
        const reduce = locale === 'he';
        const page = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true,
          reducedMotion: reduce ? 'reduce' : 'no-preference' });
        page.setDefaultTimeout(8000);
        await page.goto(base + '?room-status&cover-feedback&locale=' + locale);
        const room = page.locator('.room[data-room="bayit_room_status"]');
        const shade = room.locator('.quick-button[data-entity="cover.demo_window"]');
        const indicator = (direction, busy) => shade.and(page.locator(
          '.quick-button[data-tone="moving"][data-transition="' + direction + '"][aria-busy="' + busy + '"]'));
        const state = value => page.evaluate(value => window.bayitTest.setRoomState('cover.demo_window', value), value);
        const finish = (index, failed) => page.evaluate(([index, failed]) => window.bayitTest.finishCover(index, failed), [index, failed]);
        await shade.tap();
        await indicator('opening', true).waitFor();
        assert.match(await shade.getAttribute('aria-label'), reduce ? /נשלחה בקשת פתיחה · עצירה/ : /Opening requested · Stop/);
        assert.equal(await shade.evaluate(el => getComputedStyle(el, '::before').animationName), reduce ? 'none' : 'cover-direction');

        // A second tap stops the same cover before either movement or acknowledgement is reported.
        await shade.tap();
        assert.deepEqual(await page.evaluate(() => window.bayitTest.calls), ['open_cover', 'stop_cover'].map(service => ({
          type: 'call_service', domain: 'cover', service, service_data: {}, target: { entity_id: 'cover.demo_window' },
        })));
        await shade.and(page.locator('[data-transition=""][aria-busy="true"]')).waitFor();
        await finish(0, true);
        await finish(1);
        await shade.and(page.locator('[data-tone="quiet"][aria-busy="false"]')).waitFor();
        const note = page.locator('.notice[data-role="page-notice"]');
        await note.filter({ hasText: reduce ? 'נשלחה פקודה אל' : 'Command sent to' }).waitFor();

        // Closing has distinct feedback, and a known stop can settle before a new direction.
        await state('open');
        await shade.tap();
        await indicator('closing', true).waitFor();
        assert.match(await shade.getAttribute('aria-label'), reduce ? /נשלחה בקשת סגירה/ : /Closing requested/);
        await state('closing');
        await shade.and(page.getByRole('button', { name: reduce ? /^Window shade · נסגר ·/ : /^Window shade · Closing ·/ })).waitFor();
        await shade.press('Shift+Enter');
        const details = page.getByRole('dialog');
        const stop = details.locator('[data-action="stop"]');
        await stop.waitFor();
        assert.equal(await stop.isEnabled(), true);
        assert.equal(await details.locator('[data-action="open"]').isDisabled(), true);
        await stop.tap();
        await page.keyboard.press('Escape');
        await details.waitFor({ state: 'hidden' });
        await finish(2);
        await finish(3);
        await indicator('closing', true).waitFor();
        await state('closed');
        await shade.and(page.locator('[data-tone="quiet"][aria-busy="false"]')).waitFor();
        await shade.tap();
        await indicator('opening', true).waitFor();
        await state('unavailable');
        await shade.and(page.locator('[data-transition=""][data-tone="quiet"][aria-busy="false"]')).waitFor();
        assert.match(await room.locator('[data-badge="availability"]').getAttribute('aria-label'), /Window shade/);
        await finish(4, true);
        await note.filter({ hasText: reduce ? 'הפעולה לא הושלמה.' : 'Could not complete the action.' }).waitFor();
        await page.evaluate(() => window.bayitTest.setRoomState('light.demo_unavailable', 'on'));
        await room.locator('.quick-button[data-entity="light.demo_unavailable"][data-tone="warm"][data-transition=""]').waitFor();
        assert.deepEqual(await page.evaluate(() => window.bayitTest.calls.map(call => call.service)),
          ['open_cover', 'stop_cover', 'close_cover', 'stop_cover', 'open_cover']);
        await page.close();
        console.log(engine + ' ' + locale + ' 320: delayed cover feedback, stop, reversal, reduced motion, and availability');
      }

      const mediaPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      mediaPage.setDefaultTimeout(8000);
      const mediaErrors = [];
      mediaPage.on('pageerror', error => mediaErrors.push(error.message));
      await mediaPage.goto(base + '?toolbar-panels&room-link');
      await mediaPage.getByRole('button', { name: 'Appearance', exact: true }).click();
      await mediaPage.getByRole('button', { name: 'Media', exact: true }).click();
      const media = mediaPage.getByRole('dialog');
      await media.getByText('Fixture artist', { exact: true }).waitFor();
      assert.equal(await media.locator('.now-playing-source').innerText(), 'Radio');
      const cover = media.locator('.now-playing img');
      await cover.waitFor();
      const progress = media.getByRole('progressbar', { name: 'Playback progress' });
      const first = await progress.evaluate(meter => meter.value);
      await mediaPage.waitForFunction(second =>
        document.querySelector('bayit-dashboard').shadowRoot.querySelector('.now-playing progress').value > second, first);
      await media.getByRole('button', { name: 'Next', exact: true }).click();
      await media.getByRole('button', { name: 'Pause playback', exact: true }).click();
      await media.getByRole('button', { name: 'Play', exact: true }).waitFor();
      const paused = await progress.evaluate(meter => meter.value);
      await mediaPage.evaluate(() => window.bayitTest.setMediaArt('https://fixture.invalid/art'));
      await cover.waitFor({ state: 'hidden' });
      assert.equal(await cover.getAttribute('src'), null);
      await media.getByText('Station', { exact: true }).waitFor();
      assert.equal(await progress.evaluate(meter => meter.value), paused);
      await media.getByRole('button', { name:'Volume up', exact:true }).last().click();
      const calls = await mediaPage.evaluate(() => window.bayitTest.calls.map(request => [request.service,request.target.entity_id]));
      assert.deepEqual(calls,[['media_next_track','media_player.demo_speaker'],['media_pause','media_player.demo_speaker'],
        ['volume_up','media_player.demo_tv']]);
      await media.getByRole('button', { name:'Close', exact:true }).click();
      await media.waitFor({ state:'hidden' });
      await mediaPage.getByRole('button', { name:'Appearance', exact:true }).click();
      await mediaPage.getByRole('button', { name:'Robot vacuum', exact:true }).click();
      await mediaPage.getByRole('button', { name:'Start cleaning', exact:true }).waitFor();
      await mediaPage.getByRole('button', { name:'Close', exact:true }).click();
      const studio = mediaPage.getByRole('button', {name:'Studio',exact:true});
      const tvHeader = mediaPage.getByRole('button', {name:'Television · More info',exact:true});
      await studio.click();
      await tvHeader.click();
      await mediaPage.waitForFunction(() => window.bayitTest.moreInfoCalls[0] === 'media_player.demo_tv');
      const bounds = await tvHeader.boundingBox();
      await mediaPage.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await mediaPage.mouse.down();
      await mediaPage.getByRole('heading', {name:'Media',exact:true}).waitFor();
      await mediaPage.mouse.up();
      assert.deepEqual(await mediaPage.evaluate(() => window.bayitTest.moreInfoCalls), ['media_player.demo_tv']);
      await mediaPage.getByRole('button', {name:'Back to room',exact:true}).click();
      assert.equal(await tvHeader.evaluate(element => element.getRootNode().activeElement === element), true);
      await tvHeader.press('Shift+Enter');
      await mediaPage.getByRole('heading', {name:'Media',exact:true}).waitFor();
      await mediaPage.getByRole('button', {name:'Close',exact:true}).click();
      await studio.click();
      const vacuumHeader = mediaPage.getByRole('button', {name:'Robot · Open Robot vacuum',exact:true});
      await vacuumHeader.click();
      const vacuum = mediaPage.getByRole('dialog', { name:'Robot vacuum',exact:true });
      await vacuum.getByRole('button', { name:'Start cleaning',exact:true }).waitFor();
      await vacuum.getByRole('button', { name:'Back to room',exact:true }).click();
      assert.equal(await vacuumHeader.evaluate(button => button.getRootNode().activeElement === button),true);
      const robotBounds = await vacuumHeader.boundingBox();
      await mediaPage.mouse.move(robotBounds.x + robotBounds.width / 2, robotBounds.y + robotBounds.height / 2);
      await mediaPage.mouse.down();
      await mediaPage.waitForFunction(() => window.bayitTest.moreInfoCalls.includes('vacuum.demo_robot'));
      await mediaPage.mouse.up();
      await vacuumHeader.press('Shift+Enter');
      await mediaPage.waitForFunction(() => window.bayitTest.moreInfoCalls.filter(entity => entity === 'vacuum.demo_robot').length === 2);
      assert.deepEqual(await mediaPage.evaluate(() => window.bayitTest.calls.map(request => request.service)),
        ['media_next_track','media_pause','volume_up']);
      await mediaPage.goto(base + '?toolbar-panels&room-link&editor');
      await mediaPage.getByText('Rooms', {exact:true}).click();
      await mediaPage.getByLabel('Room to customize', {exact:true}).selectOption('studio');
      const roomMediaLink = mediaPage.getByLabel('Open on media press and hold · Television', {exact:true});
      const roomVacuumLink = mediaPage.getByLabel('Vacuum panel · Robot', {exact:true});
      assert.equal(await roomMediaLink.inputValue(),'media-panel');
      assert.equal(await roomVacuumLink.inputValue(),'vacuum-panel');
      await roomVacuumLink.selectOption('');
      assert.equal(await mediaPage.evaluate(() => window.latest.room_overrides.studio.vacuum_panel_links), undefined);
      assert.equal(await roomMediaLink.inputValue(),'media-panel');
      await roomMediaLink.selectOption('');
      assert.equal(await mediaPage.evaluate(() => window.latest.room_overrides.studio.media_panel_links), undefined);
      await mediaPage.getByText('Toolbar and extra screens', { exact:true }).click();
      await mediaPage.getByRole('button', {name:'Media',exact:true}).click();
      await mediaPage.getByRole('button', {name:'TV',exact:true}).click();
      await mediaPage.getByRole('button', {name:'Television',exact:true}).click();
      await mediaPage.getByLabel('Display as', { exact:true }).selectOption('now_playing');
      assert.equal(await mediaPage.evaluate(() => window.latest.toolbar.find(item => item.kind === 'media')
        .sections[1].entities[0].role), 'now_playing');
      assert.deepEqual(mediaErrors, []);
      await mediaPage.close();
      console.log(engine + ': curated media and vacuum controls, Now Playing, and the original room shortcuts');
      await assertCompactRoomMedia(browser);
      await assertCompactRoomDevicePair(browser);
      await assertKitchenApplianceTiles(browser);
      await assertKitchenBoilerQuickPower(browser);
      await assertRoomVacuumGestures(browser);
      await assertRoomVacuumPresentation(browser);
      await assertRoomVacuumSummary(browser);
      console.log(engine + ': room-specific linked vacuum tap/hold, keyboard and native focus restoration');

      for (const locale of ['en','he']) {
        const metadataPage = await browser.newPage({viewport:{width:320,height:844},hasTouch:true,reducedMotion:'reduce'});
        metadataPage.setDefaultTimeout(8000);
        await metadataPage.goto(base + '/fixture-home/home?toolbar-panels&locale=' + locale + '#panel/media-panel');
        const nowPlaying = metadataPage.locator('dialog.modal[open] .now-playing');
        await nowPlaying.waitFor();
        await metadataPage.evaluate(() => {
          const entity = 'media_player.demo_speaker';
          window.bayitTest.setRoomState(entity,'paused');
          window.bayitTest.setFixtureAttributes(entity,{
            media_series_title:'Fixture series', media_title:'Episode title', media_season:'2', media_episode:4,
            media_artist:'Guest contributor', app_name:'Video player', source:'HDMI', media_position:71, media_duration:142,
            media_position_updated_at:'2000-01-01T00:00:00.000Z',
          });
        });
        await nowPlaying.getByText('Fixture series', {exact:true}).waitFor();
        assert.equal(await nowPlaying.locator('.now-playing-episode').innerText(),
          locale === 'he' ? 'Episode title · עונה 2 · פרק 4' : 'Episode title · Season 2 · Episode 4');
        assert.equal(await nowPlaying.locator('.now-playing-artist').innerText(),'Guest contributor');
        assert.equal(await nowPlaying.locator('.now-playing-source').innerText(),'Video player');
        const remaining = nowPlaying.locator('.now-playing-remaining');
        assert.equal(await remaining.innerText(),'−1:11');
        assert.equal(await remaining.getAttribute('title'), locale === 'he' ? 'זמן שנותר' : 'Time remaining');
        const timeline = nowPlaying.locator('.now-playing-timeline');
        await timeline.waitFor();
        assert.ok(await timeline.evaluate(node => node.clientWidth >= node.scrollWidth && node.querySelector('progress').offsetWidth > 0));
        const playControl = metadataPage.locator('section.device[data-entity="media_player.demo_speaker"] [data-action=media_play]');
        await playControl.waitFor();
        await metadataPage.evaluate(() => window.bayitTest.setFixtureAttributes('media_player.demo_speaker',{
          media_title:null, media_series_title:null, media_season:'unknown', media_episode:-1,
          media_artist:null, app_name:null, media_duration:0,
        }));
        await nowPlaying.getByText('HDMI', {exact:true}).waitFor();
        await nowPlaying.locator('.now-playing-episode').waitFor({state:'hidden'});
        await nowPlaying.locator('.now-playing-source').waitFor({state:'hidden'});
        await timeline.waitFor({state:'hidden'});
        await metadataPage.evaluate(() => window.bayitTest.setRoomState('media_player.demo_speaker','off'));
        await nowPlaying.getByText(locale === 'he' ? 'אין תוכן שמתנגן' : 'No track playing', {exact:true}).waitFor();
        await playControl.waitFor({state:'hidden'});
        assert.equal(await nowPlaying.locator('.now-playing-artist').innerText(),'');
        assert.deepEqual(await metadataPage.evaluate(() => window.bayitTest.calls),[]);
        await metadataPage.close();
      }
      console.log(engine + ': Now Playing source, episode details and validated remaining time in English and Hebrew');

      for (const locale of ['en','he']) {
        const linkedPage = await browser.newPage({ viewport:{width:391,height:845}, hasTouch:true, reducedMotion:'reduce' });
        linkedPage.setDefaultTimeout(8000);
        const linkUrl = base + '/fixture-home/home?toolbar-panels&room-link&linked-only-panels&locale=' + locale;
        await linkedPage.goto(linkUrl);
        const toolbarExtras = linkedPage.locator('.toolbar .chrome-button:is([data-role=media],[data-role=vacuum])');
        const settings = linkedPage.locator('.toolbar .chrome-button[data-role=settings]');
        const studioRoom = linkedPage.getByRole('button',{name:'Studio',exact:true});
        const roomDialog = linkedPage.getByRole('dialog',{name:'Studio',exact:true});
        const dialog = linkedPage.locator('dialog.modal[open]:not(.confirm)');
        const expectedMedia = locale === 'he' ? 'מדיה מקושרת' : 'Linked Media';
        const expectedVacuum = locale === 'he' ? 'שואב מקושר' : 'Linked Vacuum';
        assert.equal(await toolbarExtras.count(),0);
        await settings.tap();
        assert.equal(await dialog.locator('.settings-screens > button').count(),4);
        assert.equal(await dialog.getByRole('button',{name:expectedMedia,exact:true}).count(),0);
        assert.equal(await dialog.getByRole('button',{name:expectedVacuum,exact:true}).count(),0);
        await dialog.locator('[data-role=close]').tap();
        await dialog.waitFor({state:'hidden'});
        await studioRoom.tap();
        for (const [entity, panel, title] of [
          ['media_player.demo_tv','media-panel',expectedMedia], ['vacuum.demo_robot','vacuum-panel',expectedVacuum],
        ]) {
          const source = roomDialog.locator('[data-entity="' + entity + '"] .device-panel-launch');
          if (panel === 'media-panel') await source.press('Shift+Enter');
          else await source.tap();
          await linkedPage.getByRole('dialog',{name:title,exact:true}).waitFor();
          assert.equal(new URL(linkedPage.url()).hash,'#panel/' + panel);
          await dialog.locator('[data-role=back]').tap();
          await roomDialog.waitFor();
          assert.equal(new URL(linkedPage.url()).hash,'#room-studio');
          assert.equal(await source.evaluate(control => control.getRootNode().activeElement === control),true);
        }
        assert.deepEqual(await linkedPage.evaluate(() => window.bayitTest.calls),[]);
        for (const [hash, title] of [['#panel/media-panel',expectedMedia],['#panel/vacuum-panel',expectedVacuum],
          ['#legacy-media-panel',expectedMedia]]) {
          await linkedPage.goto(linkUrl + hash);
          await linkedPage.getByRole('dialog',{name:title,exact:true}).waitFor();
          assert.equal(new URL(linkedPage.url()).hash,hash);
          assert.equal(await dialog.locator('[data-role=back]:visible').count(),0);
          assert.deepEqual(await linkedPage.evaluate(() => window.bayitTest.calls),[]);
        }
        await linkedPage.goto(linkUrl + '&linked-only-fallback');
        await settings.tap();
        assert.ok(await linkedPage.evaluate(() => {
          const context = window.bayitTest.config.views[0].cards[0].context;
          return context.media.length > 0 && context.vacuum.length > 0;
        }));
        const fallbackScreens = await dialog.locator('.settings-screens > button').allTextContents();
        assert.ok(fallbackScreens.length > 0);
        assert.ok(fallbackScreens.every(label => !/^(Media|Robot vacuum|מדיה|שואב)$/.test(label.trim())));
        if (locale === 'en') {
          await linkedPage.goto(linkUrl + '&editor');
          const editor = linkedPage.locator('#editor');
          await editor.getByText('Rooms',{exact:true}).tap();
          await editor.getByLabel('Room to customize',{exact:true}).selectOption('studio');
          assert.equal(await editor.getByLabel('Open on media press and hold · Television',{exact:true}).inputValue(),'media-panel');
          assert.equal(await editor.getByLabel('Vacuum panel · Robot',{exact:true}).inputValue(),'vacuum-panel');
          assert.equal(await editor.getByLabel('Open the vacuum panel with · Robot',{exact:true}).inputValue(),'tap');
          await editor.getByText('Toolbar and extra screens',{exact:true}).tap();
          await editor.getByRole('button',{name:expectedMedia,exact:true}).tap();
          const placement = editor.getByLabel('Show in',{exact:true});
          assert.equal(await placement.inputValue(),'linked');
          await placement.selectOption('settings');
          await placement.selectOption({label:'Linked only'});
          assert.equal(await linkedPage.evaluate(() => window.latest.toolbar.find(entry => entry.id === 'media-panel').placement),'linked');
          await editor.getByRole('button',{name:'Weather',exact:true}).tap();
          assert.equal(await placement.locator('option[value=linked]').count(),0);
        }
        await linkedPage.close();
      }
      console.log(engine + ': linked Media and Vacuum routes, room Back, fallback and editor');

      const remotePage = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      const remoteRTL = engine === 'WebKit';
      const remoteURL = base + '?toolbar-panels&media-remote&locale=' + (remoteRTL ? 'he' : 'en');
      const remoteChooser = remoteRTL ? 'מראה' : 'Appearance';
      const remoteMedia = remoteRTL ? 'מדיה' : 'Media';
      const playPause = remoteRTL ? 'ניגון או השהיה' : 'Play or pause';
      const openRemote = async flags => {
        await remotePage.goto(remoteURL + flags);
        await remotePage.getByRole('button', { name: remoteChooser, exact: true }).tap();
        await remotePage.getByRole('button', { name: remoteMedia, exact: true }).tap();
        return remotePage.getByRole('dialog', { name: remoteMedia, exact: true }).locator('.media-remote');
      };
      const remote = await openRemote('');
      const transport = remote.getByRole('group', { name: 'Speaker', exact: true });
      const audio = remote.getByRole('group', { name: 'Television', exact: true });
      const combined = transport.getByRole('button', { name: playPause, exact: true });
      const volumeUp = audio.getByRole('button', { name: remoteRTL ? 'הגברת עוצמה' : 'Volume up', exact: true });
      const mute = audio.getByRole('button', { name: remoteRTL ? 'השתקה' : 'Mute', exact: true });
      const unmute = audio.getByRole('button', { name: remoteRTL ? 'ביטול השתקה' : 'Unmute', exact: true });
      await combined.waitFor();
      assert.ok((await combined.boundingBox()).height >= 44);
      assert.equal(await mute.count(), 0);
      assert.equal(await unmute.count(), 0);
      assert.equal(await remotePage.getByRole('button', { name: remoteRTL ? 'הדלקה' : 'Turn on', exact: true }).count(), 2);
      assert.deepEqual(await remotePage.evaluate(() => window.bayitTest.calls), []);
      await combined.tap();
      await volumeUp.tap();
      await remotePage.evaluate(() => window.bayitTest.setFixtureAttributes('media_player.demo_tv', { is_volume_muted: false }));
      await mute.tap();
      await unmute.waitFor();
      assert.deepEqual(await remotePage.evaluate(() => window.bayitTest.calls), [
        { type: 'call_service', domain: 'media_player', service: 'media_play_pause',
          target: { entity_id: 'media_player.demo_speaker' }, service_data: {} },
        { type: 'call_service', domain: 'media_player', service: 'volume_up',
          target: { entity_id: 'media_player.demo_tv' }, service_data: {} },
        { type: 'call_service', domain: 'media_player', service: 'volume_mute',
          target: { entity_id: 'media_player.demo_tv' }, service_data: { is_volume_muted: true } },
      ]);
      const activeOnly = await openRemote('&active-only');
      assert.equal(await activeOnly.getByRole('button').count(), 0);
      assert.equal(await remotePage.getByRole('button', { name: remoteRTL ? 'הדלקה' : 'Turn on', exact: true }).count(), 2);
      const missingService = await openRemote('&missing-play-pause');
      assert.equal(await missingService.getByRole('button', { name: playPause, exact: true }).count(), 0);
      assert.equal(await missingService.getByRole('button', { name: remoteRTL ? 'הבא' : 'Next', exact: true }).count(), 1);
      assert.deepEqual(await remotePage.evaluate(() => window.bayitTest.calls), []);
      await remotePage.goto(base + '?toolbar-panels&media-remote&active-only&editor');
      await remotePage.getByText('Toolbar and extra screens', { exact: true }).click();
      await remotePage.getByRole('button', { name: 'Media', exact: true }).click();
      await remotePage.getByLabel('Playback device', { exact: true }).selectOption('media_player.demo_tv');
      await remotePage.getByRole('checkbox', { name: 'Show remote controls in standby', exact: true }).check();
      assert.deepEqual(await remotePage.evaluate(() => window.latest.toolbar.find(item => item.kind === 'media').media_remote),
        { transport_entity: 'media_player.demo_tv', volume_entity: 'media_player.demo_tv', allow_standby: true });
      await remotePage.close();
      console.log(engine + ': explicit media remote targets, standby, combined play/pause, and observed mute');
      await assertMediaRemotePower(browser);
      console.log(engine + ': optional media power, exact source, status, services, row order and editor');

      const editorPage = await browser.newPage({ viewport: {width: 390, height: 844} });
      await editorPage.goto(base + '?editor&heater-level');
      await editorPage.getByRole('heading', { name: 'Bayit 9' }).waitFor({ state: 'hidden' });
      const title = editorPage.getByLabel('Dashboard title');
      await title.fill('Demo Home');
      await title.blur();
      await editorPage.waitForFunction(() => window.latest?.title === 'Demo Home');
      await editorPage.getByText('Home overview', { exact: true }).click();
      await editorPage.getByLabel('Devices and sensors to show', { exact: true }).selectOption(['switch.demo_heater']);
      assert.deepEqual(await editorPage.evaluate(() => window.latest.overview_entities), ['switch.demo_heater']);
      await editorPage.getByText('Room shortcuts', { exact: true }).click();
      const automatic = editorPage.getByRole('checkbox', { name: 'Choose shortcuts automatically' });
      await automatic.uncheck();
      await editorPage.getByLabel('Shortcut 1', { exact: true }).selectOption('switch.demo_heater');
      await editorPage.getByLabel('Shortcut 2', { exact: true }).selectOption('light.demo_lamp');
      assert.deepEqual(await editorPage.evaluate(() => window.latest.room_shortcuts.studio),
        ['switch.demo_heater', 'light.demo_lamp']);
      await automatic.check();
      assert.deepEqual(await editorPage.evaluate(() => window.latest.room_shortcuts), {});
      await editorPage.getByText('Boiler and heater controls', { exact: true }).click();
      await editorPage.getByRole('button', { name: 'Add profile' }).click();
      await editorPage.getByLabel('Heating device').selectOption('switch.demo_heater');
      await editorPage.getByLabel('Scheduled start script').selectOption('script.demo_start');
      await editorPage.getByLabel('Heating level entity').selectOption('number.demo_level');
      await editorPage.getByLabel('Timer', { exact: true }).selectOption('timer.demo_heater');
      await editorPage.getByRole('button', { name: 'Save profile' }).click();
      const profile = await editorPage.evaluate(() => window.latest.profiles[0]);
      assert.equal(profile.entity, 'switch.demo_heater');
      assert.equal(profile.level_entity, 'number.demo_level');
      assert.equal(profile.timed.start_script, 'script.demo_start');
      assert.equal(profile.timed.timer_entity, 'timer.demo_heater');
      await editorPage.getByRole('button', { name: 'Add profile' }).click();
      await editorPage.getByLabel('Heating device').selectOption('fan.demo_step_heater');
      await editorPage.getByLabel('Timer source').selectOption('simple');
      await editorPage.getByLabel('Simple Timer sensor').selectOption('sensor.demo_step_runtime');
      await editorPage.getByLabel('Level selection script').selectOption('script.demo_select_heat_step');
      await editorPage.getByRole('button', {name: 'Save profile'}).click();
      await editorPage.getByRole('alert').getByText('Set 2–12 heating levels', { exact: false }).waitFor();
      await editorPage.getByLabel('Number of heating levels').fill('9');
      await editorPage.getByLabel('Heating level feedback').selectOption('input_number.demo_heat_step');
      const nextHelper = editorPage.getByLabel('Next-start level helper');
      assert.ok(await nextHelper.getAttribute('aria-describedby'));
      await nextHelper.selectOption('input_number.demo_next_step');
      const allowUsageReset = editorPage.getByRole('checkbox', { name: 'Allow reset of this daily usage counter', exact: true });
      assert.equal(await allowUsageReset.isChecked(), false);
      await allowUsageReset.check();
      await editorPage.getByRole('button', {name: 'Save profile'}).click();
      const heaterProfile = await editorPage.evaluate(() => window.latest.profiles.find(item => item.entity.startsWith('fan.')));
      assert.equal(heaterProfile?.level_select_script, 'script.demo_select_heat_step');
      assert.equal(heaterProfile?.level_read_entity, 'input_number.demo_heat_step');
      assert.equal(heaterProfile?.level_preselect_entity, 'input_number.demo_next_step');
      assert.equal(heaterProfile?.timed.simple_timer_target, 'switch.demo_step_power');
      assert.equal(heaterProfile?.timed.allow_daily_usage_reset, true);
      assert.equal(await editorPage.evaluate(() => window.bayitTest.calls.length), 0);
      await editorPage.getByLabel('Language').selectOption('he');
      await editorPage.getByLabel('שם הדשבורד').waitFor();
      await editorPage.close();

      const curatedPage = await browser.newPage({ viewport: {width: 320, height: 660} });
      await curatedPage.goto(base + '?curated');
      const controls = curatedPage.locator('.quick-button');
      await controls.first().waitFor();
      assert.deepEqual(await controls.evaluateAll(items => items.map(item => item.dataset.entity)),
        ['switch.demo_heater', 'light.demo_lamp']);
      await curatedPage.getByRole('button', { name: 'Home overview', exact: true }).click();
      const overview = curatedPage.getByRole('dialog', { name: 'Home overview', exact: true });
      await overview.getByRole('heading', { name: 'Room heater', exact: true }).waitFor();
      assert.equal(await overview.locator('section[data-entity]').count(), 1);
      assert.equal(await curatedPage.evaluate(() => window.bayitTest.calls.length), 0);
      await curatedPage.keyboard.press('Escape');
      await overview.waitFor({ state: 'hidden' });
      await curatedPage.close();

      const lightingPage = await browser.newPage({ viewport:{width:390,height:844}, reducedMotion:'reduce' });
      await lightingPage.goto(base + '?room-grid&lighting-count');
      const lightingRoom = lightingPage.locator('.room[data-room="studio"]');
      const lightingBadge = lightingRoom.locator('.room-count');
      const lightingRoomButton = lightingRoom.getByRole('button',{name:'Studio',exact:true});
      assert.equal(await lightingBadge.innerText(),'1');
      assert.equal(await lightingRoomButton.getAttribute('aria-description'),'Lights · 1');
      await lightingRoomButton.click();
      const lightingDialog = lightingPage.getByRole('dialog',{name:'Studio',exact:true});
      const detailLight = lightingDialog.getByRole('button',{name:'Pendant lamp · Turn off',exact:true});
      await detailLight.click();
      await lightingPage.waitForFunction(() => window.bayitTest.calls.some(call =>
        call.domain === 'light' && call.service === 'turn_off' && call.target.entity_id === 'light.demo_pendant'));
      await lightingPage.keyboard.press('Escape');
      await lightingDialog.waitFor({state:'hidden'});
      await lightingPage.evaluate(() => window.bayitTest.setRoomState('light.demo_wall','off'));
      await lightingBadge.filter({hasText:/^Off$/}).waitFor();
      await lightingPage.evaluate(() => window.bayitTest.setRoomState('light.demo_pendant','unavailable'));
      await lightingRoom.locator('[data-badge="availability"][aria-label*="Pendant lamp"]').waitFor();
      assert.equal(await lightingBadge.innerText(),'Off');
      await lightingPage.evaluate(() => window.bayitTest.setRoomState('light.demo_wall','unavailable'));
      await lightingBadge.filter({hasText:/^—$/}).waitFor();
      await lightingPage.goto(base + '?room-grid&lighting-count&editor');
      await lightingPage.getByText('Rooms',{exact:true}).click();
      const countEditor = lightingPage.getByLabel('Lights in the room count',{exact:true});
      assert.deepEqual(await countEditor.locator('option:checked').evaluateAll(nodes => nodes.map(node => node.value)),
        ['light.demo_wall']);
      await countEditor.selectOption(['light.demo_pendant']);
      assert.deepEqual(await lightingPage.evaluate(() => window.latest.room_overrides.studio.lighting_count_entities),
        ['light.demo_pendant']);
      await lightingPage.getByRole('button',{name:'Use automatic lighting count',exact:true}).click();
      const draft = await lightingPage.evaluate(() => window.latest.room_overrides.studio);
      assert.equal(draft.lighting_count_entities,undefined);
      assert.ok(draft.entities.includes('light.demo_pendant'));
      assert.deepEqual(draft.read_only_entities,['light.demo_monitor']);
      await lightingPage.close();

      const shutdownPage = await browser.newPage({ viewport:{width:390,height:844}, hasTouch:true, reducedMotion:'reduce' });
      const shutdownUrl = base + '?room-grid&lighting-count&room-shutdown';
      await shutdownPage.goto(shutdownUrl);
      const roomIcon = shutdownPage.getByRole('button', { name:'Turn off selected devices in Studio', exact:true });
      const shutdownCalls = () => shutdownPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain === 'homeassistant'));
      const shutdownRoomTitle = shutdownPage.getByRole('button', { name:'Studio', exact:true });
      const iconBounds = await roomIcon.boundingBox();
      const badgeBounds = await shutdownRoomTitle.locator('.room-count').boundingBox();
      assert.ok(iconBounds.x + iconBounds.width <= badgeBounds.x, 'The off button leaves the lighting badge clickable as room content');
      await roomIcon.tap();
      assert.equal(await roomIcon.getAttribute('aria-busy'), 'true');
      await roomIcon.press('Enter');
      assert.deepEqual(await shutdownCalls(), [{type:'call_service',domain:'homeassistant',service:'turn_off',service_data:{},
        target:{entity_id:['light.demo_lamp','light.demo_pendant']}}]);
      assert.equal(await shutdownPage.locator('dialog.modal[open]').count(), 0);
      await shutdownPage.evaluate(() => window.bayitTest.finishRoomOff(true));
      await shutdownPage.getByText('Could not complete the action.', { exact:true }).waitFor();
      await shutdownPage.evaluate(() => window.bayitTest.setRoomState('light.demo_lamp','unavailable'));
      await shutdownPage.getByRole('img', { name:/Unavailable · Desk lamp/ }).waitFor();
      await roomIcon.press('Enter');
      assert.deepEqual((await shutdownCalls()).at(-1).target, {entity_id:['light.demo_pendant']});
      await shutdownPage.evaluate(() => window.bayitTest.finishRoomOff(false));
      await shutdownRoomTitle.tap();
      await shutdownPage.getByRole('dialog',{name:'Studio',exact:true}).getByRole('button',{name:'Pendant lamp · Turn on',exact:true}).waitFor();
      assert.equal(await shutdownRoomTitle.getAttribute('aria-description'),'Lights · 1');
      assert.equal((await shutdownCalls()).length,2);
      await shutdownPage.goto(shutdownUrl + '&editor');
      await shutdownPage.getByText('Rooms',{exact:true}).tap();
      const shutdownEditor = shutdownPage.getByLabel('Devices turned off by the room icon',{exact:true});
      assert.deepEqual(await shutdownEditor.locator('option:checked').evaluateAll(nodes => nodes.map(option => option.value)),
        ['light.demo_lamp','light.demo_pendant']);
      assert.equal(await shutdownEditor.locator('option[value="light.demo_monitor"]').count(),0);
      await shutdownEditor.selectOption(['light.demo_wall']);
      assert.deepEqual(await shutdownPage.evaluate(() => window.latest.room_overrides.studio.turn_off_entities), ['light.demo_wall']);
      await shutdownPage.getByRole('button',{name:'Remove room icon action',exact:true}).tap();
      assert.equal(await shutdownPage.evaluate(() => window.latest.room_overrides.studio.turn_off_entities), undefined);
      await shutdownPage.close();
      console.log(engine + ': independent room icon shutdown, native targets, failure and room editor');

      const roomGridPage = await browser.newPage({ viewport: { width: 320, height: 690 } });
      await roomGridPage.goto(base + '?room-grid&locale=he');
      await roomGridPage.getByRole('button', { name: 'Studio', exact: true }).click();
      const lightGroup = roomGridPage.getByRole('dialog').locator('[data-group="room_lights"]');
      const compactLights = lightGroup.locator('[data-compact="tile"]');
      await compactLights.nth(1).waitFor();
      const [firstTile, secondTile] = await compactLights.evaluateAll(tiles => tiles.map(tile => {
        const rect = tile.getBoundingClientRect();
        return [rect.top, rect.left, rect.width];
      }));
      assert.equal(firstTile[0], secondTile[0], 'Simple lights share one row');
      assert.notEqual(firstTile[1], secondTile[1]);
      assert.equal(await compactLights.first().locator('.current').isVisible(), false);
      assert.equal(await compactLights.first().locator('.device-tile').getAttribute('aria-pressed'), 'false');
      assert.ok(await compactLights.first().evaluate(tile => tile.offsetHeight >= 108));
      const dimmable = lightGroup.locator('[data-entity="light.demo_pendant"] .device-tile');
      await dimmable.getByText('Pendant lamp', { exact: true }).waitFor();
      assert.equal(await lightGroup.getByRole('slider').count(), 0);
      assert.equal(await lightGroup.locator('input[type="color"]').count(), 0);
      await dimmable.press('Shift+Enter');
      const pendant = roomGridPage.getByRole('dialog', { name: 'Pendant lamp', exact: true });
      const kelvin = pendant.getByRole('slider', { name: 'גוון לבן' });
      await kelvin.waitFor();
      await assertDeviceHeading(pendant, 'Pendant lamp');
      assert.equal(await pendant.getByRole('slider').count(), 2);
      assert.equal(await kelvin.inputValue(), '3200');
      assert.equal(await kelvin.getAttribute('min'), '2200');
      assert.equal(await kelvin.getAttribute('max'), '7000');
      assert.equal(await pendant.locator('.device').count(), 1);
      assert.equal(await roomGridPage.evaluate(() => window.bayitTest.calls.length), 0);
      await kelvin.fill('3500');
      await pendant.getByText('3500 K', { exact: true }).waitFor();
      await pendant.getByRole('button', { name: 'החל · גוון לבן', exact: true }).click();
      await roomGridPage.waitForFunction(() => window.bayitTest.calls.length === 1);
      const effect = pendant.getByRole('combobox', { name: 'אפקט תאורה' });
      const applyEffect = pendant.getByRole('button', { name: 'החל · אפקט תאורה', exact: true });
      assert.equal(await effect.inputValue(), '');
      assert.equal(await applyEffect.isDisabled(), true);
      await effect.selectOption('Slow pulse');
      assert.equal(await roomGridPage.evaluate(() => window.bayitTest.calls.length), 1);
      await applyEffect.click();
      const color = pendant.getByLabel('צבע התאורה', { exact: true });
      const applyColor = pendant.getByRole('button', { name: 'החל · צבע התאורה', exact: true });
      assert.equal(await color.getAttribute('type'), 'color');
      await color.fill('#000000');
      assert.equal(await applyColor.isDisabled(), true);
      await color.fill('#804020');
      assert.equal(await roomGridPage.evaluate(() => window.bayitTest.calls.length), 2);
      await applyColor.click();
      await roomGridPage.waitForFunction(() => window.bayitTest.calls.length === 3);
      await pendant.getByText('המצב של Pendant lamp עודכן.', { exact: true }).waitFor();
      assert.deepEqual(await roomGridPage.evaluate(() => window.bayitTest.calls), [
        { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { color_temp_kelvin: 3500 } },
        { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { effect: 'Slow pulse' } },
        { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { rgb_color: [128, 64, 32] } },
      ]);
      await roomGridPage.keyboard.press('Escape');
      await pendant.waitFor({ state: 'hidden' });
      await roomGridPage.getByRole('button', { name: 'Studio', exact: true }).click();
      const monitorTile = roomGridPage.getByRole('dialog').getByRole('button', { name: 'Monitor lamp · מידע נוסף', exact: true });
      assert.equal(await monitorTile.getAttribute('aria-pressed'), null);
      await monitorTile.press('Shift+Enter');
      const monitor = roomGridPage.getByRole('dialog', { name: 'Monitor lamp', exact: true });
      await monitor.waitFor();
      assert.equal(await monitor.locator('.action-list').evaluate(node => node.childElementCount), 0);
      assert.equal(await monitor.locator('input[type="color"]').count(), 0);
      assert.equal(await roomGridPage.evaluate(() => window.bayitTest.calls.length), 3);
      await roomGridPage.close();

      const rememberedTimerPage = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const rememberedRoom = rememberedTimerPage.getByRole('dialog', { name: 'Studio', exact: true });
      const rememberedRoomButton = rememberedTimerPage.getByRole('button', { name: 'Studio', exact: true });
      await rememberedTimerPage.goto(base + '?device-panel');
      await rememberedRoomButton.tap();
      const rememberedRoomRange = rememberedRoom.locator('input.timer-range');
      await rememberedRoomRange.waitFor();
      assert.equal(await rememberedRoomRange.inputValue(), '120');
      await rememberedRoomRange.fill('45');
      await rememberedRoom.getByRole('button', { name: 'Close', exact: true }).click();
      await rememberedRoom.waitFor({ state: 'hidden' });
      await rememberedTimerPage.locator('[data-popup-origin]').waitFor({ state: 'detached' });
      await rememberedRoomButton.tap();
      assert.equal(await rememberedRoomRange.inputValue(), '45');
      await rememberedRoom.getByRole('button', { name: 'Close', exact: true }).click();
      await rememberedRoom.waitFor({ state: 'hidden' });
      await rememberedTimerPage.locator('[data-popup-origin]').waitFor({ state: 'detached' });
      await rememberedTimerPage.locator('.quick-button[data-entity="climate.demo_air"]').press('Shift+Enter');
      const rememberedDevice = rememberedTimerPage.getByRole('dialog', { name: 'Studio air conditioner', exact: true });
      const rememberedDeviceRange = rememberedDevice.locator('input.timer-range');
      assert.equal(await rememberedDeviceRange.inputValue(), '45');
      await rememberedDeviceRange.press('ArrowRight');
      assert.equal(await rememberedDeviceRange.inputValue(), '60');
      assert.equal(await rememberedDeviceRange.getAttribute('aria-valuetext'), '60 Minutes');
      assert.equal(await rememberedDeviceRange.evaluate(range =>
        range === range.getRootNode().activeElement && range.matches(':focus-visible')), true);
      await rememberedDeviceRange.press('ArrowLeft');
      await rememberedTimerPage.reload();
      assert.equal(await rememberedDeviceRange.inputValue(), '45');
      assert.deepEqual(await rememberedTimerPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain)), []);
      await rememberedTimerPage.close();
      console.log(engine + ': timer duration survives reopening, detail navigation and reload');

      const compactTimerPage = await browser.newPage({
        viewport: { width: 320, height: 660 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce',
      });
      await compactTimerPage.goto(base + '/fixture-home/home?device-panel&locale=he#device/studio/climate.demo_air');
      const compactTimerDialog = compactTimerPage.getByRole('dialog', { name: 'Studio air conditioner', exact: true });
      const timerDimensions = await compactTimerDialog.locator('.device-timer[data-compact]').evaluate(timer => {
        const body = timer.closest('.modal-body');
        const slider = timer.querySelector('.timer-range');
        const button = timer.querySelector('.timer-preset');
        const rect = button.getBoundingClientRect();
        const inset = getComputedStyle(button, '::before').top;
        return {
          appearance: getComputedStyle(slider).appearance,
          sliderHeight: slider.getBoundingClientRect().height,
          presetHeight: rect.height, presetWidth: rect.width, inset,
          overflowY: body.scrollHeight - body.clientHeight,
          overflowX: body.scrollWidth - body.clientWidth,
          timerHeight: timer.getBoundingClientRect().height,
        };
      });
      assert.equal(timerDimensions.appearance, 'none');
      assert.ok(timerDimensions.sliderHeight >= 44 && timerDimensions.presetHeight >= 44 && timerDimensions.presetWidth >= 44);
      assert.equal(timerDimensions.inset, '6px');
      assert.ok(timerDimensions.overflowY <= 1 && timerDimensions.overflowX <= 1);
      assert.ok(timerDimensions.timerHeight <= 152);
      await compactTimerDialog.getByText('120 דק׳', { exact: true }).first().waitFor();
      assert.equal(await compactTimerDialog.locator('.timer-range').getAttribute('aria-valuetext'), '120 דקות');
      assert.deepEqual(await compactTimerPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain)), []);
      await compactTimerPage.close();
      console.log(engine + ': compact standalone climate timer rail and full-size narrow RTL controls');

      const geometryPage = await browser.newPage({
        viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
      });
      await geometryPage.goto(base + '?popup-geometry&locale=he');
      const geometryDialog = geometryPage.getByRole('dialog');
      const modalGeometry = () => geometryDialog.evaluate(dialog => {
        const root = dialog.getRootNode();
        const rect = dialog.getBoundingClientRect();
        const close = dialog.querySelector('[data-role="close"]').getBoundingClientRect();
        const source = root.querySelector('[data-popup-origin]');
        return {
          kind: dialog.dataset.kind, name: dialog.getAttribute("aria-label"),
          top: rect.top, bottom: rect.bottom, height: rect.height,
          gridTop: root.querySelector('.room-scroll').getBoundingClientRect().top,
          closeX: close.left + close.width / 2,
          closeOffset: close.top - rect.top,
          sourceRing: getComputedStyle(source).boxShadow,
        };
      });
      await geometryPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      const roomGeometry = await modalGeometry();
      assert.equal(roomGeometry.kind, 'room');
      assert.ok(Math.abs(roomGeometry.top - roomGeometry.gridTop - 86) <= 1);
      assert.match(roomGeometry.sourceRing, /2px inset/);
      await geometryPage.keyboard.press('Escape');
      await geometryDialog.waitFor({ state: 'hidden' });
      await geometryPage.locator('[data-popup-origin]').waitFor({ state: 'detached' });
      const geometryShortcut = geometryPage.locator('.quick-button[data-entity="switch.demo_heater"]');
      await geometryShortcut.press('Shift+Enter');
      await geometryPage.getByRole('dialog', { name: 'Room heater', exact: true }).waitFor();
      const deviceGeometry = await modalGeometry();
      assert.equal(deviceGeometry.kind, 'device');
      assert.ok(Math.abs(deviceGeometry.top - (roomGeometry.top + 844 - 16 - deviceGeometry.height) / 2) <= 1);
      const roomBandHeight = 844 - 16 - roomGeometry.top;
      assert.ok(deviceGeometry.height < roomBandHeight, 'Standalone relay should fit the device panel band ' + JSON.stringify(deviceGeometry));
      assert.equal(deviceGeometry.closeX, roomGeometry.closeX);
      assert.equal(deviceGeometry.closeOffset, roomGeometry.closeOffset);
      assert.match(deviceGeometry.sourceRing, /2px inset/);

      // Constrain the visual bottom inside the layout viewport, as a phone keyboard does.
      await geometryDialog.evaluate(dialog => dialog.style.setProperty('--bayit-popup-view-bottom', '330px'));
      const constrainedGeometry = await modalGeometry();
      assert.ok(constrainedGeometry.bottom <= 315);
      assert.ok(constrainedGeometry.top >= roomGeometry.top - 1);
      await geometryPage.keyboard.press('Escape');
      await geometryDialog.waitFor({ state: 'hidden' });
      await geometryPage.locator('[data-popup-origin]').waitFor({ state: 'detached' });
      assert.equal(await geometryShortcut.evaluate(button => button.getRootNode().activeElement === button), true);
      await geometryPage.close();

      const motionResizePage = await browser.newPage({
        viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference',
      });
      await motionResizePage.goto(base + '?popup-geometry');
      const motionSource = motionResizePage.getByRole('button', { name: 'Studio', exact: true });
      const motionResize = await motionSource.evaluate(async source => {
        const root = source.getRootNode();
        const dialog = root.querySelector('dialog.modal');
        const grid = root.querySelector('.room-scroll');
        const start = grid.scrollTop;
        source.click();
        const animation = dialog.getAnimations()[0];
        const sample = () => ({ active: dialog.getAnimations().includes(animation), scroll: grid.scrollTop });
        const before = sample();
        // WallPanel can dispatch a window resize on a mounted popup at the same dimensions.
        window.dispatchEvent(new Event('resize'));
        const after = sample();
        const frames = [];
        while (animation?.playState === 'running' || animation?.pending) {
          await new Promise(resolve => requestAnimationFrame(resolve));
          frames.push(grid.scrollTop);
          if (frames.length > 60) break;
        }
        return { start, before, after, frames, end: grid.scrollTop };
      });
      assert.equal(motionResize.before.active, true);
      assert.deepEqual(motionResize.after, motionResize.before, 'Same-size resize preserves the running entrance and scroll');
      assert.ok(motionResize.end > motionResize.start);
      assert.ok(motionResize.frames.some(top => top > motionResize.start + 1 && top < motionResize.end - 1),
        'The room grid should visibly ease through an intermediate scroll position');
      const motionDialog = motionResizePage.getByRole('dialog', { name: 'Studio', exact: true });
      const popupAreaTopIs = top => motionResizePage.waitForFunction(expected =>
        document.querySelector('bayit-dashboard').shadowRoot.querySelector('dialog.modal')
          .style.getPropertyValue('--bayit-popup-area-top') === expected + 'px', top);
      await motionResizePage.setViewportSize({ width: 390, height: 280 });
      await popupAreaTopIs(100);
      await motionResizePage.setViewportSize({ width: 390, height: 844 });
      await popupAreaTopIs(150);
      // A change to the clipping area's top inset must reposition even at the same viewport size.
      await motionDialog.evaluate(dialog => {
        dialog.getRootNode().querySelector('.room-scroll').style.marginBlockStart = '14px';
        (window.visualViewport ?? window).dispatchEvent(new Event('resize'));
      });
      await popupAreaTopIs(164);
      await motionDialog.getByRole('button', { name: 'Close', exact: true }).tap();
      await motionDialog.waitFor({ state: 'hidden' });
      await motionResizePage.locator('[data-popup-origin]').waitFor({ state: 'detached' });
      assert.equal(await motionResizePage.locator('.room-scroll').evaluate(grid => grid.scrollTop), motionResize.start);
      assert.equal(await motionSource.evaluate(source => source.getRootNode().activeElement === source), true);
      await motionResizePage.close();
      console.log(engine + ': room popup easing survives duplicate resize, true geometry changes and close restoration');

      const toolbarPlacementPage = await browser.newPage({
        viewport:{width:391,height:845}, isMobile:true, hasTouch:true, reducedMotion:'reduce',
      });
      const rtlPlacement = engine === 'WebKit';
      const toolbarPlacementUrl = base + '/fixture-home/home?toolbar-panels&security-cover-rail&locale=' + (rtlPlacement ? 'he' : 'en');
      await toolbarPlacementPage.goto(toolbarPlacementUrl);
      const placementDialog = toolbarPlacementPage.locator('dialog.modal:not(.confirm)');
      const toolbarButton = kind => toolbarPlacementPage.locator('.toolbar-actions [data-role="' + kind + '"]');
      const readToolbarPlacement = () => placementDialog.evaluate(dialog => {
        const bounds = dialog.getBoundingClientRect();
        const outer = dialog.getRootNode();
        const body = dialog.querySelector('.modal-body');
        return { top:bounds.top, bottom:bounds.bottom,height:bounds.height,
          areaTop:parseFloat(dialog.style.getPropertyValue('--bayit-popup-area-top')),
          bandBottom:parseFloat(dialog.style.getPropertyValue('--bayit-popup-view-bottom')) - 16,
          centered:dialog.hasAttribute('data-centered-toolbar'), opener:outer.querySelector('[data-popup-origin]')?.dataset.role,
          scrollRange:body.scrollHeight-body.clientHeight };
      });
      const assertCenteredPlacement = frame => {
        assert.equal(frame.centered, true);
        assert.ok(Math.abs(frame.top - (frame.areaTop + frame.bandBottom - frame.height) / 2) <= 1, JSON.stringify(frame));
        assert.ok(frame.top >= frame.areaTop - 1 && frame.bottom <= frame.bandBottom + 1, JSON.stringify(frame));
      };
      const closePlacement = async () => {
        await placementDialog.locator('[data-role=close]').tap();
        await placementDialog.waitFor({state:'hidden'});
        assert.equal(await placementDialog.getAttribute('data-centered-toolbar'), null);
      };
      for (const kind of ['automations','security','presence','weather','energy','settings']) {
        const source = toolbarButton(kind);
        await source.tap();
        const frame = await readToolbarPlacement();
        assert.equal(frame.opener, kind);
        assert.equal(await placementDialog.evaluate(dialog =>
          dialog.getRootNode().activeElement === dialog.querySelector('[data-role=close]')), true);
        if (['energy','settings'].includes(kind)) assertCenteredPlacement(frame);
        else {
          assert.equal(frame.centered, false);
          assert.ok(Math.abs(frame.top - (frame.areaTop - 78)) <= 1, JSON.stringify(frame));
        }
        await closePlacement();
        assert.equal(await source.evaluate(button => button.getRootNode().activeElement === button), true);
      }

      await toolbarPlacementPage.goto(toolbarPlacementUrl + '#panel/fixture-security');
      await placementDialog.waitFor();
      assertCenteredPlacement(await readToolbarPlacement());
      assert.equal((await readToolbarPlacement()).opener, undefined);
      await placementDialog.locator('[data-role=content]').evaluate(content => {
        const longContent = document.createElement('div');
        longContent.style.blockSize = '1300px';
        content.append(longContent);
      });
      assert.ok((await readToolbarPlacement()).scrollRange > 0);
      const fullHeight = await readToolbarPlacement();
      assert.ok(Math.abs(fullHeight.top - fullHeight.areaTop) <= 1);
      await toolbarPlacementPage.setViewportSize({width:391,height:650});
      await toolbarPlacementPage.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('dialog.modal').style.getPropertyValue('--bayit-popup-view-bottom') === '650px');
      const reducedHeight = await readToolbarPlacement();
      assertCenteredPlacement(reducedHeight);
      assert.ok(reducedHeight.height < fullHeight.height && reducedHeight.scrollRange > 0);
      await closePlacement();
      await toolbarPlacementPage.setViewportSize({width:391,height:845});

      await toolbarButton('settings').tap();
      const settingsPlacement = await readToolbarPlacement();
      const settingsCalendar = toolbarPlacementPage.getByRole('button',{name:rtlPlacement ? 'יומן' : 'Calendar',exact:true});
      await settingsCalendar.tap();
      await toolbarPlacementPage.waitForURL(url=>url.hash.startsWith('#panel/') && !url.hash.endsWith('/settings'));
      const calendarPlacement = await readToolbarPlacement();
      assertCenteredPlacement(calendarPlacement);
      assert.equal(calendarPlacement.opener,'settings');
      await toolbarPlacementPage.evaluate(()=>history.back());
      await settingsCalendar.waitFor();
      const settingsAfterBack = await readToolbarPlacement();
      assertCenteredPlacement(settingsAfterBack);
      assert.ok(Math.abs(settingsAfterBack.top-settingsPlacement.top) <= 1);
      await toolbarPlacementPage.evaluate(()=>history.forward());
      await toolbarPlacementPage.getByRole('dialog',{name:rtlPlacement ? 'יומן' : 'Calendar',exact:true}).waitFor();
      assertCenteredPlacement(await readToolbarPlacement());
      assert.deepEqual(await toolbarPlacementPage.evaluate(()=>window.bayitTest.calls.filter(call=>call.type==='call_service')),[]);
      await toolbarPlacementPage.close();
      console.log(engine + ': source-aware toolbar positioning, centered links, tall content, viewport and history');

      const entryPositionPage = await browser.newPage({
        viewport: { width:391, height:845 }, isMobile:true, hasTouch:true, reducedMotion:'reduce',
      });
      entryPositionPage.setDefaultTimeout(8000);
      const entryPositionUrl = base + '/fixture-home/home?entrance-popup-position';
      await entryPositionPage.goto(entryPositionUrl + '&locale=he');
      const positionedPopup = entryPositionPage.locator('dialog.modal:not(.confirm)');
      const popupFrame = () => positionedPopup.evaluate(popup => {
        const rectangle = node => {
          const { x, y, width, height } = node.getBoundingClientRect();
          return { x, y, width, height };
        };
        const root = popup.getRootNode();
        const { x, y, width } = rectangle(popup);
        const header = rectangle(popup.querySelector('.modal-header'));
        const close = rectangle(popup.querySelector('[data-role=close]'));
        const title = rectangle(popup.querySelector('.modal-header h2'));
        return { frame:{ x, y, width, header, close, title }, kind:popup.dataset.kind,
          roomPosition:popup.hasAttribute('data-room-position'), centered:popup.hasAttribute('data-centered-toolbar'),
          source:root.querySelector('[data-popup-origin]')?.dataset.role };
      });
      await entryPositionPage.getByRole('button', { name:'Studio', exact:true }).tap();
      const realRoomFrame = await popupFrame();
      assert.equal(realRoomFrame.kind, 'room');
      assert.ok(realRoomFrame.frame.close.width >= 44);
      await positionedPopup.locator('[data-role=close]').tap();
      await positionedPopup.waitFor({ state:'hidden' });
      assert.equal(await positionedPopup.getAttribute('data-room-position'), null);
      const launchSettings = entryPositionPage.locator('.chrome-button[data-role=settings]');
      await launchSettings.tap();
      const settingsFrame = await popupFrame();
      assert.equal(settingsFrame.centered, true);
      const entranceLink = entryPositionPage.getByRole('button', { name:'כניסה', exact:true });
      await entranceLink.tap();
      const entranceFrame = await popupFrame();
      assert.equal(entranceFrame.kind, 'toolbar');
      assert.equal(entranceFrame.roomPosition, true);
      assert.equal(entranceFrame.centered, false);
      assert.equal(entranceFrame.source, 'settings');
      assert.deepEqual(entranceFrame.frame, realRoomFrame.frame);
      assert.equal(new URL(entryPositionPage.url()).hash, '#panel/entry');
      await positionedPopup.locator('[data-light-tile] .device-tile').waitFor();
      await positionedPopup.locator('[data-layout=compact] .compact-status-lock').waitFor();
      await entryPositionPage.evaluate(() => history.back());
      await entranceLink.waitFor();
      assert.equal((await popupFrame()).roomPosition, false);
      assert.equal((await popupFrame()).frame.y, settingsFrame.frame.y);
      await entryPositionPage.getByRole('button', { name:'חלונית רגילה', exact:true }).tap();
      assert.equal((await popupFrame()).centered, true);
      assert.equal(new URL(entryPositionPage.url()).hash, '#panel/regular-device');
      await entryPositionPage.goto(entryPositionUrl + '&locale=he#panel/entry');
      await entryPositionPage.getByRole('dialog', { name:'כניסה', exact:true }).waitFor();
      assert.deepEqual((await popupFrame()).frame, entranceFrame.frame);
      assert.equal((await popupFrame()).source, undefined);
      assert.deepEqual(await entryPositionPage.evaluate(() => window.bayitTest.calls), []);
      await entryPositionPage.goto(entryPositionUrl + '&editor');
      await entryPositionPage.getByText('Toolbar and extra screens', { exact:true }).tap();
      await entryPositionPage.locator('#editor').getByRole('button', { name:'כניסה', exact:true }).tap();
      const roomPositionSetting = entryPositionPage.getByRole('checkbox', { name:'Use the room popup position', exact:true });
      assert.equal(await roomPositionSetting.isChecked(), true);
      await roomPositionSetting.uncheck();
      assert.equal(await entryPositionPage.evaluate(() => window.latest.toolbar.find(entry => entry.id === 'entry').popup_position), undefined);
      await roomPositionSetting.check();
      assert.equal(await entryPositionPage.evaluate(() => window.latest.toolbar.find(entry => entry.id === 'entry').popup_position), 'room');
      await entryPositionPage.getByLabel('Show in', { exact:true }).selectOption({ label:'Toolbar' });
      assert.equal(await roomPositionSetting.count(), 0);
      await entryPositionPage.getByLabel('Show in', { exact:true }).selectOption({ label:'Settings' });
      assert.equal(await roomPositionSetting.isChecked(), true);
      await entryPositionPage.close();
      console.log(engine + ': Entrance aligns with room geometry through Settings and direct routes');

      for (const [locale, width] of [['he', 320], ['en', 375], ['he', 390]]) {
        const coverGridPage = await browser.newPage({ viewport: { width, height: 800 }, hasTouch: true, reducedMotion: 'reduce' });
        await coverGridPage.goto(base + '?cover-grid&locale=' + locale);
        await coverGridPage.getByRole('button', { name: 'Studio', exact: true }).tap();
        const dialog = coverGridPage.getByRole('dialog', { name: 'Studio', exact: true });
        const covers = dialog.locator('[data-group="room_covers"] > [data-compact="cover"]');
        await covers.nth(1).waitFor();
        if (width === 390) {
          const transparent = 'rgba(0, 0, 0, 0)';
          const material = () => covers.first().evaluate(tile => {
            const icon = tile.querySelector('.device-panel-launch .device-icon');
            const command = tile.querySelector('[data-action="open"]');
            return {
              fallback: matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)').matches ||
                !(CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')),
              tile: getComputedStyle(tile).backgroundColor,
              icon: getComputedStyle(icon).backgroundColor,
              command: getComputedStyle(command).backgroundColor,
              commandEdge: getComputedStyle(command).borderTopColor,
            };
          });
          for (const contrast of ['no-preference', 'more']) {
            await coverGridPage.emulateMedia({ contrast });
            const appearance = await material();
            if (contrast === 'more') assert.equal(appearance.fallback, true);
            for (const fill of [appearance.tile, appearance.icon, appearance.command]) {
              assert.equal(fill === transparent, !appearance.fallback);
            }
            assert.equal(appearance.commandEdge === transparent, appearance.fallback);
          }
          await coverGridPage.emulateMedia({ contrast: 'no-preference' });
        }
        const geometry = await covers.evaluateAll(tiles => tiles.map(tile => ({
          top: tile.getBoundingClientRect().top,
          left: tile.getBoundingClientRect().left,
          scroll: tile.scrollWidth > tile.clientWidth,
          buttons: [...tile.querySelectorAll('.basic-actions button')].map(button => {
            const rect = button.getBoundingClientRect();
            return [button.dataset.action, rect.top, rect.width, rect.height];
          }),
        })));
        const [first, second] = geometry;
        assert.equal(first.top, second.top);
        assert.ok(first.left < second.left, 'Room cover order matches the grid in either language');
        for (const tile of geometry) {
          assert.equal(tile.scroll, false);
          assert.deepEqual(tile.buttons.map(([action]) => action), ['open', 'stop', 'close']);
          assert.equal(new Set(tile.buttons.map(([, top]) => top)).size, 1, 'Cover actions stay on one line');
          assert.ok(tile.buttons.every(([, , width, height]) => width >= 28 && height >= 44));
        }
        const curtain = dialog.locator('[data-entity="cover.demo_curtain"]');
        assert.equal(await curtain.locator('[data-action="open"] ha-icon').getAttribute('icon'), 'mdi:arrow-expand-horizontal');
        assert.equal(await curtain.locator('[data-action="close"] ha-icon').getAttribute('icon'), 'mdi:arrow-collapse-horizontal');
        const shade = dialog.locator('[data-entity="cover.demo_shade"]');
        assert.equal(await shade.locator('[data-action="open"] ha-icon').getAttribute('icon'), 'mdi:arrow-up');
        assert.equal(await shade.locator('[data-action="close"]').isDisabled(), true);
        assert.equal(await shade.locator('[data-action="stop"]').isEnabled(), true);
        if (width === 375) {
          const setShade = async (state, attributes, [open, close]) => {
            await coverGridPage.evaluate(([state, attributes]) => {
              const entity = 'cover.demo_shade';
              window.bayitTest.setFixtureAttributes(entity, { current_position: null, assumed_state: false, ...attributes });
              window.bayitTest.setRoomState(entity, state);
            }, [state, attributes]);
            await shade.locator('[data-action="open"]' + (open ? ':enabled' : ':disabled')).waitFor();
            await shade.locator('[data-action="close"]' + (close ? ':enabled' : ':disabled')).waitFor();
            assert.equal(await shade.locator('[data-action="stop"]').isEnabled(), true);
          };
          await setShade('open', { current_position: 25 }, [true,true]);
          await setShade('open', { current_position: 100 }, [false,true]);
          await setShade('opening', { current_position: 0 }, [false,false]);
          await setShade('closing', { current_position: 100 }, [false,false]);
          await setShade('opening', { current_position: 25 }, [false,true]);
          await setShade('closing', { current_position: 75 }, [true,false]);
          await setShade('closed', {}, [true,false]);
          await setShade('open', {}, [false,true]);
          await setShade('closed', { current_position: 0, assumed_state: true }, [true,true]);
          await setShade('open', { current_position: 45 }, [true,true]);
          const staleOpened = await shade.locator('[data-action="open"]').evaluate(button => {
            const enabled = !button.disabled;
            window.bayitTest.setFixtureAttributes('cover.demo_shade', { current_position: 100 });
            window.bayitTest.setRoomState('cover.demo_shade', 'open');
            button.click();
            return enabled;
          });
          assert.equal(staleOpened, true, 'Render still sees the previous eligible state when the click is dispatched');
          assert.deepEqual(await coverGridPage.evaluate(() => window.bayitTest.calls), []);
          await setShade('closed', { current_position: 0 }, [true,false]);
          const name = 'Long living room curtain';
          const header = curtain.getByRole('button', { name: name + ' · Device controls', exact: true });
          const details = coverGridPage.getByRole('dialog', { name, exact: true });
          const back = details.getByRole('button', { name: 'Back to room', exact: true });
          assert.ok((await header.boundingBox()).height >= 44);
          assert.equal(await curtain.locator('input[type=range]').count(), 0);
          assert.equal(await header.locator('button').count(), 0);
          const hold = () => header.getByText(name, { exact: true }).dispatchEvent('pointerdown',
            { pointerType:'touch', pointerId:5, button:0, isPrimary:true });
          const triggers = [() => header.getByText(name, { exact: true }).tap(), hold, () => header.press('Shift+Enter')];
          for (const trigger of triggers) {
            await trigger();
            await details.waitFor();
            if (trigger === hold) await coverGridPage.evaluate(() => document.dispatchEvent(
              new PointerEvent('pointerup', { pointerType:'touch', pointerId:5 })));
            await coverGridPage.waitForFunction(() => location.hash === '#device/studio/cover.demo_curtain');
            assert.equal(await details.locator('input[type=range]').inputValue(), '0');
            await back.tap();
            await coverGridPage.waitForFunction(() => location.hash === '#room-studio');
            await header.waitFor();
            assert.equal(await header.evaluate(button => button.getRootNode().activeElement === button), true);
            assert.deepEqual(await coverGridPage.evaluate(() => window.bayitTest.calls), []);
          }
          await coverGridPage.evaluate(() => history.back());
          await dialog.waitFor({ state:'hidden' });
          await coverGridPage.locator('[data-popup-origin]').waitFor({ state:'detached' });
          await coverGridPage.getByRole('button', { name: 'Studio', exact: true }).tap();
          await header.waitFor();
        }
        await dialog.locator('[data-entity="cover.demo_shade"] [data-action="open"]').tap();
        assert.deepEqual(await coverGridPage.evaluate(() => window.bayitTest.calls), [
          { type: 'call_service', domain: 'cover', service: 'open_cover', service_data: {}, target: { entity_id: 'cover.demo_shade' } },
        ]);
        await coverGridPage.close();
      }
      console.log(engine + ': cover rails at 320–390 px, room detail tap/hold/keyboard, Back and zero movement');

      for (const [locale, width] of [['he', 320], ['en', 390]]) {
        const effectsPage = await browser.newPage({ viewport: { width, height: 760 }, hasTouch: true });
        const many = locale === 'en' ? '&many-effect-categories' : '';
        await effectsPage.goto(base + '?room-grid&grouped-effects&locale=' + locale + many);
        await effectsPage.getByRole('button', { name: 'Studio', exact: true }).tap();
        await effectsPage.getByRole('dialog').locator('[data-entity="light.demo_pendant"] .device-tile').press('Shift+Enter');
        const effectsDialog = effectsPage.getByRole('dialog', { name: 'Pendant lamp', exact: true });
        const gallery = effectsDialog.getByRole('region', { name: locale === 'he' ? 'אפקט תאורה' : 'Light effect' });
        const apply = gallery.getByRole('button', { name: locale === 'he' ? 'החל · אפקט תאורה' : 'Apply · Light effect' });
        const gentle = gallery.getByRole('button', { name: 'Gentle glow · Slow pulse', exact: true });
        const mode = effectsDialog.getByRole('group', { name: locale === 'he' ? 'מצב תאורה' : 'Light mode' });
        const effectsMode = mode.getByRole('button', { name: locale === 'he' ? 'אפקטים' : 'Effects', exact: true });
        const fixedMode = mode.getByRole('button', { name: locale === 'he' ? 'צבע קבוע' : 'Fixed color', exact: true });
        const whiteMode = mode.getByRole('button', { name: locale === 'he' ? 'לבן' : 'White', exact: true });
        const color = effectsDialog.getByLabel(locale === 'he' ? 'צבע התאורה' : 'Light color', { exact: true });
        const white = effectsDialog.getByRole('slider', { name: locale === 'he' ? 'גוון לבן' : 'White temperature', exact: true });
        await white.waitFor();
        assert.equal(await whiteMode.getAttribute('aria-pressed'), 'true');
        assert.equal(await effectsMode.getAttribute('aria-pressed'), 'false');
        assert.equal(await white.inputValue(), '3200');
        assert.equal(await color.isVisible(), false);
        assert.equal(await gallery.isVisible(), false);
        assert.equal(await mode.evaluate(el => el.scrollWidth > el.clientWidth), false);
        assert.ok(await fixedMode.evaluate(el => el.offsetHeight >= 44));
        await fixedMode.press('Enter');
        await color.waitFor();
        assert.equal(await white.isVisible(), false);
        await effectsMode.press('Enter');
        await gentle.waitFor();
        assert.equal(await gallery.getByText('Missing').count(), 0);
        assert.equal(await apply.isDisabled(), true);
        await gentle.tap();
        assert.equal(await gentle.getAttribute('aria-pressed'), 'true');
        assert.equal(await effectsPage.evaluate(() => window.bayitTest.calls.length), 0);
        if (locale === 'he') {
          await gallery.getByRole('button', { name: 'אפקטים נוספים', exact: true }).tap();
          await gallery.getByText('נבחר · Gentle glow', { exact: true }).waitFor();
        } else {
          assert.equal(await gallery.getByText('1 of 2', { exact: true }).count(), 1);
          await gallery.getByRole('button', { name: 'Next', exact: true }).tap();
          await gallery.getByRole('button', { name: 'Preset 7', exact: true }).waitFor();
          await gallery.getByText('Selected · Gentle glow', { exact: true }).waitFor();
          await gallery.getByRole('button', { name: 'Previous', exact: true }).tap();
          await gentle.waitFor();
          assert.equal(await gentle.getAttribute('aria-pressed'), 'true');
          await gallery.getByRole('combobox', { name: 'Effect categories' }).selectOption({ label: 'Other effects' });
          await gallery.getByText('Selected · Gentle glow', { exact: true }).waitFor();
        }
        const leftover = gallery.getByRole('button', { name: 'Color loop', exact: true });
        await leftover.waitFor();
        assert.ok((await leftover.boundingBox()).height >= 44);
        assert.equal(await gallery.evaluate(el => el.scrollWidth > el.clientWidth), false);
        assert.equal(await effectsPage.evaluate(() => window.bayitTest.calls.length), 0);
        await apply.tap();
        await gallery.getByText(locale === 'he' ? 'פעיל · Gentle glow' : 'Active · Gentle glow', { exact: true }).waitFor();
        assert.equal(await apply.isDisabled(), true);
        assert.deepEqual(await effectsPage.evaluate(() => window.bayitTest.calls), [
          { type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
            service_data: { effect: 'Slow pulse' } },
        ]);
        await fixedMode.press('Enter');
        await color.fill('#804020');
        assert.equal(await effectsPage.evaluate(() => window.bayitTest.calls.length), 1);
        const applyColor = effectsDialog.getByRole('button', {
          name: locale === 'he' ? 'החל · צבע התאורה' : 'Apply · Light color', exact: true,
        });
        await applyColor.tap();
        await effectsDialog.getByText(locale === 'he' ? 'המצב של Pendant lamp עודכן.' : 'Pendant lamp updated.', { exact: true }).waitFor();
        assert.deepEqual(await effectsPage.evaluate(() => window.bayitTest.calls[1]), {
          type: 'call_service', domain: 'light', service: 'turn_on', target: { entity_id: 'light.demo_pendant' },
          service_data: { rgb_color: [128, 64, 32] },
        });
        await whiteMode.press('Enter');
        await white.waitFor();
        await effectsPage.evaluate(() => window.bayitTest.setLightModes('light.demo_pendant', ['xy']));
        await whiteMode.waitFor({ state: 'detached' });
        assert.equal(await effectsMode.getAttribute('aria-pressed'), 'true', 'Use the reported active effect when the user mode is temporarily unsupported');
        await effectsPage.evaluate(() => window.bayitTest.setLightModes('light.demo_pendant', ['color_temp', 'xy']));
        await white.waitFor();
        assert.equal(await whiteMode.getAttribute('aria-pressed'), 'true', 'Remember the user mode when the capability returns');
        assert.equal(await effectsPage.evaluate(() => window.bayitTest.calls.length), 2);
        await fixedMode.press('Enter');
        await fixedMode.focus();
        await effectsPage.evaluate(() => window.bayitTest.setLightModes('light.demo_pendant', ['xy']));
        await whiteMode.waitFor({ state: 'detached' });
        assert.equal(await fixedMode.getAttribute('aria-pressed'), 'true');
        assert.equal(await fixedMode.evaluate(el => el.getRootNode().activeElement === el), true);
        await effectsPage.evaluate(() => window.bayitTest.setRoomState('light.demo_pendant', 'unavailable'));
        await mode.waitFor({ state: 'hidden' });
        assert.equal(await color.isVisible(), false);
        await effectsPage.keyboard.press('Escape');
        await effectsDialog.waitFor({ state: 'hidden' });
        await effectsPage.getByRole('button', { name: 'Studio', exact: true }).tap();
        await effectsPage.getByRole('dialog').locator('[data-entity="light.demo_monitor"] .device-tile').press('Shift+Enter');
        const readOnlyLight = effectsPage.getByRole('dialog', { name: 'Monitor lamp', exact: true });
        await readOnlyLight.waitFor();
        assert.equal(await readOnlyLight.locator('.light-effect-gallery, .light-mode-bar, [data-action="set_effect"]').count(), 0);
        await effectsPage.close();
      }

      for (const locale of ['en', 'he']) {
        for (const width of [320, 390]) {
          const page = await browser.newPage({ viewport: { width, height: 760 }, hasTouch: true, reducedMotion: 'reduce' });
          const rtl = locale === 'he';
          const caption = width === 390 ? '&inline-timer-caption' : '';
          const name = caption ? 'Near the window' : 'Studio air conditioner';
          const fullUnit = rtl ? 'דקות' : 'Minutes';
          const shortUnit = rtl ? 'דק׳' : 'min';
          const start = rtl ? 'הפעלת טיימר' : 'Start timer';
          await page.goto(base + '?device-panel&compact-climate-summary&locale=' + locale + caption);
          await page.getByRole('button', { name: 'Studio', exact: true }).tap();
          const room = page.getByRole('dialog', { name: 'Studio', exact: true });
          const inline = room.locator('[data-inline-climate]');
          await inline.waitFor();
          const climate = await inline.evaluate(card => {
            const frame = card.parentElement;
            const glyph = card.querySelector('.device-icon').getBoundingClientRect();
            const info = card.querySelector('.round-action').getBoundingClientRect();
            return {
              sectionRim: getComputedStyle(frame).borderTopWidth,
              innerRim: getComputedStyle(card).borderTopWidth,
              innerPadding: getComputedStyle(card).paddingTop,
              glyphSize: glyph.width,
              glyphLeft: glyph.right < info.left,
              infoSize: [info.width, info.height],
              horizontalOverflow: card.scrollWidth > card.clientWidth,
            };
          });
          assert.deepEqual(climate, { sectionRim: '1px', innerRim: '0px', innerPadding: '0px',
            glyphSize: 36, glyphLeft: true, infoSize: [44, 44], horizontalOverflow: false });
          const title = inline.getByRole('heading', { name, exact: true });
          assert.equal(await title.getAttribute('data-room-name-hidden'), caption ? null : '');
          const info = inline.getByRole('button', { name: (rtl ? 'מידע נוסף' : 'More info') + ' · ' + name, exact: true });

          const summary = inline.locator('.device-head .current');
          const off = rtl ? 'כבוי' : 'Off';
          const cool = rtl ? 'קירור' : 'Cooling';
          const target = rtl ? 'יעד' : 'Target';
          const readSummary = async () => (await summary.innerText()).replace(/[⁦⁩]/g, '');
          assert.equal(await readSummary(), off + ' · 22°');
          await page.evaluate(() => window.bayitTest.setRoomState('climate.demo_air', 'cool'));
          await summary.filter({ hasText: cool }).waitFor();
          assert.equal(await readSummary(), cool + ' · 22° · ' + target + ' 24°');
          await page.evaluate(() => window.bayitTest.setRoomState('climate.demo_air', 'off'));
          await summary.filter({ hasText: off }).waitFor();

          const duration = inline.getByRole('slider', { name: fullUnit, exact: true });
          assert.equal(await duration.inputValue(), '120');
          assert.equal(await duration.getAttribute('aria-valuetext'), '120 ' + fullUnit);
          assert.equal(await duration.evaluate(element => getComputedStyle(element).appearance), 'none');
          assert.ok((await duration.boundingBox()).height >= 44);
          await duration.press('ArrowLeft');
          assert.equal(await duration.inputValue(), '105');
          assert.equal(await duration.getAttribute('aria-valuetext'), '105 ' + fullUnit);
          assert.equal(await inline.locator('.timer-amount').innerText(), '105 ' + shortUnit);
          const preset = inline.getByRole('button', { name: start + ' · 60 ' + fullUnit, exact: true });
          assert.equal(await preset.innerText(), '60 ' + shortUnit);
          assert.equal(await preset.evaluate(button => getComputedStyle(button, '::before').top), '6px');
          assert.ok((await preset.boundingBox()).height >= 44);
          const startButton = inline.getByRole('button', { name: start, exact: true });
          assert.ok((await startButton.boundingBox()).height >= 44);
          assert.equal(await page.evaluate(() => window.bayitTest.calls.length), 0);
          await startButton.press('Enter');
          await page.waitForFunction(() => window.bayitTest.calls.length === 1);
          assert.deepEqual(await page.evaluate(() => window.bayitTest.calls[0]), {
            type: 'call_service', domain: 'simple_timer', service: 'start_timer',
            service_data: { entity_id: 'sensor.demo_air_usage', duration: 105, unit: 'min', reverse_mode: false },
          });
          await info.tap();
          await room.waitFor();
          assert.deepEqual(await page.evaluate(() => window.bayitTest.moreInfoCalls), ['climate.demo_air']);
          await page.close();
        }
      }

      const detailPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const rightToLeft = engine === 'WebKit';
      await detailPage.goto(base + '?device-panel&locale=' + (rightToLeft ? 'he' : 'en'));
      const quickAir = detailPage.locator('.quick-button[data-entity="climate.demo_air"]');
      await quickAir.click({ delay: 600 });
      const air = detailPage.getByRole('dialog', { name: 'Studio air conditioner', exact: true });
      await air.getByRole('button', { name: rightToLeft ? 'העלאת טמפרטורת היעד' : 'Increase target temperature' }).waitFor();
      await assertDeviceHeading(air, 'Studio air conditioner');
      assert.equal(await quickAir.getAttribute('data-popup-origin'), '');
      const airBody = await air.locator('.modal-body').evaluate(body => {
        const styles = getComputedStyle(body);
        const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
        return {
          available: body.clientHeight,
          scroll: body.scrollHeight,
          content: body.querySelector('[data-role="content"]').offsetHeight + padding,
        };
      });
      assert.equal(airBody.scroll, airBody.available, 'A short thermostat panel needs no scroll');
      assert.ok(Math.abs(airBody.available - airBody.content) < 3, 'A short thermostat panel fits its contents');
      assert.equal(await air.getByRole('combobox', { name: rightToLeft ? 'נדנוד' : 'Swing' }).inputValue(), 'off');
      assert.equal(await air.getByText(rightToLeft ? 'שימוש היום 10:00' : 'Used today 10:00', { exact: true }).count(), 1);
      const presetPositions = await air.locator('.timer-preset').evaluateAll(presets =>
        presets.map(item => item.getBoundingClientRect().left));
      assert.equal(presetPositions.length, 4);
      assert.ok(presetPositions.every((left, index) => index === 0 || left > presetPositions[index - 1]));
      assert.equal(await detailPage.evaluate(() => window.bayitTest.calls.length), 0);
      await air.getByRole('button', { name: rightToLeft ? 'הפעלת טיימר · 60 דקות' : 'Start timer · 60 Minutes', exact: true }).click();
      await air.getByRole('button', { name: rightToLeft ? 'הארכת טיימר' : 'Extend timer', exact: true }).waitFor();
      assert.deepEqual(await detailPage.evaluate(() => window.bayitTest.calls[0]), {
        type: 'call_service', domain: 'simple_timer', service: 'start_timer',
        service_data: {entity_id: 'sensor.demo_air_usage', duration: 60, unit: 'min', reverse_mode: false},
      });
      await detailPage.keyboard.press('Escape');
      await air.waitFor({ state: 'hidden' });
      assert.equal(await quickAir.evaluate(control => control.getRootNode().activeElement === control), true);
      await detailPage.close();

      const labelPage = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      labelPage.setDefaultTimeout(8000);
      const labelLang = rightToLeft ? 'he' : 'en';
      const labelURL = base + '?device-panel&locale=' + labelLang + '&climate-labels=';
      const openClimateLabels = async variant => {
        await labelPage.goto(labelURL + variant);
        await labelPage.locator('.quick-button[data-entity="climate.demo_air"]').press('Shift+Enter');
        const modal = labelPage.getByRole('dialog', { name: 'Studio air conditioner', exact: true });
        await modal.waitFor();
        return modal;
      };
      const optionValues = select => select.locator('option:not([disabled])').evaluateAll(options =>
        options.map(option => [option.value, option.textContent]));
      const positioned = await openClimateLabels('positioned');
      const swingName = rightToLeft ? 'נדנוד' : 'Swing';
      const fanName = rightToLeft ? 'מהירות מאוורר' : 'Fan speed';
      const horizontalName = rightToLeft ? 'נדנוד אופקי' : 'Horizontal swing';
      const swing = positioned.getByRole('combobox', { name: swingName, exact: true });
      const fan = positioned.getByRole('combobox', { name: fanName, exact: true });
      await labelPage.setViewportSize({ width: 391, height: 845 });
      const primaryControls = await positioned.locator('.climate-controls > *').evaluateAll(controls =>
        controls.map(control => {
          const { top, width, height } = control.getBoundingClientRect();
          return { top: Math.round(top), width, height };
        }));
      assert.equal(primaryControls.length, 4);
      assert.equal(new Set(primaryControls.map(control => control.top)).size, 1);
      assert.ok(primaryControls.every(control => control.width >= 44 && control.height >= 44));
      await labelPage.setViewportSize({ width: 320, height: 844 });
      const expectedOptions = rows => rows.map(([value, en, he]) => [value, rightToLeft ? he : en]);
      assert.deepEqual(await optionValues(swing), expectedOptions([
        ['default', 'No swing', 'ללא נדנוד'], ['full_swing', 'Full swing', 'נדנוד מלא'],
        ['fixed_upper', 'Fixed – Upper', 'קבוע – עליון'], ['fixed_upper_middle', 'Fixed – Upper middle', 'קבוע – עליון־אמצעי'],
        ['fixed_middle', 'Fixed – Middle', 'קבוע – אמצעי'], ['fixed_lower_middle', 'Fixed – Lower middle', 'קבוע – תחתון־אמצעי'],
        ['fixed_lower', 'Fixed – Lower', 'קבוע – תחתון'], ['swing_upper', 'Swing – Upper', 'נדנוד – עליון'],
        ['swing_upper_middle', 'Swing – Upper middle', 'נדנוד – עליון־אמצעי'], ['swing_middle', 'Swing – Middle', 'נדנוד – אמצעי'],
        ['swing_lower_middle', 'Swing – Lower middle', 'נדנוד – תחתון־אמצעי'], ['swing_lower', 'Swing – Lower', 'נדנוד – תחתון'],
      ]));
      assert.equal(await swing.inputValue(), 'default');
      assert.deepEqual(await optionValues(fan), expectedOptions([
        ['auto', 'Auto', 'אוטומטי'], ['low', 'Low', 'נמוך'], ['medium low', 'Medium low', 'בינוני נמוך'],
        ['medium', 'Medium', 'בינוני'], ['medium high', 'Medium high', 'בינוני גבוה'], ['high', 'High', 'גבוה'],
      ]));
      assert.equal(await fan.inputValue(), 'medium low');
      const horizontal = positioned.getByRole('combobox', { name: horizontalName, exact: true });
      const extraControls = positioned.locator('.climate-extra-controls');
      assert.equal(await extraControls.evaluate(details => details.open), false);
      assert.equal(await horizontal.count(), 0);
      await extraControls.locator('summary').tap();
      assert.equal(await extraControls.evaluate(details => details.open), true);
      const applyDirection = positioned.getByRole('button', {
        name: (rightToLeft ? 'החל' : 'Apply') + ' · ' + horizontalName, exact: true,
      });
      assert.deepEqual(await optionValues(horizontal), expectedOptions([
        ['default', 'Default', 'ברירת מחדל'], ['full_swing', 'Full swing', 'נדנוד מלא'], ['left', 'Left', 'שמאל'],
        ['left_center', 'Left-center', 'שמאל־מרכז'], ['center', 'Center', 'מרכז'],
        ['right_center', 'Right-center', 'ימין־מרכז'], ['right', 'Right', 'ימין'],
      ]));
      assert.equal(await horizontal.inputValue(), '');
      assert.ok(await applyDirection.isDisabled());
      assert.ok((await horizontal.boundingBox()).height >= 44);
      assert.equal(await labelPage.evaluate(() => window.bayitTest.calls.length), 0);
      await horizontal.selectOption('left_center');
      assert.equal(await labelPage.evaluate(() => window.bayitTest.calls.length), 0);
      await applyDirection.tap();
      assert.equal(await horizontal.inputValue(), 'left_center');
      assert.equal(await swing.inputValue(), 'default');
      await swing.selectOption({ label: rightToLeft ? 'קבוע – עליון־אמצעי' : 'Fixed – Upper middle' });
      await fan.selectOption({ label: rightToLeft ? 'בינוני גבוה' : 'Medium high' });
      assert.deepEqual(await labelPage.evaluate(() => window.bayitTest.calls), [
        { type: 'call_service', domain: 'climate', service: 'set_swing_horizontal_mode',
          target: { entity_id: 'climate.demo_air' }, service_data: { swing_horizontal_mode: 'left_center' } },
        { type: 'call_service', domain: 'climate', service: 'set_swing_mode',
          target: { entity_id: 'climate.demo_air' }, service_data: { swing_mode: 'fixed_upper_middle' } },
        { type: 'call_service', domain: 'climate', service: 'set_fan_mode',
          target: { entity_id: 'climate.demo_air' }, service_data: { fan_mode: 'medium high' } },
      ]);
      assert.equal(await horizontal.inputValue(), 'left_center');
      assert.equal(await swing.inputValue(), 'fixed_upper_middle');
      assert.equal(await extraControls.evaluate(details => details.open), true);
      await labelPage.keyboard.press('Escape');
      await positioned.waitFor({ state: 'hidden' });
      await labelPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      const compactClimate = labelPage.getByRole('dialog', { name: 'Studio', exact: true }).locator('[data-inline-climate]');
      await compactClimate.waitFor();
      assert.equal(await compactClimate.getByRole('combobox', { name: horizontalName, exact: true }).count(), 0);
      assert.equal(await compactClimate.getByRole('combobox', { name: swingName, exact: true }).inputValue(), 'fixed_upper_middle');
      assert.equal(await labelPage.evaluate(() => window.bayitTest.calls.length), 3);
      const lounge = await openClimateLabels('lounge');
      assert.equal(await lounge.getByRole('combobox', { name: swingName, exact: true }).count(), 0);
      assert.equal(await lounge.getByRole('combobox', { name: horizontalName, exact: true }).count(), 0);
      assert.deepEqual(await optionValues(lounge.getByRole('combobox', { name: fanName, exact: true })), expectedOptions([
        ['auto', 'Auto', 'אוטומטי'], ['sleep', 'Sleep', 'שינה'], ['quiet', 'Quiet', 'שקט'], ['low', 'Low', 'נמוך'],
        ['health', 'Health', 'בריאות'], ['medium', 'Medium', 'בינוני'], ['natural', 'Natural', 'טבעי'],
        ['strong', 'Strong', 'חזק'], ['high', 'High', 'גבוה'],
      ]));
      const generic = await openClimateLabels('generic');
      assert.equal(await generic.getByRole('combobox', { name: horizontalName, exact: true }).count(), 0);
      assert.deepEqual(await optionValues(generic.getByRole('combobox', { name: swingName, exact: true })), expectedOptions([
        ['default', 'default', 'default'], ['vertical', 'Vertical', 'אנכי'], ['custom_span', 'custom_span', 'custom_span'],
      ]));
      await labelPage.close();
      console.log(engine + ' 320: horizontal and vertical climate controls keep independent native values and respect advertised capabilities');

      const swingPage = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      swingPage.setDefaultTimeout(8000);
      const swingUrl = base + '?configuration&device-panel&climate-labels=positioned&swing-unreported';
      await swingPage.goto(swingUrl + '&locale=' + labelLang);
      await swingPage.locator('.quick-button[data-entity="climate.demo_air"]').press('Shift+Enter');
      const swingDetails = swingPage.getByRole('dialog', { name: 'Studio air conditioner', exact: true });
      const choice = panel => panel.getByRole('combobox', { name:swingName, exact:true });
      const vertical = choice(swingDetails);
      const write = (attributes) => swingPage.evaluate(attributes =>
        window.bayitTest.setFixtureAttributes('climate.demo_air', attributes), attributes);
      const labelOf = select => select.locator('option:checked').textContent();
      const noSwingLabel = rightToLeft ? 'ללא נדנוד' : 'No swing';
      const noReport = rightToLeft ? /לא מדווח/ : /is not reporting/;
      await vertical.waitFor();
      assert.equal(await vertical.inputValue(), '');
      assert.equal(await labelOf(vertical), noSwingLabel);
      assert.match(await vertical.getAttribute('aria-description'), noReport);
      const placeholder = vertical.locator('option[value=""]');
      assert.equal(await placeholder.evaluate(option => option.disabled && option.hidden), true);
      await vertical.evaluate(select => select.dispatchEvent(new Event('change', { bubbles:true })));
      assert.deepEqual(await swingPage.evaluate(() => window.bayitTest.calls), []);
      await vertical.selectOption('default');
      await vertical.locator('option:checked[value="default"]').waitFor({ state:'attached' });
      await swingPage.waitForFunction(() => {
        const select = document.querySelector('bayit-dashboard').shadowRoot.querySelector('select[data-action=set_swing_mode]');
        return !select.disabled && !select.hasAttribute('aria-description');
      });
      assert.deepEqual(await swingPage.evaluate(() => window.bayitTest.calls), [{
        type:'call_service', domain:'climate', service:'set_swing_mode', target:{ entity_id:'climate.demo_air' },
        service_data:{ swing_mode:'default' },
      }]);
      await write({ swing_mode:'fixed_upper_middle' });
      await vertical.locator('option:checked[value="fixed_upper_middle"]').waitFor({ state:'attached' });
      assert.equal(await vertical.getAttribute('aria-description'), null);
      await write({ swing_mode:'unknown' });
      await vertical.locator('option:checked[value=""]').waitFor({ state:'attached' });
      assert.equal(await labelOf(vertical), '—');
      assert.equal(await vertical.getAttribute('aria-description'), null);
      await swingPage.evaluate(() =>
        window.bayitTest.setFixtureAttributes('climate.demo_air', { swing_mode:undefined }));
      await vertical.locator('option:checked[value=""]').filter({ hasText:noSwingLabel }).waitFor({ state:'attached' });
      assert.match(await vertical.getAttribute('aria-description'), noReport);
      await swingPage.keyboard.press('Escape');
      await swingDetails.waitFor({ state:'hidden' });
      await swingPage.getByRole('button', { name:'Studio', exact:true }).tap();
      const inline = choice(swingPage.getByRole('dialog', { name:'Studio', exact:true }).locator('[data-inline-climate]'));
      await inline.waitFor();
      assert.equal(await labelOf(inline), noSwingLabel);
      assert.equal(await inline.inputValue(), '');
      assert.match(await inline.getAttribute('aria-description'), noReport);
      await write({ swing_modes:['full_swing','fixed_upper_middle'] });
      await inline.locator('option[value="full_swing"]').waitFor({ state:'attached' });
      await inline.locator('option[value="default"]').waitFor({ state:'detached' });
      assert.equal(await labelOf(inline), '—');
      assert.equal(await inline.getAttribute('aria-description'), null);
      assert.equal(await swingPage.evaluate(() => window.bayitTest.calls.length), 1);

      await swingPage.goto(swingUrl + '&editor');
      await swingPage.getByText('Boiler and heater controls', { exact:true }).click();
      await swingPage.getByRole('button', { name:'Edit', exact:true }).click();
      const fallbackEditor = swingPage.getByLabel('Display when vertical swing is unreported', { exact:true });
      await fallbackEditor.waitFor();
      assert.equal(await fallbackEditor.inputValue(), 'default');
      assert.equal(await fallbackEditor.locator('option').count(), 13);
      const editorEntity = swingPage.getByLabel('Heating device', { exact:true });
      await editorEntity.selectOption('climate.demo_no_swing');
      await fallbackEditor.waitFor({ state:'hidden' });
      await editorEntity.selectOption('climate.demo_air');
      await fallbackEditor.selectOption('fixed_upper_middle');
      await swingPage.getByRole('button', { name:'Save profile', exact:true }).click();
      assert.equal(await swingPage.evaluate(() => window.latest.profiles[0].unreported_swing_mode), 'fixed_upper_middle');
      await swingPage.close();
      console.log(engine + ' 320: unreported vertical swing is a distinct placeholder with one explicit native command and profile editing');

      const presetPage = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      await assertRoomClimatePower(browser);
      await assertCompactClimateRail(browser);
      const presetURL = base + '?device-panel&preset-shortcut';
      const presetName = rightToLeft ? 'SE · בחירת תוכנית ברירת מחדל' : 'SE · Set preset to Default';
      const preset = panel => panel.getByRole('button', { name: presetName, exact: true });
      const climatePanel = presetPage.getByRole('dialog', { name: 'Studio air conditioner', exact: true });
      const studioRoom = presetPage.getByRole('dialog', { name: 'Studio', exact: true });
      const openDetails = room => presetPage.locator('.room[data-room="' + room + '"] .quick-button[data-entity="climate.demo_air"]')
        .press('Shift+Enter');
      const reportPreset = (options, observed) => presetPage.evaluate(async ({ options, observed }) => {
        window.bayitTest.setFixtureAttributes('climate.demo_air', { preset_modes: options, preset_mode: observed });
        await new Promise(requestAnimationFrame);
      }, { options, observed });
      await presetPage.goto(presetURL + '&locale=' + (rightToLeft ? 'he' : 'en'));
      await presetPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      await preset(studioRoom).waitFor();
      assert.equal(await preset(studioRoom).getAttribute('data-highlighted'), '');
      assert.ok((await preset(studioRoom).boundingBox()).height >= 44);
      assert.equal(await preset(studioRoom).locator('ha-icon').getAttribute('icon'), 'mdi:leaf');
      assert.equal(await preset(studioRoom).getAttribute('aria-description'),
        rightToLeft ? 'תוכנית נוכחית: חיסכון' : 'Current preset: Eco');
      assert.deepEqual(await presetPage.evaluate(() => window.bayitTest.calls), []);
      await preset(studioRoom).tap();
      assert.equal(await preset(studioRoom).getAttribute('data-highlighted'), '');
      assert.ok(await preset(studioRoom).isDisabled());
      assert.deepEqual(await presetPage.evaluate(() => window.bayitTest.calls), [{
        type: 'call_service', domain: 'climate', service: 'set_preset_mode',
        target: { entity_id: 'climate.demo_air' }, service_data: { preset_mode: 'none' },
      }]);
      await presetPage.evaluate(() => window.bayitTest.finishClimatePreset());
      await presetPage.waitForFunction(() => {
        const control = document.querySelector('bayit-dashboard').shadowRoot.querySelector('.climate-preset-shortcut');
        return !control.disabled && !control.hasAttribute('data-highlighted');
      });
      await presetPage.keyboard.press('Escape');
      await studioRoom.waitFor({ state: 'hidden' });
      await openDetails('studio');
      await preset(climatePanel).waitFor();
      await reportPreset(['none', 'eco', 'boost'], 'eco');
      assert.equal(await preset(climatePanel).getAttribute('data-highlighted'), '');
      await reportPreset(['none', 'eco', 'boost'], null);
      assert.equal(await preset(climatePanel).getAttribute('data-highlighted'), null);
      assert.equal(await preset(climatePanel).getAttribute('aria-description'), null);
      await reportPreset(['eco', 'boost'], 'eco');
      assert.equal(await preset(climatePanel).count(), 0);
      await presetPage.keyboard.press('Escape');
      await climatePanel.waitFor({ state: 'hidden' });
      await reportPreset(['none', 'eco', 'boost'], 'eco');
      await openDetails('bayit_room_other_preset');
      await climatePanel.waitFor();
      assert.equal(await preset(climatePanel).count(), 0);
      assert.equal(await presetPage.evaluate(() => window.bayitTest.calls.length), 1);
      await presetPage.goto(presetURL + '&missing-preset-service');
      await presetPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      await studioRoom.waitFor();
      assert.equal(await studioRoom.locator('.climate-preset-shortcut:visible').count(), 0);
      assert.deepEqual(await presetPage.evaluate(() => window.bayitTest.calls), []);
      await presetPage.goto(presetURL + '&editor');
      await presetPage.getByText('Rooms', { exact: true }).click();
      await presetPage.getByLabel('Room to customize', { exact: true }).selectOption('studio');
      await presetPage.getByText('Device display', { exact: true }).click();
      await presetPage.getByLabel('Device to customize', { exact: true }).selectOption('climate.demo_air');
      const presetPicker = presetPage.getByLabel('Preset shortcut', { exact: true });
      assert.equal(await presetPicker.inputValue(), 'none');
      assert.equal(await presetPage.getByLabel('Highlight when this preset is reported', { exact: true }).inputValue(), 'eco');
      await presetPicker.selectOption('boost');
      assert.deepEqual(await presetPage.evaluate(() => window.latest.room_overrides.studio
        .climate_preset_shortcuts['climate.demo_air']), { preset: 'boost', label: 'SE', icon: 'mdi:leaf', highlight_when: 'eco' });
      await presetPicker.selectOption('');
      assert.equal(await presetPage.evaluate(() => window.latest.room_overrides.studio.climate_preset_shortcuts), undefined);
      await presetPage.close();
      console.log(engine + ' 320: room-scoped climate preset, native feedback, capability guards and editor');

      const usagePage = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      const usageURL = base + '?device-panel&timer-usage&locale=' + (rightToLeft ? 'he' : 'en');
      const openUsage = async flags => {
        await usagePage.goto(usageURL + flags);
        await usagePage.locator('.quick-button[data-entity="climate.demo_air"]').press('Shift+Enter');
        const opened = usagePage.getByRole('dialog', { name: 'Studio air conditioner', exact: true });
        await opened.waitFor();
        return opened;
      };
      const usedLabel = rightToLeft ? 'שימוש היום' : 'Used today';
      const moreUsage = rightToLeft ? 'מידע נוסף' : 'More info';
      const usageButton = (panel, amount) => panel.getByRole('button', { name: usedLabel + ' ' + amount + ' · ' + moreUsage, exact: true });
      const usageConfirmation = usagePage.getByRole('dialog', { name: rightToLeft ? 'אישור פעולה' : 'Confirm action', exact: true });
      const cancelUsage = usageConfirmation.getByRole('button', { name: rightToLeft ? 'ביטול' : 'Cancel', exact: true });
      const confirmUsage = usageConfirmation.getByRole('button', { name: rightToLeft ? 'אישור' : 'Confirm', exact: true });
      const usePanel = await openUsage('');
      const reading = usageButton(usePanel, '10:00');
      await reading.tap();
      await usePanel.waitFor();
      assert.deepEqual(await usagePage.evaluate(() => window.bayitTest.moreInfoCalls), ['sensor.demo_air_usage']);
      assert.deepEqual(await usagePage.evaluate(() => window.bayitTest.calls), []);
      await reading.click({ delay: 620 });
      await usageConfirmation.waitFor();
      assert.equal(await usagePage.evaluate(() => window.bayitTest.calls.length), 0);
      await cancelUsage.tap();
      await usageConfirmation.waitFor({ state: 'hidden' });
      await reading.press('Shift+Enter');
      await usageConfirmation.waitFor();
      await usagePage.evaluate(async () => {
        window.bayitTest.setFixtureAttributes('sensor.demo_air_usage', { entry_id: 'fixture-replaced-entry' });
        await new Promise(requestAnimationFrame);
      });
      await confirmUsage.tap();
      await usageConfirmation.waitFor({ state: 'hidden' });
      assert.equal(await usagePage.evaluate(() => window.bayitTest.calls.length), 0);
      await reading.press('Shift+Enter');
      await usageConfirmation.waitFor();
      await confirmUsage.tap();
      await usagePage.waitForFunction(() => window.bayitTest.calls.length === 1);
      assert.deepEqual(await usagePage.evaluate(() => window.bayitTest.calls), [{
        type: 'call_service', domain: 'simple_timer', service: 'reset_daily_usage',
        service_data: { entry_id: 'fixture-replaced-entry' },
      }]);
      assert.ok(await reading.isDisabled());
      await usagePage.evaluate(() => window.bayitTest.finishUsageReset());
      await usageButton(usePanel, '00:00').waitFor();
      assert.equal(await usageButton(usePanel, '00:00').getAttribute('aria-keyshortcuts'), null);
      for (const flags of ['&usage-view-only', '&fake-usage-provider']) {
        const viewOnly = await openUsage(flags);
        assert.equal(await usageButton(viewOnly, '10:00').getAttribute('aria-keyshortcuts'), null);
      }
      const differentReading = await openUsage('&different-usage-source');
      assert.equal(await usageButton(differentReading, '30:00').getAttribute('aria-keyshortcuts'), null);
      await usageButton(differentReading, '30:00').tap();
      await differentReading.waitFor();
      assert.deepEqual(await usagePage.evaluate(() => window.bayitTest.moreInfoCalls), ['sensor.demo_read_only_usage']);
      assert.equal(await usagePage.evaluate(() => window.bayitTest.calls.length), 0);
      await usagePage.close();
      console.log(engine + ': native timer usage details, confirmed and stale reset, and alternate usage scope');

      const heaterPage = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await heaterPage.goto(base + '?heater-level&locale=' + (rightToLeft ? 'he' : 'en'));
      await heaterPage.locator('.quick-button[data-entity="fan.demo_step_heater"]').click();
      const heaterPanel = heaterPage.getByRole('dialog', { name: 'Fixture step heater', exact: true });
      const level = step => heaterPanel.getByRole('button', {
        name: (rightToLeft ? 'עוצמת חימום ' : 'Heating level ') + step, exact: true,
      });
      await level(3).waitFor();
      await assertDeviceHeading(heaterPanel, 'Fixture step heater');
      assert.equal(await level(3).getAttribute('aria-pressed'), 'true');
      await level(8).click();
      assert.equal(await level(8).getAttribute('data-changing'), '');
      assert.equal(await level(8).isDisabled(), true);
      await heaterPage.evaluate(() => window.bayitTest.finishLevel());
      await heaterPage.waitForFunction(() => !document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('.heat-level-choice[data-action="set_heating_level"]')?.disabled);
      assert.equal(await level(8).getAttribute('aria-pressed'), 'true');
      await heaterPage.evaluate(() => window.bayitTest.setHeaterPower('on'));
      await level(2).click();
      await heaterPage.evaluate(() => window.bayitTest.finishLevel());
      assert.deepEqual(await heaterPage.evaluate(() => window.bayitTest.calls), [8, 2].map(target_step => ({
        type: 'call_service', domain: 'script', service: 'demo_select_heat_step', service_data: { target_step },
      })));
      await heaterPage.evaluate(() => window.bayitTest.repointTimer());
      await heaterPage.waitForFunction(() => document.querySelector('bayit-dashboard').shadowRoot
        .querySelector('.heat-level-choice[data-action="set_heating_level"]')?.disabled);
      await heaterPage.close();

      const nextPage = await browser.newPage({ viewport: { width: 320, height: 812 }, hasTouch: true, reducedMotion: 'reduce' });
      await nextPage.goto(base + '?heater-level&preselect&compact-heater-steps&locale=' + (rightToLeft ? 'he' : 'en'));
      await nextPage.locator('.quick-button[data-entity="fan.demo_step_heater"]').tap();
      const nextPanel = nextPage.getByRole('dialog', { name: 'Fixture step heater', exact: true });
      const nextStep = step => nextPanel.getByRole('button', {
        name: (rightToLeft ? 'עוצמה להפעלה הבאה ' : 'Level for next start ') + step, exact: true,
      });
      await nextStep(5).waitFor();
      assert.equal(await nextStep(5).getAttribute('aria-pressed'), 'true');
      const heaterOff = nextPanel.locator('button[data-action="turn_off"]');
      const timerRange = nextPanel.locator('.device-timer[data-compact] .timer-range');
      assert.equal(await heaterOff.count(), 0);
      assert.equal(await timerRange.evaluate(range => getComputedStyle(range).appearance), 'none');
      assert.equal(await timerRange.evaluate(range => {
        const properties = getComputedStyle(range);
        return properties.getPropertyValue('--timer-thumb').trim() === properties.getPropertyValue('--warm').trim();
      }), true);
      await timerRange.press('ArrowLeft');
      assert.equal(await timerRange.inputValue(), '45');
      assert.equal(await nextPage.evaluate(() => window.bayitTest.calls.length), 0);
      for (const width of [320, 391, 280]) {
        await nextPage.setViewportSize({ width, height: 812 });
        const layout = await nextPanel.locator('.heat-level-options').evaluate(row => {
          const buttons = [...row.querySelectorAll('.heat-level-choice')];
          const selected = buttons.find(button => button.getAttribute('aria-pressed') === 'true');
          return {
            targets: buttons.map(button => {
              const { x, y, width, height } = button.getBoundingClientRect();
              return { value: button.textContent, x, y, width, height };
            }),
            active: selected?.textContent,
            selectedBackground: getComputedStyle(selected).backgroundColor,
            idleBackground: getComputedStyle(buttons[0]).backgroundColor,
            fits: row.scrollWidth <= row.clientWidth + 1,
          };
        });
        assert.deepEqual(layout.targets.map(target => target.value), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
        assert.equal(layout.active, '5');
        assert.notEqual(layout.selectedBackground, layout.idleBackground);
        assert.equal(layout.fits, true);
        assert.ok(layout.targets.every(target => target.width >= 43.9 && target.height >= 43.9));
        const rows = new Map();
        for (const target of layout.targets) {
          const y = Math.round(target.y);
          const row = rows.get(y) ?? [];
          row.push(target);
          rows.set(y, row);
        }
        if (width === 391) assert.deepEqual([...rows.values()].map(row => row.length), [5, 4]);
        assert.ok(rows.size > 1);
        for (const row of rows.values()) assert.ok(row.every((target, index) => index === 0 || target.x > row[index - 1].x));
      }
      await nextPage.setViewportSize({ width: 320, height: 812 });
      await nextStep(7).tap();
      assert.equal(await nextStep(7).getAttribute('data-changing'), '');
      assert.deepEqual(await nextPage.evaluate(() => window.bayitTest.heatingState()), ['off', 'off', 'idle']);
      assert.deepEqual(await nextPage.evaluate(() => window.bayitTest.calls), [{
        type: 'call_service', domain: 'input_number', service: 'set_value',
        target: { entity_id: 'input_number.demo_next_step' }, service_data: { value: 7 },
      }]);
      await nextPage.evaluate(() => window.bayitTest.finishPreselect());
      await nextPanel.locator('[data-role="modal-notice"]').filter({
        hasText: rightToLeft ? 'העוצמה להפעלה הבאה נשמרה' : 'Next-start level saved',
      }).waitFor();
      assert.equal(await nextStep(7).getAttribute('aria-pressed'), 'true');
      await nextPage.evaluate(() => window.bayitTest.setHeaterPower('on'));
      await heaterOff.waitFor();
      const runningStep = nextPanel.getByRole('button', {
        name: (rightToLeft ? 'עוצמת חימום ' : 'Heating level ') + '3', exact: true,
      });
      await runningStep.waitFor();
      assert.equal(await runningStep.getAttribute('aria-pressed'), 'true');
      assert.equal(await nextStep(7).count(), 0);
      await nextPage.evaluate(() => window.bayitTest.setHeaterPower('off'));
      await heaterOff.waitFor({ state: 'detached' });
      await nextPanel.locator('.timer-preset[data-action="start_timed"]').last().tap();
      await nextPanel.locator('.timer-command[data-action="stop_timed"]').waitFor();
      assert.deepEqual(await nextPage.evaluate(() => window.bayitTest.calls[1]), {
        type: 'call_service', domain: 'simple_timer', service: 'start_timer',
        service_data: { entity_id: 'sensor.demo_step_runtime', duration: 60, unit: 'min', reverse_mode: false },
      });
      assert.equal(await heaterOff.count(), 0);
      await nextPage.evaluate(() => {
        window.bayitTest.setFixtureAttributes('sensor.demo_step_runtime', { timer_state:'idle', device_active:false });
        window.bayitTest.repointTimer();
      });
      await nextStep(7).waitFor();
      assert.equal(await nextStep(7).isDisabled(), true);
      assert.equal(await nextPage.evaluate(() => window.bayitTest.calls.length), 2);
      await nextPage.close();
      console.log(engine + ' 320: helper-only heater preselect, observed save and independent running controls');

      const presencePage = await browser.newPage({ viewport:{ width:390,height:844 }, hasTouch:true, reducedMotion:'reduce' });
      presencePage.setDefaultTimeout(8000);
      const presenceUrl = base + '?toolbar-panels&presence-icons';
      const presenceButton = presencePage.locator('button[data-role=presence]');
      const presenceBadge = presenceButton.locator('.badge');
      const presenceState = (entity, state) => presencePage.evaluate(([id, value]) => window.bayitTest.setRoomState(id, value), [entity, state]);
      const expectPresenceIcon = icon => presenceButton.locator('ha-icon[icon="' + icon + '"]').waitFor();
      await presencePage.goto(presenceUrl);
      await expectPresenceIcon('mdi:home-off-outline');
      await presenceBadge.waitFor({state:'hidden'});
      await presenceState('person.demo_friend', 'home');
      await expectPresenceIcon('mdi:account');
      assert.equal(await presenceBadge.innerText(), '1');
      assert.equal(await presenceButton.getAttribute('aria-description'), 'People at home · 1');
      await presenceState('device_tracker.demo_phone', 'home');
      await expectPresenceIcon('mdi:account-group');
      assert.equal(await presenceBadge.innerText(), '2');
      await presenceState('person.demo_guest', 'home');
      await presenceBadge.filter({hasText:/^3$/}).waitFor();
      await expectPresenceIcon('mdi:account-group');
      await presenceButton.tap();
      await presencePage.getByRole('dialog', {name:'People at home',exact:true}).locator('h2 ha-icon[icon="mdi:account-group"]').waitFor();
      await presencePage.keyboard.press('Escape');
      await presenceState('person.demo_friend', 'unavailable');
      await presenceState('person.demo_guest', 'not_home');
      await presenceState('device_tracker.demo_phone', 'not_home');
      await expectPresenceIcon('mdi:home-off-outline');
      await presenceBadge.waitFor({state:'hidden'});
      assert.equal(await presencePage.evaluate(() => window.bayitTest.calls.length), 0);

      await presencePage.goto(presenceUrl + '&presence-custom');
      await expectPresenceIcon('mdi:account-heart-outline');
      await presenceState('person.demo_guest', 'home');
      await presenceBadge.filter({hasText:/^1$/}).waitFor();
      await expectPresenceIcon('mdi:account-heart-outline');
      await presencePage.goto(presenceUrl + '&presence-custom&presence-opt-in');
      await expectPresenceIcon('mdi:home-off-outline');
      await presencePage.goto(presenceUrl + '&presence-fixed');
      await expectPresenceIcon('mdi:account-group-outline');

      await presencePage.goto(presenceUrl + '&presence-custom&editor');
      await presencePage.getByText('Toolbar and extra screens', {exact:true}).tap();
      const presenceEditor = presencePage.locator('bayit-9-strategy-editor');
      await presenceEditor.getByRole('button', {name:'Presence',exact:true}).tap();
      const presenceToggle = presenceEditor.getByRole('checkbox', {name:'Change icon with the number of people at home',exact:true});
      assert.equal(await presenceToggle.isChecked(), false);
      await presenceToggle.check();
      const editedPresence = () => presencePage.evaluate(() => window.latest.toolbar.find(item => item.kind === 'presence'));
      assert.equal((await editedPresence()).presence_dynamic_icon, true);
      await presenceToggle.uncheck();
      assert.equal((await editedPresence()).presence_dynamic_icon, false);
      assert.equal((await editedPresence()).icon, 'mdi:account-heart-outline');
      await presencePage.close();
      console.log(engine + ': native presence scope, 0/1/2+ icons, authored icon and toolbar editor');

      const panelsPage = await browser.newPage({ viewport: { width:390,height:844 } });
      panelsPage.setDefaultTimeout(8000);
      const glassSession = engine === 'Chromium' ? await panelsPage.context().newCDPSession(panelsPage) : null;
      const setGlassMedia = (transparency = 'no-preference', contrast = 'no-preference') => glassSession
        ? glassSession.send('Emulation.setEmulatedMedia', { features: [
          { name: 'prefers-reduced-transparency', value: transparency }, { name: 'prefers-contrast', value: contrast },
        ] })
        : panelsPage.emulateMedia({ contrast });
      await setGlassMedia();
      await panelsPage.goto(base + '?toolbar-panels');
      const roomGraph = panelsPage.locator('[data-native-type=sensor][data-graph-hours="24"]');
      assert.equal(await roomGraph.count(), 0);
      await panelsPage.getByRole('button', {name:'Studio',exact:true}).click();
      const graphRoom = panelsPage.getByRole('dialog',{name:'Studio',exact:true});
      await graphRoom.getByText('Studio temperature',{exact:true}).waitFor();
      await roomGraph.waitFor();
      assert.equal(await roomGraph.getAttribute('data-during-opening'), 'false', 'The optional graph cannot preempt opening motion');
      const readPopupMaterial = panel => panel.evaluate(dialog => {
        const reduced = matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)').matches;
        const surface = getComputedStyle(dialog);
        return { reduced, radius: surface.borderRadius, fill: surface.backgroundColor, blur: surface.backdropFilter,
          backdrop: getComputedStyle(dialog, '::backdrop').backgroundColor };
      });
      const assertClearPopup = async panel => {
        assert.deepEqual(await readPopupMaterial(panel), {
          reduced: false, radius: '25px', fill: 'rgba(0, 0, 0, 0)', blur: 'blur(18px)', backdrop: 'rgba(0, 0, 0, 0)',
        });
      };
      const assertOpaquePopup = async panel => {
        const material = await readPopupMaterial(panel);
        assert.equal(material.reduced, true);
        assert.equal(material.radius, '25px');
        assert.equal(material.blur, 'none');
        assert.equal(material.fill, 'rgb(40, 40, 40)');
      };
      await assertClearPopup(graphRoom);
      if (glassSession) {
        await setGlassMedia('reduce');
        await assertOpaquePopup(graphRoom);
      }
      await setGlassMedia('no-preference', 'more');
      await assertOpaquePopup(graphRoom);
      await setGlassMedia();
      await assertClearPopup(graphRoom);
      await panelsPage.keyboard.press('Escape');
      await roomGraph.waitFor({state:'detached'});
      await panelsPage.getByRole('button',{name:'Weather',exact:true}).click();
      let panels = panelsPage.getByRole('dialog',{name:'Weather',exact:true});
      await panels.locator('[data-native-type=weather-forecast]').waitFor();
      await assertClearPopup(panels);
      await panels.getByRole('button',{name:'Sun',exact:true}).click();
      await panels.getByText('Sunrise',{exact:true}).waitFor();
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Automations',exact:true}).click();
      panels = panelsPage.getByRole('dialog',{name:'Automations',exact:true});
      await panels.getByRole('button',{name:'Evening scene',exact:true}).click();
      let confirm = panelsPage.getByRole('dialog',{name:'Confirm action',exact:true});
      await confirm.getByText('Run the evening scene?',{exact:true}).waitFor();
      await assertClearPopup(confirm);
      await confirm.getByRole('button',{name:'Cancel'}).click();
      assert.equal(await panelsPage.evaluate(() => window.bayitTest.calls.length),0);
      await panels.getByRole('button',{name:/Front door/}).click();
      await confirm.getByText('Open the front door?',{exact:true}).waitFor();
      await confirm.getByRole('button',{name:'Cancel'}).click();
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Appearance',exact:true}).click();
      const wallpaper = panelsPage.getByRole('dialog').locator('.wallpaper-gallery');
      assert.equal(await wallpaper.locator('[data-wallpaper-choice]').count(), 0);
      await wallpaper.locator('summary').click();
      await wallpaper.getByRole('button', { name:'Materials', exact:true }).click();
      await wallpaper.getByRole('button', { name:'Brushed bronze', exact:true }).click();
      await wallpaper.locator('.wallpaper-current').getByText('Brushed bronze', { exact:true }).waitFor();
      assert.equal(await panelsPage.locator('.shell').getAttribute('data-background'), 'bronze');
      await wallpaper.locator('summary').click();
      await wallpaper.getByRole('button', { name:'Materials', exact:true }).waitFor({ state:'hidden' });
      await panelsPage.getByRole('dialog').getByRole('button',{name:'Media',exact:true}).click();
      panels = panelsPage.getByRole('dialog',{name:'Media',exact:true});
      await panels.getByRole('button',{name:'Pause playback',exact:true}).waitFor();
      assert.equal(await panels.getByRole('slider',{name:'Volume',exact:true}).inputValue(),'24');
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Appearance',exact:true}).click();
      await panelsPage.getByRole('dialog').getByRole('button',{name:'Robot vacuum',exact:true}).click();
      panels = panelsPage.getByRole('dialog',{name:'Robot vacuum',exact:true});
      await panels.getByRole('button',{name:'Start cleaning',exact:true}).waitFor();
      await panels.getByRole('button',{name:'Reset filter',exact:true}).click();
      await confirm.getByText('Reset the filter?',{exact:true}).waitFor();
      await confirm.getByRole('button',{name:'Cancel'}).click();
      assert.equal(await panelsPage.evaluate(() => window.bayitTest.calls.length),0);
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Appearance',exact:true}).click();
      await panelsPage.getByRole('dialog').getByRole('button',{name:'Sensors',exact:true}).click();
      const sensors = panelsPage.getByRole('dialog',{name:'Sensors',exact:true});
      const progressGraph = sensors.locator('[data-native-type="sensor"][data-graph-hours="168"]');
      const temperatureGraph = sensors.getByRole('button', { name: /^Studio temperature/ });
      const staleGraph = sensors.locator('[data-native-type="sensor"]').filter({ hasText: 'Energy meter' });
      await temperatureGraph.waitFor();
      await staleGraph.waitFor();
      assert.equal(await staleGraph.getAttribute('data-tap-action'), 'none');
      await staleGraph.click();
      assert.equal(await sensors.isVisible(), true);
      await temperatureGraph.getByText('Plot', { exact: true }).click();
      assert.equal(await sensors.isVisible(), true);
      await temperatureGraph.press('Enter');
      await graphRoom.waitFor();
      await panelsPage.waitForURL(url => url.hash === '#room-studio');
      await panelsPage.evaluate(() => history.back());
      await sensors.waitFor();
      await panelsPage.waitForURL(url => url.hash === '#panel/sensors-panel');
      await panelsPage.evaluate(() => history.forward());
      await graphRoom.waitFor();
      await panelsPage.evaluate(() => history.back());
      await sensors.waitFor();
      await progressGraph.waitFor();
      assert.equal(await progressGraph.getAttribute('data-hold-action'), 'none');
      assert.equal(await progressGraph.getAttribute('data-double-tap-action'), 'none');
      await progressGraph.getByText('Plot',{exact:true}).click();
      await progressGraph.dispatchEvent('ll-custom',{bubbles:true,composed:true,detail:{action:'fire-dom-event'}});
      assert.equal(await sensors.isVisible(), true);
      await progressGraph.press('Enter');
      panels = panelsPage.getByRole('dialog',{name:'Robot vacuum',exact:true});
      await panels.getByRole('button',{name:'Start cleaning',exact:true}).waitFor();
      assert.equal(await panelsPage.evaluate(() => window.bayitTest.calls.length),0);
      assert.equal(await panels.getByRole('button',{name:'Back to room',exact:true}).count(),0);
      await panelsPage.keyboard.press('Escape');
      await panels.waitFor({state:'hidden'});
      await panelsPage.getByRole('button',{name:'Appearance',exact:true}).click();
      await panelsPage.getByRole('dialog').getByRole('button',{name:'Calendar',exact:true}).click();
      await panelsPage.getByRole('dialog',{name:'Calendar',exact:true}).getByText('2 calendars',{exact:true}).waitFor();
      await panelsPage.close();

      const utilityPage = await browser.newPage({ viewport: { width: 391, height: 845 }, hasTouch: true, reducedMotion: 'reduce' });
      utilityPage.setDefaultTimeout(8000);
      await utilityPage.goto(base + '/fixture-home/home?toolbar-panels&utility-graph-details&native-more-info=modern');
      const utilityDetails = utilityPage.getByRole('dialog', { name:'Native entity details', exact:true });
      for (const [panelName, route, sensors] of [
        ['Energy', '#panel/', [['Energy meter','sensor.demo_meter','168'],['Water meter','sensor.demo_water_meter','168']]],
        ['Weather', '#panel/', [['Studio temperature','sensor.demo_studio_temperature','24']]],
        ['Studio', '#room-studio', [['Studio temperature','sensor.demo_studio_temperature','24']]],
      ]) {
        await utilityPage.getByRole('button', { name:panelName, exact:true }).tap();
        const panel = utilityPage.getByRole('dialog', { name:panelName, exact:true });
        const panelHash = new URL(utilityPage.url()).hash;
        assert.ok(panelHash.startsWith(route));
        for (const [caption, entity, hours] of sensors) {
          const graph = panel.getByRole('button', { name:caption, exact:true });
          await graph.waitFor();
          assert.equal(await graph.getAttribute('data-native-type'), 'sensor');
          assert.equal(await graph.getAttribute('data-graph-hours'), hours);
          await graph.tap();
          await utilityDetails.waitFor();
          assert.equal(new URL(utilityPage.url()).searchParams.get('more-info-entity-id'), entity);
          assert.equal(new URL(utilityPage.url()).hash, panelHash);
          assert.equal(await utilityPage.locator('bayit-dashboard dialog.modal[open]').getAttribute('aria-label'), panelName);
          await utilityDetails.getByRole('button', { name:'Close native details', exact:true }).tap();
          await utilityPage.waitForFunction(() => !new URL(location.href).searchParams.has('more-info-entity-id'));
          await panel.waitFor();
        }
        await panel.locator('button[data-role=close]').tap();
        await panel.waitFor({ state:'hidden' });
      }
      assert.deepEqual(await utilityPage.evaluate(() => window.bayitTest.moreInfoCalls),
        ['sensor.demo_meter','sensor.demo_water_meter','sensor.demo_studio_temperature','sensor.demo_studio_temperature']);
      assert.deepEqual(await utilityPage.evaluate(() => window.bayitTest.calls),[]);
      await utilityPage.close();
      console.log(engine + ': Energy, Weather and room graph details leave the Bayit popup open underneath');
      await assertSelectedRoomTemperature(browser);
      await assertRoomTemperatureCharts(browser);
      console.log(engine + ': room temperature source, fallback, units and editor');
      await assertEnergyReadingCards(browser);
      await assertEnergyPopupPlacement(browser);
      console.log(engine + ': optional Energy headline readings, native details, fallback and editor');
      await assertCompactWeatherReadings(browser);
      console.log(engine + ': optional passive Weather readings, RTL, updates, existing charts and editor');

      const sunPage = await browser.newPage({ viewport: { width: 320, height:844 }, hasTouch:true });
      sunPage.setDefaultTimeout(8000);
      const rtlSun = engine === 'WebKit';
      await sunPage.goto(base + '?toolbar-panels&sun-horizon&locale=' + (rtlSun ? 'he' : 'en'));
      const weatherName = rtlSun ? 'מזג אוויר' : 'Weather';
      await sunPage.getByRole('button', { name: weatherName, exact: true }).tap();
      const sunDialog = sunPage.getByRole('dialog', { name: weatherName, exact: true });
      const sunTab = sunDialog.getByRole('button', { name: rtlSun ? 'שמש' : 'Sun', exact: true });
      const forecastTab = sunDialog.getByRole('button', { name: rtlSun ? 'תחזית' : 'Forecast', exact: true });
      const swipeWeather = (kind, dx, dy, pointerType = 'touch') => sunDialog.locator('[data-section='+kind+']').evaluate(
        (panel, gesture) => {
          const send = (name, x, y) => panel.dispatchEvent(new PointerEvent(name, {
            bubbles: true, pointerId: 1, pointerType: gesture.pointerType, isPrimary: true, clientX: x, clientY: y,
          }));
          send('pointerdown', 160, 260);
          send('pointerup', 160 + gesture.dx, 260 + gesture.dy);
        }, { dx, dy, pointerType });
      const weatherSwipeStep = rtlSun ? 86 : -86;
      await sunDialog.locator('[data-section=forecast]').waitFor();
      await swipeWeather('forecast', weatherSwipeStep, 105);
      await swipeWeather('forecast', weatherSwipeStep, 0, 'mouse');
      await swipeWeather('forecast', -weatherSwipeStep, 0);
      assert.equal(await forecastTab.getAttribute('aria-pressed'), 'true');
      await swipeWeather('forecast', weatherSwipeStep, 14);
      assert.equal(await sunTab.getAttribute('aria-pressed'), 'true');
      await swipeWeather('sun', weatherSwipeStep, 0);
      assert.equal(await sunTab.getAttribute('aria-pressed'), 'true');
      await swipeWeather('sun', -weatherSwipeStep, 0);
      assert.equal(await forecastTab.getAttribute('aria-pressed'), 'true');
      await sunTab.press('Enter');
      const sunPanel = sunDialog.locator('.sun-panel');
      const sunPlot = sunPanel.locator('.sun-plot');
      const sunMarker = sunPlot.locator('ha-icon');
      const sunValue = label => sunPanel.getByText(label, { exact: true }).locator('xpath=following-sibling::dd[1]');
      const noon = sunValue(rtlSun ? 'חצות השמש הקרוב' : 'Next solar noon');
      const altitude = sunValue(rtlSun ? 'גובה השמש' : 'Elevation');
      const azimuth = sunValue(rtlSun ? 'אזימוט' : 'Azimuth');
      await sunMarker.waitFor();
      assert.equal(await noon.innerText(), '13:25');
      assert.equal(await sunPlot.getAttribute('dir'), 'ltr');
      assert.equal(await sunPanel.locator('.sun-legend').innerText(), rtlSun ? 'אופק' : 'Horizon');
      const position = () => sunPlot.evaluate(plot => {
        const marker = plot.querySelector('ha-icon').getBoundingClientRect();
        const horizon = plot.querySelector('.sun-horizon').getBoundingClientRect();
        const bounds = plot.getBoundingClientRect();
        const x = (marker.left + marker.width / 2 - bounds.left) / bounds.width;
        return { x, y:marker.top + marker.height / 2, baseline:horizon.top };
      });
      const above = await position();
      assert.ok(above.y < above.baseline);
      const observeSun = (state, attributes) => sunPage.evaluate(([value, next]) => window.bayitTest.setSunState(value, next),
        [state, attributes]);
      await observeSun('below_horizon', { azimuth:270, elevation:-15, next_noon:'2026-11-25T04:25:00Z' });
      await sunPlot.locator('ha-icon[data-below-horizon]').waitFor();
      const below = await position();
      assert.ok(below.y > below.baseline);
      assert.ok(Math.abs(above.x - below.x) < 0.002);
      assert.equal(await altitude.innerText(), '-15°');
      await observeSun('above_horizon', { azimuth:270, elevation:0, next_noon:'2026-11-25T04:25:00Z' });
      await altitude.filter({ hasText:/^0°$/ }).waitFor();
      const horizonPosition = await position();
      assert.ok(Math.abs(horizonPosition.y - horizonPosition.baseline) < 0.5);

      await observeSun('above_horizon', { elevation:15, next_noon:'not-a-timestamp' });
      await sunMarker.waitFor({ state:'hidden' });
      assert.equal(await azimuth.innerText(), '—');
      assert.equal(await noon.innerText(), '—');
      assert.equal(await altitude.innerText(), '15°');
      await observeSun('above_horizon', { azimuth:0, elevation:90, next_noon:'2026-11-25T04:25:00Z' });
      await sunMarker.waitFor();
      const contained = await sunPlot.evaluate(plot => {
        const bounds = plot.getBoundingClientRect();
        const marker = plot.querySelector('ha-icon').getBoundingClientRect();
        return marker.left >= bounds.left && marker.top >= bounds.top && marker.right <= bounds.right;
      });
      assert.equal(contained, true);
      await observeSun('unavailable', { azimuth:270, elevation:15, next_noon:'2026-11-25T04:25:00Z' });
      await sunMarker.waitFor({ state:'hidden' });
      assert.equal(await noon.innerText(), '—');
      assert.equal(await altitude.innerText(), '—');
      assert.equal(await sunPage.evaluate(() => window.bayitTest.calls.length), 0);
      await sunPage.close();
      console.log(engine + ' 320: measured Sun positions, 24-hour time zone and unavailable readings');

      const chartFallback = await browser.newPage({ viewport: { width:320, height:844 }, hasTouch:true });
      chartFallback.setDefaultTimeout(8000);
      await chartFallback.goto(base + '?toolbar-panels&no-native-charts#panel/sensors-panel');
      const fallbackReadings = chartFallback.getByRole('dialog', { name: 'Sensors', exact: true });
      await fallbackReadings.getByText('Studio temperature', { exact: true }).tap();
      await chartFallback.getByRole('dialog', { name: 'Studio', exact: true }).waitFor();
      assert.equal(await chartFallback.evaluate(() => window.bayitTest.calls.length), 0);
      await chartFallback.close();

      const chartEditor = await browser.newPage({ viewport: { width:320, height:844 }, hasTouch:true });
      chartEditor.setDefaultTimeout(8000);
      await chartEditor.goto(base + '?toolbar-panels&editor');
      await chartEditor.getByText('Toolbar and extra screens', { exact: true }).tap();
      await chartEditor.getByRole('button', { name: 'Sensors', exact: true }).tap();
      await chartEditor.getByRole('button', { name: 'Readings', exact: true }).tap();
      await chartEditor.getByRole('button', { name: 'Energy meter', exact: true }).tap();
      const destination = chartEditor.getByLabel('Open on graph tap', { exact: true });
      assert.equal(await destination.locator('option:checked').textContent(), 'Destination unavailable');
      await destination.selectOption('room:studio');
      const editedGraph = () => chartEditor.evaluate(() =>
        window.latest.toolbar.find(panel => panel.kind === 'sensors').sections[0].entities[2]);
      assert.equal((await editedGraph()).graph_room_id, 'studio');
      await destination.selectOption('vacuum:vacuum-panel');
      assert.equal((await editedGraph()).vacuum_panel_id, 'vacuum-panel');
      assert.equal((await editedGraph()).graph_room_id, undefined);
      await destination.selectOption('');
      assert.equal((await editedGraph()).vacuum_panel_id, undefined);
      await chartEditor.close();
      console.log(engine + ': Sensors graph room and Vacuum navigation, stale targets, native fallback and editor');

      const scriptPage = await browser.newPage({ viewport: { width: 320, height:844 }, hasTouch:true });
      scriptPage.setDefaultTimeout(8000);
      await scriptPage.goto(base + '?toolbar-panels&automation-toggle');
      await scriptPage.getByRole('button', { name: 'Automations', exact: true }).tap();
      const scriptPanel = scriptPage.getByRole('dialog', { name: 'Automations', exact: true });
      const startScript = scriptPanel.getByRole('button', { name: 'Arrival scene · Start script', exact: true });
      const stopScript = scriptPanel.getByRole('button', { name: 'Arrival scene · Stop script', exact: true });
      const scriptPrompt = scriptPage.getByRole('dialog', { name: 'Confirm action', exact: true });
      const acceptScript = scriptPrompt.getByRole('button', { name: 'Confirm', exact: true });
      const staleScript = scriptPanel.getByText('The script state changed. Review it and try again.', { exact: true });
      const scriptCalls = () => scriptPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain === 'script'));

      await startScript.tap();
      await scriptPrompt.getByText('Run the arrival scene?', { exact: true }).waitFor();
      await scriptPage.evaluate(() => window.bayitTest.observeScript('on'));
      await acceptScript.tap();
      await stopScript.waitFor();
      await staleScript.waitFor();
      assert.deepEqual(await scriptCalls(), []);

      await stopScript.tap();
      await scriptPrompt.getByText('Continue with Stop script on Arrival scene?', { exact: true }).waitFor();
      await scriptPage.evaluate(() => window.bayitTest.observeScript('off'));
      await acceptScript.tap();
      await startScript.waitFor();
      assert.deepEqual(await scriptCalls(), []);

      await scriptPage.evaluate(() => window.bayitTest.observeScript('on'));
      await stopScript.tap();
      await scriptPage.evaluate(() => window.bayitTest.observeScript('on'));
      await acceptScript.tap();
      await stopScript.waitFor();
      assert.deepEqual(await scriptCalls(), []);

      await stopScript.dispatchEvent('pointerdown', { pointerType:'touch', isPrimary:true });
      await scriptPage.evaluate(() => window.bayitTest.observeScript('on'));
      await scriptPage.evaluate(() => new Promise(requestAnimationFrame));
      await stopScript.dispatchEvent('click');
      await staleScript.waitFor();
      assert.equal(await scriptPrompt.count(), 0);
      assert.deepEqual(await scriptCalls(), []);

      await stopScript.tap();
      await acceptScript.tap();
      await startScript.waitFor();
      await startScript.tap();
      await acceptScript.tap();
      await stopScript.waitFor();
      assert.deepEqual(await scriptCalls(), ['turn_off', 'turn_on'].map(service => ({
        type:'call_service', domain:'script', service, service_data:{}, target:{entity_id:'script.demo_toggle'},
      })));
      await scriptPage.close();

      const scriptEditor = await browser.newPage({ viewport: { width:320, height:844 }, hasTouch:true });
      scriptEditor.setDefaultTimeout(8000);
      await scriptEditor.goto(base + '?toolbar-panels&automation-toggle&editor');
      await scriptEditor.getByText('Toolbar and extra screens', { exact: true }).tap();
      await scriptEditor.getByRole('button', { name: 'Automations', exact: true }).tap();
      await scriptEditor.getByRole('button', { name: 'Actions', exact: true }).tap();
      await scriptEditor.getByRole('button', { name: 'Arrival scene', exact: true }).tap();
      const behavior = scriptEditor.getByLabel('Script button behavior', { exact: true });
      assert.equal(await behavior.inputValue(), 'toggle_script');
      await behavior.selectOption('run_script');
      const edited = () => scriptEditor.evaluate(() => window.latest.toolbar[0].sections[0].entities[2]);
      assert.equal((await edited()).command, 'run_script');
      await behavior.selectOption('toggle_script');
      assert.equal((await edited()).command, 'toggle_script');
      assert.equal((await edited()).confirmation, 'Run the arrival scene?');
      await scriptEditor.close();
      console.log(engine + ' 320: script Start/Stop, changed-state and replacement-run guards, and editor');

      for (const [width, isOverview] of [[320,false],[391,false],[320,true],[391,true]]) {
        const entryStatusPage = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
        entryStatusPage.setDefaultTimeout(8000);
        const fixtureId = isOverview ? 'compact-overview' : 'compact-entrance';
        const panelName = isOverview ? 'Fixture Overview' : 'Front entrance';
        const sectionName = isOverview ? 'Home status' : 'Entry status';
        const entryStatusUrl = base + '/fixture-home/home?toolbar-panels&compact-entrance-status' +
          (isOverview ? '&compact-overview-status' : '');
        await entryStatusPage.goto(entryStatusUrl);
        const entryStatus = entryStatusPage.getByRole('dialog', { name:panelName, exact:true });
        const openStatusEntry = async () => {
          await entryStatusPage.getByRole('button', { name:'Appearance', exact:true }).tap();
          await entryStatusPage.getByRole('button', { name:panelName, exact:true }).tap();
          await entryStatus.waitFor();
        };
        const entryLockServiceCalls = () => entryStatusPage.evaluate(() => window.bayitTest.calls.filter(call => call.type === 'call_service'));
        await openStatusEntry();
        const entryStatusLock = entryStatus.locator('.compact-status-lock');
        const entryStatusGraph = entryStatus.locator('[data-native-type="sensor"][data-graph-hours="24"]');
        await entryStatusGraph.waitFor();
        assert.equal(await entryStatusGraph.getAttribute('data-tap-action'), 'more-info');
        assert.ok(await entryStatusLock.evaluate(node => {
          const graph = node.nextElementSibling;
          const items = node.parentElement;
          return Math.abs(node.getBoundingClientRect().top - graph.getBoundingClientRect().top) < 1 &&
            items.scrollWidth <= items.clientWidth &&
            [...node.querySelectorAll('button')].every(button => button.offsetWidth >= 44 && button.offsetHeight >= 44);
        }));
        assert.equal(await entryStatus.locator('.compact-lock-action').count(), 1);
        await entryStatusLock.getByRole('button', { name:'Front lock · Locked', exact:true }).press('Shift+Enter');
        await entryStatus.waitFor();
        assert.deepEqual(await entryStatusPage.evaluate(() => window.bayitTest.moreInfoCalls), ['lock.demo_compact_entry']);
        await entryStatusGraph.tap();
        await entryStatus.waitFor();
        assert.deepEqual(await entryStatusPage.evaluate(() => window.bayitTest.moreInfoCalls),
          ['lock.demo_compact_entry','sensor.demo_studio_temperature']);
        assert.deepEqual(await entryLockServiceCalls(), []);
        const unlockEntry = entryStatusLock.getByRole('button', { name:'Unlock · Front lock', exact:true });
        const entryConfirmation = entryStatusPage.locator('dialog.confirm[open]');
        await unlockEntry.tap();
        await entryConfirmation.getByRole('button', { name:'Cancel', exact:true }).tap();
        assert.deepEqual(await entryLockServiceCalls(), []);
        await unlockEntry.tap();
        await entryConfirmation.getByRole('button', { name:'Confirm', exact:true }).tap();
        await entryStatusLock.getByRole('button', { name:'Lock · Front lock', exact:true }).tap();
        await unlockEntry.waitFor();
        assert.deepEqual(await entryLockServiceCalls(), ['unlock','lock'].map(service => ({
          type:'call_service', domain:'lock', service, service_data:{}, target:{entity_id:'lock.demo_compact_entry'},
        })));
        await entryStatusPage.evaluate(() => window.bayitTest.setRoomState('lock.demo_compact_entry', 'jammed'));
        await entryStatusLock.locator('.compact-lock-action:disabled').waitFor();
        assert.equal(new URL(entryStatusPage.url()).hash, '#panel/' + fixtureId);
        if (width === 320) {
          await entryStatusPage.goto(entryStatusUrl + '&protected-entry-lock&no-native-charts');
          await openStatusEntry();
          await entryStatusLock.getByRole('button', { name:'Unlock · Front lock', exact:true }).tap();
          await entryConfirmation.getByRole('button', { name:'Confirm', exact:true }).tap();
          await entryStatus.waitFor();
          assert.deepEqual(await entryStatusPage.evaluate(() => window.bayitTest.moreInfoCalls), ['lock.demo_compact_entry']);
          assert.deepEqual(await entryLockServiceCalls(), []);
          await entryStatus.getByRole('button', { name:/^Studio temperature/ }).tap();
          await entryStatus.waitFor();
          assert.deepEqual(await entryStatusPage.evaluate(() => window.bayitTest.moreInfoCalls),
            ['lock.demo_compact_entry','sensor.demo_studio_temperature']);
          assert.deepEqual(await entryLockServiceCalls(), []);
          await entryStatusPage.goto(entryStatusUrl + '&editor');
          await entryStatusPage.getByText('Toolbar and extra screens', { exact:true }).tap();
          await entryStatusPage.getByRole('button', { name:panelName, exact:true }).tap();
          await entryStatusPage.getByRole('button', { name:sectionName, exact:true }).tap();
          const sideBySide = entryStatusPage.getByRole('checkbox', { name:'Show status items side by side', exact:true });
          assert.equal(await sideBySide.isChecked(), true);
          await sideBySide.uncheck();
          assert.equal(await entryStatusPage.evaluate(id => window.latest.toolbar.find(item => item.id === id)
            .sections[0].layout, fixtureId), undefined);
          await sideBySide.check();
          assert.equal(await entryStatusPage.evaluate(id => window.latest.toolbar.find(item => item.id === id)
            .sections[0].layout, fixtureId), 'compact');
        }
        await entryStatusPage.close();
      }
      const rtlEntryStatusPage = await browser.newPage({ viewport: { width: 391, height: 845 }, hasTouch: true, reducedMotion: 'reduce' });
      await rtlEntryStatusPage.goto(base + '/fixture-home/home?toolbar-panels&compact-entrance-status&entrance-light-tiles&locale=he');
      const rtlEntrySettings = rtlEntryStatusPage.locator('.toolbar-actions button[data-role=settings]');
      for (const [name, items] of [
        ['Entrance', '.toolbar-section-items:has(> [data-light-tile])'],
        ['Front entrance', '.toolbar-section[data-layout=compact] > .toolbar-section-items'],
      ]) {
        await rtlEntrySettings.tap();
        await rtlEntryStatusPage.getByRole('button', { name, exact:true }).tap();
        const dialog = rtlEntryStatusPage.getByRole('dialog', { name, exact:true });
        const sizes = await dialog.locator(items).first().evaluate(list => [...list.children].slice(0, 2).map(tile => ({
          x: tile.getBoundingClientRect().x, textDirection: getComputedStyle(tile).direction,
        })));
        assert.ok(sizes[0].x + 100 < sizes[1].x, name + ' first configured item is on the left');
        assert.deepEqual(sizes.map(tile => tile.textDirection), ['rtl','rtl']);
        await dialog.locator('button[data-role=close]').tap();
        await dialog.waitFor({ state:'hidden' });
      }
      await rtlEntryStatusPage.close();
      console.log(engine + ': compact Entrance and Overview status, guarded lock commands, native graph and fallback, and visual editor');

      const entrancePage = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      entrancePage.setDefaultTimeout(8000);
      const entranceUrl = base + '/fixture-home/home?toolbar-panels&entrance-light-tiles';
      await entrancePage.goto(entranceUrl);
      const entrance = entrancePage.getByRole('dialog', { name: 'Entrance', exact: true });
      const openEntrance = async () => {
        await entrancePage.getByRole('button', { name: 'Appearance', exact: true }).tap();
        await entrancePage.getByRole('button', { name: 'Entrance', exact: true }).tap();
        await entrance.waitFor();
      };
      const lightCalls = () => entrancePage.evaluate(() => window.bayitTest.calls.filter(call => call.type === 'call_service'));
      await openEntrance();
      const lamp = entrance.locator('[data-entity="light.demo_lamp"] .device-tile');
      const tiles = entrance.locator('[data-light-tile] .device-tile');
      assert.equal(await tiles.count(), 4);
      assert.equal(await entrance.getByRole('button', { name: 'Apply · Brightness' }).count(), 0);
      assert.equal(await entrance.locator('[data-entity="light.demo_entry_generic"] .device-tile').count(), 0);
      assert.ok(await entrance.locator('.toolbar-section-items:has([data-light-tile])').evaluate(items => {
        const [first, second, , , generic] = [...items.children].map(item => item.getBoundingClientRect());
        return Math.abs(first.top - second.top) <= 1 && Math.abs(first.width - second.width) <= 1 &&
          first.width >= 44 && first.height >= 44 && generic.width > first.width && items.scrollWidth <= items.clientWidth;
      }));
      const entranceHash = new URL(entrancePage.url()).hash;
      assert.equal(entranceHash, '#panel/entrance-panel');
      await lamp.tap();
      await entrance.locator('[data-entity="light.demo_lamp"] .device-tile[aria-pressed="true"]').waitFor();
      const expectedCommand = {
        type:'call_service', domain:'light', service:'turn_on', service_data:{}, target:{entity_id:'light.demo_lamp'},
      };
      assert.deepEqual(await lightCalls(), [expectedCommand]);
      assert.equal(new URL(entrancePage.url()).hash, entranceHash);

      await entrance.getByRole('button', { name: 'Guarded light · Turn off', exact: true }).tap();
      const guardedPrompt = entrancePage.locator('dialog.confirm[open]');
      await guardedPrompt.getByText('Turn off the guarded light?', { exact:true }).waitFor();
      await guardedPrompt.getByRole('button', { name: 'Cancel', exact:true }).tap();
      assert.deepEqual(await lightCalls(), [expectedCommand]);

      await entrance.getByRole('button', { name: 'Offline light · More info', exact: true }).tap();
      await entrance.waitFor();
      assert.deepEqual(await entrancePage.evaluate(() => window.bayitTest.moreInfoCalls), ['light.demo_entry_unavailable']);
      const entryLightBounds = await lamp.boundingBox();
      await entrancePage.mouse.move(entryLightBounds.x + entryLightBounds.width / 2, entryLightBounds.y + entryLightBounds.height / 2);
      await entrancePage.mouse.down();
      await entrancePage.waitForFunction(() => window.bayitTest.moreInfoCalls.includes('light.demo_lamp'));
      await entrancePage.mouse.up();
      await entrance.waitFor();
      await entrance.getByRole('button', { name: 'Porch light · Turn on', exact: true }).press('Shift+Enter');
      await entrance.waitFor();
      assert.deepEqual(await entrancePage.evaluate(() => window.bayitTest.moreInfoCalls), [
        'light.demo_entry_unavailable', 'light.demo_lamp', 'light.demo_entry_second',
      ]);
      assert.deepEqual(await lightCalls(), [expectedCommand]);
      await entrancePage.close();

      const entranceEditor = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true });
      await entranceEditor.goto(entranceUrl + '&editor');
      await entranceEditor.getByText('Toolbar and extra screens', { exact: true }).tap();
      await entranceEditor.getByRole('button', { name: 'Entrance', exact: true }).tap();
      await entranceEditor.getByRole('button', { name: 'Lights', exact: true }).tap();
      await entranceEditor.getByRole('button', { name: 'Generic light', exact: true }).tap();
      const entranceRole = entranceEditor.getByLabel('Display as', { exact: true });
      assert.equal(await entranceRole.inputValue(), 'device');
      await entranceRole.selectOption({ label: 'Light toggle tile' });
      assert.equal(await entranceEditor.evaluate(() => window.latest.toolbar.find(item => item.id === 'entrance-panel')
        .sections[0].entities.find(item => item.entity === 'light.demo_entry_generic').role), 'light_tile');
      await entranceEditor.close();
      console.log(engine + ': configured entry light tiles, guarded commands, exact native details, and visual editor');

      for (const width of [320, 390]) {
        const securityPage = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
        securityPage.setDefaultTimeout(8000);
        await securityPage.goto(base + '/fixture-home/home?toolbar-panels&security-cover-rail');
        const securityDialog = securityPage.getByRole('dialog', { name: 'Security', exact: true });
        const openSecurity = async () => {
          await securityPage.getByRole('button', { name: 'Security', exact: true }).tap();
          await securityDialog.waitFor();
        };
        const securityCalls = () => securityPage.evaluate(() => window.bayitTest.calls);
        await openSecurity();
        const securityRails = securityDialog.locator('[data-cover-rail]');
        assert.equal(await securityRails.count(), 2);
        assert.equal(await securityDialog.locator('[data-action="set_position"]').count(), 0);
        if (width === 390) {
          // The scrollbar in the installed Security screen leaves about 302px for these tiles.
          await securityRails.first().evaluate(card => { card.parentElement.style.maxInlineSize = '302px'; });
        }
        const layout = await securityRails.evaluateAll(cards => {
          const top = cards.map(card => card.getBoundingClientRect().top);
          const bounds = cards.flatMap(card => [...card.querySelectorAll('.device-panel-launch, .basic-actions button')]
            .map(button => button.getBoundingClientRect().toJSON()));
          return { top, bounds, noOverflow: cards.every(card => card.scrollWidth <= card.clientWidth) };
        });
        assert.equal(Math.abs(layout.top[0] - layout.top[1]) < 1, width === 390);
        assert.equal(layout.noOverflow, true);
        assert.equal(layout.bounds.length, 8);
        assert.ok(layout.bounds.every(({ width, height }) => width >= 44 && height >= 44));
        const west = securityDialog.locator('[data-entity="cover.demo_security_first"]');
        const east = securityDialog.locator('[data-entity="cover.demo_security_second"]');
        assert.equal(await west.locator('[data-action=close]').isDisabled(), true);
        assert.equal(await west.locator('[data-action=stop]').isEnabled(), true);
        assert.equal(await east.locator('[data-action=open]').isDisabled(), true);
        assert.equal(await east.locator('[data-action=close]').isEnabled(), true);
        const westHeader = west.getByRole('button', { name: 'West shade · More info', exact: true });
        const eastHeader = east.getByRole('button', { name: 'East curtain · More info', exact: true });
        await westHeader.tap();
        await securityDialog.waitFor();
        const curtainBounds = await eastHeader.boundingBox();
        await securityPage.mouse.move(curtainBounds.x + curtainBounds.width / 2, curtainBounds.y + curtainBounds.height / 2);
        await securityPage.mouse.down();
        await securityPage.waitForFunction(() => window.bayitTest.moreInfoCalls.length === 2);
        await securityPage.mouse.up();
        await securityDialog.waitFor();
        await westHeader.press('Shift+Enter');
        await securityDialog.waitFor();
        assert.deepEqual(await securityPage.evaluate(() => window.bayitTest.moreInfoCalls),
          ['cover.demo_security_first', 'cover.demo_security_second', 'cover.demo_security_first']);
        assert.deepEqual(await securityCalls(), []);

        assert.equal(await securityDialog.getByRole('button', { name: /^Status shade/ }).count(), 1);
        await west.locator('[data-action=open]').tap();
        await west.locator('.device-panel-launch').getByText(/100%/).waitFor();
        assert.equal(await west.locator('[data-action=open]').isDisabled(), true);
        await east.locator('[data-action=stop]').tap();
        await west.locator('[data-action=close]').tap();
        assert.deepEqual(await securityCalls(), [
          ['open_cover', 'cover.demo_security_first'], ['stop_cover', 'cover.demo_security_second'],
          ['close_cover', 'cover.demo_security_first'],
        ].map(([service, entity_id]) => ({
          type: 'call_service', domain: 'cover', service, service_data: {}, target: { entity_id },
        })));
        assert.equal(new URL(securityPage.url()).hash, '#panel/fixture-security');
        await securityDialog.getByRole('button', { name: 'Close', exact: true }).first().tap();
        await securityDialog.waitFor({ state: 'hidden' });
        await securityPage.getByRole('button', { name: 'Appearance', exact: true }).tap();
        await securityPage.getByRole('button', { name: 'Other controls', exact: true }).tap();
        const unmodifiedPanel = securityPage.getByRole('dialog', { name: 'Other controls', exact: true });
        await unmodifiedPanel.locator('input[data-action="set_position"]').waitFor();
        assert.equal(await unmodifiedPanel.locator('[data-cover-rail]').count(), 0);
        await securityPage.close();
      }
      const guardedRail = await browser.newPage({ viewport: { width: 320, height: 812 }, hasTouch: true });
      await guardedRail.goto(base + '/fixture-home/home?toolbar-panels&security-cover-rail&cover-rail-confirm');
      await guardedRail.getByRole('button', { name: 'Security', exact: true }).tap();
      const coverRail = guardedRail.getByRole('dialog', { name: 'Security', exact: true })
        .locator('[data-entity="cover.demo_security_first"]');
      const railConfirmation = guardedRail.getByRole('dialog', { name: 'Confirm action', exact: true });
      const acceptRail = railConfirmation.getByRole('button', { name: 'Confirm', exact: true });
      await coverRail.locator('[data-action=open]').tap();
      await railConfirmation.waitFor();
      await guardedRail.evaluate(() => {
        window.bayitTest.setFixtureAttributes('cover.demo_security_first', { current_position: 100 });
        window.bayitTest.setRoomState('cover.demo_security_first', 'open');
      });
      await acceptRail.tap();
      await railConfirmation.waitFor({ state: 'hidden' });
      assert.deepEqual(await guardedRail.evaluate(() => window.bayitTest.calls), []);
      await coverRail.locator('[data-action=close]').tap();
      await acceptRail.tap();
      assert.deepEqual(await guardedRail.evaluate(() => window.bayitTest.calls), [
        { type:'call_service',domain:'cover',service:'close_cover',service_data:{},target:{entity_id:'cover.demo_security_first'} },
      ]);
      await guardedRail.close();
      console.log(engine + ': Security cover rails at 320–390 px, exact native details, endpoint and latest confirmation');
      await assertReportedCoverMotion(browser);

      const groupOffPage = await browser.newPage({ viewport:{width:320,height:845}, hasTouch:true, reducedMotion:'reduce' });
      groupOffPage.setDefaultTimeout(8000);
      const offOverviewName = rightToLeft ? 'מבט על הבית' : 'Home overview';
      const offLabel = rightToLeft ? 'כיבוי המנורות' : 'Turn off lights';
      const offOverview = groupOffPage.getByRole('dialog',{name:offOverviewName,exact:true});
      const offUrl = base + '/fixture-home/home?overview-opt-in&locale=' + (rightToLeft ? 'he' : 'en');
      const callsForGroup = () => groupOffPage.evaluate(() => window.bayitTest.calls.filter(call => call.type === 'call_service'));
      for (const selected of [false,true]) {
        await groupOffPage.goto(offUrl + (selected ? '&overview-lights-off-selected' : '&overview-lights-off'));
        await groupOffPage.getByRole('button',{name:offOverviewName,exact:true}).tap();
        const caption = selected ? 'Selected lighting' : 'Discovered lighting';
        const section = offOverview.locator('.toolbar-section').filter({
          has: groupOffPage.getByRole('heading',{name:caption,exact:true}),
        });
        const groupOff = section.getByRole('button',{name:offLabel + ' · ' + caption,exact:true});
        await section.waitFor();
        if (!selected) {
          assert.equal(await groupOff.count(),0);
          await groupOffPage.evaluate(() =>
            window.bayitTest.setDiscoveredLight('light.demo_second','Second active light',{}));
          await groupOff.waitFor();
          await groupOff.evaluate(button => {
            button.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
            window.bayitTest.setDiscoveredLight('light.demo_new','New active light',{});
            window.bayitTest.setRoomState('light.demo_second','off');
          });
          await section.getByText('New active light',{exact:true}).waitFor();
          await groupOff.evaluate(button => button.click());
        }
        await groupOff.waitFor();
        assert.equal(await offOverview.locator('.overview-lights-off:visible').count(),1);
        const bounds = await groupOff.boundingBox();
        assert.ok(bounds.width >= 44 && bounds.height >= 44);
        assert.deepEqual(await callsForGroup(),[]);
        await groupOff.tap();
        assert.equal(await groupOff.getAttribute('aria-busy'),'true');
        await groupOff.evaluate(button => button.click());
        assert.deepEqual(await callsForGroup(),[{
          type:'call_service',domain:'homeassistant',service:'turn_off',service_data:{},
          target:{entity_id:['light.demo_dining',selected ? 'light.demo_selected' : 'light.demo_new']},
        }]);
        await groupOffPage.evaluate(() => window.bayitTest.finishRoomOff(false));
        await groupOff.waitFor({state:'hidden'});
        if (selected) {
          await section.getByText('read_only',{exact:true}).waitFor();
          await section.getByText('protected',{exact:true}).waitFor();
        }
      }
      await groupOffPage.close();
      console.log(engine + ': active-light group Off targets the exact visible eligible set and rejects a changed gesture');

      const coverDiscovery = await browser.newPage({ viewport: { width: 391, height: 845 }, hasTouch: true, reducedMotion: 'reduce' });
      coverDiscovery.setDefaultTimeout(8000);
      const coverDiscoveryUrl = base + '?overview-opt-in&overview-cover-discovery';
      await coverDiscovery.goto(coverDiscoveryUrl);
      await coverDiscovery.getByRole('button', { name:'Home overview', exact:true }).tap();
      const coverDrawer = coverDiscovery.getByRole('dialog', { name:'Home overview', exact:true });
      const discoveredCovers = coverDrawer.locator('.toolbar-section').filter({
        has: coverDiscovery.getByRole('heading', { name:'Discovered covers', exact:true }),
      });
      await discoveredCovers.getByRole('button', { name:'Overview cover · Closing', exact:true }).waitFor();
      await coverDiscovery.evaluate(() => {
        const entity = 'cover.demo_added_later';
        window.bayitTest.setRoomState(entity, 'closed');
        window.bayitTest.setFixtureAttributes(entity, {friendly_name:'New shade', supported_features:15, current_position:37});
        window.bayitTest.setRoomState(entity, 'opening');
      });
      const newShade = discoveredCovers.getByRole('button', { name:/^New shade · Opening/ });
      await newShade.waitFor();
      assert.match(await newShade.innerText(), /37%/);
      const shadeHeight = (await newShade.boundingBox()).height;
      assert.ok(shadeHeight >= 44 && shadeHeight <= 50);
      const pitches = await discoveredCovers.locator('.tile-row').evaluateAll(rows => rows.map(row => row.getBoundingClientRect().top));
      assert.ok(Math.abs(pitches[1] - pitches[0]) >= 48 && Math.abs(pitches[1] - pitches[0]) <= 54);
      assert.equal(await discoveredCovers.locator('[data-action], input, select').count(),0);
      await newShade.tap();
      assert.deepEqual(await coverDiscovery.evaluate(() => window.bayitTest.moreInfoCalls), ['cover.demo_added_later']);
      assert.deepEqual(await coverDiscovery.evaluate(() => window.bayitTest.calls),[]);
      await coverDiscovery.evaluate(() => window.bayitTest.setRoomState('cover.demo_added_later', 'closed'));
      await newShade.waitFor({ state:'hidden' });
      await coverDiscovery.goto(coverDiscoveryUrl + '&editor');
      const coverEditor = coverDiscovery.locator('#editor');
      await coverEditor.getByText('Toolbar and extra screens', { exact:true }).tap();
      await coverEditor.getByRole('button', { name:'Overview', exact:true }).tap();
      await coverEditor.getByRole('button', { name:'Discovered covers', exact:true }).tap();
      const coverSource = coverEditor.getByLabel('Device source', { exact:true });
      assert.equal(await coverSource.inputValue(), 'cover');
      await coverEditor.getByLabel('Exclude these covers', { exact:true }).selectOption('cover.demo_overview_window');
      const includeClosing = coverEditor.getByLabel('Include closing covers', { exact:true });
      assert.equal(await includeClosing.isChecked(), true);
      await includeClosing.uncheck();
      const coverSettings = () => coverDiscovery.evaluate(() => window.latest.toolbar[0].sections[3]);
      assert.deepEqual((await coverSettings()).discover.exclude_entities, ['cover.demo_overview_window']);
      assert.equal((await coverSettings()).include_closing, undefined);
      await coverSource.selectOption('manual');
      const manualCoverSettings = await coverSettings();
      assert.equal(manualCoverSettings.discover, undefined);
      assert.deepEqual(manualCoverSettings.entities, [{entity:'cover.demo_overview_window',role:'status'}]);
      await coverDiscovery.close();
      console.log(engine + ': discovered Overview covers show exact status and native details without controls');

      const overviewPage = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      overviewPage.setDefaultTimeout(8000);
      await overviewPage.goto(base + '?overview-opt-in');
      await overviewPage.getByRole('button', { name: 'Home overview', exact: true }).tap();
      const overviewDrawer = overviewPage.getByRole('dialog', { name: 'Home overview', exact: true });
      const overviewSection = title => overviewDrawer.locator('.toolbar-section').filter({
        has: overviewPage.getByRole('heading', { name: title, exact: true, includeHidden: true }),
      });
      const lighting = overviewSection('Discovered lighting');
      const closes = overviewSection('Closing status');
      const legacyCovers = overviewSection('Default covers');
      const dining = lighting.getByRole('button', { name: 'Dining task lamp · On', exact: true });
      await dining.waitFor();
      assert.deepEqual(await lighting.locator('.tile-label').allTextContents(), ['Dining task lamp']);
      await closes.getByRole('button', { name: 'Overview cover · Closing', exact: true }).waitFor();
      assert.equal(await legacyCovers.isVisible(), false);
      for (const state of ['unknown', 'unavailable', 'closed']) {
        await overviewPage.evaluate(() => window.bayitTest.setRoomState('cover.demo_overview_window', 'opening'));
        await legacyCovers.getByRole('button', { name: 'Overview cover · Opening', exact: true }).waitFor();
        await overviewPage.evaluate(state => window.bayitTest.setRoomState('cover.demo_overview_window', state), state);
        await legacyCovers.waitFor({ state: 'hidden' });
        await closes.waitFor({ state: 'hidden' });
      }

      await dining.focus();
      await overviewPage.evaluate(() => window.bayitTest.setDiscoveredLight('light.demo_arrived', 'A new lamp', {}));
      const arrived = lighting.getByRole('button', { name: 'A new lamp · On', exact: true });
      await arrived.waitFor();
      assert.deepEqual(await lighting.locator('.tile-label').allTextContents(), ['A new lamp', 'Dining task lamp']);
      assert.equal(await dining.evaluate(tile => tile.getRootNode().activeElement === tile), true);
      await arrived.evaluate(tile => {
        window.bayitTest.setDiscoveredLight('light.demo_arrived', 'A new lamp', { hidden: true });
        tile.click();
      });
      await arrived.waitFor({ state: 'hidden' });
      assert.equal(await overviewPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
      await dining.tap();
      await lighting.waitFor({ state: 'hidden' });
      assert.deepEqual(await overviewPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain)), [{
        type: 'call_service', domain: 'light', service: 'turn_off', target: { entity_id: 'light.demo_dining' }, service_data: {},
      }]);
      await overviewDrawer.getByText('All quiet', { exact: true }).waitFor();
      await overviewPage.close();

      const overviewReadings = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      const overviewName = rightToLeft ? 'מבט על הבית' : 'Home overview';
      const safetyName = rightToLeft ? 'אבטחה' : 'Security';
      const onName = rightToLeft ? 'פועל' : 'On';
      const coolingName = rightToLeft ? 'קירור' : 'Cooling';
      const readingRoom = rightToLeft ? 'עכשיו' : 'Now';
      const readingTarget = rightToLeft ? 'יעד' : 'Target';
      const cleanReading = value => value.replace(/[\u2066\u2069]/g, '');
      const rowWith = (dialog, title) => dialog.locator('.tile-row').filter({
        has: overviewReadings.locator('.tile-label').getByText(title, { exact: true }),
      });
      const read = async tile => cleanReading(await tile.locator('.tile-state').innerText());
      const updateReadings = (brightness, temperature, ambient) => overviewReadings.evaluate(async values => {
        window.bayitTest.setFixtureAttributes('light.demo_dining', { brightness: values.brightness });
        window.bayitTest.setFixtureAttributes('climate.demo_overview_air', {
          temperature: values.temperature, current_temperature: values.ambient,
        });
        await new Promise(requestAnimationFrame);
      }, { brightness, temperature, ambient });
      await overviewReadings.goto(base + '?overview-opt-in&overview-readings&locale=' + (rightToLeft ? 'he' : 'en'));
      await overviewReadings.getByRole('button', { name: overviewName, exact: true }).tap();
      const readingsPanel = overviewReadings.getByRole('dialog', { name: overviewName, exact: true });
      const readingLight = rowWith(readingsPanel, 'Dining task lamp');
      const readingClimate = rowWith(readingsPanel, 'Overview AC');
      await readingLight.waitFor();
      assert.equal(await read(readingLight), onName + ' · 50%');
      const climateText = coolingName + ' · ' + readingTarget + ' 24°F · ' + readingRoom + ' 22°F';
      assert.equal(await read(readingClimate), climateText);
      assert.equal(cleanReading(await readingClimate.getAttribute('aria-label')), 'Overview AC · ' + climateText);
      assert.ok(await readingClimate.evaluate(row => row.scrollWidth <= row.clientWidth));
      for (const row of [readingLight, readingClimate]) {
        assert.ok(await row.evaluate(button => {
          const rect = button.getBoundingClientRect();
          const [mark, label, state] = [...button.children].map(element => element.getBoundingClientRect());
          const ordered = getComputedStyle(button).direction === 'rtl' ?
            mark.left >= label.right && label.left >= state.right :
            mark.right <= label.left && label.right <= state.left;
          return rect.height >= 44 && rect.height <= 56 && ordered &&
            [mark, label, state].every(item => item.top >= rect.top && item.bottom <= rect.bottom);
        }), 'Active overview rows use horizontal touch targets without overlapping their readings');
      }
      await updateReadings(242, null, 20);
      assert.equal(await read(readingLight), onName + ' · 95%');
      assert.equal(await read(readingClimate), coolingName + ' · ' + readingRoom + ' 20°F');
      await updateReadings(null, null, null);
      assert.equal(await read(readingLight), onName);
      assert.equal(await read(readingClimate), coolingName);
      await updateReadings(128, 24, 22.5);
      await readingClimate.tap();
      assert.deepEqual(await overviewReadings.evaluate(() => window.bayitTest.moreInfoCalls), ['climate.demo_overview_air']);
      await overviewReadings.keyboard.press('Escape');
      await readingsPanel.waitFor({ state: 'hidden' });
      await overviewReadings.getByRole('button', { name: safetyName, exact: true }).tap();
      const safetyPanel = overviewReadings.getByRole('dialog', { name: safetyName, exact: true });
      assert.equal(await read(rowWith(safetyPanel, 'Dining task lamp')), onName);
      assert.equal(await read(rowWith(safetyPanel, 'Overview AC')), coolingName + ' · 22.5 °F');
      assert.equal(await safetyPanel.locator('[data-overview-active-rows]').count(),0);
      assert.equal(await overviewReadings.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
      await overviewReadings.close();
      console.log(engine + ' 320: Overview shows live brightness, HVAC target and ambient without changing other panels');

      const overviewEditor = await browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true });
      overviewEditor.setDefaultTimeout(8000);
      await overviewEditor.goto(base + '?overview-opt-in&editor');
      await overviewEditor.getByText('Toolbar and extra screens', { exact: true }).tap();
      await overviewEditor.getByRole('button', { name: 'Overview', exact: true }).tap();
      await overviewEditor.getByRole('button', { name: 'Discovered lighting', exact: true }).tap();
      const lightSource = overviewEditor.getByLabel('Device source', { exact: true });
      assert.equal(await lightSource.inputValue(), 'light');
      const groupOffOption = overviewEditor.getByLabel('Show a button to turn off these lights',{exact:true});
      assert.equal(await groupOffOption.isChecked(),false);
      await groupOffOption.check();
      assert.equal(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[0].turn_off_active_lights),true);
      await overviewEditor.getByLabel('Exclude these lights', { exact: true }).selectOption(['light.demo_excluded', 'light.demo_dining']);
      const fragments = overviewEditor.getByLabel('Exclude by text in entity ID', { exact: true });
      await fragments.fill('unsafe.*');
      await fragments.blur();
      assert.equal(await fragments.getAttribute('aria-invalid'), 'true');
      assert.deepEqual(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[0].discover.exclude_id_contains), ['helper']);
      await fragments.fill('helper, AUX');
      await fragments.blur();
      assert.deepEqual(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[0].discover), {
        domain: 'light', exclude_entities: ['light.demo_dining', 'light.demo_excluded'], exclude_id_contains: ['helper', 'aux'],
      });
      await lightSource.selectOption('manual');
      assert.deepEqual(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[0].entities), ['light.demo_lamp']);
      assert.equal(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[0].discover), undefined);
      await lightSource.selectOption('light');
      await overviewEditor.getByRole('button', { name: 'Default covers', exact: true }).tap();
      assert.equal(await groupOffOption.count(),0);
      const closingOption = overviewEditor.getByLabel('Include closing covers', { exact: true });
      assert.equal(await closingOption.isChecked(), false);
      await closingOption.check();
      assert.equal(await overviewEditor.evaluate(() => window.latest.toolbar[0].sections[2].include_closing), true);
      await overviewEditor.close();
      console.log(engine + ' 320: live Overview discovery, exclusions, closing covers and visual editor');

      const effectEditorPage = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await effectEditorPage.addInitScript(() => {
        const key = 'bayit9-browser-fixture';
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, JSON.stringify({ strategy: { type: 'custom:bayit-9',
          room_overrides: { studio: { read_only_entities: ['light.demo_monitor'] } },
          light_effect_groups: {
            'light.demo_pendant': [{ title: 'Evening', effects: [
              { effect: 'Slow pulse', name: 'Gentle glow', icon: 'mdi:weather-night' }, 'Retired preset',
            ] }],
            'light.other_saved': [{ title: 'Elsewhere', effects: ['Other effect'] }],
          },
        } }));
      });
      await effectEditorPage.goto(base + '/fixture-home/home?configuration&room-grid');
      await effectEditorPage.getByRole('button', { name: 'Appearance', exact: true }).click();
      await effectEditorPage.getByRole('button', { name: 'Customize home', exact: true }).click();
      const effectSetup = effectEditorPage.getByRole('dialog', { name: 'Customize home', exact: true });
      await effectSetup.getByText('Light effect categories', { exact: true }).click();
      const effectLight = effectSetup.getByLabel('Light', { exact: true });
      assert.deepEqual(await effectLight.locator('option').evaluateAll(options => options.map(option => option.value)),
        ['', 'light.demo_pendant']);
      await effectLight.selectOption('light.demo_pendant');
      const groupName = effectSetup.getByLabel('Category name', { exact: true });
      const groupPicker = effectSetup.getByLabel('Category', { exact: true });
      const effectToAdd = effectSetup.getByLabel('Available effect', { exact: true });
      const saveEffects = effectSetup.getByRole('button', { name: 'Save dashboard', exact: true });
      assert.deepEqual(await effectToAdd.locator('option').evaluateAll(options => options.map(option => option.value)),
        ['', 'Color loop']);
      await effectEditorPage.evaluate(() => window.bayitTest.setRoomState('light.demo_pendant', 'unavailable'));
      await effectSetup.getByText('This light is not reporting effects right now. Saved categories are kept.').waitFor();
      assert.equal(await effectToAdd.count(), 0);
      assert.equal(await saveEffects.isDisabled(), true);
      await groupName.fill('After dark');
      assert.equal(await saveEffects.isEnabled(), true);
      await groupName.press('Tab');
      assert.equal(await groupPicker.locator('option:checked').innerText(), 'After dark');
      await effectEditorPage.evaluate(() => window.bayitTest.setRoomState('light.demo_pendant', 'on'));
      await effectToAdd.selectOption('Color loop');
      await effectSetup.getByRole('button', { name: 'Add effect', exact: true }).click();
      await effectSetup.getByRole('button', { name: 'Move up · Color loop', exact: true }).click();
      await groupPicker.selectOption('new');
      await groupName.fill('Weekend');
      await effectToAdd.selectOption('Slow pulse');
      await effectSetup.getByRole('button', { name: 'Add category', exact: true }).click();
      await effectSetup.getByRole('button', { name: 'Delete category', exact: true }).click();
      await groupPicker.selectOption('new');
      await groupName.fill('Morning');
      await effectToAdd.selectOption('Color loop');
      await effectSetup.getByRole('button', { name: 'Add category', exact: true }).click();
      assert.equal(await effectEditorPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
      await saveEffects.click();
      await effectSetup.waitFor({ state: 'hidden' });
      assert.deepEqual(await effectEditorPage.evaluate(() =>
        JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.light_effect_groups), {
        'light.demo_pendant': [
          { title: 'After dark', effects: [
            { effect: 'Slow pulse', name: 'Gentle glow', icon: 'mdi:weather-night' },
            { effect: 'Color loop' }, { effect: 'Retired preset' },
          ] },
          { title: 'Morning', effects: [{ effect: 'Color loop' }] },
        ],
        'light.other_saved': [{ title: 'Elsewhere', effects: ['Other effect'] }],
      });
      await effectEditorPage.getByRole('button', { name: 'Studio', exact: true }).click();
      await effectEditorPage.getByRole('dialog').locator('[data-entity="light.demo_pendant"] .device-tile').press('Shift+Enter');
      await effectEditorPage.getByRole('button', { name: 'Effects', exact: true }).click();
      const savedGallery = effectEditorPage.getByRole('region', { name: 'Light effect', exact: true });
      await savedGallery.getByRole('button', { name: 'After dark', exact: true }).waitFor();
      await savedGallery.getByRole('button', { name: 'Morning', exact: true }).waitFor();
      assert.equal(await savedGallery.getByText('Retired preset', { exact: true }).count(), 0);
      await effectEditorPage.close();

      const rtlEffects = await browser.newPage({ viewport: { width: 320, height: 760 }, hasTouch: true });
      await rtlEffects.goto(base + '?editor&room-grid&locale=he');
      await rtlEffects.getByText('קטגוריות אפקטים לתאורה', { exact: true }).tap();
      await rtlEffects.getByLabel('תאורה', { exact: true }).selectOption('light.demo_pendant');
      await rtlEffects.getByLabel('שם קטגוריה', { exact: true }).fill('ערב');
      await rtlEffects.getByLabel('אפקט זמין', { exact: true }).selectOption('Slow pulse');
      await rtlEffects.getByRole('button', { name: 'הוספת קטגוריה', exact: true }).tap();
      assert.equal(await rtlEffects.getByLabel('קטגוריה', { exact: true }).locator('option:checked').innerText(), 'ערב');
      assert.equal(await rtlEffects.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await rtlEffects.close();

      const sectionDiscoveryPage = await browser.newPage({ viewport:{width:390,height:844}, hasTouch:true, reducedMotion:'reduce' });
      const openSectionSetup = async () => {
        await sectionDiscoveryPage.getByRole('button',{name:'Appearance',exact:true}).tap();
        await sectionDiscoveryPage.getByRole('button',{name:'Customize home',exact:true}).tap();
        const panel = sectionDiscoveryPage.getByRole('dialog',{name:'Customize home',exact:true});
        await panel.getByText('Rooms',{exact:true}).tap();
        return panel;
      };
      await sectionDiscoveryPage.goto(base + '/fixture-home/home?configuration&section-discovery');
      const sectionSetup = await openSectionSetup();
      const deviceMode = sectionSetup.getByLabel('Devices in this room',{exact:true});
      const sectionArrangement = sectionSetup.getByLabel('Section arrangement',{exact:true});
      const currentHeading = sectionSetup.getByLabel('Section heading',{exact:true});
      assert.equal(await deviceMode.inputValue(),'auto');
      await sectionSetup.getByText('Room sections',{exact:true}).tap();
      await sectionArrangement.selectOption('manual');
      await sectionSetup.getByRole('button',{name:'Add section',exact:true}).tap();
      await currentHeading.fill('My fixtures');
      await currentHeading.press('Enter');
      await sectionSetup.getByLabel('Room device',{exact:true}).selectOption('light.demo_lamp');
      await sectionSetup.getByRole('button',{name:'Move to this section',exact:true}).tap();
      assert.equal(await deviceMode.inputValue(),'auto');
      await sectionSetup.getByRole('button',{name:'Save dashboard',exact:true}).tap();
      await sectionDiscoveryPage.getByRole('button',{name:'Studio',exact:true}).tap();
      const regeneratedRoom = sectionDiscoveryPage.getByRole('dialog',{name:'Studio',exact:true});
      await regeneratedRoom.getByRole('heading',{name:'My fixtures',exact:true}).waitFor();
      await regeneratedRoom.getByText('New lamp after layout',{exact:true}).waitFor();
      const saved = await sectionDiscoveryPage.evaluate(() =>
        JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.room_overrides.studio);
      assert.equal(saved.device_selection,'auto');
      assert.equal(saved.entities,undefined);
      assert.deepEqual(saved.sections[0].entities,['light.demo_lamp']);
      await sectionDiscoveryPage.keyboard.press('Escape');
      await regeneratedRoom.waitFor({state:'hidden'});
      await openSectionSetup();
      await sectionSetup.getByText('Room sections',{exact:true}).tap();
      await deviceMode.selectOption('manual');
      assert.equal(await currentHeading.inputValue(),'My fixtures');
      await deviceMode.selectOption('auto');
      assert.equal(await currentHeading.inputValue(),'My fixtures');
      await sectionDiscoveryPage.close();

      const setupPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await setupPage.goto(base + '/fixture-home/home?configuration&large-setup');
      await setupPage.getByRole('button', { name: 'Appearance', exact: true }).click();
      assert.equal(new URL(setupPage.url()).hash, '#panel/settings');
      await setupPage.getByRole('button', { name: 'Customize home', exact: true }).click();
      const setup = setupPage.getByRole('dialog', { name: 'Customize home', exact: true });
      const setupEditor = setup.locator('.setup-editor');
      await setupEditor.getByText('Device visibility', { exact: true }).waitFor();
      assert.equal(await setupEditor.locator('option').count(), 3, 'Closed setup sections only mount their summaries');
      const visibility = setupEditor.getByText('Device visibility', { exact: true });
      const hideDevices = setupEditor.getByLabel('Hide devices', { exact: true });
      await visibility.click();
      assert.equal(await hideDevices.locator('option').count(), 605);
      await hideDevices.selectOption(['sensor.scale_entity_6']);
      await visibility.click();
      assert.equal(await hideDevices.count(), 0);
      await visibility.press('Enter');
      assert.deepEqual(await hideDevices.locator('option:checked').evaluateAll(nodes => nodes.map(node => node.value)),
        ['sensor.scale_entity_6']);
      await visibility.click();

      const profiles = setupEditor.getByText('Boiler and heater controls', { exact: true });
      const profileName = setupEditor.getByLabel('Display name', { exact: true });
      await profiles.click();
      await setupEditor.getByRole('button', { name: 'Add profile', exact: true }).click();
      await profileName.fill('Uncommitted heater name');
      await profiles.click();
      assert.equal(await profileName.count(), 0);

      const shortcuts = setupEditor.getByText('Room shortcuts', { exact: true });
      const shortcutRoom = setupEditor.getByLabel('Room', { exact: true });
      const automaticShortcuts = setupEditor.getByLabel('Choose shortcuts automatically', { exact: true });
      await shortcuts.click();
      await automaticShortcuts.waitFor();
      assert.equal(await setupEditor.getByLabel('Shortcut 1', { exact: true }).count(), 0);
      await shortcutRoom.selectOption('studio');
      assert.equal(await shortcutRoom.evaluate(input => input.getRootNode().activeElement === input), true);
      assert.equal(await automaticShortcuts.isChecked(), true);
      await automaticShortcuts.uncheck();
      const firstShortcut = setupEditor.getByLabel('Shortcut 1', { exact: true });
      await firstShortcut.selectOption('light.demo_lamp');
      await automaticShortcuts.check();
      assert.equal(await firstShortcut.count(), 0);
      await automaticShortcuts.uncheck();
      assert.equal(await firstShortcut.inputValue(), 'light.demo_lamp');
      await shortcuts.click();
      await profiles.click();

      await setup.getByText('Rooms', { exact: true }).click();
      await setup.getByText('New dashboard-only room', { exact: true }).click();
      await setup.getByLabel('New room name', { exact: true }).fill('Reading nook');
      await setup.getByRole('button', { name: 'Create room', exact: true }).click();
      await setup.getByLabel('Available devices', { exact: true }).selectOption('light.demo_lamp');
      await setup.getByRole('button', { name: 'Add device', exact: true }).click();
      await setup.getByLabel('Show status only for selected room devices', { exact: true }).selectOption(['light.demo_lamp']);
      assert.equal(await profileName.inputValue(), 'Uncommitted heater name');
      await setup.getByRole('button', { name: 'Save dashboard', exact: true }).click();
      await setupPage.getByRole('button', { name: 'Reading nook', exact: true }).waitFor();
      const persisted = await setupPage.evaluate(() => JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')));
      assert.equal(await setupPage.evaluate(() => sessionStorage.getItem('bayit9-browser-fixture-hash-at-save')), '#panel/settings');
      assert.equal(new URL(setupPage.url()).hash, '');
      assert.deepEqual(Object.values(persisted.strategy.room_overrides), [{ name: 'Reading nook',
        entities: ['light.demo_lamp'], read_only_entities: ['light.demo_lamp'] }]);
      assert.deepEqual(persisted.strategy.hidden_entities, ['sensor.scale_entity_6']);
      assert.deepEqual(persisted.strategy.room_shortcuts.studio, ['light.demo_lamp']);
      assert.equal(persisted.strategy.profiles, undefined);
      assert.equal(await setupPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
      await setupPage.close();

      const roomConfigUrl = base + '/fixture-home/home?configuration&room-selection';
      const openRoomEditor = async page => {
        await page.getByRole('button', { name: 'Appearance', exact: true }).tap();
        await page.getByRole('button', { name: 'Customize home', exact: true }).tap();
        const setup = page.getByRole('dialog', { name: 'Customize home', exact: true });
        await setup.getByText('Rooms', { exact: true }).tap();
        return setup;
      };
      const newRoomConfigPage = () => browser.newPage({ viewport: { width: 320, height: 844 }, hasTouch: true });
      const roomOrder = page => page.locator('.room').evaluateAll(rooms => rooms.map(room => room.dataset.room));
      const selectionSettings = page => page.evaluate(() => {
        const { area_ids, room_selection } = JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy;
        return { area_ids, room_selection };
      });
      const roomMode = setup => setup.getByLabel('Rooms on the dashboard', { exact: true });
      const saveRoomConfig = async setup => {
        await setup.getByRole('button', { name: 'Save dashboard', exact: true }).tap();
        await setup.waitFor({ state: 'hidden' });
      };

      const selectedRoomsPage = await newRoomConfigPage();
      await selectedRoomsPage.goto(roomConfigUrl + '&legacy-room-order');
      let roomSetup = await openRoomEditor(selectedRoomsPage);
      assert.equal(await roomMode(roomSetup).inputValue(), 'custom');
      await roomSetup.getByLabel('Available rooms', { exact: true }).selectOption('spare');
      await roomSetup.getByRole('button', { name: 'Show room', exact: true }).tap();
      const roomName = roomSetup.getByLabel('Room display name', { exact: true });
      await roomName.fill('Guest room');
      await roomName.press('Enter');
      const nameBreak = roomSetup.getByLabel('Room name line break in classic layout', { exact: true });
      await nameBreak.selectOption('1');
      const moveUp = roomSetup.getByRole('button', { name: 'Move up · Guest room', exact: true });
      await moveUp.press('Enter');
      assert.equal(await moveUp.evaluate(control => control.getRootNode().activeElement === control), true);
      await saveRoomConfig(roomSetup);
      await selectedRoomsPage.getByRole('button', { name: 'Guest room', exact: true }).waitFor();
      const guestTitle = selectedRoomsPage.locator('.room[data-room=spare] .room-name');
      assert.equal(await guestTitle.textContent(), 'Guest\nroom');
      assert.deepEqual(await roomOrder(selectedRoomsPage), ['lounge', 'spare', 'studio']);
      assert.deepEqual(await selectionSettings(selectedRoomsPage), {
        area_ids: ['lounge', 'spare', 'studio'], room_selection: 'manual',
      });
      await selectedRoomsPage.getByRole('button', { name: 'Guest room', exact: true }).tap();
      await selectedRoomsPage.getByRole('dialog', { name: 'Guest room', exact: true }).waitFor();
      await selectedRoomsPage.getByText('No devices in this room.', { exact: true }).waitFor();
      await selectedRoomsPage.goto(roomConfigUrl + '&member');
      await selectedRoomsPage.getByRole('button', { name: 'Guest room', exact: true }).waitFor();
      await selectedRoomsPage.getByRole('button', { name: 'Appearance', exact: true }).tap();
      assert.equal(await selectedRoomsPage.getByRole('button', { name: 'Customize home', exact: true }).count(), 0);
      assert.equal(await selectedRoomsPage.evaluate(() => window.bayitTest.calls.length), 0);
      await selectedRoomsPage.close();

      const namesPage = await newRoomConfigPage();
      namesPage.setDefaultTimeout(8000);
      await namesPage.goto(base + '/fixture-home/home?configuration&room-control-names&device-panel');
      await namesPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      let namedRoom = namesPage.getByRole('dialog', { name: 'Studio', exact: true });
      const namedLamp = namedRoom.getByRole('button', { name: 'Workshop light · Turn on', exact: true });
      await namedLamp.waitFor();
      const hiddenCaption = namedRoom.getByRole('heading', { name: 'Dedicated thermostat', exact: true });
      await hiddenCaption.waitFor();
      assert.equal(await hiddenCaption.getAttribute('data-room-name-hidden'), '');
      assert.match(await hiddenCaption.evaluate(element => getComputedStyle(element).clipPath), /^inset\(50%/);
      await namedLamp.press('Shift+Enter');
      const lampDetails = namesPage.getByRole('dialog', { name: 'Desk lamp', exact: true });
      await lampDetails.waitFor();
      await namesPage.keyboard.press('Escape');
      await lampDetails.waitFor({ state: 'hidden' });

      await namesPage.getByRole('button', { name: 'Den', exact: true }).tap();
      const den = namesPage.getByRole('dialog', { name: 'Den', exact: true });
      await den.getByRole('button', { name: 'Desk lamp · Turn on', exact: true }).waitFor();
      await namesPage.keyboard.press('Escape');
      await den.waitFor({ state: 'hidden' });

      const nameSetup = await openRoomEditor(namesPage);
      await nameSetup.getByLabel('Room to customize', { exact: true }).selectOption('studio');
      await nameSetup.getByText('Device display', { exact: true }).tap();
      const which = nameSetup.getByLabel('Device to customize', { exact: true });
      const caption = nameSetup.getByLabel('Name in this room', { exact: true });
      const showCaption = nameSetup.getByLabel('Show name in this room', { exact: true });
      await which.selectOption('climate.demo_air');
      assert.equal(await showCaption.isChecked(), false);
      assert.equal(await caption.isDisabled(), true);
      await showCaption.check();
      assert.equal(await caption.getAttribute('placeholder'), 'Dedicated thermostat');
      await showCaption.uncheck();
      await which.selectOption('light.demo_lamp');
      await caption.fill('Reading table light');
      await caption.press('Enter');
      await saveRoomConfig(nameSetup);
      assert.deepEqual(await namesPage.evaluate(() => {
        const { room_overrides, profiles } = JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy;
        return { names: room_overrides.studio.entity_names, den: room_overrides.bayit_room_den.entity_names, profileName: profiles[0].name };
      }), { names: { 'light.demo_lamp': 'Reading table light', 'climate.demo_air': '' }, den: undefined, profileName: 'Dedicated thermostat' });
      await namesPage.getByRole('button', { name: 'Studio', exact: true }).tap();
      namedRoom = namesPage.getByRole('dialog', { name: 'Studio', exact: true });
      await namedRoom.getByRole('button', { name: 'Reading table light · Turn on', exact: true }).waitFor();
      assert.equal(await namesPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
      await namesPage.close();
      console.log(engine + ' 320: scoped room names, accessible blank captions and editor persistence');

      const shortcutModePage = await newRoomConfigPage();
      const shortcutModeUrl = base + '/fixture-home/home?configuration&shortcut-no-details';
      await shortcutModePage.goto(shortcutModeUrl + '#device/studio/switch.demo_heater');
      const switchDetails = shortcutModePage.getByRole('dialog', { name: 'Room heater', exact: true });
      await switchDetails.waitFor();
      await shortcutModePage.keyboard.press('Escape');
      await switchDetails.waitFor({ state: 'hidden' });
      const toggle = shortcutModePage.locator('.room[data-room="studio"] .quick-button[data-entity="switch.demo_heater"]');
      const alternate = shortcutModePage.locator('.room[data-room="bayit_room_den"] .quick-button[data-entity="switch.demo_heater"]');
      await toggle.waitFor();
      assert.equal(await toggle.getAttribute('aria-haspopup'), null);
      assert.equal(await toggle.getAttribute('aria-keyshortcuts'), null);
      assert.equal(await alternate.getAttribute('aria-haspopup'), 'dialog');
      const powerCalls = () => shortcutModePage.evaluate(() => window.bayitTest.calls.filter(request => request.domain === 'switch'));
      assert.deepEqual(await powerCalls(), [], 'Opening and closing the details link does not toggle the switch');
      await toggle.evaluate(async button => {
        button.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 12, pointerType: 'touch', isPrimary: true }));
        await new Promise(resolve => setTimeout(resolve, 530));
        button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true,
          pointerId: 12, pointerType: 'touch', isPrimary: true }));
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      });
      assert.deepEqual(await powerCalls(), [], 'A pointer hold never toggles the switch');
      await toggle.evaluate(button => {
        button.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 13, pointerType: 'touch', isPrimary: true }));
        const releaseAt = performance.now() + 530;
        // Keep the hold timeout queued until after the pointer release.
        while (performance.now() < releaseAt) { /* wait for the simulated hold */ }
        button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true,
          pointerId: 13, pointerType: 'touch', isPrimary: true }));
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      });
      assert.deepEqual(await powerCalls(), [], 'A delayed hold timer never turns the release into a tap');
      await toggle.press('Shift+Enter');
      assert.deepEqual(await powerCalls(), [], 'Shift+Enter never toggles the switch');
      await toggle.press('Shift+Space');
      assert.deepEqual(await powerCalls(), [], 'Shift+Space never toggles the switch');
      await toggle.evaluate(button => {
        const key = { key: ' ', code: 'Space', shiftKey: true, bubbles: true, composed: true, cancelable: true };
        button.dispatchEvent(new KeyboardEvent('keydown', key));
        button.dispatchEvent(new KeyboardEvent('keyup', key));
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      assert.deepEqual(await powerCalls(), [], 'A synthesized click after a details key is consumed');
      await toggle.evaluate(button => button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })));
      assert.deepEqual(await powerCalls(), [], 'An unpaired pointer click cannot toggle the switch');
      assert.equal(await switchDetails.count(), 0);
      await toggle.tap();
      await shortcutModePage.waitForFunction(() => window.bayitTest.calls.some(request => request.domain === 'switch'));
      assert.deepEqual(await powerCalls(), [{ type:'call_service', domain:'switch', service:'turn_on',
        service_data:{}, target:{entity_id:'switch.demo_heater'} }]);
      await toggle.press('Enter');
      await shortcutModePage.waitForFunction(() => window.bayitTest.calls.some(request => request.service === 'turn_off'));
      assert.deepEqual((await powerCalls()).at(-1), { type:'call_service', domain:'switch', service:'turn_off',
        service_data:{}, target:{entity_id:'switch.demo_heater'} });
      await alternate.press('Shift+Enter');
      await switchDetails.waitFor();
      assert.equal(new URL(shortcutModePage.url()).hash, '#device/bayit_room_den/switch.demo_heater');
      await shortcutModePage.keyboard.press('Escape');
      await switchDetails.waitFor({ state: 'hidden' });

      assert.equal((await powerCalls()).length, 2);
      const shortcutSetup = await openRoomEditor(shortcutModePage);
      await shortcutSetup.getByText('Room shortcuts', { exact: true }).tap();
      await shortcutSetup.locator('[data-shortcut-room]').selectOption('studio');
      const opensDetails = shortcutSetup.getByLabel('Open details with a long press · Room heater', { exact: true });
      assert.equal(await opensDetails.isChecked(), false);
      await opensDetails.check();
      await Promise.all([shortcutModePage.waitForEvent('load'), saveRoomConfig(shortcutSetup)]);
      await shortcutModePage.waitForFunction(() => Boolean(window.bayitTest));
      const savedShortcut = await shortcutModePage.evaluate(() => {
        const { room_overrides, room_shortcuts } = JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy;
        return { hidden: room_overrides.studio.panel_hidden_entities, suppressed: !!room_overrides.studio.shortcut_no_details,
          roomShortcuts: room_shortcuts.studio };
      });
      assert.deepEqual(savedShortcut, { hidden: ['switch.demo_heater'], suppressed: false, roomShortcuts: ['switch.demo_heater'] });
      const afterSave = await powerCalls();
      await toggle.press('Shift+Enter');
      await switchDetails.waitFor();
      assert.equal(new URL(shortcutModePage.url()).hash, '#device/studio/switch.demo_heater');
      assert.deepEqual(await powerCalls(), afterSave);
      await shortcutModePage.close();
      console.log(engine + ' 320: optional switch shortcut tap, suppressed hold and keyboard, preserved deep link and editor');

      const detailTargetPage = await newRoomConfigPage();
      const detailTargetUrl = base + '/fixture-home/home?configuration&shortcut-detail-target';
      const detailTarget = detailTargetPage.getByRole('dialog', { name: 'Desk dimmer', exact: true });
      const sourceDetails = detailTargetPage.getByRole('dialog', { name: 'Desk lamp', exact: true });
      const studioShortcut = detailTargetPage.locator('.room[data-room="studio"] .quick-button[data-entity="light.demo_lamp"]');
      const denShortcut = detailTargetPage.locator('.room[data-room="bayit_room_den"] .quick-button[data-entity="light.demo_lamp"]');
      const detailWrites = () => detailTargetPage.evaluate(() => window.bayitTest.calls.filter(request => request.domain));
      const closeDetails = async dialog => {
        await detailTargetPage.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
      };
      await detailTargetPage.goto(detailTargetUrl + '#fixture-linked-dimmer');
      await detailTarget.waitFor();
      assert.equal(await detailTarget.getByRole('slider', { name: 'Brightness', exact: true }).count(), 1);
      await closeDetails(detailTarget);
      await studioShortcut.press('Shift+Enter');
      await detailTarget.waitFor();
      assert.equal(new URL(detailTargetPage.url()).hash, '#device/studio/light.demo_dimmer');
      assert.equal(await studioShortcut.getAttribute('data-popup-origin'), '');
      await detailTarget.getByRole('button', { name: 'More info', exact: true }).tap();
      assert.deepEqual(await detailTargetPage.evaluate(() => window.bayitTest.moreInfoCalls), ['light.demo_dimmer']);
      await closeDetails(detailTarget);

      await studioShortcut.evaluate(async button => {
        const pointer = { button: 0, pointerId: 25, pointerType: 'touch', isPrimary: true, bubbles: true, composed: true };
        button.dispatchEvent(new PointerEvent('pointerdown', pointer));
        await new Promise(resolve => setTimeout(resolve, 540));
        button.dispatchEvent(new PointerEvent('pointerup', pointer));
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      });
      await detailTarget.waitFor();
      await closeDetails(detailTarget);
      await denShortcut.press('Shift+Enter');
      await sourceDetails.waitFor();
      assert.equal(new URL(detailTargetPage.url()).hash, '#device/bayit_room_den/light.demo_lamp');
      await closeDetails(sourceDetails);
      assert.deepEqual(await detailWrites(), []);

      await studioShortcut.tap();
      await detailTargetPage.waitForFunction(() => window.bayitTest.calls.some(request => request.domain === 'light'));
      assert.deepEqual(await detailWrites(), [{ type: 'call_service', domain: 'light', service: 'turn_on',
        service_data: {}, target: { entity_id: 'light.demo_lamp' } }]);
      assert.equal(await detailTarget.count(), 0);

      const detailSetup = await openRoomEditor(detailTargetPage);
      await detailSetup.getByText('Room shortcuts', { exact: true }).tap();
      await detailSetup.locator('[data-shortcut-room]').selectOption('studio');
      const picker = detailSetup.getByLabel('Long-press destination · Desk lamp', { exact: true });
      assert.equal(await picker.inputValue(), 'light.demo_dimmer');
      assert.deepEqual(await picker.locator('option').evaluateAll(options => options.map(option => option.value)),
        ['', 'native', 'light.demo_dimmer', 'switch.demo_heater']);
      await picker.selectOption('switch.demo_heater');
      await Promise.all([detailTargetPage.waitForEvent('load'), saveRoomConfig(detailSetup)]);
      await detailTargetPage.waitForFunction(() => Boolean(window.bayitTest));
      assert.deepEqual(await detailTargetPage.evaluate(() =>
        JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.room_overrides.studio.shortcut_detail_entities),
        { 'light.demo_lamp': 'switch.demo_heater' });
      await studioShortcut.press('Shift+Enter');
      const heaterDetails = detailTargetPage.getByRole('dialog', { name: 'Room heater', exact: true });
      await heaterDetails.waitFor();
      assert.equal(new URL(detailTargetPage.url()).hash, '#device/studio/switch.demo_heater');
      await closeDetails(heaterDetails);
      const membershipSetup = await openRoomEditor(detailTargetPage);
      await membershipSetup.getByLabel('Room to customize', { exact: true }).selectOption('studio');
      await membershipSetup.getByRole('button', { name: 'Remove · Room heater', exact: true }).tap();
      await Promise.all([detailTargetPage.waitForEvent('load'), saveRoomConfig(membershipSetup)]);
      await detailTargetPage.waitForFunction(() => Boolean(window.bayitTest));
      assert.equal(await detailTargetPage.evaluate(() =>
        JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.room_overrides.studio.shortcut_detail_entities),
        undefined);
      await studioShortcut.press('Shift+Enter');
      await sourceDetails.waitFor();
      assert.deepEqual(await detailWrites(), []);
      await detailTargetPage.close();
      console.log(engine + ' 320: room-scoped alternate shortcut details, unchanged tap, hold, native details and editor persistence');

      const panelPage = await newRoomConfigPage();
      const panelUrl = base + '/fixture-home/home?configuration&room-panel-visibility';
      await panelPage.goto(panelUrl + '#device/studio/light.demo_lamp');
      const directLamp = panelPage.getByRole('dialog', { name: 'Desk lamp', exact: true });
      await directLamp.waitFor();
      await panelPage.keyboard.press('Escape');
      await directLamp.waitFor({ state: 'hidden' });

      const studioButton = panelPage.getByRole('button', { name: 'Studio', exact: true });
      const studioPanel = panelPage.getByRole('dialog', { name: 'Studio', exact: true });
      await studioButton.tap();
      await studioPanel.getByText('No devices in this room.', { exact: true }).waitFor();
      assert.equal(await studioPanel.getByRole('heading', { name: 'Table lamps' }).count(), 0);
      assert.equal(await studioPanel.locator('[data-entity]').count(), 0);
      await panelPage.keyboard.press('Escape');
      await studioPanel.waitFor({ state: 'hidden' });

      await panelPage.getByRole('button', { name: 'Den', exact: true }).tap();
      const other = panelPage.getByRole('dialog', { name: 'Den', exact: true });
      await other.getByRole('button', { name: 'Desk lamp · Turn on', exact: true }).waitFor();
      await other.evaluate(dialog => {
        window.fixtureDismissalCleanup = new Promise(resolve => {
          const observer = new MutationObserver(() => {
            if (dialog.open) return;
            observer.disconnect();
            resolve(!dialog.hasAttribute('data-kind') && !dialog.hasAttribute('data-closing'));
          });
          observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
        });
      });
      await panelPage.keyboard.press('Escape');
      assert.equal(await panelPage.evaluate(() => window.fixtureDismissalCleanup), true,
        'Closed dialogs must release their previous origin and focus in the same transition');
      await other.waitFor({ state: 'hidden' });

      const shortcut = panelPage.locator('.room[data-room="studio"] .quick-button[data-entity="light.demo_lamp"]');
      await shortcut.press('Shift+Enter');
      await directLamp.waitFor();
      assert.equal(new URL(panelPage.url()).hash, '#device/studio/light.demo_lamp');
      await panelPage.keyboard.press('Escape');
      await directLamp.waitFor({ state: 'hidden' });
      await shortcut.tap();
      assert.deepEqual(await panelPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain)
        .map(call => [call.domain, call.service, call.target.entity_id])), [['light', 'turn_on', 'light.demo_lamp']]);

      const displaySetup = await openRoomEditor(panelPage);
      await displaySetup.getByLabel('Room to customize', { exact: true }).selectOption('studio');
      await displaySetup.getByText('Device display', { exact: true }).tap();
      const displayDevice = displaySetup.getByLabel('Device to customize', { exact: true });
      const showDevice = displaySetup.getByLabel('Show device in room panel', { exact: true });
      await displayDevice.selectOption('light.demo_lamp');
      assert.equal(await showDevice.isChecked(), false);
      await showDevice.check();
      assert.equal(await showDevice.evaluate(control => control.getRootNode().activeElement === control), true);
      await saveRoomConfig(displaySetup);
      await studioButton.tap();
      await studioPanel.getByRole('heading', { name: 'Table lamps' }).waitFor();
      await studioPanel.locator('[data-entity="light.demo_lamp"]').waitFor();
      assert.equal(await studioPanel.locator('[data-entity="switch.demo_heater"]').count(), 0);
      assert.deepEqual(await panelPage.evaluate(() => {
        const { room_overrides, room_shortcuts } = JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy;
        return { hidden: room_overrides.studio.panel_hidden_entities, shortcuts: room_shortcuts.studio };
      }), { hidden: ['switch.demo_heater'], shortcuts: ['light.demo_lamp'] });
      await panelPage.close();
      console.log(engine + ' 320: room-only panel exclusions, retained shortcuts and direct links, and editor persistence');

      await assertDualLightDetails(browser);
      await assertCompactLightReadings(browser);
      const inlinePage = await newRoomConfigPage();
      const inlineUrl = base + '/fixture-home/home?configuration&inline-room-lights';
      await inlinePage.goto(inlineUrl);
      const inlineStudio = inlinePage.getByRole('button', { name: 'Studio', exact: true });
      await inlineStudio.tap();
      const inlineRoom = inlinePage.getByRole('dialog', { name: 'Studio', exact: true });
      const inlineCard = inlineRoom.locator('[data-inline-light]');
      await inlineCard.waitFor();
      assert.equal(await inlineCard.count(), 1);
      const brighter = inlineCard.getByRole('slider', { name: 'Brightness', exact: true });
      const warmer = inlineCard.getByRole('slider', { name: 'White temperature', exact: true });
      const inlineMode = inlineCard.getByRole('button', { name: 'White temperature', exact: true });
      assert.equal(await brighter.inputValue(), '40');
      assert.equal(await warmer.count(), 0);
      assert.equal(await inlineCard.locator('output:visible').getAttribute('dir'), 'ltr');
      assert.ok(await inlineCard.evaluate(card => card.scrollWidth <= card.clientWidth));
      assert.ok(await brighter.evaluate(slider => slider.offsetHeight >= 44));
      assert.equal(await inlineCard.getByRole('button', { name: /^Apply/ }).count(), 0);
      await brighter.press('ArrowRight');
      await inlinePage.waitForFunction(() => window.bayitTest.calls.length >= 1);
      await inlineMode.press('Enter');
      assert.equal(await inlineMode.getAttribute('aria-pressed'), 'true');
      assert.equal(await brighter.count(), 0);
      assert.equal(await warmer.inputValue(), '3000');
      await inlinePage.evaluate(() => window.bayitTest.setFixtureAttributes('light.demo_lamp', { color_temp_kelvin: 3100 }));
      await inlineCard.getByText('3100 K', { exact: true }).waitFor();
      assert.equal(await inlineMode.getAttribute('aria-pressed'), 'true');
      assert.equal(await warmer.inputValue(), '3100');
      assert.equal(await inlinePage.evaluate(() => window.bayitTest.calls.length), 1);
      await inlineCard.locator('input[data-action="set_color_temp_kelvin"]:not(:disabled)').waitFor();
      await warmer.press('ArrowRight');
      await inlinePage.waitForFunction(() => window.bayitTest.calls.length >= 2);
      assert.deepEqual(await inlinePage.evaluate(() => window.bayitTest.calls.map(call =>
        [call.domain, call.service, call.target.entity_id, call.service_data])), [
        ['light', 'turn_on', 'light.demo_lamp', { brightness_pct: 41 }],
        ['light', 'turn_on', 'light.demo_lamp', { color_temp_kelvin: 3101 }],
      ]);
      await inlinePage.evaluate(() => window.bayitTest.setLightModes('light.demo_lamp', ['color_temp', 'rgb']));
      await inlineMode.waitFor({ state: 'hidden' });
      assert.equal(await inlineCard.getByRole('slider').count(), 2);
      await inlinePage.evaluate(() => window.bayitTest.setLightModes('light.demo_lamp', ['color_temp']));
      await inlineMode.waitFor();
      assert.equal(await inlineMode.getAttribute('aria-pressed'), 'true');
      assert.equal(await warmer.inputValue(), '3101');
      await inlineMode.press('Enter');
      await inlineCard.locator('input[data-action="set_brightness"]:not(:disabled)').waitFor();
      await inlinePage.evaluate(() => window.bayitTest.rejectNextInlineLight());
      await brighter.press('ArrowRight');
      await inlineRoom.getByText('Could not complete the action.', { exact: true }).waitFor();
      await inlineCard.locator('input[data-action="set_brightness"]:not(:disabled)').waitFor();
      assert.equal(await brighter.inputValue(), '41', 'A rejected change returns to the reported brightness');
      const roomPower = inlineCard.getByRole('button', { name: 'Desk lamp · Turn off', exact: true });
      const idleTile = inlineCard.locator('.device-tile[aria-busy="false"]');
      await roomPower.and(idleTile).tap();
      await inlineCard.getByRole('button', { name: 'Desk lamp · Turn on', exact: true }).and(idleTile).tap();
      await roomPower.and(idleTile).waitFor();
      await roomPower.press('Shift+Enter');
      const inlineDetail = inlinePage.getByRole('dialog', { name: 'Desk lamp', exact: true });
      const detailBrightness = inlineDetail.getByRole('slider', { name: 'Brightness', exact: true });
      const detailTemperature = inlineDetail.getByRole('slider', { name: 'White temperature', exact: true });
      const temperatureMode = inlineDetail.getByRole('button', { name: 'White temperature', exact: true });
      await detailBrightness.waitFor();
      await inlineDetail.evaluate(async modal => {
        await Promise.allSettled(modal.getAnimations().map(animation => animation.finished));
      });
      assert.equal(await inlineDetail.getByRole('button', { name: /^Apply/ }).count(), 0);
      assert.equal(await detailTemperature.count(), 0);
      assert.equal(await detailBrightness.inputValue(), '41');
      assert.ok((await detailBrightness.boundingBox()).height >= 44);
      assert.ok((await temperatureMode.boundingBox()).height >= 44);
      assert.ok(await inlineDetail.locator('.modal-body').evaluate(body => body.scrollHeight === body.clientHeight));
      await inlineDetail.getByRole('button', { name: 'More info', exact: true }).press('Enter');
      assert.deepEqual(await inlinePage.evaluate(() => window.bayitTest.moreInfoCalls), ['light.demo_lamp']);
      const beforeDetailCalls = await inlinePage.evaluate(() => window.bayitTest.calls.length);
      await temperatureMode.press('Enter');
      assert.equal(await temperatureMode.getAttribute('aria-pressed'), 'true');
      assert.equal(await detailBrightness.count(), 0);
      assert.equal(await detailTemperature.inputValue(), '3101');
      assert.equal(await inlinePage.evaluate(() => window.bayitTest.calls.length), beforeDetailCalls);
      await detailTemperature.press('ArrowRight');
      await inlinePage.waitForFunction(count => window.bayitTest.calls.length === count + 1, beforeDetailCalls);
      await inlineDetail.getByRole('button', { name: 'Turn off', exact: true }).press('Enter');
      await inlineDetail.getByRole('button', { name: 'Turn on', exact: true }).press('Enter');
      await inlineDetail.getByRole('button', { name: 'Turn off', exact: true }).waitFor();
      assert.deepEqual(await inlinePage.evaluate(from => window.bayitTest.calls.slice(from).map(call =>
        [call.domain, call.service, call.target.entity_id, call.service_data ?? {}]), beforeDetailCalls), [
        ['light', 'turn_on', 'light.demo_lamp', { color_temp_kelvin: 3102 }],
        ['light', 'turn_off', 'light.demo_lamp', {}],
        ['light', 'turn_on', 'light.demo_lamp', {}],
      ]);
      await inlinePage.evaluate(() => window.bayitTest.setLightModes('light.demo_lamp', ['color_temp', 'rgb']));
      await inlineDetail.getByRole('button', { name: 'Apply · Brightness', exact: true }).waitFor();
      assert.equal(await inlineDetail.locator('.compact-light-controls').count(), 0);
      await inlinePage.evaluate(() => window.bayitTest.setLightModes('light.demo_lamp', ['color_temp']));
      await inlinePage.keyboard.press('Escape');
      await inlinePage.locator('dialog.modal[data-kind]').waitFor({ state: 'detached' });
      await inlinePage.getByRole('button', { name: 'Den', exact: true }).tap();
      const inlineOther = inlinePage.getByRole('dialog', { name: 'Den', exact: true });
      await inlineOther.getByRole('button', { name: 'Desk lamp · Turn off', exact: true }).waitFor();
      assert.equal(await inlineOther.getByRole('slider').count(), 0);
      await inlineOther.getByRole('button', { name: 'Desk lamp · Turn off', exact: true }).press('Shift+Enter');
      await inlineDetail.getByRole('button', { name: 'Apply · Brightness', exact: true }).waitFor();
      assert.equal(await inlineDetail.locator('.compact-light-controls').count(), 0);
      await inlinePage.keyboard.press('Escape');
      await inlinePage.locator('dialog.modal[data-kind]').waitFor({ state: 'detached' });
      const inlineEditor = await openRoomEditor(inlinePage);
      await inlineEditor.getByLabel('Room to customize', { exact: true }).selectOption('studio');
      await inlineEditor.getByText('Device display', { exact: true }).tap();
      await inlineEditor.getByLabel('Device to customize', { exact: true }).selectOption('light.demo_lamp');
      const inlineOption = inlineEditor.getByRole('checkbox', { name: 'Show brightness and temperature in this room', exact: true });
      assert.equal(await inlineOption.isChecked(), true);
      await inlineOption.uncheck();
      await Promise.all([
        inlinePage.waitForEvent('load'),
        inlineEditor.getByRole('button', { name: 'Save dashboard', exact: true }).tap(),
      ]);
      await inlineStudio.waitFor();
      assert.equal(await inlinePage.evaluate(() => JSON.parse(sessionStorage.getItem('bayit9-browser-fixture'))
        .strategy.room_overrides.studio.inline_light_entities?.includes('light.demo_lamp')), false);
      await inlinePage.close();
      console.log(engine + ': inline room light controls, native commands, isolation, and editor');

      const lastRoomPage = await newRoomConfigPage();
      await lastRoomPage.goto(roomConfigUrl + '&sole-room');
      await lastRoomPage.getByRole('button', { name: 'Reading nook', exact: true }).waitFor();
      assert.deepEqual(await roomOrder(lastRoomPage), ['bayit_room_only']);
      roomSetup = await openRoomEditor(lastRoomPage);
      await roomSetup.getByRole('button', { name: 'Delete dashboard room', exact: true }).tap();
      assert.equal(await roomMode(roomSetup).inputValue(), 'custom');
      await saveRoomConfig(roomSetup);
      await lastRoomPage.getByText('No rooms have been added.', { exact: true }).waitFor();
      assert.deepEqual(await selectionSettings(lastRoomPage), { area_ids: [], room_selection: 'manual' });
      roomSetup = await openRoomEditor(lastRoomPage);
      await roomSetup.getByLabel('Available rooms', { exact: true }).selectOption('studio');
      await roomSetup.getByRole('button', { name: 'Show room', exact: true }).tap();
      await roomSetup.getByRole('button', { name: 'Hide room · Studio', exact: true }).press('Enter');
      assert.equal(await roomMode(roomSetup).evaluate(control => control.getRootNode().activeElement === control), true);
      await roomMode(roomSetup).selectOption('auto');
      await saveRoomConfig(roomSetup);
      await lastRoomPage.getByRole('button', { name: 'Studio', exact: true }).waitFor();
      assert.deepEqual(await roomOrder(lastRoomPage), ['lounge', 'studio']);
      await lastRoomPage.close();
      console.log(engine + ' 320: explicit empty room selection, keyboard order, and member behavior');

      for (const empty of [false, true]) {
        const membershipPage = await newRoomConfigPage();
        const roomCase = empty ? '&empty-source-room' : '&legacy-room-order';
        await membershipPage.goto(roomConfigUrl + '&cross-area-room-device' + roomCase);
        const before = membershipPage.locator('.room[data-room="studio"]');
        const movedLamp = membershipPage.locator('.room[data-room="lounge"] [data-entity="light.demo_lamp"]');
        await movedLamp.waitFor();
        assert.equal(await before.count(), empty ? 0 : 1);
        assert.equal(await before.locator('[data-entity="light.demo_lamp"]').count(), 0);

        const membershipSetup = await openRoomEditor(membershipPage);
        const currentRoom = membershipSetup.getByLabel('Room to customize', { exact: true });
        await currentRoom.selectOption('studio');
        const deviceMode = membershipSetup.getByLabel('Devices in this room', { exact: true });
        assert.equal(await deviceMode.inputValue(), 'auto');
        await deviceMode.evaluate(control => control.scrollIntoView({ block: 'center' }));
        const previousTop = (await deviceMode.boundingBox()).y;
        await deviceMode.selectOption('manual');
        const deviceSearch = membershipSetup.getByRole('searchbox', { name: 'Find a device to add', exact: true });
        const devicePicker = membershipSetup.getByLabel('Available devices', { exact: true });
        const modalBody = await membershipSetup.locator('.modal-body').boundingBox();
        const modeBounds = await deviceMode.boundingBox();
        const searchBounds = await deviceSearch.boundingBox();
        const pickerBounds = await devicePicker.boundingBox();
        assert.ok(Math.abs(modeBounds.y - previousTop) <= 2, 'Changing membership should preserve the room editor scroll position');
        assert.ok(searchBounds.y - modeBounds.y - modeBounds.height < 50, 'Device search should follow the membership mode');
        assert.ok(pickerBounds.y + pickerBounds.height < modalBody.y + modalBody.height, 'The device picker should be reachable without more scrolling');
        assert.equal(await deviceMode.evaluate(control => control.getRootNode().activeElement === control), true);
        const removal = membershipSetup.getByRole('button', { name: 'Remove · Room heater', exact: true });
        assert.equal(await removal.count(), empty ? 0 : 1);
        assert.equal(await membershipSetup.getByRole('button', { name: 'Remove · Desk lamp', exact: true }).count(), 0);
        if (empty) await membershipSetup.getByText('No devices selected.', { exact: true }).waitFor();
        await deviceMode.selectOption('auto');
        const roomsDisclosure = membershipSetup.getByText('Rooms', { exact: true });
        await roomsDisclosure.tap();
        await currentRoom.waitFor({ state: 'hidden' });
        await roomsDisclosure.tap();
        assert.equal(await currentRoom.inputValue(), 'studio');
        assert.equal(await deviceMode.inputValue(), 'auto');
        await deviceMode.selectOption('manual');
        assert.equal(await removal.count(), empty ? 0 : 1);
        assert.equal(await membershipSetup.getByRole('button', { name: 'Remove · Desk lamp', exact: true }).count(), 0);
        if (!empty) {
          const placement = membershipSetup.locator('.room-add-hint');
          await devicePicker.selectOption('light.demo_lamp');
          assert.equal(await placement.textContent(), 'After saving, the device will also appear here and stay in Lounge.');
          await deviceSearch.fill('Lounge');
          assert.equal(await placement.textContent(), '');
          assert.deepEqual(await devicePicker.locator('option').evaluateAll(options => options.map(option => option.value)), ['', 'light.demo_lounge']);
          await devicePicker.selectOption('light.demo_lounge');
          assert.equal(await placement.textContent(), '');
          await membershipSetup.getByRole('button', { name: 'Add device', exact: true }).tap();
          assert.equal(await deviceSearch.inputValue(), 'Lounge');
          assert.equal(await deviceSearch.evaluate(control => control.getRootNode().activeElement === control), true);
          const removeLounge = membershipSetup.getByRole('button', { name: 'Remove · Lounge lamp', exact: true });
          await removeLounge.press('Enter');
          assert.equal(await removal.evaluate(control => control.getRootNode().activeElement === control), true);
          await devicePicker.selectOption('light.demo_lounge');
          await membershipSetup.getByRole('button', { name: 'Add device', exact: true }).tap();
        }

        await saveRoomConfig(membershipSetup);
        await before.waitFor();
        assert.equal(await before.locator('[data-entity="light.demo_lamp"]').count(), 0);
        assert.equal(await before.locator('[data-entity="light.demo_lounge"]').count(), empty ? 0 : 1);
        assert.equal(await movedLamp.count(), 1);
        assert.equal(await membershipPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
        assert.deepEqual(await membershipPage.evaluate(() =>
          JSON.parse(sessionStorage.getItem('bayit9-browser-fixture')).strategy.room_overrides), {
          lounge: { entities: ['light.demo_lamp'] },
          studio: { entities: empty ? [] : ['switch.demo_heater', 'light.demo_lounge'] },
        });
        await membershipPage.close();
      }
      console.log(engine + ' 320: automatic device membership preserves existing cross-area placement when edited and reopened');

      for (const [locale, words] of [
        ['en', { appearance: 'Appearance', setup: 'Customize home', rooms: 'Rooms', room: 'Room to customize',
          devices: 'Devices in this room', picker: 'Available devices', add: 'Add device', save: 'Save dashboard',
          hint: 'After saving, the device will move from Lounge to this room on the dashboard. The previous room will be hidden while empty.' }],
        ['he', { appearance: 'מראה', setup: 'התאמת הבית', rooms: 'חדרים', room: 'חדר להתאמה אישית',
          devices: 'מכשירים בחדר', picker: 'מכשירים זמינים', add: 'הוספת מכשיר', save: 'שמירת הדשבורד',
          hint: 'לאחר השמירה המכשיר יעבור בדשבורד מחדר Lounge לחדר הזה. החדר הקודם יוסתר כל עוד הוא ריק.' }],
      ]) {
        const placementPage = await newRoomConfigPage();
        await placementPage.goto(roomConfigUrl + '&locale=' + locale);
        const source = placementPage.locator('.room[data-room="lounge"]');
        const moved = placementPage.locator('.room[data-room="studio"] [data-entity="light.demo_lounge"]');
        await source.locator('[data-entity="light.demo_lounge"]').waitFor();
        await placementPage.getByRole('button', { name: words.appearance, exact: true }).tap();
        await placementPage.getByRole('button', { name: words.setup, exact: true }).tap();
        const setup = placementPage.getByRole('dialog', { name: words.setup, exact: true });
        await setup.getByText(words.rooms, { exact: true }).tap();
        await setup.getByLabel(words.room, { exact: true }).selectOption('studio');
        await setup.getByLabel(words.devices, { exact: true }).selectOption('manual');
        await setup.getByLabel(words.picker, { exact: true }).selectOption('light.demo_lounge');
        const hint = setup.getByText(words.hint, { exact: true });
        assert.equal(await hint.getAttribute('role'), 'status');
        const add = setup.getByRole('button', { name: words.add, exact: true });
        assert.equal(await add.getAttribute('aria-describedby'), await hint.getAttribute('id'));
        await add.tap();
        assert.equal(await source.locator('[data-entity="light.demo_lounge"]').count(), 1);
        assert.equal(await moved.count(), 0);
        assert.equal(await placementPage.evaluate(() => window.bayitTest.calls.filter(call =>
          call.domain || call.type === 'lovelace/config/save').length), 0);
        await setup.getByRole('button', { name: words.save, exact: true }).tap();
        await setup.waitFor({ state: 'hidden' });
        await moved.waitFor();
        assert.equal(await source.count(), 0);
        assert.equal(await placementPage.evaluate(() => window.bayitTest.calls.filter(call => call.domain).length), 0);
        await placementPage.close();
      }
      console.log(engine + ' 320: device placement preview reflects automatic moves and stays local until saved');
      await assertRoomMirrorPlacement(browser);
      console.log(engine + ' 320: optional mirrored room placement, saved reload and native registry unchanged');
      await assertPopupAliasEditing(browser);
      await assertWeatherSurvivesRegistryReplay(browser);
      await assertToolbarPressAcrossReplacement(browser);
      console.log(engine + ' 320: editable popup links, preserved legacy routes and same-dashboard URL reopen');

      const emptyPage = await browser.newPage();
      await emptyPage.goto(base + '?empty');
      await emptyPage.getByText('No rooms have been added.', { exact: true }).waitFor();
      await emptyPage.close();
      console.log(engine + ': visual profile editor, locale changes and no-device installation');
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
  await once(server, 'close');
}
