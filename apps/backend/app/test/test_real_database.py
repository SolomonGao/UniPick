"""
使用真实数据库运行的测试 - 修复版
"""
import pytest
import pytest_asyncio
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from unittest.mock import Mock, patch

from app.core.config import settings
from app.services.moderation import ModerationService


@pytest_asyncio.fixture(scope="function")
async def real_db_session():
    """使用真实数据库的会话 - 每个测试独立"""
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=1,
        max_overflow=0
    )
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    async with async_session() as session:
        yield session
        await session.rollback()
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_user_id(real_db_session):
    """获取测试用户 ID"""
    result = await real_db_session.execute(
        text("SELECT id FROM profiles LIMIT 1")
    )
    user = result.fetchone()
    if user:
        return str(user[0])
    pytest.skip("数据库中没有用户")


class TestRealDatabaseModeration:
    """使用真实数据库测试审核"""

    @pytest.mark.asyncio
    async def test_moderation_stats(self, real_db_session):
        """测试审核统计"""
        stats = await ModerationService.get_stats(real_db_session)

        assert "total" in stats
        assert "approved" in stats
        assert "flagged" in stats
        assert "rejected" in stats

        print(f"\n📊 审核统计: {stats}")

    @pytest.mark.asyncio
    async def test_get_pending_review(self, real_db_session):
        """测试获取待审核内容"""
        logs = await ModerationService.get_pending_review(real_db_session, 'flagged', 10)

        assert isinstance(logs, list)
        print(f"\n📝 待审核内容: {len(logs)} 条")

    @pytest.mark.asyncio
    async def test_create_moderation_log(self, real_db_session, test_user_id):
        """测试创建和更新审核记录"""
        # 创建审核日志 - 使用 profile 类型避免更新 items 表
        result = await real_db_session.execute(
            text("""
                INSERT INTO moderation_logs
                (content_type, content_id, user_id, content_text, status, flagged, scores)
                VALUES ('profile', :content_id, :user_id, 'Test profile moderation', 'pending', false, '{}')
                RETURNING id
            """),
            {"content_id": test_user_id, "user_id": test_user_id}
        )
        log_id = result.scalar()
        await real_db_session.commit()

        assert log_id is not None
        print(f"\n✅ 创建审核日志 ID: {log_id}")

        # 测试人工审核 - 这会更新 profiles 表
        await ModerationService.manual_review(
            real_db_session, log_id, test_user_id, "approved", "Test review note"
        )

        # 验证更新
        result = await real_db_session.execute(
            text("SELECT status, reviewed_by FROM moderation_logs WHERE id = :id"),
            {"id": log_id}
        )
        row = result.fetchone()
        assert row[0] == "approved"
        print(f"✅ 审核状态已更新为 approved")


class TestRealDatabaseItems:
    """使用真实数据库测试商品"""

    @pytest.mark.asyncio
    async def test_item_has_moderation_fields(self, real_db_session):
        """测试商品有审核字段"""
        result = await real_db_session.execute(
            text("""
                SELECT id, title, moderation_status, original_price
                FROM items
                WHERE status = 'active'
                LIMIT 1
            """)
        )
        item = result.mappings().fetchone()

        if item:
            print(f"\n📦 商品: {item['title']}")
            print(f"   - 审核状态: {item['moderation_status']}")
            print(f"   - 原价: {item['original_price']}")
        else:
            print("\n⚠️ 没有活跃商品")

    @pytest.mark.asyncio
    async def test_items_count(self, real_db_session):
        """测试商品数量"""
        result = await real_db_session.execute(
            text("SELECT COUNT(*) FROM items")
        )
        count = result.scalar()
        print(f"\n📊 商品总数: {count}")
        assert isinstance(count, int)


class TestRealDatabaseProfiles:
    """使用真实数据库测试用户资料"""

    @pytest.mark.asyncio
    async def test_profiles_have_new_fields(self, real_db_session):
        """测试用户资料有新字段"""
        result = await real_db_session.execute(
            text("""
                SELECT id, full_name, bio, phone, campus, notification_email, show_phone
                FROM profiles
                LIMIT 1
            """)
        )
        profile = result.mappings().fetchone()

        if profile:
            print(f"\n👤 用户资料:")
            print(f"   - 全名: {profile['full_name']}")
            print(f"   - 简介: {profile['bio']}")
            print(f"   - 电话: {profile['phone']}")
            print(f"   - 校区: {profile['campus']}")
        else:
            print("\n⚠️ 没有用户资料")

    @pytest.mark.asyncio
    async def test_profiles_count(self, real_db_session):
        """测试用户数量"""
        result = await real_db_session.execute(
            text("SELECT COUNT(*) FROM profiles")
        )
        count = result.scalar()
        print(f"\n👥 用户总数: {count}")
        assert isinstance(count, int)
