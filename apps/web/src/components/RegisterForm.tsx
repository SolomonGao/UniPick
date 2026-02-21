import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, Shield } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
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
  };

  const loading = isSubmitting || isLoading;

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto text-center animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          注册成功！
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-2">
          请前往你的邮箱查收验证邮件
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          点击邮件中的链接完成验证后即可登录
        </p>
        
        <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-sm text-green-700 dark:text-green-400">
            📧 邮件可能需要几分钟到达，请检查垃圾邮件文件夹
          </p>
        </div>
        
        <a 
          href="/login" 
          className="mt-6 inline-flex items-center gap-2 text-orange-600 hover:text-orange-500 font-semibold transition-colors"
        >
          前往登录页面
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 标题区域 */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          创建账号
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          加入 UniPick，开启校园二手交易
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 邮箱输入 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            邮箱地址
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              {...register('email')}
              type="email"
              placeholder="yourname@vt.edu"
              disabled={loading}
              className={`w-full h-12 pl-12 pr-4 bg-white dark:bg-gray-800 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 focus:outline-none ${
                errors.email 
                  ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                  : 'border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm animate-fade-in">{errors.email.message}</p>
          )}
        </div>

        {/* 密码输入 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            密码
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              {...register('password')}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              disabled={loading}
              className={`w-full h-12 pl-12 pr-12 bg-white dark:bg-gray-800 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 focus:outline-none ${
                errors.password 
                  ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                  : 'border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {/* 密码强度指示器 */}
          {password.length > 0 && (
            <div className="mt-2 space-y-1.5 animate-fade-in">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.length ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  {passwordChecks.length && <CheckCircle className="w-3 h-3" />}
                </div>
                <span className={passwordChecks.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>至少8个字符</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.uppercase ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  {passwordChecks.uppercase && <CheckCircle className="w-3 h-3" />}
                </div>
                <span className={passwordChecks.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>包含大写字母</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.number ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  {passwordChecks.number && <CheckCircle className="w-3 h-3" />}
                </div>
                <span className={passwordChecks.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>包含数字</span>
              </div>
            </div>
          )}
        </div>

        {/* 确认密码 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            确认密码
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              disabled={loading}
              className={`w-full h-12 pl-12 pr-12 bg-white dark:bg-gray-800 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 focus:outline-none ${
                errors.confirmPassword 
                  ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                  : 'border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm animate-fade-in">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* 错误提示 */}
        {serverError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 animate-fade-in">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-700 dark:text-red-400 text-sm">{serverError}</p>
          </div>
        )}

        {/* 注册按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-200 dark:shadow-orange-900/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>创建中...</span>
            </>
          ) : (
            <>
              <span>创建账号</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* 登录链接 */}
        <div className="text-center pt-4">
          <p className="text-gray-500 dark:text-gray-400">
            已有账号？{' '}
            <a 
              href="/login" 
              className="text-orange-600 hover:text-orange-500 font-semibold transition-colors"
            >
              立即登录
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}