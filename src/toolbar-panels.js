import { createOrefMap } from './oref-alert-map.js';
import { createVacuumMap } from './vacuum-map.js';
import { createNowPlaying, nowPlayingStyles } from './now-playing.js';
import { discoverOverviewEntities, isActiveOverviewEntity, isCompactAutomationActions, isCompactToolbarStatus, isReadingCards,
  isToolbarLightTile, isToolbarReadoutEntity, isToolbarReadouts, isVisibleEntity, isWeatherReadingsList } from './strategy-model.js';
import { mediaServiceRegistered } from './media-device-support.mjs';
import { compactRoomLockCommand, roomShutdownTargets } from './device-control.mjs';
import { calendarAgendaStyles, createCalendarAgenda } from './calendar-agenda.js';
import { bindDeviceDetails } from './popup-motion.js';
import { comparisonSources, createTemperatureComparison, temperatureComparisonStyles } from './temperature-comparison-view.js';
import { createHourlyWeather, hourlyWeatherStyles } from './hourly-weather.js';
import { createDailyWeather, createWeatherSummary, weatherSummaryStyles } from './weather-summary.js';

const sectionKeys = {
  actions: 'automations', locks: 'toolbar_locks', covers: 'room_covers', status: 'toolbar_status',
  people: 'presence', forecast: 'toolbar_forecast', sun: 'toolbar_sun', readings: 'toolbar_readings',
  electricity: 'toolbar_electricity', water: 'toolbar_water', devices: 'room_devices', media: 'media', vacuum: 'vacuum',
};

const domain = item => item.entity.split('.')[0];

function isPassiveWeatherReading(item) {
  return ['sensor', 'binary_sensor'].includes(domain(item)) &&
    (!item.role || item.role === 'status') && !item.graph_hours;
}

function sectionsFor(kind, entities) {
  const groups = new Map();
  for (const item of entities) {
    const type = domain(item);
    const section = kind === 'automations' ? 'actions'
      : kind === 'security' ? ({ lock: 'locks', cover: 'covers', script: 'actions' }[type] || 'status')
      : kind === 'presence' && type === 'person' ? 'people'
      : kind === 'weather' ? ({ weather: 'forecast', sun: 'sun' }[type] || 'readings')
      : kind === 'energy' ? 'electricity' : 'devices';
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(item);
  }
  return [...groups].map(([kind, entities]) => ({ kind, entities }));
}

function knownForecast(features) {
  if (!Number.isInteger(features)) return null;
  return [[1, 'daily'], [2, 'hourly'], [4, 'twice_daily']].find(([bit]) => (features & bit) === bit)?.[1] ?? null;
}

function localPortrait(path, origin) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return '';
  try {
    const url = new URL(path, origin);
    return url.origin === origin && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function createNativeCards(host, hass, make) {
  const cards = new Set();
  const view = host.ownerDocument.defaultView;
  let live = true;
  let helpersReady;

  function loadHelpers() {
    helpersReady ??= (async () => {
      const dialog = host.closest('dialog');
      if (dialog) {
        const frame = () => new Promise(resolve => view.requestAnimationFrame(resolve));
        // The fallback is usable immediately. Let the opening motion finish
        // before chart construction can monopolize the main thread.
        await frame();
        await Promise.allSettled((dialog.getAnimations?.() ?? []).map(animation => animation.finished));
        await frame();
        await frame();
      }
      if (live && (!dialog || dialog.open && !dialog.hasAttribute('data-closing'))) return view.loadCardHelpers?.();
    })();
    return helpersReady;
  }

  return {
    mount(config, fallback) {
      const slot = make('div', 'native-panel-card');
      if (fallback) slot.append(fallback);
      void (async () => {
        try {
          const helpers = await loadHelpers();
          if (!live) return;
          const card = await helpers?.createCardElement(config);
          if (!live || !card || card.localName === 'hui-error-card') return;
          card.hass = hass;
          cards.add(card);
          slot.replaceChildren(card);
        } catch { /* Keep the fallback if the native card cannot load. */ }
      })();
      return slot;
    },
    update(next) {
      if (!live || !next) return;
      hass = next;
      for (const card of cards) if (card.hass !== hass) card.hass = hass;
    },
    dispose() {
      live = false;
      for (const card of cards) card.remove();
      cards.clear();
    },
  };
}

export function sensorGraphConfig(item, { moreInfo = false } = {}) {
  return { type:'sensor', entity:item.entity, name:item.name, graph:'line', detail:2,
    hours_to_show:item.graph_hours || 24, tap_action:{action:moreInfo ? 'more-info' : 'none'} };
}

const lockPaletteStates = new Set(['locked', 'unlocked', 'locking', 'unlocking']);

function paintLockStatus(node, model) {
  if (model.available && lockPaletteStates.has(model.state)) node.dataset.lockState = model.state;
  else delete node.dataset.lockState;
}

export function createToolbarPanel(kind, configuration, context) {
  const { make, icon, button, label, t, modelFor, stateLabel, moreInfo, buildDevice,
    request, pending, host, dialog, graphDestination, openGraphDestination } = context;
  const handlers = [];
  const mediaViews = [];
  const comparisons = [];
  const weatherForecasts = [];
  const useLockPalette = ['overview', 'devices', 'security'].includes(kind);
  let live = true;
  let currentHass = context.hass;
  const native = createNativeCards(host, currentHass, make);
  const nativeCard = native.mount;
  const view = host.ownerDocument.defaultView;
  const format = settings => {
    try { return new Intl.DateTimeFormat(context.locale, { ...settings, timeZone:currentHass?.config?.time_zone }); }
    catch { return new Intl.DateTimeFormat(context.locale, settings); }
  };

  const amount = config => {
    const model = modelFor(config);
    return { model, state: model.state === 'home' ? t('person_home') : model.state === 'not_home' ? t('person_away') : stateLabel(model) };
  };

  function renderTile(item, itemKind, register = update => handlers.push(update), canActivate) {
    const tile = button('tile-row');
    const visual = make('span', 'tile-mark');
    const glyph = icon('mdi:information-outline');
    const name = make('span', 'tile-label');
    const state = make('span', 'tile-state');
    visual.append(glyph);
    let portrait;
    if (itemKind === 'person') {
      portrait = make('img', 'tile-portrait');
      portrait.alt = '';
      portrait.hidden = true;
      portrait.referrerPolicy = 'no-referrer';
      portrait.onerror = () => { portrait.hidden = true; };
      visual.append(portrait);
    }
    tile.append(visual, name, state);
    let action;
    tile.onclick = () => {
      if (canActivate && !canActivate(item.entity)) return;
      if (action) request(item, action, undefined, tile);
      else moreInfo(item, tile);
    };
    register(() => {
      const value = amount(item);
      const model = value.model;
      name.textContent = model.name;
      glyph.setAttribute('icon', model.icon);
      action = undefined;
      if (itemKind === 'action') {
        if (model.actions.run_script) action = 'run_script';
        else if (model.actions.press_button) action = 'press_button';
        else if (model.domain === 'lock') action = model.state === 'locked' ? 'unlock' : model.state === 'unlocked' ? 'lock' : undefined;
        else if (model.actions.turn_on && model.actions.turn_off) action = model.state === 'on' ? 'turn_off' : 'turn_on';
      }
      const showState = itemKind !== 'action' || !['script', 'button', 'input_button'].includes(model.domain) || (!model.available && !action);
      state.textContent = showState ? value.state : '';
      state.hidden = !showState;
      tile.dataset.tone = model.state === 'home' ? 'home' : model.state === 'on' ? 'active' : '';
      if (useLockPalette && model.domain === 'lock') paintLockStatus(tile, model);
      if (kind === 'automations' && itemKind === 'action' && model.domain === 'lock') {
        tile.toggleAttribute('data-automation-unlocked', model.available && model.state === 'unlocked');
      }
      tile.disabled = (itemKind === 'action' && pending(item.entity)) || (!action && !model.actions.more_info);
      tile.setAttribute('aria-busy', String(pending(item.entity)));
      label(tile, model.name + (showState ? ' · ' + value.state : ''));
      if (portrait) {
        const link = localPortrait(model.attributes.entity_picture, view.location.origin);
        if (!link) {
          portrait.hidden = true;
          portrait.removeAttribute('src');
        } else if (portrait.getAttribute('src') !== link) {
          portrait.onload = () => { if (live) portrait.hidden = false; };
          portrait.src = link;
        }
      }
    });
    return tile;
  }

  function renderWeatherReading(item) {
    const glyph = icon('mdi:information-outline');
    glyph.setAttribute('aria-hidden', 'true');
    const name = make('span', 'tile-label');
    const state = make('span', 'tile-state');
    state.dir = 'auto';
    const row = make('div', 'weather-reading');
    row.append(glyph, name, state);
    handlers.push(() => {
      const model = modelFor(item);
      glyph.setAttribute('icon', model.icon || 'mdi:information-outline');
      name.textContent = model.name;
      state.textContent = model.state === 'unknown' ? t('unknown') : stateLabel(model);
    });
    return row;
  }

  function renderReadout(item) {
    const glyph = icon('mdi:information-outline');
    glyph.setAttribute('aria-hidden', 'true');
    const name = make('span', 'tile-label');
    const state = make('span', 'tile-state');
    state.dir = 'auto';
    const vacuum = kind === 'vacuum';
    const tile = make('div', vacuum ? 'toolbar-readout' : 'toolbar-readout security-readout');
    const { state_labels: labels, unit, precision, danger_on: danger } = item.readout ?? {};
    const numericFormat = precision === undefined ? null : new Intl.NumberFormat(context.locale, {
      minimumFractionDigits: precision, maximumFractionDigits: precision, useGrouping: false,
    });
    tile.append(glyph, name, state);
    handlers.push(() => {
      const model = modelFor(item);
      const raw = model.state;
      const key = vacuum ? raw : typeof raw === 'string' ? raw.toLowerCase() : '';
      const custom = model.available && labels && Object.hasOwn(labels, key) ? labels[key] : undefined;
      glyph.setAttribute('icon', model.icon || 'mdi:information-outline');
      name.textContent = model.name;
      if (raw === 'unknown') state.textContent = t('unknown');
      else if (custom) state.textContent = custom;
      else if (model.available && (unit || numericFormat) &&
          /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) && Number.isFinite(Number(raw))) {
        const value = numericFormat ? numericFormat.format(Number(raw)) : raw;
        const suffix = unit ?? model.attributes.unit_of_measurement;
        state.textContent = suffix ? value + ' ' + suffix : value;
      } else state.textContent = stateLabel(model);
      tile.toggleAttribute('data-danger', model.available && raw === 'on' && danger === true);
    });
    return tile;
  }

  function renderMediaRemote(settings) {
    const panel = make('section', 'toolbar-section media-remote');
    panel.append(make('h3', 'toolbar-section-title', t('media_remote')));
    const empty = make('p', 'empty', t('media_remote_unavailable'));
    const profiles = Object.fromEntries(['transport', 'volume', 'power'].flatMap(role => {
      const entity = settings[role + '_entity'];
      return entity ? [[role, { entity, media_remote_role: role, media_remote_standby: settings.allow_standby }]] : [];
    }));
    const volumeDown = ['volume', 'mdi:volume-minus', 'volume_down'];
    const volumeUp = ['volume', 'mdi:volume-plus', 'volume_up'];
    const mute = [
      ['volume', 'mdi:volume-mute', 'mute'], ['volume', 'mdi:volume-high', 'unmute'],
    ];
    const rows = [
      ['transport', [
        ['transport', 'mdi:skip-previous', 'media_previous_track'],
        ['transport', 'mdi:play-pause', 'media_play_pause'],
        ['transport', 'mdi:skip-next', 'media_next_track'],
      ]],
      [profiles.volume ? 'volume' : 'power', profiles.power ? [
        ['power', 'mdi:power', 'turn_on', 'turn_off'], volumeDown, volumeUp, ...mute,
      ] : [volumeDown, ...mute, volumeUp]],
    ].flatMap(([groupRole, keys]) => {
      if (!profiles[groupRole]) return [];
      const group = make('div', 'media-remote-group');
      group.setAttribute('role', 'group');
      const controls = keys.flatMap(([role, glyph, ...actions]) => {
        const config = profiles[role];
        if (!config) return [];
        const { entity } = config;
        const power = role === 'power';
        const playPause = actions[0] === 'media_play_pause';
        const control = button('control-button media-remote-key', t(actions[0]), glyph, true);
        const symbol = playPause && control.querySelector('ha-icon');
        const playbackState = ({ state }) => playPause && (state === 'playing' || state === 'paused') ? state : undefined;
        const enabledAction = (hass, model) => {
          if (!isVisibleEntity(entity, hass?.states ?? {}, hass?.entities, context.hiddenEntities)) return;
          return actions.find(action => {
            const planned = model.actions[action];
            return planned && mediaServiceRegistered(hass, planned.service ?? action);
          });
        };
        let displayedAction;
        let displayedPlayback;
        control.onclick = () => {
          if (!displayedAction || pending(entity)) return;
          const model = modelFor(config);
          if (displayedPlayback === playbackState(model) && displayedAction === enabledAction(context.getHass(), model)) {
            request(config, displayedAction, undefined, control);
          }
        };
        const update = model => {
          displayedAction = enabledAction(currentHass, model);
          const waiting = pending(entity);
          control.hidden = !displayedAction;
          control.disabled = control.hidden || waiting;
          if (playPause) {
            const playback = displayedAction ? playbackState(model) : undefined;
            if (displayedPlayback !== playback) {
              displayedPlayback = playback;
              const playing = playback === 'playing';
              const paused = playback === 'paused';
              symbol.setAttribute('icon', playing ? 'mdi:pause' : paused ? 'mdi:play' : glyph);
              label(control, t(playing ? 'media_pause' : paused ? 'media_play' : 'media_play_pause'));
              control.toggleAttribute('data-playback-paused', paused);
            }
          }
          if (power) {
            label(control, t('media_power') + ' · ' + model.name);
            control.setAttribute('aria-pressed', String(displayedAction === 'turn_off'));
            control.setAttribute('aria-busy', String(waiting));
          }
          return !control.hidden;
        };
        return [{ role, control, update }];
      });
      group.append(...controls.map(({ control }) => control));
      panel.append(group);
      return [{ groupRole, group, controls }];
    });
    panel.append(empty);
    handlers.push(() => {
      const models = Object.fromEntries(Object.entries(profiles).map(([role, config]) => [role, modelFor(config)]));
      let available = false;
      for (const { groupRole, group, controls } of rows) {
        group.setAttribute('aria-label', models[groupRole].name);
        let shown = false;
        for (const { role, update } of controls) shown = update(models[role]) || shown;
        group.hidden = !shown;
        available ||= shown;
      }
      empty.hidden = available;
    });
    return panel;
  }

  function renderScriptToggle(item, compactActions) {
    const host = make('div', 'script-toggle');
    const controls = ['start_script', 'stop_script'].map(id => {
      const tile = button('tile-row');
      const mark = make('span', 'tile-mark');
      const glyph = icon(id === 'stop_script' ? 'mdi:stop' : item.icon || 'mdi:play');
      const name = make('span', 'tile-label');
      const caption = make('span', 'tile-state');
      mark.append(glyph);
      tile.append(mark, name, caption);
      host.append(tile);

      let revision;
      let gestureRevision;
      const capture = () => { gestureRevision = revision; };
      const clear = () => { gestureRevision = undefined; };
      tile.addEventListener('pointerdown', capture);
      tile.addEventListener('pointercancel', clear);
      tile.addEventListener('blur', clear);
      tile.addEventListener('keydown', event => {
        if (!event.repeat && ['Enter', ' '].includes(event.key)) capture();
      });
      tile.onclick = () => {
        const observed = gestureRevision ?? revision;
        clear();
        if (observed) request(item, id, observed, tile);
      };

      return (model, state, busy) => {
        const stopping = id === 'stop_script';
        revision = model.actions[id]?.scriptRevision;
        tile.hidden = stopping !== (model.state === 'on');
        tile.disabled = !revision || busy;
        tile.dataset.tone = stopping ? 'active' : '';
        tile.setAttribute('aria-busy', String(busy));
        name.textContent = model.name;
        caption.textContent = revision ? t(id) : state;
        caption.hidden = compactActions && !stopping && !busy && Boolean(revision);
        label(tile, model.name + ' · ' + caption.textContent);
      };
    });
    handlers.push(() => {
      const { model, state } = amount(item);
      const busy = pending(item.entity);
      for (const update of controls) update(model, state, busy);
    });
    return host;
  }

  function overviewLightsOff(section, caption) {
    const name = caption || t('room_lights');
    const control = button('control-button overview-lights-off', t('overview_lights_off'), 'mdi:lightbulb-off-outline');
    label(control, t('overview_lights_off') + ' · ' + name);
    let shown = [];
    let captured;
    const targetsFor = (devices, hass) => {
      const states = hass?.states ?? {};
      const lights = devices.filter(item => item.role === 'action' && domain(item) === 'light' &&
        states[item.entity]?.state === 'on' && isVisibleEntity(item.entity, states, hass?.entities, context.hiddenEntities));
      return [...new Set(roomShutdownTargets(lights, states))].sort();
    };
    const capture = () => { captured = shown; };
    const clear = () => { captured = undefined; };
    control.addEventListener('pointerdown', capture);
    control.addEventListener('pointercancel', clear);
    control.addEventListener('blur', clear);
    control.addEventListener('keydown', event => {
      if (!event.repeat && ['Enter', ' '].includes(event.key)) capture();
    });
    control.onclick = () => {
      const observed = captured ?? shown;
      clear();
      if (!live || !dialog?.open || dialog.hasAttribute('data-closing') || !control.isConnected || observed.length < 2) return;
      const hass = context.getHass();
      const devices = section.discover
        ? discoverOverviewEntities(section.discover, hass, context.hiddenEntities, context.locale)
        : section.entities;
      const latest = targetsFor(devices, hass);
      if (latest.length !== observed.length || latest.some((id, index) => id !== observed[index] || pending(id))) return;
      return context.turnOffEntities(latest, name);
    };
    return {
      control,
      update(devices) {
        shown = targetsFor(devices, currentHass);
        const busy = shown.some(pending);
        control.hidden = shown.length < 2;
        control.disabled = control.hidden || busy;
        control.setAttribute('aria-busy', String(busy));
      },
    };
  }

  function discoveredOverviewSection(panel, items, { discover: source, include_closing: includeClosing, entities }, lightsOff) {
    const tiles = new Map();
    const climateLabels = source.domain === 'climate' ? new Map(entities.map(item => [item.entity, item])) : undefined;
    const allowed = entity => isActiveOverviewEntity(entity, source, context.getHass(), context.hiddenEntities, includeClosing);
    handlers.push(() => {
      const devices = discoverOverviewEntities(source, currentHass, context.hiddenEntities, context.locale, includeClosing);
      const active = new Set(devices.map(item => item.entity));
      for (const [id, view] of tiles) {
        if (active.has(id)) continue;
        view.tile.remove();
        tiles.delete(id);
      }
      let cursor = items.firstElementChild;
      for (const device of devices) {
        const curated = climateLabels?.get(device.entity);
        const item = curated ? { ...device, name: curated.name ?? device.name, icon: curated.icon ?? device.icon } : device;
        let view = tiles.get(item.entity);
        if (!view) {
          view = { item };
          view.tile = renderTile(item, item.role, update => { view.update = update; }, allowed);
          tiles.set(item.entity, view);
        } else {
          view.item.name = item.name;
          view.item.icon = item.icon;
        }
        view.update();
        if (view.tile === cursor) cursor = cursor.nextElementSibling;
        else items.insertBefore(view.tile, cursor);
      }
      panel.hidden = devices.length === 0;
      lightsOff?.update(devices);
    });
  }

  function renderSun(item) {
    const card = make('div', 'sun-panel');
    const chart = make('div', 'sun-chart');
    const plot = make('div', 'sun-plot');
    const horizon = make('div', 'sun-horizon');
    const track = make('div', 'sun-marker-track');
    const marker = icon('mdi:white-balance-sunny');
    const scale = make('div', 'sun-scale');
    const legend = make('div', 'sun-legend', t('sun_horizon'));
    const readings = make('dl', 'sun-times');
    chart.setAttribute('aria-hidden', 'true');
    plot.dir = scale.dir = 'ltr';
    marker.hidden = true;
    track.append(marker);
    plot.append(horizon, track);
    for (const degrees of [0, 90, 180, 270, 360]) scale.append(make('span', '', degrees + '°'));
    chart.append(plot, scale, legend);
    const rows = [['sun_rise', 'next_rising'], ['sun_set', 'next_setting'], ['sun_dawn', 'next_dawn'],
      ['sun_dusk', 'next_dusk'], ['sun_next_noon', 'next_noon'],
      ['sun_azimuth', 'azimuth'], ['sun_elevation', 'elevation']].map(([labelKey, field]) => {
      const value = make('dd', '', '—');
      readings.append(make('dt', '', t(labelKey)), value);
      return { field, value };
    });
    handlers.push(() => {
      const { attributes, available } = modelFor(item);
      const formatter = format({ hour: '2-digit', minute: '2-digit', hourCycle:'h23' });
      const coordinate = (field, min, max) => {
        const value = attributes[field];
        return available && Number.isFinite(value) && value >= min && value <= max ? value : null;
      };
      const azimuth = coordinate('azimuth', 0, 360);
      const elevation = coordinate('elevation', -90, 90);
      marker.hidden = azimuth === null || elevation === null;
      if (!marker.hidden) {
        marker.style.setProperty('--sun-x', azimuth / 360 * 100 + '%');
        marker.style.setProperty('--sun-y', (90 - elevation) / 180 * 100 + '%');
        marker.toggleAttribute('data-below-horizon', elevation < 0);
      }
      for (const { field, value } of rows) {
        if (field === 'azimuth' || field === 'elevation') {
          const degrees = field === 'azimuth' ? azimuth : elevation;
          value.textContent = degrees === null ? '—' : Math.round(degrees) + '°';
          continue;
        }
        const raw = available ? attributes[field] : undefined;
        const date = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(raw) ? new Date(raw) : null;
        value.textContent = date && Number.isFinite(date.getTime()) ? formatter.format(date) : '—';
      }
    });
    card.append(chart, readings);
    return card;
  }

  function renderCompactLock(item) {
    const row = make('div', 'compact-status-lock');
    const securityLock = kind === 'security';
    const details = renderTile(item, 'status');
    bindDeviceDetails(details, () => moreInfo(item, details));
    const change = button('control-button compact-lock-action', t('lock'), 'mdi:lock-outline', true);
    const changeIcon = change.querySelector('ha-icon');
    const availableAction = model => {
      if (securityLock) {
        const hass = context.getHass();
        return isVisibleEntity(item.entity, hass?.states ?? {}, hass?.entities, context.hiddenEntities)
          ? compactRoomLockCommand(model) : undefined;
      }
      const action = model.state === 'locked' ? 'unlock' : model.state === 'unlocked' ? 'lock' : undefined;
      return action && model.actions[action] ? action : undefined;
    };
    change.onclick = () => {
      const action = availableAction(modelFor(item));
      if (action) request(item, action, undefined, change, securityLock ? { compactDevice:true } : undefined);
    };
    handlers.push(() => {
      const model = modelFor(item);
      const action = availableAction(model);
      const transitioning = securityLock && model.available && (model.state === 'locking' || model.state === 'unlocking');
      const busy = pending(item.entity) || transitioning;
      change.disabled = !action || busy;
      change.setAttribute('aria-busy', String(busy));
      const caption = action ? t(action) : securityLock ? stateLabel(model) : t('lock');
      label(change, caption + ' · ' + model.name);
      change.toggleAttribute('data-lock-transition', transitioning);
      changeIcon.setAttribute('icon', transitioning ? 'mdi:lock-clock'
        : action === 'unlock' ? 'mdi:lock-open-variant-outline' : 'mdi:lock-outline');
    });
    row.append(details, change);
    return row;
  }

  function renderEnergyReading(item) {
    const slot = make('div', 'energy-reading');
    const visible = hass => isVisibleEntity(item.entity, hass?.states ?? {}, hass?.entities, context.hiddenEntities);
    const fallback = renderTile(item, 'status', undefined, () => visible(context.getHass()));
    handlers.push(() => {
      slot.hidden = !visible(currentHass);
      if (slot.hidden || slot.firstChild) return;
      const card = nativeCard({
        type: 'sensor', entity: item.entity, name: item.name, icon: item.icon,
        tap_action: { action: 'more-info' }, hold_action: { action: 'none' }, double_tap_action: { action: 'none' },
      }, fallback);
      card.classList.add('reading-native-card');
      slot.append(card);
    });
    return slot;
  }

  function renderForecast(item) {
    const getState = () => currentHass?.states?.[item.entity];
    const fallback = () => renderTile(item, 'status', paint => {
      handlers.push(paint);
      paint();
    });
    const build = (mode, showCurrent = true) => nativeCard({
      type: 'weather-forecast', entity: item.entity, name: item.name, show_current: showCurrent,
      show_forecast: Boolean(mode), forecast_type: mode ?? 'daily', forecast_slots: 5, tap_action: { action: 'none' },
    }, fallback());
    if (!item.hourly_forecast) return build(knownForecast(getState()?.attributes?.supported_features));

    const region = make('div', 'weather-forecast-stack');
    const visible = (hass, entity) => isVisibleEntity(entity, hass?.states ?? {}, hass?.entities, context.hiddenEntities);
    const current = createWeatherSummary({
      make, icon, button, t, locale: context.locale, state: getState, fallbackState: () => amount(item).state,
      canOpen: () => visible(currentHass, item.entity) && modelFor(item).actions.more_info,
      onDetails: anchor => moreInfo(item, anchor),
    });
    const sunEntity = sections.find(section => section.kind === 'sun')?.entities
      .find(source => domain(source) === 'sun' && (!source.role || source.role === 'sun'))?.entity;
    const hourly = createHourlyWeather({
      entity: item.entity, sunEntity, make, icon, t, locale: context.locale,
      visible,
    });
    const daysView = createDailyWeather({ entity: item.entity, make, icon, t, locale: context.locale });
    const refreshCurrent = () => current.update(Date.now(), currentHass?.config?.time_zone);
    weatherForecasts.push({
      refreshTime() {
        refreshCurrent();
        hourly.refreshTime();
        daysView.refreshTime();
      },
      dispose() {
        hourly.dispose();
        daysView.dispose();
      },
    });
    const daily = make('div', 'weather-forecast-view');
    const views = new Map();
    function showDaily(mode) {
      if (daily.dataset.mode === mode) return;
      if (!mode) {
        delete daily.dataset.mode;
        daily.replaceChildren();
        return;
      }
      daily.dataset.mode = mode;
      if (!views.has(mode)) {
        const card = build(mode, false);
        card.setAttribute('role', 'group');
        card.setAttribute('aria-label', t(mode === 'daily' ? 'forecast_daily' : 'toolbar_forecast'));
        views.set(mode, card);
      }
      daily.replaceChildren(views.get(mode));
    }

    function update() {
      const state = getState();
      region.hidden = !visible(currentHass, item.entity);
      const features = !region.hidden && state && !['unknown', 'unavailable'].includes(state.state)
        ? state.attributes?.supported_features : undefined;
      const preferred = knownForecast(features);
      const days = preferred && preferred !== 'hourly' ? preferred : undefined;
      const customDaily = days === 'daily' && typeof currentHass?.connection?.subscribeMessage === 'function';
      refreshCurrent();
      hourly.update(currentHass);
      showDaily(customDaily ? undefined : days);
      daysView.update(currentHass, customDaily);
    }

    region.append(current.root, hourly.root, daysView.root, daily);
    handlers.push(update);
    update();
    return region;
  }

  function render(item, section, { compactStatus, readingCards, compactActions }) {
    const itemKind = item.role ?? ({ people: 'person', actions: 'action', forecast: 'forecast', sun: 'sun' }[section]);
    if (itemKind === 'person' && domain(item) === 'person') return renderTile(item, 'person');
    if (item.command === 'toggle_script') return renderScriptToggle(item, compactActions);
    if (itemKind === 'action' || (section === 'actions' && itemKind === 'lock')) return renderTile(item, 'action');
    if (compactStatus && itemKind === 'lock' && domain(item) === 'lock') return renderCompactLock(item);
    if (itemKind === 'forecast' && domain(item) === 'weather') return renderForecast(item);
    if (itemKind === 'sun' && domain(item) === 'sun') return renderSun(item);
    if (kind === 'calendar' && domain(item) === 'calendar') {
      return nativeCard({ type: 'calendar', entities: [item.entity], initial_view: 'listWeek' }, renderTile(item, 'status'));
    }
    if (domain(item) === 'sensor' && (item.graph_hours || itemKind === 'graph')) {
      const moreInfo = compactStatus || kind === 'weather' && section === 'readings' ||
        kind === 'energy' && (section === 'electricity' || section === 'water');
      const config = sensorGraphConfig(item, { moreInfo });
      const fallback = renderTile(item, 'status');
      if (readingCards && kind === 'weather') fallback.classList.add('weather-history-value');
      const destination = itemKind === 'graph' && graphDestination?.(item);
      if (destination) {
        config.tap_action = { action: 'fire-dom-event', bayit_graph_link: true };
        config.hold_action = { action: 'none' };
        config.double_tap_action = { action: 'none' };
      }
      const chart = nativeCard(config, fallback);
      if (readingCards) chart.classList.add('reading-native-card');
      if (!destination) return chart;
      const open = () => openGraphDestination(destination, chart);
      fallback.onclick = open;
      chart.addEventListener('ll-custom', event => {
        if (event.target !== chart.firstElementChild || event.detail?.bayit_graph_link !== true) return;
        event.stopPropagation();
        open();
      });
      return chart;
    }
    if (readingCards && kind === 'energy' && domain(item) === 'sensor' && itemKind === 'status') return renderEnergyReading(item);
    const nowPlaying = itemKind === 'now_playing' && domain(item) === 'media_player';
    const toolbarLightTile = isToolbarLightTile(kind, section, item);
    const toolbarCoverRail = kind === 'security' && section === 'covers' && domain(item) === 'cover' && itemKind !== 'status';
    if (nowPlaying || toolbarLightTile || itemKind === 'device' ||
        (['locks','covers','devices','media','vacuum'].includes(section) && itemKind !== 'status')) {
      const row = make('div', 'toolbar-device');
      row.toggleAttribute('data-light-tile', toolbarLightTile);
      row.toggleAttribute('data-cover-rail', toolbarCoverRail);
      if (nowPlaying) {
        const player = createNowPlaying({ host: row, dialog, make, icon, t });
        mediaViews.push(player);
        handlers.push(() => player.update(modelFor(item)));
      }
      buildDevice(item, row, { toolbarLightTile, toolbarCoverRail });
      if (useLockPalette && domain(item) === 'lock') handlers.push(() => paintLockStatus(row, modelFor(item)));
      return row;
    }
    return renderTile(item, 'status');
  }

  const sections = configuration.sections ?? sectionsFor(kind, configuration.entities);
  if (kind === 'media' && configuration.mediaStage) {
    const { source_entity: entity, fallback_icon: fallbackIcon } = configuration.mediaStage;
    const stage = createNowPlaying({ host, dialog, make, icon, t, artworkStage: true, fallbackIcon });
    mediaViews.push(stage);
    handlers.push(() => {
      const visible = isVisibleEntity(entity, currentHass?.states ?? {}, currentHass?.entities, context.hiddenEntities);
      stage.update(visible ? modelFor({ entity }) : { available: false });
    });
  }
  if (kind === 'media' && configuration.mediaRemote) host.append(renderMediaRemote(configuration.mediaRemote));
  const calendarItems = kind === 'calendar' ? sections.flatMap(section => section.entities).filter(item => domain(item) === 'calendar') : [];
  let calendarAgenda;
  if (kind === 'calendar' && configuration.calendarAgenda?.enabled) {
    calendarAgenda = createCalendarAgenda({ host, context, items:calendarItems, settings:configuration.calendarAgenda });
  } else if (calendarItems.length) {
    const fallback = make('div','toolbar-section-items');
    for (const item of calendarItems) fallback.append(renderTile(item,'status'));
    host.append(nativeCard({type:'calendar', entities:[...new Set(calendarItems.map(item=>item.entity))], initial_view:'listWeek'},fallback));
  }
  const forecastPages = new Map();
  const detailedForecast = kind === 'weather' && sections.some(section =>
    section.kind === 'forecast' && section.entities.some(item => item.hourly_forecast));
  const beforeMap = configuration.vacuumMap?.before_section;
  let vacuumMapAnchor;
  let forecastClock;
  let clockTimer;
  const updateClock = () => {
    const now = new Date();
    if (forecastClock) {
      forecastClock.firstChild.textContent = format({hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
      forecastClock.lastChild.textContent = format({weekday:'long',day:'numeric',month:'long'}).format(now);
    }
    for (const forecast of weatherForecasts) forecast.refreshTime();
  };
  for (const section of sections) {
    if (!section.entities.length && !section.discover) continue;
    if (calendarItems.length && section.entities.every(item => domain(item) === 'calendar')) continue;
    const panel = make('section', 'toolbar-section');
    panel.dataset.section = section.kind;
    panel.toggleAttribute('data-security-section', kind === 'security');
    const compactStatus = isCompactToolbarStatus(kind, section);
    const readouts = isToolbarReadouts(kind, section);
    const weatherReadings = isWeatherReadingsList(kind, section);
    const readingCards = isReadingCards(kind, section);
    const compactActions = isCompactAutomationActions(kind, section);
    if (compactStatus || readouts || weatherReadings || readingCards || compactActions) {
      panel.dataset.layout = section.layout;
    }
    if (kind === 'overview' && !compactStatus && section.filter === 'active' &&
        ['status', 'covers'].includes(section.kind)) panel.dataset.overviewActiveRows = '';
    const caption = section.title ?? t(sectionKeys[section.kind] ?? 'room_devices');
    const lightsOff = section.turn_off_active_lights ? overviewLightsOff(section, caption) : undefined;
    const heading = lightsOff ? make('div', 'overview-active-heading') : panel;
    if (caption) heading.append(make('h3', 'toolbar-section-title', caption));
    if (lightsOff) {
      heading.append(lightsOff.control);
      panel.append(heading);
    }
    const items = make('div', 'toolbar-section-items');
    if (section.discover) discoveredOverviewSection(panel, items, section, lightsOff);
    else if (section.kind === 'series') {
      const visible = (entity, hass) => isVisibleEntity(entity, hass?.states ?? {}, hass?.entities, context.hiddenEntities);
      const optIn = kind === 'sensors' && dialog && section.comparison?.enabled === true;
      const sources = optIn && comparisonSources(section.entities, currentHass, visible, section.comparison);
      if (sources) {
        comparisons.push(createTemperatureComparison({ host:items, dialog, context, sources, settings:section.comparison, visible }));
      } else {
        const fallback = make('div','toolbar-section-items');
        const selected = optIn ? section.entities.filter(item => visible(item.entity, currentHass)) : section.entities;
        for (const item of selected) fallback.append(renderTile(item, 'status'));
        if (selected.length) items.append(nativeCard({ type:'history-graph',
          hours_to_show:optIn ? section.comparison.hours : selected.find(item => item.graph_hours)?.graph_hours ?? 24,
          entities:selected.map(item => ({ entity:item.entity, name:item.name })), }, fallback));
      }
    } else {
      const pairs = section.entities.filter(item=>!calendarItems.length || domain(item)!=='calendar')
        .map(item => {
          if (weatherReadings && isPassiveWeatherReading(item)) return { item, node: renderWeatherReading(item) };
          if (readouts && isToolbarReadoutEntity(kind, item)) return { item, node: renderReadout(item) };
          return { item, node: render(item, section.kind, { compactStatus, readingCards, compactActions }) };
        });
      items.append(...pairs.map(pair=>pair.node));
      if (section.filter === 'active') handlers.push(() => {
        const visible = [];
        for (const {node, item} of pairs) {
          const model = modelFor(item);
          const active = model.available && (model.domain === 'climate' ? model.state !== 'off'
            : model.domain === 'cover' ? model.state !== 'closed' && (section.include_closing || model.state !== 'closing')
              : model.state === 'on');
          node.hidden = !active;
          if (active) visible.push(item);
        }
        panel.hidden = visible.length === 0;
        lightsOff?.update(visible);
      });
    }
    panel.append(items);
    host.append(panel);
    if (beforeMap && beforeMap === section.id) vacuumMapAnchor = panel;
    if (kind === 'weather' && ['forecast', 'sun'].includes(section.kind)) forecastPages.set(section.kind, panel);
    if (kind === 'weather' && section.kind === 'forecast' && !clockTimer) {
      if (!detailedForecast) {
        forecastClock = make('div','forecast-clock');
        forecastClock.append(make('strong'),make('span'));
        panel.insertBefore(forecastClock, items);
      }
      updateClock();
      clockTimer = view.setInterval(updateClock,30000);
    }
  }
  if (forecastPages.size === 2) {
    const tabs = make('div', detailedForecast ? 'weather-page-dots' : 'weather-tabs');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', t('weather'));
    const buttons = new Map();
    const pages = [...forecastPages.keys()];
    let active = 'forecast';
    const selectPage = key => {
      active = key;
      for (const [name, section] of forecastPages) section.hidden = name !== key;
      for (const [name, tab] of buttons) tab.setAttribute('aria-pressed', String(name === key));
    };
    let touch;
    for (const [key, panel] of forecastPages) {
      const tab = button(detailedForecast ? 'weather-page-dot' : 'control-button', t(sectionKeys[key]), null, detailedForecast);
      tab.onclick = () => selectPage(key);
      buttons.set(key, tab);
      tabs.append(tab);
      panel.dataset.weatherSwipe = '';
      panel.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch') return;
        touch = event.isPrimary && !event.composedPath().some(node =>
          node.matches?.('button, a, input, select, textarea, [contenteditable], [role="button"], [data-weather-forecast-scroll]'))
          ? { id: event.pointerId, x: event.clientX, y: event.clientY } : undefined;
      });
      panel.addEventListener('pointercancel', () => { touch = undefined; });
      panel.addEventListener('pointerup', event => {
        if (event.pointerType !== 'touch' || touch?.id !== event.pointerId) return;
        const dx = event.clientX - touch.x;
        const dy = event.clientY - touch.y;
        touch = undefined;
        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const step = Math.sign(context.locale === 'he' ? dx : -dx);
        const next = pages[pages.indexOf(active) + step];
        if (next) selectPage(next);
      });
    }
    selectPage(active);
    if (detailedForecast) {
      const pager = make('div', 'toolbar-section weather-pager');
      const panels = [...forecastPages.values()];
      panels[0].before(pager);
      pager.append(...panels, tabs);
    } else host.prepend(tabs);
  }
  if (kind === 'energy' && configuration.energyDashboardLink !== false && currentHass?.panels?.energy) {
    const energy = make('a', 'control-button toolbar-link', t('open_energy'));
    energy.href = '/energy';
    host.append(energy);
  }
  let orefMap;
  if (kind === 'security' && dialog && configuration.orefMap?.enabled === true) {
    const panel = make('section', 'toolbar-section');
    panel.dataset.section = 'oref-map';
    panel.append(make('h3', 'toolbar-section-title', t('oref_map')));
    const fallback = make('p', 'empty', t('oref_map_unavailable'));
    fallback.setAttribute('role', 'status');
    const slot = make('div', 'native-panel-card');
    slot.append(fallback);
    panel.append(slot);
    host.append(panel);
    orefMap = createOrefMap({
      slot, dialog, fallback, loadingText: t('oref_map_loading'), options: configuration.orefMap,
    });
  }
  let vacuumMap;
  if (kind === 'vacuum' && dialog && configuration.vacuumMap) {
    const panel = make('section', 'toolbar-section');
    panel.dataset.section = 'vacuum-map';
    panel.append(make('h3', 'toolbar-section-title', t('vacuum_map')));
    const body = make('div', 'toolbar-section-items');
    panel.append(body);
    host.insertBefore(panel, vacuumMapAnchor ?? null);
    vacuumMap = createVacuumMap({ host: body, dialog, config: configuration.vacuumMap, context });
  }
  if (!host.childElementCount) host.append(make('p', 'empty', t('empty_room')));
  const quiet = sections.length && sections.every(section => section.filter === 'active') ? make('p','empty',t('quiet')) : null;
  if (quiet) host.append(quiet);

  return {
    update(hass) {
      if (!live || !hass) return;
      currentHass = hass;
      native.update(hass);
      orefMap?.update(hass);
      vacuumMap?.update(hass);
      calendarAgenda?.update(hass);
      for (const comparison of comparisons) comparison.update(hass);
      for (const update of handlers) update();
      if (quiet) quiet.hidden = !!host.querySelector('.toolbar-section:not([hidden])');
    },
    dispose() {
      live = false;
      orefMap?.dispose();
      vacuumMap?.dispose();
      calendarAgenda?.dispose();
      for (const player of mediaViews) player.dispose();
      for (const comparison of comparisons) comparison.dispose();
      for (const forecast of weatherForecasts) forecast.dispose();
      if (clockTimer) view.clearInterval(clockTimer);
      native.dispose();
    },
  };
}

export const toolbarPanelStyles = nowPlayingStyles + calendarAgendaStyles + temperatureComparisonStyles +
  hourlyWeatherStyles + weatherSummaryStyles + `
  .toolbar-panes, .toolbar-section-items { display: grid; gap: 8px; min-width: 0; }
  .toolbar-section { min-width: 0; border: 1px solid var(--soft-line); border-radius: 13px; padding: 8px; }
  .toolbar-section-title { margin: 0 0 8px; text-align: center; font-size: 14px; }
  .overview-active-heading:has(.overview-lights-off:not([hidden])) {
    display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-block-end: 4px;
  }
  .overview-active-heading:has(.overview-lights-off:not([hidden])) > .toolbar-section-title {
    flex: 1; min-width: 0; margin: 0; text-align: start; overflow-wrap: anywhere;
  }
  .overview-lights-off { min-height: 44px; min-width: 44px; flex: none; }
  .media-remote-group { display: grid; grid-template-columns: repeat(auto-fit,minmax(44px,1fr)); gap: 8px; direction: ltr; }
  .media-remote-group:not([hidden]) + .media-remote-group { margin-block-start: 8px; }
  .media-remote-group[hidden], .media-remote-key[hidden] { display: none; }
  .media-remote-key { min-height: 44px; justify-content: center; }
  .media-remote-group > .media-remote-key[aria-pressed=true],
  .media-remote-key[data-playback-paused] {
    color: var(--moving); border-color: var(--moving); box-shadow: none;
  }
  .media-remote-key[data-playback-paused] { background: color-mix(in srgb,var(--moving) 16%,var(--control)); }
  .toolbar-section:is([data-section=actions],[data-section=people],[data-section=electricity],[data-section=water],[data-section=readings]) .toolbar-section-items {
    grid-template-columns: repeat(2,minmax(0,1fr));
  }
  .toolbar-section[data-layout=compact] > .toolbar-section-items {
    direction: ltr;
    grid-template-columns: repeat(auto-fit,minmax(min(100%,max(110px,calc((100% - 8px) / 2))),1fr));
  }
  .shell[dir=rtl] .toolbar-section[data-layout=compact] > .toolbar-section-items > * { direction: rtl; }
  .toolbar-section[data-security-section][data-section=actions]:has(> .toolbar-section-items > .tile-row:only-child) {
    border: 0; padding: 0;
  }
  .toolbar-section[data-security-section][data-section=actions] > .toolbar-section-items > .tile-row:only-child {
    grid-column: 1 / -1; min-height: 60px; gap: 2px;
  }
  .toolbar-section[data-security-section][data-section=actions] .tile-row:only-child > .tile-mark {
    width: 24px; height: 24px; background: transparent;
  }
  .toolbar-section[data-security-section][data-section=covers] > .toolbar-section-items { direction: ltr; }
  .shell[dir=rtl] .toolbar-section[data-security-section][data-section=covers] > .toolbar-section-items > * { direction: rtl; }
  .toolbar-section[data-layout=reading-cards] > .toolbar-section-items { direction: ltr; }
  .toolbar-section[data-section=readings][data-layout=reading-cards] { border: 0; padding: 0; }
  .shell[dir=rtl] .toolbar-section[data-layout=reading-cards] > .toolbar-section-items > * { direction: rtl; }
  .toolbar-section[data-layout=reading-cards] > .toolbar-section-title {
    color: var(--secondary); font-size: 13px; font-weight: 700;
  }
  .toolbar-section[data-layout=compact-actions] { border: 0; padding: 8px 4px 2px; }
  .toolbar-section[data-layout=compact-actions]:has(> .toolbar-section-title) { padding-block-start: 18px; }
  .toolbar-section[data-layout=compact-actions] > .toolbar-section-title { margin-block-end: 14px; }
  .toolbar-section[data-layout=compact-actions] > .toolbar-section-items { direction: ltr; }
  .shell[dir=rtl] .toolbar-section[data-layout=compact-actions] :is(.tile-label,.tile-state) { direction: rtl; text-align: end; }
  .toolbar-section[data-layout=readings-list] > .toolbar-section-items { row-gap: 0; }
  .toolbar-section[data-layout=readings-list] > .toolbar-section-items > :not(.weather-reading) {
    margin-block: 4px;
  }
  .weather-reading {
    display: grid; grid-column: 1 / -1; grid-template-columns: 22px minmax(0,1fr) fit-content(45%);
    align-items: center; gap: 8px; box-sizing: border-box; min-width: 0; min-height: 36px; padding: 4px 6px;
  }
  .weather-reading + .weather-reading { border-block-start: 1px solid var(--soft-line); }
  .weather-reading > ha-icon { width: 20px; height: 20px; --mdc-icon-size: 20px; color: var(--secondary); }
  .weather-reading > .tile-state { justify-self: end; }
  .toolbar-section[data-layout=readouts] > .toolbar-section-items {
    --readout-width: calc((100% - 18px) / 4);
    grid-template-columns: repeat(auto-fit,minmax(min(100%,max(60px,var(--readout-width))),1fr)); gap: 6px;
  }
  .toolbar-section[data-layout=readouts] > .toolbar-section-items > :not(.toolbar-readout) { grid-column: 1 / -1; }
  .toolbar-readout {
    display: grid; box-sizing: border-box; justify-items: center; align-content: center; gap: 3px; min-width: 0; min-height: 62px;
    padding: 5px 4px; border: 1px solid var(--soft-line); border-radius: 8px; background: var(--control); text-align: center;
  }
  .toolbar-readout ha-icon { display: block; --mdc-icon-size: 18px; width: 18px; height: 18px; color: var(--secondary); }
  .toolbar-readout :is(.tile-label,.tile-state) { font-size: 11px; line-height: 1.15; }
  .toolbar-readout[data-danger] { border-color: rgba(255,187,187,.42); background: rgba(255,146,151,.16); }
  .toolbar-readout[data-danger] :is(ha-icon,.tile-state) { color: var(--critical); }
  @media (max-width: 350px) {
    .toolbar-section[data-layout=readouts] > .toolbar-section-items { --readout-width: calc((100% - 6px) / 2); }
  }
  .compact-status-lock {
    display: grid; grid-template-columns: minmax(0,1fr) 44px; gap: 2px; align-items: center; min-width: 0;
    padding-inline: 3px; border: 1px solid var(--soft-line); border-radius: 12px; background: var(--control);
  }
  .compact-status-lock > .tile-row { min-width: 0; padding-inline: 2px; border: 0; background: transparent; }
  .compact-status-lock .tile-mark { width: 28px; height: 28px; }
  .compact-lock-action { padding: 4px; }
  .toolbar-section[data-security-section][data-section=locks][data-layout=compact] .compact-status-lock {
    grid-template-columns: minmax(0,1fr); grid-template-rows: minmax(44px,auto) auto; gap: 3px; padding: 5px;
  }
  .toolbar-section[data-security-section][data-section=locks][data-layout=compact] .compact-status-lock > .tile-row {
    direction: ltr; grid-template-columns: 32px minmax(0,1fr); grid-template-areas: "icon label" "icon state";
    justify-items: start; align-content: center; align-items: center; gap: 3px 6px; min-height: 44px;
    padding: 3px 2px; text-align: left;
  }
  .toolbar-section[data-security-section][data-section=locks] .compact-status-lock > .tile-row > .tile-mark { grid-area: icon; }
  .toolbar-section[data-security-section][data-section=locks] .compact-status-lock > .tile-row > .tile-label { grid-area: label; }
  .toolbar-section[data-security-section][data-section=locks] .compact-status-lock > .tile-row > .tile-state { grid-area: state; }
  .toolbar-section[data-security-section][data-section=locks] .compact-status-lock > .tile-row > :is(.tile-label,.tile-state) {
    unicode-bidi: plaintext;
  }
  .toolbar-section[data-security-section][data-section=locks] .compact-status-lock > .compact-lock-action {
    width: 100%; border-radius: 10px; background: var(--glass);
  }
  .compact-lock-action[data-lock-transition]:disabled { color: var(--lock-pending-ink,#fbbf24); opacity: 1; }
  .tile-row { display: grid; justify-items: center; align-content: center; gap: 5px; min-height: 80px; width: 100%;
    padding: 8px 6px; border: 1px solid var(--soft-line); border-radius: 12px; background: var(--control); text-align: center; }
  .toolbar-section[data-layout=compact-actions] :is(.toolbar-section-items,.script-toggle) > .tile-row {
    grid-template-columns: 25px minmax(0,1fr); grid-template-areas: "icon label" "icon state";
    justify-items: start; align-items: center; gap: 1px 9px; min-height: 56px; padding: 5px 12px;
    text-align: start;
  }
  .toolbar-section[data-layout=compact-actions] .tile-row:has(.tile-state[hidden]) { grid-template-areas: "icon label"; }
  .toolbar-section[data-layout=compact-actions] .tile-mark {
    grid-area: icon; width: 25px; height: 21px; background: transparent;
  }
  .toolbar-section[data-layout=compact-actions] .tile-mark > ha-icon { --mdc-icon-size: 21px; width: 21px; height: 21px; }
  .toolbar-section[data-layout=compact-actions] .tile-label { grid-area: label; line-height: 1.15; }
  .toolbar-section[data-layout=compact-actions] .tile-state { grid-area: state; line-height: 1.15; font-size: 11px; }
  .tile-row[data-automation-unlocked] {
    background: rgba(255,133,133,.22); border-color: rgba(255,133,133,.38);
  }
  .tile-row[data-automation-unlocked] .tile-mark > ha-icon { color: var(--lock-unlocked-ink,#ff8585); }
  .script-toggle > .tile-row[hidden] { display: none; }
  .tile-mark { display: grid; place-items: center; position: relative; border-radius: 50%; width: 34px; height: 34px; background: var(--glass); }
  .tile-portrait { position: absolute; inset: 0; object-fit: cover; width: 100%; height: 100%; border-radius: inherit; }
  .tile-row:is([data-tone=home],[data-tone=active]) .tile-mark { color: var(--warm); }
  .modal[data-wallpaper-ink=dark] {
    --lock-locked-ink: var(--moving); --lock-unlocked-ink: var(--critical); --lock-pending-ink: var(--warm);
  }
  [data-lock-state=locked] { --lock-state-ink: var(--lock-locked-ink,#60a5fa); }
  [data-lock-state=unlocked] { --lock-state-ink: var(--lock-unlocked-ink,#ef4444); }
  :is([data-lock-state=locking],[data-lock-state=unlocking]) { --lock-state-ink: var(--lock-pending-ink,#fbbf24); }
  .tile-row[data-lock-state] .tile-mark > ha-icon,
  .toolbar-device[data-lock-state] .device-icon { color: var(--lock-state-ink); }
  .tile-label { font-size: 13px; font-weight: 740; width: 100%; overflow-wrap: anywhere; }
  .tile-state { font-size: 12px; color: var(--secondary); overflow-wrap: anywhere; min-width: 0; }
  [data-overview-active-rows] > .toolbar-section-items { gap: 4px; }
  [data-overview-active-rows] > .toolbar-section-items > .tile-row {
    grid-template-columns: 26px minmax(0,1fr) fit-content(55%); align-items: center; justify-items: start;
    gap: 8px; min-height: 44px; padding: 5px 8px; border-color: transparent; border-radius: 8px;
    background: transparent; text-align: start;
  }
  [data-overview-active-rows] .tile-mark { width: 26px; height: 26px; background: transparent; }
  [data-overview-active-rows] .tile-state { justify-self: end; text-align: end; }
  @media (hover: hover) {
    [data-overview-active-rows] > .toolbar-section-items > .tile-row:hover { background: var(--glass); }
  }
  .native-panel-card { min-width: 0; --ha-card-background: transparent; --ha-card-box-shadow: none;
    --ha-card-border-color: var(--soft-line); --primary-text-color: var(--ink); --secondary-text-color: var(--secondary); }
  .energy-reading, .reading-native-card { display: grid; min-width: 0; }
  .reading-native-card {
    --ha-card-border-width: 1px; --ha-card-border-radius: 8px;
    --state-icon-color: var(--secondary); --accent-color: var(--secondary);
    font-weight: var(--ha-font-weight-normal,400);
  }
  .toolbar-section[data-section=readings][data-layout=reading-cards] .reading-native-card {
    grid-template-columns: minmax(0,1fr);
  }
  .toolbar-section[data-section=readings][data-layout=reading-cards] .reading-native-card > hui-sensor-card {
    min-inline-size: 0; max-inline-size: 100%;
  }
  @container (max-width: 420px) {
    .toolbar-section[data-section=readings][data-layout=reading-cards] .reading-native-card > hui-sensor-card {
      --ha-font-size-l: var(--ha-font-size-m,14px);
    }
  }
  .tile-row.weather-history-value {
    direction: ltr; grid-template-columns: minmax(0,1fr) auto; grid-template-areas: "label icon" "value value";
    justify-items: start; align-items: center; align-content: start; gap: 6px;
    min-height: 104px; padding: 9px; border-radius: 8px; text-align: left;
  }
  .weather-history-value > .tile-mark {
    grid-area: icon; width: 20px; height: 20px; background: transparent; color: var(--secondary);
  }
  .weather-history-value > .tile-label { grid-area: label; unicode-bidi: plaintext; overflow-wrap: anywhere; }
  .weather-history-value > .tile-state { grid-area: value; color: var(--ink); font-size: 18px; font-variant-numeric: tabular-nums; }
  .toolbar-device, .toolbar-link { min-width: 0; }
  .toolbar-section[data-section=covers] .toolbar-section-items:has(> [data-cover-rail] ~ [data-cover-rail]) {
    /* Three 44px commands, two 3px gaps, padding and a border. */
    grid-template-columns: repeat(auto-fit,minmax(min(100%,max(146px,calc((100% - 8px) / 2))),1fr));
  }
  .toolbar-section[data-section=covers] .toolbar-section-items:has(> [data-cover-rail]) > :not([data-cover-rail]) {
    grid-column: 1 / -1;
  }
  [data-cover-rail] > .device[data-compact=cover] { padding: 5px 3px; }
  [data-cover-rail] .device[data-compact=cover] .basic-actions {
    grid-template-columns: repeat(auto-fit,minmax(44px,1fr));
  }
  [data-cover-rail] .device[data-compact=cover] .basic-actions .control-button:has(ha-icon) {
    min-width: 44px;
  }
  @media (min-width: 300px) {
    .toolbar-section[data-section=devices] > .toolbar-section-items:has(> [data-light-tile]) {
      direction: ltr;
      grid-template-columns: repeat(2,minmax(0,1fr));
    }
    .shell[dir=rtl] .toolbar-section[data-section=devices] > .toolbar-section-items:has(> [data-light-tile]) > * { direction: rtl; }
    .toolbar-section[data-section=devices] > .toolbar-section-items:has(> [data-light-tile]) > :not([data-light-tile]) {
      grid-column: 1 / -1;
    }
  }
  .weather-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .weather-pager { padding-block-end: 5px; }
  .weather-pager > .toolbar-section { border: 0; padding: 0; }
  .weather-pager .weather-current-summary { border: 0; background: transparent; padding-block: 7px; }
  .weather-pager .daily-weather-row { min-height: 26px; }
  .weather-page-dots { display: flex; justify-content: center; direction: ltr; }
  .weather-page-dot {
    display: grid; place-items: center; min-inline-size: 44px; min-block-size: 28px;
    padding: 0; border: 0; border-radius: 999px; background: transparent;
  }
  .weather-page-dot::before {
    content: ''; inline-size: 7px; block-size: 7px; border: 1px solid var(--line);
    border-radius: 50%; background: transparent;
  }
  .weather-page-dot[aria-pressed=true]::before { background: currentColor; }
  .weather-page-dot:focus-visible { outline-offset: -2px; }
  [data-weather-swipe] { touch-action: pan-y pinch-zoom; }
  [data-weather-swipe]:has([data-weather-forecast-scroll]) { touch-action: auto; }
  [data-weather-swipe] .daily-weather { touch-action: pan-y pinch-zoom; }
  .weather-forecast-stack { display: grid; gap: 8px; min-width: 0; }
  .weather-forecast-view { display: contents; }
  .weather-forecast-view > .native-panel-card:empty { display: none; }
  .forecast-clock { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 3px 3px 8px; }
  .forecast-clock strong { font-variant-numeric: tabular-nums; font-size: 19px; }
  .forecast-clock span { font-size: 13px; color: var(--secondary); }
  .sun-panel { color: var(--ink); padding: 8px; }
  .sun-chart { margin: 0 0 12px; color: var(--secondary); font-size: 11px; }
  .sun-plot { position: relative; height: 104px; border: 1px solid var(--soft-line); border-radius: 12px; }
  .sun-horizon { position: absolute; inset-inline: 0; top: 50%; border-block-start: 1px dashed var(--secondary); }
  .sun-marker-track { position: absolute; inset: 12px; }
  .sun-marker-track ha-icon { position: absolute; left: var(--sun-x); top: var(--sun-y); color: var(--warm);
    transform: translate(-50%, -50%); --mdc-icon-size: 20px; }
  .sun-marker-track ha-icon[data-below-horizon] { color: var(--secondary); }
  .sun-scale { display: flex; justify-content: space-between; padding: 3px 4px 0; font-variant-numeric: tabular-nums; }
  .sun-legend { display: flex; align-items: center; gap: 5px; margin-top: 4px; }
  .sun-legend::before { content: ''; width: 14px; border-block-start: 1px dashed currentColor; }
  .sun-times { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; margin: 0; font-size: 13px; }
  .sun-times dd { margin: 0; text-align: end; font-weight: 740; }
`;
