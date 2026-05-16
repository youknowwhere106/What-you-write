#!/bin/sh
# Start minimal HTTP health server in background, then run Celery as main process.
python /app/health_server.py &
exec celery -A app.workers.celery_app worker --loglevel=info -Q ai_processing --concurrency=2
