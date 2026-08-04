#!/bin/sh
set -e

# ───────────────────────────────────────────────
# Railway Volume Persistence
# ───────────────────────────────────────────────
# Runs as root so it can chown the mounted volume,
# then drops to nextjs user before starting the server.
# ───────────────────────────────────────────────

VOLUME_PATH="${RAILWAY_VOLUME_MOUNT_PATH:-/app/persistent}"

if [ -d "$VOLUME_PATH" ]; then
  echo "✓ Persistent volume detected at $VOLUME_PATH"

  # ── Create dirs and fix ownership (needs root) ──
  mkdir -p "$VOLUME_PATH/data" "$VOLUME_PATH/uploads"
  chown -R nextjs:nodejs "$VOLUME_PATH"

  # ── Seed data directory if empty ──
  if [ -z "$(ls -A "$VOLUME_PATH/data" 2>/dev/null)" ]; then
    echo "  → Seeding data/ from defaults..."
    cp -r /app/data.defaults/* "$VOLUME_PATH/data/" 2>/dev/null || true
    chown -R nextjs:nodejs "$VOLUME_PATH/data"
  fi

  # ── Replace directories with symlinks ──
  rm -rf /app/data
  ln -sf "$VOLUME_PATH/data" /app/data

  rm -rf /app/public/uploads
  ln -sf "$VOLUME_PATH/uploads" /app/public/uploads

  echo "✓ Symlinks created: data -> volume, uploads -> volume"
else
  echo "⚠ No persistent volume found — using ephemeral filesystem"
  echo "  Data will be lost on redeploy!"

  if [ -z "$(ls -A /app/data 2>/dev/null)" ]; then
    cp -r /app/data.defaults/* /app/data/ 2>/dev/null || true
  fi
fi

echo "Starting Next.js server..."
# Drop from root to nextjs user for the actual server process
exec su-exec nextjs "$@"