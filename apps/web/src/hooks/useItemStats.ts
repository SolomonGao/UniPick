import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../lib/constants';
import { useAuth } from '../components/AuthGuard';

interface ItemStats {
  view_count: number;
  favorite_count: number;
  is_favorited: boolean;
}

export function useItemStats(itemId: number) {
  const { user } = useAuth();
  const [stats, setStats] = useState<ItemStats>({
    view_count: 0,
    favorite_count: 0,
    is_favorited: false
  });
  const [loading, setLoading] = useState(false);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch item stats:', error);
    }
  }, [itemId]);

  // 记录浏览
  const recordView = useCallback(async () => {
    try {
      await fetch(`${API_ENDPOINTS.items}/${itemId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to record view:', error);
    }
  }, [itemId]);

  // 切换收藏
  const toggleFavorite = useCallback(async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}/favorite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({
          ...prev,
          is_favorited: data.is_favorited,
          favorite_count: data.is_favorited 
            ? prev.favorite_count + 1 
            : Math.max(0, prev.favorite_count - 1)
        }));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setLoading(false);
    }
  }, [itemId, user]);

  // 初始加载
  useEffect(() => {
    fetchStats();
    recordView();
  }, [fetchStats, recordView]);

  return {
    ...stats,
    loading,
    toggleFavorite,
    refreshStats: fetchStats
  };
}

// 获取用户收藏列表
export function useUserFavorites() {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
      if (!session) return;

      const response = await fetch(`${API_ENDPOINTS.items}/user/favorites`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return { favorites, loading, refreshFavorites: fetchFavorites };
}

// 获取用户浏览记录
export function useUserViewHistory() {
  const { user, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
      if (!session) return;

      const response = await fetch(`${API_ENDPOINTS.items}/user/view-history`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch view history:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, refreshHistory: fetchHistory };
}