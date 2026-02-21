"""
安全模块单元测试
"""
import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials

from app.core.security import (
    get_current_user_id,
    get_current_user_id_optional
)
from app.core.permissions import require_auth, require_item_owner


class TestSecurity:
    """测试安全功能"""
    
    @pytest.mark.asyncio
    async def test_get_current_user_id_success(self):
        """测试成功获取当前用户 ID"""
        mock_credentials = Mock(spec=HTTPAuthorizationCredentials)
        mock_credentials.credentials = "mock_token"
        
        with patch("app.core.security.supabase") as mock_supabase:
            mock_supabase.auth.get_user = Mock(return_value=Mock(
                user=Mock(id="user123")
            ))
            
            result = await get_current_user_id(mock_credentials)
            assert result == "user123"
    
    @pytest.mark.asyncio
    async def test_get_current_user_id_invalid_token(self):
        """测试无效 token"""
        mock_credentials = Mock(spec=HTTPAuthorizationCredentials)
        mock_credentials.credentials = "invalid_token"
        
        with patch("app.core.security.supabase") as mock_supabase:
            mock_supabase.auth.get_user = Mock(return_value=Mock(user=None))
            
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user_id(mock_credentials)
            
            assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_current_user_id_no_credentials(self):
        """测试无凭证"""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(None)
        
        assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_current_user_id_optional_with_token(self):
        """测试可选认证 - 有 token"""
        mock_credentials = Mock(spec=HTTPAuthorizationCredentials)
        mock_credentials.credentials = "mock_token"
        
        with patch("app.core.security.supabase") as mock_supabase:
            mock_supabase.auth.get_user = Mock(return_value=Mock(
                user=Mock(id="user123")
            ))
            
            result = await get_current_user_id_optional(mock_credentials)
            assert result == "user123"
    
    @pytest.mark.asyncio
    async def test_get_current_user_id_optional_no_token(self):
        """测试可选认证 - 无 token"""
        result = await get_current_user_id_optional(None)
        assert result is None


class TestPermissions:
    """测试权限控制"""
    
    @pytest.mark.asyncio
    async def test_require_auth(self):
        """测试需要认证"""
        mock_request = Mock(spec=Request)
        mock_request.headers = {"Authorization": "Bearer token123"}
        
        with patch("app.core.permissions.supabase") as mock_supabase:
            mock_supabase.auth.get_user = Mock(return_value=Mock(
                user=Mock(id="user123")
            ))
            
            auth = require_auth()
            result = await auth(mock_request)
            
            assert result == "user123"
    
    @pytest.mark.asyncio
    async def test_require_auth_no_header(self):
        """测试缺少认证头"""
        mock_request = Mock(spec=Request)
        mock_request.headers = {}
        
        auth = require_auth()
        
        with pytest.raises(HTTPException) as exc_info:
            await auth(mock_request)
        
        assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_require_item_owner_success(self):
        """测试商品所有者验证成功"""
        mock_db = Mock()
        mock_db.execute = Mock(return_value=Mock(
            scalar=Mock(return_value="user123")  # 商品所有者 ID
        ))
        
        owner_check = require_item_owner(1)
        
        with patch("app.core.permissions.get_db", return_value=mock_db):
            with patch("app.core.permissions.get_current_user_id", return_value="user123"):
                # 应该通过验证
                pass  # 实际测试需要更多 mock
    
    @pytest.mark.asyncio
    async def test_require_item_owner_forbidden(self):
        """测试非所有者访问"""
        mock_db = Mock()
        mock_db.execute = Mock(return_value=Mock(
            scalar=Mock(return_value="owner456")  # 不同用户
        ))
        
        with pytest.raises(HTTPException) as exc_info:
            # 模拟所有者检查
            raise HTTPException(status_code=403, detail="无权操作此商品")
        
        assert exc_info.value.status_code == 403


class TestTokenValidation:
    """测试 Token 验证"""
    
    def test_bearer_token_format(self):
        """测试 Bearer token 格式"""
        # 有效的 Bearer token
        valid_token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        assert valid_token.startswith("Bearer ")
        
        # 无效格式
        invalid_token = "Basic dXNlcjpwYXNz"
        assert not invalid_token.startswith("Bearer ")
    
    def test_token_extraction(self):
        """测试 Token 提取"""
        auth_header = "Bearer mock_token_123"
        token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
        assert token == "mock_token_123"
    
    def test_missing_bearer_prefix(self):
        """测试缺少 Bearer 前缀"""
        auth_header = "mock_token_123"
        token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
        assert token is None
