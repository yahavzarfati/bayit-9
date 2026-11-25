import assert from "node:assert/strict";
import test from "node:test";
import { allowsCoverRailAction, createDeviceController, DeviceControlError, getDeviceModel, homeHeaterPowerAction, planDeviceAction, roomBoilerQuickPowerAction, roomShutdownTargets } from "../src/device-control.mjs";

const entity = (state, attributes = {}) => ({ state, attributes });
const config = (id, fields) => ({ entity: id, ...fields });
const code = value => error => error instanceof DeviceControlError && error.code === value;
const actionIds = model => Object.keys(model.actions).sort();

test("boiler quick power revalidates the latest relay, timer and native service before dispatch", async () => {
  const relay = "switch.fixture_boiler";
  const sensor = "sensor.fixture_runtime";
  const device = config(relay, { kind:"boiler", timed:{simple_timer_entity:sensor}, room_boiler_quick_power:true });
  const timer = (state, attrs = {}) => entity("15",{switch_entity_id:relay,timer_state:state,reverse_mode:false,...attrs});
  const calls = [];
  const hass = {
    states:{ [relay]:entity("off"), [sensor]:timer("idle",{device_active:false}) },
    services:{ switch:{turn_on:{},turn_off:{}}, simple_timer:{cancel_timer:{}} },
    entities:{ [sensor]:{pl:"simple_timer"} },
    callWS:request=>{calls.push(request);},
  };
  const quick = { roomBoilerQuickPower:true };
  const current = () => roomBoilerQuickPowerAction(hass,getDeviceModel(device,hass.states,Date.now(),quick));
  const controller = createDeviceController({ getHass:()=>hass, confirmationTimeoutMs:0 });
  assert.equal(getDeviceModel(device,hass.states).actions.turn_on,undefined);
  assert.equal(current(),"turn_on");
  await controller.execute(device,"turn_on",undefined,quick);
  hass.states[relay] = entity("on");
  await assert.rejects(controller.execute(device,"turn_on",undefined,quick),code("action_unavailable"));
  hass.states[sensor] = timer("idle",{device_active:true});
  assert.equal(current(),"turn_off");
  hass.states[sensor] = timer("active",{reverse_mode:true});
  assert.equal(current(),undefined);
  hass.states[sensor] = timer("active",{switch_entity_id:"switch.other"});
  assert.equal(current(),undefined);
  hass.states[sensor] = timer("active",{device_active:false});
  assert.equal(current(),undefined);
  hass.states[sensor] = timer("active",{device_active:true});
  hass.entities[sensor].hidden = true;
  assert.equal(current(),undefined);
  hass.entities[sensor].hidden = false;
  delete hass.services.simple_timer.cancel_timer;
  assert.equal(current(),undefined);
  hass.services.simple_timer.cancel_timer = {};
  assert.equal(current(),"stop_timed");
  await controller.execute(device,"stop_timed",undefined,quick);
  assert.deepEqual(calls,[
    {type:"call_service",domain:"switch",service:"turn_on",target:{entity_id:relay},service_data:{}},
    {type:"call_service",domain:"simple_timer",service:"cancel_timer",service_data:{entity_id:sensor,turn_off_entity:true}},
  ]);
});

test("compact cover rails honor reported endpoints, direction and assumed state", () => {
  const device = config("cover.shade");
  const scenarios = [
    ["closed", { current_position: 0 }, [true, false]],
    ["open", { current_position: 100 }, [false, true]],
    ["open", { current_position: 24 }, [true, true]],
    ["opening", { current_position: 0 }, [false, false]],
    ["closing", { current_position: 100 }, [false, false]],
    ["opening", { current_position: 25 }, [false, true]],
    ["closing", { current_position: 75 }, [true, false]],
    ["closed", {}, [true, false]],
    ["open", { current_position: null }, [false, true]],
    ["closed", { current_position: -1 }, [true, false]],
    ["opening", { current_position: 100, assumed_state: true }, [true, true]],
    ["closed", { current_position: 0, assumed_state: true }, [true, true]],
  ];
  for (const [state, attributes, allowed] of scenarios) {
    const model = getDeviceModel(device, { [device.entity]: entity(state, { supported_features: 15, ...attributes }) });
    assert.deepEqual(["open", "close"].map(action => allowsCoverRailAction(model, action)), allowed, state);
    assert.equal(allowsCoverRailAction(model, "stop"), true, state);
    assert.ok(model.actions.set_position, "Dedicated position control remains available");
  }
  const unavailable = getDeviceModel(device, { [device.entity]: entity("unavailable", { supported_features: 15 }) });
  assert.equal(allowsCoverRailAction(unavailable, "open"), false);
  assert.equal(allowsCoverRailAction(unavailable, "stop"), false);
});

test("room shutdown uses one exact native off target list and skips protected or unsupported controls", async () => {
  const devices = [config("light.desk"), config("switch.outlet"), config("light.offline"),
    config("light.status", { role: "status" }), config("switch.confirm", { confirmation: true }),
    config("fan.unsupported"), config("automation.safety"),
    config("switch.timed_heat", { kind: "heater", timed: { stop_script: "script.stop_heat" } })];
  const states = Object.fromEntries(devices.map(device => [device.entity, entity("on")]));
  states["light.offline"] = entity("unavailable");
  states["script.stop_heat"] = entity("off");
  const targets = roomShutdownTargets(devices, states);
  assert.deepEqual(targets, ["light.desk", "switch.outlet"]);
  const calls = [];
  const controller = createDeviceController({ getHass: () => ({ callWS: async request => calls.push(request) }) });
  await assert.rejects(controller.turnOffRoom([]), code("invalid_target"));
  await assert.rejects(controller.turnOffRoom(["light.desk", "automation.safety"]), code("invalid_target"));
  assert.equal(await controller.turnOffRoom(targets), "sent");
  assert.deepEqual(calls, [{ type: "call_service", domain: "homeassistant", service: "turn_off", service_data: {},
    target: { entity_id: ["light.desk", "switch.outlet"] } }]);
});

test('media and vacuum issue only available native commands and validate their source and volume', () => {
  const media = config('media_player.speaker');
  const vacuum = config('vacuum.robot');
  const reset = config('button.robot_filter');
  const states = {
    [media.entity]:entity('playing',{supported_features:18445,is_volume_muted:false,source_list:['Aux','Radio']}),
    [vacuum.entity]:entity('idle',{supported_features:8244,fan_speed_list:['quiet','normal']}),
    [reset.entity]:entity('unknown'),
  };
  assert.equal(planDeviceAction(media,states,'media_pause').expected.state,'paused');
  assert.deepEqual(planDeviceAction(media,states,'volume_set',48).data,{volume_level:.48});
  assert.deepEqual(planDeviceAction(media,states,'mute').data,{is_volume_muted:true});
  assert.throws(()=>planDeviceAction(media,states,'select_source','invented'),code('invalid_value'));
  assert.equal(planDeviceAction(vacuum,states,'vacuum_start').service,'start');
  assert.deepEqual(planDeviceAction(vacuum,states,'return_to_base').expected.anyState,['returning','docked']);
  assert.throws(()=>planDeviceAction(vacuum,states,'vacuum_pause'),code('action_unavailable'));
  assert.throws(()=>planDeviceAction(reset,states,'press_button'),code('confirmation_required'));
  assert.equal(planDeviceAction(reset,states,'press_button',undefined,{confirmed:true}).service,'press');
  assert.throws(()=>planDeviceAction(reset,{[reset.entity]:entity('unavailable')},'press_button',undefined,{confirmed:true}),code('action_unavailable'));
});

test('a selected vacuum program uses one native press with explicit confirmation taking precedence', async () => {
  const program = config('button.fixture_clean', { role: 'action', command: 'vacuum_program' });
  const helper = { ...program, entity: 'input_button.fixture_clean' };
  const states = { [program.entity]: entity('unknown'), [helper.entity]: entity('unknown') };
  for (const guarded of [{ ...program, command: undefined }, { ...program, role: 'device' },
    { ...program, confirmation: true }, { ...program, confirmation: 'Start cleaning?' }, helper]) {
    assert.throws(() => planDeviceAction(guarded, states, 'press_button'), code('confirmation_required'));
  }
  assert.throws(() => planDeviceAction({ ...program, role: 'status' }, states, 'press_button'), code('action_unavailable'));
  const calls = [];
  const controller = createDeviceController({ getHass: () => ({ states, callWS: async request => calls.push(request) }) });
  await controller.execute(program, 'press_button');
  assert.deepEqual(calls, [{ type: 'call_service', domain: 'button', service: 'press', service_data: {},
    target: { entity_id: program.entity } }]);
});

test("opt-in media remote isolates transport, volume, real services and standby", async () => {
  const speaker = config("media_player.fixture_transport", { media_remote_role: "transport", media_remote_standby: true });
  const audio = config("media_player.fixture_volume", { media_remote_role: "volume", media_remote_standby: true });
  const features = 1 | 8 | 16 | 32 | 128 | 1024 | 16384;
  const states = {
    [speaker.entity]: entity("off", { supported_features: features }),
    [audio.entity]: entity("standby", { supported_features: features }),
  };
  const generic = config(speaker.entity);
  assert.deepEqual(actionIds(getDeviceModel(generic, states)), ["more_info", "turn_on"]);
  assert.deepEqual(actionIds(getDeviceModel({ ...speaker, media_remote_standby: false }, states)), ["more_info"]);
  assert.deepEqual(actionIds(getDeviceModel(speaker, states)),
    ["media_next_track", "media_play_pause", "media_previous_track", "more_info"]);
  assert.deepEqual(actionIds(getDeviceModel(audio, states)), ["more_info", "volume_down", "volume_up"]);
  assert.throws(() => planDeviceAction(audio, states, "media_play_pause"), code("action_unavailable"));
  assert.throws(() => planDeviceAction(speaker, states, "volume_up"), code("action_unavailable"));
  states[speaker.entity] = entity("off", { supported_features: features & ~1 });
  assert.equal(getDeviceModel(speaker, states).actions.media_play_pause, undefined);
  states[speaker.entity] = entity("off", { supported_features: features });
  const calls = [];
  const services = { media_player: { volume_up: {}, volume_mute: {} } };
  const controller = createDeviceController({ getHass: () => ({ states, services, callWS: request => {
    calls.push(request);
    if (request.service === "volume_mute") states[audio.entity].attributes.is_volume_muted = true;
  } }) });
  await assert.rejects(controller.execute(speaker, "media_play_pause"), code("service_unavailable"));
  assert.deepEqual(calls, []);
  services.media_player.media_play_pause = {};
  assert.equal((await controller.execute(speaker, "media_play_pause")).status, "sent");
  assert.equal((await controller.execute(audio, "volume_up")).status, "sent");
  states[audio.entity].attributes.is_volume_muted = false;
  assert.equal((await controller.execute(audio, "mute")).status, "confirmed");
  assert.deepEqual(calls, [
    { type: "call_service", domain: "media_player", service: "media_play_pause", target: { entity_id: speaker.entity }, service_data: {} },
    { type: "call_service", domain: "media_player", service: "volume_up", target: { entity_id: audio.entity }, service_data: {} },
    { type: "call_service", domain: "media_player", service: "volume_mute", target: { entity_id: audio.entity },
      service_data: { is_volume_muted: true } },
  ]);
});

test("remote power issues an explicit supported command according to reported media state", async () => {
  const display = config("media_player.fixture_screen", { media_remote_role: "power" });
  const powerFlags = 128 | 256 | 1024;
  const states = {};
  for (const [operation, reportedStates] of [
    ["turn_on", ["off", "standby"]],
    ["turn_off", ["on", "idle", "playing", "paused", "buffering"]],
  ]) {
    for (const state of reportedStates) {
      states[display.entity] = entity(state, { supported_features: powerFlags });
      assert.deepEqual(actionIds(getDeviceModel(display, states)), ["more_info", operation]);
      assert.equal(planDeviceAction(display, states, operation).requiresMediaService, true);
    }
  }
  for (const [state, features] of [
    ["unknown", powerFlags], ["unavailable", powerFlags], ["starting", powerFlags],
    ["off", 256], ["on", 128],
  ]) {
    states[display.entity] = entity(state, { supported_features: features });
    assert.deepEqual(actionIds(getDeviceModel(display, states)), ["more_info"]);
  }
  assert.throws(() => getDeviceModel(config("switch.fixture_screen", { media_remote_role: "power" }), states), code("invalid_config"));

  const calls = [];
  const services = { media_player: {} };
  const controller = createDeviceController({ getHass: () => ({ states, services, callWS: request => {
    calls.push(request);
    states[display.entity].state = request.service === "turn_on" ? "idle" : "standby";
  } }) });
  states[display.entity] = entity("standby", { supported_features: powerFlags });
  await assert.rejects(controller.execute(display, "turn_on"), code("service_unavailable"));
  assert.deepEqual(calls, []);
  services.media_player = { turn_on: {}, turn_off: {} };
  assert.equal((await controller.execute(display, "turn_on")).status, "confirmed");
  await assert.rejects(controller.execute(display, "turn_on"), code("action_unavailable"));
  assert.equal((await controller.execute(display, "turn_off")).status, "confirmed");
  assert.deepEqual(calls, ["turn_on", "turn_off"].map(service => ({
    type: "call_service", domain: "media_player", service, target: { entity_id: display.entity }, service_data: {},
  })));
});

test("room climate power confirms reported mode and guards exact capability, current state and service", async () => {
  const climate = config('climate.fixture_room', {room_climate_power:true});
  const states = { [climate.entity]: entity('off', {supported_features:384,hvac_modes:['off','cool','heat']}) };
  const calls = [];
  const services = {climate:{turn_on:{},turn_off:{}}};
  let clock = 0;
  let report = false;
  const hass = {states,services,callWS:async request => {
    calls.push(request);
    if (report) states[climate.entity].state = request.service === 'turn_on' ? 'cool' : 'off';
  }};
  const controller = createDeviceController({getHass:()=>hass,confirmationTimeoutMs:5,pollIntervalMs:1,
    now:()=>clock,sleep:async delay => {clock += delay;}});
  assert.deepEqual(planDeviceAction(climate,states,'turn_on').expected.anyState,['heat','cool','heat_cool','auto','dry','fan_only']);
  await assert.rejects(controller.execute(climate,'turn_off'),code('action_unavailable'));
  delete services.climate.turn_on;
  await assert.rejects(controller.execute(climate,'turn_on'),code('service_unavailable'));
  services.climate.turn_on = {};
  assert.deepEqual(calls,[]);
  assert.equal((await controller.execute(climate,'turn_on')).reason,'state_timeout');
  assert.equal(states[climate.entity].state,'off');
  report = true;
  assert.equal((await controller.execute(climate,'turn_on')).status,'confirmed');
  assert.equal((await controller.execute(climate,'turn_off')).status,'confirmed');
  states[climate.entity].attributes.supported_features = 128;
  await assert.rejects(controller.execute(climate,'turn_on'),code('action_unavailable'));
  states[climate.entity].state = 'weird_mode';
  await assert.rejects(controller.execute(climate,'turn_off'),code('action_unavailable'));
  assert.deepEqual(calls,['turn_on','turn_on','turn_off'].map(service => ({
    type:'call_service',domain:'climate',service,service_data:{},target:{entity_id:climate.entity},
  })));
});

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

test("lights expose absolute Kelvin and named effects only for reported capabilities", () => {
  const lamp = config("light.fixture");
  const capabilities = {
    supported_color_modes: ["rgb", "color_temp"], min_color_temp_kelvin: 2200, max_color_temp_kelvin: 7000,
    supported_features: 4, effect_list: ["Slow pulse", "Color loop", "off", "Slow pulse", " ", null],
  };
  const states = { [lamp.entity]: entity("off", capabilities) };
  const { actions } = getDeviceModel(lamp, states);
  assert.deepEqual(actions.set_color_temp_kelvin, {
    id: "set_color_temp_kelvin", requiresConfirmation: false, min: 2200, max: 7000, step: 1,
  });
  assert.deepEqual(actions.set_effect.options, ["Slow pulse", "Color loop", "off"]);
  for (const [id, key, value] of [
    ["set_color_temp_kelvin", "color_temp_kelvin", 3500], ["set_effect", "effect", "Slow pulse"],
  ]) {
    assert.deepEqual(planDeviceAction(lamp, states, id, value), {
      kind: "service", domain: "light", service: "turn_on", target: { entity_id: lamp.entity },
      data: { [key]: value }, expected: { entity: lamp.entity, attributes: { [key]: value }, tolerance: undefined, state: "on" },
    });
  }
  for (const invalid of [2199, 7001, 3500.1, "3500", NaN]) {
    assert.throws(() => planDeviceAction(lamp, states, "set_color_temp_kelvin", invalid), code("invalid_value"));
  }
  for (const invalid of ["", "color loop", "Slow pulse ", "Magic"]) {
    assert.throws(() => planDeviceAction(lamp, states, "set_effect", invalid), code("invalid_value"));
  }
  for (const unsupported of [
    { supported_color_modes: ["rgb"] }, { min_color_temp_kelvin: 7000 }, { max_color_temp_kelvin: "7000" },
  ]) {
    assert.equal(getDeviceModel(lamp, { [lamp.entity]: entity("on", { ...capabilities, ...unsupported }) })
      .actions.set_color_temp_kelvin, undefined);
  }
  for (const unsupported of [{ supported_features: 0 }, { effect_list: [] }]) {
    assert.equal(getDeviceModel(lamp, { [lamp.entity]: entity("on", { ...capabilities, ...unsupported }) })
      .actions.set_effect, undefined);
  }
  assert.deepEqual(actionIds(getDeviceModel({ ...lamp, role: "status" }, states)), ["more_info"]);
  assert.deepEqual(actionIds(getDeviceModel(lamp, { [lamp.entity]: entity("unavailable", capabilities) })), ["more_info"]);
});

test("native light color is supported only in RGB, HS or XY and targets one exact light", () => {
  const lamp = config("light.fixture_color");
  for (const mode of ["rgb", "hs", "xy"]) {
    const states = { [lamp.entity]: entity("off", { supported_color_modes: [mode] }) };
    assert.equal(getDeviceModel(lamp, states).actions.set_light_color.color, true);
    assert.deepEqual(planDeviceAction(lamp, states, "set_light_color", "#Af801B"), {
      kind: "service", domain: "light", service: "turn_on", target: { entity_id: lamp.entity },
      data: { rgb_color: [175, 128, 27] }, expected: { entity: lamp.entity, state: "on", lightColor: [175, 128, 27] },
    });
    for (const value of ["#000000", "#123", "Af801B", "#123xyz", "#AABBCC\n", [1, 2, 3], undefined]) {
      assert.throws(() => planDeviceAction(lamp, states, "set_light_color", value), code("invalid_value"));
    }
    assert.throws(() => planDeviceAction({ ...lamp, role: "status" }, states, "set_light_color", "#Af801B"),
      code("action_unavailable"));
  }
  for (const modes of [undefined, "rgb", [], ["white", "color_temp"], ["brightness"], ["onoff"]]) {
    const states = { [lamp.entity]: entity("on", { supported_color_modes: modes, rgb_color: [7, 8, 9] }) };
    assert.throws(() => planDeviceAction(lamp, states, "set_light_color", "#Af801B"), code("action_unavailable"));
  }
  assert.throws(() => planDeviceAction(lamp, {
    [lamp.entity]: entity("unavailable", { supported_color_modes: ["rgb"] }),
  }, "set_light_color", "#Af801B"), code("action_unavailable"));
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

test("daily usage reset is explicitly opted in and targets the same linked Simple Timer entry", async () => {
  const c = config("climate.fixture", { timed: { simple_timer_entity: "sensor.fixture_timer",
    simple_timer_target: "input_boolean.fixture_power", allow_daily_usage_reset: true } });
  const sensor = c.timed.simple_timer_entity;
  const attrs = { entry_id: "fixture-entry-A", timer_state: "idle",
    switch_entity_id: c.timed.simple_timer_target, unit_of_measurement: "s" };
  const states = { [c.entity]: entity("off"), [sensor]: entity("240", attrs) };
  const action = "reset_daily_usage";
  const model = getDeviceModel(c, states);
  assert.equal(model.usageSource, sensor);
  assert.equal(model.actions[action].requiresConfirmation, true);
  const token = model.actions[action].usageRevision;
  assert.throws(() => planDeviceAction(c, states, action, token), code("confirmation_required"));
  assert.throws(() => planDeviceAction(c, states, action, ["forged"], { confirmed: true }), code("stale_usage_reset"));
  const replaced = { ...states, [sensor]: entity("240", { ...attrs, entry_id: "fixture-entry-B" }) };
  assert.throws(() => planDeviceAction(c, replaced, action, token, { confirmed: true }), code("stale_usage_reset"));
  const noReset = { ...c, timed: { ...c.timed, allow_daily_usage_reset: false } };
  assert.equal(getDeviceModel(noReset, states).actions[action], undefined);
  const otherSource = { ...c, timed: { ...c.timed, daily_usage_entity: "sensor.other_usage" } };
  const different = getDeviceModel(otherSource, { ...states, "sensor.other_usage": entity("1", { unit_of_measurement: "h" }) });
  assert.equal(different.timer.usedSeconds, 3600);
  assert.equal(different.usageSource, "sensor.other_usage");
  assert.equal(different.actions[action], undefined);
  const brokenLink = { ...states, [sensor]: entity("240", { ...attrs, switch_entity_id: "switch.wrong" }) };
  assert.equal(getDeviceModel({ ...c, timed: { ...c.timed, daily_usage_entity: sensor } }, brokenLink).actions[action], undefined);

  const calls = [];
  let acknowledge = false;
  const hass = { states, services: {}, entities: { [sensor]: { platform: 'simple_timer' } }, callWS: req => {
    calls.push(req);
    if (acknowledge) hass.states[sensor] = entity("0", attrs);
  } };
  const controller = createDeviceController({
    getHass: () => hass, confirmationTimeoutMs: 3, pollIntervalMs: 1,
  });
  await assert.rejects(controller.execute(c, action, token, { confirmed: true }), code("service_unavailable"));
  hass.services.simple_timer = { reset_daily_usage: {} };
  hass.entities = { [sensor]: { platform: "simple_timer", hidden: true } };
  await assert.rejects(controller.execute(c, action, token, { confirmed: true }), code("service_unavailable"));
  hass.entities = { [sensor]: { platform: "template" } };
  await assert.rejects(controller.execute(c, action, token, { confirmed: true }), code("service_unavailable"));
  assert.equal(calls.length, 0);
  hass.entities = { [sensor]: { pl: "simple_timer" } };
  assert.equal((await controller.execute(c, action, token, { confirmed: true })).status, "unconfirmed");
  acknowledge = true;
  assert.equal((await controller.execute(c, action, token, { confirmed: true })).status, "confirmed");
  const expected = { type: "call_service", domain: "simple_timer",
    service: action, service_data: { entry_id: "fixture-entry-A" } };
  assert.deepEqual(calls, [expected, expected]);
  assert.equal(hass.states[c.entity].state, "off");
  assert.equal(getDeviceModel(c, hass.states).actions[action], undefined);
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

const levelSelector = config("fan.fixture_step_heat", {
  kind: "heater", level_steps: 9, level_read_entity: "input_number.fixture_step",
  level_select_script: "script.fixture_select_step",
  timed: { simple_timer_entity: "sensor.fixture_heat_runtime", simple_timer_target: "switch.fixture_heat_relay" },
});
const selectorLevel = level => entity(String(level), { min: 0, max: 9, step: 1 });
const selectorTimer = (attrs = {}) => entity("0", { switch_entity_id: levelSelector.timed.simple_timer_target,
  timer_state: "idle", ...attrs });
function selectorStates(power = "off") {
  return {
    [levelSelector.entity]: entity(power, { supported_features: 49, percentage: 33 }),
    [levelSelector.timed.simple_timer_target]: entity(power),
    [levelSelector.timed.simple_timer_entity]: selectorTimer(),
    [levelSelector.level_read_entity]: selectorLevel(3),
    [levelSelector.level_select_script]: entity("off"),
  };
}

test("explicit heater script changes bounded level with the heater off, manually on or running a valid timer", () => {
  const c = levelSelector;
  const idle = selectorStates();
  const active = selectorStates("on");
  active[c.timed.simple_timer_entity] = selectorTimer({ timer_state: "active",
    timer_finishes_at: new Date(Date.now() + 300_000).toISOString() });
  for (const states of [idle, selectorStates("on"), active]) {
    const plan = planDeviceAction(c, states, "set_heating_level", 8);
    assert.deepEqual([plan.domain, plan.service, plan.target, plan.data],
      ["script", "fixture_select_step", null, { target_step: 8 }]);
    assert.ok(plan.expected.all.some(item => item.entity === c.entity && item.state === states[c.entity].state));
    assert.equal(getDeviceModel(c, states).actions.turn_on, undefined);
    for (const value of [0, 10, 1.5, "2"]) {
      assert.throws(() => planDeviceAction(c, states, "set_heating_level", value), code("invalid_value"));
    }
  }
  for (const [key, value] of [
    [c.timed.simple_timer_entity, selectorTimer({ switch_entity_id: "switch.foreign" })],
    [c.timed.simple_timer_entity, selectorTimer({ timer_state: "active", timer_finishes_at: "bad" })],
    [c.timed.simple_timer_target, entity("on")], [c.timed.simple_timer_target, entity("unavailable")],
    [c.level_read_entity, entity("3", { min: 0, max: 8, step: 1 })],
    [c.level_read_entity, entity("3", { min: 0, max: 9, step: 2 })],
    [c.level_select_script, entity("on")], [c.level_select_script, entity("unavailable")],
  ]) {
    assert.throws(() => planDeviceAction(c, { ...idle, [key]: value }, "set_heating_level", 8), code("action_unavailable"));
  }
  assert.equal(getDeviceModel(c, { ...idle, [c.level_select_script]: entity("on") }).levelChanging, true);
  assert.throws(() => planDeviceAction({ ...c, role: "status" }, idle, "set_heating_level", 8), code("action_unavailable"));
  assert.throws(() => getDeviceModel({ ...c, level_read_entity: undefined }, idle), code("invalid_config"));
  assert.throws(() => planDeviceAction(c, { ...active, [c.level_select_script]: entity("unavailable") },
    "set_heating_level", 8), code("action_unavailable"));
});

test("heater activity follows both native scripts without changing the observed level or the command target", () => {
  const c = { ...levelSelector, level_activity_script: "script.fixture_apply_step" };
  const states = selectorStates();
  assert.equal(getDeviceModel(c, states).levelActivity, false);
  states[c.level_activity_script] = entity("on");
  for (const power of ["off", "on"]) {
    states[c.entity] = states[c.timed.simple_timer_target] = entity(power);
    const model = getDeviceModel(c, states);
    assert.equal(model.levelActivity, true);
    assert.equal(model.levelChanging, true);
    assert.equal(model.level, 3);
    assert.equal(model.state, power);
    assert.deepEqual(model.actions, getDeviceModel(levelSelector, states).actions);
    const action = planDeviceAction(c, states, "set_heating_level", 7);
    assert.equal(action.service, "fixture_select_step");
    assert.deepEqual(action.data, { target_step: 7 });
  }
  states[c.level_select_script] = entity("on");
  states[c.level_activity_script] = entity("off");
  assert.equal(getDeviceModel(c, states).levelActivity, true);
  states[c.entity] = entity("unavailable");
  assert.equal(getDeviceModel(c, states).levelActivity, false);
  states[c.entity] = entity("on");
  states[c.level_select_script] = entity("off");
  states[c.level_activity_script] = entity("unavailable");
  assert.equal(getDeviceModel(c, states).levelActivity, false);
  assert.equal(getDeviceModel({ ...c, role: "status" }, { ...states, [c.level_activity_script]: entity("on") }).levelActivity, undefined);
  assert.throws(() => getDeviceModel({ ...c, level_activity_script: "switch.fixture" }, states), code("invalid_config"));
});

test("off-only heater preselection writes only its dedicated helper and keeps the running action separate", async () => {
  const c = { ...levelSelector, level_preselect_entity: "input_number.fixture_next_level" };
  const next = "preselect_heating_level";
  const running = "set_heating_level";
  const idle = { ...selectorStates(), [c.level_preselect_entity]: selectorLevel(5) };
  const on = { ...selectorStates("on"), [c.level_preselect_entity]: selectorLevel(8) };
  assert.equal(getDeviceModel(c, idle).level, 5);
  assert.equal(getDeviceModel(c, idle).levelAction, next);
  assert.equal(getDeviceModel(c, on).level, 3);
  assert.equal(getDeviceModel(c, on).levelAction, running);
  assert.deepEqual(planDeviceAction(c, on, running, 7), planDeviceAction(levelSelector, on, running, 7));
  assert.equal(getDeviceModel(c, idle).actions[running], undefined);
  assert.deepEqual(planDeviceAction(c, idle, next, 8), {
    kind: "service", domain: "input_number", service: "set_value",
    target: { entity_id: c.level_preselect_entity }, data: { value: 8 },
    expected: { entity: c.level_preselect_entity, numericState: 8 },
  });
  for (const value of [0, 10, 2.5, "8"]) {
    assert.throws(() => planDeviceAction(c, idle, next, value), code("invalid_value"));
  }
  for (const [id, record] of [
    [c.entity, entity("on")], [c.entity, entity("unavailable")],
    [c.timed.simple_timer_target, entity("on")], [c.timed.simple_timer_target, undefined],
    [c.timed.simple_timer_entity, selectorTimer({ switch_entity_id: "switch.other" })],
    [c.timed.simple_timer_entity, selectorTimer({ timer_state: "active" })],
    [c.level_preselect_entity, entity("5", { min: 0, max: 8, step: 1 })],
    [c.level_preselect_entity, entity("unknown")],
  ]) {
    assert.throws(() => planDeviceAction(c, { ...idle, [id]: record }, next, 8), code("action_unavailable"));
  }
  assert.throws(() => planDeviceAction({ ...c, role: "status" }, idle, next, 8), code("action_unavailable"));
  assert.throws(() => getDeviceModel({ ...c, timed: { simple_timer_entity: c.timed.simple_timer_entity } }, idle),
    code("invalid_config"));

  const calls = [];
  let current = idle;
  const controller = createDeviceController({ getHass: () => ({ states: current, callWS: async call => {
    calls.push(call);
    current = { ...current, [c.level_preselect_entity]: selectorLevel(8) };
  } }) });
  assert.equal((await controller.execute(c, next, 8)).status, "confirmed");
  current = on;
  await assert.rejects(controller.execute(c, next, 7), code("action_unavailable"));
  assert.deepEqual(calls, [{ type: "call_service", domain: "input_number", service: "set_value",
    target: { entity_id: c.level_preselect_entity }, service_data: { value: 8 } }]);
});

test("combined heater controls wait for the shared level selector to be idle", async () => {
  const c = { ...levelSelector, level_preselect_entity: levelSelector.level_read_entity };
  const script = c.level_select_script;
  const preselect = "preselect_heating_level";
  const select = "set_heating_level";
  const idleOff = selectorStates();
  const idleOn = selectorStates("on");
  for (const power of ["on", "off"]) {
    const action = power === "on" ? select : preselect;
    for (const state of ["on", "unknown", "unavailable"]) {
      const states = { ...selectorStates(power), [script]: entity(state) };
      assert.equal(getDeviceModel(c, states).levelChanging, state === "on");
      assert.throws(() => planDeviceAction(c, states, action, 8), code("action_unavailable"));
    }
  }
  const differentHelper = { ...c, level_preselect_entity:"input_number.fixture_next_level" };
  const withSeparateHelper = { ...idleOff, [script]:entity("on"),
    [differentHelper.level_preselect_entity]:selectorLevel(4) };
  assert.ok(getDeviceModel(differentHelper,withSeparateHelper).actions[preselect]);
  assert.equal(getDeviceModel(differentHelper,withSeparateHelper).levelChanging,false);

  const completed = harness(idleOn, {onSleep(_elapsed,hass) {
    hass.states = { ...hass.states, [c.level_read_entity]:selectorLevel(8) };
  }});
  assert.equal((await completed.controller.execute(c,select,8)).status,"confirmed");
  assert.deepEqual(completed.calls,[{type:"call_service",domain:"script",service:"fixture_select_step",
    service_data:{target_step:8}}]);
  const wrongLevel = harness(idleOn, {onSleep(_elapsed,hass) {
    hass.states = { ...hass.states, [c.level_read_entity]:selectorLevel(7) };
  }});
  assert.equal((await wrongLevel.controller.execute(c,select,8)).reason,"state_timeout");
  const off = planDeviceAction(c,idleOff,preselect,6);
  assert.deepEqual([off.domain,off.service,off.target,off.data],
    ["input_number","set_value",{entity_id:c.level_read_entity},{value:6}]);
  assert.throws(() => planDeviceAction(c,idleOff,select,8),code("action_unavailable"));
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

test("horizontal climate swing uses only its advertised feature, mode, target and feedback", async () => {
  const c = config("climate.fixture");
  const attrs = { supported_features: 512 | 32, swing_modes: ["off", "vertical"], swing_mode: "off",
    swing_horizontal_modes: ["off", "Left position", "Left position", " ", null], swing_horizontal_mode: null };
  const states = { [c.entity]: entity("cool", attrs) };
  const h = harness(states, { onSleep(elapsed, hass) {
    if (elapsed >= 20) hass.states[c.entity] = entity("cool", { ...attrs, swing_horizontal_mode: "Left position" });
  } });
  const action = "set_swing_horizontal_mode";
  assert.deepEqual(getDeviceModel(c, states).actions[action].options, ["off", "Left position"]);
  assert.equal(getDeviceModel(c, states).attributes.swing_horizontal_mode, null);
  assert.throws(() => planDeviceAction(c, states, action, "left position"), code("invalid_value"));
  assert.throws(() => planDeviceAction(c, states, action, "vertical"), code("invalid_value"));
  assert.throws(() => planDeviceAction(c, states, action, ""), code("invalid_value"));
  assert.equal(h.calls.length, 0);
  assert.equal((await h.controller.execute(c, action, "Left position")).status, "confirmed");
  assert.deepEqual(h.calls, [{ type: "call_service", domain: "climate", service: action,
    target: { entity_id: c.entity }, service_data: { swing_horizontal_mode: "Left position" } }]);
  assert.equal(states[c.entity].attributes.swing_mode, "off");

  const verticalOnly = harness({ [c.entity]: entity("cool", attrs) }, { onSleep(_elapsed, hass) {
    hass.states[c.entity] = entity("cool", { ...attrs, swing_mode: "vertical" });
  } });
  assert.equal((await verticalOnly.controller.execute(c, action, "Left position")).reason, "state_timeout");

  for (const unsupported of [{ supported_features: 32 }, { swing_horizontal_modes: [] },
    { swing_horizontal_modes: undefined }, { swing_horizontal_modes: "Left position" }]) {
    const withoutHorizontal = { [c.entity]: entity("cool", { ...attrs, ...unsupported }) };
    assert.equal(getDeviceModel(c, withoutHorizontal).actions[action], undefined);
    assert.ok(getDeviceModel(c, withoutHorizontal).actions.set_swing_mode);
  }
  const withoutVertical = { [c.entity]: entity("cool", { ...attrs, supported_features: 512 }) };
  assert.ok(getDeviceModel(c, withoutVertical).actions[action]);
  assert.equal(getDeviceModel(c, withoutVertical).actions.set_swing_mode, undefined);
  assert.throws(() => planDeviceAction({ ...c, role: "status" }, states, action, "Left position"), code("action_unavailable"));
  assert.throws(() => planDeviceAction(c, { [c.entity]: entity("unavailable", attrs) }, action, "Left position"),
    code("action_unavailable"));
  const scriptGuarded = config(c.entity, { kind: "heater", timed: { start_script: "script.fixture_start" } });
  assert.throws(() => planDeviceAction(scriptGuarded, states, action, "Left position"), code("action_unavailable"));
});

test("heater script feedback has to confirm both level and unchanged device linkage and power", async () => {
  const c = levelSelector;
  const afterFeedback = (alter = () => {}) => harness(selectorStates(), { onSleep: (elapsed, hass) => {
    if (elapsed < 20) return;
    hass.states = { ...hass.states, [c.level_read_entity]: selectorLevel(8) };
    alter(hass.states);
  } });
  const good = afterFeedback();
  assert.equal((await good.controller.execute(c, "set_heating_level", 8)).status, "confirmed");
  assert.deepEqual(good.calls, [{ type: "call_service", domain: "script", service: "fixture_select_step",
    service_data: { target_step: 8 } }]);
  const powered = afterFeedback(states => { states[c.timed.simple_timer_target] = entity("on"); });
  assert.equal((await powered.controller.execute(c, "set_heating_level", 8)).reason, "state_timeout");
  const changedBinding = afterFeedback(states => {
    states[c.timed.simple_timer_entity] = selectorTimer({ switch_entity_id: "switch.foreign" });
  });
  assert.equal((await changedBinding.controller.execute(c, "set_heating_level", 8)).reason, "state_timeout");
  const noFeedback = harness(selectorStates());
  assert.equal((await noFeedback.controller.execute(c, "set_heating_level", 8)).reason, "state_timeout");
});

test("light color readback matches reported color after native conversion, not stale or incompatible observations", async () => {
  const lamp = config("light.fixture_color");
  const capabilities = { supported_color_modes: ["xy", "hs", "color_temp"], color_mode: "xy", xy_color: [0.3, 0.6] };
  const initial = { [lamp.entity]: entity("on", capabilities) };
  const reported = (attributes, state = "on") => harness(initial, { onSleep(elapsed, hass) {
    if (elapsed >= 20) hass.states = { [lamp.entity]: entity(state, { ...capabilities, ...attributes }) };
  } });
  const converted = reported({ xy_color: [0.574, 0.359], rgb_color: [255, 135, 75] });
  assert.equal((await converted.controller.execute(lamp, "set_light_color", "#804020")).status, "confirmed");
  const hue = reported({ color_mode: "hs", rgb_color: [255, 127, 62] });
  assert.equal((await hue.controller.execute(lamp, "set_light_color", "#804020")).status, "confirmed");
  assert.deepEqual(converted.calls, [{ type: "call_service", domain: "light", service: "turn_on",
    target: { entity_id: lamp.entity }, service_data: { rgb_color: [128, 64, 32] } }]);
  for (const mismatch of [harness(initial), reported({ xy_color: [0.6, 0.3] }),
    reported({ xy_color: [0.574, 0.359] }, "off"), reported({ color_mode: "color_temp", rgb_color: [255, 129, 64] }),
    reported({ xy_color: undefined, rgb_color: [255, 129, 64] }),
    reported({ color_mode: "hs", rgb_color: [255, 255, 64] })]) {
    assert.equal((await mismatch.controller.execute(lamp, "set_light_color", "#804020")).reason, "state_timeout");
  }
});

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

test("curated actions preserve native confirmation and lock PIN, and passive roles cannot actuate", () => {
  const script = config("script.fixture_close", { role: "action", command: "run_script", confirmation: " Close now? " });
  const lock = config("lock.fixture_entry", { role: "lock", confirmation: false });
  const states = { [script.entity]: entity("off"), [lock.entity]: entity("locked", { code_format: "^\\d{4}$" }) };
  const actions = getDeviceModel(script, states).actions;
  assert.equal(actions.run_script.confirmationText, "Close now?");
  assert.equal(actions.more_info.requiresConfirmation, false);
  assert.throws(() => planDeviceAction(script, states, "run_script", null, { confirmed: "true" }), code("confirmation_required"));
  assert.deepEqual(planDeviceAction(script, states, "run_script", null, { confirmed: true }), {
    kind: "service", domain: "script", service: "turn_on", target: { entity_id: script.entity }, data: {}, expected: null,
  });
  const unguardedScript = { ...script, confirmation: false };
  assert.equal(planDeviceAction(unguardedScript, states, "run_script").service, "turn_on");
  assert.throws(() => planDeviceAction({ ...unguardedScript, command: "restart" }, states, "run_script"), code("confirmation_required"));
  assert.throws(() => planDeviceAction({ ...unguardedScript, role: "device" }, states, "run_script"), code("confirmation_required"));
  assert.throws(() => planDeviceAction(unguardedScript, { [script.entity]: entity("unavailable") }, "run_script"), code("action_unavailable"));
  for (const role of ["status", "forecast", "sun", "graph", "person"]) {
    assert.deepEqual(actionIds(getDeviceModel({ ...script, role }, states)), ["more_info"]);
    assert.throws(() => planDeviceAction({ ...script, role }, states, "run_script", null, { confirmed: true }), code("action_unavailable"));
  }
  assert.equal(getDeviceModel({ ...lock, confirmation: "Lock the entry?" }, states).actions.lock.confirmationText, "Lock the entry?");
  assert.throws(() => planDeviceAction(lock, states, "unlock"), code("confirmation_required"));
  assert.throws(() => planDeviceAction(lock, states, "unlock", null, { confirmed: true }), code("pin_required"));
});

test("opted-in script start and stop require the matching current observation and use absolute services", () => {
  const script = config("script.fixture_toggle", { role: "action", command: "toggle_script", confirmation: "Run this sequence?" });
  const read = (state, last_changed, last_triggered = null) => ({
    [script.entity]: { ...entity(state, { last_triggered }), last_changed },
  });
  const stopped = read("off", "2026-01-01T01:00:00Z");
  const first = read("on", "2026-01-01T01:00:02Z", "2026-01-01T01:00:01Z");
  const replacement = read("on", "2026-01-01T01:00:02Z", "2026-01-01T01:00:03Z");
  const noConfirmation = { ...script, confirmation: false };
  const initial = getDeviceModel(script, stopped).actions;
  assert.deepEqual(Object.keys(initial), ["more_info", "start_script"]);
  assert.equal(initial.start_script.confirmationText, "Run this sequence?");
  const startRevision = initial.start_script.scriptRevision;
  const stopRevision = getDeviceModel(script, first).actions.stop_script.scriptRevision;
  assert.throws(() => planDeviceAction(script, stopped, "start_script", startRevision), code("confirmation_required"));
  assert.throws(() => planDeviceAction(script, first, "start_script", startRevision, { confirmed: true }), code("action_unavailable"));
  assert.throws(() => planDeviceAction(script, stopped, "stop_script", stopRevision, { confirmed: true }), code("action_unavailable"));
  assert.throws(() => planDeviceAction(script, replacement, "stop_script", stopRevision, { confirmed: true }), code("stale_script_state"));
  const target = { entity_id: script.entity };
  assert.deepEqual(planDeviceAction(noConfirmation, stopped, "start_script", startRevision), {
    kind: "service", domain: "script", service: "turn_on", target, data: {},
    expected: { entity: script.entity, formerScriptRun: null },
  });
  assert.deepEqual(planDeviceAction(script, first, "stop_script", stopRevision, { confirmed: true }), {
    kind: "service", domain: "script", service: "turn_off", target, data: {},
    expected: { entity: script.entity, state: "off" },
  });
  assert.deepEqual(actionIds(getDeviceModel(script, read("unknown", "2026-01-01T01:00:04Z"))), ["more_info"]);
  assert.deepEqual(actionIds(getDeviceModel(script, { [script.entity]: entity("off") })), ["more_info"]);
  assert.deepEqual(actionIds(getDeviceModel({ ...script, role: "status" }, first)), ["more_info"]);
  assert.equal(planDeviceAction({ ...noConfirmation, command: "run_script" }, first, "run_script").service, "turn_on");
});

test("script start observation distinguishes a completed quick run from unrelated state changes", async () => {
  const script = config("script.fixture_toggle", { role: "action", command: "toggle_script", confirmation: false });
  const former = "2026-01-01T01:00:00Z";
  const fresh = "2026-01-01T01:00:05Z";
  const initial = { [script.entity]: { ...entity("off", { last_triggered: former }), last_changed: former } };
  const revision = getDeviceModel(script, initial).actions.start_script.scriptRevision;
  const withUpdate = last_triggered => harness(initial, { onSleep: (_, hass) => {
    hass.states = { [script.entity]: { ...entity("off", { last_triggered }), last_changed: fresh } };
  } });
  const unchanged = await withUpdate(former).controller.execute(script, "start_script", revision);
  assert.equal(unchanged.reason, "state_timeout");
  const completed = await withUpdate(fresh).controller.execute(script, "start_script", revision);
  assert.equal(completed.status, "confirmed");
});

test("Home heater power honors the native fan and revalidates its cutoff before dispatch", async () => {
  const fan = "fan.fixture_heater";
  const relay = "switch.fixture_relay";
  const timer = "sensor.fixture_timer";
  const cutoff = "automation.fixture_heater_cutoff";
  const calls = [];
  const device = config(fan, { kind: "heater", home_heater_cutoff_automation: cutoff,
    timed: { simple_timer_entity: timer, simple_timer_target: relay } });
  const shortcut = { ...device, home_heater_shortcut: true };
  const hass = {
    states: {
      [fan]: entity("off", { supported_features: 48 }), [relay]: entity("off"),
      [timer]: entity("0", { switch_entity_id: relay, timer_state: "idle", device_active: false }),
      [cutoff]: entity("on"),
    },
    services: { fan: { turn_on: {}, turn_off: {} }, simple_timer: { start_timer: {} } },
    entities: { [fan]: { pl: "template" }, [timer]: { platform: "simple_timer" } },
    callWS: request => { calls.push(request); },
  };
  const controller = createDeviceController({ getHass: () => hass, confirmationTimeoutMs: 0 });
  const action = () => homeHeaterPowerAction(hass, shortcut);
  assert.equal(getDeviceModel(device, hass.states).actions.turn_on, undefined);
  assert.equal(action(), "turn_on");
  hass.states[cutoff].state = "off";
  assert.equal(action(), undefined);
  await assert.rejects(controller.execute(shortcut, "turn_on"),code("action_unavailable"));
  assert.deepEqual(calls, []);
  hass.states[cutoff].state = "on";
  hass.states[timer].attributes.switch_entity_id = "switch.wrong";
  assert.equal(action(), undefined);
  hass.states[timer].attributes.switch_entity_id = relay;
  hass.entities[fan].pl = "mqtt";
  assert.equal(action(), undefined);
  hass.entities[fan].pl = "template";
  delete hass.services.simple_timer.start_timer;
  assert.equal(action(), undefined);
  hass.services.simple_timer.start_timer = {};
  await controller.execute(shortcut, "turn_on");
  hass.states[fan].state = "on";
  assert.equal(action(), undefined);
  hass.states[relay].state = "on";
  hass.states[cutoff].state = "unavailable";
  hass.states[timer].attributes.timer_state = "active";
  hass.states[fan].attributes.supported_features = 1;
  assert.equal(action(), undefined);
  hass.states[fan].attributes.supported_features = 48;
  assert.equal(action(), "turn_off");
  await controller.execute(shortcut, "turn_off");
  assert.deepEqual(calls.map(request => [request.domain, request.service, request.target.entity_id]),
    [["fan", "turn_on", fan], ["fan", "turn_off", fan]]);
});
