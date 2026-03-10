"""
消息系统数据库模型
支持用户间私信和商品相关咨询
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime


class Conversation(Base):
    """对话/会话表
    
    一个对话关联一个商品和买卖双方
    """
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联的商品（可为空，表示不关联商品的私信）
    item_id = Column(Integer, ForeignKey("items.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # 对话双方用户ID（均为 Supabase Auth UUID）
    buyer_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    seller_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # 最后一条消息预览
    last_message_preview = Column(String(100), nullable=True)
    last_message_at = Column(DateTime, nullable=True)
    
    # 未读消息计数（针对每个用户的未读数通过查询计算）
    
    # 对话状态
    is_active = Column(Boolean, default=True, server_default=text('true'))
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, server_default=text('NOW()'))
    updated_at = Column(DateTime, default=datetime.utcnow, server_default=text('NOW()'), onupdate=datetime.utcnow)
    
    # 索引：加速查询用户的所有对话
    __table_args__ = (
        Index('ix_conversations_buyer', 'buyer_id', 'last_message_at'),
        Index('ix_conversations_seller', 'seller_id', 'last_message_at'),
    )
    
    # 关系
    item = relationship("Item", lazy="joined")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    """消息表
    
    存储对话中的所有消息
    """
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联的对话
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 发送者ID
    sender_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # 消息内容
    content = Column(Text, nullable=False)
    
    # 消息类型
    message_type = Column(String(20), default='text', server_default=text("'text'"))  # text, image, system
    
    # 媒体URL（图片消息）
    media_url = Column(String(500), nullable=True)
    
    # 读取状态
    is_read = Column(Boolean, default=False, server_default=text('false'))
    read_at = Column(DateTime, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, server_default=text('NOW()'), index=True)
    
    # 索引：加速查询对话的消息列表
    __table_args__ = (
        Index('ix_messages_conversation_created', 'conversation_id', 'created_at'),
    )
    
    # 关系
    conversation = relationship("Conversation", back_populates="messages")


class MessageNotification(Base):
    """消息通知表（用于推送通知记录）
    
    记录哪些消息已发送通知，避免重复推送
    """
    __tablename__ = "message_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联的消息
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 接收者ID
    recipient_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # 通知类型
    notification_type = Column(String(20), default='push', server_default=text("'push'"))  # push, email, sms
    
    # 发送状态
    is_sent = Column(Boolean, default=False, server_default=text('false'))
    sent_at = Column(DateTime, nullable=True)
    
    # 失败重试
    retry_count = Column(Integer, default=0, server_default=text('0'))
    error_message = Column(String(500), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, server_default=text('NOW()'))
    
    # 唯一约束：一个消息的同一类型通知只记录一次
    __table_args__ = (
        Index('ix_notifications_recipient', 'recipient_id', 'created_at'),
    )
