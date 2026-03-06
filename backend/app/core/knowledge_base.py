"""지식 베이스 관리 — DB CRUD 및 시드 데이터 로드."""

import json
from pathlib import Path
from uuid import uuid4

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import KnowledgeItem
from app.models.schemas import KnowledgeCreate, KnowledgeUpdate

SEED_DATA_PATH = Path(__file__).parent.parent / "data" / "sap_knowledge" / "seed_data.json"
ERROR_PATTERNS_PATH = (
    Path(__file__).parent.parent / "data" / "sap_knowledge" / "error_patterns.json"
)


async def get_all_knowledge(
    db: AsyncSession,
    category: str | None = None,
    source_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[KnowledgeItem], int]:
    """지식 목록 조회 (페이지네이션, 카테고리/소스유형 필터)."""
    query = select(KnowledgeItem).order_by(KnowledgeItem.updated_at.desc())
    count_query = select(func.count()).select_from(KnowledgeItem)

    if category:
        query = query.where(KnowledgeItem.category == category)
        count_query = count_query.where(KnowledgeItem.category == category)
    if source_type:
        query = query.where(KnowledgeItem.source_type == source_type)
        count_query = count_query.where(KnowledgeItem.source_type == source_type)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_knowledge_by_id(db: AsyncSession, item_id: str) -> KnowledgeItem | None:
    """ID로 지식 항목 조회."""
    result = await db.execute(
        select(KnowledgeItem).where(KnowledgeItem.id == item_id)
    )
    return result.scalar_one_or_none()


def _build_knowledge_item(data: KnowledgeCreate) -> KnowledgeItem:
    """KnowledgeCreate → KnowledgeItem 변환 헬퍼. 3곳 중복 제거."""
    return KnowledgeItem(
        id=str(uuid4()),
        title=data.title,
        category=data.category,
        tcode=data.tcode,
        program_name=data.program_name,
        source_type=data.source_type,
        content=data.content,
        steps=data.steps,
        warnings=data.warnings,
        tags=data.tags,
        sap_note=data.sap_note,
        error_code=data.error_code,
        solutions=data.solutions,
    )


async def create_knowledge(db: AsyncSession, data: KnowledgeCreate) -> KnowledgeItem:
    """새 지식 항목 생성."""
    item = _build_knowledge_item(data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def create_many_knowledge(
    db: AsyncSession,
    items: list[KnowledgeCreate],
) -> list[KnowledgeItem]:
    """지식 항목을 일괄 생성한다. expire_on_commit=False 설정으로 N+1 쿼리 방지."""
    created = [_build_knowledge_item(data) for data in items]
    db.add_all(created)
    await db.commit()
    # expire_on_commit=False 설정으로 commit 후에도 객체 상태 유지
    return created


async def update_knowledge(
    db: AsyncSession, item_id: str, data: KnowledgeUpdate
) -> KnowledgeItem | None:
    """기존 지식 항목 수정."""
    item = await get_knowledge_by_id(db, item_id)
    if not item:
        return None

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        await db.execute(
            update(KnowledgeItem)
            .where(KnowledgeItem.id == item_id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(item)

    return item


async def delete_knowledge(db: AsyncSession, item_id: str) -> bool:
    """지식 항목 삭제."""
    result = await db.execute(
        delete(KnowledgeItem).where(KnowledgeItem.id == item_id)
    )
    await db.commit()
    return result.rowcount > 0


async def keyword_search(
    db: AsyncSession,
    query: str,
    top_k: int = 5,
    category: str | None = None,
    source_type: str | None = None,
) -> list[KnowledgeItem]:
    """키워드 기반 ILIKE 검색. title, content, tcode, error_code 대상."""
    terms = [t.strip() for t in query.split() if t.strip()]
    if not terms:
        return []

    stmt = select(KnowledgeItem)
    if category:
        stmt = stmt.where(KnowledgeItem.category == category)
    if source_type:
        stmt = stmt.where(KnowledgeItem.source_type == source_type)

    # 모든 검색어 중 하나라도 매칭되는 항목 (OR 조건)
    from sqlalchemy import or_

    or_conditions = []
    for term in terms:
        pattern = f"%{term}%"
        or_conditions.extend([
            KnowledgeItem.title.ilike(pattern),
            KnowledgeItem.content.ilike(pattern),
            KnowledgeItem.tcode.ilike(pattern),
            KnowledgeItem.error_code.ilike(pattern),
        ])

    stmt = stmt.where(or_(*or_conditions)).limit(top_k)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def load_seed_data(db: AsyncSession) -> int:
    """시드 데이터(JSON)를 DB에 로드한다. 이미 데이터가 있으면 스킵."""
    count_result = await db.execute(select(func.count()).select_from(KnowledgeItem))
    existing_count = count_result.scalar() or 0

    if existing_count > 0:
        return 0

    # 시드 데이터 + 에러 패턴 데이터 병합 로드
    all_items: list[dict] = []
    with open(SEED_DATA_PATH, encoding="utf-8") as f:
        all_items.extend(json.load(f))
    if ERROR_PATTERNS_PATH.exists():
        with open(ERROR_PATTERNS_PATH, encoding="utf-8") as f:
            all_items.extend(json.load(f))

    loaded = 0
    for item_data in all_items:
        item = KnowledgeItem(
            id=str(uuid4()),
            title=item_data["title"],
            category=item_data["category"],
            tcode=item_data.get("tcode"),
            source_type=item_data.get("source_type", "guide"),
            content=item_data["content"],
            steps=item_data.get("steps", []),
            warnings=item_data.get("warnings", []),
            tags=item_data.get("tags", []),
            sap_note=item_data.get("sap_note"),
            error_code=item_data.get("error_code"),
            solutions=item_data.get("solutions", []),
        )
        db.add(item)
        loaded += 1

    await db.commit()
    return loaded
