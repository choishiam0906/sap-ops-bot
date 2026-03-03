"""FastAPI 앱 엔트리포인트 — SAP 운영 자동화 AI 봇."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, copilot, knowledge
from app.config import settings
from app.core.knowledge_base import load_seed_data
from app.core.rag_engine import initialize_vector_store
from app.models.database import async_session, init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 라이프사이클 핸들러."""
    # 시작: DB 초기화 + 시드 데이터 로드
    logger.info("DB 테이블 초기화 중...")
    await init_db()

    async with async_session() as db:
        loaded = await load_seed_data(db)
        if loaded > 0:
            logger.info(f"시드 데이터 {loaded}건 로드 완료")

    # 벡터 스토어 초기화 (Azure OpenAI 연결 시)
    if settings.azure_openai_api_key:
        try:
            indexed = await initialize_vector_store()
            if indexed > 0:
                logger.info(f"벡터 스토어에 {indexed}건 인덱싱 완료")
        except Exception as e:
            logger.warning(f"벡터 스토어 초기화 실패 (API 키 확인 필요): {e}")

    yield

    # 종료: 리소스 정리
    logger.info("앱 종료")


app = FastAPI(
    title="SAP Ops Bot API",
    description="SAP 운영 자동화 AI 봇 — RAG 기반 SAP 운영 지식 Q&A 시스템",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(chat.router, prefix=settings.api_v1_prefix)
app.include_router(copilot.router, prefix=settings.api_v1_prefix)
app.include_router(knowledge.router, prefix=settings.api_v1_prefix)


@app.get(f"{settings.api_v1_prefix}/health")
async def health_check() -> dict:
    """헬스체크 엔드포인트."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "services": {
            "api": "ok",
            "database": "ok",
            "vector_store": "ok" if settings.azure_openai_api_key else "not_configured",
        },
    }


@app.get(f"{settings.api_v1_prefix}/stats")
async def get_stats() -> dict:
    """사용 통계 엔드포인트."""
    from sqlalchemy import func, select

    from app.models.database import ChatMessage, KnowledgeItem

    async with async_session() as db:
        # 총 질의 수
        query_count = await db.execute(
            select(func.count()).select_from(ChatMessage).where(ChatMessage.role == "user")
        )
        total_queries = query_count.scalar() or 0

        # 총 지식 항목 수
        knowledge_count = await db.execute(
            select(func.count()).select_from(KnowledgeItem)
        )
        total_knowledge = knowledge_count.scalar() or 0

        # 카테고리별 분포
        category_result = await db.execute(
            select(KnowledgeItem.category, func.count())
            .group_by(KnowledgeItem.category)
        )
        categories = dict(category_result.all())

    return {
        "total_queries": total_queries,
        "total_knowledge_items": total_knowledge,
        "categories": categories,
        "top_tcodes": [],
    }
