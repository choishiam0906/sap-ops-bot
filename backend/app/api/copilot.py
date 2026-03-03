"""Copilot Studio 연동 API — Teams 채팅봇 전용 엔드포인트."""

from fastapi import APIRouter, Request

from app.core.rag_engine import generate_rag_response

router = APIRouter(prefix="/chat", tags=["Copilot Studio"])


@router.post("/copilot")
async def copilot_chat(request: Request) -> dict:
    """Copilot Studio Custom Connector 전용 엔드포인트.

    Copilot Studio에서 보내는 요청을 받아 RAG 응답을 생성하고,
    Adaptive Card 형식으로 반환한다.
    """
    body = await request.json()
    user_text = body.get("text", body.get("message", ""))

    if not user_text:
        return _build_text_response("질문을 입력해주세요.")

    result = await generate_rag_response(user_message=user_text)

    # Adaptive Card 형식 응답
    return _build_adaptive_card_response(
        answer=result["answer"],
        tcodes=result["suggested_tcodes"],
        sources=result["sources"],
    )


def _build_text_response(text: str) -> dict:
    """단순 텍스트 응답."""
    return {"type": "message", "text": text}


def _build_adaptive_card_response(
    answer: str,
    tcodes: list[str],
    sources: list[dict],
) -> dict:
    """Adaptive Card 형식의 구조화된 응답을 생성한다."""
    body_items: list[dict] = [
        {
            "type": "TextBlock",
            "text": "SAP 운영 가이드",
            "weight": "bolder",
            "size": "medium",
        },
        {
            "type": "TextBlock",
            "text": answer,
            "wrap": True,
        },
    ]

    # 관련 T-code 표시
    if tcodes:
        body_items.append({
            "type": "TextBlock",
            "text": f"관련 T-code: {', '.join(tcodes)}",
            "weight": "bolder",
            "color": "accent",
        })

    # 참조 소스 표시
    if sources:
        source_texts = [
            f"- {s['title']} ({s['category']}, 관련도: {s['relevance_score']:.0%})"
            for s in sources[:3]
        ]
        body_items.append({
            "type": "TextBlock",
            "text": "참조:\n" + "\n".join(source_texts),
            "wrap": True,
            "size": "small",
            "color": "dark",
        })

    return {
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.5",
        "body": body_items,
    }
