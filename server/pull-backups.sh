#!/bin/bash
# Pull server backups to local machine (off-site backup)
# Run manually or via cron: 0 9 * * * /path/to/pull-backups.sh
set -euo pipefail

SERVER="root@77.42.84.152"
REMOTE_DIR="/root/backups"
LOCAL_DIR="$HOME/backups/mozek"

mkdir -p "$LOCAL_DIR"

echo "Pulling backups from Mozek..."
rsync -avz --progress "$SERVER:$REMOTE_DIR/" "$LOCAL_DIR/"

# Keep last 30 days locally (more generous than server's 7 days)
find "$LOCAL_DIR" -name '*.tar.gz' -mtime +30 -delete 2>/dev/null
find "$LOCAL_DIR" -name '*.sql.gz' -mtime +30 -delete 2>/dev/null

echo "Done. Local backups: $(du -sh "$LOCAL_DIR" | cut -f1)"
ls -lh "$LOCAL_DIR/"
