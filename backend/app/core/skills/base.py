"""BaseSkill 추상 클래스 — 모든 도메인 스킬의 공통 인터페이스."""

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True)
class SkillMetadata:
    """스킬의 메타데이터."""

    name: str
    description: str
    category: str
    keywords: list[str] = field(default_factory=list)
    suggested_tcodes: list[str] = field(default_factory=list)
    priority: int = 0


class BaseSkill(ABC):
    """도메인 스킬 추상 베이스 클래스."""

    @property
    @abstractmethod
    def metadata(self) -> SkillMetadata:
        """스킬 메타데이터를 반환한다."""

    @property
    def system_prompt(self) -> str:
        """스킬별 LLM 시스템 프롬프트를 반환한다."""
        return self._get_system_prompt()

    @abstractmethod
    def _get_system_prompt(self) -> str:
        """스킬 전용 시스템 프롬프트를 구성한다."""

    def matches(self, query: str) -> float:
        """질문과의 매칭 점수를 반환한다 (0.0~1.0)."""
        query_lower = query.lower()
        query_tokens = set(re.findall(r"[a-z0-9가-힣_]+", query_lower))

        contains_matched = 0
        token_matched = 0
        for kw in self.metadata.keywords:
            kw_lower = kw.lower()
            if kw_lower in query_lower:
                contains_matched += 1
            kw_tokens = set(re.findall(r"[a-z0-9가-힣_]+", kw_lower))
            if kw_tokens and kw_tokens.issubset(query_tokens):
                token_matched += 1

        matched = max(contains_matched, token_matched)
        if matched <= 0:
            return 0.0
        # 포함 매칭을 조금 더 강하게 반영한다.
        raw = 0.2 + contains_matched * 0.2 + token_matched * 0.1
        return min(1.0, raw)
