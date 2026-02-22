import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, CheckCircle, XCircle, AlertTriangle, Eye,
  RefreshCw, Search, Filter, ChevronDown, ChevronUp,
  Clock, User, FileText, AlertOctagon, ExternalLink,
  CheckSquare, Square, BarChart3, MapPin
} from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Types
interface ModerationItem {
  id: number;
  content_type: 'item' | 'profile';
  content_id: string;
  user_id: string;
  user_email?: string;
  content_text: string;
  status: 'pending' | 'flagged' | 'approved' | 'rejected';
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
  // 🔧 新增：商品图片和详情（用于人工审核）
  item_images?: string[];
  item_title?: string;
  item_description?: string;
  item_price?: number;
  item_location?: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  flagged: number;
  rejected: number;
}

// Constants
const CATEGORY_LABELS: Record<string, string> = {
  sexual: '性内容',
  sexual_minors: '涉及未成年人',
  harassment: '骚扰',
  harassment_threatening: '威胁性骚扰',
  hate: '仇恨言论',
  hate_threatening: '仇恨威胁',
  illicit: '违法内容',
  illicit_violent: '暴力违法',
  violence: '暴力',
  violence_graphic: '血腥暴力',
  self_harm: '自残',
  self_harm_instructions: '自残指导',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { 
    label: '待审核', 
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  },
  flagged: { 
    label: '可疑', 
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  },
  approved: { 
    label: '已通过', 
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  },
  rejected: { 
    label: '已拒绝', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  item: '商品',
  profile: '用户资料',
};

// Component
export default function AdminModerationPanel() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<'flagged' | 'pending' | 'rejected' | 'approved'>('flagged');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'item' | 'profile'>('all');

  // 检查是否为管理员
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found');
        setIsAdmin(false);
        return;
      }

      console.log('Checking admin status...');
      const response = await fetch(
        `${API_ENDPOINTS.users}/me`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      );

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const profile = await response.json();
        console.log('Profile received:', profile);
        console.log('is_admin:', profile.is_admin);
        console.log('role:', profile.role);
        setIsAdmin(profile.is_admin || false);
        if (profile.is_admin) {
          fetchData();
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to check admin status:', response.status, errorText);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [statusFilter, contentTypeFilter, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('请先登录');
        return;
      }

      // Fetch review queue
      const contentTypeParam = contentTypeFilter !== 'all' ? `&content_type=${contentTypeFilter}` : '';
      const response = await fetch(
        `${API_ENDPOINTS.moderation}/admin/review-queue?status=${statusFilter}${contentTypeParam}&limit=50`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const parsed = data.map((item: any) => ({
          ...item,
          categories: typeof item.categories === 'string' ? JSON.parse(item.categories) : item.categories,
          scores: typeof item.scores === 'string' ? JSON.parse(item.scores) : item.scores,
        }));
        setItems(parsed);
      } else if (response.status === 403) {
        toast.error('无权限访问审核面板');
      } else {
        toast.error('获取数据失败');
      }

      // Fetch stats
      const statsRes = await fetch(
        `${API_ENDPOINTS.moderation}/admin/stats`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      );

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error('获取审核数据失败:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (item: ModerationItem, decision: 'approved' | 'rejected') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let response;
      
      // 🔴 关键：根据内容类型使用不同的审核 API
      if (item.content_type === 'profile') {
        // 用户资料审核使用专用 API（会处理 display_ 字段）
        const endpoint = decision === 'approved' 
          ? `${API_ENDPOINTS.users}/admin/approve/${item.content_id}?log_id=${item.id}`
          : `${API_ENDPOINTS.users}/admin/reject/${item.content_id}?log_id=${item.id}&note=${encodeURIComponent(reviewNote)}`;
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
      } else {
        // 商品审核使用通用 API
        response = await fetch(
          `${API_ENDPOINTS.moderation}/admin/review`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              log_id: item.id,
              decision,
              note: reviewNote
            })
          }
        );
      }

      if (response.ok) {
        toast.success(decision === 'approved' ? '已通过' : '已拒绝');
        setReviewNote('');
        setExpandedItem(null);
        fetchData();
      } else {
        toast.error('审核操作失败');
      }
    } catch (error) {
      console.error('审核失败:', error);
      toast.error('审核失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getCategoryBadge = (category: string, score: number) => {
    const isHigh = score > 0.8;
    return (
      <span 
        key={category}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
          isHigh 
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}
      >
        {CATEGORY_LABELS[category] || category}
        <span className="font-mono">{(score * 100).toFixed(0)}%</span>
      </span>
    );
  };

  const getContentLink = (item: ModerationItem) => {
    if (item.content_type === 'item') {
      return `/items/${item.content_id}`;
    }
    return `/profile/${item.content_id}`;
  };

  // Filter items by search
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.content_text?.toLowerCase().includes(query) ||
      item.user_email?.toLowerCase().includes(query) ||
      item.content_id?.toLowerCase().includes(query)
    );
  });

  // 无权限提示
  if (isAdmin === false) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            无权限访问
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            内容审核功能仅限管理员使用
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            返回首页
          </a>
        </div>
      </div>
    );
  }

  // 加载中
  if (isAdmin === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          <span className="text-gray-500 dark:text-gray-400">检查权限中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-900 dark:bg-white rounded-2xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white dark:text-gray-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">内容审核</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">审核用户发布的内容，确保平台安全</p>
          </div>
        </div>
        
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: '总计', value: stats.total, icon: FileText, color: 'bg-gray-100 dark:bg-gray-700' },
            { label: '待审核', value: stats.pending, icon: Clock, color: 'bg-yellow-100 dark:bg-yellow-900/30' },
            { label: '可疑', value: stats.flagged, icon: AlertTriangle, color: 'bg-orange-100 dark:bg-orange-900/30' },
            { label: '已通过', value: stats.approved, icon: CheckCircle, color: 'bg-green-100 dark:bg-green-900/30' },
            { label: '已拒绝', value: stats.rejected, icon: XCircle, color: 'bg-red-100 dark:bg-red-900/30' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {[
              { id: 'flagged', label: '可疑', icon: AlertTriangle },
              { id: 'pending', label: '待审核', icon: Clock },
              { id: 'rejected', label: '已拒绝', icon: XCircle },
              { id: 'approved', label: '已通过', icon: CheckCircle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Type Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-sm text-gray-400">类型:</span>
            {[
              { id: 'all', label: '全部' },
              { id: 'item', label: '商品' },
              { id: 'profile', label: '用户资料' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setContentTypeFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  contentTypeFilter === tab.id
                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索内容、邮箱或ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">没有待审核的项目</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div 
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Main Info */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {getStatusBadge(item.status)}
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                        {CONTENT_TYPE_LABELS[item.content_type]}
                      </span>
                      {item.flagged && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-xs text-red-700 dark:text-red-400">
                          <AlertOctagon className="w-3 h-3" />
                          自动标记
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-900 dark:text-white font-medium mb-2 line-clamp-2">
                      {item.content_text || '<无内容>'}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {item.user_email || item.user_id}
                      </span>
                      <span>{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                      <span className="text-xs text-gray-400">ID: {item.content_id}</span>
                    </div>
                    
                    {/* Category Tags */}
                    {item.scores && Object.entries(item.scores).filter(([_, s]) => s > 0.1).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(item.scores)
                          .filter(([_, score]) => score > 0.1)
                          .sort(([_, a], [__, b]) => b - a)
                          .slice(0, 5)
                          .map(([category, score]) => getCategoryBadge(category, score as number))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={getContentLink(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="查看原始内容"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {expandedItem === item.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Expanded Details */}
              {expandedItem === item.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-6 bg-gray-50/50 dark:bg-gray-700/30">
                  {/* 🔧 新增：商品图片展示（用于人工审核） */}
                  {item.content_type === 'item' && item.item_images && item.item_images.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        商品图片（人工审核）
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {item.item_images.map((img, idx) => (
                          <a 
                            key={idx}
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-600 hover:ring-2 hover:ring-orange-500 transition-all"
                          >
                            <img 
                              src={img} 
                              alt={`商品图片 ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                      
                      {/* 商品基本信息 */}
                      {(item.item_title || item.item_price) && (
                        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                          {item.item_title && (
                            <p className="font-medium text-gray-900 dark:text-white mb-1">{item.item_title}</p>
                          )}
                          {item.item_price !== undefined && (
                            <p className="text-orange-600 font-bold mb-1">${item.item_price.toFixed(2)}</p>
                          )}
                          {item.item_location && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.item_location}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Full Risk Scores */}
                  {item.scores && Object.entries(item.scores).filter(([_, s]) => s > 0.01).length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        风险评估详情
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(item.scores)
                          .filter(([_, score]) => score > 0.01)
                          .sort(([_, a], [__, b]) => b - a)
                          .map(([category, score]) => getCategoryBadge(category, score as number))}
                      </div>
                    </div>
                  )}
                  
                  {/* Review Actions */}
                  {(item.status === 'pending' || item.status === 'flagged') && (
                    <div className="space-y-3">
                      <textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="添加审核备注（可选）..."
                        className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl dark:text-white resize-none"
                        rows={2}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReview(item, 'approved')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
                        >
                          <CheckCircle className="w-5 h-5" />
                          通过
                        </button>
                        <button
                          onClick={() => handleReview(item, 'rejected')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                          拒绝
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Reviewed Info */}
                  {(item.status === 'approved' || item.status === 'rejected') && item.reviewed_at && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <p>审核于 {new Date(item.reviewed_at).toLocaleString('zh-CN')}</p>
                      {item.review_note && <p className="mt-1">备注: {item.review_note}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
