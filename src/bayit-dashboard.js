import { styles } from './bayit-dashboard-style.js';
import { languages } from './bayit-dashboard-i18n.js';
import { automaticToolbarKinds, classicRoomTitle, DEVICE_ICONS, hasDynamicPresenceIcon, isAutomationScriptToggle, isCompactToolbarStatus, isToolbarReadouts, isVacuumProgramAction,
  isCompactAutomationActions, isEnergyReadingCards, isReadingCards, isWeatherReadingsList,
  isVisibleEntity, MAX_ROOM_SHORTCUTS, normalizeClimatePresetShortcut, normalizeRoomControlName, normalizeRoomIcon, normalizeShortcutDetailEntities,
  normalizeRoomVacuumSummary, normalizeToolbarReadout, normalizeRoomTemperatureGraphColor, normalizeShortcutDetailRoutes, normalizeUnreportedSwingMode, overviewSectionOptions,
  supportsRoomSectionColumns,
  ROOM_PANEL_KINDS, normalizeShortcutPowerEntities, roomShortcutDevices, roomTemperatureUnit, roomVacuumPresentation, roomVacuumSummary, supportsRoomTemperatureSource, supportsRoomApplianceTile, supportsRoomBoilerQuickPower, supportsRoomCompactDevice, shortcutDetailPanels, STRATEGY_NAME, supportsNativeShortcutDetails,
  sensorComparisonOptions, sensorSeriesColor, settingsScreenEntries, supportsHourlyWeatherForecast, supportsShortcutWithoutDetails,
  toolbarPlacement, usesRoomPopupPosition } from './strategy-model.js';
import { loadConfiguration, saveConfiguration } from './dashboard-configuration.js';
import { allowsCoverRailAction, climatePowerServiceRegistered, compactRoomLockCommand, createDeviceController, getDeviceModel, homeHeaterPowerAction, isPairedLightStatusRefresh, roomBoilerQuickPowerAction, roomClimatePowerAction, roomClimatePowerState, roomShutdownTargets,
  simpleTimerStatusEntity, simpleTimerUsageResetAvailable, supportsRoomShutdown } from './device-control.mjs';
import { bindDeviceDetails, createPopupMotion } from './popup-motion.js';
import { createPopupScrollMemory } from './popup-scroll.js';
import { createPopupHistory, normalizePopupAliases, popupRouteFragment, resolvePopupRoute } from './popup-routes.js';
import { preserveToolbarPopupPress } from './popup-toolbar-press.js';
import { preserveMoreInfoReturn } from './native-more-info.js';
import { buildPanelControls, climateOptionLabel, panelControlStyles } from './panel-controls.js';
import { lightColorHex, parseLightColor } from './light-color.mjs';
import { activityKinds, applianceActivity, normalizeRoomActivities } from './room-appliance.mjs';
import { createLightEffectGallery, lightEffectStyles, normalizeLightEffectGroups, organizeLightModes } from './light-effects.js';
import { createLightColorPalette, lightColorPaletteStyles } from './light-color-palette.js';
import { createToolbarPanel, toolbarPanelStyles } from './toolbar-panels.js';
import { createRoomGraphs, roomTemperatureChartStyles } from './room-temperature-chart.js';
import { normalizeOrefMap } from './oref-alert-map.js';
import { normalizeVacuumMap } from './vacuum-map.js';
import { normalizeMediaStage } from './now-playing.js';
import { compactMediaMutePlaceholder, compactRoomMediaCommands, normalizeMediaRemote } from './media-device-support.mjs';
import { calendarAccent, normalizeCalendarAgenda } from './calendar-agenda.js';
import { createWallpaperController, createWallpaperGallery, personalWallpaperId, wallpaperChoices, wallpaperStyles } from './wallpapers.js';
import { normalizeSharedWallpapers } from './shared-wallpapers.js';
import { createPageChrome, homePreferencePaths, isActiveDashboardPage } from './page-chrome.js';
import { openBoilerHistory, boilerHistoryStyles } from './boiler-history.js';
import { canOpenBoilerSchedule, createBoilerSchedulePanel, isBoilerScheduleProfile } from './boiler-schedule.js';

export const backgrounds = Object.freeze(Object.keys(wallpaperChoices));
const options = { background: backgrounds, shape: ['soft', 'circle', 'square'], layout: ['classic', 'header'] };
const setupDrafts = new Map();
const appearanceReturns = new WeakMap();
const appearanceReturnMs = 12000;

function forgetAppearanceReturn(view, entry = appearanceReturns.get(view)) {
  if (!entry || appearanceReturns.get(view) !== entry) return;
  entry.watch.abort();
  view.clearTimeout(entry.timer);
  appearanceReturns.delete(view);
}
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
const curtainControlIcons = { open: 'mdi:arrow-expand-horizontal', close: 'mdi:arrow-collapse-horizontal' };
const contextKeys = ['automations', 'security', 'presence', 'weather', 'energy', 'media', 'vacuum', 'calendar', 'sensors', 'devices'];
const toolbarIcons = {
  activity: 'mdi:home-automation', automations: 'mdi:home-automation', security: 'mdi:shield-home-outline',
  presence: 'mdi:account-group-outline', weather: 'mdi:weather-partly-cloudy', energy: 'mdi:meter-electric-outline',
  overview: 'mdi:view-dashboard-outline', settings: 'mdi:cog-outline', link: 'mdi:arrow-top-right',
  media: 'mdi:play-box-multiple-outline', vacuum: 'mdi:robot-vacuum', calendar: 'mdi:calendar-month-outline', sensors: 'mdi:chart-line',
  devices: 'mdi:devices',
};
const presenceIcons = ['mdi:home-off-outline', 'mdi:account', 'mdi:account-group'];
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
const scriptOperations = new Set(['start_script', 'stop_script']);
const coverMovingStates = new Set(['opening', 'closing']);
const roomCompactMediaActions = new Set(['turn_on','turn_off','media_play','media_pause','media_stop','media_next_track','mute','unmute']);
const roomVacuumCleaningActions = new Set(['vacuum_start', 'vacuum_pause', 'vacuum_stop', 'return_to_base']);
const inlineLightActions = new Set(['set_brightness', 'set_color_temp_kelvin']);
const rangeActions = new Set(['set_position', 'set_brightness', 'set_color_temp_kelvin', 'set_percentage', 'volume_set']);
const stateKeys = {
  set_position: 'current_position', set_percentage: 'percentage', set_brightness: 'brightness',
  set_color_temp_kelvin: 'color_temp_kelvin', set_effect: 'effect',
  set_temperature: 'temperature', set_fan_mode: 'fan_mode', set_preset_mode: 'preset_mode',
  set_operation_mode: 'operation_mode', set_swing_mode: 'swing_mode', set_swing_horizontal_mode: 'swing_horizontal_mode',
  select_source: 'source', set_fan_speed: 'fan_speed',
};
const actionsInOrder = ['turn_on', 'turn_off', 'open', 'stop', 'close', 'lock', 'unlock',
  'set_position', 'set_brightness', 'set_color_temp_kelvin', 'set_light_color', 'set_effect',
  'set_percentage', 'set_hvac_mode', 'set_temperature',
  'set_temperature_range', 'set_fan_mode', 'set_swing_mode', 'set_swing_horizontal_mode', 'set_preset_mode',
  'set_operation_mode', 'set_heating_level',
  'preselect_heating_level',
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

function activityDeviceIcon(model) {
  if (model.kind === 'boiler' || model.domain === 'water_heater') return 'mdi:water-boiler';
  if (model.kind === 'heater') return 'mdi:radiator';
  if (model.domain === 'climate') return 'mdi:air-conditioner';
  return 'mdi:timer-outline';
}

function updateRoomActivities(view, readings) {
  const { activityBadges, activityAnchor, article } = view;
  const multiple = readings.length > 1;
  article.toggleAttribute('data-concurrent-activities', multiple);
  while (activityBadges.length < readings.length) {
    const badge = roomBadge('activity', 'mdi:timer-outline');
    activityAnchor.before(badge.element);
    activityBadges.push(badge);
  }
  for (const [index, badge] of activityBadges.entries()) {
    const reading = readings[index];
    if (multiple && reading?.concurrentGlyph) reading.glyph = reading.concurrentGlyph;
    updateRoomBadge(badge, reading);
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

function brightnessPercent(value) {
  const brightness = number(value);
  return brightness === null ? null : Math.round(brightness / 255 * 100);
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
  const roomName = normalizeRoomControlName(item.room_name);
  if (roomName !== undefined) entry.room_name = roomName;
  const roomIcon = normalizeRoomIcon(item.room_icon);
  if (roomIcon) entry.room_icon = roomIcon;
  if (item.room_light_controls === true && entity.startsWith('light.')) entry.room_light_controls = true;
  if (item.room_dual_light_detail === true && entity.startsWith('light.')) entry.room_dual_light_detail = true;
  if (item.room_compact_light_reading === true && entity.startsWith('light.')) entry.room_compact_light_reading = true;
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
  if (entry.kind === 'heater' && entity.startsWith('fan.') && /^automation\.[a-z0-9_]+$/.test(item.home_heater_cutoff_automation ?? '')) {
    entry.home_heater_cutoff_automation = item.home_heater_cutoff_automation;
  }
  if (entry.kind === 'heater' && entity.startsWith('fan.') && entry.level_read_entity &&
      /^sensor\.[a-z0-9_]+$/.test(entry.timed?.simple_timer_entity ?? '')) {
    for (const key of ['level_select_script', 'level_activity_script']) {
      if (/^script\.[a-z0-9_]+$/.test(item[key] ?? '')) entry[key] = item[key];
    }
  }
  if (entry.kind === 'heater' && entity.startsWith('fan.') && entry.level_steps && !entry.level_entity &&
      /^sensor\.[a-z0-9_]+$/.test(entry.timed?.simple_timer_entity ?? '') &&
      /^switch\.[a-z0-9_]+$/.test(entry.timed?.simple_timer_target ?? '') &&
      /^input_number\.[a-z0-9_]+$/.test(item.level_preselect_entity ?? '')) {
    entry.level_preselect_entity = item.level_preselect_entity;
  }
  if (entry.kind === 'boiler' && item.boiler_timer_with_details === true &&
      (/^sensor\.[a-z0-9_]+$/.test(entry.timed?.simple_timer_entity ?? '') ||
       /^timer\.[a-z0-9_]+$/.test(entry.timed?.timer_entity ?? ''))) {
    entry.boiler_timer_with_details = true;
  }
  if (entry.kind === 'boiler' && item.schedule && typeof item.schedule === 'object') {
    entry.schedule = Object.fromEntries(['save_script', 'delete_script'].flatMap(key =>
      /^script\.[a-z0-9_]+$/.test(item.schedule[key] ?? '') ? [[key, item.schedule[key]]] : []));
  }
  if (typeof item.role === 'string') entry.role = item.role;
  const domain = domainFor(entry);
  if (domain === 'light' && supportsNativeShortcutDetails(entry) && /^button\.[a-z0-9_]+$/.test(text(item.light_status_refresh_button))) {
    entry.light_status_refresh_button = item.light_status_refresh_button;
  }
  if (domain === 'cover' && item.room_cover_native_details === true && supportsNativeShortcutDetails(entry)) {
    entry.room_cover_native_details = true;
  }
  if (domain === 'light' && !entry.kind && item.room_light_native_hold === true && supportsNativeShortcutDetails(entry)) {
    entry.room_light_native_hold = true;
  }
  if (domain === 'climate' && entry.role !== 'status' && !['heater', 'boiler'].includes(entry.kind)) {
    if (item.room_climate_power === true) entry.room_climate_power = true;
    if (item.room_climate_controls_compact === true) entry.room_climate_controls_compact = true;
    const shortcut = normalizeClimatePresetShortcut(item.room_climate_preset);
    if (shortcut) entry.room_climate_preset = shortcut;
    const unreported = item.kind === 'climate' && normalizeUnreportedSwingMode(item.unreported_swing_mode);
    if (unreported) entry.unreported_swing_mode = unreported;
  }
  if (domain === 'sensor') {
    const color = normalizeRoomTemperatureGraphColor(item.room_temperature_graph_color);
    if (color) entry.room_temperature_graph_color = color;
  }
  if (domain === 'media_player' && entry.role !== 'status' && item.room_media_compact === true) entry.room_media_compact = true;
  if (item.room_appliance_tile === true && supportsRoomApplianceTile(entry)) entry.room_appliance_tile = true;
  if (item.room_boiler_quick_power === true && supportsRoomBoilerQuickPower(entry)) entry.room_boiler_quick_power = true;
  if (item.room_device_compact === true && supportsRoomCompactDevice(entry)) entry.room_device_compact = true;
  if (domain === 'calendar') {
    const accent = calendarAccent(item.accent_color);
    if (accent) entry.accent_color = accent;
  }
  const panelKind = ROOM_PANEL_KINDS.get(domain) ?? (domain === 'sensor' && entry.role === 'graph' ? 'vacuum' : undefined);
  const panelId = item[panelKind + '_panel_id'];
  if (panelKind && typeof panelId === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(panelId)) {
    entry[panelKind + '_panel_id'] = panelId;
    if (domain === 'vacuum') {
      if (item.room_vacuum_panel_on_hold === true) entry.room_vacuum_panel_on_hold = true;
      const display = roomVacuumPresentation(item.room_vacuum_presentation);
      if (display) entry.room_vacuum_presentation = display;
      const summary = normalizeRoomVacuumSummary(item.room_vacuum_summary);
      if (summary) entry.room_vacuum_summary = summary;
    }
  }
  if (entity.startsWith('light.') && entry.role !== 'status') {
    const groups = normalizeLightEffectGroups(item.effect_groups);
    if (groups.length) {
      entry.effect_groups = groups;
      if (item.effect_favorites === true) entry.effect_favorites = true;
    }
  }
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
    const parsed = { id, name, icon: validIcon(room.icon, 'mdi:door-open'), entities: [...unique.values()],
      classicTitle: classicRoomTitle(name, room.classic_title_break),
      activities: normalizeRoomActivities(room.activities).filter(activity => activity.kind !== 'boiler' ||
        unique.get(activity.boiler_entity)?.kind === 'boiler') };
    if (Array.isArray(room.panel_hidden_entities)) {
      const panelHidden = new Set(room.panel_hidden_entities.filter(entity => unique.has(entity)));
      if (panelHidden.size) parsed.panelHidden = panelHidden;
    }
    if (typeof room.room_temperature_entity === 'string' &&
        /^(sensor|climate)\./.test(room.room_temperature_entity) && unique.has(room.room_temperature_entity)) {
      parsed.temperatureEntity = room.room_temperature_entity;
      const fallback = room.room_temperature_fallback_entity;
      if (parsed.temperatureEntity.startsWith('sensor.') && typeof fallback === 'string' &&
          fallback.startsWith('climate.') && unique.has(fallback)) parsed.temperatureFallback = fallback;
    }
    if (Array.isArray(room.lighting_count_entities)) {
      const lightingCount = new Set(room.lighting_count_entities.filter(entity =>
        typeof entity === 'string' && entity.startsWith('light.') && unique.has(entity)));
      if (lightingCount.size) parsed.lightingCount = lightingCount;
    }
    if (Array.isArray(room.turn_off_entities)) {
      parsed.turnOff = [...new Set(room.turn_off_entities)].filter(supportsRoomShutdown)
        .map(entity => unique.get(entity)).filter(device => device && device.role !== 'status');
    }
    if (Array.isArray(room.shortcuts)) {
      parsed.shortcuts = [...new Set(room.shortcuts)].filter(entity => unique.has(entity)).slice(0, MAX_ROOM_SHORTCUTS);
    }
    if (Array.isArray(room.shortcut_no_details)) {
      const excluded = new Set(room.shortcut_no_details);
      parsed.shortcutNoDetails = new Set(roomShortcutDevices(parsed).filter(device =>
        supportsShortcutWithoutDetails(device) && excluded.has(device.entity)).map(device => device.entity));
    }
    parsed.shortcutPower = new Set(normalizeShortcutPowerEntities(parsed, room.shortcut_power_entities));
    parsed.shortcutDetailEntities = normalizeShortcutDetailEntities(parsed, room.shortcut_detail_entities, parsed.shortcutNoDetails);
    if (Array.isArray(room.sections)) {
      parsed.sections = room.sections.filter(section => roomSectionKinds.has(section?.kind)).map(section => ({
        id: text(section.id), kind: section.kind, title: typeof section.title === 'string' ? section.title : undefined,
        ...(supportsRoomSectionColumns(section.kind) && section.columns === 2 && { columns: 2 }),
        ...(section.kind === 'devices' && section.tile_status === 'attention' && { tileStatus: 'attention' }),
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
    const mediaStage = item.kind === 'media' ? normalizeMediaStage(item.media_stage) : undefined;
    const mediaRemote = item.kind === 'media' ? normalizeMediaRemote(item.media_remote) : undefined;
    const agenda = item.kind === 'calendar' ? normalizeCalendarAgenda(item.calendar_agenda) : undefined;
    const placement = toolbarPlacement(item.kind, item.placement);
    const panelIcon = item.kind === 'energy' ? normalizeRoomIcon(item.panel_icon) : undefined;
    return [{ kind: item.kind, id: text(item.id), label: text(item.label), path: item.path,
      ...(item.kind === 'presence' && { presence_dynamic_icon: hasDynamicPresenceIcon(item) }),
      ...(item.kind === 'energy' && item.energy_dashboard_link === false && { energy_dashboard_link: false }),
      ...(panelIcon && { panel_icon: panelIcon }),
      ...(placement && { placement }),
      ...(usesRoomPopupPosition(item) && { popup_position: 'room' }),
      ...(orefMap && { oref_map: orefMap }),
      ...(vacuumMap && { vacuum_map: vacuumMap }),
      ...(mediaStage && { media_stage: mediaStage }),
      ...(mediaRemote && { media_remote: mediaRemote }),
      ...(agenda && { calendar_agenda: agenda }),
      icon: validIcon(item.icon, toolbarIcons[item.kind]),
      ...(Array.isArray(item.entities) && { entities: item.entities.map(normalizeEntity) }),
      ...(Array.isArray(item.sections) && { sections: item.sections.flatMap(section => {
        if (!section || typeof section !== 'object' || Array.isArray(section)) return [];
        const overview = overviewSectionOptions(item.kind, section);
        const selected = Array.isArray(section.entities) ? section.entities : overview.discover ? [] : null;
        if (!selected) return [];
        const comparison = sensorComparisonOptions(item.kind, section);
        const members = selected.map(raw => {
          const entity = normalizeEntity(raw);
          if (isAutomationScriptToggle(item.kind, section.kind, raw)) entity.command = 'toggle_script';
          if (isVacuumProgramAction(item.kind, section.kind, raw)) entity.command = 'vacuum_program';
          const readout = normalizeToolbarReadout(item.kind, section, raw);
          if (readout) entity.readout = readout;
          const seriesColor = comparison && sensorSeriesColor(raw);
          if (seriesColor) entity.series_color = seriesColor;
          if (raw?.hourly_forecast === true && supportsHourlyWeatherForecast(item.kind, section, raw)) {
            entity.hourly_forecast = true;
          }
          if (item.kind === 'sensors' && section.kind !== 'series' && entity.role === 'graph' &&
              domainFor(entity) === 'sensor' && known.has(raw.graph_room_id)) entity.graph_room_id = raw.graph_room_id;
          return entity;
        });
        return [{ id: text(section.id), kind: text(section.kind), title: typeof section.title === 'string' ? section.title : undefined,
          ...(isCompactAutomationActions(item.kind, section) && { layout: 'compact-actions' }),
          ...(isCompactToolbarStatus(item.kind, section) && { layout: 'compact' }),
          ...(isToolbarReadouts(item.kind, section) && { layout: 'readouts' }),
          ...(isWeatherReadingsList(item.kind, section) && { layout: 'readings-list' }),
          ...(isReadingCards(item.kind, section) && { layout: 'reading-cards' }),
          ...(comparison && { comparison }),
          ...(section.filter === 'active' && {filter:'active'}), ...overview, entities: members }];
      }) }) }];
  }) : null;
  const detailPanels = shortcutDetailPanels(toolbar);
  for (const [index, room] of rooms.entries()) {
    const routes = normalizeShortcutDetailRoutes(room, rawRooms[index].shortcut_detail_routes, detailPanels, room.shortcutNoDetails);
    if (Object.keys(routes).length) room.shortcutDetailRoutes = routes;
  }
  const preferenceKey = text(config.preference_key);
  const preferencePaths = preferenceKey ? [preferenceKey]
    : config.page === true ? homePreferencePaths(location.pathname) : [location.pathname];
  const [storageKey, ...fallbackStorageKeys] = preferencePaths.map(key => 'bayit-9.preferences.v1:' + key);
  const sharedWallpapers = normalizeSharedWallpapers(config.shared_wallpapers);
  const background = backgrounds.includes(config.background) || sharedWallpapers.some(item => item.id === config.background)
    ? config.background : 'aurora';
  return {
    locale, rooms, overview, context, toolbar, page: config.page === true, fullscreen: config.fullscreen === true,
    setupRoomsOnEmpty: config.page === true && config.setup_rooms_on_empty === true,
    hiddenEntities: new Set(Array.isArray(config.hidden_entities)
      ? config.hidden_entities.filter(id => typeof id === 'string' && entityPattern.test(id)) : []),
    popupAliases: new Map(Object.entries(normalizePopupAliases(config.popup_aliases))),
    title: text(config.title) || languages[locale].home,
    background, sharedWallpapers, appearanceSync: config.appearance_sync === true,
    wideLeft: config.wide_alignment === 'left',
    layout: options.layout.includes(config.layout) ? config.layout : 'classic',
    shape: options.shape.includes(config.shape) ? config.shape : 'soft',
    storageKey, fallbackStorageKeys,
  };
}

const layout = `
  <main class="shell">
    <header class="toolbar">
      <div class="brand"><ha-icon icon="mdi:home-variant-outline" aria-hidden="true"></ha-icon><h1></h1></div>
      <div class="toolbar-actions"></div>
    </header>
    <div class="room-scroll"><div class="rooms" role="region"></div></div>
    <div class="home-empty" hidden>
      <p class="empty" data-role="empty-message"></p>
      <button type="button" class="control-button" data-role="empty-setup" hidden>
        <ha-icon icon="mdi:tune-variant" aria-hidden="true"></ha-icon><span></span>
      </button>
    </div>
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
      <div class="setup-footer" data-role="setup-footer" hidden></div>
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
      wallpaperStyles + boilerHistoryStyles + lightEffectStyles + lightColorPaletteStyles + roomTemperatureChartStyles + '</style>' + layout;
    const get = selector => this.shadowRoot.querySelector(selector);
    const role = name => get('[data-role="' + name + '"]');
    this.nodes = {
      shell: get('.shell'), toolbar: get('.toolbar'), toolbarActions: get('.toolbar-actions'),
      roomScroll: get('.room-scroll'), rooms: get('.rooms'), title: get('h1'),
      empty: get('.home-empty'), emptyMessage: role('empty-message'), emptySetup: role('empty-setup'),
      back: role('back'), close: role('close'),
      modal: get('dialog:not(.confirm)'), modalTitle: get('dialog:not(.confirm) h2'),
      modalBody: get('dialog:not(.confirm) .modal-body'), content: role('content'), setupFooter: role('setup-footer'),
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
    this.popupScroll = createPopupScrollMemory(n.modalBody, n.content);
    this.pageChrome = createPageChrome(this, { onChange: () => this.fitPage() });
    n.emptySetup.onclick = () => {
      if (!n.emptySetup.hidden) this.openSetup(n.emptySetup, { setupRooms: true });
    };
    n.back.onclick = () => this.backToRoom();
    n.close.onclick = () => this.dismissPanel();
    n.abort.onclick = () => n.confirm.close();
    n.accept.onclick = () => this.acceptAction();
    n.modal.addEventListener('cancel', event => {
      event.preventDefault();
      this.dismissPanel();
    });
    n.modal.addEventListener('close', () => this.closePanel());
    n.confirm.addEventListener('close', () => {
      if (n.confirm.open) return;
      const source = this.confirming?.source;
      this.confirming = null;
      if (source?.isConnected && !source.disabled) source.focus({ preventScroll: true });
    });
    for (const dialog of [n.modal, n.confirm]) dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom)) {
        if (dialog === n.modal) this.dismissPanel();
        else dialog.close();
      }
    });
    this.roomViews = new Map();
    this.applianceRoomsInView = new Set();
    this.applianceVisibility = () => this.update();
    if (typeof IntersectionObserver === 'function') this.applianceObserver = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        if (!target.isConnected) continue;
        if (isIntersecting) this.applianceRoomsInView.add(target);
        else this.applianceRoomsInView.delete(target);
      }
      if (this.isConnected) this.update();
    });
    this.deviceViews = new Set();
    this.pending = new Map();
    this.preferences = {};
    this.controller = createDeviceController({ getHass: () => this._hass });
    this.resize = () => this.fitPage();
    this.storageChange = event => {
      if (!this.config || (event.key !== this.config.storageKey &&
          !this.config.fallbackStorageKeys.includes(event.key))) return;
      this.readPreferences();
      this.applyPreferences();
    };
  }

  static getStubConfig() { return { locale: 'en', rooms: [] }; }
  getCardSize() { return Math.max(2, Math.ceil((this.config?.rooms.length || 0) / 2) * 3 + 1); }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }

  setConfig(raw) {
    const next = normalizeDashboardConfig(raw);
    this.prepareAppearanceReturn(next);
    this.popupScroll.stop();
    this.nativeMoreInfoReturn?.();
    if (this.config?.storageKey !== next.storageKey) this.preferences = {};
    this.popupHistory?.stop();
    this.popupHistory = undefined;
    if (this.nodes.confirm.open) this.nodes.confirm.close();
    this.popupMotion.reset();
    this.toolbarPanel?.dispose();
    this.wallpaperGallery?.dispose();
    this.roomGraphs?.dispose();
    this.boilerView?.dispose();
    this.config = next;
    this.words = languages[next.locale];
    const n = this.nodes;
    n.shell.lang = next.locale;
    n.shell.dir = next.locale === 'he' ? 'rtl' : 'ltr';
    n.shell.dataset.page = String(next.page);
    n.shell.toggleAttribute('data-wide-left', next.wideLeft);
    n.shell.style.setProperty('--bayit-room-rows', String(Math.max(1, Math.ceil(next.rooms.length / 2))));
    n.shell.style.setProperty('--bayit-room-rows-wide', String(Math.max(1, Math.ceil(next.rooms.length / 4))));
    setText(n.title, next.title);
    setText(n.emptyMessage, this.t('empty'));
    setText(n.emptySetup.lastElementChild, this.t('setup_rooms'));
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
    this.startPopupHistory();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.setup?.editor) this.setup.editor.hass = hass;
    if (!this.isConnected || this.frame || !this.config) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
      this.popupHistory?.refresh();
      this.restoreAppearanceReturn();
    });
  }

  connectedCallback() {
    window.addEventListener('storage', this.storageChange);
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    this.ownerDocument.addEventListener('visibilitychange', this.applianceVisibility);
    for (const view of this.roomViews.values()) {
      if (view.appliances.length || view.boilerActivity) this.applianceObserver?.observe(view.article);
    }
    if (this.config) this.applyPreferences();
    this.pageChrome.update({ enabled: this.config?.page && this.config.fullscreen });
    this.fitPage();
    this.update();
    this.startPopupHistory();
  }

  disconnectedCallback() {
    const returning = appearanceReturns.get(this.ownerDocument.defaultView);
    if (returning?.owner === this) {
      this.captureAppearanceReturn(returning);
      returning.owner = undefined;
    }
    this.popupScroll.stop();
    this.nativeMoreInfoReturn?.();
    this.popupHistory?.stop();
    this.popupHistory = this.popupHistoryPath = undefined;
    window.removeEventListener('storage', this.storageChange);
    window.removeEventListener('resize', this.resize);
    window.visualViewport?.removeEventListener('resize', this.resize);
    cancelAnimationFrame(this.frame);
    clearInterval(this.ticker);
    this.scheduleApplianceUpdate(0);
    this.applianceObserver?.disconnect();
    this.applianceRoomsInView.clear();
    this.ownerDocument.removeEventListener('visibilitychange', this.applianceVisibility);
    clearTimeout(this.noticeTimer);
    this.frame = this.ticker = 0;
    if (this.nodes.confirm.open) this.nodes.confirm.close();
    this.popupMotion.reset();
    this.toolbarPanel?.dispose();
    this.wallpaperGallery?.dispose();
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

  startPopupHistory() {
    if (!this.isConnected || !this.config?.page || this.popupHistory) return;
    const view = this.ownerDocument.defaultView;
    this.popupHistoryPath ??= view.location.pathname;
    this.popupHistory = createPopupHistory({
      view, pathname: this.popupHistoryPath, resolve: hash => this.resolvePopup(hash),
      onChange: event => this.showPopupRoute(event),
    });
    this.popupHistory.start();
  }

  resolvePopup(hash) {
    if (!this._hass?.states) return null;
    return resolvePopupRoute(hash, route => {
      if (route.kind === 'panel') return Boolean(this.popupToolbar(route.panel));
      const room = this.roomViews.get(route.room)?.room;
      if (route.kind === 'room') return !!room;
      const device = room?.entities.find(item => item.entity === route.entity);
      return !!device && (!route.detail || canOpenBoilerSchedule(device, this._hass, this.config.hiddenEntities));
    }, this.config.popupAliases);
  }

  popupToolbar(id) {
    const visible = this.toolbarViews.filter(view => !view.element.hidden).map(view => view.panel);
    const extra = visible.some(panel => panel.kind === 'settings') ? this.settingsScreens() : [];
    const linked = this.config.toolbar?.filter(item => item.placement === 'linked') ?? [];
    const matches = [...visible, ...extra, ...linked].filter(panel => panel.kind !== 'link' && (panel.id || panel.kind) === id);
    // The automatic overview intentionally appears in both the bar and Settings.
    return matches.length === 1 || !this.config.toolbar ? matches[0] : undefined;
  }

  showPopupRoute({ route, hash, reason, source }) {
    if (reason === 'open' || reason === 'close') return;
    this.setup?.editor.shadowRoot.activeElement?.blur();
    if (this.nodes.confirm.open) {
      this.confirming = null;
      this.nodes.confirm.close();
    }
    if (!route) {
      if (this.panel?.routeHash) this.popupMotion.dismiss({ immediate: true, restoreFocus: false });
      return;
    }
    if (route.kind === 'panel') {
      const panel = this.popupToolbar(route.panel);
      this.openPanel(panel.kind, null, undefined, undefined, panel, undefined, { hash });
    } else {
      const room = this.roomViews.get(route.room)?.room;
      if (reason === 'room-return') this.restoreRoomFromPanel(room, source, { hash });
      else this.openPanel(route.kind, null, room, route.entity, undefined, undefined, { hash, detail:route.detail });
    }
  }

  t(key) { return this.words?.[key] || key; }

  readPreferences() {
    let saved;
    const { storageKey, fallbackStorageKeys } = this.config;
    for (const key of [storageKey, ...fallbackStorageKeys]) {
      try {
        const candidate = JSON.parse(localStorage.getItem(key));
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
          saved = candidate;
          break;
        }
      } catch { /* A corrupt older setting does not prevent recovery. */ }
    }
    this.preferences = {};
    for (const [key, choices] of Object.entries(options)) {
      const selected = saved?.[key];
      const extraWallpaper = key === 'background' && (selected === personalWallpaperId ||
        this.config.sharedWallpapers.some(item => item.id === selected));
      if (choices.includes(selected) || extraWallpaper) {
        this.preferences[key] = selected;
      }
    }
  }

  applyPreferences() {
    for (const key of ['layout','shape']) this.nodes.shell.dataset[key] = this.preferences[key] || this.config[key];
    this.applySavedWallpaper();
    const header = this.nodes.shell.dataset.layout === 'header';
    for (const {room,article,heading,name} of this.roomViews.values()) {
      if (room.classicTitle) setText(name, header ? room.name : room.classicTitle);
      if (header && article.firstElementChild !== heading) article.prepend(heading);
      if (!header && article.lastElementChild !== heading) article.append(heading);
    }
    this.wallpaper?.refresh();
    if (this.panel?.type !== 'settings') return;
    this.wallpaperGallery?.select(this.activeWallpaper || this.config.background);
    const synced = this.canSyncAppearance();
    const busy = synced && Boolean(this.appearanceSave);
    this.wallpaperGallery?.setHouseholdBusy(busy);
    for (const item of this.nodes.content.querySelectorAll('[data-preference]')) {
      item.setAttribute('aria-pressed', String(item.value === this.nodes.shell.dataset[item.dataset.preference]));
      if (synced) item.setAttribute('aria-disabled', String(busy));
    }
    for (const item of this.nodes.content.querySelectorAll('.setup-entry, .appearance-actions button')) {
      if (busy) item.setAttribute('aria-disabled', 'true');
      else item.removeAttribute('aria-disabled');
    }
    const appearance = this.appearanceActions;
    if (appearance?.panel === this.panel) {
      appearance.reset.hidden = !Object.keys(this.preferences).length;
      if (appearance.share) {
        appearance.share.disabled = Boolean(this.appearanceSave);
        appearance.share.hidden = this.appearanceSave !== appearance && !Object.keys(this.appearanceChanges()).length;
      }
      appearance.element.hidden = appearance.reset.hidden && (!appearance.share || appearance.share.hidden) &&
        !appearance.status.textContent;
    }
  }

  applySavedWallpaper() {
    const { storageKey, fallbackStorageKeys, background, sharedWallpapers } = this.config;
    const wallpaperKey = JSON.stringify([storageKey, sharedWallpapers.map(({ id, path }) => [id, path])]);
    if (this.wallpaperKey !== wallpaperKey) {
      this.wallpaper?.destroy();
      this.wallpaper = createWallpaperController(this.nodes.shell, { storageKey, fallbackStorageKeys, sharedWallpapers });
      this.wallpaperKey = wallpaperKey;
      this.activeWallpaper = this.pendingWallpaper = undefined;
    }
    const saved = this.preferences.background || background;
    if (this.activeWallpaper === saved || this.pendingWallpaper?.id === saved) return;
    if (!this.activeWallpaper && !backgrounds.includes(saved)) {
      const fallback = backgrounds.includes(background) ? background : 'aurora';
      void this.wallpaper.apply(fallback);
      this.activeWallpaper = fallback;
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
    if (!applied) {
      const fallback = this.config.background;
      if (!save && id !== fallback && this.activeWallpaper !== fallback) {
        void this.selectWallpaper(fallback, { save: false });
      }
      return false;
    }
    this.activeWallpaper = id;
    if (save) this.setPreference('background', id);
    this.wallpaperGallery?.select(id);
    return true;
  }

  persistPreferences() {
    try { localStorage.setItem(this.config.storageKey, JSON.stringify(this.preferences)); } catch {}
    this.applyPreferences();
  }

  setPreference(key, value) {
    this.preferences[key] = value;
    this.persistPreferences();
  }

  canSyncAppearance() {
    return this.config?.appearanceSync && this.config.page && this._hass?.user?.is_admin === true;
  }

  chooseAppearance(key, value) {
    if (this.canSyncAppearance() && value !== personalWallpaperId) {
      return this.saveAppearance(this.appearanceActions, { [key]:value });
    }
    if (key === 'background') return this.selectWallpaper(value);
    this.setPreference(key, value);
  }

  appearanceChanges() {
    return Object.fromEntries(Object.entries(this.preferences)
      .filter(([key, value]) => value !== this.config[key] && value !== personalWallpaperId));
  }

  configurationErrorText(error) {
    return this.t(['setup_storage', 'setup_conflict'].includes(error.code) ? error.code : 'setup_error');
  }

  captureAppearanceReturn(returning) {
    const { content, modal, modalBody, close } = this.nodes;
    if (this.panel?.type !== 'settings' || !modal.open || modal.hasAttribute('data-closing') ||
        location.href !== returning.href) return;
    const layout = content.querySelector('.appearance-layout');
    if (!layout || !this.wallpaperGallery) return;
    const focused = this.shadowRoot.activeElement;
    const previous = returning.snapshot;
    const gallery = this.wallpaperGallery.captureView();
    if (!this.isConnected) gallery.focus ??= previous?.gallery.focus;
    returning.snapshot = {
      layoutOpen:layout.open,
      gallery,
      scrollTop:this.isConnected ? modalBody.scrollTop : previous?.scrollTop ?? 0,
      focus:focused?.dataset.preference ? { key:focused.dataset.preference, value:focused.value }
        : focused === layout.querySelector('summary') ? 'layout' : focused === close ? 'close'
          : this.isConnected ? undefined : previous?.focus,
    };
  }

  keepAppearanceOnRefresh(config, userId, changes) {
    const view = this.ownerDocument.defaultView;
    if (!this.panel?.routeHash || view.location.hash !== this.panel.routeHash) return;
    forgetAppearanceReturn(view);
    const href = view.location.href;
    const watch = new view.AbortController();
    const expected = ['background','layout','shape'].map(key => [key, changes[key] ?? config[key]]);
    const returning = { owner:this, storageKey:config.storageKey, href, userId, changes, expected, watch };
    this.captureAppearanceReturn(returning);
    if (!returning.snapshot) return;
    appearanceReturns.set(view, returning);
    const moved = () => { if (view.location.href !== href) forgetAppearanceReturn(view, returning); };
    for (const event of ['location-changed','hashchange','popstate']) view.addEventListener(event, moved, { signal:watch.signal });
    returning.timer = view.setTimeout(() => forgetAppearanceReturn(view, returning), appearanceReturnMs);
    return returning;
  }

  prepareAppearanceReturn(next) {
    this.pendingAppearanceReturn = undefined;
    const view = this.ownerDocument.defaultView;
    const returning = appearanceReturns.get(view);
    if (!returning || returning.storageKey !== next.storageKey || returning.href !== view.location.href) return;
    returning.owner?.captureAppearanceReturn(returning);
    returning.owner = undefined;
    if (!next.appearanceSync || !returning.expected.every(([key,value]) => next[key] === value)) {
      if (returning.confirmed) forgetAppearanceReturn(view, returning);
      return;
    }
    returning.confirmed = true;
    this.pendingAppearanceReturn = returning;
  }

  restoreAppearanceReturn() {
    const returning = this.pendingAppearanceReturn;
    const { content, modal, modalBody, close } = this.nodes;
    if (!returning || this.panel?.type !== 'settings' || !modal.open || modal.hasAttribute('data-closing') || !this._hass?.user) return;
    this.pendingAppearanceReturn = undefined;
    const view = this.ownerDocument.defaultView;
    if (appearanceReturns.get(view) !== returning || returning.href !== view.location.href ||
        returning.userId !== this._hass.user.id || !this.canSyncAppearance()) return;
    const layout = content.querySelector('.appearance-layout');
    if (!layout || !this.wallpaperGallery) return;
    const { layoutOpen, gallery, scrollTop, focus } = returning.snapshot;
    layout.open = layoutOpen;
    const galleryFocus = this.wallpaperGallery.restoreView(gallery, !focus ? returning.changes.background : undefined);
    const [key, value] = Object.entries(returning.changes)[0];
    const choice = typeof focus === 'object' ? focus : { key, value };
    const layoutFocus = layout.open ? [...layout.querySelectorAll('[data-preference]')]
      .find(item => item.dataset.preference === choice.key && item.value === choice.value) : undefined;
    const active = focus === 'close' ? close : focus === 'layout' ? layout.querySelector('summary')
      : (typeof focus === 'object' ? layoutFocus : galleryFocus ?? layoutFocus);
    returning.owner = this;
    this.appearanceActions.status.textContent = this.t('appearance_saved');
    this.applyPreferences();
    active?.focus({ preventScroll:true });
    modalBody.scrollTop = scrollTop;
  }

  async saveAppearance(actions, direct) {
    const throughGallery = direct?.background !== undefined;
    const result = (applied, feedback = '') => {
      if (!throughGallery && actions) actions.status.textContent = feedback;
      return { applied, feedback };
    };
    if (!actions || this.appearanceSave) return { applied:false, feedback:'' };
    const changes = direct ?? this.appearanceChanges();
    const config = this.config;
    const previousPreferences = { ...this.preferences };
    const entries = Object.entries(changes);
    if (!entries.length || direct && entries.every(([key, value]) =>
      config[key] === value && !Object.hasOwn(previousPreferences, key))) return result(true);

    const pathname = location.pathname;
    const href = location.href;
    const userId = this._hass?.user?.id;
    const { modal } = this.nodes;
    const currentView = () => this.isConnected && this.config === config && this.panel === actions.panel &&
      modal.open && !modal.hasAttribute('data-closing') && href === location.href &&
      (!direct || this.canSyncAppearance() && this._hass?.user?.id === userId);
    this.appearanceSave = actions;
    actions.status.textContent = throughGallery ? '' : this.t('setup_saving');
    this.applyPreferences();
    let prepared;
    let returning;
    const wallpaper = this.wallpaper;
    try {
      const current = await loadConfiguration(this._hass, pathname);
      if (!currentView()) return result(false);
      const shared = config.sharedWallpapers.find(item => item.id === changes.background);
      if (direct && current.strategy.appearance_sync !== true ||
          shared && !normalizeSharedWallpapers(current.strategy.shared_wallpapers)
            .some(item => item.id === shared.id && item.path === shared.path)) {
        throw Object.assign(new Error('Household appearance changed'), { code:'setup_conflict' });
      }
      const draftKey = JSON.stringify([userId, current.urlPath]);
      if (direct && setupDrafts.has(draftKey)) return result(false, this.t('appearance_finish_draft'));
      if (direct && shared && this.activeWallpaper !== shared.id) {
        try { prepared = await wallpaper?.prepareSharedPhoto(shared.id); } catch {}
        if (!prepared) return result(false, this.t('appearance_photo_unavailable'));
        if (!currentView()) return result(false);
        if (setupDrafts.has(draftKey)) return result(false, this.t('appearance_finish_draft'));
      }
      if (entries.some(([key, value]) => current.strategy[key] !== value)) {
        const saved = await saveConfiguration(this._hass, current, { ...current.strategy, ...changes },
          { shouldSave: () => {
            if (!currentView()) return false;
            if (direct) returning = this.keepAppearanceOnRefresh(config, userId, changes);
            return true;
          } });
        if (!saved) return result(false);
      }
      if (!this.isConnected || this.config?.storageKey !== config.storageKey || pathname !== location.pathname) return result(true);
      if (this.config === config) Object.assign(config, changes);
      for (const [key, value] of entries) {
        if (this.preferences[key] === (direct ? previousPreferences[key] : value)) delete this.preferences[key];
      }
      if (prepared && this.wallpaper === wallpaper && !this.preferences.background &&
          this.config.background === changes.background && prepared.apply()) this.activeWallpaper = changes.background;
      this.persistPreferences();
      return result(true, this.t('appearance_saved'));
    } catch (error) {
      if (returning) forgetAppearanceReturn(this.ownerDocument.defaultView, returning);
      return result(false, this.configurationErrorText(error));
    } finally {
      prepared?.dispose();
      this.appearanceSave = undefined;
      if (this.isConnected && this.panel?.type === 'settings') this.applyPreferences();
    }
  }

  model(config, options) {
    try {
      const model = getDeviceModel(config, this._hass?.states ?? {}, Date.now(), options);
      return { ...model, icon: validIcon(model.icon, DEVICE_ICONS[model.kind || model.domain]) };
    }
    catch {
      return { ...config, name: config.name || config.entity, icon: validIcon(config.icon),
        actions: {}, attributes: {}, state: 'unavailable', available: false };
    }
  }

  buildToolbar() {
    const settings = this.config;
    const automatic = automaticToolbarKinds(settings.context);
    const items = settings.toolbar?.filter(item => !item.placement) ?? automatic.map(kind => ({
      kind, icon: toolbarIcons[kind], ...(kind === 'presence' && { presence_dynamic_icon: true }),
    }));
    if (settings.fullscreen && !items.some(item => item.kind === 'settings')) items.push({ kind:'settings', icon:toolbarIcons.settings });
    this.nodes.toolbarActions.replaceChildren();
    this.toolbarViews = items.map(item => {
      const { kind } = item;
      const name = item.label || this.t(kind);
      const entities = item.sections?.flatMap(section => section.entities) ?? item.entities ??
        (item.calendar_agenda ? [] : kind === 'overview' ? settings.overview : settings.context[kind] ?? []);
      const panel = { ...item, name, entities };
      const presenceIds = kind === 'presence' ? [...new Set(entities.filter(entry => {
        const domain = domainFor(entry);
        return domain === 'person' || (domain === 'device_tracker' && entry.role !== 'person');
      }).map(entry => entry.entity))] : [];
      if (item.presence_dynamic_icon) panel.icon = presenceIcons[0];
      const element = button('chrome-button', name, panel.icon, true);
      element.dataset.role = kind;
      if (kind !== 'link') {
        element.setAttribute('aria-haspopup', 'dialog');
        if (settings.page) preserveToolbarPopupPress(element, kind, panel.id || kind,
          () => this.isConnected && !this.nodes.modal.open,
          () => this.popupHistoryPath === this.ownerDocument.defaultView.location.pathname && isActiveDashboardPage(this));
      }
      const badge = ['presence', 'activity'].includes(kind) ? make('span', 'badge') : null;
      if (badge) {
        badge.hidden = true;
        badge.setAttribute('aria-hidden', 'true');
        element.append(badge);
      }
      element.onclick = () => {
        if (kind === 'link') return location.assign(item.path);
        this.openPanel(kind, element, undefined, undefined, panel);
      };
      const needsContent = !settings.toolbar && (kind === 'overview' || contextKeys.includes(kind));
      this.nodes.toolbarActions.append(element);
      return { kind, element, badge, entities, needsContent, panel, presenceIds };
    });
  }

  quickAction(config, source, room, { details = true } = {}) {
    const model = this.model(config);
    const { domain, state } = model;
    let action;
    if (domain === 'cover') action = this.coverIsMoving(model)
      ? 'stop' : state === 'open' ? 'close' : state === 'closed' ? 'open' : undefined;
    else if (domain === 'lock') action = state === 'locked' ? 'unlock' : state === 'unlocked' ? 'lock' : undefined;
    else if (powerDomains.has(domain) && !config.kind) action = state === 'off' ? 'turn_on' : 'turn_off';
    if (action && model.actions[action]) {
      this.requestAction(config, action, undefined, source, { confirmShortcut: domain === 'lock' });
    } else if (details) this.openDeviceDetails(config, source, room);
  }

  homeShortcutPowerAction(config) {
    if (!isVisibleEntity(config.entity, this._hass?.states ?? {}, this._hass?.entities, this.config.hiddenEntities)) return;
    if (config.room_boiler_quick_power) return this.roomPowerTileAction(config);
    if (config.home_heater_shortcut) return homeHeaterPowerAction(this._hass, config);
    const action = roomClimatePowerAction(this.model(config));
    if (climatePowerServiceRegistered(this._hass, action)) return action;
  }

  roomPowerTileAction(config, reported = null) {
    if (config.room_boiler_quick_power) {
      const model = this.model(config, { roomBoilerQuickPower: true });
      const { states = {}, entities } = this._hass ?? {};
      if (isVisibleEntity(config.entity, states, entities, this.config.hiddenEntities) &&
          isVisibleEntity(model.timer?.entity ?? '', states, entities, this.config.hiddenEntities)) {
        return roomBoilerQuickPowerAction(this._hass, model);
      }
      return;
    }
    const model = reported ?? this.model(config);
    if (!model.available || !['on', 'off'].includes(model.state)) return;
    const next = model.state === 'off' ? 'turn_on' : 'turn_off';
    if (model.actions[next]) return next;
  }

  openDeviceDetails(config, source, room) {
    if (room) this.openPanel('device', source, room, config.entity);
    else this.moreInfo(config, source);
  }

  openShortcutDetails(config, source, room) {
    const route = room.shortcutDetailRoutes?.[config.entity];
    const alternate = room.shortcutDetailEntities[config.entity];
    if (route || alternate) {
      const states = this._hass?.states ?? {};
      const registry = this._hass?.entities;
      const hidden = this.config.hiddenEntities;
      const visible = entity => isVisibleEntity(entity, states, registry, hidden);
      const active = () => this.isConnected && source.isConnected && this.roomViews.get(room.id)?.room === room;
      if (!active() || !visible(config.entity)) return;
      if (route === 'native') {
        this.moreInfo(config, source, active);
        return;
      }
      const panel = route && this.popupToolbar(route.slice('panel:'.length));
      if (panel && panel.kind !== 'settings' && panel.placement !== 'settings') {
        this.openPanel(panel.kind, source, undefined, undefined, panel);
        return;
      }
      if (alternate && visible(alternate)) {
        this.openPanel('device', source, room, alternate);
        return;
      }
    }
    this.openDeviceDetails(config, source, room);
  }

  coverIsMoving(model) {
    return model.available && (coverMovingStates.has(model.state) || movement.has(this.pending.get(model.entity)?.id));
  }

  coverFeedback(model, pending) {
    if (model.domain !== 'cover' || !model.available) return null;
    if (coverMovingStates.has(model.state)) return { direction: model.state };
    if (pending?.coverDirection) return {
      direction: pending.coverDirection, requestLabel: this.t(pending.coverDirection + '_requested'),
    };
    return null;
  }

  buildRooms() {
    const n = this.nodes;
    this.applianceObserver?.disconnect();
    this.applianceRoomsInView.clear();
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
      const name = make('span', 'room-name', room.name);
      heading.append(icon(room.icon), name, count, chevron);
      heading.onclick = () => this.openPanel('room', heading, room);
      article.onclick = event => {
        if (!event.target.closest('button')) this.openPanel('room', heading, room);
      };
      const status = make('div', 'room-status-strip');
      const temperature = roomBadge('temperature', 'mdi:thermometer');
      const activity = roomBadge('activity', 'mdi:timer-outline');
      const availability = roomBadge('availability', 'mdi:alert-circle-outline');
      const boilerActivity = room.activities.find(item => item.kind === 'boiler');
      const appliances = room.activities.filter(item => item !== boilerActivity).map(mapping => ({
        mapping, badge: roomBadge(mapping.kind, activityKinds[mapping.kind].icon),
      }));
      status.append(temperature.element, activity.element, ...appliances.map(item => item.badge.element), availability.element);
      const quick = make('div', 'quick');
      const shortcut = new Map();
      for (const config of roomShortcutDevices(room)) {
        const el = button('quick-button', config.name || config.entity, config.icon || 'mdi:information-outline', true);
        el.dataset.entity = config.entity;
        const details = !room.shortcutNoDetails?.has(config.entity);
        let powerConfig;
        if (room.shortcutPower.has(config.entity)) {
          const flag = config.kind === 'heater' ? 'home_heater_shortcut'
            : domainFor(config) === 'climate' ? 'room_climate_power' : 'room_boiler_quick_power';
          powerConfig = { ...config, [flag]: true };
        }
        const showDetails = () => this.openShortcutDetails(config, el, room);
        if (powerConfig) {
          let armedAction;
          bindDeviceDetails(el, () => {
            armedAction = undefined;
            showDetails();
          }, { requireShortTap: true, activationStart: () => { armedAction = el.dataset.action ?? ''; } });
          el.onclick = () => {
            if (!el.isConnected || this.panel || this.roomViews.get(room.id)?.room !== room) return;
            const armed = armedAction ?? el.dataset.action;
            armedAction = undefined;
            const action = this.homeShortcutPowerAction(powerConfig);
            if (action && action === armed && action === el.dataset.action) {
              this.requestAction(powerConfig, action, undefined, el, { roomPowerTile: powerConfig.room_boiler_quick_power });
            } else if (!action) showDetails();
          };
        } else {
          el.onclick = () => this.quickAction(config, el, room, { details });
          bindDeviceDetails(el, details ? showDetails : undefined);
        }
        shortcut.set(config.entity, { el, powerConfig });
        quick.append(el);
      }
      article.append(status, quick, heading);
      let turnOff;
      if (room.turnOff?.length) {
        turnOff = button('room-turn-off', this.t('turn_off_room').replace('{name}', room.name), room.icon, true);
        turnOff.onclick = () => this.turnOffRoom(room);
        article.append(turnOff);
      }
      n.rooms.append(article);
      this.roomViews.set(room.id, {
        room, article, heading, name, count, turnOff, temperature, activityBadges: [activity],
        activityAnchor: appliances[0]?.badge.element ?? availability.element, appliances, boilerActivity, availability, shortcut,
      });
      if (this.isConnected && (appliances.length || boilerActivity)) this.applianceObserver?.observe(article);
    }
    n.empty.hidden = this.roomViews.size > 0;
  }

  roomOffTargets(room) {
    const states = this._hass?.states ?? {};
    const devices = room.turnOff.filter(({ entity }) =>
      isVisibleEntity(entity, states, this._hass?.entities, this.config.hiddenEntities));
    return roomShutdownTargets(devices, states);
  }

  async turnOffRoom(room) {
    if (room.turnOff.some(device => this.pending.has(device.entity))) return;
    return this.turnOffEntities(this.roomOffTargets(room), room.name);
  }

  async turnOffEntities(entities, name) {
    if (!entities.length || entities.some(entity => this.pending.has(entity))) return;
    const token = { id: 'turn_off' };
    for (const entity of entities) this.pending.set(entity, token);
    this.announce(this.t('sending').replace('{name}', name));
    this.update();
    try {
      const status = await this.controller.turnOffRoom(entities);
      this.announce(this.t(status).replace('{name}', name));
    } catch {
      this.announce(this.t('send_error'));
    } finally {
      for (const entity of entities) if (this.pending.get(entity) === token) this.pending.delete(entity);
      if (this.isConnected) this.update();
    }
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

  stateLabel(model, surface) {
    if (!model.available) return this.t('unavailable');
    const attrs = model.attributes || {};
    const state = model.state;
    const localized = key => statusNames.has(key) ? this.t(key) : String(key || this.t('unknown'));
    if (model.domain === 'cover') {
      const position = number(attrs.current_position);
      return (state === 'open' ? this.t('opened') : localized(state)) + (position === null ? '' : ' · ' + ltr(position + '%'));
    }
    if (model.domain === 'sensor' && attrs.unit_of_measurement) return ltr(state + ' ' + attrs.unit_of_measurement);
    if (surface === 'overview' && model.domain === 'light' && state === 'on' &&
        Number.isFinite(attrs.brightness) && attrs.brightness >= 0 && attrs.brightness <= 255) {
      return localized(state) + ' · ' + ltr(brightnessPercent(attrs.brightness) + '%');
    }
    if (model.domain === 'climate') {
      const temp = number(attrs.current_temperature);
      const unit = this._hass?.config?.unit_system?.temperature || '°';
      if (!surface) return localized(state) + (temp === null ? '' : ' · ' + ltr(temp + ' ' + unit));
      const shortUnit = unit === '°C' ? '°' : unit;
      const roundTemperature = value => Number.isInteger(value + 0.5) ? 2 * Math.round(value / 2) : Math.round(value);
      const showTemperature = value => ltr(roundTemperature(value) + shortUnit);
      const target = state === 'off' ? null : number(attrs.temperature);
      const targetText = target === null ? '' : this.t('target_short') + ' ' + showTemperature(target);
      if (surface === 'overview') {
        const ambientText = temp === null ? '' : this.t('ambient_short') + ' ' + showTemperature(temp);
        return [localized(state), targetText, ambientText].filter(Boolean).join(' · ');
      }
      return localized(state) + (temp === null ? '' : ' · ' + showTemperature(temp)) +
        (targetText ? ' · ' + targetText : '');
    }
    if (statusNames.has(state)) return localized(state);
    const record = this._hass?.states?.[model.entity];
    return String((record && this._hass?.formatEntityState?.(record)) || state || this.t('unknown'));
  }

  temperatureBadge(value, unit, highValue) {
    const temperature = number(value);
    const high = number(highValue);
    if (temperature === null || (highValue !== undefined && (high === null || high < temperature))) return undefined;
    const suffix = unit || this._hass?.config?.unit_system?.temperature || '°';
    const fullUnit = typeof suffix === 'string' && suffix.trim().length <= 3 ? suffix.trim() : '°';
    const compactUnit = fullUnit === '°C' ? '°' : fullUnit;
    const rounded = Number(temperature.toFixed(1));
    const upper = high === null ? rounded : Number(high.toFixed(1));
    const reading = upper === rounded ? String(rounded) : rounded + '–' + upper;
    return { text: ltr(reading + compactUnit), fullText: ltr(reading + fullUnit) };
  }

  selectedTemperatureBadge(value, unit) {
    if (typeof value !== 'number' &&
        !(typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) return;
    const sourceUnit = roomTemperatureUnit(unit ?? this._hass?.config?.unit_system?.temperature);
    return this.temperatureBadge(value, sourceUnit ?? '°');
  }

  roomClimateBadge(model, tone) {
    const heating = ['heater', 'boiler'].includes(model.kind) || model.domain === 'water_heater';
    if (heating && tone === 'warm') return {
      text: this.t('on'), label: model.name + ' · ' + this.stateLabel(model),
      glyph: activityDeviceIcon(model), tone,
    };
    if (model.domain !== 'climate' || heating || tone !== 'moving') return undefined;
    const mode = statusNames.has(model.state) ? this.t(model.state) : model.state;
    const { temperature, target_temp_low: low, target_temp_high: high } = model.attributes;
    const target = ['cool','heat','heat_cool','auto'].includes(model.state)
      ? this.temperatureBadge(temperature) ?? this.temperatureBadge(low, undefined, high ?? null) : undefined;
    return {
      text: target?.text || mode,
      label: [model.name, mode, target && this.t('target_short') + ' ' + target.fullText].filter(Boolean).join(' · '),
      glyph: 'mdi:air-conditioner', tone,
    };
  }

  scheduleApplianceUpdate(nextAt) {
    if (this.applianceUpdateAt === nextAt) return;
    clearTimeout(this.applianceUpdate);
    this.applianceUpdateAt = nextAt;
    if (nextAt) this.applianceUpdate = setTimeout(() => {
      this.applianceUpdateAt = 0;
      this.update();
    }, Math.max(30, nextAt - Date.now()));
  }

  applianceBadge(kind, status, name = this.t('activity_' + kind)) {
    const { type, minutes } = status;
    const state = this.t('activity_' + type);
    if (minutes === undefined) return { text: state, label: name + ' · ' + state,
      tone: type === 'finished' ? 'finished' : 'warm' };
    const clock = ltr(String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0'));
    const text = type === 'elapsed' && kind !== 'boiler' && minutes < 60 ? ltr(minutes) + ' ' + this.t('activity_short_minutes') : clock;
    return { text, label: name + ' · ' + state + ' · ' + text, tone: 'warm' };
  }

  update() {
    if (!this.config) return;
    const n = this.nodes;
    n.emptySetup.hidden = !this.config.setupRoomsOnEmpty || this.roomViews.size > 0 || !this._hass?.user?.is_admin;
    const active = new Map();
    const haveStates = !!this._hass?.states;
    const now = Date.now();
    let applianceNext = Infinity;
    let countdown = false;
    for (const [id, view] of this.roomViews) {
      let lit = 0;
      const unavailable = [];
      let lightUnavailable = false;
      let temperature;
      let ambient;
      const source = view.room.temperatureEntity;
      const temperatureFallback = view.room.temperatureFallback;
      const activities = [];
      const countMinutes = !this.applianceObserver || this.applianceRoomsInView.has(view.article);
      for (const config of view.room.entities) {
        const model = this.model(config);
        const tone = this.tone(model);
        const countedLight = (model.domain === 'light' || domainFor(config) === 'light') &&
          (!view.room.lightingCount || view.room.lightingCount.has(config.entity));
        if (haveStates && !model.available) {
          unavailable.push(model.name);
          lightUnavailable ||= countedLight;
        }
        if (countedLight && model.domain === 'light' && model.state === 'on') lit++;
        if (tone !== 'quiet' && !active.has(config.entity)) active.set(config.entity, { config, model, room: view.room });
        if (model.available) {
          if (!source) {
            if (isTemperatureSensor(model.domain, model.attributes)) {
              temperature ||= this.temperatureBadge(model.state, model.attributes.unit_of_measurement);
            }
            if (model.domain === 'climate') ambient ||= this.temperatureBadge(model.attributes?.current_temperature);
          } else if ((model.entity === source || model.entity === temperatureFallback) &&
              isVisibleEntity(model.entity, this._hass.states, this._hass.entities, this.config.hiddenEntities)) {
            if (model.entity === source && supportsRoomTemperatureSource(source, model.attributes)) {
              temperature = model.domain === 'climate' ? this.selectedTemperatureBadge(model.attributes.current_temperature)
                : this.selectedTemperatureBadge(model.state, model.attributes.unit_of_measurement || undefined);
            }
            if (model.entity === temperatureFallback) {
              ambient = this.selectedTemperatureBadge(model.attributes.current_temperature);
            }
          }
        }
        const trackBoiler = view.boilerActivity?.boiler_entity === model.entity;
        const elapsed = trackBoiler && applianceActivity(view.boilerActivity, this._hass?.states, now);
        if (elapsed) {
          activities.push({ ...this.applianceBadge('boiler', elapsed, model.name), glyph: activityDeviceIcon(model) });
          if (countMinutes) applianceNext = Math.min(applianceNext, elapsed.nextAt);
        } else if (model.available && model.timer?.state === 'active') {
          countdown = true;
          const deviceGlyph = activityDeviceIcon(model);
          activities.push({
            text: this.timerLabel(model.timer, true),
            label: model.name + ' · ' + this.t('remaining_time') + ' · ' + this.timerLabel(model.timer),
            glyph: model.domain === 'climate' ? 'mdi:timer-outline' : deviceGlyph,
            concurrentGlyph: deviceGlyph,
            tone: 'warm',
          });
        } else if (model.available) {
          const activity = this.roomClimateBadge(model, tone);
          if (activity) activities.push(activity);
        }
        const quickControl = view.shortcut.get(config.entity);
        if (!quickControl) continue;
        const { el: shortcut, powerConfig } = quickControl;
        const pending = this.pending.get(config.entity);
        const feedback = this.coverFeedback(model, pending);
        const levelPending = model.kind === 'heater' &&
          (pending?.id === 'set_heating_level' || pending?.id === 'preselect_heating_level');
        const heatingLevel = model.available && (model.levelActivity || levelPending);
        const stop = model.domain === 'cover' && model.actions.stop && this.coverIsMoving(model) &&
          this.canRequest(config.entity, 'stop');
        setIcon(shortcut.firstElementChild, model.icon);
        const status = feedback?.requestLabel || this.stateLabel(model);
        const powerAction = powerConfig && this.homeShortcutPowerAction(powerConfig);
        if (powerConfig) shortcut.dataset.action = powerAction || '';
        const actionLabel = stop ? this.t('stop') : powerAction ? this.actionLabel(powerAction) : '';
        const savingPreselection = levelPending && pending.id === 'preselect_heating_level' && !model.levelActivity;
        const updateLabel = heatingLevel ? this.t(savingPreselection ? 'heating_preselect_saving' : 'heating_level_changing') : '';
        label(shortcut, [model.name, status, updateLabel, actionLabel].filter(Boolean).join(' · '));
        shortcut.dataset.tone = feedback ? 'moving' : tone;
        shortcut.dataset.transition = feedback?.direction || (heatingLevel ? 'heating-level' : '');
        shortcut.toggleAttribute('data-unavailable', this.config.page && haveStates && !model.available);
        const busy = heatingLevel || (!!pending && (model.available || (model.domain !== 'cover' && !levelPending)));
        shortcut.setAttribute('aria-busy', String(busy));
      }
      const reading = temperature || ambient;
      updateRoomBadge(view.temperature, reading && { text: reading.text, label: this.t('room_temperature') + ' · ' + reading.fullText });
      updateRoomActivities(view, activities);
      let visibleAppliance = false;
      for (const { mapping, badge } of view.appliances) {
        const status = applianceActivity(mapping, this._hass?.states, now);
        updateRoomBadge(badge, status && this.applianceBadge(mapping.kind, status));
        if (!status) continue;
        visibleAppliance = true;
        if (status.nextAt && countMinutes) {
          applianceNext = Math.min(applianceNext, status.nextAt);
        }
      }
      view.article.toggleAttribute('data-appliance-status', visibleAppliance);
      updateRoomBadge(view.availability, unavailable.length && {
        text: unavailable.length > 1 ? unavailable.length : '',
        label: this.t('unavailable') + ' · ' + unavailable.join(', '),
      });
      const lightingStatus = lit || (lightUnavailable ? '—' : this.t('off'));
      if (view.turnOff) {
        const targets = this.roomOffTargets(view.room);
        const busy = view.room.turnOff.some(device => this.pending.has(device.entity));
        view.turnOff.setAttribute('aria-busy', String(busy));
        view.turnOff.setAttribute('aria-disabled', String(busy || !targets.length));
      }
      setText(view.count, lightingStatus);
      const lightingDescription = this.t('room_lights') + ' · ' + (lightingStatus === '—' ? this.t('unavailable') : lightingStatus);
      if (view.heading.getAttribute('aria-description') !== lightingDescription) {
        view.heading.setAttribute('aria-description', lightingDescription);
      }
      view.count.dataset.tone = lit ? 'warm' : 'quiet';
      view.article.toggleAttribute('data-current', this.panel?.roomOrigin === true && this.panel.room?.id === id);
    }
    this.scheduleApplianceUpdate(this.isConnected && !this.ownerDocument.hidden && Number.isFinite(applianceNext)
      ? applianceNext : 0);
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
    for (const { kind, element, badge, entities, needsContent, panel, presenceIds } of this.toolbarViews) {
      element.hidden = needsContent && !entities.length && (kind !== 'energy' || !this._hass?.panels?.energy);
      if (badge) {
        const count = kind === 'activity' ? active.size
          : presenceIds.filter(entity => this._hass?.states?.[entity]?.state === 'home').length;
        if (kind === 'presence') {
          const description = this.t('presence_count').replace('{count}', count);
          if (element.getAttribute('aria-description') !== description) element.setAttribute('aria-description', description);
          if (panel.presence_dynamic_icon) {
            panel.icon = presenceIcons[Math.min(count, presenceIcons.length - 1)];
            setIcon(element.firstElementChild, panel.icon);
          }
        }
        badge.hidden = !count;
        setText(badge, count);
      }
    }
    if (countdown && !this.ticker && this.isConnected) this.ticker = setInterval(() => this.update(), 1000);
    if (!countdown && this.ticker) { clearInterval(this.ticker); this.ticker = 0; }
  }

  openPanel(type, source, room, entity, toolbar, returnFromRoom, navigation = {}) {
    if (!this.config) return;
    const n = this.nodes;
    const selected = type === 'device' ? room?.entities.find(item => item.entity === entity) : null;
    if (type === 'device' && !selected) return;
    const model = selected ? this.model(selected) : null;
    const boilerControls = selected?.kind === 'boiler' && selected.role !== 'status';
    const fromRoomDetail = selected && this.panel?.type === 'room' &&
      this.panel.room === room && n.modal.open && n.content.contains(source);
    const fromLinkedRoom = (type === 'media' || type === 'vacuum') && returnFromRoom && this.panel?.type === 'room' &&
      this.panel.room === returnFromRoom.room && n.modal.open && n.content.contains(source);
    const returnTo = fromRoomDetail ? { room, entity: selected.entity } : fromLinkedRoom ? returnFromRoom : undefined;
    this.popupScroll.stop();
    const scrollRoute = type === 'room' ? { kind: 'room', room: room.id }
      : boilerControls && this.config.page ? { kind: 'device', room: room.id, entity, detail:navigation.detail } : null;
    const panel = { type, room, returnTo, roomOrigin: type === 'room' && Boolean(source),
      setupRooms: type === 'setup' && navigation.setupRooms === true,
      scrollHash: popupRouteFragment(scrollRoute), routeHash: navigation.hash ?? this.panel?.routeHash };
    this.panel = panel;
    n.back.hidden = !returnTo;
    n.setupFooter.hidden = true;
    n.setupFooter.replaceChildren();
    this.setup = null;
    this.toolbarPanel?.dispose();
    this.wallpaperGallery?.dispose();
    this.roomGraphs?.dispose();
    this.boilerView?.dispose();
    this.toolbarPanel = this.wallpaperGallery = this.roomGraphs = this.boilerView = undefined;
    this.deviceViews.clear();
    this.activitySignature = null;
    setText(n.modalNotice, '');
    const glyph = model?.icon || room?.icon || toolbar?.panel_icon || toolbar?.icon ||
      source?.querySelector('ha-icon')?.getAttribute('icon');
    const title = model?.name || room?.name || toolbar?.name || toolbar?.label || this.t(type);
    n.modal.setAttribute('aria-label', title);
    n.modalTitle.replaceChildren(icon(glyph), title);
    if (type === 'room') this.buildDevices(room.entities, room);
    if (selected) {
      const titleInDialog = ['light', 'climate'].includes(domainFor(selected)) || ['heater', 'boiler'].includes(selected.kind);
      this.buildDevices([selected], undefined, { titleInDialog, showRoomPreset: !room.panelHidden?.has(entity) });
      if (boilerControls) this.buildBoilerView(selected, navigation.detail);
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
    const roomPosition = usesRoomPopupPosition(toolbar);
    const energyReadings = type === 'energy' && toolbar?.sections?.some(section => isEnergyReadingCards(type, section));
    const centeredToolbar = kind === 'toolbar' && !roomPosition && !energyReadings &&
      (type === 'settings' || type === 'energy' || !n.toolbarActions.contains(source ?? null));
    this.popupMotion.open(source, {
      kind,
      roomPosition,
      centeredToolbar,
      highlighted: type === 'room' ? this.roomViews.get(room.id)?.article : source,
    });
    if (panel.scrollHash) this.restorePopupScroll(panel);
    else n.modalBody.scrollTop = 0;
    if (type === 'settings') this.restoreAppearanceReturn();
    this.update();
    if (!navigation.hash && this.popupHistory) {
      const route = type === 'room' ? { kind: type, room: room.id }
        : type === 'device' ? { kind: type, room: room.id, entity }
        : toolbar ? { kind: 'panel', panel: toolbar.id || type } : null;
      const hash = popupRouteFragment(route);
      if (hash) {
        this.popupHistory.open(route, { source, replace: navigation.replace, fromRoom: returnTo?.room.id });
        const location = this.ownerDocument.defaultView.location;
        if (location.pathname === this.popupHistoryPath && popupRouteFragment(this.resolvePopup(location.hash)) === hash) {
          panel.routeHash = location.hash;
        }
      }
    }
  }

  restorePopupScroll(panel) {
    const { modal } = this.nodes;
    if (!panel?.scrollHash || !modal.open) return;
    const view = this.ownerDocument.defaultView;
    const { pathname } = view.location;
    const key = JSON.stringify([homePreferencePaths(pathname)[0], panel.scrollHash]);
    this.popupScroll.start(key, {
      persistent: this.config.page,
      active: () => this.panel === panel && modal.open && !modal.hasAttribute('data-closing') &&
        !this.nativeMoreInfoReturn && view.location.pathname === pathname,
    });
  }

  backToRoom() {
    const panel = this.panel;
    const { room, entity } = panel?.returnTo ?? {};
    if (!entity || !room || !this.nodes.modal.open) return;
    const fallback = () => {
      if (this.panel === panel && this.nodes.modal.open) this.restoreRoomFromPanel(room, entity, { replace: true });
    };
    if (!this.popupHistory?.backToRoom(room.id, { source: entity, fallback })) fallback();
  }

  restoreRoomFromPanel(room, entity, navigation) {
    const source = room && this.roomViews.get(room.id)?.heading;
    if (!source) return;
    this.openPanel('room', source, room, undefined, undefined, undefined, navigation);
    const view = Array.from(this.deviceViews).find(item => item.config.entity === entity);
    (view?.more ?? view?.tile)?.focus({ preventScroll: true });
  }

  dismissPanel(options) {
    if (this.panel?.type === 'settings') {
      const view = this.ownerDocument.defaultView;
      const returning = appearanceReturns.get(view);
      if (returning?.storageKey === this.config?.storageKey) forgetAppearanceReturn(view, returning);
    }
    this.setup?.editor.shadowRoot.activeElement?.blur();
    this.popupScroll.stop();
    const routeHash = this.panel?.routeHash;
    if (routeHash) this.popupHistory?.close(routeHash);
    this.popupMotion.dismiss(options);
  }

  closePanel() {
    const n = this.nodes;
    if (n.modal.open) return;
    this.nativeMoreInfoReturn?.();
    const routeHash = this.panel?.routeHash;
    this.popupScroll.stop();
    n.back.hidden = true;
    n.setupFooter.hidden = true;
    n.setupFooter.replaceChildren();
    this.panel = null;
    this.setup = null;
    this.toolbarPanel?.dispose();
    this.wallpaperGallery?.dispose();
    this.roomGraphs?.dispose();
    this.boilerView?.dispose();
    this.toolbarPanel = this.wallpaperGallery = this.roomGraphs = this.boilerView = undefined;
    this.deviceViews.clear();
    clearInterval(this.ticker);
    this.ticker = 0;
    this.update();
    if (routeHash) this.popupHistory?.close(routeHash);
  }

  buildDevices(entities, room, presentation) {
    const content = this.nodes.content;
    content.className = 'devices';
    if (room) content.dataset.room = 'true';
    else delete content.dataset.room;
    content.replaceChildren();
    if (!room) {
      for (const config of entities) this.buildDevice(config, content, undefined, undefined, presentation);
    } else {
      const shown = device => !room.panelHidden?.has(device.entity);
      const explicit = room.sections?.map(section => ({
        ...section, key: 'room_' + section.kind, entities: section.entities.filter(shown),
      })) ?? [];
      const configured = new Set(explicit.flatMap(section => section.entities.map(device => device.entity)));
      const ungrouped = entities.filter(device => shown(device) && !configured.has(device.entity));
      const groups = [...explicit, ...this.defaultRoomSections(ungrouped)];
      for (const { key, title, columns, tileStatus, entities: members } of groups) {
        if (!members.length) continue;
        const group = make('section', 'device-group');
        group.dataset.group = key;
        if (columns === 2) group.dataset.columns = '2';
        if (title !== '') group.append(make('h3', 'device-group-title', title ?? this.t(key)));
        const single = members.length === 1 ? members[0] : null;
        const timed = single?.timed;
        const inlineClimate = key === 'room_climate' && single && domainFor(single) === 'climate' &&
          Boolean(timed?.simple_timer_entity || timed?.timer_entity || timed?.start_script || timed?.stop_script) &&
          single.role !== 'status' && !['heater', 'boiler'].includes(single.kind);
        for (const config of members) {
          const temperature = (key === 'room_sensors' || key === 'room_weather') &&
            (config.room_temperature_graph_color || isTemperatureSensor(domainFor(config), this._hass?.states?.[config.entity]?.attributes));
          if (!temperature) {
            this.buildDevice(config, group, room, key, { inlineClimate, tileStatus });
            continue;
          }
          this.roomGraphs ??= createRoomGraphs(content, this._hass, {
            make, icon, locale: this.config.locale, t: name => this.t(name),
            moreInfo: (item, source) => this.moreInfo(item, source),
          });
          const fallback = content.ownerDocument.createDocumentFragment();
          if (!config.room_temperature_graph_color) this.buildDevice(config, fallback, room, key);
          group.append(this.roomGraphs.mount(config, fallback.firstElementChild));
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
      const key = (config.kind === 'heater' || config.kind === 'boiler') ? 'room_heating'
        : config.room_device_compact ? 'room_devices' : deviceGroups[domainFor(config)] ?? 'room_devices';
      if (!groups.has(key)) groups.set(key, { key, entities: [] });
      groups.get(key).entities.push(config);
    }
    return groups.values();
  }

  buildDevice(config, parent, room, groupKey, {
    titleInDialog = false, inlineClimate = false, toolbarLightTile = false, toolbarCoverRail = false, showRoomPreset = false,
    tileStatus,
  } = {}) {
    const item = make('section', 'device');
    const domain = domainFor(config);
    const panelKind = ROOM_PANEL_KINDS.get(domain);
    const panelId = config[panelKind + '_panel_id'];
    const panelTarget = room && panelId && this.config.toolbar?.find(
      entry => entry.kind === panelKind && entry.id === panelId);
    const vacuumDisplay = panelTarget && panelKind === 'vacuum' ? config.room_vacuum_presentation : undefined;
    const applianceTile = !!room && config.room_appliance_tile === true;
    const boilerQuick = !!room && config.room_boiler_quick_power === true;
    const roomPowerTile = applianceTile || boilerQuick;
    const tileMode = roomPowerTile || vacuumDisplay === 'tile' || toolbarLightTile ||
      groupKey === 'room_lights' && ['light', 'switch'].includes(domain) && !config.kind;
    const panelOpensOnTap = panelKind === 'vacuum' && config.room_vacuum_panel_on_hold !== true;
    const cover = domain === 'cover' && (!!room || toolbarCoverRail);
    const coverPanel = cover && config.role !== 'status';
    const boilerPanel = !!room && config.kind === 'boiler' && config.role !== 'status';
    const compactDevice = !!room && config.room_device_compact === true;
    const launchFromHeader = !!panelTarget || boilerPanel || coverPanel || compactDevice;
    item.dataset.entity = config.entity;
    item.dataset.treatment = config.kind || domain;
    item.toggleAttribute('data-inline-climate', inlineClimate);
    item.toggleAttribute('data-room-appliance-tile', applianceTile);
    item.toggleAttribute('data-room-boiler-quick', boilerQuick);
    if (compactDevice) item.dataset.roomCompactDevice = domain;
    const roomIcon = room && config.room_icon;
    const glyph = icon(roomIcon || config.icon || 'mdi:information-outline');
    glyph.className = 'device-icon';
    const name = make(tileMode || launchFromHeader ? 'span' : room ? 'h4' : 'h3', 'device-name');
    const state = make('span', 'current');
    const inlineLight = tileMode && domain === 'light' && config.role !== 'status' && config.room_light_controls === true;
    const compactHeater = !!(titleInDialog || room) && config.kind === 'heater' && !!config.timed && config.role !== 'status';
    item.toggleAttribute('data-compact-heater', compactHeater);
    const standaloneBoiler = titleInDialog && config.kind === 'boiler' && config.role !== 'status';
    const vacuumSummary = panelTarget && panelKind === 'vacuum' && vacuumDisplay !== 'tile' ? config.room_vacuum_summary : undefined;
    const vacuumStatusLabels = vacuumSummary?.status_entity && panelTarget.sections?.flatMap(section => section.entities)
      .find(entry => entry.entity === vacuumSummary.status_entity && entry.readout?.state_labels)?.readout.state_labels;
    const view = { config, item, glyph, name, state, fields: [], room, inlineClimate, inlineLight, compactHeater,
      compactClimateControls: Boolean(room || showRoomPreset) && config.room_climate_controls_compact === true,
      standaloneBoiler, compactCover: cover, vacuumCleaningControls: vacuumDisplay === 'cleaning-controls',
      vacuumSummary, vacuumStatusLabels, roomPowerTile, compactDevice,
      compactMedia: !!room && domain === 'media_player' && (compactDevice || config.room_media_compact === true),
      dualLightDetail: titleInDialog && config.room_dual_light_detail === true,
      compactLightReading: (titleInDialog || !!room) && config.room_compact_light_reading === true };
    const bindPanelLaunch = source => {
      const targetName = panelTarget.label || this.t(panelKind);
      const hint = panelOpensOnTap ? this.t('vacuum_room_hold') : this.t('room_panel_hold').replace('{name}', targetName);
      const open = () => this.openPanel(panelKind, source, undefined, undefined,
        { ...panelTarget, name: targetName }, { room, entity: config.entity });
      const showDetails = () => this.moreInfo(config, source);
      source.onclick = panelOpensOnTap ? open : showDetails;
      source.setAttribute('aria-description', hint);
      bindDeviceDetails(source, panelOpensOnTap ? showDetails : open);
      view.panelLaunch = { action: panelOpensOnTap ? this.t('vacuum_room_open').replace('{name}', targetName)
        : this.t('more_info'), hint };
    };
    if (tileMode) {
      item.dataset.compact = 'tile';
      const tile = button('device-tile');
      tile.append(glyph, name, state);
      tile.setAttribute('aria-haspopup', 'dialog');
      if (vacuumDisplay === 'tile') bindPanelLaunch(tile);
      else if (roomPowerTile) {
        let activationAction;
        const visible = () => tile.isConnected && this.panel?.room === room && this.nodes.modal.open &&
          isVisibleEntity(config.entity, this._hass?.states ?? {}, this._hass?.entities, this.config.hiddenEntities);
        tile.setAttribute('aria-description', this.t(boilerQuick ? 'boiler_room_hold' : 'appliance_room_hold'));
        if (boilerQuick) tile.setAttribute('aria-keyshortcuts', 'Shift+Enter Shift+Space Shift+F10');
        bindDeviceDetails(tile, () => {
          activationAction = undefined;
          if (!visible()) return;
          if (boilerQuick) this.openDeviceDetails(config, tile, room);
          else this.moreInfo(config, tile, visible);
        }, { requireShortTap: true, activationStart: () => { activationAction = tile.dataset.action ?? ''; } });
        tile.onclick = () => {
          const armed = activationAction ?? tile.dataset.action;
          activationAction = undefined;
          const action = this.roomPowerTileAction(config);
          if (action && action === armed && action === tile.dataset.action && visible()) {
            this.requestAction(config, action, undefined, tile, { roomPowerTile: true });
          }
        };
      } else {
        tile.onclick = () => this.quickAction(config, tile, room);
        const nativeRoomLightHold = room && !toolbarLightTile && config.room_light_native_hold === true;
        bindDeviceDetails(tile, () => {
          if (!nativeRoomLightHold) this.openDeviceDetails(config, tile, room);
          else if (isVisibleEntity(config.entity, this._hass?.states ?? {}, this._hass?.entities,
            this.config.hiddenEntities)) this.moreInfo(config, tile);
        });
      }
      if (tileStatus === 'attention') {
        tile.setAttribute('data-attention-status', '');
        view.tileHint = tile.getAttribute('aria-description');
      }
      view.tile = tile;
      item.append(tile);
      if (inlineLight) {
        item.dataset.inlineLight = '';
        view.group = make('div', 'action-list');
        item.append(view.group);
      }
    } else {
      const details = make(launchFromHeader ? 'span' : 'div', 'device-detail');
      details.append(name, state);
      const nativeRoomCover = coverPanel && !!room && config.room_cover_native_details === true;
      const hasPanel = (cover && !!room && !nativeRoomCover) || boilerPanel;
      if (cover) item.dataset.compact = 'cover';
      const more = launchFromHeader ? button('device-head device-panel-launch')
        : button('round-action', this.t(hasPanel ? 'device_controls' : 'more_info'),
          cover ? roomIcon || config.icon || DEVICE_ICONS.cover : 'mdi:information-outline', true);
      if (hasPanel || nativeRoomCover || compactDevice) more.setAttribute('aria-haspopup', 'dialog');
      more.onclick = () => {
        if (hasPanel) this.openPanel('device', more, room, config.entity);
        else if (!(nativeRoomCover || compactDevice) || isVisibleEntity(config.entity, this._hass?.states ?? {}, this._hass?.entities,
          this.config.hiddenEntities)) this.moreInfo(config, more);
      };
      const head = launchFromHeader ? more : make('header', 'device-head');
      if (titleInDialog) {
        head.classList.add('device-state-head');
        head.classList.toggle('boiler-state-head', standaloneBoiler);
        glyph.hidden = !standaloneBoiler;
        name.hidden = true;
      }
      if (panelTarget) {
        head.append(glyph, details);
        if (!compactDevice) head.append(icon(panelOpensOnTap ? 'mdi:arrow-top-right' : 'mdi:information-outline'));
        bindPanelLaunch(more);
      } else if (boilerPanel || coverPanel || compactDevice) {
        bindDeviceDetails(more, more.onclick);
        head.append(glyph, details);
        if (boilerPanel) head.append(icon('mdi:arrow-top-right'));
        const native = toolbarCoverRail || nativeRoomCover || compactDevice;
        view.panelLaunch = { action: this.t(native ? 'more_info' : 'device_controls'), native };
      } else {
        if (titleInDialog && domain === 'light' && config.role !== 'status' &&
            (config.room_light_controls === true || view.dualLightDetail || view.compactLightReading)) {
          const power = button('round-action compact-light-power', this.t('turn_on'), 'mdi:power', true);
          power.hidden = true;
          power.onclick = () => this.requestAction(config, power.dataset.action, undefined, power);
          head.append(power);
          view.lightPower = power;
        }
        if ((room || showRoomPreset) && config.room_climate_power === true) {
          const compact = view.compactClimateControls;
          const power = button('round-action room-climate-power', this.t('climate_power'),
            compact ? config.icon || 'mdi:air-conditioner' : 'mdi:power', true);
          power.toggleAttribute('data-compact', compact);
          glyph.hidden = true;
          head.append(power);
          const visible = () => isVisibleEntity(config.entity, this._hass?.states ?? {}, this._hass?.entities, this.config.hiddenEntities);
          power.onclick = () => {
            const action = roomClimatePowerAction(this.model(config));
            if (visible() && action === power.dataset.action && climatePowerServiceRegistered(this._hass, action)) {
              this.requestAction(config, action, undefined, power);
            }
          };
          bindDeviceDetails(power, () => { if (visible()) this.moreInfo(config, power); });
          view.climatePower = power;
        }
        head.append(glyph, details);
        const shortcut = (room || showRoomPreset) && config.room_climate_preset;
        if (shortcut) {
          const action = button('round-action climate-preset-shortcut', '', shortcut.icon || 'mdi:tune-variant', true);
          const caption = make('span', '', shortcut.label || this.t('set_preset_mode'));
          action.append(caption);
          label(action, (shortcut.label ? shortcut.label + ' · ' : '') +
            this.t('climate_apply_preset').replace('{preset}', this.presetName(shortcut.preset)));
          action.onclick = () => {
            if (this.canUseRoomPreset(config, this.model(config))) {
              this.requestAction(config, 'set_preset_mode', shortcut.preset, action);
            }
          };
          head.append(action);
          view.presetShortcut = action;
        }
        if (titleInDialog && config.light_status_refresh_button) {
          const refresh = button('round-action light-status-refresh', this.t('light_refresh_status'), 'mdi:refresh', true);
          refresh.disabled = true;
          refresh.onclick = () => {
            if (!refresh.isConnected || this.panel?.type !== 'device' || !this.nodes.modal.open ||
                this.nodes.modal.hasAttribute('data-closing')) return;
            const target = this.lightStatusRefreshTarget(config);
            if (target) this.requestAction(target, 'press_button', undefined, refresh);
          };
          head.append(refresh);
          view.lightStatusRefresh = refresh;
        }
        head.append(more);
      }
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
      sections: toolbar?.sections,
      entities: toolbar?.entities ?? (toolbar?.calendar_agenda ? [] : this.config.context[type]) ?? [],
      orefMap: toolbar?.oref_map,
      vacuumMap: toolbar?.vacuum_map,
      mediaStage: toolbar?.media_stage,
      mediaRemote: toolbar?.media_remote,
      calendarAgenda: toolbar?.calendar_agenda,
      energyDashboardLink: toolbar?.energy_dashboard_link !== false,
    }, {
      host: content, dialog: this.nodes.modal, hass: this._hass, getHass: () => this._hass,
      locale: this.config.locale, hiddenEntities: this.config.hiddenEntities,
      make, button, icon, label, t: key => this.t(key),
      modelFor: item => this.model(item), stateLabel: model => this.stateLabel(model, type === 'overview' ? 'overview' : undefined),
      moreInfo: (item, source) => this.moreInfo(item, source), pending: entity => this.pending.has(entity),
      request: (item, action, value, source, options) => this.requestAction(item, action, value, source, options),
      turnOffEntities: (entities, name) => this.turnOffEntities(entities, name),
      buildDevice: (item, slot, presentation) => this.buildDevice(item, slot, undefined, undefined, presentation),
      graphDestination: item => {
        if (type !== 'sensors') return;
        const room = this.roomViews.get(item.graph_room_id)?.room;
        if (room) return { kind: 'room', room };
        const vacuum = item.vacuum_panel_id && this.config.toolbar?.find(
          entry => entry.kind === 'vacuum' && entry.id === item.vacuum_panel_id);
        if (vacuum) return { kind: 'vacuum', vacuum };
      },
      openGraphDestination: ({ kind, room, vacuum }, source) => {
        if (this.panel?.type !== 'sensors' || !content.contains(source)) return;
        if (kind === 'room') this.openPanel('room', source, room);
        else this.openPanel('vacuum', source, undefined, undefined, { ...vacuum, name: vacuum.label || this.t('vacuum') });
      },
    });
  }

  buildBoilerView(config, detail) {
    const content = this.nodes.content;
    const controls = make('div', 'boiler-pane');
    controls.append(...content.childNodes);
    const host = make('div', 'boiler-pane boiler-history-host');
    host.hidden = true;
    const tabs = make('div', 'boiler-tabs');
    tabs.dir = 'ltr';
    let panel;
    const stacked = config.boiler_timer_with_details === true;
    const choices = [
      {label:'timed', icon:'mdi:timer-outline', element:controls},
      {label:'boiler_history', icon:'mdi:history', element:host,
        open:() => openBoilerHistory({host, config, locale:this.config.locale, hass:this._hass, t:key=>this.t(key)})},
    ];
    if (isBoilerScheduleProfile(config) && (config.schedule || this._hass?.services?.scheduler)) {
      const scheduleHost = make('div','boiler-pane boiler-schedule-host');
      scheduleHost.hidden = true;
      choices.splice(1,0,{label:'boiler_schedule',icon:'mdi:calendar-clock',element:scheduleHost,open:() => {
        const popup = this.panel;
        const isCurrent = () => {
          const { modal } = this.nodes;
          const { location } = this.ownerDocument.defaultView;
          return this.isConnected && this.panel === popup && modal.open && !modal.hasAttribute('data-closing') &&
            (!popup?.routeHash || (location.pathname === this.popupHistoryPath && location.hash === popup.routeHash));
        };
        const pauseScrollMemory = stacked && popup?.scrollHash ? () => {
          this.popupScroll.stop();
          return () => { if (isCurrent()) this.restorePopupScroll(popup); };
        } : undefined;
        const schedule = createBoilerSchedulePanel(config, {
          host: scheduleHost, viewport: this.nodes.modalBody, hass: this._hass, locale: this.config.locale,
          compact: stacked, pauseScrollMemory, isCurrent,
        });
        return {update:schedule.update,dispose:schedule.destroy};
      }});
    }
    const compactNavigation = !stacked && !!(config.timed?.simple_timer_entity ||
      (config.timed?.start_script && config.timed.timer_entity));
    const [timer, ...secondary] = choices;
    const selectable = stacked ? secondary : choices;
    const detailPreference = this.config.storageKey + ':boiler-detail:' + config.entity;
    let active = timer;
    let returnButton;
    let timerScroll = 0;
    const activate = (item, remember = false) => {
      if (active === item) return;
      if (!stacked && active === timer) this.popupScroll.stop();
      if (compactNavigation && active === timer) {
        returnButton = item.tab;
        timerScroll = this.nodes.modalBody.scrollTop;
      }
      panel?.dispose();
      active = item;
      for (const choice of selectable) {
        choice.element.hidden = choice !== item;
        choice.tab.setAttribute('aria-pressed', String(choice === item));
      }
      panel = item.open?.();
      panel?.update(this._hass);
      if (compactNavigation) {
        const returning = item === timer;
        timer.tab.hidden = returning;
        this.nodes.modalBody.scrollTop = returning ? timerScroll : 0;
        if (returning) returnButton?.focus({ preventScroll: true });
      }
      if (!stacked && item === timer) this.restorePopupScroll(this.panel);
      if (stacked && remember) {
        try { localStorage.setItem(detailPreference, item.label); } catch {}
      }
    };
    for (const item of selectable) {
      const tab = button('control-button', this.t(item.label), item.icon);
      tab.id = 'boiler-tab-' + item.label;
      item.element.id = 'boiler-pane-' + item.label;
      item.element.setAttribute('role', 'region');
      item.element.setAttribute('aria-labelledby', tab.id);
      tab.setAttribute('aria-controls', item.element.id);
      tab.hidden = compactNavigation && item === timer;
      tab.setAttribute('aria-pressed', String(item === active));
      tab.onclick = () => activate(item, true);
      tabs.append(tab);
      item.tab = tab;
    }
    content.className = 'boiler-panel';
    const secondaryPanes = secondary.map(item => item.element);
    if (stacked || compactNavigation) content.append(controls, tabs, ...secondaryPanes);
    else content.append(tabs, controls, ...secondaryPanes);
    this.boilerView = {update:hass=>panel?.update(hass), dispose:()=>panel?.dispose()};
    const linkedPane = detail === 'schedule' && secondary.find(item => item.label === 'boiler_schedule');
    if (linkedPane) activate(linkedPane);
    else if (stacked) {
      let saved;
      try { saved = localStorage.getItem(detailPreference); } catch {}
      activate(secondary.find(item => item.label === saved) ?? secondary[0]);
    }
  }

  lightStatusRefreshTarget(config) {
    const entity = config.light_status_refresh_button;
    const { states = {}, entities, services } = this._hass ?? {};
    if (!isPairedLightStatusRefresh(config.entity, entity, entities) ||
        !Object.hasOwn(services?.button ?? {}, 'press') || this.pending.has(config.entity) ||
        !this.canRequest(entity, 'press_button') ||
        ![config.entity, entity].every(id => isVisibleEntity(id, states, entities, this.config.hiddenEntities))) return;
    const target = { entity, role: 'action', light_status_refresh_for: config.entity };
    if (this.model(target).actions.press_button) return target;
  }

  timerHistoryEntity(config, model) {
    const timer = model.timer?.entity;
    if (!this.canShowTimerUsage(timer)) return;
    if (config.timed?.simple_timer_entity === timer) {
      const status = simpleTimerStatusEntity(this._hass, timer);
      if (this.canShowTimerUsage(status)) return status;
    }
    return timer;
  }

  canShowTimerUsage(entity) {
    return typeof entity === 'string' &&
      isVisibleEntity(entity, this._hass?.states ?? {}, this._hass?.entities, this.config.hiddenEntities);
  }

  canResetTimerUsage(entity) {
    return this.canShowTimerUsage(entity) && simpleTimerUsageResetAvailable(this._hass, entity);
  }

  presetName(preset) {
    return preset === 'none' ? this.t('climate_preset_none')
      : preset === 'eco' ? this.t('climate_preset_eco') : preset;
  }

  canUseRoomPreset(config, model) {
    const hass = this._hass;
    return model.actions.set_preset_mode?.options.includes(config.room_climate_preset.preset) === true &&
      Object.hasOwn(hass?.services?.climate ?? {}, 'set_preset_mode') &&
      isVisibleEntity(config.entity, hass?.states ?? {}, hass?.entities, this.config.hiddenEntities);
  }

  moreInfo(config, source, shortcutActive) {
    if (!this.model(config).actions.more_info) return;
    this.nativeMoreInfoReturn?.();
    const view = this.ownerDocument.defaultView;
    const event = new view.CustomEvent('hass-more-info', {
      detail: { entityId: config.entity }, bubbles: true, composed: true,
    });
    const panel = this.panel;
    const { modal, modalBody } = this.nodes;
    const fromPanel = panel && modal.open && !modal.hasAttribute('data-closing') && source && modal.contains(source);
    if (fromPanel || shortcutActive) {
      this.nativeMoreInfoReturn = preserveMoreInfoReturn(view, {
        event, source, body: fromPanel ? modalBody : undefined,
        active: fromPanel
          ? () => this.isConnected && this.panel === panel && modal.open && !modal.hasAttribute('data-closing')
          : () => !this.panel && shortcutActive(),
        stopped: () => { this.nativeMoreInfoReturn = undefined; },
      });
    }
    this.dispatchEvent(event);
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
      const roomName = view.room ? view.config.room_name : undefined;
      const labelName = roomName || model.name;
      setText(view.name, labelName);
      view.name.toggleAttribute('data-room-name-hidden', roomName === '' || (view.inlineClimate && roomName === undefined));
      setIcon(view.glyph, (view.room && view.config.room_icon) || model.icon);
      if (model.timer?.state === 'active') countdown = true;
      const media = model.domain === 'media_player' && view.config.role !== 'now_playing' &&
        typeof model.attributes.media_title === 'string'
        ? model.attributes.media_title.trim().slice(0, 160) : '';
      const pending = this.pending.get(view.config.entity);
      const feedback = this.coverFeedback(model, pending);
      if (view.compactCover) {
        view.item.toggleAttribute('data-cover-motion', model.available && coverMovingStates.has(model.state));
      }
      if (view.climatePower) {
        const power = view.climatePower;
        const action = roomClimatePowerAction(model);
        power.dataset.action = action ?? '';
        power.disabled = !!pending || !climatePowerServiceRegistered(this._hass, action) ||
          !isVisibleEntity(model.entity, this._hass?.states ?? {}, this._hass?.entities, this.config.hiddenEntities);
        const powered = roomClimatePowerState(model);
        label(power, this.t('climate_power') + ' · ' + labelName);
        if (powered !== undefined) power.setAttribute('aria-pressed', String(powered));
        else power.removeAttribute('aria-pressed');
        power.setAttribute('aria-busy', String(!!pending));
      }
      if (view.presetShortcut) {
        const action = view.presetShortcut;
        const shortcut = view.config.room_climate_preset;
        const active = model.attributes.preset_mode;
        const observed = model.actions.set_preset_mode?.options.includes(active);
        action.hidden = !this.canUseRoomPreset(view.config, model);
        action.disabled = action.hidden || !!pending;
        action.toggleAttribute('data-highlighted', !!observed && active === (shortcut.highlight_when ?? shortcut.preset));
        action.setAttribute('aria-busy', String(pending?.id === 'set_preset_mode'));
        if (observed) action.setAttribute('aria-description', this.t('climate_current_preset').replace('{preset}', this.presetName(active)));
        else action.removeAttribute('aria-description');
      }
      const deviceStatus = feedback?.requestLabel || this.stateLabel(model, view.inlineClimate ? 'inline-climate' : undefined);
      if (view.vacuumSummary) {
        const stateFor = id => id && isVisibleEntity(id, this._hass?.states ?? {}, this._hass?.entities, this.config.hiddenEntities)
          ? this._hass.states[id] : undefined;
        const summary = roomVacuumSummary(view.vacuumSummary, stateFor, model.state, view.vacuumStatusLabels);
        const parts = [summary.status ?? deviceStatus];
        if (summary.battery !== undefined) parts.push(this.t('vacuum_room_battery').replace('{value}', ltr(summary.battery + '%')));
        if (summary.progress !== undefined) parts.push(this.t('vacuum_room_progress').replace('{value}', ltr(summary.progress + '%')));
        const reading = parts.join(' · ');
        setText(view.state, reading);
        const description = view.panelLaunch.hint + ' · ' + reading;
        if (view.more.getAttribute('aria-description') !== description) view.more.setAttribute('aria-description', description);
      } else if (view.compactMedia) {
        const volume = model.attributes.volume_level;
        const parts = [deviceStatus, model.available && media];
        if (model.available && Number.isFinite(volume) && volume >= 0 && volume <= 1) {
          parts.push(this.t('room_media_volume').replace('{value}', ltr(Math.round(volume * 100) + '%')));
        }
        const reading = parts.filter(Boolean).join(' · ');
        setText(view.state, reading);
        if (view.panelLaunch) {
          const description = [view.panelLaunch.hint, reading].filter(Boolean).join(' · ');
          if (view.more.getAttribute('aria-description') !== description) view.more.setAttribute('aria-description', description);
        }
      } else setText(view.state, deviceStatus + (media ? ' · ' + media : ''));
      if (view.compactDevice && model.domain === 'lock') {
        view.more.setAttribute('aria-description', deviceStatus);
        view.item.dataset.lockState = model.available ? model.state : '';
      }
      view.state.dataset.tone = feedback ? 'moving' : this.tone(model);
      if (view.standaloneBoiler) view.item.toggleAttribute('data-boiler-heating', model.available && model.state === 'on');
      const powerTileAction = view.roomPowerTile && !pending && this.roomPowerTileAction(view.config, model);
      if (view.tileHint !== undefined) {
        const sending = pending && model.available ? this.t('sending').replace('{name}', labelName) : '';
        const attention = model.available ? sending : deviceStatus;
        view.state.hidden = !attention;
        if (attention) setText(view.state, attention);
        // Power tiles with no available action already include the reported state in their label.
        const reported = view.roomPowerTile && !powerTileAction ? '' : deviceStatus;
        const description = [view.tileHint, reported, sending].filter(Boolean).join(' · ');
        if (view.tile.getAttribute('aria-description') !== description) view.tile.setAttribute('aria-description', description);
      }
      if (view.roomPowerTile) {
        const action = powerTileAction;
        if (action) view.tile.dataset.action = action;
        else delete view.tile.dataset.action;
        const actionLabel = action === 'stop_timed' ? this.t('boiler_room_stop') : action ? this.t(action) : deviceStatus;
        label(view.tile, labelName + ' · ' + actionLabel);
        const assumedBoiler = view.config.room_boiler_quick_power && model.attributes.assumed_state === true;
        if (!assumedBoiler && model.available && view.config.role !== 'status' && ['on','off'].includes(model.state)) {
          view.tile.setAttribute('aria-pressed', String(model.state === 'on'));
        } else view.tile.removeAttribute('aria-pressed');
        view.tile.setAttribute('aria-busy', String(!!pending));
        continue;
      }
      if (view.tile && !view.panelLaunch) {
        const actionId = model.state === 'off' ? 'turn_on' : 'turn_off';
        const toggles = !!model.actions[actionId];
        label(view.tile, labelName + ' · ' + this.t(toggles ? actionId : 'more_info'));
        if (toggles) view.tile.setAttribute('aria-pressed', String(model.state === 'on'));
        else view.tile.removeAttribute('aria-pressed');
        view.tile.setAttribute('aria-busy', String(!!pending));
        if (!view.room) view.tile.disabled = !toggles && !model.actions.more_info;
        if (!view.inlineLight) continue;
      }
      if (view.panelLaunch) {
        const launch = view.more ?? view.tile;
        label(launch, labelName + ' · ' + view.panelLaunch.action);
        if (view.panelLaunch.native) launch.disabled = !model.actions.more_info;
        if (view.panelLaunch.hint && launch.title !== view.panelLaunch.hint) launch.title = view.panelLaunch.hint;
        if (view.tile) continue;
      } else if (view.more) {
        view.more.hidden = !model.actions.more_info;
        if (view.inlineClimate) label(view.more, this.t('more_info') + ' · ' + labelName);
      }
      const timerLayout = model.timer ? [model.timer.state, Number.isFinite(model.timer.usedSeconds), model.state === 'on'] : null;
      const coverClass = model.domain === 'cover' ? model.attributes.device_class : null;
      const confirmedIdle = model.available && model.state === 'off' && model.timer?.state === 'idle';
      const hideIdleTimedOff = confirmedIdle &&
        (view.compactHeater || (view.standaloneBoiler && !!model.actions.start_timed));
      const compactCommands = view.compactDevice && this.roomCompactCommands(model);
      const mutePlaceholder = view.compactDevice && view.compactMedia && compactMediaMutePlaceholder(model);
      const signature = JSON.stringify([actionsInOrder.map(id => model.actions[id] || null), timerLayout,
        model.levelAction, coverClass, hideIdleTimedOff, compactCommands, mutePlaceholder, mutePlaceholder && model.attributes.is_volume_muted === true]);

      if (signature !== view.signature) {
        view.signature = signature;
        this.buildActions(view, model, hideIdleTimedOff, compactCommands, mutePlaceholder);
      }
      if (view.lightPower && (view.compactLight || view.compactColorLight)) {
        const power = view.lightPower;
        const actionId = model.state === 'on' ? 'turn_off' : 'turn_on';
        power.dataset.action = actionId;
        power.toggleAttribute('data-powered', model.state === 'on');
        power.disabled = !this.canRequest(view.config.entity, actionId);
        label(power, this.t(actionId));
      }
      if (view.lightStatusRefresh) {
        view.lightStatusRefresh.disabled = !this.lightStatusRefreshTarget(view.config);
        view.lightStatusRefresh.setAttribute('aria-busy', String(this.pending.has(view.config.light_status_refresh_button)));
      }
      view.item.setAttribute('aria-busy', String(!!pending));
      for (const control of view.group.querySelectorAll('button,input,select')) {
        if (control.dataset.lightMode || control.hasAttribute('data-room-mute-placeholder')) continue;
        const id = control.dataset.action;
        control.disabled = !this.canRequest(view.config.entity, id) || (view.compactCover && !allowsCoverRailAction(model, id));
      }
      view.special.update(model, pending);
      view.effectGallery?.update(model, this.canRequest(view.config.entity, 'set_effect'));
      view.colorPalette?.update(model, pending);
      for (const field of view.fields) {
        this.syncField(field, model);
        if (field.valid && !field.valid(field.input.value)) field.apply.disabled = true;
      }
    }
    return countdown;
  }

  settingsScreens() {
    return settingsScreenEntries(this.config).map(item => ({
      ...item, icon:item.icon ?? toolbarIcons[item.kind], name:item.label || this.t(item.kind),
    }));
  }

  paintSettings() {
    const content = this.nodes.content;
    content.className = 'settings';
    content.replaceChildren();
    const deviceAppearance = make('section', 'appearance-preferences');
    deviceAppearance.setAttribute('aria-label', this.t(this.canSyncAppearance() ? 'appearance_household' : 'appearance_browser'));
    this.wallpaperGallery = createWallpaperGallery({ locale: this.config.locale, controller: this.wallpaper,
      selected: this.activeWallpaper || this.config.background, sharedWallpapers: this.config.sharedWallpapers,
      householdSaving: this.canSyncAppearance(),
      onSelect: id => this.chooseAppearance('background', id),
      onUpload: file => this.selectWallpaper(personalWallpaperId, { file }) });
    deviceAppearance.append(this.wallpaperGallery.element);
    const arrange = make('details', 'appearance-disclosure appearance-layout');
    const layoutSummary = make('summary', '', this.t('appearance_layout'));
    const arrangement = make('div', 'appearance-layout-options');
    arrange.append(layoutSummary, arrangement);
    for (const key of ['shape','layout']) {
      const values = options[key];
      const group = make('fieldset', 'prefs-group');
      group.append(make('legend', '', this.t(key)));
      const choices = make('div', 'prefs-options');
      for (const value of values) {
        const el = button('control-button', this.t(value));
        el.value = value;
        el.dataset.preference = key;
        el.onclick = () => this.chooseAppearance(key, value);
        choices.append(el);
      }
      group.append(choices);
      arrangement.append(group);
    }
    const appearanceActions = make('div', 'appearance-actions');
    const focusSummary = (control, wallpaperChanged) => {
      if (this.shadowRoot.activeElement !== control) return;
      const wallpaperSummary = !arrange.open && wallpaperChanged && this.wallpaperGallery.element.querySelector('summary');
      (wallpaperSummary || layoutSummary).focus({ preventScroll: true });
    };
    const status = make('p', 'setup-status');
    status.setAttribute('role', 'status');
    const reset = button('control-button', this.t('appearance_reset'));
    reset.onclick = () => {
      if (this.canSyncAppearance() && this.appearanceSave) return;
      focusSummary(reset, Object.hasOwn(this.preferences, 'background'));
      status.textContent = '';
      this.preferences = {};
      this.persistPreferences();
    };
    const actions = { element: appearanceActions, panel: this.panel, reset, status };
    this.appearanceActions = actions;
    appearanceActions.append(reset);
    if (this.config.page && this._hass?.user?.is_admin && !this.canSyncAppearance()) {
      actions.share = button('control-button', this.t('appearance_share'), 'mdi:content-save-outline');
      actions.share.onclick = () => {
        focusSummary(actions.share, Object.hasOwn(this.appearanceChanges(), 'background'));
        void this.saveAppearance(actions);
      };
      appearanceActions.append(actions.share);
    }
    appearanceActions.append(status);
    deviceAppearance.append(arrange, appearanceActions);
    content.append(deviceAppearance);
    this.applyPreferences();

    const screens = make('div', 'settings-screens');
    for (const item of this.settingsScreens()) {
      const route = button('control-button', item.name, item.icon);
      route.onclick = () => item.kind === 'link' ? location.assign(item.path)
        : this.openPanel(item.kind, route, undefined, undefined, item);
      screens.append(route);
    }
    if (screens.childElementCount) {
      const group = make('section', 'settings-shortcuts');
      group.append(make('h3', 'settings-shortcuts-title', this.t('settings_shortcuts')), screens);
      content.append(group);
    }
    const system = make('div', 'settings-system');
    if (this.config.page && this.config.fullscreen) {
      const bypass = new URL(location.href).searchParams.has('disable_km');
      const menu = button('control-button', this.t(bypass ? 'fullscreen' : 'ha_menu'), 'mdi:menu');
      menu.onclick = () => {
        this.dismissPanel({ immediate: true, restoreFocus: false });
        this.pageChrome.toggleHomeAssistantMenu();
      };
      system.append(menu);
    }
    if (this._hass?.user?.is_admin) {
      const setup = button('control-button setup-entry', this.t('setup'), 'mdi:tune-variant');
      setup.onclick = () => this.openSetup(setup);
      system.append(setup);
    }
    if (system.childElementCount) content.append(system);
  }

  openSetup(source, navigation) {
    if (!this._hass?.user?.is_admin || (this.canSyncAppearance() && this.appearanceSave)) return;
    this.openPanel('setup', source, undefined, undefined, undefined, undefined, navigation);
  }

  async paintSetup() {
    const page = this.panel;
    const { content, setupFooter } = this.nodes;
    setupFooter.hidden = true;
    setupFooter.replaceChildren();
    const status = make('p', 'setup-status', this.t('setup_loading'));
    status.setAttribute('role', 'status');
    content.className = 'setup-page';
    content.replaceChildren(status);
    this.setup = null;
    try {
      let current = await loadConfiguration(this._hass, location.pathname);
      if (this.panel !== page) return;
      const key = JSON.stringify([this._hass.user.id, current.urlPath]);
      let restored = setupDrafts.get(key);
      if (restored?.pendingSave) {
        // A dismissed editor can be reopened before its save request finishes.
        await restored.pendingSave.catch(() => {});
        if (this.panel !== page) return;
        current = await loadConfiguration(this._hass, location.pathname);
        if (this.panel !== page) return;
        restored = setupDrafts.get(key);
      }
      const session = restored ?? { base: current, draft: current.strategy };
      const baseline = JSON.stringify(session.base.strategy);
      let conflict = JSON.stringify(current.strategy) !== baseline;
      const editor = customElements.get('ll-strategy-dashboard-' + STRATEGY_NAME).getConfigElement();
      editor.classList.add('setup-editor');
      if (page.setupRooms) editor.openRooms();
      editor.setConfig(structuredClone(session.draft));
      editor.hass = this._hass;
      this.setup = { editor };

      const save = button('control-button', this.t('setup_save'), 'mdi:content-save-outline');
      const discard = button('control-button', this.t('setup_discard'));
      const updateActions = () => {
        const dirty = JSON.stringify(session.draft) !== baseline;
        save.disabled = !dirty || conflict || Boolean(session.pendingSave);
        discard.hidden = !dirty && !conflict;
        discard.disabled = Boolean(session.pendingSave);
        editor.inert = Boolean(session.pendingSave);
      };
      editor.addEventListener('config-changed', event => {
        session.draft = event.detail.config;
        if (JSON.stringify(session.draft) !== baseline) setupDrafts.set(key, session);
        else if (setupDrafts.get(key) === session) setupDrafts.delete(key);
        updateActions();
      });
      discard.onclick = () => {
        if (setupDrafts.get(key) === session) setupDrafts.delete(key);
        void this.paintSetup();
      };
      save.onclick = async () => {
        const view = this.ownerDocument.defaultView;
        const initialUrl = view.location.href;
        const route = page.routeHash && view.location.hash === page.routeHash ? page.routeHash : null;
        const watch = new view.AbortController();
        let stayedOnRoute = true;
        if (route) {
          const observeNavigation = event => {
            if (event.type === 'popstate' || view.location.href !== initialUrl) stayedOnRoute = false;
          };
          for (const event of ['location-changed', 'hashchange', 'popstate']) {
            view.addEventListener(event, observeNavigation, { signal: watch.signal });
          }
        }
        session.pendingSave = saveConfiguration(this._hass, session.base, session.draft);
        updateActions();
        status.textContent = this.t('setup_saving');
        let saved = false;
        try {
          await session.pendingSave;
          saved = true;
          if (setupDrafts.get(key) === session) setupDrafts.delete(key);
          if (route) {
            if (!stayedOnRoute || view.location.href !== initialUrl) return;
            // Home Assistant can remount the dashboard when it broadcasts the saved configuration.
            if (!this.popupHistory?.close(route)) {
              const home = new URL(initialUrl);
              home.hash = '';
              view.history.replaceState(view.history.state, '', home);
            }
          } else if (this.panel !== page || !this.isConnected) return;
          view.location.reload();
        } catch (error) {
          if (this.panel !== page) return;
          conflict = error.code === 'setup_conflict';
          status.textContent = conflict ? this.t('setup_draft_conflict') : this.configurationErrorText(error);
        } finally {
          watch.abort();
          session.pendingSave = undefined;
          if (this.panel === page && !saved) updateActions();
        }
      };
      status.textContent = conflict ? this.t('setup_draft_conflict') : restored ? this.t('setup_draft_restored') : '';
      updateActions();
      content.replaceChildren(editor);
      setupFooter.replaceChildren(status, save, discard);
      setupFooter.hidden = false;
    } catch (error) {
      if (this.panel === page) status.textContent = this.configurationErrorText(error);
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

  roomCompactCommands(model) {
    if (model.domain !== 'lock') return compactRoomMediaCommands(model);
    const action = compactRoomLockCommand(model);
    return action ? [action] : [];
  }

  canUseRoomCompactCommand(config, model, action) {
    return isVisibleEntity(config.entity, this._hass?.states ?? {}, this._hass?.entities, this.config.hiddenEntities) &&
      this.roomCompactCommands(model).includes(action);
  }

  buildActions(view, model, hideIdleTimedOff, compactCommands, mutePlaceholder) {
    const active = this.shadowRoot.activeElement;
    const focused = active && view.group.contains(active) ? active.dataset : undefined;
    view.fields = [];
    if (view.config.effect_favorites && view.effectGallery) view.effectGallerySession = view.effectGallery.capture();
    view.effectGallery = null;
    view.colorPalette = null;
    const basic = make('div', 'basic-actions');
    const complex = new Map();
    const standaloneClimate = this.panel?.type === 'device' && model.kind === 'climate';
    const advancedClimate = standaloneClimate ? make('details', 'climate-extra-controls') : undefined;
    const { actions } = model;
    view.compactLight = !!((view.lightPower || view.inlineLight) && actions.set_brightness && actions.set_color_temp_kelvin &&
      actions.turn_on && actions.turn_off && !actions.set_light_color && !actions.set_effect);
    view.compactColorLight = Boolean(view.lightPower && view.compactLightReading && actions.set_brightness &&
      actions.turn_on && actions.turn_off && (actions.set_light_color || actions.set_effect));
    const compactLightPower = view.compactLight || view.compactColorLight;
    view.item.toggleAttribute('data-compact-light', compactLightPower);
    if (view.lightPower) {
      view.lightPower.hidden = !compactLightPower;
      if (view.lightPower.hidden && active === view.lightPower) view.more.focus({ preventScroll: true });
    }
    if (view.compactLight) complex.set('compact_light', this.buildCompactLightAdjustments(view, model));
    const curtain = model.domain === 'cover' && model.attributes.device_class === 'curtain';
    const timing = view.config.timed;
    const timerPreferenceKey = timing && 'bayit-9.timer-duration.v1:' +
      (timing.simple_timer_entity ?? timing.timer_entity ?? view.config.entity);
    view.special = buildPanelControls(model, { make, button, icon, label, t: key => this.t(key),
      compactTimer: view.inlineClimate || view.compactHeater || standaloneClimate || view.standaloneBoiler,
      timerPreferenceKey,
      compactClimateControls: view.compactClimateControls,
      unreportedSwingMode: view.config.unreported_swing_mode,
      historyFor: current => this.timerHistoryEntity(view.config, current),
      historyInfo: (entity, source) => {
        if (source.isConnected && this.nodes.modal.open && !this.nodes.modal.hasAttribute('data-closing') &&
            entity && entity === this.timerHistoryEntity(view.config, this.model(view.config))) {
          this.moreInfo({ entity }, source);
        }
      },
      usageInfo: (entity, source) => { if (this.canShowTimerUsage(entity)) this.moreInfo({ entity }, source); },
      canShowUsage: entity => this.canShowTimerUsage(entity),
      canResetUsage: entity => this.canResetTimerUsage(entity),
      resetOptIn: timing?.allow_daily_usage_reset === true && !!timing.simple_timer_entity,
      buildClimateDetail: this.panel?.type === 'device' ? id => {
        const control = this.buildField(view, model.actions[id], id, model);
        if (!advancedClimate) return control;
        advancedClimate.append(control);
      } : undefined,
      request: (id, value, control) => this.requestAction(view.config, id, value, control) });
    for (const id of compactCommands || actionsInOrder) {
      if (view.climatePower && (id === 'turn_on' || id === 'turn_off')) continue;
      if (view.vacuumCleaningControls && !roomVacuumCleaningActions.has(id)) continue;
      if (view.compactMedia && !roomCompactMediaActions.has(id)) continue;
      const action = actions[id];
      if (!action || view.special.used.has(id) || (view.compactCover && id === 'set_position')) continue;
      if (hideIdleTimedOff && id === 'turn_off') continue;
      if (view.inlineLight && !inlineLightActions.has(id)) continue;
      if (compactLightPower && (id === 'turn_on' || id === 'turn_off')) continue;
      if (view.compactLight && inlineLightActions.has(id)) continue;
      if (action.color && this.panel?.type !== 'device') continue;
      if (action.color && view.compactColorLight) {
        view.colorPalette = createLightColorPalette({ make, button, label, t: key => this.t(key),
          request: (value, control) => this.requestAction(view.config, id, value, control) });
        complex.set(id, view.colorPalette.element);
        continue;
      }
      if (id === 'set_effect' && this.panel?.type === 'device') {
        view.effectGallery = createLightEffectGallery(view.config.effect_groups, action.options, { make, button, icon,
          t: key => this.t(key), request: (value, control) => this.requestAction(view.config, id, value, control),
          ...(view.config.effect_favorites && { personalFavorites: {
            entity: view.config.entity, view: this.ownerDocument.defaultView, user: () => this._hass?.user?.id,
            restore: view.effectGallerySession,
          } }),
        });
        if (view.effectGallery) {
          complex.set(id, view.effectGallery.content);
          continue;
        }
      }
      if (action.color || rangeActions.has(id) || action.options || typeof action.min === 'number' ||
          ['set_temperature_range','start_timed'].includes(id)) {
        const field = this.buildField(view, action, id, model);
        if (advancedClimate && id === 'set_preset_mode') advancedClimate.append(field);
        else complex.set(id, field);
        continue;
      }
      const name = this.actionLabel(id);
      const compactIcon = view.compactDevice && ({ turn_on:'mdi:power', turn_off:'mdi:power', mute:'mdi:volume-high',
        unmute:'mdi:volume-off' })[id];
      const control = button('control-button', view.compactDevice ? undefined : name,
        compactIcon || (curtain && curtainControlIcons[id]) || controlIcons[id]);
      label(control, name);
      control.dataset.action = id;
      control.onclick = () => this.requestAction(view.config, id, undefined, control,
        { compactCover: view.compactCover, compactDevice: view.compactDevice });
      basic.append(control);
    }
    if (mutePlaceholder) {
      const muted = model.attributes.is_volume_muted === true;
      const control = button('control-button', undefined, muted ? 'mdi:volume-off' : 'mdi:volume-high');
      label(control, this.t(muted ? 'unmute' : 'mute'));
      control.dataset.roomMutePlaceholder = '';
      control.disabled = true;
      basic.append(control);
    }
    if (view.effectGallery) organizeLightModes(complex, view.lightMode, mode => {
      view.lightMode = mode;
      if (mode !== 'set_light_color') view.colorPalette?.cancel();
    }, { make, button, t: key => this.t(key), model });
    const hasAdvanced = !!advancedClimate?.childElementCount;
    if (hasAdvanced) {
      advancedClimate.open = view.climateExtraControls?.open ?? false;
      advancedClimate.prepend(make('summary', '', this.t('climate_extra_controls')));
    }
    view.climateExtraControls = hasAdvanced ? advancedClimate : undefined;
    view.group.replaceChildren(...(basic.childElementCount ? [basic] : []), ...view.special.content, ...complex.values(),
      ...(hasAdvanced ? [advancedClimate] : []));
    if (focused?.action || focused?.lightMode || focused?.effectFavoriteControl) {
      const successor = [...view.group.querySelectorAll('[data-action], [data-light-mode], [data-effect-favorite-control]')].find(el =>
        !el.closest('[hidden]') && (focused.action && el.dataset.action === focused.action ||
          focused.lightMode && el.dataset.lightMode === focused.lightMode ||
          focused.effectFavoriteControl && !el.disabled && el.dataset.effectFavoriteControl === focused.effectFavoriteControl));
      (successor || view.more || view.tile).focus({ preventScroll: true });
    }
  }

  buildCompactLightAdjustments(view, model) {
    const { actions } = model;
    const brightness = this.buildField(view, actions.set_brightness, 'set_brightness', model);
    const temperature = this.buildField(view, actions.set_color_temp_kelvin, 'set_color_temp_kelvin', model);
    const controls = make('div', view.dualLightDetail ? 'dual-light-detail-controls' : 'compact-light-controls');
    controls.append(brightness, temperature);
    if (view.dualLightDetail) return controls;
    const mode = button('round-action', this.t('set_color_temp_kelvin'), 'mdi:thermometer', true);
    mode.dataset.lightMode = 'compact-temperature';
    const update = () => {
      const showTemperature = view.compactTemperature === true;
      brightness.hidden = showTemperature;
      temperature.hidden = !showTemperature;
      mode.setAttribute('aria-pressed', String(showTemperature));
    };
    mode.onclick = () => {
      view.compactTemperature = !view.compactTemperature;
      update();
    };
    update();
    controls.append(mode);
    return controls;
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
    const compactInline = view.inlineLight && view.compactLight;
    const compactBrightness = view.compactColorLight && id === 'set_brightness';
    row.classList.toggle('compact-brightness', compactBrightness);
    const caption = make('label', '', compactInline || compactBrightness ? undefined : title);
    const isRange = rangeActions.has(id);
    const compactRange = view.compactLight && inlineLightActions.has(id);
    const dualLightRange = compactRange && view.dualLightDetail;
    const compactLightReading = compactBrightness || (compactRange && !dualLightRange && view.compactLightReading);
    const reportedLightRange = dualLightRange || compactLightReading;
    const minimumBrightness = compactLightReading && id === 'set_brightness';
    const range = minimumBrightness ? { ...action, min: 1 } : action;
    const directRange = view.inlineLight || compactBrightness || (compactRange && !dualLightRange);
    const field = { action: range, id, reportedLightRange, compactLightReading };
    if (dualLightRange) field.valid = () => field.observed || field.dirty;
    if (action.options) {
      field.input = make('select');
      if (id === 'set_effect' || id === 'set_swing_horizontal_mode') {
        field.valid = Boolean;
        const placeholder = make('option', '', this.t('available_option'));
        placeholder.value = '';
        placeholder.disabled = true;
        field.input.append(placeholder);
      }
      for (const value of action.options) {
        const localized = id === 'set_effect' ? value : climateOptionLabel(id, value, action.options, key => this.t(key));
        const op = make('option', '', localized);
        op.value = value;
        field.input.append(op);
      }
    } else if (action.color) {
      field.input = make('input', 'light-color-choice');
      field.input.type = 'color';
      field.valid = parseLightColor;
    } else field.input = this.numberInput(range, isRange ? 'range' : 'number');
    field.input.dataset.action = id;
    if (directRange || dualLightRange || id === 'set_color_temp_kelvin') field.input.setAttribute('aria-label', title);
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
      field.output.dir = 'ltr';
      caption.append(field.output);
    }
    if (isRange) field.unit = id === 'set_color_temp_kelvin' ? ' K' : '%';
    const apply = directRange ? field.input
      : button('control-button', id === 'start_timed' ? this.actionLabel(id) : this.t('apply'));
    field.apply = apply;
    const touched = () => {
      field.dirty = true;
      if (field.output) setText(field.output, field.input.value + field.unit);
      if (reportedLightRange) field.input.setAttribute('aria-valuetext', field.input.value + field.unit);
      if (field.valid) apply.disabled = !field.valid(field.input.value) || !this.canRequest(view.config.entity, id);
    };
    field.input.addEventListener('input', touched);
    if (action.color) field.input.addEventListener('change', touched);
    field.second?.addEventListener('input', touched);
    apply.dataset.action = id;
    if (!directRange) label(apply, id === 'start_timed' ? this.actionLabel(id) : this.t('apply') + ' · ' + title);
    const commit = () => {
      if (dualLightRange && !field.valid()) return;
      const single = action.color || field.input.localName === 'select' ? field.input.value : field.input.valueAsNumber;
      const value = field.second ? { low: field.input.valueAsNumber, high: field.second.valueAsNumber } : single;
      if ((compactLightReading && !field.dirty) || (minimumBrightness && (!Number.isFinite(value) || value < 1))) return;
      this.requestAction(view.config, id, value, apply);
    };
    if (directRange) {
      field.input.addEventListener('change', commit);
      row.append(caption);
    } else {
      apply.onclick = commit;
      row.append(caption, apply);
    }
    view.fields.push(field);
    this.syncField(field, model);
    return row;
  }

  syncField(field, model, force = false) {
    const { id, input, second, action } = field;
    const active = this.shadowRoot.activeElement;
    if (!force && (field.dirty || !field.compactLightReading && (active === input || (second && active === second)))) return;
    const attrs = model.attributes;
    if (field.reportedLightRange) {
      const raw = id === 'set_brightness' ? attrs.brightness : attrs.color_temp_kelvin;
      const observed = typeof raw === 'number' && Number.isFinite(raw) &&
        (id === 'set_brightness' ? raw >= 0 && raw <= 255 : raw >= action.min && raw <= action.max);
      field.observed = observed;
      const reading = observed ? (id === 'set_brightness' ? brightnessPercent(raw) : raw) : null;
      const shown = observed ? reading + field.unit : '—';
      input.value = String(reading ?? action.min);
      setText(field.output, shown);
      input.setAttribute('aria-valuetext', observed ? shown : this.t('light_reading_unreported'));
      return;
    }
    if (second) {
      input.value = String(attrs.target_temp_low ?? action.min ?? 18);
      second.value = String(attrs.target_temp_high ?? action.max ?? 25);
    } else if (id === 'set_hvac_mode') input.value = model.state;
    else if (id === 'select_option') input.value = model.state;
    else if (id === 'start_timed') input.value = String(action.min ?? 15);
    else if (id === 'set_heating_level') input.value = String(number(model.level) ?? action.min);
    else if (id === 'set_brightness') input.value = String(brightnessPercent(attrs.brightness) ?? action.min ?? 0);
    else if (action.color) input.value = model.state === 'on' ? lightColorHex(attrs) || '#ffffff' : '#ffffff';
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

  requestAction(config, id, value, source, { confirmShortcut = false, compactCover = false, compactDevice = false, roomPowerTile = false } = {}) {
    if (!this.canRequest(config.entity, id)) return;
    const roomBoilerQuickPower = roomPowerTile && config.room_boiler_quick_power === true;
    const model = this.model(config, { roomBoilerQuickPower });
    const action = model.actions[id];
    if (this.staleScriptAction(id, action, value) || this.staleUsageReset(config, id, action, value) || !action ||
        (compactCover && !allowsCoverRailAction(model, id)) ||
        (compactDevice && !this.canUseRoomCompactCommand(config, model, id))) return;
    if (!action.requiresConfirmation && !confirmShortcut) {
      return action.requiresCode ? this.moreInfo(config, source) : this.send(config, id, value, false, roomBoilerQuickPower);
    }
    this.confirming = { config, id, value, source, compactCover, compactDevice, roomPowerTile, roomBoilerQuickPower, native: action.requiresCode };
    const n = this.nodes;
    const prompt = id === 'reset_daily_usage' ? this.t('timer_reset_confirm').replace('{name}', model.name)
      : this.t('confirm_action').replace('{name}', model.name).replace('{action}', this.actionLabel(id));
    setText(n.confirmText, (!['stop_script', 'reset_daily_usage'].includes(id) && action.confirmationText) || prompt);
    if (!n.confirm.open) n.confirm.showModal();
    n.abort.focus({ preventScroll: true });
  }

  acceptAction() {
    const request = this.confirming;
    if (!request || !this.nodes.confirm.open) return;
    this.nodes.confirm.close();
    if (request.compactCover && !allowsCoverRailAction(this.model(request.config), request.id)) return;
    if (request.roomPowerTile && this.roomPowerTileAction(request.config) !== request.id) return;
    if (request.compactDevice &&
        !this.canUseRoomCompactCommand(request.config, this.model(request.config), request.id)) return;
    if (request.native) return this.moreInfo(request.config, request.source);
    return this.send(request.config, request.id, request.value, true, request.roomBoilerQuickPower);
  }

  async send(config, id, value, confirmed = false, roomBoilerQuickPower = false) {
    if (!this.canRequest(config.entity, id)) return;
    const model = this.model(config, { roomBoilerQuickPower });
    if (this.staleScriptAction(id, model.actions[id], value) || this.staleUsageReset(config, id, model.actions[id], value) || !model.actions[id]) return;
    const token = { id, value };
    if (model.domain === 'cover' && movement.has(id)) {
      if (id === 'open') token.coverDirection = 'opening';
      if (id === 'close') token.coverDirection = 'closing';
      if (id === 'set_position') {
        const position = model.attributes.current_position;
        if (Number.isFinite(position) && Number.isFinite(value) && value !== position) {
          token.coverDirection = value > position ? 'opening' : 'closing';
        }
      }
    }
    const lightStatusRefresh = id === 'press_button' && Boolean(config.light_status_refresh_for);
    this.pending.set(config.entity, token);
    this.announce(this.t(lightStatusRefresh ? 'light_refresh_requesting' : 'sending').replace('{name}', model.name));
    this.update();
    let confirmedByHomeAssistant = false;
    try {
      const result = await this.controller.execute(config, id, value, { confirmed, roomBoilerQuickPower });
      if (this.pending.get(config.entity) !== token) return;
      const key = ['confirmed','sent','unconfirmed'].includes(result?.status) ? result.status : 'sent';
      let status = key === 'confirmed' ? ({preselect_heating_level: 'heating_preselect_saved',
        reset_daily_usage: 'timer_usage_reset'}[id] ?? key) : key;
      if (lightStatusRefresh) status = key === 'unconfirmed' ? 'light_refresh_unconfirmed' : 'light_refresh_requested';
      this.announce(this.t(status).replace('{name}', model.name));
      confirmedByHomeAssistant = result?.status === 'confirmed';
    } catch (error) {
      if (this.pending.get(config.entity) === token) {
        const changed = scriptOperations.has(id) && ['stale_script_state', 'action_unavailable'].includes(error?.code);
        this.announce(this.t(changed ? 'script_state_changed' : 'send_error'));
      }
    } finally {
      if (this.pending.get(config.entity) === token) {
        this.pending.delete(config.entity);
        for (const view of this.deviceViews) {
          const syncImmediately = view.inlineLight || (view.compactLight && inlineLightActions.has(id)) || id === 'set_swing_horizontal_mode';
          if (view.config.entity !== config.entity || (!confirmedByHomeAssistant && !syncImmediately)) continue;
          for (const field of view.fields) {
            if (field.id !== id) continue;
            field.dirty = false;
            if (syncImmediately) this.syncField(field, this.model(view.config), true);
          }
        }
        if (this.isConnected) this.update();
      }
    }
  }

  staleUsageReset(config, id, action, revision) {
    if (id !== 'reset_daily_usage' ||
        (action?.usageRevision === revision && this.canResetTimerUsage(config.timed?.simple_timer_entity))) return false;
    this.announce(this.t('timer_usage_changed'));
    return true;
  }

  staleScriptAction(id, action, revision) {
    if (!scriptOperations.has(id) || (action && revision === action.scriptRevision)) return false;
    this.announce(this.t('script_state_changed'));
    return true;
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
