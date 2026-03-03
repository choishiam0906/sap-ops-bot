"""RAG 파이프라인 — ChromaDB 벡터 검색 + LLM 응답 생성."""

import json
import re
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings
from app.core.llm_client import generate_chat_response, generate_embedding

SEED_DATA_PATH = Path(__file__).parent.parent / "data" / "sap_knowledge" / "seed_data.json"

# ChromaDB 클라이언트 (싱글턴)
_chroma_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None

COLLECTION_NAME = "sap_knowledge"


def get_chroma_client() -> chromadb.ClientAPI:
    """ChromaDB 클라이언트를 반환한다."""
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client


def get_collection() -> chromadb.Collection:
    """SAP 지식 벡터 컬렉션을 반환한다."""
    global _collection
    if _collection is None:
        client = get_chroma_client()
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
) -> None:
    """지식 항목을 ChromaDB에 벡터 인덱싱한다."""
    # 검색 품질을 위해 모든 필드를 하나의 텍스트로 결합
    full_text = _build_document_text(title, category, tcode, content, steps, warnings, tags)

    embedding = await generate_embedding(full_text)

    collection = get_collection()
    collection.upsert(
        ids=[item_id],
        embeddings=[embedding],
        documents=[full_text],
        metadatas=[{
            "title": title,
            "category": category,
            "tcode": tcode or "",
            "tags": json.dumps(tags, ensure_ascii=False),
        }],
    )


def _build_document_text(
    title: str,
    category: str,
    tcode: str | None,
    content: str,
    steps: list[str],
    warnings: list[str],
    tags: list[str],
) -> str:
    """인덱싱/검색용 통합 문서 텍스트를 생성한다."""
    parts = [f"제목: {title}", f"카테고리: {category}"]
    if tcode:
        parts.append(f"T-code: {tcode}")
    parts.append(f"내용: {content}")
    if steps:
        parts.append("실행 절차:\n" + "\n".join(f"  {i+1}. {s}" for i, s in enumerate(steps)))
    if warnings:
        parts.append("주의사항:\n" + "\n".join(f"  - {w}" for w in warnings))
    if tags:
        parts.append(f"태그: {', '.join(tags)}")
    return "\n\n".join(parts)


async def search_knowledge(
    query: str,
    top_k: int = 5,
    category: str | None = None,
) -> list[dict]:
    """사용자 질문과 유사한 지식을 벡터 검색한다."""
    collection = get_collection()

    # 컬렉션이 비어있으면 빈 결과 반환
    if collection.count() == 0:
        return []

    query_embedding = await generate_embedding(query)

    where_filter = None
    if category:
        where_filter = {"category": category}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        where=where_filter,
        include=["documents", "metadatas", "distances"],
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


async def generate_rag_response(
    user_message: str,
    chat_history: list[dict[str, str]] | None = None,
    category: str | None = None,
) -> dict:
    """RAG 파이프라인: 벡터 검색 → 컨텍스트 구성 → LLM 응답."""
    # 1. 벡터 검색
    search_results = await search_knowledge(user_message, top_k=5, category=category)

    # 2. 컨텍스트 구성
    context_parts = []
    sources = []
    suggested_tcodes = []

    for result in search_results:
        if result["relevance_score"] > 0.3:  # 관련성 임계값
            context_parts.append(result["document"])
            sources.append({
                "title": result["title"],
                "category": result["category"],
                "relevance_score": result["relevance_score"],
            })
            if result["tcode"] and result["tcode"] not in suggested_tcodes:
                suggested_tcodes.append(result["tcode"])

    context = "\n\n---\n\n".join(context_parts) if context_parts else "관련 자료를 찾지 못했습니다."

    # 3. LLM 응답 생성
    answer = await generate_chat_response(user_message, context, chat_history)

    return {
        "answer": answer,
        "sources": sources,
        "suggested_tcodes": suggested_tcodes,
    }


async def initialize_vector_store() -> int:
    """시드 데이터를 ChromaDB에 초기 인덱싱한다."""
    collection = get_collection()

    if collection.count() > 0:
        return 0

    with open(SEED_DATA_PATH, encoding="utf-8") as f:
        seed_items = json.load(f)

    indexed = 0
    for item in seed_items:
        item_id = f"seed_{indexed}"
        full_text = _build_document_text(
            title=item["title"],
            category=item["category"],
            tcode=item.get("tcode"),
            content=item["content"],
            steps=item.get("steps", []),
            warnings=item.get("warnings", []),
            tags=item.get("tags", []),
        )

        try:
            embedding = await generate_embedding(full_text)
            collection.upsert(
                ids=[item_id],
                embeddings=[embedding],
                documents=[full_text],
                metadatas=[{
                    "title": item["title"],
                    "category": item["category"],
                    "tcode": item.get("tcode", ""),
                    "tags": json.dumps(item.get("tags", []), ensure_ascii=False),
                }],
            )
            indexed += 1
        except Exception:
            # Azure OpenAI 연결 실패 시 스킵 (개발 환경)
            continue

    return indexed


def remove_from_vector_store(item_id: str) -> None:
    """벡터 스토어에서 항목을 삭제한다."""
    collection = get_collection()
    try:
        collection.delete(ids=[item_id])
    except Exception:
        pass


def extract_tcodes_from_text(text: str) -> list[str]:
    """텍스트에서 SAP T-code 패턴을 추출한다."""
    # SAP T-code 패턴: 대문자+숫자 조합, 또는 알려진 T-code
    pattern = r"\b(S[A-Z]\d{2,3}[A-Z]?|SE\d{2}|SM\d{2}|ST\d{2}[A-Z]?|SU\d{2}|STMS|PFCG|RSM\d{2}|SCU\d|RZ\d{2})\b"
    matches = re.findall(pattern, text.upper())
    return list(dict.fromkeys(matches))  # 중복 제거, 순서 유지
