import os
import subprocess

import redis
import requests
from celery import Celery, signals

broker_url = os.getenv("BROKER_URL", "pyamqp://guest@localhost//")
redis_host = os.getenv("REDIS_HOST", "localhost")
webhook_url = os.getenv("WEBHOOK_URL")

app = Celery("tasks", broker=broker_url)

r = redis.Redis(host=redis_host, port=6379)

@app.task(bind=True)
def run_tool(self, tool, input_path, session_id):
    """Run mafft or vsearch, stream logs via Redis Pub/Sub"""
    proc = subprocess.Popen(
        [tool, input_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    for line in proc.stdout:
        decoded = line.decode("utf-8")
        r.publish(f"log:{session_id}", decoded)
    proc.wait()
    r.publish(f"log:{session_id}", f"[DONE] Exit {proc.returncode}")


@signals.task_success.connect
def on_success(sender=None, result=None, **kwargs):
    task_id = sender.request.id
    session_id = sender.request.kwargs.get("session_id", "")
    if webhook_url:
        try:
            requests.post(webhook_url, json={
                "task_id": task_id,
                "session_id": session_id,
                "status": "SUCCESS",
            })
        except Exception as e:
            print(f"[Webhook error] {e}")

@signals.task_failure.connect
def on_failure(sender=None, exception=None, **kwargs):
    task_id = sender.request.id
    session_id = sender.request.kwargs.get("session_id", "")
    if webhook_url:
        try:
            requests.post(webhook_url, json={
                "task_id": task_id,
                "session_id": session_id,
                "status": "FAILURE",
                "error": str(exception),
            })
        except Exception as e:
            print(f"[Webhook error] {e}")