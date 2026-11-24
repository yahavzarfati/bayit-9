import assert from "node:assert/strict";
import test from "node:test";
import { createDeviceController, DeviceControlError, getDeviceModel, planDeviceAction } from "../src/device-control.mjs";

const entity = (state, attributes = {}) => ({ state, attributes });
const config = (id, fields) => ({ entity: id, ...fields });
const code = value => error => error instanceof DeviceControlError && error.code === value;
const actionIds = model => Object.keys(model.actions).sort();

test("light brightness appears only when the light supports it", () => {
  const dim = config("light.task");
  const simple = config("light.basic");
  const states = {
    [dim.entity]: entity("on", { friendly_name: "Task", supported_color_modes: ["color_temp"], brightness: 128 }),
    [simple.entity]: entity("off", { supported_color_modes: ["onoff"] }),
  };
  assert.equal(getDeviceModel(dim, states).name, "Task");
  assert.deepEqual(actionIds(getDeviceModel(simple, states)), ["more_info", "turn_off", "turn_on"]);
  assert.throws(() => planDeviceAction(simple, states, "set_brightness", 50), code("action_unavailable"));
  const p = planDeviceAction(dim, states, "set_brightness", 75);
  assert.equal(p.service, "turn_on");
  assert.deepEqual(p.target, { entity_id: dim.entity });
  assert.deepEqual(p.data, { brightness_pct: 75 });
  assert.equal(p.expected.attributes.brightness, 191);
});

test("cover controls honor feature bits and absolute position never uses toggle", () => {
  const c = config("cover.sunshade");
  const states = { [c.entity]: entity("opening", { supported_features: 13, current_position: 12 }) };
  assert.deepEqual(actionIds(getDeviceModel(c, states)), ["more_info", "open", "set_position", "stop"]);
  assert.throws(() => planDeviceAction(c, states, "close"), code("action_unavailable"));
  assert.deepEqual(planDeviceAction(c, states, "set_position", 0).data, { position: 0 });
  assert.deepEqual(planDeviceAction(c, states, "stop").expected.anyState, ["open", "closed"]);
  for (const x of [-1, 101, 19.5, "25", Infinity]) {
    assert.throws(() => planDeviceAction(c, states, "set_position", x), code("invalid_value"));
  }
});

test("fan power, speed and preset are derived from advertised features", () => {
  const c = config("fan.room_circulator");
  const states = { [c.entity]: entity("on", { supported_features: 25, preset_modes: ["auto", "sleep", "auto", null] }) };
  const a = getDeviceModel(c, states).actions;
  assert.equal(a.turn_on, undefined);
  assert.ok(a.turn_off && a.set_percentage);
  assert.deepEqual(a.set_preset_mode.options, ["auto", "sleep"]);
  assert.deepEqual(planDeviceAction(c, states, "set_percentage", 0).expected, { entity: c.entity, state: "off" });
  assert.throws(() => planDeviceAction(c, states, "set_preset_mode", "invalid"), code("invalid_value"));
});

test("climate respects advertised HVAC modes, temperature grid, and target range", () => {
  const c = config("climate.upper_floor");
  const states = {
    [c.entity]: entity("heat_cool", {
      supported_features: 155, hvac_modes: ["off", "cool", "heat_cool", "injected"],
      min_temp: 10.5, max_temp: 32.5, target_temp_step: 0.5,
      fan_modes: ["auto", "slow"], preset_modes: ["away"],
    }),
  };
  const m = getDeviceModel(c, states);
  assert.deepEqual(m.actions.set_hvac_mode.options, ["off", "cool", "heat_cool"]);
  assert.equal(m.actions.turn_on, undefined);
  assert.ok(m.actions.turn_off);
  assert.deepEqual(planDeviceAction(c, states, "set_hvac_mode", "cool").data, { hvac_mode: "cool" });
  assert.deepEqual(planDeviceAction(c, states, "set_fan_mode", "slow").data, { fan_mode: "slow" });
  assert.deepEqual(planDeviceAction(c, states, "set_temperature_range", { low: 18, high: 25.5 }).data,
    { target_temp_low: 18, target_temp_high: 25.5 });
  assert.throws(() => planDeviceAction(c, states, "set_temperature_range", { low: 22, high: 18 }), code("invalid_value"));
  assert.throws(() => planDeviceAction(c, states, "set_temperature", 20.25), code("invalid_value"));
  assert.throws(() => planDeviceAction(c, states, "set_temperature", "20.5"), code("invalid_value"));
});

test("water heater exposes supported native power, operation and temperature", () => {
  const c = config("water_heater.dhw", { kind: "boiler" });
  const states = { [c.entity]: entity("eco", {
    supported_features: 11, min_temp: 35, max_temp: 60, target_temp_step: 1, operation_list: ["eco", "off"],
  }) };
  assert.equal(getDeviceModel(c, states).kind, "boiler");
  assert.equal(planDeviceAction(c, states, "turn_off").domain, "water_heater");
  assert.deepEqual(planDeviceAction(c, states, "set_operation_mode", "eco").data, { operation_mode: "eco" });
});

test("a linked climate timer has a compact timer model and uses exactly the verified Simple Timer target", () => {
  const c = config("climate.fixture", { timed: { simple_timer_entity: "sensor.runtime", simple_timer_target: "input_boolean.fixture_timer",
    min_minutes: 15, max_minutes: 120, step_minutes: 15, presets: [30, 60, 90, 120] } });
  const states = {
    [c.entity]: entity("off", { supported_features: 425, hvac_modes: ["off", "cool"], swing_modes: ["off", "vertical"],
      fan_modes: ["auto", "low"], min_temp: 15, max_temp: 30, target_temp_step: 1 }),
    "sensor.runtime": entity("600", { switch_entity_id: "input_boolean.fixture_timer", timer_state: "idle", device_active: false }),
  };
  const m = getDeviceModel(c, states);
  assert.equal(m.timer.usedSeconds, 600);
  assert.deepEqual(m.actions.start_timed.presets, [30, 60, 90, 120]);
  assert.ok(m.actions.turn_on && m.actions.set_temperature);
  assert.deepEqual(planDeviceAction(c, states, "set_swing_mode", "vertical").data, { swing_mode: "vertical" });
  const start = planDeviceAction(c, states, "start_timed", 60);
  assert.equal(start.domain + "." + start.service, "simple_timer.start_timer");
  assert.deepEqual(start.data, { entity_id: "sensor.runtime", duration: 60, unit: "min", reverse_mode: false });
  assert.deepEqual(start.expected.all[1].anyState.includes("off"), false);

  const updated = { ...states, "sensor.runtime": entity("615", {
    ...states["sensor.runtime"].attributes, timer_state: "active", device_active: true,
    timer_finishes_at: new Date(Date.now() + 300_000).toISOString(),
  }) };
  assert.equal(getDeviceModel(c, updated).actions.start_timed, undefined);
  assert.equal(planDeviceAction(c, updated, "extend_timed", 30).service, "add_timer");
  const stop = planDeviceAction(c, updated, "stop_timed");
  assert.deepEqual(stop.data, { entity_id: "sensor.runtime", turn_off_entity: true });
  assert.deepEqual(stop.expected.all[1], { entity: c.entity, state: "off" });

  const mismatch = { ...states, "sensor.runtime": entity("600", { switch_entity_id: "input_boolean.another_device", timer_state: "idle" }) };
  assert.equal(getDeviceModel(c, mismatch).timer.state, "unavailable");
  assert.throws(() => planDeviceAction(c, mismatch, "start_timed", 60), code("action_unavailable"));
});

test("a timed heater fan uses native speed to set a numbered level and only reads the helper", () => {
  const c = config("fan.heater_fixture", { kind: "heater", level_steps: 9, level_read_entity: "input_number.heater_level",
    timed: { simple_timer_entity: "sensor.heater_usage", simple_timer_target: "switch.heater_relay" } });
  const states = {
    [c.entity]: entity("on", { supported_features: 49, percentage: 33 }),
    "sensor.heater_usage": entity("300", { switch_entity_id: "switch.heater_relay", timer_state: "active", device_active: true,
      timer_finishes_at: new Date(Date.now() + 300_000).toISOString() }),
    "input_number.heater_level": entity("3"),
  };
  const level = planDeviceAction(c, states, "set_heating_level", 8);
  assert.equal(level.domain + "." + level.service, "fan.set_percentage");
  assert.deepEqual(level.target, { entity_id: c.entity });
  assert.deepEqual(level.data, { percentage: 89 });
  assert.deepEqual(level.expected, { entity: "input_number.heater_level", numericState: 8 });
  assert.equal(getDeviceModel(c, states).level, 3);
  assert.throws(() => planDeviceAction(c, states, "set_heating_level", 0), code("invalid_value"));
  const idle = { ...states, "sensor.heater_usage": entity("300", { switch_entity_id: "switch.heater_relay", timer_state: "idle" }) };
  assert.equal(getDeviceModel(c, idle).actions.set_heating_level, undefined);
  assert.equal(getDeviceModel(c, idle).actions.turn_on, undefined);
  assert.ok(getDeviceModel(c, idle).actions.turn_off);
});

test("lock unlock requires explicit confirmation and an optional PIN stays in its one request", () => {
  const c = config("lock.entry");
  const states = { [c.entity]: entity("locked", { supported_features: 1, code_format: "^\\d{4}$" }) };
  const a = getDeviceModel(c, states).actions;
  assert.equal(a.unlock.requiresConfirmation, true);
  assert.equal(a.unlock.requiresCode, true);
  assert.throws(() => planDeviceAction(c, states, "unlock"), code("confirmation_required"));
  assert.throws(() => planDeviceAction(c, states, "unlock", null, { confirmed: "true" }), code("confirmation_required"));
  assert.throws(() => planDeviceAction(c, states, "unlock", null, { confirmed: true }), code("pin_required"));
  assert.deepEqual(planDeviceAction(c, states, "unlock", null, { confirmed: true, code: "0412" }).data, { code: "0412" });
  assert.throws(() => planDeviceAction(c, states, "open"), code("action_unavailable"));
  assert.equal(states[c.entity].attributes.code, undefined);
});

test("passive and unavailable entities support more-info but not writes", () => {
  const sensor = config("sensor.air_quality");
  const offline = config("switch.workbench");
  const missing = config("fan.unknown_room");
  const states = { [sensor.entity]: entity("good"), [offline.entity]: entity("unavailable") };
  assert.deepEqual(actionIds(getDeviceModel(sensor, states)), ["more_info"]);
  assert.deepEqual(actionIds(getDeviceModel(offline, states)), ["more_info"]);
  assert.deepEqual(actionIds(getDeviceModel(missing, states)), []);
  assert.throws(() => planDeviceAction(sensor, states, "turn_on"), code("action_unavailable"));
  assert.throws(() => planDeviceAction(offline, states, "turn_off"), code("action_unavailable"));
  assert.throws(() => planDeviceAction(sensor, states, "__proto__"), code("action_unavailable"));
  assert.throws(() => getDeviceModel({ entity: "switch.*" }, states), code("invalid_config"));
});

const heater = config("switch.floor_relay", {
  kind: "heater", timed: { start_script: "script.floor_heat_start", stop_script: "script.floor_heat_stop",
    timer_entity: "timer.floor_heat", min_minutes: 5, max_minutes: 60, step_minutes: 5 },
});
const heaterStates = () => ({
  [heater.entity]: entity("off"),
  [heater.timed.start_script]: entity("off"),
  [heater.timed.stop_script]: entity("off"),
  [heater.timed.timer_entity]: entity("idle"),
});

test("timed mapping delegates to explicit native scripts and retains read-only timer fallback", () => {
  const states = heaterStates();
  assert.deepEqual(actionIds(getDeviceModel(heater, states)), ["more_info", "start_timed", "stop_timed"]);
  const start = planDeviceAction(heater, states, "start_timed", 35);
  assert.equal(start.domain, "script");
  assert.equal(start.service, "floor_heat_start");
  assert.equal(start.target, null);
  assert.deepEqual(start.data, { duration: 35 });
  assert.deepEqual(planDeviceAction(heater, states, "stop_timed").data, {});
  assert.throws(() => planDeviceAction(heater, states, "start_timed", 22), code("invalid_value"));
  assert.throws(() => planDeviceAction(heater, states, "turn_on"), code("action_unavailable"));
  states[heater.timed.stop_script].state = "unavailable";
  assert.ok(getDeviceModel(heater, states).actions.turn_off);
  const display = config(heater.entity, { kind: "heater", timed: { timer_entity: heater.timed.timer_entity } });
  assert.deepEqual(actionIds(getDeviceModel(display, states)), ["more_info", "turn_off", "turn_on"]);
  assert.throws(() => getDeviceModel(config(heater.entity, {
    timed: { timer_entity: "sensor.not_a_native_timer" },
  }), states), code("invalid_config"));
  assert.throws(() => getDeviceModel(config(heater.entity, {
    timed: { start_script: "input_boolean.not_a_script" },
  }), states), code("invalid_config"));
});

test("timer shows HA expiry and paused remaining and preserves unknown", () => {
  const states = heaterStates();
  const timer = heater.timed.timer_entity;
  const now = Date.parse("2030-01-02T08:25:00Z");
  states[timer] = entity("active", { finishes_at: "2030-01-02T10:27:42+02:00" });
  assert.deepEqual(getDeviceModel(heater, states, now).timer, {
    entity: timer, state: "active", deadlineMs: now + 162000, remainingMs: 162000,
  });
  assert.equal(getDeviceModel(heater, states, now + 180000).timer.remainingMs, 0);
  states[timer] = entity("active", { finishes_at: "0", remaining: "12:34:00" });
  assert.equal(getDeviceModel(heater, states, now).timer.remainingMs, null);
  states[timer] = entity("paused", { remaining: "1 day, 0:02:01.120000" });
  assert.equal(getDeviceModel(heater, states, now).timer.remainingMs, 86521120);
  states[timer] = entity("unavailable");
  assert.equal(getDeviceModel(heater, states, now).timer.remainingMs, null);
});

function harness(states, setup = {}) {
  let time = 0;
  const calls = [];
  let hass = {
    states,
    callWS(request) {
      calls.push(request);
      return setup.callWS?.(request);
    },
  };
  const controller = createDeviceController({
    getHass: () => hass,
    requestTimeoutMs: setup.requestTimeoutMs ?? 200,
    confirmationTimeoutMs: setup.confirmationTimeoutMs ?? 50,
    pollIntervalMs: 10,
    now: () => time,
    sleep: async millis => {
      time += millis;
      await setup.onSleep?.(time, hass);
    },
  });
  return { controller, calls, setHass: next => { hass = next; } };
}

test("controller uses exact websocket target, observes current state, and handles more-info without a call", async () => {
  const c = config("cover.awning");
  const h = harness({ [c.entity]: entity("closed", { supported_features: 15, current_position: 0 }) }, {
    onSleep: (time, hass) => {
      if (time === 20) hass.states = { [c.entity]: entity("open", { supported_features: 15, current_position: 56 }) };
    },
  });
  const info = await h.controller.execute(c, "more_info");
  assert.deepEqual(info, { status: "more_info", entity: c.entity });
  assert.equal(h.calls.length, 0);
  const result = await h.controller.execute(c, "set_position", 56);
  assert.equal(result.status, "confirmed");
  assert.deepEqual(h.calls, [{ type: "call_service", domain: "cover", service: "set_cover_position",
    target: { entity_id: c.entity }, service_data: { position: 56 } }]);
  h.setHass({ states: { [c.entity]: entity("open", { supported_features: 3, current_position: 56 }) } });
  await assert.rejects(h.controller.execute(c, "set_position", 56), code("action_unavailable"));
  await assert.rejects(h.controller.execute(c, "close"), code("service_unavailable"));
});

test("no optimistic confirmation after ack, and zero observation window is acknowledgement only", async () => {
  const c = config("switch.office");
  const states = { [c.entity]: entity("off") };
  const h = harness(states);
  let result = await h.controller.execute(c, "turn_on");
  assert.equal(result.status, "unconfirmed");
  assert.equal(result.reason, "state_timeout");
  assert.equal(states[c.entity].state, "off");
  result = await h.controller.execute({ ...c, confirmation_ms: 0 }, "turn_on");
  assert.equal(result.status, "sent");
});

test("controller does not conflate backend rejection and uncertain delivery timeout", async () => {
  const c = config("switch.auxiliary");
  const states = { [c.entity]: entity("off") };
  const rejected = harness(states, { callWS: async () => { throw new Error("Service rejected"); } });
  await assert.rejects(rejected.controller.execute(c, "turn_on"), code("service_failed"));
  const slow = harness(states, { callWS: () => new Promise(() => {}), requestTimeoutMs: 10 });
  assert.equal((await slow.controller.execute(c, "turn_on")).reason, "request_timeout");
  assert.equal(slow.calls.length, 1);
});

test("a later action supersedes an older outstanding result on the same entity", async () => {
  const c = config("switch.deck");
  let release;
  const h = harness({ [c.entity]: entity("off") }, {
    callWS: request => request.service === "turn_on" ? new Promise(resolve => { release = resolve; }) : undefined,
  });
  const earlier = h.controller.execute(c, "turn_on");
  const later = await h.controller.execute(c, "turn_off");
  assert.equal(later.status, "confirmed");
  release({});
  assert.equal((await earlier).reason, "superseded");
});

test("timed start needs a fresh native deadline and the switch's reported on state", async () => {
  const states = heaterStates();
  const t = heater.timed.timer_entity;
  states[t] = entity("active", { finishes_at: "2030-01-02T08:30:00Z" });
  states[heater.entity] = entity("on");
  const stale = harness(states);
  assert.equal((await stale.controller.execute(heater, "start_timed", 10)).reason, "state_timeout");
  const relayOff = harness({ ...states, [heater.entity]: entity("off") }, {
    onSleep: (elapsed, hass) => { hass.states[t] = entity("active", { finishes_at: "2030-01-02T08:32:00Z" }); },
  });
  assert.equal((await relayOff.controller.execute(heater, "start_timed", 10)).reason, "state_timeout");
  const fresh = harness({ ...states, [heater.entity]: entity("off") }, {
    onSleep: (elapsed, hass) => {
      hass.states[t] = entity("active", { finishes_at: "2030-01-02T08:35:00Z" });
      if (elapsed >= 20) hass.states[heater.entity] = entity("on");
    },
  });
  assert.equal((await fresh.controller.execute(heater, "start_timed", 10)).status, "confirmed");
  assert.deepEqual(fresh.calls[0], {
    type: "call_service", domain: "script", service: "floor_heat_start", service_data: { duration: 10 },
  });
});

test("a stopped native timer cannot by itself confirm heater cutoff", async () => {
  const states = heaterStates();
  states[heater.entity] = entity("on");
  const h = harness(states);
  assert.equal((await h.controller.execute(heater, "stop_timed")).reason, "state_timeout");
  assert.deepEqual(h.calls[0].service_data, {});
});



test("timed controls retain an absolute native off fallback even when a mapped stop is unavailable", () => {
  const cases = [
    ["climate.heat_pump", { hvac_modes: ["off", "heat"] }, "set_hvac_mode", { hvac_mode: "off" }],
    ["water_heater.tank", { supported_features: 2, operation_list: ["off", "eco"] }, "set_operation_mode", { operation_mode: "off" }],
    ["fan.radiator", { supported_features: 1 }, "set_percentage", { percentage: 0 }],
  ];
  for (const [id, attrs, service, data] of cases) {
    const c = config(id, { kind: "heater", timed: { start_script: "script.begin_heat", stop_script: "script.stop_heat" } });
    const states = { [id]: entity("off", attrs), "script.begin_heat": entity("off"), "script.stop_heat": entity("unavailable") };
    const off = planDeviceAction(c, states, "turn_off");
    assert.equal(off.service, service);
    assert.deepEqual(off.data, data);
    assert.equal(getDeviceModel(c, states).actions[service], undefined);
  }
});

test("mapped heating level obeys the reported range and requires an active timer for timed heat", async () => {
  const c = config("switch.example_heater", {
    kind: "heater", level_entity: "number.example_level",
    timed: { start_script: "script.example_start", timer_entity: "timer.example_heat" },
  });
  const states = {
    [c.entity]: entity("on"),
    [c.level_entity]: entity("3", { min: 1, max: 9, step: 1 }),
    "script.example_start": entity("off"),
    "timer.example_heat": entity("idle"),
  };
  assert.equal(getDeviceModel(c, states).actions.set_heating_level, undefined);
  states["timer.example_heat"] = entity("active", { finishes_at: new Date(Date.now() + 300_000).toISOString() });
  assert.equal(getDeviceModel(c, states).level, 3);
  assert.throws(() => planDeviceAction(c, states, "set_heating_level", 4.5), code("invalid_value"));
  const actions = [];
  const controller = createDeviceController({ getHass: () => ({
    states,
    callWS(message) {
      actions.push(message);
      states[c.level_entity] = entity("5.0", states[c.level_entity].attributes);
    },
  }) });
  const reply = await controller.execute(c, "set_heating_level", 5);
  assert.equal(reply.status, "confirmed");
  assert.deepEqual(actions[0], {
    type: "call_service", domain: "number", service: "set_value",
    target: { entity_id: c.level_entity }, service_data: { value: 5 },
  });
  states[c.level_entity] = entity("unavailable");
  assert.equal(getDeviceModel(c, states).actions.set_heating_level, undefined);
  assert.throws(() => getDeviceModel({ ...c, level_entity: "switch.other" }, states), code("invalid_config"));
});
