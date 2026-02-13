# 🔍 UniPick 搜索 API 快速验证清单

**用途**: Dev-Agent 通知测试后，快速验证搜索功能

---

## 🚀 快速开始

```bash
# 1. 确保后端服务运行
cd /Volumes/mac外置硬盘/unipick/apps/backend
uvicorn app.main:app --reload

# 2. 确保有测试数据 (可选)
python app/test/seed.py

# 3. 执行自动化测试
./run_search_tests.sh
```

---

## ✅ 手动验证清单

### 1. 基础列表
```bash
curl "http://localhost:8000/api/v1/items/" | jq .
```
- [ ] 返回 HTTP 200
- [ ] 返回数组格式
- [ ] 包含必要的字段 (id, title, price, category)

### 2. 关键词搜索
```bash
curl "http://localhost:8000/api/v1/items/?keyword=台灯" | jq .
```
- [ ] 返回包含"台灯"的商品
- [ ] 搜索 title 和 description

### 3. 价格筛选
```bash
curl "http://localhost:8000/api/v1/items/?min_price=10&max_price=50" | jq .
```
- [ ] 所有结果价格在 10-50 之间

### 4. Category 筛选 ⭐
```bash
# 测试各个分类
curl "http://localhost:8000/api/v1/items/?category=家居" | jq .
curl "http://localhost:8000/api/v1/items/?category=游戏" | jq .
curl "http://localhost:8000/api/v1/items/?category=书籍" | jq .
curl "http://localhost:8000/api/v1/items/?category=数码" | jq .
```
- [ ] 家居分类只返回家居商品
- [ ] 游戏分类只返回游戏商品
- [ ] 书籍分类只返回书籍商品
- [ ] 数码分类只返回数码商品

### 5. 组合搜索
```bash
curl "http://localhost:8000/api/v1/items/?category=家居&min_price=20&max_price=100" | jq .
```
- [ ] 同时满足分类和价格条件

### 6. 排序验证
```bash
curl "http://localhost:8000/api/v1/items/?limit=10" | jq '.[].created_at'
```
- [ ] 按 created_at 倒序排列 (最新的在前)

### 7. 分页功能
```bash
curl "http://localhost:8000/api/v1/items/?skip=0&limit=5" | jq .
curl "http://localhost:8000/api/v1/items/?skip=5&limit=5" | jq .
```
- [ ] 第一页和第二页结果不同

---

## 📝 记录问题

发现问题时，记录以下信息：

```markdown
**问题**: [简要描述]
**复现步骤**:
1. [步骤1]
2. [步骤2]
**期望结果**: [应该发生什么]
**实际结果**: [实际发生了什么]
**截图/日志**: [如果有]
```

---

## 🔔 状态更新

- [ ] 等待 Dev-Agent 通知
- [ ] 执行自动化测试
- [ ] 执行手动验证
- [ ] 记录问题并反馈
- [ ] 验证修复

---

**最后更新**: 2026-02-13
