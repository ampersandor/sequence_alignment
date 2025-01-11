from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base
from sqlalchemy.dialects.postgresql import JSONB

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"))
    method = Column(String)  # 'mafft' or 'uclust'
    status = Column(String, default="PENDING")
    result_file = Column(String, nullable=True)
    error = Column(String, nullable=True)
    extra_data = Column(JSONB, nullable=True)  # {
                                              #   task_id: string,
                                              #   execution_time: number,  # 실행 시간(초)
                                              #   start_time: string,     # 시작 시간
                                              #   end_time: string        # 종료 시간
                                              # }
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    upload = relationship("Upload", back_populates="analyses")
    bluebase_result = relationship("BluebaseResult", back_populates="analysis", uselist=False) 