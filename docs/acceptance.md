# Clean Home Assistant acceptance test

The workflow tests Home Assistant Container 2026.5.0 and 2026.11.2. It builds the distributable, creates a fresh configuration in a temporary directory, and runs the official image with a randomly allocated loopback port. The container hosts only Home Assistant's built-in synthetic demo entities.

The test uses Home Assistant's onboarding and token endpoints to create a temporary admin, assigns a demo light to a synthetic area, and registers the built module via the Lovelace WebSocket API. Chromium opens the real dashboard picker, finds Bayit 9 under **Community dashboards**, and creates it. It opens the generated room, actuates the demo light, checks the resulting Home Assistant state, and verifies that an appearance choice persists after reload at a 390-pixel viewport.

The 2026.11.2 job also runs the heating blueprints against a native Timer and a simulated switch. The browser test uses the same Lovelace module registration as a frontend install. The HACS download and update lifecycle and native iPhone Companion runtime are outside this test.

## Run locally on Linux or macOS

Install Docker, Node.js 22 or newer, and Bash. Start with the Bayit 9 repository root.

```bash
npm ci
npm test
npx playwright-core install chromium
bash scripts/run-ha-acceptance.sh 2026.11.2
bash scripts/run-ha-acceptance.sh 2026.5.0
```

On a clean Ubuntu runner, use `npx playwright-core install --with-deps chromium` to supply Chromium's system libraries. The launcher generates the test URL and fixture marker. It removes the container and temporary configuration on exit. A failed run saves supported diagnostics under `test-results/ha-acceptance/<version>/`.

Run the setup contract checks without Docker or Chromium.

```bash
node --test test/ha-acceptance-provision.test.js
```
