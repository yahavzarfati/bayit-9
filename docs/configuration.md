# Dashboard configuration

If you are a Home Assistant administrator, open the Bayit 9 gear and choose **Customize home** on a storage-managed dashboard. Open **Rooms** to create or edit a room. Set **Rooms on the dashboard** to **Choose rooms and order**, then open **Displayed rooms and order** to arrange or hide the selected rooms. Each room can use its Home Assistant devices automatically or an ordered list you choose. You can give a room a display name and icon or create a room that exists only in Bayit 9. **Save dashboard** applies your changes across devices. The strategy editor is also available in Home Assistant’s dashboard settings. Switching to **Automatic** keeps your last manual room list and order so you can return to them later.

| Option | Effect |
| --- | --- |
| `locale` | `auto`, `en` or `he`. The default uses the Home Assistant language. |
| `title` | Override the screen title. |
| `room_selection` | `auto` displays discovered rooms. `manual` uses exactly the rooms listed in `area_ids`, including selected Areas with no devices. An empty manual list keeps those rooms hidden. The setting for devices without a room remains separate. |
| `area_ids` | Area or dashboard-only room IDs to show in the listed order. Without `room_selection`, existing lists filter discovered rooms and an empty list uses automatic discovery. |
| `room_overrides` | Room IDs mapped to objects with optional `name`, `icon`, `entities`, `additional_entities`, `entity_icons`, `entity_names`, `sections`, `panel_hidden_entities`, `read_only_entities`, `activities`, `media_panel_links` and `vacuum_panel_links`. Use an ID starting with `bayit_room_` to add a dashboard-only room. |
| `discovery_mode` | `all` includes device controls and readable entities. `controls` discovers only directly controllable domains. You can still add a readable entity to a room manually. |
| `show_unassigned` | Show unassigned devices in their own room. Default `true`. |
| `hidden_entities` | Entity IDs to exclude from the dashboard. |
| `included_entities` | Extra visible entity IDs to include, such as a template sensor omitted by discovery. |
| `overview_entities` | Optional visible entities to include in the toolbar's home overview. |
| `room_shortcuts` | Optional per-room lists of up to six visible entity IDs, in display order. A room without a list uses automatic shortcuts. An empty manual list hides that room's shortcuts. The room override `shortcut_selection: auto` enables automatic shortcuts while keeping the manual list. |
| `popup_aliases` | Optional mapping of old URL fragments to visible popup routes on this dashboard. |
| `light_effect_groups` | Optional categories for a light's advertised effects. Open the light's details, choose an effect and press **Apply**. |
| `light_effect_favorites` | Lights with configured effect categories that allow personal favorites. |
| `light_status_refresh_buttons` | Optional mapping from a light to a status request button registered to the same Home Assistant device. |
| `light_mode_sources` | Optional mapping from a grouped light to a same-device select and its fixed-color option for opening the light details. |
| `light_effect_category_sources` | Optional per-light `input_select` for a category shared across the home. |
| `background` | A built-in wallpaper ID such as `aurora` or the ID of a shared photo listed in the same dashboard. |
| `shared_wallpapers` | Ordered shared photos with an `id`, `name`, local image `path` and optional local `preview` path. |
| `fullscreen` | Set to `true` to hide the Home Assistant header and sidebar on this standalone dashboard. Use **Home Assistant menu** in Bayit 9 Settings, or add `?disable_km=1` to the dashboard address, to restore them. |
| `shape` | `soft`, `circle` or `square`. |
| `layout` | `classic` or `header`. |
| `preference_key` | Optional explicit browser preference group. By default, the Home view and its alternate URLs share one group per dashboard. |
| `toolbar` | Optional ordered entries with `kind`, `label`, `icon`, `entities` or `sections`. Set `placement: settings` to put a screen inside Settings. Link entries use a local Home Assistant `path`. Security entries can opt in to an Oref alert map. |
| `profiles` | Climate, boiler and heater controls mapped to local entities. See [heating and timer profiles](heating.md). |

The Settings appearance controls preview changes in the current browser. On a storage dashboard, an administrator can save a built-in or shared wallpaper, button shape, and room layout as household defaults. Select **Use household defaults** on a device to reset its local override. Photos added through **My photo** stay in the browser that uploaded them.

On a storage dashboard, enable **Save admin appearance choices for the household immediately** in **Customize home → Appearance** to save an administrator's wallpaper, button shape and room-title choices when selected. Home Assistant updates open dashboards for devices using household defaults. Personal photo uploads and other users' local choices keep their existing behavior. In YAML set `appearance_sync: true` on the strategy.

In **Customize home → Appearance → Shared photos**, add named pictures already served by Home Assistant under `/local/`. Supported formats are JPG, PNG, WebP and AVIF, up to 20 MB per image. An optional smaller preview loads in the gallery before the full-size image. Save the dashboard to make these choices available to its users. In YAML, the same entry can use `{ id: patio_photo, name: Patio, path: /local/wallpapers/patio.webp, preview: /local/wallpapers/patio-small.webp }` under `shared_wallpapers`.

Entity-level room assignment takes precedence over device-level assignment. Home Assistant's disabled and hidden entities remain excluded. Diagnostic and configuration entities are omitted from automatic discovery. A room override with `entities` uses exactly the listed visible entities, in order. An empty list keeps the room with no devices. Omit `entities` to use automatic discovery. `entity_icons` is a mapping from entity ID to icon for that room. Assigning a device explicitly moves it out of automatically discovered rooms on this dashboard. You can include it in multiple rooms by listing it explicitly in each one. These choices leave Home Assistant area assignments as they are.

Each room section has a `kind`, optional `id` and `title`, and an ordered list of `entities`. Available kinds are `lights`, `covers`, `climate`, `heating`, `sensors`, `devices`, `garage`, `weather`, `security`, `media`, `vacuum` and `laundry`. Use an empty title to hide the heading. Devices without an assigned section follow the default grouping.

For a manually arranged covers section, choose **Cover card layout → Two columns when there is room** to keep the second column even when the section has one cover. In YAML, set `columns: 2` on that section. On narrow screens the covers use one column so the open, stop and close buttons have room.

Use **Device card layout → Two columns when there is room** in a manually arranged devices section to place compact device cards and tiles together. Standard device cards occupy a full row. In YAML, set `columns: 2` on the `devices` section.

Enable **Show tile status only when pending or unavailable** in an authored devices section to show compact tiles with just their icons and names during ordinary operation. Tiles still show when a command is pending or a device is unavailable, and reported states remain accessible. In YAML, set `tile_status: attention` on the `devices` section.

In **Rooms → Device display**, a temperature sensor can use **Compact temperature graph** and a custom line color. The tile shows the reported temperature and the last 24 hours. Select it to open the sensor's Home Assistant details. In YAML, map each sensor to a six-digit hex color under `room_temperature_graph_colors` in its room override.

In **Customize home → Appearance**, **Align dashboard to the left on wide screens** places the toolbar and room grid together on the left on tablets and desktop. In YAML, set `wide_alignment: left`.

In **Rooms**, use **Room name line break in classic layout** to choose where a multiword room name breaks on its Home card. In YAML, set `classic_title_break: 1` in that room's `room_overrides` to break after the first word. The top-title layout and the room panel use the full room name.

When adding a device from an automatic room, select **Keep in the automatic room too** to show it in both rooms. Its Home Assistant area stays the same. In YAML, list those devices under `keep_in_automatic_room_entities` in the destination room override.

In an automatic room, open **Additional devices**, select a device and choose **Also show in this room**. Save the dashboard to apply the change. The device stays visible in its other rooms, and new devices assigned to this Home Assistant area still appear automatically. In YAML, list these IDs under `additional_entities` in the automatic room's override.

Switching **Devices in this room** keeps the ordered manual list and its mirroring settings ready for your return. Automatic mode keeps its own additional devices. In YAML, `device_selection: auto` activates automatic discovery even when the same override retains an `entities` list.

You can arrange sections manually while **Devices in this room** stays **Automatic**. Devices later added to the room's Home Assistant area follow the default grouping until you move them to a custom section. A room override with `device_selection: auto` uses this arrangement. Existing sections-only overrides continue to select their listed entities unless this option is set.

In **Rooms**, open **Device display** and select a device. Clear **Name in this room** to display its default name, or turn off **Show name in this room** to keep the caption available to assistive technology while hiding it visually. The YAML `entity_names` maps IDs to room captions. An explicit empty string hides the visual caption.

Set **Device popup title** to name the device’s Bayit 9 popup in the selected room. Clear the field to use the regular device name. In YAML, use the `device_popup_names` mapping under that room’s override.

Choose **Icon in this room** in **Device display** to customize the glyph in the room and on its Home shortcut. Clear it with **Use default icon**. The icon can be any MDI icon and other rooms retain their own icons for the same entity. The YAML `entity_icons` maps room member IDs to icons.

In **Device display → Separate room panel icon**, choose an MDI icon for the selected device's tile inside that room. The Home shortcut and the device's standalone details keep their shared icon. In YAML, map room member IDs to MDI icons under `panel_entity_icons` on the room override.

Turn off **Show device in room panel** to hide the control from both manual sections and automatic grouping inside that room. The corresponding YAML `panel_hidden_entities` lists room member IDs. Use **Room shortcuts** to give a hidden control a button on Home. Existing device links can still open its details. Home Assistant permissions govern device access.

In **Room shortcuts**, turn off **Open details with a long press** for an individual switch shortcut to keep the quick toggle and consume a long press without a command. The YAML field `shortcut_no_details` under that room’s `room_overrides` lists the selected switch shortcuts. This setting applies only to ordinary switch shortcuts and keeps existing device links available.

In **Room shortcuts**, choose a **Long-press destination** for each shortcut. Choose another device in the room, Home Assistant details for the shortcut device, or a configured screen outside Settings. The quick tap keeps its existing action. In YAML, set `shortcut_detail_entities` under the room’s `room_overrides` to map shortcuts to same-room entity IDs. Use `shortcut_detail_routes` to map a shortcut to `native` or `panel:<toolbar-id>`. A valid route takes precedence when both maps name the same shortcut. The ordinary-switch opt-out applies to all destinations.

In **Room shortcuts**, enable **Switch power with a short tap** for a climate device or a compatible Simple Timer boiler. A short tap acts on the reported power and timer state. A Home shortcut for a template fan heater also supports native power if its profile specifies an enabled **Automatic heater cutoff** automation. Select the automation that starts the linked Simple Timer when the heater relay turns on. In YAML, set `home_heater_cutoff_automation` on that heater's profile. The shortcut checks that the fan and relay agree and the timer is idle before starting the heater. A long press opens the chosen details. If there is no safe power action, the shortcut opens details. In YAML, list the selected IDs in `shortcut_power_entities` under the room override.

Enable **Show brightness and temperature in this room** to add a light's supported sliders to its room tile. Adjustments apply when the slider is released. The same light keeps its default presentation in other rooms. The YAML field `inline_light_entities` lists the lights with inline controls.

Use **Open Home Assistant details from the cover header** in **Room device display** to open the selected cover's native details with a tap or hold. The room remains open underneath. The YAML field `native_cover_header_entities` lists the covers with this behavior.

Use **Show reported values in compact light controls** to show a dash when brightness or white temperature is missing. For white lights, this applies in compact room controls and compact light details. A tunable-white light’s standalone compact popup shows a filled slider tinted by its reported white color when available. The room controls and two-slider layout keep their existing style. For lights with color or effects, it adds a single power button and a brightness slider above the available modes in the device popup. Brightness applies on release, with a minimum of 1%. In **Fixed color**, hue and saturation apply on release. Tapping a quick color applies it directly. Use the power button to turn the light off. In YAML, list the lights in `compact_light_reading_entities` on the room override.

For a white light with brightness and color-temperature control, **Show both sliders in light details** puts both adjustments in the dedicated popup. Each slider has its own **Apply** button. In YAML, list the lights in `dual_light_detail_entities` on the room override.

Use **Open Home Assistant details with a long press on this light** in **Room device display** to change where a light's room tile opens its details. A short tap still switches the light. The room remains open underneath its Home Assistant details. The YAML field `native_light_hold_entities` lists the lights with this behavior in each room.

Use **Devices turned off by the room icon** to give the icon a quick room shutdown action. Pick the exact room members to turn off. The room name still opens the room. The YAML field `turn_off_entities` accepts room lights, switches, fans, climate devices, water heaters, and media players. A device receives the action while it is available and offers a standard direct turn-off command. The selection is independent from the room's lighting count.

On a standalone Bayit 9 dashboard, opening a room, device or screen updates the URL. Use the browser's Back and Forward buttons to return to those views. To keep an old bookmark, open **Customize home → Toolbar and extra screens → Popup links** and choose its new destination. Enter the fragment of the old URL, starting with `#`, then save the dashboard. In YAML, add the fragment under `popup_aliases`, such as `"#old-lamp": "#device/studio/light.desk"`. Room links use `#room-<room-id>` and screen links use `#panel/<toolbar-id>`. Links open the viewer with the dashboard's usual device permissions. A bound boiler's Schedule destination opens the current list at `#device/<room-id>/<boiler-entity>/schedule`. Use the list to open a fresh form.

A dashboard-only room keeps its links when renamed or reordered. Deleting the room removes aliases that point to it or to one of its devices. Newly created rooms receive their own IDs.

In **Rooms → Device display**, enable **Show as a compact device card** for a lock or media player. Adjacent compact cards in a room's **Devices** section share a row. The lock shows one action for its reported state and keeps the usual unlock confirmation. Media shows supported playback, power and mute controls. Tap either header for Home Assistant details, or hold a media header to open its linked Media panel. In YAML, list the selected entity IDs in `compact_device_entities` on that room's override.

In **Rooms → Device display**, choose **Show as an appliance tile** for an ordinary switch. Tap a writable tile to switch it on or off and hold for Home Assistant details. A switch marked read-only keeps the details gesture. In YAML, list the switches in `appliance_tile_entities` on their room override.

In **Rooms**, enable **Show quick power for this climate device** under **Device display** to add a power button to the room and device popups. Hold it to open Home Assistant details. The button follows the climate device's reported state and uses only supported on or off commands. In YAML, list the climate entities under `climate_power_entities` in the room override.

In **Rooms → Device display**, enable **Arrange thermostat controls in a compact row** for the selected thermostat. The room and its dedicated popup arrange the available controls together and use two balanced rows on narrow screens. If the thermostat also has a configured timer, its dedicated popup shows the reported mode and temperature alongside its title, with separate access to Home Assistant details and any enabled quick power. In YAML, use `compact_climate_controls_entities` on the room override.

In **Rooms**, use **Temperature on home card** to choose a room temperature sensor or a climate device's current temperature. With a sensor selected, **Fallback room temperature** can use a specific climate device when the sensor has no usable reading. Use **Automatic** to let Bayit 9 choose. In YAML, set `room_temperature_entity` and, optionally, `room_temperature_fallback_entity` on the room override.

In **Rooms**, open **Appliance activity badges** to map the room's oven, cooktop, dishwasher or washer. Each `activities` entry has a `kind` (`oven`, `hob`, `dishwasher` or `washer`) and an `operation_entity` sensor. Add `finish_entity` for an expected finish timestamp. The oven requires a finish sensor. The cooktop and washer require a `power_entity`; the cooktop uses the time the power state last changed. A washer can also read a `done_entity` and a percentage `progress_entity`. The badges read these sources directly without adding device controls.

Choose **Boiler elapsed time** to show `HH:MM` for an existing boiler switch in that room. In YAML, add an `activities` entry with `kind: boiler`, `boiler_entity` pointing to the boiler switch in that room and `started_at_entity` pointing to a date-and-time `input_datetime` that records the start of the current run. When that timestamp is unavailable or from an earlier run, the room shows the usual countdown or power state.

Use `read_only_entities` on a room to display a device's state and let users open Home Assistant's details from that room. Bayit omits the device's direct controls in that room and its shortcuts. This is a dashboard display setting. Home Assistant permissions still govern the underlying device and its native details.

A cover shortcut shows the requested direction while Home Assistant is responding. If the cover supports Stop, press the shortcut again during movement to send Stop. The position shown in the dashboard comes from Home Assistant.

Open a light's device controls to pick a color when it advertises RGB, HS or XY support. Choose the color and press **Apply**. Applying a color turns on the light if it was off. Use the power control to turn it off. White temperature and named effects follow the light's reported capabilities.

In **Customize home**, open **Light effect categories** and pick a light. Name a category and choose its first effect, then add or reorder effects. Select **New category** in the category picker to add another. Press **Save dashboard** to share the gallery across devices. If the light temporarily stops reporting effects, its saved categories are kept.

In YAML, use the light's exact reported effect names. Each category has a `title` and ordered `effects`. An effect entry can add an optional display `name` and MDI `icon`. Unlisted native effects appear in **Other effects**. Lights without a matching category use the default effect picker.

In a grouped gallery, **Effects**, **Fixed color**, and **White** switch between controls supported by the light. Switching views leaves the light as it is. Use **Apply** to send the chosen effect, color, or white temperature.

Under **Light effect categories**, choose a **Light status refresh button** when the integration provides a button that requests the light's current state. The light details show a refresh icon that presses the selected button. The light and button must belong to the same Home Assistant device.

For a light with effect categories, choose a **Light opening mode source** and its **Fixed-color option** when the integration exposes the last light mode on a separate select. If the light does not report an effect or color mode, a matching select opens the fixed-color controls. Bayit 9 reads this source when the panel opens. In YAML, map the light ID in `light_mode_sources` to `{ entity: select.lamp_mode, fixed_color_option: Fixed color }`.

Choose a **Shared category helper** in the effect editor to save category selection in a Home Assistant dropdown helper. Unique category names must match the helper’s option names. You can also choose a separate helper option for **All effects**, which includes every effect the light currently reports. After Home Assistant reports the new selection, the same category appears on other devices and on reopening. A category with no available matching helper option is temporary. Choose a helper dedicated to browsing effects. Use the separate **Apply** button to change the light. In YAML, map the light ID in `light_effect_category_sources` to `{ entity: input_select.lamp_categories, all_option: All }`. The `all_option` is optional.

For a grouped light, enable **Allow personal favorites on this device** under **Light effect categories**. Use the star to save or remove the active effect, and use the Favorites button to browse saved effects across all categories. The list belongs to the signed-in Home Assistant account in that browser. If an effect is temporarily unavailable, it reappears in Favorites when the light reports it again.

    strategy:
      type: custom:bayit-9
      light_effect_groups:
        light.demo_reading:
          - title: Evening
            effects:
              - Sunset
              - effect: Slow pulse
                name: Gentle glow
                icon: mdi:weather-night
      light_effect_favorites:
        - light.demo_reading

Toolbar sections accept ordered entities and can render action tiles, locks, covers, person tiles, solar readings, forecasts, and history graphs. Choose those presentations in **Toolbar and extra screens**. A status or graph tile is read-only, and confirmations can be set for explicit actions. Overview sections can show active devices only. Media, vacuum, calendar and other configured screens can live inside Settings.

On a **Devices** or **Overview** screen, choose **Show status items side by side** for a compact status section. In YAML, use `layout: compact` on that section. Tap a graph in this layout to open the sensor's Home Assistant details. To add a separate lock command, set the lock's display role to `lock`. Unlocking asks for confirmation, and locks that require a PIN use Home Assistant's native details dialog.

For a **Devices** screen shown in Settings, enable **Use the room popup position** to align its top edge with room popups. In YAML, set `popup_position: room` on the toolbar entry with `kind: devices` and `placement: settings`.

In an **Automations** actions section, set a script's **Script button behavior** to **Start or stop script** to make the button follow the run reported by Home Assistant. In YAML, give the script entry `role: action` and `command: toggle_script`. The button checks that the observed run is still current before sending a command. Stopping skips the remaining steps in that run. Existing `run_script` entries continue to start a script on each tap.

In an **Overview** status section, choose **Discover active lights** to list currently on lights from across the dashboard's Home Assistant connection. Hidden and disabled entities stay excluded. Use **Exclude these lights** for exact entity IDs and **Exclude by text in entity ID** for literal ID fragments. An active status or covers section can also keep covers visible while they are closing.

In YAML, use `discover: {domain: light, exclude_entities: [light.example], exclude_id_contains: [helper]}` on an Overview status section. Discovery always lists on lights. For a section with selected covers, set `filter: active` and `include_closing: true` to keep closing covers visible until they close.

For a light discovery section or an active status section with selected light actions, choose **Show a button to turn off these lights**. In YAML, set `turn_off_active_lights: true` on the Overview status section. The button appears when at least two visible lights in the section are on and can be turned off directly. It skips lights that require a separate confirmation.

In an **Overview** status or covers section, choose **Discover active covers** to automatically show covers that are open, opening or stopped. Each row shows the reported position and opens the cover's Home Assistant details. Use **Include closing covers** to keep covers visible as they close, or exclude individual covers under **Exclude these covers**. In YAML, use `discover: {domain: cover}` and optionally set `include_closing: true` on the section.

In an **Overview** status section, choose **Discover active climate devices**. Each row shows the operating mode and temperatures and opens Home Assistant details. With both inclusion fields empty, the section lists every visible climate device that is on. You can include specific devices, devices whose entity IDs start with a prefix after `climate.`, or both. Exclusions take precedence. Existing section labels and icons apply to matching devices. In YAML, use `discover: {domain: climate, include_entities: [climate.downstairs], include_id_prefixes: [upstairs_]}`.

A single-sensor history graph in **Sensors** can open a room or a configured Vacuum panel when you tap its heading or reading. In the graph's display settings, select a destination under **Open on graph tap**. In YAML, add `graph_room_id: studio` or `vacuum_panel_id: robot` to the graph entity entry. Choose the ID of a room shown on this dashboard or a configured Vacuum panel.

In a Sensors section shown as a combined graph, enable **Compare trends in a single chart**. Set a shared time range and averaging interval, then choose an optional six-digit line color for each sensor configured as a graph. Choose sensors that report the same unit. The graph shows gaps where Home Assistant reports that a reading is unavailable. Tap a sensor in the legend to hide or show its line while keeping at least one sensor visible.

In YAML, add `comparison: { enabled: true, hours: 24, bucket_minutes: 30 }` to a `kind: series` section on a `kind: sensors` screen. Add `series_color: "#397BD6"` to a graph entry to keep that sensor's line color fixed.

In **Rooms**, choose **Lights in the room count** to count only selected room lights. Clear the selection to count every light in that room. Devices remain available in the room and keep their existing controls.

To use the read-only **Compact agenda**, enable it on the Calendar panel and choose the calendars to include. Its short view shows up to six events across four listed dates. Tap the agenda or use **Show the full week** to see the next seven days. Under **Sections**, each calendar can have its own icon and accent color. Select a daily forecast to show the condition and high beside dates.

Enable **Show month in the date column** for a compact weekday, day and month beside each day's events. In YAML, set `show_month: true` under `calendar_agenda`.

Enable **Open event details when tapped** to see an event's date and time, calendars, and any location, notes or recurrence information returned by Home Assistant. Use **Back to agenda** to return to the same view. In YAML, set `event_details: true` under `calendar_agenda`.

For a media player with playback controls and track details, edit its row in a toolbar section and choose **Now Playing** under **Display as**. In YAML, set `role: now_playing` on that media player. The display uses the track or series title, episode, artist, and playback app or source reported by Home Assistant. When playback position and duration are available, the progress bar also shows the time remaining. Artwork can load through the selected player's Home Assistant proxy.

In a Media panel, select an **Artwork and playback source** under **Large Now Playing artwork** to show the full artwork and track details above the media controls. The artwork is contained within the image area and uses the selected media player's Home Assistant proxy. A local MDI icon appears when the artwork is missing. Set **Fallback artwork icon** to choose that icon.

In YAML use `media_stage: { source_entity: media_player.streamer, fallback_icon: 'mdi:music-note' }` on a Media toolbar entry. The fallback icon is optional. Remove any extra Now Playing section if the artwork stage already shows that device.

To open a Media panel from a room, first configure a Media panel in the toolbar editor. Then choose that panel under **Open on media press and hold** for a media player in the room editor. A regular press opens Home Assistant details, a press and hold opens the selected Media panel, and **Back to room** returns to the source row. In YAML, set `media_panel_links` under the room override with the media entity ID as its key and a Media toolbar entry ID as its value.

In **Rooms → Device display**, enable **Show compact media controls in this room** to keep supported power, playback, Next and mute commands on a media player's room row. The row shows the device's reported volume when available. The linked Media panel keeps its configured controls. In YAML, list the media players under `media_compact_entities` on the room override.

For a Media or Vacuum panel, set **Show in** to **Linked only** to use it from room links and direct popup URLs. In YAML, set `placement: linked` on the Media or Vacuum toolbar entry.

A Media screen can also include a remote. In the toolbar editor choose a playback, volume or power device under **Media remote**. Each role can use a different Home Assistant player. The power button uses the selected device’s reported state and appears when that device supports the corresponding on or off command. To keep supported playback and volume commands available while a configured player reports standby or off, turn on **Show remote controls in standby**. The mute button needs a known mute state.

In YAML add `media_remote: { transport_entity: media_player.streamer, volume_entity: media_player.television, power_entity: media_player.television, allow_standby: true }` to a Media toolbar entry. Each device assignment is optional.

Use **Device display → Preset shortcut** on a climate device to add a one-tap native preset in its room and its dedicated details. The preset and highlight can be different. The highlight reflects the preset reported by Home Assistant. You can also set a short label and an MDI icon. Only presets currently advertised by the device can be sent.

In YAML, set `climate_preset_shortcuts` on a room override. For example `climate_preset_shortcuts: {climate.study: {preset: none, label: SE, icon: 'mdi:leaf', highlight_when: eco}}` adds a shortcut to the default preset and highlights it while Eco is reported. Other rooms keep their own settings.

For a vacuum in a room, choose a panel under **Vacuum panel**, then select **Tap** or **Press and hold** under **Open the vacuum panel with**. The other gesture opens the vacuum's Home Assistant details. **Back to room** returns to the source row. In YAML, `vacuum_panel_links` maps the vacuum entity ID to a Vacuum toolbar entry ID. To open a linked panel with a hold, list that entity in the room's `vacuum_panel_hold_entities`.

The Presence toolbar button uses different icons for zero, one, or multiple home occupants. It counts the people and device trackers configured for that panel and uses their reported Home Assistant states. **Change icon with the number of people at home** controls this behavior in the toolbar editor. In YAML, use `presence_dynamic_icon: true` or `false` on the Presence entry. An explicit `icon` defaults to a fixed icon and is retained when switching modes.

In a **Security** status section, enable **Show compact read-only status tiles** to display sensors and binary sensors as passive readouts. Edit each sensor to customize its labels or the unit shown beside a numeric value. Binary sensors can customize the on and off labels and highlight the reported on state in red. Unknown and unavailable states use the dashboard's standard messages.

In YAML use `layout: readouts` on the status section. A binary sensor can use `readout: { state_labels: { 'on': Active, 'off': Quiet }, danger_on: true }`. A sensor can set `state_labels` for the reported `safe` and `ok` states, and `unit` for numeric readings.

In a **Weather** readings section, enable **Show readings as a compact read-only list** to show each sensor's name and current value on one row. Graphs in the section keep their history charts. In YAML, set `layout: readings-list` on the readings section. Choose **Show readings as chart cards** to keep the authored card order from left to right in either language. In YAML, set `layout: reading-cards`. Native charts keep their configured history duration. If a chart cannot load, its card shows the current reading and still opens Home Assistant details.

In an **Energy** electricity or water section, enable **Show readings with large values** to use Home Assistant's sensor cards for devices displayed as **Status**. Tap a reading to open its details. History charts keep their configured durations. In YAML, set `layout: reading-cards` on the section. In the Energy screen settings, switch off **Show the Home Assistant Energy dashboard link** to keep just the readings and charts. The YAML equivalent is `energy_dashboard_link: false` on the toolbar entry.

Use **Popup header icon** in the Energy screen settings to give the dialog its own icon. In YAML, set `panel_icon: mdi:lightning-bolt` on the Energy toolbar entry.

To add the regional warnings map, edit a **Security** button in **Toolbar and extra screens** and enable **Show the Oref alert map**. This uses the frontend card supplied by the installed [Oref Alert integration](https://github.com/amitfin/oref_alert). In YAML, set `oref_map: {enabled: true}` on a `kind: security` toolbar entry. The optional settings are `auto_fit`, `hebrew_basemap`, `show_pre_alert`, and `show_end`. The map starts at a regional view and keeps the home and device location markers disabled.

For a calibrated Roborock map, edit a **Robot vacuum** button in **Toolbar and extra screens** and enable **Show calibrated floor maps**. Select the robot and its **Selected-map entity**, then pair each map option with the image or camera for that floor. This uses an installed [Xiaomi Vacuum Map Card](https://github.com/PiotrMachowski/lovelace-xiaomi-vacuum-map-card) and calibrated Home Assistant map entities. For YAML, configure `vacuum_map` on a `kind: vacuum` entry with `enabled: true`, `vacuum`, `selector`, and `floors` containing `option`, `image`, and optional `name`. Calibrations and room outlines are read from the active floor's entity while the panel is open. A floor change waits for the selector's reported state before enabling map commands.

For a linked vacuum in **Rooms**, **Vacuum controls in the room** can use a **Status tile** or show only **Cleaning controls** such as start, pause, stop and return to dock. The panel gestures apply in every presentation. In YAML, map the vacuum entity ID to `tile` or `cleaning-controls` under `vacuum_panel_presentation` in the room override.

Under **Vacuum status readings** in **Rooms**, a linked vacuum can show an external status, battery and cleaning progress in its room header. Progress appears during a reported cleaning job. Choose only the sources available in your home. The YAML room override `vacuum_panel_summary` maps the vacuum entity ID to optional `status_entity`, `battery_entity`, `progress_entity` and `cleaning_entity` bindings.

Select **Readings** in the **Robot vacuum** editor and enable **Show compact read-only status tiles** to show vacuum status, battery, selected map, current room or maintenance sensors. Sensor and select labels can use the exact reported value. Sensor numbers can use a custom display unit or zero to three decimal places. The selected map readout displays the reported floor and the map buttons handle floor changes.

For YAML, add `layout: readouts` to the vacuum's `kind: readings` section. A sensor can use `readout: { state_labels: { docked: At dock }, precision: 0, unit: h }`. Every setting is optional. State labels match case and leave unknown and unavailable states to the dashboard. Omit `unit` to keep the Home Assistant entity unit.

    strategy:
      type: custom:bayit-9
      locale: en
      title: Home
      background: lagoon
      shape: circle
      area_ids:
        - lounge_demo
        - bayit_room_reading
      room_overrides:
        lounge_demo:
          name: Living room
          icon: mdi:sofa
        bayit_room_reading:
          name: Reading nook
          icon: mdi:book-open-variant
          entities:
            - light.demo_reading
            - sensor.demo_temperature
          sections:
            - kind: lights
              title: Reading lights
              entities:
                - light.demo_reading
      show_unassigned: false
      hidden_entities:
        - switch.demo_spare
      included_entities:
        - sensor.demo_temperature
