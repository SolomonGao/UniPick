"""
收藏和浏览记录 API
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.item import Item, Favorite, ViewHistory
from app.schemas.item import ItemResponse

router = APIRouter()


@router.post("/{item_id}/view", status_code=status.HTTP_200_OK)
async def record_view(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user_id)
):
    """
    记录商品浏览
    - 增加浏览量
    - 记录用户浏览历史（如果已登录）
    """
    try:
        # 检查商品是否存在
        result = await db.execute(select(Item).where(Item.id == item_id))
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # 增加浏览量
        item.view_count = (item.view_count or 0) + 1
        
        # 如果用户已登录，记录浏览历史
        if user_id:
            # 检查是否已有记录
            result = await db.execute(
                select(ViewHistory).where(
                    ViewHistory.user_id == user_id,
                    ViewHistory.item_id == item_id
                )
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                # 更新浏览时间
                from datetime import datetime
                existing.viewed_at = datetime.utcnow()
            else:
                # 创建新记录
                view_history = ViewHistory(user_id=user_id, item_id=item_id)
                db.add(view_history)
        
        await db.commit()
        return {"message": "View recorded", "view_count": item.view_count}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{item_id}/favorite", status_code=status.HTTP_200_OK)
async def toggle_favorite(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    切换收藏状态
    - 如果已收藏则取消收藏
    - 如果未收藏则添加收藏
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")
    
    try:
        # 检查商品是否存在
        result = await db.execute(select(Item).where(Item.id == item_id))
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # 检查是否已收藏
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
            favorite = Favorite(user_id=user_id, item_id=item_id)
            db.add(favorite)
            await db.commit()
            return {"message": "收藏成功", "is_favorited": True}
            
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}/stats", status_code=status.HTTP_200_OK)
async def get_item_stats(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user_id)
):
    """
    获取商品统计信息
    - 浏览量
    - 收藏数
    - 当前用户是否收藏
    """
    try:
        # 检查商品是否存在
        result = await db.execute(select(Item).where(Item.id == item_id))
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # 获取收藏数
        result = await db.execute(
            select(func.count(Favorite.id)).where(Favorite.item_id == item_id)
        )
        favorite_count = result.scalar()
        
        # 检查当前用户是否收藏
        is_favorited = False
        if user_id:
            result = await db.execute(
                select(Favorite).where(
                    Favorite.user_id == user_id,
                    Favorite.item_id == item_id
                )
            )
            is_favorited = result.scalar_one_or_none() is not None
        
        return {
            "view_count": item.view_count or 0,
            "favorite_count": favorite_count,
            "is_favorited": is_favorited
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/favorites", response_model=List[ItemResponse])
async def get_user_favorites(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    skip: int = 0,
    limit: int = 20
):
    """
    获取用户收藏的商品列表
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")
    
    try:
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
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/view-history", response_model=List[ItemResponse])
async def get_user_view_history(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    skip: int = 0,
    limit: int = 20
):
    """
    获取用户浏览记录
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
        raise HTTPException(status_code=500, detail=str(e))