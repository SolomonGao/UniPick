# UniPick 修改汇总

## 修改日期
2026-02-21

## 修改内容

### 1. 被拒绝产品重新审核逻辑 (后端)

**文件**: `apps/backend/app/api/v1/items/items.py`

**修改**:
- 在 `update_item` 函数中添加逻辑：如果被拒绝的商品被编辑，自动重置审核状态为 `pending` 并触发重新审核
- 添加 `user_id` 参数到 `update_item` 函数，用于触发审核

**代码逻辑**:
```python
# 检查商品是否曾被拒绝
was_rejected = item.moderation_status == 'rejected'

# 如果被拒绝的商品被修改，重置为待审核状态
if was_rejected:
    item.moderation_status = 'pending'
    item.moderation_log_id = None

# 提交后触发重新审核
if was_rejected:
    await moderate_item(...)
```

### 2. 管理员查看待审核/拒绝产品权限 (后端)

**文件**: `apps/backend/app/api/v1/items/items.py`

**修改**:
- 在 `get_item` 函数中添加管理员权限检查
- 在 `list_items` 函数中添加管理员权限检查

**权限规则**:
- 审核通过的商品：所有人可见
- 待审核/被拒绝的商品：仅所有者和管理员可见

### 3. 数据库优化

**文件**: 
- `apps/backend/app/models/item.py`
- `apps/backend/app/migrations/versions/final_schema_cleanup.py`
- `docs/database_cleanup.sql`

**修改**:
- 添加 `updated_at` 字段到 `items` 表
- 添加 `moderation_status` 和 `moderation_log_id` 字段到 `profiles` 表（用户资料审核）
- 创建索引优化查询性能
- 添加触发器自动更新 `updated_at`

**新增的索引**:
- `idx_items_user_id` - 用户ID哈希索引
- `idx_items_user_id_created_at` - 用户商品列表查询
- `idx_items_moderation_status_created_at` - 商品审核队列查询
- `idx_profiles_moderation_status` - 用户资料审核队列查询

### 4. 数据库迁移脚本

**文件**:
- `apps/backend/app/scripts/run_migration.py`
- `docs/database_cleanup.sql`

**使用方式**:

**方式1**: 使用 Python 脚本（推荐）
```bash
cd apps/backend/app
python scripts/run_migration.py
```

**方式2**: 手动执行 SQL
```bash
# 在 Supabase SQL Editor 中执行 docs/database_cleanup.sql
```

### 5. 前端组件更新

**文件**: `apps/web/src/components/ItemDetail.tsx`

**修改**:
- 添加管理员状态检测
- 管理员可以看到商品的审核状态标签

**文件**: `apps/web/src/components/SellItemForm.tsx`

**修改**:
- 编辑被拒绝的商品时显示警告提示
- 提示用户修改后将重新进入审核流程

---

## 数据库变更详情

### items 表新增字段
```sql
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### profiles 表新增字段
```sql
moderation_status VARCHAR(50) DEFAULT 'pending'
moderation_log_id INTEGER
```

### 新增的索引
```sql
-- items 表索引
CREATE INDEX idx_items_user_id ON items USING hash (user_id);
CREATE INDEX idx_items_user_id_created_at ON items (user_id, created_at DESC);
CREATE INDEX idx_items_moderation_status_created_at ON items (moderation_status, created_at DESC);

-- profiles 表索引
CREATE INDEX idx_profiles_moderation_status ON profiles(moderation_status);
```

### 新增的触发器
```sql
-- 自动更新 updated_at
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Profile 审核链路完整说明

### 1. User 端（用户资料设置）

**文件**: `apps/web/src/components/Profile.tsx`

**功能**:
- 显示用户资料审核状态（pending/approved/flagged/rejected）
- 如果被拒绝，显示红色警告提示
- 修改用户名、简介后自动触发重新审核

**审核触发时机**:
- 用户修改 `username`, `full_name`, `bio` 任意字段
- 如果被拒绝过，重置为 `pending` 并触发 AI 审核

### 2. Admin 端（审核面板）

**文件**: `apps/web/src/components/AdminModerationPanel.tsx`

**功能**:
- 新增「类型」筛选器：全部 / 商品 / 用户资料
- 审核 `profile` 类型时显示「用户资料」标签
- 点击可跳转到用户资料详情页

### 3. Backend API

**文件**: `apps/backend/app/api/v1/users/profile.py`

**新增 API**:
```
GET  /api/v1/users/admin/review-queue   # 获取待审核的用户资料
GET  /api/v1/users/admin/list          # 按状态获取用户资料列表
```

**修改 API**:
```
PUT  /api/v1/users/me                  # 更新资料后自动触发审核
```

### 4. 审核服务

**文件**: `apps/backend/app/api/v1/moderation.py`

**修改**:
```
GET  /api/v1/moderation/admin/review-queue?content_type=profile  # 筛选用户资料
```

**审核流程**:
```
用户修改资料 → moderation_status = 'pending' → AI审核 → moderation_logs记录 → 等待人工审核
```

---

## 部署步骤

1. **部署后端代码**
   ```bash
   cd apps/backend/app
   git pull  # 或手动更新代码
   ```

2. **执行数据库迁移**
   ```bash
   python scripts/run_migration.py
   ```

3. **重启后端服务**
   ```bash
   # 如果使用 Docker
   docker restart unipick-backend
   
   # 如果使用直接运行
   # 停止当前进程并重新启动
   ```

4. **部署前端代码**
   ```bash
   cd apps/web
   npm run build
   # 部署构建后的文件
   ```

---

## 测试验证

### 测试1: 被拒绝商品重新审核
1. 创建一个商品并等待被拒绝
2. 编辑该商品
3. 检查审核状态是否变为 `pending`
4. 检查是否触发新的审核流程

### 测试2: 管理员查看待审核商品
1. 使用管理员账号登录
2. 访问任意待审核商品的详情页 `/items/{id}`
3. 确认可以正常查看

### 测试3: 普通用户权限
1. 使用普通用户账号登录
2. 尝试访问其他用户的待审核商品
3. 确认返回 404 错误

### 测试4: Profile 审核完整链路
1. 用户端修改用户名或简介
2. 检查 moderation_status 变为 `pending`
3. 管理员端在「类型: 用户资料」中看到该记录
4. 管理员审核通过/拒绝
5. 用户端看到审核状态更新

### 测试5: Profile 被拒绝后修改
1. 管理员拒绝用户资料
2. 用户端看到「已拒绝」状态和红色提示
3. 用户修改资料
4. 状态重置为 `pending` 并重新审核

---

## 注意事项

1. 数据库迁移脚本会跳过已存在的索引和列，可以安全地多次运行
2. 触发器会在更新记录时自动更新 `updated_at` 字段
3. 管理员需要在 `profiles` 表中设置 `role = 'admin'` 才能生效
