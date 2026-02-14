import { useState, useEffect, useCallback, useRef } from 'react';
import { API_ENDPOINTS } from '../lib/constants';
import { useAuth } from '../components/AuthGuard';
import { supabase } from '../lib/supabase';

interface ItemStats {
  view_count: number;
  favorite_count: number;
  is_favorited: boolean;
}

// 防抖函数
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

export function useItemStats(itemId: number) {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ItemStats>({
    view_count: 0,
    favorite_count: 0,
    is_favorited: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewRecorded = useRef(false);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}/stats`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch item stats:', err);
      setError('获取统计失败');
    }
  }, [itemId]);

  // 防抖的记录浏览
  const recordView = useCallback(async () => {
    // 防止重复记录
    if (viewRecorded.current) return;
    viewRecorded.current = true;
    
    try {
      await fetch(`${API_ENDPOINTS.items}/${itemId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true // 页面关闭时也能发送
      });
    } catch (err) {
      // 静默处理，不影响用户体验
      console.error('Failed to record view:', err);
    }
  }, [itemId]);

  // 防抖的切换收藏
  const debouncedToggleFavorite = useDebounce(async () => {
    if (!isAuthenticated || !user) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      // 乐观更新UI
      const newFavorited = !stats.is_favorited;
      const newFavoriteCount = newFavorited 
        ? stats.favorite_count + 1 
        : Math.max(0, stats.favorite_count - 1);
      
      setStats(prev => ({
        ...prev,
        is_favorited: newFavorited,
        favorite_count: newFavoriteCount
      }));

      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}/favorite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // 失败时回滚UI
        setStats(prev => ({
          ...prev,
          is_favorited: !newFavorited,
          favorite_count: stats.favorite_count
        }));
        throw new Error('Failed to toggle favorite');
      }

      const data = await response.json();
      // 使用服务器返回的真实数据更新
      setStats(prev => ({
        ...prev,
        is_favorited: data.is_favorited,
        favorite_count: data.is_favorited 
          ? prev.favorite_count 
          : Math.max(0, prev.favorite_count - 1)
      }));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      setError('操作失败');
    } finally {
      setLoading(false);
    }
  }, 300);

  // 初始加载
  useEffect(() => {
    fetchStats();
    recordView();
    
    // 清理函数重置记录标志
    return () => {
      viewRecorded.current = false;
    };
  }, [fetchStats, recordView]);

  return {
    ...stats,
    loading,
    error,
    toggleFavorite: debouncedToggleFavorite,
    refreshStats: fetchStats
  };
}

// 获取用户收藏列表 - 添加缓存
export function useUserFavorites() {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheTime = useRef(0);

  const fetchFavorites = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    
    // 5分钟内不重复请求（除非强制刷新）
    if (!force && Date.now() - cacheTime.current < 5 * 60 * 1000) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_ENDPOINTS.items}/user/favorites`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Failed to fetch favorites');
      
      const data = await response.json();
      setFavorites(data);
      cacheTime.current = Date.now();
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
      setError('获取收藏失败');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // 监听收藏更新事件
  useEffect(() => {
    const handleFavoriteToggled = () => {
      // 延迟刷新，确保后端已处理完成
      setTimeout(() => {
        fetchFavorites(true);
      }, 500);
    };

    window.addEventListener('unipick:favoriteToggled', handleFavoriteToggled);
    return () => {
      window.removeEventListener('unipick:favoriteToggled', handleFavoriteToggled);
    };
  }, [fetchFavorites]);

  return { 
    favorites, 
    loading, 
    error,
    refreshFavorites: () => fetchFavorites(true) 
  };
}

// 获取用户浏览记录 - 添加缓存
export function useUserViewHistory() {
  const { user, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheTime = useRef(0);

  const fetchHistory = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    
    // 5分钟内不重复请求（除非强制刷新）
    if (!force && Date.now() - cacheTime.current < 5 * 60 * 1000) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_ENDPOINTS.items}/user/view-history`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Failed to fetch history');
      
      const data = await response.json();
      setHistory(data);
      cacheTime.current = Date.now();
    } catch (err) {
      console.error('Failed to fetch view history:', err);
      setError('获取浏览记录失败');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 监听浏览记录更新事件
  useEffect(() => {
    const handleViewRecorded = () => {
      // 延迟刷新，确保后端已处理完成
      setTimeout(() => {
        fetchHistory(true);
      }, 500);
    };

    window.addEventListener('unipick:viewRecorded', handleViewRecorded);
    return () => {
      window.removeEventListener('unipick:viewRecorded', handleViewRecorded);
    };
  }, [fetchHistory]);

  return { 
    history, 
    loading, 
    error,
    refreshHistory: () => fetchHistory(true) 
  };
}