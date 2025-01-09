from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Upload, Analysis
from app.workers.analysis import align_sequences, calculate_bluebase_task
from app.schemas import AlignmentRequest, TaskStatus
from fastapi.responses import FileResponse
import os
from app.core.config import settings
import logging
from datetime import datetime
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/{method}/{upload_id}")
async def create_analysis(
    method: str,
    upload_id: int,
    db: Session = Depends(get_db)
):
    try:
        # method 유효성 검사
        if method not in ['mafft', 'uclust']:
            raise HTTPException(
                status_code=400, 
                detail="Invalid method. Must be either 'mafft' or 'uclust'"
            )

        # Upload 존재 여부 확인
        upload = db.query(Upload).filter(Upload.id == upload_id).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")

        # 분석 레코드 생성
        analysis = Analysis(
            upload_id=upload_id,
            method=method,
            status="PENDING"
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        # Celery 태스크 시작
        task = align_sequences.delay(upload_id, method)

        # task_id를 extra_data에 저장
        analysis.extra_data = {"task_id": task.id}
        db.commit()

        return {
            "task_id": task.id,
            "analysis_id": analysis.id
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/results/{file_name}", response_class=FileResponse)
async def get_result_file(file_name: str):
    """
    분석 결과 파일 다운로드
    """
    file_path = os.path.join(settings.RESULT_DIR, file_name)
    logger.info(f"Attempting to download file: {file_path}")
    
    # 디렉토리 내용 확인
    try:
        files = os.listdir(settings.RESULT_DIR)
        logger.info(f"Files in result directory: {files}")
    except Exception as e:
        logger.error(f"Error listing directory: {e}")
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        raise HTTPException(
            status_code=404,
            detail=f"Result file not found: {file_name}"
        )
    
    logger.info(f"File found, returning: {file_path}")
    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=file_name
    ) 

@router.post("/bluebase/{input_file}")
async def calculate_bluebase(
    input_file: str,
    db: Session = Depends(get_db)
):
    """
    Bluebase 계산 수행
    """
    try:
        # 입력 파일 경로 구성
        input_path = os.path.join(settings.RESULT_DIR, input_file)
        if not os.path.exists(input_path):
            raise HTTPException(
                status_code=404,
                detail=f"Input file not found: {input_file}"
            )

        # 결과 파일명 생성
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        output_file = f"{os.path.splitext(input_file)[0]}_bluebase_{timestamp}_{unique_id}.txt"
        output_path = os.path.join(settings.RESULT_DIR, output_file)

        # Bluebase 계산 작업 시작
        task = calculate_bluebase_task.delay(input_path, output_path)

        return {
            "task_id": task.id,
            "output_file": output_file
        }

    except Exception as e:
        logger.error(f"Error in bluebase calculation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 