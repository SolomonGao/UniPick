"""
权限控制中间件
用于路由守卫和资源权限检查
"""
from functools import wraps
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.item import Item


# 管理员邮箱列表（硬编码，也可以通过数据库配置）
ADMIN_EMAILS = {
    "admin@unipick.app",
    "admin@vt.edu",
    # 添加你的邮箱在这里
}


async def is_admin_user(
    user_id: str,
    db: AsyncSession
) -> bool:
    """
    检查用户是否为管理员
    1. 检查邮箱是否在 ADMIN_EMAILS 列表中
    2. 检查 profiles 表中的 role 字段是否为 'admin'
    """
    if not user_id:
        return False
    
    try:
        # 从 profiles 表查询用户信息和角色
        result = await db.execute(
            text("SELECT email, role FROM profiles WHERE id = :user_id"),
            {"user_id": user_id}
        )
        profile = result.mappings().one_or_none()
        
        if not profile:
            return False
        
        # 检查硬编码的管理员邮箱
        if profile.get("email") in ADMIN_EMAILS:
            return True
        
        # 检查 role 字段
        if profile.get("role") == "admin":
            return True
        
        return False
    except Exception:
        return False


async def require_admin(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> str:
    """
    要求用户必须是管理员
    用于管理员专属接口
    """
    if not user_id:
        raise AuthenticationRequired()
    
    is_admin = await is_admin_user(user_id, db)
    if not is_admin:
        raise PermissionDenied("需要管理员权限")
    
    return user_id


class PermissionDenied(HTTPException):
    """权限不足异常"""
    def __init__(self, detail: str = "权限不足"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "PermissionDenied",
                "message": detail,
                "details": {}
            }
        )


class AuthenticationRequired(HTTPException):
    """需要登录异常"""
    def __init__(self, detail: str = "请先登录"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "AuthenticationRequired",
                "message": detail,
                "details": {}
            }
        )


async def get_current_user_or_none(
    user_id: Optional[str] = None
) -> Optional[str]:
    """获取当前用户ID，未登录返回None"""
    return user_id


async def require_auth(
    user_id: str = Depends(get_current_user_id)
) -> str:
    """
    要求用户必须登录
    用于需要认证的路由
    """
    if not user_id:
        raise AuthenticationRequired()
    return user_id


async def require_item_owner(
    item_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Item:
    """
    要求用户必须是商品所有者
    用于编辑、删除商品等操作
    """
    if not user_id:
        raise AuthenticationRequired()
    
    # 查询商品
    result = await db.execute(
        select(Item).where(Item.id == item_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "ItemNotFound",
                "message": f"商品 {item_id} 不存在",
                "details": {"item_id": item_id}
            }
        )
    
    # 检查所有权
    if str(item.user_id) != str(user_id):
        raise PermissionDenied("您没有权限操作此商品")
    
    return item


async def optional_auth(
    user_id: Optional[str] = None
) -> Optional[str]:
    """
    可选认证
    用于某些页面允许游客访问，但登录用户有额外功能
    """
    return user_id


# 资源类型映射
RESOURCE_MODELS = {
    "item": Item,
}


async def check_ownership(
    resource_type: str,
    resource_id: int,
    user_id: str,
    db: AsyncSession
) -> bool:
    """
    通用所有权检查
    
    Args:
        resource_type: 资源类型 (item, user等)
        resource_id: 资源ID
        user_id: 当前用户ID
        db: 数据库会话
    
    Returns:
        bool: 是否有所有权
    """
    if resource_type not in RESOURCE_MODELS:
        raise ValueError(f"Unknown resource type: {resource_type}")
    
    model = RESOURCE_MODELS[resource_type]
    
    result = await db.execute(
        select(model).where(model.id == resource_id)
    )
    resource = result.scalar_one_or_none()
    
    if not resource:
        return False
    
    # 检查 user_id 字段
    if hasattr(resource, 'user_id'):
        return str(resource.user_id) == str(user_id)
    
    return False
