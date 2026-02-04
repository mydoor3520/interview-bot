#!/bin/sh
set -e

echo "==> Waiting for database..."
until node_modules/.bin/prisma migrate deploy 2>/dev/null; do
  echo "Database not ready, retrying in 2s..."
  sleep 2
done

echo "==> Seeding database (if needed)..."
node_modules/.bin/prisma db seed || echo "Seed already applied or not configured"

echo "==> Starting application..."
exec node server.js
