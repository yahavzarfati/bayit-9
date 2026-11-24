#!/usr/bin/env bash
set +x
set -Eeuo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$root"
repository="${1:?Supply the public owner/bayit-9 repository}"
tag="${2:?Supply an already published release tag}"
version="${3:-2026.11.3}"
if [[ ! "$version" =~ ^2026\.11\.[0-9]+$ ]]; then
  echo 'Supply a Home Assistant 2026.11 patch version, such as 2026.11.3' >&2
  exit 2
fi
: "${BAYIT_QA_MARKETPLACE_TOKEN:?Supply the scoped job or GitHub App token for this fixture}"
log_token="$BAYIT_QA_MARKETPLACE_TOKEN"
command -v docker >/dev/null
command -v node >/dev/null

stage="$(mktemp -d)"
marker="$(node -p "require('node:crypto').randomBytes(16).toString('hex')")"
name="bayit-marketplace-acceptance-${marker:0:12}"
image="ghcr.io/home-assistant/home-assistant:$version"
results="$root/test-results/ha-marketplace-acceptance/$version"
cleanup() {
  status=$?
  trap - EXIT
  if (( status != 0 )); then
    docker logs "$name" > "$stage/marketplace-diagnostic.log" 2>&1 || true
    BAYIT_QA_REDACT="$log_token" node --input-type=module - "$stage/marketplace-diagnostic.log" <<'JS' || true
import { readFileSync } from 'node:fs';
const secret = process.env.BAYIT_QA_REDACT;
if (!secret) process.exit(1);
const logs = readFileSync(process.argv[2], 'utf8').replaceAll(secret, '[redacted]');
for (const line of logs.split('\n').filter(line =>
  /marketplace|bayit_acceptance|setup failed|Traceback|Error:/i.test(line)).slice(-70)) console.error(line);
JS
  fi
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$name" >/dev/null 2>&1 || true
  rm -rf -- "$stage"
  exit "$status"
}
trap cleanup EXIT

receipt="$stage/published-release.json"
node scripts/prepare-ha-marketplace-release.mjs "$repository" "$tag" "$receipt"
mkdir -p -- "$results" "$stage/fixture/custom_components" "$stage/fixture/www"
cp -R -- scripts/fixtures/bayit_acceptance_marketplace "$stage/fixture/custom_components/"
printf '%s\n' "$marker" > "$stage/fixture/www/bayit-acceptance-marker.txt"
cat > "$stage/fixture/configuration.yaml" <<'YAML'
homeassistant:
  name: Bayit 9 Acceptance Fixture
  language: en
  country: US
  latitude: 38.0
  longitude: -97.0
  elevation: 0
  unit_system: metric
  time_zone: Etc/UTC
default_config:
demo:
lovelace:
  resource_mode: storage
bayit_acceptance_marketplace:
YAML

docker volume create "$name" >/dev/null
docker run --rm --network none --volume "$name:/config" --volume "$stage/fixture:/fixture:ro" \
  --entrypoint /bin/sh "$image" -c 'cp -R /fixture/. /config/'
export BAYIT_QA_MARKETPLACE_TOKEN
docker run -d --name "$name" --publish 127.0.0.1::8123 --volume "$name:/config" \
  --env BAYIT_QA_MARKETPLACE_TOKEN --env "BAYIT_QA_MARKER=$marker" "$image" >/dev/null
unset BAYIT_QA_MARKETPLACE_TOKEN
binding="$(docker port "$name" 8123/tcp)"
if [[ ! "$binding" =~ ^127\.0\.0\.1:[0-9]+$ ]]; then
  echo 'Unexpected Home Assistant fixture port' >&2
  exit 2
fi

BAYIT_QA_URL="http://$binding" BAYIT_QA_MARKER="$marker" BAYIT_QA_MARKETPLACE_RECEIPT="$receipt" \
  BAYIT_QA_HA_VERSION="$version" BAYIT_QA_RESULTS="$results" node scripts/ha-acceptance.mjs
