#!/bin/sh
set -e

MAX_RETRIES=30
RETRIES=0

echo "==> Waiting for database..."
until node_modules/.bin/prisma migrate deploy 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Database not ready after $MAX_RETRIES attempts, giving up."
    exit 1
  fi
  echo "Database not ready, retrying in 2s... (attempt $RETRIES/$MAX_RETRIES)"
  sleep 2
done

echo "==> Seeding database (if needed)..."
node_modules/.bin/prisma db seed || echo "Seed already applied or not configured"

mkdir -p /app/public/uploads/photos 2>/dev/null || true

echo "==> Starting application..."
exec node server.js
