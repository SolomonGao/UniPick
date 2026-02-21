import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import '../styles/design-system.css';

const forgotSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

type ForgotFormInputs = z.infer<typeof forgotSchema>;

export default function ForgotPasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormInputs>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormInputs) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        setServerError(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
    } catch {
      setServerError("发送失败，请稍后重试");
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto text-center animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">邮件已发送</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-2">请检查你的邮箱</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">点击邮件中的链接重置密码</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">忘记密码？</h1>
        <p className="text-gray-500 dark:text-gray-400">输入邮箱，我们会发送重置链接</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">邮箱地址</label>
          <input
            {...register('email')}
            type="email"
            placeholder="yourname@vt.edu"
            disabled={isLoading}
            className={`w-full h-12 px-4 bg-white dark:bg-gray-800 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none ${
              errors.email 
                ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                : 'border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
            }`}
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        {serverError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>发送中...</span>
            </>
          ) : (
            <>
              <span>发送重置链接</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <div className="text-center pt-4">
          <a href="/login" className="text-orange-600 hover:text-orange-500 font-medium">返回登录</a>
        </div>
      </form>
    </div>
  );
}