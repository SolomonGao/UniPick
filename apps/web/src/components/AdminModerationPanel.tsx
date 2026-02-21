import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  FileText,
  AlertOctagon
} from 'lucide-react';
import { API_ENDPOINTS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface ModerationItem {
  id: number;
  content_type: string;
  content_id: string;
  user_id: string;
  user_email: string;
  content_text: string;
  status: 'pending' | 'flagged' | 'approved' | 'rejected';
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  flagged: number;
  rejected: number;
}

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

export default function AdminModerationPanel() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'flagged' | 'pending' | 'rejected'>('flagged');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 获取审核队列
      const response = await fetch(
        `${API_ENDPOINTS.base}/moderation/admin/review-queue?status=${statusFilter}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        // 解析 JSON 字段
        const parsed = data.map((item: any) => ({
          ...item,
          categories: typeof item.categories === 'string' ? JSON.parse(item.categories) : item.categories,
          scores: typeof item.scores === 'string' ? JSON.parse(item.scores) : item.scores,
        }));
        setItems(parsed);
      }

      // 获取统计
      const statsRes = await fetch(
        `${API_ENDPOINTS.base}/moderation/admin/stats`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
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

  const handleReview = async (logId: number, decision: 'approved' | 'rejected') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${API_ENDPOINTS.base}/moderation/admin/review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            log_id: logId,
            decision,
            note: reviewNote
          })
        }
      );

      if (response.ok) {
        toast.success(decision === 'approved' ? '已通过审核' : '已拒绝');
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
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      flagged: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels = {
      pending: '待审核',
      flagged: '可疑',
      approved: '已通过',
      rejected: '已拒绝',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-gray-600" />
            内容审核中心
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            审核用户发布的内容，确保平台安全
          </p>
        </div>
        
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
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

      {/* 筛选器 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          {[
            { id: 'flagged', label: '可疑内容', icon: AlertTriangle },
            { id: 'pending', label: '待审核', icon: Clock },
            { id: 'rejected', label: '已拒绝', icon: XCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 审核列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">暂无需要审核的内容</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div 
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              {/* 主要信息 */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(item.status)}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {item.content_type === 'item' ? '商品' : '用户资料'}
                      </span>
                      <span className="text-sm text-gray-400">
                        ID: {item.content_id}
                      </span>
                    </div>
                    
                    <p className="text-gray-900 dark:text-white font-medium mb-2 line-clamp-2">
                      {item.content_text}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {item.user_email || item.user_id}
                      </span>
                      <span>
                        {new Date(item.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* 违规标签预览 */}
                    {item.flagged && (
                      <AlertOctagon className="w-5 h-5 text-red-500" />
                    )}
                    
                    {/* 展开按钮 */}
                    {expandedItem === item.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {/* 违规类别标签 */}
                {item.scores && Object.entries(item.scores).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(item.scores)
                      .filter(([_, score]) => score > 0.1)
                      .sort(([_, a], [__, b]) => b - a)
                      .slice(0, 5)
                      .map(([category, score]) => getCategoryBadge(category, score as number))}
                  </div>
                )}
              </div>
              
              {/* 展开详情 */}
              {expandedItem === item.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/30">
                  {/* 完整违规分数 */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      违规风险评估
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {item.scores && Object.entries(item.scores)
                        .filter(([_, score]) => score > 0.01)
                        .sort(([_, a], [__, b]) => b - a)
                        .map(([category, score]) => getCategoryBadge(category, score as number))}
                    </div>
                  </div>
                  
                  {/* 审核操作 */}
                  {item.status !== 'approved' && item.status !== 'rejected' && (
                    <div className="space-y-3">
                      <textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="审核备注（可选）..."
                        className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl dark:text-white resize-none"
                        rows={2}
                      />
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReview(item.id, 'approved')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
                        >
                          <CheckCircle className="w-5 h-5" />
                          通过
                        </button>
                        
                        <button
                          onClick={() => handleReview(item.id, 'rejected')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                          拒绝
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* 已审核信息 */}
                  {(item.status === 'approved' || item.status === 'rejected') && item.reviewed_at && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <p>审核于 {new Date(item.reviewed_at).toLocaleString('zh-CN')}</p>
                      {item.review_note && (
                        <p className="mt-1">备注: {item.review_note}</p>
                      )}
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
