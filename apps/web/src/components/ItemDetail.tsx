import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  MapPin, 
  ArrowLeft, 
  User, 
  Calendar, 
  DollarSign, 
  MessageCircle, 
  Edit3, 
  Eye, 
  Heart,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import '../styles/design-system.css';

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
  category?: string;
}

interface ItemStats {
  view_count: number;
  favorite_count: number;
  is_favorited: boolean;
}

interface ItemDetailProps {
  itemId: string;
}

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
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    if (from === 'my-listings') {
      setFromPage('/my-listings');
    }
  }, []);

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
      
      window.dispatchEvent(new CustomEvent('unipick:viewRecorded', { 
        detail: { itemId, timestamp: Date.now() } 
      }));
    } catch (err) {
      console.error('Failed to record view:', err);
    }
  }, [itemId]);

  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}/stats`, { headers });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [itemId]);

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
        
        window.dispatchEvent(new CustomEvent('unipick:favoriteToggled', { 
          detail: { itemId, is_favorited: data.is_favorited, timestamp: Date.now() } 
        }));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <Flag className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">加载失败</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">无法加载商品信息</p>
        <a 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </a>
      </div>
    );
  }

  const images = item.images || [];
  const isOwner = currentUserId === item.user_id;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* 返回按钮 */}
      <a
        href={fromPage}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
      >
        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-orange-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="font-medium">{fromPage === '/my-listings' ? '返回我的发布' : '返回列表'}</span>
      </a>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* 图片区域 */}
        <div className="space-y-4">
          {/* 主图 */}
          <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl overflow-hidden shadow-lg">
            {isImageLoading && images.length > 0 && (
              <div className="absolute inset-0 skeleton" />
            )}
            
            {images.length > 0 ? (
              <img
                src={images[currentImageIndex]}
                alt={item.title}
                onLoad={() => setIsImageLoading(false)}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <svg className="w-20 h-20 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm opacity-50">暂无图片</span>
              </div>
            )}

            {/* 图片切换按钮 */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <ChevronRight className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
              </>
            )}

            {/* 图片计数器 */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm font-medium">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* 缩略图 */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    idx === currentImageIndex
                      ? 'border-orange-500 ring-2 ring-orange-500/20'
                      : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 opacity-70 hover:opacity-100'
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
          {/* 标题和日期 */}
          <div>
            {item.category && (
              <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-medium rounded-full mb-3">
                {item.category}
              </span>
            )}
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {item.title}
            </h1>
            
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                发布于 {new Date(item.created_at).toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>

          {/* 价格 */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-orange-500">$</span>
            <span className="text-4xl lg:text-5xl font-bold text-orange-500">
              {item.price.toFixed(0)}
            </span>
            <span className="text-xl text-orange-400">.{(item.price % 1).toFixed(2).slice(2)}</span>
          </div>

          {/* 统计 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-500">浏览</p>
                <p className="font-semibold text-gray-900 dark:text-white">{stats.view_count || item.view_count || 0}</p>
              </div>
            </div>
            
            <button
              onClick={toggleFavorite}
              className={`flex items-center gap-2 transition-all ${
                stats.is_favorited 
                  ? 'text-red-500' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-red-400'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                stats.is_favorited 
                  ? 'bg-red-100 dark:bg-red-900/30' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Heart className={`w-5 h-5 ${stats.is_favorited ? 'fill-current' : ''}`} />
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-400 dark:text-gray-500">收藏</p>
                <p className="font-semibold text-gray-900 dark:text-white">{stats.favorite_count || item.favorite_count || 0}</p>
              </div>
            </button>
          </div>

          {/* 地点 */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 dark:text-white">交易地点</p>
                  {item.is_location_private && (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                      保密
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {item.is_location_private && !isOwner
                    ? (item.location_fuzzy || 'VT Campus Area (具体地址已隐藏)')
                    : (item.location_name || 'Virginia Tech Campus')
                  }
                </p>
                {item.is_location_private && !isOwner && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    卖家已隐藏精确地址，成交后可见
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 描述 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
              商品描述
            </h3>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {item.description || '暂无描述'}
              </p>
            </div>
          </div>

          {/* 卖家信息或编辑按钮 */}
          {isOwner ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 dark:text-blue-300">这是你自己发布的商品</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">你可以在"我的发布"中管理此商品</p>
                </div>
                <a
                  href={`/sell?edit=${item.id}`}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                >
                  编辑
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* 卖家信息 */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold">
                    {item.user_id.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">卖家</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {item.user_id.slice(0, 6)}...{item.user_id.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 联系按钮 */}
              <button
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-orange-200 dark:shadow-orange-900/30 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                onClick={() => alert('聊天功能即将上线！')}
              >
                <MessageCircle className="w-6 h-6" />
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