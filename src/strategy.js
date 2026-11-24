import { Bayit9StrategyEditor } from './strategy-editor.js';
import { generateDashboard, STRATEGY_NAME, suggestedDashboard } from './strategy-model.js';
import { preparePageChrome } from './page-chrome.js';

const TAG = 'll-strategy-dashboard-' + STRATEGY_NAME;
const EDITOR = 'bayit-9-strategy-editor';

export class Bayit9DashboardStrategy extends HTMLElement {
  static registryDependencies = ['areas', 'devices', 'entities'];

  static generate(config, hass) {
    preparePageChrome({ enabled: config?.fullscreen === true, hass });
    return generateDashboard(config, hass);
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
