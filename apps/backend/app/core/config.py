import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str

    USER: str
    PASSWORD: str
    HOST: str
    PORT: str
    DNAME: str

    class Config:
            # 告诉 Pydantic 去哪里找文件
            # 这样无论你在哪里运行命令，都能找到 .env
            env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
            env_file_encoding = "utf-8"
            # 允许读取系统环境变量覆盖 .env
            case_sensitive = True

settings = Settings()