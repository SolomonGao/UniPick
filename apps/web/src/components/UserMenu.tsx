import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Loader2, 
  LogOut, 
  User as UserIcon, 
  ChevronDown, 
  Package, 
  Heart, 
  Eye,
  Settings,
  PlusCircle
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import '../styles/design-system.css';

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // 未登录状态
  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <a 
          href="/login" 
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          登录
        </a>
        <a 
          href="/register" 
          className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-full shadow-lg shadow-orange-200 dark:shadow-orange-900/30 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          注册
        </a>
      </div>
    );
  }

  // 已登录状态
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[80px] lg:max-w-[120px] truncate hidden sm:block">
          {user.email?.split('@')[0]}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-20 py-2 animate-fade-in overflow-hidden">
            {/* 用户信息头部 */}
            <div className="px-4 py-4 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-b border-gray-50 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 菜单项 */}
            <div className="py-2">
              <a 
                href="/sell" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4 text-orange-600" />
                </div>
                <span className="font-medium">发布商品</span>
              </a>
              
              <a 
                href="/profile" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <span>个人中心</span>
              </a>
              
              <a 
                href="/my-listings" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <span>我的发布</span>
              </a>
              
              <a 
                href="/profile?tab=favorites" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <span>我的收藏</span>
              </a>
            </div>
            
            {/* 退出登录 */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}