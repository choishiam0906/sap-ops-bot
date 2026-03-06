"""성능 테스트 — pytest-benchmark 기반 임베딩 캐시 및 검색 성능 측정."""

import hashlib
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── 임베딩 캐시 히트/미스 성능 비교 ──────────────────


def test_embedding_cache_lookup_performance(benchmark):
    """캐시 딕셔너리 lookup이 충분히 빠른지 검증 (sha256 키 기반)."""
    cache = {}
    # 1000개의 캐시 엔트리 사전 생성
    for i in range(1000):
        key = hashlib.sha256(f"테스트 텍스트 {i}".encode("utf-8")).hexdigest()
        cache[key] = [0.1] * 1536

    target_key = hashlib.sha256("테스트 텍스트 500".encode("utf-8")).hexdigest()

    def cache_hit():
        return cache.get(target_key)

    result = benchmark(cache_hit)
    assert result is not None
    assert len(result) == 1536


def test_sha256_hashing_performance(benchmark):
    """sha256 해싱 성능 검증."""
    text = "SAP SE38 프로그램 소스코드 보기 방법 알려주세요" * 10

    def hash_text():
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    result = benchmark(hash_text)
    assert len(result) == 64


# ── 키워드 검색 성능 ──────────────────────────────


def test_keyword_search_performance(benchmark):
    """MCP _keyword_search의 성능을 측정한다."""
    from app.mcp_server import _keyword_search

    # 시드 데이터가 존재하면 실제 데이터로 검색
    def search():
        return _keyword_search("SE38 프로그램", None, 5)

    results = benchmark(search)
    # 결과 타입 검증 (빈 결과도 허용)
    assert isinstance(results, list)


# ── 토큰 사용량 카운터 성능 ──────────────────────


def test_token_counter_performance(benchmark):
    """_record_token_usage의 누적 성능을 측정한다. (P4-2: async 대응)"""
    import asyncio
    from app.core.llm_client import _record_token_usage, reset_token_usage

    loop = asyncio.new_event_loop()
    loop.run_until_complete(reset_token_usage())

    def record():
        loop.run_until_complete(_record_token_usage(100, 200))

    benchmark(record)
    loop.close()

    from app.core.llm_client import get_token_usage

    usage = get_token_usage()
    assert usage["total_tokens"] > 0


# ── RRF 점수 계산 성능 ──────────────────────────


def test_rrf_fusion_performance(benchmark):
    """RRF(Reciprocal Rank Fusion) 점수 계산 성능을 측정한다."""
    rrf_k = 60

    # 모의 벡터 + 키워드 검색 결과 (각 100개)
    vector_results = [{"id": f"v_{i}", "title": f"벡터 결과 {i}"} for i in range(100)]
    keyword_results = [{"id": f"k_{i}", "title": f"키워드 결과 {i}"} for i in range(100)]

    # 50% 오버랩 추가
    for i in range(50):
        keyword_results[i]["id"] = f"v_{i}"

    def compute_rrf():
        scores = {}
        result_map = {}

        for rank, r in enumerate(vector_results):
            rid = r["id"]
            scores[rid] = scores.get(rid, 0.0) + 1.0 / (rrf_k + rank + 1)
            result_map[rid] = r

        for rank, r in enumerate(keyword_results):
            rid = r["id"]
            scores[rid] = scores.get(rid, 0.0) + 1.0 / (rrf_k + rank + 1)
            if rid not in result_map:
                result_map[rid] = r

        sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)[:5]
        return [result_map[rid] for rid in sorted_ids]

    results = benchmark(compute_rrf)
    assert len(results) == 5
    # 오버랩 항목이 상위에 위치해야 함
    assert results[0]["id"].startswith("v_")


# ── MemoryStore 검색 성능 ──────────────────────


def test_memory_search_performance(benchmark):
    """MemoryStore 검색 성능을 측정한다."""
    from app.core.memory_store import MemoryStore

    store = MemoryStore(max_entries=300)
    with patch.object(store, "_schedule_persist"):
        for i in range(200):
            store.add_note(f"SAP 운영 메모 {i}: T-code SE{i % 100:02d} 관련 작업 기록")

    def search():
        return store.search("SE38 프로그램", top_k=5)

    results = benchmark(search)
    assert isinstance(results, list)
