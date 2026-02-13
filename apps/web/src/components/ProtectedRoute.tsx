import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 向后端验证 token 有效性（而不仅是本地检查）
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        console.error('Auth validation failed:', error);
      }
      setUser(user);
      setIsLoading(false);
    });

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user && redirectTo) {
      window.location.href = redirectTo;
    }
  }, [isLoading, user, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 dark:text-orange-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-orange-600 dark:text-orange-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">需要登录</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">正在跳转...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
