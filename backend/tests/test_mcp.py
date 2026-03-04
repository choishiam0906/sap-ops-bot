"""MCP 서버 테스트 — MCP 도구 및 리소스 단위 테스트."""

from app.mcp_server import (
    diagnose_problem,
    get_memory_recent_resource,
    get_categories_resource,
    get_error_catalog_resource,
    get_error_pattern,
    remember_note,
    search_memory,
    get_skills_resource,
    search_knowledge,
    suggest_tcode,
)

# ── search_knowledge 도구 ──────────────────────────

def test_search_knowledge_basic():
    """기본 키워드 검색."""
    result = search_knowledge("ST22 덤프 분석")
    assert "ST22" in result
    assert "덤프" in result or "런타임" in result


def test_search_knowledge_with_source_type_filter():
    """source_type 필터로 에러 패턴만 검색."""
    result = search_knowledge("에러", source_type="error_pattern")
    assert "에러" in result


def test_search_knowledge_no_results():
    """매칭 결과 없음."""
    result = search_knowledge("완전히무관한검색어xyz123")
    assert "찾지 못했습니다" in result


def test_search_knowledge_top_k():
    """top_k 제한."""
    result = search_knowledge("SAP", top_k=2)
    # 최대 2개 결과만 반환 (--- 구분자 수로 확인)
    separators = result.count("---")
    assert separators <= 1  # 2개 결과 → 1개 구분자


# ── get_error_pattern 도구 ──────────────────────────

def test_get_error_pattern_found():
    """존재하는 에러 코드 조회."""
    result = get_error_pattern("DBIF_RSQL_SQL_ERROR")
    assert "DBIF_RSQL_SQL_ERROR" in result
    assert "SAP Note" in result or "2220064" in result
    assert "해결 방법" in result


def test_get_error_pattern_case_insensitive():
    """대소문자 무관 검색."""
    result = get_error_pattern("dbif_rsql_sql_error")
    assert "DBIF_RSQL_SQL_ERROR" in result


def test_get_error_pattern_not_found():
    """존재하지 않는 에러 코드."""
    result = get_error_pattern("NONEXISTENT_ERROR_CODE")
    assert "찾을 수 없습니다" in result


def test_get_error_pattern_time_out():
    """TIME_OUT 에러 패턴 조회."""
    result = get_error_pattern("TIME_OUT")
    assert "TIME_OUT" in result
    assert "타임아웃" in result


# ── suggest_tcode 도구 ──────────────────────────────

def test_suggest_tcode_dump():
    """덤프 관련 T-code 추천."""
    result = suggest_tcode("덤프 분석")
    assert "ST22" in result


def test_suggest_tcode_transport():
    """전송 관련 T-code 추천."""
    result = suggest_tcode("전송 transport")
    assert "STMS" in result or "SE03" in result


def test_suggest_tcode_no_match():
    """매칭 없는 주제."""
    result = suggest_tcode("xyz존재하지않는주제abc")
    assert "찾지 못했습니다" in result


# ── diagnose_problem 도구 ──────────────────────────

def test_diagnose_problem_with_error_code():
    """에러코드가 포함된 문제 진단."""
    result = diagnose_problem("DBIF_RSQL_SQL_ERROR 덤프가 반복 발생합니다")
    assert "진단 스킬" in result
    assert "DBIF_RSQL_SQL_ERROR" in result
    assert "에러 패턴 매칭" in result


def test_diagnose_problem_general():
    """일반 문제 진단."""
    result = diagnose_problem("시스템 성능이 느려졌습니다")
    assert "진단 스킬" in result
    assert "관련 지식" in result


def test_memory_note_and_search():
    """메모 저장 후 검색 가능."""
    remember_result = remember_note("야간 배치 실패 시 ST22 먼저 확인", tags="운영,긴급")
    assert "메모 저장 완료" in remember_result

    search_result = search_memory("야간 배치 ST22", top_k=3)
    assert "메모리 검색 결과" in search_result
    assert "ST22" in search_result


# ── MCP Resources ──────────────────────────────────

def test_skills_resource():
    """스킬 목록 리소스."""
    result = get_skills_resource()
    assert "오류분석" in result
    assert "데이터분석" in result
    assert "CTS관리" in result


def test_categories_resource():
    """카테고리 목록 리소스."""
    result = get_categories_resource()
    assert "오류분석" in result
    assert "데이터분석" in result


def test_error_catalog_resource():
    """에러 카탈로그 리소스."""
    result = get_error_catalog_resource()
    assert "DBIF_RSQL_SQL_ERROR" in result
    assert "TSV_TNEW_PAGE_ALLOC_FAILED" in result
    assert "10" in result  # 총 10개


def test_memory_recent_resource():
    """최근 메모리 리소스 조회."""
    remember_note("SM21 로그 확인 루틴", tags="로그")
    result = get_memory_recent_resource()
    assert "SAP 운영 메모리" in result
    assert "SM21" in result
