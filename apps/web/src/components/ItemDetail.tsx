import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useItemDetail, useItemStats, useToggleFavorite, useRecordView, useUserProfile } from '../hooks/useApi';
import '../styles/design-system.css';

// 🔧 Props 接口定义
interface ItemDetailProps {
  itemId: string;
}

export default function ItemDetail({ itemId: itemIdProp }: ItemDetailProps) {
  const itemId = parseInt(itemIdProp || '0');
  const isValidItemId = !isNaN(itemId) && itemId > 0;
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [fromPage, setFromPage] = useState("/");
  const [isImageLoading, setIsImageLoading] = useState(true);

  // 🔧 使用新的统一 hooks
  const { data: item, isLoading, error } = useItemDetail(itemId);
  const { data: stats, refetch: refetchStats } = useItemStats(itemId);
  const toggleFavorite = useToggleFavorite(itemId);
  const recordView = useRecordView(itemId);
  const { data: sellerProfile } = useUserProfile(item?.user_id);

  // 获取当前用户
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    if (from === 'my-listings') setFromPage('/my-listings');
  }, []);

  // 记录浏览
  useEffect(() => {
    if (itemId) {
      recordView.mutate();
    }
  }, [itemId]);

  const handleToggleFavorite = () => {
    if (!currentUserId) {
      window.location.href = '/login';
      return;
    }
    toggleFavorite.mutate();
  };

  // 🔧 处理无效的商品 ID
  if (!isValidItemId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <Flag className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          无效的商品链接
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          商品ID格式不正确，请检查链接是否完整
        </p>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl">
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </a>
      </div>
    );
  }

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
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl">
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
      <a href={fromPage} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8">
        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="font-medium">{fromPage === '/my-listings' ? '返回我的发布' : '返回列表'}</span>
      </a>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* 图片区域 */}
        <div className="space-y-4">
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
                <button onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
                </button>
                <button onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <ChevronRight className="w-6 h-6 text-gray-900 dark:text-white" />
                </button>
              </>
            )}
          </div>

          {/* 缩略图 */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    idx === currentImageIndex ? 'border-gray-900 dark:border-white' : 'border-transparent hover:border-gray-300'
                  }`}>
                  <img src={img} alt={`${item.title} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="space-y-6">
          {/* 标题和分类 */}
          <div>
            {item.category && (
              <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full mb-3">
                {item.category}
              </span>
            )}
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h1>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                发布于 {new Date(item.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* 价格 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">价格</p>
            <div className="flex items-baseline gap-3">
              {item.original_price && item.original_price > item.price && (
                <span className="text-2xl text-gray-400 dark:text-gray-500 line-through">${item.original_price.toFixed(0)}</span>
              )}
              <span className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">${item.price.toFixed(2)}</span>
            </div>
          </div>

          {/* 统计 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Eye className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats?.view_count || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">浏览</p>
              </div>
            </div>
            
            <button onClick={handleToggleFavorite} className="flex items-center gap-3 group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                stats?.is_favorited ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200'
              }`}>
                <Heart className={`w-5 h-5 ${stats?.is_favorited ? 'text-white dark:text-gray-900 fill-current' : 'text-gray-600 dark:text-gray-300'}`} />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats?.favorite_count || 0}</p>
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
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">交易地点</p>
                <p className="text-gray-600 dark:text-gray-300">{item.location_name || 'Virginia Tech Campus'}</p>
              </div>
            </div>
          </div>

          {/* 描述 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">商品描述</h3>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{item.description || '暂无描述'}</p>
          </div>

          {/* 卖家信息 */}
          {isOwner ? (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">这是你自己发布的商品</p>
                </div>
                <a href={`/sell?edit=${item.id}`} className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl">
                  编辑
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center flex-shrink-0">
                    {sellerProfile?.avatar_url ? (
                      <img src={sellerProfile.avatar_url} alt="seller" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-gray-700 dark:text-gray-200">
                        {item.user_id.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {sellerProfile?.full_name || sellerProfile?.username || '卖家'}
                    </p>
                    {(sellerProfile?.university || sellerProfile?.campus) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {sellerProfile.university} {sellerProfile.campus && `· ${sellerProfile.campus}`}
                      </p>
                    )}
                    {sellerProfile?.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{sellerProfile.bio}</p>
                    )}
                  </div>
                </div>
              </div>

              <button className="w-full h-14 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-3"
                onClick={() => alert('聊天功能即将上线！')}>
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
