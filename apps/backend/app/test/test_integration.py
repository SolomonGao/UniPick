"""
Integration Tests - 集成测试

测试 API 的端到端场景，验证多个模块的协同工作
"""
import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


class TestItemLifecycle:
    """测试商品完整生命周期"""
    
    @pytest.mark.asyncio
    async def test_create_item_with_moderation(self, mock_user_id, sample_item_data, mock_moderation_result_clean):
        """测试创建商品并自动审核"""
        from app.api.v1.items.items import create_item
        from app.api.v1.items.favorites import get_item_stats
        from app.schemas.item import ItemCreate
        
        # 1. 创建商品
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = Mock(status="approved", **mock_moderation_result_clean)
            
            mock_db = AsyncMock(spec=AsyncSession)
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()
            mock_db.add = Mock()
            
            item_in = ItemCreate(**sample_item_data)
            
            with patch("app.api.v1.items.items.limiter"):
                result = await create_item(
                    request=Mock(),
                    item_in=item_in,
                    db=mock_db,
                    user_id=mock_user_id
                )
            
            assert result.title == sample_item_data["title"]
        
        # 2. 获取商品统计
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            Mock(first=Mock(return_value=(result.id, 0))),
            Mock(scalar=Mock(return_value=0)),
            Mock(scalar=Mock(return_value=None))
        ])
        
        stats = await get_item_stats(
            item_id=result.id,
            db=mock_db,
            user_id=None
        )
        
        assert stats["view_count"] == 0
        assert stats["favorite_count"] == 0
    
    @pytest.mark.asyncio
    async def test_item_flagged_and_reviewed(self, mock_user_id, mock_admin_id, sample_item_data, mock_moderation_result_flagged):
        """测试商品被标记后管理员审核"""
        from app.api.v1.items.items import create_item
        from app.api.v1.moderation import review_item
        from app.schemas.item import ItemCreate
        
        # 1. 创建可疑商品
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = Mock(status="flagged", **mock_moderation_result_flagged)
            
            mock_db = AsyncMock(spec=AsyncSession)
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()
            mock_db.add = Mock()
            
            item_in = ItemCreate(**sample_item_data)
            
            with patch("app.api.v1.items.items.limiter"):
                result = await create_item(
                    request=Mock(),
                    item_in=item_in,
                    db=mock_db,
                    user_id=mock_user_id
                )
        
        # 2. 管理员审核通过
        mock_log = Mock(
            id=1,
            content_type="item",
            content_id=str(result.id),
            status="flagged",
            moderation_status="flagged"
        )
        
        mock_item = Mock(
            id=result.id,
            moderation_status="flagged"
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            Mock(scalar_one_or_none=Mock(return_value=mock_log)),
            Mock(scalar_one_or_none=Mock(return_value=mock_item))
        ])
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=True):
            review_result = await review_item(
                log_id=1,
                decision="approved",
                note="误判，内容正常",
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert review_result["message"] == "审核完成"
        assert mock_item.moderation_status == "approved"


class TestUserProfileLifecycle:
    """测试用户资料完整生命周期"""
    
    @pytest.mark.asyncio
    async def test_profile_update_and_approval(self, mock_user_id, mock_admin_id, sample_profile_data):
        """测试更新资料并审核通过"""
        from app.api.v1.users.profile import update_profile, get_my_profile
        
        # 1. 更新资料（进入待审核）
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.users.profile.moderate_profile") as mock_moderate:
            mock_moderate.return_value = Mock(status="approved")
            
            result = await update_profile(
                profile_data=sample_profile_data,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert result["message"] == "资料更新成功"
        
        # 2. 获取资料（已审核）
        mock_profile = {
            "id": mock_user_id,
            "username": sample_profile_data["username"],
            "full_name": sample_profile_data["full_name"],
            "moderation_status": "approved"
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(first=Mock(return_value=mock_profile)))
        
        profile = await get_my_profile(
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert profile["moderation_status"] == "approved"


class TestFavoriteAndViewFlow:
    """测试收藏和浏览流程"""
    
    @pytest.mark.asyncio
    async def test_view_and_favorite_item(self, mock_user_id, mock_db_result):
        """测试浏览后收藏商品"""
        from app.api.v1.items.favorites import record_view, toggle_favorite, get_item_stats
        
        item_id = 12345
        
        # 1. 记录浏览
        mock_item = Mock(id=item_id)
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(scalar_value=mock_item),
            mock_db_result(scalar_value=5),
        ])
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.items.favorites.limiter"):
            view_result = await record_view(
                request=Mock(),
                item_id=item_id,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert view_result["message"] == "浏览记录已更新"
        
        # 2. 添加收藏
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(first_value=(item_id, "Test Item", 100.0)),
            mock_db_result(scalar_value=None),
        ])
        mock_db.commit = AsyncMock()
        mock_db.add = Mock()
        
        with patch("app.api.v1.items.favorites.limiter"):
            fav_result = await toggle_favorite(
                request=Mock(),
                item_id=item_id,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert fav_result["is_favorited"] is True
        
        # 3. 验证统计更新
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(first_value=(item_id, 6)),  # View count increased
            mock_db_result(scalar_value=1),  # Favorite count
            mock_db_result(scalar_value=123),  # Is favorited
        ])
        
        stats = await get_item_stats(
            item_id=item_id,
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert stats["view_count"] == 6
        assert stats["favorite_count"] == 1
        assert stats["is_favorited"] is True


class TestAdminWorkflow:
    """测试管理员工作流"""
    
    @pytest.mark.asyncio
    async def test_admin_review_queue_and_approval(self, mock_admin_id, mock_user_id, mock_db_result):
        """测试管理员审核队列流程"""
        from app.api.v1.moderation import get_review_queue, review_item
        from app.api.v1.users.profile import get_pending_profiles, approve_user
        
        # 1. 获取审核队列（商品）
        mock_queue = [
            {"id": 1, "content_type": "item", "status": "flagged"},
            {"id": 2, "content_type": "item", "status": "pending"}
        ]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_queue))
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=True):
            item_queue = await get_review_queue(
                status="flagged",
                limit=50,
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert len(item_queue) == 2
        
        # 2. 获取待审核用户
        mock_profiles = [
            {"id": mock_user_id, "username": "testuser", "moderation_status": "pending"}
        ]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_profiles))
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=True):
            user_queue = await get_pending_profiles(
                limit=50,
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert len(user_queue) == 1
        
        # 3. 审核通过用户
        mock_profile = Mock(
            id=mock_user_id,
            username="testuser",
            moderation_status="pending"
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(scalar_one_or_none=Mock(return_value=mock_profile)))
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=True):
            result = await approve_user(
                user_id=mock_user_id,
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert result["message"] == "用户已通过审核"


class TestErrorHandling:
    """测试错误处理场景"""
    
    @pytest.mark.asyncio
    async def test_concurrent_favorite_toggle(self, mock_user_id):
        """测试并发收藏处理"""
        from app.api.v1.items.favorites import toggle_favorite
        from sqlalchemy.exc import IntegrityError
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            Mock(first=Mock(return_value=(12345, "Test Item", 100.0))),
            Mock(scalar_one_or_none=Mock(return_value=None))
        ])
        # Simulate concurrent insert with IntegrityError
        mock_db.commit = AsyncMock(side_effect=IntegrityError("Duplicate", "", ""))
        mock_db.rollback = AsyncMock()
        mock_db.add = Mock()
        
        with patch("app.api.v1.items.favorites.limiter"):
            result = await toggle_favorite(
                request=Mock(),
                item_id=12345,
                db=mock_db,
                user_id=mock_user_id
            )
        
        # Should handle gracefully
        assert result["is_favorited"] is True
    
    @pytest.mark.asyncio
    async def test_database_error_recovery(self, mock_user_id, sample_item_data):
        """测试数据库错误恢复"""
        from app.api.v1.items.items import create_item
        from app.schemas.item import ItemCreate
        from sqlalchemy.exc import SQLAlchemyError
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.commit = AsyncMock(side_effect=SQLAlchemyError("Database error"))
        mock_db.rollback = AsyncMock()
        
        item_in = ItemCreate(**sample_item_data)
        
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = Mock(status="approved")
            
            with pytest.raises(HTTPException) as exc_info:
                with patch("app.api.v1.items.items.limiter"):
                    await create_item(
                        request=Mock(),
                        item_in=item_in,
                        db=mock_db,
                        user_id=mock_user_id
                    )
        
        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        mock_db.rollback.assert_called_once()


class TestSecurityScenarios:
    """测试安全场景"""
    
    @pytest.mark.asyncio
    async def test_private_item_access_by_owner(self, mock_user_id, mock_db_result):
        """测试所有者访问私密位置商品"""
        from app.api.v1.items.items import get_item
        
        mock_item = Mock(
            id=12345,
            user_id=mock_user_id,
            title="Test",
            price=100.0,
            description="Test",
            category="electronics",
            images=[],
            latitude=37.229456,
            longitude=-80.413978,
            location_name="Exact Location",
            is_location_private=True,
            moderation_status="approved",
            view_count=5,
            created_at=Mock(isoformat=Mock(return_value="2024-01-01T00:00:00"))
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(scalar_value=mock_item))
        
        result = await get_item(
            item_id=12345,
            db=mock_db,
            current_user_id=mock_user_id
        )
        
        # Owner should see exact location
        assert result["latitude"] == 37.229456
        assert result["longitude"] == -80.413978
    
    @pytest.mark.asyncio
    async def test_private_item_access_by_other(self, mock_user_id, mock_db_result):
        """测试非所有者访问私密位置商品"""
        from app.api.v1.items.items import get_item
        
        mock_item = Mock(
            id=12345,
            user_id="different-user-id",
            title="Test",
            price=100.0,
            description="Test",
            category="electronics",
            images=[],
            latitude=37.229456,
            longitude=-80.413978,
            location_name="123 Main St, 24060",
            is_location_private=True,
            moderation_status="approved",
            view_count=5,
            created_at=Mock(isoformat=Mock(return_value="2024-01-01T00:00:00"))
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(scalar_value=mock_item))
        
        with patch("app.api.v1.items.items.is_admin_user", return_value=False):
            result = await get_item(
                item_id=12345,
                db=mock_db,
                current_user_id=mock_user_id
            )
        
        # Non-owner should see fuzzy location
        assert result["latitude"] == round(37.229456, 2)
        assert result["longitude"] == round(-80.413978, 2)
        assert result["location_fuzzy"] == "ZIP 24060"
