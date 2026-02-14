import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import '../styles/design-system.css';

const updateSchema = z.object({
  password: z.string()
    .min(8, "密码至少需要 8 位")
    .regex(/[A-Z]/, "密码至少包含一个大写字母")
    .regex(/[0-9]/, "密码至少包含一个数字"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

type UpdateFormInputs = z.infer<typeof updateSchema>;

export default function UpdatePasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateFormInputs>({
    resolver: zodResolver(updateSchema),
  });

  const onSubmit = async (data: UpdateFormInputs) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setServerError(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch {
      setServerError("更新失败，请稍后重试");
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto text-center animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">密码已更新</h2>
        <p className="text-gray-600 dark:text-gray-300">正在跳转到登录页面...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">设置新密码</h1>
        <p className="text-gray-500 dark:text-gray-400">请输入你的新密码</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">新密码</label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            disabled={isLoading}
            className={`w-full h-12 px-4 bg-white dark:bg-gray-800 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none ${
              errors.password 
                ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                : 'border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
            }`}
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">确认密码</label>
          <input
            {...register('confirmPassword')}
            type="password"
            placeholder="••••••••"
            disabled={isLoading}
            className={`w-full h-12 px-4 bg-white dark:bg-gray-800 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none ${
              errors.confirmPassword 
                ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                : 'border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
            }`}
          />
          {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
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
              <span>更新中...</span>
            </>
          ) : (
            <>
              <span>更新密码</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}