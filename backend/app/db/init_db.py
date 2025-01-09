from app.models.analysis import Base
from app.db.database import engine

def init_db():
    Base.metadata.create_all(bind=engine) 