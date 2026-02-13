from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from typing import List, Optional

from app.core.database import get_db
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemResponse
from app.core.security import get_current_user_id

router = APIRouter()

@router.post("/", response_model=ItemResponse)
async def create_item(
    item_in: ItemCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    geo_point = f"POINT({item_in.longitude} {item_in.latitude})"
    
    new_item = Item(
        title=item_in.title,
        price=item_in.price,
        description=item_in.description,
        images=item_in.images,
        location_name=item_in.location_name,
        location=geo_point,
        user_id=user_id
    )
    
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    
    return new_item

@router.get("/", response_model=List[ItemResponse])
async def list_items(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 12,
    keyword: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = None,  # km
):
    """
    搜索商品列表，支持：
    - 分页: skip, limit
    - 关键词: keyword (搜索 title 和 description)
    - 价格范围: min_price, max_price
    - 分类: category
    - 地理位置: lat, lng, radius (km)
    """
    query = select(Item)
    
    # 关键词搜索
    if keyword:
        search_filter = or_(
            Item.title.ilike(f"%{keyword}%"),
            Item.description.ilike(f"%{keyword}%")
        )
        query = query.where(search_filter)
    
    # 价格范围
    if min_price is not None:
        query = query.where(Item.price >= min_price)
    if max_price is not None:
        query = query.where(Item.price <= max_price)
    
    # 分类筛选 (需要先添加 category 字段到模型)
    # if category:
    #     query = query.where(Item.category == category)
    
    # 地理位置筛选 (PostGIS)
    if lat is not None and lng is not None and radius is not None:
        # 使用 PostGIS ST_DWithin 计算距离
        point = f"POINT({lng} {lat})"
        query = query.where(
            func.ST_DWithin(
                Item.location,
                func.ST_GeogFromText(point),
                radius * 1000  # 转换为米
            )
        )
    
    # 排序和分页
    query = query.order_by(Item.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return items

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(Item).where(Item.id == item_id)
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return item