"""MCP 서버 — Claude Code 연동을 위한 SAP Ops Bot MCP 인터페이스.

stdio 기반으로 동작하며, 6개 Tools + 4개 Resources를 제공한다.
실행: python -m app.mcp_server
"""

import json
import logging
from pathlib import Path

from mcp.server.fastmcp import FastMCP

from app.core.memory_store import get_memory_store

logger = logging.getLogger(__name__)

# MCP 서버 인스턴스
mcp = FastMCP(
    "sap-ops-bot",
    instructions="SAP 운영 자동화 AI 봇 — 에러 패턴 카탈로그, 스킬 라우팅, 지식 검색",
)

# 데이터 경로
DATA_DIR = Path(__file__).parent / "data" / "sap_knowledge"
SEED_DATA_PATH = DATA_DIR / "seed_data.json"
ERROR_PATTERNS_PATH = DATA_DIR / "error_patterns.json"


def _load_json(path: Path) -> list[dict]:
    """JSON 파일을 로드한다."""
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _get_all_knowledge() -> list[dict]:
    """모든 지식 항목을 반환한다."""
    items = _load_json(SEED_DATA_PATH)
    items.extend(_load_json(ERROR_PATTERNS_PATH))
    return items


# ── MCP Tools ──────────────────────────────────────


def _keyword_search(query: str, source_type: str | None, top_k: int) -> list[tuple[float, dict]]:
    """키워드 기반 폴백 검색."""
    items = _get_all_knowledge()
    query_lower = query.lower()

    scored = []
    for item in items:
        if source_type and item.get("source_type", "guide") != source_type:
            continue

        searchable = " ".join([
            item.get("title", ""),
            item.get("content", ""),
            item.get("error_code", ""),
            item.get("tcode", ""),
            " ".join(item.get("tags", [])),
        ]).lower()

        words = query_lower.split()
        matched = sum(1 for w in words if w in searchable)
        if matched > 0:
            scored.append((matched / len(words), item))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:top_k]


def _format_search_results(results: list[tuple[float, dict]]) -> str:
    """검색 결과를 마크다운 형식으로 포맷한다."""
    if not results:
        return "관련 지식을 찾지 못했습니다."

    parts = []
    for _score, item in results:
        entry = f"## {item['title']}"
        if item.get("tcode"):
            entry += f" (T-code: {item['tcode']})"
        entry += f"\n카테고리: {item['category']}"
        if item.get("error_code"):
            entry += f" | 에러코드: {item['error_code']}"
        if item.get("sap_note"):
            entry += f" | SAP Note: {item['sap_note']}"
        entry += f"\n\n{item['content']}"
        if item.get("steps"):
            entry += "\n\n**실행 절차:**\n" + "\n".join(
                f"{i+1}. {s}" for i, s in enumerate(item["steps"])
            )
        if item.get("solutions"):
            entry += "\n\n**해결 방법:**\n" + "\n".join(
                f"{i+1}. {s}" for i, s in enumerate(item["solutions"])
            )
        if item.get("warnings"):
            entry += "\n\n**주의사항:**\n" + "\n".join(
                f"- {w}" for w in item["warnings"]
            )
        parts.append(entry)

    return "\n\n---\n\n".join(parts)


@mcp.tool()
def search_knowledge(
    query: str,
    source_type: str | None = None,
    top_k: int = 5,
) -> str:
    """SAP 운영 지식을 벡터 유사도 기반으로 검색합니다.

    벡터 검색이 불가능한 경우 키워드 매칭으로 폴백합니다.

    Args:
        query: 검색 키워드 (예: "ST22 덤프", "메모리 부족", "CTS 전송")
        source_type: 소스 유형 필터 (guide, source_code, error_pattern)
        top_k: 반환할 최대 결과 수 (기본값: 5)
    """
    # 하이브리드 검색 시도 (벡터 + 키워드 RRF 통합)
    try:
        import anyio.from_thread

        from app.core.rag_engine import hybrid_search_knowledge

        hybrid_results = anyio.from_thread.run(
            hybrid_search_knowledge, query, top_k, None, source_type,
        )
        if hybrid_results:
            parts = []
            for r in hybrid_results:
                entry = f"## {r['title']}"
                if r.get("tcode"):
                    entry += f" (T-code: {r['tcode']})"
                entry += f"\n카테고리: {r['category']}"
                entry += f" | RRF 점수: {r['relevance_score']}"
                entry += f"\n\n{r['document']}"
                parts.append(entry)
            return "\n\n---\n\n".join(parts)
    except Exception as exc:
        logger.debug("하이브리드 검색 폴백 → 키워드 검색: %s", exc)

    # 키워드 폴백
    results = _keyword_search(query, source_type, top_k)
    return _format_search_results(results)


@mcp.tool()
def get_error_pattern(error_code: str) -> str:
    """SAP 에러코드로 에러 패턴을 직접 조회합니다.

    Args:
        error_code: SAP 에러코드 (예: DBIF_RSQL_SQL_ERROR, TSV_TNEW_PAGE_ALLOC_FAILED)
    """
    patterns = _load_json(ERROR_PATTERNS_PATH)
    code_upper = error_code.upper()

    for pattern in patterns:
        if pattern.get("error_code", "").upper() == code_upper:
            result = f"# {pattern['title']}\n\n"
            result += f"**에러코드:** {pattern['error_code']}\n"
            if pattern.get("sap_note"):
                result += f"**SAP Note:** {pattern['sap_note']}\n"
            if pattern.get("tcode"):
                result += f"**T-code:** {pattern['tcode']}\n"
            result += f"\n{pattern['content']}\n"

            if pattern.get("steps"):
                result += "\n## 분석 절차\n" + "\n".join(
                    f"{i+1}. {s}" for i, s in enumerate(pattern["steps"])
                )

            if pattern.get("solutions"):
                result += "\n\n## 해결 방법\n" + "\n".join(
                    f"{i+1}. {s}" for i, s in enumerate(pattern["solutions"])
                )

            if pattern.get("warnings"):
                result += "\n\n## 주의사항\n" + "\n".join(
                    f"- {w}" for w in pattern["warnings"]
                )

            return result

    return f"에러코드 '{error_code}'에 대한 패턴을 찾을 수 없습니다."


@mcp.tool()
def suggest_tcode(topic: str) -> str:
    """주제에 관련된 SAP T-code를 추천합니다.

    Args:
        topic: T-code를 찾고 싶은 주제 (예: "덤프 분석", "권한 관리", "배치 잡")
    """
    items = _get_all_knowledge()
    topic_lower = topic.lower()

    tcodes: dict[str, str] = {}
    for item in items:
        tcode = item.get("tcode")
        if not tcode:
            continue

        searchable = " ".join([
            item.get("title", ""),
            item.get("content", ""),
            " ".join(item.get("tags", [])),
        ]).lower()

        words = topic_lower.split()
        if any(w in searchable for w in words):
            if tcode not in tcodes:
                tcodes[tcode] = item["title"]

    if not tcodes:
        return f"'{topic}' 주제에 관련된 T-code를 찾지 못했습니다."

    lines = [f"**'{topic}' 관련 T-code 추천:**\n"]
    for tcode, title in tcodes.items():
        lines.append(f"- **{tcode}**: {title}")
    return "\n".join(lines)


@mcp.tool()
def diagnose_problem(problem_description: str) -> str:
    """SAP 운영 문제를 진단하고 해결 방안을 제시합니다.

    스킬 라우팅을 통해 적절한 전문 영역을 선택하고,
    관련 지식을 종합하여 진단 결과를 반환합니다.

    Args:
        problem_description: 문제 상황 설명 (예: "DBIF_RSQL_SQL_ERROR 덤프가 반복 발생")
    """
    from app.core.skills import get_skill_registry

    # 스킬 선택
    registry = get_skill_registry()
    ranked = registry.rank_skills(problem_description)
    skill = ranked[0]["skill"]
    score = ranked[0]["score"]
    memory_store = get_memory_store()

    # 에러코드 직접 매칭 시도
    patterns = _load_json(ERROR_PATTERNS_PATH)
    desc_upper = problem_description.upper()
    matched_pattern = None
    for p in patterns:
        if p.get("error_code", "").upper() in desc_upper:
            matched_pattern = p
            break

    # 키워드 검색
    knowledge_result = search_knowledge(
        problem_description, top_k=3
    )
    memory_hits = memory_store.search(problem_description, top_k=3)

    # 진단 결과 구성
    result = "# SAP 문제 진단\n\n"
    result += f"**진단 스킬:** {skill.metadata.name} (score={score:.2f})\n"

    if skill.metadata.suggested_tcodes:
        result += "**관련 T-code:** "
        result += ", ".join(skill.metadata.suggested_tcodes) + "\n"

    if matched_pattern:
        result += "\n## 에러 패턴 매칭\n\n"
        result += f"**{matched_pattern['title']}**\n"
        result += f"{matched_pattern['content']}\n"
        if matched_pattern.get("solutions"):
            result += "\n**해결 방법:**\n" + "\n".join(
                f"{i+1}. {s}"
                for i, s in enumerate(matched_pattern["solutions"])
            )
        result += "\n"

    if memory_hits:
        result += "\n## 유사 최근 메모리\n\n"
        for i, entry in enumerate(memory_hits, start=1):
            result += f"{i}. {entry.created_at} | {entry.kind}"
            if entry.skill:
                result += f" | {entry.skill}"
            result += f"\n   - {entry.text}\n"

    result += f"\n## 관련 지식\n\n{knowledge_result}"

    tags: list[str] = []
    if matched_pattern and matched_pattern.get("error_code"):
        tags.append(str(matched_pattern["error_code"]))
    memory_store.add_diagnosis(
        problem_description=problem_description,
        skill_name=skill.metadata.name,
        suggested_tcodes=skill.metadata.suggested_tcodes,
        tags=tags,
    )

    return result


@mcp.tool()
def remember_note(note: str, tags: str | None = None) -> str:
    """운영 메모를 저장합니다.

    Args:
        note: 저장할 메모 내용
        tags: 쉼표(,)로 구분된 태그 문자열 (예: "긴급,운영")
    """
    parsed_tags = [tag.strip() for tag in (tags or "").split(",") if tag.strip()]
    entry = get_memory_store().add_note(note, parsed_tags)
    return f"메모 저장 완료: {entry.id} ({entry.created_at})"


@mcp.tool()
def search_memory(query: str, top_k: int = 5) -> str:
    """저장된 운영 메모리를 검색합니다.

    Args:
        query: 검색어
        top_k: 최대 결과 수
    """
    hits = get_memory_store().search(query, top_k=top_k)
    if not hits:
        return "메모리 검색 결과가 없습니다."

    lines = ["# 메모리 검색 결과\n"]
    for i, entry in enumerate(hits, start=1):
        header = f"{i}. [{entry.kind}] {entry.created_at}"
        if entry.skill:
            header += f" | skill={entry.skill}"
        lines.append(header)
        lines.append(f"- {entry.text}")
        if entry.tags:
            lines.append(f"- tags: {', '.join(entry.tags)}")
        if entry.suggested_tcodes:
            lines.append(f"- tcodes: {', '.join(entry.suggested_tcodes)}")
        lines.append("")

    return "\n".join(lines)


# ── MCP Resources ──────────────────────────────────


@mcp.resource("sap://skills")
def get_skills_resource() -> str:
    """사용 가능한 SAP 전문 스킬 목록을 반환합니다."""
    from app.core.skills import get_skill_registry

    registry = get_skill_registry()
    skills = registry.list_skills()

    lines = ["# SAP Ops Bot — 사용 가능한 스킬\n"]
    for s in skills:
        lines.append(f"## {s['name']}")
        lines.append(f"{s['description']}")
        if s["suggested_tcodes"]:
            lines.append(f"관련 T-code: {', '.join(s['suggested_tcodes'])}")
        lines.append("")

    return "\n".join(lines)


@mcp.resource("sap://knowledge/categories")
def get_categories_resource() -> str:
    """지식 카테고리 목록을 반환합니다."""
    items = _get_all_knowledge()

    categories: dict[str, int] = {}
    for item in items:
        cat = item["category"]
        categories[cat] = categories.get(cat, 0) + 1

    lines = ["# SAP 지식 카테고리\n"]
    for cat, count in sorted(categories.items()):
        lines.append(f"- **{cat}**: {count}개 항목")

    return "\n".join(lines)


@mcp.resource("sap://error-catalog")
def get_error_catalog_resource() -> str:
    """에러 패턴 카탈로그를 반환합니다."""
    patterns = _load_json(ERROR_PATTERNS_PATH)

    lines = ["# SAP 에러 패턴 카탈로그\n"]
    for p in patterns:
        note = f" (SAP Note: {p['sap_note']})" if p.get("sap_note") else ""
        lines.append(f"- **{p['error_code']}**: {p['title']}{note}")

    lines.append(f"\n총 {len(patterns)}개 에러 패턴 등록")
    return "\n".join(lines)


@mcp.resource("sap://memory/recent")
def get_memory_recent_resource() -> str:
    """최근 저장된 운영 메모리를 반환합니다."""
    entries = get_memory_store().recent(limit=20)
    if not entries:
        return "# SAP 운영 메모리\n\n저장된 메모가 없습니다."

    lines = ["# SAP 운영 메모리 (최근 20건)\n"]
    for entry in entries:
        line = f"- [{entry.kind}] {entry.created_at}"
        if entry.skill:
            line += f" | {entry.skill}"
        line += f" | {entry.text}"
        if entry.tags:
            line += f" | tags={','.join(entry.tags)}"
        lines.append(line)

    return "\n".join(lines)


# ── 엔트리포인트 ──────────────────────────────────

if __name__ == "__main__":
    mcp.run(transport="stdio")
