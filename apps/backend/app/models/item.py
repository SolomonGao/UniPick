from sqlalchemy import Column, Integer, String, Float, ARRAY, DateTime, text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography # 专业处理地理位置
from sqlalchemy.orm import relationship
from app.core.database import Base
from geoalchemy2.shape import to_shape
from datetime import datetime

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False) # 对应 Supabase Auth 的 UUID
    title = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    images = Column(ARRAY(String)) # 对应 Postgres 的 text[] 数组
    
    # 📍 核心：地理位置字段
    # srid=4326 代表 GPS 经纬度
    location = Column(Geography(geometry_type='POINT', srid=4326))
    location_name = Column(String)
    
    # 商品分类
    category = Column(String, nullable=True)
    
    # 浏览量统计
    view_count = Column(Integer, default=0, server_default=text('0'))
    
    # 创建时间
    created_at = Column(DateTime, default=datetime.utcnow, server_default=text('NOW()'))
    
    # 关系
    favorites = relationship("Favorite", back_populates="item", cascade="all, delete-orphan")
    
    @property
    def latitude(self) -> float:
        """从 PostGIS location 字段获取纬度"""
        if self.location:
            return to_shape(self.location).y
        return 0.0
    
    @property
    def longitude(self) -> float:
        """从 PostGIS location 字段获取经度"""
        if self.location:
            return to_shape(self.location).x
        return 0.0


class Favorite(Base):
    """用户收藏表"""
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=text('NOW()'))
    
    # 唯一约束：一个用户不能重复收藏同一个商品
    __table_args__ = (
        UniqueConstraint('user_id', 'item_id', name='uix_user_item_favorite'),
    )
    
    # 关系
    item = relationship("Item", back_populates="favorites")


class ViewHistory(Base):
    """用户浏览记录表"""
    __tablename__ = "view_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    viewed_at = Column(DateTime, default=datetime.utcnow, server_default=text('NOW()'))
    
    # 唯一约束：一个用户对同一个商品只保留最新的一条记录
    __table_args__ = (
        UniqueConstraint('user_id', 'item_id', name='uix_user_item_view'),
    )