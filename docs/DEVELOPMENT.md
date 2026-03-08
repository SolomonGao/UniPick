# UniPick 开发文档 - 高并发二手交易平台

> 🎯 **项目目标**: 打造支持高并发的国际化校园二手交易平台（类似闲鱼/eBay）
> 
> 📅 **文档更新频率**: 每日 08:00 EDT
> 
> 🔄 **最后更新**: 2026-03-08

---

## 📊 项目概览

### 当前状态
| 模块 | 完成度 | 状态 |
|------|--------|------|
| 用户系统 | 85% | ✅ 认证、资料、权限 |
| 商品系统 | 90% | ✅ CRUD、搜索、筛选 |
| 地理位置 | 80% | ✅ PostGIS、距离搜索 |
| 内容审核 | 90% | ✅ AI审核、人工审核 |
| 收藏/浏览 | 95% | ✅ 完整功能 |
| 消息系统 | 0% | ⏳ 待开发 |
| 支付系统 | 0% | ⏳ 待规划 |
| 高并发优化 | 40% | 🔄 进行中 |

### 技术栈
```
前端: Astro 5 + React 19 + Tailwind 4 + TanStack Query
后端: FastAPI + SQLAlchemy 2.0 (async) + PostGIS
数据库: PostgreSQL 15 + Redis (缓存)
基础设施: Supabase + Docker + GitHub Actions
```

---

## 🏗️ 高并发架构设计

### 1. 水平扩展架构
```
                    ┌─────────────┐
                    │   CDN       │
                    │  (CloudFlare)│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Load Balancer│
                    │   (Nginx/ALB) │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ Web-1   │       │ Web-2   │       │ Web-3   │
   │ (Astro) │       │ (Astro) │       │ (Astro) │
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  API Cluster  │
                    │  (FastAPI)    │
                    │  - Rate Limit │
                    │  - Auth       │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌────▼────┐ ┌────▼────┐
        │  Primary  │ │  Read   │ │  Redis  │
        │  PostgreSQL│ │  Replica│ │  Cluster│
        │  (PostGIS) │ │  (x2)   │ │         │
        └───────────┘ └─────────┘ └─────────┘
```

### 2. 性能指标目标
| 指标 | 目标值 | 当前值 | 状态 |
|------|--------|--------|------|
| 页面首屏加载 | < 1.5s | ~2s | 🟡 |
| API 响应时间 (P95) | < 200ms | ~300ms | 🟡 |
| 并发用户支持 | 10,000+ | 未测试 | ⚪ |
| 数据库 QPS | 5,000+ | ~1,000 | 🟡 |
| 图片加载时间 | < 1s | ~1.5s | 🟡 |

### 3. 缓存策略
```python
# 多级缓存架构
L1: Browser Cache (静态资源)
L2: CDN Cache (图片、JS/CSS)
L3: Redis Cache (API 响应、会话)
L4: Database Query Cache (SQLAlchemy)

# 缓存 key 设计
item:{id}           # 商品详情 (TTL: 5min)
item:list:{hash}    # 商品列表 (TTL: 2min)
user:{id}:profile   # 用户资料 (TTL: 10min)
search:{query}      # 搜索结果 (TTL: 1min)
```

---

## 📋 开发路线图

### Phase 1: 核心交易闭环 (当前 - 3月底)
- [x] 用户认证系统
- [x] 商品发布/管理
- [x] 搜索与筛选
- [x] 地理位置服务
- [x] 内容审核系统
- [ ] **站内消息系统** ⏳ 当前重点
- [ ] **交易状态机** ⏳ 当前重点

### Phase 2: 高并发优化 (4月)
- [ ] Redis 缓存层
- [ ] 数据库读写分离
- [ ] 消息队列 (Celery + Redis)
- [ ] 图片 CDN 优化
- [ ] 性能监控 (Prometheus + Grafana)

### Phase 3: 支付与信用 (5月)
- [ ] 支付集成 (Stripe/Venmo)
- [ ] 信用评价体系
- [ ] 担保交易流程
- [ ] 退款/仲裁机制

### Phase 4: 智能化 (6月)
- [ ] AI 定价建议
- [ ] 个性化推荐
- [ ] 智能客服机器人
- [ ] 数据分析仪表板

---

## 🎯 下一步开发任务 (优先级排序)

### 🔴 P0 - 本周必做 (阻塞上线)

#### 1. 站内消息系统 💬
**状态**: 未开始 ⏳
**预计工时**: 16h
**技术方案**:
```python
# 数据库模型
class Conversation:
    id: UUID
    item_id: int          # 关联商品
    buyer_id: UUID        # 买家
    seller_id: UUID       # 卖家
    created_at: datetime
    updated_at: datetime

class Message:
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str
    is_read: bool
    created_at: datetime

# API 设计
POST   /api/v1/conversations/           # 发起对话
GET    /api/v1/conversations/           # 获取对话列表
GET    /api/v1/conversations/{id}       # 获取对话详情
POST   /api/v1/conversations/{id}/messages  # 发送消息
PUT    /api/v1/messages/{id}/read       # 标记已读
GET    /api/v1/messages/unread-count    # 未读消息数
```

**前端组件**:
- 消息中心页面 `/messages`
- 对话详情页 `/messages/[id]`
- 消息输入框组件
- 未读消息徽章 (导航栏)

#### 2. 交易状态管理 📦
**状态**: 未开始 ⏳
**预计工时**: 12h
```python
# 交易状态枚举
class TransactionStatus:
    NEGOTIATING = "negotiating"      # 沟通中
    PENDING_PAYMENT = "pending_payment"  # 待付款
    PAID = "paid"                    # 已付款
    SHIPPED = "shipped"              # 已发货
    DELIVERED = "delivered"          # 已送达
    COMPLETED = "completed"          # 交易完成
    CANCELLED = "cancelled"          # 已取消
    DISPUTED = "disputed"            # 纠纷中
```

---

### 🟡 P1 - 近期重要 (影响体验)

#### 3. Redis 缓存层 ⚡
**状态**: 未开始
**预计工时**: 8h
- 商品详情缓存
- 用户会话缓存
- 热门搜索缓存

#### 4. 图片优化 📸
**状态**: 部分完成
**预计工时**: 6h
- WebP 格式支持
- 响应式图片 (srcset)
- 懒加载优化
- CDN 配置

#### 5. 实时通知 🔔
**状态**: Telegram 已删除，需重新设计
**预计工时**: 10h
- WebSocket 连接管理
- 消息推送服务
- 邮件通知 (SendGrid)

---

### 🟢 P2 - 中期规划

#### 6. 数据库优化 🗄️
- 读写分离配置
- 分区表设计 (按时间)
- 索引优化
- 查询性能分析

#### 7. 安全加固 🔒
- Rate limiting 细化
- SQL 注入防护审计
- XSS 防护
- CSRF 防护

#### 8. 监控与日志 📊
- Sentry 错误监控
- Prometheus 指标
- Grafana 仪表板
- 日志聚合 (ELK)

---

## 📁 当前文件状态

### 后端 API 完成度
| 模块 | 文件 | 状态 |
|------|------|------|
| Items | `items.py` | ✅ 100% |
| Favorites | `favorites.py` | ✅ 100% |
| Users | `profile.py` | ✅ 95% |
| Moderation | `moderation.py` | ✅ 95% |
| Messages | `messages.py` | ❌ 缺失 |
| Transactions | `transactions.py` | ❌ 缺失 |
| Notifications | `notifications.py` | ❌ 缺失 |

### 前端页面完成度
| 页面 | 文件 | 状态 |
|------|------|------|
| 首页/Feed | `index.astro` | ✅ 100% |
| 商品详情 | `items/[id].astro` | ✅ 100% |
| 发布商品 | `sell.astro` | ✅ 100% |
| 搜索 | `search.astro` | ✅ 100% |
| 用户资料 | `profile.astro` | ✅ 95% |
| 我的发布 | `my-listings.astro` | ✅ 95% |
| 消息中心 | `messages.astro` | ❌ 缺失 |
| 交易管理 | `transactions.astro` | ❌ 缺失 |

---

## 🚀 CI/CD 状态

### GitHub Actions 工作流
```yaml
✅ Backend Tests    # 每次 PR 自动运行
✅ Frontend Build   # 每次 PR 自动构建
⏳ E2E Tests        # 待配置 (Playwright)
⏳ Deploy Staging   # 待配置
⏳ Deploy Prod      # 待配置
```

### 测试覆盖率
| 模块 | 覆盖率 | 目标 |
|------|--------|------|
| Items API | 85% | 90% |
| Users API | 80% | 90% |
| Favorites API | 85% | 90% |
| Moderation API | 75% | 85% |
| 整体 | 81% | 85% |

---

## 📊 本周开发计划 (2026-03-08 ~ 2026-03-15)

### Day 1-2 (周一-周二): 消息系统数据层
- [ ] 设计 Conversation 和 Message 模型
- [ ] 创建数据库 migration
- [ ] 实现消息 API (发送、获取、已读)

### Day 3-4 (周三-周四): 消息系统前端
- [ ] 消息中心页面 UI
- [ ] 对话详情页 UI
- [ ] 消息输入组件
- [ ] 未读消息徽章

### Day 5 (周五): 集成与测试
- [ ] 前后端联调
- [ ] 单元测试编写
- [ ] 基础 E2E 测试

### 周末: 代码审查与优化
- [ ] PR 审查
- [ ] 性能优化
- [ ] Bug 修复

---

## 📈 项目指标

### 代码统计
```
前端代码: ~15,000 行 (TypeScript/React/Astro)
后端代码: ~8,000 行 (Python/FastAPI)
测试代码: ~3,500 行 (pytest)
文档: ~2,000 行 (Markdown)
```

### 性能基准
```
首屏加载时间: 1.8s (目标: <1.5s)
API 平均响应: 180ms (目标: <150ms)
数据库查询: 95% < 50ms
错误率: 0.2% (目标: <0.1%)
```

---

## 📝 待办事项

- [ ] 消息系统数据库设计
- [ ] 消息系统 API 开发
- [ ] 消息系统前端开发
- [ ] WebSocket 实时消息
- [ ] Redis 缓存集成
- [ ] 图片 CDN 配置
- [ ] 生产环境部署配置
- [ ] 性能压力测试
- [ ] 安全渗透测试
- [ ] 用户反馈收集机制

---

## 🆘 阻塞问题

| 问题 | 影响 | 状态 | 解决方案 |
|------|------|------|----------|
| 无实时消息 | 用户无法沟通 | 🔴 严重 | 开发消息系统 |
| 缺少交易流程 | 无法完成交易 | 🔴 严重 | 设计状态机 |
| 缓存未配置 | 高并发性能差 | 🟡 中等 | 集成 Redis |
| 无支付集成 | 无法在线支付 | 🟡 中等 | 接入 Stripe |

---

*文档自动生成于 2026-03-08 12:56 EDT*
*下次更新: 2026-03-09 08:00 EDT*
