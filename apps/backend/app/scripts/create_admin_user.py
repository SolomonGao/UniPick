"""
创建管理员用户脚本
使用 Supabase Admin API 创建用户并设置为管理员
"""
import asyncio
import os
import sys
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def create_admin_user(
    email: str = "admin@unipick.app",
    password: str = "admin",
    full_name: str = "Administrator"
):
    """
    使用 Supabase Admin API 创建管理员用户
    需要 SUPABASE_SERVICE_ROLE_KEY
    """
    supabase_url = settings.SUPABASE_URL
    service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
    
    if not service_role_key:
        print("❌ 错误: 未配置 SUPABASE_SERVICE_ROLE_KEY")
        print("   请在 .env 文件中添加：")
        print("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
        return
    
    if service_role_key == settings.SUPABASE_ANON_KEY:
        print("⚠️  警告: SERVICE_ROLE_KEY 与 ANON_KEY 相同")
        print("   请确保使用正确的 Service Role Key")
    
    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
        "Content-Type": "application/json"
    }
    
    # 1. 创建用户
    create_user_url = f"{supabase_url}/auth/v1/admin/users"
    
    user_data = {
        "email": email,
        "password": password,
        "email_confirm": True,  # 自动确认邮箱
        "user_metadata": {
            "full_name": full_name,
            "role": "admin"
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            print(f"📝 正在创建用户: {email}")
            response = await client.post(
                create_user_url,
                headers=headers,
                json=user_data
            )
            
            if response.status_code == 200:
                user = response.json()
                user_id = user["id"]
                print(f"✅ 用户创建成功: {user_id}")
                
                # 2. 更新 profiles 表设置 role
                print("📝 设置管理员角色...")
                
                from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
                from sqlalchemy.orm import sessionmaker
                from sqlalchemy import text
                
                database_url = settings.DATABASE_URL
                if "postgresql+asyncpg" not in database_url:
                    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
                
                engine = create_async_engine(database_url, echo=False)
                async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
                
                async with async_session() as session:
                    try:
                        # 等待 profiles 记录创建（Supabase 触发器）
                        await asyncio.sleep(1)
                        
                        # 更新 role
                        await session.execute(
                            text("UPDATE profiles SET role = 'admin', full_name = :name WHERE id = :user_id"),
                            {"user_id": user_id, "name": full_name}
                        )
                        await session.commit()
                        print("✅ 管理员角色设置成功")
                        
                    except Exception as e:
                        print(f"❌ 设置角色失败: {e}")
                        await session.rollback()
                    finally:
                        await session.close()
                
                await engine.dispose()
                
                print("")
                print("=" * 50)
                print("✅ 管理员账号创建成功！")
                print("=" * 50)
                print(f"邮箱: {email}")
                print(f"密码: {password}")
                print("")
                print("请立即登录并修改默认密码！")
                
            elif response.status_code == 422:
                error_data = response.json()
                if "already been registered" in str(error_data):
                    print(f"⚠️  用户 {email} 已存在")
                    print("📝 尝试设置为管理员...")
                    
                    # 直接设置 role
                    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
                    from sqlalchemy.orm import sessionmaker
                    from sqlalchemy import text
                    
                    database_url = settings.DATABASE_URL
                    if "postgresql+asyncpg" not in database_url:
                        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
                    
                    engine = create_async_engine(database_url, echo=False)
                    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
                    
                    async with async_session() as session:
                        try:
                            await session.execute(
                                text("UPDATE profiles SET role = 'admin' WHERE email = :email"),
                                {"email": email}
                            )
                            await session.commit()
                            print(f"✅ 已将 {email} 设置为管理员")
                        except Exception as e:
                            print(f"❌ 错误: {e}")
                            await session.rollback()
                        finally:
                            await session.close()
                    
                    await engine.dispose()
                else:
                    print(f"❌ 创建用户失败: {error_data}")
            else:
                print(f"❌ 创建用户失败: {response.status_code}")
                print(response.text)
                
        except Exception as e:
            print(f"❌ 错误: {e}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="创建管理员用户")
    parser.add_argument("--email", default="admin@unipick.app", help="管理员邮箱")
    parser.add_argument("--password", default="admin", help="管理员密码")
    parser.add_argument("--name", default="Administrator", help="显示名称")
    
    args = parser.parse_args()
    
    print("=" * 50)
    print("UniPick 管理员账号创建工具")
    print("=" * 50)
    print("")
    
    asyncio.run(create_admin_user(args.email, args.password, args.name))
