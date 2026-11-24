"""Optional integration test with exact Home Assistant Core and fake switch services."""

import asyncio
from datetime import UTC, datetime, timedelta
import json
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory

from homeassistant import bootstrap, loader
from homeassistant.components.switch import SwitchEntity
from homeassistant.components.switch.const import DATA_COMPONENT as SWITCH_COMPONENT
from homeassistant.const import __version__
from homeassistant.core import HomeAssistant, State
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.restore_state import STORAGE_KEY, STORAGE_VERSION
from homeassistant.setup import async_setup_component


SOURCE = Path(__file__).resolve().parents[1] / "blueprints"
HEATER = "switch.test_heater"
OTHER = "switch.other_test_heater"
TIMER = "timer.test_heater"
CUTOFF = "automation.bayit_9_fixture_cutoff"


def instance(path, **inputs):
    return {
        "use_blueprint": {
            "path": f"bayit_9/{path}.yaml",
            "input": {"heater_switch": HEATER, "heater_timer": TIMER, **inputs},
        }
    }


class FixtureSwitch(SwitchEntity):
    _attr_should_poll = False
    _attr_is_on = True
    _attr_available = True

    def __init__(self, entity_id, calls):
        self.entity_id = entity_id
        self.calls = calls

    async def async_turn_on(self, **kwargs):
        assert self.entity_id == HEATER
        self.calls.append("turn_on")
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs):
        assert self.entity_id == HEATER
        self.calls.append("turn_off")
        self._attr_is_on = False
        self.async_write_ha_state()

    def report(self, available, is_on):
        self._attr_available = available
        self._attr_is_on = is_on
        self.async_write_ha_state()


def seed_expired_run(config_dir):
    now = datetime.now(UTC)
    previous = State(
        TIMER,
        "active",
        {
            "duration": "0:15:00",
            "finishes_at": (now - timedelta(seconds=30)).isoformat(),
            "restore": True,
        },
    )
    storage = config_dir / ".storage"
    storage.mkdir()
    (storage / STORAGE_KEY).write_text(
        json.dumps({
            "key": STORAGE_KEY, "version": STORAGE_VERSION, "minor_version": 1,
            "data": [{"state": json.loads(previous.as_dict_json), "last_seen": now.isoformat(),
                      "extra_data": None, "entity_registry_id": None}],
        }),
        encoding="utf-8",
    )


async def run():
    assert __version__ == "2026.11.2", f"Expected Core 2026.11.2, got {__version__}"
    with TemporaryDirectory(prefix="bayit9-heating-test-") as dir_path:
        shutil.copytree(SOURCE, Path(dir_path) / "blueprints")
        seed_expired_run(Path(dir_path))
        hass = HomeAssistant(dir_path)
        hass.config.skip_pip = True
        calls = []
        heater = FixtureSwitch(HEATER, calls)
        other = FixtureSwitch(OTHER, calls)

        config = {
            "homeassistant": {"auth_mfa_modules": []},
            "timer": {"test_heater": {"restore": True, "duration": "00:15:00"}},
            "automation": [
                {"id": "bayit9_fixture_cutoff", "alias": "Bayit 9 Fixture Cutoff",
                 **instance("timed_heating_cutoff")},
            ],
            "script": {
                "bayit9_fixture_start": instance("start_timed_heating", cutoff_automation=CUTOFF),
                "bayit9_fixture_stop": instance("stop_timed_heating"),
            },
        }
        loader.async_setup(hass)
        assert await bootstrap.async_from_config_dict(config, hass) is hass
        assert await async_setup_component(hass, "switch", config)
        await hass.data[SWITCH_COMPONENT].async_add_entities([heater, other])
        await hass.async_start()
        await hass.async_block_till_done()

        async def command(domain, service, **payload):
            await hass.services.async_call(domain, service, payload, blocking=True)
            await hass.async_block_till_done()

        async def rejects_start(duration):
            before = (list(calls), hass.states.get(TIMER), hass.states.get(HEATER))
            try:
                await command("script", "bayit9_fixture_start", duration=duration)
            except HomeAssistantError:
                await hass.async_block_till_done()
            after = (list(calls), hass.states.get(TIMER), hass.states.get(HEATER))
            assert after == before, (duration, before, after)

        try:
            cutoff = hass.states.get(CUTOFF)
            assert cutoff is not None and cutoff.state == "on", cutoff
            assert hass.states.is_state(HEATER, "off"), (
                calls, cutoff, hass.states.get(HEATER), hass.states.get(TIMER),
            )
            assert calls == ["turn_off"], calls
            assert hass.states.is_state(OTHER, "on")
            assert hass.states.get(TIMER).attributes["restore"] is True
            assert hass.states.get(TIMER).attributes["last_transition"] == "finished"

            calls.clear()
            for value in (0, 61, 1.5, False):
                await rejects_start(value)
            assert calls == [], calls

            await command("script", "bayit9_fixture_start", duration=15)
            assert hass.states.is_state(TIMER, "active")
            assert hass.states.get(TIMER).attributes["duration"] == "0:15:00"
            assert hass.states.is_state(HEATER, "on")
            assert calls == ["turn_on"], calls

            await rejects_start(15)
            assert calls == ["turn_on"], calls
            await command("timer", "finish", entity_id=TIMER)
            assert hass.states.is_state(TIMER, "idle")
            assert hass.states.is_state(HEATER, "off"), calls
            assert calls == ["turn_on", "turn_off"], calls

            await command("script", "bayit9_fixture_start", duration=1)
            await command("script", "bayit9_fixture_stop")
            assert hass.states.is_state(HEATER, "off")
            assert hass.states.is_state(TIMER, "idle")

            heater.report(available=False, is_on=True)
            await hass.async_block_till_done()
            checked = len(calls)
            heater.report(available=True, is_on=True)
            await hass.async_block_till_done()
            assert len(calls) == checked + 1 and calls[-1] == "turn_off", calls
            assert hass.states.is_state(OTHER, "on")

            await command("automation", "turn_off", entity_id=CUTOFF)
            await rejects_start(1)
            assert calls[-1] == "turn_off"
            print("PASS Core 2026.11.2 blueprint import, actual timer, startup, expiry, stop and switch reconnect.")
        finally:
            await hass.async_stop(force=True)


if __name__ == "__main__":
    asyncio.run(run())
