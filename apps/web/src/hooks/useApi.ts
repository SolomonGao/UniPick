/**
 * 🔧 统一的数据获取 Hooks
 * 使用 React Query 替代直接 fetch，提供统一的缓存、重试、错误处理
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../lib/constants';
import { supabase } from '../lib/supabase';

// 统一的请求函数
async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 获取当前用户 session
async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ===== Item Stats =====

interface ItemStats {
  view_count: number;
  favorite_count: number;
  is_favorited: boolean;
}

export function useItemStats(itemId: number) {
  return useQuery({
    queryKey: ['itemStats', itemId],
    queryFn: () => apiRequest<ItemStats>(`${API_ENDPOINTS.items}/${itemId}/stats`),
    staleTime: 30 * 1000, // 30秒
    retry: 2,
    enabled: !!itemId && itemId > 0, // 只有当 itemId 有效时才发起请求
  });
}

export function useRecordView(itemId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await fetch(`${API_ENDPOINTS.items}/${itemId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    },
    onSuccess: () => {
      // 记录浏览后刷新统计
      queryClient.invalidateQueries({ queryKey: ['itemStats', itemId] });
    },
  });
}

export function useToggleFavorite(itemId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const session = await getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}/favorite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to toggle favorite');
      return response.json();
    },
    onMutate: async () => {
      // 乐观更新
      await queryClient.cancelQueries({ queryKey: ['itemStats', itemId] });
      const previousStats = queryClient.getQueryData<ItemStats>(['itemStats', itemId]);

      if (previousStats) {
        const newFavorited = !previousStats.is_favorited;
        queryClient.setQueryData(['itemStats', itemId], {
          ...previousStats,
          is_favorited: newFavorited,
          favorite_count: newFavorited 
            ? previousStats.favorite_count + 1 
            : Math.max(0, previousStats.favorite_count - 1),
        });
      }

      return { previousStats };
    },
    onError: (err, variables, context) => {
      // 错误时回滚
      if (context?.previousStats) {
        queryClient.setQueryData(['itemStats', itemId], context.previousStats);
      }
    },
    onSettled: () => {
      // 完成后刷新
      queryClient.invalidateQueries({ queryKey: ['itemStats', itemId] });
      queryClient.invalidateQueries({ queryKey: ['userFavorites'] });
    },
  });
}

// ===== User Favorites =====

export function useUserFavorites() {
  return useQuery({
    queryKey: ['userFavorites'],
    queryFn: async () => {
      const session = await getSession();
      if (!session) return [];

      return apiRequest<any[]>(`${API_ENDPOINTS.items}/user/favorites`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
    },
    staleTime: 5 * 60 * 1000, // 5分钟
    retry: 2,
    enabled: typeof window !== 'undefined', // 只在客户端运行
  });
}

// ===== User View History =====

export function useUserViewHistory() {
  return useQuery({
    queryKey: ['userViewHistory'],
    queryFn: async () => {
      const session = await getSession();
      if (!session) return [];

      return apiRequest<any[]>(`${API_ENDPOINTS.items}/user/view-history`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
    },
    staleTime: 5 * 60 * 1000, // 5分钟
    retry: 2,
    enabled: typeof window !== 'undefined',
  });
}

// ===== Item Detail =====

interface ItemDetail {
  id: number;
  title: string;
  price: number;
  original_price?: number | null;
  description: string;
  images: string[];
  location_name: string;
  latitude: number;
  longitude: number;
  user_id: string;
  created_at: string;
  category?: string;
  is_location_private?: boolean;
  location_fuzzy?: string | null;
  view_count?: number;
  favorite_count?: number;
  moderation_status?: 'pending' | 'approved' | 'flagged' | 'rejected';
}

export function useItemDetail(itemId: number) {
  return useQuery({
    queryKey: ['itemDetail', itemId],
    queryFn: () => apiRequest<ItemDetail>(`${API_ENDPOINTS.items}/${itemId}`),
    staleTime: 60 * 1000, // 1分钟
    retry: 2,
    enabled: !!itemId && itemId > 0, // 只有当 itemId 有效时才发起请求
  });
}

// ===== Profile =====

interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  university?: string;
  campus?: string;
}

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      return apiRequest<UserProfile>(`${API_ENDPOINTS.users}/${userId}/public`);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!userId,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const session = await getSession();
      if (!session) return null;

      return apiRequest<UserProfile>(`${API_ENDPOINTS.users}/me`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
