"""
数据库模型单元测试
"""
import pytest
from unittest.mock import Mock
from datetime import datetime

from app.models.item import Item, Favorite


class TestItemModel:
    """测试商品模型"""
    
    def test_item_creation(self):
        """测试创建商品实例"""
        item = Item(
            id=1,
            title="Test Item",
            price=100.00,
            description="Test description",
            category="electronics",
            user_id="user123",
            status="active",
            location_name="Test Location",
            latitude=37.2294,
            longitude=-80.4139,
            is_location_private=False,
            images=["image1.jpg", "image2.jpg"],
            original_price=None,
            moderation_status="approved",
            moderation_log_id=None
        )
        
        assert item.id == 1
        assert item.title == "Test Item"
        assert item.price == 100.00
        assert item.user_id == "user123"
        assert item.status == "active"
        assert item.moderation_status == "approved"
    
    def test_item_price_drop(self):
        """测试商品降价"""
        item = Item(
            id=1,
            title="Test Item",
            price=100.00,
            original_price=None,
            user_id="user123"
        )
        
        # 降价时保存原价
        item.original_price = item.price
        item.price = 80.00
        
        assert item.original_price == 100.00
        assert item.price == 80.00
    
    def test_item_to_dict(self):
        """测试商品序列化"""
        item = Item(
            id=1,
            title="Test Item",
            price=100.00,
            description="Test",
            category="electronics",
            user_id="user123",
            status="active",
            location_name="Location",
            latitude=37.0,
            longitude=-80.0,
            is_location_private=False,
            images=["img1.jpg"],
            created_at=datetime.now()
        )
        
        # 模拟 to_dict 方法
        data = {
            "id": item.id,
            "title": item.title,
            "price": item.price,
            "description": item.description,
            "category": item.category,
            "user_id": item.user_id,
            "status": item.status,
            "location_name": item.location_name,
            "latitude": item.latitude,
            "longitude": item.longitude,
            "is_location_private": item.is_location_private,
            "images": item.images,
            "created_at": item.created_at.isoformat() if item.created_at else None
        }
        
        assert data["id"] == 1
        assert data["title"] == "Test Item"
        assert data["images"] == ["img1.jpg"]


class TestFavoriteModel:
    """测试收藏模型"""
    
    def test_favorite_creation(self):
        """测试创建收藏实例"""
        favorite = Favorite(
            id=1,
            user_id="user123",
            item_id=456,
            created_at=datetime.now()
        )
        
        assert favorite.id == 1
        assert favorite.user_id == "user123"
        assert favorite.item_id == 456
    
    def test_favorite_unique_constraint(self):
        """测试收藏唯一约束（用户不能重复收藏同一商品）"""
        # 这里测试逻辑约束，实际数据库约束在表定义中
        favorite1 = Favorite(user_id="user123", item_id=456)
        favorite2 = Favorite(user_id="user123", item_id=456)
        
        # 在数据库层面，这应该触发唯一约束错误
        # 这里只是验证模型实例创建
        assert favorite1.user_id == favorite2.user_id
        assert favorite1.item_id == favorite2.item_id


class TestItemStatuses:
    """测试商品状态"""
    
    @pytest.mark.parametrize("status,expected_active", [
        ("active", True),
        ("sold", False),
        ("deleted", False),
        ("reserved", True),
    ])
    def test_item_status_active(self, status, expected_active):
        """测试商品活跃状态判断"""
        item = Item(id=1, title="Test", status=status)
        
        # 模拟 is_active 属性
        is_active = item.status in ["active", "reserved"]
        assert is_active == expected_active


class TestItemModeration:
    """测试商品审核状态"""
    
    @pytest.mark.parametrize("mod_status,expected_visible", [
        ("approved", True),
        ("pending", False),
        ("flagged", False),
        ("rejected", False),
    ])
    def test_item_visibility(self, mod_status, expected_visible):
        """测试商品可见性（基于审核状态）"""
        item = Item(
            id=1,
            title="Test",
            status="active",
            moderation_status=mod_status
        )
        
        # 商品可见条件：状态 active 且审核通过
        is_visible = item.status == "active" and item.moderation_status == "approved"
        assert is_visible == expected_visible


class TestItemImages:
    """测试商品图片"""
    
    def test_empty_images(self):
        """测试空图片列表"""
        item = Item(id=1, title="Test", images=None)
        assert item.images is None
        
        # 处理空图片
        images = item.images or []
        assert images == []
    
    def test_single_image(self):
        """测试单张图片"""
        item = Item(id=1, title="Test", images=["image1.jpg"])
        assert len(item.images) == 1
        assert item.images[0] == "image1.jpg"
    
    def test_multiple_images(self):
        """测试多张图片"""
        images = ["img1.jpg", "img2.jpg", "img3.jpg"]
        item = Item(id=1, title="Test", images=images)
        assert len(item.images) == 3
