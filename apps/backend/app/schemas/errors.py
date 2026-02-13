from pydantic import BaseModel
from typing import Optional, Any, Dict

class ErrorResponse(BaseModel):
    """统一的错误响应格式"""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ValidationErrorResponse(ErrorResponse):
    """参数验证错误响应"""
    pass

class NotFoundErrorResponse(ErrorResponse):
    """资源未找到错误响应"""
    pass

class DatabaseErrorResponse(ErrorResponse):
    """数据库错误响应"""
    pass
