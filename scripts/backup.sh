#!/bin/bash
set -euo pipefail

BACKUP_DIR="${HOME}/backups/interview-bot"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# PostgreSQL backup (container: interview-bot-db, user: interview, db: interview_bot)
docker exec interview-bot-db pg_dump -U interview interview_bot | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

SIZE=$(du -h "$BACKUP_DIR/db_${DATE}.sql.gz" | cut -f1)
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -print -delete | wc -l | tr -d ' ')

echo "[${DATE}] Backup: db_${DATE}.sql.gz (${SIZE}), Deleted old: ${DELETED}"
