import React, { useEffect, useState, useCallback, memo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { 
  MapPin, 
  Navigation, 
  Heart, 
  Eye, 
  Clock,
  Sparkles,
  TrendingUp,
  Zap
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

// 🎨 分类颜色映射 - 鲜艳渐变
const CATEGORY_STYLES: Record<string, { 
  gradient: string; 
  icon: string;
  glow: string;
}> = {
  electronics: { 
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    icon: '💻',
    glow: 'shadow-violet-500/30'
  },
  furniture: { 
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    icon: '🪑',
    glow: 'shadow-orange-500/30'
  },
  books: { 
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    icon: '📚',
    glow: 'shadow-emerald-500/30'
  },
  clothing: { 
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    icon: '👕',
    glow: 'shadow-pink-500/30'
  },
  sports: { 
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    icon: '⚽',
    glow: 'shadow-blue-500/30'
  },
  others: { 
    gradient: 'from-gray-500 via-slate-500 to-zinc-500',
    icon: '📦',
    glow: 'shadow-gray-500/30'
  },
};

// ✨ 特色卡片 - 大卡片设计
const FeaturedCard = memo(({ item, index }: { item: Item; index: number }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const categoryStyle = CATEGORY_STYLES[item.category || 'others'] || CATEGORY_STYLES.others;
  
  const timeAgo = item.created_at ? 
    new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : 
    '最近';

  return (
    <a 
      href={`/items/${item.id}`}
      className={`group relative block ${index === 0 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'} animate-fade-in`}
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`relative h-full min-h-[300px] ${index === 0 ? 'min-h-[500px]' : ''} rounded-3xl overflow-hidden 
          bg-gradient-to-br ${categoryStyle.gradient} p-[2px] 
          transition-all duration-500 ease-out
          ${isHovered ? 'scale-[1.02] rotate-1' : 'scale-100 rotate-0'}
        `}
      >
        {/* 内部卡片 */}
        <div className="relative h-full bg-gray-900 rounded-3xl overflow-hidden">
          {/* 图片 */}
          <div className="absolute inset-0">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse" />
            )}
            {item.images?.[0] ? (
              <img 
                src={item.images[0]} 
                alt={item.title}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-700 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                } ${isHovered ? 'scale-110' : 'scale-100'}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <span className="text-6xl">{categoryStyle.icon}</span>
              </div>
            )}
            
            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80" />
          </div>

          {/* 内容 */}
          <div className="absolute inset-0 p-5 flex flex-col justify-between">
            {/* 顶部标签 */}
            <div className="flex justify-between items-start">
              <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${categoryStyle.gradient} text-white text-sm font-bold shadow-lg`}>
                <span className="mr-1">{categoryStyle.icon}</span>
                {item.category || '其他'}
              </div>
              
              {item.distance_display && (
                <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-medium border border-white/20">
                  <Navigation className="w-3 h-3 inline mr-1" />
                  {item.distance_display}
                </div>
              )}
            </div>

            {/* 底部信息 */}
            <div>
              {/* 价格 - 大字体 */}
              <div className="mb-3">
                <span className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${categoryStyle.gradient}`}>
                  ${item.price}
                </span>
              </div>

              {/* 标题 */}
              <h3 className={`font-bold text-white mb-2 line-clamp-2 ${index === 0 ? 'text-2xl' : 'text-lg'}`}>
                {item.title}
              </h3>

              {/* 统计 */}
              <div className="flex items-center gap-4 text-white/70 text-sm">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {item.location_fuzzy || item.location_name || 'VT Campus'}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {item.view_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {item.favorite_count || 0}
                </span>
              </div>
            </div>
          </div>

          {/* 悬停光效 */}
          <div 
            className={`absolute inset-0 bg-gradient-to-t ${categoryStyle.gradient} opacity-0 transition-opacity duration-500 pointer-events-none
              ${isHovered ? 'opacity-20' : ''}
            `} 
          />
        </div>
      </div>
    </a>
  );
});

// 🎨 普通卡片 - 玻璃拟态风格
const RegularCard = memo(({ item, index }: { item: Item; index: number }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const categoryStyle = CATEGORY_STYLES[item.category || 'others'] || CATEGORY_STYLES.others;

  return (
    <a 
      href={`/items/${item.id}`}
      className="group block animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`relative bg-white dark:bg-gray-800/50 rounded-2xl overflow-hidden 
          border border-gray-200 dark:border-gray-700/50
          backdrop-blur-xl
          transition-all duration-300 ease-out
          ${isHovered ? 'shadow-2xl ' + categoryStyle.glow + ' -translate-y-2' : 'shadow-lg'}
        `}
      >
        {/* 图片容器 */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
          )}
          
          {item.images?.[0] ? (
            <img 
              src={item.images[0]} 
              alt={item.title}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isHovered ? 'scale-110' : 'scale-100'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <span className="text-4xl">{categoryStyle.icon}</span>
            </div>
          )}

          {/* 价格标签 */}
          <div className={`absolute top-3 right-3 px-3 py-1 rounded-full 
            bg-gradient-to-r ${categoryStyle.gradient} text-white font-bold text-sm shadow-lg
            transform transition-transform ${isHovered ? 'scale-110' : 'scale-100'}
          `}>
            ${item.price}
          </div>

          {/* 分类标签 */}
          <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center justify-center text-lg shadow-md">
            {categoryStyle.icon}
          </div>
        </div>

        {/* 内容 */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-red-500 transition-all">
            {item.title}
          </h3>
          
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {item.location_fuzzy || 'VT'}
            </span>
            {item.distance_display && (
              <span className="flex items-center gap-1 text-orange-500">
                <Navigation className="w-3.5 h-3.5" />
                {item.distance_display}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
});

// 空状态
const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
    <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/30 rotate-3">
      <Sparkles className="w-16 h-16 text-white" />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
      发现好物
    </h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
      还没有找到心仪的商品？尝试调整筛选条件或搜索其他关键词
    </p>
  </div>
));

// 加载骨架屏
const SkeletonGrid = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="aspect-[4/3] skeleton" />
        <div className="p-4 space-y-3">
          <div className="h-5 skeleton w-3/4 rounded-lg" />
          <div className="h-4 skeleton w-1/2 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
));

// 统计横幅
const StatsBanner = memo(({ total }: { total: number }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-2xl text-white mb-6 shadow-xl shadow-orange-500/20">
    <div className="flex items-center gap-2">
      <TrendingUp className="w-5 h-5" />
      <span className="font-medium">热门商品</span>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-white/80">共 {total} 件商品</span>
      <div className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
        <Zap className="w-4 h-4" />
        <span>实时更新</span>
      </div>
    </div>
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

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        setCurrentUserId(session.user.id);
      }
    });
    return () => { mounted = false; };
  }, []);

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

  // 分离特色商品和普通商品
  const featuredItems = sortedItems.slice(0, 3);
  const regularItems = sortedItems.slice(3);

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
    <div className="space-y-8 pb-10">
      {/* 搜索栏 */}
      <SearchBar 
        onSearch={handleSearch} 
        initialFilters={filters}
        userLocation={userLocation}
        onRefreshLocation={fetchUserLocation}
        isLocating={isLocating}
      />

      {/* 统计横幅 */}
      {sortedItems.length > 0 && <StatsBanner total={sortedItems.length} />}

      {sortedItems.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* 特色商品区域 - Bento Grid 布局 */}
          {featuredItems.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                精选推荐
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[250px]">
                {featuredItems.map((item, index) => (
                  <FeaturedCard key={item.id} item={item} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* 普通商品 - 瀑布流布局 */}
          {regularItems.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                更多商品
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {regularItems.map((item, index) => (
                  <RegularCard key={item.id} item={item} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* 加载更多 */}
          <div ref={ref} className="flex justify-center items-center py-8 h-20">
            {isFetchingNextPage ? (
              <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
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