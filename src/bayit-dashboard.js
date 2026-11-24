import { styles } from './bayit-dashboard-style.js';
import { languages } from './bayit-dashboard-i18n.js';
import { createDeviceController, getDeviceModel } from './device-control.mjs';

export const backgrounds = Object.freeze(['aurora', 'lagoon', 'dunes', 'graphite']);
const options = { background: backgrounds, shape: ['soft', 'circle', 'square'], layout: ['classic', 'header'] };
const swatches = { aurora: '#63928a', lagoon: '#37728c', dunes: '#aa7356', graphite: '#596169' };
const iconPattern = /^mdi:[a-z0-9-]+$/;
const entityPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const controlIcons = {
  turn_on: 'mdi:power', turn_off: 'mdi:power', open: 'mdi:arrow-up', close: 'mdi:arrow-down',
  stop: 'mdi:stop', lock: 'mdi:lock-outline', unlock: 'mdi:lock-open-variant-outline',
  start_timed: 'mdi:timer-play-outline', stop_timed: 'mdi:timer-stop-outline',
};
const deviceIcons = {
  light:'mdi:lightbulb-outline', switch:'mdi:toggle-switch-outline', fan:'mdi:fan',
  cover:'mdi:blinds', climate:'mdi:thermostat', lock:'mdi:lock-outline',
  heater:'mdi:radiator', boiler:'mdi:water-boiler', water_heater:'mdi:water-boiler',
  sensor:'mdi:gauge', binary_sensor:'mdi:motion-sensor', calendar:'mdi:calendar-outline',
  person:'mdi:account-outline', vacuum:'mdi:robot-vacuum', camera:'mdi:cctv', media_player:'mdi:speaker',
};
const movement = new Set(['open','close','set_position']);
const rangeActions = new Set(['set_position', 'set_brightness', 'set_percentage']);
const stateKeys = {
  set_position: 'current_position', set_percentage: 'percentage', set_brightness: 'brightness',
  set_temperature: 'temperature', set_fan_mode: 'fan_mode', set_preset_mode: 'preset_mode',
  set_operation_mode: 'operation_mode',
};
const actionsInOrder = ['turn_on', 'turn_off', 'open', 'stop', 'close', 'lock', 'unlock',
  'set_position', 'set_brightness', 'set_percentage', 'set_hvac_mode', 'set_temperature',
  'set_temperature_range', 'set_fan_mode', 'set_preset_mode', 'set_operation_mode', 'start_timed', 'stop_timed'];
const statusNames = new Set(['on', 'off', 'open', 'closed', 'opening', 'closing', 'locked',
  'unlocked', 'locking', 'unlocking', 'jammed', 'cool', 'heat', 'heat_cool', 'dry', 'fan_only',
  'auto', 'idle', 'active', 'paused', 'playing', 'cleaning', 'docked', 'unavailable', 'unknown']);
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
      const entity = text(typeof item === 'string' ? item : item?.entity);
      if (!entityPattern.test(text(entity))) throw new Error('Invalid Home Assistant entity in Bayit 9.');
      if (unique.has(entity)) continue;
      const entry = { entity };
      if (text(item.name)) entry.name = text(item.name);
      if (iconPattern.test(text(item.icon))) entry.icon = item.icon;
      if (['heater', 'boiler'].includes(item.kind)) entry.kind = item.kind;
      if (item.timed && typeof item.timed === 'object' && !Array.isArray(item.timed)) entry.timed = { ...item.timed };
      unique.set(entity, entry);
    }
    return { id, name, icon: validIcon(room.icon, 'mdi:door-open'), entities: [...unique.values()] };
  });
  return {
    locale, rooms, title: text(config.title) || languages[locale].home,
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
      <div class="toolbar-actions">
        <button type="button" class="chrome-button" data-role="activity" aria-haspopup="dialog">
          <ha-icon icon="mdi:chart-box-outline" aria-hidden="true"></ha-icon>
          <span class="badge" hidden aria-hidden="true"></span>
        </button>
        <button type="button" class="chrome-button" data-role="settings" aria-haspopup="dialog">
          <ha-icon icon="mdi:cog-outline" aria-hidden="true"></ha-icon>
        </button>
      </div>
    </header>
    <div class="rooms" role="region"></div>
    <p class="empty"></p>
    <div class="notice" data-role="page-notice" role="status" aria-atomic="true"></div>
    <dialog class="modal">
      <header class="modal-header"><h2></h2>
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
    this.attachShadow({ mode: 'open' }).innerHTML = '<style>' + styles + '</style>' + layout;
    const get = selector => this.shadowRoot.querySelector(selector);
    const role = name => get('[data-role="' + name + '"]');
    this.nodes = {
      shell: get('.shell'), rooms: get('.rooms'), empty: get('.empty'), title: get('h1'),
      activity: role('activity'), badge: get('.badge'), settings: role('settings'), close: role('close'),
      modal: get('dialog:not(.confirm)'), modalTitle: get('dialog:not(.confirm) h2'),
      modalBody: get('dialog:not(.confirm) .modal-body'), content: role('content'),
      confirm: get('.confirm'), confirmTitle: get('.confirm h2'), confirmText: get('.confirmation-text'),
      accept: role('accept'), abort: role('abort'), pageNotice: role('page-notice'), modalNotice: role('modal-notice'),
    };
    const n = this.nodes;
    const prefix = 'bayit-9-' + ++nextId;
    n.modalTitle.id = prefix + '-title';
    n.modal.setAttribute('aria-labelledby', n.modalTitle.id);
    n.confirmTitle.id = prefix + '-confirm';
    n.confirmText.id = prefix + '-message';
    n.confirm.setAttribute('aria-labelledby', n.confirmTitle.id);
    n.confirm.setAttribute('aria-describedby', n.confirmText.id);
    n.settings.onclick = () => this.openPanel('settings', n.settings);
    n.activity.onclick = () => this.openPanel('activity', n.activity);
    n.close.onclick = () => n.modal.close();
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
          event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    this.roomViews = new Map();
    this.deviceViews = new Map();
    this.pending = new Map();
    this.roomScroll = new Map();
    this.preferences = {};
    this.controller = createDeviceController({ getHass: () => this._hass });
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
    if (this.nodes.modal.open) this.nodes.modal.close();
    this.config = next;
    this.words = languages[next.locale];
    const n = this.nodes;
    n.shell.lang = next.locale;
    n.shell.dir = next.locale === 'he' ? 'rtl' : 'ltr';
    setText(n.title, next.title);
    setText(n.empty, this.t('empty'));
    label(n.settings, this.t('settings'));
    label(n.activity, this.t('activity'));
    label(n.close, this.t('close'));
    n.rooms.setAttribute('aria-label', this.t('rooms'));
    setText(n.confirmTitle, this.t('confirm_title'));
    setText(n.abort, this.t('cancel'));
    setText(n.accept, this.t('confirm'));
    this.readPreferences();
    this.buildRooms();
    this.applyPreferences();
    this.update();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.isConnected || this.frame || !this.config) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  }

  connectedCallback() {
    window.addEventListener('storage', this.storageChange);
    this.update();
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this.storageChange);
    cancelAnimationFrame(this.frame);
    clearInterval(this.ticker);
    clearTimeout(this.noticeTimer);
    this.frame = this.ticker = 0;
    if (this.nodes.confirm.open) this.nodes.confirm.close();
    if (this.nodes.modal.open) this.nodes.modal.close();
  }

  t(key) { return this.words?.[key] || key; }

  readPreferences() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(this.config.storageKey) || '{}'); }
    catch { return; }
    this.preferences = {};
    for (const [key, choices] of Object.entries(options)) {
      if (choices.includes(saved?.[key])) this.preferences[key] = saved[key];
    }
  }

  applyPreferences() {
    for (const key of Object.keys(options)) this.nodes.shell.dataset[key] = this.preferences[key] || this.config[key];
    for (const {article,heading} of this.roomViews.values()) {
      if (this.nodes.shell.dataset.layout === 'header' && article.firstElementChild !== heading) article.prepend(heading);
      if (this.nodes.shell.dataset.layout !== 'header' && article.lastElementChild !== heading) article.append(heading);
    }
    if (this.panel?.type !== 'settings') return;
    for (const item of this.nodes.content.querySelectorAll('[data-preference]')) {
      item.setAttribute('aria-pressed', String(item.value === this.nodes.shell.dataset[item.dataset.preference]));
    }
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
      heading.append(icon(room.icon), make('span', '', room.name), chevron);
      heading.onclick = () => this.openPanel('room', heading, room);
      const status = make('div', 'room-status');
      const statusIcon = icon('mdi:power-standby');
      const statusText = make('span');
      status.append(statusIcon, statusText);
      const quick = make('div', 'quick');
      const shortcut = new Map();
      const weight = entry => +!['light','switch','fan','cover','lock','climate','water_heater'].includes(entry.entity.split('.')[0]);
      for (const config of [...room.entities].sort((a,b) => weight(a)-weight(b)).slice(0,2)) {
        const el = button('quick-button', config.name || config.entity, config.icon || 'mdi:information-outline', true);
        el.dataset.entity = config.entity;
        el.onclick = () => {
          const model = this.model(config);
          if (this.pending.has(config.entity) && model.domain !== 'cover') return;
          const direct = ['light','switch','fan'].includes(model.domain) && !config.timed?.start_script && !config.timed?.stop_script;
          const actionId = model.state === 'on' ? 'turn_off' : 'turn_on';
          if (direct && model.actions[actionId] && !model.actions[actionId].requiresConfirmation) {
            this.requestAction(config, actionId, undefined, el);
          } else this.openPanel('room', el, room, config.entity);
        };
        shortcut.set(config.entity, el);
        quick.append(el);
      }
      article.append(status, quick, heading);
      n.rooms.append(article);
      this.roomViews.set(room.id, { room, article, heading, status, statusIcon, statusText, shortcut });
    }
    n.empty.hidden = this.roomViews.size > 0;
  }

  tone(model) {
    if (!model.available) return 'quiet';
    if (model.domain === 'cover' && ['open','opening','closing'].includes(model.state)) return 'moving';
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

  update() {
    if (!this.config) return;
    const n = this.nodes;
    const active = new Map();
    for (const [id, view] of this.roomViews) {
      let count = 0;
      let unavailable = false;
      let temperature;
      for (const config of view.room.entities) {
        const model = this.model(config);
        const tone = this.tone(model);
        unavailable ||= !model.available;
        if (tone !== 'quiet') {
          count++;
          if (!active.has(config.entity)) active.set(config.entity, { config, model, room: view.room });
        }
        if (!temperature && model.available && model.attributes?.device_class === 'temperature') temperature = model;
        const shortcut = view.shortcut.get(config.entity);
        if (!shortcut) continue;
        setIcon(shortcut.firstElementChild, model.icon);
        label(shortcut, model.name + ' · ' + this.stateLabel(model));
        shortcut.dataset.tone = tone;
        shortcut.dataset.transition = ['opening','closing'].includes(model.state) ? model.state : '';
        const busy = this.pending.has(config.entity);
        shortcut.disabled = busy && model.domain !== 'cover';
        shortcut.setAttribute('aria-busy', String(busy));
      }
      setText(view.statusText, count ? count + ' ' + this.t('active') : temperature ? this.stateLabel(temperature) : this.t(unavailable ? 'unavailable' : 'quiet'));
      setIcon(view.statusIcon, count ? 'mdi:lightning-bolt-outline' : temperature ? 'mdi:thermometer' : unavailable ? 'mdi:alert-circle-outline' : 'mdi:power-standby');
      view.status.dataset.tone = count ? 'warm' : 'quiet';
      view.article.toggleAttribute('data-current', this.panel?.room?.id === id);
    }
    this.activeDevices = active;
    n.badge.hidden = !active.size;
    setText(n.badge, active.size);
    if (this.panel?.type === 'room') this.updateDevices();
    if (this.panel?.type === 'activity') this.paintActivity();
  }

  openPanel(type, source, room, entity) {
    if (!this.config) return;
    const n = this.nodes;
    const origin = source.getBoundingClientRect();
    if (!n.modal.open) this.restoreFocus = source;
    this.panel = { type, room };
    this.deviceViews.clear();
    this.activitySignature = null;
    setText(n.modalNotice, '');
    const glyph = type === 'room' ? room.icon : type === 'settings' ? 'mdi:cog-outline' : 'mdi:chart-box-outline';
    n.modalTitle.replaceChildren(icon(glyph), type === 'room' ? room.name : this.t(type));
    if (type === 'room') this.buildDevices(room);
    if (type === 'settings') this.paintSettings();
    if (type === 'activity') this.paintActivity();
    if (!n.modal.open) n.modal.showModal();
    const bounds = n.modal.getBoundingClientRect();
    const offset = (delta, size) => Math.max(0, Math.min(size, delta)) + 'px';
    n.modal.style.setProperty('--motion-x', offset(origin.left + origin.width / 2 - bounds.left, bounds.width));
    n.modal.style.setProperty('--motion-y', offset(origin.top + origin.height / 2 - bounds.top, bounds.height));
    n.close.focus({ preventScroll: true });
    n.modalBody.scrollTop = room ? this.roomScroll.get(room.id) || 0 : 0;
    const selected = this.deviceViews.get(entity)?.item;
    if (selected) n.modalBody.scrollTop += selected.getBoundingClientRect().top - n.modalBody.getBoundingClientRect().top - 12;
    this.update();
  }

  closePanel() {
    const n = this.nodes;
    if (n.modal.open) return;
    if (this.panel?.room) this.roomScroll.set(this.panel.room.id, n.modalBody.scrollTop);
    this.panel = null;
    this.deviceViews.clear();
    clearInterval(this.ticker);
    this.ticker = 0;
    this.update();
    const source = this.restoreFocus;
    this.restoreFocus = null;
    if (source?.isConnected) source.focus({ preventScroll: true });
  }

  buildDevices(room) {
    const content = this.nodes.content;
    content.className = 'devices';
    content.replaceChildren();
    if (!room.entities.length) content.append(make('p', 'empty', this.t('empty_room')));
    for (const config of room.entities) {
      const item = make('section', 'device');
      item.dataset.entity = config.entity;
      const head = make('header', 'device-head');
      const glyph = icon(config.icon || 'mdi:information-outline');
      glyph.className = 'device-icon';
      const details = make('div', 'device-detail');
      const name = make('h3', 'device-name');
      const state = make('span', 'current');
      details.append(name, state);
      const more = button('round-action', this.t('more_info'), 'mdi:information-outline', true);
      more.onclick = () => this.moreInfo(config);
      head.append(glyph, details, more);
      const group = make('div', 'action-list');
      item.append(head, group);
      content.append(item);
      this.deviceViews.set(config.entity, { config, item, glyph, name, state, more, group, fields: [] });
    }
    this.updateDevices();
  }

  moreInfo(config) {
    if (!this.model(config).actions.more_info) return;
    if (this.nodes.modal.open) {
      this.restoreFocus = null;
      this.nodes.modal.close();
    }
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      detail: { entityId: config.entity }, bubbles: true, composed: true,
    }));
  }

  timerLabel(timer) {
    if (!timer || ['idle','unavailable'].includes(timer.state)) return '';
    if (timer.remainingMs === null) return this.t(timer.state);
    const seconds = Math.max(0, Math.ceil(timer.remainingMs / 1000));
    return this.t('timed') + ' · ' + ltr(Math.floor(seconds/60) + ':' + String(seconds%60).padStart(2,'0'));
  }

  updateDevices() {
    let countdown = false;
    for (const view of this.deviceViews.values()) {
      const model = this.model(view.config);
      setText(view.name, model.name);
      setIcon(view.glyph, model.icon);
      const timing = this.timerLabel(model.timer);
      if (model.timer?.state === 'active') countdown = true;
      setText(view.state, this.stateLabel(model) + (timing ? ' · ' + timing : ''));
      view.state.dataset.tone = this.tone(model);
      view.more.hidden = !model.actions.more_info;
      const signature = JSON.stringify(actionsInOrder.map(id => model.actions[id] || null));
      if (signature !== view.signature) {
        view.signature = signature;
        this.buildActions(view, model);
      }
      const busy = this.pending.has(view.config.entity);
      view.item.setAttribute('aria-busy', String(busy));
      for (const control of view.group.querySelectorAll('button,input,select')) {
        control.disabled = !this.canRequest(view.config.entity, control.dataset.action);
      }
      for (const field of view.fields) this.syncField(field, model);
    }
    if (countdown && !this.ticker && this.isConnected) this.ticker = setInterval(() => this.updateDevices(), 1000);
    if (!countdown && this.ticker) { clearInterval(this.ticker); this.ticker = 0; }
  }

  paintSettings() {
    const content = this.nodes.content;
    content.className = 'settings';
    content.replaceChildren();
    for (const [key, values] of Object.entries(options)) {
      const group = make('fieldset', 'prefs-group');
      group.append(make('legend', '', this.t(key)));
      const choices = make('div', 'prefs-options');
      for (const value of values) {
        const el = button('control-button', this.t(value));
        if (key === 'background') {
          const swatch = make('span', 'swatch');
          swatch.style.background = swatches[value];
          swatch.setAttribute('aria-hidden', 'true');
          el.prepend(swatch);
        }
        el.value = value;
        el.dataset.preference = key;
        el.onclick = () => this.setPreference(key, value);
        choices.append(el);
      }
      group.append(choices);
      content.append(group);
    }
    this.applyPreferences();
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
      el.onclick = () => this.openPanel('room', el, room, config.entity);
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
    for (const id of actionsInOrder) {
      const action = model.actions[id];
      if (!action) continue;
      if (rangeActions.has(id) || action.options || typeof action.min === 'number' ||
          ['set_temperature_range','start_timed'].includes(id)) {
        complex.push(this.buildField(view, action, id, model));
        continue;
      }
      const control = button('control-button', this.actionLabel(id), controlIcons[id]);
      control.dataset.action = id;
      control.onclick = () => this.requestAction(view.config, id, undefined, control);
      basic.append(control);
    }
    view.group.replaceChildren(...(basic.childElementCount ? [basic] : []), ...complex);
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
      for (const value of action.options) {
        const op = make('option', '', this.t(value));
        op.value = value;
        field.input.append(op);
      }
    } else field.input = this.numberInput(action, isRange ? 'range' : 'number');
    field.input.dataset.action = id;
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
    const touched = () => {
      field.dirty = true;
      if (field.output) setText(field.output, field.input.value + '%');
    };
    field.input.addEventListener('input', touched);
    field.second?.addEventListener('input', touched);
    const apply = button('control-button', id === 'start_timed' ? this.actionLabel(id) : this.t('apply'));
    apply.dataset.action = id;
    label(apply, id === 'start_timed' ? this.actionLabel(id) : this.t('apply') + ' · ' + title);
    apply.onclick = () => {
      const single = field.input.localName === 'select' ? field.input.value : field.input.valueAsNumber;
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
    else if (id === 'start_timed') input.value = String(action.min ?? 15);
    else if (id === 'set_brightness') {
      const brightness = number(attrs.brightness);
      input.value = String(brightness === null ? action.min ?? 0 : Math.round(brightness / 255 * 100));
    } else if (input.localName === 'select') input.value = attrs[stateKeys[id]] ?? input.options[0]?.value ?? '';
    else input.value = String(number(attrs[stateKeys[id]]) ?? action.min ?? 0);
    if (input.localName === 'select' && input.selectedIndex === -1) input.selectedIndex = 0;
    if (field.output) setText(field.output, input.value + '%');
  }

  canRequest(entity, id) {
    const previous = this.pending.get(entity);
    return !previous || (id === 'stop' && movement.has(previous.id));
  }

  requestAction(config, id, value, source) {
    if (!this.canRequest(config.entity, id)) return;
    const model = this.model(config);
    const action = model.actions[id];
    if (!action) return;
    if (action.requiresCode) return this.moreInfo(config);
    if (!action.requiresConfirmation) return this.send(config, id, value);
    this.confirming = { config, id, value, source };
    const n = this.nodes;
    setText(n.confirmText, this.t('confirm_action').replace('{name}', model.name).replace('{action}', this.actionLabel(id)));
    if (!n.confirm.open) n.confirm.showModal();
    n.abort.focus({ preventScroll: true });
  }

  acceptAction() {
    const request = this.confirming;
    if (!request || !this.nodes.confirm.open) return;
    this.nodes.confirm.close();
    return this.send(request.config, request.id, request.value, true);
  }

  async send(config, id, value, confirmed = false) {
    if (!this.canRequest(config.entity, id)) return;
    const model = this.model(config);
    if (!model.actions[id]) return;
    const token = { id };
    this.pending.set(config.entity, token);
    this.announce(this.t('sending').replace('{name}', model.name));
    this.update();
    try {
      const result = await this.controller.execute(config, id, value, { confirmed });
      if (this.pending.get(config.entity) !== token) return;
      const key = ['confirmed','sent','unconfirmed'].includes(result?.status) ? result.status : 'sent';
      this.announce(this.t(key).replace('{name}', model.name));
      if (result?.status === 'confirmed') {
        for (const field of this.deviceViews.get(config.entity)?.fields || []) {
          if (field.id === id) field.dirty = false;
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
