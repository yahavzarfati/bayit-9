"""Seed HACS with a CI credential inside the disposable acceptance fixture."""

from collections.abc import Mapping
import os
from pathlib import Path
import re
from types import MappingProxyType

from homeassistant.config_entries import ConfigEntry, SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.helpers.start import async_at_start


async def async_setup(hass: HomeAssistant, config: Mapping) -> bool:
    """Add the same native HACS config entry used by an interactive install."""
    marker = os.environ.get("BAYIT_QA_MARKER", "")
    token = os.environ.get("BAYIT_QA_HACS_TOKEN", "")
    marker_file = Path(hass.config.path("www", "bayit-acceptance-marker.txt"))
    if (
        hass.config.location_name != "Bayit 9 Acceptance Fixture"
        or not re.fullmatch("[0-9a-f]{32}", marker)
        or not token
        or hass.config_entries.async_entries("hacs")
    ):
        return False

    try:
        on_disk = await hass.async_add_executor_job(marker_file.read_text, "ascii")
    except (OSError, UnicodeError):
        return False
    if on_disk != marker + "\n":
        return False

    async def add_hacs_entry(_hass: HomeAssistant) -> None:
        entry = ConfigEntry(
            domain="hacs",
            title="HACS",
            data={"token": token},
            options={"experimental": True},
            source=SOURCE_USER,
            version=1,
            minor_version=1,
            unique_id=None,
            discovery_keys=MappingProxyType({}),
            subentries_data=None,
        )
        await hass.config_entries.async_add(entry)

    async_at_start(hass, add_hacs_entry)
    return True
