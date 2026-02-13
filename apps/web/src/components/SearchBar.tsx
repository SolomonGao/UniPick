import React, { useState } from 'react';
import { Search, X, SlidersHorizontal, Tag, DollarSign, MapPin, Navigation } from 'lucide-react';

export interface SearchFilters {
  keyword: string;
  minPrice: number | null;
  maxPrice: number | null;
  category: string | null;
  useLocation?: boolean;
  radius?: number;
  sortBy?: 'distance' | 'price' | 'created_at';
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
  userLocation?: { lat: number; lng: number } | null;
  onRefreshLocation?: () => void;
  isLocating?: boolean;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

const CATEGORIES = [
  { value: '', label: '全部分类' },
  { value: 'electronics', label: '电子产品' },
  { value: 'furniture', label: '家具' },
  { value: 'books', label: '书籍' },
  { value: 'clothing', label: '服装' },
  { value: 'sports', label: '运动' },
  { value: 'others', label: '其他' },
];

const RADIUS_OPTIONS = [
  { value: 1, label: '1 mile' },
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
  { value: 100, label: '100 miles' },
];

const SORT_OPTIONS = [
  { value: 'distance', label: '距离最近', icon: Navigation },
  { value: 'price', label: '价格最低', icon: DollarSign },
  { value: 'created_at', label: '最新发布', icon: null },
];

export default function SearchBar({ 
  onSearch, 
  initialFilters, 
  userLocation, 
  onRefreshLocation,
  isLocating,
  showFilters: controlledShowFilters,
  onToggleFilters
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialFilters?.keyword || '');
  const [minPrice, setMinPrice] = useState(initialFilters?.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice?.toString() || '');
  const [category, setCategory] = useState(initialFilters?.category || '');
  const [useLocation, setUseLocation] = useState(initialFilters?.useLocation ?? false);
  const [radius, setRadius] = useState(initialFilters?.radius || 10);
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || 'created_at');
  const [internalShowFilters, setInternalShowFilters] = useState(false);
  
  // 支持受控和非受控模式
  const showFilters = controlledShowFilters !== undefined ? controlledShowFilters : internalShowFilters;
  const setShowFilters = onToggleFilters || setInternalShowFilters;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      keyword: keyword.trim(),
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      category: category || null,
      useLocation,
      radius,
      sortBy: sortBy as 'distance' | 'price' | 'created_at',
    });
  };

  const handleClear = () => {
    setKeyword('');
    setMinPrice('');
    setMaxPrice('');
    setCategory('');
    setUseLocation(false);
    setRadius(10);
    setSortBy('created_at');
    onSearch({
      keyword: '',
      minPrice: null,
      maxPrice: null,
      category: null,
      useLocation: false,
      radius: 10,
      sortBy: 'created_at',
    });
  };

  // 检测是否有激活的筛选条件（不包含默认值）
  const hasActiveFilters = keyword || minPrice || maxPrice || category || useLocation;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-4 transition-colors duration-300">
      {/* 搜索栏 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索商品..."
            className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (onToggleFilters) {
              onToggleFilters();
            } else {
              setInternalShowFilters(!showFilters);
            }
          }}
          className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
            showFilters || hasActiveFilters
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400'
              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="hidden sm:inline">筛选</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
          )}
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors"
        >
          搜索
        </button>
      </form>

      {/* 位置状态 */}
      {userLocation && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
          <MapPin className="w-4 h-4" />
          <span>已获取您的位置</span>
          {onRefreshLocation && (
            <button
              onClick={onRefreshLocation}
              disabled={isLocating}
              className="ml-2 text-green-700 dark:text-green-300 hover:underline disabled:opacity-50"
            >
              {isLocating ? '更新中...' : '刷新'}
            </button>
          )}
        </div>
      )}

      {/* 筛选选项 */}
      {showFilters && (
        <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4 min-w-0">
          {/* 分类和价格 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
            {/* 分类 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Tag className="w-4 h-4" />
                分类
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* 最低价格 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <DollarSign className="w-4 h-4" />
                最低价格
              </label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* 最高价格 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <DollarSign className="w-4 h-4" />
                最高价格
              </label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="不限"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* 位置筛选 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useLocation}
                onChange={(e) => setUseLocation(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                按距离筛选（需要位置权限）
              </span>
            </label>
            
            {useLocation && (
              <div className="ml-6 space-y-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">搜索半径</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full sm:w-auto px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  {RADIUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 排序 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">排序方式</label>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSortBy(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === opt.value
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 清除筛选 */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              清除所有筛选
            </button>
          )}
        </div>
      )}
    </div>
  );
}
