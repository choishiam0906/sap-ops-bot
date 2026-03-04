"""일반 스킬 — 특정 도메인에 매칭되지 않는 질문의 폴백."""

from app.core.skills.base import BaseSkill, SkillMetadata


class GeneralSkill(BaseSkill):
    """일반 SAP 운영 질문 처리 폴백 스킬."""

    @property
    def metadata(self) -> SkillMetadata:
        return SkillMetadata(
            name="일반",
            description="특정 도메인에 해당하지 않는 일반적인 SAP 운영 질문을 처리합니다",
            category="",
            keywords=[],
            suggested_tcodes=[],
            priority=0,
        )

    def matches(self, query: str) -> float:
        """항상 0.1을 반환하여 폴백 역할을 한다."""
        return 0.1

    def _get_system_prompt(self) -> str:
        return """\
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
