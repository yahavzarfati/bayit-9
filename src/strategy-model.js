import { HEATING_DOMAINS } from './device-control.mjs';

export const CARD_TYPE = 'custom:bayit-dashboard';
export const STRATEGY_NAME = 'bayit-9';
export const BACKGROUNDS = {
  aurora: { en: 'Aurora', he: 'זוהר צפוני' },
  lagoon: { en: 'Lagoon', he: 'לגונה' },
  dunes: { en: 'Dunes', he: 'דיונות' },
  graphite: { en: 'Graphite', he: 'גרפיט' },
};

export const PROFILE_DOMAINS = HEATING_DOMAINS;
export const DEFAULT_DOMAINS = [
  'light', 'switch', 'cover', 'climate', 'fan', 'lock', 'water_heater', 'vacuum',
  'humidifier', 'alarm_control_panel', 'camera', 'media_player',
  'binary_sensor', 'sensor', 'weather', 'person', 'calendar',
];

const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const PROFILE_KINDS = new Set(['heater', 'boiler']);
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
      || !PROFILE_DOMAINS.includes(domainOf(value.entity)) || !PROFILE_KINDS.has(value.kind)) {
    return null;
  }
  const profile = { entity: value.entity, kind: value.kind };
  if (typeof value.name === 'string' && value.name.trim()) profile.name = value.name.trim().slice(0, 80);
  const timed = value.timed;
  if (!timed || typeof timed !== 'object') return profile;

  const startScript = idForDomain(timed.start_script, ARMING_DOMAIN);
  const stopScript = idForDomain(timed.stop_script, ARMING_DOMAIN);
  const timer = idForDomain(timed.timer_entity, 'timer');
  if (!startScript && !timer && !stopScript) return profile;
  const min = numberOr(timed.min_minutes, 15);
  const max = Math.max(min, numberOr(timed.max_minutes, 60));
  const step = Math.min(max - min || 1, numberOr(timed.step_minutes, 15));
  profile.timed = {
    ...(startScript && { start_script: startScript }),
    ...(stopScript && { stop_script: stopScript }),
    ...(timer && { timer_entity: timer }),
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

function relatedAreas(hass) {
  return new Map(Object.entries(hass.areas ?? {}).map(([id, area]) => [
    area.area_id ?? id,
    { name: area.name ?? id, icon: area.icon || 'mdi:home-outline' },
  ]));
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
    ...(profile?.timed && { timed: profile.timed }),
  };
}

export function discoverRooms(config, hass, locale) {
  const areas = relatedAreas(hass);
  const unassigned = pickUnassignedId(areas);
  const areaFilter = new Set(idList(config.area_ids));
  const explicitOrder = new Map(idList(config.area_ids).map((id, index) => [id, index]));
  const hidden = new Set(idList(config.hidden_entities));
  const extra = new Set(idList(config.included_entities));
  const profiles = profilesOf(config.profiles);
  const adapterEntities = new Set([...profiles.values()].flatMap(profile => {
    const timed = profile.timed;
    return timed ? [timed.start_script, timed.stop_script, timed.timer_entity].filter(Boolean) : [];
  }));
  const states = hass.states ?? {};
  const registry = hass.entities ?? null;
  const grouped = new Map();
  const availableIds = new Set(registry ? Object.keys(registry) : Object.keys(states));
  for (const explicit of [...extra, ...profiles.keys()]) availableIds.add(explicit);

  for (const entity of availableIds) {
    if (!ENTITY_ID.test(entity) || hidden.has(entity) || !Object.hasOwn(states, entity)) continue;
    const info = registry?.[entity];
    if (info?.hidden === true || info?.hidden_by || info?.disabled_by) continue;
    const isExplicit = extra.has(entity) || profiles.has(entity);
    const domain = domainOf(entity);
    const isDiagnostic = info?.entity_category != null || info?.ec != null;
    if (!isExplicit && (!DEFAULT_RANK.has(domain) || isDiagnostic || adapterEntities.has(entity))) continue;

    const deviceId = info?.device_id ?? info?.di;
    const device = deviceId && hass.devices?.[deviceId];
    const assigned = info?.area_id ?? info?.ai ?? device?.area_id;
    const areaId = assigned && areas.has(assigned) ? assigned : unassigned;
    if (areaId === unassigned ? config.show_unassigned === false : areaFilter.size && !areaFilter.has(areaId)) continue;
    if (!grouped.has(areaId)) grouped.set(areaId, []);
    grouped.get(areaId).push(presentEntity(entity, states[entity], info, profiles.get(entity)));
  }

  const roomFor = id => areas.get(id) ?? { name: labels[locale].unassigned, icon: 'mdi:map-marker-outline' };
  const roomIds = [...grouped.keys()].sort((a, b) => {
    if (a === unassigned || b === unassigned) return a === unassigned ? 1 : -1;
    const bySelection = (explicitOrder.get(a) ?? Infinity) - (explicitOrder.get(b) ?? Infinity);
    return bySelection || compareText(roomFor(a).name, roomFor(b).name, locale);
  });

  return roomIds.map(id => {
    const area = roomFor(id);
    const entities = grouped.get(id).sort((a, b) => {
      const rank = (DEFAULT_RANK.get(domainOf(a.entity)) ?? 100) - (DEFAULT_RANK.get(domainOf(b.entity)) ?? 100);
      return rank || compareText(a.name ?? a.entity, b.name ?? b.entity, locale);
    });
    return { id, name: area.name, icon: area.icon, entities };
  });
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
    locale,
    title,
    rooms: discoverRooms(config, hass, locale),
  };
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
