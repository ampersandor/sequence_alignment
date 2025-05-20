FROM python:3.13-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*


WORKDIR /app
COPY ./main.py .
# celery-shared는 docker-compose의 볼륨 마운트로 제공됩니다
# COPY ../celery-shared ./celery-shared
# celery-shared는 볼륨으로 마운트되므로 빌드 시 설치하지 않음
RUN pip install celery redis fastapi uvicorn requests

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]