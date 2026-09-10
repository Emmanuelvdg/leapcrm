#!/usr/bin/env bash
# Manual production deploy for the Hostinger VPS. Run this over SSH after
# `main` has been merged into `production` and pushed. There is no CI/CD
# automation for this repo by design — this script is the entire deploy
# process, triggered by hand.
set -euo pipefail

cd "$(dirname "$0")/../.."

COMPOSE_FILES=(-f packages/twenty-docker/docker-compose.yml -f packages/twenty-docker/docker-compose.prod.yml)

git fetch origin
git checkout production
git pull origin production

docker compose "${COMPOSE_FILES[@]}" build
docker compose "${COMPOSE_FILES[@]}" up -d --remove-orphans
docker compose "${COMPOSE_FILES[@]}" logs --tail=100 server
