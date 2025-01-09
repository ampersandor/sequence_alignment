from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 데이터베이스 엔진 생성
engine = create_engine(settings.DATABASE_URL)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모델의 기본 클래스
Base = declarative_base()

def get_db():
    """
    데이터베이스 세션을 생성하고 관리하는 의존성 함수
    FastAPI의 Depends에서 사용됨
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    데이터베이스 테이블 초기화
    """
    Base.metadata.create_all(bind=engine) 