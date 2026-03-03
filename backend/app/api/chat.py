"""채팅 API — RAG 기반 SAP 운영 Q&A 엔드포인트."""

from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rag_engine import generate_rag_response
from app.models.database import ChatMessage, ChatSession, get_db
from app.models.schemas import ChatRequest, ChatResponse, SourceInfo

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)) -> ChatResponse:
    """사용자 질문에 대해 RAG 기반 AI 응답을 생성한다."""
    # 세션 관리
    session_id = request.session_id or str(uuid4())

    # 세션 생성 (신규인 경우)
    if not request.session_id:
        session = ChatSession(id=session_id, user_id=request.user_id)
        db.add(session)

    # 사용자 메시지 저장
    user_msg = ChatMessage(
        id=str(uuid4()),
        session_id=session_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)

    # RAG 파이프라인 실행
    result = await generate_rag_response(
        user_message=request.message,
        chat_history=None,  # TODO: 세션 이력 조회 추가
    )

    # AI 응답 저장
    assistant_msg = ChatMessage(
        id=str(uuid4()),
        session_id=session_id,
        role="assistant",
        content=result["answer"],
        sources={"sources": result["sources"], "tcodes": result["suggested_tcodes"]},
    )
    db.add(assistant_msg)
    await db.commit()

    return ChatResponse(
        answer=result["answer"],
        sources=[SourceInfo(**s) for s in result["sources"]],
        suggested_tcodes=result["suggested_tcodes"],
        session_id=session_id,
    )
