import { MORE_INFO_DIALOG, sameMoreInfoPage } from './native-more-info.js';

const fragmentPattern = /^#[a-z0-9_.\-/]{1,511}$/i;
const roomPattern = /^#room-([a-z0-9][a-z0-9_-]*)$/i;
const devicePattern = /^#device\/([a-zA-Z0-9][a-zA-Z0-9_-]*)\/([a-z0-9_]+\.[a-z0-9_]+)(?:\/(schedule))?$/;
const panelPattern = /^#panel\/([a-z0-9][a-z0-9_-]*)$/i;
const navigationEvents = ['location-changed', 'hashchange', 'popstate'];
const roomReturnTimeout = 350;
const roomHandoffs = new WeakMap();
const roomHandoffTimeout = 1000;
let roomEntryId = 0;

export function isPopupFragment(fragment) {
  return typeof fragment === 'string' && fragmentPattern.exec(fragment)?.[0] === fragment;
}

export function createPopupRouteId(prefix, taken) {
  // A deleted room or screen may still have bookmarks. Avoid recycling its identity.
  let id;
  do {
    const entropy = crypto.getRandomValues(new Uint32Array(3));
    id = prefix + Array.from(entropy, part => part.toString(16).padStart(8, '0')).join('');
  } while (taken.has(id));
  return id;
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

export function isPopupAliasCloseRoute(source, target) {
  return source?.kind === 'device' && source.room === target?.room &&
    (target.kind === 'room' || (source.detail === 'schedule' && target.kind === 'device' &&
      !target.detail && source.entity === target.entity));
}

export function normalizePopupAliasCloseRoutes(config, aliases) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {};
  return Object.fromEntries(Object.entries(config).filter(([alias, target]) => {
    if (!Object.hasOwn(aliases, alias) || !isPopupFragment(target)) return false;
    const source = parsePopupRoute(aliases[alias]);
    const destination = parsePopupRoute(Object.hasOwn(aliases, target) ? aliases[target] : target);
    return isPopupAliasCloseRoute(source, destination);
  }));
}

export function createPopupHistory({ view, resolve, onChange, pathname = view.location.pathname, scope }) {
  const roomEntries = new Map();
  let listening = false;
  let observed;
  let observedHref;
  let linkedEntry;
  let canReturn;
  let returning;
  const withinView = () => view.location.pathname === pathname;
  const isCurrent = link => view.location.href === link.href && view.history.state?.bayit9RoomEntry === link.id &&
    view.history.state?.dialog !== MORE_INFO_DIALOG;

  function takeRoomHandoff() {
    if (!scope) return;
    const handoff = roomHandoffs.get(view);
    if (handoff?.scope !== scope || handoff.pathname !== pathname) return;
    roomHandoffs.delete(view);
    view.clearTimeout(handoff.timeout);
    const { entry } = handoff;
    // Only the same browser history entry can survive a redraw of this dashboard.
    if (!isCurrent(entry)) return;
    roomEntries.set(entry.id, entry);
    linkedEntry = entry;
    canReturn = true;
  }

  function keepRoomHandoff() {
    if (!scope || !canReturn || !linkedEntry || !withinView() || !isCurrent(linkedEntry)) return;
    const previous = roomHandoffs.get(view);
    view.clearTimeout(previous?.timeout);
    const handoff = { scope, pathname, entry: linkedEntry };
    handoff.timeout = view.setTimeout(() => {
      if (roomHandoffs.get(view) === handoff) roomHandoffs.delete(view);
    }, roomHandoffTimeout);
    roomHandoffs.set(view, handoff);
  }

  function cancelReturn() {
    if (returning) view.clearTimeout(returning.timer);
    returning = undefined;
  }

  function sync(reason = 'location', source) {
    if (!listening) return;
    const { pathname, hash } = view.location;
    const href = view.location.href;
    const inScope = withinView();
    const route = inScope ? resolve(hash) : null;
    const previousLink = linkedEntry;
    const recorded = roomEntries.get(view.history.state?.bayit9RoomEntry);
    const nativeChild = previousLink && view.history.state?.dialog === MORE_INFO_DIALOG &&
      sameMoreInfoPage(href, previousLink.href);
    linkedEntry = recorded && isCurrent(recorded) ? recorded : nativeChild ? previousLink : undefined;
    // Retain return authority from the exact room, or through its native details dialog.
    canReturn = Boolean(linkedEntry && (observedHref === linkedEntry.previous || (canReturn && previousLink === linkedEntry)));
    observedHref = href;
    if (previousLink && !linkedEntry && inScope && hash === previousLink.hash) roomEntries.delete(previousLink.id);
    const returningLink = returning?.link ?? previousLink;
    if (returningLink && !isCurrent(returningLink)) {
      if (href === returningLink.previous && route?.kind === 'room' && route.room === returningLink.room) {
        reason = returning ? 'room-return' : 'browser-room-return';
        source = returning?.source ?? returningLink.entity;
      }
      cancelReturn();
    }
    const identity = JSON.stringify([pathname, hash, popupRouteFragment(route), linkedEntry?.id]);
    if (identity === observed) return;
    observed = identity;
    const roomLink = route && linkedEntry && isCurrent(linkedEntry) ? linkedEntry : undefined;
    onChange({ route, hash, inScope, reason, source,
      ...(roomLink && { roomLink: { room:roomLink.room, entity:roomLink.entity } }) });
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
      takeRoomHandoff();
      for (const event of navigationEvents) view.addEventListener(event, onLocation);
      sync('initial');
    },
    refresh() { sync(); },
    stop({ handoff = false } = {}) {
      if (!listening) return;
      if (handoff) keepRoomHandoff();
      listening = false;
      observed = undefined;
      observedHref = undefined;
      linkedEntry = undefined;
      canReturn = false;
      roomEntries.clear();
      cancelReturn();
      for (const event of navigationEvents) view.removeEventListener(event, onLocation);
    },
    open(route, { replace = false, source, fromRoom, fromEntity } = {}) {
      const hash = popupRouteFragment(route);
      if (!listening || !withinView() || !hash || hash === view.location.hash ||
          popupRouteFragment(resolve(hash)) !== hash) return false;
      cancelReturn();
      if (replace && linkedEntry) roomEntries.delete(linkedEntry.id);
      linkedEntry = undefined;
      const parent = fromRoom && resolve(view.location.hash);
      if (!replace && route.kind !== 'room' && parent?.kind === 'room' && parent.room === fromRoom) {
        const previous = view.location.href;
        const href = new URL(hash, previous).href;
        linkedEntry = { id: ++roomEntryId, hash, href, previous, room:fromRoom, entity:fromEntity ?? route.entity };
        roomEntries.set(linkedEntry.id, linkedEntry);
      }
      write(hash, replace, 'open', source, linkedEntry ? { bayit9RoomEntry: linkedEntry.id } : null);
      return true;
    },
    backToRoom(room, { source, fallback }) {
      if (returning) return true;
      if (!listening || !withinView() || !canReturn || !linkedEntry || linkedEntry.room !== room || !isCurrent(linkedEntry)) return false;
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
    close(expectedHash = view.location.hash, targetHash) {
      if (!listening || !withinView() || expectedHash !== view.location.hash) return false;
      const source = resolve(expectedHash);
      if (!source || (targetHash !== undefined &&
          (!isPopupFragment(targetHash) || !isPopupAliasCloseRoute(source, resolve(targetHash))))) return false;
      if (linkedEntry) roomEntries.delete(linkedEntry.id);
      linkedEntry = undefined;
      cancelReturn();
      write(targetHash ?? '', true, targetHash ? 'alias-close' : 'close');
      return true;
    },
  };
}
