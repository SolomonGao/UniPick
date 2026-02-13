import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

type ForgotPasswordInputs = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInputs>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInputs) => {
    setServerError(null);

    // 调用 Supabase 发送重置邮件
    // redirectTo: 用户点击邮件里的链接后，跳回哪个页面？
    // 通常跳回一个专门用来“输入新密码”的页面 (例如 /update-password)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: window.location.origin + '/update-password',
    });

    if (error) {
      //为了安全，通常即使邮箱不存在也不报错，但开发阶段可以直接显示错误
      setServerError(error.message);
      return;
    }

    setIsSuccess(true);
  };

  // 状态 2: 发送成功
  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">邮件已发送</h3>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2 text-sm">
            如果该邮箱已注册，你将收到一封包含重置链接的邮件。
            请检查你的收件箱（包括垃圾邮件）。
          </p>
        </div>
        <a 
          href="/login" 
          className="block w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-colors"
        >
          返回登录
        </a>
      </div>
    );
  }

  // 状态 1: 填写表单
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
         <a href="/login" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
         </a>
         <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">重置密码</h2>
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
        输入你的注册邮箱，我们将发送重置链接给你。
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">邮箱地址</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              {...register('email')}
              type="email"
              placeholder="name@vt.edu"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:bg-gray-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {serverError && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : "发送重置链接"}
        </button>
      </form>
    </div>
  );
}