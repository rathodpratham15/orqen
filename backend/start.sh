#!/bin/bash
# Starts both the FastAPI web server and Celery worker in the same container.
# Suitable for Railway hobby/free tier where running two services is wasteful.
#
# uvicorn runs in the foreground (handles the Railway healthcheck on $PORT).
# celery runs in the background; if uvicorn exits the whole container exits.

set -e

echo "[start.sh] Starting Celery worker..."
celery -A workers worker \
  --loglevel=info \
  --concurrency=1 \
  -Q workflows,default &

CELERY_PID=$!
echo "[start.sh] Celery PID: $CELERY_PID"

echo "[start.sh] Starting uvicorn on port $PORT..."
uvicorn main:app --host 0.0.0.0 --port "$PORT" --workers 1

# If uvicorn exits (crash or SIGTERM), bring down celery too
echo "[start.sh] uvicorn exited — stopping Celery (PID $CELERY_PID)..."
kill "$CELERY_PID" 2>/dev/null || true
