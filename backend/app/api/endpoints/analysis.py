from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Upload, Analysis
from app.workers.analysis import align_sequences, calculate_bluebase_task
from app.schemas import AlignmentRequest, TaskStatus
from fastapi.responses import FileResponse
import os
from app.core.config import settings
import logging
from celery import chain
import zipfile
from tempfile import NamedTemporaryFile
from typing import List
import json


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

        # 분석 레코드 생성 (extra_data는 비워둠)
        analysis = Analysis(
            upload_id=upload_id,
            method=method,
            status="STARTED"
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        # Celery 태스크 시작 - analysis_id 전달
        # align_sequences 태스크가 완료되면 자동으로 bluebase 계산을 시작하도록 chain 사용
        task_chain = chain(
            align_sequences.s(analysis.id),
            calculate_bluebase_task.s(analysis.id)
        )
        result = task_chain.apply_async()

        return {
            "task_id": result.id,  # chain의 첫 번째 태스크 ID
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

@router.get("/download/{upload_id}")
async def download_all_results(upload_id: int, db: Session = Depends(get_db)):
    try:
        upload = db.query(Upload).filter(Upload.id == upload_id).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")

        # 결과 파일들의 경로 수집
        files_to_zip: List[dict] = []
        for analysis in upload.analyses:
            if analysis.status == "SUCCESS":
                # Alignment 결과 파일 추가
                if analysis.result_file:
                    files_to_zip.append({
                        'path': os.path.join('data/results', analysis.result_file),
                        'name': f'{analysis.method}_alignment_{os.path.basename(analysis.result_file)}'
                    })
                
                # Bluebase 결과 파일들 추가
                if hasattr(analysis, 'bluebase_result') and analysis.bluebase_result:
                    # Alignment stats 파일
                    if analysis.bluebase_result.alignment_stats_file:
                        files_to_zip.append({
                            'path': os.path.join('data/results', analysis.bluebase_result.alignment_stats_file),
                            'name': f'{analysis.method}_bluebase_alignment_stats.txt'
                        })
                    # Gap stats 파일
                    if analysis.bluebase_result.gap_stats_file:
                        files_to_zip.append({
                            'path': os.path.join('data/results', analysis.bluebase_result.gap_stats_file),
                            'name': f'{analysis.method}_bluebase_gap_stats.txt'
                        })
        
        if not files_to_zip:
            raise HTTPException(status_code=404, detail="No results available")

        # 임시 ZIP 파일 생성
        with NamedTemporaryFile(delete=False, suffix='.zip') as tmp_zip:
            with zipfile.ZipFile(tmp_zip.name, 'w') as zip_file:
                # 결과 파일들을 ZIP에 추가
                for file_info in files_to_zip:
                    if os.path.exists(file_info['path']):
                        zip_file.write(
                            file_info['path'], 
                            file_info['name']
                        )

            return FileResponse(
                tmp_zip.name,
                media_type='application/zip',
                filename=f'results_{upload_id}.zip'
            )

    except Exception as e:
        logger.error(f"Error creating ZIP file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 