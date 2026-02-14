"""add is_location_private to items

Revision ID: add_is_location_private
Revises: add_view_count_and_favorites
Create Date: 2026-02-13

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_is_location_private'
down_revision = 'add_view_count_and_favorites'
branch_labels = None
depends_on = None


def upgrade():
    # 添加 is_location_private 字段到 items 表
    op.add_column('items', sa.Column('is_location_private', sa.Boolean(), server_default=sa.text('false'), nullable=True))


def downgrade():
    op.drop_column('items', 'is_location_private')
