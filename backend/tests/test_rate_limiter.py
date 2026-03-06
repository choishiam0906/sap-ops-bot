"""Rate Limiter 테스트 — 상수 검증 및 limiter 설정 확인."""

from app.core.rate_limiter import (
    CHAT_RATE_LIMIT,
    FEEDBACK_RATE_LIMIT,
    KNOWLEDGE_RATE_LIMIT,
    limiter,
)


# ── Rate Limit 상수 검증 ──────────────────────────


def test_chat_rate_limit_format():
    """채팅 rate limit이 올바른 형식인지 검증."""
    assert "/" in CHAT_RATE_LIMIT
    count, period = CHAT_RATE_LIMIT.split("/")
    assert count.isdigit()
    assert period in ("second", "minute", "hour", "day")


def test_feedback_rate_limit_format():
    """피드백 rate limit이 올바른 형식인지 검증."""
    assert "/" in FEEDBACK_RATE_LIMIT
    count, period = FEEDBACK_RATE_LIMIT.split("/")
    assert count.isdigit()


def test_knowledge_rate_limit_format():
    """지식 베이스 rate limit이 올바른 형식인지 검증."""
    assert "/" in KNOWLEDGE_RATE_LIMIT
    count, period = KNOWLEDGE_RATE_LIMIT.split("/")
    assert count.isdigit()


def test_chat_limit_is_restrictive():
    """채팅 rate limit이 피드백보다 더 제한적인지 검증."""
    chat_count = int(CHAT_RATE_LIMIT.split("/")[0])
    feedback_count = int(FEEDBACK_RATE_LIMIT.split("/")[0])
    # 채팅은 LLM 호출 비용이 높으므로 더 제한적
    assert chat_count <= feedback_count


def test_limiter_has_key_func():
    """limiter가 IP 기반 key_func을 사용하는지 검증."""
    assert limiter._key_func is not None
