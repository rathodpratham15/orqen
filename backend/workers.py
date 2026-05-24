"""
Celery application configuration.
Workers pick up tasks from Redis; beat scheduler handles cron triggers.
"""
import ssl

from celery import Celery
from celery.schedules import crontab

from config import settings

celery_app = Celery(
    "orqen",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["engine.executor"],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Timezone
    timezone="UTC",
    enable_utc=True,
    # Retry / reliability
    task_acks_late=True,               # ack after completion, not before
    task_reject_on_worker_lost=True,   # requeue if worker dies mid-task
    worker_prefetch_multiplier=1,      # one task at a time per worker slot
    # Results
    result_expires=86400,              # keep results 24h
    # Upstash Redis TLS support (rediss:// URLs require SSL)
    broker_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE} if settings.CELERY_BROKER_URL.startswith("rediss://") else None,
    redis_backend_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE} if settings.CELERY_RESULT_BACKEND.startswith("rediss://") else None,
    # Silence Celery 6.0 deprecation warning
    broker_connection_retry_on_startup=True,
    # Routing
    task_routes={
        "engine.executor.execute_workflow_task": {"queue": "workflows"},
        "engine.executor.resume_workflow_task": {"queue": "workflows"},
    },
    task_default_queue="default",
    # Beat schedule for cron-triggered workflows
    beat_schedule={
        "poll-scheduled-workflows": {
            "task": "engine.executor.poll_scheduled_workflows",
            "schedule": crontab(minute="*"),  # every minute
        },
    },
)
