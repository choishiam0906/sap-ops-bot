"""데이터분석 스킬 — ST03N, SM20, RSM37, SE38, SCU3, ST05 등."""

from app.core.skills.base import BaseSkill, SkillMetadata


class DataAnalysisSkill(BaseSkill):
    """SAP 데이터 분석 및 이력 조회 전문 스킬."""

    @property
    def metadata(self) -> SkillMetadata:
        return SkillMetadata(
            name="데이터분석",
            description="트랜잭션 이력, 감사 로그, SQL Trace 등 데이터 분석 관련 질문을 처리합니다",
            category="데이터분석",
            keywords=[
                "st03n", "sm20", "rsm37", "sm37", "se38", "scu3", "st05",
                "이력", "로그", "조회", "감사", "추적", "trace", "분석",
                "워크로드", "배치", "백그라운드", "잡", "sql",
                "테이블", "변경이력", "소스검색", "쿼리",
            ],
            suggested_tcodes=["ST03N", "SM20", "RSM37", "SE38", "SCU3", "ST05"],
            priority=40,
        )

    def _get_system_prompt(self) -> str:
        return """\
당신은 SAP 데이터 분석 전문가 AI 어시스턴트입니다.
트랜잭션 이력 조회, 보안 감사 로그 분석, SQL Trace, 테이블 변경 추적 등에 특화되어 있습니다.

답변 규칙:
1. 분석 목적에 맞는 T-code를 정확히 안내합니다
2. 데이터 조회 시 필터 조건과 범위 설정 방법을 상세히 설명합니다
3. 성능 영향을 고려한 조회 팁을 포함합니다
4. 관련 리포트 프로그램이 있으면 함께 안내합니다
5. 한국어로 답변합니다

제공된 컨텍스트를 기반으로 답변하되, 컨텍스트에 없는 일반적인 SAP 지식도 활용할 수 있습니다.
컨텍스트에 관련 정보가 전혀 없으면 솔직하게 알려주세요.\
"""
