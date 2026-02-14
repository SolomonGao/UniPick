import React, { useEffect, useState, useCallback, memo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { MapPin, ArrowUpRight } from 'lucide-react';
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

// 极简商品卡片 - 几何线条设计
const ItemCard = memo(({ 
  item, 
  index,
  featured = false
}: { 
  item: Item; 
  index: number;
  featured?: boolean;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a 
      href={`/items/${item.id}`}
      className="group block animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`
        relative bg-white dark:bg-neutral-900
        ${featured ? 'aspect-[4/5]' : 'aspect-square'}
        overflow-hidden
        border border-neutral-200 dark:border-neutral-800
        transition-all duration-500 ease-out
        ${isHovered ? 'border-black dark:border-white' : ''}
      `}>
        {/* 几何装饰角 */}
        <div className={`
          absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 
          border-neutral-300 dark:border-neutral-700
          transition-all duration-300
          ${isHovered ? 'w-6 h-6 border-black dark:border-white' : ''}
        `} />
        <div className={`
          absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2
          border-neutral-300 dark:border-neutral-700
          transition-all duration-300
          ${isHovered ? 'w-6 h-6 border-black dark:border-white' : ''}
        `} />
        <div className={`
          absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2
          border-neutral-300 dark:border-neutral-700
          transition-all duration-300
          ${isHovered ? 'w-6 h-6 border-black dark:border-white' : ''}
        `} />
        <div className={`
          absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2
          border-neutral-300 dark:border-neutral-700
          transition-all duration-300
          ${isHovered ? 'w-6 h-6 border-black dark:border-white' : ''}
        `} />

        {/* 图片区域 */}
        <div className="absolute inset-4 overflow-hidden">
          {!imageLoaded && item.images?.[0] && (
            <div className="absolute inset-0 skeleton" />
          )}
          
          {item.images?.[0] ? (
            <img 
              src={item.images[0]} 
              alt={item.title}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={`
                w-full h-full object-cover
                transition-all duration-700 ease-out
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
                ${isHovered ? 'scale-105 grayscale-0' : 'scale-100 grayscale-[20%]'}
              `}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
              <span className="text-4xl tracking-widest font-light text-neutral-400">{String(item.id).padStart(3, '0')}</span>
            </div>
          )}

          {/* 悬停遮罩 */}
          <div className={`
            absolute inset-0 bg-black/0 transition-all duration-500
            ${isHovered ? 'bg-black/20' : ''}
          `} />
        </div>

        {/* 顶部信息栏 */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4">
          {/* 分类标签 */}
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-500 dark:text-neutral-400">
            {item.category || 'ITEM'}
          </span>

          {/* 编号 */}
          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-600">
            #{String(item.id).padStart(3, '0')}
          </span>
        </div>

        {/* 底部信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-900">
          {/* 价格 - 大字体 */}
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold tracking-tight text-black dark:text-white">
              ${item.price.toLocaleString()}
            </span>
            <ArrowUpRight 
              className={`
                w-5 h-5 transition-all duration-300
                ${isHovered ? 'text-black dark:text-white translate-x-0.5 -translate-y-0.5' : 'text-neutral-300'}
              `} 
            />
          </div>

          {/* 标题 */}
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 line-clamp-1 mb-2"
003e
            {item.title}
          </h3>

          {/* 位置 */}
          <div className="flex items-center gap-1 text-[11px] tracking-wide text-neutral-400 dark:text-neutral-500 uppercase"
003e
            <MapPin className="w-3 h-3" />
            {item.location_fuzzy || item.location_name || 'VT Campus'}
          </div>
        </div>
      </div>
    </a>
  );
});

// 特色大卡片
const FeaturedCard = memo(({ item }: { item: Item }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a 
      href={`/items/${item.id}`}
      className="group block col-span-2 row-span-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full min-h-[400px] lg:min-h-[500px] bg-white dark:bg-neutral-900 overflow-hidden border border-neutral-200 dark:border-neutral-800 transition-all duration-500 hover:border-black dark:hover:border-white"
003e
        {/* 大图 */}
        <div className="absolute inset-0"
003e
          {item.images?.[0] ? (
            <img 
              src={item.images[0]} 
              alt={item.title}
              className={`w-full h-full object-cover transition-all duration-700 ${isHovered ? 'scale-105 grayscale-0' : 'scale-100 grayscale-[10%]'}`}
            /
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800"
003e
              <span className="text-[120px] font-light text-neutral-200 dark:text-neutral-700 tracking-widest"
003e{String(item.id).padStart(3, '0')}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" /
        </div>

        {/* 角标 */}
        <div className="absolute top-6 left-6"
003e
          <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/80 bg-black/30 backdrop-blur-sm px-3 py-1.5"
003e
            Featured
          </span>
        </div>

        {/* 编号 */}
        <div className="absolute top-6 right-6"
003e
          <span className="text-[10px] font-mono text-white/60"
003e
            #{String(item.id).padStart(3, '0')}
          </span>
        </div>

        {/* 底部信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-8"
003e
          <div className="flex items-end justify-between"
003e
            <div>
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60 mb-2 block"
003e
                {item.category || 'ITEM'}
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight"
003e
                {item.title}
              </h2>
              <div className="flex items-center gap-2 text-white/60 text-sm"
003e
                <MapPin className="w-4 h-4" />
                {item.location_fuzzy || item.location_name || 'VT Campus'}
              </div>
            </div>
            
            <div className="text-right"
003e
              <span className="text-4xl lg:text-5xl font-bold text-white"
003e
                ${item.price.toLocaleString()}
              </span>
              <ArrowUpRight 
                className={`w-8 h-8 text-white transition-all duration-300 inline-block ml-2 ${isHovered ? 'translate-x-1 -translate-y-1' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
    </a>
  );
});

// 空状态 - 极简
const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center py-32 px-4"
003e
    <div className="w-px h-16 bg-neutral-300 dark:bg-neutral-700 mb-8" />
    <p className="text-sm tracking-[0.2em] uppercase text-neutral-400 mb-2"
003e
      No Items Found
    </p>
    <p className="text-neutral-500 dark:text-neutral-600"
003e
      尝试调整搜索条件
    </p>
  </div>
));

// 骨架屏 - 极简
const SkeletonGrid = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
003e
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="aspect-square border border-neutral-200 dark:border-neutral-800"
003e
        <div className="h-3/4 skeleton" />
        <div className="h-1/4 p-4 space-y-2"
003e
          <div className="h-6 skeleton w-1/3" />
          <div className="h-4 skeleton w-2/3" />
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

  const featuredItems = sortedItems.slice(0, 2);
  const regularItems = sortedItems.slice(2);

  if (status === 'pending') return <SkeletonGrid />;
  
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-32"
003e
        <div className="w-px h-16 bg-neutral-300 dark:bg-neutral-700 mb-8" />
        <p className="text-neutral-500">加载失败: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12"
003e
      {/* 标题区域 */}
      <div className="mb-16"
003e
        <h1 className="heading-lg text-black dark:text-white mb-4"
003e
          MARKETPLACE
        </h1>
        <p className="text-sm tracking-[0.2em] uppercase text-neutral-500"
003e
          {sortedItems.length} Items Available
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="mb-12">
        <SearchBar 
          onSearch={handleSearch} 
          initialFilters={filters}
          userLocation={userLocation}
          onRefreshLocation={fetchUserLocation}
          isLocating={isLocating}
        />
      </div>

      {sortedItems.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* 特色商品 - 大卡片 */}
          {featuredItems.length > 0 && (
            <div className="mb-12"
003e
              <div className="flex items-center justify-between mb-6"
003e
                <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-neutral-400"
003e
                  Featured
                </span>
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800 ml-6" />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"
003e
                {featuredItems.map((item) => (
                  <FeaturedCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* 分隔线 */}
          <div className="flex items-center gap-4 mb-12"
003e
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-neutral-400"
003e
              All Items
            </span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          </div>

          {/* 普通商品 - 网格布局 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
003e
            {regularItems.map((item, index) => (
              <ItemCard key={item.id} item={item} index={index} />
            ))}
          </div>

          {/* 加载更多 */}
          <div ref={ref} className="flex justify-center items-center py-16"
003e
            {isFetchingNextPage ? (
              <div className="w-px h-8 bg-black dark:bg-white animate-pulse" />
            ) : hasNextPage ? (
              <span className="text-[10px] tracking-[0.2em] uppercase text-neutral-400"
003e
                Scroll for more
              </span>
            ) : sortedItems.length > 0 && (
              <div className="flex items-center gap-4"
003e
                <div className="w-16 h-px bg-neutral-300 dark:bg-neutral-700" />
                <span className="text-[10px] tracking-[0.2em] uppercase text-neutral-400"
003eEnd</span>
                <div className="w-16 h-px bg-neutral-300 dark:bg-neutral-700" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}