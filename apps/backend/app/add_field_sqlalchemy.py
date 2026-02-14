"""
使用 SQLAlchemy 直接添加 is_location_private 字段
"""
import asyncio
from sqlalchemy import text
from core.database import engine

async def add_field():
    async with engine.connect() as conn:
        try:
            # 检查字段是否已存在
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'items' AND column_name = 'is_location_private'
            """))
            
            if result.fetchone():
                print("字段 is_location_private 已存在")
                return
            
            # 添加字段
            await conn.execute(text("""
                ALTER TABLE items 
                ADD COLUMN is_location_private BOOLEAN DEFAULT FALSE
            """))
            await conn.commit()
            print("成功添加 is_location_private 字段")
            
        except Exception as e:
            print(f"错误: {e}")
            await conn.rollback()

if __name__ == "__main__":
    asyncio.run(add_field())
