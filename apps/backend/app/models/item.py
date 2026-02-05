from sqlalchemy import Column, Integer, String, Float, ARRAY, text
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography # 专业处理地理位置
from app.core.database import Base
from geoalchemy2.shape import to_shape

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
    
    # created_at 等字段由数据库自动处理，这里可以不写，或者写上 server_default