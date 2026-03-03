"""Azure OpenAI 클라이언트 — LLM 호출 및 임베딩 생성."""

from openai import AsyncAzureOpenAI

from app.config import settings

# Azure OpenAI 클라이언트 (싱글턴)
_client: AsyncAzureOpenAI | None = None


def get_openai_client() -> AsyncAzureOpenAI:
    """Azure OpenAI 클라이언트를 반환한다. 최초 호출 시 생성."""
    global _client
    if _client is None:
        _client = AsyncAzureOpenAI(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
        )
    return _client


SAP_SYSTEM_PROMPT = """\
당신은 SAP 운영 전문가 AI 어시스턴트입니다.
사용자의 SAP 운영 관련 질문에 대해 정확하고 실용적인 답변을 제공합니다.

답변 규칙:
1. 관련 T-code를 항상 안내합니다
2. 단계별 실행 절차를 제공합니다
3. 주의사항이나 팁이 있으면 포함합니다
4. 확실하지 않은 내용은 추측하지 않고 한계를 밝힙니다
5. 한국어로 답변합니다

제공된 컨텍스트를 기반으로 답변하되, 컨텍스트에 없는 일반적인 SAP 지식도 활용할 수 있습니다.
컨텍스트에 관련 정보가 전혀 없으면 솔직하게 알려주세요.\
"""


async def generate_chat_response(
    user_message: str,
    context: str,
    chat_history: list[dict[str, str]] | None = None,
) -> str:
    """RAG 컨텍스트를 포함하여 LLM 응답을 생성한다."""
    client = get_openai_client()

    messages: list[dict[str, str]] = [
        {"role": "system", "content": SAP_SYSTEM_PROMPT},
    ]

    # 이전 대화 이력 포함 (최대 5턴)
    if chat_history:
        messages.extend(chat_history[-10:])

    # RAG 컨텍스트 + 사용자 질문
    user_prompt = f"""참고 자료:
{context}

사용자 질문: {user_message}"""

    messages.append({"role": "user", "content": user_prompt})

    response = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=messages,
        temperature=0.3,
        max_tokens=1500,
    )

    return response.choices[0].message.content or ""


async def generate_embedding(text: str) -> list[float]:
    """텍스트를 벡터 임베딩으로 변환한다."""
    client = get_openai_client()

    response = await client.embeddings.create(
        model=settings.azure_openai_embedding_deployment,
        input=text,
    )

    return response.data[0].embedding
