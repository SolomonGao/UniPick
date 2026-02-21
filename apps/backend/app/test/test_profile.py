"""
用户资料 API 单元测试
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.users.profile import (
    get_my_profile,
    update_my_profile,
    upload_avatar
)
from app.api.v1.users.profile import UserProfileUpdate


class TestGetMyProfile:
    """测试获取用户资料"""

    @pytest.mark.asyncio
    async def test_get_profile_success(self, mock_user_id):
        """测试成功获取资料"""
        mock_profile = {
            "id": mock_user_id,
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "bio": "Test bio",
            "phone": "123-456-7890",
            "campus": "Main Campus",
            "university": "Test University",
            "avatar_url": "https://example.com/avatar.jpg",
            "notification_email": True,
            "show_phone": False,
            "created_at": "2024-01-01T00:00:00"
        }

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                one_or_none=Mock(return_value=mock_profile)
            ))
        ))

        result = await get_my_profile(mock_db, mock_user_id)

        assert result["id"] == mock_user_id
        assert result["email"] == "test@example.com"
        assert result["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_get_profile_not_found(self, mock_user_id):
        """测试获取不存在的资料"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                one_or_none=Mock(return_value=None)
            ))
        ))

        with pytest.raises(HTTPException) as exc_info:
            await get_my_profile(mock_db, mock_user_id)

        assert exc_info.value.status_code == 404


class TestUpdateProfile:
    """测试更新用户资料"""

    @pytest.mark.asyncio
    async def test_update_profile_success(self, mock_user_id):
        """测试成功更新资料"""
        mock_profile = {
            "id": mock_user_id,
            "email": "test@example.com",
            "username": "olduser",
            "full_name": "Old Name",
            "bio": None,
            "phone": None,
            "campus": None,
            "university": None,
            "avatar_url": None,
            "notification_email": True,
            "show_phone": False,
        }

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                one_or_none=Mock(return_value=mock_profile)
            ))
        ))
        mock_db.commit = AsyncMock()

        update_data = UserProfileUpdate(
            username="newuser",
            full_name="New Name",
            bio="New bio"
        )

        result = await update_profile(update_data, mock_db, mock_user_id)

        assert result["username"] == "newuser"
        assert result["full_name"] == "New Name"
        assert result["bio"] == "New bio"

    @pytest.mark.asyncio
    async def test_update_profile_partial(self, mock_user_id):
        """测试部分更新资料"""
        mock_profile = {
            "id": mock_user_id,
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "bio": None,
            "phone": None,
            "campus": None,
            "university": None,
            "avatar_url": None,
            "notification_email": True,
            "show_phone": False,
        }

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                one_or_none=Mock(return_value=mock_profile)
            ))
        ))
        mock_db.commit = AsyncMock()

        # 只更新 bio
        update_data = UserProfileUpdate(bio="Updated bio")

        result = await update_my_profile(update_data, mock_db, mock_user_id)

        assert result["bio"] == "Updated bio"
        assert result["username"] == "testuser"  # 保持不变

    @pytest.mark.asyncio
    async def test_update_profile_empty_update(self, mock_user_id):
        """测试空更新"""
        mock_profile = {
            "id": mock_user_id,
            "email": "test@example.com",
            "username": "testuser",
            "full_name": "Test User",
            "bio": None,
            "phone": None,
            "campus": None,
            "university": None,
            "avatar_url": None,
            "notification_email": True,
            "show_phone": False,
        }

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(
            mappings=Mock(return_value=Mock(
                one_or_none=Mock(return_value=mock_profile)
            ))
        ))
        mock_db.commit = AsyncMock()

        # 空更新
        update_data = UserProfileUpdate()

        result = await update_my_profile(update_data, mock_db, mock_user_id)

        # 所有字段应保持不变
        assert result["username"] == "testuser"
        assert result["full_name"] == "Test User"


class TestProfileValidation:
    """测试资料验证"""

    def test_username_min_length(self):
        """测试用户名最小长度"""
        with pytest.raises(ValueError):
            UserProfileUpdate(username="a")  # 太短

    def test_username_max_length(self):
        """测试用户名最大长度"""
        with pytest.raises(ValueError):
            UserProfileUpdate(username="a" * 51)  # 太长

    def test_full_name_max_length(self):
        """测试全名最大长度"""
        with pytest.raises(ValueError):
            UserProfileUpdate(full_name="a" * 101)  # 太长

    def test_bio_max_length(self):
        """测试简介最大长度"""
        with pytest.raises(ValueError):
            UserProfileUpdate(bio="a" * 501)  # 太长

    def test_phone_max_length(self):
        """测试电话最大长度"""
        with pytest.raises(ValueError):
            UserProfileUpdate(phone="1" * 21)  # 太长

    def test_valid_profile_update(self):
        """测试有效的资料更新"""
        update = UserProfileUpdate(
            username="validuser",
            full_name="Valid Name",
            bio="Valid bio"
        )
        assert update.username == "validuser"
        assert update.full_name == "Valid Name"
        assert update.bio == "Valid bio"
