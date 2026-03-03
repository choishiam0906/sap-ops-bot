"""Pydantic 스키마 — API 요청/응답 모델 정의."""

from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

# ── Chat ──────────────────────────────────────────


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="사용자 질문")
    session_id: str | None = Field(default=None, description="세션 ID (없으면 새로 생성)")
    user_id: str | None = Field(default=None, description="사용자 ID")


class SourceInfo(BaseModel):
    title: str
    category: str
    relevance_score: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceInfo] = []
    suggested_tcodes: list[str] = []
    session_id: str


# ── Copilot Studio ────────────────────────────────


class CopilotRequest(BaseModel):
    text: str = Field(..., description="사용자 질문 텍스트")
    channel_data: dict | None = Field(default=None, alias="channelData")


class CopilotResponse(BaseModel):
    type: str = "message"
    text: str


# ── Knowledge Base ────────────────────────────────


class KnowledgeBase(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str = Field(..., max_length=200)
    category: str = Field(..., max_length=50)
    tcode: str | None = Field(default=None, max_length=20)
    program_name: str | None = Field(
        default=None, max_length=40, description="ABAP 프로그램명 (예: ZFIR0090)"
    )
    source_type: str = Field(default="guide", description="guide, source_code, error_pattern")
    content: str
    steps: list[str] = []
    warnings: list[str] = []
    tags: list[str] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class KnowledgeCreate(BaseModel):
    title: str = Field(..., max_length=200)
    category: str = Field(..., max_length=50)
    tcode: str | None = Field(default=None, max_length=20)
    program_name: str | None = Field(default=None, max_length=40, description="ABAP 프로그램명")
    source_type: str = Field(default="guide", description="guide, source_code, error_pattern")
    content: str
    steps: list[str] = []
    warnings: list[str] = []
    tags: list[str] = []


class KnowledgeUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    tcode: str | None = None
    program_name: str | None = None
    source_type: str | None = None
    content: str | None = None
    steps: list[str] | None = None
    warnings: list[str] | None = None
    tags: list[str] | None = None


class KnowledgeListResponse(BaseModel):
    items: list[KnowledgeBase]
    total: int
    page: int
    page_size: int


# ── System ────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict[str, str]


class StatsResponse(BaseModel):
    total_queries: int
    total_knowledge_items: int
    categories: dict[str, int]
    top_tcodes: list[dict[str, int | str]]
