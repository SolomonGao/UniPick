"""
Pytest 配置和共享 fixtures
"""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from unittest.mock import Mock, AsyncMock, patch
import asyncio
import uuid

# 测试数据库 URL（使用内存 SQLite）
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def async_engine():
    """创建异步数据库引擎"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=False
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(async_engine):
    """创建数据库会话"""
    async_session = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
def mock_user_id():
    """模拟用户 ID"""
    return str(uuid.uuid4())


@pytest.fixture
def mock_auth_headers(mock_user_id):
    """模拟认证请求头"""
    return {"Authorization": f"Bearer mock_token_for_{mock_user_id}"}


@pytest.fixture
def sample_item_data():
    """示例商品数据"""
    return {
        "title": "Test Item",
        "price": 100.00,
        "description": "A test item for unit testing",
        "category": "electronics",
        "location_name": "Test Location",
        "latitude": 37.2294,
        "longitude": -80.4139,
        "is_location_private": False
    }


@pytest.fixture
def sample_profile_data():
    """示例用户资料数据"""
    return {
        "username": "testuser",
        "full_name": "Test User",
        "bio": "A test user bio",
        "phone": "123-456-7890",
        "campus": "Main Campus",
        "university": "Test University",
        "notification_email": True,
        "show_phone": False
    }


@pytest.fixture
def mock_moderation_result():
    """模拟审核结果"""
    return {
        "flagged": False,
        "categories": {
            "sexual": False,
            "hate": False,
            "violence": False
        },
        "scores": {
            "sexual": 0.01,
            "hate": 0.001,
            "violence": 0.002
        },
        "max_score": 0.01
    }


@pytest.fixture
def mock_flagged_moderation_result():
    """模拟可疑内容审核结果"""
    return {
        "flagged": True,
        "categories": {
            "sexual": True,
            "hate": False,
            "violence": False
        },
        "scores": {
            "sexual": 0.85,
            "hate": 0.01,
            "violence": 0.02
        },
        "max_score": 0.85
    }


@pytest.fixture(autouse=True)
def mock_openai():
    """自动 mock OpenAI 客户端"""
    with patch("app.services.moderation.openai_client") as mock:
        mock.moderations = Mock()
        mock.moderations.create = AsyncMock()
        yield mock


@pytest.fixture
def mock_db_result():
    """创建模拟数据库结果"""
    def _create_result(data):
        mock_result = Mock()
        mock_result.mappings.return_value.one_or_none.return_value = data
        mock_result.mappings.return_value.all.return_value = data if isinstance(data, list) else [data] if data else []
        mock_result.scalar.return_value = data
        return mock_result
    return _create_result
