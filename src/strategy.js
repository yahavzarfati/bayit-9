import { Bayit9StrategyEditor } from './strategy-editor.js';
import { generateDashboard, STRATEGY_NAME, suggestedDashboard } from './strategy-model.js';
import { preparePageChrome } from './page-chrome.js';
import { stateInventoryChanged } from './state-inventory.js';

const TAG = 'll-strategy-dashboard-' + STRATEGY_NAME;
const EDITOR = 'bayit-9-strategy-editor';
const registryDependencies = ['areas', 'devices', 'entities', 'floors'];
const generatedDashboards = new WeakMap();

export class Bayit9DashboardStrategy extends HTMLElement {
  static registryDependencies = registryDependencies;

  static generate(config, hass) {
    preparePageChrome({ enabled: config?.fullscreen === true, hass });
    const dashboard = generateDashboard(config, hass);
    if (config && typeof config === 'object') generatedDashboards.set(config, JSON.stringify(dashboard));
    return dashboard;
  }

  static shouldRegenerate(config, previous, current) {
    if (!registryDependencies.some(key => previous[key] !== current[key]) &&
        !stateInventoryChanged(previous.states, current.states)) return false;
    // HA flattens legacy options only when it invokes generate().
    if (Object.keys(config).length === 2 && 'options' in config && typeof config.options === 'object') return true;
    // Ordinary hass updates can change the input since this dashboard was mounted.
    const rendered = generatedDashboards.get(config) ?? JSON.stringify(generateDashboard(config, previous));
    return rendered !== JSON.stringify(generateDashboard(config, current));
  }

  static getCreateSuggestions(hass) {
    return suggestedDashboard(hass);
  }

  static getConfigElement() {
    return document.createElement(EDITOR);
  }
}

export function registerBayit9Strategy() {
  if (!customElements.get(TAG)) customElements.define(TAG, Bayit9DashboardStrategy);
  if (!customElements.get(EDITOR)) customElements.define(EDITOR, Bayit9StrategyEditor);

  window.customStrategies ??= [];
  if (!window.customStrategies.some(item => item.type === STRATEGY_NAME && item.strategyType === 'dashboard')) {
    window.customStrategies.push({
      type: STRATEGY_NAME,
      strategyType: 'dashboard',
      name: 'Bayit 9',
      description: 'A room-based Liquid Glass dashboard for Home Assistant.',
      documentationURL: 'https://github.com/yahavzarfati/bayit-9',
    });
  }
}
