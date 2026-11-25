import { STRATEGY_NAME } from './strategy-model.js';

const STRATEGY_TYPE = 'custom:' + STRATEGY_NAME;

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

export async function saveConfiguration(hass, current, strategy, { shouldSave } = {}) {
  checkEditor(hass);
  const latest = await readStrategy(hass, current.urlPath);
  if (shouldSave && !shouldSave()) return false;
  if (JSON.stringify(latest.strategy) !== JSON.stringify(current.strategy)) {
    throw configurationError('setup_conflict');
  }
  const config = { ...latest, strategy: { ...strategy, type: STRATEGY_TYPE } };
  await hass.callWS({ type: 'lovelace/config/save', url_path: current.urlPath, config });
  return true;
}
