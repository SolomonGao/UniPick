import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
// 这里的 Item 类型是自动推导的，不需要手写 interface！
import type { Database } from '../lib/database.types';

// 定义获取数据的函数 (Fetcher)
const fetchItems = async () => {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data; // TS 会自动知道这是 Database['public']['Tables']['items']['Row'][]
};

export default function Feed() {
    // 使用 Hook 获取数据
    const { data: items, isLoading, isError, error } = useQuery({
        queryKey: ['items'], // 缓存键
        queryFn: fetchItems,
    });

    if (isLoading) return <div className="p-10 text-center">加载中... (Skeleton Screen)</div>;
    if (isError) return <div className="text-red-500">出错了: {error.message}</div>;

    return (
        <div className="grid grid-cols-2 gap-4 p-4">
            {items?.map((item) => (
                <div key={item.id} className="border rounded-xl overflow-hidden shadow-sm bg-white">
                    {/* 图片占位符 */}
                    <div className="h-32 bg-gray-200 relative">
                        {item.price && (
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                                ${item.price}
                            </span>
                        )}
                    </div>
                    <div className="p-3">
                        <h3 className="text-sm font-medium truncate">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{item.location_name || '未知地点'}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}