import { styles } from './bayit-dashboard-style.js';
import { languages } from './bayit-dashboard-i18n.js';
import { MAX_ROOM_SHORTCUTS, STRATEGY_NAME } from './strategy-model.js';
import { loadConfiguration, saveConfiguration } from './dashboard-configuration.js';
import { createDeviceController, getDeviceModel } from './device-control.mjs';
import { bindDeviceDetails, createPopupMotion } from './popup-motion.js';
import { buildPanelControls, panelControlStyles } from './panel-controls.js';
import { lightColorHex, parseLightColor } from './light-color.mjs';
import { createNativeCards, createToolbarPanel, sensorGraphConfig, toolbarPanelStyles } from './toolbar-panels.js';
import { normalizeOrefMap } from './oref-alert-map.js';
import { normalizeVacuumMap } from './vacuum-map.js';
import { createWallpaperController, createWallpaperGallery, personalWallpaperId, wallpaperChoices, wallpaperStyles } from './wallpapers.js';
import { createPageChrome } from './page-chrome.js';
import { openBoilerHistory, boilerHistoryStyles } from './boiler-history.js';
import { createBoilerSchedulePanel, isBoilerScheduleProfile } from './boiler-schedule.js';

export const backgrounds = Object.freeze(Object.keys(wallpaperChoices));
const options = { background: backgrounds, shape: ['soft', 'circle', 'square'], layout: ['classic', 'header'] };
const iconPattern = /^mdi:[a-z0-9-]+$/;
const entityPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const controlIcons = {
  turn_on: 'mdi:power-on', turn_off: 'mdi:power-off', open: 'mdi:arrow-up', close: 'mdi:arrow-down',
  stop: 'mdi:stop', lock: 'mdi:lock-outline', unlock: 'mdi:lock-open-variant-outline',
  start_timed: 'mdi:timer-play-outline', stop_timed: 'mdi:timer-stop-outline',
  media_play: 'mdi:play', media_pause: 'mdi:pause', media_stop: 'mdi:stop',
  media_previous_track: 'mdi:skip-previous', media_next_track: 'mdi:skip-next', volume_up: 'mdi:volume-plus',
  volume_down: 'mdi:volume-minus', mute: 'mdi:volume-off', unmute: 'mdi:volume-high',
  vacuum_start: 'mdi:play', vacuum_pause: 'mdi:pause', vacuum_stop: 'mdi:stop', return_to_base: 'mdi:home-map-marker',
  locate: 'mdi:map-marker-radius-outline', press_button: 'mdi:gesture-tap-button', run_script: 'mdi:play',
};
const deviceIcons = {
  light:'mdi:lightbulb-outline', switch:'mdi:toggle-switch-outline', fan:'mdi:fan',
  cover:'mdi:blinds', climate:'mdi:thermostat', lock:'mdi:lock-outline',
  heater:'mdi:radiator', boiler:'mdi:water-boiler', water_heater:'mdi:water-boiler',
  sensor:'mdi:gauge', binary_sensor:'mdi:motion-sensor', calendar:'mdi:calendar-outline',
  alarm_control_panel:'mdi:shield-home-outline', weather:'mdi:weather-partly-cloudy',
  person:'mdi:account-outline', vacuum:'mdi:robot-vacuum', camera:'mdi:cctv', media_player:'mdi:speaker',
};
const contextKeys = ['automations', 'security', 'presence', 'weather', 'energy', 'media', 'vacuum', 'calendar', 'sensors', 'devices'];
const automaticToolbarContext = contextKeys.slice(0, 5);
const toolbarIcons = {
  activity: 'mdi:home-automation', automations: 'mdi:home-automation', security: 'mdi:shield-home-outline',
  presence: 'mdi:account-group-outline', weather: 'mdi:weather-partly-cloudy', energy: 'mdi:meter-electric-outline',
  overview: 'mdi:view-dashboard-outline', settings: 'mdi:cog-outline', link: 'mdi:arrow-top-right',
  media: 'mdi:play-box-multiple-outline', vacuum: 'mdi:robot-vacuum', calendar: 'mdi:calendar-month-outline', sensors: 'mdi:chart-line',
  devices: 'mdi:devices',
};
const shortcutDomains = new Set(['light', 'switch', 'fan', 'cover', 'lock', 'climate', 'water_heater']);
const powerDomains = new Set(['light', 'switch', 'fan', 'climate', 'water_heater']);
const roomSectionKinds = new Set(['lights', 'covers', 'climate', 'heating', 'sensors', 'devices', 'garage', 'weather', 'security', 'media', 'vacuum', 'laundry']);
const localPath = /^\/(?!\/)[a-z0-9][a-z0-9/_-]*(?:#[a-z0-9_-]+)?$/i;
const deviceGroups = {
  light: 'room_lights', cover: 'room_covers', climate: 'room_climate',
  fan: 'room_climate', water_heater: 'room_climate', lock: 'room_security',
  alarm_control_panel: 'room_security', camera: 'room_security',
  sensor: 'room_sensors', binary_sensor: 'room_sensors', weather: 'room_sensors',
};
const domainFor = config => config.entity.split('.')[0];
const isTemperatureSensor = (domain, attributes) => domain === 'sensor' &&
  (attributes?.device_class === 'temperature' || /^(?:°C|°F)$/i.test(attributes?.unit_of_measurement ?? ''));
const movement = new Set(['open','close','set_position']);
const rangeActions = new Set(['set_position', 'set_brightness', 'set_color_temp_kelvin', 'set_percentage', 'volume_set']);
const stateKeys = {
  set_position: 'current_position', set_percentage: 'percentage', set_brightness: 'brightness',
  set_color_temp_kelvin: 'color_temp_kelvin', set_effect: 'effect',
  set_temperature: 'temperature', set_fan_mode: 'fan_mode', set_preset_mode: 'preset_mode',
  set_operation_mode: 'operation_mode', set_swing_mode: 'swing_mode', select_source: 'source', set_fan_speed: 'fan_speed',
};
const actionsInOrder = ['turn_on', 'turn_off', 'open', 'stop', 'close', 'lock', 'unlock',
  'set_position', 'set_brightness', 'set_color_temp_kelvin', 'set_light_color', 'set_effect',
  'set_percentage', 'set_hvac_mode', 'set_temperature',
  'set_temperature_range', 'set_fan_mode', 'set_swing_mode', 'set_preset_mode', 'set_operation_mode', 'set_heating_level',
  'start_timed', 'extend_timed', 'stop_timed', 'run_script', 'press_button',
  'media_previous_track','media_play','media_pause','media_next_track','media_stop',
  'volume_down','mute','unmute','volume_up','volume_set','select_source',
  'vacuum_start','vacuum_pause','vacuum_stop','return_to_base','locate','set_fan_speed','select_option'];
const statusNames = new Set(['on', 'off', 'open', 'closed', 'opening', 'closing', 'locked',
  'unlocked', 'locking', 'unlocking', 'jammed', 'cool', 'heat', 'heat_cool', 'dry', 'fan_only',
  'auto', 'idle', 'active', 'paused', 'playing', 'cleaning', 'returning', 'docked', 'unavailable', 'unknown']);
let nextId = 0;

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function validIcon(value, fallback = 'mdi:information-outline') {
  return typeof value === 'string' && iconPattern.test(value) ? value : fallback;
}

function icon(value) {
  const el = make('ha-icon');
  el.setAttribute('icon', validIcon(value));
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function label(el, text) {
  if (el.getAttribute('aria-label') !== text) {
    el.title = text;
    el.setAttribute('aria-label', text);
  }
}

function roomBadge(kind, glyph) {
  const element = make('span', 'room-status');
  element.dataset.badge = kind;
  element.setAttribute('role', 'img');
  element.hidden = true;
  const symbol = icon(glyph);
  const text = make('span');
  element.append(symbol, text);
  return { element, symbol, text };
}

function updateRoomBadge(badge, value) {
  badge.element.hidden = !value;
  if (!value) return;
  setText(badge.text, value.text || '');
  label(badge.element, value.label);
  if (value.glyph) setIcon(badge.symbol, value.glyph);
  if (value.tone) badge.element.dataset.tone = value.tone;
}

function button(className, text, glyph, iconOnly = false) {
  const el = make('button', className);
  el.type = 'button';
  if (glyph) el.append(icon(glyph));
  if (iconOnly) label(el, text);
  else if (text) el.append(text);
  return el;
}

function text(value) { return typeof value === 'string' ? value.trim() : ''; }

function number(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ltr(value) {
  return '\u2066' + value + '\u2069';
}

function setText(el, value) {
  if (el.textContent !== String(value)) el.textContent = value;
}

function setIcon(el, value) {
  const name = validIcon(value);
  if (el.getAttribute('icon') !== name) el.setAttribute('icon', name);
}

function normalizeEntity(item) {
  const entity = text(typeof item === 'string' ? item : item?.entity);
  if (!entityPattern.test(entity)) throw new Error('Invalid Home Assistant entity in Bayit 9.');
  const entry = { entity };
  if (text(item.name)) entry.name = text(item.name);
  if (iconPattern.test(text(item.icon))) entry.icon = item.icon;
  if (['heater', 'boiler'].includes(item.kind)) entry.kind = item.kind;
  if (entityPattern.test(text(item.level_entity)) && item.level_entity.startsWith('number.')) {
    entry.level_entity = item.level_entity;
  }
  if (Number.isSafeInteger(item.level_steps) && item.level_steps >= 2 && item.level_steps <= 12) {
    entry.level_steps = item.level_steps;
    if (/^input_number\.[a-z0-9_]+$/.test(item.level_read_entity ?? '')) entry.level_read_entity = item.level_read_entity;
  }
  if (item.timed && typeof item.timed === 'object' && !Array.isArray(item.timed)) entry.timed = { ...item.timed };
  if (entry.kind === 'heater' && entity.startsWith('fan.') && entry.level_read_entity &&
      /^sensor\.[a-z0-9_]+$/.test(entry.timed?.simple_timer_entity ?? '') &&
      /^script\.[a-z0-9_]+$/.test(item.level_select_script ?? '')) {
    entry.level_select_script = item.level_select_script;
  }
  if (entry.kind === 'boiler' && item.schedule && typeof item.schedule === 'object') {
    entry.schedule = Object.fromEntries(['save_script', 'delete_script'].flatMap(key =>
      /^script\.[a-z0-9_]+$/.test(item.schedule[key] ?? '') ? [[key, item.schedule[key]]] : []));
  }
  if (typeof item.role === 'string') entry.role = item.role;
  if (item.command === 'run_script') entry.command = item.command;
  if (typeof item.confirmation === 'boolean' || typeof item.confirmation === 'string') entry.confirmation = item.confirmation;
  if (Number.isInteger(item.graph_hours) && item.graph_hours >= 1 && item.graph_hours <= 336) entry.graph_hours = item.graph_hours;
  return entry;
}

export function normalizeDashboardConfig(config = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid Bayit 9 configuration.');
  const locale = /^he(?:-|$)/i.test(text(config.locale)) ? 'he' : 'en';
  const known = new Set();
  const rawRooms = config.rooms ?? [];
  if (!Array.isArray(rawRooms)) throw new Error('Bayit 9 rooms must be a list.');
  const rooms = rawRooms.map(room => {
    const id = text(room?.id);
    const name = text(room?.name);
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id) || !name || known.has(id)) {
      throw new Error('Each Bayit 9 room needs a unique id and name.');
    }
    known.add(id);
    const rawEntities = room.entities ?? [];
    const unique = new Map();
    if (!Array.isArray(rawEntities)) throw new Error('Bayit 9 room entities must be a list.');
    for (const item of rawEntities) {
      const entry = normalizeEntity(item);
      if (!unique.has(entry.entity)) unique.set(entry.entity, entry);
    }
    const parsed = { id, name, icon: validIcon(room.icon, 'mdi:door-open'), entities: [...unique.values()] };
    if (Array.isArray(room.shortcuts)) {
      parsed.shortcuts = [...new Set(room.shortcuts)].filter(entity => unique.has(entity)).slice(0, MAX_ROOM_SHORTCUTS);
    }
    if (Array.isArray(room.sections)) {
      parsed.sections = room.sections.filter(section => roomSectionKinds.has(section?.kind)).map(section => ({
        id: text(section.id), kind: section.kind, title: typeof section.title === 'string' ? section.title : undefined,
        entities: [...new Set((Array.isArray(section.entities) ? section.entities : []).map(item => item?.entity ?? item))]
          .map(entity => unique.get(entity)).filter(Boolean),
      }));
    }
    return parsed;
  });
  const entities = new Map(rooms.flatMap(room => room.entities.map(device => [device.entity, device])));
  const overview = Array.isArray(config.overview)
    ? [...new Set(config.overview)].filter(id => entities.has(id)).map(id => entities.get(id)) : [];
  const context = Object.fromEntries(contextKeys.map(key => {
    const configs = Array.isArray(config.context?.[key]) ? config.context[key].map(normalizeEntity) : [];
    const unique = new Map(configs.map(entry => [entry.entity, entities.get(entry.entity) ?? entry]));
    return [key, [...unique.values()]];
  }));
  const toolbar = Array.isArray(config.toolbar) ? config.toolbar.flatMap(item => {
    if (!Object.hasOwn(toolbarIcons, item?.kind) || (item.kind === 'link' && !localPath.test(item.path))) return [];
    const orefMap = item.kind === 'security' ? normalizeOrefMap(item.oref_map) : undefined;
    const vacuumMap = item.kind === 'vacuum' ? normalizeVacuumMap(item.vacuum_map) : undefined;
    return [{ kind: item.kind, id: text(item.id), label: text(item.label), path: item.path,
      ...(item.placement === 'settings' && item.kind !== 'settings' && {placement:'settings'}),
      ...(orefMap && { oref_map: orefMap }),
      ...(vacuumMap && { vacuum_map: vacuumMap }),
      icon: validIcon(item.icon, toolbarIcons[item.kind]),
      ...(Array.isArray(item.entities) && { entities: item.entities.map(normalizeEntity) }),
      ...(Array.isArray(item.sections) && { sections: item.sections.filter(section => Array.isArray(section?.entities)).map(section => ({
        id: text(section.id), kind: text(section.kind), title: typeof section.title === 'string' ? section.title : undefined,
        ...(section.filter === 'active' && {filter:'active'}),
        entities: section.entities.map(normalizeEntity),
      })) }) }];
  }) : null;
  return {
    locale, rooms, overview, context, toolbar, page: config.page === true, fullscreen: config.fullscreen === true,
    title: text(config.title) || languages[locale].home,
    background: backgrounds.includes(config.background) ? config.background : 'aurora',
    layout: options.layout.includes(config.layout) ? config.layout : 'classic',
    shape: options.shape.includes(config.shape) ? config.shape : 'soft',
    storageKey: 'bayit-9.preferences.v1:' + (text(config.preference_key) || location.pathname),
  };
}

const layout = `
  <main class="shell">
    <header class="toolbar">
      <div class="brand"><ha-icon icon="mdi:home-variant-outline" aria-hidden="true"></ha-icon><h1></h1></div>
      <div class="toolbar-actions"></div>
    </header>
    <div class="room-scroll"><div class="rooms" role="region"></div></div>
    <p class="empty"></p>
    <div class="notice" data-role="page-notice" role="status" aria-atomic="true"></div>
    <dialog class="modal">
      <header class="modal-header">
        <button type="button" class="round-action" data-role="back" hidden>
          <ha-icon aria-hidden="true"></ha-icon>
        </button>
        <h2></h2>
        <button type="button" class="round-action" data-role="close" autofocus>
          <ha-icon icon="mdi:close" aria-hidden="true"></ha-icon>
        </button>
      </header>
      <div class="modal-body"><div data-role="content"></div>
        <div class="notice" data-role="modal-notice" role="status" aria-atomic="true"></div>
      </div>
    </dialog>
    <dialog class="modal confirm">
      <header class="modal-header"><h2></h2></header>
      <div class="modal-body"><p class="confirmation-text"></p>
        <div class="confirmation-actions">
          <button type="button" class="control-button" data-role="abort" autofocus></button>
          <button type="button" class="control-button" data-role="accept"></button>
        </div>
      </div>
    </dialog>
  </main>
`;

export class BayitDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<style>' + styles + panelControlStyles + toolbarPanelStyles +
      wallpaperStyles + boilerHistoryStyles + '</style>' + layout;
    const get = selector => this.shadowRoot.querySelector(selector);
    const role = name => get('[data-role="' + name + '"]');
    this.nodes = {
      shell: get('.shell'), toolbar: get('.toolbar'), toolbarActions: get('.toolbar-actions'),
      roomScroll: get('.room-scroll'), rooms: get('.rooms'), empty: get('.empty'), title: get('h1'),
      back: role('back'), close: role('close'),
      modal: get('dialog:not(.confirm)'), modalTitle: get('dialog:not(.confirm) h2'),
      modalBody: get('dialog:not(.confirm) .modal-body'), content: role('content'),
      confirm: get('.confirm'), confirmTitle: get('.confirm h2'), confirmText: get('.confirmation-text'),
      accept: role('accept'), abort: role('abort'), pageNotice: role('page-notice'), modalNotice: role('modal-notice'),
    };
    const n = this.nodes;
    const prefix = 'bayit-9-' + ++nextId;
    n.confirmTitle.id = prefix + '-confirm';
    n.confirmText.id = prefix + '-message';
    n.confirm.setAttribute('aria-labelledby', n.confirmTitle.id);
    n.confirm.setAttribute('aria-describedby', n.confirmText.id);
    this.popupMotion = createPopupMotion({ dialog: n.modal, clip: n.roomScroll, toolbar: n.toolbar });
    this.pageChrome = createPageChrome(this, { onChange: () => this.fitPage() });
    n.back.onclick = () => this.backToBoilerRoom();
    n.close.onclick = () => this.popupMotion.dismiss();
    n.abort.onclick = () => n.confirm.close();
    n.accept.onclick = () => this.acceptAction();
    n.modal.addEventListener('close', () => this.closePanel());
    n.confirm.addEventListener('close', () => {
      const source = this.confirming?.source;
      this.confirming = null;
      if (source?.isConnected && !source.disabled) source.focus({ preventScroll: true });
    });
    for (const dialog of [n.modal, n.confirm]) dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom)) {
        if (dialog === n.modal) this.popupMotion.dismiss();
        else dialog.close();
      }
    });
    this.roomViews = new Map();
    this.deviceViews = new Set();
    this.pending = new Map();
    this.roomScroll = new Map();
    this.preferences = {};
    this.controller = createDeviceController({ getHass: () => this._hass });
    this.resize = () => this.fitPage();
    this.storageChange = event => {
      if (event.key !== this.config?.storageKey) return;
      this.readPreferences();
      this.applyPreferences();
    };
  }

  static getStubConfig() { return { locale: 'en', rooms: [] }; }
  getCardSize() { return Math.max(2, Math.ceil((this.config?.rooms.length || 0) / 2) * 3 + 1); }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }

  setConfig(raw) {
    const next = normalizeDashboardConfig(raw);
    if (this.config?.storageKey !== next.storageKey) this.preferences = {};
    if (this.nodes.confirm.open) this.nodes.confirm.close();
    this.popupMotion.reset();
    this.toolbarPanel?.dispose();
    this.roomGraphs?.dispose();
    this.boilerView?.dispose();
    this.config = next;
    this.words = languages[next.locale];
    const n = this.nodes;
    n.shell.lang = next.locale;
    n.shell.dir = next.locale === 'he' ? 'rtl' : 'ltr';
    n.shell.dataset.page = String(next.page);
    n.shell.style.setProperty('--bayit-room-rows', String(Math.max(1, Math.ceil(next.rooms.length / 2))));
    n.shell.style.setProperty('--bayit-room-rows-wide', String(Math.max(1, Math.ceil(next.rooms.length / 4))));
    setText(n.title, next.title);
    setText(n.empty, this.t('empty'));
    label(n.back, this.t('back_to_room'));
    setIcon(n.back.firstElementChild, next.locale === 'he' ? 'mdi:chevron-right' : 'mdi:chevron-left');
    label(n.close, this.t('close'));
    n.rooms.setAttribute('aria-label', this.t('rooms'));
    setText(n.confirmTitle, this.t('confirm_title'));
    setText(n.abort, this.t('cancel'));
    setText(n.accept, this.t('confirm'));
    this.readPreferences();
    this.buildToolbar();
    this.buildRooms();
    this.applyPreferences();
    this.pageChrome.update({ enabled: next.page && next.fullscreen });
    this.update();
    this.fitPage();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.setup?.editor) this.setup.editor.hass = hass;
    if (!this.isConnected || this.frame || !this.config) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  }

  connectedCallback() {
    window.addEventListener('storage', this.storageChange);
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    if (this.config) this.applyPreferences();
    this.pageChrome.update({ enabled: this.config?.page && this.config.fullscreen });
    this.fitPage();
    this.update();
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this.storageChange);
    window.removeEventListener('resize', this.resize);
    window.visualViewport?.removeEventListener('resize', this.resize);
    cancelAnimationFrame(this.frame);
    clearInterval(this.ticker);
    clearTimeout(this.noticeTimer);
    this.frame = this.ticker = 0;
    if (this.nodes.confirm.open) this.nodes.confirm.close();
    this.popupMotion.reset();
    this.toolbarPanel?.dispose();
    this.roomGraphs?.dispose();
    this.boilerView?.dispose();
    this.pageChrome.dispose();
    this.wallpaper?.destroy();
    this.wallpaper = this.wallpaperKey = this.activeWallpaper = this.pendingWallpaper = undefined;
  }

  fitPage() {
    if (!this.config?.page || !this.isConnected) return;
    const bounds = this.getBoundingClientRect();
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    if (bounds.top < 0) return;
    this.nodes.shell.style.setProperty('--bayit-view-height', Math.max(0, bottom - bounds.top) + 'px');
    this.nodes.shell.style.setProperty('--bayit-page-top', bounds.top + 'px');
    this.nodes.modal.style.setProperty('--bayit-popup-view-bottom', bottom + 'px');
  }

  t(key) { return this.words?.[key] || key; }

  readPreferences() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(this.config.storageKey) || '{}'); }
    catch { return; }
    this.preferences = {};
    for (const [key, choices] of Object.entries(options)) {
      if (choices.includes(saved?.[key]) || (key === 'background' && saved?.[key] === personalWallpaperId)) {
        this.preferences[key] = saved[key];
      }
    }
  }

  applyPreferences() {
    for (const key of ['layout','shape']) this.nodes.shell.dataset[key] = this.preferences[key] || this.config[key];
    this.applySavedWallpaper();
    for (const {article,heading} of this.roomViews.values()) {
      if (this.nodes.shell.dataset.layout === 'header' && article.firstElementChild !== heading) article.prepend(heading);
      if (this.nodes.shell.dataset.layout !== 'header' && article.lastElementChild !== heading) article.append(heading);
    }
    this.wallpaper?.refresh();
    if (this.panel?.type !== 'settings') return;
    this.wallpaperGallery?.select(this.activeWallpaper || this.config.background);
    for (const item of this.nodes.content.querySelectorAll('[data-preference]')) {
      item.setAttribute('aria-pressed', String(item.value === this.nodes.shell.dataset[item.dataset.preference]));
    }
  }

  applySavedWallpaper() {
    const { storageKey, background } = this.config;
    if (this.wallpaperKey !== storageKey) {
      this.wallpaper?.destroy();
      this.wallpaper = createWallpaperController(this.nodes.shell, { storageKey });
      this.wallpaperKey = storageKey;
      this.activeWallpaper = this.pendingWallpaper = undefined;
    }
    const saved = this.preferences.background || background;
    if (this.activeWallpaper === saved || this.pendingWallpaper?.id === saved) return;
    if (!this.activeWallpaper && saved === personalWallpaperId) {
      void this.wallpaper.apply(background);
      this.activeWallpaper = background;
    }
    void this.selectWallpaper(saved, { save: false });
  }

  async selectWallpaper(id, { save = true, file } = {}) {
    const controller = this.wallpaper;
    if (!controller) return false;
    const request = { id };
    this.pendingWallpaper = request;
    const applied = file ? await controller.upload(file) : await controller.apply(id);
    if (this.pendingWallpaper !== request || this.wallpaper !== controller) return false;
    this.pendingWallpaper = undefined;
    if (!applied) return false;
    this.activeWallpaper = id;
    if (save) this.setPreference('background', id);
    this.wallpaperGallery?.select(id);
    return true;
  }

  setPreference(key, value) {
    this.preferences[key] = value;
    try { localStorage.setItem(this.config.storageKey, JSON.stringify(this.preferences)); } catch {}
    this.applyPreferences();
  }

  model(config) {
    try {
      const model = getDeviceModel(config, this._hass?.states ?? {});
      return { ...model, icon: validIcon(model.icon, deviceIcons[model.kind || model.domain]) };
    }
    catch {
      return { ...config, name: config.name || config.entity, icon: validIcon(config.icon),
        actions: {}, attributes: {}, state: 'unavailable', available: false };
    }
  }

  buildToolbar() {
    const settings = this.config;
    const automatic = [settings.context.automations.length ? 'automations' : 'activity',
      ...automaticToolbarContext.slice(1), 'overview', 'settings'];
    const items = settings.toolbar?.filter(item => item.placement !== 'settings') ?? automatic.map(kind => ({ kind, icon: toolbarIcons[kind] }));
    if (settings.fullscreen && !items.some(item => item.kind === 'settings')) items.push({ kind:'settings', icon:toolbarIcons.settings });
    this.nodes.toolbarActions.replaceChildren();
    this.toolbarViews = items.map(item => {
      const { kind } = item;
      const name = item.label || this.t(kind);
      const entities = item.sections?.flatMap(section => section.entities) ?? item.entities ??
        (kind === 'overview' ? settings.overview : settings.context[kind] ?? []);
      const element = button('chrome-button', name, item.icon, true);
      element.dataset.role = kind;
      if (kind !== 'link') element.setAttribute('aria-haspopup', 'dialog');
      const badge = ['presence', 'activity'].includes(kind) ? make('span', 'badge') : null;
      if (badge) {
        badge.hidden = true;
        badge.setAttribute('aria-hidden', 'true');
        element.append(badge);
      }
      element.onclick = () => {
        if (kind === 'link') return location.assign(item.path);
        this.openPanel(kind, element, undefined, undefined, { ...item, name, entities });
      };
      const needsContent = !settings.toolbar && (kind === 'overview' || contextKeys.includes(kind));
      this.nodes.toolbarActions.append(element);
      return { kind, element, badge, entities, needsContent };
    });
  }

  quickAction(config, source, room) {
    const model = this.model(config);
    const { domain, state } = model;
    let action;
    if (domain === 'cover') action = ['opening', 'closing'].includes(state)
      ? 'stop' : state === 'open' ? 'close' : state === 'closed' ? 'open' : undefined;
    else if (domain === 'lock') action = state === 'locked' ? 'unlock' : state === 'unlocked' ? 'lock' : undefined;
    else if (powerDomains.has(domain) && !config.kind) action = state === 'off' ? 'turn_on' : 'turn_off';
    if (action && model.actions[action]) {
      this.requestAction(config, action, undefined, source, domain === 'lock');
    } else this.openPanel('device', source, room, config.entity);
  }

  buildRooms() {
    const n = this.nodes;
    this.roomViews.clear();
    n.rooms.replaceChildren();
    for (const room of this.config.rooms) {
      const article = make('article', 'room');
      article.dataset.room = room.id;
      const heading = button('room-title');
      label(heading, room.name);
      heading.setAttribute('aria-haspopup', 'dialog');
      const chevron = icon(this.config.locale === 'he' ? 'mdi:chevron-left' : 'mdi:chevron-right');
      chevron.className = 'chevron';
      const count = make('span', 'room-count');
      count.setAttribute('aria-hidden', 'true');
      heading.append(icon(room.icon), make('span', 'room-name', room.name), count, chevron);
      heading.onclick = () => this.openPanel('room', heading, room);
      article.onclick = event => {
        if (!event.target.closest('button')) this.openPanel('room', heading, room);
      };
      const status = make('div', 'room-status-strip');
      const temperature = roomBadge('temperature', 'mdi:thermometer');
      const activity = roomBadge('activity', 'mdi:timer-outline');
      const availability = roomBadge('availability', 'mdi:alert-circle-outline');
      status.append(temperature.element, activity.element, availability.element);
      const quick = make('div', 'quick');
      const shortcut = new Map();
      const byId = new Map(room.entities.map(config => [config.entity, config]));
      const chosen = room.shortcuts
        ? room.shortcuts.map(entity => byId.get(entity))
        : room.entities.filter(entry => shortcutDomains.has(domainFor(entry))).slice(0, MAX_ROOM_SHORTCUTS);
      for (const config of chosen) {
        const el = button('quick-button', config.name || config.entity, config.icon || 'mdi:information-outline', true);
        el.dataset.entity = config.entity;
        el.setAttribute('aria-haspopup', 'dialog');
        el.onclick = () => this.quickAction(config, el, room);
        bindDeviceDetails(el, () => this.openPanel('device', el, room, config.entity));
        shortcut.set(config.entity, el);
        quick.append(el);
      }
      article.append(status, quick, heading);
      n.rooms.append(article);
      this.roomViews.set(room.id, { room, article, heading, count, temperature, activity, availability, shortcut });
    }
    n.empty.hidden = this.roomViews.size > 0;
  }

  tone(model) {
    if (!model.available) return 'quiet';
    if (model.domain === 'cover' && ['open','opening','closing'].includes(model.state)) return 'moving';
    if (model.domain === 'climate' && !['heater','boiler'].includes(model.kind) && model.state !== 'off') return 'moving';
    if (model.domain === 'lock' && ['unlocked','unlocking','jammed'].includes(model.state)) return 'critical';
    if (model.timer?.state === 'active' || ['on','playing','cleaning'].includes(model.state) ||
        ['heating','cooling','drying','fan'].includes(model.attributes?.hvac_action)) return 'warm';
    return 'quiet';
  }

  stateLabel(model) {
    if (!model.available) return this.t('unavailable');
    const attrs = model.attributes || {};
    const state = model.state;
    const localized = key => statusNames.has(key) ? this.t(key) : String(key || this.t('unknown'));
    if (model.domain === 'cover') {
      const position = number(attrs.current_position);
      return (state === 'open' ? this.t('opened') : localized(state)) + (position === null ? '' : ' · ' + ltr(position + '%'));
    }
    if (model.domain === 'sensor' && attrs.unit_of_measurement) return ltr(state + ' ' + attrs.unit_of_measurement);
    if (model.domain === 'climate') {
      const temp = number(attrs.current_temperature);
      const unit = this._hass?.config?.unit_system?.temperature || '°';
      return localized(state) + (temp === null ? '' : ' · ' + ltr(temp + ' ' + unit));
    }
    if (statusNames.has(state)) return localized(state);
    const record = this._hass?.states?.[model.entity];
    return String((record && this._hass?.formatEntityState?.(record)) || state || this.t('unknown'));
  }

  temperatureBadge(value, unit) {
    const temperature = number(value);
    if (temperature === null) return undefined;
    const suffix = unit || this._hass?.config?.unit_system?.temperature || '°';
    const shown = typeof suffix === 'string' && suffix.trim().length <= 3 ? suffix.trim() : '°';
    return ltr(Number(temperature.toFixed(1)) + shown);
  }

  roomClimateBadge(model, tone) {
    const heating = ['heater', 'boiler'].includes(model.kind) || model.domain === 'water_heater';
    if (heating && tone === 'warm') return {
      text: this.t('on'), label: model.name + ' · ' + this.stateLabel(model),
      glyph: model.kind === 'boiler' || model.domain === 'water_heater' ? 'mdi:water-boiler' : 'mdi:radiator', tone,
    };
    if (model.domain !== 'climate' || heating || tone !== 'moving') return undefined;
    const mode = statusNames.has(model.state) ? this.t(model.state) : model.state;
    const target = ['cool','heat','heat_cool','auto'].includes(model.state)
      ? this.temperatureBadge(model.attributes?.temperature) : undefined;
    return {
      text: target || mode, label: [model.name, mode, target && this.t('target_short') + ' ' + target].filter(Boolean).join(' · '),
      glyph: 'mdi:air-conditioner', tone,
    };
  }

  update() {
    if (!this.config) return;
    const n = this.nodes;
    const active = new Map();
    const haveStates = !!this._hass?.states;
    let countdown = false;
    for (const [id, view] of this.roomViews) {
      let lit = 0;
      const unavailable = [];
      let lightUnavailable = false;
      let temperature;
      let ambient;
      let climate;
      let timing;
      for (const config of view.room.entities) {
        const model = this.model(config);
        const tone = this.tone(model);
        if (haveStates && !model.available) {
          unavailable.push(model.name);
          lightUnavailable ||= model.domain === 'light' || domainFor(config) === 'light';
        }
        if (model.domain === 'light' && model.state === 'on') lit++;
        if (tone !== 'quiet' && !active.has(config.entity)) active.set(config.entity, { config, model, room: view.room });
        if (model.available) {
          if (isTemperatureSensor(model.domain, model.attributes)) {
            temperature ||= this.temperatureBadge(model.state, model.attributes.unit_of_measurement);
          }
          if (model.domain === 'climate') ambient ||= this.temperatureBadge(model.attributes?.current_temperature);
          climate ||= this.roomClimateBadge(model, tone);
        }
        if (model.timer?.state === 'active') {
          countdown = true;
          timing ||= {
            text: this.timerLabel(model.timer, true), label: model.name + ' · ' + this.timerLabel(model.timer),
            glyph: 'mdi:timer-outline', tone: 'warm',
          };
        }
        const shortcut = view.shortcut.get(config.entity);
        if (!shortcut) continue;
        setIcon(shortcut.firstElementChild, model.icon);
        label(shortcut, model.name + ' · ' + this.stateLabel(model));
        shortcut.dataset.tone = tone;
        shortcut.dataset.transition = ['opening','closing'].includes(model.state) ? model.state : '';
        const busy = this.pending.has(config.entity);
        shortcut.setAttribute('aria-busy', String(busy));
      }
      const reading = temperature || ambient;
      updateRoomBadge(view.temperature, reading && { text: reading, label: this.t('room_temperature') + ' · ' + reading });
      updateRoomBadge(view.activity, timing || climate);
      updateRoomBadge(view.availability, unavailable.length && {
        text: unavailable.length > 1 ? unavailable.length : '',
        label: this.t('unavailable') + ' · ' + unavailable.join(', '),
      });
      setText(view.count, lit || (lightUnavailable ? '—' : this.t('off')));
      view.count.dataset.tone = lit ? 'warm' : 'quiet';
      view.article.toggleAttribute('data-current', this.panel?.type === 'room' && this.panel.room?.id === id);
    }
    this.activeDevices = active;
    const panel = this.panel?.type;
    if (panel === 'room' || panel === 'device' || panel === 'overview' || contextKeys.includes(panel)) {
      const activeTimer = this.updateDevices();
      countdown ||= activeTimer;
    }
    this.toolbarPanel?.update(this._hass);
    this.roomGraphs?.update(this._hass);
    this.boilerView?.update(this._hass);
    if (panel === 'activity') this.paintActivity();
    for (const { kind, element, badge, entities, needsContent } of this.toolbarViews) {
      element.hidden = needsContent && !entities.length && (kind !== 'energy' || !this._hass?.panels?.energy);
      if (badge) {
        const count = kind === 'activity' ? active.size
          : entities.filter(item => this._hass?.states?.[item.entity]?.state === 'home').length;
        badge.hidden = !count;
        setText(badge, count);
      }
    }
    if (countdown && !this.ticker && this.isConnected) this.ticker = setInterval(() => this.update(), 1000);
    if (!countdown && this.ticker) { clearInterval(this.ticker); this.ticker = 0; }
  }

  openPanel(type, source, room, entity, toolbar) {
    if (!this.config) return;
    const n = this.nodes;
    const selected = type === 'device' ? room?.entities.find(item => item.entity === entity) : null;
    if (type === 'device' && !selected) return;
    const model = selected ? this.model(selected) : null;
    const boilerControls = selected?.kind === 'boiler' && selected.role !== 'status';
    const fromBoilerRoom = boilerControls && this.panel?.type === 'room' &&
      this.panel.room === room && n.modal.open && n.content.contains(source);
    if (fromBoilerRoom) this.roomScroll.set(room.id, n.modalBody.scrollTop);
    this.panel = { type, room, boilerReturn: fromBoilerRoom ? selected.entity : undefined };
    n.back.hidden = !fromBoilerRoom;
    this.setup = null;
    this.toolbarPanel?.dispose();
    this.roomGraphs?.dispose();
    this.boilerView?.dispose();
    this.toolbarPanel = this.wallpaperGallery = this.roomGraphs = this.boilerView = undefined;
    this.deviceViews.clear();
    this.activitySignature = null;
    setText(n.modalNotice, '');
    const glyph = model?.icon || room?.icon || source.querySelector('ha-icon')?.getAttribute('icon');
    const title = model?.name || room?.name || toolbar?.name || this.t(type);
    n.modal.setAttribute('aria-label', title);
    n.modalTitle.replaceChildren(icon(glyph), title);
    if (type === 'room') this.buildDevices(room.entities, room);
    if (selected) {
      this.buildDevices([selected]);
      if (boilerControls) this.buildBoilerView(selected);
    }
    if (type === 'overview') {
      if (toolbar?.sections) this.openToolbarPanel('overview', toolbar);
      else this.buildDevices(toolbar?.entities ?? this.config.overview);
    }
    if (contextKeys.includes(type)) this.openToolbarPanel(type, toolbar);
    if (type === 'settings') this.paintSettings();
    if (type === 'setup') void this.paintSetup();
    if (type === 'activity') this.paintActivity();
    const kind = type === 'room' || type === 'device' ? type : 'toolbar';
    this.popupMotion.open(source, { kind, highlighted: type === 'room' ? this.roomViews.get(room.id)?.article : source });
    n.modalBody.scrollTop = type === 'room' ? this.roomScroll.get(room.id) || 0 : 0;
    this.update();
  }

  backToBoilerRoom() {
    const { room, boilerReturn } = this.panel ?? {};
    const source = room && this.roomViews.get(room.id)?.heading;
    if (!boilerReturn || !source || !this.nodes.modal.open) return;
    this.openPanel('room', source, room);
    const view = Array.from(this.deviceViews).find(item => item.config.entity === boilerReturn);
    view?.more?.focus({ preventScroll: true });
  }

  closePanel() {
    const n = this.nodes;
    if (n.modal.open) return;
    if (this.panel?.type === 'room') this.roomScroll.set(this.panel.room.id, n.modalBody.scrollTop);
    n.back.hidden = true;
    this.panel = null;
    this.setup = null;
    this.toolbarPanel?.dispose();
    this.roomGraphs?.dispose();
    this.boilerView?.dispose();
    this.toolbarPanel = this.wallpaperGallery = this.roomGraphs = this.boilerView = undefined;
    this.deviceViews.clear();
    clearInterval(this.ticker);
    this.ticker = 0;
    this.update();
  }

  buildDevices(entities, room) {
    const content = this.nodes.content;
    content.className = 'devices';
    if (room) content.dataset.room = 'true';
    else delete content.dataset.room;
    content.replaceChildren();
    if (!room) {
      for (const config of entities) this.buildDevice(config, content);
    } else {
      const explicit = room.sections?.map(section => ({ ...section, key: 'room_' + section.kind })) ?? [];
      const configured = new Set(explicit.flatMap(section => section.entities.map(device => device.entity)));
      const groups = [...explicit, ...this.defaultRoomSections(entities.filter(device => !configured.has(device.entity)))];
      for (const { key, title, entities: members } of groups) {
        if (!members.length) continue;
        const group = make('section', 'device-group');
        group.dataset.group = key;
        if (title !== '') group.append(make('h3', 'device-group-title', title ?? this.t(key)));
        for (const config of members) {
          const temperature = (key === 'room_sensors' || key === 'room_weather') &&
            isTemperatureSensor(domainFor(config), this._hass?.states?.[config.entity]?.attributes);
          if (!temperature) {
            this.buildDevice(config, group, room, key);
            continue;
          }
          this.roomGraphs ??= createNativeCards(content, this._hass, make);
          const fallback = content.ownerDocument.createDocumentFragment();
          this.buildDevice(config, fallback, room, key);
          group.append(this.roomGraphs.mount(sensorGraphConfig(config), fallback.firstElementChild));
        }
        content.append(group);
      }
    }
    if (!content.childElementCount) content.append(make('p', 'empty', this.t('empty_room')));
    this.updateDevices();
  }

  defaultRoomSections(entities) {
    const groups = new Map();
    for (const config of entities) {
      const key = config.kind === 'heater' || config.kind === 'boiler'
        ? 'room_heating' : deviceGroups[domainFor(config)] ?? 'room_devices';
      if (!groups.has(key)) groups.set(key, { key, entities: [] });
      groups.get(key).entities.push(config);
    }
    return groups.values();
  }

  buildDevice(config, parent, room, groupKey) {
    const item = make('section', 'device');
    const domain = domainFor(config);
    const tileMode = groupKey === 'room_lights' && ['light', 'switch'].includes(domain) && !config.kind;
    item.dataset.entity = config.entity;
    item.dataset.treatment = config.kind || domain;
    const glyph = icon(config.icon || 'mdi:information-outline');
    glyph.className = 'device-icon';
    const name = make(room && !tileMode ? 'h4' : tileMode ? 'span' : 'h3', 'device-name');
    const state = make('span', 'current');
    const view = { config, item, glyph, name, state, fields: [], room };
    if (tileMode) {
      item.dataset.compact = 'tile';
      const tile = button('device-tile');
      tile.append(glyph, name, state);
      tile.setAttribute('aria-haspopup', 'dialog');
      tile.onclick = () => this.quickAction(config, tile, room);
      bindDeviceDetails(tile, () => this.openPanel('device', tile, room, config.entity));
      view.tile = tile;
      item.append(tile);
    } else {
      const head = make('header', 'device-head');
      const details = make('div', 'device-detail');
      details.append(name, state);
      const cover = !!room && domain === 'cover';
      const hasPanel = !!room && (cover || (config.kind === 'boiler' && config.role !== 'status'));
      if (cover) item.dataset.compact = 'cover';
      const more = button('round-action', this.t(hasPanel ? 'device_controls' : 'more_info'),
        cover ? config.icon || deviceIcons.cover : 'mdi:information-outline', true);
      if (hasPanel) more.setAttribute('aria-haspopup', 'dialog');
      more.onclick = () => hasPanel ? this.openPanel('device', more, room, config.entity) : this.moreInfo(config);
      head.append(glyph, details, more);
      const group = make('div', 'action-list');
      item.append(head, group);
      Object.assign(view, { more, group });
    }
    parent.append(item);
    this.deviceViews.add(view);
  }

  openToolbarPanel(type, toolbar) {
    const content = this.nodes.content;
    content.className = 'toolbar-panes';
    delete content.dataset.room;
    content.replaceChildren();
    this.toolbarPanel = createToolbarPanel(type, {
      sections: toolbar?.sections, entities: toolbar?.entities ?? this.config.context[type] ?? [],
      orefMap: toolbar?.oref_map,
      vacuumMap: toolbar?.vacuum_map,
    }, {
      host: content, dialog: this.nodes.modal, hass: this._hass, locale: this.config.locale,
      make, button, icon, label, t: key => this.t(key),
      modelFor: item => this.model(item), stateLabel: model => this.stateLabel(model),
      moreInfo: item => this.moreInfo(item), pending: entity => this.pending.has(entity),
      request: (item, action, value, source) => this.requestAction(item, action, value, source),
      buildDevice: (item, slot) => this.buildDevice(item, slot),
    });
  }

  buildBoilerView(config) {
    const content = this.nodes.content;
    const controls = make('div', 'boiler-pane');
    controls.append(...content.childNodes);
    const host = make('div', 'boiler-pane boiler-history-host');
    host.hidden = true;
    const tabs = make('div', 'boiler-tabs');
    let panel;
    const choices = [
      {label:'timed', icon:'mdi:timer-outline', element:controls},
      {label:'boiler_history', icon:'mdi:history', element:host,
        open:() => openBoilerHistory({host, config, locale:this.config.locale, hass:this._hass, t:key=>this.t(key)})},
    ];
    if (isBoilerScheduleProfile(config) && (config.schedule || this._hass?.services?.scheduler)) {
      const scheduleHost = make('div','boiler-pane boiler-schedule-host');
      scheduleHost.hidden = true;
      choices.splice(1,0,{label:'boiler_schedule',icon:'mdi:calendar-clock',element:scheduleHost,open:() => {
        const schedule = createBoilerSchedulePanel(config, {host:scheduleHost,hass:this._hass,locale:this.config.locale});
        return {update:schedule.update,dispose:schedule.destroy};
      }});
    }
    for (const item of choices) {
      const tab = button('control-button', this.t(item.label), item.icon);
      tab.setAttribute('aria-pressed', String(!item.element.hidden));
      tabs.append(tab);
      item.tab = tab;
      tab.onclick = () => {
        if (!item.element.hidden) return;
        panel?.dispose();
        panel = undefined;
        for (const choice of choices) {
          choice.element.hidden = choice !== item;
          choice.tab.setAttribute('aria-pressed', String(choice === item));
        }
        panel = item.open?.();
        panel?.update(this._hass);
      };
    }
    content.className = 'boiler-panel';
    content.append(tabs, ...choices.map(item => item.element));
    this.boilerView = {update:hass=>panel?.update(hass), dispose:()=>panel?.dispose()};
  }

  moreInfo(config) {
    if (!this.model(config).actions.more_info) return;
    this.popupMotion.dismiss({ immediate: true, restoreFocus: false });
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      detail: { entityId: config.entity }, bubbles: true, composed: true,
    }));
  }

  timerLabel(timer, compact = false) {
    if (!timer || ['idle','unavailable'].includes(timer.state)) return '';
    if (timer.remainingMs === null) return this.t(compact && timer.state === 'active' ? 'timed' : timer.state);
    const seconds = Math.max(0, Math.ceil(timer.remainingMs / 1000));
    const remaining = ltr(Math.floor(seconds/60) + ':' + String(seconds%60).padStart(2,'0'));
    return compact ? remaining : this.t('timed') + ' · ' + remaining;
  }

  updateDevices() {
    let countdown = false;
    for (const view of this.deviceViews.values()) {
      const model = this.model(view.config);
      setText(view.name, model.name);
      setIcon(view.glyph, model.icon);
      if (model.timer?.state === 'active') countdown = true;
      const media = model.domain === 'media_player' && view.config.role !== 'now_playing' &&
        typeof model.attributes.media_title === 'string'
        ? model.attributes.media_title.trim().slice(0, 160) : '';
      setText(view.state, this.stateLabel(model) + (media ? ' · ' + media : ''));
      view.state.dataset.tone = this.tone(model);
      const pending = this.pending.get(view.config.entity);
      if (view.tile) {
        const actionId = model.state === 'off' ? 'turn_on' : 'turn_off';
        const toggles = !!model.actions[actionId];
        label(view.tile, model.name + ' · ' + this.t(toggles ? actionId : 'more_info'));
        if (toggles) view.tile.setAttribute('aria-pressed', String(model.state === 'on'));
        else view.tile.removeAttribute('aria-pressed');
        view.tile.setAttribute('aria-busy', String(!!pending));
        continue;
      }
      view.more.hidden = !model.actions.more_info;
      const timerLayout = model.timer ? [model.timer.state, Number.isFinite(model.timer.usedSeconds), model.state === 'on'] : null;
      const signature = JSON.stringify([actionsInOrder.map(id => model.actions[id] || null), timerLayout]);
      if (signature !== view.signature) {
        view.signature = signature;
        this.buildActions(view, model);
      }
      view.item.setAttribute('aria-busy', String(!!pending));
      for (const control of view.group.querySelectorAll('button,input,select')) {
        control.disabled = !this.canRequest(view.config.entity, control.dataset.action);
      }
      view.special.update(model, pending);
      for (const field of view.fields) {
        this.syncField(field, model);
        if (field.valid && !field.valid(field.input.value)) field.apply.disabled = true;
      }
    }
    return countdown;
  }

  paintSettings() {
    const content = this.nodes.content;
    content.className = 'settings';
    content.replaceChildren();
    if (this._hass?.user?.is_admin) {
      const setup = button('control-button setup-entry', this.t('setup'), 'mdi:tune-variant');
      setup.onclick = () => this.openPanel('setup', setup);
      content.append(setup);
    }
    const screens = make('div', 'settings-screens');
    const extra = ['overview','sensors','calendar','media','vacuum'];
    const configured = this.config.toolbar?.filter(item => item.placement === 'settings');
    const automatic = extra.flatMap(kind => {
      const entries = kind === 'overview' ? this.config.overview : this.config.context[kind];
      return entries.length ? [{ kind, icon: toolbarIcons[kind], entities: entries }] : [];
    });
    for (const item of configured?.length ? configured : automatic) {
      const route = button('control-button', item.label || this.t(item.kind), item.icon);
      route.onclick = () => item.kind === 'link' ? location.assign(item.path)
        : this.openPanel(item.kind, route, undefined, undefined, { ...item, name: item.label || this.t(item.kind) });
      screens.append(route);
    }
    if (screens.childElementCount) {
      const group = make('fieldset','prefs-group');
      group.append(make('legend','',this.t('more_screens')),screens);
      content.prepend(group);
    }
    this.wallpaperGallery = createWallpaperGallery({ locale: this.config.locale, controller: this.wallpaper,
      selected: this.activeWallpaper || this.config.background,
      onSelect: id => this.selectWallpaper(id), onUpload: file => this.selectWallpaper(personalWallpaperId, { file }) });
    content.append(this.wallpaperGallery.element);
    for (const key of ['shape','layout']) {
      const values = options[key];
      const group = make('fieldset', 'prefs-group');
      group.append(make('legend', '', this.t(key)));
      const choices = make('div', 'prefs-options');
      for (const value of values) {
        const el = button('control-button', this.t(value));
        el.value = value;
        el.dataset.preference = key;
        el.onclick = () => this.setPreference(key, value);
        choices.append(el);
      }
      group.append(choices);
      content.append(group);
    }
    this.applyPreferences();
    if (this.config.page && this.config.fullscreen) {
      const bypass = new URL(location.href).searchParams.has('disable_km');
      const menu = button('control-button', this.t(bypass ? 'fullscreen' : 'ha_menu'), 'mdi:menu');
      menu.onclick = () => {
        this.popupMotion.dismiss({ immediate: true, restoreFocus: false });
        this.pageChrome.toggleHomeAssistantMenu();
      };
      content.append(menu);
    }
  }

  async paintSetup() {
    const page = this.panel;
    const content = this.nodes.content;
    const status = make('p', 'setup-status', this.t('setup_loading'));
    status.setAttribute('role', 'status');
    content.className = 'setup-page';
    content.replaceChildren(status);
    const errorText = error => this.t(['setup_storage', 'setup_conflict'].includes(error.code) ? error.code : 'setup_error');
    try {
      const current = await loadConfiguration(this._hass, location.pathname);
      if (this.panel !== page) return;
      const editor = customElements.get('ll-strategy-dashboard-' + STRATEGY_NAME).getConfigElement();
      editor.classList.add('setup-editor');
      editor.setConfig(structuredClone(current.strategy));
      editor.hass = this._hass;
      this.setup = { editor };
      let draft = current.strategy;
      const save = button('control-button', this.t('setup_save'), 'mdi:content-save-outline');
      save.disabled = true;
      editor.addEventListener('config-changed', event => {
        draft = event.detail.config;
        save.disabled = JSON.stringify(draft) === JSON.stringify(current.strategy);
      });
      save.onclick = async () => {
        save.disabled = true;
        editor.inert = true;
        status.textContent = this.t('setup_saving');
        try {
          await saveConfiguration(this._hass, current, draft);
          location.reload();
        } catch (error) {
          if (this.panel !== page) return;
          status.textContent = errorText(error);
          editor.inert = false;
          save.disabled = error.code === 'setup_conflict';
        }
      };
      const footer = make('div', 'setup-footer');
      status.textContent = '';
      footer.append(status, save);
      content.replaceChildren(editor, footer);
    } catch (error) {
      if (this.panel === page) status.textContent = errorText(error);
    }
  }

  paintActivity() {
    const records = [...(this.activeDevices || new Map()).values()];
    const signature = JSON.stringify(records.map(({model,room})=>[model.entity,model.name,this.stateLabel(model),room.id]));
    if (signature === this.activitySignature) return;
    this.activitySignature = signature;
    const content = this.nodes.content;
    content.className = '';
    const list = make('ul', 'activity-list');
    for (const { model, room, config } of records) {
      const item = make('li');
      const el = button('control-button');
      el.append(make('span', '', model.name + ' · ' + room.name), make('span', '', this.stateLabel(model)));
      el.onclick = () => this.openPanel('device', el, room, config.entity);
      item.append(el);
      list.append(item);
    }
    content.replaceChildren(records.length ? list : make('p', 'empty', this.t('quiet')));
  }


  actionLabel(id) { return this.t(id === 'close' ? 'close_device' : id); }

  buildActions(view, model) {
    const active = this.shadowRoot.activeElement;
    const focused = active && view.group.contains(active) ? active.dataset.action : undefined;
    view.fields = [];
    const basic = make('div', 'basic-actions');
    const complex = [];
    view.special = buildPanelControls(model, { make, button, icon, label, t: key => this.t(key),
      request: (id, value, control) => this.requestAction(view.config, id, value, control) });
    for (const id of actionsInOrder) {
      const action = model.actions[id];
      if (!action || view.special.used.has(id) || (view.room && model.domain === 'cover' && id === 'set_position')) continue;
      if (action.color && this.panel?.type !== 'device') continue;
      if (action.color || rangeActions.has(id) || action.options || typeof action.min === 'number' ||
          ['set_temperature_range','start_timed'].includes(id)) {
        complex.push(this.buildField(view, action, id, model));
        continue;
      }
      const name = this.actionLabel(id);
      const control = button('control-button', name, controlIcons[id]);
      label(control, name);
      control.dataset.action = id;
      control.onclick = () => this.requestAction(view.config, id, undefined, control);
      basic.append(control);
    }
    view.group.replaceChildren(...(basic.childElementCount ? [basic] : []), ...view.special.content, ...complex);
    if (focused) {
      const successor = [...view.group.querySelectorAll('[data-action]')].find(el => el.dataset.action === focused);
      (successor || view.more).focus({ preventScroll: true });
    }
  }

  numberInput(action, type) {
    const input = make('input');
    input.type = type;
    for (const key of ['min','max','step']) if (typeof action[key] === 'number') input[key] = String(action[key]);
    if (type === 'number' && action.step == null) input.step = 'any';
    return input;
  }

  buildField(view, action, id, model) {
    const row = make('div', 'field-row');
    const title = id === 'start_timed' ? this.t('duration') : this.actionLabel(id);
    const caption = make('label', '', title);
    const isRange = rangeActions.has(id);
    const field = { action, id };
    if (action.options) {
      field.input = make('select');
      if (id === 'set_effect') {
        const placeholder = make('option', '', this.t('available_option'));
        placeholder.value = '';
        placeholder.disabled = true;
        field.input.append(placeholder);
      }
      for (const value of action.options) {
        const op = make('option', '', id === 'set_effect' ? value : this.t(value));
        op.value = value;
        field.input.append(op);
      }
    } else if (action.color) {
      field.input = make('input', 'light-color-choice');
      field.input.type = 'color';
      field.valid = parseLightColor;
    } else field.input = this.numberInput(action, isRange ? 'range' : 'number');
    if (id === 'set_effect') field.valid = Boolean;
    field.input.dataset.action = id;
    if (id === 'set_color_temp_kelvin') field.input.setAttribute('aria-label', title);
    caption.append(field.input);
    if (id === 'set_temperature_range') {
      field.input.setAttribute('aria-label', title + ' · ' +this.t('min'));
      field.second = this.numberInput(action, 'number');
      field.second.dataset.action = id;
      field.second.setAttribute('aria-label', title + ' · ' + this.t('max'));
      caption.append(field.second);
    }
    if (isRange) {
      field.output = make('output', 'duration-label');
      caption.append(field.output);
    }
    if (isRange) field.unit = id === 'set_color_temp_kelvin' ? ' K' : '%';
    const apply = button('control-button', id === 'start_timed' ? this.actionLabel(id) : this.t('apply'));
    field.apply = apply;
    const touched = () => {
      field.dirty = true;
      if (field.output) setText(field.output, field.input.value + field.unit);
      if (field.valid) apply.disabled = !field.valid(field.input.value) || !this.canRequest(view.config.entity, id);
    };
    field.input.addEventListener('input', touched);
    if (action.color) field.input.addEventListener('change', touched);
    field.second?.addEventListener('input', touched);
    apply.dataset.action = id;
    label(apply, id === 'start_timed' ? this.actionLabel(id) : this.t('apply') + ' · ' + title);
    apply.onclick = () => {
      const single = action.color || field.input.localName === 'select' ? field.input.value : field.input.valueAsNumber;
      const value = field.second ? { low: field.input.valueAsNumber, high: field.second.valueAsNumber } : single;
      this.requestAction(view.config, id, value, apply);
    };
    view.fields.push(field);
    this.syncField(field, model);
    row.append(caption, apply);
    return row;
  }

  syncField(field, model) {
    const { id, input, second, action } = field;
    const active = this.shadowRoot.activeElement;
    if (field.dirty || active === input || (second && active === second)) return;
    const attrs = model.attributes;
    if (second) {
      input.value = String(attrs.target_temp_low ?? action.min ?? 18);
      second.value = String(attrs.target_temp_high ?? action.max ?? 25);
    } else if (id === 'set_hvac_mode') input.value = model.state;
    else if (id === 'select_option') input.value = model.state;
    else if (id === 'start_timed') input.value = String(action.min ?? 15);
    else if (id === 'set_heating_level') input.value = String(number(model.level) ?? action.min);
    else if (id === 'set_brightness') {
      const brightness = number(attrs.brightness);
      input.value = String(brightness === null ? action.min ?? 0 : Math.round(brightness / 255 * 100));
    } else if (action.color) input.value = model.state === 'on' ? lightColorHex(attrs) || '#ffffff' : '#ffffff';
    else if (id === 'volume_set') input.value = String(Math.round((number(attrs.volume_level) ?? 0) * 100));
    else if (input.localName === 'select') input.value = attrs[stateKeys[id]] ?? input.options[0]?.value ?? '';
    else input.value = String(number(attrs[stateKeys[id]]) ?? action.min ?? 0);
    if (input.localName === 'select' && input.selectedIndex === -1) input.selectedIndex = 0;
    if (field.output) setText(field.output, input.value + field.unit);
  }

  canRequest(entity, id) {
    const previous = this.pending.get(entity);
    return !previous || (id === 'stop' && movement.has(previous.id));
  }

  requestAction(config, id, value, source, confirmShortcut = false) {
    if (!this.canRequest(config.entity, id)) return;
    const model = this.model(config);
    const action = model.actions[id];
    if (!action) return;
    if (!action.requiresConfirmation && !confirmShortcut) return action.requiresCode ? this.moreInfo(config) : this.send(config, id, value);
    this.confirming = { config, id, value, source, native: action.requiresCode };
    const n = this.nodes;
    setText(n.confirmText, action.confirmationText || this.t('confirm_action').replace('{name}', model.name).replace('{action}', this.actionLabel(id)));
    if (!n.confirm.open) n.confirm.showModal();
    n.abort.focus({ preventScroll: true });
  }

  acceptAction() {
    const request = this.confirming;
    if (!request || !this.nodes.confirm.open) return;
    this.nodes.confirm.close();
    if (request.native) return this.moreInfo(request.config);
    return this.send(request.config, request.id, request.value, true);
  }

  async send(config, id, value, confirmed = false) {
    if (!this.canRequest(config.entity, id)) return;
    const model = this.model(config);
    if (!model.actions[id]) return;
    const token = { id, value };
    this.pending.set(config.entity, token);
    this.announce(this.t('sending').replace('{name}', model.name));
    this.update();
    try {
      const result = await this.controller.execute(config, id, value, { confirmed });
      if (this.pending.get(config.entity) !== token) return;
      const key = ['confirmed','sent','unconfirmed'].includes(result?.status) ? result.status : 'sent';
      this.announce(this.t(key).replace('{name}', model.name));
      if (result?.status === 'confirmed') {
        for (const view of this.deviceViews) {
          if (view.config.entity !== config.entity) continue;
          for (const field of view.fields) if (field.id === id) field.dirty = false;
        }
      }
    } catch {
      if (this.pending.get(config.entity) === token) this.announce(this.t('send_error'));
    } finally {
      if (this.pending.get(config.entity) === token) {
        this.pending.delete(config.entity);
        if (this.isConnected) this.update();
      }
    }
  }

  announce(message) {
    if (!this.isConnected) return;
    clearTimeout(this.noticeTimer);
    const n = this.nodes;
    setText(n.pageNotice, '');
    setText(n.modalNotice, '');
    const target = n.modal.open ? n.modalNotice : n.pageNotice;
    setText(target, message);
    this.noticeTimer = setTimeout(() => setText(target, ''), 5200);
  }
}

if (!customElements.get('bayit-dashboard')) {
  customElements.define('bayit-dashboard', BayitDashboard);
  window.customCards ||= [];
  window.customCards.push({
    type: 'bayit-dashboard',
    name: 'Bayit 9',
    description: 'A room-based Home Assistant dashboard.',
    preview: false,
  });
}
