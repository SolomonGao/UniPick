/**
 * 对话列表组件
 * 显示用户的所有对话
 */
import { useState } from 'react';
import { useConversations, useArchiveConversation, Conversation } from '../hooks/useMessages';
import { formatDistanceToNow } from '../lib/utils';
import { MessageSquare, Archive, ChevronRight } from 'lucide-react';

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: number;
}

export function ConversationList({ onSelectConversation, selectedId }: ConversationListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useConversations(page);
  const archiveMutation = useArchiveConversation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        加载对话失败，请稍后重试
      </div>
    );
  }

  const conversations = data?.conversations || [];

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
        <p>暂无对话</p>
        <p className="text-sm mt-2">点击商品详情页的&quot;咨询卖家&quot;开始对话</p>
      </div>
    );
  }

  const handleArchive = async (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    if (confirm('确定要归档这个对话吗？')) {
      await archiveMutation.mutateAsync(conversationId);
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          onClick={() => onSelectConversation(conversation)}
          className={`
            p-4 cursor-pointer hover:bg-gray-50 transition-colors
            ${selectedId === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 truncate">
                  用户 {conversation.other_user_id.slice(0, 8)}...
                </span>
                {conversation.item_id && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    商品咨询
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 truncate">
                {conversation.last_message_preview || '暂无消息'}
              </p>
              
              {conversation.last_message_at && (
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(conversation.last_message_at))}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={(e) => handleArchive(e, conversation.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="归档对话"
              >
                <Archive className="w-4 h-4" />
              </button>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      ))}

      {/* 分页 */}
      {data?.total > page * 20 && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
        >
          加载更多
        </button>
      )}
    </div>
  );
}
