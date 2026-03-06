"""FastAPI 앱 엔트리포인트 — SAP 운영 자동화 AI 봇."""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import auth, chat, copilot, feedback, knowledge
from app.config import settings
from app.core.knowledge_base import load_seed_data
from app.core.rate_limiter import limiter
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

    # 초기 관리자 계정 생성
    if settings.auth_enabled:
        from sqlalchemy import select

        from app.core.auth import hash_password
        from app.models.database import User

        async with async_session() as db:
            result = await db.execute(select(User).where(User.username == settings.admin_username))
            if result.scalar_one_or_none() is None:
                admin = User(
                    username=settings.admin_username,
                    hashed_password=hash_password(settings.admin_password),
                )
                db.add(admin)
                await db.commit()
                logger.info("초기 관리자 계정 생성 완료: %s", settings.admin_username)

    # MemoryStore DB 복원
    from app.core.memory_store import get_memory_store
    mem_store = get_memory_store()
    loaded_memories = await mem_store.load_from_db()
    if loaded_memories > 0:
        logger.info(f"MemoryStore에서 {loaded_memories}건 복원 완료")

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

# Rate Limiter 등록
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(chat.router, prefix=settings.api_v1_prefix)
app.include_router(copilot.router, prefix=settings.api_v1_prefix)
app.include_router(knowledge.router, prefix=settings.api_v1_prefix)
app.include_router(feedback.router, prefix=settings.api_v1_prefix)


@app.get(f"{settings.api_v1_prefix}/health")
async def health_check() -> dict:
    """헬스체크 엔드포인트."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "services": {
            "api": "ok",
            "database": "ok",
            "chat_runtime": "retired",
            "vector_store": "legacy",
        },
    }


@app.get(f"{settings.api_v1_prefix}/runtime")
async def runtime_mode() -> dict:
    """현재 런타임 모드를 반환한다."""
    return {
        "mode": "desktop_oauth",
        "chat_api": "retired",
        "providers": ["codex", "copilot"],
    }


# stats TTL 캐시 (10초)
_stats_cache: dict | None = None
_stats_cache_ts: float = 0.0
_STATS_TTL = 10.0


@app.get(f"{settings.api_v1_prefix}/stats")
async def get_stats() -> dict:
    """사용 통계 엔드포인트 (10초 TTL 캐시)."""
    global _stats_cache, _stats_cache_ts

    now = time.monotonic()
    if _stats_cache is not None and (now - _stats_cache_ts) < _STATS_TTL:
        return _stats_cache

    from sqlalchemy import func, select

    from app.models.database import ChatMessage, KnowledgeItem

    async with async_session() as db:
        query_count = await db.execute(
            select(func.count()).select_from(ChatMessage).where(ChatMessage.role == "user")
        )
        total_queries = query_count.scalar() or 0

        knowledge_count = await db.execute(
            select(func.count()).select_from(KnowledgeItem)
        )
        total_knowledge = knowledge_count.scalar() or 0

        category_result = await db.execute(
            select(KnowledgeItem.category, func.count())
            .group_by(KnowledgeItem.category)
        )
        categories = dict(category_result.all())

    from app.core.llm_client import get_token_usage

    _stats_cache = {
        "total_queries": total_queries,
        "total_knowledge_items": total_knowledge,
        "categories": categories,
        "top_tcodes": [],
        "token_usage": get_token_usage(),
    }
    _stats_cache_ts = now
    return _stats_cache
