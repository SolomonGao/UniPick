import React from 'react';
import { Eye, Heart } from 'lucide-react';
import { useItemStats } from '../hooks/useItemStats';

interface ItemStatsProps {
  itemId: number;
  showFavorite?: boolean;
  size?: 'sm' | 'md';
}

export const ItemStats: React.FC<ItemStatsProps> = ({ 
  itemId, 
  showFavorite = true,
  size = 'sm' 
}) => {
  const { view_count, favorite_count, is_favorited, loading, toggleFavorite } = useItemStats(itemId);
  
  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-2'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]} text-gray-500`}>
      {/* 浏览量 */}
      <div className="flex items-center gap-1">
        <Eye className={iconSizes[size]} />
        <span>{view_count || 0}</span>
      </div>
      
      {/* 收藏数 */}
      {showFavorite && (
        <button
          onClick={toggleFavorite}
          disabled={loading}
          className={`flex items-center gap-1 transition-colors ${
            is_favorited 
              ? 'text-red-500' 
              : 'hover:text-red-400'
          }`}
        >
          <Heart 
            className={`${iconSizes[size]} ${is_favorited ? 'fill-current' : ''}`} 
          />
          <span>{favorite_count || 0}</span>
        </button>
      )}
    </div>
  );
};

export default ItemStats;