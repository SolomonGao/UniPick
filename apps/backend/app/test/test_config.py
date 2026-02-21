"""
配置文件单元测试
"""
import pytest
from unittest.mock import patch, MagicMock
import os

from app.core.config import Settings, settings


class TestSettings:
    """测试配置设置"""
    
    def test_database_url_format(self):
        """测试数据库 URL 格式"""
        # 确保数据库 URL 是有效的异步 PostgreSQL URL
        assert "postgresql+asyncpg" in settings.DATABASE_URL or "sqlite" in settings.DATABASE_URL
    
    def test_supabase_config(self):
        """测试 Supabase 配置"""
        assert settings.SUPABASE_URL is not None
        assert settings.SUPABASE_KEY is not None
    
    def test_openai_api_key(self):
        """测试 OpenAI API Key 配置"""
        # API Key 可能未设置，但属性应该存在
        assert hasattr(settings, 'OPENAI_API_KEY')
    
    def test_app_metadata(self):
        """测试应用元数据"""
        assert settings.APP_NAME == "UniPick API"
        assert settings.APP_VERSION is not None
    
    def test_cors_origins(self):
        """测试 CORS 配置"""
        assert hasattr(settings, 'CORS_ORIGINS')
        assert isinstance(settings.CORS_ORIGINS, list)


class TestEnvironmentVariables:
    """测试环境变量处理"""
    
    @patch.dict(os.environ, {"DATABASE_URL": "postgresql+asyncpg://test:test@localhost/test"})
    def test_database_url_from_env(self):
        """测试从环境变量读取数据库 URL"""
        test_settings = Settings()
        assert "postgresql+asyncpg" in test_settings.DATABASE_URL
    
    @patch.dict(os.environ, {"SUPABASE_URL": "https://test.supabase.co"})
    def test_supabase_url_from_env(self):
        """测试从环境变量读取 Supabase URL"""
        test_settings = Settings()
        assert test_settings.SUPABASE_URL == "https://test.supabase.co"
    
    @patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test123"})
    def test_openai_key_from_env(self):
        """测试从环境变量读取 OpenAI Key"""
        test_settings = Settings()
        assert test_settings.OPENAI_API_KEY == "sk-test123"


class TestConfigValidation:
    """测试配置验证"""
    
    def test_required_fields(self):
        """测试必填字段"""
        required_fields = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_KEY']
        for field in required_fields:
            assert hasattr(settings, field)
    
    def test_optional_fields(self):
        """测试可选字段"""
        optional_fields = ['OPENAI_API_KEY', 'SENTRY_DSN', 'REDIS_URL']
        for field in optional_fields:
            assert hasattr(settings, field)
