import React, { useState, useRef } from 'react';
import { 
  User, 
  Camera, 
  Save, 
  Loader2, 
  X,
  Mail,
  Phone,
  MapPin,
  Building,
  Bell,
  Eye,
  Lock,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { API_ENDPOINTS } from '../lib/constants';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  campus?: string;
  university?: string;
  notification_email?: boolean;
  show_phone?: boolean;
  moderation_status?: 'pending' | 'approved' | 'flagged' | 'rejected';
}

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
}

export default function UserSettingsModal({ 
  isOpen, 
  onClose, 
  profile, 
  onProfileUpdate 
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'notifications'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    username: profile.username || '',
    full_name: profile.full_name || '',
    bio: profile.bio || '',
    phone: profile.phone || '',
    campus: profile.campus || '',
    university: profile.university || '',
    notification_email: profile.notification_email ?? true,
    show_phone: profile.show_phone ?? false,
  });

  if (!isOpen) return null;

  // 处理头像上传
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('请上传 JPG、PNG、WebP 或 GIF 格式的图片');
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `avatars/${profile.id}/${fileName}`;

      // 上传到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 获取公开 URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      // 更新用户资料
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast.success('头像上传成功');
      onProfileUpdate({ ...profile, avatar_url: publicUrl });
    } catch (error: any) {
      console.error('上传头像失败:', error);
      toast.error(error.message || '上传头像失败');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 保存资料（调用后端 API，触发审核）
  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const updateData: any = {};
      
      // 只更新有变化的字段
      if (formData.username !== profile.username) updateData.username = formData.username || null;
      if (formData.full_name !== profile.full_name) updateData.full_name = formData.full_name || null;
      if (formData.bio !== profile.bio) updateData.bio = formData.bio || null;
      if (formData.phone !== profile.phone) updateData.phone = formData.phone || null;
      if (formData.campus !== profile.campus) updateData.campus = formData.campus || null;
      if (formData.university !== profile.university) updateData.university = formData.university || null;

      if (Object.keys(updateData).length === 0) {
        toast.info('没有需要保存的更改');
        return;
      }

      // 🔴 关键：调用后端 API，触发审核流程
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`${API_ENDPOINTS.users}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '保存失败');
      }

      const updatedProfile = await response.json();
      
      toast.success('资料保存成功，等待审核');
      onProfileUpdate(updatedProfile);
    } catch (error: any) {
      console.error('保存资料失败:', error);
      toast.error(error.message || '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存隐私设置
  const handleSavePrivacy = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          show_phone: formData.show_phone
        } as any)
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('隐私设置已保存');
      onProfileUpdate({ ...profile, show_phone: formData.show_phone });
    } catch (error: any) {
      console.error('保存隐私设置失败:', error);
      toast.error(error.message || '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存通知设置
  const handleSaveNotifications = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_email: formData.notification_email
        } as any)
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('通知设置已保存');
      onProfileUpdate({ ...profile, notification_email: formData.notification_email });
    } catch (error: any) {
      console.error('保存通知设置失败:', error);
      toast.error(error.message || '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      toast.success('密码重置邮件已发送，请查收');
    } catch (error: any) {
      console.error('发送重置邮件失败:', error);
      toast.error(error.message || '发送失败');
    }
  };

  const tabs = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'privacy', label: '隐私设置', icon: Lock },
    { id: 'notifications', label: '通知设置', icon: Bell },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">账号设置</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex">
          {/* 侧边栏 */}
          <div className="w-48 border-r border-gray-100 dark:border-gray-700 p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 内容区 */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* 个人资料 */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* 头像 */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div 
                      className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden cursor-pointer group"
                      onClick={handleAvatarClick}
                    >
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">头像</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">点击上传新头像</p>
                    <p className="text-xs text-gray-400">支持 JPG、PNG、WebP，最大 5MB</p>
                  </div>
                </div>

                {/* 表单 */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        用户名
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white"
                        placeholder="你的用户名"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        真实姓名
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white"
                        placeholder="你的名字"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        学校
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white"
                      placeholder="例如：Virginia Tech"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        校区/位置
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.campus}
                      onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white"
                      placeholder="例如：Blacksburg Campus"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        联系电话
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white"
                      placeholder="你的电话号码"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      个人简介
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white resize-none"
                      placeholder="简单介绍一下自己..."
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {formData.bio.length}/500
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="w-full h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      保存资料
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 隐私设置 */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">公开联系方式</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.show_phone}
                            onChange={(e) => setFormData({ ...formData, show_phone: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gray-900 dark:peer-checked:bg-white"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        开启后，其他用户可以在商品详情页看到你的联系电话
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSavePrivacy}
                  disabled={isLoading}
                  className="w-full h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      保存隐私设置
                    </>
                  )} 
                </button>

                <hr className="border-gray-200 dark:border-gray-700" />

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">安全</h3>
                  <button
                    onClick={handleChangePassword}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">修改密码</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">发送密码重置邮件</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 通知设置 */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">邮件通知</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.notification_email}
                            onChange={(e) => setFormData({ ...formData, notification_email: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gray-900 dark:peer-checked:bg-white"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        接收关于商品收藏、消息回复等的邮件通知
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveNotifications}
                  disabled={isLoading}
                  className="w-full h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      保存通知设置
                    </>
                  )} 
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
