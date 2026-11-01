import React from 'react';
import { ApplicationStatus } from '@/types';
import { STATUS_CONFIG } from './boardUtils';
import { cn } from '@/lib/utils';

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.wishlist;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-medium border bg-zinc-50 dark:bg-zinc-900',
        config.borderClass,
        'text-zinc-700 dark:text-zinc-300',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotClass)} />
      <span>{config.label}</span>
    </span>
  );
}
