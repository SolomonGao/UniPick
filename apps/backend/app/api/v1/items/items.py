from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from typing import List, Optional
import logging

from app.core.database import get_db
from app.core.permissions import require_auth, require_item_owner
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemResponse
from app.schemas.errors import ErrorResponse, ValidationErrorResponse, NotFoundErrorResponse
from app.core.security import get_current_user_id

router = APIRouter()
logger = logging.getLogger(__name__)

# 有效的排序字段
VALID_SORT_FIELDS = {"price", "created_at", "distance"}
VALID_SORT_ORDERS = {"asc", "desc"}
VALID_CATEGORIES = {"electronics", "furniture", "books", "clothing", "sports", "music", "others"}

# 地球半径（用于距离计算）
EARTH_RADIUS_KM = 6371
EARTH_RADIUS_MILES = 3959

def get_fuzzy_location(distance_km: float) -> str:
    """获取模糊位置描述（隐私保护）"""
    distance_miles = distance_km * 0.621371
    
    if distance_miles < 0.5:
        return "Very close (within 0.5 miles)"
    elif distance_miles < 1:
        return "Within 1 mile"
    elif distance_miles < 2:
        return "Within 2 miles"
    elif distance_miles < 5:
        return "Within 5 miles"
    elif distance_miles < 10:
        return "Within 10 miles"
    elif distance_miles < 25:
        return "Within 25 miles"
    else:
        return f"{int(distance_miles)} miles away"

def format_distance(distance_km: float) -> str:
    """格式化距离显示"""
    distance_miles = distance_km * 0.621371
    if distance_miles < 0.1:
        return f"{int(distance_miles * 5280)} ft"
    elif distance_miles < 1:
        return f"{distance_miles:.2f} miles"
    elif distance_miles < 10:
        return f"{distance_miles:.1f} miles"
    else:
        return f"{int(distance_miles)} miles"

@router.post(
    "/",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "商品创建成功"},
        400: {"model": ValidationErrorResponse, "description": "参数验证错误"},
        401: {"model": ErrorResponse, "description": "未授权"},
        500: {"model": ErrorResponse, "description": "服务器内部错误"},
    }
)
async def create_item(
    item_in: ItemCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    创建新商品
    - **title**: 商品标题 (2-100字符)
    - **price**: 价格 (必须大于0)
    - **description**: 商品描述 (可选)
    - **category**: 商品分类 (可选)
    - **location_name**: 位置名称 (可选)
    - **latitude**: 纬度 (-90 到 90)
    - **longitude**: 经度 (-180 到 180)
    - **images**: 图片URL列表
    """
    try:
        # 验证分类
        if item_in.category and item_in.category not in VALID_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "InvalidCategory",
                    "message": f"无效的商品分类: {item_in.category}",
                    "details": {"valid_categories": list(VALID_CATEGORIES)}
                }
            )
        
        geo_point = f"POINT({item_in.longitude} {item_in.latitude})"
        
        new_item = Item(
            title=item_in.title,
            price=item_in.price,
            description=item_in.description,
            images=item_in.images,
            location_name=item_in.location_name,
            location=geo_point,
            user_id=user_id,
            category=item_in.category
        )
        
        db.add(new_item)
        await db.commit()
        await db.refresh(new_item)
        
        logger.info(f"用户 {user_id} 创建了商品: {new_item.id}")
        return new_item
        
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        logger.error(f"创建商品数据完整性错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "DataIntegrityError",
                "message": "商品数据验证失败，请检查输入数据",
                "details": {"error_type": type(e).__name__}
            }
        )
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"创建商品数据库错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "DatabaseError",
                "message": "创建商品失败，请稍后重试",
                "details": {"error_type": type(e).__name__}
            }
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"创建商品未知错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalError",
                "message": "服务器内部错误",
                "details": {"error_type": type(e).__name__}
            }
        )

@router.get(
    "/",
    response_model=List[ItemResponse],
    responses={
        400: {"model": ValidationErrorResponse, "description": "参数验证错误"},
        500: {"model": ErrorResponse, "description": "服务器内部错误"},
    }
)
async def list_items(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(12, ge=1, le=100, description="返回记录数限制"),
    keyword: Optional[str] = Query(None, max_length=100, description="关键词搜索"),
    min_price: Optional[float] = Query(None, ge=0, description="最低价格"),
    max_price: Optional[float] = Query(None, ge=0, description="最高价格"),
    category: Optional[str] = Query(None, description="商品分类"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="纬度"),
    lng: Optional[float] = Query(None, ge=-180, le=180, description="经度"),
    radius: Optional[float] = Query(None, gt=0, le=100, description="搜索半径(km)"),
    sort_by: Optional[str] = Query(None, description="排序字段: price, created_at"),
    sort_order: Optional[str] = Query("desc", description="排序方向: asc, desc"),
    exclude_user_id: Optional[str] = Query(None, description="排除指定用户的商品"),
    user_id: Optional[str] = Query(None, description="只显示指定用户的商品"),
):
    """
    搜索商品列表，支持：
    - 分页: skip, limit
    - 关键词: keyword (搜索 title 和 description)
    - 价格范围: min_price, max_price
    - 分类: category
    - 地理位置: lat, lng, radius (km)
    - 排序: sort_by (price/created_at/distance), sort_order (asc/desc)
    
    当提供 lat/lng 时，返回结果会包含：
    - distance: 距离（km）
    - distance_display: 格式化距离
    - location_fuzzy: 模糊位置描述
    """
    # 参数验证
    if sort_by and sort_by not in VALID_SORT_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "InvalidSortField",
                "message": f"无效的排序字段: {sort_by}",
                "details": {"valid_fields": list(VALID_SORT_FIELDS)}
            }
        )
    
    if sort_order and sort_order.lower() not in VALID_SORT_ORDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "InvalidSortOrder",
                "message": f"无效的排序方向: {sort_order}",
                "details": {"valid_orders": list(VALID_SORT_ORDERS)}
            }
        )
    
    if category and category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "InvalidCategory",
                "message": f"无效的分类: {category}",
                "details": {"valid_categories": list(VALID_CATEGORIES)}
            }
        )
    
    # 验证价格范围逻辑
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "InvalidPriceRange",
                "message": "最低价格不能大于最高价格",
                "details": {"min_price": min_price, "max_price": max_price}
            }
        )
    
    # 验证地理位置参数完整性
    geo_params = [lat, lng, radius]
    if any(geo_params) and not all(geo_params):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "IncompleteGeoParams",
                "message": "地理位置搜索需要同时提供 lat, lng 和 radius",
                "details": {"provided": {"lat": lat, "lng": lng, "radius": radius}}
            }
        )
    
    try:
        # 如果有地理位置参数，计算距离并排序
        if lat is not None and lng is not None:
            # 计算距离的表达式
            point = func.ST_GeogFromText(f"POINT({lng} {lat})")
            distance_expr = func.ST_Distance(Item.location, point) / 1000  # 转换为 km
            
            # 构建查询，包含距离
            query = select(Item, distance_expr.label('distance'))
        else:
            query = select(Item)
        
        # 关键词搜索
        if keyword:
            search_filter = or_(
                Item.title.ilike(f"%{keyword}%"),
                Item.description.ilike(f"%{keyword}%")
            )
            query = query.where(search_filter)
        
        # 排除指定用户的商品（优先显示其他卖家的）
        if exclude_user_id:
            query = query.where(Item.user_id != exclude_user_id)
        
        # 只显示指定用户的商品
        if user_id:
            query = query.where(Item.user_id == user_id)
        
        # 价格范围
        if min_price is not None:
            query = query.where(Item.price >= min_price)
        if max_price is not None:
            query = query.where(Item.price <= max_price)
        
        # 分类筛选
        if category:
            query = query.where(Item.category == category)
        
        # 地理位置筛选 (PostGIS)
        if lat is not None and lng is not None and radius is not None:
            # 使用 PostGIS ST_DWithin 计算距离
            point = func.ST_GeogFromText(f"POINT({lng} {lat})")
            query = query.where(
                func.ST_DWithin(
                    Item.location,
                    point,
                    radius * 1000  # 转换为米
                )
            )
        
        # 排序逻辑
        if lat is not None and lng is not None and sort_by == "distance":
            # 按距离排序
            sort_order_lower = sort_order.lower() if sort_order else "asc"
            if sort_order_lower == "desc":
                query = query.order_by(distance_expr.desc())
            else:
                query = query.order_by(distance_expr.asc())
        else:
            # 默认按创建时间或价格排序
            order_column = Item.created_at
            if sort_by == "price":
                order_column = Item.price
            elif sort_by == "created_at":
                order_column = Item.created_at
            
            # 排序方向
            sort_order_lower = sort_order.lower() if sort_order else "desc"
            if sort_order_lower == "asc":
                query = query.order_by(order_column.asc())
            else:
                query = query.order_by(order_column.desc())
        
        # 分页
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        
        # 处理结果
        items_with_distance = []
        if lat is not None and lng is not None:
            # 有距离信息的结果
            for row in result.all():
                item = row[0]
                distance = row[1]
                # 添加距离信息到 item
                item_dict = {
                    "id": item.id,
                    "title": item.title,
                    "price": item.price,
                    "description": item.description,
                    "location_name": item.location_name,
                    "category": item.category,
                    "images": item.images,
                    "user_id": item.user_id,
                    "created_at": item.created_at,
                    "latitude": item.latitude,
                    "longitude": item.longitude,
                    "distance": round(distance, 2) if distance else None,
                    "distance_display": format_distance(distance) if distance else None,
                    "location_fuzzy": get_fuzzy_location(distance) if distance else None
                }
                items_with_distance.append(item_dict)
            return items_with_distance
        else:
            # 无距离信息的结果
            items = result.scalars().all() if hasattr(result, 'scalars') else [row[0] for row in result.all()]
            return items
        
    except SQLAlchemyError as e:
        logger.error(f"数据库查询错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "DatabaseError",
                "message": "数据库查询失败，请稍后重试",
                "details": {"error_type": type(e).__name__}
            }
        )
    except Exception as e:
        logger.error(f"未知错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalError",
                "message": "服务器内部错误",
                "details": {"error_type": type(e).__name__}
            }
        )

@router.get(
    "/{item_id}",
    response_model=ItemResponse,
    responses={
        404: {"model": NotFoundErrorResponse, "description": "商品未找到"},
        422: {"model": ValidationErrorResponse, "description": "参数格式错误"},
    }
)
async def get_item(
    item_id: int = Path(..., gt=0, description="商品ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取单个商品详情
    """
    try:
        query = select(Item).where(Item.id == item_id)
        result = await db.execute(query)
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "ItemNotFound",
                    "message": f"未找到ID为 {item_id} 的商品",
                    "details": {"item_id": item_id}
                }
            )
        
        return item
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"获取商品详情数据库错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "DatabaseError",
                "message": "数据库查询失败，请稍后重试",
                "details": {"error_type": type(e).__name__}
            }
        )


@router.put(
    "/{item_id}",
    response_model=ItemResponse,
    responses={
        200: {"description": "商品更新成功"},
        401: {"model": ErrorResponse, "description": "未授权"},
        403: {"model": ErrorResponse, "description": "无权限"},
        404: {"model": NotFoundErrorResponse, "description": "商品未找到"},
    }
)
async def update_item(
    item_id: int = Path(..., gt=0, description="商品ID"),
    item_update: ItemCreate = None,
    item: Item = Depends(require_item_owner),
    db: AsyncSession = Depends(get_db),
):
    """
    更新商品信息（只有商品所有者可以更新）
    """
    try:
        # 验证分类
        if item_update.category and item_update.category not in VALID_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "InvalidCategory",
                    "message": f"无效的商品分类: {item_update.category}",
                    "details": {"valid_categories": list(VALID_CATEGORIES)}
                }
            )
        
        # 更新字段
        item.title = item_update.title
        item.price = item_update.price
        item.description = item_update.description
        item.category = item_update.category
        item.location_name = item_update.location_name
        item.images = item_update.images
        
        # 更新地理位置
        if item_update.latitude and item_update.longitude:
            item.location = f"POINT({item_update.longitude} {item_update.latitude})"
        
        await db.commit()
        await db.refresh(item)
        
        logger.info(f"用户 {item.user_id} 更新了商品: {item_id}")
        return item
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"更新商品数据库错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "DatabaseError",
                "message": "更新商品失败，请稍后重试",
                "details": {"error_type": type(e).__name__}
            }
        )


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "商品删除成功"},
        401: {"model": ErrorResponse, "description": "未授权"},
        403: {"model": ErrorResponse, "description": "无权限"},
        404: {"model": NotFoundErrorResponse, "description": "商品未找到"},
    }
)
async def delete_item(
    item_id: int = Path(..., gt=0, description="商品ID"),
    item: Item = Depends(require_item_owner),
    db: AsyncSession = Depends(get_db),
):
    """
    删除商品（只有商品所有者可以删除）
    """
    try:
        # 删除商品
        await db.delete(item)
        await db.commit()
        
        logger.info(f"用户 {item.user_id} 删除了商品: {item_id}")
        return {"message": "商品删除成功", "item_id": item_id}
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"删除商品数据库错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "DatabaseError",
                "message": "删除商品失败，请稍后重试",
                "details": {"error_type": type(e).__name__}
            }
        )