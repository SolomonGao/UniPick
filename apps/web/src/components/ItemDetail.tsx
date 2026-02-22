import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  MapPin, 
  ArrowLeft, 
  User, 
  Calendar, 
  MessageCircle, 
  Edit3, 
  Eye, 
  Heart,
  Flag,
  ChevronLeft,
  ChevronRight,
  Share2,
  Phone
} from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';
import { supabase } from '../lib/supabase';

interface Item {
  id: number;
  title: string;
  price: number;
  original_price?: number | null;
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
  moderation_status?: 'pending' | 'approved' | 'flagged' | 'rejected';
}

interface SellerProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  university?: string;
  campus?: string;
  phone?: string;
  show_phone: boolean;
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
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
      
      // 检查是否为管理员
      if (session) {
        fetch(`${API_ENDPOINTS.items.replace('/api/v1/items', '/api/v1/users')}/me`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        .then(res => res.json())
        .then(profile => {
          setIsAdmin(profile.is_admin || false);
        })
        .catch(() => setIsAdmin(false));
      }
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    if (from === 'my-listings') {
      setFromPage('/my-listings');
    }
  }, []);

  // 获取卖家信息（使用公开接口，审核中时显示已审核版本）
  const fetchSellerProfile = useCallback(async (userId: string) => {
    try {
      // 🔴 关键：使用 /public 接口，审核中时显示已审核的老资料
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`${API_ENDPOINTS.users}/${userId}/public`, { headers });
      if (!response.ok) throw new Error('获取卖家资料失败');
      
      const data = await response.json();
      
      setSellerProfile({
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        bio: data.bio,
        university: data.university,
        campus: data.campus,
        phone: data.phone,
        show_phone: data.show_phone || false,
      });
    } catch (err) {
      console.error('获取卖家资料失败:', err);
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
      console.error('记录浏览失败:', err);
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
      console.error('获取统计数据失败:', err);
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
      console.error('切换收藏失败:', err);
    }
  };

  useEffect(() => {
    recordView();
    fetchStats();
  }, [recordView, fetchStats]);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', itemId],
    queryFn: async (): Promise<Item> => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}`, { headers });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('商品不存在或审核中');
        }
        throw new Error('获取商品失败');
      }
      return response.json();
    },
  });

  // 获取商品后，获取卖家信息
  useEffect(() => {
    if (item?.user_id) {
      fetchSellerProfile(item.user_id);
    }
  }, [item, fetchSellerProfile]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    const errorMessage = error?.message || '无法加载商品信息';
    const isNotFound = errorMessage.includes('不存在') || errorMessage.includes('审核中');
    
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
          isNotFound ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          <Flag className={`w-10 h-10 ${isNotFound ? 'text-yellow-500' : 'text-gray-400'}`} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {isNotFound ? '商品不可用' : '加载失败'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">{errorMessage}</p>
        
        {isNotFound && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
            该商品可能正在审核中或已被下架
          </p>
        )}
        
        <a 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl transition-colors"
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <a
        href={fromPage}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
      >
        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-gray-900 dark:hover:border-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="font-medium">{fromPage === '/my-listings' ? '返回我的发布' : '返回列表'}</span>
      </a>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* 图片区域 */}
        <div className="space-y-4">
          {/* 主图 */}
          <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {isImageLoading && images.length > 0 && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
            
            {images.length > 0 ? (
              <img
                src={images[currentImageIndex]}
                alt={item.title}
                onLoad={() => setIsImageLoading(false)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <User className="w-10 h-10" />
                </div>
                <span className="text-sm">暂无图片</span>
              </div>
            )}

            {/* 图片切换按钮 */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                >
                  <ChevronRight className="w-6 h-6 text-gray-900 dark:text-white" />
                </button>
              </>
            )}

            {/* 图片计数器 */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* 缩略图 */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    idx === currentImageIndex
                      ? 'border-gray-900 dark:border-white'
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
          {/* 标题和分类 */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {item.category && (
                <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full">
                  {item.category}
                </span>
              )}
              {/* 审核状态标签 - 仅所有者和管理员可见 */}
              {(isOwner || isAdmin) && item.moderation_status && item.moderation_status !== 'approved' && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${
                  item.moderation_status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : item.moderation_status === 'flagged'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {item.moderation_status === 'pending' && '⏳ 审核中'}
                  {item.moderation_status === 'flagged' && '⚠️ 待审核'}
                  {item.moderation_status === 'rejected' && '❌ 已拒绝'}
                </span>
              )}
            </div>
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">价格</p>
            <div className="flex items-baseline gap-3">
              {/* 如果有原价且降价了，显示划掉的原价 */}
              {item.original_price && item.original_price > item.price && (
                <span className="text-2xl text-gray-400 dark:text-gray-500 line-through decoration-gray-400">
                  ${item.original_price.toFixed(0)}
                </span>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">$</span>
                <span className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(item.price)}
                </span>
                <span className="text-xl text-gray-500 dark:text-gray-400">
                  .{(item.price % 1).toFixed(2).slice(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 统计 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Eye className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.view_count || item.view_count || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">浏览</p>
              </div>
            </div>
            
            <button
              onClick={toggleFavorite}
              className="flex items-center gap-3 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                stats.is_favorited 
                  ? 'bg-gray-900 dark:bg-white' 
                  : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
              }`}>
                <Heart className={`w-5 h-5 ${stats.is_favorited ? 'text-white dark:text-gray-900 fill-current' : 'text-gray-600 dark:text-gray-300'}`} />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.favorite_count || item.favorite_count || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">收藏</p>
              </div>
            </button>
          </div>

          {/* 地点 */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 dark:text-white">交易地点</p>
                  {item.is_location_private && (
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                      保密
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {item.is_location_private && !isOwner
                    ? (item.location_fuzzy || 'Campus Area (具体地址已隐藏)')
                    : (item.location_name || 'Virginia Tech Campus')
                  }
                </p>
                {item.is_location_private && !isOwner && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    卖家已隐藏精确地址，成交后可见
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 描述 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-gray-900 dark:bg-white rounded-full"></span>
              商品描述
            </h3>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {item.description || '暂无描述'}
            </p>
          </div>

          {/* 卖家信息或编辑按钮 */}
          {isOwner ? (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">这是你自己发布的商品</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">你可以在"我的发布"中管理此商品</p>
                </div>
                <a
                  href={`/sell?edit=${item.id}`}
                  className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  编辑
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* 卖家信息 */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  {/* 卖家头像 */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {sellerProfile?.avatar_url ? (
                      <img 
                        src={sellerProfile.avatar_url} 
                        alt="seller avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-gray-700 dark:text-gray-200">
                        {item.user_id.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    {/* 卖家名称 */}
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {sellerProfile?.full_name || sellerProfile?.username || '卖家'}
                    </p>
                    
                    {/* 学校和校区 */}
                    {(sellerProfile?.university || sellerProfile?.campus) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {sellerProfile.university} {sellerProfile.campus && `· ${sellerProfile.campus}`}
                      </p>
                    )}
                    
                    {/* 卖家简介 */}
                    {sellerProfile?.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {sellerProfile.bio}
                      </p>
                    )}
                    
                    {/* 联系电话（如果卖家选择公开） */}
                    {sellerProfile?.show_phone && sellerProfile?.phone && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {sellerProfile.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 联系按钮 */}
              <button
                className="w-full h-14 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-3 transition-colors"
                onClick={() => alert('聊天功能即将上线！')}
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
