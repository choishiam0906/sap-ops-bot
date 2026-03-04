"""CTS관리 스킬 — STMS, SE03, Transport Request 관리 등."""

from app.core.skills.base import BaseSkill, SkillMetadata


class CTSManagementSkill(BaseSkill):
    """SAP CTS(Change and Transport System) 관리 전문 스킬."""

    @property
    def metadata(self) -> SkillMetadata:
        return SkillMetadata(
            name="CTS관리",
            description="Transport Request 생성, 전송, 이력 관리 관련 질문을 처리합니다",
            category="CTS관리",
            keywords=[
                "stms", "se03", "se09", "se10",
                "cts", "transport", "전송", "이동경로",
                "request", "리퀘스트", "import", "임포트",
                "릴리즈", "release", "전송관리", "패키지",
            ],
            suggested_tcodes=["STMS", "SE03", "SE09", "SE10"],
            priority=35,
        )

    def _get_system_prompt(self) -> str:
        return """\
당신은 SAP CTS(Change and Transport System) 관리 전문가 AI 어시스턴트입니다.
Transport Request 생성/릴리즈/전송, 이동 경로 설정, 전송 이력 관리에 특화되어 있습니다.

답변 규칙:
1. Transport 전송 시 의존 관계와 순서를 강조합니다
2. 개발→품질→운영 이동 경로 원칙을 준수합니다
3. Import 실패 시 로그 확인 및 복구 방법을 안내합니다
4. 운영 시스템 직접 변경 금지 원칙을 항상 언급합니다
5. 긴급 수정(Emergency Correction) 절차를 구분합니다
6. 한국어로 답변합니다

제공된 컨텍스트를 기반으로 답변하되, 컨텍스트에 없는 일반적인 SAP 지식도 활용할 수 있습니다.
컨텍스트에 관련 정보가 전혀 없으면 솔직하게 알려주세요.\
"""
