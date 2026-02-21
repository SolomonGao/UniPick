import React, { useEffect, useState } from 'react';
import { User, Package, Heart, Eye, Mail, Calendar, MapPin, Loader2, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../components/AuthGuard';
import { useUserFavorites, useUserViewHistory } from '../hooks/useItemStats';
import { supabase } from '../lib/supabase';
import { API_ENDPOINTS } from '../lib/constants';

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  full_name?: string;
  avatar_url?: string;
  location?: string;
}

interface Item {
  id: number;
  title: string;
  price: number;
  images: string[];
  category?: string;
  view_count?: number;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: '电子产品',
  furniture: '家具',
  books: '书籍',
  clothing: '服装',
  sports: '运动',
  others: '其他',
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const { favorites, loading: favoritesLoading } = useUserFavorites();
  const { history, loading: historyLoading } = useUserViewHistory();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'favorites' | 'history'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at || new Date().toISOString(),
      });
      fetchMyItems();
    }
  }, [user]);

  const fetchMyItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${API_ENDPOINTS.items}/?user_id=${user?.id}&limit=6`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setMyItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch my items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">请先登录</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 用户信息卡片 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            {/* 头像 */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shadow-inner">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="avatar" 
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {profile?.full_name || '用户'}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {profile?.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  注册于 {new Date(profile?.created_at || '').toLocaleDateString('zh-CN', { 
                    year: 'numeric', 
                    month: 'short'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button 
              onClick={handleSignOut}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors group"
            >
              <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {/* 我的发布 - 可点击跳转 */}
          <a
            href="/my-listings"
            className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{myItems.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">我的发布</p>
            </div>
          </a>
          
          {/* 我的收藏 - 仅展示 */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{favorites.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">我的收藏</p>
            </div>
          </div>
          
          {/* 浏览记录 - 仅展示 */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <Eye className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{history.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">浏览记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {[
            { id: 'overview', label: '概览', icon: Package },
            { id: 'favorites', label: '我的收藏', icon: Heart },
            { id: 'history', label: '浏览记录', icon: Eye },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* 概览 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">最近发布</h3>
                <a 
                  href="/my-listings" 
                  className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  查看全部 →
                </a>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : myItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {myItems.map((item) => (
                    <a
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="group border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all bg-white dark:bg-gray-800"
                    >
                      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        {item.images?.[0] ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate mb-1">{item.title}</h4>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">${item.price}</p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">还没有发布商品</p>
                  <a 
                    href="/sell" 
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    去发布
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 收藏 */}
          {activeTab === 'favorites' && (
            <div>
              {favoritesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : favorites.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {favorites.map((item: Item) => (
                    <a
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="group border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all bg-white dark:bg-gray-800"
                    >
                      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        {item.images?.[0] ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate mb-1">{item.title}</h4>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">${item.price}</p>
                        {item.category && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {CATEGORY_LABELS[item.category]}
                          </span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">还没有收藏任何商品</p>
                </div>
              )}
            </div>
          )}

          {/* 浏览记录 */}
          {activeTab === 'history' && (
            <div>
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((item: Item) => (
                    <a
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="flex gap-4 p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all bg-white dark:bg-gray-800"
                    >
                      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
                        {item.images?.[0] ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">{item.title}</h4>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">${item.price}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>浏览 {item.view_count || 0} 次</span>
                          {item.category && (
                            <span>{CATEGORY_LABELS[item.category]}</span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <Eye className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">还没有浏览记录</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
