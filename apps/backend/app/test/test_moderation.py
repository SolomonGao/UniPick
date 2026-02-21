"""
内容审核服务单元测试
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.moderation import ModerationService


class TestModerationService:
    """测试审核服务类"""

    def test_thresholds_configuration(self):
        """测试审核阈值配置"""
        assert ModerationService.THRESHOLDS['sexual'] == 0.8
        assert ModerationService.THRESHOLDS['sexual_minors'] == 0.5
        assert ModerationService.THRESHOLDS['hate'] == 0.8
        assert ModerationService.THRESHOLDS['violence'] == 0.8
        assert ModerationService.THRESHOLDS['self_harm'] == 0.9

    @pytest.mark.asyncio
    async def test_moderate_text_no_openai_client(self):
        """测试没有 OpenAI 客户端时的审核行为"""
        with patch("app.services.moderation.openai_client", None):
            result = await ModerationService.moderate_text("test content")

            assert result['flagged'] == False
            assert result['categories'] == {}
            assert result['scores'] == {}
            assert result['max_score'] == 0.0

    @pytest.mark.asyncio
    async def test_moderate_text_api_error(self):
        """测试 API 错误处理"""
        mock_client = Mock()
        mock_client.moderations = Mock()
        mock_client.moderations.create = AsyncMock(side_effect=Exception("API Error"))

        with patch("app.services.moderation.openai_client", mock_client):
            result = await ModerationService.moderate_text("content")

            # 出错时应该返回安全默认值
            assert result['flagged'] == False

    def test_get_status_from_score_approved(self):
        """测试正常评分返回 approved"""
        result = {"flagged": False, "max_score": 0.1}
        status = ModerationService.get_status_from_result(result)
        assert status == "approved"

    def test_get_status_from_score_flagged(self):
        """测试高评分返回 flagged"""
        result = {"flagged": True, "max_score": 0.85}
        status = ModerationService.get_status_from_result(result)
        assert status == "flagged"


class TestAdminReview:
    """测试管理员审核"""

    @pytest.mark.asyncio
    async def test_manual_review_approve(self):
        """测试人工审核通过"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        result = await ModerationService.manual_review(
            mock_db, 1, "approved", "Looks good", "admin123"
        )

        assert result["success"] == True
        assert result["status"] == "approved"

    @pytest.mark.asyncio
    async def test_manual_review_reject(self):
        """测试人工审核拒绝"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        result = await ModerationService.manual_review(
            mock_db, 1, "rejected", "Inappropriate content", "admin123"
        )

        assert result["success"] == True
        assert result["status"] == "rejected"


class TestModerationStats:
    """测试审核统计"""

    @pytest.mark.asyncio
    async def test_get_stats(self):
        """测试获取审核统计"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                all=Mock(return_value=[
                    {"status": "approved", "count": 100},
                    {"status": "flagged", "count": 10},
                    {"status": "rejected", "count": 5}
                ])
            ))
        ))

        result = await ModerationService.get_stats(mock_db)

        assert result["total"] == 115
        assert result["approved"] == 100
        assert result["flagged"] == 10
        assert result["rejected"] == 5


class TestUpdateContentStatus:
    """测试更新内容审核状态"""

    @pytest.mark.asyncio
    async def test_update_item_status(self):
        """测试更新商品审核状态"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        await ModerationService.update_content_moderation_status(
            mock_db, 'item', '123', 'approved', 1
        )

        mock_db.execute.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_profile_status(self):
        """测试更新用户资料审核状态"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        await ModerationService.update_content_moderation_status(
            mock_db, 'profile', 'user123', 'flagged', 2
        )

        mock_db.execute.assert_called_once()
        mock_db.commit.assert_called_once()


class TestGetPendingReview:
    """测试获取待审核内容"""

    @pytest.mark.asyncio
    async def test_get_pending_review(self):
        """测试获取待审核列表"""
        mock_logs = [
            {
                "id": 1,
                "content_type": "item",
                "status": "flagged",
                "user_email": "user@example.com"
            },
            {
                "id": 2,
                "content_type": "profile",
                "status": "flagged",
                "user_email": "user2@example.com"
            }
        ]

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                all=Mock(return_value=mock_logs)
            ))
        ))

        result = await ModerationService.get_pending_review(mock_db, 'flagged', 50)

        assert len(result) == 2
        assert result[0]["content_type"] == "item"
        assert result[1]["content_type"] == "profile"
