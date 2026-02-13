import React, { useState } from 'react';
import { Search, X, SlidersHorizontal, Tag, DollarSign } from 'lucide-react';

export interface SearchFilters {
  keyword: string;
  minPrice: number | null;
  maxPrice: number | null;
  category: string | null;
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
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

export default function SearchBar({ onSearch, initialFilters }: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialFilters?.keyword || '');
  const [minPrice, setMinPrice] = useState(initialFilters?.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice?.toString() || '');
  const [category, setCategory] = useState(initialFilters?.category || '');
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      keyword: keyword.trim(),
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      category: category || null,
    });
  };

  const handleClear = () => {
    setKeyword('');
    setMinPrice('');
    setMaxPrice('');
    setCategory('');
    onSearch({
      keyword: '',
      minPrice: null,
      maxPrice: null,
      category: null,
    });
  };

  const hasActiveFilters = keyword || minPrice || maxPrice || category;

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

      {/* 筛选面板 */}
      {showFilters && (
        <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
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

          {/* 清除按钮 */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                清除全部筛选
              </button>
            )}
          </div>
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
        </div>
      )}
    </div>
  );
}

export { CATEGORIES };
