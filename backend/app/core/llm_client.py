"""Azure OpenAI 클라이언트 — LLM 호출, 임베딩 생성, 에러 복구."""

import asyncio
import hashlib
import logging
import time
from collections.abc import AsyncGenerator

from openai import APIStatusError, AsyncAzureOpenAI
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings

logger = logging.getLogger(__name__)

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


# ── 토큰 사용량 카운터 (asyncio.Lock 보호) ───────────
_token_usage: dict[str, int | float] = {
    "total_prompt_tokens": 0,
    "total_completion_tokens": 0,
    "total_tokens": 0,
    "request_count": 0,
    "last_reset": time.monotonic(),
}
_token_usage_lock = asyncio.Lock()


def get_token_usage() -> dict:
    """누적 토큰 사용량 통계를 반환한다."""
    return {**_token_usage, "uptime_seconds": round(time.monotonic() - _token_usage["last_reset"])}


async def reset_token_usage() -> None:
    """토큰 카운터를 초기화한다."""
    async with _token_usage_lock:
        _token_usage["total_prompt_tokens"] = 0
        _token_usage["total_completion_tokens"] = 0
        _token_usage["total_tokens"] = 0
        _token_usage["request_count"] = 0
        _token_usage["last_reset"] = time.monotonic()


async def _record_token_usage(prompt_tokens: int, completion_tokens: int) -> None:
    """응답의 토큰 사용량을 누적 기록한다. asyncio.Lock으로 동시 접근 보호."""
    async with _token_usage_lock:
        _token_usage["total_prompt_tokens"] += prompt_tokens
        _token_usage["total_completion_tokens"] += completion_tokens
        _token_usage["total_tokens"] += prompt_tokens + completion_tokens
        _token_usage["request_count"] += 1


# ── Retry 정책 ──────────────────────────────────────

_RETRYABLE_STATUS_CODES = {429, 500, 502, 503}


def _is_retryable_error(exc: BaseException) -> bool:
    """재시도 가능한 Azure OpenAI 에러인지 판별한다."""
    if isinstance(exc, APIStatusError):
        return exc.status_code in _RETRYABLE_STATUS_CODES
    return False


_chat_retry = retry(
    retry=retry_if_exception(_is_retryable_error),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
    before_sleep=lambda rs: logger.warning(
        "LLM chat 재시도 %d/%d (에러: %s)",
        rs.attempt_number, 3, rs.outcome.exception() if rs.outcome else "unknown",
    ),
)

_embedding_retry = retry(
    retry=retry_if_exception(_is_retryable_error),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
    before_sleep=lambda rs: logger.warning(
        "임베딩 재시도 %d/%d (에러: %s)",
        rs.attempt_number, 3, rs.outcome.exception() if rs.outcome else "unknown",
    ),
)


# ── LLM 호출 ──────────────────────────────────────


@_chat_retry
async def generate_chat_response(
    user_message: str,
    context: str,
    chat_history: list[dict[str, str]] | None = None,
    system_prompt: str | None = None,
) -> str:
    """RAG 컨텍스트를 포함하여 LLM 응답을 생성한다."""
    client = get_openai_client()

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt or SAP_SYSTEM_PROMPT},
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
        timeout=30.0,
    )

    # 토큰 사용량 기록
    if response.usage:
        await _record_token_usage(response.usage.prompt_tokens, response.usage.completion_tokens)

    # 응답 검증
    if not response.choices:
        logger.error("LLM 응답이 비어있습니다")
        return "죄송합니다. 응답을 생성하지 못했어요. 잠시 후 다시 시도해주세요."

    return response.choices[0].message.content or ""


async def generate_chat_response_stream(
    user_message: str,
    context: str,
    chat_history: list[dict[str, str]] | None = None,
    system_prompt: str | None = None,
) -> AsyncGenerator[str, None]:
    """SSE 스트리밍용 LLM 응답 async generator.

    토큰 단위로 yield하여 클라이언트에서 점진적 렌더링이 가능하다.
    Note: async generator는 tenacity @retry와 호환되지 않으므로
    초기 연결만 내부에서 재시도 처리한다.
    """
    client = get_openai_client()

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt or SAP_SYSTEM_PROMPT},
    ]

    if chat_history:
        messages.extend(chat_history[-10:])

    user_prompt = f"""참고 자료:
{context}

사용자 질문: {user_message}"""

    messages.append({"role": "user", "content": user_prompt})

    # 초기 연결에 대해서만 재시도 (async generator 본문은 retry 불가)
    @_chat_retry
    async def _create_stream():  # type: ignore[no-untyped-def]
        return await client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=messages,
            temperature=0.3,
            max_tokens=1500,
            stream=True,
            timeout=30.0,
        )

    stream = await _create_stream()

    prompt_tokens_est = sum(len(m.get("content", "")) // 4 for m in messages)
    completion_tokens = 0

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            token = chunk.choices[0].delta.content
            completion_tokens += 1
            yield token

    # 스트리밍 완료 후 토큰 사용량 추정 기록
    await _record_token_usage(prompt_tokens_est, completion_tokens)


# ── 임베딩 ──────────────────────────────────────────

# 임베딩 캐시 (sha256 키 기반, 최대 1000개, TTL 5분)
_embedding_cache: dict[str, tuple[list[float], float]] = {}
_embedding_cache_lock = asyncio.Lock()
_EMBEDDING_CACHE_MAX = 1000
_EMBEDDING_CACHE_TTL = 300.0  # 5분


@_embedding_retry
async def generate_embedding(text: str) -> list[float]:
    """텍스트를 벡터 임베딩으로 변환한다. sha256 캐시 + TTL 5분 적용."""
    cache_key = hashlib.sha256(text.encode("utf-8")).hexdigest()
    now = time.monotonic()

    async with _embedding_cache_lock:
        if cache_key in _embedding_cache:
            embedding, cached_at = _embedding_cache[cache_key]
            if now - cached_at < _EMBEDDING_CACHE_TTL:
                return embedding
            del _embedding_cache[cache_key]

    client = get_openai_client()
    response = await client.embeddings.create(
        model=settings.azure_openai_embedding_deployment,
        input=text,
        timeout=10.0,
    )
    embedding = response.data[0].embedding

    # 토큰 사용량 기록
    if response.usage:
        await _record_token_usage(response.usage.prompt_tokens, 0)

    # LRU 방식 — 최대 크기 초과 시 가장 오래된 항목 제거
    async with _embedding_cache_lock:
        if len(_embedding_cache) >= _EMBEDDING_CACHE_MAX:
            oldest_key = next(iter(_embedding_cache))
            del _embedding_cache[oldest_key]
        _embedding_cache[cache_key] = (embedding, now)

    return embedding
