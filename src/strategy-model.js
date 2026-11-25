import { normalizeRoomActivities } from './room-appliance.mjs';
import { HEATING_DOMAINS, isReadOnlyRole, supportsRoomShutdown } from './device-control.mjs';
import { normalizeOrefMap } from './oref-alert-map.js';
import { normalizeVacuumMap } from './vacuum-map.js';
import { normalizeMediaStage } from './now-playing.js';
import { normalizeMediaRemote } from './media-device-support.mjs';
import { wallpaperChoices } from './wallpapers.js';
import { normalizeSharedWallpapers } from './shared-wallpapers.js';
import { normalizeLightEffectGroups } from './light-effects.js';
import { normalizePopupAliases } from './popup-routes.js';
import { calendarAccent, normalizeCalendarAgenda, supportsDailyForecast } from './calendar-agenda.js';

export const CARD_TYPE = 'custom:bayit-dashboard';
export const STRATEGY_NAME = 'bayit-9';
export const MAX_ROOM_SHORTCUTS = 6;
export const CUSTOM_ROOM_PREFIX = 'bayit_room_';
export const BACKGROUNDS = wallpaperChoices;

export const PROFILE_DOMAINS = HEATING_DOMAINS;
export const DEFAULT_DOMAINS = [
  'light', 'switch', 'cover', 'climate', 'fan', 'lock', 'water_heater', 'vacuum',
  'humidifier', 'alarm_control_panel', 'camera', 'media_player',
  'binary_sensor', 'sensor', 'weather', 'person', 'calendar',
];

const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const CUSTOM_ROOM_ID = /^bayit_room_[a-z0-9][a-z0-9_-]{0,63}$/;
const LAYOUT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
export const LOCAL_ROUTE = /^\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\/?(?:#[a-z0-9_-]+)?$/i;
const SECTION_KINDS = new Set(['lights', 'covers', 'climate', 'heating', 'sensors',
  'devices', 'garage', 'weather', 'security', 'media', 'vacuum', 'laundry']);
export const TOOLBAR_KINDS = new Set(['automations', 'activity', 'security', 'presence', 'weather', 'energy',
  'settings', 'overview', 'sensors', 'media', 'vacuum', 'calendar', 'devices', 'link']);
export const TOOLBAR_SECTION_KINDS = new Set(['actions', 'locks', 'covers', 'status', 'devices',
  'people', 'forecast', 'sun', 'readings', 'electricity', 'water', 'media', 'vacuum', 'series']);
export const TOOLBAR_ROLES = new Set(['action', 'lock', 'cover', 'status', 'device', 'light_tile', 'forecast', 'sun', 'graph', 'person', 'now_playing']);
export const TOOLBAR_ROLE_DOMAINS = new Map([
  ['lock', 'lock'], ['cover', 'cover'], ['forecast', 'weather'], ['sun', 'sun'], ['person', 'person'],
  ['now_playing', 'media_player'], ['light_tile', 'light'],
]);
export function roomVacuumPresentation(value) {
  return value === 'tile' || value === 'cleaning-controls' ? value : undefined;
}

export const ROOM_VACUUM_SUMMARY_DOMAINS = Object.freeze({
  status_entity: 'sensor', battery_entity: 'sensor', progress_entity: 'sensor', cleaning_entity: 'binary_sensor',
});

export function normalizeRoomVacuumSummary(value, visible = () => true) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const sources = Object.fromEntries(Object.entries(ROOM_VACUUM_SUMMARY_DOMAINS).flatMap(([key, domain]) => {
    const id = value[key];
    return idForDomain(id, domain) && visible(id) ? [[key, id]] : [];
  }));
  return Object.keys(sources).length ? sources : undefined;
}

const vacuumActiveJob = new Set([
  'starting', 'cleaning', 'mopping', 'paused', 'returning', 'returning_home', 'going_to_target', 'docking',
  'spot_cleaning', 'zoned_cleaning', 'zoned_mopping', 'segment_cleaning', 'segment_mopping',
  'clean_mop_cleaning', 'clean_mop_mopping', 'segment_clean_mop_cleaning', 'segment_clean_mop_mopping',
  'zoned_clean_mop_cleaning', 'zoned_clean_mop_mopping',
]);

export function roomVacuumSummary(sources, stateFor, ownState, labels) {
  const reported = readoutText(stateFor(sources.status_entity)?.state, 80);
  const status = reported && !['unknown', 'unavailable'].includes(reported.toLowerCase()) ? reported : undefined;
  const percent = id => {
    const record = stateFor(id);
    const raw = record?.state;
    const unit = record?.attributes?.unit_of_measurement;
    if ((unit && unit !== '%') || typeof raw !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw.trim())) return;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0 && value <= 100) return Math.round(value);
  };
  const active = stateFor(sources.cleaning_entity)?.state === 'on' || vacuumActiveJob.has(status ?? ownState);
  return {
    status: status && (labels && Object.hasOwn(labels, status) ? labels[status] : status.replaceAll('_', ' ')),
    battery: percent(sources.battery_entity),
    progress: active ? percent(sources.progress_entity) : undefined,
  };
}

export const ROOM_PANEL_KINDS = new Map([['media_player', 'media'], ['vacuum', 'vacuum']]);
export const DEVICE_ICONS = {
  light:'mdi:lightbulb-outline', switch:'mdi:toggle-switch-outline', fan:'mdi:fan',
  cover:'mdi:blinds', climate:'mdi:thermostat', lock:'mdi:lock-outline',
  heater:'mdi:radiator', boiler:'mdi:water-boiler', water_heater:'mdi:water-boiler',
  sensor:'mdi:gauge', binary_sensor:'mdi:motion-sensor', calendar:'mdi:calendar-outline',
  alarm_control_panel:'mdi:shield-home-outline', weather:'mdi:weather-partly-cloudy',
  person:'mdi:account-outline', vacuum:'mdi:robot-vacuum', camera:'mdi:cctv', media_player:'mdi:speaker',
};
const ROOM_ICON = /^mdi:[a-z0-9-]+$/;
const SHORTCUT_DOMAINS = new Set(['light', 'switch', 'fan', 'cover', 'lock', 'climate', 'water_heater']);
const CONTROL_DOMAINS = new Set(['light', 'switch', 'cover', 'climate', 'fan', 'lock', 'water_heater']);
const SECURITY_CLASSES = new Set(['door', 'window', 'garage_door', 'opening']);
const PROFILE_KINDS = new Set(['heater', 'boiler', 'climate']);
const DEFAULT_RANK = new Map(DEFAULT_DOMAINS.map((domain, index) => [domain, index]));
const ARMING_DOMAIN = 'script';

export function hasDynamicPresenceIcon(entry) {
  if (typeof entry.presence_dynamic_icon === 'boolean') return entry.presence_dynamic_icon;
  return typeof entry.icon !== 'string' || !ROOM_ICON.test(entry.icon.trim());
}

const labels = {
  en: { title: 'Bayit 9', home: 'Home', unassigned: 'Unassigned' },
  he: { title: 'בית 9', home: 'בית', unassigned: 'ללא חדר' },
};

export function languageFor(value, hass = {}) {
  if (value === 'en' || value === 'he') return value;
  const preference = hass.locale?.language ?? hass.language;
  return typeof preference === 'string' && /^he(?:[-_]|$)/i.test(preference) ? 'he' : 'en';
}

function idList(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && id.trim()))] : [];
}

export function roomTemperatureUnit(value) {
  const unit = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return ['°C', '°F', 'K'].includes(unit) ? unit : undefined;
}

export function supportsRoomTemperatureSource(entity, attributes) {
  const domain = domainOf(entity);
  if (domain === 'climate') return true;
  const unit = attributes?.unit_of_measurement;
  return domain === 'sensor' && (Boolean(roomTemperatureUnit(unit)) ||
    (!unit && attributes?.device_class === 'temperature'));
}

function domainOf(entity) {
  return entity.split('.')[0];
}

function idForDomain(value, domain) {
  return typeof value === 'string' && ENTITY_ID.test(value) && domainOf(value) === domain
    ? value : undefined;
}

function numberOr(value, fallback) {
  return Number.isInteger(value) && value > 0 && value <= 360 ? value : fallback;
}

export function normalizeUnreportedSwingMode(value) {
  return typeof value === 'string' && value.length <= 80 && value && value.trim() === value &&
    !/[\u0000-\u001f\u007f]/u.test(value) ? value : undefined;
}

export function normalizeProfile(value) {
  if (!value || typeof value.entity !== 'string' || !ENTITY_ID.test(value.entity)
      || !PROFILE_KINDS.has(value.kind)) return null;
  const domain = domainOf(value.entity);
  if (!PROFILE_DOMAINS.includes(domain) || (value.kind === 'climate' && domain !== 'climate')) return null;
  const profile = { entity: value.entity, kind: value.kind };
  const unreportedSwing = value.kind === 'climate' && normalizeUnreportedSwingMode(value.unreported_swing_mode);
  if (unreportedSwing) profile.unreported_swing_mode = unreportedSwing;
  if (typeof value.name === 'string' && value.name.trim()) profile.name = value.name.trim().slice(0, 80);
  const level = idForDomain(value.level_entity, 'number');
  if (level) profile.level_entity = level;
  if (value.kind === 'boiler') {
    const save = idForDomain(value.schedule?.save_script, 'script');
    const remove = idForDomain(value.schedule?.delete_script, 'script');
    if (save || remove) profile.schedule = { ...(save && {save_script:save}), ...(remove && {delete_script:remove}) };
  }
  const fanHeater = value.kind === 'heater' && domain === 'fan';
  if (!level && fanHeater && Number.isInteger(value.level_steps) && value.level_steps >= 2 && value.level_steps <= 12) {
    profile.level_steps = value.level_steps;
    const levelRead = idForDomain(value.level_read_entity, 'input_number');
    if (levelRead) profile.level_read_entity = levelRead;
  }
  const timed = value.timed;
  if (!timed || typeof timed !== 'object') return profile;

  const startScript = idForDomain(timed.start_script, ARMING_DOMAIN);
  const stopScript = idForDomain(timed.stop_script, ARMING_DOMAIN);
  const simpleTimer = startScript ? undefined : idForDomain(timed.simple_timer_entity, 'sensor');
  const targetDomain = value.kind === 'climate' ? 'input_boolean' : fanHeater ? 'switch' : undefined;
  const simpleTimerTarget = simpleTimer && targetDomain ? idForDomain(timed.simple_timer_target, targetDomain) : undefined;
  const levelSelect = simpleTimer && profile.level_read_entity ? idForDomain(value.level_select_script, 'script') : undefined;
  if (levelSelect) profile.level_select_script = levelSelect;
  const preselect = simpleTimerTarget && profile.level_steps ? idForDomain(value.level_preselect_entity, 'input_number') : undefined;
  if (preselect) profile.level_preselect_entity = preselect;
  const timer = simpleTimer ? undefined : idForDomain(timed.timer_entity, 'timer');
  const dailyUsage = idForDomain(timed.daily_usage_entity, 'sensor');
  if (!startScript && !simpleTimer && !timer && !stopScript) return profile;
  if (profile.kind === 'boiler' && value.boiler_timer_with_details === true && (simpleTimer || timer)) {
    profile.boiler_timer_with_details = true;
  }
  const min = numberOr(timed.min_minutes, 15);
  const max = Math.max(min, numberOr(timed.max_minutes, 60));
  const step = Math.min(max - min || 1, numberOr(timed.step_minutes, 15));
  const presets = Array.isArray(timed.presets) ? [...new Set(timed.presets.filter(minutes =>
    Number.isInteger(minutes) && minutes >= min && minutes <= max && (minutes - min) % step === 0,
  ))].slice(0, 8) : [];
  profile.timed = {
    ...(startScript && { start_script: startScript }),
    ...(stopScript && { stop_script: stopScript }),
    ...(timer && { timer_entity: timer }),
    ...(simpleTimer && { simple_timer_entity: simpleTimer }),
    ...(simpleTimerTarget && { simple_timer_target: simpleTimerTarget }),
    ...(dailyUsage && { daily_usage_entity: dailyUsage }),
    ...(simpleTimer && (!dailyUsage || dailyUsage === simpleTimer) && timed.allow_daily_usage_reset === true &&
      { allow_daily_usage_reset: true }),
    ...(Array.isArray(timed.presets) && { presets }),
    duration_field: typeof timed.duration_field === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(timed.duration_field)
      ? timed.duration_field : 'duration',
    min_minutes: min,
    max_minutes: max,
    step_minutes: step,
  };
  return profile;
}

function profilesOf(items) {
  const profiles = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const profile = normalizeProfile(item);
    if (profile && !profiles.has(profile.entity)) profiles.set(profile.entity, profile);
  }
  return profiles;
}

function layoutId(value, fallback, seen) {
  if (typeof value === 'string' && LAYOUT_ID.test(value) && !seen.has(value)) {
    seen.add(value);
    return value;
  }
  let id = fallback;
  for (let suffix = 2; seen.has(id); suffix++) id = fallback + '-' + suffix;
  seen.add(id);
  return id;
}

export function roomSections(value) {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set();
  return value.flatMap((section, index) => {
    if (!SECTION_KINDS.has(section?.kind) || !Array.isArray(section.entities)) return [];
    const id = layoutId(section.id, 'section-' + (index + 1), seen);
    const title = typeof section.title === 'string' ? section.title.trim().slice(0, 80) : undefined;
    return [{ id, kind: section.kind, ...(title !== undefined && { title }), entities: idList(section.entities) }];
  });
}

export function roomLightTilePlacement(entity, sections = []) {
  const placements = sections.filter(section => section.entities.includes(entity));
  return !placements.length || placements.some(section => section.kind === 'lights');
}

export function normalizeRoomIcon(icon) {
  const value = typeof icon === 'string' ? icon.trim() : '';
  return ROOM_ICON.test(value) ? value : undefined;
}

export function normalizeRoomControlName(value) {
  if (typeof value !== 'string') return undefined;
  if (value === '') return '';
  return value.trim().slice(0, 80) || undefined;
}

export function classicRoomTitle(name, breakAfter) {
  if (!Number.isInteger(breakAfter) || breakAfter < 1) return undefined;
  const words = name.trim().split(/\s+/u);
  if (breakAfter >= words.length) return undefined;
  return words.slice(0, breakAfter).join(' ') + '\n' + words.slice(breakAfter).join(' ');
}

export function normalizeClimatePresetShortcut(value) {
  const validPreset = preset => typeof preset === 'string' && preset.trim() && preset.length <= 120;
  if (!value || typeof value !== 'object' || Array.isArray(value) || !validPreset(value.preset)) return undefined;
  const label = typeof value.label === 'string' ? value.label.trim().slice(0, 16) : '';
  const icon = typeof value.icon === 'string' ? value.icon.trim() : '';
  return { preset: value.preset, ...(label && { label }), ...(ROOM_ICON.test(icon) && { icon }),
    ...(validPreset(value.highlight_when) && { highlight_when: value.highlight_when }) };
}

export function usesAutomaticRoomDevices(override, sections, custom) {
  return !custom && (override.device_selection === 'auto' ||
    (!Array.isArray(override.entities) && !sections?.length));
}

export function roomShortcutDevices(room) {
  if (Array.isArray(room.shortcuts)) {
    const byId = new Map(room.entities.map(device => [device.entity, device]));
    return room.shortcuts.map(entity => byId.get(entity)).filter(Boolean);
  }
  return room.entities.filter(device => SHORTCUT_DOMAINS.has(domainOf(device.entity))).slice(0, MAX_ROOM_SHORTCUTS);
}

export function supportsShortcutWithoutDetails(device) {
  return domainOf(device.entity) === 'switch' && !device.kind && device.role !== 'status';
}

export function normalizeShortcutDetailEntities(room, value, excluded = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const members = new Set(room.entities.map(device => device.entity));
  const suppressed = new Set(excluded);
  const targets = [];
  for (const { entity } of roomShortcutDevices(room)) {
    if (suppressed.has(entity) || !Object.hasOwn(value, entity)) continue;
    const target = value[entity];
    if (target !== entity && members.has(target)) targets.push([entity, target]);
  }
  return Object.fromEntries(targets);
}

export function shortcutDetailPanels(toolbar) {
  if (!Array.isArray(toolbar)) return [];
  const ids = new Map();
  for (const { id } of toolbar) ids.set(id, (ids.get(id) ?? 0) + 1);
  return toolbar.filter(({ id, kind, placement }) => typeof id === 'string' && LAYOUT_ID.test(id) &&
    ids.get(id) === 1 && kind !== 'settings' && kind !== 'link' && placement !== 'settings');
}

export function supportsRoomApplianceTile(device) {
  return domainOf(device?.entity ?? '') === 'switch' && !device.timed && (!device.kind || device.kind === 'switch');
}

export function supportsNativeShortcutDetails(device) {
  return !isReadOnlyRole(device.role);
}

export function normalizeShortcutDetailRoutes(room, raw, panels, excluded = []) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const allowedPanels = new Set(panels.map(panel => 'panel:' + panel.id));
  const ignored = new Set(excluded);
  const routes = [];
  for (const device of roomShortcutDevices(room)) {
    if (!Object.hasOwn(raw, device.entity) || ignored.has(device.entity)) continue;
    const route = raw[device.entity];
    if (route === 'native' ? supportsNativeShortcutDetails(device) : allowedPanels.has(route)) {
      routes.push([device.entity, route]);
    }
  }
  return Object.fromEntries(routes);
}

function dashboardAreas(config, hass) {
  const areas = new Map(Object.entries(hass.areas ?? {}).map(([id, area]) => [
    area.area_id ?? id,
    { name: area.name ?? id, icon: area.icon || 'mdi:home-outline' },
  ]));
  for (const [id, override] of Object.entries(config.room_overrides ?? {})) {
    if (!override || typeof override !== 'object' || Array.isArray(override)) continue;
    const area = areas.get(id);
    const name = typeof override.name === 'string' ? override.name.trim().slice(0, 80) : '';
    if (!area && (!CUSTOM_ROOM_ID.test(id) || !name)) continue;
    const icon = normalizeRoomIcon(override.icon);
    const entityIcons = override.entity_icons;
    const entityNames = override.entity_names;
    const presetShortcuts = override.climate_preset_shortcuts;
    const sections = roomSections(override.sections);
    const entityIds = usesAutomaticRoomDevices(override, sections, !area) ? undefined
      : Array.isArray(override.entities) ? idList(override.entities) : idList(sections?.flatMap(section => section.entities));
    areas.set(id, {
      name: name || area?.name,
      classicTitleBreak: override.classic_title_break,
      icon: icon ?? area?.icon ?? 'mdi:home-outline',
      entityIds,
      keepInAutomaticRoom: new Set(idList(override.keep_in_automatic_room_entities)),
      sections,
      readOnly: new Set(idList(override.read_only_entities)),
      panelHidden: idList(override.panel_hidden_entities),
      shortcutNoDetails: new Set(idList(override.shortcut_no_details)),
      shortcutDetailEntities: override.shortcut_detail_entities,
      shortcutDetailRoutes: override.shortcut_detail_routes,
      inlineLights: new Set(idList(override.inline_light_entities)),
      dualLightDetails: new Set(idList(override.dual_light_detail_entities)),
      compactLightReadings: new Set(idList(override.compact_light_reading_entities)),
      nativeCoverHeaders: new Set(idList(override.native_cover_header_entities)),
      nativeLightHolds: new Set(idList(override.native_light_hold_entities)),
      lightingCount: idList(override.lighting_count_entities),
      temperatureEntity: typeof override.room_temperature_entity === 'string' ? override.room_temperature_entity : undefined,
      temperatureFallback: typeof override.room_temperature_fallback_entity === 'string' ? override.room_temperature_fallback_entity : undefined,
      shutdown: idList(override.turn_off_entities).filter(supportsRoomShutdown),
      activities: override.activities,
      climatePower: new Set(idList(override.climate_power_entities)),
      compactMedia: new Set(idList(override.media_compact_entities)),
      applianceTiles: new Set(idList(override.appliance_tile_entities)),
      vacuumPanelHolds: new Set(idList(override.vacuum_panel_hold_entities)),
      vacuumPanelPresentations: override.vacuum_panel_presentation,
      vacuumPanelSummaries: override.vacuum_panel_summary,
      panelLinks: Object.fromEntries([...ROOM_PANEL_KINDS.values()].flatMap(kind => {
        const links = override[kind + '_panel_links'];
        return links && typeof links === 'object' && !Array.isArray(links) ? [[kind, links]] : [];
      })),
      entityIcons: entityIcons && typeof entityIcons === 'object' && !Array.isArray(entityIcons) ? entityIcons : null,
      entityNames: entityNames && typeof entityNames === 'object' && !Array.isArray(entityNames) ? entityNames : null,
      presetShortcuts: presetShortcuts && typeof presetShortcuts === 'object' && !Array.isArray(presetShortcuts) ? presetShortcuts : null,
      custom: !area,
    });
  }
  return areas;
}

export function dashboardRoomOptions(config = {}, hass = {}) {
  return [...dashboardAreas(config, hass)].map(([id, room]) => ({
    id, name: room.name, icon: room.icon, custom: room.custom === true,
  }));
}

function compareText(a, b, language) {
  return a.localeCompare(b, language, { numeric: true, sensitivity: 'base' });
}

function pickUnassignedId(areas) {
  let id = 'bayit9_unassigned';
  for (let suffix = 1; areas.has(id); suffix++) id = 'bayit9_unassigned_' + suffix;
  return id;
}

function presentEntity(entity, state, registry, profile) {
  const name = profile?.name ?? state.attributes?.friendly_name ?? registry?.name ?? registry?.en;
  const icon = registry?.icon ?? registry?.ic ?? state.attributes?.icon;
  return {
    entity,
    ...(typeof name === 'string' && name && { name }),
    ...(typeof icon === 'string' && icon && { icon }),
    ...(profile && { kind: profile.kind }),
    ...(profile?.unreported_swing_mode && { unreported_swing_mode: profile.unreported_swing_mode }),
    ...(profile?.level_entity && { level_entity: profile.level_entity }),
    ...(profile?.level_steps && { level_steps: profile.level_steps }),
    ...(profile?.level_read_entity && { level_read_entity: profile.level_read_entity }),
    ...(profile?.level_select_script && { level_select_script: profile.level_select_script }),
    ...(profile?.level_preselect_entity && { level_preselect_entity: profile.level_preselect_entity }),
    ...(profile?.timed && { timed: profile.timed }),
    ...(profile?.schedule && { schedule: profile.schedule }),
    ...(profile?.boiler_timer_with_details && { boiler_timer_with_details: true }),
  };
}

export function isVisibleEntity(entity, states, registry, hidden) {
  if (!ENTITY_ID.test(entity) || hidden.has(entity) || !Object.hasOwn(states, entity) || states[entity] == null) {
    return false;
  }
  const info = registry?.[entity];
  return info?.hidden !== true && !info?.hidden_by && !info?.disabled_by;
}

const overviewIdFragment = /^[a-z0-9_]{1,64}$/;
const validOverviewFragments = value => Array.isArray(value) && value.length <= 16 &&
  value.every(part => typeof part === 'string' && overviewIdFragment.test(part));

export function normalizeOverviewDiscovery(value) {
  if (!value || !['light', 'cover', 'climate'].includes(value.domain) || Array.isArray(value)) return undefined;
  const { domain, exclude_entities = [], exclude_id_contains = [] } = value;
  if (!Array.isArray(exclude_entities) || exclude_entities.some(id => !idForDomain(id, domain)) ||
      !validOverviewFragments(exclude_id_contains)) return undefined;
  const source = { domain, exclude_entities: [...new Set(exclude_entities)], exclude_id_contains: [...new Set(exclude_id_contains)] };
  if (domain !== 'climate') return source;
  const { include_entities = [], include_id_prefixes = [] } = value;
  if (!Array.isArray(include_entities) || include_entities.some(id => !idForDomain(id, domain)) ||
      !validOverviewFragments(include_id_prefixes)) return undefined;
  return { ...source, include_entities: [...new Set(include_entities)], include_id_prefixes: [...new Set(include_id_prefixes)] };
}

export function supportsOverviewLightsOff(kind, section) {
  if (kind !== 'overview' || section.kind !== 'status') return false;
  const source = normalizeOverviewDiscovery(section.discover);
  if (source) return source.domain === 'light';
  return section.filter === 'active' && Array.isArray(section.entities) &&
    section.entities.some(item => item?.role === 'action' && idForDomain(item.entity, 'light'));
}

export function overviewSectionOptions(kind, section) {
  if (kind !== 'overview') return {};
  const discover = normalizeOverviewDiscovery(section.discover);
  const lightsOff = section.turn_off_active_lights === true && supportsOverviewLightsOff(kind, section)
    ? { turn_off_active_lights: true } : {};
  if (discover && (section.kind === 'status' || section.kind === 'covers' && discover.domain === 'cover')) {
    return { ...lightsOff, discover, filter: 'active', ...(discover.domain === 'cover' && section.include_closing === true &&
      { include_closing: true }) };
  }
  return section.filter === 'active' && ['status', 'covers'].includes(section.kind) && section.include_closing === true
    ? { ...lightsOff, include_closing: true } : lightsOff;
}

export function isActiveOverviewEntity(entity, source, hass, hidden, includeClosing = false) {
  const states = hass?.states ?? {};
  const state = states[entity]?.state;
  const prefix = source.domain + '.';
  if (hass?.entities == null || !entity.startsWith(prefix) || !isVisibleEntity(entity, states, hass.entities, hidden) ||
      source.exclude_entities.includes(entity)) return false;
  const slug = entity.slice(prefix.length);
  if (source.exclude_id_contains.some(fragment => slug.includes(fragment))) return false;
  if (source.domain === 'light') return state === 'on';
  if (source.domain === 'climate') {
    const { include_entities: ids, include_id_prefixes: prefixes } = source;
    const matches = ids?.includes(entity) || prefixes?.some(part => slug.startsWith(part)) ||
      (!ids?.length && !prefixes?.length);
    return matches && Boolean(state) && !['off', 'unknown', 'unavailable'].includes(state);
  }
  return Boolean(state) && !['closed', 'unknown', 'unavailable'].includes(state) && (state !== 'closing' || includeClosing);
}

export function discoverOverviewEntities(source, hass, hidden, locale, includeClosing) {
  const states = hass?.states ?? {};
  const role = source.domain === 'light' ? 'action' : 'status';
  return Object.keys(states).filter(entity => isActiveOverviewEntity(entity, source, hass, hidden, includeClosing))
    .map(entity => ({ ...presentEntity(entity, states[entity], hass?.entities?.[entity]), role }))
    .sort((a, b) => compareText(a.name ?? a.entity, b.name ?? b.entity, locale) || compareText(a.entity, b.entity, locale));
}

export function selectableRoomEntities(config = {}, hass = {}) {
  const states = hass.states ?? {};
  const registry = hass.entities;
  const hidden = new Set(idList(config.hidden_entities));
  return Object.keys(states)
    .filter(entity => isVisibleEntity(entity, states, registry, hidden))
    .map(entity => presentEntity(entity, states[entity], registry?.[entity]));
}

function entityArea(info, hass) {
  const deviceId = info?.device_id ?? info?.di;
  const device = deviceId && hass.devices?.[deviceId];
  return info?.area_id ?? info?.ai ?? device?.area_id;
}

export function selectedRoomIds(config) {
  if (config.room_selection === 'auto') return null;
  const ids = idList(config.area_ids);
  return ids.length || config.room_selection === 'manual' ? ids : null;
}

function groupRoomDevices(config, hass, areas) {
  const unassigned = pickUnassignedId(areas);
  const selection = selectedRoomIds(config);
  const explicitOrder = new Map((selection ?? []).map((id, index) => [id, index]));
  const isSelected = id => selection === null || explicitOrder.has(id);
  const hidden = new Set(idList(config.hidden_entities));
  const extra = new Set(idList(config.included_entities));
  const profiles = profilesOf(config.profiles);
  const adapterEntities = new Set([...profiles.values()].flatMap(profile => {
    const timed = profile.timed;
    return [profile.level_entity, profile.level_read_entity, profile.level_select_script, profile.level_preselect_entity,
      timed?.start_script, timed?.stop_script,
      timed?.timer_entity, timed?.simple_timer_entity, timed?.simple_timer_target, timed?.daily_usage_entity].filter(Boolean);
  }));
  const states = hass.states ?? {};
  const registry = hass.entities ?? null;
  const grouped = new Map();
  const discoverableDomains = config.discovery_mode === 'controls' ? CONTROL_DOMAINS : DEFAULT_RANK;
  const visible = entity => isVisibleEntity(entity, states, registry, hidden);

  const movedFromAutomaticRooms = new Set();
  for (const [id, room] of areas) {
    if (!isSelected(id) || (!room.entityIds && config.room_selection !== 'manual')) continue;
    const ids = (room.entityIds ?? []).filter(visible);
    grouped.set(id, ids);
    for (const entity of ids) {
      if (!room.keepInAutomaticRoom?.has(entity)) movedFromAutomaticRooms.add(entity);
    }
  }

  const availableIds = new Set(registry ? Object.keys(registry) : Object.keys(states));
  for (const explicit of [...extra, ...profiles.keys()]) availableIds.add(explicit);
  for (const entity of availableIds) {
    if (movedFromAutomaticRooms.has(entity) || !visible(entity)) continue;
    const info = registry?.[entity];
    const isExplicit = extra.has(entity) || profiles.has(entity);
    const isDiagnostic = info?.entity_category != null || info?.ec != null;
    if (!isExplicit && (!discoverableDomains.has(domainOf(entity)) || isDiagnostic || adapterEntities.has(entity))) continue;

    const assigned = entityArea(info, hass);
    const area = areas.get(assigned);
    const areaId = area && !area.custom ? assigned : unassigned;
    if (areaId === unassigned ? config.show_unassigned === false : !isSelected(areaId) || area.entityIds) continue;
    if (!grouped.has(areaId)) grouped.set(areaId, []);
    grouped.get(areaId).push(entity);
  }

  return { grouped, unassigned, explicitOrder, visible, profiles };
}

export function dashboardRoomMemberships(config, hass, locale) {
  const areas = dashboardAreas(config, hass);
  const { grouped } = groupRoomDevices(config, hass, areas);
  return Array.from(grouped, ([id, entities]) => ({ id, entities, name: areas.get(id)?.name ?? labels[locale].unassigned }));
}

export function discoverRooms(config, hass, locale) {
  const areas = dashboardAreas(config, hass);
  const panelKinds = new Map([...areas.values()].some(area => Object.keys(area.panelLinks ?? {}).length)
    ? roomPanelOptions(config, hass).map(panel => [panel.id, panel.kind]) : []);
  const detailPanels = [...areas.values()].some(area => area.shortcutDetailRoutes)
    ? shortcutPanelOptions(config) : [];
  const { grouped, unassigned, explicitOrder, visible, profiles } = groupRoomDevices(config, hass, areas);
  const present = entity => presentEntity(entity, hass.states[entity], hass.entities?.[entity], profiles.get(entity));
  const roomFor = id => areas.get(id) ?? { name: labels[locale].unassigned, icon: 'mdi:map-marker-outline' };
  const roomIds = [...grouped.keys()].sort((a, b) => {
    if (a === unassigned || b === unassigned) return a === unassigned ? 1 : -1;
    const bySelection = (explicitOrder.get(a) ?? Infinity) - (explicitOrder.get(b) ?? Infinity);
    return bySelection || compareText(roomFor(a).name, roomFor(b).name, locale);
  });

  return roomIds.map(id => {
    const area = roomFor(id);
    const entities = grouped.get(id).map(present);
    if (!area.entityIds) {
      entities.sort((a, b) => {
        const rank = (DEFAULT_RANK.get(domainOf(a.entity)) ?? 100) - (DEFAULT_RANK.get(domainOf(b.entity)) ?? 100);
        return rank || compareText(a.name ?? a.entity, b.name ?? b.entity, locale);
      });
    }
    if (area.entityIcons) {
      for (const entity of entities) {
        if (!Object.hasOwn(area.entityIcons, entity.entity)) continue;
        const icon = normalizeRoomIcon(area.entityIcons[entity.entity]);
        if (icon) entity.icon = icon;
      }
    }
    const room = { id, name: area.name, icon: area.icon, entities };
    if (classicRoomTitle(area.name, area.classicTitleBreak)) room.classic_title_break = area.classicTitleBreak;
    if (area.panelHidden?.length) {
      const members = new Set(entities.map(device => device.entity));
      const hidden = area.panelHidden.filter(entity => members.has(entity));
      if (hidden.length) room.panel_hidden_entities = hidden;
    }
    const temperatureEntity = area.temperatureEntity;
    const temperatureRecord = hass.states?.[temperatureEntity];
    if (temperatureEntity && entities.some(item => item.entity === temperatureEntity) &&
        (supportsRoomTemperatureSource(temperatureEntity, temperatureRecord?.attributes) ||
          domainOf(temperatureEntity) === 'sensor' && ['unknown', 'unavailable'].includes(temperatureRecord?.state))) {
      room.room_temperature_entity = temperatureEntity;
      const fallback = area.temperatureFallback;
      if (temperatureEntity.startsWith('sensor.') && fallback?.startsWith('climate.') &&
          entities.some(item => item.entity === fallback)) room.room_temperature_fallback_entity = fallback;
    }
    if (area.lightingCount?.length) {
      const lights = new Set(entities.filter(item => domainOf(item.entity) === 'light').map(item => item.entity));
      const scope = area.lightingCount.filter(entity => lights.has(entity));
      if (scope.length) room.lighting_count_entities = scope;
    }
    if (area.shutdown?.length) {
      const members = new Set(entities.map(device => device.entity));
      const targets = area.shutdown.filter(entity => members.has(entity) && !area.readOnly?.has(entity));
      if (targets.length) room.turn_off_entities = targets;
    }
    const activities = normalizeRoomActivities(area.activities, visible).filter(activity => activity.kind !== 'boiler' ||
      entities.some(device => device.entity === activity.boiler_entity && device.kind === 'boiler'));
    if (activities.length) room.activities = activities;
    for (const device of entities) {
      if (area.entityNames && Object.hasOwn(area.entityNames, device.entity)) {
        const name = normalizeRoomControlName(area.entityNames[device.entity]);
        if (name !== undefined) device.room_name = name;
      }
      if (area.readOnly?.has(device.entity)) device.role = 'status';
      if (domainOf(device.entity) === 'climate' && device.role !== 'status' && !['heater', 'boiler'].includes(device.kind) &&
          !room.panel_hidden_entities?.includes(device.entity) && area.presetShortcuts && Object.hasOwn(area.presetShortcuts, device.entity)) {
        const shortcut = normalizeClimatePresetShortcut(area.presetShortcuts[device.entity]);
        if (shortcut) device.room_climate_preset = shortcut;
      }
      if (domainOf(device.entity) === 'climate' && device.role !== 'status' && !['heater', 'boiler'].includes(device.kind) &&
          area.climatePower?.has(device.entity) && !room.panel_hidden_entities?.includes(device.entity)) {
        device.room_climate_power = true;
      }
      if (domainOf(device.entity) === 'media_player' && device.role !== 'status' && area.compactMedia?.has(device.entity) &&
          !room.panel_hidden_entities?.includes(device.entity)) device.room_media_compact = true;
      if (area.applianceTiles?.has(device.entity) && supportsRoomApplianceTile(device) &&
          !room.panel_hidden_entities?.includes(device.entity)) device.room_appliance_tile = true;
      const panelKind = ROOM_PANEL_KINDS.get(domainOf(device.entity));
      const links = area.panelLinks?.[panelKind];
      if (links && Object.hasOwn(links, device.entity)) {
        const target = links[device.entity];
        if (panelKinds.get(target) === panelKind) {
          device[panelKind + '_panel_id'] = target;
          if (panelKind === 'vacuum') {
            if (area.vacuumPanelHolds?.has(device.entity)) device.room_vacuum_panel_on_hold = true;
            const display = roomVacuumPresentation(area.vacuumPanelPresentations?.[device.entity]);
            if (display) device.room_vacuum_presentation = display;
            const summary = normalizeRoomVacuumSummary(area.vacuumPanelSummaries?.[device.entity], visible);
            if (summary) device.room_vacuum_summary = summary;
          }
        }
      }
      if (domainOf(device.entity) === 'cover' && area.nativeCoverHeaders?.has(device.entity) &&
          supportsNativeShortcutDetails(device) && !room.panel_hidden_entities?.includes(device.entity)) {
        device.room_cover_native_details = true;
      }
      if (device.role === 'status' || domainOf(device.entity) !== 'light') continue;
      if (!device.kind && area.nativeLightHolds?.has(device.entity) && supportsNativeShortcutDetails(device) &&
          !room.panel_hidden_entities?.includes(device.entity) && roomLightTilePlacement(device.entity, area.sections)) {
        device.room_light_native_hold = true;
      }
      if (area.inlineLights?.has(device.entity)) device.room_light_controls = true;
      if (area.dualLightDetails?.has(device.entity)) device.room_dual_light_detail = true;
      if (area.compactLightReadings?.has(device.entity)) device.room_compact_light_reading = true;
      if (!Object.hasOwn(config.light_effect_groups ?? {}, device.entity)) continue;
      const groups = normalizeLightEffectGroups(config.light_effect_groups[device.entity]);
      if (groups.length) device.effect_groups = groups;
    }
    if (area.sections !== undefined) {
      const byId = new Map(entities.map(entity => [entity.entity, entity]));
      room.sections = area.sections.map(section => ({
        ...section, entities: section.entities.map(entity => byId.get(entity)).filter(Boolean),
      }));
    }
    const shortcuts = Object.hasOwn(config.room_shortcuts ?? {}, id) ? config.room_shortcuts[id] : null;
    if (Array.isArray(shortcuts)) {
      const visible = new Set(entities.map(device => device.entity));
      room.shortcuts = idList(shortcuts).filter(entity => visible.has(entity)).slice(0, MAX_ROOM_SHORTCUTS);
    }
    if (area.shortcutNoDetails?.size) {
      const excluded = roomShortcutDevices(room).filter(device =>
        supportsShortcutWithoutDetails(device) && area.shortcutNoDetails.has(device.entity));
      if (excluded.length) room.shortcut_no_details = excluded.map(device => device.entity);
    }
    const detailEntities = normalizeShortcutDetailEntities(room, area.shortcutDetailEntities, room.shortcut_no_details);
    if (Object.keys(detailEntities).length) room.shortcut_detail_entities = detailEntities;
    const routes = normalizeShortcutDetailRoutes(room, area.shortcutDetailRoutes, detailPanels, room.shortcut_no_details);
    if (Object.keys(routes).length) room.shortcut_detail_routes = routes;
    return room;
  });
}

function dashboardContext(config, hass, locale) {
  const states = hass.states ?? {};
  const registry = hass.entities;
  const hidden = new Set(idList(config.hidden_entities));
  const selectedEnergy = new Set(idList(config.overview_entities));
  const selection = selectedRoomIds(config);
  const selectedAreas = selection === null ? null : new Set(selection);
  const nativeAreas = new Set(Object.entries(hass.areas ?? {}).map(([id, area]) => area.area_id ?? id));
  const areaInScope = entity => {
    const id = entityArea(registry?.[entity], hass);
    return nativeAreas.has(id) ? selectedAreas === null || selectedAreas.has(id) : config.show_unassigned !== false;
  };
  const context = {};
  for (const [entity, state] of Object.entries(states)) {
    const domain = domainOf(entity);
    const deviceClass = state?.attributes?.device_class;
    let category;
    if (domain === 'lock' || domain === 'alarm_control_panel' ||
        (domain === 'binary_sensor' && SECURITY_CLASSES.has(deviceClass))) category = 'security';
    else if (domain === 'person') category = 'presence';
    else if (domain === 'weather') category = 'weather';
    else if (domain === 'automation' && areaInScope(entity)) category = 'automations';
    else if (['media_player', 'vacuum', 'calendar'].includes(domain) && areaInScope(entity)) {
      category = domain === 'media_player' ? 'media' : domain;
    }
    else if (domain === 'sensor' && selectedEnergy.has(entity) && ['energy', 'power'].includes(deviceClass)) category = 'energy';
    if (!category || !isVisibleEntity(entity, states, registry, hidden)) continue;
    (context[category] ??= []).push(presentEntity(entity, state, registry?.[entity]));
  }
  for (const entities of Object.values(context)) {
    entities.sort((a, b) => compareText(a.name ?? a.entity, b.name ?? b.entity, locale));
  }
  return context;
}

export function isAutomationScriptToggle(kind, section, item) {
  return kind === 'automations' && section === 'actions' && item?.role === 'action' &&
    item.command === 'toggle_script' && idForDomain(item.entity, 'script');
}

export function isVacuumProgramAction(kind, section, item) {
  return kind === 'vacuum' && section === 'actions' && item?.role === 'action' &&
    item.command === 'vacuum_program' && Boolean(idForDomain(item.entity, 'button'));
}

export function isToolbarLightTile(kind, section, item) {
  return kind === 'devices' && section === 'devices' && item?.role === 'light_tile' && Boolean(idForDomain(item.entity, 'light'));
}

export function supportsCompactAutomationActions(kind, section) {
  return kind === 'automations' && section?.kind === 'actions';
}

export function isCompactAutomationActions(kind, section) {
  return supportsCompactAutomationActions(kind, section) && section.layout === 'compact-actions';
}

export function supportsCompactToolbarStatus(kind, section) {
  return (kind === 'devices' || kind === 'overview') && section?.kind === 'status';
}

export function isCompactToolbarStatus(kind, section) {
  return supportsCompactToolbarStatus(kind, section) && section.layout === 'compact';
}

export function supportsToolbarReadouts(kind, section) {
  return (kind === 'security' && section?.kind === 'status') ||
    (kind === 'vacuum' && section?.kind === 'readings');
}

export function isToolbarReadouts(kind, section) {
  return supportsToolbarReadouts(kind, section) && section.layout === 'readouts';
}

export function supportsEnergyReadingCards(kind, section) {
  return kind === 'energy' && ['electricity', 'water'].includes(section?.kind);
}

export function isEnergyReadingCards(kind, section) {
  return supportsEnergyReadingCards(kind, section) && section.layout === 'reading-cards';
}

export function supportsWeatherReadingsList(kind, section) {
  return kind === 'weather' && section?.kind === 'readings';
}

export function isWeatherReadingsList(kind, section) {
  return supportsWeatherReadingsList(kind, section) && section.layout === 'readings-list';
}

export function supportsHourlyWeatherForecast(kind, section, item) {
  return kind === 'weather' && section?.kind === 'forecast' && typeof item?.entity === 'string' &&
    domainOf(item.entity) === 'weather' && (!item.role || item.role === 'forecast');
}

const securityReadoutStates = { binary_sensor: ['on', 'off'], sensor: ['safe', 'ok'] };

export function securityReadoutLabelStates(item) {
  const entity = typeof item === 'string' ? item : item?.entity;
  if (typeof entity !== 'string' || !ENTITY_ID.test(entity) || (item?.role !== undefined && item.role !== 'status')) return [];
  return Object.hasOwn(securityReadoutStates, domainOf(entity)) ? securityReadoutStates[domainOf(entity)] : [];
}

export function isToolbarReadoutEntity(kind, item) {
  if (kind === 'security') return securityReadoutLabelStates(item).length > 0;
  if (kind !== 'vacuum' || (item?.role !== undefined && item.role !== 'status')) return false;
  const entity = typeof item === 'string' ? item : item?.entity;
  return typeof entity === 'string' && ENTITY_ID.test(entity) && ['sensor', 'binary_sensor', 'select'].includes(domainOf(entity));
}

function readoutText(value, limit) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && text.length <= limit && !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(text) ? text : undefined;
}

export function normalizeToolbarReadout(kind, section, item) {
  const source = item?.readout;
  if (!isToolbarReadouts(kind, section) || !isToolbarReadoutEntity(kind, item) ||
      !source || Array.isArray(source) || typeof source !== 'object') return;
  const binary = domainOf(item.entity) === 'binary_sensor';
  const numeric = kind === 'security' ? !binary : domainOf(item.entity) === 'sensor';
  const labels = source.state_labels;
  const states = kind === 'security' || binary ? securityReadoutLabelStates(item)
    : labels && !Array.isArray(labels) && typeof labels === 'object' ? Object.keys(labels) : [];
  const stateLabels = Object.fromEntries(states.flatMap(state => {
    if (readoutText(state, 80) !== state || ['unknown', 'unavailable'].includes(state.toLowerCase())) return [];
    const text = readoutText(labels && Object.hasOwn(labels, state) ? labels[state] : undefined, 48);
    return text ? [[state, text]] : [];
  }).slice(0, 128));
  const unit = numeric && readoutText(source.unit, 12);
  const precision = source.precision;
  const settings = {
    ...(Object.keys(stateLabels).length && { state_labels: stateLabels }),
    ...(kind === 'security' && binary && source.danger_on === true && { danger_on: true }),
    ...(unit && { unit }),
    ...(kind === 'vacuum' && numeric && Number.isInteger(precision) && precision >= 0 && precision <= 3 && { precision }),
  };
  return Object.keys(settings).length ? settings : undefined;
}

export const SENSOR_COMPARISON_INTERVALS = [5, 10, 15, 30, 60];
export const SENSOR_COMPARISON_MAX_BUCKETS = 288;

export function sensorComparisonMaxHours(bucketMinutes) {
  return Math.min(72, Math.floor(SENSOR_COMPARISON_MAX_BUCKETS * bucketMinutes / 60));
}

export function supportsSensorComparison(kind, section) {
  return kind === 'sensors' && section?.kind === 'series';
}

export function sensorComparisonOptions(kind, section) {
  const options = section?.comparison;
  if (!supportsSensorComparison(kind, section) || options?.enabled !== true) return undefined;
  const bucket = SENSOR_COMPARISON_INTERVALS.includes(options.bucket_minutes) ? options.bucket_minutes : 30;
  const hours = Number.isInteger(options.hours) && options.hours >= 1 && options.hours <= 72 ? options.hours : 24;
  return { enabled: true, hours: Math.min(hours, sensorComparisonMaxHours(bucket)), bucket_minutes: bucket };
}

export function sensorSeriesColor(item) {
  return item?.role === 'graph' && typeof item.entity === 'string' && domainOf(item.entity) === 'sensor' &&
    typeof item.series_color === 'string' && /^#[a-f\d]{6}$/i.test(item.series_color)
    ? item.series_color.toUpperCase() : undefined;
}

function toolbarSections(value, describe, kind, { vacuumPanels, roomIds }) {
  if (!Array.isArray(value)) return undefined;
  const seenSections = new Set();
  return value.flatMap((section, index) => {
    if (!TOOLBAR_SECTION_KINDS.has(section?.kind)) return [];
    const overview = overviewSectionOptions(kind, section);
    const comparison = sensorComparisonOptions(kind, section);
    const selected = Array.isArray(section.entities) ? section.entities : overview.discover ? [] : null;
    if (!selected) return [];
    const id = layoutId(section.id, 'section-' + (index + 1), seenSections);
    const title = typeof section.title === 'string' ? section.title.trim().slice(0, 80) : undefined;
    const seenEntities = new Set();
    const entities = selected.flatMap(item => {
      const entity = typeof item === 'string' ? item : item?.entity;
      if (typeof entity !== 'string' || seenEntities.has(entity)) return [];
      const descriptor = describe(entity);
      if (!descriptor) return [];
      const domain = domainOf(entity);
      const roleDomain = TOOLBAR_ROLE_DOMAINS.get(item?.role);
      if (roleDomain && roleDomain !== domain) return [];
      if (item?.role === 'light_tile' && !isToolbarLightTile(kind, section.kind, item)) return [];
      seenEntities.add(entity);
      const name = typeof item?.name === 'string' ? item.name.trim().slice(0, 80) : '';
      const icon = typeof item?.icon === 'string' ? item.icon.trim() : '';
      const role = TOOLBAR_ROLES.has(item?.role) ? item.role : undefined;
      const runScript = role === 'action' && domain === 'script' && item.command === 'run_script';
      const command = runScript || isAutomationScriptToggle(kind, section.kind, item) ||
        isVacuumProgramAction(kind, section.kind, item) ? item.command : undefined;
      const confirmation = typeof item?.confirmation === 'string'
        ? item.confirmation.trim().slice(0, 200) || undefined
        : item?.confirmation === true || (item?.confirmation === false && command) ? item.confirmation : undefined;
      const graphHours = item?.graph_hours;
      const hasGraphHours = role === 'graph' && Number.isInteger(graphHours) && graphHours >= 1 && graphHours <= 336;
      const linkedGraph = kind === 'sensors' && role === 'graph' && domain === 'sensor' && section.kind !== 'series';
      const graphRoom = linkedGraph && roomIds?.has(item.graph_room_id) ? item.graph_room_id : undefined;
      const vacuumPanel = linkedGraph && !graphRoom && vacuumPanels.has(item.vacuum_panel_id) ? item.vacuum_panel_id : undefined;
      const accent = kind === 'calendar' && domain === 'calendar' ? calendarAccent(item.accent_color) : undefined;
      const readout = normalizeToolbarReadout(kind, section, item);
      const seriesColor = comparison && sensorSeriesColor(item);
      const hourlyForecast = item?.hourly_forecast === true && supportsHourlyWeatherForecast(kind, section, item);
      return [{ ...descriptor, ...(name && { name }), ...(ROOM_ICON.test(icon) && { icon }),
        ...(role && { role }), ...(command && { command }),
        ...(confirmation !== undefined && { confirmation }), ...(hasGraphHours && { graph_hours: graphHours }),
        ...(graphRoom && { graph_room_id: graphRoom }), ...(vacuumPanel && { vacuum_panel_id: vacuumPanel }),
        ...(accent && { accent_color: accent }), ...(readout && { readout }),
        ...(seriesColor && { series_color: seriesColor }), ...(hourlyForecast && { hourly_forecast: true }) }];
    });
    return [{ id, kind: section.kind, ...(title !== undefined && { title }),
      ...(isCompactAutomationActions(kind, section) && { layout: 'compact-actions' }),
      ...(isCompactToolbarStatus(kind, section) && { layout: 'compact' }),
      ...(isToolbarReadouts(kind, section) && { layout: 'readouts' }),
      ...(isWeatherReadingsList(kind, section) && { layout: 'readings-list' }),
      ...(isEnergyReadingCards(kind, section) && { layout: 'reading-cards' }),
      ...(comparison && { comparison }),
      ...(section.filter === 'active' && { filter:'active' }), ...overview, entities }];
  });
}

export function usesRoomPopupPosition(entry) {
  return entry?.kind === 'devices' && entry.placement === 'settings' && entry.popup_position === 'room';
}

export function toolbarPlacement(kind, value) {
  if (value === 'settings' && kind !== 'settings') return 'settings';
  if (value === 'linked' && (kind === 'media' || kind === 'vacuum')) return 'linked';
  return undefined;
}

function dashboardToolbarEntries(config) {
  if (!Array.isArray(config.toolbar)) return undefined;
  const seen = new Set();
  return config.toolbar.flatMap((entry, index) => {
    if (!TOOLBAR_KINDS.has(entry?.kind)) return [];
    const path = entry.kind === 'link' && typeof entry.path === 'string' ? entry.path.trim() : '';
    if (entry.kind === 'link' && !LOCAL_ROUTE.test(path)) return [];
    const id = layoutId(entry.id, 'toolbar-' + (index + 1), seen);
    return [{ entry, id, path }];
  });
}

function toolbarEntryLabel(entry) {
  return typeof entry.label === 'string' ? entry.label.trim().slice(0, 80) : '';
}

function dashboardToolbar(config, hass, roomIds) {
  const entries = dashboardToolbarEntries(config);
  if (!entries) return undefined;
  const states = hass.states ?? {};
  const registry = hass.entities;
  const hidden = new Set(idList(config.hidden_entities));
  const profiles = profilesOf(config.profiles);
  const describe = entity => isVisibleEntity(entity, states, registry, hidden)
    ? presentEntity(entity, states[entity], registry?.[entity], profiles.get(entity)) : null;
  const vacuumPanels = new Set(entries.filter(({ entry }) => entry.kind === 'vacuum').map(({ id }) => id));
  return entries.map(({ entry, id, path }) => {
    const label = toolbarEntryLabel(entry);
    const icon = typeof entry.icon === 'string' ? entry.icon.trim() : '';
    const placement = toolbarPlacement(entry.kind, entry.placement);
    const entities = Array.isArray(entry.entities) ? idList(entry.entities).map(describe).filter(Boolean) : undefined;
    const sections = entry.kind !== 'link'
      ? toolbarSections(entry.sections, describe, entry.kind, { vacuumPanels, roomIds }) : undefined;
    const orefMap = entry.kind === 'security' ? normalizeOrefMap(entry.oref_map) : undefined;
    const mediaStage = entry.kind === 'media' ? normalizeMediaStage(entry.media_stage, entity =>
      isVisibleEntity(entity, states, registry, hidden)) : undefined;
    const mediaRemote = entry.kind === 'media' ? normalizeMediaRemote(entry.media_remote, entity =>
      isVisibleEntity(entity, states, registry, hidden)) : undefined;
    const vacuumMap = entry.kind === 'vacuum'
      ? normalizeVacuumMap(entry.vacuum_map, entity => isVisibleEntity(entity, states, registry, hidden), registry) : undefined;
    const agenda = entry.kind === 'calendar' ? normalizeCalendarAgenda(entry.calendar_agenda, entity =>
      isVisibleEntity(entity, states, registry, hidden) &&
      supportsDailyForecast(states[entity])) : undefined;
    return { id, kind: entry.kind, ...(label && { label }), ...(ROOM_ICON.test(icon) && { icon }),
      ...(entry.kind === 'presence' && typeof entry.presence_dynamic_icon === 'boolean' &&
        { presence_dynamic_icon: entry.presence_dynamic_icon }),
      ...(path && { path }), ...(placement && { placement }),
      ...(usesRoomPopupPosition(entry) && { popup_position: 'room' }),
      ...(entities !== undefined && { entities }), ...(sections !== undefined && { sections }),
      ...(agenda && { calendar_agenda: agenda }), ...(mediaRemote && { media_remote: mediaRemote }),
      ...(mediaStage && { media_stage: mediaStage }),
      ...(orefMap && { oref_map: orefMap }), ...(vacuumMap && { vacuum_map: vacuumMap }) };
  });
}

export function shortcutPanelOptions(config) {
  const toolbar = dashboardToolbarEntries(config) ?? [];
  return shortcutDetailPanels(toolbar.map(({ entry, id }) => ({
    id, kind: entry.kind, label: toolbarEntryLabel(entry), placement: toolbarPlacement(entry.kind, entry.placement),
  })));
}

export function roomPanelOptions(config, hass) {
  const kinds = new Set(ROOM_PANEL_KINDS.values());
  return (dashboardToolbar(config, hass) ?? []).filter(entry => kinds.has(entry.kind))
    .map(({ id, label, kind }) => ({ id, label, kind }));
}

export function suggestedDashboard(hass) {
  return { title: labels[languageFor('auto', hass)].title, icon: 'mdi:home-variant-outline' };
}

export function generateDashboard(config = {}, hass = {}) {
  const locale = languageFor(config.locale, hass);
  const title = typeof config.title === 'string' && config.title.trim()
    ? config.title.trim() : labels[locale].title;
  const card = {
    type: CARD_TYPE,
    page: true,
    ...(config.fullscreen === true && { fullscreen: true }),
    ...(config.appearance_sync === true && { appearance_sync: true }),
    locale,
    title,
    rooms: discoverRooms(config, hass, locale),
  };
  const popupAliases = normalizePopupAliases(config.popup_aliases);
  if (Object.keys(popupAliases).length) card.popup_aliases = popupAliases;
  const visible = new Set(card.rooms.flatMap(room => room.entities.map(device => device.entity)));
  const overview = idList(config.overview_entities).filter(id => visible.has(id));
  if (overview.length) card.overview = overview;
  const context = dashboardContext(config, hass, locale);
  if (Object.keys(context).length) card.context = context;
  const toolbar = dashboardToolbar(config, hass, new Set(card.rooms.map(room => room.id)));
  if (toolbar !== undefined) {
    card.toolbar = toolbar;
    const hidden = idList(config.hidden_entities);
    if (hidden.length && toolbar.some(entry => entry.sections?.some(section => section.discover))) card.hidden_entities = hidden;
  }
  const sharedWallpapers = normalizeSharedWallpapers(config.shared_wallpapers);
  if (sharedWallpapers.length) card.shared_wallpapers = sharedWallpapers;
  if (Object.hasOwn(BACKGROUNDS, config.background) || sharedWallpapers.some(item => item.id === config.background)) {
    card.background = config.background;
  }
  if (['soft', 'circle', 'square'].includes(config.shape)) card.shape = config.shape;
  if (['classic', 'header'].includes(config.layout)) card.layout = config.layout;
  if (typeof config.preference_key === 'string' && config.preference_key.trim()) {
    card.preference_key = config.preference_key.trim();
  }
  return {
    title,
    views: [
      {
        title: labels[locale].home,
        path: 'home',
        type: 'panel',
        cards: [card],
      },
    ],
  };
}
