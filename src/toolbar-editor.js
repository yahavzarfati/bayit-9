import {
  discoverRooms, generateDashboard, LOCAL_ROUTE, normalizeOverviewDiscovery, overviewSectionOptions, roomPanelOptions, selectableRoomEntities,
  TOOLBAR_KINDS, TOOLBAR_ROLE_DOMAINS, TOOLBAR_ROLES, TOOLBAR_SECTION_KINDS,
} from './strategy-model.js';
import { normalizeOrefMap, OREF_MAP_DEFAULTS } from './oref-alert-map.js';
import { sameVacuumDevice } from './vacuum-map.js';
import { normalizeCalendarAgenda, supportsDailyForecast } from './calendar-agenda.js';

const WORDS = {
  en: {
    layout: 'Toolbar layout', automatic: 'Automatic', custom: 'Custom',
    empty: 'Add the first toolbar button.', buttons: 'Toolbar buttons', addButton: 'Add button',
    buttonType: 'Button type', editButton: 'Edit toolbar button', label: 'Button label', icon: 'Icon',
    localPath: 'Home Assistant path', invalidPath: 'Use a local path such as /config/areas.',
    invalidIcon: 'Use an icon name such as mdi:home.',
    up: 'Move up', down: 'Move down', remove: 'Remove', choose: 'Choose…',
    placement: 'Show in', toolbarPlace: 'Toolbar', settingsPlace: 'Settings',
    panelContents: 'Panel contents', deviceList: 'Selected devices', grouped: 'Sections',
    scope: 'Devices', addEntity: 'Add device', entity: 'Device', noDevices: 'No devices selected.',
    unavailable: 'Unavailable', noChoices: 'No more devices available',
    sectionType: 'Section type', sectionName: 'Section title', sectionList: 'Panel sections',
    showHeading: 'Show section title', addSection: 'Add section', editSection: 'Edit section', sectionDisplay: 'Section display',
    overviewSource: 'Device source', overviewDiscover: 'Discover active lights', overviewExcluded: 'Exclude these lights',
    overviewExcludedIds: 'Exclude by text in entity ID', overviewInvalidIds: 'Enter up to 16 comma-separated ID fragments.',
    overviewActiveOnly: 'Show active devices only', overviewClosing: 'Include closing covers',
    deviceLabel: 'Device label', deviceRole: 'Display as', editDevice: 'Edit device display',
    ask: 'Ask before running', skip: 'Run immediately', askCustom: 'Custom confirmation',
    confirmation: 'Confirmation', confirmationText: 'Confirmation message', graphHours: 'History hours',
    graphDestination: 'Open on graph tap', noGraphLink: 'No shortcut', graphLinkUnavailable: 'Destination unavailable', graphRoom: 'Room',
    runScript: 'Run script from this button',
    orefMapTitle: 'Regional alerts',
    orefMap: 'Show the Oref alert map',
    orefMapHint: 'Requires the Oref Alert integration in Home Assistant.',
    auto_fit: 'Fit the map to active alerts',
    hebrew_basemap: 'Hebrew basemap',
    show_pre_alert: 'Show advance warnings',
    show_end: 'Show end-of-alert notices',
    vacuumMapTitle: 'Roborock floor maps', vacuumMap: 'Show calibrated floor maps',
    vacuumMapHint: 'Requires the Xiaomi Vacuum Map Card and calibrated Roborock image entities.',
    vacuumDevice: 'Roborock vacuum', vacuumSelector: 'Selected-map entity',
    floorOption: 'Map option', floorImage: 'Calibrated map image', floorName: 'Display name',
    addFloor: 'Add floor', removeFloor: 'Remove floor',
    calendarAgenda: 'Compact agenda', calendarAgendaHint: 'Choose the calendars to show. Tap to expand to seven days.',
    calendarWeather: 'Daily forecast beside dates', calendarNoWeather: 'No forecast',
    calendarAccent: 'Calendar accent', calendarInvalidAccent: 'Enter a six-digit color such as #80BFFF.',
    activity: 'Activity', automations: 'Automations', security: 'Security', presence: 'Presence',
    weather: 'Weather', energy: 'Energy', settings: 'Settings', overview: 'Overview',
    sensors: 'Sensors', media: 'Media', vacuum: 'Vacuum', calendar: 'Calendar', link: 'Local link',
    actions: 'Actions', locks: 'Locks', covers: 'Covers', status: 'Status', devices: 'Devices',
    people: 'People', forecast: 'Forecast', sun: 'Sun', readings: 'Readings',
    electricity: 'Electricity', water: 'Water', action: 'Action', lock: 'Lock', cover: 'Cover',
    device: 'Device controls', graph: 'History graph', person: 'Person', now_playing: 'Now Playing',
  },
  he: {
    layout: 'פריסת הסרגל', automatic: 'אוטומטית', custom: 'התאמה אישית',
    empty: 'הוסיפו את הכפתור הראשון לסרגל.', buttons: 'כפתורי הסרגל', addButton: 'הוספת כפתור',
    buttonType: 'סוג הכפתור', editButton: 'עריכת כפתור בסרגל', label: 'תווית הכפתור', icon: 'סמל',
    localPath: 'נתיב ב־Home Assistant', invalidPath: 'הזינו נתיב מקומי, למשל ‎/config/areas‎.',
    invalidIcon: 'הזינו שם סמל, למשל ‎mdi:home‎.',
    up: 'הזזה למעלה', down: 'הזזה למטה', remove: 'הסרה', choose: 'בחירה…',
    placement: 'מקום הצגה', toolbarPlace: 'סרגל', settingsPlace: 'הגדרות',
    panelContents: 'תוכן החלונית', deviceList: 'מכשירים נבחרים', grouped: 'קבוצות',
    scope: 'מכשירים', addEntity: 'הוספת מכשיר', entity: 'מכשיר', noDevices: 'אין מכשירים שנבחרו.',
    unavailable: 'לא זמין', noChoices: 'אין עוד מכשירים זמינים',
    sectionType: 'סוג הקבוצה', sectionName: 'כותרת הקבוצה', sectionList: 'קבוצות בחלונית',
    showHeading: 'הצגת כותרת הקבוצה', addSection: 'הוספת קבוצה', editSection: 'עריכת קבוצה', sectionDisplay: 'תצוגת הקבוצה',
    overviewSource: 'מקור המכשירים', overviewDiscover: 'גילוי אורות דולקים', overviewExcluded: 'אורות להחרגה',
    overviewExcludedIds: 'החרגה לפי חלק ממזהה הישות', overviewInvalidIds: 'הזינו עד 16 קטעי מזהה מופרדים בפסיקים.',
    overviewActiveOnly: 'הצגת מכשירים פעילים בלבד', overviewClosing: 'הצגת תריסים בזמן סגירה',
    deviceLabel: 'תווית המכשיר', deviceRole: 'אופן התצוגה', editDevice: 'עריכת תצוגת המכשיר',
    ask: 'בקשת אישור לפני ההפעלה', skip: 'הפעלה מיידית', askCustom: 'הודעת אישור מותאמת',
    confirmation: 'אישור פעולה', confirmationText: 'הודעת אישור', graphHours: 'שעות היסטוריה',
    graphDestination: 'פתיחה בלחיצה על הגרף', noGraphLink: 'ללא קיצור דרך', graphLinkUnavailable: 'היעד אינו זמין', graphRoom: 'חדר',
    runScript: 'הפעלת התסריט מהכפתור',
    orefMapTitle: 'התראות אזוריות',
    orefMap: 'הצגת מפת התרעות פיקוד העורף',
    orefMapHint: 'נדרשת אינטגרציית פיקוד העורף ב־Home Assistant.',
    auto_fit: 'התאמת המפה להתרעות פעילות',
    hebrew_basemap: 'מפת בסיס בעברית',
    show_pre_alert: 'הצגת הנחיות מקדימות',
    show_end: 'הצגת הודעות סיום',
    vacuumMapTitle: 'מפות קומות של Roborock', vacuumMap: 'הצגת מפות קומות מכוילות',
    vacuumMapHint: 'נדרשים כרטיס Xiaomi Vacuum Map וישויות מפה מכוילות של Roborock.',
    vacuumDevice: 'שואב Roborock', vacuumSelector: 'ישות לבחירת מפה',
    floorOption: 'אפשרות מפה', floorImage: 'תמונת מפה מכוילת', floorName: 'שם לתצוגה',
    addFloor: 'הוספת קומה', removeFloor: 'הסרת קומה',
    calendarAgenda: 'יומן בתצוגה מקוצרת', calendarAgendaHint: 'בחרו אילו יומנים להציג. לחיצה מציגה שבעה ימים.',
    calendarWeather: 'תחזית יומית ליד התאריך', calendarNoWeather: 'ללא תחזית',
    calendarAccent: 'צבע היומן', calendarInvalidAccent: 'הזינו צבע בן שש ספרות, למשל ‎#80BFFF‎.',
    activity: 'פעילות', automations: 'אוטומציות', security: 'אבטחה', presence: 'נוכחות',
    weather: 'מזג אוויר', energy: 'אנרגיה', settings: 'הגדרות', overview: 'סקירה',
    sensors: 'חיישנים', media: 'מדיה', vacuum: 'שואב רובוטי', calendar: 'יומן', link: 'קישור מקומי',
    actions: 'פעולות', locks: 'מנעולים', covers: 'תריסים', status: 'מצב', devices: 'מכשירים',
    people: 'אנשים', forecast: 'תחזית', sun: 'שמש', readings: 'מדדים',
    electricity: 'חשמל', water: 'מים', action: 'פעולה', lock: 'מנעול', cover: 'תריס',
    device: 'פקדי המכשיר', graph: 'גרף היסטוריה', person: 'אדם', now_playing: 'מתנגן עכשיו',
  },
};

const sectionDefaults = {
  automations: 'actions', security: 'status', presence: 'people', weather: 'forecast', energy: 'electricity',
  sensors: 'readings', media: 'media', vacuum: 'vacuum', calendar: 'devices',
};
const iconPattern = /^mdi:[a-z0-9-]+$/;
const entityId = item => typeof item === 'string' ? item : item?.entity;
let fieldId = 0;

function node(tag, properties = {}, children = []) {
  const element = Object.assign(document.createElement(tag), properties);
  element.append(...children);
  return element;
}

function field(text, input) {
  const caption = node('span', { id: 'bayit-toolbar-field-' + ++fieldId, textContent: text });
  input.setAttribute('aria-labelledby', caption.id);
  return node('label', { className: 'field' }, [caption, input]);
}

function select(options, value) {
  const control = node('select', {}, options.map(([optionValue, name]) =>
    node('option', { value: optionValue, textContent: name })));
  control.value = value;
  return control;
}

function button(text, handler) {
  const control = node('button', { type: 'button', textContent: text });
  control.addEventListener('click', handler);
  return control;
}

function move(items, from, to) {
  const copy = [...items];
  copy.splice(to, 0, copy.splice(from, 1)[0]);
  return copy;
}

function nextId(prefix, items) {
  const taken = new Set(items.map(item => item.id));
  let index = 1;
  while (taken.has(prefix + index)) index++;
  return prefix + index;
}

function patch(item, edits) {
  const result = { ...item, ...edits };
  for (const [key, value] of Object.entries(edits)) if (value === undefined) delete result[key];
  return result;
}

function automaticEntries(config, hass) {
  const card = generateDashboard({ ...config, toolbar: undefined }, hass).views[0].cards[0];
  const context = card.context ?? {};
  const first = context.automations?.length ? 'automations' : TOOLBAR_KINDS.has('activity') ? 'activity' : 'automations';
  const kinds = [first, ...['security', 'presence', 'weather', 'energy'].filter(kind => context[kind]?.length)];
  if (card.overview?.length) kinds.push('overview');
  kinds.push('settings');
  return kinds.map((kind, index) => ({ kind, id: 'toolbar-' + (index + 1) }));
}

export function buildToolbarEditor({ config, hass = {}, locale = 'en', onChange, viewState = {} }) {
  const words = WORDS[locale] ?? WORDS.en;
  let toolbar = Array.isArray(config.toolbar) ? structuredClone(config.toolbar)
    .filter(entry => TOOLBAR_KINDS.has(entry?.kind))
    .map(entry => Array.isArray(entry.sections) ? {
      ...entry,
      sections: entry.sections.flatMap(section => {
        if (!TOOLBAR_SECTION_KINDS.has(section?.kind)) return [];
        if (Array.isArray(section.entities)) return [section];
        return overviewSectionOptions(entry.kind, section).discover ? [{ ...section, entities: [] }] : [];
      }),
    } : entry) : undefined;
  let entryIndex = toolbar?.[viewState.entryIndex] ? viewState.entryIndex : 0;
  let sectionIndex = toolbar?.[entryIndex]?.sections?.[viewState.sectionIndex] ? viewState.sectionIndex : 0;
  let editedEntity = viewState.editedEntity;
  const available = new Map(selectableRoomEntities(config, hass).map(item => [item.entity, item]));
  const candidates = [...available.values()].sort((a, b) => (a.name || a.entity).localeCompare(b.name || b.entity, locale));
  const root = node('div', { className: 'toolbar-editor', dir: locale === 'he' ? 'rtl' : 'ltr' });
  const content = node('div', { className: 'toolbar-editor-stack' });
  root.append(node('style', { textContent: styles }), content);

  const optionNames = values => [...values].map(value => [value, words[value] ?? value]);
  const entryName = item => item.label || words[item.kind] || item.kind;
  const sectionName = item => item.title || words[item.kind] || item.kind;
  const displayName = item => item?.name || available.get(entityId(item))?.name || entityId(item);

  function commit(renderAgain = false, focusKey) {
    onChange(toolbar === undefined ? undefined : structuredClone(toolbar));
    if (renderAgain) render(focusKey);
  }

  function changeEntry(edits, structural, focusKey) {
    toolbar[entryIndex] = patch(toolbar[entryIndex], edits);
    commit(structural, focusKey);
  }

  function changeSection(edits, structural, focusKey) {
    const sections = [...toolbar[entryIndex].sections];
    sections[sectionIndex] = patch(sections[sectionIndex], edits);
    changeEntry({ sections }, structural, focusKey);
  }

  function nameControl(control, key, text) {
    control.setAttribute('aria-label', words[key] + ' · ' + text);
    control.title = control.getAttribute('aria-label');
  }

  function renameItem(group, index, text) {
    const item = content.querySelector('[data-toolbar-focus="' + group + '-edit-' + index + '"]');
    if (!item) return;
    item.textContent = text;
    for (const control of item.parentElement.querySelectorAll('[data-toolbar-command]')) {
      nameControl(control, control.dataset.toolbarCommand, text);
    }
  }

  function list(items, name, listLabel, group, selectItem, moveItem, removeItem, canRemove = () => true) {
    const container = node('ol', { className: 'toolbar-ordered' });
    container.setAttribute('aria-label', listLabel);
    for (const [index, item] of items.entries()) {
      const text = name(item) || words.unavailable;
      const choice = selectItem ? button(text, () => selectItem(index)) : node('span', { textContent: text });
      choice.className = 'toolbar-editor-item-name';
      if (selectItem) {
        choice.dataset.toolbarFocus = group + '-edit-' + index;
        choice.setAttribute('aria-pressed', String(
          group === 'button' ? index === entryIndex : group === 'section' ? index === sectionIndex : entityId(item) === editedEntity));
      }
      const controls = node('span', { className: 'toolbar-editor-move' });
      for (const [key, glyph, disabled, action] of [
        ['up', '↑', index === 0, () => moveItem(index, index - 1)],
        ['down', '↓', index + 1 === items.length, () => moveItem(index, index + 1)],
        ['remove', '×', !canRemove(item), () => removeItem(index)],
      ]) {
        const control = button(glyph, action);
        control.disabled = disabled;
        control.dataset.toolbarCommand = key;
        nameControl(control, key, text);
        control.dataset.toolbarFocus = group + '-' + key + '-' + index;
        controls.append(control);
      }
      container.append(node('li', {}, [choice, controls]));
    }
    return container;
  }

  function addPicker(title, choices, addText, add, barrier) {
    const input = select([['', words.choose], ...choices], '');
    input.dataset.toolbarFocus = 'picker-' + addText;
    const extra = node('div', { hidden: true });
    const action = button(addText, () => {
      if (!action.disabled) add(input.value, barrier?.value?.());
    });
    action.dataset.toolbarFocus = addText;
    const sync = () => {
      extra.hidden = !barrier?.when?.(input.value);
      action.disabled = !input.value || (!extra.hidden && !barrier.valid());
    };
    if (barrier) {
      extra.append(barrier.field);
      barrier.input.addEventListener('input', sync);
    }
    input.addEventListener('change', sync);
    sync();
    const wrapper = node('div', { className: 'toolbar-editor-add' }, [field(title, input), action]);
    if (barrier) wrapper.append(extra);
    return wrapper;
  }

  function textField(text, value, update, { maxLength = 80, pattern, placeholder = '', error = '', dir } = {}) {
    const input = node('input', { value: value ?? '', maxLength, placeholder });
    if (dir) input.dir = dir;
    const problem = node('span', { className: 'toolbar-editor-error', textContent: error, hidden: true });
    problem.setAttribute('role', 'status');
    input.addEventListener('input', () => {
      problem.hidden = !pattern || pattern.test(input.value.trim()) || (!input.value.trim() && !input.required);
      input.setAttribute('aria-invalid', String(!problem.hidden));
    });
    input.addEventListener('change', () => {
      if (problem.hidden) update(input.value.trim());
    });
    const label = field(text, input);
    label.append(problem);
    return { field: label, input };
  }

  function iconField(value, update) {
    const control = textField(words.icon, value, update,
      { pattern: iconPattern, error: words.invalidIcon, placeholder: 'mdi:home', dir: 'ltr' });
    const sample = node('span', { className: 'toolbar-editor-icon' });
    sample.setAttribute('aria-hidden', 'true');
    const glyph = node('ha-icon');
    sample.append(glyph);
    const paint = () => glyph.setAttribute('icon', iconPattern.test(control.input.value.trim()) ? control.input.value.trim() : 'mdi:shape-outline');
    control.input.addEventListener('input', paint);
    paint();
    return node('div', { className: 'toolbar-editor-icon-row' }, [control.field, sample]);
  }

  function entityPicker(getItems, setItems, editable) {
    const items = getItems();
    const key = editable ? 'entity' : 'scope';
    const selected = new Set(items.map(entityId));
    const choices = candidates.filter(item => !selected.has(item.entity)).map(item =>
      [item.entity, item.name && item.name !== item.entity ? item.name + ' · ' + item.entity : item.entity]);
    const shown = items.length ? list(items, displayName, words.scope, key, editable ? index => {
      editedEntity = entityId(items[index]);
      render('entity-edit-' + index);
    } : null, (from, to) => setItems(move(getItems(), from, to), key + '-' + (to < from ? 'up' : 'down') + '-' + to),
    index => {
      if (editedEntity === entityId(items[index])) editedEntity = undefined;
      setItems(getItems().filter((_, position) => position !== index), words.addEntity);
    }) : node('p', { textContent: words.noDevices });
    const add = choices.length ? addPicker(words.entity, choices, words.addEntity, value => {
      if (editable) editedEntity = value;
      setItems([...getItems(), editable ? { entity: value } : value], editable ? 'entity-edit-' + items.length : words.addEntity);
    }) : node('p', { textContent: words.noChoices });
    return node('div', { className: 'toolbar-editor-stack' }, [shown, add]);
  }

  function entityDetails(section, index, item) {
    const entity = entityId(item);
    const record = typeof item === 'string' ? { entity } : item;
    const domain = entity?.split('.')[0];
    const save = (edits, structural, focus = 'device-role') => {
      const latest = [...toolbar[entryIndex].sections[sectionIndex].entities];
      const current = typeof latest[index] === 'string' ? { entity } : latest[index];
      latest[index] = patch(current, edits);
      changeSection({ entities: latest }, structural, focus);
    };
    const roles = [...TOOLBAR_ROLES].filter(role => {
      if (role === 'graph') return domain === 'sensor';
      return !TOOLBAR_ROLE_DOMAINS.has(role) || TOOLBAR_ROLE_DOMAINS.get(role) === domain;
    });
    const role = select([['', words.automatic], ...optionNames(roles)], record.role ?? '');
    role.dataset.toolbarFocus = 'device-role';
    role.addEventListener('change', () => save({
      role: role.value || undefined,
      ...(role.value !== 'graph' && { graph_hours: undefined, graph_room_id: undefined, vacuum_panel_id: undefined }),
      ...(role.value !== 'action' && { command: undefined,
        ...(toolbar[entryIndex].sections[sectionIndex].entities[index]?.confirmation === false && { confirmation: undefined }) }),
    }, true));
    const fields = [
      node('h4', { textContent: words.editDevice }),
      field(words.deviceRole, role),
      textField(words.deviceLabel, record.name, value => {
        save({ name: value || undefined });
        renameItem('entity', index, value || available.get(entity)?.name || entity);
      }, { placeholder: available.get(entity)?.name || entity }).field,
      iconField(record.icon, value => save({ icon: value || undefined })),
    ];
    if (record.role === 'graph') {
      const hours = node('input', { type: 'number', min: '1', max: '336', step: '1',
        value: record.graph_hours === undefined ? '' : String(record.graph_hours), placeholder: '24' });
      hours.addEventListener('change', () => {
        if (hours.validity.valid) save({ graph_hours: hours.value === '' ? undefined : hours.valueAsNumber });
      });
      fields.push(field(words.graphHours, hours));
      if (domain === 'sensor' && toolbar[entryIndex].kind === 'sensors' && section.kind !== 'series') {
        const vacuumPanels = roomPanelOptions({ ...config, toolbar }, hass).filter(panel => panel.kind === 'vacuum');
        const rooms = discoverRooms(config, hass, locale);
        const links = new Map([
          ...rooms.map(room => ['room:' + room.id, words.graphRoom + ' · ' + room.name]),
          ...vacuumPanels.map(panel => ['vacuum:' + panel.id, panel.label || (vacuumPanels.length === 1 ? words.vacuum : panel.id)]),
        ]);
        const roomLink = record.graph_room_id ? 'room:' + record.graph_room_id : '';
        const vacuumLink = record.vacuum_panel_id ? 'vacuum:' + record.vacuum_panel_id : '';
        const chosen = [roomLink, vacuumLink].find(id => links.has(id)) || roomLink || vacuumLink;
        if (links.size || chosen) {
          const stale = chosen && !links.has(chosen);
          if (stale) links.set(chosen, words.graphLinkUnavailable);
          const destination = select([['', words.noGraphLink], ...links], chosen);
          if (stale) destination.selectedOptions[0].disabled = true;
          destination.addEventListener('change', () => {
            const [kind, id] = destination.value.split(':');
            save({ graph_room_id: kind === 'room' ? id : undefined, vacuum_panel_id: kind === 'vacuum' ? id : undefined });
          });
          fields.push(field(words.graphDestination, destination));
        }
      }
    }
    if (domain === 'calendar' && toolbar[entryIndex].kind === 'calendar' &&
        toolbar[entryIndex].calendar_agenda?.enabled === true) {
      fields.push(textField(words.calendarAccent, record.accent_color, value => save({ accent_color: value || undefined }),
        { dir:'ltr', maxLength:7, placeholder:'#80BFFF', pattern:/^#[0-9a-f]{6}$/i,
          error:words.calendarInvalidAccent }).field);
    }
    if (record.role === 'action' && domain === 'script') {
      const run = node('input', { type: 'checkbox', checked: record.command === 'run_script' });
      run.dataset.toolbarFocus = 'run-script';
      run.addEventListener('change', () => save({
        command: run.checked ? 'run_script' : undefined,
        ...(!run.checked && toolbar[entryIndex].sections[sectionIndex].entities[index]?.confirmation === false
          && { confirmation: undefined }),
      }, true, 'run-script'));
      fields.push(node('label', { className: 'check' }, [run, words.runScript]));
    }
    const effectiveRole = record.role ?? (section.kind === 'actions' ? 'action' : undefined);
    if (['action', 'lock', 'cover', 'device', 'now_playing'].includes(effectiveRole)
        || ['locks', 'covers', 'devices'].includes(section.kind) && !['status', 'graph'].includes(effectiveRole)) {
      const current = record.confirmation === true ? 'ask' : record.confirmation === false ? 'skip'
        : typeof record.confirmation === 'string' ? 'custom' : '';
      const confirmation = select([['', words.automatic], ['ask', words.ask],
        ...(record.command === 'run_script' ? [['skip', words.skip]] : []), ['custom', words.askCustom]], current);
      const message = textField(words.confirmationText,
        typeof record.confirmation === 'string' ? record.confirmation : '',
        value => save({ confirmation: value || true }), { maxLength: 200 });
      message.field.hidden = current !== 'custom';
      confirmation.addEventListener('change', () => {
        message.field.hidden = confirmation.value !== 'custom';
        if (confirmation.value === 'custom') {
          if (!message.input.value) save({ confirmation: true });
          message.input.focus();
        } else save({ confirmation: ({ ask: true, skip: false })[confirmation.value] });
      });
      fields.push(field(words.confirmation, confirmation), message.field);
    }
    return node('div', { className: 'toolbar-editor-detail' }, fields);
  }

  function overviewFilters(active, discovery) {
    const fields = [];
    if (active.kind === 'status') {
      const source = select([['manual', words.deviceList], ['discover', words.overviewDiscover]], discovery ? 'discover' : 'manual');
      source.dataset.toolbarFocus = 'overview-source';
      source.addEventListener('change', () => changeSection({
        discover: source.value === 'discover' ? { domain: 'light' } : undefined,
      }, true, 'overview-source'));
      fields.push(field(words.overviewSource, source));
    }
    if (discovery) {
      const save = edits => {
        const current = normalizeOverviewDiscovery(toolbar[entryIndex].sections[sectionIndex].discover);
        const next = normalizeOverviewDiscovery({ ...current, ...edits });
        if (next) changeSection({ discover: next });
      };
      const chosen = new Set(discovery.exclude_entities);
      const choices = new Set(candidates.filter(item => item.entity.startsWith('light.')).map(item => item.entity));
      for (const id of chosen) choices.add(id);
      const exclusionOptions = [...choices].map(id => {
        const name = available.get(id)?.name;
        return node('option', { value: id, textContent: name && name !== id ? name + ' · ' + id : id, selected: chosen.has(id) });
      });
      const exclusions = node('select', { multiple: true, size: Math.min(5, Math.max(2, choices.size)) }, exclusionOptions);
      exclusions.addEventListener('change', () => save({ exclude_entities: [...exclusions.selectedOptions].map(option => option.value) }));
      const fragments = textField(words.overviewExcludedIds, discovery.exclude_id_contains.join(', '), value => {
        save({ exclude_id_contains: value ? value.split(',').map(fragment => fragment.trim().toLowerCase()) : [] });
      }, { pattern: /^[a-z0-9_]{1,64}(?:\s*,\s*[a-z0-9_]{1,64}){0,15}$/i, maxLength: 1054,
        dir: 'ltr', error: words.overviewInvalidIds, placeholder: 'helper, test' });
      fields.push(field(words.overviewExcluded, exclusions), fragments.field);
      return fields;
    }
    const activeOnly = node('input', { type: 'checkbox', checked: active.filter === 'active' });
    activeOnly.dataset.toolbarFocus = 'overview-active';
    activeOnly.addEventListener('change', () => changeSection({ filter: activeOnly.checked ? 'active' : undefined }, true, 'overview-active'));
    fields.push(node('label', { className: 'check' }, [activeOnly, words.overviewActiveOnly]));
    if (activeOnly.checked && (active.kind === 'covers' || active.entities.some(item => entityId(item)?.startsWith('cover.')))) {
      const closing = node('input', { type: 'checkbox', checked: active.include_closing === true });
      closing.addEventListener('change', () => changeSection({ include_closing: closing.checked ? true : undefined }));
      fields.push(node('label', { className: 'check' }, [closing, words.overviewClosing]));
    }
    return fields;
  }

  function sectionsEditor() {
    const getSections = () => toolbar[entryIndex].sections;
    const sections = getSections();
    const listView = list(sections, sectionName, words.sectionList, 'section', index => {
      sectionIndex = index;
      editedEntity = undefined;
      render('section-edit-' + index);
    }, (from, to) => {
      const currentSections = getSections();
      const current = currentSections[sectionIndex];
      const order = move(currentSections, from, to);
      sectionIndex = order.indexOf(current);
      changeEntry({ sections: order }, true, 'section-' + (to < from ? 'up' : 'down') + '-' + to);
    }, index => {
      const currentSections = getSections();
      const current = currentSections[sectionIndex];
      const remainder = currentSections.filter((_, position) => position !== index);
      sectionIndex = Math.max(0, remainder.indexOf(current));
      if (index === currentSections.indexOf(current)) editedEntity = undefined;
      changeEntry({ sections: remainder }, true, words.addSection);
    });
    const add = addPicker(words.sectionType, optionNames(TOOLBAR_SECTION_KINDS), words.addSection, kind => {
      const currentSections = getSections();
      sectionIndex = currentSections.length;
      editedEntity = undefined;
      changeEntry({ sections: [...currentSections, { id: nextId('section-', currentSections), kind, entities: [] }] },
        true, 'section-edit-' + sectionIndex);
    });
    const output = [listView, add];
    const active = sections[sectionIndex];
    if (!active) return output;
    const display = select(optionNames(TOOLBAR_SECTION_KINDS), active.kind);
    display.dataset.toolbarFocus = 'section-display';
    display.addEventListener('change', () => changeSection({ kind: display.value }, true, 'section-display'));
    const heading = node('input', { type: 'checkbox', checked: active.title !== '' });
    heading.addEventListener('change', () => changeSection({ title: heading.checked ? undefined : '' }, true, 'show-heading'));
    heading.dataset.toolbarFocus = 'show-heading';
    const title = textField(words.sectionName, active.title, value => {
      changeSection({ title: value || undefined });
      renameItem('section', sectionIndex, value || words[active.kind]);
    }, { placeholder: words[active.kind] });
    title.field.hidden = !heading.checked;
    const fields = [node('h3', { textContent: words.editSection }), field(words.sectionDisplay, display),
      node('label', { className: 'check' }, [heading, words.showHeading]), title.field];
    const kind = toolbar[entryIndex].kind;
    const { discover } = overviewSectionOptions(kind, active);
    if (kind === 'overview' && ['status', 'covers'].includes(active.kind)) fields.push(...overviewFilters(active, discover));
    if (!discover) {
      fields.push(entityPicker(() => getSections()[sectionIndex].entities,
        (entities, focus) => changeSection({ entities }, true, focus), true));
      const position = active.entities.findIndex(item => entityId(item) === editedEntity);
      if (position !== -1) fields.push(entityDetails(active, position, active.entities[position]));
    }
    output.push(node('div', { className: 'toolbar-editor-detail' }, fields));
    return output;
  }

  function editOrefMap(entry) {
    let settings = normalizeOrefMap({ ...entry.oref_map, enabled: true });
    const enabled = node('input', { type: 'checkbox', checked: entry.oref_map?.enabled === true });
    const options = Object.keys(OREF_MAP_DEFAULTS).map(key => {
      const input = node('input', { type: 'checkbox', checked: settings[key] });
      input.addEventListener('change', () => {
        settings = { ...settings, [key]: input.checked };
        changeEntry({ oref_map: settings });
      });
      return node('label', { className: 'check' }, [input, words[key]]);
    });
    const controls = node('div', { className: 'toolbar-editor-stack', hidden: !enabled.checked }, options);
    enabled.addEventListener('change', () => {
      controls.hidden = !enabled.checked;
      changeEntry({ oref_map: { ...settings, enabled: enabled.checked } });
    });
    return node('fieldset', { className: 'toolbar-editor-detail' }, [
      node('legend', { textContent: words.orefMapTitle }),
      node('label', { className: 'check' }, [enabled, words.orefMap]),
      node('small', { textContent: words.orefMapHint }),
      controls,
    ]);
  }

  function editVacuumMap(entry) {
    const current = entry.vacuum_map ?? {};
    let settings = {
      enabled: current.enabled === true,
      vacuum: typeof current.vacuum === 'string' ? current.vacuum : '',
      selector: typeof current.selector === 'string' ? current.selector : '',
      floors: Array.isArray(current.floors) ? current.floors.filter(floor => typeof floor?.option === 'string')
        .map(floor => ({ option: floor.option, image: floor.image, name: floor.name })) : [],
    };
    const enabled = node('input', { type: 'checkbox', checked: settings.enabled });
    enabled.dataset.toolbarFocus = 'vacuum-map-enabled';
    const save = (edits, focus) => {
      settings = { ...settings, ...edits };
      changeEntry({ vacuum_map: settings }, Boolean(focus), focus);
    };
    enabled.addEventListener('change', () => save({ enabled: enabled.checked }, 'vacuum-map-enabled'));
    const output = [
      node('legend', { textContent: words.vacuumMapTitle }),
      node('label', { className: 'check' }, [enabled, words.vacuumMap]),
      node('small', { textContent: words.vacuumMapHint }),
    ];
    if (!settings.enabled) return node('fieldset', { className: 'toolbar-editor-detail' }, output);

    const entityChoices = domains => candidates.filter(item => domains.includes(item.entity.split('.')[0]))
      .map(item => [item.entity, item.name || item.entity]);
    function pick(label, key, value, options, change) {
      const list = [['', words.choose], ...options];
      if (value && !list.some(([id]) => id === value)) list.push([value, value + ' · ' + words.unavailable]);
      const input = select(list, value || '');
      input.dataset.toolbarFocus = key;
      input.addEventListener('change', () => change(input.value));
      return field(label, input);
    }
    output.push(pick(words.vacuumDevice, 'vacuum-map-device', settings.vacuum, entityChoices(['vacuum']), value => {
      const keep = sameVacuumDevice(value, settings.selector, hass.entities);
      save({ vacuum: value, ...(!keep && { selector: '', floors: [] }) }, 'vacuum-map-device');
    }));
    const selectors = entityChoices(['select']).filter(([id]) => sameVacuumDevice(settings.vacuum, id, hass.entities));
    output.push(pick(words.vacuumSelector, 'vacuum-map-selector', settings.selector, selectors, value =>
      save({ selector: value, floors: [] }, 'vacuum-map-selector')));

    const imageChoices = entityChoices(['image', 'camera']);
    const options = hass.states?.[settings.selector]?.attributes?.options;
    const mapOptions = Array.isArray(options) ? [...new Set(options.filter(option => typeof option === 'string' && option.trim()))] : [];
    for (const [index, floor] of settings.floors.entries()) {
      const editFloor = (edits, focus) => save({
        floors: settings.floors.map((item, position) => position === index ? { ...item, ...edits } : item),
      }, focus);
      const focusKey = 'vacuum-map-image-' + index;
      const images = imageChoices.filter(([id]) => id === floor.image || !settings.floors.some(item => item.image === id));
      const remove = button(words.removeFloor, () => save({
        floors: settings.floors.filter((_, position) => index !== position),
      }, words.addFloor));
      output.push(node('fieldset', { className: 'toolbar-editor-detail' }, [
        node('legend', { textContent: floor.option }),
        pick(words.floorImage, focusKey, floor.image, images, image => editFloor({ image }, focusKey)),
        textField(words.floorName, floor.name, name => editFloor({ name }), { placeholder: floor.option }).field,
        remove,
      ]));
    }
    const availableOptions = mapOptions.filter(option => !settings.floors.some(floor => floor.option === option));
    if (availableOptions.length) output.push(addPicker(words.floorOption, availableOptions.map(option => [option, option]),
      words.addFloor, option => save({ floors: [...settings.floors, { option, image: '' }] },
        'vacuum-map-image-' + settings.floors.length)));
    return node('fieldset', { className: 'toolbar-editor-detail' }, output);
  }

  function editCalendarAgenda(entry) {
    const settings = normalizeCalendarAgenda(entry.calendar_agenda);
    const enabled = node('input', { type:'checkbox', checked: !!settings });
    enabled.dataset.toolbarFocus = 'enable-agenda';
    enabled.addEventListener('change', () => {
      changeEntry({ calendar_agenda: enabled.checked ? { enabled:true } : undefined,
        ...(enabled.checked && !Array.isArray(entry.sections) && !Array.isArray(entry.entities) && { entities: [] }),
      }, true, 'enable-agenda');
    });
    const controls = [node('label', { className:'check' }, [enabled, words.calendarAgenda])];
    if (settings) {
      controls.push(node('small', { textContent: words.calendarAgendaHint }));
      const weather = candidates.filter(item => item.entity.startsWith('weather.') && supportsDailyForecast(hass.states?.[item.entity]))
        .map(item => [item.entity, item.name || item.entity]);
      if (settings.weather_entity && !weather.some(([id]) => id === settings.weather_entity)) {
        weather.push([settings.weather_entity, words.unavailable + ' · ' + settings.weather_entity]);
      }
      const forecast = select([['', words.calendarNoWeather], ...weather], settings.weather_entity ?? '');
      forecast.addEventListener('change', () => changeEntry({ calendar_agenda: {
        enabled:true, ...(forecast.value && { weather_entity: forecast.value }),
      } }));
      controls.push(field(words.calendarWeather, forecast));
    }
    return node('div', { className:'toolbar-editor-stack' }, controls);
  }

  function entryDetails(entry) {
    const fields = [node('h3', { textContent: words.editButton }),
      textField(words.label, entry.label, value => {
        changeEntry({ label: value || undefined });
        renameItem('button', entryIndex, value || words[entry.kind]);
      }, { placeholder: words[entry.kind] }).field,
      iconField(entry.icon, value => changeEntry({ icon: value || undefined }))];
    if (entry.kind !== 'settings') {
      const placement = select([['toolbar', words.toolbarPlace], ['settings', words.settingsPlace]],
        entry.placement === 'settings' ? 'settings' : 'toolbar');
      placement.addEventListener('change', () => changeEntry({ placement: placement.value === 'settings' ? 'settings' : undefined }));
      fields.push(field(words.placement, placement));
    }
    if (entry.kind === 'security') fields.push(editOrefMap(entry));
    if (entry.kind === 'vacuum') fields.push(editVacuumMap(entry));
    if (entry.kind === 'calendar') fields.push(editCalendarAgenda(entry));
    if (entry.kind === 'link') {
      const path = textField(words.localPath, entry.path, value => {
        if (LOCAL_ROUTE.test(value)) changeEntry({ path: value });
      }, { dir: 'ltr', pattern: LOCAL_ROUTE, error: words.invalidPath, placeholder: '/config/areas', maxLength: 200 });
      path.input.required = true;
      fields.push(path.field);
    } else if (!['settings', 'activity'].includes(entry.kind)) {
      const grouped = Array.isArray(entry.sections);
      const mode = select([['automatic', words.automatic], ['entities', words.deviceList], ['sections', words.grouped]], grouped ? 'sections'
        : Array.isArray(entry.entities) ? 'entities' : 'automatic');
      mode.dataset.toolbarFocus = 'panel-mode';
      mode.addEventListener('change', () => {
        const current = toolbar[entryIndex];
        const entities = Array.isArray(current.sections)
          ? [...new Set(current.sections.flatMap(section => section.entities.map(entityId)))]
          : current.entities ?? [];
        sectionIndex = 0;
        editedEntity = undefined;
        changeEntry({
          sections: mode.value === 'sections' ? [{ id: 'section-1', kind: sectionDefaults[entry.kind] || 'devices', entities }] : undefined,
          entities: mode.value === 'entities' ? entities : undefined,
        }, true, 'panel-mode');
      });
      fields.push(field(words.panelContents, mode));
      if (grouped) fields.push(...sectionsEditor());
      else if (Array.isArray(entry.entities)) {
        fields.push(entityPicker(() => toolbar[entryIndex].entities,
          (entities, focus) => changeEntry({ entities }, true, focus), false));
      }
    }
    return node('div', { className: 'toolbar-editor-detail' }, fields);
  }

  function render(focusKey) {
    Object.assign(viewState, { entryIndex, sectionIndex, editedEntity });
    const mode = select([['automatic', words.automatic], ['custom', words.custom]],
      toolbar === undefined ? 'automatic' : 'custom');
    mode.dataset.toolbarFocus = 'toolbar-mode';
    mode.addEventListener('change', () => {
      toolbar = mode.value === 'custom' ? automaticEntries(config, hass) : undefined;
      entryIndex = sectionIndex = 0;
      editedEntity = undefined;
      commit(true, 'toolbar-mode');
    });
    const fields = [field(words.layout, mode)];
    if (toolbar !== undefined) {
      const path = textField(words.localPath, '', () => {}, {
        pattern: LOCAL_ROUTE, error: words.invalidPath, dir: 'ltr', placeholder: '/config/areas', maxLength: 200,
      });
      fields.push(toolbar.length ? list(toolbar, entryName, words.buttons, 'button', index => {
        entryIndex = index;
        sectionIndex = 0;
        editedEntity = undefined;
        render('button-edit-' + index);
      }, (from, to) => {
        const current = toolbar[entryIndex];
        toolbar = move(toolbar, from, to);
        entryIndex = toolbar.indexOf(current);
        commit(true, 'button-' + (to < from ? 'up' : 'down') + '-' + to);
      }, index => {
        const current = toolbar[entryIndex];
        const removingCurrent = current === toolbar[index];
        toolbar = toolbar.filter((_, position) => index !== position);
        entryIndex = Math.max(0, toolbar.indexOf(current));
        if (removingCurrent) {
          sectionIndex = 0;
          editedEntity = undefined;
        }
        commit(true, words.addButton);
      }, item => item.kind !== 'settings' || toolbar.filter(item => item.kind === 'settings').length > 1)
        : node('p', { textContent: words.empty }),
      addPicker(words.buttonType, optionNames(TOOLBAR_KINDS), words.addButton, (kind, route) => {
        entryIndex = toolbar.length;
        sectionIndex = 0;
        editedEntity = undefined;
        toolbar.push({ id: nextId('toolbar-', toolbar), kind, ...(route && kind === 'link' && { path: route }) });
        commit(true, 'button-edit-' + entryIndex);
      }, { ...path, when: kind => kind === 'link', value: () => path.input.value.trim(),
        valid: () => LOCAL_ROUTE.test(path.input.value.trim()) }));
      if (toolbar[entryIndex]) fields.push(entryDetails(toolbar[entryIndex]));
    }
    content.replaceChildren(...fields);
    if (focusKey) {
      const controls = [...content.querySelectorAll('[data-toolbar-focus]')];
      const focus = controls.find(control => control.dataset.toolbarFocus === focusKey && !control.disabled)
        ?? controls.find(control => control.dataset.toolbarFocus === 'picker-' + focusKey)
        ?? controls.find(control => control.dataset.toolbarFocus === focusKey.replace(/-(up|down)-/, '-edit-'));
      focus?.focus({ preventScroll: true });
    }
  }

  render();
  return root;
}

const styles = `
  .toolbar-editor-stack, .toolbar-editor-detail { display: grid; gap: 8px; min-width: 0; }
  .toolbar-editor-detail { padding: 8px; border: 1px solid var(--divider-color,#999); border-radius: 9px; }
  .toolbar-editor-detail h3, .toolbar-editor-detail h4 { margin: 0; font-size: .95em; }
  .toolbar-editor .field input, .toolbar-editor .field select { min-width: 0; }
  .toolbar-ordered { margin: 0; padding: 0; list-style: none; }
  .toolbar-ordered > li {
    display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 5px;
    padding-block: 4px; border-block-end: 1px solid var(--divider-color,#999);
  }
  .toolbar-ordered > li:last-child { border-block-end: 0; }
  .toolbar-editor-item-name { min-width: 0; overflow-wrap: anywhere; text-align: start; }
  button.toolbar-editor-item-name[aria-pressed=true] {
    box-shadow: inset 0 0 0 1px var(--primary-color,#0286c2); font-weight: 700;
  }
  .toolbar-editor-move { display: flex; gap: 3px; }
  .toolbar-editor-move > button { inline-size: 44px; min-block-size: 44px; padding: 0; }
  .toolbar-editor button:disabled { opacity: .48; cursor: default; }
  .toolbar-editor-add, .toolbar-editor-icon-row {
    display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: end; gap: 7px;
  }
  .toolbar-editor-add > div { grid-column: 1 / -1; }
  .toolbar-editor-icon {
    display: grid; place-items: center; inline-size: 44px; block-size: 44px; box-sizing: border-box;
    border: 1px solid var(--divider-color,#999); border-radius: 8px;
  }
  .toolbar-editor-error { color: var(--error-color,#ac0028); font-size: .85em; }
  .toolbar-editor [hidden] { display: none !important; }
  @media (max-width: 340px) {
    .toolbar-editor-add { grid-template-columns: minmax(0,1fr); }
    .toolbar-editor-add > button { justify-self: start; }
  }
`;
