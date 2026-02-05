import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

// 1. 定义校验规则 (Schema)
const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  // 2. 初始化 Hook
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  // 3. 登录逻辑
  const onSubmit = async (data: LoginFormInputs) => {
    setServerError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      // 行业标准体验：不要告诉用户是“账号不对”还是“密码不对”，防止暴力破解
      // 但在开发阶段或者为了 UX，提示“账号或密码错误”是通用的
      setServerError("账号或密码错误，请重试");
      return;
    }

    // 登录成功！
    // 强制刷新页面以更新所有状态 (最稳健的做法)
    window.location.href = "/";
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 邮箱 */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">邮箱</label>
        <input
          {...register('email')}
          type="email"
          placeholder="yourname@...com"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      {/* 密码 */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-gray-700">密码</label>
          <a href="#" className="text-sm text-orange-600 hover:text-orange-500">忘记密码?</a>
        </div>
        <input
          {...register('password')}
          type="password"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
        />
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>

      {/* 错误提示 */}
      {serverError && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          {serverError}
        </div>
      )}

      {/* 登录按钮 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="animate-spin" /> : "登录"}
      </button>
    </form>
  );
}