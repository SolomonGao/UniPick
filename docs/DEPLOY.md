# 🚀 UniPick 部署指南

> 完整的生产环境部署文档

---

## 📋 部署概览

| 组件 | 部署方式 | 推荐平台 |
|------|---------|---------|
| 前端 (Astro) | 静态托管 | Vercel / Netlify / Cloudflare Pages |
| 后端 (FastAPI) | 容器化 | Railway / Render / AWS ECS |
| 数据库 | 托管服务 | Supabase (已包含) |
| 文件存储 | 托管服务 | Supabase Storage (已包含) |

---

## 🎯 部署前准备

### 1. 必需服务账号

- [ ] **Supabase 账号** - 数据库、认证、存储
- [ ] **部署平台账号** - Vercel/Railway/Render
- [ ] **域名** (可选) - 自定义域名

### 2. 环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 前端构建 |
| Python | 3.11+ | 后端运行 |
| Docker | 最新 | 容器化部署 |
| Git | 最新 | 版本控制 |

---

## 🔧 第一步：生产环境配置

### 1.1 Supabase 生产配置

#### 创建新项目
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 创建新项目 (选择地区接近你的用户)
3. 记录项目 URL 和 API Keys

#### 配置数据库
```sql
-- 在 Supabase SQL Editor 中执行
-- 启用 PostGIS 扩展
CREATE EXTENSION IF NOT EXISTS postgis;

-- 创建自定义角色 (可选，用于更细粒度权限控制)
CREATE ROLE unipick_app WITH LOGIN PASSWORD 'your-secure-password';
GRANT CONNECT ON DATABASE postgres TO unipick_app;
```

#### 配置 Storage Bucket
1. 进入 Storage → 创建 `item-images` bucket
2. 设置 Public bucket (允许公开访问图片)
3. 配置 CORS:
```json
{
  "origins": ["https://your-domain.com"],
  "methods": ["GET", "POST", "PUT", "DELETE"],
  "headers": ["*"]
}
```

#### 配置 Row Level Security (RLS)
```sql
-- 示例：确保用户只能访问自己的数据
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);
```

### 1.2 环境变量准备

创建生产环境变量文件 `.env.production`:

```bash
# =====================================
# 后端环境变量 (apps/backend/.env)
# =====================================

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJ... # Service Role Key (保密！)
SUPABASE_SERVICE_ROLE_KEY=eyJ... # 同上

# 数据库连接 (使用 Supabase Connection Pooler)
DATABASE_URL=postgresql+asyncpg://postgres:[password]@db.[project-ref].supabase.co:6543/postgres?ssl=require

# 可选：OpenAI (用于内容审核)
OPENAI_API_KEY=sk-...

# 可选：Telegram Bot (用于通知)
TELEGRAM_BOT_TOKEN=...

# 应用配置
DEBUG=false
ENV=production

# =====================================
# 前端环境变量 (apps/web/.env)
# =====================================

# Supabase (使用 anon key，安全可公开)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...

# API 基础 URL (后端部署后的地址)
PUBLIC_API_URL=https://your-backend-url.com
```

> ⚠️ **安全警告**: 永远不要将 `.env` 文件提交到 Git！

---

## 🌐 第二步：前端部署

### 2.1 方案 A: Vercel (推荐)

#### 自动部署 (Git 集成)
1. 将代码推送到 GitHub
2. 登录 [Vercel](https://vercel.com)
3. 导入项目 → 选择 UniPick 仓库
4. 配置:
   - **Framework Preset**: Astro
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 添加环境变量 (从 `.env.production` 复制)
6. 点击 Deploy

#### 手动部署 (CLI)
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
cd apps/web
vercel --prod

# 设置环境变量
vercel env add PUBLIC_SUPABASE_URL
vercel env add PUBLIC_SUPABASE_ANON_KEY
```

### 2.2 方案 B: Cloudflare Pages

```bash
# 构建
npm run build

# 使用 Wrangler 部署
npx wrangler pages deploy dist
```

### 2.3 方案 C: 自建服务器 (Nginx)

```bash
# 构建前端
cd apps/web
npm ci
npm run build

# 将 dist/ 目录复制到服务器
scp -r dist/ user@server:/var/www/unipick/
```

**Nginx 配置**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/unipick/dist;
    index index.html;
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 前端路由支持 (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理到后端
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔥 第三步：后端部署

### 3.1 方案 A: Railway (推荐)

#### 方式 1: 通过 GitHub 部署
1. 推送代码到 GitHub
2. 登录 [Railway](https://railway.app)
3. New Project → Deploy from GitHub repo
4. 选择 UniPick 仓库
5. 配置:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. 添加环境变量
7. 部署

#### 方式 2: 使用 CLI
```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 进入后端目录并初始化
cd apps/backend
railway init

# 部署
railway up

# 设置环境变量
railway variables set DEBUG=false
railway variables set DATABASE_URL=postgresql+asyncpg://...
```

### 3.2 方案 B: Render

1. 登录 [Render](https://render.com)
2. New → Web Service
3. 连接 GitHub 仓库
4. 配置:
   - **Name**: unipick-backend
   - **Root Directory**: `apps/backend`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. 添加环境变量
6. 创建 Web Service

### 3.3 方案 C: Docker 部署

#### 构建镜像
```bash
cd apps/backend

# 创建 Dockerfile (如果不存在)
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY app/ ./app/

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# 构建
docker build -t unipick-backend:latest .

# 运行 (本地测试)
docker run -p 8000:8000 --env-file .env unipick-backend:latest
```

#### 部署到 AWS ECS
```bash
# 1. 推送镜像到 ECR
aws ecr get-login-password | docker login --username AWS --password-stdin [account-id].dkr.ecr.[region].amazonaws.com

docker tag unipick-backend:latest [account-id].dkr.ecr.[region].amazonaws.com/unipick-backend:latest
docker push [account-id].dkr.ecr.[region].amazonaws.com/unipick-backend:latest

# 2. 在 AWS ECS 控制台创建集群和服务
# 3. 配置任务定义，使用推送的镜像
```

### 3.4 方案 D: 传统服务器 (Systemd)

```bash
# 1. 复制代码到服务器
scp -r apps/backend user@server:/opt/unipick/

# 2. 创建虚拟环境并安装依赖
ssh user@server
cd /opt/unipick/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. 创建 systemd 服务
sudo tee /etc/systemd/system/unipick-backend.service << 'EOF'
[Unit]
Description=UniPick Backend
After=network.target

[Service]
Type=simple
User=unipick
WorkingDirectory=/opt/unipick/backend
Environment="PATH=/opt/unipick/backend/venv/bin"
EnvironmentFile=/opt/unipick/backend/.env
ExecStart=/opt/unipick/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# 4. 启动服务
sudo systemctl daemon-reload
sudo systemctl enable unipick-backend
sudo systemctl start unipick-backend

# 5. 查看状态
sudo systemctl status unipick-backend
sudo journalctl -u unipick-backend -f
```

---

## 🔒 第四步：安全加固

### 4.1 HTTPS 配置

#### 使用 Cloudflare (推荐免费方案)
1. 将域名 DNS 改为 Cloudflare
2. 开启 "Always Use HTTPS"
3. 启用 SSL/TLS 加密模式: Full (strict)

#### 使用 Let's Encrypt
```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 4.2 CORS 配置

编辑 `apps/backend/app/main.py`:
```python
# 生产环境 CORS
origins = [
    "https://your-domain.com",  # 你的前端域名
    "https://www.your-domain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600,
)
```

### 4.3 环境变量安全

```bash
# 检查敏感信息是否泄露
grep -r "sk-" . --include="*.py" --include="*.ts" --include="*.json"
grep -r "eyJ" . --include="*.py" --include="*.ts" --include="*.json"

# 确保 .env 在 .gitignore 中
cat .gitignore | grep -E "^\.env|^\.env\.|env$"
```

---

## 📊 第五步：监控与日志

### 5.1 健康检查端点

确保以下端点可用:
- `GET /` - 返回 `{"status": "ok"}`
- `GET /test-db` - 数据库连接测试

### 5.2 日志配置

```python
# 添加到 app/main.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # 输出到控制台 (容器环境)
        logging.FileHandler('/var/log/unipick/app.log'),  # 输出到文件 (服务器环境)
    ]
)
```

### 5.3 使用 Sentry 监控错误 (推荐)

```python
# 安装
pip install sentry-sdk[fastapi]

# 配置 (main.py)
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0,
)
```

---

## ✅ 第六步：部署检查清单

### 部署前检查
- [ ] 所有环境变量已设置
- [ ] 数据库迁移已执行
- [ ] `.env` 文件未提交到 Git
- [ ] 测试环境验证通过

### 部署后检查
- [ ] 前端可以正常访问
- [ ] 后端健康检查返回 OK
- [ ] 数据库连接正常
- [ ] 图片上传功能正常
- [ ] 用户注册/登录正常
- [ ] HTTPS 证书有效

### 功能验证
```bash
# 测试 API
curl https://your-api.com/
curl https://your-api.com/test-db

# 测试前端
curl https://your-domain.com | head

# 测试图片上传
curl -X POST -F "file=@test.jpg" https://your-api.com/api/v1/items/
```

---

## 🔄 持续部署 (CI/CD)

### GitHub Actions 配置

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        uses: railway/cli@latest
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: unipick-backend
      
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: cd apps/web && npm ci && npm run build
      
      - name: Deploy to Vercel
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

---

## 🆘 故障排除

### 常见问题

#### 1. 前端无法连接后端
```
检查: CORS 配置是否正确
检查: 后端 URL 是否设置正确 (PUBLIC_API_URL)
检查: 后端是否运行
```

#### 2. 数据库连接失败
```
检查: DATABASE_URL 格式是否正确
检查: Supabase IP 是否被防火墙拦截
检查: SSL 配置是否正确
```

#### 3. 图片上传失败
```
检查: Supabase Storage bucket 是否为 public
检查: CORS 配置是否正确
检查: 文件大小是否超过限制
```

#### 4. 环境变量不生效
```bash
# Railway
railway variables

# Render
查看 Dashboard → Environment

# 本地 Docker
docker run --env-file .env unipick-backend
```

### 获取帮助

- **文档**: [docs/user-guide.md](./docs/user-guide.md)
- **API 文档**: [docs/api.md](./docs/api.md)
- **Issues**: GitHub Issues

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [README.md](../README.md) | 项目介绍 |
| [AGENTS.md](../AGENTS.md) | 开发指南 |
| [docs/api.md](./api.md) | API 文档 |
| [ROADMAP.md](../ROADMAP.md) | 开发路线图 |

---

**最后更新**: 2026-03-02
