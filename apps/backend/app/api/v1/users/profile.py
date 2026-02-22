from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import logging
import uuid

from app.core.database import get_db
from app.core.permissions import require_auth, is_admin_user, require_admin
from app.core.security import get_current_user_id, get_current_user_id_optional
from app.api.v1.moderation import moderate_profile
from app.schemas.errors import ErrorResponse, ValidationErrorResponse

router = APIRouter()
logger = logging.getLogger(__name__)


# ============ Schemas ============
from pydantic import BaseModel, Field

class UserProfileResponse(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    campus: Optional[str] = None
    university: Optional[str] = None
    notification_email: bool = True
    show_phone: bool = False
    role: Optional[str] = None
    is_admin: bool = False
    moderation_status: Optional[str] = None  # 审核状态
    moderation_log_id: Optional[int] = None  # 审核日志ID
    created_at: Optional[str] = None

class UserProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=50)
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    campus: Optional[str] = Field(None, max_length=100)
    university: Optional[str] = Field(None, max_length=100)
    notification_email: Optional[bool] = None
    show_phone: Optional[bool] = None


# ============ Helper Functions ============

async def get_profile_with_display(db: AsyncSession, user_id: str, is_owner: bool = False):
    """
    获取用户资料
    
    原则：
    - 自己查看：返回最新资料（无论审核状态）
    - 他人查看：如果审核中，返回已审核的 display_ 版本
    """
    from sqlalchemy import text
    
    result = await db.execute(
        text("""
            SELECT 
                id, email, username, full_name, bio, avatar_url,
                display_username, display_full_name, display_bio,
                phone, campus, university, notification_email, show_phone,
                role, moderation_status, moderation_log_id, created_at
            FROM profiles 
            WHERE id = :user_id
        """),
        {"user_id": user_id}
    )
    profile = result.mappings().one_or_none()
    
    if not profile:
        return None
    
    # 判断审核状态
    is_pending = profile.get("moderation_status") in ['pending', 'flagged']
    
    # 自己查看：返回最新资料
    # 他人查看且审核中：返回 display_ 版本（已审核的老资料）
    if is_owner or not is_pending:
        # 返回最新资料
        return {
            "id": str(profile["id"]),
            "email": profile["email"],
            "username": profile.get("username"),
            "full_name": profile.get("full_name"),
            "bio": profile.get("bio"),
            "avatar_url": profile.get("avatar_url"),
            "phone": profile.get("phone"),
            "campus": profile.get("campus"),
            "university": profile.get("university"),
            "notification_email": profile.get("notification_email", True),
            "show_phone": profile.get("show_phone", False),
            "role": profile.get("role", "user"),
            "moderation_status": profile.get("moderation_status", "approved"),
            "moderation_log_id": profile.get("moderation_log_id"),
            "created_at": str(profile["created_at"]) if profile.get("created_at") else None
        }
    else:
        # 他人查看且审核中：返回 display_ 版本
        return {
            "id": str(profile["id"]),
            "email": profile["email"],
            "username": profile.get("display_username") or profile.get("username"),
            "full_name": profile.get("display_full_name") or profile.get("full_name"),
            "bio": profile.get("display_bio") or profile.get("bio"),
            "avatar_url": profile.get("avatar_url"),
            "phone": profile.get("phone"),
            "campus": profile.get("campus"),
            "university": profile.get("university"),
            "notification_email": profile.get("notification_email", True),
            "show_phone": profile.get("show_phone", False),
            "role": profile.get("role", "user"),
            "moderation_status": "approved",  # 对外显示为已审核
            "moderation_log_id": None,
            "created_at": str(profile["created_at"]) if profile.get("created_at") else None
        }


# ============ API Routes ============

@router.get(
    "/me",
    response_model=UserProfileResponse,
    responses={
        200: {"description": "获取成功"},
        401: {"model": ErrorResponse, "description": "未授权"},
    }
)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """获取当前用户资料（自己查看，返回最新资料）"""
    try:
        profile = await get_profile_with_display(db, str(user_id), is_owner=True)
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户资料不存在"
            )
        
        # 检查是否为管理员
        is_admin = await is_admin_user(str(user_id), db)
        profile["is_admin"] = is_admin
        
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户资料失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户资料失败"
        )


@router.get(
    "/{user_id}/public",
    response_model=UserProfileResponse
)
async def get_public_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[str] = Depends(get_current_user_id_optional)
):
    """
    获取用户公开资料
    
    原则：
    - 如果资料审核中，返回已审核的 display_ 版本
    - 如果资料已审核，返回最新版本
    """
    try:
        is_owner = str(current_user_id) == str(user_id) if current_user_id else False
        profile = await get_profile_with_display(db, user_id, is_owner=is_owner)
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户资料不存在"
            )
        
        profile["is_admin"] = False
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户资料失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户资料失败"
        )


@router.put(
    "/me",
    response_model=UserProfileResponse,
    responses={
        200: {"description": "更新成功"},
        400: {"model": ValidationErrorResponse, "description": "参数错误"},
        401: {"model": ErrorResponse, "description": "未授权"},
    }
)
async def update_my_profile(
    profile_update: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    更新当前用户资料
    
    注意：
    - 修改 username/full_name/bio 会触发重新审核
    - 审核中只有自己能看到新资料，他人看到 display_ 版本（老资料）
    """
    try:
        from sqlalchemy import text
        
        # 获取当前资料
        result = await db.execute(
            text("SELECT moderation_status FROM profiles WHERE id = :user_id"),
            {"user_id": user_id}
        )
        current = result.mappings().one_or_none()
        was_rejected = current and current.get("moderation_status") == "rejected"
        
        # 构建更新字段
        update_fields = []
        params = {"user_id": user_id}
        needs_review = False
        
        if profile_update.username is not None:
            update_fields.append("username = :username")
            params["username"] = profile_update.username
            needs_review = True  # 修改用户名需要审核
            
        if profile_update.full_name is not None:
            update_fields.append("full_name = :full_name")
            params["full_name"] = profile_update.full_name
            needs_review = True  # 修改姓名需要审核
            
        if profile_update.bio is not None:
            update_fields.append("bio = :bio")
            params["bio"] = profile_update.bio
            needs_review = True  # 修改简介需要审核
            
        if profile_update.phone is not None:
            update_fields.append("phone = :phone")
            params["phone"] = profile_update.phone
            # 电话修改不需要审核
            
        if profile_update.campus is not None:
            update_fields.append("campus = :campus")
            params["campus"] = profile_update.campus
            # 学校信息修改不需要审核
            
        if profile_update.university is not None:
            update_fields.append("university = :university")
            params["university"] = profile_update.university
            # 学校信息修改不需要审核
            
        if profile_update.notification_email is not None:
            update_fields.append("notification_email = :notification_email")
            params["notification_email"] = profile_update.notification_email
            # 通知设置修改不需要审核
            
        if profile_update.show_phone is not None:
            update_fields.append("show_phone = :show_phone")
            params["show_phone"] = profile_update.show_phone
            # 隐私设置修改不需要审核
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="没有提供要更新的字段"
            )
        
        # 🔴 关键：如果修改了需要审核的字段，重置为 pending
        if needs_review:
            update_fields.append("moderation_status = 'pending'")
            update_fields.append("moderation_log_id = NULL")
            if was_rejected:
                logger.info(f"用户 {user_id} 资料曾被拒绝，修改后重新进入审核")
            else:
                logger.info(f"用户 {user_id} 修改资料，进入审核流程")
        
        # 执行更新
        query = text(f"UPDATE profiles SET {', '.join(update_fields)} WHERE id = :user_id RETURNING *")
        result = await db.execute(query, params)
        await db.commit()
        
        updated = result.mappings().one_or_none()
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户资料不存在"
            )
        
        # 🔴 触发 AI 自动审核（如果修改了需要审核的字段）
        if needs_review:
            try:
                moderation_result = await moderate_profile(
                    db=db,
                    user_id=str(user_id),
                    full_name=updated.get("full_name", ""),
                    bio=updated.get("bio", ""),
                    username=updated.get("username", "")
                )
                logger.info(f"用户 {user_id} 资料AI审核完成: {moderation_result.status}")
                # 如果AI审核发现问题，已经更新为 flagged/rejected
                # 如果没有问题，保持 pending 等待人工审核
            except Exception as e:
                logger.error(f"用户 {user_id} 资料审核失败: {e}")
                # 出错时保持 pending 状态，等待人工审核
        
        return {
            "id": str(updated["id"]),
            "email": updated["email"],
            "username": updated.get("username"),
            "full_name": updated.get("full_name"),
            "avatar_url": updated.get("avatar_url"),
            "bio": updated.get("bio"),
            "phone": updated.get("phone"),
            "campus": updated.get("campus"),
            "university": updated.get("university"),
            "notification_email": updated.get("notification_email", True),
            "show_phone": updated.get("show_phone", False),
            "moderation_status": updated.get("moderation_status", "approved"),
            "moderation_log_id": updated.get("moderation_log_id"),
            "created_at": str(updated["created_at"]) if updated.get("created_at") else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"更新用户资料失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新用户资料失败"
        )


@router.post(
    "/me/revert",
    response_model=UserProfileResponse
)
async def revert_profile_changes(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    还原资料修改（当审核被拒绝时使用）
    
    将 display_ 字段（已审核的老资料）复制回当前字段
    """
    try:
        from sqlalchemy import text
        
        # 将 display_ 字段复制回当前字段
        await db.execute(
            text("""
                UPDATE profiles 
                SET username = display_username,
                    full_name = display_full_name,
                    bio = display_bio,
                    moderation_status = 'approved',
                    moderation_log_id = NULL
                WHERE id = :user_id
            """),
            {"user_id": user_id}
        )
        await db.commit()
        
        logger.info(f"用户 {user_id} 还原了资料修改")
        
        # 返回更新后的资料
        return await get_my_profile(db, user_id)
        
    except Exception as e:
        await db.rollback()
        logger.error(f"还原资料失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="还原资料失败"
        )


# ============ Admin API ============

@router.post(
    "/admin/approve/{user_id}",
    response_model=dict
)
async def approve_profile(
    user_id: str,
    log_id: int = Query(..., description="审核日志ID"),
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin)
):
    """
    通过用户资料审核
    
    将当前资料复制到 display_ 字段，对外显示
    """
    try:
        from sqlalchemy import text
        from app.services.moderation import ModerationService
        
        # 1. 更新审核日志
        await ModerationService.manual_review(
            db, log_id, admin_id, 'approved', '资料审核通过'
        )
        
        # 2. 将当前资料复制到 display_ 字段
        await db.execute(
            text("""
                UPDATE profiles 
                SET display_username = username,
                    display_full_name = full_name,
                    display_bio = bio,
                    moderation_status = 'approved',
                    moderation_log_id = :log_id
                WHERE id = :user_id
            """),
            {"user_id": user_id, "log_id": log_id}
        )
        await db.commit()
        
        logger.info(f"管理员 {admin_id} 通过了用户 {user_id} 的资料审核")
        
        return {"message": "资料审核通过", "user_id": user_id}
        
    except Exception as e:
        await db.rollback()
        logger.error(f"审核通过失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="审核通过失败"
        )


@router.post(
    "/admin/reject/{user_id}",
    response_model=dict
)
async def reject_profile(
    user_id: str,
    log_id: int = Query(..., description="审核日志ID"),
    note: Optional[str] = Query(None, description="拒绝原因"),
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin)
):
    """
    拒绝用户资料审核
    
    🔴 关键：自动回滚到 display_ 字段（已审核的老资料）
    """
    try:
        from sqlalchemy import text
        from app.services.moderation import ModerationService
        
        # 1. 更新审核日志
        await ModerationService.manual_review(
            db, log_id, admin_id, 'rejected', note or '资料审核未通过'
        )
        
        # 2. 🔴 关键：自动回滚到 display_ 字段（老资料），但保持 rejected 状态让用户知道
        await db.execute(
            text("""
                UPDATE profiles 
                SET username = display_username,
                    full_name = display_full_name,
                    bio = display_bio,
                    moderation_status = 'rejected',
                    moderation_log_id = :log_id
                WHERE id = :user_id
            """),
            {"user_id": user_id, "log_id": log_id}
        )
        await db.commit()
        
        logger.info(f"管理员 {admin_id} 拒绝了用户 {user_id} 的资料审核，已自动回滚")
        
        return {"message": "资料审核已拒绝，已自动回滚到老版本", "user_id": user_id, "note": note}
        
    except Exception as e:
        await db.rollback()
        logger.error(f"审核拒绝失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="审核拒绝失败"
        )


@router.get(
    "/admin/review-queue",
    response_model=List[dict],
    responses={
        401: {"model": ErrorResponse, "description": "未授权"},
        403: {"model": ErrorResponse, "description": "无权限"},
    }
)
async def get_profile_review_queue(
    status: str = Query('flagged', enum=['flagged', 'pending', 'rejected']),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(require_admin)
):
    """
    获取待人工审核的用户资料（管理员接口）
    """
    from app.services.moderation import ModerationService
    items = await ModerationService.get_pending_review(db, status, limit, offset, 'profile')
    return items


@router.get(
    "/admin/list",
    response_model=List[dict]
)
async def get_profiles_by_status(
    status: str = Query('pending', enum=['pending', 'approved', 'flagged', 'rejected']),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(require_admin)
):
    """
    获取指定审核状态的用户资料列表（管理员接口）
    """
    from sqlalchemy import text
    
    result = await db.execute(
        text("""
            SELECT 
                p.id, p.email, p.username, p.full_name, p.bio, 
                p.display_username, p.display_full_name, p.display_bio,
                p.avatar_url, p.moderation_status, p.moderation_log_id,
                p.created_at
            FROM profiles p
            WHERE p.moderation_status = :status
            ORDER BY p.created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        {"status": status, "limit": limit, "offset": offset}
    )
    
    profiles = result.mappings().all()
    return [dict(p) for p in profiles]


@router.post(
    "/me/avatar",
    response_model=dict,
    responses={
        200: {"description": "上传成功"},
        400: {"model": ErrorResponse, "description": "文件错误"},
        401: {"model": ErrorResponse, "description": "未授权"},
    }
)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """上传用户头像"""
    try:
        # 验证文件类型
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的文件类型，请上传: {', '.join(allowed_types)}"
            )
        
        # 验证文件大小 (最大 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        contents = await file.read()
        if len(contents) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件大小超过 5MB 限制"
            )
        
        # 生成唯一文件名
        file_ext = file.filename.split('.')[-1].lower()
        file_name = f"avatars/{user_id}/{uuid.uuid4()}.{file_ext}"
        
        # 上传 Supabase Storage
        from app.core.config import settings
        import httpx
        
        supabase_url = settings.SUPABASE_URL
        supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        
        upload_url = f"{supabase_url}/storage/v1/object/user-avatars/{file_name}"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                upload_url,
                headers={
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": file.content_type
                },
                content=contents
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="头像上传失败"
                )
        
        # 获取公开 URL
        avatar_url = f"{supabase_url}/storage/v1/object/public/user-avatars/{file_name}"
        
        # 更新数据库
        from sqlalchemy import text
        await db.execute(
            text("UPDATE profiles SET avatar_url = :avatar_url WHERE id = :user_id"),
            {"avatar_url": avatar_url, "user_id": user_id}
        )
        await db.commit()
        
        return {"avatar_url": avatar_url, "message": "头像上传成功"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"上传头像失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="上传头像失败"
        )


@router.post(
    "/me/change-password",
    response_model=dict,
    responses={
        200: {"description": "密码修改成功"},
        400: {"model": ErrorResponse, "description": "参数错误"},
        401: {"model": ErrorResponse, "description": "未授权或原密码错误"},
    }
)
async def change_password(
    current_password: str,
    new_password: str,
    user_id: str = Depends(get_current_user_id)
):
    """修改密码（通过 Supabase Auth）"""
    try:
        # 密码强度验证
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="新密码至少需要 8 位"
            )
        
        return {
            "message": "请使用 Supabase Auth API 直接修改密码",
            "instruction": "调用 supabase.auth.updateUser({ password: new_password })"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"修改密码失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="修改密码失败"
        )
