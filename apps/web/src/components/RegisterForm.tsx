import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

// 1. 定义校验规则 (Schema)
// 行业标准：所有的校验逻辑都收敛在这里，而不是散落在 JSX 里
const registerSchema = z.object({
  email: z.string()
    .email("请输入有效的邮箱地址"),
  password: z.string()
    .min(8, "密码至少需要 8 位")
    .regex(/[A-Z]/, "密码至少包含一个大写字母")
    .regex(/[0-9]/, "密码至少包含一个数字"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

// 自动推导类型 (不要手写 interface!)
type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // 2. 初始化表单 Hook
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  // 3. 提交处理函数
  const onSubmit = async (data: RegisterFormInputs) => {
    setServerError(null);

    // 直接调用 Supabase 客户端注册
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    // 注册成功 (通常需要去邮箱点验证链接)
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="text-center p-8 bg-green-50 rounded-2xl border border-green-100 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">注册成功！</h3>
        <p className="text-green-700">请前往你的 <strong>邮箱</strong> 查收验证邮件，点击链接后即可登录。</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* 邮箱输入 */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">邮箱地址</label>
        <input
          {...register('email')}
          type="email"
          placeholder="yourname@...com"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      {/* 密码输入 */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">密码</label>
        <input
          {...register('password')}
          type="password"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
        />
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>

      {/* 确认密码 */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">确认密码</label>
        <input
          {...register('confirmPassword')}
          type="password"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
        />
        {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
      </div>

      {/* 服务端错误提示 */}
      {serverError && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="animate-spin" /> : "创建账号"}
      </button>
    </form>
  );
}