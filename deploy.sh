#!/usr/bin/env bash
# Manual production deploy. Run this over SSH after `main` has been merged
# into `production` and pushed. There is no CI/CD automation for this repo
# by design — this script is the entire deploy process, triggered by hand.
set -euo pipefail

cd "$(dirname "$0")"

git fetch origin
git checkout production
git pull origin production

docker compose build
docker compose up -d --remove-orphans
docker compose logs --tail=100 server
