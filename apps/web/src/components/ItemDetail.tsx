import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ArrowLeft, Heart, Eye } from 'lucide-react';
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

interface ItemDetailProps {
  itemId: string;
}

export default function ItemDetail({ itemId }: ItemDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({ view_count: 0, favorite_count: 0, is_favorited: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  // 获取商品数据
  const { data: item, isLoading } = useQuery({
    queryKey: ['item', itemId],
    queryFn: async (): Promise<Item> => {
      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-px h-16 bg-neutral-300 animate-pulse" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 border border-neutral-300 flex items-center justify-center mb-6">
          <span className="text-2xl">404</span>
        </div>
        <h2 className="text-xl font-bold mb-2">商品不存在</h2>
        <a href="/" className="text-sm text-neutral-500 hover:text-black transition-colors">← 返回首页</a>
      </div>
    );
  }

  const images = item.images || [];
  const isOwner = currentUserId === item.user_id;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* 返回按钮 */}
      <a href="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-black transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        BACK
      </a>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* 图片区域 */}
        <div className="relative">
          <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800">
            {/* 四角标记 */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-black dark:border-white" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-black dark:border-white" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-black dark:border-white" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-black dark:border-white" />

            {/* 图片 */}
            {images.length > 0 ? (
              <img
                src={images[currentImageIndex]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl font-light text-neutral-300">{String(item.id).padStart(3, '0')}</span>
              </div>
            )}

            {/* 图片计数器 */}
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/80 text-white text-xs font-mono">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* 缩略图 */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-4">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-20 h-20 border-2 transition-all ${
                    idx === currentImageIndex 
                      ? 'border-black dark:border-white' 
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="space-y-8">
          {/* 标题和价格 */}
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-8">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                {item.category || 'ITEM'} // {String(item.id).padStart(3, '0')}
              </span>
              <div className="flex items-center gap-4 text-neutral-400">
                <span className="flex items-center gap-1 text-xs"><Eye className="w-3 h-3" /> {item.view_count || 0}</span>
                <span className="flex items-center gap-1 text-xs"><Heart className="w-3 h-3" /> {item.favorite_count || 0}</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-4">{item.title}</h1>
            
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold">${item.price.toLocaleString()}</span>
              <span className="text-neutral-400">.00</span>
            </div>
          </div>

          {/* 描述 */}
          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-4">Description</h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.description || 'No description available.'}</p>
          </div>

          {/* 位置 */}
          <div className="border-l-2 border-black dark:border-white pl-4">
            <h3 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-2">Location</h3>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{item.location_fuzzy || item.location_name || 'VT Campus'}</span>
            </div>
            {item.is_location_private && !isOwner && (
              <p className="text-xs text-neutral-500 mt-2">精确地址已隐藏，成交后可见</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4 pt-4">
            {isOwner ? (
              <a 
                href={`/sell?edit=${item.id}`}
                className="flex-1 h-14 bg-black dark:bg-white text-white dark:text-black font-medium tracking-wider uppercase flex items-center justify-center hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              >
                EDIT ITEM
              </a>
            ) : (
              <>
                <button className="flex-1 h-14 bg-black dark:bg-white text-white dark:text-black font-medium tracking-wider uppercase hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors">
                  CONTACT SELLER
                </button>
                <button className="w-14 h-14 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center hover:border-black dark:hover:border-white transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* 日期 */}
          <div className="text-xs text-neutral-400 tracking-wider">
            POSTED {new Date(item.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            }).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}