import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// 1. 定义校验规则：密码必须一致
const updatePasswordSchema = z.object({
  password: z.string().min(6, "密码至少需要 6 个字符"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

type UpdatePasswordInputs = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordInputs>({
    resolver: zodResolver(updatePasswordSchema),
  });

  // 检查链接有效性：如果用户直接访问这个页面，而不是从邮件点进来的，应该拦住他
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCheckingSession(false);
      if (!session) {
        setServerError("无效或过期的重置链接。请重新申请重置密码。");
      }
    });
  }, []);

  const onSubmit = async (data: UpdatePasswordInputs) => {
    setServerError(null);

    // 调用 Supabase 更新当前用户的密码
    const { error } = await supabase.auth.updateUser({
      password: data.password
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setIsSuccess(true);
    toast.success("密码修改成功！");
    
    // 延迟跳转回首页
    setTimeout(() => {
        window.location.href = "/";
    }, 2000);
  };

  if (checkingSession) {
    return (
        <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
        </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">密码修改成功</h3>
          <p className="text-gray-500 mt-2 text-sm">
            你的密码已更新，正在跳转到首页...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">设置新密码</h2>
        <p className="text-sm text-gray-500 mt-2">
          请输入你的新密码，尽量复杂一点哦。
        </p>
      </div>

      {serverError && (
        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">无法重置密码</p>
            <p className="mt-1 opacity-90">{serverError}</p>
            {/* 如果链接失效，提供返回按钮 */}
            {!isSuccess && (
                <a href="/forgot-password" className="text-red-700 underline mt-2 block font-medium">
                    重新发送重置邮件
                </a>
            )}
          </div>
        </div>
      )}

      {/* 只有没报错（或者报错不是因为Session丢失）时才显示表单 */}
      {(!serverError || serverError.includes("Password")) && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">新密码</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                {...register('password')}
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">确认新密码</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                {...register('confirmPassword')}
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
            >
            {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : "更新密码"}
            </button>
        </form>
      )}
    </div>
  );
}