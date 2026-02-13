import React, { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';

// 定义接口
interface Item {
  id: number;
  title: string;
  price: number;
  images: string[];
  location_name: string;
  latitude: number;
  longitude: number;
}

// 每次请求的数量
const PAGE_SIZE = 12;

// Fetcher 函数：接收 pageParam (当前是第几页，从0开始)
const fetchItems = async ({ pageParam = 0 }): Promise<Item[]> => {
    // 计算 skip (偏移量)
    // 第0页 skip=0, 第1页 skip=12, 第2页 skip=24...
    const skip = pageParam * PAGE_SIZE;

    const response = await fetch(
        `${API_ENDPOINTS.items}/?skip=${skip}&limit=${PAGE_SIZE}`
    );
    
    if (!response.ok) {
        throw new Error('Failed to fetch items');
    }
    
    return response.json();
};

export default function Feed() {
    // 1. 设置监听器 (当 ref 元素进入屏幕时，inView 会变成 true)
    const { ref, inView } = useInView();

    // 2. 使用 useInfiniteQuery
    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ['items'],
        queryFn: fetchItems,
        initialPageParam: 0,
        // 核心逻辑：计算下一页的页码
        getNextPageParam: (lastPage, allPages) => {
            // 如果最新一页的数据少于 PAGE_SIZE，说明没数据了，返回 undefined 停止加载
            if (lastPage.length < PAGE_SIZE) return undefined;
            // 否则，下一页的页码就是当前已有的页数
            return allPages.length;
        },
    });

    // 3. 当滚动到底部 (inView = true) 且还有下一页时，自动加载
    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    // --- Loading 状态 (首次加载) ---
    if (status === 'pending') return (
        <div className="flex justify-center items-center py-32">
            <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
        </div>
    );
    
    // --- Error 状态 ---
    if (status === 'error') return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <AlertCircle className="w-10 h-10 mb-2 text-red-400" />
            <p>加载失败: {(error as Error).message}</p>
        </div>
    );

    // --- Empty 状态 ---
    // data.pages 是一个数组的数组 [[item1, item2], [item3, item4]]
    // 我们需要把它们打平成一个大数组来判断是不是空的
    const isEmpty = data?.pages[0]?.length === 0;
    if (isEmpty) {
        return (
            <div className="text-center py-20 text-gray-400">
                这里空空如也，快去发布第一个商品吧！
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* 商品网格 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* data.pages.map 遍历每一页
                   page.map 遍历该页里的每一个商品
                */}
                {data?.pages.map((page, i) => (
                    <React.Fragment key={i}>
                        {page.map((item) => (
                            <a 
                                key={item.id} 
                                href={`/items/${item.id}`}
                                className="group block border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all bg-white cursor-pointer duration-300"
                            >
                                {/* 图片区域 */}
                                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                    {item.images && item.images.length > 0 ? (
                                        <img 
                                            src={item.images[0]} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 text-xs">
                                            暂无图片
                                        </div>
                                    )}
                                    
                                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-sm font-bold text-gray-900 shadow-sm border border-gray-200">
                                        ${item.price}
                                    </div>
                                </div>

                                {/* 信息区域 */}
                                <div className="p-4">
                                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">
                                        {item.title}
                                    </h3>
                                    
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{item.location_name || 'VT Campus'}</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </React.Fragment>
                ))}
            </div>

            {/* 🤖 底部“哨兵”元素 
                当用户滚动看到这个元素时，useEffect 会触发 fetchNextPage()
            */}
            <div ref={ref} className="flex justify-center items-center py-8 h-20">
                {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Loader2 className="animate-spin w-4 h-4" />
                        正在加载更多...
                    </div>
                ) : hasNextPage ? (
                    <span className="text-gray-300 text-sm">向下滚动加载更多</span>
                ) : (
                    <span className="text-gray-300 text-sm">—— 到底啦，没有更多商品了 ——</span>
                )}
            </div>
        </div>
    );
}