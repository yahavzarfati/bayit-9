const strings = {
  en: {
    title: 'Find rooms and devices',
    search: 'Search rooms and devices',
    clear: 'Clear search',
    all: 'All',
    rooms: 'Rooms',
    devices: 'Devices',
    favorites: 'Favorites',
    favorite: 'Favorite',
    filter: 'Filter search results',
    pin: 'Add to favorites',
    unpin: 'Remove from favorites',
    none: 'No rooms or devices to display.',
    noMatches: 'No matching rooms or devices.',
    noFavorites: 'Use the star beside a room or device to save it here.',
    unavailable: 'Unavailable',
    showMore: 'Show more',
    count: '{count} results',
    categories: {
      light: 'Lights', cover: 'Covers', climate: 'Climate', heater: 'Heaters', boiler: 'Water heaters',
      switch: 'Switches', fan: 'Fans', lock: 'Locks', vacuum: 'Vacuums', camera: 'Cameras',
      sensor: 'Sensors', binary_sensor: 'Sensors', media_player: 'Media', script: 'Scripts',
      scene: 'Scenes', automation: 'Automations', water_heater: 'Water heaters', other: 'Other devices',
    },
  },
  he: {
    title: 'חיפוש חדרים ומכשירים',
    search: 'חיפוש חדר או מכשיר',
    clear: 'ניקוי החיפוש',
    all: 'הכול',
    rooms: 'חדרים',
    devices: 'מכשירים',
    favorites: 'מועדפים',
    favorite: 'מועדף',
    filter: 'סינון התוצאות',
    pin: 'הוספה למועדפים',
    unpin: 'הסרה מהמועדפים',
    none: 'אין חדרים או מכשירים להצגה.',
    noMatches: 'לא נמצאו חדרים או מכשירים מתאימים.',
    noFavorites: 'לחצו על הכוכב לצד חדר או מכשיר כדי לשמור אותו כאן.',
    unavailable: 'לא זמין',
    showMore: 'הצגת פריטים נוספים',
    count: '{count} תוצאות',
    categories: {
      light: 'תאורה', cover: 'תריסים ווילונות', climate: 'מיזוג', heater: 'תנורי חימום', boiler: 'דודי מים',
      switch: 'מתגים', fan: 'מאווררים', lock: 'מנעולים', vacuum: 'שואבים', camera: 'מצלמות',
      sensor: 'חיישנים', binary_sensor: 'חיישנים', media_player: 'מדיה', script: 'תסריטים',
      scene: 'סצנות', automation: 'אוטומציות', water_heater: 'דודי מים', other: 'מכשירים נוספים',
    },
  },
};

const finderStrings = locale => strings[/^he(?:-|$)/i.test(locale) ? 'he' : 'en'];
export const finderTitle = locale => finderStrings(locale).title;

const roomId = /^[a-z0-9][a-z0-9_-]*$/i;
const entityId = /^[a-z0-9_]+[.][a-z0-9_]+$/;
const favoritePath = /^(?:room\/[a-z0-9][a-z0-9_-]*|device\/[a-z0-9][a-z0-9_-]*\/[a-z0-9_]+[.][a-z0-9_]+)$/i;
const maxFavorites = 100;
const pageSize = 24;
const filters = ['all', 'rooms', 'devices', 'favorites'];
const roomKey = room => 'room/' + room;
const deviceKey = (room, entity) => 'device/' + room + '/' + entity;
const cleanText = value => typeof value === 'string' ? value.trim() : '';
const keywordText = value => Array.isArray(value) ? value.map(cleanText).filter(Boolean).join(' ') : cleanText(value);

function searchText(value) {
  return value.normalize('NFD').toLowerCase().replace(/\p{M}/gu, '')
    .replace(/['"׳״’‘“”]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function entryCategory(device) {
  if (device.kind === 'heater') return 'heater';
  if (device.kind === 'boiler' || device.entity.startsWith('water_heater.')) return 'boiler';
  if (device.entity.startsWith('binary_sensor.')) return 'sensor';
  return device.entity.split('.')[0];
}

export function indexFinderEntries(inventory = {}, locale) {
  const words = finderStrings(locale);
  const rooms = new Map();
  for (const raw of inventory.rooms ?? []) {
    const id = cleanText(raw?.id);
    const name = cleanText(raw?.name);
    if (!roomId.test(id) || !name || rooms.has(id)) continue;
    rooms.set(id, { key: roomKey(id), room: id, name, icon: raw.icon, type: 'room',
      search: searchText([name, id, keywordText(raw.keywords)].join(' ')) });
  }

  const entries = [...rooms.values()];
  const known = new Set();
  for (const raw of inventory.devices ?? []) {
    const room = rooms.get(raw?.room);
    const entity = cleanText(raw?.entity);
    const name = cleanText(raw?.name);
    if (!room || !entityId.test(entity) || !name) continue;
    const key = deviceKey(room.room, entity);
    if (known.has(key)) continue;
    known.add(key);
    const kind = entryCategory({ ...raw, entity });
    const category = Object.hasOwn(words.categories, kind) ? words.categories[kind] : words.categories.other;
    entries.push({ key, type: 'device', room: room.room, roomName: room.name, entity, name, icon: raw.icon,
      category, available: raw.available !== false,
      search: searchText([name, room.search, category, entity, keywordText(raw.keywords)].join(' ')) });
  }
  return entries;
}

export function filterFinderEntries(entries, { query = '', filter = 'all', favorites = new Set() } = {}) {
  const tokens = searchText(query).split(' ').filter(Boolean);
  return entries.filter(entry => {
    if ((filter === 'rooms' && entry.type !== 'room') ||
        (filter === 'devices' && entry.type !== 'device') ||
        (filter === 'favorites' && !favorites.has(entry.key))) return false;
    return tokens.every(token => entry.search.includes(token) ||
      (/^[בלמכהוש][א-ת]{3,}$/.test(token) && entry.search.includes(token.slice(1))));
  });
}

export function finderFavoritesStorageKey(scope, userId) {
  return typeof scope === 'string' && scope.length && typeof userId === 'string' && userId.length
    ? 'bayit9/finder-favorites/1/' + JSON.stringify([scope, userId]) : undefined;
}

export function readFinderFavorites(value) {
  try {
    const data = JSON.parse(value);
    return new Set(Array.isArray(data)
      ? data.filter(key => typeof key === 'string' && key.length <= 300 && favoritePath.test(key)).slice(0, maxFavorites)
      : []);
  } catch {
    return new Set();
  }
}

const styles = `
  .device-finder {
    display: grid; gap: 10px; padding: 2px;
    color: var(--ink, #fff);
  }
  .device-finder button, .device-finder input { font: inherit; color: inherit; }
  .device-finder button { min-inline-size: 0; border: 0; background: none; border-radius: 12px; }
  .device-finder button:focus-visible, .device-finder input:focus-visible {
    outline: 2px solid currentColor; outline-offset: -3px;
  }
  .device-finder-search, .device-finder-filters, .device-finder-row, .device-finder-more {
    border: 1px solid var(--soft-line, currentColor);
    border-radius: 16px;
  }
  .device-finder-search {
    display: grid; grid-template-columns: auto minmax(0, 1fr) 44px; align-items: center;
    padding-inline-start: 12px;
  }
  .device-finder-search input {
    appearance: none; width: 100%; min-block-size: 46px; border: 0; background: transparent;
    padding: 0 8px; font-size: 16px; border-radius: 9px;
  }
  .device-finder-search input::placeholder { color: var(--secondary, currentColor); opacity: 1; }
  .device-finder-search input::-webkit-search-cancel-button { appearance: none; }
  .device-finder :is(.device-finder-clear,.device-finder-pin) {
    display: grid; place-items: center; padding: 0; inline-size: 44px; min-block-size: 44px;
  }
  .device-finder-filters {
    display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); padding: 2px; gap: 1px;
  }
  .device-finder-filters button {
    min-block-size: 44px; padding: 2px 1px; font-size: .88em; overflow-wrap: anywhere;
  }
  .device-finder :is(.device-finder-filters button,.device-finder-pin)[aria-pressed=true] { color: var(--warm, #ffdf92); }
  .device-finder-filters button[aria-pressed=true] { box-shadow: inset 0 0 0 1px var(--line, currentColor); font-weight: 700; }
  .device-finder-filters button[aria-pressed=false], .device-finder-subtitle { color: var(--secondary, currentColor); }
  .device-finder-results, .device-finder-section { display: grid; gap: 8px; }
  .device-finder-section h3, .device-finder-section h4 {
    margin: 5px 4px 0; font-size: .94em; font-weight: 700;
  }
  .device-finder-section h4 { font-weight: 600; color: var(--secondary, currentColor); }
  .device-finder-list { display: grid; gap: 5px; list-style: none; margin: 0; padding: 0; }
  .device-finder-row { display: grid; grid-template-columns: minmax(0, 1fr) 44px; align-items: center; }
  .device-finder .device-finder-open {
    display: flex; align-items: center; text-align: start; gap: 9px; min-block-size: 48px; padding: 5px 10px;
  }
  .device-finder-caption { display: grid; min-inline-size: 0; gap: 1px; }
  .device-finder-caption > span { overflow-wrap: anywhere; min-inline-size: 0; }
  .device-finder-subtitle { font-size: .84em; }
  .device-finder-open > ha-icon, .device-finder-clear > ha-icon, .device-finder-pin > ha-icon { pointer-events: none; }
  .device-finder .device-finder-more {
    border: 1px solid var(--soft-line, currentColor); border-radius: 12px; min-block-size: 44px; padding: 4px 10px;
  }
  .device-finder-empty { margin: 0; text-align: center; color: var(--secondary, currentColor); padding: 12px; }
  .device-finder-count {
    position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
  }
  @media (hover: hover) {
    .device-finder button:hover { background: var(--control, transparent); }
  }
  @media (forced-colors: active) {
    .device-finder-filters button[aria-pressed=true] { outline: 1px solid currentColor; outline-offset: -2px; }
  }
`;

export function createDeviceFinder({ ownerDocument, locale, scope, userId, state, getEntries, onRoom, onDevice }) {
  const view = ownerDocument.defaultView;
  const words = finderStrings(locale);
  const make = (tag, className, text) => {
    const node = ownerDocument.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const icon = name => {
    const node = make('ha-icon');
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('icon', name);
    return node;
  };
  const button = (className, text) => {
    const node = make('button', className, text);
    node.type = 'button';
    return node;
  };

  const element = make('section', 'device-finder');
  const style = make('style', '', styles);
  const search = make('div', 'device-finder-search');
  const input = make('input');
  input.type = 'search';
  input.value = state?.query ?? '';
  input.placeholder = words.search;
  input.setAttribute('aria-label', words.search);
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.enterKeyHint = 'search';
  const clear = button('device-finder-clear');
  clear.setAttribute('aria-label', words.clear);
  clear.append(icon('mdi:close'));
  clear.hidden = true;
  search.append(icon('mdi:magnify'), input, clear);

  const tabs = make('div', 'device-finder-filters');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', words.filter);
  const tabButtons = new Map();
  for (const key of filters) {
    const tab = button('', words[key]);
    tab.addEventListener('click', () => {
      mode = key;
      limit = pageSize;
      render();
    });
    tabButtons.set(key, tab);
    tabs.append(tab);
  }

  const count = make('p', 'device-finder-count');
  count.setAttribute('aria-live', 'polite');
  count.setAttribute('aria-atomic', 'true');
  const results = make('div', 'device-finder-results');
  element.append(style, search, tabs, count, results);

  const storageKey = finderFavoritesStorageKey(scope, userId);
  let stored;
  try { if (storageKey) stored = view?.localStorage.getItem(storageKey); } catch {}
  let favorites = readFinderFavorites(stored);
  let entries = [];
  let signature;
  let mode = filters.includes(state?.mode) ? state.mode : 'all';
  let limit = state?.limit ?? pageSize;
  let disposed = false;

  function focusTarget(target) {
    target?.focus({ preventScroll: true });
  }

  function updatePin(control, entry) {
    const favorited = favorites.has(entry.key);
    const name = entry.type === 'device' ? entry.name + ' · ' + entry.roomName : entry.name;
    control.setAttribute('aria-label', words.favorite + ' · ' + name);
    control.title = favorited ? words.unpin : words.pin;
    control.setAttribute('aria-pressed', String(favorited));
    control.firstChild.setAttribute('icon', favorited ? 'mdi:star' : 'mdi:star-outline');
    control.disabled = !favorited && favorites.size >= maxFavorites;
  }

  function entryRow(entry, focusables) {
    const row = make('li', 'device-finder-row');
    const open = button('device-finder-open');
    const caption = make('span', 'device-finder-caption');
    const name = make('span', '', entry.name);
    name.dir = 'auto';
    caption.append(name);
    if (entry.type === 'device') {
      const subtitle = make('span', 'device-finder-subtitle', entry.roomName +
        (entry.available ? '' : ' · ' + words.unavailable));
      subtitle.dir = 'auto';
      caption.append(subtitle);
    }
    open.append(icon(entry.icon || (entry.type === 'room' ? 'mdi:door-open' : 'mdi:information-outline')), caption);
    open.addEventListener('click', () => {
      if (disposed) return;
      if (entry.type === 'room') onRoom(entry.room, open);
      else onDevice(entry.room, entry.entity, open);
    });
    const pin = button('device-finder-pin');
    pin.append(icon('mdi:star-outline'));
    updatePin(pin, entry);
    pin.addEventListener('click', () => {
      if (disposed) return;
      if (favorites.has(entry.key)) favorites.delete(entry.key);
      else if (favorites.size < maxFavorites) favorites.add(entry.key);
      else return;
      try { if (storageKey) view?.localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch {}
      render();
    });
    for (const [action, control] of [['open', open], ['pin', pin]]) {
      const key = entry.key + '/' + action;
      control.dataset.finderFocus = key;
      focusables.set(key, control);
    }
    row.append(open, pin);
    return row;
  }

  function render() {
    if (disposed) return;
    clear.hidden = !input.value;
    for (const [key, tab] of tabButtons) tab.setAttribute('aria-pressed', String(key === mode));

    const active = element.getRootNode().activeElement;
    const previousFocus = results.contains(active) ? active.dataset.finderFocus : undefined;
    const focusables = new Map();
    const matched = filterFinderEntries(entries, { query: input.value, filter: mode, favorites });
    const liveText = words.count.replace('{count}', String(matched.length));
    if (count.textContent !== liveText) count.textContent = liveText;
    const nextResults = ownerDocument.createDocumentFragment();

    function addList(parent, members) {
      const list = make('ul', 'device-finder-list');
      for (const entry of members) list.append(entryRow(entry, focusables));
      parent.append(list);
    }

    const visible = matched.slice(0, limit);
    const rooms = visible.filter(entry => entry.type === 'room');
    const devices = visible.filter(entry => entry.type === 'device');
    if (rooms.length) {
      const section = make('section', 'device-finder-section');
      if (mode !== 'rooms') section.append(make('h3', '', words.rooms));
      addList(section, rooms);
      nextResults.append(section);
    }
    if (devices.length) {
      const section = make('section', 'device-finder-section');
      if (mode !== 'devices') section.append(make('h3', '', words.devices));
      const categories = new Map();
      for (const entry of devices) {
        if (!categories.has(entry.category)) categories.set(entry.category, []);
        categories.get(entry.category).push(entry);
      }
      for (const [category, members] of categories) {
        section.append(make(mode === 'devices' ? 'h3' : 'h4', '', category));
        addList(section, members);
      }
      nextResults.append(section);
    }
    if (!matched.length) {
      const empty = input.value.trim() ? words.noMatches : mode === 'favorites' ? words.noFavorites : words.none;
      nextResults.append(make('p', 'device-finder-empty', empty));
    }
    if (visible.length < matched.length) {
      const more = button('device-finder-more', words.showMore);
      more.dataset.finderFocus = 'more';
      focusables.set('more', more);
      more.addEventListener('click', () => {
        limit += pageSize;
        render();
      });
      nextResults.append(more);
    }
    results.replaceChildren(nextResults);
    if (previousFocus) focusTarget(focusables.get(previousFocus) || tabButtons.get(mode));
  }

  function refresh() {
    if (disposed) return;
    const next = indexFinderEntries(getEntries(), locale);
    const nextSignature = JSON.stringify(next);
    if (nextSignature === signature) return;
    signature = nextSignature;
    entries = next;
    render();
  }

  const syncFavorites = event => {
    if (event.key !== storageKey && event.key !== null) return;
    favorites = readFinderFavorites(event.newValue);
    render();
  };

  input.addEventListener('input', () => {
    limit = pageSize;
    render();
  });
  clear.addEventListener('click', () => {
    input.value = '';
    limit = pageSize;
    render();
    focusTarget(input);
  });
  if (storageKey) view?.addEventListener('storage', syncFavorites);
  refresh();

  return {
    element,
    refresh,
    focus: () => focusTarget(input),
    snapshot: () => ({ query: input.value, mode, limit, focused: element.getRootNode().activeElement === input }),
    dispose() {
      disposed = true;
      if (storageKey) view?.removeEventListener('storage', syncFavorites);
    },
  };
}
