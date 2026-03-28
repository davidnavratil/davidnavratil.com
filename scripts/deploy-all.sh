#!/usr/bin/env bash
set -euo pipefail

# Deploy landing page + all analyses to production
# Usage: bash scripts/deploy-all.sh [--landing] [--hormuz] [--ree] [--uzka-hrdla] [--all]
# Without arguments, deploys everything.

SERVER="77.42.84.152"
SSH_USER="root"
REMOTE_BASE="/var/www/davidnavratil.com"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PARENT_DIR="$(dirname "$PROJECT_DIR")"

export PATH="$HOME/local/node/bin:$PATH"

# Parse arguments
DO_LANDING=false
DO_HORMUZ=false
DO_REE=false
DO_UZKA=false

if [ $# -eq 0 ] || [[ " $* " == *" --all "* ]]; then
  DO_LANDING=true; DO_HORMUZ=true; DO_REE=true; DO_UZKA=true
else
  [[ " $* " == *" --landing "* ]] && DO_LANDING=true
  [[ " $* " == *" --hormuz "* ]] && DO_HORMUZ=true
  [[ " $* " == *" --ree "* ]] && DO_REE=true
  [[ " $* " == *" --uzka-hrdla "* ]] && DO_UZKA=true
fi

# --- Landing page ---
if $DO_LANDING; then
  echo "=== Landing page ==="
  cd "$PROJECT_DIR"
  npm run build
  rsync -avz --delete --exclude='analyses/' dist/ "${SSH_USER}@${SERVER}:${REMOTE_BASE}/"
  echo "✓ Landing page deployed"
fi

# --- Hormuz ---
if $DO_HORMUZ; then
  HORMUZ_DIR="$PARENT_DIR/hormuz"
  if [ -d "$HORMUZ_DIR" ]; then
    echo "=== Hormuz ==="
    ssh "${SSH_USER}@${SERVER}" "mkdir -p ${REMOTE_BASE}/analyses/hormuz"
    rsync -avz --delete \
      --exclude='.git' --exclude='.github' --exclude='scripts/' \
      --exclude='*.md' --exclude='.gitignore' \
      "$HORMUZ_DIR/" "${SSH_USER}@${SERVER}:${REMOTE_BASE}/analyses/hormuz/"
    echo "✓ Hormuz deployed"
  else
    echo "⚠ Hormuz not found at $HORMUZ_DIR — skipping"
  fi
fi

# --- REE Dashboard ---
if $DO_REE; then
  REE_DIR="$PARENT_DIR/ree-dashboard"
  if [ -d "$REE_DIR" ]; then
    echo "=== REE Dashboard ==="
    cd "$REE_DIR"
    npm run build
    ssh "${SSH_USER}@${SERVER}" "mkdir -p ${REMOTE_BASE}/analyses/ree-dashboard"
    rsync -avz --delete out/ "${SSH_USER}@${SERVER}:${REMOTE_BASE}/analyses/ree-dashboard/"
    echo "✓ REE Dashboard deployed"
  else
    echo "⚠ REE Dashboard not found at $REE_DIR — skipping"
  fi
fi

# --- Úzká Hrdla ---
if $DO_UZKA; then
  UZKA_DIR="$PARENT_DIR/uzka-hrdla/uzka-hrdla"
  if [ -d "$UZKA_DIR" ]; then
    echo "=== Úzká Hrdla ==="
    cd "$UZKA_DIR"
    npm run build
    ssh "${SSH_USER}@${SERVER}" "mkdir -p ${REMOTE_BASE}/analyses/uzka-hrdla"
    rsync -avz --delete out/ "${SSH_USER}@${SERVER}:${REMOTE_BASE}/analyses/uzka-hrdla/"
    echo "✓ Úzká Hrdla deployed"
  else
    echo "⚠ Úzká Hrdla not found at $UZKA_DIR — skipping"
  fi
fi

echo ""
echo "Done. https://davidnavratil.com"
