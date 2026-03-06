"""피드백 API 테스트 — 저장, 통계, 유효성 검증."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import Feedback


# ── POST /feedback 테스트 ──────────────────────────


@pytest.mark.asyncio
async def test_submit_feedback_positive(client: AsyncClient):
    """positive 피드백이 정상 저장되는지 검증."""
    response = await client.post("/api/v1/feedback", json={
        "message_id": "msg-001",
        "rating": "positive",
        "comment": "정확한 답변이에요",
    })

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "saved"
    assert "id" in data


@pytest.mark.asyncio
async def test_submit_feedback_negative(client: AsyncClient):
    """negative 피드백이 정상 저장되는지 검증."""
    response = await client.post("/api/v1/feedback", json={
        "message_id": "msg-002",
        "rating": "negative",
        "comment": "부정확함",
    })

    assert response.status_code == 201


@pytest.mark.asyncio
async def test_submit_feedback_without_comment(client: AsyncClient):
    """comment 없이도 피드백 저장이 가능한지 검증."""
    response = await client.post("/api/v1/feedback", json={
        "message_id": "msg-003",
        "rating": "positive",
    })

    assert response.status_code == 201


@pytest.mark.asyncio
async def test_submit_feedback_invalid_rating(client: AsyncClient):
    """잘못된 rating 값 시 422 반환."""
    response = await client.post("/api/v1/feedback", json={
        "message_id": "msg-004",
        "rating": "neutral",  # positive/negative만 허용
    })

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_missing_message_id(client: AsyncClient):
    """message_id 누락 시 422 반환."""
    response = await client.post("/api/v1/feedback", json={
        "rating": "positive",
    })

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_submit_feedback_empty_rating(client: AsyncClient):
    """빈 rating 시 422 반환."""
    response = await client.post("/api/v1/feedback", json={
        "message_id": "msg-005",
        "rating": "",
    })

    assert response.status_code == 422


# ── GET /feedback/stats 테스트 ──────────────────────


@pytest.mark.asyncio
async def test_feedback_stats_empty(client: AsyncClient):
    """피드백이 없을 때 통계가 0으로 반환."""
    response = await client.get("/api/v1/feedback/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["total_feedbacks"] == 0
    assert data["satisfaction_rate"] == 0.0


@pytest.mark.asyncio
async def test_feedback_stats_with_data(client: AsyncClient, sample_feedbacks):
    """피드백 데이터가 있을 때 통계 정확도 검증."""
    response = await client.get("/api/v1/feedback/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["total_feedbacks"] == 5
    assert data["positive_count"] == 3
    assert data["negative_count"] == 2
    assert data["satisfaction_rate"] == 0.6  # 3/5


@pytest.mark.asyncio
async def test_feedback_stats_daily_aggregation(client: AsyncClient, sample_feedbacks):
    """일별 집계가 포함되는지 검증."""
    response = await client.get("/api/v1/feedback/stats")

    assert response.status_code == 200
    data = response.json()
    assert "recent_daily" in data
    # 모든 피드백이 오늘 생성 → 1일치 데이터
    assert len(data["recent_daily"]) >= 1


@pytest.mark.asyncio
async def test_submit_multiple_feedbacks_for_same_message(client: AsyncClient):
    """동일 메시지에 대한 다중 피드백 허용 검증."""
    for rating in ["positive", "negative", "positive"]:
        response = await client.post("/api/v1/feedback", json={
            "message_id": "msg-same",
            "rating": rating,
        })
        assert response.status_code == 201
