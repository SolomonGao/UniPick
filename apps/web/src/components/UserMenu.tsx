import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, User, LogOut } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import '../styles/design-system.css';

export default function UserMenu() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
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

  // 未登录
  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <a href="/login" className="text-sm tracking-wider text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
003e
          LOGIN
        </a>
        <a 
          href="/register" 
          className="relative h-10 px-6 bg-black dark:bg-white text-white dark:text-black text-sm tracking-wider font-medium transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200"
        >
          <span className="relative z-10 flex items-center justify-center h-full">REGISTER</span>
          <div className="absolute top-1 left-1 w-1 h-1 border-l border-t border-white/30 dark:border-black/30" />
          <div className="absolute top-1 right-1 w-1 h-1 border-r border-t border-white/30 dark:border-black/30" />
          <div className="absolute bottom-1 left-1 w-1 h-1 border-l border-b border-white/30 dark:border-black/30" />
          <div className="absolute bottom-1 right-1 w-1 h-1 border-r border-b border-white/30 dark:border-black/30" />
        </a>
      </div>
    );
  }

  // 已登录
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 h-12 px-4 border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white transition-colors"
      >
        <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm tracking-wider hidden sm:block">{user.email?.split('@')[0]}</span>
        <div className={`w-px h-4 bg-neutral-300 dark:bg-neutral-700 transition-all ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 z-20 py-2">
            <!-- 用户信息 -->
            <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-800 mb-2">
              <div className="text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1">Signed in as</div>
              <div className="text-sm font-medium truncate">{user.email}</div>
            </div>
            
            <!-- 菜单项 -->
            <a href="/sell" className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-sm tracking-wider">NEW ITEM</span>
            </a>
            
            <a href="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <User className="w-4 h-4" />
              <span className="text-sm tracking-wider">PROFILE</span>
            </a>
            
            <div className="border-t border-neutral-200 dark:border-neutral-800 mt-2 pt-2">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm tracking-wider">SIGN OUT</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}