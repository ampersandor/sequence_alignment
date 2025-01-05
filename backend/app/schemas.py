from pydantic import BaseModel
from typing import Optional, Dict, Any

class AlignmentRequest(BaseModel):
    method: str
    
    class Config:
        from_attributes = True

class AlignmentResponse(BaseModel):
    task_id: str
    
    class Config:
        from_attributes = True

class TaskStatus(BaseModel):
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    class Config:
        from_attributes = True 