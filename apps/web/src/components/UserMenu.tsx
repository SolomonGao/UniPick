import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, LogOut, User as UserIcon, ChevronDown, Package } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 检查登录状态
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 监听登录状态变化
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
    return <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />;
  }

  // 未登录状态
  if (!user) {
    return (
      <div className="flex gap-3">
        <a href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          Sign In
        </a>
        <a href="/register" className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-full shadow-md shadow-orange-100 dark:shadow-orange-900/30 transition-all active:scale-95">
          Sign Up
        </a>
      </div>
    );
  }

  // 已登录状态
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all bg-white dark:bg-gray-800"
      >
        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-700 dark:text-orange-400">
          <UserIcon className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
          {user.email?.split('@')[0]}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 py-1 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.email}</p>
            </div>
            
            <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              个人中心
            </a>
            
            <a href="/my-listings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <Package className="w-4 h-4" />
              我的发布
            </a>
            
            <div className="border-t border-gray-50 dark:border-gray-700 mt-1">
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
