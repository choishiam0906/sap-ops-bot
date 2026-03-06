"""LLM 클라이언트 단위 테스트 — Azure OpenAI 모킹."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from openai import APIStatusError


# ── generate_chat_response 테스트 ──────────────────


@pytest.mark.asyncio
async def test_chat_response_returns_content(mock_openai_client, make_chat_completion):
    """정상적인 chat 응답을 반환하는지 검증."""
    mock_openai_client.chat.completions.create = AsyncMock(
        return_value=make_chat_completion("SAP SE38 사용법입니다.")
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        from app.core.llm_client import generate_chat_response

        result = await generate_chat_response("SE38이 뭔가요?", "참고 자료 없음")
        assert "SE38" in result


@pytest.mark.asyncio
async def test_chat_response_empty_choices(mock_openai_client):
    """choices가 비어있을 때 기본 에러 메시지 반환."""
    empty_response = MagicMock()
    empty_response.choices = []
    empty_response.usage = MagicMock(prompt_tokens=10, completion_tokens=0)
    mock_openai_client.chat.completions.create = AsyncMock(return_value=empty_response)

    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        from app.core.llm_client import generate_chat_response

        result = await generate_chat_response("테스트", "컨텍스트")
        assert "죄송합니다" in result


@pytest.mark.asyncio
async def test_chat_response_includes_history(mock_openai_client, make_chat_completion):
    """chat_history가 messages에 포함되는지 검증."""
    mock_openai_client.chat.completions.create = AsyncMock(
        return_value=make_chat_completion("응답")
    )
    history = [
        {"role": "user", "content": "이전 질문"},
        {"role": "assistant", "content": "이전 응답"},
    ]
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        from app.core.llm_client import generate_chat_response

        await generate_chat_response("새 질문", "컨텍스트", chat_history=history)
        call_args = mock_openai_client.chat.completions.create.call_args
        messages = call_args.kwargs.get("messages", call_args[1].get("messages", []))
        # system + history(2) + user = 4
        assert len(messages) == 4


@pytest.mark.asyncio
async def test_chat_response_custom_system_prompt(mock_openai_client, make_chat_completion):
    """custom system_prompt가 적용되는지 검증."""
    mock_openai_client.chat.completions.create = AsyncMock(
        return_value=make_chat_completion("커스텀 응답")
    )
    custom_prompt = "당신은 ABAP 전문가입니다."
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        from app.core.llm_client import generate_chat_response

        await generate_chat_response("질문", "컨텍스트", system_prompt=custom_prompt)
        call_args = mock_openai_client.chat.completions.create.call_args
        messages = call_args.kwargs.get("messages", call_args[1].get("messages", []))
        assert messages[0]["content"] == custom_prompt


# ── generate_embedding 테스트 ──────────────────────


@pytest.mark.asyncio
async def test_embedding_returns_vector(mock_openai_client, make_embedding_response):
    """임베딩 벡터를 정상 반환하는지 검증."""
    expected = [0.5] * 1536
    mock_openai_client.embeddings.create = AsyncMock(
        return_value=make_embedding_response(expected)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        # 캐시 초기화
        import app.core.llm_client as mod
        mod._embedding_cache.clear()

        result = await mod.generate_embedding("테스트 텍스트")
        assert result == expected
        assert len(result) == 1536


@pytest.mark.asyncio
async def test_embedding_cache_hit(mock_openai_client, make_embedding_response):
    """동일 텍스트에 대해 캐시 히트로 API 호출을 절약하는지 검증."""
    mock_openai_client.embeddings.create = AsyncMock(
        return_value=make_embedding_response([0.1] * 1536)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        import app.core.llm_client as mod
        mod._embedding_cache.clear()

        await mod.generate_embedding("캐시 테스트")
        await mod.generate_embedding("캐시 테스트")  # 두 번째는 캐시에서

        assert mock_openai_client.embeddings.create.call_count == 1


@pytest.mark.asyncio
async def test_embedding_cache_eviction(mock_openai_client, make_embedding_response):
    """캐시가 최대 크기를 초과하면 가장 오래된 항목이 제거되는지 검증."""
    mock_openai_client.embeddings.create = AsyncMock(
        return_value=make_embedding_response([0.1] * 10)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        import app.core.llm_client as mod
        mod._embedding_cache.clear()
        original_max = mod._EMBEDDING_CACHE_MAX
        mod._EMBEDDING_CACHE_MAX = 3  # 테스트를 위해 캐시 크기 축소

        try:
            for i in range(5):
                await mod.generate_embedding(f"텍스트_{i}")

            assert len(mod._embedding_cache) <= 3
        finally:
            mod._EMBEDDING_CACHE_MAX = original_max


# ── 토큰 사용량 추적 테스트 ──────────────────────────


@pytest.mark.asyncio
async def test_token_usage_tracked(mock_openai_client, make_chat_completion):
    """chat 호출 시 토큰 사용량이 누적되는지 검증."""
    mock_openai_client.chat.completions.create = AsyncMock(
        return_value=make_chat_completion("응답", prompt_tokens=100, completion_tokens=200)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        import app.core.llm_client as mod
        await mod.reset_token_usage()

        await mod.generate_chat_response("질문", "컨텍스트")

        usage = mod.get_token_usage()
        assert usage["total_prompt_tokens"] == 100
        assert usage["total_completion_tokens"] == 200
        assert usage["total_tokens"] == 300
        assert usage["request_count"] == 1


@pytest.mark.asyncio
async def test_token_usage_reset(mock_openai_client, make_chat_completion):
    """토큰 카운터 초기화가 정상 작동하는지 검증."""
    mock_openai_client.chat.completions.create = AsyncMock(
        return_value=make_chat_completion("응답", prompt_tokens=50, completion_tokens=50)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        import app.core.llm_client as mod

        await mod.generate_chat_response("질문", "컨텍스트")
        await mod.reset_token_usage()

        usage = mod.get_token_usage()
        assert usage["total_tokens"] == 0
        assert usage["request_count"] == 0


# ── Retry 로직 테스트 ──────────────────────────────


def _make_api_status_error(status_code: int):
    """APIStatusError를 생성한다."""
    response = MagicMock()
    response.status_code = status_code
    response.headers = {}
    response.json.return_value = {"error": {"message": "test error"}}
    return APIStatusError(
        message=f"Error {status_code}",
        response=response,
        body={"error": {"message": "test error"}},
    )


@pytest.mark.asyncio
async def test_chat_retry_on_429(mock_openai_client, make_chat_completion):
    """429 에러 시 재시도 후 성공하는지 검증."""
    mock_openai_client.chat.completions.create = AsyncMock(
        side_effect=[
            _make_api_status_error(429),
            make_chat_completion("재시도 성공"),
        ]
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        from app.core.llm_client import generate_chat_response

        result = await generate_chat_response("질문", "컨텍스트")
        assert "재시도 성공" in result
        assert mock_openai_client.chat.completions.create.call_count == 2


@pytest.mark.asyncio
async def test_chat_retry_exhausted(mock_openai_client):
    """3회 재시도 후에도 실패하면 예외가 발생하는지 검증."""
    mock_openai_client.chat.completions.create = AsyncMock(
        side_effect=_make_api_status_error(429)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        from app.core.llm_client import generate_chat_response

        with pytest.raises(APIStatusError):
            await generate_chat_response("질문", "컨텍스트")

        assert mock_openai_client.chat.completions.create.call_count == 3


@pytest.mark.asyncio
async def test_chat_no_retry_on_400(mock_openai_client):
    """400 에러는 재시도하지 않는지 검증."""
    mock_openai_client.chat.completions.create = AsyncMock(
        side_effect=_make_api_status_error(400)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        from app.core.llm_client import generate_chat_response

        with pytest.raises(APIStatusError):
            await generate_chat_response("질문", "컨텍스트")

        # 400은 재시도 불가 → 1회만 호출
        assert mock_openai_client.chat.completions.create.call_count == 1


@pytest.mark.asyncio
async def test_embedding_retry_on_500(mock_openai_client, make_embedding_response):
    """500 에러 시 임베딩 재시도 후 성공하는지 검증."""
    mock_openai_client.embeddings.create = AsyncMock(
        side_effect=[
            _make_api_status_error(500),
            make_embedding_response([0.2] * 10),
        ]
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        import app.core.llm_client as mod
        mod._embedding_cache.clear()

        result = await mod.generate_embedding("재시도 임베딩 테스트")
        assert result == [0.2] * 10
        assert mock_openai_client.embeddings.create.call_count == 2


# ── 스트리밍 테스트 ──────────────────────────────────


@pytest.mark.asyncio
async def test_stream_response_yields_tokens(mock_openai_client):
    """스트리밍 응답이 토큰을 순차적으로 yield하는지 검증."""
    # 스트리밍 응답 mock — async iterator 시뮬레이션
    chunks = []
    for token in ["SAP ", "SE38 ", "사용법"]:
        chunk = MagicMock()
        chunk.choices = [MagicMock()]
        chunk.choices[0].delta.content = token
        chunks.append(chunk)

    # 빈 delta (finish_reason="stop")
    final_chunk = MagicMock()
    final_chunk.choices = [MagicMock()]
    final_chunk.choices[0].delta.content = None
    chunks.append(final_chunk)

    async def mock_aiter():
        for c in chunks:
            yield c

    mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_aiter())

    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        from app.core.llm_client import generate_chat_response_stream

        # async generator는 await 없이 직접 호출
        stream = generate_chat_response_stream("질문", "컨텍스트")
        tokens = [t async for t in stream]
        assert tokens == ["SAP ", "SE38 ", "사용법"]


# ── 동시성(Thread-Safe) 테스트 ──────────────────────


@pytest.mark.asyncio
async def test_concurrent_token_recording(mock_openai_client, make_chat_completion):
    """asyncio.gather로 10개 동시 호출 시 토큰 카운터 정합성 검증."""
    mock_openai_client.chat.completions.create = AsyncMock(
        return_value=make_chat_completion("응답", prompt_tokens=10, completion_tokens=20)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        import app.core.llm_client as mod
        await mod.reset_token_usage()

        # 10개 동시 호출
        tasks = [
            mod.generate_chat_response(f"질문 {i}", "컨텍스트")
            for i in range(10)
        ]
        await asyncio.gather(*tasks)

        usage = mod.get_token_usage()
        assert usage["total_prompt_tokens"] == 100  # 10 * 10
        assert usage["total_completion_tokens"] == 200  # 10 * 20
        assert usage["total_tokens"] == 300  # 10 * 30
        assert usage["request_count"] == 10


@pytest.mark.asyncio
async def test_concurrent_embedding_cache_safety(mock_openai_client, make_embedding_response):
    """동시 임베딩 요청 시 캐시 무결성 검증."""
    mock_openai_client.embeddings.create = AsyncMock(
        return_value=make_embedding_response([0.3] * 1536)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        import app.core.llm_client as mod
        mod._embedding_cache.clear()

        # 동일 텍스트로 동시 요청 — 캐시 경합
        tasks = [mod.generate_embedding("동시 테스트") for _ in range(5)]
        results = await asyncio.gather(*tasks)

        # 모든 결과 동일
        for result in results:
            assert result == [0.3] * 1536

        # API 호출은 1~2회 (첫 번째만 API, 나머지는 캐시)
        assert mock_openai_client.embeddings.create.call_count <= 2


@pytest.mark.asyncio
async def test_embedding_cache_ttl_expiry(mock_openai_client, make_embedding_response):
    """TTL 만료 시 캐시가 재갱신되는지 검증."""
    import time

    mock_openai_client.embeddings.create = AsyncMock(
        return_value=make_embedding_response([0.5] * 10)
    )
    with patch("app.core.llm_client.get_openai_client", return_value=mock_openai_client):
        import app.core.llm_client as mod
        mod._embedding_cache.clear()

        await mod.generate_embedding("TTL 테스트")
        assert mock_openai_client.embeddings.create.call_count == 1

        # 캐시 타임스탬프를 강제로 과거로 설정 (TTL 만료 시뮬레이션)
        import hashlib
        cache_key = hashlib.sha256("TTL 테스트".encode("utf-8")).hexdigest()
        if cache_key in mod._embedding_cache:
            embedding, _ = mod._embedding_cache[cache_key]
            mod._embedding_cache[cache_key] = (embedding, time.monotonic() - 600)

        await mod.generate_embedding("TTL 테스트")
        # TTL 만료 → API 재호출
        assert mock_openai_client.embeddings.create.call_count == 2
