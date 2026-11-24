# Bayit 9 timed heating

The optional blueprints control a single dedicated heater switch using Home Assistant's built-in Timer. The dashboard calls the scripts and reads the timer state. The cutoff automation runs on Home Assistant while the dashboard is closed.

## Set up one heater

1. In **Settings → Devices & services → Helpers**, create a **Timer** and enable **Restore**. Use a separate timer for every heater.
2. From **Settings → Automations & scenes → Blueprints**, import the [cutoff blueprint](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fyahavzarfati%2Fbayit-9%2Fmain%2Fblueprints%2Fautomation%2Fbayit_9%2Ftimed_heating_cutoff.yaml) and create an automation. Choose the single heater switch and the dedicated timer. Leave the automation enabled. Configure it with the heater off.
3. Import the [start script blueprint](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fyahavzarfati%2Fbayit-9%2Fmain%2Fblueprints%2Fscript%2Fbayit_9%2Fstart_timed_heating.yaml). Create a script with the same switch and timer, and select the new cutoff automation. Set the run limit suitable for the heater, up to 60 minutes.
4. Optionally import the [stop script blueprint](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fyahavzarfati%2Fbayit-9%2Fmain%2Fblueprints%2Fscript%2Fbayit_9%2Fstop_timed_heating.yaml). Choose the same switch and timer to let the dashboard stop the heater and clear its countdown.
5. In Bayit 9, map the start script, optional stop script and Timer entity. Match the dashboard limit to the start script limit. Make the first functional check with a test switch.

Import from the public repository file URLs or copy the files to the corresponding directories under Home Assistant's `blueprints`. The HACS dashboard download installs the frontend. Importing and configuring blueprints is a separate setup step.

## Operation

The start script accepts `duration` as integer minutes. It requires the switch to report off, the dedicated timer to be idle with Restore enabled, and the cutoff automation to be enabled. It verifies an active countdown before it requests heat. An active or paused timer must be stopped or allowed to finish before starting again. The stop script accepts no fields.

The cutoff reacts to timer expiry, cancellation, pause, Home Assistant startup and a switch subsequently reporting on. It retries every 30 seconds while the switch still reports on without a valid countdown. If the timer is still loading, the automation allows up to 10 seconds for its state to become visible. A restored timer with time left continues. With an expired or invalid deadline, Home Assistant turns the switch off when it can reach it. Keep this timer dedicated to the heater. This cutoff also turns off the switch if it is manually switched on without a valid countdown.

Home Assistant can send the off command only while it is running and the switch is reachable. Keep the heater's hardware thermostat and cutoff in use. Home Assistant documents that its timer-finished trigger may be missed when expiry falls during downtime. The startup and reconnect checks handle this case after Home Assistant returns. [Home Assistant Timer](https://www.home-assistant.io/integrations/timer/)

## Developer tests

Run `python -m pip install -r tests/requirements-heating.txt` followed by `python tests/test_heating_kit.py`. Tests execute the supplied templates and action sequences with synthetic states and service calls. They never connect to a home or a real heater.
