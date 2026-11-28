export const OREF_MAP_DEFAULTS = Object.freeze({
  auto_fit: true,
  hebrew_basemap: true,
  show_pre_alert: false,
  show_end: true,
});
export const OREF_MAP_ASPECT_RATIOS = Object.freeze(['4:3', '1:1']);

const TAG = 'oref-alert-map';
const READ_SERVICES = ['last_update', 'areas_status'];
const RETRY_DELAYS = [1500, 4000, 10000];
// Home Assistant can report a dropped connection or an explicit read timeout.
const TRANSIENT_READ_CODES = new Set([3, 'connection_lost', 'timeout']);
const EMPTY = Object.freeze({});
// A regional view of Israel, independent of Home Assistant's configured location.
const REGION = Object.freeze({
  latitude: 31.5, longitude: 34.9, country: 'IL', elevation: 0,
  components: Object.freeze([]), unit_system: Object.freeze({ length: 'km' }),
});
const CONTEXTS = new Map([
  ['hassConfig', Object.freeze({ config: REGION })],
  ['config', REGION],
  ...['states', 'entities', 'fullEntities', 'devices', 'areas'].map(key => [key, EMPTY]),
]);

export function normalizeOrefMap(value) {
  if (value?.enabled !== true) return undefined;
  return {
    enabled: true,
    ...Object.fromEntries(Object.entries(OREF_MAP_DEFAULTS).map(([key, fallback]) =>
      [key, typeof value[key] === 'boolean' ? value[key] : fallback])),
    aspect_ratio: OREF_MAP_ASPECT_RATIOS.includes(value.aspect_ratio) ? value.aspect_ratio : OREF_MAP_ASPECT_RATIOS[0],
  };
}

function cardConfig(options) {
  const { enabled, ...settings } = normalizeOrefMap(options);
  return {
    type: 'custom:' + TAG,
    ...settings,
    show_home: false,
    show_location: false,
    default_zoom: 8,
  };
}

function mapHass(hass, active, readFailed) {
  return {
    config: REGION,
    states: EMPTY,
    entities: EMPTY,
    devices: EMPTY,
    areas: EMPTY,
    themes: hass.themes,
    language: hass.language,
    locale: hass.locale,
    localize: (...args) => hass.localize?.(...args),
    async callService(domain, service) {
      if (!active()) return { response: {} };
      if (domain !== 'oref_alert' || !READ_SERVICES.includes(service)) {
        throw new Error('Unsupported alert-map service.');
      }
      try {
        const reply = await hass.callService('oref_alert', service, {}, undefined, false, true);
        return active() ? reply : { response: {} };
      } catch (error) {
        readFailed(error);
        throw error;
      }
    },
  };
}

export function createOrefMap({ slot, dialog, fallback, loadingText, options }) {
  const view = slot.ownerDocument.defaultView;
  const pathname = view.location.pathname;
  const unavailableText = fallback.textContent;
  const events = new view.AbortController();
  const observer = new view.MutationObserver(sync);
  let currentHass;
  let scopedHass;
  let card;
  let request;
  let retryTimer;
  let attempts = 0;
  let failed = false;
  let disposed = false;
  let leftPage = false;

  function active() {
    leftPage ||= view.location.pathname !== pathname;
    return !disposed && !leftPage && slot.isConnected && dialog.open && !dialog.hasAttribute('data-closing');
  }

  function ready() {
    return typeof currentHass?.callService === 'function' &&
      READ_SERVICES.every(service => Object.hasOwn(currentHass.services?.oref_alert ?? EMPTY, service)) &&
      Boolean(view.customElements.get(TAG)) && typeof view.loadCardHelpers === 'function';
  }

  function remove() {
    request = undefined;
    card?.remove();
    card = scopedHass = undefined;
    fallback.textContent = unavailableText;
    fallback.hidden = false;
  }

  function cancelRetry() {
    if (retryTimer === undefined) return;
    view.clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  function assignHass() {
    if (!card || scopedHass === currentHass) return;
    scopedHass = currentHass;
    const attached = card;
    const reachable = () => active() && card === attached && attached.isConnected;
    attached.hass = mapHass(currentHass, reachable, error => {
      if (!reachable()) return;
      remove();
      const code = error?.error?.code ?? error?.code ?? error;
      if (!TRANSIENT_READ_CODES.has(code) || attempts >= RETRY_DELAYS.length || !ready()) {
        failed = true;
        return;
      }
      retryTimer = view.setTimeout(() => {
        retryTimer = undefined;
        if (!active()) return;
        if (!ready()) {
          failed = true;
          return;
        }
        sync();
      }, RETRY_DELAYS[attempts++]);
    });
  }

  function sync() {
    if (!active() || !ready()) {
      if (retryTimer !== undefined) {
        cancelRetry();
        failed = true;
      }
      remove();
      return;
    }
    if (card) {
      assignHass();
      return;
    }
    if (request || retryTimer !== undefined || failed) return;
    const pending = {};
    request = pending;
    fallback.textContent = loadingText;
    void (async () => {
      try {
        const helpers = await view.loadCardHelpers();
        if (request !== pending || !active() || !ready()) return;
        const element = await helpers?.createCardElement(cardConfig(options));
        if (request !== pending || !active() || !ready()) return;
        if (element?.localName !== TAG) {
          failed = true;
          remove();
          return;
        }
        card = element;
        slot.append(card);
        assignHass();
        fallback.hidden = Boolean(card);
      } catch {
        if (request === pending) {
          failed = true;
          remove();
        }
      } finally {
        if (request === pending) request = undefined;
      }
    })();
  }

  // Modern Home Assistant cards consume Lit contexts rather than card.hass.
  // Only the map subtree sees the public regional center and empty entity data.
  slot.addEventListener('context-request', event => {
    if (!CONTEXTS.has(event.context) || typeof event.callback !== 'function') return;
    event.stopPropagation();
    event.callback(CONTEXTS.get(event.context));
  }, { signal: events.signal });
  for (const event of ['location-changed', 'popstate']) {
    view.addEventListener(event, sync, { signal: events.signal });
  }
  view.navigation?.addEventListener('currententrychange', sync, { signal: events.signal });
  observer.observe(dialog, { attributes: true, attributeFilter: ['open', 'data-closing'] });

  return {
    update(hass) {
      currentHass = hass;
      sync();
    },
    dispose() {
      disposed = true;
      events.abort();
      observer.disconnect();
      cancelRetry();
      remove();
    },
  };
}
