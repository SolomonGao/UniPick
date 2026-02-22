-- 检查当前用户的角色和邮箱
SELECT 
    id, 
    email, 
    role,
    COALESCE(role, 'not set') as role_status
FROM profiles 
WHERE email LIKE '%admin%' OR role = 'admin';

-- 设置指定邮箱为管理员（将 your-admin-email@example.com 替换为你的邮箱）
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';

-- 查看所有 profiles 表字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
