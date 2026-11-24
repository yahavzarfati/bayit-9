# Dashboard configuration

Use the Bayit 9 editor from **Edit dashboard** in Home Assistant. Strategy settings are part of the dashboard configuration, so their defaults are available from any device that opens it.

| Option | Effect |
| --- | --- |
| `locale` | `auto`, `en` or `he`. The default uses the Home Assistant language. |
| `title` | Override the screen title. |
| `area_ids` | Area IDs to show, in the listed order. An empty list displays all discovered rooms. |
| `show_unassigned` | Show unassigned devices in their own room. Default `true`. |
| `hidden_entities` | Entity IDs to exclude from the dashboard. |
| `included_entities` | Extra visible entity IDs to include, such as a template sensor omitted by discovery. |
| `background` | `aurora`, `lagoon`, `dunes` or `graphite`. |
| `shape` | `soft`, `circle` or `square`. |
| `layout` | `classic` or `header`. |
| `preference_key` | Optional browser preference key for households using multiple Bayit 9 dashboards. |
| `profiles` | Boiler and heater controls mapped to local entities. See [heating profiles](heating.md). |

Entity-level room assignment takes precedence over device-level assignment. Home Assistant's disabled and hidden entities remain excluded. Diagnostic and configuration entities are omitted from automatic discovery. Entities selected explicitly still follow the dashboard's room filters.

    strategy:
      type: custom:bayit-9
      locale: en
      title: Home
      background: lagoon
      shape: circle
      area_ids:
        - lounge_demo
        - studio_demo
      show_unassigned: false
      hidden_entities:
        - switch.demo_spare
      included_entities:
        - sensor.demo_temperature
