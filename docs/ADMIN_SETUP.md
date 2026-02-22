# 管理员账号设置指南

## 创建管理员账号

### 方法 1：通过 Supabase Dashboard（推荐）

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单 **Authentication** → **Users**
4. 点击 **Invite user** 或 **Add user**
5. 输入邮箱：`admin@unipick.app`
6. 设置密码：`admin`（生产环境请使用强密码）
7. 点击创建

### 方法 2：通过后端脚本

```bash
cd apps/backend/app

# 激活虚拟环境
conda activate unipick

# 运行初始化脚本
python scripts/init_admin.py

# 或者设置指定邮箱为管理员
python scripts/init_admin.py --email admin@unipick.app --set-admin
```

### 方法 3：手动 SQL

在 Supabase SQL Editor 中执行：

```sql
-- 1. 确保 role 列存在
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 2. 设置指定用户为管理员
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@unipick.app';

-- 3. 验证
SELECT email, role FROM profiles WHERE role = 'admin';
```

## 管理员权限说明

- 管理员邮箱列表（硬编码）：
  - `admin@unipick.app`
  - `admin@vt.edu`

- 或通过 `role = 'admin'` 数据库字段判断

## 管理员功能

登录管理员账号后，可以在用户菜单中看到 **"内容审核"** 入口：

1. 查看待审核内容
2. 审核通过/拒绝商品
3. 查看审核统计

## 安全建议

1. **生产环境请修改默认密码**
2. **使用强密码**（至少12位，包含大小写、数字、符号）
3. **启用 2FA**（Supabase 支持）
4. **定期更换密码**

## 故障排除

### 看不到审核入口

1. 确认已登录管理员账号
2. 检查 profile.role 是否为 'admin'
3. 检查邮箱是否在 ADMIN_EMAILS 列表中
4. 刷新页面重新获取用户资料

### API 返回 403

```json
{
  "detail": {
    "error": "PermissionDenied",
    "message": "需要管理员权限"
  }
}
```

表示当前用户没有管理员权限，请检查上述设置。
