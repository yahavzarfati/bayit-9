import { BACKGROUNDS, CUSTOM_ROOM_PREFIX, dashboardRoomOptions, discoverRooms, languageFor, MAX_ROOM_SHORTCUTS, normalizeProfile, PROFILE_DOMAINS, selectableRoomEntities, STRATEGY_NAME } from './strategy-model.js';

const WORDS = {
  en: {
    title: 'Dashboard title', language: 'Language', automatic: 'Home Assistant language',
    areas: 'Rooms', unassigned: 'Include devices without a room',
    roomSelection: 'Rooms on the dashboard', allRooms: 'Automatic', selectedRooms: 'Choose rooms and order',
    roomToAdd: 'Available rooms', addRoom: 'Show room', createRoom: 'New dashboard-only room',
    newRoomName: 'New room name', newRoomHint: 'This room exists only on this dashboard.',
    roomName: 'Room display name', roomToEdit: 'Room to customize', roomIcon: 'Room icon', defaultRoomIcon: 'Default icon',
    newRoom: 'Create room', customRoom: 'Dashboard room', deleteRoom: 'Delete dashboard room',
    noRooms: 'No rooms to customize yet.',
    moveUp: 'Move up', moveDown: 'Move down', hideRoom: 'Hide room',
    automaticDevices: 'Automatic', manualDevices: 'Choose devices and order',
    roomDevices: 'Devices in this room', deviceToAdd: 'Available devices', addDevice: 'Add device',
    noDevices: 'No devices selected.', noMatches: 'No matching devices', missing: 'Unavailable',
    atLeastOneRoom: 'Keep one room selected, or switch back to automatic.',
    discovery: 'Automatic device selection', controls: 'Controls only', allDevices: 'All supported devices',
    appearance: 'Appearance', background: 'Wallpaper', layout: 'Room titles', shape: 'Button shape',
    classic: 'Alongside the controls', header: 'At the top', soft: 'Rounded', circle: 'Circle', square: 'Square',
    devices: 'Device visibility', hidden: 'Hide devices', included: 'Add other entities',
    overview: 'Home overview', overviewDevices: 'Devices and sensors to show',
    overviewHint: 'Choose devices for the overview button, such as a lock, people, a calendar or an energy sensor.',
    shortcuts: 'Room shortcuts', shortcutRoom: 'Room', automaticShortcuts: 'Choose shortcuts automatically',
    shortcut: 'Shortcut', shortcutHint: 'Pick up to six devices in display order. All devices remain available inside the room.',
    noShortcutRooms: 'Add a device to a visible room to set its shortcuts.',
    profiles: 'Boiler and heater controls', entity: 'Heating device', kind: 'Control profile',
    heater: 'Room heater', boiler: 'Water heater or boiler', displayName: 'Display name',
    start: 'Scheduled start script', stop: 'Stop script', timer: 'Timer', none: 'None',
    level: 'Heating level entity', durationField: 'Duration field', min: 'Shortest run in minutes', max: 'Longest run in minutes',
    step: 'Step in minutes', add: 'Add profile', save: 'Save profile', edit: 'Edit',
    remove: 'Remove', clear: 'Cancel', choose: 'Select a device',
    invalid: 'Select a heating device to save the profile.',
    hint: 'Select the Home Assistant entities that already control this device. Use a server-side start script for timed heating.',
    units: 'minutes', searchable: 'Filter entities',
  },
  he: {
    title: 'שם הדשבורד', language: 'שפה', automatic: 'שפת Home Assistant',
    areas: 'חדרים', unassigned: 'הצגת מכשירים ללא חדר',
    roomSelection: 'חדרים בדשבורד', allRooms: 'בחירה אוטומטית', selectedRooms: 'בחירת חדרים וסדר',
    roomToAdd: 'חדרים זמינים', addRoom: 'הצגת חדר', createRoom: 'חדר חדש לדשבורד',
    newRoomName: 'שם החדר החדש', newRoomHint: 'החדר יופיע בדשבורד הזה בלבד.',
    roomName: 'שם החדר לתצוגה', roomToEdit: 'חדר להתאמה אישית', roomIcon: 'סמל החדר', defaultRoomIcon: 'סמל ברירת המחדל',
    newRoom: 'יצירת חדר', customRoom: 'חדר בדשבורד', deleteRoom: 'מחיקת חדר מהדשבורד',
    noRooms: 'עדיין אין חדרים להתאמה.',
    moveUp: 'העברה למעלה', moveDown: 'העברה למטה', hideRoom: 'הסתרת חדר',
    automaticDevices: 'בחירה אוטומטית', manualDevices: 'בחירת מכשירים וסדר',
    roomDevices: 'מכשירים בחדר', deviceToAdd: 'מכשירים זמינים', addDevice: 'הוספת מכשיר',
    noDevices: 'לא נבחרו מכשירים.', noMatches: 'לא נמצאו מכשירים מתאימים', missing: 'לא זמין',
    atLeastOneRoom: 'השאירו חדר אחד לפחות, או חזרו לבחירה אוטומטית.',
    discovery: 'בחירת מכשירים אוטומטית', controls: 'מכשירים נשלטים בלבד', allDevices: 'כל המכשירים הנתמכים',
    appearance: 'מראה', background: 'רקע', layout: 'שמות חדרים', shape: 'צורת כפתורים',
    classic: 'לצד הכפתורים', header: 'בראש הכרטיס', soft: 'מעוגל', circle: 'עיגול', square: 'ריבוע',
    devices: 'הצגת מכשירים', hidden: 'הסתרת מכשירים', included: 'הוספת ישויות נוספות',
    overview: 'מבט על הבית', overviewDevices: 'מכשירים וחיישנים לתצוגה',
    overviewHint: 'בחרו מה יוצג במבט על הבית, למשל מנעול, אנשים, יומן או חיישן צריכת חשמל.',
    shortcuts: 'קיצורים בחדרים', shortcutRoom: 'חדר', automaticShortcuts: 'בחירת קיצורים אוטומטית',
    shortcut: 'קיצור', shortcutHint: 'אפשר לבחור עד שישה מכשירים לפי סדר התצוגה. כל המכשירים נשארים זמינים בתוך החדר.',
    noShortcutRooms: 'הוסיפו מכשיר לחדר שמוצג בדשבורד כדי לבחור קיצורים.',
    profiles: 'שליטה בדוד ובתנורים', entity: 'מכשיר חימום', kind: 'סוג בקר',
    heater: 'תנור חימום', boiler: 'דוד או מחמם מים', displayName: 'שם לתצוגה',
    start: 'סקריפט הפעלה עם זמן', stop: 'סקריפט כיבוי', timer: 'טיימר', none: 'ללא',
    level: 'ישות עוצמת חימום', durationField: 'שדה משך', min: 'זמן מינימלי בדקות', max: 'זמן מקסימלי בדקות',
    step: 'מרווח בחירה בדקות', add: 'הוספת בקר', save: 'שמירת בקר', edit: 'עריכה',
    remove: 'הסרה', clear: 'ביטול', choose: 'בחירת מכשיר',
    invalid: 'בחרו מכשיר חימום לפני השמירה.',
    hint: 'בחרו את הישויות שכבר שולטות במכשיר ב־Home Assistant. לחימום מתוזמן, השתמשו בסקריפט שפועל בשרת.',
    units: 'דקות', searchable: 'סינון ישויות',
  },
};

const ROOM_ICONS = {
  'mdi:home-outline': { en: 'Home', he: 'בית' },
  'mdi:sofa-outline': { en: 'Living room', he: 'סלון' },
  'mdi:stove': { en: 'Kitchen', he: 'מטבח' },
  'mdi:bed-outline': { en: 'Bedroom', he: 'חדר שינה' },
  'mdi:shower': { en: 'Bathroom', he: 'מקלחת' },
  'mdi:desk': { en: 'Office', he: 'משרד' },
  'mdi:toy-brick-outline': { en: 'Playroom', he: 'חדר משחקים' },
  'mdi:washing-machine': { en: 'Laundry', he: 'כביסה' },
  'mdi:garage-variant': { en: 'Garage', he: 'חניה' },
  'mdi:tree-outline': { en: 'Garden', he: 'גינה' },
  'mdi:floor-plan': { en: 'Hallway', he: 'מסדרון' },
  'mdi:door-open': { en: 'Entrance', he: 'כניסה' },
};

const CSS = '\
:host { display: block; color: var(--primary-text-color); }\
form { display: grid; gap: 14px; padding-block: 8px; }\
label.field { display: grid; gap: 6px; min-width: 0; font-weight: 600; }\
input:not([type=checkbox]),select { width: 100%; box-sizing: border-box; min-height: 44px; border: 1px solid var(--divider-color,#999); border-radius: 8px; padding: 8px 10px; font: inherit; color: inherit; background: var(--card-background-color,#fff); }\
input[type=checkbox] { inline-size: 18px; block-size: 18px; flex: none; margin-inline: 0 9px; }\
input,select,button,summary { accent-color: var(--primary-color,#03a9f4); }\
select[multiple] { min-height: 106px; }\
label.check { min-block-size: 42px; display: flex; align-items: center; }\
details,fieldset { border: 1px solid var(--divider-color,#999); border-radius: 10px; padding: 8px 12px 12px; min-inline-size: 0; }\
summary { padding-block: 8px; min-block-size: 24px; font-weight: 650; cursor: pointer; }\
.stack { display: grid; gap: 12px; margin-block-start: 8px; }\
.grid { display: grid; gap: 10px; grid-template-columns: repeat(2,minmax(0,1fr)); }\
.actions,.record { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }\
.record { padding-block: 5px; border-block-end: 1px solid var(--divider-color,#999); }\
.record span { flex: 1; overflow-wrap: anywhere; }\
button { min-height: 42px; border-radius: 8px; border: 1px solid var(--primary-color,#0277bd); color: var(--primary-text-color); background: var(--card-background-color,#fff); cursor: pointer; padding: 6px 10px; font: inherit; }\
[hidden] { display: none !important; }\
p { margin: 0; color: var(--secondary-text-color); font-size: .95em; }\
.error { color: var(--error-color,#b00020); }\
:focus-visible { outline: 2px solid var(--primary-color,#03a9f4); outline-offset: 2px; }\
@media (max-width: 340px) { .grid { grid-template-columns: minmax(0,1fr); } }';

const ROOM_CSS = `
.room-list { display: grid; margin: 0; padding: 0; list-style: none; }
.room-entry { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 6px; align-items: center; padding-block: 6px; border-block-end: 1px solid var(--divider-color,#999); }
.room-entry:last-child { border-block-end: 0; }
.room-entry-name { min-inline-size: 0; overflow-wrap: anywhere; }
.room-entry-name small { display: block; color: var(--secondary-text-color); font-size: .8em; margin-block-start: 2px; }
.room-entry-buttons { display: flex; gap: 4px; }
.room-entry-buttons button { min-inline-size: 44px; block-size: 44px; padding: 0 5px; }
.room-entry-buttons button:disabled, .room-add button:disabled { cursor: default; opacity: .45; }
.room-add { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; align-items: end; }
.room-add button { min-block-size: 44px; }
.room-choice-heading { margin: 3px 0 0; font-size: 1em; }
.room-picker-hint { margin-block-start: -5px; }
.room-icon-field { display: grid; grid-template-columns: minmax(0,1fr) 44px; gap: 8px; align-items: end; }
.room-icon-preview { box-sizing: border-box; inline-size: 44px; block-size: 44px; display: grid; place-items: center; border: 1px solid var(--divider-color,#999); border-radius: 8px; }
.room-danger { justify-self: start; color: var(--error-color,#b00020); border-color: currentColor; }
@media (max-width: 340px) {
  .room-add { grid-template-columns: minmax(0,1fr); }
  .room-add button { justify-self: start; }
}
`;

function hasStates(states) {
  for (const id in states ?? {}) {
    if (Object.hasOwn(states, id)) return true;
  }
  return false;
}

function configuredIds(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && id.trim()))] : [];
}

function moveItem(items, index, shift) {
  const copy = [...items];
  const next = index + shift;
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

function orderedList(items, change, words, removeLabel, protectLast = false, key = '') {
  return node('ul', { className: 'room-list' }, items.map((item, index) => {
    const action = (symbol, actionLabel, disabled, actionKey, handler) => {
      const control = button(symbol, handler);
      control.setAttribute('aria-label', actionLabel + ' · ' + item.name);
      control.title = actionLabel;
      control.disabled = disabled;
      control.dataset.roomFocus = key + ':' + item.id + ':' + actionKey;
      return control;
    };
    return node('li', { className: 'room-entry' }, [
      node('span', { className: 'room-entry-name' }, [
        item.name,
        ...(item.secondary ? [node('small', { textContent: item.secondary })] : []),
      ]),
      node('span', { className: 'room-entry-buttons' }, [
        action('↑', words.moveUp, index === 0, 'up', () => change(moveItem(items, index, -1), key + ':' + item.id + ':up')),
        action('↓', words.moveDown, index === items.length - 1, 'down', () => change(moveItem(items, index, 1), key + ':' + item.id + ':down')),
        action('×', removeLabel, protectLast && items.length === 1, 'remove', () =>
          change(items.filter(entry => entry.id !== item.id))),
      ]),
    ]);
  }));
}

function addPicker(label, options, actionLabel, emptyLabel, add) {
  const input = select([['', emptyLabel], ...options], '');
  const action = button(actionLabel, () => { if (input.value) add(input.value); });
  action.disabled = true;
  input.addEventListener('change', () => { action.disabled = !input.value; });
  return { input, action, wrapper: node('div', { className: 'room-add' }, [field(label, input), action]) };
}

function entityArea(hass, id) {
  const entry = hass.entities?.[id];
  const device = hass.devices?.[entry?.device_id ?? entry?.di];
  return entry?.area_id ?? entry?.ai ?? device?.area_id ?? device?.ai;
}

function node(name, properties = {}, children = []) {
  const element = Object.assign(document.createElement(name), properties);
  element.append(...children);
  return element;
}

function checkbox(text, checked, change) {
  const input = node('input', { type: 'checkbox', checked });
  input.addEventListener('change', () => change(input.checked));
  return node('label', { className: 'check' }, [input, text]);
}

function option(id, name) {
  return node('option', { value: id, textContent: name });
}

function select(opts, value) {
  const input = node('select', {}, opts.map(([id, name]) => option(id, name)));
  input.value = value;
  return input;
}

let nextLabel = 0;
function field(text, input) {
  const label = node('span', { id: 'bayit9-editor-label-' + ++nextLabel, textContent: text });
  input.setAttribute('aria-labelledby', label.id);
  return node('label', { className: 'field' }, [label, input]);
}

function button(text, click) {
  const item = node('button', { type: 'button', textContent: text });
  item.addEventListener('click', click);
  return item;
}

function entityOptions(hass, domains) {
  return Object.entries(hass.states ?? {})
    .filter(([id]) => !domains || domains.has(id.split('.')[0]))
    .map(([id, state]) => {
      const name = state.attributes?.friendly_name;
      return [id, name && name !== id ? name + ' · ' + id : id];
    })
    .sort((a, b) => a[1].localeCompare(b[1]));
}

function disclosure(text, open, onToggle, children) {
  const summary = node('summary', { textContent: text });
  const details = node('details', { open }, [summary, ...children]);
  summary.addEventListener('click', () => onToggle(!details.open));
  details.addEventListener('toggle', () => { if (details.isConnected) onToggle(details.open); });
  return details;
}

export class Bayit9StrategyEditor extends HTMLElement {
  #hass = {};
  #config = { type: 'custom:' + STRATEGY_NAME };
  #open = {};
  #profileEditing;
  #shortcutRoom;
  #roomEditing;
  #roomDeviceQuery = '';
  #newRoomName = '';
  #emptyRoomSelection = false;
  #lastConfig;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set hass(value) {
    const previous = this.#hass;
    this.#hass = value ?? {};
    if (previous.areas !== this.#hass.areas || previous.entities !== this.#hass.entities || previous.devices !== this.#hass.devices
        || (!hasStates(previous.states) && hasStates(this.#hass.states))
        || (previous.locale?.language ?? previous.language) !== (value?.locale?.language ?? value?.language)) {
      this.render();
    }
  }

  setConfig(config) {
    this.#config = { type: 'custom:' + STRATEGY_NAME, ...config };
    const serialized = JSON.stringify(this.#config);
    if (serialized !== this.#lastConfig) {
      this.#lastConfig = serialized;
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  #commit(change) {
    this.#config = { ...this.#config, ...change };
    this.#lastConfig = JSON.stringify(this.#config);
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.#config }, bubbles: true, composed: true,
    }));
  }

  #commitRooms(change, focusKey) {
    this.#commit(change);
    this.render();
    if (!focusKey) return;
    const matches = [...this.shadowRoot.querySelectorAll('[data-room-focus]')];
    const focus = matches.find(item => item.dataset.roomFocus === focusKey && !item.disabled)
      ?? matches.find(item => !item.disabled && item.dataset.roomFocus === focusKey.replace(/:(up|down)$/, (_, direction) => direction === 'up' ? ':down' : ':up'));
    focus?.focus({ preventScroll: true });
  }

  #roomOverride(room) {
    const list = this.#config.room_overrides ?? {};
    return Object.hasOwn(list, room) && list[room] && typeof list[room] === 'object' ? list[room] : {};
  }

  #setRoomOverride(room, override, focusKey) {
    const next = { ...this.#config.room_overrides };
    if (Object.keys(override).length) next[room] = override;
    else delete next[room];
    this.#commitRooms({ room_overrides: next }, focusKey);
  }

  #roomIconPicker(room, override, words, language) {
    const options = [['', words.defaultRoomIcon], ...Object.entries(ROOM_ICONS).map(([icon, names]) => [icon, names[language]])];
    const current = typeof override.icon === 'string' ? override.icon : '';
    if (current && !Object.hasOwn(ROOM_ICONS, current)) options.push([current, current]);
    const input = select(options, current);
    input.dataset.roomFocus = 'room-icon';
    input.addEventListener('change', () => {
      const next = { ...override };
      if (input.value) next.icon = input.value;
      else delete next.icon;
      this.#setRoomOverride(room.id, next, 'room-icon');
    });
    const preview = node('ha-icon');
    preview.setAttribute('icon', room.icon || 'mdi:home-outline');
    preview.setAttribute('aria-hidden', 'true');
    return node('div', { className: 'room-icon-field' }, [
      field(words.roomIcon, input), node('span', { className: 'room-icon-preview' }, [preview]),
    ]);
  }

  #roomDevicePanel(room, words, language, areas) {
    const override = this.#roomOverride(room.id);
    const manual = room.custom || Array.isArray(override.entities);
    const choice = select([['auto', words.automaticDevices], ['manual', words.manualDevices]], manual ? 'manual' : 'auto');
    choice.dataset.roomFocus = 'room-device-mode';
    choice.addEventListener('change', () => {
      const next = { ...override };
      if (choice.value === 'auto') delete next.entities;
      else {
        next.entities = discoverRooms({ ...this.#config, area_ids: [room.id] }, this.#hass, language)
          .find(item => item.id === room.id)?.entities.map(item => item.entity) ?? [];
      }
      this.#setRoomOverride(room.id, next, 'room-device-mode');
    });
    const children = room.custom
      ? [node('h4', { className: 'room-choice-heading', textContent: words.roomDevices })]
      : [field(words.roomDevices, choice)];
    if (!manual) return children;

    const areaNames = new Map(areas.map(area => [area.id, area.name]));
    const available = new Map(selectableRoomEntities(this.#config, this.#hass).map(entry => [entry.entity, entry]));
    const chosen = configuredIds(override.entities);
    const records = chosen.map(id => {
      const device = available.get(id);
      const previousName = this.#hass.states?.[id]?.attributes?.friendly_name;
      return { id, name: device?.name || previousName || id, secondary: device ? '' : words.missing };
    });
    const change = (items, focusKey) => this.#setRoomOverride(room.id, { ...override, entities: items.map(item => item.id) }, focusKey);
    children.push(records.length ? orderedList(records, change, words, words.remove, false, 'devices')
      : node('p', { textContent: words.noDevices }));

    const selected = new Set(chosen);
    const devices = [...available.values()].filter(device => !selected.has(device.entity)).map(device => ({
      id: device.entity, name: device.name || device.entity, area: entityArea(this.#hass, device.entity),
    }));
    devices.sort((a, b) => Number(b.area === room.id) - Number(a.area === room.id) || a.name.localeCompare(b.name, language));
    const nameCounts = new Map();
    for (const device of devices) nameCounts.set(device.name, (nameCounts.get(device.name) ?? 0) + 1);

    const picker = addPicker(words.deviceToAdd, [], words.addDevice, words.choose, id => {
      this.#setRoomOverride(room.id, { ...override, entities: [...chosen, id] }, 'room-device-picker');
    });
    picker.input.dataset.roomFocus = 'room-device-picker';
    const filter = node('input', { type: 'search', placeholder: words.searchable, value: this.#roomDeviceQuery });
    filter.dataset.roomFocus = 'room-device-search';
    const refresh = () => {
      const query = filter.value.trim().toLocaleLowerCase(language);
      const results = devices.filter(device => {
        const area = areaNames.get(device.area) ?? '';
        return (device.name + ' ' + area + ' ' + device.id).toLocaleLowerCase(language).includes(query);
      });
      picker.input.replaceChildren(option('', results.length ? words.choose : words.noMatches), ...results.map(device => {
        const name = device.name;
        const scope = device.area !== room.id && areaNames.get(device.area);
        const suffix = nameCounts.get(name) > 1 ? [scope, device.id].filter(Boolean).join(' · ') : scope;
        return option(device.id, suffix ? name + ' · ' + suffix : name);
      }));
      picker.input.disabled = !results.length;
      picker.action.disabled = true;
    };
    filter.addEventListener('input', () => { this.#roomDeviceQuery = filter.value; refresh(); });
    refresh();
    children.push(field(words.searchable, filter), picker.wrapper);
    return children;
  }

  #customRoomForm(rooms, selected, words) {
    const name = node('input', { maxLength: 80, value: this.#newRoomName });
    name.dataset.roomFocus = 'new-room-name';
    const add = button(words.newRoom, () => {
      const text = name.value.trim();
      if (!text) return;
      const used = new Set([...rooms.map(room => room.id), ...configuredIds(this.#config.area_ids),
        ...Object.keys(this.#config.room_overrides ?? {})]);
      let serial = 1;
      while (used.has(CUSTOM_ROOM_PREFIX + serial)) serial++;
      const id = CUSTOM_ROOM_PREFIX + serial;
      const change = { room_overrides: { ...this.#config.room_overrides, [id]: { name: text, entities: [] } } };
      if (selected.length || this.#emptyRoomSelection) change.area_ids = [...selected, id];
      this.#emptyRoomSelection = false;
      this.#newRoomName = '';
      this.#open.newRoom = false;
      this.#roomEditing = id;
      this.#roomDeviceQuery = '';
      this.#commitRooms(change, 'room-edit');
    });
    add.disabled = !this.#newRoomName.trim();
    name.addEventListener('input', () => {
      this.#newRoomName = name.value;
      add.disabled = !name.value.trim();
    });
    name.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        if (!add.disabled) add.click();
      }
    });
    return disclosure(words.createRoom, this.#open.newRoom, open => { this.#open.newRoom = open; },
      [node('div', { className: 'stack' }, [
        node('p', { textContent: words.newRoomHint }),
        node('div', { className: 'room-add' }, [field(words.newRoomName, name), add]),
      ])]);
  }

  #roomsPanel(words, language) {
    const rooms = dashboardRoomOptions(this.#config, this.#hass).sort((a, b) => a.name.localeCompare(b.name, language));
    const byId = new Map(rooms.map(room => [room.id, room]));
    const selected = configuredIds(this.#config.area_ids);
    const customSelection = selected.length > 0 || this.#emptyRoomSelection;
    const mode = select([['auto', words.allRooms], ['custom', words.selectedRooms]], customSelection ? 'custom' : 'auto');
    mode.dataset.roomFocus = 'room-mode';
    mode.addEventListener('change', () => {
      if (mode.value === 'auto') {
        this.#emptyRoomSelection = false;
        this.#commitRooms({ area_ids: [] }, 'room-mode');
        return;
      }
      const visible = discoverRooms(this.#config, this.#hass, language).map(room => room.id).filter(id => byId.has(id));
      if (visible.length) this.#commitRooms({ area_ids: visible }, 'room-mode');
      else {
        this.#emptyRoomSelection = true;
        this.render();
        this.shadowRoot.querySelector('[data-room-focus="room-mode"]')?.focus({ preventScroll: true });
      }
    });
    const discovery = select([['all', words.allDevices], ['controls', words.controls]],
      this.#config.discovery_mode === 'controls' ? 'controls' : 'all');
    discovery.dataset.roomFocus = 'room-discovery';
    discovery.addEventListener('change', () => this.#commitRooms({ discovery_mode: discovery.value }, 'room-discovery'));
    const unassigned = checkbox(words.unassigned, this.#config.show_unassigned !== false,
      checked => this.#commitRooms({ show_unassigned: checked }, 'room-unassigned'));
    unassigned.firstElementChild.dataset.roomFocus = 'room-unassigned';
    const children = [field(words.roomSelection, mode), field(words.discovery, discovery), unassigned];

    if (customSelection) {
      const ordered = selected.map(id => ({
        id, name: byId.get(id)?.name ?? id,
        secondary: byId.get(id)?.custom ? words.customRoom : byId.has(id) ? '' : words.missing,
      }));
      if (ordered.length) children.push(
        orderedList(ordered, (items, focusKey) => this.#commitRooms({ area_ids: items.map(item => item.id) }, focusKey),
          words, words.hideRoom, true, 'rooms'),
      );
      if (ordered.length <= 1) children.push(node('p', { className: 'room-picker-hint', textContent: words.atLeastOneRoom }));
      const shown = new Set(selected);
      const available = rooms.filter(room => !shown.has(room.id));
      if (available.length) {
        const picker = addPicker(words.roomToAdd, available.map(room => [room.id, room.name]), words.addRoom, words.none, id => {
          this.#emptyRoomSelection = false;
          this.#roomEditing = id;
          this.#roomDeviceQuery = '';
          this.#commitRooms({ area_ids: [...selected, id] }, 'room-edit');
        });
        children.push(picker.wrapper);
      }
    }

    const editable = customSelection ? selected.map(id => byId.get(id)).filter(Boolean) : rooms;
    const active = editable.find(room => room.id === this.#roomEditing) ?? editable[0];
    if (active) {
      const picker = select(editable.map(room => [room.id, room.name]), active.id);
      picker.dataset.roomFocus = 'room-edit';
      picker.addEventListener('change', () => {
        this.#roomEditing = picker.value;
        this.#roomDeviceQuery = '';
        this.render();
        this.shadowRoot.querySelector('[data-room-focus="room-edit"]')?.focus({ preventScroll: true });
      });
      const override = this.#roomOverride(active.id);
      const input = node('input', { value: override.name ?? '', maxLength: 80, placeholder: active.name, required: Boolean(active.custom) });
      input.dataset.roomFocus = 'room-name';
      const saveName = () => {
        const name = input.value.trim();
        if (!name && active.custom) {
          input.value = override.name ?? active.name;
          return;
        }
        if (name === (override.name ?? '')) return;
        const next = { ...override };
        if (name) next.name = name;
        else delete next.name;
        this.#setRoomOverride(active.id, next, 'room-name');
      };
      input.addEventListener('change', saveName);
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.isComposing) {
          event.preventDefault();
          saveName();
        }
      });
      const fields = [
        field(words.roomToEdit, picker), field(words.roomName, input),
        this.#roomIconPicker(active, override, words, language),
        ...this.#roomDevicePanel(active, words, language, rooms),
      ];
      if (active.custom) {
        const remove = button(words.deleteRoom, () => {
          const after = { ...this.#config.room_overrides };
          delete after[active.id];
          const shortcuts = { ...this.#config.room_shortcuts };
          delete shortcuts[active.id];
          this.#roomEditing = undefined;
          this.#roomDeviceQuery = '';
          this.#commitRooms({
            room_overrides: after, area_ids: selected.filter(id => id !== active.id), room_shortcuts: shortcuts,
          }, 'room-mode');
        });
        remove.className = 'room-danger';
        fields.push(remove);
      }
      children.push(...fields);
    } else children.push(node('p', { textContent: words.noRooms }));

    children.push(this.#customRoomForm(rooms, selected, words));
    return [node('div', { className: 'stack' }, children)];
  }

  #entityMulti(label, key, words, options = entityOptions(this.#hass)) {
    const filter = node('input', { type: 'search', placeholder: words.searchable });
    const picker = node('select', { multiple: true, size: 4 });
    filter.setAttribute('aria-label', words.searchable + ' · ' + label);
    const refresh = () => {
      const query = filter.value.trim().toLocaleLowerCase();
      const active = new Set(this.#config[key] ?? []);
      picker.replaceChildren(...options
        .filter(item => active.has(item[0]) || !query || item[1].toLocaleLowerCase().includes(query))
        .map(([id, title]) => node('option', { value: id, textContent: title, selected: active.has(id) })));
    };
    filter.addEventListener('input', refresh);
    picker.addEventListener('change', () => this.#commit({ [key]: [...picker.selectedOptions].map(item => item.value) }));
    refresh();
    return node('div', { className: 'stack' }, [filter, field(label, picker)]);
  }

  #shortcutPanel(words, language) {
    const rooms = discoverRooms(this.#config, this.#hass, language);
    if (!rooms.length) return [node('p', { textContent: words.noShortcutRooms })];
    const room = rooms.find(item => item.id === this.#shortcutRoom) ?? rooms[0];
    const current = this.#config.room_shortcuts ?? {};
    const chosen = Object.hasOwn(current, room.id) && Array.isArray(current[room.id]) ? current[room.id] : null;
    const roomInput = select(rooms.map(item => [item.id, item.name]), room.id);
    const options = new Map(room.entities.map(item => [item.entity, item.name || item.entity]));
    for (const id of chosen ?? []) {
      if (typeof id === 'string' && !options.has(id)) options.set(id, id);
    }
    const inputs = Array.from({ length: MAX_ROOM_SHORTCUTS }, (_, index) => {
      const value = chosen?.[index] ?? '';
      return select([['', words.none], ...options], value);
    });
    const list = node('div', { className: 'grid', hidden: chosen == null },
      inputs.map((input, index) => field(words.shortcut + ' ' + (index + 1), input)));
    const refresh = () => {
      const selected = new Set(inputs.map(input => input.value).filter(Boolean));
      for (const input of inputs) {
        for (const item of input.options) {
          item.disabled = item.value !== input.value && selected.has(item.value);
        }
      }
    };
    const save = () => {
      this.#commit({ room_shortcuts: {
        ...this.#config.room_shortcuts, [room.id]: inputs.map(input => input.value).filter(Boolean),
      } });
    };
    refresh();
    for (const input of inputs) input.addEventListener('change', () => { refresh(); save(); });
    roomInput.addEventListener('change', () => { this.#shortcutRoom = roomInput.value; this.render(); });
    const automatic = checkbox(words.automaticShortcuts, chosen == null, enabled => {
      list.hidden = enabled;
      if (enabled) {
        const next = { ...this.#config.room_shortcuts };
        delete next[room.id];
        this.#commit({ room_shortcuts: next });
      } else save();
    });
    return [node('p', { textContent: words.shortcutHint }), field(words.shortcutRoom, roomInput), automatic, list];
  }

  #profilePanel(words) {
    const profiles = Array.isArray(this.#config.profiles) ? this.#config.profiles : [];
    const children = [node('p', { textContent: words.hint })];
    for (const profile of profiles) {
      if (!profile?.entity) continue;
      children.push(node('div', { className: 'record' }, [
        node('span', { textContent: profile.name || this.#hass.states?.[profile.entity]?.attributes?.friendly_name || profile.entity }),
        button(words.edit, () => { this.#profileEditing = profile; this.render(); }),
        button(words.remove, () => {
          if (this.#profileEditing?.entity === profile.entity) this.#profileEditing = undefined;
          this.#commit({ profiles: profiles.filter(item => item.entity !== profile.entity) });
          this.render();
        }),
      ]));
    }

    if (this.#profileEditing == null) {
      children.push(node('div', { className: 'actions' }, [
        button(words.add, () => { this.#profileEditing = {}; this.render(); }),
      ]));
      return children;
    }

    const current = this.#profileEditing;
    const timed = current.timed ?? {};
    const entity = select([['', words.choose], ...entityOptions(this.#hass, new Set(PROFILE_DOMAINS))], current.entity || '');
    if (current.entity && !entity.value) {
      entity.append(option(current.entity, current.entity));
      entity.value = current.entity;
    }
    const kind = select([['heater', words.heater], ['boiler', words.boiler]], current.kind || 'heater');
    const title = node('input', { value: current.name ?? '', maxLength: 80 });
    const entityInput = (domain, value) => {
      const choices = entityOptions(this.#hass, new Set([domain]));
      if (value && !choices.some(([id]) => id === value)) choices.unshift([value, value]);
      return select([['', words.none], ...choices], value || '');
    };
    const level = entityInput('number', current.level_entity);
    const start = entityInput('script', timed.start_script);
    const stop = entityInput('script', timed.stop_script);
    const timer = entityInput('timer', timed.timer_entity);
    const durationField = node('input', { value: timed.duration_field || 'duration', maxLength: 40 });
    const minutes = value => node('input', { type: 'number', min: '1', max: '360', value: String(value) });
    const min = minutes(timed.min_minutes ?? 15);
    const max = minutes(timed.max_minutes ?? 60);
    const step = minutes(timed.step_minutes ?? 15);
    const error = node('p', { className: 'error', hidden: true, textContent: words.invalid });
    error.setAttribute('role', 'alert');

    children.push(
      field(words.entity, entity), field(words.kind, kind), field(words.displayName, title),
      field(words.level, level),
      field(words.start, start), field(words.stop, stop), field(words.timer, timer),
      field(words.durationField, durationField),
      node('div', { className: 'grid' }, [field(words.min, min), field(words.max, max), field(words.step, step)]),
      error,
      node('div', { className: 'actions' }, [
        button(words.save, () => {
          const profile = normalizeProfile({
            entity: entity.value, kind: kind.value, name: title.value, level_entity: level.value,
            timed: {
              start_script: start.value, stop_script: stop.value, timer_entity: timer.value,
              duration_field: durationField.value, min_minutes: min.valueAsNumber,
              max_minutes: max.valueAsNumber, step_minutes: step.valueAsNumber,
            },
          });
          if (!profile) { error.hidden = false; entity.focus(); return; }
          this.#profileEditing = undefined;
          this.#commit({ profiles: [...profiles.filter(item => item.entity !== current.entity && item.entity !== profile.entity), profile] });
          this.render();
        }),
        button(words.clear, () => { this.#profileEditing = undefined; this.render(); }),
      ]),
    );
    return children;
  }

  render() {
    if (!this.isConnected) return;
    const language = languageFor(this.#config.locale, this.#hass);
    const words = WORDS[language];
    const title = node('input', { value: this.#config.title ?? '', maxLength: 80 });
    title.addEventListener('change', () => this.#commit({ title: title.value.trim() }));

    const locale = select([['auto', words.automatic], ['en', 'English'], ['he', 'עברית']], this.#config.locale ?? 'auto');
    locale.addEventListener('change', () => { this.#commit({ locale: locale.value }); this.render(); });

    const appearance = (label, key, options, fallback) => {
      const input = select(options, this.#config[key] ?? fallback);
      input.addEventListener('change', () => this.#commit({ [key]: input.value }));
      return field(label, input);
    };
    const backgrounds = Object.entries(BACKGROUNDS).map(([id, names]) => [id, names[language]]);
    const overviewOptions = discoverRooms(this.#config, this.#hass, language).flatMap(room =>
      room.entities.map(device => [device.entity, (device.name || device.entity) + ' · ' + room.name]));
    const form = node('form', { dir: language === 'he' ? 'rtl' : 'ltr' }, [
      field(words.title, title), field(words.language, locale),
      disclosure(words.areas, this.#open.rooms, open => { this.#open.rooms = open; }, this.#roomsPanel(words, language)),
      disclosure(words.appearance, this.#open.appearance, open => { this.#open.appearance = open; },
        [node('div', { className: 'stack' }, [
          appearance(words.background, 'background', backgrounds, 'aurora'),
          appearance(words.layout, 'layout', [['classic', words.classic], ['header', words.header]], 'classic'),
          appearance(words.shape, 'shape', [['soft', words.soft], ['circle', words.circle], ['square', words.square]], 'soft'),
        ])]),
      disclosure(words.devices, this.#open.devices, open => { this.#open.devices = open; },
        [this.#entityMulti(words.hidden, 'hidden_entities', words), this.#entityMulti(words.included, 'included_entities', words)]),
      disclosure(words.overview, this.#open.overview, open => { this.#open.overview = open; },
        [node('p', { textContent: words.overviewHint }), this.#entityMulti(words.overviewDevices, 'overview_entities', words, overviewOptions)]),
      disclosure(words.shortcuts, this.#open.shortcuts, open => { this.#open.shortcuts = open; },
        [node('div', { className: 'stack' }, this.#shortcutPanel(words, language))]),
      disclosure(words.profiles, this.#open.profiles, open => { this.#open.profiles = open; },
        [node('div', { className: 'stack' }, this.#profilePanel(words))]),
    ]);
    form.addEventListener('submit', event => event.preventDefault());
    this.shadowRoot.replaceChildren(node('style', { textContent: CSS + ROOM_CSS }), form);
  }
}
