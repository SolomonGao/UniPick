"""
API 限流配置
防止 DDoS 攻击和暴力破解
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import FastAPI, Request, Response
from app.core.config import settings

# 创建限流器
# 使用用户ID或IP地址作为限流键
limiter = Limiter(
    key_func=lambda: "global",  # 默认使用全局限流
    enabled=True,
    storage_uri="memory://",  # 使用内存存储，生产环境可用 Redis
)


def get_user_or_ip_key(request: Request) -> str:
    """
    获取限流键：优先使用用户ID，否则使用IP地址
    """
    # 尝试从请求头获取用户ID（JWT token 解析后）
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    
    # 使用IP地址
    client_host = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # 获取第一个IP（真实客户端IP）
        client_host = forwarded_for.split(",")[0].strip()
    
    return f"ip:{client_host}"


def setup_rate_limiting(app: FastAPI):
    """
    设置 API 限流
    在 FastAPI 应用上注册限流器
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# 限流规则常量
class RateLimits:
    """API 限流规则"""
    
    # 通用规则
    DEFAULT = "100/minute"  # 默认每分钟100请求
    STRICT = "10/minute"    # 严格限制（登录、注册等）
    BURST = "20/second"     # 突发流量限制（搜索等）
    
    # 特定端点
    LOGIN = "5/minute"      # 登录尝试
    REGISTER = "3/minute"   # 注册
    UPLOAD = "10/minute"    # 文件上传
    SEARCH = "30/minute"    # 搜索
    CREATE_ITEM = "5/minute"  # 发布商品
    FAVORITE = "20/minute"  # 收藏操作
    VIEW = "60/minute"      # 浏览记录
