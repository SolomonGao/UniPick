import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowUpRight } from 'lucide-react';
import '../styles/design-system.css';

const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setServerError("邮箱或密码错误");
        setIsLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setServerError("登录失败，请稍后重试");
      setIsLoading(false);
    }
  };

  const loading = isSubmitting || isLoading;

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* 建筑标题 */}
      <div className="mb-12 relative">
        {/* 顶部线条 */}
        <div className="absolute -top-4 left-0 right-0 h-px bg-neutral-300 dark:bg-neutral-700" />
        <div className="flex items-baseline justify-between">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
            LOGIN
          </h1>
          <span className="text-[10px] font-mono text-neutral-400 tracking-widest">
            AUTH // 01
          </span>
        </div>
        <div className="mt-2 text-sm text-neutral-500 tracking-wide"
003e
          登录你的账号
        </div>
        
        {/* 底部线条 */}
        <div className="absolute -bottom-4 left-0 w-16 h-px bg-black dark:bg-white" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* 邮箱输入 */}
        <div className="space-y-3">
          <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
            Email Address
          </label>
          
          <div className="relative">
            {/* 左侧竖线 */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-300 dark:bg-neutral-700" />
            <input
              {...register('email')}
              type="email"
              placeholder="name@example.com"
              disabled={loading}
              className="w-full h-14 pl-6 pr-4 bg-transparent border-0 border-b border-neutral-300 dark:border-neutral-700 text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            {/* 右侧竖线（聚焦时显示） */}
            <div className="absolute right-0 top-0 bottom-0 w-px bg-transparent focus-within:bg-neutral-300 dark:focus-within:bg-neutral-700 transition-colors" />
          </div>
          
          {errors.email && (
            <p className="text-[10px] tracking-wider uppercase text-neutral-500">{errors.email.message}</p>
          )}
        </div>

        {/* 密码输入 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              Password
            </label>
            <a 
              href="/forgot-password" 
              className="text-[10px] tracking-wider text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
            >
              忘记密码？
            </a>
          </div>
          
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-300 dark:bg-neutral-700" />
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              disabled={loading}
              className="w-full h-14 pl-6 pr-4 bg-transparent border-0 border-b border-neutral-300 dark:border-neutral-700 text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
          </div>
          
          {errors.password && (
            <p className="text-[10px] tracking-wider uppercase text-neutral-500">{errors.password.message}</p>
          )}
        </div>

        {/* 错误提示 */}
        {serverError && (
          <div className="py-4 border-l-2 border-black dark:border-white pl-4"
003e
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{serverError}</p>
          </div>
        )}

        {/* 登录按钮 - 建筑感 */}
        <button
          type="submit"
          disabled={loading}
          className="group w-full h-16 relative bg-black dark:bg-white text-white dark:text-black font-medium tracking-wider uppercase transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
        >
          {/* 四角装饰 */}
          <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-white/30 dark:border-black/30" />
          <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-white/30 dark:border-black/30" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-white/30 dark:border-black/30" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-white/30 dark:border-black/30" />
          
          <div className="flex items-center justify-center gap-3">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </>
            )}
          </div>
        </button>

        {/* 注册链接 */}
        <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <span className="text-sm text-neutral-500">还没有账号？</span>
          <a 
            href="/register" 
            className="text-sm font-medium text-black dark:text-white hover:underline underline-offset-4"
          >
            创建账号 →
          </a>
        </div>
      </form>
    </div>
  );
}