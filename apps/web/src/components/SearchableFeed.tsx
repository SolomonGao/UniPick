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
  original_price?: number | null;
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

// 高级极简商品卡片
const ItemCard = memo(({
  item,
  index
}: {
  item: Item;
  index: number;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={`/items/${item.id}`}
      className="group block animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-minimal overflow-hidden">
        {/* 图片区域 - 圆角 */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-4">
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
                ${isHovered ? 'scale-105' : 'scale-100'}
              `}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
              <span className="text-4xl font-light text-gray-300">{String(item.id).padStart(3, '0')}</span>
            </div>
          )}

          {/* Hover 时显示橙色查看按钮 */}
          <div className={`
            absolute inset-0 flex items-center justify-center
            transition-all duration-300
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}>
            <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center shadow-xl">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="space-y-3">
          {/* 分类和价格 */}
          <div className="flex items-center justify-between">
            <span className="label">
              {item.category || 'Item'}
            </span>
            <div className="flex items-center gap-2">
              {/* 如果有原价且降价了，显示划掉的原价 */}
              {item.original_price && item.original_price > item.price && (
                <span className="text-sm text-gray-400 line-through decoration-gray-400">
                  ${item.original_price.toLocaleString()}
                </span>
              )}
              <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${item.price.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 标题 */}
          <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-orange-500 transition-colors">
            {item.title}
          </h3>

          {/* 位置 */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>{item.location_fuzzy || item.location_name || 'VT Campus'}</span>
            {item.distance_display && (
              <span className="text-orange-500">• {item.distance_display}</span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
});

// Featured 大卡片
const FeaturedCard = memo(({ item }: { item: Item }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={`/items/${item.id}`}
      className="group block col-span-2 row-span-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-luxury relative h-full min-h-[500px] overflow-hidden">
        {/* 图片 */}
        <div className="absolute inset-0">
          {item.images?.[0] ? (
            <img
              src={item.images[0]}
              alt={item.title}
              className={`w-full h-full object-cover transition-all duration-700 ${isHovered ? 'scale-105' : 'scale-100'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <span className="text-[120px] font-light text-gray-200 dark:text-gray-700">{String(item.id).padStart(3, '0')}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        {/* 左上角标签 */}
        <div className="absolute top-6 left-6">
          <span className="tag-accent">
            Featured
          </span>
        </div>

        {/* 右下角编号 */}
        <div className="absolute top-6 right-6">
          <span className="text-white/60 text-sm font-mono">
            #{String(item.id).padStart(3, '0')}
          </span>
        </div>

        {/* 底部信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <span className="text-sm text-white/70 uppercase tracking-wider">
                {item.category || 'Item'}
              </span>
              <h2 className="text-3xl font-semibold">{item.title}</h2>
              <div className="flex items-center gap-2 text-white/70">
                <MapPin className="w-4 h-4" />
                {item.location_fuzzy || item.location_name || 'VT Campus'}
              </div>
            </div>

            <div className="text-right">
              <span className="text-5xl font-semibold">${item.price.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
});

// 空状态
const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center py-32 text-center">
    <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-8">
      <span className="text-4xl text-gray-300">∅</span>
    </div>
    <h3 className="text-xl font-medium mb-2">No items found</h3>
    <p className="text-gray-500">Try adjusting your search criteria</p>
  </div>
));

// 骨架屏
const SkeletonGrid = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="space-y-4">
        <div className="aspect-[4/3] skeleton rounded-lg" />
        <div className="h-4 skeleton w-1/3 rounded" />
        <div className="h-6 skeleton w-2/3 rounded" />
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
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-gray-500 mb-4">Failed to load: {(error as Error).message}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary btn-md">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* 标题区域 - 高级公寓感 */}
      <div className="mb-16 text-center">
        <div className="section-label justify-center mb-6">
          <span className="label">Marketplace</span>
        </div>
        <h1 className="heading-xl text-gray-900 dark:text-white mb-4">
          Discover Items
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Find unique items from your campus community
        </p>
        <div className="accent-line mx-auto mt-8" />
      </div>

      {/* 搜索栏 */}
      <div className="mb-16 max-w-3xl mx-auto">
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
          {/* Featured 区域 */}
          {featuredItems.length > 0 && (
            <div className="mb-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400">
                  Featured
                </h2>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 ml-6" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {featuredItems.map((item) => (
                  <FeaturedCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* 分隔 */}
          <div className="flex items-center gap-4 mb-12">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-sm font-semibold tracking-wider uppercase text-gray-400">
              All Items
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* 普通商品 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {regularItems.map((item, index) => (
              <ItemCard key={item.id} item={item} index={index} />
            ))}
          </div>

          {/* 加载更多 */}
          <div ref={ref} className="flex justify-center items-center py-16">
            {isFetchingNextPage ? (
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            ) : hasNextPage ? (
              <span className="text-sm text-gray-400 tracking-wider">Scroll for more</span>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-16 h-px bg-gray-300" />
                <span className="text-sm text-gray-400 tracking-wider">End</span>
                <div className="w-16 h-px bg-gray-300" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}