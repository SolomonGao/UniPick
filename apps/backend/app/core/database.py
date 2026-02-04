from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import  declarative_base
from app.core.config import settings

Base = declarative_base()

USER = settings.USER
PASSWORD = settings.PASSWORD
HOST = settings.HOST
PORT = settings.PORT
DBNAME = settings.DNAME

DATABASE_URL = f"postgresql+asyncpg://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}"

# 2. 创建异步引擎
# 注意：Supabase 的连接串通常是 postgres://... 需要改成 postgresql+asyncpg://...
# 且端口通常是 5432 (直连) 或 6543 (连接池模式，建议生产环境用 Transaction Mode)
engine = create_async_engine(
    DATABASE_URL,
    echo=True, # 开发模式下打印 SQL，生产环境关掉
    future=True,
    connect_args={
        "ssl": "require"
    }
)

# 3. 创建 Session 工厂
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

# 4. 依赖注入函数 (Dependency)
# 这一步非常关键：它保证每个请求都有独立的数据库会话，请求结束自动关闭
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()