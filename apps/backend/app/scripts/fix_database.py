"""
数据库修复脚本
自动创建缺失的表和字段
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings


async def fix_database():
    """修复数据库结构"""
    
    database_url = settings.DATABASE_URL
    
    if "postgresql+asyncpg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
        database_url = database_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("=" * 60)
            print("UniPick 数据库修复工具")
            print("=" * 60)
            print()
            
            # 1. 添加 profiles.role 列
            print("1️⃣ 检查 profiles.role 列...")
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'profiles' AND column_name = 'role'
                    )
                """)
            )
            if not result.scalar():
                await session.execute(
                    text("ALTER TABLE profiles ADD COLUMN role VARCHAR(50) DEFAULT 'user'")
                )
                await session.execute(
                    text("CREATE INDEX idx_profiles_role ON profiles(role)")
                )
                print("   ✅ 已添加 role 列")
            else:
                print("   ✅ role 列已存在")
            
            # 2. 添加 items.moderation_status 列
            print("2️⃣ 检查 items.moderation_status 列...")
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'items' AND column_name = 'moderation_status'
                    )
                """)
            )
            if not result.scalar():
                await session.execute(
                    text("ALTER TABLE items ADD COLUMN moderation_status VARCHAR(50) DEFAULT 'pending'")
                )
                await session.execute(
                    text("CREATE INDEX idx_items_moderation_status ON items(moderation_status)")
                )
                print("   ✅ 已添加 moderation_status 列")
            else:
                print("   ✅ moderation_status 列已存在")
            
            # 3. 添加 items.moderation_log_id 列
            print("3️⃣ 检查 items.moderation_log_id 列...")
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'items' AND column_name = 'moderation_log_id'
                    )
                """)
            )
            if not result.scalar():
                await session.execute(
                    text("ALTER TABLE items ADD COLUMN moderation_log_id INTEGER")
                )
                print("   ✅ 已添加 moderation_log_id 列")
            else:
                print("   ✅ moderation_log_id 列已存在")
            
            # 4. 添加 items.original_price 列
            print("4️⃣ 检查 items.original_price 列...")
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'items' AND column_name = 'original_price'
                    )
                """)
            )
            if not result.scalar():
                await session.execute(
                    text("ALTER TABLE items ADD COLUMN original_price FLOAT")
                )
                print("   ✅ 已添加 original_price 列")
            else:
                print("   ✅ original_price 列已存在")
            
            # 5. 创建 moderation_logs 表
            print("5️⃣ 检查 moderation_logs 表...")
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = 'moderation_logs'
                    )
                """)
            )
            if not result.scalar():
                await session.execute(text("""
                    CREATE TABLE moderation_logs (
                        id SERIAL PRIMARY KEY,
                        content_type VARCHAR(50) NOT NULL,
                        content_id VARCHAR(255) NOT NULL,
                        user_id UUID NOT NULL,
                        content_text TEXT,
                        status VARCHAR(50) DEFAULT 'pending',
                        flagged BOOLEAN DEFAULT FALSE,
                        categories JSONB DEFAULT '{}',
                        scores JSONB DEFAULT '{}',
                        reviewed_by UUID,
                        reviewed_at TIMESTAMP WITH TIME ZONE,
                        review_note TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                await session.execute(text("CREATE INDEX idx_moderation_logs_status ON moderation_logs(status)"))
                await session.execute(text("CREATE INDEX idx_moderation_logs_content ON moderation_logs(content_type, content_id)"))
                await session.execute(text("CREATE INDEX idx_moderation_logs_user ON moderation_logs(user_id)"))
                await session.execute(text("CREATE INDEX idx_moderation_logs_created ON moderation_logs(created_at DESC)"))
                print("   ✅ 已创建 moderation_logs 表")
            else:
                print("   ✅ moderation_logs 表已存在")
            
            # 6. 创建 view_history 表
            print("6️⃣ 检查 view_history 表...")
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = 'view_history'
                    )
                """)
            )
            if not result.scalar():
                await session.execute(text("""
                    CREATE TABLE view_history (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL,
                        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                        viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT uix_user_item_view UNIQUE (user_id, item_id)
                    )
                """))
                await session.execute(text("CREATE INDEX idx_view_history_user ON view_history(user_id)"))
                await session.execute(text("CREATE INDEX idx_view_history_item ON view_history(item_id)"))
                print("   ✅ 已创建 view_history 表")
            else:
                print("   ✅ view_history 表已存在")
            
            # 7. 创建 favorites 表
            print("7️⃣ 检查 favorites 表...")
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = 'favorites'
                    )
                """)
            )
            if not result.scalar():
                await session.execute(text("""
                    CREATE TABLE favorites (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL,
                        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT uix_user_item_favorite UNIQUE (user_id, item_id)
                    )
                """))
                await session.execute(text("CREATE INDEX idx_favorites_user ON favorites(user_id)"))
                await session.execute(text("CREATE INDEX idx_favorites_item ON favorites(item_id)"))
                print("   ✅ 已创建 favorites 表")
            else:
                print("   ✅ favorites 表已存在")
            
            await session.commit()
            
            print()
            print("=" * 60)
            print("✅ 数据库修复完成！")
            print("=" * 60)
            print()
            print("接下来你可以：")
            print("1. 运行检查脚本验证: python scripts/check_database.py")
            print("2. 创建管理员账号: python scripts/create_admin_user.py")
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
    
    await engine.dispose()


if __name__ == "__main__":
    print("🚀 开始修复数据库...")
    print()
    asyncio.run(fix_database())
