import React, { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Loader2, Package, Edit2, Trash2, Eye, MapPin, DollarSign, Plus } from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from './AuthGuard';

interface Item {
  id: number;
  title: string;
  price: number;
  original_price?: number | null;
  images: string[];
  location_name: string;
  category?: string;
  created_at: string;
  description?: string;
  moderation_status?: 'pending' | 'approved' | 'flagged' | 'rejected';
}

const PAGE_SIZE = 12;

const CATEGORY_LABELS: Record<string, string> = {
  electronics: '电子产品',
  furniture: '家具',
  books: '书籍',
  clothing: '服装',
  sports: '运动',
  others: '其他',
};

export default function MyListingsItem() {
  const { user } = useAuth();
  const { ref, inView } = useInView();

  const currentUserId = user?.id || null;

  const fetchMyItems = async ({ pageParam = 0 }: { pageParam?: number }): Promise<Item[]> => {
    if (!currentUserId) return [];
    
    const skip = pageParam * PAGE_SIZE;
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: PAGE_SIZE.toString(),
      user_id: currentUserId,
    });
    
    // 🔴 关键修复：添加认证头，后端才能识别是当前用户
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(`${API_ENDPOINTS.items}/?${params}`, { headers });
    if (!response.ok) {
      throw new Error('获取商品失败');
    }
    return response.json();
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['my-items', currentUserId],
    queryFn: fetchMyItems,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    enabled: !!currentUserId,
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const handleDelete = async (itemId: number) => {
    if (!confirm('确定要删除这个商品吗？此操作不可恢复。')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('请先登录');
        return;
      }
      
      const response = await fetch(`${API_ENDPOINTS.items}/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('删除失败');
      }
      
      toast.success('商品已删除');
      refetch();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const allItems = data?.pages.flat() || [];

  if (status === 'pending') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的发布</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">管理你发布的二手商品</p>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的发布</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">管理你发布的二手商品</p>
        </div>
        <a
          href="/sell"
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          发布新商品
        </a>
      </div>

      {/* 错误提示 */}
      {status === 'error' && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Loader2 className="w-5 h-5" />
            <span>{(error as Error)?.message || '加载失败'}</span>
          </div>
        </div>
      )}

      {/* 商品列表 */}
      {allItems.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">还没有发布商品</p>
          <p className="text-gray-500 dark:text-gray-400 mb-6">发布你的第一件二手商品吧！</p>
          <a
            href="/sell"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            立即发布
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {allItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all"
            >
              <div className="flex gap-4">
                {/* 图片 */}
                <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300 dark:text-gray-500" />
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {/* 如果有原价且降价了，显示划掉的原价 */}
                          {item.original_price && item.original_price > item.price && (
                            <span className="text-sm text-gray-400 line-through decoration-gray-400">
                              ${item.original_price}
                            </span>
                          )}
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            ${item.price}
                          </span>
                        </div>
                        {item.category && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        )}
                        {/* 审核状态标签 */}
                        {item.moderation_status && item.moderation_status !== 'approved' && (
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                            item.moderation_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : item.moderation_status === 'flagged'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {item.moderation_status === 'pending' && '审核中'}
                            {item.moderation_status === 'flagged' && '待审核'}
                            {item.moderation_status === 'rejected' && '已拒绝'}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location_name || '未设置'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        发布于 {new Date(item.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1">
                      <a
                        href={`/items/${item.id}?from=my-listings`}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="查看"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => window.location.href = `/sell?edit=${item.id}`}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 加载更多 */}
          <div ref={ref} className="flex justify-center items-center py-8">
            {isFetchingNextPage ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : hasNextPage ? (
              <span className="text-gray-400 dark:text-gray-500 text-sm">向下滚动加载更多</span>
            ) : allItems.length > 0 ? (
              <span className="text-gray-400 dark:text-gray-500 text-sm">—— 没有更多了 ——</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
