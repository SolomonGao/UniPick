import React, { useEffect, useState } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MapPin, ArrowLeft, User, Calendar, DollarSign, MessageCircle, Edit3 } from 'lucide-react';
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

          <div className="flex items-start gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">交易地点</p>
              <p className="text-gray-600 dark:text-gray-400">{item.location_name || 'Virginia Tech Campus'}</p>
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
