import { BACKGROUNDS, discoverRooms, languageFor, MAX_ROOM_SHORTCUTS, normalizeProfile, PROFILE_DOMAINS, STRATEGY_NAME } from './strategy-model.js';

const WORDS = {
  en: {
    title: 'Dashboard title', language: 'Language', automatic: 'Home Assistant language',
    areas: 'Rooms', anyArea: 'All rooms', unassigned: 'Include devices without a room',
    appearance: 'Appearance', background: 'Wallpaper', layout: 'Room titles', shape: 'Button shape',
    classic: 'Alongside the controls', header: 'At the top', soft: 'Rounded', circle: 'Circle', square: 'Square',
    devices: 'Device visibility', hidden: 'Hide devices', included: 'Add other entities',
    shortcuts: 'Room shortcuts', shortcutRoom: 'Room', automaticShortcuts: 'Choose shortcuts automatically',
    shortcut: 'Shortcut', shortcutHint: 'Pick up to six devices in display order. All devices remain available inside the room.',
    noShortcutRooms: 'Add a device to a visible room to set its shortcuts.',
    profiles: 'Boiler and heater controls', entity: 'Heating device', kind: 'Control profile',
    heater: 'Room heater', boiler: 'Water heater or boiler', displayName: 'Display name',
    start: 'Scheduled start script', stop: 'Stop script', timer: 'Timer', none: 'None',
    durationField: 'Duration field', min: 'Shortest run in minutes', max: 'Longest run in minutes',
    step: 'Step in minutes', add: 'Add profile', save: 'Save profile', edit: 'Edit',
    remove: 'Remove', clear: 'Cancel', choose: 'Select a device',
    invalid: 'Select a heating device to save the profile.',
    hint: 'Select the Home Assistant entities that already control this device. Use a server-side start script for timed heating.',
    units: 'minutes', searchable: 'Filter entities',
  },
  he: {
    title: 'שם הדשבורד', language: 'שפה', automatic: 'שפת Home Assistant',
    areas: 'חדרים', anyArea: 'כל החדרים', unassigned: 'הצגת מכשירים ללא חדר',
    appearance: 'מראה', background: 'רקע', layout: 'שמות חדרים', shape: 'צורת כפתורים',
    classic: 'לצד הכפתורים', header: 'בראש הכרטיס', soft: 'מעוגל', circle: 'עיגול', square: 'ריבוע',
    devices: 'הצגת מכשירים', hidden: 'הסתרת מכשירים', included: 'הוספת ישויות נוספות',
    shortcuts: 'קיצורים בחדרים', shortcutRoom: 'חדר', automaticShortcuts: 'בחירת קיצורים אוטומטית',
    shortcut: 'קיצור', shortcutHint: 'אפשר לבחור עד שישה מכשירים לפי סדר התצוגה. כל המכשירים נשארים זמינים בתוך החדר.',
    noShortcutRooms: 'הוסיפו מכשיר לחדר שמוצג בדשבורד כדי לבחור קיצורים.',
    profiles: 'שליטה בדוד ובתנורים', entity: 'מכשיר חימום', kind: 'סוג בקר',
    heater: 'תנור חימום', boiler: 'דוד או מחמם מים', displayName: 'שם לתצוגה',
    start: 'סקריפט הפעלה עם זמן', stop: 'סקריפט כיבוי', timer: 'טיימר', none: 'ללא',
    durationField: 'שדה משך', min: 'זמן מינימלי בדקות', max: 'זמן מקסימלי בדקות',
    step: 'מרווח בחירה בדקות', add: 'הוספת בקר', save: 'שמירת בקר', edit: 'עריכה',
    remove: 'הסרה', clear: 'ביטול', choose: 'בחירת מכשיר',
    invalid: 'בחרו מכשיר חימום לפני השמירה.',
    hint: 'בחרו את הישויות שכבר שולטות במכשיר ב־Home Assistant. לחימום מתוזמן, השתמשו בסקריפט שפועל בשרת.',
    units: 'דקות', searchable: 'סינון ישויות',
  },
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
  const details = node('details', { open }, [node('summary', { textContent: text }), ...children]);
  details.addEventListener('toggle', () => onToggle(details.open));
  return details;
}

export class Bayit9StrategyEditor extends HTMLElement {
  #hass = {};
  #config = { type: 'custom:' + STRATEGY_NAME };
  #open = {};
  #profileEditing;
  #shortcutRoom;
  #lastConfig;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set hass(value) {
    const previous = this.#hass;
    this.#hass = value ?? {};
    if (previous.areas !== this.#hass.areas || previous.entities !== this.#hass.entities
        || (!this.#hass.entities && !Object.keys(previous.states ?? {}).length && Object.keys(this.#hass.states ?? {}).length)
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

  #entityMulti(label, key, words) {
    const options = entityOptions(this.#hass);
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
      field(words.start, start), field(words.stop, stop), field(words.timer, timer),
      field(words.durationField, durationField),
      node('div', { className: 'grid' }, [field(words.min, min), field(words.max, max), field(words.step, step)]),
      error,
      node('div', { className: 'actions' }, [
        button(words.save, () => {
          const profile = normalizeProfile({
            entity: entity.value, kind: kind.value, name: title.value,
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
    const areas = Object.entries(this.#hass.areas ?? {}).map(([id, area]) => ({
      id: area.area_id ?? id, name: area.name ?? id,
    })).sort((a, b) => a.name.localeCompare(b.name, language));
    const areaIds = new Set(this.#config.area_ids ?? []);
    const roomOptions = areas.map(area => checkbox(area.name, areaIds.has(area.id), checked => {
      if (checked) areaIds.add(area.id);
      else areaIds.delete(area.id);
      this.#commit({ area_ids: [...areaIds] });
    }));
    roomOptions.unshift(node('p', { textContent: words.anyArea + (language === 'he' ? ' כשלא נבחר חדר' : ' when none are selected') }));

    const form = node('form', { dir: language === 'he' ? 'rtl' : 'ltr' }, [
      field(words.title, title), field(words.language, locale),
      checkbox(words.unassigned, this.#config.show_unassigned !== false, checked => this.#commit({ show_unassigned: checked })),
      disclosure(words.areas, this.#open.rooms, open => { this.#open.rooms = open; }, roomOptions),
      disclosure(words.appearance, this.#open.appearance, open => { this.#open.appearance = open; },
        [node('div', { className: 'stack' }, [
          appearance(words.background, 'background', backgrounds, 'aurora'),
          appearance(words.layout, 'layout', [['classic', words.classic], ['header', words.header]], 'classic'),
          appearance(words.shape, 'shape', [['soft', words.soft], ['circle', words.circle], ['square', words.square]], 'soft'),
        ])]),
      disclosure(words.devices, this.#open.devices, open => { this.#open.devices = open; },
        [this.#entityMulti(words.hidden, 'hidden_entities', words), this.#entityMulti(words.included, 'included_entities', words)]),
      disclosure(words.shortcuts, this.#open.shortcuts, open => { this.#open.shortcuts = open; },
        [node('div', { className: 'stack' }, this.#shortcutPanel(words, language))]),
      disclosure(words.profiles, this.#open.profiles, open => { this.#open.profiles = open; },
        [node('div', { className: 'stack' }, this.#profilePanel(words))]),
    ]);
    form.addEventListener('submit', event => event.preventDefault());
    this.shadowRoot.replaceChildren(node('style', { textContent: CSS }), form);
  }
}
