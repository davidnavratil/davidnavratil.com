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

# Dynamically exclude all existing analysis subdirectories on the server
# so that rsync --delete doesn't wipe independently-deployed analyses.
EXCLUDES=""
while IFS= read -r dir; do
  [ -n "$dir" ] && EXCLUDES="$EXCLUDES --exclude=analyses/${dir}/"
done < <(ssh "${SSH_USER}@${SERVER}" "ls -1 ${REMOTE_DIR}/analyses/ 2>/dev/null || true")

echo "Deploying to $SERVER..."
echo "  Auto-excluded analysis dirs: $EXCLUDES"
eval rsync -avz --delete $EXCLUDES dist/ "${SSH_USER}@${SERVER}:${REMOTE_DIR}/"

echo "Done. https://davidnavratil.com"
