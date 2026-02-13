# UniPick API 文档

> FastAPI 后端 API 接口文档

---

## 概述

- **Base URL**: `http://localhost:8000`
- **API 版本**: `v1`
- **文档格式**: OpenAPI 3.0

### 认证方式

API 使用 **Bearer Token** 认证：

```
Authorization: Bearer <your-jwt-token>
```

Token 通过 Supabase Auth 获取，前端登录后从 Supabase 客户端获取。

---

## 接口列表

### 1. 健康检查

#### GET `/`

检查 API 服务状态

**响应**：
```json
{
  "status": "ok",
  "service": "UniPick API"
}
```

---

#### GET `/test-db`

测试数据库连接

**响应**：
```json
{
  "database_connection": "successful",
  "result": 1
}
```

---

### 2. 商品接口

#### GET `/api/v1/items/`

获取商品列表（分页）

**参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `skip` | integer | 否 | 0 | 跳过的记录数 |
| `limit` | integer | 否 | 12 | 返回的最大记录数 |

**响应** (200 OK)：
```json
[
  {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "宜家书桌",
    "description": "9成新，使用一年，无划痕",
    "price": 45.00,
    "images": ["https://.../image1.jpg", "https://.../image2.jpg"],
    "location": {
      "type": "Point",
      "coordinates": [-80.4139, 37.2296]
    },
    "location_name": "Virginia Tech, Blacksburg, VA",
    "created_at": "2024-02-13T10:30:00Z",
    "updated_at": "2024-02-13T10:30:00Z"
  }
]
```

---

#### GET `/api/v1/items/{id}`

获取商品详情

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 商品 ID |

**响应** (200 OK)：
```json
{
  "id": 1,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "宜家书桌",
  "description": "9成新，使用一年，无划痕",
  "price": 45.00,
  "images": ["https://.../image1.jpg", "https://.../image2.jpg"],
  "location": {
    "type": "Point",
    "coordinates": [-80.4139, 37.2296]
  },
  "location_name": "Virginia Tech, Blacksburg, VA",
  "created_at": "2024-02-13T10:30:00Z",
  "updated_at": "2024-02-13T10:30:00Z"
}
```

**错误响应**：
- `404 Not Found`: 商品不存在

---

#### POST `/api/v1/items/`

创建新商品（需要认证）

**请求头**：
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**请求体**：
```json
{
  "title": "宜家书桌",
  "description": "9成新，使用一年，无划痕",
  "price": 45.00,
  "images": ["https://.../image1.jpg"],
  "latitude": 37.2296,
  "longitude": -80.4139,
  "location_name": "Virginia Tech, Blacksburg, VA"
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `title` | string | 是 | 3-100 字符 | 商品标题 |
| `description` | string | 是 | 10-1000 字符 | 商品描述 |
| `price` | number | 是 | > 0 | 价格（美元） |
| `images` | array[string] | 是 | 1-5 个 URL | 商品图片 URL 数组 |
| `latitude` | number | 是 | -90 ~ 90 | 纬度 |
| `longitude` | number | 是 | -180 ~ 180 | 经度 |
| `location_name` | string | 是 | 5-200 字符 | 可读位置名称 |

**响应** (201 Created)：
```json
{
  "id": 1,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "宜家书桌",
  "description": "9成新，使用一年，无划痕",
  "price": 45.00,
  "images": ["https://.../image1.jpg"],
  "location": {
    "type": "Point",
    "coordinates": [-80.4139, 37.2296]
  },
  "location_name": "Virginia Tech, Blacksburg, VA",
  "created_at": "2024-02-13T10:30:00Z",
  "updated_at": "2024-02-13T10:30:00Z"
}
```

**错误响应**：
- `401 Unauthorized`: 未提供或无效的认证令牌
- `422 Validation Error`: 请求数据验证失败

---

### 3. AI 定价接口（即将推出）

#### POST `/predict-price`

AI 智能价格预测

**请求体**：
```json
{
  "title": "宜家书桌",
  "description": "9成新，使用一年",
  "category": "furniture"
}
```

**响应** (200 OK)：
```json
{
  "message": "Coming soon: AI Price Prediction"
}
```

---

## 数据模型

### Item (商品)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 主键 ID |
| `user_id` | string (UUID) | 发布者 ID |
| `title` | string | 商品标题 |
| `description` | string | 商品描述 |
| `price` | number | 价格（美元） |
| `images` | array[string] | 图片 URL 数组 |
| `location` | GeoJSON Point | PostGIS 地理坐标 |
| `location_name` | string | 可读位置名称 |
| `created_at` | string (ISO 8601) | 创建时间 |
| `updated_at` | string (ISO 8601) | 更新时间 |

### GeoJSON Point

```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

---

## 错误处理

### 错误响应格式

```json
{
  "detail": "错误描述信息"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 422 | 数据验证失败 |
| 500 | 服务器内部错误 |

---

## 开发说明

### 本地开发

启动后端服务后，可以通过以下地址访问交互式 API 文档：

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

### 测试工具

推荐使用以下工具测试 API：

- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [HTTPie](https://httpie.io/) (命令行)
- `curl` (命令行)

### curl 示例

```bash
# 获取商品列表
curl http://localhost:8000/api/v1/items/?skip=0&limit=12

# 获取商品详情
curl http://localhost:8000/api/v1/items/1

# 创建商品（需要 Token）
curl -X POST http://localhost:8000/api/v1/items/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试商品",
    "description": "这是一个测试商品描述",
    "price": 29.99,
    "images": ["https://example.com/image.jpg"],
    "latitude": 37.2296,
    "longitude": -80.4139,
    "location_name": "Virginia Tech"
  }'
```

---

## 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2024-02-13 | 初始版本，包含商品 CRUD 接口 |

---

<p align="center">
  <sub>API Documentation for UniPick 🎓</sub>
</p>
