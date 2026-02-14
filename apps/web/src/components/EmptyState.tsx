import React from 'react';
import { Package, Search, Heart, Eye } from 'lucide-react';

interface EmptyStateProps {
  type?: 'default' | 'search' | 'favorites' | 'history' | 'items';
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const configs = {
  default: {
    icon: Package,
    title: '暂无数据',
    description: '这里还没有内容'
  },
  search: {
    icon: Search,
    title: '没有找到商品',
    description: '尝试调整筛选条件或搜索其他关键词'
  },
  favorites: {
    icon: Heart,
    title: '还没有收藏',
    description: '看到喜欢的商品就收藏起来吧'
  },
  history: {
    icon: Eye,
    title: '还没有浏览记录',
    description: '浏览的商品会显示在这里'
  },
  items: {
    icon: Package,
    title: '还没有发布商品',
    description: '发布你的第一件商品吧'
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  type = 'default',
  title,
  description,
  action
}) => {
  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title || config.title}
      </h3>
      
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        {description || config.description}
      </p>
      
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};

export default EmptyState;