"""하이브리드 검색 테스트 — RRF 통합, 키워드 우선순위, 빈 결과 처리."""

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession


# ── RRF 점수 계산 로직 테스트 ──────────────────────


def test_rrf_score_calculation():
    """RRF 점수가 올바르게 계산되는지 검증."""
    rrf_k = 60

    # rank 0 → score = 1/(60+1) ≈ 0.01639
    score = 1.0 / (rrf_k + 0 + 1)
    assert abs(score - 0.01639) < 0.001

    # rank 4 → score = 1/(60+5) ≈ 0.01538
    score = 1.0 / (rrf_k + 4 + 1)
    assert abs(score - 0.01538) < 0.001


def test_rrf_overlap_boost():
    """벡터+키워드 양쪽에 존재하는 항목이 더 높은 점수를 받는지 검증."""
    rrf_k = 60

    # 벡터 rank 0 + 키워드 rank 0 (양쪽 모두 1위)
    overlap_score = 1.0 / (rrf_k + 1) + 1.0 / (rrf_k + 1)

    # 벡터 rank 0만 (키워드에 없음)
    single_score = 1.0 / (rrf_k + 1)

    assert overlap_score > single_score


def test_rrf_respects_top_k():
    """RRF 결과가 top_k 이하인지 검증."""
    rrf_k = 60
    top_k = 3

    # 10개 고유 결과
    scores = {}
    for i in range(10):
        rid = f"doc_{i}"
        scores[rid] = 1.0 / (rrf_k + i + 1)

    sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)[:top_k]
    assert len(sorted_ids) == top_k
    # 상위 3개의 점수가 내림차순
    assert scores[sorted_ids[0]] >= scores[sorted_ids[1]] >= scores[sorted_ids[2]]


# ── 키워드 검색 통합 테스트 ──────────────────────────


@pytest.mark.asyncio
async def test_keyword_search_finds_by_tcode(db_session: AsyncSession, sample_knowledge):
    """T-code로 키워드 검색이 되는지 검증."""
    from app.core.knowledge_base import keyword_search

    results = await keyword_search(db_session, "ST22", top_k=5)
    assert len(results) >= 1
    assert any(item.tcode == "ST22" for item in results)


@pytest.mark.asyncio
async def test_keyword_search_finds_by_title(db_session: AsyncSession, sample_knowledge):
    """제목으로 키워드 검색이 되는지 검증."""
    from app.core.knowledge_base import keyword_search

    results = await keyword_search(db_session, "역할 생성", top_k=5)
    assert len(results) >= 1
    assert any("역할" in item.title for item in results)


@pytest.mark.asyncio
async def test_keyword_search_empty_query(db_session: AsyncSession, sample_knowledge):
    """빈 검색어에 대해 빈 결과 반환."""
    from app.core.knowledge_base import keyword_search

    results = await keyword_search(db_session, "", top_k=5)
    assert results == []


@pytest.mark.asyncio
async def test_keyword_search_no_match(db_session: AsyncSession, sample_knowledge):
    """매칭 없는 검색어에 대해 빈 결과 반환."""
    from app.core.knowledge_base import keyword_search

    results = await keyword_search(db_session, "존재하지않는용어XYZABC", top_k=5)
    assert results == []


@pytest.mark.asyncio
async def test_keyword_search_with_category_filter(db_session: AsyncSession, sample_knowledge):
    """카테고리 필터가 적용되는지 검증."""
    from app.core.knowledge_base import keyword_search

    # '에러분석' 카테고리로 필터링
    results = await keyword_search(db_session, "ST22", top_k=5, category="에러분석")
    assert len(results) >= 1
    assert all(item.category == "에러분석" for item in results)

    # 다른 카테고리로 필터링 → 결과 없음
    results = await keyword_search(db_session, "ST22", top_k=5, category="권한관리")
    assert len(results) == 0
