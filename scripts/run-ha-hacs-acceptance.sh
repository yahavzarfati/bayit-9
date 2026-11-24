#!/usr/bin/env bash
set +x
set -Eeuo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$root"
repository="${1:?Supply the public owner/bayit-9 repository}"
tag="${2:?Supply an already published release tag}"
version="${3:-2026.10.4}"
if [[ ! "$version" =~ ^20[0-9]{2}\.[0-9]{1,2}\.[0-9]+$ ]]; then
  echo 'Supply a numbered Home Assistant Core version, such as 2026.10.4' >&2
  exit 2
fi
: "${BAYIT_QA_HACS_TOKEN:?Supply a token for this disposable fixture}"
log_token="$BAYIT_QA_HACS_TOKEN"
for program in curl docker node sha256sum unzip; do
  command -v "$program" >/dev/null
done

stage="$(mktemp -d)"
marker="$(node -p "require('node:crypto').randomBytes(16).toString('hex')")"
name="bayit-hacs-acceptance-${marker:0:12}"
image="ghcr.io/home-assistant/home-assistant:$version"
results="$root/test-results/ha-hacs-acceptance/$version"
cleanup() {
  status=$?
  trap - EXIT
  if (( status != 0 )); then
    docker logs "$name" > "$stage/hacs-diagnostic.log" 2>&1 || true
    BAYIT_QA_REDACT="$log_token" node --input-type=module - "$stage/hacs-diagnostic.log" <<'JS' || true
import { readFileSync } from 'node:fs';
const secret = process.env.BAYIT_QA_REDACT;
const logs = readFileSync(process.argv[2], 'utf8').replaceAll(secret, '[redacted]');
for (const line of logs.split('\n').filter(line =>
  /hacs|bayit_acceptance|setup failed|Traceback|Error:/i.test(line)).slice(-70)) console.error(line);
JS
  fi
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$name" >/dev/null 2>&1 || true
  rm -rf -- "$stage"
  exit "$status"
}
trap cleanup EXIT

receipt="$stage/published-release.json"
node scripts/prepare-ha-hacs-release.mjs "$repository" "$tag" "$receipt"
hacs_zip="$stage/hacs.zip"
curl -q --proto '=https' --proto-redir '=https' --fail --silent --show-error --location --max-time 120 \
  'https://github.com/hacs/integration/releases/download/2.0.5/hacs.zip' --output "$hacs_zip"
printf '%s  %s\n' '97be6b824a4f38e683728cc6dd72367f6b8bad0a43428b1b3b987a3087adf413' "$hacs_zip" | sha256sum --check --status || {
  echo 'The pinned HACS archive failed SHA-256 verification' >&2
  exit 2
}
mkdir -p -- "$results" "$stage/fixture/custom_components/hacs" "$stage/fixture/www"
unzip -q "$hacs_zip" -d "$stage/fixture/custom_components/hacs"
cp -R -- scripts/fixtures/bayit_acceptance_hacs "$stage/fixture/custom_components/"
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
bayit_acceptance_hacs:
YAML

docker volume create "$name" >/dev/null
docker run --rm --network none --volume "$name:/config" --volume "$stage/fixture:/fixture:ro" \
  --entrypoint /bin/sh "$image" -c 'cp -R /fixture/. /config/'
export BAYIT_QA_HACS_TOKEN
docker run -d --name "$name" --publish 127.0.0.1::8123 --volume "$name:/config" \
  --env BAYIT_QA_HACS_TOKEN --env "BAYIT_QA_MARKER=$marker" "$image" >/dev/null
unset BAYIT_QA_HACS_TOKEN
binding="$(docker port "$name" 8123/tcp)"
if [[ ! "$binding" =~ ^127\.0\.0\.1:[0-9]+$ ]]; then
  echo 'Unexpected Home Assistant fixture port' >&2
  exit 2
fi

BAYIT_QA_URL="http://$binding" BAYIT_QA_MARKER="$marker" BAYIT_QA_HACS_RECEIPT="$receipt" \
  BAYIT_QA_HA_VERSION="$version" BAYIT_QA_RESULTS="$results" node scripts/ha-acceptance.mjs
