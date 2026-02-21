"""
收藏 API 单元测试
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.items.favorites import (
    toggle_favorite,
    get_user_favorites
)


class TestToggleFavorite:
    """测试切换收藏"""

    @pytest.mark.asyncio
    async def test_add_favorite_success(self, mock_user_id):
        """测试成功添加收藏"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            scalar=Mock(return_value=None)  # 未收藏过
        ))
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()

        result = await toggle_favorite(1, mock_db, mock_user_id)

        assert result["message"] == "收藏成功"
        assert result["item_id"] == 1
        mock_db.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_remove_favorite_success(self, mock_user_id):
        """测试成功取消收藏"""
        mock_favorite = Mock()

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            scalar=Mock(return_value=mock_favorite)
        ))
        mock_db.delete = AsyncMock()
        mock_db.commit = AsyncMock()

        result = await toggle_favorite(1, mock_db, mock_user_id)

        assert result["message"] == "取消收藏成功"
        mock_db.delete.assert_called_once_with(mock_favorite)


class TestRemoveFavorite:
    """测试移除收藏（已合并到 toggle_favorite）"""
    pass


class TestGetUserFavorites:
    """测试获取用户收藏列表"""

    @pytest.mark.asyncio
    async def test_get_favorites_success(self, mock_user_id):
        """测试成功获取收藏列表"""
        mock_items = [
            {
                "id": 1,
                "title": "Item 1",
                "price": 100.00,
                "images": ["image1.jpg"]
            },
            {
                "id": 2,
                "title": "Item 2",
                "price": 200.00,
                "images": None
            }
        ]

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                all=Mock(return_value=mock_items)
            ))
        ))

        result = await get_user_favorites(mock_db, mock_user_id)

        assert len(result) == 2
        assert result[0]["id"] == 1
        assert result[1]["id"] == 2

    @pytest.mark.asyncio
    async def test_get_favorites_empty(self, mock_user_id):
        """测试空收藏列表"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                all=Mock(return_value=[])
            ))
        ))

        result = await get_user_favorites(mock_db, mock_user_id)

        assert result == []
        assert len(result) == 0
