-- ============================================
-- Profile 审核功能完整迁移脚本
-- 实现：审核中时自己看到新资料，他人看到已审核的老资料
-- ============================================

-- 1. 添加 display_ 字段存储已审核对外显示的资料
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_username VARCHAR(50);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_full_name VARCHAR(100);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_bio TEXT;

-- 2. 添加审核相关字段（如果不存在）
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

-- 5. 验证迁移结果
SELECT 
    'profiles.display_username' as field,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'display_username'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END as status

UNION ALL

SELECT 
    'profiles.display_full_name',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'display_full_name'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END

UNION ALL

SELECT 
    'profiles.display_bio',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'display_bio'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END

UNION ALL

SELECT 
    'profiles.moderation_status',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'moderation_status'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END;
