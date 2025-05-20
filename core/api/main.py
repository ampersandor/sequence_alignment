from fastapi import FastAPI, Request
from pydantic import BaseModel
from tasks.core import run_tool


app = FastAPI()

class RunRequest(BaseModel):
    tool: str
    path: str
    session_id: str

@app.post("/run")
async def trigger_run(request: RunRequest):
    task = run_tool.delay(tool=request.tool, input_path=request.path, session_id=request.session_id)
    return {"status": "queued", "task_id": task.id, "session_id": request.session_id}


@app.post("/webhook/status")
async def webhook_status(req: Request):
    payload = await req.json()
    print(f"[Webhook] Received: {payload}")

    return {"received": True}