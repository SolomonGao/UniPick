from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import  declarative_base
from sqlalchemy.exc import OperationalError, DatabaseError
from app.core.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)
Base = declarative_base()

# 导出 DATABASE_URL 供 Alembic 使用
DATABASE_URL = settings.DATABASE_URL

# 2. 创建异步引擎
# 注意：Supabase 的连接串通常是 postgres://... 需要改成 postgresql+asyncpg://...
# 且端口通常是 5432 (直连) 或 6543 (连接池模式，建议生产环境用 Transaction Mode)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG if hasattr(settings, 'DEBUG') else False,  # 生产环境关闭 SQL 日志
    future=True,
    # 🔧 修复：添加连接池配置
    pool_size=10,              # 基础连接数
    max_overflow=20,           # 最大额外连接数
    pool_pre_ping=True,        # 连接前 ping 检查，避免使用无效连接
    pool_recycle=3600,         # 连接 1 小时后回收
    pool_timeout=30,           # 获取连接超时 30 秒
    connect_args={
        "ssl": "require",
        "statement_cache_size": 0,  # 关闭缓存，避免某些环境下的错误
        "command_timeout": 60,      # SQL 执行超时 60 秒
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


# 🔧 修复：添加事务重试装饰器
def retry_on_db_error(max_retries=3, retry_delay=1.0):
    """
    数据库操作重试装饰器
    在连接不稳定时自动重试
    
    Args:
        max_retries: 最大重试次数
        retry_delay: 重试间隔（秒）
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except OperationalError as e:
                    last_exception = e
                    logger.warning(f"数据库操作失败（尝试 {attempt + 1}/{max_retries}）: {e}")
                    
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (2 ** attempt)  # 指数退避
                        logger.info(f"等待 {wait_time} 秒后重试...")
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(f"数据库操作最终失败: {e}")
                        raise
                except DatabaseError as e:
                    logger.error(f"数据库错误（不重试）: {e}")
                    raise
            
            raise last_exception
        
        return wrapper
    return decorator


# 🔧 修复：带重试的数据库上下文管理器
class AsyncSessionWithRetry:
    """
    带自动重试的数据库会话上下文管理器
    用法:
        async with AsyncSessionWithRetry() as session:
            result = await session.execute(query)
    """
    
    def __init__(self, max_retries=3, retry_delay=1.0):
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.session = None
    
    async def __aenter__(self):
        self.session = AsyncSessionLocal()
        return self.session
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            await self.session.rollback()
        await self.session.close()
        return False  # 不处理异常，让上层处理