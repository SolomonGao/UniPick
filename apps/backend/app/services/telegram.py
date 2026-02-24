"""
Telegram 通知服务
用于向用户发送收藏成功通知
"""
import logging
from typing import Optional
import asyncio

try:
    from telegram import Bot
    from telegram.error import TelegramError
    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False

from app.core.config import settings

logger = logging.getLogger(__name__)

# Telegram Bot Token（从环境变量获取）
TELEGRAM_BOT_TOKEN = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)

# 测试用的用户ID列表（实际应从数据库获取）
# 格式: {user_id: telegram_chat_id}
USER_TELEGRAM_MAP = {
    # 这里可以硬编码一些测试用户
    # "user_uuid": "telegram_chat_id"
}


class TelegramNotificationService:
    """Telegram 通知服务"""
    
    def __init__(self):
        self.bot: Optional[Bot] = None
        self.enabled = False
        
        if not TELEGRAM_AVAILABLE:
            logger.warning("python-telegram-bot 未安装，Telegram 通知功能不可用")
            return
            
        if not TELEGRAM_BOT_TOKEN:
            logger.warning("TELEGRAM_BOT_TOKEN 未配置，Telegram 通知功能不可用")
            return
        
        try:
            self.bot = Bot(token=TELEGRAM_BOT_TOKEN)
            self.enabled = True
            logger.info("Telegram 通知服务已初始化")
        except Exception as e:
            logger.error(f"初始化 Telegram Bot 失败: {e}")
    
    async def send_favorite_notification(
        self,
        telegram_chat_id: str,
        item_title: str,
        item_price: float,
        item_url: Optional[str] = None
    ) -> bool:
        """
        发送收藏成功通知
        
        Args:
            telegram_chat_id: Telegram 用户 Chat ID
            item_title: 商品标题
            item_price: 商品价格
            item_url: 商品链接（可选）
        
        Returns:
            bool: 发送是否成功
        """
        if not self.enabled or not self.bot:
            logger.debug("Telegram 通知未启用，跳过发送")
            return False
        
        try:
            # 构建消息
            message = self._format_favorite_message(item_title, item_price, item_url)
            
            # 发送消息
            await self.bot.send_message(
                chat_id=telegram_chat_id,
                text=message,
                parse_mode='HTML',
                disable_web_page_preview=False
            )
            
            logger.info(f"收藏通知已发送给用户 {telegram_chat_id}")
            return True
            
        except TelegramError as e:
            logger.error(f"发送 Telegram 通知失败: {e}")
            return False
        except Exception as e:
            logger.error(f"发送 Telegram 通知时发生未知错误: {e}")
            return False
    
    def _format_favorite_message(
        self,
        item_title: str,
        item_price: float,
        item_url: Optional[str] = None
    ) -> str:
        """格式化收藏通知消息"""
        message = f"""🎉 <b>收藏成功！</b>

📦 <b>{item_title}</b>
💰 价格: ${item_price:.2f}

您收藏的商品有新的动态时会第一时间通知您！
"""
        if item_url:
            message += f"\n🔗 <a href='{item_url}'>查看商品</a>"
        
        return message
    
    async def notify_user_favorite(
        self,
        user_id: str,
        item_title: str,
        item_price: float,
        item_url: Optional[str] = None
    ) -> bool:
        """
        根据 user_id 查找 Telegram ID 并发送通知
        
        注意: 实际生产环境应从数据库查询用户的 telegram_chat_id
        """
        # 从映射中获取 Telegram Chat ID
        telegram_chat_id = USER_TELEGRAM_MAP.get(user_id)
        
        if not telegram_chat_id:
            logger.debug(f"用户 {user_id} 未绑定 Telegram，跳过通知")
            return False
        
        return await self.send_favorite_notification(
            telegram_chat_id=telegram_chat_id,
            item_title=item_title,
            item_price=item_price,
            item_url=item_url
        )


# 全局实例
telegram_service = TelegramNotificationService()
