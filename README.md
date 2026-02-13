# UniPick 🎓

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-5.17+-8C45FF?logo=astro)](https://astro.build)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-3.0+-3FCF8E?logo=supabase)](https://supabase.com)

> 🌍 **为国际学生打造的校园二手交易平台**

UniPick 是一个面向国际学生群体的全栈二手交易应用，帮助学生在校园社区内安全、便捷地买卖二手物品。

<p align="center">
  <img src="https://via.placeholder.com/800x400?text=UniPick+Preview" alt="UniPick Preview" width="800">
</p>

## ✨ 核心功能

| 功能 | 描述 |
|------|------|
| 🔐 **用户认证** | 基于 Supabase Auth 的邮箱/密码登录，支持密码重置 |
| 📷 **商品发布** | 支持图片上传的商品发布表单，Mapbox 地图精准选点 |
| 📍 **位置发现** | 基于 PostGIS 的地理位置商品展示，发现附近好物 |
| 🔍 **智能搜索** | 实时搜索商品标题和描述，快速找到心仪物品 |
| 📦 **商品详情** | 完整的商品详情页，展示图片、价格、位置和卖家信息 |
| 🔄 **无限滚动** | TanStack Query 驱动的流畅商品流浏览 |
| 🤖 **AI 定价** | （即将推出）智能价格预测 |

## 🏗️ 技术架构

```
UniPick/
├── apps/
│   ├── web/              # 前端应用 (Astro 5 + React 19)
│   │   ├── src/
│   │   │   ├── components/   # React 组件
│   │   │   ├── pages/        # Astro 页面（文件路由）
│   │   │   ├── layouts/      # 布局模板
│   │   │   └── lib/          # 工具函数
│   │   └── package.json
│   │
│   └── backend/app/      # 后端 API (FastAPI)
│       ├── api/v1/items/     # 商品相关接口
│       ├── core/             # 核心配置
│       ├── models/           # SQLAlchemy 模型
│       └── schemas/          # Pydantic 模式
│
└── AGENTS.md             # 开发者指南
```

## 🛠️ 技术栈

### 前端

| 技术 | 用途 |
|------|------|
| [Astro](https://astro.build/) 5.17+ | 静态站点生成、服务端渲染 |
| [React](https://react.dev/) 19 | 交互式 UI 组件 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [Tailwind CSS](https://tailwindcss.com/) 4.1+ | 原子化 CSS |
| [TanStack Query](https://tanstack.com/query) | 服务端状态管理、无限滚动 |
| [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | 表单处理与验证 |
| [Supabase JS Client](https://supabase.com/docs/reference/javascript) | 认证与存储 |
| [Framer Motion](https://www.framer.com/motion/) | 动画效果 |

### 后端

| 技术 | 用途 |
|------|------|
| [FastAPI](https://fastapi.tiangolo.com/) | 高性能 Python Web 框架 |
| [SQLAlchemy](https://www.sqlalchemy.org/) 2.0 (async) | ORM 数据库操作 |
| [asyncpg](https://magicstack.github.io/asyncpg/) | 异步 PostgreSQL 驱动 |
| [GeoAlchemy2](https://geoalchemy-2.readthedocs.io/) + [Shapely](https://shapely.readthedocs.io/) | PostGIS 地理空间支持 |
| [PyJWT](https://pyjwt.readthedocs.io/) | JWT Token 验证 |
| [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) | 环境配置管理 |

### 基础设施

| 服务 | 用途 |
|------|------|
| [Supabase](https://supabase.com/) | PostgreSQL 数据库、认证、存储 |
| Docker | 后端容器化 |

## 🚀 快速开始

### 环境要求

- **Node.js** 18+ (前端)
- **Python** 3.12+ (后端)
- **Docker** (可选，用于容器化部署)

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/unipick.git
cd unipick
```

### 2. 配置环境变量

#### 前端 (`apps/web/.env`)

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 后端 (`apps/backend/.env`)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/database?ssl=require
```

> ⚠️ **重要**: 永远不要提交 `.env` 文件。后端需要具有 service-role 权限的 `SUPABASE_KEY`。

### 3. 启动前端

```bash
cd apps/web

# 安装依赖
npm install

# 启动开发服务器 (localhost:4321)
npm run dev
```

### 4. 启动后端

```bash
cd apps/backend/app

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或: venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器 (localhost:8000)
uvicorn main:app --reload
```

#### 使用 Docker 启动后端

```bash
cd apps/backend/app
docker build -t unipick-backend .
docker run -p 8000:8000 --env-file ../../.env unipick-backend
```

## 📚 项目文档

| 文档 | 描述 |
|------|------|
| [AGENTS.md](AGENTS.md) | 📖 开发者指南（技术细节、代码规范、环境配置） |
| [docs/user-guide.md](docs/user-guide.md) | 👤 用户指南（功能使用说明、FAQ） |
| [docs/api.md](docs/api.md) | 🔌 API 文档（接口详情、数据模型） |

## 🔌 API 接口

### 商品接口 (`/api/v1/items`)

| 方法 | 端点 | 描述 | 认证要求 |
|------|------|------|----------|
| GET | `/api/v1/items/?skip=0&limit=12` | 获取商品列表（分页） | 否 |
| GET | `/api/v1/items/{id}` | 获取商品详情 | 否 |
| POST | `/api/v1/items/` | 创建新商品 | ✅ 是 |

### 健康检查

| 端点 | 描述 |
|------|------|
| GET `/` | API 健康检查 |
| GET `/test-db` | 数据库连接测试 |

### 即将推出

| 端点 | 描述 |
|------|------|
| POST `/predict-price` | AI 智能定价 |

## 📸 功能预览

### 商品浏览与搜索
- 无限滚动的商品信息流
- 🔍 **实时搜索** - 按关键词搜索商品标题和描述
- 📍 **位置筛选** - 基于 PostGIS 发现附近的商品

### 商品详情
- 📦 完整的商品信息展示
- 🖼️ 多图轮播查看
- 📍 地图显示商品位置
- 👤 卖家信息卡片

### 商品发布
- 🖼️ 支持多图片上传
- 📍 **Mapbox 地图选点** - 拖拽地图精准选择交易位置
- ✨ 实时表单验证

### 用户认证
- 邮箱/密码注册登录
- 密码重置功能
- 🔒 路由权限守卫（即将推出）

## 🛠️ 功能路线图

| 功能 | 状态 | 说明 |
|------|------|------|
| 用户注册/登录 | ✅ 已完成 | 基于 Supabase Auth |
| 商品浏览（无限滚动） | ✅ 已完成 | TanStack Query 驱动 |
| 商品搜索 | ✅ 已完成 | 实时搜索标题和描述 |
| 商品发布（地图选点） | ✅ 已完成 | Mapbox 精准定位 |
| 商品详情页 | ✅ 已完成 | 完整商品信息展示 |
| 路由权限守卫 | ⏳ 开发中 | 保护需要登录的页面 |
| AI 智能定价 | 🔮 规划中 | 基于机器学习的定价建议 |
| 应用内聊天 | 🔮 规划中 | 买卖双方沟通 |
| 收藏商品 | 🔮 规划中 | 收藏感兴趣的商品 |

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！请阅读我们的贡献指南了解详情。

1. Fork 本项目
2. 创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📜 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🙏 致谢

- [Virginia Tech](https://vt.edu/) 国际学生社区
- [Supabase](https://supabase.com/) 提供出色的开源后端服务
- [Astro](https://astro.build/) 和 [FastAPI](https://fastapi.tiangolo.com/) 社区

---

<p align="center">
  <sub>Built with ❤️ for international students</sub>
</p>
