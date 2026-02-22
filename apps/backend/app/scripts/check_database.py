"""
检查数据库结构脚本
验证所有必要的表和字段是否存在
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings


async def check_database():
    """检查数据库结构"""
    
    database_url = settings.DATABASE_URL
    
    # 转换为异步 URL
    if "postgresql+asyncpg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
        database_url = database_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("=" * 60)
            print("UniPick 数据库结构检查")
            print("=" * 60)
            print()
            
            # 检查表是否存在
            tables = ['profiles', 'items', 'favorites', 'view_history', 'moderation_logs']
            print("📋 检查数据表：")
            for table in tables:
                result = await session.execute(
                    text("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_name = :table
                        )
                    """),
                    {"table": table}
                )
                exists = result.scalar()
                status = "✅" if exists else "❌"
                print(f"   {status} {table}")
            
            print()
            
            # 检查 profiles 表的列
            print("📋 检查 profiles 表字段：")
            profile_columns = ['id', 'email', 'username', 'full_name', 'avatar_url', 
                             'bio', 'phone', 'campus', 'university', 'role',
                             'notification_email', 'show_phone', 'created_at',
                             'moderation_status', 'moderation_log_id']
            for col in profile_columns:
                result = await session.execute(
                    text("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'profiles' AND column_name = :col
                        )
                    """),
                    {"col": col}
                )
                exists = result.scalar()
                status = "✅" if exists else "❌"
                print(f"   {status} {col}")
            
            print()
            
            # 检查 items 表的列
            print("📋 检查 items 表字段：")
            item_columns = ['id', 'user_id', 'title', 'description', 'price', 'images',
                          'location', 'location_name', 'category', 'is_location_private',
                          'view_count', 'original_price', 'moderation_status', 
                          'moderation_log_id', 'created_at']
            for col in item_columns:
                result = await session.execute(
                    text("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'items' AND column_name = :col
                        )
                    """),
                    {"col": col}
                )
                exists = result.scalar()
                status = "✅" if exists else "❌"
                print(f"   {status} {col}")
            
            print()
            
            # 检查 moderation_logs 表的列
            print("📋 检查 moderation_logs 表字段：")
            mod_columns = ['id', 'content_type', 'content_id', 'user_id', 'content_text',
                         'status', 'flagged', 'categories', 'scores', 'reviewed_by',
                         'reviewed_at', 'review_note', 'created_at', 'updated_at']
            for col in mod_columns:
                result = await session.execute(
                    text("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'moderation_logs' AND column_name = :col
                        )
                    """),
                    {"col": col}
                )
                exists = result.scalar()
                status = "✅" if exists else "❌"
                print(f"   {status} {col}")
            
            print()
            print("=" * 60)
            
            # 检查管理员账号
            print("👤 检查管理员账号：")
            result = await session.execute(
                text("SELECT email, role FROM profiles WHERE role = 'admin' LIMIT 5")
            )
            admins = result.mappings().all()
            if admins:
                for admin in admins:
                    print(f"   ✅ {admin['email']} ({admin['role']})")
            else:
                print("   ⚠️  没有找到管理员账号")
                print("   请运行: python scripts/create_admin_user.py")
            
            print()
            print("=" * 60)
            
            # 统计
            print("📊 数据统计：")
            
            # 用户数量
            result = await session.execute(text("SELECT COUNT(*) FROM profiles"))
            user_count = result.scalar()
            print(f"   用户数: {user_count}")
            
            # 商品数量
            result = await session.execute(text("SELECT COUNT(*) FROM items"))
            item_count = result.scalar()
            print(f"   商品数: {item_count}")
            
            # 审核日志数量
            result = await session.execute(
                text("SELECT COUNT(*) FROM moderation_logs")
            )
            mod_count = result.scalar()
            print(f"   审核日志: {mod_count}")
            
            print()
            print("=" * 60)
            print("检查完成！")
            print("=" * 60)
            
        except Exception as e:
            print(f"❌ 错误: {e}")
        finally:
            await session.close()
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(check_database())
