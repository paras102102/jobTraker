import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, DollarSign, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, getDeadlineStatus } from '@/lib/utils';
import { Application } from '@/types';

interface ApplicationCardProps {
  application: Application;
  onOpenDetail: (app: Application) => void;
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
  isOverlay?: boolean;
}

export function ApplicationCard({
  application,
  onOpenDetail,
  onEdit,
  onDelete,
  isOverlay = false,
}: ApplicationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const deadlineSeverity = getDeadlineStatus(application.deadline, application.status);
  const formattedSalary = formatCurrency(application.salary, application.currency);

  const handleCardClick = (e: React.MouseEvent) => {
    // If click was on menu or actions, don't trigger detail dialog
    if ((e.target as HTMLElement).closest('[data-stop-propagation="true"]')) {
      return;
    }
    onOpenDetail(application);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={`group relative rounded-[6px] border bg-white dark:bg-zinc-900 p-3 text-xs cursor-pointer select-none transition-colors duration-100 ${
        isOverlay
          ? 'border-zinc-300 dark:border-zinc-700 shadow-lg scale-[1.01] opacity-95'
          : isDragging
          ? 'opacity-30 border-dashed border-zinc-300 dark:border-zinc-700'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Top Row: Company & Action menu */}
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 text-[13px] leading-snug">
          {application.company}
        </h4>

        {/* Small "..." context menu */}
        <div className="relative shrink-0" data-stop-propagation="true">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Application options"
          >
            <MoreVertical size={13} strokeWidth={1.5} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div className="absolute right-0 top-6 z-50 w-28 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md py-1 text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit(application);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Pencil size={12} strokeWidth={1.5} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(application);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Role Title */}
      <p className="text-zinc-600 dark:text-zinc-400 mb-2.5 truncate font-normal">
        {application.role_title}
      </p>

      {/* Meta Row: location, salary, deadline */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
        {application.location && (
          <span className="inline-flex items-center gap-1 truncate max-w-[130px]" title={application.location}>
            <MapPin size={11} strokeWidth={1.5} className="shrink-0 text-zinc-400" />
            <span className="truncate">{application.location}</span>
          </span>
        )}

        {formattedSalary && (
          <span className="inline-flex items-center gap-0.5 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
            <DollarSign size={11} strokeWidth={1.5} className="shrink-0 text-zinc-400" />
            <span>{formattedSalary}</span>
          </span>
        )}

        {application.deadline && (
          <span
            className={`inline-flex items-center gap-1 font-mono tabular-nums ml-auto ${
              deadlineSeverity === 'overdue'
                ? 'text-rose-600 dark:text-rose-400 font-medium'
                : deadlineSeverity === 'approaching'
                ? 'text-amber-600 dark:text-amber-400 font-medium'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
            title={`Deadline: ${application.deadline}`}
          >
            <Calendar size={11} strokeWidth={1.5} className="shrink-0" />
            <span>{formatDate(application.deadline)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
