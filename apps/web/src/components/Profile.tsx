import React, { useEffect, useState } from 'react';
import { User, Package, Heart, Eye, Mail, Calendar, MapPin } from 'lucide-react';
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
  const { user } = useAuth();
  const { favorites, loading: favoritesLoading } = useUserFavorites();
  const { history, loading: historyLoading } = useUserViewHistory();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'favorites' | 'history'>('overview');

  // 获取用户详细信息
  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at || new Date().toISOString(),
      });
      
      // 获取用户发布的商品
      fetchMyItems();
    }
  }, [user]);

  const fetchMyItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${API_ENDPOINTS.items}/?user_id=${user?.id}&limit=5`,
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
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">请先登录</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 头部信息 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-orange-600" />
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile?.full_name || '用户'}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {profile?.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                注册于 {new Date(profile?.created_at || '').toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <Package className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{myItems.length}</div>
            <div className="text-sm text-gray-500">我的发布</div>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{favorites.length}</div>
            <div className="text-sm text-gray-500">我的收藏</div>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <Eye className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{history.length}</div>
            <div className="text-sm text-gray-500">浏览记录</div>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <MapPin className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">VT</div>
            <div className="text-sm text-gray-500">我的位置</div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
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
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">最近发布</h3>
                {myItems.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {myItems.map((item) => (
                      <a
                        key={item.id}
                        href={`/items/${item.id}`}
                        className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-video bg-gray-100">
                          {item.images?.[0] ? (
                            <img 
                              src={item.images[0]} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              无图片
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                          <p className="text-orange-600 font-bold">${item.price}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">还没有发布商品</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div>
              {favoritesLoading ? (
                <p className="text-center py-8">加载中...</p>
              ) : favorites.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {favorites.map((item: Item) => (
                    <a
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-video bg-gray-100">
                        {item.images?.[0] ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            无图片
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                        <p className="text-orange-600 font-bold">${item.price}</p>
                        {item.category && (
                          <span className="text-xs text-gray-500">
                            {CATEGORY_LABELS[item.category]}
                          </span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">还没有收藏任何商品</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {historyLoading ? (
                <p className="text-center py-8">加载中...</p>
              ) : history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((item: Item) => (
                    <a
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0">
                        {item.images?.[0] ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            无图片
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                        <p className="text-orange-600 font-bold mt-1">${item.price}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
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
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">还没有浏览记录</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}