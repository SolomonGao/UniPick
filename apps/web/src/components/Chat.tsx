/**
 * 聊天组件
 * 显示对话的消息列表和发送消息输入框
 */
import { useState, useRef, useEffect } from 'react';
import { useMessages, useSendMessage, Conversation, Message } from '../hooks/useMessages';
import { formatDistanceToNow } from '../lib/utils';
import { Send, ArrowLeft } from 'lucide-react';

interface ChatProps {
  conversation: Conversation;
  onBack?: () => void;
  currentUserId: string;
}

export function Chat({ conversation, onBack, currentUserId }: ChatProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data, isLoading } = useMessages(conversation.id);
  const sendMutation = useSendMessage();

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sendMutation.isPending) return;

    await sendMutation.mutateAsync({
      conversationId: conversation.id,
      content: messageText.trim(),
    });

    setMessageText('');
  };

  const messages = data?.messages || [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 头部 */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h3 className="font-medium text-gray-900">
            用户 {conversation.other_user_id.slice(0, 8)}...
          </h3>
          {conversation.item_id && (
            <p className="text-xs text-gray-500">商品咨询 #{conversation.item_id}</p>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <p>还没有消息</p>
            <p className="text-sm mt-1">发送第一条消息开始对话吧</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sendMutation.isPending}
          />
          <button
            type="submit"
            disabled={!messageText.trim() || sendMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </form>
    </div>
  );
}

// 消息气泡组件
function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[70%] px-4 py-2 rounded-2xl
          ${isOwn 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
          }
        `}
      >
        <p className="text-sm">{message.content}</p>
        
        <div className={`
          flex items-center gap-1 mt-1 text-xs
          ${isOwn ? 'text-blue-200' : 'text-gray-500'}
        `}>
          <span>
            {formatDistanceToNow(new Date(message.created_at))}
          </span>
          {isOwn && (
            <span>{message.is_read ? '已读' : '已送达'}</span>
          )}
        </div>
      </div>
    </div>
  );
}
