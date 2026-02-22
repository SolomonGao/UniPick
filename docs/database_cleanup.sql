-- ============================================
-- UniPick 数据库清理和优化脚本
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- ====== profiles 表审核字段 ======
-- 1. 添加 display_ 字段存储已审核对外显示的资料
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_username VARCHAR(50);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_full_name VARCHAR(100);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_bio TEXT;

-- 2. 添加 profiles 表的审核字段（如果不存在）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS moderation_log_id INTEGER;

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_moderation_status ON profiles(moderation_status);

-- 4. 初始化：将当前资料复制到 display_ 字段（假设现有资料都是已审核的）
UPDATE profiles 
SET display_username = username,
    display_full_name = full_name,
    display_bio = bio,
    moderation_status = 'approved'
WHERE display_username IS NULL;

-- 确保默认值正确
ALTER TABLE profiles 
ALTER COLUMN moderation_status SET DEFAULT 'pending';


-- ====== items 表优化 ======
-- 2. 确保 moderation_status 有正确的默认值
ALTER TABLE items 
ALTER COLUMN moderation_status SET DEFAULT 'pending';

-- 2. 确保 view_count 有正确的默认值
ALTER TABLE items 
ALTER COLUMN view_count SET DEFAULT 0;

-- 3. 创建 items 表的用户ID索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items USING hash (user_id);

-- 4. 创建复合索引（用于查询用户的商品列表）
CREATE INDEX IF NOT EXISTS idx_items_user_id_created_at ON items (user_id, created_at DESC);

-- 5. 创建 moderation_status + created_at 复合索引（用于审核队列查询）
CREATE INDEX IF NOT EXISTS idx_items_moderation_status_created_at ON items (moderation_status, created_at DESC);

-- 6. 添加 updated_at 列到 items 表（如果还没有）
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7. 创建触发器函数自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. 为 items 表创建触发器
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. 为 moderation_logs 表创建触发器
DROP TRIGGER IF EXISTS update_moderation_logs_updated_at ON moderation_logs;
CREATE TRIGGER update_moderation_logs_updated_at
    BEFORE UPDATE ON moderation_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. 验证迁移结果
SELECT 
    '添加的索引' as check_item,
    indexname as name
FROM pg_indexes 
WHERE tablename = 'items' AND indexname LIKE 'idx_items_%'

UNION ALL

SELECT 
    'items.updated_at 列' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'updated_at'
    ) THEN '✅ 已存在' ELSE '❌ 不存在' END as name

UNION ALL

SELECT 
    '触发器' as check_item,
    trigger_name
FROM information_schema.triggers 
WHERE trigger_name LIKE 'update_%_updated_at';
