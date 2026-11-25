import { normalizeRoomActivities } from './room-appliance.mjs';
import { HEATING_DOMAINS } from './device-control.mjs';
import { normalizeOrefMap } from './oref-alert-map.js';
import { normalizeVacuumMap } from './vacuum-map.js';
import { wallpaperChoices } from './wallpapers.js';
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
export const TOOLBAR_ROLES = new Set(['action', 'lock', 'cover', 'status', 'device', 'forecast', 'sun', 'graph', 'person', 'now_playing']);
export const TOOLBAR_ROLE_DOMAINS = new Map([
  ['lock', 'lock'], ['cover', 'cover'], ['forecast', 'weather'], ['sun', 'sun'], ['person', 'person'],
  ['now_playing', 'media_player'],
]);
export const ROOM_PANEL_KINDS = new Map([['media_player', 'media'], ['vacuum', 'vacuum']]);
const ROOM_ICON = /^mdi:[a-z0-9-]+$/;
const CONTROL_DOMAINS = new Set(['light', 'switch', 'cover', 'climate', 'fan', 'lock', 'water_heater']);
const SECURITY_CLASSES = new Set(['door', 'window', 'garage_door', 'opening']);
const PROFILE_KINDS = new Set(['heater', 'boiler', 'climate']);
const DEFAULT_RANK = new Map(DEFAULT_DOMAINS.map((domain, index) => [domain, index]));
const ARMING_DOMAIN = 'script';

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

export function normalizeProfile(value) {
  if (!value || typeof value.entity !== 'string' || !ENTITY_ID.test(value.entity)
      || !PROFILE_KINDS.has(value.kind)) return null;
  const domain = domainOf(value.entity);
  if (!PROFILE_DOMAINS.includes(domain) || (value.kind === 'climate' && domain !== 'climate')) return null;
  const profile = { entity: value.entity, kind: value.kind };
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

export function normalizeRoomControlName(value) {
  if (typeof value !== 'string') return undefined;
  if (value === '') return '';
  return value.trim().slice(0, 80) || undefined;
}

export function usesAutomaticRoomDevices(override, sections, custom) {
  return !custom && (override.device_selection === 'auto' ||
    (!Array.isArray(override.entities) && !sections?.length));
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
    const icon = typeof override.icon === 'string' ? override.icon.trim() : '';
    const entityIcons = override.entity_icons;
    const entityNames = override.entity_names;
    const sections = roomSections(override.sections);
    const entityIds = usesAutomaticRoomDevices(override, sections, !area) ? undefined
      : Array.isArray(override.entities) ? idList(override.entities) : idList(sections?.flatMap(section => section.entities));
    areas.set(id, {
      name: name || area?.name,
      icon: ROOM_ICON.test(icon) ? icon : area?.icon ?? 'mdi:home-outline',
      entityIds,
      sections,
      readOnly: new Set(idList(override.read_only_entities)),
      panelHidden: idList(override.panel_hidden_entities),
      lightingCount: idList(override.lighting_count_entities),
      activities: override.activities,
      panelLinks: Object.fromEntries([...ROOM_PANEL_KINDS.values()].flatMap(kind => {
        const links = override[kind + '_panel_links'];
        return links && typeof links === 'object' && !Array.isArray(links) ? [[kind, links]] : [];
      })),
      entityIcons: entityIcons && typeof entityIcons === 'object' && !Array.isArray(entityIcons) ? entityIcons : null,
      entityNames: entityNames && typeof entityNames === 'object' && !Array.isArray(entityNames) ? entityNames : null,
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
    ...(profile?.level_entity && { level_entity: profile.level_entity }),
    ...(profile?.level_steps && { level_steps: profile.level_steps }),
    ...(profile?.level_read_entity && { level_read_entity: profile.level_read_entity }),
    ...(profile?.level_select_script && { level_select_script: profile.level_select_script }),
    ...(profile?.level_preselect_entity && { level_preselect_entity: profile.level_preselect_entity }),
    ...(profile?.timed && { timed: profile.timed }),
    ...(profile?.schedule && { schedule: profile.schedule }),
  };
}

function isVisibleEntity(entity, states, registry, hidden) {
  if (!ENTITY_ID.test(entity) || hidden.has(entity) || !Object.hasOwn(states, entity) || states[entity] == null) {
    return false;
  }
  const info = registry?.[entity];
  return info?.hidden !== true && !info?.hidden_by && !info?.disabled_by;
}

const overviewIdFragment = /^[a-z0-9_]{1,64}$/;

export function normalizeOverviewDiscovery(value) {
  if (!value || value.domain !== 'light' || Array.isArray(value)) return undefined;
  const { exclude_entities = [], exclude_id_contains = [] } = value;
  if (!Array.isArray(exclude_entities) || exclude_entities.some(id => !idForDomain(id, 'light')) ||
      !Array.isArray(exclude_id_contains) || exclude_id_contains.length > 16 ||
      exclude_id_contains.some(fragment => typeof fragment !== 'string' || !overviewIdFragment.test(fragment))) {
    return undefined;
  }
  return { domain: 'light', exclude_entities: [...new Set(exclude_entities)], exclude_id_contains: [...new Set(exclude_id_contains)] };
}

export function overviewSectionOptions(kind, section) {
  if (kind !== 'overview') return {};
  const discover = section.kind === 'status' && normalizeOverviewDiscovery(section.discover);
  if (discover) return { discover, filter: 'active' };
  return section.filter === 'active' && ['status', 'covers'].includes(section.kind) && section.include_closing === true
    ? { include_closing: true } : {};
}

export function isActiveOverviewLight(entity, source, hass, hidden) {
  const states = hass?.states ?? {};
  return hass?.entities != null && entity.startsWith('light.') && states[entity]?.state === 'on' &&
    isVisibleEntity(entity, states, hass?.entities, hidden) &&
    !source.exclude_entities.includes(entity) &&
    !source.exclude_id_contains.some(fragment => entity.slice('light.'.length).includes(fragment));
}

export function discoverOverviewLights(source, hass, hidden, locale) {
  const states = hass?.states ?? {};
  return Object.keys(states).filter(entity => isActiveOverviewLight(entity, source, hass, hidden))
    .map(entity => ({ ...presentEntity(entity, states[entity], hass?.entities?.[entity]), role: 'action' }))
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

export function discoverRooms(config, hass, locale) {
  const areas = dashboardAreas(config, hass);
  const panelKinds = new Map([...areas.values()].some(area => Object.keys(area.panelLinks ?? {}).length)
    ? roomPanelOptions(config, hass).map(panel => [panel.id, panel.kind]) : []);
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
  const present = entity => presentEntity(entity, states[entity], registry?.[entity], profiles.get(entity));

  const manuallyPlaced = new Set();
  for (const [id, room] of areas) {
    if (!isSelected(id) || (!room.entityIds && config.room_selection !== 'manual')) continue;
    const ids = (room.entityIds ?? []).filter(visible);
    grouped.set(id, ids.map(present));
    for (const entity of ids) manuallyPlaced.add(entity);
  }

  const availableIds = new Set(registry ? Object.keys(registry) : Object.keys(states));
  for (const explicit of [...extra, ...profiles.keys()]) availableIds.add(explicit);
  for (const entity of availableIds) {
    if (manuallyPlaced.has(entity) || !visible(entity)) continue;
    const info = registry?.[entity];
    const isExplicit = extra.has(entity) || profiles.has(entity);
    const isDiagnostic = info?.entity_category != null || info?.ec != null;
    if (!isExplicit && (!discoverableDomains.has(domainOf(entity)) || isDiagnostic || adapterEntities.has(entity))) continue;

    const assigned = entityArea(info, hass);
    const area = areas.get(assigned);
    const areaId = area && !area.custom ? assigned : unassigned;
    if (areaId === unassigned ? config.show_unassigned === false : !isSelected(areaId) || area.entityIds) continue;
    if (!grouped.has(areaId)) grouped.set(areaId, []);
    grouped.get(areaId).push(present(entity));
  }

  const roomFor = id => areas.get(id) ?? { name: labels[locale].unassigned, icon: 'mdi:map-marker-outline' };
  const roomIds = [...grouped.keys()].sort((a, b) => {
    if (a === unassigned || b === unassigned) return a === unassigned ? 1 : -1;
    const bySelection = (explicitOrder.get(a) ?? Infinity) - (explicitOrder.get(b) ?? Infinity);
    return bySelection || compareText(roomFor(a).name, roomFor(b).name, locale);
  });

  return roomIds.map(id => {
    const area = roomFor(id);
    const entities = grouped.get(id);
    if (!area.entityIds) {
      entities.sort((a, b) => {
        const rank = (DEFAULT_RANK.get(domainOf(a.entity)) ?? 100) - (DEFAULT_RANK.get(domainOf(b.entity)) ?? 100);
        return rank || compareText(a.name ?? a.entity, b.name ?? b.entity, locale);
      });
    }
    if (area.entityIcons) {
      for (const entity of entities) {
        if (!Object.hasOwn(area.entityIcons, entity.entity)) continue;
        const icon = area.entityIcons[entity.entity];
        if (typeof icon === 'string' && ROOM_ICON.test(icon.trim())) entity.icon = icon.trim();
      }
    }
    const room = { id, name: area.name, icon: area.icon, entities };
    if (area.panelHidden?.length) {
      const members = new Set(entities.map(device => device.entity));
      const hidden = area.panelHidden.filter(entity => members.has(entity));
      if (hidden.length) room.panel_hidden_entities = hidden;
    }
    if (area.lightingCount?.length) {
      const lights = new Set(entities.filter(item => domainOf(item.entity) === 'light').map(item => item.entity));
      const scope = area.lightingCount.filter(entity => lights.has(entity));
      if (scope.length) room.lighting_count_entities = scope;
    }
    const activities = normalizeRoomActivities(area.activities, visible);
    if (activities.length) room.activities = activities;
    for (const device of entities) {
      if (area.entityNames && Object.hasOwn(area.entityNames, device.entity)) {
        const name = normalizeRoomControlName(area.entityNames[device.entity]);
        if (name !== undefined) device.room_name = name;
      }
      if (area.readOnly?.has(device.entity)) device.role = 'status';
      const panelKind = ROOM_PANEL_KINDS.get(domainOf(device.entity));
      const links = area.panelLinks?.[panelKind];
      if (links && Object.hasOwn(links, device.entity)) {
        const target = links[device.entity];
        if (panelKinds.get(target) === panelKind) device[panelKind + '_panel_id'] = target;
      }
      if (device.role === 'status' || domainOf(device.entity) !== 'light' ||
          !Object.hasOwn(config.light_effect_groups ?? {}, device.entity)) continue;
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

function toolbarSections(value, describe, kind, { vacuumPanels, roomIds }) {
  if (!Array.isArray(value)) return undefined;
  const seenSections = new Set();
  return value.flatMap((section, index) => {
    if (!TOOLBAR_SECTION_KINDS.has(section?.kind)) return [];
    const overview = overviewSectionOptions(kind, section);
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
      seenEntities.add(entity);
      const name = typeof item?.name === 'string' ? item.name.trim().slice(0, 80) : '';
      const icon = typeof item?.icon === 'string' ? item.icon.trim() : '';
      const role = TOOLBAR_ROLES.has(item?.role) ? item.role : undefined;
      const command = role === 'action' && domain === 'script' && item.command === 'run_script' ? item.command : undefined;
      const confirmation = typeof item?.confirmation === 'string'
        ? item.confirmation.trim().slice(0, 200) || undefined
        : item?.confirmation === true || (item?.confirmation === false && command) ? item.confirmation : undefined;
      const graphHours = item?.graph_hours;
      const hasGraphHours = role === 'graph' && Number.isInteger(graphHours) && graphHours >= 1 && graphHours <= 336;
      const linkedGraph = kind === 'sensors' && role === 'graph' && domain === 'sensor' && section.kind !== 'series';
      const graphRoom = linkedGraph && roomIds?.has(item.graph_room_id) ? item.graph_room_id : undefined;
      const vacuumPanel = linkedGraph && !graphRoom && vacuumPanels.has(item.vacuum_panel_id) ? item.vacuum_panel_id : undefined;
      const accent = kind === 'calendar' && domain === 'calendar' ? calendarAccent(item.accent_color) : undefined;
      return [{ ...descriptor, ...(name && { name }), ...(ROOM_ICON.test(icon) && { icon }),
        ...(role && { role }), ...(command && { command }),
        ...(confirmation !== undefined && { confirmation }), ...(hasGraphHours && { graph_hours: graphHours }),
        ...(graphRoom && { graph_room_id: graphRoom }), ...(vacuumPanel && { vacuum_panel_id: vacuumPanel }),
        ...(accent && { accent_color: accent }) }];
    });
    return [{ id, kind: section.kind, ...(title !== undefined && { title }),
      ...(section.filter === 'active' && { filter:'active' }), ...overview, entities }];
  });
}

function dashboardToolbar(config, hass, roomIds) {
  if (!Array.isArray(config.toolbar)) return undefined;
  const states = hass.states ?? {};
  const registry = hass.entities;
  const hidden = new Set(idList(config.hidden_entities));
  const profiles = profilesOf(config.profiles);
  const seen = new Set();
  const describe = entity => isVisibleEntity(entity, states, registry, hidden)
    ? presentEntity(entity, states[entity], registry?.[entity], profiles.get(entity)) : null;
  const entries = config.toolbar.flatMap((entry, index) => {
    if (!TOOLBAR_KINDS.has(entry?.kind)) return [];
    const path = entry.kind === 'link' && typeof entry.path === 'string' ? entry.path.trim() : '';
    if (entry.kind === 'link' && !LOCAL_ROUTE.test(path)) return [];
    const id = layoutId(entry.id, 'toolbar-' + (index + 1), seen);
    return [{ entry, id, path }];
  });
  const vacuumPanels = new Set(entries.filter(({ entry }) => entry.kind === 'vacuum').map(({ id }) => id));
  return entries.map(({ entry, id, path }) => {
    const label = typeof entry.label === 'string' ? entry.label.trim().slice(0, 80) : '';
    const icon = typeof entry.icon === 'string' ? entry.icon.trim() : '';
    const entities = Array.isArray(entry.entities) ? idList(entry.entities).map(describe).filter(Boolean) : undefined;
    const sections = entry.kind !== 'link'
      ? toolbarSections(entry.sections, describe, entry.kind, { vacuumPanels, roomIds }) : undefined;
    const orefMap = entry.kind === 'security' ? normalizeOrefMap(entry.oref_map) : undefined;
    const vacuumMap = entry.kind === 'vacuum'
      ? normalizeVacuumMap(entry.vacuum_map, entity => isVisibleEntity(entity, states, registry, hidden), registry) : undefined;
    const agenda = entry.kind === 'calendar' ? normalizeCalendarAgenda(entry.calendar_agenda, entity =>
      isVisibleEntity(entity, states, registry, hidden) &&
      supportsDailyForecast(states[entity])) : undefined;
    return { id, kind: entry.kind, ...(label && { label }), ...(ROOM_ICON.test(icon) && { icon }),
      ...(path && { path }), ...(entry.placement === 'settings' && entry.kind !== 'settings' && { placement:'settings' }),
      ...(entities !== undefined && { entities }), ...(sections !== undefined && { sections }),
      ...(agenda && { calendar_agenda: agenda }),
      ...(orefMap && { oref_map: orefMap }), ...(vacuumMap && { vacuum_map: vacuumMap }) };
  });
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
  if (Object.hasOwn(BACKGROUNDS, config.background)) card.background = config.background;
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
