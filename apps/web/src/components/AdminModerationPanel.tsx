import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, CheckCircle, XCircle, AlertTriangle, Eye,
  RefreshCw, Search, Filter, ChevronDown, ChevronUp,
  Clock, User, FileText, AlertOctagon, ExternalLink,
  CheckSquare, Square, BarChart3
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
  const [statusFilter, setStatusFilter] = useState<'flagged' | 'pending' | 'rejected' | 'approved'>('flagged');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login');
        return;
      }

      // Fetch review queue
      const response = await fetch(
        `${API_ENDPOINTS.moderation}/admin/review-queue?status=${statusFilter}&limit=50`,
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
        toast.error('No permission to access moderation panel');
      } else {
        toast.error('Failed to fetch data');
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
      console.error('Failed to fetch moderation data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (logId: number, decision: 'approved' | 'rejected') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${API_ENDPOINTS.moderation}/admin/review`,
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
        toast.success(decision === 'approved' ? 'Approved' : 'Rejected');
        setReviewNote('');
        setExpandedItem(null);
        fetchData();
      } else {
        toast.error('Review operation failed');
      }
    } catch (error) {
      console.error('Review failed:', error);
      toast.error('Review failed');
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-900 dark:bg-white rounded-2xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white dark:text-gray-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Moderation</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Review user-generated content to ensure platform safety</p>
          </div>
        </div>
        
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'bg-gray-100 dark:bg-gray-700' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-yellow-100 dark:bg-yellow-900/30' },
            { label: 'Flagged', value: stats.flagged, icon: AlertTriangle, color: 'bg-orange-100 dark:bg-orange-900/30' },
            { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'bg-green-100 dark:bg-green-900/30' },
            { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'bg-red-100 dark:bg-red-900/30' },
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
              { id: 'flagged', label: 'Flagged', icon: AlertTriangle },
              { id: 'pending', label: 'Pending', icon: Clock },
              { id: 'rejected', label: 'Rejected', icon: XCircle },
              { id: 'approved', label: 'Approved', icon: CheckCircle },
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

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search content, email or ID..."
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
          <p className="text-gray-500 dark:text-gray-400">No items to review</p>
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
                          Auto-flagged
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-900 dark:text-white font-medium mb-2 line-clamp-2">
                      {item.content_text || '<No content>'}
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
                      title="View original content"
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
                  {/* Full Risk Scores */}
                  {item.scores && Object.entries(item.scores).filter(([_, s]) => s > 0.01).length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Risk Assessment Details
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
                        placeholder="Add review note (optional)..."
                        className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl dark:text-white resize-none"
                        rows={2}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReview(item.id, 'approved')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(item.id, 'rejected')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Reviewed Info */}
                  {(item.status === 'approved' || item.status === 'rejected') && item.reviewed_at && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <p>Reviewed at {new Date(item.reviewed_at).toLocaleString('zh-CN')}</p>
                      {item.review_note && <p className="mt-1">Note: {item.review_note}</p>}
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
