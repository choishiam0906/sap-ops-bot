"""테스트 공용 fixture — 테스트 DB 및 FastAPI TestClient 설정."""

from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.database import Base, get_db

# 테스트 전용 SQLite (인메모리)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_session():
    """테스트용 DB 세션 fixture. 매 테스트마다 새 테이블 생성/삭제."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with test_async_session() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """FastAPI TestClient fixture. DB 의존성을 테스트 세션으로 오버라이드."""
    from app.main import app

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── Azure OpenAI 공통 Mock Fixture ──────────────────


def _make_chat_completion(content: str = "테스트 응답", prompt_tokens: int = 50, completion_tokens: int = 100):
    """ChatCompletion 응답 객체를 생성한다."""
    choice = MagicMock()
    choice.message.content = content
    choice.delta.content = content

    usage = MagicMock()
    usage.prompt_tokens = prompt_tokens
    usage.completion_tokens = completion_tokens

    response = MagicMock()
    response.choices = [choice]
    response.usage = usage
    return response


def _make_embedding_response(embedding: list[float] | None = None, prompt_tokens: int = 10):
    """Embedding 응답 객체를 생성한다."""
    if embedding is None:
        embedding = [0.1] * 1536

    data_item = MagicMock()
    data_item.embedding = embedding

    usage = MagicMock()
    usage.prompt_tokens = prompt_tokens

    response = MagicMock()
    response.data = [data_item]
    response.usage = usage
    return response


@pytest.fixture
def mock_openai_client():
    """Azure OpenAI 클라이언트 mock을 반환한다."""
    client = AsyncMock()
    client.chat.completions.create = AsyncMock(return_value=_make_chat_completion())
    client.embeddings.create = AsyncMock(return_value=_make_embedding_response())
    return client


@pytest.fixture
def make_chat_completion():
    """ChatCompletion 팩토리 fixture."""
    return _make_chat_completion


@pytest.fixture
def make_embedding_response():
    """Embedding 팩토리 fixture."""
    return _make_embedding_response


# ── 인증 관련 fixture ──────────────────────────────


@pytest.fixture
def auth_token():
    """테스트용 JWT 토큰을 생성한다."""
    from app.core.auth import create_access_token
    return create_access_token(subject="admin")


@pytest.fixture
def auth_headers(auth_token: str):
    """인증 헤더 dict를 반환한다."""
    return {"Authorization": f"Bearer {auth_token}"}


# ── Feedback 테스트 fixture ──────────────────────────


@pytest_asyncio.fixture
async def sample_feedbacks(db_session: AsyncSession):
    """테스트용 피드백 데이터를 생성한다."""
    from datetime import datetime

    from app.models.database import Feedback

    now = datetime.now()
    feedbacks = [
        Feedback(message_id="msg-1", rating="positive", comment="좋은 답변", created_at=now),
        Feedback(message_id="msg-2", rating="positive", created_at=now),
        Feedback(message_id="msg-3", rating="negative", comment="정확하지 않음", created_at=now),
        Feedback(message_id="msg-4", rating="positive", created_at=now),
        Feedback(message_id="msg-5", rating="negative", created_at=now),
    ]
    db_session.add_all(feedbacks)
    await db_session.commit()
    return feedbacks


# ── Knowledge/Hybrid Search fixture ─────────────────


@pytest_asyncio.fixture
async def sample_knowledge(db_session: AsyncSession):
    """테스트용 지식 항목을 생성한다."""
    from app.models.database import KnowledgeItem

    items = [
        KnowledgeItem(
            id="k1", title="ST22 덤프 분석", category="에러분석",
            tcode="ST22", source_type="guide",
            content="ST22 트랜잭션으로 ABAP 덤프를 분석하는 방법",
            steps=["ST22 실행", "덤프 목록 확인"], warnings=["권한 필요"], tags=["덤프", "ABAP"],
        ),
        KnowledgeItem(
            id="k2", title="PFCG 역할 생성", category="권한관리",
            tcode="PFCG", source_type="guide",
            content="PFCG에서 SAP 역할을 생성하고 권한을 부여하는 절차",
            steps=["PFCG 실행", "역할 생성"], warnings=[], tags=["역할", "권한"],
        ),
        KnowledgeItem(
            id="k3", title="SM21 시스템 로그", category="모니터링",
            tcode="SM21", source_type="guide",
            content="SM21로 시스템 로그를 조회하고 오류를 추적하는 방법",
            steps=["SM21 실행"], warnings=[], tags=["로그", "모니터링"],
        ),
    ]
    db_session.add_all(items)
    await db_session.commit()
    return items
