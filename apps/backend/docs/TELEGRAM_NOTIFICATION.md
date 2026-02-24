# Telegram 收藏通知功能

## 功能说明

当用户在 UniPick 中收藏商品时，系统会自动向用户绑定的 Telegram 账号发送通知消息。

## 消息格式

```
🎉 收藏成功！

📦 {商品标题}
💰 价格: ${价格}

您收藏的商品有新的动态时会第一时间通知您！

🔗 查看商品
```

## 配置方法

### 1. 创建 Telegram Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 创建新 Bot
3. 按提示设置 Bot 名称和用户名
4. 获取 **Bot Token**（格式: `123456789:ABCdefGHIjklMNOpqrSTUvwxyz`）

### 2. 获取用户 Chat ID

1. 在 Telegram 中搜索你的 Bot
2. 发送任意消息给 Bot
3. 访问: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 在返回的 JSON 中找到 `chat.id` 字段

### 3. 配置环境变量

在 `apps/backend/.env` 文件中添加：

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 4. 绑定用户 Telegram ID

目前需要在代码中手动绑定用户 ID 和 Telegram Chat ID：

编辑 `app/services/telegram.py` 中的 `USER_TELEGRAM_MAP`：

```python
USER_TELEGRAM_MAP = {
    "user_uuid_from_supabase": "123456789",  # Telegram Chat ID
}
```

**注意**: 生产环境应该从数据库中查询用户的 Telegram Chat ID，而不是硬编码。

## 技术实现

### 文件结构

```
app/
├── services/
│   └── telegram.py          # Telegram 通知服务
├── api/v1/items/
│   └── favorites.py         # 收藏 API（已集成通知）
└── core/
    └── config.py            # 配置（新增 TELEGRAM_BOT_TOKEN）
```

### 核心代码

收藏成功后异步发送通知：

```python
# favorites.py
asyncio.create_task(
    telegram_service.notify_user_favorite(
        user_id=user_id,
        item_title=item_title,
        item_price=item_price,
        item_url=item_url
    )
)
```

### 降级处理

- 如果 Telegram Bot Token 未配置，通知功能会自动禁用
- 如果用户未绑定 Telegram ID，通知会被跳过
- 通知发送失败不会影响收藏操作的成功

## 安装依赖

```bash
pip install python-telegram-bot>=20.0
```

或

```bash
pip install -r requirements.txt
```

## 测试

1. 确保 Bot Token 已配置
2. 在 `USER_TELEGRAM_MAP` 中添加你的用户 ID 和 Chat ID
3. 在应用中收藏一个商品
4. 检查 Telegram 是否收到通知

## 未来改进

- [ ] 用户自主绑定 Telegram 账号（通过验证码或 deep link）
- [ ] 将 Telegram Chat ID 存储到数据库 profiles 表
- [ ] 支持更多通知类型（价格降价、商品卖出等）
- [ ] 用户可以在设置中开关通知
