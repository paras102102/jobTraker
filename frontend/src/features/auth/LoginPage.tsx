import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button, Input } from '@/components/UI';
import { useAuth } from './AuthContext';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      const redirect = searchParams.get('redirect') || '/board';
      navigate(redirect, { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Authentication failed.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Left Column (Brand info, desktop only) */}
      <div className="hidden md:flex md:w-5/12 flex-col justify-between p-12 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-6 h-6 rounded-[4px] bg-teal-700 dark:bg-teal-600 flex items-center justify-center text-white font-semibold text-xs tracking-wider">
              JT
            </div>
            <span className="font-semibold text-sm tracking-tight">JobTrackr</span>
          </div>
          <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
            Organize applications and interview rounds.
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            A fast, structured workspace to monitor job submissions, deadlines, and hiring pipeline status.
          </p>
        </div>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
          JobTrackr &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Right Column (Form) */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand header */}
          <div className="md:hidden flex items-center gap-2 mb-6">
            <div className="w-6 h-6 rounded-[4px] bg-teal-700 dark:bg-teal-600 flex items-center justify-center text-white font-semibold text-xs tracking-wider">
              JT
            </div>
            <span className="font-semibold text-sm tracking-tight">JobTrackr</span>
          </div>

          <div className="mb-6">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sign in
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Enter your email and password to access your board.
            </p>
          </div>

          {formError && (
            <div className="mb-4 p-2.5 rounded-[4px] text-xs bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <Button type="submit" size="md" className="w-full" isLoading={isSubmitting}>
              Sign in
            </Button>
          </form>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-6 text-center">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-teal-700 dark:text-teal-400 font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
