import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None  # 用于管理员操作
    DATABASE_URL: str
    OPENAI_API_KEY: Optional[str] = None  # 可选，用于内容审核
    TELEGRAM_BOT_TOKEN: Optional[str] = None  # 🔧 新增：Telegram Bot Token

    class Config:
            # 告诉 Pydantic 去哪里找文件
            # 这样无论你在哪里运行命令，都能找到 .env
            env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
            env_file_encoding = "utf-8"
            # 允许读取系统环境变量覆盖 .env
            case_sensitive = True

settings = Settings()