-- ============================================
-- UniPick 数据库迁移脚本
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 添加 profiles 表的 role 列（用于管理员权限）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

COMMENT ON COLUMN profiles.role IS '用户角色: user, admin';


-- 1.5 添加 profiles 表的审核字段
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS moderation_log_id INTEGER;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_moderation_status ON profiles(moderation_status);

COMMENT ON COLUMN profiles.moderation_status IS '审核状态: pending, approved, flagged, rejected';


-- 2. 添加 items 表的审核相关字段（如果还不存在）
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS moderation_log_id INTEGER;

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS original_price FLOAT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_items_moderation_status ON items(moderation_status);

COMMENT ON COLUMN items.moderation_status IS '审核状态: pending, approved, flagged, rejected';


-- 3. 创建审核日志表
CREATE TABLE IF NOT EXISTS moderation_logs (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,  -- 'item' 或 'profile'
    content_id VARCHAR(255) NOT NULL,   -- 内容ID
    user_id UUID NOT NULL,              -- 内容发布者ID
    content_text TEXT,                  -- 被审核的文本内容
    status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, flagged, rejected
    flagged BOOLEAN DEFAULT FALSE,      -- 是否被标记
    categories JSONB DEFAULT '{}',      -- 审核类别结果
    scores JSONB DEFAULT '{}',          -- 各分类分数
    reviewed_by UUID,                   -- 审核人ID
    reviewed_at TIMESTAMP WITH TIME ZONE, -- 审核时间
    review_note TEXT,                   -- 审核备注
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_moderation_logs_status ON moderation_logs(status);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_content ON moderation_logs(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user ON moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON moderation_logs(created_at DESC);

COMMENT ON TABLE moderation_logs IS '内容审核日志表';


-- 4. 创建浏览记录表（如果不存在）
CREATE TABLE IF NOT EXISTS view_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uix_user_item_view UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_view_history_user ON view_history(user_id);
CREATE INDEX IF NOT EXISTS idx_view_history_item ON view_history(item_id);


-- 5. 创建收藏表（如果不存在）
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uix_user_item_favorite UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_item ON favorites(item_id);


-- 6. 设置管理员（如果你有管理员邮箱）
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@unipick.app';


-- 7. 验证迁移结果
SELECT 
    'profiles.role 列' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END as status

UNION ALL

SELECT 
    'items.moderation_status 列' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'moderation_status'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END as status

UNION ALL

SELECT 
    'moderation_logs 表' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'moderation_logs'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END as status

UNION ALL

SELECT 
    'view_history 表' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'view_history'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END as status;
