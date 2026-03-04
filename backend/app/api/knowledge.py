"""지식 베이스 API — SAP 운영 지식 CRUD 엔드포인트."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.knowledge_base import (
    create_knowledge,
    create_many_knowledge,
    delete_knowledge,
    get_all_knowledge,
    get_knowledge_by_id,
    update_knowledge,
)
from app.core.rag_engine import index_knowledge_item, remove_from_vector_store
from app.models.database import get_db
from app.models.schemas import (
    KnowledgeBase,
    KnowledgeBulkCreateRequest,
    KnowledgeBulkCreateResponse,
    KnowledgeCreate,
    KnowledgeListResponse,
    KnowledgeUpdate,
)

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])


@router.get("", response_model=KnowledgeListResponse)
async def list_knowledge(
    category: str | None = Query(None, description="카테고리 필터"),
    source_type: str | None = Query(None, description="소스유형 필터 (guide, source_code, error_pattern)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeListResponse:
    """지식 목록을 조회한다."""
    items, total = await get_all_knowledge(
        db,
        category=category,
        source_type=source_type,
        page=page,
        page_size=page_size,
    )
    return KnowledgeListResponse(
        items=[_to_schema(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{item_id}", response_model=KnowledgeBase)
async def get_knowledge(
    item_id: str,
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBase:
    """ID로 지식 항목을 조회한다."""
    item = await get_knowledge_by_id(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="지식 항목을 찾을 수 없습니다")
    return _to_schema(item)


@router.post("", response_model=KnowledgeBase, status_code=201)
async def add_knowledge(
    data: KnowledgeCreate,
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBase:
    """새 지식 항목을 추가한다."""
    item = await create_knowledge(db, data)

    # 벡터 스토어에도 인덱싱
    try:
        await index_knowledge_item(
            item_id=item.id,
            title=item.title,
            category=item.category,
            tcode=item.tcode,
            content=item.content,
            steps=item.steps,
            warnings=item.warnings,
            tags=item.tags,
            program_name=item.program_name,
            source_type=item.source_type,
            error_code=item.error_code,
            sap_note=item.sap_note,
            solutions=item.solutions,
        )
    except Exception:
        pass  # 벡터 인덱싱 실패 시에도 DB 저장은 유지

    return _to_schema(item)


@router.post("/bulk", response_model=KnowledgeBulkCreateResponse, status_code=201)
async def add_knowledge_bulk(
    payload: KnowledgeBulkCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBulkCreateResponse:
    """지식 항목을 일괄 추가한다."""
    items = await create_many_knowledge(db, payload.items)

    for item in items:
        try:
            await index_knowledge_item(
                item_id=item.id,
                title=item.title,
                category=item.category,
                tcode=item.tcode,
                content=item.content,
                steps=item.steps,
                warnings=item.warnings,
                tags=item.tags,
                program_name=item.program_name,
                source_type=item.source_type,
                error_code=item.error_code,
                sap_note=item.sap_note,
                solutions=item.solutions,
            )
        except Exception:
            # 벡터 인덱싱 실패 시에도 DB 저장은 유지
            continue

    return KnowledgeBulkCreateResponse(
        created=len(items),
        items=[_to_schema(item) for item in items],
    )


@router.put("/{item_id}", response_model=KnowledgeBase)
async def edit_knowledge(
    item_id: str,
    data: KnowledgeUpdate,
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBase:
    """기존 지식 항목을 수정한다."""
    item = await update_knowledge(db, item_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="지식 항목을 찾을 수 없습니다")

    # 벡터 스토어 재인덱싱
    try:
        await index_knowledge_item(
            item_id=item.id,
            title=item.title,
            category=item.category,
            tcode=item.tcode,
            content=item.content,
            steps=item.steps,
            warnings=item.warnings,
            tags=item.tags,
            program_name=item.program_name,
            source_type=item.source_type,
            error_code=item.error_code,
            sap_note=item.sap_note,
            solutions=item.solutions,
        )
    except Exception:
        pass

    return _to_schema(item)


@router.delete("/{item_id}", status_code=204)
async def remove_knowledge(
    item_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """지식 항목을 삭제한다."""
    success = await delete_knowledge(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="지식 항목을 찾을 수 없습니다")

    remove_from_vector_store(item_id)


def _to_schema(item) -> KnowledgeBase:
    """DB 모델 → Pydantic 스키마 변환."""
    return KnowledgeBase(
        id=item.id,
        title=item.title,
        category=item.category,
        tcode=item.tcode,
        program_name=getattr(item, "program_name", None),
        source_type=getattr(item, "source_type", "guide"),
        content=item.content,
        steps=item.steps or [],
        warnings=item.warnings or [],
        tags=item.tags or [],
        sap_note=getattr(item, "sap_note", None),
        error_code=getattr(item, "error_code", None),
        solutions=getattr(item, "solutions", None) or [],
        created_at=item.created_at,
        updated_at=item.updated_at,
    )
