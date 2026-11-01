import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { ApplicationCard } from './ApplicationCard';
import { STATUS_CONFIG } from './boardUtils';
import { Application, ApplicationStatus } from '@/types';

interface ColumnProps {
  status: ApplicationStatus;
  items: Application[];
  onAddClick: (status: ApplicationStatus) => void;
  onOpenDetail: (app: Application) => void;
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
}

export function Column({
  status,
  items,
  onAddClick,
  onOpenDetail,
  onEdit,
  onDelete,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.wishlist;
  const itemIds = items.map((i) => i.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[300px] shrink-0 rounded-[6px] border bg-zinc-50/70 dark:bg-zinc-900/30 transition-colors duration-100 ${
        isOver
          ? 'border-teal-500/40 bg-teal-50/20 dark:bg-teal-950/20'
          : 'border-zinc-200 dark:border-zinc-800/80'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass}`} />
          <h3 className="font-medium text-xs text-zinc-900 dark:text-zinc-100 tracking-tight">
            {config.label}
          </h3>
          <span className="font-mono tabular-nums text-[11px] text-zinc-400 dark:text-zinc-500 px-1.5 py-0.5 rounded-[4px] bg-zinc-200/50 dark:bg-zinc-800/60">
            {items.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddClick(status)}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
          aria-label={`Add application to ${config.label}`}
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Cards list with independent vertical scroll */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[140px] max-h-[calc(100vh-220px)]">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onOpenDetail={onOpenDetail}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <div className="h-24 flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-[4px] text-[11px] text-zinc-400">
            Drop cards here
          </div>
        )}
      </div>

      {/* Bottom "+ Add" button */}
      <div className="p-2 border-t border-zinc-200/70 dark:border-zinc-800/60">
        <button
          type="button"
          onClick={() => onAddClick(status)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/50 rounded-[4px] transition-colors"
        >
          <Plus size={13} strokeWidth={1.5} />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}
