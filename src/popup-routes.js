const fragmentPattern = /^#[a-z0-9_.\-/]{1,511}$/i;
const roomPattern = /^#room-([a-z0-9][a-z0-9_-]*)$/i;
const devicePattern = /^#device\/([a-zA-Z0-9][a-zA-Z0-9_-]*)\/([a-z0-9_]+\.[a-z0-9_]+)$/;
const panelPattern = /^#panel\/([a-z0-9][a-z0-9_-]*)$/i;
const navigationEvents = ['location-changed', 'hashchange', 'popstate'];

function validFragment(fragment) {
  return typeof fragment === 'string' && fragmentPattern.exec(fragment)?.[0] === fragment;
}

export function parsePopupRoute(fragment) {
  if (!validFragment(fragment)) return null;
  const room = roomPattern.exec(fragment);
  if (room) return { kind: 'room', room: room[1] };
  const device = devicePattern.exec(fragment);
  if (device) return { kind: 'device', room: device[1], entity: device[2] };
  const panel = panelPattern.exec(fragment);
  if (panel) return { kind: 'panel', panel: panel[1] };
  return null;
}

export function popupRouteFragment(route) {
  if (route?.kind === 'room' && typeof route.room === 'string' && route.room) {
    const hash = '#room-' + route.room;
    return roomPattern.test(hash) && validFragment(hash) ? hash : '';
  }
  if (route?.kind === 'device' && typeof route.room === 'string' && typeof route.entity === 'string') {
    const hash = '#device/' + route.room + '/' + route.entity;
    const parsed = parsePopupRoute(hash);
    return parsed?.room === route.room && parsed.entity === route.entity ? hash : '';
  }
  if (route?.kind === 'panel' && typeof route.panel === 'string' && route.panel) {
    const hash = '#panel/' + route.panel;
    return panelPattern.test(hash) && validFragment(hash) ? hash : '';
  }
  return '';
}

export function resolvePopupRoute(fragment, admit, aliases) {
  if (!validFragment(fragment)) return null;
  const direct = parsePopupRoute(fragment);
  if (direct && admit(direct)) return direct;
  // Alias values are canonical destinations. They do not traverse other aliases.
  const alias = parsePopupRoute(aliases?.get(fragment));
  return alias && admit(alias) ? alias : null;
}

export function normalizePopupAliases(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {};
  return Object.fromEntries(Object.entries(config).filter(([alias, target]) =>
    validFragment(alias) && parsePopupRoute(target) && alias !== target).slice(0, 128));
}

export function createPopupHistory({ view, resolve, onChange, pathname = view.location.pathname }) {
  let listening = false;
  let observed;
  const withinView = () => view.location.pathname === pathname;

  function sync(reason = 'location', source) {
    if (!listening) return;
    const { pathname, hash } = view.location;
    const inScope = withinView();
    const route = inScope ? resolve(hash) : null;
    const identity = JSON.stringify([pathname, hash, popupRouteFragment(route)]);
    if (identity === observed) return;
    observed = identity;
    onChange({ route, hash, inScope, reason, source });
  }
  const onLocation = () => sync();

  function write(hash, replace, reason, source) {
    const next = view.location.pathname + view.location.search + hash;
    if (replace) view.history.replaceState(view.history.state, '', next);
    else view.history.pushState(null, '', next);
    sync(reason, source);
    view.dispatchEvent(new view.CustomEvent('location-changed', { detail: { replace, source: 'bayit9-popup' } }));
  }

  return {
    start() {
      if (listening) return;
      listening = true;
      for (const event of navigationEvents) view.addEventListener(event, onLocation);
      sync('initial');
    },
    refresh() { sync(); },
    stop() {
      if (!listening) return;
      listening = false;
      observed = undefined;
      for (const event of navigationEvents) view.removeEventListener(event, onLocation);
    },
    open(route, { replace = false, source } = {}) {
      const hash = popupRouteFragment(route);
      if (!listening || !withinView() || !hash || hash === view.location.hash ||
          popupRouteFragment(resolve(hash)) !== hash) return false;
      write(hash, replace, 'open', source);
      return true;
    },
    close(expectedHash = view.location.hash) {
      if (!listening || !withinView() || expectedHash !== view.location.hash || !resolve(expectedHash)) return false;
      write('', true, 'close');
      return true;
    },
  };
}
