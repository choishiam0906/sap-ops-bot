"""채팅 API — SSE 스트리밍 + 스킬 목록."""

import json
import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.core.auth import get_current_user_optional
from app.core.rate_limiter import CHAT_RATE_LIMIT, limiter
from app.models.database import User
from app.models.schemas import ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

CHAT_RUNTIME_GONE_DETAIL = (
    "Server-side chat runtime has been retired. "
    "Use the desktop client with user OAuth (Codex/Copilot)."
)


@router.post("")
async def chat(_: ChatRequest) -> None:
    """서버형 채팅 경로 종료."""
    raise HTTPException(status_code=410, detail=CHAT_RUNTIME_GONE_DETAIL)


@router.post("/stream")
@limiter.limit(CHAT_RATE_LIMIT)
async def chat_stream(
    request: Request,
    body: ChatRequest,
    _user: User | None = Depends(get_current_user_optional),
) -> StreamingResponse:
    """SSE 스트리밍 채팅 엔드포인트.

    RAG 파이프라인을 통해 검색 후 LLM 응답을 토큰 단위로 스트리밍한다.
    클라이언트는 text/event-stream으로 수신하여 점진적 렌더링이 가능하다.
    """
    from app.core.rag_engine import generate_rag_response_stream

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for event in generate_rag_response_stream(
                user_message=body.message,
                category=None,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

            # 스트림 종료 이벤트
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.error("SSE 스트리밍 에러: %s", exc)
            error_event = {"type": "error", "content": "응답 생성 중 오류가 발생했어요."}
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/skills")
async def list_skills(
    _user: User | None = Depends(get_current_user_optional),
) -> list[dict]:
    """사용 가능한 스킬 목록을 반환한다."""
    from app.core.skills import get_skill_registry

    registry = get_skill_registry()
    return registry.list_skills()
