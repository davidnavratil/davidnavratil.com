#!/usr/bin/env bash
set -euo pipefail

SERVER="77.42.84.152"
REMOTE_DIR="/var/www/davidnavratil.com"
SSH_USER="root"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

export PATH="$HOME/local/node/bin:$PATH"

echo "Building..."
npm run build

echo "Deploying to $SERVER..."
rsync -avz --delete dist/ "${SSH_USER}@${SERVER}:${REMOTE_DIR}/"

echo "Done. https://davidnavratil.com"
