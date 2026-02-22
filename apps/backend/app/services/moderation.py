"""
内容审核服务
封装 OpenAI Moderation API 和其他审核逻辑
"""
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings

logger = logging.getLogger(__name__)

# OpenAI 客户端
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None


class ModerationService:
    """内容审核服务"""
    
    # 审核类别阈值配置
    THRESHOLDS = {
        'sexual': 0.8,           # 性内容
        'sexual_minors': 0.5,    # 涉及未成年人
        'harassment': 0.8,       # 骚扰
        'harassment_threatening': 0.9,  # 威胁
        'hate': 0.8,             # 仇恨言论
        'hate_threatening': 0.9, # 仇恨威胁
        'illicit': 0.7,          # 违法内容
        'illicit_violent': 0.9,  # 暴力违法
        'violence': 0.8,         # 暴力
        'violence_graphic': 0.9, # 血腥暴力
        'self_harm': 0.9,        # 自残
        'self_harm_instructions': 0.95,  # 自残指导
    }
    
    @staticmethod
    async def moderate_text(content: str) -> Dict[str, Any]:
        """
        审核文本内容
        
        原则：
        - AI 明确通过的内容 → 直接通过
        - AI 发现可疑/违规 → 人工审核
        - AI 出错/无法调用 → 人工审核（安全优先）
        
        Returns:
            {
                'flagged': bool,
                'categories': {category: bool},
                'scores': {category: float},
                'max_score': float,
                'error': str | None
            }
        """
        # 🔴 没有配置 API key → 人工审核（不能默认通过）
        if not openai_client:
            logger.warning("OpenAI client not configured, routing to manual review")
            return {
                'flagged': True,  # 标记为需要审核
                'categories': {'no_api': True},
                'scores': {'no_api': 0.5},
                'max_score': 0.5,  # 0.5 会触发 flagged 状态
                'error': 'OpenAI client not configured'
            }
        
        try:
            response = await openai_client.moderations.create(
                model="omni-moderation-latest",
                input=content
            )
            
            result = response.results[0]
            
            # 构建分类结果
            categories = {}
            scores = {}
            max_score = 0.0
            
            for category, flagged in result.categories:
                categories[category] = flagged
            
            for category, score in result.category_scores:
                scores[category] = score
                max_score = max(max_score, score)
            
            return {
                'flagged': result.flagged,
                'categories': categories,
                'scores': scores,
                'max_score': max_score,
                'error': None
            }
            
        except Exception as e:
            logger.error(f"Moderation API error: {e}")
            # 🔴 API 出错 → 人工审核（不能默认通过）
            return {
                'flagged': True,  # 标记为需要审核
                'categories': {'api_error': True},
                'scores': {'api_error': 0.5},
                'max_score': 0.5,  # 0.5 会触发 flagged 状态
                'error': str(e)
            }
    
    @staticmethod
    def determine_status(moderation_result: Dict[str, Any]) -> str:
        """
        根据审核结果确定状态
        
        原则：只有 AI 明确判定为正常的内容才直接通过
        - 正常内容 → approved（直接通过）
        - 可疑内容 → flagged（人工审核）
        - 违规内容 → rejected（人工复核）
        - API 错误/无 API → flagged（人工审核）
        
        Returns:
            'approved' - AI 判定正常，直接通过
            'flagged' - 可疑或需要人工审核
            'rejected' - 明显违规
        """
        # 如果有错误（API 出错或无 API key）→ 人工审核
        if moderation_result.get('error'):
            logger.info(f"Moderation has error, routing to manual review: {moderation_result.get('error')}")
            return 'flagged'  # 不是 pending，是 flagged（需要人工审核）
        
        max_score = moderation_result.get('max_score', 0)
        flagged = moderation_result.get('flagged', False)
        
        # 🔴 明显违规（分数很高）→ rejected（人工复核）
        if max_score > 0.8 or flagged:
            return 'rejected'
        
        # 🟡 轻度可疑 → flagged（人工审核）
        if max_score > 0.3:
            return 'flagged'
        
        # 🟢 分数很低，AI 判定正常 → approved（直接通过）
        return 'approved'
    
    @classmethod
    async def moderate_content(
        cls,
        db: AsyncSession,
        content_type: str,  # 'item', 'profile'
        content_id: str,
        user_id: str,
        content_text: str
    ) -> Dict[str, Any]:
        """
        审核内容并记录到数据库
        
        Returns:
            {
                'log_id': int,
                'status': str,
                'flagged': bool,
                'categories': dict
            }
        """
        # 1. 调用 API 审核
        moderation_result = await cls.moderate_text(content_text)
        
        # 2. 确定状态
        status = cls.determine_status(moderation_result)
        
        # 3. 记录到数据库
        result = await db.execute(
            text("""
                INSERT INTO moderation_logs 
                (content_type, content_id, user_id, content_text, status, 
                 flagged, categories, scores)
                VALUES (:content_type, :content_id, :user_id, :content_text, :status,
                        :flagged, :categories, :scores)
                RETURNING id
            """),
            {
                'content_type': content_type,
                'content_id': content_id,
                'user_id': user_id,
                'content_text': content_text[:1000],  # 限制长度
                'status': status,
                'flagged': moderation_result.get('flagged', False),
                'categories': json.dumps(moderation_result.get('categories', {})),
                'scores': json.dumps(moderation_result.get('scores', {}))
            }
        )
        
        log_id = result.scalar()
        await db.commit()
        
        logger.info(f"Moderation logged: {content_type} {content_id} -> {status}")
        
        return {
            'log_id': log_id,
            'status': status,
            'flagged': moderation_result.get('flagged', False),
            'categories': moderation_result.get('categories', {}),
            'max_score': moderation_result.get('max_score', 0)
        }
    
    @staticmethod
    async def update_content_moderation_status(
        db: AsyncSession,
        content_type: str,
        content_id: str,
        status: str,
        log_id: int
    ):
        """更新内容表的审核状态"""
        if content_type == 'item':
            table = 'items'
            # item id 是整数
            id_value = int(content_id)
        elif content_type == 'profile':
            table = 'profiles'
            # profile id 是 UUID 字符串
            id_value = content_id
        else:
            return
        
        await db.execute(
            text(f"""
                UPDATE {table} 
                SET moderation_status = :status, 
                    moderation_log_id = :log_id,
                    updated_at = NOW()
                WHERE id = :content_id
            """),
            {'status': status, 'log_id': log_id, 'content_id': id_value}
        )
        await db.commit()
    
    @staticmethod
    async def get_pending_review(
        db: AsyncSession,
        status: str = 'flagged',
        limit: int = 50,
        offset: int = 0,
        content_type: str = None
    ) -> list:
        """获取待人工审核的内容"""
        query = """
            SELECT 
                m.*,
                p.email as user_email
            FROM moderation_logs m
            LEFT JOIN profiles p ON m.user_id = p.id
            WHERE m.status = :status
        """
        params = {'status': status, 'limit': limit, 'offset': offset}
        
        if content_type:
            query += " AND m.content_type = :content_type"
            params['content_type'] = content_type
        
        query += " ORDER BY m.created_at DESC LIMIT :limit OFFSET :offset"
        
        result = await db.execute(text(query), params)
        
        rows = result.mappings().all()
        return [dict(row) for row in rows]
    
    @staticmethod
    async def manual_review(
        db: AsyncSession,
        log_id: int,
        reviewer_id: str,
        decision: str,  # 'approved' or 'rejected'
        note: str = None
    ):
        """人工审核"""
        await db.execute(
            text("""
                UPDATE moderation_logs 
                SET status = :status,
                    reviewed_by = :reviewer_id,
                    reviewed_at = NOW(),
                    review_note = :note
                WHERE id = :log_id
            """),
            {
                'status': decision,
                'reviewer_id': reviewer_id,
                'note': note,
                'log_id': log_id
            }
        )
        
        # 获取内容信息，更新内容表状态
        result = await db.execute(
            text("SELECT content_type, content_id FROM moderation_logs WHERE id = :log_id"),
            {'log_id': log_id}
        )
        row = result.mappings().one_or_none()
        
        if row:
            await ModerationService.update_content_moderation_status(
                db, row['content_type'], row['content_id'], decision, log_id
            )
        
        await db.commit()
        
        logger.info(f"Manual review: log {log_id} -> {decision} by {reviewer_id}")
    
    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict[str, int]:
        """获取审核统计"""
        result = await db.execute(
            text("""
                SELECT 
                    status,
                    COUNT(*) as count
                FROM moderation_logs
                GROUP BY status
            """)
        )
        
        stats = {'total': 0, 'pending': 0, 'approved': 0, 'flagged': 0, 'rejected': 0}
        for row in result.mappings():
            stats[row['status']] = row['count']
            stats['total'] += row['count']
        
        return stats
