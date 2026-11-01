import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, Input } from '@/components/UI';
import { useAuth } from './AuthContext';

export const signupSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => new TextEncoder().encode(val).length <= 72, {
      message: 'Password must not exceed 72 bytes',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Password must contain at least one letter',
    })
    .refine((val) => /[0-9]/.test(val), {
      message: 'Password must contain at least one digit',
    }),
});

export type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupFormValues) => {
    setFormError(null);
    try {
      await signup(values.email, values.password, values.full_name);
      navigate('/board', { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Registration failed.');
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
            Create an account to start tracking job submissions and managing your pipeline.
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
              Create an account
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Set up your workspace to track jobs.
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
                Full name
              </label>
              <Input
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                error={errors.full_name?.message}
                {...register('full_name')}
              />
            </div>

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
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min 8 chars, 1 letter, 1 digit"
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
              Create account
            </Button>
          </form>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-6 text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-teal-700 dark:text-teal-400 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
