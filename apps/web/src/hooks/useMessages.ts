/**
 * 消息系统 Hooks
 * 对话和消息的统一数据获取
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../lib/constants';
import { supabase } from '../lib/supabase';

// 获取当前用户 session
async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ===== Types =====

export interface Conversation {
  id: number;
  item_id: number | null;
  other_user_id: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'system';
  media_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ===== Conversations =====

export function useConversations(page: number = 1, pageSize: number = 20) {
  return useQuery({
    queryKey: ['conversations', page],
    queryFn: async () => {
      const session = await getSession();
      if (!session) return { conversations: [], total: 0 };

      const response = await fetch(
        `${API_ENDPOINTS.messages}/conversations?page=${page}&page_size=${pageSize}`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    staleTime: 30 * 1000, // 30秒
    retry: 2,
    enabled: typeof window !== 'undefined',
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, sellerId }: { itemId: number; sellerId: string }) => {
      const session = await getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${API_ENDPOINTS.messages}/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item_id: itemId, seller_id: sellerId }),
      });

      if (!response.ok) throw new Error('Failed to create conversation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// ===== Messages =====

export function useMessages(conversationId: number | null, page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ['messages', conversationId, page],
    queryFn: async () => {
      if (!conversationId) return { messages: [], total: 0 };

      const session = await getSession();
      if (!session) return { messages: [], total: 0 };

      const response = await fetch(
        `${API_ENDPOINTS.messages}/conversations/${conversationId}/messages?page=${page}&page_size=${pageSize}`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    staleTime: 10 * 1000, // 10秒
    retry: 2,
    enabled: !!conversationId && typeof window !== 'undefined',
    refetchInterval: 5000, // 每5秒自动刷新获取新消息
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      content, 
      messageType = 'text',
      mediaUrl 
    }: { 
      conversationId: number; 
      content: string;
      messageType?: 'text' | 'image';
      mediaUrl?: string;
    }) => {
      const session = await getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${API_ENDPOINTS.messages}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            content, 
            message_type: messageType,
            media_url: mediaUrl 
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (_, variables) => {
      // 刷新消息列表和对话列表
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// ===== Archive Conversation =====

export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: number) => {
      const session = await getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${API_ENDPOINTS.messages}/conversations/${conversationId}/archive`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to archive conversation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// ===== Unread Count =====

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unreadCount'],
    queryFn: async () => {
      const session = await getSession();
      if (!session) return 0;

      // 获取所有对话，统计未读消息
      const response = await fetch(
        `${API_ENDPOINTS.messages}/conversations?page=1&page_size=100`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      if (!response.ok) return 0;
      const data = await response.json();
      
      // 这里简化处理，实际应该后端返回未读数
      return data.conversations?.length || 0;
    },
    staleTime: 10 * 1000,
    refetchInterval: 10000, // 每10秒刷新
    enabled: typeof window !== 'undefined',
  });
}
