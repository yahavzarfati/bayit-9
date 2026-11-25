const MEDIA = { pause: 1, volume: 4, mute: 8, previous: 16, next: 32, on: 128, off: 256,
  volume_step: 1024, source: 2048, stop: 4096, play: 16384 };
const MEDIA_ON_STATES = ['on', 'idle', 'playing', 'paused', 'buffering'];
const MEDIA_STANDBY_STATES = ['off', 'standby'];
const VACUUM = { pause: 4, stop: 8, dock: 16, speed: 32, locate: 512, start: 8192 };

const MEDIA_ENTITY = /^media_player\.[a-z0-9_]+$/;

export function normalizeMediaRemote(value, visible = () => true) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const remote = Object.fromEntries(['transport_entity', 'volume_entity', 'power_entity'].flatMap(key => {
    const entity = value[key];
    return typeof entity === 'string' && MEDIA_ENTITY.test(entity) && visible(entity) ? [[key, entity]] : [];
  }));
  return Object.keys(remote).length ? { ...remote, allow_standby: value.allow_standby === true } : undefined;
}

export function mediaServiceRegistered(hass, service) {
  const registered = hass?.services?.media_player;
  return !!registered && Object.hasOwn(registered, service);
}

export function compactMediaMutePlaceholder(model) {
  const features = model.attributes.supported_features;
  return model.available && MEDIA_STANDBY_STATES.includes(model.state) &&
    Number.isSafeInteger(features) && features >= 0 && (features & MEDIA.mute) === MEDIA.mute;
}

export function returningVacuumLocate(model) {
  const features = model.attributes.supported_features;
  return model.domain === 'vacuum' && model.state === 'returning' &&
    Number.isSafeInteger(features) && features >= 0 && (features & VACUUM.locate) === VACUUM.locate;
}

export function compactRoomMediaCommands(model) {
  const { actions, state } = model;
  if (!model.available || !(MEDIA_ON_STATES.includes(state) || MEDIA_STANDBY_STATES.includes(state))) return [];
  const play = state === 'playing' ? actions.media_pause ? 'media_pause' : 'media_stop' : 'media_play';
  const next = ['playing', 'paused'].includes(state) && 'media_next_track';
  return ['turn_on', 'turn_off', play, next, 'mute', 'unmute'].filter(id => id && actions[id]);
}

function addRemoteActions(role, state, attributes, supports, add) {
  const remote = (id, fields) => add(id, { requiresMediaService: true, ...fields });
  if (role === 'transport') {
    if (supports(MEDIA.previous)) remote('media_previous_track');
    if (supports(MEDIA.pause) && supports(MEDIA.play)) remote('media_play_pause');
    if (supports(MEDIA.next)) remote('media_next_track');
  } else if (role === 'volume') {
    if (supports(MEDIA.volume_step)) {
      remote('volume_down');
      remote('volume_up');
    }
    if (supports(MEDIA.mute) && typeof attributes.is_volume_muted === 'boolean') {
      remote(attributes.is_volume_muted ? 'unmute' : 'mute', { service: 'volume_mute',
        fixedData: { is_volume_muted: !attributes.is_volume_muted } });
    }
  } else if (role === 'power') {
    if (MEDIA_STANDBY_STATES.includes(state) && supports(MEDIA.on)) remote('turn_on');
    if (MEDIA_ON_STATES.includes(state) && supports(MEDIA.off)) remote('turn_off');
  }
}

export function addSpecialDeviceActions(config, record, supports, add, options) {
  const attributes = record.attributes ?? {};
  const state = record.state;
  if (config.domain === 'media_player') {
    const standby = MEDIA_STANDBY_STATES.includes(state);
    const role = config.media_remote_role;
    if (role) {
      if (role === 'power' || !standby || config.media_remote_standby === true) {
        addRemoteActions(role, state, attributes, supports, add);
      }
      return;
    }
    if (standby) {
      if (supports(MEDIA.on)) add('turn_on');
      return;
    }
    if (supports(MEDIA.off)) add('turn_off');
    if (state === 'playing' && supports(MEDIA.pause)) add('media_pause');
    if (state !== 'playing' && supports(MEDIA.play)) add('media_play');
    if (supports(MEDIA.previous)) add('media_previous_track');
    if (supports(MEDIA.next)) add('media_next_track');
    if (['playing', 'paused', 'buffering'].includes(state) && supports(MEDIA.stop)) add('media_stop');
    if (supports(MEDIA.volume_step)) {
      add('volume_down');
      add('volume_up');
    }
    if (supports(MEDIA.volume)) add('volume_set', { min: 0, max: 100, step: 1 });
    if (supports(MEDIA.mute) && typeof attributes.is_volume_muted === 'boolean') {
      add(attributes.is_volume_muted ? 'unmute' : 'mute', { service: 'volume_mute',
        fixedData: { is_volume_muted: !attributes.is_volume_muted } });
    }
    if (supports(MEDIA.source)) options('select_source', attributes.source_list);
  }
  if (config.domain === 'vacuum') {
    if (state !== 'cleaning' && supports(VACUUM.start)) add('vacuum_start', { service: 'start' });
    if (state === 'cleaning' && supports(VACUUM.pause)) add('vacuum_pause', { service: 'pause' });
    if (['cleaning', 'paused', 'returning'].includes(state) && supports(VACUUM.stop)) add('vacuum_stop', { service: 'stop' });
    if (!['docked','returning'].includes(state) && supports(VACUUM.dock)) add('return_to_base');
    if (state !== 'returning' && supports(VACUUM.locate)) add('locate');
    if (supports(VACUUM.speed)) options('set_fan_speed', attributes.fan_speed_list);
  }
  if (['input_select','select'].includes(config.domain)) options('select_option', attributes.options);
  if (['input_button','button'].includes(config.domain)) {
    const immediate = config.domain === 'button' && config.role === 'action' &&
      (config.command === 'vacuum_program' || Boolean(config.light_status_refresh_for));
    add('press_button', { service: 'press', requiresConfirmation: !immediate });
  }
}

export function specialDeviceRequest(config, action, value) {
  const entity = config.entity;
  const state = result => ({ entity, state: result });
  const anyState = (...values) => ({ entity, anyState: values });
  const attribute = (name, target, tolerance) => ({ entity, attributes: { [name]: target }, tolerance });
  switch (action.id) {
    case 'turn_on': return config.domain === 'media_player' ? { expected: anyState(...MEDIA_ON_STATES) } : null;
    case 'turn_off': return config.domain === 'media_player' ? { expected: anyState(...MEDIA_STANDBY_STATES) } : null;
    case 'media_play': return { expected: state('playing') };
    case 'media_pause': return { expected: state('paused') };
    case 'media_stop': return { expected: anyState('idle','off','standby') };
    case 'vacuum_start': return { expected: state('cleaning') };
    case 'vacuum_pause': return { expected: state('paused') };
    case 'vacuum_stop': return { expected: anyState('idle','docked') };
    case 'return_to_base': return { expected: anyState('returning','docked') };
    case 'volume_set': return { data: { volume_level: value / 100 }, expected: attribute('volume_level',value / 100, .015) };
    case 'mute': case 'unmute': return { expected: attribute('is_volume_muted', action.id === 'mute') };
    case 'select_source': return { data: { source: value }, expected: attribute('source',value) };
    case 'set_fan_speed': return { data: { fan_speed: value }, expected: attribute('fan_speed',value) };
    case 'select_option': return { data: { option: value }, expected: state(value) };
    default: return null;
  }
}
