"""
Pytest 配置和共享 Fixtures

此文件包含所有测试共享的配置和 fixtures
"""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import asyncio
import uuid
from datetime import datetime

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
def mock_admin_id():
    """模拟管理员 ID"""
    return str(uuid.uuid4())


@pytest.fixture
def mock_item_id():
    """模拟商品 ID"""
    return 12345


@pytest.fixture
def mock_auth_headers(mock_user_id):
    """模拟认证请求头"""
    return {"Authorization": f"Bearer mock_token_for_{mock_user_id}"}


@pytest.fixture
def mock_admin_headers(mock_admin_id):
    """模拟管理员认证请求头"""
    return {"Authorization": f"Bearer mock_admin_token_for_{mock_admin_id}"}


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
        "is_location_private": False,
        "images": ["https://example.com/image1.jpg"]
    }


@pytest.fixture
def sample_item_data_minimal():
    """最小化商品数据"""
    return {
        "title": "Minimal Item",
        "price": 50.00,
        "category": "books",
        "latitude": 37.2294,
        "longitude": -80.4139,
        "location_name": "VT Campus"
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
def sample_moderation_data():
    """示例审核数据"""
    return {
        "title": "Test Title",
        "description": "Test Description"
    }


@pytest.fixture
def mock_moderation_result_clean():
    """模拟清洁内容审核结果"""
    return {
        "flagged": False,
        "categories": {
            "sexual": False,
            "hate": False,
            "violence": False,
            "harassment": False
        },
        "scores": {
            "sexual": 0.01,
            "hate": 0.001,
            "violence": 0.002,
            "harassment": 0.005
        },
        "max_score": 0.01
    }


@pytest.fixture
def mock_moderation_result_flagged():
    """模拟可疑内容审核结果"""
    return {
        "flagged": True,
        "categories": {
            "sexual": True,
            "hate": False,
            "violence": False,
            "harassment": True
        },
        "scores": {
            "sexual": 0.85,
            "hate": 0.01,
            "violence": 0.02,
            "harassment": 0.72
        },
        "max_score": 0.85
    }


@pytest.fixture
def mock_db_result():
    """创建模拟数据库结果工厂"""
    def _create_result(data=None, scalar_value=None, first_value=None):
        mock_result = Mock()
        
        if data is not None:
            if isinstance(data, list):
                mock_result.mappings.return_value.all.return_value = data
                mock_result.scalars.return_value.all.return_value = data
            else:
                mock_result.mappings.return_value.all.return_value = [data] if data else []
                mock_result.scalars.return_value.all.return_value = [data] if data else []
        
        if scalar_value is not None:
            mock_result.scalar.return_value = scalar_value
            mock_result.scalar_one_or_none.return_value = scalar_value
        
        if first_value is not None:
            mock_result.first.return_value = first_value
        
        return mock_result
    return _create_result


@pytest.fixture
def mock_item_model(mock_user_id):
    """创建模拟商品模型"""
    item = Mock(spec=Item)
    item.id = 12345
    item.title = "Test Item"
    item.price = 100.00
    item.description = "Test Description"
    item.category = "electronics"
    item.user_id = mock_user_id
    item.latitude = 37.2294
    item.longitude = -80.4139
    item.location_name = "VT Campus"
    item.is_location_private = False
    item.moderation_status = "approved"
    item.view_count = 10
    item.created_at = datetime.now()
    item.updated_at = datetime.now()
    item.images = ["https://example.com/image.jpg"]
    return item


@pytest.fixture(autouse=True)
def mock_openai():
    """自动 mock OpenAI 客户端"""
    with patch("app.services.moderation.openai_client") as mock:
        mock.moderations = Mock()
        mock.moderations.create = AsyncMock()
        yield mock


@pytest.fixture(autouse=True)
def mock_supabase():
    """自动 mock Supabase 客户端"""
    with patch("app.core.security.supabase") as mock:
        mock.auth = Mock()
        mock.auth.get_user = AsyncMock()
        yield mock


# 导入需要在 fixtures 中使用的模型
from app.models.item import Item
from app.models.user import User
