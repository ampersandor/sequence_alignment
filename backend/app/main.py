import sys
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from celery_worker import align_sequences
from schemas import AlignmentResponse, TaskStatus
import shutil
from fastapi.responses import FileResponse
import subprocess
from pydantic import BaseModel
import logging
from sqlalchemy.orm import Session
import models
from database import engine, get_db
import asyncio
import aiofiles
import time

logger = logging.getLogger(__name__)
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# 타임아웃 미들웨어 추가
@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    try:
        return await asyncio.wait_for(call_next(request), timeout=60.0)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Request timeout")

# Bluebase 요청 모델 추가
class BluebaseRequest(BaseModel):
    filename: str
    method: str


# 데이터베이스 테이블 생성
models.Base.metadata.create_all(bind=engine)


@app.post("/alignment", response_model=AlignmentResponse)
async def create_alignment(
    file: UploadFile = File(...), 
    method: str = Form(...),
    db: Session = Depends(get_db)
):
    if method not in ["mafft", "uclust"]:
        raise HTTPException(status_code=400, detail="Invalid method specified")

    try:
        # 파일 이름에 타임스탬프 추가
        timestamp = int(time.time())
        original_filename = file.filename
        base_name = original_filename.rsplit('.', 1)[0]
        extension = original_filename.rsplit('.', 1)[1] if '.' in original_filename else ''
        unique_filename = f"{base_name}_{timestamp}.{extension}"

        # 파일 크기 체크
        file_size = 0
        chunk_size = 8192
        
        while chunk := await file.read(chunk_size):
            file_size += len(chunk)
            if file_size > 10 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="File too large")
        
        await file.seek(0)
        
        # 파일 저장
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        async with aiofiles.open(file_path, 'wb') as buffer:
            while chunk := await file.read(chunk_size):
                await buffer.write(chunk)

        # 분석 기록 생성
        analysis = models.Analysis(
            input_file=original_filename,
            method=method,
            status="PENDING",
            extra_data={
                "unique_filename": unique_filename,
                "timestamp": timestamp
            }
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        # task 실행
        task = align_sequences.apply_async(
            args=[file_path, method], 
            task_id=str(analysis.id)
        )

        return AlignmentResponse(task_id=str(task.id))
        
    except Exception as e:
        logger.error(f"Error in create_alignment: {str(e)}")
        if 'analysis' in locals():
            analysis.status = "FAILED"
            analysis.error = str(e)
            db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str, db: Session = Depends(get_db)):
    try:
        task = align_sequences.AsyncResult(task_id)
        
        # 데이터베이스 업데이트
        analysis = db.query(models.Analysis).filter(models.Analysis.id == int(task_id)).first()
        if analysis:
            analysis.status = task.status
            if task.successful():
                analysis.result_file = task.result.get('result_file')
            elif task.failed():
                analysis.error = str(task.result)
            db.commit()

        return TaskStatus(
            status=task.status,
            result=task.result if task.successful() else None,
            error=str(task.result) if task.failed() else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/results/{filename}")
async def get_result(filename: str):
    file_path = os.path.join(RESULTS_DIR, filename)
    logger.info(f"Looking for file at: {file_path}")
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="Result file not found")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    )


@app.post("/bluebase")
async def run_bluebase(request: BluebaseRequest):
    try:
        # 파일 경로 설정
        input_file = os.path.join(UPLOAD_DIR, f"{request.filename}.fasta")
        result_file = os.path.join(RESULTS_DIR, f"{request.filename}_{request.method}_result.fasta")
        
        # bluebase.py 실행
        bluebase_path = os.path.join(os.path.dirname(__file__), "bluebase.py")
        subprocess.run([
            "python",
            bluebase_path,
            "-i", input_file,
            f"--{request.method}-output", result_file,
            "-v"
        ], check=True)
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 분석 기록 조회 API 추가
@app.get("/analyses")
async def get_analyses(db: Session = Depends(get_db)):
    analyses = db.query(models.Analysis).order_by(models.Analysis.created_at.desc()).all()
    return analyses
