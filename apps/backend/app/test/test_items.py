"""
商品 API 单元测试
"""
import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.items.items import (
    create_item,
    get_item,
    update_item,
    delete_item,
    VALID_CATEGORIES,
    get_fuzzy_location,
    extract_zip_code,
    format_distance
)
from app.models.item import Item
from app.schemas.item import ItemCreate

# 临时定义 ItemUpdate 用于测试
from pydantic import BaseModel
from typing import Optional

class ItemUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None


class TestItemUtils:
    """测试商品工具函数"""
    
    @pytest.mark.parametrize("distance_km,expected", [
        (0.1, "Very close (within 0.5 miles)"),
        (0.8, "Very close (within 0.5 miles)"),  # 0.8km = 0.5 miles
        (1.5, "Within 1 mile"),  # 1.5km = 0.93 miles
        (4.0, "Within 5 miles"),
        (8.0, "Within 5 miles"),  # 8km = 5 miles
        (20.0, "Within 25 miles"),
        (50.0, "31 miles away"),
    ])
    def test_get_fuzzy_location(self, distance_km, expected):
        """测试模糊位置计算"""
        result = get_fuzzy_location(distance_km)
        assert result == expected
    
    @pytest.mark.parametrize("location_name,expected", [
        ("123 Main St, Blacksburg, VA 24060", "ZIP 24060"),
        ("Some address with 90210 zip", "ZIP 90210"),
        ("No zip code here", "VT Campus Area"),
        ("", "VT Campus Area"),
        (None, "VT Campus Area"),
    ])
    def test_extract_zip_code(self, location_name, expected):
        """测试邮编提取"""
        result = extract_zip_code(location_name)
        assert result == expected
    
    @pytest.mark.parametrize("distance_km,expected", [
        (0.01, "32 ft"),
        (0.1, "328 ft"),
        (0.5, "0.31 miles"),
        (5.0, "3.1 miles"),
        (20.0, "12 miles"),
    ])
    def test_format_distance(self, distance_km, expected):
        """测试距离格式化"""
        result = format_distance(distance_km)
        assert result == expected


class TestCreateItem:
    """测试创建商品"""
    
    @pytest.mark.asyncio
    async def test_create_item_success(self, mock_user_id, sample_item_data):
        """测试成功创建商品"""
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = {"status": "approved"}
            
            mock_db = AsyncMock(spec=AsyncSession)
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()
            mock_db.add = Mock()
            
            item_in = ItemCreate(**sample_item_data)
            result = await create_item(item_in, mock_db, mock_user_id)
            
            assert result["title"] == sample_item_data["title"]
            assert result["price"] == sample_item_data["price"]
            assert result["user_id"] == mock_user_id
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_item_invalid_category(self, mock_user_id):
        """测试无效分类"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        invalid_data = {
            "title": "Test Item",
            "price": 100.00,
            "category": "invalid_category",
            "location_name": "Test Location",
            "latitude": 37.0,
            "longitude": -80.0,
        }
        
        with pytest.raises(HTTPException) as exc_info:
            item_in = ItemCreate(**invalid_data)
            await create_item(item_in, mock_db, mock_user_id)
        
        assert exc_info.value.status_code == 400
    
    @pytest.mark.asyncio
    async def test_create_item_with_moderation(self, mock_user_id, sample_item_data):
        """测试创建商品触发审核"""
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = {"status": "flagged"}
            
            mock_db = AsyncMock(spec=AsyncSession)
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()
            mock_db.add = Mock()
            
            item_in = ItemCreate(**sample_item_data)
            result = await create_item(item_in, mock_db, mock_user_id)
            
            assert result["moderation_status"] == "flagged"


class TestGetItem:
    """测试获取商品"""
    
    @pytest.mark.asyncio
    async def test_get_item_success(self, mock_user_id, mock_db_result):
        """测试成功获取商品"""
        mock_item = {
            "id": 1,
            "title": "Test Item",
            "price": 100.00,
            "user_id": mock_user_id,
            "status": "active"
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_item))
        
        result = await get_item(1, mock_db)
        
        assert result["id"] == 1
        assert result["title"] == "Test Item"
    
    @pytest.mark.asyncio
    async def test_get_item_not_found(self, mock_db_result):
        """测试获取不存在的商品"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(None))
        
        with pytest.raises(HTTPException) as exc_info:
            await get_item(999, mock_db)
        
        assert exc_info.value.status_code == 404


class TestUpdateItem:
    """测试更新商品"""
    
    @pytest.mark.asyncio
    async def test_update_item_success(self, mock_user_id, mock_db_result):
        """测试成功更新商品"""
        mock_item = Mock(
            id=1,
            title="Old Title",
            price=50.00,
            user_id=mock_user_id,
            original_price=None
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result({"id": 1}))
        mock_db.get = AsyncMock(return_value=mock_item)
        mock_db.commit = AsyncMock()
        
        update_data = ItemUpdate(title="New Title", price=40.00)
        
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = {"status": "approved"}
            
            result = await update_item(1, update_data, mock_db, mock_user_id)
            
            assert result["title"] == "New Title"
            assert result["price"] == 40.00
            assert result["original_price"] == 50.00  # 降价时保存原价
    
    @pytest.mark.asyncio
    async def test_update_item_not_owner(self, mock_user_id):
        """测试非所有者更新商品"""
        mock_item = Mock(
            id=1,
            user_id="different_user_id"
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.get = AsyncMock(return_value=mock_item)
        
        update_data = ItemUpdate(title="New Title")
        
        with pytest.raises(HTTPException) as exc_info:
            await update_item(1, update_data, mock_db, mock_user_id)
        
        assert exc_info.value.status_code == 403


class TestDeleteItem:
    """测试删除商品"""
    
    @pytest.mark.asyncio
    async def test_delete_item_success(self, mock_user_id, mock_db_result):
        """测试成功删除商品"""
        mock_item = Mock(
            id=1,
            user_id=mock_user_id
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result({"id": 1}))
        mock_db.get = AsyncMock(return_value=mock_item)
        mock_db.delete = AsyncMock()
        mock_db.commit = AsyncMock()
        
        result = await delete_item(1, mock_db, mock_user_id)
        
        assert result["message"] == "商品删除成功"
        mock_db.delete.assert_called_once_with(mock_item)


class TestPriceDropDetection:
    """测试降价检测"""
    
    @pytest.mark.asyncio
    async def test_price_drop_detected(self, mock_user_id, mock_db_result):
        """测试检测到降价"""
        mock_item = Mock(
            id=1,
            title="Test Item",
            price=100.00,
            original_price=None,
            user_id=mock_user_id
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result({"id": 1}))
        mock_db.get = AsyncMock(return_value=mock_item)
        mock_db.commit = AsyncMock()
        
        update_data = ItemUpdate(price=80.00)  # 降价 20%
        
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = {"status": "approved"}
            result = await update_item(1, update_data, mock_db, mock_user_id)
            
            assert result["original_price"] == 100.00
            assert result["price"] == 80.00
    
    @pytest.mark.asyncio
    async def test_price_increase_no_original(self, mock_user_id, mock_db_result):
        """测试涨价不保存原价"""
        mock_item = Mock(
            id=1,
            title="Test Item",
            price=100.00,
            original_price=None,
            user_id=mock_user_id
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result({"id": 1}))
        mock_db.get = AsyncMock(return_value=mock_item)
        mock_db.commit = AsyncMock()
        
        update_data = ItemUpdate(price=120.00)  # 涨价
        
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = {"status": "approved"}
            result = await update_item(1, update_data, mock_db, mock_user_id)
            
            assert result["original_price"] is None
