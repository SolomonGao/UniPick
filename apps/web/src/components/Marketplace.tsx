// apps/web/src/components/Marketplace.tsx
import React from 'react';
import Providers from './Providers';
import SearchableFeed from './SearchableFeed';

export default function Marketplace() {
  return (
    // 在 React 组件内部包裹，Context 关系绝对安全
    <Providers >
      <div className="p-4">
         {/* 这里的 SearchableFeed 能够百分百读到 Providers 里的 QueryClient */}
         <SearchableFeed />
      </div>
    </Providers>
  );
}