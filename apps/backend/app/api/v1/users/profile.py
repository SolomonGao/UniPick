from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import logging
import uuid

from app.core.database import get_db
from app.core.permissions import require_auth
from app.core.security import get_current_user_id
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
    """获取当前用户资料"""
    try:
        result = await db.execute(
            select(
                # 直接从 Supabase Auth 获取的信息
            ).where(None)  # 这里我们直接从 Supabase 获取
        )
        
        # 实际上我们需要从 profiles 表查询
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT * FROM profiles WHERE id = :user_id"),
            {"user_id": user_id}
        )
        profile = result.mappings().one_or_none()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户资料不存在"
            )
        
        return {
            "id": str(profile["id"]),
            "email": profile["email"],
            "username": profile.get("username"),
            "full_name": profile.get("full_name"),
            "avatar_url": profile.get("avatar_url"),
            "bio": profile.get("bio"),
            "phone": profile.get("phone"),
            "campus": profile.get("campus"),
            "university": profile.get("university"),
            "notification_email": profile.get("notification_email", True),
            "show_phone": profile.get("show_phone", False),
            "created_at": str(profile["created_at"]) if profile.get("created_at") else None
        }
        
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
    """更新当前用户资料"""
    try:
        from sqlalchemy import text
        
        # 构建更新字段
        update_fields = []
        params = {"user_id": user_id}
        
        if profile_update.username is not None:
            update_fields.append("username = :username")
            params["username"] = profile_update.username
        if profile_update.full_name is not None:
            update_fields.append("full_name = :full_name")
            params["full_name"] = profile_update.full_name
        if profile_update.bio is not None:
            update_fields.append("bio = :bio")
            params["bio"] = profile_update.bio
        if profile_update.phone is not None:
            update_fields.append("phone = :phone")
            params["phone"] = profile_update.phone
        if profile_update.campus is not None:
            update_fields.append("campus = :campus")
            params["campus"] = profile_update.campus
        if profile_update.university is not None:
            update_fields.append("university = :university")
            params["university"] = profile_update.university
        if profile_update.notification_email is not None:
            update_fields.append("notification_email = :notification_email")
            params["notification_email"] = profile_update.notification_email
        if profile_update.show_phone is not None:
            update_fields.append("show_phone = :show_phone")
            params["show_phone"] = profile_update.show_phone
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="没有提供要更新的字段"
            )
        
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
        
        # 使用 Supabase Auth API 更新密码
        # 注意：这里需要用户的 access token
        from app.core.config import settings
        import httpx
        
        supabase_url = settings.SUPABASE_URL
        supabase_key = settings.SUPABASE_ANON_KEY
        
        # 由于需要当前 session，前端应该直接调用 Supabase Auth API
        # 这里我们返回一个指示，让前端处理
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
