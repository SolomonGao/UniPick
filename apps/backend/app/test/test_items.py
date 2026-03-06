"""
Items API 测试

测试商品相关的所有 API 端点：
- POST   /api/v1/items/          创建商品
- GET    /api/v1/items/          获取商品列表
- GET    /api/v1/items/{id}      获取商品详情
- PUT    /api/v1/items/{id}      更新商品
- DELETE /api/v1/items/{id}      删除商品
"""
import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.items.items import (
    create_item,
    list_items,
    get_item,
    update_item,
    delete_item,
    VALID_CATEGORIES,
    get_fuzzy_location,
    extract_zip_code,
    format_distance,
    EARTH_RADIUS_KM,
    EARTH_RADIUS_MILES
)
from app.models.item import Item
from app.schemas.item import ItemCreate


class TestItemUtils:
    """测试商品工具函数"""
    
    @pytest.mark.parametrize("distance_km,expected", [
        (0.1, "Very close (within 0.5 miles)"),
        (0.8, "Very close (within 0.5 miles)"),
        (1.5, "Within 1 mile"),
        (3.0, "Within 2 miles"),
        (4.0, "Within 5 miles"),
        (8.0, "Within 5 miles"),
        (15.0, "Within 10 miles"),
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
        ("12345-6789 format", "ZIP 12345"),
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
        (0.05, "164 ft"),
        (0.1, "328 ft"),
        (0.5, "0.31 miles"),
        (5.0, "3.1 miles"),
        (20.0, "12 miles"),
        (50.0, "31 miles"),
    ])
    def test_format_distance(self, distance_km, expected):
        """测试距离格式化"""
        result = format_distance(distance_km)
        assert result == expected


class TestCreateItem:
    """测试创建商品 API"""
    
    @pytest.mark.asyncio
    async def test_create_item_success(self, mock_user_id, sample_item_data, mock_moderation_result_clean):
        """测试成功创建商品"""
        with patch("app.api.v1.items.items.moderate_item") as mock_moderate:
            mock_moderate.return_value = Mock(status="approved", **mock_moderation_result_clean)
            
            mock_db = AsyncMock(spec=AsyncSession)
            mock_db.commit = AsyncMock()
            mock_db.refresh = AsyncMock()
            mock_db.add = Mock()
            
            item_in = ItemCreate(**sample_item_data)
            
            # 模拟 rate limiter
            with patch("app.api.v1.items.items.limiter"):
                result = await create_item(
                    request=Mock(),
                    item_in=item_in,
                    db=mock_db,
                    user_id=mock_user_id
                )
            
            assert result.title == sample_item_data["title"]
            assert float(result.price) == sample_item_data["price"]
            assert result.user_id == mock_user_id
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_item_invalid_category(self, mock_user_id, sample_item_data):
        """测试无效分类"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        invalid_data = sample_item_data.copy()
        invalid_data["category"] = "invalid_category"
        
        item_in = ItemCreate(**invalid_data)
        
        with pytest.raises(HTTPException) as exc_info:
            await create_item(
                request=Mock(),
                item_in=item_in,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "InvalidCategory" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_create_item_too_many_images(self, mock_user_id, sample_item_data):
        """测试图片数量超限"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        invalid_data = sample_item_data.copy()
        invalid_data["images"] = ["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"]
        
        item_in = ItemCreate(**invalid_data)
        
        with pytest.raises(HTTPException) as exc_info:
            await create_item(
                request=Mock(),
                item_in=item_in,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "TooManyImages" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_create_item_invalid_image_url(self, mock_user_id, sample_item_data):
        """测试无效图片 URL"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        invalid_data = sample_item_data.copy()
        invalid_data["images"] = ["not_a_valid_url"]
        
        item_in = ItemCreate(**invalid_data)
        
        with pytest.raises(HTTPException) as exc_info:
            await create_item(
                request=Mock(),
                item_in=item_in,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "InvalidImageUrl" in str(exc_info.value.detail)


class TestListItems:
    """测试获取商品列表 API"""
    
    @pytest.mark.asyncio
    async def test_list_items_success(self, mock_db_result):
        """测试成功获取商品列表"""
        mock_items = [
            Mock(id=1, title="Item 1", price=100.0, category="electronics"),
            Mock(id=2, title="Item 2", price=200.0, category="books")
        ]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_items, scalar_value=2))
        
        with patch("app.api.v1.items.items.limiter"):
            result = await list_items(
                request=Mock(),
                db=mock_db,
                skip=0,
                limit=12
            )
        
        assert len(result["items"]) == 2
        assert result["total"] == 2
        assert result["page"] == 1
    
    @pytest.mark.asyncio
    async def test_list_items_with_filters(self, mock_db_result):
        """测试带筛选条件的商品列表"""
        mock_items = [Mock(id=1, title="Item 1", price=100.0, category="electronics")]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_items, scalar_value=1))
        
        with patch("app.api.v1.items.items.limiter"):
            result = await list_items(
                request=Mock(),
                db=mock_db,
                skip=0,
                limit=12,
                category="electronics",
                min_price=50.0,
                max_price=200.0
            )
        
        assert len(result["items"]) == 1
    
    @pytest.mark.asyncio
    async def test_list_items_invalid_sort_field(self):
        """测试无效排序字段"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        with pytest.raises(HTTPException) as exc_info:
            with patch("app.api.v1.items.items.limiter"):
                await list_items(
                    request=Mock(),
                    db=mock_db,
                    sort_by="invalid_field"
                )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    
    @pytest.mark.asyncio
    async def test_list_items_price_range_validation(self):
        """测试价格范围验证"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        with pytest.raises(HTTPException) as exc_info:
            with patch("app.api.v1.items.items.limiter"):
                await list_items(
                    request=Mock(),
                    db=mock_db,
                    min_price=200.0,
                    max_price=100.0
                )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "最低价格不能大于最高价格" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_list_items_with_location(self, mock_db_result, mock_user_id):
        """测试带地理位置筛选"""
        mock_item = Mock(
            id=1, 
            title="Nearby Item", 
            price=100.0,
            latitude=37.2294,
            longitude=-80.4139,
            location_name="VT Campus",
            user_id=mock_user_id,
            is_location_private=False,
            moderation_status="approved",
            view_count=5,
            images=[],
            created_at=Mock(isoformat=Mock(return_value="2024-01-01T00:00:00"))
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result([mock_item], scalar_value=1))
        
        with patch("app.api.v1.items.items.limiter"):
            result = await list_items(
                request=Mock(),
                db=mock_db,
                skip=0,
                limit=12,
                lat=37.2294,
                lng=-80.4139,
                radius=10.0,
                sort_by="distance"
            )
        
        assert len(result["items"]) == 1


class TestGetItem:
    """测试获取商品详情 API"""
    
    @pytest.mark.asyncio
    async def test_get_item_success(self, mock_user_id, mock_item_model, mock_db_result):
        """测试成功获取商品详情"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(scalar_value=mock_item_model))
        
        with patch("app.api.v1.items.items.is_admin_user", return_value=False):
            result = await get_item(
                item_id=12345,
                db=mock_db,
                current_user_id=mock_user_id
            )
        
        assert result["id"] == mock_item_model.id
        assert result["title"] == mock_item_model.title
        assert result["price"] == mock_item_model.price
    
    @pytest.mark.asyncio
    async def test_get_item_not_found(self, mock_db_result):
        """测试商品不存在"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(scalar_value=None))
        
        with pytest.raises(HTTPException) as exc_info:
            await get_item(
                item_id=99999,
                db=mock_db,
                current_user_id=None
            )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_get_item_pending_not_owner(self, mock_user_id, mock_db_result):
        """测试非所有者访问待审核商品"""
        mock_item = Mock(
            id=12345,
            user_id="different_user_id",
            moderation_status="pending",
            latitude=37.0,
            longitude=-80.0,
            is_location_private=False
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(scalar_value=mock_item))
        
        with patch("app.api.v1.items.items.is_admin_user", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await get_item(
                    item_id=12345,
                    db=mock_db,
                    current_user_id=mock_user_id
                )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_get_item_location_private(self, mock_user_id, mock_db_result):
        """测试私密位置商品"""
        mock_item = Mock(
            id=12345,
            user_id="different_user_id",
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
        
        # 验证位置被模糊处理
        assert result["latitude"] == round(37.229456, 2)
        assert result["longitude"] == round(-80.413978, 2)
        assert result["location_fuzzy"] == "ZIP 24060"


class TestUpdateItem:
    """测试更新商品 API"""
    
    @pytest.mark.asyncio
    async def test_update_item_success(self, mock_user_id, mock_item_model):
        """测试成功更新商品"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        update_data = {
            "title": "Updated Title",
            "price": 150.0,
            "description": "Updated description",
            "category": "furniture",
            "images": ["https://example.com/new.jpg"],
            "latitude": 37.23,
            "longitude": -80.41,
            "location_name": "New Location",
            "is_location_private": True
        }
        
        result = await update_item(
            item_id=12345,
            item_update=ItemCreate(**update_data),
            item=mock_item_model,
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert result.title == "Updated Title"
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_item_invalid_category(self, mock_user_id, mock_item_model):
        """测试更新时无效分类"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        update_data = {
            "title": "Updated Title",
            "price": 150.0,
            "category": "invalid_category",
            "latitude": 37.23,
            "longitude": -80.41,
            "location_name": "New Location",
            "is_location_private": False
        }
        
        with pytest.raises(HTTPException) as exc_info:
            await update_item(
                item_id=12345,
                item_update=ItemCreate(**update_data),
                item=mock_item_model,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST


class TestDeleteItem:
    """测试删除商品 API"""
    
    @pytest.mark.asyncio
    async def test_delete_item_success(self, mock_user_id, mock_item_model):
        """测试成功删除商品"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.delete = AsyncMock()
        mock_db.commit = AsyncMock()
        
        result = await delete_item(
            item_id=12345,
            item=mock_item_model,
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert result["message"] == "Item deleted successfully"
        mock_db.delete.assert_called_once_with(mock_item_model)
        mock_db.commit.assert_called_once()
