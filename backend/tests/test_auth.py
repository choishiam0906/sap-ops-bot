"""인증 API 통합 테스트."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import hash_password
from app.models.database import User


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """테스트용 관리자 계정 생성."""
    user = User(
        username="testadmin",
        hashed_password=hash_password("testpass123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_login_success(client: AsyncClient, admin_user: User):
    """올바른 인증 정보로 로그인하면 JWT 토큰을 반환해야 한다."""
    response = await client.post("/api/v1/auth/login", json={
        "username": "testadmin",
        "password": "testpass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, admin_user: User):
    """잘못된 비밀번호로 로그인하면 401을 반환해야 한다."""
    response = await client.post("/api/v1/auth/login", json={
        "username": "testadmin",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


async def test_login_nonexistent_user(client: AsyncClient):
    """존재하지 않는 사용자로 로그인하면 401을 반환해야 한다."""
    response = await client.post("/api/v1/auth/login", json={
        "username": "ghost",
        "password": "whatever",
    })
    assert response.status_code == 401


async def test_protected_endpoint_without_auth(client: AsyncClient):
    """auth_enabled=True일 때 토큰 없이 POST하면 401을 반환해야 한다."""
    from app.config import settings

    original = settings.auth_enabled
    settings.auth_enabled = True
    try:
        response = await client.post("/api/v1/knowledge", json={
            "title": "test",
            "category": "test",
            "content": "test",
        })
        assert response.status_code == 401
    finally:
        settings.auth_enabled = original


async def test_protected_endpoint_with_auth(client: AsyncClient, admin_user: User):
    """유효한 JWT 토큰으로 POST하면 성공해야 한다."""
    from app.config import settings

    original = settings.auth_enabled
    settings.auth_enabled = True
    try:
        # 로그인
        login_res = await client.post("/api/v1/auth/login", json={
            "username": "testadmin",
            "password": "testpass123",
        })
        token = login_res.json()["access_token"]

        # 인증된 요청
        response = await client.post(
            "/api/v1/knowledge",
            json={
                "title": "인증 테스트",
                "category": "test",
                "content": "테스트 내용",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 201
    finally:
        settings.auth_enabled = original
