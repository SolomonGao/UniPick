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
    
    # 经纬度输入 (前端传给后端)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

# 创建时需要的字段
class ItemCreate(ItemBase):
    images: List[str] = [] # 图片 URL 列表

# 读取时返回的字段 (Response)
class ItemResponse(ItemBase):
    id: int
    user_id: UUID
    images: List[str]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True # 让 Pydantic 能读取 SQLAlchemy 对象