from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.shape import from_shape
from shapely.geometry import Point # 需要 pip install shapely

from app.core.database import get_db
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemResponse

from app.core.security import get_current_user_id

router = APIRouter()

@router.post("/", response_model=ItemResponse)
async def create_item(
    item_in: ItemCreate,
    # 依赖注入 DB Session
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    # 1. 处理地理位置 (把经纬度转成 PostGIS 格式)
    # WKT 格式: "POINT(-77.0364 38.8951)"
    geo_point = f"POINT({item_in.longitude} {item_in.latitude})"
    
    # 2. 创建 ORM 对象
    new_item = Item(
        title=item_in.title,
        price=item_in.price,
        description=item_in.description,
        images=item_in.images,
        location_name=item_in.location_name,
        location=geo_point, # GeoAlchemy 会自动处理
        user_id=user_id
    )
    
    # 3. 写入数据库
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    
    # 4. 返回之前，我们需要把 PostGIS 对象转回经纬度给前端吗？
    # 通常 Pydantic 只能处理基础类型。
    # 这里为了演示简单，Schema 里暂时把 location 字段去掉了，只返回了 lat/long 的输入值
    return new_item