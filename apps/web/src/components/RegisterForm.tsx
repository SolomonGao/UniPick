import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowUpRight, Check } from 'lucide-react';
import '../styles/design-system.css';

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string()
    .min(8, "密码至少需要 8 位")
    .regex(/[A-Z]/, "密码至少包含一个大写字母")
    .regex(/[0-9]/, "密码至少包含一个数字"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');
  
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const onSubmit = async (data: RegisterFormInputs) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setServerError(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
    } catch {
      setServerError("注册失败，请稍后重试");
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-sm mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-8 relative">
          <div className="absolute inset-0 border border-neutral-300 dark:border-neutral-700" />
          <div className="absolute inset-2 border border-black dark:border-white flex items-center justify-center">
            <Check className="w-6 h-6" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">注册成功</h2>
        <p className="text-neutral-500 text-sm mb-8">请查收验证邮件</p>
        
        <a href="/login" className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
003e
          前往登录 →
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* 建筑标题 */}
      <div className="mb-12 relative">
        <div className="absolute -top-4 left-0 right-0 h-px bg-neutral-300 dark:bg-neutral-700" />
        <div className="flex items-baseline justify-between">
          <h1 className="text-4xl font-bold tracking-tight">
            REGISTER
          </h1>
          <span className="text-[10px] font-mono text-neutral-400 tracking-widest">
            AUTH // 02
          </span>
        </div>
        <div className="mt-2 text-sm text-neutral-500 tracking-wide">创建新账号</div>
        
        <div className="absolute -bottom-4 left-0 w-16 h-px bg-black dark:bg-white" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* 邮箱 */}
        <div className="space-y-3">
          <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Email</label>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-300 dark:bg-neutral-700" />
            <input
              {...register('email')}
              type="email"
              placeholder="name@example.com"
              disabled={isLoading}
              className="w-full h-14 pl-6 pr-4 bg-transparent border-0 border-b border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white transition-colors outline-none"
            />
          </div>
          {errors.email && <p className="text-[10px] uppercase text-neutral-500">{errors.email.message}</p>}
        </div>

        {/* 密码 */}
        <div className="space-y-3">
          <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Password</label>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-300 dark:bg-neutral-700" />
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full h-14 pl-6 pr-4 bg-transparent border-0 border-b border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white transition-colors outline-none"
            />
          </div>
          
          {/* 密码强度检查 */}
          {password.length > 0 && (
            <div className="mt-4 space-y-2 border-l border-neutral-300 dark:border-neutral-700 pl-4">
              {[
                { check: passwordChecks.length, label: '至少8个字符' },
                { check: passwordChecks.uppercase, label: '包含大写字母' },
                { check: passwordChecks.number, label: '包含数字' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-3 h-3 border ${item.check ? 'bg-black dark:bg-white border-black dark:border-white' : 'border-neutral-300'}`} />
                  <span className={`text-[10px] tracking-wider ${item.check ? 'text-black dark:text-white' : 'text-neutral-400'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 确认密码 */}
        <div className="space-y-3">
          <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Confirm Password</label>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-300 dark:bg-neutral-700" />
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full h-14 pl-6 pr-4 bg-transparent border-0 border-b border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white transition-colors outline-none"
            />
          </div>
          {errors.confirmPassword && <p className="text-[10px] uppercase text-neutral-500">{errors.confirmPassword.message}</p>}
        </div>

        {serverError && (
          <div className="py-4 border-l-2 border-black dark:border-white pl-4">
            <p className="text-sm text-neutral-600">{serverError}</p>
          </div>
        )}

        {/* 注册按钮 */}
        <button
          type="submit"
          disabled={isLoading}
          className="group w-full h-16 relative bg-black dark:bg-white text-white dark:text-black font-medium tracking-wider uppercase transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
        >
          <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-white/30 dark:border-black/30" />
          <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-white/30 dark:border-black/30" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-white/30 dark:border-black/30" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-white/30 dark:border-black/30" />
          
          <div className="flex items-center justify-center gap-3">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <> <span>Create Account</span> <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> </>
            )}
          </div>
        </button>

        <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <span className="text-sm text-neutral-500">已有账号？</span>
          <a href="/login" className="text-sm font-medium hover:underline underline-offset-4">立即登录 →</a>
        </div>
      </form>
    </div>
  );
}