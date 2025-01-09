from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast, String
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database import get_db
from app.models.analysis import Analysis
from app.workers.analysis import align_sequences
from app.schemas import TaskStatus
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str, db: Session = Depends(get_db)):
    try:
        # JSON 필드에서 task_id를 검색하는 방식 수정
        analysis = db.query(Analysis).filter(
            cast(Analysis.extra_data['task_id'], String) == task_id
        ).first()
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Task not found")
            
        task = align_sequences.AsyncResult(task_id)
        
        if task.failed():
            analysis.status = "FAILURE"
            analysis.error = str(task.result)
            db.commit()
            
        return TaskStatus(
            status=task.status,
            result=task.result if task.successful() else None,
            error=str(task.result) if task.failed() else None
        )
        
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 