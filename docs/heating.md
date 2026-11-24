# Bayit 9 timed heating

## Already using Simple Timer

An existing Simple Timer instance can supply the countdown, preset durations and daily usage for its device. Set `timed.simple_timer_entity` to the integration's runtime sensor for that device. Bayit 9 checks the sensor's linked device before offering start, extend or stop. For a climate device controlled by an existing automation through an `input_boolean`, set `timed.simple_timer_target` to that specific helper. The configured automation must turn the same climate entity on and off as the helper changes. For a heater controlled by a template fan, the optional timer target can be the exact switch used by both the fan and the timer.

Set `timed.min_minutes`, `timed.max_minutes`, and `timed.step_minutes` to match the limits for the installation. `timed.presets` lists the durations shown on the panel. `timed.daily_usage_entity` can read a separate duration sensor that reports seconds, minutes or hours. A profile uses either Simple Timer or the native timer and scripts below.

## Boiler schedule and usage history

Open the dedicated boiler panel to see the last seven days of usage. Home Assistant Recorder supplies the running intervals, and the Activity log supplies the attributed source when it is available. The list shows confirmed runs of at least two minutes.

When Scheduler is installed, a bound Simple Timer boiler profile can list and manage simple schedules that belong to that boiler. Complex schedules can be viewed in Scheduler. Optional `schedule.save_script` and `schedule.delete_script` enable server-side revision checks for existing schedules. Choose those scripts only when they are configured for this boiler’s scheduler records and return a success response.

## Using native Home Assistant timers

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

## Optional heating level

If the integration exposes a separate `number` entity for the heater's power level, select it as **Heating level entity** in the profile. Bayit 9 uses the minimum, maximum, and step of the entity, then checks its reported value after a change. Select a number that only adjusts the level. A timed profile exposes this adjustment while its dedicated timer is active.

A heater implemented as a fan can use `level_steps` for a fixed number of steps from 2 to 12. Bayit 9 sends the equivalent native fan percentage. If provided, `level_read_entity` reads the reported step from the heater’s `input_number` helper.

## Optional weekly schedule

Requires Home Assistant 2026.11.2 or newer.

1. Create a **Schedule** in **Settings → Devices & services → Helpers**. Add weekly time blocks for the heater.
2. Import the [weekly timed heating blueprint](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fyahavzarfati%2Fbayit-9%2Fmain%2Fblueprints%2Fautomation%2Fbayit_9%2Fweekly_timed_heating.yaml) and create an automation. Select the Schedule helper and the guarded Start script for this heater. Set the default run length in minutes.
3. To override the default for one block, edit the block's **Additional data** and add a numeric `duration_minutes` value, such as `20`. You can leave Additional data empty to use the same run length each time. A value must be a whole number from 1 through 60. The heater's Start script also enforces its own maximum.

Home Assistant starts a run at a new block boundary, including between adjacent blocks, when the switch and timer are ready. It uses up to the number of whole minutes still available in that block. For example, a 07:00–07:31 block gives a 30-minute run time enough room to begin. A block with less than one minute left is skipped. An already-running heater keeps its existing timer.

Disabling the weekly automation or removing a block prevents future starts. A block ending or being edited does not cancel a running timer. Use the mapped Stop script to stop the current run immediately. The weekly automation does not replay missed starts when Home Assistant restarts, the Schedule entity reconnects, or a block is edited mid-window. The cutoff automation still reconciles an existing timed run after startup. [Home Assistant Schedule](https://www.home-assistant.io/integrations/schedule/)

## Developer tests

Run `python -m pip install -r tests/requirements-heating.txt` followed by `python tests/test_heating_kit.py`. Tests execute the supplied templates and action sequences with synthetic states and service calls. They never connect to a home or a real heater.

For native integration coverage, use a Python environment with `homeassistant==2026.11.2` and run `python tests/test_heating_core.py`. It boots a temporary Core configuration with a native Timer and two fake switches. It seeds a timer that expired during downtime so the test can verify cutoff at startup.

Run `python tests/test_heating_schedule.py` in the same environment for weekly schedule coverage. It uses the native Schedule trigger, the guarded Start script and fake switches.
