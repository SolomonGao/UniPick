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
  isLocating 
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialFilters?.keyword || '');
  const [minPrice, setMinPrice] = useState(initialFilters?.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice?.toString() || '');
  const [category, setCategory] = useState(initialFilters?.category || '');
  const [useLocation, setUseLocation] = useState(initialFilters?.useLocation ?? false);
  const [radius, setRadius] = useState(initialFilters?.radius || 10);
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || 'created_at');
  const [showFilters, setShowFilters] = useState(false);

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

  const hasActiveFilters = keyword || minPrice || maxPrice || category || useLocation || radius !== 10 || sortBy !== 'created_at';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
      {/* 搜索栏 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索商品..."
            className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
            showFilters || hasActiveFilters
              ? 'bg-orange-50 border-orange-200 text-orange-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
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
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <MapPin className="w-4 h-4" />
          <span>已获取您的位置</span>
          {onRefreshLocation && (
            <button
              onClick={onRefreshLocation}
              disabled={isLocating}
              className="ml-auto text-xs underline hover:no-underline disabled:opacity-50"
            >
              {isLocating ? '更新中...' : '刷新'}
            </button>
          )}
        </div>
      )}

      {/* 筛选面板 */}
      {showFilters && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 价格范围 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <DollarSign className="w-4 h-4" />
              价格范围
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="最低"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="最高"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* 分类 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Tag className="w-4 h-4" />
              分类
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* 距离范围 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MapPin className="w-4 h-4" />
              搜索范围: {radius} miles
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useLocation}
                  onChange={(e) => setUseLocation(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-600">使用我的位置</span>
              </label>
              {useLocation && (
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1 mile</span>
                    <span className="font-medium text-orange-600">{radius} miles</span>
                    <span>100 miles</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 排序方式 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Navigation className="w-4 h-4" />
              排序方式
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 清除按钮 */}
      {hasActiveFilters && showFilters && (
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            清除全部筛选
          </button>
        </div>
      )}

      {/* 已选筛选标签 */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-2 pt-2">
          {keyword && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
              关键词: {keyword}
              <button onClick={() => setKeyword('')} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {(minPrice || maxPrice) && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
              价格: ${minPrice || '0'} - ${maxPrice || '∞'}
              <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {category && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
              {CATEGORIES.find(c => c.value === category)?.label}
              <button onClick={() => setCategory('')} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {useLocation && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              <MapPin className="w-3 h-3" />
              Within {radius} miles
            </span>
          )}
          {sortBy && sortBy !== 'created_at' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
              {SORT_OPTIONS.find(s => s.value === sortBy)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { CATEGORIES };
