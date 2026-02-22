"""
数据库迁移执行脚本
运行 SQL 迁移文件来清理和优化数据库
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings


# 读取 SQL 文件
MIGRATION_SQL = """
-- ====== profiles 表审核字段 ======
-- 1. 添加 profiles 表的审核字段（如果不存在）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS moderation_log_id INTEGER;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_moderation_status ON profiles(moderation_status);

-- 确保默认值正确
ALTER TABLE profiles 
ALTER COLUMN moderation_status SET DEFAULT 'pending';


-- ====== items 表优化 ======
-- 2. 确保 moderation_status 有正确的默认值
ALTER TABLE items 
ALTER COLUMN moderation_status SET DEFAULT 'pending';

-- 3. 确保 view_count 有正确的默认值
ALTER TABLE items 
ALTER COLUMN view_count SET DEFAULT 0;

-- 3. 创建 items 表的用户ID索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items USING hash (user_id);

-- 4. 创建复合索引（用于查询用户的商品列表）
CREATE INDEX IF NOT EXISTS idx_items_user_id_created_at ON items (user_id, created_at DESC);

-- 5. 创建 moderation_status + created_at 复合索引（用于审核队列查询）
CREATE INDEX IF NOT EXISTS idx_items_moderation_status_created_at ON items (moderation_status, created_at DESC);

-- 6. 添加 updated_at 列到 items 表（如果还没有）
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7. 创建触发器函数自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. 为 items 表创建触发器
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. 为 moderation_logs 表创建触发器
DROP TRIGGER IF EXISTS update_moderation_logs_updated_at ON moderation_logs;
CREATE TRIGGER update_moderation_logs_updated_at
    BEFORE UPDATE ON moderation_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
"""


async def run_migration():
    """执行数据库迁移"""
    
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
            print("UniPick 数据库迁移")
            print("=" * 60)
            print()
            
            # 分割 SQL 语句并逐个执行
            statements = [s.strip() for s in MIGRATION_SQL.split(';') if s.strip()]
            
            for i, statement in enumerate(statements, 1):
                try:
                    await session.execute(text(statement))
                    await session.commit()
                    # 显示进度
                    if i % 2 == 0:
                        print(f"  进度: {i}/{len(statements)}...")
                except Exception as e:
                    # 忽略 "已存在" 类型的错误
                    if "already exists" in str(e) or "duplicate" in str(e).lower():
                        print(f"  ⚠️  跳过（已存在）")
                    else:
                        print(f"  ❌ 错误: {e}")
                    await session.rollback()
            
            print()
            print("=" * 60)
            print("✅ 数据库迁移完成！")
            print("=" * 60)
            print()
            
            # 验证迁移结果
            print("📋 验证结果：")
            
            # 检查 profiles 表
            result = await session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'moderation_status'
            """))
            if result.scalar():
                print(f"   ✅ profiles.moderation_status")
            
            result = await session.execute(text("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'profiles' AND indexname = 'idx_profiles_moderation_status'
            """))
            if result.scalar():
                print(f"   ✅ 索引: idx_profiles_moderation_status")
            
            # 检查 items 表索引
            result = await session.execute(text("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'items' AND indexname LIKE 'idx_items_%'
            """))
            indexes = result.scalars().all()
            for idx in indexes:
                print(f"   ✅ 索引: {idx}")
            
            # 检查 items 表列
            result = await session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'items' AND column_name = 'updated_at'
            """))
            if result.scalar():
                print(f"   ✅ items.updated_at")
            
            # 检查触发器
            result = await session.execute(text("""
                SELECT trigger_name 
                FROM information_schema.triggers 
                WHERE trigger_name LIKE 'update_%_updated_at'
            """))
            triggers = result.scalars().all()
            for trig in triggers:
                print(f"   ✅ 触发器: {trig}")
            
            print()
            print("=" * 60)
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            await session.rollback()
        finally:
            await session.close()
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())
