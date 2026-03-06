"""운영 메모리 스토어 — DB 영속 기반 진단 기록/검색.

MCP 서버(동기)와 FastAPI(비동기) 양쪽에서 호출 가능하도록
동기 인터페이스를 유지하되, 내부적으로 DB에 영속한다.
"""

from __future__ import annotations

import logging
import re
from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime
from threading import Lock
from uuid import uuid4

logger = logging.getLogger(__name__)


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
    """인메모리 캐시 + DB 영속 기록을 관리한다.

    인메모리 deque는 빠른 검색용 캐시로 유지하고,
    DB 영속은 _persist_entry()로 비동기 커넥션을 통해 수행한다.
    서버 시작 시 _load_from_db()로 DB → 캐시 복원한다.
    """

    def __init__(self, max_entries: int = 300) -> None:
        self._max_entries = max_entries
        self._entries: deque[MemoryEntry] = deque(maxlen=max_entries)
        self._lock = Lock()
        self._db_initialized = False

    async def load_from_db(self) -> int:
        """DB에서 최근 기록을 로드하여 캐시를 복원한다."""
        try:
            from sqlalchemy import select

            from app.models.database import MemoryEntryRecord, async_session

            async with async_session() as db:
                result = await db.execute(
                    select(MemoryEntryRecord)
                    .order_by(MemoryEntryRecord.created_at.desc())
                    .limit(self._max_entries)
                )
                records = list(reversed(result.scalars().all()))

            with self._lock:
                for r in records:
                    entry = MemoryEntry(
                        id=r.id,
                        kind=r.kind,
                        text=r.text,
                        skill=r.skill,
                        tags=r.tags or [],
                        suggested_tcodes=r.suggested_tcodes or [],
                        created_at=r.created_at.isoformat() if r.created_at else "",
                    )
                    self._entries.append(entry)

            self._db_initialized = True
            return len(records)
        except Exception as exc:
            logger.warning("MemoryStore DB 로드 실패: %s", exc)
            return 0

    async def _persist_entry(self, entry: MemoryEntry) -> None:
        """엔트리를 DB에 저장한다."""
        try:
            from app.models.database import MemoryEntryRecord, async_session

            async with async_session() as db:
                record = MemoryEntryRecord(
                    id=entry.id,
                    kind=entry.kind,
                    text=entry.text,
                    skill=entry.skill,
                    tags=entry.tags,
                    suggested_tcodes=entry.suggested_tcodes,
                )
                db.add(record)
                await db.commit()
        except Exception as exc:
            logger.warning("MemoryStore DB 저장 실패: %s", exc)

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
        self._schedule_persist(entry)
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
        self._schedule_persist(entry)
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

    def _schedule_persist(self, entry: MemoryEntry) -> None:
        """비동기 DB 저장을 스케줄링한다. MCP 동기 컨텍스트에서도 안전."""
        try:
            import anyio.from_thread
            anyio.from_thread.run(self._persist_entry, entry)
        except RuntimeError:
            # 이미 비동기 루프 안이거나 anyio 미사용 환경 → 무시 (인메모리만 유지)
            try:
                import asyncio
                loop = asyncio.get_running_loop()
                loop.create_task(self._persist_entry(entry))
            except RuntimeError:
                pass


_memory_store: MemoryStore | None = None


def get_memory_store() -> MemoryStore:
    global _memory_store
    if _memory_store is None:
        _memory_store = MemoryStore()
    return _memory_store
