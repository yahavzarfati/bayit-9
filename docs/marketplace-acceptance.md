# Marketplace release acceptance

The **Marketplace release acceptance** workflow runs against the official Home Assistant Container image. From the public repository's main branch, select a published tag with the `bayit-9.js` release asset. Home Assistant 2026.11.3 is the default fixture version. The workflow also offers 2026.11.2.

The fixture accepts the normal Marketplace warning for a temporary owner, detects Bayit 9 as a dashboard resource, adds the public custom repository, and installs the exact release through the native Marketplace WebSocket commands. It verifies that Home Assistant registers a versioned Lovelace module and serves the same bytes as the published release asset. A browser then creates Bayit 9 using the native dashboard picker, controls a synthetic light, and exercises layout persistence.

Marketplace requires a GitHub connection when adding a custom repository. The workflow uses the standard short-lived GitHub job credential with **Contents: read**. A test helper supplies it to the temporary installation's automatically created native Marketplace entry and reloads the entry, following the effect of the built-in reconfigure flow. The runner verifies that native Marketplace reports GitHub connected. This fixture exercises package installation. Interactive GitHub device sign-in is a separate test. The launcher removes the temporary Docker volume with the credential on exit. On failure, the launcher prints a filtered, credential-redacted startup log. CI stores only a synthetic browser screenshot. [Marketplace documentation](https://www.home-assistant.io/integrations/marketplace/), [Core authentication flow](https://github.com/home-assistant/core/blob/2026.11.3/homeassistant/components/marketplace/config_flow.py#L150-L165)

For a disposable Docker runner, provide an installation token scoped to the public Bayit 9 repository as `BAYIT_QA_MARKETPLACE_TOKEN` through the runner's secret mechanism. Install Node.js 22 and Chromium before starting the launcher.

```bash
npm ci
npx playwright-core install --with-deps chromium
bash scripts/run-ha-marketplace-acceptance.sh owner/bayit-9 v0.1.0 2026.11.3
```
