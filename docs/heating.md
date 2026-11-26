# Bayit 9 timed heating

## Already using Simple Timer

An existing Simple Timer instance can supply the countdown, preset durations and daily usage for its device. Set `timed.simple_timer_entity` to the integration's runtime sensor for that device. Bayit 9 checks the sensor's linked device before offering start, extend or stop. For a climate device controlled by an existing automation through an `input_boolean`, set `timed.simple_timer_target` to that specific helper. The configured automation must turn the same climate entity on and off as the helper changes. For a heater controlled by a template fan, the optional timer target can be the exact switch used by both the fan and the timer.

Set `timed.min_minutes`, `timed.max_minutes`, and `timed.step_minutes` to match the limits for the installation. `timed.presets` lists the durations shown on the panel. `timed.daily_usage_entity` can read a separate duration sensor that reports seconds, minutes or hours. A profile uses either Simple Timer or the native timer and scripts below.

To let users clear the duration selection while a Simple Timer is idle, turn on **Allow an unselected timer duration (0 minutes)** in the profile editor. In YAML, set `timed.idle_zero_duration: true`. This option requires the same value for `min_minutes` and `step_minutes`, such as 15 minutes. At zero minutes the start button is disabled. The timer can still be extended while running using the configured positive durations.

The history button alongside a timer's countdown opens its history in Home Assistant. For Simple Timer it opens the linked status sensor when available, or the runtime sensor otherwise.

Tap a timer's **Used today** reading to open details for the sensor supplying that value. For a directly linked Simple Timer, the profile editor also offers **Allow reset of this daily usage counter**. When enabled, press and hold the reading or press Shift+Enter, then confirm to reset that timer’s daily counter. A separate usage sensor can open its details.

In YAML, use `allow_daily_usage_reset: true` under the profile’s `timed` settings. Reset is available for the linked Simple Timer’s own usage reading while it reports a positive value and publishes the reset service.

## Vertical swing reporting

In a climate profile, **Display when vertical swing is unreported** offers the modes advertised by that air conditioner. Set `unreported_swing_mode` in YAML to the same native mode. Bayit 9 displays the configured label when vertical swing is unreported and identifies it as a fallback. Choose an available mode to send it explicitly. Reported modes take priority.

## Boiler schedule and usage history

Open the dedicated boiler panel to see the last seven days of usage. Home Assistant Recorder supplies the running intervals, and the Activity log supplies the attributed source when it is available. The list shows confirmed runs of at least two minutes.

When Scheduler is installed, a bound Simple Timer boiler profile can list and manage simple schedules that belong to that boiler. Complex schedules can be viewed in Scheduler. Optional `schedule.save_script` and `schedule.delete_script` enable server-side revision checks for existing schedules. Choose those scripts only when they are configured for this boiler’s scheduler records and return a success response.

In **Rooms → Device display**, enable **Boiler quick power** for a writable boiler switch with a Simple Timer profile. Tap or press Enter for manual power, or hold or press Shift+Enter to open the boiler timer. Bayit 9 sends manual power-on without a timer duration. Any automatic cutoff configured in Home Assistant still applies. Power-off during an active normal run cancels that run and switches the boiler off. In YAML, list the switch ID in `boiler_quick_power_entities` on its room override.

In a timed boiler profile, enable **Show the boiler timer with schedule or history** to keep the timer visible above those views. Set `boiler_timer_with_details: true` in YAML. Bayit 9 remembers the chosen view in the browser. The schedule is available when the timer and Scheduler support it. While a compact schedule draft is open, the form uses separate 24-hour and five-minute selectors and puts the weekday presets above individual days. Returning to the list brings the current timer back into view.

The usage history keeps the source recorded by Home Assistant when it is available. A timer run without a recorded user is marked **Matches schedule** when it started on the same local weekday and minute as a currently enabled recurring schedule for that boiler. The label describes a time match. A past schedule may have changed since the run.

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

For a heater fan with Simple Timer, an optional **Level selection script** (`level_select_script`) lets you choose a level before starting the heater or while it is already on. Select the same heater's **Heating level feedback** helper (`level_read_entity`) and set its step to 1, its minimum to 0 or 1, and its maximum to at least `level_steps`. If the timer monitors a separate switch, Bayit 9 requires that the linked switch and the fan report the same power state.

The script must accept one integer field named `target_step` and own the update of the feedback helper. It should store the selection while the heater is off and change the level while the heater is already running. Its server-side checks must prevent any level selection from energizing or restarting the heater, including if heating ends during the request. It must leave the timer and cutoff in force and update feedback after it completes the selection. Verify that contract on your own script before mapping it. Bayit 9 confirms the observed level and power states after the script returns.

The Home heater shortcut shows an orange outline and activity dots during a pending level adjustment or while Home Assistant reports the level selection script is running. To include level changes made by an automation or another client, choose **Additional heater activity script** (`level_activity_script`) for the same profile. Select the script that actually applies the new level. The dashboard only observes its state and continues to use the existing level selection control for commands.

For a heater fan whose Simple Timer monitors a separate linked switch, **Next-start level helper** (`level_preselect_entity`) is an optional `input_number` used only to store the next requested level. Configure the helper that this heater reads at startup. The helper must be dedicated to this heater and changing its value must have no device-action side effects, including through automations. It uses a step of 1, a minimum of 0 or 1, and a maximum of at least `level_steps`.

The dashboard offers **Level for next start** when both the fan and linked switch report off and the matching timer is idle. Selection updates only that helper and confirms its reported value. The running heater keeps its existing level action and feedback. If the heater starts at the same moment through another control, the start uses the value available when the startup automation reads the helper.

With **Automatic heater cutoff** configured, enable **Switch power with the heater icon in its popup** to use the same guarded power action as the Home shortcut. Tap the radiator or press Enter to switch power. Press and hold, or press Shift+Enter, for Home Assistant details. When the power action is unavailable, the icon opens details. The timer and its duration presets remain available through the existing controls. In YAML, set `heater_popup_quick_power: true` on the heater profile.

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
