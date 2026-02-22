"""
添加管理员角色支持
- 在 profiles 表添加 role 列
- 创建默认管理员账号
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'add_admin_role_001'
down_revision = None  # 根据你的迁移链调整
branch_labels = None
depends_on = None


def upgrade():
    # 添加 role 列到 profiles 表
    op.add_column('profiles', sa.Column('role', sa.String(50), server_default='user'))
    
    # 创建索引
    op.create_index('ix_profiles_role', 'profiles', ['role'])
    
    # 注意：实际的用户创建需要在 Supabase Auth 中进行
    # 这里只是准备好数据库结构
    print("✅ 已添加 role 列到 profiles 表")


def downgrade():
    # 删除 role 列
    op.drop_index('ix_profiles_role')
    op.drop_column('profiles', 'role')
    print("✅ 已移除 role 列")
