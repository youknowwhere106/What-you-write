from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "whatyouwrite",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    broker_connection_retry_on_startup=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_queue="ai_processing",
    task_routes={
        "app.workers.tasks.process_note_ai": {"queue": "ai_processing"},
    },
    task_annotations={
        "app.workers.tasks.process_note_ai": {"rate_limit": "10/m"},
    },
)

celery_app.autodiscover_tasks(["app.workers"])
