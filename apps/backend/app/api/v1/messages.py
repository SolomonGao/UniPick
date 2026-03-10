"""
消息系统 API Router
提供对话和消息的 CRUD 接口
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, or_
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import verify_token
from app.models.message import Conversation, Message
from app.models.item import Item

router = APIRouter()
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """验证 JWT Token 并返回当前用户"""
    token = credentials.credentials
    user = await verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return user


@router.get("/conversations", response_model=dict)
async def list_conversations(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    获取当前用户的所有对话列表
    """
    user_id = current_user["id"]
    offset = (page - 1) * page_size
    
    # 查询用户作为买家或卖家的所有活跃对话
    stmt = select(Conversation).where(
        and_(
            Conversation.is_active == True,
            or_(
                Conversation.buyer_id == user_id,
                Conversation.seller_id == user_id
            )
        )
    ).order_by(desc(Conversation.last_message_at)).offset(offset).limit(page_size)
    
    result = await db.execute(stmt)
    conversations = result.scalars().all()
    
    # 格式化返回数据
    conversation_list = []
    for conv in conversations:
        # 确定对方用户ID
        other_user_id = str(conv.seller_id) if str(conv.buyer_id) == user_id else str(conv.buyer_id)
        
        conversation_list.append({
            "id": conv.id,
            "item_id": conv.item_id,
            "other_user_id": other_user_id,
            "last_message_preview": conv.last_message_preview,
            "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
        })
    
    return {
        "conversations": conversation_list,
        "page": page,
        "page_size": page_size,
        "total": len(conversation_list)
    }


@router.post("/conversations", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    item_id: int,
    seller_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    创建新对话（发起咨询）
    """
    buyer_id = current_user["id"]
    
    # 不能和自己对话
    if buyer_id == seller_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create conversation with yourself"
        )
    
    # 检查商品是否存在
    item_result = await db.execute(select(Item).where(Item.id == item_id))
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    # 检查是否已存在对话
    existing_stmt = select(Conversation).where(
        and_(
            Conversation.item_id == item_id,
            Conversation.buyer_id == buyer_id,
            Conversation.seller_id == seller_id,
            Conversation.is_active == True
        )
    )
    existing_result = await db.execute(existing_stmt)
    existing_conv = existing_result.scalar_one_or_none()
    
    if existing_conv:
        return {
            "id": existing_conv.id,
            "message": "Conversation already exists",
            "created_at": existing_conv.created_at.isoformat() if existing_conv.created_at else None,
        }
    
    # 创建新对话
    conversation = Conversation(
        item_id=item_id,
        buyer_id=buyer_id,
        seller_id=seller_id,
        is_active=True
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    
    return {
        "id": conversation.id,
        "item_id": conversation.item_id,
        "buyer_id": str(conversation.buyer_id),
        "seller_id": str(conversation.seller_id),
        "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
    }


@router.get("/conversations/{conversation_id}/messages", response_model=dict)
async def list_messages(
    conversation_id: int,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    获取对话的消息列表
    """
    user_id = current_user["id"]
    
    # 验证对话存在且用户有权限访问
    conv_stmt = select(Conversation).where(
        and_(
            Conversation.id == conversation_id,
            Conversation.is_active == True,
            or_(
                Conversation.buyer_id == user_id,
                Conversation.seller_id == user_id
            )
        )
    )
    conv_result = await db.execute(conv_stmt)
    conversation = conv_result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied"
        )
    
    # 查询消息
    offset = (page - 1) * page_size
    msg_stmt = select(Message).where(
        Message.conversation_id == conversation_id
    ).order_by(desc(Message.created_at)).offset(offset).limit(page_size)
    
    msg_result = await db.execute(msg_stmt)
    messages = msg_result.scalars().all()
    
    # 格式化返回
    message_list = []
    for msg in messages:
        message_list.append({
            "id": msg.id,
            "sender_id": str(msg.sender_id),
            "content": msg.content,
            "message_type": msg.message_type,
            "media_url": msg.media_url,
            "is_read": msg.is_read,
            "read_at": msg.read_at.isoformat() if msg.read_at else None,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        })
    
    # 标记消息为已读（对方发送的消息）
    unread_stmt = select(Message).where(
        and_(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.is_read == False
        )
    )
    unread_result = await db.execute(unread_stmt)
    unread_messages = unread_result.scalars().all()
    
    for msg in unread_messages:
        msg.is_read = True
        msg.read_at = datetime.utcnow()
    
    if unread_messages:
        await db.commit()
    
    return {
        "conversation_id": conversation_id,
        "messages": message_list,
        "page": page,
        "page_size": page_size,
        "total": len(message_list)
    }


@router.post("/conversations/{conversation_id}/messages", response_model=dict, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    content: str,
    message_type: str = "text",
    media_url: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    发送消息
    """
    user_id = current_user["id"]
    
    # 验证对话
    conv_stmt = select(Conversation).where(
        and_(
            Conversation.id == conversation_id,
            Conversation.is_active == True,
            or_(
                Conversation.buyer_id == user_id,
                Conversation.seller_id == user_id
            )
        )
    )
    conv_result = await db.execute(conv_stmt)
    conversation = conv_result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied"
        )
    
    # 创建消息
    message = Message(
        conversation_id=conversation_id,
        sender_id=user_id,
        content=content,
        message_type=message_type,
        media_url=media_url,
        is_read=False
    )
    db.add(message)
    
    # 更新对话的最后消息预览
    conversation.last_message_preview = content[:100] if len(content) > 100 else content
    conversation.last_message_at = datetime.utcnow()
    conversation.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(message)
    
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": str(message.sender_id),
        "content": message.content,
        "message_type": message.message_type,
        "media_url": message.media_url,
        "is_read": message.is_read,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


@router.post("/conversations/{conversation_id}/archive", response_model=dict)
async def archive_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    归档/关闭对话
    """
    user_id = current_user["id"]
    
    conv_stmt = select(Conversation).where(
        and_(
            Conversation.id == conversation_id,
            or_(
                Conversation.buyer_id == user_id,
                Conversation.seller_id == user_id
            )
        )
    )
    conv_result = await db.execute(conv_stmt)
    conversation = conv_result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    conversation.is_active = False
    await db.commit()
    
    return {
        "id": conversation.id,
        "is_active": conversation.is_active,
        "message": "Conversation archived successfully"
    }
