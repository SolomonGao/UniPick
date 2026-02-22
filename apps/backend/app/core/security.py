from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

JWKS_URL = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# 🔧 修复：缓存 JWKS 客户端，避免每次请求都下载
_jwks_client: Optional[PyJWKClient] = None

def get_jwks_client() -> PyJWKClient:
    """获取缓存的 JWKS 客户端"""
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(JWKS_URL, cache_jwk_set=True, lifespan=3600)
        logger.info("JWKS client initialized and cached")
    return _jwks_client


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """获取当前用户ID，强制要求认证"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = credentials.credentials
    try:
        # 🔧 修复：使用缓存的 JWKS 客户端
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # 解码 (PyJWKClient 会自动处理 PEM 转换)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated"
        )
        
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing sub")
        return user_id

    except jwt.ExpiredSignatureError:
        logger.warning("JWT token expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError as e:
        logger.warning(f"JWT validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Unexpected error during JWT validation: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


def get_current_user_id_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """获取当前用户ID，可选认证（未登录返回 None）"""
    if not credentials:
        return None
    
    token = credentials.credentials
    try:
        # 🔧 修复：使用缓存的 JWKS 客户端
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated"
        )
        
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        logger.debug("Optional auth: token expired")
        return None
    except Exception as e:
        logger.debug(f"Optional auth failed: {e}")
        return None