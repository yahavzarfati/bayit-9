# Bayit 9

A room-based Liquid Glass dashboard for Home Assistant. Bayit 9 groups the devices already in your Home Assistant by area and gives each room its own controls and live status.

[הוראות בעברית](docs/install.he.md) · [Heating profiles](docs/heating.md)

## Install through HACS

The **Community dashboards** picker requires Home Assistant 2026.5 or newer. Assign devices to areas in Home Assistant to give them room cards. Devices without an area appear together by default.

1. Open **HACS** and select **Custom repositories** from the menu.
2. Add **yahavzarfati/bayit-9** as a **Dashboard** repository and download it.
3. Reload the Home Assistant frontend. If you use the Companion app, close and reopen its dashboard view.
4. Open **Settings → Dashboards → Add dashboard → Community dashboards → Bayit 9**.

Choose **Edit dashboard** to pick rooms, arrange their shortcuts, include or hide specific entities, and map controls for a boiler or heater. Bayit 9 starts in the Home Assistant language and supports English and Hebrew.

## Controls and preferences

- Lights, switches, covers, fans, climate and locks use the entities and permissions you already have in Home Assistant.
- Other entities can open their native Home Assistant controls from the room.
- A timed heating profile uses a timer and script that you select from your own installation.
- In-dashboard appearance choices live in the browser. Set shared defaults in the dashboard editor.

Home Assistant manages room assignment and access to devices. Bayit 9 runs in the frontend and uses the same connection as other dashboards.

## Manual configuration

If Lovelace resources are managed in YAML, add the resource URL displayed by HACS as a `module` in the Lovelace resource list. Then configure a dashboard with this strategy, either in YAML or through the strategy editor.

    strategy:
      type: custom:bayit-9

See [configuration options](docs/configuration.md) for examples.

## Development

Use Node.js 22 or later.

    npm ci
    npm test
    npm run build
    npm run check:dist

The build produces `dist/bayit-9.js`, the browser module installed by HACS.
