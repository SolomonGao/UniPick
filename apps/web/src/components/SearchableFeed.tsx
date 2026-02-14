import React, { useEffect, useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, MapPin, AlertCircle, Search, Navigation } from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';
import { getUserLocation, saveUserLocation, getLocationDisplay, formatDistance } from '../lib/geo';
import { supabase } from '../lib/supabase';
import SearchBar, { type SearchFilters } from './SearchBar';
import ItemStats from './ItemStats';

// 定义接口
interface Item {
  id: number;
  title: string;
  price: number;
  images: string[];
  location_name: string;
  latitude: number;
  longitude: number;
  description?: string;
  category?: string;
  distance?: number;
  distance_display?: string;
  location_fuzzy?: string;
  user_id?: string;
  view_count?: number;
}

// 每次请求的数量
const PAGE_SIZE = 12;

// Fetcher 函数
const fetchItems = async ({ 
  pageParam = 0, 
  filters,
  userLocation,
}: { 
  pageParam?: number; 
  filters: SearchFilters;
  userLocation?: { lat: number; lng: number } | null;
}): Promise<Item[]> => {
  const skip = pageParam * PAGE_SIZE;
  
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: PAGE_SIZE.toString(),
  });
  
  if (filters.keyword) params.append('keyword', filters.keyword);
  if (filters.minPrice) params.append('min_price', filters.minPrice.toString());
  if (filters.maxPrice) params.append('max_price', filters.maxPrice.toString());
  if (filters.category) params.append('category', filters.category);
  
  // 添加地理位置参数
  if (userLocation && filters.useLocation !== false) {
    params.append('lat', userLocation.lat.toString());
    params.append('lng', userLocation.lng.toString());
    params.append('radius', (filters.radius || 5).toString());
    
    // 如果用户选择按距离排序
    if (filters.sortBy === 'distance') {
      params.append('sort_by', 'distance');
      params.append('sort_order', 'asc');
    }
  }
  
  const response = await fetch(`${API_ENDPOINTS.items}/?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch items');
  }
  
  return response.json();
};

// 骨架屏组件
function SkeletonFeed() {
  return (
    <div className="space-y-6 pb-10">
      {/* 搜索栏骨架屏 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="w-24 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="w-24 h-12 bg-orange-200 dark:bg-orange-900/30 rounded-xl animate-pulse" />
        </div>
      </div>
      {/* Feed 骨架屏 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
            <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded animate-pulse w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 主要内容组件
function FeedContent() {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    minPrice: null,
    maxPrice: null,
    category: null,
    useLocation: false,  // 默认不使用位置搜索
    radius: 10,  // 默认 10 miles
    sortBy: 'created_at',  // 默认按时间排序
  });
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);  // 筛选面板状态
  const { ref, inView } = useInView();

  // 获取当前用户ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // 获取用户位置
  const fetchUserLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);
    
    try {
      // 先尝试从 localStorage 获取
      const saved = getUserLocation();
      if (saved) {
        setUserLocation(saved);
        setIsLocating(false);
        return;
      }
      
      // 否则请求浏览器定位
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported');
        setIsLocating(false);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          saveUserLocation(loc.lat, loc.lng);
          setIsLocating(false);
        },
        (error) => {
          let msg = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = 'Location permission denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              msg = 'Location unavailable. Please check your GPS.';
              break;
            case error.TIMEOUT:
              msg = 'Location request timed out.';
              break;
          }
          setLocationError(msg);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch {
      setLocationError('Failed to get location');
      setIsLocating(false);
    }
  }, []);

  // 组件加载时获取位置
  useEffect(() => {
    fetchUserLocation();
  }, [fetchUserLocation]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['items', filters, userLocation],
    queryFn: ({ pageParam }) => fetchItems({ pageParam, filters, userLocation }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    enabled: !!userLocation || filters.useLocation === false, // 等待位置获取完成
  });

  useEffect(() => {
    refetch();
  }, [filters, userLocation, currentUserId, refetch]);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const handleSearch = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  // 对商品进行排序：非自己的在前，自己的在后
  const allItems = data?.pages.flat() || [];
  const sortedItems = [...allItems].sort((a, b) => {
    const aIsMine = currentUserId && a.user_id === currentUserId;
    const bIsMine = currentUserId && b.user_id === currentUserId;
    if (aIsMine && !bIsMine) return 1; // 我的放后面
    if (!aIsMine && bIsMine) return -1; // 不是我的放前面
    return 0;
  });

  // --- Loading 状态 ---
  if (status === 'pending') {
    return <SkeletonFeed />;
  }
  
  // --- Error 状态 ---
  if (status === 'error') {
    return (
      <div className="space-y-6 pb-10">
        <SearchBar 
          onSearch={handleSearch} 
          initialFilters={filters}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <AlertCircle className="w-10 h-10 mb-2 text-red-400" />
          <p>加载失败: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <SearchBar 
        onSearch={handleSearch} 
        initialFilters={filters}
        userLocation={userLocation}
        onRefreshLocation={fetchUserLocation}
        isLocating={isLocating}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          找到 <span className="font-medium text-gray-900 dark:text-gray-100">{allItems.length}</span> 个商品
          {(filters.keyword || filters.minPrice || filters.maxPrice || filters.category) && (
            <span className="ml-1">（已筛选）</span>
          )}
        </p>
        {currentUserId && (
          <p className="text-xs text-gray-400 dark:text-gray-500">自己发布的商品显示在最后</p>
        )}
      </div>

      {sortedItems.length === 0 && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium mb-2">没有找到商品</p>
          <p className="text-sm">尝试调整筛选条件或搜索其他关键词</p>
        </div>
      )}

      {sortedItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedItems.map((item) => {
            const isMine = currentUserId && item.user_id === currentUserId;
            return (
              <a 
                key={item.id} 
                href={`/items/${item.id}`}
                className={`group block border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer duration-300 ${
                  isMine 
                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20' 
                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                  {item.images && item.images.length > 0 ? (
                    <img 
                      src={item.images[0]} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 text-xs">
                      暂无图片
                    </div>
                  )}
                  
                  {/* 我的标签 */}
                  {isMine && (
                    <div className="absolute top-2 left-2 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      我的
                    </div>
                  )}
                  
                  <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-2 py-1 rounded-lg text-sm font-bold text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-600">
                    ${item.price}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {item.location_fuzzy || item.location_name || 'VT Campus'}
                    </span>
                  </div>
                  {item.distance_display && (
                    <div className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 mt-1">
                      <Navigation className="w-3 h-3 flex-shrink-0" />
                      <span>{item.distance_display}</span>
                    </div>
                  )}
                  {/* 浏览量和收藏数 */}
                  <div className="mt-2">
                    <ItemStats itemId={item.id} showFavorite={true} size="sm" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <div ref={ref} className="flex justify-center items-center py-8 h-20">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
            <Loader2 className="animate-spin w-4 h-4" />
            正在加载更多...
          </div>
        ) : hasNextPage ? (
          <span className="text-gray-300 dark:text-gray-600 text-sm">向下滚动加载更多</span>
        ) : allItems.length > 0 ? (
          <span className="text-gray-300 dark:text-gray-600 text-sm">—— 到底啦 ——</span>
        ) : null}
      </div>
    </div>
  );
}

// 主组件 - 处理 SSR
export default function SearchableFeed() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // SSR 阶段显示骨架屏
  if (!isClient) {
    return <SkeletonFeed />;
  }

  // 客户端渲染 Feed
  return <FeedContent />;
}
