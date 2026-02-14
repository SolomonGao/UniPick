"""
添加 is_location_private 字段
"""
import asyncio
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# 加载 .env 文件（在父目录）
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
print(f"Loading .env from: {env_path}")
load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL')

async def add_field():
    engine = create_async_engine(DATABASE_URL, echo=True)
    
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
                await conn.rollback()
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
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_field())
