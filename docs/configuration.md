# Dashboard configuration

If you are a Home Assistant administrator, open the Bayit 9 gear and choose **Customize home** on a storage-managed dashboard. Open **Rooms** to choose which rooms appear and in what order. Each room can use its Home Assistant devices automatically or an ordered list you choose. You can give a room a display name and icon or create a room that exists only in Bayit 9. **Save dashboard** applies your changes across devices. The strategy editor is also available in Home Assistant’s dashboard settings.

| Option | Effect |
| --- | --- |
| `locale` | `auto`, `en` or `he`. The default uses the Home Assistant language. |
| `title` | Override the screen title. |
| `area_ids` | Area or dashboard-only room IDs to show in the listed order. An empty list displays all discovered rooms. |
| `room_overrides` | Room IDs mapped to objects with optional `name`, `icon`, `entities`, `entity_icons`, `sections` and `read_only_entities`. Use an ID starting with `bayit_room_` to add a dashboard-only room. |
| `discovery_mode` | `all` includes device controls and readable entities. `controls` discovers only directly controllable domains. You can still add a readable entity to a room manually. |
| `show_unassigned` | Show unassigned devices in their own room. Default `true`. |
| `hidden_entities` | Entity IDs to exclude from the dashboard. |
| `included_entities` | Extra visible entity IDs to include, such as a template sensor omitted by discovery. |
| `overview_entities` | Optional visible entities to include in the toolbar's home overview. |
| `room_shortcuts` | Optional per-room lists of up to six visible entity IDs, in display order. A room without a list uses automatic shortcuts. An empty list hides that room's shortcuts. |
| `background` | A built-in wallpaper ID such as `aurora`, `lagoon`, `dunes` or `graphite`. The appearance options in the editor list all built-in backgrounds. |
| `fullscreen` | Set to `true` to hide the Home Assistant header and sidebar on this standalone dashboard. Use **Home Assistant menu** in Bayit 9 Settings, or add `?disable_km=1` to the dashboard address, to restore them. |
| `shape` | `soft`, `circle` or `square`. |
| `layout` | `classic` or `header`. |
| `preference_key` | Optional browser preference key for households using multiple Bayit 9 dashboards. |
| `toolbar` | Optional ordered entries with `kind`, `label`, `icon`, `entities` or `sections`. Set `placement: settings` to put a screen inside Settings. Link entries use a local Home Assistant `path`. |
| `profiles` | Climate, boiler and heater controls mapped to local entities. See [heating and timer profiles](heating.md). |

Entity-level room assignment takes precedence over device-level assignment. Home Assistant's disabled and hidden entities remain excluded. Diagnostic and configuration entities are omitted from automatic discovery. A room override with `entities` uses exactly the listed visible entities, in order. An empty list keeps the room with no devices. Omit `entities` to use automatic discovery. `entity_icons` is a mapping from entity ID to icon for that room. Assigning a device explicitly moves it out of automatically discovered rooms on this dashboard. You can include it in multiple rooms by listing it explicitly in each one. These choices leave Home Assistant area assignments as they are.

Each room section has a `kind`, optional `id` and `title`, and an ordered list of `entities`. Available kinds are `lights`, `covers`, `climate`, `heating`, `sensors`, `devices`, `garage`, `weather`, `security`, `media`, `vacuum` and `laundry`. Use an empty title to hide the heading. Devices without an assigned section follow the default grouping.

Use `read_only_entities` on a room to display a device's state and let users open Home Assistant's details from that room. Bayit omits the device's direct controls in that room and its shortcuts. This is a dashboard display setting. Home Assistant permissions still govern the underlying device and its native details.

Toolbar sections accept ordered entities and can render action tiles, locks, covers, person tiles, solar readings, forecasts, and history graphs. Choose those presentations in **Toolbar and extra screens**. A status or graph tile is read-only, and confirmations can be set for explicit actions. Overview sections can show active devices only. Media, vacuum, calendar and other configured screens can live inside Settings.

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
