"""
集成测试 - 测试完整 API 流程
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch


class TestItemLifecycle:
    """测试商品完整生命周期"""
    
    @pytest.mark.asyncio
    async def test_create_update_delete_item_flow(self):
        """测试创建-更新-删除商品流程"""
        user_id = "test_user_123"
        
        # 1. 创建商品
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = {"status": "approved"}
            
            mock_db = AsyncMock()
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()
            mock_db.add = Mock()
            
            from app.schemas.item import ItemCreate
            item_data = ItemCreate(
                title="Test Item",
                price=100.00,
                category="electronics",
                location_name="Test Location",
                latitude=37.0,
                longitude=-80.0
            )
            
            from app.api.v1.items.items import create_item
            created = await create_item(item_data, mock_db, user_id)
            
            assert created["title"] == "Test Item"
            assert created["price"] == 100.00
            item_id = created["id"]
        
        # 2. 更新商品（降价）
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = {"status": "approved"}
            
            mock_db = AsyncMock()
            mock_db.get = AsyncMock(return_value=Mock(
                id=item_id,
                title="Test Item",
                price=100.00,
                original_price=None,
                user_id=user_id
            ))
            mock_db.commit = AsyncMock()
            mock_db.execute = AsyncMock()
            
            from app.schemas.item import ItemUpdate
            update_data = ItemUpdate(price=80.00)
            
            from app.api.v1.items.items import update_item
            updated = await update_item(item_id, update_data, mock_db, user_id)
            
            assert updated["price"] == 80.00
            assert updated["original_price"] == 100.00
        
        # 3. 删除商品
        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=Mock(
            id=item_id,
            user_id=user_id
        ))
        mock_db.commit = AsyncMock()
        mock_db.delete = AsyncMock()
        mock_db.execute = AsyncMock()
        
        from app.api.v1.items.items import delete_item
        deleted = await delete_item(item_id, mock_db, user_id)
        
        assert deleted["message"] == "商品删除成功"


class TestUserProfileLifecycle:
    """测试用户资料完整生命周期"""
    
    @pytest.mark.asyncio
    async def test_profile_crud_flow(self):
        """测试资料增删改查流程"""
        user_id = "test_user_456"
        
        # 1. 获取初始资料
        mock_profile = {
            "id": user_id,
            "email": "test@example.com",
            "username": None,
            "full_name": None,
            "bio": None,
            "notification_email": True,
            "show_phone": False
        }
        
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                one_or_none=Mock(return_value=mock_profile)
            ))
        ))
        
        from app.api.v1.users.profile import get_my_profile
        profile = await get_my_profile(mock_db, user_id)
        
        assert profile["id"] == user_id
        assert profile["email"] == "test@example.com"
        
        # 2. 更新资料
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                one_or_none=Mock(return_value=mock_profile)
            ))
        ))
        mock_db.commit = AsyncMock()
        
        from app.api.v1.users.profile import update_profile, UserProfileUpdate
        update_data = UserProfileUpdate(
            username="newuser",
            full_name="New Name",
            bio="New bio"
        )
        
        updated = await update_profile(update_data, mock_db, user_id)
        
        assert updated["username"] == "newuser"
        assert updated["full_name"] == "New Name"
        assert updated["bio"] == "New bio"


class TestFavoriteAndSearch:
    """测试收藏和搜索集成"""
    
    @pytest.mark.asyncio
    async def test_favorite_item_and_search(self):
        """测试收藏商品后搜索可见性"""
        user_id = "test_user_789"
        item_id = 123
        
        # 1. 收藏商品
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=Mock(
            scalar=Mock(return_value=None)
        ))
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        
        from app.api.v1.items.favorites import add_favorite
        result = await add_favorite(item_id, mock_db, user_id)
        
        assert result["message"] == "收藏成功"
        
        # 2. 获取收藏列表
        mock_items = [
            {
                "id": item_id,
                "title": "Favorited Item",
                "price": 50.00,
                "images": ["img.jpg"],
                "is_favorited": True
            }
        ]
        
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                all=Mock(return_value=mock_items)
            ))
        ))
        
        from app.api.v1.items.favorites import get_my_favorites
        favorites = await get_my_favorites(mock_db, user_id)
        
        assert len(favorites) == 1
        assert favorites[0]["id"] == item_id


class TestModerationIntegration:
    """测试审核集成"""
    
    @pytest.mark.asyncio
    async def test_item_creation_with_moderation(self):
        """测试创建商品时自动审核"""
        user_id = "test_user_moderation"
        
        # 创建可疑内容商品
        with patch("app.services.moderation.openai_client") as mock_client:
            # 模拟 OpenAI 返回可疑结果
            mock_result = Mock()
            mock_result.categories = Mock()
            mock_result.categories.sexual = True
            mock_result.category_scores = Mock()
            mock_result.category_scores.sexual = 0.85
            
            mock_response = Mock()
            mock_response.results = [mock_result]
            
            mock_client.moderations = Mock()
            mock_client.moderations.create = AsyncMock(return_value=mock_response)
            
            mock_db = AsyncMock()
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()
            mock_db.add = Mock()
            mock_db.execute = AsyncMock(return_value=Mock(
                scalar=Mock(return_value=1)
            ))
            
            from app.schemas.item import ItemCreate
            from app.api.v1.items.items import create_item
            
            item_data = ItemCreate(
                title="Suspicious Item",
                price=100.00,
                description="Questionable content",
                category="electronics",
                location_name="Test Location",
                latitude=37.0,
                longitude=-80.0
            )
            
            result = await create_item(item_data, mock_db, user_id)
            
            # 可疑内容应该被标记
            assert result["moderation_status"] == "flagged"


class TestErrorHandling:
    """测试错误处理"""
    
    @pytest.mark.asyncio
    async def test_concurrent_modification(self):
        """测试并发修改处理"""
        # 模拟两个用户同时尝试修改同一商品
        pass  # 需要更复杂的测试设置
    
    @pytest.mark.asyncio
    async def test_database_connection_error(self):
        """测试数据库连接错误"""
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(side_effect=Exception("Connection failed"))
        
        with pytest.raises(Exception):
            from app.api.v1.items.items import get_item
            await get_item(1, mock_db)
    
    @pytest.mark.asyncio
    async def test_invalid_input_handling(self):
        """测试无效输入处理"""
        with pytest.raises(ValueError):
            from app.api.v1.users.profile import UserProfileUpdate
            # 无效的用户名长度
            UserProfileUpdate(username="a")
