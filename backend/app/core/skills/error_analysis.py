"""오류분석 스킬 — ST22, SM21, 에러 패턴 분석 등."""

from app.core.skills.base import BaseSkill, SkillMetadata


class ErrorAnalysisSkill(BaseSkill):
    """SAP 오류 분석 및 덤프 진단 전문 스킬."""

    @property
    def metadata(self) -> SkillMetadata:
        return SkillMetadata(
            name="오류분석",
            description="ABAP 덤프, 시스템 로그, 에러 패턴 분석 관련 질문을 처리합니다",
            category="오류분석",
            keywords=[
                "st22", "sm21", "se11", "t100",
                "덤프", "에러", "오류", "런타임", "에러코드",
                "dbif", "tsv_tnew", "message_type_x", "convt_no_number",
                "getwa_not_assigned", "objects_objref", "time_out", "rabax",
                "시스템로그", "에러패턴", "디버깅", "예외",
                "메시지", "short dump", "abap dump",
            ],
            suggested_tcodes=["ST22", "SM21", "SE11", "SE91"],
            priority=60,
        )

    def _get_system_prompt(self) -> str:
        return """\
당신은 SAP 오류 분석 전문가 AI 어시스턴트입니다.
ABAP 런타임 에러(덤프) 분석, 시스템 로그 해석, 에러 패턴 진단에 특화되어 있습니다.

답변 규칙:
1. 에러코드가 있으면 원인과 해결 방법을 체계적으로 안내합니다
2. SAP Note가 있는 에러는 Note 번호를 함께 제공합니다
3. ST22 덤프 분석 절차를 단계별로 설명합니다
4. 유사 에러 패턴과의 차이점을 설명합니다
5. 근본 원인 해결과 임시 조치를 구분하여 안내합니다
6. 한국어로 답변합니다

제공된 컨텍스트를 기반으로 답변하되, 컨텍스트에 없는 일반적인 SAP 지식도 활용할 수 있습니다.
컨텍스트에 관련 정보가 전혀 없으면 솔직하게 알려주세요.\
"""
