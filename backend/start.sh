#!/bin/bash
# Combined start: Celery worker + uvicorn in one Railway container.
# Celery runs in background; if it dies within 5s the container exits
# so Railway surfaces the error in deployment logs.

set -e

echo "[start.sh] Starting Celery worker (queues: workflows,default)..."
celery -A workers worker \
  --loglevel=info \
  --concurrency=1 \
  -Q workflows,default 2>&1 &

CELERY_PID=$!
echo "[start.sh] Celery PID: $CELERY_PID"

# Give Celery 5 seconds to connect to Redis and start up
sleep 5

if ! kill -0 "$CELERY_PID" 2>/dev/null; then
  echo "[start.sh] ERROR: Celery worker exited immediately — check broker URL / Redis connectivity"
  exit 1
fi

echo "[start.sh] Celery is running. Starting uvicorn on port $PORT..."
uvicorn main:app --host 0.0.0.0 --port "$PORT" --workers 1

# Uvicorn exited — bring down Celery too
echo "[start.sh] uvicorn exited — stopping Celery (PID $CELERY_PID)..."
kill "$CELERY_PID" 2>/dev/null || true
