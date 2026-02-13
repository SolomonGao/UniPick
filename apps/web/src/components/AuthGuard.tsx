import React, { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

// 创建认证上下文
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

// 认证 Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        // 先尝试获取 session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (mounted) {
            setError(sessionError.message);
            setIsLoading(false);
          }
          return;
        }
        
        if (session?.user) {
          if (mounted) {
            setUser(session.user);
            setIsLoading(false);
          }
        } else {
          // 没有session，尝试getUser
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('Get user error:', userError);
          }
          
          if (mounted) {
            setUser(user);
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        console.error('Auth check error:', err);
        if (mounted) {
          setError(err?.message || '认证检查失败');
          setIsLoading(false);
        }
      }
    };
    
    checkAuth();

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated: !!user,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// 路由守卫组件
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  fallback,
  redirectTo = '/login'
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated, error } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && redirectTo) {
      const timer = setTimeout(() => {
        window.location.href = redirectTo;
      }, 2000);
      setShowLogin(true);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, redirectTo]);

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-500">正在检查登录状态...\u003c/p\u003e
        </div>
      </div>
    );
  }

  // 出错
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">出错了</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 已登录
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // 未登录 - 显示自定义 fallback 或默认提示
  if (fallback) {
    return <>{fallback}</>;
  }

  // 默认未登录提示
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">需要登录</h2>
          <p className="text-gray-500 mb-6">
            {showLogin 
              ? '正在跳转到登录页面...' 
              : '此页面需要登录后才能访问'
            }
          </p>
          
          <a
            href={redirectTo}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors"
          >
            去登录
          </a>
        </div>
      </div>
    </div>
  );
}

// 反向守卫（已登录用户不能访问，如登录页、注册页）
export function GuestGuard({ 
  children, 
  redirectTo = '/'
}: { 
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isLoading, isAuthenticated, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default AuthGuard;
