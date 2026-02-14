import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface GuestRedirectProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function GuestRedirect({ children, redirectTo = '/' }: GuestRedirectProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 检查登录状态
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        // 已登录，重定向
        window.location.href = redirectTo;
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        window.location.href = redirectTo;
      }
    });

    return () => subscription.unsubscribe();
  }, [redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  // 已登录返回 null（正在重定向）
  if (isAuthenticated) {
    return null;
  }

  // 未登录显示内容
  return <>{children}</>;
}
