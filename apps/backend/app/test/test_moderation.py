"""
Moderation API 测试

测试内容审核相关的所有 API 端点：
- POST /api/v1/moderation/           提交内容审核
- GET  /api/v1/moderation/status/{id} 获取审核状态
- GET  /api/v1/moderation/admin/review-queue  获取审核队列
- POST /api/v1/moderation/admin/review        管理员审核
- GET  /api/v1/moderation/admin/stats         获取审核统计
"""
import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.moderation import (
    moderate_content,
    get_moderation_status,
    get_review_queue,
    review_item,
    get_moderation_stats
)


class TestModerateContent:
    """测试提交内容审核 API"""
    
    @pytest.mark.asyncio
    async def test_moderate_content_success(self, mock_user_id, mock_moderation_result_clean):
        """测试成功提交内容审核"""
        content = {
            "content_type": "item",
            "content_id": "item-123",
            "title": "Test Item",
            "description": "A clean test item"
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.moderation.moderate_item") as mock_moderate:
            mock_moderate.return_value = Mock(
                status="approved",
                **mock_moderation_result_clean
            )
            
            result = await moderate_content(
                content=content,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert result["status"] in ["approved", "flagged", "pending"]
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_moderate_content_flagged(self, mock_user_id, mock_moderation_result_flagged):
        """测试提交可疑内容"""
        content = {
            "content_type": "item",
            "content_id": "item-456",
            "title": "Suspicious Item",
            "description": "Contains inappropriate content"
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.moderation.moderate_item") as mock_moderate:
            mock_moderate.return_value = Mock(
                status="flagged",
                **mock_moderation_result_flagged
            )
            
            result = await moderate_content(
                content=content,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert result["status"] == "flagged"
        assert result["flagged"] is True
    
    @pytest.mark.asyncio
    async def test_moderate_content_invalid_type(self, mock_user_id):
        """测试无效的审核类型"""
        content = {
            "content_type": "invalid_type",
            "content_id": "item-123",
            "title": "Test Item"
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        with pytest.raises(HTTPException) as exc_info:
            await moderate_content(
                content=content,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST


class TestGetModerationStatus:
    """测试获取审核状态 API"""
    
    @pytest.mark.asyncio
    async def test_get_moderation_status_success(self, mock_user_id, mock_db_result):
        """测试成功获取审核状态"""
        mock_log = {
            "id": 123,
            "content_type": "item",
            "content_id": "item-123",
            "user_id": mock_user_id,
            "status": "approved",
            "flagged": False,
            "categories": {"sexual": False, "hate": False},
            "scores": {"sexual": 0.01, "hate": 0.001},
            "created_at": "2024-01-01T00:00:00"
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(first_value=mock_log))
        
        result = await get_moderation_status(
            log_id=123,
            db=mock_db
        )
        
        assert result["id"] == 123
        assert result["status"] == "approved"
        assert result["content_id"] == "item-123"
    
    @pytest.mark.asyncio
    async def test_get_moderation_status_not_found(self, mock_db_result):
        """测试获取不存在的审核状态"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(first_value=None))
        
        with pytest.raises(HTTPException) as exc_info:
            await get_moderation_status(
                log_id=99999,
                db=mock_db
            )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


class TestGetReviewQueue:
    """测试获取审核队列 API"""
    
    @pytest.mark.asyncio
    async def test_get_review_queue_success(self, mock_admin_id, mock_db_result):
        """测试管理员获取审核队列"""
        mock_queue = [
            {
                "id": 1,
                "content_type": "item",
                "content_id": "item-1",
                "title": "Item 1",
                "status": "flagged",
                "flagged": True,
                "categories": {"sexual": True},
                "scores": {"sexual": 0.85},
                "created_at": "2024-01-01T00:00:00",
                "user_email": "user1@example.com"
            },
            {
                "id": 2,
                "content_type": "profile",
                "content_id": "profile-1",
                "title": "Profile 1",
                "status": "pending",
                "flagged": False,
                "categories": {},
                "scores": {},
                "created_at": "2024-01-02T00:00:00",
                "user_email": "user2@example.com"
            },
        ]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_queue))
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=True):
            result = await get_review_queue(
                status="flagged",
                limit=50,
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert len(result) == 2
        assert result[0]["content_type"] == "item"
        assert result[1]["content_type"] == "profile"
    
    @pytest.mark.asyncio
    async def test_get_review_queue_filtered(self, mock_admin_id, mock_db_result):
        """测试获取筛选后的审核队列"""
        mock_queue = [
            {
                "id": 1,
                "content_type": "item",
                "status": "flagged",
                "flagged": True
            }
        ]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_queue))
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=True):
            result = await get_review_queue(
                status="flagged",
                content_type="item",
                limit=50,
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert len(result) == 1
        assert result[0]["content_type"] == "item"
    
    @pytest.mark.asyncio
    async def test_get_review_queue_not_admin(self):
        """测试非管理员无法获取审核队列"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await get_review_queue(
                    status="flagged",
                    limit=50,
                    db=mock_db,
                    current_user_id="regular-user-id"
                )
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


class TestReviewItem:
    """测试管理员审核 API"""
    
    @pytest.mark.asyncio
    async def test_review_approve_success(self, mock_admin_id, mock_db_result):
        """测试管理员通过审核"""
        mock_log = Mock(
            id=123,
            content_type="item",
            content_id="item-123",
            status="flagged",
            moderation_status="flagged"
        )
        
        mock_item = Mock(
            id="item-123",
            moderation_status="flagged"
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(scalar_one_or_none=mock_log),
            mock_db_result(scalar_one_or_none=mock_item)
        ])
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=True):
            result = await review_item(
                log_id=123,
                decision="approved",
                note="内容正常",
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert result["message"] == "审核完成"
        assert mock_log.status == "approved"
        assert mock_item.moderation_status == "approved"
    
    @pytest.mark.asyncio
    async def test_review_reject_success(self, mock_admin_id, mock_db_result):
        """测试管理员拒绝审核"""
        mock_log = Mock(
            id=123,
            content_type="item",
            content_id="item-123",
            status="flagged",
            moderation_status="flagged",
            review_note=None
        )
        
        mock_item = Mock(
            id="item-123",
            moderation_status="flagged"
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[
            mock_db_result(scalar_one_or_none=mock_log),
            mock_db_result(scalar_one_or_none=mock_item)
        ])
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=True):
            result = await review_item(
                log_id=123,
                decision="rejected",
                note="包含不当内容",
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert result["message"] == "审核完成"
        assert mock_log.status == "rejected"
        assert mock_log.review_note == "包含不当内容"
        assert mock_item.moderation_status == "rejected"
    
    @pytest.mark.asyncio
    async def test_review_not_admin(self):
        """测试非管理员无法审核"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await review_item(
                    log_id=123,
                    decision="approved",
                    note="",
                    db=mock_db,
                    current_user_id="regular-user-id"
                )
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    
    @pytest.mark.asyncio
    async def test_review_invalid_decision(self, mock_admin_id):
        """测试无效的审核决定"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        with pytest.raises(HTTPException) as exc_info:
            with patch("app.api.v1.moderation.is_admin_user", return_value=True):
                await review_item(
                    log_id=123,
                    decision="invalid_decision",
                    note="",
                    db=mock_db,
                    current_user_id=mock_admin_id
                )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    
    @pytest.mark.asyncio
    async def test_review_log_not_found(self, mock_admin_id, mock_db_result):
        """测试审核不存在的日志"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(scalar_one_or_none=None))
        
        with pytest.raises(HTTPException) as exc_info:
            with patch("app.api.v1.moderation.is_admin_user", return_value=True):
                await review_item(
                    log_id=99999,
                    decision="approved",
                    note="",
                    db=mock_db,
                    current_user_id=mock_admin_id
                )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


class TestGetModerationStats:
    """测试获取审核统计 API"""
    
    @pytest.mark.asyncio
    async def test_get_moderation_stats_success(self, mock_admin_id, mock_db_result):
        """测试管理员获取审核统计"""
        mock_stats = {
            "total": 1000,
            "approved": 850,
            "rejected": 50,
            "flagged": 80,
            "pending": 20,
            "today": 50
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(first_value=mock_stats))
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=True):
            result = await get_moderation_stats(
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert result["total"] == 1000
        assert result["approved"] == 850
        assert result["rejected"] == 50
    
    @pytest.mark.asyncio
    async def test_get_moderation_stats_not_admin(self):
        """测试非管理员无法获取统计"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        with patch("app.api.v1.moderation.is_admin_user", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await get_moderation_stats(
                    db=mock_db,
                    current_user_id="regular-user-id"
                )
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
