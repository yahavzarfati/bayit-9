// Portable Home Assistant device models and commands used by the dashboard UI.
import { addSpecialDeviceActions, specialDeviceRequest } from './media-device-support.mjs';
import { matchesLightColor, parseLightColor, supportsLightColor } from './light-color.mjs';

const ENTITY_ID = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
const VARIABLE = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const HEATING_DOMAINS = Object.freeze(["switch", "climate", "fan", "water_heater"]);
const HVAC_MODES = ["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"];

const LIGHT_EFFECT = 4;
const COVER = { open: 1, close: 2, position: 4, stop: 8 };
const FAN = { speed: 1, preset: 8, off: 16, on: 32 };
const CLIMATE = { temperature: 1, range: 2, fan: 8, preset: 16, swing: 32, off: 128, on: 256 };
const WATER_HEATER = { temperature: 1, operation: 2, power: 8 };

const SERVICES = {
  open: "open_cover",
  close: "close_cover",
  stop: "stop_cover",
  set_position: "set_cover_position",
  set_brightness: "turn_on",
  set_color_temp_kelvin: "turn_on",
  set_effect: "turn_on",
  set_temperature_range: "set_temperature",
  run_script: "turn_on",
};

const PARAMETER = {
  set_position: "position",
  set_brightness: "brightness_pct",
  set_color_temp_kelvin: "color_temp_kelvin",
  set_effect: "effect",
  set_percentage: "percentage",
  set_hvac_mode: "hvac_mode",
  set_fan_mode: "fan_mode",
  set_swing_mode: "swing_mode",
  set_preset_mode: "preset_mode",
  set_operation_mode: "operation_mode",
  set_temperature: "temperature",
};

const READ_ONLY_ROLES = new Set(["status", "forecast", "sun", "graph", "person"]);
const REQUEST_TIMED_OUT = Symbol("request-timed-out");

export class DeviceControlError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "DeviceControlError";
    this.code = code;
  }
}

function isEntity(value, domain) {
  return typeof value === "string" && ENTITY_ID.test(value) && (!domain || value.startsWith(domain + "."));
}

function isAvailable(record) {
  return typeof record?.state === "string" && record.state !== "" &&
    !["unavailable", "unknown"].includes(record.state);
}

function timedProfile(profile, domain, kind) {
  if (profile === undefined) return null;
  if (!profile || typeof profile !== "object" || Array.isArray(profile) || !HEATING_DOMAINS.includes(domain)) {
    throw new DeviceControlError("invalid_config", "A timed profile requires a heating-capable entity.");
  }
  const { start_script, stop_script, timer_entity, simple_timer_entity, simple_timer_target, duration_field = "duration",
    min_minutes = 1, max_minutes = 60, step_minutes = 1, presets, daily_usage_entity } = profile;
  if (
    (start_script !== undefined && !isEntity(start_script, "script")) ||
    (stop_script !== undefined && !isEntity(stop_script, "script")) ||
    (timer_entity !== undefined && !isEntity(timer_entity, "timer")) ||
    (simple_timer_entity !== undefined && (!isEntity(simple_timer_entity, "sensor") || start_script || stop_script || timer_entity)) ||
    (simple_timer_target !== undefined && (!simple_timer_entity || !(
      domain === "climate" && isEntity(simple_timer_target, "input_boolean") ||
      domain === "fan" && kind === "heater" && isEntity(simple_timer_target, "switch")
    ))) ||
    (daily_usage_entity !== undefined && !isEntity(daily_usage_entity, "sensor")) ||
    typeof duration_field !== "string" || !VARIABLE.test(duration_field) ||
    ![min_minutes, max_minutes, step_minutes].every(Number.isSafeInteger) ||
    min_minutes < 1 || max_minutes < min_minutes || step_minutes < 1
  ) {
    throw new DeviceControlError("invalid_config", "The timed profile includes an invalid entity or duration setting.");
  }
  return { start_script, stop_script, timer_entity, simple_timer_entity, simple_timer_target, duration_field,
    min_minutes, max_minutes, step_minutes, presets, daily_usage_entity };
}

function normalizedConfig(config) {
  if (!config || !isEntity(config.entity)) {
    throw new DeviceControlError("invalid_config", "Configure a Home Assistant entity ID.");
  }
  const domain = config.entity.split(".")[0];
  const kind = config.kind ?? domain;
  if (kind !== domain && (!["heater", "boiler"].includes(kind) || !HEATING_DOMAINS.includes(domain))) {
    throw new DeviceControlError("invalid_config", "The entity does not support the requested device profile.");
  }
  if (config.level_entity !== undefined &&
      (!["heater", "boiler"].includes(kind) || !isEntity(config.level_entity, "number"))) {
    throw new DeviceControlError("invalid_config", "Heating level requires a number entity in a heating profile.");
  }
  if (config.level_steps !== undefined && (kind !== "heater" || domain !== "fan" || config.level_entity ||
      !Number.isSafeInteger(config.level_steps) || config.level_steps < 2 || config.level_steps > 12)) {
    throw new DeviceControlError("invalid_config", "Fan heating levels require an integer step count from 2 to 12.");
  }
  if (config.level_read_entity !== undefined && (!config.level_steps || !isEntity(config.level_read_entity, "input_number"))) {
    throw new DeviceControlError("invalid_config", "Fan heating level feedback requires a numeric helper.");
  }
  const timed = timedProfile(config.timed, domain, kind);
  if (config.level_select_script !== undefined && (!isEntity(config.level_select_script, "script") ||
      !config.level_steps || !config.level_read_entity || !timed?.simple_timer_entity)) {
    throw new DeviceControlError("invalid_config", "Heater level selection requires a script, step feedback and Simple Timer.");
  }
  if (config.level_preselect_entity !== undefined && (!isEntity(config.level_preselect_entity, "input_number") ||
      !config.level_steps || !timed?.simple_timer_target)) {
    throw new DeviceControlError("invalid_config", "Next-start level requires a numeric helper and a heater with a linked Simple Timer switch.");
  }
  if (config.confirmation_ms !== undefined &&
      (!Number.isSafeInteger(config.confirmation_ms) || config.confirmation_ms < 0)) {
    throw new DeviceControlError("invalid_config", "The confirmation time must be a nonnegative number of milliseconds.");
  }
  return { ...config, kind, domain, timed };
}

function durationMs(value) {
  if (typeof value !== "string") return null;
  const parts = /^(?:(\d+) days?, )?(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,6}))?$/.exec(value);
  if (!parts) return null;
  const [, days, hours, minutes, seconds, fraction] = parts;
  const result = ((Number(days ?? 0) * 24 + Number(hours)) * 3600 + Number(minutes) * 60 +
    Number(seconds) + (fraction ? Number("0." + fraction) : 0)) * 1000;
  return Number.isFinite(result) ? result : null;
}

function timerDeadline(value) {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)
    ? Date.parse(value) : NaN;
}

function readTimer(entity, states, nowMs) {
  if (!entity) return null;
  const record = states?.[entity];
  const state = ["active", "paused", "idle"].includes(record?.state) ? record.state : "unavailable";
  const rawDeadline = state === "active" ? timerDeadline(record.attributes?.finishes_at) : NaN;
  const deadlineMs = Number.isFinite(rawDeadline) ? rawDeadline : null;
  let remainingMs = null;
  if (deadlineMs !== null) remainingMs = Math.max(0, deadlineMs - nowMs);
  if (state === "paused") remainingMs = durationMs(record.attributes?.remaining);
  if (state === "idle") remainingMs = 0;
  return { entity, state, deadlineMs, remainingMs };
}

function readSimpleTimer(entity, device, states, nowMs) {
  if (!entity) return null;
  const record = states?.[entity];
  const attrs = record?.attributes;
  if (!isAvailable(record) || attrs?.switch_entity_id !== device || !["active", "idle"].includes(attrs.timer_state)) {
    return { entity, state: "unavailable", deadlineMs: null, remainingMs: null };
  }
  const deadline = attrs.timer_state === "active" ? timerDeadline(attrs.timer_finishes_at) : NaN;
  const deadlineMs = Number.isFinite(deadline) ? deadline : null;
  const seconds = record.state.trim() ? Number(record.state) : NaN;
  return {
    entity, state: attrs.timer_state, deadlineMs,
    remainingMs: attrs.timer_state === "idle" ? 0 : deadlineMs === null ? null : Math.max(0, deadlineMs - nowMs),
    usedSeconds: Number.isFinite(seconds) && seconds >= 0 ? seconds : null,
    reverse: attrs.reverse_mode === true && attrs.timer_state === "active",
  };
}

function verifiedLevel(record, steps) {
  if (!isAvailable(record) || !record.state.trim()) return null;
  const value = Number(record.state);
  const { min, max, step } = record.attributes ?? {};
  return Number.isSafeInteger(value) && [0, 1].includes(min) && Number.isSafeInteger(max) &&
    max >= steps && step === 1 && value >= min && value <= steps ? value : null;
}

function supportedActions(config, states, record, timer, nowMs) {
  const actions = {};
  const confirmationText = typeof config.confirmation === "string" ? config.confirmation.trim().slice(0, 200) : "";
  const add = (id, fields) => {
    const guarded = id !== "more_info" && (config.confirmation === true || !!confirmationText);
    actions[id] = { id, ...fields, requiresConfirmation: guarded || !!fields?.requiresConfirmation };
    if (guarded && confirmationText) actions[id].confirmationText = confirmationText;
  };
  const power = () => { add("turn_on"); add("turn_off"); };
  const options = (id, values, allowed) => {
    if (!Array.isArray(values)) return;
    const clean = [...new Set(values.filter(value =>
      typeof value === "string" && value.length > 0 && (!allowed || allowed.includes(value))))];
    if (clean.length) add(id, { options: clean });
  };
  const timing = config.timed;
  if (record) add("more_info");
  const readyButton = ["button","input_button"].includes(config.domain) && record?.state === "unknown";
  if ((!isAvailable(record) && !readyButton) || READ_ONLY_ROLES.has(config.role)) return actions;
  const attributes = record.attributes ?? {};
  const flags = Number.isSafeInteger(attributes.supported_features) && attributes.supported_features >= 0
    ? attributes.supported_features : 0;
  const supports = flag => (flags & flag) === flag;
  const temperature = id => {
    const { min_temp: min, max_temp: max, target_temp_step } = attributes;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return;
    const step = Number.isFinite(target_temp_step) && target_temp_step > 0 ? target_temp_step : null;
    add(id, { min, max, step });
  };

  switch (config.domain) {
    case "switch":
    case "automation":
      power();
      break;
    case "script": {
      const explicitlyUnconfirmed = config.role === "action" && config.command === "run_script" && config.confirmation === false;
      add("run_script", { requiresConfirmation: !explicitlyUnconfirmed });
      break;
    }
    case "light": {
      power();
      const modes = Array.isArray(attributes.supported_color_modes) ? attributes.supported_color_modes : [];
      if (modes.some(mode => ["brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"].includes(mode))
          || Number.isFinite(attributes.brightness)) {
        add("set_brightness", { min: 0, max: 100, step: 1 });
      }
      const { min_color_temp_kelvin: min, max_color_temp_kelvin: max, effect_list: effects } = attributes;
      if (modes.includes("color_temp") && Number.isSafeInteger(min) && Number.isSafeInteger(max) && min > 0 && min < max) {
        add("set_color_temp_kelvin", { min, max, step: 1 });
      }
      if (supportsLightColor(modes)) add("set_light_color", { color: true });
      if (supports(LIGHT_EFFECT) && Array.isArray(effects)) {
        options("set_effect", effects.filter(name => typeof name === "string" && name.trim()));
      }
      break;
    }
    case "cover":
      if (supports(COVER.open)) add("open");
      if (supports(COVER.close)) add("close");
      if (supports(COVER.stop)) add("stop");
      if (supports(COVER.position)) add("set_position", { min: 0, max: 100, step: 1 });
      break;
    case "fan":
      if (supports(FAN.on)) add("turn_on");
      if (supports(FAN.off)) add("turn_off");
      if (supports(FAN.speed)) add("set_percentage", { min: 0, max: 100, step: 1 });
      if (supports(FAN.preset)) options("set_preset_mode", attributes.preset_modes);
      break;
    case "climate":
      if (supports(CLIMATE.on)) add("turn_on");
      if (supports(CLIMATE.off)) add("turn_off");
      options("set_hvac_mode", attributes.hvac_modes, HVAC_MODES);
      if (supports(CLIMATE.temperature)) temperature("set_temperature");
      if (supports(CLIMATE.range)) temperature("set_temperature_range");
      if (supports(CLIMATE.fan)) options("set_fan_mode", attributes.fan_modes);
      if (supports(CLIMATE.swing)) options("set_swing_mode", attributes.swing_modes);
      if (supports(CLIMATE.preset)) options("set_preset_mode", attributes.preset_modes);
      break;
    case "water_heater":
      if (supports(WATER_HEATER.power)) power();
      if (supports(WATER_HEATER.temperature)) temperature("set_temperature");
      if (supports(WATER_HEATER.operation)) options("set_operation_mode", attributes.operation_list);
      break;
    case "lock": {
      const requiresCode = typeof attributes.code_format === "string" && attributes.code_format.length > 0;
      add("lock", { requiresCode });
      add("unlock", { requiresCode, requiresConfirmation: true });
      break;
    }
    default:
      addSpecialDeviceActions(config, record, supports, add, options);
      break;
  }

  const timedStart = timing?.start_script || timing?.simple_timer_entity;
  const timedHeat = timedStart && (config.kind === "heater" || config.kind === "boiler");
  if (timedHeat || timing?.start_script) {
    // Mapped heat starts go through a server-side timer that owns automatic cutoff.
    if (!actions.turn_off) {
      if (actions.set_hvac_mode?.options.includes("off")) {
        add("turn_off", { service: "set_hvac_mode", fixedData: { hvac_mode: "off" } });
      } else if (actions.set_operation_mode?.options.includes("off")) {
        add("turn_off", { service: "set_operation_mode", fixedData: { operation_mode: "off" } });
      } else if (actions.set_percentage) {
        add("turn_off", { service: "set_percentage", fixedData: { percentage: 0 } });
      }
    }
    for (const action of ["turn_on", "set_hvac_mode", "set_operation_mode", "set_percentage",
      "set_temperature", "set_temperature_range", "set_fan_mode", "set_swing_mode", "set_preset_mode"]) {
      delete actions[action];
    }
  }
  const duration = () => ({ min: timing.min_minutes, max: timing.max_minutes, step: timing.step_minutes,
    ...(timing.presets !== undefined && { presets: timing.presets }) });
  if (timing?.start_script && isAvailable(states?.[timing.start_script])) add("start_timed", duration());
  if (timing?.simple_timer_entity && timer?.state === "idle") add("start_timed", duration());
  if (timing?.simple_timer_entity && timer?.state === "active") {
    if (timer.deadlineMs > nowMs) add("extend_timed", duration());
    add("stop_timed");
    if (timedHeat) delete actions.turn_off;
  }
  const canSetLevel = !timedStart || (timer?.state === "active" && timer.deadlineMs > nowMs);
  if (config.level_entity && canSetLevel) {
    const level = states?.[config.level_entity];
    const { min, max, step } = level?.attributes ?? {};
    if (isAvailable(level) && level.state.trim() && Number.isFinite(Number(level.state)) &&
        [min, max, step].every(Number.isFinite) && max >= min && step > 0) {
      add("set_heating_level", { min, max, step });
    }
  }
  if (config.level_select_script) {
    const switchEntity = timing.simple_timer_target;
    const powerMatches = (record.state === "on" || (record.state === "off" && !config.level_preselect_entity)) &&
      (!switchEntity || states?.[switchEntity]?.state === record.state);
    const timerReady = timer?.state === "idle" ||
      (timer?.state === "active" && timer.deadlineMs > nowMs && record.state === "on" && !timer.reverse);
    if (powerMatches && timerReady && states?.[config.level_select_script]?.state === "off" &&
        verifiedLevel(states?.[config.level_read_entity], config.level_steps) !== null) {
      add("set_heating_level", { min: 1, max: config.level_steps, step: 1 });
    }
  } else if (config.level_steps && canSetLevel && supports(FAN.speed) && record.state === "on") {
    add("set_heating_level", { min: 1, max: config.level_steps, step: 1 });
    delete actions.set_percentage;
  }
  if (config.level_preselect_entity && record.state === "off" && timer?.state === "idle" &&
      states?.[timing.simple_timer_target]?.state === "off" &&
      verifiedLevel(states?.[config.level_preselect_entity], config.level_steps) !== null) {
    add("preselect_heating_level", { min: 1, max: config.level_steps, step: 1 });
  }
  if (timing?.stop_script && isAvailable(states?.[timing.stop_script])) {
    add("stop_timed");
    delete actions.turn_off;
  }
  return actions;
}

function deviceModel(config, states, nowMs) {
  const record = states?.[config.entity];
  const attributes = record?.attributes ?? {};
  const timer = config.timed?.simple_timer_entity
    ? readSimpleTimer(config.timed.simple_timer_entity, config.timed.simple_timer_target ?? config.entity, states, nowMs)
    : readTimer(config.timed?.timer_entity, states, nowMs);
  const usage = states?.[config.timed?.daily_usage_entity];
  if (timer && isAvailable(usage) && usage.state.trim()) {
    const multiplier = { s: 1, min: 60, h: 3600 }[usage.attributes?.unit_of_measurement];
    const seconds = Number(usage.state) * multiplier;
    if (Number.isFinite(seconds) && seconds >= 0) timer.usedSeconds = seconds;
  }
  const level = states?.[config.level_entity ?? config.level_read_entity];
  const preselect = config.level_preselect_entity && record?.state === "off";
  const explicitLevel = isAvailable(level) && level.state.trim() ? Number(level.state) : NaN;
  const percentageLevel = config.level_steps && Number.isFinite(attributes.percentage)
    ? Math.round(attributes.percentage * config.level_steps / 100) : null;
  return {
    entity: config.entity,
    domain: config.domain,
    kind: config.kind,
    name: config.name || attributes.friendly_name || config.entity,
    icon: config.icon || attributes.icon || null,
    state: record?.state ?? "missing",
    available: isAvailable(record),
    attributes,
    actions: supportedActions(config, states, record, timer, nowMs),
    level: preselect ? verifiedLevel(states?.[config.level_preselect_entity], config.level_steps)
      : config.level_select_script ? verifiedLevel(level, config.level_steps)
      : Number.isFinite(explicitLevel) ? explicitLevel : percentageLevel,
    ...(config.level_steps && !READ_ONLY_ROLES.has(config.role) && {
      levelRange: { min: 1, max: config.level_steps, step: 1 },
      levelAction: preselect ? "preselect_heating_level" : "set_heating_level",
      levelChanging: !!config.level_select_script && states?.[config.level_select_script]?.state === "on",
    }),
    timer,
  };
}

export function getDeviceModel(config, states, nowMs = Date.now()) {
  return deviceModel(normalizedConfig(config), states, nowMs);
}

function validNumber(value, { min, max, step }) {
  if (!Number.isFinite(value) || value < min || value > max) return false;
  if (!step) return true;
  const increments = (value - min) / step;
  return value === max || Math.abs(increments - Math.round(increments)) < 1e-7;
}

function expectedState(config, action, value, states) {
  const attribute = (name, target, tolerance) => ({
    entity: config.entity, attributes: { [name]: target }, tolerance,
  });
  const state = target => ({ entity: config.entity, state: target });
  switch (action) {
    case "turn_on":
      return ["light", "switch", "fan", "automation"].includes(config.domain) ? state("on") : null;
    case "turn_off":
      return state("off");
    case "open":
      return state("open");
    case "close":
      return state("closed");
    case "stop":
      return ["opening", "closing"].includes(states?.[config.entity]?.state)
        ? { entity: config.entity, anyState: ["open", "closed"] } : null;
    case "set_position":
      return attribute("current_position", value);
    case "set_brightness":
      return value === 0 ? state("off") : {
        ...attribute("brightness", Math.round(value * 255 / 100), 2), state: "on",
      };
    case "set_color_temp_kelvin":
    case "set_effect":
      return { ...attribute(PARAMETER[action], value), state: "on" };
    case "set_percentage":
      return value === 0 ? state("off") : attribute("percentage", value);
    case "lock":
      return state("locked");
    case "unlock":
      return state("unlocked");
    case "set_hvac_mode":
    case "set_operation_mode":
      return state(value);
    case "set_fan_mode":
    case "set_swing_mode":
    case "set_preset_mode":
    case "set_temperature":
      return attribute(PARAMETER[action], value, 1e-6);
    case "set_temperature_range":
      return { entity: config.entity, attributes: { target_temp_low: value.low, target_temp_high: value.high },
        tolerance: 1e-6 };
    case "start_timed": {
      const timer = config.timed.timer_entity;
      const knownPowerState = ["switch", "fan"].includes(config.domain) ? state("on") : null;
      if (!timer) return knownPowerState;
      const formerDeadline = timerDeadline(states?.[timer]?.attributes?.finishes_at);
      return { all: [
        { entity: timer, state: "active", requireNewDeadline: true, formerDeadline },
        ...(knownPowerState ? [knownPowerState] : []),
      ] };
    }
    case "stop_timed":
      return config.timed.timer_entity
        ? { all: [{ entity: config.timed.timer_entity, state: "idle" }, state("off")] }
        : state("off");
    default:
      return null;
  }
}

export function planDeviceAction(config, states, actionId, value, { confirmed = false, code } = {}) {
  config = normalizedConfig(config);
  const model = deviceModel(config, states, Date.now());
  const action = typeof actionId === "string" && Object.hasOwn(model.actions, actionId) && model.actions[actionId];
  if (!action) throw new DeviceControlError("action_unavailable", "This entity does not currently support that action.");
  if (action.requiresConfirmation && confirmed !== true) {
    throw new DeviceControlError("confirmation_required", "This action requires explicit confirmation.");
  }
  if (action.requiresCode && (typeof code !== "string" || !code.trim() || code.length > 64)) {
    throw new DeviceControlError("pin_required", "Enter the lock code in Home Assistant.");
  }
  if (actionId === "more_info") return { kind: "more_info", entity: config.entity };
  if (actionId === "set_temperature_range") {
    if (!value || !validNumber(value.low, action) || !validNumber(value.high, action) || value.low > value.high) {
      throw new DeviceControlError("invalid_value", "The selected temperature range is invalid.");
    }
  } else if (action.options ? !action.options.includes(value) :
    action.min !== undefined && !validNumber(value, action)) {
    throw new DeviceControlError("invalid_value", "The selected value is outside the published device options.");
  }

  if (actionId === "set_light_color") {
    const color = parseLightColor(value);
    if (!color) throw new DeviceControlError("invalid_value", "Select a valid light color.");
    return {
      kind: "service", domain: "light", service: "turn_on", target: { entity_id: config.entity },
      data: { rgb_color: color }, expected: { entity: config.entity, state: "on", lightColor: color },
    };
  }
  if (actionId === "preselect_heating_level") {
    return {
      kind: "service", domain: "input_number", service: "set_value",
      target: { entity_id: config.level_preselect_entity }, data: { value },
      expected: { entity: config.level_preselect_entity, numericState: value },
    };
  }
  if (actionId === "set_heating_level") {
    if (config.level_select_script) {
      const power = config.timed.simple_timer_target;
      return {
        kind: "service", domain: "script", service: config.level_select_script.slice("script.".length),
        target: null, data: { target_step: value },
        expected: { all: [
          { entity: config.level_read_entity, numericState: value },
          { entity: config.entity, state: model.state },
          ...(power ? [{ entity: power, state: model.state }] : []),
          { entity: config.timed.simple_timer_entity, attributes: { switch_entity_id: power ?? config.entity } },
          { entity: config.level_select_script, state: "off" },
        ] },
      };
    }
    if (config.level_steps) {
      const percentage = Math.round(value * 100 / config.level_steps);
      const expected = config.level_read_entity
        ? { entity: config.level_read_entity, numericState: value }
        : { entity: config.entity, attributes: { percentage }, tolerance: 1 };
      return { kind: "service", domain: "fan", service: "set_percentage",
        target: { entity_id: config.entity }, data: { percentage }, expected };
    }
    return {
      kind: "service", domain: "number", service: "set_value",
      target: { entity_id: config.level_entity }, data: { value },
      expected: { entity: config.level_entity, numericState: value },
    };
  }
  if (config.timed?.simple_timer_entity && ["start_timed", "extend_timed", "stop_timed"].includes(actionId)) {
    const entity = config.timed.simple_timer_entity;
    const cancel = actionId === "stop_timed";
    const linkedEntity = config.timed.simple_timer_target ?? config.entity;
    const timerState = { entity, attributes: { switch_entity_id: linkedEntity, timer_state: cancel ? "idle" : "active" } };
    let expected = timerState;
    if (cancel) {
      if (config.domain === "water_heater") timerState.attributes.device_active = false;
      else expected = { all: [timerState, { entity: config.entity, state: "off" }] };
    } else {
      timerState.deadlineAttribute = "timer_finishes_at";
      timerState.requireNewDeadline = true;
      timerState.formerDeadline = timerDeadline(states?.[entity]?.attributes?.timer_finishes_at);
      if (actionId === "start_timed") {
        timerState.attributes.device_active = true;
        const powerCondition = config.domain === "climate" ? {
          entity: config.entity, anyState: HVAC_MODES.filter(mode => mode !== "off"),
        } : config.domain === "fan" || config.domain === "switch" ? { entity: config.entity, state: "on" } : null;
        if (powerCondition) expected = { all: [timerState, powerCondition] };
      }
    }
    return {
      kind: "service", domain: "simple_timer",
      service: cancel ? "cancel_timer" : actionId === "extend_timed" ? "add_timer" : "start_timer",
      target: null,
      data: cancel ? { entity_id: entity, turn_off_entity: true }
        : { entity_id: entity, duration: value, unit: "min", ...(actionId === "start_timed" && { reverse_mode: false }) },
      expected,
    };
  }
  const special = specialDeviceRequest(config, action, value);
  const expected = special?.expected ?? expectedState(config, actionId, value, states);
  if (actionId === "start_timed" || actionId === "stop_timed") {
    const start = actionId === "start_timed";
    const script = start ? config.timed.start_script : config.timed.stop_script;
    return {
      kind: "service",
      domain: "script",
      service: script.split(".")[1],
      target: null,
      data: start ? { [config.timed.duration_field]: value } : {},
      expected,
    };
  }
  const data = special?.data ?? (actionId === "set_temperature_range" ? {
    target_temp_low: value.low, target_temp_high: value.high,
  } : PARAMETER[actionId] ? { [PARAMETER[actionId]]: value } : { ...action.fixedData });
  if (action.requiresCode) data.code = code;
  return {
    kind: "service",
    domain: model.domain,
    service: action.service ?? SERVICES[actionId] ?? actionId,
    target: { entity_id: config.entity },
    data,
    expected,
  };
}

function observed(expected, states) {
  if (expected.all) return expected.all.every(condition => observed(condition, states));
  const record = states?.[expected.entity];
  if (!isAvailable(record)) return false;
  if (expected.state !== undefined && expected.state !== record.state) return false;
  if (expected.anyState && !expected.anyState.includes(record.state)) return false;
  if (expected.lightColor && !matchesLightColor(record.attributes, expected.lightColor)) return false;
  if (expected.numericState !== undefined &&
      (!record.state.trim() || !(Math.abs(Number(record.state) - expected.numericState) <= 1e-7))) return false;
  if (expected.requireNewDeadline) {
    const deadline = timerDeadline(record.attributes?.[expected.deadlineAttribute ?? "finishes_at"]);
    if (!Number.isFinite(deadline) || deadline === expected.formerDeadline) return false;
  }
  return Object.entries(expected.attributes ?? {}).every(([key, target]) => {
    const value = record.attributes?.[key];
    return typeof target === "number"
      ? Number.isFinite(value) && Math.abs(value - target) <= (expected.tolerance ?? 0)
      : value === target;
  });
}

const delay = millis => new Promise(resolve => setTimeout(resolve, millis));
const monotonic = () => globalThis.performance.now();

function boundRequest(request, timeout) {
  let timer;
  const deadline = new Promise(resolve => { timer = setTimeout(() => resolve(REQUEST_TIMED_OUT), timeout); });
  return Promise.race([request, deadline]).finally(() => clearTimeout(timer));
}

export function createDeviceController({
  getHass,
  confirmationTimeoutMs,
  requestTimeoutMs = 10000,
  pollIntervalMs = 100,
  sleep = delay,
  now = monotonic,
} = {}) {
  if (typeof getHass !== "function" || typeof sleep !== "function" || typeof now !== "function" ||
      !Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 2147483647 ||
      !Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 1 ||
      (confirmationTimeoutMs !== undefined && (!Number.isSafeInteger(confirmationTimeoutMs) || confirmationTimeoutMs < 0))) {
    throw new DeviceControlError("invalid_config", "The dashboard connection or timeout setting is invalid.");
  }
  const latest = new Map();

  return {
    async execute(config, actionId, value, options) {
      const hass = getHass();
      const plan = planDeviceAction(config, hass?.states, actionId, value, options);
      if (plan.kind === "more_info") return { status: "more_info", entity: plan.entity };
      if (typeof hass?.callWS !== "function") {
        throw new DeviceControlError("service_unavailable", "The Home Assistant connection is unavailable.");
      }

      const entity = config.entity;
      const token = Symbol(entity);
      latest.set(entity, token);
      const result = (status, reason) => ({ status, entity, action: actionId, ...(reason ? { reason } : {}) });
      try {
        const request = { type: "call_service", domain: plan.domain, service: plan.service, service_data: plan.data };
        if (plan.target) request.target = plan.target;
        let reply;
        try {
          reply = await boundRequest(Promise.resolve(hass.callWS(request)), requestTimeoutMs);
        } catch (cause) {
          if (latest.get(entity) !== token) return result("unconfirmed", "superseded");
          throw new DeviceControlError("service_failed", "Home Assistant rejected or could not deliver the command.", { cause });
        }
        if (latest.get(entity) !== token) return result("unconfirmed", "superseded");
        if (reply === REQUEST_TIMED_OUT) return result("unconfirmed", "request_timeout");
        const windowMs = config.confirmation_ms ?? confirmationTimeoutMs ?? (plan.domain === "cover" ? 45000 : 8000);
        if (!plan.expected || !windowMs) return result("sent");

        const deadline = now() + windowMs;
        for (;;) {
          if (latest.get(entity) !== token) return result("unconfirmed", "superseded");
          if (observed(plan.expected, getHass()?.states)) return result("confirmed");
          const remaining = deadline - now();
          if (remaining <= 0) return result("unconfirmed", "state_timeout");
          await sleep(Math.min(pollIntervalMs, remaining));
        }
      } finally {
        if (latest.get(entity) === token) latest.delete(entity);
      }
    },
  };
}
