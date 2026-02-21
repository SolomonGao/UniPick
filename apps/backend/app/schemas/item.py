from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# 基础字段
class ItemBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    price: float = Field(..., gt=0) # 价格必须大于 0
    description: Optional[str] = None
    location_name: Optional[str] = None
    category: Optional[str] = None  # 商品分类
    is_location_private: bool = False  # 位置是否保密
    
    # 经纬度输入 (前端传给后端)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

# 创建时需要的字段
class ItemCreate(ItemBase):
    images: List[str] = [] # 图片 URL 列表
    category: Optional[str] = None  # 商品分类

# 读取时返回的字段 (Response)
class ItemResponse(ItemBase):
    id: int
    user_id: UUID
    images: List[str]
    view_count: int = 0
    favorite_count: int = 0  # 收藏数
    original_price: Optional[float] = None  # 原价（降价时显示）
    moderation_status: Optional[str] = None  # 审核状态
    created_at: Optional[datetime] = None
    location_fuzzy: Optional[str] = None  # 模糊位置（保密时显示）

    class Config:
        from_attributes = True # 让 Pydantic 能读取 SQLAlchemy 对象