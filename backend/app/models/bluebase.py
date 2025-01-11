from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class BluebaseResult(Base):
    __tablename__ = "bluebase_results"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"))
    alignment_stats_file = Column(String)
    gap_stats_file = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    analysis = relationship("Analysis", back_populates="bluebase_result") 