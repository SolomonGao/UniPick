import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MapPin, ArrowLeft, User, Calendar, DollarSign, MessageCircle, Edit3, Eye, Heart } from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';
import { supabase } from '../lib/supabase';

interface Item {
  id: number;
  title: string;
  price: number;
  description: string | null;
  images: string[] | null;
  location_name: string | null;
  latitude: number;
  longitude: number;
  user_id: string;
  created_at: string;
  view_count?: number;
  favorite_count?: number;
  is_location_private?: boolean;
  location_fuzzy?: string | null;
}

interface ItemStats {
  view_count: number;
  favorite_count: number;
  is_favorited: boolean;
}

interface ItemDetailProps {
  itemId: string;
}

// 创建 QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
});

function ItemDetailContent({ itemId }: ItemDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [fromPage, setFromPage] = useState<string>("/");
  const [stats, setStats] = useState<ItemStats>({ view_count: 0, favorite_count: 0, is_favorited: false });

  // 获取当前用户ID和来源页面
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    
    // 检测来源页面
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    if (from === 'my-listings') {
      setFromPage('/my-listings');
    }
  }, []);

  // 记录浏览量
  const recordView = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      await fetch(`${API_ENDPOINTS.items}/${itemId}/view`, {
        method: 'POST',
        headers,
      });
      
      // 触发浏览记录更新事件，通知个人中心页刷新
      window.dispatchEvent(new CustomEvent('unipick:viewRecorded', { 
        detail: { itemId, timestamp: Date.now() } 
      }));
    } catch (err) {
      console.error('Failed to record view:', err);
    }
  }, [itemId]);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      // 获取 session 以验证用户（用于获取 is_favorited 状态）
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}/stats`, {
        headers
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [itemId]);

  // 切换收藏
  const toggleFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}/favorite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
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
        
        // 触发收藏更新事件，通知个人中心页刷新
        window.dispatchEvent(new CustomEvent('unipick:favoriteToggled', { 
          detail: { itemId, is_favorited: data.is_favorited, timestamp: Date.now() } 
        }));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // 组件挂载时记录浏览和获取统计
  useEffect(() => {
    recordView();
    fetchStats();
  }, [recordView, fetchStats]);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', itemId],
    queryFn: async (): Promise<Item> => {
      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch item');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 dark:text-red-400 mb-4">加载失败</div>
        <a href="/" className="text-orange-600 dark:text-orange-400 hover:underline">返回首页</a>
      </div>
    );
  }

  const images = item.images || [];

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <a
        href={fromPage}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {fromPage === '/my-listings' ? '返回我的发布' : '返回列表'}
      </a>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 图片区域 */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden">
            {images.length > 0 ? (
              <img
                src={images[currentImageIndex]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                暂无图片
              </div>
            )}
          </div>

          {/* 缩略图 */}
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    idx === currentImageIndex
                      ? 'border-orange-600'
                      : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${item.title} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                发布于 {new Date(item.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-orange-600" />
            <span className="text-3xl font-bold text-orange-600">
              ${item.price.toFixed(2)}
            </span>
          </div>

          {/* 浏览量和收藏数 */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{stats.view_count || item.view_count || 0} 次浏览</span>
            </div>
            <button
              onClick={toggleFavorite}
              className={`flex items-center gap-1 transition-colors ${
                stats.is_favorited ? 'text-red-500' : 'hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${stats.is_favorited ? 'fill-current' : ''}`} />
              <span>{stats.favorite_count || item.favorite_count || 0} 收藏</span>
            </button>
          </div>

          <div className="flex items-start gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                交易地点
                {item.is_location_private && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                    保密
                  </span>
                )}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {/* 位置保密且不是自己的商品，显示模糊位置 */}
                {item.is_location_private && currentUserId !== item.user_id
                  ? (item.location_fuzzy || 'VT Campus Area (具体地址已隐藏)')
                  : (item.location_name || 'Virginia Tech Campus')
                }
              </p>
              {item.is_location_private && currentUserId !== item.user_id && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  卖家已隐藏精确地址，成交后可见
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">商品描述</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {item.description || '暂无描述'}
            </p>
          </div>

          {/* 卖家信息 - 如果是自己发布的显示提示 */}
          {currentUserId && currentUserId === item.user_id ? (
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-blue-900 dark:text-blue-300">这是你自己发布的商品</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">你可以在"我的发布"中管理此商品</p>
              </div>
              <a
                href={`/sell?edit=${item.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                编辑
              </a>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 border dark:border-gray-700 rounded-xl">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">卖家</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.user_id.slice(0, 8)}...{item.user_id.slice(-4)}</p>
                </div>
              </div>

              <button
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                onClick={() => {
                  // TODO: 实现联系卖家功能
                  alert('聊天功能即将上线！');
                }}
              >
                <MessageCircle className="w-5 h-5" />
                联系卖家
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ItemDetail(props: ItemDetailProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ItemDetailContent {...props} />
    </QueryClientProvider>
  );
}
