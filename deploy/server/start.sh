#!/usr/bin/env bash
# Run kakukaku-server under systemd / nohup on production host.
# Assumes the server bundle was unpacked to /opt/kakukaku-server.

set -euo pipefail

cd /opt/kakukaku-server

if [[ ! -f .env ]]; then
  echo "missing /opt/kakukaku-server/.env" >&2
  exit 1
fi

export NODE_ENV=production
export PORT="${PORT:-5001}"

exec /usr/bin/env node ./dist/index.js