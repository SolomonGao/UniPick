"""Add view_count, favorites and view_history

Revision ID: add_view_count_and_favorites
Revises: 
Create Date: 2026-02-13

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_view_count_and_favorites'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # 添加 view_count 到 items 表
    op.add_column('items', sa.Column('view_count', sa.Integer(), server_default=sa.text('0'), nullable=True))
    
    # 创建 favorites 表
    op.create_table('favorites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=True),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'item_id', name='uix_user_item_favorite')
    )
    op.create_index(op.f('ix_favorites_id'), 'favorites', ['id'], unique=False)
    op.create_index(op.f('ix_favorites_user_id'), 'favorites', ['user_id'], unique=False)
    
    # 创建 view_history 表
    op.create_table('view_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('viewed_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=True),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'item_id', name='uix_user_item_view')
    )
    op.create_index(op.f('ix_view_history_id'), 'view_history', ['id'], unique=False)
    op.create_index(op.f('ix_view_history_user_id'), 'view_history', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_view_history_user_id'), table_name='view_history')
    op.drop_index(op.f('ix_view_history_id'), table_name='view_history')
    op.drop_table('view_history')
    
    op.drop_index(op.f('ix_favorites_user_id'), table_name='favorites')
    op.drop_index(op.f('ix_favorites_id'), table_name='favorites')
    op.drop_table('favorites')
    
    op.drop_column('items', 'view_count')