import { MORE_INFO_DIALOG, sameMoreInfoPage } from './native-more-info.js';

const fragmentPattern = /^#[a-z0-9_.\-/]{1,511}$/i;
const roomPattern = /^#room-([a-z0-9][a-z0-9_-]*)$/i;
const devicePattern = /^#device\/([a-zA-Z0-9][a-zA-Z0-9_-]*)\/([a-z0-9_]+\.[a-z0-9_]+)(?:\/(schedule))?$/;
const panelPattern = /^#panel\/([a-z0-9][a-z0-9_-]*)$/i;
const navigationEvents = ['location-changed', 'hashchange', 'popstate'];
const roomReturnTimeout = 350;
let roomEntryId = 0;

export function isPopupFragment(fragment) {
  return typeof fragment === 'string' && fragmentPattern.exec(fragment)?.[0] === fragment;
}

export function parsePopupRoute(fragment) {
  if (!isPopupFragment(fragment)) return null;
  const room = roomPattern.exec(fragment);
  if (room) return { kind: 'room', room: room[1] };
  const device = devicePattern.exec(fragment);
  if (device) return { kind: 'device', room: device[1], entity: device[2], ...(device[3] && { detail:device[3] }) };
  const panel = panelPattern.exec(fragment);
  if (panel) return { kind: 'panel', panel: panel[1] };
  return null;
}

export function popupRouteFragment(route) {
  if (route?.kind === 'room' && typeof route.room === 'string' && route.room) {
    const hash = '#room-' + route.room;
    return roomPattern.test(hash) && isPopupFragment(hash) ? hash : '';
  }
  if (route?.kind === 'device' && typeof route.room === 'string' && typeof route.entity === 'string') {
    const detail = route.detail;
    if (detail !== undefined && detail !== 'schedule') return '';
    const hash = '#device/' + route.room + '/' + route.entity + (detail ? '/' + detail : '');
    const parsed = parsePopupRoute(hash);
    return parsed?.room === route.room && parsed.entity === route.entity && parsed.detail === detail ? hash : '';
  }
  if (route?.kind === 'panel' && typeof route.panel === 'string' && route.panel) {
    const hash = '#panel/' + route.panel;
    return panelPattern.test(hash) && isPopupFragment(hash) ? hash : '';
  }
  return '';
}

export function resolvePopupRoute(fragment, admit, aliases) {
  if (!isPopupFragment(fragment)) return null;
  const direct = parsePopupRoute(fragment);
  if (direct && admit(direct)) return direct;
  // Alias values are canonical destinations. They do not traverse other aliases.
  const alias = parsePopupRoute(aliases?.get(fragment));
  return alias && admit(alias) ? alias : null;
}

export function normalizePopupAliases(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {};
  return Object.fromEntries(Object.entries(config).filter(([alias, target]) =>
    isPopupFragment(alias) && parsePopupRoute(target) && alias !== target).slice(0, 128));
}

export function createPopupHistory({ view, resolve, onChange, pathname = view.location.pathname }) {
  let listening = false;
  let observed;
  let linkedEntry;
  let returning;
  const withinView = () => view.location.pathname === pathname;
  const isCurrent = link => view.location.href === link.href && view.history.state?.bayit9RoomEntry === link.id;

  function cancelReturn() {
    if (returning) view.clearTimeout(returning.timer);
    returning = undefined;
  }

  function sync(reason = 'location', source) {
    if (!listening) return;
    const { pathname, hash } = view.location;
    const inScope = withinView();
    const route = inScope ? resolve(hash) : null;
    const nativeChild = linkedEntry && view.history.state?.dialog === MORE_INFO_DIALOG &&
      sameMoreInfoPage(view.location.href, linkedEntry.href);
    if (linkedEntry && !isCurrent(linkedEntry) && !nativeChild) linkedEntry = undefined;
    if (returning && !isCurrent(returning.link)) {
      if (view.location.href === returning.link.previous && route?.kind === 'room' && route.room === returning.link.room) {
        reason = 'room-return';
        source = returning.source;
      }
      cancelReturn();
    }
    const identity = JSON.stringify([pathname, hash, popupRouteFragment(route)]);
    if (identity === observed) return;
    observed = identity;
    onChange({ route, hash, inScope, reason, source });
  }
  const onLocation = () => sync();

  function write(hash, replace, reason, source, state = null) {
    const next = view.location.pathname + view.location.search + hash;
    if (replace) view.history.replaceState(view.history.state, '', next);
    else view.history.pushState(state, '', next);
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
      linkedEntry = undefined;
      cancelReturn();
      for (const event of navigationEvents) view.removeEventListener(event, onLocation);
    },
    open(route, { replace = false, source, fromRoom } = {}) {
      const hash = popupRouteFragment(route);
      if (!listening || !withinView() || !hash || hash === view.location.hash ||
          popupRouteFragment(resolve(hash)) !== hash) return false;
      cancelReturn();
      linkedEntry = undefined;
      const parent = fromRoom && resolve(view.location.hash);
      if (!replace && route.kind !== 'room' && parent?.kind === 'room' && parent.room === fromRoom) {
        const previous = view.location.href;
        const href = new URL(hash, previous).href;
        linkedEntry = { id: ++roomEntryId, href, previous, room: fromRoom };
      }
      write(hash, replace, 'open', source, linkedEntry ? { bayit9RoomEntry: linkedEntry.id } : null);
      return true;
    },
    backToRoom(room, { source, fallback }) {
      if (returning) return true;
      if (!listening || !withinView() || !linkedEntry || linkedEntry.room !== room || !isCurrent(linkedEntry)) return false;
      const link = linkedEntry;
      linkedEntry = undefined;
      const timer = view.setTimeout(() => {
        cancelReturn();
        if (isCurrent(link)) fallback();
      }, roomReturnTimeout);
      returning = { link, source, timer };
      try { view.history.back(); }
      catch {
        cancelReturn();
        return false;
      }
      return true;
    },
    close(expectedHash = view.location.hash) {
      if (!listening || !withinView() || expectedHash !== view.location.hash || !resolve(expectedHash)) return false;
      linkedEntry = undefined;
      cancelReturn();
      write('', true, 'close');
      return true;
    },
  };
}
