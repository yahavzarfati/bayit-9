# HACS release acceptance

Run **HACS release acceptance** from the Actions tab on the public repository’s main branch. Supply the tag of a published release containing `bayit-9.js`. The workflow creates a fresh Home Assistant container on a loopback-only port, seeds HACS 2.0.5 with a job-scoped credential, and uses the same HACS WebSocket endpoints as its interface to add the custom repository and download the requested version. It compares the SHA-256 of the published asset and the module served directly by Home Assistant, then runs the native dashboard picker, demo-light and mobile layout checks.

The default read-only `GITHUB_TOKEN` is intended for a fresh fixture’s on-demand install. HACS reserves 1,000 GitHub requests for background tasks. A standard job token cannot serve a queue once HACS needs that reserve. If the job credential cannot access public upstream endpoints or HACS reports that it is rate-limited, re-run with **Use the dedicated read-only GitHub App**. Install that App only on the Bayit 9 repository with **Contents: Read-only** access. Configure `HACS_APP_CLIENT_ID` as an Actions variable and `HACS_APP_PRIVATE_KEY` as an Actions secret. The workflow issues and revokes a short-lived installation token. [HACS queue code](https://github.com/hacs/integration/blob/2.0.5/custom_components/hacs/base.py#L891-L934), [GitHub token limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [GitHub App action](https://github.com/actions/create-github-app-token#usage)

The test covers the package installation and dashboard creation path. HACS’s interactive GitHub device authorization and update lifecycle have separate coverage requirements. The browser routes HTTP and HTTPS requests only to the disposable HA fixture. CI uploads only a failure screenshot. Docker removes the container and its configuration volume, including the native HACS credential, on exit.

For a disposable Linux runner with Docker, Node 22, Chromium, `curl`, `unzip` and `sha256sum` installed, export a short-lived read-only GitHub App installation token as `BAYIT_QA_HACS_TOKEN` through the runner’s secret mechanism and run from the repo root.

```bash
npm ci
npx playwright-core install --with-deps chromium
bash scripts/run-ha-hacs-acceptance.sh owner/bayit-9 v0.1.0
```
