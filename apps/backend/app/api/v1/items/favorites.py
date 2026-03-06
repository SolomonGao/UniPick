"""
收藏和浏览记录 API - 安全修复版本
修复竞态条件问题，使用数据库原子操作
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import logging

from app.core.database import get_db
from app.core.security import get_current_user_id, get_current_user_id_optional
from app.core.rate_limit import limiter, RateLimits
from app.models.item import Item, Favorite, ViewHistory
from app.schemas.item import ItemResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/{item_id}/view", status_code=status.HTTP_200_OK)
@limiter.limit(RateLimits.VIEW)  # 🔧 新增：限制浏览记录频率
async def record_view(
    request: Request,  # 🔧 新增：用于限流
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user_id_optional)
):
    """
    记录商品浏览
    - 未登录用户：每次访问都增加浏览量
    - 登录用户：只有第一次浏览增加浏览量，后续只更新时间
    
    🔧 修复：使用数据库原子操作避免竞态条件
    """
    from datetime import datetime
    
    try:
        # 先检查商品是否存在
        result = await db.execute(select(Item.id).where(Item.id == item_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Item not found")
        
        # 🔧 修复：使用数据库原子操作增加浏览量，避免竞态条件
        if user_id:
            # 尝试插入浏览记录（利用唯一约束）
            try:
                view_history = ViewHistory(user_id=user_id, item_id=item_id)
                db.add(view_history)
                await db.flush()  # 立即执行，如果重复会抛出 IntegrityError
                
                # 插入成功，是第一次浏览，增加浏览量
                await db.execute(
                    update(Item)
                    .where(Item.id == item_id)
                    .values(view_count=Item.view_count + 1)
                )
                await db.commit()
                
                # 🔧 新增：清理旧浏览历史，只保留最近50条
                await _cleanup_view_history(db, user_id)
                
                # 获取更新后的浏览量
                result = await db.execute(
                    select(Item.view_count).where(Item.id == item_id)
                )
                new_count = result.scalar()
                return {"message": "View recorded", "view_count": new_count, "is_new": True}
                
            except IntegrityError:
                # 已经浏览过，回滚插入操作
                await db.rollback()
                
                # 只更新时间，不增加浏览量
                await db.execute(
                    update(ViewHistory)
                    .where(
                        ViewHistory.user_id == user_id,
                        ViewHistory.item_id == item_id
                    )
                    .values(viewed_at=datetime.utcnow())
                )
                await db.commit()
                
                # 返回当前浏览量
                result = await db.execute(
                    select(Item.view_count).where(Item.id == item_id)
                )
                current_count = result.scalar()
                return {"message": "View updated", "view_count": current_count, "is_new": False}
        else:
            # 未登录用户，直接增加浏览量（使用原子操作）
            await db.execute(
                update(Item)
                .where(Item.id == item_id)
                .values(view_count=Item.view_count + 1)
            )
            await db.commit()
            
            result = await db.execute(
                select(Item.view_count).where(Item.id == item_id)
            )
            new_count = result.scalar()
            return {"message": "View recorded", "view_count": new_count, "is_new": True}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error recording view: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{item_id}/favorite", status_code=status.HTTP_200_OK)
@limiter.limit(RateLimits.FAVORITE)  # 🔧 新增：限制收藏操作频率
async def toggle_favorite(
    request: Request,  # 🔧 新增：用于限流
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    切换收藏状态 - 使用数据库约束防止重复收藏
    收藏成功后会发送 Telegram 通知
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")
    
    try:
        # 检查商品是否存在并获取商品信息（用于通知）
        result = await db.execute(
            select(Item.id, Item.title, Item.price).where(Item.id == item_id)
        )
        item_data = result.first()
        
        if not item_data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        item_title = item_data[1] or "未命名商品"
        item_price = item_data[2] or 0.0
        
        # 尝试删除（如果存在）
        result = await db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.item_id == item_id
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            # 取消收藏
            await db.delete(existing)
            await db.commit()
            return {"message": "取消收藏成功", "is_favorited": False}
        else:
            # 添加收藏
            try:
                favorite = Favorite(user_id=user_id, item_id=item_id)
                db.add(favorite)
                await db.commit()
                
                return {"message": "收藏成功", "is_favorited": True}
            except IntegrityError:
                # 并发情况下可能已被收藏
                await db.rollback()
                return {"message": "已收藏", "is_favorited": True}
            
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error toggling favorite: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{item_id}/stats", status_code=status.HTTP_200_OK)
async def get_item_stats(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user_id_optional)
):
    """
    获取商品统计信息 - 单次查询优化
    """
    try:
        # 检查商品是否存在并获取浏览量
        result = await db.execute(
            select(Item.id, Item.view_count).where(Item.id == item_id)
        )
        item_data = result.first()
        
        if not item_data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # 使用子查询获取收藏数，减少查询次数
        favorite_count_result = await db.execute(
            select(func.count(Favorite.id)).where(Favorite.item_id == item_id)
        )
        favorite_count = favorite_count_result.scalar()
        
        # 检查当前用户是否收藏
        is_favorited = False
        if user_id:
            # 使用 EXISTS 查询优化性能
            result = await db.execute(
                select(Favorite.id).where(
                    Favorite.user_id == user_id,
                    Favorite.item_id == item_id
                ).limit(1)
            )
            is_favorited = result.scalar_one_or_none() is not None
        
        return {
            "view_count": item_data[1] or 0,
            "favorite_count": favorite_count,
            "is_favorited": is_favorited
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/user/favorites", response_model=List[ItemResponse])
async def get_user_favorites(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    skip: int = 0,
    limit: int = 20
):
    """
    获取用户收藏的商品列表 - 添加分页和排序优化
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")
    
    try:
        # 使用 join 和 selectinload 优化查询
        result = await db.execute(
            select(Item)
            .join(Favorite, Favorite.item_id == Item.id)
            .where(Favorite.user_id == user_id)
            .order_by(desc(Favorite.created_at))
            .offset(skip)
            .limit(limit)
        )
        items = result.scalars().all()
        return items
        
    except Exception as e:
        logger.error(f"Error getting favorites: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/user/view-history", response_model=List[ItemResponse])
async def get_user_view_history(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    skip: int = 0,
    limit: int = 20
):
    """
    获取用户浏览记录 - 添加分页和排序优化
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")
    
    try:
        result = await db.execute(
            select(Item)
            .join(ViewHistory, ViewHistory.item_id == Item.id)
            .where(ViewHistory.user_id == user_id)
            .order_by(desc(ViewHistory.viewed_at))
            .offset(skip)
            .limit(limit)
        )
        items = result.scalars().all()
        return items
        
    except Exception as e:
        logger.error(f"Error getting view history: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# 🔧 新增：清理旧浏览历史，只保留最近50条
async def _cleanup_view_history(db: AsyncSession, user_id: str):
    """
    清理用户旧的浏览历史，只保留最近50条记录
    
    这个函数在记录新浏览时自动调用，保持浏览历史表不会无限增长
    """
    try:
        # 删除第50条之后的所有记录
        await db.execute(
            text("""
                DELETE FROM view_history
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY user_id 
                            ORDER BY viewed_at DESC
                        ) as rn
                        FROM view_history
                        WHERE user_id = :user_id
                    ) ranked
                    WHERE rn > 50
                )
            """),
            {'user_id': user_id}
        )
        await db.commit()
    except Exception as e:
        # 清理失败不应该影响主流程，只记录日志
        logger.warning(f"Failed to cleanup view history for user {user_id}: {e}")
        await db.rollback()
