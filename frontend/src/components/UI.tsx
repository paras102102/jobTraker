import React, { forwardRef } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// BUTTON
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors duration-100 select-none rounded-[6px]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400',
          'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]',
          {
            // Primary (Ink Teal)
            'bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500':
              variant === 'primary',
            // Secondary
            'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100':
              variant === 'secondary',
            // Outline
            'border border-zinc-300 dark:border-zinc-700 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200':
              variant === 'outline',
            // Danger
            'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-700 dark:hover:bg-rose-600':
              variant === 'danger',
            // Ghost
            'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300':
              variant === 'ghost',
          },
          {
            'h-7 px-2.5 text-xs gap-1.5': size === 'sm',
            'h-8 px-3 text-[13px] gap-2': size === 'md',
            'h-9 px-4 text-sm gap-2': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading && <Spinner className="w-3.5 h-3.5 mr-1 text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// INPUT
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'flex h-8 w-full rounded-[6px] border bg-white dark:bg-zinc-900 px-2.5 py-1 text-[13px] text-zinc-900 dark:text-zinc-100 transition-colors duration-100',
            'border-zinc-300 dark:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 focus-visible:border-teal-600',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-500 focus-visible:ring-rose-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// SELECT
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            'flex h-8 w-full rounded-[6px] border bg-white dark:bg-zinc-900 px-2.5 py-1 text-[13px] text-zinc-900 dark:text-zinc-100 transition-colors duration-100',
            'border-zinc-300 dark:border-zinc-700',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// TEXTAREA
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            'flex w-full rounded-[6px] border bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-[13px] text-zinc-900 dark:text-zinc-100 transition-colors duration-100',
            'border-zinc-300 dark:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400',
            'disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[70px]',
            error && 'border-rose-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// DIALOG (Radix wrapper)
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-[1px] animate-in fade-in-0 duration-100" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-[6px]',
            'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-xl',
            'focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-100',
            maxWidth
          )}
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 dark:border-zinc-800">
            {title && (
              <RadixDialog.Title className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </RadixDialog.Title>
            )}
            <RadixDialog.Close asChild>
              <button
                type="button"
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded transition-colors ml-auto"
                aria-label="Close dialog"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </RadixDialog.Close>
          </div>
          {description && (
            <RadixDialog.Description className="text-xs text-zinc-500 mb-4">
              {description}
            </RadixDialog.Description>
          )}
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// SPINNER
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin text-zinc-400', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// SKELETON
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-[4px] bg-zinc-200 dark:bg-zinc-800', className)}
    />
  );
}

// EMPTY STATE
export function EmptyState({
  message = 'No applications yet. Add your first one.',
  actionLabel,
  onAction,
}: {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-[6px] my-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{message}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// PAGINATION
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-xs text-zinc-500 py-3 px-2 border-t border-zinc-200 dark:border-zinc-800">
      <span>
        Page <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">{page}</span> of{' '}
        <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">{totalPages}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
          <span>Prev</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={14} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
