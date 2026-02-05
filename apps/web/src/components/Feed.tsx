import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin } from 'lucide-react';

// 定义接口 (因为现在是调 API，不是直接查库，最好简单定义一下)
interface Item {
  id: number;
  title: string;
  price: number;
  images: string[]; // 这是一个数组
  location_name: string;
}

// ✅ 修改 Fetcher：请求 FastAPI 后端
const fetchItems = async (): Promise<Item[]> => {
    // 假设后端还没写 GET /items 接口，我们先暂时直接用 Supabase 查
    // 但为了显示图片，我们需要把 images 字段解析出来
    
    // 🚧 临时方案：直接查 Supabase (等你写好后端 GET 接口再换 fetch)
    // 记得 import { supabase } from '../lib/supabase';
    const { supabase } = await import('../lib/supabase');
    
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Item[];
};

export default function Feed() {
    const { data: items, isLoading, isError, error } = useQuery({
        queryKey: ['items'],
        queryFn: fetchItems,
    });

    if (isLoading) return (
        <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
        </div>
    );
    
    if (isError) return (
        <div className="text-center py-10 text-gray-500">
            暂时无法加载商品: {(error as Error).message}
        </div>
    );

    if (!items || items.length === 0) return (
        <div className="text-center py-20 text-gray-400">
            这里空空如也，快去发布第一个商品吧！
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {items.map((item) => (
                <div key={item.id} className="group border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all bg-white cursor-pointer">
                    {/* 图片区域 */}
                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                        {item.images && item.images.length > 0 ? (
                            <img 
                                src={item.images[0]} // 取第一张图
                                alt={item.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                暂无图片
                            </div>
                        )}
                        
                        {/* 价格标签 */}
                        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-sm font-bold text-gray-900 shadow-sm border border-gray-100">
                            ${item.price}
                        </div>
                    </div>

                    {/* 信息区域 */}
                    <div className="p-3">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[40px]">
                            {item.title}
                        </h3>
                        
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{item.location_name || 'VT Campus'}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}