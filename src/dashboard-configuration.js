import { STRATEGY_NAME } from './strategy-model.js';

const STRATEGY_TYPE = 'custom:' + STRATEGY_NAME;
const CONFLICT = Symbol('configuration conflict');
const saveQueues = new WeakMap();

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function sameValue(a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, index) => sameValue(value, b[index]));
  if (!record(a) || !record(b)) return false;
  const keys = Object.keys(a).filter(key => a[key] !== undefined);
  return keys.length === Object.values(b).filter(value => value !== undefined).length &&
    keys.every(key => Object.hasOwn(b, key) && sameValue(a[key], b[key]));
}

function rebaseValue(base, draft, saved) {
  if (sameValue(base, draft)) return saved;
  if (sameValue(base, saved) || sameValue(draft, saved)) return draft;
  // Ordered lists are a single setting. A pair of edits to the same order
  // cannot be combined without choosing which user's placement takes priority.
  if ((base !== undefined && !record(base)) || !record(draft) || !record(saved)) return CONFLICT;
  const keys = new Set([...Object.keys(saved), ...Object.keys(draft), ...Object.keys(base ?? {})]);
  const entries = [];
  const at = (object, key) => object && Object.hasOwn(object, key) ? object[key] : undefined;
  for (const key of keys) {
    const merged = rebaseValue(at(base, key), at(draft, key), at(saved, key));
    if (merged === CONFLICT) return CONFLICT;
    if (merged !== undefined) entries.push([key, merged]);
  }
  return Object.fromEntries(entries);
}

export function rebaseConfigurationDraft(base, draft, saved) {
  const merged = rebaseValue(base, draft, saved);
  return merged === CONFLICT ? null : merged;
}

function configurationError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function dashboardPath(pathname) {
  const path = pathname.split('/')[1];
  return /^[a-z0-9][a-z0-9_-]*$/i.test(path ?? '') && path.includes('-') ? path : null;
}

function checkEditor(hass) {
  if (!hass?.user?.is_admin || typeof hass.callWS !== 'function') {
    throw configurationError('setup_storage');
  }
}

async function readStrategy(hass, urlPath) {
  const config = await hass.callWS({ type: 'lovelace/config', url_path: urlPath, force: true });
  const { strategy } = config ?? {};
  if (strategy?.type !== STRATEGY_TYPE) throw configurationError('setup_storage');
  // Home Assistant unwraps this legacy shape before passing it to the renderer.
  if (Object.keys(strategy).length !== 2 || typeof strategy.options !== 'object') return config;
  const effective = { ...strategy, ...strategy.options };
  delete effective.options;
  return { ...config, strategy: effective };
}

export async function loadConfiguration(hass, pathname) {
  checkEditor(hass);
  const urlPath = dashboardPath(pathname);
  if (!urlPath) throw configurationError('setup_storage');
  const dashboards = await hass.callWS({ type: 'lovelace/dashboards/list' });
  if (!dashboards.some(item => item.url_path === urlPath && item.mode === 'storage')) {
    throw configurationError('setup_storage');
  }
  const config = await readStrategy(hass, urlPath);
  return { urlPath, strategy: config.strategy };
}

export async function saveConfiguration(hass, current, strategy, { shouldSave, mergeDraft = false } = {}) {
  checkEditor(hass);
  // HA gives each update a new hass object while retaining the same connection.
  const connection = hass.connection ?? hass;
  let queue = saveQueues.get(connection);
  if (!queue) {
    queue = new Map();
    saveQueues.set(connection, queue);
  }
  const previous = queue.get(current.urlPath);
  const save = (previous ?? Promise.resolve()).catch(() => {}).then(() =>
    writeConfiguration(hass, current, strategy, { shouldSave, mergeDraft }));
  queue.set(current.urlPath, save);
  try {
    return await save;
  } finally {
    if (queue.get(current.urlPath) === save) queue.delete(current.urlPath);
  }
}

async function writeConfiguration(hass, current, strategy, { shouldSave, mergeDraft }) {
  checkEditor(hass);
  const latest = await readStrategy(hass, current.urlPath);
  if (shouldSave && !shouldSave()) return false;
  const sameBaseline = sameValue(latest.strategy, current.strategy);
  const updated = sameBaseline ? strategy
    : mergeDraft ? rebaseConfigurationDraft(current.strategy, strategy, latest.strategy) : null;
  if (!updated) throw configurationError('setup_conflict');
  const config = { ...latest, strategy: { ...updated, type: STRATEGY_TYPE } };
  await hass.callWS({ type: 'lovelace/config/save', url_path: current.urlPath, config });
  return true;
}
