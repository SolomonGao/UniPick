"""
内容审核 API
提供自动审核和人工审核接口
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import logging

from app.core.database import get_db
from app.core.permissions import require_auth
from app.core.security import get_current_user_id
from app.services.moderation import ModerationService
from app.schemas.errors import ErrorResponse

router = APIRouter()
logger = logging.getLogger(__name__)


# ============ Schemas ============
from pydantic import BaseModel

class ModerationResponse(BaseModel):
    log_id: int
    status: str
    flagged: bool
    categories: dict
    max_score: float

class ModerationReviewRequest(BaseModel):
    log_id: int
    decision: str  # 'approved' or 'rejected'
    note: Optional[str] = None

class ModerationStats(BaseModel):
    total: int
    pending: int
    approved: int
    flagged: int
    rejected: int


# ============ 公开 API (用于触发审核) ============

async def moderate_item(
    db: AsyncSession,
    item_id: str,
    user_id: str,
    title: str,
    description: str
) -> ModerationResponse:
    """
    审核商品内容（供 items API 调用）
    """
    content_text = f"{title}\n{description or ''}"
    
    result = await ModerationService.moderate_content(
        db=db,
        content_type='item',
        content_id=item_id,
        user_id=user_id,
        content_text=content_text
    )
    
    # 更新商品审核状态
    await ModerationService.update_content_moderation_status(
        db, 'item', item_id, result['status'], result['log_id']
    )
    
    return ModerationResponse(**result)


async def moderate_profile(
    db: AsyncSession,
    user_id: str,
    full_name: str = "",
    bio: str = "",
    username: str = ""
) -> ModerationResponse:
    """
    审核用户资料（供 users API 调用）
    """
    content_text = f"{full_name}\n{bio}\n{username}"
    
    result = await ModerationService.moderate_content(
        db=db,
        content_type='profile',
        content_id=user_id,
        user_id=user_id,
        content_text=content_text
    )
    
    # 更新用户资料审核状态
    await ModerationService.update_content_moderation_status(
        db, 'profile', user_id, result['status'], result['log_id']
    )
    
    return ModerationResponse(**result)


# ============ 管理员 API ============

@router.get(
    "/admin/review-queue",
    response_model=List[dict],
    responses={
        401: {"model": ErrorResponse, "description": "未授权"},
        403: {"model": ErrorResponse, "description": "无权限"},
    }
)
async def get_review_queue(
    status: str = Query('flagged', enum=['flagged', 'pending', 'rejected']),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    获取待人工审核的内容（管理员接口）
    """
    # TODO: 添加管理员权限检查
    # if not await is_admin(user_id):
    #     raise HTTPException(status_code=403, detail="无权限")
    
    items = await ModerationService.get_pending_review(db, status, limit, offset)
    return items


@router.post(
    "/admin/review",
    response_model=dict,
    responses={
        200: {"description": "审核完成"},
        400: {"model": ErrorResponse, "description": "参数错误"},
        401: {"model": ErrorResponse, "description": "未授权"},
        403: {"model": ErrorResponse, "description": "无权限"},
    }
)
async def manual_review(
    review: ModerationReviewRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    人工审核内容（管理员接口）
    """
    # TODO: 添加管理员权限检查
    
    if review.decision not in ['approved', 'rejected']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="decision 必须是 'approved' 或 'rejected'"
        )
    
    await ModerationService.manual_review(
        db,
        review.log_id,
        user_id,
        review.decision,
        review.note
    )
    
    return {
        "message": f"内容已{ '通过' if review.decision == 'approved' else '拒绝' }",
        "log_id": review.log_id,
        "decision": review.decision
    }


@router.get(
    "/admin/stats",
    response_model=ModerationStats
)
async def get_moderation_stats(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    获取审核统计（管理员接口）
    """
    # TODO: 添加管理员权限检查
    
    stats = await ModerationService.get_stats(db)
    return ModerationStats(**stats)


@router.get(
    "/admin/logs/{log_id}",
    response_model=dict
)
async def get_moderation_detail(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    获取审核详情（管理员接口）
    """
    from sqlalchemy import text
    
    result = await db.execute(
        text("""
            SELECT 
                m.*,
                p.email as user_email,
                reviewer.email as reviewer_email
            FROM moderation_logs m
            LEFT JOIN profiles p ON m.user_id = p.id
            LEFT JOIN profiles reviewer ON m.reviewed_by = reviewer.id
            WHERE m.id = :log_id
        """),
        {'log_id': log_id}
    )
    
    row = result.mappings().one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    return dict(row)
