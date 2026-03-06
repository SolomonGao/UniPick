"""
Users API 测试

测试用户资料相关的所有 API 端点：
- GET  /api/v1/users/me              获取当前用户资料
- GET  /api/v1/users/{id}/public     获取用户公开资料
- PUT  /api/v1/users/me              更新用户资料
- POST /api/v1/users/me/avatar       上传头像
- POST /api/v1/users/admin/approve/{id}   管理员通过审核
- POST /api/v1/users/admin/reject/{id}    管理员拒绝审核
- GET  /api/v1/users/admin/pending        获取待审核列表
"""
import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.users.profile import (
    get_my_profile,
    get_public_profile,
    update_profile,
    upload_avatar,
    approve_user,
    reject_user,
    get_pending_profiles
)


class TestGetMyProfile:
    """测试获取当前用户资料 API"""
    
    @pytest.mark.asyncio
    async def test_get_my_profile_success(self, mock_user_id, sample_profile_data, mock_db_result):
        """测试成功获取个人资料"""
        mock_profile = {
            "id": mock_user_id,
            "email": "test@example.com",
            "username": sample_profile_data["username"],
            "full_name": sample_profile_data["full_name"],
            "bio": sample_profile_data["bio"],
            "phone": sample_profile_data["phone"],
            "campus": sample_profile_data["campus"],
            "university": sample_profile_data["university"],
            "avatar_url": "https://example.com/avatar.jpg",
            "is_admin": False,
            "moderation_status": "approved",
            "created_at": "2024-01-01T00:00:00"
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(first_value=mock_profile))
        
        result = await get_my_profile(
            db=mock_db,
            user_id=mock_user_id
        )
        
        assert result["id"] == mock_user_id
        assert result["username"] == sample_profile_data["username"]
        assert result["email"] == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_get_my_profile_not_found(self, mock_user_id, mock_db_result):
        """测试获取不存在的资料"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(first_value=None))
        
        with pytest.raises(HTTPException) as exc_info:
            await get_my_profile(
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


class TestGetPublicProfile:
    """测试获取用户公开资料 API"""
    
    @pytest.mark.asyncio
    async def test_get_public_profile_success(self, mock_user_id, sample_profile_data, mock_db_result):
        """测试成功获取公开资料"""
        mock_profile = {
            "id": mock_user_id,
            "username": sample_profile_data["username"],
            "full_name": sample_profile_data["full_name"],
            "bio": sample_profile_data["bio"],
            "campus": sample_profile_data["campus"],
            "university": sample_profile_data["university"],
            "avatar_url": "https://example.com/avatar.jpg",
            "show_phone": False
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(first_value=mock_profile))
        
        result = await get_public_profile(
            user_id=mock_user_id,
            db=mock_db
        )
        
        assert result["id"] == mock_user_id
        assert result["username"] == sample_profile_data["username"]
        assert "phone" not in result  # Phone should not be in public profile
    
    @pytest.mark.asyncio
    async def test_get_public_profile_not_found(self, mock_db_result):
        """测试获取不存在的公开资料"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(first_value=None))
        
        with pytest.raises(HTTPException) as exc_info:
            await get_public_profile(
                user_id="non-existent-id",
                db=mock_db
            )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateProfile:
    """测试更新用户资料 API"""
    
    @pytest.mark.asyncio
    async def test_update_profile_success(self, mock_user_id, sample_profile_data):
        """测试成功更新资料"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.users.profile.moderate_profile") as mock_moderate:
            mock_moderate.return_value = Mock(status="approved")
            
            result = await update_profile(
                profile_data=sample_profile_data,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert result["message"] == "资料更新成功"
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_profile_with_avatar(self, mock_user_id, sample_profile_data):
        """测试更新资料（含头像）"""
        profile_data = sample_profile_data.copy()
        profile_data["avatar_url"] = "https://example.com/new-avatar.jpg"
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.users.profile.moderate_profile") as mock_moderate:
            mock_moderate.return_value = Mock(status="approved")
            
            result = await update_profile(
                profile_data=profile_data,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert result["message"] == "资料更新成功"
    
    @pytest.mark.asyncio
    async def test_update_profile_validation_error(self, mock_user_id):
        """测试更新资料验证失败"""
        invalid_data = {
            "username": "ab",  # Too short
            "full_name": "Test",
            "bio": "x" * 1001,  # Too long
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        with pytest.raises(HTTPException) as exc_info:
            await update_profile(
                profile_data=invalid_data,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST


class TestUploadAvatar:
    """测试上传头像 API"""
    
    @pytest.mark.asyncio
    async def test_upload_avatar_success(self, mock_user_id):
        """测试成功上传头像"""
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "avatar.jpg"
        mock_file.content_type = "image/jpeg"
        mock_file.read = AsyncMock(return_value=b"fake_image_data")
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.users.profile.supabase") as mock_supabase:
            mock_supabase.storage = Mock()
            mock_supabase.storage.from_ = Mock(return_value=Mock(
                upload=AsyncMock(),
                get_public_url=Mock(return_value={"publicUrl": "https://example.com/avatar.jpg"})
            ))
            
            result = await upload_avatar(
                file=mock_file,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert "url" in result
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_upload_avatar_invalid_type(self, mock_user_id):
        """测试上传无效格式头像"""
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "avatar.txt"
        mock_file.content_type = "text/plain"
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        with pytest.raises(HTTPException) as exc_info:
            await upload_avatar(
                file=mock_file,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    
    @pytest.mark.asyncio
    async def test_upload_avatar_file_too_large(self, mock_user_id):
        """测试上传过大头像"""
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "avatar.jpg"
        mock_file.content_type = "image/jpeg"
        mock_file.read = AsyncMock(return_value=b"x" * (6 * 1024 * 1024))  # 6MB
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        with pytest.raises(HTTPException) as exc_info:
            await upload_avatar(
                file=mock_file,
                db=mock_db,
                user_id=mock_user_id
            )
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST


class TestAdminApproveUser:
    """测试管理员通过用户审核 API"""
    
    @pytest.mark.asyncio
    async def test_approve_user_success(self, mock_admin_id, mock_user_id):
        """测试管理员成功通过用户"""
        mock_profile = Mock(
            id=mock_user_id,
            username="testuser",
            moderation_status="pending"
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(scalar_one_or_none=Mock(return_value=mock_profile)))
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=True):
            result = await approve_user(
                user_id=mock_user_id,
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert result["message"] == "用户已通过审核"
        assert mock_profile.moderation_status == "approved"
    
    @pytest.mark.asyncio
    async def test_approve_user_not_admin(self, mock_user_id):
        """测试非管理员无法通过审核"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await approve_user(
                    user_id=mock_user_id,
                    db=mock_db,
                    current_user_id="regular-user-id"
                )
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    
    @pytest.mark.asyncio
    async def test_approve_user_not_found(self, mock_admin_id):
        """测试审核不存在的用户"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(scalar_one_or_none=Mock(return_value=None)))
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=True):
            with pytest.raises(HTTPException) as exc_info:
                await approve_user(
                    user_id="non-existent-id",
                    db=mock_db,
                    current_user_id=mock_admin_id
                )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


class TestAdminRejectUser:
    """测试管理员拒绝用户审核 API"""
    
    @pytest.mark.asyncio
    async def test_reject_user_success(self, mock_admin_id, mock_user_id):
        """测试管理员成功拒绝用户"""
        mock_profile = Mock(
            id=mock_user_id,
            username="testuser",
            moderation_status="pending"
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(scalar_one_or_none=Mock(return_value=mock_profile)))
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=True):
            result = await reject_user(
                user_id=mock_user_id,
                note="资料不完整",
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert result["message"] == "用户已拒绝"
        assert mock_profile.moderation_status == "rejected"
    
    @pytest.mark.asyncio
    async def test_reject_user_with_note(self, mock_admin_id, mock_user_id):
        """测试拒绝用户并添加备注"""
        mock_profile = Mock(
            id=mock_user_id,
            username="testuser",
            moderation_status="pending",
            moderation_note=None
        )
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=Mock(scalar_one_or_none=Mock(return_value=mock_profile)))
        mock_db.commit = AsyncMock()
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=True):
            result = await reject_user(
                user_id=mock_user_id,
                note="头像包含不当内容",
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert result["message"] == "用户已拒绝"
        assert mock_profile.moderation_note == "头像包含不当内容"


class TestGetPendingProfiles:
    """测试获取待审核用户列表 API"""
    
    @pytest.mark.asyncio
    async def test_get_pending_profiles_success(self, mock_admin_id, mock_db_result):
        """测试管理员获取待审核列表"""
        mock_profiles = [
            Mock(
                id="user-1",
                username="user1",
                full_name="User One",
                email="user1@example.com",
                moderation_status="pending",
                created_at=Mock(isoformat=Mock(return_value="2024-01-01T00:00:00"))
            ),
            Mock(
                id="user-2",
                username="user2",
                full_name="User Two",
                email="user2@example.com",
                moderation_status="pending",
                created_at=Mock(isoformat=Mock(return_value="2024-01-02T00:00:00"))
            ),
        ]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(mock_profiles))
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=True):
            result = await get_pending_profiles(
                limit=50,
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert len(result) == 2
        assert result[0]["username"] == "user1"
        assert result[1]["username"] == "user2"
    
    @pytest.mark.asyncio
    async def test_get_pending_profiles_empty(self, mock_admin_id, mock_db_result):
        """测试获取空待审核列表"""
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result([]))
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=True):
            result = await get_pending_profiles(
                limit=50,
                db=mock_db,
                current_user_id=mock_admin_id
            )
        
        assert result == []
    
    @pytest.mark.asyncio
    async def test_get_pending_profiles_not_admin(self):
        """测试非管理员无法获取待审核列表"""
        mock_db = AsyncMock(spec=AsyncSession)
        
        with patch("app.api.v1.users.profile.is_admin_user", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await get_pending_profiles(
                    limit=50,
                    db=mock_db,
                    current_user_id="regular-user-id"
                )
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
