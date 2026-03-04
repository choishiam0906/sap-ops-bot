"""운영 메모리 스토어 — MCP 진단 기록/검색용 경량 메모리."""

from __future__ import annotations

import re
from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime
from threading import Lock
from uuid import uuid4


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9가-힣_]+", text.lower()))


@dataclass(frozen=True)
class MemoryEntry:
    id: str
    kind: str
    text: str
    skill: str | None
    tags: list[str]
    suggested_tcodes: list[str]
    created_at: str


class MemoryStore:
    """프로세스 메모리 내 최근 기록을 관리한다."""

    def __init__(self, max_entries: int = 300) -> None:
        self._max_entries = max_entries
        self._entries: deque[MemoryEntry] = deque(maxlen=max_entries)
        self._lock = Lock()

    def add_diagnosis(
        self,
        problem_description: str,
        skill_name: str,
        suggested_tcodes: list[str] | None = None,
        tags: list[str] | None = None,
    ) -> MemoryEntry:
        entry = MemoryEntry(
            id=str(uuid4()),
            kind="diagnosis",
            text=problem_description.strip(),
            skill=skill_name,
            tags=tags or [],
            suggested_tcodes=suggested_tcodes or [],
            created_at=datetime.now(UTC).isoformat(),
        )
        with self._lock:
            self._entries.append(entry)
        return entry

    def add_note(self, note: str, tags: list[str] | None = None) -> MemoryEntry:
        entry = MemoryEntry(
            id=str(uuid4()),
            kind="note",
            text=note.strip(),
            skill=None,
            tags=tags or [],
            suggested_tcodes=[],
            created_at=datetime.now(UTC).isoformat(),
        )
        with self._lock:
            self._entries.append(entry)
        return entry

    def recent(self, limit: int = 10) -> list[MemoryEntry]:
        safe_limit = max(1, min(limit, 100))
        with self._lock:
            entries = list(self._entries)
        return list(reversed(entries[-safe_limit:]))

    def search(self, query: str, top_k: int = 5) -> list[MemoryEntry]:
        tokens = _tokenize(query)
        if not tokens:
            return []

        with self._lock:
            entries = list(self._entries)

        scored: list[tuple[float, MemoryEntry]] = []
        for entry in entries:
            haystack = " ".join([entry.text, entry.skill or "", " ".join(entry.tags)])
            entry_tokens = _tokenize(haystack)
            if not entry_tokens:
                continue
            overlap = tokens.intersection(entry_tokens)
            if not overlap:
                continue
            score = len(overlap) / len(tokens)
            scored.append((score, entry))

        scored.sort(key=lambda item: (item[0], item[1].created_at), reverse=True)
        return [entry for _, entry in scored[: max(1, min(top_k, 20))]]


_memory_store: MemoryStore | None = None


def get_memory_store() -> MemoryStore:
    global _memory_store
    if _memory_store is None:
        _memory_store = MemoryStore()
    return _memory_store
