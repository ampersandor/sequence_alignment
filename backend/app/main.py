import sys
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from celery_worker import align_sequences
from schemas import AlignmentResponse, TaskStatus
import shutil
from fastapi.responses import FileResponse
import subprocess
from pydantic import BaseModel

# 디렉토리 경로 수정 (app 디렉토리 내부에 위치)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

# 디렉토리 생성
for dir_path in [UPLOAD_DIR, RESULTS_DIR]:
    os.makedirs(dir_path, exist_ok=True)

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bluebase 요청 모델 추가
class BluebaseRequest(BaseModel):
    filename: str

@app.post("/alignment", response_model=AlignmentResponse)
async def create_alignment(
    file: UploadFile = File(...),
    method: str = Form(...)
):
    if method not in ["mafft", "uclust"]:
        raise HTTPException(status_code=400, detail="Invalid method specified")
    
    try:
        # 파일 저장
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # task 이름을 수정하여 호출
        task = align_sequences.apply_async(args=[file_path, method], task_id=None)
        
        return AlignmentResponse(task_id=str(task.id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    try:
        task = align_sequences.AsyncResult(task_id)
        return TaskStatus(
            status=task.status,
            result=task.result if task.successful() else None,
            error=str(task.result) if task.failed() else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/results/{filename}")
async def get_result(filename: str):
    file_path = os.path.join(RESULTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Result file not found")
    return FileResponse(file_path, filename=filename)

@app.post("/bluebase")
async def run_bluebase(request: BluebaseRequest):
    try:
        # 파일 경로 설정
        input_file = os.path.join(UPLOAD_DIR, f"{request.filename}.fasta")
        mafft_file = os.path.join(RESULTS_DIR, f"{request.filename}_mafft_result.fasta")
        uclust_file = os.path.join(RESULTS_DIR, f"{request.filename}_uclust_result.fasta")
        
        # bluebase.py 실행
        bluebase_path = os.path.join(os.path.dirname(__file__), 'bluebase.py')
        subprocess.run([
            'python', 
            bluebase_path, 
            '-i', input_file,
            '--uclust-output', uclust_file,
            '--mafft-output', mafft_file,
            '-v'
        ], check=True)
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 