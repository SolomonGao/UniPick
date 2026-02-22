"""
初始化管理员账号脚本
创建 admin@unipick.app 账号并设置为管理员角色
"""
import asyncio
import os
import sys

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings


async def init_admin():
    """初始化管理员账号"""
    
    # 使用数据库 URL 创建引擎
    database_url = settings.DATABASE_URL
    
    # 如果是同步驱动，转换为异步
    if "postgresql+asyncpg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
        database_url = database_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # 检查是否已存在 admin@unipick.app 用户
            result = await session.execute(
                text("SELECT id FROM profiles WHERE email = 'admin@unipick.app'")
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print("✅ 管理员账号已存在")
                
                # 更新为管理员角色
                await session.execute(
                    text("UPDATE profiles SET role = 'admin' WHERE email = 'admin@unipick.app'")
                )
                await session.commit()
                print("✅ 已更新管理员角色")
                return
            
            # 注意：Supabase Auth 用户需要通过 Supabase 控制台或 API 创建
            # 这里我们只能创建 profiles 表的记录
            # 实际的 auth.users 记录需要手动创建或使用 Supabase API
            
            print("⚠️  请先在 Supabase Auth 中创建用户：")
            print("   邮箱: admin@unipick.app")
            print("   密码: admin")
            print("")
            print("   创建后，此脚本将自动将其设置为管理员。")
            print("")
            print("   或者在 Supabase SQL Editor 中执行：")
            print("   ```")
            print("   -- 创建 auth 用户（通过 Supabase Dashboard 或 API）")
            print("   -- 然后运行此脚本设置角色")
            print("   ```")
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
    
    await engine.dispose()


async def set_admin_role_by_email(email: str = "admin@unipick.app"):
    """
    通过邮箱设置用户为管理员
    用于在创建 auth 用户后，设置其角色
    """
    database_url = settings.DATABASE_URL
    
    if "postgresql+asyncpg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
        database_url = database_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # 检查用户是否存在
            result = await session.execute(
                text("SELECT id FROM profiles WHERE email = :email"),
                {"email": email}
            )
            user_id = result.scalar_one_or_none()
            
            if not user_id:
                print(f"❌ 用户 {email} 不存在于 profiles 表")
                print("   请先通过 Supabase Auth 注册该用户")
                return
            
            # 更新为管理员角色
            await session.execute(
                text("UPDATE profiles SET role = 'admin' WHERE email = :email"),
                {"email": email}
            )
            await session.commit()
            print(f"✅ 已将 {email} 设置为管理员")
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
    
    await engine.dispose()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="初始化管理员账号")
    parser.add_argument("--email", default="admin@unipick.app", help="管理员邮箱")
    parser.add_argument("--set-admin", action="store_true", help="设置指定邮箱为管理员")
    
    args = parser.parse_args()
    
    if args.set_admin:
        asyncio.run(set_admin_role_by_email(args.email))
    else:
        asyncio.run(init_admin())
