"""RAG 파이프라인 — ChromaDB 벡터 검색 + LLM 응답 생성."""

import asyncio
import json
import logging
import re
from pathlib import Path

import anyio
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings
from app.core.llm_client import (
    generate_chat_response,
    generate_chat_response_stream,
    generate_embedding,
)

logger = logging.getLogger(__name__)

SEED_DATA_PATH = Path(__file__).parent.parent / "data" / "sap_knowledge" / "seed_data.json"
ERROR_PATTERNS_PATH = (
    Path(__file__).parent.parent / "data" / "sap_knowledge" / "error_patterns.json"
)

# ChromaDB 클라이언트 (싱글턴, asyncio.Lock 보호)
# 주의: get_collection이 get_chroma_client를 호출하므로 별도 Lock 사용 (재진입 불가 방지)
_chroma_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None
_chroma_client_lock = asyncio.Lock()
_collection_lock = asyncio.Lock()

COLLECTION_NAME = "sap_knowledge"


async def get_chroma_client() -> chromadb.ClientAPI:
    """ChromaDB 클라이언트를 반환한다. asyncio.Lock으로 초기화 보호."""
    global _chroma_client
    if _chroma_client is not None:
        return _chroma_client
    async with _chroma_client_lock:
        if _chroma_client is None:
            _chroma_client = chromadb.PersistentClient(
                path=settings.chroma_persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
    return _chroma_client


async def get_collection() -> chromadb.Collection:
    """SAP 지식 벡터 컬렉션을 반환한다. asyncio.Lock으로 초기화 보호."""
    global _collection
    if _collection is not None:
        return _collection
    async with _collection_lock:
        if _collection is None:
            client = await get_chroma_client()
            _collection = client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"description": "SAP 운영 지식 벡터 스토어"},
            )
    return _collection


async def index_knowledge_item(
    item_id: str,
    title: str,
    category: str,
    tcode: str | None,
    content: str,
    steps: list[str],
    warnings: list[str],
    tags: list[str],
    program_name: str | None = None,
    source_type: str = "guide",
    error_code: str | None = None,
    sap_note: str | None = None,
    solutions: list[str] | None = None,
) -> None:
    """지식 항목을 ChromaDB에 벡터 인덱싱한다."""
    # 검색 품질을 위해 모든 필드를 하나의 텍스트로 결합
    full_text = _build_document_text(
        title, category, tcode, content, steps, warnings, tags,
        program_name=program_name, source_type=source_type,
        error_code=error_code, sap_note=sap_note, solutions=solutions,
    )

    embedding = await generate_embedding(full_text)

    collection = await get_collection()
    meta = {
        "title": title,
        "category": category,
        "tcode": tcode or "",
        "program_name": program_name or "",
        "source_type": source_type,
        "error_code": error_code or "",
        "sap_note": sap_note or "",
        "tags": json.dumps(tags, ensure_ascii=False),
    }
    await anyio.to_thread.run_sync(
        lambda: collection.upsert(
            ids=[item_id],
            embeddings=[embedding],
            documents=[full_text],
            metadatas=[meta],
        )
    )


def _build_document_text(
    title: str,
    category: str,
    tcode: str | None,
    content: str,
    steps: list[str],
    warnings: list[str],
    tags: list[str],
    program_name: str | None = None,
    source_type: str = "guide",
    error_code: str | None = None,
    sap_note: str | None = None,
    solutions: list[str] | None = None,
) -> str:
    """인덱싱/검색용 통합 문서 텍스트를 생성한다."""
    source_labels = {
        "guide": "운영 가이드",
        "source_code": "소스코드 분석",
        "error_pattern": "에러 패턴",
    }
    parts = [f"제목: {title}", f"카테고리: {category}"]
    if source_type != "guide":
        parts.append(f"유형: {source_labels.get(source_type, source_type)}")
    if tcode:
        parts.append(f"T-code: {tcode}")
    if program_name:
        parts.append(f"프로그램명: {program_name}")
    if error_code:
        parts.append(f"에러코드: {error_code}")
    if sap_note:
        parts.append(f"SAP 노트: {sap_note}")
    parts.append(f"내용: {content}")
    if steps:
        parts.append("실행 절차:\n" + "\n".join(f"  {i+1}. {s}" for i, s in enumerate(steps)))
    if warnings:
        parts.append("주의사항:\n" + "\n".join(f"  - {w}" for w in warnings))
    if solutions:
        parts.append("해결방법:\n" + "\n".join(f"  {i+1}. {s}" for i, s in enumerate(solutions)))
    if tags:
        parts.append(f"태그: {', '.join(tags)}")
    return "\n\n".join(parts)


async def search_knowledge(
    query: str,
    top_k: int = 5,
    category: str | None = None,
    source_type: str | None = None,
) -> list[dict]:
    """사용자 질문과 유사한 지식을 벡터 검색한다."""
    collection = await get_collection()

    # collection.count()는 1회만 호출하여 캐싱
    doc_count = await anyio.to_thread.run_sync(collection.count)
    if doc_count == 0:
        return []

    query_embedding = await generate_embedding(query)

    # ChromaDB $and 조건으로 다중 필터 지원
    where_filter = None
    filters = []
    if category:
        filters.append({"category": category})
    if source_type:
        filters.append({"source_type": source_type})
    if len(filters) == 1:
        where_filter = filters[0]
    elif len(filters) > 1:
        where_filter = {"$and": filters}

    n_results = min(top_k, doc_count)
    results = await anyio.to_thread.run_sync(
        lambda: collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
    )

    search_results = []
    if results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            metadata = results["metadatas"][0][i] if results["metadatas"] else {}
            distance = results["distances"][0][i] if results["distances"] else 0.0
            # ChromaDB distance → relevance score (L2 distance 기준)
            relevance = max(0.0, 1.0 - distance / 2.0)

            search_results.append({
                "id": doc_id,
                "title": metadata.get("title", ""),
                "category": metadata.get("category", ""),
                "tcode": metadata.get("tcode", ""),
                "document": results["documents"][0][i] if results["documents"] else "",
                "relevance_score": round(relevance, 3),
            })

    return search_results


async def hybrid_search_knowledge(
    query: str,
    top_k: int = 5,
    category: str | None = None,
    source_type: str | None = None,
) -> list[dict]:
    """하이브리드 검색: 벡터 유사도 + 키워드 ILIKE 결과를 RRF로 통합한다.

    RRF(Reciprocal Rank Fusion) 알고리즘으로 두 검색 결과의 순위를 결합하여
    키워드 정확 매칭(T-code, 에러코드)과 의미적 유사도 검색의 장점을 모두 취한다.
    asyncio.gather로 벡터+키워드 검색을 병렬 실행하여 검색 지연을 줄인다.
    """
    from app.core.knowledge_base import keyword_search
    from app.models.database import async_session

    async def _keyword_search_wrapper() -> list[dict[str, str | float]]:
        """키워드 검색을 async 래퍼로 감싸 gather 호환."""
        results: list[dict[str, str | float]] = []
        async with async_session() as db:
            kw_items = await keyword_search(db, query, top_k=top_k, category=category, source_type=source_type)
            for item in kw_items:
                results.append({
                    "id": item.id,
                    "title": item.title,
                    "category": item.category,
                    "tcode": item.tcode or "",
                    "document": _build_document_text(
                        item.title, item.category, item.tcode, item.content,
                        item.steps or [], item.warnings or [], item.tags or [],
                        program_name=item.program_name, source_type=item.source_type,
                        error_code=item.error_code, sap_note=item.sap_note,
                        solutions=item.solutions or [],
                    ),
                    "relevance_score": 0.0,  # RRF에서 재계산
                })
        return results

    # 벡터 + 키워드 검색 병렬 실행
    vector_results, keyword_results = await asyncio.gather(
        search_knowledge(query, top_k=top_k, category=category, source_type=source_type),
        _keyword_search_wrapper(),
    )

    # RRF 통합 (k=60)
    rrf_k = 60
    scores: dict[str, float] = {}
    result_map: dict[str, dict[str, str | float]] = {}

    for rank, r in enumerate(vector_results):
        rid = str(r["id"])
        scores[rid] = scores.get(rid, 0.0) + 1.0 / (rrf_k + rank + 1)
        result_map[rid] = r

    for rank, r in enumerate(keyword_results):
        rid = str(r["id"])
        scores[rid] = scores.get(rid, 0.0) + 1.0 / (rrf_k + rank + 1)
        if rid not in result_map:
            result_map[rid] = r

    # RRF 점수로 정렬 후 상위 top_k 반환
    sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)[:top_k]

    merged: list[dict[str, str | float]] = []
    for rid in sorted_ids:
        item = dict(result_map[rid])  # 원본 수정 방지
        item["relevance_score"] = round(scores[rid], 4)
        merged.append(item)

    return merged


def _build_rag_context(
    search_results: list[dict],
    base_tcodes: list[str],
) -> tuple[str, list[dict], list[str]]:
    """RAG 컨텍스트를 구성한다. generate_rag_response/stream 공용 헬퍼.

    Returns:
        (context_text, sources, suggested_tcodes) 튜플
    """
    context_parts: list[str] = []
    sources: list[dict] = []
    suggested_tcodes = list(base_tcodes)

    for result in search_results:
        context_parts.append(result["document"])
        sources.append({
            "title": result["title"],
            "category": result["category"],
            "relevance_score": result["relevance_score"],
        })
        if result["tcode"] and result["tcode"] not in suggested_tcodes:
            suggested_tcodes.append(result["tcode"])

    context = (
        "\n\n---\n\n".join(context_parts)
        if context_parts
        else "관련 자료를 찾지 못했습니다."
    )

    return context, sources, suggested_tcodes


async def generate_rag_response(
    user_message: str,
    chat_history: list[dict[str, str]] | None = None,
    category: str | None = None,
) -> dict:
    """RAG 파이프라인: 스킬 선택 → 벡터 검색 → 컨텍스트 구성 → LLM 응답."""
    from app.core.skills import get_skill_registry

    # 1. 스킬 선택
    registry = get_skill_registry()
    selected_skill = registry.select_skill(user_message)

    # 2. 하이브리드 검색 (벡터 + 키워드 RRF 통합)
    skill_category = selected_skill.metadata.category or None
    search_results = await hybrid_search_knowledge(
        user_message,
        top_k=5,
        category=category or skill_category,
    )

    # 3. 컨텍스트 구성 (공용 헬퍼)
    context, sources, suggested_tcodes = _build_rag_context(
        search_results, list(selected_skill.metadata.suggested_tcodes),
    )

    # 4. 스킬별 시스템 프롬프트로 LLM 응답 생성
    answer = await generate_chat_response(
        user_message, context, chat_history,
        system_prompt=selected_skill.system_prompt,
    )

    return {
        "answer": answer,
        "sources": sources,
        "suggested_tcodes": suggested_tcodes,
        "skill_used": selected_skill.metadata.name,
    }


async def generate_rag_response_stream(
    user_message: str,
    chat_history: list[dict[str, str]] | None = None,
    category: str | None = None,
):
    """RAG 스트리밍 파이프라인: 검색까지는 동일, LLM 호출만 SSE 스트리밍.

    yield 하는 이벤트 형식:
    - {"type": "meta", "sources": [...], "suggested_tcodes": [...], "skill_used": str}
    - {"type": "token", "content": str}
    - {"type": "done"}
    """
    from app.core.skills import get_skill_registry

    # 1. 스킬 선택
    registry = get_skill_registry()
    selected_skill = registry.select_skill(user_message)

    # 2. 하이브리드 검색 (벡터 + 키워드 RRF 통합)
    skill_category = selected_skill.metadata.category or None
    search_results = await hybrid_search_knowledge(
        user_message,
        top_k=5,
        category=category or skill_category,
    )

    # 3. 컨텍스트 구성 (공용 헬퍼)
    context, sources, suggested_tcodes = _build_rag_context(
        search_results, list(selected_skill.metadata.suggested_tcodes),
    )

    # 4. 메타데이터 이벤트를 먼저 전송
    yield {
        "type": "meta",
        "sources": sources,
        "suggested_tcodes": suggested_tcodes,
        "skill_used": selected_skill.metadata.name,
    }

    # 5. LLM 스트리밍 응답 (async generator는 await 없이 직접 호출)
    async for token in generate_chat_response_stream(
        user_message, context, chat_history,
        system_prompt=selected_skill.system_prompt,
    ):
        yield {"type": "token", "content": token}

    yield {"type": "done"}


async def initialize_vector_store() -> int:
    """시드 데이터를 ChromaDB에 초기 인덱싱한다."""
    collection = await get_collection()

    if await anyio.to_thread.run_sync(collection.count) > 0:
        return 0

    # 시드 데이터 + 에러 패턴 데이터 병합 로드
    all_items = []
    with open(SEED_DATA_PATH, encoding="utf-8") as f:
        all_items.extend(json.load(f))
    if ERROR_PATTERNS_PATH.exists():
        with open(ERROR_PATTERNS_PATH, encoding="utf-8") as f:
            all_items.extend(json.load(f))

    indexed = 0
    failed = 0
    for item in all_items:
        item_id = f"seed_{indexed}"
        full_text = _build_document_text(
            title=item["title"],
            category=item["category"],
            tcode=item.get("tcode"),
            content=item["content"],
            steps=item.get("steps", []),
            warnings=item.get("warnings", []),
            tags=item.get("tags", []),
            source_type=item.get("source_type", "guide"),
            error_code=item.get("error_code"),
            sap_note=item.get("sap_note"),
            solutions=item.get("solutions"),
        )

        try:
            embedding = await generate_embedding(full_text)
            meta = {
                "title": item["title"],
                "category": item["category"],
                "tcode": item.get("tcode", ""),
                "source_type": item.get("source_type", "guide"),
                "error_code": item.get("error_code", ""),
                "sap_note": item.get("sap_note", ""),
                "tags": json.dumps(item.get("tags", []), ensure_ascii=False),
            }
            await anyio.to_thread.run_sync(
                lambda: collection.upsert(
                    ids=[item_id],
                    embeddings=[embedding],
                    documents=[full_text],
                    metadatas=[meta],
                )
            )
            indexed += 1
        except Exception as exc:
            logger.warning("벡터 인덱싱 실패 (title=%s): %s", item.get("title", "?"), exc)
            failed += 1
            continue

    if indexed == 0 and len(all_items) > 0:
        logger.error("벡터 스토어 초기화 실패: %d건 중 0건 인덱싱됨", len(all_items))
    elif failed > 0:
        logger.warning("벡터 스토어 초기화 부분 성공: %d건 인덱싱, %d건 실패", indexed, failed)

    return indexed


async def remove_from_vector_store(item_id: str) -> None:
    """벡터 스토어에서 항목을 삭제한다."""
    collection = await get_collection()
    try:
        await anyio.to_thread.run_sync(lambda: collection.delete(ids=[item_id]))
    except Exception as exc:
        logger.warning("벡터 스토어 항목 삭제 실패 (id=%s): %s", item_id, exc)


def extract_tcodes_from_text(text: str) -> list[str]:
    """텍스트에서 SAP T-code 패턴을 추출한다."""
    # \b는 한국어 문자 경계에서 작동하지 않으므로 lookbehind/lookahead 사용
    tcode_patterns = (
        r"S[A-Z]\d{2,3}[A-Z]?|SE\d{2}|SM\d{2}|ST\d{2}[A-Z]?"
        r"|SU\d{2}|STMS|PFCG|RSM\d{2}|SCU\d|RZ\d{2}"
    )
    pattern = rf"(?<![A-Z0-9])({tcode_patterns})(?![A-Z0-9])"
    matches = re.findall(pattern, text.upper())
    return list(dict.fromkeys(matches))  # 중복 제거, 순서 유지
