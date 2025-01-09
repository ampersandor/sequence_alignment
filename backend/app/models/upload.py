from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from sqlalchemy.sql import func

class Upload(Base):
    __tablename__ ="uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)  # 원본 파일명
    stored_filename = Column(String)  # 실제 저장된 파일명
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    analyses = relationship("Analysis", back_populates="upload")