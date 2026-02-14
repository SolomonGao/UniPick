"""
直接添加 is_location_private 字段到 items 表
"""
import asyncio
import asyncpg
from core.config import settings

async def add_field():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        # 检查字段是否已存在
        result = await conn.fetchval("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'items' AND column_name = 'is_location_private'
        """)
        
        if result:
            print("字段 is_location_private 已存在")
            return
        
        # 添加字段
        await conn.execute("""
            ALTER TABLE items 
            ADD COLUMN is_location_private BOOLEAN DEFAULT FALSE
        """)
        print("成功添加 is_location_private 字段")
        
    except Exception as e:
        print(f"错误: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(add_field())
