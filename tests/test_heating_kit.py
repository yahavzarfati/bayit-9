"""Run blueprint templates and actions with synthetic states and services."""

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, UTC
from pathlib import Path
import re
import unittest

from jinja2.nativetypes import NativeEnvironment
import yaml


BLUEPRINTS = Path(__file__).resolve().parents[1] / "blueprints"
HEATER = "switch.test_heater"
TIMER = "timer.test_heater"
CUTOFF = "automation.test_heater_cutoff"
OTHER = "switch.another_test_heater"
NOW = 1_800_000_000


@dataclass(frozen=True)
class Input:
    key: str


class Loader(yaml.SafeLoader):
    """Resolve !input when preparing a test instance."""


Loader.add_constructor("!input", lambda loader, node: Input(loader.construct_scalar(node)))


def substitute(value, inputs):
    if isinstance(value, Input):
        return inputs[value.key]
    if isinstance(value, list):
        return [substitute(item, inputs) for item in value]
    if isinstance(value, Mapping):
        return {key: substitute(item, inputs) for key, item in value.items()}
    return value


def blueprint(domain, name, **overrides):
    path = BLUEPRINTS / domain / "bayit_9" / f"{name}.yaml"
    definition = yaml.load(path.read_text(encoding="utf-8"), Loader=Loader)
    info = definition.pop("blueprint")
    assert info["domain"] == domain
    supplied = dict(heater_switch=HEATER, heater_timer=TIMER, cutoff_automation=CUTOFF)
    supplied.update(overrides)
    inputs = {
        key: supplied[key] if key in supplied else field["default"]
        for key, field in info["input"].items()
    }
    return substitute(definition, inputs)


class Failure(Exception):
    """An error stop or failed service."""


class Home:
    """Execute only the HA action/condition forms used by these blueprints."""

    def __init__(self):
        self.entities = {
            HEATER: ("off", {}), TIMER: ("idle", {"restore": True}),
            CUTOFF: ("on", {}), OTHER: ("on", {}),
        }
        self.calls, self.waits = [], []
        self.ignored, self.failed = set(), set()
        self.on_wait = None
        self.env = NativeEnvironment()
        self.env.tests["match"] = lambda value, regex: bool(re.match(regex, str(value)))
        self.env.globals.update(
            states=self.state,
            state_attr=lambda entity, attr: self.entities.get(entity, ("unknown", {}))[1].get(attr),
            is_state=lambda entity, state: self.state(entity) == state,
            as_timestamp=self.as_timestamp,
            now=lambda: NOW,
        )

    @staticmethod
    def as_timestamp(value, default=None):
        if isinstance(value, (float, int)):
            return float(value)
        try:
            return datetime.fromisoformat(value).timestamp()
        except (ValueError, TypeError):
            return default

    def state(self, entity):
        return self.entities.get(entity, ("unknown", {}))[0]

    def set_state(self, entity, state, **attrs):
        self.entities[entity] = state, attrs

    def set_timer(self, state, deadline=None, restore=True):
        if isinstance(deadline, (int, float)):
            deadline = datetime.fromtimestamp(deadline, UTC).isoformat()
        self.set_state(TIMER, state, finishes_at=deadline, restore=restore)

    def render(self, source, variables):
        return self.env.from_string(source).render(variables)

    def condition(self, spec, variables):
        key = spec["condition"]
        if key == "not":
            return not any(self.condition(item, variables) for item in spec["conditions"])
        if key == "state":
            states = spec["state"] if isinstance(spec["state"], list) else [spec["state"]]
            entity = spec["entity_id"]
            return isinstance(entity, str) and self.state(entity) in states
        if key == "template":
            return self.render(spec["value_template"], variables) is True
        raise AssertionError(spec)

    def call(self, step, variables):
        service, entity = step["action"], step["target"]["entity_id"]
        assert entity in (HEATER, TIMER), f"Wrong target {entity}"
        data = {
            key: self.render(value, variables)
            for key, value in step.get("data", {}).items()
        }
        self.calls.append((service, entity, data))
        if service in self.ignored:
            return
        if service in self.failed:
            if not step.get("continue_on_error"):
                raise Failure(service)
            return
        if service == "timer.start":
            self.set_timer("active", NOW + data["duration"])
        elif service == "timer.cancel":
            self.set_timer("idle")
        elif service == "switch.turn_on":
            self.set_state(entity, "on")
        elif service == "switch.turn_off":
            self.set_state(entity, "off")
        else:
            raise AssertionError(service)

    def execute(self, steps, variables):
        for step in steps:
            if "variables" in step:
                variables.update(step["variables"])
            elif "if" in step:
                match = all(self.condition(item, variables) for item in step["if"])
                if not self.execute(step.get("then" if match else "else", []), variables):
                    return False
            elif "condition" in step:
                if not self.condition(step, variables):
                    return False
            elif "action" in step:
                self.call(step, variables)
            elif "wait_template" in step:
                if not self.render(step["wait_template"], variables):
                    self.waits.append(step["timeout"])
                    if self.on_wait:
                        self.on_wait(self)
                    if not self.render(step["wait_template"], variables) and not step["continue_on_timeout"]:
                        return False
            elif "stop" in step:
                if step.get("error"):
                    raise Failure(step["stop"])
                return False
            else:
                raise AssertionError(step)
        return True

    def start(self, duration=None, **overrides):
        fields = {} if duration is None else {"duration": duration}
        return self.execute(blueprint("script", "start_timed_heating", **overrides)["sequence"], fields)

    def stop(self, **overrides):
        return self.execute(blueprint("script", "stop_timed_heating", **overrides)["sequence"], {})

    def reconcile(self, **overrides):
        plan = blueprint("automation", "timed_heating_cutoff", **overrides)
        variables = plan["variables"]
        if all(self.condition(item, variables) for item in plan["conditions"]):
            self.execute(plan["actions"], variables)


class HeatingKitTests(unittest.TestCase):
    def setUp(self):
        self.home = Home()

    def test_timer_is_armed_before_power_and_exact_max_is_allowed(self):
        self.home.start(60)
        self.assertEqual(self.home.calls, [
            ("timer.start", TIMER, {"duration": 3600}), ("switch.turn_on", HEATER, {}),
        ])
        self.assertEqual(self.home.state(HEATER), "on")

    def test_duration_validation_leaves_everything_untouched(self):
        for duration in (None, True, False, 0, -1, 3.5, "10", 61):
            with self.subTest(duration=duration), self.assertRaises(Failure):
                self.home.start(duration)
        with self.assertRaises(Failure):
            self.home.start(21, max_minutes=20.0)
        self.assertEqual(self.home.calls, [])

    def test_duplicate_start_cannot_extend_an_active_timer(self):
        self.home.start(15)
        self.home.calls.clear()
        with self.assertRaises(Failure):
            self.home.start(10)
        self.assertEqual(self.home.calls, [])
        self.assertEqual(
            self.home.as_timestamp(self.home.entities[TIMER][1]["finishes_at"]), NOW + 900,
        )

    def test_start_requires_visible_switch_idle_restoring_timer_and_cutoff(self):
        for entity, state, attrs in (
            (HEATER, "on", {}), (HEATER, "unavailable", {}),
            (TIMER, "paused", {"restore": True}), (TIMER, "unavailable", {}),
            (TIMER, "idle", {}), (CUTOFF, "off", {}), (CUTOFF, "unavailable", {}),
        ):
            with self.subTest(entity=entity, state=state):
                home = Home()
                home.set_state(entity, state, **attrs)
                with self.assertRaises(Failure):
                    home.start(5)
                self.assertEqual(home.calls, [])

    def test_unconfirmed_or_failed_countdown_never_turns_heater_on(self):
        self.home.ignored.add("timer.start")
        with self.assertRaises(Failure):
            self.home.start(15)
        self.assertEqual([call[0] for call in self.home.calls], ["timer.start", "timer.cancel"])
        home = Home()
        home.failed.add("timer.start")
        with self.assertRaises(Failure):
            home.start(15)
        self.assertEqual(home.calls, [("timer.start", TIMER, {"duration": 900})])

    def test_missing_confirmation_disarms_and_turns_back_off(self):
        self.home.ignored.add("switch.turn_on")
        with self.assertRaises(Failure):
            self.home.start(15)
        self.assertEqual([call[0] for call in self.home.calls], [
            "timer.start", "switch.turn_on", "timer.cancel", "switch.turn_off",
        ])
        self.assertEqual(self.home.waits, ["00:00:08"])

    def test_stop_disarms_and_is_idempotent(self):
        self.home.start(15)
        self.home.calls.clear()
        self.home.stop()
        self.assertEqual(self.home.calls, [
            ("timer.cancel", TIMER, {}), ("switch.turn_off", HEATER, {}),
        ])
        self.home.calls.clear()
        self.home.stop()
        self.assertEqual(self.home.calls, [])

    def test_stop_failure_keeps_cutoff_eligible_to_retry(self):
        self.home.start(15)
        self.home.failed.add("switch.turn_off")
        with self.assertRaises(Failure):
            self.home.stop()
        self.assertEqual(self.home.state(TIMER), "idle")
        self.assertEqual(self.home.state(HEATER), "on")
        self.home.failed.clear()
        self.home.reconcile()
        self.assertEqual(self.home.state(HEATER), "off")

    def test_setup_on_off_switch_is_inert_and_has_reconciliation_triggers(self):
        self.home.reconcile()
        self.assertEqual(self.home.calls, [])
        plan = blueprint("automation", "timed_heating_cutoff")
        self.assertIn({"trigger": "homeassistant", "event": "start"}, plan["triggers"])
        self.assertIn({"trigger": "state", "entity_id": HEATER, "to": "on"}, plan["triggers"])
        self.assertIn({"trigger": "time_pattern", "seconds": "/30"}, plan["triggers"])

    def test_cutoff_disconnected_switch_on_reconnect(self):
        self.home.set_state(HEATER, "unavailable")
        self.home.reconcile()
        self.assertEqual(self.home.calls, [])
        self.home.set_state(HEATER, "on")
        self.home.reconcile()
        self.assertEqual(self.home.calls, [("switch.turn_off", HEATER, {})])
        self.assertEqual(self.home.state(OTHER), "on")

    def test_future_active_timer_survives_restart(self):
        self.home.set_state(HEATER, "on")
        self.home.set_timer("active", NOW + 120)
        self.home.reconcile()
        self.assertEqual(self.home.calls, [])

    def test_nonprotective_timer_causes_cutoff(self):
        for state, deadline, restore in (
            ("idle", None, True), ("paused", None, True), ("active", NOW, True),
            ("active", NOW - 1, True), ("active", "invalid", True),
            ("active", NOW + 3601, True), ("active", NOW + 800, False),
        ):
            with self.subTest(state=state, deadline=deadline, restore=restore):
                home = Home()
                home.set_state(HEATER, "on")
                home.set_timer(state, deadline, restore)
                home.reconcile()
                self.assertEqual(home.calls, [("switch.turn_off", HEATER, {})])

    def test_restore_visibility_wait_rechecks_current_state(self):
        self.home.set_state(HEATER, "on")
        self.home.set_timer("unavailable")
        self.home.on_wait = lambda home: home.set_timer("active", NOW + 120)
        self.home.reconcile()
        self.assertEqual(self.home.waits, ["00:00:10"])
        self.assertEqual(self.home.calls, [])

    def test_visibility_wait_is_bounded(self):
        self.home.set_state(HEATER, "on")
        self.home.set_timer("unavailable")
        self.home.reconcile()
        self.assertEqual(self.home.waits, ["00:00:10"])
        self.assertEqual(self.home.calls, [("switch.turn_off", HEATER, {})])

    def test_invalid_or_group_targets_never_reach_services(self):
        with self.assertRaises(Failure):
            self.home.start(5, heater_switch=[HEATER, OTHER])
        with self.assertRaises(Failure):
            self.home.stop(heater_switch=f"{HEATER},{OTHER}")
        self.home.reconcile(heater_switch=[HEATER, OTHER])
        self.home.set_state(HEATER, "off", entity_id=[OTHER])
        with self.assertRaises(Failure):
            self.home.start(5)
        self.assertEqual(self.home.calls, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
