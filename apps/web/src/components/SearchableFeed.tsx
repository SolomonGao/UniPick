import React, { useEffect, useState, useCallback, memo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { 
  MapPin, 
  Navigation, 
  Heart, 
  Eye, 
  Clock,
  Search,
  Filter,
  Loader2
} from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';
import { getUserLocation, saveUserLocation } from '../lib/geo';
import { supabase } from '../lib/supabase';
import SearchBar, { type SearchFilters } from './SearchBar';
import '../styles/design-system.css';

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
  created_at?: string;
}

const PAGE_SIZE = 12;

// 🎨 全新的商品卡片设计
const ItemCard = memo(({ 
  item, 
  isMine,
  index
}: { 
  item: Item; 
  isMine: boolean;
  index: number;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 计算发布时间（简化版）
  const timeAgo = item.created_at ? 
    new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : 
    '最近';

  return (
    <a 
      href={`/items/${item.id}`}
      className="group block animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card card-hover relative">
        {/* 图片容器 */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          {/* 骨架屏 */}
          {!imageLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}
          
          {item.images && item.images.length > 0 ? (
            <img 
              src={item.images[0]} 
              alt={item.title}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-700 ease-out ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isHovered ? 'scale-110' : 'scale-100'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* 价格标签 - 玻璃拟态 */}
          <div className="absolute top-3 right-3 glass px-3 py-1.5 rounded-full">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              ${item.price}
            </span>
          </div>

          {/* "我的" 标签 */}
          {isMine && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              我的
            </div>
          )}

          {/* 分类标签 */}
          {item.category && !isMine && (
            <div className="absolute top-3 left-3 badge badge-primary capitalize">
              {item.category}
            </div>
          )}

          {/* 悬停时显示的统计 */}
          <div className={`absolute bottom-3 left-3 right-3 flex items-center justify-between text-white transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
            <div className="flex items-center gap-3 text-sm">
              {item.view_count !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {item.view_count}
                </span>
              )}
              {item.favorite_count !== undefined && (
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {item.favorite_count}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs opacity-90">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            {item.title}
          </h3>
          
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {item.location_fuzzy || item.location_name || 'VT Campus'}
            </span>
          </div>

          {item.distance_display && (
            <div className="flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400 mt-1.5">
              <Navigation className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium">{item.distance_display}</span>
            </div>
          )}
        </div>
      </div>
    </a>
  );
});

ItemCard.displayName = 'ItemCard';

// 空状态组件
const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
    <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/20 rounded-3xl flex items-center justify-center mb-6">
      <Search className="w-10 h-10 text-orange-500" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
      没有找到商品
    </h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
      尝试调整筛选条件，或搜索其他关键词
    </p>
  </div>
));

// 加载骨架屏
const SkeletonGrid = memo(() => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="card overflow-hidden">
        <div className="aspect-[4/3] skeleton" />
        <div className="p-4 space-y-3">
          <div className="h-5 skeleton w-3/4" />
          <div className="h-4 skeleton w-1/2" />
        </div>
      </div>
    ))}
  </div>
));

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
  const { ref, inView } = useInView({ threshold: 0 });

  // 获取当前用户
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        setCurrentUserId(session.user.id);
      }
    });
    return () => { mounted = false; };
  }, []);

  // 获取用户位置
  const fetchUserLocation = useCallback(async () => {
    setIsLocating(true);
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
        setIsLocating(false);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          saveUserLocation(loc.lat, loc.lng);
          setIsLocating(false);
        },
        () => { setIsLocating(false); },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    } catch {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    fetchUserLocation();
  }, [fetchUserLocation]);

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: ['items', filters, userLocation],
    queryFn: async ({ pageParam = 0 }) => {
      const skip = pageParam * PAGE_SIZE;
      const params = new URLSearchParams({ skip: skip.toString(), limit: PAGE_SIZE.toString() });
      
      if (filters.keyword) params.append('keyword', filters.keyword);
      if (filters.minPrice) params.append('min_price', filters.minPrice.toString());
      if (filters.maxPrice) params.append('max_price', filters.maxPrice.toString());
      if (filters.category) params.append('category', filters.category);
      
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
    getNextPageParam: (lastPage, allPages) => lastPage.length < PAGE_SIZE ? undefined : allPages.length,
    enabled: !!userLocation || filters.useLocation === false,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearch = useCallback((newFilters: SearchFilters) => setFilters(newFilters), []);

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

  if (status === 'pending') return <SkeletonGrid />;
  
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-red-500 mb-4">加载失败: {(error as Error).message}</div>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* 搜索栏 */}
      <SearchBar 
        onSearch={handleSearch} 
        initialFilters={filters}
        userLocation={userLocation}
        onRefreshLocation={fetchUserLocation}
        isLocating={isLocating}
      />

      {/* 结果统计 */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          找到 <span className="font-semibold text-gray-900 dark:text-white">{sortedItems.length}</span> 个商品
        </p>
        {currentUserId && sortedItems.some(i => i.user_id === currentUserId) && (
          <p className="text-xs text-gray-400">自己发布的商品显示在最后</p>
        )}
      </div>

      {/* 商品网格 */}
      {sortedItems.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {sortedItems.map((item, index) => (
              <ItemCard 
                key={item.id} 
                item={item}
                isMine={currentUserId === item.user_id}
                index={index}
              />
            ))}
          </div>

          {/* 加载更多 */}
          <div ref={ref} className="flex justify-center items-center py-8 h-20">
            {isFetchingNextPage ? (
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
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