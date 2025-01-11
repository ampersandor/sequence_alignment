from pydantic import BaseModel
from typing import Optional, Dict, Any, Union, List
from datetime import datetime

class BluebaseResultBase(BaseModel):
    alignment_stats_file: str
    gap_stats_file: str
    created_at: datetime
    
    class Config:
        from_attributes = True
        populate_by_name = True 

        
# Analysis 관련 스키마
class AnalysisBase(BaseModel):
    id: int
    method: str
    status: str
    result_file: Optional[str]
    error: Optional[str]
    created_at: datetime
    extra_data: Optional[Dict[str, Any]] = None
    bluebase_result: Optional[BluebaseResultBase] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True

# Upload 관련 스키마
class UploadBase(BaseModel):
    id: int
    filename: str
    stored_filename: str
    created_at: datetime
    
    class Config:
        from_attributes = True
        populate_by_name = True

class UploadWithAnalyses(UploadBase):
    analyses: List[AnalysisBase] = []
    
    class Config:
        from_attributes = True
        populate_by_name = True

# API 요청/응답 스키마
class AlignmentRequest(BaseModel):
    method: str
    
    class Config:
        from_attributes = True

class AlignmentResponse(BaseModel):
    task_id: str
    analysis_id: int
    
    class Config:
        from_attributes = True

class TaskResult(BaseModel):
    status: str
    result_file: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: Optional[float] = None

class TaskStatus(BaseModel):
    status: str
    result: Optional[Union[TaskResult, Dict[str, Any]]] = None
    error: Optional[str] = None
    
    class Config:
        from_attributes = True 

