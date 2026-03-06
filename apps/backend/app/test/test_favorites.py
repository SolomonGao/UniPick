"""
Favorites & View History API 测试

测试收藏和浏览记录相关的所有 API 端点：
- POST /api/v1/items/{id}/view         记录浏览
- POST /api/v1/items/{id}/favorite     切换收藏
- GET  /api/v1/items/{id}/stats        获取商品统计
- GET  /api/v1/items/user/favorites    获取用户收藏列表
- GET  /api/v1/items/user/view-history 获取用户浏览历史
"""
import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.api.v1.items.favorites import (
    record_view,
    toggle_favorite,
    get_item_stats,
    get_user_favorites,
    get_user_view_history
)
from app.models.item import Item, Favorite, ViewHistory


class TestRecordView:
    """测试记录浏览 API"""
    
    @pytest.mark.asyncio
    async def test_record_view_anonymous(self, mock_db_result):
        """测试匿名用户浏览记录"""
        mock_item = Mock(id=12345)
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(scalar_value=mock_item),  # Check item exists
            mock_db_result(scalar_value=5),  # Update view count
        ])
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.items.favorites.limiter"):
            result = await record_view(
                request=Mock(),
                item_id=12345,
                db=mock_db,
                user_id=None
            )
        
        assert result["message"] == "浏览记录已更新"
    
    @pytest.mark.asyncio
    async def test_record_view_authenticated(self, mock_user_id, mock_db_result):
        """测试认证用户浏览记录"""
        mock_item = Mock(id=12345)
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(scalar_value=mock_item),  # Check item exists
            mock_db_result(scalar_value=None),  # Check existing view history
        ])
        mock_db.commit = AsyncMock()
        mock_db.add = Mock()
        
        with patch("app.api.v1.items.favorites.limiter"):
            result = await record_view(
                request=Mock(),
                item_id=12345,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert result["message"] == "浏览记录已更新"
    
    @pytest.mark.asyncio
    async def test_record_view_item_not_found(self, mock_db_result):
        """测试浏览不存在的商品"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(scalar_value=None))
        
        with pytest.raises(HTTPException) as exc_info:
            with patch("app.api.v1.items.favorites.limiter"):
                await record_view(
                    request=Mock(),
                    item_id=99999,
                    db=mock_db,
                    user_id=None
                )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


class TestToggleFavorite:
    """测试切换收藏 API"""
    
    @pytest.mark.asyncio
    async def test_add_favorite_success(self, mock_user_id, mock_db_result):
        """测试成功添加收藏"""
        mock_item = Mock(id=12345, title="Test Item", price=100.0)
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(first_value=(12345, "Test Item", 100.0)),  # Check item
            mock_db_result(scalar_value=None),  # Check existing favorite
        ])
        mock_db.commit = AsyncMock()
        mock_db.add = Mock()
        
        with patch("app.api.v1.items.favorites.limiter"):
            result = await toggle_favorite(
                request=Mock(),
                item_id=12345,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert result["message"] == "收藏成功"
        assert result["is_favorited"] is True
        mock_db.add.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_remove_favorite_success(self, mock_user_id, mock_db_result):
        """测试成功取消收藏"""
        mock_item = Mock(id=12345, title="Test Item", price=100.0)
        mock_favorite = Mock(id=1, user_id=mock_user_id, item_id=12345)
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(first_value=(12345, "Test Item", 100.0)),  # Check item
            mock_db_result(scalar_value=mock_favorite),  # Find existing favorite
        ])
        mock_db.commit = AsyncMock()
        mock_db.delete = AsyncMock()
        
        with patch("app.api.v1.items.favorites.limiter"):
            result = await toggle_favorite(
                request=Mock(),
                item_id=12345,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert result["message"] == "取消收藏成功"
        assert result["is_favorited"] is False
        mock_db.delete.assert_called_once_with(mock_favorite)
    
    @pytest.mark.asyncio
    async def test_toggle_favorite_unauthenticated(self):
        """测试未认证用户无法收藏"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        with pytest.raises(HTTPException) as exc_info:
            with patch("app.api.v1.items.favorites.limiter"):
                await toggle_favorite(
                    request=Mock(),
                    item_id=12345,
                    db=mock_db,
                    user_id=None
                )
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    async def test_toggle_favorite_item_not_found(self, mock_user_id, mock_db_result):
        """测试收藏不存在的商品"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(first_value=None))
        
        with pytest.raises(HTTPException) as exc_info:
            with patch("app.api.v1.items.favorites.limiter"):
                await toggle_favorite(
                    request=Mock(),
                    item_id=99999,
                    db=mock_db,
                    user_id=mock_user_id
                )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_add_favorite_concurrent(self, mock_user_id, mock_db_result):
        """测试并发收藏（竞态条件处理）"""
        mock_item = Mock(id=12345, title="Test Item", price=100.0)
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(first_value=(12345, "Test Item", 100.0)),  # Check item
            mock_db_result(scalar_value=None),  # Check existing
        ])
        # Simulate IntegrityError for concurrent insert
        mock_db.commit = AsyncMock(side_effect=[IntegrityError(" Duplicate", "", ""), None])
        mock_db.rollback = AsyncMock()
        mock_db.add = Mock()
        
        with patch("app.api.v1.items.favorites.limiter"):
            result = await toggle_favorite(
                request=Mock(),
                item_id=12345,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert result["message"] == "已收藏"
        assert result["is_favorited"] is True


class TestGetItemStats:
    """测试获取商品统计 API"""
    
    @pytest.mark.asyncio
    async def test_get_item_stats_success(self, mock_user_id, mock_db_result):
        """测试成功获取商品统计"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(first_value=(12345, 100)),  # Item with view count
            mock_db_result(scalar_value=25),  # Favorite count
            mock_db_result(scalar_value=123),  # Favorite id (user has favorited)
        ])
        
        result = await get_item_stats(
            item_id=12345,
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert result["view_count"] == 100
        assert result["favorite_count"] == 25
        assert result["is_favorited"] is True
    
    @pytest.mark.asyncio
    async def test_get_item_stats_not_favorited(self, mock_user_id, mock_db_result):
        """测试获取统计（未收藏）"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(first_value=(12345, 50)),  # Item with view count
            mock_db_result(scalar_value=10),  # Favorite count
            mock_db_result(scalar_value=None),  # No favorite found
        ])
        
        result = await get_item_stats(
            item_id=12345,
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert result["view_count"] == 50
        assert result["favorite_count"] == 10
        assert result["is_favorited"] is False
    
    @pytest.mark.asyncio
    async def test_get_item_stats_anonymous(self, mock_db_result):
        """测试匿名用户获取统计"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(first_value=(12345, 200)),  # Item with view count
            mock_db_result(scalar_value=50),  # Favorite count
        ])
        
        result = await get_item_stats(
            item_id=12345,
            db=mock_db,
            user_id=None
        )
        
        assert result["view_count"] == 200
        assert result["favorite_count"] == 50
        assert result["is_favorited"] is False
    
    @pytest.mark.asyncio
    async def test_get_item_stats_not_found(self, mock_db_result):
        """测试获取不存在商品的统计"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(first_value=None))
        
        with pytest.raises(HTTPException) as exc_info:
            await get_item_stats(
                item_id=99999,
                db=mock_db,
                user_id=None
            )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


class TestGetUserFavorites:
    """测试获取用户收藏列表 API"""
    
    @pytest.mark.asyncio
    async def test_get_user_favorites_success(self, mock_user_id, mock_db_result):
        """测试成功获取用户收藏"""
        mock_favorites = [
            Mock(
                id=1,
                title="Item 1",
                price=100.0,
                category="electronics",
                images=["img1.jpg"],
                location_name="Location 1",
                created_at=Mock(isoformat=Mock(return_value="2024-01-01T00:00:00"))
            ),
            Mock(
                id=2,
                title="Item 2",
                price=200.0,
                category="books",
                images=["img2.jpg"],
                location_name="Location 2",
                created_at=Mock(isoformat=Mock(return_value="2024-01-02T00:00:00"))
            ),
        ]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_favorites))
        
        result = await get_user_favorites(
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert len(result) == 2
        assert result[0]["title"] == "Item 1"
        assert result[1]["title"] == "Item 2"
    
    @pytest.mark.asyncio
    async def test_get_user_favorites_empty(self, mock_user_id, mock_db_result):
        """测试获取空收藏列表"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result([]))
        
        result = await get_user_favorites(
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert result == []


class TestGetUserViewHistory:
    """测试获取用户浏览历史 API"""
    
    @pytest.mark.asyncio
    async def test_get_user_view_history_success(self, mock_user_id, mock_db_result):
        """测试成功获取浏览历史"""
        mock_history = [
            Mock(
                id=1,
                title="Item 1",
                price=100.0,
                category="electronics",
                images=["img1.jpg"],
                view_count=5,
                created_at=Mock(isoformat=Mock(return_value="2024-01-01T00:00:00"))
            ),
            Mock(
                id=2,
                title="Item 2",
                price=200.0,
                category="books",
                images=["img2.jpg"],
                view_count=3,
                created_at=Mock(isoformat=Mock(return_value="2024-01-02T00:00:00"))
            ),
        ]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_history))
        
        result = await get_user_view_history(
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert len(result) == 2
        assert result[0]["title"] == "Item 1"
    
    @pytest.mark.asyncio
    async def test_get_user_view_history_empty(self, mock_user_id, mock_db_result):
        """测试获取空浏览历史"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result([]))
        
        result = await get_user_view_history(
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert result == []
