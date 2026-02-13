from logging.config import fileConfig
import sys
import os

# 获取当前文件所在目录 (migrations/)
current_dir = os.path.dirname(os.path.abspath(__file__))
# 项目根目录 (app/)
app_dir = os.path.dirname(current_dir)
# backend 目录
backend_dir = os.path.dirname(app_dir)

# 添加必要路径
sys.path.insert(0, backend_dir)  # 添加 backend 目录
sys.path.insert(0, app_dir)      # 添加 app 目录

from sqlalchemy import create_engine, pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# 直接导入配置，不通过 app 模块
from core.config import settings
from core.database import Base
from models.item import Item

# this is the Alembic Config object
config = context.config

# 设置数据库 URL (使用同步驱动)
# 将 asyncpg 替换为 psycopg2 用于迁移
DATABASE_URL = settings.DATABASE_URL.replace("+asyncpg", "")
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 使用模型的 Metadata
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # 使用同步引擎运行迁移
    connectable = create_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
