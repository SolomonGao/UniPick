import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthGuard';

export default function Providers({ children }: { children: React.ReactNode }) {
  // 最佳实践：在组件内部创建 Client，防止 SSR 缓存污染
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 数据 1 分钟内被认为是"新鲜"的，不重新请求
        staleTime: 60 * 1000, 
        // 窗口重新聚焦时自动刷新数据 (企业级体验)
        refetchOnWindowFocus: true,
      },
    },
  }));

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthProvider>
  );
}