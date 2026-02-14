import React, { useEffect, useState, useCallback, memo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, MapPin, AlertCircle, Search, Navigation, Eye, Heart } from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';
import { getUserLocation, saveUserLocation } from '../lib/geo';
import { supabase } from '../lib/supabase';
import SearchBar, { type SearchFilters } from './SearchBar';

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
  favorite_count?: number;
}

// 用户收藏状态
interface UserFavoritesState {
  [itemId: number]: boolean;
}

const PAGE_SIZE = 12;

// 优化的商品卡片组件 - 使用 memo 减少重渲染
const ItemCard = memo(({ 
  item, 
  isMine,
  isFavorited
}: { 
  item: Item; 
  isMine: boolean;
  isFavorited: boolean;
}) => {
  return (
    <a 
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
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 text-xs">
            暂无图片
          </div>
        )}
        
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
        {/* 使用列表 API 返回的统计数据，避免额外的请求 */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{item.view_count || 0}</span>
          </div>
          <div className={`flex items-center gap-1 ${isFavorited ? 'text-red-500' : ''}`}>
            <Heart className={`w-3 h-3 ${isFavorited ? 'fill-current' : ''}`} />
            <span>{item.favorite_count || 0}</span>
          </div>
        </div>
      </div>
    </a>
  );
});

ItemCard.displayName = 'ItemCard';

// 骨架屏组件 - 使用固定 key 防止闪烁
const SkeletonFeed = memo(() => {
  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="w-24 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="w-24 h-12 bg-orange-200 dark:bg-orange-900/30 rounded-xl animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div 
            key={`skeleton-${i}`}
            className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800"
          >
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
});

SkeletonFeed.displayName = 'SkeletonFeed';

// 空状态组件
const EmptyState = memo(() => (
  <div className="text-center py-20 text-gray-400 dark:text-gray-500">
    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
    <p className="text-lg font-medium mb-2">没有找到商品</p>
    <p className="text-sm">尝试调整筛选条件或搜索其他关键词</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

// 错误状态组件
const ErrorState = memo(({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
    <AlertCircle className="w-10 h-10 mb-2 text-red-400" />
    <p className="mb-4">加载失败: {message}</p>
    <button 
      onClick={onRetry}
      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
    >
      重试
    </button>
  </div>
));

ErrorState.displayName = 'ErrorState';

export default function SearchableFeed() {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    minPrice: null,
    maxPrice: null,
    category: null,
    useLocation: false,
    radius: 10,
    sortBy: 'created_at',
  });
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [userFavorites, setUserFavorites] = useState<UserFavoritesState>({});
  const { ref, inView } = useInView({ threshold: 0 });

  // 获取当前用户ID和收藏列表
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        setCurrentUserId(session.user.id);
        
        // 获取用户收藏列表
        try {
          const response = await fetch(`${API_ENDPOINTS.items}/user/favorites`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          if (response.ok) {
            const favorites = await response.json();
            const favMap: UserFavoritesState = {};
            favorites.forEach((item: Item) => {
              favMap[item.id] = true;
            });
            setUserFavorites(favMap);
          }
        } catch (err) {
          console.error('Failed to fetch user favorites:', err);
        }
      }
    });
    return () => { mounted = false; };
  }, []);

  // 获取用户位置
  const fetchUserLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);
    
    try {
      const saved = localStorage.getItem('unipick_user_location');
      if (saved) {
        const loc = JSON.parse(saved);
        const age = Date.now() - loc.timestamp;
        if (age < 24 * 60 * 60 * 1000) {
          setUserLocation({ lat: loc.lat, lng: loc.lng });
          setIsLocating(false);
          return;
        }
      }
      
      if (!navigator.geolocation) {
        setLocationError('浏览器不支持地理定位');
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
          const msg = error.code === 1 
            ? '请允许位置权限以使用附近搜索功能'
            : '获取位置失败';
          setLocationError(msg);
          setIsLocating(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    } catch {
      setLocationError('获取位置失败');
      setIsLocating(false);
    }
  }, []);

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
    queryFn: async ({ pageParam = 0 }) => {
      const skip = pageParam * PAGE_SIZE;
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: PAGE_SIZE.toString(),
      });
      
      if (filters.keyword) params.append('keyword', filters.keyword);
      if (filters.minPrice) params.append('min_price', filters.minPrice.toString());
      if (filters.maxPrice) params.append('max_price', filters.maxPrice.toString());
      if (filters.category) params.append('category', filters.category);
      
      // 排序参数（无论是否启用位置筛选都生效）
      if (filters.sortBy && filters.sortBy !== 'distance') {
        // 非距离排序（价格、时间）
        params.append('sort_by', filters.sortBy);
        params.append('sort_order', filters.sortBy === 'price' ? 'asc' : 'desc');
      }
      
      if (userLocation && filters.useLocation !== false) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', (filters.radius || 5).toString());
        if (filters.sortBy === 'distance') {
          params.append('sort_by', 'distance');
          params.append('sort_order', 'asc');
        }
      }
      
      const response = await fetch(`${API_ENDPOINTS.items}/?${params}`);
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    enabled: !!userLocation || filters.useLocation === false,
    staleTime: 30 * 1000, // 30秒内不重复请求
    gcTime: 5 * 60 * 1000, // 5分钟后清理缓存
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearch = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // 使用 useMemo 缓存排序结果
  const sortedItems = React.useMemo(() => {
    const allItems = data?.pages.flat() || [];
    return [...allItems].sort((a, b) => {
      const aIsMine = currentUserId && a.user_id === currentUserId;
      const bIsMine = currentUserId && b.user_id === currentUserId;
      if (aIsMine && !bIsMine) return 1;
      if (!aIsMine && bIsMine) return -1;
      return 0;
    });
  }, [data?.pages, currentUserId]);

  if (status === 'pending') return <SkeletonFeed />;
  
  if (status === 'error') {
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
        <ErrorState message={(error as Error).message} onRetry={handleRetry} />
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

      {locationError && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-400">
          {locationError}
        </div>
      )}

      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          找到 <span className="font-medium text-gray-900 dark:text-gray-100">{sortedItems.length}</span> 个商品
        </p>
        {currentUserId && sortedItems.some(i => i.user_id === currentUserId) && (
          <p className="text-xs text-gray-400 dark:text-gray-500">自己发布的商品显示在最后</p>
        )}
      </div>

      {sortedItems.length === 0 ? <EmptyState /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedItems.map((item) => (
              <ItemCard 
                key={item.id} 
                item={item}
                isMine={currentUserId === item.user_id}
                isFavorited={!!userFavorites[item.id]}
              />
            ))}
          </div>

          <div ref={ref} className="flex justify-center items-center py-8 h-20">
            {isFetchingNextPage ? (
              <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
            ) : hasNextPage ? (
              <span className="text-gray-400 text-sm">向下滚动加载更多</span>
            ) : sortedItems.length > 0 && (
              <span className="text-gray-400 text-sm">—— 没有更多了 ——</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}