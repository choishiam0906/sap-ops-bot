"""스킬 라우팅 테스트 — 스킬 선택, 매칭 점수, 레지스트리 검증."""

import pytest
from httpx import AsyncClient

from app.core.skills.auth_management import AuthManagementSkill
from app.core.skills.base import BaseSkill
from app.core.skills.cts_management import CTSManagementSkill
from app.core.skills.data_analysis import DataAnalysisSkill
from app.core.skills.error_analysis import ErrorAnalysisSkill
from app.core.skills.general import GeneralSkill
from app.core.skills.registry import SkillRegistry

# ── BaseSkill 매칭 로직 ──────────────────────────

def test_error_analysis_matches_dump_query():
    """오류분석 스킬이 덤프 관련 질문에 매칭."""
    skill = ErrorAnalysisSkill()
    score = skill.matches("ST22 덤프 분석 방법 알려줘")
    assert score > 0.5


def test_data_analysis_matches_trace_query():
    """데이터분석 스킬이 trace 관련 질문에 매칭."""
    skill = DataAnalysisSkill()
    score = skill.matches("ST05 SQL Trace 분석하는 방법")
    assert score > 0.5


def test_auth_management_matches_role_query():
    """역할관리 스킬이 권한 관련 질문에 매칭."""
    skill = AuthManagementSkill()
    score = skill.matches("PFCG에서 역할 생성하는 방법")
    assert score > 0.5


def test_cts_management_matches_transport_query():
    """CTS관리 스킬이 전송 관련 질문에 매칭."""
    skill = CTSManagementSkill()
    score = skill.matches("STMS에서 transport request 전송하기")
    assert score > 0.5


def test_general_skill_always_returns_low_score():
    """일반 스킬은 항상 0.1을 반환."""
    skill = GeneralSkill()
    assert skill.matches("아무 질문") == 0.1
    assert skill.matches("ST22 덤프") == 0.1


def test_skill_no_match_returns_zero():
    """매칭 키워드가 없으면 0.0 반환."""
    skill = DataAnalysisSkill()
    score = skill.matches("PFCG에서 역할 생성")
    assert score == 0.0


# ── SkillRegistry ──────────────────────────────

def test_registry_select_error_analysis():
    """레지스트리가 덤프 질문에 오류분석 스킬을 선택."""
    registry = SkillRegistry()
    registry.register(DataAnalysisSkill())
    registry.register(ErrorAnalysisSkill())
    registry.register(GeneralSkill())

    selected = registry.select_skill("ST22에서 ABAP 덤프 분석하는 방법")
    assert selected.metadata.name == "오류분석"


def test_registry_select_data_analysis():
    """레지스트리가 이력 질문에 데이터분석 스킬을 선택."""
    registry = SkillRegistry()
    registry.register(DataAnalysisSkill())
    registry.register(ErrorAnalysisSkill())
    registry.register(GeneralSkill())

    selected = registry.select_skill("SM20에서 감사 로그 조회 방법")
    assert selected.metadata.name == "데이터분석"


def test_registry_fallback_to_general():
    """매칭되는 스킬이 없으면 일반 스킬로 폴백."""
    registry = SkillRegistry()
    registry.register(DataAnalysisSkill())
    registry.register(ErrorAnalysisSkill())
    registry.register(GeneralSkill())

    selected = registry.select_skill("SAP GUI 설치 방법")
    assert selected.metadata.name == "일반"


def test_registry_list_skills():
    """스킬 목록 조회."""
    registry = SkillRegistry()
    registry.register(ErrorAnalysisSkill())
    registry.register(GeneralSkill())

    skills = registry.list_skills()
    assert len(skills) == 2
    assert skills[0]["name"] == "오류분석"
    assert "suggested_tcodes" in skills[0]


def test_registry_empty_raises():
    """스킬이 없으면 RuntimeError."""
    registry = SkillRegistry()
    with pytest.raises(RuntimeError):
        registry.select_skill("아무 질문")


def test_registry_rank_skills_returns_sorted_scores():
    """스킬 랭킹이 점수/우선순위 기준으로 정렬된다."""
    registry = SkillRegistry()
    registry.register(DataAnalysisSkill())
    registry.register(ErrorAnalysisSkill())
    registry.register(GeneralSkill())

    ranked = registry.rank_skills("ST22 덤프 원인 분석")
    assert len(ranked) == 3
    assert ranked[0]["score"] >= ranked[1]["score"]
    assert ranked[0]["skill"].metadata.name == "오류분석"


# ── 스킬 메타데이터 검증 ──────────────────────────

def test_all_skills_have_system_prompt():
    """모든 스킬이 시스템 프롬프트를 가지고 있는지 확인."""
    skills: list[BaseSkill] = [
        DataAnalysisSkill(),
        ErrorAnalysisSkill(),
        AuthManagementSkill(),
        CTSManagementSkill(),
        GeneralSkill(),
    ]
    for skill in skills:
        assert len(skill.system_prompt) > 50
        assert "한국어" in skill.system_prompt


def test_all_skills_have_unique_names():
    """스킬 이름이 중복되지 않는지 확인."""
    skills = [
        DataAnalysisSkill(),
        ErrorAnalysisSkill(),
        AuthManagementSkill(),
        CTSManagementSkill(),
        GeneralSkill(),
    ]
    names = [s.metadata.name for s in skills]
    assert len(names) == len(set(names))


# ── API 통합 테스트 ──────────────────────────────

@pytest.mark.asyncio
async def test_chat_endpoint_is_deprecated(client: AsyncClient):
    """POST /api/v1/chat는 클라이언트 전환 후 410을 반환한다."""
    response = await client.post("/api/v1/chat", json={
        "message": "ST22 덤프 분석 방법",
    })

    assert response.status_code == 410
    assert "retired" in response.json()["detail"]


@pytest.mark.asyncio
async def test_skills_endpoint(client: AsyncClient):
    """GET /api/v1/chat/skills 엔드포인트."""
    response = await client.get("/api/v1/chat/skills")
    assert response.status_code == 200

    skills = response.json()
    assert len(skills) >= 5  # 5개 기본 스킬

    names = [s["name"] for s in skills]
    assert "오류분석" in names
    assert "데이터분석" in names
    assert "역할관리" in names
    assert "CTS관리" in names
    assert "일반" in names
    assert all("priority" in s for s in skills)


# ── P4-3: 스킬 키워드 매칭 정확도 보강 ──────────────


def test_error_analysis_matches_multiple_keywords():
    """오류분석 스킬이 다양한 에러 키워드에 매칭."""
    skill = ErrorAnalysisSkill()
    # ABAP 덤프 관련
    assert skill.matches("런타임 에러 분석") > 0
    # 에러코드 관련
    assert skill.matches("MESSAGE_TYPE_X 에러 원인") > 0


def test_data_analysis_matches_log_query():
    """데이터분석 스킬이 로그/감사 질문에 매칭."""
    skill = DataAnalysisSkill()
    assert skill.matches("SM20 감사 로그 조회") > 0.5
    assert skill.matches("SM21 시스템 로그 분석") > 0.5


def test_auth_management_matches_su53():
    """역할관리 스킬이 SU53 권한 오류에 매칭."""
    skill = AuthManagementSkill()
    assert skill.matches("SU53 권한 오류 확인") > 0.5


def test_cts_management_matches_se09():
    """CTS관리 스킬이 SE09 관련 질문에 매칭."""
    skill = CTSManagementSkill()
    assert skill.matches("SE09에서 전송 요청 생성") > 0.5


def test_skill_score_is_bounded():
    """모든 스킬 점수가 0.0~1.0 범위인지 검증."""
    skills: list[BaseSkill] = [
        DataAnalysisSkill(),
        ErrorAnalysisSkill(),
        AuthManagementSkill(),
        CTSManagementSkill(),
        GeneralSkill(),
    ]
    queries = [
        "ST22 덤프 분석", "PFCG 역할 생성", "STMS 전송",
        "SM21 로그", "SAP 설치", "",
    ]
    for skill in skills:
        for query in queries:
            score = skill.matches(query)
            assert 0.0 <= score <= 1.0, f"{skill.metadata.name}: score={score} for '{query}'"
