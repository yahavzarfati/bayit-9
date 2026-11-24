"""Test the weekly program on exact Core with one native schedule and fake heater."""

import asyncio
from datetime import UTC, datetime, timedelta
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory

from homeassistant import bootstrap, loader
from homeassistant.components.switch.const import DATA_COMPONENT as SWITCH_COMPONENT
from homeassistant.const import __version__
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from test_heating_core import CUTOFF, HEATER, OTHER, SOURCE, TIMER, FixtureSwitch, instance


SCHEDULE = "schedule.test_weekly_heat"
AUTOMATION = "automation.bayit_9_fixture_weekly"
STARTER = "script.bayit9_fixture_start"
WEEKDAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")


async def run():
    assert __version__ == "2026.11.2", f"Expected Core 2026.11.2, got {__version__}"
    with TemporaryDirectory(prefix="bayit9-weekly-test-") as path:
        shutil.copytree(SOURCE, Path(path) / "blueprints")
        hass = HomeAssistant(path)
        hass.config.skip_pip = True
        calls = []
        heater = FixtureSwitch(HEATER, calls)
        other = FixtureSwitch(OTHER, calls)
        heater._attr_is_on = False

        config = {
            "homeassistant": {"auth_mfa_modules": []},
            "timer": {"test_heater": {"restore": True, "duration": "00:15:00"}},
            "schedule": {
                "test_weekly_heat": {
                    "name": "Test weekly heat",
                    **{day: [{"from": "00:00:00", "to": "24:00:00"}] for day in WEEKDAYS},
                }
            },
            "automation": [
                {
                    "id": "fixture_cutoff",
                    "alias": "Bayit 9 Fixture Cutoff",
                    **instance("timed_heating_cutoff"),
                },
                {
                    "id": "fixture_weekly",
                    "alias": "Bayit 9 Fixture Weekly",
                    "use_blueprint": {
                        "path": "bayit_9/weekly_timed_heating.yaml",
                        "input": {
                            "weekly_schedule": SCHEDULE,
                            "start_script": STARTER,
                            "fixed_minutes": 12.0,
                        },
                    },
                },
            ],
            "script": {
                "bayit9_fixture_start": instance(
                    "start_timed_heating", cutoff_automation=CUTOFF, max_minutes=20,
                ),
                "bayit9_fixture_stop": instance("stop_timed_heating"),
            },
        }
        loader.async_setup(hass)
        try:
            assert await bootstrap.async_from_config_dict(config, hass) is hass
            assert await async_setup_component(hass, "switch", config)
            await hass.data[SWITCH_COMPONENT].async_add_entities([heater, other])
            assert hass.states.is_state(SCHEDULE, "on")
            await hass.async_start()
            await hass.async_block_till_done()

            async def command(domain, action, **data):
                await hass.services.async_call(domain, action, data, blocking=True)
                await hass.async_block_till_done()

            async def transition(*, origin="off", age=1, remaining=1801, data=None):
                now = datetime.now(UTC)
                # Supply exact event snapshots to the real native Schedule trigger.
                # An unavailable snapshot allows arming a back-to-back case without starting a run.
                hass.states.async_set(SCHEDULE, "unavailable")
                hass.states.async_set(SCHEDULE, origin, {
                    "next_event": now - timedelta(seconds=age),
                })
                await hass.async_block_till_done()
                hass.states.async_set(SCHEDULE, "on", {
                    "next_event": now + timedelta(seconds=remaining),
                    **(data or {}),
                })
                await hass.async_block_till_done()

            def assert_heat(minutes):
                assert hass.states.is_state(HEATER, "on"), calls
                timer = hass.states.get(TIMER)
                assert timer.state == "active", timer
                assert timer.attributes["duration"] == str(timedelta(minutes=minutes)), timer
                assert hass.states.is_state(OTHER, "on")

            def assert_idle():
                assert hass.states.is_state(HEATER, "off"), calls
                assert hass.states.is_state(TIMER, "idle")

            assert hass.states.is_state(AUTOMATION, "on")
            assert_idle()
            assert not calls  # A helper already active on startup does not start heating.
            await command("automation", "trigger", entity_id=AUTOMATION, skip_condition=True)
            assert_idle()
            assert not calls

            await transition()
            assert_heat(12)
            assert calls == ["turn_on"]

            # A manual or scheduled run belongs to its timer after it starts.
            hass.states.async_set(SCHEDULE, "off")
            await hass.async_block_till_done()
            assert_heat(12)
            await command("script", "bayit9_fixture_stop")
            assert_idle()

            await transition(origin="on", data={"duration_minutes": 7})
            assert_heat(7)
            await command("script", "bayit9_fixture_stop")
            assert_idle()
            await transition(remaining=191)
            assert_heat(3)
            await command("script", "bayit9_fixture_stop")
            assert_idle()

            before = list(calls)
            for wrong in (False, "7", 0, 4.5, 61, 21):
                await transition(data={"duration_minutes": wrong})
                assert_idle()
            await transition(age=80)
            await transition(age=-120)
            await transition(remaining=45)
            await transition(origin="unavailable")
            assert_idle()
            assert calls == before

            await command("script", "bayit9_fixture_start", duration=4)
            timer_deadline = hass.states.get(TIMER).attributes["finishes_at"]
            await transition(data={"duration_minutes": 8})
            assert_heat(4)
            assert hass.states.get(TIMER).attributes["finishes_at"] == timer_deadline
            await command("script", "bayit9_fixture_stop")

            await command("automation", "turn_off", entity_id=AUTOMATION)
            await transition()
            assert_idle()
            await command("automation", "turn_on", entity_id=AUTOMATION)
            assert_idle()
            await command("automation", "turn_off", entity_id=CUTOFF)
            await transition()
            assert_idle()
            print("PASS Core 2026.11.2 weekly schedule, duration bounds, timer isolation and no catch-up.")
        finally:
            await hass.async_stop(force=True)


if __name__ == "__main__":
    asyncio.run(run())
