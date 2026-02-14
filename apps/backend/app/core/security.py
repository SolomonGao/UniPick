from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient # 👈 引入这个客户端
from app.core.config import settings

security = HTTPBearer(auto_error=False)


JWKS_URL = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """获取当前用户ID，强制要求认证"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = credentials.credentials
    try:
        # 1. 自动去 Supabase 下载并匹配对应的公钥
        jwks_client = PyJWKClient(JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # 2. 解码 (PyJWKClient 会自动处理 PEM 转换)
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

    except jwt.PyJWTError as e:
        print(f"JWT Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user_id_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """获取当前用户ID，可选认证（未登录返回 None）"""
    if not credentials:
        return None
    
    token = credentials.credentials
    try:
        jwks_client = PyJWKClient(JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated"
        )
        
        return payload.get("sub")
    except Exception:
        return None