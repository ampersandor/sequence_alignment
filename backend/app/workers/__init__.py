from celery import Celery
from app.core.config import settings

celery = Celery(
    'app',
    broker=f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0',
    backend=f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0'
)

# 태스크 모듈 등록
celery.conf.imports = [
    'app.workers.analysis',
    'app.workers.file_processing'
]

# Celery 설정
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
) 