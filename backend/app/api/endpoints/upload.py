from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Upload, Analysis
import os
from app.core.config import settings
import uuid
from datetime import datetime
from sqlalchemy.orm import joinedload
from app.schemas.analysis import UploadWithAnalyses, AnalysisBase, BluebaseResultBase
from typing import List

router = APIRouter()

def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename by adding timestamp and UUID"""
    name, ext = os.path.splitext(original_filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    return f"{name}_{timestamp}_{unique_id}{ext}"

@router.post("")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        unique_filename = generate_unique_filename(file.filename)
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        upload = Upload(
            filename=file.filename,  # 원본 파일명 저장
            stored_filename=unique_filename  # 실제 저장된 파일명
        )
        db.add(upload)
        db.commit()
        db.refresh(upload)

        return {"id": upload.id, "filename": file.filename}
    except Exception as e:
        db.rollback()
        raise e

@router.get("", response_model=List[UploadWithAnalyses])
def get_uploads(db: Session = Depends(get_db)):
    uploads = db.query(Upload).options(
        joinedload(Upload.analyses).joinedload(Analysis.bluebase_result)
    ).all()
    
    # SQLAlchemy 모델을 Pydantic 모델로 명시적 변환
    return [
        UploadWithAnalyses(
            id=upload.id,
            filename=upload.filename,
            stored_filename=upload.stored_filename,
            created_at=upload.created_at,
            analyses=[
                AnalysisBase(
                    id=analysis.id,
                    method=analysis.method,
                    status=analysis.status,
                    result_file=analysis.result_file,
                    error=analysis.error,
                    created_at=analysis.created_at,
                    extra_data=analysis.extra_data,
                    bluebase_result=(
                        BluebaseResultBase(
                            alignment_stats_file=analysis.bluebase_result.alignment_stats_file,
                            gap_stats_file=analysis.bluebase_result.gap_stats_file,
                            created_at=analysis.bluebase_result.created_at
                        ) if analysis.bluebase_result else None
                    )
                ) for analysis in upload.analyses
            ]
        ) for upload in uploads
    ] 