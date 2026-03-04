"""Knowledge API 테스트 — CRUD 엔드포인트 검증."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_knowledge_empty(client: AsyncClient):
    """빈 지식 목록 조회."""
    response = await client.get("/api/v1/knowledge")
    assert response.status_code == 200

    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_create_knowledge(client: AsyncClient):
    """지식 항목 생성."""
    payload = {
        "title": "테스트 T-code 가이드",
        "category": "데이터분석",
        "tcode": "ST03N",
        "content": "ST03N은 트랜잭션 이력을 조회하는 T-code입니다.",
        "steps": ["ST03N 실행", "기간 선택", "결과 확인"],
        "warnings": ["데이터 보존 기간 주의"],
        "tags": ["사용이력", "트랜잭션"],
    }

    response = await client.post("/api/v1/knowledge", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "테스트 T-code 가이드"
    assert data["category"] == "데이터분석"
    assert data["tcode"] == "ST03N"
    assert len(data["steps"]) == 3
    assert "id" in data


@pytest.mark.asyncio
async def test_get_knowledge_by_id(client: AsyncClient):
    """ID로 지식 항목 조회."""
    # 생성
    payload = {
        "title": "덤프 분석 가이드",
        "category": "오류분석",
        "tcode": "ST22",
        "content": "ST22로 ABAP 런타임 에러를 분석합니다.",
    }
    create_resp = await client.post("/api/v1/knowledge", json=payload)
    item_id = create_resp.json()["id"]

    # 조회
    response = await client.get(f"/api/v1/knowledge/{item_id}")
    assert response.status_code == 200
    assert response.json()["tcode"] == "ST22"


@pytest.mark.asyncio
async def test_get_knowledge_not_found(client: AsyncClient):
    """존재하지 않는 ID 조회 시 404."""
    response = await client.get("/api/v1/knowledge/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_knowledge(client: AsyncClient):
    """지식 항목 수정."""
    # 생성
    payload = {
        "title": "원본 제목",
        "category": "CTS관리",
        "content": "원본 내용",
    }
    create_resp = await client.post("/api/v1/knowledge", json=payload)
    item_id = create_resp.json()["id"]

    # 수정
    update_payload = {"title": "수정된 제목", "tcode": "STMS"}
    response = await client.put(f"/api/v1/knowledge/{item_id}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["title"] == "수정된 제목"
    assert response.json()["tcode"] == "STMS"


@pytest.mark.asyncio
async def test_delete_knowledge(client: AsyncClient):
    """지식 항목 삭제."""
    # 생성
    payload = {
        "title": "삭제 대상",
        "category": "역할관리",
        "content": "삭제될 내용",
    }
    create_resp = await client.post("/api/v1/knowledge", json=payload)
    item_id = create_resp.json()["id"]

    # 삭제
    response = await client.delete(f"/api/v1/knowledge/{item_id}")
    assert response.status_code == 204

    # 삭제 확인
    get_resp = await client.get(f"/api/v1/knowledge/{item_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_create_knowledge_with_program(client: AsyncClient):
    """ABAP 프로그램 정보가 포함된 지식 항목 생성."""
    payload = {
        "title": "ZFIR0090 에러 패턴",
        "category": "오류분석",
        "tcode": "SE38",
        "program_name": "ZFIR0090",
        "source_type": "source_code",
        "content": "ZFIR0090 프로그램에서 자주 발생하는 런타임 에러 패턴입니다.",
        "steps": ["SE38에서 ZFIR0090 열기", "디버깅 모드 실행"],
        "tags": ["ABAP", "에러패턴"],
    }

    response = await client.post("/api/v1/knowledge", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["program_name"] == "ZFIR0090"
    assert data["source_type"] == "source_code"
    assert data["tcode"] == "SE38"


@pytest.mark.asyncio
async def test_list_with_category_filter(client: AsyncClient):
    """카테고리 필터로 지식 목록 조회."""
    # 2개 카테고리에 데이터 생성
    await client.post("/api/v1/knowledge", json={
        "title": "데이터분석 항목", "category": "데이터분석", "content": "내용1"
    })
    await client.post("/api/v1/knowledge", json={
        "title": "오류분석 항목", "category": "오류분석", "content": "내용2"
    })

    # 카테고리 필터
    response = await client.get("/api/v1/knowledge?category=데이터분석")
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["category"] == "데이터분석"


@pytest.mark.asyncio
async def test_list_with_source_type_filter(client: AsyncClient):
    """source_type 필터로 지식 목록 조회."""
    await client.post(
        "/api/v1/knowledge",
        json={
            "title": "운영 가이드",
            "category": "데이터분석",
            "source_type": "guide",
            "content": "가이드 내용",
        },
    )
    await client.post(
        "/api/v1/knowledge",
        json={
            "title": "소스 코드 분석 결과",
            "category": "소스분석",
            "source_type": "source_code",
            "content": "소스 분석 내용",
        },
    )

    response = await client.get("/api/v1/knowledge?source_type=source_code")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["source_type"] == "source_code"


@pytest.mark.asyncio
async def test_bulk_create_knowledge(client: AsyncClient):
    """지식 항목 일괄 생성."""
    payload = {
        "items": [
            {
                "title": "CBO 분석 결과 A",
                "category": "소스분석",
                "source_type": "source_code",
                "content": "요약 A",
                "tags": ["cbo", "source_code"],
            },
            {
                "title": "CBO 분석 결과 B",
                "category": "소스분석",
                "source_type": "source_code",
                "content": "요약 B",
                "tags": ["cbo", "source_code"],
            },
        ]
    }

    response = await client.post("/api/v1/knowledge/bulk", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["created"] == 2
    assert len(data["items"]) == 2

    listed = await client.get("/api/v1/knowledge?source_type=source_code")
    assert listed.status_code == 200
    assert listed.json()["total"] == 2
