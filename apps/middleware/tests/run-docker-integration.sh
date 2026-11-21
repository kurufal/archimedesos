#!/usr/bin/env sh
set -eu

socket_dir=$(mktemp -d)
name="archimedes-dind-$$"
cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  rm -rf "$socket_dir"
}
trap cleanup EXIT INT TERM

docker run --detach --privileged --name "$name" \
  --mount "type=bind,source=$socket_dir,target=/run" \
  docker:28-dind \
  dockerd --host=unix:///run/docker.sock --tls=false >/dev/null

attempt=0
until docker exec "$name" docker info >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "Disposable Docker daemon did not become ready" >&2
    exit 1
  fi
  sleep 1
done

ARCHIMEDES_DOCKER_TEST_SOCKET="$socket_dir/docker.sock" bun test tests/docker.integration.test.ts
