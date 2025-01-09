from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router
from app.db.database import init_db

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router)

# 데이터베이스 초기화
@app.on_event("startup")
async def startup_event():
    init_db()

# 헬스체크 엔드포인트
@app.get("/health")
def health_check():
    return {"status": "healthy"}
