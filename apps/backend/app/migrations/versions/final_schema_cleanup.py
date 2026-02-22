"""
数据库清理和优化迁移
- 添加必要的索引
- 确保所有字段都有正确的默认值
- 添加触发器自动更新 updated_at

Revision ID: final_schema_cleanup
Revises: add_is_location_private
Create Date: 2026-02-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'final_schema_cleanup'
down_revision = 'add_is_location_private'
branch_labels = None
depends_on = None


def upgrade():
    """执行数据库优化"""
    
    # ====== profiles 表审核字段 ======
    # 1. 添加 moderation_status 列到 profiles 表（如果不存在）
    op.add_column('profiles', sa.Column('moderation_status', sa.String(50), server_default='pending', nullable=True))
    
    # 2. 添加 moderation_log_id 列到 profiles 表
    op.add_column('profiles', sa.Column('moderation_log_id', sa.Integer(), nullable=True))
    
    # 3. 创建 profiles 表的 moderation_status 索引
    op.create_index('ix_profiles_moderation_status', 'profiles', ['moderation_status'])
    
    
    # ====== items 表优化 ======
    # 4. 确保 items 表的 moderation_status 有正确的默认值
    op.execute("""
        ALTER TABLE items 
        ALTER COLUMN moderation_status SET DEFAULT 'pending'
    """)
    
    # 2. 确保 view_count 有正确的默认值
    op.execute("""
        ALTER TABLE items 
        ALTER COLUMN view_count SET DEFAULT 0
    """)
    
    # 3. 创建 items 表的用户ID索引（提高查询性能）
    op.create_index(
        'ix_items_user_id', 
        'items', 
        ['user_id'],
        postgresql_using='hash'
    )
    
    # 4. 创建复合索引（用于查询用户的商品列表）
    op.create_index(
        'ix_items_user_id_created_at', 
        'items', 
        ['user_id', 'created_at DESC']
    )
    
    # 5. 创建 moderation_status + created_at 复合索引（用于审核队列查询）
    op.create_index(
        'ix_items_moderation_status_created_at', 
        'items', 
        ['moderation_status', 'created_at DESC']
    )
    
    # 6. 添加 updated_at 列到 items 表（如果还没有）
    op.add_column('items', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=True))
    
    # 7. 创建触发器函数自动更新 updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql'
    """)
    
    # 8. 为 items 表创建触发器
    op.execute("""
        DROP TRIGGER IF EXISTS update_items_updated_at ON items;
        CREATE TRIGGER update_items_updated_at
            BEFORE UPDATE ON items
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)
    
    # 9. 为 moderation_logs 表创建触发器
    op.execute("""
        DROP TRIGGER IF EXISTS update_moderation_logs_updated_at ON moderation_logs;
        CREATE TRIGGER update_moderation_logs_updated_at
            BEFORE UPDATE ON moderation_logs
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """)
    
    print("✅ 数据库优化完成")


def downgrade():
    """回滚更改"""
    
    # 删除触发器
    op.execute("DROP TRIGGER IF EXISTS update_items_updated_at ON items")
    op.execute("DROP TRIGGER IF EXISTS update_moderation_logs_updated_at ON moderation_logs")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
    
    # 删除 items 表索引
    op.drop_index('ix_items_moderation_status_created_at', table_name='items')
    op.drop_index('ix_items_user_id_created_at', table_name='items')
    op.drop_index('ix_items_user_id', table_name='items')
    
    # 删除 items 表列
    op.drop_column('items', 'updated_at')
    
    # 删除 profiles 表的索引和列
    op.drop_index('ix_profiles_moderation_status', table_name='profiles')
    op.drop_column('profiles', 'moderation_log_id')
    op.drop_column('profiles', 'moderation_status')
    
    print("✅ 回滚完成")
