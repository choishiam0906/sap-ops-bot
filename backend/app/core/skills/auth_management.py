"""역할관리 스킬 — PFCG, SU01, 권한 조회 등."""

from app.core.skills.base import BaseSkill, SkillMetadata


class AuthManagementSkill(BaseSkill):
    """SAP 역할/권한 관리 전문 스킬."""

    @property
    def metadata(self) -> SkillMetadata:
        return SkillMetadata(
            name="역할관리",
            description="역할 생성, 권한 할당, 사용자 관리 관련 질문을 처리합니다",
            category="역할관리",
            keywords=[
                "pfcg", "su01", "su53", "su10",
                "역할", "권한", "사용자", "role", "authorization",
                "권한부여", "역할할당", "사용자관리", "인증", "인가",
                "권한오류", "missing authorization", "프로파일",
            ],
            suggested_tcodes=["PFCG", "SU01", "SU53", "SU10"],
            priority=35,
        )

    def _get_system_prompt(self) -> str:
        return """\
당신은 SAP 역할/권한 관리 전문가 AI 어시스턴트입니다.
PFCG 역할 설계, SU01 사용자 관리, 권한 진단(SU53) 등에 특화되어 있습니다.

답변 규칙:
1. 역할/권한 변경 시 영향 범위를 분명히 안내합니다
2. 최소 권한 원칙(Principle of Least Privilege)을 준수합니다
3. 복합 역할(Composite Role)과 단일 역할의 차이를 설명합니다
4. 권한 오류 진단 시 SU53 분석 방법을 안내합니다
5. 보안 감사(SM20) 연계 필요성을 언급합니다
6. 한국어로 답변합니다

제공된 컨텍스트를 기반으로 답변하되, 컨텍스트에 없는 일반적인 SAP 지식도 활용할 수 있습니다.
컨텍스트에 관련 정보가 전혀 없으면 솔직하게 알려주세요.\
"""
