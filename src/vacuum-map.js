const TAG = 'xiaomi-vacuum-map-card';
const ENTITY = /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/;
const ROOM = /^[1-9][0-9]{0,5}$/;
const unavailable = new Set(['unavailable', 'unknown']);

const domain = id => id.split('.')[0];
const validId = (id, domains) => typeof id === 'string' && ENTITY.test(id) && domains.includes(domain(id));
const deviceId = info => info?.device_id ?? info?.di;
const activeState = record => typeof record?.state === 'string' && !unavailable.has(record.state);
const point = (x, y) => Number.isFinite(x) && Number.isFinite(y);

export function sameVacuumDevice(vacuum, selector, registry) {
  const robotDevice = deviceId(registry?.[vacuum]);
  const selectDevice = deviceId(registry?.[selector]);
  return !robotDevice || !selectDevice || robotDevice === selectDevice;
}

export function normalizeVacuumMap(value, visible = () => true, registry) {
  if (value?.enabled !== true || !validId(value.vacuum, ['vacuum']) || !validId(value.selector, ['select']) ||
      !visible(value.vacuum) || !visible(value.selector) || !sameVacuumDevice(value.vacuum, value.selector, registry) ||
      !Array.isArray(value.floors)) return undefined;
  const options = new Set();
  const images = new Set();
  const floors = value.floors.flatMap(floor => {
    const { option, image } = floor ?? {};
    if (typeof option !== 'string' || !option.trim() || option.length > 120 || options.has(option) ||
        !validId(image, ['image', 'camera']) || !visible(image) || images.has(image)) return [];
    const name = typeof floor.name === 'string' ? floor.name.trim().slice(0, 80) : '';
    options.add(option);
    images.add(image);
    return [{ option, image, ...(name && { name }) }];
  });
  return floors.length ? { enabled: true, vacuum: value.vacuum, selector: value.selector, floors } : undefined;
}

function localMapPicture(entity, value, origin) {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value, origin);
    const prefix = domain(entity) === 'image' ? 'image_proxy' : 'camera_proxy';
    if (url.origin === origin && !url.username && !url.password && !url.hash &&
        url.pathname === '/api/' + prefix + '/' + entity) {
      if (!url.search) url.searchParams.set('v', '0');
      return url.href;
    }
  } catch { /* Home Assistant does not currently have a usable map image. */ }
  return undefined;
}

function nonCollinear(points) {
  if (points.length < 3 || !points.every(([x, y]) => point(x, y))) return false;
  const [x, y] = points[0];
  const next = points.find(([a, b]) => a !== x || b !== y);
  if (!next) return false;
  return points.some(([a, b]) => {
    const area = (next[0] - x) * (b - y) - (next[1] - y) * (a - x);
    return Number.isFinite(area) && area !== 0;
  });
}

function calibrationFor(source) {
  if (!Array.isArray(source) || ![3, 4].includes(source.length) || !source.every(item =>
    point(item?.map?.x, item?.map?.y) && point(item?.vacuum?.x, item?.vacuum?.y))) return undefined;
  const triangles = source.length === 3 ? [source] : source.map((_, excluded) =>
    source.filter((_, index) => index !== excluded));
  if (!triangles.every(triangle => ['map', 'vacuum'].every(key =>
    nonCollinear(triangle.map(item => [item[key].x, item[key].y]))))) return undefined;
  return source.map(({ map, vacuum }) => ({
    map: { x: map.x, y: map.y }, vacuum: { x: vacuum.x, y: vacuum.y },
  }));
}

function roomsFor(source) {
  return Object.entries(source ?? {}).flatMap(([id, room]) => {
    if (!ROOM.test(id) || !room || typeof room !== 'object') return [];
    const { x0, y0, x1, y1 } = room;
    const vertices = room.outline ?? [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    if (!Array.isArray(vertices) || !vertices.every(vertex => Array.isArray(vertex) && vertex.length === 2) ||
        !nonCollinear(vertices)) return [];
    const outline = vertices.map(([x, y]) => [x, y]);
    const middle = axis => outline.reduce((sum, vertex) => sum + vertex[axis], 0) / outline.length;
    const x = Number.isFinite(room.x) ? room.x : middle(0);
    const y = Number.isFinite(room.y) ? room.y : middle(1);
    const text = typeof room.name === 'string' && room.name.trim() ? room.name.trim().slice(0, 80) : id;
    return [{ id, outline, icon: { name: 'mdi:broom', x, y }, label: { text, x, y, offset_y: 35 } }];
  });
}

export function vacuumMapSnapshot(config, hass, origin) {
  const states = hass?.states ?? {};
  const visible = id => {
    const info = hass?.entities?.[id];
    return activeState(states[id]) && !info?.hidden && !info?.hidden_by && !info?.disabled_by;
  };
  const robot = states[config.vacuum];
  const selector = states[config.selector];
  const selectionValid = visible(config.vacuum) && visible(config.selector) &&
    sameVacuumDevice(config.vacuum, config.selector, hass?.entities) && Array.isArray(selector.attributes?.options);
  if (!selectionValid) return { choices: [] };
  const choices = config.floors.filter(floor => selector.attributes.options.includes(floor.option) && visible(floor.image));
  const floor = choices.find(entry => entry.option === selector.state);
  const source = floor && states[floor.image];
  const picture = floor && localMapPicture(floor.image, source?.attributes?.entity_picture, origin);
  const calibration = calibrationFor(source?.attributes?.calibration_points);
  if (!picture || !calibration) return { choices, selected: selector.state };
  return {
    choices, selected: selector.state,
    map: { floor, robot, picture, calibration, rooms: roomsFor(source.attributes.rooms) },
  };
}

function commandFor(vacuum, rooms, domain, service, data, target) {
  if (data?.entity_id !== vacuum || (target !== undefined && target?.entity_id !== vacuum)) return undefined;
  if (domain === 'roborock' && service === 'set_vacuum_goto_position' && point(data.x, data.y)) {
    return { x: data.x, y: data.y };
  }
  if (domain !== 'vacuum' || service !== 'send_command' || !Array.isArray(data.params)) return undefined;
  if (data.command === 'app_zoned_clean' && data.params.length > 0 && data.params.length <= 5 &&
      data.params.every(zone => Array.isArray(zone) && zone.length === 5 && zone.every(Number.isFinite) &&
        Number.isInteger(zone[4]) && zone[4] >= 1 && zone[4] <= 3)) {
    return { command: data.command, params: data.params.map(zone => [...zone]) };
  }
  const [selection] = data.params;
  if (data.command === 'app_segment_clean' && data.params.length === 1 &&
      Array.isArray(selection?.segments) && selection.segments.length &&
      Number.isInteger(selection.repeat) && selection.repeat >= 1 && selection.repeat <= 3) {
    const allowed = new Set(rooms.map(room => Number(room.id)));
    const segments = [...new Set(selection.segments)];
    if (segments.every(id => allowed.has(id))) {
      return { command: data.command, params: [{ segments, repeat: selection.repeat }] };
    }
  }
  return undefined;
}

function cardConfig(config, map, locale) {
  return {
    type: 'custom:' + TAG, entity: config.vacuum, vacuum_platform: 'Roborock', language: locale,
    map_source: { camera: map.floor.image }, calibration_source: { camera: true },
    map_locked: false, two_finger_pan: true, icons: [], tiles: [],
    map_modes: [
      { template: 'vacuum_clean_zone', run_immediately: false },
      ...(map.rooms.length ? [{ template: 'vacuum_clean_segment', run_immediately: false,
        predefined_selections: map.rooms }] : []),
      { template: 'vacuum_goto', run_immediately: false },
    ],
  };
}

export function createVacuumMap({ host, dialog, config, context }) {
  const { make, button, t, request, pending, locale } = context;
  const view = host.ownerDocument.defaultView;
  const pathname = view.location.pathname;
  const controls = make('div', 'weather-tabs');
  const status = make('p', 'empty');
  status.setAttribute('role', 'status');
  const slot = make('div', 'native-panel-card');
  host.append(controls, status, slot);
  const choices = config.floors.map(floor => {
    const choice = button('control-button', floor.name ?? floor.option);
    choice.onclick = () => selectFloor(floor);
    controls.append(choice);
    return { choice, floor };
  });
  const events = new view.AbortController();
  const observer = new view.MutationObserver(sync);
  let hass;
  let selection;
  let attached;
  let loading;
  let failedKey;
  let leftPage = false;
  let disposed = false;

  function active() {
    leftPage ||= view.location.pathname !== pathname;
    return !disposed && !leftPage && host.isConnected && dialog.open && !dialog.hasAttribute('data-closing');
  }

  function snapshot() {
    return vacuumMapSnapshot(config, hass, view.location.origin);
  }

  function remove() {
    loading = undefined;
    attached?.card.remove();
    attached = undefined;
  }

  function keyFor(map) {
    return JSON.stringify([map.floor.image, map.calibration, map.rooms]);
  }

  async function selectFloor(floor) {
    if (!active() || selection?.working || pending(config.selector) || !view.customElements.get(TAG)) return;
    const current = snapshot();
    if (current.selected === floor.option || !current.choices.includes(floor)) return;
    const attempt = { option: floor.option, working: true };
    selection = attempt;
    sync();
    try {
      await request({ entity: config.selector }, 'select_option', floor.option);
    } catch {
      // No map commands resume until Home Assistant reports the requested option.
    } finally {
      if (selection === attempt) {
        attempt.working = false;
        if (!disposed) sync();
      }
    }
  }

  function setMapHass(element, map, key) {
    element.hass = {
      states: {
        [config.vacuum]: map.robot,
        [map.floor.image]: { entity_id: map.floor.image, state: 'on', attributes: {
          entity_picture: map.picture, calibration_points: map.calibration,
        } },
      },
      themes: hass.themes, locale: hass.locale, language: hass.language,
      localize: (...args) => hass.localize?.(...args),
      hassUrl: path => path === map.picture ? path : '',
      async callService(domain, service, data, target) {
        const now = active() && attached?.card === element && !selection && !pending(config.selector) && snapshot().map;
        const payload = now && keyFor(now) === key && commandFor(config.vacuum, now.rooms, domain, service, data, target);
        if (!payload || typeof hass?.callWS !== 'function') throw new Error(t('vacuum_map_unconfirmed'));
        return await hass.callWS({ type: 'call_service', domain, service, service_data: payload,
          target: { entity_id: config.vacuum } });
      },
    };
  }

  function sync() {
    if (!active()) { remove(); return; }
    const current = snapshot();
    if (selection && selection.option === current.selected && !pending(config.selector)) selection = undefined;
    const ready = Boolean(view.customElements.get(TAG)) && typeof view.loadCardHelpers === 'function';
    for (const { choice, floor } of choices) {
      choice.setAttribute('aria-pressed', String(!selection && current.selected === floor.option));
      choice.disabled = !ready || selection?.working || pending(config.selector) ||
        current.selected === floor.option || !current.choices.includes(floor);
    }
    status.textContent = t(selection ? selection.working ? 'vacuum_map_waiting' : 'vacuum_map_unconfirmed'
      : ready ? 'vacuum_map_unavailable' : 'vacuum_map_dependency');
    status.hidden = false;
    if (!ready || !current.map || selection || pending(config.selector)) { remove(); return; }
    const key = keyFor(current.map);
    if (attached?.key === key) {
      status.hidden = true;
      if (attached.hass !== hass) {
        attached.hass = hass;
        setMapHass(attached.card, current.map, key);
      }
      return;
    }
    if (loading?.key === key) { status.textContent = t('vacuum_map_loading'); return; }
    remove();
    if (failedKey === key) return;
    status.textContent = t('vacuum_map_loading');
    const attempt = { key };
    loading = attempt;
    const matches = () => {
      const live = active() && !selection && snapshot().map;
      return loading === attempt && live && keyFor(live) === key ? live : null;
    };
    void (async () => {
      try {
        const helper = await view.loadCardHelpers();
        if (!matches()) return;
        const card = await helper?.createCardElement(cardConfig(config, current.map, locale));
        const live = matches();
        if (!live) return;
        if (card?.localName !== TAG) throw new Error('Vacuum map card unavailable');
        attached = { card, key, hass };
        slot.append(card);
        setMapHass(card, live, key);
        status.hidden = true;
      } catch {
        if (loading === attempt) {
          failedKey = key;
          remove();
          status.textContent = t('vacuum_map_unavailable');
        }
      } finally {
        if (loading === attempt) loading = undefined;
      }
    })();
  }

  for (const event of ['location-changed', 'popstate']) {
    view.addEventListener(event, sync, { signal: events.signal });
  }
  view.navigation?.addEventListener('currententrychange', sync, { signal: events.signal });
  observer.observe(dialog, { attributes: true, attributeFilter: ['open', 'data-closing'] });
  return {
    update(state) { hass = state; sync(); },
    dispose() { disposed = true; events.abort(); observer.disconnect(); remove(); },
  };
}
