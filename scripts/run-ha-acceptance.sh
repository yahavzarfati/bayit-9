#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$root"
version="${1:-2026.11.2}"
if [[ ! "$version" =~ ^20[0-9]{2}\.[0-9]{1,2}\.[0-9]+$ ]]; then
  echo 'Supply a numbered Home Assistant Core version, such as 2026.11.2' >&2
  exit 2
fi
command -v docker >/dev/null
command -v node >/dev/null

mkdir -p dist
npm run build
stage="$(mktemp -d)"
marker="$(node -p "require('node:crypto').randomBytes(16).toString('hex')")"
name="bayit-acceptance-${marker:0:12}"
image="ghcr.io/home-assistant/home-assistant:$version"
results="$root/test-results/ha-acceptance/$version"
mkdir -p -- "$results" "$stage/www"
cleanup() {
  status=$?
  trap - EXIT
  if (( status != 0 )); then
    docker logs "$name" > "$results/home-assistant.log" 2>&1 || true
    tail -n 70 "$results/home-assistant.log" >&2 || true
  fi
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$name" >/dev/null 2>&1 || true
  rm -rf -- "$stage"
  exit "$status"
}
trap cleanup EXIT

cp -- dist/bayit-9.js "$stage/www/bayit-9.js"
for asset in dist/bayit-wallpaper-*.webp; do
  [[ -f "$asset" ]] || continue
  cp -- "$asset" "$stage/www/"
done
printf '%s\n' "$marker" > "$stage/www/bayit-acceptance-marker.txt"
cat > "$stage/configuration.yaml" <<'YAML'
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
YAML

docker volume create "$name" >/dev/null
docker run --rm --network none --volume "$name:/config" --volume "$stage:/fixture:ro" \
  --entrypoint /bin/sh "$image" -c 'cp -R /fixture/. /config/'
docker run -d --name "$name" --publish 127.0.0.1::8123 --volume "$name:/config" "$image" >/dev/null
binding="$(docker port "$name" 8123/tcp)"
if [[ ! "$binding" =~ ^127\.0\.0\.1:[0-9]+$ ]]; then
  echo "Unexpected Home Assistant fixture port: $binding" >&2
  exit 2
fi

BAYIT_QA_URL="http://$binding" BAYIT_QA_MARKER="$marker" \
  BAYIT_QA_HA_VERSION="$version" BAYIT_QA_RESULTS="$results" node scripts/ha-acceptance.mjs
