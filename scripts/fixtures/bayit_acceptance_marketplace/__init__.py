"""Supply a CI credential to the native Marketplace in a disposable fixture."""

import asyncio
from collections.abc import Mapping
import logging
import os
from pathlib import Path
import re

from homeassistant.config_entries import SOURCE_SYSTEM
from homeassistant.const import CONF_TOKEN
from homeassistant.core import HomeAssistant
from homeassistant.helpers.start import async_at_started

LOGGER = logging.getLogger(__name__)
MARKETPLACE = "marketplace"


async def async_setup(hass: HomeAssistant, _config: Mapping) -> bool:
    """Use the public GitHub credential given to this fresh fixture only."""
    marker = os.environ.get("BAYIT_QA_MARKER", "")
    token = os.environ.get("BAYIT_QA_MARKETPLACE_TOKEN", "")
    if (
        hass.config.location_name != "Bayit 9 Acceptance Fixture"
        or not re.fullmatch("[0-9a-f]{32}", marker)
        or not token
    ):
        return False

    marker_file = Path(hass.config.path("www", "bayit-acceptance-marker.txt"))
    try:
        on_disk = await hass.async_add_executor_job(marker_file.read_text, "ascii")
    except (OSError, UnicodeError):
        return False
    if on_disk != marker + "\n":
        return False

    async def connect_marketplace(_hass: HomeAssistant) -> None:
        entries = hass.config_entries
        for _attempt in range(60):
            enabled = entries.async_loaded_entries(MARKETPLACE)
            if enabled:
                break
            await asyncio.sleep(0.5)
        else:
            LOGGER.error("The native Marketplace config entry did not load")
            return

        if (
            len(enabled) != 1
            or enabled[0].source != SOURCE_SYSTEM
            or enabled[0].data.get(CONF_TOKEN)
        ):
            LOGGER.error("The Marketplace config entry is not fresh")
            return

        entry = enabled[0]
        # Match the normal reconfigure flow's update-and-reload effect.
        entries.async_update_entry(entry, data={**entry.data, CONF_TOKEN: token})
        entries.async_schedule_reload(entry.entry_id)

    async_at_started(hass, connect_marketplace)
    return True
